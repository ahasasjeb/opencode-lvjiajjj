import { getStats } from "../../../lib/db"

export const runtime = "nodejs"

export async function GET() {
  const stats = await getStats()
  return Response.json({ ok: true, database: "connected", ...stats })
}
