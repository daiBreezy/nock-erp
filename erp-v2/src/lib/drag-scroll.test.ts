import { describe, expect, it } from "vitest"
import { exceedsThreshold, panTo } from "./drag-scroll"

describe("drag scroll", () => {
  it("a small wiggle is still a click; a real move is a drag", () => {
    expect(exceedsThreshold(2, 1)).toBe(false)
    expect(exceedsThreshold(3, 3)).toBe(true)
  })
  it("dragging right scrolls left, and never leaves the scroller", () => {
    expect(panTo(100, 30, 500)).toBe(70)
    expect(panTo(100, -50, 500)).toBe(150)
    expect(panTo(10, 50, 500)).toBe(0)
    expect(panTo(480, -100, 500)).toBe(500)
    expect(panTo(0, -10, 0)).toBe(0)
  })
})
