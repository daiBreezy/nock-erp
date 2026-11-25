"use client"

import { useMemo, useState } from "react"
import { ChevronRightIcon, SunIcon, TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { EntityPanel, PanelBody, PanelFooter } from "@/components/app/form-shell"
import { Kpi } from "@/components/app/kpi"
import { KpiRow, Segmented } from "@/components/app/page-layout"
import { Pill } from "@/components/app/badges"
import { StudentSheet } from "@/components/app/student-sheet"
import { fmtDate, toDateStr } from "@/domain/dates"
import { daysUntilPeriod, PERIOD_NOTICE_DAYS, periodImpact, shortNotice, type ImpactStudent } from "@/domain/rules/period-impact"
import type { ID, SpecialPeriod } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Show = "all" | "hourly" | "subscription" | "bookings"

/** how many students a period touches — the number on the card's button */
export function usePeriodImpact(period: SpecialPeriod, branchId: ID) {
  const classes = useStore((s) => s.classes)
  const sessions = useStore((s) => s.sessions)
  const entitlements = useStore((s) => s.entitlements)
  const today = toDateStr(useNow(60_000))
  return useMemo(() => periodImpact(period, branchId, { classes, sessions, entitlements }, today), [period, branchId, classes, sessions, entitlements, today])
}

/**
 * Impact Center (owner 2026-11-25, v1): one place to see what a Special Period does to students — the big picture first (how many sessions stop, how many
 * students, hourly vs weekly/monthly), then every student one by one (tap → the student's own panel). Not in v1 yet: unpaid invoices that overlap the
 * period, bus trips, the Credit itself (weekly / monthly lost sessions) and the messages to parents.
 */
export function PeriodImpactPanel({ period, branchId, open, onClose }: { period: SpecialPeriod; branchId: ID; open: boolean; onClose: () => void }) {
  const impact = usePeriodImpact(period, branchId)
  const students = useStore((s) => s.students)
  const courses = useStore((s) => s.courses)
  const today = toDateStr(useNow(60_000))
  const [show, setShow] = useState<Show>("all")
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  const who = (id: ID) => students.find((x) => x.id === id)
  const days = daysUntilPeriod(period, today)
  const short = period.active && period.to >= today && shortNotice(period, today)

  const row = (r: ImpactStudent, unit: string) => {
    const st = who(r.studentId)
    return (
      <li key={`${unit}-${r.studentId}`}>
        <Button variant="row" size="inline" type="button" onClick={() => setStudentOpen(r.studentId)} className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-muted/40">
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{st?.nickname ?? "—"}{st?.grade && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{st.grade}</span>}</span>
            <span className="block truncate text-xs text-muted-foreground">{r.packages.map((p) => courses.find((c) => c.id === p.courseId)?.name ?? "คอร์ส").join(" · ") || tx("ไม่มีแพ็กเกจรองรับคาบนี้")}</span>
          </span>
          <Pill tone="amber">{tx("หาย {0} คาบ", [r.packages.reduce((a, p) => a + p.lost, 0) || r.sessions.length])}</Pill>
          <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </li>
    )
  }
  const group = (title: string, hint: string, list: ImpactStudent[], unit: string) => list.length > 0 && (
    <section key={unit} className="space-y-1.5">
      <div><p className="text-sm font-semibold">{title} ({list.length})</p><p className="text-xs text-muted-foreground">{hint}</p></div>
      <ul className="divide-y rounded-xl bg-muted/40">{list.map((r) => row(r, unit))}</ul>
    </section>
  )
  const nothing = impact.students.length === 0 && impact.bookings.length === 0
  return (
    <>
      <EntityPanel open={open} onClose={onClose}>
        <SheetHeader className="shrink-0 border-b pb-3">
          <div className="flex items-center gap-2 pr-8">
            <SunIcon className="size-4 shrink-0 text-muted-foreground" />
            <SheetTitle className="min-w-0 flex-1 truncate text-lg">{tx("ผลกระทบ")} · {period.name}</SheetTitle>
          </div>
          <SheetDescription className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span>{fmtDate(period.from, { year: true })} – {fmtDate(period.to, { year: true })}</span>
            <Pill tone={period.active ? "green" : "gray"}>{period.active ? "Active" : "Inactive"}</Pill>
            {period.to >= today && <span className={cn(short && "font-medium text-warning-ink")}>{days === 0 ? tx("เริ่มแล้ว") : tx("อีก {0} วันเริ่ม", [days])}</span>}
          </SheetDescription>
        </SheetHeader>
        <PanelBody>
          {short && (
            <p className="flex items-start gap-2 rounded-xl bg-warning-soft/60 p-2.5 text-xs text-warning-ink">
              <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
              {tx("เหลือน้อยกว่า {0} วันก่อนเริ่ม — อาจมีผลกระทบกับคาบเรียนของนักเรียน ตรวจรายการด้านล่างแล้วรีบจัดการให้เรียบร้อย", [PERIOD_NOTICE_DAYS])}
            </p>
          )}
          {!period.active && <p className="rounded-xl bg-muted/60 p-2.5 text-xs text-muted-foreground">{tx("ช่วงนี้ยังเป็น Inactive — นี่คือผลกระทบ “ถ้าเปิดใช้” (ยังไม่มีคาบถูกพัก)")}</p>}
          <KpiRow>
            <Kpi variant="tonal" label={tx("คาบที่หยุด")} value={impact.pausedSessions.length} />
            <Kpi variant="tonal" label={tx("นักเรียนที่กระทบ")} value={impact.students.length} />
            <Kpi variant="tonal" label={tx("รายชั่วโมง")} value={impact.hourly.length} />
            <Kpi variant="tonal" label={tx("สัปดาห์/เดือน")} value={impact.subscription.length} />
          </KpiRow>
          <Segmented value={show} onChange={setShow} label={tx("แสดง")} options={[
            { value: "all", label: tx("ทั้งหมด") },
            { value: "hourly", label: tx("รายชั่วโมง") },
            { value: "subscription", label: tx("สัปดาห์/เดือน") },
            { value: "bookings", label: tx("Test/Trial") },
          ]} />
          {nothing && <p className="rounded-xl bg-muted/40 p-3 text-center text-xs text-muted-foreground">{tx("ช่วงนี้ยังไม่กระทบนักเรียนคนใด")}</p>}
          {(show === "all" || show === "hourly") && group(tx("รายชั่วโมง"), tx("วันจบแพ็กเกจยืดออกไปเอง (ข้ามวันหยุดและช่วงพิเศษ) — แค่แจ้งผู้ปกครอง"), impact.hourly, "hourly")}
          {(show === "all" || show === "subscription") && group(tx("รายสัปดาห์ / รายเดือน"), impact.schoolCause ? tx("คาบที่หายจะเก็บเป็น Credit คาบ ให้ตกลงกับผู้ปกครองว่าจะ Refund หรือชดเชย (ระบบ Credit ยังไม่เปิด)") : tx("เหตุอื่น — ไม่ใช่ความผิดของโรงเรียน ไม่เก็บ Credit"), impact.subscription, "subscription")}
          {show === "all" && group(tx("ไม่มีแพ็กเกจรองรับ"), tx("ลงชื่อในคาบที่หยุดแต่ไม่มีแพ็กเกจครอบคลุม (เช่น คอร์สเครดิต) — ตรวจเป็นรายคน"), impact.uncovered, "uncovered")}
          {(show === "all" || show === "bookings") && impact.bookings.length > 0 && (
            <section className="space-y-1.5">
              <div><p className="text-sm font-semibold">{tx("Test / Trial / นัดเดี่ยว ในช่วงนี้")} ({impact.bookings.length})</p><p className="text-xs text-muted-foreground">{tx("ยังไม่ถูกพัก — Trial ไม่ควรอยู่ในช่วงนี้ ตรวจเป็นรายรายการ")}</p></div>
              <ul className="divide-y rounded-xl bg-muted/40">
                {impact.bookings.map((b) => (
                  <li key={b.id} className="flex items-center gap-2 px-2.5 py-2 text-sm">
                    <span className="min-w-0 flex-1 truncate">{b.subject}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{fmtDate(b.date, { weekday: true })} {b.start}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <p className="text-2xs text-muted-foreground">{tx("เวอร์ชันแรก — ยังไม่รวม: ใบแจ้งหนี้ที่ยังไม่จ่าย · เที่ยวรถรับส่ง · ข้อความถึงผู้ปกครอง")}</p>
        </PanelBody>
        <PanelFooter><Button variant="ghost" className="ml-auto" onClick={onClose}>{tx("ปิด")}</Button></PanelFooter>
      </EntityPanel>
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </>
  )
}
