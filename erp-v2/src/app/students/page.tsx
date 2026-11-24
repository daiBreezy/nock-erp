"use client"

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { RolloverBanner } from "@/components/students/rollover-banner"
import { busUseOf, familyShortName, familyDisplay } from "@/domain/rules/people"
import { branchHasBus } from "@/domain/rules/settings"
import { BusUseChip } from "@/components/transport/labels"
import { ListPage, SearchBox } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { useState } from "react"
import { ChevronDownIcon, DownloadIcon, GraduationCapIcon, LogOutIcon, PlusIcon, RefreshCwIcon, SparklesIcon, TriangleAlertIcon, UnlinkIcon } from "lucide-react"
import { GenderIcon, Pill } from "@/components/app/badges"
import { FilterMenu } from "@/components/app/filter-menu"
import { StudentSheet } from "@/components/app/student-sheet"
import { STATUS_PILL } from "@/components/app/student-status"
import { GradeCell, gradeCompare, Pager, usePage, useSort } from "@/components/app/data-table"
import { CreditTag } from "@/components/app/credit-tag"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { creditCourseOn, creditOwedTotal, creditsOwed } from "@/domain/rules/credit"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { PhotoCell } from "@/components/app/photo-cell"
import { useFocusFirst } from "@/components/app/focus-banner"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { addDays, daysBetween, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import * as Exam from "@/domain/rules/exams"
import { ScoreCell } from "@/components/exams/exam-sheet"
import type { ID, Student } from "@/domain/types"
import { EditCell } from "@/components/app/inline-edit"
import { report } from "@/lib/feedback"

type StudentSort = "nickname" | "name" | "grade" | "family" | "course" | "enroll" | "end" | "status" | "left"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "@/lib/toast"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"

export default function StudentsPage() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const me = useStore((s) => s.me())
  const saveStudent = useStore((s) => s.saveStudent)
  const manage = can(me, "student.manage")
  // inline edit (owner 2026-10-07, back 2026-10-12): only some cells — the rest open the side panel
  const edit = (st: Student, patch: Partial<Student>) => report(saveStudent({ ...st, ...patch }), "บันทึกแล้ว")
  // owner 2026-10-09: Director / Area Manager can list several branches at once
  const scope = useBranchScope()
  const students = useStore((s) => s.students).filter((s) => scope.ids.includes(s.branchId))
  const families = useStore((s) => s.families)
  const classes = useStore((s) => s.classes)
  const entitlements = useEntitlements()
  const invoices = useStore((s) => s.invoices)
  // owner 2026-11-19: the Credit column exists only while the system switch is on (and can be hidden from the columns menu)
  const creditOn = useStore((s) => creditCourseOn(s.system.settings))
  const allBranches = useStore((s) => s.branches)
  const branchOf = (id: string) => allBranches.find((b) => b.id === id)
  const busOn = scope.ids.some((id) => branchHasBus(branchOf(id)))
  const examResults = useStore((s) => s.examResults)
  // every subject the exam page asks for at the branches in view — one hidden column each
  const examSubjects = [...new Set(scope.ids.flatMap((id) => { const b = branchOf(id); return b ? Exam.examSubjectsOf(b) : [] }))]
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const leaves = useStore((s) => s.leaves)
  const courses = useStore((s) => s.courses)
  const [q, setQ] = useState("")
  // owner 2026-10-06: filters sync to the URL (?grade=&status=) so a reload or shared link keeps them
  const [grade, setGrade] = useQueryState<string>("grade", "")
  const [status, setStatus] = useQueryState<string>("status", "")
  const [noFamily, setNoFamily] = useQueryState<string>("family", "")
  // owner 2026-11-19: Archived is a show / hide tick in the filters (hidden until ticked), not a status choice
  const [showArchived, setShowArchived] = useQueryState<"0" | "1">("archived", "0")
  const [openId, setOpenId] = useState<ID | "new" | null>(null)

  const { sort, toggle } = useSort<StudentSort>("nickname")
  const byGrade = gradeCompare(branch.grades)
  /** sessions left on the lowest session pack (subscriptions count as plenty) */
  // owner 2026-11-19: sessions left for every package type — counted packs from their balance, monthly / weekly packs = the sessions still ahead inside the package
  const left = (r: (typeof rows)[number]) => Math.min(Infinity, ...r.packs.map(({ e, b }) => e.kind === "sessions" ? b.remaining : sessions.filter((se) => !se.cancelled && se.date >= today && se.studentIds.includes(e.studentId) && Att.packageCovers(e, se)).length))
  const rows = students.map((s) => {
    const st = Att.studentStatus(s, entitlements, leaves, today)
    const ents = Att.activeEntitlements(s.id, entitlements, today)
    const packs = ents.map((e) => ({ e, b: Att.balance(e, sessions, attendance, classes), c: courses.find((c) => c.id === e.courseId) }))
    // the course shown in the table (owner 2026-10-07: Course + Enroll / End date instead of classes): the current
    // package that ends first (the one renewals are about) — or, for students with none now, the last one they had
    const main = [...ents].sort((a, b) => a.to.localeCompare(b.to))[0]
      ?? entitlements.filter((e) => e.studentId === s.id && e.from <= today).sort((a, b) => b.to.localeCompare(a.to))[0]
    return { s, st, ex: Att.exitPending(s, today), credit: creditsOwed(s.id, entitlements, invoices), packs, main, mainCourse: main && courses.find((c) => c.id === main.courseId), fam: families.find((f) => f.id === s.familyId) }
  })
  /** 0 = แจ้งออก (open) · 1 = ใกล้หมดอายุ (waiting to renew, or the package ends within 7 days) · 2 = the rest */
  const urgency = (r: (typeof rows)[number]) => (r.ex ? 0 : r.st === "renewal" || (!!r.main && r.main.to >= today && r.main.to <= addDays(today, 7)) ? 1 : 2)
  const shown = rows
    .filter((r) => !grade || r.s.grade === grade)
    // "exiting" = gave notice, not closed yet (owner 2026-10-14) — a status of its own on top of Active / Renewal …
    .filter((r) => showArchived === "1" || r.st !== "archived")
    .filter((r) => !status || (status === "exiting" ? !!r.ex : r.st === status))
    .filter((r) => (noFamily === "none" ? !r.s.familyId : noFamily === "attention" ? !!r.ex || !r.s.familyId : true))
    .filter((r) => !q || `${r.s.name} ${r.s.nickname} ${r.fam?.name ?? ""} ${r.fam?.parents.map((p) => p.phone).join(" ") ?? ""}`.includes(q))
    .sort((a, b) => {
      // owner 2026-10-14: gave notice first, then packages about to run out — always on top, whatever the sort;
      // inside each group the nearest date first, then the chosen sort
      const p = urgency(a) - urgency(b)
      if (p) return p
      if (urgency(a) === 0) return a.ex!.lastDate.localeCompare(b.ex!.lastDate)
      if (urgency(a) === 1) return (a.main?.to ?? "9").localeCompare(b.main?.to ?? "9")
      const k = sort.key
      const v = k === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : k === "name" ? a.s.name.localeCompare(b.s.name, "th")
          : k === "grade" ? byGrade(a.s.grade, b.s.grade)
            : k === "course" ? (a.mainCourse?.name ?? "\uffff").localeCompare(b.mainCourse?.name ?? "\uffff", "th")
              : k === "enroll" ? (a.main?.from ?? "9").localeCompare(b.main?.from ?? "9")
                : k === "end" ? (a.main?.to ?? "9").localeCompare(b.main?.to ?? "9")
              : k === "family" ? familyShortName(a.fam?.name ?? "").localeCompare(familyShortName(b.fam?.name ?? ""), "th")
                : k === "status" ? STATUS_PILL[a.st].label.localeCompare(STATUS_PILL[b.st].label, "th")
                  : left(a) - left(b)
      return sort.desc ? -v : v
    })
  const focusKeys = (r: (typeof rows)[number]) => [r.ex && "exiting", r.st === "renewal" && Att.renewalFollowUpDue(r.s, today) && "renewal", !r.s.familyId && "no_family"].filter(Boolean).join(" ") || undefined
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
    exiting: rows.filter((r) => r.ex).length,
    // Design System (owner 2026-11-10): exits + students without a family = one "needs follow-up" card (4 KPIs max)
    attention: rows.filter((r) => r.ex || !r.s.familyId).length,
  }
  const pick = (v: string) => setStatus(status === v ? "" : v)

  type Row = (typeof rows)[number]
  const ended = (r: Row) => !!r.main && r.main.to < today
  const columns: Column<Row>[] = [
    // owner 2026-10-12: photo and name in their own columns — click the photo to upload / change / remove
    { id: "photo", label: "รูป", width: "64px", cell: ({ s }) => <PhotoCell person={s} disabled={!manage} onSave={(photo, msg) => report(saveStudent({ ...s, photo }), msg)} /> },
    { id: "nickname", label: "ชื่อเล่น", width: "130px", sort: "nickname", required: true, cell: ({ s }) => (
      <div className="flex min-w-0 items-center gap-2">
        <EditCell value={s.nickname} display={<span className="inline-flex items-center gap-1">{s.nickname}<GenderIcon gender={s.gender} /></span>} disabled={!manage} className="flex-1 font-medium" onSave={(v) => edit(s, { nickname: v })} />
      </div>
    ) },
    // owner 2026-10-15: every list shows which branch each row comes from
    { id: "branch", label: "สาขา", width: "72px", cell: ({ s }) => <BranchCode code={scope.code(s.branchId)} /> },
    { id: "name", label: "ชื่อ-นามสกุล", width: "170px", sort: "name", defaultHidden: true, className: "text-muted-foreground", cell: ({ s }) => <EditCell value={s.name} disabled={!manage} onSave={(v) => edit(s, { name: v })} /> },
    { id: "grade", label: "ชั้น", width: "76px", sort: "grade", cell: ({ s }) => <EditCell kind="select" value={s.grade} disabled={!manage} display={s.graduatedAt ? <Pill tone="gray" title={`จบการศึกษา ${fmtDate(s.graduatedAt, { year: true })}`}>จบการศึกษา</Pill> : <GradeCell grade={s.grade} tone={gradeTone(s.grade)} />} options={branch.grades.map((g) => ({ value: g, label: g }))} onSave={(v) => edit(s, { grade: v })} /> },
    { id: "family", label: "ครอบครัว", width: "130px", sort: "family", className: "text-muted-foreground", cell: ({ fam }) => (
      fam ? <>{familyDisplay(fam.name)}{!fam.parents.some((p) => p.lineLinked) && <NoLine />}</> : <span className="text-warning">ยังไม่ผูกครอบครัว</span>
    ) },
    { id: "course", label: "Course", width: "180px", sort: "course", cell: (r) => (
      r.mainCourse ? (
        <span className={cn("flex items-center gap-1.5", ended(r) && "text-muted-foreground")} title={r.packs.map((p) => p.c?.name).filter(Boolean).join(", ") || r.mainCourse.name}>
          {r.mainCourse.name}
          {r.packs.length > 1 && <span className="text-xs text-muted-foreground">+{r.packs.length - 1}</span>}
        </span>
      ) : <span className="text-muted-foreground">—</span>
    ) },
    // owner 2026-11-19: the Bus column shows the 4 types and exists only when a branch in view runs a bus
    ...(busOn ? [{ id: "bus", label: "รถรับส่ง", width: "150px", cell: ({ s }: Row) => (branchHasBus(branchOf(s.branchId)) ? <BusUseChip use={busUseOf(s)} /> : <span className="text-muted-foreground">—</span>) }] : []),
    ...(creditOn ? [{ id: "credit", label: "Credit", width: "96px", info: "นักเรียนที่เรียนก่อนจ่าย (Credit Course) — ยอดที่ยังค้างอยู่",
      // owner 2026-11-19: just the tag's icon + the total owed; hover lists each Credit Course with its amount
      cell: ({ credit }: Row) => (credit.length ? (
        <HoverCard>
          <HoverCardTrigger render={<span className="inline-flex cursor-default" />}><CreditTag label={fmtMoney(creditOwedTotal(credit))} /></HoverCardTrigger>
          <HoverCardContent align="start" className="w-auto max-w-72 space-y-1 text-xs">
            <p className="font-semibold">Credit Course</p>
            <ul className="space-y-0.5">
              {credit.map((e) => <li key={e.id} className="flex gap-3"><span className="min-w-0 flex-1">• {courses.find((c) => c.id === e.courseId)?.name ?? "คอร์ส"}</span><span className="tabular-nums">{fmtMoney(e.credit!.amount).replace("฿", "")}</span></li>)}
            </ul>
          </HoverCardContent>
        </HoverCard>
      ) : <span className="text-muted-foreground">—</span>) } satisfies Column<Row>] : []),
    // owner 2026-11-23 (Shibasan): the schools the family hopes to enter — hidden until switched on in the columns menu
    { id: "target", label: "โรงเรียนเป้าหมาย", width: "210px", defaultHidden: true, className: "text-muted-foreground",
      cell: ({ s }) => (s.targetSchools?.length ? <span className="block truncate" title={s.targetSchools.map((t, i) => `${i + 1}. ${t.school}`).join("\n")}>{s.targetSchools.map((t, i) => `${i + 1}. ${t.school}`).join(" · ")}</span> : "—") },
    // owner 2026-11-23: school exam result per subject (newest score as a %, ▲▼ against the previous exam) — hidden until switched on
    ...examSubjects.map((sub): Column<Row> => ({ id: `exam-${sub}`, label: `สอบ ${sub}`, width: "104px", align: "right", defaultHidden: true,
      cell: ({ s }) => {
        const r = Exam.examsOf(examResults, s.id).reverse().find((x) => x.scores[sub])
        return r ? <ScoreCell score={r.scores[sub]} change={Exam.examChangeAt(examResults, s.id, r.year, r.term, sub)} /> : <span className="text-muted-foreground">—</span>
      } })),
    { id: "enroll", label: "Enroll date", width: "100px", sort: "enroll", defaultHidden: true, className: "text-muted-foreground tabular-nums", cell: ({ main }) => (main ? fmtDate(main.from) : "—") },
    // owner 2026-11-19: the date stays neutral; "เหลือ N วัน" shows only in the last 7 days and carries the colour — 4–7 yellow, 0–3 red
    { id: "end", label: "End date", width: "110px", sort: "end", cell: ({ main }) => {
      if (!main) return "—"
      const days = daysBetween(today, main.to)
      return (
        <span className="block leading-tight">
          {fmtDate(main.to)}
          {main.to < today ? <span className="block text-xs font-normal text-muted-foreground">หมดแล้ว</span>
            : days <= 7 && <span className={cn("block text-xs font-medium", days <= 3 ? "text-danger" : "text-warning")}>{`เหลือ ${days} วัน`}</span>}
        </span>
      )
    }, className: (r) => cn("tabular-nums", ended(r) ? "text-muted-foreground" : "text-foreground") },
    // owner 2026-11-04: "เหลือ" (sessions left) counts only session-based packs — monthly / flat-rate show — (unlimited)
    { id: "left", label: "เหลือ", width: "80px", sort: "left", align: "right", info: "จำนวนคาบที่ยังเหลือในแพ็กเกจ — แพ็กเกจแบบนับคาบนับจากยอดคงเหลือ · รายเดือน/รายสัปดาห์นับคาบข้างหน้าที่ยังไม่ถึงจนถึงวันจบ", className: (r) => cn("tabular-nums", left(r) <= 2 && "font-semibold text-danger"),
      cell: (r) => { const n = left(r); return Number.isFinite(n) ? n : <span className="text-muted-foreground">—</span> } },
    // owner 2026-11-04: keep the status pill short — the date / details live in the tooltip, not the chip
    { id: "status", label: "สถานะ", width: "112px", sort: "status", align: "right", cell: ({ st, ex }) => {
      if (!ex) return <Pill tone={STATUS_PILL[st].tone}>{STATUS_PILL[st].label}</Pill>
      // owner 2026-11-19: urgency is told by colour, never by extra words — a notice still running = soft red "แจ้งออก"; past the last day = solid red;
      // more than 3 days past = dark red, icon only
      const late = ex.overdue ? daysBetween(ex.lastDate, today) : 0
      const tip = `แจ้งออก · เรียนวันสุดท้าย ${fmtDate(ex.lastDate, { weekday: true })}${late > 0 ? ` · เลยมา ${late} วัน` : ""}${ex.answered ? " · ผู้ปกครองตอบฟอร์มแล้ว" : ""} — คุยกับผู้ปกครอง หรือปิดเรื่อง (Archive) ใน Panel นักเรียน`
      if (late > 3) return <span className="inline-flex size-6 items-center justify-center rounded-full bg-danger-ink text-background" role="img" aria-label={tip} title={tip}><LogOutIcon className="size-3.5" /></span>
      if (late > 0) return <span className="inline-flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 text-xs font-medium whitespace-nowrap text-background" title={tip}><LogOutIcon className="size-3" />แจ้งออก</span>
      return <Pill tone="red" title={tip}><LogOutIcon className="size-3" />แจ้งออก</Pill>
    } },
  ]

  return (
    <div className="space-y-4">
      {/* owner 2026-11-19: yearly grade change — reminder from 7 days before, the Admin approves */}
      {scope.ids.map((id) => <RolloverBanner key={id} branchId={id} />)}
    <ListPage branch={scope.select} title="นักเรียน" description="นักเรียนทั้งหมด คอร์สที่เรียนอยู่ และวันจบแพ็กเกจ"
        actions={(can(me, "student.export") || can(me, "student.manage")) && (
          // owner 2026-11-13: the two header buttons folded into one dropdown, like the other pages
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button />}><PlusIcon /> เพิ่ม / ส่งออก <ChevronDownIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-48">
              {can(me, "student.manage") && <DropdownMenuItem onClick={() => setOpenId("new")}><PlusIcon /> เพิ่มนักเรียน</DropdownMenuItem>}
              {can(me, "student.export") && <DropdownMenuItem onClick={exportCsv}><DownloadIcon /> ส่งออก</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      kpis={<>
        <Kpi icon={GraduationCapIcon} label="กำลังเรียน" value={kpi.active} sub={`ในรายการ ${shown.length} คน`} tone="emerald" onClick={() => pick("active")} active={status === "active"} />
        <Kpi icon={RefreshCwIcon} label="รอต่อคอร์ส" value={kpi.renewal} tone="amber" emphasis={!!(kpi.renewal)} onClick={() => pick("renewal")} active={status === "renewal"} />
        <Kpi icon={SparklesIcon} label="นักเรียนใหม่เดือนนี้" value={kpi.fresh} tone="sky" />
        <Kpi icon={TriangleAlertIcon} label="ต้องตามเรื่อง" value={kpi.attention} tone="amber" emphasis={!!kpi.attention}
          sub={<>แจ้งออก {kpi.exiting}{" · "}ไม่ผูกครอบครัว {kpi.noFamily}</>}
          onClick={() => { setStatus(""); setNoFamily(noFamily === "attention" ? "" : "attention") }} active={noFamily === "attention"} />
      </>}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาชื่อ / ชื่อเล่น / ครอบครัว / เบอร์" />}
      filters={<>
        <FilterMenu checks={[{ key: "archived", label: "Archived", on: showArchived === "1", count: rows.filter((r) => r.st === "archived").length, onChange: (v) => setShowArchived(v ? "1" : "0") }]} fields={[
          { id: "grade", label: "ชั้น", value: grade, onChange: setGrade, placeholder: "ทุกชั้น", options: branch.grades.map((g) => ({ value: g, label: g })) },
          { id: "status", label: "สถานะ", value: status, onChange: setStatus, placeholder: "ทุกสถานะ", options: [...Object.entries(STATUS_PILL).filter(([k]) => k !== "archived").map(([k, v]) => ({ value: k, label: v.label })), { value: "exiting", label: "แจ้งออก" }] },
        ]} />
        <ColumnsMenu id="students" columns={columns} />
      </>}>
      {/* owner 2026-10-07: one fact per column (grade sortable on its own); Course + Enroll / End date instead of
          classes, school only in the student panel. Name / nickname / grade edit in place — click the other cells to
          open. owner 2026-10-12: each person arranges the columns (drag · lock · show / hide) — DataTable */}
      <DataTable id="students" columns={columns} rows={pg.rows} rowKey={(r) => r.s.id} onRowClick={(r) => setOpenId(r.s.id)}
        rowProps={(r) => ({ "data-focus": focusKeys(r) })} rowClassName={(r) => !!r.ex && "bg-danger-soft/40"} sort={sort} onSort={toggle} fit empty="ไม่พบนักเรียน" />
      <Pager {...pg} unit="คน" />
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
    </ListPage>
    </div>
  )
}

/** owner 2026-10-12: "no LINE" as an icon (hover explains) instead of text */
function NoLine() {
  return <UnlinkIcon role="img" aria-label="ไม่มี LINE" className="ml-1.5 inline size-3.5 align-[-2px] text-warning"><title>ไม่มีผู้ปกครองที่ผูก LINE — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</title></UnlinkIcon>
}
