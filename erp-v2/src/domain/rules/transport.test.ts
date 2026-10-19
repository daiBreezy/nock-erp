import { describe, expect, it } from "vitest"
import type { Branch, BusAddOn, BusTrip, Family, Invoice, Klass, Student } from "../types"
import { orderStops, planDay, timeStops, type Rider } from "./transport"

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
    const r = (id: string, lat: number): Rider => ({ studentId: id, nickname: id, name: id, grade: "", familyId: null, familyName: "", phone: "", loc: { lat, lng: 100.58 }, adult: false, classStart: "", classEnd: "", pinned: false })
    const riders = [r("far", 13.80), r("near", 13.74)]
    expect(orderStops(riders, B, "dropoff").map((x) => x.studentId)).toEqual(["near", "far"])
    expect(orderStops(riders, B, "pickup").map((x) => x.studentId)).toEqual(["far", "near"])
    const t = timeStops(orderStops(riders, B, "dropoff"), B, { id: "d", kind: "dropoff", weekdays: [1], time: "17:00", seats: 10 })
    expect(t.stops[0].eta! < t.stops[1].eta!).toBe(true)
  })
})
