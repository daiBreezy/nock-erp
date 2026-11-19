// Credit Course (owner 2026-11-19): the admin adds a course straight to a student so they study now, and the invoice is made
// and chased later. The package (Entitlement) exists from day one with `credit` set and no invoice; it stays "credit" until
// the invoice that picks it up is paid. Pure functions — the store and the UI both read the state from here.

import { daysBetween } from "../dates"
import type { DateStr, Entitlement, ID, Invoice, Result } from "../types"

/** open = nobody has invoiced it yet · invoiced = on a live invoice that isn't paid · settled = paid (no longer credit) */
export type CreditState = "open" | "invoiced" | "settled"

/** the live (not void) invoice that carries this credit course, if any */
export const invoiceOfCredit = (e: Pick<Entitlement, "id">, invoices: Pick<Invoice, "id" | "status" | "lines" | "number">[]) =>
  invoices.find((i) => i.status !== "void" && i.lines.some((l) => l.creditId === e.id))

export function creditState(e: Pick<Entitlement, "id" | "invoiceId" | "credit">, invoices: Pick<Invoice, "id" | "status" | "lines" | "number">[]): CreditState | null {
  if (!e.credit) return null
  if (e.invoiceId) return "settled"
  return invoiceOfCredit(e, invoices) ? "invoiced" : "open"
}

/** a student's credit courses that still owe money (open + invoiced), oldest first */
export function creditsOwed(studentId: ID, ents: Entitlement[], invoices: Pick<Invoice, "id" | "status" | "lines" | "number">[]) {
  return ents
    .filter((e) => e.studentId === studentId && creditState(e, invoices) !== null && creditState(e, invoices) !== "settled")
    .sort((a, b) => a.credit!.at.localeCompare(b.credit!.at))
}

/** what an invoice can pick up: credits nobody has invoiced, plus the ones already on THIS invoice */
export const creditsAvailable = (studentId: ID, ents: Entitlement[], invoices: Pick<Invoice, "id" | "status" | "lines" | "number">[], exceptInvoiceId?: ID) =>
  creditsOwed(studentId, ents, invoices).filter((e) => {
    const on = invoiceOfCredit(e, invoices)
    return !on || on.id === exceptInvoiceId
  })

/** total tuition still owed on a student's credit courses */
export const creditOwedTotal = (list: Entitlement[]) => list.reduce((a, e) => a + (e.credit?.amount ?? 0), 0)

/** days since the credit was added */
export const creditAgeDays = (e: Pick<Entitlement, "credit">, today: DateStr) => (e.credit ? Math.max(0, daysBetween(e.credit.at.slice(0, 10), today)) : 0)

/** credit courses older than `days` and still not invoiced/paid — what the branch is reminded about */
export const creditsOverdue = (ents: Entitlement[], invoices: Pick<Invoice, "id" | "status" | "lines" | "number">[], today: DateStr, days: number) =>
  ents.filter((e) => { const st = creditState(e, invoices); return (st === "open" || st === "invoiced") && creditAgeDays(e, today) >= days })

/** the system-wide switch (Settings › System › การเงิน) — off by default */
export const creditCourseOn = (settings: { creditCourse?: boolean } | undefined) => settings?.creditCourse === true

/** default "remind after N days" (owner 2026-11-19: warn only, never lock studying) */
export const CREDIT_REMIND_DAYS = 14

export function validateCreditCourse(i: { courseId: ID; classIds: ID[]; periods: number; reason: string }): Result {
  if (!i.courseId) return { ok: false, error: "เลือกคอร์ส" }
  if (!i.classIds.length) return { ok: false, error: "เลือกคลาสอย่างน้อย 1 คลาส" }
  if (!Number.isInteger(i.periods) || i.periods < 1) return { ok: false, error: "จำนวนงวดต้องตั้งแต่ 1 ขึ้นไป" }
  if (!i.reason.trim()) return { ok: false, error: "ใส่เหตุผลที่ให้เรียนก่อนจ่าย" }
  return { ok: true, value: undefined }
}
