// Reports (owner 2026-10-01) — every number on the Reports page comes from here, built only from real records
// (paid invoices, credit notes, entitlements, leaves, sessions, attendance). No stored totals: Dev can run the same
// definitions as SQL. Definitions agreed with the owner:
// - Revenue = money in, on the day it came in (same as the Sales Tax report), minus approved credit notes
// - Active = an entitlement covers the date · on long leave = Pause (counted apart)
// - New = the student's first paid invoice ever falls in the period (old-system students are never "new")
// - Lost = an entitlement ended and nothing new started within 30 days (known only 30 days after the end)
// - Attendance rate = present ÷ (present + leave) of sessions already over, cancelled ones left out
// - A multi-subject course splits its money evenly across its subjects (no per-subject minutes recorded yet)

import { addDays, parseDate, toDateStr, toMinutes, weekdayOf } from "../dates"
import type { Attendance, Branch, Course, CreditNote, DateStr, Entitlement, Family, ID, Invoice, Klass, Lead, Session, Student, StudentLeave, Weekday } from "../types"
import { receiptDate } from "./documents"
import type { InvoiceTotals } from "./billing"

export const LOST_AFTER_DAYS = 30

// ---------- periods ----------

export type PeriodKey = "today" | "week" | "month" | "3m" | "6m" | "1y" | "ytd"
export interface Range { from: DateStr; to: DateStr }

export const PERIODS: { key: PeriodKey; label: string; short: string }[] = [
  { key: "today", label: "วันนี้", short: "วันนี้" },
  { key: "week", label: "สัปดาห์นี้", short: "สัปดาห์" },
  { key: "month", label: "เดือนนี้", short: "เดือน" },
  { key: "3m", label: "3 เดือน", short: "3M" },
  { key: "6m", label: "6 เดือน", short: "6M" },
  { key: "1y", label: "1 ปี", short: "1Y" },
  { key: "ytd", label: "ตั้งแต่ต้นปี", short: "YTD" },
]

const shiftMonths = (d: DateStr, n: number) => {
  const x = parseDate(d)
  const day = x.getDate()
  x.setDate(1)
  x.setMonth(x.getMonth() + n)
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()
  x.setDate(Math.min(day, last))
  return toDateStr(x)
}

export function periodRange(key: PeriodKey, today: DateStr): Range {
  switch (key) {
    case "today": return { from: today, to: today }
    case "week": { const wd = weekdayOf(today); return { from: addDays(today, wd === 0 ? -6 : 1 - wd), to: today } }
    case "month": return { from: today.slice(0, 8) + "01", to: today }
    case "3m": return { from: addDays(shiftMonths(today, -3), 1), to: today }
    case "6m": return { from: addDays(shiftMonths(today, -6), 1), to: today }
    case "1y": return { from: addDays(shiftMonths(today, -12), 1), to: today }
    case "ytd": return { from: today.slice(0, 4) + "-01-01", to: today }
  }
}

export const daysIn = (r: Range) => Math.round((parseDate(r.to).getTime() - parseDate(r.from).getTime()) / 86_400_000) + 1

/** What each period is compared with (owner: not "MoM" on every card) — YTD against the same dates last year. */
export function compareRange(key: PeriodKey, r: Range): Range {
  if (key === "ytd") return { from: shiftMonths(r.from, -12), to: shiftMonths(r.to, -12) }
  if (key === "month") { const from = shiftMonths(r.from, -1); return { from, to: shiftMonths(r.to, -1) } }
  return { from: addDays(r.from, -daysIn(r)), to: addDays(r.from, -1) }
}

export const COMPARE_LABEL: Record<PeriodKey, string> = {
  today: "vs เมื่อวาน", week: "vs สัปดาห์ก่อน", month: "vs ช่วงเดียวกันเดือนก่อน", "3m": "vs 3 เดือนก่อนหน้า",
  "6m": "vs 6 เดือนก่อนหน้า", "1y": "vs ปีก่อนหน้า", ytd: "vs ช่วงเดียวกันปีที่แล้ว",
}

