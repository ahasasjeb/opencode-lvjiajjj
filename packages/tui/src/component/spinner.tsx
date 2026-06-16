import { createSignal, onCleanup, onMount, Show } from "solid-js"
import { useTheme } from "../context/theme"
import { useKV } from "../context/kv"
import type { JSX } from "@opentui/solid"
import { RGBA, type ColorInput } from "@opentui/core"
import type { ColorGenerator } from "opentui-spinner"

export const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

function resolveColor(color: ColorInput) {
  if (color instanceof RGBA) return color
  return RGBA.fromHex(String(color))
}

export function FrameSpinner(props: { frames: string[]; interval: number; color?: ColorInput | ColorGenerator }) {
  const [index, setIndex] = createSignal(0)

  onMount(() => {
    if (!props.frames.length) return
    const timer = setInterval(() => {
      setIndex((value) => (value + 1) % props.frames.length)
    }, props.interval)
    onCleanup(() => clearInterval(timer))
  })

  const frameIndex = () => index() % Math.max(props.frames.length, 1)
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