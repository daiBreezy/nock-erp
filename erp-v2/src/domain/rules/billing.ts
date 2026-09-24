// Billing rules: one pricing function feeds Create, Edit, Detail and PDF (BL-2, BL-3, BL-4).

import { addMonths, endOfMonth, monthKey, nextWeekday, addDays } from "../dates"
import type { Branch, BusLeg, Course, DateStr, Holiday, ID, Invoice, Klass, Package, Result, Role, Staff } from "../types"
import { isHoliday } from "./scheduling"

/** Dev rule: monthly price by sessions left in the month — 3+ = 100%, 2 = 60%, 1 = 30%. */
export function prorateFactor(sessionsInMonth: number) {
  if (sessionsInMonth >= 3) return 1
  if (sessionsInMonth === 2) return 0.6
  if (sessionsInMonth === 1) return 0.3
  return 0
}

export interface PeriodLine {
  month: string // YYYY-MM
  sessions: DateStr[]
  factor: number
  amount: number
}

export interface CourseQuote {
  sessions: DateStr[]
  /** dates skipped because of holidays */
  skipped: DateStr[]
  from: DateStr
  to: DateStr
  hours: number
  periods: PeriodLine[]
  total: number
}

export function quoteCourse(opts: {
  pkg: Package
  klass: Pick<Klass, "weekday" | "minutes" | "branchId">
  startDate: DateStr
  periods: number
  holidays: Holiday[]
}): Result<CourseQuote> {
  const { pkg, klass, startDate, holidays } = opts
  if (!Number.isInteger(opts.periods) || opts.periods < 1) return { ok: false, error: "จำนวนงวดต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป" } // BL-5

  const first = nextWeekday(startDate, klass.weekday)
  const sessions: DateStr[] = [], skipped: DateStr[] = []
  let to: DateStr

  if (pkg.unit === "month") {
    to = endOfMonth(addMonths(startDate, opts.periods - 1))
    for (let d = first; d <= to; d = addDays(d, 7)) (isHoliday(d, klass.branchId, holidays) ? skipped : sessions).push(d)
    const months = Array.from({ length: opts.periods }, (_, i) => monthKey(addMonths(startDate, i)))
    const periods = months.map((m) => {
      const inMonth = sessions.filter((d) => monthKey(d) === m)
      const factor = prorateFactor(inMonth.length)
      return { month: m, sessions: inMonth, factor, amount: Math.round(pkg.price * factor) }
    })
    return ok(sessions, skipped, first, to, klass.minutes, periods)
  }

  // hour packs: as many sessions as the hours cover, per period
  const needed = Math.ceil(((pkg.hours ?? 0) * 60 * opts.periods) / klass.minutes)
  let d = first
  while (sessions.length < needed) {
    ;(isHoliday(d, klass.branchId, holidays) ? skipped : sessions).push(d)
    d = addDays(d, 7)
  }
  to = sessions[sessions.length - 1] ?? first
  return ok(sessions, skipped, first, to, klass.minutes, [{ month: monthKey(first), sessions, factor: opts.periods, amount: pkg.price * opts.periods }])

  function ok(s: DateStr[], sk: DateStr[], from: DateStr, until: DateStr, minutes: number, periods: PeriodLine[]): Result<CourseQuote> {
    return {
      ok: true,
      value: {
        sessions: s,
        skipped: sk,
        from,
        to: until,
        hours: (s.length * minutes) / 60, // BL-2: hours from real sessions × real duration
        periods,
        total: periods.reduce((a, p) => a + p.amount, 0),
      },
    }
  }
}

/** BL-6: bus legs start unticked unless the student profile says they ride the bus. */
export function defaultBusLegs(sessions: DateStr[], usesBus: boolean): BusLeg[] {
  return sessions.map((date) => ({ date, pickup: usesBus, dropoff: usesBus }))
}

export function busTotal(legs: BusLeg[], perLeg: number) {
  return legs.reduce((a, l) => a + (l.pickup ? perLeg : 0) + (l.dropoff ? perLeg : 0), 0)
}

export interface InvoiceTotals {
  course: number
  bus: number
  book: number
  advance: number
  concession: number
  total: number
  quote: CourseQuote | null
}

export function invoiceTotals(inv: Invoice, ctx: { branch: Branch; courses: Course[]; packages: Package[]; classes: Klass[]; holidays: Holiday[] }): InvoiceTotals {
  let quote: CourseQuote | null = null
  if (inv.course) {
    const course = ctx.courses.find((c) => c.id === inv.course!.courseId)
    const pkg = ctx.packages.find((p) => p.id === course?.packageId)
    const k = ctx.classes.find((c) => c.id === inv.course!.classId)
    if (pkg && k) {
      const r = quoteCourse({ pkg, klass: k, startDate: inv.course.startDate, periods: inv.course.periods, holidays: ctx.holidays })
      if (r.ok) quote = r.value
    }
  }
  const course = quote?.total ?? 0
  const bus = busTotal(inv.bus, ctx.branch.busFeePerLeg)
  const concession = inv.concession?.amount ?? 0
  const total = course + bus + inv.bookFee + inv.advanceFee - concession
  return { course, bus, book: inv.bookFee, advance: inv.advanceFee, concession, total, quote }
}

