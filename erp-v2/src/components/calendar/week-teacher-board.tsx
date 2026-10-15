"use client"

import { staffAt } from "@/domain/rules/permissions"
import { Fragment, useMemo, useRef, useState } from "react"
import { AlertTriangleIcon, Clock3Icon, CalendarOffIcon, CircleCheckIcon, CircleDashedIcon, CircleXIcon, ArrowLeftRightIcon, BanIcon, EllipsisIcon, CheckIcon, ClipboardCheckIcon, FlaskConicalIcon, RotateCcwIcon, MessagesSquareIcon, PencilLineIcon, PinIcon, PlusIcon, Trash2Icon, ShapesIcon, UserIcon, UsersIcon } from "lucide-react"
import type { ClassPrefill } from "@/components/app/class-dialog"
import { ConflictResolver, liveConflicts } from "@/components/app/conflict-resolver"
import { avatarTone, gradeTone, initial, subjectColor } from "@/components/app/subject-color"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
import { RoomMeta, StudentsMeta } from "@/components/calendar/session-meta"
import { subjectAbbr } from "@/domain/rules/settings"
import { calendarNotesFor, CALENDAR_NOTE_MAX, NOTE_KIND_LABEL } from "@/domain/rules/calendar-notes"
import type { Attendance, CalendarNoteKind, DateStr, Klass, Session, TimeStr } from "@/domain/types"
import { report } from "@/lib/feedback"
import { toast } from "sonner"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { unseenChange, useStore } from "@/store/store"

const DAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]
/** Thai day colours (อา. แดง · จ. เหลือง · อ. ชมพู · พ. เขียว · พฤ. ส้ม · ศ. ฟ้า · ส. ม่วง) — light normally, strong for
 *  today, lighter still once the day has passed (owner 2026-09-30). Full class strings so Tailwind keeps them. */
const DAY_TONE: { soft: string; strong: string; faded: string }[] = [
  { soft: "bg-red-100 text-red-900", strong: "bg-red-600 text-white", faded: "bg-red-50 text-red-900/50" },
  { soft: "bg-yellow-100 text-yellow-900", strong: "bg-yellow-500 text-yellow-950", faded: "bg-yellow-50 text-yellow-900/50" },
  { soft: "bg-pink-100 text-pink-900", strong: "bg-pink-600 text-white", faded: "bg-pink-50 text-pink-900/50" },
  { soft: "bg-green-100 text-green-900", strong: "bg-green-600 text-white", faded: "bg-green-50 text-green-900/50" },
  { soft: "bg-orange-100 text-orange-900", strong: "bg-orange-500 text-white", faded: "bg-orange-50 text-orange-900/50" },
  { soft: "bg-sky-100 text-sky-900", strong: "bg-sky-600 text-white", faded: "bg-sky-50 text-sky-900/50" },
  { soft: "bg-purple-100 text-purple-900", strong: "bg-purple-600 text-white", faded: "bg-purple-50 text-purple-900/50" },
]
const dayTone = (date: DateStr, today: DateStr) => { const t = DAY_TONE[weekdayOf(date)]; return date === today ? t.strong : date < today ? t.faded : t.soft }

