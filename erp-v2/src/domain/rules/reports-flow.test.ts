import { describe, expect, it } from "vitest"
import { coursesBought, leadSummary, returningIn, type RevenueRow } from "./reports"

// owner 2026-10-20: Reports › Overview — returning students / courses, courses bought, the lead section
const R = { from: "2026-10-01", to: "2026-10-31" }
const days = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29", "2026-10-06", "2026-10-13"]
const sess = (cls: string, ds = days) => ds.map((date, i) => ({ id: `${cls}${i}`, classId: cls, date, start: "16:00", studentIds: ["s1"], cancelled: false }))
const att = (cls: string, statuses: string[]) => statuses.map((status, i) => ({ sessionId: `${cls}${i}`, studentId: "s1", status: status as "present" | "leave" | "absent" }))
const ents = [{ studentId: "s1", courseId: "math", classIds: ["m"] }, { studentId: "s1", courseId: "eng", classIds: ["e"] }]

describe("returning (3+ sessions missed in a row, then back)", () => {
  it("a long leave then back in the period = a returning student and a returning course", () => {
    const r = returningIn({ sessions: sess("m"), attendance: att("m", ["present", "leave", "leave", "absent", "leave", "present", "present"]), leaves: [], entitlements: ents, range: R })
    expect(r).toEqual({ students: 1, courses: 1 })
  })
  it("only 2 missed is not a break", () => {
    const r = returningIn({ sessions: sess("m"), attendance: att("m", ["present", "present", "present", "leave", "leave", "present", "present"]), leaves: [], entitlements: ents, range: R })
    expect(r).toEqual({ students: 0, courses: 0 })
  })
  it("two courses, one put on hold while the other went on — a returning course, not a returning student", () => {
    const r = returningIn({
      sessions: [...sess("m"), ...sess("e")], leaves: [], entitlements: ents, range: R,
      attendance: [...att("m", ["present", "present", "present", "present", "present", "present", "present"]), ...att("e", ["present", "leave", "leave", "leave", "leave", "present", "present"])],
    })
    expect(r).toEqual({ students: 0, courses: 1 })
  })
  it("back after a Pause on record = a returning student", () => {
    const r = returningIn({ sessions: sess("m"), attendance: att("m", ["present", "present", "present", "present", "present", "present", "present"]), leaves: [{ studentId: "s1", from: "2026-09-23", to: "2026-10-02" }], entitlements: ents, range: R })
    expect(r.students).toBe(1)
  })
})

describe("courses bought and leads", () => {
  it("counts paid course lines in the period, not credit notes", () => {
    const row = (date: string, n: number, credit = false) => ({ date, credit, lines: Array.from({ length: n }, () => ({ amount: credit ? -100 : 100 })) }) as unknown as RevenueRow
    expect(coursesBought([row("2026-10-05", 2), row("2026-10-20", 1), row("2026-09-30", 3), row("2026-10-21", 1, true)], R)).toBe(3)
  })
  it("total, test, trial, conversion — and per staff member", () => {
    const l = (stage: string, assigneeId: string | null, direct = false) => ({ stage, assigneeId, direct, createdAt: "2026-10-10T09:00:00Z" }) as never
    const s = leadSummary([l("new", "a"), l("tested", "a"), l("trialed", "b"), l("enrolled", "b"), l("enrolled", "b", true), l("archived", null)], R)
    expect(s).toMatchObject({ total: 6, test: 3, trial: 2, enrolled: 2 })
    expect(s.conversion).toBeCloseTo(2 / 6)
    expect(s.members[0]).toMatchObject({ staffId: "b", leads: 3, enrolled: 2 })
  })
})
