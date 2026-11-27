import { describe, expect, it } from "vitest"
import { cumulativeByDay, monthBounds } from "./kpi-series"

describe("kpi series", () => {
  it("month bounds: this month, the one before (across a year), days in each", () => {
    expect(monthBounds("2026-11-27")).toEqual({ from: "2026-11-01", days: 30, day: 27, prevFrom: "2026-10-01", prevDays: 31 })
    expect(monthBounds("2026-01-05").prevFrom).toBe("2025-12-01")
    expect(monthBounds("2028-03-10").prevDays).toBe(29)
  })
  it("cumulative by day is a running total that never goes down", () => {
    const rows = [{ date: "2026-11-02", total: 100 }, { date: "2026-11-02", total: 50 }, { date: "2026-11-04", total: 20 }]
    expect(cumulativeByDay(rows, "2026-11-01", 30, 5)).toEqual([0, 150, 150, 170, 170])
    expect(cumulativeByDay(rows, "2026-11-01", 3, 10)).toHaveLength(3)
  })
})
