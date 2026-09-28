import { NextResponse } from "next/server"
import { readLineImage } from "@/server/line-store"

// Serves a photo a parent sent in LINE (stored by the webhook) to the Inbox and the pay-slip attach flow.
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const data = await readLineImage(id)
  if (!data) return NextResponse.json({ ok: false, error: "ไม่พบรูป" }, { status: 404 })
  return new NextResponse(new Uint8Array(data), { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=3600" } })
}
