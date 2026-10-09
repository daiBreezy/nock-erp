// Calendar › Summary (owner 2026-10-09): everything that will happen in the range on screen — classes, teachers,
// subjects — plus every problem the admin has to deal with, so nothing is found out on the day.
import type { Attendance, Branch, Holiday, ID, Klass, Session, Staff, TimeStr, Weekday } from "../types"
import { weekdayOf } from "../dates"
import { CAPACITY, isHoliday, sessionState, slotProblem, subjectsOf, teachersOf, workState, type Conflict } from "./scheduling"

export type SummaryIssueKind =
  | "conflict" | "no_teacher" | "teacher_gone" | "no_room" | "on_holiday" | "closed_day" | "outside_hours"
  | "no_students" | "over_capacity" | "teacher_leave" | "needs_attendance" | "needs_summary" | "cancelled"

export interface SummaryIssue {
  kind: SummaryIssueKind
  /** red = must fix before the day · amber = should look at · info = for the record */
  level: "red" | "amber" | "info"
  title: string
  /** what to do about it */
  hint: string
  sessionIds: ID[]
}

export interface SummaryClassRow {
  /** class id, or "one:<sessionId>" for a session without a class (test / trial / one-off) */
  key: string
  classId: ID | null
  name: string
  subjects: string[]
  /** main teacher first, then co-teachers — every teacher seen in the range */
  teacherIds: ID[]
  roomIds: ID[]
  /** distinct weekday + start time, e.g. Tue 16:00 */
  slots: { weekday: Weekday; start: TimeStr; minutes: number }[]
  students: number
  sessions: number
  minutes: number
  /** sessions of this class with a problem to handle · urgent = the red ones */
  problems: number
  urgent: number
}

export interface CalendarSummary {
  sessions: number
  classes: number
  teachers: number
  students: number
  minutes: number
  cancelled: number
  issues: SummaryIssue[]
  rows: SummaryClassRow[]
}

const ORDER: SummaryIssueKind[] = ["conflict", "no_teacher", "teacher_gone", "closed_day", "on_holiday", "no_room", "over_capacity", "outside_hours", "no_students", "needs_attendance", "needs_summary", "teacher_leave", "cancelled"]

