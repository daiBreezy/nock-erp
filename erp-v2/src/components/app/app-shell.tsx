"use client"

import { periodHours } from "./period-banner"
import { periodOn } from "@/domain/rules/scheduling"
import { fmtDate, toDateStr } from "@/domain/dates"
import { useBranch, useNow } from "@/lib/hooks"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { usePublishParentViews } from "@/lib/parent-app"
import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react"
import { ArrowLeftRightIcon, BellIcon, CheckIcon, ChevronDownIcon, GlobeIcon, LockIcon, MapPinIcon, SearchIcon, SunIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { branchText, nm, UI_LANGS, useT, useUiLang } from "@/lib/i18n"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { navBadges } from "@/domain/rules/badges"
import { isUnread, visibleTo } from "@/domain/rules/notifications"
import { can, inBranch, ROLE_LABEL, type Permission } from "@/domain/rules/permissions"
import { useStore } from "@/store/store"
import { cn } from "@/lib/utils"
import { LeadSheet } from "@/components/crm/lead-sheet"
import { Pill } from "./badges"
import { CustomerPicker } from "./customer-picker"
import { StudentSheet } from "./student-sheet"
import { avatarTone, initial } from "./subject-color"
import { NAV, navFor } from "./nav"
import { DemoPanel } from "./demo-panel"
import { FocusBanner } from "./focus-banner"

const noopSubscribe = () => () => {}

/** keeps the parent app (LINE) up to date with this ERP's data — staff screens only */
function ParentAppPublisher() {
  usePublishParentViews()
  return null
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  // Persisted client-side store → render only after mount to avoid hydration mismatches.
  // (hook called unconditionally, before any early return, per the rules of hooks)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  // /liff/* is the parent-facing form, opened inside LINE by people who have never seen this ERP and
  // have no staff/branch data of their own — it must never render the staff sidebar or touch the
  // zustand store (that store is this browser's *own* seed data, meaningless to a parent's device).
  if (pathname.startsWith("/liff")) return <>{children}</>
  // printable documents (invoice / receipt / credit note): just the paper, nothing around it
  if (pathname.startsWith("/print")) return <>{children}</>
  if (!mounted)
    return (
      <div className="flex h-screen gap-4 p-4">
        <Skeleton className="h-full w-60" />
        <Skeleton className="h-full flex-1" />
      </div>
    )
  return <><ParentAppPublisher /><Shell>{children}</Shell></>
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const me = useStore((s) => s.me())
  const branch = useBranch()
  const current = navFor(pathname)
  const allowed = !current || canAny(me, current.perm)
  const now = useNow(30_000)
  const conversations = useStore((s) => s.conversations)
  const leads = useStore((s) => s.leads)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const invoices = useStore((s) => s.invoices)
  const badges = navBadges({ conversations, leads, sessions, attendance, summaries, invoices }, me, branch.id, now)
  const t = useT()
  const lang = useUiLang((s) => s.lang)

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        {/* top: logo, then search + notifications — always in sight (owner 2026-09-29) */}
        <SidebarHeader className="gap-2">
          <Link href="/" className="flex h-10 items-center px-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0" aria-label="NockAcademy">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand file */}
            <img src="/brand/logo-full.png" alt="NockAcademy" className="h-8 w-auto group-data-[collapsible=icon]:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand file */}
            <img src="/brand/logo-icon.png" alt="NockAcademy" className="hidden size-8 group-data-[collapsible=icon]:block" />
          </Link>
          <SmartSearch />
          <NotificationCard />
        </SidebarHeader>
        <SidebarContent>
          {NAV.map((g) => {
            const items = g.items.filter((i) => canAny(me, i.perm)) // G1: hide what the role can't use
            if (!items.length) return null
            return (
              <SidebarGroup key={g.group}>
                <SidebarGroupLabel>{t(g.group)}</SidebarGroupLabel>
                <SidebarMenu>
                  {items.map((i) => {
                    const n = badges[i.href] ?? 0
                    return (
                      <SidebarMenuItem key={i.href}>
                        <SidebarMenuButton isActive={current?.href === i.href} tooltip={n ? `${t(i.label)} · ${n}` : t(i.label)} render={<Link href={i.href} />} className={cn(i.soon && "text-muted-foreground")}>
                          <span className="relative">
                            <i.icon className="size-4" />
                            {n > 0 && <span className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-red-600 ring-2 ring-sidebar group-data-[collapsible=icon]:block" />}
                          </span>
                          <span>{t(i.label)}</span>
                          {i.soon && <Pill className="ml-auto px-1.5 py-0 text-[10px]">{t("เร็วๆ นี้")}</Pill>}
                        </SidebarMenuButton>
                        {n > 0 && <SidebarMenuBadge className="rounded-full bg-red-600 text-white peer-hover/menu-button:text-white peer-data-active/menu-button:text-white">{n > 99 ? "99+" : n}</SidebarMenuBadge>}
                      </SidebarMenuItem>
                    )
                  })}
                </SidebarMenu>
              </SidebarGroup>
            )
          })}
        </SidebarContent>
        <SidebarFooter className="gap-2">
          <DemoPanel />
          <UserCard />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <h1 className="truncate text-sm font-medium">{current ? t(current.label) : "NockERP"}</h1>
          <div className="ml-auto flex items-center gap-2">
            <CurrentPeriodChip />
            {/* branch stays visible on phones too, where the sidebar is hidden */}
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"><MapPinIcon className="size-3.5" />{t("สาขา")}{branchText(branch)}</span>
            <LanguageChip />
          </div>
        </header>
        {/* calendar sits on grey so the boards stand out (owner 2026-09-30) */}
        {/* keyed on the language: switching it re-renders every page so all t() calls pick it up */}
        <main key={lang} className={cn("min-w-0 flex-1 p-3 md:p-6", pathname.startsWith("/calendar") && "bg-zinc-100 dark:bg-zinc-900")}>{allowed ? <><FocusBanner />{children}</> : <NoAccess />}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

/** "Smart search" — one box for students, families and leads (same picker as everywhere else) */
function SmartSearch() {
  const [open, setOpen] = useState(false)
  const [studentId, setStudentId] = useState<string | null>(null)
  const [leadId, setLeadId] = useState<string | null>(null)
  const router = useRouter()
  const t = useT()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(true) } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} title={`${t("ค้นหา")} (⌘K)`}
        className="flex h-9 w-full items-center gap-2 rounded-full border bg-background px-3 text-sm text-muted-foreground hover:bg-muted group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate group-data-[collapsible=icon]:hidden">{t("ค้นหานักเรียน / ครอบครัว / Lead")}</span>
        <kbd className="ml-auto rounded border px-1 text-[10px] group-data-[collapsible=icon]:hidden">⌘K</kbd>
      </button>
      {open && (
        <CustomerPicker kinds={["student", "family", "lead"]} title="ค้นหา" onClose={() => setOpen(false)}
          onConfirm={(r) => {
            setOpen(false)
            if (r.kind === "student") setStudentId(r.id)
            else if (r.kind === "lead") setLeadId(r.id)
            else router.push("/families")
          }} />
      )}
      <StudentSheet studentId={studentId} onClose={() => setStudentId(null)} />
      <LeadSheet leadId={leadId} onClose={() => setLeadId(null)} />
    </>
  )
}

