"use client"

import { useEffect } from "react"

/**
 * owner 2026-11-26 — an empty table cell ("—") is a short, faint line in EVERY table of every page, whatever draws the cell (DataTable, a raw <table>, a component
 * that returns the dash itself). Mounted once in the layout: it marks every <td> whose whole text is "—" with `data-dash` (globals.css draws the short line) and
 * keeps the mark right while cells change. Nothing in React's tree is touched.
 */
const mark = (td: Element) => {
  const empty = td.textContent?.trim() === "—"
  if (empty) { if (!td.hasAttribute("data-dash")) td.setAttribute("data-dash", "") }
  else if (td.hasAttribute("data-dash")) td.removeAttribute("data-dash")
}

export function EmptyCellDash() {
  useEffect(() => {
    const pending = new Set<Element>()
    let raf = 0
    const flush = () => { raf = 0; pending.forEach(mark); pending.clear() }
    const queue = (n: Node | null) => {
      if (!n) return
      const el = n.nodeType === 1 ? (n as Element) : n.parentElement
      if (!el) return
      const td = el.closest("td")
      if (td) pending.add(td)
      if (n.nodeType === 1) (n as Element).querySelectorAll("td").forEach((t) => pending.add(t))
      if (!raf) raf = requestAnimationFrame(flush)
    }
    document.querySelectorAll("td").forEach((t) => pending.add(t))
    raf = requestAnimationFrame(flush)
    const mo = new MutationObserver((list) => {
      for (const m of list) {
        if (m.type === "characterData") queue(m.target)
        else { queue(m.target); m.addedNodes.forEach((n) => queue(n)) }
      }
    })
    mo.observe(document.body, { childList: true, subtree: true, characterData: true })
    return () => { mo.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [])
  return null
}
