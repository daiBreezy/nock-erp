import { describe, expect, it } from "vitest"
import { CHECKLIST } from "./checklist"
import { FEATURE_EN } from "./features-en"
import { FEATURE_LISTS, type FeatureNode } from "./features"

// Every Thai text of the Checklist / feature tree must have an English one in features-en.ts (owner 2026-11-24: Thai + English).
describe("Checklist & feature tree — English", () => {
  it("has an English text for every Thai text", () => {
    const missing = new Set<string>()
    const need = (s?: string) => { if (s && /[ก-๙]/.test(s) && !FEATURE_EN[s]) missing.add(s) }
    const walk = (n: FeatureNode) => { need(n.t); need(n.how); n.c?.forEach(walk) }
    for (const l of FEATURE_LISTS) { need(l.label); need(l.purpose); l.tree?.forEach(walk) }
    for (const i of CHECKLIST) { need(i.title); need(i.how); need(i.waiting); need(i.round) }
    expect([...missing]).toEqual([])
  })
  it("has no Thai left in the English", () => {
    expect(Object.entries(FEATURE_EN).filter(([, v]) => /[ก-๙]/.test(v)).map(([k]) => k)).toEqual([])
  })
})
