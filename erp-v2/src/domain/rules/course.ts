// Course rules — mirrors staging's Create Course: Single/Bundle · subjects · grades · package type + duration ·
// price pre-filled from the branch chart (reason required when it differs) · course fee · optional window · Active.

import type { Branch, Course, PriceUnit } from "../types"
import { durationLabel, durationsOf, priceOf, sortGrades } from "./settings"

/** "[Subject + Grade] default name" used when the name is left blank. */
export function defaultCourseName(subjects: string[], grades: string[]) {
  const gs = sortGrades(grades)
  const g = gs.length === 0 ? "" : gs.length === 1 ? gs[0] : `${gs[0]}–${gs[gs.length - 1]}`
  return [subjects.join(" + "), g].filter(Boolean).join(" ")
}

/** Short package badge, like staging's "H 24" / "W 4" / "M". */
export function packageBadge(c: Pick<Course, "unit" | "duration">) {
  return c.unit === "hour" ? `H ${c.duration}` : c.unit === "week" ? `W ${c.duration}` : "M"
}

export function packageLabel(c: Pick<Course, "unit" | "duration">) {
  return c.unit === "month" ? "รายเดือน" : durationLabel(c.unit, c.duration)
}

export function priceUnitSuffix(c: Pick<Course, "unit" | "duration">) {
  return c.unit === "month" ? "/ เดือน" : `/ ${durationLabel(c.unit, c.duration)}`
}

/**
 * Suggested price from the branch chart for this course: per grade, the sum over its subjects (a bundle
 * pays each subject). If the chosen grades have different chart prices, there is no single suggestion —
 * staging then warns "consider separate courses" and asks for one fixed price.
 */
export function chartPrice(branch: Branch, c: Pick<Course, "subjects" | "grades" | "unit" | "duration">):
  { price: number | null; perGrade: { grade: string; price: number | null }[]; mixed: boolean } {
  const perGrade = c.grades.map((grade) => {
    const parts = c.subjects.map((s) => priceOf(branch, c.unit, c.duration, s, grade))
    return { grade, price: parts.length && parts.every((p) => p !== null) ? parts.reduce<number>((a, p) => a + (p ?? 0), 0) : null }
  })
  const known = [...new Set(perGrade.map((g) => g.price))]
  const mixed = known.length > 1
  return { price: !mixed && known[0] != null ? known[0] : null, perGrade, mixed }
}

/** Price differs from the chart (or the chart has none) → a reason is required, like staging. */
export function needsPriceReason(branch: Branch, c: Pick<Course, "subjects" | "grades" | "unit" | "duration" | "price">) {
  const s = chartPrice(branch, c).price
  return s === null || s !== c.price
}

export function validateCourse(branch: Branch, c: Course): string | null {
  if (c.kind === "single" && c.subjects.length !== 1) return "คอร์ส Single เลือกได้ 1 วิชา"
  if (c.kind === "bundle" && c.subjects.length < 2) return "คอร์ส Bundle ต้องเลือกอย่างน้อย 2 วิชา"
  if (c.subjects.some((s) => !branch.subjects.includes(s))) return "มีวิชาที่สาขานี้ไม่ได้เปิดสอน"
  if (!c.grades.length) return "เลือกระดับชั้นอย่างน้อย 1"
  if (c.unit !== "month" && !durationsOf(branch, c.unit).includes(c.duration)) return "เลือกระยะเวลาของแพ็กเกจ"
  if (!(c.price > 0)) return "ใส่ราคา"
  if (needsPriceReason(branch, c) && !c.priceReason?.trim()) return "ราคาไม่ตรงกับตารางราคาของสาขา — ใส่เหตุผลที่เปลี่ยนราคา"
  if (!(c.courseFee >= 0)) return "Course fee ต้องไม่ติดลบ"
  if (c.from && c.to && c.from > c.to) return "วันสิ้นสุดต้องหลังวันเริ่ม"
  return null
}

/** What one course line buys, in promotion terms: months, total hours, or total weeks. */
export function purchaseOf(c: Pick<Course, "unit" | "duration">, periods: number): { unit: PriceUnit; amount: number } {
  return { unit: c.unit, amount: c.unit === "month" ? periods : c.duration * periods }
}
