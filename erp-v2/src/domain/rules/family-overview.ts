import type { Attendance, DateStr, Entitlement, ID, Invoice, Klass, Session, Student, StudentLeave } from "../types"
import { activeLeave, balance, exitPending, packageCovers, studentState } from "./attendance"
import { creditsOwed } from "./credit"
import { sessionState } from "./scheduling"
import { attendanceRate } from "./reports"

/**
 * The family's Overview as a small dashboard (owner 2026-11-20): what needs a look right now, and three numbers —
 * the family's next session, what is left across the children (sessions · hours), and (owed — added by the screen) the money.
 * Pure rules, so the panel only draws it.
 */
export interface FamilySnapshot {
  /** the earliest session still ahead for any child */
  next: { studentId: ID; session: Session } | null
  /** across every running package of every child */
  sessionsLeft: number
  minutesLeft: number
  /** children whose every running package ends within the renewal window */
  renewal: ID[]
  /** children with a exit notice still open */
  exiting: { studentId: ID; overdue: boolean }[]
  /** children on a long leave right now */
  onLeave: ID[]
  /** credit courses (studying before paying) still owing money */
  creditCount: number
  /** attended ÷ (attended + leave) over the sessions already held — the same rule as Reports; null = nothing marked yet */
  attendance: { rate: number | null; present: number; leave: number }
}

export function familySnapshot(input: {
  kids: Pick<Student, "id" | "archived" | "exit">[]
  ents: Entitlement[]; invoices: Pick<Invoice, "id" | "status" | "lines" | "number">[]; leaves: StudentLeave[]
  sessions: Session[]; attendance: Attendance[]; classes: Pick<Klass, "id" | "minutes" | "seats">[]
  today: DateStr; now: Date; renewalDays: number
}): FamilySnapshot {
  const { kids, ents, invoices, leaves, sessions, attendance, classes, today, now, renewalDays } = input
  let next: FamilySnapshot["next"] = null
  let sessionsLeft = 0, minutesLeft = 0, creditCount = 0
  const renewal: ID[] = [], onLeave: ID[] = []
  const exiting: FamilySnapshot["exiting"] = []
  for (const k of kids) {
    const mine = ents.filter((e) => e.studentId === k.id)
    if (studentState(k, mine, leaves.filter((l) => l.studentId === k.id), today, renewalDays).status === "renewal") renewal.push(k.id)
    if (activeLeave(k.id, today, leaves)) onLeave.push(k.id)
    const ex = exitPending(k, today)
    if (ex) exiting.push({ studentId: k.id, overdue: ex.overdue })
    creditCount += creditsOwed(k.id, ents, invoices).length
    for (const e of mine.filter((x) => x.to >= today)) {
      const ahead = sessions
        .filter((x) => x.studentIds.includes(k.id) && !x.cancelled && packageCovers(e, x) && x.date >= today && sessionState(x, now) === "upcoming")
        .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
      if (ahead[0] && (!next || (ahead[0].date + ahead[0].start).localeCompare(next.session.date + next.session.start) < 0)) next = { studentId: k.id, session: ahead[0] }
      const bal = balance(e, sessions, attendance, classes)
      const left = Math.min(bal.remaining, ahead.length || bal.remaining)
      sessionsLeft += left
      minutesLeft += bal.remainingMinutes ?? ahead.slice(0, left).reduce((m, x) => m + x.minutes, 0)
    }
  }
  const kidIds = new Set(kids.map((k) => k.id))
  const held = sessions.filter((x) => x.date <= today && x.studentIds.some((id) => kidIds.has(id)))
  const att = attendanceRate(held, attendance.filter((a) => kidIds.has(a.studentId)), { from: "0000-01-01", to: today })
  return { next, sessionsLeft, minutesLeft, renewal, exiting, onLeave, creditCount, attendance: att }
}

/**
 * Packages of the SAME course, dates and kind are ONE course the child takes on several days (owner 2026-11-20: "ถ้าเป็น Course เดียวกัน ให้รวมกัน — เรียน 2 วัน") —
 * shown as one row with a line per class. Display only: the first package keeps its id, the classes are joined, the totals added.
 */
export function mergeSameCourse(ents: Entitlement[]): Entitlement[] {
  const out = new Map<string, Entitlement>()
  for (const e of ents) {
    const key = `${e.studentId}|${e.courseId}|${e.from}|${e.to}|${e.kind}`
    const have = out.get(key)
    out.set(key, !have ? e : {
      ...have,
      classIds: [...new Set([...have.classIds, ...e.classIds])],
      sessionsTotal: have.sessionsTotal + e.sessionsTotal,
      ...(have.minutesTotal || e.minutesTotal ? { minutesTotal: (have.minutesTotal ?? 0) + (e.minutesTotal ?? 0) } : {}),
    })
  }
  return [...out.values()]
}
