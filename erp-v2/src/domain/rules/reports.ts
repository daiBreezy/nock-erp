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
import * as Loss from "./loss"
import type { InvoiceTotals } from "./billing"

/** Need Attention texts are Thai with {0} slots; the UI passes a translator (TH / EN / JP chip) */
export type Tr = (th: string, vars?: (string | number)[]) => string
const plainTr: Tr = (th, vars) => (vars ? th.replace(/\{(\d+)\}/g, (m, k) => String(vars[Number(k)] ?? m)) : th)
let TR: Tr = plainTr

export const LOST_AFTER_DAYS = 30

// ---------- periods ----------

export type PeriodKey = "today" | "week" | "month" | "3m" | "6m" | "1y" | "ytd" | "mtd" | "qtd" | "yoy" | "mom" | "qoq" | "custom"
export interface Range { from: DateStr; to: DateStr }

/**
 * Periods (owner 2026-10-05): rolling windows · to-date windows · complete-period comparisons · a custom range.
 * `group` splits the chips; `hint` says exactly which dates and what they are compared with.
 */
export const PERIODS: { key: PeriodKey; label: string; short: string; group: "rolling" | "todate" | "compare" | "custom"; hint: string }[] = [
  { key: "today", label: "วันนี้", short: "Today", group: "rolling", hint: "วันนี้ เทียบเมื่อวาน" },
  { key: "week", label: "7 วันล่าสุด", short: "Week", group: "rolling", hint: "7 วันล่าสุด เทียบ 7 วันก่อนหน้า" },
  { key: "month", label: "30 วันล่าสุด", short: "Month", group: "rolling", hint: "30 วันล่าสุด เทียบ 30 วันก่อนหน้า" },
  { key: "3m", label: "3 เดือนล่าสุด", short: "3 Months", group: "rolling", hint: "3 เดือนล่าสุด เทียบ 3 เดือนก่อนหน้า" },
  { key: "6m", label: "6 เดือนล่าสุด", short: "6 Months", group: "rolling", hint: "6 เดือนล่าสุด เทียบ 6 เดือนก่อนหน้า" },
  { key: "1y", label: "1 ปีล่าสุด", short: "1 Year", group: "rolling", hint: "12 เดือนล่าสุด เทียบ 12 เดือนก่อนหน้า" },
  { key: "ytd", label: "ตั้งแต่ต้นปี", short: "YTD", group: "todate", hint: "1 ม.ค. ถึงวันนี้ เทียบช่วงเดียวกันปีที่แล้ว" },
  { key: "mtd", label: "ตั้งแต่ต้นเดือน", short: "MTD", group: "todate", hint: "วันที่ 1 ถึงวันนี้ เทียบช่วงเดียวกันเดือนก่อน" },
  { key: "qtd", label: "ตั้งแต่ต้นไตรมาส", short: "QTD", group: "todate", hint: "ต้นไตรมาสถึงวันนี้ เทียบช่วงเดียวกันไตรมาสก่อน" },
  { key: "yoy", label: "เดือนที่แล้ว (YoY)", short: "YoY", group: "compare", hint: "เดือนที่แล้วทั้งเดือน เทียบเดือนเดียวกันปีที่แล้ว" },
  { key: "mom", label: "เดือนที่แล้ว (MoM)", short: "MoM", group: "compare", hint: "เดือนที่แล้วทั้งเดือน เทียบเดือนก่อนหน้านั้น" },
  { key: "qoq", label: "ไตรมาสที่แล้ว (QoQ)", short: "QoQ", group: "compare", hint: "ไตรมาสที่แล้วทั้งไตรมาส เทียบไตรมาสก่อนหน้านั้น" },
  { key: "custom", label: "ช่วงที่เลือก", short: "กำหนดเอง", group: "custom", hint: "เลือกวันเอง เทียบช่วงก่อนหน้าที่ยาวเท่ากัน" },
]
/** the period strip on Overview — one card each */
export const STRIP_PERIODS: PeriodKey[] = ["today", "week", "month", "3m", "6m", "1y", "ytd"]

const shiftMonths = (d: DateStr, n: number) => {
  const x = parseDate(d)
  const day = x.getDate()
  x.setDate(1)
  x.setMonth(x.getMonth() + n)
  const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate()
  x.setDate(Math.min(day, last))
  return toDateStr(x)
}
const monthStart = (d: DateStr) => d.slice(0, 8) + "01"
const quarterStart = (d: DateStr) => `${d.slice(0, 4)}-${String(Math.floor((Number(d.slice(5, 7)) - 1) / 3) * 3 + 1).padStart(2, "0")}-01`

export function periodRange(key: PeriodKey, today: DateStr, custom?: Range): Range {
  switch (key) {
    case "today": return { from: today, to: today }
    case "week": return { from: addDays(today, -6), to: today }
    case "month": return { from: addDays(today, -29), to: today }
    case "3m": return { from: addDays(shiftMonths(today, -3), 1), to: today }
    case "6m": return { from: addDays(shiftMonths(today, -6), 1), to: today }
    case "1y": return { from: addDays(shiftMonths(today, -12), 1), to: today }
    case "ytd": return { from: today.slice(0, 4) + "-01-01", to: today }
    case "mtd": return { from: monthStart(today), to: today }
    case "qtd": return { from: quarterStart(today), to: today }
    case "yoy": case "mom": { const from = shiftMonths(monthStart(today), -1); return { from, to: addDays(monthStart(today), -1) } }
    case "qoq": { const from = shiftMonths(quarterStart(today), -3); return { from, to: addDays(quarterStart(today), -1) } }
    case "custom": {
      if (!custom) return { from: addDays(today, -29), to: today }
      const to = custom.to > today ? today : custom.to
      return custom.from <= to ? { from: custom.from, to } : { from: to, to: custom.from > today ? today : custom.from }
    }
  }
}

