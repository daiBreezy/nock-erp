import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import { systemUpdates } from '../../data/mock'

// แถบ announcement มาตรฐานเดียว (สีแดงส้มอ่อน) — เต็มความกว้าง ติดใต้ nav เหมือน Web
export default function SystemUpdate() {
  const [open, setOpen] = useState(true)
  if (!open) return null

  const u = systemUpdates[0]

  return (
    <div className="flex h-12 items-center gap-2.5 px-4" style={{ background: '#ffe7e8' }}>
      <Megaphone size={18} style={{ color: '#b3262a' }} className="shrink-0" />
      <p className="min-w-0 flex-1 truncate text-sm" style={{ color: '#b3262a' }}>
        <span className="font-semibold">อัปเดตระบบ:</span> {u.title} · {u.detail}{' '}
        <button className="font-semibold underline" style={{ color: '#b3262a' }}>ลองเลย</button>
      </p>
      <button onClick={() => setOpen(false)} aria-label="ปิด" className="shrink-0" style={{ color: '#b3262a' }}>
        <X size={18} />
      </button>
    </div>
  )
}
