"use client"

import { staffAt } from "@/domain/rules/permissions"
import { PeriodBanner } from "@/components/app/period-banner"
import { RangeStepper, PageHeader, Toolbar, Segmented } from "@/components/app/page-layout"
import { createContext, Suspense, useContext, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { AlertTriangleIcon, ClipboardListIcon, ListCollapseIcon, PalmtreeIcon, PlusIcon, Settings2Icon } from "lucide-react"
import { BlocksDialog } from "@/components/calendar/blocks-dialog"
import { canEditBlocks } from "@/domain/rules/permissions"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { SummaryPanel } from "@/components/calendar/summary-panel"
import { Pill } from "@/components/app/badges"
import { ClassDialog, type ClassPrefill } from "@/components/app/class-dialog"
import { NativeSelect } from "@/components/app/native-select"
import { SessionSheet } from "@/components/app/session-sheet"
import { subjectColor } from "@/components/app/subject-color"
import { WORK_ORDER, WorkIcon } from "@/components/app/work-state"
import { RoomMeta, StudentsMeta } from "@/components/calendar/session-meta"
import { MoveDialog } from "@/components/calendar/move-dialog"
import { WeekTeacherBoard } from "@/components/calendar/week-teacher-board"
import type { CardData } from "@/components/calendar/class-card"
import { Button } from "@/components/ui/button"
import { addDays, dayShort, endTime, fmtDate, fmtMonth, fromMinutes, parseDate, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { can } from "@/domain/rules/permissions"
import { findConflicts, isHoliday, periodsIn, sessionState, WORK_LABEL, workState, type MoveTarget, type WorkState } from "@/domain/rules/scheduling"
import type { DateStr, Session } from "@/domain/types"
import { useBranch, useLookup, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { sessionKindLabel } from "@/domain/rules/forms"
import { GradeChips } from "@/components/app/grade-chips"
import { removedWithClass } from "@/domain/rules/scheduling"

/** "board" = "วัน" (default): two ways to look at days, switchable — the teacher × block table for the whole week, or
 *  the original single-day board (lanes by teacher/room, drag & drop) — owner 2026-09-30 */
type View = "week" | "board" | "month" | "list"
const HOUR_PX = 56
/** owner 2026-10-15: the week grid stretches its hours to fill the screen — no empty space under the calendar */
const HourPx = createContext(HOUR_PX)
/** the height left between this element's top and the bottom of the window (minus the page's bottom padding) */
function useFillHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [h, setH] = useState<number | null>(null)
  useLayoutEffect(() => {
    const fit = () => { if (ref.current) setH(Math.max(0, window.innerHeight - (ref.current.getBoundingClientRect().top + window.scrollY) - 24)) }
    fit()
    window.addEventListener("resize", fit)
    return () => window.removeEventListener("resize", fit)
  }, [])
  return [ref, h] as const
}
const DAY_START = 8 * 60
const DAY_END = 21 * 60

const mondayOf = (d: DateStr) => addDays(d, -((weekdayOf(d) + 6) % 7))

function CalendarView() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const allSessions = useStore((s) => s.sessions)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const classes = useStore((s) => s.classes)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const leaves = useStore((s) => s.leaves)

  // deep link from elsewhere (e.g. "ดูในปฏิทิน" on an approved Test/Trial submission) — jump
  // straight to that session's day and open it, read once at mount via lazy initializers
  const linkedSession = useSearchParams().get("sessionId")

  // owner 2026-10-06: filters sync to the URL (?view=&day=&teacher=&subject=&status=) so a reload or shared link keeps them
  const [view, setView] = useQueryState<View>("view", "board")
  const [dayMode, setDayMode] = useQueryState<"table" | "single">("day", "table")
  const single = view === "board" && dayMode === "single"
  const [onlyBusy, setOnlyBusy] = useState(false)
  const [blocksDate, setBlocksDate] = useState<DateStr | null>(null)
  const canBlocks = canEditBlocks(staff.find((x) => x.id === me.id), branch.id)
  const [anchor, setAnchor] = useState(() => (linkedSession && allSessions.find((x) => x.id === linkedSession)?.date) || today)
  // everyone sees every session by default; teachers get a one-tap "only mine" filter
  const [teacher, setTeacher] = useQueryState<string>("teacher", "all")
  const [subject, setSubject] = useQueryState<string>("subject", "all")
  const [openId, setOpenId] = useState<string | null>(() => (linkedSession && allSessions.some((x) => x.id === linkedSession) ? linkedSession : null))
  const [prefill, setPrefill] = useState<ClassPrefill | null>(null)
  const [moving, setMoving] = useState<{ id: string; target: MoveTarget } | null>(null)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [workFilterParam, setWorkFilterParam] = useQueryState<WorkState | "all">("status", "all")
  const workFilter = workFilterParam === "all" ? null : workFilterParam
  const setWorkFilter = (w: WorkState | null) => setWorkFilterParam(w ?? "all")
  // per-viewer preference: show every slot, or only real classes
  const range = useMemo(() => {
    if (single) return { from: anchor, to: anchor, title: fmtDate(anchor, { weekday: true, year: true }) }
    if (view === "week" || view === "board") {
      const m = mondayOf(anchor)
      return { from: m, to: addDays(m, 6), title: `${fmtDate(m)} – ${fmtDate(addDays(m, 6), { year: true })}` } // E6: label = date range
    }
    if (view === "month") {
      const first = anchor.slice(0, 8) + "01"
      const from = mondayOf(first) // E7: weeks start Monday everywhere
      return { from, to: addDays(from, 41), title: fmtMonth(first) }
    }
    return { from: anchor, to: addDays(anchor, 13), title: `${fmtDate(anchor)} – ${fmtDate(addDays(anchor, 13), { year: true })}` }
  }, [view, anchor, single])

  const branchSessions = useMemo(() => allSessions.filter((s) => s.branchId === branch.id && !removedWithClass(s, classes)), [allSessions, branch.id, classes])
  const visible = useMemo(
    () =>
      branchSessions.filter(
        (s) =>
          s.date >= range.from && s.date <= range.to &&
          (teacher === "all" || (teacher === "none" ? !staff.some((t) => t.id === s.teacherId) : s.teacherId === teacher || s.coTeacherIds.includes(teacher))) &&
          (subject === "all" || s.subject === subject),
      ),
    [branchSessions, range, teacher, subject, staff],
  )
  // conflicts are computed on ALL branch sessions, not only the filtered ones
  // only clashes still ahead are worth a warning — past ones can't be fixed (owner 2026-10-01)
  const conflicts = useMemo(() => findConflicts(branchSessions.filter((s) => s.date >= range.from && s.date <= range.to), branch, staff)
    .filter((c) => c.sessionIds.every((id) => { const x = branchSessions.find((y) => y.id === id); return !!x && sessionState(x, now) === "upcoming" })), [branchSessions, range, branch, staff, now])
  const conflictIds = useMemo(() => new Set(conflicts.flatMap((c) => c.sessionIds)), [conflicts])
  const holidayDays = useMemo(() => {
    const out: DateStr[] = []
    for (let d = range.from; d <= range.to; d = addDays(d, 1)) if (isHoliday(d, branch.id, holidays)) out.push(d)
    return out
  }, [range, branch.id, holidays])

  const step = (dir: number) => setAnchor((a) => (single ? addDays(a, dir) : view === "week" || view === "board" ? addDays(a, 7 * dir) : view === "month" ? toDateStr(new Date(parseDate(a).getFullYear(), parseDate(a).getMonth() + dir, 1)) : addDays(a, 14 * dir)))
  // from week/month: open that day on the board (same week) and scroll to it
  const openDay = (d: DateStr) => { setAnchor(d); setView("board"); setTimeout(() => document.getElementById(`day-${d}`)?.scrollIntoView({ behavior: "smooth" }), 80) }
  const canCreate = can(me, "class.manage")
  const teacherOptions = [
    { value: "all", label: "ครูทุกคน" },
    ...(me.roles.includes("teacher") ? [{ value: me.id, label: "เฉพาะคาบของฉัน" }] : []),
    { value: "none", label: "ยังไม่มีครู" },
    ...staff.map((t) => staffAt(t, branch.id)).filter((t) => t.roles.includes("teacher") && t.branchIds.includes(branch.id) && t.id !== me.id).map((t) => ({ value: t.id, label: t.active ? t.nickname : `${t.nickname} (ออกแล้ว)` })),
  ]

  const cardProps = { conflictIds, now, onOpen: setOpenId, classes, onMove: (id: string, target: MoveTarget) => setMoving({ id, target }), canMove: (s: Session) => canCreate && sessionState(s, now) === "upcoming" }
  // one short line per conflict kind on each card
  const conflictMsg = new Map<string, string[]>()
  const grouped = new Map<string, { teacher: Set<string>; room: Set<string>; full: number }>()
  conflicts.forEach((c) =>
    c.sessionIds.forEach((id) => {
      const g = grouped.get(id) ?? { teacher: new Set<string>(), room: new Set<string>(), full: 0 }
      if (c.kind === "teacher") g.teacher.add(c.label)
      if (c.kind === "room") g.room.add(c.label)
      if (c.kind === "rooms_full") g.full = Math.max(g.full, Number(c.label))
      grouped.set(id, g)
    }),
  )
  grouped.forEach((g, id) =>
    conflictMsg.set(id, [
      ...(g.teacher.size ? [`ครูชน: ${[...g.teacher].join(", ")}`] : []),
      ...(g.room.size ? [`ห้องซ้ำ: ${[...g.room].join(", ")}`] : []),
      ...(g.full ? [`ห้องไม่พอ: ${g.full} คาบ/${branch.rooms.length} ห้อง`] : []),
    ]),
  )
  const workCounts: Partial<Record<WorkState, number>> = {}
  visible.forEach((s) => {
    const w = workState(s, now, attendance, summaries).state
    workCounts[w] = (workCounts[w] ?? 0) + 1
  })
  const cardData: CardData = {
    now, attendance, summaries, classes, staff, leaves, conflictMsg,
    dim: (s) => !!workFilter && workState(s, now, attendance, summaries).state !== workFilter,
    draggable: cardProps.canMove,
    onOpen: setOpenId,
  }

  return (
    <div className="space-y-4">
      {/* owner 2026-10-09: same structure as every page — header (name · what's in view · CTA), then one toolbar */}
      <PageHeader title="ปฏิทิน"
        description={<span className="flex flex-wrap items-center gap-1.5">
          {visible.filter((s) => !s.cancelled).length} คาบในช่วงนี้
          {conflicts.length > 0 && <Pill tone="red"><AlertTriangleIcon className="size-3" /> ชนกัน {conflicts.length} จุด</Pill>}
          {holidayDays.length > 0 && <Pill tone="amber"><PalmtreeIcon className="size-3" /> วันหยุด {holidayDays.length} วัน</Pill>}
        </span>}
        actions={<>
          {/* the whole picture of the range + everything to handle */}
          <Button variant="outline" onClick={() => setSummaryOpen(true)}><ClipboardListIcon /> Summary</Button>
          {canCreate && <Button onClick={() => setPrefill({ date: anchor })}><PlusIcon /> สร้างคลาส</Button>}
        </>} />

      <div className="space-y-3">
        <Toolbar end={<div className="flex flex-wrap items-center gap-2">
        {/* owner 2026-10-12: the board's own switch sits in front of the period switch */}
        {view === "board" && (
          <>
            <Segmented label="แบบตาราง" value={dayMode} onChange={(v) => setDayMode(v)}
              options={[{ value: "table", label: "ตารางครูทั้งสัปดาห์" }, { value: "single", label: "รายวัน" }]} />
            <span className="h-5 w-px bg-border" />
          </>
        )}
        <Segmented label="มุมมอง" value={view} onChange={(v) => setView(v)}
          options={[{ value: "board", label: "วัน" }, { value: "week", label: "สัปดาห์" }, { value: "month", label: "เดือน" }, { value: "list", label: "รายการ" }]} />
        </div>}>

        <RangeStepper label={range.title} current={range.from <= today && today <= range.to} onPrev={() => step(-1)} onNext={() => step(1)} onToday={() => setAnchor(today)} />
              </Toolbar>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="ตัวกรองปฏิทิน">
        <NativeSelect className="h-9 w-36" value={teacher} onChange={(e) => setTeacher(e.target.value)} options={teacherOptions} />
        <NativeSelect className="h-9 w-28" value={subject} onChange={(e) => setSubject(e.target.value)} options={[{ value: "all", label: "ทุกวิชา" }, ...branch.subjects.map((s) => ({ value: s, label: s }))]} />
        {/* status as a dropdown chip, like teachers / subjects (owner 2026-09-30) */}
        <NativeSelect className="h-9 w-40" value={workFilter ?? ""} onChange={(e) => setWorkFilter((e.target.value || null) as WorkState | null)}
          placeholder={`ทุกสถานะ (${visible.filter((x) => !x.cancelled).length})`}
          options={WORK_ORDER.map((w) => ({ value: w, label: `${WORK_LABEL[w]} (${workCounts[w] ?? 0})` }))} />
        {/* owner 2026-10-15: the board's own switches live with the filters — always in sight, no scrolling to find them */}
        <span className="ml-auto flex flex-wrap items-center gap-2">
          {single && (
            <Button variant={onlyBusy ? "secondary" : "ghost"} size="sm" aria-pressed={onlyBusy} onClick={() => setOnlyBusy(!onlyBusy)}
              title={onlyBusy ? "แสดงทุกชั่วโมง" : "แสดงเฉพาะเวลาที่มีคลาส"}>
              <ListCollapseIcon /> {onlyBusy ? "เฉพาะเวลาที่มีคลาส" : "ทุกชั่วโมง"}
            </Button>
          )}
          {view === "board" && canBlocks && (
            <Button variant="outline" size="sm" onClick={() => setBlocksDate(anchor < today ? today : anchor)} title="ตั้งช่วงเวลาเรียน (Time blocks) ของวัน / ทั้งสัปดาห์">
              <Settings2Icon /> ตั้งช่วงเวลา
            </Button>
          )}
        </span>

        </div>
      </div>

      {/* card states: click one to highlight only those cards */}
      {/* special periods (e.g. Summer) in the visible range — hours differ from normal while they last */}
      {periodsIn(branch, range.from, range.to).map((p) => <PeriodBanner key={p.id} period={p} />)}

      {conflicts.length > 0 && (
        <details data-focus="conflict" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <summary className="cursor-pointer font-medium">พบคาบที่ชนกัน {conflicts.length} จุด — กดเพื่อดู</summary>
          <ul className="mt-1 list-disc pl-5">
            {conflicts.map((c, i) => {
              const s = branchSessions.find((x) => x.id === c.sessionIds[0])!
              return <li key={i}><button className="underline" onClick={() => openDay(s.date)}>{fmtDate(s.date, { weekday: true })}</button> · {c.message}</li>
            })}
          </ul>
        </details>
      )}

      {view === "week" && <WeekView from={range.from} sessions={visible} onDay={openDay} today={today} {...cardProps} dim={cardData.dim} />}
      {/* รายวัน = the teacher board for one day (students in the cells), plain hours down the side (owner 2026-10-12) */}
      {blocksDate && <BlocksDialog branch={branch} date={blocksDate} onClose={() => setBlocksDate(null)} />}
      {single && <WeekTeacherBoard from={anchor} dayCount={1} onlyBusy={onlyBusy} sessions={workFilter ? visible.filter((x) => workState(x, now, attendance, summaries).state === workFilter) : visible} onOpen={setOpenId} onSlot={setPrefill} canCreate={canCreate} />}
      {view === "board" && !single && <WeekTeacherBoard from={range.from} sessions={workFilter ? visible.filter((x) => workState(x, now, attendance, summaries).state === workFilter) : visible} onOpen={setOpenId} onSlot={setPrefill} canCreate={canCreate} />}
      {view === "month" && <MonthView from={range.from} month={anchor.slice(0, 7)} sessions={visible} onDay={openDay} today={today} conflictIds={conflictIds} />}
      {view === "list" && <ListView from={range.from} to={range.to} sessions={visible} {...cardProps} />}

      <SessionSheet sessionId={openId} onClose={() => setOpenId(null)} />
      <SummaryPanel open={summaryOpen} onClose={() => setSummaryOpen(false)} title={range.title} sessions={visible} conflicts={conflicts} now={now}
        onOpenSession={(id) => { setSummaryOpen(false); setOpenId(id) }} />
      {prefill && <ClassDialog prefill={prefill} onClose={() => setPrefill(null)} />}
      {moving && <MoveDialog sessionId={moving.id} target={moving.target} onClose={() => setMoving(null)} />}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={null}>
      <CalendarView />
    </Suspense>
  )
}

interface CardCtx {
  conflictIds: Set<string>
  now: Date
  onOpen: (id: string) => void
  classes: { id: string; name: string; grades?: string[] }[]
  onMove: (id: string, target: MoveTarget) => void
  canMove: (s: Session) => boolean
  dim?: (s: Session) => boolean
}

function SessionCard({ s, conflictIds, now, onOpen, classes, compact, canMove, dim }: CardCtx & { s: Session; compact?: boolean }) {
  const L = useLookup()
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const t = L.teacher(s.teacherId)
  const name = classes.find((c) => c.id === s.classId)?.name ?? `${s.subject}${sessionKindLabel(s) ? ` · ${sessionKindLabel(s)}` : ""}`
  const conflict = conflictIds.has(s.id)
  const w = workState(s, now, attendance, summaries)
  const c = subjectColor(s.subject)
  const live = w.state === "live"
  return (
    <button
      draggable={canMove(s)}
      onDragStart={(e) => { e.dataTransfer.setData("text/session", s.id); e.dataTransfer.effectAllowed = "move" }}
      onClick={(e) => { e.stopPropagation(); onOpen(s.id) }}
      className={cn(
        "relative h-full w-full overflow-hidden rounded-md border px-1.5 py-1 pl-2.5 text-left text-xs shadow-sm transition hover:shadow-md",
        live ? c.strong : c.soft,
        w.state === "done" && "opacity-60 saturate-50",
        w.state === "needs_attendance" && "ring-2 ring-red-500",
        w.state === "needs_summary" && "ring-2 ring-amber-400",
        s.cancelled && "line-through opacity-50 grayscale",
        conflict && "outline-2 outline-red-600 outline-dashed",
        dim?.(s) && "opacity-25",
      )}
      title={`${name} · ${s.start}–${endTime(s.start, s.minutes)} · ${t.label} · ${L.room(s.roomId)}`}
    >
      {!live && <span className={cn("absolute inset-y-0 left-0 w-1", c.bar)} />}
      <div className={cn("flex items-center gap-1 font-semibold", !live && c.text)}>
        {conflict && <AlertTriangleIcon className="size-3 shrink-0 text-red-600" />}
        <span className="truncate">{name}</span>
        {/* owner 2026-10-15: the same icons as the teacher board — state top-right, room / students as icons */}
        {w.state !== "scheduled" && <WorkIcon w={w} students={s.studentIds.length} className={cn("ml-auto", live && "[&_svg]:text-white")} />}
      </div>
      <div className={cn("flex items-center gap-1.5 truncate", live ? "text-white/80" : "text-muted-foreground")}><span className="tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span><StudentsMeta n={s.studentIds.length} /></div>
      <GradeChips className="mt-0.5" size="xs" max={compact ? 2 : 4} grades={s.studentIds.map((sid) => L.student(sid)?.grade ?? "")} planned={classes.find((c) => c.id === s.classId)?.grades} />
      {!compact && (
        <>
          <div className={cn("flex min-w-0 items-center gap-1.5", live ? "text-white/80" : "text-muted-foreground")}>
            <span className={cn("truncate", t.missing && !live && "font-medium text-amber-700")}>{t.label}</span><RoomMeta roomId={s.roomId} />
          </div>
        </>
      )}
    </button>
  )
}

/** Assign overlapping sessions to side-by-side columns. */
function layout(list: Session[]) {
  const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start))
  const cols: Session[][] = []
  const pos = new Map<string, { col: number; cols: number }>()
  let group: Session[] = [], groupEnd = -1
  const flush = () => {
    const n = Math.max(1, ...group.map((s) => pos.get(s.id)!.col + 1))
    group.forEach((s) => (pos.get(s.id)!.cols = n))
    group = []
    cols.length = 0
  }
  for (const s of sorted) {
    const st = toMinutes(s.start)
    if (st >= groupEnd && group.length) flush()
    let c = cols.findIndex((col) => toMinutes(col[col.length - 1].start) + col[col.length - 1].minutes <= st)
    if (c === -1) { cols.push([s]); c = cols.length - 1 } else cols[c].push(s)
    pos.set(s.id, { col: c, cols: 1 })
    group.push(s)
    groupEnd = Math.max(groupEnd, st + s.minutes)
  }
  if (group.length) flush()
  return pos
}

