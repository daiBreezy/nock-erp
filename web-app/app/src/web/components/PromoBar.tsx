import { useState } from 'react'
import { Zap, ExternalLink, X } from 'lucide-react'

/** แถบโปรโมชั่นเหนือ Nav — component เดียว ใช้ทุก Page (แก้ที่เดียว = เปลี่ยนทั้งเว็บ) */
export default function PromoBar() {
  const [show, setShow] = useState(true)
  if (!show) return null
  return (
    <div className="relative flex items-center justify-center gap-2 bg-gradient-to-r from-brand to-brand-dark px-4 py-1.5 text-xs font-medium text-white">
      <Zap size={13} className="fill-white" />
      <span>NEW Promotion!</span>
      <a href="#" className="flex items-center gap-1 font-semibold underline underline-offset-2">
        -25% All Packages <ExternalLink size={12} />
      </a>
      <button aria-label="ปิด" onClick={() => setShow(false)} className="absolute right-4 opacity-80 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  )
}
