import { NavLink } from 'react-router-dom'
import { GraduationCap, User, Bell, MoreHorizontal } from 'lucide-react'

const items = [
  { to: '/', label: 'เซนเซย์', Icon: GraduationCap },
  { to: '/profile', label: 'โปรไฟล์', Icon: User },
  { to: '/notifications', label: 'แจ้งเตือน', Icon: Bell },
  { to: '/more', label: 'เพิ่มเติม', Icon: MoreHorizontal },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-1/2 z-20 w-full max-w-[440px] -translate-x-1/2 border-t border-line bg-surface-1/95 backdrop-blur">
      <div className="flex items-stretch justify-around px-2 pb-2 pt-2">
        {items.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-1 rounded-pill py-1 text-[11px] ${
                isActive ? 'text-brand' : 'text-ink-mute'
              }`
            }
          >
            <Icon size={22} strokeWidth={2} />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
