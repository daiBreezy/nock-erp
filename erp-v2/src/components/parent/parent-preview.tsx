"use client"

// Staff: see exactly what this family sees in the parent app (owner 2026-10-09), in a phone-sized frame.
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toDateStr } from "@/domain/dates"
import type { Family } from "@/domain/types"
import { buildParentView } from "@/lib/parent-app"
import { useMemo } from "react"
import { useShallow } from "zustand/react/shallow"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { ParentApp } from "./parent-app"

export function ParentPreview({ family, onClose }: { family: Family; onClose: () => void }) {
  const now = useNow()
  // rebuilt when the data a parent sees changes
  const deps = useStore(useShallow((s) => [s.sessions, s.attendance, s.summaries, s.students, s.invoices, s.busAddOns, s.entitlements]))
  const view = useMemo(() => buildParentView(family), [family, deps]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>App ผู้ปกครอง · {family.name}</DialogTitle>
          <DialogDescription>
            {family.lineUserId
              ? "ผูก LINE แล้ว — ผู้ปกครองเปิดจาก Rich Menu ใน LINE ได้เลย (ข้อมูลอัปเดตอัตโนมัติ)"
              : "ยังไม่ผูก LINE — ผู้ปกครองจะเปิดดูได้หลังผูกบัญชี LINE กับครอบครัวนี้ที่ Inbox"}
          </DialogDescription>
        </DialogHeader>
        <div className="relative mx-auto h-[640px] w-full max-w-[375px] overflow-y-auto rounded-[2rem] border-8 border-foreground/80">
          <ParentApp view={view} today={toDateStr(now)} framed />
        </div>
      </DialogContent>
    </Dialog>
  )
}
