import { describe, expect, it } from "vitest"
import { enrollFormReadiness, enrollInvoiceChoices, slipsCheck } from "./form-hub"

const fam = { parents: [{ name: "แม่ใจดี", phone: "0811111111", lineLinked: true, primary: true }], address: "1 ถนนสุขุมวิท" }
const kid = (id: string, over: object = {}) => ({ id, nickname: id, name: `${id} ใจดี`, grade: "ป.4", ...over })

describe("enrollFormReadiness", () => {
  it("splits what we already have from what the parent must fill", () => {
    const r = enrollFormReadiness(fam, [kid("a", { school: "สาธิต" })])
    expect(r.known.map((x) => x.key)).toEqual(expect.arrayContaining(["parent", "address", "name-a", "grade-a", "school-a"]))
    expect(r.missing.map((x) => x.key)).toEqual(expect.arrayContaining(["location", "pdpa", "birth-a", "target-a"]))
    expect(r.known.find((x) => x.key === "parent")?.value).toBe("แม่ใจดี · 0811111111")
  })
  it("names each child's fields separately", () => {
    const r = enrollFormReadiness(fam, [kid("a"), kid("b", { birthDate: "2015-01-01" })])
    expect(r.missing.some((x) => x.key === "birth-a")).toBe(true)
    expect(r.known.some((x) => x.key === "birth-b")).toBe(true)
  })
  it("says where the answers go back to", () => {
    expect(enrollFormReadiness(fam, []).returns.map((x) => x.to)).toEqual(["ครอบครัว", "นักเรียน", "ใบแจ้งหนี้ → Billing รอยืนยันยอด"])
  })
})

describe("enrollInvoiceChoices", () => {
  const inv = (id: string, studentId: string, o: object = {}) => ({ id, studentId, number: `INV-${id}`, status: "approved" as const, createdAt: `2026-11-2${id.length}`, ...o })
  const kids = new Set(["a", "b"])
  it("offers only issued (numbered), still-owed invoices of this family", () => {
    const c = enrollInvoiceChoices([inv("1", "a"), inv("2", "a", { number: null }), inv("3", "a", { status: "paid" }), inv("4", "a", { status: "void" }), inv("5", "z")], kids)
    expect(c.map((x) => x.invoiceIds)).toEqual([["1"]])
  })
  it("collapses a bundle into ONE set choice", () => {
    const c = enrollInvoiceChoices([inv("1", "a", { bundleId: "S" }), inv("22", "b", { bundleId: "S" }), inv("3", "a")], kids)
    expect(c).toHaveLength(2)
    expect(c.find((x) => x.kind === "set")?.invoiceIds.sort()).toEqual(["1", "22"])
  })
})

describe("slipsCheck", () => {
  const s = (ref: string, amount: number) => ({ ref, amount, image: "x" })
  it("passes when every slip has its own Ref ID and they add up to the total", () => {
    expect(slipsCheck([s("A1", 3000), s("B2", 2000)], 5000).ok).toBe(true)
  })
  it("rejects a missing or duplicated Ref ID", () => {
    expect(slipsCheck([s("", 5000)], 5000).ok).toBe(false)
    expect(slipsCheck([s("A1", 2500), s("a1", 2500)], 5000).ok).toBe(false)
  })
  it("rejects a sum that is not the total — over or under (admin chases the parent)", () => {
    expect(slipsCheck([s("A1", 3000)], 5000).ok).toBe(false)
    expect(slipsCheck([s("A1", 3000), s("B2", 3000)], 5000).ok).toBe(false)
  })
})

import { kidForStudent, lineFromWish, wishGaps } from "./crm"

describe("parent wishes → invoice defaults (Eng Fun · Mon 17:00 · start 29 Nov)", () => {
  const classes = [
    { id: "k1", weekday: 1 as const, start: "17:00" },
    { id: "k2", weekday: 1 as const, start: "18:00" },
    { id: "k3", weekday: 3 as const, start: "17:00" },
  ]
  it("ticks the class on the wished weekday + time and carries the start day", () => {
    expect(lineFromWish({ slots: [{ weekday: 1, start: "17:00" }], startDate: "2026-11-29" }, classes)).toEqual({ classIds: ["k1"], startDate: "2026-11-29" })
  })
  it("several slots → several classes (e.g. Mon + Wed)", () => {
    expect(lineFromWish({ slots: [{ weekday: 1, start: "17:00" }, { weekday: 3, start: "17:00" }] }, classes).classIds).toEqual(["k1", "k3"])
  })
  it("no matching class / no wish → nothing ticked, admin picks", () => {
    expect(lineFromWish({ slots: [{ weekday: 5, start: "09:00" }] }, classes).classIds).toEqual([])
    expect(lineFromWish(undefined, classes)).toEqual({ classIds: [] })
  })
  it("finds the lead's kid for a student by link, then by name, then the lone kid", () => {
    const lead = { kids: [{ id: "a", name: "ขนุน", grade: "ป.4", subjects: [], courseIds: ["c1"], note: "", wishes: { c1: { slots: [], startDate: "2026-11-29" } } }], childGrade: "", subject: "", trialStudentId: "s1" } as never
    expect(kidForStudent([lead], { id: "s1", nickname: "ขนุน" })?.id).toBe("a")
    expect(kidForStudent([lead], { id: "zz" })).toBeUndefined()
  })
  it("lists what is still unknown per kid", () => {
    expect(wishGaps({ courseIds: [] })).toEqual({ noCourse: true, noSlot: [], noStart: [] })
    expect(wishGaps({ courseIds: ["c1", "c2"], wishes: { c1: { slots: [{ weekday: 1, start: "17:00" }], startDate: "2026-11-29" } } })).toEqual({ noCourse: false, noSlot: ["c2"], noStart: ["c2"] })
  })
})
