import { remove } from "../../../../lib/handlers"

export const runtime = "nodejs"

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return remove(request, (await context.params).id, true)
}
