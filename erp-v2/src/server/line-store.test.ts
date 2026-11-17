import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import path from "path"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

// DATA_DIR is computed from process.cwd() at import time → point cwd at a temp folder first so the
// real .data/line-inbox.json (live LINE conversations) is never touched.
let dir: string
let store: typeof import("./line-store")

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "line-store-"))
  vi.spyOn(process, "cwd").mockReturnValue(dir)
  store = await import("./line-store")
})
afterAll(() => {
  vi.restoreAllMocks()
  rmSync(dir, { recursive: true, force: true })
})

describe("LINE group chats", () => {
  it("one group = one conversation; each message says which member wrote it", async () => {
    const G = "Cgroup1"
    await store.recordInboundMessage(G, "ผู้ปกครองห้อง ป.3", "สวัสดีค่ะ", undefined, { sender: { userId: "Ua", name: "คุณแม่ A" } })
    await store.recordInboundMessage(G, null, "รับทราบครับ", undefined, { sender: { userId: "Ub", name: "คุณพ่อ B" } })
    await store.recordInboundMessage(G, null, "ขอบคุณค่ะ", undefined, { sender: { userId: "Uc", name: "คุณยาย C" } })
    await store.recordInboundMessage(G, null, "ครับ", undefined, { sender: { userId: "Ub", name: "คุณพ่อ B" } })

    const { conversations, messages } = await store.getAll()
    const conv = conversations.filter((c) => c.id === `line_${G}`)
    expect(conv).toHaveLength(1)
    expect(conv[0].group).toBe(true)
    expect(conv[0].name).toBe("ผู้ปกครองห้อง ป.3")
    expect(messages.filter((m) => m.conversationId === conv[0].id).map((m) => m.sender?.name)).toEqual(["คุณแม่ A", "คุณพ่อ B", "คุณยาย C", "คุณพ่อ B"])
  })

  it("a member LINE won't name gets a stable «สมาชิก #n», fixed up once the real name arrives", async () => {
    const G = "Cgroup2"
    await store.recordInboundMessage(G, "กลุ่ม", "1", undefined, { sender: { userId: "Ux", name: null } })
    await store.recordInboundMessage(G, null, "2", undefined, { sender: { userId: "Uy", name: null } })
    await store.recordInboundMessage(G, null, "3", undefined, { sender: { userId: "Ux", name: null } })
    let msgs = (await store.getAll()).messages.filter((m) => m.conversationId === `line_${G}`)
    expect(msgs.map((m) => m.sender?.name)).toEqual(["สมาชิก #1", "สมาชิก #2", "สมาชิก #1"])

    await store.recordInboundMessage(G, null, "4", undefined, { sender: { userId: "Ux", name: "พี่เอ็กซ์" } })
    msgs = (await store.getAll()).messages.filter((m) => m.conversationId === `line_${G}`)
    expect(msgs.map((m) => m.sender?.name)).toEqual(["พี่เอ็กซ์", "สมาชิก #2", "พี่เอ็กซ์", "พี่เอ็กซ์"])
  })

  it("a member LINE won't name is named from their own 1:1 chat with us (same userId)", async () => {
    await store.recordInboundMessage("Umritun", "Mritunjay", "ทักแชทเดี่ยว")
    await store.recordInboundMessage("Cgroup3", "กลุ่ม", "hi", undefined, { sender: { userId: "Umritun", name: null } })
    const msgs = (await store.getAll()).messages.filter((m) => m.conversationId === "line_Cgroup3")
    expect(msgs[0].sender?.name).toBe("Mritunjay")
  })

  it("a 1:1 chat is unchanged — no group flag, no sender", async () => {
    await store.recordInboundMessage("Uparent", "คุณแม่น้องบีม", "ลาค่ะ")
    const { conversations, messages } = await store.getAll()
    expect(conversations.find((c) => c.id === "line_Uparent")?.group).toBeUndefined()
    expect(messages.find((m) => m.conversationId === "line_Uparent")?.sender).toBeUndefined()
  })

  it("replying to a group pushes to the groupId (conversation id → LINE `to`)", () => {
    expect(store.lineUserIdOf("line_Cgroup1")).toBe("Cgroup1")
  })
})
