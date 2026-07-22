import { expect, test } from "bun:test"
import { cleanupTerminalState, registerCleanupCallbacks } from "../src/terminal-win32"

test("keeps cleanup callbacks across partial registrations", () => {
  const calls: string[] = []
  registerCleanupCallbacks({ unguard: () => calls.push("unguard") })
  registerCleanupCallbacks({ rendererDestroy: () => calls.push("renderer") })

  expect(cleanupTerminalState()).toBe(true)

  expect(calls).toEqual(["renderer", "unguard"])
})