function TimeGutter() {
  const HOUR_PX = useContext(HourPx)
  return (
    <div className="relative w-12 shrink-0" style={{ height: ((DAY_END - DAY_START) / 60) * HOUR_PX }}>
      {Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => (
        <div key={i} className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground tabular-nums" style={{ top: i * HOUR_PX }}>
          {i === 0 ? "" : fromMinutes(DAY_START + i * 60)}
        </div>
      ))}
    </div>
  )
}

function Column({ date, sessions, ctx, onSlot, maxCols = 3, onMore }: { date: DateStr; sessions: Session[]; ctx: CardCtx; onSlot?: (start: string) => void; maxCols?: number; onMore?: () => void }) {
  const [over, setOver] = useState(false)
  const branch = useBranch()
  const holidays = useStore((s) => s.holidays)
  const hours = branch.hours[weekdayOf(date)]
  const holiday = isHoliday(date, branch.id, holidays)
  const pos = layout(sessions)
  const HOUR_PX = useContext(HourPx)
  const height = ((DAY_END - DAY_START) / 60) * HOUR_PX
  const past = date < toDateStr(ctx.now)
  return (
    <div
      className={cn("relative flex-1 border-l", (!hours || holiday) && "bg-[repeating-linear-gradient(45deg,transparent,transparent_6px,var(--muted)_6px,var(--muted)_12px)]", over && "bg-primary/10")}
      style={{ height }}
      onDragOver={(e) => {
        if (!hours || holiday || !e.dataTransfer.types.includes("text/session")) return
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false)
        const id = e.dataTransfer.getData("text/session")
        if (!id) return
        const y = e.clientY - e.currentTarget.getBoundingClientRect().top
        ctx.onMove(id, { date, start: fromMinutes(DAY_START + Math.round(y / (HOUR_PX / 4)) * 15) })
      }}
      onClick={(e) => {
        if (!onSlot || past || !hours || holiday) return
        const y = e.clientY - e.currentTarget.getBoundingClientRect().top
        const min = DAY_START + Math.floor(y / (HOUR_PX / 2)) * 30
        if (date === toDateStr(ctx.now) && min < ctx.now.getHours() * 60 + ctx.now.getMinutes()) return
        onSlot(fromMinutes(min))
      }}
    >
      {Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => <div key={i} className="absolute inset-x-0 border-t border-dashed border-border/70" style={{ top: i * HOUR_PX }} />)}
      {hours && !holiday && (
        <>
          <div className="absolute inset-x-0 top-0 bg-muted/60" style={{ height: ((toMinutes(hours.open) - DAY_START) / 60) * HOUR_PX }} />
          <div className="absolute inset-x-0 bottom-0 bg-muted/60" style={{ top: ((toMinutes(hours.close) - DAY_START) / 60) * HOUR_PX }} />
        </>
      )}
      {holiday && <div className="absolute inset-x-1 top-1 rounded bg-amber-100 px-1 text-[11px] text-amber-900">{holiday.name}</div>}
      {sessions.map((s) => {
        const p = pos.get(s.id)!
        const top = ((toMinutes(s.start) - DAY_START) / 60) * HOUR_PX
        const h = (s.minutes / 60) * HOUR_PX
        if (p.col >= maxCols) {
          if (p.col === maxCols)
            return (
              <button key={s.id} onClick={(e) => { e.stopPropagation(); onMore?.() }} className="absolute right-0.5 z-10 rounded bg-red-600 px-1 text-[10px] font-semibold text-white" style={{ top }}>
                +{p.cols - maxCols}
              </button>
            )
          return null
        }
        const cols = Math.min(p.cols, maxCols)
        return (
          <div key={s.id} className="absolute p-0.5" style={{ top, height: h, left: `${(p.col / cols) * 100}%`, width: `${100 / cols}%` }}>
            <SessionCard s={s} {...ctx} compact={cols > 1 || h < 50} />
          </div>
        )
      })}
      {date === toDateStr(ctx.now) && (() => {
        const m = ctx.now.getHours() * 60 + ctx.now.getMinutes()
        return m > DAY_START && m < DAY_END ? <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-primary" style={{ top: ((m - DAY_START) / 60) * HOUR_PX }} /> : null
      })()}
    </div>
  )
}

