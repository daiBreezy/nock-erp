import { describe, expect, it } from "vitest"
import type { Branch, BusAddOn, BusTrip, Family, Invoice, Klass, Student } from "../types"
import { autoZones, compassDeg, orderStops, planDay, timeStops, zoneOf, type Rider } from "./transport"

// owner 2026-10-19 — Transport: riders are worked out, never typed
const MON = "2026-10-19"
const B = { lat: 13.73, lng: 100.58 }
const branch = {
  id: "b", location: B, fees: [{ id: "f", kind: "bus", name: "Std", price: 150, maxKm: 8 }], busFeePerLeg: 150,
  vehicles: [{ id: "v1", name: "รถตู้ 1", plate: "1234", seats: 10, driverName: "น้าสมชาย", driverPhone: "0811", active: true }, { id: "v2", name: "รถตู้ 2", plate: "5678", seats: 10, driverName: "น้าเบ้ง", driverPhone: "0822", active: true }],
  busRounds: [
    { id: "p", kind: "pickup", weekdays: [1], time: "15:45", seats: 3, vehicleId: "v1" },
    { id: "d", kind: "dropoff", weekdays: [1], time: "17:15", seats: 10, vehicleId: "v1" },
  ],
} as unknown as Branch
const kid = (id: string, fam: string) => ({ id, familyId: fam, branchId: "b", name: id, nickname: id, grade: "ป.5" }) as unknown as Student
const fam = (id: string, lat: number, lng: number) => ({ id, name: id, parents: [{ name: "แม่", phone: "08", primary: true }], location: { lat, lng } }) as unknown as Family
const k = { id: "k", weekday: 1, start: "16:00", minutes: 60, studentIds: ["a", "b2", "c", "d"] } as unknown as Klass
const inv = (s: string, pickup: boolean, dropoff: boolean) => ({ id: `i${s}`, branchId: "b", studentId: s, status: "paid", lines: [{ classIds: ["k"] }], bus: [{ date: MON, pickup, dropoff }] }) as unknown as Invoice
const ctx = (extra: { busAddOns?: BusAddOn[]; trips?: BusTrip[] } = {}) => ({
  students: [kid("a", "fa"), kid("b2", "fb"), kid("c", "fc"), kid("d", "fd")],
  families: [fam("fa", 13.75, 100.58), fam("fb", 13.70, 100.58), fam("fc", 13.73, 100.62), { ...fam("fd", 0, 0), location: undefined }],
  classes: [k], invoices: [inv("a", true, true), inv("b2", true, false), inv("c", false, true), inv("d", true, true)], busAddOns: extra.busAddOns ?? [], trips: extra.trips ?? [],
})

