"use client"

// One session row for every day-by-day list (owner 2026-10-13): Sessions, Attendance and Summaries had each drawn
// their own row, so the colour bar and the end time existed on one page only. Subject colour bar · start–end ·
// title + sub line (+ anything under it) · optional quick actions · status last. The whole row opens the panel.
import { endTime } from "@/domain/dates"
import type { Session } from "@/domain/types"
import { cn } from "@/lib/utils"
import { subjectColor } from "./subject-color"

export function SessionLine({ s, title, sub, children, actions, status, onOpen, focus, className }: {
  s: Pick<Session, "subject" | "start" | "minutes">
  title: React.ReactNode
  sub?: React.ReactNode
  /** extra lines under the sub line (e.g. the summary text) */
  children?: React.ReactNode
  /** quick actions (approve / send) — they don't open the panel */
  actions?: React.ReactNode
  /** always the last thing on the row */
  status?: React.ReactNode
  onOpen: () => void
  focus?: string
  className?: string
}) {
  return (
    <div role="button" tabIndex={0} data-focus={focus} onClick={onOpen} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen() } }}
      className={cn("flex w-full cursor-pointer flex-wrap items-center gap-3 px-3 py-2.5 text-left outline-none hover:bg-muted/40 focus-visible:bg-muted/40", className)}>
      <span className={cn("w-1 self-stretch rounded-full", subjectColor(s.subject).bar)} />
      <span className="w-24 text-sm tabular-nums">{s.start}–{endTime(s.start, s.minutes)}</span>
      <span className="min-w-40 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        {sub && <span className="block text-xs text-muted-foreground">{sub}</span>}
        {children}
      </span>
      {actions && <span className="flex flex-wrap items-center gap-1.5" onClick={(e) => e.stopPropagation()}>{actions}</span>}
      {status && <span className="flex shrink-0 justify-end">{status}</span>}
    </div>
  )
}
