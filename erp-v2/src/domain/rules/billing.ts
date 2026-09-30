// Billing rules: one pricing function feeds Create, Edit, Detail and PDF (BL-2, BL-3, BL-4).

import { addMonths, endOfMonth, fmtDate, monthKey, nextWeekday, addDays, weekdayOf } from "../dates"
import type { AdvanceItem, Branch, BusAddOn, Entitlement, Leftover, Student, Weekday, BusLeg, Course, CourseLine, DateStr, Fee, Holiday, ID, Invoice, Klass, PriceUnit, Result, Role, Staff } from "../types"
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
  /** monthly packs: the weeks with class in this month (week keys) — the pro-rate counts weeks, not sessions */
  weeks?: DateStr[]
  factor: number
  amount: number
}

/** One real class meeting the package pays for. */
export interface QuoteSlot {
  date: DateStr
  classId: ID
  start: string
  minutes: number
}

export interface CourseQuote {
  /** one date per class meeting (two classes the same day = the date twice) */
  sessions: DateStr[]
  slots: QuoteSlot[]
  /** dates skipped because of holidays */
  skipped: DateStr[]
  from: DateStr
  to: DateStr
  hours: number
  periods: PeriodLine[]
  total: number
  /** hour packs: minutes bought (incl. carried in) that don't fill a whole next session — the admin decides
   *  (line.leftover): carry to the next package, one more session free ("extra", already in `slots`), or drop */
  leftoverMinutes: number
  /** minutes kept for the student's next package of this course (leftover = "carry") */
  carryOut: number
}

type QuoteClass = Pick<Klass, "id" | "weekday" | "minutes" | "branchId" | "start">

/**
 * Where a week starts for pro-rating: the branch's first open day of that Mon–Sun week (open Mon–Fri → Monday,
 * opens from Wednesday → Wednesday). The week is billed in the month of that day. Owner 2026-09-30 ("นายตัดสินใจไปก่อน").
 */
export function weekKey(date: DateStr, openDays: Weekday[]): DateStr {
  const monday = addDays(date, -((weekdayOf(date) + 6) % 7))
  for (let i = 0; i < 7; i++) {
    const d = addDays(monday, i)
    if (openDays.includes(weekdayOf(d))) return d
  }
  return monday
}

/** Every meeting of these classes from `from`, skipping holidays, in date + time order, until `stop` says enough. */
function classSlots(klasses: QuoteClass[], from: DateStr, holidays: Holiday[], stop: (d: DateStr, taken: QuoteSlot[]) => boolean) {
  const slots: QuoteSlot[] = [], skipped: DateStr[] = []
  for (let d = from, guard = 0; guard < 3660 && !stop(d, slots); d = addDays(d, 1), guard++) {
    for (const k of [...klasses].sort((a, b) => a.start.localeCompare(b.start))) {
      if (weekdayOf(d) !== k.weekday) continue
      if (isHoliday(d, k.branchId, holidays)) skipped.push(d)
      else slots.push({ date: d, classId: k.id, start: k.start, minutes: k.minutes })
    }
  }
  return { slots, skipped: [...new Set(skipped)] }
}

