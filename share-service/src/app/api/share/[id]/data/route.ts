import { data } from "../../../../../lib/handlers"

export const runtime = "nodejs"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return data(request, (await context.params).id, false)
}
