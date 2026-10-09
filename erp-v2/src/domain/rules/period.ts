// Date period for list pages (owner 2026-10-09): วันนี้ · สัปดาห์นี้ · เดือนนี้ · กำหนดเอง — one rule for Sessions,
// Attendance and Summaries so the same choice always means the same days.
import type { DateStr } from "../types"
import { addDays, addMonths, daysBetween, endOfMonth, weekdayOf } from "../dates"

export type PeriodMode = "day" | "week" | "month" | "custom"

export interface PeriodRange { from: DateStr; to: DateStr }

const monday = (d: DateStr) => addDays(d, -((weekdayOf(d) + 6) % 7))

/** The days a mode covers around `anchor` (custom = the range given) */
export function periodRange(mode: PeriodMode, anchor: DateStr, custom?: PeriodRange): PeriodRange {
  if (mode === "day") return { from: anchor, to: anchor }
  if (mode === "week") { const m = monday(anchor); return { from: m, to: addDays(m, 6) } }
  if (mode === "month") { const first = anchor.slice(0, 8) + "01"; return { from: first, to: endOfMonth(first) } }
  return custom ?? { from: anchor, to: anchor }
}

/** ◀ / ▶ — one day, week or month; a custom range moves by its own length */
export function shiftPeriod(mode: PeriodMode, anchor: DateStr, dir: -1 | 1, custom?: PeriodRange): { anchor: DateStr; custom?: PeriodRange } {
  if (mode === "day") return { anchor: addDays(anchor, dir) }
  if (mode === "week") return { anchor: addDays(anchor, 7 * dir) }
  if (mode === "month") return { anchor: addMonths(anchor.slice(0, 8) + "01", dir) }
  const r = custom ?? { from: anchor, to: anchor }
  const len = daysBetween(r.from, r.to) + 1
  return { anchor, custom: { from: addDays(r.from, len * dir), to: addDays(r.to, len * dir) } }
}

/** the period that contains today? (then the chip reads "วันนี้ / สัปดาห์นี้ / เดือนนี้") */
export function isCurrent(mode: PeriodMode, anchor: DateStr, today: DateStr) {
  if (mode === "custom") return false
  const r = periodRange(mode, anchor)
  return r.from <= today && today <= r.to
}
