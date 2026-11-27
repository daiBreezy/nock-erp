"use client"

import Link from "next/link"
import { AlertTriangleIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AttentionItem } from "@/domain/rules/reports"
import { tx } from "@/lib/i18n"

export const GROUP_LABEL: Record<AttentionItem["group"], string> = { trend: "ยอดและแนวโน้ม", money: "เงินค้าง", students: "นักเรียนเสี่ยงหลุด", teaching: "ครูและการสอน", sales: "ขาย (CRM)" }

/**
 * "Need Attention" (owner 2026-10-01; an icon button + badge since 2026-11-27 — it is no longer a KPI card): a warning icon in the page header with the
 * count as a badge, opens AttentionDialog. Same look as the Dashboard's activity button.
 */
export function AttentionButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
  return (
    <HoverCard>
      <HoverCardTrigger render={<Button variant="outline" size="icon-sm" className={cn("relative", className)} aria-label={tx("Need Attention")} onClick={onClick} />}>
        <AlertTriangleIcon className={count ? "text-danger" : undefined} />
        {count > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-4 rounded-full bg-danger px-1 text-2xs leading-4 font-semibold text-white tabular-nums">{count}</span>}
      </HoverCardTrigger>
      <HoverCardContent>{count ? tx("Need Attention · กดเพื่อดูรายการ") : tx("Need Attention · ไม่มีเรื่องที่ต้องดู")}</HoverCardContent>
    </HoverCard>
  )
}

/** Grouped list of everything needsAttention() flagged — click an item to jump to where it's fixed. */
export function AttentionDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: AttentionItem[] }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto lg:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangleIcon className="size-5 text-danger" /> Need Attention</DialogTitle>
          <DialogDescription>{items.length ? tx("{0} เรื่องที่ควรดู · กดเพื่อไปหน้าที่แก้ได้", [items.length]) : tx("ไม่มีเรื่องที่ต้องดูตอนนี้")}</DialogDescription>
        </DialogHeader>
        {(Object.keys(GROUP_LABEL) as AttentionItem["group"][]).map((g) => {
          const list = items.filter((x) => x.group === g)
          if (!list.length) return null
          return (
            <section key={g} className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{tx(GROUP_LABEL[g])}</p>
              {list.map((x) => (
                <Link key={x.key} href={x.href} onClick={onClose} className="flex items-center gap-3 rounded-xl border p-2.5 hover:bg-muted/50">
                  <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{x.title}</span><span className="block text-xs text-muted-foreground">{x.detail}</span></span>
                  {x.group !== "trend" && <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger-ink tabular-nums">{x.count}</span>}
                  <ChevronRightIcon className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </section>
          )
        })}
      </DialogContent>
    </Dialog>
  )
}
