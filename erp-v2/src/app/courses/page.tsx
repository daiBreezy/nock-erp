"use client"

import { Page, PageHeader, KpiRow } from "@/components/app/page-layout"
import { useBranchScope } from "@/components/app/branch-scope"
import { Fragment, useMemo, useState } from "react"
import { ArrowDownUpIcon, BookOpenIcon, CalendarIcon, ChevronDownIcon, ClockIcon, CopyIcon, DoorOpenIcon, LayersIcon, PencilIcon, PlusIcon, SearchIcon, StarIcon, UsersIcon, WalletIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone, subjectColor } from "@/components/app/subject-color"
import { CourseDialog, emptyCourse } from "@/components/courses/course-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { endTime, fmtDate, fmtMoney, TH_DAYS_FULL, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import { priceUnitSuffix } from "@/domain/rules/course"
import { PackageBadge } from "@/components/app/package-badge"
import { can } from "@/domain/rules/permissions"
import { gradeRanges, PRICE_UNIT_LABEL } from "@/domain/rules/settings"
import type { Course, PriceUnit } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type SortKey = "name" | "price" | "students" | "start"

/** Course page (owner design 2026-09-28): KPIs · search + filters · table with each course's linked classes on expand. */
export default function CoursesPage() {
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const invoices = useStore((s) => s.invoices)
  const holidays = useStore((s) => s.holidays)
  const entitlements = useStore((s) => s.entitlements)
  const duplicate = useStore((s) => s.duplicateCourse)
  const save = useStore((s) => s.saveCourse)
  const L = useLookup()
  const today = toDateStr(useNow())
  const manage = can(me, "course.manage")

  const [q, setQ] = useState("")
  // owner 2026-10-09: the shared branch filter (sidebar branch by default, several for Director / Area Manager)
  const scope = useBranchScope()
  const [subjectF, setSubjectF] = useState("")
  const [kindF, setKindF] = useState("")
  const [unitF, setUnitF] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "name", desc: false })
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Course | null>(null)

  const scoped = courses.filter((c) => scope.ids.includes(c.branchId))

  // per-course stats: enrolled = students holding a still-valid package of the course; revenue = paid invoices
  const stats = useMemo(() => {
    const m = new Map<string, { students: number; revenue: number; classes: number }>()
    courses.forEach((c) => {
      const students = new Set(entitlements.filter((e) => e.courseId === c.id && e.to >= today).map((e) => e.studentId)).size
      const revenue = invoices
        .filter((i) => i.status === "paid" && i.lines.some((l) => l.courseId === c.id))
        .reduce((a, i) => a + invoiceTotals(i, { branch: branches.find((b) => b.id === i.branchId)!, courses, classes, holidays }).lines
          .filter((l) => l.line.courseId === c.id).reduce((x, l) => x + l.amount + l.courseFee - l.promotion, 0), 0)
      m.set(c.id, { students, revenue, classes: classes.filter((k) => k.courseId === c.id).length })
    })
    return m
  }, [courses, entitlements, invoices, classes, holidays, branches, today])

  const subjects = [...new Set(scoped.flatMap((c) => c.subjects))]
  const needle = q.trim().toLowerCase()
  const list = scoped
    .filter((c) => !needle || [c.name, ...c.subjects, ...c.grades].some((x) => x.toLowerCase().includes(needle)))
    .filter((c) => !subjectF || c.subjects.includes(subjectF))
    .filter((c) => !kindF || c.kind === kindF)
    .filter((c) => !unitF || c.unit === unitF)
    .sort((a, b) => {
      const v = sort.key === "name" ? a.name.localeCompare(b.name, "th")
        : sort.key === "price" ? a.price - b.price
          : sort.key === "students" ? stats.get(a.id)!.students - stats.get(b.id)!.students
            : (a.from ?? "9").localeCompare(b.from ?? "9")
      return sort.desc ? -v : v
    })

  const kpi = {
    total: scoped.length,
    single: scoped.filter((c) => c.kind === "single").length,
    bundle: scoped.filter((c) => c.kind === "bundle").length,
    students: new Set(entitlements.filter((e) => e.to >= today && scoped.some((c) => c.id === e.courseId)).map((e) => e.studentId)).size,
    revenue: scoped.reduce((a, c) => a + stats.get(c.id)!.revenue, 0),
  }

  const toggle = (id: string) => setOpen((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const sortBtn = (key: SortKey, label: string) => (
    <button className="flex items-center gap-1" onClick={() => setSort({ key, desc: sort.key === key ? !sort.desc : false })}>
      {label}<ArrowDownUpIcon className={cn("size-3", sort.key === key ? "text-foreground" : "text-muted-foreground/50")} />
    </button>
  )

  return (
    <Page>
      <PageHeader title="คอร์ส" description="คอร์สที่เปิดขาย แพ็กเกจ ราคา และคลาสที่ผูก"
        actions={manage && <Button onClick={() => setEditing(emptyCourse(branch))}><PlusIcon /> สร้างคอร์ส</Button>} />

      <KpiRow>
        <Kpi icon={BookOpenIcon} label="คอร์สทั้งหมด" value={kpi.total} />
        <Kpi icon={StarIcon} label="Single / Bundle" value={<>{kpi.single} <span className="text-base text-muted-foreground">/</span> {kpi.bundle}</>} sub="คอร์สวิชาเดียว / หลายวิชา" tone="violet" />
        <Kpi icon={UsersIcon} label="นักเรียนที่ลงเรียน" value={kpi.students} />
        <Kpi icon={WalletIcon} label="รายได้จากคอร์ส (ชำระแล้ว)" value={fmtMoney(kpi.revenue)} />
      </KpiRow>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="w-56 pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหาชื่อคอร์ส วิชา ระดับชั้น" />
        </div>
        <NativeSelect className="h-9 w-32" value={subjectF} onChange={(e) => setSubjectF(e.target.value)} placeholder="ทุกวิชา" options={subjects.map((s) => ({ value: s, label: s }))} />
        <NativeSelect className="h-9 w-32" value={kindF} onChange={(e) => setKindF(e.target.value)} placeholder="ทุกประเภท" options={[{ value: "single", label: "Single" }, { value: "bundle", label: "Bundle" }]} />
        <NativeSelect className="h-9 w-36" value={unitF} onChange={(e) => setUnitF(e.target.value)} placeholder="ทุกแพ็กเกจ" options={(["hour", "week", "month"] as PriceUnit[]).map((u) => ({ value: u, label: PRICE_UNIT_LABEL[u] }))} />
        {/* owner 2026-10-09: branch chip always last in the row */}
        {scope.select}
      </div>

      <div className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        {/* owner 2026-10-07: fixed column widths + one line per cell so every row lines up */}
        <table className="w-full min-w-[1200px] table-fixed text-sm [&_td]:align-middle">
          <colgroup>{["48px", "auto", "110px", "96px", "84px", "88px", "96px", "140px", "96px", "112px", "96px"].map((w, i) => <col key={i} style={w === "auto" ? undefined : { width: w }} />)}</colgroup>
          <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium [&>th]:whitespace-nowrap">
              <th /><th>{sortBtn("name", "ชื่อคอร์ส")}</th><th>ระดับชั้น</th><th>ประเภท</th><th className="text-right!">{sortBtn("students", "นักเรียน")}</th>
              <th className="text-right!">คลาสที่ผูก</th><th>แพ็กเกจ</th><th className="text-right!">{sortBtn("price", "ราคา")}</th><th>สาขา</th><th>{sortBtn("start", "วันเริ่ม")}</th><th />
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={11} className="p-10 text-center text-muted-foreground">ไม่มีคอร์สตามเงื่อนไข</td></tr>}
            {list.map((c) => {
              const st = stats.get(c.id)!
              const isOpen = open.has(c.id)
              const col = subjectColor(c.subjects[0] ?? "")
              const linked = classes.filter((k) => k.courseId === c.id)
              const br = branches.find((b) => b.id === c.branchId)
              return (
                <Fragment key={c.id}>
                  <tr className={cn("border-b last:border-0 [&>td]:h-14 [&>td]:px-3 [&>td]:py-1.5", isOpen && "bg-primary/5", !c.active && "opacity-50")}>
                    <td><button aria-label={isOpen ? "ย่อ" : "ขยาย"} onClick={() => toggle(c.id)} className="grid size-7 place-items-center rounded-lg hover:bg-muted"><ChevronDownIcon className={cn("size-4 transition-transform", !isOpen && "-rotate-90")} /></button></td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-xs font-semibold", col.chip)}>{c.subjects[0]?.slice(0, 2)}</span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{c.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{c.subjects.join(" + ")}{c.courseFee > 0 && ` · + Course fee ${fmtMoney(c.courseFee)}`}{!c.active && " · ปิดขาย"}</p>
                        </div>
                      </div>
                    </td>
                    <td><div className="flex gap-1 overflow-hidden" title={c.grades.join(", ")}>{gradeRanges(c.grades).map((g) => <span key={g} className={cn("rounded-md px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap", gradeTone(g))}>{g}</span>)}</div></td>
                    <td><Pill tone={c.kind === "bundle" ? "violet" : "gray"}>{c.kind === "bundle" ? <><LayersIcon className="size-3" /> Bundle</> : "Single"}</Pill></td>
                    <td className="text-right tabular-nums"><span className="inline-flex items-center gap-1"><UsersIcon className="size-3.5 text-muted-foreground" />{st.students}</span></td>
                    <td className="text-right tabular-nums">{st.classes || "—"}</td>
                    <td className="truncate"><PackageBadge course={c} /></td>
                    <td className="truncate text-right tabular-nums"><span className="font-medium">{fmtMoney(c.price)}</span> <span className="text-xs text-muted-foreground">{priceUnitSuffix(c)}</span></td>
                    <td className="truncate text-xs">{br?.name}</td>
                    <td className="text-xs whitespace-nowrap">{c.from ? fmtDate(c.from, { year: true }) : "—"}{c.to && <span className="block text-muted-foreground">ถึง {fmtDate(c.to, { year: true })}</span>}</td>
                    <td>
                      {manage && (
                        <div className="flex">
                          <Button size="icon-sm" variant="ghost" aria-label="แก้ไข" onClick={() => setEditing(c)}><PencilIcon /></Button>
                          <Button size="icon-sm" variant="ghost" aria-label="ทำสำเนา" onClick={() => report(duplicate(c.id), "ทำสำเนาคอร์สแล้ว — แก้ชื่อ/ระดับชั้นต่อได้")}><CopyIcon /></Button>
                        </div>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b bg-muted/20">
                      <td colSpan={11} className="px-3 pt-1 pb-3">
                        <div className="mb-2 flex flex-wrap gap-2 px-1 text-xs text-muted-foreground">
                          <span>รายได้ที่เก็บแล้ว <b className="text-foreground">{fmtMoney(st.revenue)}</b></span>
                          {c.priceReason && <span>· เหตุผลราคา: {c.priceReason}</span>}
                          {manage && <button className="ml-auto text-primary underline" onClick={() => report(save({ ...c, active: !c.active }), c.active ? "ปิดขายคอร์สแล้ว" : "เปิดขายคอร์สแล้ว")}>{c.active ? "ปิดขาย" : "เปิดขาย"}</button>}
                        </div>
                        {linked.length === 0 ? (
                          <p className="rounded-2xl border border-dashed p-4 text-center text-xs text-muted-foreground">ยังไม่มีคลาสผูกกับคอร์สนี้ — เลือกคอร์สได้ตอน Create Class</p>
                        ) : (
                          <table className="w-full overflow-hidden rounded-2xl bg-card text-sm ring-1 ring-foreground/5">
                            <thead className="text-xs text-muted-foreground">
                              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium"><th>วิชา</th><th>วัน</th><th>เวลา</th><th>ระดับชั้น</th><th>นักเรียน</th><th>ครู</th><th>ห้อง</th><th>สถานะ</th></tr>
                            </thead>
                            <tbody>
                              {linked.map((k) => (
                                <tr key={k.id} className="border-t [&>td]:px-3 [&>td]:py-2">
                                  <td><span className={cn("rounded-full px-2 py-0.5 text-xs", subjectColor(k.subject).chip)}>{k.subject}</span> <span className="text-xs text-muted-foreground">{k.name}</span></td>
                                  <td><span className="flex items-center gap-1"><CalendarIcon className="size-3.5 text-muted-foreground" />{TH_DAYS_FULL[k.weekday]}</span></td>
                                  <td className="tabular-nums"><span className="flex items-center gap-1"><ClockIcon className="size-3.5 text-muted-foreground" />{k.start}–{endTime(k.start, k.minutes)}</span></td>
                                  <td><div className="flex flex-wrap gap-1">{gradeRanges(k.grades).map((g) => <span key={g} className={cn("rounded-full px-2 py-0.5 text-xs", gradeTone(g))}>{g}</span>)}</div></td>
                                  <td className="tabular-nums">{k.studentIds.length}</td>
                                  <td>{L.teacher(k.teacherId).label}</td>
                                  <td><span className="flex items-center gap-1 text-xs"><DoorOpenIcon className="size-3.5 text-muted-foreground" />{br?.rooms.find((r) => r.id === k.roomId)?.name ?? "—"}</span></td>
                                  <td>{k.active ? <span className="text-xs font-medium text-emerald-700">Active</span> : <span className="text-xs text-muted-foreground">Inactive</span>}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && <CourseDialog key={editing.id} branch={branches.find((b) => b.id === editing.branchId)!} initial={editing} onClose={() => setEditing(null)} />}
    </Page>
  )
}
