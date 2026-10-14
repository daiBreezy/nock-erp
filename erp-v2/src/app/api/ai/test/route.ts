import { NextResponse } from "next/server"
import { activeAiConfig, callModel } from "@/server/ai-config"

/** "ทดสอบการเชื่อมต่อ" — one tiny call to the model that is set now */
export async function POST() {
  const c = await activeAiConfig()
  if (!c) return NextResponse.json({ ok: false, error: "ยังไม่ได้ตั้งค่า AI" })
  const t0 = Date.now()
  const r = await callModel(c, "ตอบเป็น JSON เท่านั้น", [{ role: "user", text: 'ตอบ {"ok": true}' }])
  return NextResponse.json(r.ok ? { ok: true, provider: c.provider, model: c.model, ms: Date.now() - t0 } : { ok: false, error: r.error })
}
