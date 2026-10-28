import { useNavigate } from 'react-router-dom'
import { ArrowLeftRight, Check, Crown, CreditCard, Info, Plus, QrCode } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { COURSE_PLANS, LEARNER_COUNT, PERK_ROWS, thaiDate, type CoursePlan } from '@/data/coursePlans'
import { cn } from '@/lib/utils'

/* ส่วน "Course ของเรา" บน Landing — 6 แพ็กเกจ + 9 แถวสิทธิ์ (ข้อมูลตาม API Production) */

const baht = (n: number) => `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`
const perMonth = (p: CoursePlan) => (p.price / p.durationMonths).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/* ---------- ป้าย 17,573+ (ตาม Figma: แคปซูลส้ม · รูปการ์ตูนซ้อน · ปุ่ม + · ตัวเลขใหญ่) ---------- */

// รูปการ์ตูนจาก DiceBear (ใช้แบบเดียวกับรูปโปรไฟล์ในเมนู) — ไม่ใช่รูปคนจริง
const CARTOON = ['Mimi', 'Leo', 'Nana', 'Kai', 'Pim'].map((seed) => `https://api.dicebear.com/9.x/adventurer/svg?seed=${seed}&backgroundColor=ffd5dc,c0aede,b6e3f4,d1d4f9,ffdfbf`)

export function LearnersPill() {
  return (
    <div className="inline-flex max-w-full items-center gap-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-400 py-1 pl-1 pr-4 shadow-sm shadow-orange-500/20 sm:gap-3 sm:pr-5">
      <div className="flex -space-x-2">
        {CARTOON.map((src, i) => (
          <Avatar key={src} className={cn('size-8 sm:size-9', i > 2 && 'hidden sm:flex')}>
            <AvatarImage src={src} alt="" className="border-2 border-white bg-white" />
            <AvatarFallback className="border-2 border-white bg-white text-[10px] text-ink-soft">{i + 1}</AvatarFallback>
          </Avatar>
        ))}
        <span className="relative grid size-8 place-items-center rounded-full border-2 border-white bg-violet-100 text-violet-700 sm:size-9"><Plus size={16} /></span>
      </div>
      <p className="flex flex-col whitespace-nowrap text-white sm:flex-row sm:items-baseline sm:gap-2">
        <span className="text-[22px] font-extrabold leading-none sm:text-[30px]">{LEARNER_COUNT.toLocaleString('en-US')}+</span>
        <span className="text-[12px] font-medium opacity-95 sm:text-[13px]">เพื่อนร่วมเรียนของคุณ</span>
      </p>
    </div>
  )
}

/* ---------- ช่องทางชำระเงิน ---------- */

export function PaymentMethods() {
  const items = [
    { Icon: QrCode, label: 'พร้อมเพย์' },
    { Icon: CreditCard, label: 'บัตรเครดิต' },
    { Icon: ArrowLeftRight, label: 'โอนเงินผ่านธนาคาร' },
  ]
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-ink-soft" aria-label="ช่องทางชำระเงิน">
      {items.map(({ Icon, label }) => (
        <span key={label} className="inline-flex items-center gap-1.5"><Icon size={16} className="text-ink-mute" /> {label}</span>
      ))}
    </div>
  )
}

/* ---------- ตารางแพ็กเกจ: คอลัมน์ชื่อแถวค้างซ้ายทุกขนาดจอ · การ์ดแพ็กเกจเลื่อนแนวนอนเมื่อพื้นที่ไม่พอ ---------- */

const tone = (p: CoursePlan) =>
  p.isPremiumPlus
    ? { card: 'border-violet-200 bg-violet-50/70', name: 'bg-violet-100 text-violet-700', price: 'text-violet-700', pill: 'bg-violet-100 text-violet-700', badge: 'bg-violet-600' }
    : p.badge
      ? { card: 'border-amber-300 bg-amber-50/80', name: 'bg-amber-100 text-amber-700', price: 'text-amber-600', pill: 'bg-amber-100 text-amber-700', badge: 'bg-amber-500' }
      : { card: 'border-line bg-white', name: 'bg-amber-50 text-amber-700', price: 'text-amber-600', pill: 'bg-amber-50 text-amber-700', badge: '' }

// ทุกแถวสูงคงที่ → ทุกอย่างตรงกันทุกคอลัมน์ (หัวการ์ดก็แบ่งช่องคงที่ ไม่จัดกลางตามเนื้อหา)
const ROW = { head: 'h-[118px]', meta: 'h-12', course: 'h-14', perk: 'h-12', cta: 'h-16' }

/** หัวการ์ด: ชื่อแพ็กเกจ · ราคา · ต่อเดือน · หมายเหตุ (ช่องว่างจองไว้แม้ไม่มี) */
function PlanHead({ p }: { p: CoursePlan }) {
  const t = tone(p)
  return (
    <div className="flex flex-col items-center pt-4 text-center">
      <span className={cn('inline-flex h-6 items-center gap-1 rounded-pill px-2.5 text-[12px] font-bold', t.name)}>
        <Crown size={12} /> {p.name}
      </span>
      <p className={cn('mt-1.5 h-8 text-[24px] font-extrabold leading-8', t.price)}>{baht(p.price)}</p>
      <p className="h-4 text-[11.5px] leading-4 text-ink-mute">≈ ฿{perMonth(p)} /เดือน</p>
      <p className="mt-1 h-4 text-[11px] leading-4 text-violet-600" title={p.isPremiumPlus ? 'ราคาคำนวณตามระยะเวลาที่เหลือ ถึงวันสิ้นสุดคอร์ส' : undefined}>
        {p.isPremiumPlus && p.season && <span className="inline-flex items-center gap-1"><Info size={12} /> คิดตามเวลาที่เหลือ</span>}
      </p>
    </div>
  )
}

