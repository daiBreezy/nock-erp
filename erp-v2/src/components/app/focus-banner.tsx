"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { useQueryState } from "@/lib/hooks"

/**
 * "เด้งมาเพื่อทำอะไร" (owner 2026-10-07): a Dashboard topic links to its page with `?focus=<key>`, and every element
 * on the page marked `data-focus="<key> …"` flashes 5 times (the first one scrolls into view), then goes back to normal.
 * owner 2026-11-16: no banner any more ("มันรก") — the flash alone says where to look.
 */
const HIT = ["focus-hit"]

export function FocusHighlight() {
  const pathname = usePathname()
  const [key, setKey] = useState<string | null>(null)

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("focus")
    setKey(k) // eslint-disable-line react-hooks/set-state-in-effect
  }, [pathname])

  useEffect(() => {
    if (!key) return
    let scrolled = false
    const marked = new Set<Element>()
    const apply = () => {
      const els = document.querySelectorAll(`[data-focus~="${CSS.escape(key)}"]`)
      els.forEach((el) => { if (!marked.has(el)) { el.classList.add(...HIT); marked.add(el) } })
      if (els[0] && !scrolled) { scrolled = true; els[0].scrollIntoView({ behavior: "smooth", block: "center" }) }
    }
    // pages render their data after mount (store hydration) — keep marking for a few seconds as rows appear
    apply()
    const obs = new MutationObserver(apply)
    obs.observe(document.body, { childList: true, subtree: true })
    const stop = setTimeout(() => obs.disconnect(), 4000)
    return () => { obs.disconnect(); clearTimeout(stop); marked.forEach((el) => el.classList.remove(...HIT)) }
  }, [key])

  return null
}

/**
 * Long, paginated lists: with ?focus=<key>, rows tagged with that key come first so they land on page 1
 * (`keysOf` returns the same space-separated keys the row puts in data-focus).
 */
export function useFocusFirst<T>(rows: T[], keysOf: (r: T) => string | undefined): T[] {
  const [focus] = useQueryState<string>("focus", "")
  if (!focus) return rows
  const has = (r: T) => (keysOf(r) ?? "").split(" ").includes(focus)
  return [...rows.filter(has), ...rows.filter((r) => !has(r))]
}
