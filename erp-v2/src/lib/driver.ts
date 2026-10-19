"use client"

// Driver app link + publishing (owner 2026-10-19): the ERP keeps the approved trips on the server for the drivers'
// phones, and reads back what they tapped. Prototype stand-in for Dev's database.
import { useEffect, useState } from "react"
import { toDateStr, addDays } from "@/domain/dates"
import { planDay, type DriverEvent, type TripPlan } from "@/domain/rules/transport"
import type { Branch } from "@/domain/types"
import { nm } from "@/lib/i18n"
import { useStore } from "@/store/store"

/** the driver's link — through LINE (LIFF) when it's set up, else this site */
export function driverAppUrl(token: string) {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  return liffId ? `https://liff.line.me/${liffId}?app=driver&t=${token}` : `${typeof window !== "undefined" ? window.location.origin : ""}/liff/form?app=driver&t=${token}`
}

function payload(t: TripPlan, branch: Branch, token: string) {
  return {
    tripId: t.id, token, driverName: t.driver?.nickname ?? "", branchName: nm(branch.name), date: t.date, kind: t.round.kind, time: t.round.time, name: t.round.name,
    depart: t.depart, finish: t.finish, vehicle: t.vehicle ? { name: t.vehicle.name, plate: t.vehicle.plate } : null, seats: t.seats, used: t.used, km: t.km,
    stops: t.stops.map((s) => ({ key: s.key, nickname: s.rider.nickname, name: s.rider.name, grade: s.rider.grade, leg: s.rider.leg, adult: s.rider.adult, phone: s.rider.phone, address: s.rider.address, addressNote: s.rider.addressNote, loc: s.rider.loc, eta: s.eta })),
  }
}

let last = ""
/** Republish the approved trips (today + 6 days, every branch with runs) a few seconds after anything they show changes. */
export function usePublishDriverTrips() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const run = () => {
      const s = useStore.getState()
      const today = toDateStr(s.now())
      const ctx = { students: s.students, families: s.families, classes: s.classes, invoices: s.invoices, busAddOns: s.busAddOns, trips: s.busTrips ?? [], staff: s.staff, now: s.now() }
      const out = []
      for (const b of s.branches.filter((x) => (x.busRounds ?? []).length)) {
        for (let i = 0; i < 7; i++) {
          for (const t of planDay(b, addDays(today, i), ctx).trips) {
            const token = t.driver?.id ? s.staff.find((x) => x.id === t.driver!.id)?.driverToken : undefined
            if (token && t.stops.length && t.state?.sentAt) out.push(payload(t, b, token))
          }
        }
      }
      const key = JSON.stringify(out)
      if (key === last) return
      last = key
      // a failed send (server restarting, a reply that isn't ok) is tried again on the next check
      void fetch("/api/driver/publish", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trips: out }) })
        .then((r) => { if (!r.ok) last = "" }).catch(() => { last = "" })
    }
    const kick = () => { clearTimeout(timer); timer = setTimeout(run, 1500) }
    kick()
    // owner 2026-10-19 ("อนุมัติเที่ยวรถไปแล้ว แต่ไม่แสดงบน App คนขับ"): don't rely on the change alone — check again every
    // half minute (sent again even when unchanged — the server copy may have been lost) and when the tab comes back
    const every = setInterval(() => { last = ""; run() }, 30_000)
    const onShow = () => { if (document.visibilityState === "visible") kick() }
    document.addEventListener("visibilitychange", onShow)
    const unsub = useStore.subscribe((s, p) => {
      if (s.busTrips !== p.busTrips || s.invoices !== p.invoices || s.busAddOns !== p.busAddOns || s.families !== p.families || s.branches !== p.branches || s.staff !== p.staff) kick()
    })
    return () => { clearTimeout(timer); clearInterval(every); document.removeEventListener("visibilitychange", onShow); unsub() }
  }, [])
}

/** what drivers reported — polled while the transport page is open */
export function useDriverEvents(intervalMs = 10_000): DriverEvent[] {
  const [events, setEvents] = useState<DriverEvent[]>([])
  useEffect(() => {
    let alive = true
    const tick = () => fetch("/api/driver/events").then((r) => r.json()).then((j) => { if (alive && j.ok) setEvents(j.events) }).catch(() => {})
    tick()
    const t = setInterval(tick, intervalMs)
    return () => { alive = false; clearInterval(t) }
  }, [intervalMs])
  return events
}
