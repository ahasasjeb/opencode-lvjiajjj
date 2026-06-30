import { buildShareView, jsonError } from "../../lib/share"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")
  if (!id) return jsonError("id is required", 400)
  const view = await buildShareView(id)
  if (!view) return jsonError("Share not found", 404)
  return Response.json(view, { headers: { "Cache-Control": "no-store" } })
}
