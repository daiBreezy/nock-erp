"use client"

import { useMemo, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, SchoolIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { tx } from "@/lib/i18n"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntityPanel, PanelBody, PanelFooter } from "@/components/app/form-shell"
import { Kpi } from "@/components/app/kpi"
import { KpiRow, RangeStepper, Segmented } from "@/components/app/page-layout"
import { InfoTip } from "@/components/app/info-tip"
import { cellInput } from "./score-field"
import { toDateStr } from "@/domain/dates"
import * as Exam from "@/domain/rules/exams"
import type { ExamScore, ExamTerm, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

/** an arrow against the previous exam, in a fixed slot so numbers keep their alignment whether or not there is one */
function Arrow({ change }: { change?: number | null }) {
  const up = (change ?? 0) > 0, down = (change ?? 0) < 0
  return (
    <span className="inline-grid size-4 shrink-0 place-items-center" title={change ? `${change > 0 ? "+" : ""}${change}` : undefined}>
      {up && <ArrowUpIcon className="size-3.5 text-success" />}{down && <ArrowDownIcon className="size-3.5 text-danger" />}
    </span>
  )
}

/** a percentage with the arrow in a fixed slot in front (the arrows line up row after row) */
export function PctChange({ pct, change }: { pct: number | null; change?: number | null }) {
  if (pct === null) return <span className="text-muted-foreground">—</span>
  return <span className="inline-flex items-center tabular-nums"><Arrow change={change} /><span className="w-14 text-right font-medium">{pct.toFixed(1)}%</span></span>
}

/**
 * one subject of one exam (owner 2026-11-23): [arrow] score / full — three small fixed-width boxes (score right-aligned, the
 * slash, full marks right-aligned) so the block is compact: the arrow stays close to the number, the slash and the arrow
 * line up row after row, and the right edge is the cell's edge — the same edge as the column header. Centred top / bottom; when the row is hovered the numbers slide up and the percentage appears under them,
 * right-aligned to the same edge as the total.
 */
export function ScoreCell({ score, change }: { score?: ExamScore; change?: number | null }) {
  if (!score) return <span className="text-muted-foreground">—</span>
  return (
    <span className="relative inline-flex h-10 w-full items-center justify-end tabular-nums">
      {/* owner 2026-11-24: no fixed-width boxes — score / full right-aligned to the cell edge; the arrow shows with the percentage on hover */}
      <span className="inline-flex items-center gap-0.5 transition-transform duration-150 group-hover/row:-translate-y-2">
        <span className="font-medium">{Exam.fmtScore(score.score)}</span>
        <span className="text-muted-foreground">/</span>
        <span className="font-medium">{Exam.fmtScore(score.full)}</span>
      </span>
      <span className="pointer-events-none absolute top-1/2 right-0 inline-flex translate-y-0.5 items-center gap-0.5 text-right text-xs text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/row:opacity-100"><Arrow change={change} />{Exam.pct(score).toFixed(1)}%</span>
    </span>
  )
}

/**
 * Exam Result panel (owner 2026-11-23): one student, one school year — pick the exam (4 a year) and type each subject's
 * score and full marks. A subject left empty is simply not entered (some students sit 3 subjects, some 5; the
 * "additional" subjects are optional).
 */
export function ExamSheet({ studentId, initial, onClose }: { studentId: ID | null; /** open on this school year / exam (the page's current choice) */ initial?: { year: number; term: ExamTerm }; onClose: () => void }) {
  const stu = useStore((s) => s.students.find((x) => x.id === studentId))
  const branch = useStore((s) => s.branches.find((b) => b.id === stu?.branchId))
  const results = useStore((s) => s.examResults)
  const save = useStore((s) => s.saveExamResult)
  const me = useStore((s) => s.me())
  const classes = useStore((s) => s.classes)
  const today = toDateStr(useNow())
  const thisYear = Exam.academicYear(today)
  const [year, setYear] = useState(initial?.year ?? thisYear)
  const [term, setTerm] = useState<ExamTerm>(initial?.term ?? Exam.currentTerm(today))
  // typed values: subject → [score, full] as text — reset whenever the student / year / exam changes (key on the form)
  const [draft, setDraft] = useState<Record<string, [string, string]>>({})
  const [loadedFor, setLoadedFor] = useState("")
  // each time a student is opened, start on the page's school year / exam
  const [openedFor, setOpenedFor] = useState<ID | null>(null)
  if (studentId !== openedFor) {
    setOpenedFor(studentId)
    if (studentId && initial) { setYear(initial.year); setTerm(initial.term) }
  }
  const key = `${studentId}|${year}|${term}`
  const current = stu ? Exam.examOf(results, stu.id, year, term) : undefined
  const subjects = useMemo(() => {
    if (!branch) return []
    // the branch's subjects first, then any other subject this student already has (a subject removed later keeps its history)
    const extra = Object.keys(current?.scores ?? {}).filter((k) => !Exam.examSubjectsOf(branch).includes(k))
    return [...Exam.examSubjectsOf(branch), ...extra]
  }, [branch, current])
  if (loadedFor !== key) {
    setLoadedFor(key)
    setDraft(Object.fromEntries(Object.entries(current?.scores ?? {}).map(([k, v]) => [k, [String(v.score), String(v.full)] as [string, string]])))
  }
  const allowed = stu ? Exam.canRecordExam(me, stu, classes) : { ok: false as const, error: "" }
  const canEdit = allowed.ok
  const set = (sub: string, i: 0 | 1, v: string) => setDraft((d) => {
    const cur = d[sub] ?? ["", ""]
    return { ...d, [sub]: i === 0 ? [v, cur[1]] : [cur[0], v] }
  })
  // the full marks this student used last for a subject — shown as the placeholder (default 100)
  const lastFull = (sub: string) => (stu ? Exam.examsOf(results, stu.id).reverse().find((r) => r.scores[sub])?.scores[sub].full : undefined) ?? 100
  const parsed = (sub: string): ExamScore | null => {
    const d = draft[sub]
    if (!d || d[0].trim() === "") return null
    return { score: Number(d[0]), full: Number(d[1].trim() || String(lastFull(sub))) }
  }
  const scores = Object.fromEntries(subjects.map((s) => [s, parsed(s)] as const).filter((x): x is [string, ExamScore] => !!x[1]))
  const error = Object.entries(scores).map(([s, sc]) => { const e = Exam.validateScore(sc); return e ? `${tx(s)}: ${tx(e)}` : null }).find(Boolean) ?? null
  const dirty = JSON.stringify(Object.entries(scores).sort()) !== JSON.stringify(Object.entries(current?.scores ?? {}).sort())
  const yearExams = stu ? Exam.EXAM_TERMS.map((t) => ({ t, r: Exam.examOf(results, stu.id, year, t.id) })) : []
  return (
    <EntityPanel open={!!studentId && !!stu} onClose={onClose}>
      {stu && (
        <>
          <SheetHeader className="shrink-0 border-b pb-3">
            <div className="flex items-center gap-2 pr-8">
              <SheetTitle className="min-w-0 flex-1 truncate text-lg">ผลสอบโรงเรียน · {stu.nickname}</SheetTitle>
              <InfoTip text="กรอกคะแนนที่ได้และคะแนนเต็มของแต่ละวิชา (เว้นวิชาที่ไม่ได้สอบไว้ว่าง) — ระบบคิดเป็น % ให้ เทียบกับครั้งก่อนอัตโนมัติ" />
            </div>
            <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>{stu.name} · {stu.grade}</span>
              {stu.school && <span className="inline-flex items-center gap-1"><SchoolIcon className="size-3.5" />{stu.school}</span>}
            </SheetDescription>
          </SheetHeader>
          <PanelBody>
            <div className="flex flex-wrap items-center gap-2">
              <RangeStepper label={`ปีการศึกษา ${year + 543}`} current={year === thisYear} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} onToday={() => setYear(thisYear)} />
              <Segmented value={term} onChange={setTerm} options={Exam.EXAM_TERMS.map((t) => ({ value: t.id, label: t.label }))} label="การสอบ" />
            </div>
            {!canEdit && <p className="rounded-lg bg-muted/60 p-2.5 text-xs text-muted-foreground">{allowed.ok ? "" : tx(allowed.error)} — ดูอย่างเดียว</p>}
            {/* one table: subject · score · full marks · % — header on top, rows divided by a hairline (owner 2026-11-23) */}
            <div className="overflow-hidden rounded-xl border">
              <div className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] items-center gap-x-2 border-b bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span>{tx("วิชา")}</span><span className="text-right">{tx("คะแนนที่ได้")}</span><span className="text-right">{tx("คะแนนเต็ม")}</span><span className="text-right">%</span>
              </div>
              <ul className="divide-y">
                {subjects.map((sub) => {
                  const sc = parsed(sub)
                  const bad = sc ? Exam.validateScore(sc) : null
                  return (
                    <li key={sub} className="grid grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] items-center gap-x-2 px-3 py-1">
                      <span className="min-w-0 truncate"><span className="font-medium">{tx(sub)}</span>{Exam.isOptionalSubject(sub) && <span className="ml-1.5 text-xs text-muted-foreground">{tx("Optional")}</span>}</span>
                      <Input inputMode="decimal" aria-label={`${tx(sub)} ${tx("คะแนนที่ได้")}`} aria-invalid={!!bad} disabled={!canEdit} className={cellInput} placeholder="—" value={draft[sub]?.[0] ?? ""} onChange={(e) => set(sub, 0, e.target.value)} />
                      <Input inputMode="decimal" aria-label={`${tx(sub)} ${tx("คะแนนเต็ม")}`} disabled={!canEdit} className={cn(cellInput, "text-muted-foreground focus:text-foreground")} placeholder={String(lastFull(sub))} value={draft[sub]?.[1] ?? ""} onChange={(e) => set(sub, 1, e.target.value)} />
                      <span className="text-right text-sm tabular-nums text-muted-foreground">{sc && !bad ? `${Exam.pct(sc).toFixed(1)}%` : ""}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
            {error && <p className="text-xs text-danger">{error}</p>}
            <section className="space-y-2">
              <p className="text-sm font-medium">ภาพรวมปีนี้ (% เฉลี่ย)</p>
              <KpiRow>
                {yearExams.map(({ t, r }) => {
                  const avg = r ? Exam.examAverage(r) : null
                  return <Kpi key={t.id} variant="tonal" label={t.label} value={avg !== null ? `${avg.toFixed(1)}%` : "—"} sub={r ? `${Object.keys(r.scores).length} วิชา` : undefined} onClick={() => setTerm(t.id)} active={t.id === term} />
                })}
              </KpiRow>
            </section>
          </PanelBody>
          <PanelFooter>
            <Button variant="ghost" className="ml-auto" onClick={onClose}>ปิด</Button>
            {canEdit && <Button disabled={!dirty || !!error} onClick={() => report(save({ studentId: stu.id, year, term, scores }), Object.keys(scores).length ? "บันทึกผลสอบแล้ว" : "ลบผลสอบแล้ว")}>บันทึก</Button>}
          </PanelFooter>
        </>
      )}
    </EntityPanel>
  )
}
