"use client"

// แจ้งลา / แจ้งลาออก from parents in LINE (owner 2026-10-14) — the office team handles each one here and the parent
// is told on LINE: a leave is recorded on the classes (หักโควตา or not), a notice to stop makes the student แจ้งออก.
import { useState } from "react"
import { CalendarOffIcon, CheckIcon, DoorOpenIcon, EllipsisIcon, XIcon } from "lucide-react"
import { Pill } from "./badges"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import { can } from "@/domain/rules/permissions"
import * as Loss from "@/domain/rules/loss"
import type { ParentRequest } from "@/domain/types"
import { closeParentRequest, fetchParentRequests } from "@/lib/parent-requests"
import { report } from "@/lib/feedback"
import { useLookup } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { toast } from "sonner"

export function ParentRequestsList({ branchId, showDone }: { branchId: string; showDone?: boolean }) {
  const reqs = useStore((s) => s.parentRequests ?? [])
  const students = useStore((s) => s.students)
  const mine = reqs.filter((r) => (r.branchId ?? students.find((x) => x.id === r.studentId)?.branchId) === branchId && (showDone || r.status === "new"))
  if (!mine.length) return null
  return (
    <section className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">คำขอจากผู้ปกครองทาง LINE <Pill tone="red">{mine.filter((r) => r.status === "new").length} รอจัดการ</Pill></p>
      {mine.map((r) => <RequestCard key={r.id} r={r} />)}
    </section>
  )
}

function RequestCard({ r }: { r: ParentRequest }) {
  const me = useStore((s) => s.me())
  const sync = useStore((s) => s.syncParentRequests)
  const markLeave = useStore((s) => s.markLeave)
  const exitFromParent = useStore((s) => s.exitFromParent)
  const attendance = useStore((s) => s.attendance)
  const system = useStore((s) => s.system)
  const L = useLookup()
  const [busy, setBusy] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [why, setWhy] = useState("")
  const open = r.status === "new"
  const allowed = can(me, "student.manage")

  const finish = async (status: "done" | "declined", result: string, reply: string) => {
    const res = await closeParentRequest({ id: r.id, status, result, by: me.id, reply })
    if (!res.ok) { toast.error(res.error ?? "บันทึกไม่สำเร็จ"); return false }
    sync(await fetchParentRequests())
    toast.success(`${result}${res.sent ? " · แจ้งผู้ปกครองทาง LINE แล้ว" : ""}`)
    return true
  }
  const recordLeave = async (noQuota: boolean) => {
    setBusy(true)
    const done = (r.sessions ?? []).filter((x) => markLeave(x.sessionId, r.studentId, { count: 1, noQuota }).ok)
    const failed = (r.sessions?.length ?? 0) - done.length
    if (!done.length) { setBusy(false); return toast.error("บันทึกลาไม่ได้ — คาบอาจเริ่มไปแล้ว หรือถูกยกเลิก") }
    const days = done.map((x) => `${fmtDate(x.date, { weekday: true })} ${x.start}`).join(", ")
    await finish("done", `บันทึกลา ${done.length} คาบ (${noQuota ? "ไม่หักโควตา" : "หักโควตา"})${failed ? ` · ${failed} คาบบันทึกไม่ได้` : ""}`,
      `บันทึกการลาของ${r.studentNickname}แล้วค่ะ ${days} 🙏`)
    setBusy(false)
  }
  const acceptExit = async () => {
    setBusy(true)
    if (report(exitFromParent(r), "")) await finish("done", "รับเรื่องแจ้งออกแล้ว — โทรคุยกับผู้ปกครอง แล้วปิดเรื่องในหน้านักเรียน", `รับเรื่องการหยุดเรียนของ${r.studentNickname}แล้วค่ะ แอดมินจะติดต่อกลับเร็วๆ นี้ 🙏`)
    setBusy(false)
  }
  const decline = async () => {
    setBusy(true)
    if (await finish("declined", why.trim(), `เรื่องที่แจ้งไว้สำหรับ${r.studentNickname}: ${why.trim()}`)) setDeclining(false)
    setBusy(false)
  }

  const Icon = r.kind === "leave" ? CalendarOffIcon : DoorOpenIcon
  return (
    <article className={`space-y-2 rounded-2xl p-3 ring-1 ${open ? (r.kind === "exit" ? "bg-red-50/70 ring-red-200 dark:bg-red-950/20" : "bg-amber-50/70 ring-amber-200 dark:bg-amber-950/20") : "bg-muted/30 ring-foreground/5"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${r.kind === "exit" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}><Icon className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{r.kind === "leave" ? "แจ้งลาหยุด" : "แจ้งลาออก"} · {L.student(r.studentId)?.nickname ?? r.studentNickname} <span className="font-normal text-muted-foreground">· {r.familyName} · {fmtDateTime(r.createdAt)}</span></p>
          {r.kind === "leave" ? (
            <ul className="mt-1 flex flex-wrap gap-1.5 text-xs">
              {r.sessions?.map((x) => {
                const a = attendance.find((m) => m.sessionId === x.sessionId && m.studentId === r.studentId)
                return <li key={x.sessionId} className="rounded-full bg-background px-2 py-0.5 ring-1 ring-foreground/10">{fmtDate(x.date, { weekday: true })} {x.start} · {x.subjects.join(" + ")}{a ? ` · ${a.status === "leave" ? "ลาแล้ว" : a.status === "present" ? "มาแล้ว" : a.status}` : ""}</li>
              })}
            </ul>
          ) : (
            <p className="mt-0.5 text-xs">เรียนวันสุดท้าย <b>{fmtDate(r.lastDate!, { weekday: true, year: true })}</b>{r.reasonIds?.length ? ` · เหตุผล: ${r.reasonIds.map((id) => Loss.reasonLabel(id, system.lossReasons)).join(", ")}` : ""}</p>
          )}
          {r.note && <p className="mt-1 text-xs text-muted-foreground">“{r.note}”</p>}
          {!open && <p className="mt-1 text-xs text-muted-foreground">{r.status === "done" ? "ดำเนินการแล้ว" : "ไม่ดำเนินการ"} · {L.teacher(r.handledBy ?? null).label} · {r.handledAt && fmtDateTime(r.handledAt)}{r.result ? ` — ${r.result}` : ""}</p>}
        </div>
      </div>
      {open && allowed && !declining && (
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="เพิ่มเติม" className="mr-auto" />}><EllipsisIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setDeclining(true)}><XIcon /> ไม่ดำเนินการ (แจ้งเหตุผล)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {r.kind === "leave" ? <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => recordLeave(true)}>บันทึกลา · ไม่หักโควตา</Button>
            <Button size="sm" disabled={busy} onClick={() => recordLeave(false)}><CheckIcon /> บันทึกลา · หักโควตา</Button>
          </> : <Button size="sm" disabled={busy} onClick={acceptExit}><CheckIcon /> รับเรื่อง (แจ้งออก)</Button>}
        </div>
      )}
      {declining && (
        <div className="space-y-1.5">
          <Textarea autoFocus rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="เหตุผล — ข้อความนี้ส่งถึงผู้ปกครองทาง LINE (จำเป็น)" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>ยกเลิก</Button>
            <Button size="sm" disabled={!why.trim() || busy} onClick={decline}>ส่ง</Button>
          </div>
        </div>
      )}
    </article>
  )
}
