import { describe, expect, it } from "vitest"
import { buildSeed } from "../data/seed"
import { withLinkedFamilyDemo } from "./linked-demo"

// owner 2026-10-19: the owner's LINE family must see classes in the parent app opened from the Rich Menu
describe("demo classes for LINE-linked families", () => {
  const now = new Date("2026-10-19T09:00:00")
  const seed = buildSeed(now)
  const fam = seed.families.find((f) => seed.students.some((s) => s.familyId === f.id && s.archived && s.branchId === "br_thl"))!

  it("a linked family with nothing ahead gets an active child in 2 classes, with a package, check-ins and sent notes", () => {
    const db = withLinkedFamilyDemo({ ...seed, families: seed.families.map((f) => (f.id === fam.id ? { ...f, lineUserId: "Uowner" } : f)) }, now)
    const kid = db.students.find((s) => s.id === `stu_demo_${fam.id}`)!
    expect(kid).toBeTruthy()
    const ahead = db.sessions.filter((s) => s.studentIds.includes(kid.id) && s.date >= "2026-10-19")
    expect(new Set(ahead.map((s) => s.classId)).size).toBe(2)
    expect(db.entitlements.filter((e) => e.studentId === kid.id && e.to >= "2026-10-19").length).toBeGreaterThan(0)
    expect(db.attendance.some((a) => a.studentId === kid.id && a.status === "present")).toBe(true)
    expect(db.summaries.some((x) => x.studentId === kid.id && x.status === "sent")).toBe(true)
  })

  it("families without LINE, or already with classes ahead, are left alone", () => {
    expect(withLinkedFamilyDemo(seed, now).students.length).toBe(seed.students.length)
  })
})
