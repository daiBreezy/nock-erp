import { NavLink } from 'react-router-dom'
import { appNavItems } from '../nav'

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface-1/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex max-w-[720px] items-stretch justify-around px-2 pb-2 pt-2">
        {appNavItems.map(({ to, label, Icon }) => (
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
