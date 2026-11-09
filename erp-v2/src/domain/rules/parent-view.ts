// Parent app v1 (owner 2026-10-09) — "School to Parent" inside LINE: what one family sees about their children.
// Read only: classes ahead (day · time · teacher · subject · room), bus legs booked, attendance, summaries already sent
// to the parent, packages left. Pure — the ERP builds it, the parent's phone only reads it.
import type { Attendance, Brand, Branch, BusAddOn, Course, CourseSummary, DateStr, Entitlement, Family, ID, Invoice, Klass, LessonSummary, Session, Staff, Student, TimeStr } from "../types"
import { addDays, endTime, toDateStr } from "../dates"
import { balance, leaveQuota, leavesUsed, packageCovers } from "./attendance"
import { sessionState, subjectsOf, teachersOf } from "./scheduling"
import { courseProgressRows, entitlementRounds, type ProgressRow } from "./summaries"

export interface ParentClass {
  sessionId: ID
  classId?: ID
  /** the course (package) that pays for this class — the parent app filters by it (owner 2026-11-06) */
  courseId?: ID
  /** "คาบที่ n / total" of the package that pays for it */
  seq?: { n: number; total: number }
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

/** สรุปจบคอร์ส as the parent sees it in LINE (owner 2026-10-14) — only once the school has sent it */
export interface ParentCourseSummary {
  id: ID
  courseId?: ID
  course: string
  bundle: boolean
  subjects: string[]
  from: DateStr
  to: DateStr
  teacher: string
  sentAt?: string
  overallProgress: string
  toImprove: string
  strengths: string
  /** the charts — built from session summaries already sent to the parent only */
  progress: ProgressRow[]
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
  attendance: { courseId?: ID; date: DateStr; start: TimeStr; subjects: string[]; status: Attendance["status"] }[]
  summaries: { courseId?: ID; date: DateStr; subjects: string[]; teacher: string; text: string; detail?: string }[]
  /** the courses this child has classes / history in — the filter chips */
  courses: { id: ID; name: string }[]
  packages: { courseId?: ID; course: string; remaining: number | null; total: number | null; from: DateStr; until: DateStr
    /** the course KPI card (same numbers as the student panel): classes checked / all classes of the package, present, leave used / quota */
    done: number; sessions: number; present: number; leaves: number; leaveQuota: number
    /** first subject of the course (the coloured tile) + one line per weekly class with its own progress (owner ref 2026-11-06) */
    subject?: string; slots: { weekday: number; start: TimeStr; minutes: number; done: number; total: number }[] }[]
  /** bus days ahead (pickup / drop-off), for students who bought the bus */
  busDays: { date: DateStr; pickup: boolean; dropoff: boolean; adult?: boolean }[]
  courseSummaries: ParentCourseSummary[]
  /** stopped studying (owner 2026-10-14) — the parent still sees attendance + summaries, and can ask to come back */
  left?: { since: DateStr }
}

export interface ParentView {
  familyId: ID
  familyName: string
  familyNameEn?: string
  /** the brand of the family's branch — picks the language of the automatic replies (owner 2026-11-09) */
  brand?: Brand
  lineUserIds: string[]
  children: ParentChild[]
  generatedAt: string
  /** reasons a parent can pick on แจ้งลาออก (owner 2026-10-14) — the same list the office closes an exit with */
  exitReasons?: { id: ID; label: string; en?: string; ja?: string }[]
  /** has any child of this family paid an invoice? Unpaid families only see Catalog + อื่นๆ (owner 2026-11-06) */
  paid?: boolean
  /** the branch's published catalog link (the parent app's Catalog tab reads it) */
  catalogToken?: string
  /** the house pin the school has for the bus (owner 2026-10-19) — the parent can send it / move it */
  home?: { lat: number; lng: number; addressNote?: string }
}

export const PARENT_DAYS_AHEAD = 30
export const PARENT_HISTORY = 20

export interface ParentCtx {
  students: Student[]; branches: Branch[]; sessions: Session[]; classes: Klass[]; staff: Staff[]; attendance: Attendance[]
  summaries: LessonSummary[]; entitlements: Entitlement[]; courses: Course[]; invoices: Invoice[]; busAddOns: BusAddOn[]; now: Date
  courseSummaries?: CourseSummary[]
  exitReasons?: ParentView["exitReasons"]
}

/** Bus legs a student has paid / asked for, per date: invoice bus legs (non-void) + extra days added after paying. */
export function busDaysOf(studentId: ID, invoices: Invoice[], addOns: BusAddOn[]): Map<DateStr, { pickup: boolean; dropoff: boolean; adult?: boolean }> {
  const out = new Map<DateStr, { pickup: boolean; dropoff: boolean; adult?: boolean }>()
  const put = (date: DateStr, pickup: boolean, dropoff: boolean) => {
    const cur = out.get(date) ?? { pickup: false, dropoff: false }
    out.set(date, { pickup: cur.pickup || pickup, dropoff: cur.dropoff || dropoff })
  }
  for (const inv of invoices) if (inv.studentId === studentId && inv.status !== "void" && inv.status !== "draft") inv.bus.forEach((l) => (l.pickup || l.dropoff) && put(l.date, l.pickup, l.dropoff))
  for (const a of addOns) if (a.studentId === studentId && !a.cancel && !a.companion) put(a.date, a.pickup, a.dropoff)
  // rides the parent cancelled (owner 2026-10-19) — the bus doesn't come
  for (const a of addOns) {
    if (a.studentId !== studentId || !a.cancel) continue
    const cur = out.get(a.date)
    if (!cur) continue
    const next = { pickup: cur.pickup && !a.pickup, dropoff: cur.dropoff && !a.dropoff }
    if (next.pickup || next.dropoff) out.set(a.date, next)
    else out.delete(a.date)
  }
  // a parent riding along that day (owner 2026-10-19)
  for (const a of addOns) {
    const cur = a.studentId === studentId && a.companion ? out.get(a.date) : undefined
    if (cur) out.set(a.date, { ...cur, adult: true })
  }
  return out
}

export function parentView(family: Family, ctx: ParentCtx): ParentView {
  const today = toDateStr(ctx.now)
  const horizon = addDays(today, PARENT_DAYS_AHEAD)
  const teacher = (id: ID) => ctx.staff.find((t) => t.id === id)?.nickname ?? ""
  // owner 2026-10-14: a child who left stays in the app (history only) — the family can still look back, or ask to return
  const kids = ctx.students.filter((s) => s.familyId === family.id)
  const children = kids.map((stu): ParentChild => {
    const branch = ctx.branches.find((b) => b.id === stu.branchId)
    const mine = ctx.sessions.filter((s) => s.studentIds.includes(stu.id))
    const bus = busDaysOf(stu.id, ctx.invoices, ctx.busAddOns)
    const myEnts = ctx.entitlements.filter((e) => e.studentId === stu.id)
    const courseOf = (s: Session) => myEnts.find((e) => packageCovers(e, s))?.courseId
    const covered = new Map<ID, Session[]>()
    const seqOf = (s: Session) => {
      const e = myEnts.find((x) => packageCovers(x, s))
      if (!e) return undefined
      if (!covered.has(e.id)) covered.set(e.id, mine.filter((x) => !x.cancelled && packageCovers(e, x)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)))
      const list = covered.get(e.id)!
      const i = list.findIndex((x) => x.id === s.id)
      return i < 0 ? undefined : { n: i + 1, total: list.length }
    }
    const upcoming = mine
      .filter((s) => s.date >= today && s.date <= horizon && !s.pausedBy && (sessionState(s, ctx.now) !== "closed"))
      .filter((s) => !(s.cancelled && s.date < today))
      .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      .map((s) => ({
        sessionId: s.id, classId: s.classId ?? undefined, courseId: courseOf(s), seq: seqOf(s), date: s.date, start: s.start, end: endTime(s.start, s.minutes), subjects: subjectsOf(s),
        className: ctx.classes.find((k) => k.id === s.classId)?.name ?? subjectsOf(s).join(" + "),
        teachers: teachersOf(s).map(teacher).filter(Boolean),
        room: branch?.rooms.find((r) => r.id === s.roomId)?.name ?? null,
        bus: bus.get(s.date) ?? null,
        cancelled: s.cancelled, cancelReason: s.cancelled ? s.cancelReason : undefined,
      }))
    const byId = new Map(mine.map((s) => [s.id, s]))
    const attendance = ctx.attendance
      .filter((a) => a.studentId === stu.id && byId.has(a.sessionId))
      .map((a) => { const s = byId.get(a.sessionId)!; return { courseId: courseOf(s), date: s.date, start: s.start, subjects: subjectsOf(s), status: a.status } })
      .filter((a) => a.date <= today)
      .sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
      .slice(0, PARENT_HISTORY)
    // only what the school already sent to the parent — drafts / waiting for approval stay inside
    const summaries = ctx.summaries
      .filter((x) => x.studentId === stu.id && x.status === "sent" && byId.has(x.sessionId))
      .map((x) => { const s = byId.get(x.sessionId)!; return { courseId: courseOf(s), date: s.date, subjects: subjectsOf(s), teacher: teacher(x.authorId), text: x.text, detail: x.detail } })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, PARENT_HISTORY)
    const packages = ctx.entitlements
      .filter((e) => e.studentId === stu.id && e.to >= today)
      .map((e) => {
        const b = balance(e, ctx.sessions, ctx.attendance, ctx.classes)
        const counted = e.kind === "sessions"
        const held = mine.filter((x) => !x.cancelled && packageCovers(e, x))
        const marks = ctx.attendance.filter((a) => a.studentId === stu.id && held.some((x) => x.id === a.sessionId))
        return {
          courseId: e.courseId, course: ctx.courses.find((c) => c.id === e.courseId)?.name ?? "", remaining: counted ? b.remaining : null, total: counted ? b.total : null, from: e.from, until: b.until,
          subject: ctx.courses.find((c) => c.id === e.courseId)?.subjects[0],
          slots: [...held.reduce((m, x) => {
            const [yy, mm, dd] = x.date.split("-").map(Number)
            const weekday = new Date(yy, mm - 1, dd).getDay()
            const k = `${x.classId ?? ""}|${weekday}|${x.start}`
            const g = m.get(k) ?? { weekday, start: x.start, minutes: x.minutes, done: 0, total: 0 }
            g.total++
            if (marks.some((a) => a.sessionId === x.id)) g.done++
            return m.set(k, g)
          }, new Map<string, { weekday: number; start: TimeStr; minutes: number; done: number; total: number }>()).values()].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
          done: marks.length, sessions: held.length, present: marks.filter((a) => a.status === "present").length, leaves: leavesUsed(e, ctx.sessions, ctx.attendance), leaveQuota: leaveQuota(e),
        }
      })
    // owner 2026-10-14: the Course End Summary opens from its LINE message — summary + progress charts
    const rounds = entitlementRounds(ctx.entitlements.filter((e) => e.studentId === stu.id))
    const sentNotes = ctx.summaries.filter((x) => x.studentId === stu.id && x.status === "sent")
    const courseSummaries = (ctx.courseSummaries ?? [])
      .filter((cs) => cs.studentId === stu.id && cs.status === "sent")
      .flatMap((cs): ParentCourseSummary[] => {
        const round = rounds.find((r) => r.representativeId === cs.entitlementId)
        const course = ctx.courses.find((c) => c.id === round?.courseId)
        if (!round || !course) return []
        return [{
          id: cs.id, courseId: round.courseId, course: course.name, bundle: course.kind === "bundle", subjects: course.subjects, from: round.from, to: round.to,
          teacher: teacher(cs.authorId), sentAt: cs.history.findLast((h) => h.action === "send")?.at,
          overallProgress: cs.overallProgress, toImprove: cs.toImprove, strengths: cs.strengths,
          progress: courseProgressRows(round, { entitlements: ctx.entitlements, sessions: ctx.sessions, summaries: sentNotes, attendance: ctx.attendance }, today),
        }]
      })
      .sort((a, b) => b.to.localeCompare(a.to))
    const busDays = [...bus.entries()].filter(([d]) => d >= today && d <= horizon).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, ...v }))
    const courseIds = new Set([...upcoming.map((x) => x.courseId), ...attendance.map((x) => x.courseId), ...summaries.map((x) => x.courseId), ...courseSummaries.map((x) => x.courseId), ...myEnts.filter((e) => e.to >= today).map((e) => e.courseId)].filter((x): x is ID => !!x))
    const courses = [...courseIds].map((id) => ({ id, name: ctx.courses.find((c) => c.id === id)?.name ?? "" })).filter((c) => c.name)
    const left = stu.archived ? { since: stu.exit?.lastDate ?? stu.archived.at.slice(0, 10) } : undefined
    return {
      id: stu.id, nickname: stu.nickname, name: stu.name, nameEn: stu.nameEn, nicknameEn: stu.nicknameEn, grade: stu.grade,
      branchName: branch?.name ?? "", brand: branch?.brand ?? "nockacademy", upcoming, attendance, summaries, courses, packages, busDays, courseSummaries,
      // a child who left: history only — no classes ahead, no packages, no bus
      ...(left ? { left, upcoming: [], packages: [], busDays: [] } : {}),
    }
  })
  return {
    familyId: family.id, familyName: family.name, familyNameEn: family.nameEn,
    home: family.location ? { ...family.location, addressNote: family.addressNote } : undefined,
    lineUserIds: family.lineUserId ? [family.lineUserId] : [],
    paid: ctx.invoices.some((i) => kids.some((k) => k.id === i.studentId) && i.status !== "void" && (i.status === "paid" || i.payments.some((x) => x.confirmedBy))),
    catalogToken: ctx.branches.find((b) => b.id === kids[0]?.branchId)?.catalogLink?.token,
    brand: ctx.branches.find((b) => b.id === kids[0]?.branchId)?.brand,
    children, generatedAt: ctx.now.toISOString(), exitReasons: ctx.exitReasons,
  }
}
