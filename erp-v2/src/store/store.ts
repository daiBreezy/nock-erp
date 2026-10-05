"use client"

// Single app store. Every mutating action goes through a domain rule and returns a Result,
// so the UI can always show success or a human-readable error (no silent failures).

import { create } from "zustand"
import { persist } from "zustand/middleware"
import { buildSeed, uid, type DB } from "@/data/seed"
import { addDays, at, fmtDate, fmtMoney, nextWeekday, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import * as Bill from "@/domain/rules/billing"
import * as Refund from "@/domain/rules/refunds"
import * as Seats from "@/domain/rules/seats"
import * as Les from "@/domain/rules/lessons"

export type SummaryLesson = { bookId?: ID; topicId?: ID; detail?: string }
import * as CRM from "@/domain/rules/crm"
import * as Inbox from "@/domain/rules/inbox"
import { can, canDeactivateStaff, canEditBlocks, inBranch, OFFICE_ROLES, require as requirePerm } from "@/domain/rules/permissions"
import * as Sch from "@/domain/rules/scheduling"
import * as Sum from "@/domain/rules/summaries"
import * as People from "@/domain/rules/people"
import * as Forms from "@/domain/rules/forms"
import * as CourseR from "@/domain/rules/course"
import * as Notif from "@/domain/rules/notifications"
import * as Cfg from "@/domain/rules/settings"
import * as Msg from "@/domain/rules/messages"
import * as Loss from "@/domain/rules/loss"
import * as Survey from "@/domain/rules/survey"
import { toast } from "sonner"
import type { SurveyCampaign, SurveyResponse, EnrollSubmission, ContactChannel, ContactResult, LossReason, Assessment, AttendanceStatus, Entitlement, Branch, BusAddOn, ClassBlock, CreditNote, LessonBook, LessonTopic, Seat, ChatMessage, Conversation, Course, DateStr, Family, FormSubmission, Holiday, ID, Invoice, Klass, Lead, LeadStage, LessonSummary, LineDelivery, LogCategory, Result, Session, Staff, Student, SystemConfig } from "@/domain/types"

export interface UIState {
  userId: ID
  branchId: ID
  /** demo clock: ms added to the real time */
  clockOffset: number
}

type Store = DB & UIState & {
  now: () => Date
  me: () => Staff
  setUser: (id: ID) => void
  setBranch: (id: ID) => void
  setClockOffset: (ms: number) => void
  resetData: () => void

  createClass: (d: Sch.ClassDraft & { name: string; grades: string[] }) => Result<{ klass: Klass; sessions: number }>
  /** Create New Class (owner design): one form → one class per row of weekday + start–end time */
  createClasses: (base: Omit<Sch.ClassDraft, "weekday" | "start" | "minutes"> & { name: string; grades: string[] }, rows: { weekday: Klass["weekday"]; start: string; minutes: number }[]) => Result<{ classes: number; sessions: number }>
  updateClass: (id: ID, patch: Partial<Pick<Klass, "teacherId" | "coTeacherIds" | "roomId" | "start" | "minutes" | "weekday" | "name">>) => Result<{ changed: number; kept: number }>
  moveSession: (id: ID, target: Sch.MoveTarget, scope: Sch.MoveScope) => Result<{ moved: number; kept: number }>
  deactivateClass: (id: ID, reason: string) => Result<{ cancelled: number }>
  addSession: (s: Omit<Session, "id" | "customized" | "cancelled">) => Result<Session>
  editSession: (id: ID, patch: Partial<Pick<Session, "date" | "start" | "minutes" | "teacherId" | "roomId">>) => Result
  cancelSession: (id: ID, reason: string) => Result<{ students: number }>
  updateSessionTeachers: (id: ID, teacherId: ID | null, coTeacherIds: ID[], scope: Sch.MoveScope) => Result<{ changed: number; kept: number }>
  addStudentToSession: (id: ID, studentId: ID, scope: Sch.MoveScope) => Result<{ changed: number }>

  /** branchId null = company holiday (System, Director) · branchId set = that branch's own holiday (Admin/Manager of the branch) */
  addHoliday: (h: Omit<Holiday, "id">, cancelAffected: boolean) => Result<{ affected: number }>
  updateHoliday: (id: ID, patch: Pick<Holiday, "name" | "date" | "category">) => Result
  removeHoliday: (id: ID) => Result
  /** per-branch toggle on a company holiday: open = the branch works that day */
  setHolidayOpen: (holidayId: ID, branchId: ID, open: boolean, cancelAffected: boolean) => Result<{ affected: number }>
  saveFamily: (f: Family) => Result<Family>
  generateLineCode: (familyId: ID) => Result<{ code: string }>
  simulateLineLink: (familyId: ID, parentIndex: number) => Result
  saveStudent: (s: Student) => Result<Student>
  /** left the school for good (manual) — Active/Inactive is automatic */
  archiveStudent: (id: ID, reason: string) => Result
  restoreStudent: (id: ID) => Result
  addStudentNote: (studentId: ID, text: string) => Result
  saveStaff: (s: Staff) => Result<Staff>
  deactivateStaff: (id: ID, replacementId: ID | null) => Result<{ reassigned: number }>
  reactivateStaff: (id: ID) => Result
  saveCourse: (c: Course) => Result<Course>
  duplicateCourse: (id: ID) => Result<Course>
  saveBranch: (b: Branch) => Result
  addBranch: (input: { name: string; code: string; brand: Branch["brand"]; province: string }) => Result<Branch>
  setBranchActive: (id: ID, active: boolean) => Result
  saveSystem: (sys: SystemConfig) => Result
  /** renames a subject in the global catalog and every record that uses it (display name only changes) */
  renameSubject: (from: string, to: string) => Result
  /** marks as read for the current user only */
  markNotificationsRead: (ids?: ID[]) => void
  sendTeamMessage: (target: Notif.MessageTarget, title: string, body: string) => Result
  /** synced from GET /api/line/status, not a user edit — bypasses the Settings draft/save flow */
  setLineOaConnected: (branchId: ID, connected: boolean) => void

  /** leave: noQuota = "ลาไม่หักโควตา" (still extends the package) */
  mark: (sessionId: ID, studentId: ID, status: AttendanceStatus, opts?: { noQuota?: boolean }) => Result
  /** the teacher is on leave: a substitute takes the session, or (no substitute) it is cancelled and every student's
   *  package runs one class longer */
  teacherLeave: (sessionId: ID, input: { reason: string; substituteId: ID | null }) => Result<{ extended: number }>
  /** leave for N sessions from this one (or the group this session belongs to) — count 0 clears the group.
   *  Editable any time: fewer = came back early, more = longer leave. Closed sessions keep their marks. */
  markLeave: (sessionId: ID, studentId: ID, input: { count: number; noQuota: boolean }) => Result<{ marked: number }>
  clearMark: (sessionId: ID, studentId: ID) => Result
  /** present but only part of the time (came 1 of 2 hours) — null = their usual part */
  setAttendedMinutes: (sessionId: ID, studentId: ID, minutes: number | null) => Result
  /** which part of the class the student attends: this session only, or every time (class) — null = the whole class */
  setSeat: (scope: "session" | "class", id: ID, studentId: ID, seat: Seat | null) => Result
  /** free-form reminder for a student in this session ("Math Book Lesson 1 Page 2-6") — empty text removes it */
  setSessionNote: (sessionId: ID, studentId: ID, text: string) => Result
  /** teacher header menu (owner 2026-10-01): one substitute for every session of this teacher on that day */
  substituteTeacherForDay: (teacherId: ID, date: DateStr, substituteId: ID, reason: string) => Result<{ sessions: number }>
  /** emergency: cancel every session of this teacher on that day — each student's package runs one class longer */
  cancelTeacherDay: (teacherId: ID, date: DateStr, reason: string) => Result<{ sessions: number; students: number }>
  /** drag & drop on the teacher board (owner 2026-10-01): move a student to another session — just this one, the next
   *  N of the class, or for good (all following: changes class, the package follows). Undo with undoLastMove. */
  moveStudent: (fromSessionId: ID, studentId: ID, toSessionId: ID, scope: { kind: "one" } | { kind: "count"; n: number } | { kind: "following" }) => Result<{ moved: number }>
  undoLastMove: () => Result
  /** clash fix (owner 2026-10-01): the same teacher twice at the same time → one session; the other is cancelled */
  mergeSessions: (keepId: ID, dropId: ID) => Result<{ students: number }>
  /** class blocks from a date (owner 2026-10-01): "day" = only that date, "following" = that weekday (or group) from then
   *  on; inside a special period the change stays in the period. shift = move classes sitting in a changed block. */
  setDayBlocks: (input: { branchId: ID; date: DateStr; blocks: ClassBlock[]; scope: Sch.BlockScope; days: Sch.BlockDays; shift: boolean }) => Result<{ shifted: number; skipped: number; period: string | null }>
  /** the current user opened (and closed) this session — clears their red dot */
  markSessionSeen: (sessionId: ID) => void
  saveStudentLeave: (input: { id?: ID; studentId: ID; from: DateStr; to: DateStr; reason: string }) => Result
  removeStudentFromClass: (classId: ID, studentId: ID) => Result<{ removedFrom: number }>
  /** added by mistake etc. — this session only, never one that already has a mark */
  removeStudentFromSession: (sessionId: ID, studentId: ID) => Result
  /** Re-schedule inside the same week (owner 2026-09-29) — Admin decides after talking to the parent */
  rescheduleStudent: (fromSessionId: ID, studentId: ID, toSessionId: ID) => Result
  undoReschedule: (fromSessionId: ID, studentId: ID) => Result

  saveSummary: (sessionId: ID, studentId: ID, text: string, submit: boolean, lesson?: SummaryLesson) => Result
  /** "Summary Template": the same Book / Topic / Lesson Detail for every student present in the session (feedback stays per student) */
  applyLessonToSession: (sessionId: ID, lesson: SummaryLesson) => Result<{ count: number }>
  /** Book / Topic catalog — typed once, picked by everyone in the branch; same name (any case/spacing) = the existing one */
  addLessonBook: (branchId: ID, name: string) => Result<LessonBook>
  addLessonTopic: (bookId: ID, name: string) => Result<LessonTopic>
  renameLessonItem: (kind: "book" | "topic", id: ID, name: string) => Result
  /** duplicates made before: move every summary to the kept one, then remove the other */
  mergeLessonItem: (kind: "book" | "topic", fromId: ID, intoId: ID) => Result<{ moved: number }>
  requestSummaryChanges: (id: ID, note: string) => Result
  /** forceRemark set = Force Approve (skip maker–checker) */
  approveSummary: (id: ID, forceRemark?: string) => Result
  sendSummary: (id: ID) => Result<{ delivered: boolean }>

  saveInvoice: (inv: Invoice) => Result<Invoice>
  generatePdf: (id: ID) => Result<{ number: string }>
  approveInvoice: (id: ID, forceRemark?: string) => Result
  sendInvoice: (id: ID, note: string) => Result<{ delivered: boolean }>
  voidInvoice: (id: ID, reason: string) => Result
  /** extra bus days after paying — the bus runs now, the charge waits for the next invoice */
  addBusAddOns: (studentId: ID, days: { date: DateStr; pickup: boolean; dropoff: boolean }[], busFeeId: ID | null, note: string) => Result<{ count: number; amount: number }>
  /** only while not billed yet */
  removeBusAddOn: (id: ID) => Result
  /** refund / credit on a paid invoice — the invoice itself never changes */
  createCreditNote: (input: Pick<CreditNote, "invoiceId" | "mode" | "items" | "reasons" | "remark" | "stopFrom">) => Result<CreditNote>
  approveCreditNote: (id: ID, forceRemark?: string) => Result
  voidCreditNote: (id: ID, reason: string) => Result
  recordRefund: (id: ID, r: { fromAccount: string; date: DateStr; reference: string }) => Result
  recordPayment: (id: ID, p: { amount: number; method: "transfer" | "cash"; reference: string; slip?: string }) => Result
  confirmPayment: (invoiceId: ID, paymentId: ID, forceRemark?: string) => Result<{ paid: boolean }>

  saveLead: (l: Lead) => Result<Lead>
  moveLeadStage: (id: ID, stage: LeadStage) => Result
  addLeadNote: (id: ID, text: string) => Result
  /** the short close-lead form (owner 2026-10-05): step, main + other reasons, where they went, follow-up day */
  archiveLead: (id: ID, input: Loss.LeadLostInput) => Result
  /** a call / LINE follow-up and what came of it — the first one moves a new lead to "กำลังติดต่อ" */
  addLeadFollowUp: (id: ID, input: { channel: ContactChannel; result: ContactResult; note?: string }) => Result
  /** leaving (owner 2026-10-05): the parent told the admin → the exit form went out (token from the server) */
  requestExit: (studentIds: ID[], input: { lastDate: DateStr; token?: string }) => Result
  /** the parent changed their mind */
  cancelExit: (studentId: ID) => Result
  /** close it: archive with a structured reason, out of classes after the last day; "may come back" → a win-back lead */
  closeExit: (studentId: ID, input: Loss.ExitCloseInput) => Result
  /** yearly parent survey (owner 2026-10-05): record a send-out (links minted on the form server) */
  recordSurveySent: (c: Omit<SurveyCampaign, "sentAt" | "sentBy">) => Result
  markSurveyReminded: (campaignId: ID) => Result
  /** answers pulled from the form server (only new ones are added) */
  syncSurveyResponses: (list: SurveyResponse[]) => Result<{ added: number }>
  /** a manager called an unhappy family */
  surveyFollowUp: (responseId: ID, note: string) => Result
  saveSurveyWindow: (w: { from: string; to: string }) => Result
  /** enroll-now (owner 2026-10-05): the branch's Rich Menu link */
  setEnrollLink: (branchId: ID, link: Branch["enrollLink"]) => Result
  /** enroll-now application → family + students + a "สมัครตรง" lead at รอชำระ + a draft invoice per child */
  approveEnrollment: (sub: EnrollSubmission, plan: { childIndex: number; courseId: ID; classIds: ID[]; startDate: DateStr; periods: number }[]) => Result<{ studentIds: ID[]; invoiceIds: ID[] }>
  /** the reason list (Settings) — one list for lost leads and students who leave */
  saveLossReasons: (list: LossReason[]) => Result
  /** sends an archived lead back to the stage it was archived from — a deliberate action, so unlike
   *  `moveLeadStage` it doesn't run the drag-and-drop "archived leads can't move" guard */
  restoreLead: (id: ID) => Result
  /** creates the lead's student + family (if no test/trial did yet) so an invoice can be issued — the lead becomes
   *  "ลงทะเบียนแล้ว" by itself when that invoice's payment is confirmed */
  convertLeadToStudent: (id: ID) => Result<{ studentId: ID }>
  /** teacher/office note on a test or trial — optional, always available (owner 2026-09-28) */
  saveAssessmentNote: (id: ID, patch: { result: string; note: string }) => Result
  /** books one child's approved Test/Trial submission as a real, conflict-checked Session (or joins an
   *  existing class's session); when that child picked 2+ generic subjects at the exact same date/time,
   *  its own `picks[]` already carries all of them, merged here into one shared 2-hour room block.
   *  Lazily creates that child's Lead first if this is an "Add another Student" child (`leadId: null`). */
  /** applyChanges: the parent edited details of a family/child we already have — staff confirmed updating them */
  approveTestTrialSubmission: (sub: FormSubmission, opts?: { applyChanges?: boolean }) => Result<{ sessionId: ID; studentId: ID; leadId: ID }>

  openConversation: (id: ID) => void
  assignConversation: (id: ID, staffId: ID | null) => Result
  sendChatMessage: (conversationId: ID, raw: string) => Result
  startConversation: (input: { familyId?: ID; leadId?: ID; channel: Conversation["channel"]; text: string }) => Result<{ conversationId: ID }>
  /** prototype only: pretend the parent replied, so the unread badge + send-flow can be demoed end to end */
  simulateParentReply: (conversationId: ID, text?: string) => Result
  /** upserts conversations/messages polled from the real LINE webhook (server-side store) into local state */
  mergeLiveConversations: (conversations: Conversation[], messages: ChatMessage[]) => void
  /** attaches an unlinked (LINE-only) conversation to an existing Family, and records that family's real LINE identity */
  linkConversationToFamily: (conversationId: ID, familyId: ID) => Result
  linkConversationToLead: (conversationId: ID, leadId: ID) => Result
}

const OK = { ok: true as const, value: undefined }
const fail = (error: string) => ({ ok: false as const, error })
/** Company holidays = Director (settings.manage); a branch's own holidays = Admin/Manager of that branch. */
const holidayPerm = (s: DB & { userId: ID }, branchId: ID | null) => {
  const me = s.staff.find((x) => x.id === s.userId)
  if (branchId === null) return requirePerm(me, "settings.manage")
  const r = requirePerm(me, "holiday.manage")
  if (!r.ok) return r
  return inBranch(me, branchId) ? r : fail("จัดการวันหยุดได้เฉพาะสาขาของตัวเอง")
}

/** A10: a day turning into a holiday — optionally cancel its sessions, always tell the office. */
const closeDay = (s: DB & { userId: ID; now: () => Date }, affected: Session[], name: string, date: DateStr, cancel: boolean, branchId: ID | null) => {
  if (!affected.length) return {}
  const ids = new Set(affected.map((x) => x.id))
  return {
    sessions: cancel ? s.sessions.map((x) => (ids.has(x.id) ? { ...x, cancelled: true, cancelReason: `วันหยุด: ${name}` } : x)) : s.sessions,
    notifications: [
      Notif.notify({ id: uid("no"), at: s.now(), kind: "holiday_impact", title: `วันหยุด ${name} กระทบ ${affected.length} คาบ`, body: `${date} · ${cancel ? "ยกเลิกคาบแล้ว — แจ้งผู้ปกครอง / นัดชดเชย" : "คาบยังอยู่ — ต้องตัดสินใจย้ายหรือยกเลิก"}`, fromId: s.userId, audience: { roles: OFFICE_ROLES, branchId: branchId ?? undefined } }),
      ...s.notifications,
    ],
  }
}

/** Force Approve always tells the whole branch + every Director who skipped the check and why. */
const forceNotice = (s: DB & { userId: ID; now: () => Date }, branchId: ID, what: string, detail: string, remark: string) => {
  const actor = s.staff.find((x) => x.id === s.userId)
  return Notif.notify({
    id: uid("no"), at: s.now(), kind: "force_approved", fromId: s.userId,
    title: `Force Approve · ${what}`,
    body: `${actor?.nickname ?? "?"} อนุมัติงานของตัวเองโดยข้ามผู้ตรวจ — ${detail} · เหตุผล: ${remark.trim()}`,
    audience: Notif.forceAudience(branchId, s.staff),
  })
}
const ctxOf = (s: DB, branchId: ID) => ({
  branch: s.branches.find((b) => b.id === branchId)!,
  courses: s.courses, classes: s.classes, holidays: s.holidays,
})

const L = (s: { branches: Branch[] }, roomId: ID | null) => s.branches.flatMap((b) => b.rooms).find((r) => r.id === roomId)?.name ?? "ไม่ระบุห้อง"

/** what the last drag & drop move replaced — one-step undo from the toast (not persisted) */
let lastMove: { sessions: Session[]; classes: Klass[]; entitlements: Entitlement[] } | null = null

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      /** append to the audit trail — every change touching a student goes through here */
      const log = (category: LogCategory, studentIds: ID[], action: string, detail: string, system = false) =>
        set((st) => ({ logs: [{ id: uid("lg"), at: st.now().toISOString(), by: system ? null : st.userId, category, studentIds, action, detail }, ...st.logs] }))
      /** real LINE push to a family (E2E 2026-09-28). Families from the seed have no LINE user id — their
       *  "LINE แล้ว" is a demo flag, so they stay simulated. Returns immediately; `done` runs when LINE answers. */
      const pushLine = (familyId: ID | null | undefined, text: string, done: (ok: boolean, error?: string) => void): LineDelivery => {
        const fam = get().families.find((f) => f.id === familyId)
        if (fam?.lineUserId) {
          fetch("/api/line/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: `line_${fam.lineUserId}`, text }) })
            .then((r) => r.json())
            .then((d: { ok: boolean; error?: string }) => done(d.ok, d.error))
            .catch(() => done(false, "เรียก LINE API ไม่ได้"))
          return "sending"
        }
        return fam?.parents.some((p) => p.lineLinked) ? "delivered" : "no_line"
      }
      /** a student's packages with their real end date (long leave + one class per quota leave) */
      const resolvedFor = (studentId: ID) => {
        const st = get()
        return Att.resolveEntitlements(st.entitlements.filter((e) => e.studentId === studentId), st.leaves, { sessions: st.sessions, attendance: st.attendance, classes: st.classes, holidays: st.holidays })
      }
      /** after a leave mark changes: put the student into the extra class(es) the quota bought, or take them back out */
      const syncMakeUp = (studentId: ID, before: Entitlement[]) => {
        const after = resolvedFor(studentId)
        for (const e of after) {
          const prev = before.find((x) => x.id === e.id)
          if (!prev || prev.to === e.to || !e.classIds.length) continue
          const st = get()
          const now = st.now()
          const [lo, hi] = e.to > prev.to ? [prev.to, e.to] : [e.to, prev.to]
          const inRange = (x: Session) => !!x.classId && e.classIds.includes(x.classId) && !x.cancelled && x.date > lo && x.date <= hi && Sch.sessionState(x, now) === "upcoming"
          const marked = new Set(st.attendance.filter((a) => a.studentId === studentId).map((a) => a.sessionId))
          set({
            sessions: st.sessions.map((x) =>
              !inRange(x) ? x
              : e.to > prev.to ? (x.studentIds.includes(studentId) ? x : { ...x, studentIds: [...x.studentIds, studentId] })
              : marked.has(x.id) ? x : { ...x, studentIds: x.studentIds.filter((y) => y !== studentId) },
            ),
          })
          log("class", [studentId], e.to > prev.to ? "ยืดวันเรียนจบ (ลาใช้โควตา)" : "ย้อนวันเรียนจบ", `${fmtDate(prev.to, { year: true })} → ${fmtDate(e.to, { year: true })}`, true)
        }
      }

      /** lead whose child this student is (created at test/trial approval or for the first invoice) */
      const leadOfStudent = (studentId: ID) => get().leads.find((l) => l.trialStudentId === studentId || l.convertedStudentId === studentId)
      const advanceLead = (leadId: ID, stage: LeadStage, extra: Partial<Lead> = {}) =>
        set((cur) => ({ leads: cur.leads.map((l) => (l.id === leadId ? { ...l, ...extra, stage: CRM.advanceStage(l.stage, stage) } : l)) }))

      /** the lead's family: reuse one already on the same LINE (siblings), else create it from the lead;
       *  the lead's chats become that family's chats so invoices/summaries reach the same LINE */
      const ensureLeadFamily = (lead: Lead, child: { studentName: string; parentName?: string; parentPhone?: string }): ID => {
        const st = get()
        const existing = lead.lineUserId ? st.families.find((f) => f.lineUserId === lead.lineUserId) : undefined
        const family = existing ?? People.familyFromLead(lead, child, uid("fam"))
        set((cur) => ({
          families: existing ? cur.families : [...cur.families, family],
          conversations: cur.conversations.map((c) => (c.leadId === lead.id || (lead.lineUserId && c.id === `line_${lead.lineUserId}`) ? { ...c, familyId: family.id } : c)),
        }))
        return family.id
      }
      return {
      ...buildSeed(),
      userId: "u_nock",
      branchId: "br_thl",
      clockOffset: 0,

      now: () => new Date(Date.now() + get().clockOffset),
      me: () => get().staff.find((s) => s.id === get().userId)!,
      setUser: (userId) => {
        const u = get().staff.find((s) => s.id === userId)!
        set({ userId, branchId: u.branchIds.includes(get().branchId) ? get().branchId : u.branchIds[0] })
      },
      setBranch: (branchId) => set({ branchId }),
      setClockOffset: (clockOffset) => set({ clockOffset }),
      resetData: () => set({ ...buildSeed(), clockOffset: 0 }),

      // ---------------- classes & sessions ----------------
      createClass: (d) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const branch = s.branches.find((b) => b.id === d.branchId)!
        const issues = Sch.validateClass(d, { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, now: s.now() })
        if (!Sch.canSave(issues, d.overrideReason)) return fail(issues.find((i) => i.level !== "warn")?.message ?? "ตรวจสอบข้อมูลอีกครั้ง")
        const teacherName = s.staff.find((t) => t.id === d.teacherId)?.nickname
        const klass: Klass = {
          id: uid("cl"), branchId: d.branchId, layout: d.layout,
          name: d.name.trim() || (d.layout === "teacher" ? `ครู${teacherName ?? "?"} · ${["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."][d.weekday]} ${d.start}` : `${Sch.subjectsOf(d).join(" + ")} ${d.grades.join(", ")}`.trim()),
          subject: d.subject,
          subjects: d.subjects && d.subjects.length > 1 ? d.subjects : undefined, grades: d.grades, kind: d.kind, type: d.type, courseId: d.courseId ?? null, teacherId: d.teacherId, coTeacherIds: d.coTeacherIds ?? [], roomId: d.roomId, weekday: d.weekday,
          start: d.start, minutes: d.minutes, startDate: d.startDate, active: true, studentIds: d.studentIds,
        }
        // a special-period class: from the period's first day (or later) to its last day, nothing outside
        const period = d.periodId ? branch.specialPeriods.find((p) => p.id === d.periodId) : undefined
        if (d.periodId && !period) return fail("ไม่พบช่วงเวลาพิเศษนี้")
        if (period) {
          if (d.startDate > period.to) return fail(`วันเริ่มเลยช่วง ${period.name} (${fmtDate(period.from)}–${fmtDate(period.to)}) ไปแล้ว`)
          Object.assign(klass, { periodId: period.id, startDate: d.startDate < period.from ? period.from : d.startDate })
        }
        const made = Sch.generateSessions(klass, s.holidays, () => uid("se"), undefined, period?.to)
        if (period && !made.length) return fail(`ไม่มีวัน${["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"][klass.weekday]}ในช่วง ${period.name} ที่เหลืออยู่`)
        // regular classes created over a "pause" period sit out there from the start
        const synced = Sch.syncPeriodSessions(made, [klass], branch, toDateStr(s.now())).sessions
        const sessions = synced.filter((x) => !x.pausedBy)
        set({ classes: [...s.classes, klass], sessions: [...s.sessions, ...synced] })
        if (klass.studentIds.length) log("class", klass.studentIds, "เข้าคลาส", `${klass.name} (สร้างคลาสใหม่)`)
        return { ok: true, value: { klass, sessions: sessions.length } }
      },

      createClasses: (base, rows) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        if (!rows.length) return fail("เพิ่มวันและเวลาอย่างน้อย 1 แถว")
        const clash = Sch.overlappingRows(rows)[0]
        if (clash) return fail(`แถว ${clash[0] + 1} กับแถว ${clash[1] + 1} เป็นวันเดียวกันและเวลาทับกัน`)
        const branch = s.branches.find((b) => b.id === base.branchId)!
        // validate every row first — nothing is created unless all rows pass (or carry an override reason)
        for (const [i, r] of rows.entries()) {
          const issues = Sch.validateClass({ ...base, ...r }, { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, now: s.now() })
          if (!Sch.canSave(issues, base.overrideReason)) return fail(`แถว ${i + 1}: ${issues.find((x) => x.level !== "warn")?.message ?? "ตรวจสอบข้อมูลอีกครั้ง"}`)
        }
        let sessions = 0
        for (const r of rows) {
          const res = get().createClass({ ...base, ...r })
          if (!res.ok) return res
          sessions += res.value.sessions
        }
        return { ok: true, value: { classes: rows.length, sessions } }
      },

      updateClass: (id, patch) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const k = s.classes.find((c) => c.id === id)
        if (!k) return fail("ไม่พบคลาส")
        const { name, ...schedule } = patch
        const merged = { ...k, ...schedule }
        const branch = s.branches.find((b) => b.id === k.branchId)!
        const issues = Sch.validateClass({ ...merged, startDate: toDateStr(s.now()) }, { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, ignoreClassId: id })
          .filter((i) => i.level === "block")
        if (issues.length) return fail(issues[0].message)
        const r = Sch.applyClassEdit(k, schedule, s.sessions, s.now(), s.attendance)
        set({ classes: s.classes.map((c) => (c.id === id ? { ...r.klass, name: name ?? c.name } : c)), sessions: r.sessions })
        return { ok: true, value: { changed: r.changed, kept: r.kept } }
      },

      // A11: deactivating cancels future sessions and removes them from reschedule targets
      deactivateClass: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผล")
        let cancelled = 0
        const now = s.now()
        const marked = new Set(s.attendance.map((a) => a.sessionId))
        // deleted class (owner 2026-09-29): sessions not started are removed for good — ones already holding a mark
        // (e.g. leave recorded ahead) are kept cancelled for the record; past sessions stay as history
        const sessions = s.sessions.flatMap((x) => {
          if (x.classId !== id || Sch.sessionState(x, now) !== "upcoming") return [x]
          cancelled++
          return marked.has(x.id) ? [{ ...x, cancelled: true, cancelReason: reason }] : []
        })
        set({ classes: s.classes.map((c) => (c.id === id ? { ...c, active: false } : c)), sessions })
        const k = s.classes.find((c) => c.id === id)
        log("class", k?.studentIds ?? [], "ลบคลาส", `${k?.name ?? ""} · ลบ ${cancelled} คาบที่ยังไม่เริ่ม · ${reason.trim()}`)
        return { ok: true, value: { cancelled } }
      },

      addSession: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const branch = s.branches.find((b) => b.id === input.branchId)!
        if (Sch.isHoliday(input.date, input.branchId, s.holidays)) return fail("วันนั้นเป็นวันหยุด")
        const issues = Sch.validateClass(
          { ...input, kind: "other", type: "group", weekday: weekdayOf(input.date), startDate: input.date, overrideReason: "session" },
          { branch, staff: s.staff, sessions: s.sessions, holidays: s.holidays, now: s.now() },
        ).filter((i) => i.level === "block")
        if (issues.length) return fail(issues[0].message)
        const session: Session = { ...input, id: uid("se"), customized: true, cancelled: false }
        set({ sessions: [...s.sessions, session] })
        return { ok: true, value: session }
      },

      editSession: (id, patch) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const cur = s.sessions.find((x) => x.id === id)
        if (!cur) return fail("ไม่พบคาบเรียน")
        if (Sch.sessionState(cur, s.now()) !== "upcoming") return fail("แก้ได้เฉพาะคาบที่ยังไม่เริ่ม")
        const next = Sch.editSingleSession(cur, patch)
        const branch = s.branches.find((b) => b.id === cur.branchId)!
        const after = s.sessions.map((x) => (x.id === id ? next : x))
        const clash = Sch.introducedConflicts(s.sessions, after, [id], branch, s.staff).added[0]
        if (clash) return fail(clash.message)
        set({ sessions: s.sessions.map((x) => (x.id === id ? next : x)) })
        return OK
      },

      // drag & drop: validates the resulting schedule before saving
      moveSession: (id, target, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const src = s.sessions.find((x) => x.id === id)
        if (!src) return fail("ไม่พบคาบเรียน")
        const now = s.now()
        if (Sch.sessionState(src, now) !== "upcoming") return fail("ย้ายได้เฉพาะคาบที่ยังไม่เริ่ม")
        const branch = s.branches.find((b) => b.id === src.branchId)!
        const moved = { ...src, date: target.date, start: target.start }
        if (at(target.date, target.start) < now) return fail("ย้ายไปเวลาที่ผ่านมาแล้วไม่ได้")
        const hours = branch.hours[weekdayOf(target.date)]
        if (!hours) return fail("สาขาปิดวันนั้น")
        if (toMinutes(target.start) < toMinutes(hours.open) || toMinutes(target.start) + moved.minutes > toMinutes(hours.close)) return fail(`อยู่นอกเวลาเปิดสาขา (${hours.open}–${hours.close})`)
        if (Sch.isHoliday(target.date, branch.id, s.holidays)) return fail("วันนั้นเป็นวันหยุด")
        const r = Sch.moveSession(s.sessions, id, target, scope, now, s.attendance)
        const { added, remaining } = Sch.introducedConflicts(s.sessions, r.sessions, r.movedIds, branch, s.staff)
        if (added[0]) return fail(`ย้ายไม่ได้ — ${added[0].message}`)
        set({
          sessions: r.sessions,
          classes: r.classPatch && src.classId ? s.classes.map((c) => (c.id === src.classId ? { ...c, ...r.classPatch } : c)) : s.classes,
        })
        return { ok: true, value: { moved: r.movedIds.length, kept: r.kept }, warnings: [...new Set(remaining.map((c) => `ยังชนอยู่ (ปัญหาเดิม): ${c.message}`))] }
      },

      updateSessionTeachers: (id, teacherId, coTeacherIds, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const src = s.sessions.find((x) => x.id === id)
        if (!src) return fail("ไม่พบคาบเรียน")
        const now = s.now()
        const allowed = Sch.canChangeTeachers(src, now)
        if (!allowed.ok) return allowed
        if (!teacherId && coTeacherIds.length) return fail("เลือกครูหลักก่อน")
        const co = coTeacherIds.filter((t) => t !== teacherId)
        const inactive = [teacherId, ...co].map((t) => s.staff.find((x) => x.id === t)).find((t) => t && !t.active)
        if (inactive) return fail(`${inactive.nickname} ไม่ได้ทำงานแล้ว`)
        const r = Sch.applyToSessions(s.sessions, id, scope, (x) => ({ ...x, teacherId, coTeacherIds: co }), (x) => Sch.editableByClass(x, now, s.attendance))
        const branch = s.branches.find((b) => b.id === src.branchId)!
        const clash = Sch.introducedConflicts(s.sessions, r.sessions, r.changedIds, branch, s.staff, ["teacher"]).added[0]
        if (clash) return fail(`เปลี่ยนไม่ได้ — ${clash.message}`)
        set({
          sessions: r.sessions,
          classes: scope === "following" && src.classId ? s.classes.map((c) => (c.id === src.classId ? { ...c, teacherId, coTeacherIds: co } : c)) : s.classes,
        })
        return { ok: true, value: { changed: r.changedIds.length, kept: r.kept } }
      },

      addStudentToSession: (id, studentId, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const src = s.sessions.find((x) => x.id === id)!
        const now = s.now()
        if (Sch.sessionState(src, now) === "closed" || src.cancelled) return fail("คาบนี้ปิดหรือยกเลิกแล้ว")
        if (src.studentIds.includes(studentId)) return fail("นักเรียนอยู่ในคาบนี้แล้ว")
        const klass = s.classes.find((c) => c.id === src.classId)
        const cap = klass ? Sch.CAPACITY[klass.type] : Sch.CAPACITY.group
        const stu = s.students.find((x) => x.id === studentId)!
        const r = Sch.applyToSessions(
          s.sessions, id, scope,
          (x) => ({ ...x, studentIds: [...x.studentIds, studentId] }),
          (x) => Sch.sessionState(x, now) === "upcoming" && !x.studentIds.includes(studentId),
        )
        const warnings: string[] = []
        // any student can join any class (owner 2026-09-30) — the admin is only told what doesn't fit
        if (src.studentIds.length + 1 > cap) warnings.push(`${klass?.type === "single" ? "คลาสเรียนเดี่ยว" : "คาบนี้"}มี ${src.studentIds.length + 1} คนแล้ว — แนะนำไม่เกิน ${cap} คน`)
        if (klass && klass.layout !== "teacher" && Att.gradeMismatch(stu, klass)) warnings.push(`เกรด ${stu.grade} ไม่ตรงกับคลาส (${klass.grades.join(", ")})`)
        if (!src.trial && !Att.coveringEntitlement(studentId, src, s.entitlements))
          warnings.push(`${stu.nickname} ยังไม่ได้จ่ายค่าเรียนสำหรับคาบนี้ — ออกใบแจ้งหนี้ที่หน้าการเงิน`)
        if (r.kept) warnings.push(`ข้าม ${r.kept} คาบที่เริ่มไปแล้ว`)
        set({
          sessions: r.sessions,
          classes: scope === "following" && klass ? s.classes.map((c) => (c.id === klass.id && !c.studentIds.includes(studentId) ? { ...c, studentIds: [...c.studentIds, studentId] } : c)) : s.classes,
        })
        log("class", [studentId], scope === "following" && klass ? "เข้าคลาส" : "เข้าคาบ", `${klass?.name ?? src.subject} · ${fmtDate(src.date)} ${src.start}${r.changedIds.length > 1 ? ` · ${r.changedIds.length} คาบ` : ""}${src.trial ? " · ทดลองเรียน" : ""}`)
        return { ok: true, value: { changed: r.changedIds.length }, warnings }
      },

      // A10: adding a holiday shows affected sessions and can cancel them in one go
      addHoliday: (h, cancelAffected) => {
        const s = get()
        const perm = holidayPerm(s, h.branchId)
        if (!perm.ok) return perm
        const err = Cfg.validateHoliday(h)
        if (err) return fail(err)
        if (s.holidays.some((x) => x.date === h.date && x.branchId === h.branchId)) return fail("มีวันหยุดวันนี้แล้ว")
        const affected = Sch.holidayImpact(h.date, h.branchId, s.sessions, h.openBranchIds)
        set({ holidays: [...s.holidays, { ...h, name: h.name.trim(), id: uid("hol") }], ...closeDay(s, affected, h.name, h.date, cancelAffected, h.branchId) })
        return { ok: true, value: { affected: affected.length } }
      },

      updateHoliday: (id, patch) => {
        const s = get()
        const cur = s.holidays.find((h) => h.id === id)
        if (!cur) return fail("ไม่พบวันหยุด")
        const perm = holidayPerm(s, cur.branchId)
        if (!perm.ok) return perm
        const next = { ...cur, ...patch, name: patch.name.trim() }
        const err = Cfg.validateHoliday(next)
        if (err) return fail(err)
        if (s.holidays.some((x) => x.id !== id && x.date === next.date && x.branchId === next.branchId)) return fail("มีวันหยุดวันนี้แล้ว")
        set({ holidays: s.holidays.map((h) => (h.id === id ? next : h)) })
        return OK
      },

      removeHoliday: (id) => {
        const s = get()
        const cur = s.holidays.find((h) => h.id === id)
        if (!cur) return fail("ไม่พบวันหยุด")
        const perm = holidayPerm(s, cur.branchId)
        if (!perm.ok) return perm
        set({ holidays: s.holidays.filter((h) => h.id !== id) })
        return OK
      },

      setHolidayOpen: (holidayId, branchId, open, cancelAffected) => {
        const s = get()
        const perm = holidayPerm(s, branchId)
        if (!perm.ok) return perm
        const h = s.holidays.find((x) => x.id === holidayId)
        if (!h || h.branchId !== null) return fail("เปิด/ปิดได้เฉพาะวันหยุดของบริษัท — วันหยุดของสาขาให้ลบแทน")
        const openIds = open ? [...new Set([...(h.openBranchIds ?? []), branchId])] : (h.openBranchIds ?? []).filter((x) => x !== branchId)
        // closing again: the day's sessions at this branch are hit, same as adding a holiday
        const affected = open ? [] : Sch.holidayImpact(h.date, branchId, s.sessions)
        set({ holidays: s.holidays.map((x) => (x.id === holidayId ? { ...x, openBranchIds: openIds } : x)), ...closeDay(s, affected, h.name, h.date, cancelAffected, branchId) })
        return { ok: true, value: { affected: affected.length } }
      },

      saveFamily: (f) => {
        const s = get()
        const perm = requirePerm(s.me(), "family.manage")
        if (!perm.ok) return perm
        const errs = People.validateFamily(f)
        if (errs.length) return fail(errs[0].message)
        const clean = { ...f, parents: f.parents.map((p) => ({ ...p, phone: People.formatPhone(p.phone) })) }
        set({ families: s.families.some((x) => x.id === f.id) ? s.families.map((x) => (x.id === f.id ? clean : x)) : [...s.families, clean] })
        return { ok: true, value: clean }
      },

      generateLineCode: (familyId) => {
        const s = get()
        const perm = requirePerm(s.me(), "family.manage")
        if (!perm.ok) return perm
        const code = People.newLineCode(s.now())
        set({ families: s.families.map((f) => (f.id === familyId ? { ...f, lineCode: code } : f)) })
        return { ok: true, value: { code: code.code } }
      },

      // prototype only: pretend the parent sent the code to the LINE OA
      simulateLineLink: (familyId, parentIndex) => {
        const s = get()
        const f = s.families.find((x) => x.id === familyId)!
        const r = People.lineCodeValid(f, s.now())
        if (!r.ok) return r
        set({ families: s.families.map((x) => (x.id === familyId ? { ...x, lineCode: undefined, parents: x.parents.map((p, i) => (i === parentIndex ? { ...p, lineLinked: true } : p)) } : x)) })
        return OK
      },

      saveStudent: (st) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        const errs = People.validateStudent(st, toDateStr(s.now()))
        if (errs.length) return fail(errs[0].message)
        const prev = s.students.find((x) => x.id === st.id)
        set({ students: prev ? s.students.map((x) => (x.id === st.id ? st : x)) : [...s.students, st] })
        if (!prev) log("profile", [st.id], "สร้างนักเรียน", `${st.nickname} · ${st.grade} · สาขา${s.branches.find((b) => b.id === st.createdBranchId)?.name ?? ""}`)
        else {
          const changes = People.studentChanges(prev, st, (id) => s.families.find((f) => f.id === id)?.name ?? "—")
          if (changes.length) log("profile", [st.id], "แก้ข้อมูล", changes.join(" · "))
        }
        return { ok: true, value: st }
      },

      archiveStudent: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("ใส่เหตุผลที่นักเรียนเลิกเรียน")
        const stu = s.students.find((x) => x.id === id)
        if (!stu) return fail("ไม่พบนักเรียน")
        const today = toDateStr(s.now())
        // leaving: out of every class and every session that hasn't started — history stays
        let { classes, sessions } = s
        classes.filter((k) => k.studentIds.includes(id)).forEach((k) => {
          const r = Att.removeFromClass(k, id, sessions, s.now())
          classes = classes.map((c) => (c.id === k.id ? r.klass : c))
          sessions = r.sessions
        })
        sessions = sessions.map((x) => (x.date >= today && x.studentIds.includes(id) && Sch.sessionState(x, s.now()) === "upcoming" ? { ...x, studentIds: x.studentIds.filter((y) => y !== id) } : x))
        set({ students: s.students.map((x) => (x.id === id ? { ...x, archived: { at: s.now().toISOString(), by: s.userId, reason: reason.trim() } } : x)), classes, sessions })
        log("profile", [id], "Archive (เลิกเรียน)", reason.trim())
        return OK
      },

      restoreStudent: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        set({ students: s.students.map((x) => (x.id === id ? { ...x, archived: undefined } : x)) })
        log("profile", [id], "กลับมาเรียน", "ยกเลิก Archive — เพิ่มเข้าคลาสใหม่ได้จากปฏิทิน/ใบแจ้งหนี้")
        return OK
      },

      addStudentNote: (studentId, text) => {
        const s = get()
        if (!can(s.me(), "student.view")) return fail("คุณไม่มีสิทธิ์")
        if (!text.trim()) return fail("พิมพ์โน้ตก่อน")
        set({ notes: [...s.notes, { id: uid("nt"), studentId, by: s.userId, at: s.now().toISOString(), text: text.trim() }] })
        log("note", [studentId], "เพิ่มโน้ต", text.trim().slice(0, 80))
        return OK
      },

      saveStaff: (st) => {
        const s = get()
        const perm = requirePerm(s.me(), "staff.manage")
        if (!perm.ok) return perm
        const errs = People.validateStaff(st, s.staff, st.id)
        if (errs.length) return fail(errs[0].message)
        const clean = st.canLogin ? st : { ...st, email: st.email || undefined }
        set({ staff: s.staff.some((x) => x.id === st.id) ? s.staff.map((x) => (x.id === st.id ? clean : x)) : [...s.staff, clean] })
        return { ok: true, value: clean }
      },

      // F2 + S6: hand over future sessions first, never lock the school out
      deactivateStaff: (id, replacementId) => {
        const s = get()
        const perm = requirePerm(s.me(), "staff.manage")
        if (!perm.ok) return perm
        const target = s.staff.find((x) => x.id === id)!
        const guard = canDeactivateStaff(target, s.me(), s.staff)
        if (!guard.ok) return guard
        const future = People.futureSessionsOf(id, s.sessions, toDateStr(s.now()))
        if (future.length && replacementId === undefined) return fail(`ยังมี ${future.length} คาบในอนาคต — เลือกครูแทนก่อน`)
        const ids = new Set(future.map((x) => x.id))
        const swap = (x: { teacherId: ID | null; coTeacherIds: ID[] }) => ({
          teacherId: x.teacherId === id ? replacementId : x.teacherId,
          coTeacherIds: x.coTeacherIds.filter((c) => c !== id && c !== replacementId),
        })
        set({
          staff: s.staff.map((x) => (x.id === id ? { ...x, active: false } : x)),
          sessions: s.sessions.map((x) => (ids.has(x.id) ? { ...x, ...swap(x) } : x)),
          classes: s.classes.map((c) => (c.teacherId === id || c.coTeacherIds.includes(id) ? { ...c, ...swap(c) } : c)),
        })
        return { ok: true, value: { reassigned: future.length } }
      },

      reactivateStaff: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "staff.manage")
        if (!perm.ok) return perm
        set({ staff: s.staff.map((x) => (x.id === id ? { ...x, active: true } : x)) })
        return OK
      },

      saveCourse: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "course.manage")
        if (!perm.ok) return perm
        const branch = s.branches.find((b) => b.id === input.branchId)!
        // blank name → "[Subject + Grade]" default, like staging
        const c: Course = { ...input, name: input.name.trim() || CourseR.defaultCourseName(input.subjects, input.grades), duration: input.unit === "month" ? 1 : input.duration }
        if (!CourseR.needsPriceReason(branch, c)) delete c.priceReason
        const err = CourseR.validateCourse(branch, c)
        if (err) return fail(err)
        set({ courses: s.courses.some((x) => x.id === c.id) ? s.courses.map((x) => (x.id === c.id ? c : x)) : [...s.courses, c] })
        return { ok: true, value: c }
      },

      duplicateCourse: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "course.manage")
        if (!perm.ok) return perm
        const src = s.courses.find((c) => c.id === id)
        if (!src) return fail("ไม่พบคอร์ส")
        const copy: Course = { ...src, id: uid("co"), name: `${src.name} (สำเนา)` }
        set({ courses: [...s.courses, copy] })
        return { ok: true, value: copy }
      },

      saveBranch: (b) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        const err = Cfg.validateBranchInfo(b) ?? Cfg.validateHours(b.hours) ?? Cfg.validateSpecialPeriods(b.specialPeriods) ?? Cfg.validateDurations([...b.packageDurations.hour, ...b.packageDurations.week])
        if (err) return fail(err)
        if (s.branches.some((x) => x.id !== b.id && x.code === b.code)) return fail(`รหัสสาขา ${b.code} ถูกใช้แล้ว`)
        const removedRooms = s.branches.find((x) => x.id === b.id)!.rooms.filter((r) => !b.rooms.some((n) => n.id === r.id))
        const inUse = removedRooms.find((r) => s.sessions.some((x) => x.roomId === r.id && !x.cancelled && x.date >= toDateStr(s.now())))
        if (inUse) return fail(`ลบ${inUse.name}ไม่ได้ — ยังมีคาบที่ใช้ห้องนี้`)
        // special periods switched on/off, removed or set to pause regular classes → sessions follow (owner 2026-10-01)
        const sync = Sch.syncPeriodSessions(s.sessions, s.classes, b, toDateStr(s.now()))
        set({ branches: s.branches.map((x) => (x.id === b.id ? b : x)), sessions: sync.sessions })
        if (sync.paused || sync.restored) {
          const what = [sync.paused && `หยุด ${sync.paused} คาบ`, sync.restored && `กลับมาเรียน ${sync.restored} คาบ`].filter(Boolean).join(" · ")
          set({ notifications: [Notif.notify({ id: uid("no"), at: s.now(), kind: "info", title: "ช่วงเวลาพิเศษเปลี่ยน", body: `${b.name} · ${what}`, fromId: s.userId, audience: { roles: Notif.ALL_ROLES, branchId: b.id } }), ...get().notifications] })
          toast.info(`ช่วงเวลาพิเศษ: ${what}`)
        }
        return OK
      },

      addBranch: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        const code = input.code.trim().toUpperCase()
        const base = s.branches.find((b) => b.id === s.branchId)!
        const b: Branch = {
          ...base, id: uid("br"), code, name: input.name.trim(), brand: input.brand, province: input.province, active: true,
          // next free branch number within the brand (document numbers: 690930-01-002-0001)
          branchNo: String(Math.max(0, ...s.branches.filter((x) => x.brand === input.brand).map((x) => Number(x.branchNo) || 0)) + 1).padStart(3, "0"),
          email: "", address: "", phones: [], socials: [], rooms: [{ id: uid("rm"), name: "ห้อง 1" }],
          specialPeriods: [], fees: [], promotions: [], priceChart: [], subjects: [], grades: [],
          bankAccount: { bank: "", branchName: "", name: "", number: "" }, lineOaConnected: false, lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
        }
        const err = Cfg.validateBranchInfo(b)
        if (err) return fail(err)
        if (s.branches.some((x) => x.code === code)) return fail(`รหัสสาขา ${code} ถูกใช้แล้ว`)
        // the creator must be able to open the new branch from the switcher
        set({ branches: [...s.branches, b], staff: s.staff.map((x) => (x.id === s.userId ? { ...x, branchIds: [...x.branchIds, b.id] } : x)) })
        return { ok: true, value: b }
      },

      setBranchActive: (id, active) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (!active && s.branches.filter((b) => b.active).length <= 1) return fail("ต้องมีสาขาที่เปิดอยู่อย่างน้อย 1 สาขา")
        if (!active && s.sessions.some((x) => x.branchId === id && !x.cancelled && x.date >= toDateStr(s.now()))) return fail("ยังมีคาบในอนาคตที่สาขานี้ — ย้ายหรือยกเลิกก่อนปิดสาขา")
        const next = s.branches.map((b) => (b.id === id ? { ...b, active } : b))
        const fallback = next.find((b) => b.active && s.me().branchIds.includes(b.id))
        set({ branches: next, branchId: !active && s.branchId === id && fallback ? fallback.id : s.branchId })
        return OK
      },

      saveSystem: (sys) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (sys.subjects.some((x) => !x.trim())) return fail("ชื่อวิชาว่างไม่ได้")
        if (new Set(sys.subjects).size !== sys.subjects.length) return fail("มีชื่อวิชาซ้ำ")
        const settings = sys.settings
        if (!(settings.lowSessionThreshold >= 0) || !(settings.renewalDaysBefore >= 0) || !(settings.summaryDeadlineHours > 0)) return fail("ตัวเลขการแจ้งเตือนไม่ถูกต้อง")
        set({ system: sys })
        return OK
      },

      renameSubject: (from, to) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        const name = to.trim()
        if (!name) return fail("ชื่อวิชาว่างไม่ได้")
        if (name !== from && s.system.subjects.includes(name)) return fail(`มีวิชา ${name} อยู่แล้ว`)
        const r = (x: string) => (x === from ? name : x)
        set({
          // the EN/JP names travel with the subject
          system: { ...s.system, subjects: s.system.subjects.map(r), subjectNames: s.system.subjectNames && Object.fromEntries(Object.entries(s.system.subjectNames).map(([k, v]) => [r(k), v])) },
          branches: s.branches.map((b) => ({ ...b, subjects: b.subjects.map(r), priceChart: b.priceChart.map((p) => ({ ...p, subject: r(p.subject) })) })),
          staff: s.staff.map((x) => ({ ...x, subjects: x.subjects.map(r) })),
          courses: s.courses.map((x) => ({ ...x, subjects: x.subjects.map(r) })),
          classes: s.classes.map((x) => ({ ...x, subject: r(x.subject) })),
          sessions: s.sessions.map((x) => ({ ...x, subject: r(x.subject) })),
          entitlements: s.entitlements.map((x) => ({ ...x, subjects: x.subjects.map(r) })),
          leads: s.leads.map((x) => ({ ...x, subject: r(x.subject) })),
        })
        return OK
      },

      markNotificationsRead: (ids) =>
        set((s) => ({ notifications: s.notifications.map((n) => ((!ids || ids.includes(n.id)) && !n.readBy.includes(s.userId) ? { ...n, readBy: [...n.readBy, s.userId] } : n)) })),

      sendTeamMessage: (target, title, body) => {
        const s = get()
        const err = Notif.validateMessage(target, body)
        if (err) return fail(err)
        const me = s.me()
        const n = Notif.notify({ id: uid("no"), at: s.now(), kind: "message", title: title.trim() || `ข้อความจาก ${me.nickname}`, body: body.trim(), fromId: me.id, audience: Notif.messageAudience(target, s.branchId) })
        set({ notifications: [n, ...s.notifications] })
        return OK
      },
      setLineOaConnected: (branchId, connected) => set((s) => ({ branches: s.branches.map((b) => (b.id === branchId ? { ...b, lineOaConnected: connected } : b)) })),

      cancelSession: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผลการยกเลิก")
        const cur = s.sessions.find((x) => x.id === id)!
        if (Sch.sessionState(cur, s.now()) !== "upcoming") return fail("ยกเลิกได้เฉพาะคาบที่ยังไม่เริ่ม")
        set({
          sessions: s.sessions.map((x) => (x.id === id ? { ...x, cancelled: true, cancelReason: reason } : x)),
          notifications: [
            Notif.notify({ id: uid("no"), at: s.now(), kind: "session_cancelled", title: "ยกเลิกคาบเรียน", body: `${cur.subject} ${cur.date} ${cur.start} · นักเรียน ${cur.studentIds.length} คน · ${reason}`, fromId: s.userId, audience: { roles: OFFICE_ROLES, branchId: cur.branchId, staffIds: Sch.teachersOf(cur) } }),
            ...s.notifications,
          ],
        })
        return { ok: true, value: { students: cur.studentIds.length } }
      },

      // ---------------- attendance ----------------
      setAttendedMinutes: (sessionId, studentId, minutes) => {
        const s = get()
        const me = s.me()
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "attendance.mark")) return fail("คุณไม่มีสิทธิ์เช็คชื่อ")
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("เช็คชื่อได้เฉพาะคาบที่คุณสอน")
        const a = s.attendance.find((x) => x.sessionId === sessionId && x.studentId === studentId)
        if (a?.status !== "present") return fail("ติ๊ก \"มา\" ก่อน แล้วค่อยเลือกเวลาที่เรียนจริง")
        const open = Att.canMark(se, "present", s.now())
        if (!open.ok) return open
        const seat = Seats.seatOf(se, studentId, s.classes.find((k) => k.id === se.classId))
        if (minutes !== null && (!(minutes > 0) || minutes > se.minutes)) return fail("เวลาเรียนต้องมากกว่า 0 และไม่เกินความยาวคาบ")
        const value = minutes === null || minutes === seat.minutes ? undefined : minutes
        set({ attendance: s.attendance.map((x) => (x === a ? { ...x, minutes: value } : x)) })
        log("attendance", [studentId], "แก้เวลาเรียนจริง", `${se.subject} ${fmtDate(se.date)} ${se.start} · มาเรียน ${Seats.fmtLen(value ?? seat.minutes)}`)
        return OK
      },

      substituteTeacherForDay: (teacherId, date, substituteId, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผล")
        const now = s.now()
        const day = s.sessions.filter((x) => x.date === date && x.teacherId === teacherId && !x.cancelled && Sch.sessionState(x, now) !== "closed")
        if (!day.length) return fail("ไม่มีคาบที่ยังเปลี่ยนครูได้ในวันนั้น")
        // check every session first so nothing changes unless all of them can move to the substitute
        const sub = s.staff.find((t) => t.id === substituteId)
        if (!sub?.active) return fail("เลือกครูแทนที่ยังทำงานอยู่")
        const branch = s.branches.find((b) => b.id === day[0].branchId)!
        let trial = s.sessions
        for (const x of day) {
          const next = trial.map((y) => (y.id === x.id ? { ...y, teacherId: substituteId, coTeacherIds: y.coTeacherIds.filter((c) => c !== substituteId) } : y))
          const clash = Sch.introducedConflicts(trial, next, [x.id], branch, s.staff, ["teacher"]).added[0]
          if (clash) return fail(`${sub.nickname} สอนแทนคาบ ${x.subject} ${x.start} ไม่ได้ — ${clash.message}`)
          trial = next
        }
        for (const x of day) { const r = get().teacherLeave(x.id, { reason, substituteId }); if (!r.ok) return r }
        return { ok: true, value: { sessions: day.length } }
      },

      cancelTeacherDay: (teacherId, date, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        if (!reason.trim()) return fail("กรอกเหตุผลการยกเลิก")
        const now = s.now()
        const day = s.sessions.filter((x) => x.date === date && x.teacherId === teacherId && !x.cancelled && Sch.sessionState(x, now) !== "closed")
        if (!day.length) return fail("ไม่มีคาบที่ยังยกเลิกได้ในวันนั้น")
        let students = 0
        for (const x of day) { const r = get().teacherLeave(x.id, { reason, substituteId: null }); if (!r.ok) return r; students += r.value.extended }
        return { ok: true, value: { sessions: day.length, students } }
      },

      moveStudent: (fromSessionId, studentId, toSessionId, scope) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const now = s.now()
        const from = s.sessions.find((x) => x.id === fromSessionId)
        const to = s.sessions.find((x) => x.id === toSessionId)
        if (!from || !to) return fail("ไม่พบคาบเรียน")
        if (from.id === to.id) return fail("วางในคาบเดิม")
        if (!from.studentIds.includes(studentId)) return fail("นักเรียนไม่ได้อยู่ในคาบนี้")
        if (to.cancelled || Sch.sessionState(to, now) === "closed") return fail("คาบปลายทางปิดหรือยกเลิกแล้ว")
        if (Sch.sessionState(from, now) === "closed") return fail("คาบเดิมจบไปแล้ว ย้ายไม่ได้")
        const marked = new Set(s.attendance.filter((a) => a.studentId === studentId).map((a) => a.sessionId))
        if (marked.has(from.id)) return fail("เช็คชื่อคาบเดิมไปแล้ว — ล้างการเช็คชื่อก่อน")
        const upcoming = (classId: ID | null, fromKey: string) => s.sessions
          .filter((x) => !!classId && x.classId === classId && !x.cancelled && x.date + x.start >= fromKey && Sch.sessionState(x, now) !== "closed")
          .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
        // pairs of (old session → new session)
        let pairs: [Session, Session][] = [[from, to]]
        if (scope.kind === "count") {
          if (!Number.isInteger(scope.n) || scope.n < 1) return fail("จำนวนคาบต้องตั้งแต่ 1")
          const src = upcoming(from.classId, from.date + from.start).filter((x) => x.studentIds.includes(studentId) && !marked.has(x.id)).slice(0, scope.n)
          const dst = upcoming(to.classId, to.date + to.start).slice(0, scope.n)
          pairs = src.slice(0, Math.min(src.length, dst.length)).map((x, i) => [x, dst[i]])
          if (!pairs.length) pairs = [[from, to]]
        }
        lastMove = { sessions: s.sessions, classes: s.classes, entitlements: s.entitlements }
        if (scope.kind === "following") {
          if (!from.classId || !to.classId) return fail("ย้ายถาวรได้เฉพาะคาบที่เป็นของคลาส")
          if (from.classId === to.classId) return fail("เป็นคลาสเดียวกันอยู่แล้ว")
          const oldIds = new Set(upcoming(from.classId, from.date + from.start).filter((x) => !marked.has(x.id)).map((x) => x.id))
          const newIds = new Set(upcoming(to.classId, to.date + to.start).map((x) => x.id))
          const fromClass = from.classId, toClass = to.classId
          set({
            sessions: s.sessions.map((x) => oldIds.has(x.id) ? { ...x, studentIds: x.studentIds.filter((y) => y !== studentId) }
              : newIds.has(x.id) && !x.studentIds.includes(studentId) ? { ...x, studentIds: [...x.studentIds, studentId] } : x),
            classes: s.classes.map((k) => k.id === fromClass ? { ...k, studentIds: k.studentIds.filter((y) => y !== studentId), seats: Object.fromEntries(Object.entries(k.seats ?? {}).filter(([id]) => id !== studentId)) }
              : k.id === toClass && !k.studentIds.includes(studentId) ? { ...k, studentIds: [...k.studentIds, studentId] } : k),
            // the package now pays for the new class
            entitlements: s.entitlements.map((e) => (e.studentId === studentId && e.classIds.includes(fromClass) && e.to >= from.date ? { ...e, classIds: [...new Set(e.classIds.map((c) => (c === fromClass ? toClass : c)))] } : e)),
          })
          log("class", [studentId], "ย้ายคลาสถาวร", `${s.classes.find((k) => k.id === fromClass)?.name} → ${s.classes.find((k) => k.id === toClass)?.name} ตั้งแต่ ${fmtDate(to.date)}`)
          return { ok: true, value: { moved: newIds.size } }
        }
        const outIds = new Map(pairs.map(([a, b]) => [a.id, b.id]))
        const inIds = new Set(pairs.map(([, b]) => b.id))
        set({
          sessions: s.sessions.map((x) =>
            outIds.has(x.id) ? { ...x, studentIds: x.studentIds.filter((y) => y !== studentId), rescheduledOut: [...(x.rescheduledOut ?? []).filter((m) => m.studentId !== studentId), { studentId, toSessionId: outIds.get(x.id)! }] }
            : inIds.has(x.id) && !x.studentIds.includes(studentId) ? { ...x, studentIds: [...x.studentIds, studentId], rescheduledIn: [...(x.rescheduledIn ?? []), studentId] }
            : x),
        })
        log("class", [studentId], "ย้ายคาบ (ลากวาง)", pairs.map(([a, b]) => `${fmtDate(a.date)} ${a.start} → ${fmtDate(b.date)} ${b.start}`).join(", "))
        return { ok: true, value: { moved: pairs.length } }
      },

      mergeSessions: (keepId, dropId) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const keep = s.sessions.find((x) => x.id === keepId), drop = s.sessions.find((x) => x.id === dropId)
        if (!keep || !drop || keep.id === drop.id) return fail("เลือกคาบที่จะรวม")
        const now = s.now()
        if (Sch.sessionState(keep, now) !== "upcoming" || Sch.sessionState(drop, now) !== "upcoming") return fail("รวมได้เฉพาะคาบที่ยังไม่เริ่ม")
        if (s.attendance.some((a) => a.sessionId === drop.id)) return fail("คาบที่จะรวมมีการเช็คชื่อแล้ว")
        const add = drop.studentIds.filter((x) => !keep.studentIds.includes(x))
        // each student keeps their own part of the class and note
        const seats = { ...keep.seats }, notes = { ...keep.notes }
        for (const sid of add) {
          const k = s.classes.find((c) => c.id === drop.classId)
          const seat = Seats.seatOf(drop, sid, k)
          if (Seats.isPartial(seat, keep.minutes) || keep.minutes !== drop.minutes) seats[sid] = { offset: Math.max(0, toMinutes(drop.start) - toMinutes(keep.start) + seat.offset), minutes: seat.minutes }
          if (drop.notes?.[sid]) notes[sid] = drop.notes[sid]
        }
        set({
          sessions: s.sessions.map((x) => x.id === keep.id ? { ...x, studentIds: [...x.studentIds, ...add], seats, notes, subjects: [...new Set([...Sch.subjectsOf(x), ...Sch.subjectsOf(drop)])] }
            : x.id === drop.id ? { ...x, cancelled: true, cancelReason: `รวมเข้ากับคาบ ${keep.subject} ${keep.start} (แก้คาบชน)` } : x),
        })
        log("class", add, "รวมคาบ (แก้คาบชน)", `${drop.subject} ${fmtDate(drop.date)} ${drop.start} → ${keep.subject} ${keep.start} · ${L(s, keep.roomId)}`)
        return { ok: true, value: { students: add.length } }
      },

      undoLastMove: () => {
        if (!lastMove) return fail("ไม่มีการย้ายให้ย้อนกลับ")
        set({ sessions: lastMove.sessions, classes: lastMove.classes, entitlements: lastMove.entitlements })
        lastMove = null
        return OK
      },

      setDayBlocks: ({ branchId, date, blocks, scope, days, shift }) => {
        const s = get()
        if (!canEditBlocks(s.me(), branchId)) return fail("ตั้งช่วงเวลาได้เฉพาะ Admin / Manager ของสาขา")
        const err = Sch.validateBlocks(blocks)
        if (err) return fail(err)
        const branch = s.branches.find((b) => b.id === branchId)!
        const now = s.now()
        const patch = Sch.applyBlocks(branch, date, blocks, scope, days)
        const nextBranch = { ...branch, ...patch }
        const period = Sch.periodsOn(branch, date)[0]
        const affected = Sch.blockChangeReaches(branch, date, scope, days)
        let sessions = s.sessions, classes = s.classes, shifted = 0, skipped = 0
        const movedIds: ID[] = []
        if (shift) {
          const todo = s.sessions.filter((x) => x.branchId === branchId && !x.cancelled && affected(x.date) && Sch.sessionState(x, now) === "upcoming")
          // move them all together (a block's sessions move as one), then put back only those that now clash
          const plan = new Map(todo.flatMap((x) => { const to = Sch.shiftInBlock(x.start, x.minutes, Sch.blocksOn(branch, x.date), Sch.blocksOn(nextBranch, x.date)); return to ? [[x.id, to] as const] : [] }))
          const withPlan = () => s.sessions.map((y) => (plan.has(y.id) ? { ...y, ...plan.get(y.id)!, customized: true } : y))
          for (let guard = 0; guard < 50 && plan.size; guard++) {
            const added = Sch.introducedConflicts(s.sessions, withPlan(), [...plan.keys()], nextBranch, s.staff).added
            const bad = [...new Set(added.flatMap((c) => c.sessionIds))].filter((id) => plan.has(id))
            if (!bad.length) break
            for (const id of bad) { plan.delete(id); skipped++ }
          }
          sessions = withPlan()
          movedIds.push(...plan.keys())
          shifted = plan.size
          // classes whose weekly slot sat in a moved block follow it for future sessions (normal-day plans only)
          if (scope === "following" && !period) {
            classes = classes.map((k) => {
              if (k.branchId !== branchId || !k.active || !affected(nextWeekday(date, k.weekday))) return k
              const d = nextWeekday(date, k.weekday)
              const to = Sch.shiftInBlock(k.start, k.minutes, Sch.blocksOn(branch, d), Sch.blocksOn(nextBranch, d))
              return to ? { ...k, ...to } : k
            })
          }
        }
        const label = `${blocks.map((b) => `${b.start}–${b.end}`).join(", ") || "ไม่มีช่วง"}`
        const where = patch.periodName ? `ช่วง ${patch.periodName}` : scope === "day" ? `เฉพาะ ${fmtDate(date, { weekday: true })}` : `${days === "weekdays" ? "จ.–ศ." : days === "weekend" ? "ส.–อา." : days === "all" ? "ทุกวัน" : `ทุก${["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัส", "วันศุกร์", "วันเสาร์"][weekdayOf(date)]}`} ตั้งแต่ ${fmtDate(date)}`
        set({
          branches: s.branches.map((b) => (b.id === branchId ? nextBranch : b)),
          sessions, classes,
          notifications: [Notif.notify({ id: uid("no"), at: now, kind: "info", title: "เปลี่ยนช่วงเวลาคลาส", body: `${branch.name} · ${where} · ${label}${shifted ? ` · เลื่อนคาบตาม ${shifted} คาบ` : ""}`, fromId: s.userId, audience: { roles: Notif.ALL_ROLES, branchId } }), ...s.notifications],
        })
        if (movedIds.length) touchSessions(movedIds, "เลื่อนเวลาตามช่วงคลาสใหม่")
        return { ok: true, value: { shifted, skipped, period: patch.periodName } }
      },

      markSessionSeen: (sessionId) => {
        const s = get()
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!se?.changed) return
        set({ sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, seenBy: { ...x.seenBy, [s.userId]: s.now().toISOString() } } : x)) })
      },

      setSessionNote: (sessionId, studentId, text) => {
        const s = get()
        const me = s.me()
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!se) return fail("ไม่พบคาบเรียน")
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("แก้โน้ตได้เฉพาะคาบที่คุณสอน")
        const clean = text.trim().slice(0, 200)
        const notes = { ...se.notes }
        if (clean) notes[studentId] = clean
        else delete notes[studentId]
        set({ sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, notes } : x)) })
        return OK
      },

      setSeat: (scope, id, studentId, seat) => {
        const s = get()
        if (!can(s.me(), "session.manage")) return fail("คุณไม่มีสิทธิ์จัดเวลาเรียนของนักเรียน")
        const len = scope === "class" ? s.classes.find((k) => k.id === id)?.minutes : s.sessions.find((x) => x.id === id)?.minutes
        if (!len) return fail("ไม่พบคลาส/คาบ")
        if (seat && (seat.offset < 0 || seat.minutes <= 0 || seat.offset + seat.minutes > len)) return fail("ช่วงเวลาไม่อยู่ในคาบ")
        const put = <T extends { seats?: Record<ID, Seat> }>(x: T): T => {
          const seats = { ...x.seats }
          if (seat && Seats.isPartial(seat, len)) seats[studentId] = seat
          else delete seats[studentId]
          return { ...x, seats }
        }
        if (scope === "class") set({ classes: s.classes.map((k) => (k.id === id ? put(k) : k)) })
        else set({ sessions: s.sessions.map((x) => (x.id === id ? put(x) : x)) })
        log("class", [studentId], "ตั้งเวลาเรียนในคลาส", `${scope === "class" ? "ทุกคาบ" : "คาบนี้"} · ${seat ? Seats.seatLabel(seat, len) : "เต็มคลาส"}`)
        return OK
      },

      teacherLeave: (sessionId, { reason, substituteId }) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!se) return fail("ไม่พบคาบเรียน")
        if (Sch.sessionState(se, s.now()) === "closed" || se.cancelled) return fail("คาบนี้ปิดหรือยกเลิกไปแล้ว")
        if (!se.teacherId) return fail("คาบนี้ยังไม่มีครูหลัก")
        if (!reason.trim()) return fail("กรอกเหตุผลที่ครูลา")
        const record = { teacherId: se.teacherId, reason: reason.trim(), substituteId, by: s.userId, at: s.now().toISOString() }
        const who = s.staff.find((t) => t.id === se.teacherId)?.nickname ?? "ครู"
        if (substituteId) {
          const sub = s.staff.find((t) => t.id === substituteId)
          if (!sub?.active) return fail("เลือกครูสอนแทนที่ยังทำงานอยู่")
          const branch = s.branches.find((b) => b.id === se.branchId)!
          const next = { ...se, teacherId: substituteId, coTeacherIds: se.coTeacherIds.filter((x) => x !== substituteId), teacherLeave: record }
          const clash = Sch.introducedConflicts(s.sessions, s.sessions.map((x) => (x.id === sessionId ? next : x)), [sessionId], branch, s.staff, ["teacher"]).added[0]
          if (clash) return fail(`${sub.nickname} สอนแทนไม่ได้ — ${clash.message}`)
          set({ sessions: s.sessions.map((x) => (x.id === sessionId ? next : x)) })
          log("class", se.studentIds, "ครูลา · มีครูสอนแทน", `${se.subject} ${fmtDate(se.date)} ${se.start} · ${who} ลา (${reason.trim()}) · ${sub.nickname} สอนแทน`)
          return { ok: true, value: { extended: 0 } }
        }
        // no substitute: cancel — every student's package runs one class longer (resolveEntitlements)
        const before = new Map(se.studentIds.map((sid) => [sid, resolvedFor(sid)]))
        set({
          sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, cancelled: true, cancelReason: `ครู${who}ลา: ${reason.trim()}`, teacherLeave: record } : x)),
          notifications: [
            Notif.notify({ id: uid("no"), at: s.now(), kind: "session_cancelled", title: `ครู${who}ลา · ยกเลิกคาบ`, body: `${se.subject} ${fmtDate(se.date)} ${se.start} · นักเรียน ${se.studentIds.length} คน เลื่อนวันจบคอร์สออกไป 1 คาบ · ${reason.trim()}`, fromId: s.userId, audience: { roles: OFFICE_ROLES, branchId: se.branchId, staffIds: Sch.teachersOf(se) } }),
            ...s.notifications,
          ],
        })
        se.studentIds.forEach((sid) => syncMakeUp(sid, before.get(sid)!))
        log("class", se.studentIds, "ครูลา · ยกเลิกคาบ", `${se.subject} ${fmtDate(se.date)} ${se.start} · ${who} ลา (${reason.trim()}) · เลื่อนวันจบคอร์สให้นักเรียน ${se.studentIds.length} คน`, true)
        return { ok: true, value: { extended: se.studentIds.length } }
      },

      markLeave: (sessionId, studentId, { count, noQuota }) => {
        const s = get()
        const me = s.me()
        if (!can(me, "attendance.mark")) return fail("คุณไม่มีสิทธิ์เช็คชื่อ")
        if (!Number.isInteger(count) || count < 0 || count > 60) return fail("จำนวนคาบลา 1–60")
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!se) return fail("ไม่พบคาบเรียน")
        const now = s.now()
        const cur = s.attendance.find((a) => a.sessionId === sessionId && a.studentId === studentId)
        const groupId = cur?.leaveGroup ?? uid("lv")
        const inGroup = s.attendance.filter((a) => a.studentId === studentId && cur?.leaveGroup && a.leaveGroup === cur.leaveGroup)
        const byId = new Map(s.sessions.map((x) => [x.id, x]))
        // the group always starts at its first session, so editing from any day of it means the same leave
        const start = inGroup.map((a) => byId.get(a.sessionId)!).filter(Boolean).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0] ?? se
        const ent = Att.coveringEntitlement(studentId, start, s.entitlements)
        const classIds = ent?.classIds.length ? ent.classIds : start.classId ? [start.classId] : []
        const run = start.classId ? Att.leaveRunSessions(studentId, start, s.sessions, classIds, count) : count > 0 ? [start] : []
        const runIds = new Set(run.map((x) => x.id))
        const closed = (id: ID) => { const x = byId.get(id); return !x || !Att.canMark(x, "leave", now).ok }
        const beforeEnds = resolvedFor(studentId)
        // keep: other students' marks, this student's marks outside the group, and group marks on closed sessions
        const keep = s.attendance.filter((a) => !(a.studentId === studentId && ((cur?.leaveGroup && a.leaveGroup === cur.leaveGroup && !closed(a.sessionId)) || (runIds.has(a.sessionId) && a.status === "leave"))))
        const taken = new Set(keep.filter((a) => a.studentId === studentId).map((a) => a.sessionId))
        const added = run.filter((x) => !taken.has(x.id) && !closed(x.id)).map((x) => ({ sessionId: x.id, studentId, status: "leave" as const, markedBy: me.id, markedAt: now.toISOString(), noQuota: noQuota || undefined, leaveGroup: groupId }))
        set({ attendance: [...keep, ...added] })
        syncMakeUp(studentId, beforeEnds)
        const last = run[run.length - 1]
        log("attendance", [studentId], count ? (inGroup.length ? "แก้การลา" : "ลา") : "ยกเลิกการลา",
          count ? `${added.length} คาบ ${fmtDate(start.date)}${last && last.id !== start.id ? `–${fmtDate(last.date)}` : ""} · ${noQuota ? "ไม่หักโควตา" : "หักโควตา"}` : `${start.subject} ตั้งแต่ ${fmtDate(start.date)}`)
        return { ok: true, value: { marked: added.length } }
      },

      mark: (sessionId, studentId, status, opts) => {
        const s = get()
        const me = s.me()
        if (!can(me, "attendance.mark")) return fail("คุณไม่มีสิทธิ์เช็คชื่อ")
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("เช็คชื่อได้เฉพาะคาบที่คุณสอน")
        const r = Att.canMark(se, status, s.now())
        if (!r.ok) return r
        const rest = s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId))
        const beforeEnds = resolvedFor(studentId)
        // C3: summaries only exist for present students; keep text as draft instead of deleting silently
        set({ attendance: [...rest, { sessionId, studentId, status, markedBy: me.id, markedAt: s.now().toISOString(), noQuota: status === "leave" && opts?.noQuota ? true : undefined }] })
        const before = s.attendance.find((a) => a.sessionId === sessionId && a.studentId === studentId)
        const L = { present: "มา", absent: "ขาด", leave: "ลา" } as const
        log("attendance", [studentId], before ? "แก้การเช็คชื่อ" : "เช็คชื่อ", `${se.subject} ${fmtDate(se.date)} ${se.start} · ${before ? `${L[before.status]} → ` : ""}${L[status]}${status === "leave" ? (opts?.noQuota ? " (ไม่หักโควตา)" : " (หักโควตา)") : ""}`)
        // the child really came to the test/trial → lead moves on by itself
        const asm = Forms.assessmentIn(sessionId, studentId, s.assessments)
        if (asm && status === "present") advanceLead(asm.leadId, Forms.ATTENDED_STAGE[asm.type])
        syncMakeUp(studentId, beforeEnds)
        // C5: leave beyond quota is allowed but flagged (quota rule awaiting owner confirmation)
        if (status === "leave" && !opts?.noQuota) {
          const ent = Att.coveringEntitlement(studentId, se, s.entitlements)
          if (ent && Att.leavesUsed(ent, s.sessions, s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId)), s.leaves) >= Att.leaveQuota(ent))
            return { ok: true, value: undefined, warnings: [`ลาเกินโควตาแล้ว (โควตา ${Att.leaveQuota(ent)} ครั้ง) — แจ้งผู้ปกครองเรื่องการชดเชย`] }
        }
        return OK
      },

      saveStudentLeave: (input) => {
        const s = get()
        const me = s.me()
        const r = Att.canSaveLeave(me, input.from, input.to, input.reason)
        if (!r.ok) return r
        const stu = s.students.find((x) => x.id === input.studentId)
        if (!stu) return fail("ไม่พบนักเรียน")
        const now = s.now()
        const editing = input.id ? s.leaves.find((l) => l.id === input.id) : undefined
        const rec = editing
          ? { ...editing, from: input.from, to: input.to, reason: input.reason.trim(), updatedBy: me.id, updatedAt: now.toISOString() }
          : { id: uid("lv"), studentId: input.studentId, from: input.from, to: input.to, reason: input.reason.trim(), createdBy: me.id, createdAt: now.toISOString() }
        const teacherIds = People.teachersOfStudent(input.studentId, s.sessions, toDateStr(now))
        set({
          leaves: editing ? s.leaves.map((l) => (l.id === rec.id ? rec : l)) : [rec, ...s.leaves],
          notifications: [
            Notif.notify({
              id: uid("no"), at: now, kind: "student_leave",
              title: editing ? "แก้ไขการลาไม่หักโควตา" : "บันทึกการลาไม่หักโควตา",
              body: `${stu.nickname} ลา ${fmtDate(input.from)} – ${fmtDate(input.to)} · ${input.reason.trim()}`,
              fromId: me.id, audience: { roles: ["manager"], branchId: stu.branchId, staffIds: teacherIds },
            }),
            ...s.notifications,
          ],
        })
        log("attendance", [input.studentId], editing ? "แก้ลาพักยาว" : "บันทึกลาพักยาว", `${fmtDate(input.from)} – ${fmtDate(input.to, { year: true })} · ${input.reason.trim()}`)
        return OK
      },

      clearMark: (sessionId, studentId) => {
        const s = get()
        const me = s.me()
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("แก้การเช็คชื่อได้เฉพาะคาบที่คุณสอน")
        const r = Att.canClear(se, s.now())
        if (!r.ok) return r
        const beforeEnds = resolvedFor(studentId)
        set({ attendance: s.attendance.filter((a) => !(a.sessionId === sessionId && a.studentId === studentId)) })
        log("attendance", [studentId], "ล้างการเช็คชื่อ", `${se.subject} ${fmtDate(se.date)} ${se.start}`)
        syncMakeUp(studentId, beforeEnds)
        return OK
      },

      removeStudentFromSession: (sessionId, studentId) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!se || !se.studentIds.includes(studentId)) return fail("นักเรียนไม่ได้อยู่ในคาบนี้")
        if (Sch.sessionState(se, s.now()) === "closed") return fail("คาบนี้ปิดแล้ว")
        if (s.attendance.some((a) => a.sessionId === sessionId && a.studentId === studentId)) return fail("เช็คชื่อไปแล้ว — ล้างการเช็คชื่อก่อนถึงจะเอาออกได้")
        set({ sessions: s.sessions.map((x) => (x.id === sessionId ? { ...x, studentIds: x.studentIds.filter((y) => y !== studentId), rescheduledIn: x.rescheduledIn?.filter((y) => y !== studentId) } : x)) })
        log("class", [studentId], "เอาออกจากคาบ", `${se.subject} ${fmtDate(se.date, { weekday: true })} ${se.start}`)
        return OK
      },

      rescheduleStudent: (fromSessionId, studentId, toSessionId) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const from = s.sessions.find((x) => x.id === fromSessionId)
        const to = s.sessions.find((x) => x.id === toSessionId)
        if (!from || !to) return fail("ไม่พบคาบเรียน")
        const klass = s.classes.find((k) => k.id === to.classId)
        const r = Sch.canRescheduleStudent(from, to, studentId, s.now(), klass ? Sch.CAPACITY[klass.type] : Sch.CAPACITY.group)
        if (!r.ok) return r
        if (s.attendance.some((a) => a.sessionId === fromSessionId && a.studentId === studentId)) return fail("เช็คชื่อคาบเดิมไปแล้ว — ล้างการเช็คชื่อก่อน")
        set({
          sessions: s.sessions.map((x) =>
            x.id === fromSessionId ? { ...x, studentIds: x.studentIds.filter((y) => y !== studentId), rescheduledOut: [...(x.rescheduledOut ?? []).filter((m) => m.studentId !== studentId), { studentId, toSessionId }] }
            : x.id === toSessionId ? { ...x, studentIds: [...x.studentIds, studentId], rescheduledIn: [...(x.rescheduledIn ?? []), studentId] }
            : x,
          ),
        })
        log("class", [studentId], "ย้ายคาบ (Re-schedule)", `${from.subject} ${fmtDate(from.date, { weekday: true })} ${from.start} → ${fmtDate(to.date, { weekday: true })} ${to.start}${klass ? ` · ${klass.name}` : ""}`)
        return OK
      },

      undoReschedule: (fromSessionId, studentId) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const from = s.sessions.find((x) => x.id === fromSessionId)
        const move = from?.rescheduledOut?.find((m) => m.studentId === studentId)
        const to = s.sessions.find((x) => x.id === move?.toSessionId)
        if (!from || !move) return fail("ไม่พบการย้ายคาบนี้")
        if (to && s.attendance.some((a) => a.sessionId === to.id && a.studentId === studentId)) return fail("เช็คชื่อในคาบที่ย้ายไปแล้ว — ยกเลิกการย้ายไม่ได้")
        if (Sch.sessionState(from, s.now()) === "closed") return fail("คาบเดิมปิดแล้ว")
        set({
          sessions: s.sessions.map((x) =>
            x.id === fromSessionId ? { ...x, studentIds: [...x.studentIds, studentId], rescheduledOut: x.rescheduledOut?.filter((m) => m.studentId !== studentId) }
            : to && x.id === to.id ? { ...x, studentIds: x.studentIds.filter((y) => y !== studentId), rescheduledIn: x.rescheduledIn?.filter((y) => y !== studentId) }
            : x,
          ),
        })
        log("class", [studentId], "ยกเลิกการย้ายคาบ", `กลับมาเรียน ${fmtDate(from.date, { weekday: true })} ${from.start}`)
        return OK
      },

      removeStudentFromClass: (classId, studentId) => {
        const s = get()
        const perm = requirePerm(s.me(), "class.manage")
        if (!perm.ok) return perm
        const k = s.classes.find((c) => c.id === classId)!
        const r = Att.removeFromClass(k, studentId, s.sessions, s.now())
        set({ classes: s.classes.map((c) => (c.id === classId ? r.klass : c)), sessions: r.sessions })
        log("class", [studentId], "ออกจากคลาส", `${k.name} · ${r.removedFrom} คาบที่ยังไม่เริ่ม`)
        return { ok: true, value: { removedFrom: r.removedFrom } }
      },

      // ---------------- summaries ----------------
      applyLessonToSession: (sessionId, lesson) => {
        const s = get()
        const me = s.me()
        const se = s.sessions.find((x) => x.id === sessionId)!
        if (!can(me, "session.manage") && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("เขียนสรุปได้เฉพาะคาบที่คุณสอน")
        const present = s.attendance.filter((a) => a.sessionId === sessionId && a.status === "present").map((a) => a.studentId)
        const at = s.now().toISOString()
        const L = { bookId: lesson.bookId || undefined, topicId: lesson.topicId || undefined, detail: lesson.detail?.trim() || undefined }
        let count = 0
        let summaries = s.summaries
        for (const studentId of present) {
          const ex = summaries.find((x) => x.sessionId === sessionId && x.studentId === studentId)
          if (ex && ex.status !== "draft" && ex.status !== "changes_requested") continue // already submitted — leave it
          count++
          summaries = ex
            ? summaries.map((x) => (x === ex ? { ...x, ...L, lastEditorId: me.id, history: [...x.history, { at, by: me.id, action: "edit" as const }] } : x))
            : [...summaries, { id: uid("sm"), sessionId, studentId, ...L, text: "", status: "draft" as const, authorId: me.id, lastEditorId: me.id, history: [{ at, by: me.id, action: "write" as const }] }]
        }
        set({ summaries })
        return { ok: true, value: { count } }
      },

      addLessonBook: (branchId, name) => {
        const s = get()
        if (!Les.canUseCatalog(s.me(), branchId)) return fail("เฉพาะครู/ผู้ตรวจสรุปของสาขานี้")
        const err = Les.validateCatalogName(name)
        if (err) return fail(err)
        const same = Les.findSame(Les.booksOf(branchId, s.lessonBooks), name)
        if (same) return { ok: true, value: same }
        const b: LessonBook = { id: uid("bk"), branchId, name: Les.cleanName(name), createdBy: s.userId, createdAt: s.now().toISOString() }
        set({ lessonBooks: [...s.lessonBooks, b] })
        return { ok: true, value: b }
      },

      addLessonTopic: (bookId, name) => {
        const s = get()
        const book = s.lessonBooks.find((b) => b.id === bookId)
        if (!book) return fail("เลือกหนังสือก่อน")
        if (!Les.canUseCatalog(s.me(), book.branchId)) return fail("เฉพาะครู/ผู้ตรวจสรุปของสาขานี้")
        const err = Les.validateCatalogName(name)
        if (err) return fail(err)
        const same = Les.findSame(Les.topicsOf(bookId, s.lessonTopics), name)
        if (same) return { ok: true, value: same }
        const t: LessonTopic = { id: uid("tp"), bookId, name: Les.cleanName(name), createdBy: s.userId, createdAt: s.now().toISOString() }
        set({ lessonTopics: [...s.lessonTopics, t] })
        return { ok: true, value: t }
      },

      renameLessonItem: (kind, id, name) => {
        const s = get()
        const err = Les.validateCatalogName(name)
        if (err) return fail(err)
        const book = kind === "book" ? s.lessonBooks.find((b) => b.id === id) : s.lessonBooks.find((b) => b.id === s.lessonTopics.find((t) => t.id === id)?.bookId)
        if (!book || !Les.canUseCatalog(s.me(), book.branchId)) return fail("เฉพาะครู/ผู้ตรวจสรุปของสาขานี้")
        const siblings = kind === "book" ? Les.booksOf(book.branchId, s.lessonBooks) : Les.topicsOf(book.id, s.lessonTopics)
        const same = Les.findSame(siblings.filter((x) => x.id !== id), name)
        if (same) return fail(`มี "${same.name}" อยู่แล้ว — ใช้ "รวมเข้ากับ" แทนการเปลี่ยนชื่อ`)
        if (kind === "book") set({ lessonBooks: s.lessonBooks.map((b) => (b.id === id ? { ...b, name: Les.cleanName(name) } : b)) })
        else set({ lessonTopics: s.lessonTopics.map((t) => (t.id === id ? { ...t, name: Les.cleanName(name) } : t)) })
        return OK
      },

      mergeLessonItem: (kind, fromId, intoId) => {
        const s = get()
        if (fromId === intoId) return fail("เลือกอีกรายการที่จะรวมเข้า")
        const bookOf = (id: ID) => (kind === "book" ? s.lessonBooks.find((b) => b.id === id) : s.lessonBooks.find((b) => b.id === s.lessonTopics.find((t) => t.id === id)?.bookId))
        const book = bookOf(intoId)
        if (!book || bookOf(fromId)?.branchId !== book.branchId || !Les.canUseCatalog(s.me(), book.branchId)) return fail("รวมได้เฉพาะรายการในสาขาเดียวกัน")
        let { summaries, lessonTopics } = s
        let moved = 0
        if (kind === "book") {
          // topics come along; a topic already in the kept book (same name) takes the summaries of its twin
          const keep = Les.topicsOf(intoId, lessonTopics)
          for (const t of Les.topicsOf(fromId, lessonTopics)) {
            const twin = Les.findSame(keep, t.name)
            if (twin) { summaries = summaries.map((x) => (x.topicId === t.id ? { ...x, topicId: twin.id } : x)); lessonTopics = lessonTopics.filter((x) => x.id !== t.id) }
            else lessonTopics = lessonTopics.map((x) => (x.id === t.id ? { ...x, bookId: intoId } : x))
          }
          summaries = summaries.map((x) => (x.bookId === fromId ? (moved++, { ...x, bookId: intoId }) : x))
          set({ summaries, lessonTopics, lessonBooks: s.lessonBooks.filter((b) => b.id !== fromId) })
        } else {
          summaries = summaries.map((x) => (x.topicId === fromId ? (moved++, { ...x, topicId: intoId }) : x))
          set({ summaries, lessonTopics: lessonTopics.filter((t) => t.id !== fromId) })
        }
        return { ok: true, value: { moved } }
      },

      saveSummary: (sessionId, studentId, text, submit, lesson) => {
        const s = get()
        const me = s.me()
        if (!text.trim() && submit) return fail("เขียนสรุปก่อนส่ง")
        const existing = s.summaries.find((x) => x.sessionId === sessionId && x.studentId === studentId)
        if (existing) {
          const r = Sum.canEdit(existing, me)
          if (!r.ok) return r
        } else if (!can(me, "summary.write") && !can(me, "summary.approve")) return fail("คุณไม่มีสิทธิ์เขียนสรุป")
        const se = s.sessions.find((x) => x.id === sessionId)
        if (!can(me, "session.manage") && se && se.teacherId !== me.id && !se.coTeacherIds.includes(me.id)) return fail("เขียนสรุปได้เฉพาะคาบที่คุณสอน")
        const at = s.now().toISOString()
        const L = lesson ? { bookId: lesson.bookId || undefined, topicId: lesson.topicId || undefined, detail: lesson.detail?.trim() || undefined } : {}
        const next: LessonSummary = existing
          ? { ...existing, ...L, text, lastEditorId: me.id, status: submit ? "submitted" : existing.status === "changes_requested" ? "changes_requested" : "draft", history: [...existing.history, { at, by: me.id, action: submit ? "submit" : "edit" }] }
          : { id: uid("sm"), sessionId, studentId, ...L, text, status: submit ? "submitted" : "draft", authorId: me.id, lastEditorId: me.id, history: [{ at, by: me.id, action: submit ? "submit" : "write" }] }
        set({ summaries: existing ? s.summaries.map((x) => (x.id === existing.id ? next : x)) : [...s.summaries, next] })
        return OK
      },

      requestSummaryChanges: (id, note) => {
        const s = get()
        const me = s.me()
        if (!can(me, "summary.approve")) return fail("คุณไม่มีสิทธิ์")
        if (!note.trim()) return fail("บอกครูว่าต้องแก้อะไร")
        const cur = s.summaries.find((x) => x.id === id)!
        if (cur.status === "sent") return fail("ส่งถึงผู้ปกครองแล้ว ขอแก้ไม่ได้")
        set({ summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "changes_requested", history: [...x.history, { at: s.now().toISOString(), by: me.id, action: "request_changes", note }] } : x)) })
        return OK
      },

      approveSummary: (id, forceRemark) => {
        const s = get()
        const cur = s.summaries.find((x) => x.id === id)!
        const forced = forceRemark !== undefined
        const r = forced ? Sum.canForceApprove(cur, s.me(), forceRemark) : Sum.canApprove(cur, s.me())
        if (!r.ok) return r
        const event = { at: s.now().toISOString(), by: s.userId, action: forced ? ("force_approve" as const) : ("approve" as const), note: forced ? forceRemark.trim() : undefined }
        const se = s.sessions.find((x) => x.id === cur.sessionId)
        const stu = s.students.find((x) => x.id === cur.studentId)
        set({
          summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "approved", history: [...x.history, event] } : x)),
          notifications: forced && se
            ? [forceNotice(s, se.branchId, "สรุปการเรียน", `${stu?.nickname ?? ""} · ${se.subject} ${fmtDate(se.date)}`, forceRemark), ...s.notifications]
            : s.notifications,
        })
        return OK
      },

      sendSummary: (id) => {
        const s = get()
        const cur = s.summaries.find((x) => x.id === id)!
        const stu = s.students.find((x) => x.id === cur.studentId)!
        const parents = s.families.find((f) => f.id === stu.familyId)?.parents ?? []
        const r = Sum.canSend(cur, parents)
        if (!r.ok) return r
        const se = s.sessions.find((x) => x.id === cur.sessionId)!
        const delivery = pushLine(stu.familyId, Msg.summaryMessage(cur, { student: stu, session: se, book: s.lessonBooks.find((b) => b.id === cur.bookId)?.name, topic: s.lessonTopics.find((t) => t.id === cur.topicId)?.name }), (ok, error) => {
          if (ok) return log("attendance", [cur.studentId], "ส่งสรุปการเรียน", "ถึงผู้ปกครองทาง LINE แล้ว")
          // not delivered → back to "approved" so it can be sent again
          set((st) => ({ summaries: st.summaries.map((x) => (x.id === id ? { ...x, status: "approved", history: x.history.slice(0, -1) } : x)) }))
          toast.error(`ส่งสรุปของ ${stu.nickname} ทาง LINE ไม่สำเร็จ — ${error ?? ""}`)
        })
        if (delivery === "no_line") return fail("ผู้ปกครองยังไม่ได้ผูก LINE — ยังไม่ได้ส่ง (สรุปยังอยู่สถานะอนุมัติแล้ว)")
        set({ summaries: s.summaries.map((x) => (x.id === id ? { ...x, status: "sent", history: [...x.history, { at: s.now().toISOString(), by: s.userId, action: "send" }] } : x)) })
        if (delivery === "delivered") log("attendance", [cur.studentId], "ส่งสรุปการเรียน", "ส่งถึงผู้ปกครองทาง LINE")
        return { ok: true, value: { delivered: true } }
      },

      // ---------------- billing ----------------
      saveInvoice: (inv) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const existing = s.invoices.find((x) => x.id === inv.id)
        if (existing && existing.status !== "draft" && existing.status !== "pending_approval") return fail("แก้ได้เฉพาะใบที่ยังไม่อนุมัติ")
        const totals = Bill.invoiceTotals(inv, ctxOf(s, inv.branchId))
        const errs = Bill.validateInvoiceDraft(inv, totals, { lastAssessment: Forms.lastAssessmentDate(inv.studentId, s.assessments) })
        if (errs.length) return fail(errs[0])
        // an extra bus day is charged once: it must still be pending (not on another live invoice)
        const open = new Set(Bill.pendingBusAddOns(inv.studentId, s.busAddOns, s.invoices, inv.id).map((x) => x.id))
        if ((inv.busExtras ?? []).some((x) => !open.has(x.addOnId))) return fail("ค่ารถเพิ่มบางวันถูกเรียกเก็บในใบอื่นแล้ว — เปิดใบใหม่อีกครั้ง")
        // credit can't be used twice or on another course
        for (const u of inv.creditsUsed ?? []) {
          const left = Refund.availableCredit(inv.studentId, u.courseId, s.creditNotes, s.invoices, inv.id).find((c) => c.creditNoteId === u.creditNoteId)?.amount ?? 0
          if (u.amount > left) return fail("เครดิตคอร์สถูกใช้ไปแล้วบางส่วน — เปิดใบใหม่อีกครั้ง")
        }
        // the number is issued the moment the invoice is created — a real document from then on (void, never delete)
        const number = existing?.number ?? inv.number ?? Bill.nextInvoiceNumber("INV", ctxOf(s, inv.branchId).branch, toDateStr(s.now()), s.invoices.map((x) => x.number))
        // editing a generated invoice sends it back (needs new PDF + approval)
        const next: Invoice = existing && existing.status === "pending_approval" ? { ...inv, number, status: "draft", pdf: "none" } : { ...inv, number, status: "draft" }
        set({ invoices: existing ? s.invoices.map((x) => (x.id === inv.id ? next : x)) : [next, ...s.invoices] })
        log("billing", [inv.studentId], existing ? "แก้ใบแจ้งหนี้" : "สร้างใบแจ้งหนี้", `${number} · ${fmtMoney(totals.total)}`)
        return { ok: true, value: next }
      },

      generatePdf: (id) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === id)!
        if (inv.status !== "draft") return fail("สร้าง PDF ได้จากใบที่ยังไม่สร้าง PDF เท่านั้น")
        const branch = s.branches.find((b) => b.id === inv.branchId)!
        const today = toDateStr(s.now())
        const number = inv.number ?? Bill.nextInvoiceNumber("INV", branch, today, s.invoices.map((x) => x.number))
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, number, pdf: "generating" } : x)) })
        setTimeout(() => {
          const ok = Math.random() > 0.1
          set((st) => ({
            invoices: st.invoices.map((x) => (x.id === id ? { ...x, pdf: ok ? "ready" : "failed", status: ok ? "pending_approval" : "draft" } : x)),
            notifications: ok
              ? [Notif.notify({ id: uid("no"), at: new Date(), kind: "approval_needed", title: "ใบแจ้งหนี้รออนุมัติ", body: `${number} รอคนอนุมัติ (ไม่ใช่คนสร้าง)`, fromId: inv.createdBy, audience: { roles: Bill.APPROVER_ROLES, branchId: inv.branchId } }), ...st.notifications]
              : st.notifications,
          }))
        }, 1800)
        return { ok: true, value: { number } }
      },

      approveInvoice: (id, forceRemark) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === id)!
        const forced = forceRemark !== undefined
        const r = forced ? Bill.canForceApprove(inv, s.me(), forceRemark) : Bill.canApprove(inv, s.me())
        if (!r.ok) return r
        set({
          invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "approved", approvedBy: s.userId, forced: forced ? { by: s.userId, at: s.now().toISOString(), remark: forceRemark.trim() } : undefined } : x)),
          notifications: forced ? [forceNotice(s, inv.branchId, "ใบแจ้งหนี้", inv.number ?? "", forceRemark), ...s.notifications] : s.notifications,
        })
        log("billing", [inv.studentId], forced ? "Force Approve ใบแจ้งหนี้" : "อนุมัติใบแจ้งหนี้", `${inv.number}${forced ? ` · เหตุผล: ${forceRemark!.trim()}` : ""}`)
        return OK
      },

      sendInvoice: (id, note) => {
        const s = get()
        const inv = { ...s.invoices.find((x) => x.id === id)!, noteToParent: note }
        const r = Bill.canSend(inv)
        if (!r.ok) return r
        const stu = s.students.find((x) => x.id === inv.studentId)!
        const ctx = ctxOf(s, inv.branchId)
        const text = Msg.invoiceMessage(inv, Bill.invoiceTotals(inv, ctx), { student: stu, branch: ctx.branch })
        const delivery = pushLine(stu.familyId, text, (ok, error) => {
          set((st) => ({ invoices: st.invoices.map((x) => (x.id === id ? { ...x, delivery: ok ? "delivered" : "failed", deliveryError: ok ? undefined : error } : x)) }))
          log("billing", [inv.studentId], "ส่งใบแจ้งหนี้", `${inv.number} · ${ok ? "ถึงผู้ปกครองทาง LINE แล้ว" : `ส่ง LINE ไม่สำเร็จ: ${error ?? ""}`}`)
          if (!ok) toast.error(`ส่งใบแจ้งหนี้ ${inv.number} ทาง LINE ไม่สำเร็จ — ${error ?? ""}`)
        })
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...inv, status: "sent", sentAt: s.now().toISOString(), delivery, deliveryError: undefined } : x)) })
        if (delivery !== "sending") log("billing", [inv.studentId], "ส่งใบแจ้งหนี้", `${inv.number} · ${delivery === "delivered" ? "ส่งทาง LINE แล้ว" : "ยังไม่ถึงผู้ปกครอง (ไม่มี LINE)"}`)
        // lead's child got an invoice → the lead is waiting for payment
        const lead = leadOfStudent(inv.studentId)
        if (lead) advanceLead(lead.id, "payment_pending")
        return { ok: true, value: { delivered: delivery !== "no_line" } }
      },

      addBusAddOns: (studentId, days, busFeeId, note) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        if (!days.length) return fail("เพิ่มวันใช้รถอย่างน้อย 1 วัน")
        for (const d of days) { const err = Bill.validateBusAddOn(d); if (err) return fail(err) }
        const dup = Bill.duplicateBusDay(studentId, days, s.busAddOns)
        if (dup) return fail(`${fmtDate(dup)} มีรอบรถนี้อยู่แล้ว`)
        const stu = s.students.find((x) => x.id === studentId)!
        const branch = s.branches.find((b) => b.id === stu.branchId)!
        const rate = Cfg.busRate(branch, busFeeId)
        const at = s.now().toISOString()
        const added: BusAddOn[] = days.map((d) => ({ id: uid("ba"), branchId: branch.id, studentId, ...d, busFeeId, amount: Bill.busAddOnAmount(d, rate), note: note.trim() || undefined, createdBy: s.userId, createdAt: at }))
        const amount = added.reduce((a, x) => a + x.amount, 0)
        set({ busAddOns: [...s.busAddOns, ...added] })
        log("billing", [studentId], "เพิ่มรอบรถ", `${added.map((a) => `${fmtDate(a.date)} ${[a.pickup && "รับ", a.dropoff && "ส่ง"].filter(Boolean).join("+")}`).join(", ")} · ${fmtMoney(amount)} รอเรียกเก็บในใบถัดไป${note.trim() ? ` · ${note.trim()}` : ""}`)
        return { ok: true, value: { count: added.length, amount } }
      },

      removeBusAddOn: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const a = s.busAddOns.find((x) => x.id === id)
        if (!a) return fail("ไม่พบรายการ")
        const inv = Bill.billedOn(id, s.invoices)
        if (inv) return fail(`เรียกเก็บในใบ ${inv.number ?? "ร่าง"} แล้ว — เอาออกจากใบนั้นก่อน`)
        set({ busAddOns: s.busAddOns.filter((x) => x.id !== id) })
        log("billing", [a.studentId], "ลบรอบรถเพิ่ม", `${fmtDate(a.date)} · ${fmtMoney(a.amount)}`)
        return { ok: true, value: undefined }
      },

      createCreditNote: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const inv = s.invoices.find((x) => x.id === input.invoiceId)
        if (!inv) return fail("ไม่พบใบแจ้งหนี้")
        const ctx = ctxOf(s, inv.branchId)
        const items = input.items.filter((i) => i.amount > 0)
        const err = Refund.validateCreditNote({ ...input, items }, inv, Refund.refundableItems(inv, Bill.invoiceTotals(inv, ctx), s.creditNotes), s.creditNotes)
        if (err) return fail(err)
        const number = Bill.nextInvoiceNumber("CN", ctx.branch, toDateStr(s.now()), s.creditNotes.map((x) => x.number))
        const cn: CreditNote = { id: uid("cn"), branchId: inv.branchId, studentId: inv.studentId, number, ...input, items, remark: input.remark.trim(), status: "pending_approval", createdBy: s.userId, createdAt: s.now().toISOString() }
        set({ creditNotes: [cn, ...s.creditNotes] })
        log("billing", [inv.studentId], "สร้างใบลดหนี้", `${number} · ${Refund.CREDIT_MODE_LABEL[cn.mode]} ${fmtMoney(Refund.creditNoteTotal(cn))} · อ้างถึง ${inv.number} · ${[...cn.reasons, cn.remark].filter(Boolean).join(", ")}`)
        return { ok: true, value: cn }
      },

      approveCreditNote: (id, forceRemark) => {
        const s = get()
        const cn = s.creditNotes.find((x) => x.id === id)!
        const forced = forceRemark !== undefined
        const r = forced ? Refund.canForceApproveCreditNote(cn, s.me(), forceRemark) : Refund.canApproveCreditNote(cn, s.me())
        if (!r.ok) return r
        const inv = s.invoices.find((x) => x.id === cn.invoiceId)!
        let { entitlements, sessions, classes } = s
        // the student stops the refunded courses: packages end the day before, later unmarked sessions let go
        if (cn.stopFrom) {
          const stop = cn.stopFrom
          const totals = Bill.invoiceTotals(inv, ctxOf(s, inv.branchId))
          const marked = new Set(s.attendance.filter((a) => a.studentId === cn.studentId).map((a) => a.sessionId))
          for (const item of cn.items.filter((i) => i.key.startsWith("line:"))) {
            const l = totals.lines.find((x) => `line:${x.line.id}` === item.key)
            if (!l) continue
            const kept = (l.quote?.slots ?? []).filter((x) => x.date < stop).length
            entitlements = entitlements.map((e) => (e.invoiceId === inv.id && e.courseId === l.line.courseId && e.to >= stop ? { ...e, to: addDays(stop, -1), sessionsTotal: e.kind === "sessions" ? kept : e.sessionsTotal } : e))
            sessions = sessions.map((x) => (x.classId && l.line.classIds.includes(x.classId) && x.date >= stop && !marked.has(x.id) && x.studentIds.includes(cn.studentId) ? { ...x, studentIds: x.studentIds.filter((y) => y !== cn.studentId) } : x))
            // off the class roster unless another package still pays for this class after the stop day
            classes = classes.map((k) => (l.line.classIds.includes(k.id) && !entitlements.some((e) => e.studentId === cn.studentId && e.classIds.includes(k.id) && e.to >= stop) ? { ...k, studentIds: k.studentIds.filter((y) => y !== cn.studentId) } : k))
          }
        }
        set({
          creditNotes: s.creditNotes.map((x) => (x.id === id ? { ...x, status: "approved", approvedBy: s.userId, forced: forced ? { by: s.userId, at: s.now().toISOString(), remark: forceRemark.trim() } : undefined } : x)),
          entitlements, sessions, classes,
          notifications: forced ? [forceNotice(s, cn.branchId, "ใบลดหนี้", cn.number, forceRemark), ...s.notifications] : s.notifications,
        })
        log("billing", [cn.studentId], forced ? "Force Approve ใบลดหนี้" : "อนุมัติใบลดหนี้", `${cn.number} · ${Refund.CREDIT_MODE_LABEL[cn.mode]} ${fmtMoney(Refund.creditNoteTotal(cn))}${cn.stopFrom ? ` · หยุดเรียนตั้งแต่ ${fmtDate(cn.stopFrom)}` : ""}${cn.mode === "credit" ? " · หักในใบถัดไปของคอร์สเดียวกัน" : " · รอโอนคืน"}`, true)
        return OK
      },

      voidCreditNote: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const cn = s.creditNotes.find((x) => x.id === id)!
        if (cn.status !== "pending_approval") return fail("ยกเลิกได้เฉพาะใบลดหนี้ที่ยังไม่อนุมัติ")
        if (!reason.trim()) return fail("กรอกเหตุผลการยกเลิก")
        set({ creditNotes: s.creditNotes.map((x) => (x.id === id ? { ...x, status: "void", voidReason: reason.trim() } : x)) })
        log("billing", [cn.studentId], "ยกเลิกใบลดหนี้", `${cn.number} · ${reason.trim()}`)
        return OK
      },

      recordRefund: (id, rec) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const cn = s.creditNotes.find((x) => x.id === id)!
        const err = Refund.validateRefundRecord(cn, rec)
        if (err) return fail(err)
        set({ creditNotes: s.creditNotes.map((x) => (x.id === id ? { ...x, refund: { fromAccount: rec.fromAccount.trim(), date: rec.date, reference: rec.reference.trim(), recordedBy: s.userId, recordedAt: s.now().toISOString() } } : x)) })
        log("billing", [cn.studentId], "โอนคืนเงิน", `${cn.number} · ${fmtMoney(Refund.creditNoteTotal(cn))} · จาก ${rec.fromAccount.trim()} · ${fmtDate(rec.date)} · ${rec.reference.trim()}`)
        return OK
      },

      voidInvoice: (id, reason) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const inv = s.invoices.find((x) => x.id === id)!
        const r = Bill.canVoid(inv, reason)
        if (!r.ok) return r
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, status: "void", voidReason: reason } : x)) })
        log("billing", [inv.studentId], "ยกเลิกใบแจ้งหนี้", `${inv.number ?? "ร่าง"} · ${reason}`)
        return OK
      },

      recordPayment: (id, p) => {
        const s = get()
        const perm = requirePerm(s.me(), "billing.manage")
        if (!perm.ok) return perm
        const inv = s.invoices.find((x) => x.id === id)!
        const total = Bill.invoiceTotals(inv, ctxOf(s, inv.branchId)).total
        const r = Bill.canRecordPayment(inv, p.amount, total)
        if (!r.ok) return r
        const pay = { id: uid("pay"), ...p, recordedBy: s.userId, recordedAt: s.now().toISOString() }
        set({ invoices: s.invoices.map((x) => (x.id === id ? { ...x, payments: [...x.payments, pay] } : x)) })
        return OK
      },

      confirmPayment: (invoiceId, paymentId, forceRemark) => {
        const s = get()
        const inv = s.invoices.find((x) => x.id === invoiceId)!
        const pay = inv.payments.find((p) => p.id === paymentId)!
        const forced = forceRemark !== undefined
        const r = forced ? Bill.canForceConfirmPayment(pay, s.me(), inv.branchId, forceRemark) : Bill.canConfirmPayment(pay, s.me(), inv.branchId)
        if (!r.ok) return r
        const payments = inv.payments.map((p) =>
          p.id === paymentId ? { ...p, confirmedBy: s.userId, forced: forced ? { by: s.userId, at: s.now().toISOString(), remark: forceRemark.trim() } : undefined } : p,
        )
        if (forced) set({ notifications: [forceNotice(s, inv.branchId, "ยืนยันยอดเงิน", `${inv.number ?? ""} · ${fmtMoney(pay.amount)}`, forceRemark), ...s.notifications] })
        const ctx = ctxOf(s, inv.branchId)
        const totals = Bill.invoiceTotals(inv, ctx)
        const paid = payments.filter((p) => p.confirmedBy).reduce((a, p) => a + p.amount, 0) >= totals.total
        let next: Invoice = { ...inv, payments }
        let { entitlements, classes, sessions } = s
        if (paid) {
          next = { ...next, status: "paid", receiptNumber: inv.number ?? undefined } // the receipt carries the invoice's number
          // auto-claim: entitlement covers exactly the paid window (BL-19) and the student joins the class sessions in it
          for (const l of totals.lines) {
            if (!l.course || !l.quote) continue
            const q = l.quote, co = l.course, classIds = l.line.classIds
            const paidSlot = new Set(q.slots.map((x) => `${x.classId}|${x.date}`))
            // hour packs are counted; week and month packs are a window with any number of sessions
            // hour packs are used up by minutes really attended (owner 2026-09-30)
            entitlements = [...entitlements, { id: uid("en"), studentId: inv.studentId, courseId: co.id, subjects: co.subjects, classIds, invoiceId: inv.id, kind: co.unit === "hour" ? "sessions" : "subscription", from: q.from, to: q.to, sessionsTotal: q.slots.length, minutesTotal: co.unit === "hour" ? q.slots.reduce((m, x) => m + x.minutes, 0) : undefined, carryMinutes: q.carryOut || undefined }]
            // join the class — with their part of it when they attend only part (standing seat)
            classes = classes.map((c) => {
              if (!classIds.includes(c.id)) return c
              const seat = l.line.seats?.[c.id]
              const joined = c.studentIds.includes(inv.studentId) ? c : { ...c, studentIds: [...c.studentIds, inv.studentId] }
              return seat ? { ...joined, seats: { ...joined.seats, [inv.studentId]: seat } } : joined
            })
            sessions = sessions.map((x) => (x.classId && paidSlot.has(`${x.classId}|${x.date}`) && !x.studentIds.includes(inv.studentId) ? { ...x, studentIds: [...x.studentIds, inv.studentId] } : x))
          }
        }
        set({ invoices: s.invoices.map((x) => (x.id === invoiceId ? next : x)), entitlements, classes, sessions })
        log("billing", [inv.studentId], forced ? "Force ยืนยันยอดเงิน" : "ยืนยันยอดเงิน", `${inv.number} · ${fmtMoney(pay.amount)}${forced ? ` · เหตุผล: ${forceRemark!.trim()}` : ""}`)
        if (paid) {
          log("billing", [inv.studentId], "ชำระครบ", `${inv.number} · ออกใบเสร็จ ${next.receiptNumber}${inv.lines.length ? " · ระบบเพิ่มเข้าคลาสอัตโนมัติ" : ""}`, true)
          // payment confirmed = the lead is a student now — nobody has to press "convert" (owner 2026-09-28)
          const lead = leadOfStudent(inv.studentId)
          if (lead && lead.stage !== "enrolled") {
            const stu = get().students.find((x) => x.id === inv.studentId)!
            if (!stu.familyId) {
              const familyId = ensureLeadFamily(lead, { studentName: stu.name })
              set((cur) => ({ students: cur.students.map((x) => (x.id === stu.id ? { ...x, familyId } : x)) }))
            }
            set((cur) => ({ leads: cur.leads.map((l) => (l.id === lead.id ? { ...l, stage: "enrolled", convertedStudentId: inv.studentId } : l)) }))
            log("profile", [inv.studentId], "ลงทะเบียนเป็นนักเรียน", `อัตโนมัติจากการยืนยันยอด ${inv.number} · Lead ${lead.name}`, true)
          }
          // receipt goes to the parent by itself
          const st = get()
          const stu = st.students.find((x) => x.id === inv.studentId)!
          // the earliest class across every course on the invoice
          const first = totals.lines
            .flatMap((l) => (l.quote?.slots[0] ? st.sessions.filter((x) => x.classId === l.quote!.slots[0].classId && x.date === l.quote!.slots[0].date) : []))
            .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
          const receiptDelivery = pushLine(stu.familyId, Msg.receiptMessage(next, totals.total, { student: stu, firstSession: first }), (ok, error) => {
            set((cur) => ({ invoices: cur.invoices.map((x) => (x.id === invoiceId ? { ...x, receiptDelivery: ok ? "delivered" : "failed" } : x)) }))
            if (!ok) toast.error(`ส่งใบเสร็จ ${next.receiptNumber} ทาง LINE ไม่สำเร็จ — ${error ?? ""}`)
          })
          set((cur) => ({ invoices: cur.invoices.map((x) => (x.id === invoiceId ? { ...x, receiptDelivery } : x)) }))
        }
        return { ok: true, value: { paid } }
      },

      // ---------------- CRM ----------------
      saveLead: (l) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const err = CRM.validateLead(l)
        if (err) return fail(err)
        set({ leads: s.leads.some((x) => x.id === l.id) ? s.leads.map((x) => (x.id === l.id ? l : x)) : [l, ...s.leads] })
        return { ok: true, value: l }
      },

      moveLeadStage: (id, stage) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        const guard = CRM.canSetStage(lead.stage, stage)
        if (!guard.ok) return guard
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage } : x)) })
        return OK
      },

      addLeadNote: (id, text) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        if (!text.trim()) return fail("เขียนโน้ตก่อนบันทึก")
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, notes: [...x.notes, { at: s.now().toISOString(), by: s.userId, text }] } : x)) })
        return OK
      },

      archiveLead: (id, input) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        if (lead.stage === "archived") return fail("เก็บเข้าคลังไปแล้ว")
        const err = Loss.validateLeadLost(input, s.system.lossReasons)
        if (err) return fail(err)
        const competitor = input.competitor?.trim()
        const lost = { ...input, competitor: competitor || undefined, note: input.note?.trim() || undefined, at: s.now().toISOString(), by: s.userId }
        const label = Loss.reasonLabel(input.reasonId, s.system.lossReasons)
        const known = s.system.competitors ?? []
        set({
          leads: s.leads.map((x) => (x.id === id ? { ...x, stage: "archived", archivedFrom: x.stage, archiveReason: label + (lost.note ? ` · ${lost.note}` : ""), lost } : x)),
          system: competitor && competitor !== "ไม่ทราบ" && !known.some((c) => c.toLowerCase() === competitor.toLowerCase()) ? { ...s.system, competitors: [...known, competitor] } : s.system,
        })
        return OK
      },

      addLeadFollowUp: (id, input) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        if (lead.stage === "archived" || lead.stage === "enrolled") return fail("Lead นี้ปิดแล้ว")
        const up = { id: uid("fu"), at: s.now().toISOString(), by: s.userId, channel: input.channel, result: input.result, note: input.note?.trim() || undefined }
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage: x.stage === "new" ? "contacting" : x.stage, followUps: [...(x.followUps ?? []), up] } : x)) })
        return OK
      },

      requestExit: (studentIds, input) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        if (!studentIds.length) return fail("เลือกนักเรียน")
        if (!input.lastDate) return fail("ใส่วันเรียนวันสุดท้าย")
        const at = s.now().toISOString()
        set({ students: s.students.map((x) => (studentIds.includes(x.id) ? { ...x, exit: { status: "sent", lastDate: input.lastDate, token: input.token, sentAt: at, sentBy: s.userId } } : x)) })
        log("profile", studentIds, "แจ้งออก", `เรียนวันสุดท้าย ${fmtDate(input.lastDate)}${input.token ? " · ส่งฟอร์มให้ผู้ปกครองแล้ว" : ""}`)
        return OK
      },

      cancelExit: (studentId) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        set({ students: s.students.map((x) => (x.id === studentId ? { ...x, exit: undefined } : x)) })
        log("profile", [studentId], "ยกเลิกแจ้งออก", "ผู้ปกครองเปลี่ยนใจ — เรียนต่อ")
        return OK
      },

      closeExit: (studentId, input) => {
        const s = get()
        const perm = requirePerm(s.me(), "student.manage")
        if (!perm.ok) return perm
        const stu = s.students.find((x) => x.id === studentId)
        if (!stu) return fail("ไม่พบนักเรียน")
        if (stu.archived) return fail("นักเรียนคนนี้ Archive ไปแล้ว")
        const err = Loss.validateExitClose(input, s.system.lossReasons)
        if (err) return fail(err)
        const now = s.now()
        const label = Loss.reasonLabel(input.reasonId, s.system.lossReasons)
        // out of every class roster; sessions after the last day (that haven't started) drop the student — history stays
        const classes = s.classes.map((k) => (k.studentIds.includes(studentId) ? { ...k, studentIds: k.studentIds.filter((y) => y !== studentId) } : k))
        const sessions = s.sessions.map((x) => (x.date > input.lastDate && x.studentIds.includes(studentId) && Sch.sessionState(x, now) === "upcoming" ? { ...x, studentIds: x.studentIds.filter((y) => y !== studentId) } : x))
        const exit = {
          ...(stu.exit ?? { sentAt: now.toISOString(), sentBy: s.userId }), status: "closed" as const, lastDate: input.lastDate, answers: input.answers,
          reasonId: input.reasonId, otherReasonIds: input.otherReasonIds, noReply: !input.answers, money: input.money, note: input.note?.trim() || undefined, closedAt: now.toISOString(), closedBy: s.userId,
        }
        let leads = s.leads
        const a = input.answers
        if (a && a.comeBack !== "no" && a.contactOk) {
          // they may come back: a closed lead with a call-again date (Need Attention brings it back then)
          const fam = s.families.find((f) => f.id === stu.familyId)
          const parent = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]
          const due = a.comeBackMonth ? `${a.comeBackMonth}-01` : addDays(toDateStr(now), 90)
          leads = [...leads, {
            id: uid("ld"), branchId: stu.branchId, name: parent?.name ?? fam?.name ?? stu.nickname, childGrade: stu.grade, subject: "", source: "other", stage: "archived", archivedFrom: "new",
            archiveReason: `นักเรียนเก่า (${stu.nickname}) · ${label}`, assigneeId: null, phone: parent?.phone ?? "", lineId: "", createdAt: now.toISOString(), notes: [], convertedStudentId: studentId, winBackOf: studentId,
            lost: { stage: "new", reasonId: input.reasonId, otherReasonIds: input.otherReasonIds, followUpOn: due, note: `นักเรียนเก่า ${stu.nickname} — ${a.comeBack === "yes" ? "บอกว่าจะกลับมา" : "อาจกลับมา"}${a.comeBackMonth ? ` ราว ${fmtDate(due, { year: true })}` : ""}`, at: now.toISOString(), by: s.userId },
          }]
        }
        set({
          students: s.students.map((x) => (x.id === studentId ? { ...x, exit, archived: { at: now.toISOString(), by: s.userId, reason: label + (exit.note ? ` · ${exit.note}` : "") } } : x)),
          classes, sessions, leads,
          notifications: [Notif.notify({ id: uid("no"), at: now, kind: "info", title: "นักเรียนออก", body: `${stu.nickname} · เรียนวันสุดท้าย ${fmtDate(input.lastDate)} · ${label}${exit.noReply ? " (ผู้ปกครองไม่ได้ตอบฟอร์ม)" : ""}`, fromId: s.userId, audience: { roles: OFFICE_ROLES, branchId: stu.branchId } }), ...s.notifications],
        })
        log("profile", [studentId], "ออก (Archive)", `${label} · เรียนวันสุดท้าย ${fmtDate(input.lastDate)}${input.money !== "none" ? ` · ${input.money === "refund" ? "คืนเงิน" : "เก็บเป็นเครดิต"}` : ""}`)
        return OK
      },

      recordSurveySent: (c) => {
        const s = get()
        const perm = requirePerm(s.me(), "reports.view")
        if (!perm.ok) return perm
        if (s.surveyCampaigns.some((x) => x.year === c.year)) return fail(`ส่งแบบสอบถามปี ${c.year + 543} ไปแล้ว`)
        set({ surveyCampaigns: [...s.surveyCampaigns, { ...c, sentAt: s.now().toISOString(), sentBy: s.userId }] })
        return OK
      },

      markSurveyReminded: (campaignId) => {
        const s = get()
        set({ surveyCampaigns: s.surveyCampaigns.map((x) => (x.id === campaignId ? { ...x, remindedAt: s.now().toISOString() } : x)) })
        return OK
      },

      syncSurveyResponses: (list) => {
        const s = get()
        const known = new Set(s.surveyResponses.map((r) => r.id))
        const fresh = list.filter((r) => !known.has(r.id))
        if (fresh.length) {
          const now = s.now()
          const unhappy = fresh.filter((r) => Survey.isUnhappy(r.answers))
          set({
            surveyResponses: [...s.surveyResponses, ...fresh],
            // unhappy families → the branch's managers, to call within 3 days
            notifications: [...unhappy.map((r) => Notif.notify({ id: uid("no"), at: now, kind: "form_submitted", title: "ผู้ปกครองไม่พอใจ (แบบสอบถามประจำปี)", body: `${s.families.find((f) => f.id === r.familyId)?.name ?? "ครอบครัว"} · แนะนำเพื่อน ${r.answers.nps ?? "—"}/10${r.answers.continueNext === "no" ? " · ไม่เรียนต่อ" : ""} — โทรคุยภายใน ${Survey.CALL_WITHIN_DAYS} วัน`, fromId: undefined, audience: { roles: ["manager", "area_manager", "director"], branchId: r.branchId } })), ...s.notifications],
          })
        }
        return { ok: true, value: { added: fresh.length } }
      },

      surveyFollowUp: (responseId, note) => {
        const s = get()
        const perm = requirePerm(s.me(), "reports.view")
        if (!perm.ok) return perm
        if (!note.trim()) return fail("บันทึกสั้นๆ ว่าคุยแล้วได้อะไร")
        set({ surveyResponses: s.surveyResponses.map((r) => (r.id === responseId ? { ...r, followUp: { at: s.now().toISOString(), by: s.userId, note: note.trim() } } : r)) })
        return OK
      },

      saveSurveyWindow: (w) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (!/^\d\d-\d\d$/.test(w.from) || !/^\d\d-\d\d$/.test(w.to) || w.from >= w.to) return fail("ช่วงวันที่ไม่ถูกต้อง")
        set({ system: { ...s.system, survey: w } })
        return OK
      },

      setEnrollLink: (branchId, link) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        set({ branches: s.branches.map((b) => (b.id === branchId ? { ...b, enrollLink: link } : b)) })
        return OK
      },

      approveEnrollment: (sub, plan) => {
        const s = get()
        for (const p of ["student.manage", "billing.manage", "lead.manage"] as const) { const perm = requirePerm(s.me(), p); if (!perm.ok) return perm }
        if (!plan.length) return fail("เลือกคอร์สอย่างน้อย 1 คน")
        const branch = s.branches.find((b) => b.id === sub.branchId)
        if (!branch) return fail("ไม่พบสาขา")
        const now = s.now()
        // same family when the LINE account or any parent phone is already on file (siblings, returning families)
        const matched = People.matchExistingFamily(s.families, { lineUserId: sub.lineUserId, phones: sub.parents.map((p) => p.phone) })
        const family = matched ?? People.familyFromSubmission(sub.children[0].name, sub.parents, { address: sub.familyAddress, postcode: sub.familyPostcode, province: sub.familyProvince, location: sub.familyLocation, addressNote: sub.familyAddressNote, sources: sub.acquisitions, taxInfo: sub.taxInfo }, sub.lineUserId, uid("fam"))
        const parent = sub.parents.find((p) => p.primary) ?? sub.parents[0]
        const students: Student[] = [], leads: Lead[] = [], invoices: Invoice[] = []
        let leadsNow = s.leads
        for (const p of plan) {
          const child = sub.children[p.childIndex]
          if (!child) return fail("ข้อมูลนักเรียนไม่ครบ")
          const course = s.courses.find((c) => c.id === p.courseId && c.branchId === branch.id)
          if (!course) return fail(`เลือกคอร์สให้ ${child.nickname || child.name}`)
          if (!p.classIds.length) return fail(`เลือกคลาสให้ ${child.nickname || child.name}`)
          const known = s.students.find((x) => x.familyId === family.id && x.name.trim() === child.name.trim())
          const note = [child.note, child.placement ? "ผู้ปกครองขอให้ครูประเมินระดับในคาบแรก (ไม่ได้สอบวัดระดับ)" : ""].filter(Boolean).join(" · ")
          const stu: Student = known ?? { id: uid("stu"), familyId: family.id, branchId: branch.id, name: child.name, nickname: child.nickname || People.nicknameFrom(child.name), grade: child.grade, usesBus: child.bus,
            birthDate: child.birthDate, school: child.school, note: note || undefined, createdAt: now.toISOString(), createdBranchId: branch.id }
          if (!known) {
            const errs = People.validateStudent(stu, toDateStr(now))
            if (errs.length) return fail(`${child.nickname || child.name}: ${errs[0].message}`)
            students.push(stu)
          }
          // the lead: the one the link was sent to (first child), otherwise a new "สมัครตรง" one — already at รอชำระ
          const own = p === plan[0] && sub.leadId ? leadsNow.find((l) => l.id === sub.leadId) : undefined
          if (own) leadsNow = leadsNow.map((l) => (l.id === own.id ? { ...l, stage: "payment_pending", direct: true, trialStudentId: stu.id } : l))
          else leads.push({ id: uid("ld"), branchId: branch.id, name: parent?.name ?? family.name, childGrade: child.grade, subject: course.subjects[0] ?? "", source: sub.acquisitions?.[0] ?? "line", stage: "payment_pending", direct: true,
            assigneeId: s.userId, phone: parent?.phone ?? "", lineId: parent?.lineId ?? "", lineUserId: sub.lineUserId, createdAt: sub.submittedAt, notes: [{ at: now.toISOString(), by: s.userId, text: `สมัครทันทีจากฟอร์ม (${child.times.length} ช่วงเวลาที่สะดวก · เริ่ม ${fmtDate(child.startDate)})` }], convertedStudentId: null, trialStudentId: stu.id })
          // entry fee unless this child already paid one / came from the old system — same rule as the invoice editor
          const entry = branch.fees.find((f) => f.kind === "entry")
          const waived = Bill.entryFeeWaiver(stu, s.invoices, branch.fees)
          invoices.push({
            id: uid("inv"), branchId: branch.id, studentId: stu.id, number: null,
            // hour packs: leftover minutes carry to the next pack by default (admin can change on the invoice)
            lines: [{ id: uid("ln"), courseId: course.id, classIds: p.classIds, startDate: p.startDate, periods: Math.max(1, p.periods), leftover: course.unit === "hour" ? "carry" : undefined }],
            bus: [], bookFee: 0, advance: entry && !waived ? [{ feeId: entry.id, name: entry.name, amount: entry.price }] : [], concession: null,
            noteToParent: "", status: "draft", pdf: "none", createdBy: s.userId, createdAt: now.toISOString(), payments: [],
          })
        }
        set({ families: matched ? s.families : [...s.families, family], students: [...s.students, ...students], leads: [...leadsNow, ...leads] })
        // drafts go through the normal invoice rule (number, validation) — one per child
        const made: ID[] = []
        for (const inv of invoices) {
          const r = get().saveInvoice(inv)
          if (!r.ok) return fail(`สร้างนักเรียนแล้ว แต่ร่างใบแจ้งหนี้ไม่ผ่าน: ${r.error} — เปิดหน้า Billing สร้างเองได้`)
          made.push(r.value.id)
        }
        if (students.length) log("profile", students.map((x) => x.id), "สมัครทันที", `จากฟอร์มสมัครเรียน · ${family.name}`)
        return { ok: true, value: { studentIds: plan.map((p, i) => invoices[i].studentId), invoiceIds: made } }
      },

      saveLossReasons: (list) => {
        const s = get()
        const perm = requirePerm(s.me(), "settings.manage")
        if (!perm.ok) return perm
        if (list.some((r) => !r.label.trim())) return fail("ทุกเหตุผลต้องมีชื่อภาษาไทย")
        if (!list.some((r) => r.active && r.for !== "student") || !list.some((r) => r.active && r.for !== "lead")) return fail("ต้องมีเหตุผลที่เปิดใช้ทั้งฝั่ง Lead และฝั่งนักเรียน")
        set({ system: { ...s.system, lossReasons: list.map((r) => ({ ...r, label: r.label.trim() })) } })
        return OK
      },

      restoreLead: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        if (lead.stage !== "archived") return fail("Lead นี้ไม่ได้อยู่ในคลัง")
        set({ leads: s.leads.map((x) => (x.id === id ? { ...x, stage: CRM.restoreStage(x) } : x)) })
        return OK
      },

      convertLeadToStudent: (id) => {
        const s = get()
        const perm = requirePerm(s.me(), "lead.manage")
        if (!perm.ok) return perm
        const lead = s.leads.find((x) => x.id === id)
        if (!lead) return fail("ไม่พบ Lead นี้")
        if (lead.stage === "enrolled") return fail("เป็นนักเรียนแล้ว")
        const trial = lead.trialStudentId ? s.students.find((x) => x.id === lead.trialStudentId) : undefined
        let studentId: ID
        if (trial) {
          // reuse the Student created at test/trial approval time instead of creating a duplicate
          studentId = trial.id
          if (!trial.familyId) {
            const familyId = ensureLeadFamily(lead, { studentName: trial.name })
            set((cur) => ({ students: cur.students.map((x) => (x.id === trial.id ? { ...x, familyId } : x)) }))
          }
        } else {
          const student: Student = { id: uid("stu"), familyId: null, branchId: lead.branchId, name: lead.name, nickname: People.nicknameFrom(lead.name), grade: lead.childGrade, usesBus: false, createdAt: s.now().toISOString(), createdBranchId: lead.branchId }
          const errs = People.validateStudent(student, toDateStr(s.now()))
          if (errs.length) return fail(errs[0].message)
          student.familyId = ensureLeadFamily(lead, { studentName: lead.name })
          studentId = student.id
          set((cur) => ({ students: [...cur.students, student] }))
        }
        set((cur) => ({ leads: cur.leads.map((x) => (x.id === id ? { ...x, trialStudentId: studentId } : x)) }))
        if (!trial) log("profile", [studentId], "สร้างนักเรียนจาก Lead", `${lead.name} · ${lead.phone}`)
        return { ok: true, value: { studentId } }
      },

      saveAssessmentNote: (id, patch) => {
        const s = get()
        const a = s.assessments.find((x) => x.id === id)
        if (!a) return fail("ไม่พบข้อมูลสอบ/ทดลองเรียน")
        const se = s.sessions.find((x) => x.id === a.sessionId)
        const me = s.me()
        if (!can(me, "session.manage") && se?.teacherId !== me.id && !se?.coTeacherIds.includes(me.id)) return fail("บันทึกได้เฉพาะครูของคาบนี้หรือทีมสาขา")
        set({ assessments: s.assessments.map((x) => (x.id === id ? { ...x, result: patch.result.trim() || undefined, note: patch.note.trim() || undefined, notedBy: s.userId, notedAt: s.now().toISOString() } : x)) })
        log("attendance", [a.studentId], `บันทึกผล${Forms.FORM_TYPE_LABEL[a.type]}`, [patch.result.trim(), patch.note.trim()].filter(Boolean).join(" · ") || "ล้างบันทึก")
        return OK
      },

      approveTestTrialSubmission: (sub, opts) => {
        const s = get()
        const perm = requirePerm(s.me(), "session.manage")
        if (!perm.ok) return perm
        const primaryLead = s.leads.find((x) => x.id === sub.primaryLeadId)
        if (!primaryLead) return fail("ไม่พบ Lead นี้")

        // resolve/create THIS child's own Lead — the first/primary child already has one; an "Add
        // another Student" child (leadId: null) gets a new sibling Lead here, copying source/assignee/
        // branch/LINE identity from the primary lead so it behaves exactly like a hand-created one
        let lead = sub.leadId ? s.leads.find((x) => x.id === sub.leadId) : undefined
        if (!lead) {
          const created: Lead = {
            id: uid("ld"), branchId: sub.branchId, name: sub.parents[0]?.name || primaryLead.name,
            childGrade: sub.studentGrade, subject: sub.picks[0]?.chosenSubject ?? primaryLead.subject,
            source: primaryLead.source, stage: "new", assigneeId: primaryLead.assigneeId,
            phone: sub.parents[0]?.phone || primaryLead.phone, lineId: primaryLead.lineId,
            createdAt: s.now().toISOString(), notes: [], convertedStudentId: null, lineUserId: primaryLead.lineUserId,
          }
          set((cur) => ({ leads: [created, ...cur.leads] }))
          log("profile", [], "สร้าง Lead พี่น้อง", `จากฟอร์ม${Forms.FORM_TYPE_LABEL[sub.type]} · ${created.name} · ${created.childGrade}`)
          lead = created
        }
        const leadId = lead.id

        // reuse the one Student per lead, created lazily on first approval — persisted immediately
        // so the addStudentToSession/addSession calls below see it via their own get()
        let studentId = lead.trialStudentId
        const returningStudentId = studentId
        if (!studentId) {
          const student: Student = {
            id: uid("stu"), familyId: null, branchId: lead.branchId,
            name: sub.studentName, nickname: sub.studentNickname?.trim() || People.nicknameFrom(sub.studentName),
            grade: sub.studentGrade, usesBus: false, birthDate: sub.studentBirthDate, school: sub.studentSchool?.trim() || undefined, note: sub.studentNote,
            createdAt: s.now().toISOString(), createdBranchId: lead.branchId,
          }
          const errs = People.validateStudent(student, toDateStr(s.now()))
          if (errs.length) return fail(errs[0].message)

          // conflict-safe: reuse an existing family (matched by LINE identity, then by any parent phone
          // already on file) instead of creating a duplicate for a returning family or a sibling — never
          // overwrites what's on file, staff review any differences before this point (SubmissionReviewCard)
          const matched = People.matchExistingFamily(s.families, { lineUserId: lead.lineUserId, phones: sub.parents.map((p) => p.phone) })
          const family = matched ?? People.familyFromSubmission(sub.studentName, sub.parents, { address: sub.familyAddress, postcode: sub.familyPostcode, province: sub.familyProvince, location: sub.familyLocation, addressNote: sub.familyAddressNote, sources: sub.acquisitions, taxInfo: sub.taxInfo }, lead.lineUserId, uid("fam"))
          set((cur) => ({
            families: matched ? cur.families : [...cur.families, family],
            conversations: cur.conversations.map((c) => (c.leadId === leadId || (lead!.lineUserId && c.id === `line_${lead!.lineUserId}`) ? { ...c, familyId: family.id } : c)),
          }))
          student.familyId = family.id

          studentId = student.id
          set((cur) => ({ students: [...cur.students, student] }))
          log("profile", [student.id], "สร้างนักเรียน", `จากฟอร์ม${Forms.FORM_TYPE_LABEL[sub.type]} · Lead ${lead!.name} · ${student.grade}`)
        }

        // returning family/child edited their details in the form → update what's on file (staff confirmed)
        if (opts?.applyChanges) {
          const st = get()
          const stu = returningStudentId ? st.students.find((x) => x.id === returningStudentId) : undefined
          const famId = (stu ?? st.students.find((x) => x.id === studentId))?.familyId
          const fam = s.families.find((f) => f.id === famId) ? st.families.find((f) => f.id === famId) : undefined // only a family that existed before this approval
          const changes = People.submissionChanges(fam, stu, sub)
          if (changes.length) {
            const m = People.mergeSubmission(fam, stu, sub)
            set((cur) => ({
              families: m.family ? cur.families.map((f) => (f.id === m.family!.id ? m.family! : f)) : cur.families,
              students: m.student ? cur.students.map((x) => (x.id === m.student!.id ? m.student! : x)) : cur.students,
            }))
            log("profile", [studentId], "อัปเดตข้อมูลจากฟอร์ม", changes.map((c) => `${c.label}: ${c.from} → ${c.to}`).join(" · "))
          }
        }

        let sessionId: ID
        if (sub.picks.length >= 2) {
          // 2+ subjects picked for the same date+time — one shared 2-hour room block, not one per subject
          const branch = s.branches.find((b) => b.id === lead.branchId)!
          const draft = Forms.buildCombinedSessionDraft(sub.picks.map((p) => ({ subject: p.chosenSubject, slot: p.chosenSlot })), lead.branchId, studentId, branch, s.sessions, sub.type)
          if (!draft) return fail("รวมช่วงเวลานี้เป็นคาบเดียวไม่ได้")
          const r = get().addSession(draft)
          if (!r.ok) return r
          sessionId = r.value.id
        } else if (sub.picks[0].chosenSlot.source === "class") {
          const r = get().addStudentToSession(sub.picks[0].chosenSlot.sessionId!, studentId, "one")
          if (!r.ok) return r
          sessionId = sub.picks[0].chosenSlot.sessionId!
        } else {
          const draft = Forms.buildSessionDraftFromSlot(sub.picks[0].chosenSlot, sub.picks[0].chosenSubject, lead.branchId, studentId, sub.type)
          const r = get().addSession(draft)
          if (!r.ok) return r
          sessionId = r.value.id
        }

        const booked = get().sessions.find((x) => x.id === sessionId)!
        const assessments: Assessment[] = sub.picks.map((p) => ({ id: uid("as"), type: sub.type, leadId, studentId: studentId!, sessionId, subject: p.chosenSubject, date: booked.date, start: booked.start }))
        set((cur) => ({ assessments: [...cur.assessments, ...assessments] }))
        advanceLead(leadId, Forms.APPROVE_STAGE[sub.type], { trialStudentId: studentId, scheduledAt: at(booked.date, booked.start).toISOString() })
        log("class", [studentId], `นัด${Forms.FORM_TYPE_LABEL[sub.type]}`, `${sub.picks.map((p) => p.chosenSubject).join(" + ")} · ${fmtDate(booked.date, { weekday: true })} ${booked.start}`)
        return { ok: true, value: { sessionId, studentId, leadId } }
      },

      // ---------------- Inbox ----------------
      openConversation: (id) => set((s) => ({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, unread: false } : c)) })),

      assignConversation: (id, staffId) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        set({ conversations: s.conversations.map((c) => (c.id === id ? { ...c, assigneeId: staffId } : c)) })
        return OK
      },

      sendChatMessage: (conversationId, raw) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        const { isNote, text } = Inbox.parseComposerInput(raw)
        if (!text) return fail("พิมพ์ข้อความก่อน")
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const at = s.now().toISOString()
        const author: "internal" | "staff" = isNote ? "internal" : "staff"
        const message = { id: uid("msg"), conversationId, author, senderId: s.userId, text, at }
        set({
          messages: [...s.messages, message],
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: at } : c)),
        })
        return OK
      },

      startConversation: (input) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        if (!input.text.trim()) return fail("พิมพ์ข้อความก่อน")
        if (!input.familyId && !input.leadId) return fail("เลือกครอบครัวหรือ Lead ก่อน")
        const existing = s.conversations.find((c) => (input.familyId && c.familyId === input.familyId) || (input.leadId && c.leadId === input.leadId))
        const at = s.now().toISOString()
        const family = input.familyId ? s.families.find((f) => f.id === input.familyId) : undefined
        const lead = input.leadId ? s.leads.find((l) => l.id === input.leadId) : undefined
        const branchId = family ? s.students.find((st) => st.familyId === family.id)?.branchId ?? s.branchId : (lead?.branchId ?? s.branchId)
        const conv: Conversation = existing ?? {
          id: uid("cv"), branchId, name: family?.name ?? lead?.name ?? "บทสนทนาใหม่",
          familyId: input.familyId ?? null, leadId: input.leadId ?? null, channel: input.channel, assigneeId: s.userId, lastMessageAt: at, unread: false,
        }
        const message = { id: uid("msg"), conversationId: conv.id, author: "staff" as const, senderId: s.userId, text: input.text, at }
        set({
          conversations: existing ? s.conversations.map((c) => (c.id === conv.id ? { ...c, lastMessageAt: at } : c)) : [conv, ...s.conversations],
          messages: [...s.messages, message],
        })
        return { ok: true, value: { conversationId: conv.id } }
      },

      simulateParentReply: (conversationId, text) => {
        const s = get()
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const at = s.now().toISOString()
        const message = { id: uid("msg"), conversationId, author: "parent" as const, senderId: null, text: text?.trim() || "ขอบคุณค่ะ/ครับ", at }
        set({
          messages: [...s.messages, message],
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, lastMessageAt: at, unread: true } : c)),
        })
        return OK
      },

      mergeLiveConversations: (conversations, messages) => {
        const s = get()
        const convMap = new Map(s.conversations.map((c) => [c.id, c] as const))
        let changed = false
        conversations.forEach((server) => {
          const local = convMap.get(server.id)
          if (local) {
            // the server only knows raw LINE state (unread/lastMessageAt) — familyId/leadId/assigneeId/name
            // are business data linked locally (see linkConversationToFamily) and must survive every poll
            if (local.unread !== server.unread || local.lastMessageAt !== server.lastMessageAt) {
              convMap.set(server.id, { ...local, unread: server.unread, lastMessageAt: server.lastMessageAt })
              changed = true
            }
          } else {
            convMap.set(server.id, { ...server, branchId: s.branchId })
            changed = true
          }
        })
        const seen = new Set(s.messages.map((m) => m.id))
        const fresh = messages.filter((m) => !seen.has(m.id))
        if (!fresh.length && !changed) return
        set({ conversations: Array.from(convMap.values()), messages: fresh.length ? [...s.messages, ...fresh] : s.messages })
      },

      linkConversationToFamily: (conversationId, familyId) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const family = s.families.find((f) => f.id === familyId)
        if (!family) return fail("ไม่พบครอบครัวนี้")
        const lineUserId = conversationId.startsWith("line_") ? conversationId.slice(5) : undefined
        set({
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, familyId, leadId: null, name: family.name } : c)),
          families: lineUserId
            ? s.families.map((f) => (f.id === familyId ? { ...f, lineUserId, parents: f.parents.map((p, i) => (i === 0 ? { ...p, lineLinked: true } : p)) } : f))
            : s.families,
        })
        return OK
      },

      linkConversationToLead: (conversationId, leadId) => {
        const s = get()
        const perm = requirePerm(s.me(), "inbox.manage")
        if (!perm.ok) return perm
        const conv = s.conversations.find((c) => c.id === conversationId)
        if (!conv) return fail("ไม่พบบทสนทนานี้")
        const lead = s.leads.find((l) => l.id === leadId)
        if (!lead) return fail("ไม่พบ Lead นี้")
        const lineUserId = conversationId.startsWith("line_") ? conversationId.slice(5) : undefined
        set({
          // one owner for the chat and the lead: whichever side already has one fills the other
          conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, leadId, familyId: null, name: lead.name, assigneeId: c.assigneeId ?? lead.assigneeId } : c)),
          leads: s.leads.map((l) => (l.id === leadId ? { ...l, lineUserId: lineUserId ?? l.lineUserId, assigneeId: l.assigneeId ?? conv.assigneeId } : l)),
        })
        return OK
      },
    }
    },
    {
      name: "nockerp-v2",
      // bump when the data model changes; older saved data is replaced by fresh sample data
      version: 56,
      migrate: () => ({ ...buildSeed(), userId: "u_nock", branchId: "br_thl", clockOffset: 0 }) as unknown as Store,
      // persist data + UI state only, never the action functions
      partialize: (s) => Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== "function")) as Partial<Store>,
    },
  ),
)

