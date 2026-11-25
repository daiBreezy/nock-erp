"use client"

import { useState } from "react"
import { CheckCircle2Icon, CheckIcon, ClockIcon, ListChecksIcon, PencilIcon, SettingsIcon, TrendingUpIcon } from "lucide-react"
import { ListPage, RangeStepper, SearchBox, Segmented } from "@/components/app/page-layout"
import { Kpi } from "@/components/app/kpi"
import { FilterMenu } from "@/components/app/filter-menu"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { gradeTone } from "@/components/app/subject-color"
import { GradeCell, gradeCompare, Pager, usePage, useSort } from "@/components/app/data-table"
import { Pill } from "@/components/app/badges"
import { ExamSheet, PctChange, ScoreCell } from "@/components/exams/exam-sheet"
import { ScoreInput } from "@/components/exams/score-input"
import { InfoTip } from "@/components/app/info-tip"
import { ExamSubjectsDialog } from "@/components/exams/exam-subjects-dialog"
import { Button } from "@/components/ui/button"
import { fmtMonth, toDateStr } from "@/domain/dates"
import * as Exam from "@/domain/rules/exams"
import { can } from "@/domain/rules/permissions"
import type { ExamTerm, ID } from "@/domain/types"
import { useBranch, useLeadSets, useNow, useQueryState } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type ExamSort = "nickname" | "grade" | "avg" | "change"

/**
 * Exam Result (owner 2026-11-23, Shibasan): the marks each student got at their own school — 4 exams a year, per subject.
 * Title = the exam being shown, sub header = the months it falls in. Pick a subject in the filters to see only that subject
 * across the 4 exams before this one. "Edit" turns the table into boxes: leave a box and it is saved.
 */
