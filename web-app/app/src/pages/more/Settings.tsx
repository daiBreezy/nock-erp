import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Globe, Award, Receipt, RotateCcw, UserX } from 'lucide-react'

export default function Settings() {
  const navigate = useNavigate()
  const [lang, setLang] = useState<'th' | 'en'>('th')

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">การตั้งค่าทั่วไป</h1>
      </header>

      <div className="space-y-5 px-4 pt-4">
        {/* ภาษา */}
        <div>
          <p className="mb-2 px-1 text-xs font-medium text-ink-mute">ภาษา</p>
          <div className="flex items-center gap-3 rounded-card border border-line bg-surface-1 px-4 py-3.5">
            <Globe size={20} className="text-brand" />
            <span className="flex-1 text-sm font-medium text-ink">ภาษาที่ใช้</span>
            <div className="flex rounded-pill bg-surface-2 p-0.5 text-xs">
              <button onClick={() => setLang('th')} className={`rounded-pill px-3 py-1 ${lang === 'th' ? 'bg-brand text-white' : 'text-ink-soft'}`}>ไทย</button>
              <button onClick={() => setLang('en')} className={`rounded-pill px-3 py-1 ${lang === 'en' ? 'bg-brand text-white' : 'text-ink-soft'}`}>EN</button>
            </div>
          </div>
        </div>

        {/* บัญชีและการเงิน */}
        <div>
          <p className="mb-2 px-1 text-xs font-medium text-ink-mute">บัญชีและการเงิน</p>
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-1">
            {[
              { label: 'แชร์ใบรับรองกับผู้ปกครอง', Icon: Award },
              { label: 'ประวัติการเงิน', Icon: Receipt },
              { label: 'ประวัติเรียกคืนการซื้อ', Icon: RotateCcw },
            ].map((r) => (
              <button key={r.label} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                <r.Icon size={20} className="text-brand" />
                <span className="flex-1 text-sm font-medium text-ink">{r.label}</span>
                <ChevronRight size={18} className="text-ink-mute" />
              </button>
            ))}
          </div>
        </div>

        {/* บัญชี */}
        <div className="overflow-hidden rounded-card border border-line bg-surface-1">
          <button className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
            <UserX size={20} className="text-live" />
            <span className="flex-1 text-sm font-medium text-live">ยกเลิกการใช้งานบัญชี</span>
          </button>
        </div>
      </div>
    </div>
  )
}
