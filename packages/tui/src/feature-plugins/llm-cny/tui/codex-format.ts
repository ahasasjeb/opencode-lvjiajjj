import type { WindowLimit } from "../codex-usage.js"
import type { Translator } from "./i18n.js"

export function formatWindowLabel(limit: WindowLimit, t: Translator): string {
  const seconds = limit.windowSeconds
  if (seconds >= 2592000 && seconds % 2592000 === 0) {
    return t("plugin.llmCny.codex.window.month", { count: seconds / 2592000 })
  }
  if (seconds >= 86400 && seconds % 86400 === 0) {
    return t("plugin.llmCny.codex.window.day", { count: seconds / 86400 })
  }
  if (seconds >= 3600 && seconds % 3600 === 0) {
    return t("plugin.llmCny.codex.window.hour", { count: seconds / 3600 })
  }
  if (seconds >= 60) {
    return t("plugin.llmCny.codex.window.minute", { count: Math.round(seconds / 60) })
  }
  return t("plugin.llmCny.codex.window.default")
}
