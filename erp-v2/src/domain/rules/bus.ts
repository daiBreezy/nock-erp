// Liclass school bus (owner 2026-10-16): on the invoice the admin must see how far the home is from the branch (→ which
// bus fee type, or outside the area) and, for each class day, whether there is a bus run and whether it is full —
// so they can tell the parent straight away.
import { endTime, toMinutes, weekdayOf } from "../dates"
import type { BusAddOn, BusChange, BusRound, DateStr, Fee, ID, Invoice, Klass, TimeStr } from "../types"

type LatLng = { lat: number; lng: number }

/** Straight-line distance (haversine). The prototype has no road routing — Dev can swap in a road distance. */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371, rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export interface BusZone {
  /** the bus fee type that covers this distance (the nearest band) */
  fee: Fee | null
  /** farther than every band — the bus doesn't go there */
  outside: boolean
  /** the bus area's edge (largest band), null when no band has a distance set */
  maxKm: number | null
}

/** Which bus fee type fits a home `km` away: the first band (by distance) that reaches it. */
export function busZone(fees: Fee[], km: number): BusZone {
  const bands = fees.filter((f) => f.kind === "bus" && typeof f.maxKm === "number" && f.maxKm > 0).sort((a, b) => a.maxKm! - b.maxKm!)
  if (!bands.length) return { fee: null, outside: false, maxKm: null }
  const fee = bands.find((f) => km <= f.maxKm!) ?? null
  return { fee, outside: !fee, maxKm: bands[bands.length - 1].maxKm! }
}

/** how far a run may be from the class (pickup before the start / drop-off after the end) to count as "its" run */
export const BUS_WINDOW_MIN = 90

/** The run for a ride: pickup = the latest run arriving by the class start · drop-off = the first run leaving after the end. */
export function roundFor(rounds: BusRound[], kind: BusRound["kind"], date: DateStr, time: TimeStr): BusRound | null {
  const wd = weekdayOf(date), t = toMinutes(time)
  const fit = rounds.filter((r) => r.kind === kind && r.weekdays.includes(wd)).filter((r) => {
    const gap = kind === "pickup" ? t - toMinutes(r.time) : toMinutes(r.time) - t
    return gap >= 0 && gap <= BUS_WINDOW_MIN
  })
  if (!fit.length) return null
  return fit.sort((a, b) => (kind === "pickup" ? toMinutes(b.time) - toMinutes(a.time) : toMinutes(a.time) - toMinutes(b.time)))[0]
}

/** first class start + last class end that day, among the given classes (several courses on one day = one ride) */
export function rideTimes(classes: Klass[], classIds: ID[], date: DateStr): { start: TimeStr; end: TimeStr } | null {
  const wd = weekdayOf(date)
  const day = classes.filter((k) => classIds.includes(k.id) && k.weekday === wd)
  if (!day.length) return null
  const start = day.map((k) => k.start).sort()[0]
  const end = day.map((k) => endTime(k.start, k.minutes)).sort().reverse()[0]
  return { start, end }
}

export interface BusCtx {
  branchId: ID
  invoices: Invoice[]
  busAddOns: BusAddOn[]
  classes: Klass[]
  /** the invoice being edited — its own legs are counted from the draft, not the saved copy */
  excludeInvoiceId?: ID
}

/** Who is on a run that day: students riding (bus legs on live invoices + extra rides, minus cancelled rides) and the
 *  parents riding along with them (owner 2026-10-19: a parent = one seat, no charge). */
export function roundLoad(round: BusRound, date: DateStr, ctx: BusCtx): { students: Set<ID>; adults: Map<ID, number> } {
  const riders = new Set<ID>(), adults = new Map<ID, number>()
  const leg = (x: { pickup: boolean; dropoff: boolean }) => (round.kind === "pickup" ? x.pickup : x.dropoff)
  const mine = ctx.busAddOns.filter((a) => a.branchId === ctx.branchId && a.date === date && leg(a))
  // rides the parent cancelled (owner 2026-10-19) free the seat
  const off = new Set(mine.filter((a) => a.cancel).map((a) => a.studentId))
  const onRun = (studentId: ID, classIds: ID[]) => {
    const t = rideTimes(ctx.classes, classIds, date)
    return !!t && !!roundFor([round], round.kind, date, round.kind === "pickup" ? t.start : t.end)
  }
  const classesOf = (studentId: ID) => ctx.classes.filter((k) => k.studentIds.includes(studentId)).map((k) => k.id)
  for (const inv of ctx.invoices) {
    if (inv.branchId !== ctx.branchId || inv.status === "void" || inv.id === ctx.excludeInvoiceId || off.has(inv.studentId)) continue
    const l = inv.bus.find((x) => x.date === date)
    if (l && leg(l) && onRun(inv.studentId, inv.lines.flatMap((x) => x.classIds))) riders.add(inv.studentId)
  }
  for (const a of mine) {
    if (a.cancel || off.has(a.studentId) || !onRun(a.studentId, classesOf(a.studentId))) continue
    if (a.companion) adults.set(a.studentId, (adults.get(a.studentId) ?? 0) + 1)
    else riders.add(a.studentId)
  }
  return { students: riders, adults }
}

