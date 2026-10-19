import type { BusZone, ID } from "../types"
import { distanceKm } from "./bus"
import { autoZones, compassDeg, inwardSweep, legMin, STOP_MIN, zoneName, zoneOf, type Rider } from "./transport"

// Where the bus homes are, and how to split them (owner 2026-10-19: "เอา Location เหล่านั้นไป Analyze ได้ว่า จุดไหนมีความ
// หนาแน่น และจะวาง Zone ในรูปแบบไหน ให้สามารถเดินรถได้อย่างสะดวก และถูกต้อง"). Pure: the Zones tab shows it, the admin
// picks a layout (or sets a child's zone by hand).

type LatLng = { lat: number; lng: number }
/** a home that rides the bus: its pin (if any) and how many children ride from it */
export interface BusHome { id: ID; loc?: LatLng; kids: number }

/** homes within this distance of each other (km), chained, count as one spot */
export const SPOT_KM = 1

export interface Hotspot { center: LatLng; homes: number; kids: number; km: number; deg: number; direction: string }

/** where the homes bunch up: groups of 2+ homes each within ~1 km of another in the group, busiest first */
export function hotspots(homes: BusHome[], branch: LatLng, spotKm = SPOT_KM): Hotspot[] {
  const pins = homes.filter((h) => h.loc)
  const group = pins.map((_, i) => i)
  const root = (i: number): number => (group[i] === i ? i : (group[i] = root(group[i])))
  for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
    if (distanceKm(pins[i].loc!, pins[j].loc!) <= spotKm) group[root(i)] = root(j)
  }
  const sets = new Map<number, BusHome[]>()
  pins.forEach((h, i) => sets.set(root(i), [...(sets.get(root(i)) ?? []), h]))
  return [...sets.values()].filter((c) => c.length >= 2).map((c) => {
    const center = { lat: c.reduce((a, h) => a + h.loc!.lat, 0) / c.length, lng: c.reduce((a, h) => a + h.loc!.lng, 0) / c.length }
    const deg = compassDeg(branch, center)
    return { center, homes: c.length, kids: c.reduce((a, h) => a + h.kids, 0), km: Math.round(distanceKm(branch, center) * 10) / 10, deg, direction: zoneName(deg).replace(/^สาย/, "ทิศ") }
  }).sort((a, b) => b.homes - a.homes || a.km - b.km)
}

/** a zone under one layout: its homes / children, the busiest single ride (children on one van at once) and its sweep */
export interface ZoneStat { zone: Omit<BusZone, "id">; homes: number; kids: number; peak: number; farthestKm: number; routeKm: number; minutes: number }
export interface ZoneOption { count: number; zones: ZoneStat[]; longest: number; totalKm: number; peak: number; seats: number; recommended: boolean; why: string }

/** one van's sweep through a zone's homes: farthest first, in to the branch (the same order the trips use) */
function sweep(homes: BusHome[], branch: LatLng): { km: number; minutes: number } {
  const pins = homes.filter((h) => h.loc)
  if (!pins.length) return { km: 0, minutes: 0 }
  const asRiders = pins.map((h) => ({ studentId: h.id, loc: h.loc }) as Rider)
  const order = inwardSweep(asRiders, branch)
  let km = 0
  for (let i = 1; i < order.length; i++) km += distanceKm(order[i - 1].loc!, order[i].loc!)
  km += distanceKm(order.at(-1)!.loc!, branch)
  return { km: Math.round(km * 10) / 10, minutes: legMin(km) + STOP_MIN * order.length }
}

/**
 * Ways to split the homes — 1 zone up to one per van (zones leave together, so never more zones than vans): for each,
 * how many homes / children each van gets and how long its sweep takes. `rides` = the coming rides, each the homes of
 * the children on it (a home twice for two siblings) — so "peak" is the most children one van carries at once.
 * Recommended = the shortest longest-trip while every ride fits a van's seats; a tie goes to fewer zones. By pin
 * only — homes the admin put in a zone by hand are moved again by hand after a layout is applied.
 */
export function zoneOptions(homes: BusHome[], branch: LatLng, vans: { id: ID; seats: number }[], rides: ID[][] = []): ZoneOption[] {
  const pins = homes.filter((h) => h.loc)
  if (!pins.length) return []
  const seats = Math.min(...(vans.length ? vans.map((v) => v.seats) : [10]))
  const max = Math.max(1, Math.min(vans.length, pins.length))
  const opts: ZoneOption[] = []
  for (let k = 1; k <= max; k++) {
    const made = autoZones(pins.map((h) => compassDeg(branch, h.loc!)), k, vans.map((v) => v.id))
    const withIds = made.map((z, i) => ({ ...z, id: `opt${i}` }))
    const stats = withIds.map((z): ZoneStat => {
      const members = pins.filter((h) => zoneOf({ location: h.loc }, branch, withIds)?.id === z.id)
      const r = sweep(members, branch)
      const { id: _id, ...zone } = z
      void _id
      const ids = new Set(members.map((h) => h.id))
      const peak = Math.max(0, ...rides.map((r) => r.filter((id) => ids.has(id)).length))
      return { zone, homes: members.length, peak, kids: members.reduce((a, h) => a + h.kids, 0), farthestKm: Math.round(Math.max(0, ...members.filter((h) => h.loc).map((h) => distanceKm(branch, h.loc!))) * 10) / 10, routeKm: r.km, minutes: r.minutes }
    })
    opts.push({ count: k, zones: stats, longest: Math.max(...stats.map((s) => s.minutes)), totalKm: Math.round(stats.reduce((a, s) => a + s.routeKm, 0) * 10) / 10, peak: Math.max(...stats.map((s) => s.peak)), seats, recommended: false, why: "" })
  }
  const fits = opts.filter((o) => o.peak <= seats)
  const pool = fits.length ? fits : opts
  const best = [...pool].sort((a, b) => a.longest - b.longest || a.count - b.count)[0]
  best.recommended = true
  best.why = best.count === 1
    ? `รถคันเดียววิ่งได้ทุกบ้าน เที่ยวที่นานสุดราว ${best.longest} นาที`
    : `แบ่ง ${best.count} โซน รถแต่ละคันวิ่งเฉพาะทิศของตัวเอง เที่ยวที่นานสุดเหลือราว ${best.longest} นาที (1 โซน ${opts[0].longest} นาที)`
  if (!fits.length) best.why += ` · ทุกแบบมีบางรอบที่เด็กเกิน ${seats} ที่นั่ง — ต้องเพิ่มรอบหรือรถ`
  return opts
}
