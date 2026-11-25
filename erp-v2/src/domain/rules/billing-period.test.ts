import { describe, expect, it } from "vitest"
import type { SpecialPeriod } from "../types"
import { quoteCourse } from "./billing"

// owner 2026-11-25: a monthly renewal inside an Active Special Period is not billed for the weeks the school stops regular classes
const course = { unit: "month", duration: 1, price: 4800 } as never
const monday = { id: "k1", weekday: 1, minutes: 60, branchId: "b1", start: "16:00" }
const special = { id: "k2", weekday: 1, minutes: 60, branchId: "b1", start: "16:00", periodId: "sp" }
const period = (from: string, to: string, active = true) => [{ id: "sp", name: "Summer", from, to, active }] as unknown as SpecialPeriod[]
const q = (klasses: never[], periods?: SpecialPeriod[], startDate = "2027-01-04", n = 1) => {
  const r = quoteCourse({ course, klasses, startDate, periods: n, holidays: [], specialPeriods: periods })
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe("quoteCourse with Special Periods", () => {
  it("a month fully inside an Active period costs 0 and says which days were skipped", () => {
    const v = q([monday] as never, period("2027-01-01", "2027-01-31"))
    expect(v.total).toBe(0)
    expect(v.periodSkipped.length).toBeGreaterThan(0)
  })
  it("no period / an inactive one = the normal price", () => {
    expect(q([monday] as never).total).toBe(4800)
    expect(q([monday] as never, period("2027-01-01", "2027-01-31", false)).total).toBe(4800)
  })
  it("a partly covered month is pro-rated by the weeks that really run (3+ weeks = full, 2 = 60%, 1 = 30%)", () => {
    // Mondays in Jan 2027: 4 11 18 25 — period stops the first two → 2 weeks left → 60%
    expect(q([monday] as never, period("2027-01-01", "2027-01-17"), "2027-01-18").total).toBe(Math.round(4800 * 0.6))
  })
  it("the period's own class is still billed", () => {
    expect(q([special] as never, period("2027-01-01", "2027-01-31")).total).toBe(4800)
  })
})

describe("a weekly pack is handled like a monthly one (owner 2026-11-25)", () => {
  const week = { unit: "week", duration: 4, price: 4000 } as never
  const qw = (periods?: SpecialPeriod[], startDate = "2027-01-04") => {
    const r = quoteCourse({ course: week, klasses: [monday] as never, startDate, periods: 1, holidays: [], specialPeriods: periods })
    if (!r.ok) throw new Error(r.error)
    return r.value
  }
  it("no period = the pack price; a stopped week is left out (price is per week)", () => {
    expect(qw().total).toBe(4000)
    // Mondays 4 11 18 25: the period stops the first two weeks → 2 of 4 weeks billed
    expect(qw(period("2027-01-01", "2027-01-17")).total).toBe(2000)
  })
  it("a pack fully inside the period costs 0", () => {
    const v = qw(period("2027-01-01", "2027-02-28"))
    expect(v.total).toBe(0)
    expect(v.periodSkipped.length).toBeGreaterThan(0)
  })
})
