import { describe, expect, it } from "vitest"
import type { Course, Entitlement, Klass, Session, SpecialPeriod } from "../types"
import { classWeeksInMonth, creditValue, invoiceStateFor, makeupCandidates, pairMakeups, releaseMakeups, planCreditNotes, syncPeriodCredits } from "./session-credit"

const klass = (id: string, weekday: number) => ({ id, weekday }) as Klass
const monday = 1, thursday = 4
const monthCourse = { unit: "month", duration: 1, price: 5000 } as Course
const weekCourse = { unit: "week", duration: 4, price: 8000 } as Course
const ent = { id: "e1", studentId: "s1", courseId: "c1", classIds: ["k1", "k2"], kind: "subscription", from: "2026-11-01", to: "2026-12-31", subjects: ["Eng"] } as Entitlement

describe("session credit value", () => {
  it("monthly: price ÷ real class-weeks ÷ sessions per week (owner's Eng Fun example: 5 weeks → 500)", () => {
    expect(classWeeksInMonth("2026-11-10", [monday, thursday])).toBe(5) // Mondays 2,9,16,23,30
    expect(creditValue(monthCourse, ent, [klass("k1", monday), klass("k2", thursday)], "2026-11-10")).toBe(500)
  })
  it("a 4-week month gives a higher value per session", () => {
    expect(classWeeksInMonth("2026-12-10", [monday, thursday])).toBe(4) // Mondays 7,14,21,28 (Dec 31 Thu belongs to week of Dec 28)
    expect(creditValue(monthCourse, ent, [klass("k1", monday), klass("k2", thursday)], "2026-12-10")).toBe(625)
  })
  it("weekly: pack price ÷ its weeks ÷ sessions per week", () => {
    expect(creditValue(weekCourse, ent, [klass("k1", monday), klass("k2", thursday)], "2026-11-10")).toBe(1000)
  })
  it("hourly packs have no credit value", () => {
    expect(creditValue({ unit: "hour", duration: 10, price: 9000 } as Course, ent, [], "2026-11-10")).toBe(0)
  })
})

describe("syncPeriodCredits", () => {
  const period = { id: "p1", active: true, pauseCause: "school" } as SpecialPeriod
  const paused = { id: "se1", branchId: "b1", classId: "k1", date: "2026-11-10", pausedBy: "p1", cancelled: true, studentIds: ["s1"], subject: "Eng" } as Session
  const data = (sessions: Session[]) => ({ sessions, entitlements: [ent], courses: [{ ...monthCourse, id: "c1" } as Course], classes: [klass("k1", monday), klass("k2", thursday)] })
  let n = 0
  const newId = () => `cr${++n}`
  it("creates one credit per paused session, and not twice", () => {
    const a = syncPeriodCredits([], period, data([paused]), newId, "now")
    expect(a.created).toBe(1)
    expect(a.credits[0]).toMatchObject({ studentId: "s1", value: 500, status: "open" })
    expect(syncPeriodCredits(a.credits, period, data([paused]), newId, "now").created).toBe(0)
  })
  it("'other' cause gives no credit", () => {
    expect(syncPeriodCredits([], { ...period, pauseCause: "other" }, data([paused]), newId, "now").created).toBe(0)
  })
  it("session comes back: open credit revoked, settled credit only flagged", () => {
    const a = syncPeriodCredits([], period, data([paused]), newId, "now")
    const back = syncPeriodCredits(a.credits, period, data([{ ...paused, pausedBy: undefined, cancelled: false }]), newId, "now")
    expect(back.revoked).toBe(1)
    expect(back.credits[0].status).toBe("revoked")
    const settled = a.credits.map((c) => ({ ...c, status: "settled" as const }))
    const again = syncPeriodCredits(settled, period, data([{ ...paused, pausedBy: undefined, cancelled: false }]), newId, "now")
    expect(again.flagged).toHaveLength(1)
    expect(again.credits[0].status).toBe("settled")
  })
})

describe("invoiceStateFor", () => {
  const inv = (status: string, createdAt: string) => ({ studentId: "s1", status, createdAt, lines: [{ courseId: "c1" }] }) as never
  it("latest non-void invoice of the course decides", () => {
    expect(invoiceStateFor("s1", "c1", [inv("paid", "2026-10-01"), inv("sent", "2026-11-01")])).toBe("unpaid")
    expect(invoiceStateFor("s1", "c1", [inv("paid", "2026-11-01")])).toBe("paid")
    expect(invoiceStateFor("s1", "c1", [inv("void", "2026-11-01")])).toBe("none")
  })
})

