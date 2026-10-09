"use client"

import Link from "next/link"
import { AlertTriangleIcon, ChevronRightIcon } from "lucide-react"
import { Kpi } from "@/components/app/kpi"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { AttentionItem } from "@/domain/rules/reports"
import { cn } from "@/lib/utils"
import { tx } from "@/lib/i18n"

export const GROUP_LABEL: Record<AttentionItem["group"], string> = { trend: "ยอดและแนวโน้ม", money: "เงินค้าง", students: "นักเรียนเสี่ยงหลุด", teaching: "ครูและการสอน", sales: "ขาย (CRM)" }

/** The red "Need Attention" KPI button (owner 2026-10-01, shared with Dashboard from 2026-10-06) — opens AttentionDialog. */
export function AttentionButton({ count, onClick, className }: { count: number; onClick: () => void; className?: string }) {
  // the standard KPI card (owner 2026-10-09) — red while there is something to look at
  return (
    <Kpi icon={AlertTriangleIcon} tone={count ? "red" : "primary"} label="Need Attention" value={count} sub={count ? tx("กดเพื่อดูรายการ") : tx("ไม่มีเรื่องต้องดู")} onClick={onClick}
      className={cn(count && "bg-red-50 ring-red-300 hover:ring-red-400 dark:bg-red-950/40 dark:ring-red-800", className)} />
  )
}

/** Grouped list of everything needsAttention() flagged — click an item to jump to where it's fixed. */
export function AttentionDialog({ open, onClose, items }: { open: boolean; onClose: () => void; items: AttentionItem[] }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangleIcon className="size-5 text-red-600" /> Need Attention</DialogTitle>
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
                  {x.group !== "trend" && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800 tabular-nums dark:bg-red-950 dark:text-red-200">{x.count}</span>}
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
