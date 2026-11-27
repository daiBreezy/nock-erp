import { addDays } from "../dates"
import type { DateStr } from "../types"

/** the month a day sits in and the month before it — for the Dashboard's month KPIs (owner 2026-11-27: every KPI card is "this month") */
export function monthBounds(today: DateStr) {
  const [y, m, d] = today.split("-").map(Number)
  const pad = (n: number) => String(n).padStart(2, "0")
  const py = m === 1 ? y - 1 : y
  const pm = m === 1 ? 12 : m - 1
  return {
    from: `${y}-${pad(m)}-01`, days: new Date(y, m, 0).getDate(), day: d,
    prevFrom: `${py}-${pad(pm)}-01`, prevDays: new Date(py, pm, 0).getDate(),
  }
}

/** running total at the end of day 1 … `upTo` of the month starting at `from` (a "pace" line) */
export function cumulativeByDay(rows: { date: DateStr; total: number }[], from: DateStr, days: number, upTo: number): number[] {
  const by = new Map<DateStr, number>()
  for (const r of rows) by.set(r.date, (by.get(r.date) ?? 0) + r.total)
  let sum = 0
  return Array.from({ length: Math.min(upTo, days) }, (_, i) => (sum += by.get(addDays(from, i)) ?? 0))
}
