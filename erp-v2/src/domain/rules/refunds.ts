// Refunds (owner 2026-09-30). A paid invoice and its receipt never change — a Credit Note cancels part of it:
//  · refund → money goes back, recorded with the account it left from (so that statement line has a document)
//  · credit → no cash back, kept as credit for the same student + course and taken off their next invoice
// Maker–checker like invoices. The staff picks what to give back and how much, per item.

import type { CreditNote, CreditNoteItem, DateStr, ID, Invoice, Result, Staff } from "../types"
import { APPROVER_ROLES, paidAmount, type InvoiceTotals, type LineQuote } from "./billing"
import { requireForceRemark } from "./notifications"
import { inBranch } from "./permissions"

export const REFUND_REASONS = ["ลาออก / เลิกเรียน", "ย้ายสาขา", "เปลี่ยนคอร์ส", "คิดเงินผิด", "ป่วย / เหตุสุดวิสัย", "ไม่พอใจการเรียน"]

export const CREDIT_MODE_LABEL: Record<CreditNote["mode"], string> = { refund: "คืนเงิน", credit: "เก็บเป็นเครดิต" }

export const CREDIT_STATUS_LABEL: Record<CreditNote["status"], string> = { pending_approval: "รออนุมัติ", approved: "อนุมัติแล้ว", void: "ยกเลิก" }

/** What can be given back from this invoice, each with the most that can go back. Course lines are net of their
 *  promotion; money already given back on earlier Credit Notes is taken off. */
export function refundableItems(inv: Invoice, totals: InvoiceTotals, notes: CreditNote[]): (CreditNoteItem & { max: number })[] {
  const done = new Map<string, number>()
  notes.filter((n) => n.invoiceId === inv.id && n.status !== "void").flatMap((n) => n.items).forEach((i) => done.set(i.key, (done.get(i.key) ?? 0) + i.amount))
  const firstCourse = totals.lines[0]?.line.courseId
  const items: (CreditNoteItem & { max: number })[] = [
    ...totals.lines.map((l) => ({ key: `line:${l.line.id}`, label: l.course?.name ?? "คอร์ส", courseId: l.line.courseId, amount: 0, max: l.amount + l.courseFee - l.promotion })),
    { key: "bus", label: "ค่ารถ", courseId: firstCourse, amount: 0, max: totals.bus },
    { key: "busExtra", label: "ค่ารถเพิ่ม (รอบก่อน)", courseId: firstCourse, amount: 0, max: totals.busExtra },
    { key: "book", label: "ค่าหนังสือ", courseId: firstCourse, amount: 0, max: totals.book },
    ...inv.advance.map((a) => ({ key: `advance:${a.feeId}`, label: a.name, courseId: firstCourse, amount: 0, max: a.amount })),
  ]
  return items.map((i) => ({ ...i, max: Math.max(0, i.max - (done.get(i.key) ?? 0)) })).filter((i) => i.max > 0)
}

/** Suggested refund for a course when the student stops from `stopFrom`: the share of paid sessions not yet reached. */
export function unusedShare(l: LineQuote, stopFrom: DateStr): { unused: number; of: number; amount: number } {
  const slots = l.quote?.slots ?? []
  const unused = slots.filter((x) => x.date >= stopFrom).length
  const net = l.amount + l.courseFee - l.promotion
  return { unused, of: slots.length, amount: slots.length ? Math.round((net * unused) / slots.length) : 0 }
}

export function alreadyGivenBack(invoiceId: ID, notes: CreditNote[]) {
  return notes.filter((n) => n.invoiceId === invoiceId && n.status !== "void").flatMap((n) => n.items).reduce((a, i) => a + i.amount, 0)
}

export function validateCreditNote(cn: Pick<CreditNote, "mode" | "items" | "reasons" | "remark" | "invoiceId">, inv: Invoice, max: { key: string; max: number }[], notes: CreditNote[]): string | null {
  if (inv.status !== "paid") return "ทำใบลดหนี้ได้เฉพาะใบที่ชำระครบแล้ว"
  const items = cn.items.filter((i) => i.amount > 0)
  if (!items.length) return "เลือกรายการที่จะคืนอย่างน้อย 1 รายการ"
  for (const i of items) {
    const m = max.find((x) => x.key === i.key)
    if (!m) return `${i.label} คืนไม่ได้แล้ว`
    if (i.amount > m.max) return `${i.label} คืนได้ไม่เกิน ${m.max} บาท`
  }
  if (items.some((i) => i.amount < 0 || !Number.isFinite(i.amount))) return "จำนวนเงินไม่ถูกต้อง"
  const total = items.reduce((a, i) => a + i.amount, 0)
  if (total > paidAmount(inv) - alreadyGivenBack(inv.id, notes)) return "ยอดคืนเกินยอดที่ชำระ"
  if (!cn.reasons.length && !cn.remark.trim()) return "เลือกเหตุผล หรือพิมพ์เหตุผลเอง"
  if (cn.mode === "credit" && items.some((i) => !i.courseId)) return "ใบนี้ไม่มีคอร์สให้ผูกเครดิต — ใช้แบบคืนเงินแทน"
  return null
}

