// Transport (owner 2026-10-19, from v1 Bus Route — "ให้ Admin ไม่ต้องคิดให้ได้มากที่สุด"): who rides which run on a
// day is worked out, never typed. Riders come from invoices + extra / cancelled rides + parents riding along; each
// child goes to the run that fits their class time; stops are put in order and timed from the home pins; anything the
// admin has to look at becomes a warning. The admin only reorders, moves a child, swaps the van, or sends.
import { addDays, fromMinutes, toMinutes, weekdayOf } from "../dates"
import type { Branch, BusAddOn, BusRound, BusTrip, DateStr, Family, ID, Invoice, Klass, ParentRequest, Student, TimeStr, Vehicle } from "../types"
import { busZone, distanceKm, rideTimes, roundFor } from "./bus"
import { busDaysOf } from "./parent-view"

type LatLng = { lat: number; lng: number }

export interface Rider {
  studentId: ID
  nickname: string
  name: string
  grade: string
  familyId: ID | null
  familyName: string
  phone: string
  loc?: LatLng
  address?: string
  addressNote?: string
  /** a parent rides along (one more seat, no charge) */
  adult: boolean
  classStart: TimeStr
  classEnd: TimeStr
  /** put on this run by hand */
  pinned: boolean
}

export interface TripStop { rider: Rider; eta: TimeStr | null; km: number | null }

export type TripStatus = "draft" | "scheduled" | "sent" | "changed"

export interface TripPlan {
  id: string
  round: BusRound
  date: DateStr
  vehicle: Vehicle | null
  /** a stand-in van for this day */
  substitute: boolean
  seats: number
  used: number
  stops: TripStop[]
  /** pickup: leaves the depot · drop-off: leaves the branch */
  depart: TimeStr
  /** pickup: at the branch · drop-off: last home */
  finish: TimeStr
  km: number
  warnings: string[]
  /** what would be sent — compared with what was sent */
  key: string
  status: TripStatus
  /** auto-send: when it goes out by itself */
  autoAt?: TimeStr
  state?: BusTrip
}

export interface Unplaced { rider: Rider; kind: BusRound["kind"]; reason: string }

export interface DayPlan { date: DateStr; trips: TripPlan[]; unplaced: Unplaced[]; requests: ParentRequest[] }

export interface TransportCtx {
  students: Student[]
  families: Family[]
  classes: Klass[]
  invoices: Invoice[]
  busAddOns: BusAddOn[]
  trips: BusTrip[]
  parentRequests?: ParentRequest[]
  /** for status: a trip that left already is sent / done */
  now?: Date
}

/** prototype speeds — Dev swaps in Google's road ETA */
export const CITY_KMH = 22, DETOUR = 1.35, STOP_MIN = 3
export const AUTO_SEND_BEFORE_MIN = 60
const legMin = (km: number) => Math.round(((km * DETOUR) / CITY_KMH) * 60)

export const tripId = (roundId: ID, date: DateStr) => `${roundId}|${date}`

const bearing = (from: LatLng, to: LatLng) => Math.atan2(to.lng - from.lng, to.lat - from.lat)

/** nearest-neighbour from the branch: the drop-off order; a pickup runs it backwards (ends closest to school) */
export function orderStops(riders: Rider[], branch: LatLng | undefined, kind: BusRound["kind"]): Rider[] {
  const pinned = riders.filter((r) => r.loc), lost = riders.filter((r) => !r.loc)
  if (!branch) return riders
  const out: Rider[] = []
  let at = branch
  const left = [...pinned]
  while (left.length) {
    left.sort((a, b) => distanceKm(at, a.loc!) - distanceKm(at, b.loc!))
    const next = left.shift()!
    out.push(next)
    at = next.loc!
  }
  return [...(kind === "pickup" ? out.reverse() : out), ...lost]
}

