import { NextResponse } from "next/server"
import { activeAiConfig, callModel } from "@/server/ai-config"

// owner 2026-11-12: edit the Thai / Japanese LINE message → its English translation block follows. Uses the AI the owner
// configured in Settings (same as /api/ai/course-summary). Only the message text is sent — it is sample wording, no real data.
// Not configured → { ok: false, error } and the box keeps the old English until the AI is set up.

const SYSTEM = `You translate LINE messages that a tutoring school sends to parents.
Translate the user's message into natural, polite English.
Keep the line breaks, blank lines, emojis, numbers, amounts, dates, codes (such as INV-… / RC-…), names and {placeholders} exactly as they are.
Do not add explanations, notes or quotation marks. Output only the translated message.`

export async function POST(req: Request) {
  const c = await activeAiConfig()
  if (!c) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้งค่า AI (Settings › ระบบ)" })
  const b = (await req.json().catch(() => null)) as { text?: string; from?: "th" | "ja" } | null
  const text = b?.text?.slice(0, 4000) ?? ""
  if (!text.trim()) return NextResponse.json({ ok: false, error: "ไม่มีข้อความ" })
  const r = await callModel(c, SYSTEM, [{ role: "user", text: `Source language: ${b?.from === "ja" ? "Japanese" : "Thai"}\n\n${text}` }], false)
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error })
  return NextResponse.json({ ok: true, text: r.text.trim() })
}
