import { addDays, weekdayOf } from "../dates"
import type { Course, DateStr, Entitlement, ID, Invoice, Klass, Session, SessionCredit, SpecialPeriod, Weekday } from "../types"
import { packageCovers } from "./attendance"
import { weekKey } from "./billing"

/**
 * owner 2026-11-25 — Session Credit for weekly / monthly packages. The school stops a session (Special Period) → the student is owed that session,
 * counted in SESSIONS. Money value of one credit = price per week ÷ sessions per week:
 *   monthly → the month's price ÷ the ACTUAL number of class-weeks in that month ÷ sessions per week  (5,000 · 5 weeks · Mon+Thu → 500; a 4-week month → 625)
 *   weekly  → the pack's price ÷ its weeks ÷ sessions per week
 * Hourly packages have no credit (their end date moves instead).
 */
const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

/** distinct weekdays the student's package classes meet on (at least 1) */
export function sessionsPerWeek(e: Pick<Entitlement, "classIds">, classes: Pick<Klass, "id" | "weekday">[]) {
  const days = new Set(classes.filter((k) => e.classIds.includes(k.id)).map((k) => k.weekday))
  return Math.max(1, days.size)
}

/** class-weeks billed in the calendar month of `date` — each class week counts in the month its week starts (same rule as quoteCourse) */
export function classWeeksInMonth(date: DateStr, weekdays: Weekday[]) {
  const month = date.slice(0, 7)
  const first = `${month}-01`
  const weeks = new Set<DateStr>()
  for (let i = -7; i <= 38; i++) {
    const d = addDays(first, i)
    if (!weekdays.includes(weekdayOf(d))) continue
    const key = weekKey(d, ALL_DAYS)
    if (key.slice(0, 7) === month) weeks.add(key)
  }
  return Math.max(1, weeks.size)
}

/** baht for ONE lost session (0 for hourly packages) */
export function creditValue(course: Pick<Course, "unit" | "duration" | "price">, e: Pick<Entitlement, "classIds">, classes: Pick<Klass, "id" | "weekday">[], date: DateStr) {
  const per = sessionsPerWeek(e, classes)
  if (course.unit === "month") {
    const days = [...new Set(classes.filter((k) => e.classIds.includes(k.id)).map((k) => k.weekday))]
    return Math.round(course.price / classWeeksInMonth(date, days.length ? days : ALL_DAYS) / per)
  }
  if (course.unit === "week") return Math.round(course.price / Math.max(1, course.duration) / per)
  return 0
}

export interface CreditSync {
  credits: SessionCredit[]
  created: number
  revoked: number
  /** settled credits whose session is back — nothing is touched, the Admin decides by hand */
  flagged: SessionCredit[]
}

/**
 * Brings the credit ledger in step with one period: every session the (active, school-caused) period pauses gives each weekly / monthly student seated in it
 * one credit; a credit whose session is no longer paused by this period is revoked when still open, flagged when already settled.
 */
export function syncPeriodCredits(
  existing: SessionCredit[],
  period: SpecialPeriod,
  data: { sessions: Session[]; entitlements: Entitlement[]; courses: Course[]; classes: Klass[] },
  newId: () => ID,
  nowIso: string,
): CreditSync {
  const mine = existing.filter((c) => c.periodId === period.id)
  const others = existing.filter((c) => c.periodId !== period.id)
  const wanted = new Map<string, { s: Session; e: Entitlement; studentId: ID }>()
  if (period.active && period.pauseCause !== "other") {
    for (const s of data.sessions) {
      if (s.pausedBy !== period.id || !s.classId) continue
      for (const studentId of s.studentIds) {
        const e = data.entitlements.find((x) => x.studentId === studentId && x.kind === "subscription" && packageCovers(x, s))
        if (e) wanted.set(`${s.id}|${studentId}`, { s, e, studentId })
      }
    }
  }
  const keyOf = (c: SessionCredit) => `${c.sessionId}|${c.studentId}`
  let revoked = 0
  const flagged: SessionCredit[] = []
  const kept = mine.map((c) => {
    if (wanted.has(keyOf(c))) return c
    if (c.status === "open") { revoked++; return { ...c, status: "revoked" as const, revokedReason: "ช่วงพิเศษเปลี่ยน — คาบนี้กลับมาเรียนแล้ว" } }
    if (c.status === "settled") flagged.push(c)
    return c
  })
  const have = new Set(kept.filter((c) => c.status !== "revoked").map(keyOf))
  const made: SessionCredit[] = []
  for (const [k, w] of wanted) {
    if (have.has(k)) continue
    const course = data.courses.find((c) => c.id === w.e.courseId)
    if (!course) continue
    made.push({ id: newId(), branchId: w.s.branchId, studentId: w.studentId, entitlementId: w.e.id, courseId: w.e.courseId, sessionId: w.s.id, periodId: period.id, date: w.s.date, value: creditValue(course, w.e, data.classes, w.s.date), status: "open", createdAt: nowIso })
  }
  return { credits: [...others, ...kept, ...made], created: made.length, revoked, flagged }
}

export const openCredits = (credits: SessionCredit[], studentId: ID) => credits.filter((c) => c.studentId === studentId && c.status === "open")
export const creditTotal = (credits: SessionCredit[]) => ({ sessions: credits.length, money: credits.reduce((a, c) => a + c.value, 0) })

/** how the money side of a student's package looks right now — the Impact Center shows it so the Admin can pick: fix an unpaid invoice, or settle the credit */
export type InvoiceState = "paid" | "unpaid" | "draft" | "none"
export function invoiceStateFor(studentId: ID, courseId: ID, invoices: Pick<Invoice, "studentId" | "status" | "lines" | "createdAt">[]): InvoiceState {
  const mine = invoices.filter((i) => i.studentId === studentId && i.status !== "void" && i.lines.some((l) => l.courseId === courseId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const latest = mine[0]
  if (!latest) return "none"
  if (latest.status === "paid") return "paid"
  return latest.status === "sent" || latest.status === "approved" ? "unpaid" : "draft"
}
