"use client"

import { Fragment, useMemo } from "react"
import { PlusIcon } from "lucide-react"
import type { ClassPrefill } from "@/components/app/class-dialog"
import { avatarTone } from "@/components/app/subject-color"
import { addDays, endTime, fmtDate, fromMinutes, toMinutes, weekdayOf } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { blockOf, blockStartsFor, isHoliday } from "@/domain/rules/scheduling"
import * as Seats from "@/domain/rules/seats"
import type { DateStr, Session, TimeStr } from "@/domain/types"
import { useBranch, useEntitlements, useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const DAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
const MARK_DOT = { present: "bg-emerald-500", absent: "bg-red-500", leave: "bg-amber-400" } as const

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
  const courses = useStore((s) => s.courses)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const allSessions = useStore((s) => s.sessions)
  const books = useStore((s) => s.lessonBooks)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useEntitlements()
  const L = useLookup()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const live = sessions.filter((s) => !s.cancelled)

  // same teacher columns every day of the week, so the eye can follow a teacher down the page
  const teacherIds = useMemo(() => {
    const ids = [...new Set(live.map((s) => s.teacherId ?? ""))]
    const name = (id: string) => staff.find((t) => t.id === id)?.nickname ?? "~"
    return ids.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : name(a).localeCompare(name(b), "th")))
  }, [live, staff])

  // "(subject / book)" for each student: the latest book in their summaries, else their paid course's subject
  const dateOf = useMemo(() => new Map(allSessions.map((x) => [x.id, x.date])), [allSessions])
  const lastBook = useMemo(() => {
    const m = new Map<string, { date: string; bookId: string }>()
    for (const sm of summaries) {
      if (!sm.bookId) continue
      const d = dateOf.get(sm.sessionId) ?? ""
      const cur = m.get(sm.studentId)
      if (!cur || d > cur.date) m.set(sm.studentId, { date: d, bookId: sm.bookId })
    }
    return m
  }, [summaries, dateOf])
  const studyLabel = (sid: string, s: Session) => {
    const ent = Att.coveringEntitlement(sid, s, entitlements)
    const course = courses.find((c) => c.id === ent?.courseId)
    const book = books.find((b) => b.id === lastBook.get(sid)?.bookId)?.name
    if (s.trial) return "ทดลองเรียน"
    return [course?.subjects.join("+") ?? s.subject, book].filter(Boolean).join(" · ")
  }

  const blockLen = branch.blocks?.minutes ?? 120
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
              <div className="bg-emerald-200/80 px-3 py-1.5 text-center text-sm font-semibold text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100">
                {DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })}{holiday ? " · วันหยุด" : closed ? " · สาขาปิด" : ""}
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
                      <div className="sticky left-0 z-10 flex items-center justify-center border-b-2 bg-background px-2 py-2 text-center text-xs font-semibold tabular-nums">
                        {row.block ? `${row.start}–${row.end}` : `${row.start} (นอกช่วง)`}
                      </div>
                      {teacherIds.map((tid) => {
                        const cell = cellSessions(date, tid, row)
                        return (
                          <div key={`c-${tid}`} className="group/cell relative min-h-20 space-y-1.5 border-b-2 border-l px-2 py-1.5">
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
                                    const partial = Seats.isPartial(seat, s.minutes)
                                    const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
                                    return (
                                      <button key={sid} type="button" onClick={() => onOpen(s.id)} className="flex w-full items-center gap-1.5 text-left leading-tight hover:text-primary">
                                        <span className={cn("size-1.5 shrink-0 rounded-full", a ? MARK_DOT[a.status] : "bg-transparent")} />
                                        <span className="truncate">
                                          <span className="font-medium">{L.student(sid)?.nickname}</span>
                                          <span className="text-muted-foreground"> ({studyLabel(sid, s)})</span>
                                          {partial && <span className="text-violet-700 dark:text-violet-300"> {Seats.seatTime(s.start, seat)}</span>}
                                        </span>
                                      </button>
                                    )
                                  })}
                                  {s.studentIds.length === 0 && <button type="button" onClick={() => onOpen(s.id)} className="text-xs text-muted-foreground hover:underline">ยังไม่มีนักเรียน</button>}
                                </div>
                              )
                            })}
                            {cell.length === 0 && canCreate && row.block && tid && !closed && !holiday && (
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

