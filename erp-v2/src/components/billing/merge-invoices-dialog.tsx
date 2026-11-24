"use client"

import { useState } from "react"
import { LayersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtMoney } from "@/domain/dates"
import * as Bill from "@/domain/rules/billing"
import type { ID, Invoice } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/** the other invoices of this invoice's family that can still be merged with it: same branch, no running number yet, not already in its set (owner 2026-11-24) */
export function useMergeCandidates(inv: Invoice | undefined): Invoice[] {
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  if (!inv || !Bill.hasNoRunNo(inv)) return []
  const fam = students.find((x) => x.id === inv.studentId)?.familyId
  if (!fam) return []
  return invoices.filter((x) => x.id !== inv.id && x.branchId === inv.branchId && Bill.hasNoRunNo(x) && !(inv.bundleId && x.bundleId === inv.bundleId) && students.find((y) => y.id === x.studentId)?.familyId === fam)
}

/**
 * owner 2026-11-24: merge this invoice with other invoices of the same family into ONE family set — only while none of them has a running number.
 * (A set can be split again the same way until a number is issued.)
 */
export function MergeInvoicesDialog({ inv, onClose }: { inv: Invoice; onClose: () => void }) {
  const candidates = useMergeCandidates(inv)
  const link = useStore((s) => s.linkInvoices)
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const totalOf = (x: Invoice) => Bill.invoiceTotals(x, { branch: branches.find((b) => b.id === x.branchId)!, courses, classes, holidays }).total
  const [picked, setPicked] = useState<ID[]>([])
  const nick = (x: Invoice) => students.find((y) => y.id === x.studentId)?.nickname ?? "—"
  const toggle = (id: ID) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><LayersIcon className="size-4" /> รวมเป็นชุดกับใบอื่น</DialogTitle>
          <DialogDescription>เลือกใบของคนในครอบครัวเดียวกันที่ยังไม่มีเลขรัน (Run no.) — ใบที่รวมแล้วเป็นใบชุด ส่ง อนุมัติ และรับเงินพร้อมกัน</DialogDescription>
        </DialogHeader>
        {candidates.length === 0 ? (
          <p className="rounded-xl border border-dashed p-3 text-center text-sm text-muted-foreground">ไม่มีใบอื่นของครอบครัวนี้ที่รวมได้</p>
        ) : (
          <ul className="divide-y rounded-xl border text-sm">
            {candidates.map((x) => (
              <li key={x.id}>
                <label className="flex cursor-pointer items-center gap-2 p-2.5">
                  <Checkbox checked={picked.includes(x.id)} onCheckedChange={() => toggle(x.id)} />
                  <span className="font-medium">{nick(x)}</span>
                  <span className="text-xs text-muted-foreground">{x.status === "draft" ? "ร่าง" : x.status === "pending_approval" ? "รออนุมัติ" : "อนุมัติแล้ว · รอออกเลข"}{x.bundleId ? " · อยู่ในชุดอื่น (ดึงมาทั้งชุด)" : ""}</span>
                  <span className="ml-auto tabular-nums text-xs">{fmtMoney(totalOf(x))}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!picked.length} onClick={() => { if (report(link([inv.id, ...picked]), "รวมเป็นใบชุดแล้ว")) onClose() }}><LayersIcon /> รวมเป็นชุด{picked.length ? ` (${picked.length + 1} ใบ)` : ""}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
