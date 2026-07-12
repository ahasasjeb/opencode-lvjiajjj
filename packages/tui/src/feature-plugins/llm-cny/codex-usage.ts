import { readOAuthCredential, writeOAuthCredential } from "./oauth.js"

const CLIENT_ID = "app_EMoamEEZ73f0CkXaXp7hrann"
const TOKEN_URL = "https://auth.openai.com/oauth/token"
const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"
const RESET_URL = "https://chatgpt.com/backend-api/wham/rate-limit-reset-credits/consume"

export type WindowLimit = {
  usedPercent: number
  windowSeconds: number
  resetAt: number
}

export type CodexUsage = {
  planType: string
  primary: WindowLimit | null
  secondary: WindowLimit | null
  resetCredits: number | null
}

export type CodexUsageResult =
  | { ok: true; usage: CodexUsage }
  | { ok: false; message: string }

export type CodexResetOutcome = "reset" | "nothing_to_reset" | "no_credit" | "already_redeemed"

export type CodexResetResult =
  | { ok: true; outcome: CodexResetOutcome; windowsReset: number }
  | { ok: false; message: string }

type OAuthCredential = {
  type: "oauth"
  access: string
  refresh: string
  expires: number
  accountId?: string
}

type CodexRequestOperation = "usage" | "reset"
type CodexRequestStage = "initial_auth_failure" | "final_failure"

type AuthFile = Record<string, { type: string; access?: string; refresh?: string; expires?: number; accountId?: string }>
type AccountFile = {
  version?: number
  accounts?: Record<
    string,
    {
      id?: string
      serviceID?: string
      credential?: { type?: string; access?: string; refresh?: string; expires?: number; accountId?: string }
    }
  >
  active?: Record<string, string>
}
type AccountEntry = NonNullable<AccountFile["accounts"]>[string]

function parseWindowLimit(obj: unknown): WindowLimit | null {
  if (!obj || typeof obj !== "object") return null
  const record = obj as Record<string, unknown>
  const usedPercent = typeof record.used_percent === "number" ? record.used_percent : 0
  const windowSeconds = typeof record.limit_window_seconds === "number" ? record.limit_window_seconds : 0
  const resetAt = typeof record.reset_at === "number" ? record.reset_at : 0
  if (usedPercent === 0 && windowSeconds === 0) return null
  return { usedPercent, windowSeconds, resetAt }
}

export async function readCodexOAuth(stateDir: string): Promise<OAuthCredential | null> {
  return readOAuthCredential(stateDir, parseCredential)
}

async function refreshToken(refreshToken: string): Promise<{ access: string; refresh: string; expires: number; accountId?: string } | null> {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    })
    if (!response.ok) return null
    const data = (await response.json()) as Record<string, unknown>
    const access = typeof data.access_token === "string" ? data.access_token : ""
    if (!access) return null
    const newRefresh = typeof data.refresh_token === "string" ? data.refresh_token : refreshToken
    const expiresIn = typeof data.expires_in === "number" ? data.expires_in : 3600
    return { access, refresh: newRefresh, expires: Date.now() + expiresIn * 1000 }
  } catch {
    return null
  }
}

async function saveRefreshedToken(stateDir: string, cred: OAuthCredential): Promise<void> {
  await writeOAuthCredential(stateDir, (raw) => updateStoredCredential(raw, cred))
}

function parseCredential(value: unknown): OAuthCredential | null {
  return parseLegacyCredential(value) ?? parseAccountCredential(value)
}

function parseLegacyCredential(value: unknown): OAuthCredential | null {
  if (!value || typeof value !== "object") return null
  const auth = value as AuthFile
  const entry = auth.chatgpt ?? auth.openai
  if (!entry || entry.type !== "oauth" || !entry.access || !entry.refresh) return null
  return {
    type: "oauth",
    access: entry.access,
    refresh: entry.refresh,
    expires: typeof entry.expires === "number" ? entry.expires : 0,
    accountId: entry.accountId,
  }
}

function parseAccountCredential(value: unknown): OAuthCredential | null {
  if (!value || typeof value !== "object") return null
  const data = value as AccountFile
  const activeID = data.active?.chatgpt ?? data.active?.openai
  if (activeID) {
    const active = parseAccountEntry(data.accounts?.[activeID])
    if (active) return active
  }

  for (const entry of Object.values(data.accounts ?? {})) {
    if (entry?.serviceID !== "chatgpt" && entry?.serviceID !== "openai") continue
    const parsed = parseAccountEntry(entry)
    if (parsed) return parsed
  }

  return null
}

function parseAccountEntry(entry: AccountEntry | undefined): OAuthCredential | null {
  const credential = entry?.credential
  if (!credential || credential.type !== "oauth" || !credential.access || !credential.refresh) return null
  return {
    type: "oauth",
    access: credential.access,
    refresh: credential.refresh,
    expires: typeof credential.expires === "number" ? credential.expires : 0,
    accountId: credential.accountId,
  }
}

