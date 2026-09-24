"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSyncExternalStore, type ReactNode } from "react"
import { BellIcon, LockIcon } from "lucide-react"
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { can, ROLE_LABEL, type Permission } from "@/domain/rules/permissions"
import { useStore } from "@/store/store"
import { NAV, navFor } from "./nav"
import { DemoPanel } from "./demo-panel"
import { NativeSelect } from "./native-select"

const noopSubscribe = () => () => {}

export function AppShell({ children }: { children: ReactNode }) {
  // Persisted client-side store → render only after mount to avoid hydration mismatches.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false)
  if (!mounted)
    return (
      <div className="flex h-screen gap-4 p-4">
        <Skeleton className="h-full w-60" />
        <Skeleton className="h-full flex-1" />
      </div>
    )
  return <Shell>{children}</Shell>
}

function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const branches = useStore((s) => s.branches)
  const branchId = useStore((s) => s.branchId)
  const setBranch = useStore((s) => s.setBranch)
  const current = navFor(pathname)
  const allowed = !current || canAny(me, current.perm)

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-1 py-1.5">
            <div className="grid size-8 place-items-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">N</div>
            <div className="leading-tight group-data-[collapsible=icon]:hidden">
              <div className="text-sm font-semibold">NockERP</div>
              <div className="text-xs text-muted-foreground">Prototype v2</div>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          {NAV.map((g) => {
            const items = g.items.filter((i) => canAny(me, i.perm)) // G1: hide what the role can't use
            if (!items.length) return null
            return (
              <SidebarGroup key={g.group}>
                <SidebarGroupLabel>{g.group}</SidebarGroupLabel>
                <SidebarMenu>
                  {items.map((i) => (
                    <SidebarMenuItem key={i.href}>
                      <SidebarMenuButton isActive={current?.href === i.href} tooltip={i.label} render={<Link href={i.href} />}>
                        <i.icon />
                        <span>{i.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
            )
          })}
        </SidebarContent>
        <SidebarFooter>
          <DemoPanel />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/95 px-3 backdrop-blur md:px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-1 h-5" />
          <h1 className="truncate text-sm font-medium">{current?.label ?? "NockERP"}</h1>
          <div className="ml-auto flex items-center gap-2">
            <NativeSelect
              aria-label="สาขา"
              className="h-8 w-36 sm:w-44"
              value={branchId}
              onChange={(e) => setBranch(e.target.value)}
              options={branches.filter((b) => me.branchIds.includes(b.id)).map((b) => ({ value: b.id, label: `สาขา${b.name}` }))}
            />
            <NotificationBell />
            <div className="hidden text-right leading-tight sm:block">
              <div className="text-xs font-medium">{me.nickname}</div>
              <div className="text-[11px] text-muted-foreground">{me.roles.map((r) => ROLE_LABEL[r]).join(", ")}</div>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-3 md:p-6">{allowed ? children : <NoAccess />}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function canAny(me: Parameters<typeof can>[0], perm: Permission | Permission[]) {
  return (Array.isArray(perm) ? perm : [perm]).some((p) => can(me, p))
}

function NotificationBell() {
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const count = useStore((s) => s.notifications.filter((n) => !n.read && n.roles.some((r) => me.roles.includes(r))).length)
  return (
    <Link href="/notifications" className="relative grid size-8 place-items-center rounded-lg hover:bg-muted" aria-label="แจ้งเตือน">
      <BellIcon className="size-4" />
      {count > 0 && <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">{count}</span>}
    </Link>
  )
}

function NoAccess() {
  return (
    <div className="mx-auto mt-20 max-w-sm text-center">
      <LockIcon className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-3 font-semibold">ไม่มีสิทธิ์เข้าหน้านี้</h2>
      <p className="mt-1 text-sm text-muted-foreground">บทบาทของคุณไม่ได้รับสิทธิ์ใช้งานส่วนนี้ ติดต่อผู้จัดการสาขาถ้าต้องการสิทธิ์เพิ่ม</p>
    </div>
  )
}
