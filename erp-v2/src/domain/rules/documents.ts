// Paper documents (owner template "INV + REC.xlsx", 2026-09-30): the invoice and its receipt are the same layout,
// issued by the parent company, same number on both. One builder for the lines so the PDF, the accounting export and
// the totals never disagree (the lines always add up to invoiceTotals().total).

import { endOfMonth, fmtDate, fmtMonth } from "../dates"
import type { Branch, Course, CreditNote, DateStr, Family, Invoice, Klass, SpecialPeriod, Staff, Student } from "../types"
import { packageLabel } from "./course"
import { busRate } from "./settings"
import type { InvoiceTotals } from "./billing"

/**
 * Owner 2026-10-13: which Memo an invoice / receipt prints. A course made for a special period (Course.periodId,
 * or a class of that period on the line) prints the period's own Memo instead of the brand Memo — decided by the
 * course, not by the invoice date, so an invoice issued before Summer starts still carries Summer's Memo.
 * Several periods on one invoice → each period's Memo once. No period Memo → the brand Memo.
 */
export function invoiceMemo(inv: Pick<Invoice, "lines">, ctx: { brandMemo: string; branch: Pick<Branch, "specialPeriods">; courses: Pick<Course, "id" | "periodId">[]; classes: Pick<Klass, "id" | "periodId">[] }): { memo: string; periods: Pick<SpecialPeriod, "id" | "name">[] } {
  const ids = new Set<string>()
  for (const l of inv.lines) {
    const c = ctx.courses.find((x) => x.id === l.courseId)
    if (c?.periodId) ids.add(c.periodId)
    for (const k of ctx.classes.filter((x) => l.classIds.includes(x.id))) if (k.periodId) ids.add(k.periodId)
  }
  const periods = ctx.branch.specialPeriods.filter((p) => ids.has(p.id) && p.invoiceMemo?.trim())
  return periods.length ? { memo: periods.map((p) => p.invoiceMemo!.trim()).join("\n"), periods } : { memo: ctx.brandMemo, periods: [] }
}

export interface DocItem {
  description: string
  qty: number
  unitPrice: number
  amount: number
}

// owner Row 36 (2026-10-28): a Liclass document prints in Japanese (its parents are 100% Japanese), NockAcademy in
// Thai. English stays as the second line on the paper. This lives here, not in the screen translator — printed
// documents carry their own language by brand (see i18n-coverage SKIP list).
export type DocLang = "th" | "ja"
export const docLang = (brand: Branch["brand"]): DocLang => (brand === "liclass" ? "ja" : "th")

/** the fixed words inside an invoice line (course name, dates, counts stay as-is) */
const ITEM_TERMS: Record<DocLang, { course: string; sessions: string; trips: string; courseFee: string; promo: string; bus: string; busExtra: string; book: string; special: string; creditDeduction: string; rounding: string }> = {
  th: { course: "ค่าคอร์ส", sessions: "คาบ", trips: "เที่ยว", courseFee: "Course fee (ค่าอุปกรณ์)", promo: "ส่วนลดโปรโมชัน", bus: "ค่ารถรับส่ง", busExtra: "ค่ารถเพิ่ม (รอบก่อน)", book: "ค่าหนังสือ", special: "ส่วนลดพิเศษ", creditDeduction: "หักเครดิตคอร์ส (จากใบลดหนี้)", rounding: "ปัดเศษ" },
  ja: { course: "コース料金 ", sessions: "回", trips: "便", courseFee: "教材費", promo: "プロモーション割引", bus: "送迎バス代", busExtra: "追加バス代（前回分）", book: "書籍代", special: "特別割引", creditDeduction: "コースクレジット控除（クレジットノートより）", rounding: "端数調整" },
}

