import { create } from "../../../lib/handlers"

export const runtime = "nodejs"

export function POST(request: Request) {
  return create(request, false)
}
