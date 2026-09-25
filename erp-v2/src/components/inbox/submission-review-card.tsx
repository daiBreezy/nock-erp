"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarIcon, CheckIcon, PencilIcon, XIcon } from "lucide-react"
import { Pill, type Tone } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormSubmission } from "@/domain/types"
import { approveSubmission, editSubmissionSlot, rejectSubmission } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { SlotPicker } from "./slot-picker"

const STATUS_LABEL: Record<FormSubmission["status"], string> = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธแล้ว" }
const STATUS_TONE: Record<FormSubmission["status"], Tone> = { pending: "amber", approved: "green", rejected: "red" }

/**
 * The Test/Trial submission review UI — parent info, chosen slot, status, and (while pending)
 * Approve/Edit/Reject. Shared by the Inbox chat bubble and the Lead sheet so review logic and
 * markup live in exactly one place.
 */
export function SubmissionReviewCard({ submission: sub, onChanged }: { submission: FormSubmission; onChanged: () => void }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const now = useNow()

  const [editing, setEditing] = useState(false)
  const [editSubject, setEditSubject] = useState(sub.chosenSubject)
  const [editSlot, setEditSlot] = useState<FormOfferSlot | null>(null)
  const [busy, setBusy] = useState(false)

  const approve = async () => {
    setBusy(true)
    try {
      if (report(await approveSubmission(sub), "อนุมัติแล้ว — สร้างคาบเรียนจริงแล้ว")) onChanged()
    } finally {
      setBusy(false)
    }
  }
  const reject = async () => {
    setBusy(true)
    try {
      if (report(await rejectSubmission(sub), "ปฏิเสธฟอร์มแล้ว")) onChanged()
    } finally {
      setBusy(false)
    }
  }
  const saveEdit = async () => {
    if (!editSlot) return
    setBusy(true)
    try {
      if (report(await editSubmissionSlot(sub, editSubject, editSlot), "แก้ไขแล้ว")) {
        setEditing(false)
        setEditSlot(null)
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="font-medium">ฟอร์ม{FORM_TYPE_LABEL[sub.type]}</div>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <div>ผู้ปกครอง: {sub.parentName} · {sub.parentPhone}</div>
        <div>นักเรียน: {sub.studentName} · {sub.studentGrade}</div>
        <div>{sub.chosenSubject} · {sub.chosenSlot.date} {sub.chosenSlot.start} น. {sub.chosenSlot.source === "class" ? "(คลาสเดิม)" : ""}</div>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <Pill tone={STATUS_TONE[sub.status]}>{STATUS_LABEL[sub.status]}</Pill>
        {sub.status === "approved" && sub.createdSessionId && (
          <Link href={`/calendar?sessionId=${sub.createdSessionId}`} className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">
            <CalendarIcon className="size-3" /> ดูในปฏิทิน
          </Link>
        )}
      </div>

      {sub.status === "pending" && !editing && (
        <div className="mt-2 flex gap-1.5">
          <Button size="xs" disabled={busy} onClick={approve}><CheckIcon /> อนุมัติ</Button>
          <Button size="xs" variant="outline" disabled={busy} onClick={() => setEditing(true)}><PencilIcon /> แก้ไข</Button>
          <Button size="xs" variant="ghost" className="text-red-700" disabled={busy} onClick={reject}><XIcon /> ปฏิเสธ</Button>
        </div>
      )}

      {sub.status === "pending" && editing && (
        <div className="mt-2 space-y-2 rounded-lg border bg-background p-2">
          <SlotPicker
            branch={branch} staff={staff} sessions={sessions} classes={classes} holidays={holidays} now={now}
            subject={editSubject} onSubjectChange={(s) => { setEditSubject(s); setEditSlot(null) }} subjectOptions={branch.subjects}
            selected={editSlot ? new Set([editSlot.id]) : new Set()}
            onToggle={(slot) => setEditSlot((cur) => (cur?.id === slot.id ? null : slot))}
          />
          <div className="flex gap-1.5">
            <Button size="xs" disabled={!editSlot || busy} onClick={saveEdit}>บันทึก</Button>
            <Button size="xs" variant="ghost" onClick={() => { setEditing(false); setEditSlot(null) }}>ยกเลิก</Button>
          </div>
        </div>
      )}
    </div>
  )
}
