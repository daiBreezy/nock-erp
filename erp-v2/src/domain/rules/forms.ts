// Test/Trial parent-facing form: candidate time-slot search (admin-defined generic times +
// real existing class occurrences) and the pure mapper used to book an approved generic slot
// as a real Session. Labels here were previously duplicated between lead-sheet.tsx and
// liff/form/page.tsx.

import { staffAt } from "./permissions"
import { addDays, at, fromMinutes, overlaps, toMinutes, weekdayOf } from "../dates"
import type { Assessment, Attendance, Branch, Course, DateStr, EnrollClassOffer, Family, FormOfferSlot, FormParentInput, FormPick, FormPrefill, FormSubjectOffer, FormType, Holiday, ID, Klass, Lead, LeadStage, Result, Session, Staff, Student, TimeStr } from "../types"
import { classCapacity, hoursFor, isHoliday, sessionState, slotProblem, teachersOf, validateClass } from "./scheduling"

export const FORM_TYPE_LABEL: Record<FormType, string> = { test: "สอบวัดระดับ", trial: "ทดลองเรียน" }

/**
 * What to pre-fill in the next form for this lead (owner 2026-09-29: after the Test form the Trial form must
 * not start empty). The family on file wins; otherwise the lead's own name/phone. Every child already in the
 * family comes along with the subjects they showed interest in (their past tests/trials).
 */
export function buildFormPrefill(input: {
  lead: Pick<Lead, "name" | "phone" | "lineId" | "childGrade" | "subject" | "source">
  family?: Family
  students: Pick<Student, "id" | "name" | "nickname" | "grade" | "birthDate" | "note" | "school" | "schoolId" | "nameEn" | "nicknameEn" | "gender" | "targetSchools">[]
  assessments: Pick<Assessment, "studentId" | "subject">[]
}): FormPrefill {
  const f = input.family
  const parents: FormParentInput[] = f?.parents.length
    ? f.parents.map((p) => ({ name: p.name, nameEn: p.nameEn, phone: p.phone, email: p.email, relationship: p.relationship, birthDate: p.birthDate, lineId: p.lineId, altPhones: p.altPhones, primary: p.primary }))
    : [{ name: input.lead.name, phone: input.lead.phone, lineId: input.lead.lineId || undefined, primary: true }]
  return {
    parents,
    familyName: f?.name, familyNameEn: f?.nameEn, childGrade: input.lead.childGrade || undefined,
    address: f?.address, addressParts: f?.addressParts, postcode: f?.postcode, province: f?.province, location: f?.location, addressNote: f?.addressNote,
    acquisitions: f?.sources?.length ? f.sources : [input.lead.source], taxInfo: f?.taxInfo,
    students: input.students.map((s) => ({
      name: s.name, nickname: s.nickname, grade: s.grade, birthDate: s.birthDate, school: s.school, note: s.note,
      nameEn: s.nameEn, nicknameEn: s.nicknameEn, gender: s.gender, schoolId: s.schoolId, targetSchools: s.targetSchools,
      interests: [...new Set(input.assessments.filter((a) => a.studentId === s.id).map((a) => a.subject))],
    })),
  }
}
/** approving a form only books the visit — the lead is "นัดสอบ / นัดทดลอง" until the child actually shows up (E2E 2026-09-28) */
export const APPROVE_STAGE: Record<FormType, LeadStage> = { test: "test_scheduled", trial: "trial_scheduled" }
/** marked "มา" in that session → the test/trial really happened */
export const ATTENDED_STAGE: Record<FormType, LeadStage> = { test: "tested", trial: "trialed" }

/**
 * A form can book several subjects on different days: the lead only moves to "สอบแล้ว" / "ทดลองเรียนแล้ว"
 * once the child came to every one of them (owner 2026-10-29) — still a lead until the invoice is paid.
 */
export function allAssessmentsAttended(leadId: ID, type: FormType, all: Assessment[], attendance: Pick<Attendance, "sessionId" | "studentId" | "status">[]) {
  return all
    .filter((a) => a.leadId === leadId && a.type === type)
    .every((a) => attendance.some((x) => x.sessionId === a.sessionId && x.studentId === a.studentId && x.status === "present"))
}

