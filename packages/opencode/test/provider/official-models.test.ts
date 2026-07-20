import { expect, test } from "bun:test"
import { ModelV2 } from "@opencode-ai/core/model"
import { ProviderV2 } from "@opencode-ai/core/provider"
import { Provider } from "@/provider/provider"
import { cachedOfficialModels, officialModels, replaceOfficialModels } from "@/provider/official-models"

const providerID = ProviderV2.ID.make("kimi-for-coding")

function provider(): Provider.Info {
  return {
    id: providerID,
    name: "Kimi For Coding",
    source: "api",
    env: [],
    options: {},
    models: {
      k2p7: {
        id: ModelV2.ID.make("k2p7"),
        providerID,
        api: { id: "k2p7", url: "https://api.kimi.com/coding/v1", npm: "@ai-sdk/anthropic" },
        name: "K2.7",
        family: "kimi",
        capabilities: {
          temperature: true,
          reasoning: true,
          attachment: false,
          toolcall: true,
          input: { text: true, audio: false, image: false, video: false, pdf: false },
          output: { text: true, audio: false, image: false, video: false, pdf: false },
          interleaved: false,
        },
        cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
        limit: { context: 128_000, output: 16_000 },
        status: "active",
        options: {},
        headers: {},
        release_date: "",
        variants: {},
      },
    },
  }
}

test("accepts official model lists and rejects malformed caches", () => {
  const models = officialModels({ data: [{ id: "k3", display_name: "K3", context_length: 262_144 }] })

  expect(models).toEqual([{ id: "k3", display_name: "K3", context_length: 262_144 }])
  expect(officialModels({ data: [{ display_name: "K3" }] })).toBeUndefined()
  expect(cachedOfficialModels({ "kimi-for-coding": models! })).toEqual({ "kimi-for-coding": models! })
  expect(cachedOfficialModels({ "kimi-for-coding": [{ context_length: 262_144 }] })).toEqual({})
})

test("replaces stale catalog models with official models", () => {
  const connected = provider()
  const catalog = provider()
  const models = officialModels({
    data: [
      {
        id: "k3",
        display_name: "K3",
        context_length: 262_144,
        supports_reasoning: true,
        supports_image_in: true,
        supports_video_in: true,
        think_efforts: { valid_efforts: ["low", "high", "max"] },
      },
    ],
  })!

  replaceOfficialModels({ provider: connected, catalog, models })

  expect(Object.keys(connected.models)).toEqual(["k3"])
  expect(catalog.models).toBe(connected.models)
  expect(connected.models.k3).toMatchObject({
    id: "k3",
    name: "K3",
    api: { id: "k3", npm: "@ai-sdk/anthropic" },
    limit: { context: 262_144 },
    capabilities: { reasoning: true, attachment: true, input: { image: true, video: true } },
    variants: { low: { effort: "low" }, high: { effort: "high" }, max: { effort: "max" } },
  })
})