/** the labels on the printed paper (primary line) — English is the second line, added by the print page */
export const DOC_LABELS: Record<DocLang, {
  invoice: string; receipt: string; creditNote: string
  customerName: string; address: string; taxId: string
  item: string; description: string; qty: string; unitPrice: string; amount: string
  payChannel: string; bank: string; accountNo: string; accountName: string
  refund: string; subTotal: string; vat: string; total: string
  payeeBy: string; preparedBy: string; authorized: string; date: string; invRef: string
}> = {
  th: {
    invoice: "ใบแจ้งหนี้", receipt: "ใบเสร็จรับเงิน", creditNote: "ใบลดหนี้",
    customerName: "ชื่อลูกค้า", address: "ที่อยู่", taxId: "เลขประจำตัวผู้เสียภาษี",
    item: "ลำดับ", description: "รายการ", qty: "จำนวน", unitPrice: "ราคาต่อหน่วย", amount: "จำนวนเงิน (บาท)",
    payChannel: "ช่องทางชำระเงิน", bank: "ธนาคาร", accountNo: "เลขที่บัญชี", accountName: "ชื่อบัญชี",
    refund: "โอนคืน", subTotal: "รวมราคา", vat: "ภาษีมูลค่าเพิ่ม 7%", total: "จำนวนเงินรวมทั้งสิ้น",
    payeeBy: "ผู้รับเงิน", preparedBy: "ผู้จัดทำ", authorized: "ผู้มีอำนาจ", date: "วันที่", invRef: "อ้างอิงใบแจ้งหนี้",
  },
  ja: {
    invoice: "請求書", receipt: "領収書", creditNote: "クレジットノート",
    customerName: "顧客名", address: "住所", taxId: "納税者番号",
    item: "項目", description: "内容", qty: "数量", unitPrice: "単価", amount: "金額（バーツ）",
    payChannel: "お支払い方法", bank: "銀行", accountNo: "口座番号", accountName: "口座名義",
    refund: "返金", subTotal: "小計", vat: "消費税 7%", total: "合計",
    payeeBy: "受領者", preparedBy: "作成者", authorized: "承認者", date: "日付", invRef: "請求書番号",
  },
}

export function invoiceItems(inv: Invoice, totals: InvoiceTotals, branch: Branch): DocItem[] {
  const items: DocItem[] = []
  const t = ITEM_TERMS[docLang(branch.brand)]
  const one = (description: string, amount: number) => amount && items.push({ description, qty: 1, unitPrice: amount, amount })
  for (const l of totals.lines) {
    if (!l.course || !l.quote) continue
    const classes = l.klasses.map((k) => k.name).join(" + ")
    if (l.course.unit === "month") {
      // one row per month — pro-rated months have their own price
      for (const p of l.quote.periods) one(`${t.course}${l.course.name} · ${fmtMonth(p.month + "-01")} (${p.sessions.length} ${t.sessions}${p.factor < 1 ? ` · ${Math.round(p.factor * 100)}%` : ""}) · ${classes}`, p.amount)
    } else {
      items.push({
        description: `${t.course}${l.course.name} · ${packageLabel(l.course)} · ${fmtDate(l.quote.from)} – ${fmtDate(l.quote.to, { year: true })} (${l.quote.slots.length} ${t.sessions}) · ${classes}`,
        qty: l.line.periods, unitPrice: l.course.price, amount: l.amount,
      })
    }
    one(`${t.courseFee} · ${l.course.name}`, l.courseFee)
    one(`${t.promo}${l.promotionName ? ` · ${l.promotionName}` : ""}`, -l.promotion)
  }
  const legs = inv.bus.reduce((a, x) => a + Number(x.pickup) + Number(x.dropoff), 0)
  if (totals.bus) {
    const fee = branch.fees.find((f) => f.id === inv.busFeeId)
    items.push({ description: `${t.bus}${fee ? ` · ${fee.name}` : ""} (${legs} ${t.trips})`, qty: legs, unitPrice: busRate(branch, inv.busFeeId), amount: totals.bus })
  }
  if (totals.busExtra) one(`${t.busExtra} · ${(inv.busExtras ?? []).map((x) => fmtDate(x.date)).join(", ")}`, totals.busExtra)
  one(t.book, totals.book)
  for (const a of inv.advance) one(a.name, a.amount)
  one(`${t.special}${inv.concession?.remark ? ` · ${inv.concession.remark}` : ""}`, -totals.concession)
  one(t.creditDeduction, -totals.credit)
  one(t.rounding, totals.rounding) // owner Row 34: Liclass round-up shown as its own line so the rows still add up
  return items
}

