import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { RGBA } from "@opentui/core"
import { For, Match, Show, Switch } from "solid-js"
import type { KimiQuotaLimit, KimiUsage, KimiWindowLimit } from "../kimi-usage.js"
import { formatWindowLabel } from "./codex-format.js"
import type { Translator } from "./i18n.js"

type Theme = TuiPluginApi["theme"]["current"]

const BAR_WIDTH = 20

function usedPercent(limit: KimiQuotaLimit) {
  if (limit.limit <= 0) return 0
  return Math.max(0, Math.min(100, (limit.used / limit.limit) * 100))
}

function formatResetTime(unixSeconds: number | null, locale: string) {
  if (unixSeconds === null) return ""
  const date = new Date(unixSeconds * 1000)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  if (isToday) {
    return date.toLocaleTimeString(locale, { hour12: false, hour: "2-digit", minute: "2-digit" })
  }
  return date.toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function ProgressBar(props: { limit: KimiQuotaLimit; theme: Theme; locale: string }) {
  const percent = () => usedPercent(props.limit)
  const remainingPercent = () => Math.round(100 - percent())
  const filled = () => Math.round((remainingPercent() / 100) * BAR_WIDTH)
  const tone = (): string | RGBA => {
    if (remainingPercent() <= 10) return props.theme.error
    if (remainingPercent() <= 30) return props.theme.warning
    return props.theme.success
  }

  return (
    <box flexDirection="row" justifyContent="space-between" gap={1}>
      <text fg={tone()}>
        {"█".repeat(filled())}
        {"░".repeat(BAR_WIDTH - filled())}
      </text>
      <text fg={tone()}>
        <b>
          {props.limit.remaining.toLocaleString(props.locale)} / {props.limit.limit.toLocaleString(props.locale)}
        </b>
      </text>
    </box>
  )
}

function QuotaRow(props: { label: string; limit: KimiQuotaLimit; theme: Theme; locale: string }) {
  return (
    <box gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>{props.label}</text>
        <Show when={props.limit.resetAt !== null}>
          <text fg={props.theme.textMuted}>{formatResetTime(props.limit.resetAt, props.locale)}</text>
        </Show>
      </box>
      <ProgressBar limit={props.limit} theme={props.theme} locale={props.locale} />
    </box>
  )
}

function windowLabel(limit: KimiWindowLimit, t: Translator) {
  return formatWindowLabel(
    {
      usedPercent: usedPercent(limit),
      windowSeconds: limit.windowSeconds,
      resetAt: limit.resetAt ?? 0,
    },
    t,
  )
}

function membershipLabel(value: string) {
  if (!value) return ""
  return value
    .replace(/^LEVEL_/, "")
    .toLowerCase()
    .replace(/(^|_)(\w)/g, (_, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`)
}

export function KimiUsagePanel(props: {
  theme: Theme
  t: Translator
  locale: string
  state:
    | { status: "idle" | "loading" }
    | { status: "ready"; usage: KimiUsage }
    | { status: "error"; message: string }
    | { status: "no-auth" }
}) {
  const usage = () => (props.state.status === "ready" ? props.state.usage : undefined)
  const totalQuota = () => usage()?.totalQuota

  return (
    <box gap={1}>
      <text fg={props.theme.textMuted}>
        {props.t("plugin.llmCny.kimi.title")}
        <Show when={membershipLabel(usage()?.membershipLevel ?? "")}>
          {(label) => <span> ({label()})</span>}
        </Show>
      </text>
      <Switch>
        <Match when={props.state.status === "no-auth"}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.kimi.noAuth")}</text>
        </Match>
        <Match when={props.state.status === "idle" || props.state.status === "loading"}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.codex.loading")}</text>
        </Match>
        <Match when={props.state.status === "error"}>
          <text fg={props.theme.error} wrapMode="word">
            {props.state.status === "error" ? props.state.message : props.t("plugin.llmCny.codex.failed")}
          </text>
        </Match>
        <Match when={props.state.status === "ready"}>
          <QuotaRow
            label={props.t("plugin.llmCny.kimi.cycle")}
            limit={usage()!.usage}
            theme={props.theme}
            locale={props.locale}
          />
          <For each={usage()!.limits}>
            {(limit) => (
              <QuotaRow label={windowLabel(limit, props.t)} limit={limit} theme={props.theme} locale={props.locale} />
            )}
          </For>
          <Show when={totalQuota()}>
            {(quota) => (
              <QuotaRow
                label={props.t("plugin.llmCny.kimi.total")}
                limit={{
                  limit: quota().limit,
                  used: Math.max(0, quota().limit - quota().remaining),
                  remaining: quota().remaining,
                  resetAt: null,
                }}
                theme={props.theme}
                locale={props.locale}
              />
            )}
          </Show>
          <Show when={usage()!.parallelLimit !== null}>
            <box flexDirection="row" justifyContent="space-between">
              <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.kimi.parallel")}</text>
              <text fg={props.theme.text}>{usage()!.parallelLimit!.toLocaleString(props.locale)}</text>
            </box>
          </Show>
        </Match>
      </Switch>
    </box>
  )
}
