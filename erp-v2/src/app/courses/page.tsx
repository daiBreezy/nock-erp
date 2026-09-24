"use client"

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { subjectColor } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtMoney } from "@/domain/dates"
import { prorateFactor } from "@/domain/rules/billing"
import type { Course, Package } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** Prices live in branch packages; courses point at a package (business rule #3). */
export default function CoursesPage() {
  const branch = useBranch()
  const packages = useStore((s) => s.packages).filter((p) => p.branchId === branch.id)
  const courses = useStore((s) => s.courses).filter((c) => c.branchId === branch.id)
  const invoices = useStore((s) => s.invoices)
  const [pkg, setPkg] = useState<Package | "new" | null>(null)
  const [course, setCourse] = useState<Course | "new" | null>(null)
  const unit = (p?: Package) => (p ? (p.unit === "month" ? "/ เดือน" : `/ ${p.hours} ชม.`) : "")

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="space-y-2">
        <div className="flex items-center">
          <div>
            <h2 className="font-semibold">แพ็กเกจราคา</h2>
            <p className="text-xs text-muted-foreground">รายเดือนคิดตามจำนวนคาบที่เหลือในเดือนที่ซื้อ: 3+ คาบ = {prorateFactor(3) * 100}% · 2 คาบ = {prorateFactor(2) * 100}% · 1 คาบ = {prorateFactor(1) * 100}%</p>
          </div>
          <Button size="sm" className="ml-auto" onClick={() => setPkg("new")}><PlusIcon /> เพิ่มแพ็กเกจ</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((p) => (
            <button key={p.id} onClick={() => setPkg(p)} className={cn("rounded-xl border p-3 text-left hover:shadow-sm", subjectColor(p.subject).soft)}>
              <div className="flex items-center justify-between">
                <span className={cn("font-semibold", subjectColor(p.subject).text)}>{p.subject}</span>
                <Pill tone={p.unit === "month" ? "blue" : "violet"}>{p.unit === "month" ? "รายเดือน" : "รายชั่วโมง"}</Pill>
              </div>
              <div className="mt-1 text-lg font-semibold tabular-nums">{fmtMoney(p.price)} <span className="text-xs font-normal text-muted-foreground">{unit(p)}</span></div>
              <div className="text-xs text-muted-foreground">{p.grades.join(", ")}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center">
          <h2 className="font-semibold">คอร์ส</h2>
          <Button size="sm" className="ml-auto" onClick={() => setCourse("new")}><PlusIcon /> เพิ่มคอร์ส</Button>
        </div>
        <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
          {courses.map((c) => {
            const p = packages.find((x) => x.id === c.packageId)
            const sold = invoices.filter((i) => i.course?.courseId === c.id && i.status !== "void").length
            return (
              <button key={c.id} onClick={() => setCourse(c)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                <span className={cn("size-2.5 rounded-full", subjectColor(c.subject).bar)} />
                <span className="min-w-40 flex-1 text-sm font-medium">{c.name}<span className="block text-xs font-normal text-muted-foreground">{c.grades.join(", ")}</span></span>
                <span className="text-sm tabular-nums">{p ? `${fmtMoney(p.price)} ${unit(p)}` : <span className="text-red-700">ไม่มีแพ็กเกจ</span>}</span>
                <span className="w-24 text-right text-xs text-muted-foreground">ขายแล้ว {sold} ใบ</span>
              </button>
            )
          })}
        </div>
      </section>
      {pkg && <PackageForm pkg={pkg === "new" ? undefined : pkg} onClose={() => setPkg(null)} />}
      {course && <CourseForm course={course === "new" ? undefined : course} onClose={() => setCourse(null)} />}
    </div>
  )
}

function GradePicker({ grades, value, onChange }: { grades: string[]; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {grades.map((g) => (
        <button key={g} type="button" onClick={() => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g])} className={cn("rounded-full border px-2.5 py-0.5 text-xs", value.includes(g) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{g}</button>
      ))}
    </div>
  )
}

function PackageForm({ pkg, onClose }: { pkg?: Package; onClose: () => void }) {
  const branch = useBranch()
  const save = useStore((s) => s.savePackage)
  const [p, setP] = useState<Package>(pkg ?? { id: uid("pk"), branchId: branch.id, subject: branch.subjects[0], grades: [], unit: "month", price: 0 })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{pkg ? "แก้แพ็กเกจ" : "เพิ่มแพ็กเกจ"}</DialogTitle>
          {pkg && <DialogDescription>ราคาใหม่มีผลกับใบแจ้งหนี้ที่สร้างหลังจากนี้ ใบเดิมไม่เปลี่ยน</DialogDescription>}
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="วิชา"><NativeSelect value={p.subject} onChange={(e) => setP({ ...p, subject: e.target.value })} options={branch.subjects.map((s) => ({ value: s, label: s }))} /></Field>
          <Field label="แบบ"><NativeSelect value={p.unit} onChange={(e) => setP({ ...p, unit: e.target.value as Package["unit"] })} options={[{ value: "month", label: "รายเดือน" }, { value: "hours", label: "แพ็กชั่วโมง" }]} /></Field>
          <Field label="ราคา (บาท)"><Input type="number" min={0} value={p.price || ""} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} /></Field>
          {p.unit === "hours" && <Field label="จำนวนชั่วโมง"><Input type="number" min={1} value={p.hours ?? ""} onChange={(e) => setP({ ...p, hours: Number(e.target.value) })} /></Field>}
        </div>
        <Field label="เกรด"><GradePicker grades={branch.grades} value={p.grades} onChange={(grades) => setP({ ...p, grades })} /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => report(save(p), "บันทึกแพ็กเกจแล้ว") && onClose()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CourseForm({ course, onClose }: { course?: Course; onClose: () => void }) {
  const branch = useBranch()
  const packages = useStore((s) => s.packages).filter((p) => p.branchId === branch.id)
  const save = useStore((s) => s.saveCourse)
  const [c, setC] = useState<Course>(course ?? { id: uid("co"), branchId: branch.id, name: "", subject: branch.subjects[0], grades: [], packageId: "" })
  const options = packages.filter((p) => p.subject === c.subject)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{course ? "แก้คอร์ส" : "เพิ่มคอร์ส"}</DialogTitle></DialogHeader>
        <Field label="ชื่อคอร์ส *"><Input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} placeholder="คณิต ป.5 รายเดือน" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="วิชา"><NativeSelect value={c.subject} onChange={(e) => setC({ ...c, subject: e.target.value, packageId: "" })} options={branch.subjects.map((s) => ({ value: s, label: s }))} /></Field>
          <Field label="แพ็กเกจราคา *">
            <NativeSelect value={c.packageId} onChange={(e) => setC({ ...c, packageId: e.target.value })} placeholder={options.length ? "เลือก" : "ยังไม่มีแพ็กเกจวิชานี้"}
              options={options.map((p) => ({ value: p.id, label: `${fmtMoney(p.price)} ${p.unit === "month" ? "/เดือน" : `/${p.hours} ชม.`} · ${p.grades.join(",")}` }))} />
          </Field>
        </div>
        <Field label="เกรด"><GradePicker grades={branch.grades} value={c.grades} onChange={(grades) => setC({ ...c, grades })} /></Field>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => report(save(c), "บันทึกคอร์สแล้ว") && onClose()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
