// Staff panel (owner 2026-10-09): one teacher's week — sessions done / left, summaries written / left — and the
// students in their hands. Pure, so the numbers match wherever they are shown.
import type { Attendance, DateStr, ID, Klass, Session } from "../types"
import { addDays, weekdayOf } from "../dates"
import { sessionState, teachersOf, workState } from "./scheduling"

type SummaryLite = { sessionId: ID; studentId: ID; status: string }

export const mondayOf = (d: DateStr) => addDays(d, -((weekdayOf(d) + 6) % 7))

export interface TeacherSessionRow {
  session: Session
  /** summaries this session needs: students marked present (students on the roster while not yet marked) */
  needed: number
  written: number
  done: boolean
}

export interface TeacherWeek {
  from: DateStr
  to: DateStr
  rows: TeacherSessionRow[]
  sessions: { total: number; done: number; left: number }
  summaries: { total: number; written: number; left: number }
  minutes: number
}

/** A summary counts as written once it left the teacher's hands (submitted / approved / sent). */
const written = (x: SummaryLite) => x.status !== "draft" && x.status !== "changes_requested"

export function teacherWeek(teacherId: ID, weekOf: DateStr, ctx: { sessions: Session[]; attendance: Attendance[]; summaries: SummaryLite[]; now: Date }): TeacherWeek {
  const from = mondayOf(weekOf), to = addDays(from, 6)
  const rows = ctx.sessions
    .filter((s) => !s.cancelled && s.date >= from && s.date <= to && teachersOf(s).includes(teacherId))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
    .map((s): TeacherSessionRow => {
      const marks = ctx.attendance.filter((a) => a.sessionId === s.id)
      const present = marks.filter((a) => a.status === "present").map((a) => a.studentId)
      const ended = sessionState(s, ctx.now) !== "upcoming" && sessionState(s, ctx.now) !== "live"
      // before the class is marked, every student on the roster is expected to get a summary
      const expect = marks.length ? present : s.studentIds
      const done = ctx.summaries.filter((x) => x.sessionId === s.id && expect.includes(x.studentId) && written(x)).length
      return { session: s, needed: expect.length, written: done, done: ended && workState(s, ctx.now, ctx.attendance, ctx.summaries).state === "done" }
    })
  const total = rows.reduce((n, r) => n + r.needed, 0), wrote = rows.reduce((n, r) => n + r.written, 0)
  return {
    from, to, rows,
    sessions: { total: rows.length, done: rows.filter((r) => r.done).length, left: rows.filter((r) => !r.done).length },
    summaries: { total, written: wrote, left: total - wrote },
    minutes: rows.reduce((m, r) => m + r.session.minutes, 0),
  }
}

/** Students this teacher teaches now: in their active classes or their sessions from today for the next 30 days. */
export function studentsOfTeacher(teacherId: ID, ctx: { sessions: Session[]; classes: Klass[]; today: DateStr }): ID[] {
  const ids = new Set<ID>()
  for (const k of ctx.classes) if (k.active && (k.teacherId === teacherId || k.coTeacherIds.includes(teacherId))) k.studentIds.forEach((x) => ids.add(x))
  const until = addDays(ctx.today, 30)
  for (const s of ctx.sessions) if (!s.cancelled && s.date >= ctx.today && s.date <= until && teachersOf(s).includes(teacherId)) s.studentIds.forEach((x) => ids.add(x))
  return [...ids]
}
