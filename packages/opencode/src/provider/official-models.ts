import { ModelV2 } from "@opencode-ai/core/model"
import { Schema } from "effect"
import type { Info, Model } from "./provider"

const ThinkEfforts = Schema.Struct({
  support: Schema.optional(Schema.Boolean),
  valid_efforts: Schema.optional(Schema.Array(Schema.String)),
  default_effort: Schema.optional(Schema.String),
})

const OfficialModel = Schema.Struct({
  id: Schema.String,
  display_name: Schema.optional(Schema.String),
  created: Schema.optional(Schema.Finite),
  context_length: Schema.optional(Schema.Finite),
  supports_reasoning: Schema.optional(Schema.Boolean),
  supports_image_in: Schema.optional(Schema.Boolean),
  supports_video_in: Schema.optional(Schema.Boolean),
  think_efforts: Schema.optional(ThinkEfforts),
})
export type OfficialModel = typeof OfficialModel.Type

const OfficialModelsResponse = Schema.Struct({
  data: Schema.Array(OfficialModel),
})

const OfficialModelsCache = Schema.Record(Schema.String, Schema.Array(OfficialModel))

export const OFFICIAL_MODEL_PROVIDERS = {
  "alibaba-coding-plan": "https://coding-intl.dashscope.aliyuncs.com/v1/models",
  "alibaba-coding-plan-cn": "https://coding.dashscope.aliyuncs.com/v1/models",
  "kimi-for-coding": "https://api.kimi.com/coding/v1/models",
} as const

export function hasOfficialModelList(providerID: string): providerID is keyof typeof OFFICIAL_MODEL_PROVIDERS {
  return providerID in OFFICIAL_MODEL_PROVIDERS
}

export function officialModelKey(provider: Info) {
  if (provider.key) return provider.key
  const apiKey = provider.options.apiKey
  if (typeof apiKey === "string" && apiKey) return apiKey
}

export function officialModels(value: unknown): readonly OfficialModel[] | undefined {
  if (!Schema.is(OfficialModelsResponse)(value)) return
  return value.data
}

export function cachedOfficialModels(value: unknown): Readonly<Record<string, readonly OfficialModel[]>> {
  if (!Schema.is(OfficialModelsCache)(value)) return {}
  return value
}

export async function fetchOfficialModels(providerID: keyof typeof OFFICIAL_MODEL_PROVIDERS, key: string) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)
  return fetch(OFFICIAL_MODEL_PROVIDERS[providerID], {
    headers: { Authorization: `Bearer ${key}` },
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) return
      return officialModels((await response.json()) as unknown)
    })
    .catch(() => undefined)
    .finally(() => clearTimeout(timeout))
}

export function replaceOfficialModels(input: {
  provider: Info
  catalog: Info
  models: readonly OfficialModel[]
  include?: (modelID: string) => boolean
}) {
  const sources = { ...input.catalog.models, ...input.provider.models }
  const fallback = Object.values(sources)[0]
  if (!fallback) return

  const next = Object.fromEntries(
    Array.from(new Map(input.models.map((model) => [model.id, model])).values()).flatMap((official) => {
      if (input.include && !input.include(official.id)) return []
      const source = sources[official.id] ?? fallback
      const hasAttachmentInfo = official.supports_image_in !== undefined || official.supports_video_in !== undefined
      const matchingSource = sources[official.id]
      const model: Model = {
        ...source,
        id: ModelV2.ID.make(official.id),
        api: { ...source.api, id: official.id },
        name: official.display_name ?? (matchingSource ? source.name : official.id),
        release_date:
          matchingSource || official.created === undefined
            ? source.release_date
            : new Date(official.created * 1_000).toISOString().slice(0, 10),
        capabilities: {
          ...source.capabilities,
          reasoning: official.supports_reasoning ?? source.capabilities.reasoning,
          attachment: hasAttachmentInfo
            ? Boolean(official.supports_image_in || official.supports_video_in)
            : source.capabilities.attachment,
          input: {
            ...source.capabilities.input,
            image: official.supports_image_in ?? source.capabilities.input.image,
            video: official.supports_video_in ?? source.capabilities.input.video,
          },
        },
        limit: {
          ...source.limit,
          context: official.context_length ?? source.limit.context,
        },
        variants: official.think_efforts?.valid_efforts
          ? Object.fromEntries(
              official.think_efforts.valid_efforts.map((effort) => [
                effort,
                { effort, ...matchingSource?.variants?.[effort] },
              ]),
            )
          : matchingSource?.variants ?? {},
      }
      return [[official.id, model]]
    }),
  ) as Info["models"]

  input.provider.models = next
  input.catalog.models = next
}
