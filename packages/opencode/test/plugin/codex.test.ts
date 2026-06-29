import { describe, expect, test } from "bun:test"
import {
  CodexAuthPlugin,
  OpenAIAuthPlugin,
  parseJwtClaims,
  extractAccountIdFromClaims,
  extractAccountId,
  renderOAuthError,
  type IdTokenClaims,
} from "../../src/plugin/openai/codex"

function createTestJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${header}.${body}.sig`
}

describe("plugin.codex", () => {
  test("escapes provider errors in callback HTML", () => {
    const error = `</div><script>alert("xss" & 'more')</script>`
    const html = renderOAuthError(error)

    expect(html).toContain("&lt;/div&gt;&lt;script&gt;alert(&quot;xss&quot; &amp; &#39;more&#39;)&lt;/script&gt;")
    expect(html).not.toContain(error)
  })

  describe("parseJwtClaims", () => {
    test("parses valid JWT with claims", () => {
      const payload = { email: "test@example.com", chatgpt_account_id: "acc-123" }
      const jwt = createTestJwt(payload)
      const claims = parseJwtClaims(jwt)
      expect(claims).toEqual(payload)
    })

    test("returns undefined for JWT with less than 3 parts", () => {
      expect(parseJwtClaims("invalid")).toBeUndefined()
      expect(parseJwtClaims("only.two")).toBeUndefined()
    })

    test("returns undefined for invalid base64", () => {
      expect(parseJwtClaims("a.!!!invalid!!!.b")).toBeUndefined()
    })

    test("returns undefined for invalid JSON payload", () => {
      const header = Buffer.from("{}").toString("base64url")
      const invalidJson = Buffer.from("not json").toString("base64url")
      expect(parseJwtClaims(`${header}.${invalidJson}.sig`)).toBeUndefined()
    })
  })

  describe("extractAccountIdFromClaims", () => {
    test("extracts chatgpt_account_id from root", () => {
      const claims: IdTokenClaims = { chatgpt_account_id: "acc-root" }
      expect(extractAccountIdFromClaims(claims)).toBe("acc-root")
    })

    test("extracts chatgpt_account_id from nested https://api.openai.com/auth", () => {
      const claims: IdTokenClaims = {
        "https://api.openai.com/auth": { chatgpt_account_id: "acc-nested" },
      }
      expect(extractAccountIdFromClaims(claims)).toBe("acc-nested")
    })

    test("prefers root over nested", () => {
      const claims: IdTokenClaims = {
        chatgpt_account_id: "acc-root",
        "https://api.openai.com/auth": { chatgpt_account_id: "acc-nested" },
      }
      expect(extractAccountIdFromClaims(claims)).toBe("acc-root")
    })

    test("extracts from organizations array as fallback", () => {
      const claims: IdTokenClaims = {
        organizations: [{ id: "org-123" }, { id: "org-456" }],
      }
      expect(extractAccountIdFromClaims(claims)).toBe("org-123")
    })

    test("returns undefined when no accountId found", () => {
      const claims: IdTokenClaims = { email: "test@example.com" }
      expect(extractAccountIdFromClaims(claims)).toBeUndefined()
    })
  })

  describe("extractAccountId", () => {
    test("extracts from id_token first", () => {
      const idToken = createTestJwt({ chatgpt_account_id: "from-id-token" })
      const accessToken = createTestJwt({ chatgpt_account_id: "from-access-token" })
      expect(
        extractAccountId({
          id_token: idToken,
          access_token: accessToken,
          refresh_token: "rt",
        }),
      ).toBe("from-id-token")
    })

    test("falls back to access_token when id_token has no accountId", () => {
      const idToken = createTestJwt({ email: "test@example.com" })
      const accessToken = createTestJwt({
        "https://api.openai.com/auth": { chatgpt_account_id: "from-access" },
      })
      expect(
        extractAccountId({
          id_token: idToken,
          access_token: accessToken,
          refresh_token: "rt",
        }),
      ).toBe("from-access")
    })

    test("returns undefined when no tokens have accountId", () => {
      const token = createTestJwt({ email: "test@example.com" })
      expect(
        extractAccountId({
          id_token: token,
          access_token: token,
          refresh_token: "rt",
        }),
      ).toBeUndefined()
    })

    test("handles missing id_token", () => {
      const accessToken = createTestJwt({ chatgpt_account_id: "acc-123" })
      expect(
        extractAccountId({
          id_token: "",
          access_token: accessToken,
          refresh_token: "rt",
        }),
      ).toBe("acc-123")
    })
  })

  test("installs websocket transport only when experimental websockets are enabled", async () => {
    const disabled = await CodexAuthPlugin({} as never)
    const enabled = await CodexAuthPlugin({} as never, { experimentalWebSockets: true })

    const disabledOptions = await disabled.auth!.loader!(
      async () => ({ type: "api", key: "sk-test" }) as never,
      {} as never,
    )
    const enabledOptions = await enabled.auth!.loader!(
      async () => ({ type: "api", key: "sk-test" }) as never,
      {} as never,
    )

    expect(disabledOptions.fetch).toBeUndefined()
    expect(enabledOptions.fetch).toBeFunction()
    await enabled.dispose?.()
  })

  test("keeps OpenAI API key and ChatGPT login as separate providers", async () => {
    const openai = await OpenAIAuthPlugin()
    const chatgpt = await CodexAuthPlugin({} as never)

    expect(openai.auth?.provider).toBe("openai")
    expect(openai.auth?.methods.map((method) => method.type)).toEqual(["api"])
    expect(chatgpt.auth?.provider).toBe("chatgpt")
    expect(chatgpt.auth?.methods.map((method) => method.type)).toEqual(["oauth", "oauth"])
    expect(chatgpt.provider).toMatchObject({
      id: "chatgpt",
      source: "openai",
      name: "ChatGPT (Codex OAuth)",
    })
    expect(openai.provider).toMatchObject({
      id: "openai",
      name: "OpenAI (API Key)",
    })
  })

  test("keeps static ChatGPT models when the preferred fallback set is empty", async () => {
    using server = Bun.serve({
      port: 0,
      fetch() {
        return new Response("unavailable", { status: 503 })
      },
    })
    const hooks = await CodexAuthPlugin({} as never, {
      codexModelsEndpoint: new URL("/models", server.url).toString(),
    })
    const models = await hooks.provider!.models!(
      {
        id: "chatgpt",
        models: {
          "gpt-4.1": {
            id: "gpt-4.1",
            providerID: "chatgpt",
            name: "GPT-4.1",
            api: { id: "gpt-4.1", url: "https://api.openai.com/v1", npm: "@ai-sdk/openai" },
            cost: { input: 1, output: 1, cache: { read: 1, write: 1 } },
            limit: { context: 100_000, output: 10_000 },
          },
        },
      } as never,
      {
        auth: {
          type: "oauth",
          refresh: "refresh",
          access: "access",
          expires: Date.now() + 60_000,
        } as never,
      },
    )

    expect(models["gpt-4.1"]).toMatchObject({
      cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
    })
  })

  test("returns cached models immediately and refreshes them in the background", async () => {
    let releaseModels: (() => void) | undefined
    const modelsReady = new Promise<void>((resolve) => {
      releaseModels = resolve
    })
    let requestURL: string | undefined
    let requestHeaders: Headers | undefined
    let requests = 0

    using server = Bun.serve({
      port: 0,
      async fetch(input) {
        requests += 1
        requestURL = input.url
        requestHeaders = new Headers(input.headers)
        await modelsReady
        return Response.json({
          models: [
            {
              slug: "gpt-remote",
              display_name: "GPT Remote",
              visibility: "list",
              supported_reasoning_levels: [{ effort: "high" }],
              context_window: 300_000,
              input_modalities: ["text", "image"],
            },
            {
              slug: "gpt-hidden",
              display_name: "GPT Hidden",
              visibility: "hide",
            },
          ],
        })
      },
    })

    const hooks = await CodexAuthPlugin({} as never, {
      codexModelsEndpoint: new URL("/backend-api/codex/models", server.url).toString(),
    })
    let update: Record<string, any> | undefined
    const started = performance.now()
    const models = await hooks.provider!.models!(
      {
        id: "chatgpt",
        models: {
          "gpt-5.4": {
            id: "gpt-5.4",
            providerID: "chatgpt",
            name: "GPT-5.4",
            api: { id: "gpt-5.4", url: "https://api.openai.com/v1", npm: "@ai-sdk/openai" },
            capabilities: {
              reasoning: true,
              input: { text: true, image: false },
            },
            cost: { input: 1, output: 1, cache: { read: 1, write: 1 } },
            limit: { context: 100_000, output: 10_000 },
          },
        },
      } as never,
      {
        auth: {
          type: "oauth",
          refresh: "refresh",
          access: "access",
          expires: Date.now() + 60_000,
          accountId: "account",
        } as never,
        update(models) {
          update = models
        },
      },
    )

    expect(performance.now() - started).toBeLessThan(100)
    expect(models["gpt-5.4"]).toBeDefined()
    expect(update).toBeUndefined()

    releaseModels!()
    await waitFor(() => update !== undefined)

    expect(new URL(requestURL!).searchParams.get("client_version")).toBeString()
    expect(requestHeaders!.get("authorization")).toBe("Bearer access")
    expect(requestHeaders!.get("ChatGPT-Account-Id")).toBe("account")
    expect(Object.keys(update!)).toEqual(["gpt-remote"])
    expect(update!["gpt-remote"]).toMatchObject({
      id: "gpt-remote",
      name: "GPT Remote",
      api: { id: "gpt-remote" },
      capabilities: {
        reasoning: true,
        input: { image: true },
      },
      cost: { input: 0, output: 0, cache: { read: 0, write: 0 } },
      limit: { context: 300_000 },
    })

    const cached = await hooks.provider!.models!(
      {
        id: "chatgpt",
        models: {
          "gpt-5.4": models["gpt-5.4"],
        },
      } as never,
      {
        auth: {
          type: "oauth",
          refresh: "refresh",
          access: "access",
          expires: Date.now() + 60_000,
          accountId: "account",
        } as never,
      },
    )
    expect(requests).toBe(1)
    expect(Object.keys(cached)).toEqual(["gpt-remote"])
  })

  test("deduplicates concurrent Codex token refreshes", async () => {
    let auth = {
      type: "oauth" as const,
      refresh: "refresh-old",
      access: "",
      expires: 0,
    }
    const authUpdates: Array<{
      body: { refresh: string; access: string; expires: number; accountId?: string }
    }> = []
    let resolveRefresh: (() => void) | undefined
    const refreshReady = new Promise<void>((resolve) => {
      resolveRefresh = resolve
    })
    let refreshRequests = 0
    const apiRequests: { authorization: string | null; accountId: string | null }[] = []

    using server = Bun.serve({
      port: 0,
      async fetch(request) {
        const url = new URL(request.url)
        if (url.pathname === "/oauth/token") {
          expect(await request.text()).toContain("refresh_token=refresh-old")
          refreshRequests += 1
          await refreshReady
          return Response.json({
            id_token: createTestJwt({ chatgpt_account_id: "acc-123" }),
            access_token: "access-new",
            refresh_token: "refresh-new",
            expires_in: 3600,
          })
        }

        if (url.pathname === "/backend-api/codex/responses") {
          apiRequests.push({
            authorization: request.headers.get("authorization"),
            accountId: request.headers.get("ChatGPT-Account-Id"),
          })
          return new Response("{}", { status: 200 })
        }

        return new Response("unexpected request", { status: 500 })
      },
    })

    const hooks = await CodexAuthPlugin(
      {
        client: {
          auth: {
            async set(input: { body: { refresh: string; access: string; expires: number; accountId?: string } }) {
              authUpdates.push(input)
              auth = {
                type: "oauth",
                refresh: input.body.refresh,
                access: input.body.access,
                expires: input.body.expires,
                ...(input.body.accountId && { accountId: input.body.accountId }),
              }
            },
          },
        } as never,
        project: {} as never,
        directory: "",
        worktree: "",
        experimental_workspace: {
          register() {},
        },
        serverUrl: new URL("https://example.com"),
        $: {} as never,
      },
      {
        issuer: server.url.origin,
        codexApiEndpoint: new URL("/backend-api/codex/responses", server.url).toString(),
      },
    )
    const loaded = await hooks.auth!.loader!(async () => auth as never, {} as never)

    const first = loaded.fetch!("https://api.openai.com/v1/responses")
    const second = loaded.fetch!("https://api.openai.com/v1/responses")

    await waitFor(() => refreshRequests === 1)
    expect(apiRequests).toHaveLength(0)

    resolveRefresh!()
    await Promise.all([first, second])

    expect(refreshRequests).toBe(1)
    expect(authUpdates).toHaveLength(1)
    expect(authUpdates[0]?.body.refresh).toBe("refresh-new")
    expect(authUpdates[0]?.body.access).toBe("access-new")
    expect(authUpdates[0]?.body.accountId).toBe("acc-123")
    expect(apiRequests).toEqual([
      { authorization: "Bearer access-new", accountId: "acc-123" },
      { authorization: "Bearer access-new", accountId: "acc-123" },
    ])
  })
})

async function waitFor(predicate: () => boolean) {
  const started = Date.now()
  while (!predicate()) {
    if (Date.now() - started > 1_000) throw new Error("timed out waiting for condition")
    await new Promise((resolve) => setTimeout(resolve, 1))
  }
}
