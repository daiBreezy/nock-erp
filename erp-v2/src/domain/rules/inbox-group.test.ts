import { describe, expect, it } from "vitest"
import { conversationName, groupMemberLabel, groupSenders } from "./inbox"
import type { ChatMessage, Conversation } from "../types"

const conv = (over: Partial<Conversation> = {}): Conversation => ({ id: "line_Cg", branchId: "b", name: "Family Group test", familyId: "f1", leadId: null, channel: "line", assigneeId: null, lastMessageAt: "", unread: false, group: true, ...over })
const msg = (userId: string, name: string, at: string): Pick<ChatMessage, "conversationId" | "sender" | "at"> => ({ conversationId: "line_Cg", sender: { userId, name }, at })

describe("LINE group — who is who", () => {
  it("lists each sender once, in order of first message, with the newest name", () => {
    const rows = groupSenders([msg("Ub", "สมาชิก #2", "2"), msg("Ua", "A", "1"), msg("Ub", "พี่บี", "3")], "line_Cg")
    expect(rows).toEqual([{ userId: "Ua", name: "A" }, { userId: "Ub", name: "พี่บี" }])
  })

  const family = { parents: [{ name: "สมศรี ใจดี", lineUserId: "Ua" }, { name: "สมชาย ใจดี" }] } as never
  const kids = [{ id: "s1", nickname: "น้องบีม", name: "ด.ช. บีม" }]

  it("a guardian shows under the ERP name; a student under the nickname", () => {
    const c = conv({ members: { Ua: { kind: "parent" }, Ub: { kind: "student", studentId: "s1" } } })
    expect(groupMemberLabel(c, { userId: "Ua", name: "Mae" }, family, kids)).toEqual({ name: "สมศรี ใจดี", role: "parent" })
    expect(groupMemberLabel(c, { userId: "Ub", name: "Beam" }, family, kids)).toEqual({ name: "น้องบีม", role: "student" })
  })

  it("a relative who only follows keeps their LINE name and is marked ผู้ติดตาม — not a family member", () => {
    const c = conv({ members: { Uc: { kind: "follower" } } })
    expect(groupMemberLabel(c, { userId: "Uc", name: "ลุงโต" }, family, kids)).toEqual({ name: "ลุงโต", role: "follower" })
  })

  it("someone staff haven't placed yet shows the LINE name, no role", () => {
    expect(groupMemberLabel(conv(), { userId: "Ud", name: "Dan" }, family, kids)).toEqual({ name: "Dan", role: null })
  })

  it("a group keeps its own name even when linked to a family", () => {
    expect(conversationName(conv(), [{ id: "f1", name: "ครอบครัวใจดี" }], [])).toBe("Family Group test")
    expect(conversationName(conv({ group: undefined }), [{ id: "f1", name: "ครอบครัวใจดี" }], [])).toBe("ครอบครัวใจดี")
  })
})

describe("LINE group — links itself to a known family", () => {
  const fam = (id: string, over: Record<string, unknown> = {}) => ({ id, name: id, parents: [{ name: `${id}-แม่`, primary: true }, { name: `${id}-พ่อ`, primary: false }], ...over }) as never
  const m = (userId: string) => ({ conversationId: "line_Cg", sender: { userId, name: userId }, at: "1" })
  const g = () => conv({ familyId: null })

  it("a writer whose LINE account is the family's → group links + they become the primary guardian", async () => {
    const { autoGroupLinks } = await import("./inbox")
    const r = autoGroupLinks([g()], [m("Ua"), m("Ustranger")], [fam("f1", { lineUserId: "Ua" })])
    expect(r.changed).toBe(true)
    expect(r.conversations[0].familyId).toBe("f1")
    expect(r.conversations[0].members).toEqual({ Ua: { kind: "parent" } }) // the stranger is left for staff
    expect(r.families[0].parents[0].lineUserId).toBe("Ua")
  })

  it("a guardian's own LINE account picks that guardian, not the primary one", async () => {
    const { autoGroupLinks } = await import("./inbox")
    const f = fam("f1", { parents: [{ name: "แม่", primary: true }, { name: "พ่อ", primary: false, lineUserId: "Ub" }] })
    const r = autoGroupLinks([g()], [m("Ub")], [f])
    expect(r.conversations[0].familyId).toBe("f1")
    expect(r.families[0].parents[1].lineUserId).toBe("Ub")
  })

  it("known writers from DIFFERENT families → no auto-link (staff choose)", async () => {
    const { autoGroupLinks, groupFamilyCandidates } = await import("./inbox")
    const fams = [fam("f1", { lineUserId: "Ua" }), fam("f2", { lineUserId: "Ub" })]
    const r = autoGroupLinks([g()], [m("Ua"), m("Ub")], fams)
    expect(r.changed).toBe(false)
    expect(r.conversations[0].familyId).toBeNull()
    expect(groupFamilyCandidates([{ userId: "Ua" }, { userId: "Ub" }], fams)).toEqual(["f1", "f2"])
  })

  it("never overrides staff: a linked family stays, an existing role stays", async () => {
    const { autoGroupLinks } = await import("./inbox")
    const c = conv({ familyId: "f2", members: { Ua: { kind: "follower" } } })
    const r = autoGroupLinks([c], [m("Ua")], [fam("f1", { lineUserId: "Ua" }), fam("f2")])
    expect(r.changed).toBe(false)
    expect(r.conversations[0].familyId).toBe("f2")
    expect(r.conversations[0].members?.Ua).toEqual({ kind: "follower" })
  })

  it("nobody known → nothing happens; a 1:1 chat is never touched", async () => {
    const { autoGroupLinks } = await import("./inbox")
    expect(autoGroupLinks([g()], [m("Uz")], [fam("f1", { lineUserId: "Ua" })]).changed).toBe(false)
    const direct = conv({ group: undefined, familyId: null })
    expect(autoGroupLinks([direct], [m("Ua")], [fam("f1", { lineUserId: "Ua" })]).changed).toBe(false)
  })
})

describe("chat list time", () => {
  it("today → clock, yesterday → เมื่อวาน, older → day + month (never just the month)", async () => {
    const { chatListTime } = await import("./inbox")
    const now = new Date(2026, 10, 12, 18, 0)
    expect(chatListTime(new Date(2026, 10, 12, 9, 5).toISOString(), now)).toBe("09:05")
    expect(chatListTime(new Date(2026, 10, 11, 23, 0).toISOString(), now)).toBe("เมื่อวาน")
    const older = chatListTime(new Date(2026, 10, 6, 8, 0).toISOString(), now)
    expect(older).toMatch(/^6 /)
    expect(older).not.toMatch(/\d{4}/)
  })
})
