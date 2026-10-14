import { NextResponse } from "next/server"
import { activeAiConfig, callModel } from "@/server/ai-config"

// "Generate Summary" with a real model (owner 2026-10-14: "ยังไม่เห็น การประเมินจาก AI จะเข้าไปช่วยอะไรเลย").
// Gets only the course, subjects and the per-session numbers + notes — no student name leaves the ERP.
// Not configured → { ok: false, notConfigured } and the card falls back to the rules-based draft.

interface Body {
  course: string
  subjects: string[]
  bundle: boolean
  rows: { date: string; attended: string | null; level?: number; text?: string }[]
}

const SYSTEM = `คุณเป็นผู้ช่วยครูของสถาบันกวดวิชา เขียน Course Summary ส่งผู้ปกครอง จากสรุปรายคาบ คะแนนความเข้าใจ (1–5) และการเข้าเรียน
ภาษาไทย สุภาพ กระชับ เป็นรูปธรรม อ้างอิงข้อมูลจริงเท่านั้น ห้ามแต่งเรื่อง
ถ้าเป็น Bundle (หลายวิชา) ให้แยกบรรทัดตามวิชา ขึ้นต้นด้วย "ชื่อวิชา: " ในแต่ละช่อง
ตอบเป็น JSON เท่านั้น: {"overallProgress": string, "toImprove": string, "strengths": string,
"insights": [{"tone": "good"|"watch"|"info", "text": string}]}  — insights 3–4 ข้อ สั้น ข้อละ 1 ประโยค (พัฒนาการ, การเข้าเรียน, เรื่องที่ควรเน้นต่อ)
แต่ละช่องไม่เกิน 500 ตัวอักษร`

export async function POST(req: Request) {
  const c = await activeAiConfig()
  if (!c) return NextResponse.json({ ok: false, notConfigured: true, error: "ยังไม่ได้ตั้งค่า AI" })
  const b = (await req.json()) as Body
  const lines = b.rows.slice(-60).map((r) => `${r.date} · ${r.attended ?? "ยังไม่เช็ค"}${r.level ? ` · เข้าใจ ${r.level}/5` : ""}${r.text ? ` · ${r.text}` : ""}`)
  const prompt = `คอร์ส: ${b.course}${b.bundle ? " (Bundle)" : ""}\nวิชา: ${b.subjects.join(", ")}\nรายคาบ (เก่า → ใหม่):\n${lines.join("\n")}`
  const r = await callModel(c, SYSTEM, [{ role: "user", text: prompt }])
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error })
  try {
    const j = JSON.parse(r.text.replace(/^```(?:json)?\s*|\s*```$/g, ""))
    const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 500) : "")
    const insights = Array.isArray(j.insights)
      ? j.insights.filter((x: { text?: unknown }) => typeof x?.text === "string").slice(0, 5)
        .map((x: { tone?: string; text: string }) => ({ tone: x.tone === "good" || x.tone === "watch" ? x.tone : "info", text: x.text }))
      : []
    return NextResponse.json({ ok: true, overallProgress: s(j.overallProgress), toImprove: s(j.toImprove), strengths: s(j.strengths), insights, model: c.model })
  } catch {
    return NextResponse.json({ ok: false, error: "AI ตอบกลับไม่เป็นรูปแบบที่อ่านได้" })
  }
}
