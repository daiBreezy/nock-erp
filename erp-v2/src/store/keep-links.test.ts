import { describe, expect, it } from "vitest"
import { keepLineLinks } from "./keep-line-links"
import type { Conversation, Family } from "../domain/types"

// owner 2026-10-15: a reseed must not turn the owner's LINE family back into the sample "ครอบครัวแสงใหญ่"
describe("keepLineLinks", () => {
  const sample: Family = { id: "fa_1", name: "ครอบครัวแสงใหญ่", parents: [{ name: "สมชาย", phone: "0811111111", relationship: "คุณพ่อ", primary: true }] } as unknown as Family
  it("keeps the name and parents the office typed for a LINE-linked family", () => {
    const old = { families: [{ ...sample, name: "ครอบครัวบรีซซี่", parents: [{ ...sample.parents[0], name: "ได" }], lineUserId: "U1" }], conversations: [] as Conversation[] }
    const out = keepLineLinks(old, { families: [sample], conversations: [] as Conversation[] })
    expect(out.families[0].name).toBe("ครอบครัวบรีซซี่")
    expect(out.families[0].parents[0].name).toBe("ได")
    expect(out.families[0].lineUserId).toBe("U1")
    expect(out.families[0].parents[0].lineLinked).toBe(true)
  })
  it("leaves families without LINE as the fresh sample", () => {
    const out = keepLineLinks({ families: [{ ...sample, name: "x" }], conversations: [] }, { families: [sample], conversations: [] as Conversation[] })
    expect(out.families[0].name).toBe("ครอบครัวแสงใหญ่")
  })
})
