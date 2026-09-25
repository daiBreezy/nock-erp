import type { DateStr, TimeStr, Weekday } from "./types"

const pad = (n: number) => String(n).padStart(2, "0")

export function toDateStr(d: Date): DateStr {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseDate(s: DateStr): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(s: DateStr, days: number): DateStr {
  const d = parseDate(s)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

export function daysBetween(from: DateStr, to: DateStr): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000)
}

export function weekdayOf(s: DateStr): Weekday {
  return parseDate(s).getDay() as Weekday
}

export function toMinutes(t: TimeStr): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + m
}

export function fromMinutes(min: number): TimeStr {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`
}

export function endTime(start: TimeStr, minutes: number): TimeStr {
  return fromMinutes(toMinutes(start) + minutes)
}

/** Local Date for a session date + time */
export function at(date: DateStr, time: TimeStr): Date {
  const d = parseDate(date)
  const m = toMinutes(time)
  d.setHours(Math.floor(m / 60), m % 60, 0, 0)
  return d
}

/** First date on/after `from` that falls on `weekday` */
export function nextWeekday(from: DateStr, weekday: Weekday): DateStr {
  const diff = (weekday - weekdayOf(from) + 7) % 7
  return addDays(from, diff)
}

export function endOfMonth(s: DateStr): DateStr {
  const d = parseDate(s)
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + 1, 0))
}

export function addMonths(s: DateStr, months: number): DateStr {
  const d = parseDate(s)
  return toDateStr(new Date(d.getFullYear(), d.getMonth() + months, 1))
}

export function monthKey(s: DateStr): string {
  return s.slice(0, 7)
}

export function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number) {
  return aStart < bEnd && bStart < aEnd
}

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]
const TH_DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
export const TH_DAYS_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]

/** "พ. 24 ก.ย. 69" — always includes the date so times are never ambiguous (B6) */
export function fmtDate(s: DateStr, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const d = parseDate(s)
  const parts = [`${d.getDate()} ${TH_MONTHS[d.getMonth()]}`]
  if (opts.year) parts.push(String((d.getFullYear() + 543) % 100))
  const base = parts.join(" ")
  return opts.weekday ? `${TH_DAYS[d.getDay()]} ${base}` : base
}

export function fmtMonth(s: DateStr): string {
  const d = parseDate(s)
  return `${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`
}

export function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return `${fmtDate(toDateStr(d))} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fmtMoney(n: number): string {
  return `฿${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
}

export function dayShort(w: Weekday) {
  return TH_DAYS[w]
}
