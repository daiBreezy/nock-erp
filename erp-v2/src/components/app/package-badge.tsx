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

/** header ⓘ for every Package column (owner 2026-10-12): the badge legend — cells show only the badge */
export const PACKAGE_LEGEND = (
  <div className="space-y-1">
    <div className="font-medium">ประเภทแพ็กเกจ</div>
    {(["hour", "week", "month"] as const).map((u) => (
      <div key={u} className="flex items-center gap-1.5">
        <span className={cn("grid size-4 place-items-center rounded-full text-[10px] font-extrabold text-white", STYLE[u].bg)}>{STYLE[u].letter}</span>
        {u === "hour" ? "รายชั่วโมง — ตัวเลข = จำนวนชั่วโมง" : u === "week" ? "รายสัปดาห์ — ตัวเลข = จำนวนสัปดาห์" : "รายเดือน"}
      </div>
    ))}
    <div className="opacity-70">สีจาง = แพ็กเกจหมดแล้ว</div>
  </div>
)
