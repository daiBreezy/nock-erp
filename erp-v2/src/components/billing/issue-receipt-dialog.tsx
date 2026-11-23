"use client"

import { useState } from "react"
import { ReceiptIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtMoney, fmtMonth } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import type { Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/**
 * Issue the receipt(s) (owner 2026-11-05): confirming the slip already put the student in class — the receipt is made
 * later, whenever the admin is ready. With several invoices: ONE receipt for all, or one per student.
 */
export function IssueReceiptDialog({ invoices: base, more = [], onClose }: { invoices: Invoice[]; /** owner 2026-11-23: other paid invoices of the family (e.g. other months) that can join the same receipt */ more?: Invoice[]; onClose: () => void }) {
  const issue = useStore((s) => s.issueReceipts)
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const [mode, setMode] = useState<"combined" | "separate">("combined")
  const [extra, setExtra] = useState<string[]>([])
  const invoices = [...base, ...more.filter((x) => extra.includes(x.id))]
  const many = invoices.length > 1
  const total = (i: Invoice) => Bill.invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).total
  const submit = () => { if (report(issue(invoices.map((i) => i.id), mode), many ? (mode === "combined" ? "ออกใบเสร็จรวมแล้ว — ส่งผู้ปกครองแล้ว" : "ออกใบเสร็จรายนักเรียนแล้ว — ส่งผู้ปกครองแล้ว") : "ออกใบเสร็จแล้ว — ส่งผู้ปกครองแล้ว")) onClose() }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ReceiptIcon className="size-4" /> ออกใบเสร็จ</DialogTitle>
          <DialogDescription>ยืนยันยอดเงินแล้ว นักเรียนเข้าคลาสแล้ว — ใบเสร็จออกตอนไหนก็ได้ และส่งให้ผู้ปกครองทาง LINE ทันทีที่ออก</DialogDescription>
        </DialogHeader>
        <div className="divide-y rounded-lg border text-sm">
          {invoices.map((i) => (
            <div key={i.id} className="flex items-center gap-2 p-2.5">
              <span className="font-medium">{students.find((s) => s.id === i.studentId)?.nickname}</span>
              <span className="font-mono text-xs text-muted-foreground">{i.number}</span>
              <span className="ml-auto tabular-nums">{fmtMoney(total(i))}</span>
            </div>
          ))}
        </div>
        {more.length > 0 && (
          <div className="space-y-1 rounded-lg border border-dashed p-2.5">
            <p className="text-xs font-medium">รวมใบอื่นของครอบครัว (เช่น คนละเดือน) ในใบเสร็จเดียวกัน</p>
            {more.map((x) => (
              <label key={x.id} className="flex items-center gap-2 text-xs">
                <Checkbox checked={extra.includes(x.id)} onCheckedChange={() => setExtra((e) => (e.includes(x.id) ? e.filter((y) => y !== x.id) : [...e, x.id]))} />
                <span className="font-medium">{students.find((s) => s.id === x.studentId)?.nickname}</span>
                <span className="font-mono text-muted-foreground">{x.number}</span>
                <span className="text-muted-foreground">{fmtMonth(x.createdAt.slice(0, 7) + "-01")}</span>
                <span className="ml-auto tabular-nums">{fmtMoney(total(x))}</span>
              </label>
            ))}
          </div>
        )}
        {many && (
          <div className="flex gap-1.5">
            {([["combined", "ใบเสร็จรวมทุกใบ"], ["separate", "ใบเสร็จแยกรายนักเรียน"]] as const).map(([k, label]) => (
              <Button variant="chip" size="inline" key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}
                className="flex-1 px-3 py-1.5 text-sm">{label}</Button>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไว้ก่อน</Button>
          <Button onClick={submit}><ReceiptIcon /> ออกใบเสร็จ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
