"use client"

import { useState } from "react"
import { PlusIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { validateFamily } from "@/domain/rules/people"
import type { Family } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { Field } from "./student-form"

/** Shared with families/page.tsx and the Inbox "create family from this conversation" flow. */
export function FamilyForm({ family, initialName, onClose, onSaved }: { family?: Family; initialName?: string; onClose: () => void; onSaved?: (f: Family) => void }) {
  const save = useStore((s) => s.saveFamily)
  const [f, setF] = useState<Family>(family ?? { id: uid("fa"), name: initialName ?? "", parents: [{ name: "", phone: "", lineLinked: false, primary: true }] })
  const [touched, setTouched] = useState(false)
  const errs = validateFamily(f)
  const err = (field: string) => touched && errs.find((e) => e.field === field)?.message
  const setParent = (i: number, patch: Partial<Family["parents"][number]>) => setF((x) => ({ ...x, parents: x.parents.map((p, j) => (j === i ? { ...p, ...patch } : patch.primary ? { ...p, primary: false } : p)) }))

  const submit = () => {
    setTouched(true)
    const r = save(f)
    if (report(r, "บันทึกครอบครัวแล้ว")) {
      onSaved?.(r.value)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{family ? `แก้ ${family.name}` : "เพิ่มครอบครัว"}</DialogTitle></DialogHeader>
        <Field label="ชื่อครอบครัว *" error={err("name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ครอบครัวสุขใจ" /></Field>
        <div className="space-y-2">
          {f.parents.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
              <Field label={`ผู้ปกครอง ${i + 1}`} error={err(`parent${i}.name`)}><Input value={p.name} onChange={(e) => setParent(i, { name: e.target.value })} placeholder="คุณแม่ สุดา" /></Field>
              <Field label="เบอร์โทร" error={err(`parent${i}.phone`)}><Input inputMode="tel" value={p.phone} onChange={(e) => setParent(i, { phone: e.target.value })} placeholder="081-234-5678" /></Field>
              <label className="flex h-8 items-center gap-1 text-xs"><input type="radio" checked={p.primary} onChange={() => setParent(i, { primary: true })} /> หลัก</label>
              <Button size="icon-sm" variant="ghost" disabled={f.parents.length === 1} aria-label="ลบ" onClick={() => setF({ ...f, parents: f.parents.filter((_, j) => j !== i) })}><TrashIcon /></Button>
            </div>
          ))}
          <Button size="xs" variant="outline" onClick={() => setF({ ...f, parents: [...f.parents, { name: "", phone: "", lineLinked: false, primary: false }] })}><PlusIcon /> เพิ่มผู้ปกครอง</Button>
        </div>
        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <Field label="ที่อยู่"><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="รหัสไปรษณีย์" error={err("postcode")}><Input inputMode="numeric" maxLength={5} value={f.postcode ?? ""} onChange={(e) => setF({ ...f, postcode: e.target.value || undefined })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
