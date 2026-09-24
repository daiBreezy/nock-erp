"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toDateStr } from "@/domain/dates"
import { validateStudent } from "@/domain/rules/people"
import type { Student } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { NativeSelect } from "./native-select"

/** Create / edit a student. Errors show under each field while typing (S4). */
export function StudentForm({ student, familyId, onClose, onSaved }: { student?: Student; familyId?: string; onClose: () => void; onSaved?: (s: Student) => void }) {
  const branch = useBranch()
  const families = useStore((s) => s.families)
  const save = useStore((s) => s.saveStudent)
  const today = toDateStr(useNow(60_000))
  const [f, setF] = useState<Student>(
    student ?? { id: uid("stu"), familyId: familyId ?? null, branchId: branch.id, name: "", nickname: "", grade: "", usesBus: false },
  )
  const [touched, setTouched] = useState(false)
  const errs = validateStudent(f, today)
  const err = (field: string) => touched && errs.find((e) => e.field === field)?.message
  const set = <K extends keyof Student>(k: K, v: Student[K]) => setF((x) => ({ ...x, [k]: v }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{student ? `แก้ข้อมูล ${student.nickname}` : "เพิ่มนักเรียน"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อ-นามสกุล *" error={err("name")} className="sm:col-span-2"><Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="ด.ญ. ใบเตย สุขใจ" /></Field>
          <Field label="ชื่อเล่น *" error={err("nickname")}><Input value={f.nickname} onChange={(e) => set("nickname", e.target.value)} /></Field>
          <Field label="ระดับชั้น *" error={err("grade")}>
            <NativeSelect value={f.grade} onChange={(e) => set("grade", e.target.value)} placeholder="เลือก" options={branch.grades.map((g) => ({ value: g, label: g }))} />
          </Field>
          <Field label="วันเกิด" error={err("birthDate")}><Input type="date" max={today} value={f.birthDate ?? ""} onChange={(e) => set("birthDate", e.target.value || undefined)} /></Field>
          <Field label="โรงเรียน"><Input value={f.school ?? ""} onChange={(e) => set("school", e.target.value)} /></Field>
          <Field label="ครอบครัว" className="sm:col-span-2">
            <NativeSelect value={f.familyId ?? ""} onChange={(e) => set("familyId", e.target.value || null)} placeholder="ยังไม่ผูกครอบครัว" options={families.map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Checkbox checked={f.usesBus} onCheckedChange={(v) => set("usesBus", !!v)} /> ใช้รถรับส่ง (ใบแจ้งหนี้จะติ๊กค่ารถให้อัตโนมัติ)
          </label>
          <Field label="หมายเหตุ (แพ้อาหาร, ข้อควรระวัง ฯลฯ)" className="sm:col-span-2"><Textarea rows={2} value={f.note ?? ""} onChange={(e) => set("note", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button
            onClick={() => {
              setTouched(true)
              const r = save(f)
              if (report(r, student ? "บันทึกแล้ว" : `เพิ่ม ${f.nickname} แล้ว`)) {
                onSaved?.(r.value)
                onClose()
              }
            }}
          >
            บันทึก
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function Field({ label, error, className, children }: { label: string; error?: string | false; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}</Label>
      {children}
      {error && <p className="mt-0.5 text-xs text-red-700">{error}</p>}
    </div>
  )
}