/** test/trial session moved to another day/time → the record follows (date/start are kept only for history if the session is gone) */
export function assessmentsFollowSessions(all: Assessment[], sessions: Pick<Session, "id" | "date" | "start">[]): Assessment[] {
  const byId = new Map(sessions.map((x) => [x.id, x]))
  return all.map((a) => { const se = byId.get(a.sessionId); return se && (se.date !== a.date || se.start !== a.start) ? { ...a, date: se.date, start: se.start } : a })
}

/** "สอบวัดระดับ" / "ทดลองเรียน" for a session, or null for a normal class session */
export function sessionKindLabel(s: Pick<Session, "trial" | "assessment">): string | null {
  if (s.assessment) return FORM_TYPE_LABEL[s.assessment]
  return s.trial ? "ทดลองเรียน" : null
}

/** the student's test/trial in this session, if any (also covers a trial inside a real class session) */
export function assessmentIn(sessionId: ID, studentId: ID, all: Assessment[]) {
  return all.find((a) => a.sessionId === sessionId && a.studentId === studentId)
}

/** owner 2026-11-18: a Test/Trial session (everyone in it is on a test/trial form, no package) has no lesson summary
 *  and no leave — the purple Note holds the result instead. An empty session is not one. */
export function isAssessmentSession(sessionId: ID, studentIds: ID[], all: Assessment[]) {
  return studentIds.length > 0 && studentIds.every((sid) => !!assessmentIn(sessionId, sid, all))
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

/**
 * Times a child can do several subjects in ONE visit (owner 2026-09-30): only date+start every chosen subject
 * offers, shown as one list — 1 subject = 1 h, 2+ subjects = one 2-hour block. Picking one sets every subject.
 */
export function commonSlots(offers: FormSubjectOffer[], subjects: string[]): { date: DateStr; start: TimeStr; minutes: number; bySubject: Record<string, FormOfferSlot> }[] {
  const chosen = offers.filter((o) => subjects.includes(o.subject))
  if (!chosen.length) return []
  const [first, ...rest] = chosen
  return first.slots
    .flatMap((s) => {
      const bySubject: Record<string, FormOfferSlot> = { [first.subject]: s }
      for (const o of rest) {
        const match = o.slots.find((x) => x.date === s.date && x.start === s.start)
        if (!match) return []
        bySubject[o.subject] = match
      }
      // one 2-hour visit: every slot must be a free hour (not someone's class) that can grow to 2 hours
      if (chosen.length > 1 && Object.values(bySubject).some((x) => x.source !== "generic" || x.fits2h === false)) return []
      return [{ date: s.date, start: s.start, minutes: chosen.length > 1 ? COMBINED_MINUTES : s.minutes, bySubject }]
    })
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
}

function slotsOverlap(aStart: TimeStr, aMinutes: number, bStart: TimeStr, bMinutes: number) {
  const a0 = toMinutes(aStart), a1 = a0 + aMinutes
  const b0 = toMinutes(bStart), b1 = b0 + bMinutes
  return overlaps(a0, a1, b0, b1)
}

/** Editing a Test with 2+ subjects asks first (owner 2026-11-18): change ONE subject (the times may then differ) or move ALL of them
 *  together (still one visit). A Trial never asks — its subjects are booked separately and can never share a time. */
export function canEditTogether(type: FormType, picks: unknown[]): boolean {
  return type === "test" && picks.length >= 2
}

/** Trial (owner 2026-11-18): a child can try several subjects on the same DAY but never two at the same TIME — does this
 *  slot overlap one the child already picked for another subject? `except` = the subject being (re)picked. */
export function slotClashes(slot: Pick<FormOfferSlot, "date" | "start" | "minutes">, chosen: Record<string, Pick<FormOfferSlot, "date" | "start" | "minutes">>, except?: string): boolean {
  return Object.entries(chosen).some(([subject, x]) => subject !== except && x.date === slot.date && slotsOverlap(x.start, x.minutes, slot.start, slot.minutes))
}

/** every subject picked separately (Trial) → no two picks may overlap in time */
export function picksClash(chosen: Record<string, Pick<FormOfferSlot, "date" | "start" | "minutes">>): boolean {
  return Object.entries(chosen).some(([subject, x]) => slotClashes(x, chosen, subject))
}

/**
 * Trial (owner 2026-11-20): a Lead / child counts the Trial per SUBJECT — one Trial per subject. A second Trial in a subject they already tried
 * is still allowed, but the admin must be warned and write a reason. Earlier Trials = this Lead's (or the child it became) Trial assessments in
 * that subject whose session still stands (a cancelled session is not a Trial that happened). `exceptSubmissionId` = the submission being approved.
 */
export function priorTrials(assessments: Assessment[], sessions: Pick<Session, "id" | "cancelled">[], who: { leadId?: ID | null; studentId?: ID | null }, subject: string, exceptSubmissionId?: ID): Assessment[] {
  return assessments.filter((a) =>
    a.type === "trial" && a.subject === subject && !(exceptSubmissionId && a.submissionId === exceptSubmissionId)
    && ((!!who.leadId && a.leadId === who.leadId) || (!!who.studentId && a.studentId === who.studentId))
    && sessions.some((x) => x.id === a.sessionId && !x.cancelled))
}

/** which of these subjects has the Lead already tried? (empty = a normal first Trial) */
export function repeatTrials(assessments: Assessment[], sessions: Pick<Session, "id" | "cancelled">[], who: { leadId?: ID | null; studentId?: ID | null }, subjects: string[], exceptSubmissionId?: ID): { subject: string; prior: Assessment[] }[] {
  return [...new Set(subjects)].map((subject) => ({ subject, prior: priorTrials(assessments, sessions, who, subject, exceptSubmissionId) })).filter((x) => x.prior.length > 0)
}

/** First subject-qualified, active teacher of this branch with no overlapping session that date. */
/** every teacher who could take this time — qualified for the subject at the branch and free the whole stretch (owner 2026-11-19: the Test / Trial dialog
 *  shows how many, and lets the admin choose who takes the class) */
export function freeTeachersAt(staff: Staff[], sessions: Session[], branchId: ID, subject: string, date: DateStr, start: TimeStr, minutes: number): Staff[] {
  const qualified = staff.map((t) => staffAt(t, branchId)).filter((t) => t.active && t.roles.includes("teacher") && t.branchIds.includes(branchId) && t.subjects.includes(subject))
  const daySessions = sessions.filter((s) => !s.cancelled && s.branchId === branchId && s.date === date)
  return qualified.filter((t) => !daySessions.some((s) => teachersOf(s).includes(t.id) && slotsOverlap(s.start, s.minutes, start, minutes)))
}

/**
 * owner 2026-11-20: subjects (and children) in ONE visit have ONE teacher — any teacher free for the whole stretch who teaches AT LEAST ONE of the subjects
 * (a Maths + English visit is fine with a Maths teacher or an English teacher). Order = the order of `subjects`, then the staff list.
 */
export function visitTeachersAt(staff: Staff[], sessions: Session[], branchId: ID, subjects: string[], date: DateStr, start: TimeStr, minutes: number): Staff[] {
  const seen = new Set<ID>()
  const out: Staff[] = []
  for (const sj of subjects) for (const t of freeTeachersAt(staff, sessions, branchId, sj, date, start, minutes)) if (!seen.has(t.id)) { seen.add(t.id); out.push(t) }
  return out
}

/**
 * owner 2026-11-20: the times a shared visit can be offered. Each subject's free times (a qualified teacher + a room) are merged: a time is offered when ANY of the
 * subjects has a free teacher then, and it is handed to every subject (the one visit has one teacher). Ids are renumbered so no two times share one.
 * Only free (generic) times — and, with more than one subject, only those that can grow to the 2-hour visit.
 */
export function visitOffers(offers: FormSubjectOffer[], subjects: string[]): FormSubjectOffer[] {
  const mine = offers.filter((o) => subjects.includes(o.subject))
  const need2h = subjects.length > 1
  const byTime = new Map<string, FormOfferSlot>()
  for (const o of mine) for (const x of o.slots) {
    if (x.source !== "generic" || (need2h && x.fits2h === false)) continue
    const key = `${x.date} ${x.start}`
    if (!byTime.has(key)) byTime.set(key, x)
  }
  const merged = [...byTime.values()].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((x, i) => ({ ...x, id: `off_v${i}` }))
  return subjects.map((subject) => ({ subject, slots: merged }))
}

function freeTeacher(staff: Staff[], sessions: Session[], branchId: ID, subject: string, date: DateStr, start: TimeStr, minutes: number): ID | null {
  return freeTeachersAt(staff, sessions, branchId, subject, date, start, minutes)[0]?.id ?? null
}

function teacherFree(sessions: Session[], branchId: ID, teacherId: ID, date: DateStr, start: TimeStr, minutes: number) {
  return !sessions.some((s) => !s.cancelled && s.branchId === branchId && s.date === date && teachersOf(s).includes(teacherId) && slotsOverlap(s.start, s.minutes, start, minutes))
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
  courses?: Pick<Course, "id" | "maxStudents">[]
  /** owner 2026-11-20: offered "by course" — only these classes' sessions are offered (the picked courses' own classes), not every class of the subject */
  classIds?: ID[]
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
      // booking runs validateClass, which also blocks when every room's worth of sessions overlaps (even ones with no
      // room set) — offer only what that check will accept, or a staff-picked slot fails at the final step (owner 2026-11-18)
      const overlapping = sessions.filter((x) => !x.cancelled && x.branchId === branch.id && x.date === date && slotsOverlap(x.start, x.minutes, start, minutes)).length
      if (overlapping + 1 > branch.rooms.length) continue
      // can this hour grow into a 2-hour visit (several subjects the same day)? same teacher, any room, still open
      const fits2h = !slotProblem(branch, date, start, COMBINED_MINUTES) && teacherFree(sessions, branch.id, teacherId, date, start, COMBINED_MINUTES) && !!freeRoom(branch, sessions, date, start, COMBINED_MINUTES)
      out.push({ id: `off_g${gi++}`, date, start, minutes, source: "generic", teacherId, roomId, classId: null, sessionId: null, fits2h })
    }
  }

  // real occurrences of an existing class, while it still has a seat
  let ci = 0
  for (const s of sessions) {
    if (s.cancelled || s.branchId !== branch.id || s.subject !== subject || !s.classId) continue
    if (params.classIds && !params.classIds.includes(s.classId)) continue
    if (s.date < from || s.date > to) continue
    if (isHoliday(s.date, branch.id, holidays)) continue
    if (at(s.date, s.start) < now) continue
    const klass = classes.find((k) => k.id === s.classId)
    const cap = classCapacity(klass)
    if (s.studentIds.length >= cap) continue
    out.push({ id: `off_c${ci++}`, date: s.date, start: s.start, minutes: s.minutes, source: "class", teacherId: s.teacherId, roomId: s.roomId, classId: s.classId, sessionId: s.id })
  }

  return out.sort((a, b) => (a.date === b.date ? toMinutes(a.start) - toMinutes(b.start) : a.date < b.date ? -1 : 1))
}

