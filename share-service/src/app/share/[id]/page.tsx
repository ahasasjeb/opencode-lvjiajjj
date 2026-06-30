import { notFound } from "next/navigation"
import { buildShareView } from "../../../lib/share"
import { SessionView } from "./session-view"

export const dynamic = "force-dynamic"

export default async function SharePage({ params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id
  const initial = await buildShareView(id)
  if (!initial) notFound()
  return <SessionView id={id} initial={initial} />
}
