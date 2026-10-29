"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { endTime, fmtDate, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { sessionState, subjectsOf } from "@/domain/rules/scheduling"
import { subjectColor } from "./subject-color"
import { cn } from "@/lib/utils"
import { findStudentDuplicates, validateStudent, type DuplicateHit } from "@/domain/rules/people"
import { DuplicateDialog } from "./duplicate-dialog"
import { gradeTone } from "./subject-color"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import { NativeSelect } from "./native-select"
import type { Klass, LeadSource, Student } from "@/domain/types"
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
  const allStudents = useStore((s) => s.students)
  const restore = useStore((s) => s.restoreStudent)
  const [dupes, setDupes] = useState<DuplicateHit<Student>[] | null>(null)
  // feedback Row 25 (owner 2026-10-29): put a new student into classes right here — one step, straight onto the calendar
  const classes = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const addToSession = useStore((s) => s.addStudentToSession)
  const staff = useStore((s) => s.staff)
  const [classIds, setClassIds] = useState<string[]>([])
  const now = useNow(60_000)
  const today = toDateStr(useNow(60_000))
  const [base] = useState<Student>(() => student ?? { id: uid("stu"), familyId: familyId ?? null, branchId: branch.id, name: "", nickname: "", grade: "", usesBus: false, createdAt: new Date().toISOString(), createdBranchId: branch.id })
  const [d, setD] = useState<StudentDraft>(() => (student ? studentDraftOf(student) : emptyStudentDraft()))
  const [staffOnly, setStaffOnly] = useState<{ familyId: string | null; usesBus: boolean; source?: LeadSource }>({ familyId: base.familyId, usesBus: base.usesBus, source: base.source })
  const [touched, setTouched] = useState(false)
  const [pickingFamily, setPickingFamily] = useState(false)
  const f: Student = { ...base, ...studentInputOf(d), ...staffOnly }
  // owner 2026-10-21: a new student says where they came from (the reports count walk-ins / social in their channel)
  const errs = [...validateStudent(f, today), ...(!student && !f.source ? [{ field: "source", message: "เลือกว่ามาจากช่องทางไหน" }] : [])]
  const err = (field: string) => (touched && errs.find((e) => e.field === field)?.message) || undefined
  const inPanel = useInPanel()
  const done = (saved: Student) => {
    onSaved?.(saved)
    // in a side panel the panel switches back to the information view itself
    if (!inPanel) onClose()
  }
  /** the next session of a class that hasn't started — the student joins from there on */
  const nextSession = (classId: string) => sessions.filter((x) => x.classId === classId && !x.cancelled && sessionState(x, now) === "upcoming").sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))[0]
  const joinClasses = (stu: Student) => {
    for (const cid of classIds) {
      const k = classes.find((c) => c.id === cid)
      const next = nextSession(cid)
      if (!next) { report({ ok: false, error: `${k?.name ?? "คลาส"} ไม่มีคาบข้างหน้า — เพิ่มทีหลังที่ปฏิทิน` }, ""); continue }
      report(addToSession(next.id, stu.id, "following"), (v) => `${stu.nickname} เข้าคลาส ${k?.name ?? ""} แล้ว · ${v.changed} คาบ (เริ่ม ${fmtDate(next.date, { weekday: true })})`)
    }
  }
  const saveNew = (x: Student) => {
    if (!student && !x.source) { report({ ok: false, error: "เลือกว่ามาจากช่องทางไหน" }, ""); return }
    const r = save(x)
    if (report(r, student ? "บันทึกแล้ว" : `เพิ่ม ${x.nickname} แล้ว`)) {
      if (!student) joinClasses(r.value)
      done(r.value)
    }
  }
  /** รวม: keep the record on file (bring it back if it had left) and fill in what was typed here */
  const mergeInto = (old: Student) => {
    if (old.archived && !report(restore(old.id), `${old.nickname} กลับมาเรียนแล้ว`)) return
    const merged: Student = {
      ...old, archived: undefined, grade: f.grade || old.grade, birthDate: f.birthDate ?? old.birthDate, school: f.school ?? old.school, schoolId: f.schoolId ?? old.schoolId,
      gender: f.gender ?? old.gender, familyId: old.familyId ?? f.familyId, usesBus: old.usesBus || f.usesBus, note: [old.note, f.note].filter(Boolean).join(" · ") || undefined,
    }
    const r = save(merged)
    if (report(r, `ใช้รายชื่อเดิมของ ${old.nickname} — ไม่ได้สร้างซ้ำ`)) { joinClasses(r.value); done(r.value) }
  }

  return (
    <FormShell className="sm:max-w-lg" onClose={onClose} title={student ? `แก้ข้อมูล ${student.nickname}` : "เพิ่มนักเรียน"}
      description="ช่องเดียวกับฟอร์มที่ผู้ปกครองกรอกใน LINE — ข้อมูลเก็บที่เดียวกัน"
      footer={<>
        <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
        <Button
          onClick={() => {
            setTouched(true)
            // name / nickname / grade first — "มาจากช่องทางไหน" only matters if this really is a new student
            const basic = validateStudent(f, today)
            if (basic.length) { report({ ok: false, error: basic[0].message }, ""); return }
            // owner 2026-10-29: a new student that may already be on file (returning / imported) → the admin decides
            const hits = student ? [] : findStudentDuplicates(f, allStudents, families)
            if (hits.length) { setDupes(hits); return }
            saveNew(f)
          }}
        >
          บันทึก
        </Button>
      </>}>
        <StudentFields t={DICT.th} value={d} onChange={(patch) => setD((x) => ({ ...x, ...patch }))} grades={branch.grades} province={branch.province} maxBirth={today}
          errors={{ name: err("name"), nickname: err("nickname"), grade: err("grade"), birthDate: err("birthDate") }} />
        <div className="space-y-3 rounded-2xl bg-muted/50 p-3">
          <p className="text-xs font-medium text-muted-foreground">สำหรับเจ้าหน้าที่</p>
          {!student && (
            <Field label="มาจากช่องทางไหน *" hint="ครอบครัวนี้รู้จักเราจากไหน — ใช้นับช่องทางในรายงาน (Walk-in / Social ที่ไม่ได้ทักผ่าน LINE ก็นับได้)" error={err("source")}>
              <NativeSelect className="bg-background" value={staffOnly.source ?? ""} placeholder="เลือกช่องทาง" onChange={(e) => setStaffOnly((x) => ({ ...x, source: (e.target.value || undefined) as LeadSource | undefined }))}
                options={(Object.keys(LEAD_SOURCE_LABEL) as LeadSource[]).map((k) => ({ value: k, label: LEAD_SOURCE_LABEL[k] }))} />
            </Field>
          )}
          <Field label="ครอบครัว">
            <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-1.5 text-sm">
              <span className={staffOnly.familyId ? "font-medium" : "text-muted-foreground"}>{families.find((x) => x.id === staffOnly.familyId)?.name ?? "ยังไม่ผูกครอบครัว"}</span>
              <button type="button" className="ml-auto text-xs text-primary underline" onClick={() => setPickingFamily(true)}>{staffOnly.familyId ? "เปลี่ยน" : "เลือกครอบครัว"}</button>
              {staffOnly.familyId && <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setStaffOnly((x) => ({ ...x, familyId: null }))}>เอาออก</button>}
            </div>
            {pickingFamily && <CustomerPicker kinds={["family"]} title="เลือกครอบครัว" onClose={() => setPickingFamily(false)} onConfirm={(row) => { setStaffOnly((x) => ({ ...x, familyId: row.id })); setPickingFamily(false) }} />}
          </Field>
          {!student && (
            <Field label="เข้าคลาส (ไม่บังคับ)" hint="เลือกคลาสที่จะเรียน — บันทึกแล้วนักเรียนเข้าคลาสตั้งแต่คาบถัดไปเลย ขึ้นปฏิทินทันที · ยังไม่จ่ายเงินระบบจะเตือนในคาบให้ออกใบแจ้งหนี้">
              <ClassPicker classes={classes.filter((k) => k.branchId === branch.id && k.active && k.kind === "learning")} grade={f.grade} picked={classIds}
                onToggle={(id) => setClassIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))}
                teacherName={(id) => staff.find((t) => t.id === id)?.nickname ?? "ยังไม่มีครู"} hasNext={(id) => !!nextSession(id)} />
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={staffOnly.usesBus} onCheckedChange={(v) => setStaffOnly((x) => ({ ...x, usesBus: !!v }))} /> ใช้รถรับส่ง (ใบแจ้งหนี้จะติ๊กค่ารถให้อัตโนมัติ)
          </label>
        </div>
      {dupes && (
        <DuplicateDialog title="พบนักเรียนที่อาจซ้ำ" description="ระบบพบนักเรียนที่อาจเป็นคนเดียวกัน — ถ้าใช่ ให้รวมกับรายชื่อเดิม ถ้าไม่ใช่ ให้เพิ่มเป็นนักเรียนใหม่" hits={dupes} mergeLabel="รวม — ใช้รายชื่อนี้" newLabel="ไม่ใช่ — เพิ่มเป็นนักเรียนใหม่"
          onClose={() => setDupes(null)} onNew={() => { setDupes(null); saveNew(f) }} onMerge={(old) => { setDupes(null); mergeInto(old) }}
          render={(x) => (
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{x.nickname}</span><span className="text-muted-foreground">{x.name}</span>
              <span className={`rounded-md px-1.5 text-xs font-semibold ${gradeTone(x.grade)}`}>{x.grade}</span>
              <span className="text-xs text-muted-foreground">{families.find((y) => y.id === x.familyId)?.name ?? "ไม่มีครอบครัว"}</span>
              {x.archived && <span className="rounded-full bg-muted px-2 text-[11px] text-muted-foreground">ออกไปแล้ว</span>}
            </span>
          )} />
      )}
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

