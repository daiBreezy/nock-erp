import { academicYear, defaultExamSubjects, examSubjectsOf, isOptionalSubject } from "@/domain/rules/exams"
import { toDateStr } from "@/domain/dates"
import type { Branch, ExamResult, ExamTerm, Student } from "@/domain/types"

/**
 * Owner 2026-11-23: sample school exam results so the Exam Result page, the student-table columns and Reports have
 * something to show — each active student with a class gets the exams of this school year that have already happened
 * (mid-term 1 · final 1 · + the previous year's last one), with scores that mostly climb a little. Deterministic.
 */
export function buildExamDemo(db: { branches: Branch[]; students: Student[] }, now = new Date()): ExamResult[] {
  const today = toDateStr(now)
  const year = academicYear(today)
  const m = Number(today.slice(5, 7))
  // exams that have happened: mid1 (≈ Jul–Aug) · final1 (≈ Oct) · mid2 (≈ Dec–Jan)
  const done: { year: number; term: ExamTerm }[] = [{ year: year - 1, term: "final2" }, ...(m >= 8 || m <= 4 ? [{ year, term: "mid1" as ExamTerm }] : []), ...(m >= 10 || m <= 4 ? [{ year, term: "final1" as ExamTerm }] : [])]
  const out: ExamResult[] = []
  let n = 0
  for (const stu of db.students) {
    if (stu.archived || stu.graduatedAt) continue
    n++
    if (n % 3 === 0) continue // not everyone has a result yet — the table shows dashes for them
    const branch = db.branches.find((b) => b.id === stu.branchId)
    const subjects = branch ? examSubjectsOf(branch) : defaultExamSubjects("nockacademy")
    // every student sits most of the main subjects (some only 3 – 4); the optional "additional" ones only for some
    const main = subjects.filter((x) => !isOptionalSubject(x))
    const take = [...main.slice(0, Math.max(3, main.length - (n % 3))), ...(n % 4 === 0 ? subjects.filter(isOptionalSubject).slice(0, 1 + (n % 2)) : [])]
    done.forEach((d, i) => {
      const scores: ExamResult["scores"] = {}
      take.forEach((sub, k) => {
        // the school sets the full marks — mostly 30 / 40 / 60, sometimes 100 — the same for one student's subject every exam
        const full = [30, 40, 60, 60, 40, 100][(n + k * 2) % 6]
        const pct = Math.max(25, Math.min(100, 58 + ((n * 7 + k * 11) % 30) + i * (n % 4 === 0 ? -3 : 4)))
        scores[sub] = { score: Math.round((pct / 100) * full * 2) / 2, full }
      })
      out.push({ id: `exe_${stu.id}_${d.year}_${d.term}`, studentId: stu.id, branchId: stu.branchId, year: d.year, term: d.term, scores, enteredBy: "u_ploy", updatedAt: `${today}T09:00:00.000Z` })
    })
  }
  return out
}
