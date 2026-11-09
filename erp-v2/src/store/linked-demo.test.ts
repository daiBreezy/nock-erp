import { describe, expect, it } from "vitest"
import { buildSeed } from "../data/seed"
import { parentView } from "../domain/rules/parent-view"
import { withLinkedCourseSummary, withLinkedFamilyDemo } from "./linked-demo"

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

  it("the demo child also gets LONG session notes and a sent, long course summary (owner 2026-11-09)", () => {
    const db = withLinkedFamilyDemo({ ...seed, families: seed.families.map((f) => (f.id === fam.id ? { ...f, lineUserId: "Uowner" } : f)) }, now)
    const kid = db.students.find((s) => s.id === `stu_demo_${fam.id}`)!
    const notes = db.summaries.filter((x) => x.studentId === kid.id && x.status === "sent")
    expect(notes.some((n) => n.text.split("\n").length >= 3 && n.text.length > 200)).toBe(true)
    const cs = (db.courseSummaries ?? []).find((c) => c.studentId === kid.id)!
    expect(cs.status).toBe("sent")
    expect(cs.overallProgress.split("\n").length).toBeGreaterThanOrEqual(4)
    expect(db.entitlements.some((e) => e.id === cs.entitlementId)).toBe(true)
  })

  it("families without LINE, or already with classes ahead, are left alone", () => {
    expect(withLinkedFamilyDemo(seed, now).students.length).toBe(seed.students.length)
  })

  it("withLinkedCourseSummary: a LINE-linked family that has courses but no sent Course Summary gets one — saved data kept, idempotent (owner 2026-11-09, Breezy)", () => {
    // a family WITH classes ahead (the demo rule skips it) — pick one that has an entitlement
    const withEnt = seed.families.find((f) => seed.students.some((x) => x.familyId === f.id && !x.archived && seed.entitlements.some((e) => e.studentId === x.id)))!
    const base = { ...seed, courseSummaries: [] as typeof seed.courseSummaries, families: seed.families.map((f) => (f.id === withEnt.id ? { ...f, lineUserId: "Ubreezy" } : f)) }
    const once = withLinkedCourseSummary(base, now)
    const mine = (once.courseSummaries ?? []).filter((c) => c.status === "sent" && seed.students.some((x) => x.id === c.studentId && x.familyId === withEnt.id))
    expect(mine.length).toBe(1)
    expect(mine[0].overallProgress.split("\n").length).toBeGreaterThanOrEqual(4)
    expect(withLinkedCourseSummary(once, now).courseSummaries?.length).toBe(once.courseSummaries?.length)
    // families without LINE are left alone
    expect(withLinkedCourseSummary({ ...seed, courseSummaries: [] as typeof seed.courseSummaries }, now).courseSummaries?.length).toBe(0)
  })

  it("the Course Summary reaches the parent's view (what the Rich Menu app reads)", () => {
    const withEnt = seed.families.find((f) => seed.students.some((x) => x.familyId === f.id && !x.archived && seed.entitlements.some((e) => e.studentId === x.id)))!
    const db = withLinkedCourseSummary({ ...seed, courseSummaries: [] as typeof seed.courseSummaries, families: seed.families.map((f) => (f.id === withEnt.id ? { ...f, lineUserId: "Ubreezy" } : f)) }, now)
    const fam = db.families.find((f) => f.id === withEnt.id)!
    const view = parentView(fam, { students: db.students, branches: db.branches, sessions: db.sessions, classes: db.classes, staff: db.staff, attendance: db.attendance, summaries: db.summaries, entitlements: db.entitlements, courses: db.courses, invoices: db.invoices, busAddOns: db.busAddOns, now, courseSummaries: db.courseSummaries })
    expect(view.children.flatMap((c) => c.courseSummaries).length).toBeGreaterThanOrEqual(1)
    expect(view.children.flatMap((c) => c.courseSummaries)[0].overallProgress.split("\n").length).toBeGreaterThanOrEqual(4)
  })
})
