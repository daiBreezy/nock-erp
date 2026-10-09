"use client"

import { useState } from "react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FormShell, useInPanel } from "./form-shell"
import { Input } from "@/components/ui/input"
import { validateFamily } from "@/domain/rules/people"
import type { Family } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { Field } from "./student-form"
import { EnNameField, nativeLabel } from "./name-fields"
import { useBranch } from "@/lib/hooks"

/** Shared with families/page.tsx and the Inbox "create family from this conversation" flow. Same field
 *  set as the parent-facing Test/Trial form (email/relationship/birthdate/tax info) — staff fill this in
 *  by hand for a walk-in who can't submit the LINE form themselves. */
export function FamilyForm({ family, initialName, initialParent, onClose, onSaved }: { family?: Family; initialName?: string; initialParent?: { name: string; phone?: string }; onClose: () => void; onSaved?: (f: Family) => void }) {
  const save = useStore((s) => s.saveFamily)
  const branch = useBranch()
  const [f, setF] = useState<Family>(family ?? { id: uid("fa"), name: initialName ?? "", parents: [{ name: initialParent?.name ?? "", phone: initialParent?.phone ?? "", lineLinked: false, primary: true }] })
  const [touched, setTouched] = useState(false)
  const errs = validateFamily(f)
  const err = (field: string) => touched && errs.find((e) => e.field === field)?.message
  const setParent = (i: number, patch: Partial<Family["parents"][number]>) => setF((x) => ({ ...x, parents: x.parents.map((p, j) => (j === i ? { ...p, ...patch } : patch.primary ? { ...p, primary: false } : p)) }))

  const inPanel = useInPanel()
  const submit = () => {
    setTouched(true)
    const r = save(f)
    if (report(r, "บันทึกครอบครัวแล้ว")) {
      onSaved?.(r.value)
      if (!inPanel) onClose()
    }
  }

  return (
    <FormShell className="max-h-[92vh] sm:max-w-xl" onClose={onClose} title={family ? `แก้ไข ${family.name}` : "เพิ่มครอบครัว"}
      footer={<><Button variant="ghost" onClick={onClose}>ยกเลิก</Button><Button onClick={submit}>{family ? "บันทึก" : "เพิ่มครอบครัว"}</Button></>}>
        <div className="grid grid-cols-2 gap-2">
          <Field label={nativeLabel(branch.brand, "ชื่อครอบครัว")} error={err("name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder={branch.brand === "liclass" ? "山田家" : "ครอบครัวสุขใจ"} /></Field>
          <EnNameField label="ชื่อครอบครัว" native={f.name} value={f.nameEn} onChange={(v) => setF({ ...f, nameEn: v })} />
        </div>

        <div className="space-y-2">
          {f.parents.map((p, i) => (
            <div key={i} className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">ผู้ปกครองคนที่ {i + 1}</p>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-xs"><input type="radio" checked={p.primary} onChange={() => setParent(i, { primary: true })} /> หลัก</label>
                  <Button size="icon-sm" variant="ghost" disabled={f.parents.length === 1} aria-label="ลบ" onClick={() => setF({ ...f, parents: f.parents.filter((_, j) => j !== i) })}><TrashIcon /></Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label={nativeLabel(branch.brand, "ชื่อ")} error={err(`parent${i}.name`)}><Input value={p.name} onChange={(e) => setParent(i, { name: e.target.value })} placeholder="คุณแม่ สุดา" /></Field>
                <EnNameField label="ชื่อ" native={p.name} value={p.nameEn} onChange={(v) => setParent(i, { nameEn: v })} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="เบอร์โทร *" error={err(`parent${i}.phone`)}><Input inputMode="tel" value={p.phone} onChange={(e) => setParent(i, { phone: e.target.value })} placeholder="081-234-5678" /></Field>
                <Field label="ความสัมพันธ์"><Input value={p.relationship ?? ""} onChange={(e) => setParent(i, { relationship: e.target.value || undefined })} placeholder="คุณแม่ / คุณพ่อ" /></Field>
                <Field label="อีเมล"><Input type="email" value={p.email ?? ""} onChange={(e) => setParent(i, { email: e.target.value || undefined })} /></Field>
                <Field label="วันเกิด"><Input type="date" value={p.birthDate ?? ""} onChange={(e) => setParent(i, { birthDate: e.target.value || undefined })} /></Field>
              </div>
            </div>
          ))}
          <Button size="xs" variant="outline" onClick={() => setF({ ...f, parents: [...f.parents, { name: "", phone: "", lineLinked: false, primary: false }] })}><PlusIcon /> เพิ่มผู้ปกครอง</Button>
        </div>

        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <Field label="ที่อยู่"><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="รหัสไปรษณีย์" error={err("postcode")}><Input inputMode="numeric" maxLength={5} value={f.postcode ?? ""} onChange={(e) => setF({ ...f, postcode: e.target.value || undefined })} /></Field>
        </div>

        <details className="rounded-xl border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">ข้อมูลใบกำกับภาษี (ไม่บังคับ)</summary>
          <div className="grid grid-cols-2 gap-2 border-t p-3">
            <Field label="ชื่อผู้เสียภาษี"><Input value={f.taxInfo?.customerName ?? ""} onChange={(e) => setF({ ...f, taxInfo: { customerName: e.target.value, taxId: f.taxInfo?.taxId ?? "", address: f.taxInfo?.address ?? "" } })} /></Field>
            <Field label="เลขผู้เสียภาษี"><Input value={f.taxInfo?.taxId ?? ""} onChange={(e) => setF({ ...f, taxInfo: { customerName: f.taxInfo?.customerName ?? "", taxId: e.target.value, address: f.taxInfo?.address ?? "" } })} placeholder="1-2345-67890-1" /></Field>
            <Field label="ที่อยู่ในใบกำกับภาษี" className="col-span-2"><Input value={f.taxInfo?.address ?? ""} onChange={(e) => setF({ ...f, taxInfo: { customerName: f.taxInfo?.customerName ?? "", taxId: f.taxInfo?.taxId ?? "", address: e.target.value } })} /></Field>
          </div>
        </details>

    </FormShell>
  )
}