function WeekView({ from, sessions, onDay, today, ...ctx }: CardCtx & { from: DateStr; sessions: Session[]; onDay: (d: DateStr) => void; today: DateStr }) {
  // owner 2026-10-12: hide the days with no classes — fewer, wider columns
  const [hideEmpty, setHideEmpty] = useQueryState<string>("hideEmpty", "")
  const all = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const busy = all.filter((d) => sessions.some((s) => s.date === d && !s.cancelled))
  const days = hideEmpty && busy.length ? busy : all
  const [box, fill] = useFillHeight<HTMLDivElement>()
  // header row ≈ 33 px + 8 px top padding; hours never shrink below the normal size
  const hourPx = fill ? Math.max(HOUR_PX, (fill - 41) / ((DAY_END - DAY_START) / 60)) : HOUR_PX
  return (
    <HourPx.Provider value={hourPx}>
    <div ref={box} className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="flex min-w-[760px] border-b text-xs">
        <div className="grid w-12 shrink-0 place-items-center">
          <Tooltip>
            <TooltipTrigger render={<button type="button" aria-pressed={!!hideEmpty} aria-label={hideEmpty ? "แสดงทุกวัน" : "ซ่อนวันที่ไม่มีคลาส"} onClick={() => setHideEmpty(hideEmpty ? "" : "1")}
              className={cn("grid size-7 place-items-center rounded-full hover:bg-muted", hideEmpty ? "bg-primary/10 text-primary" : "text-muted-foreground")} />}>
              <ListCollapseIcon className="size-4" />
            </TooltipTrigger>
            <TooltipContent>{hideEmpty ? `แสดงทุกวัน (ซ่อนอยู่ ${7 - days.length} วัน)` : "ซ่อนวันที่ไม่มีคลาส"}</TooltipContent>
          </Tooltip>
        </div>
        {days.map((d) => (
          <button key={d} onClick={() => onDay(d)} className={cn("flex-1 border-l py-2 text-center hover:bg-muted", d === today && "font-semibold text-primary")}>
            {dayShort(weekdayOf(d))} {parseDate(d).getDate()}
            <span className="ml-1 text-muted-foreground">({sessions.filter((s) => s.date === d && !s.cancelled).length})</span>
          </button>
        ))}
      </div>
      <div className="flex min-w-[760px] pt-2">
        <TimeGutter />
        {days.map((d) => <Column key={d} date={d} sessions={sessions.filter((s) => s.date === d)} ctx={ctx} maxCols={2} onMore={() => onDay(d)} />)}
      </div>
    </div>
    </HourPx.Provider>
  )
}

