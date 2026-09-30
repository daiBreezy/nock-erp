// Billing rules: one pricing function feeds Create, Edit, Detail and PDF (BL-2, BL-3, BL-4).

import { addMonths, endOfMonth, fmtDate, monthKey, nextWeekday, addDays } from "../dates"
import type { AdvanceItem, Branch, BusLeg, Course, CourseLine, DateStr, Fee, Holiday, ID, Invoice, Klass, PriceUnit, Result, Role, Staff } from "../types"
import { purchaseOf } from "./course"
import { requireForceRemark } from "./notifications"
import { inBranch } from "./permissions"
import { isHoliday } from "./scheduling"
import { busRate } from "./settings"

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
  course: Pick<Course, "unit" | "duration" | "price">
  klass: Pick<Klass, "weekday" | "minutes" | "branchId">
  startDate: DateStr
  periods: number
  holidays: Holiday[]
}): Result<CourseQuote> {
  const { course, klass, startDate, holidays } = opts
  if (!Number.isInteger(opts.periods) || opts.periods < 1) return { ok: false, error: "จำนวนงวดต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป" } // BL-5

  const first = nextWeekday(startDate, klass.weekday)
  const sessions: DateStr[] = [], skipped: DateStr[] = []
  let to: DateStr

  if (course.unit === "month") {
    // months count from the first real session, not the typed start date (E2E 2026-09-28: start 28 Sep on a
    // Saturday class billed "September · 0 sessions · ฿0" because the first class was 3 Oct)
    to = endOfMonth(addMonths(first, opts.periods - 1))
    for (let d = first; d <= to; d = addDays(d, 7)) (isHoliday(d, klass.branchId, holidays) ? skipped : sessions).push(d)
    const months = Array.from({ length: opts.periods }, (_, i) => monthKey(addMonths(first, i)))
    const periods = months.map((m) => {
      const inMonth = sessions.filter((d) => monthKey(d) === m)
      const factor = prorateFactor(inMonth.length)
      return { month: m, sessions: inMonth, factor, amount: Math.round(course.price * factor) }
    })
    return ok(sessions, skipped, first, to, klass.minutes, periods)
  }

  // week packs: every session inside N weeks from the first session — any number of sessions (owner 2026-09-28)
  if (course.unit === "week") {
    to = addDays(first, course.duration * 7 * opts.periods - 1)
    for (let d = first; d <= to; d = addDays(d, 7)) (isHoliday(d, klass.branchId, holidays) ? skipped : sessions).push(d)
    return ok(sessions, skipped, first, to, klass.minutes, [{ month: monthKey(first), sessions, factor: opts.periods, amount: course.price * opts.periods }])
  }

  // hour packs: as many sessions as the hours cover at this class's real session length
  // (24 h at 2 h/session = 12 sessions, at 90 min = 16)
  const needed = Math.ceil((course.duration * 60 * opts.periods) / klass.minutes)
  let d = first
  while (sessions.length < needed) {
    ;(isHoliday(d, klass.branchId, holidays) ? skipped : sessions).push(d)
    d = addDays(d, 7)
  }
  to = sessions[sessions.length - 1] ?? first
  return ok(sessions, skipped, first, to, klass.minutes, [{ month: monthKey(first), sessions, factor: opts.periods, amount: course.price * opts.periods }])

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

/** Best active promotion for this package type whose minimum duration the purchase reaches */
export function bestPromotion(branch: Branch, purchase: { unit: PriceUnit; amount: number }, courseAmount: number, date: DateStr) {
  const eligible = (branch.promotions ?? []).filter(
    (p) => p.active && p.unit === purchase.unit && purchase.amount >= p.minDuration && (!p.from || p.from <= date) && (!p.to || date <= p.to),
  )
  const value = (p: (typeof eligible)[number]) => (p.type === "pct" ? Math.round((courseAmount * p.value) / 100) : Math.min(p.value, courseAmount))
  const best = eligible.sort((a, b) => value(b) - value(a))[0]
  return best ? { promotion: best, discount: value(best) } : null
}

/** One course line priced: the same quote feeds the editor, the invoice sheet, the PDF and enrolment on payment. */
export interface LineQuote {
  line: CourseLine
  course?: Course
  klass?: Klass
  quote: CourseQuote | null
  amount: number
  courseFee: number
  promotion: number
  promotionName?: string
}

export interface InvoiceTotals {
  course: number
  courseFee: number
  promotion: number
  bus: number
  book: number
  advance: number
  concession: number
  total: number
  lines: LineQuote[]
}

export function quoteLine(line: CourseLine, ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }, promotions = true): LineQuote {
  const course = ctx.courses.find((c) => c.id === line.courseId)
  const klass = ctx.classes.find((c) => c.id === line.classId)
  let quote: CourseQuote | null = null
  if (course && klass) {
    const r = quoteCourse({ course, klass, startDate: line.startDate, periods: line.periods, holidays: ctx.holidays })
    if (r.ok) quote = r.value
  }
  const amount = quote?.total ?? 0
  // each course gets its own best promotion (a promotion is per package type + duration)
  const promo = course && promotions ? bestPromotion(ctx.branch, purchaseOf(course, line.periods), amount, line.startDate) : null
  // course fee (equipment) is charged on top of the price on every purchase
  return { line, course, klass, quote, amount, courseFee: course?.courseFee ?? 0, promotion: promo?.discount ?? 0, promotionName: promo?.promotion.name }
}

