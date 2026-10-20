import { describe, expect, it } from "vitest"
import { keepLineLinks, restoreLinks } from "./keep-line-links"
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

// owner 2026-10-20: a cleared browser gets its LINE links back from the server
describe("restoreLinks", () => {
  const fam = (id: string, lineUserId?: string) => ({ id, name: `ครอบครัว${id}`, parents: [{ name: "แม่", phone: "08", primary: true }], lineUserId }) as unknown as Family
  const conv = (id: string, familyId: string | null = null) => ({ id, familyId, leadId: null, name: "daiBreezy" }) as unknown as Conversation
  it("links the family and its chat again", () => {
    const out = restoreLinks({ families: [fam("a"), fam("b")], conversations: [conv("line_U1")] }, [{ lineUserId: "U1", familyId: "a" }])
    expect(out.restored).toBe(1)
    expect(out.families[0]).toMatchObject({ lineUserId: "U1" })
    expect(out.families[0].parents[0].lineLinked).toBe(true)
    expect(out.conversations[0]).toMatchObject({ familyId: "a", name: "ครอบครัวa" })
  })
  it("never takes over a link made here, nor a LINE account another family has", () => {
    const out = restoreLinks({ families: [fam("a", "U9"), fam("b", "U1")], conversations: [] }, [{ lineUserId: "U1", familyId: "a" }, { lineUserId: "U2", familyId: "a" }])
    expect(out.restored).toBe(0)
    expect(out.families.map((f) => f.lineUserId)).toEqual(["U9", "U1"])
  })
})
