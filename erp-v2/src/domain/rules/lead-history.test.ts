import { describe, expect, it } from "vitest"
import { leadHistory, leadOfFamily } from "./lead-history"

const leadObj = { id: "l1", familyId: "f1", createdAt: "2026-11-14T03:00:00Z", kids: [{ studentId: "s1" }, { studentId: "s2" }] }
const lead = leadObj as never
const students = [{ id: "s1", nickname: "Jojo", name: "Jojo A", familyId: "f1" }, { id: "s2", nickname: "Coco", name: "Coco A", familyId: "f1" }]

describe("Lead history timeline", () => {
  it("lists created → tests → trials → enroll, oldest first, with each child's result", () => {
    const assessments = [
      { leadId: "l1", studentId: "s1", type: "test", date: "2026-11-15", result: "ระดับ ป.5 · 18/25" },
      { leadId: "l1", studentId: "s2", type: "test", date: "2026-11-15", result: "ระดับ ป.3" },
      { leadId: "l1", studentId: "s2", type: "trial", date: "2026-11-19" },
      { leadId: "l1", studentId: "s1", type: "trial", date: "2026-11-18" },
    ] as never
    const invoices = [{ studentId: "s1", payments: [{ id: "p", recordedAt: "2026-11-21T01:00:00Z", paidOn: "2026-11-21", confirmedBy: "u" }] }, { studentId: "s2", payments: [{ id: "q", recordedAt: "2026-11-21T02:00:00Z", confirmedBy: "u" }] }] as never
    const h = leadHistory(lead, assessments, students, invoices)
    expect(h.map((e) => `${e.at} ${e.kind} ${e.who ?? ""}`.trim())).toEqual([
      "2026-11-14 created", "2026-11-15 test Jojo", "2026-11-15 test Coco", "2026-11-18 trial Jojo", "2026-11-19 trial Coco", "2026-11-21 enroll Jojo", "2026-11-21 enroll Coco",
    ])
    expect(h[1].result).toBe("ระดับ ป.5 · 18/25")
  })
  it("a payment slip nobody confirmed is not an Enroll", () => {
    const h = leadHistory(lead, [], students, [{ studentId: "s1", payments: [{ id: "p", recordedAt: "2026-11-21T01:00:00Z" }] }] as never)
    expect(h.map((e) => e.kind)).toEqual(["created"])
  })
  it("finds the Lead a family came from, ignoring a win-back Lead", () => {
    expect(leadOfFamily("f1", [lead], students as never)?.id).toBe("l1")
    expect(leadOfFamily("f1", [{ ...leadObj, winBackOf: "s1" }] as never, students as never)).toBeUndefined()
  })
})
