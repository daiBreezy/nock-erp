import { describe, expect, it } from "vitest"
import * as Bill from "../domain/rules/billing"
import { useStore } from "./store"

// owner 2026-11-25: with the demo seed, a monthly renewal that falls inside the Summer period (Jan 4–31, Active) costs 0 for a REGULAR class
describe("invoice totals follow the Special Period", () => {
  it("a regular monthly course in January is ฿0 (the whole month is inside Summer), the same course in December is not", () => {
    const s = useStore.getState()
    const branch = s.branches.find((b) => b.id === "br_thl")!
    const summer = branch.specialPeriods[0]
    expect(summer.active).toBe(true)
    const monthly = s.courses.find((c) => c.unit === "month" && c.branchId === branch.id && s.classes.some((k) => k.courseId === c.id && !k.periodId && k.active))!
    const klass = s.classes.find((k) => k.courseId === monthly.id && !k.periodId && k.active)!
    const ctx = { branch, courses: s.courses, classes: s.classes, holidays: s.holidays }
    const quote = (startDate: string) => {
      const r = Bill.quoteCourse({ course: monthly, klasses: [klass], startDate, periods: 1, holidays: s.holidays, specialPeriods: branch.specialPeriods })
      if (!r.ok) throw new Error(r.error)
      return r.value
    }
    const jan = quote(summer.from)
    const dec = quote("2026-12-01")
    console.log("Jan total", jan.total, "skipped by period", jan.periodSkipped.length, "· Dec total", dec.total)
    expect(jan.total).toBe(0)
    expect(jan.periodSkipped.length).toBeGreaterThan(0)
    expect(dec.total).toBeGreaterThan(0)
    expect(ctx.branch.id).toBe("br_thl")
  })
})
