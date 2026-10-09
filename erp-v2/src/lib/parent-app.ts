"use client"

// Parent app v1 (owner 2026-10-09): the ERP keeps what each LINE-linked family may see published on the server, so the
// parent's phone (outside this browser's data) can read it. Prototype stand-in for Dev's database.
import { useEffect } from "react"
import { parentView, type ParentView } from "@/domain/rules/parent-view"
import type { Family } from "@/domain/types"
import { useStore } from "@/store/store"

export function buildParentView(family: Family): ParentView {
  const s = useStore.getState()
  return parentView(family, {
    students: s.students, branches: s.branches, sessions: s.sessions, classes: s.classes, staff: s.staff, attendance: s.attendance,
    summaries: s.summaries, entitlements: s.entitlements, courses: s.courses, invoices: s.invoices, busAddOns: s.busAddOns, now: s.now(),
  })
}

let last = ""
async function publish() {
  const views = useStore.getState().families.filter((f) => f.lineUserId).map(buildParentView)
  // compare without the timestamp — only real changes are sent
  const key = JSON.stringify(views.map((v) => ({ ...v, generatedAt: "" })))
  if (key === last) return
  last = key
  await fetch("/api/parent-app/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ views }) }).catch(() => { last = "" })
}

/** Republish a few seconds after the data a parent sees changes (schedule, attendance, summaries, invoices …). */
export function usePublishParentViews() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const kick = () => { clearTimeout(timer); timer = setTimeout(() => void publish(), 4000) }
    kick()
    const unsub = useStore.subscribe((s, prev) => {
      if (s.sessions !== prev.sessions || s.attendance !== prev.attendance || s.summaries !== prev.summaries || s.families !== prev.families ||
        s.students !== prev.students || s.invoices !== prev.invoices || s.busAddOns !== prev.busAddOns || s.entitlements !== prev.entitlements) kick()
    })
    return () => { clearTimeout(timer); unsub() }
  }, [])
}
