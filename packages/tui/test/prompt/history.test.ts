import { describe, expect, test } from "bun:test"
import { createStore } from "solid-js/store"
import {
  compactPromptHistoryEntry,
  isDuplicateEntry,
  MAX_HISTORY_ENTRIES,
  parsePromptHistory,
  type PromptInfo,
} from "../../src/prompt/history"

const entry = (input: string, parts: PromptInfo["parts"] = []): PromptInfo => ({ input, parts })

describe("prompt history", () => {
  test("recovers valid JSONL entries around corruption", () => {
    expect(parsePromptHistory(`${JSON.stringify(entry("one"))}\nnot-json\n${JSON.stringify(entry("two"))}\n`)).toEqual([
      entry("one"),
      entry("two"),
    ])
  })

  test("retains only the newest entries", () => {
    const input = Array.from({ length: MAX_HISTORY_ENTRIES + 5 }, (_, index) =>
      JSON.stringify(entry(String(index))),
    ).join("\n")
    const result = parsePromptHistory(input)
    expect(result).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(result[0]?.input).toBe("5")
  })

  test("dedupes only identical consecutive entries", () => {
    expect(isDuplicateEntry(undefined, entry("hello"))).toBe(false)
    expect(isDuplicateEntry(entry("hello"), entry("hello"))).toBe(true)
    expect(isDuplicateEntry(entry("foo"), entry("bar"))).toBe(false)
    expect(isDuplicateEntry({ ...entry("ls"), mode: "normal" }, { ...entry("ls"), mode: "shell" })).toBe(false)
  })

  test("dedupes entries read from a reactive store", () => {
    const [store] = createStore({ history: [entry("hello")] })
    expect(isDuplicateEntry(store.history[0], entry("hello"))).toBe(true)
  })

  test("does not dedupe entries with different parts", () => {
    const a = entry("describe this", [
      { type: "file", mime: "image/png", filename: "a.png", url: "data:image/png;base64,AAA" },
    ])
    const b = entry("describe this", [
      { type: "file", mime: "image/png", filename: "b.png", url: "data:image/png;base64,BBB" },
    ])
    expect(isDuplicateEntry(a, b)).toBe(false)
  })

  test("omits inline attachment data from persistent history", () => {
    const item = entry("看[Image 1] 一下", [
      {
        type: "file",
        mime: "image/png",
        filename: "clipboard",
        url: `data:image/png;base64,${"A".repeat(1024)}`,
        source: {
          type: "file",
          path: "clipboard",
          text: { start: 2, end: 11, value: "[Image 1]" },
        },
      },
    ])

    expect(compactPromptHistoryEntry(item)).toEqual(entry("看一下"))
    expect(item.parts).toHaveLength(1)
  })

  test("cleans legacy inline attachments while parsing history", () => {
    const item = entry("[Image 1] describe this", [
      {
        type: "file",
        mime: "image/png",
        filename: "clipboard",
        url: "data:image/png;base64,AAA",
        source: {
          type: "file",
          path: "clipboard",
          text: { start: 0, end: 9, value: "[Image 1]" },
        },
      },
      { type: "file", mime: "text/plain", filename: "notes.txt", url: "file:///tmp/notes.txt" },
    ])

    expect(parsePromptHistory(JSON.stringify(item))).toEqual([
      entry("describe this", [
        { type: "file", mime: "text/plain", filename: "notes.txt", url: "file:///tmp/notes.txt" },
      ]),
    ])
  })
})
