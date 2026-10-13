"use client"

import { useState } from "react"
import { AlertTriangleIcon, CheckIcon, LayersIcon, PlusIcon, SearchIcon } from "lucide-react"
import { GradeChips } from "@/components/app/grade-chips"
import { NativeSelect } from "@/components/app/native-select"
import { PackageBadge } from "@/components/app/package-badge"
import { initial, subjectColor } from "@/components/app/subject-color"
import { CourseDialog, emptyCourse } from "@/components/courses/course-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDate, fmtMoney } from "@/domain/dates"
import { COURSE_FORMAT_LABEL, courseSeats, filterCourses, packageLabel, packKey, priceUnitSuffix, type CourseFilter } from "@/domain/rules/course"
import { can } from "@/domain/rules/permissions"
import { branchLabel } from "@/domain/rules/settings"
import type { Branch, Course, ID } from "@/domain/types"
import { cn } from "@/lib/utils"
import { HEAD } from "@/components/app/data-table"
import { useStore } from "@/store/store"

const PAGE = 24

/**
 * Select Course (Staging "Course selection"): a table (owner 2026-10-13, was cards), multi-select, filters Subject / Course type / Package + search,
 * "Create new Course". Only the invoice's own branch — Directors see every branch elsewhere, but an invoice sells
 * its own branch's courses (owner 2026-09-30).
 */
export function CoursePicker({ branch, today, studentGrade, studentId, onInvoice, onClose, onConfirm }: {
  branch: Branch
  today: string
  studentGrade?: string
  /** the invoice's student — a course they already hold doesn't count as a new seat */
  studentId?: ID | null
  /** course ids already on the invoice — shown ticked, can't be picked twice */
  onInvoice: ID[]
  onClose: () => void
  onConfirm: (courses: Course[]) => void
}) {
  const allCourses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const entitlements = useStore((s) => s.entitlements)
  const me = useStore((s) => s.me())
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
        <DialogContent className="flex max-h-[92vh] flex-col gap-3 sm:max-w-5xl">
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

          {/* owner 2026-10-13: a table, not cards — scan many courses at once */}
          <div className="-mx-1 min-h-0 flex-1 overflow-auto rounded-2xl border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className={cn(HEAD, "sticky top-0 z-10 bg-muted")}>
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th className="w-10" />
                  <th>คอร์ส</th>
                  <th>ชั้น</th>
                  <th>ประเภท</th>
                  <th>Package</th>
                  <th>ช่วงเปิดขาย</th>
                  <th className="text-right!">คลาส</th>
                  <th className="text-right!">นักเรียน</th>
                  <th className="text-right!">ราคา</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 && <tr><td colSpan={9} className="py-12 text-center text-muted-foreground">ไม่พบคอร์สตามตัวกรอง</td></tr>}
                {list.slice(0, limit).map((c) => {
                  const already = onInvoice.includes(c.id)
                  const on = already || picked.includes(c.id)
                  const nClasses = classes.filter((k) => k.courseId === c.id && k.active).length
                  const gradeOff = studentGrade && c.grades.length > 0 && !c.grades.includes(studentGrade)
                  const seats = courseSeats(c, entitlements, today, studentId)
                  // owner 2026-10-13: a course at its Max Student can't take a new student (a renewing one is fine)
                  const blocked = already || (seats.full && !on)
                  return (
                    <tr key={c.id} onClick={() => !blocked && toggle(c.id)} aria-selected={on}
                      className={cn("border-b last:border-0 [&>td]:px-3 [&>td]:py-2", blocked ? "opacity-55" : "cursor-pointer hover:bg-muted/40", on && !already && "bg-primary/5")}>
                      <td><span className={cn("grid size-5 place-items-center rounded-md border", on ? "border-primary bg-primary text-primary-foreground" : "bg-background")}>{on && <CheckIcon className="size-3" />}</span></td>
                      <td>
                        <span className="flex items-center gap-2">
                          <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold", subjectColor(c.subjects[0]).chip)}>{c.kind === "bundle" ? <LayersIcon className="size-3.5" /> : initial(c.subjects[0])}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{c.name}</span>
                            {already ? <span className="block text-xs text-muted-foreground">อยู่ในใบแล้ว</span>
                              : gradeOff ? <span className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangleIcon className="size-3" /> อาจไม่ตรงชั้น {studentGrade}</span> : null}
                          </span>
                        </span>
                      </td>
                      <td className="min-w-28"><GradeChips grades={c.grades} size="xs" max={3} className="flex-nowrap" /></td>
                      <td className="whitespace-nowrap text-xs text-muted-foreground">{c.kind === "bundle" ? "Bundle" : "Single"} · {COURSE_FORMAT_LABEL[c.format]}</td>
                      <td><PackageBadge course={c} /></td>
                      <td className="whitespace-nowrap text-xs text-muted-foreground">{c.from || c.to ? `${c.from ? fmtDate(c.from) : "…"} – ${c.to ? fmtDate(c.to) : "…"}` : "เปิดตลอด"}</td>
                      <td className="text-right tabular-nums">{nClasses || <span className="text-muted-foreground">—</span>}</td>
                      <td className="text-right whitespace-nowrap tabular-nums">
                        {seats.max === null ? seats.enrolled : <span className={cn(seats.full && "font-medium text-red-700")}>{seats.enrolled}/{seats.max}{seats.full && " · เต็ม"}</span>}
                      </td>
                      <td className="text-right whitespace-nowrap"><span className="font-semibold tabular-nums">{fmtMoney(c.price)}</span> <span className="text-xs text-muted-foreground">{priceUnitSuffix(c)}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {list.length > limit && (
              <div className="border-t py-2 text-center">
                <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>แสดงเพิ่ม ({list.length - limit})</Button>
              </div>
            )}
          </div>

          <DialogFooter className="items-center">
            {/* F8 (owner 2026-10-09): a gentle heads-up only — the admin may still pick it */}
            {(() => {
              const off = studentGrade ? picked.map((id) => allCourses.find((c) => c.id === id)).filter((c) => c && c.grades.length > 0 && !c.grades.includes(studentGrade)) : []
              return off.length > 0 && (
                <p className="mr-auto flex items-center gap-1.5 text-xs text-amber-700">
                  <AlertTriangleIcon className="size-3.5 shrink-0" />
                  {off.length === 1 ? `คอร์ส ${off[0]!.name}` : `${off.length} คอร์สที่เลือก`} อาจไม่ตรงกับชั้น {studentGrade} ของนักเรียน
                </p>
              )
            })()}
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