function updateStoredCredential(value: unknown, cred: OAuthCredential) {
  if (!value || typeof value !== "object") return null

  const legacy = value as AuthFile
  const entry = legacy.chatgpt ?? legacy.openai
  if (entry?.type === "oauth") {
    entry.access = cred.access
    entry.refresh = cred.refresh
    entry.expires = cred.expires
    if (cred.accountId) entry.accountId = cred.accountId
    return legacy
  }

  const data = value as AccountFile
  const activeID = data.active?.chatgpt ?? data.active?.openai
  if (activeID && data.accounts?.[activeID]?.credential?.type === "oauth") {
    data.accounts[activeID]!.credential!.access = cred.access
    data.accounts[activeID]!.credential!.refresh = cred.refresh
    data.accounts[activeID]!.credential!.expires = cred.expires
    if (cred.accountId) data.accounts[activeID]!.credential!.accountId = cred.accountId
    return data
  }

  for (const entry of Object.values(data.accounts ?? {})) {
    if (entry?.serviceID !== "chatgpt" && entry?.serviceID !== "openai") continue
    if (entry.credential?.type !== "oauth") continue
    entry.credential.access = cred.access
    entry.credential.refresh = cred.refresh
    entry.credential.expires = cred.expires
    if (cred.accountId) entry.credential.accountId = cred.accountId
    return data
  }

  return null
}

async function fetchUsageRaw(accessToken: string, accountId?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent": "opencode-codex-usage/1.0",
  }
  if (accountId) headers["ChatGPT-Account-Id"] = accountId
  return fetch(USAGE_URL, { headers })
}

function consumeResetRaw(accessToken: string, redeemRequestID: string, accountId?: string): Promise<Response> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "User-Agent": "opencode-codex-usage/1.0",
  }
  if (accountId) headers["ChatGPT-Account-Id"] = accountId
  return fetch(RESET_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ redeem_request_id: redeemRequestID }),
  })
}

export function parseCodexUsageResponse(body: string): CodexUsageResult {
  try {
    const data = JSON.parse(body) as Record<string, unknown>
    const planType = typeof data.plan_type === "string" ? data.plan_type : ""
    const rateLimit = data.rate_limit as Record<string, unknown> | undefined
    const primary = parseWindowLimit(rateLimit?.primary_window)
    const secondary = parseWindowLimit(rateLimit?.secondary_window)
    const reset = data.rate_limit_reset_credits as Record<string, unknown> | undefined
    const resetCredits = typeof reset?.available_count === "number" ? reset.available_count : null
    return { ok: true, usage: { planType, primary, secondary, resetCredits } }
  } catch {
    return { ok: false, message: "响应格式解析失败" }
  }
}

export function parseCodexResetResponse(body: string): CodexResetResult {
  try {
    const data = JSON.parse(body) as Record<string, unknown>
    if (
      data.code !== "reset" &&
      data.code !== "nothing_to_reset" &&
      data.code !== "no_credit" &&
      data.code !== "already_redeemed"
    ) {
      return { ok: false, message: "响应格式解析失败" }
    }
    return {
      ok: true,
      outcome: data.code,
      windowsReset: typeof data.windows_reset === "number" ? data.windows_reset : 0,
    }
  } catch {
    return { ok: false, message: "响应格式解析失败" }
  }
}

async function requestCodex(
  stateDir: string,
  operation: CodexRequestOperation,
  request: (accessToken: string, accountId?: string) => Promise<Response>,
) {
  const cred = await readCodexOAuth(stateDir)
  if (!cred) return { ok: false as const, message: "未找到 ChatGPT OAuth 凭证" }

  const refresh = async () => {
    const result = await refreshToken(cred.refresh)
    if (!result) return false
    cred.access = result.access
    cred.refresh = result.refresh
    cred.expires = result.expires
    await saveRefreshedToken(stateDir, cred)
    return true
  }

  if (cred.expires > 0 && cred.expires < Date.now()) await refresh()
  let response = await request(cred.access, cred.accountId)
  let refreshed = false
  if (response.status === 401 || response.status === 403) {
    console.warn("[llm-cny.codex-usage] authentication failed; refreshing OAuth credential", {
      ...codexUsageDiagnostic({ operation, stage: "initial_auth_failure", status: response.status, cred }),
    })
    refreshed = await refresh()
    if (refreshed) response = await request(cred.access, cred.accountId)
  }

  if (!response.ok) {
    console.warn("[llm-cny.codex-usage] request failed", {
      ...codexUsageDiagnostic({ operation, stage: "final_failure", status: response.status, refreshed, cred }),
    })
    return { ok: false as const, message: `HTTP ${response.status}` }
  }
  return { ok: true as const, body: await response.text() }
}

export async function fetchCodexUsage(stateDir: string): Promise<CodexUsageResult> {
  const response = await requestCodex(stateDir, "usage", fetchUsageRaw)
  if (!response.ok) return response
  return parseCodexUsageResponse(response.body)
}

export async function consumeCodexResetCredit(stateDir: string, redeemRequestID: string): Promise<CodexResetResult> {
  const response = await requestCodex(stateDir, "reset", (accessToken, accountId) =>
    consumeResetRaw(accessToken, redeemRequestID, accountId),
  )
  if (!response.ok) return response
  return parseCodexResetResponse(response.body)
}

export function codexUsageDiagnostic(input: {
  operation: CodexRequestOperation
  stage: CodexRequestStage
  status: number
  refreshed?: boolean
  cred: OAuthCredential
}) {
  return {
    operation: input.operation,
    stage: input.stage,
    status: input.status,
    refreshed: input.refreshed ?? false,
    hasAccessToken: Boolean(input.cred.access),
    hasRefreshToken: Boolean(input.cred.refresh),
    hasAccountId: Boolean(input.cred.accountId),
    accessTokenExpired: input.cred.expires > 0 && input.cred.expires < Date.now(),
  }
}
