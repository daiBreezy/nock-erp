"use client"

import type { ReactNode } from "react"
import { AppShell } from "./app-shell"
import { StoreReady } from "./store-ready"

/** the staff shell, shown once the saved data is in (loaded on demand — parents' pages never come here) */
export function AppShellReady({ children }: { children: ReactNode }) {
  return <StoreReady><AppShell>{children}</AppShell></StoreReady>
}
