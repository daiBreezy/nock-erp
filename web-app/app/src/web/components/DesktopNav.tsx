import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronDown, Menu, User, LogOut } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import PromoBar from '@/web/components/PromoBar'
import AnnouncementBar from '@/web/components/AnnouncementBar'
import logoFull from '@/assets/media/full-icon.png'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetClose,
} from '@/components/ui/sheet'

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
  const { isLoggedIn, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="sticky top-0 z-30">
      <PromoBar />

      <header className="border-b border-line bg-surface-1/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-6 px-5">
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
                      <Badge className="rounded-pill border-transparent bg-math px-1.5 py-0.5 text-[10px] font-semibold text-math-ink hover:bg-math">Premium</Badge>
                      <Badge className="rounded-pill border-transparent bg-science px-1.5 py-0.5 text-[10px] font-semibold text-science-ink hover:bg-science">Premium+</Badge>
                    </div>
                  </div>
                </div>
                <Avatar className="rounded-full border border-line bg-surface-2">
                  <AvatarImage src="https://api.dicebear.com/9.x/adventurer/svg?seed=Joe" alt="โปรไฟล์" />
                  <AvatarFallback>โจ้</AvatarFallback>
                </Avatar>
                <Badge className="rounded-pill border-transparent bg-premium/15 px-2 py-1 text-xs font-semibold text-premium hover:bg-premium/15">ป.6</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="เมนู" className="h-8 w-8 text-ink-mute hover:text-ink">
                      <ChevronDown size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>บัญชีของฉัน</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      <User size={16} /> โปรไฟล์
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <LogOut size={16} /> ออกจากระบบ
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="hidden items-center gap-3 md:flex">
                <Button variant="outline" onClick={() => navigate('/auth')} className="rounded-pill border-line text-ink-soft hover:border-brand hover:bg-transparent hover:text-brand">
                  เข้าสู่ระบบ
                </Button>
                <Button onClick={() => navigate('/auth')} className="rounded-pill bg-brand font-semibold hover:bg-brand-dark">
                  สมัครฟรี
                </Button>
              </div>
            )}

            {/* เมนูมือถือ (hamburger → Sheet) */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="เมนู" className="text-ink-soft hover:text-brand md:hidden">
                  <Menu size={22} />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <img src={logoFull} alt="NOCK ACADEMY" className="h-8 w-auto" />
                  </SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col">
                  {navLinks.map((l, i) =>
                    l.href ? (
                      <SheetClose asChild key={i}>
                        <a href={l.href} className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-ink-soft hover:bg-surface-2 hover:text-brand">{l.label}</a>
                      </SheetClose>
                    ) : (
                      <SheetClose asChild key={i}>
                        <NavLink
                          to={l.to!}
                          end={l.end}
                          className={({ isActive }) =>
                            `rounded-lg px-3 py-2.5 text-[15px] font-medium hover:bg-surface-2 ${isActive ? 'text-brand' : 'text-ink-soft hover:text-brand'}`
                          }
                        >
                          {l.label}
                        </NavLink>
                      </SheetClose>
                    ),
                  )}
                </nav>
                {!isLoggedIn && (
                  <div className="mt-6 flex flex-col gap-2 border-t border-line pt-4">
                    <SheetClose asChild>
                      <Button variant="outline" onClick={() => navigate('/auth')} className="rounded-pill border-line text-ink-soft hover:border-brand hover:text-brand">
                        เข้าสู่ระบบ
                      </Button>
                    </SheetClose>
                    <SheetClose asChild>
                      <Button onClick={() => navigate('/auth')} className="rounded-pill bg-brand font-semibold hover:bg-brand-dark">
                        สมัครฟรี
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <AnnouncementBar />
    </div>
  )
}
