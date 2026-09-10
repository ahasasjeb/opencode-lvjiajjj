import type { Model, ModelCost, ModelV2Info, Provider } from "@opencode-ai/sdk/v2"
import type { Price, PricingOptions } from "./types.js"
import { TRACKED_PROVIDERS } from "./types.js"
import { usdPrice } from "./utils.js"

export type ModelsDevModel = Pick<ModelV2Info, "id" | "providerID" | "name" | "cost">

export type ModelsDevPriceEntry = {
  providerID: string
  providerLabel: string
  modelID: string
  modelLabel: string
  priceFor: (time: number, inputTokens: number, options: PricingOptions) => Price
}

// The TUI provider catalog already merges models.dev with the user's configuration.
// Use its model keys, not API aliases, to match the IDs stored in assistant messages.
export function buildProviderEntries(
  providers: readonly (Pick<Provider, "id" | "name"> & {
    models: Record<string, Pick<Model, "name" | "cost">>
  })[],
  covered: (providerID: string, modelID: string) => boolean = () => false,
) {
  return providers.flatMap((provider) =>
    buildModelsDevEntries(
      Object.entries(provider.models).map(([id, model]) => ({
        id,
        providerID: provider.id,
        name: model.name,
        cost: [
          model.cost,
          ...(model.cost.experimentalOver200K
            ? [{ ...model.cost.experimentalOver200K, tier: { type: "context" as const, size: 200_000 } }]
            : []),
          ...(model.cost.tiers ?? []),
        ],
      })),
      covered,
    ).map((entry) => ({ ...entry, providerLabel: provider.name || entry.providerLabel })),
  )
}

// 选择与当前输入 token 数匹配的 models.dev 价格档位：
// 无 tier 的条目为基准价；带 context tier 的条目表示输入超过该上下文大小时的价格。
function usdCostFor(inputTokens: number, costs: readonly ModelCost[]): ModelCost | undefined {
  const base = costs.find((cost) => cost.tier === undefined) ?? costs[0]
  if (base === undefined) return undefined
  let selected = base
  for (const cost of costs) {
    if (cost.tier !== undefined && cost.tier.type === "context" && inputTokens > cost.tier.size) {
      if (selected === base || cost.tier.size > selected.tier!.size) selected = cost
    }
  }
  return selected
}

function modelsDevPrice(entry: ModelCost, options: PricingOptions): Price {
  return usdPrice(options.usdCnyRate, {
    cacheHitInput: entry.cache.read,
    cacheMissInput: entry.input,
    cacheWriteInput: entry.cache.write,
    output: entry.output,
  })
}

export function buildModelsDevEntries(
  models: readonly ModelsDevModel[],
  covered: (providerID: string, modelID: string) => boolean = () => false,
): readonly ModelsDevPriceEntry[] {
  return models.flatMap((model) => {
    if (covered(model.providerID, model.id) || model.cost.length === 0) return []
    const providerLabel = TRACKED_PROVIDERS.find((item) => item.id === model.providerID)?.label ?? model.providerID
    return [
      {
        providerID: model.providerID,
        providerLabel,
        modelID: model.id,
        modelLabel: model.name || model.id,
        priceFor: (_time, inputTokens, options) => {
          const cost = usdCostFor(inputTokens, model.cost)
          if (cost === undefined) {
            return {
              cacheHitInput: 0,
              cacheMissInput: 0,
              output: 0,
              discounted: false,
            }
          }
          return modelsDevPrice(cost, options)
        },
      },
    ]
  })
}