describe("transport — planDay", () => {
  it("puts each child on the run that fits their class time, from what they paid for", () => {
    const p = planDay(branch, MON, ctx())
    const pick = p.trips.find((t) => t.round.id === "p")!, drop = p.trips.find((t) => t.round.id === "d")!
    expect(pick.stops.map((s) => s.rider.studentId).sort()).toEqual(["a", "b2", "d"])
    expect(drop.stops.map((s) => s.rider.studentId).sort()).toEqual(["a", "c", "d"])
    expect(drop.depart).toBe("17:15")
    expect(pick.finish).toBe("15:45")
  })
  it("flags what needs a look: over the seats, no home pin", () => {
    const p = planDay(branch, MON, ctx({ busAddOns: [{ id: "x", branchId: "b", studentId: "a", date: MON, pickup: true, dropoff: false, busFeeId: null, amount: 0, companion: true, createdBy: "", createdAt: "" }] }))
    const pick = p.trips.find((t) => t.round.id === "p")!
    expect(pick.used).toBe(4) // 3 children + a's parent
    expect(pick.warnings).toEqual(expect.arrayContaining(["เกินที่นั่ง 4/3", "ไม่มีหมุดบ้าน 1 คน"]))
  })
  it("a child moved by hand stays on that run; a sent trip shows when it changed after", () => {
    // a second drop-off run later; "c" would go on the 17:15 one, the admin puts her on 18:30
    const two = { ...branch, busRounds: [...branch.busRounds!, { id: "d2", kind: "dropoff", weekdays: [1], time: "18:30", seats: 10, vehicleId: "v2" }] } as Branch
    const p = planDay(two, MON, ctx({ trips: [{ id: "d2|x", branchId: "b", roundId: "d2", date: MON, pinned: ["c"] }] }))
    expect(p.trips.find((t) => t.round.id === "d2")!.stops.map((s) => s.rider.studentId)).toEqual(["c"])
    expect(p.trips.find((t) => t.round.id === "d")!.stops.some((s) => s.rider.studentId === "c")).toBe(false)
    const sent = planDay(branch, MON, ctx({ trips: [{ id: "p|x", branchId: "b", roundId: "p", date: MON, sentAt: "x", sentKey: "old" }] }))
    expect(sent.trips.find((t) => t.round.id === "p")!.status).toBe("changed")
  })
  it("no run at that time = left out with the reason", () => {
    const late = { ...k, start: "19:00" } as Klass
    const p = planDay(branch, MON, { ...ctx(), classes: [late] })
    expect(p.unplaced.length).toBeGreaterThan(0)
    expect(p.unplaced[0].reason).toMatch(/ไม่มีรอบ/)
  })
  it("orders stops nearest-first from the branch on the way home, reversed on the way in, and times them", () => {
    const r = (id: string, lat: number): Rider => ({ studentId: id, nickname: id, name: id, grade: "", familyId: null, familyName: "", phone: "", loc: { lat, lng: 100.58 }, adult: false, classStart: "", classEnd: "", pinned: false, zoneId: null, leg: "dropoff" })
    const riders = [r("far", 13.80), r("near", 13.74)]
    expect(orderStops(riders, B, "dropoff").map((x) => x.studentId)).toEqual(["near", "far"])
    expect(orderStops(riders, B, "pickup").map((x) => x.studentId)).toEqual(["far", "near"])
    const t = timeStops(orderStops(riders, B, "dropoff"), B, { id: "d", kind: "dropoff", weekdays: [1], time: "17:00", seats: 10 })
    expect(t.stops[0].eta! < t.stops[1].eta!).toBe(true)
  })
})

describe("bus zones — several vans (owner 2026-10-19)", () => {
  it("direction from the branch: north 0°, east 90°, south 180°", () => {
    expect(Math.round(compassDeg(B, { lat: 13.8, lng: 100.58 }))).toBe(0)
    expect(Math.round(compassDeg(B, { lat: 13.73, lng: 100.7 }))).toBe(90)
    expect(Math.round(compassDeg(B, { lat: 13.6, lng: 100.58 }))).toBe(180)
  })
  it("auto zones: one per van, about the same number of homes, cut at the widest empty gap", () => {
    const z = autoZones([350, 5, 20, 160, 175, 190], 2, ["v1", "v2"])
    expect(z).toHaveLength(2)
    const count = (zone: { from: number; to: number }) => [350, 5, 20, 160, 175, 190].filter((d) => (zone.from <= zone.to ? d >= zone.from && d < zone.to : d >= zone.from || d < zone.to)).length
    expect(z.map(count)).toEqual([3, 3])
    expect(z.map((x) => x.vehicleId)).toEqual(["v1", "v2"])
    expect(z.map((x) => x.name).sort()).toEqual(["สายเหนือ", "สายใต้"].sort())
  })
  it("a home's zone: set by hand first, else by direction", () => {
    const zones = [{ id: "n", name: "N", color: "sky", from: 270, to: 90 }, { id: "s", name: "S", color: "amber", from: 90, to: 270 }]
    expect(zoneOf({ location: { lat: 13.8, lng: 100.58 } }, B, zones)?.id).toBe("n")
    expect(zoneOf({ location: { lat: 13.8, lng: 100.58 }, busZoneId: "s" }, B, zones)?.id).toBe("s")
  })
  it("two vans leaving at the same time: each child rides their zone's van", () => {
    const two = {
      ...branch,
      busRounds: [{ id: "p1", kind: "pickup", weekdays: [1], time: "15:45", seats: 10, vehicleId: "v1" }, { id: "p2", kind: "pickup", weekdays: [1], time: "15:45", seats: 10, vehicleId: "v2" }],
      busZones: [{ id: "n", name: "สายเหนือ", color: "sky", from: 270, to: 90, vehicleId: "v1" }, { id: "s", name: "สายใต้", color: "amber", from: 90, to: 270, vehicleId: "v2" }],
    } as Branch
    const p = planDay(two, MON, ctx())
    const on = (id: string) => p.trips.find((t) => t.round.id === id)!.stops.map((x) => x.rider.studentId).sort()
    // a is north (13.75) → van 1 · b2 is south (13.70) → van 2 · d has no pin → no zone → split by direction
    expect(on("p1")).toContain("a")
    expect(on("p2")).toContain("b2")
    expect(p.trips.find((t) => t.round.id === "p1")!.zoneIds).toEqual(["n"])
  })
})