export const inRange = (d: DateStr, r: Range) => r.from <= d && d <= r.to

/** % change, null when there is nothing to compare with (never a fake +100%). `since` = the first day the system
 *  has data (go-live or the oldest imported record): a comparison period starting before it is incomplete → null. */
export function change(now: number, before: number, compared?: Range, since?: DateStr | null): number | null {
  if (!before) return null
  if (compared && (!since || compared.from < since)) return null
  return Math.round(((now - before) / Math.abs(before)) * 1000) / 10
}

// ---------- revenue ----------

export interface RevenueLine { courseId: ID; subjects: string[]; amount: number; packageKey: string; grade: string; units: number }
export interface RevenueRow {
  date: DateStr
  branchId: ID
  studentId: ID
  invoiceId: ID
  /** tuition after promotions, concessions and credits used · bus · entry/mock fees · books */
  tuition: number; bus: number; advance: number; book: number
  total: number
  /** course lines (tuition split by course) — credit-note rows carry the refunded courses as negative lines */
  lines: RevenueLine[]
  credit?: boolean
}

export const packageKey = (c: Pick<Course, "unit" | "duration">) => `${c.duration}${c.unit === "hour" ? "h" : c.unit === "week" ? "w" : "m"}`
export const packageLabel = (key: string) => key.replace(/h$/, " ชม.").replace(/w$/, " สัปดาห์").replace(/m$/, " เดือน")

/**
 * One row per paid invoice (on its payment date) and one negative row per approved credit note (on its date) —
 * the same events as the Sales Tax report, so the two always agree.
 */
export function revenueRows(ctx: {
  invoices: Invoice[]; creditNotes: CreditNote[]; courses: Course[]; students: Pick<Student, "id" | "grade">[]
  totalsOf: (inv: Invoice) => InvoiceTotals
}): RevenueRow[] {
  const grade = (id: ID) => ctx.students.find((s) => s.id === id)?.grade ?? "—"
  const rows: RevenueRow[] = []
  for (const inv of ctx.invoices) {
    if (inv.status !== "paid") continue
    const date = receiptDate(inv)
    if (!date) continue
    const t = ctx.totalsOf(inv)
    const tuition = t.course + t.courseFee - t.promotion - t.concession - t.credit
    // concessions/credits come off the course lines in proportion, so subject and package totals add up to tuition
    const gross = t.lines.reduce((a, l) => a + l.amount + l.courseFee - l.promotion, 0)
    const lines = t.lines.filter((l) => l.course).map((l) => {
      const own = l.amount + l.courseFee - l.promotion
      return { courseId: l.course!.id, subjects: l.course!.subjects, amount: gross ? (own / gross) * tuition : 0, packageKey: packageKey(l.course!), grade: grade(inv.studentId), units: l.line.periods }
    })
    rows.push({ date, branchId: inv.branchId, studentId: inv.studentId, invoiceId: inv.id, tuition, bus: t.bus + t.busExtra, advance: t.advance, book: t.book, total: t.total, lines })
  }
  for (const n of ctx.creditNotes) {
    if (n.status !== "approved") continue
    const amount = n.items.reduce((a, x) => a + x.amount, 0)
    const lines = n.items.filter((x) => x.courseId).map((x) => {
      const c = ctx.courses.find((y) => y.id === x.courseId)
      return { courseId: x.courseId!, subjects: c?.subjects ?? [], amount: -x.amount, packageKey: c ? packageKey(c) : "—", grade: grade(n.studentId), units: 0 }
    })
    rows.push({ date: n.createdAt.slice(0, 10), branchId: n.branchId, studentId: n.studentId, invoiceId: n.invoiceId, tuition: -amount, bus: 0, advance: 0, book: 0, total: -amount, lines, credit: true })
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date))
}

