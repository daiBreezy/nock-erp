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

import { activePeriodOn, periodsCovering } from "./period-impact"
describe("date pickers see Special Periods (owner 2026-11-25)", () => {
  const periods = [
    { id: "a", name: "Summer", from: "2027-03-20", to: "2027-05-10", active: true },
    { id: "b", name: "Mid-year", from: "2027-10-01", to: "2027-10-10", active: false },
  ] as never[]
  it("shows planned (inactive) periods but only an active one blocks", () => {
    expect(periodsCovering(periods, "2027-04-01").map((h) => h.period.name)).toEqual(["Summer"])
    expect(periodsCovering(periods, "2027-10-05")).toHaveLength(1)
    expect(activePeriodOn(periods, "2027-10-05")).toBeNull()
    expect(activePeriodOn(periods, "2027-04-01")?.name).toBe("Summer")
    expect(periodsCovering(periods, "2027-06-01")).toHaveLength(0)
  })
})

import { periodCountdown } from "./period-impact"
describe("countdown colours (owner 2026-11-25)", () => {
  const p = (from: string, active = false) => ({ id: from, name: "P", from, to: "2099-01-01", active }) as never
  const today = "2026-11-25"
  const tone = (from: string, active?: boolean) => periodCountdown([p(from, active)], today)[0]?.tone
  it("gray while 45+ days away, orange under 45, red under 30 — when still not switched on", () => {
    expect(tone("2027-01-24")).toBe("gray") // 60 days
    expect(tone("2027-01-09")).toBe("gray") // 45 days
    expect(tone("2027-01-08")).toBe("orange") // 44 days
    expect(tone("2026-12-24")).toBe("red") // 29 days
  })
  it("a switched-on period stays gray; beyond 60 days or already started is not listed", () => {
    expect(tone("2026-12-10", true)).toBe("gray")
    expect(periodCountdown([p("2027-03-01")], today)).toHaveLength(0)
    expect(periodCountdown([p("2026-11-20")], today)).toHaveLength(0)
  })
})

import { periodBusImpact } from "./period-impact"
describe("bus in a Special Period (owner 2026-11-25)", () => {
  const per = { id: "p1", from: "2026-12-07", to: "2026-12-20" } as never
  const inv = { studentId: "a", status: "paid", bus: [{ date: "2026-12-08", pickup: true, dropoff: true }, { date: "2026-12-22", pickup: true, dropoff: true }] } as never
  const data = { students: [{ id: "a", branchId: "b1" }, { id: "b", branchId: "b1" }] as never, classes: [{ periodId: "p1", studentIds: ["b"] }] as never, invoices: [inv], busAddOns: [] }
  it("counts legs inside the period only, paid ones apart", () => {
    const r = periodBusImpact(per, data, "b1", "2026-11-25")
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ studentId: "a", lost: 2, paidLost: 2 })
  })
  it("a child with a class IN the period keeps the bus", () => {
    const withBus = { ...data, invoices: [{ ...(inv as object), studentId: "b" }] as never }
    expect(periodBusImpact(per, withBus, "b1", "2026-11-25")).toHaveLength(0)
  })
})

import { planBusMoney } from "./period-impact"
describe("bus money back (owner 2026-11-25)", () => {
  const inv = (id: string, status: string) => ({ id, studentId: "a", status, bus: [{ date: "2026-12-08", pickup: true, dropoff: true }, { date: "2026-12-09", pickup: true, dropoff: false }, { date: "2027-01-05", pickup: true, dropoff: true }], busExtras: [{ addOnId: "x", date: "2026-12-08", pickup: true, dropoff: false, amount: 80 }] }) as never
  it("legs on the lost days × the invoice's rate, extras apart — paid invoices only", () => {
    const plans = planBusMoney("a", new Set(["2026-12-08", "2026-12-09"]), [inv("i1", "paid"), inv("i2", "sent")], () => 100)
    expect(plans).toHaveLength(1)
    expect(plans[0]).toMatchObject({ invoiceId: "i1", amount: 380 })
    expect(plans[0].items.map((i) => [i.key, i.legs, i.amount])).toEqual([["bus", 3, 300], ["busExtra", 1, 80]])
  })
})

describe("dashboard keeps a running period visible (owner 2026-11-25)", () => {
  const run = { id: "r", name: "R", from: "2026-11-20", to: "2026-12-20", active: true } as never
  it("only with includeRunning, and only while Active", () => {
    expect(periodCountdown([run], "2026-11-25")).toHaveLength(0)
    const [c] = periodCountdown([run], "2026-11-25", { includeRunning: true })
    expect(c).toMatchObject({ running: true, tone: "gray", days: 0 })
    expect(periodCountdown([{ ...(run as object), active: false } as never], "2026-11-25", { includeRunning: true })).toHaveLength(0)
  })
})