describe("changing a day (owner 2026-10-19: create / edit / delete / adjust / cancel)", () => {
  it("a run cancelled that day takes nobody; its children are left for the admin with the reason", () => {
    const p = planDay(branch, MON, ctx({ trips: [{ id: "p|x", branchId: "b", roundId: "p", date: MON, cancelled: { reason: "รถเสีย", by: "u", at: "" } }] }))
    const pick = p.trips.find((t) => t.round.id === "p")!
    expect(pick.status).toBe("cancelled")
    expect(pick.stops).toEqual([])
    expect(p.unplaced.filter((u) => u.kind === "pickup").map((u) => u.reason)).toContain("เที่ยว 15:45 ยกเลิกวันนี้")
  })
  it("a run moved to another time that day uses that time", () => {
    const p = planDay(branch, MON, ctx({ trips: [{ id: "d|x", branchId: "b", roundId: "d", date: MON, time: "17:40" }] }))
    const drop = p.trips.find((t) => t.round.id === "d")!
    expect(drop.depart).toBe("17:40")
    expect(drop.timeChanged).toBe(true)
  })
  it("a one-off run for the day shows up and takes the children put on it", () => {
    const p = planDay(branch, MON, ctx({ trips: [{ id: "x1|d", branchId: "b", roundId: "x1", date: MON, extra: { kind: "dropoff", time: "18:00", seats: 6, vehicleId: "v2", name: "ทัศนศึกษา" }, pinned: ["c"] }] }))
    const x = p.trips.find((t) => t.round.id === "x1")!
    expect(x.extra).toBe(true)
    expect(x.stops.map((s) => s.rider.studentId)).toEqual(["c"])
    expect(x.vehicle?.id).toBe("v2")
    // it takes nobody else — the others stay on their weekly run even though 18:00 is later than 17:15
    const early = planDay(branch, MON, ctx({ trips: [{ id: "x2|d", branchId: "b", roundId: "x2", date: MON, extra: { kind: "dropoff", time: "17:05", seats: 6 } }] }))
    expect(early.trips.find((t) => t.round.id === "x2")!.stops).toEqual([])
    expect(early.trips.find((t) => t.round.id === "d")!.stops.length).toBe(3)
  })
})

