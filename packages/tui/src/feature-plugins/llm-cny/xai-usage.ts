import { InstallationVersion } from "@opencode-ai/core/installation/version"
import { readOAuthCredentialSources, writeOAuthCredential, type OAuthCredentialSource } from "./oauth.js"
import { isRecord } from "./utils.js"

const CLIENT_ID = "b1a00492-073a-47ea-816f-4c329264a828"
const TOKEN_URL = "https://auth.x.ai/oauth2/token"
const PROXY_URL = "https://cli-chat-proxy.grok.com/v1"
const RETRY_DELAY_MS = 300

export type XaiUsage = {
  subscriptionTier: string
  usedPercent: number
  periodType: string
  resetAt: number | null
  prepaidBalanceCents: number | null
  onDemandCapCents: number | null
  onDemandUsedCents: number | null
}

export type XaiUsageResult = { ok: true; usage: XaiUsage } | { ok: false; message: string }

type OAuthCredential = {
  type: "oauth"
  access: string
  refresh: string
  expires: number
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

type FetchOptions = {
  fetch?: Fetcher
  retryDelayMs?: number
  signal?: AbortSignal
}

type AttemptResult = {
  result: XaiUsageResult
  status?: number
}

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN
  return Number.isFinite(parsed) ? parsed : null
}

function centsValue(value: unknown) {
  if (!isRecord(value)) return null
  return numberValue(value.val)
}

function timestampValue(value: unknown) {
  if (typeof value !== "string") return null
  const parsed = Date.parse(value)
  return Number.isNaN(parsed) ? null : parsed / 1000
}

export function parseXaiUsageResponse(body: string, subscriptionTier = ""): XaiUsageResult {
  try {
    const data: unknown = JSON.parse(body)
    if (!isRecord(data) || !isRecord(data.config)) return { ok: false, message: "响应格式解析失败" }
    const config = data.config
    const monthlyLimit = centsValue(config.monthlyLimit)
    const used = centsValue(config.used)
    const directPercent = numberValue(config.creditUsagePercent)
    const usedPercent = Math.max(
      0,
      Math.min(100, directPercent ?? (monthlyLimit && used !== null ? (used / monthlyLimit) * 100 : 0)),
    )
    const period = isRecord(config.currentPeriod) ? config.currentPeriod : undefined
    const onDemandCapCents = centsValue(config.onDemandCap)
    return {
      ok: true,
      usage: {
        subscriptionTier,
        usedPercent,
        periodType: typeof period?.type === "string" ? period.type : "",
        resetAt: timestampValue(period?.end ?? config.billingPeriodEnd),
        prepaidBalanceCents: centsValue(config.prepaidBalance),
        onDemandCapCents: onDemandCapCents !== null && onDemandCapCents > 0 ? onDemandCapCents : null,
        onDemandUsedCents: centsValue(config.onDemandUsed),
      },
    }
  } catch {
    return { ok: false, message: "响应格式解析失败" }
  }
}

export async function readXaiOAuth(stateDir: string): Promise<OAuthCredential | null> {
  return (await readXaiOAuthSource(stateDir))?.credential ?? null
}

export async function fetchXaiUsage(stateDir: string, options: FetchOptions = {}): Promise<XaiUsageResult> {
  const source = await readXaiOAuthSource(stateDir)
  if (!source) return { ok: false, message: "未找到 xAI OAuth 凭证" }

  const request = options.fetch ?? fetch
  const first = await requestUsage(source.credential, request, options.signal)
  if (first.result.ok || options.signal?.aborted) return first.result

  if (first.status === 401 || first.status === 403) {
    const refreshed = await refreshToken(source.credential.refresh, request, options.signal)
    if (refreshed) {
      source.credential.access = refreshed.access
      source.credential.refresh = refreshed.refresh
      source.credential.expires = refreshed.expires
      if (source.filePath) {
        await writeOAuthCredential(stateDir, (raw) => updateStoredCredential(raw, source.credential), source.filePath)
      }
    }
  }

  await new Promise<void>((resolve) => setTimeout(resolve, options.retryDelayMs ?? RETRY_DELAY_MS))
  if (options.signal?.aborted) return first.result
  return (await requestUsage(source.credential, request, options.signal)).result
}

