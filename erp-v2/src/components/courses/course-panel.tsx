"use client"

// Course side panel (owner 2026-10-09): click a course → its information; แก้ไข switches the same panel to the form;
// สร้างคอร์ส opens it empty and turns into the information view once saved. Header · Body · Bottom like every panel.
import { useState } from "react"
import { CalendarIcon, ClockIcon, CopyIcon, DoorOpenIcon, LayersIcon, PencilIcon, PowerIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { EntityPanel, PanelBody, PanelFooter, PanelForm } from "@/components/app/form-shell"
import { PackageBadge } from "@/components/app/package-badge"
import { gradeTone, subjectColor } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { endTime, fmtDate, fmtMoney, TH_DAYS_FULL } from "@/domain/dates"
import { priceUnitSuffix } from "@/domain/rules/course"
import { can } from "@/domain/rules/permissions"
import { gradeRanges } from "@/domain/rules/settings"
import type { Course, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useLookup } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { CourseDialog } from "./course-dialog"

export type CourseStats = { students: number; revenue: number; classes: number }

/** target: a course id, or a new (unsaved) course to create */
export function CoursePanel({ target, stats, onClose }: { target: ID | Course | null; stats: (id: ID) => CourseStats | undefined; onClose: () => void }) {
  const [createdId, setCreatedId] = useState<ID | null>(null)
  const isNew = !!target && typeof target === "object"
  const [editing, setEditing] = useState(isNew)
  const id = isNew ? createdId : (target as ID | null)
  const course = useStore((s) => (id ? s.courses.find((c) => c.id === id) : undefined))
  const branches = useStore((s) => s.branches)
  const draft = isNew && !createdId ? (target as Course) : course
  const branch = branches.find((b) => b.id === draft?.branchId)
  return (
    <EntityPanel open={!!target} onClose={onClose} wide>
      {editing && draft && branch ? (
        <PanelForm>
          <CourseDialog key={draft.id} branch={branch} initial={draft}
            onClose={() => (course ? setEditing(false) : onClose())}
            onSaved={(c) => { if (isNew) setCreatedId(c.id); setEditing(false) }} />
        </PanelForm>
      ) : course ? <CourseView c={course} st={stats(course.id)} onEdit={() => setEditing(true)} /> : null}
    </EntityPanel>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 py-1.5 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}

function CourseView({ c, st, onEdit }: { c: Course; st?: CourseStats; onEdit: () => void }) {
  const me = useStore((s) => s.me())
  const classes = useStore((s) => s.classes)
  const branches = useStore((s) => s.branches)
  const save = useStore((s) => s.saveCourse)
  const duplicate = useStore((s) => s.duplicateCourse)
  const L = useLookup()
  const manage = can(me, "course.manage")
  const br = branches.find((b) => b.id === c.branchId)
  const linked = classes.filter((k) => k.courseId === c.id)
  const col = subjectColor(c.subjects[0] ?? "")
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-3">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-sm font-semibold", col.chip)}>{c.subjects[0]?.slice(0, 2)}</span>
          <div className="min-w-0">
            <SheetTitle className="text-lg">{c.name}</SheetTitle>
            <SheetDescription className="truncate">{c.subjects.join(" + ")} · {br?.name}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <Pill tone={c.kind === "bundle" ? "violet" : "gray"}>{c.kind === "bundle" ? <><LayersIcon className="size-3" /> Bundle</> : "Single"}</Pill>
          <Pill tone={c.active ? "green" : "gray"}>{c.active ? "เปิดขาย" : "ปิดขาย"}</Pill>
          <PackageBadge course={c} />
        </div>
      </SheetHeader>
      <PanelBody>
        <div className="flex divide-x rounded-2xl bg-muted/50 py-2 text-center">
          <div className="flex-1"><p className="text-[11px] text-muted-foreground">นักเรียนที่เรียนอยู่</p><p className="text-lg font-semibold tabular-nums">{st?.students ?? 0}</p></div>
          <div className="flex-1"><p className="text-[11px] text-muted-foreground">คลาสที่ผูก</p><p className="text-lg font-semibold tabular-nums">{linked.length}</p></div>
          <div className="flex-1"><p className="text-[11px] text-muted-foreground">รายได้ (ชำระแล้ว)</p><p className="text-lg font-semibold tabular-nums">{fmtMoney(st?.revenue ?? 0)}</p></div>
        </div>
        <section className="divide-y rounded-2xl border px-3">
          <Row label="ระดับชั้น"><span className="flex flex-wrap gap-1">{gradeRanges(c.grades).map((g) => <span key={g} className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold", gradeTone(g))}>{g}</span>)}</span></Row>
          <Row label="ราคา"><span className="font-medium">{fmtMoney(c.price)}</span> <span className="text-xs text-muted-foreground">{priceUnitSuffix(c)}</span>{c.courseFee > 0 && <span className="text-xs text-muted-foreground"> · + Course fee {fmtMoney(c.courseFee)}</span>}</Row>
          {c.priceReason && <Row label="เหตุผลราคา">{c.priceReason}</Row>}
          <Row label="เรียนแบบ">{c.format === "single" ? "เรียนเดี่ยว" : "กลุ่ม"}</Row>
          <Row label="ช่วงเปิดขาย">{c.from || c.to ? `${c.from ? fmtDate(c.from, { year: true }) : "…"} – ${c.to ? fmtDate(c.to, { year: true }) : "…"}` : "เปิดตลอด"}</Row>
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">คลาสที่ผูกกับคอร์สนี้</h3>
          {linked.length === 0 ? <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">ยังไม่มีคลาสผูก — เลือกคอร์สได้ตอนสร้างคลาส</p> : (
            <ul className="divide-y rounded-2xl border">
              {linked.map((k) => (
                <li key={k.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2.5 text-sm">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(k.subject).chip)}>{k.subject}</span>
                  <span className="flex items-center gap-1 text-xs"><CalendarIcon className="size-3.5 text-muted-foreground" />{TH_DAYS_FULL[k.weekday]}</span>
                  <span className="flex items-center gap-1 text-xs tabular-nums"><ClockIcon className="size-3.5 text-muted-foreground" />{k.start}–{endTime(k.start, k.minutes)}</span>
                  <span className="flex items-center gap-1 text-xs"><DoorOpenIcon className="size-3.5 text-muted-foreground" />{br?.rooms.find((r) => r.id === k.roomId)?.name ?? "—"}</span>
                  <span className="text-xs text-muted-foreground">{L.teacher(k.teacherId).label} · {k.studentIds.length} คน</span>
                  {!k.active && <Pill className="ml-auto">Inactive</Pill>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </PanelBody>
      {manage && (
        <PanelFooter>
          <Button variant="ghost" className={c.active ? "text-red-700" : undefined} onClick={() => report(save({ ...c, active: !c.active }), c.active ? "ปิดขายคอร์สแล้ว" : "เปิดขายคอร์สแล้ว")}><PowerIcon /> {c.active ? "ปิดขาย" : "เปิดขาย"}</Button>
          <Button variant="outline" className="ml-auto" onClick={() => report(duplicate(c.id), "ทำสำเนาคอร์สแล้ว — แก้ชื่อ/ระดับชั้นต่อได้")}><CopyIcon /> ทำสำเนา</Button>
          <Button onClick={onEdit}><PencilIcon /> แก้ไข</Button>
        </PanelFooter>
      )}
    </>
  )
}
