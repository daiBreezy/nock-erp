import { describe, expect, it } from "vitest"
import type { Entitlement, Invoice } from "../types"
import { creditAgeDays, creditCourseOn, creditOwedTotal, creditState, creditsAvailable, creditsOverdue, creditsOwed, validateCreditCourse } from "./credit"

const ent = (id: string, over: Partial<Entitlement> = {}): Entitlement => ({
  id, studentId: "s1", courseId: "c1", subjects: ["คณิต"], classIds: ["k1"], invoiceId: null, kind: "subscription", from: "2026-11-01", to: "2026-11-30", sessionsTotal: 4,
  credit: { amount: 4000, reason: "รอเงินเดือน", by: "u1", at: "2026-11-01T03:00:00.000Z", startDate: "2026-11-01", periods: 1 }, ...over,
})
const inv = (id: string, status: Invoice["status"], creditId?: string) => ({ id, status, number: `INV-${id}`, lines: creditId ? [{ creditId }] : [] }) as unknown as Invoice

describe("Credit Course", () => {
  it("is off until the system switch is turned on", () => {
    expect(creditCourseOn(undefined)).toBe(false)
    expect(creditCourseOn({})).toBe(false)
    expect(creditCourseOn({ creditCourse: true })).toBe(true)
  })
  it("state: open → invoiced → settled; a void invoice frees it again", () => {
    const e = ent("e1")
    expect(creditState(e, [])).toBe("open")
    expect(creditState(e, [inv("i1", "draft", "e1")])).toBe("invoiced")
    expect(creditState(e, [inv("i1", "void", "e1")])).toBe("open")
    expect(creditState({ ...e, invoiceId: "i1" }, [inv("i1", "paid", "e1")])).toBe("settled")
    expect(creditState(ent("e2", { credit: undefined }), [])).toBeNull()
  })
  it("owed lists only unsettled credits of that student; available skips ones on another invoice", () => {
    const ents = [ent("e1"), ent("e2"), ent("e3", { invoiceId: "i0" }), ent("e4", { studentId: "s2" })]
    const invs = [inv("i1", "draft", "e2")]
    expect(creditsOwed("s1", ents, invs).map((e) => e.id)).toEqual(["e1", "e2"])
    expect(creditsAvailable("s1", ents, invs).map((e) => e.id)).toEqual(["e1"])
    expect(creditsAvailable("s1", ents, invs, "i1").map((e) => e.id)).toEqual(["e1", "e2"])
    expect(creditOwedTotal(creditsOwed("s1", ents, invs))).toBe(8000)
  })
  it("age and overdue reminder", () => {
    expect(creditAgeDays(ent("e1"), "2026-11-19")).toBe(18)
    expect(creditsOverdue([ent("e1")], [], "2026-11-19", 14)).toHaveLength(1)
    expect(creditsOverdue([ent("e1")], [], "2026-11-10", 14)).toHaveLength(0)
    expect(creditsOverdue([ent("e1", { invoiceId: "i1" })], [], "2026-12-30", 14)).toHaveLength(0)
  })
  it("validation: course, class, periods and a reason are required", () => {
    const ok = { courseId: "c1", classIds: ["k1"], periods: 1, reason: "x" }
    expect(validateCreditCourse(ok).ok).toBe(true)
    expect(validateCreditCourse({ ...ok, courseId: "" }).ok).toBe(false)
    expect(validateCreditCourse({ ...ok, classIds: [] }).ok).toBe(false)
    expect(validateCreditCourse({ ...ok, periods: 0 }).ok).toBe(false)
    expect(validateCreditCourse({ ...ok, reason: "  " }).ok).toBe(false)
  })
})

import { invoiceNextStep } from "./billing"

describe("invoice next step (student panel)", () => {
  const base = { status: "draft", pdf: "none", payments: [], delivery: undefined, receiptNumber: undefined } as unknown as Parameters<typeof invoiceNextStep>[0]
  const step = (p: Partial<Parameters<typeof invoiceNextStep>[0]>) => invoiceNextStep({ ...base, ...p })
  it("walks the invoice: draft → approve → send → wait → confirm → receipt, then nothing left", () => {
    expect(step({})?.todo).toMatch(/สร้างใบแจ้งหนี้/)
    expect(step({ status: "pending_approval" })?.stage).toBe("รออนุมัติ")
    expect(step({ status: "approved", number: null })?.todo).toMatch(/ออกเลข/)
    expect(step({ status: "approved", number: "INV-1" })?.todo).toMatch(/ส่งใบ/)
    expect(step({ status: "sent" })?.tone).toBe("blue")
    expect(step({ status: "sent", delivery: "failed" })?.tone).toBe("red")
    expect(step({ status: "sent", payments: [{ id: "p", amount: 1 }] as never })?.todo).toMatch(/ยืนยันยอด/)
    expect(step({ status: "paid" })?.todo).toBe("ออกใบเสร็จ")
    expect(step({ status: "paid", receiptNumber: "RC-1" })).toBeNull()
    expect(step({ status: "void" })).toBeNull()
  })
})
