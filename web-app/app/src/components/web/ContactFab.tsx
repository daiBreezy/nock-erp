import { useState } from 'react'
import type { ComponentType } from 'react'
import { Phone, MessagesSquare, X } from 'lucide-react'
import { LineIcon, MessengerIcon } from '../BrandIcons'

/* Float button ติดต่อแอดมิน — hover (desktop) หรือ กด (mobile) แล้วกางไอคอนช่องทางติดต่อ
   ลิงก์ด้านล่างเป็น placeholder รอใส่ของจริง */
type Action = {
  label: string
  href: string
  bg: string
  icon: ComponentType<{ size?: number }>
  external?: boolean
}

const actions: Action[] = [
  { label: 'Line', href: 'https://line.me/R/ti/p/@nockacademy', bg: 'bg-[#06C755]', icon: LineIcon, external: true },
  { label: 'Messenger', href: 'https://m.me/nockacademy', bg: 'bg-[#0084FF]', icon: MessengerIcon, external: true },
  { label: 'โทรหาเรา', href: 'tel:021234567', bg: 'bg-[#22C55E]', icon: Phone },
]

export default function ContactFab() {
  const [open, setOpen] = useState(false)

  return (
    <div
      className="group fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* รายการช่องทาง — เปิดด้วย hover (CSS) หรือ กด (state) */}
      <div
        className={`flex flex-col items-end gap-3 transition-all duration-200 group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100 ${
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
        }`}
      >
        {actions.map((a, i) => (
          <a
            key={a.label}
            href={a.href}
            {...(a.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            className="flex items-center gap-2.5"
            style={{ transitionDelay: open ? `${i * 40}ms` : '0ms' }}
          >
            <span className="rounded-lg bg-ink/85 px-2.5 py-1 text-xs font-medium text-white shadow-md">{a.label}</span>
            <span className={`grid h-12 w-12 place-items-center rounded-full text-white shadow-lg transition-transform hover:scale-110 ${a.bg}`}>
              <a.icon size={24} />
            </span>
          </a>
        ))}
      </div>

      {/* ปุ่มหลัก */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="ติดต่อแอดมิน"
        aria-expanded={open}
        className="grid h-14 w-14 place-items-center rounded-full bg-brand text-white shadow-xl transition-transform hover:scale-105"
      >
        {open ? <X size={26} /> : <MessagesSquare size={26} />}
      </button>
    </div>
  )
}
