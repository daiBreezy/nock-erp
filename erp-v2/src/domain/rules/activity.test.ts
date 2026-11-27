import { describe, expect, it } from "vitest"
import { buildActivity, type ActivityInput } from "./activity"

const base: ActivityInput = {
  students: [{ id: "s1", nickname: "มินิ", familyId: "f1", branchId: "b1" }, { id: "s2", nickname: "เจ", familyId: "f2", branchId: "b2" }],
  invoices: [], attendance: [], sessions: [{ id: "x1", branchId: "b1", subject: "คณิต" }],
  leads: [{ id: "l1", branchId: "b1", name: "คุณแม่", createdAt: "2026-11-27T09:00:00Z" }],
  parentRequests: [], creditNotes: [], formSends: [],
  tr: (th, v) => (v ? th.replace(/\{(\d+)\}/g, (_, k) => String(v[Number(k)])) : th),
}

describe("activity feed", () => {
  it("newest first, and one feed cut down by branch / student / family", () => {
    const i: ActivityInput = {
      ...base,
      attendance: [{ sessionId: "x1", studentId: "s1", status: "present", markedAt: "2026-11-27T10:00:00Z" }, { sessionId: "x1", studentId: "s1", status: "leave", markedAt: "2026-11-27T11:00:00Z" }],
      formSends: [{ id: "fs1", familyId: "f2", title: "ฟอร์ม", sentAt: "2026-11-27T12:00:00Z", studentIds: ["s2"] }],
    }
    const all = buildActivity(i)
    expect(all.map((e) => e.kind)).toEqual(["form", "attendance", "lead"]) // leave marks are not a feed line
    expect(buildActivity(i, { branchIds: ["b1"] }).map((e) => e.kind)).toEqual(["attendance", "lead"])
    // a branch feed folds one class's marks into a single line; a student feed keeps the child's own line
    const two: ActivityInput = { ...i, attendance: [...i.attendance, { sessionId: "x1", studentId: "s2", status: "present", markedAt: "2026-11-27T10:00:00Z" }] }
    expect(buildActivity(two).filter((e) => e.kind === "attendance")).toHaveLength(1)
    expect(buildActivity(two, { studentId: "s1" }).filter((e) => e.kind === "attendance")).toHaveLength(1)
    expect(buildActivity(i, { studentId: "s2" }).map((e) => e.kind)).toEqual(["form"])
    expect(buildActivity(i, { familyId: "f1" }).map((e) => e.kind)).toEqual(["attendance"])
  })
})
