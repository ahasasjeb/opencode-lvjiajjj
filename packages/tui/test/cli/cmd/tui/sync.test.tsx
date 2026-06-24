/** @jsxImportSource @opentui/solid */
import { describe, expect, test } from "bun:test"
import { tmpdir } from "../../../fixture/fixture"
import { mount, wait } from "./sync-fixture"
import type { GlobalEvent } from "@opencode-ai/sdk/v2"

function reasoningText(parts: { type: string; text?: string }[] | undefined) {
  const part = parts?.[0]
  return part?.type === "reasoning" ? part.text : undefined
}

function branchEvent(branch: string, workspace?: string): GlobalEvent {
  return {
    directory: "/tmp/other",
    project: "proj_test",
    workspace,
    payload: {
      id: `evt_vcs_${branch}`,
      type: "vcs.branch.updated",
      properties: { branch },
    },
  }
}

describe("tui sync", () => {
  test("refresh scopes sessions by default and lists project sessions when disabled", async () => {
    await using tmp = await tmpdir()
    await Bun.write(`${tmp.path}/kv.json`, "{}")
    const { app, kv, sync, session } = await mount(undefined, tmp.path)

    try {
      expect(kv.get("session_directory_filter_enabled", true)).toBe(true)
      expect(session.at(-1)?.searchParams.get("scope")).toBeNull()
      expect(session.at(-1)?.searchParams.get("path")).toBe("packages/tui")

      kv.set("session_directory_filter_enabled", false)
      await sync.session.refresh()

      expect(session.at(-1)?.searchParams.get("scope")).toBe("project")
      expect(session.at(-1)?.searchParams.get("path")).toBeNull()
    } finally {
      app.renderer.destroy()
    }
  })

  test("late empty part.updated does not wipe streamed reasoning text", async () => {
    await using tmp = await tmpdir()
    await Bun.write(`${tmp.path}/kv.json`, "{}")
    const { app, emit, sync } = await mount(undefined, tmp.path)

    const sessionID = "ses_stale"
    const messageID = "msg_stale"
    const partID = "prt_stale"

    try {
      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_start",
          type: "message.part.updated",
          properties: {
            sessionID,
            time: 1,
            part: {
              id: partID,
              sessionID,
              messageID,
              type: "reasoning",
              text: "",
              time: { start: 1 },
            },
          },
        },
      })
      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_delta",
          type: "message.part.delta",
          properties: { sessionID, messageID, partID, field: "text", delta: "long thinking chain" },
        },
      })
      await wait(() => reasoningText(sync.data.part[messageID]) === "long thinking chain")

      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_start_late",
          type: "message.part.updated",
          properties: {
            sessionID,
            time: 2,
            part: {
              id: partID,
              sessionID,
              messageID,
              type: "reasoning",
              text: "",
              time: { start: 1 },
            },
          },
        },
      })

      await Bun.sleep(50)
      expect(sync.data.part[messageID][0]).toMatchObject({ text: "long thinking chain" })
    } finally {
      app.renderer.destroy()
    }
  })

  test("reasoning deltas stream after the initial part.updated", async () => {
    await using tmp = await tmpdir()
    await Bun.write(`${tmp.path}/kv.json`, "{}")
    const { app, emit, sync } = await mount(undefined, tmp.path)

    const sessionID = "ses_stream"
    const messageID = "msg_stream"
    const partID = "prt_stream"

    try {
      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_start",
          type: "message.part.updated",
          properties: {
            sessionID,
            time: 1,
            part: {
              id: partID,
              sessionID,
              messageID,
              type: "reasoning",
              text: "",
              time: { start: 1 },
            },
          },
        },
      })
      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_delta",
          type: "message.part.delta",
          properties: { sessionID, messageID, partID, field: "text", delta: "thinking" },
        },
      })

      await wait(() => reasoningText(sync.data.part[messageID]) === "thinking")
      expect(sync.data.part[messageID][0]).toMatchObject({ type: "reasoning", text: "thinking" })

      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_end",
          type: "message.part.updated",
          properties: {
            sessionID,
            time: 2,
            part: {
              id: partID,
              sessionID,
              messageID,
              type: "reasoning",
              text: "thinking done",
              time: { start: 1, end: 2 },
            },
          },
        },
      })
      emit({
        directory: "/tmp/other",
        project: "proj_test",
        payload: {
          id: "evt_reasoning_late_delta",
          type: "message.part.delta",
          properties: { sessionID, messageID, partID, field: "text", delta: " ignored" },
        },
      })

      await wait(() => reasoningText(sync.data.part[messageID]) === "thinking done")
      expect(sync.data.part[messageID][0]).toMatchObject({ text: "thinking done" })
    } finally {
      app.renderer.destroy()
    }
  })

  test("vcs branch updates only apply for the active workspace", async () => {
    await using tmp = await tmpdir()
    await Bun.write(`${tmp.path}/kv.json`, "{}")
    const { app, emit, project, sync } = await mount(undefined, tmp.path)

    try {
      expect(sync.data.vcs?.branch).toBe("main")

      project.workspace.set("ws_a")
      emit(branchEvent("other", "ws_b"))
      await Bun.sleep(30)

      expect(sync.data.vcs?.branch).toBe("main")

      emit(branchEvent("feature", "ws_a"))
      await wait(() => sync.data.vcs?.branch === "feature")

      expect(sync.data.vcs?.branch).toBe("feature")
    } finally {
      app.renderer.destroy()
    }
  })
})
