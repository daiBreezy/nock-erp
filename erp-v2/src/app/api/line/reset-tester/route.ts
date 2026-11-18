import { NextResponse } from "next/server"
import { clearChat, lineUserIdOf } from "@/server/line-store"
import { removeLinks } from "@/server/line-links"

// staff only (the Demo panel): turn a LINE account back into a brand-new visitor so a test can start from zero —
// forget its family link, and (optionally) its chat history. The real system does this in Dev's database.
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { conversationId?: string; clearChat?: boolean }
  const lineUserId = b.conversationId ? lineUserIdOf(b.conversationId) : null
  if (!b.conversationId || !lineUserId) return NextResponse.json({ ok: false, error: "ต้องเป็นแชท LINE จริง" }, { status: 400 })
  const unlinked = await removeLinks(lineUserId)
  const cleared = b.clearChat ? await clearChat(b.conversationId) : 0
  return NextResponse.json({ ok: true, unlinked, cleared })
}
