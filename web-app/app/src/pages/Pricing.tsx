import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import PricingPlans from '../components/pricing/PricingPlans'

export default function Pricing() {
  const navigate = useNavigate()
  return (
    <div
      className="min-h-screen pb-10"
      style={{ background: 'linear-gradient(180deg, #F6F7F9 0%, #FFF0F0 40%, #FFB9BB 75%, #FF5A5E 100%)' }}
    >
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(246,247,249,0.85)', backdropFilter: 'blur(8px)' }}>
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">แพ็กเกจทั้งหมด</h1>
      </header>
      {/* PricingPlans = component เดียวกับที่ใช้บน Web */}
      <div className="px-4 pt-4">
        <PricingPlans />
      </div>
    </div>
  )
}
