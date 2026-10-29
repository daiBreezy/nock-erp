"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { FormShell, useInPanel } from "@/components/app/form-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LEAD_SOURCE_LABEL, leadSubjects } from "@/domain/rules/crm"
import { subjectColor } from "@/components/app/subject-color"
import { cn } from "@/lib/utils"
import { can } from "@/domain/rules/permissions"
import type { Lead } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { NativeSelect } from "../app/native-select"

const SOURCES: Lead["source"][] = ["line", "walkin", "phone", "website", "referral", "other"]

/** create a lead, or edit one (`lead`) — owner 2026-10-09: leads are edited in their panel, not in the table */
export function LeadDialog({ onClose, initialName, initial, onSaved, lead: editing }: { onClose: () => void; initialName?: string; initial?: Partial<Pick<Lead, "source" | "assigneeId">>; onSaved?: (lead: Lead) => void; lead?: Lead }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const saveLead = useStore((s) => s.saveLead)
  const now = useNow()

  const [name, setName] = useState(editing?.name ?? initialName ?? "")
  const [childGrade, setChildGrade] = useState(editing?.childGrade ?? branch.grades[0] ?? "")
  // owner 2026-10-29: a family can be interested in more than one subject — tick every one; the first is the main one
  const [subjects, setSubjects] = useState<string[]>(editing ? leadSubjects(editing) : branch.subjects.slice(0, 1))
  const subject = subjects[0] ?? ""
  const toggleSubject = (x: string) => setSubjects((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]))
  const [source, setSource] = useState<Lead["source"]>(editing?.source ?? initial?.source ?? "line")
  const [phone, setPhone] = useState(editing?.phone ?? "")
  const [lineId, setLineId] = useState(editing?.lineId ?? "")
  const [assigneeId, setAssigneeId] = useState(editing?.assigneeId ?? initial?.assigneeId ?? "")
  const inPanel = useInPanel()

  const assignable = staff.filter((s) => s.active && s.branchIds.includes(branch.id) && can(s, "lead.manage"))

  const submit = () => {
    const lead: Lead = editing
      ? { ...editing, name, childGrade, subject, subjects, source, assigneeId: assigneeId || null, phone, lineId }
      : {
        id: `ld_${Date.now().toString(36)}`, branchId: branch.id, name, childGrade, subject, subjects, source,
        stage: "new", assigneeId: assigneeId || null, phone, lineId, createdAt: now.toISOString(), notes: [], convertedStudentId: null,
      }
    const r = saveLead(lead)
    if (report(r, editing ? "บันทึก Lead แล้ว" : `เพิ่ม Lead "${name}" แล้ว`)) {
      onSaved?.(lead)
      if (!inPanel) onClose()
    }
  }

  return (
    <FormShell className="sm:max-w-md" onClose={onClose} title={editing ? `แก้ไข ${editing.name}` : "เพิ่ม Lead ใหม่"}
      description={editing ? undefined : <>สาขา{branch.name} — เข้าไปป์ไลน์ที่คอลัมน์ &quot;ลูกค้าใหม่&quot;</>}
      footer={<><Button variant="ghost" onClick={onClose}>ยกเลิก</Button><Button disabled={!name.trim() || !phone.trim()} onClick={submit}>{editing ? "บันทึก" : "เพิ่ม Lead"}</Button></>}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อผู้ปกครอง/ผู้ติดต่อ *" className="sm:col-span-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ปราณี ใจดี (ไม่ต้องใส่ คุณแม่/คุณพ่อ)" />
          </Field>
          <Field label="ระดับชั้นของลูก *">
            <NativeSelect value={childGrade} onChange={(e) => setChildGrade(e.target.value)} options={branch.grades.map((g) => ({ value: g, label: g }))} />
          </Field>
          <Field label="วิชาที่สนใจ * (เลือกได้หลายวิชา)" className="sm:col-span-2">
            <div className="flex flex-wrap gap-1.5">
              {branch.subjects.map((x) => {
                const on = subjects.includes(x)
                return (
                  <button key={x} type="button" aria-pressed={on} onClick={() => toggleSubject(x)}
                    className={cn("rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset", on ? cn(subjectColor(x).chip, "ring-transparent") : "text-muted-foreground ring-border hover:bg-muted")}>
                    {x}
                  </button>
                )
              })}
            </div>
          </Field>
          <Field label="ช่องทาง">
            <NativeSelect value={source} onChange={(e) => setSource(e.target.value as Lead["source"])} options={SOURCES.map((s) => ({ value: s, label: LEAD_SOURCE_LABEL[s] }))} />
          </Field>
          <Field label="ผู้ดูแล">
            <NativeSelect value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} placeholder="ยังไม่มอบหมาย" options={assignable.map((s) => ({ value: s.id, label: s.nickname }))} />
          </Field>
          <Field label="เบอร์โทร *">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0812345678" />
          </Field>
          <Field label="LINE ID">
            <Input value={lineId} onChange={(e) => setLineId(e.target.value)} placeholder="@line_id" />
          </Field>
        </div>
    </FormShell>
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
