"use client"

import "leaflet/dist/leaflet.css"
import { useEffect, useRef } from "react"
import type { Map as LMap, Marker } from "leaflet"

type LatLng = { lat: number; lng: number }
const BANGKOK: LatLng = { lat: 13.7563, lng: 100.5018 }

/**
 * Pin the house for the bus driver (Liclass, owner 2026-09-30): tap the map to drop the pin, drag it to fine-tune,
 * or use the phone's location. OpenStreetMap tiles — no API key. The pin is a CSS dot (bundlers break Leaflet's
 * default marker images).
 */
export function MapPin({ value, onChange, locateLabel }: { value?: LatLng; onChange: (v: LatLng) => void; locateLabel: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<LMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const change = useRef(onChange)
  useEffect(() => { change.current = onChange }, [onChange])

  useEffect(() => {
    let dead = false
    ;(async () => {
      const L = (await import("leaflet")).default
      if (dead || !box.current || map.current) return
      const icon = L.divIcon({ className: "", html: '<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:#e11d48;transform:rotate(-45deg);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>', iconSize: [22, 22], iconAnchor: [11, 22] })
      const m = L.map(box.current, { zoomControl: true, attributionControl: true }).setView(value ?? BANGKOK, value ? 17 : 11)
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m)
      const place = (ll: LatLng) => {
        if (!marker.current) {
          marker.current = L.marker(ll, { icon, draggable: true }).addTo(m)
          marker.current.on("dragend", () => { const p = marker.current!.getLatLng(); change.current({ lat: p.lat, lng: p.lng }) })
        } else marker.current.setLatLng(ll)
        change.current(ll)
      }
      if (value) place(value)
      m.on("click", (e) => place({ lat: e.latlng.lat, lng: e.latlng.lng }))
      map.current = m
      ;(box.current as HTMLDivElement & { _place?: (ll: LatLng) => void })._place = place
    })()
    return () => { dead = true; map.current?.remove(); map.current = null; marker.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const locate = () => navigator.geolocation?.getCurrentPosition((p) => {
    const ll = { lat: p.coords.latitude, lng: p.coords.longitude }
    map.current?.setView(ll, 17)
    ;(box.current as (HTMLDivElement & { _place?: (ll: LatLng) => void }) | null)?._place?.(ll)
  })

  return (
    <div className="space-y-1.5">
      <div ref={box} className="z-0 h-56 w-full overflow-hidden rounded-2xl ring-1 ring-foreground/10" />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button type="button" onClick={locate} className="rounded-full border px-2.5 py-1 font-medium text-foreground hover:bg-muted">📍 {locateLabel}</button>
        {value && <span className="tabular-nums">{value.lat.toFixed(5)}, {value.lng.toFixed(5)}</span>}
      </div>
    </div>
  )
}
