import { describe, expect, it } from "vitest"
import type { BusAddOn, BusRound, Fee, Invoice, Klass } from "../types"
import { busChangeLegs, busZone, cancelBusRides, checkRide, companionLegs, distanceKm, rideTimes, roundFor } from "./bus"
import { pendingBusAddOns } from "./billing"
import { busDaysOf } from "./parent-view"

// 2026-10-19 is a Monday
const MON = "2026-10-19"
const fees: Fee[] = [
  { id: "far", kind: "bus", name: "โซนไกล", price: 200, maxKm: 10 },
  { id: "std", kind: "bus", name: "Standard", price: 150, maxKm: 5 },
  { id: "entry", kind: "entry", name: "ค่าแรกเข้า", price: 1500 },
]
const rounds: BusRound[] = [
  { id: "p1", kind: "pickup", weekdays: [1, 3], time: "15:30", seats: 2 },
  { id: "p0", kind: "pickup", weekdays: [1], time: "14:00", seats: 10 },
  { id: "d1", kind: "dropoff", weekdays: [1], time: "18:00", seats: 10 },
]
const klass = (id: string, start: string, minutes: number, studentIds: string[] = []) => ({ id, weekday: 1, start, minutes, studentIds }) as unknown as Klass
const inv = (id: string, studentId: string, classIds: string[], pickup: boolean, status: Invoice["status"] = "approved") =>
  ({ id, branchId: "b", studentId, status, lines: [{ classIds }], bus: [{ date: MON, pickup, dropoff: false }] }) as unknown as Invoice

describe("bus (owner 2026-10-16)", () => {
  it("distance from the branch picks the nearest fee band; past the last band = outside", () => {
    expect(distanceKm({ lat: 13.73, lng: 100.58 }, { lat: 13.73, lng: 100.58 })).toBe(0)
    expect(Math.round(distanceKm({ lat: 13.7, lng: 100.5 }, { lat: 13.8, lng: 100.5 }))).toBe(11)
    expect(busZone(fees, 3).fee?.id).toBe("std")
    expect(busZone(fees, 7).fee?.id).toBe("far")
    expect(busZone(fees, 12)).toMatchObject({ fee: null, outside: true, maxKm: 10 })
    expect(busZone([{ id: "x", kind: "bus", name: "x", price: 1 }], 50)).toMatchObject({ fee: null, outside: false, maxKm: null })
  })
  it("pickup = the latest run arriving by the class start; drop-off = the first run after it ends; none in the window = no run", () => {
    expect(roundFor(rounds, "pickup", MON, "16:00")?.id).toBe("p1")
    expect(roundFor(rounds, "pickup", MON, "15:00")?.id).toBe("p0")
    expect(roundFor(rounds, "pickup", MON, "19:00")).toBeNull()
    expect(roundFor(rounds, "dropoff", MON, "17:30")?.id).toBe("d1")
    expect(roundFor(rounds, "pickup", "2026-10-20", "16:00")).toBeNull() // Tuesday: no runs
  })
  it("ride times = first start, last end of that day's classes", () => {
    expect(rideTimes([klass("a", "16:00", 60), klass("b", "17:00", 90)], ["a", "b"], MON)).toEqual({ start: "16:00", end: "18:30" })
    expect(rideTimes([klass("a", "16:00", 60)], ["a"], "2026-10-20")).toBeNull()
  })
  it("a run is full when other students already fill its seats (void invoices + the student themself don't count)", () => {
    const classes = [klass("a", "16:00", 60, ["s3"])]
    const ctx = { branchId: "b", classes, busAddOns: [], invoices: [inv("i1", "s1", ["a"], true), inv("i2", "s2", ["a"], true), inv("i3", "s9", ["a"], true, "void")] }
    const t = { start: "16:00", end: "17:00" }
    expect(checkRide("pickup", MON, t, rounds, ctx, "s3")).toMatchObject({ taken: 2, full: true })
    expect(checkRide("pickup", MON, t, rounds, ctx, "s1")).toMatchObject({ taken: 1, full: false })
    expect(checkRide("pickup", MON, t, rounds, { ...ctx, excludeInvoiceId: "i2" }, "s3")).toMatchObject({ taken: 1, full: false })
    expect(checkRide("pickup", MON, t, rounds, { ...ctx, invoices: [], busAddOns: [{ id: "x", branchId: "b", studentId: "s3", date: MON, pickup: true, dropoff: false, busFeeId: null, amount: 150, createdBy: "", createdAt: "" }] })).toMatchObject({ taken: 1 })
    expect(checkRide("dropoff", MON, { start: "19:00", end: "20:00" }, rounds, ctx)).toMatchObject({ round: null })
  })
})

