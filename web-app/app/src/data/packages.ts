// อ้างอิง docs/discovery/packages-access.md
// วันที่ปัจจุบัน (mock) = 26 มิ.ย. 2026
const TODAY = new Date(2026, 5, 26)

export type PremiumPlan = {
  months: number
  price: number // ราคารวม
  main: boolean // main package (3/6/12) vs รอง (18/24/36)
}

// Premium ธรรมดา (กำลังยกเลิก) — ยิ่งนานเฉลี่ย/เดือนยิ่งถูก
export const premiumPlans: PremiumPlan[] = [
  { months: 3, price: 1490, main: true },
  { months: 6, price: 2690, main: true },
  { months: 12, price: 4690, main: true },
  { months: 18, price: 6390, main: false },
  { months: 24, price: 7990, main: false },
  { months: 36, price: 10490, main: false },
]

export function perMonth(plan: PremiumPlan) {
  return Math.round(plan.price / plan.months)
}

// Premium Plus (P+) — package ช่วงเวลา, ราคาลดตามวันที่เหลือ, ขั้นต่ำ 500
export const premiumPlus = {
  fullPrice: 5000,
  minPrice: 500,
  start: new Date(2026, 4, 1), // 1 พ.ค. 2026
  end: new Date(2026, 7, 31), // 31 ส.ค. 2026
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

export function plusPricing(now: Date = TODAY) {
  const totalDays = daysBetween(premiumPlus.start, premiumPlus.end)
  const passed = Math.max(0, daysBetween(premiumPlus.start, now))
  const remaining = Math.max(0, daysBetween(now, premiumPlus.end))
  const perDay = premiumPlus.fullPrice / totalDays
  const raw = Math.round(premiumPlus.fullPrice - passed * perDay)
  const price = Math.max(premiumPlus.minPrice, raw)
  return { price, remaining, totalDays, fullPrice: premiumPlus.fullPrice }
}

// Premium โรงเรียน (อนาคต) — ราคายังไม่กำหนด
export const schoolPlans = [
  { name: 'Premium เตรียมอุดมฯ', weeks: 8 },
  { name: 'Premium สวนกุหลาบ', weeks: 8 },
  { name: 'Premium อัสสัมชัญ', weeks: 8 },
]

export function fmtBaht(n: number) {
  return n.toLocaleString('th-TH')
}