export function quoteCourse(opts: {
  course: Pick<Course, "unit" | "duration" | "price">
  /** one or more classes (one course can run on several classes — each counted as its own class) */
  klasses: QuoteClass[]
  startDate: DateStr
  periods: number
  holidays: Holiday[]
  /** branch open weekdays — where a pro-rate week starts. Default Mon–Sun. */
  openDays?: Weekday[]
  /** hour packs: minutes carried in from the previous package */
  carryIn?: number
  leftover?: Leftover
}): Result<CourseQuote> {
  const { course, klasses, startDate, holidays } = opts
  if (!Number.isInteger(opts.periods) || opts.periods < 1) return { ok: false, error: "จำนวนงวดต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป" } // BL-5
  if (!klasses.length) return { ok: false, error: "เลือกคลาสอย่างน้อย 1 คลาส" }
  const openDays = opts.openDays ?? ([0, 1, 2, 3, 4, 5, 6] as Weekday[])
  const first = klasses.map((k) => nextWeekday(startDate, k.weekday)).sort()[0]

  if (course.unit === "month") {
    // months count from the first real session, not the typed start date (E2E 2026-09-28)
    const to = endOfMonth(addMonths(first, opts.periods - 1))
    const { slots, skipped } = classSlots(klasses, first, holidays, (d) => d > to)
    const months = Array.from({ length: opts.periods }, (_, i) => monthKey(addMonths(first, i)))
    // each class week is billed in the month its week starts (a week starting 30 Sep belongs to September);
    // weeks that start before the first month count in the first month
    const monthOf = (d: DateStr) => { const m = monthKey(weekKey(d, openDays)); return m < months[0] ? months[0] : m }
    const periods = months.map((m) => {
      const inMonth = slots.filter((x) => monthOf(x.date) === m)
      const weeks = [...new Set(inMonth.map((x) => weekKey(x.date, openDays)))]
      const factor = prorateFactor(weeks.length) // owner 2026-09-30: count weeks with class, not sessions
      return { month: m, sessions: inMonth.map((x) => x.date), weeks, factor, amount: Math.round(course.price * factor) }
    })
    return done(slots, skipped, first, to, periods, 0, 0)
  }

  // week packs: every session inside N weeks from the first session — any number of sessions (owner 2026-09-28)
  if (course.unit === "week") {
    const to = addDays(first, course.duration * 7 * opts.periods - 1)
    const { slots, skipped } = classSlots(klasses, first, holidays, (d) => d > to)
    return done(slots, skipped, first, to, [{ month: monthKey(first), sessions: slots.map((x) => x.date), factor: opts.periods, amount: course.price * opts.periods }], 0, 0)
  }

  // hour packs: whole sessions the minutes pay for, in real class order across every class, at each class's real
  // length (24 h at 1:30 = 16 sessions) · what doesn't fill the next session is the leftover (owner 2026-09-30)
  const bought = course.duration * 60 * opts.periods + (opts.carryIn ?? 0)
  // scan until the meetings found go past what was bought — the first one over is the "next session"
  const { slots, skipped } = classSlots(klasses, first, holidays, (_, taken) => taken.reduce((a, x) => a + x.minutes, 0) > bought)
  let used = 0
  const fit: QuoteSlot[] = []
  for (const x of slots) { if (used + x.minutes > bought) break; fit.push(x); used += x.minutes }
  const next = slots[fit.length]
  const leftoverMinutes = bought - used
  const extra = leftoverMinutes > 0 && opts.leftover === "extra" && next ? [next] : []
  const paid = [...fit, ...extra]
  const to = paid[paid.length - 1]?.date ?? first
  const lastDate = paid[paid.length - 1]?.date
  return done(paid, skipped.filter((d) => !lastDate || d <= lastDate), first, to,
    [{ month: monthKey(first), sessions: paid.map((x) => x.date), factor: opts.periods, amount: course.price * opts.periods }],
    leftoverMinutes, opts.leftover === "carry" ? leftoverMinutes : 0)

  function done(s: QuoteSlot[], sk: DateStr[], from: DateStr, until: DateStr, periods: PeriodLine[], leftoverMinutes: number, carryOut: number): Result<CourseQuote> {
    return {
      ok: true,
      value: {
        sessions: s.map((x) => x.date),
        slots: s,
        skipped: sk,
        from,
        to: until,
        hours: s.reduce((a, x) => a + x.minutes, 0) / 60, // BL-2: hours from real sessions × real duration
        periods,
        total: periods.reduce((a, p) => a + p.amount, 0),
        leftoverMinutes,
        carryOut,
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
  klasses: Klass[]
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
  /** extra bus days from earlier (BusAddOn) billed on this invoice */
  busExtra: number
  book: number
  advance: number
  concession: number
  /** course credit from Credit Notes taken off */
  credit: number
  total: number
  lines: LineQuote[]
}

export function quoteLine(line: CourseLine, ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }, promotions = true): LineQuote {
  const course = ctx.courses.find((c) => c.id === line.courseId)
  const klasses = line.classIds.map((id) => ctx.classes.find((c) => c.id === id)).filter((k): k is Klass => !!k)
  let quote: CourseQuote | null = null
  if (course && klasses.length) {
    const r = quoteCourse({ course, klasses, startDate: line.startDate, periods: line.periods, holidays: ctx.holidays, openDays: openDaysOf(ctx.branch), carryIn: line.carryIn, leftover: line.leftover })
    if (r.ok) quote = r.value
  }
  const amount = quote?.total ?? 0
  // each course gets its own best promotion (a promotion is per package type + duration)
  const promo = course && promotions ? bestPromotion(ctx.branch, purchaseOf(course, line.periods), amount, line.startDate) : null
  // course fee (equipment) is charged on top of the price on every purchase
  return { line, course, klasses, quote, amount, courseFee: course?.courseFee ?? 0, promotion: promo?.discount ?? 0, promotionName: promo?.promotion.name }
}

export function invoiceTotals(inv: Invoice, ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }): InvoiceTotals {
  const lines = inv.lines.map((l) => quoteLine(l, ctx, inv.promotionId !== null))
  const sum = (f: (l: LineQuote) => number) => lines.reduce((a, l) => a + f(l), 0)
  const course = sum((l) => l.amount), courseFee = sum((l) => l.courseFee), promotion = sum((l) => l.promotion)
  const bus = busTotal(inv.bus, busRate(ctx.branch, inv.busFeeId))
  const advance = inv.advance.reduce((a, x) => a + x.amount, 0)
  const busExtra = (inv.busExtras ?? []).reduce((a, x) => a + x.amount, 0)
  const concession = inv.concession?.amount ?? 0
  const credit = (inv.creditsUsed ?? []).reduce((a, x) => a + x.amount, 0)
  const total = course + courseFee - promotion + bus + busExtra + inv.bookFee + advance - concession - credit
  return { course, courseFee, promotion, bus, busExtra, book: inv.bookFee, advance, concession, credit, total, lines }
}

/** Classes an invoice line can enrol into: this branch's active recurring classes that teach the course's subject
 *  in the same format (เดี่ยว/กลุ่ม) — classes linked to the course come first. */
export function classOptionsFor(course: Course | undefined, classes: Klass[], branchId: ID): Klass[] {
  if (!course) return []
  return classes
    .filter((k) => k.branchId === branchId && k.active && k.kind === "learning" && k.type === course.format && course.subjects.includes(k.subject))
    .sort((a, b) => Number(b.courseId === course.id) - Number(a.courseId === course.id) || a.weekday - b.weekday || a.start.localeCompare(b.start))
}

/** Why this student pays no entry fee: a paid invoice already had it (Staging), or the student came in with the
 *  import of the old system — an old student who already bought courses with us (owner 2026-09-30). */
export type EntryWaiver = { reason: "paid"; invoice: Invoice } | { reason: "imported"; at: string; source: string }

export function entryFeeWaiver(student: Pick<Student, "id" | "imported"> | undefined, invoices: Invoice[], fees: Fee[], exceptInvoiceId?: ID): EntryWaiver | null {
  if (!student) return null
  const entry = new Set(fees.filter((f) => f.kind === "entry").map((f) => f.id))
  const paid = invoices.find((i) => i.id !== exceptInvoiceId && i.studentId === student.id && i.status === "paid" && i.advance.some((a) => entry.has(a.feeId)))
  if (paid) return { reason: "paid", invoice: paid }
  if (student.imported) return { reason: "imported", ...student.imported }
  return null
}

/** Default Advance Optional items for a new invoice: every entry fee unless waived — mock tests are opt-in. */
export function defaultAdvance(branch: Branch, student: Pick<Student, "id" | "imported"> | undefined, invoices: Invoice[]): AdvanceItem[] {
  if (!student || entryFeeWaiver(student, invoices, branch.fees)) return []
  return branch.fees.filter((f) => f.kind === "entry").map((f) => ({ feeId: f.id, name: f.name, amount: f.price }))
}

/** The branch's regular open weekdays (where a pro-rate week starts). */
export const openDaysOf = (b: Pick<Branch, "hours">) => (Object.keys(b.hours).map(Number) as Weekday[]).filter((w) => b.hours[w])

/** Hour-pack minutes this student kept on a course (leftover = "carry") and has not used on another invoice yet. */
export function carriedMinutes(studentId: ID, courseId: ID, ents: Entitlement[], invoices: Invoice[], exceptInvoiceId?: ID): number {
  const kept = ents.filter((e) => e.studentId === studentId && e.courseId === courseId).reduce((a, e) => a + (e.carryMinutes ?? 0), 0)
  const used = invoices
    .filter((i) => i.id !== exceptInvoiceId && i.studentId === studentId && i.status !== "void")
    .flatMap((i) => i.lines).filter((l) => l.courseId === courseId).reduce((a, l) => a + (l.carryIn ?? 0), 0)
  return Math.max(0, kept - used)
}

/** Legs × the bus fee type's price. */
export const busAddOnAmount = (a: Pick<BusAddOn, "pickup" | "dropoff">, rate: number) => (Number(a.pickup) + Number(a.dropoff)) * rate

export function validateBusAddOn(a: Pick<BusAddOn, "date" | "pickup" | "dropoff">): string | null {
  if (!a.date) return "เลือกวันที่ใช้รถ"
  if (!a.pickup && !a.dropoff) return "ติ๊กรับหรือส่งอย่างน้อย 1 เที่ยว"
  return null
}

/** The same leg (pickup / drop-off) on the same day can only be added once per student. */
export function duplicateBusDay(studentId: ID, days: Pick<BusAddOn, "date" | "pickup" | "dropoff">[], existing: BusAddOn[]): DateStr | null {
  const seen = existing.filter((a) => a.studentId === studentId).map((a) => ({ ...a }))
  for (const d of days) {
    if (seen.some((a) => a.date === d.date && ((a.pickup && d.pickup) || (a.dropoff && d.dropoff)))) return d.date
    seen.push({ ...d } as BusAddOn)
  }
  return null
}

/** Extra bus days still waiting to be charged: not on any invoice that isn't void (the one being edited doesn't count). */
export function pendingBusAddOns(studentId: ID, addOns: BusAddOn[], invoices: Invoice[], exceptInvoiceId?: ID): BusAddOn[] {
  const billed = new Set(invoices.filter((i) => i.id !== exceptInvoiceId && i.status !== "void").flatMap((i) => (i.busExtras ?? []).map((x) => x.addOnId)))
  return addOns.filter((a) => a.studentId === studentId && !billed.has(a.id)).sort((a, b) => a.date.localeCompare(b.date))
}

/** Which invoice charged this add-on (undefined = still pending). */
export const billedOn = (addOnId: ID, invoices: Invoice[]) => invoices.find((i) => i.status !== "void" && (i.busExtras ?? []).some((x) => x.addOnId === addOnId))

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
    if (!l.line.classIds.length) errs.push(`${tag}เลือกคลาสและวันเริ่มเรียน`)
    if (l.quote && l.quote.leftoverMinutes > 0 && !l.line.leftover) errs.push(`${tag}ชั่วโมงเหลือเศษ ${l.quote.leftoverMinutes} นาที — เลือกว่าจะเก็บไว้ / เพิ่ม 1 คาบ / ตัดทิ้ง`)
    // Test → Trial → Invoice: paid classes start after the last test/trial, so a trial is never billed (owner 2026-09-28)
    if (l.quote && opts.lastAssessment && l.quote.from <= opts.lastAssessment)
      errs.push(`${tag}วันเริ่มเรียนต้องหลังวันสอบ/ทดลองเรียน (${fmtDate(opts.lastAssessment)}) — เลื่อนวันเริ่มเรียน`)
    if (l.line.classIds.length && l.quote && l.quote.sessions.length === 0) errs.push(`${tag}ช่วงที่เลือกไม่มีคาบเรียนเลย (ติดวันหยุดทั้งหมด) — เลื่อนวันเริ่มหรือเพิ่มจำนวนงวด`)
    if (!Number.isInteger(l.line.periods) || l.line.periods < 1) errs.push(`${tag}จำนวนงวดต้องตั้งแต่ 1 ขึ้นไป`)
  })
  const keys = inv.lines.flatMap((l) => l.classIds.map((c) => `${l.courseId}|${c}`))
  if (new Set(keys).size < keys.length) errs.push("มีคอร์ส + คลาสเดียวกันซ้ำในใบนี้ — รวมเป็นรายการเดียวแล้วเพิ่มจำนวนงวด")
  if (inv.concession && inv.concession.amount > 0 && !inv.concession.remark.trim()) errs.push("ส่วนลดพิเศษ (Concession) ต้องใส่เหตุผล")
  if (inv.concession && inv.concession.amount < 0) errs.push("ส่วนลดติดลบไม่ได้")
  if (totals.total < 0) errs.push("ยอดรวมติดลบ")
  return errs
}

/** BL-8, BL-9: numbers are assigned at Generate, sequentially per branch + month, never on draft.
 *  Year is Buddhist Era, 2 digits (owner 2026-09-28): Sep 2026 → INV-THL-6909-0001 */
export function nextInvoiceNumber(prefix: "INV" | "RC" | "CN", branch: Branch, date: DateStr, existing: (string | undefined | null)[]) {
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
