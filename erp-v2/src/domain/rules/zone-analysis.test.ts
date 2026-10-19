import { describe, expect, it } from "vitest"
import { hotspots, zoneOptions, type BusHome } from "./zone-analysis"

// owner 2026-10-19: analyse where the bus homes are — dense spots, and which zone layout runs best
const B = { lat: 13.73, lng: 100.58 }
const KM = 1 / 111 // ≈ 1 km of latitude
const home = (id: string, dLat: number, dLng: number, kids = 1): BusHome => ({ id, loc: { lat: B.lat + dLat * KM, lng: B.lng + dLng * KM }, kids })

// 3 homes bunched 6 km north, 2 homes 5 km south, one 3 km east
const homes = [home("n1", 6, 0), home("n2", 6.2, 0.2, 2), home("n3", 6.1, -0.1), home("s1", -5, 0), home("s2", -5.2, 0.1), home("e1", 0, 3)]

describe("zone analysis", () => {
  it("finds where homes bunch up — busiest spot first, with its distance and direction", () => {
    const spots = hotspots(homes, B)
    expect(spots[0]).toMatchObject({ homes: 3, kids: 4, direction: "ทิศเหนือ" })
    expect(spots[0].km).toBeCloseTo(6.1, 0)
    expect(spots[1]).toMatchObject({ homes: 2, direction: "ทิศใต้" })
    expect(spots.length).toBe(2) // the lone home east is not a spot
  })
  it("compares 1 zone with one per van and recommends the shorter longest trip", () => {
    const opts = zoneOptions(homes, B, [{ id: "v1", seats: 10 }, { id: "v2", seats: 10 }])
    expect(opts.map((o) => o.count)).toEqual([1, 2])
    const [one, two] = opts
    expect(two.longest).toBeLessThan(one.longest) // north and south apart: each van sweeps half
    expect(two.recommended).toBe(true)
    expect(two.zones.reduce((a, z) => a + z.homes, 0)).toBe(6)
  })
  it("never more zones than vans; a ride over the seats rules a layout out", () => {
    expect(zoneOptions(homes, B, [{ id: "v1", seats: 10 }]).map((o) => o.count)).toEqual([1])
    // one ride takes every home's children (7) — 1 zone overflows a 5-seat van, 2 zones split it
    const rides = [["n1", "n2", "n2", "n3", "s1", "s2", "e1"]]
    const opts = zoneOptions(homes, B, [{ id: "v1", seats: 5 }, { id: "v2", seats: 5 }], rides)
    expect(opts[0].peak).toBe(7)
    expect(opts.find((o) => o.recommended)!).toMatchObject({ count: 2 })
    expect(opts[1].peak).toBeLessThanOrEqual(5)
  })
})
