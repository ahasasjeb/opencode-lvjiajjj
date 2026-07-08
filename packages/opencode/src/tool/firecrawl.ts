import { ToolCredential } from "./credential"
import { Effect, Schema } from "effect"
import { HttpBody, HttpClient, HttpClientRequest, HttpClientResponse } from "effect/unstable/http"
import { Tool } from "./tool"
import DESCRIPTION from "./firecrawl.txt"

const API = "https://api.firecrawl.dev/v2"
const TIMEOUT = "120 seconds"

const JsonObject = Schema.Record(Schema.String, Schema.Unknown)

export const CreditUsage = Schema.Struct({
  remainingCredits: Schema.Finite,
  planCredits: Schema.Finite,
  billingPeriodStart: Schema.NullOr(Schema.String),
  billingPeriodEnd: Schema.NullOr(Schema.String),
}).annotate({ identifier: "FirecrawlCreditUsage" })

const CreditUsageResponse = Schema.Struct({
  success: Schema.Literal(true),
  data: CreditUsage,
})

export const Parameters = Schema.Struct({
  action: Schema.Literals(["scrape", "search", "crawl", "crawl_status"]).annotate({
    description: "Firecrawl operation to perform",
  }),
  url: Schema.optional(Schema.String).annotate({ description: "URL for scrape or crawl" }),
  query: Schema.optional(Schema.String).annotate({ description: "Search query for search" }),
  id: Schema.optional(Schema.String).annotate({ description: "Crawl job ID for crawl_status" }),
  format: Schema.Literals(["markdown", "html", "links", "summary"])
    .annotate({ description: "Content format for scrape and crawl. Defaults to markdown.", default: "markdown" })
    .pipe(Schema.withDecodingDefault(Effect.succeed("markdown" as const))),
  limit: Schema.optional(Schema.Int).annotate({ description: "Maximum search results or crawled pages" }),
  maxDiscoveryDepth: Schema.optional(Schema.Int).annotate({ description: "Maximum crawl link depth" }),
  onlyMainContent: Schema.optional(Schema.Boolean).annotate({
    description: "Extract only the main page content. Defaults to true.",
  }),
  waitFor: Schema.optional(Schema.Int).annotate({
    description:
      "Delay in milliseconds before fetching page content, allowing dynamic pages time to load. Omit to use Firecrawl's default of no extra wait.",
  }),
})

export const FirecrawlTool = Tool.define(
  "firecrawl",
  Effect.gen(function* () {
    const http = yield* HttpClient.HttpClient
    const credential = yield* ToolCredential.get("firecrawl").pipe(Effect.orDie)

    return {
      description: DESCRIPTION,
      parameters: Parameters,
      execute: (params: Schema.Schema.Type<typeof Parameters>, ctx: Tool.Context) =>
        Effect.gen(function* () {
          if (!credential) throw new Error("Firecrawl API key is not configured")

          const target =
            params.action === "search"
              ? requireValue(params.query, "query")
              : params.action === "crawl_status"
                ? requireValue(params.id, "id")
                : requireUrl(params.url)
          yield* ctx.ask({
            permission: params.action === "search" ? "websearch" : "webfetch",
            patterns: [target],
            always: ["*"],
            metadata: { action: params.action, url: params.url, query: params.query, id: params.id },
          })

          const result = yield* request(http, credential.key, params)
          return {
            title: title(params),
            output: output(params.action, result),
            metadata: {
              action: params.action,
              url: params.url,
              query: params.query,
              id: params.id,
              format: params.format,
              limit: params.limit,
              maxDiscoveryDepth: params.maxDiscoveryDepth,
              onlyMainContent: params.onlyMainContent,
              waitFor: scrapeWaitFor(params),
            },
          }
        }).pipe(Effect.orDie),
    }
  }),
)

export const creditUsage = Effect.fn("Firecrawl.creditUsage")(function* () {
  const credential = yield* ToolCredential.get("firecrawl")
  if (!credential) throw new Error("Firecrawl API key is not configured")
  const http = HttpClient.filterStatusOk(yield* HttpClient.HttpClient)
  const response = yield* http.execute(
    HttpClientRequest.get(`${API}/team/credit-usage`).pipe(
      HttpClientRequest.setHeader("Authorization", `Bearer ${credential.key}`),
    ),
  )
  return (yield* HttpClientResponse.schemaBodyJson(CreditUsageResponse)(response)).data
})

