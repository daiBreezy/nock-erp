"use client"

import Link from "next/link"
import { useState } from "react"
import { AlertTriangleIcon, ArrowRightIcon, CheckCircle2Icon } from "lucide-react"
import { Pill, SessionStateBadge } from "@/components/app/badges"
import { SessionSheet } from "@/components/app/session-sheet"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { addDays, endTime, fmtDate, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canApprove as canApproveInvoice } from "@/domain/rules/billing"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import { findConflicts, sessionState } from "@/domain/rules/scheduling"
import { useBranch, useEntitlements, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export default function TodayPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const invoices = useStore((s) => s.invoices)
  const entitlements = useEntitlements()
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const L = useLookup()
  const [openId, setOpenId] = useState<string | null>(null)

  const mineOnly = !seesAllSessions(me)
  const branchSessions = sessions.filter((s) => s.branchId === branch.id && !s.cancelled)
  const todays = branchSessions.filter((s) => s.date === today && (!mineOnly || s.teacherId === me.id)).sort((a, b) => a.start.localeCompare(b.start))

  const todo = (() => {
    const out: { key: string; label: string; detail: string; href?: string; onClick?: () => void; tone: "amber" | "red" | "blue" }[] = []
    // attendance not taken for ended sessions (last 7 days)
    branchSessions
      .filter((s) => s.date >= addDays(today, -7) && ["ended"].includes(sessionState(s, now)) && (!mineOnly || s.teacherId === me.id))
      .forEach((s) => {
        const missing = s.studentIds.filter((sid) => !attendance.some((a) => a.sessionId === s.id && a.studentId === sid)).length
        if (missing) out.push({ key: `att${s.id}`, label: `ยังไม่เช็คชื่อ ${missing} คน`, detail: `${s.subject} ${fmtDate(s.date)} ${s.start}`, onClick: () => setOpenId(s.id), tone: "red" })
      })
    // summaries to write (teacher) / approve (approver)
    const present = attendance.filter((a) => a.status === "present")
    present.forEach((a) => {
      const s = branchSessions.find((x) => x.id === a.sessionId)
      if (!s || s.date < addDays(today, -7)) return
      const sm = summaries.find((x) => x.sessionId === a.sessionId && x.studentId === a.studentId)
      if (s.teacherId === me.id && (!sm || sm.status === "draft" || sm.status === "changes_requested"))
        out.push({ key: `sw${s.id}${a.studentId}`, label: sm?.status === "changes_requested" ? "สรุปถูกขอแก้" : "เขียนสรุปการเรียน", detail: `${L.student(a.studentId)?.nickname} · ${s.subject} ${fmtDate(s.date)}`, onClick: () => setOpenId(s.id), tone: "amber" })
      if (sm?.status === "submitted" && can(me, "summary.approve") && sm.authorId !== me.id && sm.lastEditorId !== me.id)
        out.push({ key: `sa${sm.id}`, label: "สรุปรออนุมัติ", detail: `${L.student(a.studentId)?.nickname} · ${s.subject} ${fmtDate(s.date)}`, onClick: () => setOpenId(s.id), tone: "blue" })
    })
    if (can(me, "billing.approve"))
      invoices.filter((i) => i.branchId === branch.id && canApproveInvoice(i, me).ok).forEach((i) =>
        out.push({ key: `inv${i.id}`, label: "ใบแจ้งหนี้รออนุมัติ", detail: `${i.number} · ${students.find((s) => s.id === i.studentId)?.nickname}`, href: `/billing?open=${i.id}`, tone: "blue" }))
    return out
  })()

  const alerts = (() => {
    if (mineOnly) return []
    const next7 = branchSessions.filter((s) => s.date >= today && s.date <= addDays(today, 7))
    const out: { key: string; text: string; href: string }[] = []
    findConflicts(next7, branch, staff).forEach((c, i) => {
      const s = next7.find((x) => x.id === c.sessionIds[0])!
      out.push({ key: `c${i}`, text: `${fmtDate(s.date, { weekday: true })}: ${c.message}`, href: "/calendar" })
    })
    next7.filter((s) => !s.teacherId || !staff.find((t) => t.id === s.teacherId)?.active).forEach((s) => out.push({ key: `t${s.id}`, text: `${fmtDate(s.date, { weekday: true })} ${s.start} ${s.subject}: ยังไม่มีครูสอน`, href: "/calendar" }))
    entitlements.forEach((e) => {
      const stu = students.find((x) => x.id === e.studentId)
      if (!stu || stu.branchId !== branch.id || e.to < today) return
      const msg = Att.lowBalanceAlert(e, Att.balance(e, sessions, attendance), today)
      if (msg) out.push({ key: `e${e.id}`, text: `${stu.nickname}: ${msg}`, href: "/students" })
    })
    return out
  })()

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">สวัสดี {me.nickname}</h2>
        <p className="text-sm text-muted-foreground">{fmtDate(today, { weekday: true, year: true })} · สาขา{branch.name}</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>{mineOnly ? "คาบของฉันวันนี้" : "คาบเรียนวันนี้"}</CardTitle>
            <CardDescription>{todays.length} คาบ · สถานะเปลี่ยนตามเวลาจริงอัตโนมัติ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {todays.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">วันนี้ไม่มีคาบเรียน</p>}
            {todays.map((s) => {
              const st = sessionState(s, now)
              const marked = attendance.filter((a) => a.sessionId === s.id).length
              const t = L.teacher(s.teacherId)
              return (
                <button key={s.id} onClick={() => setOpenId(s.id)} className="flex w-full items-center gap-3 rounded-lg border p-3 text-left hover:bg-muted/50">
                  <div className="w-20 text-sm tabular-nums">
                    <div className="font-semibold">{s.start}</div>
                    <div className="text-xs text-muted-foreground">{endTime(s.start, s.minutes)}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.subject}{s.trial && <Pill tone="violet" className="ml-2">ทดลอง</Pill>}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      <span className={cn(t.missing && "text-amber-700")}>{t.label}</span> · {L.room(s.roomId)} · เช็คชื่อแล้ว {marked}/{s.studentIds.length}
                    </div>
                  </div>
                  <SessionStateBadge state={st} />
                </button>
              )
            })}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>งานที่รอคุณ</CardTitle>
            <CardDescription>{todo.length ? `${todo.length} รายการ` : "ไม่มีงานค้าง"}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {todo.length === 0 && <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><CheckCircle2Icon className="size-4 text-emerald-600" /> เคลียร์หมดแล้ว</p>}
            {todo.slice(0, 12).map((t) => {
              const inner = (
                <>
                  <Pill tone={t.tone}>{t.label}</Pill>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.detail}</span>
                  <ArrowRightIcon className="size-4 text-muted-foreground" />
                </>
              )
              return t.href ? (
                <Link key={t.key} href={t.href} className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/60">{inner}</Link>
              ) : (
                <button key={t.key} onClick={t.onClick} className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-muted/60">{inner}</button>
              )
            })}
          </CardContent>
        </Card>
      </div>
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertTriangleIcon className="size-4 text-amber-600" /> ต้องจัดการ (7 วันข้างหน้า)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {alerts.map((a) => <li key={a.key}><Link href={a.href} className="hover:underline">• {a.text}</Link></li>)}
            </ul>
          </CardContent>
        </Card>
      )}
      <SessionSheet sessionId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
