"use client"

import { WEEKDAY_TONE } from "@/components/app/tags"
import { staffAt } from "@/domain/rules/permissions"
import { Fragment, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { AlertTriangleIcon, ClockFadingIcon, CalendarOffIcon, CircleDashedIcon, XIcon, ArrowLeftRightIcon, ChevronLeftIcon, ChevronRightIcon, BanIcon, EllipsisIcon, CheckIcon, RotateCcwIcon, PencilLineIcon, PinIcon, PlusIcon, Trash2Icon, UserIcon, UsersIcon } from "lucide-react"
import type { ClassPrefill } from "@/components/app/class-dialog"
import { ConflictResolver, liveConflicts } from "@/components/app/conflict-resolver"
import { avatarTone, subjectColor } from "@/components/app/subject-color"
import { Badge } from "@/components/ui/badge"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/app/native-select"
import { addDays, endTime, fmtDate, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { blockFor, blocksOn, periodsOn, isHoliday, subjectsOf, workState, type WorkState, classCapacity, WORK_LABEL } from "@/domain/rules/scheduling"
import * as Seats from "@/domain/rules/seats"
import { PersonAvatar } from "@/components/app/photo-cell"
import { WORK_ICON, WORK_ICON_TONE, WORK_ORDER } from "@/components/app/work-state"
import { KIND_ICON, kindOf, RoomMeta, StudentsMeta } from "@/components/calendar/session-meta"
import { subjectAbbr } from "@/domain/rules/settings"
import { calendarNotesFor, NOTE_KIND_LABEL } from "@/domain/rules/calendar-notes"
import { NoteEditor } from "@/components/calendar/calendar-notes-ui"
import { LeaveReasonPicker } from "@/components/app/leave-reason"
import type { Attendance, CalendarNoteKind, DateStr, Klass, Session, TimeStr } from "@/domain/types"
import { report } from "@/lib/feedback"
import { toast } from "@/lib/toast"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { unseenChange, useStore } from "@/store/store"

const DAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
const dayTone = (date: DateStr, today: DateStr) => { const t = WEEKDAY_TONE[weekdayOf(date)]; return date === today ? t.strong : date < today ? t.faded : t.soft }

const MARK_TEXT = { present: "มา", absent: "ขาด", leave: "ลา" } as const
// owner 2026-11-13: fewer colours — only an absence stands out; present / leave are quiet grey
const MARK_TONE = { present: "text-muted-foreground", absent: "text-danger", leave: "text-muted-foreground" } as const
// owner 2026-10-15: the check-in result as an icon that tells the story — the word stays as its tooltip
// owner 2026-11-13: one shape per meaning, no circles around them — ✓ came · ✕ absent · crossed calendar = leave (the clock = part of the class only)
const MARK_ICON = { present: CheckIcon, absent: XIcon, leave: CalendarOffIcon } as const
// owner 2026-10-15: the same state icons as the Week and List views (components/app/work-state.tsx)
const STATE_ICON = Object.fromEntries(WORK_ORDER.map((w) => [w, { icon: WORK_ICON[w], tone: WORK_ICON_TONE[w], label: WORK_LABEL[w] }])) as Record<WorkState, { icon: typeof CheckIcon; tone: string; label: string }>

type Row = { start: TimeStr; end: TimeStr; block: boolean }

/**
 * The whole week the way NockAcademy plans it (owner refs 2026-09-30): each day is a table — a column per teacher
 * (avatar, subjects, number of classes), a Room line and a row per standard block, and in each block a class card in
 * the subject's colour with the students in two columns: nickname, free-form note, result, grade. Days stack down.
 */
export function WeekTeacherBoard({ from, sessions, onOpen, onSlot, canCreate, dayCount = 7, onlyBusy = false }: {
  from: DateStr
  /** day view: only the hours that have classes — the switch sits with the calendar filters (owner 2026-10-15) */
  onlyBusy?: boolean
  /** 1 = the day view ("รายวัน"). owner 2026-10-12: same cells as the teacher board (students listed), but the time
   *  column is plain hours one after another, no Room bars between them — the room sits inside each class cell —
   *  and a button to show only the hours that have classes */
  dayCount?: number
  sessions: Session[]
  onOpen: (id: string) => void
  onSlot: (p: ClassPrefill) => void
  canCreate: boolean
}) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const subjectNames = useStore((s) => s.system.subjectNames)
  const classes = useStore((s) => s.classes)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const allSessions = useStore((s) => s.sessions)
  const holidays = useStore((s) => s.holidays)
  const me = useStore((s) => s.userId)
  const undoLeave = useStore((s) => s.undoTeacherLeave)
  const now = useNow(60_000)
  const today = toDateStr(now)
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const L = useLookup()
  const days = Array.from({ length: dayCount }, (_, i) => addDays(from, i))
  const live = sessions.filter((s) => !s.cancelled)
  const plain = dayCount === 1

  // same teacher columns every day of the week, so the eye can follow a teacher down the page
  const teacherIds = useMemo(() => {
    const ids = [...new Set(live.map((s) => s.teacherId ?? ""))]
    const name = (id: string) => staff.find((t) => t.id === id)?.nickname ?? "~"
    const sorted = ids.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : name(a).localeCompare(name(b), "th")))
    // owner 2026-11-20: a teacher who opens the calendar always finds their OWN column first (even a week with no classes) — no sideways hunting
    const mine = staff.find((t) => t.id === me)
    if (mine?.roles.includes("teacher")) return [me, ...sorted.filter((id) => id !== me)]
    return sorted
  }, [live, staff, me])

  const endMin = (row: Row) => toMinutes(row.end)
  const rowPast = (date: DateStr, row: Row) => date < today || (date === today && endMin(row) <= nowMin)
  const rowNow = (date: DateStr, row: Row) => date === today && toMinutes(row.start) <= nowMin && nowMin < endMin(row)
  const sessionEnded = (s: Session) => s.date < today || (s.date === today && toMinutes(s.start) + s.minutes <= nowMin)
  const dayDate = (d: DateStr) => `${DAY_FULL[weekdayOf(d)].slice(0, 3)} ${fmtDate(d)}`
  const hourRows = (date: DateStr): Row[] => {
    const ofDay = live.filter((s) => s.date === date)
    const hours = branch.hours[weekdayOf(date)]
    const starts = [hours?.open, ...ofDay.map((s) => s.start)].filter(Boolean).map((t) => Math.floor(toMinutes(t!) / 60))
    const ends = [hours?.close, ...ofDay.map((s) => endTime(s.start, s.minutes))].filter(Boolean).map((t) => Math.ceil(toMinutes(t!) / 60))
    if (!starts.length) return []
    const rows: Row[] = []
    for (let h = Math.min(...starts); h < Math.max(...ends); h++) rows.push({ start: `${String(h).padStart(2, "0")}:00`, end: `${String(h + 1).padStart(2, "0")}:00`, block: true })
    return onlyBusy ? rows.filter((r) => ofDay.some((s) => s.start >= r.start && s.start < r.end)) : rows
  }
  const rowsFor = (date: DateStr): Row[] => {
    if (plain) return hourRows(date)
    const blocks = blocksOn(branch, date)
    const ofDay = live.filter((s) => s.date === date)
    // owner 2026-11-20: sessions outside every block share ONE "นอกช่วง" row (it used to be a row per odd start time — 11:30, 11:40, … — which read as noise);
    // each card still carries its own time
    const loose = ofDay.filter((s) => !blockFor(blocks, s.start))
    const looseRow: Row[] = loose.length
      ? [{ start: loose.map((s) => s.start).sort()[0], end: loose.map((s) => endTime(s.start, s.minutes)).sort().at(-1)!, block: false }]
      : []
    return [...blocks.map((b) => ({ start: b.start, end: b.end, block: true })), ...looseRow].sort((a, b) => a.start.localeCompare(b.start))
  }
  const cellSessions = (date: DateStr, teacherId: string, row: Row) => {
    if (plain) return live.filter((s) => s.date === date && (s.teacherId ?? "") === teacherId && s.start >= row.start && s.start < row.end).sort((a, b) => a.start.localeCompare(b.start))
    const blocks = blocksOn(branch, date)
    return live.filter((s) => s.date === date && (s.teacherId ?? "") === teacherId && (row.block ? blockFor(blocks, s.start)?.start === row.start : !blockFor(blocks, s.start)))
      .sort((a, b) => a.start.localeCompare(b.start))
  }
  const nowPct = (row: Row) => Math.min(100, Math.max(0, ((nowMin - toMinutes(row.start)) / (endMin(row) - toMinutes(row.start))) * 100))

  // clashes still ahead (past ones can't be fixed) — red outline + ⚠ to fix them from the cell
  const clashIds = useMemo(() => new Set(liveConflicts(live.map((x) => x.id), allSessions.filter((x) => x.branchId === branch.id), { branch, staff, now }).flatMap((c) => c.sessionIds)), [live, allSessions, branch, staff, now])
  const [resolving, setResolving] = useState<string[] | null>(null)
  const [moving, setMoving] = useState<{ from: string; studentId: string; to: string } | null>(null)
  const [dayAction, setDayAction] = useState<{ mode: "substitute" | "cancel"; teacherId: string; date: DateStr } | null>(null)
  const cols = `5.5rem repeat(${Math.max(1, teacherIds.length)}, minmax(17rem, 1fr))`

  return (
    <div className="space-y-5">
      {dayAction && <TeacherDayDialog {...dayAction} onClose={() => setDayAction(null)} />}
      {moving && <MoveStudentDialog {...moving} onClose={() => setMoving(null)} />}
      {resolving && <ConflictResolver sessionIds={resolving} onClose={() => setResolving(null)} onOpen={(id) => { setResolving(null); onOpen(id) }} />}
      {days.map((date) => {
        const rows = rowsFor(date)
        const closed = !branch.hours[weekdayOf(date)]
        const holiday = isHoliday(date, branch.id, holidays)
        return (
          <HScrollSection key={date} id={`day-${date}`} className="scroll-mt-32 rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10">
            {(sc) => (
            <div className="min-w-fit">
              <div data-pan className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold", dayTone(date, today))}>
                {/* the band spans the whole table; the text sticks to the left edge so a sideways scroll never moves it */}
                <span className="sticky left-4">{DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })}{date === today ? " · วันนี้" : date < today ? " · ผ่านไปแล้ว" : ""}{holiday ? " · วันหยุด" : closed ? " · สาขาปิด" : ""}</span>
                {periodsOn(branch, date)[0] && <span className="rounded-full bg-special-soft px-2 py-0.5 text-2xs font-medium text-special-ink">ช่วง {periodsOn(branch, date)[0].name}</span>}
                {/* owner 2026-11-20: mouse users — step the table sideways with the arrows (also: drag or wheel on this band / the teacher names, or Shift + wheel) */}
                {(sc.canLeft || sc.canRight) && (
                  <span className="sticky right-4 ml-auto flex gap-1">
                    <Button size="icon-xs" variant="outline" type="button" aria-label="เลื่อนไปทางซ้าย" disabled={!sc.canLeft} onClick={() => sc.by(-1)}><ChevronLeftIcon /></Button>
                    <Button size="icon-xs" variant="outline" type="button" aria-label="เลื่อนไปทางขวา" disabled={!sc.canRight} onClick={() => sc.by(1)}><ChevronRightIcon /></Button>
                  </span>
                )}
              </div>
              {rows.length === 0 || teacherIds.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{closed || holiday ? "ไม่มีคลาส" : "ยังไม่มีคลาสวันนี้"}</p>
              ) : (
                <div className="grid bg-muted/40 text-sm" style={{ gridTemplateColumns: cols }}>
                  {/* teacher headers: avatar · name · subjects · classes that day */}
                  <div data-pan className="sticky left-0 z-10 border-r border-b bg-card" />

                  {teacherIds.map((tid) => {
                    const t = staff.find((x) => x.id === tid)
                    const n = live.filter((s) => s.date === date && (s.teacherId ?? "") === tid).length
                    // this teacher's leave on that day: covered by someone, or the day was cancelled
                    const away = allSessions.filter((x) => x.date === date && x.teacherLeave?.teacherId === tid)
                    // owner 2026-10-15: the ⋯ shows on every day — not only days that already have classes
                    const canMenu = canCreate && !!tid
                    const upcoming = date >= today
                    const firstSlot = rows.find((r) => r.block)?.start ?? branch.hours[weekdayOf(date)]?.open
                    return (
                      <div key={tid || "none"} data-pan className="group/head relative flex items-center gap-3 border-b border-l bg-card px-4 py-3">
                        {/* owner 2026-10-15: the same picture as on the Staff page (photo, else the initial) */}
                        {t ? <PersonAvatar person={t} className="size-11 text-base" /> : <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-base font-semibold", avatarTone("none"))}>?</span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{tid ? L.teacher(tid).label : "ยังไม่มีครู"}</p>
                          {/* owner 2026-10-15: subject codes (En · Ma · Sc) — the full names on hover */}
                          <p className="truncate text-xs text-muted-foreground" title={t?.subjects.join(" · ")}>{t?.subjects.map((x) => subjectAbbr(x, subjectNames)).join(" · ") || "—"}</p>
                        </div>
                        {away.length > 0 && (
                          <span className="shrink-0 rounded-full bg-warning-soft px-2 py-0.5 text-2xs font-medium text-warning-ink"
                            title={away.map((x) => `${x.start} ${x.subject}: ${x.teacherLeave!.substituteId ? `${L.teacher(x.teacherLeave!.substituteId).label} สอนแทน` : "ยกเลิก"}`).join("\n")}>
                            {away.every((x) => !x.teacherLeave!.substituteId) ? "ลา · ยกเลิกคลาส" : "ลา · เปลี่ยนครู"}
                          </span>
                        )}
                        <Badge variant="secondary" className="rounded-full tabular-nums">{n}</Badge>
                        {canMenu && (
                          <DropdownMenu>
                            {/* owner 2026-10-12: takes no room until the header is hovered — then it slides in and pushes the count aside */}
                            <DropdownMenuTrigger render={<Button variant="ghost" size="inline" type="button" aria-label={`จัดการวันของ ${L.teacher(tid).label}`} className="-ml-3 grid h-7 w-0 shrink-0 place-items-center overflow-hidden rounded-full text-muted-foreground opacity-0 transition-[width,margin,opacity] duration-150 group-hover/head:ml-0 group-hover/head:w-7 group-hover/head:opacity-100 hover:bg-muted focus-visible:ml-0 focus-visible:w-7 focus-visible:opacity-100 data-[popup-open]:ml-0 data-[popup-open]:w-7 data-[popup-open]:opacity-100" />}>
                              <EllipsisIcon className="size-4" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              {/* owner 2026-10-12: take the day's leave back — the teacher teaches their classes again */}
                              {away.length > 0 && upcoming && (
                                <DropdownMenuItem onClick={() => {
                                  const results = away.map((x) => undoLeave(x.id))
                                  const failed = results.find((r) => !r.ok)
                                  if (failed) report(failed, "")
                                  else toast.success(`${L.teacher(tid).label} กลับมาสอนแล้ว · ${away.length} คาบ`)
                                }}>
                                  <RotateCcwIcon /><span className="flex flex-col"><span>ยกเลิกการลา (ทั้งวัน)</span><span className="text-xs text-muted-foreground">{L.teacher(tid).label}กลับมาสอน {away.length} คาบ</span></span>
                                </DropdownMenuItem>
                              )}
                              {n > 0 && upcoming && <>
                              <DropdownMenuItem onClick={() => setDayAction({ mode: "substitute", teacherId: tid, date })}>
                                <ArrowLeftRightIcon /><span className="flex flex-col"><span>เปลี่ยนครู (ทั้งวัน)</span><span className="text-xs text-muted-foreground">ทุกคาบของ{L.teacher(tid).label} วันนี้ {n} คาบ</span></span>
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={() => setDayAction({ mode: "cancel", teacherId: tid, date })}>
                                <BanIcon /><span className="flex flex-col"><span>ยกเลิกคลาส (ทั้งวัน)</span><span className="text-xs">กรณีฉุกเฉินที่หาครูแทนไม่ได้</span></span>
                              </DropdownMenuItem>
                              </>}
                              {upcoming && !closed && !holiday && firstSlot && (
                                <DropdownMenuItem onClick={() => onSlot({ date, start: firstSlot as TimeStr, teacherId: tid })}>
                                  <PlusIcon /><span className="flex flex-col"><span>สร้างคลาสให้{L.teacher(tid).label}</span><span className="text-xs text-muted-foreground">{DAY_FULL[weekdayOf(date)]} {fmtDate(date)}</span></span>
                                </DropdownMenuItem>
                              )}
                              {!upcoming && <DropdownMenuItem disabled><span className="flex flex-col"><span>วันที่ผ่านไปแล้ว</span><span className="text-xs text-muted-foreground">เปลี่ยนครู / ยกเลิกคลาสได้เฉพาะวันนี้เป็นต้นไป · แก้รายคาบได้ที่ Side Panel ของคาบ</span></span></DropdownMenuItem>}
                              {upcoming && (closed || holiday) && n === 0 && <DropdownMenuItem disabled>{holiday ? "วันหยุด" : "สาขาปิด"} · ไม่มีคลาส</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    )
                  })}

                  {rows.map((row) => {
                    const past = rowPast(date, row)
                    const nowHere = rowNow(date, row)
                    return (
                      <Fragment key={row.start}>
                        {/* owner 2026-10-15: no Room bar — the room sits inside each class card, the same in both views */}
                        <div className={cn("sticky left-0 z-10 flex flex-col items-center gap-1 border-r border-b bg-card px-2 py-3 text-sm tabular-nums", plain ? "justify-start" : "justify-center", past && "text-muted-foreground", nowHere && "font-semibold text-primary")}>
                          {/* the "outside the blocks" row has no hour of its own — just its name */}
                          <span>{row.block || plain ? row.start : "นอกช่วง"}</span>
                          {!plain && row.block && <span>{row.end}</span>}
                        </div>
                        {teacherIds.map((tid) => {
                          const cell = cellSessions(date, tid, row)
                          // white = has students · light grey = a session with no students yet · table grey = nothing here
                          const hasStudents = cell.some((x) => x.studentIds.length > 0)
                          const liveHere = cell.some((x) => workState(x, now, attendance, summaries).state === "live")
                          return (
                            <div key={`c-${tid}`} className={cn("group/cell relative divide-y border-b border-l", plain ? "min-h-14" : "min-h-28",
                              hasStudents ? "bg-card" : cell.length ? "bg-muted/60" : "",
                              past && cell.length > 0 && "opacity-75",
                              liveHere && "shadow-[inset_3px_0_0_0_var(--color-primary)]",
                              cell.some((x) => clashIds.has(x.id)) && "ring-2 ring-danger ring-inset")}>
                              {cell.map((s) => (
                                // one wrapper per session, so the cell's dividers fall between sessions — not under the room line
                                // owner 2026-10-15: the whole card opens the session — not just the class name (buttons inside keep their own job)
                                <div key={s.id} data-session-id={s.id} role="button" tabIndex={-1} className="cursor-pointer outline-2 -outline-offset-2 outline-transparent transition-[outline-color] hover:outline-primary/50"
                                  onClick={(e) => { if (!(e.target as HTMLElement).closest("button, a, input, textarea, [role=menu], [role=menuitem], [role=dialog]")) onOpen(s.id) }}>
                                <SessionBlock s={s}
                                  room={<RoomLine inCell sessions={[s]} classes={classes}
                                    clash={clashIds.has(s.id) ? [s.id] : []} onResolve={canCreate ? setResolving : undefined} />}
                                  state={workState(s, now, attendance, summaries).state}
                                  ended={sessionEnded(s)} dayDate={dayDate}
                                  canEdit={canCreate || s.teacherId === me || s.coTeacherIds.includes(me)}
                                  onOpen={onOpen}
                                  klass={classes.find((k) => k.id === s.classId)} attendance={attendance} allSessions={allSessions}
                                  canDrag={canCreate} onDropStudent={(from, studentId) => from !== s.id && setMoving({ from, studentId, to: s.id })} />
                                </div>
                              ))}
                              {cell.length === 0 && canCreate && (row.block || plain) && tid && !closed && !holiday && !past && (
                                <Button variant="ghost" size="inline" type="button" onClick={() => onSlot({ date, start: row.start, teacherId: tid })}
                                  className="absolute inset-0 flex items-center justify-center gap-1.5 text-sm text-transparent transition group-hover/cell:bg-card group-hover/cell:text-muted-foreground">
                                  <PlusIcon className="size-4" /> สร้างคลาส
                                </Button>
                              )}
                              {nowHere && <span className="pointer-events-none absolute inset-x-0 z-[5] h-px bg-danger" style={{ top: `${nowPct(row)}%` }} />}
                            </div>
                          )
                        })}
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>
            )}
          </HScrollSection>
        )
      })}
    </div>
  )
}

/** Header menu actions for one teacher's whole day: one substitute for every session, or cancel them all. */
function TeacherDayDialog({ mode, teacherId, date, onClose }: { mode: "substitute" | "cancel"; teacherId: string; date: DateStr; onClose: () => void }) {
  const staff = useStore((st) => st.staff)
  const sessions = useStore((st) => st.sessions)
  const substitute = useStore((st) => st.substituteTeacherForDay)
  const cancelDay = useStore((st) => st.cancelTeacherDay)
  const now = useNow(60_000)
  const L = useLookup()
  const [reason, setReason] = useState("")
  const [subId, setSubId] = useState("")
  const day = sessions.filter((x) => x.date === date && x.teacherId === teacherId && !x.cancelled && toDateStr(now) <= x.date).sort((a, b) => a.start.localeCompare(b.start))
  const subjects = [...new Set(day.flatMap((x) => subjectsOf(x)))]
  const branchId = day[0]?.branchId
  // regular teachers first, then part-time; the ones who teach every subject of the day first
  const teachers = staff.map((t) => staffAt(t, branchId)).filter((t) => t.active && t.roles.includes("teacher") && !!branchId && t.branchIds.includes(branchId) && t.id !== teacherId)
    .sort((a, b) => Number(!!a.partTime) - Number(!!b.partTime))
  const fits = (t: (typeof teachers)[number]) => subjects.every((x) => t.subjects.includes(x))
  const students = new Set(day.flatMap((x) => x.studentIds)).size
  const submit = () => (mode === "substitute"
    ? report(substitute(teacherId, date, subId, reason), (v) => `${L.teacher(subId).label} สอนแทน ${v.sessions} คาบแล้ว`)
    : report(cancelDay(teacherId, date, reason), (v) => `ยกเลิก ${v.sessions} คาบ · เลื่อนวันจบให้นักเรียน ${v.students} คน`)) && onClose()
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "substitute" ? "เปลี่ยนครู (ทั้งวัน)" : "ยกเลิกคลาส (ทั้งวัน)"} · {L.teacher(teacherId).label}</DialogTitle>
          <DialogDescription>{DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })} · {day.length} คาบ · นักเรียน {students} คน</DialogDescription>
        </DialogHeader>
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-muted/40 p-2 text-xs">
          {day.map((x) => <li key={x.id}>{x.start}–{endTime(x.start, x.minutes)} · {subjectsOf(x).join(" + ")} · {L.room(x.roomId)} · {x.studentIds.length} คน</li>)}
        </ul>
        <LeaveReasonPicker onChange={setReason} />
        {mode === "substitute" ? (
          <NativeSelect value={subId} onChange={(e) => setSubId(e.target.value)} placeholder="เลือกครูสอนแทน"
            options={[...teachers.filter(fits), ...teachers.filter((t) => !fits(t))].map((t) => ({ value: t.id, label: `${t.nickname}${t.partTime ? " · Part-time" : ""}${fits(t) ? "" : " (สอนไม่ครบทุกวิชาของวันนี้)"}` }))} />
        ) : (
          <p className="rounded-xl bg-danger-soft/60 p-2.5 text-xs text-danger-ink">ทุกคาบของ{L.teacher(teacherId).label}วันนี้จะถูกยกเลิก · วันเรียนจบของนักเรียนทุกคนเลื่อนออกไป 1 คาบ · แจ้งเตือนทีมแล้ว</p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ปิด</Button>
          <Button variant={mode === "cancel" ? "destructive" : "default"} disabled={!reason.trim() || (mode === "substitute" && !subId) || !day.length} onClick={submit}>
            {mode === "substitute" ? "ให้สอนแทนทั้งวัน" : "ยกเลิกทั้งวัน"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** After a drop: just this session, the next N of the class, or for good (all following — changes class). Undo in the toast. */
function MoveStudentDialog({ from, studentId, to, onClose }: { from: string; studentId: string; to: string; onClose: () => void }) {
  const sessions = useStore((st) => st.sessions)
  const classes = useStore((st) => st.classes)
  const move = useStore((st) => st.moveStudent)
  const undo = useStore((st) => st.undoLastMove)
  const L = useLookup()
  const a = sessions.find((x) => x.id === from)!
  const b = sessions.find((x) => x.id === to)!
  const [kind, setKind] = useState<"one" | "count" | "following">("one")
  const [nText, setNText] = useState("2")
  const both = !!a.classId && !!b.classId && a.classId !== b.classId
  const k = classes.find((x) => x.id === b.classId)
  const subjectOff = !subjectsOf(a).some((x) => subjectsOf(b).includes(x))
  const label = (x: Session) => `${DAY_FULL[weekdayOf(x.date)].slice(0, 3)} ${fmtDate(x.date)} ${x.start} · ${classes.find((c) => c.id === x.classId)?.name ?? x.subject} · ${L.teacher(x.teacherId).label}`
  const submit = () => {
    const r = move(from, studentId, to, kind === "count" ? { kind, n: Number(nText) } : { kind })
    if (!r.ok) return report(r, "")
    toast.success(`ย้าย${L.student(studentId)?.nickname} ${r.value.moved} คาบแล้ว`, { action: { label: "ย้อนกลับ", onClick: () => report(undo(), "ย้อนกลับแล้ว") }, duration: 10000 })
    onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>ย้าย{L.student(studentId)?.nickname}</DialogTitle>
          <DialogDescription>จาก {label(a)}<br />ไป {label(b)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {([["one", "เฉพาะคาบนี้", "ย้ายครั้งเดียว"], ["count", "หลายคาบ", "ย้ายคาบถัดไปของคลาสเดิม ไปเรียนคาบถัดไปของคลาสใหม่"], ["following", "ทุกคาบที่ตามมา (ย้ายคลาสถาวร)", "ออกจากคลาสเดิม เข้าคลาสใหม่ · แพ็กเกจย้ายตาม"]] as const).map(([v, t, h]) => (
            <Button variant="ghost" size="inline" key={v} type="button" disabled={v !== "one" && !both} aria-pressed={kind === v} onClick={() => setKind(v)}
              className={cn("rounded-xl border p-2.5 text-left disabled:opacity-40", kind === v ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
              <p className="text-sm font-medium">{t}</p><p className="text-xs text-muted-foreground">{h}</p>
            </Button>
          ))}
          {kind === "count" && <label className="flex items-center gap-2 text-sm">จำนวน <Input type="number" min={1} className="h-9 w-20" value={nText} onChange={(e) => setNText(e.target.value)} /> คาบ</label>}
        </div>
        {(subjectOff || (k && b.studentIds.length >= classCapacity(k))) && (
          <p className="rounded-xl bg-warning-soft/60 p-2 text-xs text-warning-ink">
            {subjectOff && "⚠ วิชาไม่ตรงกับคาบเดิม — เช็คแพ็กเกจของนักเรียน "}{k && b.studentIds.length >= classCapacity(k) && `⚠ คาบปลายทางมี ${b.studentIds.length} คนแล้ว (แนะนำไม่เกิน ${classCapacity(k)})`}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={kind === "count" && !(Number(nText) >= 1)} onClick={submit}>ย้าย</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


/**
 * The Room line above a block (owner 2026-10-01): room first and boldest, then students · kind · group/single as quiet
 * grey icons — words appear only when the column is wide enough (container query), so neighbours stay calm.
 */
function RoomLine({ sessions, classes, clash, onResolve, inCell }: { sessions: Session[]; classes: Klass[]; clash: string[]; onResolve?: (ids: string[]) => void; inCell?: boolean }) {
  const L = useLookup()
  if (!sessions.length) return <div className="border-b border-l bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">-</div>
  // owner 2026-10-15: inside a class cell the room line takes the cell's own colour — no grey band, no divider
  return (
    <div className={cn("@container", inCell ? "" : "border-b border-l bg-muted px-3 py-1.5")}>
      {sessions.map((s) => {
        const k = classes.find((c) => c.id === s.classId)
        const kind = kindOf(s, k)
        const K = kind ? KIND_ICON[kind] : null
        const single = k?.type === "single"
        return (
          <div key={s.id} className="flex items-center gap-2.5 text-xs text-muted-foreground">
            {clash.includes(s.id) && (
              <Button variant="ghost" size="inline" type="button" disabled={!onResolve} onClick={() => onResolve?.(clash)} title="คาบชน · กดเพื่อแก้ปัญหา"
                className="flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-1.5 py-0.5 text-2xs font-medium text-danger-ink hover:opacity-80">
                <AlertTriangleIcon className="size-3" /><span className="hidden @[15rem]:inline">แก้ปัญหา</span>
              </Button>
            )}
            {/* owner 2026-10-15: second line of the card = time on the left · room · students · class type (· co-teacher) on the right */}
            {inCell ? <span className="shrink-0 tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span> : <span className="truncate text-sm font-semibold text-foreground">{L.room(s.roomId)}</span>}
            <span className="ml-auto flex min-w-0 items-center gap-2.5">
              {inCell && <RoomMeta roomId={s.roomId} />}
              <StudentsMeta n={s.studentIds.length} />
              {K && !inCell && <span className="flex items-center gap-1" title={K.label}><K.icon className="size-3.5" /><span className="hidden @[15rem]:inline">{K.label}</span></span>}
              <span className="flex items-center gap-1" title={single ? "Single (เรียนเดี่ยว)" : "Group"}>
                {single ? <UserIcon className="size-3.5" /> : <UsersIcon className="size-3.5" />}{!inCell && <span className="hidden @[15rem]:inline">{single ? "Single" : "Group"}</span>}
              </span>
              {inCell && s.coTeacherIds.length > 0 && <span className="truncate" title="ครูช่วยสอน">+{s.coTeacherIds.map((x) => L.teacher(x).label).join(", ")}</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** One session inside a block — no card: just the subject line and the students, on the cell itself. */
function SessionBlock({ s, room, state, ended, dayDate, canEdit, onOpen, klass, attendance, allSessions, canDrag, onDropStudent }: {
  s: Session; room?: React.ReactNode; state: WorkState; ended: boolean; dayDate: (d: DateStr) => string; canEdit: boolean
  onOpen: (id: string) => void
  klass?: Klass; attendance: Attendance[]; allSessions: Session[]
  canDrag: boolean; onDropStudent: (fromSessionId: string, studentId: string) => void
}) {
  const [over, setOver] = useState(false)
  const L = useLookup()
  const c = subjectColor(s.subject)
  const St = STATE_ICON[state]
  // owner 2026-10-15: every card shows its time (it used to show only when it differed from the row)
  const me = useStore((st) => st.userId)
  const branch = useBranch()
  const periodName = (id: string) => branch.specialPeriods.find((p) => p.id === id)?.name ?? "พิเศษ"
  const dot = unseenChange(s, me)
  const allNotes = useStore((st) => st.calendarNotes)
  const addNote = useStore((st) => st.addCalendarNote)
  const editNote = useStore((st) => st.editCalendarNote)
  const deleteNote = useStore((st) => st.deleteCalendarNote)
  const now = useNow(60_000)
  return (
    <div className={cn("relative space-y-1.5 px-3 py-2", over && "bg-primary/5 ring-2 ring-primary/40 ring-inset")}
      onDragOver={(e) => { if (canDrag && !ended && e.dataTransfer.types.includes("application/x-student")) { e.preventDefault(); setOver(true) } }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); const raw = e.dataTransfer.getData("application/x-student"); if (raw) { const d = JSON.parse(raw) as { from: string; studentId: string }; onDropStudent(d.from, d.studentId) } }}>
      {/* someone changed this session — only its own teachers see it, until they open it */}
      {dot && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-danger ring-2 ring-card" title={`${s.changed!.what} · เปิดคาบเพื่อดู`} />}
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", c.bar)} />
        <Button variant="row" size="inline" type="button" onClick={() => onOpen(s.id)} className="min-w-0 truncate text-left text-sm font-semibold text-foreground hover:underline">
          {subjectsOf(s).join(" + ")}
        </Button>
        {klass?.periodId && <span className="shrink-0 rounded-full bg-special-soft px-1.5 text-2xs font-medium text-special-ink" title="คลาสพิเศษของช่วงนี้">{periodName(klass.periodId)}</span>}
        {s.teacherLeave?.substituteId && (
          <span className="flex shrink-0 items-center gap-0.5 text-2xs text-warning" title={`สอนแทน${L.teacher(s.teacherLeave.teacherId).label} · ${s.teacherLeave.reason}`}>
            <ArrowLeftRightIcon className="size-3" />แทน{L.teacher(s.teacherLeave.teacherId).label}
          </span>
        )}
        {(() => {
          const kind = kindOf(s, klass)
          const K = kind ? KIND_ICON[kind] : null
          return K && (
            <HoverCard>
              <HoverCardTrigger render={<span tabIndex={0} aria-label={K.label} className={cn("ml-auto grid size-5 shrink-0 place-items-center rounded-full", K.tone)} />}>
                <K.icon className="size-3" />
              </HoverCardTrigger>
              <HoverCardContent>{K.label}</HoverCardContent>
            </HoverCard>
          )
        })()}
        <HoverCard>
          <HoverCardTrigger render={<span tabIndex={0} aria-label={St.label} className={cn("inline-flex shrink-0", !kindOf(s, klass) && "ml-auto", dot && "mr-3")} />}>
            <St.icon className={cn("size-3.5", state === "live" ? "text-primary" : St.tone)} />
          </HoverCardTrigger>
          <HoverCardContent>{St.label}</HoverCardContent>
        </HoverCard>
      </div>
      {/* owner 2026-10-15: class on top, then the room (day view) */}
      {room}
      {s.studentIds.map((sid, idx) => {
        const seat = Seats.seatOf(s, sid, klass)
        const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
        const moved = s.rescheduledIn?.includes(sid) ? allSessions.find((x) => x.rescheduledOut?.some((m) => m.studentId === sid && m.toSessionId === s.id)) : undefined
        const result = a ? { text: MARK_TEXT[a.status], tone: MARK_TONE[a.status], icon: MARK_ICON[a.status] } : ended && !s.trial ? { text: "ยังไม่เช็ค", tone: "text-warning", icon: CircleDashedIcon } : null
        return (
          <StudentLine key={sid} divider={idx > 0} drag={canDrag && !ended && !a ? JSON.stringify({ from: s.id, studentId: sid }) : undefined} nickname={L.student(sid)?.nickname ?? "?"} grade={L.student(sid)?.grade ?? ""} avatarKey={sid}
            notes={calendarNotesFor(s, sid, allNotes).map((n) => ({ id: n.id, text: n.text, kind: n.kind, when: noteWhen(n.at, now) }))}
            canPermanent={!!s.classId}
            onAddNote={(text, kind) => report(addNote(s.id, sid, text, kind), `บันทึก Note ${NOTE_KIND_LABEL[kind]}แล้ว`)}
            onEditNote={(id, text, kind) => report(editNote(id, s.id, text, kind), "แก้ Note แล้ว")}
            onDeleteNote={(id) => report(deleteNote(id, s.id), "ลบ Note แล้ว")}
            time={Seats.isPartial(seat, s.minutes) ? Seats.seatTime(s.start, seat) : undefined}
            result={result} movedFrom={moved ? `ย้ายมาจาก ${dayDate(moved.date)}` : undefined} inverted={false}
            onOpen={() => onOpen(s.id)} canEdit={canEdit} />
        )
      })}
      {(s.rescheduledOut ?? []).map((m) => {
        const to = allSessions.find((x) => x.id === m.toSessionId)
        return (
          <Button variant="row" size="inline" key={`out-${m.studentId}`} type="button" onClick={() => to && onOpen(to.id)} className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground">
            <span className="line-through">{L.student(m.studentId)?.nickname}</span>
            <span className="ml-auto shrink-0">→ {to ? `${dayDate(to.date)} ${to.start}` : "ย้ายแล้ว"}</span>
          </Button>
        )
      })}
      {s.studentIds.length === 0 && <Button variant="link" size="inline" type="button" onClick={() => onOpen(s.id)} className="text-xs text-muted-foreground hover:underline">ยังไม่มีนักเรียน · เปิดคาบ</Button>}
    </div>
  )
}

/** "13:00" for today, "2d" for older (owner 2026-10-12: Note 1 (13:00) · Note 2 (08:00) · Note 3 (2d)) */
function noteWhen(at: string, now: Date) {
  const d = new Date(at)
  if (toDateStr(d) === toDateStr(now)) return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  const days = Math.max(1, Math.round((now.getTime() - d.getTime()) / 86_400_000))
  return `${days}d`
}

/**
 * nickname · + Note · own time · result · grade, then every note on its own line (owner 2026-10-12: more than one
 * note per student). Owner 2026-10-15: these are Note Calendar — apart from the student's Note tab, editable and
 * deletable, ถาวร (pinned, every session of the class) or ชั่วคราว (this session only).
 */
type LineNote = { id: string; text: string; kind: CalendarNoteKind; when?: string }
function StudentLine({ divider, drag, nickname, grade, notes, time, result, movedFrom, inverted, onOpen, canEdit, canPermanent, onAddNote, onEditNote, onDeleteNote }: {
  /** a line above this student (every student but the first) — owner 2026-11-13: lines, not frames, tell students apart */
  divider?: boolean
  drag?: string; nickname: string; grade: string; avatarKey: string; notes: LineNote[]; time?: string
  result: { text: string; tone: string; icon: typeof CheckIcon } | null; movedFrom?: string; inverted: boolean
  onOpen: () => void; canEdit: boolean; canPermanent: boolean
  onAddNote: (text: string, kind: CalendarNoteKind) => void
  onEditNote: (id: string, text: string, kind: CalendarNoteKind) => void
  onDeleteNote: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const muted = inverted ? "text-white/75" : "text-muted-foreground"
  return (
    <div className={cn("group/line min-w-0", divider && "border-t pt-1.5")}>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="inline" type="button" onClick={onOpen} draggable={!!drag} onDragStart={(e) => { if (drag) { e.dataTransfer.setData("application/x-student", drag); e.dataTransfer.effectAllowed = "move" } }}
          title={drag ? "ลากไปวางที่คาบอื่นเพื่อย้าย" : undefined} className={cn("shrink-0 truncate text-left font-medium hover:underline", drag && "cursor-grab active:cursor-grabbing")}>{nickname}</Button>
        {/* owner 2026-11-13: grade is part of who the student is — plain muted text beside the name; the right edge is only status */}
        {grade && <span className="shrink-0 text-xs text-muted-foreground">{grade}</span>}
        {canEdit && !adding ? (
          <Button variant="row" size="inline" type="button" onClick={() => setAdding(true)} className={cn("flex min-w-0 flex-1 items-center gap-1 truncate text-left text-xs italic opacity-0 group-hover/line:opacity-100 focus-visible:opacity-100", muted)}>
            <PlusIcon className="size-3 shrink-0" /><span className="truncate">Note</span>
          </Button>
        ) : <span className="flex-1" />}
        {/* two fixed-width status slots (partial-class clock · attendance result) so the icons stack in columns down the card */}
        <span className="inline-flex size-4 shrink-0 items-center justify-center">
          {time && (
            <HoverCard>
              <HoverCardTrigger render={<span tabIndex={0} aria-label={`เรียนเฉพาะ ${time}`} className="inline-flex shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none" />}>
                <ClockFadingIcon className={cn("size-4", inverted ? "text-white" : "text-muted-foreground")} />
              </HoverCardTrigger>
              <HoverCardContent>{`เรียนเฉพาะช่วง ${time}`}</HoverCardContent>
            </HoverCard>
          )}
        </span>
        <span title={result?.text} className="inline-flex size-4 shrink-0 items-center justify-center">
          {result && <result.icon className={cn("size-4", inverted ? "text-white" : result.tone)} aria-label={result.text} />}
        </span>
      </div>
      {adding && <NoteEditor kind="temporary" canPermanent={canPermanent} onDone={(text, kind) => { setAdding(false); if (text) onAddNote(text, kind) }} />}
      {notes.map((n) => editing === n.id ? (
        <NoteEditor key={n.id} text={n.text} kind={n.kind} canPermanent={canPermanent || n.kind === "permanent"}
          onDelete={() => { setEditing(null); onDeleteNote(n.id) }}
          onDone={(text, kind) => { setEditing(null); if (text && (text !== n.text || kind !== n.kind)) onEditNote(n.id, text, kind) }} />
      ) : (
        <div key={n.id} className="group/note flex min-w-0 items-center gap-1.5">
          {/* a bullet in front of every note, a pin for a permanent one — flush with the card's left edge */}
          {n.kind === "permanent" ? <PinIcon className={cn("size-3 shrink-0", inverted ? "text-white/80" : "text-primary")} aria-label="Note ถาวร" /> : <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", inverted ? "bg-white/70" : "bg-muted-foreground/60")} />}
          <Button variant="row" size="inline" type="button" disabled={!canEdit} onClick={() => setEditing(n.id)} title={`${n.text}\nNote ${NOTE_KIND_LABEL[n.kind]}${n.kind === "permanent" ? " — แสดงทุกคาบของคลาสนี้" : " — เฉพาะคาบนี้"}`}
            className={cn("min-w-0 shrink text-left text-xs", inverted ? "text-white/90" : "text-foreground/80", canEdit && "hover:underline")}>
            {/* the Button is inline-flex + shrink-0 by default, so the text needs its own truncating span or it runs out of the card */}
            <span className="min-w-0 truncate">{n.text}</span>{n.when && <span className={cn("ml-1 shrink-0 tabular-nums", muted)}>({n.when})</span>}
          </Button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-2xs" type="button" aria-label="จัดการ Note" className={cn("ml-auto shrink-0 rounded-full opacity-0 group-hover/note:opacity-100 hover:bg-muted focus-visible:opacity-100 data-[popup-open]:opacity-100", muted)} />}>
                <EllipsisIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => setEditing(n.id)}><PencilLineIcon /> แก้ไข Note</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => onDeleteNote(n.id)}><Trash2Icon /> ลบ Note</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
      {movedFrom && <p className={cn("text-2xs", inverted ? "text-white/80" : "text-info")}>↩ {movedFrom}</p>}
    </div>
  )
}

/**
 * A day's table that scrolls sideways (owner 2026-11-20 — teachers use a mouse, and a mouse can't swipe): `by(±1)` steps one teacher column,
 * and dragging or turning the wheel on anything marked `data-pan` (the day band, the teacher names) moves it too. Shift + wheel works as always.
 */
function HScrollSection({ id, className, children }: { id: string; className?: string; children: (api: { canLeft: boolean; canRight: boolean; by: (dir: -1 | 1) => void }) => ReactNode }) {
  const [el, setEl] = useState<HTMLElement | null>(null)
  const [edge, setEdge] = useState({ canLeft: false, canRight: false })
  const measure = useCallback(() => {
    if (!el) return
    const canLeft = el.scrollLeft > 1, canRight = el.scrollLeft + el.clientWidth < el.scrollWidth - 1
    setEdge((e) => (e.canLeft === canLeft && e.canRight === canRight ? e : { canLeft, canRight }))
  }, [el])
  useEffect(() => {
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (el.firstElementChild) ro.observe(el.firstElementChild)
    // a turn of the wheel over the pan zones goes sideways (needs a non-passive listener to stop the page scrolling instead)
    const onWheel = (e: WheelEvent) => {
      if (!(e.target as HTMLElement).closest("[data-pan]") || el.scrollWidth <= el.clientWidth || Math.abs(e.deltaY) < Math.abs(e.deltaX)) return
      e.preventDefault()
      el.scrollBy({ left: e.deltaY })
    }
    el.addEventListener("wheel", onWheel, { passive: false })
    return () => { ro.disconnect(); el.removeEventListener("wheel", onWheel) }
  }, [el, measure])
  const [drag, setDrag] = useState<{ x: number; left: number } | null>(null)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !el || !(e.target as HTMLElement).closest("[data-pan]") || (e.target as HTMLElement).closest("button, a, input, select, textarea, [role=menuitem]")) return
    setDrag({ x: e.clientX, left: el.scrollLeft })
    el.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => { if (drag && el) el.scrollTo({ left: drag.left - (e.clientX - drag.x) }) }
  const onPointerUp = (e: React.PointerEvent) => { if (drag && el) { setDrag(null); el.releasePointerCapture(e.pointerId) } }
  const by = (dir: -1 | 1) => el?.scrollBy({ left: dir * 272, behavior: "smooth" })
  return (
    <section ref={setEl} id={id} onScroll={measure} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      className={cn("overflow-x-auto [&_[data-pan]]:cursor-grab", drag && "select-none [&_[data-pan]]:cursor-grabbing", className)}>
      {children({ ...edge, by })}
    </section>
  )
}