/** แจ้งเตือน (owner 2026-10-07): a plain menu row like every other item — one line, no outline, red count badge */
function NotificationCard() {
  const me = useStore((s) => s.me())
  const count = useStore((s) => s.notifications.filter((n) => visibleTo(n, me) && isUnread(n, me)).length)
  const pathname = usePathname()
  const t = useT()
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton isActive={pathname === "/notifications"} tooltip={count ? `${t("แจ้งเตือน")} · ${count}` : t("แจ้งเตือน")} render={<Link href="/notifications" />}>
          <span className="relative">
            <BellIcon className="size-4" />
            {count > 0 && <span className="absolute -top-1 -right-1 hidden size-2 rounded-full bg-red-600 ring-2 ring-sidebar group-data-[collapsible=icon]:block" />}
          </span>
          <span>{t("แจ้งเตือน")}</span>
        </SidebarMenuButton>
        {count > 0 && <SidebarMenuBadge className="rounded-full bg-red-600 text-white peer-hover/menu-button:text-white peer-data-active/menu-button:text-white">{count > 99 ? "99+" : count}</SidebarMenuBadge>}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

/** bottom: who I am, my role, and — never cut off — which branch I'm working in (owner 2026-09-29) */
function UserCard() {
  const me = useStore((s) => s.me())
  const branches = useStore((s) => s.branches)
  const branchId = useStore((s) => s.branchId)
  const setBranch = useStore((s) => s.setBranch)
  const branch = useBranch()
  // Director / Super Admin / Area Manager: every branch · others: their own branches only (same rule as approvals)
  const mine = branches.filter((b) => inBranch(me, b.id) && (b.active || b.id === branchId)).sort((a, b) => a.name.localeCompare(b.name, "th"))
  const [open, setOpen] = useState(false)
  const t = useT()
  return (
    <div className="rounded-2xl border bg-background p-2.5 group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0"
      title={`${me.name} · ${me.roles.map((r) => ROLE_LABEL[r]).join(", ")} · สาขา${branch.name}`}>
      <div className="flex items-center gap-2.5">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-full font-semibold group-data-[collapsible=icon]:size-8", avatarTone(me.id))}>{initial(me.nickname)}</span>
        <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
          <div className="text-sm font-semibold break-words">{nm(me.nickname)} <span className="font-normal text-muted-foreground">{me.name !== me.nickname ? nm(me.name) : ""}</span></div>
          <div className="mt-0.5 flex flex-wrap gap-1">{me.roles.map((r) => <Pill key={r} tone="blue" className="px-1.5 py-0 text-[10px]">{ROLE_LABEL[r]}</Pill>)}</div>
        </div>
      </div>
      <div className="mt-2 space-y-1 group-data-[collapsible=icon]:hidden">
        {mine.length > 1 ? (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger render={<button type="button" className="flex w-full items-start gap-1.5 rounded-xl px-1 py-0.5 text-left text-sm font-medium text-primary hover:bg-primary/10" />}>
              <MapPinIcon className="mt-0.5 size-4 shrink-0" /><span className="break-words">{t("สาขา")}{branchText(branch)}</span>
              <ArrowLeftRightIcon className="mt-0.5 ml-auto size-3.5 shrink-0" />
            </PopoverTrigger>
            <PopoverContent side="right" align="end" className="w-64 p-1.5">
              <p className="px-2 py-1 text-xs text-muted-foreground">{t("เลือกสาขา")} ({mine.length})</p>
              <ul className="max-h-80 overflow-y-auto">
                {mine.map((b) => (
                  <li key={b.id}>
                    <button type="button" onClick={() => { setBranch(b.id); setOpen(false) }}
                      className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted", b.id === branchId && "bg-primary/10 font-medium text-primary")}>
                      <span className="min-w-0 flex-1 break-words">{t("สาขา")}{branchText(b)}</span>
                      <span className="text-[10px] text-muted-foreground">{b.code}</span>
                      {!b.active && <Pill className="px-1 py-0 text-[10px]">{t("ปิด")}</Pill>}
                      {b.id === branchId && <CheckIcon className="size-4" />}
                    </button>
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        ) : (
          <div className="flex items-start gap-1.5 text-sm font-medium text-primary"><MapPinIcon className="mt-0.5 size-4 shrink-0" /><span className="break-words">{t("สาขา")}{branchText(branch)}</span></div>
        )}
      </div>
    </div>
  )
}

function canAny(me: Parameters<typeof can>[0], perm: Permission | Permission[]) {
  return (Array.isArray(perm) ? perm : [perm]).some((p) => can(me, p))
}

/** Always-visible reminder that today falls in a special period (e.g. Summer) with different hours. */
function CurrentPeriodChip() {
  const branch = useBranch()
  const today = toDateStr(useNow())
  const p = periodOn(branch, today)
  const t = useT()
  if (!p) return null
  return (
    <Link href={`/settings/branches/${branch.id}`} title={`${p.name}: ${fmtDate(p.from)} – ${fmtDate(p.to, { year: true })} · ${periodHours(p)}`}
      className="hidden items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-200 md:flex">
      <SunIcon className="size-3.5 text-amber-600" /> {t("ช่วง")} {p.name} · {t("ถึง")} {fmtDate(p.to)}
    </Link>
  )
}

function NoAccess() {
  const t = useT()
  return (
    <div className="mx-auto mt-20 max-w-sm text-center">
      <LockIcon className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-3 font-semibold">{t("ไม่มีสิทธิ์เข้าหน้านี้")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("บทบาทของคุณไม่ได้รับสิทธิ์ใช้งานส่วนนี้ ติดต่อผู้จัดการสาขาถ้าต้องการสิทธิ์เพิ่ม")}</p>
    </div>
  )
}

/** owner 2026-10-07: language chip after the branch — English / ไทย / 日本語 (this person, this browser) */
function LanguageChip() {
  const { lang, setLang } = useUiLang()
  const t = useT()
  useEffect(() => { document.documentElement.lang = lang }, [lang])
  const cur = UI_LANGS.find((l) => l.key === lang)!
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<button type="button" aria-label={t("ภาษา")} className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium hover:bg-muted" />}>
        <GlobeIcon className="size-3.5 text-muted-foreground" />{cur.short}<ChevronDownIcon className="size-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("ภาษา")}</DropdownMenuLabel>
          {UI_LANGS.map((l) => (
            <DropdownMenuItem key={l.key} onClick={() => setLang(l.key)}>
              {l.label}{l.key === lang && <CheckIcon className="ml-auto size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