describe("planCreditNotes", () => {
  const cr = (id: string, value: number) => ({ id, studentId: "s1", entitlementId: "e1", courseId: "c1", value }) as never
  const inv = (status: string) => ({ id: "i1", status, number: "INV-1", lines: [{ id: "l1", courseId: "c1" }] }) as never
  it("one note per invoice line, amounts added up", () => {
    const r = planCreditNotes([cr("a", 500), cr("b", 500)], [{ id: "e1", invoiceId: "i1" }], [inv("paid")], () => "Eng Fun")
    expect(r).toMatchObject({ ok: true, plans: [{ invoiceId: "i1", lineId: "l1", amount: 1000, creditIds: ["a", "b"] }] })
  })
  it("an unpaid invoice cannot carry money — says to reduce the invoice instead", () => {
    const r = planCreditNotes([cr("a", 500)], [{ id: "e1", invoiceId: "i1" }], [inv("sent")], () => "Eng Fun")
    expect(r.ok).toBe(false)
  })
})

describe("make-up from credit", () => {
  const credit = { id: "c1", studentId: "s1", courseId: "c1", branchId: "b1", date: "2026-12-08", status: "open" } as never
  const classes = [{ id: "k1", courseId: "c1", type: "group" }, { id: "k2", courseId: "c2", type: "group" }, { id: "k3", courseId: "c1", type: "single" }] as never
  const ses = (id: string, classId: string | null, date: string, over = {}) => ({ id, branchId: "b1", classId, date, start: "10:00", subject: "Eng", studentIds: [], cancelled: false, trial: false, ...over }) as never
  const base = { credit, classes, course: { subjects: ["Eng"] }, now: new Date("2026-11-25T09:00:00"), today: "2026-11-25" }
  it("default = same course, upcoming, free seat, student not already in it", () => {
    const sessions = [
      ses("a", "k1", "2026-12-22"), ses("b", "k2", "2026-12-22"), ses("full", "k3", "2026-12-23", { studentIds: ["x", "y", "z"] }),
      ses("past", "k1", "2026-11-20"), ses("cancelled", "k1", "2026-12-24", { cancelled: true }), ses("in", "k1", "2026-12-25", { studentIds: ["s1"] }), ses("oneoff", null, "2026-12-26"),
    ]
    expect(makeupCandidates({ ...base, sessions }).map((s) => s.id)).toEqual(["a", "oneoff"])
  })
  it("Admin's optional choice: any course", () => {
    expect(makeupCandidates({ ...base, otherCourse: true, sessions: [ses("a", "k1", "2026-12-22"), ses("b", "k2", "2026-12-22")] }).map((s) => s.id)).toEqual(["a", "b"])
  })
  it("pairs the earliest lost sessions first and leaves the rest open", () => {
    const cs = [{ id: "late", date: "2027-01-05", status: "open" }, { id: "early", date: "2026-12-08", status: "open" }, { id: "done", date: "2026-12-01", status: "settled", settle: { mode: "refund" } }] as never
    expect(pairMakeups(cs, ["s1"]).map((p) => [p.credit.id, p.sessionId])).toEqual([["early", "s1"]])
  })
})

describe("make-up cancelled gives the credit back", () => {
  const credit = { id: "c", studentId: "s1", status: "settled", settle: { mode: "makeup", makeupSessionId: "m1" } } as never
  it("cancelled / deleted / student removed → open again; healthy booking untouched", () => {
    const ok = [{ id: "m1", cancelled: false, studentIds: ["s1"] }]
    expect(releaseMakeups([credit], ok)).toEqual([credit]) // same content, nothing changed
    expect(releaseMakeups([credit], [{ id: "m1", cancelled: true, studentIds: ["s1"] }])[0]).toMatchObject({ status: "open", settle: undefined })
    expect(releaseMakeups([credit], [])[0].status).toBe("open")
    expect(releaseMakeups([credit], [{ id: "m1", cancelled: false, studentIds: [] }])[0].status).toBe("open")
  })
})