export default function ExamsPage() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const me = useStore((s) => s.me())
  const scope = useBranchScope()
  const allStudents = useStore((s) => s.students)
  const classes = useStore((s) => s.classes)
  const results = useStore((s) => s.examResults)
  const branches = useStore((s) => s.branches)
  const [q, setQ] = useState("")
  // owner 2026-11-24: All / Pending (status slot, like Billing) — Pending = students whose result for this exam is not entered yet
  const [status, setStatus] = useState<"all" | "pending">("all")
  const [grade, setGrade] = useQueryState<string>("grade", "")
  const [school, setSchool] = useQueryState<string>("school", "")
  const [subject, setSubject] = useQueryState<string>("subject", "")
  const [edit, setEdit] = useState(false)
  const [openId, setOpenId] = useState<ID | null>(null)
  const [subjectsOpen, setSubjectsOpen] = useState(false)
  const { sort, toggle } = useSort<ExamSort>("nickname")
  const byGrade = gradeCompare(branch.grades)
  // a teacher sees (and enters for) their own students; admin / manager see the whole branch
  const leadSet = useLeadSets() // owner 2026-11-25: Customers only — a Lead has no school exam to record
  const students = allStudents.filter((s) => scope.ids.includes(s.branchId) && !s.archived && !s.graduatedAt && !leadSet.studentIds.has(s.id) && Exam.canRecordExam(me, s, classes).ok)
  // default = the newest school year; the exam = the latest one that already has results (else the one running now)
  const newestYear = Math.max(Exam.academicYear(today), ...results.map((r) => r.year))
  const [yearPick, setYear] = useState<number | null>(null)
  const year = yearPick ?? newestYear
  const latestTerm = Exam.EXAM_TERMS.map((t) => t.id).filter((t) => results.some((r) => r.year === year && r.term === t && Object.keys(r.scores).length > 0)).at(-1)
  const [termPick, setTerm] = useState<ExamTerm | null>(null)
  const term = termPick ?? latestTerm ?? Exam.currentTerm(today)
  const range = Exam.termRange(year, term)
  // every subject any branch in view asks for, in order — one column each
  const allSubjects = [...new Set(scope.ids.flatMap((id) => { const b = branches.find((x) => x.id === id); return b ? Exam.examSubjectsOf(b) : [] }))]
  const rows = students.map((s) => {
    const res = Exam.examOf(results, s.id, year, term)
    const done = !!res && Object.keys(res.scores).length > 0
    return { s, res, done, avg: res ? Exam.examAverage(res) : null, change: done ? Exam.examChangeAt(results, s.id, year, term) : null }
  })
  type Row = (typeof rows)[number]
  const schools = [...new Set(students.map((s) => s.school).filter((x): x is string => !!x))].sort((a, b) => a.localeCompare(b, "th"))
  const shown = rows
    .filter((r) => !grade || r.s.grade === grade)
    .filter((r) => !school || r.s.school === school)
    .filter((r) => status === "all" || !r.done)
    .filter((r) => !q || `${r.s.name} ${r.s.nickname}`.includes(q))
    .sort((a, b) => {
      const v = sort.key === "nickname" ? a.s.nickname.localeCompare(b.s.nickname, "th")
        : sort.key === "grade" ? byGrade(a.s.grade, b.s.grade)
          : sort.key === "avg" ? (a.avg ?? -1) - (b.avg ?? -1)
            : (a.change ?? -999) - (b.change ?? -999)
      return sort.desc ? -v : v
    })
  const pg = usePage(shown)
  const doneRows = rows.filter((r) => r.done)
  const avgAll = doneRows.length ? Math.round((doneRows.reduce((a, r) => a + (r.avg ?? 0), 0) / doneRows.length) * 10) / 10 : null
  const compared = rows.filter((r) => r.change !== null)
  const canEdit = can(me, "exam.record")
  // one subject picked → only that subject, across the 4 exams before this one + this one (oldest → newest)
  const periods = subject ? [...Exam.previousPeriods(year, term, 4), { year, term }] : []
  const label = (p: { year: number; term: ExamTerm }) => `${Exam.termLabel(p.term)} ${String(p.year + 543).slice(2)}`

  const columns: Column<Row>[] = [
    { id: "nickname", label: "ชื่อเล่น", width: "120px", sort: "nickname", required: true, cell: ({ s }) => <span className="font-medium">{s.nickname}</span> },
    { id: "branch", label: "สาขา", width: "72px", cell: ({ s }) => <BranchCode code={scope.code(s.branchId)} /> },
    { id: "name", label: "ชื่อ-นามสกุล", width: "170px", defaultHidden: true, className: "text-muted-foreground", cell: ({ s }) => s.name },
    { id: "grade", label: "ชั้น", width: "76px", sort: "grade", cell: ({ s }) => <GradeCell grade={s.grade} tone={gradeTone(s.grade)} /> },
    { id: "school", label: "โรงเรียน", width: "120px", className: "text-muted-foreground", cell: ({ s }) => (s.school ? <span className="block max-w-32 truncate" title={s.school}>{s.school}</span> : "—") },
    { id: "status", label: "สถานะ", width: "96px", cell: ({ done }) => <Pill tone={done ? "green" : "amber"}>{done ? "Done" : "Waiting"}</Pill> },
    ...(subject
      ? periods.map((p): Column<Row> => ({ id: `p-${p.year}-${p.term}`, label: label(p), width: edit ? "176px" : "132px", align: "right",
        cell: ({ s }) => {
          const sc = Exam.examOf(results, s.id, p.year, p.term)?.scores[subject]
          return edit ? <ScoreInput studentId={s.id} year={p.year} term={p.term} subject={subject} /> : <ScoreCell score={sc} change={sc ? Exam.examChangeAt(results, s.id, p.year, p.term, subject) : null} />
        } }))
      : [
        { id: "avg", label: "เฉลี่ย", width: "110px", sort: "avg" as const, align: "right" as const, info: "% เฉลี่ยของวิชาที่กรอกในการสอบนี้ · ▲▼ = เทียบครั้งก่อน", cell: ({ avg, change }: Row) => (edit ? <span className="text-muted-foreground">—</span> : <PctChange pct={avg} change={change} />) },
        ...allSubjects.map((sub): Column<Row> => ({ id: `sub-${sub}`, label: tx(sub), width: edit ? "176px" : "124px", align: "right", defaultHidden: Exam.isOptionalSubject(sub), cell: ({ s, res }) => (edit
          ? <ScoreInput studentId={s.id} year={year} term={term} subject={sub} />
          : <ScoreCell score={res?.scores[sub]} change={res?.scores[sub] ? Exam.examChangeAt(results, s.id, year, term, sub) : null} />) })),
      ]),
  ]
  return (
    <ListPage branch={scope.select}
      title={<span className="inline-flex items-center gap-1.5">ผลสอบ {Exam.termLabel(term)} ปีการศึกษา {year + 543}<InfoTip text="คะแนนสอบที่โรงเรียนของนักเรียน ปีละ 4 ครั้ง (กลางภาค/ปลายภาค × 2) แยกรายวิชา · เลือกวิชาในตัวกรองเพื่อดูวิชาเดียวเทียบ 4 ครั้งก่อนหน้า · กด Edit เพื่อกรอกคะแนนในตารางได้เลย (กรอกแล้วบันทึกทันที)" /></span>}
      description={`${fmtMonth(range.from)} – ${fmtMonth(range.to)}`}
      actions={can(me, "course.manage") && <Button variant="outline" onClick={() => setSubjectsOpen(true)}><SettingsIcon /> จัดการวิชา</Button>}
      kpis={<>
        <Kpi icon={CheckCircle2Icon} label="Done" value={doneRows.length} sub={`${Exam.termLabel(term)} · ปีการศึกษา ${year + 543}`} tone="emerald" />
        <Kpi icon={ClockIcon} label="Waiting" value={rows.length - doneRows.length} sub={`จากนักเรียน ${students.length} คน`} tone="amber" emphasis={rows.length > doneRows.length} />
        <Kpi icon={ListChecksIcon} label="เฉลี่ยครั้งนี้" value={avgAll === null ? "—" : `${avgAll}%`} sub="ทุกวิชาที่กรอก" tone="sky" />
        <Kpi icon={TrendingUpIcon} label="ดีขึ้นจากครั้งก่อน" value={compared.filter((r) => (r.change ?? 0) > 0).length} sub={compared.length ? `จาก ${compared.length} คนที่เทียบได้` : "ยังเทียบไม่ได้"} tone="emerald" />
      </>}
      search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาชื่อ / ชื่อเล่น" />}
      period={<><Segmented label="สถานะ" value={status} onChange={setStatus}
        options={[{ value: "all" as const, label: "All" }, { value: "pending" as const, label: <>Pending{rows.length > doneRows.length && <span className="rounded-full bg-warning-soft px-1.5 text-xs text-warning-ink tabular-nums">{rows.length - doneRows.length}</span>}</> }]} />
        <RangeStepper label={`ปีการศึกษา ${year + 543}`} current={year === newestYear} onPrev={() => setYear(year - 1)} onNext={() => setYear(Math.min(newestYear, year + 1))} onToday={() => setYear(newestYear)} /></>}
      view={<Segmented value={term} onChange={setTerm} options={Exam.EXAM_TERMS.map((t) => ({ value: t.id, label: t.label }))} label="การสอบ" />}
      filters={<>
        <FilterMenu fields={[
          { id: "subject", label: "วิชา", value: subject, onChange: setSubject, placeholder: "ทุกวิชา", options: allSubjects.map((g) => ({ value: g, label: g })) },
          { id: "grade", label: "ชั้น", value: grade, onChange: setGrade, placeholder: "ทุกชั้น", options: branch.grades.map((g) => ({ value: g, label: g })) },
          { id: "school", label: "โรงเรียน", value: school, onChange: setSchool, placeholder: "ทุกโรงเรียน", searchable: true, options: schools.map((g) => ({ value: g, label: g })) },
        ]} />
        {canEdit && <Button variant="outline" type="button" aria-pressed={edit} onClick={() => setEdit(!edit)} className={cn("h-9 rounded-3xl px-3 text-sm", edit && "border-primary bg-primary/10 font-medium text-primary hover:bg-primary/15")}>{edit ? <CheckIcon /> : <PencilIcon />} Edit</Button>}
        <ColumnsMenu id="exams2" columns={columns} />
      </>}>
      <DataTable id="exams2" columns={columns} rows={pg.rows} rowKey={(r) => r.s.id} onRowClick={edit ? undefined : (r) => setOpenId(r.s.id)} sort={sort} onSort={toggle} fit empty="ไม่พบนักเรียน" />
      <Pager {...pg} unit="คน" />
      <ExamSheet studentId={openId} initial={{ year, term }} onClose={() => setOpenId(null)} />
      {subjectsOpen && <ExamSubjectsDialog branch={branch} onClose={() => setSubjectsOpen(false)} />}
    </ListPage>
  )
}
