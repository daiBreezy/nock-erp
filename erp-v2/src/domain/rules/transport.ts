// Transport (owner 2026-10-19, from v1 Bus Route — "ให้ Admin ไม่ต้องคิดให้ได้มากที่สุด"; layout from the owner's
// Bus Route ref): who rides which trip on a day is worked out, never typed. Riders come from invoices + extra /
// cancelled rides + parents riding along; each child's ride goes to the run that fits their class time (a Both run
// drops the class that ended, then brings the next one in); stops are ordered and timed from the home pins; the
// driver app reports when the van left, each stop, and when it got back. The admin reorders, moves, adds / removes,
// swaps the van or driver, cancels, approves & sends.
import { addDays, fromMinutes, toMinutes, weekdayOf } from "../dates"
import type { Branch, BusAddOn, BusLegKind, BusRound, BusTrip, BusZone, DateStr, Family, ID, Invoice, Klass, ParentRequest, Staff, Student, TimeStr, Vehicle } from "../types"
import { BOTH_LEAD_MIN, busZone, distanceKm, rideTimes, roundFor } from "./bus"
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
  /** the bus zone of the home (owner 2026-10-19) */
  zoneId: ID | null
  /** which way this ride goes — a Both trip carries both */
  leg: BusLegKind
}

/** what the driver app reported (owner 2026-10-19: "เชื่อมกับ Line หรือสร้าง Web/App ใหม่ สำหรับ Driver") */
/** owner 2026-10-19: per stop the driver checks in ("arrive" = ถึงแล้ว) then checks out ("done" = รับ / ส่งแล้ว, or no-show) */
export interface DriverEvent { id: string; tripId: string; type: "start" | "arrive" | "done" | "noshow" | "finish"; stopKey?: string; at: string; by?: ID }

/** here = checked in at the home, not checked out yet */
export type StopStatus = "waiting" | "otw" | "next" | "here" | "done" | "noshow" | "cancel"

export interface TripStop {
  /** `${studentId}|${leg}` */
  key: string
  rider: Rider
  /** estimate — worked out, or set by hand (`etaFixed`) */
  eta: TimeStr | null
  etaFixed: boolean
  km: number | null
  status: StopStatus
  /** check in = the van got to the home (actual) */
  checkIn: TimeStr | null
  /** check out = the child got on (pickup) / off (drop-off) — or the no-show was marked */
  checkOut: TimeStr | null
  /** the real times were typed in by the admin */
  manual: boolean
  /** the last real time (check out, else check in) */
  actual: TimeStr | null
  /** minutes late against the estimate (+), by the check in */
  late: number | null
}

/** draft → (scheduled to send itself) → sent = approved → otw (driver started) → done; changed = edited after sending */
export type TripStatus = "draft" | "scheduled" | "sent" | "changed" | "cancelled" | "otw" | "done"

export interface DriverInfo { id: ID | null; name: string; nickname: string; phone: string; photo?: string; vendor: boolean }

export interface TripPlan {
  id: string
  /** zones of the children on it */
  zoneIds: ID[]
  round: BusRound
  date: DateStr
  vehicle: Vehicle | null
  /** a stand-in van for this day */
  substitute: boolean
  driver: DriverInfo | null
  /** another driver that day */
  driverChanged: boolean
  seats: number
  used: number
  stops: TripStop[]
  /** children taken off this trip that day (shown faded) */
  cancelled: Rider[]
  /** leaves (the depot for a pickup, the branch otherwise) */
  depart: TimeStr
  /** back at the branch — every trip ends there (owner 2026-10-20: the driver returns the van keys after the last drop-off) */
  finish: TimeStr
  minutes: number
  km: number
  warnings: string[]
  /** what would be sent — compared with what was sent */
  key: string
  status: TripStatus
  /** auto-send: when it goes out by itself */
  autoAt?: TimeStr
  state?: BusTrip
  /** a one-off run for this day only */
  extra: boolean
  /** leaves at another time than usual that day */
  timeChanged: boolean
  /** the departure time was set by hand for the day */
  departFixed: boolean
  /** the admin put the stops in another order than the suggested one (farthest first, in to the branch) */
  orderCustom: boolean
  /** live: when the driver started / finished, and how late the trip runs (+min) */
  startedAt: TimeStr | null
  finishedAt: TimeStr | null
  late: number | null
}