const sum = <T,>(xs: T[], f: (x: T) => number) => xs.reduce((a, x) => a + f(x), 0)

export function revenueIn(rows: RevenueRow[], r: Range) {
  const xs = rows.filter((x) => inRange(x.date, r))
  return {
    total: sum(xs, (x) => x.total), tuition: sum(xs.filter((x) => !x.credit), (x) => x.tuition), credit: -sum(xs.filter((x) => x.credit), (x) => x.total),
    bus: sum(xs, (x) => x.bus), advance: sum(xs, (x) => x.advance), book: sum(xs, (x) => x.book),
    invoices: xs.filter((x) => !x.credit).length, students: new Set(xs.filter((x) => !x.credit).map((x) => x.studentId)).size,
  }
}

/** Revenue per calendar month of a year (Jan…Dec), months after `upTo` left null (not zero). */
export function monthlyRevenue(rows: RevenueRow[], year: number, upTo: DateStr): (number | null)[] {
  return Array.from({ length: 12 }, (_, m) => {
    const from = `${year}-${String(m + 1).padStart(2, "0")}-01`
    if (from > upTo) return null
    return sum(rows.filter((x) => x.date.startsWith(from.slice(0, 7))), (x) => x.total)
  })
}

export function revenueByBranch(rows: RevenueRow[], r: Range, branches: Pick<Branch, "id" | "name">[]) {
  const total = sum(rows.filter((x) => inRange(x.date, r)), (x) => x.total)
  return branches
    .map((b) => { const amount = sum(rows.filter((x) => x.branchId === b.id && inRange(x.date, r)), (x) => x.total); return { id: b.id, name: b.name, amount, share: total ? amount / total : 0 } })
    .sort((a, b) => b.amount - a.amount)
}

/** Subject Engine: tuition per subject; a multi-subject course splits evenly. */
export function revenueBySubject(rows: RevenueRow[], r: Range) {
  const by = new Map<string, number>()
  for (const x of rows) if (inRange(x.date, r)) for (const l of x.lines) for (const s of l.subjects) by.set(s, (by.get(s) ?? 0) + l.amount / l.subjects.length)
  const total = [...by.values()].reduce((a, v) => a + v, 0)
  return [...by.entries()].map(([subject, amount]) => ({ subject, amount, share: total ? amount / total : 0 })).sort((a, b) => b.amount - a.amount)
}

/** Packages sold: volume (units bought) vs value (tuition) — what sells most vs what earns most. */
export function packageMix(rows: RevenueRow[], r: Range) {
  const by = new Map<string, { units: number; amount: number }>()
  for (const x of rows) if (inRange(x.date, r) && !x.credit) for (const l of x.lines) {
    const cur = by.get(l.packageKey) ?? { units: 0, amount: 0 }
    by.set(l.packageKey, { units: cur.units + l.units, amount: cur.amount + l.amount })
  }
  const total = [...by.values()].reduce((a, v) => a + v.amount, 0)
  return [...by.entries()].map(([key, v]) => ({ key, label: packageLabel(key), ...v, share: total ? v.amount / total : 0 }))
    .sort((a, b) => packageOrder(a.key) - packageOrder(b.key))
}
const packageOrder = (k: string) => { const n = parseFloat(k); return (k.endsWith("h") ? 0 : k.endsWith("w") ? 1000 : 2000) + n }

