import { NavLink } from 'react-router-dom'
import { appNavItems } from '../nav'

/** Navigation Rail (MD3) — เมนูข้างซ้ายของ App บน Tablet แนวนอน */
export default function NavRail() {
  return (
    <nav className="sticky top-0 flex h-[100dvh] w-[84px] shrink-0 flex-col items-center gap-3 border-r border-line bg-surface-1 py-4 pl-[env(safe-area-inset-left)]">
      <span aria-label="NOCK ACADEMY" className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white">N</span>
      {appNavItems.map(({ to, label, Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className="group flex w-full flex-col items-center gap-1 text-[11px]">
          {({ isActive }) => (
            <>
              <span
                className={`flex h-8 w-14 items-center justify-center rounded-pill transition-colors ${
                  isActive ? 'bg-brand-soft text-brand' : 'text-ink-mute group-hover:bg-surface-2'
                }`}
              >
                <Icon size={22} strokeWidth={2} />
              </span>
              <span className={isActive ? 'font-semibold text-brand' : 'text-ink-mute'}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
