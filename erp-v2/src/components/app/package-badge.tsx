import { packageLabel } from "@/domain/rules/course"
import type { Course, PriceUnit } from "@/domain/types"
import { cn } from "@/lib/utils"

// Design "Package Type Status": coloured circle = package type, number = package size bought
// (H 24 = 24-hour pack · W 4 = 4-week pack · M 1 = one month).
const STYLE: Record<PriceUnit, { letter: string; bg: string }> = {
  hour: { letter: "H", bg: "bg-[#D9A13A]" },
  week: { letter: "W", bg: "bg-[#EC6BA0]" },
  month: { letter: "M", bg: "bg-[#58B6B4]" },
}

export function PackageBadge({ course, size = "sm", className }: { course: Pick<Course, "unit" | "duration">; size?: "sm" | "md"; className?: string }) {
  const s = STYLE[course.unit]
  return (
    <span title={`แพ็กเกจ ${packageLabel(course)}`} className={cn("inline-flex shrink-0 items-center gap-1 whitespace-nowrap", className)}>
      <span className={cn("grid place-items-center rounded-full font-extrabold text-white", s.bg, size === "sm" ? "size-5 text-[11px]" : "size-7 text-sm")}>{s.letter}</span>
      <span className={cn("text-muted-foreground tabular-nums", size === "sm" ? "text-sm" : "text-base")}>{course.duration}</span>
    </span>
  )
}
