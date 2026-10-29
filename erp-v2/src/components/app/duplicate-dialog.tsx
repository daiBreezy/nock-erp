"use client"

import type { ReactNode } from "react"
import { CopyIcon, MergeIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { DuplicateHit } from "@/domain/rules/people"

/**
 * "พบรายชื่อที่อาจซ้ำ" (owner 2026-10-29): the system points at records that may be the same person / family —
 * the admin decides. รวม = use the record on file (nothing new is created) · แยก = create the new one anyway.
 */
export function DuplicateDialog<T extends { id: string }>({ title, description, hits, render, mergeLabel, newLabel, onMerge, onNew, onClose }: {
  title: string
  description: string
  hits: DuplicateHit<T>[]
  render: (record: T) => ReactNode
  mergeLabel: string
  newLabel: string
  onMerge: (record: T) => void
  onNew: () => void
  onClose: () => void
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><CopyIcon className="size-5 text-amber-600" /> {title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ul className="max-h-[50vh] space-y-2 overflow-y-auto">
          {hits.map((h) => (
            <li key={h.record.id} className="flex items-center gap-3 rounded-2xl border p-3">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="text-sm">{render(h.record)}</div>
                <div className="flex flex-wrap gap-1">{h.reasons.map((r) => <span key={r} className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">{r}</span>)}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => onMerge(h.record)}><MergeIcon /> {mergeLabel}</Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={onNew}><UserPlusIcon /> {newLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
