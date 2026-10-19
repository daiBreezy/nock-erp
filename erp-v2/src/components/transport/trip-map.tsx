"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"

type LatLng = { lat: number; lng: number }

const pin = (bg: string, label: string, size = 24) =>
  `<div style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.35);color:white;font:600 11px system-ui">${label}</div>`

/**
 * One trip on a map (owner 2026-10-19, Transport): the branch (B) and every stop numbered in the order the van goes,
 * joined by a line — pickup ends at the branch, drop-off starts there. Read-only, OpenStreetMap tiles.
 */
export function TripMap({ branch, stops, kind, className }: { branch: LatLng; stops: { loc?: LatLng; label: string }[]; kind: "pickup" | "dropoff"; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const key = JSON.stringify([branch, stops.map((s) => s.loc ?? null), kind])
  useEffect(() => {
    let dead = false
    let map: { remove: () => void } | null = null
    ;(async () => {
      const L = (await import("leaflet")).default
      if (dead || !box.current) return
      const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m)
      const pts = stops.filter((s) => s.loc).map((s) => s.loc!)
      const path = kind === "pickup" ? [...pts, branch] : [branch, ...pts]
      L.polyline(path, { color: kind === "pickup" ? "#0284c7" : "#d97706", weight: 3, dashArray: "6 6" }).addTo(m)
      L.marker(branch, { icon: L.divIcon({ className: "", html: pin("#0f172a", "B", 28), iconSize: [28, 28], iconAnchor: [14, 14] }) }).addTo(m)
      stops.forEach((s, i) => {
        if (!s.loc) return
        L.marker(s.loc, { icon: L.divIcon({ className: "", html: pin("#e11d48", String(i + 1)), iconSize: [24, 24], iconAnchor: [12, 12] }), title: s.label }).addTo(m)
      })
      m.fitBounds(L.latLngBounds([branch, ...pts]), { padding: [24, 24], maxZoom: 15 })
      map = m
    })()
    return () => { dead = true; map?.remove() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return <div ref={box} className={className} />
}
