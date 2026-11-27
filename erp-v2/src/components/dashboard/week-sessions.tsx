"use client"

// Dashboard Week mode (owner 2026-11-10): the "คาบ" box becomes a 7-day board so the whole week is visible at once —
// each day a thin column with its session count and subject-coloured bars; today is highlighted, empty days keep their
// slot (never collapse). Click a day → the calendar on that date.
import Link from "next/link"
import { CalendarIcon } from "lucide-react"
import { sessionState } from "@/domain/rules/scheduling"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DashCard } from "./box"
import { addDays, fmtDate } from "@/domain/dates"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { Session } from "@/domain/types"

export function WeekSessions({ sessions, weekStart, today, now }: { sessions: Session[]; weekStart: string; today: string; now: Date }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const total = sessions.length
  const over = sessions.filter((s) => ["ended", "closed"].includes(sessionState(s, now))).length
  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold"><CalendarIcon className="size-4 text-muted-foreground" /> {tx("คาบสัปดาห์นี้")}</CardTitle>
          <span className="text-xs tabular-nums text-muted-foreground">{tx("สัปดาห์นี้ {0}/{1} คาบ", [over, total])}</span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((date) => {
            const of = sessions.filter((s) => s.date === date).sort((a, b) => a.start.localeCompare(b.start))
            const isToday = date === today
            return (
              <Link key={date} href={`/calendar?view=day&date=${date}`}
                className={cn("flex min-h-28 flex-col rounded-xl p-2 transition-colors hover:ring-2 hover:ring-primary/30",
                  isToday ? "bg-today-soft" : "bg-muted/40")}>
                <div className={cn("mb-1.5 text-center text-2xs font-medium", isToday ? "text-danger" : "text-muted-foreground")}>
                  {fmtDate(date, { weekday: true })}{isToday && ` · ${tx("วันนี้")}`}
                </div>
                {of.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-2xs text-muted-foreground">—</div>
                ) : (
                  <>
                    <div className="flex flex-1 flex-col gap-1">
                      {of.slice(0, 6).map((s) => <span key={s.id} className="h-1.5 rounded-full bg-primary/30" title={`${s.start} ${s.subject}`} />)}
                    </div>
                    <div className={cn("mt-1.5 text-center text-base font-semibold tabular-nums", isToday ? "text-danger" : "text-foreground")}>{of.length}</div>
                  </>
                )}
              </Link>
            )
          })}
        </div>
      </CardContent>
    </DashCard>
  )
}
