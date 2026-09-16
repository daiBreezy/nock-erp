import { useNavigate } from 'react-router-dom'
import { Check, Crown, Radio, School } from 'lucide-react'
import { premiumPlans, perMonth, plusPricing, schoolPlans, fmtBaht } from '../../data/packages'

// Component กลาง — ใช้ร่วมทั้ง Web และ App (responsive)
export default function PricingPlans() {
  const navigate = useNavigate()
  const plus = plusPricing()
  const main = premiumPlans.filter((p) => p.main)
  const sub = premiumPlans.filter((p) => !p.main)

  const buy = (name: string, price: number, detail?: string) =>
    navigate('/checkout', { state: { name, price, detail } })

  return (
    <div className="space-y-6">
      {/* Premium Plus — เด่นสุด */}
      <section>
        <div className="rounded-card border-2 border-brand bg-surface-1 p-5">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-pill bg-brand px-2.5 py-1 text-xs font-semibold text-white">
              <Crown size={13} /> Premium Plus
            </span>
            <span className="flex items-center gap-1 text-xs text-live"><Radio size={12} /> ดู Live สดได้</span>
          </div>
          <div className="mt-3 flex items-end gap-2">
            <span className="text-3xl font-bold text-ink">฿{fmtBaht(plus.price)}</span>
            <span className="mb-1 text-sm text-ink-mute line-through">฿{fmtBaht(plus.fullPrice)}</span>
          </div>
          <p className="mt-1 text-xs text-ink-soft">ราคา ณ วันนี้ · เหลือสิทธิ์ใช้งานอีก {plus.remaining} วัน (ถึง 31 ส.ค. 2026)</p>
          <ul className="mt-4 space-y-2 text-sm text-ink">
            {['ดู Live stream สดทุกวิชา', 'ดูวิดีโอย้อนหลังทั้งหมด', 'เข้าห้องสอบ + ห้องทำการบ้าน'].map((f) => (
              <li key={f} className="flex items-center gap-2"><Check size={16} className="text-success" /> {f}</li>
            ))}
          </ul>
          <button
            onClick={() => buy('Premium Plus', plus.price, `ราคา ณ วันนี้ · เหลือ ${plus.remaining} วัน`)}
            className="mt-4 w-full rounded-2xl bg-brand py-3.5 text-base font-semibold text-white"
          >
            เลือกแพ็กเกจนี้
          </button>
          <p className="mt-2 text-center text-[11px] text-ink-mute">ยิ่งซื้อเร็ว ยิ่งคุ้ม — ราคาลดลงทุกวันจนถึงขั้นต่ำ ฿500</p>
        </div>
      </section>

      {/* Premium ธรรมดา */}
      <section>
        <h3 className="mb-1 text-base font-semibold text-ink">Premium</h3>
        <p className="mb-3 text-xs text-ink-soft">ดูวิดีโอย้อนหลังได้ทั้งหมด (ไม่รวม Live สด)</p>
        <div className="grid grid-cols-3 gap-2.5">
          {main.map((p) => (
            <button key={p.months} onClick={() => buy(`Premium ${p.months} เดือน`, p.price)} className="rounded-card border border-line bg-surface-1 p-3 text-center active:scale-95">
              <p className="text-sm font-semibold text-ink">{p.months} เดือน</p>
              <p className="mt-1 text-lg font-bold text-brand">฿{fmtBaht(p.price)}</p>
              <p className="mt-0.5 text-[11px] text-ink-mute">~฿{fmtBaht(perMonth(p))}/เดือน</p>
            </button>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-2.5">
          {sub.map((p) => (
            <button key={p.months} onClick={() => buy(`Premium ${p.months} เดือน`, p.price)} className="rounded-xl border border-line bg-surface-1 p-2.5 text-center active:scale-95">
              <p className="text-xs font-medium text-ink">{p.months} เดือน</p>
              <p className="mt-0.5 text-sm font-semibold text-ink">฿{fmtBaht(p.price)}</p>
              <p className="text-[10px] text-ink-mute">~฿{fmtBaht(perMonth(p))}/ด.</p>
            </button>
          ))}
        </div>
      </section>

      {/* Premium โรงเรียน — เร็วๆ นี้ */}
      <section>
        <h3 className="mb-1 text-base font-semibold text-ink">Premium เจาะโรงเรียน</h3>
        <p className="mb-3 text-xs text-ink-soft">ดู Live + ย้อนหลัง เฉพาะของโรงเรียนนั้น · เร็วๆ นี้</p>
        <div className="space-y-2">
          {schoolPlans.map((s) => (
            <div key={s.name} className="flex items-center gap-3 rounded-xl border border-line bg-surface-1 p-3 opacity-80">
              <School size={20} className="text-brand" />
              <span className="flex-1 text-sm font-medium text-ink">{s.name}</span>
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-ink-soft">เร็วๆ นี้</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