export interface Unplaced { rider: Rider; kind: BusLegKind; reason: string }

export interface DayPlan { date: DateStr; trips: TripPlan[]; unplaced: Unplaced[]; requests: ParentRequest[] }

export interface TransportCtx {
  students: Student[]
  families: Family[]
  classes: Klass[]
  invoices: Invoice[]
  busAddOns: BusAddOn[]
  trips: BusTrip[]
  parentRequests?: ParentRequest[]
  staff?: Staff[]
  events?: DriverEvent[]
  /** for status: a trip that left already is sent / done */
  now?: Date
}

/** prototype speeds — Dev swaps in Google's road ETA */
export const CITY_KMH = 22, DETOUR = 1.35, STOP_MIN = 3
export const AUTO_SEND_BEFORE_MIN = 60
export const legMin = (km: number) => Math.round(((km * DETOUR) / CITY_KMH) * 60)

export const tripId = (roundId: ID, date: DateStr) => `${roundId}|${date}`
export const stopKey = (studentId: ID, leg: BusLegKind) => `${studentId}|${leg}`

const bearing = (from: LatLng, to: LatLng) => Math.atan2(to.lng - from.lng, to.lat - from.lat)
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }

// ---------- bus zones (owner 2026-10-19: several vans — "แบ่ง Zone ของนักเรียน เพื่อให้รถวิ่งรับได้สะดวก")

/** compass direction of a home from the branch, degrees clockwise from north (0–360) */
export function compassDeg(from: LatLng, to: LatLng): number {
  const d = (Math.atan2((to.lng - from.lng) * Math.cos((from.lat * Math.PI) / 180), to.lat - from.lat) * 180) / Math.PI
  return (d + 360) % 360
}
const inSector = (deg: number, from: number, to: number) => (from <= to ? deg >= from && deg < to : deg >= from || deg < to)

/** a home's zone: the one set by hand, else the slice its direction falls in */
export function zoneOf(fam: Pick<Family, "location" | "busZoneId"> | undefined, branch: LatLng | undefined, zones: BusZone[]): BusZone | null {
  if (!fam || !zones.length) return null
  const hand = fam.busZoneId ? zones.find((z) => z.id === fam.busZoneId) : undefined
  if (hand) return hand
  if (!fam.location || !branch) return null
  const deg = compassDeg(branch, fam.location)
  return zones.find((z) => inSector(deg, z.from, z.to)) ?? null
}

const COMPASS = ["เหนือ", "ตะวันออกเฉียงเหนือ", "ตะวันออก", "ตะวันออกเฉียงใต้", "ใต้", "ตะวันตกเฉียงใต้", "ตะวันตก", "ตะวันตกเฉียงเหนือ"]
export const ZONE_COLORS = ["sky", "amber", "emerald", "violet", "rose", "teal"]
/** "สายเหนือ" — the compass name of a direction */
export const zoneName = (deg: number) => `สาย${COMPASS[Math.round(deg / 45) % 8]}`

/**
 * Split homes into `count` zones (one per van) by direction: cut the circle at the `count` widest empty gaps between
 * homes, so each zone is one group of houses the van can sweep — boundaries sit in the middle of those gaps. Named by
 * the group's direction ("สายเหนือ"). Fewer homes than vans = equal slices.
 */
