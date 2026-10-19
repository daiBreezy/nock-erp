"use client"

import type { ReactNode } from "react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"

// owner 2026-10-19 ("เปิด Link จาก Line rich menu ช้าโคตรๆ"): the staff shell brings the whole ERP store, the demo data
// and the 4,000-phrase dictionary — parents' pages (/liff) never use them, so the shell is only loaded for staff pages
// and a phone in LINE downloads just the parent page.
const AppShell = dynamic(() => import("./app-shell").then((m) => m.AppShell))

export function ShellGate({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  if (pathname.startsWith("/liff")) return <>{children}</>
  return <AppShell>{children}</AppShell>
}
