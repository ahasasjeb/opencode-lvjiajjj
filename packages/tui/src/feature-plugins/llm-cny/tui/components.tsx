import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { RGBA } from "@opentui/core"
import { createSignal, For, Match, Show, Switch } from "solid-js"
import type { BalanceTrackedProvider, SessionCostSummary } from "../pricing.js"
import { formatDetails, formatMoney, formatTime, formatTokens } from "./format.js"
import type { Translator } from "./i18n.js"
import { balanceTone, type BalanceState } from "./state.js"

type Theme = TuiPluginApi["theme"]["current"]

export function Header(props: { theme: Theme; t: Translator; canRefresh: boolean; onRefresh: () => void }) {
  const [hovered, setHovered] = createSignal(false)
  const refreshHovered = () => props.canRefresh && hovered()

  return (
    <box flexDirection="row" justifyContent="space-between">
      <text fg={props.theme.text}>
        <span style={{ fg: props.theme.primary }}>◆</span> <b>LLM CNY</b>
      </text>
      <Show when={props.canRefresh}>
        <text
          fg={refreshHovered() ? props.theme.primary : props.theme.textMuted}
          bg={refreshHovered() ? props.theme.borderSubtle : undefined}
          selectable={false}
          onMouseOver={() => setHovered(true)}
          onMouseOut={() => setHovered(false)}
          onMouseDown={props.onRefresh}
        >
          {" "}
          {props.t("plugin.llmCny.refresh")}
          {" "}
        </text>
      </Show>
    </box>
  )
}

export function Summary(props: { theme: Theme; t: Translator; locale: string; summary: SessionCostSummary; title?: string }) {
  const anthropicModels = () => props.summary.models.filter((item) => item.providerID === "anthropic")
  const cacheWrite1hTotal = () => props.summary.cacheWrite1hCostCny
  const hasAnthropicCacheWrite = () => anthropicModels().some((item) => item.cacheWrite1hCostCny > 0)

  return (
    <box gap={1}>
      <MetricRow theme={props.theme} label={props.t("plugin.llmCny.cost")} value={formatMoney(props.summary.costCny)} strong />
      <MetricRow
        theme={props.theme}
        label={props.t("plugin.llmCny.calls")}
        value={props.t("plugin.llmCny.times", { count: props.summary.turns })}
      />
      <text fg={props.theme.textMuted}>
        {props.t("plugin.llmCny.tokens.inputCache", {
          input: formatTokens(props.summary.cacheMissInputTokens, props.locale),
          cache: formatTokens(props.summary.cacheHitInputTokens, props.locale),
        })}
      </text>
      <text fg={props.theme.textMuted}>
        {props.t("plugin.llmCny.tokens.outputReasoning", {
          output: formatTokens(props.summary.outputTokens, props.locale),
          reasoning: formatTokens(props.summary.reasoningTokens, props.locale),
        })}
      </text>
      <Show when={hasAnthropicCacheWrite()}>
        <text fg={props.theme.textMuted}>
          {props.t("plugin.llmCny.cacheWrite1h", { cost: formatMoney(cacheWrite1hTotal()) })}
        </text>
      </Show>
      <For each={props.summary.models}>
        {(item) => (
          <box>
            <MetricRow
              theme={props.theme}
              label={`${item.providerLabel} ${item.modelLabel}`}
              value={`${props.t("plugin.llmCny.times", { count: item.turns })} · ${formatMoney(item.costCny)}`}
            />
            <For each={item.warnings}>
              {(warning) => (
                <text fg={props.theme.warning} wrapMode="word">
                  {translateWarning(props.t, warning)}
                </text>
              )}
            </For>
          </box>
        )}
      </For>
    </box>
  )
}

export function ActivationPrompt(props: { theme: Theme; t: Translator }) {
  return (
    <box gap={1}>
      <text fg={props.theme.textMuted} wrapMode="word">
        {props.t("plugin.llmCny.activation")}
      </text>
    </box>
  )
}