const MARK_TEXT = { present: "มา", absent: "ขาด", leave: "ลา" } as const
const MARK_TONE = { present: "text-emerald-600", absent: "text-red-600", leave: "text-sky-600" } as const
// owner 2026-10-15: the check-in result as an icon that tells the story — the word stays as its tooltip
const MARK_ICON = { present: CircleCheckIcon, absent: CircleXIcon, leave: CalendarOffIcon } as const
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
    return ids.sort((a, b) => (a === "" ? 1 : b === "" ? -1 : name(a).localeCompare(name(b), "th")))
  }, [live, staff])

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
    // sessions outside every block still show — as their own row at their start time
    const loose = [...new Set(ofDay.filter((s) => !blockFor(blocks, s.start)).map((s) => s.start))]
    return [...blocks.map((b) => ({ start: b.start, end: b.end, block: true })), ...loose.map((t) => ({ start: t, end: endTime(t, 60), block: false }))]
      .sort((a, b) => a.start.localeCompare(b.start))
  }
  const cellSessions = (date: DateStr, teacherId: string, row: Row) => {
    if (plain) return live.filter((s) => s.date === date && (s.teacherId ?? "") === teacherId && s.start >= row.start && s.start < row.end).sort((a, b) => a.start.localeCompare(b.start))
    const blocks = blocksOn(branch, date)
    return live.filter((s) => s.date === date && (s.teacherId ?? "") === teacherId && (row.block ? blockFor(blocks, s.start)?.start === row.start : s.start === row.start && !blockFor(blocks, s.start)))
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
      {/* sits right under the app header (h-14) instead of sliding over it */}
      {days.length > 1 && <nav className="sticky top-14 z-10 -mx-1 flex flex-wrap gap-1.5 bg-background/95 px-1 py-2 backdrop-blur">
        {days.map((d) => (
          <a key={d} href={`#day-${d}`} className={cn("rounded-full px-3 py-1 text-xs font-medium hover:opacity-80", dayTone(d, today))}>{DAY_FULL[weekdayOf(d)].slice(0, 3)} {fmtDate(d)}</a>
        ))}
      </nav>}

      {dayAction && <TeacherDayDialog {...dayAction} onClose={() => setDayAction(null)} />}
      {moving && <MoveStudentDialog {...moving} onClose={() => setMoving(null)} />}
      {resolving && <ConflictResolver sessionIds={resolving} onClose={() => setResolving(null)} onOpen={(id) => { setResolving(null); onOpen(id) }} />}
      {days.map((date) => {
        const rows = rowsFor(date)
        const closed = !branch.hours[weekdayOf(date)]
        const holiday = isHoliday(date, branch.id, holidays)
        return (
          <section key={date} id={`day-${date}`} className="scroll-mt-32 overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/10">
            <div className="min-w-fit">
              <div className={cn("flex items-center gap-2 px-4 py-2 text-sm font-semibold", dayTone(date, today))}>
                <span>{DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })}{date === today ? " · วันนี้" : date < today ? " · ผ่านไปแล้ว" : ""}{holiday ? " · วันหยุด" : closed ? " · สาขาปิด" : ""}</span>
                {periodsOn(branch, date)[0] && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200">ช่วง {periodsOn(branch, date)[0].name}</span>}
              </div>
              {rows.length === 0 || teacherIds.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">{closed || holiday ? "ไม่มีคลาส" : "ยังไม่มีคลาสวันนี้"}</p>
              ) : (
                <div className="grid bg-zinc-50 text-sm dark:bg-zinc-900/40" style={{ gridTemplateColumns: cols }}>
                  {/* teacher headers: avatar · name · subjects · classes that day */}
                  <div className="sticky left-0 z-10 border-b bg-card" />

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
                      <div key={tid || "none"} className="group/head relative flex items-center gap-3 border-b border-l bg-card px-4 py-3">
                        {/* owner 2026-10-15: the same picture as on the Staff page (photo, else the initial) */}
                        {t ? <PersonAvatar person={t} className="size-11 text-base" /> : <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-base font-semibold", avatarTone("none"))}>?</span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{tid ? L.teacher(tid).label : "ยังไม่มีครู"}</p>
                          {/* owner 2026-10-15: subject codes (En · Ma · Sc) — the full names on hover */}
                          <p className="truncate text-xs text-muted-foreground" title={t?.subjects.join(" · ")}>{t?.subjects.map((x) => subjectAbbr(x, subjectNames)).join(" · ") || "—"}</p>
                        </div>
                        {away.length > 0 && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                            title={away.map((x) => `${x.start} ${x.subject}: ${x.teacherLeave!.substituteId ? `${L.teacher(x.teacherLeave!.substituteId).label} สอนแทน` : "ยกเลิก"}`).join("\n")}>
                            {away.every((x) => !x.teacherLeave!.substituteId) ? "ลา · ยกเลิกคลาส" : "ลา · เปลี่ยนครู"}
                          </span>
                        )}
                        <Badge variant="secondary" className="rounded-full tabular-nums">{n}</Badge>
                        {canMenu && (
                          <DropdownMenu>
                            {/* owner 2026-10-12: takes no room until the header is hovered — then it slides in and pushes the count aside */}
                            <DropdownMenuTrigger render={<button type="button" aria-label={`จัดการวันของ ${L.teacher(tid).label}`} className="-ml-3 grid h-7 w-0 shrink-0 place-items-center overflow-hidden rounded-full text-muted-foreground opacity-0 transition-[width,margin,opacity] duration-150 group-hover/head:ml-0 group-hover/head:w-7 group-hover/head:opacity-100 hover:bg-muted focus-visible:ml-0 focus-visible:w-7 focus-visible:opacity-100 data-[popup-open]:ml-0 data-[popup-open]:w-7 data-[popup-open]:opacity-100" />}>
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
                        <div className={cn("sticky left-0 z-10 flex flex-col items-center gap-1 border-b bg-card px-2 py-3 text-sm tabular-nums", plain ? "justify-start" : "justify-center", past && "text-muted-foreground", nowHere && "font-semibold text-primary")}>
                          <span>{row.start}</span>
                          {!plain && <span>{row.block ? row.end : "นอกช่วง"}</span>}
                        </div>
                        {teacherIds.map((tid) => {
                          const cell = cellSessions(date, tid, row)
                          // white = has students · light grey = a session with no students yet · table grey = nothing here
                          const hasStudents = cell.some((x) => x.studentIds.length > 0)
                          const liveHere = cell.some((x) => workState(x, now, attendance, summaries).state === "live")
                          return (
                            <div key={`c-${tid}`} className={cn("group/cell relative divide-y border-b border-l", plain ? "min-h-14" : "min-h-28",
                              hasStudents ? "bg-card" : cell.length ? "bg-zinc-100 dark:bg-zinc-800/60" : "",
                              past && cell.length > 0 && "opacity-75",
                              liveHere && "shadow-[inset_3px_0_0_0_var(--color-primary)]",
                              cell.some((x) => clashIds.has(x.id)) && "ring-2 ring-red-400 ring-inset")}>
                              {cell.map((s) => (
                                // one wrapper per session, so the cell's dividers fall between sessions — not under the room line
                                // owner 2026-10-15: the whole card opens the session — not just the class name (buttons inside keep their own job)
                                <div key={s.id} role="button" tabIndex={-1} className="cursor-pointer outline-2 -outline-offset-2 outline-transparent transition-[outline-color] hover:outline-primary/50"
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
                                <button type="button" onClick={() => onSlot({ date, start: row.start, teacherId: tid })}
                                  className="absolute inset-0 flex items-center justify-center gap-1.5 text-sm text-transparent transition group-hover/cell:bg-card group-hover/cell:text-muted-foreground">
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "substitute" ? "เปลี่ยนครู (ทั้งวัน)" : "ยกเลิกคลาส (ทั้งวัน)"} · {L.teacher(teacherId).label}</DialogTitle>
          <DialogDescription>{DAY_FULL[weekdayOf(date)]} {fmtDate(date, { year: true })} · {day.length} คาบ · นักเรียน {students} คน</DialogDescription>
        </DialogHeader>
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-muted/40 p-2 text-xs">
          {day.map((x) => <li key={x.id}>{x.start}–{endTime(x.start, x.minutes)} · {subjectsOf(x).join(" + ")} · {L.room(x.roomId)} · {x.studentIds.length} คน</li>)}
        </ul>
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === "substitute" ? "เหตุผล เช่น ครูป่วย / ลากิจ" : "เหตุผลการยกเลิก (จำเป็น)"} />
        {mode === "substitute" ? (
          <NativeSelect value={subId} onChange={(e) => setSubId(e.target.value)} placeholder="เลือกครูสอนแทน"
            options={[...teachers.filter(fits), ...teachers.filter((t) => !fits(t))].map((t) => ({ value: t.id, label: `${t.nickname}${t.partTime ? " · Part-time" : ""}${fits(t) ? "" : " (สอนไม่ครบทุกวิชาของวันนี้)"}` }))} />
        ) : (
          <p className="rounded-xl bg-red-50 p-2.5 text-xs text-red-900 dark:bg-red-950/40 dark:text-red-200">ทุกคาบของ{L.teacher(teacherId).label}วันนี้จะถูกยกเลิก · วันเรียนจบของนักเรียนทุกคนเลื่อนออกไป 1 คาบ · แจ้งเตือนทีมแล้ว</p>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ย้าย{L.student(studentId)?.nickname}</DialogTitle>
          <DialogDescription>จาก {label(a)}<br />ไป {label(b)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {([["one", "เฉพาะคาบนี้", "ย้ายครั้งเดียว"], ["count", "หลายคาบ", "ย้ายคาบถัดไปของคลาสเดิม ไปเรียนคาบถัดไปของคลาสใหม่"], ["following", "ทุกคาบที่ตามมา (ย้ายคลาสถาวร)", "ออกจากคลาสเดิม เข้าคลาสใหม่ · แพ็กเกจย้ายตาม"]] as const).map(([v, t, h]) => (
            <button key={v} type="button" disabled={v !== "one" && !both} aria-pressed={kind === v} onClick={() => setKind(v)}
              className={cn("rounded-xl border p-2.5 text-left disabled:opacity-40", kind === v ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
              <p className="text-sm font-medium">{t}</p><p className="text-xs text-muted-foreground">{h}</p>
            </button>
          ))}
          {kind === "count" && <label className="flex items-center gap-2 text-sm">จำนวน <Input type="number" min={1} className="h-9 w-20" value={nText} onChange={(e) => setNText(e.target.value)} /> คาบ</label>}
        </div>
        {(subjectOff || (k && b.studentIds.length >= classCapacity(k))) && (
          <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
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

const KIND_ICON = {
  test: { icon: ClipboardCheckIcon, label: "Test" },
  trial: { icon: FlaskConicalIcon, label: "Trial" },
  interview: { icon: MessagesSquareIcon, label: "Interview" },
  other: { icon: ShapesIcon, label: "Others" },
} as const

/** What kind of session this is, for the Room line (normal learning sessions show nothing). */
function kindOf(s: Session, klass?: Klass): keyof typeof KIND_ICON | null {
  if (s.assessment === "test" || klass?.kind === "test") return "test"
  if (s.assessment === "trial" || s.trial) return "trial"
  if (klass?.kind === "interview") return "interview"
  if (klass?.kind === "other") return "other"
  return null
}

/**
 * The Room line above a block (owner 2026-10-01): room first and boldest, then students · kind · group/single as quiet
 * grey icons — words appear only when the column is wide enough (container query), so neighbours stay calm.
 */
function RoomLine({ sessions, classes, clash, onResolve, inCell }: { sessions: Session[]; classes: Klass[]; clash: string[]; onResolve?: (ids: string[]) => void; inCell?: boolean }) {
  const L = useLookup()
  if (!sessions.length) return <div className="border-b border-l bg-zinc-100 px-3 py-1.5 text-center text-xs text-muted-foreground dark:bg-zinc-800">-</div>
  // owner 2026-10-15: inside a class cell the room line takes the cell's own colour — no grey band, no divider
  return (
    <div className={cn("@container", inCell ? "" : "border-b border-l bg-zinc-100 px-3 py-1.5 dark:bg-zinc-800")}>
      {sessions.map((s) => {
        const k = classes.find((c) => c.id === s.classId)
        const kind = kindOf(s, k)
        const K = kind ? KIND_ICON[kind] : null
        const single = k?.type === "single"
        return (
          <div key={s.id} className="flex items-center gap-2.5 text-xs text-muted-foreground">
            {clash.includes(s.id) && (
              <button type="button" disabled={!onResolve} onClick={() => onResolve?.(clash)} title="คาบชน · กดเพื่อแก้ปัญหา"
                className="flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300">
                <AlertTriangleIcon className="size-3" /><span className="hidden @[15rem]:inline">แก้ปัญหา</span>
              </button>
            )}
            {/* owner 2026-10-15: an icon instead of the word — "Room 3" → 🚪 3 (full name on hover) */}
            {inCell ? <RoomMeta roomId={s.roomId} className="text-xs font-medium" /> : <span className="truncate text-sm font-semibold text-foreground">{L.room(s.roomId)}</span>}
            <span className="ml-auto flex shrink-0 items-center gap-2.5">
              <StudentsMeta n={s.studentIds.length} />
              {K && <span className="flex items-center gap-1" title={K.label}><K.icon className="size-3.5" />{!inCell && <span className="hidden @[15rem]:inline">{K.label}</span>}</span>}
              <span className="flex items-center gap-1" title={single ? "Single (เรียนเดี่ยว)" : "Group"}>
                {single ? <UserIcon className="size-3.5" /> : <UsersIcon className="size-3.5" />}{!inCell && <span className="hidden @[15rem]:inline">{single ? "Single" : "Group"}</span>}
              </span>
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
      {dot && <span className="absolute top-2 right-2 size-2.5 rounded-full bg-red-500 ring-2 ring-card" title={`${s.changed!.what} · เปิดคาบเพื่อดู`} />}
      <div className="flex items-center gap-2">
        <span className={cn("size-2 shrink-0 rounded-full", c.bar)} />
        <button type="button" onClick={() => onOpen(s.id)} className="min-w-0 truncate text-left text-sm font-semibold text-foreground hover:underline">
          {subjectsOf(s).join(" + ")}<span className="ml-1.5 font-normal text-muted-foreground tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span>
        </button>
        {klass?.periodId && <span className="shrink-0 rounded-full bg-violet-100 px-1.5 text-[10px] font-medium text-violet-900 dark:bg-violet-950 dark:text-violet-200" title="คลาสพิเศษของช่วงนี้">{periodName(klass.periodId)}</span>}
        {s.coTeacherIds.length > 0 && <span className="shrink-0 text-[11px] text-muted-foreground" title="ครูช่วยสอน">+{s.coTeacherIds.map((x) => L.teacher(x).label).join(", ")}</span>}
        {s.teacherLeave?.substituteId && (
          <span className="flex shrink-0 items-center gap-0.5 text-[11px] text-amber-700" title={`สอนแทน${L.teacher(s.teacherLeave.teacherId).label} · ${s.teacherLeave.reason}`}>
            <ArrowLeftRightIcon className="size-3" />แทน{L.teacher(s.teacherLeave.teacherId).label}
          </span>
        )}
        <St.icon className={cn("ml-auto size-3.5 shrink-0", dot && "mr-3", state === "live" ? "text-primary" : St.tone)} aria-label={St.label} />
      </div>
      {/* owner 2026-10-15: class on top, then the room (day view) */}
      {room}
      {s.studentIds.map((sid) => {
        const seat = Seats.seatOf(s, sid, klass)
        const a = attendance.find((x) => x.sessionId === s.id && x.studentId === sid)
        const moved = s.rescheduledIn?.includes(sid) ? allSessions.find((x) => x.rescheduledOut?.some((m) => m.studentId === sid && m.toSessionId === s.id)) : undefined
        const result = a ? { text: MARK_TEXT[a.status], tone: MARK_TONE[a.status], icon: MARK_ICON[a.status] } : ended && !s.trial ? { text: "ยังไม่เช็ค", tone: "text-amber-500", icon: CircleDashedIcon } : null
        return (
          <StudentLine key={sid} drag={canDrag && !ended && !a ? JSON.stringify({ from: s.id, studentId: sid }) : undefined} nickname={L.student(sid)?.nickname ?? "?"} grade={L.student(sid)?.grade ?? ""} avatarKey={sid}
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
          <button key={`out-${m.studentId}`} type="button" onClick={() => to && onOpen(to.id)} className="flex w-full items-center gap-2 text-left text-xs text-muted-foreground">
            <span className="line-through">{L.student(m.studentId)?.nickname}</span>
            <span className="ml-auto shrink-0">→ {to ? `${dayDate(to.date)} ${to.start}` : "ย้ายแล้ว"}</span>
          </button>
        )
      })}
      {s.studentIds.length === 0 && <button type="button" onClick={() => onOpen(s.id)} className="text-xs text-muted-foreground hover:underline">ยังไม่มีนักเรียน · เปิดคาบ</button>}
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
function StudentLine({ drag, nickname, grade, avatarKey, notes, time, result, movedFrom, inverted, onOpen, canEdit, canPermanent, onAddNote, onEditNote, onDeleteNote }: {
  drag?: string; nickname: string; grade: string; avatarKey: string; notes: LineNote[]; time?: string
  result: { text: string; tone: string; icon: typeof CircleCheckIcon } | null; movedFrom?: string; inverted: boolean
  onOpen: () => void; canEdit: boolean; canPermanent: boolean
  onAddNote: (text: string, kind: CalendarNoteKind) => void
  onEditNote: (id: string, text: string, kind: CalendarNoteKind) => void
  onDeleteNote: (id: string) => void
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const muted = inverted ? "text-white/75" : "text-muted-foreground"
  return (
    <div className="group/line min-w-0">
      <div className="flex items-center gap-2">
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold", avatarTone(avatarKey))}>{initial(nickname)}</span>
        <button type="button" onClick={onOpen} draggable={!!drag} onDragStart={(e) => { if (drag) { e.dataTransfer.setData("application/x-student", drag); e.dataTransfer.effectAllowed = "move" } }}
          title={drag ? "ลากไปวางที่คาบอื่นเพื่อย้าย" : undefined} className={cn("shrink-0 truncate text-left font-medium hover:underline", drag && "cursor-grab active:cursor-grabbing")}>{nickname}</button>
        {canEdit && !adding ? (
          <button type="button" onClick={() => setAdding(true)} className={cn("flex min-w-0 flex-1 items-center gap-1 truncate text-left text-xs italic opacity-0 group-hover/line:opacity-100 focus-visible:opacity-100", muted)}>
            <PlusIcon className="size-3 shrink-0" /><span className="truncate">Note</span>
          </button>
        ) : <span className="flex-1" />}
        {/* owner 2026-10-15: part of the class only — an icon here, the hours on hover (and in the panel) */}
        {time && (
          <Tooltip>
            <TooltipTrigger render={<span tabIndex={0} aria-label={`เรียนเฉพาะ ${time}`} className="inline-flex shrink-0 rounded-full focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none" />}>
              <Clock3Icon className={cn("size-4", inverted ? "text-white" : "text-violet-600 dark:text-violet-300")} />
            </TooltipTrigger>
            <TooltipContent>{`เรียนเฉพาะช่วง ${time}`}</TooltipContent>
          </Tooltip>
        )}
        {result && <span title={result.text} className="inline-flex shrink-0"><result.icon className={cn("size-4", inverted ? "text-white" : result.tone)} aria-label={result.text} /></span>}
        {grade && <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", gradeTone(grade))}>{grade}</span>}
      </div>
      {adding && <NoteEditor kind="temporary" canPermanent={canPermanent} onDone={(text, kind) => { setAdding(false); if (text) onAddNote(text, kind) }} />}
      {notes.map((n) => editing === n.id ? (
        <NoteEditor key={n.id} text={n.text} kind={n.kind} canPermanent={canPermanent || n.kind === "permanent"}
          onDone={(text, kind) => { setEditing(null); if (text && (text !== n.text || kind !== n.kind)) onEditNote(n.id, text, kind) }} />
      ) : (
        <div key={n.id} className="group/note flex min-w-0 items-center gap-1 pl-8">
          {n.kind === "permanent" && <PinIcon className={cn("size-3 shrink-0", inverted ? "text-white/80" : "text-primary")} aria-label="Note ถาวร" />}
          <button type="button" disabled={!canEdit} onClick={() => setEditing(n.id)} title={`${n.text}\nNote ${NOTE_KIND_LABEL[n.kind]}${n.kind === "permanent" ? " — แสดงทุกคาบของคลาสนี้" : " — เฉพาะคาบนี้"}`}
            className={cn("min-w-0 truncate text-left text-xs", inverted ? "text-white/90" : "text-foreground/80", canEdit && "hover:underline")}>
            {n.text}{n.when && <span className={cn("ml-1 tabular-nums", muted)}>({n.when})</span>}
          </button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<button type="button" aria-label="จัดการ Note" className={cn("ml-auto grid size-5 shrink-0 place-items-center rounded-full opacity-0 group-hover/note:opacity-100 hover:bg-muted focus-visible:opacity-100 data-[popup-open]:opacity-100", muted)} />}>
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
      {movedFrom && <p className={cn("pl-8 text-[11px]", inverted ? "text-white/80" : "text-sky-700")}>↩ {movedFrom}</p>}
    </div>
  )
}

/** add / edit one Note Calendar: text + ชั่วคราว | ถาวร. Enter or leaving the box saves, Esc cancels. */
function NoteEditor({ text: initialText = "", kind: initialKind, canPermanent, onDone }: {
  text?: string; kind: CalendarNoteKind; canPermanent: boolean; onDone: (text: string, kind: CalendarNoteKind) => void
}) {
  const [text, setText] = useState(initialText)
  const [kind, setKind] = useState<CalendarNoteKind>(initialKind)
  const box = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const finish = (t: string) => { if (done.current) return; done.current = true; onDone(t.trim(), kind) }
  const kinds: CalendarNoteKind[] = ["temporary", "permanent"]
  return (
    <div ref={box} className="mt-1 space-y-1 pl-8" onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) finish(text) }}>
      <input autoFocus value={text} maxLength={CALENDAR_NOTE_MAX} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") finish(text); if (e.key === "Escape") finish("") }}
        placeholder="Note เช่น MBook 1 (2-4)" className="h-7 w-full min-w-0 rounded-full border bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/30" />
      <div className="flex items-center gap-1">
        {kinds.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} disabled={k === "permanent" && !canPermanent}
            title={k === "permanent" ? (canPermanent ? "แสดงทุกคาบของคลาสนี้" : "คาบนี้ไม่ได้อยู่ในคลาสประจำ") : "แสดงเฉพาะคาบนี้"}
            onClick={() => setKind(k)}
            className={cn("flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium disabled:opacity-40", kind === k ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {k === "permanent" && <PinIcon className="size-3" />}{NOTE_KIND_LABEL[k]}
          </button>
        ))}
        <button type="button" onClick={() => finish(text)} aria-label="บันทึก Note" className="ml-auto grid size-6 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><CheckIcon className="size-3.5" /></button>
      </div>
    </div>
  )
}
