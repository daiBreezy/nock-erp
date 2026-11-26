"use client"

import { useMemo } from "react"
import { FileTextIcon } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { fmtDate, fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import type { DateStr, ID } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-26 — following up the invoices that were SENT to a parent and are not paid yet. The Invoice column of the Student / Family lists draws one
 * receipt icon per row (none when nothing is waiting); its colour follows the nearest pay-by date: under 3 days (or overdue) red · under 7 yellow · 7+ grey.
 * Hover = every such invoice (number · child · owed · pay-by date · what is holding it).
 */
const TONE_INK = { red: "text-danger", amber: "text-warning", gray: "text-muted-foreground" } as const

/** every sent-and-unpaid invoice, grouped by child — built once per page, then each row just looks its children up */
export function useFollowedByStudent(today: DateStr) {
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  return useMemo(() => {
    const all = new Set(invoices.filter(Bill.isFollowed).map((i) => i.studentId))
    const list = Bill.followedInvoices(invoices, all, today, (i) => {
      const b = branches.find((x) => x.id === i.branchId)
      return b ? Math.max(0, Bill.owedOn(i, Bill.invoiceTotals(i, { branch: b, courses, classes, holidays }).total)) : 0
    })
    const m = new Map<ID, Bill.FollowedInvoice[]>()
    for (const f of list) m.set(f.studentId, [...(m.get(f.studentId) ?? []), f])
    return (ids: ID[]) => ids.flatMap((id) => m.get(id) ?? []).sort((a, b) => a.days - b.days)
  }, [invoices, branches, courses, classes, holidays, today])
}

export function InvoiceFollowCell({ items, nameOf }: { items: Bill.FollowedInvoice[]; nameOf: (studentId: ID) => string }) {
  if (!items.length) return null
  const worst = items[0]
  const when = (f: Bill.FollowedInvoice) => (f.days < 0 ? tx("เกินกำหนด {0} วัน", [-f.days]) : f.days === 0 ? tx("ครบกำหนดวันนี้") : tx("อีก {0} วัน", [f.days]))
  const total = items.reduce((a, f) => a + f.owed, 0)
  return (
    <HoverCard>
      <HoverCardTrigger render={<span role="img" tabIndex={0} aria-label={tx("ใบแจ้งหนี้ที่ส่งแล้วยังไม่ชำระ {0} ใบ", [items.length])} className={cn("inline-flex cursor-default items-center gap-0.5", TONE_INK[worst.tone])} />}>
        <FileTextIcon className="size-4" />
        {items.length > 1 && <span className="text-xs font-medium tabular-nums">{items.length}</span>}
      </HoverCardTrigger>
      <HoverCardContent side="bottom" align="end" className="w-80 space-y-2 leading-relaxed">
        <p className="flex items-baseline justify-between gap-3"><span className="font-medium text-foreground">{tx("ส่งแล้ว ยังไม่ชำระ")} ({items.length})</span><span className="font-semibold tabular-nums text-foreground">{fmtMoney(total)}</span></p>
        <ul className="space-y-1.5 border-t pt-2">
          {items.map((f) => (
            <li key={f.id} className="space-y-0.5">
              <p className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate text-foreground">{f.number ?? tx("ใบร่าง")} · {nameOf(f.studentId)}</span><span className="shrink-0 tabular-nums text-foreground">{fmtMoney(f.owed)}</span></p>
              <p className={cn("text-xs", TONE_INK[f.tone])}>{tx("ครบกำหนด {0}", [fmtDate(f.due)])} · {when(f)}{f.assumed && <span className="text-muted-foreground"> · {tx("ไม่ได้ระบุ นับ 14 วันจากวันที่ส่ง")}</span>}</p>
              {(f.slipWaiting || f.delivery === "failed" || f.delivery === "no_line") && (
                <p className="text-xs text-muted-foreground">{f.slipWaiting ? tx("มีสลิปรอยืนยันยอดที่ Billing") : f.delivery === "failed" ? tx("ส่ง LINE ไม่สำเร็จ") : tx("ไม่มี LINE — ยังไม่ถึงผู้ปกครอง")}</p>
              )}
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  )
}

/** the ⓘ of the column header: what the colours mean */
export function InvoiceFollowInfo() {
  return <span className="block whitespace-pre-line">{tx("ใบแจ้งหนี้ที่ส่งแล้วยังไม่ชำระ · สีตามวันครบกำหนด\nแดง: ไม่ถึง 3 วัน / เกินกำหนด\nเหลือง: ไม่ถึง 7 วัน\nเทา: 7 วันขึ้นไป\nไม่มีใบค้าง = ไม่แสดง icon")}</span>
}
