import { NextResponse } from "next/server"
import { getCatalogToken, upsertEnrollToken } from "@/server/parent-form-store"
import { recordInboundMessage } from "@/server/line-store"
import { classWhen, requestText } from "@/domain/rules/catalog"

// Parent page (owner 2026-10-22): a button in the catalog.
// "interest" / "trial" → a card in the admin's chat (needs the parent's LINE id — the page is opened in LINE).
// "enroll" → a one-time enroll link offering just that class; the page opens it.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { token?: string; action?: "interest" | "trial" | "enroll"; classId?: string; courseId?: string; lineUserId?: string; displayName?: string }
  if (!body.token || !body.action || (!body.classId && !body.courseId)) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 })
  const check = await getCatalogToken(body.token)
  if (!check.ok) return NextResponse.json(check)
  const t = check.token
  const course = t.courses.find((c) => c.id === body.courseId)
  // a course with no class yet: "สนใจ" only — the admin finds a time with the family
  if (!body.classId) {
    if (!course || body.action !== "interest") return NextResponse.json({ ok: false, error: "invalid" })
    if (!body.lineUserId) return NextResponse.json({ ok: false, error: "line" })
    await recordInboundMessage(body.lineUserId, body.displayName ?? null, `📚 สนใจคอร์ส: ${course.name}`, {
      meta: { formKind: "catalog_request", action: "interest", classId: "", courseId: course.id, className: course.name, subjects: course.subjects, when: "ยังไม่มีรอบเรียน" },
    })
    return NextResponse.json({ ok: true })
  }
  const k = t.classes.find((c) => c.id === body.classId)
  if (!k) return NextResponse.json({ ok: false, error: "ไม่พบคลาสนี้แล้ว — ลองเปิดใหม่อีกครั้ง" })
  if (body.action === "enroll") {
    const e = await upsertEnrollToken({
      reusable: false, branchId: t.branchId, branchName: t.branchName, brand: t.brand, lang: t.lang, grades: t.grades, subjects: t.subjects, subjectNames: t.subjectNames,
      courses: t.courses.map((c) => ({ id: c.id, name: c.name, subjects: c.subjects, grades: c.grades, unit: c.unit, duration: c.duration, price: c.price })),
      classOffers: [k], conversationId: body.lineUserId ? `line_${body.lineUserId}` : null,
    })
    return NextResponse.json({ ok: true, url: `/liff/form?token=${encodeURIComponent(e.token)}` })
  }
  if (!body.lineUserId) return NextResponse.json({ ok: false, error: "line" })
  await recordInboundMessage(body.lineUserId, body.displayName ?? null, requestText(body.action, k, course), {
    meta: { formKind: "catalog_request", action: body.action, classId: k.id, courseId: course?.id, className: k.name, subjects: k.subjects, when: classWhen(k) },
  })
  return NextResponse.json({ ok: true })
}
