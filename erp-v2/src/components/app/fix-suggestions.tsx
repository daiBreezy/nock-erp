"use client"

import { CalendarDaysIcon, ClockIcon, DoorOpenIcon, SparklesIcon, UserRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { suggestFixes, type FixKind } from "@/domain/rules/suggest"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

const ICON: Record<FixKind, typeof DoorOpenIcon> = { room: DoorOpenIcon, teacher: UserRoundIcon, time: ClockIcon, day: CalendarDaysIcon }

/** Ready-to-apply fixes for a clashing session — one click, already checked against rooms, teachers, hours and holidays. */
export function FixSuggestions({ sessionId }: { sessionId: ID }) {
  const sessions = useStore((s) => s.sessions)
  const staff = useStore((s) => s.staff)
  const holidays = useStore((s) => s.holidays)
  const attendance = useStore((s) => s.attendance)
  const move = useStore((s) => s.moveSession)
  const branch = useBranch()
  const now = useNow(60_000)
  const fixes = suggestFixes(sessionId, { sessions, branch, staff, holidays, now, attendance })

  if (!fixes.length)
    return <p className="text-xs text-red-800">ไม่พบทางแก้อัตโนมัติ — ลองเพิ่มห้อง/ครู หรือยกเลิกคาบ</p>
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <SparklesIcon className="size-3.5 text-primary" /> ทางแก้ที่ระบบตรวจแล้วว่าใช้ได้
      </div>
      {fixes.map((f) => {
        const Icon = ICON[f.kind]
        return (
          <div key={f.kind + f.label} className="flex items-center gap-2 rounded-lg bg-background p-2 ring-1 ring-foreground/10">
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {f.label}
                {f.clearsAll && <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-px text-[10px] font-semibold text-emerald-800">แก้ได้หมด</span>}
              </div>
              <div className="truncate text-xs text-muted-foreground">{f.detail}</div>
            </div>
            <Button size="xs" onClick={() => report(move(sessionId, f.target, "one"), `ใช้แล้ว: ${f.label}`)}>ใช้</Button>
          </div>
        )
      })}
      <p className="text-[11px] text-muted-foreground">มีผลเฉพาะคาบนี้ · ถ้าต้องการเปลี่ยนทุกสัปดาห์ ให้ลากการ์ดแล้วเลือก &quot;คาบนี้และคาบถัดไป&quot;</p>
    </div>
  )
}
