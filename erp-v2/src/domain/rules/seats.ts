// Flexible class time (owner 2026-09-30): a 2-hour class where some students come for one hour only — either every
// time (Klass.seats, set on the invoice) or just once (Session.seats, or the minutes on the attendance mark). Hour
// packs are used up by the minutes really attended, so the time left over is never lost.

import { fromMinutes, toMinutes } from "../dates"
import type { Attendance, ID, Klass, Seat, Session } from "../types"

export const fullSeat = (minutes: number): Seat => ({ offset: 0, minutes })

/** The student's part of this session: this-session override → standing class seat → the whole session. */
export function seatOf(s: Pick<Session, "minutes" | "seats">, studentId: ID, klass?: Pick<Klass, "seats"> | null): Seat {
  return s.seats?.[studentId] ?? klass?.seats?.[studentId] ?? fullSeat(s.minutes)
}

/** every window the student attends, in time order */
export const seatWindows = (seat: Seat): { offset: number; minutes: number }[] => [{ offset: seat.offset, minutes: seat.minutes }, ...(seat.more ?? [])].sort((a, b) => a.offset - b.offset)

/** minutes the student attends in a class meeting — what an hour pack is charged */
export const seatTotal = (seat: Seat) => seatWindows(seat).reduce((a, w) => a + w.minutes, 0)

export const isPartial = (seat: Seat, classMinutes: number) => seat.offset > 0 || seat.minutes < classMinutes || !!seat.more?.length

/** The hours (60-minute blocks) of a class as chips: index → offset/minutes. */
export function hourBlocks(classMinutes: number): { offset: number; minutes: number }[] {
  const out: { offset: number; minutes: number }[] = []
  for (let offset = 0; offset < classMinutes; offset += 60) out.push({ offset, minutes: Math.min(60, classMinutes - offset) })
  return out
}

/** Chosen hour blocks (by index) → one Seat; neighbouring blocks merge into one window. Nothing chosen = null. */
export function seatFromBlocks(classMinutes: number, picked: number[]): Seat | null {
  const blocks = hourBlocks(classMinutes)
  const wins: { offset: number; minutes: number }[] = []
  for (const i of [...new Set(picked)].sort((a, b) => a - b)) {
    const b = blocks[i]
    if (!b) continue
    const last = wins[wins.length - 1]
    if (last && last.offset + last.minutes === b.offset) last.minutes += b.minutes
    else wins.push({ ...b })
  }
  if (!wins.length) return null
  const [first, ...more] = wins
  return more.length ? { ...first, more } : { ...first }
}

/** Which hour blocks a seat covers fully (for the chips) */
export const blocksOf = (seat: Seat, classMinutes: number): number[] =>
  hourBlocks(classMinutes).flatMap((b, i) => (seatWindows(seat).some((w) => w.offset <= b.offset && b.offset + b.minutes <= w.offset + w.minutes) ? [i] : []))

/** Windows must be inside the class, positive and not overlapping. */
export function validateSeat(seat: Seat, classMinutes: number): string | null {
  const w = seatWindows(seat)
  if (w.some((x) => !(x.minutes > 0) || x.offset < 0 || x.offset + x.minutes > classMinutes)) return "ช่วงเวลาไม่อยู่ในคาบ"
  for (let i = 1; i < w.length; i++) if (w[i].offset < w[i - 1].offset + w[i - 1].minutes) return "ช่วงเวลาซ้อนกัน"
  return null
}

/** The same seat when the class starts `shift` minutes later/earlier (moving a student between sessions). */
export const shiftSeat = (seat: Seat, shift: number): Seat => ({ offset: Math.max(0, seat.offset + shift), minutes: seat.minutes, ...(seat.more ? { more: seat.more.map((w) => ({ ...w, offset: Math.max(0, w.offset + shift) })) } : {}) })

/** Choices for a class of this length: the whole class, then each hour of it. */
export function seatOptions(classMinutes: number): Seat[] {
  if (classMinutes <= 60) return [fullSeat(classMinutes)]
  const parts: Seat[] = []
  for (let offset = 0; offset < classMinutes; offset += 60) parts.push({ offset, minutes: Math.min(60, classMinutes - offset) })
  return [fullSeat(classMinutes), ...parts]
}

export function seatLabel(seat: Seat, classMinutes: number): string {
  if (!isPartial(seat, classMinutes)) return `เต็มคลาส (${fmtLen(classMinutes)})`
  if (seat.more?.length) return `เรียน ${fmtLen(seatTotal(seat))} (${seatWindows(seat).length} ช่วง)`
  // typed by hand (45 / 25 minutes, starting mid-hour) — just the length; the time is in the tooltip
  if (seat.offset % 60 !== 0 || (seat.minutes % 60 !== 0 && seat.offset + seat.minutes < classMinutes)) return `เรียน ${fmtLen(seat.minutes)}`
  if (seat.offset === 0) return `ชม.แรก (${fmtLen(seat.minutes)})`
  if (seat.offset + seat.minutes >= classMinutes) return `ชม.หลัง (${fmtLen(seat.minutes)})`
  return `ชม.ที่ ${Math.floor(seat.offset / 60) + 1} (${fmtLen(seat.minutes)})`
}

/** "16:00–17:00" for this student's part */
export function seatTime(start: string, seat: Seat) {
  return seatWindows(seat).map((w) => { const from = toMinutes(start) + w.offset; return `${fromMinutes(from)}–${fromMinutes(from + w.minutes)}` }).join(" + ")
}

export const fmtLen = (m: number) => (m % 60 === 0 ? `${m / 60} ชม.` : m > 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m} นาที`)

/** Minutes a mark takes from an hour pack: present = what was really attended, absent = the seat, leave = nothing. */
export function minutesCharged(a: Pick<Attendance, "status" | "minutes">, seat: Seat): number {
  if (a.status === "leave") return 0
  if (a.status === "present" && a.minutes !== undefined) return a.minutes
  return seatTotal(seat)
}

/** "came for" choices when marking present: the seat, then shorter in 30-minute steps */
export function attendedChoices(seat: Seat): number[] {
  const total = seatTotal(seat)
  const out = [total]
  for (let m = total - 30; m >= 30; m -= 30) out.push(m)
  return out
}
