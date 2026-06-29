import { createSignal, onCleanup, Show, type Accessor } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import type { JSX } from "@opentui/solid"
import { RGBA, type ColorInput } from "@opentui/core"
import type { ColorGenerator } from "opentui-spinner"

export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

type FrameClock = {
  value: Accessor<number>
  users: number
  release: () => void
}

const clocks = new Map<number, FrameClock>()

function frameClock(interval: number) {
  const existing = clocks.get(interval)
  if (existing) {
    existing.users++
    return existing
  }

  const [value, setValue] = createSignal(0)
  const timer = setInterval(() => setValue((tick) => tick + 1), interval)
  const clock = {
    value,
    users: 1,
    release() {
      clock.users--
      if (clock.users > 0) return
      clearInterval(timer)
      clocks.delete(interval)
    },
  }
  clocks.set(interval, clock)
  return clock
}

function resolveColor(color: ColorInput) {
  if (color instanceof RGBA) return color
  return RGBA.fromHex(String(color))
}

export function FrameSpinner(props: { frames: string[]; interval: number; color?: ColorInput | ColorGenerator }) {
  const clock = props.frames.length ? frameClock(props.interval) : undefined
  const start = clock?.value() ?? 0
  if (clock) onCleanup(clock.release)

  const frameIndex = () => ((clock?.value() ?? 0) - start) % Math.max(props.frames.length, 1)
  const frame = () => props.frames[frameIndex()] ?? ""

  return (
    <Show
      when={typeof props.color === "function"}
      fallback={
        <text fg={props.color && typeof props.color !== "function" ? resolveColor(props.color) : undefined}>
          {frame()}
        </text>
      }
    >
      <text>
        {[...frame()].map((char, charIndex) => (
          <span
            style={{
              fg: (props.color as ColorGenerator)(frameIndex(), charIndex, props.frames.length, frame().length),
            }}
          >
            {char}
          </span>
        ))}
      </text>
    </Show>
  )
}

export function Spinner(props: { children?: JSX.Element; color?: RGBA }) {
  const { theme } = useTheme()
  const kv = useKV()
  const color = () => props.color ?? theme.textMuted
  return (
    <Show when={kv.get("animations_enabled", true)} fallback={<text fg={color()}>⋯ {props.children}</text>}>
      <box flexDirection="row" gap={1}>
        <FrameSpinner frames={SPINNER_FRAMES} interval={80} color={color()} />
        <Show when={props.children}>
          <text fg={color()}>{props.children}</text>
        </Show>
      </box>
    </Show>
  )
}
