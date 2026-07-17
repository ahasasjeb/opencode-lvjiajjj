/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { Show } from "solid-js"
import type { XaiUsage } from "../xai-usage.js"
import type { Translator } from "./i18n.js"
import { QuotaProgressBar } from "./quota-components.js"

type Theme = TuiPluginApi["theme"]["current"]

export function XaiUsagePanel(props: { theme: Theme; t: Translator; locale: string; usage: XaiUsage }) {
  const plan = () => formatPlan(props.usage.subscriptionTier)
  const reset = () => formatReset(props.usage.resetAt, props.locale)
  const period = () => {
    if (props.usage.periodType.includes("WEEKLY")) return props.t("plugin.llmCny.xai.weekly")
    if (props.usage.periodType.includes("MONTHLY")) return props.t("plugin.llmCny.xai.monthly")
    return props.t("plugin.llmCny.xai.usage")
  }

  return (
    <box gap={1}>
      <text fg={props.theme.textMuted}>
        {props.t("plugin.llmCny.xai.title")}
        <Show when={plan()}>
          <span> ({plan()})</span>
        </Show>
      </text>
      <box gap={0}>
        <box flexDirection="row" justifyContent="space-between">
          <text fg={props.theme.textMuted}>{period()}</text>
          <Show when={reset()}>
            <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.xai.reset", { date: reset() })}</text>
          </Show>
        </box>
        <QuotaProgressBar usedPercent={props.usage.usedPercent} theme={props.theme} />
      </box>
      <Show when={positiveCents(props.usage.prepaidBalanceCents)}>
        {(credits) => (
          <text fg={props.theme.textMuted}>
            {props.t("plugin.llmCny.xai.credits", { amount: formatDollars(credits(), props.locale) })}
          </text>
        )}
      </Show>
      <Show when={positiveCents(props.usage.onDemandCapCents)}>
        {(cap) => (
          <text fg={props.theme.textMuted}>
            {props.t("plugin.llmCny.xai.payg", {
              used: formatDollars(Math.abs(props.usage.onDemandUsedCents ?? 0), props.locale),
              cap: formatDollars(cap(), props.locale),
            })}
          </text>
        )}
      </Show>
    </box>
  )
}

function positiveCents(value: number | null) {
  if (value === null) return undefined
  const cents = Math.abs(value)
  return cents > 0 ? cents : undefined
}

function formatDollars(cents: number, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100)
}

function formatReset(unixSeconds: number | null, locale: string) {
  if (unixSeconds === null) return ""
  return new Date(unixSeconds * 1000).toLocaleString(locale, {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatPlan(value: string) {
  const key = value.toLowerCase().replaceAll(" ", "_")
  const plans: Record<string, string> = {
    free: "Free",
    x_basic: "X Basic",
    supergrok: "SuperGrok",
    supergrok_heavy: "SuperGrok Heavy",
  }
  return plans[key] ?? value
}
