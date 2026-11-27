"use client"

import { useEffect } from "react"
import { exceedsThreshold, PAN_BLOCK_SELECTOR, panTo } from "@/lib/drag-scroll"

/** the nearest ancestor that can actually scroll (either way) — never the page itself */
function scrollerOf(start: Element | null): HTMLElement | null {
  for (let el = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    if (!(el instanceof HTMLElement)) continue
    const cs = getComputedStyle(el)
    const x = /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 1
    const y = /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 1
    if (x || y) return el
  }
  return null
}

/**
 * Hold the mouse button and drag to scroll — in EVERY scrollable box of the ERP (owner 2026-11-27): wide tables, the strip of class cards, the invoice
 * preview … one listener for the whole app, nothing to wire per page. Mouse only (a finger / touchpad already scrolls). Rules:
 *  · form controls, editable text, things that drag on their own (`[draggable]`), `[data-no-pan]` (text you copy, e.g. a chat thread) and `[data-pan]`
 *    (the calendar's own pan) are left alone
 *  · a press only turns into a drag after 4px — a plain click still clicks; the click that ends a real drag is swallowed
 *  · the page itself is never dragged, only boxes inside it
 */
export function DragScroll() {
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0 || e.defaultPrevented) return
      const t = e.target
      if (!(t instanceof Element) || t.closest(PAN_BLOCK_SELECTOR)) return
      const box = scrollerOf(t)
      if (!box) return
      // the scroller's own scrollbar is for the browser
      if (t === box) {
        const r = box.getBoundingClientRect()
        if (e.clientX - r.left > box.clientWidth || e.clientY - r.top > box.clientHeight) return
      }
      const sx = e.clientX, sy = e.clientY, l0 = box.scrollLeft, t0 = box.scrollTop
      let on = false
      const move = (ev: PointerEvent) => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy
        if (!on) {
          if (!exceedsThreshold(dx, dy)) return
          on = true
          document.documentElement.classList.add("drag-scrolling")
          window.getSelection()?.removeAllRanges()
        }
        box.scrollLeft = panTo(l0, dx, box.scrollWidth - box.clientWidth)
        box.scrollTop = panTo(t0, dy, box.scrollHeight - box.clientHeight)
      }
      const up = () => {
        window.removeEventListener("pointermove", move)
        window.removeEventListener("pointerup", up)
        window.removeEventListener("pointercancel", up)
        if (!on) return
        document.documentElement.classList.remove("drag-scrolling")
        // the mouse-up of a real drag must not also click whatever is under the pointer
        const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault() }
        window.addEventListener("click", swallow, { capture: true, once: true })
        setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 0)
      }
      window.addEventListener("pointermove", move)
      window.addEventListener("pointerup", up)
      window.addEventListener("pointercancel", up)
    }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [])
  return null
}
