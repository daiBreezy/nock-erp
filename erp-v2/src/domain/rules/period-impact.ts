import type { DateStr, Entitlement, ID, Klass, Session, SpecialPeriod } from "../types"
import { packageCovers } from "./attendance"

/**
 * owner 2026-11-25 — Impact Center (v1): when a Special Period is open (or about to be), who does it hit? A REGULAR class stops for the whole period
 * (the calendar switches to it), so every regular session from today on inside the dates is paused (or would be). The students booked in those
 * sessions are grouped by what their package is: hourly (`sessions`, the end date is pushed out by itself) or weekly / monthly (`subscription`, the lost
 * sessions become Credit). Tests / trials / one-offs with no class are listed too — staff handle those by hand.
 */
export interface ImpactPackage { entitlementId: ID; courseId: ID; kind: Entitlement["kind"]; /** sessions this package loses */ lost: number; to: DateStr }
export interface ImpactStudent { studentId: ID; sessions: Session[]; packages: ImpactPackage[] }
export interface PeriodImpact {
  /** the regular-class sessions the period stops (already paused by it, or still running that it will stop) */
  pausedSessions: Session[]
  hourly: ImpactStudent[]
  subscription: ImpactStudent[]
  /** booked in a stopped session but no package covers it (a trial, a credit course …) */
  uncovered: ImpactStudent[]
  /** tests / trials / one-offs inside the dates — they keep running, so staff look at each */
  bookings: Session[]
  /** every student touched, once */
  students: ID[]
  /** pauseCause "school" (default) — the lost sessions are owed to the student */
  schoolCause: boolean
}

export function periodImpact(
  period: SpecialPeriod,
  branchId: ID,
  data: { classes: Pick<Klass, "id" | "periodId">[]; sessions: Session[]; entitlements: Entitlement[] },
  today: DateStr,
): PeriodImpact {
  const from = period.from > today ? period.from : today
  const regular = new Set(data.classes.filter((k) => !k.periodId).map((k) => k.id))
  const inRange = (s: Session) => s.branchId === branchId && s.date >= from && s.date <= period.to
  const pausedSessions = data.sessions.filter((s) => inRange(s) && !!s.classId && regular.has(s.classId) && (!s.cancelled || s.pausedBy === period.id))
  const bookings = data.sessions.filter((s) => inRange(s) && !s.classId && !s.cancelled)

  const byStudent = new Map<ID, ImpactStudent>()
  const uncovered = new Map<ID, ImpactStudent>()
  for (const s of pausedSessions) {
    for (const sid of s.studentIds) {
      const mine = data.entitlements.filter((e) => e.studentId === sid && packageCovers(e, s))
      const bucket = mine.length ? byStudent : uncovered
      const row = bucket.get(sid) ?? { studentId: sid, sessions: [], packages: [] }
      row.sessions.push(s)
      for (const e of mine) {
        const p = row.packages.find((x) => x.entitlementId === e.id)
        if (p) p.lost++
        else row.packages.push({ entitlementId: e.id, courseId: e.courseId, kind: e.kind, lost: 1, to: e.to })
      }
      bucket.set(sid, row)
    }
  }
  const rows = [...byStudent.values()]
  const hasKind = (k: Entitlement["kind"]) => rows.filter((r) => r.packages.some((p) => p.kind === k)).map((r) => ({ ...r, packages: r.packages.filter((p) => p.kind === k) }))
  return {
    pausedSessions,
    hourly: hasKind("sessions"),
    subscription: hasKind("subscription"),
    uncovered: [...uncovered.values()],
    bookings,
    students: [...new Set([...byStudent.keys(), ...uncovered.keys()])],
    schoolCause: period.pauseCause !== "other",
  }
}

/** how many days before the period starts (0 = already started) — the owner wants ≥ 45 days' notice so the next monthly invoice round can adapt */
export const PERIOD_NOTICE_DAYS = 45
export const daysUntilPeriod = (period: Pick<SpecialPeriod, "from">, today: DateStr) => Math.max(0, Math.round((Date.parse(period.from) - Date.parse(today)) / 86_400_000))
export const shortNotice = (period: Pick<SpecialPeriod, "from">, today: DateStr) => daysUntilPeriod(period, today) < PERIOD_NOTICE_DAYS

/**
 * owner 2026-11-25 — Date pickers show Special Periods. Three levels by kind of date: BLOCK (a Trial appointment · a regular class's start date — the day
 * can't be picked), WARN (selectable, with a teal notice: invoice start, leave, reschedule, follow-up …), NOT RELEVANT (payment / birth dates — nothing shown).
 * Periods that are not Active yet are still SHOWN (so people know what is planned) but only an Active one blocks.
 */
export interface PeriodHit { period: SpecialPeriod; active: boolean }
export function periodsCovering(periods: SpecialPeriod[] | undefined, date: DateStr): PeriodHit[] {
  return (periods ?? []).filter((p) => p.from <= date && date <= p.to).map((period) => ({ period, active: period.active }))
}
/** the Active periods only — what actually stops regular classes (and blocks a Trial) on that day */
export const activePeriodOn = (periods: SpecialPeriod[] | undefined, date: DateStr) => periodsCovering(periods, date).find((h) => h.active)?.period ?? null

/**
 * owner 2026-11-25 — countdown to a Special Period on the Dashboard (ต้องรู้ไว้) and the Calendar sub-header. Only periods that have not started yet, within 60 days:
 *   60–45 days ahead → gray (safe) · fewer than 45 days and still NOT switched on → orange · fewer than 30 days and still not on → red.
 * A period that is already Active is "opened" — it stays gray (the Impact Center handles the rest).
 */
export const COUNTDOWN_DAYS = 60
export type CountdownTone = "gray" | "orange" | "red"
export interface PeriodCountdown { period: SpecialPeriod; days: number; opened: boolean; tone: CountdownTone }
export function periodCountdown(periods: SpecialPeriod[] | undefined, today: DateStr): PeriodCountdown[] {
  return (periods ?? [])
    .filter((p) => p.from > today && daysUntilPeriod(p, today) <= COUNTDOWN_DAYS)
    .map((period): PeriodCountdown => {
      const days = daysUntilPeriod(period, today)
      const opened = period.active
      return { period, days, opened, tone: opened || days >= PERIOD_NOTICE_DAYS ? "gray" : days < 30 ? "red" : "orange" }
    })
    .sort((a, b) => a.days - b.days)
}
