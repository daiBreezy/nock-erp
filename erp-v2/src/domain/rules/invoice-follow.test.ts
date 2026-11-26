import { describe, expect, it } from "vitest"
import { daysToDue, dueDateOf, dueTone, followedInvoices } from "./billing"
import type { Invoice } from "../types"

// owner 2026-11-26: the Invoice column of the Student / Family lists — sent-and-unpaid invoices coloured by the nearest pay-by date
const inv = (o: Partial<Invoice>) => ({ id: "i", studentId: "s1", number: "INV-1", status: "sent", payments: [], createdAt: "2026-11-01T09:00:00.000Z", ...o }) as unknown as Invoice

describe("invoice follow-up", () => {
  it("colours: under 3 days (or overdue) red · under 7 yellow · 7+ grey", () => {
    expect(dueTone(-5)).toBe("red")
    expect(dueTone(0)).toBe("red")
    expect(dueTone(2)).toBe("red")
    expect(dueTone(3)).toBe("amber")
    expect(dueTone(6)).toBe("amber")
    expect(dueTone(7)).toBe("gray")
    expect(dueTone(30)).toBe("gray")
  })

  it("counts days to the pay-by date (negative = overdue)", () => {
    expect(daysToDue("2026-11-10", "2026-11-07")).toBe(3)
    expect(daysToDue("2026-11-07", "2026-11-07")).toBe(0)
    expect(daysToDue("2026-11-05", "2026-11-07")).toBe(-2)
  })

  it("an invoice with no pay-by date counts 14 days from when it was sent", () => {
    expect(dueDateOf(inv({ dueDate: "2026-12-01" }))).toEqual({ date: "2026-12-01", assumed: false })
    expect(dueDateOf(inv({ sentAt: "2026-11-10T08:00:00.000Z" }))).toEqual({ date: "2026-11-24", assumed: true })
    expect(dueDateOf(inv({}))).toEqual({ date: "2026-11-15", assumed: true })
  })

  it("follows only SENT invoices (not draft / approved / paid / void), soonest due first, with the owed amount", () => {
    const list = [
      inv({ id: "a", dueDate: "2026-11-30" }),
      inv({ id: "b", dueDate: "2026-11-08" }),
      inv({ id: "c", status: "paid", dueDate: "2026-11-01" }),
      inv({ id: "d", status: "approved", dueDate: "2026-11-01" }),
      inv({ id: "e", studentId: "s2", dueDate: "2026-11-01" }),
    ]
    const r = followedInvoices(list, new Set(["s1"]), "2026-11-07", () => 5000)
    expect(r.map((x) => x.id)).toEqual(["b", "a"])
    expect(r[0]).toMatchObject({ days: 1, tone: "red", owed: 5000, assumed: false })
    expect(r[1]).toMatchObject({ days: 23, tone: "gray" })
  })
})