/** times along the run: pickup = arrive at the branch by the run time (worked backwards), drop-off = leave at it */
export function timeStops(riders: Rider[], branch: LatLng | undefined, round: BusRound): { stops: TripStop[]; depart: TimeStr; finish: TimeStr; km: number } {
  const t0 = toMinutes(round.time)
  if (!branch) return { stops: riders.map((rider) => ({ rider, eta: null, km: null })), depart: round.time, finish: round.time, km: 0 }
  const pts = riders.map((r) => r.loc)
  if (round.kind === "dropoff") {
    let t = t0, at: LatLng = branch, total = 0
    const stops = riders.map((rider, i) => {
      const p = pts[i]
      if (!p) return { rider, eta: null, km: null }
      const km = distanceKm(at, p)
      total += km
      t += legMin(km) + (i ? STOP_MIN : 0)
      at = p
      return { rider, eta: fromMinutes(t), km: Math.round(distanceKm(branch, p) * 10) / 10 }
    })
    return { stops, depart: round.time, finish: fromMinutes(t), km: Math.round(total * 10) / 10 }
  }
  // pickup: from the last stop back to the branch
  const etas: (number | null)[] = new Array(riders.length).fill(null)
  let t = t0, at: LatLng = branch, total = 0
  for (let i = riders.length - 1; i >= 0; i--) {
    const p = pts[i]
    if (!p) continue
    const km = distanceKm(at, p)
    total += km
    t -= legMin(km) + STOP_MIN
    etas[i] = t
    at = p
  }
  const first = etas.find((x) => x !== null)
  return {
    stops: riders.map((rider, i) => ({ rider, eta: etas[i] === null ? null : fromMinutes(etas[i]!), km: pts[i] ? Math.round(distanceKm(branch, pts[i]!) * 10) / 10 : null })),
    depart: fromMinutes(first ?? t0), finish: round.time, km: Math.round(total * 10) / 10,
  }
}

/** split riders between runs leaving at the same time (several vans): by direction from the branch, seats in proportion */
function splitByDirection(riders: Rider[], runs: BusRound[], branch: LatLng | undefined): Map<ID, Rider[]> {
  const out = new Map(runs.map((r) => [r.id, [] as Rider[]]))
  const sorted = branch ? [...riders].sort((a, b) => (a.loc && b.loc ? bearing(branch, a.loc) - bearing(branch, b.loc) : a.loc ? -1 : 1)) : riders
  const totalSeats = runs.reduce((a, r) => a + r.seats, 0) || 1
  let i = 0
  runs.forEach((run, k) => {
    const take = k === runs.length - 1 ? sorted.length - i : Math.round((run.seats / totalSeats) * sorted.length)
    out.set(run.id, sorted.slice(i, i + take))
    i += take
  })
  return out
}

