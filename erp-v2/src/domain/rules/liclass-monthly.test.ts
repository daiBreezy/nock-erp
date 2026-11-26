import { describe, expect, it } from "vitest"
import { buildSeed } from "../../data/seed"
import { invoiceTotals } from "./billing"
import type { Course, Invoice, Klass } from "../types"

// owner 2026-11-26: Liclass now offers Monthly too — a Monthly course at a Liclass branch prices, rounds and invoices like any other
describe("Monthly course at a Liclass branch", () => {
  const seed = buildSeed(new Date("2026-11-26T09:00:00"))
  const branch = seed.branches.find((b) => b.brand === "liclass")!
  const base = seed.courses.find((c) => c.branchId === branch.id)!
  const klass = seed.classes.find((k) => k.branchId === branch.id && k.kind === "learning" && k.weekday === 1) ?? seed.classes.find((k) => k.branchId === branch.id && k.kind === "learning")!

  const course = { ...base, id: "c_month_li", unit: "month", duration: 1, price: 4205, courseFee: 0, periodId: undefined } as Course
  const k = { ...klass, courseId: course.id } as Klass
  const inv = (periods: number): Invoice => ({
    id: "i1", branchId: branch.id, studentId: "s1", number: null, lines: [{ id: "l1", courseId: course.id, classIds: [k.id], startDate: "2026-12-07", periods }],
    bus: [], bookFee: 0, advance: [], concession: null, noteToParent: "", status: "draft", pdf: "none", createdBy: "u", createdAt: "2026-11-26T09:00:00.000Z", payments: [],
  }) as unknown as Invoice
  const ctx = { branch, courses: [course], classes: [k], holidays: seed.holidays }

  it("the branch really is a Liclass one and the course is a Monthly pack", () => {
    expect(branch.brand).toBe("liclass")
    expect(course.unit).toBe("month")
  })
  it("one month is priced, and the total is rounded the Liclass way (up to the next ten)", () => {
    const t = invoiceTotals(inv(1), ctx)
    expect(t.lines).toHaveLength(1)
    expect(t.lines[0].quote?.periods).toHaveLength(1)
    expect(t.course).toBeGreaterThan(0)
    expect(t.total % 10).toBe(0)
    expect(t.total).toBeGreaterThanOrEqual(t.course)
  })
  it("two months = two month lines", () => {
    const t = invoiceTotals(inv(2), ctx)
    expect(t.lines[0].quote?.periods).toHaveLength(2)
  })
})
