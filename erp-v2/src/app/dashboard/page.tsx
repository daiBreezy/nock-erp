"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangleIcon, ArrowRightIcon, BanknoteIcon, CheckCircle2Icon, GraduationCapIcon, UserSearchIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { StudentSheet } from "@/components/app/student-sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fmtDate, fmtDateTime, fmtMoney, monthKey, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { invoiceTotals } from "@/domain/rules/billing"
import { LEAD_STAGE_LABEL } from "@/domain/rules/crm"
import { useBranch, useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export default function DashboardPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const students = useStore((s) => s.students).filter((x) => x.branchId === branch.id)
  const entitlements = useEntitlements()
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const invoices = useStore((s) => s.invoices).filter((x) => x.branchId === branch.id)
  const leads = useStore((s) => s.leads).filter((x) => x.branchId === branch.id)
  const courses = useStore((s) => s.courses)
  const packages = useStore((s) => s.packages)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const [openId, setOpenId] = useState<string | null>(null)

  const statusOf = new Map(students.map((s) => [s.id, Att.studentStatus(s.id, entitlements, today)]))
  const activeStudents = [...statusOf.values()].filter((v) => v !== "inactive").length

  const renewalRows = students
    .filter((s) => statusOf.get(s.id) === "expiring")
    .map((stu) => {
      const ents = entitlements.filter((e) => e.studentId === stu.id && e.to >= today)
      const messages = ents.map((e) => Att.lowBalanceAlert(e, Att.balance(e, sessions, attendance), today)).filter((m): m is string => !!m)
      const urgent = ents.some((e) => e.kind === "sessions" && Att.balance(e, sessions, attendance).remaining <= 1) || ents.some((e) => e.to <= fmtDateOffset(today, 2))
      return { stu, messages, urgent }
    })
    .sort((a, b) => (a.urgent === b.urgent ? 0 : a.urgent ? -1 : 1))

  const paidThisMonth = invoices.filter((i) => i.status === "paid" && i.sentAt && monthKey(toDateStr(new Date(i.sentAt))) === monthKey(today))
  const revenue = paidThisMonth.reduce((sum, i) => sum + invoiceTotals(i, { branch, courses, packages, classes, holidays }).total, 0)

  const activeLeads = leads.filter((l) => l.stage !== "archived" && l.stage !== "enrolled")
  const newLeads = leads.filter((l) => l.stage === "new")

  const recentPayments = invoices
    .flatMap((i) => i.payments.filter((p) => p.confirmedBy).map((p) => ({ at: p.recordedAt, text: `ชำระเงิน · ${students.find((s) => s.id === i.studentId)?.nickname ?? "-"} · ${fmtMoney(p.amount)}`, tone: "green" as const })))
  const recentAttendance = attendance
    .filter((a) => a.status !== "leave")
    .slice(-60)
    .map((a) => {
      const se = sessions.find((x) => x.id === a.sessionId)
      const stu = students.find((x) => x.id === a.studentId)
      if (!se || !stu || se.branchId !== branch.id) return null
      return { at: a.markedAt, text: `${a.status === "present" ? "เข้าเรียน" : "ขาดเรียน"} · ${stu.nickname} · ${se.subject}`, tone: a.status === "present" ? ("blue" as const) : ("red" as const) }
    })
    .filter((x): x is { at: string; text: string; tone: "blue" | "red" } => !!x)
  const recentActivity = [...recentPayments, ...recentAttendance].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 8)

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">สวัสดี {me.nickname}</h2>
        <p className="text-sm text-muted-foreground">ภาพรวมสาขา{branch.name} · {fmtDate(today, { weekday: true, year: true })}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<GraduationCapIcon className="size-4" />} label="นักเรียนที่เรียนอยู่" value={String(activeStudents)} tone="emerald" sub={`จากทั้งหมด ${students.length} คน`} />
        <Kpi icon={<AlertTriangleIcon className="size-4" />} label="รอต่อคอร์ส" value={String(renewalRows.length)} tone={renewalRows.some((r) => r.urgent) ? "red" : "amber"} sub={renewalRows.some((r) => r.urgent) ? `${renewalRows.filter((r) => r.urgent).length} คนด่วน` : renewalRows.length ? "ยังไม่ด่วน" : "เรียบร้อยหมด"} />
        <Kpi icon={<BanknoteIcon className="size-4" />} label="รายรับเดือนนี้" value={fmtMoney(revenue)} tone="violet" sub={`${paidThisMonth.length} ใบเสร็จ`} />
        <Kpi icon={<UserSearchIcon className="size-4" />} label="ลีดที่กำลังตาม" value={String(activeLeads.length)} tone={newLeads.length ? "sky" : "emerald"} sub={newLeads.length ? `${newLeads.length} รายใหม่ยังไม่ติดต่อ` : "ติดต่อครบแล้ว"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>รอต่อคอร์ส</CardTitle>
            <CardDescription>{renewalRows.length ? `${renewalRows.length} คน — เรียงตามความด่วน` : "ไม่มีใครรอต่อคอร์ส"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {renewalRows.length === 0 && <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-emerald-600" /> ทุกคนต่อคอร์สเรียบร้อย</p>}
            {renewalRows.slice(0, 8).map(({ stu, messages, urgent }) => (
              <button key={stu.id} onClick={() => setOpenId(stu.id)} className="flex w-full items-center gap-3 rounded-lg border p-2.5 text-left hover:bg-muted/50">
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(stu.id))}>{initial(stu.nickname)}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-sm font-medium">{stu.nickname} <span className={cn("rounded px-1.5 py-0.5 text-xs", gradeTone(stu.grade))}>{stu.grade}</span></div>
                  <div className="truncate text-xs text-muted-foreground">{messages.join(" · ") || "ใกล้หมดแพ็กเกจ"}</div>
                </div>
                {urgent && <Pill tone="red">ด่วน</Pill>}
                <ArrowRightIcon className="size-4 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>ลีดใหม่</CardTitle>
            <CardDescription>{newLeads.length ? `${newLeads.length} รายรอติดต่อ` : "ไม่มีลีดใหม่"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {newLeads.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีลีดใหม่วันนี้</p>}
            {newLeads.slice(0, 6).map((l) => (
              <Link key={l.id} href="/crm" className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/60">
                <span className="min-w-0 flex-1 truncate text-sm">{l.name} <span className="text-xs text-muted-foreground">· {l.subject} {l.childGrade}</span></span>
                <Pill tone="blue">{LEAD_STAGE_LABEL[l.stage]}</Pill>
              </Link>
            ))}
            <Link href="/crm" className="flex items-center justify-center gap-1 pt-1 text-xs text-primary hover:underline">
              ไปที่ CRM <ArrowRightIcon className="size-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>กิจกรรมล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">ยังไม่มีกิจกรรม</p>}
          <ul className="space-y-2 text-sm">
            {recentActivity.map((e, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className={cn("size-1.5 shrink-0 rounded-full", e.tone === "green" ? "bg-emerald-500" : e.tone === "red" ? "bg-red-500" : "bg-sky-500")} />
                <span className="min-w-0 flex-1 truncate">{e.text}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(e.at)}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
      <StudentSheet studentId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}

function fmtDateOffset(date: string, days: number) {
  const d = new Date(`${date}T00:00:00`)
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

const KPI_TONE = {
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  violet: "bg-violet-100 text-violet-700",
  sky: "bg-sky-100 text-sky-700",
} as const

function Kpi({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: keyof typeof KPI_TONE }) {
  return (
    <Card className="gap-2 py-4">
      <CardContent className="space-y-1 px-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <span className={cn("grid size-6 place-items-center rounded-md", KPI_TONE[tone])}>{icon}</span>
          {label}
        </div>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        <div className="text-xs text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  )
}
