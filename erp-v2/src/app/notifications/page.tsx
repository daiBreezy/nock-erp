"use client"

import { Page, PageHeader } from "@/components/app/page-layout"
import Link from "next/link"
import { useState } from "react"
import { AlertTriangleIcon, BellIcon, CalendarDaysIcon, CheckCheckIcon, ClipboardListIcon, FileTextIcon, MessageSquareIcon, MessageSquarePlusIcon, NotebookPenIcon, ReceiptIcon, RefreshCwIcon, SendIcon, ShieldAlertIcon, UserXIcon, WalletIcon, XIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { NotificationKind, Role } from "@/domain/types"
import { report } from "@/lib/feedback"
import { addDays, fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { canApprove } from "@/domain/rules/billing"
import { isUnread, visibleTo, type MessageTarget } from "@/domain/rules/notifications"
import { can, ROLE_LABEL, seesAllSessions } from "@/domain/rules/permissions"
import { workState } from "@/domain/rules/scheduling"
import { useBranch, useEntitlements, useNow, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { renewHref, studentLabel } from "@/domain/rules/people"

/** filter chips (owner 2026-10-07): one topic per kind of notification, for both the to-do list and the history */
type Topic = "teaching" | "approval" | "renewal" | "schedule" | "forms" | "message" | "other"
const TOPICS: { key: Topic; label: string; icon: typeof BellIcon }[] = [
  { key: "teaching", label: "เช็คชื่อ & สรุป", icon: ClipboardListIcon },
  { key: "approval", label: "รออนุมัติ", icon: ReceiptIcon },
  { key: "renewal", label: "ต่อคอร์ส", icon: RefreshCwIcon },
  { key: "schedule", label: "ตารางเรียน", icon: CalendarDaysIcon },
  { key: "forms", label: "ฟอร์มผู้ปกครอง", icon: FileTextIcon },
  { key: "message", label: "ข้อความทีม", icon: MessageSquareIcon },
  { key: "other", label: "อื่นๆ", icon: BellIcon },
]
const KIND_TOPIC: Record<NotificationKind, Topic> = {
  low_sessions: "renewal", session_cancelled: "schedule", holiday_impact: "schedule", student_leave: "schedule",
  approval_needed: "approval", force_approved: "approval", form_submitted: "forms", message: "message", info: "other",
}

interface Alert {
  topic: Topic
  key: string
  icon: typeof BellIcon
  tone: string
  title: string
  detail: string
  href: string
}

/**
 * Two parts: live "to do" alerts derived from data (always correct, disappear when done),
 * and the history of events (cancellations, holidays, approvals needed).
 */
export default function NotificationsPage() {
  const now = useNow()
  const today = toDateStr(now)
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const s = useStore()
  const entitlements = useEntitlements()
  const mineOnly = !seesAllSessions(me)

  const alerts: Alert[] = []
  const recent = s.sessions.filter((x) => x.branchId === branch.id && x.date >= addDays(today, -14) && x.date <= today && (!mineOnly || x.teacherId === me.id))
  const w = recent.map((x) => ({ x, w: workState(x, now, s.attendance, s.summaries) }))
  const needAtt = w.filter((r) => r.w.state === "needs_attendance")
  const needSum = w.filter((r) => r.w.state === "needs_summary")
  if (needAtt.length) alerts.push({ topic: "teaching", key: "att", icon: ClipboardListIcon, tone: "text-red-600", title: `ยังไม่เช็คชื่อ ${needAtt.length} คาบ`, detail: needAtt.slice(0, 3).map((r) => `${fmtDate(r.x.date)} ${r.x.start} ${r.x.subject}`).join(" · "), href: "/sessions" })
  if (needSum.length) alerts.push({ topic: "teaching", key: "sum", icon: NotebookPenIcon, tone: "text-amber-600", title: `รอเขียนสรุป ${needSum.length} คาบ`, detail: "สรุปที่ยังไม่ส่งอนุมัติ", href: "/summaries" })
  if (can(me, "summary.approve")) {
    const n = s.summaries.filter((x) => x.status === "submitted" && x.authorId !== me.id && recent.some((r) => r.id === x.sessionId)).length
    if (n) alerts.push({ topic: "approval", key: "sa", icon: NotebookPenIcon, tone: "text-sky-600", title: `สรุปรออนุมัติ ${n} รายการ`, detail: "อนุมัติแล้วส่งผู้ปกครองได้", href: "/summaries" })
  }
  if (can(me, "billing.approve")) {
    const inv = s.invoices.filter((i) => i.branchId === branch.id && canApprove(i, me).ok)
    if (inv.length) alerts.push({ topic: "approval", key: "inv", icon: ReceiptIcon, tone: "text-sky-600", title: `ใบแจ้งหนี้รออนุมัติ ${inv.length} ใบ`, detail: inv.map((i) => i.number).join(", "), href: "/billing" })
    const pay = s.invoices.filter((i) => i.branchId === branch.id && i.payments.some((p) => !p.confirmedBy && p.recordedBy !== me.id))
    if (pay.length) alerts.push({ topic: "approval", key: "pay", icon: WalletIcon, tone: "text-violet-600", title: `ยอดเงินรอยืนยัน ${pay.length} ใบ`, detail: "คนบันทึกยืนยันเองไม่ได้", href: "/billing" })
  }
  if (!mineOnly) {
    const noTeacher = s.sessions.filter((x) => x.branchId === branch.id && !x.cancelled && x.date >= today && x.date <= addDays(today, 7) && !s.staff.find((t) => t.id === x.teacherId)?.active)
    if (noTeacher.length) alerts.push({ topic: "schedule", key: "nt", icon: UserXIcon, tone: "text-amber-600", title: `${noTeacher.length} คาบใน 7 วันยังไม่มีครู`, detail: noTeacher.slice(0, 3).map((x) => `${fmtDate(x.date, { weekday: true })} ${x.start}`).join(" · "), href: "/calendar" })
    // F4: session packs running low, subscriptions expiring — each a renewal opportunity
    entitlements.forEach((e) => {
      const stu = s.students.find((x) => x.id === e.studentId)
      if (!stu || stu.branchId !== branch.id || e.to < today) return
      const msg = Att.lowBalanceAlert(e, Att.balance(e, s.sessions, s.attendance, s.classes), today)
      const course = s.courses.find((c) => c.id === e.courseId)?.name ?? "คอร์ส"
      if (msg) alerts.push({ topic: "renewal", key: e.id, icon: AlertTriangleIcon, tone: "text-amber-600", title: `${studentLabel(stu, s.families.find((f) => f.id === stu.familyId)?.name)}: ${msg}`, detail: `${course} · กดเพื่อออกใบต่ออายุคอร์สนี้`, href: renewHref(stu.id, e.id) })
    })
  }

  const allHistory = s.notifications.filter((n) => visibleTo(n, me))
  const [topic, setTopic] = useQueryState<Topic | "all">("topic", "all")
  const [composing, setComposing] = useState(false)
  const countOf = (t: Topic) => alerts.filter((a) => a.topic === t).length + allHistory.filter((n) => KIND_TOPIC[n.kind] === t).length
  const shownAlerts = topic === "all" ? alerts : alerts.filter((a) => a.topic === topic)
  const history = topic === "all" ? allHistory : allHistory.filter((n) => KIND_TOPIC[n.kind] === topic)
  const unread = history.filter((n) => isUnread(n, me))
  const who = (id?: string) => s.staff.find((x) => x.id === id)?.nickname

  return (
    <Page className="max-w-4xl space-y-6">
      <div className="space-y-3">
        <PageHeader title="แจ้งเตือน" description="งานที่ต้องจัดการ และประวัติแจ้งเตือนของคุณ"
          actions={!composing && <Button onClick={() => setComposing(true)}><MessageSquarePlusIcon /> ส่งข้อความถึงทีม</Button>} />
        <div className="flex flex-wrap gap-1.5">
          <Chip on={topic === "all"} onClick={() => setTopic("all")} label="ทั้งหมด" count={alerts.length + allHistory.length} />
          {TOPICS.filter((t) => countOf(t.key) > 0 || topic === t.key).map((t) => (
            <Chip key={t.key} on={topic === t.key} onClick={() => setTopic(t.key)} icon={t.icon} label={t.label} count={countOf(t.key)} />
          ))}
        </div>
      </div>

      {composing && <TeamMessage onClose={() => setComposing(false)} />}

      <section>
        <h2 className="mb-2 font-semibold">ต้องจัดการ ({shownAlerts.length})</h2>
        {shownAlerts.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">ไม่มีงานค้าง</p>}
        <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
          {shownAlerts.map((a) => (
            <Link key={a.key} href={a.href} className="flex items-start gap-3 p-3 hover:bg-muted/40">
              <a.icon className={cn("mt-0.5 size-5 shrink-0", a.tone)} />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{a.title}</span>
                <span className="block truncate text-xs text-muted-foreground">{a.detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-center">
          <h2 className="font-semibold">ประวัติแจ้งเตือน</h2>
          {unread.length > 0 && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => s.markNotificationsRead(unread.map((n) => n.id))}><CheckCheckIcon /> อ่านทั้งหมด</Button>}
        </div>
        {history.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{topic === "all" ? "ยังไม่มีแจ้งเตือน" : "ไม่มีแจ้งเตือนในหัวข้อนี้"}</p>}
        <div className="divide-y overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
          {history.map((n) => {
            const unreadForMe = isUnread(n, me)
            return (
            <button key={n.id} onClick={() => s.markNotificationsRead([n.id])} className={cn("flex w-full items-start gap-3 p-3 text-left hover:bg-muted/40", unreadForMe && "bg-primary/5", n.kind === "force_approved" && "border-l-4 border-amber-400")}>
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", unreadForMe ? "bg-primary" : "bg-transparent")} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                  {n.kind === "force_approved" && <ShieldAlertIcon className="size-4 text-amber-600" />}
                  {n.kind === "message" && <MessageSquareIcon className="size-4 text-sky-600" />}
                  {n.title}
                  {n.fromId && <span className="text-xs font-normal text-muted-foreground">· จาก {who(n.fromId) ?? "?"}</span>}
                </span>
                <span className="block text-xs whitespace-pre-wrap text-muted-foreground">{n.body}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{fmtDateTime(n.at)}</span>
            </button>
            )
          })}
        </div>
      </section>
    </Page>
  )
}

function Chip({ on, onClick, label, count, icon: Icon }: { on: boolean; onClick: () => void; label: string; count: number; icon?: typeof BellIcon }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
      {Icon && <Icon className="size-3.5" />}{label}
      <span className={cn("rounded-full px-1.5 text-xs tabular-nums", on ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground")}>{count}</span>
    </button>
  )
}

/** Team communication: anyone can message the whole branch, one role, or specific people — opened from the
 *  "ส่งข้อความถึงทีม" button (owner 2026-10-07), closes after sending. */
function TeamMessage({ onClose }: { onClose: () => void }) {
  const branch = useBranch()
  const me = useStore((s) => s.me())
  const staff = useStore((s) => s.staff)
  const sendMsg = useStore((s) => s.sendTeamMessage)
  const [to, setTo] = useState<string>("branch")
  const [people, setPeople] = useState<string[]>([])
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const colleagues = staff.filter((x) => x.active && x.id !== me.id && x.branchIds.includes(branch.id))
  const roles: Role[] = ["manager", "admin", "teacher"]
  const target: MessageTarget = to === "branch" ? { kind: "branch" } : to === "people" ? { kind: "people", staffIds: people } : { kind: "role", role: to as Role }

  const send = () => {
    if (report(sendMsg(target, title, body), "ส่งข้อความถึงทีมแล้ว")) {
      setTitle("")
      setBody("")
      setPeople([])
      onClose()
    }
  }

  return (
    <section className="space-y-2 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex items-center">
        <h2 className="flex items-center gap-2 font-semibold"><MessageSquareIcon className="size-4" /> ส่งข้อความถึงทีม</h2>
        <Button size="icon-sm" variant="ghost" className="ml-auto" aria-label="ปิด" onClick={onClose}><XIcon /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <NativeSelect className="h-9 w-48" value={to} onChange={(e) => setTo(e.target.value)}
          options={[
            { value: "branch", label: `ทุกคนในสาขา${branch.name}` },
            ...roles.map((r) => ({ value: r, label: `${ROLE_LABEL[r]} ทุกคน (สาขานี้)` })),
            { value: "people", label: "เลือกเป็นรายคน" },
          ]} />
        <Input className="h-9 min-w-40 flex-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวข้อ (ไม่ใส่ก็ได้)" />
      </div>
      {to === "people" && (
        <div className="flex flex-wrap gap-3 rounded-lg border p-2">
          {colleagues.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-sm">
              <Checkbox checked={people.includes(c.id)} onCheckedChange={() => setPeople(people.includes(c.id) ? people.filter((x) => x !== c.id) : [...people, c.id])} />
              {c.nickname}
            </label>
          ))}
        </div>
      )}
      <Textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder="เช่น พรุ่งนี้ห้อง 2 แอร์เสีย ย้ายคาบ 13:00 ไปห้อง 3" />
      <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={onClose}>ยกเลิก</Button><Button size="sm" disabled={!body.trim()} onClick={send}><SendIcon /> ส่ง</Button></div>
    </section>
  )
}
