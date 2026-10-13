import { MarsIcon, VenusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SessionState } from "@/domain/rules/scheduling"
import { STATE_LABEL } from "@/domain/rules/scheduling"
import { tx } from "@/lib/i18n"
import { ROLE_LABEL } from "@/domain/rules/permissions"

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
      {tx(STATE_LABEL[state])}
    </Pill>
  )
}

/** owner 2026-10-12: student gender as a small icon next to the name (names carry no ด.ช. / ด.ญ.) */
export function GenderIcon({ gender, className }: { gender?: "male" | "female"; className?: string }) {
  if (!gender) return null
  const Icon = gender === "male" ? MarsIcon : VenusIcon
  return <Icon role="img" aria-label={gender === "male" ? "ชาย" : "หญิง"} className={cn("size-3.5 shrink-0", gender === "male" ? "text-sky-600" : "text-pink-500", className)}><title>{gender === "male" ? "ชาย" : "หญิง"}</title></Icon>
}

/** owner 2026-10-12: one colour per role, so a person with several roles reads at a glance */
export const ROLE_TONE: Record<"super_admin" | "director" | "area_manager" | "manager" | "admin" | "teacher" | "developer", string> = {
  super_admin: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
  director: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200",
  area_manager: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  manager: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  admin: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  teacher: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  developer: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200",
}

/** a role as its coloured chip — the same colours as the staff page (owner 2026-10-13: "Roles เรามี Chip") */
export function RoleChip({ role, className }: { role: keyof typeof ROLE_TONE; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", ROLE_TONE[role], className)}>{ROLE_LABEL[role]}</span>
}
