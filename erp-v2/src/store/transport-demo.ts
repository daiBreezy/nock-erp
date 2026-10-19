import { addDays, toDateStr } from "../domain/dates"
import { autoZones, compassDeg } from "../domain/rules/transport"
import type { Branch, BusAddOn, BusRound, Entitlement, Family, Invoice, Klass, Session, Staff, Student, Vehicle } from "../domain/types"

type Db = { branches: Branch[]; classes: Klass[]; sessions: Session[]; families: Family[]; students: Student[]; entitlements: Entitlement[]; invoices: Invoice[]; busAddOns: BusAddOn[]; staff: Staff[] }

const NOTES = ["หมู่บ้านประตูสีเทา ซอยแรกซ้ายมือ", "คอนโดตรงข้าม 7-Eleven รอที่ล็อบบี้", "บ้านเลขที่ 18 รั้วสีขาว", "ซอยตัน บ้านหลังสุดท้าย", "ตึกแถวชั้นล่างร้านกาแฟ"]

interface Setup {
  location: { lat: number; lng: number }
  vans: Vehicle[]
  /** runs to add when the branch has none (each van gets its own copy) */
  runs?: Omit<BusRound, "id" | "vehicleId">[]
  fees?: Branch["fees"]
  /** where the homes are: directions (degrees) the families live in, and how far */
  spread: (i: number) => { deg: number; km: number }
  zones: boolean
  /** drivers as staff (owner 2026-10-19 ref): [van id or null for a stand-in, nickname, name, phone, outsource] */
  drivers: [string | null, string, string, string, boolean?][]
  /** turn one run into a Both trip (drop off, then pick up the next class) */
  both?: { ids: string[]; time: string }
  /** the branch already has runs for its first van: give every other van the same runs (several vans leaving together) */
  twinRuns?: boolean
}

/**
 * Owner 2026-10-19 (Transport, "วาง Case สำหรับรถมากกว่า 1 คัน"): Liclass branches get vans and children who pay for
 * the bus — homes pinned around the branch, rides on a paid invoice of their own — so the transport page shows real
 * days. Thonglor: 1 van (v1: TL-01 น้าสมชาย). Sriracha: 2 vans leaving at the same times (v1: SR-01 น้าเอื้อง · SR-02
 * น้าเบ้ง) with homes north and south of the branch, split into zones "สายเหนือ → คัน 1 · สายใต้ → คัน 2". Runs after
 * every reseed.
 */
export function withTransportDemo<T extends Db>(db: T, now = new Date()): T {
  let out = db
  const thl = db.branches.find((b) => b.id === "br_thl" && b.location && (b.busRounds ?? []).length)
  if (thl) out = setupBranch(out, thl.id, {
    // owner 2026-10-19 ("จำลอง ว่ามีรถ 2 คัน และมี Zone 2 Zone · รอบรถที่ทั้งไปรับ และไปส่ง"): 2 vans leaving together,
    // 2 zones, and Saturday 12:05 as a Both trip (drops the 10:00–12:00 class, brings in the 13:00 one)
    location: thl.location!, zones: true, twinRuns: true,
    drivers: [["veh_tl01", "น้าสมชาย", "สมชาย ใจดี", "083-456-7890"], ["veh_tl02", "น้าชัย", "ชัย ขยันดี", "086-222-3344"]],
    vans: [
      { id: "veh_tl01", name: "รถตู้ 1", plate: "ฮข 2210", seats: 10, driverName: "น้าสมชาย", driverPhone: "083-456-7890", active: true },
      { id: "veh_tl02", name: "รถตู้ 2", plate: "ฮข 3318", seats: 10, driverName: "น้าชัย", driverPhone: "086-222-3344", active: true },
    ],
    both: { ids: ["br6", "br6_v2"], time: "12:05" },
    spread: (i) => ({ deg: (i * 137.5) % 360, km: 1.5 + ((i * 7) % 11) * 0.5 }),
  }, now)
  const src = db.branches.find((b) => b.id === "br_src")
  if (src) out = setupBranch(out, src.id, {
    location: src.location ?? { lat: 13.1737, lng: 100.9311 }, zones: true,
    // the owner: "พี่เบ้งอาจจะลากลับบ้าน" — an outsource driver stands in on those days
    drivers: [["veh_sr01", "น้าเอื้อง", "เอื้อง ศรีสุข", "081-234-5678"], ["veh_sr02", "น้าเบ้ง", "เบ้ง มั่นคง", "082-345-6789"], [null, "พี่ต้อม", "ต้อม รถเช่าชลบุรี", "089-111-2233", true]],
    // Saturday: both vans leave at 12:15 — drop off the morning class, then bring in the afternoon ones
    both: { ids: ["bro_br_src_3_0", "bro_br_src_3_1"], time: "12:15" },
    vans: [
      { id: "veh_sr01", name: "รถตู้ 1", plate: "756", seats: 10, driverName: "น้าเอื้อง", driverPhone: "081-234-5678", active: true },
      { id: "veh_sr02", name: "รถตู้ 2", plate: "1719", seats: 10, driverName: "น้าเบ้ง", driverPhone: "082-345-6789", active: true },
    ],
    // both vans run at the same times — zones decide who rides which
    runs: [
      { kind: "pickup", weekdays: [1, 2, 3, 4, 5], time: "15:30", seats: 10 }, { kind: "dropoff", weekdays: [1, 2, 3, 4, 5], time: "17:30", seats: 10 },
      { kind: "pickup", weekdays: [6], time: "09:30", seats: 10 }, { kind: "dropoff", weekdays: [6], time: "12:30", seats: 10 },
    ],
    fees: [{ id: "fee_bus_src_std", kind: "bus", name: "Standard", price: 100, maxKm: 8 }, { id: "fee_bus_src_far", kind: "bus", name: "โซนไกล", price: 150, maxKm: 15 }],
    // half the families north of the branch (Bang Phra side), half south (Surasak / Nong Kham side)
    spread: (i) => ({ deg: i % 2 ? 165 + ((i * 11) % 40) : 335 + ((i * 13) % 45), km: 3 + ((i * 5) % 9) }),
  }, now)
  return out
}

