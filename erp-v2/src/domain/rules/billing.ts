// Billing rules: one pricing function feeds Create, Edit, Detail and PDF (BL-2, BL-3, BL-4).

import { addMonths, endOfMonth, fmtDate, fmtMoney, fromMinutes, monthKey, nextWeekday, addDays, toMinutes, weekdayOf } from "../dates"
import type { AdvanceItem, Branch, BusAddOn, Entitlement, Leftover, Student, Weekday, BusLeg, Course, CourseLine, DateStr, Fee, Holiday, ID, Invoice, Klass, PriceUnit, Result, Role, Staff } from "../types"
import { purchaseOf } from "./course"
import { seatTotal, seatWindows } from "./seats"
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
  /** hour packs: free minutes from a bonus-hours promotion — added to what is bought, price unchanged */
  bonusMinutes?: number
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
  const bought = course.duration * 60 * opts.periods + (opts.carryIn ?? 0) + (opts.bonusMinutes ?? 0)
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

const promoActive = (p: Branch["promotions"][number], purchase: { unit: PriceUnit; amount: number }, date: DateStr) =>
  p.active && p.unit === purchase.unit && purchase.amount >= p.minDuration && (!p.from || p.from <= date) && (!p.to || date <= p.to)

/** Best active money promotion (pct / amount) for this package type whose minimum duration the purchase reaches */
export function bestPromotion(branch: Branch, purchase: { unit: PriceUnit; amount: number }, courseAmount: number, date: DateStr) {
  const eligible = (branch.promotions ?? []).filter((p) => p.type !== "bonus_hours" && promoActive(p, purchase, date))
  const value = (p: (typeof eligible)[number]) => (p.type === "pct" ? Math.round((courseAmount * p.value) / 100) : Math.min(p.value, courseAmount))
  const best = eligible.sort((a, b) => value(b) - value(a))[0]
  return best ? { promotion: best, discount: value(best) } : null
}

/** Best bonus-hours promotion (owner 2026-11-05): free hours on an hour pack — no money off, more time in the entitlement */
export function bestBonusHours(branch: Branch, purchase: { unit: PriceUnit; amount: number }, date: DateStr) {
  if (purchase.unit !== "hour") return null
  const best = (branch.promotions ?? []).filter((p) => p.type === "bonus_hours" && p.value > 0 && promoActive(p, purchase, date)).sort((a, b) => b.value - a.value)[0]
  return best ? { promotion: best, minutes: Math.round(best.value * 60) } : null
}

/** Family Promotion (owner 2026-11-05, #53): system-wide, not per branch. Strictly MORE than the hours counts
 *  (72 h exactly = no discount). Tiers are a constant so the owner can tune them in one place. */
export const FAMILY_PROMO_TIERS: { overHours: number; pct: number }[] = [
  { overHours: 72, pct: 10 },
  { overHours: 96, pct: 15 },
]

export interface FamilyPromo { pct: number; overHours: number; /** which hours reached it */ basis: "family" | "single"; hours: number }

/** Siblings invoiced the same day + the hours each buys → the tier the family reaches, from the family total or any
 *  one child, whichever gets there first (i.e. the higher tier). The discount then goes to EVERY sibling invoiced. */
export function familyPromotion(members: { studentId: ID; hours: number }[]): FamilyPromo | null {
  const total = members.reduce((a, m) => a + m.hours, 0)
  const top = Math.max(0, ...members.map((m) => m.hours))
  let found: FamilyPromo | null = null
  for (const t of [...FAMILY_PROMO_TIERS].sort((a, b) => a.overHours - b.overHours)) {
    // one child over the line implies the family total is over it too — "single" is the more specific reason
    if (top > t.overHours) found = { pct: t.pct, overHours: t.overHours, basis: "single", hours: top }
    else if (total > t.overHours) found = { pct: t.pct, overHours: t.overHours, basis: "family", hours: total }
  }
  return found
}

