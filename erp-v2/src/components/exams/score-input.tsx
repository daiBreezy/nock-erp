"use client"

import { useState } from "react"
import * as Exam from "@/domain/rules/exams"
import type { ExamScore, ExamTerm, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { ScoreField } from "./score-field"

/**
 * Edit view of one subject of one exam in the table (owner 2026-11-23): the same pill as the panel, numbers only.
 * Leaving the pill (or Enter) saves at once; an empty score removes the subject from that exam.
 */
export function ScoreInput({ studentId, year, term, subject }: { studentId: ID; year: number; term: ExamTerm; subject: string }) {
  const results = useStore((s) => s.examResults)
  const save = useStore((s) => s.saveExamResult)
  const now = Exam.examOf(results, studentId, year, term)
  const cur = now?.scores[subject]
  // the full marks the student last used for this subject — a new entry starts from it (default 100)
  const lastFull = Exam.examsOf(results, studentId).reverse().find((r) => r.scores[subject])?.scores[subject].full ?? 100
  const [score, setScore] = useState(cur ? String(cur.score) : "")
  const [full, setFull] = useState(cur ? String(cur.full) : "")
  const [shownFor, setShownFor] = useState(`${studentId}|${year}|${term}|${subject}`)
  const key = `${studentId}|${year}|${term}|${subject}`
  // another student / exam / subject in this cell → show its own numbers
  if (shownFor !== key) { setShownFor(key); setScore(cur ? String(cur.score) : ""); setFull(cur ? String(cur.full) : "") }
  const commit = () => {
    const rest = { ...(now?.scores ?? {}) }
    delete rest[subject]
    const t = score.trim()
    if (!t) { if (cur) report(save({ studentId, year, term, scores: rest }), "ลบคะแนนแล้ว"); return }
    const next: ExamScore = { score: Number(t), full: Number(full.trim() || String(cur?.full ?? lastFull)) }
    if (cur && cur.score === next.score && cur.full === next.full) return
    report(save({ studentId, year, term, scores: { ...rest, [subject]: next } }), "บันทึกคะแนนแล้ว")
  }
  return <ScoreField label={subject} score={score} full={full} fullPlaceholder={String(lastFull)} onScore={setScore} onFull={setFull} onCommit={commit} className="ml-auto w-fit" />
}
