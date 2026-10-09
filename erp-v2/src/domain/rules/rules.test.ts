// Regression tests: each case reproduces a bug found on Dev staging and proves the rule prevents it.
import { describe, expect, it } from "vitest"
import type { Assessment, Attendance, Branch, BusAddOn, CreditNote, LessonSummary, Course, Entitlement, Family, FormSubmission, Lead, Student, FormOfferSlot, Holiday, Invoice, Klass, Session, Staff, StudentLeave, Weekday } from "../types"
import { applyClassEdit, applyToSessions, canChangeTeachers, canRescheduleStudent, mondayOf, removedWithClass, canSave, closesBranch, holidayImpact, hoursFor, isHoliday, overlappingRows, periodsIn, introducedConflicts, editSingleSession, findConflicts, generateSessions, moveSession, sessionState, validateClass, workState } from "./scheduling"
import { activeLeave, nextClassDates, teacherLeaveCancels, leaveRunSessions, balance, studentState, leaveLedger, packageCovers, canMark, canSaveLeave, coveringEntitlement, effectiveTo, leavesUsed, lowBalanceAlert, removeFromClass, renewalFollowUpDue, resolveEntitlements } from "./attendance"
import { bestPromotion, duplicateBusDay, billedOn, busAddOnAmount, pendingBusAddOns, validateBusAddOn, carriedMinutes, weekKey, classOptionsFor, defaultAdvance, entryFeeWaiver, invoiceSessionDates, invoiceTotals, validateInvoiceDraft, canApprove, canConfirmPayment, canForceApprove, canForceConfirmPayment, canSend, canVoid, defaultBusLegs, busTotal, nextInvoiceNumber, quoteCourse } from "./billing"
import { can } from "./permissions"
import { chartPrice, defaultCourseName, filterCourses, validateCourse } from "./course"
import { busRate, copyHours, gradeLabel, subjectLabel, priceOf, priceRange, setPrice, validateBranchInfo, validateDurations, validateHoliday, validatePromotion, validateSpecialPeriods, everyDay } from "./settings"
import { forceAudience, isUnread, messageAudience, notify, validateMessage, visibleTo } from "./notifications"
import * as Sum from "./summaries"
import { familyFromLead, futureSessionsOf, matchExistingFamily, mergeSubmission, nicknameFrom, searchStudents, studentLabel, submissionChanges, validateFamily, validateStaff, validateStudent } from "./people"
import { suggestFixes } from "./suggest"
import { advanceStage, canSetStage, daysAgo, groupOf, restoreStage, validateLead } from "./crm"
import { APPROVE_STAGE, ATTENDED_STAGE, buildFormPrefill, commonSlots, buildCombinedSessionDraft, buildSessionDraftFromSlot, findOfferSlots, lastAssessmentDate, openHourStarts, sessionKindLabel } from "./forms"
import { customerRows, filterCustomers } from "./customers"
import { invoiceMessage } from "./messages"
import * as Refund from "./refunds"
import * as Doc from "./documents"
import * as Seats from "./seats"
import * as Les from "./lessons"
import * as Sch from "./scheduling"
import * as Rep from "./reports"
import * as Loss from "./loss"
import * as Survey from "./survey"
import { summaryMessage } from "./messages"

const hours = { open: "09:00", close: "20:00" }
const branch: Branch = {
  id: "b1", code: "TST", name: "Test", brand: "nockacademy", branchNo: "002", province: "BKK",
  rooms: [{ id: "r1", name: "Room 1" }, { id: "r2", name: "Room 2" }],
  hours: { 0: null, 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours } as Record<Weekday, typeof hours | null>,
  subjects: ["Maths"], grades: ["P5"], defaultSessionMinutes: 60, busFeePerLeg: 150, specialPeriods: [], fees: [], promotions: [],
  active: true, phones: [], socials: [], packageDurations: { hour: [12, 24], week: [4] }, priceChart: [],
  bankAccount: { bank: "", branchName: "", name: "", number: "" }, lineOaConnected: false,
  lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
}
const staff = (id: string, roles: Staff["roles"]): Staff => ({ id, name: id, nickname: id, roles, branchIds: ["b1"], subjects: ["Maths"], active: true, canLogin: true })
const director = staff("dir", ["director"]), admin = staff("adm", ["admin"]), manager = staff("mgr", ["manager"]), teacher = staff("t1", ["teacher"])
const holidays: Holiday[] = [{ id: "h1", branchId: "b1", date: "2026-10-13", name: "Holiday", category: "branch" }]
let n = 0
const id = () => `s${++n}`
const klass = (p: Partial<Klass> = {}): Klass => ({
  id: "k1", branchId: "b1", name: "Maths", subject: "Maths", grades: ["P5"], kind: "learning", type: "group", courseId: null,
  teacherId: "t1", coTeacherIds: [], roomId: "r1", weekday: 2, start: "10:00", minutes: 60, startDate: "2026-09-29", active: true, studentIds: ["a"], ...p,
})
const monthPkg: Course = { id: "c1", branchId: "b1", name: "Maths P5", kind: "single", format: "group", subjects: ["Maths"], grades: ["P5"], unit: "month", duration: 1, price: 4500, courseFee: 0, active: true }

describe("scheduling", () => {
  it("A1: 8 weekly sessions skipping holidays", () => {
    const s = generateSessions(klass(), holidays, id)
    expect(s).toHaveLength(7)
    expect(s.map((x) => x.date)).not.toContain("2026-10-13")
    expect(s[0].studentIds).toEqual(["a"]) // B1
  })

  it("B5/C2: state comes from the clock only", () => {
    const [s] = generateSessions(klass(), [], id)
    expect(sessionState(s, new Date(2026, 8, 29, 9, 0))).toBe("upcoming")
    expect(sessionState(s, new Date(2026, 8, 29, 10, 30))).toBe("live")
    expect(sessionState(s, new Date(2026, 8, 29, 15, 0))).toBe("ended")
    expect(sessionState(s, new Date(2026, 8, 30, 8, 0))).toBe("closed")
  })

  it("A4 (owner 2026-09-30): class size is a soft limit — warn above 3 for private, above 6 otherwise, never block", () => {
    const issues = validateClass({ ...klass({ type: "single", studentIds: ["a", "b", "c", "d"] }) }, { branch, staff: [teacher], sessions: [], holidays })
    expect(issues.find((i) => i.field === "studentIds")?.level).toBe("warn")
    expect(canSave(issues)).toBe(true)
    expect(validateClass({ ...klass({ type: "single", studentIds: ["a", "b"] }) }, { branch, staff: [teacher], sessions: [], holidays }).some((i) => i.field === "studentIds")).toBe(false)
  })

  it("A5: third parallel class blocked when branch has 2 rooms", () => {
    const existing = [
      ...generateSessions(klass({ id: "x", teacherId: null, roomId: "r1" }), [], id),
      ...generateSessions(klass({ id: "y", teacherId: null, roomId: "r2" }), [], id),
    ]
    const issues = validateClass(klass({ teacherId: null, roomId: null }), { branch, staff: [], sessions: existing, holidays: [] })
    expect(issues.some((i) => i.message.includes("ห้องเต็ม"))).toBe(true)
    expect(canSave(issues)).toBe(false)
  })

  it("A7 / B2: closed day warns red, outside hours warns amber — both can be saved (owner 2026-10-09)", () => {
    const closed = validateClass(klass({ weekday: 0, startDate: "2026-10-04" }), { branch, staff: [teacher], sessions: [], holidays: [] })
    expect(closed.find((i) => i.field === "start")).toMatchObject({ level: "warn", tone: "red" })
    expect(canSave(closed)).toBe(true)
    const late = validateClass(klass({ start: "19:30" }), { branch, staff: [teacher], sessions: [], holidays: [] })
    expect(late.find((i) => i.field === "start")).toMatchObject({ level: "warn", tone: "amber" })
    expect(canSave(late)).toBe(true)
  })

  it("A8: class edit never rewrites started or attended sessions", () => {
    const sessions = generateSessions(klass(), [], id)
    const att: Attendance[] = [{ sessionId: sessions[1].id, studentId: "a", status: "leave", markedBy: "t1", markedAt: "" }]
    const now = new Date(2026, 8, 29, 12, 0) // after the first session
    const r = applyClassEdit(klass(), { start: "16:00" }, sessions, now, att)
    expect(r.sessions[0].start).toBe("10:00") // ended
    expect(r.sessions[1].start).toBe("10:00") // has attendance
    expect(r.sessions[2].start).toBe("16:00")
    expect(r.kept).toBe(2)
  })

  it("B3: editing one session never duplicates it", () => {
    const sessions = generateSessions(klass(), [], id)
    const edited = sessions.map((s, i) => (i === 1 ? editSingleSession(s, { start: "17:00" }) : s))
    expect(edited).toHaveLength(sessions.length)
    expect(edited.filter((s) => s.date === sessions[1].date)).toHaveLength(1)
    expect(edited[1].customized).toBe(true)
  })

  it("E4/E5: conflicts detected even for sessions without a teacher", () => {
    const mk = (i: string, teacherId: string | null, roomId: string | null): Session => ({ ...generateSessions(klass({ id: i, teacherId, roomId }), [], id)[0] })
    const c = findConflicts([mk("a", "t1", "r1"), mk("b", null, null), mk("c", null, "r1")], branch, [teacher])
    expect(c.some((x) => x.kind === "rooms_full")).toBe(true)
    expect(c.some((x) => x.kind === "room")).toBe(true)
  })
})

describe("attendance", () => {
  const [s] = generateSessions(klass(), [], id)
  it("owner 2026-09-29: attendance can be prepared before class; closed sessions stay locked", () => {
    expect(canMark(s, "present", new Date(2026, 8, 28, 9, 0)).ok).toBe(true)
    expect(canMark(s, "leave", new Date(2026, 8, 28, 9, 0)).ok).toBe(true)
    expect(canMark(s, "present", new Date(2026, 9, 1, 9, 0)).ok).toBe(false)
  })

  it("F1: removing a student clears future sessions", () => {
    const sessions = generateSessions(klass(), [], id)
    const r = removeFromClass(klass(), "a", sessions, new Date(2026, 9, 1))
    expect(r.sessions[0].studentIds).toEqual(["a"]) // past stays
    expect(r.sessions.slice(1).every((x) => !x.studentIds.includes("a"))).toBe(true)
  })

  it("F4: no low-session alert for subscriptions", () => {
    const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classIds: ["k1"], invoiceId: "i", kind: "subscription" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 1 }
    expect(lowBalanceAlert(e, balance(e, [], []), "2026-09-24")).toBeNull()
  })

  it("owner 2026-10-06: renewalFollowUpDue hides a student until the date they asked to be tried again", () => {
    const fu = (nextTryOn?: string) => ({ id: "rfu1", at: "2026-10-01T10:00:00.000Z", by: "u1", channel: "call" as const, result: "no_answer" as const, nextTryOn })
    expect(renewalFollowUpDue({ renewalFollowUps: undefined }, "2026-10-06")).toBe(true) // never contacted — always due
    expect(renewalFollowUpDue({ renewalFollowUps: [fu()] }, "2026-10-06")).toBe(true) // contacted, no date chosen — still due
    expect(renewalFollowUpDue({ renewalFollowUps: [fu("2026-10-10")] }, "2026-10-06")).toBe(false) // snoozed
    expect(renewalFollowUpDue({ renewalFollowUps: [fu("2026-10-10")] }, "2026-10-10")).toBe(true) // the day arrives
  })

  describe("student leave (long leave excluded from leave quota, extends course end dates)", () => {
    const sessions = generateSessions(klass(), [], id)
    const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classIds: ["k1"], invoiceId: "i", kind: "sessions" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 5 }
    const leave: StudentLeave = { id: "lv1", studentId: "a", from: "2026-10-01", to: "2026-10-05", reason: "ไปต่างประเทศ", createdBy: "adm", createdAt: "" }
    const leaveAtt: Attendance = { sessionId: sessions[0].id, studentId: "a", status: "leave", markedBy: "t1", markedAt: "" } // sessions[0] date 2026-09-29, before the leave range

    it("effectiveTo extends `to` by the leave's day-span only when the leave overlaps the entitlement's window", () => {
      expect(effectiveTo(e, [leave])).toBe("2027-01-05") // 5 inclusive days (Oct 1-5) added to Dec 31
      const outside = { ...leave, from: "2027-02-01", to: "2027-02-05" } // after e.to — no overlap
      expect(effectiveTo(e, [outside])).toBe(e.to)
      expect(effectiveTo(e, [])).toBe(e.to)
    })

    it("resolveEntitlements patches `to` on the matching student only", () => {
      const other = { ...e, id: "e2", studentId: "b" }
      const [ra, rb] = resolveEntitlements([e, other], [leave])
      expect(ra.to).toBe("2027-01-05")
      expect(rb.to).toBe(other.to) // unaffected student
    })

    it("activeLeave matches only within [from, to], inclusive", () => {
      expect(activeLeave("a", "2026-09-30", [leave])).toBeUndefined()
      expect(activeLeave("a", "2026-10-01", [leave])).toBe(leave)
      expect(activeLeave("a", "2026-10-05", [leave])).toBe(leave)
      expect(activeLeave("a", "2026-10-06", [leave])).toBeUndefined()
    })

    it("leavesUsed excludes a leave mark whose session date falls inside an active leave range", () => {
      expect(leavesUsed(e, sessions, [leaveAtt])).toBe(1) // no leaves[] passed — counts normally
      expect(leavesUsed(e, sessions, [leaveAtt], [leave])).toBe(1) // session date (Sep 29) is outside this leave's range
      const sessInRange = { ...sessions[0], id: "s_in", date: "2026-10-01" }
      const attInRange: Attendance = { sessionId: "s_in", studentId: "a", status: "leave", markedBy: "t1", markedAt: "" }
      expect(leavesUsed(e, [...sessions, sessInRange], [attInRange], [leave])).toBe(0)
    })

    it("canSaveLeave blocks roles without the permission (teacher)", () => {
      expect(canSaveLeave(teacher, "2026-10-01", "2026-10-05", "ป่วยหนัก").ok).toBe(false)
    })

    it("canSaveLeave requires a valid date range and a non-empty reason", () => {
      expect(canSaveLeave(admin, "2026-10-05", "2026-10-01", "อุบัติเหตุ").ok).toBe(false) // to < from
      expect(canSaveLeave(admin, "2026-10-01", "2026-10-05", "").ok).toBe(false)
      expect(canSaveLeave(admin, "2026-10-01", "2026-10-05", "   ").ok).toBe(false)
      expect(canSaveLeave(admin, "2026-10-01", "2026-10-05", "อุบัติเหตุ").ok).toBe(true)
    })

    it("Admin or Manager can save directly — no escalation needed", () => {
      expect(canSaveLeave(admin, "2026-10-01", "2026-10-05", "ไปต่างประเทศ").ok).toBe(true)
      expect(canSaveLeave(manager, "2026-10-01", "2026-10-05", "ไปต่างประเทศ").ok).toBe(true)
    })
  })
})

describe("billing", () => {
  it("BL-2/BL-3: 2 months from 29 Sep = 4 sessions, 4 hours, 30% + 100%", () => {
    const r = quoteCourse({ course: monthPkg, klasses: [klass()], startDate: "2026-09-29", periods: 2, holidays })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.sessions).toEqual(["2026-09-29", "2026-10-06", "2026-10-20", "2026-10-27"])
    expect(r.value.skipped).toEqual(["2026-10-13"])
    expect(r.value.hours).toBe(4)
    expect(r.value.to).toBe("2026-10-31")
    expect(r.value.periods.map((p) => p.amount)).toEqual([1350, 4500])
  })

  it("BL-5: periods below 1 rejected", () => {
    expect(quoteCourse({ course: monthPkg, klasses: [klass()], startDate: "2026-09-29", periods: -1, holidays }).ok).toBe(false)
  })

  it("BL-6: bus legs opt-in", () => {
    expect(busTotal(defaultBusLegs(["2026-09-29", "2026-10-06"], false), 150)).toBe(0)
    expect(busTotal(defaultBusLegs(["2026-09-29", "2026-10-06"], true), 150)).toBe(600)
  })

  it("BL-9: sequential numbers per branch and month", () => {
    // yymmdd(พ.ศ.)-business-branch-running (owner 2026-09-30): runs per day per business + branch
    expect(nextInvoiceNumber("INV", branch, "2026-09-30", ["690930-01-002-0003", "690929-01-002-0009", "690930-02-002-0007", null])).toBe("690930-01-002-0004")
    expect(nextInvoiceNumber("INV", { ...branch, brand: "liclass" }, "2026-09-30", ["690930-01-002-0003"])).toBe("690930-02-002-0001")
    expect(nextInvoiceNumber("CN", branch, "2026-10-01", ["690930-01-002-0003"])).toBe("CN-691001-01-002-0001")
  })

  const inv = (p: Partial<Invoice> = {}): Invoice => ({
    id: "i", branchId: "b1", studentId: "a", number: "INV-TST-2609-0001", lines: [], bus: [], bookFee: 0, advance: [],
    concession: null, noteToParent: "", status: "pending_approval", pdf: "ready", createdBy: "adm", createdAt: "", payments: [], ...p,
  })
  it("BL-14: creator and teachers cannot approve", () => {
    expect(canApprove(inv(), admin).ok).toBe(false)
    expect(canApprove(inv(), teacher).ok).toBe(false)
    expect(canApprove(inv(), director).ok).toBe(true)
  })
  it("BL-16: sending requires approval and a note", () => {
    expect(canSend(inv({ status: "approved" })).ok).toBe(false)
    expect(canSend(inv({ status: "approved", noteToParent: "โปรดชำระ" })).ok).toBe(true)
  })
  it("BL-7: void requires a reason and no payments", () => {
    expect(canVoid(inv(), " ").ok).toBe(false)
    expect(canVoid(inv({ payments: [{ id: "p", amount: 1, method: "cash", reference: "", recordedBy: "adm", recordedAt: "" }] }), "x").ok).toBe(false)
  })
  it("BL-18: recorder cannot confirm own payment", () => {
    expect(canConfirmPayment({ recordedBy: "adm" }, admin, "b1").ok).toBe(false)
    expect(canConfirmPayment({ recordedBy: "adm" }, director, "b1").ok).toBe(true)
  })
  it("owner 2026-09-26: approvers act only on their own branch — Director / Super Admin on any, Area Manager in their area (2026-10-09)", () => {
    const other = inv({ branchId: "b2" })
    const mgr = staff("mgr", ["manager"])
    expect(canApprove(inv(), mgr).ok).toBe(true)
    expect(canApprove(other, mgr).ok).toBe(false)
    expect(canConfirmPayment({ recordedBy: "adm" }, mgr, "b2").ok).toBe(false)
    expect(canApprove(other, { ...staff("am", ["area_manager"]), areaBranchIds: ["b1", "b2"] }).ok).toBe(true)
    expect(canApprove(other, { ...staff("am", ["area_manager"]), areaBranchIds: ["b1"] }).ok).toBe(false)
    expect(canApprove(other, staff("sa", ["super_admin"])).ok).toBe(true)
    expect(canApprove(other, director).ok).toBe(true)
  })
  it("owner 2026-09-26: teachers cannot create invoices at all", () => {
    expect(can(teacher, "billing.manage")).toBe(false)
    expect(can(teacher, "billing.approve")).toBe(false)
    expect(can(staff("am", ["area_manager"]), "billing.manage")).toBe(true)
  })
})

