"use client"

import { useState } from "react"
import { LayersIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import * as Doc from "@/domain/rules/documents"
import type { Invoice, ReceiptMerge } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/**
 * Receipt "combine list" (owner 2026-11-23): tick lines of the receipt → show them as ONE renamed line
 * (Course A 4,500 + Bus fee 500 = "Course A + Bus" 5,000). The total never changes, the invoices keep their own lines.
 */
export function ReceiptLinesDialog({ receiptNumber, onClose }: { receiptNumber: string; onClose: () => void }) {
  const invoices = useStore((s) => s.invoices)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const students = useStore((s) => s.students)
  const save = useStore((s) => s.setReceiptMerges)
  const on: Invoice[] = Bill.invoicesOnReceipt(receiptNumber, invoices)
  const many = on.length > 1
  const lines = on.flatMap((inv) => {
    const branch = branches.find((b) => b.id === inv.branchId)!
    const nick = students.find((x) => x.id === inv.studentId)?.nickname ?? ""
    return Doc.invoiceItems(inv, Bill.invoiceTotals(inv, { branch, courses, classes, holidays }), branch).map((it, i) => ({ key: Doc.receiptItemKey(inv.id, i), text: many ? `${nick} · ${it.description}` : it.description, amount: it.amount }))
  })
  const [merges, setMerges] = useState<ReceiptMerge[]>(on[0]?.receiptMerges ?? [])
  const [picked, setPicked] = useState<string[]>([])
  const [label, setLabel] = useState("")
  const taken = new Set(merges.flatMap((m) => m.keys))
  const free = lines.filter((l) => !taken.has(l.key))
  const sum = (keys: string[]) => keys.reduce((a, k) => a + (lines.find((l) => l.key === k)?.amount ?? 0), 0)
  const toggle = (k: string) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))
  const combine = () => {
    setMerges((m) => [...m, { label: label.trim(), keys: picked }])
    setPicked([]); setLabel("")
  }
  const submit = () => { if (report(save(receiptNumber, merges), "จัดรายการในใบเสร็จแล้ว")) onClose() }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LayersIcon className="size-4" /> รวมรายการในใบเสร็จ {receiptNumber}</DialogTitle>
          <DialogDescription>ติ๊กหลายบรรทัดแล้วรวมเป็นรายการเดียว ตั้งชื่อเองได้ — ยอดรวมใบเสร็จเท่าเดิม · ใบแจ้งหนี้และรายงานบัญชียังเห็นบรรทัดเดิม</DialogDescription>
        </DialogHeader>
        {merges.length > 0 && (
          <ul className="divide-y rounded-lg border text-sm">
            {merges.map((m, i) => (
              <li key={i} className="flex items-center gap-2 p-2.5">
                <span className="min-w-0 flex-1 truncate font-medium">{m.label}</span>
                <span className="text-xs text-muted-foreground">{m.keys.length} บรรทัด</span>
                <span className="tabular-nums">{fmtMoney(sum(m.keys))}</span>
                <Button size="icon-xs" variant="ghost" aria-label="เลิกรวมรายการนี้" onClick={() => setMerges((x) => x.filter((_, j) => j !== i))}><XIcon /></Button>
              </li>
            ))}
          </ul>
        )}
        <div className="max-h-64 divide-y overflow-y-auto rounded-lg border text-sm">
          {free.length === 0 && <p className="p-3 text-xs text-muted-foreground">ทุกบรรทัดถูกรวมแล้ว</p>}
          {free.map((l) => (
            <label key={l.key} className="flex items-center gap-2 p-2.5">
              <Checkbox checked={picked.includes(l.key)} onCheckedChange={() => toggle(l.key)} />
              <span className="min-w-0 flex-1 truncate">{l.text}</span>
              <span className="tabular-nums">{fmtMoney(l.amount)}</span>
            </label>
          ))}
        </div>
        {picked.length >= 2 && (
          <div className="flex items-center gap-2">
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="ชื่อรายการที่รวม เช่น ค่าเรียน + ค่ารถ" />
            <span className="whitespace-nowrap text-sm tabular-nums">{fmtMoney(sum(picked))}</span>
            <Button disabled={!label.trim()} onClick={combine}>รวม</Button>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ปิด</Button>
          <Button onClick={submit}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
