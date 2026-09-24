// Regression tests: each case reproduces a bug found on Dev staging and proves the rule prevents it.
import { describe, expect, it } from "vitest"
import type { Attendance, Branch, Holiday, Invoice, Klass, Package, Session, Staff, Weekday } from "../types"
import { applyClassEdit, canSave, editSingleSession, findConflicts, generateSessions, sessionState, validateClass } from "./scheduling"
import { canMark, removeFromClass, lowBalanceAlert, balance } from "./attendance"
import { canApprove, canConfirmPayment, canSend, canVoid, defaultBusLegs, busTotal, nextInvoiceNumber, quoteCourse } from "./billing"
import { can } from "./permissions"
import * as Sum from "./summaries"

const hours = { open: "09:00", close: "20:00" }
const branch: Branch = {
  id: "b1", code: "TST", name: "Test", brand: "nockacademy",
  rooms: [{ id: "r1", name: "Room 1" }, { id: "r2", name: "Room 2" }],
  hours: { 0: null, 1: hours, 2: hours, 3: hours, 4: hours, 5: hours, 6: hours } as Record<Weekday, typeof hours | null>,
  subjects: ["Maths"], grades: ["P5"], defaultSessionMinutes: 60, busFeePerLeg: 150,
  bankAccount: { bank: "", name: "", number: "" }, lineOaConnected: false,
}
const staff = (id: string, roles: Staff["roles"]): Staff => ({ id, name: id, nickname: id, roles, branchIds: ["b1"], subjects: ["Maths"], active: true, canLogin: true })
const director = staff("dir", ["director"]), admin = staff("adm", ["admin"]), teacher = staff("t1", ["teacher"])
const holidays: Holiday[] = [{ id: "h1", branchId: "b1", date: "2026-10-13", name: "Holiday" }]
let n = 0
const id = () => `s${++n}`
const klass = (p: Partial<Klass> = {}): Klass => ({
  id: "k1", branchId: "b1", name: "Maths", subject: "Maths", grades: ["P5"], kind: "learning", type: "group",
  teacherId: "t1", roomId: "r1", weekday: 2, start: "10:00", minutes: 60, startDate: "2026-09-29", active: true, studentIds: ["a"], ...p,
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
    const e = { id: "e", studentId: "a", courseId: "c", classId: "k1", invoiceId: "i", kind: "subscription" as const, from: "2026-09-01", to: "2026-12-31", sessionsTotal: 1 }
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