const TH_DAY = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
const TH_MONTH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
/** Inbox › Calendar Preview (owner 2026-10-22): the times the admin ticked → a reply for the parent, one line per day,
 *  always Thai (it goes to the parent, whatever language the admin's screen is in) */
export function freeTimesReply(subject: string, picks: { date: DateStr; start: TimeStr; end: TimeStr }[]): string {
  const days = new Map<DateStr, string[]>()
  for (const p of [...picks].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))) days.set(p.date, [...(days.get(p.date) ?? []), `${p.start}–${p.end}`])
  const lines = [...days].map(([date, times]) => { const d = new Date(`${date}T00:00:00`); return `• ${TH_DAY[d.getDay()]} ${d.getDate()} ${TH_MONTH[d.getMonth()]} ${times.join(", ")}` })
  return `ช่วงเวลาที่ว่างสำหรับ${subject ? `วิชา${subject}` : "เรียน"}ค่ะ\n${lines.join("\n")}\nสะดวกช่วงไหนแจ้งได้เลยนะคะ 😊`
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
    // one visit = one teacher for every subject (owner 2026-11-20) — no co-teachers
    teacherId: first.slot.teacherId,
    coTeacherIds: [],
    roomId,
    studentIds: [studentId],
    trial: true,
    assessment: type,
  }
}

