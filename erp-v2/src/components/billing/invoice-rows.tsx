"use client"

import { ChevronRightIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { fmtMoney, fmtMonth } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import type { ID, Invoice } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"
import { invoiceTone } from "./status"

/** one wording for an invoice's state wherever it is listed (Lead panel · Family panel) */
export const INV_STATUS: Record<string, string> = { draft: "ร่าง", pending_approval: "รออนุมัติ", approved: "อนุมัติแล้ว", sent: "ส่งแล้ว · รอชำระ", paid: "ชำระแล้ว", void: "ยกเลิก" }

/** the live (not void) invoices of these children, newest first */
export function useInvoicesOf(studentIds: Set<ID>): Invoice[] {
  const invoices = useStore((s) => s.invoices)
  return [...invoices].filter((i) => studentIds.has(i.studentId) && i.status !== "void").sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** what is still owed on a list of invoices */
export function useOwed(list: Invoice[]): number {
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  return list.filter((i) => i.status === "approved" || i.status === "sent").reduce((a, i) => {
    const b = branches.find((x) => x.id === i.branchId)
    return b ? a + Math.max(0, Bill.owedOn(i, Bill.invoiceTotals(i, { branch: b, courses, classes, holidays }).total)) : a
  }, 0)
}

/**
 * owner 2026-11-20: invoices as quiet rows — child · number (or "no course yet") · status · money. Tap = that invoice's panel
 * (a family set opens on its "รวม" tab) so progress is one tap away from the Lead and the Family panel alike.
 */
export function InvoiceRows({ list, onOpen, byMonth }: { list: Invoice[]; onOpen: (id: ID) => void; /** owner 2026-11-20: a small month heading between groups (newest month first) */ byMonth?: boolean }) {
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const moneyOf = (i: Invoice) => { const b = branches.find((x) => x.id === i.branchId); return b ? Bill.invoiceTotals(i, { branch: b, courses, classes, holidays }).total : 0 }
  const rowsOf = (items: Invoice[]) => (
    <ul className="divide-y rounded-2xl border">
      {items.map((i) => {
        const who = students.find((x) => x.id === i.studentId)?.nickname
        const blank = !i.lines.length && !i.advance.length && !i.bookFee
        return (
          <li key={i.id}>
            <Button variant="row" size="inline" type="button" onClick={() => onOpen(i.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/50">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{who}{i.bundleId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{tx("· ชุดครอบครัว")}</span>}</span>
                <span className="block truncate font-mono text-xs text-muted-foreground">{i.number ?? (blank ? tx("ยังไม่มีคอร์ส") : tx("ร่าง"))}</span>
              </span>
              <Pill tone={invoiceTone(i)}>{INV_STATUS[i.status]}</Pill>
              <span className="w-20 shrink-0 text-right tabular-nums">{blank ? "—" : fmtMoney(moneyOf(i))}</span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
  if (!byMonth) return rowsOf(list)
  const groups = new Map<string, Invoice[]>()
  for (const i of list) groups.set(i.createdAt.slice(0, 7), [...(groups.get(i.createdAt.slice(0, 7)) ?? []), i])
  return (
    <div className="space-y-4">
      {[...groups.entries()].map(([month, items]) => (
        <div key={month} className="space-y-1.5">
          <p className="px-1 text-xs font-semibold text-muted-foreground">{fmtMonth(`${month}-01`)}</p>
          {rowsOf(items)}
        </div>
      ))}
    </div>
  )
}
