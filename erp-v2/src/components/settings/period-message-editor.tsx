"use client"

import { RotateCcwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DEFAULT_PARENT_MSG, PARENT_MSG_FIELDS, parentMsgOf } from "@/domain/rules/period-message"
import type { PeriodParentMsg, SpecialPeriod } from "@/domain/types"
import { tx } from "@/lib/i18n"

/**
 * owner 2026-11-25: the message set about a Special Period — one editable text per impact group (intro · hourly · weekly/monthly · unpaid invoice · outro).
 * The SAME set is edited here from the period's card (Settings) and from the Impact Center; the Admin can add any line (an apology …). Parents always get Thai.
 */
export function PeriodMessageEditor({ period, onChange, className }: { period: Pick<SpecialPeriod, "parentMsg">; onChange: (msg: PeriodParentMsg) => void; className?: string }) {
  const msg = parentMsgOf(period)
  const edited = PARENT_MSG_FIELDS.some((f) => msg[f.key] !== DEFAULT_PARENT_MSG[f.key])
  return (
    <div className={className}>
      <div className="space-y-2.5">
        {PARENT_MSG_FIELDS.map((f) => (
          <div key={f.key} className="space-y-1">
            <Label className="text-xs">{tx(f.label)}</Label>
            <Textarea rows={f.key === "intro" || f.key === "outro" ? 2 : 3} value={msg[f.key]} onChange={(e) => onChange({ ...msg, [f.key]: e.target.value })} />
            <p className="text-2xs text-muted-foreground">{tx("ตัวแปรที่ระบบเติมให้")}: {f.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <p className="min-w-0 flex-1 text-2xs text-muted-foreground">{tx("ข้อความไปถึงผู้ปกครองเป็นภาษาไทยเสมอ · ไม่ใส่ตัวเลขเงินในข้อความ")}</p>
        <Button size="xs" variant="ghost" disabled={!edited} onClick={() => onChange({ ...DEFAULT_PARENT_MSG })}><RotateCcwIcon /> {tx("คืนค่าเริ่มต้น")}</Button>
      </div>
    </div>
  )
}
