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

export const isPartial = (seat: Seat, classMinutes: number) => seat.offset > 0 || seat.minutes < classMinutes

/** Choices for a class of this length: the whole class, then each hour of it. */
export function seatOptions(classMinutes: number): Seat[] {
  if (classMinutes <= 60) return [fullSeat(classMinutes)]
  const parts: Seat[] = []
  for (let offset = 0; offset < classMinutes; offset += 60) parts.push({ offset, minutes: Math.min(60, classMinutes - offset) })
  return [fullSeat(classMinutes), ...parts]
}

export function seatLabel(seat: Seat, classMinutes: number): string {
  if (!isPartial(seat, classMinutes)) return `เต็มคลาส (${fmtLen(classMinutes)})`
  if (seat.offset === 0) return `ชม.แรก (${fmtLen(seat.minutes)})`
  if (seat.offset + seat.minutes >= classMinutes) return `ชม.หลัง (${fmtLen(seat.minutes)})`
  return `ชม.ที่ ${Math.floor(seat.offset / 60) + 1} (${fmtLen(seat.minutes)})`
}

/** "16:00–17:00" for this student's part */
export function seatTime(start: string, seat: Seat) {
  const from = toMinutes(start) + seat.offset
  return `${fromMinutes(from)}–${fromMinutes(from + seat.minutes)}`
}

export const fmtLen = (m: number) => (m % 60 === 0 ? `${m / 60} ชม.` : m > 60 ? `${Math.floor(m / 60)} ชม. ${m % 60} นาที` : `${m} นาที`)

/** Minutes a mark takes from an hour pack: present = what was really attended, absent = the seat, leave = nothing. */
export function minutesCharged(a: Pick<Attendance, "status" | "minutes">, seat: Seat): number {
  if (a.status === "leave") return 0
  if (a.status === "present" && a.minutes !== undefined) return a.minutes
  return seat.minutes
}

/** "came for" choices when marking present: the seat, then shorter in 30-minute steps */
export function attendedChoices(seat: Seat): number[] {
  const out = [seat.minutes]
  for (let m = seat.minutes - 30; m >= 30; m -= 30) out.push(m)
  return out
}
