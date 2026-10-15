// Note Calendar (owner 2026-10-15): notes on a student in a class, separate from the student's Note tab.
// ถาวร (permanent) = every session of the class · ชั่วคราว (temporary) = just that session.
import type { CalendarNote, CalendarNoteKind, ID, Result, Session } from "../types"

export const NOTE_KIND_LABEL: Record<CalendarNoteKind, string> = { permanent: "ถาวร", temporary: "ชั่วคราว" }
export const CALENDAR_NOTE_MAX = 200

/** the notes one student shows in one session — permanent first, then newest */
export function calendarNotesFor(s: Pick<Session, "id" | "classId">, studentId: ID, notes: CalendarNote[]): CalendarNote[] {
  return notes
    .filter((n) => n.studentId === studentId && (n.kind === "permanent" ? !!s.classId && n.classId === s.classId : n.sessionId === s.id))
    .sort((a, b) => Number(b.kind === "permanent") - Number(a.kind === "permanent") || b.at.localeCompare(a.at))
}

/** where a note of this kind is pinned when written (or switched) on session `s` */
export function noteTarget(s: Pick<Session, "id" | "classId">, kind: CalendarNoteKind): Result<Pick<CalendarNote, "sessionId" | "classId">> {
  if (kind === "permanent") {
    if (!s.classId) return { ok: false, error: "คาบนี้ไม่ได้อยู่ในคลาสประจำ — ใช้ Note ชั่วคราวแทน" }
    return { ok: true, value: { classId: s.classId, sessionId: undefined } }
  }
  return { ok: true, value: { sessionId: s.id, classId: undefined } }
}

export function cleanNote(text: string): Result<string> {
  const t = text.trim()
  if (!t) return { ok: false, error: "พิมพ์ Note ก่อน" }
  return { ok: true, value: t.slice(0, CALENDAR_NOTE_MAX) }
}
