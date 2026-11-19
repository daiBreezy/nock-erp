"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { FormShell } from "@/components/app/form-shell"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/app/native-select"
import { Segmented } from "@/components/app/page-layout"
import { subjectColor } from "@/components/app/subject-color"
import { addDays, fmtDate, toDateStr } from "@/domain/dates"
import { leadSubjects } from "@/domain/rules/crm"
import { FORM_TYPE_LABEL, findOfferSlots } from "@/domain/rules/forms"
import type { FormPick, FormSubmission, FormType, Lead } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Mode = "none" | FormType

/**
 * Staff fill in a Lead's child — and, optionally, book the test / trial — right inside the ERP (owner 2026-11-18):
 * for a walk-in or a phone call there is no LINE and no form to send. It goes through the same rules as an approved
 * parent form (`addLeadChild` → family + student; `approveTestTrialSubmission` → conflict-checked booking), but staff are
 * the ones filling it in, so there is nothing left to approve.
 */
export function LeadChildDialog({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const now = useNow()
  const branch = useStore((s) => s.branches.find((b) => b.id === lead.branchId))
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const students = useStore((s) => s.students)
  const addChild = useStore((s) => s.addLeadChild)
  const approve = useStore((s) => s.approveTestTrialSubmission)

  const child = lead.trialStudentId ? students.find((x) => x.id === lead.trialStudentId) : undefined

  const [name, setName] = useState("")
  const [nickname, setNickname] = useState("")
  const [grade, setGrade] = useState(lead.childGrade || branch?.grades[0] || "")
  const [birthDate, setBirthDate] = useState("")
  const [school, setSchool] = useState("")
  const [parentName, setParentName] = useState(lead.name)
  const [parentPhone, setParentPhone] = useState(lead.phone)
  const [mode, setMode] = useState<Mode>(child ? "test" : "none")
  const [subjects, setSubjects] = useState<string[]>(leadSubjects(lead).slice(0, 1))
  const [slotOf, setSlotOf] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const from = toDateStr(now)
  const slots = useMemo(() => {
    if (!branch || mode === "none") return {}
    return Object.fromEntries(subjects.map((subject) => [subject, findOfferSlots({ branch, staff, sessions, classes, holidays, subject, from, to: addDays(from, 28), now })]))
  }, [branch, mode, subjects, staff, sessions, classes, holidays, from, now])

  if (!branch) return null

  const toggleSubject = (x: string) => setSubjects((cur) => (cur.includes(x) ? cur.filter((y) => y !== x) : [...cur, x]))
  const picks: FormPick[] = subjects.flatMap((subject) => {
    const slot = slots[subject]?.find((x) => x.id === slotOf[subject])
    return slot ? [{ chosenSubject: subject, chosenSlot: slot }] : []
  })
  const booking = mode !== "none"
  const bookingReady = !booking || (subjects.length > 0 && picks.length === subjects.length)
  const childReady = !!child || (!!name.trim() && !!grade && !!parentName.trim())

  const save = () => {
    setBusy(true)
    let studentId = child?.id
    if (!child) {
      const r = addChild(lead.id, { name, nickname, grade, birthDate: birthDate || undefined, school, parentName, parentPhone })
      if (!report(r, `เพิ่มลูก "${name}" แล้ว`)) { setBusy(false); return }
      studentId = r.ok ? r.value.studentId : undefined
    }
    if (booking && studentId) {
      const st = useStore.getState()
      const stu = st.students.find((x) => x.id === studentId)!
      const sub: FormSubmission = {
        id: `sub_${Date.now().toString(36)}`, token: "", type: mode as FormType, groupId: `grp_${Date.now().toString(36)}`,
        primaryLeadId: lead.id, leadId: lead.id, branchId: lead.branchId, conversationId: null, lineUserId: lead.lineUserId ?? "",
        parents: [{ name: parentName, phone: parentPhone, primary: true }],
        studentName: stu.name, studentNickname: stu.nickname, studentGrade: stu.grade, studentBirthDate: stu.birthDate, studentSchool: stu.school,
        picks, status: "approved", submittedAt: now.toISOString(),
      }
      const r = approve(sub)
      if (!report(r, `นัด${FORM_TYPE_LABEL[mode as FormType]}แล้ว`)) { setBusy(false); return }
    }
    setBusy(false)
    onClose()
  }

  return (
    <FormShell className="sm:max-w-lg" onClose={onClose} title={child ? `นัดสอบ / ทดลองเรียน · ${child.nickname}` : `เพิ่มลูก · ${lead.name}`}
      description="กรอกเองในระบบได้เลย (Walk-in / โทร) — ผ่านกฎเดียวกับฟอร์มที่ผู้ปกครองกรอก แต่ไม่ต้องรออนุมัติ"
      footer={<><Button variant="ghost" onClick={onClose}>ยกเลิก</Button><Button disabled={busy || !childReady || !bookingReady || (!child && mode === "none" && !name.trim())} onClick={save}>{booking ? `บันทึก + นัด${FORM_TYPE_LABEL[mode as FormType]}` : "บันทึก"}</Button></>}>
      {!child && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">ลูก</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ชื่อ-นามสกุล *" className="sm:col-span-2"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น ใบเตย สุขใจ" /></Field>
            <Field label="ชื่อเล่น"><Input value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="ถ้าไม่ใส่ ระบบตั้งให้" /></Field>
            <Field label="ระดับชั้น *"><NativeSelect value={grade} onChange={(e) => setGrade(e.target.value)} options={branch.grades.map((g) => ({ value: g, label: g }))} /></Field>
            <Field label="วันเกิด"><Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} /></Field>
            <Field label="โรงเรียน"><Input value={school} onChange={(e) => setSchool(e.target.value)} /></Field>
          </div>
        </section>
      )}
      {!child && (
        <section className="space-y-3 border-t pt-4">
          <h3 className="text-sm font-semibold">ผู้ปกครอง</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="ชื่อ *"><Input value={parentName} onChange={(e) => setParentName(e.target.value)} /></Field>
            <Field label="เบอร์โทร"><Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} placeholder="0812345678" /></Field>
          </div>
        </section>
      )}

      <section className="space-y-3 border-t pt-4 first:border-t-0 first:pt-0">
        <h3 className="text-sm font-semibold">นัดตอนนี้เลยไหม</h3>
        <Segmented<Mode> value={mode} onChange={setMode} options={[
          ...(child ? [] : [{ value: "none" as const, label: "ยังไม่นัด" }]),
          { value: "test", label: FORM_TYPE_LABEL.test },
          { value: "trial", label: FORM_TYPE_LABEL.trial },
        ]} />
        {booking && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {branch.subjects.map((x) => {
                const on = subjects.includes(x)
                return (
                  <Button variant="ghost" size="inline" key={x} type="button" aria-pressed={on} onClick={() => toggleSubject(x)}
                    className={cn("rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset", on ? cn(subjectColor(x).chip, "ring-transparent") : "text-muted-foreground ring-border hover:bg-muted")}>
                    {x}
                  </Button>
                )
              })}
            </div>
            {subjects.map((subject) => {
              const list = slots[subject] ?? []
              return (
                <Field key={subject} label={`ช่วงเวลา ${subject} *`}>
                  <NativeSelect value={slotOf[subject] ?? ""} onChange={(e) => setSlotOf((cur) => ({ ...cur, [subject]: e.target.value }))}
                    placeholder={list.length ? "เลือกช่วงเวลา" : "ไม่มีช่วงว่างใน 4 สัปดาห์"} disabled={!list.length}
                    options={list.map((x) => ({ value: x.id, label: `${fmtDate(x.date, { weekday: true })} ${x.start}${x.source === "class" ? " · เข้าคลาสที่มีอยู่" : ""}` }))} />
                </Field>
              )
            })}
          </div>
        )}
      </section>
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
