import { BanIcon, CalendarClockIcon, CheckCircle2Icon, ClipboardListIcon, NotebookPenIcon, RadioIcon } from "lucide-react"
import { WORK_LABEL, type WorkInfo, type WorkState } from "@/domain/rules/scheduling"
import { cn } from "@/lib/utils"

const ICON: Record<WorkState, typeof RadioIcon> = {
  scheduled: CalendarClockIcon,
  live: RadioIcon,
  needs_attendance: ClipboardListIcon,
  needs_summary: NotebookPenIcon,
  done: CheckCircle2Icon,
  cancelled: BanIcon,
}

export const WORK_CHIP: Record<WorkState, string> = {
  scheduled: "bg-white/80 text-slate-700 ring-1 ring-slate-200",
  live: "bg-white text-emerald-700",
  needs_attendance: "bg-red-600 text-white",
  needs_summary: "bg-amber-400 text-amber-950",
  done: "bg-emerald-600 text-white",
  cancelled: "bg-slate-200 text-slate-600",
}

/** Text that says the state *and* what is left to do */
export function workDetail(w: WorkInfo, students: number) {
  switch (w.state) {
    case "scheduled":
      return w.startsInMin !== undefined && w.startsInMin <= 60 ? `อีก ${w.startsInMin} นาที` : ""
    case "live":
      return `เช็คชื่อ ${w.marked}/${students}`
    case "needs_attendance":
      return `${w.marked}/${students}${w.overdue ? " · ค้าง" : ""}`
    case "needs_summary":
      return `${w.summariesDone}/${w.present}${w.overdue ? " · ค้าง" : ""}`
    default:
      return ""
  }
}

export function WorkChip({ w, students, className }: { w: WorkInfo; students: number; className?: string }) {
  const Icon = ICON[w.state]
  const detail = workDetail(w, students)
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", WORK_CHIP[w.state], className)}>
      <Icon className={cn("size-3", w.state === "live" && "animate-pulse")} />
      {WORK_LABEL[w.state]}
      {detail && <span className="font-normal opacity-90">· {detail}</span>}
    </span>
  )
}

export const WORK_ORDER: WorkState[] = ["needs_attendance", "needs_summary", "live", "scheduled", "done", "cancelled"]

export function WorkLegend({ counts, active, onToggle }: { counts: Partial<Record<WorkState, number>>; active: WorkState | null; onToggle: (s: WorkState | null) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {WORK_ORDER.map((s) => {
        const Icon = ICON[s]
        const n = counts[s] ?? 0
        return (
          <button
            key={s}
            onClick={() => onToggle(active === s ? null : s)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium transition",
              WORK_CHIP[s],
              s === "live" && "bg-emerald-600 text-white",
              active && active !== s && "opacity-40",
              active === s && "ring-2 ring-foreground/40",
              n === 0 && !active && "opacity-50",
            )}
            title="กดเพื่อไฮไลต์เฉพาะสถานะนี้"
          >
            <Icon className="size-3" /> {WORK_LABEL[s]} <b>{n}</b>
          </button>
        )
      })}
    </div>
  )
}
