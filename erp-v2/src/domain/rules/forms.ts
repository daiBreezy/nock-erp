// Test/Trial parent-facing form: candidate time-slot search (admin-defined generic times +
// real existing class occurrences) and the pure mapper used to book an approved generic slot
// as a real Session. Labels here were previously duplicated between lead-sheet.tsx and
// liff/form/page.tsx.

import { addDays, at, fromMinutes, overlaps, toMinutes } from "../dates"
import type { Assessment, Branch, DateStr, FormOfferSlot, FormType, Holiday, ID, Klass, LeadStage, Session, Staff, TimeStr } from "../types"
import { CAPACITY, hoursFor, isHoliday, slotProblem, teachersOf } from "./scheduling"

export const FORM_TYPE_LABEL: Record<FormType, string> = { test: "สอบวัดระดับ", trial: "ทดลองเรียน" }
/** approving a form only books the visit — the lead is "นัดสอบ / นัดทดลอง" until the child actually shows up (E2E 2026-09-28) */
export const APPROVE_STAGE: Record<FormType, LeadStage> = { test: "test_scheduled", trial: "trial_scheduled" }
/** marked "มา" in that session → the test/trial really happened */
export const ATTENDED_STAGE: Record<FormType, LeadStage> = { test: "tested", trial: "trialed" }

/** "สอบวัดระดับ" / "ทดลองเรียน" for a session, or null for a normal class session */
export function sessionKindLabel(s: Pick<Session, "trial" | "assessment">): string | null {
  if (s.assessment) return FORM_TYPE_LABEL[s.assessment]
  return s.trial ? "ทดลองเรียน" : null
}

/** the student's test/trial in this session, if any (also covers a trial inside a real class session) */
export function assessmentIn(sessionId: ID, studentId: ID, all: Assessment[]) {
  return all.find((a) => a.sessionId === sessionId && a.studentId === studentId)
}

/**
 * Flow is Test → Trial → Invoice, and the parent picks the start date only after both (owner 2026-09-28):
 * paid classes must start after the last test/trial, so a trial session is never billed.
 */
export function lastAssessmentDate(studentId: ID, all: Assessment[]): DateStr | null {
  return all.filter((a) => a.studentId === studentId).reduce<DateStr | null>((m, a) => (!m || a.date > m ? a.date : m), null)
}

/** Every whole-hour start inside the branch's opening hours that day (owner 2026-09-28: free slots
 *  come from real availability, not a fixed list) — closing time is filtered later by slotProblem. */
export function openHourStarts(branch: Branch, date: DateStr): TimeStr[] {
  const h = hoursFor(branch, date)
  if (!h) return []
  const out: TimeStr[] = []
  for (let m = Math.ceil(toMinutes(h.open) / 60) * 60; m < toMinutes(h.close); m += 60) out.push(fromMinutes(m))
  return out
}

/** Same-day, multi-subject picks share one room for one fixed 2-hour block instead of stacking
 *  a separate room/time per subject — the parent only has to show up once. */
export const COMBINED_MINUTES = 120

function slotsOverlap(aStart: TimeStr, aMinutes: number, bStart: TimeStr, bMinutes: number) {
  const a0 = toMinutes(aStart), a1 = a0 + aMinutes
  const b0 = toMinutes(bStart), b1 = b0 + bMinutes
  return overlaps(a0, a1, b0, b1)
}

/** First subject-qualified, active teacher of this branch with no overlapping session that date. */
function freeTeacher(staff: Staff[], sessions: Session[], branchId: ID, subject: string, date: DateStr, start: TimeStr, minutes: number): ID | null {
  const qualified = staff.filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branchId) && t.subjects.includes(subject))
  const daySessions = sessions.filter((s) => !s.cancelled && s.branchId === branchId && s.date === date)
  const free = qualified.find((t) => !daySessions.some((s) => teachersOf(s).includes(t.id) && slotsOverlap(s.start, s.minutes, start, minutes)))
  return free?.id ?? null
}

/** First room of the branch with no overlapping session that date. */
export function freeRoom(branch: Branch, sessions: Session[], date: DateStr, start: TimeStr, minutes: number): ID | null {
  const daySessions = sessions.filter((s) => !s.cancelled && s.branchId === branch.id && s.date === date)
  const free = branch.rooms.find((r) => !daySessions.some((s) => s.roomId === r.id && slotsOverlap(s.start, s.minutes, start, minutes)))
  return free?.id ?? null
}