export function invoiceTotals(inv: Invoice, ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }): InvoiceTotals {
  const lines = inv.lines.map((l) => quoteLine(l, ctx, inv.promotionId !== null))
  const sum = (f: (l: LineQuote) => number) => lines.reduce((a, l) => a + f(l), 0)
  const course = sum((l) => l.amount), courseFee = sum((l) => l.courseFee), promotion = sum((l) => l.promotion)
  const bus = busTotal(inv.bus, busRate(ctx.branch, inv.busFeeId))
  const advance = inv.advance.reduce((a, x) => a + x.amount, 0)
  const concession = inv.concession?.amount ?? 0
  const total = course + courseFee - promotion + bus + inv.bookFee + advance - concession
  return { course, courseFee, promotion, bus, book: inv.bookFee, advance, concession, total, lines }
}

/** Classes an invoice line can enrol into: this branch's active recurring classes that teach the course's subject
 *  in the same format (เดี่ยว/กลุ่ม) — classes linked to the course come first. */
export function classOptionsFor(course: Course | undefined, classes: Klass[], branchId: ID): Klass[] {
  if (!course) return []
  return classes
    .filter((k) => k.branchId === branchId && k.active && k.kind === "learning" && k.type === course.format && course.subjects.includes(k.subject))
    .sort((a, b) => Number(b.courseId === course.id) - Number(a.courseId === course.id) || a.weekday - b.weekday || a.start.localeCompare(b.start))
}

/** Advance Optional: the entry fee is charged once — waived automatically (Staging) when a paid invoice of this student
 *  had it, or the student already has a paid invoice at all (an enrolled student joined before). Returns that invoice
 *  so the editor can say where it was paid. */
export function entryFeePaidOn(studentId: ID, invoices: Invoice[], fees: Fee[], exceptInvoiceId?: ID): Invoice | undefined {
  const entry = new Set(fees.filter((f) => f.kind === "entry").map((f) => f.id))
  const paid = invoices.filter((i) => i.id !== exceptInvoiceId && i.studentId === studentId && i.status === "paid")
  return paid.find((i) => i.advance.some((a) => entry.has(a.feeId))) ?? paid[0]
}

/** Default Advance Optional items for a new invoice: every entry fee unless it was already paid — mock tests are opt-in. */
export function defaultAdvance(branch: Branch, studentId: ID, invoices: Invoice[]): AdvanceItem[] {
  if (!studentId || entryFeePaidOn(studentId, invoices, branch.fees)) return []
  return branch.fees.filter((f) => f.kind === "entry").map((f) => ({ feeId: f.id, name: f.name, amount: f.price }))
}

/** Every class date the invoice covers, once per day — bus legs follow these (two courses the same day = one trip). */
export function invoiceSessionDates(lines: LineQuote[]): DateStr[] {
  return [...new Set(lines.flatMap((l) => l.quote?.sessions ?? []))].sort()
}

// ---------- workflow rules ----------

/** owner 2026-09-26: every office role approves — but only for its own branch (Area Manager+ any branch) */
export const APPROVER_ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin"]

