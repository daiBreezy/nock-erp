// Parent-facing LINE texts (E2E 2026-09-28: invoices, receipts and summaries used to be "sent" only as a flag —
// now they go out as real LINE messages). One builder per document so every screen sends the same words.

import { fmtDate, fmtMoney } from "../dates"
import type { Branch, Course, CourseSummary, Entitlement, Invoice, LessonSummary, Session, Student } from "../types"
import type { InvoiceTotals } from "./billing"

const bankLine = (b: Branch) =>
  b.bankAccount.number ? `โอนเข้า ${b.bankAccount.bank} ${b.bankAccount.number} (${b.bankAccount.name})` : "ชำระที่เคาน์เตอร์สาขา"

export function invoiceMessage(inv: Invoice, totals: InvoiceTotals, ctx: { student: Student; branch: Branch }): string {
  return [
    `📄 ใบแจ้งค่าเรียน ${inv.number ?? ""}`.trim(),
    `นักเรียน: ${ctx.student.nickname} (${ctx.student.name}) · ${ctx.student.grade}`,
    ...totals.lines.map((l) => (l.course && l.quote ? `${l.course.name} · ${fmtDate(l.quote.from)} – ${fmtDate(l.quote.to, { year: true })} · ${l.quote.sessions.length} คาบ` : null)),
    totals.bus ? `ค่ารถ ${fmtMoney(totals.bus)}` : null,
    totals.busExtra ? `ค่ารถเพิ่ม (รอบก่อน ${(inv.busExtras ?? []).map((x) => fmtDate(x.date)).join(", ")}) ${fmtMoney(totals.busExtra)}` : null,
    ...inv.advance.map((a) => `${a.name} ${fmtMoney(a.amount)}`),
    ...totals.lines.filter((l) => l.promotion).map((l) => `ส่วนลด ${l.promotionName ?? "โปรโมชัน"} -${fmtMoney(l.promotion)}`),
    totals.credit ? `หักเครดิตคอร์ส -${fmtMoney(totals.credit)}` : null,
    `ยอดชำระ ${fmtMoney(totals.total)}`,
    bankLine(ctx.branch),
    inv.noteToParent.trim() || null,
    "ชำระแล้วส่งรูปสลิปในแชทนี้ได้เลยค่ะ 🙏",
  ].filter(Boolean).join("\n")
}

export function receiptMessage(inv: Invoice, total: number, ctx: { student: Student; firstSession?: Pick<Session, "date" | "start"> }): string {
  return [
    `🧾 ใบเสร็จรับเงิน ${inv.receiptNumber ?? ""}`.trim(),
    `ได้รับชำระ ${fmtMoney(total)} สำหรับ ${inv.number} เรียบร้อยแล้วค่ะ`,
    `นักเรียน: ${ctx.student.nickname} (${ctx.student.name})`,
    ctx.firstSession ? `เริ่มเรียน ${fmtDate(ctx.firstSession.date, { weekday: true })} เวลา ${ctx.firstSession.start} น.` : null,
    "ขอบคุณค่ะ 😊",
  ].filter(Boolean).join("\n")
}

/** Parents get the whole lesson (owner 2026-09-30): Book, Topic, Lesson Detail and the per-session feedback. */
export function summaryMessage(sum: LessonSummary, ctx: { student: Student; session: Pick<Session, "subject" | "date" | "start">; book?: string; topic?: string }): string {
  return [
    `📝 สรุปการเรียน ${ctx.student.nickname} · ${ctx.session.subject}`,
    `${fmtDate(ctx.session.date, { weekday: true })} ${ctx.session.start} น.`,
    "",
    ctx.book ? `📚 หนังสือ: ${ctx.book}` : null,
    ctx.topic ? `📖 บทเรียน: ${ctx.topic}` : null,
    sum.detail?.trim() ? `📝 รายละเอียด: ${sum.detail.trim()}` : null,
    ctx.book || ctx.topic || sum.detail ? "" : null,
    sum.text.trim(),
  ].filter((x) => x !== null).join("\n")
}

/** The teacher's whole-course report, sent once per purchase round (owner 2026-10-06). */
export function courseSummaryMessage(cs: CourseSummary, ctx: { student: Student; course: Pick<Course, "name">; entitlement: Pick<Entitlement, "from" | "to"> }): string {
  return [
    `🎓 สรุปจบคอร์ส ${ctx.student.nickname} · ${ctx.course.name}`,
    `${fmtDate(ctx.entitlement.from)} – ${fmtDate(ctx.entitlement.to, { year: true })}`,
    "",
    `📈 ภาพรวมพัฒนาการ: ${cs.overallProgress.trim()}`,
    cs.strengths.trim() ? `✅ จุดแข็ง: ${cs.strengths.trim()}` : null,
    cs.toImprove.trim() ? `🎯 สิ่งที่ควรฝึกเพิ่ม: ${cs.toImprove.trim()}` : null,
  ].filter((x) => x !== null).join("\n")
}