/** Students already riding a run on a date (no parents) — see roundLoad for the full seat count. */
export function roundRiders(round: BusRound, date: DateStr, ctx: BusCtx): Set<ID> {
  return roundLoad(round, date, ctx).students
}

export interface RoundCheck {
  round: BusRound | null
  /** seats taken by other students (this student not counted) */
  taken: number
  full: boolean
}

/** One ride (pickup or drop-off) on a class day: is there a run, how many seats are taken, is it full. */
export function checkRide(kind: BusRound["kind"], date: DateStr, times: { start: TimeStr; end: TimeStr } | null, rounds: BusRound[], ctx: BusCtx, studentId?: ID): RoundCheck {
  const round = times ? roundFor(rounds, kind, date, kind === "pickup" ? times.start : times.end) : null
  if (!round) return { round: null, taken: 0, full: false }
  const load = roundLoad(round, date, ctx)
  if (studentId) { load.students.delete(studentId); load.adults.delete(studentId) }
  // seats taken by everyone else — students + the parents riding with them
  const taken = load.students.size + [...load.adults.values()].reduce((a, n) => a + n, 0)
  return { round, taken, full: taken >= round.seats }
}

type Legs = { date: DateStr; pickup: boolean; dropoff: boolean }

/** a parent's bus request split into what to add and what to cancel, one entry per day (owner 2026-10-19) */
export function busChangeLegs(changes: BusChange[], what: "add" | "cancel"): Legs[] {
  return changes.map((c) => ({ date: c.date, pickup: c.pickup === what, dropoff: c.dropoff === what })).filter((l) => l.pickup || l.dropoff)
}

/**
 * Cancel rides (owner 2026-10-19). An extra ride not billed yet is simply dropped — nothing to pay. A ride that is
 * paid for (on an invoice) or already billed is taken off the bus with a `cancel` record: the bus doesn't come,
 * nothing is refunded (rule from 2026-09-30: fewer bus days are never refunded).
 */
export function cancelBusRides(studentId: ID, days: Legs[], addOns: BusAddOn[], invoices: Invoice[], make: (d: Legs) => BusAddOn): { addOns: BusAddOn[]; dropped: number; stopped: number } {
  const billed = new Set(invoices.filter((i) => i.status !== "void").flatMap((i) => (i.busExtras ?? []).map((x) => x.addOnId)))
  let list = [...addOns], dropped = 0, stopped = 0
  for (const d of days) {
    const rest = { pickup: d.pickup, dropoff: d.dropoff }
    // 1) unbilled extra rides that day — remove those legs (the charge goes with them)
    list = list.flatMap((a) => {
      if (a.studentId !== studentId || a.date !== d.date || a.cancel || billed.has(a.id)) return [a]
      const pickup = a.pickup && !rest.pickup, dropoff = a.dropoff && !rest.dropoff
      const gone = Number(a.pickup && rest.pickup) + Number(a.dropoff && rest.dropoff)
      if (!gone) return [a]
      dropped += gone
      if (a.pickup && rest.pickup) rest.pickup = false
      if (a.dropoff && rest.dropoff) rest.dropoff = false
      if (!pickup && !dropoff) return []
      const legs = Number(a.pickup) + Number(a.dropoff)
      return [{ ...a, pickup, dropoff, amount: legs ? Math.round((a.amount / legs) * (Number(pickup) + Number(dropoff))) : 0 }]
    })
    // 2) what's left was paid for — stop the bus, no refund
    if (rest.pickup || rest.dropoff) {
      stopped += Number(rest.pickup) + Number(rest.dropoff)
      list.push(make({ date: d.date, ...rest }))
    }
  }
  return { addOns: list, dropped, stopped }
}

/**
 * The legs a parent rides along (owner 2026-10-19): every leg the child rides that day after the request — what is
 * booked now, plus what is asked for, minus what is cancelled.
 */
export function companionLegs(changes: BusChange[], booked: (date: DateStr) => { pickup: boolean; dropoff: boolean }): Legs[] {
  return changes.filter((c) => c.adult).map((c) => {
    const now = booked(c.date)
    const after = (leg: "pickup" | "dropoff") => (c[leg] === "add" ? true : c[leg] === "cancel" ? false : now[leg])
    return { date: c.date, pickup: after("pickup"), dropoff: after("dropoff") }
  }).filter((l) => l.pickup || l.dropoff)
}
