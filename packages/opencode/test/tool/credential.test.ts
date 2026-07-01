import { afterEach, describe, expect, test } from "bun:test"
import { Effect, Layer } from "effect"
import { Auth } from "../../src/auth"
import { ToolCredential } from "../../src/tool/credential"

const original = process.env.FIRECRAWL_API_KEY

afterEach(() => {
  if (original === undefined) {
    delete process.env.FIRECRAWL_API_KEY
    return
  }
  process.env.FIRECRAWL_API_KEY = original
})

describe("tool credentials", () => {
  test("uses global storage when the environment variable is absent", async () => {
    delete process.env.FIRECRAWL_API_KEY
    const result = await Effect.runPromise(
      ToolCredential.get("firecrawl").pipe(
        Effect.provide(
          Layer.mock(Auth.Service)({
            get: () => Effect.succeed({ type: "api", key: "stored-key" }),
          }),
        ),
      ),
    )

    expect(result).toEqual({ key: "stored-key", source: "stored" })
  })

  test("prefers the environment variable over global storage", async () => {
    process.env.FIRECRAWL_API_KEY = "environment-key"
    const result = await Effect.runPromise(
      ToolCredential.get("firecrawl").pipe(
        Effect.provide(
          Layer.mock(Auth.Service)({
            get: () => Effect.die("stored credentials should not be read"),
          }),
        ),
      ),
    )

    expect(result).toEqual({ key: "environment-key", source: "environment" })
  })

  test("reports an unconfigured credential in the extensible status list", async () => {
    delete process.env.FIRECRAWL_API_KEY
    const result = await Effect.runPromise(
      ToolCredential.list().pipe(
        Effect.provide(
          Layer.mock(Auth.Service)({
            get: () => Effect.succeed(undefined),
          }),
        ),
      ),
    )

    expect(result).toEqual([
      {
        id: "firecrawl",
        env: "FIRECRAWL_API_KEY",
        configured: false,
        source: undefined,
      },
    ])
  })
})
