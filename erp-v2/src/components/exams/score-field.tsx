"use client"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/** an entry cell like a spreadsheet's (owner 2026-11-23): plain until hovered, a clear box when focused — no grey blobs */
export const cellInput = "h-9 rounded-lg border-transparent bg-transparent px-2 text-right tabular-nums shadow-none hover:bg-muted/60 focus-visible:border-ring focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring/30 disabled:opacity-60 aria-invalid:border-destructive"

/**
 * Score / full marks as two cells side by side with a slash — the Edit view of the table. (The student panel lays the same
 * cells out in its own columns.) Leaving the pair saves (focus moving between the two cells does not).
 */
export function ScoreField({ score, full, fullPlaceholder = "100", onScore, onFull, onCommit, disabled, invalid, label, className }: {
  score: string; full: string; fullPlaceholder?: string
  onScore?: (v: string) => void; onFull?: (v: string) => void
  onCommit?: () => void
  disabled?: boolean; invalid?: boolean; label: string; className?: string
}) {
  // the same cells as the student panel (owner 2026-11-23) — plain, a grey wash on hover, a clear box when focused
  const box = "w-14"
  return (
    <div role="group" aria-label={label}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onCommit?.() }}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLElement).blur() }}
      className={cn("flex items-center gap-1", className)}>
      <Input inputMode="decimal" aria-label={`${label} คะแนนที่ได้`} aria-invalid={invalid} disabled={disabled} className={cn(cellInput, box)} value={score} placeholder="—" onChange={(e) => onScore?.(e.target.value)} />
      <span className="text-muted-foreground">/</span>
      <Input inputMode="decimal" aria-label={`${label} คะแนนเต็ม`} disabled={disabled} className={cn(cellInput, box, "text-muted-foreground focus:text-foreground")} value={full} placeholder={fullPlaceholder} onChange={(e) => onFull?.(e.target.value)} />
    </div>
  )
}
