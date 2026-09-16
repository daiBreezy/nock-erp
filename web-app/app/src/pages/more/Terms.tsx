import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, FileText, Shield, BadgeCheck } from 'lucide-react'

export default function Terms() {
  const navigate = useNavigate()
  const rows = [
    { label: 'ข้อกำหนดการใช้งาน', Icon: FileText },
    { label: 'นโยบายความเป็นส่วนตัว', Icon: Shield },
    { label: 'การรับรอง', Icon: BadgeCheck },
  ]
  return (
    <div className="min-h-screen bg-surface-0">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">ข้อกำหนดและเงื่อนไข</h1>
      </header>

      <div className="px-4 pt-4">
        <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-1">
          {rows.map((r) => (
            <button key={r.label} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
              <r.Icon size={20} className="text-brand" />
              <span className="flex-1 text-sm font-medium text-ink">{r.label}</span>
              <ChevronRight size={18} className="text-ink-mute" />
            </button>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-ink-mute">Application Version 1.0.0 (build 100)</p>
      </div>
    </div>
  )
}
