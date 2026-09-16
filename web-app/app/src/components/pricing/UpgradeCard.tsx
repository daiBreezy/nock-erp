import { useNavigate } from 'react-router-dom'
import { Crown, ChevronRight } from 'lucide-react'
import { plusPricing, fmtBaht } from '../../data/packages'

// Card ทองน่ารัก (pastel gold) ผสม primary/ขาว — ขนาดเท่าการ์ดห้องทำการบ้าน, ไม่มีปุ่ม CTA
export default function UpgradeCard() {
  const navigate = useNavigate()
  const plus = plusPricing()
  return (
    <button
      onClick={() => navigate('/pricing')}
      className="flex w-full items-center gap-3 rounded-card p-3.5 text-left active:scale-[0.99]"
      style={{
        background:
          'linear-gradient(135deg, #FFF3D6 0%, #FCE7C0 38%, #FFE3E3 100%)',
      }}
    >
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white"
        style={{ background: 'linear-gradient(135deg, #F6C66B 0%, #EBA94B 100%)' }}
      >
        <Crown size={24} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold" style={{ color: '#8A5A12' }}>
          อัปเกรดเป็น Premium Plus
        </p>
        <p className="mt-0.5 text-xs" style={{ color: '#A06A2A' }}>
          ดู Live สดได้ · เริ่ม ฿{fmtBaht(plus.price)} · ดู Package ทั้งหมด
        </p>
      </div>
      <ChevronRight size={20} style={{ color: '#B07A2E' }} />
    </button>
  )
}
