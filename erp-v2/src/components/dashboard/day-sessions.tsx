"use client"

// Dashboard "คาบวันนี้" box (owner 2026-11-10: "ถ้าวันนึงมี 20 คาบจะแสดงยังไง"). Answer: a fixed-height box that never
// grows with the day — a one-line status summary up top (so you grasp the whole day at a glance), then the live /
// upcoming sessions in a capped, scrollable list, with the finished ones folded under a toggle. The box stays the
// same height whether the day has 3 sessions or 30.
import { useState } from "react"
import { CalendarIcon, ChevronRightIcon } from "lucide-react"
import { subjectColor } from "@/components/app/subject-color"
import { SessionStateBadge } from "@/components/app/badges"
import { KindChip } from "@/components/calendar/session-meta"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashCard } from "./box"
import { endTime } from "@/domain/dates"
import { sessionState, STATE_LABEL } from "@/domain/rules/scheduling"
import type { Attendance, Session } from "@/domain/types"
import { useLookup } from "@/lib/hooks"
import { tx, nm, sj } from "@/lib/i18n"
import { cn } from "@/lib/utils"

export function DaySessions({ todays, now, attendance, mineOnly, progress, onOpen }: {
  todays: Session[]; now: Date; attendance: Attendance[]; mineOnly: boolean
  /** honest completion bars (attendance / summaries) for the ended sessions — shown as a thin header strip */
  progress?: { attDone: number; attTotal: number; sumDone: number; sumTotal: number }
  onOpen: (id: string) => void
}) {
  const L = useLookup()
  const [showPast, setShowPast] = useState(false)
  const ended = (s: Session) => ["ended", "closed"].includes(sessionState(s, now))
  const live = todays.filter((s) => sessionState(s, now) === "live")
  const upcoming = todays.filter((s) => sessionState(s, now) === "upcoming")
  const past = todays.filter(ended)
  const open = [...live, ...upcoming] // live first, then not-yet-started

  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold"><CalendarIcon className="size-4 text-muted-foreground" /> {mineOnly ? tx("คาบของฉันวันนี้") : tx("คาบเรียนวันนี้")}</CardTitle>
        <CardDescription>{todays.length} {tx("คาบ")} · {tx("สถานะเปลี่ยนตามเวลาจริงอัตโนมัติ")}</CardDescription>
        {/* one-line status summary — grasp the whole day even when it is long */}
        {todays.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {live.length > 0 && <Stat tone="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200" label={tx("กำลังเรียน")} n={live.length} />}
            {upcoming.length > 0 && <Stat tone="bg-muted text-muted-foreground" label={tx("รอเริ่ม")} n={upcoming.length} />}
            {past.length > 0 && <Stat tone="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" label={tx("จบแล้ว")} n={past.length} />}
          </div>
        )}
        {progress && progress.attTotal > 0 && (
          <div className="mt-2 grid gap-2.5 sm:grid-cols-2">
            <Bar label={tx("เช็คชื่อวันนี้")} done={progress.attDone} total={progress.attTotal} />
            <Bar label={tx("สรุปการเรียนวันนี้")} done={progress.sumDone} total={progress.sumTotal} />
          </div>
        )}
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tx("วันนี้ไม่มีคาบเรียน")}</p>}
        {/* capped, scrollable list — a 30-session day scrolls here instead of stretching the page */}
        <div className="max-h-80 space-y-0.5 overflow-y-auto">
          {open.map((s) => <Row key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => onOpen(s.id)} />)}
          {past.length > 0 && (
            <>
              <button onClick={() => setShowPast((v) => !v)} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
                <ChevronRightIcon className={cn("size-3.5 transition-transform", showPast && "rotate-90")} /> {tx("จบแล้ว")} {past.length} {tx("คาบ")}
              </button>
              {showPast && past.map((s) => <Row key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => onOpen(s.id)} muted />)}
            </>
          )}
        </div>
      </CardContent>
    </DashCard>
  )
}

function Stat({ label, n, tone }: { label: string; n: number; tone: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", tone)}>{label} {n}</span>
}

function Bar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const full = total > 0 && done === total
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{label}</span><span className={cn("font-semibold tabular-nums", full ? "text-emerald-600" : "text-muted-foreground")}>{done}/{total}</span></div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className={cn("h-full rounded-full transition-all", full ? "bg-emerald-500" : "bg-primary")} style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

/** a quiet agenda row — subject-colour accent, one line (owner 2026-10-06) */
function Row({ s, now, L, attendance, onOpen, muted }: { s: Session; now: Date; L: ReturnType<typeof useLookup>; attendance: Attendance[]; onOpen: () => void; muted?: boolean }) {
  const st = sessionState(s, now)
  const marked = attendance.filter((a) => a.sessionId === s.id).length
  const t = L.teacher(s.teacherId)
  return (
    <button onClick={onOpen} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted/50", muted && "opacity-60")}>
      <span className={cn("h-8 w-1 shrink-0 rounded-full", subjectColor(s.subject).bar)} />
      <div className="w-24 shrink-0 text-xs tabular-nums text-muted-foreground"><span className="text-sm font-semibold text-foreground">{s.start}</span>–{endTime(s.start, s.minutes)}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{sj(s.subject)}<KindChip s={s} className="ml-2" /></div>
        <div className="truncate text-xs text-muted-foreground"><span className={cn(t.missing && "text-amber-700")}>{nm(t.label)}</span> · {nm(L.room(s.roomId))} {tx("· เช็คชื่อแล้ว")} {marked}/{s.studentIds.length}</div>
      </div>
      {st === "live" ? <SessionStateBadge state={st} /> : <span className="shrink-0 text-xs text-muted-foreground">{tx(STATE_LABEL[st])}</span>}
    </button>
  )
}
