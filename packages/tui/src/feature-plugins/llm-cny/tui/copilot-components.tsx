/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { RGBA } from "@opentui/core"
import { For, Match, Show, Switch } from "solid-js"
import type { CopilotQuota } from "../copilot-usage.js"
import { formatResetDate, formatSnapshot, quotaOrder } from "./copilot-format.js"
import { resolveDisplayPlan } from "../copilot-usage.js"
import type { Translator } from "./i18n.js"

type Theme = TuiPluginApi["theme"]["current"]

type CopilotState =
  | { status: "idle" | "loading" }
  | { status: "ready"; quota: CopilotQuota }
  | { status: "error"; message: string }
  | { status: "no-auth" }

export function CopilotQuotaPanel(props: {
  theme: Theme
  t: Translator
  locale: string
  state: CopilotState
}) {
  const quotaPlanLabel = (): string => {
    if (props.state.status !== "ready") return ""
    const { displayPlan, displaySku } = resolveDisplayPlan(props.state.quota.plan, props.state.quota.sku)
    if (displaySku && displayPlan && displaySku !== displayPlan) return `${displaySku} / ${displayPlan}`
    return displaySku || displayPlan
  }

  return (
    <box gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>
          {props.t("plugin.llmCny.copilot.title")}
          <Show when={quotaPlanLabel()}>
            <span> ({quotaPlanLabel()})</span>
          </Show>
        </text>
      </box>
      <Switch>
        <Match when={props.state.status === "no-auth"}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.copilot.noAuth")}</text>
        </Match>
        <Match when={props.state.status === "idle" || props.state.status === "loading"}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.copilot.loading")}</text>
        </Match>
        <Match when={props.state.status === "error"}>
          <text fg={props.theme.error} wrapMode="word">
            {props.state.status === "error" ? props.state.message : props.t("plugin.llmCny.copilot.failed")}
          </text>
        </Match>
        <Match when={props.state.status === "ready" && Object.keys(props.state.quota.quotaSnapshots).length === 0}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.copilot.empty")}</text>
        </Match>
        <Match when={props.state.status === "ready"}>
          <QuotaDetail
            theme={props.theme}
            t={props.t}
            locale={props.locale}
            quota={(props.state as { status: "ready"; quota: CopilotQuota }).quota}
          />
        </Match>
      </Switch>
    </box>
  )
}

function QuotaDetail(props: { theme: Theme; t: Translator; locale: string; quota: CopilotQuota }) {
  const keys = () => quotaOrder(Object.keys(props.quota.quotaSnapshots))

  return (
    <box gap={1}>
      <For each={keys()}>
        {(key) => {
          const snapshot = () => props.quota.quotaSnapshots[key]
          return <QuotaRow theme={props.theme} t={props.t} label={key} snapshot={snapshot()} />
        }}
      </For>
      <Show when={props.quota.resetDate}>
        <text fg={props.theme.textMuted}>
          {props.t("plugin.llmCny.copilot.reset", { date: formatResetDate(props.quota.resetDate, props.locale) })}
        </text>
      </Show>
    </box>
  )
}

function QuotaRow(props: {
  theme: Theme
  t: Translator
  label: string
  snapshot: { quotaId: string; entitlement: number; remaining: number; unlimited: boolean; overageCount: number; overagePermitted: boolean; percentRemaining: number }
}) {
  const percentRemaining = () => props.snapshot.percentRemaining

  const barColor = (): string | RGBA => {
    const used = 100 - percentRemaining()
    if (used > 90) return props.theme.error
    if (used > 80) return props.theme.warning
    return props.theme.success
  }

  return (
    <box gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>{formatSnapshotLabel(props.t, props.label)}</text>
        <text fg={barColor()}>
          <b>{formatSnapshot(props.snapshot, props.t)}</b>
        </text>
      </box>
      <Show when={!props.snapshot.unlimited && props.snapshot.entitlement > 0}>
        <ProgressBar percent={percentRemaining()} theme={props.theme} />
      </Show>
    </box>
  )
}

const BAR_WIDTH = 20
const FILL_CHAR = "█"
const EMPTY_CHAR = "░"

function ProgressBar(props: { percent: number; theme: Theme }) {
  const remaining = () => Math.max(0, Math.min(100, 100 - props.percent))
  const filled = () => Math.round((remaining() / 100) * BAR_WIDTH)
  const empty = () => BAR_WIDTH - filled()

  const barColor = (): string | RGBA => {
    const used = remaining()
    if (used > 90) return props.theme.error
    if (used > 80) return props.theme.warning
    return props.theme.success
  }

  return (
    <box flexDirection="row" gap={1}>
      <text fg={barColor()}>
        {FILL_CHAR.repeat(filled())}
        {EMPTY_CHAR.repeat(empty())}
      </text>
      <text fg={barColor()}>
        <b>{remaining()}%</b>
      </text>
    </box>
  )
}

function formatSnapshotLabel(t: Translator, key: string): string {
  const labels: Record<string, string> = {
    "chat-requests": "plugin.llmCny.copilot.chat",
    "code-completions": "plugin.llmCny.copilot.completions",
    "premium-chat-requests": "plugin.llmCny.copilot.premiumChat",
    chat: "plugin.llmCny.copilot.chat",
    completions: "plugin.llmCny.copilot.completions",
    premium_interactions: "plugin.llmCny.copilot.premiumChat",
    premium_models: "plugin.llmCny.copilot.premiumModels",
  }
  return labels[key] ? t(labels[key]!) : key
}
