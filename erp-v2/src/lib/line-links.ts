"use client"

// Keeps the LINE ↔ family links on the server too (owner 2026-10-20): every link the ERP has goes up; when this
// browser has lost them (data cleared, a new browser) they come back down and the families are linked again.
import { useEffect } from "react"
import { useStore } from "@/store/store"

let sent = ""
export function useLineLinkSync() {
  useEffect(() => {
    let alive = true
    const push = () => {
      const links = useStore.getState().families.filter((f) => f.lineUserId).map((f) => ({ lineUserId: f.lineUserId!, familyId: f.id, familyName: f.name }))
      const key = JSON.stringify(links)
      // never sends an empty list — a browser without links must not look like "no one is linked"
      if (!links.length || key === sent) return
      sent = key
      void fetch("/api/line/links", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ links }) })
        .then((r) => { if (!r.ok) sent = "" }).catch(() => { sent = "" })
    }
    fetch("/api/line/links").then((r) => r.json()).then((j: { ok?: boolean; links?: { lineUserId: string; familyId: string }[] }) => {
      if (alive && j.ok && j.links?.length) useStore.getState().restoreLineLinks(j.links)
    }).catch(() => {}).finally(() => { if (alive) push() })
    const unsub = useStore.subscribe((s, p) => { if (s.families !== p.families) push() })
    return () => { alive = false; unsub() }
  }, [])
}
