"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"

type LatLng = { lat: number; lng: number }

export const ZONE_HEX: Record<string, string> = { sky: "#0284c7", amber: "#d97706", emerald: "#059669", violet: "#7c3aed", rose: "#e11d48", teal: "#0d9488" }
export const ZONE_DOT: Record<string, string> = { sky: "bg-sky-500", amber: "bg-amber-500", emerald: "bg-emerald-500", violet: "bg-violet-500", rose: "bg-rose-500", teal: "bg-teal-500" }

/** a point `km` away from `o` in direction `deg` (clockwise from north) */
const toward = (o: LatLng, deg: number, km: number): LatLng => {
  const a = (deg * Math.PI) / 180
  return { lat: o.lat + (km / 111) * Math.cos(a), lng: o.lng + (km / (111 * Math.cos((o.lat * Math.PI) / 180))) * Math.sin(a) }
}

/**
 * The branch's bus zones on a map (owner 2026-10-19): every home that rides the bus as a dot in its zone's colour,
 * the zone borders as lines out from the branch. Read-only, OpenStreetMap tiles.
 */
export function ZoneMap({ branch, homes, zones, className }: {
  branch: LatLng
  homes: { loc: LatLng; color: string; label: string }[]
  zones: { from: number; to: number; color: string; name: string }[]
  className?: string
}) {
  const box = useRef<HTMLDivElement>(null)
  const key = JSON.stringify([branch, homes, zones])
  useEffect(() => {
    let dead = false
    let map: { remove: () => void } | null = null
    ;(async () => {
      const L = (await import("leaflet")).default
      if (dead || !box.current) return
      const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m)
      const far = Math.max(4, ...homes.map((h) => Math.hypot((h.loc.lat - branch.lat) * 111, (h.loc.lng - branch.lng) * 108))) * 1.15
      for (const z of zones) {
        // the slice as a light wedge, its first border as a line
        const span = ((z.to - z.from) + 360) % 360 || 360
        const arc = Array.from({ length: 24 }, (_, i) => toward(branch, z.from + (span * i) / 23, far))
        L.polygon([branch, ...arc], { color: ZONE_HEX[z.color] ?? "#64748b", weight: 1, fillOpacity: 0.08, dashArray: "4 4" }).addTo(m)
        const mid = toward(branch, z.from + span / 2, far * 0.85)
        L.marker(mid, { icon: L.divIcon({ className: "", html: `<div style="transform:translate(-50%,-50%);white-space:nowrap;font:600 12px system-ui;color:${ZONE_HEX[z.color] ?? "#334155"};text-shadow:0 0 3px white,0 0 3px white">${z.name}</div>`, iconSize: [0, 0] }) }).addTo(m)
      }
      for (const h of homes) L.circleMarker(h.loc, { radius: 7, color: "white", weight: 2, fillColor: ZONE_HEX[h.color] ?? "#64748b", fillOpacity: 1 }).bindTooltip(h.label).addTo(m)
      L.marker(branch, { icon: L.divIcon({ className: "", html: '<div style="display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#0f172a;border:2px solid white;color:white;font:600 11px system-ui">B</div>', iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(m)
      m.fitBounds(L.latLngBounds([branch, ...homes.map((h) => h.loc)]).pad(0.15), { maxZoom: 14 })
      map = m
    })()
    return () => { dead = true; map?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return <div ref={box} className={className} />
}
