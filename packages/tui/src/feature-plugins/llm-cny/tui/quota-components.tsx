/** @jsxImportSource @opentui/solid */
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { RGBA } from "@opentui/core"

type Theme = TuiPluginApi["theme"]["current"]

const BAR_WIDTH = 20
const FILL_CHAR = "█"
const EMPTY_CHAR = "░"

export function QuotaProgressBar(props: { usedPercent: number; theme: Theme; value?: string; spread?: boolean }) {
  const remaining = () => Math.max(0, Math.min(100, 100 - props.usedPercent))
  const filled = () => Math.round((remaining() / 100) * BAR_WIDTH)
  const empty = () => BAR_WIDTH - filled()

  const barColor = (): string | RGBA => {
    if (remaining() <= 10) return props.theme.error
    if (remaining() <= 30) return props.theme.warning
    return props.theme.success
  }

  return (
    <box flexDirection="row" justifyContent={props.spread ? "space-between" : undefined} gap={1}>
      <text fg={barColor()}>
        {FILL_CHAR.repeat(filled())}
        {EMPTY_CHAR.repeat(empty())}
      </text>
      <text fg={barColor()}>
        <b>{props.value ?? `${remaining()}%`}</b>
      </text>
    </box>
  )
}