function request(http: HttpClient.HttpClient, key: string, params: Schema.Schema.Type<typeof Parameters>) {
  return Effect.gen(function* () {
    const endpoint = params.action === "crawl_status" ? `/crawl/${requireValue(params.id, "id")}` : `/${params.action}`
    const headers = {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    }
    // jsonUnsafe: Schema.Unknown encoding rejects undefined fields with HttpBodyError
    const request =
      params.action === "crawl_status"
        ? HttpClientRequest.get(`${API}${endpoint}`).pipe(HttpClientRequest.setHeaders(headers))
        : HttpClientRequest.post(`${API}${endpoint}`).pipe(
            HttpClientRequest.setHeaders(headers),
            HttpClientRequest.setBody(HttpBody.jsonUnsafe(body(params))),
          )
    const response = yield* HttpClient.filterStatusOk(http)
      .execute(request)
      .pipe(
        Effect.timeoutOrElse({ duration: TIMEOUT, orElse: () => Effect.die(new Error("Firecrawl request timed out")) }),
      )
    const result = yield* HttpClientResponse.schemaBodyJson(JsonObject)(response)
    if (result.success === false)
      throw new Error(typeof result.error === "string" ? result.error : "Firecrawl request failed")
    return result
  })
}

function body(params: Schema.Schema.Type<typeof Parameters>): Record<string, unknown> {
  const scrapeOptions = scrapeOptionsBody(params)
  if (params.action === "scrape") {
    const waitFor = scrapeWaitFor(params)
    return {
      url: requireUrl(params.url),
      formats: [params.format],
      onlyMainContent: params.onlyMainContent ?? true,
      ...(waitFor === undefined ? {} : { waitFor }),
    }
  }
  if (params.action === "search") {
    return {
      query: requireValue(params.query, "query"),
      limit: Math.max(1, Math.min(params.limit ?? 5, 100)),
      sources: ["web"],
      scrapeOptions,
    }
  }
  return {
    url: requireUrl(params.url),
    limit: Math.max(1, Math.min(params.limit ?? 20, 1000)),
    maxDiscoveryDepth: Math.max(0, Math.min(params.maxDiscoveryDepth ?? 2, 10)),
    allowExternalLinks: false,
    scrapeOptions,
  }
}

function scrapeWaitFor(params: Schema.Schema.Type<typeof Parameters>) {
  if (params.waitFor === undefined) return undefined
  return Math.max(0, Math.min(params.waitFor, 300_000))
}

function scrapeOptionsBody(params: Schema.Schema.Type<typeof Parameters>) {
  const waitFor = scrapeWaitFor(params)
  return {
    formats: [params.format],
    onlyMainContent: params.onlyMainContent ?? true,
    ...(waitFor === undefined ? {} : { waitFor }),
  }
}

function output(action: Schema.Schema.Type<typeof Parameters>["action"], result: Record<string, unknown>) {
  if (action !== "scrape") return JSON.stringify(result, null, 2)
  if (!isObject(result.data)) return JSON.stringify(result, null, 2)
  const data = result.data
  const content = ["markdown", "html", "summary"].map((key) => data[key]).find((value) => typeof value === "string")
  return typeof content === "string" ? content : JSON.stringify(data, null, 2)
}

function title(params: Schema.Schema.Type<typeof Parameters>) {
  if (params.action === "search") return `Firecrawl search: ${params.query}`
  if (params.action === "crawl_status") return `Firecrawl crawl: ${params.id}`
  return `Firecrawl ${params.action}: ${params.url}`
}

function requireValue(value: string | undefined, name: string) {
  if (value?.trim()) return value.trim()
  throw new Error(`Firecrawl ${name} is required for this action`)
}

function requireUrl(value: string | undefined) {
  const url = requireValue(value, "url")
  if (!URL.canParse(url)) throw new Error("Firecrawl url must be a valid URL")
  const protocol = new URL(url).protocol
  if (protocol !== "http:" && protocol !== "https:") throw new Error("Firecrawl url must use http or https")
  return url
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