// ---------- change tracking (owner 2026-10-01) ----------
// Any change made to a session marks it "changed" (its teachers see a red dot on the teacher board until they open it)
// and notifies those teachers in the app — never the person who made the change. Wrapping the actions keeps every
// screen consistent without each action remembering to do it.
type Tracker = (...args: never[]) => { ids: ID[]; what: string }
const TRACKED: Partial<Record<keyof Store, Tracker>> = {
  editSession: ((id: ID) => ({ ids: [id], what: "แก้วัน/เวลา/ห้องของคาบ" })) as Tracker,
  moveSession: ((id: ID) => ({ ids: [id], what: "ย้ายคาบ" })) as Tracker,
  updateSessionTeachers: ((id: ID) => ({ ids: [id], what: "เปลี่ยนครู" })) as Tracker,
  addStudentToSession: ((id: ID) => ({ ids: [id], what: "เพิ่มนักเรียน" })) as Tracker,
  cancelSession: ((id: ID) => ({ ids: [id], what: "ยกเลิกคาบ" })) as Tracker,
  setSessionNote: ((id: ID) => ({ ids: [id], what: "แก้โน้ตนักเรียน" })) as Tracker,
  setSeat: ((scope: "session" | "class", id: ID) => ({ ids: scope === "session" ? [id] : [`class:${id}`], what: "เปลี่ยนเวลาเรียนของนักเรียน" })) as Tracker,
  teacherLeave: ((id: ID) => ({ ids: [id], what: "ครูลา" })) as Tracker,
  markLeave: ((id: ID) => ({ ids: [id], what: "บันทึกการลา" })) as Tracker,
  mark: ((id: ID) => ({ ids: [id], what: "เช็คชื่อ" })) as Tracker,
  clearMark: ((id: ID) => ({ ids: [id], what: "ล้างการเช็คชื่อ" })) as Tracker,
  removeStudentFromSession: ((id: ID) => ({ ids: [id], what: "เอานักเรียนออก" })) as Tracker,
  rescheduleStudent: ((from: ID, _sid: ID, to: ID) => ({ ids: [from, to], what: "ย้ายวันเรียนของนักเรียน" })) as Tracker,
  undoReschedule: ((from: ID) => ({ ids: [from], what: "ยกเลิกการย้ายวัน" })) as Tracker,
  moveStudent: ((from: ID, _sid: ID, to: ID) => ({ ids: [from, to], what: "ย้ายนักเรียน" })) as Tracker,
  mergeSessions: ((keep: ID, drop: ID) => ({ ids: [keep, drop], what: "รวมคาบ (แก้คาบชน)" })) as Tracker,
}

