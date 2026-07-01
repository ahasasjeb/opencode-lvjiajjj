import { Auth } from "@/auth"
import { Effect, Schema } from "effect"

export const ID = Schema.Literal("firecrawl")
export type ID = typeof ID.Type

export const Source = Schema.Literals(["environment", "stored"])
export type Source = typeof Source.Type

export const Status = Schema.Struct({
  id: ID,
  env: Schema.String,
  configured: Schema.Boolean,
  source: Schema.optional(Source),
}).annotate({ identifier: "ToolCredentialStatus" })
export type Status = typeof Status.Type

const definitions = [{ id: "firecrawl", env: "FIRECRAWL_API_KEY" }] as const

export const list = Effect.fn("ToolCredential.list")(function* () {
  return yield* Effect.forEach(definitions, (definition) =>
    get(definition.id).pipe(
      Effect.map((value) => ({
        ...definition,
        configured: value !== undefined,
        source: value?.source,
      })),
    ),
  )
})

export const get = Effect.fn("ToolCredential.get")(function* (id: ID) {
  const definition = definitions.find((item) => item.id === id)
  if (!definition) return

  const environment = process.env[definition.env]?.trim()
  if (environment) return { key: environment, source: "environment" as const }

  const auth = yield* Auth.Service
  const stored = yield* auth.get(id)
  if (stored?.type !== "api" || !stored.key.trim()) return
  return { key: stored.key.trim(), source: "stored" as const }
})

export * as ToolCredential from "./credential"
