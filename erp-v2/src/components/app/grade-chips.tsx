import { gradeMix } from "@/domain/rules/settings"
import { cn } from "@/lib/utils"
import { gradeTone } from "./subject-color"

/**
 * Which grades sit in a session: "ป.4 ×2 · ป.5" — from the students actually booked, or (dashed) the class's
 * grades while nobody is booked yet. `max` keeps calendar cards short: the rest collapse into "+n".
 */
export function GradeChips({ grades, planned = [], max = 4, size = "sm", className }: { grades: string[]; planned?: string[]; max?: number; size?: "xs" | "sm"; className?: string }) {
  const mix = grades.length ? gradeMix(grades) : gradeMix(planned).map((g) => ({ ...g, count: 0 }))
  if (!mix.length) return null
  const shown = mix.slice(0, max)
  const text = size === "xs" ? "text-[10px] px-1" : "text-[11px] px-1.5"
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-1", className)} title={mix.map((g) => `${g.grade}${g.count ? ` ${g.count} คน` : ""}`).join(" · ")}>
      {shown.map((g) => (
        <span key={g.grade} className={cn("rounded-full py-px font-semibold whitespace-nowrap", text, grades.length ? gradeTone(g.grade) : "border border-dashed border-current opacity-70")}>
          {g.grade}{g.count > 1 && <span className="font-normal opacity-80"> ×{g.count}</span>}
        </span>
      ))}
      {mix.length > max && <span className={cn("rounded-full bg-muted py-px font-semibold text-muted-foreground", text)}>+{mix.length - max}</span>}
    </span>
  )
}
