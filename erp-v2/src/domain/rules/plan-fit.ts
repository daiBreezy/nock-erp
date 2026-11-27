import type { Attendance, DateStr, Session } from "../types"

/**
 * "Did the students get their classes as planned?" (owner 2026-11-27) — counted per student-seat (a class of 8 weighs more than a class of 1), by what
 * happened to the student's lesson:
 *   as planned  — it ran as booked
 *   moved       — the student was moved to another session (still studied)
 *   shifted     — the session itself moved to another day / time (still studied)
 *   leave       — the student did not come (recorded leave)            ┐ did NOT study
 *   cancelled   — the session was cancelled                            ┘
 * `delivered` = planned + moved + shifted (they studied); `rate` = planned ÷ total; `deliveredRate` = delivered ÷ total.
 * (Attendance itself is automatic now — everyone counts as present — so "present" is not a thing to measure.)
 */
export interface PlanFit { total: number; planned: number; moved: number; shifted: number; leave: number; cancelled: number; delivered: number; rate: number | null; deliveredRate: number | null }

type S = Pick<Session, "id" | "date" | "cancelled" | "studentIds" | "rescheduledIn" | "rescheduledOut" | "changed">

/** a session moved by drag / edit leaves this trace (store `moveSession` tracker) */
export const wasShifted = (s: Pick<Session, "changed">) => s.changed?.what === "ย้ายคาบ"

export function planFit(sessions: S[], attendance: Pick<Attendance, "sessionId" | "studentId" | "status">[], range: { from: DateStr; to: DateStr }): PlanFit {
  const leaves = new Map<string, Set<string>>()
  for (const a of attendance) if (a.status === "leave") leaves.set(a.sessionId, (leaves.get(a.sessionId) ?? new Set()).add(a.studentId))
  let total = 0, leave = 0, moved = 0, shifted = 0, cancelled = 0
  for (const s of sessions) {
    if (s.date < range.from || s.date > range.to) continue
    const inbound = new Set(s.rescheduledIn ?? [])
    const roster = s.studentIds.filter((id) => !inbound.has(id)) // students moved IN were counted where they came from
    const out = s.rescheduledOut?.length ?? 0
    total += roster.length + out
    moved += out
    if (s.cancelled) cancelled += roster.length
    else {
      const l = leaves.get(s.id)
      const away = l ? roster.filter((id) => l.has(id)).length : 0
      leave += away
      if (wasShifted(s)) shifted += roster.length - away // a student on leave in a moved session is a leave, not a shift
    }
  }
  const planned = total - leave - moved - shifted - cancelled
  const delivered = planned + moved + shifted
  return { total, planned, moved, shifted, leave, cancelled, delivered, rate: total ? planned / total : null, deliveredRate: total ? delivered / total : null }
}
