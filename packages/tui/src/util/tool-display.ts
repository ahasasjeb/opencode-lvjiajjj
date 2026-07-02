export function webSearchProviderLabel(provider: unknown) {
  if (provider === "parallel") return "Parallel Web Search"
  if (provider === "exa") return "Exa Web Search"
  return "Web Search"
}

export function toolDisplayMetadata(state: unknown): Record<string, unknown> {
  if (!state || typeof state !== "object" || Array.isArray(state)) return {}
  if (!("status" in state) || state.status === "pending") return {}
  if (!("structured" in state) || !state.structured || typeof state.structured !== "object") return {}
  if (Array.isArray(state.structured)) return {}
  return state.structured as Record<string, unknown>
}

export function formatFirecrawlTarget(input: Record<string, unknown>) {
  const action = typeof input.action === "string" ? input.action : "scrape"
  if (action === "search") return typeof input.query === "string" ? input.query : undefined
  if (action === "crawl_status") return typeof input.id === "string" ? input.id : undefined
  return typeof input.url === "string" ? input.url : undefined
}

export function formatFirecrawlParams(input: Record<string, unknown>, omit = ["action", "url", "query", "id"]) {
  const primitives = Object.entries(input).filter(([key, value]) => {
    if (omit.includes(key)) return false
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
  })
  if (primitives.length === 0) return ""
  return `[${primitives.map(([key, value]) => `${key}=${value}`).join(", ")}]`
}

export function formatFirecrawlLabel(input: Record<string, unknown>) {
  const action = typeof input.action === "string" ? input.action : "scrape"
  const target = formatFirecrawlTarget(input)
  const params = formatFirecrawlParams(input)
  return `${action}${target ? ` ${target}` : ""}${params ? ` ${params}` : ""}`
}
