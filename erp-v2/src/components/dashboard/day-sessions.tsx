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
import { Button } from "@/components/ui/button"

export function DaySessions({ todays, now, attendance, mineOnly, onOpen }: {
  todays: Session[]; now: Date; attendance: Attendance[]; mineOnly: boolean
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold"><CalendarIcon className="size-4 text-muted-foreground" /> {mineOnly ? tx("คาบของฉันวันนี้") : tx("คาบเรียนวันนี้")}</CardTitle>
          {/* owner 2026-11-25: the status chips sit at the right of the header, on its line */}
          {todays.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {live.length > 0 && <Stat tone="bg-danger-soft text-danger-ink" label={tx("กำลังเรียน")} n={live.length} />}
              {upcoming.length > 0 && <Stat tone="bg-muted text-muted-foreground" label={tx("รอเริ่ม")} n={upcoming.length} />}
              {past.length > 0 && <Stat tone="bg-success-soft text-success-ink" label={tx("จบแล้ว")} n={past.length} />}
            </div>
          )}
        </div>
        <CardDescription>{todays.length} {tx("คาบ")} · {tx("สถานะเปลี่ยนตามเวลาจริงอัตโนมัติ")}</CardDescription>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tx("วันนี้ไม่มีคาบเรียน")}</p>}
        {/* owner 2026-11-25: cards that flow in from the side — a day's sessions scroll sideways (live first, then not-yet-started; the ended ones open at the end) */}
        <div className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {open.map((s) => <SessionCard key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => onOpen(s.id)} />)}
          {showPast && past.map((s) => <SessionCard key={s.id} s={s} now={now} L={L} attendance={attendance} onOpen={() => onOpen(s.id)} muted />)}
        </div>
        {past.length > 0 && (
          <Button variant="ghost" size="inline" onClick={() => setShowPast((v) => !v)} className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:bg-muted/40">
            <ChevronRightIcon className={cn("size-3.5 transition-transform", showPast && "rotate-90")} /> {showPast ? tx("ซ่อนที่จบแล้ว") : <>{tx("จบแล้ว")} {past.length} {tx("คาบ")}</>}
          </Button>
        )}
      </CardContent>
    </DashCard>
  )
}

function Stat({ label, n, tone }: { label: string; n: number; tone: string }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium tabular-nums", tone)}>{label} {n}</span>
}

/** a session as a card — subject-colour accent on top, time + state, subject, who / where / check-ins (owner 2026-11-25) */
function SessionCard({ s, now, L, attendance, onOpen, muted }: { s: Session; now: Date; L: ReturnType<typeof useLookup>; attendance: Attendance[]; onOpen: () => void; muted?: boolean }) {
  const st = sessionState(s, now)
  const marked = attendance.filter((a) => a.sessionId === s.id).length
  const t = L.teacher(s.teacherId)
  return (
    <Button variant="row" size="inline" onClick={onOpen} className={cn("flex w-60 shrink-0 snap-start flex-col items-stretch gap-1.5 overflow-hidden rounded-2xl bg-muted/40 p-3 text-left hover:bg-muted/70", muted && "opacity-60")}>
      <span className={cn("h-1 w-10 rounded-full", subjectColor(s.subject).bar)} />
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1 text-xs tabular-nums text-muted-foreground"><span className="text-sm font-semibold text-foreground">{s.start}</span>–{endTime(s.start, s.minutes)}</div>
        {st === "live" ? <SessionStateBadge state={st} /> : <span className="shrink-0 text-xs text-muted-foreground">{tx(STATE_LABEL[st])}</span>}
      </div>
      <div className="truncate text-sm font-medium">{sj(s.subject)}<KindChip s={s} className="ml-2" /></div>
      <div className="truncate text-xs text-muted-foreground"><span className={cn(t.missing && "text-warning")}>{nm(t.label)}</span> · {nm(L.room(s.roomId))}</div>
      <div className="text-xs text-muted-foreground">{tx("เช็คชื่อแล้ว")} {marked}/{s.studentIds.length}</div>
    </Button>
  )
}