export const daysIn = (r: Range) => Math.round((parseDate(r.to).getTime() - parseDate(r.from).getTime()) / 86_400_000) + 1

/** What each period is compared with (owner: not "MoM" on every card) — YTD against the same dates last year. */
export function compareRange(key: PeriodKey, r: Range): Range {
  if (key === "ytd" || key === "yoy") return { from: shiftMonths(r.from, -12), to: key === "yoy" ? addDays(shiftMonths(addDays(r.to, 1), -12), -1) : shiftMonths(r.to, -12) }
  if (key === "mtd") return { from: shiftMonths(r.from, -1), to: shiftMonths(r.to, -1) }
  if (key === "mom") return { from: shiftMonths(r.from, -1), to: addDays(r.from, -1) }
  if (key === "qtd") return { from: shiftMonths(r.from, -3), to: shiftMonths(r.to, -3) }
  if (key === "qoq") return { from: shiftMonths(r.from, -3), to: addDays(r.from, -1) }
  return { from: addDays(r.from, -daysIn(r)), to: addDays(r.from, -1) }
}

export const COMPARE_LABEL: Record<PeriodKey, string> = {
  today: "vs เมื่อวาน", week: "vs 7 วันก่อนหน้า", month: "vs 30 วันก่อนหน้า", "3m": "vs 3 เดือนก่อนหน้า",
  "6m": "vs 6 เดือนก่อนหน้า", "1y": "vs ปีก่อนหน้า", ytd: "vs ช่วงเดียวกันปีที่แล้ว", mtd: "vs ช่วงเดียวกันเดือนก่อน",
  qtd: "vs ช่วงเดียวกันไตรมาสก่อน", yoy: "vs เดือนเดียวกันปีที่แล้ว", mom: "vs เดือนก่อนหน้า", qoq: "vs ไตรมาสก่อนหน้า",
  custom: "vs ช่วงก่อนหน้าที่ยาวเท่ากัน",
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

/** Hours the demand heatmap always shows (owner 2026-10-01: 08:00 – 21:00), so weeks compare row for row. */
export const DEMAND_HOURS = { from: 8, to: 21 }

/** Demand heatmap: students sitting in sessions, by weekday × start hour (fixed rows 08:00–21:00, wider if a
 *  session starts outside them). */
export function demandByDayHour(sessions: Pick<Session, "date" | "start" | "cancelled" | "studentIds" | "subject" | "subjects">[], r: Range, filter?: { subject?: string; grade?: string; gradeOf?: (sid: ID) => string }) {
  const cells = new Map<string, number>()
  let minH = DEMAND_HOURS.from, maxH = DEMAND_HOURS.to
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
  const hours = Array.from({ length: maxH - minH + 1 }, (_, i) => minH + i)
  return { hours, count: (wd: Weekday, h: number) => cells.get(`${wd}|${h}`) ?? 0, max: Math.max(0, ...cells.values()) }
}

// ---------- needs attention ----------

export const ATTENTION_THRESHOLDS = {
  dropPct: 10, unpaidDays: 5, unconfirmedDays: 2, expiringDays: 14, leavesIn30: 3, overdueWorkDays: 1, smallClass: 1, leadIdleDays: 2, trialIdleDays: 7,
}

/** sent, still unpaid after ATTENTION_THRESHOLDS.unpaidDays — shared by Need Attention and the billing list highlight */
export const invoiceOverdue = (i: Pick<Invoice, "status" | "sentAt">, now: Date) =>
  i.status === "sent" && !!i.sentAt && (now.getTime() - new Date(i.sentAt).getTime()) / 86_400_000 > ATTENTION_THRESHOLDS.unpaidDays
/** a payment recorded but not confirmed after ATTENTION_THRESHOLDS.unconfirmedDays */
export const paymentUnconfirmed = (i: Pick<Invoice, "payments">, now: Date) =>
  i.payments.some((p) => !p.confirmedBy && (now.getTime() - new Date(p.recordedAt).getTime()) / 86_400_000 > ATTENTION_THRESHOLDS.unconfirmedDays)
/** which Need Attention / Dashboard topics a lead belongs to (lead_new, lead_idle, lead_quiet, lead_follow_again, trial_idle) */
export function leadFlags(l: Lead, now: Date, today: DateStr): string[] {
  const T = ATTENTION_THRESHOLDS
  const days = (iso: string) => (now.getTime() - new Date(iso).getTime()) / 86_400_000
  const out: string[] = []
  if (l.stage === "new") { out.push("lead_new"); if (days(l.createdAt) > T.leadIdleDays) out.push("lead_idle") }
  if (l.stage !== "archived" && l.stage !== "enrolled" && Loss.followUpState(l, now).suggestClose) out.push("lead_quiet")
  if (Loss.followUpDue([l], today).length) out.push("lead_follow_again")
  if (l.stage === "trialed" && days(l.scheduledAt ?? l.createdAt) > T.trialIdleDays) out.push("trial_idle")
  return out
}

export interface AttentionItem { key: string; group: "trend" | "money" | "students" | "teaching" | "sales"; title: string; detail: string; count: number; href: string }

export function needsAttention(ctx: {
  today: DateStr; now: Date; rows: RevenueRow[]; prevRange: Range; range: Range
  invoices: Invoice[]; entitlements: Entitlement[]; attendance: Attendance[]; sessions: Session[]; classes: Klass[]; leads: Lead[]
  activeNow: number; activeBefore: number; pendingSummaries: number; conflicts: number
  /** unhappy survey families nobody has called yet (owner 2026-10-05) */
  surveyToCall?: number
  /** data gaps (owner 2026-10-06): students not linked to a family, and that family's students for the
   *  address/LINE checks below — pass only the ones in scope (archived students don't need chasing) */
  students?: Pick<Student, "id" | "familyId" | "archived">[]
  families?: Pick<Family, "id" | "parents" | "address" | "postcode" | "lineUserId">[]
}, tr?: Tr, opts: { keepZero?: boolean } = {}): AttentionItem[] {
  TR = tr ?? plainTr
  const T = ATTENTION_THRESHOLDS
  const out: AttentionItem[] = []
  // keepZero (owner 2026-10-07): the Dashboard board lists every topic, done ones ticked off
  const add = (x: AttentionItem) => { if (x.count > 0 || opts.keepZero) out.push(x) }
  const now = revenueIn(ctx.rows, ctx.range), before = revenueIn(ctx.rows, ctx.prevRange)
  const drop = (a: number, b: number) => (b > 0 && (b - a) / b * 100 >= T.dropPct ? Math.round((b - a) / b * 100) : 0)
  const rd = drop(now.total, before.total)
  add({ key: "revenue_drop", group: "trend", title: TR("ยอดเงินเข้าตก"), detail: TR("ลดลง {0}% เทียบช่วงก่อนหน้า", [rd]), count: rd ? 1 : 0, href: "/reports?tab=revenue" })
  const id = drop(now.invoices, before.invoices)
  add({ key: "invoice_drop", group: "trend", title: TR("จำนวนใบแจ้งหนี้ที่จ่ายแล้วลดลง"), detail: TR("{0} ใบ (ก่อนหน้า {1}) · −{2}%", [now.invoices, before.invoices, id]), count: id ? 1 : 0, href: "/billing" })
  add({ key: "active_drop", group: "trend", title: TR("นักเรียน Active ลดลง"), detail: TR("{0} คน (ต้นช่วง {1})", [ctx.activeNow, ctx.activeBefore]), count: ctx.activeNow < ctx.activeBefore ? 1 : 0, href: "/reports?tab=students" })

  const unpaid = ctx.invoices.filter((i) => invoiceOverdue(i, ctx.now))
  add({ key: "unpaid", group: "money", title: TR("ใบแจ้งหนี้เลยกำหนดจ่าย"), detail: TR("ส่งไปเกิน {0} วันแล้วยังไม่จ่าย", [T.unpaidDays]), count: unpaid.length, href: "/billing?filter=awaiting_payment" })
  const unconfirmed = ctx.invoices.filter((i) => paymentUnconfirmed(i, ctx.now))
  add({ key: "unconfirmed", group: "money", title: TR("เงินเข้าแล้วแต่ยังไม่ยืนยัน"), detail: TR("ค้างเกิน {0} วัน", [T.unconfirmedDays]), count: unconfirmed.length, href: "/billing?filter=to_confirm" })
  const soon = addDays(ctx.today, T.expiringDays)
  const expiring = ctx.entitlements.filter((e) => e.to >= ctx.today && e.to <= soon
    && !ctx.entitlements.some((x) => x.studentId === e.studentId && x.from > e.to)
    && !ctx.invoices.some((i) => i.studentId === e.studentId && ["draft", "pending_approval", "approved", "sent"].includes(i.status)))
  add({ key: "expiring", group: "money", title: TR("แพ็กใกล้หมด ยังไม่มีใบต่อคอร์ส"), detail: TR("หมดใน {0} วัน", [T.expiringDays]), count: new Set(expiring.map((e) => e.studentId)).size, href: "/students" })

  const since = addDays(ctx.today, -30)
  const recent = new Set(ctx.sessions.filter((s) => s.date >= since && s.date <= ctx.today).map((s) => s.id))
  const leaves = new Map<ID, number>()
  ctx.attendance.filter((a) => a.status === "leave" && recent.has(a.sessionId)).forEach((a) => leaves.set(a.studentId, (leaves.get(a.studentId) ?? 0) + 1))
  add({ key: "survey_call", group: "students", title: TR("ผู้ปกครองไม่พอใจ ยังไม่ได้โทร"), detail: TR("จากแบบสอบถามประจำปี — โทรภายใน 3 วัน (รายชื่ออยู่หน้า CRM)"), count: ctx.surveyToCall ?? 0, href: "/crm" })
  add({ key: "often_leave", group: "students", title: TR("นักเรียนลาบ่อย (เสี่ยงหลุด)"), detail: TR("ลา ≥ {0} ครั้งใน 30 วัน", [T.leavesIn30]), count: [...leaves.values()].filter((n) => n >= T.leavesIn30).length, href: "/attendance" })

  // data gaps (owner 2026-10-06) — not errors, just things worth filling in before they bite (can't bill/message)
  const liveStudents = (ctx.students ?? []).filter((s) => !s.archived)
  add({ key: "no_family", group: "students", title: TR("นักเรียนไม่ผูกครอบครัว"), detail: TR("ส่งใบแจ้งหนี้ / สรุปการเรียนทาง LINE ไม่ได้ — ผูกที่หน้านักเรียน"), count: liveStudents.filter((s) => !s.familyId).length, href: "/students" })
  const familyIds = new Set(liveStudents.map((s) => s.familyId).filter((x): x is ID => !!x))
  const relevantFamilies = (ctx.families ?? []).filter((f) => familyIds.has(f.id))
  add({ key: "no_address", group: "students", title: TR("ครอบครัวไม่มีที่อยู่"), detail: TR("เติมที่หน้าครอบครัว"), count: relevantFamilies.filter((f) => !f.address && !f.postcode).length, href: "/families" })
  add({ key: "no_line", group: "students", title: TR("ครอบครัวไม่มีช่องทาง LINE"), detail: TR("ส่งฟอร์ม / ใบแจ้งหนี้ทาง LINE ไม่ได้ — ต้องคัดลอกลิงก์ให้เอง"), count: relevantFamilies.filter((f) => !f.lineUserId && !f.parents.some((p) => p.lineLinked)).length, href: "/families" })

  const week = addDays(ctx.today, 7)
  const tl = ctx.sessions.filter((s) => s.teacherLeave && s.date >= ctx.today && s.date <= week)
  add({ key: "teacher_leave", group: "teaching", title: TR("ครูลา 7 วันข้างหน้า"), detail: TR("{0} คาบยังไม่มีครูแทน · {1} คาบมีครูแทนแล้ว", [tl.filter((s) => !s.teacherLeave!.substituteId && !s.cancelled).length, tl.filter((s) => s.teacherLeave!.substituteId).length]), count: tl.length, href: "/calendar?view=list" })
  const unmarked = ctx.sessions.filter((s) => !s.cancelled && s.studentIds.length && s.date < addDays(ctx.today, -T.overdueWorkDays + 1) && s.date >= addDays(ctx.today, -30)
    && s.studentIds.some((sid) => !ctx.attendance.some((a) => a.sessionId === s.id && a.studentId === sid)))
  add({ key: "unmarked", group: "teaching", title: TR("คาบรอเช็คชื่อ"), detail: TR("ค้างเกิน {0} วัน", [T.overdueWorkDays]), count: unmarked.length, href: "/attendance" })
  add({ key: "summaries", group: "teaching", title: TR("สรุปการเรียนค้าง"), detail: TR("ยังไม่ส่ง/ยังไม่อนุมัติ"), count: ctx.pendingSummaries, href: "/summaries" })
  add({ key: "conflicts", group: "teaching", title: TR("คาบชน"), detail: TR("คาบที่ยังไม่ถึงเวลา"), count: ctx.conflicts, href: "/calendar" })
  add({ key: "small_class", group: "teaching", title: TR("คลาสคนน้อย"), detail: TR("นักเรียน ≤ {0} คน", [T.smallClass]), count: ctx.classes.filter((k) => k.active && k.kind === "learning" && k.studentIds.length <= T.smallClass).length, href: "/classes" })

  const flags = ctx.leads.map((l) => leadFlags(l, ctx.now, ctx.today))
  const nFlag = (k: string) => flags.filter((f) => f.includes(k)).length
  add({ key: "lead_idle", group: "sales", title: TR("Lead ใหม่ยังไม่ได้ติดต่อ"), detail: TR("เกิน {0} วัน", [T.leadIdleDays]), count: nFlag("lead_idle"), href: "/crm" })
  add({ key: "lead_quiet", group: "sales", title: TR("Lead เงียบ ควรตัดสินใจ"), detail: TR("ติดต่อไม่ได้ ≥ 3 ครั้ง หรือเงียบ ≥ 14 วัน — ปิด Lead หรือลองช่องทางอื่น"), count: nFlag("lead_quiet"), href: "/crm?view=table" })
  add({ key: "lead_follow_again", group: "sales", title: TR("ถึงวันติดต่อ Lead ที่ปิดไปอีกครั้ง"), detail: TR("ตามวันที่ตั้งไว้ตอนปิด Lead"), count: Loss.followUpDue(ctx.leads, ctx.today).length, href: "/crm?view=table&archived=1" })
  add({ key: "trial_idle", group: "sales", title: TR("ทดลองเรียนแล้ว ยังไม่สมัคร"), detail: TR("เกิน {0} วัน", [T.trialIdleDays]), count: nFlag("trial_idle"), href: "/crm?view=table" })
  return out
}

// ---------- R2: attendance (owner 2026-10-01) ----------

export interface AttendanceRow { key: string; present: number; leave: number; noQuota: number; rate: number | null; sessions: number }

/** Present / leave split by any key (branch, subject, weekday, class…) for sessions in the period, cancelled left out. */
export function attendanceBy(sessions: Pick<Session, "id" | "date" | "cancelled" | "subject">[], attendance: Pick<Attendance, "sessionId" | "status" | "noQuota">[], r: Range, keyOf: (s: Pick<Session, "id" | "date" | "cancelled" | "subject">) => string | null): AttendanceRow[] {
  const by = new Map<string, AttendanceRow>()
  const byId = new Map(sessions.filter((s) => !s.cancelled && inRange(s.date, r)).map((s) => [s.id, s]))
  for (const s of byId.values()) {
    const k = keyOf(s)
    if (k === null) continue
    const row = by.get(k) ?? { key: k, present: 0, leave: 0, noQuota: 0, rate: null, sessions: 0 }
    row.sessions++
    by.set(k, row)
  }
  for (const a of attendance) {
    const s = byId.get(a.sessionId)
    if (!s) continue
    const k = keyOf(s)
    if (k === null) continue
    const row = by.get(k)!
    if (a.status === "present") row.present++
    else if (a.status === "leave") { row.leave++; if (a.noQuota) row.noQuota++ }
  }
  for (const row of by.values()) row.rate = row.present + row.leave ? row.present / (row.present + row.leave) : null
  return [...by.values()]
}

/** Students who took the most leave in the period (risk of leaving) — at least `min` leaves. */
export function frequentLeavers(sessions: Pick<Session, "id" | "date" | "cancelled">[], attendance: Pick<Attendance, "sessionId" | "studentId" | "status" | "noQuota">[], r: Range, min = 2) {
  const ids = new Set(sessions.filter((s) => !s.cancelled && inRange(s.date, r)).map((s) => s.id))
  const by = new Map<ID, { studentId: ID; leave: number; noQuota: number; present: number }>()
  for (const a of attendance) {
    if (!ids.has(a.sessionId)) continue
    const row = by.get(a.studentId) ?? { studentId: a.studentId, leave: 0, noQuota: 0, present: 0 }
    if (a.status === "leave") { row.leave++; if (a.noQuota) row.noQuota++ } else if (a.status === "present") row.present++
    by.set(a.studentId, row)
  }
  return [...by.values()].filter((x) => x.leave >= min).map((x) => ({ ...x, rate: x.present / (x.present + x.leave) })).sort((a, b) => b.leave - a.leave || a.rate - b.rate)
}

/** Sessions that did not happen: cancelled by reason (teacher leave / special period / other). */
export function cancellations(sessions: Pick<Session, "date" | "cancelled" | "teacherLeave" | "pausedBy" | "studentIds">[], r: Range) {
  const xs = sessions.filter((s) => s.cancelled && inRange(s.date, r))
  const teacher = xs.filter((s) => s.teacherLeave && !s.teacherLeave.substituteId)
  const period = xs.filter((s) => s.pausedBy)
  return { total: xs.length, teacher: teacher.length, period: period.length, other: xs.length - teacher.length - period.length, students: xs.reduce((a, s) => a + s.studentIds.length, 0) }
}

// ---------- R2: operations ----------

export interface TeacherStat {
  teacherId: ID; sessions: number; minutes: number; students: number; rate: number | null
  unmarked: number; summariesPending: number; summariesOnTime: number | null
  coverFor: number; awaySessions: number
}

/**
 * Teacher health for the period: what they taught (primary teacher), attendance in their sessions, work still open
 * (attendance not taken, summaries not sent), summaries on time, sessions they covered for others / were away from.
 * Minutes drive part-time pay.
 */
export function teacherStats(ctx: {
  sessions: Session[]; attendance: Pick<Attendance, "sessionId" | "studentId" | "status">[]
  summaries: { sessionId: ID; status: string; history: { at: string; action: string }[] }[]
  range: Range; now: Date; deadlineHours: number
}): TeacherStat[] {
  const { range: r } = ctx
  const by = new Map<ID, TeacherStat & { studentSet: Set<ID>; present: number; leave: number; onTime: number; due: number }>()
  const get = (id: ID) => {
    if (!by.has(id)) by.set(id, { teacherId: id, sessions: 0, minutes: 0, students: 0, rate: null, unmarked: 0, summariesPending: 0, summariesOnTime: null, coverFor: 0, awaySessions: 0, studentSet: new Set(), present: 0, leave: 0, onTime: 0, due: 0 })
    return by.get(id)!
  }
  const marks = new Map<ID, Pick<Attendance, "sessionId" | "studentId" | "status">[]>()
  for (const a of ctx.attendance) { const l = marks.get(a.sessionId) ?? []; l.push(a); marks.set(a.sessionId, l) }
  const sums = new Map<ID, (typeof ctx.summaries)[number][]>()
  for (const x of ctx.summaries) { const l = sums.get(x.sessionId) ?? []; l.push(x); sums.set(x.sessionId, l) }
  for (const s of ctx.sessions) {
    if (!inRange(s.date, r)) continue
    if (s.teacherLeave?.teacherId) get(s.teacherLeave.teacherId).awaySessions++
    if (s.cancelled || !s.teacherId) continue
    const end = new Date(`${s.date}T${s.start}:00`).getTime() + s.minutes * 60_000
    if (end > ctx.now.getTime()) continue // only what has been taught
    const t = get(s.teacherId)
    t.sessions++
    t.minutes += s.minutes
    if (s.teacherLeave?.substituteId === s.teacherId) t.coverFor++
    s.studentIds.forEach((id) => t.studentSet.add(id))
    const m = marks.get(s.id) ?? []
    t.present += m.filter((a) => a.status === "present").length
    t.leave += m.filter((a) => a.status === "leave").length
    if (s.studentIds.some((sid) => !m.some((a) => a.studentId === sid))) t.unmarked++
    const ss = sums.get(s.id) ?? []
    t.summariesPending += ss.filter((x) => ["draft", "submitted", "changes_requested"].includes(x.status)).length
    for (const x of ss) {
      const sent = x.history.find((h) => h.action === "submit")
      if (!sent) continue
      t.due++
      if (new Date(sent.at).getTime() <= end + ctx.deadlineHours * 3_600_000) t.onTime++
    }
  }
  return [...by.values()].map(({ studentSet, present, leave, onTime, due, ...t }) => ({
    ...t, students: studentSet.size, rate: present + leave ? present / (present + leave) : null, summariesOnTime: due ? onTime / due : null,
  })).sort((a, b) => b.minutes - a.minutes)
}

/**
 * Room use: booked minutes ÷ open minutes over the days the branch was open (holidays out) — counted from `since`
 * (go-live) so days without any data do not drag it down.
 */
export function roomUtilization(branch: Branch, sessions: Pick<Session, "date" | "roomId" | "minutes" | "cancelled" | "branchId">[], r: Range, opts: { since: DateStr; closed: (date: DateStr) => boolean; hoursOn: (date: DateStr) => { open: string; close: string } | null }) {
  const from = r.from < opts.since ? opts.since : r.from
  let openPerRoom = 0
  for (let d = from; d <= r.to; d = addDays(d, 1)) {
    const h = opts.hoursOn(d)
    if (h && !opts.closed(d)) openPerRoom += toMinutes(h.close) - toMinutes(h.open)
  }
  return branch.rooms.map((room) => {
    const booked = sessions.filter((s) => s.branchId === branch.id && s.roomId === room.id && !s.cancelled && s.date >= from && s.date <= r.to).reduce((a, s) => a + s.minutes, 0)
    return { roomId: room.id, name: room.name, booked, open: openPerRoom, rate: openPerRoom ? booked / openPerRoom : null }
  })
}

/** How full each active class is against its suggested size (Single 3 / Group 6). */
export function classFill(classes: Pick<Klass, "id" | "name" | "branchId" | "active" | "kind" | "type" | "studentIds" | "teacherId" | "periodId">[], capacity: { single: number; group: number }) {
  return classes.filter((k) => k.active && k.kind === "learning").map((k) => {
    const cap = capacity[k.type]
    return { id: k.id, name: k.name, branchId: k.branchId, teacherId: k.teacherId, students: k.studentIds.length, capacity: cap, fill: k.studentIds.length / cap }
  }).sort((a, b) => a.fill - b.fill)
}

// ---------- R3: CRM funnel (owner 2026-10-01) ----------

const STAGE_ORDER = ["new", "contacting", "test_scheduled", "tested", "trial_scheduled", "trialed", "payment_pending", "enrolled"] as const
const stageRank = (l: Pick<Lead, "stage" | "archivedFrom">) => STAGE_ORDER.indexOf((l.stage === "archived" ? l.archivedFrom ?? "new" : l.stage) as (typeof STAGE_ORDER)[number])

/** The steps a lead goes through — a lead counts at every step it reached or passed (archived ones at the step they stopped). */
export const FUNNEL_STEPS = [
  { key: "lead", label: "Lead ใหม่", min: 0 },
  { key: "contacted", label: "ติดต่อแล้ว", min: 1 },
  { key: "test", label: "นัด Test / Trial", min: 2 },
  { key: "trial", label: "ทดลองเรียน", min: 4 },
  { key: "payment", label: "รอชำระ", min: 6 },
  { key: "enrolled", label: "สมัครแล้ว", min: 7 },
] as const

/** Leads created in the period, through the funnel: count per step and % of the step before / of all leads. */
export function leadFunnel(leads: Pick<Lead, "stage" | "archivedFrom" | "createdAt" | "direct">[], r: Range) {
  const xs = leads.filter((l) => inRange(l.createdAt.slice(0, 10), r))
  // enroll-now leads never had a test / trial — they skip those two steps (owner 2026-10-05)
  const reached = (l: (typeof xs)[number], s: (typeof FUNNEL_STEPS)[number]) => stageRank(l) >= s.min && !(l.direct && (s.key === "test" || s.key === "trial"))
  const steps = FUNNEL_STEPS.map((s) => ({ ...s, count: xs.filter((l) => reached(l, s)).length, direct: xs.filter((l) => l.direct && reached(l, s)).length }))
  return steps.map((s, i) => ({ ...s, ofPrev: i && steps[i - 1].count ? s.count / steps[i - 1].count : null, ofAll: xs.length ? s.count / xs.length : null }))
}

/** Where leads come from: leads, enrolled, conversion, money paid so far by the students they became, days to enrol. */
export function leadSources(leads: Pick<Lead, "source" | "stage" | "archivedFrom" | "createdAt" | "convertedStudentId">[], rows: RevenueRow[], r: Range) {
  const xs = leads.filter((l) => inRange(l.createdAt.slice(0, 10), r))
  const by = new Map<string, { source: string; leads: number; enrolled: number; revenue: number; days: number[] }>()
  for (const l of xs) {
    const row = by.get(l.source) ?? { source: l.source, leads: 0, enrolled: 0, revenue: 0, days: [] }
    row.leads++
    if (l.stage === "enrolled" && l.convertedStudentId) {
      row.enrolled++
      const paid = rows.filter((x) => x.studentId === l.convertedStudentId && !x.credit)
      row.revenue += paid.reduce((a, x) => a + x.total, 0)
      const first = paid.map((x) => x.date).sort()[0]
      if (first) row.days.push(Math.max(0, daysIn({ from: l.createdAt.slice(0, 10), to: first }) - 1))
    }
    by.set(l.source, row)
  }
  return [...by.values()].map((x) => ({
    source: x.source, leads: x.leads, enrolled: x.enrolled, revenue: x.revenue, conversion: x.leads ? x.enrolled / x.leads : null,
    medianDays: x.days.length ? [...x.days].sort((a, b) => a - b)[Math.floor(x.days.length / 2)] : null,
  })).sort((a, b) => b.enrolled - a.enrolled || b.leads - a.leads)
}

/** Why leads were lost: archived leads by the step they stopped at. */
export function lostLeads(leads: Pick<Lead, "stage" | "archivedFrom" | "createdAt">[], r: Range) {
  const xs = leads.filter((l) => l.stage === "archived" && inRange(l.createdAt.slice(0, 10), r))
  return FUNNEL_STEPS.slice(0, -1).map((s, i) => ({ key: s.key, label: s.label, count: xs.filter((l) => stageRank(l) >= s.min && stageRank(l) < FUNNEL_STEPS[i + 1].min).length }))
}

// ---------- R3: cohort retention ----------

export const COHORT_MONTHS = 24 // owner 2026-10-07: up to 24 months (the page switches 12 / 24)

const addMonthsStr = (d: DateStr, n: number) => shiftMonths(d, n)

/**
 * Cohort retention: students grouped (by branch × year they joined, or by month they joined) — for each month after
 * joining (M0…M12), the % of the group still studying (a package covers that day). A month not reached yet for any
 * student of the group = null (the triangle). Students imported from the old system have no join date → left out.
 */
export function cohortRetention(ctx: {
  students: Pick<Student, "id" | "branchId" | "imported">[]; entitlements: Pick<Entitlement, "studentId" | "from" | "to">[]; rows: RevenueRow[]; today: DateStr
  groupOf: (s: Pick<Student, "id" | "branchId">, joined: DateStr) => string
}) {
  const ents = new Map<ID, { from: DateStr; to: DateStr }[]>()
  for (const e of ctx.entitlements) { const l = ents.get(e.studentId) ?? []; l.push(e); ents.set(e.studentId, l) }
  const first = new Map<ID, DateStr>()
  for (const x of ctx.rows) if (!x.credit && (!first.has(x.studentId) || x.date < first.get(x.studentId)!)) first.set(x.studentId, x.date)
  const groups = new Map<string, { key: string; size: number; hit: number[]; seen: number[] }>()
  for (const s of ctx.students) {
    const joined = first.get(s.id)
    if (!joined || s.imported) continue
    const key = ctx.groupOf(s, joined)
    const g = groups.get(key) ?? { key, size: 0, hit: Array(COHORT_MONTHS + 1).fill(0), seen: Array(COHORT_MONTHS + 1).fill(0) }
    g.size++
    for (let n = 0; n <= COHORT_MONTHS; n++) {
      const at = addMonthsStr(joined, n)
      if (at > ctx.today) break
      g.seen[n]++
      if ((ents.get(s.id) ?? []).some((e) => e.from <= at && at <= e.to)) g.hit[n]++
    }
    groups.set(key, g)
  }
  return [...groups.values()].map((g) => ({ key: g.key, size: g.size, cells: g.hit.map((h, n) => (g.seen[n] ? h / g.seen[n] : null)) }))
    .sort((a, b) => a.key.localeCompare(b.key))
}

// ---------- R3: forecast ----------

/**
 * Revenue forecast for the months ahead (owner: open invoices + packages ending × renewal rate). Each student's latest
 * package renews at its end with the renewal rate, again and again, for the price they last paid; invoices already
 * sent / approved count in full in the month they were sent. New students are left out (shown separately).
 */
export function forecastRevenue(ctx: {
  today: DateStr; until: DateStr; renewal: number
  entitlements: Pick<Entitlement, "studentId" | "invoiceId" | "from" | "to" | "courseId">[]
  rows: RevenueRow[]; openInvoices: { studentId: ID; amount: number; date: DateStr }[]
}) {
  const hasOpen = new Set(ctx.openInvoices.map((o) => o.studentId))
  const months = new Map<string, { renewals: number; open: number }>()
  const add = (d: DateStr, k: "renewals" | "open", v: number) => {
    const m = d.slice(0, 7)
    if (d > ctx.until || d <= ctx.today.slice(0, 8) + "00") return
    const cur = months.get(m) ?? { renewals: 0, open: 0 }
    cur[k] += v
    months.set(m, cur)
  }
  for (const o of ctx.openInvoices) add(o.date < ctx.today ? ctx.today : o.date, "open", o.amount)
  // latest package per student + course, still running or ended recently (within the 30-day window)
  const latest = new Map<string, Pick<Entitlement, "studentId" | "invoiceId" | "from" | "to" | "courseId">>()
  for (const e of ctx.entitlements) { const k = `${e.studentId}|${e.courseId}`; const cur = latest.get(k); if (!cur || e.to > cur.to) latest.set(k, e) }
  const paid = new Map(ctx.rows.filter((x) => !x.credit).map((x) => [x.invoiceId, x]))
  for (const e of latest.values()) {
    if (addDays(e.to, LOST_AFTER_DAYS) < ctx.today) continue
    const line = paid.get(e.invoiceId)?.lines.find((l) => l.courseId === e.courseId)
    if (!line || line.amount <= 0) continue
    const len = Math.max(7, daysIn({ from: e.from, to: e.to }))
    // an open invoice already is the next package → the renewals start after it
    let at = addDays(e.to, 1 + (hasOpen.has(e.studentId) ? len : 0)), p = 1
    if (at < ctx.today) at = ctx.today
    while (at <= ctx.until) { p *= ctx.renewal; add(at, "renewals", p * line.amount); at = addDays(at, len) }
  }
  return months
}

/** What new students brought in their first month, averaged over the last 3 full months — the "new" part shown
 *  next to the forecast (not added to it). */
export function avgNewRevenue(rows: RevenueRow[], events: StudentEvent[], today: DateStr) {
  const from = shiftMonths(today.slice(0, 8) + "01", -3), to = addDays(today.slice(0, 8) + "01", -1)
  const fresh = new Set(events.filter((e) => e.kind === "new" && e.date >= from && e.date <= to).map((e) => e.studentId))
  const sumNew = rows.filter((x) => fresh.has(x.studentId) && x.date >= from && x.date <= to && !x.credit)
  return { perMonth: sumNew.reduce((a, x) => a + x.total, 0) / 3, students: fresh.size / 3 }
}

// ---------- why students leave (exit form, owner 2026-10-05) ----------

/** Exits closed in the period: reasons (main + other), the parents' scores, come-back intent, recommend score. */
export function exitSummary(students: Pick<Student, "exit">[], r: Range) {
  const xs = students.map((s) => s.exit).filter((e): e is NonNullable<Student["exit"]> => !!e && e.status === "closed" && !!e.closedAt && inRange(e.closedAt.slice(0, 10), r))
  const answered = xs.filter((e) => e.answers).map((e) => e.answers!)
  const reasons = new Map<string, { main: number; other: number }>()
  for (const e of xs) {
    if (e.reasonId) { const c = reasons.get(e.reasonId) ?? { main: 0, other: 0 }; c.main++; reasons.set(e.reasonId, c) }
    for (const o of e.otherReasonIds ?? []) { const c = reasons.get(o) ?? { main: 0, other: 0 }; c.other++; reasons.set(o, c) }
  }
  const mean = (vals: (number | null)[]) => { const v = vals.filter((x): x is number => x !== null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null }
  const npsVals = answered.map((a) => a.nps).filter((x): x is number => x !== null)
  return {
    total: xs.length, answered: answered.length, noReply: xs.filter((e) => e.noReply).length,
    reasons: [...reasons.entries()].map(([id, c]) => ({ id, ...c })).sort((a, b) => b.main - a.main || b.other - a.other),
    scores: {
      teacher: mean(answered.map((a) => a.scores.teacher)), content: mean(answered.map((a) => a.scores.content)),
      admin: mean(answered.map((a) => a.scores.admin)), value: mean(answered.map((a) => a.scores.value)),
    },
    comeBack: { yes: answered.filter((a) => a.comeBack === "yes").length, maybe: answered.filter((a) => a.comeBack === "maybe").length, no: answered.filter((a) => a.comeBack === "no").length },
    // NPS = % promoters (9–10) − % detractors (0–6)
    nps: npsVals.length ? Math.round(((npsVals.filter((x) => x >= 9).length - npsVals.filter((x) => x <= 6).length) / npsVals.length) * 100) : null,
    comments: xs.filter((e) => e.answers?.comment).map((e) => ({ text: e.answers!.comment, at: e.closedAt!, reasonId: e.reasonId })).sort((a, b) => b.at.localeCompare(a.at)),
  }
}

// ---------- scope: region / business type (owner 2026-10-07) ----------

/** business type short codes the company uses: NockAcademy = NAS, Liclass = LIS */
export const BUSINESS_SHORT: Record<Branch["brand"], string> = { nockacademy: "NAS", liclass: "LIS" }

/**
 * Which branches a Reports scope covers. Scope ids: "all" · "region:BKK" · "biz:liclass" · "region:CBR|biz:nockacademy"
 * · a branch id. Always within the branches this person may see (`allowed`).
 */
export function scopeBranchIds(scope: string, allowed: Pick<Branch, "id" | "brand" | "province">[]): string[] {
  if (scope === "all") return allowed.map((b) => b.id)
  if (scope.startsWith("region:") || scope.startsWith("biz:")) {
    const parts = Object.fromEntries(scope.split("|").map((x) => x.split(":") as [string, string]))
    const ids = allowed.filter((b) => (!parts.region || b.province === parts.region) && (!parts.biz || b.brand === parts.biz)).map((b) => b.id)
    return ids.length ? ids : allowed.map((b) => b.id)
  }
  return allowed.some((b) => b.id === scope) ? [scope] : allowed.map((b) => b.id)
}

export type GroupBy = "region" | "biz" | "both"
export interface BranchFigures { id: ID; brand: Branch["brand"]; province: string; revenue: number; revenuePrev: number; active: number; newCount: number; returning: number; lost: number; pauses: number; present: number; leave: number }

/**
 * Branch figures added up per region, per business type, or per region × business (owner 2026-10-07: compare BKK with
 * CBR, NAS with LIS, side by side). Shares are of the total in view; attendance = present ÷ (present + leave).
 */
export function groupFigures(rows: BranchFigures[], by: GroupBy) {
  const keyOf = (b: BranchFigures) => (by === "region" ? b.province : by === "biz" ? BUSINESS_SHORT[b.brand] : `${b.province} · ${BUSINESS_SHORT[b.brand]}`)
  const map = new Map<string, Omit<BranchFigures, "id" | "brand" | "province"> & { key: string; branches: number }>()
  for (const b of rows) {
    const k = keyOf(b)
    const g = map.get(k) ?? { key: k, branches: 0, revenue: 0, revenuePrev: 0, active: 0, newCount: 0, returning: 0, lost: 0, pauses: 0, present: 0, leave: 0 }
    g.branches++
    for (const f of ["revenue", "revenuePrev", "active", "newCount", "returning", "lost", "pauses", "present", "leave"] as const) g[f] += b[f]
    map.set(k, g)
  }
  const total = rows.reduce((a, b) => a + b.revenue, 0)
  return [...map.values()].map((g) => ({
    ...g,
    share: total ? g.revenue / total : 0,
    growth: g.revenuePrev ? (g.revenue - g.revenuePrev) / g.revenuePrev : null,
    net: g.newCount + g.returning - g.lost,
    attendance: g.present + g.leave ? g.present / (g.present + g.leave) : null,
    perStudent: g.active ? g.revenue / g.active : null,
  })).sort((a, b) => b.revenue - a.revenue)
}

// ---------- schools (owner 2026-10-07: where our students study — the table no longer shows it per student) ----------

export interface SchoolBreakdown {
  rows: { label: string; value: number }[]
  /** how many different schools */
  schools: number
  /** students counted */
  students: number
  /** of those, no school filled in */
  unknown: number
}

/** Students per school, most first; names are trimmed so "สาธิตจุฬาฯ " and "สาธิตจุฬาฯ" count as one. */
export function schoolBreakdown(students: Pick<Student, "school">[]): SchoolBreakdown {
  const by = new Map<string, number>()
  let unknown = 0
  for (const s of students) {
    const name = s.school?.trim()
    if (!name) { unknown++; continue }
    by.set(name, (by.get(name) ?? 0) + 1)
  }
  const rows = [...by].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, "th"))
  return { rows, schools: rows.length, students: students.length, unknown }
}
