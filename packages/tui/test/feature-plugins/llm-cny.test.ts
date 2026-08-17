import type { Message } from "@opencode-ai/sdk/v2"
import { describe, expect, test } from "bun:test"
import { join } from "node:path"
import {
  codexUsageDiagnostic,
  parseCodexResetCreditsResponse,
  parseCodexResetResponse,
  parseCodexUsageResponse,
  selectCodexOAuthSource,
} from "../../src/feature-plugins/llm-cny/codex-usage"
import { calculateCodexSession } from "../../src/feature-plugins/llm-cny/codex-pricing"
import { parseKimiUsageResponse } from "../../src/feature-plugins/llm-cny/kimi-usage"
import { buildModelsDevEntries } from "../../src/feature-plugins/llm-cny/pricing/models-dev"
import { calculateTrackedSession, priceForModel, trackedModel } from "../../src/feature-plugins/llm-cny/pricing"
import {
  DEEPSEEK_V4_NEW_PRICING_AT,
  flashOffPeakPrice,
  flashPeakPrice,
  flashPrice,
  isDeepseekPeakHour,
  proOffPeakPrice,
  proPeakPrice,
  proPrice,
} from "../../src/feature-plugins/llm-cny/pricing/deepseek"
import { fetchXaiUsage, parseXaiUsageResponse } from "../../src/feature-plugins/llm-cny/xai-usage"
import {
  hasChatGPTOAuthProvider,
  hasChatGPTDiscardedToolContext,
  hasChatGPTUsage,
  hasKimiForCodingUsage,
  hasOpenAIApiKeyProvider,
  hasXaiOAuthProvider,
  hasXaiUsage,
  kimiForCodingApiKey,
} from "../../src/feature-plugins/llm-cny/tui/session"
import { tmpdir } from "../fixture/fixture"

function assistantMessage(providerID: string): Message {
  return {
    id: `${providerID}-assistant`,
    role: "assistant",
    providerID,
    modelID: "gpt-5.4",
    time: { completed: 1 },
  } as Message
}

function chatgptAssistant(id: string): Extract<Message, { role: "assistant" }> {
  return {
    id,
    role: "assistant",
    providerID: "chatgpt",
    modelID: "gpt-5.6",
    tokens: { input: 100, output: 1, reasoning: 0, cache: { read: 0, write: 0 } },
  } as Extract<Message, { role: "assistant" }>
}

