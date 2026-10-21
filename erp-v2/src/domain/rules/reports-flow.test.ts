import { describe, expect, it } from "vitest"
import { churnRate, courseFlow, coursesBought, leadSummary, returningBack, returningIn, trendMonths, type RevenueRow } from "./reports"

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

describe("churn rate", () => {
  it("Lost ÷ (active at the start + who came in) — never over 100% on a long period", () => {
    expect(churnRate(42, 27, 62)).toBeCloseTo(42 / 89)
    expect(churnRate(0, 0, 0)).toBeNull()
  })
})

describe("courses as their own section", () => {
  const students = [{ id: "s1" }]
  const classCourse = (_: string, cls: string) => (cls === "m" ? "math" : "eng")
  it("a course ended and not bought again is lost even if the student keeps another course", () => {
    const f = (today: string) => courseFlow({
      students, today, range: { from: "2026-10-01", to: "2026-10-31" }, sessions: [], attendance: [], leaves: [], classCourse,
      entitlements: [{ studentId: "s1", courseId: "math", from: "2026-07-01", to: "2026-09-15" }, { studentId: "s1", courseId: "eng", from: "2026-07-01", to: "2026-12-31" }],
    })
    const r = f("2026-10-20")
    expect(r).toMatchObject({ lost: 1, active: 1 }) // math lost on 15 Oct; eng still going
  })
  it("bought again after a gap = came back & bought; right after the end = renewed", () => {
    const r = courseFlow({
      students, today: "2026-10-31", range: { from: "2026-10-01", to: "2026-10-31" }, sessions: [], attendance: [], leaves: [], classCourse,
      entitlements: [
        { studentId: "s1", courseId: "math", from: "2026-06-01", to: "2026-08-15" }, { studentId: "s1", courseId: "math", from: "2026-10-05", to: "2026-12-31" },
        { studentId: "s1", courseId: "eng", from: "2026-08-01", to: "2026-10-03" }, { studentId: "s1", courseId: "eng", from: "2026-10-04", to: "2026-12-31" },
      ],
    })
    expect(r.returning).toBe(1)
    expect(r.renewal).toBe(1) // the eng renewal in October; math's loss fell in September
  })
  it("a course not studied for 3 sessions in a row is paused — the other one still attended is not", () => {
    const days = ["2026-10-06", "2026-10-13", "2026-10-20"]
    const sessions = [...days.map((date, i) => ({ id: `m${i}`, classId: "m", date, start: "16:00", studentIds: ["s1"], cancelled: false })), ...days.map((date, i) => ({ id: `e${i}`, classId: "e", date, start: "17:00", studentIds: ["s1"], cancelled: false }))]
    const attendance = [...days.map((_, i) => ({ sessionId: `m${i}`, studentId: "s1", status: "present" as const })), ...days.map((_, i) => ({ sessionId: `e${i}`, studentId: "s1", status: "leave" as const }))]
    const r = courseFlow({
      students, today: "2026-10-21", range: { from: "2026-10-01", to: "2026-10-31" }, sessions, attendance, leaves: [], classCourse,
      entitlements: [{ studentId: "s1", courseId: "math", from: "2026-09-01", to: "2026-12-31" }, { studentId: "s1", courseId: "eng", from: "2026-09-01", to: "2026-12-31" }],
    })
    expect(r).toMatchObject({ active: 1, paused: 1 })
  })
})

describe("the 12-month trend (owner 2026-10-21)", () => {
  it("the last 12 months, the one in progress ending today", () => {
    const m = trendMonths("2026-10-21")
    expect(m).toHaveLength(12)
    expect(m[0]).toMatchObject({ key: "2025-11", month: 10, range: { from: "2025-11-01", to: "2025-11-30" } })
    expect(m[11].range).toEqual({ from: "2026-10-01", to: "2026-10-21" })
  })
  it("a course back after a break counts in the month it came back, not the month before", () => {
    const b = returningBack({ sessions: sess("m"), attendance: att("m", ["present", "leave", "leave", "absent", "leave", "present", "present"]), leaves: [], entitlements: ents })
    expect(b.in({ from: "2026-10-01", to: "2026-10-31" })).toEqual({ students: 1, courses: 1 })
    expect(b.in({ from: "2026-09-01", to: "2026-09-30" })).toEqual({ students: 0, courses: 0 })
  })
  it("a course is paused on a day inside its break (3+ missed by then), active again once back", () => {
    const days = ["2026-08-11", "2026-08-18", "2026-08-25", "2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29"]
    const sessions = days.map((date, i) => ({ id: `m${i}`, classId: "m", date, start: "16:00", studentIds: ["s1"], cancelled: false }))
    const attendance = days.map((_, i) => ({ sessionId: `m${i}`, studentId: "s1", status: (i >= 1 && i <= 4 ? "leave" : "present") as "leave" | "present" }))
    const f = courseFlow({
      students: [{ id: "s1" }], today: "2026-10-21", range: { from: "2026-10-01", to: "2026-10-31" }, sessions, attendance, leaves: [], classCourse: () => "math",
      entitlements: [{ studentId: "s1", courseId: "math", from: "2026-08-01", to: "2026-12-31" }],
    })
    expect(f.on("2026-08-31")).toEqual({ active: 1, paused: 0 }) // only 2 missed so far
    expect(f.on("2026-09-05")).toEqual({ active: 0, paused: 1 })
    expect(f.on("2026-09-30")).toEqual({ active: 1, paused: 0 })
  })
})
