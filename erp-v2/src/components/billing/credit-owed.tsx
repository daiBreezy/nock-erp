"use client"

import { ReceiptIcon } from "lucide-react"
import { CreditTag } from "@/components/app/credit-tag"
import { Pill } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import { creditAgeDays, creditOwedTotal, creditState, CREDIT_REMIND_DAYS, invoiceOfCredit } from "@/domain/rules/credit"
import { can } from "@/domain/rules/permissions"
import type { Entitlement, ID } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

/** the credit courses of these branches that still owe money (not invoiced, or invoiced and unpaid) */
export function useCreditOwed(branchIds: ID[]): Entitlement[] {
  const ents = useStore((s) => s.entitlements)
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  return ents.filter((e) => {
    const st = creditState(e, invoices)
    return (st === "open" || st === "invoiced") && branchIds.includes(students.find((x) => x.id === e.studentId)?.branchId ?? "")
  })
}

/** Billing › Credit Course card opens this (owner 2026-11-19): who studies before paying, how long, and a shortcut to invoice them */
export function CreditOwedDialog({ branchIds, onClose, onInvoice }: { branchIds: ID[]; onClose: () => void; onInvoice: (studentId: ID, invoiceId?: ID) => void }) {
  const today = toDateStr(useNow(60_000))
  const me = useStore((s) => s.me())
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const owed = useCreditOwed(branchIds)
  const byStudent = [...new Map(owed.map((e) => [e.studentId, owed.filter((x) => x.studentId === e.studentId)])).entries()]
    .map(([studentId, list]) => ({ student: students.find((x) => x.id === studentId), list, age: Math.max(...list.map((e) => creditAgeDays(e, today))), hasOpen: list.some((e) => creditState(e, invoices) === "open") }))
    .sort((a, b) => b.age - a.age)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto lg:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CreditTag /> เรียนก่อนจ่าย · ค้าง {fmtMoney(creditOwedTotal(owed))}</DialogTitle>
          <DialogDescription>นักเรียนที่เรียนไปก่อนโดยยังไม่ชำระ — เรียงตามค้างนานสุด</DialogDescription>
        </DialogHeader>
        {byStudent.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ไม่มีนักเรียนที่ค้าง Credit</p>}
        <ul className="divide-y divide-border">
          {byStudent.map(({ student, list, age, hasOpen }) => (
            <li key={student?.id} className="flex items-center gap-2 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{student?.nickname} <span className="font-normal text-muted-foreground">{student?.name}</span></p>
                <p className="truncate text-xs text-muted-foreground">
                  {list.map((e) => courses.find((c) => c.id === e.courseId)?.name ?? "คอร์ส").join(", ")} · เริ่ม {fmtDate(list.map((e) => e.from).sort()[0])} · ค้างมา {age} วัน
                  {list.some((e) => invoiceOfCredit(e, invoices)) && " · มีใบแล้ว"}
                </p>
              </div>
              {age >= CREDIT_REMIND_DAYS && <Pill tone="red">ค้างเกิน {CREDIT_REMIND_DAYS} วัน</Pill>}
              <span className="shrink-0 font-semibold tabular-nums">{fmtMoney(creditOwedTotal(list))}</span>
              {(() => {
                const live = list.map((e) => invoiceOfCredit(e, invoices)).find(Boolean)
                if (live) return <Button size="xs" variant="outline" onClick={() => onInvoice(student!.id, live.id)}><ReceiptIcon /> เปิดใบ</Button>
                return hasOpen && can(me, "billing.manage") ? <Button size="xs" variant="outline" onClick={() => onInvoice(student!.id)}><ReceiptIcon /> ออกใบ</Button> : null
              })()}
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
