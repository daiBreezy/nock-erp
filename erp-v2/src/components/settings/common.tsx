"use client"

import { useState, type ReactNode } from "react"
import { CheckIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export function SettingsCard({ title, hint, action, children, className }: { title: string; hint?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5", className)}>
      <div className="mb-3 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold">{title}</h2>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Each card edits only the branch fields it owns and saves them on top of the latest stored branch
 *  (like staging's per-tab Save) — so saving one card never overwrites what another card just saved. */
export function useBranchDraft<K extends keyof Branch>(branch: Branch, keys: K[]) {
  const saveBranch = useStore((s) => s.saveBranch)
  const pick = (x: Branch) => Object.fromEntries(keys.map((k) => [k, x[k]])) as Pick<Branch, K>
  const [draft, setDraft] = useState<Pick<Branch, K>>(() => pick(branch))
  const b: Branch = { ...branch, ...draft }
  return {
    b,
    setB: (next: Branch) => setDraft(pick(next)),
    dirty: JSON.stringify(pick(branch)) !== JSON.stringify(draft),
    reset: () => setDraft(pick(branch)),
    save: (msg = "บันทึกแล้ว") => report(saveBranch(b), msg),
  }
}

export function SaveRow({ dirty, onSave, onReset, label = "บันทึก" }: { dirty: boolean; onSave: () => void; onReset: () => void; label?: string }) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      {dirty ? (
        <>
          <span className="mr-auto text-xs text-amber-700">มีการแก้ไขที่ยังไม่บันทึก</span>
          <Button variant="ghost" size="sm" onClick={onReset}>ยกเลิก</Button>
          <Button size="sm" onClick={onSave}>{label}</Button>
        </>
      ) : (
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><CheckIcon className="size-3.5" /> บันทึกครบแล้ว</span>
      )}
    </div>
  )
}

/** Read-only label/value row, like staging's detail views. */
export function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="text-sm">{children || <span className="text-muted-foreground">—</span>}</div>
    </div>
  )
}
