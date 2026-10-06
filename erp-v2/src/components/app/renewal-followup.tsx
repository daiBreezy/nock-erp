"use client"

import { useState } from "react"
import { CheckIcon, DoorOpenIcon, MessageCircleIcon, MoreHorizontalIcon, PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import * as Loss from "@/domain/rules/loss"
import type { ContactChannel, ContactResult, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const CHANNEL_ICON = { call: PhoneIcon, line: MessageCircleIcon, other: MoreHorizontalIcon } as const
const RESULTS_FOR: Record<ContactChannel, ContactResult[]> = {
  call: ["talked", "no_answer", "call_back", "wrong_number"],
  line: ["replied", "no_reply", "wrong_number"],
  other: ["talked", "replied", "no_answer", "no_reply", "call_back", "wrong_number"],
}

function Chip({ on, onClick, children, tone }: { on: boolean; onClick: () => void; children: React.ReactNode; tone?: "red" | "green" }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("rounded-full border px-2.5 py-1 text-xs", on ? (tone === "red" ? "border-red-500 bg-red-50 font-medium text-red-700 dark:bg-red-950/40" : tone === "green" ? "border-emerald-500 bg-emerald-50 font-medium text-emerald-700 dark:bg-emerald-950/40" : "border-primary bg-primary/10 font-medium text-primary") : "hover:bg-muted")}>
      {children}
    </button>
  )
}

/**
 * Renewal check-in log (owner 2026-10-06, same shape as the lead follow-up log in CRM) — shown on a student
 * whose package is running low. "ยืนยันไม่ต่อ" hands off to the existing "แจ้งออก" (exit) flow rather than
 * closing anything here; "ติดต่อไม่ได้" can set a next-try date that drops this student off today's renewal
 * list until then, so a quiet parent doesn't nag the admin every single day.
 */
export function RenewalFollowUpSection({ stu, canManage, onNotRenewing }: { stu: Student; canManage: boolean; onNotRenewing: () => void }) {
  const add = useStore((s) => s.addRenewalFollowUp)
  const today = toDateStr(useNow())
  const [channel, setChannel] = useState<ContactChannel>("call")
  const [result, setResult] = useState<ContactResult | null>(null)
  const [note, setNote] = useState("")
  const [nextTryOn, setNextTryOn] = useState("")
  const list = [...(stu.renewalFollowUps ?? [])].reverse()
  const lastUp = list[0]
  const save = () => {
    if (!result) return
    if (report(add(stu.id, { channel, result, note, nextTryOn: nextTryOn || undefined }), "บันทึกการติดตามแล้ว")) {
      setResult(null); setNote(""); setNextTryOn("")
    }
  }
  return (
    <section className="space-y-2 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center gap-2">
        <p className="font-semibold">ติดตามการต่อคอร์ส</p>
        {canManage && <Button size="xs" variant="outline" className="ml-auto" onClick={onNotRenewing}><DoorOpenIcon /> ยืนยันไม่ต่อ — แจ้งออก</Button>}
      </div>
      {lastUp ? (
        <p className="text-xs text-muted-foreground">
          ติดต่อ {list.length} ครั้ง · ล่าสุด <span className={cn("font-medium", Loss.REACHED.includes(lastUp.result) ? "text-emerald-700" : "text-red-700")}>{Loss.CHANNEL_LABEL[lastUp.channel]} · {Loss.RESULT_LABEL[lastUp.result]}</span> {fmtDateTime(lastUp.at)}
          {lastUp.nextTryOn && <> · นัดติดต่ออีกครั้ง {fmtDate(lastUp.nextTryOn, { weekday: true })}</>}
        </p>
      ) : <p className="text-xs text-muted-foreground">ยังไม่มีบันทึกการติดตาม</p>}
      {canManage && (
        <div className="space-y-2 rounded-lg border p-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["call", "line", "other"] as ContactChannel[]).map((c) => {
              const Icon = CHANNEL_ICON[c]
              return <Chip key={c} on={channel === c} onClick={() => { setChannel(c); setResult(null) }}><span className="flex items-center gap-1"><Icon className="size-3.5" />{Loss.CHANNEL_LABEL[c]}</span></Chip>
            })}
            <span className="mx-1 h-4 w-px bg-border" />
            {RESULTS_FOR[channel].map((r) => (
              <Chip key={r} on={result === r} tone={Loss.REACHED.includes(r) ? "green" : "red"} onClick={() => setResult(r)}>{Loss.RESULT_LABEL[r]}</Chip>
            ))}
          </div>
          {result && (
            <div className="space-y-1.5">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="ได้คุยอะไร (ไม่บังคับ)" className="h-8" />
              {!Loss.REACHED.includes(result) && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Input type="date" min={today} value={nextTryOn} onChange={(e) => setNextTryOn(e.target.value)} className="h-8 w-40" />
                  <span className="text-xs text-muted-foreground">ติดต่ออีกครั้งวันที่ — ไม่เลือก = ขึ้นในรายการพรุ่งนี้ต่อ</span>
                </div>
              )}
              <Button size="sm" onClick={save}><CheckIcon /> บันทึก</Button>
            </div>
          )}
        </div>
      )}
      {list.length > 1 && (
        <ol className="space-y-1 border-t pt-2">
          {list.slice(1).map((f) => (
            <li key={f.id} className="flex items-start gap-2 text-xs">
              <span className={cn("shrink-0 font-medium", Loss.REACHED.includes(f.result) ? "text-emerald-700" : "text-red-700")}>{Loss.CHANNEL_LABEL[f.channel]} · {Loss.RESULT_LABEL[f.result]}</span>
              <span className="min-w-0 flex-1 text-muted-foreground">{f.note}</span>
              <span className="shrink-0 text-muted-foreground">{fmtDate(f.at.slice(0, 10))}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
