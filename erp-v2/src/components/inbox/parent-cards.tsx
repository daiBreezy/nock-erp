"use client"

// Handle what a parent sent right in their chat (owner 2026-10-14: "จัดการจากส่วน chat ได้เลย จะได้ง่าย") —
// the returned exit form shows the answers with ปิดการออก / ไม่ออกแล้ว, and a แจ้งลา / ลาออก / กลับมาเรียน from the
// parent app shows the same card as the Notifications page.
import { useEffect } from "react"
import { fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation } from "@/domain/types"
import { ExitPanel } from "@/components/app/student-exit"
import { RequestCard } from "@/components/app/parent-requests"
import { fetchParentRequests } from "@/lib/parent-requests"
import { useStore } from "@/store/store"

/** the parent's exit form came back (meta, or the older plain message) */
export function isExitFormMessage(m: ChatMessage) {
  return m.meta?.formKind === "exit_form" || (m.author === "parent" && m.text.startsWith("📋 ส่งแบบฟอร์มแจ้งออก"))
}

function Frame({ m, children }: { m: ChatMessage; children: React.ReactNode }) {
  return (
    <div className="max-w-[85%] space-y-1.5">
      <p className="text-xs text-muted-foreground">{m.text} · {fmtDateTime(m.at)}</p>
      {children}
    </div>
  )
}

export function ExitFormChatCard({ message, conversation }: { message: ChatMessage; conversation: Conversation }) {
  const students = useStore((s) => s.students)
  const ids = message.meta?.formKind === "exit_form" ? message.meta.studentIds : null
  const kids = students.filter((x) => (ids ? ids.includes(x.id) : x.familyId && x.familyId === conversation.familyId) && x.exit)
  return (
    <Frame m={message}>
      {kids.length ? kids.map((stu) => <ExitPanel key={stu.id} stu={stu} />) : <p className="rounded-2xl bg-muted px-3 py-2 text-sm">ผูกแชทนี้กับครอบครัวก่อน จึงจะเห็นคำตอบและปิดการออกได้</p>}
    </Frame>
  )
}

export function ParentRequestChatCard({ message }: { message: ChatMessage }) {
  const id = message.meta?.formKind === "parent_request" ? message.meta.requestId : ""
  const r = useStore((s) => (s.parentRequests ?? []).find((x) => x.id === id))
  const sync = useStore((s) => s.syncParentRequests)
  // a card that arrived before the 20-second check — fetch now
  useEffect(() => { if (!r && id) fetchParentRequests().then(sync) }, [r, id, sync])
  return <Frame m={message}>{r ? <RequestCard r={r} /> : <p className="rounded-2xl bg-muted px-3 py-2 text-sm">กำลังโหลด…</p>}</Frame>
}