describe("LLM CNY quota integration", () => {
  test("keeps OpenAI API billing separate from ChatGPT OAuth limits", () => {
    expect(hasOpenAIApiKeyProvider([{ id: "openai", key: "sk-test" }])).toBe(true)
    expect(hasChatGPTOAuthProvider([{ id: "openai", key: "sk-test" }])).toBe(false)
    expect(hasChatGPTOAuthProvider([{ id: "chatgpt" }])).toBe(true)
    expect(hasChatGPTUsage([assistantMessage("openai")])).toBe(false)
    expect(hasChatGPTUsage([assistantMessage("chatgpt")])).toBe(true)
  })

  test("detects Kimi For Coding usage separately from Moonshot API usage", () => {
    expect(hasKimiForCodingUsage([assistantMessage("kimi-for-coding")])).toBe(true)
    expect(hasKimiForCodingUsage([assistantMessage("moonshotai")])).toBe(false)
  })

  test("detects xAI OAuth without treating an xAI API key as OAuth", () => {
    expect(
      hasXaiOAuthProvider([{ id: "xai", source: "custom", options: { apiKey: "opencode-oauth-dummy-key" } }]),
    ).toBe(true)
    expect(hasXaiOAuthProvider([{ id: "xai", source: "api", key: "xai-api-key" }])).toBe(false)
  })

  test("only shows Grok quota after this session has used xAI", () => {
    expect(hasXaiUsage([assistantMessage("alibaba-coding-plan-cn")])).toBe(false)
    expect(hasXaiUsage([assistantMessage("xai")])).toBe(true)
  })

  test("reads the Kimi For Coding key exposed from local provider auth", () => {
    expect(
      kimiForCodingApiKey({
        state: {
          provider: [{ id: "kimi-for-coding", key: "sk-kimi-local", env: [], options: {} }],
          config: {},
        },
      }),
    ).toBe("sk-kimi-local")
  })

  test("parses Kimi cycle, rolling window, monthly, and parallel quotas", () => {
    expect(
      parseKimiUsageResponse(
        JSON.stringify({
          user: { membership: { level: "LEVEL_BASIC" } },
          usage: { limit: "100", used: "20", remaining: "80", resetTime: "2026-07-23T21:35:08Z" },
          limits: [
            {
              window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
              detail: { limit: "100", used: "40", resetTime: "2026-07-17T02:35:08Z" },
            },
          ],
          parallel: { limit: "10" },
          totalQuota: { limit: "100", remaining: "99" },
        }),
      ),
    ).toEqual({
      ok: true,
      usage: {
        membershipLevel: "LEVEL_BASIC",
        usage: {
          limit: 100,
          used: 20,
          remaining: 80,
          resetAt: Date.parse("2026-07-23T21:35:08Z") / 1000,
        },
        limits: [
          {
            limit: 100,
            used: 40,
            remaining: 60,
            resetAt: Date.parse("2026-07-17T02:35:08Z") / 1000,
            windowSeconds: 18_000,
          },
        ],
        totalQuota: { limit: 100, remaining: 99 },
        parallelLimit: 10,
      },
    })
  })

  test("parses earned reset credits from the usage response", () => {
    expect(
      parseCodexUsageResponse(
        JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: {
              used_percent: 69,
              limit_window_seconds: 18_000,
              reset_at: 123,
            },
            secondary_window: {
              used_percent: 49,
              limit_window_seconds: 604_800,
              reset_at: 456,
            },
          },
          rate_limit_reset_credits: {
            available_count: 2,
          },
        }),
      ),
    ).toEqual({
      ok: true,
      usage: {
        planType: "plus",
        primary: {
          usedPercent: 69,
          windowSeconds: 18_000,
          resetAt: 123,
        },
        secondary: {
          usedPercent: 49,
          windowSeconds: 604_800,
          resetAt: 456,
        },
        credits: null,
        resetCredits: {
          availableCount: 2,
          credits: [],
        },
      },
    })
  })

  test("parses remaining Codex credits and message estimates", () => {
    expect(
      parseCodexUsageResponse(
        JSON.stringify({
          credits: {
            balance: "1483.6393350000",
            unlimited: false,
            approx_local_messages: [371, 1929],
            approx_cloud_messages: [59, 371],
          },
        }),
      ),
    ).toEqual({
      ok: true,
      usage: {
        planType: "",
        primary: null,
        secondary: null,
        credits: {
          balance: 1483.639335,
          unlimited: false,
          approxLocalMessages: [371, 1929],
          approxCloudMessages: [59, 371],
        },
        resetCredits: null,
      },
    })
  })

  test("calculates Codex credits from input, cache, and output tokens", () => {
    const summary = calculateCodexSession([
      {
        providerID: "chatgpt",
        modelID: "gpt-5.6-sol",
        tokens: { input: 100_000, output: 100_000, reasoning: 0, cache: { read: 100_000, write: 0 } },
      },
    ])

    expect(summary.credits).toBe(88.75)
    expect(summary.cacheHitRate).toBe(0.5)
    expect(summary.models).toEqual([
      expect.objectContaining({
        modelLabel: "GPT-5.6 Sol",
        inputTokens: 100_000,
        cachedInputTokens: 100_000,
        outputTokens: 100_000,
        credits: 88.75,
      }),
    ])
  })

  test("doubles every Codex credit rate above the 512K context threshold", () => {
    const summary = calculateCodexSession([
      {
        providerID: "chatgpt",
        modelID: "gpt-5.4-mini",
        tokens: { input: 512_001, output: 1_000_000, reasoning: 0, cache: { read: 0, write: 0 } },
      },
    ])

    expect(summary.credits).toBeCloseTo(((512_001 * 18.75 + 1_000_000 * 113) / 1_000_000) * 2, 6)
    expect(summary.models[0]!.longContextTurns).toBe(1)
  })

  test("only warns when a ChatGPT tool discards context", () => {
    const messages = [chatgptAssistant("discarded")]
    const parts = () =>
      [
        {
          type: "tool",
          state: { status: "completed", metadata: { "opencode.context.retain": false } },
        },
      ] as never

    expect(hasChatGPTDiscardedToolContext(messages, parts)).toBe(true)
    expect(
      hasChatGPTDiscardedToolContext(messages, () => [{ type: "tool", state: { status: "pending" } }] as never),
    ).toBe(false)
    expect(
      hasChatGPTDiscardedToolContext(
        [{ ...messages[0]!, providerID: "openai" }],
        parts,
      ),
    ).toBe(false)
  })

  test("parses Grok Build credits usage", () => {
    expect(
      parseXaiUsageResponse(
        JSON.stringify({
          config: {
            creditUsagePercent: 42.5,
            currentPeriod: {
              type: "USAGE_PERIOD_TYPE_WEEKLY",
              end: "2026-07-24T00:00:00Z",
            },
            onDemandCap: { val: 5000 },
            onDemandUsed: { val: 300 },
            prepaidBalance: { val: 1250 },
          },
        }),
        "SuperGrok Heavy",
      ),
    ).toEqual({
      ok: true,
      usage: {
        subscriptionTier: "SuperGrok Heavy",
        usedPercent: 42.5,
        periodType: "USAGE_PERIOD_TYPE_WEEKLY",
        resetAt: Date.parse("2026-07-24T00:00:00Z") / 1000,
        prepaidBalanceCents: 1250,
        onDemandCapCents: 5000,
        onDemandUsedCents: 300,
      },
    })
  })

  test("silently retries Grok usage once and succeeds", async () => {
    await using tmp = await tmpdir()
    await Bun.write(
      join(tmp.path, "auth.json"),
      JSON.stringify({ xai: { type: "oauth", access: "access", refresh: "refresh", expires: Date.now() + 60_000 } }),
    )
    const calls: string[] = []
    const request = async (input: string | URL | Request, init?: RequestInit) => {
      const url = input instanceof Request ? input.url : input.toString()
      calls.push(url)
      expect(new Headers(init?.headers).get("X-XAI-Token-Auth")).toBe("xai-grok-cli")
      if (url.includes("/user?")) {
        if (calls.length === 1) return new Response("temporary", { status: 503 })
        return Response.json({ userId: "user-1", subscriptionTier: "SuperGrok" })
      }
      return Response.json({ config: { creditUsagePercent: 25 } })
    }

    expect(await fetchXaiUsage(tmp.path, { fetch: request, retryDelayMs: 0 })).toEqual({
      ok: true,
      usage: {
        subscriptionTier: "SuperGrok",
        usedPercent: 25,
        periodType: "",
        resetAt: null,
        prepaidBalanceCents: null,
        onDemandCapCents: null,
        onDemandUsedCents: null,
      },
    })
    expect(calls).toHaveLength(3)
  })

  test("stops Grok usage after the one retry also fails", async () => {
    await using tmp = await tmpdir()
    await Bun.write(
      join(tmp.path, "auth.json"),
      JSON.stringify({ xai: { type: "oauth", access: "access", refresh: "refresh", expires: Date.now() + 60_000 } }),
    )
    const calls: string[] = []
    const request = async (input: string | URL | Request) => {
      calls.push(input instanceof Request ? input.url : input.toString())
      return new Response("unavailable", { status: 503 })
    }

    expect(await fetchXaiUsage(tmp.path, { fetch: request, retryDelayMs: 0 })).toEqual({
      ok: false,
      message: "HTTP 503",
    })
    expect(calls).toHaveLength(2)
  })

  test("parses and orders multiple available reset expirations", () => {
    expect(
      parseCodexResetCreditsResponse(
        JSON.stringify({
          credits: [
            { status: "available", expires_at: "2026-08-12T18:04:36Z" },
            { status: "redeemed", expires_at: "2026-07-01T00:00:00Z" },
            { status: "available", expires_at: "2026-08-01T10:00:00Z" },
          ],
          available_count: 2,
        }),
      ),
    ).toEqual({
      ok: true,
      resetCredits: {
        availableCount: 2,
        credits: [
          { expiresAt: Date.parse("2026-08-01T10:00:00Z") / 1000 },
          { expiresAt: Date.parse("2026-08-12T18:04:36Z") / 1000 },
        ],
      },
    })
  })

  test("parses all reset outcomes", () => {
    expect(parseCodexResetResponse('{"code":"reset","windows_reset":2}')).toEqual({
      ok: true,
      outcome: "reset",
      windowsReset: 2,
    })
    expect(parseCodexResetResponse('{"code":"nothing_to_reset"}')).toEqual({
      ok: true,
      outcome: "nothing_to_reset",
      windowsReset: 0,
    })
    expect(parseCodexResetResponse('{"code":"no_credit"}')).toEqual({
      ok: true,
      outcome: "no_credit",
      windowsReset: 0,
    })
    expect(parseCodexResetResponse('{"code":"already_redeemed"}')).toEqual({
      ok: true,
      outcome: "already_redeemed",
      windowsReset: 0,
    })
  })
  test("redacts OAuth credentials from Codex usage diagnostics", () => {
    const diagnostic = codexUsageDiagnostic({
      operation: "usage",
      stage: "final_failure",
      status: 401,
      refreshed: true,
      source: "auth.json",
      cred: {
        type: "oauth",
        access: "access-secret",
        refresh: "refresh-secret",
        expires: Date.now() + 60_000,
        accountId: "account-secret",
      },
    })

    expect(diagnostic).toMatchObject({
      operation: "usage",
      stage: "final_failure",
      status: 401,
      refreshed: true,
      source: "auth.json",
      hasAccessToken: true,
      hasRefreshToken: true,
      hasAccountId: true,
      accessTokenExpired: false,
    })
    expect(JSON.stringify(diagnostic)).not.toContain("secret")
  })

  test("selects the newest Codex OAuth credential across storage formats", () => {
    const selected = selectCodexOAuthSource([
      {
        filePath: "account.json",
        credential: {
          type: "oauth",
          access: "stale-access",
          refresh: "stale-refresh",
          expires: 1,
        },
      },
      {
        filePath: "auth.json",
        credential: {
          type: "oauth",
          access: "current-access",
          refresh: "current-refresh",
          expires: 2,
          accountId: "current-account",
        },
      },
    ])

    expect(selected?.filePath).toBe("auth.json")
    expect(selected?.credential.expires).toBe(2)
  })
})

