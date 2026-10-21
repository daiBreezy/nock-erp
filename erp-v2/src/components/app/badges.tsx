import { MarsIcon, VenusIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SessionState } from "@/domain/rules/scheduling"
import { STATE_LABEL } from "@/domain/rules/scheduling"
import { tx } from "@/lib/i18n"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import { HUE, TAG_HUE } from "./tags"

// One colour language for statuses across the whole app (UX rule #4) — the hues live in ./tags (owner 2026-10-21).
export const TONE = {
  gray: HUE.gray.chip,
  blue: HUE.sky.chip,
  green: HUE.emerald.chip,
  amber: HUE.amber.chip,
  red: HUE.red.chip,
  violet: HUE.violet.chip,
} as const
export type Tone = keyof typeof TONE

export function Pill({ tone = "gray", children, className, title }: { tone?: Tone; children: React.ReactNode; className?: string; title?: string }) {
  return <span title={title} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[tone], className)}>{children}</span>
}

const TONE_OF_HUE: Partial<Record<keyof typeof HUE, Tone>> = { gray: "gray", sky: "blue", emerald: "green", amber: "amber", red: "red", violet: "violet" }
const STATE_TONE = Object.fromEntries(Object.entries(TAG_HUE.sessionState).map(([k, h]) => [k, TONE_OF_HUE[h] ?? "gray"])) as Record<SessionState, Tone>

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

/** owner 2026-10-12: one colour per role, so a person with several roles reads at a glance (hues in ./tags; the
 *  Super Admin chip is the one filled one) */
export const ROLE_TONE = {
  ...Object.fromEntries(Object.entries(TAG_HUE.role).map(([k, h]) => [k, HUE[h].chip])),
  super_admin: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900",
} as Record<keyof typeof TAG_HUE.role, string>

/** a role as its coloured chip — the same colours as the staff page (owner 2026-10-13: "Roles เรามี Chip") */
export function RoleChip({ role, className }: { role: keyof typeof ROLE_TONE; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", ROLE_TONE[role], className)}>{ROLE_LABEL[role]}</span>
}
