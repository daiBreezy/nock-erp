"use client"

import { useState } from "react"
import { ShieldAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Result } from "@/domain/types"
import { report } from "@/lib/feedback"

/**
 * Force Approve (owner 2026-09-26): shown only where maker–checker blocks the current user on their
 * own work. Remark is mandatory; the store notifies the whole branch + every Director.
 */
export function ForceApprove({ label = "Force Approve", onForce, success }: { label?: string; onForce: (remark: string) => Result<unknown>; success: string }) {
  const [open, setOpen] = useState(false)
  const [remark, setRemark] = useState("")

  if (!open)
    return (
      <Button size="xs" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-50" onClick={() => setOpen(true)}>
        <ShieldAlertIcon /> {label}
      </Button>
    )

  return (
    <div className="w-full space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-left">
      <p className="text-xs text-amber-900">ข้ามผู้ตรวจ — ระบบจะแจ้งเตือน<b>ทุกคนในสาขา</b>และ <b>Director</b> พร้อมเหตุผลนี้</p>
      <Textarea autoFocus rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="เหตุผลที่ต้อง Force (จำเป็น) เช่น วันนี้อยู่สาขาคนเดียว ผู้ปกครองรอชำระหน้าเคาน์เตอร์" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setRemark("") }}>ยกเลิก</Button>
        <Button size="sm" disabled={!remark.trim()} onClick={() => report(onForce(remark), success) && setOpen(false)}>
          <ShieldAlertIcon /> ยืนยัน Force
        </Button>
      </div>
    </div>
  )
}
