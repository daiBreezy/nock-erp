// Yearly grade rollover (owner 2026-11-19): on one day a year (default 1 April, set per business type by the Director) every
// student moves up a grade. The Admin must approve it (default) — or the branch switches it to Auto. A reminder shows from
// 7 days before. The last grade (ม.6 / G12) becomes "จบการศึกษา". Pure functions — the page, the dashboard and the store share them.

import { addDays, toDateStr } from "../dates"
import type { Brand, DateStr, GradeRolloverRecord, ID, Student, SystemConfig } from "../types"

/** the stored grade names, in the order a child climbs them (อ.1 … ม.6) */
export const GRADE_LADDER = ["อ.1", "อ.2", "อ.3", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"] as const

/** the grade after this one; "graduated" after ม.6; null = a grade we don't know (left alone) */
export function nextGrade(grade: string): string | "graduated" | null {
  const i = GRADE_LADDER.indexOf(grade as (typeof GRADE_LADDER)[number])
  if (i < 0) return null
  return i === GRADE_LADDER.length - 1 ? "graduated" : GRADE_LADDER[i + 1]
}

export const REMIND_DAYS = 7
export const DEFAULT_ROLLOVER = { month: 4, day: 1 }

export const rolloverDay = (cfg: SystemConfig["gradeRollover"], brand: Brand) => cfg?.[brand] ?? DEFAULT_ROLLOVER
const pad = (n: number) => String(n).padStart(2, "0")
/** this calendar year's rollover date */
export const rolloverDate = (cfg: SystemConfig["gradeRollover"], brand: Brand, year: number): DateStr => { const d = rolloverDay(cfg, brand); return `${year}-${pad(d.month)}-${pad(d.day)}` }

export type RolloverState =
  | { kind: "none" }
  | { kind: "upcoming"; date: DateStr; daysLeft: number; year: number }
  | { kind: "due"; date: DateStr; year: number }

/** where this branch stands today: nothing · a reminder (≤ 7 days before) · due (the day came and this year's change isn't done yet) */
export function rolloverState(today: DateStr, cfg: SystemConfig["gradeRollover"], brand: Brand, branchId: ID, done: GradeRolloverRecord[]): RolloverState {
  const year = Number(today.slice(0, 4))
  const date = rolloverDate(cfg, brand, year)
  if (done.some((r) => r.branchId === branchId && r.year === year)) return { kind: "none" }
  if (today >= date) return { kind: "due", date, year }
  const daysLeft = Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000)
  return daysLeft <= REMIND_DAYS ? { kind: "upcoming", date, daysLeft, year } : { kind: "none" }
}

export interface RolloverChange { student: Student; from: string; to: string | "graduated" }

/** every student of the branch who moves: not already graduated / archived, with a grade we know */
export function planRollover(students: Student[], branchId: ID): RolloverChange[] {
  const out: RolloverChange[] = []
  for (const s of students) {
    if (s.branchId !== branchId || s.archived || s.graduatedAt) continue
    const to = nextGrade(s.grade)
    if (to) out.push({ student: s, from: s.grade, to })
  }
  return out
}

/** the students after the change (the ones in `skip` stay as they are — repeated a year, skipped ahead …) */
export function applyRollover(students: Student[], branchId: ID, today: DateStr, skip: ReadonlySet<ID> = new Set()): { students: Student[]; moved: number; graduated: number } {
  const plan = new Map(planRollover(students, branchId).filter((c) => !skip.has(c.student.id)).map((c) => [c.student.id, c]))
  let moved = 0, graduated = 0
  const next = students.map((s) => {
    const c = plan.get(s.id)
    if (!c) return s
    if (c.to === "graduated") { graduated++; return { ...s, graduatedAt: today } }
    moved++
    return { ...s, grade: c.to }
  })
  return { students: next, moved, graduated }
}

export const todayOf = (d: Date) => toDateStr(d)
export { addDays }