export function autoZones(degs: number[], count: number, vehicleIds: ID[] = []): Omit<BusZone, "id">[] {
  const k = Math.max(1, count)
  const sorted = [...new Set(degs.map((d) => Math.round(d * 10) / 10))].sort((a, b) => a - b)
  if (sorted.length < k || k === 1) {
    if (k === 1) return [{ name: "ทุกทิศ", color: ZONE_COLORS[0], from: 0, to: 360, vehicleId: vehicleIds[0] }]
    return Array.from({ length: k }, (_, i) => ({ name: zoneName((i + 0.5) * (360 / k)), color: ZONE_COLORS[i % ZONE_COLORS.length], from: (i * 360) / k, to: ((i + 1) * 360) / k, vehicleId: vehicleIds[i] }))
  }
  // gap after each home (to the next one round the circle)
  const gaps = sorted.map((d, i) => ({ i, size: (i === sorted.length - 1 ? sorted[0] + 360 : sorted[i + 1]) - d }))
  const cutsAfter = gaps.sort((a, b) => b.size - a.size).slice(0, k).map((g) => g.i).sort((a, b) => a - b)
  const mid = (i: number) => ((sorted[i] + (i === sorted.length - 1 ? sorted[0] + 360 : sorted[i + 1])) / 2) % 360
  return cutsAfter.map((c, n) => {
    const nextCut = cutsAfter[(n + 1) % k]
    const from = mid(c), to = mid(nextCut)
    // the homes between this cut and the next one
    const members: number[] = []
    for (let i = (c + 1) % sorted.length; ; i = (i + 1) % sorted.length) { members.push(sorted[i]); if (i === nextCut) break }
    const x = members.reduce((a, d) => a + Math.sin((d * Math.PI) / 180), 0), y = members.reduce((a, d) => a + Math.cos((d * Math.PI) / 180), 0)
    const dir = ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360
    return { name: zoneName(dir), color: ZONE_COLORS[n % ZONE_COLORS.length], from: Math.round(from), to: Math.round(to), vehicleId: vehicleIds[n] }
  })
}

/** nearest-neighbour from `from`: the drop-off order; a pickup runs it backwards (ends closest to school) */
/** homes this close in distance from the branch (km) count as the same ring — among them the nearest one goes next */
const RING_KM = 0.5

/**
 * The suggested queue (owner 2026-10-19: "Suggestion การจัดเรียงคิว จากไกลที่สุดก่อน และขยับเข้ามาเรื่อยๆ จนถึงสาขา"):
 * always the home farthest from the branch that is left, so the van only ever comes in towards the branch and the
 * last stop is the nearest one. Homes about as far out as each other (same ring) go in the order closest to the
 * current stop, so the van doesn't cross back and forth for a few hundred metres.
 */
export function inwardSweep(riders: Rider[], branch: LatLng): Rider[] {
  const fromBranch = (r: Rider) => distanceKm(branch, r.loc!)
  const left = [...riders].sort((a, b) => fromBranch(b) - fromBranch(a))
  const out: Rider[] = []
  let here: LatLng | null = null
  while (left.length) {
    const ring = left.filter((r) => fromBranch(r) >= fromBranch(left[0]) - RING_KM)
    const next: Rider = here ? ring.sort((a, b) => distanceKm(here!, a.loc!) - distanceKm(here!, b.loc!))[0] : ring[0]
    out.push(next)
    left.splice(left.indexOf(next), 1)
    here = next.loc!
  }
  return out
}

/** stop order (the system's suggestion — the admin can still reorder by hand): pickups farthest home first, sweeping
 *  in to the branch; drop-offs the same way backwards (nearest first, farthest last); a Both trip does its drop-offs
 *  first, then the pickups farthest-first on the way back. Homes with no pin go last. */
export function orderStops(riders: Rider[], branch: LatLng | undefined, kind: BusRound["kind"]): Rider[] {
  if (!branch) return riders
  const lost = riders.filter((r) => !r.loc), pinned = riders.filter((r) => r.loc)
  if (kind === "pickup") return [...inwardSweep(pinned, branch), ...lost]
  if (kind === "dropoff") return [...inwardSweep(pinned, branch).reverse(), ...lost]
  const drops = inwardSweep(pinned.filter((r) => r.leg === "dropoff"), branch).reverse()
  const picks = inwardSweep(pinned.filter((r) => r.leg === "pickup"), branch)
  return [...drops, ...picks, ...lost]
}