export function calendarSummary(range: Session[], ctx: {
  branch: Branch; classes: Klass[]; staff: Staff[]; holidays: Holiday[]; conflicts: Conflict[]
  attendance: Attendance[]; summaries: { sessionId: ID; studentId: ID; status: string }[]; now: Date
}): CalendarSummary {
  const live = range.filter((s) => !s.cancelled)
  const upcoming = live.filter((s) => sessionState(s, ctx.now) === "upcoming")
  const klass = (id: ID | null) => (id ? ctx.classes.find((k) => k.id === id) : undefined)
  const staffOf = (id: ID) => ctx.staff.find((t) => t.id === id)

  const found = new Map<SummaryIssueKind, Set<ID>>()
  const add = (kind: SummaryIssueKind, id: ID) => found.set(kind, (found.get(kind) ?? new Set()).add(id))

  for (const c of ctx.conflicts) c.sessionIds.forEach((id) => add("conflict", id))
  for (const s of upcoming) {
    if (!s.teacherId) add("no_teacher", s.id)
    else if (teachersOf(s).some((t) => !staffOf(t)?.active)) add("teacher_gone", s.id)
    if (!s.roomId) add("no_room", s.id)
    if (s.pausedBy) continue
    if (isHoliday(s.date, s.branchId, ctx.holidays)) add("on_holiday", s.id)
    else {
      const p = slotProblem(ctx.branch, s.date, s.start, s.minutes)
      if (p) add(p === "สาขาปิด" ? "closed_day" : "outside_hours", s.id)
    }
    const k = klass(s.classId)
    if (!s.studentIds.length && k?.kind === "learning") add("no_students", s.id)
    if (k && s.studentIds.length > CAPACITY[k.type]) add("over_capacity", s.id)
  }
  for (const s of live) {
    const w = workState(s, ctx.now, ctx.attendance, ctx.summaries).state
    if (w === "needs_attendance") add("needs_attendance", s.id)
    if (w === "needs_summary") add("needs_summary", s.id)
  }
  for (const s of range.filter((x) => x.cancelled && sessionState(x, ctx.now) === "cancelled")) {
    if (s.teacherLeave && !s.teacherLeave.substituteId) add("teacher_leave", s.id)
    else if (!s.pausedBy) add("cancelled", s.id)
  }

  const TEXT: Record<SummaryIssueKind, [SummaryIssue["level"], string, string]> = {
    conflict: ["red", "คาบชนกัน", "ย้ายครู / ห้อง / เวลา หรือรวมคาบ"],
    no_teacher: ["red", "ยังไม่มีครู", "เลือกครูให้คาบ"],
    teacher_gone: ["red", "ครูออกแล้วแต่ยังมีคาบ", "เปลี่ยนเป็นครูที่ยังทำงานอยู่"],
    closed_day: ["red", "คาบในวันที่สาขาปิด", "ยืนยันว่าเปิดสอนจริง หรือย้ายวัน"],
    on_holiday: ["red", "คาบตรงวันหยุด", "ยกเลิก / ย้าย และแจ้งผู้ปกครอง"],
    no_room: ["amber", "ยังไม่ระบุห้อง", "เลือกห้องให้คาบ"],
    over_capacity: ["amber", "นักเรียนเกินจำนวนที่แนะนำ", "แยกคาบหรือเปลี่ยนเป็นคลาสกลุ่ม"],
    outside_hours: ["amber", "คาบนอกเวลาเปิด", "ยืนยันเวลา หรือแจ้งทีมที่ต้องอยู่ต่อ"],
    no_students: ["amber", "คาบที่ยังไม่มีนักเรียน", "เพิ่มนักเรียน หรือยกเลิกคาบ"],
    needs_attendance: ["amber", "รอเช็คชื่อ", "ให้ครูเช็คชื่อคาบที่จบแล้ว"],
    needs_summary: ["amber", "รอสรุปการเรียน", "ให้ครูเขียนสรุป"],
    teacher_leave: ["info", "ครูลา — คาบถูกยกเลิก", "นัดเรียนชดเชย (แพ็กเกจยืดให้แล้ว)"],
    cancelled: ["info", "คาบที่ยกเลิก", "เช็คว่าแจ้งผู้ปกครองแล้ว"],
  }
  const issues = ORDER.filter((k) => found.has(k)).map((kind) => {
    const [level, title, hint] = TEXT[kind]
    return { kind, level, title, hint, sessionIds: [...found.get(kind)!] }
  })
  const problemIds = new Set(issues.filter((i) => i.level !== "info").flatMap((i) => i.sessionIds))
  const urgentIds = new Set(issues.filter((i) => i.level === "red").flatMap((i) => i.sessionIds))

  const rows = new Map<string, SummaryClassRow & { stu: Set<ID> }>()
  for (const s of live) {
    const k = klass(s.classId)
    const key = k ? k.id : `one:${s.id}`
    const r = rows.get(key) ?? { key, classId: k?.id ?? null, name: k?.name ?? s.subject, subjects: [], teacherIds: [], roomIds: [], slots: [], students: 0, sessions: 0, minutes: 0, problems: 0, urgent: 0, stu: new Set<ID>() }
    for (const x of subjectsOf(s)) if (!r.subjects.includes(x)) r.subjects.push(x)
    for (const t of teachersOf(s)) if (!r.teacherIds.includes(t)) r.teacherIds.push(t)
    if (s.roomId && !r.roomIds.includes(s.roomId)) r.roomIds.push(s.roomId)
    const wd = weekdayOf(s.date)
    if (!r.slots.some((x) => x.weekday === wd && x.start === s.start)) r.slots.push({ weekday: wd, start: s.start, minutes: s.minutes })
    s.studentIds.forEach((id) => r.stu.add(id))
    r.sessions++
    r.minutes += s.minutes
    if (problemIds.has(s.id)) r.problems++
    if (urgentIds.has(s.id)) r.urgent++
    rows.set(key, r)
  }
  const list = [...rows.values()].map(({ stu, ...r }) => ({
    ...r, students: stu.size,
    slots: r.slots.sort((a, b) => ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start)),
  })).sort((a, b) => b.urgent - a.urgent || b.problems - a.problems || a.name.localeCompare(b.name, "th"))

  return {
    sessions: live.length,
    classes: list.length,
    teachers: new Set(live.flatMap((s) => teachersOf(s))).size,
    students: new Set(live.flatMap((s) => s.studentIds)).size,
    minutes: live.reduce((m, s) => m + s.minutes, 0),
    cancelled: range.length - live.length,
    issues,
    rows: list,
  }
}

/** Group rows for the Teacher | Subject tabs — a class with two teachers / subjects shows under each. */
export function groupSummaryRows(rows: SummaryClassRow[], by: "teacher" | "subject"): { key: string; rows: SummaryClassRow[] }[] {
  const groups = new Map<string, SummaryClassRow[]>()
  for (const r of rows) {
    const keys = by === "teacher" ? (r.teacherIds.length ? r.teacherIds : [""]) : r.subjects
    for (const k of keys) groups.set(k, [...(groups.get(k) ?? []), r])
  }
  return [...groups.entries()].map(([key, rows]) => ({ key, rows })).sort((a, b) => (a.key === "" ? 1 : b.key === "" ? -1 : b.rows.length - a.rows.length))
}
