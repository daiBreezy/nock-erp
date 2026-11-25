import { describe, expect, it } from "vitest"
import { daysUntilPeriod, periodImpact, shortNotice } from "./period-impact"

const period = { id: "p1", name: "Summer", from: "2026-12-07", to: "2026-12-20", active: true, priority: "mid", hours: {}, pauseCause: "school" } as never
const classes = [{ id: "reg" }, { id: "sum", periodId: "p1" }]
const sess = (id: string, o: object) => ({ id, branchId: "b1", date: "2026-12-09", classId: "reg", studentIds: ["a"], cancelled: false, subject: "คณิต", ...o }) as never
const ent = (id: string, studentId: string, kind: "sessions" | "subscription", classIds = ["reg"]) => ({ id, studentId, courseId: "c1", subjects: ["คณิต"], classIds, invoiceId: "i", kind, from: "2026-11-01", to: "2026-12-31", sessionsTotal: 8 }) as never

describe("periodImpact", () => {
  it("splits the students of stopped regular sessions into hourly vs weekly/monthly", () => {
    const r = periodImpact(period, "b1", {
      classes,
      sessions: [sess("s1", {}), sess("s2", { date: "2026-12-16" }), sess("s3", { studentIds: ["b"] })],
      entitlements: [ent("e1", "a", "sessions"), ent("e2", "b", "subscription")],
    }, "2026-11-25")
    expect(r.hourly.map((x) => [x.studentId, x.packages[0].lost])).toEqual([["a", 2]])
    expect(r.subscription.map((x) => [x.studentId, x.packages[0].lost])).toEqual([["b", 1]])
    expect(r.students.sort()).toEqual(["a", "b"])
    expect(r.schoolCause).toBe(true)
  })
  it("ignores the period's own classes, sessions outside the dates or in the past, and ones cancelled for another reason", () => {
    const r = periodImpact(period, "b1", {
      classes,
      sessions: [sess("x1", { classId: "sum" }), sess("x2", { date: "2026-12-21" }), sess("x3", { date: "2026-12-01" }), sess("x4", { cancelled: true }), sess("ok", { cancelled: true, pausedBy: "p1" })],
      entitlements: [ent("e1", "a", "sessions")],
    }, "2026-11-25")
    expect(r.pausedSessions.map((s) => s.id)).toEqual(["ok"])
  })
  it("only counts from today on when the period has already started", () => {
    const r = periodImpact(period, "b1", { classes, sessions: [sess("past", { date: "2026-12-08" }), sess("later", { date: "2026-12-16" })], entitlements: [ent("e1", "a", "sessions")] }, "2026-12-10")
    expect(r.pausedSessions.map((s) => s.id)).toEqual(["later"])
  })
  it("lists students no package covers, and tests / trials (no class) inside the dates", () => {
    const r = periodImpact(period, "b1", { classes, sessions: [sess("s1", { studentIds: ["z"] }), sess("t1", { classId: null, studentIds: ["lead"] })], entitlements: [] }, "2026-11-25")
    expect(r.uncovered.map((x) => x.studentId)).toEqual(["z"])
    expect(r.bookings.map((s) => s.id)).toEqual(["t1"])
  })
  it("pauseCause other = not the school's doing", () => {
    expect(periodImpact({ ...(period as object), pauseCause: "other" } as never, "b1", { classes, sessions: [], entitlements: [] }, "2026-11-25").schoolCause).toBe(false)
  })
})

describe("45-day notice", () => {
  it("counts the days and flags short notice", () => {
    expect(daysUntilPeriod({ from: "2027-01-04" }, "2026-11-25")).toBe(40)
    expect(shortNotice({ from: "2027-01-04" }, "2026-11-25")).toBe(true)
    expect(shortNotice({ from: "2027-01-10" }, "2026-11-25")).toBe(false)
    expect(daysUntilPeriod({ from: "2026-11-01" }, "2026-11-25")).toBe(0)
  })
})
