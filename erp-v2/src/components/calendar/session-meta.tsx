"use client"

// owner 2026-10-15: the same small icons for a session's room and head-count in every calendar view
import { DoorOpenIcon, UsersRoundIcon } from "lucide-react"
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
