"use client"

import { useState } from "react"
import { UsersRoundIcon, UserRoundSearchIcon } from "lucide-react"
import { CustomerPicker } from "@/components/app/customer-picker"
import { GradeCell } from "@/components/app/data-table"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate } from "@/domain/dates"
import { lastPaidInvoice } from "@/domain/rules/billing"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/**
 * Create invoices for a whole family (owner 2026-11-05): pick any child → the family's children at this branch → tick who
 * renews. Each gets a Draft from their last invoice and all are linked as ONE set from the start (one panel, one PDF,
 * one message, one slip). A child with no earlier invoice is added to the set afterwards from the set's panel.
 */
export function FamilyInvoiceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (firstId: ID) => void }) {
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const create = useStore((s) => s.createFamilyBundle)
  const [picking, setPicking] = useState(true)
  const [studentId, setStudentId] = useState<ID | null>(null)
  const [picked, setPicked] = useState<ID[]>([])
  const seed = students.find((s) => s.id === studentId)
  const fam = families.find((f) => f.id === seed?.familyId)
  const kids = seed?.familyId ? students.filter((s) => s.familyId === seed.familyId && s.branchId === seed.branchId) : seed ? [seed] : []
  const choose = (id: ID) => {
    setStudentId(id)
    const st = students.find((s) => s.id === id)
    const ks = st?.familyId ? students.filter((s) => s.familyId === st.familyId && s.branchId === st.branchId) : st ? [st] : []
    setPicked(ks.filter((k) => lastPaidInvoice(k.id, invoices)).map((k) => k.id))
  }
  const submit = () => {
    const sources = picked.map((id) => lastPaidInvoice(id, invoices)!.id)
    const r = create(sources)
    if (!r.ok) { report(r, ""); return }
    const { created, failed } = r.value
    report({ ok: true, value: undefined }, `สร้าง Draft ${created.length} ใบแล้ว${created.length > 1 ? " · ผูกเป็นชุดครอบครัว" : ""}${failed.length ? ` · ไม่สำเร็จ ${failed.length} ใบ: ${failed[0].error}` : ""}`)
    if (created[0]) { onCreated(created[0].id); onClose() }
  }
  return (
    <>
      {picking && <CustomerPicker kinds={["student"]} title="เลือกนักเรียนในครอบครัว" onClose={() => (studentId ? setPicking(false) : onClose())} onConfirm={(row) => { choose(row.id); setPicking(false) }} />}
      {!picking && (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="lg:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UsersRoundIcon className="size-4" /> สร้างใบแจ้งหนี้ทั้งครอบครัว</DialogTitle>
              <DialogDescription>{fam ? `ครอบครัว${fam.name}` : "ยังไม่ผูกครอบครัว"} — ติ๊กลูกที่จะต่อคอร์ส ระบบสร้าง Draft จากใบล่าสุดของแต่ละคนและผูกเป็นชุดเดียวกัน (ส่ง อนุมัติ รับเงินพร้อมกัน)</DialogDescription>
            </DialogHeader>
            <div className="divide-y rounded-lg border">
              {kids.map((k) => {
                const last = lastPaidInvoice(k.id, invoices)
                return (
                  <label key={k.id} className={`flex items-center gap-3 p-2.5 text-sm ${last ? "cursor-pointer hover:bg-muted/40" : "opacity-60"}`}>
                    <Checkbox disabled={!last} checked={picked.includes(k.id)} onCheckedChange={(v) => setPicked(v ? [...picked, k.id] : picked.filter((x) => x !== k.id))} />
                    <span className="font-medium">{k.nickname}</span>
                    <GradeCell grade={k.grade} tone={gradeTone(k.grade)} />
                    <span className="ml-auto text-xs text-muted-foreground">{last ? `ต่อจากใบ ${fmtDate(last.createdAt.slice(0, 10))}` : "ยังไม่มีใบเดิม — เพิ่มทีหลังในชุดได้"}</span>
                  </label>
                )
              })}
            </div>
            <DialogFooter className="items-center">
              <Button variant="ghost" className="mr-auto" onClick={() => setPicking(true)}><UserRoundSearchIcon /> เปลี่ยนนักเรียน</Button>
              <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
              <Button disabled={picked.length === 0} onClick={submit}>สร้าง Draft ({picked.length})</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