/**
 * grill #2 (owner 2026-10-27): the result of a prior approval of this submission, if any — so re-approving
 * is a no-op instead of a second student/session/assessment. Assessments carry their submissionId; the
 * earliest-booked one holds the sessionId/studentId/leadId the first approval returned.
 */
export function priorApproval(
  submissionId: ID,
  assessments: Pick<Assessment, "submissionId" | "sessionId" | "studentId" | "leadId" | "date" | "start">[],
): { sessionId: ID; studentId: ID; leadId: ID } | null {
  const mine = assessments.filter((a) => a.submissionId === submissionId)
  if (!mine.length) return null
  const first = [...mine].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
  return { sessionId: first.sessionId, studentId: first.studentId, leadId: first.leadId }
}

/** One booking an approval will make: join an existing class occurrence, or create a new session from a generic slot. */
export type ApprovalBooking =
  | { kind: "join"; subject: string; sessionId: ID }
  | { kind: "new"; subject: string; draft: Omit<Session, "id" | "customized" | "cancelled"> }

export type ApprovalPlan = { oneVisit: boolean; combinedDraft?: Omit<Session, "id" | "customized" | "cancelled">; bookings: ApprovalBooking[]; /** a sibling's approval already booked this very visit — join it instead of booking a second one */ joinSessionId?: ID }

