"use client"

import { useState } from "react"
import { CheckIcon, SendIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { SessionSheet } from "@/components/app/session-sheet"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { addDays, fmtDate, toDateStr } from "@/domain/dates"
import { can, seesAllSessions } from "@/domain/rules/permissions"
import * as Sum from "@/domain/rules/summaries"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useLookup, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Tab = "to_write" | "changes" | "submitted" | "approved" | "sent"

/** Summary work queue. Counts only cover the chosen period (D6). */
export default function SummariesPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const summaries = useStore((s) => s.summaries)
  const classes = useStore((s) => s.classes)
  const approve = useStore((s) => s.approveSummary)
  const send = useStore((s) => s.sendSummary)
  const L = useLookup()
  const [days, setDays] = useState(7)
  const [tab, setTab] = useState<Tab>(can(me, "summary.approve") ? "submitted" : "to_write")
  const [openId, setOpenId] = useState<ID | null>(null)

  const from = addDays(today, -days + 1)
  const mineOnly = !seesAllSessions(me)
  const inRange = sessions.filter((s) => s.branchId === branch.id && s.date >= from && s.date <= today && (!mineOnly || s.teacherId === me.id))
  const rows = inRange.flatMap((s) =>
    attendance
      .filter((a) => a.sessionId === s.id && a.status === "present")
      .map((a) => ({ s, studentId: a.studentId, sm: summaries.find((x) => x.sessionId === s.id && x.studentId === a.studentId) })),
  )
  const bucket = (r: (typeof rows)[number]): Tab => (!r.sm || r.sm.status === "draft" ? "to_write" : r.sm.status === "changes_requested" ? "changes" : r.sm.status)
  const tabs: { key: Tab; label: string; tone: string }[] = [
    { key: "to_write", label: "ยังไม่ได้เขียน", tone: "text-red-700" },
    { key: "changes", label: "ขอแก้ไข", tone: "text-red-700" },
    { key: "submitted", label: "รออนุมัติ", tone: "text-amber-700" },
    { key: "approved", label: "อนุมัติแล้ว · ยังไม่ส่ง", tone: "text-sky-700" },
    { key: "sent", label: "ส่งผู้ปกครองแล้ว", tone: "text-emerald-700" },
  ]
  const shown = rows.filter((r) => bucket(r) === tab).sort((a, b) => b.s.date.localeCompare(a.s.date))

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-muted-foreground">ช่วงเวลา</span>
        {[7, 14, 30].map((d) => (
          <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d} วันล่าสุด</Button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{fmtDate(from)} – {fmtDate(today, { year: true })}{mineOnly && " · เฉพาะคาบของฉัน"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} className="text-left">
            <Card className={cn(tab === t.key && "ring-2 ring-primary")}>
              <CardContent>
                <div className="text-xs text-muted-foreground">{t.label}</div>
                <div className={cn("text-2xl font-semibold tabular-nums", t.tone)}>{rows.filter((r) => bucket(r) === t.key).length}</div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        {shown.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">ไม่มีรายการในหมวดนี้</p>}
        {shown.map(({ s, studentId, sm }) => {
          const stu = L.student(studentId)
          const approveCheck = sm && Sum.canApprove(sm, me)
          return (
            <div key={s.id + studentId} className="flex flex-wrap items-start gap-3 p-3">
              <div className="w-24 text-sm">
                <div className="font-medium">{fmtDate(s.date, { weekday: true })}</div>
                <div className="text-xs text-muted-foreground">{s.start}</div>
              </div>
              <div className="min-w-48 flex-1">
                <div className="text-sm font-medium">{stu?.nickname} <span className="text-xs text-muted-foreground">{stu?.grade}</span> · {classes.find((c) => c.id === s.classId)?.name ?? s.subject}</div>
                <div className="text-xs text-muted-foreground">ครู {L.teacher(sm?.authorId ?? s.teacherId).label}</div>
                {sm?.text && <p className="mt-1 line-clamp-2 text-sm">{sm.text}</p>}
                {sm?.status === "changes_requested" && <p className="mt-1 text-xs text-red-700">ขอแก้: {sm.history.findLast((h) => h.action === "request_changes")?.note}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {(tab === "to_write" || tab === "changes") && <Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>เขียน / แก้</Button>}
                {tab === "submitted" && sm && (
                  approveCheck?.ok ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => setOpenId(s.id)}>ดู / ขอแก้</Button>
                      <Button size="sm" onClick={() => report(approve(sm.id), "อนุมัติแล้ว")}><CheckIcon /> อนุมัติ</Button>
                    </>
                  ) : <Pill>{approveCheck?.error}</Pill>
                )}
                {tab === "approved" && sm && can(me, "summary.approve") && (
                  <Button size="sm" onClick={() => report(send(sm.id), "ส่งถึงผู้ปกครองแล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>
                )}
              </div>
            </div>
          )
        })}
      </div>
      <SessionSheet sessionId={openId} onClose={() => setOpenId(null)} />
    </div>
  )
}
