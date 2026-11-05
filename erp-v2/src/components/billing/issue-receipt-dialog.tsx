"use client"

import { useState } from "react"
import { ReceiptIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import type { Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * Issue the receipt(s) (owner 2026-11-05): confirming the slip already put the student in class — the receipt is made
 * later, whenever the admin is ready. With several invoices: ONE receipt for all, or one per student.
 */
export function IssueReceiptDialog({ invoices, onClose }: { invoices: Invoice[]; onClose: () => void }) {
  const issue = useStore((s) => s.issueReceipts)
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const [mode, setMode] = useState<"combined" | "separate">("combined")
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
        {many && (
          <div className="flex gap-1.5">
            {([["combined", "ใบเสร็จรวมทุกใบ"], ["separate", "ใบเสร็จแยกรายนักเรียน"]] as const).map(([k, label]) => (
              <button key={k} type="button" aria-pressed={mode === k} onClick={() => setMode(k)}
                className={cn("flex-1 rounded-full border px-3 py-1.5 text-sm", mode === k ? "border-foreground bg-foreground text-background" : "hover:bg-muted")}>{label}</button>
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
