import { describe, expect, test } from "bun:test"
import en from "./en.json"
import zh from "./zh.json"

const keys = ["command.language.list", "prompt.placeholder.normal", "home.tip.plugins"] as const

describe("i18n parity", () => {
  test("zh locale translates targeted keys", () => {
    for (const key of keys) {
      expect(zh[key]).toBeDefined()
      expect(zh[key]).not.toBe(en[key])
    }
  })
})