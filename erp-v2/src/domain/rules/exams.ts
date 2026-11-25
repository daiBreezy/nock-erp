// School exam results (owner 2026-11-23, Shibasan): a student sits 4 exams a year at their own school — mid-term and final
// of each semester. Admin / Manager / the class teacher enter the score per subject; the student table, the Exam Result
// page and Reports read the same numbers (as a percentage, because every school sets its own full marks).

import type { Brand, Branch, DateStr, ExamResult, ExamScore, ExamTerm, ID, Klass, Result, Staff, Student } from "../types"
import { can } from "./permissions"

export const EXAM_TERMS: { id: ExamTerm; label: string; short: string }[] = [
  { id: "mid1", label: "กลางภาค 1", short: "กลาง 1" },
  { id: "final1", label: "ปลายภาค 1", short: "ปลาย 1" },
  { id: "mid2", label: "กลางภาค 2", short: "กลาง 2" },
  { id: "final2", label: "ปลายภาค 2", short: "ปลาย 2" },
]
const TERM_ORDER: Record<ExamTerm, number> = { mid1: 0, final1: 1, mid2: 2, final2: 3 }
export const termLabel = (t: ExamTerm) => EXAM_TERMS.find((x) => x.id === t)!.label

/**
 * The subjects asked by default (owner 2026-11-23). Nock Academy: 8 — Math / Science / English each as basic + additional
 * (additional = optional), Thai, Social. Liclass: Math, English, Science, Social, Japanese.
 */
export const defaultExamSubjects = (brand: Brand): string[] => (brand === "liclass"
  ? ["คณิต", "อังกฤษ", "วิทย์", "สังคม", "ญี่ปุ่น"]
  : ["คณิตพื้นฐาน", "คณิตเพิ่มเติม", "วิทย์พื้นฐาน", "วิทย์เพิ่มเติม", "อังกฤษพื้นฐาน", "อังกฤษเพิ่มเติม", "ภาษาไทย", "สังคม"])
/** subjects a student may not take (the "additional" ones) — columns start hidden and the form marks them Optional */
export const OPTIONAL_EXAM_SUBJECTS = new Set(["คณิตเพิ่มเติม", "วิทย์เพิ่มเติม", "อังกฤษเพิ่มเติม"])
export const isOptionalSubject = (name: string) => OPTIONAL_EXAM_SUBJECTS.has(name)
export const examSubjectsOf = (branch: Pick<Branch, "brand" | "examSubjects">): string[] => (branch.examSubjects?.length ? branch.examSubjects : defaultExamSubjects(branch.brand))

/** Thai school year (starts in May) as the Gregorian year it starts in: Sep 2026 → 2026 · Feb 2027 → 2026 */
export const academicYear = (date: DateStr): number => {
  const y = Number(date.slice(0, 4)), m = Number(date.slice(5, 7))
  return m >= 5 ? y : y - 1
}
/** the semester a date falls in: 1 = May–Oct · 2 = Nov–Apr */
export const currentTerm = (date: DateStr): ExamTerm => {
  const m = Number(date.slice(5, 7))
  return m >= 5 && m <= 10 ? "mid1" : "mid2"
}

export const pct = (s: ExamScore) => Math.round((s.score / s.full) * 1000) / 10

/** a score entry is valid when full marks > 0 and 0 ≤ score ≤ full */
export function validateScore(s: ExamScore): string | null {
  if (!Number.isFinite(s.score) || !Number.isFinite(s.full)) return "ใส่ตัวเลข"
  if (s.full <= 0) return "คะแนนเต็มต้องมากกว่า 0"
  if (s.score < 0) return "คะแนนต้องไม่ติดลบ"
  if (s.score > s.full) return "คะแนนที่ได้ต้องไม่เกินคะแนนเต็ม"
  return null
}

/** Admin / Manager and up: any student of their branch · a teacher: only students in a class they teach */
export function canRecordExam(user: Staff, student: Pick<Student, "id" | "branchId">, classes: Pick<Klass, "branchId" | "studentIds" | "teacherId" | "coTeacherIds">[]): Result {
  if (!can(user, "exam.record")) return { ok: false, error: "บทบาทของคุณกรอกผลสอบไม่ได้" }
  if (user.roles.includes("teacher") && !user.roles.some((r) => r === "admin" || r === "manager" || r === "area_manager" || r === "director" || r === "super_admin")) {
    const mine = classes.some((k) => k.studentIds.includes(student.id) && (k.teacherId === user.id || k.coTeacherIds.includes(user.id)))
    if (!mine) return { ok: false, error: "ครูกรอกผลสอบได้เฉพาะนักเรียนในคลาสของตัวเอง" }
  }
  return { ok: true, value: undefined }
}

const orderKey = (r: Pick<ExamResult, "year" | "term">) => r.year * 10 + TERM_ORDER[r.term]
export const sortExams = (list: ExamResult[]) => [...list].sort((a, b) => orderKey(a) - orderKey(b))