// ---------- workflow rules ----------

export const APPROVER_ROLES: Role[] = ["director", "manager", "admin"]

export function validateInvoiceDraft(inv: Invoice, totals: InvoiceTotals): string[] {
  const errs: string[] = []
  if (!inv.course && totals.total === 0) errs.push("ยังไม่มีรายการในใบแจ้งหนี้")
  if (inv.course && !inv.course.classId) errs.push("เลือกคลาสและวันเริ่มเรียน")
  if (inv.course && (!Number.isInteger(inv.course.periods) || inv.course.periods < 1)) errs.push("จำนวนงวดต้องตั้งแต่ 1 ขึ้นไป")
  if (inv.concession && inv.concession.amount > 0 && !inv.concession.remark.trim()) errs.push("ส่วนลดพิเศษ (Concession) ต้องใส่เหตุผล")
  if (inv.concession && inv.concession.amount < 0) errs.push("ส่วนลดติดลบไม่ได้")
  if (totals.total < 0) errs.push("ยอดรวมติดลบ")
  return errs
}

/** BL-8, BL-9: numbers are assigned at Generate, sequentially per branch + month, never on draft. */
export function nextInvoiceNumber(prefix: "INV" | "RC", branch: Branch, date: DateStr, existing: (string | undefined | null)[]) {
  const ym = date.slice(2, 4) + date.slice(5, 7)
  const head = `${prefix}-${branch.code}-${ym}-`
  const max = existing.filter((n): n is string => !!n && n.startsWith(head)).reduce((m, n) => Math.max(m, Number(n.slice(head.length))), 0)
  return head + String(max + 1).padStart(4, "0")
}

/** BL-14: approver must be a different person with an approver role. */
export function canApprove(inv: Invoice, user: Staff): Result {
  if (inv.status !== "pending_approval") return { ok: false, error: "ใบนี้ไม่ได้อยู่ในสถานะรออนุมัติ" }
  if (inv.pdf !== "ready") return { ok: false, error: "PDF ยังไม่พร้อม" }
  if (inv.createdBy === user.id) return { ok: false, error: "คนสร้างใบอนุมัติใบของตัวเองไม่ได้ — ให้คนอื่นอนุมัติ" }
  if (!user.roles.some((r) => APPROVER_ROLES.includes(r))) return { ok: false, error: "บทบาทของคุณไม่มีสิทธิ์อนุมัติใบแจ้งหนี้" }
  return { ok: true, value: undefined }
}

export function canSend(inv: Invoice): Result {
  if (inv.status !== "approved" && inv.status !== "sent") return { ok: false, error: "ต้องอนุมัติ PDF ก่อนส่ง" }
  if (!inv.noteToParent.trim()) return { ok: false, error: "กรอกข้อความถึงผู้ปกครองก่อนส่ง" } // BL-16
  return { ok: true, value: undefined }
}

export function canVoid(inv: Invoice, reason: string): Result {
  if (inv.status === "void") return { ok: false, error: "ใบนี้ถูกยกเลิกแล้ว" }
  if (inv.payments.length) return { ok: false, error: "มีการชำระเงินแล้ว ยกเลิกไม่ได้ — ใช้การคืนเงิน/ลดหนี้แทน" }
  if (!reason.trim()) return { ok: false, error: "กรอกเหตุผลการยกเลิก" } // BL-7
  return { ok: true, value: undefined }
}

export function paidAmount(inv: Invoice, confirmedOnly = true) {
  return inv.payments.filter((p) => !confirmedOnly || p.confirmedBy).reduce((a, p) => a + p.amount, 0)
}

export function canRecordPayment(inv: Invoice, amount: number, total: number): Result {
  if (!["approved", "sent"].includes(inv.status)) return { ok: false, error: "ต้องอนุมัติใบแจ้งหนี้ก่อนรับเงิน" }
  if (!(amount > 0)) return { ok: false, error: "จำนวนเงินต้องมากกว่า 0" }
  const pending = inv.payments.reduce((a, p) => a + p.amount, 0)
  if (pending + amount > total) return { ok: false, error: `ยอดเกิน — ค้างชำระ ${total - pending} บาท` }
  return { ok: true, value: undefined }
}

/** BL-18: the person who recorded a payment cannot confirm it. */
export function canConfirmPayment(p: { recordedBy: ID; confirmedBy?: ID }, user: Staff): Result {
  if (p.confirmedBy) return { ok: false, error: "ยืนยันแล้ว" }
  if (p.recordedBy === user.id) return { ok: false, error: "คนบันทึกยืนยันยอดเงินของตัวเองไม่ได้" }
  if (!user.roles.some((r) => APPROVER_ROLES.includes(r))) return { ok: false, error: "บทบาทของคุณยืนยันยอดเงินไม่ได้" }
  return { ok: true, value: undefined }
}

export const INVOICE_STATUS_LABEL: Record<Invoice["status"], string> = {
  draft: "ร่าง",
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  sent: "ส่งแล้ว · รอชำระ",
  paid: "ชำระครบ",
  void: "ยกเลิก",
}
