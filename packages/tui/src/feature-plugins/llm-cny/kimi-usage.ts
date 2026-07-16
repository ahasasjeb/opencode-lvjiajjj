import { isRecord } from "./utils.js"

const USAGE_URL = "https://api.kimi.com/coding/v1/usages"

export type KimiQuotaLimit = {
  limit: number
  used: number
  remaining: number
  resetAt: number | null
}

export type KimiWindowLimit = KimiQuotaLimit & {
  windowSeconds: number
}

export type KimiUsage = {
  membershipLevel: string
  usage: KimiQuotaLimit
  limits: KimiWindowLimit[]
  totalQuota: {
    limit: number
    remaining: number
  } | null
  parallelLimit: number | null
}

export type KimiUsageResult =
  | { ok: true; usage: KimiUsage }
  | { ok: false; message: string }

function parseNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value !== "string" || value.trim() === "") return null
  const result = Number(value)
  return Number.isFinite(result) ? result : null
}

function parseResetTime(value: unknown) {
  if (typeof value !== "string") return null
  const result = Date.parse(value)
  return Number.isFinite(result) ? result / 1000 : null
}

function parseQuota(value: unknown): KimiQuotaLimit | null {
  if (!isRecord(value)) return null
  const limit = parseNumber(value.limit)
  const used = parseNumber(value.used)
  if (limit === null || used === null) return null
  const remaining = parseNumber(value.remaining) ?? Math.max(0, limit - used)
  return {
    limit,
    used,
    remaining,
    resetAt: parseResetTime(value.resetTime),
  }
}

function parseWindowSeconds(value: unknown) {
  if (!isRecord(value)) return null
  const duration = parseNumber(value.duration)
  if (duration === null) return null
  const multipliers: Record<string, number> = {
    TIME_UNIT_SECOND: 1,
    TIME_UNIT_MINUTE: 60,
    TIME_UNIT_HOUR: 3_600,
    TIME_UNIT_DAY: 86_400,
  }
  const multiplier = typeof value.timeUnit === "string" ? multipliers[value.timeUnit] : undefined
  return multiplier === undefined ? null : duration * multiplier
}

function parseWindowLimit(value: unknown): KimiWindowLimit | null {
  if (!isRecord(value)) return null
  const quota = parseQuota(value.detail)
  const windowSeconds = parseWindowSeconds(value.window)
  if (!quota || windowSeconds === null) return null
  return { ...quota, windowSeconds }
}

function parseTotalQuota(value: unknown) {
  if (!isRecord(value)) return null
  const limit = parseNumber(value.limit)
  const remaining = parseNumber(value.remaining)
  if (limit === null || remaining === null) return null
  return { limit, remaining }
}

export function parseKimiUsageResponse(body: string): KimiUsageResult {
  try {
    const data = JSON.parse(body) as unknown
    if (!isRecord(data)) return { ok: false, message: "响应格式解析失败" }
    const usage = parseQuota(data.usage)
    if (!usage) return { ok: false, message: "响应格式解析失败" }

    const user = isRecord(data.user) ? data.user : undefined
    const membership = isRecord(user?.membership) ? user.membership : undefined
    const parallel = isRecord(data.parallel) ? parseNumber(data.parallel.limit) : null

    return {
      ok: true,
      usage: {
        membershipLevel: typeof membership?.level === "string" ? membership.level : "",
        usage,
        limits: Array.isArray(data.limits)
          ? data.limits.map(parseWindowLimit).filter((item): item is KimiWindowLimit => item !== null)
          : [],
        totalQuota: parseTotalQuota(data.totalQuota),
        parallelLimit: parallel,
      },
    }
  } catch {
    return { ok: false, message: "响应格式解析失败" }
  }
}

export async function fetchKimiUsage(apiKey: string): Promise<KimiUsageResult> {
  try {
    const response = await fetch(USAGE_URL, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    })

    if (response.status === 401 || response.status === 403) {
      return { ok: false, message: "Kimi Code API Key 无效或无权查询额度" }
    }
    if (!response.ok) return { ok: false, message: `HTTP ${response.status}` }
    return parseKimiUsageResponse(await response.text())
  } catch (cause) {
    if (cause instanceof Error) return { ok: false, message: cause.message }
    return { ok: false, message: String(cause) }
  }
}
