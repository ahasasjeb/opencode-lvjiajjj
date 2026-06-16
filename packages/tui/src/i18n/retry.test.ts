import * as i18n from "@solid-primitives/i18n"
import { describe, expect, test } from "bun:test"
import en from "./en.json"
import zh from "./zh.json"
import type { Translator } from "./translate"
import {
  formatRetryInfo,
  formatRetryStatusText,
  translateRetryAction,
  translateRetryMessage,
} from "./retry"

const enDict = i18n.flatten(en)
const zhDict = { ...enDict, ...i18n.flatten(zh as Record<string, string>) }
const enT = i18n.translator(() => enDict, i18n.resolveTemplate) as Translator
const zhT = i18n.translator(() => zhDict, i18n.resolveTemplate) as Translator

describe("retry i18n", () => {
  test("translates known server messages in zh", () => {
    expect(translateRetryMessage(zhT, "Provider is overloaded")).toBe(zh["retry.message.provider_overloaded"])
    expect(translateRetryMessage(zhT, "Too Many Requests")).toBe(zh["retry.message.too_many_requests"])
  })

  test("translates free tier upsell action", () => {
    const action = translateRetryAction(zhT, {
      reason: "free_tier_limit",
      provider: "opencode",
      title: "Free limit reached",
      message: "Subscribe to OpenCode Go for reliable access to the best open-source models, starting at $5/month.",
      label: "subscribe",
      link: "https://opencode.ai/go",
    })
    expect(action.title).toBe(zh["dialog.usageExceeded.freeTier.title"])
    expect(action.label).toBe(zh["dialog.usageExceeded.freeTier.actionLabel"])
  })

  test("formats retry status text", () => {
    expect(
      formatRetryStatusText(enT, {
        message: "Provider is overloaded",
        attempt: 2,
        seconds: 3,
        truncated: false,
      }),
    ).toContain("retrying in 3s - attempt #2")
  })

  test("formats retry info without delay", () => {
    expect(formatRetryInfo(enT, 1, 0)).toBe("retrying - attempt #1")
  })
})