"use client"

import { useState } from "react"
import { LayersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtMoney, fmtMonth } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import type { Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * Add more paid invoices onto a receipt that is already out (owner 2026-11-24): the admin picks any months of the
 * family — not only the ones that were paid together. Receipts of their own (already issued) stay as they are.
 */
export function AddToReceiptDialog({ receiptNumber, candidates, onClose }: { receiptNumber: string; candidates: Invoice[]; onClose: () => void }) {
  const add = useStore((s) => s.addInvoicesToReceipt)
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const [picked, setPicked] = useState<string[]>([])
  const total = (i: Invoice) => Bill.invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).total
  const sum = candidates.filter((x) => picked.includes(x.id)).reduce((a, x) => a + total(x), 0)
  const submit = () => { if (report(add(receiptNumber, picked), `เพิ่ม ${picked.length} ใบเข้าใบเสร็จ ${receiptNumber} แล้ว`)) onClose() }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LayersIcon className="size-4" /> เพิ่มใบเข้าใบเสร็จ {receiptNumber}</DialogTitle>
          <DialogDescription>เลือกใบที่ชำระแล้วของครอบครัวนี้ (เดือนไหนก็ได้ กี่ใบก็ได้) มารวมในใบเสร็จฉบับนี้ · ใบที่มีใบเสร็จของตัวเองแล้วไม่แสดง</DialogDescription>
        </DialogHeader>
        {!candidates.length && <p className="text-sm text-muted-foreground">ไม่มีใบอื่นที่ชำระแล้วและยังไม่ออกใบเสร็จ</p>}
        <div className="divide-y rounded-lg border text-sm">
          {candidates.map((x) => (
            <label key={x.id} className="flex items-center gap-2 p-2.5">
              <Checkbox checked={picked.includes(x.id)} onCheckedChange={() => setPicked((p) => (p.includes(x.id) ? p.filter((y) => y !== x.id) : [...p, x.id]))} />
              <span className="font-medium">{students.find((s) => s.id === x.studentId)?.nickname}</span>
              <span className="font-mono text-xs text-muted-foreground">{x.number}</span>
              <span className="text-xs text-muted-foreground">{fmtMonth((x.lines[0]?.startDate ?? x.createdAt).slice(0, 7) + "-01")}</span>
              <span className="ml-auto tabular-nums">{fmtMoney(total(x))}</span>
            </label>
          ))}
        </div>
        <DialogFooter className="items-center">
          {picked.length > 0 && <span className="mr-auto text-sm font-semibold tabular-nums">{tx("{0} ใบ · {1}", [picked.length, fmtMoney(sum)])}</span>}
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!picked.length} onClick={submit}><LayersIcon /> เพิ่มเข้าใบเสร็จ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
