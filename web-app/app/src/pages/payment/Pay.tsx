import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, QrCode, Upload, Copy, Check } from 'lucide-react'
import { payMethods, payeeBank, type PayMethodKey } from '../../data/payment'
import { fmtBaht } from '../../data/packages'

type Plan = { name: string; price: number }

export default function Pay() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { plan: Plan; method: PayMethodKey }
  const plan = state?.plan ?? { name: 'Premium Plus', price: 2705 }
  const method = state?.method ?? 'promptpay'
  const meta = payMethods.find((m) => m.key === method)!
  const [slipUploaded, setSlipUploaded] = useState(false)

  const finish = () =>
    navigate('/checkout/result', { replace: true, state: { plan, needsVerify: meta.needsSlip } })

  return (
    <div className="min-h-screen bg-surface-0 pb-32">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">{meta.label}</h1>
      </header>

      <div className="px-4 pt-4">
        <div className="mb-4 flex items-center justify-between rounded-card border border-line bg-surface-1 p-4">
          <span className="text-sm text-ink-soft">{plan.name}</span>
          <span className="text-xl font-bold text-brand">฿{fmtBaht(plan.price)}</span>
        </div>

        {/* PromptPay */}
        {method === 'promptpay' && (
          <div className="rounded-card border border-line bg-surface-1 p-5 text-center">
            <div className="mx-auto flex h-48 w-48 items-center justify-center rounded-xl bg-surface-2">
              <QrCode size={120} className="text-ink" />
            </div>
            <p className="mt-3 text-sm text-ink-soft">สแกนจ่ายด้วยแอปธนาคารใดก็ได้</p>
          </div>
        )}

        {/* โอนธนาคาร */}
        {method === 'bank' && (
          <div className="space-y-2 rounded-card border border-line bg-surface-1 p-4">
            {[
              ['ธนาคาร', payeeBank.bank],
              ['ชื่อบัญชี', payeeBank.accountName],
              ['เลขบัญชี', payeeBank.accountNo],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-sm text-ink-soft">{k}</span>
                <span className="flex items-center gap-2 text-sm font-medium text-ink">{v} {k === 'เลขบัญชี' && <Copy size={14} className="text-brand" />}</span>
              </div>
            ))}
          </div>
        )}

        {/* บัตร */}
        {method === 'card' && (
          <div className="space-y-4 rounded-card border border-line bg-surface-1 p-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-ink-soft">หมายเลขบัตร</span>
              <input placeholder="1234 5678 9012 3456" className="h-12 w-full rounded-xl border border-line bg-surface-0 px-3 text-sm outline-none focus:ring-2 focus:ring-brand" />
            </label>
            <div className="flex gap-3">
              <label className="flex-1"><span className="mb-1.5 block text-xs font-medium text-ink-soft">วันหมดอายุ</span>
                <input placeholder="MM/YY" className="h-12 w-full rounded-xl border border-line bg-surface-0 px-3 text-sm outline-none focus:ring-2 focus:ring-brand" /></label>
              <label className="flex-1"><span className="mb-1.5 block text-xs font-medium text-ink-soft">CVV</span>
                <input placeholder="123" className="h-12 w-full rounded-xl border border-line bg-surface-0 px-3 text-sm outline-none focus:ring-2 focus:ring-brand" /></label>
            </div>
          </div>
        )}

        {/* จ่ายทีหลัง / ผ่อน */}
        {method === 'paylater' && (
          <div className="space-y-2.5">
            {[3, 6, 10].map((n) => (
              <div key={n} className="flex items-center justify-between rounded-card border border-line bg-surface-1 p-4">
                <span className="text-sm font-medium text-ink">ผ่อน {n} เดือน</span>
                <span className="text-sm text-ink-soft">฿{fmtBaht(Math.round(plan.price / n))}/เดือน</span>
              </div>
            ))}
          </div>
        )}

        {/* IAP */}
        {method === 'iap' && (
          <div className="rounded-card border border-line bg-surface-1 p-5 text-center">
            <p className="text-sm text-ink-soft">ระบบจะเปิดหน้าต่างชำระเงินของ App Store / Google Play</p>
          </div>
        )}

        {/* อัปโหลดสลิป (เฉพาะ PromptPay/โอน) */}
        {meta.needsSlip && (
          <button
            onClick={() => setSlipUploaded(true)}
            className={`mt-4 flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed p-6 ${slipUploaded ? 'border-success bg-success/5' : 'border-line bg-surface-1'}`}
          >
            {slipUploaded ? <Check size={28} className="text-success" /> : <Upload size={28} className="text-ink-mute" />}
            <span className={`text-sm font-medium ${slipUploaded ? 'text-success' : 'text-ink-soft'}`}>
              {slipUploaded ? 'อัปโหลดสลิปแล้ว' : 'อัปโหลดสลิปการโอน'}
            </span>
          </button>
        )}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[440px] border-t border-line bg-surface-1 p-4">
        <button
          onClick={finish}
          disabled={meta.needsSlip && !slipUploaded}
          className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          {meta.needsSlip ? 'ส่งสลิปเพื่อยืนยัน' : method === 'iap' ? 'ชำระผ่าน Store' : 'ชำระเงิน'}
        </button>
      </div>
    </div>
  )
}
