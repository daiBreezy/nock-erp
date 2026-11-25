import { describe, expect, it } from "vitest"
import { composeFamilyMessage, fillTemplate, groupOf } from "./period-message"

const period = { name: "Summer", from: "2026-12-07", to: "2026-12-20" } as never
describe("period message", () => {
  it("fills placeholders and keeps unknown ones visible", () => {
    expect(fillTemplate("สวัสดี {ชื่อลูก} {x}", { "ชื่อลูก": "Jojo" })).toBe("สวัสดี Jojo {x}")
  })
  it("a weekly/monthly child with an unpaid invoice gets the unpaid paragraph", () => {
    expect(groupOf("sessions", "unpaid")).toBe("hourly")
    expect(groupOf("subscription", "unpaid")).toBe("unpaid")
    expect(groupOf("subscription", "paid")).toBe("subscription")
  })
  it("one message per family — intro, a paragraph per child, outro; no baht amounts", () => {
    const m = composeFamilyMessage(period, "สมชาย", [
      { name: "Jojo", group: "hourly", dates: ["2026-12-08"], newEnd: "2026-12-30" },
      { name: "Mimi", group: "subscription", dates: ["2026-12-09", "2026-12-11"], credits: 2 },
    ])
    expect(m).toContain("Summer")
    expect(m).toContain("Jojo")
    expect(m).toContain("Credit 2 คาบ")
    expect(m).not.toMatch(/บาท|฿/)
  })
  it("the Admin's edited template wins over the default", () => {
    const m = composeFamilyMessage({ ...(period as object), parentMsg: { intro: "ขออภัยอย่างสุดซึ้ง {ครอบครัว}", hourly: "", subscription: "", unpaid: "", outro: "" } } as never, "ก", [])
    expect(m).toBe("ขออภัยอย่างสุดซึ้ง ก")
  })
})
