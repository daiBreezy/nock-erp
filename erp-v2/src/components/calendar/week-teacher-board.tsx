"use client"

import { Fragment, useMemo, useState } from "react"
import { PlusIcon } from "lucide-react"
import type { ClassPrefill } from "@/components/app/class-dialog"
import { avatarTone, gradeTone } from "@/components/app/subject-color"
import { addDays, endTime, fmtDate, fromMinutes, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { blockOf, blockStartsFor, isHoliday } from "@/domain/rules/scheduling"
import * as Seats from "@/domain/rules/seats"
import type { DateStr, Session, TimeStr } from "@/domain/types"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const MARK_TEXT = { present: "มา", absent: "ขาด", leave: "ลา" } as const
const MARK_TONE = { present: "text-emerald-700", absent: "text-red-700", leave: "text-amber-700" } as const

/** One student in a block: nickname + grade, their free-form reminder note (tap to edit), own time when partial,
 *  and the result once it's known — มา / ขาด / ลา / ยังไม่เช็ค / moved in from another day. */
function StudentLine({ nickname, grade, note, time, trial, result, movedFrom, onOpen, onNote, canEdit }: {
  nickname: string; grade: string; note?: string; time?: string; trial: boolean
  result: { text: string; tone: string } | null; movedFrom?: string
  onOpen: () => void; onNote: (text: string) => void; canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note ?? "")
  const save = () => { setEditing(false); if (text.trim() !== (note ?? "")) onNote(text) }
  return (
    <div className="leading-tight">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onOpen} className="truncate text-left font-medium hover:text-primary">{nickname}</button>
        {grade && <span className={cn("shrink-0 rounded-full px-1.5 text-[10px] font-semibold", gradeTone(grade))}>{grade}</span>}
        {trial && <span className="shrink-0 text-[10px] text-violet-700">ทดลอง</span>}
        {time && <span className="shrink-0 text-[11px] text-violet-700 tabular-nums dark:text-violet-300">{time}</span>}
        {result && <span className={cn("ml-auto shrink-0 text-[11px] font-semibold", result.tone)}>{result.text}</span>}
      </div>
      {movedFrom && <p className="text-[11px] text-sky-700">↩ {movedFrom}</p>}
      {editing ? (
        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onBlur={save} onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(note ?? ""); setEditing(false) } }}
          placeholder="โน้ต เช่น Math Book Lesson 1 Page 2-6" className="mt-0.5 h-6 w-full rounded-md border bg-background px-1.5 text-xs outline-none focus:ring-2 focus:ring-ring/30" />
      ) : note ? (
        <button type="button" disabled={!canEdit} onClick={() => { setText(note); setEditing(true) }} className="block w-full truncate text-left text-xs text-muted-foreground hover:text-foreground" title={note}>({note})</button>
      ) : canEdit ? (
        <button type="button" onClick={() => { setText(""); setEditing(true) }} className="hidden text-[11px] text-muted-foreground/70 group-hover/cell:block hover:text-foreground">+ โน้ต</button>
      ) : null}
    </div>
  )
}

const DAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]

/**
 * The whole week the way NockAcademy plans it on paper (owner ref 2026-09-30): each day is a table — a column per
 * teacher, a row per standard block (13–15 / 15–17 / 17–19 …) with the room on top, and inside each block the students
 * "nickname (subject / book)" plus their own time when they come for part of it. Days stack down the page.
 */
