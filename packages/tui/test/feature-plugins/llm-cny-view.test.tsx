/** @jsxImportSource @opentui/solid */
import { expect, test } from "bun:test"
import { RGBA } from "@opentui/core"
import { testRender } from "@opentui/solid"
import type { TuiPluginApi, TuiSlotPlugin } from "@opencode-ai/plugin/tui"
import { createSignal } from "solid-js"
import plugin from "../../src/feature-plugins/llm-cny/tui"
import { buildProviderEntries } from "../../src/feature-plugins/llm-cny/pricing/models-dev"

test("shows custom model costs when the configured provider catalog becomes available", async () => {
  const registrations: TuiSlotPlugin[] = []
  const [providers, setProviders] = createSignal<Parameters<typeof buildProviderEntries>[0]>([])
  const color = RGBA.fromHex("#ffffff")
  const api = {
    slots: {
      register(input: TuiSlotPlugin) {
        registrations.push(input)
        return "llm-cny-test"
      },
    },
    theme: {
      current: {
        text: color,
        textMuted: color,
        primary: color,
        success: color,
        warning: color,
        borderSubtle: color,
        backgroundElement: RGBA.fromHex("#000000"),
      },
    },
    i18n: { locale: "en", t: (key: string) => key },
    state: {
      config: {},
      get provider() {
        return providers()
      },
      session: {
        get: () => undefined,
        messages: () => [
          {
            id: "assistant-1",
            role: "assistant",
            providerID: "CustomGateway",
            modelID: "MyModel",
            time: { created: 1, completed: 2 },
            tokens: { input: 100, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
          },
        ],
      },
      part: () => [],
    },
    client: { session: { children: async () => ({ data: [] }) } },
  } as unknown as TuiPluginApi
  await plugin.tui!(api, { showWhenEmpty: false }, {} as Parameters<NonNullable<typeof plugin.tui>>[2])
  const sidebar = registrations[0]?.slots?.sidebar_content
  if (!sidebar) throw new Error("Missing LLM CNY sidebar registration")

  const app = await testRender(() => sidebar({ theme: api.theme }, { session_id: "test" }), {
    width: 90,
    height: 25,
  })
  try {
    await app.renderOnce()
    expect(app.captureCharFrame()).not.toContain("LLM CNY")
    setProviders([
      {
        id: "CustomGateway",
        name: "Configured Gateway",
        models: {
          MyModel: {
            name: "Configured Model",
            cost: { input: 2, output: 8, cache: { read: 0.2, write: 2 } },
          },
        },
      },
    ])
    await app.renderOnce()
    expect(app.captureCharFrame()).toContain("LLM CNY")
    expect(app.captureCharFrame()).toContain("Configured Gateway Configured Model")
    expect(app.captureCharFrame()).toContain("plugin.llmCny.cost")
    expect(app.captureCharFrame()).not.toContain("plugin.llmCny.activation")

    setProviders([])
    await app.renderOnce()
    expect(app.captureCharFrame()).not.toContain("LLM CNY")
  } finally {
    app.renderer.destroy()
  }
})