export function EmptyUsage(props: { theme: Theme; t: Translator }) {
  return (
    <box gap={1}>
      <MetricRow theme={props.theme} label={props.t("plugin.llmCny.cost")} value="¥0.0000" strong />
      <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.noUsage")}</text>
    </box>
  )
}

export function ProviderBalance(props: {
  theme: Theme
  t: Translator
  locale: string
  provider: BalanceTrackedProvider
  state: BalanceState
}) {
  const amount = () => (props.state.status === "ready" ? props.state.balance.amount : undefined)
  const tone = () => balanceTone(props.theme, amount())

  return (
    <box gap={1}>
      <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.balance.title", { provider: props.provider.label })}</text>
      <Switch>
        <Match when={props.state.status === "idle" || props.state.status === "loading"}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.balance.loading")}</text>
        </Match>
        <Match when={props.state.status === "missing"}>
          <text fg={props.theme.warning} wrapMode="word">
            {props.t("plugin.llmCny.balance.missingKey", { provider: props.provider.label })}
          </text>
        </Match>
        <Match when={props.state.status === "error"}>
          <text fg={props.theme.error} wrapMode="word">
            {(props.state.status === "error" && props.state.message) || props.t("plugin.llmCny.balance.failed")}
          </text>
        </Match>
        <Match when={props.state.status === "ready"}>
          <box gap={1}>
            <MetricRow
              theme={props.theme}
              label={props.t(
                props.state.status === "ready" && props.state.balance.isAvailable
                  ? "plugin.llmCny.balance.available"
                  : "plugin.llmCny.balance.unavailable",
              )}
              value={`${props.state.status === "ready" ? props.state.balance.currency : "CNY"} ${props.state.status === "ready" ? props.state.balance.totalBalance : "0"
                }`}
              color={tone()}
              strong
            />
            <Show when={props.state.status === "ready" && props.state.balance.details.length > 0}>
              <text fg={props.theme.textMuted}>
                {props.state.status === "ready"
                  ? formatDetails(props.state.balance.details, {
                      赠: props.t("plugin.llmCny.balance.gift"),
                      充: props.t("plugin.llmCny.balance.recharge"),
                      券: props.t("plugin.llmCny.balance.coupon"),
                      现: props.t("plugin.llmCny.balance.cash"),
                    })
                  : ""}
              </text>
            </Show>
            <Show when={amount() !== undefined && amount()! <= 3}>
              <text fg={tone()} wrapMode="word">
                {props.t("plugin.llmCny.balance.low", { provider: props.provider.label })}
              </text>
            </Show>
            <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.balance.delay")}</text>
            <text fg={props.theme.textMuted}>
              {props.state.status === "ready" ? formatTime(props.state.updatedAt, props.locale) : ""}
            </text>
          </box>
        </Match>
      </Switch>
    </box>
  )
}

export function MetricRow(props: {
  theme: Theme
  label: string
  value: string
  strong?: boolean
  color?: RGBA
}) {
  return (
    <box flexDirection="row" justifyContent="space-between" gap={1}>
      <text fg={props.theme.textMuted}>{props.label}</text>
      <text fg={props.color ?? (props.strong ? props.theme.success : props.theme.text)}>
        <Show when={props.strong} fallback={props.value}>
          <b>{props.value}</b>
        </Show>
      </text>
    </box>
  )
}

export function Divider(props: { theme: Theme }) {
  return <text fg={props.theme.borderSubtle}>────────────────────────</text>
}

function translateWarning(t: Translator, warning: string) {
  const keys: Record<string, string> = {
    "qwen3.6-plus 价格高昂警告": "plugin.llmCny.warning.qwenExpensive",
    "minimax-m3 512K 到 1M 价格高昂警告": "plugin.llmCny.warning.minimaxExpensive",
    "多轮对话缓存命中为 0，请注意价格": "plugin.llmCny.warning.noCache",
    "正在获取美元兑人民币汇率，成功后自动换算人民币价格": "plugin.llmCny.warning.ratePending",
    "qwen3.7-max 当前按限时五折计价，官方暂未公布结束时间": "plugin.llmCny.warning.qwenDiscount",
  }
  const key = keys[warning]
  return key ? t(key) : warning
}
