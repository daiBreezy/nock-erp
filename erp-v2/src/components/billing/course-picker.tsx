"use client"

import { useState } from "react"
import { AlertTriangleIcon, CalendarIcon, CheckIcon, LayersIcon, PlusIcon, SearchIcon, StarIcon, UserIcon, UsersIcon } from "lucide-react"
import { GradeChips } from "@/components/app/grade-chips"
import { NativeSelect } from "@/components/app/native-select"
import { PackageBadge } from "@/components/app/package-badge"
import { initial, subjectColor } from "@/components/app/subject-color"
import { CourseDialog, emptyCourse } from "@/components/courses/course-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDate, fmtMoney } from "@/domain/dates"
import { COURSE_FORMAT_LABEL, filterCourses, packageLabel, packKey, priceUnitSuffix, type CourseFilter } from "@/domain/rules/course"
import { can } from "@/domain/rules/permissions"
import { branchLabel } from "@/domain/rules/settings"
import type { Branch, Course, ID } from "@/domain/types"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const PAGE = 24

/**
 * Select Course (Staging "Course selection"): cards, multi-select, filters Subject / Course type / Package + search,
 * "Create new Course". Only the invoice's own branch — Directors see every branch elsewhere, but an invoice sells
 * its own branch's courses (owner 2026-09-30).
 */
export function CoursePicker({ branch, today, studentGrade, onInvoice, onClose, onConfirm }: {
  branch: Branch
  today: string
  studentGrade?: string
  /** course ids already on the invoice — shown ticked, can't be picked twice */
  onInvoice: ID[]
  onClose: () => void
  onConfirm: (courses: Course[]) => void
}) {
  const allCourses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId))
  const [f, setF] = useState<CourseFilter>({ q: "", subject: "", format: "", pack: "" })
  const [picked, setPicked] = useState<ID[]>([])
  const [limit, setLimit] = useState(PAGE)
  const [creating, setCreating] = useState<Course | null>(null)

  const branchCourses = filterCourses(allCourses, branch.id, { q: "", subject: "", format: "", pack: "" }, today)
  const list = filterCourses(allCourses, branch.id, f, today)
  const packs = [...new Map(branchCourses.map((c) => [packKey(c), packageLabel(c)])).entries()].map(([value, label]) => ({ value, label }))
  const toggle = (id: ID) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="flex max-h-[92vh] flex-col gap-3 sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>เลือกคอร์ส {picked.length > 0 && <span className="text-primary">({picked.length})</span>}</DialogTitle>
            <DialogDescription>เลือกได้หลายคอร์สในใบเดียว · เฉพาะคอร์สของสาขา{branchLabel(branch)}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1.4fr]">
            <NativeSelect value={f.subject} onChange={(e) => { setF({ ...f, subject: e.target.value }); setLimit(PAGE) }} placeholder="ทุกวิชา" options={branch.subjects.map((s) => ({ value: s, label: s }))} />
            <NativeSelect value={f.format} onChange={(e) => { setF({ ...f, format: e.target.value as CourseFilter["format"] }); setLimit(PAGE) }} placeholder="เดี่ยว + กลุ่ม" options={[{ value: "group", label: "กลุ่ม" }, { value: "single", label: "เดี่ยว" }]} />
            <NativeSelect value={f.pack} onChange={(e) => { setF({ ...f, pack: e.target.value }); setLimit(PAGE) }} placeholder="ทุกแพ็กเกจ" options={packs} />
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" value={f.q} onChange={(e) => { setF({ ...f, q: e.target.value }); setLimit(PAGE) }} placeholder="ค้นหาชื่อคอร์ส / วิชา / ชั้น" />
            </div>
          </div>

          <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
            {list.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">ไม่พบคอร์สตามตัวกรอง</p>}
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {list.slice(0, limit).map((c) => {
                const already = onInvoice.includes(c.id)
                const on = already || picked.includes(c.id)
                const color = subjectColor(c.subjects[0])
                const nClasses = classes.filter((k) => k.courseId === c.id && k.active).length
                const gradeOff = studentGrade && !c.grades.includes(studentGrade)
                return (
                  <button key={c.id} type="button" disabled={already} onClick={() => toggle(c.id)} aria-pressed={on}
                    className={cn("relative flex flex-col gap-2 rounded-2xl border bg-card p-3 text-left transition", on ? "border-primary ring-2 ring-primary/30" : "hover:border-foreground/30", already && "opacity-60")}>
                    <span className={cn("absolute top-3 right-3 grid size-5 place-items-center rounded-full border", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{on && <CheckIcon className="size-3" />}</span>
                    <div className="flex items-start gap-2.5 pr-6">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-sm font-bold", color.chip)}>{c.kind === "bundle" ? <LayersIcon className="size-4" /> : initial(c.subjects[0])}</span>
                      <div className="min-w-0">
                        <div className="truncate font-medium">{c.name}</div>
                        <div className="text-xs text-muted-foreground">{branchLabel(branch)}</div>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <GradeChips grades={c.grades} size="xs" max={3} />
                      <Chip>{c.kind === "bundle" ? <LayersIcon className="size-3" /> : <StarIcon className="size-3" />}{c.kind === "bundle" ? "Bundle" : "Single"}</Chip>
                      <Chip>{c.format === "single" ? <UserIcon className="size-3" /> : <UsersIcon className="size-3" />}{COURSE_FORMAT_LABEL[c.format]}</Chip>
                    </div>
                    <div className="flex items-end justify-between gap-2">
                      <div className="flex flex-col text-xs text-muted-foreground">
                        {c.from || c.to ? <span className="flex items-center gap-1"><CalendarIcon className="size-3" />{c.from ? fmtDate(c.from) : "…"} – {c.to ? fmtDate(c.to) : "…"}</span> : <span>เปิดตลอด</span>}
                        <span>{nClasses ? `${nClasses} คลาสที่ผูกคอร์สนี้` : "ยังไม่มีคลาสผูก"}</span>
                      </div>
                      <PackageBadge course={c} />
                    </div>
                    <div className="flex items-center justify-between border-t pt-2">
                      <span className="font-semibold tabular-nums">{fmtMoney(c.price)} <span className="text-xs font-normal text-muted-foreground">{priceUnitSuffix(c)}</span></span>
                      {already ? <span className="text-xs text-muted-foreground">อยู่ในใบแล้ว</span>
                        : gradeOff ? <span className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangleIcon className="size-3" /> ไม่ตรงชั้น {studentGrade}</span> : null}
                    </div>
                  </button>
                )
              })}
            </div>
            {list.length > limit && (
              <div className="pt-3 text-center">
                <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>แสดงเพิ่ม ({list.length - limit})</Button>
              </div>
            )}
          </div>

          <DialogFooter className="items-center">
            <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
            {me && can(me, "course.manage") && <Button variant="outline" onClick={() => setCreating(emptyCourse(branch))}><PlusIcon /> สร้างคอร์สใหม่</Button>}
            <Button disabled={!picked.length} onClick={() => onConfirm(picked.map((id) => allCourses.find((c) => c.id === id)!).filter(Boolean))}>
              เพิ่ม {picked.length || ""} คอร์ส
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {creating && (
        <CourseDialog key={creating.id} branch={branch} initial={creating}
          onClose={() => {
            // a course created from here is ticked straight away
            if (useStore.getState().courses.some((c) => c.id === creating.id)) setPicked((p) => [...p, creating.id])
            setCreating(null)
          }} />
      )}
    </>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{children}</span>
}