describe("parent bus requests (owner 2026-10-19)", () => {
  const ao = (id: string, date: string, pickup: boolean, dropoff: boolean, amount: number, extra: Partial<BusAddOn> = {}): BusAddOn =>
    ({ id, branchId: "b", studentId: "s1", date, pickup, dropoff, busFeeId: null, amount, createdBy: "u", createdAt: "", ...extra })
  const make = (d: { date: string; pickup: boolean; dropoff: boolean }) => ao(`c_${d.date}`, d.date, d.pickup, d.dropoff, 0, { cancel: true })

  it("splits a request into adds and cancels per day", () => {
    const ch = [{ date: "2026-10-20", start: "16:00", subjects: ["คณิต"], pickup: "add" as const, dropoff: "cancel" as const }, { date: "2026-10-21", start: "17:00", subjects: [], dropoff: "add" as const }]
    expect(busChangeLegs(ch, "add")).toEqual([{ date: "2026-10-20", pickup: true, dropoff: false }, { date: "2026-10-21", pickup: false, dropoff: true }])
    expect(busChangeLegs(ch, "cancel")).toEqual([{ date: "2026-10-20", pickup: false, dropoff: true }])
  })
  it("cancelling an unbilled extra ride drops it (and its charge); a paid ride gets a no-refund cancel record", () => {
    const addOns = [ao("x", "2026-10-20", true, true, 300)]
    const r1 = cancelBusRides("s1", [{ date: "2026-10-20", pickup: true, dropoff: false }], addOns, [], make)
    expect(r1).toMatchObject({ dropped: 1, stopped: 0 })
    expect(r1.addOns).toEqual([expect.objectContaining({ id: "x", pickup: false, dropoff: true, amount: 150 })])
    const paid = [{ id: "i", studentId: "s1", status: "paid", bus: [{ date: "2026-10-22", pickup: true, dropoff: true }], busExtras: [] }] as unknown as Invoice[]
    const r2 = cancelBusRides("s1", [{ date: "2026-10-22", pickup: true, dropoff: true }], addOns, paid, make)
    expect(r2).toMatchObject({ dropped: 0, stopped: 2 })
    // the bus no longer comes that day, and the cancel record is never charged
    expect(busDaysOf("s1", paid, r2.addOns).has("2026-10-22")).toBe(false)
    expect(pendingBusAddOns("s1", r2.addOns, paid).map((a) => a.id)).toEqual(["x"])
  })
})

describe("a parent riding along (owner 2026-10-19)", () => {
  const classes = [klass("a", "16:00", 60, ["s1", "s2"])]
  const comp = (studentId: string): BusAddOn => ({ id: `c_${studentId}`, branchId: "b", studentId, date: MON, pickup: true, dropoff: false, busFeeId: null, amount: 0, companion: true, createdBy: "", createdAt: "" })
  it("takes one more seat on the run, is never charged, and isn't a ride of the child", () => {
    const ctx = { branchId: "b", classes, invoices: [inv("i1", "s1", ["a"], true)], busAddOns: [comp("s1")] }
    // s1 + s1's parent = 2 of 2 seats on the 15:30 pick-up → full for anyone else
    expect(checkRide("pickup", MON, { start: "16:00", end: "17:00" }, rounds, ctx, "s2")).toMatchObject({ taken: 2, full: true })
    expect(pendingBusAddOns("s1", ctx.busAddOns, [])).toEqual([])
    expect(busDaysOf("s1", [{ ...inv("i1", "s1", ["a"], true), status: "paid" } as Invoice], ctx.busAddOns).get(MON)).toEqual({ pickup: true, dropoff: false, adult: true })
  })
  it("rides every leg the child rides that day after the request", () => {
    const booked = () => ({ pickup: true, dropoff: false })
    expect(companionLegs([{ date: MON, start: "16:00", subjects: [], dropoff: "add", adult: true }], booked)).toEqual([{ date: MON, pickup: true, dropoff: true }])
    expect(companionLegs([{ date: MON, start: "16:00", subjects: [], pickup: "cancel", adult: true }], booked)).toEqual([])
    expect(companionLegs([{ date: MON, start: "16:00", subjects: [], dropoff: "add" }], booked)).toEqual([])
  })
})
