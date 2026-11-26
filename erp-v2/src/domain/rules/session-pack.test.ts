import { describe, expect, it } from "vitest"
import { quoteCourse } from "./billing"
import { defaultLeaveQuota, durationLabel, durationsOf, leaveQuotaFor } from "./settings"

// owner 2026-11-26: the Session package — N class sessions, one off per session attended whatever its length
const pack = { unit: "session", duration: 10, price: 5000 } as never
const mon = { id: "k1", weekday: 1, minutes: 60, branchId: "b1", start: "16:00" }
const wed90 = { id: "k2", weekday: 3, minutes: 90, branchId: "b1", start: "17:00" }
const quote = (klasses: never[], periods = 1) => {
  const r = quoteCourse({ course: pack, klasses, startDate: "2027-01-04", periods, holidays: [] })
  if (!r.ok) throw new Error(r.error)
  return r.value
}

describe("Session package", () => {
  it("buys exactly N sessions, however long each one is", () => {
    const v = quote([mon, wed90] as never[])
    expect(v.sessions).toHaveLength(10)
    expect(v.total).toBe(5000)
    // 60-min and 90-min sessions both count as ONE — hours are just what the sessions add up to
    expect(v.hours).toBe(5 * 1 + 5 * 1.5)
  })
  it("two packs = 2 × N sessions and 2 × the price", () => {
    const v = quote([mon] as never[], 2)
    expect(v.sessions).toHaveLength(20)
    expect(v.total).toBe(10000)
  })
  it("the pack ends on the date of its last session", () => {
    const v = quote([mon] as never[])
    expect(v.to).toBe(v.sessions[9])
  })
  it("settings: label, sizes and the leave quota follow the Hourly rule (every 4 sessions = 1 leave)", () => {
    expect(durationLabel("session", 10)).toBe("10 คาบ")
    expect(durationsOf({ packageDurations: { hour: [], week: [] } } as never, "session")).toEqual([10, 20])
    expect(defaultLeaveQuota("session", 10)).toBe(2)
    expect(leaveQuotaFor({} as never, "session", 20, 2, 40)).toBe(10)
  })
})
