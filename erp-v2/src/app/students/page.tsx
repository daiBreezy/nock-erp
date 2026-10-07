"use client"

import { useState } from "react"
import { DownloadIcon, PlusIcon, SearchIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { PackageBadge } from "@/components/app/package-badge"
import { StudentForm } from "@/components/app/student-form"
import { StudentSheet } from "@/components/app/student-sheet"
import { STATUS_PILL } from "@/components/app/student-status"
import { GradeCell, gradeCompare, HEAD, Pager, ROW, SortHeader, TableShell, Th, usePage, useSort } from "@/components/app/data-table"
import { EditCell } from "@/components/app/inline-edit"
import { useFocusFirst } from "@/components/app/focus-banner"
import { report } from "@/lib/feedback"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import type { ID, Student } from "@/domain/types"

type StudentSort = "nickname" | "name" | "grade" | "school" | "family" | "status" | "left"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "sonner"

export default function StudentsPage() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const students = useStore((s) => s.students).filter((s) => s.branchId === branch.id)
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
  const [openId, setOpenId] = useState<ID | null>(null)
  const [adding, setAdding] = useState(false)

  const { sort, toggle } = useSort<StudentSort>("nickname")
  const byGrade = gradeCompare(branch.grades)
  const saveStudent = useStore((s) => s.saveStudent)
  const manage = can(me, "student.manage")
  // inline edit (owner 2026-10-07) — same validation as the student form
  const edit = (st: Student, patch: Partial<Student>) => report(saveStudent({ ...st, ...patch }), "บันทึกแล้ว")
  /** sessions left on the lowest session pack (subscriptions count as plenty) */
  const left = (r: (typeof rows)[number]) => Math.min(Infinity, ...r.packs.filter(({ e }) => e.kind === "sessions").map(({ b }) => b.remaining))
  const rows = students.map((s) => {
    const st = Att.studentStatus(s, entitlements, leaves, today)
    const ents = Att.activeEntitlements(s.id, entitlements, today)
    const packs = ents.map((e) => ({ e, b: Att.balance(e, sessions, attendance, classes), c: courses.find((c) => c.id === e.courseId) }))
    return { s, st, packs, fam: families.find((f) => f.id === s.familyId), inClasses: classes.filter((c) => c.active && c.studentIds.includes(s.id)) }
  })
  const shown = rows
    .filter((r) => !grade || r.s.grade === grade)
    .filter((r) => !status || r.st === status)
    .filter((r) => !q || `${r.s.name} ${r.s.nickname} ${r.fam?.name ?? ""} ${r.fam?.parents.map((p) => p.phone).join(" ") ?? ""}`.includes(q))
    .sort((a, b) => {
      const k = sort.key
      const v = k === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "name" ? a.s.name.localeCompare(b.s.name, "th")
          : k === "grade" ? byGrade(a.s.grade, b.s.grade)
            : k === "school" ? (a.s.school ?? "").localeCompare(b.s.school ?? "", "th")
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

  return (
    <div className="mx-auto max-w-7xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ชื่อ / ชื่อเล่น / ครอบครัว / เบอร์" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <NativeSelect className="h-9 w-28" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="ทุกชั้น" options={branch.grades.map((g) => ({ value: g, label: g }))} />
        <NativeSelect className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="ทุกสถานะ" options={Object.entries(STATUS_PILL).map(([k, v]) => ({ value: k, label: v.label }))} />
        <span className="text-xs text-muted-foreground">{shown.length} คน</span>
        <div className="ml-auto flex gap-2">
          {can(me, "student.export") && <Button variant="outline" onClick={exportCsv}><DownloadIcon /> ส่งออก</Button>}
          {can(me, "student.manage") && <Button onClick={() => setAdding(true)}><PlusIcon /> เพิ่มนักเรียน</Button>}
        </div>
      </div>

      {/* owner 2026-10-07: one fact per column (grade sortable on its own), fixed widths so pills never push a row
          out of line; name / nickname / grade / school edit in place — click the other cells to open the student */}
      <TableShell minWidth={1100} cols={["140px", "180px", "76px", "124px", "auto", "140px", "140px", "100px", "72px"]}>
        <thead className={HEAD}>
          <tr>
            <SortHeader label="ชื่อเล่น" k="nickname" sort={sort} onSort={toggle} />
            <SortHeader label="ชื่อ-นามสกุล" k="name" sort={sort} onSort={toggle} />
            <SortHeader label="ชั้น" k="grade" sort={sort} onSort={toggle} />
            <SortHeader label="โรงเรียน" k="school" sort={sort} onSort={toggle} />
            <SortHeader label="ครอบครัว" k="family" sort={sort} onSort={toggle} />
            <Th>คลาส</Th>
            <SortHeader label="สถานะ" k="status" sort={sort} onSort={toggle} />
            <Th>แพ็กเกจ</Th>
            <SortHeader label="เหลือ" k="left" sort={sort} onSort={toggle} right />
          </tr>
        </thead>
        <tbody>
          {pg.rows.map((r) => {
            const { s, st, packs, fam, inClasses } = r
            const n = left(r)
            return (
              <tr key={s.id} onClick={() => setOpenId(s.id)} data-focus={focusKeys(r)} className={ROW}>
                <td>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(s.id))}>{initial(s.nickname)}</span>
                    <EditCell value={s.nickname} disabled={!manage} className="flex-1 font-medium" onSave={(v) => edit(s, { nickname: v })} />
                  </div>
                </td>
                <td className="text-muted-foreground"><EditCell value={s.name} disabled={!manage} onSave={(v) => edit(s, { name: v })} /></td>
                <td><EditCell kind="select" value={s.grade} disabled={!manage} display={<GradeCell grade={s.grade} tone={gradeTone(s.grade)} />} options={branch.grades.map((g) => ({ value: g, label: g }))} onSave={(v) => edit(s, { grade: v })} /></td>
                <td className="text-muted-foreground"><EditCell value={s.school ?? ""} disabled={!manage} placeholder="ใส่โรงเรียน" onSave={(v) => edit(s, { school: v || undefined })} /></td>
                <td className="truncate text-muted-foreground">
                  {fam ? <>{fam.name}{!fam.parents.some((p) => p.lineLinked) && <span className="text-xs text-amber-700"> · ไม่มี LINE</span>}</> : <span className="text-amber-700">ยังไม่ผูกครอบครัว</span>}
                </td>
                <td className="truncate text-muted-foreground" title={inClasses.map((c) => c.name).join(", ")}>{inClasses.map((c) => c.name).join(", ") || "—"}</td>
                <td className="truncate"><Pill tone={STATUS_PILL[st].tone}>{STATUS_PILL[st].label}</Pill></td>
                <td className="truncate">{packs.map(({ e, c }) => c && <PackageBadge key={e.id} course={c} />)}{!packs.length && <span className="text-muted-foreground">—</span>}</td>
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
    </div>
  )
}
