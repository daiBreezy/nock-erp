import { describe, expect, it } from "vitest"
import { buildPiles } from "./desk"
import type { Topic } from "./today"

const t = (key: string, count: number, urgent?: number): Topic => ({ key, group: "money", title: key, detail: "", count, urgent, href: "/x" })

describe("desk piles", () => {
  it("rows follow the story order, empty rows drop out, one kind of work sits in one pile", () => {
    const piles = buildPiles([t("invoice_overdue", 2), t("invoice_approve", 1), t("renewal", 3, 2), t("invoice_due_soon", 0), t("lead_new", 4)])
    const finance = piles.find((p) => p.key === "finance")!
    expect(finance.stages.map((s) => s.key)).toEqual(["invoice_approve", "invoice_overdue"])
    expect(finance.total).toBe(3)
    expect(finance.done.map((x) => x.key)).toEqual(["invoice_due_soon"]) // finished rows are kept (count 0), not dropped
    expect(finance.red).toBe(true) // overdue is red on its own
    expect(piles.find((p) => p.key === "customer")!.stages.map((s) => s.key)).toEqual(["renewal"])
    expect(piles.find((p) => p.key === "customer")!.red).toBe(true) // urgent renewals
    expect(piles.find((p) => p.key === "lead")!.red).toBe(false)
    const all = piles.flatMap((p) => p.stages.map((s) => s.key))
    expect(new Set(all).size).toBe(all.length)
  })
  it("suggestions are kept apart: never counted, never red, never a row of the story", () => {
    const c = buildPiles([t("no_teacher", 0), t("hint_lesson", 5), t("hint_student", 0)]).find((p) => p.key === "classroom")!
    expect(c.hints.map((h) => h.key)).toEqual(["hint_lesson"])
    expect(c.total).toBe(0)
    expect(c.red).toBe(false)
    expect(c.stages).toHaveLength(0)
  })
  it("rows the page draws itself still count toward their pile", () => {
    expect(buildPiles([], { impact: 2 }).find((p) => p.key === "impact")!.total).toBe(2)
  })
})
