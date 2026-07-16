import type { Message } from "@opencode-ai/sdk/v2"
import { describe, expect, test } from "bun:test"
import {
  codexUsageDiagnostic,
  parseCodexResetCreditsResponse,
  parseCodexResetResponse,
  parseCodexUsageResponse,
  selectCodexOAuthSource,
} from "../../src/feature-plugins/llm-cny/codex-usage"
import { parseKimiUsageResponse } from "../../src/feature-plugins/llm-cny/kimi-usage"
import {
  hasChatGPTOAuthProvider,
  hasChatGPTUsage,
  hasKimiForCodingUsage,
  hasOpenAIApiKeyProvider,
  kimiForCodingApiKey,
} from "../../src/feature-plugins/llm-cny/tui/session"

function assistantMessage(providerID: string): Message {
  return {
    id: `${providerID}-assistant`,
    role: "assistant",
    providerID,
    modelID: "gpt-5.4",
    time: { completed: 1 },
  } as Message
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
        resetCredits: {
          availableCount: 2,
          credits: [],
        },
      },
    })
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