/** times along the run: pickup = arrive at the branch by the run time (worked backwards); drop-off / Both = leave the
 *  branch at it and go forward (a Both trip ends back at the branch) */
type Timed = { stops: { rider: Rider; eta: TimeStr | null; km: number | null; fixed?: boolean }[]; depart: TimeStr; finish: TimeStr; km: number }

/**
 * Times by hand (owner 2026-10-19, "Admin manual set time ที่คิวของเด็กๆ หรือการออกรถได้เสมอ"): a departure time and / or a
 * child's stop time set by the admin. The stops after a hand-set time follow on from it (drive + stop); the ones
 * before it keep the worked-out time; the end time moves with the last stop.
 */
export function timeStops(riders: Rider[], branch: LatLng | undefined, round: BusRound, manual?: { depart?: TimeStr; stops?: Record<string, TimeStr> }): Timed {
  const base = baseTimes(riders, branch, round)
  const fixed = manual?.stops ?? {}
  if (!branch || (!manual?.depart && !riders.some((r) => fixed[stopKey(r.studentId, r.leg)]))) return base
  let t: number | null = null, at: LatLng | null = null
  if (manual?.depart) { t = toMinutes(manual.depart); at = round.kind === "pickup" ? null : branch }
  const stops = base.stops.map((x) => {
    const f = fixed[stopKey(x.rider.studentId, x.rider.leg)]
    if (f) { t = toMinutes(f); at = x.rider.loc ?? at; return { ...x, eta: f, fixed: true } }
    if (t === null || !x.rider.loc) return x
    // from the depot a pickup run starts at its first home; from the branch / a home: drive (+ the stop before)
    if (at) t += legMin(distanceKm(at, x.rider.loc)) + (at === branch ? 0 : STOP_MIN)
    at = x.rider.loc
    return { ...x, eta: fromMinutes(t) }
  })
  // every trip ends back at the branch (owner 2026-10-20: "หลังจากส่งคนสุดท้าย จะต้องเป็นการกลับมาที่สาขา เพื่อคืนกุญแจรถ")
  const last = [...stops].reverse().find((x) => x.eta)
  const finish = !last ? base.finish : last.rider.loc ? fromMinutes(toMinutes(last.eta!) + legMin(distanceKm(last.rider.loc, branch)) + STOP_MIN) : base.finish
  const depart = manual?.depart ?? (round.kind === "pickup" ? stops.find((x) => x.eta)?.eta ?? base.depart : base.depart)
  return { stops, depart, finish, km: base.km }
}