function MonthView({ from, month, sessions, onDay, today, conflictIds }: { from: DateStr; month: string; sessions: Session[]; onDay: (d: DateStr) => void; today: DateStr; conflictIds: Set<string> }) {
  const branch = useBranch()
  const holidays = useStore((s) => s.holidays)
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i))
  // owner 2026-10-15: the month fills the screen — six equal rows, no empty space underneath
  const [box, fill] = useFillHeight<HTMLDivElement>()
  return (
    <div ref={box} className="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5" style={fill ? { minHeight: fill } : undefined}>
      <div className="grid grid-cols-7 border-b text-center text-xs text-muted-foreground">
        {[1, 2, 3, 4, 5, 6, 0].map((w) => <div key={w} className="py-2">{dayShort(w as 0)}</div>)}
      </div>
      <div className="grid flex-1 auto-rows-fr grid-cols-7">
        {days.map((d) => {
          const list = sessions.filter((s) => s.date === d && !s.cancelled).sort((a, b) => a.start.localeCompare(b.start))
          const hol = isHoliday(d, branch.id, holidays)
          const conflict = list.some((s) => conflictIds.has(s.id))
          return (
            <button key={d} onClick={() => onDay(d)} className={cn("flex min-h-24 flex-col justify-start border-t border-l p-1.5 text-left hover:bg-muted/60", d.slice(0, 7) !== month && "bg-muted/30 text-muted-foreground", hol && "bg-amber-50 dark:bg-amber-950/30")}>
              <div className="flex items-center gap-1 text-xs">
                <span className={cn("grid size-5 place-items-center rounded-full", d === today && "bg-primary text-primary-foreground")}>{parseDate(d).getDate()}</span>
                {conflict && <span className="size-2 rounded-full bg-red-500" title="มีคาบชนกัน" />}
                {hol && <span className="truncate text-[10px] text-amber-800">{hol.name}</span>}
              </div>
              <div className="mt-1 space-y-0.5">
                {list.slice(0, 3).map((s) => (
                  <div key={s.id} className={cn("truncate rounded bg-sky-50 px-1 text-[11px] dark:bg-sky-950/40", !s.teacherId && "bg-amber-100 dark:bg-amber-950/40")}>{s.start} {s.subject}</div>
                ))}
                {list.length > 3 && <div className="text-[11px] text-muted-foreground">+{list.length - 3} คาบ</div>}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ListView({ from, to, sessions, ...ctx }: CardCtx & { from: DateStr; to: DateStr; sessions: Session[] }) {
  const L = useLookup()
  const attendance = useStore((st) => st.attendance)
  const summaries = useStore((st) => st.summaries)
  const dates: DateStr[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) if (sessions.some((s) => s.date === d)) dates.push(d)
  if (!dates.length) return <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">ไม่มีคาบเรียนในช่วงนี้</p>
  // owner 2026-10-15: one table — the same columns for every day, a day line between them, status on the right
  const COLS = "grid grid-cols-[7rem_minmax(0,1fr)_8rem_5rem_4rem_4rem] items-center gap-3 px-4"
  return (
    <div className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      <div className="min-w-[760px]">
        <div className={cn(COLS, "border-b py-2.5 text-xs font-medium text-muted-foreground")}>
          <span>เวลา</span><span>คลาส</span><span>ครู</span><span>ห้อง</span><span className="text-right">นักเรียน</span><span className="text-right">สถานะ</span>
        </div>
        {dates.map((d) => (
          <div key={d}>
            <div className="border-b bg-muted/40 px-4 py-1.5 text-xs font-semibold">{fmtDate(d, { weekday: true, year: true })}</div>
            {sessions.filter((s) => s.date === d).sort((a, b) => a.start.localeCompare(b.start)).map((s) => {
              const t = L.teacher(s.teacherId)
              const kind = sessionKindLabel(s)
              return (
                <button key={s.id} type="button" onClick={() => ctx.onOpen(s.id)}
                  data-focus={[ctx.conflictIds.has(s.id) && "conflict", t.missing && "no_teacher", s.teacherLeave && "teacher_leave"].filter(Boolean).join(" ") || undefined}
                  className={cn(COLS, "w-full border-b py-2 text-left text-sm last:border-b-0 hover:bg-muted/50")}>
                  <span className="tabular-nums text-muted-foreground">{s.start}–{endTime(s.start, s.minutes)}</span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("size-2 shrink-0 rounded-full", subjectColor(s.subject).bar)} />
                    <span className="truncate font-medium">{ctx.classes.find((c) => c.id === s.classId)?.name ?? s.subject}</span>
                    {kind && <Pill tone="violet" className="shrink-0">{kind}</Pill>}
                    {ctx.conflictIds.has(s.id) && <Pill tone="red" className="shrink-0">ชนกัน</Pill>}
                  </span>
                  <span className={cn("truncate", t.missing && "text-amber-700")}>{t.label}</span>
                  <RoomMeta roomId={s.roomId} className="text-muted-foreground" />
                  <StudentsMeta n={s.studentIds.length} className="justify-end text-muted-foreground" />
                  <span className="flex justify-end"><WorkIcon w={workState(s, ctx.now, attendance, summaries)} students={s.studentIds.length} className="[&_svg]:size-4" /></span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
