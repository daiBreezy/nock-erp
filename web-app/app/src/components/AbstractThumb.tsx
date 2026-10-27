import { useState } from 'react'
import { cn } from '@/lib/utils'

/*
 * ภาพปกแบบ Abstract — ใช้แทนรูปปกชุดข้อสอบที่ยังไม่มีรูป
 * รูป illustration ฟรีจาก Unsplash (Unsplash License) 12 รูป · เลือกจาก seed (เช่น id ชุดข้อสอบ) → ชุดเดิมได้รูปเดิมเสมอ
 * โหลดรูปไม่ขึ้น (ออฟไลน์ / รูปถูกลบ) → วาดรูปทรงเรขาคณิตเป็น SVG แทน
 */

// id รูปบน images.unsplash.com/vector-… (หน้า unsplash.com/illustrations/… ติดป้าย Free)
const UNSPLASH = [
  '1752988566708-b58fedae3920',
  '1747282430963-62206aad8819',
  '1769956104824-89084b69dbbc',
  '1783009714677-a628a39faee8',
  '1762633645826-12700b4cb200',
  '1787927875417-1a83ccb7f9fe', // สี่เหลี่ยมแดง + วงกลมน้ำเงิน (รูปตั้งต้นที่เจ้าของเลือก) — การ์ดแรกของหน้า Learn ได้รูปนี้
  '1749746338337-b3c0a35a5975',
  '1769713352618-4e8b4cf394ef',
  '1772069262216-e0a285485473',
  '1784335805523-1520c04a2d4e',
  '1748338784011-2c26ba869edd',
  '1788647261074-eb9b0a573440',
]
const unsplashUrl = (id: string) => `https://images.unsplash.com/vector-${id}?w=480&h=360&fit=crop&auto=format&q=70`

const INK = ['#E4572E', '#2E5BBA', '#F2B134', '#1F2A44'] // แดง · น้ำเงิน · เหลือง · กรมท่า
const PAPER = ['#F5EFE4', '#EDF1F7', '#F6ECE7', '#EEF3EC']

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

type Ink = [string, string, string, string]

// แต่ละแบบวาดบนกรอบ 120×90 (4:3)
const LAYOUTS: ((c: Ink) => React.ReactNode)[] = [
  // สี่เหลี่ยมใหญ่ + วงกลมซ้อน + จุดเล็ก
  (c) => (
    <>
      <rect x="14" y="16" width="48" height="58" fill={c[0]} />
      <circle cx="74" cy="47" r="25" fill={c[1]} />
      <circle cx="102" cy="18" r="6" fill={c[2]} />
    </>
  ),
  // ครึ่งวงกลมล่าง + สี่เหลี่ยมเอียง + สามเหลี่ยม
  (c) => (
    <>
      <path d="M20 90 A40 40 0 0 1 100 90 Z" fill={c[1]} />
      <rect x="66" y="10" width="26" height="26" fill={c[0]} transform="rotate(18 79 23)" />
      <path d="M16 14 L40 14 L16 44 Z" fill={c[2]} />
    </>
  ),
  // เสี้ยววงกลมมุม + แถบตั้ง + วงกลม
  (c) => (
    <>
      <path d="M0 0 L54 0 A54 54 0 0 1 0 54 Z" fill={c[2]} />
      <rect x="70" y="0" width="14" height="90" fill={c[3]} />
      <circle cx="58" cy="60" r="18" fill={c[0]} />
    </>
  ),
  // เส้นแถบ + วงกลมใหญ่
  (c) => (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="10" y={14 + i * 13} width="56" height="6" fill={c[3]} />
      ))}
      <circle cx="80" cy="45" r="28" fill={c[0]} />
      <rect x="92" y="62" width="18" height="18" fill={c[2]} />
    </>
  ),
  // สามเหลี่ยมใหญ่ + วงกลม + สี่เหลี่ยมเล็ก
  (c) => (
    <>
      <path d="M8 82 L56 8 L104 82 Z" fill={c[2]} />
      <circle cx="84" cy="30" r="17" fill={c[1]} />
      <rect x="22" y="58" width="22" height="22" fill={c[0]} />
    </>
  ),
  // ครึ่งวงกลมสองชิ้นหันหากัน + จุด
  (c) => (
    <>
      <path d="M56 12 A33 33 0 0 0 56 78 Z" fill={c[0]} />
      <path d="M64 12 A33 33 0 0 1 64 78 Z" fill={c[1]} />
      <circle cx="102" cy="74" r="7" fill={c[2]} />
      <rect x="10" y="10" width="12" height="12" fill={c[3]} />
    </>
  ),
]

export default function AbstractThumb({ seed, className }: { seed: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  const h = hash(seed)
  if (!failed) {
    return (
      <img
        src={unsplashUrl(UNSPLASH[h % UNSPLASH.length])}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('block h-full w-full object-cover', className)}
      />
    )
  }
  const shift = h % 4
  const ink = [0, 1, 2, 3].map((i) => INK[(i + shift) % 4]) as Ink
  return (
    <svg viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" aria-hidden className={cn('block h-full w-full', className)}>
      <rect width="120" height="90" fill={PAPER[(h >>> 4) % PAPER.length]} />
      {LAYOUTS[(h >>> 8) % LAYOUTS.length](ink)}
    </svg>
  )
}
