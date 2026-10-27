/**
 * แพ็กเกจคอร์สบน Landing — snapshot จาก API Production
 * GET https://apiv2.nockacademy.com/v1/landing/course-products (ดึงเมื่อ 27 ต.ค. 2569)
 * ใช้ไปก่อนจนกว่าจะต่อ API จริง · Premium Plus+ คิดราคาตามเวลาที่เหลือถึง cutoffDate (ตอนดึง = ขั้นต่ำ ฿500)
 */

export type PerkValue = '✓' | '—'

export type CoursePlan = {
  id: number
  productId: number
  isPremiumPlus: boolean
  name: string
  theme: 'purple' | 'gold'
  seasonal: boolean
  badge: string | null
  price: number
  durationMonths: number
  courseName: string | null
  grade: string
  perks: { label: string; value: PerkValue }[]
  ctaUrl: string
  season: { startDate: string; cutoffDate: string } | null
}

/** สิทธิ์ทั้ง 9 แถว (ลำดับตาม API) · note = คำอธิบายเพิ่ม (Production แสดงใต้ป้ายเป็น tooltip) */
export const PERK_ROWS: { label: string; note?: string }[] = [
  { label: 'ไลฟ์สอนสด Premium Plus', note: 'เฉพาะคอร์สหลักที่สมัคร' },
  { label: 'หนังสือ', note: 'เฉพาะคอร์สหลักที่สมัคร' },
  { label: 'รายงานผลการเรียน', note: 'เฉพาะคอร์สหลักที่สมัคร' },
  { label: 'ไฟล์เอกสาร' },
  { label: 'ไลฟ์สอนสด คลาสเรียนฟรี' },
  { label: 'วิดีโอบันทึก ไลฟ์ย้อนหลัง' },
  { label: 'คลิปบทเรียนสั้น' },
  { label: 'แบบฝึกหัด ท้ายบทเรียน' },
  { label: 'ห้องสอบจำลอง' },
]

const perks = (plus: boolean) =>
  PERK_ROWS.map((r, i) => ({ label: r.label, value: (plus || i >= 3 ? '✓' : '—') as PerkValue }))

export const COURSE_PLANS: CoursePlan[] = [
  {
    id: 1, productId: 52, isPremiumPlus: true, name: 'Premium Plus+', theme: 'purple', seasonal: true, badge: 'Popular',
    price: 500, durationMonths: 1, courseName: 'สอบเข้า ม.1 รร. จุฬาภรณ', grade: 'ป.6', perks: perks(true),
    ctaUrl: 'https://learn.nockacademy.com/mobile-j1', season: { startDate: '2026-07-14', cutoffDate: '2026-11-05' },
  },
  {
    id: 2, productId: 53, isPremiumPlus: true, name: 'Premium Plus+', theme: 'purple', seasonal: true, badge: null,
    price: 500, durationMonths: 1, courseName: 'สอบเข้า ม.4 MWIT วมว. จภ.', grade: 'ม.3', perks: perks(true),
    ctaUrl: 'https://learn.nockacademy.com/mobile-h4', season: { startDate: '2026-07-14', cutoffDate: '2026-11-05' },
  },
  {
    id: 3, productId: 54, isPremiumPlus: true, name: 'Premium Plus+', theme: 'purple', seasonal: true, badge: null,
    price: 500, durationMonths: 1, courseName: 'สอบเข้า ม.1 ห้อง EP', grade: 'ป.6', perks: perks(true),
    ctaUrl: 'https://learn.nockacademy.com/mobile-j1ep', season: { startDate: '2026-07-15', cutoffDate: '2026-11-04' },
  },
  {
    id: 4, productId: 23, isPremiumPlus: false, name: 'Premium', theme: 'gold', seasonal: false, badge: 'Most Popular',
    price: 2800, durationMonths: 3, courseName: null, grade: 'ทุกชั้นเรียน', perks: perks(false),
    ctaUrl: 'https://learn.nockacademy.com/pay/23', season: null,
  },
  {
    id: 5, productId: 24, isPremiumPlus: false, name: 'Premium', theme: 'gold', seasonal: false, badge: null,
    price: 4100, durationMonths: 6, courseName: null, grade: 'ทุกชั้นเรียน', perks: perks(false),
    ctaUrl: 'https://learn.nockacademy.com/pay/24', season: null,
  },
  {
    id: 6, productId: 25, isPremiumPlus: false, name: 'Premium', theme: 'gold', seasonal: false, badge: null,
    price: 5300, durationMonths: 12, courseName: null, grade: 'ทุกชั้นเรียน', perks: perks(false),
    ctaUrl: 'https://learn.nockacademy.com/pay/25', season: null,
  },
]

/** จำนวนผู้เรียน (ตามป้ายบน Production) */
export const LEARNER_COUNT = 17573

const TH_MONTH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
/** '2026-11-05' → '5 พ.ย. 2569' */
export function thaiDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${TH_MONTH[m - 1]} ${y + 543}`
}
