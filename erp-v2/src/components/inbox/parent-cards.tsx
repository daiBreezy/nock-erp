"use client"

// Handle what a parent sent right in their chat (owner 2026-10-14: "จัดการจากส่วน chat ได้เลย จะได้ง่าย") —
// the returned exit form shows the answers with ปิดการออก / ไม่ออกแล้ว, and a แจ้งลา / ลาออก / กลับมาเรียน from the
// parent app shows the same card as the Notifications page.
import { useEffect, useState } from "react"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation, EnrollSubmission, ExitResponse, ID, Student } from "@/domain/types"
import { ExitPanel } from "@/components/app/student-exit"
import { RequestCard } from "@/components/app/parent-requests"
import { fetchParentRequests } from "@/lib/parent-requests"
import { useStore } from "@/store/store"
import { DoorOpenIcon, ReceiptIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EnrollReviewDialog } from "@/components/crm/enroll-review"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { fetchEnrollSubmissions } from "@/lib/forms"
import { Confirmation, ConfirmationActions, ConfirmationBody, ConfirmationHeader } from "@/components/ai-elements/confirmation"

/** the parent's exit form came back (meta, or the older plain message) */
export function isExitFormMessage(m: ChatMessage) {
  return m.meta?.formKind === "exit_form" || (m.author === "parent" && m.text.startsWith("📋 ส่งแบบฟอร์มแจ้งออก"))
}

export function ExitFormChatCard({ message, conversation }: { message: ChatMessage; conversation: Conversation }) {
  const students = useStore((s) => s.students)
  const ids = message.meta?.formKind === "exit_form" ? message.meta.studentIds : null
  const kids = students.filter((x) => (ids ? ids.includes(x.id) : x.familyId && x.familyId === conversation.familyId) && x.exit)
  return <ExitFormCardView at={message.at} kids={kids} linked={!!conversation.familyId} />
}

/** the card itself — also drawn by the examples page with sample students (`preview`) */
export function ExitFormCardView({ at, kids, linked, preview }: { at: string; kids: Student[]; linked: boolean; preview?: { response: ExitResponse | null } }) {
  const open = kids.some((k) => k.exit!.status !== "closed")
  // owner 2026-10-15: the same card as the rest of the chat — answers + ปิดการออก / ไม่ออกแล้ว inside it
  const state = open ? "pending" : kids.length ? "approved" : "waiting"
  return (
    <div className="flex">
      <Confirmation state={state} className="max-w-md">
        <ConfirmationHeader state={state} icon={<DoorOpenIcon />} label={open ? "รอดำเนินการ" : kids.length ? "ปิดเรื่องแล้ว" : "ไม่มีเรื่องค้าง"}
          title={<>ผู้ปกครองส่งฟอร์มแจ้งออก <span className="font-normal text-muted-foreground">· {fmtDateTime(at)}</span></>} />
        <ConfirmationBody className="space-y-3">
          {kids.length ? kids.map((stu) => <ExitPanel key={stu.id} stu={stu} bare preview={preview} />)
            : <p className="text-xs text-muted-foreground">{linked ? "ไม่มีเรื่องแจ้งออกที่เปิดอยู่ — ปิดเรื่องแล้ว หรือนักเรียนกลับมาเรียนแล้ว" : "ผูกแชทนี้กับครอบครัวก่อน จึงจะเห็นคำตอบและปิดการออกได้"}</p>}
        </ConfirmationBody>
      </Confirmation>
    </div>
  )
}

export function ParentRequestChatCard({ message }: { message: ChatMessage }) {
  const id = message.meta?.formKind === "parent_request" ? message.meta.requestId : ""
  const r = useStore((s) => (s.parentRequests ?? []).find((x) => x.id === id))
  const sync = useStore((s) => s.syncParentRequests)
  // a card that arrived before the 20-second check — fetch now
  useEffect(() => { if (!r && id) fetchParentRequests().then(sync) }, [r, id, sync])
  return <div className="flex"><div className="w-full max-w-md">{r ? <RequestCard r={r} /> : <p className="rounded-2xl bg-muted px-3 py-2 text-sm">กำลังโหลด…</p>}</div></div>
}

/** the parent sent the enroll form back — "📝 ส่งใบสมัครเรียน: …" (owner 2026-10-16: review it right in the chat) */
export function isEnrollSubmissionMessage(m: ChatMessage) {
  return m.author === "parent" && m.text.startsWith("📝 ส่งใบสมัครเรียน")
}

export function EnrollSubmissionChatCard({ message, conversation }: { message: ChatMessage; conversation: Conversation }) {
  const [subs, setSubs] = useState<EnrollSubmission[] | null>(null)
  const [open, setOpen] = useState(false)
  const [invoiceFor, setInvoiceFor] = useState<ID | null>(null)
  const load = () => fetchEnrollSubmissions().then(setSubs)
  useEffect(() => { load() }, [])
  // the submission from this chat closest to the message
  const lineUserId = conversation.id.startsWith("line_") ? conversation.id.slice(5) : undefined
  const sub = (subs ?? []).filter((x) => x.conversationId === conversation.id || (lineUserId && x.lineUserId === lineUserId))
    .sort((a, b) => Math.abs(+new Date(a.submittedAt) - +new Date(message.at)) - Math.abs(+new Date(b.submittedAt) - +new Date(message.at)))[0]
  const state = !sub ? "waiting" : sub.status === "pending" ? "pending" : sub.status === "approved" ? "approved" : "rejected"
  return (
    <div className="flex">
      <Confirmation state={state} className="max-w-md">
        <ConfirmationHeader state={state} icon={<UserPlusIcon />} label={!sub ? (subs ? "ไม่พบใบสมัคร" : "กำลังโหลด…") : sub.status === "pending" ? "รอสร้างนักเรียน" : sub.status === "approved" ? "สร้างนักเรียนแล้ว" : "ปิดใบสมัคร"}
          title={<>ผู้ปกครองส่งใบสมัครเรียน <span className="font-normal text-muted-foreground">· {fmtDateTime(message.at)}</span></>} />
        <ConfirmationBody className="pl-[3.25rem] text-xs text-muted-foreground">
          {sub ? sub.children.map((c, i) => <p key={i}><span className="font-medium text-foreground">{c.nickname || c.name}</span> · {c.grade}{c.classIds?.length ? ` · ${c.classIds.length} คลาส` : ""} · เริ่ม {fmtDate(c.startDate, { weekday: true })}{c.bus ? " · รถรับส่ง" : ""}</p>) : message.text.replace("📝 ", "")}
        </ConfirmationBody>
        {sub?.status === "pending" && (
          <ConfirmationActions>
            <Button size="sm" onClick={() => setOpen(true)}><ReceiptIcon /> สร้างนักเรียน + ใบแจ้งหนี้</Button>
          </ConfirmationActions>
        )}
      </Confirmation>
      {open && sub && <EnrollReviewDialog sub={sub} onClose={() => setOpen(false)} onDone={(ids) => { load(); if (ids?.[0]) setInvoiceFor(ids[0]) }} />}
      {invoiceFor && <InvoiceSheet id="new" defaultStudentId={invoiceFor} onClose={() => setInvoiceFor(null)} />}
    </div>
  )
}
