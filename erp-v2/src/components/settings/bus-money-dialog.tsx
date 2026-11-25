"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/app/native-select"
import { fmtMoney } from "@/domain/dates"
import { planBusMoney, type BusImpact } from "@/domain/rules/period-impact"
import { busRate } from "@/domain/rules/settings"
import type { CreditMode, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-25: the bus legs a Special Period stopped that were already PAID go back as money — a Credit Note off the paid invoice (refund, or kept as credit for the next
 * invoice). Approval + the transfer back follow the normal Billing flow. Shows what will be made before the Admin confirms.
 */
export function BusMoneyDialog({ periodId, bus, onClose }: { periodId: ID; bus: BusImpact; onClose: () => void }) {
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const student = useStore((s) => s.students.find((x) => x.id === bus.studentId))
  const settle = useStore((s) => s.settleBusLegs)
  const [mode, setMode] = useState<CreditMode>("refund")
  const [note, setNote] = useState("")
  const branch = branches.find((b) => b.id === student?.branchId)
  const plans = planBusMoney(bus.studentId, new Set(bus.legs.map((l) => l.date)), invoices, (id) => (branch ? busRate(branch, invoices.find((i) => i.id === id)?.busFeeId ?? null) : 0))
  const total = plans.reduce((a, p) => a + p.amount, 0)
  const submit = () => { if (report(settle(periodId, bus.studentId, mode, note), (v) => tx("สร้างใบลดหนี้ค่ารถ {0} ใบ · {1} (ไปอนุมัติที่ Billing)", [v.notes, fmtMoney(v.amount)]))) onClose() }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{tx("ค่ารถที่จ่ายแล้ว")} · {student?.nickname}</DialogTitle>
          <DialogDescription>{tx("เที่ยวรถที่จ่ายแล้วแต่โรงเรียนทำให้รถไม่ไป — คืนเป็นเงินผ่านใบลดหนี้ของใบแจ้งหนี้ที่จ่ายแล้ว")}</DialogDescription>
        </DialogHeader>
        {plans.length === 0 ? <p className="rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">{tx("ไม่มีค่ารถที่จ่ายแล้วให้คืน — เที่ยวที่ยังไม่จ่ายแก้ที่ใบแจ้งหนี้")}</p> : (
          <div className="space-y-2">
            <ul className="divide-y rounded-xl bg-muted/40 text-sm">
              {plans.flatMap((p) => p.items.map((i) => (
                <li key={`${p.invoiceId}${i.key}`} className="flex items-center gap-2 px-2.5 py-1.5"><span className="min-w-0 flex-1">{tx(i.label)} · {tx("{0} เที่ยว", [i.legs])}<span className="ml-1.5 text-xs text-muted-foreground">{invoices.find((x) => x.id === p.invoiceId)?.number ?? ""}</span></span><span className="tabular-nums">{fmtMoney(i.amount)}</span></li>
              )))}
              <li className="flex items-center gap-2 px-2.5 py-1.5 font-semibold"><span className="flex-1">{tx("รวม")}</span><span className="tabular-nums">{fmtMoney(total)}</span></li>
            </ul>
            <NativeSelect value={mode} onChange={(e) => setMode(e.target.value as CreditMode)} aria-label={tx("วิธีคืน")}
              options={[{ value: "refund", label: tx("Refund (คืนเงิน)") }, { value: "credit", label: tx("ลดค่าเรียนครั้งถัดไป") }]} />
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={tx("หมายเหตุ (ไม่บังคับ)")} />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ปิด")}</Button>
          <Button disabled={plans.length === 0} onClick={submit}>{tx("สร้างใบลดหนี้ค่ารถ")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
