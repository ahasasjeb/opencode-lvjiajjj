import { timingSafeEqual } from "node:crypto"
import { getPayloads, getShare } from "./db"
import { isObject, JsonValue, PayloadType, payloadTypes, SharePayload, ShareView } from "./types"

export function createID(prefix: "shr" | "sec") {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`
}

export async function hashSecret(secret: string) {
  return Buffer.from(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))).toString("hex")
}

export async function secretMatches(secret: string, hash: string) {
  const candidate = Buffer.from(await hashSecret(secret))
  const expected = Buffer.from(hash)
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function parsePayloads(value: unknown) {
  if (!Array.isArray(value)) return

  const parsed = value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return
    const payload = item as { type?: unknown; data?: unknown }
    if (!payloadTypes.includes(payload.type as SharePayload["type"])) return
    if (payload.data === undefined) return

    const type = payload.type as PayloadType
    const data = payload.data as JsonValue
    if (type === "session") return { type, data, key: "session" }
    if (type === "session_diff") return { type, data, key: "session_diff" }
    if (type === "model") return { type, data, key: "model" }
    if (!isObject(data) || typeof data.id !== "string") return
    if (type === "message") return { type, data, key: `message/${data.id}` }
    if (typeof data.messageID !== "string") return
    return { type, data, key: `part/${data.messageID}/${data.id}` }
  })

  if (parsed.some((item) => !item)) return
  return parsed.filter((item) => !!item)
}

export async function readShare(id: string) {
  const share = await getShare(id)
  if (!share) return
  return {
    share,
    payloads: (await getPayloads(id)).map((row) => ({ type: row.type, data: row.content_json })),
  }
}

export async function buildShareView(id: string): Promise<ShareView | undefined> {
  const result = await readShare(id)
  if (!result) return

  const info = result.payloads.find((payload) => payload.type === "session")?.data
  const messages = Object.fromEntries(
    result.payloads.flatMap((payload) => {
      if (payload.type !== "message" || !isObject(payload.data) || typeof payload.data.id !== "string") return []
      return [[payload.data.id, { ...payload.data, parts: [] as Record<string, JsonValue>[] }] as const]
    }),
  )

  result.payloads
    .filter((payload) => payload.type === "part" && isObject(payload.data))
    .forEach((payload) => {
      if (!isObject(payload.data) || typeof payload.data.messageID !== "string") return
      messages[payload.data.messageID]?.parts.push(payload.data)
    })

  return {
    info: isObject(info) ? info : {},
    messages,
    diff: (result.payloads.find((payload) => payload.type === "session_diff")?.data as JsonValue[]) ?? [],
    models: (result.payloads.find((payload) => payload.type === "model")?.data as JsonValue[]) ?? [],
    updatedAt: result.share.updated_at.toISOString(),
  }
}

export function authorizeOrg(request: Request, orgID?: string | null) {
  const authorization = request.headers.get("authorization")
  const requestedOrg = request.headers.get("x-org-id")
  if (!authorization?.startsWith("Bearer ") || !requestedOrg) return false
  if (orgID && requestedOrg !== orgID) return false
  if (!process.env.ORG_BEARER_TOKEN) return true
  return authorization.slice(7) === process.env.ORG_BEARER_TOKEN
}

export function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status })
}
