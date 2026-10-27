import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

/*
 * ค้นหา + ตัวกรอง — ใช้แบบเดียวกันทั้งระบบ (เจ้าของกำหนด 2026-10-27)
 * Search อยู่ซ้าย (ไม่กว้างเต็มแถว) · Filter เป็น Dropdown (shadcn Select) อยู่ขวา
 */

export function SearchInput({
  value, onChange, placeholder = 'ค้นหา', className,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-mute" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-pill border-line bg-surface-1 pl-10 pr-4 text-sm shadow-none focus-visible:border-brand focus-visible:ring-brand/20"
      />
    </div>
  )
}

export type FilterOption = { value: string; label: string }

/** ตัวเลือกแรกของ options = "ทั้งหมด" (ค่าเริ่มต้น) · เลือกอย่างอื่นแล้วปุ่มเปลี่ยนเป็นสีแบรนด์ ให้รู้ว่ากำลังกรองอยู่ */
export function FilterSelect({
  value, onValueChange, options, label, className,
}: {
  value: string; onValueChange: (v: string) => void; options: FilterOption[]; label: string; className?: string
}) {
  const active = value !== options[0]?.value
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-10 w-auto min-w-[132px] gap-2 rounded-pill border-line bg-surface-1 px-4 text-sm font-medium text-ink shadow-none focus:ring-brand/20',
          active && 'border-brand/40 bg-brand-soft text-brand',
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="rounded-xl">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} className="rounded-lg py-2">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** แถวค้นหา + ตัวกรอง: Search ซ้าย (กว้างสุด ~360px) · Filter ชิดขวา · จอแคบ Search เต็มแถวแล้ว Filter ลงบรรทัดใหม่ */
export function FilterBar({ search, children, className }: { search: React.ReactNode; children?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      <div className="w-full sm:w-auto sm:min-w-[240px] sm:max-w-[360px] sm:flex-1">{search}</div>
      {children && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{children}</div>}
    </div>
  )
}

/* ---------- ตัวเลือกมาตรฐาน ---------- */

export const SUBJECT_FILTER: FilterOption[] = [
  { value: 'all', label: 'ทุกวิชา' },
  { value: 'math', label: 'คณิตศาสตร์' },
  { value: 'science', label: 'วิทยาศาสตร์' },
  { value: 'thai', label: 'ภาษาไทย' },
  { value: 'english', label: 'ภาษาอังกฤษ' },
]

/** ชั้นเรียน ป.1–ม.6 · value = ชื่อชั้นแบบไทย (ตรงกับข้อมูล) */
export const GRADE_FILTER: FilterOption[] = [
  { value: 'all', label: 'ทุกชั้นเรียน' },
  ...['ป', 'ม'].flatMap((lv) => [1, 2, 3, 4, 5, 6].map((n) => ({ value: `${lv}.${n}`, label: `${lv}.${n}` }))),
]

/** ชั้นของข้อมูลอาจเป็นช่วง ('ม.1-3', 'ป.4-6') — ตรงกันถ้าชั้นที่เลือกอยู่ในช่วงนั้น */
export function gradeMatches(dataGrade: string, picked: string): boolean {
  if (picked === 'all') return true
  const m = dataGrade.match(/^(ป|ม)\.(\d+)(?:-(\d+))?$/)
  const p = picked.match(/^(ป|ม)\.(\d+)$/)
  if (!m || !p) return dataGrade === picked
  const lo = Number(m[2])
  const hi = m[3] ? Number(m[3]) : lo
  return m[1] === p[1] && Number(p[2]) >= lo && Number(p[2]) <= hi
}
