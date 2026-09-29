// Regression tests: each case reproduces a bug found on Dev staging and proves the rule prevents it.
import { describe, expect, it } from "vitest"
import type { Assessment, Attendance, Branch, Course, Entitlement, Family, Lead, Student, FormOfferSlot, Holiday, Invoice, Klass, Session, Staff, StudentLeave, Weekday } from "../types"
import { applyClassEdit, applyToSessions, canChangeTeachers, canRescheduleStudent, mondayOf, removedWithClass, canSave, closesBranch, holidayImpact, hoursFor, isHoliday, overlappingRows, periodsIn, introducedConflicts, editSingleSession, findConflicts, generateSessions, moveSession, sessionState, validateClass, workState } from "./scheduling"
import { activeLeave, balance, studentState, leaveLedger, packageCovers, canMark, canSaveLeave, coveringEntitlement, effectiveTo, leavesUsed, lowBalanceAlert, removeFromClass, resolveEntitlements } from "./attendance"
import { bestPromotion, invoiceTotals, validateInvoiceDraft, canApprove, canConfirmPayment, canForceApprove, canForceConfirmPayment, canSend, canVoid, defaultBusLegs, busTotal, nextInvoiceNumber, quoteCourse } from "./billing"
import { can } from "./permissions"
import { chartPrice, defaultCourseName, validateCourse } from "./course"
import { busRate, copyHours, priceOf, priceRange, setPrice, validateBranchInfo, validateDurations, validateHoliday, validatePromotion, validateSpecialPeriods, everyDay } from "./settings"
import { forceAudience, isUnread, messageAudience, notify, validateMessage, visibleTo } from "./notifications"
import * as Sum from "./summaries"
import { familyFromLead, futureSessionsOf, matchExistingFamily, nicknameFrom, searchStudents, studentLabel, validateFamily, validateStaff, validateStudent } from "./people"
import { suggestFixes } from "./suggest"
import { advanceStage, canSetStage, daysAgo, groupOf, restoreStage, validateLead } from "./crm"
import { APPROVE_STAGE, ATTENDED_STAGE, buildCombinedSessionDraft, buildSessionDraftFromSlot, findOfferSlots, lastAssessmentDate, openHourStarts, sessionKindLabel } from "./forms"
import { customerRows, filterCustomers } from "./customers"
import { invoiceMessage } from "./messages"