/** Hours a set of invoices buys (real sessions × real length), for the family tier */
export const invoiceHours = (t: Pick<InvoiceTotals, "lines">) => t.lines.reduce((a, l) => a + (l.quote?.hours ?? 0), 0)

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
  /** bonus-hours promotion: free minutes added to this hour pack (money unchanged) */
  bonusMinutes: number
  bonusName?: string
  /** this line's promotion is the Family Promotion */
  family?: boolean
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
  /** owner Row 34 (2026-10-28): Liclass rounds the invoice total up to the nearest ฿10 — this is how much was added (0 otherwise) */
  rounding: number
  total: number
  lines: LineQuote[]
}

/** round up to the nearest `step` (owner Row 34: Liclass bills up to the next ฿10 — 3,524 → 3,530) */
export const roundUpTo = (n: number, step: number) => (step > 0 ? Math.ceil(n / step) * step : n)

export function quoteLine(line: CourseLine, ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }, promotions = true, familyPct = 0): LineQuote {
  const course = ctx.courses.find((c) => c.id === line.courseId)
  // a student who attends part of a class (1 of 2 hours) is quoted on their own part — sessions follow their minutes
  const klasses = line.classIds.map((id) => ctx.classes.find((c) => c.id === id)).filter((k): k is Klass => !!k)
    .map((k) => { const seat = line.seats?.[k.id]; return seat ? { ...k, minutes: seatTotal(seat), start: fromMinutes(toMinutes(k.start) + seatWindows(seat)[0].offset) } : k })
  // bonus-hours promotion: free minutes on top of the hours bought (chosen from the course + periods, not from the quote)
  const purchase = course ? purchaseOf(course, line.periods) : null
  const bonus = course && purchase && promotions ? bestBonusHours(ctx.branch, purchase, line.startDate) : null
  let quote: CourseQuote | null = null
  if (course && klasses.length) {
    const r = quoteCourse({ course, klasses, startDate: line.startDate, periods: line.periods, holidays: ctx.holidays, openDays: openDaysOf(ctx.branch), carryIn: line.carryIn, bonusMinutes: bonus?.minutes, leftover: line.leftover })
    if (r.ok) quote = r.value
  }
  const amount = quote?.total ?? 0
  // each course gets its own best promotion (a promotion is per package type + duration)
  const promo = course && purchase && promotions ? bestPromotion(ctx.branch, purchase, amount, line.startDate) : null
  // Family Promotion: % off the tuition only; if a branch promotion is worth more it wins (no stacking)
  const fam = familyPct > 0 ? Math.round((amount * familyPct) / 100) : 0
  const useFamily = fam > (promo?.discount ?? 0)
  // course fee (equipment) is charged on top of the price on every purchase
  return {
    line, course, klasses, quote, amount, courseFee: course?.courseFee ?? 0,
    promotion: useFamily ? fam : promo?.discount ?? 0,
    promotionName: useFamily ? `Family Promotion −${familyPct}%` : promo?.promotion.name,
    family: useFamily || undefined,
    bonusMinutes: bonus?.minutes ?? 0, bonusName: bonus?.promotion.name,
  }
}

export function invoiceTotals(inv: Invoice, ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }): InvoiceTotals {
  const lines = inv.lines.map((l) => quoteLine(l, ctx, inv.promotionId !== null, inv.familyPromoPct ?? 0))
  const sum = (f: (l: LineQuote) => number) => lines.reduce((a, l) => a + f(l), 0)
  const course = sum((l) => l.amount), courseFee = sum((l) => l.courseFee), promotion = sum((l) => l.promotion)
  const bus = busTotal(inv.bus, busRate(ctx.branch, inv.busFeeId))
  const advance = inv.advance.reduce((a, x) => a + x.amount, 0)
  const busExtra = (inv.busExtras ?? []).reduce((a, x) => a + x.amount, 0)
  const concession = inv.concession?.amount ?? 0
  const credit = (inv.creditsUsed ?? []).reduce((a, x) => a + x.amount, 0)
  const raw = course + courseFee - promotion + bus + busExtra + inv.bookFee + advance - concession - credit
  // owner Row 34: Liclass rounds the whole invoice up to the next ฿10; the delta is shown as its own "ปัดเศษ" line
  const total = ctx.branch.brand === "liclass" ? roundUpTo(raw, 10) : raw
  return { course, courseFee, promotion, bus, busExtra, book: inv.bookFee, advance, concession, credit, rounding: total - raw, total, lines }
}