function baseTimes(riders: Rider[], branch: LatLng | undefined, round: BusRound): Timed {
  const t0 = toMinutes(round.time)
  if (!branch) return { stops: riders.map((rider) => ({ rider, eta: null, km: null })), depart: round.time, finish: round.time, km: 0 }
  const fromBranch = (p?: LatLng) => (p ? Math.round(distanceKm(branch, p) * 10) / 10 : null)
  if (round.kind !== "pickup") {
    let t = t0, at: LatLng = branch, total = 0, first = true
    const stops = riders.map((rider) => {
      const p = rider.loc
      if (!p) return { rider, eta: null, km: null }
      const km = distanceKm(at, p)
      total += km
      t += legMin(km) + (first ? 0 : STOP_MIN)
      first = false
      at = p
      return { rider, eta: fromMinutes(t), km: fromBranch(p) }
    })
    // back to the branch after the last home — to return the van keys (owner 2026-10-20), and a Both trip brings the
    // next class in on the way
    if (at !== branch) { const km = distanceKm(at, branch); total += km; t += legMin(km) + STOP_MIN }
    return { stops, depart: round.time, finish: fromMinutes(t), km: Math.round(total * 10) / 10 }
  }
  const etas: (number | null)[] = new Array(riders.length).fill(null)
  let t = t0, at: LatLng = branch, total = 0
  for (let i = riders.length - 1; i >= 0; i--) {
    const p = riders[i].loc
    if (!p) continue
    const km = distanceKm(at, p)
    total += km
    t -= legMin(km) + STOP_MIN
    etas[i] = t
    at = p
  }
  const first = etas.find((x) => x !== null)
  return {
    stops: riders.map((rider, i) => ({ rider, eta: etas[i] === null ? null : fromMinutes(etas[i]!), km: fromBranch(rider.loc) })),
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

const driverOf = (staff: Staff[] | undefined, id: ID | null | undefined, v: Vehicle | null): DriverInfo | null => {
  const s = id ? staff?.find((x) => x.id === id) : undefined
  if (s) return { id: s.id, name: s.name, nickname: s.nickname, phone: s.phone ?? "", photo: s.photo, vendor: !!s.vendor }
  if (v?.driverName) return { id: null, name: v.driverName, nickname: v.driverName, phone: v.driverPhone, vendor: false }
  return null
}

/** Everything the admin needs for one day at one branch. */
export function planDay(branch: Branch, date: DateStr, ctx: TransportCtx): DayPlan {
  const wd = weekdayOf(date)
  const vehicles = branch.vehicles ?? []
  const states = new Map(ctx.trips.filter((t) => t.date === date && t.branchId === branch.id).map((t) => [t.roundId, t]))
  // the weekly runs that day (at that day's time when it was changed) + one-off runs added for the day
  const allRuns: BusRound[] = [
    ...(branch.busRounds ?? []).filter((r) => r.weekdays.includes(wd)).map((r) => { const t = states.get(r.id)?.time; return t ? { ...r, time: t } : r }),
    ...[...states.values()].filter((t) => t.extra).map((t) => ({ id: t.roundId, weekdays: [wd], ...t.extra! })),
  ]
  const isExtra = (r: BusRound) => !!states.get(r.id)?.extra
  // a run cancelled that day takes nobody — its children are matched to another run or left for the admin
  const runs = allRuns.filter((r) => !states.get(r.id)?.cancelled)
  const weekly = runs.filter((r) => !isExtra(r))
  const fits = (r: BusRound, leg: BusLegKind) => r.kind === leg || r.kind === "both"
  const pinnedTo = new Map<string, ID>() // `${leg}|${studentId}` → roundId
  for (const run of allRuns) for (const sid of states.get(run.id)?.pinned ?? []) for (const leg of ["pickup", "dropoff"] as const) if (fits(run, leg)) pinnedTo.set(`${leg}|${sid}`, run.id)
  const byRun = new Map<ID, Rider[]>(allRuns.map((r) => [r.id, []]))
  const unplaced: Unplaced[] = []
  const groups = new Map<string, Rider[]>() // same time, several runs → split later

  const riderBase = (stu: Student, legs: { adult?: boolean } | undefined) => {
    const fam = ctx.families.find((f) => f.id === stu.familyId)
    const parent = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]
    const times = rideTimes(ctx.classes, ctx.classes.filter((k) => k.studentIds.includes(stu.id)).map((k) => k.id), date)
    return {
      times,
      base: {
        studentId: stu.id, nickname: stu.nickname, name: stu.name, grade: stu.grade, familyId: stu.familyId, familyName: fam?.name ?? "",
        phone: parent?.phone ?? "", loc: fam?.location, address: fam?.address, addressNote: fam?.addressNote, adult: !!legs?.adult,
        classStart: times?.start ?? "", classEnd: times?.end ?? "", zoneId: zoneOf(fam, branch.location, branch.busZones ?? [])?.id ?? null,
      },
    }
  }
  const branchStudents = ctx.students.filter((s) => s.branchId === branch.id && !s.archived)
  for (const stu of branchStudents) {
    const legs = busDaysOf(stu.id, ctx.invoices, ctx.busAddOns).get(date)
    if (!legs || (!legs.pickup && !legs.dropoff)) continue
    const { times, base } = riderBase(stu, legs)
    for (const leg of ["pickup", "dropoff"] as const) {
      if (!legs[leg]) continue
      const hand = pinnedTo.get(`${leg}|${stu.id}`)
      const rider: Rider = { ...base, pinned: !!hand, leg }
      if (hand) {
        if (states.get(hand)?.cancelled) unplaced.push({ rider: { ...rider, pinned: false }, kind: leg, reason: `เที่ยว ${allRuns.find((r) => r.id === hand)?.time ?? ""} ยกเลิกวันนี้` })
        else byRun.get(hand)!.push(rider)
        continue
      }
      if (!times) { unplaced.push({ rider, kind: leg, reason: "ไม่มีคลาสวันนี้ — แต่มีรอบรถ" }); continue }
      // one-off runs only take children put on them by hand
      const hit = roundFor(weekly, leg, date, leg === "pickup" ? times.start : times.end)
      if (!hit) {
        const off = roundFor(allRuns.filter((r) => !isExtra(r)), leg, date, leg === "pickup" ? times.start : times.end)
        unplaced.push({ rider, kind: leg, reason: off ? `เที่ยว ${off.time} ยกเลิกวันนี้` : leg === "pickup" ? `ไม่มีรอบรับก่อนเรียน ${times.start}` : `ไม่มีรอบส่งหลังเลิก ${times.end}` })
        continue
      }
      const same = weekly.filter((r) => fits(r, leg) && r.kind === hit.kind && r.time === hit.time)
      if (same.length > 1) { const k = `${hit.kind}|${hit.time}`; groups.set(k, [...(groups.get(k) ?? []), rider]) }
      else byRun.get(hit.id)!.push(rider)
    }
  }
  // several vans at the same time: each child rides their zone's van; children with no zone (or a zone whose van
  // isn't out then) are split by direction
  const zones = branch.busZones ?? []
  for (const [k, riders] of groups) {
    const [kind, time] = k.split("|")
    const same = weekly.filter((r) => r.kind === kind && r.time === time)
    const rest: Rider[] = []
    for (const rider of riders) {
      const vid = zones.find((z) => z.id === rider.zoneId)?.vehicleId
      const run = vid ? same.find((r) => r.vehicleId === vid) : undefined
      if (run) byRun.get(run.id)!.push(rider)
      else rest.push(rider)
    }
    if (rest.length) for (const [rid, list] of splitByDirection(rest, same, branch.location)) byRun.get(rid)!.push(...list)
  }
  // children whose ride that day was cancelled — shown faded on the trip they'd normally be on
  const cancelledOn = new Map<ID, Rider[]>()
  for (const a of ctx.busAddOns.filter((x) => x.cancel && x.date === date && x.branchId === branch.id)) {
    const stu = branchStudents.find((s) => s.id === a.studentId)
    if (!stu) continue
    const { times, base } = riderBase(stu, undefined)
    for (const leg of ["pickup", "dropoff"] as const) {
      if (!a[leg] || !times) continue
      const run = roundFor(weekly, leg, date, leg === "pickup" ? times.start : times.end)
      if (run) cancelledOn.set(run.id, [...(cancelledOn.get(run.id) ?? []), { ...base, pinned: false, leg }])
    }
  }

  const now = ctx.now
  const today = now ? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}` : null
  const nowMin = now ? now.getHours() * 60 + now.getMinutes() : 0
  const trips = allRuns.map((round): TripPlan => {
    const id = tripId(round.id, date)
    const state = states.get(round.id)
    const vehicle = vehicles.find((v) => v.id === (state?.vehicleId ?? round.vehicleId)) ?? null
    const driver = driverOf(ctx.staff, state?.driverId ?? vehicle?.driverId, vehicle)
    let riders = orderStops(byRun.get(round.id) ?? [], branch.location, round.kind)
    const suggested = riders.map((r) => stopKey(r.studentId, r.leg)).join()
    if (state?.order?.length) {
      const pos = new Map(state.order.map((x, i) => [x, i]))
      // order holds stop keys (or plain student ids from before Both trips)
      const at = (r: Rider) => pos.get(stopKey(r.studentId, r.leg)) ?? pos.get(r.studentId) ?? 999
      riders = [...riders].sort((a, b) => at(a) - at(b))
    }
    const orderCustom = riders.map((r) => stopKey(r.studentId, r.leg)).join() !== suggested
    const timed = timeStops(riders, branch.location, round, { depart: state?.departAt, stops: state?.stopTimes })
    // seats: a Both trip carries its drop-offs out and its pickups back — the fuller half counts
    const load = (rs: Rider[]) => rs.reduce((n, r) => n + 1 + Number(r.adult), 0)
    const used = round.kind === "both" ? Math.max(load(riders.filter((r) => r.leg === "dropoff")), load(riders.filter((r) => r.leg === "pickup"))) : load(riders)
    const seats = round.seats
    const warnings: string[] = []
    if (used > seats) warnings.push(`เกินที่นั่ง ${used}/${seats}`)
    if (!vehicle) warnings.push("ยังไม่ได้เลือกรถ")
    if (!driver && vehicle) warnings.push("ยังไม่มีคนขับ")
    const noPin = riders.filter((r) => !r.loc)
    if (noPin.length) warnings.push(`ไม่มีหมุดบ้าน ${noPin.length} คน`)
    const far = riders.filter((r) => r.loc && branch.location && busZone(branch.fees, distanceKm(branch.location, r.loc)).outside)
    if (far.length) warnings.push(`นอกพื้นที่รับส่ง ${far.length} คน`)
    if (round.kind === "both") {
      const firstClass = riders.filter((r) => r.leg === "pickup" && r.classStart).map((r) => r.classStart).sort()[0]
      if (firstClass && timed.finish > firstClass) warnings.push(`ถึงสาขา ${timed.finish} หลังคลาสเริ่ม ${firstClass}`)
    }
    const key = JSON.stringify([vehicle?.id ?? null, driver?.id ?? driver?.name ?? null, timed.stops.map((s) => `${stopKey(s.rider.studentId, s.rider.leg)}${s.rider.adult ? "+" : ""}`)])
    // live, from the driver app — real times the admin typed in win
    const evs = (ctx.events ?? []).filter((e) => e.tripId === id).sort((a, b) => a.at.localeCompare(b.at))
    const man = state?.actuals
    const startAt = man?.start ?? (evs.find((e) => e.type === "start") ? hhmm(evs.find((e) => e.type === "start")!.at) : null)
    const finishAt = man?.finish ?? (evs.find((e) => e.type === "finish") ? hhmm(evs.find((e) => e.type === "finish")!.at) : null)
    const anyStop = !!Object.keys(man?.stops ?? {}).length || evs.some((e) => e.stopKey)
    const running = !!(startAt || anyStop) && !finishAt
    let seenNext = false, seenOtw = false
    const stops: TripStop[] = timed.stops.map((x) => {
      const k = stopKey(x.rider.studentId, x.rider.leg)
      const m = man?.stops?.[k]
      const arrive = evs.filter((e) => e.stopKey === k && e.type === "arrive").at(-1)
      const out = evs.filter((e) => e.stopKey === k && (e.type === "done" || e.type === "noshow")).at(-1)
      const checkIn = m?.in ?? (arrive ? hhmm(arrive.at) : null)
      const checkOut = m?.out ?? (out ? hhmm(out.at) : null)
      const noshow = m ? !!m.noshow : out?.type === "noshow"
      const real = checkIn ?? checkOut
      const late = real && x.eta ? toMinutes(real) - toMinutes(x.eta) : null
      let status: StopStatus = "waiting"
      if (checkOut || (m?.noshow)) status = noshow ? "noshow" : "done"
      else if (checkIn) { status = "here"; seenOtw = true }
      else if (running) { status = !seenOtw ? "otw" : !seenNext ? "next" : "waiting"; if (seenOtw) seenNext = true; seenOtw = true }
      return { key: k, rider: x.rider, eta: x.eta, etaFixed: !!x.fixed, km: x.km, status, checkIn, checkOut, manual: !!m, actual: checkOut ?? checkIn, late }
    })
    const lateNow = stops.filter((x) => x.late !== null).at(-1)?.late ?? null
    const autoAt = branch.busAutoSend && !warnings.length && riders.length ? fromMinutes(toMinutes(timed.depart) - AUTO_SEND_BEFORE_MIN) : undefined
    const autoDone = !!autoAt && !!today && (date < today || (date === today && nowMin >= toMinutes(autoAt)))
    const status: TripStatus = state?.cancelled ? "cancelled" : finishAt ? "done" : startAt || anyStop ? "otw"
      : state?.sentAt ? (state.sentKey === key ? "sent" : "changed") : autoDone ? "sent" : autoAt ? "scheduled" : "draft"
    const zoneIds = [...new Set(riders.map((r) => r.zoneId).filter((z): z is ID => !!z))]
    const minutes = Math.max(0, toMinutes(timed.finish) - toMinutes(timed.depart))
    return {
      id, zoneIds, extra: !!state?.extra, timeChanged: !!state?.time, round, date, vehicle, substitute: !!state?.vehicleId && state.vehicleId !== round.vehicleId,
      driver, driverChanged: !!state?.driverId && state.driverId !== vehicle?.driverId, seats, used, stops, cancelled: cancelledOn.get(round.id) ?? [],
      depart: timed.depart, finish: timed.finish, minutes, km: timed.km, warnings, key, status, autoAt, state,
      departFixed: !!state?.departAt, orderCustom, startedAt: startAt, finishedAt: finishAt, late: lateNow,
    }
  }).sort((a, b) => a.depart.localeCompare(b.depart))

  const requests = (ctx.parentRequests ?? []).filter((r) => r.kind === "bus" && r.status === "new" && (r.bus ?? []).some((x) => x.date === date)
    && ctx.students.some((s) => s.id === r.studentId && s.branchId === branch.id))
  return { date, trips, unplaced, requests }
}

/** the 7 days from a Monday — for the week */
export const weekDates = (monday: DateStr) => Array.from({ length: 7 }, (_, i) => addDays(monday, i))

export const KIND_SHORT: Record<BusRound["kind"], string> = { pickup: "P", dropoff: "D", both: "Both" }
export { BOTH_LEAD_MIN }

/** what goes to the driver: plain text for LINE / copy (the printed sheet shows the same) */
export function driverText(trip: TripPlan, branchName: string, dateLabel: string, appUrl?: string): string {
  const kind = trip.round.kind === "pickup" ? "รอบรับ" : trip.round.kind === "dropoff" ? "รอบส่ง" : "รอบรับ-ส่ง"
  const head = `${kind} ${trip.round.time}${trip.round.name ? ` · ${trip.round.name}` : ""} · ${dateLabel}`
  const v = trip.vehicle ? `${trip.vehicle.name} (${trip.vehicle.plate}) · ${trip.driver?.nickname ?? ""}` : "ยังไม่ได้เลือกรถ"
  const lines = trip.stops.map((s, i) => {
    const map = s.rider.loc ? ` https://maps.google.com/?q=${s.rider.loc.lat},${s.rider.loc.lng}` : ""
    return `${i + 1}. ${s.eta ?? "--:--"} ${s.rider.leg === "pickup" ? "รับ" : "ส่ง"} ${s.rider.nickname}${s.rider.adult ? " (+ผู้ปกครอง)" : ""} · ${s.rider.phone}${s.rider.addressNote ? ` · ${s.rider.addressNote}` : ""}${map}`
  })
  const starts = trip.round.kind === "pickup" ? [] : [`ออกจาก${branchName} ${trip.depart}`]
  const ends = `กลับถึง${branchName} ${trip.finish} — คืนกุญแจรถ`
  return [head, v, `ที่นั่ง ${trip.used}/${trip.seats}`, ...starts, ...lines, ends, ...(appUrl ? [`แอปคนขับ: ${appUrl}`] : [])].join("\n")
}