async function requestUsage(
  credential: OAuthCredential,
  request: Fetcher,
  signal?: AbortSignal,
): Promise<AttemptResult> {
  try {
    const user = await request(`${PROXY_URL}/user?include=subscription`, {
      headers: requestHeaders(credential.access),
      signal: requestSignal(signal),
    })
    if (!user.ok) return { result: { ok: false, message: `HTTP ${user.status}` }, status: user.status }
    const profile: unknown = await user.json()
    if (!isRecord(profile) || typeof profile.userId !== "string" || profile.userId === "") {
      return { result: { ok: false, message: "响应格式解析失败" } }
    }

    const billing = await request(`${PROXY_URL}/billing?format=credits`, {
      headers: { ...requestHeaders(credential.access), "x-userid": profile.userId },
      signal: requestSignal(signal),
    })
    if (!billing.ok) return { result: { ok: false, message: `HTTP ${billing.status}` }, status: billing.status }
    return {
      result: parseXaiUsageResponse(
        await billing.text(),
        typeof profile.subscriptionTier === "string" ? profile.subscriptionTier : "",
      ),
    }
  } catch (cause) {
    return {
      result: {
        ok: false,
        message: cause instanceof Error ? cause.message : String(cause),
      },
    }
  }
}

function requestHeaders(access: string) {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${access}`,
    "User-Agent": `opencode/${InstallationVersion}`,
    "X-XAI-Token-Auth": "xai-grok-cli",
    "x-grok-client-mode": "interactive",
    "x-grok-client-version": InstallationVersion,
  }
}

function requestSignal(signal?: AbortSignal) {
  const timeout = AbortSignal.timeout(15_000)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

async function refreshToken(refresh: string, request: Fetcher, signal?: AbortSignal) {
  try {
    const response = await request(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": `opencode/${InstallationVersion}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refresh,
        client_id: CLIENT_ID,
      }).toString(),
      signal: requestSignal(signal),
    })
    if (!response.ok) return null
    const data: unknown = await response.json()
    if (!isRecord(data) || typeof data.access_token !== "string" || data.access_token === "") return null
    return {
      access: data.access_token,
      refresh: typeof data.refresh_token === "string" && data.refresh_token !== "" ? data.refresh_token : refresh,
      expires: Date.now() + (numberValue(data.expires_in) ?? 3600) * 1000,
    }
  } catch {
    return null
  }
}

function parseCredential(value: unknown): OAuthCredential | null {
  return parseLegacyCredential(value) ?? parseAccountCredential(value)
}

function parseLegacyCredential(value: unknown): OAuthCredential | null {
  if (!isRecord(value)) return null
  return parseOAuthCredential(value.xai)
}

function parseAccountCredential(value: unknown): OAuthCredential | null {
  if (!isRecord(value)) return null
  const accounts = isRecord(value.accounts) ? value.accounts : undefined
  const activeID = isRecord(value.active) && typeof value.active.xai === "string" ? value.active.xai : undefined
  if (activeID) {
    const active = parseAccountEntry(accounts?.[activeID])
    if (active) return active
  }
  for (const entry of Object.values(accounts ?? {})) {
    if (!isRecord(entry) || entry.serviceID !== "xai") continue
    const credential = parseAccountEntry(entry)
    if (credential) return credential
  }
  return null
}

function parseAccountEntry(entry: unknown): OAuthCredential | null {
  if (!isRecord(entry)) return null
  return parseOAuthCredential(entry.credential)
}

function parseOAuthCredential(value: unknown): OAuthCredential | null {
  if (
    !isRecord(value) ||
    value.type !== "oauth" ||
    typeof value.access !== "string" ||
    typeof value.refresh !== "string"
  ) {
    return null
  }
  return {
    type: "oauth",
    access: value.access,
    refresh: value.refresh,
    expires: typeof value.expires === "number" ? value.expires : 0,
  }
}

function updateStoredCredential(value: unknown, credential: OAuthCredential) {
  if (!isRecord(value)) return null
  if (updateCredential(value.xai, credential)) return value

  const accounts = isRecord(value.accounts) ? value.accounts : undefined
  const activeID = isRecord(value.active) && typeof value.active.xai === "string" ? value.active.xai : undefined
  if (activeID && updateAccountCredential(accounts?.[activeID], credential)) return value
  for (const entry of Object.values(accounts ?? {})) {
    if (!isRecord(entry) || entry.serviceID !== "xai") continue
    if (updateAccountCredential(entry, credential)) return value
  }
  return null
}

function updateAccountCredential(entry: unknown, credential: OAuthCredential) {
  return isRecord(entry) && updateCredential(entry.credential, credential)
}

function updateCredential(value: unknown, credential: OAuthCredential) {
  if (!isRecord(value) || value.type !== "oauth") return false
  value.access = credential.access
  value.refresh = credential.refresh
  value.expires = credential.expires
  return true
}

async function readXaiOAuthSource(stateDir: string) {
  return selectXaiOAuthSource(await readOAuthCredentialSources(stateDir, parseCredential))
}

export function selectXaiOAuthSource(sources: OAuthCredentialSource<OAuthCredential>[]) {
  return sources.toSorted((left, right) => right.credential.expires - left.credential.expires)[0] ?? null
}
