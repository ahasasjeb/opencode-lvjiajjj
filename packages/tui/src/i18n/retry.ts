import type { SessionStatus } from "@opencode-ai/sdk/v2"
import type { Translator } from "./translate"

type RetryAction = Extract<SessionStatus, { type: "retry" }>["action"]

const KNOWN_MESSAGES: Record<string, string> = {
  "Free usage exceeded, subscribe to Go": "retry.message.free_usage_exceeded",
  "Provider is overloaded": "retry.message.provider_overloaded",
  "Too Many Requests": "retry.message.too_many_requests",
  "Rate Limited": "retry.message.rate_limited",
}

export function translateRetryMessage(t: Translator, message: string) {
  if (message.includes("exceeded your current quota") && message.includes("gemini")) {
    return t("retry.message.gemini_hot")
  }
  const key = KNOWN_MESSAGES[message]
  if (key) return t(key)
  return message
}

export function translateRetryAction(
  t: Translator,
  action: NonNullable<RetryAction>,
): { title: string; message: string; label: string; link?: string; reason: string; provider: string } {
  if (action.reason === "free_tier_limit") {
    return {
      ...action,
      title: t("dialog.usageExceeded.freeTier.title"),
      message: t("dialog.usageExceeded.freeTier.description"),
      label: t("dialog.usageExceeded.freeTier.actionLabel"),
    }
  }
  if (action.reason === "account_rate_limit") {
    return {
      ...action,
      title: t("dialog.usageExceeded.accountRateLimit.title"),
      message: t("dialog.usageExceeded.accountRateLimit.description"),
      label: t("dialog.usageExceeded.accountRateLimit.actionLabel"),
    }
  }
  return action
}

export function formatRetryInfo(t: Translator, attempt: number, seconds: number) {
  const delay = seconds > 0 ? t("retry.in_seconds", { seconds }) : ""
  const retrying = t("retry.retrying")
  const line = [retrying, delay].filter(Boolean).join(" ")
  if (!line) return t("retry.attempt", { attempt })
  return t("retry.attempt_line", { line, attempt })
}

export function formatRetryStatusText(
  t: Translator,
  input: { message: string; attempt: number; seconds: number; truncated: boolean },
) {
  const translated = translateRetryMessage(t, input.message)
  const display = input.message.length > 80 ? translated.slice(0, 80) + "..." : translated
  const truncatedHint = input.truncated ? t("retry.click_expand") : ""
  const info = formatRetryInfo(t, input.attempt, input.seconds)
  return `${display}${truncatedHint} [${info}]`
}

export function formatSubagentRetryLine(t: Translator, attempt: number, message: string) {
  return t("retry.subagent.line", {
    attempt,
    message: translateRetryMessage(t, message),
  })
}