import { createShare, deleteShare, getShare, syncPayloads } from "./db"
import { authorizeOrg, createID, hashSecret, jsonError, parsePayloads, readShare, secretMatches } from "./share"

export async function create(request: Request, org: boolean) {
  const orgID = request.headers.get("x-org-id")
  if (org && !authorizeOrg(request)) return jsonError("Valid Bearer authorization and x-org-id are required", 401)
  const body = (await request.json().catch(() => undefined)) as { sessionID?: unknown } | undefined
  if (typeof body?.sessionID !== "string" || !body.sessionID) return jsonError("sessionID is required", 400)

  const id = createID("shr")
  const secret = createID("sec")
  await createShare({
    id,
    sessionID: body.sessionID,
    secretHash: await hashSecret(secret),
    orgID: org ? (orgID ?? undefined) : undefined,
  })

  return Response.json(
    {
      id,
      url: `${process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || new URL(request.url).origin}/share/${id}`,
      secret,
    },
    { status: 201 },
  )
}

export async function sync(request: Request, id: string, org: boolean) {
  const share = await getShare(id)
  if (!share) return jsonError("Share not found", 404)
  if (org && !authorizeOrg(request, share.org_id)) return jsonError("Unauthorized", 401)
  const body = (await request.json().catch(() => undefined)) as { secret?: unknown; data?: unknown } | undefined
  if (typeof body?.secret !== "string" || !(await secretMatches(body.secret, share.secret_hash)))
    return jsonError("Invalid share secret", 403)
  const payloads = parsePayloads(body.data)
  if (!payloads) return jsonError("data must contain valid share payloads", 400)
  await syncPayloads(id, payloads)
  return Response.json({ ok: true, synced: payloads.length })
}

export async function remove(request: Request, id: string, org: boolean) {
  const share = await getShare(id)
  if (!share) return jsonError("Share not found", 404)
  if (org && !authorizeOrg(request, share.org_id)) return jsonError("Unauthorized", 401)
  const body = (await request.json().catch(() => undefined)) as { secret?: unknown } | undefined
  if (typeof body?.secret !== "string" || !(await secretMatches(body.secret, share.secret_hash)))
    return jsonError("Invalid share secret", 403)
  await deleteShare(id)
  return new Response(null, { status: 204 })
}

export async function data(request: Request, id: string, org: boolean) {
  const result = await readShare(id)
  if (!result) return jsonError("Share not found", 404)
  if (org && !authorizeOrg(request, result.share.org_id)) return jsonError("Unauthorized", 401)
  return Response.json(result.payloads, { headers: { "Cache-Control": "no-store" } })
}