/** owner 2026-11-20: brothers/sisters on one Test come together — the 2nd child's approval joins the visit the 1st one booked
 *  (same day, time, teacher and room as the offered slot) instead of clashing with it. */
export function siblingVisit(sessions: Session[], slot: FormOfferSlot, branchId: ID, type: FormType): Session | undefined {
  if (type !== "test" || slot.source !== "generic") return undefined
  return sessions.find((x) => !x.cancelled && x.trial && x.assessment === type && x.branchId === branchId && x.date === slot.date && x.start === slot.start && x.teacherId === slot.teacherId && x.roomId === slot.roomId)
}

/**
 * grill #1 (owner 2026-10-27): approving a multi-subject form must be all-or-nothing. The old loop booked
 * each pick and `set` it immediately, so a later pick failing (a teacher/room taken since the link was sent)
 * left the earlier pick as an orphan Session — in the calendar, but with no Assessment and no lead advance.
 * This proves EVERY pick is bookable first — same block rules as store.addSession / addStudentToSession,
 * and later generic picks see the earlier ones so two picks can't silently claim one teacher/room — and
 * returns the whole plan, or the first reason it can't be done. The store creates nothing until this is ok.
 * Drafts carry no studentId (studentIds: []): the store fills in the real one at commit, after the plan passes.
 */