export function validateInvoiceDraft(inv: Invoice, totals: InvoiceTotals, opts: { lastAssessment?: DateStr | null } = {}): string[] {
  const errs: string[] = []
  if (!inv.lines.length && totals.total === 0) errs.push("ยังไม่มีรายการในใบแจ้งหนี้")
  const many = totals.lines.length > 1
  totals.lines.forEach((l, i) => {
    const tag = many ? `คอร์สที่ ${i + 1} (${l.course?.name ?? "—"}): ` : ""
    if (!l.line.classId) errs.push(`${tag}เลือกคลาสและวันเริ่มเรียน`)
    // Test → Trial → Invoice: paid classes start after the last test/trial, so a trial is never billed (owner 2026-09-28)
    if (l.quote && opts.lastAssessment && l.quote.from <= opts.lastAssessment)
      errs.push(`${tag}วันเริ่มเรียนต้องหลังวันสอบ/ทดลองเรียน (${fmtDate(opts.lastAssessment)}) — เลื่อนวันเริ่มเรียน`)
    if (l.line.classId && l.quote && l.quote.sessions.length === 0) errs.push(`${tag}ช่วงที่เลือกไม่มีคาบเรียนเลย (ติดวันหยุดทั้งหมด) — เลื่อนวันเริ่มหรือเพิ่มจำนวนงวด`)
    if (!Number.isInteger(l.line.periods) || l.line.periods < 1) errs.push(`${tag}จำนวนงวดต้องตั้งแต่ 1 ขึ้นไป`)
  })
  const keys = inv.lines.filter((l) => l.classId).map((l) => `${l.courseId}|${l.classId}`)
  if (new Set(keys).size < keys.length) errs.push("มีคอร์ส + คลาสเดียวกันซ้ำในใบนี้ — รวมเป็นรายการเดียวแล้วเพิ่มจำนวนงวด")
  if (inv.concession && inv.concession.amount > 0 && !inv.concession.remark.trim()) errs.push("ส่วนลดพิเศษ (Concession) ต้องใส่เหตุผล")
  if (inv.concession && inv.concession.amount < 0) errs.push("ส่วนลดติดลบไม่ได้")
  if (totals.total < 0) errs.push("ยอดรวมติดลบ")
  return errs
}

/** BL-8, BL-9: numbers are assigned at Generate, sequentially per branch + month, never on draft.
 *  Year is Buddhist Era, 2 digits (owner 2026-09-28): Sep 2026 → INV-THL-6909-0001 */
export function nextInvoiceNumber(prefix: "INV" | "RC", branch: Branch, date: DateStr, existing: (string | undefined | null)[]) {
  const ym = String((Number(date.slice(0, 4)) + 543) % 100).padStart(2, "0") + date.slice(5, 7)
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
  if (!inBranch(user, inv.branchId)) return { ok: false, error: "อนุมัติได้เฉพาะใบแจ้งหนี้ของสาขาตัวเอง" }
  return { ok: true, value: undefined }
}

/** Force Approve: the creator approves their own invoice — every other approval rule still applies. */
export function canForceApprove(inv: Invoice, user: Staff, remark: string): Result {
  const r = canApprove(inv, user)
  if (r.ok) return { ok: false, error: "อนุมัติแบบปกติได้ — ไม่ต้อง Force" }
  if (inv.createdBy !== user.id) return r // blocked for a reason Force does not bypass
  const rest = canApprove({ ...inv, createdBy: "" }, user)
  if (!rest.ok) return rest
  const miss = requireForceRemark(remark)
  return miss ? { ok: false, error: miss } : { ok: true, value: undefined }
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
export function canConfirmPayment(p: { recordedBy: ID; confirmedBy?: ID }, user: Staff, branchId: ID): Result {
  if (p.confirmedBy) return { ok: false, error: "ยืนยันแล้ว" }
  if (p.recordedBy === user.id) return { ok: false, error: "คนบันทึกยืนยันยอดเงินของตัวเองไม่ได้" }
  if (!user.roles.some((r) => APPROVER_ROLES.includes(r))) return { ok: false, error: "บทบาทของคุณยืนยันยอดเงินไม่ได้" }
  if (!inBranch(user, branchId)) return { ok: false, error: "ยืนยันยอดเงินได้เฉพาะสาขาตัวเอง" }
  return { ok: true, value: undefined }
}

/** Force: the recorder confirms their own payment — role and branch rules still apply. */
export function canForceConfirmPayment(p: { recordedBy: ID; confirmedBy?: ID }, user: Staff, branchId: ID, remark: string): Result {
  const r = canConfirmPayment(p, user, branchId)
  if (r.ok) return { ok: false, error: "ยืนยันแบบปกติได้ — ไม่ต้อง Force" }
  if (p.recordedBy !== user.id) return r
  const rest = canConfirmPayment({ ...p, recordedBy: "" }, user, branchId)
  if (!rest.ok) return rest
  const miss = requireForceRemark(remark)
  return miss ? { ok: false, error: miss } : { ok: true, value: undefined }
}

export const INVOICE_STATUS_LABEL: Record<Invoice["status"], string> = {
  draft: "ร่าง",
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  sent: "ส่งแล้ว · รอชำระ",
  paid: "ชำระครบ",
  void: "ยกเลิก",
}