function setupBranch<T extends Db>(db: T, branchId: string, o: Setup, now: Date): T {
  const today = toDateStr(now)
  const branch = db.branches.find((b) => b.id === branchId)!
  // drivers: one Staff each (role Driver, own app link) — the van's regular driver points at them
  const drivers: Staff[] = o.drivers.filter(([, nick]) => !db.staff.some((x) => x.id === `stf_drv_${branchId}_${nick}`)).map(([, nickname, name, phone, vendor]) => ({
    id: `stf_drv_${branchId}_${nickname}`, name, nickname, phone, vendor: vendor || undefined, roles: ["driver"], branchIds: [branchId], subjects: [], active: true, canLogin: false,
    driverToken: `drv_demo_${branchId}_${o.drivers.findIndex((d) => d[1] === nickname)}`,
  }))
  const have = branch.vehicles?.length ? branch.vehicles : o.vans
  const vans = [...have, ...o.vans.filter((v) => !have.some((h) => h.id === v.id))].map((v) => {
    const d = o.drivers.find(([vid]) => vid === v.id)
    return v.driverId || !d ? v : { ...v, driverId: `stf_drv_${branchId}_${d[1]}` }
  })
  const runs0: BusRound[] = (branch.busRounds ?? []).length
    ? (branch.busRounds ?? []).map((r) => ({ ...r, vehicleId: r.vehicleId ?? vans[0].id }))
    : (o.runs ?? []).flatMap((r, i) => vans.map((v, j) => ({ ...r, id: `bro_${branchId}_${i}_${j}`, vehicleId: v.id, name: vans.length > 1 ? v.name : undefined })))
  // the other vans run the first van's runs too (same times — zones decide who rides which)
  const runs1 = !o.twinRuns || vans.length < 2 ? runs0 : [...runs0, ...runs0.filter((r) => r.vehicleId === vans[0].id).flatMap((r) => vans.slice(1).map((v, j) => ({ ...r, id: `${r.id}_v${j + 2}`, vehicleId: v.id, seats: Math.max(r.seats, v.seats - 2) })))
    .filter((r) => !runs0.some((x) => x.id === r.id))].map((r) => (vans.length > 1 && r.name && !r.name.includes(vans.find((v) => v.id === r.vehicleId)?.name ?? "") ? { ...r, name: `${r.name} · ${vans.find((v) => v.id === r.vehicleId)?.name ?? ""}` } : r))
  const runs = o.both && !runs1.some((r) => r.kind === "both") ? runs1.map((r) => (o.both!.ids.includes(r.id) ? { ...r, kind: "both" as const, time: o.both!.time, name: r.name?.replace(/^ส่ง/, "รับ-ส่ง") } : r)) : runs1
  const fees = branch.fees.some((f) => f.kind === "bus") ? branch.fees : [...(o.fees ?? []), ...branch.fees]
  // children in a weekly class at this branch, with a package covering today
  const riders = db.students.filter((s) => s.branchId === branchId && !s.archived && !s.id.startsWith("stu_demo_")
    && db.classes.some((k) => k.active && !k.periodId && k.studentIds.includes(s.id))
    && db.entitlements.some((e) => e.studentId === s.id && e.from <= today && e.to >= today)).slice(0, 12)
  const pins = new Map<string, { lat: number; lng: number }>()
  riders.forEach((s, i) => {
    // one family left without a pin at Thonglor (shows the warning)
    if (!s.familyId || pins.has(s.familyId) || (!o.zones && i === riders.length - 1)) return
    const { deg, km } = o.spread(i), a = (deg * Math.PI) / 180
    pins.set(s.familyId, { lat: o.location.lat + (km / 111) * Math.cos(a), lng: o.location.lng + (km / 108) * Math.sin(a) })
  })
  const families = db.families.map((f) => (f.location || !pins.has(f.id) ? f : { ...f, location: pins.get(f.id), addressNote: f.addressNote ?? NOTES[f.id.length % NOTES.length] }))
  // zones: one per van, split by where the homes are
  const homes = riders.map((s) => families.find((f) => f.id === s.familyId)?.location).filter((l): l is { lat: number; lng: number } => !!l)
  const busZones = o.zones && !(branch.busZones ?? []).length
    ? autoZones(homes.map((h) => compassDeg(o.location, h)), vans.length, vans.map((v) => v.id)).map((z, i) => ({ ...z, id: `zone_${branchId}_${i}` }))
    : branch.busZones
  const rate = fees.find((f) => f.kind === "bus")?.price ?? branch.busFeePerLeg
  const busFeeId = fees.find((f) => f.kind === "bus")?.id ?? null
  const yymmdd = `${String((now.getFullYear() + 543) % 100).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}01`
  // each child's bus is on a paid invoice of their own ("ค่ารถรับส่ง") — the class dates for 6 weeks around today
  const busInvoices: Invoice[] = riders.flatMap((s, i): Invoice[] => {
    const classIds = db.classes.filter((k) => k.studentIds.includes(s.id)).map((k) => k.id)
    const dates = [...new Set(db.sessions.filter((x) => x.classId && classIds.includes(x.classId) && !x.cancelled && x.date >= addDays(today, -7) && x.date <= addDays(today, 35)).map((x) => x.date))].sort()
    // most both ways, some one way only
    const legs = dates.map((date) => ({ date, pickup: i % 5 !== 1, dropoff: i % 5 !== 0 }))
    if (!legs.length || db.invoices.some((x) => x.id === `inv_bus_${s.id}`)) return []
    const amount = legs.reduce((n, l) => n + Number(l.pickup) + Number(l.dropoff), 0) * rate
    const no = `${yymmdd}-02-${branch.branchNo}-9${String(i).padStart(3, "0")}`
    const at = `${addDays(today, -9)}T10:00:00.000Z`
    return [{
      id: `inv_bus_${s.id}`, branchId, studentId: s.id, number: no, lines: [], bus: legs, busFeeId, bookFee: 0, advance: [], concession: null,
      noteToParent: "ค่ารถรับส่ง", status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: at, approvedBy: "u_nock", sentAt: at, delivery: "delivered", receiptNumber: no,
      payments: [{ id: `pay_bus_${s.id}`, amount, method: "transfer", reference: "", recordedBy: "u_ploy", recordedAt: at, confirmedBy: "u_nock" }],
    }]
  })
  const invoices = [...db.invoices, ...busInvoices]
  const ids = new Set(riders.map((s) => s.id))
  // a parent rides along with the third child on their next class day
  const third = riders[2]
  const thirdDay = third && invoices.find((x) => x.studentId === third.id && x.bus.length)?.bus.find((l) => l.date >= today)
  const companions: BusAddOn[] = third && thirdDay && !db.busAddOns.some((a) => a.id === `ba_demo_parent_${branchId}`)
    ? [{ id: `ba_demo_parent_${branchId}`, branchId, studentId: third.id, date: thirdDay.date, pickup: thirdDay.pickup, dropoff: thirdDay.dropoff, busFeeId: null, amount: 0, companion: true, note: "ผู้ปกครองไปด้วย", createdBy: "u_ploy", createdAt: now.toISOString() }]
    : []
  return {
    ...db, families, invoices,
    branches: db.branches.map((b) => (b.id !== branchId ? b : { ...b, location: b.location ?? o.location, vehicles: vans, busRounds: runs, fees, busZones })),
    students: db.students.map((s) => (ids.has(s.id) ? { ...s, usesBus: true } : s)),
    busAddOns: [...db.busAddOns, ...companions],
    staff: [...db.staff, ...drivers],
  }
}
