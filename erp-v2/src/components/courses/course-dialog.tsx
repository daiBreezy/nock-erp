"use client"

import { useState } from "react"
import { AlertTriangleIcon, CheckIcon, ChevronDownIcon, LayersIcon, MapPinIcon, StarIcon, TagIcon, UserIcon, UsersIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { fmtMoney } from "@/domain/dates"
import { chartPrice, defaultCourseName, needsPriceReason } from "@/domain/rules/course"
import { durationLabel, durationsOf, GRADE_GROUPS, PRICE_UNIT_LABEL, priceRange, sortGrades } from "@/domain/rules/settings"
import type { Branch, Course, PriceUnit } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const UNITS: PriceUnit[] = ["hour", "week", "month"]

export function emptyCourse(branch: Branch): Course {
  return {
    id: uid("co"), branchId: branch.id, name: "", kind: "single", format: "group", subjects: branch.subjects.slice(0, 1), grades: [],
    unit: "month", duration: 1, price: 0, courseFee: 0, active: true,
  }
}

/** Create / Edit Course — same fields as staging (teachers are set per Class, not here). */
export function CourseDialog({ branch, initial, onClose }: { branch: Branch; initial: Course; onClose: () => void }) {
  const save = useStore((s) => s.saveCourse)
  const isNew = !useStore((s) => s.courses.some((c) => c.id === initial.id))
  const [c, setC] = useState<Course>(initial)
  const [priceTouched, setPriceTouched] = useState(!isNew)
  const [dated, setDated] = useState(!!(initial.from || initial.to))
  const [showPlans, setShowPlans] = useState(false)

  const chart = chartPrice(branch, c)
  // until the price is edited by hand it follows the chart, like staging's "auto-filled from the branch chart"
  const set = (patch: Partial<Course>) => {
    const next = { ...c, ...patch }
    const cp = chartPrice(branch, next).price
    setC(!priceTouched && cp !== null ? { ...next, price: cp } : next)
  }
  const durations = durationsOf(branch, c.unit)
  const reasonNeeded = c.grades.length > 0 && needsPriceReason(branch, c)
  const allGrades = sortGrades(branch.grades)

  const toggleSubject = (s: string) =>
    set({ subjects: c.kind === "single" ? [s] : c.subjects.includes(s) ? c.subjects.filter((x) => x !== s) : [...c.subjects, s] })

  const submit = () => {
    const out = dated ? c : { ...c, from: undefined, to: undefined }
    if (report(save(out), isNew ? "สร้างคอร์สแล้ว" : "บันทึกคอร์สแล้ว")) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "สร้างคอร์ส" : "แก้ไขคอร์ส"}</DialogTitle>
          <DialogDescription>ครูผู้สอนตั้งที่ Create Class — คอร์สกำหนดวิชา ระดับชั้น แพ็กเกจ และราคา</DialogDescription>
        </DialogHeader>

        {/* branch card + package plans (staging) */}
        <div className="rounded-2xl bg-muted/40 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <MapPinIcon className="size-4 text-primary" />
            <span className="font-medium">สาขา{branch.name}</span>
            <span className="text-xs text-muted-foreground">คอร์ส คลาส และคาบเรียนจะอยู่ในสาขานี้</span>
            <button type="button" onClick={() => setShowPlans(!showPlans)} className="ml-auto flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs">
              <TagIcon className="size-3.5 text-primary" />
              <b>{UNITS.reduce((n, u) => n + durationsOf(branch, u).length, 0)}</b> แพ็กเกจ
              <ChevronDownIcon className={cn("size-3.5 transition-transform", showPlans && "rotate-180")} />
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1 text-xs">
            <span className="text-muted-foreground">วิชา</span>
            {branch.subjects.map((s) => <span key={s} className="rounded-full bg-background px-2 py-0.5">{s}</span>)}
            <span className="ml-2 text-muted-foreground">ระดับชั้น</span>
            {allGrades.map((g) => <span key={g} className={cn("rounded-full px-2 py-0.5", gradeTone(g))}>{g}</span>)}
          </div>
          {showPlans && (
            <div className="mt-2 grid gap-1 rounded-xl bg-background p-2 sm:grid-cols-2">
              {UNITS.flatMap((u) => durationsOf(branch, u).map((d) => {
                const r = priceRange(branch, u, d)
                return (
                  <div key={`${u}${d}`} className="flex items-center justify-between rounded-lg px-2 py-1 text-xs">
                    <span>{u === "month" ? "รายเดือน" : durationLabel(u, d)} <span className="text-muted-foreground">· {r?.count ?? 0} ราคา</span></span>
                    <span className="tabular-nums">{r ? (r.min === r.max ? fmtMoney(r.min) : `${fmtMoney(r.min)}–${fmtMoney(r.max)}`) : "—"}</span>
                  </div>
                )
              }))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
        <div className="inline-flex w-fit rounded-full bg-muted p-1">
          {([["single", "Single", StarIcon], ["bundle", "Bundle", LayersIcon]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => set({ kind: k, subjects: k === "single" ? c.subjects.slice(0, 1) : c.subjects })}
              className={cn("flex items-center gap-1.5 rounded-full px-4 py-1 text-sm", c.kind === k ? "bg-foreground font-medium text-background" : "text-muted-foreground")}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        {/* owner 2026-09-30: the branch decides which course types it offers — เรียนเดี่ยว (Private) or กลุ่ม */}
        <div className="inline-flex w-fit rounded-full bg-muted p-1" title="รูปแบบการเรียน — ใบแจ้งหนี้จะเลือกได้เฉพาะคลาสแบบเดียวกัน">
          {([["group", "กลุ่ม", UsersIcon], ["single", "เดี่ยว", UserIcon]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" onClick={() => set({ format: k })}
              className={cn("flex items-center gap-1.5 rounded-full px-4 py-1 text-sm", c.format === k ? "bg-foreground font-medium text-background" : "text-muted-foreground")}>
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </div>
        </div>

        <div className="space-y-4">
          <Field label="ชื่อคอร์ส (เว้นว่าง = ตั้งจากวิชา + ระดับชั้น)">
            <Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder={defaultCourseName(c.subjects, c.grades) || "เช่น คณิต ป.5"} />
          </Field>

          <Field label={c.kind === "single" ? "วิชา * (เลือก 1)" : "วิชา * (เลือกอย่างน้อย 2)"}>
            <div className="flex flex-wrap gap-2">
              {branch.subjects.map((s) => {
                const on = c.subjects.includes(s)
                return (
                  <button key={s} type="button" onClick={() => toggleSubject(s)}
                    className={cn("flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted")}>
                    {on && <CheckIcon className="size-3.5" />}{s}
                  </button>
                )
              })}
            </div>
          </Field>

          <Field label="ระดับชั้น *">
            <div className="space-y-2">
              {GRADE_GROUPS.map((g) => ({ ...g, grades: g.grades.filter((x) => allGrades.includes(x)) })).filter((g) => g.grades.length).map((g) => (
                <div key={g.name}>
                  <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {g.name}
                    <button type="button" className="text-primary underline" onClick={() => set({ grades: sortGrades([...new Set([...c.grades, ...g.grades])]) })}>เลือกทั้งหมด</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.grades.map((gr) => {
                      const on = c.grades.includes(gr)
                      return (
                        <button key={gr} type="button" onClick={() => set({ grades: sortGrades(on ? c.grades.filter((x) => x !== gr) : [...c.grades, gr]) })}
                          className={cn("rounded-full border px-3 py-1 text-sm", on ? cn("border-transparent", gradeTone(gr)) : "hover:bg-muted")}>
                          {gr}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="แพ็กเกจ (Duration type) *">
              <NativeSelect value={c.unit} onChange={(e) => { const unit = e.target.value as PriceUnit; set({ unit, duration: unit === "month" ? 1 : durationsOf(branch, unit)[0] ?? 0 }) }}
                options={UNITS.map((u) => ({ value: u, label: PRICE_UNIT_LABEL[u] }))} />
            </Field>
            {c.unit !== "month" && (
              <Field label="ระยะเวลา *">
                <NativeSelect value={String(c.duration)} onChange={(e) => set({ duration: Number(e.target.value) })}
                  options={durations.map((d) => ({ value: String(d), label: durationLabel(c.unit, d) }))} placeholder={durations.length ? undefined : "ยังไม่มีระยะเวลาใน Settings → Packages"} />
              </Field>
            )}
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {c.unit === "hour" ? "ซื้อเป็นชั่วโมง หักตามความยาวคาบจริง (24 ชม. ที่คาบ 2 ชม. = 12 คาบ, คาบ 90 นาที = 16 คาบ)"
              : c.unit === "week" ? "ซื้อเป็นสัปดาห์ นับจากวันเริ่ม เรียนกี่คาบก็ได้ในช่วงนั้น"
                : "รายเดือนตามปฏิทิน (วันที่ 1 – สิ้นเดือน) เรียนกี่คาบก็ได้ · เดือนแรก pro-rate 100/60/30%"}
          </p>

          <Field label={`ราคา * ${c.unit === "month" ? "/ เดือน" : `/ ${durationLabel(c.unit, c.duration)}`}`}>
            {c.grades.length === 0 ? <p className="text-sm text-muted-foreground">เลือกระดับชั้นก่อน เพื่อดึงราคาจากตารางของสาขา</p> : (
              <div className="space-y-2">
                {chart.mixed && (
                  <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                    <p className="flex items-center gap-1 font-medium"><AlertTriangleIcon className="size-3.5" /> ระดับชั้นที่เลือกมีราคาในตารางไม่เท่ากัน — ควรแยกเป็นคนละคอร์ส</p>
                    <p className="mt-1">{chart.perGrade.map((g) => `${g.grade}: ${g.price === null ? "ไม่มีราคาในตาราง" : fmtMoney(g.price)}`).join(" · ")}</p>
                    <p>ถ้ายังรวมคอร์ส ให้ใส่ราคาเดียวที่จะเก็บด้านล่าง</p>
                  </div>
                )}
                {!chart.mixed && chart.price === null && <p className="text-xs text-amber-700">ยังไม่มีราคาในตารางของสาขาสำหรับแพ็กเกจนี้ — ใส่ราคาเอง</p>}
                <div className="flex items-center gap-2">
                  <Input className="w-40 text-right tabular-nums" type="number" min={0} step={50} value={c.price || ""} onChange={(e) => { setPriceTouched(true); setC({ ...c, price: Number(e.target.value) }) }} />
                  {chart.price !== null && (
                    c.price === chart.price
                      ? <span className="text-xs text-muted-foreground">ดึงจากตารางราคาของสาขา · แก้เป็นราคาพิเศษได้</span>
                      : <button type="button" className="text-xs text-primary underline" onClick={() => { setPriceTouched(false); setC({ ...c, price: chart.price! }) }}>ใช้ราคาตาราง {fmtMoney(chart.price)}</button>
                  )}
                </div>
                {reasonNeeded && (
                  <Field label="เหตุผลที่เปลี่ยนราคา *">
                    <Input value={c.priceReason ?? ""} onChange={(e) => setC({ ...c, priceReason: e.target.value })} placeholder="เช่น ราคาโปรเปิดคอร์ส / รวมหลายระดับชั้นราคาเดียว" />
                  </Field>
                )}
              </div>
            )}
          </Field>

          <Field label="Course fee (ค่าอุปกรณ์ — เก็บเพิ่มทุกครั้งที่ซื้อ ไม่บังคับ)">
            <Input className="w-40 text-right tabular-nums" type="number" min={0} step={50} value={c.courseFee || ""} placeholder="0" onChange={(e) => setC({ ...c, courseFee: Number(e.target.value) })} />
          </Field>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={dated} onCheckedChange={(v) => setDated(!!v)} /> กำหนดวันเริ่ม → วันจบ (ไม่ติ๊ก = คอร์สไม่มีกำหนด)</label>
            {dated && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="เริ่ม"><Input type="date" value={c.from ?? ""} onChange={(e) => setC({ ...c, from: e.target.value || undefined })} /></Field>
                <Field label="จบ"><Input type="date" value={c.to ?? ""} onChange={(e) => setC({ ...c, to: e.target.value || undefined })} /></Field>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="items-center">
          <label className="mr-auto flex items-center gap-2 text-sm"><Switch checked={c.active} onCheckedChange={(v) => setC({ ...c, active: v })} /> {c.active ? "เปิดขาย (Active)" : "ปิดขาย (Inactive)"}</label>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>{isNew ? "สร้างคอร์ส" : "บันทึก"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
