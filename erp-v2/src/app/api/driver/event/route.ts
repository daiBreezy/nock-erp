import { NextResponse } from "next/server"
import { addEvent } from "@/server/driver-store"

// driver side: start / a stop done or no-show / undo / finish — only on a trip that belongs to the link's driver
export async function POST(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { t?: string; tripId?: string; type?: string; stopKey?: string }
  const types = ["start", "done", "noshow", "finish", "undo"]
  if (!b.t || !b.tripId || !b.type || !types.includes(b.type)) return NextResponse.json({ ok: false, error: "bad" }, { status: 400 })
  const r = await addEvent(b.t, { tripId: b.tripId, type: b.type as "start", stopKey: b.stopKey })
  if (r === "forbidden") return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 })
  return NextResponse.json({ ok: true })
}
