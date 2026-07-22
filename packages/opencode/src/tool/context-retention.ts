import type { JSONSchema7 } from "@ai-sdk/provider"

export const PARAMETER = "retain_context"
// Stored inside the existing tool/text metadata JSON so the optimization does
// not delete transcript data or require a database migration.
export const METADATA = "opencode.context.retain"
export const OMITTED_RESULT = "[Tool result omitted after use]"

const property = {
  type: "boolean" as const,
  default: true,
  description: "Keep this call and result in later model context. Defaults to true.",
}

const supported = new Set([
  "apply_patch",
  "bash",
  "edit",
  "execute",
  "firecrawl",
  "glob",
  "grep",
  "lsp",
  "read",
  "skill",
  "task",
  "todowrite",
  "webfetch",
  "websearch",
  "write",
])

export function supports(tool: string) {
  return supported.has(tool)
}

export function withParameter(schema: JSONSchema7): JSONSchema7 {
  return {
    ...schema,
    type: "object",
    properties: {
      ...schema.properties,
      [PARAMETER]: property,
    },
  }
}

export function shouldRetain(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return true
  return (input as Record<string, unknown>)[PARAMETER] !== false
}

export function mark(metadata: Record<string, unknown> = {}) {
  return { ...metadata, [METADATA]: false }
}

export function isMarked(metadata: Record<string, unknown> | undefined) {
  return metadata?.[METADATA] === false
}

export function omittedInput() {
  return { [PARAMETER]: false }
}

export * as ToolContextRetention from "./context-retention"
