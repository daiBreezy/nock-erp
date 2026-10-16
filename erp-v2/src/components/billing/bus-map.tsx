"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"

type LatLng = { lat: number; lng: number }

const pin = (bg: string, label: string) =>
  `<div style="display:grid;place-items:center;width:26px;height:26px;border-radius:50% 50% 50% 0;background:${bg};transform:rotate(-45deg);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"><span style="transform:rotate(45deg);color:white;font:600 11px system-ui">${label}</span></div>`

/**
 * The bus at a glance (owner 2026-10-16): the branch, the family's home pin, a dashed line between them and the bus
 * area (the farthest fee band) as a ring — read-only, OpenStreetMap tiles, no API key.
 */
export function BusMap({ branch, home, radiusKm, className }: { branch: LatLng; home: LatLng; radiusKm?: number | null; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    let dead = false
    let map: { remove: () => void } | null = null
    ;(async () => {
      const L = (await import("leaflet")).default
      if (dead || !box.current) return
      const m = L.map(box.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false })
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m)
      if (radiusKm) L.circle(branch, { radius: radiusKm * 1000, color: "#0ea5e9", weight: 1, fillOpacity: 0.06, dashArray: "4 4" }).addTo(m)
      L.polyline([branch, home], { color: "#e11d48", weight: 3, dashArray: "6 6" }).addTo(m)
      L.marker(branch, { icon: L.divIcon({ className: "", html: pin("#0f172a", "B"), iconSize: [26, 26], iconAnchor: [13, 26] }) }).addTo(m)
      L.marker(home, { icon: L.divIcon({ className: "", html: pin("#e11d48", "H"), iconSize: [26, 26], iconAnchor: [13, 26] }) }).addTo(m)
      m.fitBounds(L.latLngBounds([branch, home]), { padding: [28, 28], maxZoom: 16 })
      map = m
    })()
    return () => { dead = true; map?.remove() }
  }, [branch, home, radiusKm])
  return <div ref={box} className={className} />
}
