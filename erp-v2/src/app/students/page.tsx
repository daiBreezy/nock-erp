"use client"

import { Page, PageHeader, KpiRow, Toolbar } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { useState } from "react"
import { DownloadIcon, GraduationCapIcon, PlusIcon, RefreshCwIcon, SearchIcon, SparklesIcon, UnlinkIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { PackageBadge } from "@/components/app/package-badge"
import { StudentForm } from "@/components/app/student-form"
import { StudentSheet } from "@/components/app/student-sheet"
import { STATUS_PILL } from "@/components/app/student-status"
import { GradeCell, gradeCompare, HEAD, Pager, ROW, SortHeader, TableShell, usePage, useSort } from "@/components/app/data-table"
import { useFocusFirst } from "@/components/app/focus-banner"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { addDays, fmtDate, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import type { ID } from "@/domain/types"

type StudentSort = "nickname" | "name" | "grade" | "family" | "course" | "enroll" | "end" | "status" | "left"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "sonner"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"

export default function StudentsPage() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const me = useStore((s) => s.me())
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const students = useStore((s) => s.students).filter((s) => scope.ids.includes(s.branchId))
  const families = useStore((s) => s.families)
  const classes = useStore((s) => s.classes)
  const entitlements = useEntitlements()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const leaves = useStore((s) => s.leaves)
  const courses = useStore((s) => s.courses)
  const [q, setQ] = useState("")
  // owner 2026-10-06: filters sync to the URL (?grade=&status=) so a reload or shared link keeps them
  const [grade, setGrade] = useQueryState<string>("grade", "")
  const [status, setStatus] = useQueryState<string>("status", "")
  const [noFamily, setNoFamily] = useQueryState<string>("family", "")
  const [openId, setOpenId] = useState<ID | null>(null)
  const [adding, setAdding] = useState(false)

  const { sort, toggle } = useSort<StudentSort>("nickname")
  const byGrade = gradeCompare(branch.grades)
  /** sessions left on the lowest session pack (subscriptions count as plenty) */
  const left = (r: (typeof rows)[number]) => Math.min(Infinity, ...r.packs.filter(({ e }) => e.kind === "sessions").map(({ b }) => b.remaining))
  const rows = students.map((s) => {
    const st = Att.studentStatus(s, entitlements, leaves, today)
    const ents = Att.activeEntitlements(s.id, entitlements, today)
    const packs = ents.map((e) => ({ e, b: Att.balance(e, sessions, attendance, classes), c: courses.find((c) => c.id === e.courseId) }))
    // the course shown in the table (owner 2026-10-07: Course + Enroll / End date instead of classes): the current
    // package that ends first (the one renewals are about) — or, for students with none now, the last one they had
    const main = [...ents].sort((a, b) => a.to.localeCompare(b.to))[0]
      ?? entitlements.filter((e) => e.studentId === s.id && e.from <= today).sort((a, b) => b.to.localeCompare(a.to))[0]
    return { s, st, packs, main, mainCourse: main && courses.find((c) => c.id === main.courseId), fam: families.find((f) => f.id === s.familyId) }
  })
  const shown = rows
    .filter((r) => !grade || r.s.grade === grade)
    .filter((r) => !status || r.st === status)
    .filter((r) => noFamily !== "none" || !r.s.familyId)
    .filter((r) => !q || `${r.s.name} ${r.s.nickname} ${r.fam?.name ?? ""} ${r.fam?.parents.map((p) => p.phone).join(" ") ?? ""}`.includes(q))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "name" ? a.s.name.localeCompare(b.s.name, "th")
          : k === "grade" ? byGrade(a.s.grade, b.s.grade)
            : k === "course" ? (a.mainCourse?.name ?? "\uffff").localeCompare(b.mainCourse?.name ?? "\uffff", "th")
              : k === "enroll" ? (a.main?.from ?? "9").localeCompare(b.main?.from ?? "9")
                : k === "end" ? (a.main?.to ?? "9").localeCompare(b.main?.to ?? "9")
              : k === "family" ? (a.fam?.name ?? "").localeCompare(b.fam?.name ?? "", "th")
                : k === "status" ? STATUS_PILL[a.st].label.localeCompare(STATUS_PILL[b.st].label, "th")
                  : left(a) - left(b)
      return sort.desc ? -v : v
    })
  const focusKeys = (r: (typeof rows)[number]) => [r.st === "renewal" && Att.renewalFollowUpDue(r.s, today) && "renewal", !r.s.familyId && "no_family"].filter(Boolean).join(" ") || undefined
  const pg = usePage(useFocusFirst(shown, focusKeys))

  // G3: export only for roles with student.export — and it is logged in the toast
  const exportCsv = () => {
    const head = ["ชื่อ", "ชื่อเล่น", "ชั้น", "ครอบครัว", "สถานะ"]
    const lines = shown.map((r) => [r.s.name, r.s.nickname, r.s.grade, r.fam?.name ?? "", STATUS_PILL[r.st].label].map((x) => `"${x.replace(/"/g, '""')}"`).join(","))
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `students-${branch.code}-${today}.csv`
    a.click()
    toast.success(`ส่งออก ${shown.length} รายชื่อแล้ว (ไม่รวมเบอร์โทร/ที่อยู่)`)
  }

  const month = today.slice(0, 7)
  const kpi = {
    active: rows.filter((r) => r.st === "active").length,
    renewal: rows.filter((r) => r.st === "renewal").length,
    // new = their very first package starts this month (same idea as Reports — paying students, not records added)
    fresh: rows.filter((r) => entitlements.filter((e) => e.studentId === r.s.id).map((e) => e.from).sort()[0]?.slice(0, 7) === month).length,
    noFamily: rows.filter((r) => !r.s.familyId).length,
  }
  const pick = (v: string) => setStatus(status === v ? "" : v)

  return (
    <Page>
      <PageHeader title="นักเรียน" description="นักเรียนทั้งหมด คอร์สที่เรียนอยู่ และวันจบแพ็กเกจ"
        actions={<>
          {can(me, "student.export") && <Button variant="outline" onClick={exportCsv}><DownloadIcon /> ส่งออก</Button>}
          {can(me, "student.manage") && <Button onClick={() => setAdding(true)}><PlusIcon /> เพิ่มนักเรียน</Button>}
        </>} />
      <KpiRow>
        <Kpi icon={GraduationCapIcon} label="กำลังเรียน" value={kpi.active} tone="emerald" onClick={() => pick("active")} active={status === "active"} />
        <Kpi icon={RefreshCwIcon} label="รอต่อคอร์ส" value={kpi.renewal} tone="amber" valueClassName={kpi.renewal ? "text-amber-700" : undefined} onClick={() => pick("renewal")} active={status === "renewal"} />
        <Kpi icon={SparklesIcon} label="นักเรียนใหม่เดือนนี้" value={kpi.fresh} tone="sky" />
        <Kpi icon={UnlinkIcon} label="ยังไม่ผูกครอบครัว" value={kpi.noFamily} tone="red" valueClassName={kpi.noFamily ? "text-red-700" : undefined} onClick={() => setNoFamily(noFamily ? "" : "none")} active={noFamily === "none"} />
      </KpiRow>
      <Toolbar end={<span className="text-xs text-muted-foreground">{shown.length} คน</span>}>
        {scope.select}
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ชื่อ / ชื่อเล่น / ครอบครัว / เบอร์" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-28" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="ทุกชั้น" options={branch.grades.map((g) => ({ value: g, label: g }))} />
        <NativeSelect className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ทุกสถานะ" options={Object.entries(STATUS_PILL).map(([k, v]) => ({ value: k, label: v.label }))} />
      </Toolbar>

      {/* owner 2026-10-07: one fact per column (grade sortable on its own), fixed widths so pills never push a row
          out of line; Course + Enroll / End date instead of classes, school only in the student panel (the overall
          picture is in Reports › นักเรียน). Name / nickname / grade edit in place — click the other cells to open */}
      <TableShell minWidth={1100} cols={["140px", "180px", "76px", "auto", "220px", "100px", "100px", "104px", "80px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="ชื่อเล่น" k="nickname" sort={sort} onSort={toggle} />
            <SortHeader label="ชื่อ-นามสกุล" k="name" sort={sort} onSort={toggle} />
            <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
            <SortHeader label="ครอบครัว" k="family" sort={sort} onSort={toggle} />
            <SortHeader label="Course" k="course" sort={sort} onSort={toggle} />
            <SortHeader label="Enroll date" k="enroll" sort={sort} onSort={toggle} />
            <SortHeader label="End date" k="end" sort={sort} onSort={toggle} />
            <SortHeader label="สถานะ" k="status" sort={sort} onSort={toggle} />
            <SortHeader label="เหลือ" k="left" sort={sort} onSort={toggle} right />
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((r) => {
            const { s, st, packs, fam, main, mainCourse } = r
            const n = left(r)
            const more = packs.length - 1
            const ended = main && main.to < today
            return (
              <tr key={s.id} onClick={() => setOpenId(s.id)} data-focus={focusKeys(r)} className={ROW}>
                <td>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
                    <span className="flex-1 truncate font-medium">{s.nickname}</span>
                    {scope.multi && <BranchCode code={scope.code(s.branchId)} />}
                  </div>
                </td>
                <td className="truncate text-muted-foreground">{s.name}</td>
                <td><GradeCell grade={s.grade} tone={gradeTone(s.grade)} /></td>
                <td className="truncate text-muted-foreground">
                  {fam ? <>{fam.name}{!fam.parents.some((p) => p.lineLinked) && <span className="text-xs text-amber-700"> · ไม่มี LINE</span>}</> : <span className="text-amber-700">ยังไม่ผูกครอบครัว</span>}
                </td>
                <td>
                  {mainCourse ? (
                    <span className={cn("flex min-w-0 items-center gap-1.5", ended && "text-muted-foreground")} title={packs.map((p) => p.c?.name).filter(Boolean).join(", ") || mainCourse.name}>
                      <PackageBadge course={mainCourse} />
                      <span className="min-w-0 truncate">{mainCourse.name}</span>
                      {more > 0 && <span className="shrink-0 text-xs text-muted-foreground">+{more}</span>}
                    </span>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="truncate text-muted-foreground tabular-nums">{main ? fmtDate(main.from) : "—"}</td>
                <td className={cn("truncate tabular-nums", ended ? "text-muted-foreground" : main && main.to <= addDays(today, 7) ? "font-medium text-amber-700" : "text-muted-foreground")}>{main ? fmtDate(main.to) : "—"}</td>
                <td className="truncate"><Pill tone={STATUS_PILL[st].tone}>{STATUS_PILL[st].label}</Pill></td>
                <td className={cn("text-right tabular-nums", n <= 2 && "font-semibold text-red-700")}>{Number.isFinite(n) ? `${n} คาบ` : <span className="text-muted-foreground">—</span>}</td>
              </tr>
            )
          })}
          {shown.length === 0 && <tr><td colSpan={9} className="p-10 text-center text-muted-foreground">ไม่พบนักเรียน</td></tr>}
        </tbody>
      </TableShell>
      <Pager {...pg} unit="คน" />
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
      {adding && <StudentForm onClose={() => setAdding(false)} onSaved={(s) => setOpenId(s.id)} />}
    </Page>
  )
}
