"use client"

import { useState } from "react"
import { PencilIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PctChange, ExamSheet } from "@/components/exams/exam-sheet"
import { RangeStepper, Segmented } from "@/components/app/page-layout"
import { toDateStr } from "@/domain/dates"
import * as Exam from "@/domain/rules/exams"
import type { ExamTerm, ID, Student } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-25: a student's school exam results (ผลสอบโรงเรียน) inside the panel — one tab in the Student panel, the same tab in the Family panel with
 * every child. It opens on the newest exam (a family compares its children on the same exam); the year / exam can be switched. Typing the scores is the
 * existing Exam Result panel (`ExamSheet`) — opened from here.
 */
export function StudentExams({ students }: { students: Student[] }) {
  const results = useStore((s) => s.examResults)
  const classes = useStore((s) => s.classes)
  const me = useStore((s) => s.me())
  const today = toDateStr(useNow())
  const ids = students.map((s) => s.id)
  const start = Exam.defaultExamPeriod(results, ids, today)
  const [year, setYear] = useState(start.year)
  const [term, setTerm] = useState<ExamTerm>(start.term)
  const [editing, setEditing] = useState<ID | null>(null)
  const thisYear = Exam.academicYear(today)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <RangeStepper label={`${tx("ปีการศึกษา")} ${year + 543}`} current={year === thisYear} onPrev={() => setYear(year - 1)} onNext={() => setYear(year + 1)} onToday={() => setYear(thisYear)} />
        <Segmented value={term} onChange={setTerm} options={Exam.EXAM_TERMS.map((t) => ({ value: t.id, label: t.label }))} label={tx("การสอบ")} />
      </div>
      {students.map((stu) => {
        const r = Exam.examOf(results, stu.id, year, term)
        const entered = r && Object.keys(r.scores).length > 0
        const avg = entered ? Exam.examAverage(r) : null
        const canEdit = Exam.canRecordExam(me, stu, classes).ok
        return (
          <section key={stu.id} className="space-y-2 rounded-xl bg-muted/40 p-2.5">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{stu.nickname}{stu.grade && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{stu.grade}</span>}</p>
              {avg !== null && <PctChange pct={avg} change={Exam.examChangeAt(results, stu.id, year, term)} />}
              {canEdit && <Button size="xs" variant="ghost" type="button" onClick={() => setEditing(stu.id)}><PencilIcon /> {entered ? tx("แก้ผลสอบ") : tx("กรอกผลสอบ")}</Button>}
            </div>
            {entered ? (
              <ul className="divide-y rounded-lg bg-background text-sm">
                {Object.entries(r.scores).map(([sub, sc]) => (
                  <li key={sub} className="flex items-center gap-2 px-2.5 py-1.5">
                    <span className="min-w-0 flex-1 truncate">{tx(sub)}</span>
                    <span className="tabular-nums">{Exam.fmtScore(sc.score)}<span className="text-muted-foreground"> / {Exam.fmtScore(sc.full)}</span></span>
                    <PctChange pct={Exam.pct(sc)} change={Exam.examChangeAt(results, stu.id, year, term, sub)} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-xs text-muted-foreground">{tx("ยังไม่มีผลสอบของการสอบนี้")}</p>}
          </section>
        )
      })}
      {students.length === 0 && <p className="text-xs text-muted-foreground">{tx("ยังไม่มีนักเรียน")}</p>}
      <ExamSheet studentId={editing} initial={{ year, term }} onClose={() => setEditing(null)} />
    </div>
  )
}