/** classes to join (Row 25) — the student's grade first, then the rest; tap to pick, several allowed */
function ClassPicker({ classes, grade, picked, onToggle, teacherName, hasNext }: { classes: Klass[]; grade: string; picked: string[]; onToggle: (id: string) => void; teacherName: (id: string | null) => string; hasNext: (id: string) => boolean }) {
  const fits = (k: Klass) => !grade || !k.grades.length || k.grades.includes(grade)
  const list = [...classes].sort((a, b) => Number(fits(b)) - Number(fits(a)) || ((a.weekday + 6) % 7) - ((b.weekday + 6) % 7) || a.start.localeCompare(b.start))
  if (!list.length) return <p className="text-xs text-muted-foreground">สาขานี้ยังไม่มีคลาส</p>
  return (
    <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border bg-background p-1">
      {list.map((k) => {
        const on = picked.includes(k.id)
        const next = hasNext(k.id)
        return (
          <li key={k.id}>
            <button type="button" aria-pressed={on} disabled={!next} onClick={() => onToggle(k.id)}
              className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm", on ? "bg-primary/10 ring-1 ring-primary ring-inset" : "hover:bg-muted", !fits(k) && !on && "opacity-60", !next && "cursor-not-allowed opacity-40")}>
              <span className="flex gap-1">{subjectsOf(k).map((x) => <span key={x} className={cn("rounded-full px-1.5 text-[11px] font-medium", subjectColor(x).chip)}>{x}</span>)}</span>
              <span className="min-w-0 flex-1 truncate font-medium">{k.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{TH_DAYS_FULL[k.weekday]} {k.start}–{endTime(k.start, k.minutes)} · {teacherName(k.teacherId)} · {k.studentIds.length} คน</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
