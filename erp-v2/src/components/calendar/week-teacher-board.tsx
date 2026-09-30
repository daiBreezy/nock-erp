"use client"

import { Fragment, useMemo, useState } from "react"
import { BanIcon, CalendarIcon, CheckIcon, ClipboardCheckIcon, PencilIcon, PencilLineIcon, PlayIcon, PlusIcon, UsersRoundIcon } from "lucide-react"
import type { ClassPrefill } from "@/components/app/class-dialog"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { Badge } from "@/components/ui/badge"
import { addDays, endTime, fmtDate, fromMinutes, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { sessionKindLabel } from "@/domain/rules/forms"
import { blockOf, blockStartsFor, isHoliday, subjectsOf, workState, type WorkState } from "@/domain/rules/scheduling"
import * as Seats from "@/domain/rules/seats"
import type { Attendance, DateStr, Klass, Session, TimeStr } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const DAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
const MARK_TEXT = { present: "มา", absent: "ขาด", leave: "ลา" } as const
const MARK_TONE = { present: "text-emerald-700", absent: "text-red-700", leave: "text-amber-700" } as const
const STATE_ICON: Record<WorkState, { icon: typeof CheckIcon; tone: string; label: string }> = {
  scheduled: { icon: CalendarIcon, tone: "text-muted-foreground", label: "รอเริ่ม" },
  live: { icon: PlayIcon, tone: "", label: "กำลังเรียน" },
  needs_attendance: { icon: ClipboardCheckIcon, tone: "text-red-600", label: "รอเช็คชื่อ" },
  needs_summary: { icon: PencilLineIcon, tone: "text-amber-600", label: "รอสรุป" },
  done: { icon: CheckIcon, tone: "text-emerald-600", label: "เสร็จแล้ว" },
  cancelled: { icon: BanIcon, tone: "text-muted-foreground", label: "ยกเลิก" },
}

type Row = { start: TimeStr; end: TimeStr; block: boolean }

/**
 * The whole week the way NockAcademy plans it (owner refs 2026-09-30): each day is a table — a column per teacher
 * (avatar, subjects, number of classes), a Room line and a row per standard block, and in each block a class card in
 * the subject's colour with the students in two columns: nickname, free-form note, result, grade. Days stack down.
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
  const summaries = useStore((s) => s.summaries)
  const allSessions = useStore((s) => s.sessions)
  const holidays = useStore((s) => s.holidays)
  const me = useStore((s) => s.userId)
  const setNote = useStore((s) => s.setSessionNote)
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
  const endMin = (row: Row) => toMinutes(row.end)
  const rowPast = (date: DateStr, row: Row) => date < today || (date === today && endMin(row) <= nowMin)
  const rowNow = (date: DateStr, row: Row) => date === today && toMinutes(row.start) <= nowMin && nowMin < endMin(row)
  const sessionEnded = (s: Session) => s.date < today || (s.date === today && toMinutes(s.start) + s.minutes <= nowMin)
  const dayDate = (d: DateStr) => `${DAY_FULL[weekdayOf(d)].slice(0, 3)} ${fmtDate(d)}`
  const rowsFor = (date: DateStr): Row[] => {
    const starts = blockStartsFor(branch, weekdayOf(date))
    const ofDay = live.filter((s) => s.date === date)
    // sessions outside every block still show — as their own row at their start time
    const loose = [...new Set(ofDay.filter((s) => !blockOf(starts, blockLen, s.start)).map((s) => s.start))]
    return [...starts.map((t) => ({ start: t, end: fromMinutes(toMinutes(t) + blockLen), block: true })), ...loose.map((t) => ({ start: t, end: endTime(t, 60), block: false }))]
      .sort((a, b) => a.start.localeCompare(b.start))
  }
  const cellSessions = (date: DateStr, teacherId: string, row: Row) =>
    live.filter((s) => s.date === date && (s.teacherId ?? "") === teacherId && (row.block ? blockOf([row.start], blockLen, s.start) === row.start : s.start === row.start && !blockOf(blockStartsFor(branch, weekdayOf(date)), blockLen, s.start)))
      .sort((a, b) => a.start.localeCompare(b.start))
  const nowPct = (row: Row) => Math.min(100, Math.max(0, ((nowMin - toMinutes(row.start)) / (endMin(row) - toMinutes(row.start))) * 100))

  const cols = `5.5rem repeat(${Math.max(1, teacherIds.length)}, minmax(17rem, 1fr))`

  return (
    <div className="space-y-5">
      {/* sits right under the app header (h-14) instead of sliding over it */}
      <nav className="sticky top-14 z-10 -mx-1 flex flex-wrap gap-1.5 border-b bg-background/95 px-1 py-2 backdrop-blur">
        {days.map((d) => (
          <a key={d} href={`#day-${d}`} className={cn("rounded-full border px-3 py-1 text-xs hover:bg-muted", d === today && "border-primary text-primary")}>{DAY_FULL[weekdayOf(d)].slice(0, 3)} {fmtDate(d)}</a>
        ))}
      </nav>

      {days.map((date) => {
        const rows = rowsFor(date)
        const closed = !branch.hours[weekdayOf(date)]
        const holiday = isHoliday(date, branch.id, holidays)
        return (
          <section key={date} id={`day-${date}`} className="scroll-mt-32 overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10">
            <div className="min-w-fit">
              <div className={cn("px-4 py-2 text-sm font-semibold", date < today ? "bg-muted text-muted-foreground" : date === today ? "bg-primary text-primary-foreground" : "bg-muted/40")}>
                {DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })}{date === today ? " · วันนี้" : date < today ? " · ผ่านไปแล้ว" : ""}{holiday ? " · วันหยุด" : closed ? " · สาขาปิด" : ""}
              </div>
              {rows.length === 0 || teacherIds.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{closed || holiday ? "ไม่มีคลาส" : "ยังไม่มีคลาสวันนี้"}</p>
              ) : (
                <div className="grid text-sm" style={{ gridTemplateColumns: cols }}>
                  {/* teacher headers: avatar · name · subjects · classes that day */}
                  <div className="sticky left-0 z-10 border-b bg-card" />
                  {teacherIds.map((tid) => {
                    const t = staff.find((x) => x.id === tid)
                    const n = live.filter((s) => s.date === date && (s.teacherId ?? "") === tid).length
                    return (
                      <div key={tid || "none"} className="flex items-center gap-3 border-b border-l px-4 py-3">
                        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-base font-semibold", avatarTone(tid || "none"))}>{t ? initial(t.nickname) : "?"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{tid ? L.teacher(tid).label : "ยังไม่มีครู"}</p>
                          <p className="truncate text-xs text-muted-foreground">{t?.subjects.join(", ") ?? "—"}</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full tabular-nums">{n}</Badge>
                      </div>
                    )
                  })}

                  {rows.map((row) => {
                    const past = rowPast(date, row)
                    const nowHere = rowNow(date, row)
                    return (
                      <Fragment key={row.start}>
                        {/* Room line of the block */}
                        <div className="sticky left-0 z-10 border-b bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Room</div>
                        {teacherIds.map((tid) => {
                          const rooms = [...new Set(cellSessions(date, tid, row).map((s) => L.room(s.roomId)))]
                          return <div key={`r-${tid}`} className="border-b border-l bg-muted/40 px-3 py-2 text-center text-sm">{rooms.length ? rooms.join(", ") : <span className="text-muted-foreground">-</span>}</div>
                        })}

                        <div className={cn("sticky left-0 z-10 flex flex-col items-center justify-center gap-1 border-b bg-card px-2 py-3 text-sm tabular-nums", past && "text-muted-foreground", nowHere && "font-semibold text-primary")}>
                          <span>{row.start}</span>
                          <span>{row.block ? row.end : "นอกช่วง"}</span>
                        </div>
                        {teacherIds.map((tid) => {
                          const cell = cellSessions(date, tid, row)
                          return (
                            <div key={`c-${tid}`} className={cn("group/cell relative min-h-32 space-y-2 border-b border-l p-1.5", past && "bg-muted/30")}>
                              {cell.map((s) => (
                                <ClassCard key={s.id} s={s} row={row} blockLen={blockLen}
                                  state={workState(s, now, attendance, summaries).state}
                                  ended={sessionEnded(s)} dayDate={dayDate}
                                  canEdit={canCreate || s.teacherId === me || s.coTeacherIds.includes(me)}
                                  onOpen={onOpen} onNote={(sid, text) => report(setNote(s.id, sid, text), text.trim() ? "บันทึกโน้ตแล้ว" : "ลบโน้ตแล้ว")}
                                  klass={classes.find((k) => k.id === s.classId)} attendance={attendance} allSessions={allSessions} />
                              ))}
                              {cell.length === 0 && canCreate && row.block && tid && !closed && !holiday && !past && (
                                <button type="button" onClick={() => onSlot({ date, start: row.start, teacherId: tid })}
                                  className="absolute inset-1.5 hidden items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-sm text-muted-foreground group-hover/cell:flex hover:bg-muted/40">
                                  <PlusIcon className="size-4" /> สร้างคลาส
                                </button>
                              )}
                              {nowHere && <span className="pointer-events-none absolute inset-x-0 z-10 h-px bg-red-500" style={{ top: `${nowPct(row)}%` }} />}
                            </div>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}

/** One class in a block, in the subject's colour — filled while it's live, dashed for a trial/test. */
function ClassCard({ s, row, blockLen, state, ended, dayDate, canEdit, onOpen, onNote, klass, attendance, allSessions }: {
  s: Session; row: Row; blockLen: number; state: WorkState; ended: boolean; dayDate: (d: DateStr) => string; canEdit: boolean
  onOpen: (id: string) => void; onNote: (studentId: string, text: string) => void
  klass?: Klass; attendance: Attendance[]; allSessions: Session[]
}) {
  const L = useLookup()
  const c = subjectColor(s.subject)
  const liveNow = state === "live"
  const kind = sessionKindLabel(s)
  const St = STATE_ICON[state]
  const own = s.start !== row.start || s.minutes !== blockLen
  return (
    <div className={cn("rounded-2xl border p-3 shadow-xs", liveNow ? c.strong : c.soft, s.trial && "border-2 border-dashed", ended && !liveNow && "opacity-80")}>
      <div className="mb-2 flex items-center gap-2">
        <button type="button" onClick={() => onOpen(s.id)} className={cn("min-w-0 truncate text-left font-semibold hover:underline", !liveNow && c.text)}>
          {subjectsOf(s).join(" + ")}
          {own && <span className={cn("ml-1.5 text-xs font-normal", liveNow ? "text-white/80" : "text-muted-foreground")}>{s.start}–{endTime(s.start, s.minutes)}</span>}
        </button>
        {kind && <Badge variant="outline" className="shrink-0 rounded-full bg-background/60 text-[11px]">{kind}</Badge>}
        <span className={cn("ml-auto flex shrink-0 items-center gap-2 text-xs", liveNow ? "text-white/85" : "text-muted-foreground")}>
          <span className="flex items-center gap-1" title="จำนวนนักเรียน"><UsersRoundIcon className="size-3.5" />{s.studentIds.length}</span>
          {s.coTeacherIds.length > 0 && <span title="ครูช่วยสอน">+{s.coTeacherIds.map((x) => L.teacher(x).label).join(", ")}</span>}
          <St.icon className={cn("size-4", !liveNow && St.tone)} aria-label={St.label} />
        </span>
      </div>
      {/* one student per line — two columns were too cramped for the note (owner 2026-09-30) */}
      <div className="space-y-1.5">
        {s.studentIds.map((sid) => {
          const seat = Seats.seatOf(s, sid, klass)
          const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
          const moved = s.rescheduledIn?.includes(sid) ? allSessions.find((x) => x.rescheduledOut?.some((m) => m.studentId === sid && m.toSessionId === s.id)) : undefined
          const result = a ? { text: MARK_TEXT[a.status], tone: MARK_TONE[a.status] } : ended && !s.trial ? { text: "ยังไม่เช็ค", tone: "text-amber-700" } : null
          return (
            <StudentLine key={sid} nickname={L.student(sid)?.nickname ?? "?"} grade={L.student(sid)?.grade ?? ""} avatarKey={sid}
              note={s.notes?.[sid]} time={Seats.isPartial(seat, s.minutes) ? Seats.seatTime(s.start, seat) : undefined}
              result={result} movedFrom={moved ? `ย้ายมาจาก ${dayDate(moved.date)}` : undefined} inverted={liveNow}
              onOpen={() => onOpen(s.id)} onNote={(text) => onNote(sid, text)} canEdit={canEdit} />
          )
        })}
        {(s.rescheduledOut ?? []).map((m) => {
          const to = allSessions.find((x) => x.id === m.toSessionId)
          return (
            <button key={`out-${m.studentId}`} type="button" onClick={() => to && onOpen(to.id)} className={cn("flex items-center gap-2 text-left text-xs", liveNow ? "text-white/80" : "text-muted-foreground")}>
              <span className="line-through">{L.student(m.studentId)?.nickname}</span>
              <span className="ml-auto shrink-0">→ {to ? `${dayDate(to.date)} ${to.start}` : "ย้ายแล้ว"}</span>
            </button>
          )
        })}
        {s.studentIds.length === 0 && <p className={cn("text-xs", liveNow ? "text-white/80" : "text-muted-foreground")}>ยังไม่มีนักเรียน</p>}
      </div>
    </div>
  )
}

/** nickname · note (tap to edit) · own time · result · grade — like the ref row "Nickname  Note… ✎  G7" */
function StudentLine({ nickname, grade, avatarKey, note, time, result, movedFrom, inverted, onOpen, onNote, canEdit }: {
  nickname: string; grade: string; avatarKey: string; note?: string; time?: string
  result: { text: string; tone: string } | null; movedFrom?: string; inverted: boolean
  onOpen: () => void; onNote: (text: string) => void; canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(note ?? "")
  const save = () => { setEditing(false); if (text.trim() !== (note ?? "")) onNote(text) }
  const muted = inverted ? "text-white/75" : "text-muted-foreground"
  return (
    <div className="group/line min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold", avatarTone(avatarKey))}>{initial(nickname)}</span>
        <button type="button" onClick={onOpen} className="shrink-0 truncate text-left font-medium hover:underline">{nickname}</button>
        {editing ? (
          <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onBlur={save}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setText(note ?? ""); setEditing(false) } }}
            placeholder="Note เช่น MBook 1 (2-4)" className="h-6 min-w-0 flex-1 rounded-full border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/30" />
        ) : (
          <button type="button" disabled={!canEdit} onClick={() => { setText(note ?? ""); setEditing(true) }} title={note}
            className={cn("flex min-w-0 flex-1 items-center gap-1 truncate text-left text-xs italic", muted, !note && "opacity-0 group-hover/line:opacity-100")}>
            <span className="truncate">{note ?? (canEdit ? "Note…" : "")}</span>
            {canEdit && <PencilIcon className="size-3 shrink-0" />}
          </button>
        )}
        {time && <span className={cn("shrink-0 text-[11px] tabular-nums", inverted ? "text-white" : "text-violet-700 dark:text-violet-300")}>{time}</span>}
        {result && <span className={cn("shrink-0 text-[11px] font-semibold", inverted ? "text-white" : result.tone)}>{result.text}</span>}
        {grade && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", gradeTone(grade))}>{grade}</span>}
      </div>
      {movedFrom && <p className={cn("pl-8 text-[11px]", inverted ? "text-white/80" : "text-sky-700")}>↩ {movedFrom}</p>}
    </div>
  )
}