describe("permissions & summaries", () => {
  it("G2/G3: teachers have no billing or export", () => {
    expect(can(teacher, "billing.view")).toBe(false)
    expect(can(teacher, "student.export")).toBe(false)
    expect(can(director, "billing.approve")).toBe(true)
  })
  const summary = { id: "x", sessionId: "s", studentId: "a", text: "ok", status: "submitted" as const, authorId: "dir", lastEditorId: "dir", history: [] }
  it("D8: author cannot approve own summary", () => {
    expect(Sum.canApprove(summary, director).ok).toBe(false)
    expect(Sum.canApprove(summary, admin).ok).toBe(true)
  })
  it("D4 (owner 2026-10-09): an approved summary is locked — no edit, no sending back", () => {
    const approved = { ...summary, status: "approved" as const }
    expect(Sum.canEdit(approved, director).ok).toBe(false)
    expect(Sum.canRequestChanges(approved, admin).ok).toBe(false)
    expect(Sum.canRequestChanges(summary, admin).ok).toBe(true)
  })
  it("D5: cannot send before approval; reports undelivered without LINE", () => {
    expect(Sum.canSend(summary, []).ok).toBe(false)
    const r = Sum.canSend({ ...summary, status: "approved" }, [{ name: "p", phone: "", lineLinked: false, primary: true }])
    expect(r.ok && r.value.delivered).toBe(false)
  })
  it("owner 2026-10-06: courseSummaryDue — only once the package is ending soon or already over, not partway through", () => {
    expect(Sum.courseSummaryDue({ to: "2026-11-01" }, "2026-10-06", 14)).toBe(false) // 26 days left — too early
    expect(Sum.courseSummaryDue({ to: "2026-10-15" }, "2026-10-06", 14)).toBe(true) // 9 days left — within the window
    expect(Sum.courseSummaryDue({ to: "2026-09-01" }, "2026-10-06", 14)).toBe(true) // already over
  })
  it("owner 2026-10-06: a CourseSummary shares the same maker-checker rules as a LessonSummary (same status/authorId/lastEditorId shape)", () => {
    const cs = { id: "cs1", entitlementId: "e1", studentId: "a", overallProgress: "ok", toImprove: "", strengths: "", status: "submitted" as const, authorId: "dir", lastEditorId: "dir", history: [] }
    expect(Sum.canApprove(cs, director).ok).toBe(false) // author can't approve own
    expect(Sum.canApprove(cs, admin).ok).toBe(true)
  })
  it("owner 2026-10-06: courseSummaryDeadline — 7 days after the round ends, same shape as sendDeadline", () => {
    const d = Sum.courseSummaryDeadline({ to: "2026-10-01" }, new Date(2026, 9, 6, 10, 0))
    expect(d).toEqual({ deadline: "2026-10-08", overdue: false, daysLeft: 2 })
    expect(Sum.courseSummaryDeadline({ to: "2026-09-01" }, new Date(2026, 9, 6, 10, 0)).overdue).toBe(true)
  })
  it("owner 2026-10-06: entitlementRounds collapses back-to-back renewals of the same course into one round — a real gap (> LOST_AFTER_DAYS) starts a new one", () => {
    // the owner's own case: 11 monthly entitlements for one student/course, 3 real gaps (~2 months each)
    const e = (id: string, from: string, to: string) => ({ id, studentId: "stu_h222", courseId: "co_math5", from, to })
    const ents = [
      e("en_0", "2025-07-10", "2025-08-08"), e("en_1", "2025-08-09", "2025-09-07"), e("en_2", "2025-09-08", "2025-10-07"), e("en_3", "2025-10-08", "2025-11-06"),
      e("en_4", "2026-01-12", "2026-02-10"), e("en_5", "2026-02-11", "2026-03-12"), e("en_6", "2026-03-13", "2026-04-11"),
      e("en_7", "2026-06-01", "2026-06-30"), e("en_8", "2026-07-01", "2026-07-30"), e("en_9", "2026-07-31", "2026-08-29"), e("en_10", "2026-08-30", "2026-09-28"),
    ]
    const rounds = Sum.entitlementRounds(ents)
    expect(rounds.length).toBe(3)
    expect(rounds.map((r) => r.entitlementIds.length)).toEqual([4, 3, 4])
    expect(rounds.map((r) => r.representativeId)).toEqual(["en_3", "en_6", "en_10"])
    expect(rounds[0]).toMatchObject({ from: "2025-07-10", to: "2025-11-06" })
    // two different courses for the same student never merge into one round
    const twoCourses = [e("en_a", "2026-01-01", "2026-01-31"), { ...e("en_b", "2026-02-01", "2026-02-28"), courseId: "co_eng5" }]
    expect(Sum.entitlementRounds(twoCourses).length).toBe(2)
  })
  it("owner 2026-10-06: draftCourseSummary gathers the session notes into Overall Progress, and sorts the same notes into Strengths / To Improve by a fixed keyword match", () => {
    expect(Sum.draftCourseSummary([])).toEqual({ overallProgress: "", toImprove: "", strengths: "" })
    const d = Sum.draftCourseSummary([{ text: "ทำโจทย์ได้ดี มั่นใจขึ้นมาก" }, { text: "  " }, { text: "ยังสับสนเรื่องเศษส่วน ควรฝึกเพิ่ม" }])
    expect(d.overallProgress).toBe("สรุปจาก 2 คาบ: ทำโจทย์ได้ดี มั่นใจขึ้นมาก · ยังสับสนเรื่องเศษส่วน ควรฝึกเพิ่ม")
    expect(d.strengths).toBe("ทำโจทย์ได้ดี มั่นใจขึ้นมาก")
    expect(d.toImprove).toBe("ยังสับสนเรื่องเศษส่วน ควรฝึกเพิ่ม")
  })
})

describe("drag & drop, co-teachers, card state", () => {
  it("move 'one' changes only that session", () => {
    const sessions = generateSessions(klass(), [], id)
    const r = moveSession(sessions, sessions[2].id, { date: "2026-10-14", start: "14:00" }, "one", new Date(2026, 8, 28), [])
    expect(r.sessions.filter((x) => x.start === "14:00")).toHaveLength(1)
    expect(r.sessions[2]).toMatchObject({ date: "2026-10-14", customized: true })
    expect(r.sessions[3].date).toBe(sessions[3].date)
  })

  it("move 'following' shifts this + later sessions, keeps attended ones, updates class template", () => {
    const sessions = generateSessions(klass(), [], id) // Tuesdays from 29 Sep
    const att: Attendance[] = [{ sessionId: sessions[4].id, studentId: "a", status: "leave", markedBy: "t1", markedAt: "" }]
    const r = moveSession(sessions, sessions[2].id, { date: "2026-10-14", start: "15:00", teacherId: "t2" }, "following", new Date(2026, 8, 28), att)
    expect(r.sessions[1].date).toBe(sessions[1].date) // earlier untouched
    expect(r.sessions[2]).toMatchObject({ date: "2026-10-14", start: "15:00", teacherId: "t2" })
    expect(r.sessions[3].date).toBe("2026-10-21") // Tue → Wed
    expect(r.sessions[4].date).toBe(sessions[4].date) // has attendance → kept
    expect(r.kept).toBe(1)
    expect(r.classPatch).toMatchObject({ weekday: 3, start: "15:00", teacherId: "t2" })
  })

  it("co-teacher double booking is a teacher conflict", () => {
    const a = generateSessions(klass({ id: "a", teacherId: "t1", coTeacherIds: ["t9"], roomId: "r1" }), [], id)[0]
    const b = generateSessions(klass({ id: "b", teacherId: "t9", roomId: "r2" }), [], id)[0]
    expect(findConflicts([a, b], branch, [teacher]).some((c) => c.kind === "teacher")).toBe(true)
  })

  it("card state: รอเริ่ม → กำลังเรียน → รอเช็คชื่อ → รอสรุป → เสร็จแล้ว", () => {
    const [s] = generateSessions(klass({ studentIds: ["a", "b"] }), [], id)
    const after = new Date(2026, 8, 29, 12, 0)
    expect(workState(s, new Date(2026, 8, 29, 9, 0), [], []).state).toBe("scheduled")
    expect(workState(s, new Date(2026, 8, 29, 10, 30), [], []).state).toBe("live")
    expect(workState(s, after, [], []).state).toBe("needs_attendance")
    const att: Attendance[] = ["a", "b"].map((st) => ({ sessionId: s.id, studentId: st, status: "present", markedBy: "t1", markedAt: "" }))
    expect(workState(s, after, att, [{ sessionId: s.id, studentId: "a", status: "submitted" }]).state).toBe("needs_summary")
    expect(workState(s, after, att, ["a", "b"].map((st) => ({ sessionId: s.id, studentId: st, status: "approved" }))).state).toBe("done")
    expect(workState(s, new Date(2026, 8, 30, 9, 0), [], []).overdue).toBe(true)
  })
})

describe("rooms full uses simultaneous count", () => {
  it("sessions that never run at the same instant do not count together", () => {
    const mk = (i: string, start: string, minutes: number): Session => ({ ...generateSessions(klass({ id: i, teacherId: null, roomId: null, start, minutes }), [], id)[0] })
    // 10:00-12:00 overlaps both 10:00-11:00 and 11:00-12:00, but at most 2 run at once (2 rooms) → no conflict
    const c = findConflicts([mk("a", "10:00", 120), mk("b", "10:00", 60), mk("c", "11:00", 60)], branch, [])
    expect(c.some((x) => x.kind === "rooms_full")).toBe(false)
    const c2 = findConflicts([mk("a", "10:00", 120), mk("b", "10:00", 60), mk("c", "10:30", 60)], branch, [])
    expect(c2.some((x) => x.kind === "rooms_full")).toBe(true)
  })
})

describe("people & session panel rules", () => {
  it("S4: family validation rejects bad phone / postcode", () => {
    const base = { name: "ครอบครัวทดสอบ", parents: [{ name: "แม่", phone: "081-234-5678", lineLinked: false, primary: true }] }
    expect(validateFamily(base)).toHaveLength(0)
    expect(validateFamily({ ...base, parents: [{ ...base.parents[0], phone: "abc" }] }).length).toBe(1)
    expect(validateFamily({ ...base, postcode: "abcde" }).length).toBe(1)
  })
  it("family validation also rejects two parents sharing the same phone (owner 2026-09-29: caught in a reference form's own mock data)", () => {
    const dup = {
      name: "ครอบครัวทดสอบ",
      parents: [
        { name: "แม่", phone: "081-234-5678", lineLinked: false, primary: true },
        { name: "พ่อ", phone: "081-234-5678", lineLinked: false, primary: false },
      ],
    }
    const errs = validateFamily(dup)
    expect(errs.some((e) => e.field === "parent1.phone" && e.message.includes("ซ้ำ"))).toBe(true)
    // different phones (even formatted differently) never trip the duplicate check
    expect(validateFamily({ ...dup, parents: [dup.parents[0], { ...dup.parents[1], phone: "089-000-1111" }] }).some((e) => e.message.includes("ซ้ำ"))).toBe(false)
  })
  it("matchExistingFamily finds a family by LINE identity first, then by any parent's phone, and never both-fails-silently into a false match", () => {
    const families = [
      { id: "fa_1", name: "ครอบครัวเอ", parents: [{ name: "แม่เอ", phone: "081-111-1111", lineLinked: true, primary: true }], lineUserId: "U_line_a" },
      { id: "fa_2", name: "ครอบครัวบี", parents: [{ name: "แม่บี", phone: "082-222-2222", lineLinked: false, primary: true, altPhones: ["083-333-3333"] }] },
    ]
    expect(matchExistingFamily(families, { lineUserId: "U_line_a", phones: ["099-999-9999"] })?.id).toBe("fa_1")
    expect(matchExistingFamily(families, { phones: ["082-222-2222"] })?.id).toBe("fa_2")
    expect(matchExistingFamily(families, { phones: ["083-333-3333"] })?.id).toBe("fa_2") // matches an altPhone too
    expect(matchExistingFamily(families, { lineUserId: "U_someone_else", phones: ["099-999-9999"] })).toBeNull()
  })
  it("student birth date cannot be in the future", () => {
    expect(validateStudent({ name: "ก", nickname: "ก", grade: "ป.5", birthDate: "2030-01-01" }, "2026-09-24").length).toBe(1)
  })
  it("S5: no-login staff need no email; login staff need a unique one", () => {
    const st = { name: "a", nickname: "a", roles: ["teacher" as const], branchIds: ["b1"], canLogin: false }
    expect(validateStaff(st, [])).toHaveLength(0)
    expect(validateStaff({ ...st, canLogin: true }, []).length).toBe(1)
  })
  it("F2: future sessions of a teacher (primary or co) are found for hand-over", () => {
    const ss = generateSessions(klass({ teacherId: "t1", coTeacherIds: ["t2"] }), [], id)
    expect(futureSessionsOf("t2", ss, "2026-10-01").length).toBe(ss.filter((x) => x.date >= "2026-10-01").length)
  })
  it("add student to following sessions skips started ones", () => {
    const ss = generateSessions(klass(), [], id)
    const now = new Date(2026, 9, 7) // after 2 sessions
    const r = applyToSessions(ss, ss[2].id, "following", (x) => ({ ...x, studentIds: [...x.studentIds, "z"] }), (x) => sessionState(x, now) === "upcoming")
    expect(r.sessions[1].studentIds).not.toContain("z")
    expect(r.sessions.slice(2).every((x) => x.studentIds.includes("z"))).toBe(true)
  })
})

describe("package coverage", () => {
  const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classIds: ["k1"], invoiceId: "i", kind: "sessions" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 5 }
  it("covers sessions of its class and one-off make-ups of the same subject", () => {
    expect(coveringEntitlement("a", { classId: "k1", subject: "Maths", date: "2026-10-01" }, [e])).toBe(e)
    expect(coveringEntitlement("a", { classId: null, subject: "Maths", date: "2026-10-01" }, [e])).toBe(e) // make-up
    expect(coveringEntitlement("a", { classId: null, subject: "English", date: "2026-10-01" }, [e])).toBeNull()
    expect(coveringEntitlement("a", { classId: "other", subject: "Maths", date: "2026-10-01" }, [e])).toBeNull()
    expect(coveringEntitlement("a", { classId: "k1", subject: "Maths", date: "2027-01-05" }, [e])).toBeNull() // expired
  })
})

describe("moving out of an existing clash", () => {
  it("only NEW conflicts block; the old teacher clash remains a warning", () => {
    const a = { ...generateSessions(klass({ id: "a", teacherId: "t1", roomId: "r1" }), [], id)[0] }
    const b = { ...generateSessions(klass({ id: "b", teacherId: "t1", roomId: "r1" }), [], id)[0] } // teacher + room clash
    const r = moveSession([a, b], b.id, { date: b.date, start: b.start, roomId: "r2" }, "one", new Date(2026, 8, 28), [])
    const res = introducedConflicts([a, b], r.sessions, r.movedIds, branch, [teacher])
    expect(res.added).toHaveLength(0)
    expect(res.remaining.some((c) => c.kind === "teacher")).toBe(true)
    // moving into an occupied room is new → blocked
    const c = { ...generateSessions(klass({ id: "c", teacherId: null, roomId: "r2" }), [], id)[0] }
    const r2 = moveSession([a, c], a.id, { date: a.date, start: a.start, roomId: "r2" }, "one", new Date(2026, 8, 28), [])
    expect(introducedConflicts([a, c], r2.sessions, r2.movedIds, branch, [teacher]).added.some((x) => x.kind === "room")).toBe(true)
  })
})

describe("fix suggestions", () => {
  it("proposes a free room first, and a free teacher, for a double-booked slot", () => {
    const b3: Branch = { ...branch, rooms: [...branch.rooms, { id: "r3", name: "Room 3" }] }
    const t2 = { ...teacher, id: "t2", nickname: "t2" }
    const a = { ...generateSessions(klass({ id: "a", teacherId: "t1", roomId: "r1" }), [], id)[0] }
    const b = { ...generateSessions(klass({ id: "b", teacherId: "t1", roomId: "r1" }), [], id)[0] }
    const fixes = suggestFixes(b.id, { sessions: [a, b], branch: b3, staff: [teacher, t2], holidays: [], now: new Date(2026, 8, 28), attendance: [] })
    expect(fixes.some((f) => f.kind === "teacher" && f.target.teacherId === "t2")).toBe(true)
    expect(fixes.some((f) => f.kind === "time")).toBe(true)
    // teacher swap alone leaves the room clash; moving time (with a free room) clears everything
    expect(fixes[0].clearsAll).toBe(true)
  })
})

describe("crm", () => {
  it("groups test/trial sub-stages under one pipeline column", () => {
    expect(groupOf("test_scheduled").key).toBe("test")
    expect(groupOf("tested").key).toBe("test")
    expect(groupOf("new").key).toBe("contact")
  })

  it("drag-and-drop cannot set enrolled/archived directly — those need their own action", () => {
    expect(canSetStage("contacting", "test_scheduled").ok).toBe(true)
    expect(canSetStage("payment_pending", "enrolled").ok).toBe(false)
    expect(canSetStage("new", "archived").ok).toBe(false)
    expect(canSetStage("archived", "new").ok).toBe(false) // must reactivate via its own flow first
  })

  it("restoreStage sends a lead back to where it was archived from, defaulting to new (the store's restoreLead uses this, not moveLeadStage, so canSetStage's archived guard above never blocks a real restore)", () => {
    expect(restoreStage({ archivedFrom: "test_scheduled" })).toBe("test_scheduled")
    expect(restoreStage({ archivedFrom: undefined })).toBe("new")
    expect(restoreStage({ archivedFrom: "archived" })).toBe("new") // never trap a lead archived-from-archived
  })

  it("validateLead requires the fields the pipeline card depends on", () => {
    expect(validateLead({ name: "", childGrade: "P5", subject: "Math", phone: "08x" })).toMatch(/ชื่อ/)
    expect(validateLead({ name: "Mom", childGrade: "", subject: "Math", phone: "08x" })).toMatch(/ระดับชั้น/)
    expect(validateLead({ name: "Mom", childGrade: "P5", subject: "Math", phone: "" })).toMatch(/เบอร์โทร/)
    expect(validateLead({ name: "Mom", childGrade: "P5", subject: "Math", phone: "08x" })).toBeNull()
  })

  it("daysAgo counts whole days from createdAt to now", () => {
    const created = new Date(2026, 8, 20).toISOString()
    expect(daysAgo(created, new Date(2026, 8, 23))).toBe(3)
    expect(daysAgo(created, new Date(2026, 8, 20))).toBe(0)
  })
})

