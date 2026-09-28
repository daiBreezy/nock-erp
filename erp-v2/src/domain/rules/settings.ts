// Settings rules — mirrors the staging ERP's Settings structure (branch list → 11 branch tabs, plus
// brand-wide System). Every tab saves through one of these validators so the UI never re-implements them.

import { toMinutes } from "../dates"
import type { Branch, Fee, FeeKind, Holiday, HolidayCategory, NotifyKey, OpenHours, SpecialPeriod, PriceRow, PriceUnit, Promotion, Weekday } from "../types"

export const FEE_KIND_LABEL: Record<FeeKind, { title: string; hint: string }> = {
  bus: { title: "ค่ารถ (Bus fee)", hint: "คิดต่อเที่ยว (รับ/ส่ง นับแยกกัน) — แต่ละคอร์สในใบแจ้งหนี้เลือกได้ 1 ประเภท" },
  entry: { title: "ค่าแรกเข้า (Entry fee)", hint: "เก็บครั้งเดียว — เป็นรายการ Advance Optional ในใบแจ้งหนี้" },
  mock: { title: "ค่าสอบ Mock test", hint: "เก็บครั้งเดียว — เป็นรายการ Advance Optional ในใบแจ้งหนี้" },
}

export const PRICE_UNIT_LABEL: Record<PriceUnit, string> = { hour: "รายชั่วโมง", week: "รายสัปดาห์", month: "รายเดือน" }

export function durationLabel(unit: PriceUnit, d: number) {
  return unit === "hour" ? `${d} ชม.` : unit === "week" ? `${d} สัปดาห์` : `${d} เดือน`
}