export const creditNoteTotal = (cn: Pick<CreditNote, "items">) => cn.items.reduce((a, i) => a + i.amount, 0)

/** maker–checker, same as invoices: another person with an approver role, own branch */
export function canApproveCreditNote(cn: CreditNote, user: Staff): Result {
  if (cn.status !== "pending_approval") return { ok: false, error: "ใบลดหนี้นี้ไม่ได้รออนุมัติ" }
  if (cn.createdBy === user.id) return { ok: false, error: "คนสร้างอนุมัติใบลดหนี้ของตัวเองไม่ได้ — ให้คนอื่นอนุมัติ" }
  if (!user.roles.some((r) => APPROVER_ROLES.includes(r))) return { ok: false, error: "บทบาทของคุณไม่มีสิทธิ์อนุมัติใบลดหนี้" }
  if (!inBranch(user, cn.branchId)) return { ok: false, error: "อนุมัติได้เฉพาะใบลดหนี้ของสาขาตัวเอง" }
  return { ok: true, value: undefined }
}

export function canForceApproveCreditNote(cn: CreditNote, user: Staff, remark: string): Result {
  const r = canApproveCreditNote(cn, user)
  if (r.ok) return { ok: false, error: "อนุมัติแบบปกติได้ — ไม่ต้อง Force" }
  if (cn.createdBy !== user.id) return r
  const rest = canApproveCreditNote({ ...cn, createdBy: "" }, user)
  if (!rest.ok) return rest
  const miss = requireForceRemark(remark)
  return miss ? { ok: false, error: miss } : { ok: true, value: undefined }
}

export function validateRefundRecord(cn: CreditNote, r: { fromAccount: string; date: DateStr; reference: string }): string | null {
  if (cn.mode !== "refund") return "ใบนี้เก็บเป็นเครดิต ไม่ต้องโอนคืน"
  if (cn.status !== "approved") return "ต้องอนุมัติใบลดหนี้ก่อนโอนคืน"
  if (cn.refund) return "บันทึกการโอนคืนไปแล้ว"
  if (!r.fromAccount.trim()) return "ระบุบัญชีที่โอนคืนออกไป (ไว้เทียบ Statement)"
  if (!r.date) return "ระบุวันที่โอนคืน"
  if (!r.reference.trim()) return "ใส่เลขอ้างอิง / หมายเหตุการโอน"
  return null
}

/** Course credit a student still has on a course: approved credit-mode notes minus what live invoices already used. */
export function availableCredit(studentId: ID, courseId: ID, notes: CreditNote[], invoices: Invoice[], exceptInvoiceId?: ID): { creditNoteId: ID; amount: number }[] {
  const used = new Map<ID, number>()
  invoices.filter((i) => i.id !== exceptInvoiceId && i.studentId === studentId && i.status !== "void")
    .flatMap((i) => i.creditsUsed ?? []).filter((u) => u.courseId === courseId)
    .forEach((u) => used.set(u.creditNoteId, (used.get(u.creditNoteId) ?? 0) + u.amount))
  return notes
    .filter((n) => n.studentId === studentId && n.mode === "credit" && n.status === "approved")
    .map((n) => ({ creditNoteId: n.id, amount: n.items.filter((i) => i.courseId === courseId).reduce((a, i) => a + i.amount, 0) - (used.get(n.id) ?? 0) }))
    .filter((x) => x.amount > 0)
}

/** Credit an invoice takes automatically: for each of its courses, the student's credit on that course, never more
 *  than that course's own charge. */
export function autoCredits(studentId: ID, lines: LineQuote[], notes: CreditNote[], invoices: Invoice[], exceptInvoiceId?: ID) {
  const out: { creditNoteId: ID; courseId: ID; amount: number }[] = []
  for (const courseId of [...new Set(lines.map((l) => l.line.courseId))]) {
    let room = lines.filter((l) => l.line.courseId === courseId).reduce((a, l) => a + l.amount + l.courseFee - l.promotion, 0)
    for (const c of availableCredit(studentId, courseId, notes, invoices, exceptInvoiceId)) {
      if (room <= 0) break
      const amount = Math.min(room, c.amount)
      out.push({ creditNoteId: c.creditNoteId, courseId, amount })
      room -= amount
    }
  }
  return out
}
