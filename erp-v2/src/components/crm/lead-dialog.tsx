"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import type { Lead } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { NativeSelect } from "../app/native-select"

const SOURCES: Lead["source"][] = ["line", "walkin", "website", "referral", "other"]

export function LeadDialog({ onClose, initialName, onSaved }: { onClose: () => void; initialName?: string; onSaved?: (lead: Lead) => void }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const saveLead = useStore((s) => s.saveLead)
  const now = useNow()

  const [name, setName] = useState(initialName ?? "")
  const [childGrade, setChildGrade] = useState(branch.grades[0] ?? "")
  const [subject, setSubject] = useState(branch.subjects[0] ?? "")
  const [source, setSource] = useState<Lead["source"]>("line")
  const [phone, setPhone] = useState("")
  const [lineId, setLineId] = useState("")
  const [assigneeId, setAssigneeId] = useState("")

  const assignable = staff.filter((s) => s.active && s.branchIds.includes(branch.id) && (s.roles.includes("admin") || s.roles.includes("manager") || s.roles.includes("director")))

  const submit = () => {
    const lead: Lead = {
      id: `ld_${Date.now().toString(36)}`, branchId: branch.id, name, childGrade, subject, source,
      stage: "new", assigneeId: assigneeId || null, phone, lineId, createdAt: now.toISOString(), notes: [], convertedStudentId: null,
    }
    const r = saveLead(lead)
    if (report(r, `เพิ่ม Lead "${name}" แล้ว`)) {
      onSaved?.(lead)
      onClose()
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เพิ่ม Lead ใหม่</DialogTitle>
          <DialogDescription>สาขา{branch.name} — เข้าไปป์ไลน์ที่คอลัมน์ &quot;ลูกค้าใหม่&quot;</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อผู้ปกครอง/ผู้ติดต่อ *" className="sm:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น คุณแม่ ปราณี" />
          </Field>
          <Field label="ระดับชั้นของลูก *">
            <NativeSelect value={childGrade} onChange={(e) => setChildGrade(e.target.value)} options={branch.grades.map((g) => ({ value: g, label: g }))} />
          </Field>
          <Field label="วิชาที่สนใจ *">
            <NativeSelect value={subject} onChange={(e) => setSubject(e.target.value)} options={branch.subjects.map((s) => ({ value: s, label: s }))} />
          </Field>
          <Field label="ช่องทาง">
            <NativeSelect value={source} onChange={(e) => setSource(e.target.value as Lead["source"])} options={SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABEL[s] }))} />
          </Field>
          <Field label="ผู้ดูแล">
            <NativeSelect value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="ยังไม่มอบหมาย" options={assignable.map((s) => ({ value: s.id, label: s.nickname }))} />
          </Field>
          <Field label="เบอร์โทร *">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="081-234-5678" />
          </Field>
          <Field label="LINE ID">
            <Input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="@line_id" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!name.trim() || !phone.trim()} onClick={submit}>เพิ่ม Lead</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
    </div>
  )
}