const durationCell = (p: CoursePlan) =>
  p.isPremiumPlus && p.season ? `สิ้นสุด ${thaiDate(p.season.cutoffDate)}` : `${p.durationMonths} เดือน`

function PerkMark({ v }: { v: string }) {
  return v === '✓' ? (
    <span className="grid size-5 place-items-center rounded-full bg-success text-white" aria-label="มี"><Check size={13} strokeWidth={3} /></span>
  ) : (
    <span className="block h-px w-3 bg-ink-mute/50" aria-label="ไม่มี" />
  )
}

function PlanCta({ p }: { p: CoursePlan }) {
  const navigate = useNavigate()
  const filled = p.isPremiumPlus || !!p.badge
  return (
    <Button
      variant={filled ? 'default' : 'outline'}
      onClick={() => navigate('/checkout', { state: { name: p.courseName ? `${p.name} · ${p.courseName}` : `${p.name} ${p.durationMonths} เดือน`, price: p.price } })}
      className={cn(
        'h-10 w-full rounded-pill text-[13px] font-bold shadow-none',
        p.isPremiumPlus && 'bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700',
        !p.isPremiumPlus && p.badge && 'bg-gradient-to-r from-amber-500 to-orange-400 text-white hover:from-amber-600 hover:to-orange-500',
        !filled && 'border-line bg-white text-ink hover:bg-surface-2',
      )}
    >
      สมัคร
    </Button>
  )
}

export default function CoursePlans() {
  const metaRows: { label: string; cls: string; cell: (p: CoursePlan) => React.ReactNode }[] = [
    { label: 'ระยะเวลา', cls: ROW.meta, cell: (p) => <span className={cn('whitespace-nowrap rounded-pill px-2.5 py-0.5 text-[12px] font-semibold', tone(p).pill)}>{durationCell(p)}</span> },
    { label: 'คอร์สเรียน', cls: ROW.course, cell: (p) => <span className="line-clamp-2 px-2 text-[12.5px] leading-snug text-ink">{p.courseName ?? '—'}</span> },
    { label: 'ระดับชั้น', cls: ROW.meta, cell: (p) => <span className={cn('text-[12.5px]', p.isPremiumPlus ? 'rounded-md bg-sky-100 px-2 py-0.5 font-semibold text-sky-800' : 'text-ink-soft')}>{p.grade}</span> },
  ]
  const label = 'flex border-b border-line pr-2'
  return (
    <div className="no-scrollbar -mx-5 snap-x snap-mandatory scroll-pl-[160px] overflow-x-auto px-5 pt-3 sm:scroll-pl-[218px] xl:snap-none">
      <div className="grid w-max min-w-full grid-cols-[132px_repeat(6,minmax(152px,1fr))] gap-x-2 pr-5 xl:w-auto xl:min-w-0 xl:pr-0 sm:grid-cols-[190px_repeat(6,minmax(156px,1fr))] xl:grid-cols-[196px_repeat(6,minmax(148px,1fr))] xl:gap-x-3">
        {/* ชื่อแถว — ค้างซ้ายตอนเลื่อนการ์ด · ยื่นทับขอบซ้าย 20px (ไม่ให้การ์ดโผล่ข้างหลัง) · เงาขอบขวาบอกว่ามีการ์ดเลื่อนอยู่ใต้ */}
        <div className="sticky -left-5 z-10 -ml-5 -mt-3 bg-surface-1 pl-5 pt-3 shadow-[8px_0_10px_-8px_rgba(0,0,0,0.12)] xl:shadow-none">
          <div className={ROW.head} />
          {metaRows.map((r) => (
            <div key={r.label} className={cn(label, 'items-center text-[12.5px] text-ink-soft sm:text-[13px]', r.cls)}>{r.label}</div>
          ))}
          {PERK_ROWS.map((r) => (
            <div key={r.label} className={cn(label, 'flex-col justify-center', ROW.perk)} title={r.note}>
              <span className="line-clamp-2 text-[12px] leading-tight text-ink sm:text-[13px]">{r.label}</span>
              {r.note && <span className="hidden truncate text-[10.5px] leading-tight text-ink-mute sm:block">{r.note}</span>}
            </div>
          ))}
        </div>

        {/* การ์ดแพ็กเกจ — ป้าย Popular วางบนขอบบนของการ์ด ไม่กินพื้นที่ */}
        {COURSE_PLANS.map((p) => (
          <div key={p.id} className={cn('relative snap-start rounded-card border', tone(p).card)}>
            {p.badge && (
              <span className={cn('absolute -top-2.5 left-1/2 z-[1] -translate-x-1/2 whitespace-nowrap rounded-pill px-2.5 py-0.5 text-[10.5px] font-bold leading-4 text-white shadow-sm', tone(p).badge)}>
                {p.badge}
              </span>
            )}
            <div className={ROW.head}><PlanHead p={p} /></div>
            {metaRows.map((r) => (
              <div key={r.label} className={cn('flex items-center justify-center border-b border-black/5 text-center', r.cls)}>{r.cell(p)}</div>
            ))}
            {p.perks.map((pk) => (
              <div key={pk.label} className={cn('flex items-center justify-center border-b border-black/5', ROW.perk)}><PerkMark v={pk.value} /></div>
            ))}
            <div className={cn('flex items-center px-3', ROW.cta)}><PlanCta p={p} /></div>
          </div>
        ))}
      </div>
    </div>
  )
}
