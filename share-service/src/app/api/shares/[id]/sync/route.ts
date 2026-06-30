import { sync } from "../../../../../lib/handlers"

export const runtime = "nodejs"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return sync(request, (await context.params).id, true)
}