/** Package × grade: how many packages each grade bought. */
export function packageByGrade(rows: RevenueRow[], r: Range) {
  const cells = new Map<string, number>()
  const grades = new Set<string>(), keys = new Set<string>()
  for (const x of rows) if (inRange(x.date, r) && !x.credit) for (const l of x.lines) {
    grades.add(l.grade); keys.add(l.packageKey)
    cells.set(`${l.grade}|${l.packageKey}`, (cells.get(`${l.grade}|${l.packageKey}`) ?? 0) + l.units)
  }
  return { grades: sortGradesLike([...grades]), keys: [...keys].sort((a, b) => packageOrder(a) - packageOrder(b)), count: (g: string, k: string) => cells.get(`${g}|${k}`) ?? 0 }
}
const GRADE_ORDER = ["อ.1", "อ.2", "อ.3", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"]
const sortGradesLike = (gs: string[]) => gs.sort((a, b) => (GRADE_ORDER.indexOf(a) + 1 || 99) - (GRADE_ORDER.indexOf(b) + 1 || 99))

/** Top families by money paid in the period — tenure counts from their first paid invoice ever. */
export function topFamilies(rows: RevenueRow[], r: Range, ctx: { students: Pick<Student, "id" | "nickname" | "familyId">[]; families: Pick<Family, "id" | "name">[]; today: DateStr }) {
  const keyOf = (sid: ID) => { const s = ctx.students.find((x) => x.id === sid); return s?.familyId ?? `stu:${sid}` }
  const nameOf = (key: string) => key.startsWith("stu:") ? (ctx.students.find((x) => x.id === key.slice(4))?.nickname ?? "—") : (ctx.families.find((f) => f.id === key)?.name ?? "—")
  const first = new Map<string, DateStr>()
  for (const x of rows) if (!x.credit) { const k = keyOf(x.studentId); if (!first.has(k) || x.date < first.get(k)!) first.set(k, x.date) }
  const by = new Map<string, { amount: number; invoices: number; kids: Set<ID> }>()
  for (const x of rows) if (inRange(x.date, r)) {
    const k = keyOf(x.studentId)
    const cur = by.get(k) ?? { amount: 0, invoices: 0, kids: new Set<ID>() }
    cur.amount += x.total
    if (!x.credit) { cur.invoices++; cur.kids.add(x.studentId) }
    by.set(k, cur)
  }
  return [...by.entries()].map(([key, v]) => ({
    key, name: nameOf(key), amount: v.amount, invoices: v.invoices, kids: v.kids.size,
    tenureMonths: first.has(key) ? Math.max(0, Math.round(daysIn({ from: first.get(key)!, to: ctx.today }) / 30.4)) : 0,
  })).sort((a, b) => b.amount - a.amount)
}

// ---------- students ----------

export type StudentStateOn = "active" | "paused" | "none"

export function stateOn(studentId: ID, date: DateStr, ents: Pick<Entitlement, "studentId" | "from" | "to">[], leaves: StudentLeave[]): StudentStateOn {
  if (!ents.some((e) => e.studentId === studentId && e.from <= date && date <= e.to)) return "none"
  return leaves.some((l) => l.studentId === studentId && l.from <= date && date <= l.to) ? "paused" : "active"
}

export interface StudentEvent { studentId: ID; branchId: ID; date: DateStr; kind: "new" | "returning" | "lost" | "renewed" }

/**
 * New / returning / lost / renewed events from paid invoices and entitlements. Students imported from the old system
 * are never "new" (they bought courses before the system existed).
 */
export function studentEvents(ctx: { students: Pick<Student, "id" | "branchId" | "imported">[]; entitlements: Pick<Entitlement, "studentId" | "from" | "to">[]; rows: RevenueRow[]; today: DateStr }): StudentEvent[] {
  const out: StudentEvent[] = []
  for (const s of ctx.students) {
    const paid = ctx.rows.filter((x) => x.studentId === s.id && !x.credit).map((x) => x.date).sort()
    if (paid.length && !s.imported) out.push({ studentId: s.id, branchId: s.branchId, date: paid[0], kind: "new" })
    // walk the student's packages in time: a gap longer than LOST_AFTER_DAYS = lost, then back = returning
    const spans = ctx.entitlements.filter((e) => e.studentId === s.id).map((e) => ({ from: e.from, to: e.to })).sort((a, b) => a.from.localeCompare(b.from))
    let coveredTo: DateStr | null = null
    for (const sp of spans) {
      if (coveredTo && sp.from > addDays(coveredTo, LOST_AFTER_DAYS)) {
        out.push({ studentId: s.id, branchId: s.branchId, date: addDays(coveredTo, LOST_AFTER_DAYS), kind: "lost" })
        out.push({ studentId: s.id, branchId: s.branchId, date: sp.from, kind: "returning" })
      } else if (coveredTo && sp.from > coveredTo) out.push({ studentId: s.id, branchId: s.branchId, date: sp.from, kind: "renewed" })
      if (!coveredTo || sp.to > coveredTo) coveredTo = sp.to
    }
    if (coveredTo && addDays(coveredTo, LOST_AFTER_DAYS) <= ctx.today) out.push({ studentId: s.id, branchId: s.branchId, date: addDays(coveredTo, LOST_AFTER_DAYS), kind: "lost" })
  }
  return out.sort((a, b) => a.date.localeCompare(b.date))
}

export function countEvents(events: StudentEvent[], r: Range, kind: StudentEvent["kind"], branchId?: ID) {
  return events.filter((e) => e.kind === kind && inRange(e.date, r) && (!branchId || e.branchId === branchId)).length
}

/** Pauses that started in the period (long leaves) — the "Pause" half of the churn split. */
export function pausesIn(leaves: StudentLeave[], r: Range, students: Pick<Student, "id" | "branchId">[], branchId?: ID) {
  return leaves.filter((l) => inRange(l.from, r) && (!branchId || students.find((s) => s.id === l.studentId)?.branchId === branchId)).length
}

/** Renewal rate: of packages that ended in the period (and whose 30 days are over), how many were followed by another. */
export function renewalRate(events: StudentEvent[], r: Range) {
  const renewed = events.filter((e) => e.kind === "renewed" && inRange(e.date, r)).length
  const lost = events.filter((e) => e.kind === "lost" && inRange(e.date, r)).length
  return renewed + lost ? renewed / (renewed + lost) : null
}

/** Active students at the end of each month of a year (null for months not reached yet). */
export function activeByMonth(year: number, upTo: DateStr, studentIds: ID[], ents: Pick<Entitlement, "studentId" | "from" | "to">[], leaves: StudentLeave[]) {
  return Array.from({ length: 12 }, (_, m) => {
    const first = `${year}-${String(m + 1).padStart(2, "0")}-01`
    if (first > upTo) return null
    const end = toDateStr(new Date(year, m + 1, 0))
    const at = end > upTo ? upTo : end
    return studentIds.filter((id) => stateOn(id, at, ents, leaves) === "active").length
  })
}

// ---------- attendance + demand ----------

export function attendanceRate(sessions: Pick<Session, "id" | "date" | "cancelled">[], attendance: Pick<Attendance, "sessionId" | "status">[], r: Range) {
  const ids = new Set(sessions.filter((s) => !s.cancelled && inRange(s.date, r)).map((s) => s.id))
  const marks = attendance.filter((a) => ids.has(a.sessionId))
  const present = marks.filter((a) => a.status === "present").length
  const leave = marks.filter((a) => a.status === "leave").length
  return { rate: present + leave ? present / (present + leave) : null, present, leave }
}

/** Demand heatmap: students sitting in sessions, by weekday × start hour. */
export function demandByDayHour(sessions: Pick<Session, "date" | "start" | "cancelled" | "studentIds" | "subject" | "subjects">[], r: Range, filter?: { subject?: string; grade?: string; gradeOf?: (sid: ID) => string }) {
  const cells = new Map<string, number>()
  let minH = 24, maxH = 0
  for (const s of sessions) {
    if (s.cancelled || !inRange(s.date, r)) continue
    if (filter?.subject && ![s.subject, ...(s.subjects ?? [])].includes(filter.subject)) continue
    const n = filter?.grade && filter.gradeOf ? s.studentIds.filter((id) => filter.gradeOf!(id) === filter.grade).length : s.studentIds.length
    if (!n) continue
    const h = Math.floor(toMinutes(s.start) / 60)
    minH = Math.min(minH, h); maxH = Math.max(maxH, h)
    const k = `${weekdayOf(s.date)}|${h}`
    cells.set(k, (cells.get(k) ?? 0) + n)
  }
  const hours = minH <= maxH ? Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i) : []
  return { hours, count: (wd: Weekday, h: number) => cells.get(`${wd}|${h}`) ?? 0, max: Math.max(0, ...cells.values()) }
}

