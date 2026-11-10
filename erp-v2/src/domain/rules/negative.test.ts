import { describe, expect, it } from "vitest"
import { canDeleteFamily, makeMathProblem, mathAnswerOk } from "./negative"
import type { Student } from "../types"

// NEGATIVE-ACTIONS.md — the math gate before a hard delete
describe("makeMathProblem", () => {
  it("keeps operands and the answer single-digit, for + and −", () => {
    // sweep the rng space so both branches and the boundaries are hit
    for (let i = 0; i <= 1; i += 0.05) {
      for (let j = 0; j <= 1; j += 0.05) {
        const seq = [i, j, j, j]
        let n = 0
        const p = makeMathProblem(() => seq[n++ % seq.length])
        expect(p.answer).toBeGreaterThanOrEqual(0)
        expect(p.answer).toBeLessThanOrEqual(9)
        expect(p.a).toBeGreaterThanOrEqual(0)
        expect(p.b).toBeGreaterThanOrEqual(0)
        expect(p.op === "+" ? p.a + p.b : p.a - p.b).toBe(p.answer)
        expect(["+", "−"]).toContain(p.op)
      }
    }
  })

  it("subtraction never goes negative", () => {
    const p = makeMathProblem(() => 0.9) // forces the "−" branch
    expect(p.op).toBe("−")
    expect(p.answer).toBeGreaterThanOrEqual(0)
  })

  it("mathAnswerOk accepts only the exact answer", () => {
    const p = { a: 3, b: 4, op: "+" as const, text: "3 + 4", answer: 7 }
    expect(mathAnswerOk(p, "7")).toBe(true)
    expect(mathAnswerOk(p, " 7 ")).toBe(true)
    expect(mathAnswerOk(p, "8")).toBe(false)
    expect(mathAnswerOk(p, "")).toBe(false)
    expect(mathAnswerOk(p, "7a")).toBe(false)
  })
})

// NEGATIVE-ACTIONS.md §2 — a family with any student can't be hard-deleted
describe("canDeleteFamily", () => {
  const stu = (familyId: string | null) => ({ familyId }) as Pick<Student, "familyId">
  it("blocks a family that still has a student (archived counts)", () => {
    expect(canDeleteFamily("fa_1", [stu("fa_1")])).toMatch(/เก็บเข้าคลัง/)
  })
  it("allows an empty family", () => {
    expect(canDeleteFamily("fa_1", [stu("fa_2"), stu(null)])).toBeNull()
  })
})