const hours = { open: "09:00", close: "20:00" }
const branch: Branch = {
  id: "b1", code: "TST", name: "Test", brand: "nockacademy",
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
const monthPkg: Course = { id: "c1", branchId: "b1", name: "Maths P5", kind: "single", subjects: ["Maths"], grades: ["P5"], unit: "month", duration: 1, price: 4500, courseFee: 0, active: true }

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

  it("A4: single class cannot take 2 students", () => {
    const issues = validateClass({ ...klass({ type: "single", studentIds: ["a", "b"] }) }, { branch, staff: [teacher], sessions: [], holidays })
    expect(canSave(issues)).toBe(false)
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

  it("A7: closed day needs an override reason", () => {
    const issues = validateClass(klass({ weekday: 0, startDate: "2026-10-04" }), { branch, staff: [teacher], sessions: [], holidays: [] })
    expect(canSave(issues)).toBe(false)
    expect(canSave(issues, "สอนชดเชย")).toBe(true)
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
    const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classId: "k1", invoiceId: "i", kind: "subscription" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 1 }
    expect(lowBalanceAlert(e, balance(e, [], []), "2026-09-24")).toBeNull()
  })

  describe("student leave (long leave excluded from leave quota, extends course end dates)", () => {
    const sessions = generateSessions(klass(), [], id)
    const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classId: "k1", invoiceId: "i", kind: "sessions" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 5 }
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
    const r = quoteCourse({ course: monthPkg, klass: klass(), startDate: "2026-09-29", periods: 2, holidays })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.sessions).toEqual(["2026-09-29", "2026-10-06", "2026-10-20", "2026-10-27"])
    expect(r.value.skipped).toEqual(["2026-10-13"])
    expect(r.value.hours).toBe(4)
    expect(r.value.to).toBe("2026-10-31")
    expect(r.value.periods.map((p) => p.amount)).toEqual([1350, 4500])
  })

  it("BL-5: periods below 1 rejected", () => {
    expect(quoteCourse({ course: monthPkg, klass: klass(), startDate: "2026-09-29", periods: -1, holidays }).ok).toBe(false)
  })

  it("BL-6: bus legs opt-in", () => {
    expect(busTotal(defaultBusLegs(["2026-09-29", "2026-10-06"], false), 150)).toBe(0)
    expect(busTotal(defaultBusLegs(["2026-09-29", "2026-10-06"], true), 150)).toBe(600)
  })

  it("BL-9: sequential numbers per branch and month", () => {
    expect(nextInvoiceNumber("INV", branch, "2026-09-24", ["INV-TST-6909-0003", "INV-TST-6908-0009", null])).toBe("INV-TST-6909-0004")
    expect(nextInvoiceNumber("RC", branch, "2026-09-24", ["INV-TST-6909-0003"])).toBe("RC-TST-6909-0001")
  })

  const inv = (p: Partial<Invoice> = {}): Invoice => ({
    id: "i", branchId: "b1", studentId: "a", number: "INV-TST-2609-0001", course: null, bus: [], bookFee: 0, advanceFee: 0,
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
  it("owner 2026-09-26: approvers act only on their own branch — Area Manager and above on any", () => {
    const other = inv({ branchId: "b2" })
    const mgr = staff("mgr", ["manager"])
    expect(canApprove(inv(), mgr).ok).toBe(true)
    expect(canApprove(other, mgr).ok).toBe(false)
    expect(canConfirmPayment({ recordedBy: "adm" }, mgr, "b2").ok).toBe(false)
    expect(canApprove(other, staff("am", ["area_manager"])).ok).toBe(true)
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
  it("D5: cannot send before approval; reports undelivered without LINE", () => {
    expect(Sum.canSend(summary, []).ok).toBe(false)
    const r = Sum.canSend({ ...summary, status: "approved" }, [{ name: "p", phone: "", lineLinked: false, primary: true }])
    expect(r.ok && r.value.delivered).toBe(false)
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
  const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classId: "k1", invoiceId: "i", kind: "sessions" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 5 }
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
    id: "i", branchId: "b1", studentId: "a", number: "INV-TST-6909-0001", course: null, bus: [], bookFee: 0, advanceFee: 0,
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
  const c = (p: Partial<Course> = {}): Course => ({ id: "c", branchId: "b1", name: "", kind: "single", subjects: ["Maths"], grades: ["P5"], unit: "month", duration: 1, price: 4000, courseFee: 0, active: true, ...p })
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
    const hour = quoteCourse({ course: { unit: "hour", duration: 24, price: 6000 }, klass: klass({ minutes: 120 }), startDate: "2026-09-29", periods: 1, holidays: [] })
    const ninety = quoteCourse({ course: { unit: "hour", duration: 24, price: 6000 }, klass: klass({ minutes: 90 }), startDate: "2026-09-29", periods: 1, holidays: [] })
    expect(hour.ok && hour.value.sessions.length).toBe(12)
    expect(ninety.ok && ninety.value.sessions.length).toBe(16)
    const week = quoteCourse({ course: { unit: "week", duration: 4, price: 5000 }, klass: klass(), startDate: "2026-09-29", periods: 1, holidays: [] })
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
    const e = { id: "e", studentId: "a", courseId: "c", subjects: ["Maths"], classId: "other", invoiceId: "i", kind: "subscription" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 1 }
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
    const r = quoteCourse({ course: monthPkg, klass: klass({ weekday: 6 }), startDate: "2026-09-28", periods: 1, holidays: [] })
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
    const ent: Entitlement = { id: "e", studentId: "a", courseId: "c1", subjects: ["Maths"], classId: "k1", invoiceId: "i", kind: "subscription", from: "2026-10-03", to: "2026-10-31", sessionsTotal: 5 }
    expect(studentState({ id: "a" }, [ent], [], "2026-09-28")).toEqual({ status: "active", startsOn: "2026-10-03" })
    expect(studentState({ id: "a" }, [], [], "2026-09-28").status).toBe("inactive")
  })

  it("Test → Trial → Invoice: paid classes must start after the last test/trial", () => {
    const asm = (date: string): Assessment => ({ id: date, type: "trial", leadId: "l", studentId: "a", sessionId: "s", subject: "Maths", date, start: "13:00" })
    expect(lastAssessmentDate("a", [asm("2026-09-29"), asm("2026-10-03")])).toBe("2026-10-03")
    expect(lastAssessmentDate("b", [asm("2026-10-03")])).toBeNull()
    const k = klass({ id: "k1", weekday: 6 })
    const draft = (startDate: string): Invoice => ({ id: "i", branchId: "b1", studentId: "a", number: null, course: { courseId: "c1", classId: "k1", startDate, periods: 1 }, bus: [], bookFee: 0, advanceFee: 0, concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "adm", createdAt: "", payments: [] })
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
    const inv: Invoice = { id: "i", branchId: "b1", studentId: "a", number: "INV-TST-6910-0001", course: { courseId: "c1", classId: "k1", startDate: "2026-10-01", periods: 1 }, bus: [], bookFee: 0, advanceFee: 0, concession: null, noteToParent: "ค่าเรียน ต.ค.", status: "approved", pdf: "ready", createdBy: "adm", createdAt: "", payments: [] }
    const b = { ...branch, bankAccount: { bank: "กสิกร", branchName: "", name: "NockAcademy", number: "123-4-56789-0" } }
    const text = invoiceMessage(inv, invoiceTotals(inv, { branch: b, courses: [monthPkg], classes: [k], holidays: [] }), { student: { id: "a", familyId: null, branchId: "b1", name: "ด.ช. ภูมิ ใจดี", nickname: "ภูมิ", grade: "ป.5", usesBus: false, createdAt: "", createdBranchId: "b1" }, course: monthPkg, branch: b })
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
  const ent: Entitlement = { id: "e1", studentId: "a", courseId: "c1", subjects: ["Maths"], classId: "k1", invoiceId: "i", kind: "subscription", from: "2026-09-29", to: "2026-10-27", sessionsTotal: 4 }
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
    expect(canRescheduleStudent(tue, { ...thu, studentIds: ["x", "y"] }, "a", now, 2).ok).toBe(false)
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
