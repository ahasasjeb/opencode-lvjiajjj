import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { createSignal, For, Match, Show, Switch } from "solid-js"
import type { CodexSessionCostSummary } from "../codex-pricing.js"
import type { CodexUsage, WindowLimit } from "../codex-usage.js"
import { formatWindowLabel } from "./codex-format.js"
import { formatCredits, formatMessageRange } from "./format.js"
import type { Translator } from "./i18n.js"
import { QuotaProgressBar } from "./quota-components.js"

type Theme = TuiPluginApi["theme"]["current"]

function formatResetTime(unixSeconds: number, locale: string): string {
  if (unixSeconds <= 0) return ""
  const date = new Date(unixSeconds * 1000)
  const now = new Date()
  const isToday =
    date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate()
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

function formatExpirationTime(unixSeconds: number, locale: string) {
  return new Date(unixSeconds * 1000).toLocaleString(locale, {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function LimitRow(props: { limit: WindowLimit; theme: Theme; t: Translator; locale: string }) {
  return (
    <box gap={0}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>{formatWindowLabel(props.limit, props.t)}</text>
        <text fg={props.theme.textMuted}>{formatResetTime(props.limit.resetAt, props.locale)}</text>
      </box>
      <QuotaProgressBar usedPercent={props.limit.usedPercent} theme={props.theme} />
    </box>
  )
}

export function CodexUsagePanel(props: {
  theme: Theme
  t: Translator
  locale: string
  resetting: boolean
  estimate: CodexSessionCostSummary
  onReset: () => void
  state:
    | { status: "idle" | "loading" }
    | { status: "ready"; usage: CodexUsage }
    | { status: "error"; message: string }
    | { status: "no-auth" }
}) {
  const [resetHovered, setResetHovered] = createSignal(false)
  const resetInteractive = () => !props.resetting
  const planLabel = (): string => {
    if (props.state.status !== "ready") return ""
    const map: Record<string, string> = {
      free: "Free",
      go: "Go",
      plus: "Plus",
      pro: "Pro",
      prolite: "Pro Lite",
      team: "Business",
      business: "Enterprise",
      enterprise: "Enterprise",
      education: "Edu",
    }
    const raw = props.state.usage.planType.toLowerCase()
    return map[raw] ?? props.state.usage.planType
  }
  const resetCredits = () => (props.state.status === "ready" ? props.state.usage.resetCredits : null)
  const credits = () => (props.state.status === "ready" ? props.state.usage.credits : null)

  return (
    <box gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.theme.textMuted}>
          {props.t("plugin.llmCny.codex.title")}
          <Show when={planLabel()}>
            <span> ({planLabel()})</span>
          </Show>
        </text>
      </box>
      <Switch>
        <Match when={props.state.status === "no-auth"}>
          <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.codex.noAuth")}</text>
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
          <Show when={credits()}>
            {(credits) => (
              <box gap={0}>
                <box flexDirection="row" justifyContent="space-between">
                  <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.codex.credits.remaining")}</text>
                  <text fg={props.theme.text}>
                    {credits().unlimited
                      ? props.t("plugin.llmCny.codex.credits.unlimited")
                      : credits().balance === null
                        ? "-"
                        : `${formatCredits(credits().balance!, props.locale)} credits`}
                  </text>
                </box>
                <Show when={credits().approxLocalMessages}>
                  {(messages) => (
                    <text fg={props.theme.textMuted}>
                      {props.t("plugin.llmCny.codex.credits.localMessages", {
                        count: formatMessageRange(messages(), props.locale),
                      })}
                    </text>
                  )}
                </Show>
                <Show when={credits().approxCloudMessages}>
                  {(messages) => (
                    <text fg={props.theme.textMuted}>
                      {props.t("plugin.llmCny.codex.credits.cloudMessages", {
                        count: formatMessageRange(messages(), props.locale),
                      })}
                    </text>
                  )}
                </Show>
              </box>
            )}
          </Show>
          <Show when={props.estimate.turns > 0}>
            <box gap={0}>
              <box flexDirection="row" justifyContent="space-between">
                <text fg={props.theme.textMuted}>
                  {props.t("plugin.llmCny.codex.credits.sessionEstimate", { count: props.estimate.turns })}
                </text>
                <text fg={props.theme.text}>{formatCredits(props.estimate.credits, props.locale)} credits</text>
              </box>
              <For each={props.estimate.models}>
                {(model) => (
                  <text fg={props.theme.textMuted}>
                    {model.modelLabel} · {props.t("plugin.llmCny.times", { count: model.turns })} ·{" "}
                    {formatCredits(model.credits, props.locale)} credits
                    <Show when={model.longContextTurns > 0}> · ≥512K ×2</Show>
                  </text>
                )}
              </For>
            </box>
          </Show>
          <Show
            when={props.state.status === "ready" && (props.state.usage.primary || props.state.usage.secondary)}
            fallback={
              <Show when={!credits() && !resetCredits()}>
                <text fg={props.theme.textMuted}>{props.t("plugin.llmCny.codex.empty")}</text>
              </Show>
            }
          >
            <Show when={props.state.status === "ready" && props.state.usage.primary}>
              {(primary) => <LimitRow limit={primary()} theme={props.theme} t={props.t} locale={props.locale} />}
            </Show>
            <Show when={props.state.status === "ready" && props.state.usage.secondary}>
              {(secondary) => <LimitRow limit={secondary()} theme={props.theme} t={props.t} locale={props.locale} />}
            </Show>
            <Show when={resetCredits()}>
              {(resetCredits) => (
                <box gap={0}>
                  <box flexDirection="row" justifyContent="space-between">
                    <text fg={props.theme.textMuted}>
                      {props.t("plugin.llmCny.codex.resetCredits", { count: resetCredits().availableCount })}
                    </text>
                    <Show when={resetCredits().availableCount > 0}>
                      <text
                        fg={props.resetting ? props.theme.textMuted : props.theme.primary}
                        bg={resetHovered() && resetInteractive() ? props.theme.borderSubtle : undefined}
                        selectable={false}
                        onMouseOver={() => setResetHovered(true)}
                        onMouseOut={() => setResetHovered(false)}
                        onMouseUp={() => {
                          if (resetInteractive()) props.onReset()
                        }}
                      >
                        {" "}
                        {props.t(
                          props.resetting ? "plugin.llmCny.codex.resetting" : "plugin.llmCny.codex.resetAction",
                        )}{" "}
                      </text>
                    </Show>
                  </box>
                  <For each={resetCredits().credits}>
                    {(credit, index) => (
                      <text fg={props.theme.textMuted}>
                        {props.t("plugin.llmCny.codex.resetExpiry", {
                          index: index() + 1,
                          date: formatExpirationTime(credit.expiresAt, props.locale),
                        })}
                      </text>
                    )}
                  </For>
                </box>
              )}
            </Show>
          </Show>
        </Match>
      </Switch>
    </box>
  )
}
