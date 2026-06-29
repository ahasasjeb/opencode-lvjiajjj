import { expect, test } from "bun:test"
import { testRender } from "@opentui/solid"
import { FrameSpinner } from "../src/component/spinner"

test.serial("frame spinners with the same interval share one clock", async () => {
  const original = globalThis.setInterval
  let timers = 0
  globalThis.setInterval = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) => {
    if (timeout === 10_000) timers++
    return original(handler, timeout, ...args)
  }) as typeof setInterval

  const app = await testRender(
    () => (
      <box>
        <FrameSpinner frames={["a", "b"]} interval={10_000} />
        <FrameSpinner frames={["a", "b"]} interval={10_000} />
      </box>
    ),
    { width: 10, height: 2 },
  )

  try {
    await app.renderOnce()
    expect(timers).toBe(1)
  } finally {
    app.renderer.destroy()
    globalThis.setInterval = original
  }
})
