"use client"

import { BusIcon, CakeIcon, CalendarCheckIcon, CalendarDaysIcon, CalendarXIcon, GraduationCapIcon, StickyNoteIcon, StoreIcon, TargetIcon } from "lucide-react"
import { InfoGrid, NotSet, type InfoRow } from "@/components/app/family-tabs"
import { daysBetween, fmtDate, toDateStr } from "@/domain/dates"
import { BUS_USE_LABEL, busUseOf } from "@/domain/rules/people"
import { branchHasBus } from "@/domain/rules/settings"
import type { Student } from "@/domain/types"
import { useEntitlements, useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** the colour of "(Nd)" — grey, yellow when 7 days or fewer are left, red under 3 (owner 2026-11-20) */
export const daysLeftTone = (left: number) => (left < 3 ? "text-destructive" : left <= 7 ? "text-warning-ink" : "text-muted-foreground")

/**
 * ONE set of facts about a student, shared by the student's own Overview and the family panel's children list (owner 2026-11-20: "share the data, not two copies"):
 * Enroll date · end date (days left) · birthday · school · branch created · created on · bus (only for a rider) · the staff note.
 */
export function StudentFacts({ student: k, className }: { student: Student; className?: string }) {
  const ents = useEntitlements()
  const branches = useStore((s) => s.branches)
  const today = toDateStr(useNow())
  const mine = ents.filter((e) => e.studentId === k.id)
  const enrolled = mine.map((e) => e.from).sort()[0]
  const ends = mine.map((e) => e.to).sort().slice(-1)[0]
  const left = ends ? daysBetween(today, ends) : null
  const age = k.birthDate ? Math.floor(daysBetween(k.birthDate, today) / 365.25) : null
  const created = branches.find((b) => b.id === k.createdBranchId)
  const rows: InfoRow[] = [
    { icon: CalendarCheckIcon, label: tx("วัน Enroll"), value: enrolled ? fmtDate(enrolled, { year: true }) : <NotSet what="วัน Enroll" /> },
    { icon: CalendarXIcon, label: tx("วันสิ้นสุด"), value: ends ? <>{fmtDate(ends, { year: true })} <span className={left !== null && left >= 0 ? daysLeftTone(left) : "text-muted-foreground"}>{left !== null && left >= 0 ? `(${left}d)` : `(${tx("หมดแล้ว")})`}</span></> : <NotSet what="วันสิ้นสุด" /> },
    { icon: CakeIcon, label: tx("วันเกิด"), value: k.birthDate ? <>{fmtDate(k.birthDate, { year: true })}<span className="text-muted-foreground"> · {tx("อายุ {0} ปี", [age ?? 0])}</span></> : <NotSet what="วันเกิด" /> },
    { icon: GraduationCapIcon, label: tx("โรงเรียน"), value: k.school || <NotSet what="โรงเรียน" /> },
    ...(k.targetSchools?.length ? [{ icon: TargetIcon, label: tx("โรงเรียนที่อยากสอบเข้า"), value: k.targetSchools.map((t, i) => `${i + 1}. ${t.school}`).join(" · ") }] : []),
    { icon: StoreIcon, label: tx("สาขาที่สร้าง"), value: tx("สร้างที่สาขา{0}", [created?.name ?? "—"]) },
    { icon: CalendarDaysIcon, label: tx("วันที่สร้าง"), value: tx("สร้างเมื่อ {0}", [fmtDate(k.createdAt.slice(0, 10), { year: true })]) },
    ...(k.usesBus && branchHasBus(branches.find((b) => b.id === k.branchId)) ? [{ icon: BusIcon, label: tx("รถรับส่ง"), value: `${tx("รถรับส่ง")}: ${BUS_USE_LABEL[busUseOf(k)]}` }] : []),
  ]
  return (
    <div className={cn("space-y-3", className)}>
      <InfoGrid rows={rows} />
      {k.note && <p className="flex items-start gap-2 rounded-lg bg-warning-soft/60 p-2.5 text-sm text-warning-ink"><StickyNoteIcon className="mt-0.5 size-4 shrink-0" />{k.note}</p>}
    </div>
  )
}
