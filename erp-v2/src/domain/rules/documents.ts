// Paper documents (owner template "INV + REC.xlsx", 2026-09-30): the invoice and its receipt are the same layout,
// issued by the parent company, same number on both. One builder for the lines so the PDF, the accounting export and
// the totals never disagree (the lines always add up to invoiceTotals().total).

import { endOfMonth, fmtDate, fmtMonth } from "../dates"
import type { Branch, CreditNote, DateStr, Family, Invoice, Staff, Student } from "../types"
import { packageLabel } from "./course"
import { busRate } from "./settings"
import type { InvoiceTotals } from "./billing"

export interface DocItem {
  description: string
  qty: number
  unitPrice: number
  amount: number
}

export function invoiceItems(inv: Invoice, totals: InvoiceTotals, branch: Branch): DocItem[] {
  const items: DocItem[] = []
  const one = (description: string, amount: number) => amount && items.push({ description, qty: 1, unitPrice: amount, amount })
  for (const l of totals.lines) {
    if (!l.course || !l.quote) continue
    const classes = l.klasses.map((k) => k.name).join(" + ")
    if (l.course.unit === "month") {
      // one row per month — pro-rated months have their own price
      for (const p of l.quote.periods) one(`ค่าคอร์ส${l.course.name} · ${fmtMonth(p.month + "-01")} (${p.sessions.length} คาบ${p.factor < 1 ? ` · ${Math.round(p.factor * 100)}%` : ""}) · ${classes}`, p.amount)
    } else {
      items.push({
        description: `ค่าคอร์ส${l.course.name} · ${packageLabel(l.course)} · ${fmtDate(l.quote.from)} – ${fmtDate(l.quote.to, { year: true })} (${l.quote.slots.length} คาบ) · ${classes}`,
        qty: l.line.periods, unitPrice: l.course.price, amount: l.amount,
      })
    }
    one(`Course fee (ค่าอุปกรณ์) · ${l.course.name}`, l.courseFee)
    one(`ส่วนลดโปรโมชัน${l.promotionName ? ` · ${l.promotionName}` : ""}`, -l.promotion)
  }
  const legs = inv.bus.reduce((a, x) => a + Number(x.pickup) + Number(x.dropoff), 0)
  if (totals.bus) {
    const fee = branch.fees.find((f) => f.id === inv.busFeeId)
    items.push({ description: `ค่ารถรับส่ง${fee ? ` · ${fee.name}` : ""} (${legs} เที่ยว)`, qty: legs, unitPrice: busRate(branch, inv.busFeeId), amount: totals.bus })
  }
  if (totals.busExtra) one(`ค่ารถเพิ่ม (รอบก่อน) · ${(inv.busExtras ?? []).map((x) => fmtDate(x.date)).join(", ")}`, totals.busExtra)
  one("ค่าหนังสือ", totals.book)
  for (const a of inv.advance) one(a.name, a.amount)
  one(`ส่วนลดพิเศษ${inv.concession?.remark ? ` · ${inv.concession.remark}` : ""}`, -totals.concession)
  one("หักเครดิตคอร์ส (จากใบลดหนี้)", -totals.credit)
  return items
}

export function creditNoteItems(cn: CreditNote): DocItem[] {
  return cn.items.map((i) => ({ description: `คืน${i.label}`, qty: 1, unitPrice: i.amount, amount: i.amount }))
}

/** VAT line: shown as 7% = 0 like the paper template (tuition is not charged VAT) */
export const VAT_RATE_LABEL = "ภาษีมูลค่าเพิ่ม 7% / VAT 7%"

export interface DocParty {
  name: string
  address: string
  taxId: string
}

/** Customer on the paper: the student's full name, or the family's tax details when the parent asked for them. */
export function customerOf(student: Pick<Student, "name">, family?: Pick<Family, "taxInfo" | "address" | "postcode">): DocParty {
  const t = family?.taxInfo
  if (t?.customerName) return { name: t.customerName, address: t.address, taxId: t.taxId }
  return { name: student.name, address: [family?.address, family?.postcode].filter(Boolean).join(" "), taxId: "" }
}

/** Invoice date = the day it was created (the number is issued then); due at the end of that month (template). */
export function invoiceDates(inv: Pick<Invoice, "createdAt">): { date: DateStr; dueBy: DateStr } {
  const date = inv.createdAt.slice(0, 10)
  return { date, dueBy: endOfMonth(date) }
}

/** Receipt date = the day the money came in (last confirmed payment). */
export function receiptDate(inv: Pick<Invoice, "payments">): DateStr | null {
  const paid = inv.payments.filter((p) => p.confirmedBy).map((p) => p.recordedAt.slice(0, 10)).sort()
  return paid[paid.length - 1] ?? null
}

/** "ผู้จัดทำ" and "ผู้มีอำนาจ" are both the admin who created the invoice (owner 2026-09-30). */
export const preparedBy = (inv: Pick<Invoice, "createdBy">, staff: Pick<Staff, "id" | "name" | "nickname">[]) => {
  const s = staff.find((x) => x.id === inv.createdBy)
  return s ? `${s.name} (${s.nickname})` : "—"
}

/** File name like the template: "<number> <customer name>" */
export const documentFileName = (number: string, customer: string) => `${number} ${customer}`.replace(/[\\/:*?"<>|]/g, "").trim()
