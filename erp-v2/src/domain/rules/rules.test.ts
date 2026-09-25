// Regression tests: each case reproduces a bug found on Dev staging and proves the rule prevents it.
import { describe, expect, it } from "vitest"
import type { Attendance, Branch, FormOfferSlot, Holiday, Invoice, Klass, Package, Session, Staff, Weekday } from "../types"
import { applyClassEdit, applyToSessions, canSave, introducedConflicts, editSingleSession, findConflicts, generateSessions, moveSession, sessionState, validateClass, workState } from "./scheduling"
import { balance, canMark, coveringEntitlement, lowBalanceAlert, removeFromClass } from "./attendance"
import { canApprove, canConfirmPayment, canSend, canVoid, defaultBusLegs, busTotal, nextInvoiceNumber, quoteCourse } from "./billing"
import { can } from "./permissions"
import * as Sum from "./summaries"
import { futureSessionsOf, validateFamily, validateStaff, validateStudent } from "./people"
import { suggestFixes } from "./suggest"
import { canSetStage, daysAgo, groupOf, validateLead } from "./crm"
import { buildSessionDraftFromSlot, findOfferSlots } from "./forms"

const hours = { open: "09:00", close: "20:00" }
const branch: Branch = {
  id: "b1", code: "TST", name: "Test", brand: "nockacademy",
  rooms: [{ id: "r1", name: "Room 1" }, { id: "r2", name: "Room 2" }],
  hours: { 0: null, 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours } as Record<Weekday, typeof hours | null>,
  subjects: ["Maths"], grades: ["P5"], defaultSessionMinutes: 60, busFeePerLeg: 150, breaks: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }, specialPeriods: [], fees: [], promotions: [],
  bankAccount: { bank: "", name: "", number: "" }, lineOaConnected: false,
  lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
}
const staff = (id: string, roles: Staff["roles"]): Staff => ({ id, name: id, nickname: id, roles, branchIds: ["b1"], subjects: ["Maths"], active: true, canLogin: true })
const director = staff("dir", ["director"]), admin = staff("adm", ["admin"]), teacher = staff("t1", ["teacher"])
const holidays: Holiday[] = [{ id: "h1", branchId: "b1", date: "2026-10-13", name: "Holiday" }]
let n = 0
const id = () => `s${++n}`
const klass = (p: Partial<Klass> = {}): Klass => ({
  id: "k1", branchId: "b1", name: "Maths", subject: "Maths", grades: ["P5"], kind: "learning", type: "group",
  teacherId: "t1", coTeacherIds: [], roomId: "r1", weekday: 2, start: "10:00", minutes: 60, startDate: "2026-09-29", active: true, studentIds: ["a"], ...p,
})
const monthPkg: Package = { id: "p1", branchId: "b1", subject: "Maths", grades: ["P5"], unit: "month", price: 4500 }

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
  it("C2: cannot mark present before the session; leave allowed", () => {
    const before = new Date(2026, 8, 28)
    expect(canMark(s, "present", before).ok).toBe(false)
    expect(canMark(s, "leave", before).ok).toBe(true)
    expect(canMark(s, "present", new Date(2026, 8, 29, 10, 5)).ok).toBe(true)
  })

  it("F1: removing a student clears future sessions", () => {
    const sessions = generateSessions(klass(), [], id)
    const r = removeFromClass(klass(), "a", sessions, new Date(2026, 9, 1))
    expect(r.sessions[0].studentIds).toEqual(["a"]) // past stays
    expect(r.sessions.slice(1).every((x) => !x.studentIds.includes("a"))).toBe(true)
  })

  it("F4: no low-session alert for subscriptions", () => {
    const e = { id: "e", studentId: "a", courseId: "c", subject: "Maths", classId: "k1", invoiceId: "i", kind: "subscription" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 1 }
    expect(lowBalanceAlert(e, balance(e, [], []), "2026-09-24")).toBeNull()
  })
})

describe("billing", () => {
  it("BL-2/BL-3: 2 months from 29 Sep = 4 sessions, 4 hours, 30% + 100%", () => {
    const r = quoteCourse({ pkg: monthPkg, klass: klass(), startDate: "2026-09-29", periods: 2, holidays })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.value.sessions).toEqual(["2026-09-29", "2026-10-06", "2026-10-20", "2026-10-27"])
    expect(r.value.skipped).toEqual(["2026-10-13"])
    expect(r.value.hours).toBe(4)
    expect(r.value.to).toBe("2026-10-31")
    expect(r.value.periods.map((p) => p.amount)).toEqual([1350, 4500])
  })

  it("BL-5: periods below 1 rejected", () => {
    expect(quoteCourse({ pkg: monthPkg, klass: klass(), startDate: "2026-09-29", periods: -1, holidays }).ok).toBe(false)
  })

  it("BL-6: bus legs opt-in", () => {
    expect(busTotal(defaultBusLegs(["2026-09-29", "2026-10-06"], false), 150)).toBe(0)
    expect(busTotal(defaultBusLegs(["2026-09-29", "2026-10-06"], true), 150)).toBe(600)
  })

  it("BL-9: sequential numbers per branch and month", () => {
    expect(nextInvoiceNumber("INV", branch, "2026-09-24", ["INV-TST-2609-0003", "INV-TST-2608-0009", null])).toBe("INV-TST-2609-0004")
    expect(nextInvoiceNumber("RC", branch, "2026-09-24", ["INV-TST-2609-0003"])).toBe("RC-TST-2609-0001")
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
    expect(canConfirmPayment({ recordedBy: "adm" }, admin).ok).toBe(false)
    expect(canConfirmPayment({ recordedBy: "adm" }, director).ok).toBe(true)
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
  const e = { id: "e", studentId: "a", courseId: "c", subject: "Maths", classId: "k1", invoiceId: "i", kind: "sessions" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 5 }
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
    expect(groupOf("new").key).toBe("new")
  })

  it("drag-and-drop cannot set enrolled/archived directly — those need their own action", () => {
    expect(canSetStage("contacting", "test_scheduled").ok).toBe(true)
    expect(canSetStage("payment_pending", "enrolled").ok).toBe(false)
    expect(canSetStage("new", "archived").ok).toBe(false)
    expect(canSetStage("archived", "new").ok).toBe(false) // must reactivate via its own flow first
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
    const draft = buildSessionDraftFromSlot(slot, "Maths", "b1", "stu1")
    expect(draft).toEqual({ branchId: "b1", classId: null, subject: "Maths", date: "2026-09-29", start: "09:00", minutes: 60, teacherId: "t1", coTeacherIds: [], roomId: "r1", studentIds: ["stu1"], trial: true })
  })

  it("validateClass silently skips a holiday date for a single-date (non-learning) draft — the gap store.addSession's explicit isHoliday check works around", () => {
    const issues = validateClass(
      { branchId: "b1", subject: "Maths", kind: "other", type: "group", teacherId: "t1", coTeacherIds: [], roomId: "r1", weekday: 2, start: "10:00", minutes: 60, startDate: "2026-10-13", studentIds: [] },
      { branch, staff: [teacher], sessions: [], holidays },
    )
    expect(issues.some((i) => i.level === "block")).toBe(false)
  })
})