describe("Bus Route ref (owner 2026-10-19): Both trips, drivers, the driver app", () => {
  // a Both run 16:30: drops the 15:00–16:00 class, brings the 17:30 class in
  const early = { id: "ke", weekday: 1, start: "15:00", minutes: 60, studentIds: ["a"] } as unknown as Klass
  const late = { id: "kl", weekday: 1, start: "17:30", minutes: 60, studentIds: ["b2"] } as unknown as Klass
  const both = { ...branch, busRounds: [{ id: "x", kind: "both", weekdays: [1], time: "16:30", seats: 10, vehicleId: "v1" }] } as Branch
  const c2 = { ...ctx(), classes: [early, late], invoices: [inv("a", false, true), inv("b2", true, false)] }

  it("one Both trip takes the class that ended home, then brings the next class in — drop-offs first", () => {
    const p = planDay(both, MON, c2)
    const t = p.trips[0]
    expect(t.stops.map((s) => `${s.rider.studentId}:${s.rider.leg}`)).toEqual(["a:dropoff", "b2:pickup"])
    expect(t.depart).toBe("16:30")
    expect(t.finish > t.stops[1].eta!).toBe(true) // back at the branch after the last pickup
    expect(t.used).toBe(1) // one out, one back — never both on board
  })
  it("admin sets the departure: the stops are timed from it", () => {
    const base = planDay(both, MON, c2).trips[0]
    const t = planDay(both, MON, { ...c2, trips: [{ id: "x|d", branchId: "b", roundId: "x", date: MON, departAt: "16:00" }] }).trips[0]
    expect(t).toMatchObject({ depart: "16:00", departFixed: true })
    expect(t.stops[0].eta! < base.stops[0].eta!).toBe(true)
    expect(t.stops[0].eta! > "16:00").toBe(true)
  })
  it("admin sets a child's stop time: it is kept and the stops after it follow on", () => {
    const t = planDay(both, MON, { ...c2, trips: [{ id: "x|d", branchId: "b", roundId: "x", date: MON, stopTimes: { "a|dropoff": "17:00" } }] }).trips[0]
    expect(t.stops[0]).toMatchObject({ eta: "17:00", etaFixed: true })
    expect(t.stops[1].etaFixed).toBe(false)
    expect(t.stops[1].eta! > "17:00").toBe(true)
    expect(t.finish > t.stops[1].eta!).toBe(true)
  })
  it("check in (arrived) then check out (picked up / dropped off) — late is counted from the check in", () => {
    const id = "x|" + MON
    const arrived = [{ id: "1", tripId: id, type: "start" as const, at: "2026-10-19T16:31:00" }, { id: "2", tripId: id, type: "arrive" as const, stopKey: "a|dropoff", at: "2026-10-19T16:58:00" }]
    const t1 = planDay(both, MON, { ...c2, events: arrived }).trips[0]
    expect(t1.stops[0]).toMatchObject({ status: "here", checkIn: "16:58", checkOut: null })
    expect(t1.stops[1].status).toBe("next")
    const t2 = planDay(both, MON, { ...c2, events: [...arrived, { id: "3", tripId: id, type: "done" as const, stopKey: "a|dropoff", at: "2026-10-19T17:01:00" }] }).trips[0]
    expect(t2.stops[0]).toMatchObject({ status: "done", checkIn: "16:58", checkOut: "17:01", actual: "17:01" })
    expect(t2.stops[0].late).toBe(16 * 60 + 58 - (Number(t2.stops[0].eta!.slice(0, 2)) * 60 + Number(t2.stops[0].eta!.slice(3))))
  })
  it("real times typed in by the admin win over the driver app (or stand in for it)", () => {
    const id = "x|" + MON
    const trips = [{ id: "x|d", branchId: "b", roundId: "x", date: MON, actuals: { start: "16:35", stops: { "a|dropoff": { in: "16:50", out: "16:52" } } } }]
    const events = [{ id: "1", tripId: id, type: "arrive" as const, stopKey: "a|dropoff", at: "2026-10-19T16:45:00" }]
    const t = planDay(both, MON, { ...c2, trips, events }).trips[0]
    expect(t).toMatchObject({ status: "otw", startedAt: "16:35" })
    expect(t.stops[0]).toMatchObject({ checkIn: "16:50", checkOut: "16:52", manual: true, status: "done" })
  })
  it("a Both trip with nobody to bring back ends at the last home", () => {
    const t = planDay(both, MON, { ...c2, classes: [early] }).trips[0]
    expect(t.stops.map((s) => s.rider.leg)).toEqual(["dropoff"])
    expect(t.finish).toBe(t.stops[0].eta)
  })
  it("the driver app drives the live status: started = OTW (first stop on the way, then next), done stops get their real time", () => {
    const id = "x|" + MON
    const events = [
      { id: "1", tripId: id, type: "start" as const, at: "2026-10-19T16:31:00" },
      { id: "2", tripId: id, type: "done" as const, stopKey: "a|dropoff", at: "2026-10-19T16:55:00" },
    ]
    const t = planDay(both, MON, { ...c2, events }).trips[0]
    expect(t.status).toBe("otw")
    expect(t.stops[0]).toMatchObject({ status: "done", actual: "16:55" })
    expect(t.stops[1].status).toBe("otw")
    const done = planDay(both, MON, { ...c2, events: [...events, { id: "3", tripId: id, type: "finish" as const, at: "2026-10-19T17:20:00" }] }).trips[0]
    expect(done.status).toBe("done")
  })
  it("driver: the van's usual one, or another (staff or outside) for that day", () => {
    const staff = [{ id: "d1", name: "สมชาย ใจดี", nickname: "พี่ชาย", phone: "081", roles: ["driver"] }, { id: "d2", name: "บุญมี", nickname: "น้ามี", phone: "082", roles: ["driver"], vendor: true }] as never
    const withDriver = { ...both, vehicles: both.vehicles!.map((v) => (v.id === "v1" ? { ...v, driverId: "d1" } : v)) } as Branch
    expect(planDay(withDriver, MON, { ...c2, staff }).trips[0].driver?.nickname).toBe("พี่ชาย")
    const swapped = planDay(withDriver, MON, { ...c2, staff, trips: [{ id: "x|d", branchId: "b", roundId: "x", date: MON, driverId: "d2" }] }).trips[0]
    expect(swapped.driver).toMatchObject({ nickname: "น้ามี", vendor: true })
    expect(swapped.driverChanged).toBe(true)
  })
})
