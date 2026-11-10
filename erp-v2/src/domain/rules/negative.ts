// NEGATIVE-ACTIONS.md — shared rules for the "ลบ / เก็บเข้าคลัง / โอนงาน" framework.
// Pure functions only (CLAUDE.md): the store and the math-gate UI call the same logic.
import type { ID, Student } from "../types"

/** A one-digit +/− problem shown before any hard delete — the "จุดให้ฉุกคิด". Both operands and the answer stay in
 *  0–9 (subtraction never goes negative), so it forces a read without being a real puzzle. */
export interface MathProblem {
  a: number
  b: number
  op: "+" | "−"
  /** "3 + 4" — the prompt without the "= ?" (the UI adds that) */
  text: string
  answer: number
}

/** `rand` defaults to Math.random; pass a stub in tests. */
export function makeMathProblem(rand: () => number = Math.random): MathProblem {
  const plus = rand() < 0.5
  if (plus) {
    // a + b ≤ 9 so the answer stays single-digit
    const a = Math.floor(rand() * 9) // 0–8
    const b = Math.floor(rand() * (9 - a)) // 0–(9−a)
    return { a, b, op: "+", text: `${a} + ${b}`, answer: a + b }
  }
  // a − b ≥ 0
  const a = Math.floor(rand() * 10) // 0–9
  const b = Math.floor(rand() * (a + 1)) // 0–a
  return { a, b, op: "−", text: `${a} − ${b}`, answer: a - b }
}

/** True when `input` solves the problem (trimmed, digits only). */
export function mathAnswerOk(p: MathProblem, input: string): boolean {
  const t = input.trim()
  return /^-?\d+$/.test(t) && Number(t) === p.answer
}

/**
 * A family may be hard-DELETED only when no student points at it (archived students count — their history still
 * references the family). Otherwise it is kept and archived instead. Returns the blocking reason, or null.
 */
export function canDeleteFamily(familyId: ID, students: Pick<Student, "familyId">[]): string | null {
  if (students.some((s) => s.familyId === familyId)) return "ครอบครัวนี้มีนักเรียนผูกอยู่ — เก็บเข้าคลังแทนการลบ"
  return null
}
