// Parent app v1 (owner 2026-10-09) — "School to Parent" inside LINE: what one family sees about their children.
// Read only: classes ahead (day · time · teacher · subject · room), bus legs booked, attendance, summaries already sent
// to the parent, packages left. Pure — the ERP builds it, the parent's phone only reads it.
import type { Attendance, Branch, BusAddOn, Course, DateStr, Entitlement, Family, ID, Invoice, Klass, LessonSummary, Session, Staff, Student, TimeStr } from "../types"
import { addDays, endTime, toDateStr } from "../dates"
import { balance } from "./attendance"
import { sessionState, subjectsOf, teachersOf } from "./scheduling"

export interface ParentClass {
  sessionId: ID
  date: DateStr
  start: TimeStr
  end: TimeStr
  subjects: string[]
  className: string
  teachers: string[]
  room: string | null
  /** bus booked for this day — only for students who bought the bus */
  bus: { pickup: boolean; dropoff: boolean } | null
  cancelled: boolean
  cancelReason?: string
}

export interface ParentChild {
  id: ID
  nickname: string
  name: string
  nameEn?: string
  nicknameEn?: string
  grade: string
  branchName: string
  brand: Branch["brand"]
  upcoming: ParentClass[]
  attendance: { date: DateStr; start: TimeStr; subjects: string[]; status: Attendance["status"] }[]
  summaries: { date: DateStr; subjects: string[]; teacher: string; text: string; detail?: string }[]
  packages: { course: string; remaining: number | null; total: number | null; until: DateStr }[]
  /** bus days ahead (pickup / drop-off), for students who bought the bus */
  busDays: { date: DateStr; pickup: boolean; dropoff: boolean }[]
}

export interface ParentView {
  familyId: ID
  familyName: string
  familyNameEn?: string
  lineUserIds: string[]
  children: ParentChild[]
  generatedAt: string
}

export const PARENT_DAYS_AHEAD = 30
export const PARENT_HISTORY = 20

export interface ParentCtx {
  students: Student[]; branches: Branch[]; sessions: Session[]; classes: Klass[]; staff: Staff[]; attendance: Attendance[]
  summaries: LessonSummary[]; entitlements: Entitlement[]; courses: Course[]; invoices: Invoice[]; busAddOns: BusAddOn[]; now: Date
}

/** Bus legs a student has paid / asked for, per date: invoice bus legs (non-void) + extra days added after paying. */
export function busDaysOf(studentId: ID, invoices: Invoice[], addOns: BusAddOn[]): Map<DateStr, { pickup: boolean; dropoff: boolean }> {
  const out = new Map<DateStr, { pickup: boolean; dropoff: boolean }>()
  const put = (date: DateStr, pickup: boolean, dropoff: boolean) => {
    const cur = out.get(date) ?? { pickup: false, dropoff: false }
    out.set(date, { pickup: cur.pickup || pickup, dropoff: cur.dropoff || dropoff })
  }
  for (const inv of invoices) if (inv.studentId === studentId && inv.status !== "void" && inv.status !== "draft") inv.bus.forEach((l) => (l.pickup || l.dropoff) && put(l.date, l.pickup, l.dropoff))
  for (const a of addOns) if (a.studentId === studentId) put(a.date, a.pickup, a.dropoff)
  return out
}

export function parentView(family: Family, ctx: ParentCtx): ParentView {
  const today = toDateStr(ctx.now)
  const horizon = addDays(today, PARENT_DAYS_AHEAD)
  const teacher = (id: ID) => ctx.staff.find((t) => t.id === id)?.nickname ?? ""
  const kids = ctx.students.filter((s) => s.familyId === family.id && !s.archived)
  const children = kids.map((stu): ParentChild => {
    const branch = ctx.branches.find((b) => b.id === stu.branchId)
    const mine = ctx.sessions.filter((s) => s.studentIds.includes(stu.id))
    const bus = busDaysOf(stu.id, ctx.invoices, ctx.busAddOns)
    const upcoming = mine
      .filter((s) => s.date >= today && s.date <= horizon && !s.pausedBy && (sessionState(s, ctx.now) !== "closed"))
      .filter((s) => !(s.cancelled && s.date < today))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .map((s) => ({
        sessionId: s.id, date: s.date, start: s.start, end: endTime(s.start, s.minutes), subjects: subjectsOf(s),
        className: ctx.classes.find((k) => k.id === s.classId)?.name ?? subjectsOf(s).join(" + "),
        teachers: teachersOf(s).map(teacher).filter(Boolean),
        room: branch?.rooms.find((r) => r.id === s.roomId)?.name ?? null,
        bus: bus.get(s.date) ?? null,
        cancelled: s.cancelled, cancelReason: s.cancelled ? s.cancelReason : undefined,
      }))
    const byId = new Map(mine.map((s) => [s.id, s]))
    const attendance = ctx.attendance
      .filter((a) => a.studentId === stu.id && byId.has(a.sessionId))
      .map((a) => { const s = byId.get(a.sessionId)!; return { date: s.date, start: s.start, subjects: subjectsOf(s), status: a.status } })
      .filter((a) => a.date <= today)
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
      .slice(0, PARENT_HISTORY)
    // only what the school already sent to the parent — drafts / waiting for approval stay inside
    const summaries = ctx.summaries
      .filter((x) => x.studentId === stu.id && x.status === "sent" && byId.has(x.sessionId))
      .map((x) => { const s = byId.get(x.sessionId)!; return { date: s.date, subjects: subjectsOf(s), teacher: teacher(x.authorId), text: x.text, detail: x.detail } })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, PARENT_HISTORY)
    const packages = ctx.entitlements
      .filter((e) => e.studentId === stu.id && e.to >= today)
      .map((e) => {
        const b = balance(e, ctx.sessions, ctx.attendance, ctx.classes)
        const counted = e.kind === "sessions"
        return { course: ctx.courses.find((c) => c.id === e.courseId)?.name ?? "", remaining: counted ? b.remaining : null, total: counted ? b.total : null, until: b.until }
      })
    const busDays = [...bus.entries()].filter(([d]) => d >= today && d <= horizon).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }))
    return {
      id: stu.id, nickname: stu.nickname, name: stu.name, nameEn: stu.nameEn, nicknameEn: stu.nicknameEn, grade: stu.grade,
      branchName: branch?.name ?? "", brand: branch?.brand ?? "nockacademy", upcoming, attendance, summaries, packages, busDays,
    }
  })
  return {
    familyId: family.id, familyName: family.name, familyNameEn: family.nameEn,
    lineUserIds: family.lineUserId ? [family.lineUserId] : [],
    children, generatedAt: ctx.now.toISOString(),
  }
}