describe("LLM CNY models.dev fallback pricing", () => {
  const modelInfo = (overrides: Partial<Parameters<typeof buildModelsDevEntries>[0][number]> = {}) => ({
    id: "acme-1",
    providerID: "acme",
    name: "Acme Model 1",
    cost: [
      { input: 1, output: 2, cache: { read: 0.5, write: 1.5 } },
      { tier: { type: "context" as const, size: 200_000 }, input: 2, output: 4, cache: { read: 1, write: 3 } },
    ],
    ...overrides,
  })

  test("builds entries for models not covered by presets", () => {
    const covered = buildModelsDevEntries([modelInfo()], (providerID, modelID) => trackedModel(providerID, modelID) !== undefined)
    expect(covered).toHaveLength(1)
    expect(covered[0]!.modelID).toBe("acme-1")
    expect(covered[0]!.providerLabel).toBe("acme")
  })

  test("skips models already covered by presets", () => {
    const covered = buildModelsDevEntries(
      [modelInfo({ id: "deepseek-v4-flash", providerID: "deepseek" })],
      (providerID, modelID) => trackedModel(providerID, modelID) !== undefined,
    )
    expect(covered).toHaveLength(0)
  })

  test("skips models without cost data", () => {
    const covered = buildModelsDevEntries([modelInfo({ cost: [] })])
    expect(covered).toHaveLength(0)
  })

  test("picks the tier matching the input token count and converts USD to CNY", () => {
    const entries = buildModelsDevEntries([modelInfo()])
    const short = entries[0]!.priceFor(Date.now(), 10_000, { usdCnyRate: 7.2 })
    const long = entries[0]!.priceFor(Date.now(), 300_000, { usdCnyRate: 7.2 })
    expect(short.cacheMissInput).toBe(7.2)
    expect(short.output).toBe(14.4)
    expect(long.cacheMissInput).toBe(14.4)
    expect(long.output).toBe(28.8)
  })

  test("flags a pending exchange rate warning when the rate is missing", () => {
    const entries = buildModelsDevEntries([modelInfo()])
    const price = entries[0]!.priceFor(Date.now(), 10_000, {})
    expect(price.cacheMissInput).toBe(0)
    expect(price.warnings).toContain("正在获取美元兑人民币汇率，成功后自动换算人民币价格")
  })

  test("includes models.dev records in the tracked session summary", () => {
    const entries = buildModelsDevEntries([modelInfo()])
    const summary = calculateTrackedSession(
      [
        {
          providerID: "acme",
          modelID: "acme-1",
          time: { completed: 1 },
          tokens: { input: 100_000, output: 1_000, reasoning: 0, cache: { read: 0, write: 0 } },
        },
      ],
      { usdCnyRate: 7.2 },
      entries,
    )
    expect(summary.turns).toBe(1)
    // input 100k * 1 USD/1M + output 1k * 2 USD/1M, converted at 7.2
    expect(summary.costCny).toBeCloseTo(0.7344, 6)
  })
})

