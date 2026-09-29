"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarIcon, CheckIcon, PencilIcon, UserRoundSearchIcon, XIcon } from "lucide-react"
import { Pill, type Tone } from "@/components/app/badges"
import { Button } from "@/components/ui/button"
import { fmtDate } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import { matchExistingFamily } from "@/domain/rules/people"
import type { FormOfferSlot, FormSubmission } from "@/domain/types"
import { approveSubmission, editSubmissionSlot, rejectSubmission } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { SlotPicker } from "./slot-picker"

const STATUS_LABEL: Record<FormSubmission["status"], string> = { pending: "รออนุมัติ", approved: "อนุมัติแล้ว", rejected: "ปฏิเสธแล้ว" }
const STATUS_TONE: Record<FormSubmission["status"], Tone> = { pending: "amber", approved: "green", rejected: "red" }

/**
 * The Test/Trial submission review UI — one card = one child, with all their parents, notes, and every
 * subject+slot they picked (2+ same-day/same-time picks book as one shared visit, unchanged rule) — plus
 * Approve/Edit/Reject while pending. Shared by the Inbox chat bubble and the Lead sheet so review logic
 * and markup live in exactly one place.
 */
export function SubmissionReviewCard({ submission: sub, onChanged }: { submission: FormSubmission; onChanged: () => void }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const families = useStore((s) => s.families)
  const now = useNow()

  const [editingPick, setEditingPick] = useState<number | null>(null)
  const [editSubject, setEditSubject] = useState("")
  const [editSlot, setEditSlot] = useState<FormOfferSlot | null>(null)
  const [busy, setBusy] = useState(false)

  const matchedFamily = sub.status === "pending" ? matchExistingFamily(families, { lineUserId: sub.lineUserId, phones: sub.parents.map((p) => p.phone) }) : null

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
  const startEdit = (i: number) => { setEditingPick(i); setEditSubject(sub.picks[i].chosenSubject); setEditSlot(null) }
  const saveEdit = async () => {
    if (editingPick === null || !editSlot) return
    setBusy(true)
    try {
      if (report(await editSubmissionSlot(sub, editingPick, editSubject, editSlot), "แก้ไขแล้ว")) {
        setEditingPick(null)
        setEditSlot(null)
        onChanged()
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="font-medium">ฟอร์ม{FORM_TYPE_LABEL[sub.type]} — {sub.studentName}{sub.studentNickname && ` (${sub.studentNickname})`}</div>
      <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        <div>นักเรียน: {sub.studentName} · {sub.studentGrade}{sub.studentBirthDate && ` · เกิด ${fmtDate(sub.studentBirthDate)}`}</div>
        {sub.studentNote && <div>หมายเหตุ: {sub.studentNote}</div>}
        {sub.parents.map((p, i) => (
          <div key={i}>
            ผู้ปกครอง{sub.parents.length > 1 ? ` ${i + 1}` : ""}: {p.name} · {p.phone}{p.relationship ? ` (${p.relationship})` : ""}{p.email ? ` · ${p.email}` : ""}
          </div>
        ))}
        {(sub.familyAddress || sub.familyPostcode) && <div>ที่อยู่: {[sub.familyAddress, sub.familyPostcode].filter(Boolean).join(" ")}</div>}
      </div>

      <div className="mt-1.5 space-y-1">
        {sub.picks.map((pick, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span>{pick.chosenSubject} · {fmtDate(pick.chosenSlot.date, { weekday: true })} {pick.chosenSlot.start} น. {pick.chosenSlot.source === "class" ? "(คลาสเดิม)" : ""}</span>
            {sub.status === "pending" && editingPick === null && (
              <button type="button" className="text-muted-foreground hover:text-foreground" aria-label="แก้ไขวิชานี้" onClick={() => startEdit(i)}><PencilIcon className="size-3" /></button>
            )}
          </div>
        ))}
      </div>

      <div className="mt-1.5 flex items-center gap-2">
        <Pill tone={STATUS_TONE[sub.status]}>{STATUS_LABEL[sub.status]}</Pill>
        {sub.status === "approved" && sub.createdSessionId && (
          <Link href={`/calendar?sessionId=${sub.createdSessionId}`} className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline">
            <CalendarIcon className="size-3" /> ดูในปฏิทิน
          </Link>
        )}
      </div>

      {matchedFamily && (
        <p className="mt-1.5 flex items-start gap-1 rounded-lg bg-sky-50 p-1.5 text-[11px] text-sky-900 dark:bg-sky-950 dark:text-sky-200">
          <UserRoundSearchIcon className="mt-0.5 size-3 shrink-0" /> พบครอบครัว &quot;{matchedFamily.name}&quot; ที่มีอยู่แล้ว (เบอร์/LINE ตรงกัน) — กดอนุมัติจะผูกนักเรียนคนนี้เข้าครอบครัวเดิม ไม่สร้างซ้ำ
        </p>
      )}

      {sub.status === "pending" && editingPick === null && (
        <div className="mt-2 flex gap-1.5">
          <Button size="xs" disabled={busy} onClick={approve}><CheckIcon /> อนุมัติ</Button>
          <Button size="xs" variant="ghost" className="text-red-700" disabled={busy} onClick={reject}><XIcon /> ปฏิเสธ</Button>
        </div>
      )}

      {sub.status === "pending" && editingPick !== null && (
        <div className="mt-2 space-y-2 rounded-lg border bg-background p-2">
          <SlotPicker
            branch={branch} staff={staff} sessions={sessions} classes={classes} holidays={holidays} now={now}
            subject={editSubject} onSubjectChange={(s) => { setEditSubject(s); setEditSlot(null) }} subjectOptions={branch.subjects}
            selected={editSlot ? new Set([editSlot.id]) : new Set()}
            onToggle={(slot) => setEditSlot((cur) => (cur?.id === slot.id ? null : slot))}
          />
          <div className="flex gap-1.5">
            <Button size="xs" disabled={!editSlot || busy} onClick={saveEdit}>บันทึก</Button>
            <Button size="xs" variant="ghost" onClick={() => { setEditingPick(null); setEditSlot(null) }}>ยกเลิก</Button>
          </div>
        </div>
      )}
    </div>
  )
}
