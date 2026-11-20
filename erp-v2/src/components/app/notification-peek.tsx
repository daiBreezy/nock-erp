"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { isUnread, visibleTo } from "@/domain/rules/notifications"
import type { NotificationKind } from "@/domain/types"
import { useSidePanel } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { NOTI_KIND, NotiScrim, notiAgo, type NotiKind } from "./noti"
import { peekClose, peekEnter, peekLeave, usePeekOpen } from "./noti-peek-state"

/** which Noti look (colour + icon) a team notification gets */
const KIND_OF: Record<NotificationKind, NotiKind> = {
  low_sessions: "leave", session_cancelled: "leave", holiday_impact: "leave", student_leave: "leave", approval_needed: "info", force_approved: "note",
  info: "info", form_submitted: "info", message: "message", nock: "note", student_exit: "exit", parent_request: "leave", student_note: "note",
}
const SHOWN = 12

/**
 * Hover the แจ้งเตือน menu (owner 2026-11-16, desktop only) → the SAME Noti column at the right edge of the screen — same cards,
 * same scrim — lists the latest team notifications (unread: the full coloured card · read: a plain card that keeps its kind's colour on the left edge and in a faded icon), scrolling when there are many.
 */
export function NotificationPeek() {
  const open = usePeekOpen()
  const desktop = useSidePanel()
  const me = useStore((s) => s.me())
  const all = useStore((s) => s.notifications)
  if (!open || !desktop) return null
  const mine = all.filter((n) => visibleTo(n, me)).sort((a, b) => b.at.localeCompare(a.at))
  const shown = [...mine.filter((n) => isUnread(n, me)), ...mine.filter((n) => !isUnread(n, me))].slice(0, SHOWN)
  return (
    <div className="pointer-events-none fixed top-16 right-4 z-[60] w-full max-w-sm print:hidden" data-slot="noti-peek" aria-label="แจ้งเตือนล่าสุด">
      <NotiScrim tall />
      <div onPointerEnter={peekEnter} onPointerLeave={() => peekLeave()} className="pointer-events-auto -mx-1 flex max-h-[calc(100dvh-10rem)] flex-col gap-3 overflow-y-auto px-1 py-1">
        {shown.length === 0 && <p className="rounded-2xl border bg-popover p-4 text-center text-sm text-muted-foreground shadow-lg">ไม่มีแจ้งเตือน</p>}
        {shown.map((n) => {
          const k = NOTI_KIND[KIND_OF[n.kind]]
          const isNew = isUnread(n, me)
          return (
            <Link key={n.id} href="/notifications" onClick={peekClose} className={cn("flex shrink-0 items-start gap-3 rounded-2xl border p-4 text-popover-foreground shadow-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50", isNew ? k.card : cn("border-border bg-popover", k.card.split(" ").filter((c) => c.startsWith("border-l-") || c.startsWith("dark:border-l-")).join(" ")))}>
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", k.tone, !isNew && "opacity-50")}><k.icon className="size-4" /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-start gap-2">
                  <span className={cn("line-clamp-2 min-w-0 flex-1 text-sm", isNew ? "font-semibold" : "font-medium")}>{n.title}</span>
                  <span className="mt-0.5 shrink-0 text-2xs text-muted-foreground">{notiAgo(Date.parse(n.at))}</span>
                </span>
                <span className="line-clamp-2 text-xs">{n.body}</span>
              </span>
            </Link>
          )
        })}
        <div className="flex shrink-0 justify-end">
          <Button variant="outline" nativeButton={false} render={<Link href="/notifications" onClick={peekClose} />} className="rounded-full bg-popover shadow-sm">ดูทั้งหมด</Button>
        </div>
      </div>
    </div>
  )
}
