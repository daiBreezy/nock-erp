// Settings rules — mirrors the staging ERP's Settings structure (branch list → 11 branch tabs, plus
// brand-wide System). Every tab saves through one of these validators so the UI never re-implements them.

import { toMinutes } from "../dates"
import type { Branch, Fee, FeeKind, FormLang, Holiday, HolidayCategory, NotifyKey, OpenHours, PeriodPriority, PriceRow, PriceUnit, Promotion, SpecialPeriod, SystemConfig, Weekday } from "../types"

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

/** Grade as a parent reads it (owner 2026-09-30: forms in TH/EN/JP) — automatic, nothing to set up:
 *  อ.1–3 → K1–K3 / 年少·年中·年長 · ป.1–6 → G1–G6 / 小1–6 · ม.1–3 → G7–G9 / 中1–3 · ม.4–6 → G10–G12 / 高1–3 */
export function gradeLabel(grade: string, lang: FormLang): string {
  if (lang === "th") return grade
  const m = /^(อ|ป|ม)\.(\d+)$/.exec(grade)
  if (!m) return grade
  const n = Number(m[2])
  if (m[1] === "อ") return lang === "en" ? `K${n}` : (["年少", "年中", "年長"][n - 1] ?? grade)
  if (m[1] === "ป") return lang === "en" ? `G${n}` : `小${n}`
  return lang === "en" ? `G${n + 6}` : n <= 3 ? `中${n}` : `高${n - 3}`
}

/** Subject as a parent reads it — the name set in Settings → System for that language, else the Thai name */
export function subjectLabel(subject: string, lang: FormLang, names?: SystemConfig["subjectNames"]): string {
  return (lang !== "th" && names?.[subject]?.[lang]?.trim()) || subject
}

/** Grades in one session, lowest first, with head-counts — mixed-grade classes must show every grade (owner 2026-09-29) */
export function gradeMix(grades: string[]): { grade: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const g of grades) if (g) counts.set(g, (counts.get(g) ?? 0) + 1)
  return sortGrades([...counts.keys()]).map((grade) => ({ grade, count: counts.get(grade)! }))
}

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
  // overlapping active periods are fine when priorities differ (the higher one wins that day); with the
  // same priority it would be ambiguous which hours apply. Inactive periods never count.
  const act = list.filter((p) => p.active)
  for (let i = 0; i < act.length; i++)
    for (let j = i + 1; j < act.length; j++)
      if (act[i].priority === act[j].priority && act[i].from <= act[j].to && act[j].from <= act[i].to)
        return `${act[i].name} กับ ${act[j].name} วันที่ทับกันและ Priority เท่ากัน — เปลี่ยน Priority หรือวันที่`
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

export const PRIORITY_LABEL: Record<PeriodPriority, string> = { high: "สูง", medium: "กลาง", low: "ต่ำ" }
