"use client"

// owner 2026-10-15: a teacher's workload as one status icon — Manager and up only (not Admin / Teacher)
import { CircleCheckIcon, FlameIcon, TriangleAlertIcon } from "lucide-react"
import { busiestDay, workloadOf, type Workload } from "@/domain/rules/staff-overview"
import type { Session } from "@/domain/types"
import { cn } from "@/lib/utils"

export const WORKLOAD: Record<Workload, { label: string; icon: typeof FlameIcon; className: string; meaning: string }> = {
  none: { label: "ยังไม่มีคาบ", icon: CircleCheckIcon, className: "text-muted-foreground/40", meaning: "สัปดาห์นี้ยังไม่มีคาบสอน" },
  healthy: { label: "Healthy", icon: CircleCheckIcon, className: "text-emerald-600", meaning: "วันที่สอนมากสุด 1–2 คาบ" },
  warning: { label: "Warning", icon: TriangleAlertIcon, className: "text-amber-500", meaning: "วันที่สอนมากสุด 3–4 คาบ" },
  load: { label: "Load!", icon: FlameIcon, className: "text-red-600", meaning: "วันที่สอนมากสุด 5 คาบขึ้นไป" },
}

export function WorkloadIcon({ sessions }: { sessions: Pick<Session, "date">[] }) {
  const k = workloadOf(sessions), w = WORKLOAD[k]
  return (
    <span title={k === "none" ? w.label : `${w.label} · วันที่สอนมากสุด ${busiestDay(sessions)} คาบ`} className="inline-flex justify-end">
      <w.icon className={cn("size-4", w.className)} aria-label={w.label} />
    </span>
  )
}

/** what each status means — for an ⓘ next to "Workload" */
export function WorkloadInfo() {
  return (
    <div className="space-y-1.5 text-xs">
      <p>นับจากวันที่ครูสอนมากที่สุดในสัปดาห์นี้ (จ.–อา.)</p>
      {(["healthy", "warning", "load"] as const).map((k) => {
        const w = WORKLOAD[k]
        return <p key={k} className="flex items-center gap-1.5"><w.icon className={cn("size-3.5 shrink-0", w.className)} /><span className="font-medium">{w.label}</span><span className="opacity-80">— {w.meaning}</span></p>
      })}
    </div>
  )
}