/** Grade catalog grouped the way staging shows it (Primary / Middle-High / Special). */
export const GRADE_GROUPS: { name: string; grades: string[] }[] = [
  { name: "อนุบาล", grades: ["อ.1", "อ.2", "อ.3"] },
  { name: "ประถม", grades: ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"] },
  { name: "มัธยม", grades: ["ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"] },
]
const GRADE_ORDER = GRADE_GROUPS.flatMap((g) => g.grades)
export const sortGrades = (gs: string[]) => [...gs].sort((a, b) => GRADE_ORDER.indexOf(a) - GRADE_ORDER.indexOf(b))

/** Durations a unit offers — month is always the single "price per month" column. */
export function durationsOf(branch: Branch, unit: PriceUnit): number[] {
  return unit === "month" ? [1] : [...branch.packageDurations[unit]].sort((a, b) => a - b)
}

export function priceOf(branch: Branch, unit: PriceUnit, duration: number, subject: string, grade: string): number | null {
  return branch.priceChart.find((r) => r.unit === unit && r.duration === duration && r.subject === subject && r.grade === grade)?.price ?? null
}

/** Upsert (or clear, when price is null) one cell of the chart. */
export function setPrice(chart: PriceRow[], row: Omit<PriceRow, "price">, price: number | null): PriceRow[] {
  const same = (r: PriceRow) => r.unit === row.unit && r.duration === row.duration && r.subject === row.subject && r.grade === row.grade
  const rest = chart.filter((r) => !same(r))
  return price === null ? rest : [...rest, { ...row, price }]
}

/** Min–max price of one duration across the chart — the "Package plans" summary on Create Course. */
export function priceRange(branch: Branch, unit: PriceUnit, duration: number): { min: number; max: number; count: number } | null {
  const ps = branch.priceChart.filter((r) => r.unit === unit && r.duration === duration).map((r) => r.price)
  return ps.length ? { min: Math.min(...ps), max: Math.max(...ps), count: ps.length } : null
}

/** Bus price per leg: first bus fee type from General Fees, else the legacy branch default. */
export function busRate(branch: Branch, feeId?: string | null): number {
  const bus = branch.fees.filter((f) => f.kind === "bus")
  return (bus.find((f) => f.id === feeId) ?? bus[0])?.price ?? branch.busFeePerLeg
}

export function validateBranchInfo(b: Pick<Branch, "name" | "code" | "rooms" | "email">): string | null {
  if (!b.name.trim()) return "ใส่ชื่อสาขา"
  if (!/^[A-Z0-9]{2,5}$/.test(b.code)) return "รหัสสาขาต้องเป็นตัวอังกฤษพิมพ์ใหญ่/ตัวเลข 2–5 ตัว (ใช้ในเลขใบแจ้งหนี้)"
  if (!b.rooms.length) return "ต้องมีห้องอย่างน้อย 1 ห้อง"
  if (b.email && !/^\S+@\S+\.\S+$/.test(b.email)) return "อีเมลไม่ถูกต้อง"
  return null
}

export function validateHours(hours: Branch["hours"]): string | null {
  for (const h of Object.values(hours)) if (h && toMinutes(h.open) >= toMinutes(h.close)) return "เวลาปิดต้องหลังเวลาเปิด"
  return null
}

/** "Copy this schedule to: Weekdays / Weekend" on the Scheduling tab. */
export function copyHours(hours: Branch["hours"], from: Weekday, to: "weekdays" | "weekend"): Branch["hours"] {
  const days: Weekday[] = to === "weekdays" ? [1, 2, 3, 4, 5] : [0, 6]
  const next = { ...hours }
  days.forEach((d) => (next[d] = hours[from] ? { ...hours[from]! } : null))
  return next
}

export function validateFee(f: Pick<Fee, "name" | "price">): string | null {
  if (!f.name.trim()) return "ใส่ชื่อประเภท"
  if (!(f.price >= 0)) return "ราคาต้องไม่ติดลบ"
  return null
}

export function validatePromotion(p: Promotion): string | null {
  if (!p.name.trim()) return "ใส่ชื่อโปรโมชัน"
  if (!(p.value > 0)) return "ส่วนลดต้องมากกว่า 0"
  if (p.type === "pct" && p.value > 100) return "ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100"
  if (!(p.minDuration > 0)) return "เลือกระยะขั้นต่ำ"
  if (p.from && p.to && p.from > p.to) return "วันสิ้นสุดต้องหลังวันเริ่ม"
  return null
}

export function validateDurations(list: number[]): string | null {
  if (list.some((d) => !(d > 0))) return "ระยะเวลาต้องมากกว่า 0"
  if (new Set(list).size !== list.length) return "มีระยะเวลาซ้ำ"
  return null
}

export const NOTIFY_LABEL: Record<NotifyKey, string> = {
  renewal: "เตือนต่อคอร์ส (Renewal alert)",
  summary_deadline: "เตือนส่งสรุปการเรียนเกินกำหนด",
  new_lead: "มี Lead ใหม่",
  payslip: "ผู้ปกครองส่งสลิป (Invoice received)",
  holiday_conflict: "วันหยุดชนกับคาบเรียน",
  student_added: "เพิ่มนักเรียนเข้าคลาส",
  starting_soon: "คาบใกล้เริ่ม",
  invoice_sent: "ส่งใบแจ้งหนี้ถึงผู้ปกครอง",
  receipt_sent: "ส่งใบเสร็จถึงผู้ปกครอง",
  summary_sent: "ส่งสรุปการเรียนถึงผู้ปกครอง",
}

export const HOLIDAY_CATEGORY_LABEL: Record<HolidayCategory, string> = {
  traditional: "วันหยุดตามประเพณี",
  company: "วันหยุดบริษัท",
  branch: "วันหยุดของสาขา",
}

export function validateHoliday(h: Pick<Holiday, "name" | "date" | "branchId" | "category">): string | null {
  if (!h.name.trim()) return "ใส่ชื่อวันหยุด"
  if (!h.date) return "เลือกวันที่"
  if (h.branchId === null && h.category === "branch") return "วันหยุดของบริษัทต้องเป็นประเภทประเพณีหรือบริษัท"
  if (h.branchId !== null && h.category !== "branch") return "วันหยุดที่สาขาสร้างเป็นประเภท 'วันหยุดของสาขา' เท่านั้น"
  return null
}

/** Special periods (e.g. summer 08:00–22:00 every day): a date range whose hours replace the weekly hours.
 *  Ranges must not overlap — otherwise it is ambiguous which hours a date gets. */
export function validateSpecialPeriods(list: SpecialPeriod[]): string | null {
  for (const p of list) {
    if (!p.name.trim()) return "ใส่ชื่อช่วงเวลาพิเศษ"
    if (!p.from || !p.to || p.from > p.to) return `${p.name}: วันสิ้นสุดต้องหลังวันเริ่ม`
    const bad = validateHours(p.hours)
    if (bad) return `${p.name}: ${bad}`
  }
  // only active periods decide hours, so only they must not overlap (an inactive "Summer 2025" can sit beside "Summer 2026")
  const sorted = list.filter((p) => p.active).sort((a, b) => a.from.localeCompare(b.from))
  for (let i = 1; i < sorted.length; i++)
    if (sorted[i].from <= sorted[i - 1].to) return `${sorted[i - 1].name} กับ ${sorted[i].name} มีวันที่ทับกัน`
  return null
}

/** "Same hours every day" shortcut. */
export const everyDay = (h: OpenHours | null): Record<Weekday, OpenHours | null> =>
  ({ 0: h && { ...h }, 1: h && { ...h }, 2: h && { ...h }, 3: h && { ...h }, 4: h && { ...h }, 5: h && { ...h }, 6: h && { ...h } })

/** Compress grades into ranges for chips: ["ป.4","ป.5","ป.6","ม.1"] → ["ป.4–6", "ม.1"]. */
export function gradeRanges(grades: string[]): string[] {
  const out: string[] = []
  let run: string[] = []
  const flush = () => {
    if (!run.length) return
    out.push(run.length === 1 ? run[0] : `${run[0]}–${run[run.length - 1].split(".")[1]}`)
    run = []
  }
  for (const g of sortGrades(grades)) {
    const prev = run[run.length - 1]
    const next = prev && prev.split(".")[0] === g.split(".")[0] && GRADE_ORDER.indexOf(g) === GRADE_ORDER.indexOf(prev) + 1
    if (!next) flush()
    run.push(g)
  }
  flush()
  return out
}
