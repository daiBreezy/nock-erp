import { cn } from "@/lib/utils"
import type { SessionState } from "@/domain/rules/scheduling"
import { STATE_LABEL } from "@/domain/rules/scheduling"

// One colour language for statuses across the whole app (UX rule #4).
export const TONE = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  red: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
} as const
export type Tone = keyof typeof TONE

export function Pill({ tone = "gray", children, className, title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[tone], className)}>{children}</span>
}

const STATE_TONE: Record<SessionState, Tone> = { upcoming: "blue", live: "green", ended: "gray", closed: "gray", cancelled: "red" }

export function SessionStateBadge({ state }: { state: SessionState }) {
  return (
    <Pill tone={STATE_TONE[state]}>
      {state === "live" && <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />}
      {STATE_LABEL[state]}
    </Pill>
  )
}
