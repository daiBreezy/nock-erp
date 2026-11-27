"use client"

// Dashboard "คาบวันนี้" box (owner 2026-11-10: "ถ้าวันนึงมี 20 คาบจะแสดงยังไง"). Answer: a fixed-height box that never
// grows with the day — a one-line status summary up top (so you grasp the whole day at a glance), then the live /
// upcoming sessions in a capped, scrollable list, with the finished ones folded under a toggle. The box stays the
// same height whether the day has 3 sessions or 30.
import { useEffect, useRef, useState } from "react"
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { RoomLine, SessionBlock } from "@/components/calendar/week-teacher-board"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashCard } from "./box"
import { sessionState, workState } from "@/domain/rules/scheduling"
import type { Attendance, Session } from "@/domain/types"
import { tx, nm } from "@/lib/i18n"
import { useLookup } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export function DaySessions({ todays, now, attendance, mineOnly, onOpen }: {
  todays: Session[]; now: Date; attendance: Attendance[]; mineOnly: boolean
  onOpen: (id: string) => void
}) {
  const ended = (s: Session) => ["ended", "closed"].includes(sessionState(s, now))
  const live = todays.filter((s) => sessionState(s, now) === "live")
  const past = todays.filter(ended)
  // owner 2026-11-25: the whole day left → right in time order; the current card (live, else the next one, else the last that ended) is brought to the LEFT edge as far as the
  // row can scroll — the ones already over sit off the left: scroll or tap the arrows to look back. A day whose cards all fit shows them all (no blank space, nothing to scroll).
  const ordered = [...todays].sort((a, b) => a.start.localeCompare(b.start))
  const current = live[0] ?? ordered.find((s) => sessionState(s, now) === "upcoming") ?? ordered.at(-1)
  const strip = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })
  const measure = () => { const el = strip.current; if (el) setEdge({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 }) }
  useEffect(() => {
    const el = strip.current, card = current && el?.querySelector<HTMLElement>(`[data-session="${current.id}"]`)
    if (el && card) el.scrollTo({ left: card.offsetLeft - el.offsetLeft - 4 })
    measure()
  }, [current?.id, ordered.length])
  const step = (dir: -1 | 1) => strip.current?.scrollBy({ left: dir * 248, behavior: "smooth" })

  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold"><CalendarIcon className="size-4 text-muted-foreground" /> {mineOnly ? tx("คาบของฉันวันนี้") : tx("คาบเรียนวันนี้")}</CardTitle>
          {/* owner 2026-11-27: ONE plain count instead of status chips — how many of today's classes are over; the cards carry the state */}
          {todays.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs tabular-nums text-muted-foreground">{tx("วันนี้ {0}/{1} คาบ", [past.length, todays.length])}</span>
              <Button size="icon-xs" variant="ghost" aria-label={tx("ก่อนหน้า")} disabled={!edge.left} onClick={() => step(-1)}><ChevronLeftIcon /></Button>
              <Button size="icon-xs" variant="ghost" aria-label={tx("ถัดไป")} disabled={!edge.right} onClick={() => step(1)}><ChevronRightIcon /></Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tx("วันนี้ไม่มีคาบเรียน")}</p>}
        <div ref={strip} onScroll={measure} className="no-scrollbar relative -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ordered.map((s) => <SessionCard key={s.id} s={s} now={now} attendance={attendance} onOpen={() => onOpen(s.id)} />)}
        </div>
      </CardContent>
    </DashCard>
  )
}

/**
 * a session card (owner 2026-11-27): THE Calendar's own session block (`SessionBlock` — subject · state icon · time · room · count), just without the student
 * list. Same grey for every card; the OUTLINE's strength is the state: coming up = light · running = strong · over = faint (+ faded). The ring is drawn
 * inset so the scroll strip never clips it.
 */
function SessionCard({ s, now, attendance, onOpen }: { s: Session; now: Date; attendance: Attendance[]; onOpen: () => void }) {
  const summaries = useStore((st) => st.summaries)
  const classes = useStore((st) => st.classes)
  const klass = classes.find((k) => k.id === s.classId)
  const L = useLookup()
  const w = workState(s, now, attendance, summaries)
  const st = sessionState(s, now)
  const over = ["ended", "closed"].includes(st)
  return (
    <div data-session={s.id} role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen() } }}
      className={cn("min-w-64 flex-1 shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl bg-card ring-inset transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/40",
      st === "live" ? "ring-2 ring-foreground/70" : over ? "opacity-60 ring-1 ring-foreground/10" : "ring-1 ring-foreground/25")}>
      <SessionBlock compact s={s} state={w.state} ended={over} dayDate={(d) => d} canEdit={false} onOpen={onOpen} klass={klass} attendance={attendance} allSessions={[]}
        canDrag={false} onDropStudent={() => undefined}
        room={<RoomLine sessions={[s]} classes={klass ? [klass] : []} clash={[]} inCell noCoTeacher />} />
      {/* who teaches it (check-in is automatic now — everyone counts as present — so no check-in count here) */}
      <div className="border-t px-3 py-1.5 text-xs text-muted-foreground"><span className="block truncate">{[s.teacherId, ...s.coTeacherIds].map((id) => nm(L.teacher(id).label)).join(" · ")}</span></div>
    </div>
  )
}
