"use client"

import { cn } from "@/lib/utils"
import { tx } from "@/lib/i18n"

/**
 * A form from LINE whose phone / LINE account matches a family on file (owner 2026-10-29): the system suggests,
 * the admin decides — same family (add the child to it) or a different family (create a new one).
 */
export function FamilyMatchChoice({ familyName, reason, newFamily, onChange, className }: { familyName: string; reason: string; newFamily: boolean; onChange: (newFamily: boolean) => void; className?: string }) {
  const opt = (on: boolean) => cn("flex-1 rounded-lg px-2 py-1.5 text-left text-xs ring-1 ring-inset", on ? "bg-background font-medium ring-primary" : "ring-transparent hover:bg-background/60")
  return (
    <div className={cn("space-y-1.5 rounded-lg bg-amber-50 p-2 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100", className)}>
      <p className="text-xs">{tx("พบครอบครัว \"{0}\" ที่อาจเป็นครอบครัวเดียวกัน ({1}) — เลือกก่อนอนุมัติ", [familyName, tx(reason)])}</p>
      <div className="flex gap-1.5" role="radiogroup" aria-label="ครอบครัว">
        <button type="button" role="radio" aria-checked={!newFamily} className={opt(!newFamily)} onClick={() => onChange(false)}>รวม — ใช้ครอบครัวนี้</button>
        <button type="button" role="radio" aria-checked={newFamily} className={opt(newFamily)} onClick={() => onChange(true)}>ไม่ใช่ — สร้างครอบครัวใหม่</button>
      </div>
    </div>
  )
}
