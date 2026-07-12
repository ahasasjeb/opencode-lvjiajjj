import { expect, test } from "bun:test"
import { TextareaRenderable } from "@opentui/core"
import { createTestRenderer } from "@opentui/core/testing"

test("marks an editor destroyed before releasing its native view", async () => {
  const setup = await createTestRenderer({ width: 80, height: 24, useThread: false })
  const textarea = new TextareaRenderable(setup.renderer, { id: "editor" })
  const destroy = textarea.editorView.destroy.bind(textarea.editorView)
  const states: boolean[] = []

  textarea.editorView.destroy = () => {
    states.push(textarea.isDestroyed)
    destroy()
  }

  try {
    setup.renderer.root.add(textarea)
    textarea.destroy()
    expect(states).toEqual([true])
  } finally {
    setup.renderer.destroy()
  }
})
