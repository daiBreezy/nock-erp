import { addDays, toDateStr } from "../domain/dates"
import type { Branch, BusAddOn, Entitlement, Family, Invoice, Klass, Session, Student } from "../domain/types"

type Db = { branches: Branch[]; classes: Klass[]; sessions: Session[]; families: Family[]; students: Student[]; entitlements: Entitlement[]; invoices: Invoice[]; busAddOns: BusAddOn[] }

const NOTES = ["หมู่บ้านประตูสีเทา ซอยแรกซ้ายมือ", "คอนโดตรงข้าม 7-Eleven รอที่ล็อบบี้", "บ้านเลขที่ 18 รั้วสีขาว", "ซอยตัน บ้านหลังสุดท้าย", "ตึกแถวชั้นล่างร้านกาแฟ"]

/**
 * Owner 2026-10-19 (Transport page, "Build Page ขึ้นมาเลย"): the Liclass branch gets a van (v1 had TL-01 · น้าสมชาย ·
 * 10 seats) and about a dozen children who pay for the bus — their homes pinned around the branch, their rides on
 * the invoice that covers today — so the transport page has a real day to show. Runs after every reseed.
 */
export function withTransportDemo<T extends Db>(db: T, now = new Date()): T {
  const today = toDateStr(now)
  const branch = db.branches.find((b) => b.brand === "liclass" && (b.busRounds ?? []).length && b.location)
  if (!branch || !branch.location) return db
  const van = { id: "veh_tl01", name: "รถตู้ 1", plate: "ฮข 2210", seats: 10, driverName: "น้าสมชาย", driverPhone: "083-456-7890", active: true }
  const branches = db.branches.map((b) => (b.id !== branch.id ? b : {
    ...b, vehicles: b.vehicles?.length ? b.vehicles : [van],
    busRounds: (b.busRounds ?? []).map((r) => ({ ...r, vehicleId: r.vehicleId ?? van.id })),
  }))
  // children in a weekly class at this branch, with a package covering today
  const riders = db.students.filter((s) => s.branchId === branch.id && !s.archived && !s.id.startsWith("stu_demo_")
    && db.classes.some((k) => k.active && !k.periodId && k.studentIds.includes(s.id))
    && db.entitlements.some((e) => e.studentId === s.id && e.from <= today && e.to >= today)).slice(0, 12)
  const pins = new Map<string, { lat: number; lng: number }>()
  riders.forEach((s, i) => {
    if (!s.familyId) return
    // spread around the branch: 1.5–7 km, every direction; one family left without a pin (shows the warning)
    if (i === riders.length - 1) return
    const ang = (i * 137.5 * Math.PI) / 180, km = 1.5 + ((i * 7) % 11) * 0.5
    pins.set(s.familyId, { lat: branch.location!.lat + (km / 111) * Math.cos(ang), lng: branch.location!.lng + (km / 108) * Math.sin(ang) })
  })
  const families = db.families.map((f) => (f.location || !pins.has(f.id) ? f : { ...f, location: pins.get(f.id), addressNote: f.addressNote ?? NOTES[f.id.length % NOTES.length] }))
  const rate = (branch.fees.find((f) => f.kind === "bus")?.price ?? branch.busFeePerLeg)
  // each child's bus is on a paid invoice of their own ("ค่ารถรับส่ง") — the class dates for 6 weeks around today
  const busFeeId = branch.fees.find((f) => f.kind === "bus")?.id ?? null
  const yymmdd = `${String((now.getFullYear() + 543) % 100).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}01`
  const busInvoices: Invoice[] = riders.flatMap((s, i): Invoice[] => {
    const classIds = db.classes.filter((k) => k.studentIds.includes(s.id)).map((k) => k.id)
    const dates = [...new Set(db.sessions.filter((x) => x.classId && classIds.includes(x.classId) && !x.cancelled && x.date >= addDays(today, -7) && x.date <= addDays(today, 35)).map((x) => x.date))].sort()
    // most both ways, some one way only
    const legs = dates.map((date) => ({ date, pickup: i % 5 !== 1, dropoff: i % 5 !== 0 }))
    if (!legs.length) return []
    const amount = legs.reduce((n, l) => n + Number(l.pickup) + Number(l.dropoff), 0) * rate
    const no = `${yymmdd}-02-${branch.branchNo}-9${String(i).padStart(3, "0")}`
    const at = `${addDays(today, -9)}T10:00:00.000Z`
    return [{
      id: `inv_bus_${s.id}`, branchId: branch.id, studentId: s.id, number: no, lines: [], bus: legs, busFeeId, bookFee: 0, advance: [], concession: null,
      noteToParent: "ค่ารถรับส่ง", status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: at, approvedBy: "u_nock", sentAt: at, delivery: "delivered", receiptNumber: no,
      payments: [{ id: `pay_bus_${s.id}`, amount, method: "transfer", reference: "", recordedBy: "u_ploy", recordedAt: at, confirmedBy: "u_nock" }],
    }]
  })
  const invoices = [...db.invoices, ...busInvoices]
  const ids = new Set(riders.map((s) => s.id))
  // a parent rides along with the third child on their next class day
  const third = riders[2]
  const thirdDay = third && invoices.find((x) => x.studentId === third.id && x.bus.length)?.bus.find((l) => l.date >= today)
  const companions: BusAddOn[] = third && thirdDay ? [{ id: "ba_demo_parent", branchId: branch.id, studentId: third.id, date: thirdDay.date, pickup: thirdDay.pickup, dropoff: thirdDay.dropoff, busFeeId: null, amount: 0, companion: true, note: "ผู้ปกครองไปด้วย", createdBy: "u_ploy", createdAt: now.toISOString() }] : []
  return {
    ...db, branches, families, invoices,
    students: db.students.map((s) => (ids.has(s.id) ? { ...s, usesBus: true } : s)),
    busAddOns: [...db.busAddOns, ...companions],
  }
}
