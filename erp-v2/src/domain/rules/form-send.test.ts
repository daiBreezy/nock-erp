import { describe, expect, it } from "vitest"
import { decideSend, linkToReplace, type SentLink } from "./form-send"

const link = (kind: SentLink["kind"], state: SentLink["state"], sentAt = "2026-11-25T10:00:00Z", token = `${kind}-${state}`): SentLink => ({ token, kind, sentAt, state })

describe("when may a form be sent", () => {
  it("nothing sent yet → send", () => {
    expect(decideSend("test", [])).toEqual({ action: "send" })
  })
  it("a Test is still waiting for the parent → no other form can be sent", () => {
    const d = decideSend("trial", [link("test", "waiting")])
    expect(d.action).toBe("blocked")
    expect(d.action === "blocked" && d.reason).toContain("ฟอร์ม Test")
    expect(decideSend("enroll", [link("test", "waiting")]).action).toBe("blocked")
  })
  it("the same form again = resend (the waiting one is cancelled first)", () => {
    const l = link("test", "waiting")
    expect(decideSend("test", [l])).toEqual({ action: "resend", replaces: l })
    expect(linkToReplace("test", [l])).toBe(l)
    expect(linkToReplace("trial", [l])).toBeUndefined()
  })
  it("answered (approve / reject can follow), expired or cancelled links do not block", () => {
    for (const state of ["answered", "expired", "cancelled"] as const) expect(decideSend("trial", [link("test", state)])).toEqual({ action: "send" })
  })
  it("the same rule covers the enroll form", () => {
    expect(decideSend("enroll", [link("trial", "waiting")]).action).toBe("blocked")
    expect(decideSend("enroll", [link("enroll", "waiting")]).action).toBe("resend")
  })
  it("with several waiting (old data) it blames / replaces the newest", () => {
    const old = link("test", "waiting", "2026-11-20T10:00:00Z", "old")
    const newer = link("trial", "waiting", "2026-11-24T10:00:00Z", "newer")
    const d = decideSend("enroll", [old, newer])
    expect(d.action === "blocked" && d.blocking.token).toBe("newer")
  })
})