/** Why a class is not an obvious fit for this course — never a block (owner 2026-09-30: "we're very flexible", any
 *  student can sit in any class); the admin just sees the reasons. A teacher-block class fits any subject its
 *  teachers teach and any grade; a subject class fits its own subjects and grades. */
export function classFit(course: Pick<Course, "subjects" | "grades" | "format">, klass: Klass, staff: Pick<Staff, "id" | "subjects">[] = [], studentGrade?: string): string[] {
  const out: string[] = []
  if (klass.layout === "teacher") {
    const taught = new Set([klass.teacherId, ...klass.coTeacherIds].flatMap((id) => staff.find((t) => t.id === id)?.subjects ?? []))
    const missing = course.subjects.filter((x) => !taught.has(x))
    if (missing.length) out.push(`ครูในคลาสนี้ไม่ได้สอน${missing.join(", ")}`)
  } else {
    const missing = course.subjects.filter((x) => ![klass.subject, ...(klass.subjects ?? [])].includes(x))
    if (missing.length) out.push(`คลาสนี้เป็นวิชา${[klass.subject, ...(klass.subjects ?? [])].filter((v, i, a) => a.indexOf(v) === i).join(" + ")}`)
    if (studentGrade && klass.grades.length && !klass.grades.includes(studentGrade)) out.push(`คลาสนี้สำหรับชั้น ${klass.grades.join(", ")}`)
  }
  if (course.format === "single" && klass.type !== "single") out.push("คอร์สเรียนเดี่ยว แต่คลาสนี้ไม่ได้ติดป้ายเรียนเดี่ยว")
  if (course.format === "group" && klass.type === "single") out.push("คลาสนี้ติดป้ายเรียนเดี่ยว")
  return out
}

/** Every active class of the branch a line can enrol into, best fits first, each with its warnings. */
export function classChoices(course: Course | undefined, classes: Klass[], branchId: ID, staff: Pick<Staff, "id" | "subjects">[] = [], studentGrade?: string) {
  if (!course) return []
  return classes
    .filter((k) => k.branchId === branchId && k.active && k.kind === "learning")
    .map((klass) => ({ klass, warnings: classFit(course, klass, staff, studentGrade) }))
    .sort((a, b) => a.warnings.length - b.warnings.length || Number(b.klass.courseId === course.id) - Number(a.klass.courseId === course.id) || a.klass.weekday - b.klass.weekday || a.klass.start.localeCompare(b.klass.start))
}