export function WeekTeacherBoard({ from, sessions, onOpen, onSlot, canCreate }: {
  from: DateStr
  sessions: Session[]
  onOpen: (id: string) => void
  onSlot: (p: ClassPrefill) => void
  canCreate: boolean
}) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const classes = useStore((s) => s.classes)
  const attendance = useStore((s) => s.attendance)
  const allSessions = useStore((s) => s.sessions)
  const holidays = useStore((s) => s.holidays)
  const now = useNow(60_000)
  const today = toDateStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const L = useLookup()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const live = sessions.filter((s) => !s.cancelled)

  // same teacher columns every day of the week, so the eye can follow a teacher down the page
  const teacherIds = useMemo(() => {
    const ids = [...new Set(live.map((s) => s.teacherId ?? ""))]
    const name = (id: string) => staff.find((t) => t.id === id)?.nickname ?? "~"
    return ids.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : name(a).localeCompare(name(b), "th")))
  }, [live, staff])

  const blockLen = branch.blocks?.minutes ?? 120
  const me = useStore((s) => s.userId)
  const setNote = useStore((s) => s.setSessionNote)
  const endMin = (row: { start: TimeStr; end: TimeStr; block: boolean }) => (row.block ? toMinutes(row.end) : toMinutes(row.start) + 60)
  const rowPast = (date: DateStr, row: { start: TimeStr; end: TimeStr; block: boolean }) => date < today || (date === today && endMin(row) <= nowMin)
  const rowNow = (date: DateStr, row: { start: TimeStr; end: TimeStr; block: boolean }) => date === today && toMinutes(row.start) <= nowMin && nowMin < endMin(row)
  const sessionEnded = (s: Session) => s.date < today || (s.date === today && toMinutes(s.start) + s.minutes <= nowMin)
  const dayDate = (d: DateStr) => `${DAY_FULL[weekdayOf(d)].slice(0, 3)} ${fmtDate(d)}`
  const rowsFor = (date: DateStr) => {
    const starts = blockStartsFor(branch, weekdayOf(date))
    const today = live.filter((s) => s.date === date)
    // sessions outside every block still show — as their own row at their start time
    const loose = [...new Set(today.filter((s) => !blockOf(starts, blockLen, s.start)).map((s) => s.start))]
    return [...starts.map((t) => ({ start: t, end: fromMinutes(toMinutes(t) + blockLen), block: true })), ...loose.map((t) => ({ start: t, end: "", block: false }))]
      .sort((a, b) => a.start.localeCompare(b.start))
  }
  const cellSessions = (date: DateStr, teacherId: string, row: { start: TimeStr; block: boolean }) =>
    live.filter((s) => s.date === date && (s.teacherId ?? "") === teacherId && (row.block ? blockOf([row.start], blockLen, s.start) === row.start : s.start === row.start && !blockOf(blockStartsFor(branch, weekdayOf(date)), blockLen, s.start)))
      .sort((a, b) => a.start.localeCompare(b.start))

  const cols = `7.5rem repeat(${Math.max(1, teacherIds.length)}, minmax(12rem, 1fr))`

  return (
    <div className="space-y-5">
      <nav className="sticky top-0 z-20 flex flex-wrap gap-1.5 bg-background/90 py-1 backdrop-blur">
        {days.map((d) => (
          <a key={d} href={`#day-${d}`} className="rounded-full border px-3 py-1 text-xs hover:bg-muted">{DAY_FULL[weekdayOf(d)].slice(0, 3)} {fmtDate(d)}</a>
        ))}
      </nav>

      {days.map((date) => {
        const rows = rowsFor(date)
        const closed = !branch.hours[weekdayOf(date)]
        const holiday = isHoliday(date, branch.id, holidays)
        return (
          <section key={date} id={`day-${date}`} className="scroll-mt-12 overflow-x-auto rounded-2xl ring-1 ring-foreground/15">
            <div className="min-w-fit">
              <div className={cn("px-3 py-1.5 text-center text-sm font-semibold", date < today ? "bg-muted text-muted-foreground" : date === today ? "bg-primary text-primary-foreground" : "bg-emerald-200/80 text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100")}>
                {DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })}{date === today ? " · วันนี้" : date < today ? " · ผ่านไปแล้ว" : ""}{holiday ? " · วันหยุด" : closed ? " · สาขาปิด" : ""}
              </div>
              {rows.length === 0 || teacherIds.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">{closed || holiday ? "ไม่มีคลาส" : "ยังไม่มีคลาสวันนี้"}</p>
              ) : (
                <div className="grid text-sm" style={{ gridTemplateColumns: cols }}>
                  {/* teacher header */}
                  <div className="sticky left-0 z-10 border-b bg-foreground" />
                  {teacherIds.map((tid) => (
                    <div key={tid || "none"} className={cn("flex items-center justify-center gap-1.5 border-b border-l px-2 py-1.5 font-semibold", avatarTone(tid || "none"))}>
                      <span>{tid ? L.teacher(tid).label : "ยังไม่มีครู"}</span>
                    </div>
                  ))}
                  {rows.map((row) => (
                    <Fragment key={row.start}>
                      {/* room line of the block */}
                      <div className="sticky left-0 z-10 border-b bg-muted/60 px-2 py-1 text-center text-xs font-medium">Room</div>
                      {teacherIds.map((tid) => {
                        const cell = cellSessions(date, tid, row)
                        const rooms = [...new Set(cell.map((s) => L.room(s.roomId)))]
                        return <div key={`r-${tid}`} className="border-b border-l bg-muted/30 px-2 py-1 text-xs font-semibold">{rooms.join(", ")}</div>
                      })}
                      <div className={cn("sticky left-0 z-10 flex flex-col items-center justify-center border-b-2 px-2 py-2 text-center text-xs font-semibold tabular-nums", rowPast(date, row) ? "bg-muted text-muted-foreground" : rowNow(date, row) ? "bg-primary/10 text-primary" : "bg-background")}>
                        {row.block ? `${row.start}–${row.end}` : `${row.start} (นอกช่วง)`}
                        {rowPast(date, row) && <span className="text-[10px] font-normal">ผ่านไปแล้ว</span>}
                        {rowNow(date, row) && <span className="text-[10px] font-normal">กำลังเรียน</span>}
                      </div>
                      {teacherIds.map((tid) => {
                        const cell = cellSessions(date, tid, row)
                        const past = rowPast(date, row)
                        return (
                          <div key={`c-${tid}`} className={cn("group/cell relative min-h-20 space-y-1.5 border-b-2 border-l px-2 py-1.5", past && "bg-muted/40")}>
                            {cell.map((s) => {
                              const k = classes.find((c) => c.id === s.classId)
                              const own = s.start !== row.start || s.minutes !== blockLen
                              return (
                                <div key={s.id} className="space-y-0.5">
                                  {(cell.length > 1 || own) && (
                                    <button type="button" onClick={() => onOpen(s.id)} className="block text-[11px] text-muted-foreground hover:underline">
                                      {k?.name ?? s.subject} · {s.start}–{endTime(s.start, s.minutes)}{s.coTeacherIds.length ? ` · ช่วย ${s.coTeacherIds.map((x) => L.teacher(x).label).join(", ")}` : ""}
                                    </button>
                                  )}
                                  {s.studentIds.map((sid) => {
                                    const seat = Seats.seatOf(s, sid, k)
                                    const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
                                    const from = s.rescheduledIn?.includes(sid) ? allSessions.find((x) => x.rescheduledOut?.some((m) => m.studentId === sid && m.toSessionId === s.id)) : undefined
                                    const over = sessionEnded(s)
                                    const result = s.cancelled ? { text: "ยกเลิก", tone: "text-muted-foreground" }
                                      : a ? { text: MARK_TEXT[a.status], tone: MARK_TONE[a.status] }
                                      : over && !s.trial ? { text: "ยังไม่เช็ค", tone: "text-amber-700" } : null
                                    return (
                                      <StudentLine key={sid} nickname={L.student(sid)?.nickname ?? "?"} grade={L.student(sid)?.grade ?? ""}
                                        note={s.notes?.[sid]} time={Seats.isPartial(seat, s.minutes) ? Seats.seatTime(s.start, seat) : undefined}
                                        trial={s.trial} result={result} movedFrom={from ? `ย้ายมาจาก ${dayDate(from.date)}` : undefined}
                                        onOpen={() => onOpen(s.id)} onNote={(text) => report(setNote(s.id, sid, text), text.trim() ? "บันทึกโน้ตแล้ว" : "ลบโน้ตแล้ว")} canEdit={canCreate || s.teacherId === me || s.coTeacherIds.includes(me)} />
                                    )
                                  })}
                                  {(s.rescheduledOut ?? []).map((m) => {
                                    const to = allSessions.find((x) => x.id === m.toSessionId)
                                    return (
                                      <button key={`out-${m.studentId}`} type="button" onClick={() => to && onOpen(to.id)} className="flex w-full items-center gap-1.5 text-left text-xs leading-tight text-muted-foreground hover:text-primary">
                                        <span className="line-through">{L.student(m.studentId)?.nickname}</span>
                                        <span className="ml-auto shrink-0 text-sky-700">→ ย้ายไป {to ? `${dayDate(to.date)} ${to.start}` : "—"}</span>
                                      </button>
                                    )
                                  })}
                                  {s.studentIds.length === 0 && <button type="button" onClick={() => onOpen(s.id)} className="text-xs text-muted-foreground hover:underline">ยังไม่มีนักเรียน</button>}
                                </div>
                              )
                            })}
                            {cell.length === 0 && canCreate && row.block && tid && !closed && !holiday && !rowPast(date, row) && (
                              <button type="button" onClick={() => onSlot({ date, start: row.start, teacherId: tid })}
                                className="absolute inset-1 hidden items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground group-hover/cell:flex">
                                <PlusIcon className="size-3.5" /> สร้างคลาส
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