function touchSessions(refs: ID[], what: string) {
  const s = useStore.getState()
  const at = s.now()
  const today = toDateStr(at)
  const ids = new Set(refs.flatMap((r) => {
    if (!r.startsWith("class:")) return [r]
    const classId = r.slice(6) // a standing change on a class shows on its next session
    const next = s.sessions.filter((x) => x.classId === classId && !x.cancelled && x.date >= today).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
    return next ? [next.id] : []
  }))
  if (!ids.size) return
  const me = s.staff.find((x) => x.id === s.userId)
  const notes = s.sessions.filter((x) => ids.has(x.id)).flatMap((x) => {
    const to = Sch.teachersOf(x).filter((t) => t !== s.userId)
    return to.length ? [Notif.notify({ id: uid("no"), at, kind: "info", title: `มีการเปลี่ยนแปลงในคาบ ${x.subject} ${fmtDate(x.date)} ${x.start}`, body: `${what} · โดย ${me?.nickname ?? "?"}`, fromId: s.userId, audience: { staffIds: to } })] : []
  })
  useStore.setState({
    sessions: s.sessions.map((x) => (ids.has(x.id) ? { ...x, changed: { at: at.toISOString(), by: s.userId, what } } : x)),
    notifications: [...notes, ...s.notifications],
  })
}

{
  const st = useStore.getState()
  const wrapped: Partial<Store> = {}
  for (const [name, track] of Object.entries(TRACKED) as [keyof Store, Tracker][]) {
    const original = st[name] as unknown as (...a: unknown[]) => Result<unknown>
    ;(wrapped as Record<string, unknown>)[name] = (...args: unknown[]) => {
      const r = original(...args)
      if (r.ok) { const t = (track as (...a: unknown[]) => { ids: ID[]; what: string })(...args); touchSessions(t.ids, t.what) }
      return r
    }
  }
  useStore.setState(wrapped)
}

/** Did someone else change this session since this teacher last opened it? (only its own teachers see the dot) */
export function unseenChange(s: Session, userId: ID): boolean {
  if (!s.changed || s.changed.by === userId || !Sch.teachersOf(s).includes(userId)) return false
  const seen = s.seenBy?.[userId]
  return !seen || seen < s.changed.at
}

/** Convenience: current user */
export const useMe = () => useStore((s) => s.staff.find((x) => x.id === s.userId)!)
