export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }

export const payloadTypes = ["session", "message", "part", "session_diff", "model"] as const
export type PayloadType = (typeof payloadTypes)[number]

export type SharePayload = {
  type: PayloadType
  data: JsonValue
}

export type ShareView = {
  info: Record<string, JsonValue>
  messages: Record<string, Record<string, JsonValue> & { parts: Record<string, JsonValue>[] }>
  diff: JsonValue[]
  models: JsonValue[]
  updatedAt: string
}

export function isObject(value: JsonValue | undefined): value is Record<string, JsonValue> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}