/** Everything the admin needs for one day at one branch. */
export function planDay(branch: Branch, date: DateStr, ctx: TransportCtx): DayPlan {
  const wd = weekdayOf(date)
  const runs = (branch.busRounds ?? []).filter((r) => r.weekdays.includes(wd))
  const vehicles = branch.vehicles ?? []
  const states = new Map(ctx.trips.filter((t) => t.date === date && t.branchId === branch.id).map((t) => [t.roundId, t]))
  const pinnedTo = new Map<string, ID>() // `${kind}|${studentId}` → roundId
  for (const run of runs) for (const sid of states.get(run.id)?.pinned ?? []) pinnedTo.set(`${run.kind}|${sid}`, run.id)
  const byRun = new Map<ID, Rider[]>(runs.map((r) => [r.id, []]))
  const unplaced: Unplaced[] = []
  const groups = new Map<string, Rider[]>() // same kind + time, several runs → split later

  for (const stu of ctx.students.filter((s) => s.branchId === branch.id && !s.archived)) {
    const legs = busDaysOf(stu.id, ctx.invoices, ctx.busAddOns).get(date)
    if (!legs || (!legs.pickup && !legs.dropoff)) continue
    const fam = ctx.families.find((f) => f.id === stu.familyId)
    const parent = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]
    const times = rideTimes(ctx.classes, ctx.classes.filter((k) => k.studentIds.includes(stu.id)).map((k) => k.id), date)
    const base = {
      studentId: stu.id, nickname: stu.nickname, name: stu.name, grade: stu.grade, familyId: stu.familyId, familyName: fam?.name ?? "",
      phone: parent?.phone ?? "", loc: fam?.location, address: fam?.address, addressNote: fam?.addressNote, adult: !!legs.adult,
      classStart: times?.start ?? "", classEnd: times?.end ?? "",
    }
    for (const kind of ["pickup", "dropoff"] as const) {
      if (!legs[kind]) continue
      const hand = pinnedTo.get(`${kind}|${stu.id}`)
      const rider: Rider = { ...base, pinned: !!hand }
      if (hand) { byRun.get(hand)!.push(rider); continue }
      if (!times) { unplaced.push({ rider, kind, reason: "ไม่มีคลาสวันนี้ — แต่มีรอบรถ" }); continue }
      const hit = roundFor(runs, kind, date, kind === "pickup" ? times.start : times.end)
      if (!hit) { unplaced.push({ rider, kind, reason: kind === "pickup" ? `ไม่มีรอบรับก่อนเรียน ${times.start}` : `ไม่มีรอบส่งหลังเลิก ${times.end}` }); continue }
      const same = runs.filter((r) => r.kind === kind && r.time === hit.time)
      if (same.length > 1) { const k = `${kind}|${hit.time}`; groups.set(k, [...(groups.get(k) ?? []), rider]) }
      else byRun.get(hit.id)!.push(rider)
    }
  }
  for (const [k, riders] of groups) {
    const [kind, time] = k.split("|")
    const same = runs.filter((r) => r.kind === kind && r.time === time)
    for (const [rid, list] of splitByDirection(riders, same, branch.location)) byRun.get(rid)!.push(...list)
  }

  const now = ctx.now
  const today = now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` : null
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0
  const trips = runs.map((round): TripPlan => {
    const state = states.get(round.id)
    const vehicle = vehicles.find((v) => v.id === (state?.vehicleId ?? round.vehicleId)) ?? null
    let riders = orderStops(byRun.get(round.id) ?? [], branch.location, round.kind)
    if (state?.order?.length) {
      const pos = new Map(state.order.map((id, i) => [id, i]))
      riders = [...riders].sort((a, b) => (pos.get(a.studentId) ?? 999) - (pos.get(b.studentId) ?? 999))
    }
    const timed = timeStops(riders, branch.location, round)
    const used = riders.reduce((n, r) => n + 1 + Number(r.adult), 0)
    const seats = round.seats
    const warnings: string[] = []
    if (used > seats) warnings.push(`เกินที่นั่ง ${used}/${seats}`)
    if (!vehicle) warnings.push("ยังไม่ได้เลือกรถ")
    const noPin = riders.filter((r) => !r.loc)
    if (noPin.length) warnings.push(`ไม่มีหมุดบ้าน ${noPin.length} คน`)
    const far = riders.filter((r) => r.loc && branch.location && busZone(branch.fees, distanceKm(branch.location, r.loc)).outside)
    if (far.length) warnings.push(`นอกพื้นที่รับส่ง ${far.length} คน`)
    const key = JSON.stringify([vehicle?.id ?? null, timed.stops.map((s) => `${s.rider.studentId}${s.rider.adult ? "+" : ""}`)])
    // auto-send: 60 min before it leaves, when nothing needs a look
    const autoAt = branch.busAutoSend && !warnings.length && riders.length ? fromMinutes(toMinutes(timed.depart) - AUTO_SEND_BEFORE_MIN) : undefined
    const autoDone = !!autoAt && !!today && (date < today || (date === today && nowMin >= toMinutes(autoAt)))
    const status: TripStatus = state?.sentAt ? (state.sentKey === key ? "sent" : "changed") : autoDone ? "sent" : autoAt ? "scheduled" : "draft"
    return { id: tripId(round.id, date), round, date, vehicle, substitute: !!state?.vehicleId && state.vehicleId !== round.vehicleId, seats, used, ...timed, warnings, key, status, autoAt, state }
  }).sort((a, b) => a.depart.localeCompare(b.depart))

  const requests = (ctx.parentRequests ?? []).filter((r) => r.kind === "bus" && r.status === "new" && (r.bus ?? []).some((x) => x.date === date)
    && ctx.students.some((s) => s.id === r.studentId && s.branchId === branch.id))
  return { date, trips, unplaced, requests }
}

/** the 7 days from a Monday — for the week grid */
export const weekDates = (monday: DateStr) => Array.from({ length: 7 }, (_, i) => addDays(monday, i))

/** what goes to the driver: plain text for LINE / copy (the printed sheet shows the same) */
export function driverText(trip: TripPlan, branchName: string, dateLabel: string): string {
  const head = `${trip.round.kind === "pickup" ? "รอบรับ" : "รอบส่ง"}${trip.round.name ? ` · ${trip.round.name}` : ""} · ${dateLabel}`
  const v = trip.vehicle ? `${trip.vehicle.name} (${trip.vehicle.plate}) · ${trip.vehicle.driverName}` : "ยังไม่ได้เลือกรถ"
  const lines = trip.stops.map((s, i) => {
    const map = s.rider.loc ? ` https://maps.google.com/?q=${s.rider.loc.lat},${s.rider.loc.lng}` : ""
    return `${i + 1}. ${s.eta ?? "--:--"} ${s.rider.nickname}${s.rider.adult ? " (+ผู้ปกครอง)" : ""} · ${s.rider.phone}${s.rider.addressNote ? ` · ${s.rider.addressNote}` : ""}${map}`
  })
  const ends = trip.round.kind === "pickup" ? `ถึง${branchName} ${trip.finish}` : `ออกจาก${branchName} ${trip.depart}`
  return [head, v, `ที่นั่ง ${trip.used}/${trip.seats}`, ...lines, ends].join("\n")
}
