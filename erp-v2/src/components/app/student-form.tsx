"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toDateStr } from "@/domain/dates"
import { validateStudent } from "@/domain/rules/people"
import type { Student } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { CustomerPicker } from "./customer-picker"
import { DICT } from "@/app/liff/form/i18n"
import { emptyStudentDraft, StudentFields, studentDraftOf, studentInputOf, type StudentDraft } from "@/components/people/person-fields"
import { FormShell, useInPanel } from "./form-shell"
import { InfoTip } from "./info-tip"

/**
 * Create / edit a student. Errors show under each field while typing (S4).
 * owner 2026-10-15: the child fields are exactly the parent's LINE form (components/people/person-fields) — only
 * the family link and the bus are staff-only (they're decided here / on the invoice, not by the parent).
 */
export function StudentForm({ student, familyId, onClose, onSaved }: { student?: Student; familyId?: string; onClose: () => void; onSaved?: (s: Student) => void }) {
  const branch = useBranch()
  const families = useStore((s) => s.families)
  const save = useStore((s) => s.saveStudent)
  const today = toDateStr(useNow(60_000))
  const [base] = useState<Student>(() => student ?? { id: uid("stu"), familyId: familyId ?? null, branchId: branch.id, name: "", nickname: "", grade: "", usesBus: false, createdAt: new Date().toISOString(), createdBranchId: branch.id })
  const [d, setD] = useState<StudentDraft>(() => (student ? studentDraftOf(student) : emptyStudentDraft()))
  const [staffOnly, setStaffOnly] = useState({ familyId: base.familyId, usesBus: base.usesBus })
  const [touched, setTouched] = useState(false)
  const [pickingFamily, setPickingFamily] = useState(false)
  const f: Student = { ...base, ...studentInputOf(d), ...staffOnly }
  const errs = validateStudent(f, today)
  const err = (field: string) => (touched && errs.find((e) => e.field === field)?.message) || undefined
  const inPanel = useInPanel()

  return (
    <FormShell className="sm:max-w-lg" onClose={onClose} title={student ? `แก้ข้อมูล ${student.nickname}` : "เพิ่มนักเรียน"}
      description="ช่องเดียวกับฟอร์มที่ผู้ปกครองกรอกใน LINE — ข้อมูลเก็บที่เดียวกัน"
      footer={<>
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button
          onClick={() => {
            setTouched(true)
            const r = save(f)
            if (report(r, student ? "บันทึกแล้ว" : `เพิ่ม ${f.nickname} แล้ว`)) {
              onSaved?.(r.value)
              // in a side panel the panel switches back to the information view itself
              if (!inPanel) onClose()
            }
          }}
        >
          บันทึก
        </Button>
      </>}>
        <StudentFields t={DICT.th} value={d} onChange={(patch) => setD((x) => ({ ...x, ...patch }))} grades={branch.grades} province={branch.province} maxBirth={today}
          errors={{ name: err("name"), nickname: err("nickname"), grade: err("grade"), birthDate: err("birthDate") }} />
        <div className="space-y-3 rounded-2xl bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">สำหรับเจ้าหน้าที่</p>
          <Field label="ครอบครัว">
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 text-sm">
              <span className={staffOnly.familyId ? "font-medium" : "text-muted-foreground"}>{families.find((x) => x.id === staffOnly.familyId)?.name ?? "ยังไม่ผูกครอบครัว"}</span>
              <button type="button" className="ml-auto text-xs text-primary underline" onClick={() => setPickingFamily(true)}>{staffOnly.familyId ? "เปลี่ยน" : "เลือกครอบครัว"}</button>
              {staffOnly.familyId && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setStaffOnly((x) => ({ ...x, familyId: null }))}>เอาออก</button>}
            </div>
            {pickingFamily && <CustomerPicker kinds={["family"]} title="เลือกครอบครัว" onClose={() => setPickingFamily(false)} onConfirm={(row) => { setStaffOnly((x) => ({ ...x, familyId: row.id })); setPickingFamily(false) }} />}
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={staffOnly.usesBus} onCheckedChange={(v) => setStaffOnly((x) => ({ ...x, usesBus: !!v }))} /> ใช้รถรับส่ง (ใบแจ้งหนี้จะติ๊กค่ารถให้อัตโนมัติ)
          </label>
        </div>
    </FormShell>
  )
}

/** `hint` = the explanation behind an ⓘ next to the label (owner 2026-10-13: no grey helper lines under fields) */
export function Field({ label, hint, error, className, children }: { label: React.ReactNode; hint?: React.ReactNode; error?: string | false; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <Label className="mb-1 text-xs">{label}{hint && <InfoTip text={hint} className="-my-1" />}</Label>
      {children}
      {error && <p className="mt-0.5 text-xs text-red-700">{error}</p>}
    </div>
  )
}
