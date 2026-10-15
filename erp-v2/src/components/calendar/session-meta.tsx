"use client"

// owner 2026-10-15: the same small icons for a session's room and head-count in every calendar view
import { DoorOpenIcon, FlaskConicalIcon, ListChecksIcon, MessagesSquareIcon, ShapesIcon, UsersRoundIcon } from "lucide-react"
import type { Klass, Session } from "@/domain/types"
import { useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"

/** 🚪 3 — the room's number / short name, the full name on hover */
export function RoomMeta({ roomId, className }: { roomId: string | null; className?: string }) {
  const L = useLookup()
  const full = L.room(roomId)
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)} title={full}>
      <DoorOpenIcon className="size-3.5 shrink-0" /><span className="truncate">{roomId ? full.replace(/^(room|ห้อง)\s*/i, "") : "—"}</span>
    </span>
  )
}

/** 👥 4 — students in the session */
export function StudentsMeta({ n, className }: { n: number; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center gap-1 tabular-nums", className)} title={`นักเรียน ${n} คน`}><UsersRoundIcon className="size-3.5" />{n}</span>
}

// owner 2026-10-15: on the card's top line, coloured, the meaning on hover (test no longer shares the check-in icon)
export const KIND_ICON = {
  test: { icon: ListChecksIcon, label: "สอบวัดระดับ", tone: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300" },
  trial: { icon: FlaskConicalIcon, label: "ทดลองเรียน", tone: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300" },
  interview: { icon: MessagesSquareIcon, label: "สัมภาษณ์", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  other: { icon: ShapesIcon, label: "อื่นๆ", tone: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
} as const

/** What kind of session this is, for the Room line (normal learning sessions show nothing). */
export function kindOf(s: Session, klass?: Klass): keyof typeof KIND_ICON | null {
  if (s.assessment === "test" || klass?.kind === "test") return "test"
  if (s.assessment === "trial" || s.trial) return "trial"
  if (klass?.kind === "interview") return "interview"
  if (klass?.kind === "other") return "other"
  return null
}

/** the session's type as a chip — the same colour + icon everywhere (calendar card, list, panel, dashboard) */
export function KindChip({ s, klass, className }: { s: Session; klass?: Klass; className?: string }) {
  const k = kindOf(s, klass)
  if (!k) return null
  const K = KIND_ICON[k]
  return <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 align-middle text-xs font-medium", K.tone, className)}><K.icon className="size-3" />{K.label}</span>
}