// ---------- needs attention ----------

export const ATTENTION_THRESHOLDS = {
  dropPct: 10, unpaidDays: 5, unconfirmedDays: 2, expiringDays: 14, leavesIn30: 3, overdueWorkDays: 1, smallClass: 1, leadIdleDays: 2, trialIdleDays: 7,
}

export interface AttentionItem { key: string; group: "trend" | "money" | "students" | "teaching" | "sales"; title: string; detail: string; count: number; href: string }

export function needsAttention(ctx: {
  today: DateStr; now: Date; rows: RevenueRow[]; prevRange: Range; range: Range
  invoices: Invoice[]; entitlements: Entitlement[]; attendance: Attendance[]; sessions: Session[]; classes: Klass[]; leads: Lead[]
  activeNow: number; activeBefore: number; pendingSummaries: number; conflicts: number
}): AttentionItem[] {
  const T = ATTENTION_THRESHOLDS
  const out: AttentionItem[] = []
  const add = (x: AttentionItem) => { if (x.count > 0) out.push(x) }
  const now = revenueIn(ctx.rows, ctx.range), before = revenueIn(ctx.rows, ctx.prevRange)
  const drop = (a: number, b: number) => (b > 0 && (b - a) / b * 100 >= T.dropPct ? Math.round((b - a) / b * 100) : 0)
  const rd = drop(now.total, before.total)
  add({ key: "revenue_drop", group: "trend", title: "ยอดเงินเข้าตก", detail: `ลดลง ${rd}% เทียบช่วงก่อนหน้า`, count: rd ? 1 : 0, href: "/reports?tab=revenue" })
  const id = drop(now.invoices, before.invoices)
  add({ key: "invoice_drop", group: "trend", title: "จำนวนใบแจ้งหนี้ที่จ่ายแล้วลดลง", detail: `${now.invoices} ใบ (ก่อนหน้า ${before.invoices}) · −${id}%`, count: id ? 1 : 0, href: "/billing" })
  add({ key: "active_drop", group: "trend", title: "นักเรียน Active ลดลง", detail: `${ctx.activeNow} คน (ต้นช่วง ${ctx.activeBefore})`, count: ctx.activeNow < ctx.activeBefore ? 1 : 0, href: "/reports?tab=students" })

  const days = (iso: string) => (ctx.now.getTime() - new Date(iso).getTime()) / 86_400_000
  const unpaid = ctx.invoices.filter((i) => i.status === "sent" && i.sentAt && days(i.sentAt) > T.unpaidDays)
  add({ key: "unpaid", group: "money", title: "ใบแจ้งหนี้เลยกำหนดจ่าย", detail: `ส่งไปเกิน ${T.unpaidDays} วันแล้วยังไม่จ่าย`, count: unpaid.length, href: "/billing" })
  const unconfirmed = ctx.invoices.filter((i) => i.payments.some((p) => !p.confirmedBy && days(p.recordedAt) > T.unconfirmedDays))
  add({ key: "unconfirmed", group: "money", title: "เงินเข้าแล้วแต่ยังไม่ยืนยัน", detail: `ค้างเกิน ${T.unconfirmedDays} วัน`, count: unconfirmed.length, href: "/billing" })
  const soon = addDays(ctx.today, T.expiringDays)
  const expiring = ctx.entitlements.filter((e) => e.to >= ctx.today && e.to <= soon
    && !ctx.entitlements.some((x) => x.studentId === e.studentId && x.from > e.to)
    && !ctx.invoices.some((i) => i.studentId === e.studentId && ["draft", "pending_approval", "approved", "sent"].includes(i.status)))
  add({ key: "expiring", group: "money", title: "แพ็กใกล้หมด ยังไม่มีใบต่อคอร์ส", detail: `หมดใน ${T.expiringDays} วัน`, count: new Set(expiring.map((e) => e.studentId)).size, href: "/students" })

  const since = addDays(ctx.today, -30)
  const recent = new Set(ctx.sessions.filter((s) => s.date >= since && s.date <= ctx.today).map((s) => s.id))
  const leaves = new Map<ID, number>()
  ctx.attendance.filter((a) => a.status === "leave" && recent.has(a.sessionId)).forEach((a) => leaves.set(a.studentId, (leaves.get(a.studentId) ?? 0) + 1))
  add({ key: "often_leave", group: "students", title: "นักเรียนลาบ่อย (เสี่ยงหลุด)", detail: `ลา ≥ ${T.leavesIn30} ครั้งใน 30 วัน`, count: [...leaves.values()].filter((n) => n >= T.leavesIn30).length, href: "/attendance" })

  const week = addDays(ctx.today, 7)
  const tl = ctx.sessions.filter((s) => s.teacherLeave && s.date >= ctx.today && s.date <= week)
  add({ key: "teacher_leave", group: "teaching", title: "ครูลา 7 วันข้างหน้า", detail: `${tl.filter((s) => !s.teacherLeave!.substituteId && !s.cancelled).length} คาบยังไม่มีครูแทน · ${tl.filter((s) => s.teacherLeave!.substituteId).length} คาบมีครูแทนแล้ว`, count: tl.length, href: "/calendar" })
  const unmarked = ctx.sessions.filter((s) => !s.cancelled && s.studentIds.length && s.date < addDays(ctx.today, -T.overdueWorkDays + 1) && s.date >= addDays(ctx.today, -30)
    && s.studentIds.some((sid) => !ctx.attendance.some((a) => a.sessionId === s.id && a.studentId === sid)))
  add({ key: "unmarked", group: "teaching", title: "คาบรอเช็คชื่อ", detail: `ค้างเกิน ${T.overdueWorkDays} วัน`, count: unmarked.length, href: "/attendance" })
  add({ key: "summaries", group: "teaching", title: "สรุปการเรียนค้าง", detail: "ยังไม่ส่ง/ยังไม่อนุมัติ", count: ctx.pendingSummaries, href: "/summaries" })
  add({ key: "conflicts", group: "teaching", title: "คาบชน", detail: "คาบที่ยังไม่ถึงเวลา", count: ctx.conflicts, href: "/calendar" })
  add({ key: "small_class", group: "teaching", title: "คลาสคนน้อย", detail: `นักเรียน ≤ ${T.smallClass} คน`, count: ctx.classes.filter((k) => k.active && k.kind === "learning" && k.studentIds.length <= T.smallClass).length, href: "/classes" })

  add({ key: "lead_idle", group: "sales", title: "Lead ใหม่ยังไม่ได้ติดต่อ", detail: `เกิน ${T.leadIdleDays} วัน`, count: ctx.leads.filter((l) => l.stage === "new" && days(l.createdAt) > T.leadIdleDays).length, href: "/crm" })
  add({ key: "trial_idle", group: "sales", title: "ทดลองเรียนแล้ว ยังไม่สมัคร", detail: `เกิน ${T.trialIdleDays} วัน`, count: ctx.leads.filter((l) => l.stage === "trialed" && days(l.scheduledAt ?? l.createdAt) > T.trialIdleDays).length, href: "/crm" })
  return out
}
