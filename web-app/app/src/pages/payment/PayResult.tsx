import { useLocation, useNavigate } from 'react-router-dom'
import { Check, Clock } from 'lucide-react'
import { fmtBaht } from '../../data/packages'

type Plan = { name: string; price: number }

export default function PayResult() {
  const navigate = useNavigate()
  const location = useLocation()
  const { plan, needsVerify } = (location.state as { plan: Plan; needsVerify: boolean }) || {
    plan: { name: 'Premium Plus', price: 2705 },
    needsVerify: false,
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-0 px-6 text-center">
      <div className={`flex h-20 w-20 items-center justify-center rounded-full ${needsVerify ? 'bg-subject-math' : 'bg-success/10'}`}>
        {needsVerify ? <Clock size={40} className="text-subject-math-ink" /> : <Check size={40} className="text-success" />}
      </div>
      <h1 className="mt-5 text-xl font-semibold text-ink">
        {needsVerify ? 'ส่งสลิปเรียบร้อย' : 'ชำระเงินสำเร็จ'}
      </h1>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">
        {needsVerify
          ? 'ทีมงานกำลังตรวจสอบสลิป จะแจ้งผลภายใน 24 ชั่วโมง คุณจะได้รับการแจ้งเตือนเมื่อเปิดใช้งานแล้ว'
          : `เปิดใช้งาน ${plan.name} แล้ว เริ่มดู Live สดและเนื้อหาทั้งหมดได้เลย`}
      </p>

      <div className="mt-6 w-full max-w-xs rounded-2xl bg-surface-1 p-4 text-left">
        <div className="flex items-center justify-between">
          <span className="text-sm text-ink-soft">{plan.name}</span>
          <span className="text-sm font-semibold text-ink">฿{fmtBaht(plan.price)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-ink-soft">สถานะ</span>
          <span className={`text-sm font-medium ${needsVerify ? 'text-subject-math-ink' : 'text-success'}`}>
            {needsVerify ? 'รอตรวจสอบ' : 'เปิดใช้งานแล้ว'}
          </span>
        </div>
      </div>

      <button
        onClick={() => navigate('/', { replace: true })}
        className="mt-8 w-full max-w-xs rounded-2xl bg-brand py-4 text-base font-semibold text-white"
      >
        เสร็จสิ้น
      </button>
    </div>
  )
}