export const examOf = (results: ExamResult[], studentId: ID, year: number, term: ExamTerm) => results.find((r) => r.studentId === studentId && r.year === year && r.term === term)

/** a student's exams, oldest → newest, that have at least one score */
export const examsOf = (results: ExamResult[], studentId: ID) => sortExams(results.filter((r) => r.studentId === studentId && Object.keys(r.scores).length > 0))

/** average of the subjects entered (percent) — null when nothing is entered */
export function examAverage(r: Pick<ExamResult, "scores">): number | null {
  const v = Object.values(r.scores).map(pct)
  return v.length ? Math.round((v.reduce((a, x) => a + x, 0) / v.length) * 10) / 10 : null
}

/** the student's newest exam */
export const latestExam = (results: ExamResult[], studentId: ID) => examsOf(results, studentId).at(-1)

/**
 * Change of one exam against the previous one (owner 2026-11-23: "เทียบครั้งก่อน"): per subject, this exam vs the newest earlier exam
 * that has the same subject; overall = the same comparison over the subjects both exams share. null = nothing to compare.
 */
export function examChangeAt(results: ExamResult[], studentId: ID, year: number, term: ExamTerm, subject?: string): number | null {
  const list = examsOf(results, studentId)
  const idx = list.findIndex((r) => r.year === year && r.term === term)
  if (idx < 0) return null
  const cur = list[idx]
  const before = list.slice(0, idx)
  if (subject) {
    if (!cur.scores[subject]) return null
    const prev = [...before].reverse().find((r) => r.scores[subject])
    return prev ? Math.round((pct(cur.scores[subject]) - pct(prev.scores[subject])) * 10) / 10 : null
  }
  const prev = before.at(-1)
  if (!prev) return null
  const shared = Object.keys(cur.scores).filter((k) => prev.scores[k])
  if (!shared.length) return null
  const avg = (r: ExamResult) => shared.reduce((a, k) => a + pct(r.scores[k]), 0) / shared.length
  return Math.round((avg(cur) - avg(prev)) * 10) / 10
}

/** change of the student's newest exam against the one before */
export function examChange(results: ExamResult[], studentId: ID, subject?: string): number | null {
  const last = latestExam(results, studentId)
  return last ? examChangeAt(results, studentId, last.year, last.term, subject) : null
}

/** a mark as typed: "74" — a decimal only when the mark really has one ("74.5"); the ".0" belongs to the percentage line only (owner 2026-11-23) */
export const fmtScore = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/** Reports: how the branch's students moved from the previous exam to the newest one */
export function examProgress(results: ExamResult[], studentIds: ID[]) {
  const changes = studentIds.map((id) => examChange(results, id)).filter((x): x is number => x !== null)
  const avg = changes.length ? Math.round((changes.reduce((a, x) => a + x, 0) / changes.length) * 10) / 10 : null
  return { compared: changes.length, up: changes.filter((c) => c > 0).length, same: changes.filter((c) => c === 0).length, down: changes.filter((c) => c < 0).length, avg }
}

// ---------- periods (owner 2026-11-23) ----------

/** the months an exam usually falls in (Thai school year: semester 1 May–Oct, semester 2 Nov–Mar) — first day of the first and last month */
export function termRange(year: number, term: ExamTerm): { from: DateStr; to: DateStr } {
  const m = (y: number, mo: number) => `${y}-${String(mo).padStart(2, "0")}-01`
  switch (term) {
    case "mid1": return { from: m(year, 7), to: m(year, 8) }
    case "final1": return { from: m(year, 9), to: m(year, 10) }
    case "mid2": return { from: m(year, 12), to: m(year + 1, 1) }
    case "final2": return { from: m(year + 1, 2), to: m(year + 1, 3) }
  }
}

/** the `n` exams before this one, oldest first (the school year rolls over: final 2 of last year comes before mid-term 1) */
export function previousPeriods(year: number, term: ExamTerm, n: number): { year: number; term: ExamTerm }[] {
  const ids = EXAM_TERMS.map((t) => t.id)
  const at = year * 4 + ids.indexOf(term)
  return Array.from({ length: n }, (_, i) => at - n + i).map((k) => ({ year: Math.floor(k / 4), term: ids[((k % 4) + 4) % 4] }))
}

/**
 * owner 2026-11-25: the exam a panel opens on — the NEWEST exam any of these students has (a family tab shows every child on the same exam so the
 * children can be compared); with no results yet, the current school year / exam.
 */
export function defaultExamPeriod(results: ExamResult[], studentIds: ID[], today: DateStr): { year: number; term: ExamTerm } {
  const newest = sortExams(results.filter((r) => studentIds.includes(r.studentId) && Object.keys(r.scores).length > 0)).at(-1)
  return newest ? { year: newest.year, term: newest.term } : { year: academicYear(today), term: currentTerm(today) }
}
