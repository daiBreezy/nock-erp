import type { ReactNode } from "react"

/**
 * Design System › Empty (2026-11-10): "ว่างต้องบอก" — one short line saying why there is nothing here.
 * One component for the whole app (was three local copies: parent app, staff panel, reports). No store import, so
 * the LINE parent app can use it too. Optional `action` = one link-style button (e.g. "ล้างตัวกรอง").
 */
export function Empty({ children, text, action }: { children?: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      <p>{children ?? text}</p>
      {action}
    </div>
  )
}
