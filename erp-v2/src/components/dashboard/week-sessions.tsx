"use client"

// Dashboard Week mode (owner 2026-11-10): the "คาบ" box becomes a 7-day board so the whole week is visible at once —
// each day a thin column with its session count and subject-coloured bars; today is highlighted, empty days keep their
// slot (never collapse). Click a day → the calendar on that date.
import Link from "next/link"
import { CalendarIcon } from "lucide-react"
import { subjectColor } from "@/components/app/subject-color"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DashCard } from "./box"
import { addDays, fmtDate } from "@/domain/dates"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import type { Session } from "@/domain/types"

export function WeekSessions({ sessions, weekStart, today, markedCount }: { sessions: Session[]; weekStart: string; today: string; markedCount: number }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const total = sessions.length
  return (
    <DashCard className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold"><CalendarIcon className="size-4 text-muted-foreground" /> {tx("คาบสัปดาห์นี้")}</CardTitle>
        <CardDescription>{total} {tx("คาบ")} · {tx("เช็คแล้ว {0}", [markedCount])}</CardDescription>
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
                      {of.slice(0, 6).map((s) => <span key={s.id} className={cn("h-1.5 rounded-full", subjectColor(s.subject).bar)} title={`${s.start} ${s.subject}`} />)}
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
