import type { UsageRecord } from "./pricing.js"

const CODEX_LONG_CONTEXT_THRESHOLD_TOKENS = 512_000

type CodexModelPrice = {
  modelIDs: readonly string[]
  modelLabel: string
  input: number
  cachedInput: number
  output: number
}

export type CodexModelSubtotal = {
  modelLabel: string
  turns: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  credits: number
  longContextTurns: number
}

export type CodexSessionCostSummary = {
  turns: number
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  credits: number
  cacheHitRate?: number
  models: CodexModelSubtotal[]
}

const CODEX_MODEL_PRICES: readonly CodexModelPrice[] = [
  {
    modelIDs: ["gpt-5.6", "gpt-5.6-sol"],
    modelLabel: "GPT-5.6 Sol",
    input: 125,
    cachedInput: 12.5,
    output: 750,
  },
  {
    modelIDs: ["gpt-5.6-terra"],
    modelLabel: "GPT-5.6 Terra",
    input: 50,
    cachedInput: 5,
    output: 300,
  },
  {
    modelIDs: ["gpt-5.6-luna"],
    modelLabel: "GPT-5.6 Luna",
    input: 5,
    cachedInput: 0.5,
    output: 30,
  },
  {
    modelIDs: ["gpt-5.5"],
    modelLabel: "GPT-5.5",
    input: 125,
    cachedInput: 12.5,
    output: 750,
  },
  {
    modelIDs: ["gpt-5.5-cyber"],
    modelLabel: "GPT-5.5 Cyber",
    input: 312.5,
    cachedInput: 31.25,
    output: 1875,
  },
  {
    modelIDs: ["gpt-5.4"],
    modelLabel: "GPT-5.4",
    input: 62.5,
    cachedInput: 6.25,
    output: 375,
  },
  {
    modelIDs: ["gpt-5.4-mini"],
    modelLabel: "GPT-5.4 Mini",
    input: 18.75,
    cachedInput: 1.875,
    output: 113,
  },
  {
    modelIDs: ["gpt-5.3-codex"],
    modelLabel: "GPT-5.3 Codex",
    input: 43.75,
    cachedInput: 4.375,
    output: 350,
  },
  {
    modelIDs: ["gpt-5.2", "gpt-5.2-codex"],
    modelLabel: "GPT-5.2",
    input: 43.75,
    cachedInput: 4.375,
    output: 350,
  },
]

function safeTokenCount(value: number) {
  return Number.isFinite(value) ? Math.max(0, value) : 0
}

export function calculateCodexSession(records: readonly UsageRecord[]): CodexSessionCostSummary {
  const models = CODEX_MODEL_PRICES.flatMap((price) => {
    const matching = records.filter(
      (record) => record.providerID === "chatgpt" && price.modelIDs.includes(record.modelID),
    )
    if (matching.length === 0) return []
    return [
      matching.reduce<CodexModelSubtotal>(
        (sum, record) => {
          const inputTokens = safeTokenCount(record.tokens.input) + safeTokenCount(record.tokens.cache.write)
          const cachedInputTokens = safeTokenCount(record.tokens.cache.read)
          const outputTokens = safeTokenCount(record.tokens.output) + safeTokenCount(record.tokens.reasoning)
          const multiplier = inputTokens + cachedInputTokens > CODEX_LONG_CONTEXT_THRESHOLD_TOKENS ? 2 : 1
          return {
            ...sum,
            turns: sum.turns + 1,
            inputTokens: sum.inputTokens + inputTokens,
            cachedInputTokens: sum.cachedInputTokens + cachedInputTokens,
            outputTokens: sum.outputTokens + outputTokens,
            credits:
              sum.credits +
              (multiplier *
                (inputTokens * price.input + cachedInputTokens * price.cachedInput + outputTokens * price.output)) /
                1_000_000,
            longContextTurns: sum.longContextTurns + (multiplier === 2 ? 1 : 0),
          }
        },
        {
          modelLabel: price.modelLabel,
          turns: 0,
          inputTokens: 0,
          cachedInputTokens: 0,
          outputTokens: 0,
          credits: 0,
          longContextTurns: 0,
        },
      ),
    ]
  })

  const inputTokens = models.reduce((sum, model) => sum + model.inputTokens, 0)
  const cachedInputTokens = models.reduce((sum, model) => sum + model.cachedInputTokens, 0)

  return {
    turns: models.reduce((sum, model) => sum + model.turns, 0),
    inputTokens,
    cachedInputTokens,
    outputTokens: models.reduce((sum, model) => sum + model.outputTokens, 0),
    credits: Math.round(models.reduce((sum, model) => sum + model.credits, 0) * 1_000_000) / 1_000_000,
    cacheHitRate: cachedInputTokens + inputTokens > 0 ? cachedInputTokens / (cachedInputTokens + inputTokens) : undefined,
    models,
  }
}
