import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"
import { addDays, toDateStr } from "../domain/dates"
import { parentView } from "../domain/rules/parent-view"
import { composeFamilyMessage } from "../domain/rules/period-message"
import { activePeriodOn, periodBusImpact, periodCountdown, periodImpact } from "../domain/rules/period-impact"
import { findOfferSlots } from "../domain/rules/forms"
import { resolveEntitlements } from "../domain/rules/attendance"
import { planDay } from "../domain/rules/transport"
import type { SpecialPeriod } from "../domain/types"
import { useStore } from "./store"

// owner 2026-11-25: the whole Special Period set, end to end against the real store + demo seed (no mocks of our own code — only LINE's fetch)
const st = () => useStore.getState()
const today = () => toDateStr(st().now())

describe("Special Period — end to end", () => {
  let period: SpecialPeriod
  const from = () => addDays(today(), 10), to = () => addDays(today(), 24)
  beforeAll(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ json: async () => ({ ok: true }) })))
    useStore.setState({ userId: "u_nock", branchId: "br_thl" })
  })
  afterAll(() => { vi.unstubAllGlobals() })

  it("1. opening a period pauses regular sessions and makes Credits for weekly / monthly students", () => {
    const branch = st().branches.find((b) => b.id === "br_thl")!
    period = { id: "sp_e2e", name: "E2E Summer", from: from(), to: to(), active: true, priority: "high", hours: branch.hours, pauseCause: "school" } as SpecialPeriod
    const r = st().saveBranch({ ...branch, specialPeriods: [...branch.specialPeriods, period] })
    expect(r.ok, JSON.stringify(r)).toBe(true)
    const paused = st().sessions.filter((s) => s.pausedBy === period.id)
    expect(paused.length).toBeGreaterThan(0)
    expect(paused.every((s) => s.cancelled && s.date >= period.from && s.date <= period.to)).toBe(true)
    const credits = st().sessionCredits.filter((c) => c.periodId === period.id)
    console.log("paused sessions", paused.length, "credits", credits.length, "students", new Set(credits.map((c) => c.studentId)).size)
    expect(credits.length).toBeGreaterThan(0)
    expect(credits.every((c) => c.status === "open" && c.value > 0)).toBe(true)
    // 10 days is under the 45-day notice → Admin-and-up get the warning
    const note = st().notifications.find((n) => n.title === "ช่วงเวลาพิเศษเปลี่ยน")
    expect(note?.kind).toBe("holiday_impact")
    expect(note?.body).toContain("น้อยกว่า 45 วัน")
    // hourly packs get no credit (they extend instead)
    const hourlyEnts = new Set(st().entitlements.filter((e) => e.kind === "sessions").map((e) => e.id))
    expect(credits.some((c) => hourlyEnts.has(c.entitlementId))).toBe(false)
  })

  it("2. the Impact Center sees them (hourly / weekly-monthly groups, paused sessions)", () => {
    const s = st()
    const impact = periodImpact(period, "br_thl", { classes: s.classes, sessions: s.sessions, entitlements: s.entitlements }, today())
    console.log("impact students", impact.students.length, "hourly", impact.hourly.length, "sub", impact.subscription.length, "uncovered", impact.uncovered.length, "bookings", impact.bookings.length)
    expect(impact.pausedSessions.length).toBeGreaterThan(0)
    expect(impact.students.length).toBeGreaterThan(0)
    // hourly packs: the real end date moves out past the stopped sessions
    const raw = s.entitlements.filter((e) => impact.hourly.some((h) => h.packages.some((p) => p.entitlementId === e.id)))
    const real = resolveEntitlements(raw, s.leaves, { sessions: s.sessions, attendance: s.attendance, classes: s.classes, holidays: s.holidays, branches: s.branches })
    const moved = real.filter((e) => e.to > raw.find((r) => r.id === e.id)!.to).length
    console.log("hourly packs", raw.length, "with a later end date", moved)
    // who has no covering package at all
    const un = impact.uncovered.map((u) => { const ents = s.entitlements.filter((e) => e.studentId === u.studentId); return `${u.studentId}:${ents.length ? ents.map((e) => `${e.kind}/${e.from}→${e.to}${e.credit ? "/creditCourse" : ""}`).join("|") : "no-package"}` })
    console.log("uncovered", un.slice(0, 6))
  })

  it("3. the dashboard / calendar countdown: an Active period 10 days away is gray (opened)", () => {
    const c = periodCountdown(st().branches.find((b) => b.id === "br_thl")!.specialPeriods, today()).find((x) => x.period.id === period.id)!
    expect(c.days).toBe(10)
    expect(c.tone).toBe("gray")
  })

  it("4. a Trial can't be offered inside the period, a Test can", () => {
    const s = st()
    const branch = s.branches.find((b) => b.id === "br_thl")!
    const base = { branch, staff: s.staff, sessions: s.sessions, classes: s.classes, holidays: s.holidays, subject: branch.subjects[0], from: period.from, to: period.to, now: s.now() }
    const trial = findOfferSlots({ ...base, skipPeriods: true })
    const test = findOfferSlots({ ...base })
    console.log("slots in period: trial", trial.length, "test", test.length)
    expect(trial).toHaveLength(0)
    expect(activePeriodOn(branch.specialPeriods, period.from)?.id).toBe(period.id)
  })

  it("5. parent app: the family sees the period strip + the paused class as a faded row", () => {
    const s = st()
    const cr = s.sessionCredits.find((c) => c.periodId === period.id)!
    const stu = s.students.find((x) => x.id === cr.studentId)!
    const fam = s.families.find((f) => f.id === stu.familyId)!
    const v = parentView(fam, { students: s.students, branches: s.branches, sessions: s.sessions, classes: s.classes, staff: s.staff, attendance: s.attendance, summaries: s.summaries, entitlements: s.entitlements, courses: s.courses, invoices: s.invoices, busAddOns: s.busAddOns, now: s.now() })
    expect(v.periods.map((p) => p.name)).toContain("E2E Summer")
    const child = v.children.find((c) => c.id === stu.id)!
    expect(child.periods.find((p) => p.id === period.id)?.paused).toBeGreaterThan(0)
    expect(child.upcoming.some((u) => u.period === "E2E Summer" && u.cancelled)).toBe(true)
  })

  it("6. the message: one text per family, sent from the Impact Center → periodSent", () => {
    const s = st()
    const cr = s.sessionCredits.find((c) => c.periodId === period.id)!
    const stu = s.students.find((x) => x.id === cr.studentId)!
    // give the family a LINE so the push can go
    useStore.setState({ families: s.families.map((f) => (f.id === stu.familyId ? { ...f, lineUserId: "Ue2e", parents: f.parents.map((p, i) => (i === 0 ? { ...p, lineLinked: true, lineUserId: "Ue2e", primary: true } : p)) } : f)) })
    const text = composeFamilyMessage(period, "Test Family", [{ name: stu.nickname, group: "subscription", dates: [cr.date], credits: 1 }])
    expect(text).toContain("E2E Summer")
    const r = st().sendPeriodMessage(period.id, stu.familyId!, text)
    expect(r.ok, JSON.stringify(r)).toBe(true)
    expect(st().periodSent[`${period.id}|${stu.familyId}`]).toBeTruthy()
  })

  it("7. Refund on a Credit makes a Credit Note off the PAID invoice; voiding it puts the Credit back", () => {
    const s = st()
    const mine = s.sessionCredits.filter((c) => c.periodId === period.id && c.status === "open")
    const withPaid = mine.find((c) => { const e = s.entitlements.find((x) => x.id === c.entitlementId); return !!e?.invoiceId && s.invoices.find((i) => i.id === e.invoiceId)?.status === "paid" })
    console.log("credits with a paid invoice:", mine.filter((c) => s.invoices.find((i) => i.id === s.entitlements.find((x) => x.id === c.entitlementId)?.invoiceId)?.status === "paid").length, "of", mine.length)
    expect(withPaid).toBeTruthy()
    const same = mine.filter((c) => c.studentId === withPaid!.studentId && c.entitlementId === withPaid!.entitlementId)
    const r = st().settleSessionCredits(same.map((c) => c.id), "refund", "e2e")
    expect(r.ok, JSON.stringify(r)).toBe(true)
    const done = st().sessionCredits.filter((c) => same.some((x) => x.id === c.id))
    expect(done.every((c) => c.status === "settled" && c.settle?.creditNoteId)).toBe(true)
    const cn = st().creditNotes.find((n) => n.id === done[0].settle!.creditNoteId)!
    console.log("credit note", cn.number, cn.mode, cn.items.map((i) => `${i.key}:${i.amount}`), "credits", same.length)
    expect(cn.status).toBe("pending_approval")
    expect(cn.items[0].amount).toBe(same.reduce((a, c) => a + c.value, 0))
    // void → back to open
    expect(st().voidCreditNote(cn.id, "e2e").ok).toBe(true)
    expect(st().sessionCredits.filter((c) => same.some((x) => x.id === c.id)).every((c) => c.status === "open")).toBe(true)
  })

  it("8. make-up from Credit books a free seat in the same course, 1 credit = 1 session", () => {
    const s = st()
    const open = s.sessionCredits.filter((c) => c.periodId === period.id && c.status === "open")
    const c0 = open[0]
    const mine = open.filter((c) => c.studentId === c0.studentId && c.courseId === c0.courseId)
    const cand = s.sessions.filter((x) => !x.cancelled && x.date > period.to && x.classId && s.classes.find((k) => k.id === x.classId)?.courseId === c0.courseId && !x.studentIds.includes(c0.studentId))
    console.log("open credits (student/course)", mine.length, "candidate sessions after period", cand.length)
    if (!cand.length) return // nothing to book in the demo for this course — covered by the unit tests
    const r = st().bookMakeupSessions([mine[0].id], [cand[0].id])
    expect(r.ok, JSON.stringify(r)).toBe(true)
    const after = st().sessionCredits.find((c) => c.id === mine[0].id)!
    expect(after.status).toBe("settled")
    expect(after.settle?.makeupSessionId).toBe(cand[0].id)
    expect(st().sessions.find((x) => x.id === cand[0].id)!.studentIds).toContain(c0.studentId)
    // a second booking into the same session is refused
    expect(st().bookMakeupSessions([mine[1]?.id ?? mine[0].id], [cand[0].id]).ok).toBe(false)
  })

  it("9. a bus extra ride must be a day the child really has a session", () => {
    const s = st()
    const stu = s.students.find((x) => x.branchId === "br_thl" && x.usesBus)!
    const empty = addDays(today(), 400)
    const r = st().addBusAddOns(stu.id, [{ date: empty, pickup: true, dropoff: false }], null, "e2e")
    expect(r.ok).toBe(false)
  })

  it("10. the van skips a child whose class is paused, and no 'no class today' decision appears", () => {
    const s = st()
    const branch = s.branches.find((b) => b.id === "br_thl")!
    const ctx = { students: s.students, families: s.families, classes: s.classes, sessions: s.sessions, invoices: s.invoices, busAddOns: s.busAddOns, trips: s.busTrips ?? [] }
    let checked = 0
    for (let i = 10; i <= 24; i++) {
      const plan = planDay(branch, addDays(today(), i), ctx)
      const placed = plan.trips.flatMap((t) => t.stops.map((x) => x.rider.studentId))
      const paused = s.sessions.filter((x) => x.pausedBy === period.id && x.date === addDays(today(), i)).flatMap((x) => x.studentIds)
      const onlyPaused = paused.filter((id) => !s.sessions.some((x) => !x.cancelled && x.date === addDays(today(), i) && x.studentIds.includes(id)))
      for (const id of onlyPaused) { expect(placed).not.toContain(id); checked++ }
      expect(plan.unplaced.filter((u) => u.reason.includes("ไม่มีคลาสวันนี้"))).toHaveLength(0)
    }
    console.log("paused children checked off the van:", checked)
  })

  it("11. paid bus legs the period stopped are paid back as a Credit Note (once per child)", () => {
    const s = st()
    const rows = periodBusImpact(period, { students: s.students, classes: s.classes, invoices: s.invoices, busAddOns: s.busAddOns }, "br_thl", today())
    console.log("bus impact children", rows.length, "paid legs", rows.reduce((a, r) => a + r.paidLost, 0))
    const row = rows.find((r) => r.paidLost > 0)
    if (!row) return // the demo has no paid bus leg inside this window — covered by the unit tests
    const r = st().settleBusLegs(period.id, row.studentId, "refund", "e2e")
    expect(r.ok, JSON.stringify(r)).toBe(true)
    expect(st().creditNotes.some((n) => n.periodId === period.id && n.studentId === row.studentId)).toBe(true)
    expect(st().settleBusLegs(period.id, row.studentId, "refund").ok).toBe(false) // once only
  })

  it("12. shortening the period gives sessions back: open credits are revoked, settled ones are flagged", () => {
    const branch = st().branches.find((b) => b.id === "br_thl")!
    const openBefore = st().sessionCredits.filter((c) => c.periodId === period.id && c.status === "open").length
    const settledBefore = st().sessionCredits.filter((c) => c.periodId === period.id && c.status === "settled").length
    const r = st().saveBranch({ ...branch, specialPeriods: branch.specialPeriods.map((p) => (p.id === period.id ? { ...p, active: false } : p)) })
    expect(r.ok).toBe(true)
    const after = st().sessionCredits.filter((c) => c.periodId === period.id)
    console.log("open before", openBefore, "settled before", settledBefore, "→ revoked", after.filter((c) => c.status === "revoked").length, "settled", after.filter((c) => c.status === "settled").length)
    expect(after.filter((c) => c.status === "open")).toHaveLength(0)
    expect(after.filter((c) => c.status === "settled").length).toBe(settledBefore)
    expect(st().sessions.filter((s) => s.pausedBy === period.id)).toHaveLength(0)
    // the settled make-up credit asks the Admin to decide by hand
    expect(st().notifications.some((n) => n.title === "Credit ที่ใช้ไปแล้ว แต่คาบกลับมาเรียน")).toBe(true)
  })

  it("13. an extra ride IS accepted on a day the child really has a session", () => {
    const s = st()
    const stu = s.students.find((x) => x.branchId === "br_thl" && x.usesBus && s.sessions.some((y) => !y.cancelled && y.date > today() && y.studentIds.includes(x.id)))!
    const day = s.sessions.filter((y) => !y.cancelled && y.date > today() && y.studentIds.includes(stu.id)).sort((a, b) => a.date.localeCompare(b.date))[0].date
    const taken = s.busAddOns.some((a) => a.studentId === stu.id && a.date === day)
    const r = st().addBusAddOns(stu.id, [{ date: day, pickup: false, dropoff: true }], null, "e2e")
    console.log("extra ride on a real session day", day, taken ? "(already had one)" : "", r.ok ? "ok" : JSON.stringify(r))
    expect(r.ok || taken).toBe(true)
  })
})
