import { NextResponse } from "next/server"
import { lineUserIdOf, recordOutboundMessage, saveUploadedImage } from "@/server/line-store"

const MAX_BYTES = 5 * 1024 * 1024

// Staff attach a photo in the Inbox (owner 2026-10-05). Saved next to the parents' LINE photos and served by
// /api/line/media/[id]. For a real LINE chat it is pushed as an image — LINE fetches the picture itself, so this only
// works when the app is reachable over https (production / a tunnel); otherwise it stays in our chat with a note.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const file = form?.get("file")
  const conversationId = String(form?.get("conversationId") ?? "")
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "ไม่พบไฟล์รูป" }, { status: 400 })
  if (!file.type.startsWith("image/")) return NextResponse.json({ ok: false, error: "ส่งได้เฉพาะไฟล์รูป" }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ ok: false, error: "รูปใหญ่เกิน 5 MB" }, { status: 400 })
  const mediaId = await saveUploadedImage(Buffer.from(await file.arrayBuffer()))

  const lineUserId = conversationId.startsWith("line_") ? lineUserIdOf(conversationId) : null
  if (!lineUserId) return NextResponse.json({ ok: true, mediaId, pushed: false })

  const origin = new URL(req.url).origin
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  let pushed = false, note: string | undefined
  if (!token) note = "ยังไม่ได้ตั้งค่า LINE"
  else if (!origin.startsWith("https://")) note = "รูปอยู่ในแชทของเราแล้ว — ส่งเข้า LINE จริงได้เมื่อระบบเปิดผ่าน https"
  else {
    const url = `${origin}/api/line/media/${mediaId}`
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: lineUserId, messages: [{ type: "image", originalContentUrl: url, previewImageUrl: url }] }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null)
    pushed = !!res?.ok
    if (!pushed) note = "ส่งรูปเข้า LINE ไม่สำเร็จ"
  }
  await recordOutboundMessage(lineUserId, "[รูปภาพ]", { kind: "image", meta: { formKind: "image", mediaId } })
  return NextResponse.json({ ok: true, mediaId, pushed, note })
}
