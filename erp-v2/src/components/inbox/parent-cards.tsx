"use client"

// Handle what a parent sent right in their chat (owner 2026-10-14: "จัดการจากส่วน chat ได้เลย จะได้ง่าย") —
// the returned exit form shows the answers with ปิดการออก / ไม่ออกแล้ว, and a แจ้งลา / ลาออก / กลับมาเรียน from the
// parent app shows the same card as the Notifications page.
import { useEffect } from "react"
import { fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation, ExitResponse, Student } from "@/domain/types"
import { ExitPanel } from "@/components/app/student-exit"
import { RequestCard } from "@/components/app/parent-requests"
import { fetchParentRequests } from "@/lib/parent-requests"
import { useStore } from "@/store/store"
import { DoorOpenIcon } from "lucide-react"
import { Confirmation, ConfirmationBody, ConfirmationHeader } from "@/components/ai-elements/confirmation"

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