export function planApproval(params: {
  picks: FormPick[]
  type: FormType
  branch: Branch
  staff: Staff[]
  sessions: Session[]
  holidays: Holiday[]
  now: Date
  /** the child's existing Student id when returning — only used to block "already in this class", exactly as addStudentToSession does */
  returningStudentId?: ID | null
}): Result<ApprovalPlan> {
  const { picks, type, branch, staff, sessions, holidays, now, returningStudentId } = params
  if (!picks.length) return { ok: false, error: "ยังไม่ได้เลือกช่วงเวลา" }

  const blockNew = (draft: Omit<Session, "id" | "customized" | "cancelled">, against: Session[]): string | null => {
    if (isHoliday(draft.date, branch.id, holidays)) return "วันนั้นเป็นวันหยุด"
    const issues = validateClass(
      { ...draft, kind: "other", type: "group", weekday: weekdayOf(draft.date), startDate: draft.date, overrideReason: "session" },
      { branch, staff, sessions: against, holidays, now },
    ).filter((i) => i.level === "block")
    return issues[0]?.message ?? null
  }

  const first = picks[0].chosenSlot
  const oneVisit = picks.length >= 2 && picks.every((p) => p.chosenSlot.date === first.date && p.chosenSlot.start === first.start)

  if (oneVisit) {
    const combinedDraft = buildCombinedSessionDraft(picks.map((p) => ({ subject: p.chosenSubject, slot: p.chosenSlot })), branch.id, "", branch, sessions, type)
    if (!combinedDraft) return { ok: false, error: "รวมช่วงเวลานี้เป็นคาบเดียวไม่ได้" }
    const sib = siblingVisit(sessions, first, branch.id, type)
    if (sib) return { ok: true, value: { oneVisit: true, combinedDraft, joinSessionId: sib.id, bookings: picks.map((p) => ({ kind: "join", subject: p.chosenSubject, sessionId: sib.id })) } }
    const err = blockNew(combinedDraft, sessions)
    if (err) return { ok: false, error: err }
    return { ok: true, value: { oneVisit: true, combinedDraft, bookings: picks.map((p) => ({ kind: "new", subject: p.chosenSubject, draft: combinedDraft })) } }
  }

  const working = [...sessions]
  const bookings: ApprovalBooking[] = []
  for (const p of picks) {
    if (p.chosenSlot.source === "class") {
      const se = sessions.find((x) => x.id === p.chosenSlot.sessionId)
      if (!se || se.cancelled || sessionState(se, now) === "closed") return { ok: false, error: `คาบของวิชา${p.chosenSubject}ปิดหรือยกเลิกไปแล้ว — เลือกช่วงใหม่` }
      if (returningStudentId && se.studentIds.includes(returningStudentId)) return { ok: false, error: `นักเรียนอยู่ในคาบของวิชา${p.chosenSubject}แล้ว` }
      bookings.push({ kind: "join", subject: p.chosenSubject, sessionId: p.chosenSlot.sessionId! })
    } else {
      const sib = siblingVisit(sessions, p.chosenSlot, branch.id, type)
      if (sib) { bookings.push({ kind: "join", subject: p.chosenSubject, sessionId: sib.id }); continue }
      const draft = buildSessionDraftFromSlot(p.chosenSlot, p.chosenSubject, branch.id, "", type)
      const err = blockNew(draft, working)
      if (err) return { ok: false, error: `วิชา${p.chosenSubject}: ${err}` }
      working.push({ ...draft, id: `pf_${working.length}`, customized: true, cancelled: false })
      bookings.push({ kind: "new", subject: p.chosenSubject, draft })
    }
  }
  return { ok: true, value: { oneVisit: false, bookings } }
}

/** owner 2026-10-15: the classes an admin can offer in an enroll form — this branch's running weekly classes for
 *  learning, with seats left; the admin ticks which to send */
export function enrollClassOffers(classes: Klass[], branchId: ID, teacherName: (id: ID) => string): EnrollClassOffer[] {
  return classes
    .filter((k) => k.branchId === branchId && k.active && k.kind === "learning" && !k.periodId)
    .map((k) => ({ id: k.id, name: k.name, subjects: k.subjects?.length ? k.subjects : [k.subject], grades: k.grades, weekday: k.weekday, start: k.start, minutes: k.minutes,
      teacher: k.teacherId ? teacherName(k.teacherId) : undefined, seatsLeft: Math.max(0, classCapacity(k) - k.studentIds.length) }))
    .sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start))
}
/** a child is ready on a class-offer form: at least one class + a start date */
export const enrollClassValid = (v: { classIds?: ID[]; startDate: string }) => (v.classIds?.length ?? 0) > 0 && !!v.startDate