describe("forms", () => {
  it("owner 2026-09-28: free slots are every whole hour the branch is open, not a fixed list", () => {
    expect(openHourStarts(branch, "2026-09-27")).toEqual([]) // Sunday closed
    const starts = openHourStarts(branch, "2026-09-29")
    expect(starts[0]).toBe(hours.open)
    expect(starts.every((t) => t.endsWith(":00") && t < hours.close)).toBe(true)
    const slots = findOfferSlots({ branch, staff: [teacher], sessions: [], classes: [], holidays: [], subject: "Maths", from: "2026-09-29", to: "2026-09-29", now: new Date(2026, 8, 28) })
    expect(slots.filter((s) => s.source === "generic").length).toBeGreaterThan(4)
  })
  it("findOfferSlots offers a generic time only when a qualified teacher and a room are both free", () => {
    const slots = findOfferSlots({ branch, staff: [teacher], sessions: [], classes: [], holidays: [], subject: "Maths", from: "2026-09-29", to: "2026-09-29", now: new Date(2026, 8, 28) })
    expect(slots.some((s) => s.source === "generic" && s.start === "09:00" && s.teacherId === "t1")).toBe(true)

    const busy: Session = { id: "s_busy", branchId: "b1", classId: null, subject: "Maths", date: "2026-09-29", start: "09:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: [], trial: false, customized: true, cancelled: false }
    const busySlots = findOfferSlots({ branch, staff: [teacher], sessions: [busy], classes: [], holidays: [], subject: "Maths", from: "2026-09-29", to: "2026-09-29", now: new Date(2026, 8, 28) })
    expect(busySlots.some((s) => s.source === "generic" && s.start === "09:00")).toBe(false)
  })

  it("findOfferSlots excludes holiday and closed-day dates from generic candidates", () => {
    const holidaySlots = findOfferSlots({ branch, staff: [teacher], sessions: [], classes: [], holidays, subject: "Maths", from: "2026-10-13", to: "2026-10-13", now: new Date(2026, 8, 28) })
    expect(holidaySlots).toHaveLength(0)

    const closedDaySlots = findOfferSlots({ branch, staff: [teacher], sessions: [], classes: [], holidays: [], subject: "Maths", from: "2026-09-27", to: "2026-09-27", now: new Date(2026, 8, 20) }) // Sunday — branch closed
    expect(closedDaySlots).toHaveLength(0)
  })

  it("findOfferSlots includes a real class session as a class-sourced offer, and excludes it once full", () => {
    const [session] = generateSessions(klass(), [], id, 1)
    const slots = findOfferSlots({ branch, staff: [teacher], sessions: [session], classes: [klass()], holidays: [], subject: "Maths", from: "2026-09-29", to: "2026-09-29", now: new Date(2026, 8, 28) })
    expect(slots.some((s) => s.source === "class" && s.sessionId === session.id)).toBe(true)

    const full = { ...session, studentIds: ["a", "b", "c", "d", "e", "f"] } // group capacity
    const fullSlots = findOfferSlots({ branch, staff: [teacher], sessions: [full], classes: [klass()], holidays: [], subject: "Maths", from: "2026-09-29", to: "2026-09-29", now: new Date(2026, 8, 28) })
    expect(fullSlots.some((s) => s.source === "class")).toBe(false)
  })

  it("buildSessionDraftFromSlot maps a generic slot into a bookable Session draft", () => {
    const slot: FormOfferSlot = { id: "off_g0", date: "2026-09-29", start: "09:00", minutes: 60, source: "generic", teacherId: "t1", roomId: "r1", classId: null, sessionId: null }
    const draft = buildSessionDraftFromSlot(slot, "Maths", "b1", "stu1", "test")
    expect(draft).toEqual({ branchId: "b1", classId: null, subject: "Maths", date: "2026-09-29", start: "09:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: ["stu1"], trial: true, assessment: "test" })
  })

  it("validateClass silently skips a holiday date for a single-date (non-learning) draft — the gap store.addSession's explicit isHoliday check works around", () => {
    const issues = validateClass(
      { branchId: "b1", subject: "Maths", kind: "other", type: "group", teacherId: "t1", coTeacherIds: [], roomId: "r1", weekday: 2, start: "10:00", minutes: 60, startDate: "2026-10-13", studentIds: [] },
      { branch, staff: [teacher], sessions: [], holidays },
    )
    expect(issues.some((i) => i.level === "block")).toBe(false)
  })

  it("buildCombinedSessionDraft merges 2 same-day, same-time generic picks into one 2-hour room block", () => {
    const slotA: FormOfferSlot = { id: "off_g0", date: "2026-09-29", start: "09:00", minutes: 60, source: "generic", teacherId: "t1", roomId: "r1", classId: null, sessionId: null }
    const slotB: FormOfferSlot = { id: "off_g1", date: "2026-09-29", start: "09:00", minutes: 60, source: "generic", teacherId: "t2", roomId: "r2", classId: null, sessionId: null }
    const draft = buildCombinedSessionDraft([{ subject: "Maths", slot: slotA }, { subject: "English", slot: slotB }], "b1", "stu1", branch, [], "test")
    expect(draft?.minutes).toBe(120)
    expect(draft?.subject).toBe("Maths + English")
    expect(draft?.teacherId).toBe("t1")
    expect(draft?.coTeacherIds).toEqual(["t2"])
  })

  it("buildCombinedSessionDraft refuses to merge picks on different dates or times, or a class-sourced pick", () => {
    const slotA: FormOfferSlot = { id: "off_g0", date: "2026-09-29", start: "09:00", minutes: 60, source: "generic", teacherId: "t1", roomId: "r1", classId: null, sessionId: null }
    const slotDiffTime: FormOfferSlot = { ...slotA, id: "off_g1", start: "12:00" }
    const slotClass: FormOfferSlot = { ...slotA, id: "off_c0", source: "class", classId: "k1", sessionId: "se1" }
    expect(buildCombinedSessionDraft([{ subject: "Maths", slot: slotA }, { subject: "English", slot: slotDiffTime }], "b1", "stu1", branch, [], "test")).toBeNull()
    expect(buildCombinedSessionDraft([{ subject: "Maths", slot: slotA }, { subject: "English", slot: slotClass }], "b1", "stu1", branch, [], "test")).toBeNull()
    expect(buildCombinedSessionDraft([{ subject: "Maths", slot: slotA }], "b1", "stu1", branch, [], "test")).toBeNull()
  })
})

describe("force approve & central notifications (owner 2026-09-26)", () => {
  const inv = (p: Partial<Invoice> = {}): Invoice => ({
    id: "i", branchId: "b1", studentId: "a", number: "INV-TST-6909-0001", lines: [], bus: [], bookFee: 0, advance: [],
    concession: null, noteToParent: "", status: "pending_approval", pdf: "ready", createdBy: "adm", createdAt: "", payments: [], ...p,
  })
  it("creator can Force Approve their own invoice only with a remark", () => {
    expect(canForceApprove(inv(), admin, " ").ok).toBe(false)
    expect(canForceApprove(inv(), admin, "อยู่สาขาคนเดียว").ok).toBe(true)
  })
  it("Force never bypasses role, branch or status rules — and is not offered when normal approval works", () => {
    expect(canForceApprove(inv({ createdBy: "t1" }), teacher, "x").ok).toBe(false)
    expect(canForceApprove(inv({ createdBy: "adm", branchId: "b2" }), admin, "x").ok).toBe(false)
    expect(canForceApprove(inv({ pdf: "generating" }), admin, "x").ok).toBe(false)
    expect(canForceApprove(inv(), director, "x").ok).toBe(false) // director can simply approve
  })
  it("payment recorder can Force confirm with a remark", () => {
    expect(canForceConfirmPayment({ recordedBy: "adm" }, admin, "b1", "").ok).toBe(false)
    expect(canForceConfirmPayment({ recordedBy: "adm" }, admin, "b1", "ลูกค้ารอ").ok).toBe(true)
    expect(canForceConfirmPayment({ recordedBy: "adm" }, director, "b1", "x").ok).toBe(false)
  })
  it("summary author can Force approve with a remark", () => {
    const summary = { id: "x", sessionId: "s", studentId: "a", text: "ok", status: "submitted" as const, authorId: "adm", lastEditorId: "adm", history: [] }
    expect(Sum.canForceApprove(summary, admin, "").ok).toBe(false)
    expect(Sum.canForceApprove(summary, admin, "x").ok).toBe(true)
    expect(Sum.canForceApprove({ ...summary, authorId: "t1", lastEditorId: "t1" }, teacher, "x").ok).toBe(false)
  })
  it("force notice reaches everyone at the branch + every Director, not the other branch", () => {
    const d2 = { ...director, id: "dir2", branchIds: ["b2"] }
    const otherBranchTeacher = { ...teacher, id: "t9", branchIds: ["b2"] }
    const n = notify({ id: "n", at: new Date(), kind: "force_approved", title: "", body: "", fromId: "adm", audience: forceAudience("b1", [director, d2, admin, teacher]) })
    expect(visibleTo(n, teacher)).toBe(true)
    expect(visibleTo(n, manager)).toBe(true)
    expect(visibleTo(n, d2)).toBe(true)
    expect(visibleTo(n, otherBranchTeacher)).toBe(false)
  })
  it("read state is per person, and the sender never sees their own as unread", () => {
    const n = notify({ id: "n", at: new Date(), kind: "message", title: "", body: "hi", fromId: "adm", audience: messageAudience({ kind: "branch" }, "b1") })
    expect(isUnread(n, admin)).toBe(false)
    expect(isUnread(n, teacher)).toBe(true)
    expect(isUnread({ ...n, readBy: [...n.readBy, "mgr"] }, teacher)).toBe(true)
  })
  it("team message validation", () => {
    expect(validateMessage({ kind: "branch" }, " ")).toMatch(/ข้อความ/)
    expect(validateMessage({ kind: "people", staffIds: [] }, "hi")).toMatch(/ผู้รับ/)
    expect(validateMessage({ kind: "role", role: "teacher" }, "hi")).toBeNull()
  })
})

describe("settings (mirrors staging, 2026-09-28)", () => {
  it("price chart upserts / clears one cell and summarises a duration's range", () => {
    let chart = setPrice([], { unit: "hour", duration: 12, subject: "Maths", grade: "P5" }, 3000)
    chart = setPrice(chart, { unit: "hour", duration: 12, subject: "Maths", grade: "P6" }, 3200)
    chart = setPrice(chart, { unit: "hour", duration: 12, subject: "Maths", grade: "P5" }, 3100)
    const b = { ...branch, priceChart: chart }
    expect(priceOf(b, "hour", 12, "Maths", "P5")).toBe(3100)
    expect(priceRange(b, "hour", 12)).toEqual({ min: 3100, max: 3200, count: 2 })
    expect(priceOf({ ...b, priceChart: setPrice(chart, { unit: "hour", duration: 12, subject: "Maths", grade: "P5" }, null) }, "hour", 12, "Maths", "P5")).toBeNull()
  })
  it("bus rate comes from the General Fees bus type, else the legacy per-leg default", () => {
    expect(busRate(branch)).toBe(150)
    expect(busRate({ ...branch, fees: [{ id: "f1", kind: "bus", name: "Std", price: 180 }, { id: "f2", kind: "bus", name: "Far", price: 250 }] }, "f2")).toBe(250)
    expect(busRate({ ...branch, fees: [{ id: "f1", kind: "bus", name: "Std", price: 180 }] })).toBe(180)
  })
  it("promotions apply only to their package type once the minimum duration is bought", () => {
    const b = { ...branch, promotions: [{ id: "p", name: "48h", type: "amount" as const, value: 1000, unit: "hour" as const, minDuration: 48, active: true }] }
    expect(bestPromotion(b, { unit: "hour", amount: 24 }, 10000, "2026-09-28")).toBeNull()
    expect(bestPromotion(b, { unit: "hour", amount: 48 }, 10000, "2026-09-28")?.discount).toBe(1000)
    expect(bestPromotion(b, { unit: "month", amount: 48 }, 10000, "2026-09-28")).toBeNull()
  })
  it("validators: branch code, promotion, durations; copy hours to weekdays", () => {
    expect(validateBranchInfo({ name: "X", code: "th", rooms: branch.rooms, email: "" })).toMatch(/รหัส/)
    expect(validateBranchInfo({ name: "X", code: "THL", rooms: branch.rooms, email: "a@b.co" })).toBeNull()
    expect(validateBranchInfo({ name: "X", code: "THL", rooms: branch.rooms, email: "", province: "" })).toMatch(/จังหวัด/)
    expect(validateBranchInfo({ name: "X", code: "THL", rooms: branch.rooms, email: "", province: "CBR" })).toBeNull()
    expect(validatePromotion({ id: "p", name: "x", type: "pct", value: 120, unit: "month", minDuration: 1, active: true })).toMatch(/100/)
    expect(validateDurations([12, 12])).toMatch(/ซ้ำ/)
    const h = copyHours({ ...branch.hours, 1: { open: "07:00", close: "20:00" } }, 1, "weekdays")
    expect(h[5]).toEqual({ open: "07:00", close: "20:00" })
    expect(h[0]).toEqual(branch.hours[0])
  })
})

describe("holidays: company calendar + per-branch choice (owner 2026-09-28)", () => {
  const company: Holiday = { id: "c1", branchId: null, date: "2026-10-23", name: "Chulalongkorn Day", category: "traditional", openBranchIds: ["b2"] }
  it("a company holiday closes every branch except those that chose to open", () => {
    expect(closesBranch(company, "b1")).toBe(true)
    expect(closesBranch(company, "b2")).toBe(false)
    expect(isHoliday("2026-10-23", "b2", [company])).toBeUndefined()
    expect(isHoliday("2026-10-23", "b1", [company])?.id).toBe("c1")
  })
  it("impact of a company holiday skips branches that stay open", () => {
    const s = (branchId: string) => ({ id: branchId, branchId, date: "2026-10-23", cancelled: false }) as unknown as Session
    expect(holidayImpact("2026-10-23", null, [s("b1"), s("b2")], ["b2"]).map((x) => x.branchId)).toEqual(["b1"])
  })
  it("company holidays are traditional/company; branch-created ones are 'branch'", () => {
    expect(validateHoliday({ name: "x", date: "2026-10-01", branchId: null, category: "branch" })).toMatch(/บริษัท/)
    expect(validateHoliday({ name: "x", date: "2026-10-01", branchId: "b1", category: "company" })).toMatch(/สาขา/)
    expect(validateHoliday({ name: "x", date: "2026-10-01", branchId: "b1", category: "branch" })).toBeNull()
  })
})

describe("special periods (e.g. summer 08:00–22:00 every day)", () => {
  const summer = { id: "sp", name: "Summer", from: "2026-04-01", to: "2026-05-15", hours: everyDay({ open: "08:00", close: "22:00" }), active: true, priority: "medium" as const }
  it("replaces the weekly hours inside its date range only — including days normally closed", () => {
    const b = { ...branch, specialPeriods: [summer] }
    expect(hoursFor(b, "2026-04-05")).toEqual({ open: "08:00", close: "22:00" }) // Sunday: normally closed
    expect(hoursFor(b, "2026-05-20")).toEqual(branch.hours[3]) // Wednesday, back to normal hours
  })
  it("rejects overlapping ranges and bad hours", () => {
    expect(validateSpecialPeriods([summer, { ...summer, id: "sp2", name: "Exam", from: "2026-05-10", to: "2026-05-30" }])).toMatch(/ทับกัน/)
    expect(validateSpecialPeriods([summer, { ...summer, id: "sp2", name: "Exam", from: "2026-05-10", to: "2026-05-30", priority: "high" }])).toBeNull()
    expect(validateSpecialPeriods([{ ...summer, hours: everyDay({ open: "22:00", close: "08:00" }) }])).toMatch(/เวลาปิด/)
    expect(validateSpecialPeriods([summer])).toBeNull()
    expect(validateSpecialPeriods([summer, { ...summer, id: "old", active: false }])).toBeNull() // inactive copy may overlap
  })
  it("when periods overlap, the higher priority decides the hours", () => {
    const exam = { ...summer, id: "ex", name: "Exam", from: "2026-05-10", to: "2026-05-12", priority: "high" as const, hours: everyDay({ open: "09:00", close: "12:00" }) }
    expect(hoursFor({ ...branch, specialPeriods: [summer, exam] }, "2026-05-11")).toEqual({ open: "09:00", close: "12:00" })
    expect(hoursFor({ ...branch, specialPeriods: [summer, exam] }, "2026-05-13")).toEqual({ open: "08:00", close: "22:00" })
  })
  it("an inactive period is kept but has no effect on hours", () => {
    expect(hoursFor({ ...branch, specialPeriods: [{ ...summer, active: false }] }, "2026-04-05")).toBeNull()
    expect(periodsIn({ ...branch, specialPeriods: [summer] }, "2026-05-10", "2026-06-01").map((p) => p.id)).toEqual(["sp"])
  })
})

describe("course (mirrors staging Create Course, 2026-09-28)", () => {
  const b: Branch = {
    ...branch, subjects: ["Maths", "English"], grades: ["P5", "P6"],
    priceChart: [
      { unit: "month", duration: 1, subject: "Maths", grade: "P5", price: 4000 },
      { unit: "month", duration: 1, subject: "Maths", grade: "P6", price: 4200 },
      { unit: "month", duration: 1, subject: "English", grade: "P5", price: 3000 },
      { unit: "hour", duration: 12, subject: "Maths", grade: "P5", price: 3100 },
    ],
  }
  const c = (p: Partial<Course> = {}): Course => ({ id: "c", branchId: "b1", name: "", kind: "single", format: "group", subjects: ["Maths"], grades: ["P5"], unit: "month", duration: 1, price: 4000, courseFee: 0, active: true, ...p })
  it("price comes from the branch chart; a bundle adds its subjects", () => {
    expect(chartPrice(b, c()).price).toBe(4000)
    expect(chartPrice(b, c({ kind: "bundle", subjects: ["Maths", "English"] })).price).toBe(7000)
    expect(chartPrice(b, c({ unit: "hour", duration: 12 })).price).toBe(3100)
  })
  it("grades with different chart prices → no single suggestion (consider separate courses)", () => {
    const r = chartPrice(b, c({ grades: ["P5", "P6"] }))
    expect(r.mixed).toBe(true)
    expect(r.price).toBeNull()
  })
  it("a price that differs from the chart needs a reason; bundle needs 2+ subjects; hour/week need a duration", () => {
    expect(validateCourse(b, c())).toBeNull()
    expect(validateCourse(b, c({ price: 3500 }))).toMatch(/เหตุผล/)
    expect(validateCourse(b, c({ price: 3500, priceReason: "promo" }))).toBeNull()
    expect(validateCourse(b, c({ kind: "bundle" }))).toMatch(/Bundle/)
    expect(validateCourse(b, c({ unit: "hour", duration: 7, price: 3100 }))).toMatch(/ระยะเวลา/)
  })
  it("hour packs cover sessions by real session length; week packs are a window", () => {
    const hour = quoteCourse({ course: { unit: "hour", duration: 24, price: 6000 }, klasses: [klass({ minutes: 120 })], startDate: "2026-09-29", periods: 1, holidays: [] })
    const ninety = quoteCourse({ course: { unit: "hour", duration: 24, price: 6000 }, klasses: [klass({ minutes: 90 })], startDate: "2026-09-29", periods: 1, holidays: [] })
    expect(hour.ok && hour.value.sessions.length).toBe(12)
    expect(ninety.ok && ninety.value.sessions.length).toBe(16)
    const week = quoteCourse({ course: { unit: "week", duration: 4, price: 5000 }, klasses: [klass()], startDate: "2026-09-29", periods: 1, holidays: [] })
    expect(week.ok && week.value.sessions.length).toBe(4)
    expect(week.ok && week.value.total).toBe(5000)
  })
  it("default name from subjects + grades", () => {
    expect(defaultCourseName(["คณิต", "อังกฤษ"], ["ป.6", "ป.5"])).toBe("คณิต + อังกฤษ ป.5–ป.6")
  })
})

describe("create class — many rows, free length, multi-subject (owner 2026-09-28)", () => {
  it("session length is free in 5-minute steps (min 5)", () => {
    const d = { branchId: "b1", subject: "Maths", kind: "learning" as const, type: "group" as const, teacherId: "t1", roomId: "r1", weekday: 2 as Weekday, start: "10:00", startDate: "2026-09-29", studentIds: [] }
    const ctx = { branch, staff: [teacher], sessions: [], holidays: [] }
    expect(validateClass({ ...d, minutes: 45 }, ctx).some((i) => i.field === "minutes")).toBe(false)
    expect(validateClass({ ...d, minutes: 5 }, ctx).some((i) => i.field === "minutes")).toBe(false)
    expect(validateClass({ ...d, minutes: 47 }, ctx).some((i) => i.field === "minutes")).toBe(true)
  })
  it("rows of one form that overlap each other are caught before creating", () => {
    expect(overlappingRows([{ weekday: 1, start: "10:00", minutes: 60 }, { weekday: 1, start: "10:30", minutes: 60 }, { weekday: 3, start: "10:00", minutes: 60 }])).toEqual([[0, 1]])
    expect(overlappingRows([{ weekday: 1, start: "10:00", minutes: 60 }, { weekday: 1, start: "11:00", minutes: 60 }])).toEqual([])
  })
  it("a multi-subject session is covered only by a course that includes every subject", () => {
    const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classIds: ["other"], invoiceId: "i", kind: "subscription" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 1 }
    const s = { classId: null, subject: "Maths", subjects: ["Maths", "English"], date: "2026-10-01" }
    expect(coveringEntitlement("a", s, [e])).toBeNull()
    expect(coveringEntitlement("a", s, [{ ...e, subjects: ["Maths", "English"] }])?.id).toBe("e")
  })
  it("teacher must teach every subject of the class (otherwise needs a reason)", () => {
    const d = { branchId: "b1", subject: "Maths", subjects: ["Maths", "English"], kind: "learning" as const, type: "group" as const, teacherId: "t1", roomId: "r1", weekday: 2 as Weekday, start: "10:00", minutes: 45, startDate: "2026-09-29", studentIds: [] }
    expect(validateClass(d, { branch, staff: [teacher], sessions: [], holidays: [] }).find((i) => i.field === "teacherId")?.message).toMatch(/English/)
  })
})

describe("student search scales (owner 2026-09-28: 100,000 students)", () => {
  const big = Array.from({ length: 100_000 }, (_, i) => ({ id: `s${i}`, name: `นักเรียน ${i}`, nickname: i === 77_777 ? "ใบเตย" : `n${i}`, grade: i % 2 ? "ป.5" : "ม.1" }))
  it("returns a capped list fast, never the whole school", () => {
    const t = performance.now()
    const r = searchStudents(big, "n1")
    expect(performance.now() - t).toBeLessThan(200)
    expect(r.items.length).toBe(8)
    expect(r.total).toBeGreaterThan(1000)
    expect(searchStudents(big, "").items).toEqual([])
    expect(searchStudents(big, "ใบเตย").items.map((s) => s.id)).toEqual(["s77777"])
  })
  it("class grades come first; already-chosen students are excluded", () => {
    const r = searchStudents(big, "n1", { preferGrades: ["ป.5"], exclude: ["s1"] })
    expect(r.items.every((s) => s.grade === "ป.5")).toBe(true)
    expect(r.items.some((s) => s.id === "s1")).toBe(false)
  })
})

// E2E loop test 2026-09-28: Inbox → Lead → Test/Trial → Invoice → Receipt → Student → Class → Summary → Renewal
describe("end-to-end loop gaps", () => {
  it("monthly invoice typed on 28 Sep for a Saturday class bills October, not 'September · 0 sessions · ฿0'", () => {
    const r = quoteCourse({ course: monthPkg, klasses: [klass({ weekday: 6 })], startDate: "2026-09-28", periods: 1, holidays: [] })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.from).toBe("2026-10-03")
    expect(r.value.to).toBe("2026-10-31")
    expect(r.value.sessions).toHaveLength(5)
    expect(r.value.total).toBe(4500)
  })

  it("converting a lead keeps the parent: family named after the child's surname, lead is primary parent, LINE carries over", () => {
    const f = familyFromLead({ name: "คุณสมชาย ใจดี", phone: "0895551212", lineUserId: "U1" }, { studentName: "ด.ช. ภูมิ ใจดี" }, "f1")
    expect(f.name).toBe("ครอบครัวใจดี")
    expect(f.parents).toEqual([{ name: "คุณสมชาย ใจดี", phone: "089-555-1212", lineLinked: true, primary: true }])
    expect(f.lineUserId).toBe("U1")
    expect(validateFamily(f)).toEqual([])
    // no LINE yet → family still created, just not linked
    expect(familyFromLead({ name: "คุณแม่ดาว", phone: "081-234-5678" }, { studentName: "น้องฟ้า" }, "f2").parents[0].lineLinked).toBe(false)
  })

  it("student from a parent form gets a nickname, not the full name with title", () => {
    expect(nicknameFrom("ด.ช. ภูมิ ใจดี")).toBe("ภูมิ")
    expect(nicknameFrom("เด็กหญิงฟ้า สดใส")).toBe("ฟ้า")
    expect(nicknameFrom("มะปราง")).toBe("มะปราง")
  })

  it("a session that started with no teacher can still get one (else nobody can mark/summarise); a staffed one cannot", () => {
    const base = generateSessions(klass({ teacherId: null }), [], id)[0] // Tue 29 Sep 10:00–11:00
    const during = new Date("2026-09-29T10:30:00")
    expect(canChangeTeachers(base, during).ok).toBe(true)
    expect(canChangeTeachers({ ...base, teacherId: "t1" }, during).ok).toBe(false)
    expect(canChangeTeachers({ ...base, cancelled: true }, during).ok).toBe(false)
    expect(canChangeTeachers({ ...base, teacherId: "t1" }, new Date("2026-09-28T10:00:00")).ok).toBe(true)
  })
})

// Owner round 2026-09-28 after the E2E test: stages move by themselves, Test → Trial → Invoice, renewals, customer picker
describe("lead flow runs by itself", () => {
  it("approving a form books the visit (นัดสอบ/นัดทดลอง); only attending moves to สอบแล้ว/ทดลองแล้ว", () => {
    expect(APPROVE_STAGE).toEqual({ test: "test_scheduled", trial: "trial_scheduled" })
    expect(ATTENDED_STAGE).toEqual({ test: "tested", trial: "trialed" })
  })

  it("automatic moves only go forward — a late test attendance never drags a paying lead back", () => {
    expect(advanceStage("test_scheduled", "tested")).toBe("tested")
    expect(advanceStage("payment_pending", "tested")).toBe("payment_pending")
    expect(advanceStage("trialed", "payment_pending")).toBe("payment_pending")
    expect(advanceStage("archived", "enrolled")).toBe("archived")
  })

  it("a test session reads สอบวัดระดับ, not ทดลอง", () => {
    expect(sessionKindLabel({ trial: true, assessment: "test" })).toBe("สอบวัดระดับ")
    expect(sessionKindLabel({ trial: true, assessment: "trial" })).toBe("ทดลองเรียน")
    expect(sessionKindLabel({ trial: false })).toBeNull()
  })

  it("paid but first class still ahead = Active (from payment confirmation), not Inactive", () => {
    const ent: Entitlement = { id: "e", studentId: "a", courseId: "c1", subjects: ["Maths"], classIds: ["k1"], invoiceId: "i", kind: "subscription", from: "2026-10-03", to: "2026-10-31", sessionsTotal: 5 }
    expect(studentState({ id: "a" }, [ent], [], "2026-09-28")).toEqual({ status: "active", startsOn: "2026-10-03" })
    expect(studentState({ id: "a" }, [], [], "2026-09-28").status).toBe("inactive")
  })

  it("Test → Trial → Invoice: paid classes must start after the last test/trial", () => {
    const asm = (date: string): Assessment => ({ id: date, type: "trial", leadId: "l", studentId: "a", sessionId: "s", subject: "Maths", date, start: "13:00" })
    expect(lastAssessmentDate("a", [asm("2026-09-29"), asm("2026-10-03")])).toBe("2026-10-03")
    expect(lastAssessmentDate("b", [asm("2026-10-03")])).toBeNull()
    const k = klass({ id: "k1", weekday: 6 })
    const draft = (startDate: string): Invoice => ({ id: "i", branchId: "b1", studentId: "a", number: null, lines: [{ id: "l1", courseId: "c1", classIds: ["k1"], startDate, periods: 1 }], bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "adm", createdAt: "", payments: [] })
    const ctx = { branch, courses: [monthPkg], classes: [k], holidays: [] }
    // start 1 Oct → first class Sat 3 Oct = the trial day → blocked
    expect(validateInvoiceDraft(draft("2026-10-01"), invoiceTotals(draft("2026-10-01"), ctx), { lastAssessment: "2026-10-03" }).join()).toContain("หลังวันสอบ/ทดลองเรียน")
    expect(validateInvoiceDraft(draft("2026-10-04"), invoiceTotals(draft("2026-10-04"), ctx), { lastAssessment: "2026-10-03" })).toEqual([])
  })
})

describe("renewals + customer picker tell same-nickname students apart", () => {
  const fam: Family = { id: "f1", name: "ครอบครัวใจดี", parents: [{ name: "คุณสมชาย", phone: "089-555-1212", lineLinked: true, primary: true }] }
  const stu = (id: string, name: string, nickname: string, grade: string, familyId: string | null): Student =>
    ({ id, familyId, branchId: "b1", name, nickname, grade, usesBus: false, createdAt: `2026-09-${id === "s1" ? "01" : "20"}T00:00:00Z`, createdBranchId: "b1" })
  const students = [stu("s1", "ด.ช. ภูมิ ใจดี", "ภูมิ", "ป.5", "f1"), stu("s2", "ด.ญ. ภูมิ รักเรียน", "ภูมิ", "ป.4", null)]
  const leads: Lead[] = [{ id: "l1", branchId: "b1", name: "คุณแม่ดาว", childGrade: "ป.5", subject: "Maths", source: "phone", stage: "contacting", assigneeId: null, phone: "081-111-2222", lineId: "", createdAt: "2026-09-25T00:00:00Z", notes: [] }]

  it("labels carry full name, grade and family", () => {
    expect(studentLabel(students[0], "ครอบครัวใจดี")).toBe("ภูมิ (ด.ช. ภูมิ ใจดี · ป.5 · ครอบครัวใจดี)")
    expect(studentLabel(students[1])).toBe("ภูมิ (ด.ญ. ภูมิ รักเรียน · ป.4)")
  })

  it("search by name / family / phone, filter by type and grade, sort", () => {
    const rows = customerRows({ students, families: [fam], leads }, ["student", "lead", "family"])
    const f = (q: string, extra: Partial<Parameters<typeof filterCustomers>[1]> = {}) => filterCustomers(rows, { q, kinds: ["student", "lead", "family"], grade: "", sort: "name", ...extra }).map((r) => `${r.kind}:${r.id}`)
    expect(f("ภูมิ")).toEqual(expect.arrayContaining(["student:s1", "student:s2", "family:f1"]))
    expect(f("5551212")).toEqual(expect.arrayContaining(["student:s1", "family:f1"]))
    expect(f("", { kinds: ["lead"] })).toEqual(["lead:l1"])
    expect(f("ภูมิ", { kinds: ["student"], grade: "ป.4" })).toEqual(["student:s2"])
    expect(f("", { kinds: ["student"], sort: "recent" })).toEqual(["student:s2", "student:s1"])
  })
})

describe("real LINE texts", () => {
  it("invoice message has the student, the period, the total and where to pay — dates formatted, never ISO", () => {
    const k = klass({ id: "k1", weekday: 6 })
    const inv: Invoice = { id: "i", branchId: "b1", studentId: "a", number: "INV-TST-6910-0001", lines: [{ id: "l1", courseId: "c1", classIds: ["k1"], startDate: "2026-10-01", periods: 1 }], bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "ค่าเรียน ต.ค.", status: "approved", pdf: "ready", createdBy: "adm", createdAt: "", payments: [] }
    const b = { ...branch, bankAccount: { bank: "กสิกร", branchName: "", name: "NockAcademy", number: "123-4-56789-0" } }
    const text = invoiceMessage(inv, invoiceTotals(inv, { branch: b, courses: [monthPkg], classes: [k], holidays: [] }), { student: { id: "a", familyId: null, branchId: "b1", name: "ด.ช. ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5", usesBus: false, createdAt: "", createdBranchId: "b1" }, branch: b })
    expect(text).toContain("INV-TST-6910-0001")
    expect(text).toContain("฿4,500")
    expect(text).toContain("123-4-56789-0")
    expect(text).toContain("3 ต.ค.")
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })
})

// Owner 2026-09-29: leave with quota extends the package one class; re-schedule only inside the same week
describe("leave quota and re-schedule", () => {
  const k = klass({ id: "k1", weekday: 2, studentIds: ["a"] }) // Tuesdays 10:00
  const sessions = generateSessions(k, [], id).map((x) => ({ ...x, studentIds: ["a"] })) // 29 Sep, 6 Oct, 13 Oct, 20 Oct …
  const ent: Entitlement = { id: "e1", studentId: "a", courseId: "c1", subjects: ["Maths"], classIds: ["k1"], invoiceId: "i", kind: "subscription", from: "2026-09-29", to: "2026-10-27", sessionsTotal: 4 }
  const leave = (date: string): Attendance => ({ sessionId: sessions.find((x) => x.date === date)!.id, studentId: "a", status: "leave", markedBy: "adm", markedAt: "" })
  const ctx = (attendance: Attendance[]) => ({ sessions, attendance, classes: [k], holidays: [] })

  it("leave with quota left: quota used, package ends one class later (the next Tuesday)", () => {
    expect(leaveLedger(ent, ctx([leave("2026-10-06")]))).toEqual([{ sessionId: expect.any(String), date: "2026-10-06", quota: true }])
    expect(resolveEntitlements([ent], [], ctx([leave("2026-10-06")]))[0].to).toBe("2026-11-03")
  })

  it("leave after the quota is gone adds nothing — end date stays", () => {
    const two = ctx([leave("2026-10-06"), leave("2026-10-20")])
    expect(leaveLedger(ent, two).map((l) => l.quota)).toEqual([true, false])
    expect(resolveEntitlements([ent], [], two)[0].to).toBe("2026-11-03")
  })

  it("the extra class skips a holiday", () => {
    const hol: Holiday[] = [{ id: "h", branchId: "b1", date: "2026-11-03", name: "x", category: "branch" }]
    expect(resolveEntitlements([ent], [], { ...ctx([leave("2026-10-06")]), holidays: hol })[0].to).toBe("2026-11-10")
  })

  it("re-schedule only inside the same Mon–Sun week, same subject, to a session not started yet", () => {
    const now = new Date("2026-09-28T08:00:00")
    const tue = sessions[0] // Tue 29 Sep
    const thu: Session = { ...tue, id: "thu", classId: "k2", date: "2026-10-01", studentIds: [] }
    const nextMon: Session = { ...tue, id: "mon", classId: "k2", date: "2026-10-05", studentIds: [] }
    expect(mondayOf("2026-10-04")).toBe("2026-09-28")
    expect(canRescheduleStudent(tue, thu, "a", now, 6).ok).toBe(true)
    const r = canRescheduleStudent(tue, nextMon, "a", now, 6)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toContain("การลา")
    expect(canRescheduleStudent(tue, { ...thu, subject: "English" }, "a", now, 6).ok).toBe(false)
    // a full session only warns (soft capacity, owner 2026-09-30)
    const full = canRescheduleStudent(tue, { ...thu, studentIds: ["x", "y"] }, "a", now, 2)
    expect(full.ok && full.warnings?.[0]).toContain("แนะนำไม่เกิน 2")
  })

  it("the session a student moved into still draws from their package", () => {
    const other: Session = { ...sessions[0], id: "o", classId: "k2", date: "2026-10-01" }
    expect(packageCovers(ent, other)).toBe(false)
    expect(packageCovers(ent, { ...other, rescheduledIn: ["a"] })).toBe(true)
  })
})

describe("summary send deadline (owner 2026-09-29)", () => {
  it("must reach the parent within 7 days after the class", () => {
    expect(Sum.sendDeadline({ date: "2026-09-29" }, new Date(2026, 9, 1))).toEqual({ deadline: "2026-10-06", overdue: false, daysLeft: 5 })
    expect(Sum.sendDeadline({ date: "2026-09-29" }, new Date(2026, 9, 8)).overdue).toBe(true)
  })
})

describe("deleted class disappears from the calendar (owner 2026-09-29)", () => {
  it("hides cancelled sessions of a deleted class, keeps a single cancelled session visible", () => {
    const classes = [{ id: "gone", active: false }, { id: "live", active: true }]
    expect(removedWithClass({ cancelled: true, classId: "gone" }, classes)).toBe(true)
    expect(removedWithClass({ cancelled: true, classId: "live" }, classes)).toBe(false)
    expect(removedWithClass({ cancelled: false, classId: "gone" }, classes)).toBe(false)
  })
})

describe("next form is pre-filled (owner 2026-09-29: the Trial form must not start empty)", () => {
  const lead = { name: "คุณสมชาย ใจดี", phone: "089-555-1212", lineId: "@som", childGrade: "ป.5", subject: "คณิต", source: "walkin" as const }
  it("uses the family on file + every child with the subjects they already tested", () => {
    const family: Family = { id: "f", name: "ครอบครัวใจดี", parents: [{ name: "สมชาย ใจดี", phone: "089-555-1212", lineLinked: true, primary: true, relationship: "คุณพ่อ" }], address: "123 สุขุมวิท", postcode: "10110" }
    const kids = [{ id: "s1", name: "ด.ช. ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5" }]
    const p = buildFormPrefill({ lead, family, students: kids, assessments: [{ studentId: "s1", subject: "คณิต" }, { studentId: "s1", subject: "คณิต" }] })
    expect(p.parents[0]).toMatchObject({ name: "สมชาย ใจดี", relationship: "คุณพ่อ", primary: true })
    expect(p.address).toBe("123 สุขุมวิท")
    expect(p.acquisitions).toEqual(["walkin"])
    expect(p.students).toEqual([expect.objectContaining({ name: "ด.ช. ภูมิ ใจดี", grade: "ป.5", interests: ["คณิต"] })])
  })
  it("no family yet → the lead's own name/phone/LINE ID, no children", () => {
    const p = buildFormPrefill({ lead, students: [], assessments: [] })
    expect(p.parents).toEqual([{ name: "คุณสมชาย ใจดี", phone: "089-555-1212", lineId: "@som", primary: true }])
    expect(p.students).toEqual([])
  })
})

describe("one visit for several subjects (owner 2026-09-30)", () => {
  const slot = (subject: string, date: string, start: string): FormOfferSlot => ({ id: `${subject}${date}${start}`, date, start, minutes: 60, source: "generic", teacherId: null, roomId: null, classId: null, sessionId: null })
  const offers = [
    { subject: "Maths", slots: [slot("Maths", "2026-10-01", "10:00"), slot("Maths", "2026-10-01", "13:00"), slot("Maths", "2026-10-02", "10:00")] },
    { subject: "English", slots: [slot("English", "2026-10-01", "13:00"), slot("English", "2026-10-02", "16:00")] },
  ]
  it("1 subject: its own times, 1 hour", () => {
    expect(commonSlots(offers, ["Maths"]).map((x) => `${x.date} ${x.start} ${x.minutes}`)).toEqual(["2026-10-01 10:00 60", "2026-10-01 13:00 60", "2026-10-02 10:00 60"])
  })
  it("2 subjects: a time whose teacher/room can't stay a 2nd hour (fits2h false) or that is someone's class is not offered", () => {
    const o2 = [
      { subject: "Maths", slots: [{ ...slot("Maths", "2026-10-01", "13:00"), fits2h: false }, slot("Maths", "2026-10-02", "10:00")] },
      { subject: "English", slots: [slot("English", "2026-10-01", "13:00"), { ...slot("English", "2026-10-02", "10:00"), source: "class" as const }] },
    ]
    expect(commonSlots(o2, ["Maths", "English"])).toEqual([])
    expect(commonSlots(o2, ["Maths"]).length).toBe(2) // alone, a 1-hour slot is fine
  })

  it("2 subjects: only the times both are free together, as one 2-hour block, picking sets both", () => {
    const r = commonSlots(offers, ["Maths", "English"])
    expect(r.map((x) => `${x.date} ${x.start} ${x.minutes}`)).toEqual(["2026-10-01 13:00 120"])
    expect(Object.keys(r[0].bySubject)).toEqual(["Maths", "English"])
  })
})

describe("admin offers know which hours can become a 2-hour visit", () => {
  it("the hour before closing can't (branch closes 20:00), a free midday hour can", () => {
    const slots = findOfferSlots({ branch, staff: [teacher], sessions: [], classes: [], holidays: [], subject: "Maths", from: "2026-10-06", to: "2026-10-06", now: new Date(2026, 9, 1), minutes: 60 })
    expect(slots.find((x) => x.start === "19:00")?.fits2h).toBe(false)
    expect(slots.find((x) => x.start === "13:00")?.fits2h).toBe(true)
  })
})

describe("returning family edits details in a form (owner 2026-09-30)", () => {
  const family: Family = { id: "f", name: "ครอบครัวใจดี", parents: [{ name: "สมชาย ใจดี", phone: "089-555-1212", lineLinked: true, primary: true }], address: "123 สุขุมวิท", sources: ["walkin"] }
  const student: Student = { id: "s", familyId: "f", branchId: "b1", name: "ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5", usesBus: false, createdAt: "", createdBranchId: "b1" }
  const sub = (p: Partial<FormSubmission>): FormSubmission => ({
    id: "x", token: "t", type: "trial", groupId: "g", primaryLeadId: "l", leadId: "l", branchId: "b1", conversationId: null, lineUserId: "U",
    parents: [{ name: "สมชาย ใจดี", phone: "0895551212", email: "som@mail.com" }], studentName: "ภูมิ ใจดี", studentGrade: "ป.6", picks: [], status: "pending", submittedAt: "", ...p,
  })

  it("lists only what really changed; blanks never erase", () => {
    const c = submissionChanges(family, student, sub({ familyAddress: "", studentSchool: "สาธิต", acquisitions: ["walkin", "facebook"] }))
    expect(c.map((x) => x.label)).toEqual(["ผู้ปกครอง สมชาย ใจดี: อีเมล", "รู้จักเราจาก", "นักเรียน: ชั้น", "นักเรียน: โรงเรียน"])
    expect(submissionChanges(family, student, sub({ parents: [{ name: "สมชาย ใจดี", phone: "089-555-1212" }], studentGrade: "ป.5" }))).toEqual([])
  })

  it("merge keeps what's on file for blank answers, adds a new parent, unions sources", () => {
    const m = mergeSubmission(family, student, sub({ parents: [{ name: "สมชาย ใจดี", phone: "0895551212", email: "som@mail.com" }, { name: "สมหญิง ใจดี", phone: "0811112222" }], familyAddress: "", acquisitions: ["facebook"] }))
    expect(m.family?.address).toBe("123 สุขุมวิท")
    expect(m.family?.parents.map((p) => p.name)).toEqual(["สมชาย ใจดี", "สมหญิง ใจดี"])
    expect(m.family?.parents[0].email).toBe("som@mail.com")
    expect(m.family?.sources).toEqual(["walkin", "facebook"])
    expect(m.student?.grade).toBe("ป.6")
  })
})

describe("parent form reads grades/subjects in its language (owner 2026-09-30)", () => {
  it("grades convert automatically", () => {
    expect(["อ.2", "ป.5", "ม.1", "ม.4"].map((g) => gradeLabel(g, "en"))).toEqual(["K2", "G5", "G7", "G10"])
    expect(["อ.3", "ป.5", "ม.2", "ม.6"].map((g) => gradeLabel(g, "ja"))).toEqual(["年長", "小5", "中2", "高3"])
    expect(gradeLabel("ป.5", "th")).toBe("ป.5")
  })
  it("subjects use the Settings name for that language, else the Thai name", () => {
    const names = { "คณิต": { en: "Math", ja: "数学" }, "วิทย์": { en: "" } }
    expect(subjectLabel("คณิต", "ja", names)).toBe("数学")
    expect(subjectLabel("วิทย์", "en", names)).toBe("วิทย์")
    expect(subjectLabel("คณิต", "th", names)).toBe("คณิต")
  })
})

describe("invoice with several courses (Staging, owner 2026-09-30)", () => {
  const maths = klass({ id: "k1", weekday: 2 })
  const eng = klass({ id: "k2", subject: "English", weekday: 4, minutes: 90 })
  const priv = klass({ id: "k3", type: "single", weekday: 5 })
  const engPkg: Course = { ...monthPkg, id: "c2", name: "English P5", subjects: ["English"], price: 3000, courseFee: 200 }
  const privPkg: Course = { ...monthPkg, id: "c3", name: "Maths Private", format: "single", unit: "hour", duration: 12, price: 7200 }
  const ctx = { branch, courses: [monthPkg, engPkg, privPkg], classes: [maths, eng, priv], holidays: [] }
  const inv = (lines: Invoice["lines"]): Invoice => ({ id: "i", branchId: "b1", studentId: "a", number: null, lines, bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "adm", createdAt: "", payments: [] })

  it("each line is priced on its own and the invoice adds them up", () => {
    const t = invoiceTotals(inv([
      { id: "a", courseId: "c1", classIds: ["k1"], startDate: "2026-10-01", periods: 1 },
      { id: "b", courseId: "c2", classIds: ["k2"], startDate: "2026-10-01", periods: 1 },
    ]), ctx)
    expect(t.lines.map((l) => l.amount)).toEqual([4500, 3000])
    expect(t.courseFee).toBe(200)
    expect(t.total).toBe(7700)
    // bus legs follow the union of class days, once per day
    expect(invoiceSessionDates(t.lines)).toEqual([...new Set([...t.lines[0].quote!.sessions, ...t.lines[1].quote!.sessions])].sort())
  })

  it("the same course + class twice on one invoice is blocked; a line without a class names which course", () => {
    const dup = inv([{ id: "a", courseId: "c1", classIds: ["k1"], startDate: "2026-10-01", periods: 1 }, { id: "b", courseId: "c1", classIds: ["k1"], startDate: "2026-11-01", periods: 1 }])
    expect(validateInvoiceDraft(dup, invoiceTotals(dup, ctx)).join()).toContain("ซ้ำ")
    const noClass = inv([{ id: "a", courseId: "c1", classIds: ["k1"], startDate: "2026-10-01", periods: 1 }, { id: "b", courseId: "c2", classIds: [], startDate: "2026-10-01", periods: 1 }])
    expect(validateInvoiceDraft(noClass, invoiceTotals(noClass, ctx))).toEqual(["คอร์สที่ 2 (English P5): เลือกคลาสและวันเริ่มเรียน"])
  })

  it("class options match the course subject and format (เดี่ยว/กลุ่ม)", () => {
    expect(classOptionsFor(monthPkg, ctx.classes, "b1").map((k) => k.id)).toEqual(["k1"])
    expect(classOptionsFor(privPkg, ctx.classes, "b1").map((k) => k.id)).toEqual(["k3"])
    expect(classOptionsFor(monthPkg, ctx.classes, "b2")).toEqual([])
  })

  it("Select Course lists only this branch's active courses, filtered like Staging", () => {
    const other: Course = { ...monthPkg, id: "c9", branchId: "b2" }
    const ended: Course = { ...monthPkg, id: "c8", to: "2026-09-01" }
    const all = [monthPkg, engPkg, privPkg, other, ended]
    const f = (p: Partial<Parameters<typeof filterCourses>[2]>) => filterCourses(all, "b1", { q: "", subject: "", format: "", pack: "", ...p }, "2026-09-30").map((c) => c.id)
    expect(f({}).sort()).toEqual(["c1", "c2", "c3"])
    expect(f({ subject: "Maths" }).sort()).toEqual(["c1", "c3"])
    expect(f({ format: "single" })).toEqual(["c3"])
    expect(f({ pack: "hour:12" })).toEqual(["c3"])
    expect(f({ q: "english" })).toEqual(["c2"])
  })
})

describe("bus fee type + Advance Optional (Staging, owner 2026-09-30)", () => {
  const b: Branch = { ...branch, fees: [
    { id: "bs", kind: "bus", name: "Standard", price: 150 }, { id: "bf", kind: "bus", name: "โซนไกล", price: 200 },
    { id: "en", kind: "entry", name: "ค่าแรกเข้า", price: 1500 }, { id: "mk", kind: "mock", name: "Mock test", price: 800 },
  ] }
  const inv = (p: Partial<Invoice>): Invoice => ({ id: "i", branchId: "b1", studentId: "a", number: null, lines: [], bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "adm", createdAt: "", payments: [], ...p })
  const ctx = { branch: b, courses: [], classes: [], holidays: [] }

  it("bus legs are priced by the chosen bus type", () => {
    const bus = [{ date: "2026-10-06", pickup: true, dropoff: true }]
    expect(invoiceTotals(inv({ bus, busFeeId: "bf" }), ctx).bus).toBe(400)
    expect(invoiceTotals(inv({ bus }), ctx).bus).toBe(300) // unset = first bus type
  })

  it("advance items add up; the entry fee is charged once — waived after a paid entry fee, or for an imported old student", () => {
    expect(invoiceTotals(inv({ advance: [{ feeId: "en", name: "ค่าแรกเข้า", amount: 1500 }, { feeId: "mk", name: "Mock", amount: 800 }] }), ctx).advance).toBe(2300)
    const stu = { id: "a" }
    expect(defaultAdvance(b, stu, []).map((x) => x.feeId)).toEqual(["en"])
    const paid = inv({ id: "p", status: "paid", number: "INV-1", advance: [{ feeId: "en", name: "ค่าแรกเข้า", amount: 1500 }] })
    expect(entryFeeWaiver(stu, [paid], b.fees)).toMatchObject({ reason: "paid", invoice: { number: "INV-1" } })
    expect(defaultAdvance(b, stu, [paid])).toEqual([])
    // editing that same invoice does not count it against itself
    expect(entryFeeWaiver(stu, [paid], b.fees, "p")).toBeNull()
    expect(defaultAdvance(b, undefined, [])).toEqual([])
    // strict Staging: a paid invoice without an entry fee does not waive it…
    expect(defaultAdvance(b, stu, [inv({ id: "old", status: "paid", number: "INV-0" })]).map((x) => x.feeId)).toEqual(["en"])
    // …but a student from the old-system import does, and the admin is told why (owner 2026-09-30)
    const old = { id: "a", imported: { at: "2026-06-01T00:00:00Z", source: "ระบบเดิม" } }
    expect(entryFeeWaiver(old, [], b.fees)).toMatchObject({ reason: "imported", source: "ระบบเดิม" })
    expect(defaultAdvance(b, old, [])).toEqual([])
  })
})

describe("one course on several classes + weeks pro-rate + hour packs in sessions (owner 2026-09-30)", () => {
  const tue = klass({ id: "tue", weekday: 2, start: "16:00" })
  const thu = klass({ id: "thu", weekday: 4, start: "16:00" })

  it("a monthly course on Tue + Thu is one price; the month is pro-rated by weeks with class, not by sessions", () => {
    // from Tue 20 Oct: 20, 22, 27, 29 Oct = 4 sessions but only 2 weeks → 60%
    const r = quoteCourse({ course: monthPkg, klasses: [tue, thu], startDate: "2026-10-20", periods: 1, holidays: [] })
    expect(r.ok && r.value.sessions).toEqual(["2026-10-20", "2026-10-22", "2026-10-27", "2026-10-29"])
    expect(r.ok && r.value.periods[0].weeks?.length).toBe(2)
    expect(r.ok && r.value.total).toBe(Math.round(4500 * 0.6))
    // every class meeting is its own slot, so enrolment knows which class each date belongs to
    expect(r.ok && r.value.slots.map((x) => x.classId)).toEqual(["tue", "thu", "tue", "thu"])
  })

  it("a week starts on the branch's first open day and is billed in that day's month", () => {
    const monFri = [1, 2, 3, 4, 5] as Weekday[], fromWed = [3, 4, 5, 6, 0] as Weekday[]
    expect(weekKey("2026-10-02", monFri)).toBe("2026-09-28")
    expect(weekKey("2026-10-02", fromWed)).toBe("2026-09-30")
  })

  it("hour packs become whole sessions at the class's real length; the rest is leftover minutes", () => {
    const k90 = klass({ minutes: 90 })
    const h = (duration: number, extra: Partial<Parameters<typeof quoteCourse>[0]> = {}) => {
      const r = quoteCourse({ course: { unit: "hour", duration, price: 6000 }, klasses: [k90], startDate: "2026-09-29", periods: 1, holidays: [], ...extra })
      if (!r.ok) throw new Error(r.error)
      return r.value
    }
    expect(h(24).slots.length).toBe(16) // 24 h ÷ 1:30
    expect(h(24).leftoverMinutes).toBe(0)
    expect(h(10).slots.length).toBe(6)
    expect(h(10).leftoverMinutes).toBe(60)
    expect(h(10, { leftover: "extra" }).slots.length).toBe(7) // one more session, not charged
    expect(h(10, { leftover: "extra" }).total).toBe(6000)
    expect(h(10, { leftover: "carry" }).carryOut).toBe(60)
    expect(h(10, { leftover: "drop" }).carryOut).toBe(0)
    // minutes kept last time come in: 10 h + 30 min = 7 × 90 min exactly
    expect(h(10, { carryIn: 30 }).slots.length).toBe(7)
    expect(h(10, { carryIn: 30 }).leftoverMinutes).toBe(0)
  })

  it("a leftover must be decided before the invoice can be saved", () => {
    const k90 = klass({ id: "k90", minutes: 90 })
    const pkg: Course = { ...monthPkg, id: "h10", unit: "hour", duration: 10, price: 6000 }
    const inv = (leftover?: "carry"): Invoice => ({ id: "i", branchId: "b1", studentId: "a", number: null, lines: [{ id: "l", courseId: "h10", classIds: ["k90"], startDate: "2026-09-29", periods: 1, leftover }], bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "adm", createdAt: "", payments: [] })
    const ctx = { branch, courses: [pkg], classes: [k90], holidays: [] }
    expect(validateInvoiceDraft(inv(), invoiceTotals(inv(), ctx)).join()).toContain("เศษ 60 นาที")
    expect(validateInvoiceDraft(inv("carry"), invoiceTotals(inv("carry"), ctx))).toEqual([])
  })

  it("kept minutes belong to the student + course and are used up once another invoice takes them", () => {
    const ent: Entitlement = { id: "e", studentId: "a", courseId: "h", subjects: ["Maths"], classIds: ["k"], invoiceId: "i0", kind: "sessions", from: "2026-09-01", to: "2026-10-31", sessionsTotal: 6, carryMinutes: 60 }
    const taking = (status: Invoice["status"]): Invoice => ({ id: "i1", branchId: "b1", studentId: "a", number: null, lines: [{ id: "l", courseId: "h", classIds: ["k"], startDate: "2026-11-01", periods: 1, carryIn: 60 }], bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status, pdf: "none", createdBy: "adm", createdAt: "", payments: [] })
    expect(carriedMinutes("a", "h", [ent], [])).toBe(60)
    expect(carriedMinutes("a", "other", [ent], [])).toBe(0)
    expect(carriedMinutes("b", "h", [ent], [])).toBe(0)
    expect(carriedMinutes("a", "h", [ent], [taking("draft")])).toBe(0)
    expect(carriedMinutes("a", "h", [ent], [taking("void")])).toBe(60)
    expect(carriedMinutes("a", "h", [ent], [taking("draft")], "i1")).toBe(60) // editing the invoice that holds them
  })

  it("a quota leave on a two-class package extends it to the next meeting of either class", () => {
    expect(nextClassDates([tue, thu], "2026-10-20", 2, [])).toEqual(["2026-10-22", "2026-10-27"])
  })
})

describe("extra bus days after paying (Liclass, owner 2026-09-30)", () => {
  const add = (id: string, date: string, studentId = "a"): BusAddOn => ({ id, branchId: "b1", studentId, date, pickup: true, dropoff: false, busFeeId: null, amount: 150, createdBy: "adm", createdAt: "" })
  const inv = (id: string, status: Invoice["status"], ids: string[]): Invoice => ({ id, branchId: "b1", studentId: "a", number: id, lines: [], bus: [], busExtras: ids.map((x) => ({ addOnId: x, date: "2026-10-01", pickup: true, dropoff: false, amount: 150 })), bookFee: 0, advance: [], concession: null, noteToParent: "", status, pdf: "none", createdBy: "adm", createdAt: "", payments: [] })
  const addOns = [add("x", "2026-10-02"), add("y", "2026-10-01"), add("z", "2026-10-01", "b")]

  it("legs × bus fee; at least one leg", () => {
    expect(busAddOnAmount({ pickup: true, dropoff: true }, 150)).toBe(300)
    expect(validateBusAddOn({ date: "2026-10-01", pickup: false, dropoff: false })).toMatch(/อย่างน้อย/)
  })

  it("stay pending until a live invoice charges them; a void invoice gives them back", () => {
    expect(pendingBusAddOns("a", addOns, []).map((x) => x.id)).toEqual(["y", "x"])
    expect(pendingBusAddOns("a", addOns, [inv("i1", "draft", ["y"])]).map((x) => x.id)).toEqual(["x"])
    expect(pendingBusAddOns("a", addOns, [inv("i1", "void", ["y"])]).map((x) => x.id)).toEqual(["y", "x"])
    // the invoice being edited still sees its own
    expect(pendingBusAddOns("a", addOns, [inv("i1", "draft", ["y"])], "i1").map((x) => x.id)).toEqual(["y", "x"])
    expect(billedOn("y", [inv("i1", "sent", ["y"])])?.id).toBe("i1")
  })

  it("the same leg on the same day is added once", () => {
    expect(duplicateBusDay("a", [{ date: "2026-10-02", pickup: true, dropoff: false }], addOns)).toBe("2026-10-02")
    expect(duplicateBusDay("a", [{ date: "2026-10-02", pickup: false, dropoff: true }], addOns)).toBeNull()
    expect(duplicateBusDay("a", [{ date: "2026-10-05", pickup: true, dropoff: false }, { date: "2026-10-05", pickup: true, dropoff: true }], addOns)).toBe("2026-10-05")
  })

  it("an invoice can carry only the bus charge — and it adds to the total", () => {
    const i = inv("i2", "draft", ["x", "y"])
    const t = invoiceTotals(i, { branch, courses: [], classes: [], holidays: [] })
    expect(t.busExtra).toBe(300)
    expect(t.total).toBe(300)
    expect(validateInvoiceDraft(i, t)).toEqual([])
  })
})

describe("Credit Note: refund or keep as course credit (owner 2026-09-30)", () => {
  const k = klass({ id: "k1", weekday: 2 })
  const ctx = { branch, courses: [monthPkg], classes: [k], holidays: [] }
  const paid: Invoice = {
    id: "i1", branchId: "b1", studentId: "a", number: "INV-1", lines: [{ id: "l1", courseId: "c1", classIds: ["k1"], startDate: "2026-10-01", periods: 1 }],
    bus: [{ date: "2026-10-06", pickup: true, dropoff: true }], bookFee: 350, advance: [], concession: null, noteToParent: "", status: "paid", pdf: "ready", createdBy: "adm", createdAt: "",
    payments: [{ id: "p", amount: 5150, method: "transfer", reference: "", recordedBy: "adm", recordedAt: "", confirmedBy: "mgr" }],
  }
  const totals = invoiceTotals(paid, ctx)
  const cn = (p: Partial<CreditNote>): CreditNote => ({ id: "cn1", branchId: "b1", studentId: "a", invoiceId: "i1", number: "CN-1", mode: "refund", items: [], reasons: ["ลาออก / เลิกเรียน"], remark: "", status: "pending_approval", createdBy: "adm", createdAt: "", ...p })

  it("lists what can go back, each with its most; earlier notes are taken off", () => {
    expect(Refund.refundableItems(paid, totals, []).map((i) => [i.key, i.max])).toEqual([["line:l1", 4500], ["bus", 300], ["book", 350]])
    const earlier = cn({ items: [{ key: "book", label: "ค่าหนังสือ", amount: 350 }], status: "approved" })
    expect(Refund.refundableItems(paid, totals, [earlier]).map((i) => i.key)).toEqual(["line:l1", "bus"])
  })

  it("suggests the unused share when the student stops mid-month", () => {
    // Oct 2026 Tuesdays: 6, 13, 20, 27 → stop from 20 Oct = 2 of 4 unused
    expect(Refund.unusedShare(totals.lines[0], "2026-10-20")).toEqual({ unused: 2, of: 4, amount: 2250 })
  })

  it("needs a reason, at least one item, no more than each item and than what was paid", () => {
    const max = Refund.refundableItems(paid, totals, [])
    const v = (p: Partial<CreditNote>) => Refund.validateCreditNote(cn(p), paid, max, [])
    expect(v({ items: [] })).toMatch(/อย่างน้อย/)
    expect(v({ items: [{ key: "bus", label: "ค่ารถ", amount: 400 }] })).toMatch(/ไม่เกิน 300/)
    expect(v({ items: [{ key: "bus", label: "ค่ารถ", amount: 300 }], reasons: [], remark: "" })).toMatch(/เหตุผล/)
    expect(v({ items: [{ key: "bus", label: "ค่ารถ", amount: 300 }] })).toBeNull()
    expect(Refund.validateCreditNote(cn({ items: [{ key: "bus", label: "ค่ารถ", amount: 300 }] }), { ...paid, status: "sent" }, max, [])).toMatch(/ชำระครบ/)
  })

  it("maker–checker like invoices", () => {
    expect(Refund.canApproveCreditNote(cn({}), admin).ok).toBe(false) // created by adm
    expect(Refund.canApproveCreditNote(cn({}), manager).ok).toBe(true)
    expect(Refund.canApproveCreditNote(cn({}), teacher).ok).toBe(false)
    expect(Refund.canForceApproveCreditNote(cn({}), admin, "อยู่คนเดียว").ok).toBe(true)
  })

  it("refund needs the account it left from (to match the statement)", () => {
    expect(Refund.validateRefundRecord(cn({ status: "approved" }), { fromAccount: "", date: "2026-10-20", reference: "x" })).toMatch(/บัญชี/)
    expect(Refund.validateRefundRecord(cn({ status: "approved" }), { fromAccount: "KBank 222", date: "2026-10-20", reference: "x" })).toBeNull()
    expect(Refund.validateRefundRecord(cn({ status: "approved", mode: "credit" }), { fromAccount: "KBank", date: "2026-10-20", reference: "x" })).toMatch(/เครดิต/)
  })

  it("credit belongs to student + course, is used once, and never more than that course's charge", () => {
    const credit = cn({ mode: "credit", status: "approved", items: [{ key: "line:l1", label: "Maths", courseId: "c1", amount: 5000 }] })
    expect(Refund.availableCredit("a", "c1", [credit], [])).toEqual([{ creditNoteId: "cn1", amount: 5000 }])
    expect(Refund.availableCredit("a", "c2", [credit], [])).toEqual([])
    expect(Refund.availableCredit("b", "c1", [credit], [])).toEqual([])
    const next: Invoice = { ...paid, id: "i2", status: "draft", payments: [], lines: [{ id: "l2", courseId: "c1", classIds: ["k1"], startDate: "2026-11-01", periods: 1 }], bus: [], bookFee: 0 }
    const use = Refund.autoCredits("a", invoiceTotals(next, ctx).lines, [credit], [])
    expect(use).toEqual([{ creditNoteId: "cn1", courseId: "c1", amount: 4500 }]) // capped at the course charge
    const withCredit = { ...next, creditsUsed: use }
    expect(invoiceTotals(withCredit, ctx).total).toBe(0)
    expect(Refund.availableCredit("a", "c1", [credit], [withCredit])).toEqual([{ creditNoteId: "cn1", amount: 500 }])
    expect(Refund.availableCredit("a", "c1", [credit], [{ ...withCredit, status: "void" }])[0].amount).toBe(5000)
  })
})

describe("paper invoice / receipt (owner template INV + REC, 2026-09-30)", () => {
  const k = klass({ id: "k1", weekday: 2 })
  const b: Branch = { ...branch, fees: [{ id: "bs", kind: "bus", name: "Standard", price: 150 }], promotions: [] }
  const pkg: Course = { ...monthPkg, courseFee: 300 }
  const inv: Invoice = {
    id: "i", branchId: "b1", studentId: "a", number: "690930-01-002-0001", lines: [{ id: "l", courseId: "c1", classIds: ["k1"], startDate: "2026-10-20", periods: 2 }],
    bus: [{ date: "2026-10-20", pickup: true, dropoff: true }], busFeeId: "bs", busExtras: [{ addOnId: "x", date: "2026-10-01", pickup: true, dropoff: false, amount: 150 }],
    bookFee: 350, advance: [{ feeId: "en", name: "ค่าแรกเข้า", amount: 1500 }], concession: { amount: 200, remark: "ลูกค้าเก่า" }, creditsUsed: [{ creditNoteId: "cn", courseId: "c1", amount: 100 }],
    noteToParent: "", status: "approved", pdf: "ready", createdBy: "adm", createdAt: "2026-09-30T03:00:00Z", payments: [],
  }
  const totals = invoiceTotals(inv, { branch: b, courses: [pkg], classes: [k], holidays: [] })

  it("the printed lines always add up to the invoice total — a month per row, discounts as negative rows", () => {
    const items = Doc.invoiceItems(inv, totals, b)
    expect(items.reduce((a, i) => a + i.amount, 0)).toBe(totals.total)
    expect(items.filter((i) => i.description.startsWith("ค่าคอร์ส")).length).toBe(2) // Oct (pro-rated) + Nov
    expect(items.find((i) => i.description.startsWith("ค่ารถรับส่ง"))).toMatchObject({ qty: 2, unitPrice: 150, amount: 300 })
    expect(items.find((i) => i.description.startsWith("ส่วนลดพิเศษ"))?.amount).toBe(-200)
  })

  it("customer = student's full name unless the family gave tax details; due at month end; file named like the template", () => {
    expect(Doc.customerOf({ name: "ด.ช.ภูมิ ใจดี" })).toEqual({ name: "ด.ช.ภูมิ ใจดี", address: "", taxId: "" })
    expect(Doc.customerOf({ name: "ด.ช.ภูมิ" }, { taxInfo: { customerName: "บจก. ใจดี", taxId: "0105", address: "กทม." } }).name).toBe("บจก. ใจดี")
    expect(Doc.invoiceDates(inv)).toEqual({ date: "2026-09-30", dueBy: "2026-09-30" })
    expect(Doc.documentFileName("690930-01-002-0001", "ด.ช.ภูมิ/ใจดี")).toBe("690930-01-002-0001 ด.ช.ภูมิใจดี")
    expect(Doc.receiptDate({ payments: [{ id: "p", amount: 1, method: "cash", reference: "", recordedBy: "a", recordedAt: "2026-10-02T09:00:00Z", confirmedBy: "m" }] })).toBe("2026-10-02")
  })
})

describe("flexible class time: 1 of 2 hours (owner 2026-09-30)", () => {
  const k120 = klass({ id: "k2h", minutes: 120, start: "16:00" })
  const sess = (id: string, date: string, p: Partial<Session> = {}): Session => ({ id, branchId: "b1", classId: "k2h", subject: "Maths", date, start: "16:00", minutes: 120, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: ["a"], trial: false, customized: false, cancelled: false, ...p })

  it("seat = this session → standing class seat → whole class; options are the whole class then each hour", () => {
    const withSeat = { ...k120, seats: { a: { offset: 0, minutes: 60 } } }
    expect(Seats.seatOf(sess("s1", "2026-10-06"), "a", withSeat)).toEqual({ offset: 0, minutes: 60 })
    expect(Seats.seatOf(sess("s1", "2026-10-06", { seats: { a: { offset: 60, minutes: 60 } } }), "a", withSeat)).toEqual({ offset: 60, minutes: 60 })
    expect(Seats.seatOf(sess("s1", "2026-10-06"), "b", withSeat)).toEqual({ offset: 0, minutes: 120 })
    expect(Seats.seatOptions(120).map((o) => Seats.seatLabel(o, 120))).toEqual(["เต็มคลาส (2 ชม.)", "ชม.แรก (1 ชม.)", "ชม.หลัง (1 ชม.)"])
    expect(Seats.seatTime("16:00", { offset: 60, minutes: 60 })).toBe("17:00–18:00")
  })

  it("an hour pack on the first hour only gives twice the sessions at the same price", () => {
    const pkg: Course = { ...monthPkg, id: "h24", unit: "hour", duration: 24, price: 6000 }
    const inv = (seats?: Record<string, { offset: number; minutes: number }>): Invoice => ({ id: "i", branchId: "b1", studentId: "a", number: null, lines: [{ id: "l", courseId: "h24", classIds: ["k2h"], startDate: "2026-10-06", periods: 1, seats }], bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "adm", createdAt: "", payments: [] })
    const ctx = { branch, courses: [pkg], classes: [k120], holidays: [] }
    expect(invoiceTotals(inv(), ctx).lines[0].quote?.slots.length).toBe(12)
    const half = invoiceTotals(inv({ k2h: { offset: 0, minutes: 60 } }), ctx)
    expect(half.lines[0].quote?.slots.length).toBe(24)
    expect(half.total).toBe(6000)
  })

  it("hour packs are used up by minutes really attended; leftover minutes stay in the balance", () => {
    const e: Entitlement = { id: "e", studentId: "a", courseId: "h", subjects: ["Maths"], classIds: ["k2h"], invoiceId: "i", kind: "sessions", from: "2026-10-01", to: "2026-12-31", sessionsTotal: 12, minutesTotal: 24 * 60 }
    const sessions = [sess("s1", "2026-10-06"), sess("s2", "2026-10-13"), sess("s3", "2026-10-20")]
    const att: Attendance[] = [
      { sessionId: "s1", studentId: "a", status: "present", markedBy: "t1", markedAt: "" },
      { sessionId: "s2", studentId: "a", status: "present", minutes: 60, markedBy: "t1", markedAt: "" }, // came for 1 of 2 hours
      { sessionId: "s3", studentId: "a", status: "leave", markedBy: "t1", markedAt: "" },
    ]
    const b = balance(e, sessions, att, [k120])
    expect(b.remainingMinutes).toBe(24 * 60 - 180)
    expect(b.remaining).toBe(10) // 1260 min ÷ 120 = 10 full sessions, 60 min still there
    expect(Seats.minutesCharged({ status: "absent" }, { offset: 0, minutes: 60 })).toBe(60)
    expect(Seats.attendedChoices({ offset: 0, minutes: 120 })).toEqual([120, 90, 60, 30])
  })
})

describe("lesson summary: Book / Topic / Lesson Detail / Feedback (owner 2026-09-30)", () => {
  const books = [{ id: "b1", branchId: "br", name: "Hello English 1", createdBy: "t", createdAt: "1" }, { id: "b2", branchId: "br", name: "Maths Challenge", createdBy: "t", createdAt: "2" }]

  it("same name in any case/spacing is the same book; near misses are asked about", () => {
    expect(Les.findSame(books, "  hello   ENGLISH 1 ")?.id).toBe("b1")
    expect(Les.findSame(books, "Hello English 2")).toBeUndefined()
    expect(Les.findSimilar(books, "Helo English 1").map((b) => b.id)).toEqual(["b1"])
    expect(Les.findSimilar(books, "Science")).toEqual([])
    expect(Les.cleanName("  Unit  3 ")).toBe("Unit 3")
    expect(Les.validateCatalogName("   ")).toMatch(/พิมพ์/)
  })

  it("teachers of the branch use and tidy the catalog", () => {
    expect(Les.canUseCatalog(teacher, "b1")).toBe(true)
    expect(Les.canUseCatalog(teacher, "other-branch")).toBe(false)
  })

  it("a new summary starts where the student left off: same book, next topic", () => {
    const topics = [
      { id: "t1", bookId: "b1", name: "Unit 1", createdBy: "t", createdAt: "1" },
      { id: "t2", bookId: "b1", name: "Unit 2", createdBy: "t", createdAt: "2" },
    ]
    const sum = (id: string, sessionId: string, topicId: string): LessonSummary => ({ id, sessionId, studentId: "a", text: "", bookId: "b1", topicId, status: "sent", authorId: "t", lastEditorId: "t", history: [] })
    const dates = new Map([["s1", "2026-09-01"], ["s2", "2026-09-08"]])
    expect(Les.suggestLesson("a", [sum("x", "s1", "t1")], dates, topics)).toEqual({ bookId: "b1", topicId: "t2" })
    expect(Les.suggestLesson("a", [sum("x", "s1", "t1"), sum("y", "s2", "t2")], dates, topics)).toEqual({ bookId: "b1", topicId: "t2" }) // last topic: stay
    expect(Les.suggestLesson("b", [sum("x", "s1", "t1")], dates, topics)).toEqual({})
  })

  it("parents get Book, Topic, Lesson Detail and the feedback", () => {
    const text = summaryMessage({ id: "s", sessionId: "x", studentId: "a", text: "ตั้งใจเรียนดีมาก", detail: "หน้า 12–15", status: "approved", authorId: "t", lastEditorId: "t", history: [] },
      { student: { id: "a", familyId: null, branchId: "b1", name: "ด.ช. โจ้", nickname: "โจ้", grade: "ป.3", usesBus: false, createdAt: "", createdBranchId: "b1" }, session: { subject: "อังกฤษ", date: "2026-10-01", start: "16:00" }, book: "Hello English 1", topic: "Unit 2" })
    expect(text).toContain("หนังสือ: Hello English 1")
    expect(text).toContain("บทเรียน: Unit 2")
    expect(text).toContain("รายละเอียด: หน้า 12–15")
    expect(text).toContain("ตั้งใจเรียนดีมาก")
  })
})

describe("Sales Tax Report (owner file, 2026-09-30)", () => {
  const pay = (at: string) => [{ id: "p", amount: 1000, method: "transfer" as const, reference: "", recordedBy: "a", recordedAt: `${at}T09:00:00Z`, confirmedBy: "m" }]
  const inv = (id: string, number: string, status: Invoice["status"], paidOn: string | null, branchId = "b1"): Invoice => ({ id, branchId, studentId: "s1", number, lines: [], bus: [], bookFee: 1000, advance: [], concession: null, noteToParent: "", status, pdf: "ready", createdBy: "adm", createdAt: "2026-09-01T00:00:00Z", payments: paidOn ? pay(paidOn) : [] })
  const ctx = (invoices: Invoice[], creditNotes: CreditNote[] = []) => ({
    invoices, creditNotes, students: [{ id: "s1", name: "ด.ช. ภูมิ ใจดี", familyId: null }], families: [],
    branches: [{ id: "b1", brand: "nockacademy" as const }, { id: "b2", brand: "liclass" as const }], totalOf: (i: Invoice) => i.bookFee,
  })

  it("paid invoices on the day the money came in, statement order; unpaid ones are left out", () => {
    const rows = Doc.salesTaxRows("2026-10", ctx([
      inv("a", "691001-01-001-0002", "paid", "2026-10-05"), inv("b", "690930-02-001-0001", "paid", "2026-10-02", "b2"),
      inv("c", "690930-01-001-0001", "paid", "2026-09-30"), inv("d", "691001-01-001-0003", "sent", null),
    ]))
    expect(rows.map((r) => [r.date, r.number, r.business])).toEqual([["2026-10-02", "690930-02-001-0001", "liclass"], ["2026-10-05", "691001-01-001-0002", "nockacademy"]])
    expect(rows[0].customer).toBe("ด.ช. ภูมิ ใจดี")
  })

  it("approved credit notes are negative rows in the month issued, pointing at the invoice; totals per business", () => {
    const cn: CreditNote = { id: "cn", branchId: "b1", studentId: "s1", invoiceId: "a", number: "CN-691010-01-001-0001", mode: "refund", items: [{ key: "book", label: "ค่าหนังสือ", amount: 400 }], reasons: [], remark: "x", status: "approved", createdBy: "adm", createdAt: "2026-10-10T00:00:00Z" }
    const rows = Doc.salesTaxRows("2026-10", ctx([inv("a", "691001-01-001-0002", "paid", "2026-10-05"), inv("b", "690930-02-001-0001", "paid", "2026-10-02", "b2")], [cn, { ...cn, id: "x", status: "pending_approval" }]))
    expect(rows.find((r) => r.number.startsWith("CN"))).toMatchObject({ amount: -400, ref: "691001-01-001-0002" })
    expect(rows).toHaveLength(3)
    expect(Doc.salesTaxTotals(rows)).toEqual({ total: 1600, byBusiness: [{ business: "liclass", amount: 1000 }, { business: "nockacademy", amount: 600 }] })
  })
})

describe("leave with / without quota, teacher leave (owner 2026-09-30)", () => {
  const k = klass({ id: "k1", weekday: 2 })
  const sess = (id: string, date: string, p: Partial<Session> = {}): Session => ({ id, branchId: "b1", classId: "k1", subject: "Maths", date, start: "10:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: ["a"], trial: false, customized: false, cancelled: false, ...p })
  const sessions = [sess("s1", "2026-10-06"), sess("s2", "2026-10-13"), sess("s3", "2026-10-20"), sess("s4", "2026-10-27")]
  const e: Entitlement = { id: "e", studentId: "a", courseId: "c1", subjects: ["Maths"], classIds: ["k1"], invoiceId: "i", kind: "subscription", from: "2026-10-01", to: "2026-10-31", sessionsTotal: 4 } // quota 1
  const ctx = (attendance: Attendance[], ss = sessions) => ({ sessions: ss, attendance, classes: [k], holidays: [] })
  const leave = (sessionId: string, noQuota?: boolean): Attendance => ({ sessionId, studentId: "a", status: "leave", markedBy: "t1", markedAt: "", noQuota })

  it("leave without quota never uses the quota but still extends the package", () => {
    const att = [leave("s1", true), leave("s2")]
    expect(leavesUsed(e, sessions, att)).toBe(1)
    expect(leaveLedger(e, ctx(att)).map((l) => [l.sessionId, l.quota, !!l.noQuota])).toEqual([["s1", false, true], ["s2", true, false]])
    // both extend: 31 Oct → two more Tuesdays
    expect(resolveEntitlements([e], [], ctx(att))[0].to).toBe("2026-11-10")
    // a second quota leave after the quota is gone adds nothing
    expect(resolveEntitlements([e], [], ctx([leave("s1"), leave("s2")]))[0].to).toBe("2026-11-03")
  })

  it("a leave for N sessions takes this one and the next ones of the package's classes, skipping cancelled", () => {
    const k2 = klass({ id: "k2", weekday: 4 })
    const ss = [...sessions, sess("t1", "2026-10-08", { classId: "k2" }), sess("t2", "2026-10-15", { classId: "k2", cancelled: true }), sess("x", "2026-10-09", { classId: "other" })]
    expect(leaveRunSessions("a", ss[0], ss, ["k1", "k2"], 3).map((x) => x.id)).toEqual(["s1", "t1", "s2"])
    expect(leaveRunSessions("a", ss[0], ss, ["k1"], 10).map((x) => x.id)).toEqual(["s1", "s2", "s3", "s4"])
    expect(leaveRunSessions("a", ss[0], ss, ["k1"], 0)).toEqual([])
    void k2
  })

  it("a session cancelled because the teacher was on leave (no substitute) extends every student's package", () => {
    const withLeave = sessions.map((x) => (x.id === "s2" ? { ...x, cancelled: true, teacherLeave: { teacherId: "t1", reason: "ป่วย", substituteId: null, by: "adm", at: "" } } : x))
    expect(teacherLeaveCancels(e, withLeave).map((x) => x.id)).toEqual(["s2"])
    expect(resolveEntitlements([e], [], ctx([], withLeave))[0].to).toBe("2026-11-03")
    // with a substitute nothing changes
    const sub = sessions.map((x) => (x.id === "s2" ? { ...x, teacherLeave: { teacherId: "t1", reason: "ป่วย", substituteId: "t2", by: "adm", at: "" } } : x))
    expect(teacherLeaveCancels(e, sub)).toEqual([])
  })
})

describe("Class blocks per branch / weekday / date (owner 2026-10-01)", () => {
  const b2 = (s: string, e: string) => ({ start: s, end: e })
  const wkday = [b2("13:00", "15:00"), b2("15:00", "17:00")]
  const wkend = [b2("09:00", "11:00")]
  const base = {
    specialPeriods: [] as Branch["specialPeriods"],
    blockDays: {} as NonNullable<Branch["blockDays"]>,
    blockPlans: [{ from: "2020-01-01", byDay: { 1: wkday, 2: wkday, 3: wkday, 4: wkday, 5: wkday, 6: wkend, 0: wkend } }],
  }
  // 2026-10-05 = Monday, 2026-10-10 = Saturday
  it("uses the weekday plan, a one-off day wins over it", () => {
    expect(Sch.blocksOn(base, "2026-10-05")).toEqual(wkday)
    expect(Sch.blocksOn(base, "2026-10-10")).toEqual(wkend)
    const r = Sch.applyBlocks(base, "2026-10-05", [b2("14:00", "16:00")], "day", "same")
    const nb = { ...base, ...r }
    expect(Sch.blocksOn(nb, "2026-10-05")).toEqual([b2("14:00", "16:00")])
    expect(Sch.blocksOn(nb, "2026-10-12")).toEqual(wkday)
  })
  it("'following' with Mon–Fri starts a new plan from that date; earlier dates keep the old blocks", () => {
    const nb = { ...base, ...Sch.applyBlocks(base, "2026-10-05", [b2("16:00", "18:00")], "following", "weekdays") }
    expect(Sch.blocksOn(nb, "2026-10-01")).toEqual(wkday)
    expect(Sch.blocksOn(nb, "2026-10-08")).toEqual([b2("16:00", "18:00")])
    expect(Sch.blocksOn(nb, "2026-10-10")).toEqual(wkend)
    const reach = Sch.blockChangeReaches(base, "2026-10-05", "following", "weekdays")
    expect([reach("2026-10-04"), reach("2026-10-09"), reach("2026-10-10")]).toEqual([false, true, false])
  })
  it("inside a special period the change stays in the period; higher priority period's blocks win", () => {
    const sp = (id: string, priority: "high" | "low", blocks?: Record<number, { start: string; end: string }[]>) =>
      ({ id, name: id, from: "2026-10-01", to: "2026-10-31", hours: {}, active: true, priority, blocks }) as unknown as Branch["specialPeriods"][number]
    const withP = { ...base, specialPeriods: [sp("low", "low", { 1: [b2("08:00", "10:00")] }), sp("high", "high")] }
    // the high one has no own blocks for Monday → the next period's blocks
    expect(Sch.blocksOn(withP, "2026-10-05")).toEqual([b2("08:00", "10:00")])
    const r = Sch.applyBlocks(withP, "2026-10-05", [b2("10:00", "12:00")], "following", "same")
    expect(r.periodName).toBe("high")
    const nb = { ...withP, ...r }
    expect(Sch.blocksOn(nb, "2026-10-12")).toEqual([b2("10:00", "12:00")])
    expect(Sch.blocksOn(nb, "2026-11-02")).toEqual(wkday)
    expect(Sch.blocksOn({ ...nb, specialPeriods: nb.specialPeriods.map((p) => ({ ...p, active: false })) }, "2026-10-12")).toEqual(wkday)
  })
  it("validates overlaps and end-before-start; maps moved blocks by position", () => {
    expect(Sch.validateBlocks([b2("13:00", "15:00"), b2("14:00", "16:00")])).toMatch(/ทับ/)
    expect(Sch.validateBlocks([b2("15:00", "13:00")])).toMatch(/หลังเวลาเริ่ม/)
    expect(Sch.validateBlocks(wkday)).toBeNull()
    expect(Sch.blockShifts(wkday, [b2("13:00", "15:00"), b2("15:30", "17:30")])).toEqual([{ from: b2("15:00", "17:00"), to: b2("15:30", "17:30") }])
    expect(Sch.blockFor(wkday, "14:30")).toEqual(b2("13:00", "15:00"))
    const moved = [b2("13:00", "15:00"), b2("15:30", "17:30")]
    expect(Sch.shiftInBlock("15:00", 120, wkday, moved)).toEqual({ start: "15:30", minutes: 120 })
    expect(Sch.shiftInBlock("16:00", 60, wkday, moved)).toEqual({ start: "16:30", minutes: 60 })
    expect(Sch.shiftInBlock("15:00", 120, wkday, [b2("13:00", "15:00"), b2("15:00", "16:30")])).toEqual({ start: "15:00", minutes: 90 })
    expect(Sch.shiftInBlock("13:30", 60, wkday, moved)).toBeNull()
    expect(Sch.blockFor(wkday, "17:00")).toBeNull()
  })
})

describe("Special-period classes (owner 2026-10-01)", () => {
  const period = { id: "sp1", name: "Summer", from: "2026-10-05", to: "2026-10-25", hours: {}, active: true, priority: "high" } as unknown as Branch["specialPeriods"][number]
  const branch = { id: "b1", specialPeriods: [period] } as unknown as Branch
  const special = { id: "k1", branchId: "b1", periodId: "sp1", weekday: 1, startDate: "2026-10-05", kind: "learning", start: "09:00", minutes: 120, studentIds: ["s1"], coTeacherIds: [], active: true } as unknown as Klass
  const regular = { ...special, id: "k2", periodId: undefined } as Klass
  it("a special class runs only inside its period", () => {
    const made = generateSessions(special, [], () => Math.random().toString(), 8, period.to)
    expect(made.map((x) => x.date)).toEqual(["2026-10-05", "2026-10-12", "2026-10-19"])
  })
  it("pauses special sessions when the period is off, regular ones only when the period pauses them; both come back", () => {
    const ses = [
      { ...generateSessions(special, [], () => "a", 1)[0], id: "a", date: "2026-10-12" },
      { ...generateSessions(regular, [], () => "b", 1)[0], id: "b", date: "2026-10-12" },
    ]
    const off = { ...branch, specialPeriods: [{ ...period, active: false }] } as Branch
    let r = Sch.syncPeriodSessions(ses, [special, regular], off, "2026-10-01")
    expect(r.sessions.map((x) => x.cancelled)).toEqual([true, false])
    expect(r.sessions[0].pausedBy).toBe("sp1")
    r = Sch.syncPeriodSessions(r.sessions, [special, regular], { ...branch, specialPeriods: [{ ...period, pauseRegular: true }] } as Branch, "2026-10-01")
    expect(r.sessions.map((x) => x.cancelled)).toEqual([false, true])
    expect(r.restored).toBe(1)
    r = Sch.syncPeriodSessions(r.sessions, [special, regular], branch, "2026-10-01")
    expect(r.sessions.map((x) => x.cancelled)).toEqual([false, false])
    // past sessions are never touched
    expect(Sch.syncPeriodSessions(ses, [special, regular], off, "2026-10-20").paused).toBe(0)
  })
  it("lists special classes with students before switching a period off", () => {
    expect(Sch.periodClassesWithStudents("sp1", [special, regular]).map((k) => k.id)).toEqual(["k1"])
  })
  it("owner 2026-10-09: a longer period adds the missing sessions, a shorter one lists the booked sessions it cancels", () => {
    let n = 0
    const have = generateSessions(special, [], () => `x${n++}`, 8, period.to)
    const longer = { ...branch, specialPeriods: [{ ...period, to: "2026-11-08" }] } as Branch
    expect(Sch.fillPeriodClasses(have, [special], longer, [], "2026-10-01", () => "new").map((x) => x.date)).toEqual(["2026-10-26", "2026-11-02"])
    expect(Sch.fillPeriodClasses(have, [special], branch, [], "2026-10-01", () => "new")).toEqual([])
    const cut = Sch.periodShrinkImpact(period, { ...period, to: "2026-10-12" }, [special], have, "2026-10-01")
    expect(cut.map((x) => x.date)).toEqual(["2026-10-19"])
  })
  it("owner 2026-10-09: regular classes stopped by the school extend packages — another cause does not", () => {
    const ses = [{ ...generateSessions(regular, [], () => "b", 1)[0], id: "b", date: "2026-10-12" }]
    const school = Sch.syncPeriodSessions(ses, [special, regular], { ...branch, specialPeriods: [{ ...period, pauseRegular: true }] } as Branch, "2026-10-01").sessions
    expect(school[0].pausedSchool).toBe(true)
    const other = Sch.syncPeriodSessions(school, [special, regular], { ...branch, specialPeriods: [{ ...period, pauseRegular: true, pauseCause: "other" }] } as Branch, "2026-10-01").sessions
    expect(other[0].pausedSchool).toBeUndefined()
    const e = { studentId: "s1", classIds: ["k2"], subjects: [], from: "2026-10-01", to: "2026-10-31" } as unknown as Entitlement
    expect(schoolPauseCancels(e, school).length).toBe(1)
    expect(schoolPauseCancels(e, other).length).toBe(0)
  })
})

describe("Reports definitions (owner 2026-10-01)", () => {
  it("periods and what they compare with — YTD against the same dates last year", () => {
    expect(Rep.periodRange("ytd", "2026-10-01")).toEqual({ from: "2026-01-01", to: "2026-10-01" })
    expect(Rep.compareRange("ytd", { from: "2026-01-01", to: "2026-10-01" })).toEqual({ from: "2025-01-01", to: "2025-10-01" })
    expect(Rep.periodRange("week", "2026-10-01")).toEqual({ from: "2026-09-25", to: "2026-10-01" })
    expect(Rep.compareRange("week", { from: "2026-09-25", to: "2026-10-01" })).toEqual({ from: "2026-09-18", to: "2026-09-24" })
  })
  it("no % change when there is no data to compare with", () => {
    expect(Rep.change(150, 100)).toBe(50)
    expect(Rep.change(150, 0)).toBeNull()
    expect(Rep.change(150, 10, { from: "2025-01-01", to: "2025-10-01" }, "2025-07-01")).toBeNull()
    expect(Rep.change(150, 100, { from: "2025-08-01", to: "2025-10-01" }, "2025-07-01")).toBe(50)
  })
  const row = (studentId: string, date: string, amount: number, subjects = ["คณิต"], packageKey = "1m"): Rep.RevenueRow =>
    ({ date, branchId: "b1", studentId, invoiceId: `i-${studentId}-${date}`, tuition: amount, bus: 0, advance: 0, book: 0, total: amount, lines: [{ courseId: "c", subjects, amount, packageKey, grade: "ป.5", units: 1 }] })
  it("new = first paid invoice ever (never imported students); lost 30 days after the last package; back = returning", () => {
    const students = [{ id: "a", branchId: "b1" }, { id: "b", branchId: "b1", imported: { at: "2025-01-01", source: "ระบบเดิม" } }]
    const ents = [
      { studentId: "a", from: "2026-01-01", to: "2026-01-31" }, { studentId: "a", from: "2026-02-01", to: "2026-02-28" },
      { studentId: "a", from: "2026-05-01", to: "2026-05-31" }, { studentId: "b", from: "2026-01-01", to: "2026-01-31" },
    ]
    const ev = Rep.studentEvents({ students, entitlements: ents, rows: [row("a", "2026-01-01", 4000), row("b", "2026-01-02", 4000)], today: "2026-10-01" })
    const of = (sid: string) => ev.filter((e) => e.studentId === sid).map((e) => `${e.kind}@${e.date}`)
    expect(of("a")).toEqual(["new@2026-01-01", "renewed@2026-02-01", "lost@2026-03-30", "returning@2026-05-01", "lost@2026-06-30"])
    expect(of("b")).toEqual(["lost@2026-03-02"])
    expect(Rep.renewalRate(ev, { from: "2026-01-01", to: "2026-12-31" })).toBeCloseTo(1 / 4)
  })
  it("multi-subject courses split evenly; packages show volume and value", () => {
    const r = { from: "2026-01-01", to: "2026-12-31" }
    const rows = [row("a", "2026-03-01", 6000, ["คณิต", "อังกฤษ"]), row("b", "2026-03-02", 3000, ["คณิต"], "12h")]
    expect(Rep.revenueBySubject(rows, r)).toEqual([{ subject: "คณิต", amount: 6000, share: 6000 / 9000 }, { subject: "อังกฤษ", amount: 3000, share: 3000 / 9000 }])
    expect(Rep.packageMix(rows, r).map((x) => [x.key, x.units, x.amount])).toEqual([["12h", 1, 3000], ["1m", 1, 6000]])
  })
  it("attendance rate = present ÷ (present + leave), cancelled sessions left out", () => {
    const sessions = [{ id: "s1", date: "2026-09-01", cancelled: false }, { id: "s2", date: "2026-09-02", cancelled: true }]
    const att = [{ sessionId: "s1", status: "present" as const }, { sessionId: "s1", status: "leave" as const }, { sessionId: "s2", status: "present" as const }]
    expect(Rep.attendanceRate(sessions, att, { from: "2026-09-01", to: "2026-09-30" }).rate).toBe(0.5)
  })
  it("owner 2026-10-06: needsAttention flags students with no family, and that family's missing address/LINE — archived students aren't chased", () => {
    const base = {
      today: "2026-10-06", now: new Date("2026-10-06T10:00:00"), rows: [], range: { from: "2026-10-06", to: "2026-10-06" }, prevRange: { from: "2026-10-05", to: "2026-10-05" },
      invoices: [], entitlements: [], attendance: [], sessions: [], classes: [], leads: [],
      activeNow: 0, activeBefore: 0, pendingSummaries: 0, conflicts: 0,
    }
    const students = [
      { id: "s1", familyId: null, archived: undefined },
      { id: "s2", familyId: "f1", archived: undefined },
      { id: "s3", familyId: "f2", archived: { at: "2026-01-01", by: "u1", reason: "ออกแล้ว" } },
    ]
    const families = [{ id: "f1", parents: [{ name: "a", phone: "0812345678", lineLinked: false, primary: true }], address: undefined, postcode: undefined, lineUserId: undefined }]
    const out = Rep.needsAttention({ ...base, students, families })
    const by = (key: string) => out.find((x) => x.key === key)
    expect(by("no_family")?.count).toBe(1) // s1 only — s3 is archived, no need to chase
    expect(by("no_address")?.count).toBe(1)
    expect(by("no_line")?.count).toBe(1)
  })
})

describe("Reports R2 — attendance + operations (owner 2026-10-01)", () => {
  const r = { from: "2026-09-01", to: "2026-09-30" }
  const ses = (id: string, extra: Partial<Session> = {}) => ({ id, branchId: "b1", classId: null, subject: "คณิต", date: "2026-09-10", start: "10:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: ["a", "b"], trial: false, customized: false, cancelled: false, ...extra }) as Session
  it("attendance by key and frequent leavers", () => {
    const sessions = [ses("s1"), ses("s2", { subject: "อังกฤษ" }), ses("s3", { cancelled: true })]
    const att = [
      { sessionId: "s1", studentId: "a", status: "present" as const }, { sessionId: "s1", studentId: "b", status: "leave" as const, noQuota: true },
      { sessionId: "s2", studentId: "a", status: "present" as const }, { sessionId: "s2", studentId: "b", status: "leave" as const },
      { sessionId: "s3", studentId: "b", status: "leave" as const },
    ]
    const by = Rep.attendanceBy(sessions, att, r, (s) => s.subject)
    expect(by.find((x) => x.key === "คณิต")).toMatchObject({ present: 1, leave: 1, noQuota: 1, rate: 0.5 })
    expect(Rep.frequentLeavers(sessions, att, r).map((x) => [x.studentId, x.leave])).toEqual([["b", 2]])
  })
  it("teacher stats count only taught sessions; summary on time vs deadline", () => {
    const sessions = [ses("s1"), ses("s2", { date: "2026-09-20", teacherLeave: { teacherId: "t2", substituteId: "t1", reason: "ป่วย" } } as Partial<Session>), ses("s9", { date: "2026-09-29" })]
    const summaries = [
      { sessionId: "s1", status: "sent", history: [{ at: "2026-09-10T12:00:00", action: "submit" }] },
      { sessionId: "s2", status: "sent", history: [{ at: "2026-09-23T12:00:00", action: "submit" }] },
    ]
    const st = Rep.teacherStats({ sessions, attendance: [], summaries, range: r, now: new Date("2026-09-25T00:00:00"), deadlineHours: 24 })
    const t1 = st.find((x) => x.teacherId === "t1")!
    expect([t1.sessions, t1.minutes, t1.coverFor, t1.unmarked, t1.summariesOnTime]).toEqual([2, 120, 1, 2, 0.5])
    expect(st.find((x) => x.teacherId === "t2")!.awaySessions).toBe(1)
  })
  it("room use = booked ÷ open minutes from go-live; class fill vs suggested size", () => {
    const branch = { id: "b1", rooms: [{ id: "r1", name: "ห้อง 1" }] } as unknown as Branch
    const u = Rep.roomUtilization(branch, [ses("s1", { minutes: 120 })], r, { since: "2026-09-10", closed: (d) => d === "2026-09-11", hoursOn: (d) => (d <= "2026-09-12" ? { open: "09:00", close: "19:00" } : null) })
    expect(u[0]).toMatchObject({ booked: 120, open: 1200, rate: 0.1 })
    const fill = Rep.classFill([{ id: "k", name: "k", branchId: "b1", active: true, kind: "learning", type: "single", studentIds: ["a", "b", "c", "d"], teacherId: null }], { single: 3, group: 6 })
    expect(fill[0].fill).toBeCloseTo(4 / 3)
  })
})

describe("Reports R3 — CRM, cohort, forecast (owner 2026-10-01)", () => {
  const lead = (stage: Lead["stage"], extra: Partial<Lead> = {}) => ({ stage, createdAt: "2026-09-05T10:00:00.000Z", source: "line", convertedStudentId: null, ...extra }) as Lead
  it("funnel counts every step a lead reached; archived ones at the step they stopped", () => {
    const leads = [lead("new"), lead("tested"), lead("archived", { archivedFrom: "trialed" }), lead("enrolled", { convertedStudentId: "a" })]
    const f = Rep.leadFunnel(leads, { from: "2026-09-01", to: "2026-09-30" })
    expect(f.map((s) => s.count)).toEqual([4, 3, 3, 2, 1, 1])
    expect(Rep.lostLeads(leads, { from: "2026-09-01", to: "2026-09-30" }).find((x) => x.key === "trial")!.count).toBe(1)
  })
  it("cohort: % of the group still studying N months after joining; future months empty", () => {
    const rows = [{ date: "2026-06-10", branchId: "b1", studentId: "a", invoiceId: "i1", tuition: 1, bus: 0, advance: 0, book: 0, total: 1, lines: [] }, { date: "2026-06-12", branchId: "b1", studentId: "b", invoiceId: "i2", tuition: 1, bus: 0, advance: 0, book: 0, total: 1, lines: [] }] as Rep.RevenueRow[]
    const ents = [{ studentId: "a", from: "2026-06-10", to: "2026-09-30" }, { studentId: "b", from: "2026-06-12", to: "2026-07-11" }]
    const c = Rep.cohortRetention({ students: [{ id: "a", branchId: "b1" }, { id: "b", branchId: "b1" }], entitlements: ents, rows, today: "2026-10-01", groupOf: () => "g" })[0]
    expect(c.cells.slice(0, 5)).toEqual([1, 0.5, 0.5, 0.5, null])
  })
  it("forecast: renewals at the rate, compounding; open invoices in full", () => {
    const rows = [{ date: "2026-09-01", branchId: "b1", studentId: "a", invoiceId: "i1", tuition: 4000, bus: 0, advance: 0, book: 0, total: 4000, lines: [{ courseId: "c", subjects: [], amount: 4000, packageKey: "1m", grade: "", units: 1 }] }] as Rep.RevenueRow[]
    const f = Rep.forecastRevenue({ today: "2026-10-01", until: "2026-12-31", renewal: 0.5, entitlements: [{ studentId: "a", invoiceId: "i1", courseId: "c", from: "2026-09-01", to: "2026-09-30" }], rows, openInvoices: [{ studentId: "z", amount: 1000, date: "2026-10-02" }] })
    // a 30-day package: renews 1 Oct (×0.5) and again 31 Oct (×0.25), then 30 Nov (×0.125)
    expect(f.get("2026-10")).toEqual({ renewals: 3000, open: 1000 })
    expect(f.get("2026-11")!.renewals).toBe(500)
  })
})

describe("Lead follow-ups + close form (owner 2026-10-05)", () => {
  const base = { createdAt: "2026-09-01T09:00:00.000Z", notes: [] as Lead["notes"] }
  const up = (at: string, result: LeadFollowUpT["result"], channel: LeadFollowUpT["channel"] = "call") => ({ id: at, at, by: "u", channel, result })
  type LeadFollowUpT = NonNullable<Lead["followUps"]>[number]
  it("counts tries since they last answered; suggests closing after 3 misses or a wrong number", () => {
    const now = new Date("2026-09-20T09:00:00.000Z")
    const a = Loss.followUpState({ ...base, followUps: [up("2026-09-02T09:00:00.000Z", "talked"), up("2026-09-10T09:00:00.000Z", "no_answer"), up("2026-09-12T09:00:00.000Z", "no_reply", "line")] }, now)
    expect([a.tries, a.silentDays, a.suggestClose]).toEqual([2, 18, true])
    const b = Loss.followUpState({ ...base, followUps: [up("2026-09-19T09:00:00.000Z", "replied", "line")] }, now)
    expect([b.tries, b.suggestClose]).toEqual([0, false])
    expect(Loss.followUpState({ ...base, followUps: [up("2026-09-19T09:00:00.000Z", "wrong_number")] }, now).suggestClose).toBe(true)
  })
  it("reasons depend on the step; competitor / other need details", () => {
    expect(Loss.reasonsForLead("new", undefined)[0].contactOnly).toBe(true)
    // "couldn't reach" is there at every step (a lead can go silent after the test) — last when they did talk, first when quiet
    expect(Loss.reasonsForLead("trialed", undefined).at(-1)!.contactOnly).toBe(true)
    expect(Loss.reasonsForLead("trialed", undefined, true)[0].id).toBe("lr_unreachable")
    expect(Loss.reasonsForLead("trialed", undefined).some((r) => r.for === "student")).toBe(false)
    expect(Loss.validateLeadLost({ stage: "trialed", reasonId: "lr_competitor", otherReasonIds: [] }, undefined)).toMatch(/ไปเรียนที่ไหน/)
    expect(Loss.validateLeadLost({ stage: "trialed", reasonId: "lr_price", otherReasonIds: [] }, undefined)).toBeNull()
    expect(Loss.followUpDue([{ stage: "archived", lost: { stage: "new", reasonId: "x", otherReasonIds: [], at: "", by: "", followUpOn: "2026-09-30" } }], "2026-10-01")).toHaveLength(1)
  })
})

describe("Student exit form (owner 2026-10-05)", () => {
  const ans = (reasonId: string, nps: number | null, comeBack: "yes" | "maybe" | "no", teacher: number | null) =>
    ({ reasonId, otherReasonIds: ["lr_price"], scores: { teacher, content: null, admin: 4, value: 3 }, comeBack, nps, comment: nps === 10 ? "ดีมาก" : "", contactOk: true, lang: "th" as const })
  const closed = (answers: ReturnType<typeof ans> | undefined, at = "2026-09-10T10:00:00.000Z") =>
    ({ exit: { status: "closed" as const, lastDate: "2026-09-05", sentAt: at, sentBy: "u", reasonId: answers?.reasonId ?? "lr_moved", otherReasonIds: answers?.otherReasonIds ?? [], noReply: !answers, closedAt: at, answers } })
  it("sums reasons, scores, come-back and NPS from closed exits in the period", () => {
    const e = Rep.exitSummary([closed(ans("lr_schedule", 10, "yes", 5)), closed(ans("lr_schedule", 3, "no", 3)), closed(undefined), closed(ans("lr_price", 9, "maybe", null), "2026-08-01T00:00:00.000Z")], { from: "2026-09-01", to: "2026-09-30" })
    expect([e.total, e.answered, e.noReply]).toEqual([3, 2, 1])
    expect(e.reasons[0]).toEqual({ id: "lr_schedule", main: 2, other: 0 })
    expect(e.reasons.find((r) => r.id === "lr_price")).toEqual({ id: "lr_price", main: 0, other: 2 })
    expect(e.scores.teacher).toBe(4)
    expect(e.nps).toBe(0) // one promoter (10), one detractor (3)
    expect(e.comeBack).toEqual({ yes: 1, maybe: 0, no: 1 })
  })
  it("closing needs a reason and a last day; student reasons exclude lead-only ones", () => {
    expect(Loss.validateExitClose({ reasonId: "", otherReasonIds: [], money: "none", lastDate: "2026-09-05" }, undefined)).toMatch(/เหตุผล/)
    expect(Loss.validateExitClose({ reasonId: "lr_moved", otherReasonIds: [], money: "none", lastDate: "" }, undefined)).toMatch(/วันเรียนวันสุดท้าย/)
    expect(Loss.reasonsForStudent(undefined).some((r) => r.contactOnly || r.for === "lead")).toBe(false)
  })
})

describe("Enroll-now leads in the funnel (owner 2026-10-05)", () => {
  it("a direct lead skips the Test/Trial steps but counts as contacted / payment / enrolled", () => {
    const at = "2026-09-05T10:00:00.000Z"
    const f = Rep.leadFunnel([{ stage: "enrolled", createdAt: at, direct: true }, { stage: "enrolled", createdAt: at }] as Lead[], { from: "2026-09-01", to: "2026-09-30" })
    expect(f.map((s) => s.count)).toEqual([2, 2, 1, 1, 2, 2])
    expect(f.find((s) => s.key === "payment")!.direct).toBe(1)
  })
})

describe("Yearly parent survey (owner 2026-10-05)", () => {
  const resp = (id: string, nps: number | null, cont: "yes" | "maybe" | "no", teacher: number | null, extra: Partial<SurveyResponseT> = {}): SurveyResponseT => ({
    id, token: id, campaignId: "sv", year: 2026, familyId: id, branchId: "b1", teachers: { [`k${id}`]: ["t1"] }, submittedAt: "2026-09-20T10:00:00.000Z",
    answers: { nps, overall: 4, children: [{ studentId: `k${id}`, teacher, progress: 3, level: 5 }], service: { admin: 5, summary: 2, schedule: 3, place: 4, bus: null, value: 4 }, continueNext: cont, wants: ["วิทย์"], praise: "", improve: "", lang: "th" },
    ...extra,
  })
  type SurveyResponseT = import("../types").SurveyResponse
  it("NPS, response rate, weakest topic first, teacher averages", () => {
    const rs = [resp("a", 10, "yes", 5), resp("b", 9, "yes", 4), resp("c", 3, "no", 2)]
    const s = Survey.summarize(rs, 6)
    expect([s.nps, s.rate, s.unhappy]).toEqual([33, 0.5, 1])
    expect(Survey.topicRanking(s)[0].key).toBe("summary")
    expect(Survey.teacherScores(rs)).toEqual([{ teacherId: "t1", score: 11 / 3, ratings: 3 }])
    expect(Survey.wantsCount(rs)).toEqual([{ want: "วิทย์", count: 3 }])
  })
  it("unhappy families to call within 3 days; reminder once after 7 days to those who haven't answered", () => {
    const rs = [resp("c", 5, "yes", 3), resp("d", 8, "no", 4), resp("e", 2, "maybe", 1, { followUp: { at: "", by: "u", note: "โทรแล้ว" } })]
    const call = Survey.toCall(rs, "2026-09-24")
    expect(call.map((x) => [x.r.id, x.overdue])).toEqual([["c", true], ["d", true]])
    const c = { id: "sv", year: 2026, from: "2026-09-15", to: "2026-10-15", sentAt: "2026-09-15T09:00:00.000Z", sentBy: "u", recipients: ["c", "x"].map((f) => ({ familyId: f, branchId: "b1", token: f, viaLine: true })) }
    expect(Survey.notAnswered(c, rs).map((x) => x.familyId)).toEqual(["x"])
    expect([Survey.canRemind(c, "2026-09-21"), Survey.canRemind(c, "2026-09-22"), Survey.canRemind({ ...c, remindedAt: "x" }, "2026-09-25")]).toEqual([false, true, false])
  })
})

// ---------------- Reports › สรุป (owner 2026-10-05) ----------------
import * as Ins from "./insights"

describe("summary insights", () => {
  const base: Ins.InsightInput = {
    periodLabel: "ตั้งแต่ต้นปี", vsLabel: "เทียบช่วงเดียวกันปีที่แล้ว", comparable: true, periodMonths: 9,
    revenue: { now: 900_000, prev: 1_080_000 },
    months: [
      { label: "ส.ค.", now: 120_000, last: 115_000, newNow: 10, newLast: 9, lostNow: 4, lostLast: 4 },
      { label: "ก.ย.", now: 60_000, last: 140_000, newNow: 2, newLast: 10, lostNow: 9, lostLast: 3 },
    ],
    flow: { newNow: 40, newPrev: 55, lostNow: 30, lostPrev: 20, returning: 3, renewal: 0.7, renewalPrev: 0.82, active: 150 },
    perStudentMonth: 1_340,
    exitReasons: [{ label: "ตารางเวลาไม่ลงตัว", count: 8 }, { label: "ราคา", count: 3 }],
    leadLostReasons: [{ label: "ติดต่อไม่ได้ / ไม่รับสาย", count: 20 }, { label: "ราคา", count: 5 }],
    leadLostStages: [{ label: "นัด Test / Trial", count: 12 }],
    wantedTimes: [{ label: "หลังเลิกเรียน 15:00–17:00", count: 14 }, { label: "เสาร์เช้า 9–11", count: 3 }],
    competitors: [{ label: "ไม่ทราบ", count: 9 }, { label: "ติวเตอร์ที่บ้าน", count: 4 }],
    sales: { leads: 100, enrolled: 20, conversion: 0.2, open: 15 },
    attendance: { rate: 0.85, prevRate: 0.86, frequentLeavers: 2 },
    teaching: { pendingWork: 3, lowFill: 1, overFill: 0 },
    branchLoad: [
      { label: "สีลม", byWeekday: [0, 9, 9, 9, 9, 9, 20] },
      { label: "บางนา", byWeekday: [0, 5, 5, 5, 1, 1, 20] },
      { label: "อารีย์", byWeekday: [0, 6, 6, 6, 2, 2, 20] },
    ],
  }

  it("explains a revenue drop with the worst month, its new students, churn and the wanted time", () => {
    const rev = Ins.buildInsights(base).insights.find((x) => x.area === "revenue")!
    expect(rev.tone).toBe("bad")
    expect(rev.title).toContain("ลดลง 17%")
    expect(rev.facts[0]).toContain("ก.ย.")
    expect(rev.causes.some((c) => c.includes("นักเรียนใหม่ 2 คน") && c.includes("80%"))).toBe(true)
    expect(rev.causes.some((c) => c.includes("Churn เพิ่มขึ้น 50%"))).toBe(true)
    expect(rev.causes.some((c) => c.includes("หลังเลิกเรียน 15:00–17:00"))).toBe(true)
  })

  it("suggests a pilot on the quietest weekdays at the quietest branches, sized in students", () => {
    const rev = Ins.buildInsights(base).insights.find((x) => x.area === "revenue")!
    expect(rev.actions[0]).toContain("พฤหัส และ ศุกร์")
    expect(rev.actions[0]).toContain("บางนา และ อารีย์")
    // (1.08M − 0.9M) / 9 months = 20K a month ÷ 1,340 per student ≈ 15 students
    expect(rev.actions.some((a) => a.includes("ประมาณ 15 คน"))).toBe(true)
  })

  it("uses the day a wanted time names", () => {
    expect(Ins.pilotPlan(base.branchLoad, "เสาร์เช้า 9–11").days).toEqual(["เสาร์"])
    expect(Ins.daysIn("หลังเลิกเรียน 17:30–19:00")).toEqual([])
  })

  it("does not claim a change when the earlier period has no data — falls back to months that have both years", () => {
    const byMonth = Ins.buildInsights({ ...base, comparable: false }).insights.find((x) => x.area === "revenue")!
    expect(byMonth.title).toContain("2 เดือนล่าสุดลดลง")
    const students = Ins.buildInsights({ ...base, comparable: false }).insights.find((x) => x.area === "students")!
    expect(students.facts.join(" ")).not.toContain("จากช่วงก่อน")
    const none = Ins.buildInsights({ ...base, comparable: false, months: base.months.map((m) => ({ ...m, last: null })) }).insights.find((x) => x.area === "revenue")!
    expect(none.title).toContain("ยังเทียบปีที่แล้วไม่ได้")
  })

  it("puts problems first and lists their first action as this week's to-do", () => {
    const r = Ins.buildInsights(base)
    expect(r.insights[0].tone).toBe("bad")
    expect(r.headline.length).toBeLessThanOrEqual(3)
    expect(r.insights.find((x) => x.area === "sales")!.actions[0]).toContain("ติดต่อไม่ได้")
  })
})

describe("report periods (owner 2026-10-05)", () => {
  const t = "2026-10-05"
  it("to-date windows start at the month / quarter", () => {
    expect(Rep.periodRange("mtd", t)).toEqual({ from: "2026-10-01", to: t })
    expect(Rep.compareRange("mtd", Rep.periodRange("mtd", t))).toEqual({ from: "2026-09-01", to: "2026-09-05" })
    expect(Rep.periodRange("qtd", "2026-08-20")).toEqual({ from: "2026-07-01", to: "2026-08-20" })
    expect(Rep.compareRange("qtd", { from: "2026-07-01", to: "2026-08-20" })).toEqual({ from: "2026-04-01", to: "2026-05-20" })
  })
  it("YoY / MoM / QoQ use the last complete month or quarter", () => {
    expect(Rep.periodRange("mom", t)).toEqual({ from: "2026-09-01", to: "2026-09-30" })
    expect(Rep.compareRange("mom", { from: "2026-09-01", to: "2026-09-30" })).toEqual({ from: "2026-08-01", to: "2026-08-31" })
    expect(Rep.compareRange("yoy", { from: "2026-09-01", to: "2026-09-30" })).toEqual({ from: "2025-09-01", to: "2025-09-30" })
    expect(Rep.compareRange("yoy", { from: "2026-02-01", to: "2026-02-28" })).toEqual({ from: "2025-02-01", to: "2025-02-28" })
    expect(Rep.periodRange("qoq", t)).toEqual({ from: "2026-07-01", to: "2026-09-30" })
    expect(Rep.compareRange("qoq", { from: "2026-07-01", to: "2026-09-30" })).toEqual({ from: "2026-04-01", to: "2026-06-30" })
  })
  it("a custom range never runs past today and compares with the same length before it", () => {
    expect(Rep.periodRange("custom", t, { from: "2026-09-20", to: "2026-12-31" })).toEqual({ from: "2026-09-20", to: t })
    expect(Rep.periodRange("custom", t, { from: "2026-09-10", to: "2026-09-01" })).toEqual({ from: "2026-09-01", to: "2026-09-10" })
    expect(Rep.compareRange("custom", { from: "2026-09-01", to: "2026-09-10" })).toEqual({ from: "2026-08-22", to: "2026-08-31" })
  })
})

// ---------------- names in Latin letters (owner 2026-10-07) ----------------
import { branchNameEn, romanizeName } from "./romanize"

describe("romanize names", () => {
  it("follows the owner's examples", () => {
    expect(romanizeName("ครอบครัว แสงใจ")).toBe("Sangjai Family")
    expect(romanizeName("ครอบครัวทองชัย")).toBe("Thongchai Family")
    expect(romanizeName("น้องต้น")).toBe("N'Ton")
    expect(romanizeName("ครูแอน")).toBe("T'Ann")
  })
  it("uses the standard spelling for places and branches, unless Settings has an English name", () => {
    expect(romanizeName("กรุงเทพ")).toBe("Bangkok")
    expect(romanizeName("ทองหล่อ")).toBe("Thonglor")
    expect(branchNameEn({ name: "ทองหล่อ" })).toBe("Thonglor")
    expect(branchNameEn({ name: "ทองหล่อ", nameEn: "Thong Lo" })).toBe("Thong Lo")
  })
  it("reads common Thai names", () => {
    expect(romanizeName("สมชาย")).toBe("Somchai")
    expect(romanizeName("กิตติพงษ์")).toBe("Kittiphong")
    expect(romanizeName("รุ่งเรือง")).toBe("Rungrueang")
    expect(romanizeName("แก้วใจ")).toBe("Kaewjai")
    expect(romanizeName("ศรีสุข")).toBe("Srisuk")
    expect(romanizeName("คุณแม่ จันทร์")).toBe("Mom Jan")
  })
  it("keeps subjects, grades and rooms readable inside names", () => {
    expect(romanizeName("คณิต ป.5")).toBe("Math P.5")
    expect(romanizeName("อังกฤษ ม.3")).toBe("English M.3")
    expect(romanizeName("ห้อง 3")).toBe("Room 3")
    expect(romanizeName("Summer English")).toBe("Summer English")
  })
})

// ---------- Reports scope: region / business (owner 2026-10-07) ----------
describe("report scope", () => {
  const list = [
    { id: "tl", brand: "liclass" as const, province: "BKK" }, { id: "bn", brand: "nockacademy" as const, province: "BKK" },
    { id: "sr_l", brand: "liclass" as const, province: "CBR" }, { id: "sr_n", brand: "nockacademy" as const, province: "CBR" }, { id: "pt", brand: "nockacademy" as const, province: "CBR" },
  ]
  it("reads by region, by business, by both, or one branch", () => {
    expect(Rep.scopeBranchIds("all", list)).toHaveLength(5)
    expect(Rep.scopeBranchIds("region:CBR", list)).toEqual(["sr_l", "sr_n", "pt"])
    expect(Rep.scopeBranchIds("biz:liclass", list)).toEqual(["tl", "sr_l"])
    expect(Rep.scopeBranchIds("region:CBR|biz:nockacademy", list)).toEqual(["sr_n", "pt"])
    expect(Rep.scopeBranchIds("bn", list)).toEqual(["bn"])
  })
  it("never shows branches outside what the person may see", () => {
    expect(Rep.scopeBranchIds("nope", list)).toHaveLength(5)
    expect(Rep.scopeBranchIds("region:CBR", list.slice(0, 2))).toEqual(["tl", "bn"])
  })
})

describe("compare regions / business types", () => {
  const f = (id: string, brand: "nockacademy" | "liclass", province: string, revenue: number, revenuePrev: number) => ({ id, brand, province, revenue, revenuePrev, active: 10, newCount: 2, returning: 1, lost: 1, pauses: 0, present: 8, leave: 2 })
  const rows = [f("tl", "liclass", "BKK", 300, 200), f("bn", "nockacademy", "BKK", 500, 500), f("sr", "nockacademy", "CBR", 200, 400)]
  it("adds branches up per region, business, or both, biggest first", () => {
    const r = Rep.groupFigures(rows, "region")
    expect(r.map((g) => [g.key, g.revenue, g.branches])).toEqual([["BKK", 800, 2], ["CBR", 200, 1]])
    expect(r[0].share).toBe(0.8)
    expect(r[1].growth).toBe(-0.5)
    expect(Rep.groupFigures(rows, "biz").map((g) => g.key)).toEqual(["NAS", "LIS"])
    expect(Rep.groupFigures(rows, "both").map((g) => g.key)).toEqual(["BKK · NAS", "BKK · LIS", "CBR · NAS"])
    expect(r[0].attendance).toBe(0.8)
    expect(r[0].net).toBe(4)
  })
})

import { attentionTopics, dailyBrief, focusHref, type Topic } from "./today"

describe("dashboard brief (owner 2026-10-07)", () => {
  const topic = (key: string, count: number, extra: Partial<Topic> = {}): Topic => ({ key, group: "today", title: key, detail: "", count, href: "/x", ...extra })

  it("orders work by what costs most to wait, urgent renewals split out", () => {
    const b = dailyBrief({
      topics: [topic("no_family", 4), topic("summary_approve", 2), topic("renewal", 5, { urgent: 2, href: "/students?status=renewal" }), topic("unmarked", 3), topic("lead_new", 1)],
      trend: [], sessions: [], nowTime: "10:00",
    })
    expect(b.steps.map((s) => s.key)).toEqual(["unmarked", "renewal_urgent", "lead_new", "summary_approve", "renewal"])
    expect(b.steps[1]).toMatchObject({ count: 2, href: "/students?status=renewal&focus=renewal", when: "today" })
    expect(b.more).toBe(1) // no_family left for the board
    expect(b.headline).toContain("งานวันนี้ 8 เรื่อง (ด่วน 5)") // renewal 3 (not urgent) + no_family 4 are not today
  })

  it("topics with nothing to do are not steps", () => {
    const b = dailyBrief({ topics: [topic("unmarked", 0)], trend: [], sessions: [], nowTime: "10:00" })
    expect(b.steps).toEqual([])
    expect(b.headline).toContain("ไม่มีงานค้าง")
  })

  it("notes the free time before the next session, or that one is running", () => {
    const free = dailyBrief({ topics: [topic("unmarked", 1)], trend: [], sessions: [{ start: "16:30", minutes: 90, state: "upcoming" }], nowTime: "14:00" })
    expect(free.notes[0].text).toContain("ว่างอีก 2 ชม. 30 นาที ก่อนคาบ 16:30")
    const live = dailyBrief({ topics: [], trend: [], sessions: [{ start: "14:00", minutes: 90, state: "live" }], nowTime: "14:30" })
    expect(live.notes[0].text).toContain("กำลังเรียน")
    const done = dailyBrief({ topics: [], trend: [], sessions: [{ start: "09:00", minutes: 60, state: "ended" }], nowTime: "18:00" })
    expect(done.notes[0].text).toContain("จบหมดแล้ว")
  })

  it("Need Attention items the dashboard already counts are not repeated; trend items stay out of the board", () => {
    const items = [
      { key: "summaries", group: "teaching" as const, title: "", detail: "", count: 3, href: "/summaries" },
      { key: "revenue_drop", group: "trend" as const, title: "", detail: "", count: 1, href: "/reports" },
      { key: "unpaid", group: "money" as const, title: "", detail: "", count: 0, href: "/billing" },
    ]
    expect(attentionTopics(items).map((t) => t.key)).toEqual(["unpaid"])
  })

  it("focus links keep existing filters", () => {
    expect(focusHref("/billing?filter=pending_approval", "invoice_approve")).toBe("/billing?filter=pending_approval&focus=invoice_approve")
    expect(focusHref("/students", "no_family")).toBe("/students?focus=no_family")
  })
})

import { schoolBreakdown } from "./reports"

describe("schools (owner 2026-10-07)", () => {
  it("counts students per school, most first, blanks apart", () => {
    const b = schoolBreakdown(
      [{ school: "A", branchId: "x" }, { school: "B ", branchId: "y" }, { school: "B", branchId: "z" }, { school: "B", branchId: "y" }, { branchId: "x" }, { school: "  ", branchId: "x" }],
      (id) => (id === "z" ? "CBR" : "BKK"),
    )
    expect(b.rows.map((r) => [r.label, r.value])).toEqual([["B", 3], ["A", 1]])
    expect(b.rows[0].branches).toEqual([{ id: "y", count: 2 }, { id: "z", count: 1 }])
    expect(b.rows[0].regions).toEqual(["BKK", "CBR"])
    expect(b).toMatchObject({ schools: 2, students: 6, unknown: 2 })
  })
})

import { normSchool, schoolKey, searchSchools } from "./schools"

describe("school list search (owner 2026-10-07)", () => {
  const list = [
    { id: "1", name: "โรงเรียนสาธิตจุฬาลงกรณ์มหาวิทยาลัย (ฝ่ายประถม)", p: "BKK", d: "ปทุมวัน", a: "อว." },
    { id: "2", name: "อัสสัมชัญศรีราชา", p: "CBR", d: "ศรีราชา", a: "เอกชน" },
    { id: "3", name: "อัสสัมชัญ", p: "BKK", d: "บางรัก", a: "เอกชน" },
    { id: "4", name: "บ้านอัสสัมชัญ", p: "CBR", d: "เมืองชลบุรี", a: "สพฐ." },
  ]
  it("ignores โรงเรียน / spaces / brackets", () => {
    expect(normSchool("โรงเรียนสาธิต จุฬาฯ")).toBe(normSchool("สาธิตจุฬาฯ"))
    expect(searchSchools(list, "สาธิต จุฬา").map((x) => x.id)).toEqual(["1"])
  })
  it("names starting with the text first, the branch's province before others", () => {
    expect(searchSchools(list, "อัสสัมชัญ", { province: "CBR" }).map((x) => x.id)).toEqual(["2", "3", "4"])
    expect(searchSchools(list, "อัสสัมชัญ", { province: "BKK" }).map((x) => x.id)).toEqual(["3", "2", "4"])
  })
  it("matches the district too", () => {
    expect(searchSchools(list, "ศรีราชา").map((x) => x.id)).toEqual(["2"])
  })
  it("groups by Ministry code, typed names by their normalised form", () => {
    expect(schoolKey({ school: "x", schoolId: "123" })).toBe("123")
    expect(schoolKey({ school: "โรงเรียน ABC " })).toBe(schoolKey({ school: "abc" }))
    expect(schoolKey({})).toBe("")
  })
})

import { schoolsByGroup } from "./reports"

describe("schools by branch / region (owner 2026-10-07)", () => {
  const b = schoolBreakdown(
    [{ school: "A", branchId: "x" }, { school: "A", branchId: "x" }, { school: "A", branchId: "z" }, { school: "B", branchId: "x" }, { school: "C", branchId: "z" }],
    (id) => (id === "z" ? "CBR" : "BKK"),
  )
  it("branch → schools", () => {
    const g = schoolsByGroup(b, (id) => id)
    expect(g.map((x) => [x.key, x.students])).toEqual([["x", 3], ["z", 2]])
    expect(g[0].rows.map((r) => [r.label, r.value])).toEqual([["A", 2], ["B", 1]])
    expect(g[0].top3).toBe(1)
  })
  it("region → schools adds the branches of a region together", () => {
    const g = schoolsByGroup(b, (id) => (id === "z" ? "CBR" : "BKK"))
    expect(g.find((x) => x.key === "CBR")!.rows.map((r) => [r.label, r.value])).toEqual([["A", 1], ["C", 1]])
  })
})

import { defaultLeaveQuota, leaveQuotaFor } from "./settings"
import { leaveQuota, schoolPauseCancels } from "./attendance"

describe("C5 leave quota per package (owner 2026-10-09)", () => {
  it("default: 1 session = 2 hrs, 4 sessions = 1 leave", () => {
    expect(defaultLeaveQuota("hour", 12)).toBe(1)
    expect(defaultLeaveQuota("hour", 24)).toBe(3)
    expect(defaultLeaveQuota("week", 8)).toBeNull()
    expect(defaultLeaveQuota("month", 1, 8)).toBe(2)
  })
  it("the number set in Settings wins, × periods — 0 means no leave", () => {
    const b = { ...branch, leaveQuotas: { hour: { 12: 2 }, month: { 1: 0 } } }
    expect(leaveQuotaFor(b, "hour", 12, 2, 12)).toBe(4)
    expect(leaveQuotaFor(b, "month", 1, 1, 8)).toBe(0)
    expect(leaveQuotaFor(b, "week", 4, 1, 8)).toBe(2)
    expect(leaveQuotaFor(b, "hour", 24, 1, 12)).toBe(3)
  })
  it("a package keeps the quota it was bought with", () => {
    const e = { sessionsTotal: 8, leaveQuota: 0 } as Entitlement
    expect(leaveQuota(e)).toBe(0)
    expect(leaveQuota({ ...e, leaveQuota: undefined })).toBe(2)
  })
})

import { calendarSummary, groupSummaryRows } from "./calendar-summary"

describe("calendar Summary panel (owner 2026-10-09)", () => {
  const mk = (id: string, over: Partial<Session> = {}): Session => ({ id, branchId: "b1", classId: null, subject: "คณิต", date: "2026-10-12", start: "10:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: ["a"], trial: false, customized: false, cancelled: false, ...over })
  const now = new Date(2026, 9, 9, 9, 0)
  const ctx = { branch, classes: [], staff: [teacher], holidays: [], conflicts: [], attendance: [], summaries: [], now }
  it("counts what will happen and lists every problem", () => {
    const sum = calendarSummary([mk("s1"), mk("s2", { teacherId: null, subject: "อังกฤษ" }), mk("s3", { roomId: null }), mk("s4", { cancelled: true })], ctx)
    expect(sum.sessions).toBe(3)
    expect(sum.cancelled).toBe(1)
    expect(sum.issues.find((i) => i.kind === "no_teacher")).toMatchObject({ level: "red", sessionIds: ["s2"] })
    expect(sum.issues.find((i) => i.kind === "no_room")?.sessionIds).toEqual(["s3"])
  })
  it("groups classes by teacher or subject — no teacher goes last", () => {
    const sum = calendarSummary([mk("s1"), mk("s2", { teacherId: null, subject: "อังกฤษ" })], ctx)
    expect(groupSummaryRows(sum.rows, "teacher").map((g) => g.key)).toEqual(["t1", ""])
    expect(groupSummaryRows(sum.rows, "subject").map((g) => g.key).sort()).toEqual(["คณิต", "อังกฤษ"].sort())
  })
})

import { busDaysOf, parentView } from "./parent-view"

describe("parent app v1 (owner 2026-10-09)", () => {
  const now = new Date(2026, 9, 9, 9, 0)
  const ses = (id: string, date: string, over: Partial<Session> = {}): Session => ({ id, branchId: "b1", classId: null, subject: "คณิต", date, start: "10:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: null, studentIds: ["a"], trial: false, customized: false, cancelled: false, ...over })
  const fam = { id: "f1", name: "ครอบครัวสุขใจ", parents: [], lineUserId: "U1" } as unknown as Family
  const kid = { id: "a", familyId: "f1", branchId: "b1", name: "ด.ญ. ใบเตย", nickname: "ใบเตย", grade: "ป.5" } as unknown as Student
  const base = { students: [kid], branches: [branch], classes: [], staff: [teacher], entitlements: [], courses: [], invoices: [], busAddOns: [], now }
  it("shows the next 30 days, only summaries already sent, and attendance so far", () => {
    const sessions = [ses("past", "2026-10-05"), ses("soon", "2026-10-12"), ses("far", "2026-12-01")]
    const v = parentView(fam, { ...base, sessions,
      attendance: [{ sessionId: "past", studentId: "a", status: "present", markedBy: "t1", markedAt: "" }],
      summaries: [
        { id: "x1", sessionId: "past", studentId: "a", text: "ดีมาก", status: "sent", authorId: "t1", lastEditorId: "t1", history: [] },
        { id: "x2", sessionId: "past", studentId: "a", text: "ร่าง", status: "submitted", authorId: "t1", lastEditorId: "t1", history: [] },
      ] as LessonSummary[] })
    const c = v.children[0]
    expect(c.upcoming.map((x) => x.sessionId)).toEqual(["soon"])
    expect(c.summaries.map((x) => x.text)).toEqual(["ดีมาก"])
    expect(c.attendance).toHaveLength(1)
    expect(v.lineUserIds).toEqual(["U1"])
  })
  it("bus days come from paid / sent invoices and extra days — never drafts or void", () => {
    const inv = (status: Invoice["status"], date: string) => ({ studentId: "a", status, bus: [{ date, pickup: true, dropoff: false }] }) as unknown as Invoice
    const m = busDaysOf("a", [inv("paid", "2026-10-12"), inv("draft", "2026-10-13"), inv("void", "2026-10-14")], [{ studentId: "a", date: "2026-10-12", pickup: false, dropoff: true } as BusAddOn])
    expect([...m.entries()]).toEqual([["2026-10-12", { pickup: true, dropoff: true }]])
  })
})

import { rolesAt, staffAt, subjectsAt, withAssignments, worksOn } from "./permissions"

describe("staff roles per branch (owner 2026-10-09)", () => {
  const base = { id: "p", name: "พลอย", nickname: "พลอย", roles: [], branchIds: [], subjects: [], active: true, canLogin: true } as Staff
  const p = withAssignments(base, [
    { branchId: "bn", roles: ["teacher"], subjects: ["อังกฤษ", "คณิต"], weekdays: [1, 2, 3] },
    { branchId: "pp", roles: ["admin", "teacher"], subjects: ["วิทย์"], weekdays: [4, 5] },
  ])
  it("roles, subjects and days follow the branch", () => {
    expect(rolesAt(p, "bn")).toEqual(["teacher"])
    expect(rolesAt(p, "pp").sort()).toEqual(["admin", "teacher"])
    expect(subjectsAt(p, "pp")).toEqual(["วิทย์"])
    expect(worksOn(p, "bn", 1)).toBe(true)
    expect(worksOn(p, "bn", 4)).toBe(false)
    expect(can(staffAt(p, "pp"), "billing.manage")).toBe(true)
    expect(can(staffAt(p, "bn"), "billing.manage")).toBe(false)
  })
  it("flat fields stay the union so older code keeps working; company-wide roles stay everywhere", () => {
    expect(p.branchIds).toEqual(["bn", "pp"])
    expect([...p.subjects].sort()).toEqual(["คณิต", "วิทย์", "อังกฤษ"].sort())
    const am = withAssignments({ ...base, roles: ["area_manager"] }, [{ branchId: "bn", roles: [], subjects: [], weekdays: [] }])
    expect(rolesAt(am, "bn")).toEqual(["area_manager"])
  })
  it("a teacher booked on a day they don't work at that branch is an amber warning, not a block", () => {
    const t = withAssignments({ ...base, id: "t1", nickname: "ครูพลอย" }, [{ branchId: "b1", roles: ["teacher"], subjects: ["คณิต"], weekdays: [3] }])
    const issues = validateClass(klass({ teacherId: "t1" }), { branch, staff: [t], sessions: [], holidays: [] })
    expect(issues.find((i) => i.message.includes("ไม่ได้ทำงาน"))).toMatchObject({ level: "warn", tone: "amber" })
  })
})

import { inBranch, reportBranchIds } from "./permissions"

describe("Area Manager picks branches, Director / Super Admin see all (owner 2026-10-09)", () => {
  const base = { id: "x", name: "x", nickname: "x", branchIds: [], subjects: [], active: true, canLogin: true } as unknown as Staff
  it("area manager only in their branches", () => {
    const am = { ...base, roles: ["area_manager"], areaBranchIds: ["b1", "b2"] } as Staff
    expect(inBranch(am, "b2")).toBe(true)
    expect(inBranch(am, "b3")).toBe(false)
    expect(reportBranchIds(am, [{ id: "b1" }, { id: "b3" }])).toEqual(["b1"])
    expect(validateStaff({ ...am, areaBranchIds: [] }, [])).toContainEqual(expect.objectContaining({ field: "area" }))
  })
  it("director needs no branch", () => {
    const d = { ...base, roles: ["director"] } as Staff
    expect(inBranch(d, "anything")).toBe(true)
    expect(validateStaff(d, []).some((e) => e.field === "branchIds")).toBe(false)
  })
})

import { studentsOfTeacher, teacherWeek } from "./staff-overview"

describe("staff overview — one teacher's week (owner 2026-10-09)", () => {
  const ses = (id: string, date: string, over: Partial<Session> = {}): Session => ({ id, branchId: "b1", classId: null, subject: "คณิต", date, start: "10:00", minutes: 90, teacherId: "t1", coTeacherIds: [], roomId: null, studentIds: ["a", "b"], trial: false, customized: false, cancelled: false, ...over })
  const now = new Date(2026, 9, 9, 12, 0) // Fri 9 Oct
  const sessions = [ses("mon", "2026-10-05"), ses("fri", "2026-10-09", { start: "15:00" }), ses("next", "2026-10-12"), ses("other", "2026-10-06", { teacherId: "t2" })]
  const att = [{ sessionId: "mon", studentId: "a", status: "present" as const, markedBy: "t1", markedAt: "" }, { sessionId: "mon", studentId: "b", status: "absent" as const, markedBy: "t1", markedAt: "" }]
  it("counts this week's sessions and summaries — marked students need one if present, unmarked ones are expected", () => {
    const w = teacherWeek("t1", "2026-10-09", { sessions, attendance: att, summaries: [{ sessionId: "mon", studentId: "a", status: "submitted" }], now })
    expect(w.rows.map((r) => r.session.id)).toEqual(["mon", "fri"])
    expect(w.sessions).toEqual({ total: 2, done: 1, left: 1 })
    expect(w.summaries).toEqual({ total: 3, written: 1, left: 2 })
  })
  it("students in hand = their classes + their sessions ahead", () => {
    expect(studentsOfTeacher("t1", { sessions, classes: [], today: "2026-10-09" }).sort()).toEqual(["a", "b"])
  })
})

describe("Area Manager never sees branches outside their area (owner 2026-10-09)", () => {
  it("no list yet = only the branches they are in, not every branch", () => {
    const am = { id: "a", name: "a", nickname: "a", roles: ["area_manager"], branchIds: ["b1"], subjects: [], active: true, canLogin: true } as Staff
    expect(inBranch(am, "b1")).toBe(true)
    expect(inBranch(am, "b9")).toBe(false)
  })
})

import { isCurrent, periodRange, shiftPeriod } from "./period"

describe("date period — วันนี้ / สัปดาห์นี้ / เดือนนี้ / กำหนดเอง (owner 2026-10-09)", () => {
  it("covers the right days", () => {
    expect(periodRange("day", "2026-10-09")).toEqual({ from: "2026-10-09", to: "2026-10-09" })
    expect(periodRange("week", "2026-10-09")).toEqual({ from: "2026-10-05", to: "2026-10-11" })
    expect(periodRange("month", "2026-10-09")).toEqual({ from: "2026-10-01", to: "2026-10-31" })
  })
  it("moves by one step; a custom range by its own length", () => {
    expect(shiftPeriod("week", "2026-10-09", 1).anchor).toBe("2026-10-16")
    expect(shiftPeriod("month", "2026-10-09", -1).anchor).toBe("2026-09-01")
    expect(shiftPeriod("custom", "2026-10-09", 1, { from: "2026-10-01", to: "2026-10-03" }).custom).toEqual({ from: "2026-10-04", to: "2026-10-06" })
    expect(isCurrent("week", "2026-10-05", "2026-10-09")).toBe(true)
    expect(isCurrent("week", "2026-10-12", "2026-10-09")).toBe(false)
  })
})

import { familyShortName } from "./people"
describe("family name in lists (owner 2026-10-09)", () => {
  it("drops the leading ครอบครัว so names sort by the family name", () => {
    expect(familyShortName("ครอบครัวแก้วงาม")).toBe("แก้วงาม")
    expect(familyShortName("ครอบครัว ใจดี")).toBe("ใจดี")
    expect(familyShortName("Somjai Family")).toBe("Somjai Family")
  })
})