/** The classes that fit a course with no warning (auto-picked when there is exactly one). */
export function classOptionsFor(course: Course | undefined, classes: Klass[], branchId: ID, staff: Pick<Staff, "id" | "subjects">[] = []): Klass[] {
  return classChoices(course, classes, branchId, staff).filter((c) => !c.warnings.length).map((c) => c.klass)
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

/** The message to the parent from this student's latest earlier invoice — shown again on the next one so staff can keep,
 *  edit or clear it before sending (owner 2026-11-05). */
export function lastNoteFor(studentId: ID, invoices: Pick<Invoice, "id" | "studentId" | "status" | "noteToParent" | "createdAt">[], exceptInvoiceId?: ID): string {
  const prev = invoices
    .filter((i) => i.id !== exceptInvoiceId && i.studentId === studentId && i.status !== "void" && i.noteToParent.trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  return prev?.noteToParent.trim() ?? ""
}

/** Duplicate / renewal (owner 2026-11-05): a finished invoice → a NEW draft with the same courses, classes, periods and
 *  message. Each course starts the day after the old one ends (never before today); everything that belonged to that one
 *  moment — payments, bus legs, extra bus days, credit, one-off discount, the Family % and the entry fee — is left out for
 *  the admin to decide. */
export function renewalDraft(inv: Invoice, o: { id: ID; today: DateStr; nowIso: string; createdBy: ID; ctx: { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }; newId: () => ID }): Invoice {
  const q = invoiceTotals(inv, o.ctx).lines
  const lines = inv.lines.map((l, i) => {
    const end = q[i]?.quote?.to
    const next = end ? addDays(end, 1) : o.today
    return { id: o.newId(), courseId: l.courseId, classIds: l.classIds, startDate: next > o.today ? next : o.today, periods: l.periods, leftover: l.leftover, seats: l.seats }
  })
  const entry = new Set(o.ctx.branch.fees.filter((f) => f.kind === "entry").map((f) => f.id))
  return {
    id: o.id, branchId: inv.branchId, studentId: inv.studentId, number: null, lines, bus: [], busFeeId: inv.busFeeId ?? null, busExtras: [],
    bookFee: inv.bookFee, advance: inv.advance.filter((a) => !entry.has(a.feeId)), concession: null, promotionId: inv.promotionId,
    noteToParent: inv.noteToParent, status: "draft", pdf: "none", createdBy: o.createdBy, createdAt: o.nowIso, payments: [], duplicatedFrom: inv.id,
  }
}

/** The student's last finished (paid) invoice that has courses — what a sibling Draft is made from. */
export const lastPaidInvoice = (studentId: ID, invoices: Invoice[]): Invoice | undefined =>
  invoices.filter((i) => i.studentId === studentId && i.status === "paid" && i.lines.length > 0).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]

/** Who can be renewed (owner 2026-11-05): each student's LATEST live invoice with courses, when it is paid — i.e. nothing
 *  newer (a draft already waiting counts) — with the day its last course ends. Soonest-ending first. */
export function renewalCandidates(invoices: Invoice[], ctxFor: (branchId: ID) => { branch: Branch; courses: Course[]; classes: Klass[]; holidays: Holiday[] }): { inv: Invoice; end: DateStr }[] {
  const latest = new Map<ID, Invoice>()
  for (const i of invoices.filter((x) => x.status !== "void" && x.lines.length > 0)) {
    const cur = latest.get(i.studentId)
    if (!cur || i.createdAt > cur.createdAt) latest.set(i.studentId, i)
  }
  return [...latest.values()].filter((i) => i.status === "paid").map((inv) => {
    const ends = invoiceTotals(inv, ctxFor(inv.branchId)).lines.map((l) => l.quote?.to).filter((d): d is DateStr => !!d).sort()
    return { inv, end: ends[ends.length - 1] ?? inv.createdAt.slice(0, 10) }
  }).sort((a, b) => a.end.localeCompare(b.end))
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
  const seen = existing.filter((a) => a.studentId === studentId && !a.cancel && !a.companion).map((a) => ({ ...a }))
  for (const d of days) {
    if (seen.some((a) => a.date === d.date && ((a.pickup && d.pickup) || (a.dropoff && d.dropoff)))) return d.date
    seen.push({ ...d } as BusAddOn)
  }
  return null
}

/** Extra bus days still waiting to be charged: not on any invoice that isn't void (the one being edited doesn't count). */
export function pendingBusAddOns(studentId: ID, addOns: BusAddOn[], invoices: Invoice[], exceptInvoiceId?: ID): BusAddOn[] {
  const billed = new Set(invoices.filter((i) => i.id !== exceptInvoiceId && i.status !== "void").flatMap((i) => (i.busExtras ?? []).map((x) => x.addOnId)))
  // a cancelled ride (owner 2026-10-19) is never charged
  return addOns.filter((a) => a.studentId === studentId && !a.cancel && !a.companion && !billed.has(a.id)).sort((a, b) => a.date.localeCompare(b.date))
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

/** Business type in document numbers (owner 2026-09-30): NA = NockAcademy, LI = Liclass */
export const BUSINESS_CODE: Record<Branch["brand"], string> = { nockacademy: "NAS", liclass: "LIS" }

/** พ.ศ. 2 digits + month + day: 2026-11-05 → "691105" */
export const buddhistYmd = (date: DateStr) => String((Number(date.slice(0, 4)) + 543) % 100).padStart(2, "0") + date.slice(5, 7) + date.slice(8, 10)

/** One place that writes a document number (owner 2026-11-05): [type]-[business]-[branch]-[yymmdd]-[running 3 digits]
 *  e.g. INV-LIS-TL-691105-002 */
export const documentNumber = (kind: "INV" | "CN" | "RC", branch: Pick<Branch, "brand" | "code">, date: DateStr, running: number) =>
  `${kind}-${BUSINESS_CODE[branch.brand]}-${branch.code}-${buddhistYmd(date)}-${String(running).padStart(3, "0")}`

/** The receipt carries its invoice's number with the RC prefix: INV-LIS-TL-691105-002 → RC-LIS-TL-691105-002 */
export const receiptNumberOf = (invoiceNumber: string | null | undefined) => (invoiceNumber ?? "").replace(/^INV-/, "RC-")

/**
 * Issued the moment the invoice is created (a real document from then on: problems are voided, never deleted). The
 * running number restarts each day per business + branch · 3 digits.
 */
export function nextInvoiceNumber(kind: "INV" | "CN", branch: Pick<Branch, "brand" | "code">, date: DateStr, existing: (string | undefined | null)[]) {
  const head = documentNumber(kind, branch, date, 0).slice(0, -3)
  const max = existing.filter((n): n is string => !!n && n.startsWith(head)).reduce((m, n) => Math.max(m, Number(n.slice(head.length)) || 0), 0)
  return documentNumber(kind, branch, date, max + 1)
}

const OLD_DOC_NUMBER = /^(CN-)?(\d{6})-(01|02)-(\d{3})-(\d+)$/

/**
 * Old-format numbers (yymmdd-01|02-001-0001, owner 2026-09-30) → the new format (owner 2026-11-05) for data saved in a
 * browser. Numbers already in the new format stay exactly as they are; the old ones take the next free running numbers
 * of their day + branch, oldest first, so nothing collides. Receipts follow their invoice's new number (RC-…).
 */
export function renumberDocuments<T extends { invoices: Invoice[]; creditNotes: { id: ID; number: string; branchId: ID; createdAt: string }[]; branches: Pick<Branch, "id" | "brand" | "code">[] }>(s: T): T {
  const branchOf = (id: ID) => s.branches.find((b) => b.id === id)
  const headOf = (kind: "INV" | "CN", ymd: string, b: Pick<Branch, "brand" | "code">) => `${kind}-${BUSINESS_CODE[b.brand]}-${b.code}-${ymd}-`
  const used = new Map<string, number>() // head → highest running already taken (new format)
  const take = (n: string | null | undefined) => {
    const m = n?.match(/^(.*-)(\d+)$/)
    if (m && /^(INV|CN)-[A-Z]{3}-[A-Z]{2,3}-\d{6}-$/.test(m[1])) used.set(m[1], Math.max(used.get(m[1]) ?? 0, Number(m[2])))
  }
  s.invoices.forEach((i) => take(i.number))
  s.creditNotes.forEach((c) => take(c.number))
  const map = new Map<string, string>() // old number → new number
  const assign = <R extends { number: string | null; createdAt: string; branchId: ID }>(rows: R[]) => {
    const old = rows.filter((r) => r.number && OLD_DOC_NUMBER.test(r.number) && branchOf(r.branchId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.number!.localeCompare(b.number!))
    for (const r of old) {
      const m = r.number!.match(OLD_DOC_NUMBER)!
      const head = headOf(m[1] ? "CN" : "INV", m[2], branchOf(r.branchId)!)
      const next = (used.get(head) ?? 0) + 1
      used.set(head, next)
      map.set(r.number!, `${head}${String(next).padStart(3, "0")}`)
    }
  }
  assign(s.invoices)
  assign(s.creditNotes.map((c) => ({ ...c, number: c.number as string | null })))
  const mapped = (n: string | null | undefined) => (n ? map.get(n) ?? n : n)
  return {
    ...s,
    invoices: s.invoices.map((i) => ({ ...i, number: mapped(i.number) ?? null, receiptNumber: i.receiptNumber && map.has(i.receiptNumber) ? receiptNumberOf(map.get(i.receiptNumber)) : i.receiptNumber })),
    creditNotes: s.creditNotes.map((c) => ({ ...c, number: mapped(c.number) as string })),
  }
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

/**
 * One slip, several invoices (owner 2026-10-29): siblings keep their own invoices, the parent transfers once.
 * Same family + same branch (one bank account), every invoice payable, and the slip covers exactly what they still owe.
 */
export function canRecordGroupPayment(invs: { inv: Invoice; familyId: ID | null | undefined; owed: number }[], amount: number): Result {
  if (invs.length < 2) return { ok: false, error: "เลือกใบแจ้งหนี้อย่างน้อย 2 ใบ" }
  const fam = invs[0].familyId
  if (!fam || invs.some((x) => x.familyId !== fam)) return { ok: false, error: "จ่ายรวมได้เฉพาะใบแจ้งหนี้ของครอบครัวเดียวกัน" }
  if (invs.some((x) => x.inv.branchId !== invs[0].inv.branchId)) return { ok: false, error: "จ่ายรวมได้เฉพาะใบแจ้งหนี้สาขาเดียวกัน" }
  if (invs.some((x) => !["approved", "sent"].includes(x.inv.status))) return { ok: false, error: "ต้องอนุมัติใบแจ้งหนี้ทุกใบก่อนรับเงิน" }
  if (invs.some((x) => x.owed <= 0)) return { ok: false, error: "มีใบที่ไม่มียอดค้างแล้ว" }
  const sum = invs.reduce((a, x) => a + x.owed, 0)
  if (amount !== sum) return { ok: false, error: `ยอดในสลิปต้องเท่ากับยอดค้างรวม ${fmtMoney(sum)}` }
  return { ok: true, value: undefined }
}

/** owed = total − everything recorded (confirmed or not) */
export const owedOn = (inv: Invoice, total: number) => total - paidAmount(inv, false)

/** invoices paid with the same slip as this one (itself included), oldest number first */
export function paymentGroup(inv: Invoice, all: Invoice[]): Invoice[] {
  const ids = new Set(inv.payments.map((p) => p.groupId).filter(Boolean))
  if (!ids.size) return [inv]
  return all.filter((x) => x.payments.some((p) => p.groupId && ids.has(p.groupId))).sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""))
}

/**
 * Receipts for one slip: the admin picks which invoices share one receipt (default: all of them).
 * A combined receipt takes the number of its first invoice (receipt number = invoice number, owner 13 Jul); the rest keep their own.
 */
export function receiptNumbersFor(group: Pick<Invoice, "id" | "number">[], combinedIds: ID[]): Map<ID, string> {
  const sorted = [...group].sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""))
  const head = sorted.find((x) => combinedIds.includes(x.id))
  const together = combinedIds.length >= 2 && head
  return new Map(sorted.map((x) => [x.id, receiptNumberOf(together && combinedIds.includes(x.id) ? head.number : x.number)]))
}

/** the invoices printed on this receipt (same receipt number, paid) */
export const invoicesOnReceipt = (receiptNumber: string, all: Invoice[]) =>
  all.filter((x) => x.status === "paid" && x.receiptNumber === receiptNumber).sort((a, b) => (a.number ?? "").localeCompare(b.number ?? ""))

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
  draft: "รอสร้าง PDF",
  pending_approval: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  sent: "ส่งแล้ว · รอชำระ",
  paid: "ชำระครบ",
  void: "ยกเลิก",
}