describe("LLM CNY cache hit rate", () => {
  const record = (read: number, write: number, input: number) => ({
    providerID: "deepseek",
    modelID: "deepseek-v4-flash",
    time: { completed: 1 },
    tokens: { input, output: 1_000, reasoning: 0, cache: { read, write } },
  })

  test("computes the hit rate across cache reads, misses, and writes", () => {
    const summary = calculateTrackedSession([record(3_000, 0, 1_000), record(6_000, 1_000, 2_000)])
    // hit 9k / (hit 9k + miss input 3k + write 1k)
    expect(summary.cacheHitRate).toBeCloseTo(9_000 / 13_000, 6)
  })

  test("reports 100% when every input token was served from cache", () => {
    const summary = calculateTrackedSession([record(4_000, 0, 0), record(4_000, 0, 0)])
    expect(summary.cacheHitRate).toBe(1)
  })

  test("reports 0 when the cache never hit", () => {
    const summary = calculateTrackedSession([record(0, 500, 2_000), record(0, 0, 3_000)])
    expect(summary.cacheHitRate).toBe(0)
  })

  test("omits the hit rate when there is no input at all", () => {
    const summary = calculateTrackedSession([record(0, 0, 0), record(0, 0, 0)])
    expect(summary.cacheHitRate).toBeUndefined()
  })
})

