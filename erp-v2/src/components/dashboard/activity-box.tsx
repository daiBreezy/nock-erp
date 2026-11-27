"use client"

import Link from "next/link"
import { useState } from "react"
import { ActivityIcon, BanknoteIcon, CheckCircle2Icon, FileTextIcon, InboxIcon, SendIcon, UserSearchIcon, XCircleIcon } from "lucide-react"
import { toDateStr, fmtDate } from "@/domain/dates"
import type { ActivityEvent, ActivityKind, ActivityTone } from "@/domain/rules/activity"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

const ICON: Record<ActivityKind, typeof BanknoteIcon> = { payment: BanknoteIcon, attendance: CheckCircle2Icon, invoice: FileTextIcon, lead: UserSearchIcon, request: InboxIcon, credit_note: FileTextIcon, form: SendIcon }
const TONE: Record<ActivityTone, string> = {
  green: "bg-success-soft text-success-ink", blue: "bg-info-soft text-info-ink", red: "bg-danger-soft text-danger-ink", amber: "bg-warning-soft text-warning-ink", gray: "bg-muted text-muted-foreground",
}
const timeOf = (at: string) => { const d = new Date(at); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }

/**
 * ความเคลื่อนไหว (owner 2026-11-27: "data ที่ไหลเหมือนน้ำ ไม่ควรเป็น Section — แค่ Icon กดดูเมื่อจำเป็น") — an icon in the page header
 * (badge = today's count) that opens the feed. The events are the shared `buildActivity` ones, already cut down to this role + branch.
 */
export function ActivityButton({ events, today }: { events: ActivityEvent[]; today: string }) {
  const [open, setOpen] = useState(false)
  const days = [...new Set(events.map((e) => toDateStr(new Date(e.at))))]
  const todayCount = events.filter((e) => toDateStr(new Date(e.at)) === today).length
  return (
    <>
      <HoverCard>
        <HoverCardTrigger render={<Button variant="outline" size="icon-sm" className="relative" aria-label={tx("ความเคลื่อนไหว")} onClick={() => setOpen(true)} />}>
          <ActivityIcon />
          {todayCount > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-primary px-1 text-2xs leading-4 font-semibold text-primary-foreground tabular-nums">{todayCount}</span>}
        </HoverCardTrigger>
        <HoverCardContent>{tx("ความเคลื่อนไหว")}</HoverCardContent>
      </HoverCard>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto lg:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ActivityIcon className="size-5" /> {tx("ความเคลื่อนไหว")}</DialogTitle>
            <DialogDescription>{tx("สิ่งที่เกิดขึ้นล่าสุดตามสิทธิ์และสาขาของคุณ")}</DialogDescription>
          </DialogHeader>
          {events.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">{tx("ยังไม่มีความเคลื่อนไหว")}</p>}
          {days.map((d) => (
            <div key={d}>
              <p className="px-1 pb-0.5 text-xs font-medium text-muted-foreground">{d === today ? tx("วันนี้") : fmtDate(d, { weekday: true })}</p>
              {events.filter((e) => toDateStr(new Date(e.at)) === d).map((e) => {
                const Icon = e.tone === "red" ? XCircleIcon : ICON[e.kind]
                const row = (
                  <>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-md", TONE[e.tone])}><Icon className="size-3.5" /></span>
                    <span className="min-w-0 flex-1 truncate text-sm">{e.text}</span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{timeOf(e.at)}</span>
                  </>
                )
                return e.href
                  ? <Link key={e.id} href={e.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-lg px-1 py-1 hover:bg-muted/60">{row}</Link>
                  : <div key={e.id} className="flex items-center gap-2.5 rounded-lg px-1 py-1">{row}</div>
              })}
            </div>
          ))}
        </DialogContent>
      </Dialog>
    </>
  )
}
