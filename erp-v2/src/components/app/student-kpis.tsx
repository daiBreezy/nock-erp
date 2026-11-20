"use client"

import { useState } from "react"
import { Kpi, KpiGroup } from "@/components/app/kpi"
import { SessionSheet } from "@/components/app/session-sheet"
import { fmtDate, toDateStr } from "@/domain/dates"
import { familySnapshot } from "@/domain/rules/family-overview"
import type { ID, Student } from "@/domain/types"
import { useEntitlements, useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * The three small numbers of ONE student — next session · sessions + hours left · attendance — shared by the student's own Overview and
 * the family panel's children (owner 2026-11-20: "share it, don't build a look-alike"). The next-session card opens that session.
 */
export function StudentKpis({ student }: { student: Student }) {
  const ents = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const classes = useStore((s) => s.classes)
  const invoices = useStore((s) => s.invoices)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const now = useNow(60_000)
  const today = toDateStr(now)
  const [openSession, setOpenSession] = useState<ID | null>(null)
  const snap = familySnapshot({ kids: [student], ents, invoices, leaves, sessions, attendance, classes, today, now, renewalDays })
  const hours = +(snap.minutesLeft / 60).toFixed(1)
  const a = snap.attendance
  return (
    <>
      <KpiGroup className="grid grid-cols-3 gap-2">
        <Kpi variant="tonal" size="sm" label={tx("คาบถัดไป")} value={snap.next ? `${fmtDate(snap.next.session.date)} · ${snap.next.session.start}` : "-"}
          onClick={snap.next ? () => setOpenSession(snap.next!.session.id) : undefined} go />
        <Kpi variant="tonal" size="sm" label={tx("คาบที่เหลือ")} value={`${snap.sessionsLeft} ${tx("คาบ")} · ${hours} ${tx("ชม.")}`} />
        <Kpi variant="tonal" size="sm" label={tx("เข้าเรียน")} value={a.rate === null ? "-" : `${Math.round(a.rate * 100)}% · ${a.present}/${a.present + a.leave}`} />
      </KpiGroup>
      <SessionSheet sessionId={openSession} onClose={() => setOpenSession(null)} />
    </>
  )
}
