"use client"

import { useMemo } from "react"
import { Panel, Empty } from "@/components/reports/charts"
import { tx } from "@/lib/i18n"
import * as Exam from "@/domain/rules/exams"
import type { ExamResult, ID } from "@/domain/types"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const sign = (n: number) => `${n > 0 ? "+" : ""}${n}`

/**
 * Reports › Students › School exam progress (owner 2026-11-23, Shibasan): do the students who study with us do better at
 * school? Every student's newest school exam is compared with the previous one — overall, per subject, and the branch's
 * average % exam by exam.
 */
export function ExamProgress({ students }: { students: { id: ID; branchId: ID }[] }) {
  const all = useStore((s) => s.examResults)
  const branches = useStore((s) => s.branches)
  const data = useMemo(() => {
    const ids = new Set(students.map((x) => x.id))
    const results = all.filter((r) => ids.has(r.studentId) && Object.keys(r.scores).length > 0)
    const studentIds = [...ids].filter((id) => results.some((r) => r.studentId === id))
    const progress = Exam.examProgress(results, studentIds)
    // subjects in the order the branches ask for them
    const subjects = [...new Set(branches.flatMap((b) => Exam.examSubjectsOf(b)))].filter((sub) => results.some((r) => r.scores[sub]))
    const bySubject = subjects.map((sub) => {
      const latest = studentIds.map((id) => Exam.examsOf(results, id).reverse().find((r) => r.scores[sub])).filter((r): r is ExamResult => !!r)
      const avg = latest.length ? Math.round((latest.reduce((a, r) => a + Exam.pct(r.scores[sub]), 0) / latest.length) * 10) / 10 : null
      const changes = studentIds.map((id) => Exam.examChange(results, id, sub)).filter((x): x is number => x !== null)
      const change = changes.length ? Math.round((changes.reduce((a, x) => a + x, 0) / changes.length) * 10) / 10 : null
      return { sub, avg, change, n: latest.length, compared: changes.length }
    })
    // the branch's average % at each exam (every student who sat it, equal weight)
    const terms = Exam.sortExams([...new Map(results.map((r) => [`${r.year}-${r.term}`, r])).values()]).slice(-6).map((t) => {
      const rs = results.filter((r) => r.year === t.year && r.term === t.term)
      const avgs = rs.map((r) => Exam.examAverage(r)).filter((x): x is number => x !== null)
      return { key: `${t.year}-${t.term}`, label: `${Exam.termLabel(t.term)} ${String(t.year + 543).slice(2)}`, avg: avgs.length ? Math.round((avgs.reduce((a, x) => a + x, 0) / avgs.length) * 10) / 10 : 0, n: avgs.length }
    })
    return { progress, bySubject, terms, withResults: studentIds.length }
  }, [all, students, branches])
  const p = data.progress
  return (
    <Panel title={tx("พัฒนาการผลสอบโรงเรียน")} sub={tx("{0} คนมีผลสอบ", [data.withResults])}
      hint={tx("เทียบการสอบครั้งล่าสุดของนักเรียนแต่ละคนกับครั้งก่อนหน้า (เฉพาะวิชาที่มีทั้งสองครั้ง) · เป็นจุด % ไม่ใช่คะแนนดิบ เพราะแต่ละโรงเรียนตั้งคะแนนเต็มไม่เท่ากัน")}>
      {data.withResults === 0 ? <Empty>{tx("ยังไม่มีผลสอบโรงเรียน — กรอกได้ที่เมนู ผลสอบโรงเรียน")}</Empty> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground">{tx("เทียบครั้งก่อน")}</p>
            {p.compared === 0 ? <p className="text-sm text-muted-foreground">{tx("ยังเทียบไม่ได้ — ต้องมีผลสอบอย่างน้อย 2 ครั้ง")}</p> : (
              <>
                <p className={cn("text-3xl font-semibold tabular-nums", (p.avg ?? 0) > 0 ? "text-success" : (p.avg ?? 0) < 0 ? "text-danger" : "")}>{p.avg === null ? "—" : sign(p.avg)}<span className="ml-1 text-sm font-normal text-muted-foreground">{tx("จุด % เฉลี่ย")}</span></p>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`▲ ${p.up} · = ${p.same} · ▼ ${p.down}`}>
                  <span className="bg-success" style={{ width: `${(p.up / p.compared) * 100}%` }} />
                  <span className="bg-muted-foreground/30" style={{ width: `${(p.same / p.compared) * 100}%` }} />
                  <span className="bg-danger" style={{ width: `${(p.down / p.compared) * 100}%` }} />
                </div>
                <p className="flex gap-3 text-xs tabular-nums"><span className="text-success">▲ {p.up}</span><span className="text-muted-foreground">= {p.same}</span><span className="text-danger">▼ {p.down}</span><span className="ml-auto text-muted-foreground">{tx("จาก {0} คน", [p.compared])}</span></p>
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{tx("รายวิชา (ล่าสุด · เทียบครั้งก่อน)")}</p>
            <ul className="space-y-1.5">
              {data.bySubject.map((r) => (
                <li key={r.sub} className="flex items-center gap-2 text-sm">
                  <span className="w-16 shrink-0">{tx(r.sub)}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${r.avg ?? 0}%` }} /></span>
                  <span className="w-12 text-right tabular-nums">{r.avg === null ? "—" : `${r.avg}%`}</span>
                  <span className={cn("w-12 text-right text-xs tabular-nums", (r.change ?? 0) > 0 ? "text-success" : (r.change ?? 0) < 0 ? "text-danger" : "text-muted-foreground")}>{r.change === null ? "" : sign(r.change)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{tx("เฉลี่ยแต่ละครั้งที่สอบ")}</p>
            <ul className="space-y-1.5">
              {data.terms.map((r) => (
                <li key={r.key} className="flex items-center gap-2 text-sm">
                  <span className="w-24 shrink-0 truncate">{r.label}</span>
                  <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${r.avg}%` }} /></span>
                  <span className="w-12 text-right tabular-nums">{r.avg}%</span>
                  <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">{r.n}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Panel>
  )
}
