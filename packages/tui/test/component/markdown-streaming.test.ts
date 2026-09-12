import { afterEach, expect, test } from "bun:test"
import { CodeRenderable, MarkdownRenderable, SyntaxStyle } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"

let setup: Awaited<ReturnType<typeof createTestRenderer>> | undefined
let syntax: SyntaxStyle | undefined

afterEach(() => {
  setup?.renderer.destroy()
  syntax?.destroy()
  setup = undefined
  syntax = undefined
})

test("keeps final punctuation in its paragraph when streaming ends before the final content update", async () => {
  setup = await createTestRenderer({ width: 160, height: 10, useThread: false })
  syntax = SyntaxStyle.fromStyles({})
  const content = "验证一个具体问题：`venv/pyvenv.cfg` 是否真的对沙箱可写（看部署现场 ACL"
  const markdown = new MarkdownRenderable(setup.renderer, {
    content,
    syntaxStyle: syntax,
    streaming: true,
    internalBlockMode: "top-level",
  })
  setup.renderer.root.add(markdown)
  await setup.renderOnce()

  markdown.streaming = false
  markdown.content = content + "）。"
  await setup.renderOnce()
  await Promise.all(
    markdown
      .getChildren()
      .filter((child) => child instanceof CodeRenderable)
      .map((child) => child.highlightingDone),
  )
  await setup.renderOnce()

  expect(markdown._parseState?.tokens.map((token) => token.raw)).toEqual([content + "）。"])
  expect(
    setup
      .captureCharFrame()
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean),
  ).toEqual(["验证一个具体问题：venv/pyvenv.cfg 是否真的对沙箱可写（看部署现场 ACL）。"])
})

test.each([
  ["inline code", "Check `ACL", "` now."],
  ["emphasis", "Check **ACL", "** now."],
  ["link", "Check [ACL](https://example.com", ")."],
  ["code fence", "```text\nACL", "\n```"],
  ["table row", "| Name | Value |\n| --- | --- |\n| ACL |", " writable |"],
  ["paragraph break", "Check ACL", "\n\nNext paragraph."],
  ["hard line break", "Check ACL", "  \nNext line."],
])("reparses the final %s after streaming ends", async (_, content, suffix) => {
  setup = await createTestRenderer({ width: 160, height: 10, useThread: false })
  syntax = SyntaxStyle.fromStyles({})
  const markdown = new MarkdownRenderable(setup.renderer, {
    content,
    syntaxStyle: syntax,
    streaming: true,
    internalBlockMode: "top-level",
  })
  setup.renderer.root.add(markdown)
  markdown.streaming = false
  markdown.content = content + suffix

  const complete = new MarkdownRenderable(setup.renderer, {
    content: content + suffix,
    syntaxStyle: syntax,
    internalBlockMode: "top-level",
  })
  setup.renderer.root.add(complete)
  expect(markdown._parseState?.tokens).toEqual(complete._parseState?.tokens)
  expect(markdown.getChildren().length).toBe(complete.getChildren().length)
})

test("preserves stable blocks while appending to a completed paragraph", async () => {
  setup = await createTestRenderer({ width: 160, height: 10, useThread: false })
  syntax = SyntaxStyle.fromStyles({})
  const content = "# Heading\n\nFirst paragraph.\n\nCheck ACL"
  const markdown = new MarkdownRenderable(setup.renderer, {
    content,
    syntaxStyle: syntax,
    streaming: true,
    internalBlockMode: "top-level",
  })
  setup.renderer.root.add(markdown)
  const token = markdown._parseState?.tokens[0]

  markdown.content = content + "）"
  markdown.streaming = false
  const heading = markdown.getChildren()[0]
  markdown.content += "。"
  markdown.content += " Done."

  expect(markdown.getChildren()[0] === heading).toBe(true)
  expect(markdown._parseState?.tokens[0]).toBe(token)
  expect(markdown._parseState?.tokens.at(-1)?.raw).toBe("Check ACL）。 Done.")
  expect(markdown.getChildren()).toHaveLength(3)
})