/**
 * Candidate slots to offer a parent for one subject/date-range: every free whole hour
 * (only when a qualified teacher AND a room are genuinely free) plus real occurrences of an
 * existing class in range (only while it still has capacity). Every slot returned is, by
 * construction, feasible at this instant — re-validated for real at approve time.
 */
export function findOfferSlots(params: {
  branch: Branch
  staff: Staff[]
  sessions: Session[]
  classes: Klass[]
  holidays: Holiday[]
  subject: string
  from: DateStr
  to: DateStr
  now: Date
  minutes?: number
}): FormOfferSlot[] {
  const { branch, staff, sessions, classes, holidays, subject, from, to, now } = params
  const minutes = params.minutes ?? branch.defaultSessionMinutes
  const out: FormOfferSlot[] = []

  // free time: every hour the branch is open where a qualified teacher and a room are both free
  let gi = 0
  for (let date = from; date <= to; date = addDays(date, 1)) {
    if (isHoliday(date, branch.id, holidays)) continue
    for (const start of openHourStarts(branch, date)) {
      if (at(date, start) < now) continue
      if (slotProblem(branch, date, start, minutes)) continue
      const teacherId = freeTeacher(staff, sessions, branch.id, subject, date, start, minutes)
      if (!teacherId) continue
      const roomId = freeRoom(branch, sessions, date, start, minutes)
      if (!roomId) continue
      out.push({ id: `off_g${gi++}`, date, start, minutes, source: "generic", teacherId, roomId, classId: null, sessionId: null })
    }
  }

  // real occurrences of an existing class, while it still has a seat
  let ci = 0
  for (const s of sessions) {
    if (s.cancelled || s.branchId !== branch.id || s.subject !== subject || !s.classId) continue
    if (s.date < from || s.date > to) continue
    if (isHoliday(s.date, branch.id, holidays)) continue
    if (at(s.date, s.start) < now) continue
    const klass = classes.find((k) => k.id === s.classId)
    const cap = klass ? CAPACITY[klass.type] : CAPACITY.group
    if (s.studentIds.length >= cap) continue
    out.push({ id: `off_c${ci++}`, date: s.date, start: s.start, minutes: s.minutes, source: "class", teacherId: s.teacherId, roomId: s.roomId, classId: s.classId, sessionId: s.id })
  }

  return out.sort((a, b) => (a.date === b.date ? toMinutes(a.start) - toMinutes(b.start) : a.date < b.date ? -1 : 1))
}

/** Maps an approved "generic" slot to a Session draft ready for store.addSession — trial:true
 *  for both form types since both precede payment. */
export function buildSessionDraftFromSlot(slot: FormOfferSlot, subject: string, branchId: ID, studentId: ID, type: FormType): Omit<Session, "id" | "customized" | "cancelled"> {
  return {
    branchId,
    classId: null,
    subject,
    date: slot.date,
    start: slot.start,
    minutes: slot.minutes,
    teacherId: slot.teacherId,
    coTeacherIds: [],
    roomId: slot.roomId,
    studentIds: [studentId],
    trial: true,
    assessment: type,
  }
}

/**
 * Two or more subjects picked for the same date+start don't stack into separate rooms — they
 * become one shared 2-hour block in one room instead, so the parent visits once. Only "generic"
 * slots can combine this way (an existing class's session can't be re-timed/re-roomed to match).
 */
export function buildCombinedSessionDraft(
  picks: { subject: string; slot: FormOfferSlot }[],
  branchId: ID,
  studentId: ID,
  branch: Branch,
  sessions: Session[],
  type: FormType,
): Omit<Session, "id" | "customized" | "cancelled"> | null {
  if (picks.length < 2) return null
  if (picks.some((p) => p.slot.source !== "generic")) return null
  const [first, ...rest] = picks
  if (rest.some((p) => p.slot.date !== first.slot.date || p.slot.start !== first.slot.start)) return null
  const roomId = freeRoom(branch, sessions, first.slot.date, first.slot.start, COMBINED_MINUTES) ?? first.slot.roomId
  return {
    branchId,
    classId: null,
    subject: picks.map((p) => p.subject).join(" + "),
    date: first.slot.date,
    start: first.slot.start,
    minutes: COMBINED_MINUTES,
    teacherId: first.slot.teacherId,
    coTeacherIds: picks.slice(1).map((p) => p.slot.teacherId).filter((id): id is ID => !!id),
    roomId,
    studentIds: [studentId],
    trial: true,
    assessment: type,
  }
}
