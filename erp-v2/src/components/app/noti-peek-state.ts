"use client"

// Hover state of the แจ้งเตือน menu (owner 2026-11-16): while it is on, the Noti column at the right edge of the screen
// shows the latest team notifications instead of the live popups. A tiny external store so the sidebar row, the Noti
// viewport and the peek list all read the same flag. Leaving is delayed so the mouse can travel from the menu to the cards.
import * as React from "react"

let open = false
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()
const set = (v: boolean) => { if (open !== v) { open = v; listeners.forEach((l) => l()) } }

export function peekEnter() { clearTimeout(timer); set(true) }
export function peekLeave(delay = 700) { clearTimeout(timer); timer = setTimeout(() => set(false), delay) }
export function peekClose() { clearTimeout(timer); set(false) }

export function usePeekOpen() {
  return React.useSyncExternalStore((cb) => { listeners.add(cb); return () => { listeners.delete(cb) } }, () => open, () => false)
}
