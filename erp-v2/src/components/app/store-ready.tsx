"use client"

import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { LoaderCircleIcon } from "lucide-react"
import { useStore } from "@/store/store"

/**
 * Holds the staff screens until the saved data has been read from IndexedDB (owner 2026-11-18) — otherwise a screen would paint the
 * sample data for a moment and an effect could act on it. Reading takes a few tenths of a second.
 */
export function StoreReady({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (useStore.persist.hasHydrated()) { setReady(true); return } // eslint-disable-line react-hooks/set-state-in-effect
    return useStore.persist.onFinishHydration(() => setReady(true))
  }, [])
  if (!ready) return <div className="grid min-h-screen place-items-center text-muted-foreground"><LoaderCircleIcon className="size-7 animate-spin" /></div>
  return <>{children}</>
}