describe("LLM CNY DeepSeek V4 peak pricing", () => {
  const beijing = (value: string) => Date.parse(`${value}+08:00`)

  test("keeps launch prices before Beijing 2026-08-17 00:00, including peak clock hours", () => {
    expect(priceForModel("deepseek-v4-flash", beijing("2026-08-16T23:59:59"))).toEqual(flashPrice)
    expect(priceForModel("deepseek-v4-pro", beijing("2026-08-16T10:00:00"))).toEqual(proPrice)
    expect(priceForModel("deepseek-v4-flash", DEEPSEEK_V4_NEW_PRICING_AT - 1)).toEqual(flashPrice)
  })

  test("switches to off-peak rates at Beijing 2026-08-17 00:00", () => {
    expect(priceForModel("deepseek-v4-flash", DEEPSEEK_V4_NEW_PRICING_AT)).toEqual(flashOffPeakPrice)
    expect(priceForModel("deepseek-v4-pro", beijing("2026-08-17T00:00:00"))).toEqual(proOffPeakPrice)
    expect(priceForModel("deepseek-v4-pro", beijing("2026-08-17T13:59:59"))).toEqual(proOffPeakPrice)
  })

  test("uses peak rates only in Beijing 9:00-12:00 and 14:00-18:00 after the switch", () => {
    expect(isDeepseekPeakHour(beijing("2026-08-17T08:59:59"))).toBe(false)
    expect(isDeepseekPeakHour(beijing("2026-08-17T09:00:00"))).toBe(true)
    expect(isDeepseekPeakHour(beijing("2026-08-17T11:59:59"))).toBe(true)
    expect(isDeepseekPeakHour(beijing("2026-08-17T12:00:00"))).toBe(false)
    expect(isDeepseekPeakHour(beijing("2026-08-17T13:59:59"))).toBe(false)
    expect(isDeepseekPeakHour(beijing("2026-08-17T14:00:00"))).toBe(true)
    expect(isDeepseekPeakHour(beijing("2026-08-17T17:59:59"))).toBe(true)
    expect(isDeepseekPeakHour(beijing("2026-08-17T18:00:00"))).toBe(false)

    expect(priceForModel("deepseek-v4-flash", beijing("2026-08-17T09:00:00"))).toEqual(flashPeakPrice)
    expect(priceForModel("deepseek-v4-flash", beijing("2026-08-17T15:00:00"))).toEqual(flashPeakPrice)
    expect(priceForModel("deepseek-v4-pro", beijing("2026-08-17T11:30:00"))).toEqual(proPeakPrice)
    expect(priceForModel("deepseek-v4-pro", beijing("2026-08-17T16:00:00"))).toEqual(proPeakPrice)
  })

  test("prices a completed turn from the message time, not the current clock", () => {
    const summary = calculateTrackedSession([
      {
        providerID: "deepseek",
        modelID: "deepseek-v4-pro",
        time: { completed: beijing("2026-08-17T10:00:00") },
        tokens: { input: 1_000_000, output: 1_000_000, reasoning: 0, cache: { read: 0, write: 0 } },
      },
    ])
    expect(summary.costCny).toBe(36)
  })
})
