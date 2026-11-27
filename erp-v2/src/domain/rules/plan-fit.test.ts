import { describe, expect, it } from "vitest"
import { planFit } from "./plan-fit"

const base = { cancelled: false, rescheduledIn: undefined, rescheduledOut: undefined, changed: undefined }
const range = { from: "2026-11-01", to: "2026-11-30" }

describe("plan fit", () => {
  it("splits what happened to every student-seat: planned · moved · shifted · leave · cancelled", () => {
    const sessions = [
      { ...base, id: "a", date: "2026-11-02", studentIds: ["s1", "s2", "s3", "s4"] },                                          // s2 on leave
      { ...base, id: "b", date: "2026-11-03", studentIds: ["s5", "s6"], rescheduledOut: [{ studentId: "s9", toSessionId: "c" }] }, // s9 moved away
      { ...base, id: "c", date: "2026-11-04", studentIds: ["s9"], rescheduledIn: ["s9"] },                                      // arrival: not counted again
      { ...base, id: "d", date: "2026-11-05", studentIds: ["s1", "s2"], changed: { at: "x", by: "u", what: "ย้ายคาบ" } },       // the session moved
      { ...base, id: "e", date: "2026-11-06", studentIds: ["s1"], cancelled: true },                                          // cancelled
      { ...base, id: "f", date: "2026-12-02", studentIds: ["s1"] },                                                           // outside the period
    ]
    const r = planFit(sessions, [{ sessionId: "a", studentId: "s2", status: "leave" }, { sessionId: "d", studentId: "s1", status: "leave" }], range)
    expect(r.total).toBe(4 + 3 + 0 + 2 + 1)
    expect(r).toMatchObject({ leave: 2, moved: 1, shifted: 1, cancelled: 1 })
    expect(r.planned).toBe(10 - 2 - 1 - 1 - 1)
    expect(r.delivered).toBe(r.planned + 1 + 1)
    expect(r.rate).toBeCloseTo(5 / 10)
    expect(r.deliveredRate).toBeCloseTo(7 / 10)
  })
  it("no sessions: no rate", () => {
    expect(planFit([], [], range).rate).toBeNull()
    expect(planFit([], [], range).deliveredRate).toBeNull()
  })
})