export function creditNoteItems(cn: CreditNote, brand: Branch["brand"] = "nockacademy"): DocItem[] {
  const refund = docLang(brand) === "ja" ? "返金: " : "คืน"
  return cn.items.map((i) => ({ description: `${refund}${i.label}`, qty: 1, unitPrice: i.amount, amount: i.amount }))
}

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

// ---------- Sales Tax Report (owner file "Sales Tax report.xlsx") ----------

export const BUSINESS_LABEL: Record<Branch["brand"], string> = { nockacademy: "NockAcademy", liclass: "Liclass" }

export interface SalesTaxRow {
  date: DateStr
  number: string
  customer: string
  amount: number
  business: Branch["brand"]
  branchId: string
  /** credit notes: the invoice they reduce */
  ref?: string
}

/**
 * One month of the report, for the whole company (Liclass Education issues every document — owner 2026-09-30):
 * every invoice paid in the month on the day the money came in, plus approved credit notes as negative rows in the
 * month they were issued (referring to the invoice they reduce). Sorted like the bank statement: by date, then number.
 */
export function salesTaxRows(month: string, ctx: {
  invoices: Invoice[]; creditNotes: CreditNote[]; students: Pick<Student, "id" | "name" | "familyId">[]; families: Pick<Family, "id" | "taxInfo" | "address" | "postcode">[]
  branches: Pick<Branch, "id" | "brand">[]; totalOf: (inv: Invoice) => number
}): SalesTaxRow[] {
  const who = (studentId: string) => {
    const stu = ctx.students.find((s) => s.id === studentId)
    return stu ? customerOf(stu, ctx.families.find((f) => f.id === stu.familyId)).name : "—"
  }
  const brand = (branchId: string) => ctx.branches.find((b) => b.id === branchId)?.brand ?? "nockacademy"
  const paid = ctx.invoices
    .filter((i) => i.status === "paid" && i.number)
    .map((i) => ({ i, date: receiptDate(i) }))
    .filter((x): x is { i: Invoice; date: DateStr } => !!x.date && x.date.startsWith(month))
    .map(({ i, date }) => ({ date, number: i.number!, customer: who(i.studentId), amount: ctx.totalOf(i), business: brand(i.branchId), branchId: i.branchId }))
  const credits = ctx.creditNotes
    .filter((n) => n.status === "approved" && n.createdAt.slice(0, 7) === month)
    .map((n) => ({ date: n.createdAt.slice(0, 10), number: n.number, customer: who(n.studentId), amount: -n.items.reduce((a, x) => a + x.amount, 0), business: brand(n.branchId), branchId: n.branchId, ref: ctx.invoices.find((i) => i.id === n.invoiceId)?.number ?? undefined }))
  return [...paid, ...credits].sort((a, b) => a.date.localeCompare(b.date) || a.number.localeCompare(b.number))
}

/** Totals per business line at the foot of each month (the owner's sheet sums Liclass / NA separately). */
export function salesTaxTotals(rows: SalesTaxRow[]) {
  const by = new Map<Branch["brand"], number>()
  rows.forEach((r) => by.set(r.business, (by.get(r.business) ?? 0) + r.amount))
  return { total: rows.reduce((a, r) => a + r.amount, 0), byBusiness: [...by.entries()].map(([business, amount]) => ({ business, amount })) }
}
