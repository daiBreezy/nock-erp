import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, Check, QrCode, Landmark, CreditCard, CalendarClock, Apple } from 'lucide-react'
import { payMethods, type PayMethodKey } from '../../data/payment'
import { fmtBaht } from '../../data/packages'

type Plan = { name: string; price: number; detail?: string }

const methodIcon: Record<PayMethodKey, typeof QrCode> = {
  promptpay: QrCode,
  bank: Landmark,
  card: CreditCard,
  paylater: CalendarClock,
  iap: Apple,
}

export default function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const plan = (location.state as Plan) || { name: 'Premium Plus', price: 2705 }
  const [method, setMethod] = useState<PayMethodKey | null>(null)

  const proceed = () => {
    if (!method) return
    navigate('/checkout/pay', { state: { plan, method } })
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">ชำระเงิน</h1>
      </header>

      {/* order summary */}
      <section className="px-4 pt-4">
        <div className="rounded-card border border-line bg-surface-1 p-4">
          <p className="text-xs text-ink-soft">แพ็กเกจที่เลือก</p>
          <div className="mt-1 flex items-end justify-between">
            <p className="text-base font-semibold text-ink">{plan.name}</p>
            <p className="text-2xl font-bold text-brand">฿{fmtBaht(plan.price)}</p>
          </div>
          {plan.detail && <p className="mt-1 text-xs text-ink-soft">{plan.detail}</p>}
        </div>
      </section>

      {/* เลือกวิธีจ่าย */}
      <section className="px-4 pt-5">
        <h2 className="mb-3 text-base font-semibold text-ink">เลือกวิธีชำระเงิน</h2>
        <div className="space-y-2.5">
          {payMethods.map((m) => {
            const Icon = methodIcon[m.key]
            const active = method === m.key
            return (
              <button
                key={m.key}
                onClick={() => setMethod(m.key)}
                className={`flex w-full items-center gap-3 rounded-card border p-4 text-left ${active ? 'border-brand bg-brand-soft' : 'border-line bg-surface-1'}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-brand text-white' : 'bg-surface-2 text-ink-soft'}`}>
                  <Icon size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink">{m.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">{m.desc}</p>
                </div>
                <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${active ? 'border-brand bg-brand text-white' : 'border-line'}`}>
                  {active && <Check size={13} />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[440px] border-t border-line bg-surface-1 p-4">
        <button
          onClick={proceed}
          disabled={!method}
          className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          ดำเนินการต่อ
        </button>
      </div>
    </div>
  )
}
