import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import PromoBar from './PromoBar'
import AnnouncementBar from './AnnouncementBar'
import logoFull from '../../assets/media/full-icon.png'

type NavItem = { label: string; to?: string; href?: string; end?: boolean }
// nav bar เดียว ใช้ทุก Page — "คลิป" = แอปนี้เอง (internal, active) · หน้าอื่น → /site (marketing)
const navLinks: NavItem[] = [
  { label: 'หน้าแรก', to: '/landing' },
  { label: 'ชั้นเรียน', to: '/grade' },
  { label: 'คลิป', to: '/', end: true },
  { label: 'คอร์สเรียน', to: '/courses' },
  { label: 'บทความ', to: '/articles' },
  { label: 'คำถามที่พบบ่อย', to: '/faq' },
]

/** Top-nav shell — PromoBar + Nav + AnnouncementBar (component เดียว ใช้ทุก Page) */
export default function DesktopNav() {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-30">
      <PromoBar />

      <header className="border-b border-line bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-6 px-6">
          <NavLink to="/" className="flex shrink-0 items-center">
            <img src={logoFull} alt="NOCK ACADEMY" className="h-9 w-auto" />
          </NavLink>

          <nav className="ml-2 hidden items-center gap-4 md:flex lg:ml-4 lg:gap-6">
            {navLinks.map((l, i) => {
              const base = `whitespace-nowrap text-sm font-medium transition-colors hover:text-brand ${
                i >= 3 ? 'hidden lg:block' : ''
              }`
              return l.href ? (
                <a key={i} href={l.href} className={`${base} text-ink-soft`}>{l.label}</a>
              ) : (
                <NavLink
                  key={i}
                  to={l.to!}
                  end={l.end}
                  className={({ isActive }) => `${base} ${isActive ? 'text-brand' : 'text-ink-soft'}`}
                >
                  {l.label}
                </NavLink>
              )
            })}
          </nav>

          {/* Profile — โชว์ชื่อผู้ใช้เมื่อ login แล้ว, ไม่งั้นเป็นปุ่มเข้าสู่ระบบ/สมัคร */}
          <div className="ml-auto flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="text-right leading-tight">
                    <p className="text-sm font-semibold text-ink">ณัฐกิจ บ. (โจ้)</p>
                    <div className="flex items-center justify-end gap-1">
                      <span className="rounded-pill bg-math px-1.5 py-0.5 text-[10px] font-semibold text-math-ink">Premium</span>
                      <span className="rounded-pill bg-science px-1.5 py-0.5 text-[10px] font-semibold text-science-ink">Premium+</span>
                    </div>
                  </div>
                </div>
                <img
                  src="https://api.dicebear.com/9.x/adventurer/svg?seed=Joe"
                  alt="โปรไฟล์"
                  className="h-10 w-10 rounded-full border border-line bg-surface-2 object-cover"
                />
                <span className="rounded-pill bg-premium/15 px-2 py-1 text-xs font-semibold text-premium">ป.6</span>
                <button aria-label="เมนู" className="text-ink-mute hover:text-ink">
                  <ChevronDown size={18} />
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/auth')} className="rounded-pill border border-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand">
                  เข้าสู่ระบบ
                </button>
                <button onClick={() => navigate('/auth')} className="rounded-pill bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark">
                  สมัครฟรี
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <AnnouncementBar />
    </div>
  )
}
