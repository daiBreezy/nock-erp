"use client"

import { useState } from "react"
import Link from "next/link"
import { CalendarIcon, CheckIcon, EyeIcon, ClipboardListIcon, GraduationCapIcon, PencilIcon, XIcon } from "lucide-react"
import { Confirmation, ConfirmationActions, ConfirmationBody, ConfirmationHeader, ConfirmationResult } from "@/components/ai-elements/confirmation"
import { Button } from "@/components/ui/button"
import { fmtDate } from "@/domain/dates"
import { FORM_TYPE_LABEL, canEditTogether, repeatTrials } from "@/domain/rules/forms"
import { matchExistingFamily, submissionChanges } from "@/domain/rules/people"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { TriangleAlertIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Assessment, FormOfferSlot, FormSubmission } from "@/domain/types"
import { AssessmentResult } from "@/components/app/assessment-note"
import { approveSubmission, editSubmissionSlot, rejectSubmission } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { useBranch, useNow } from "@/lib/hooks"
import { can } from "@/domain/rules/permissions"
import { useStore } from "@/store/store"
import { SlotPicker, VisitPicker } from "./slot-picker"
import { SubmissionPreviewDialog } from "./submission-preview"
import { ReferrerPicker } from "./referrer-picker"
import { FamilyMatchChoice } from "@/components/app/family-match-choice"


/**
 * The Test/Trial submission review UI — one card = one child, with all their parents, notes, and every
 * subject+slot they picked (2+ same-day/same-time picks book as one shared visit, unchanged rule) — plus
 * Approve/Edit/Reject while pending. Shared by the Inbox chat bubble and the Lead sheet so review logic
 * and markup live in exactly one place.
 */
export function SubmissionReviewCard({ submission: sub, onChanged, groupMates, results }: { submission: FormSubmission; onChanged: () => void; groupMates?: FormSubmission[]
  /** owner 2026-11-25: on the Lead PANEL the approved card also holds the Test / Trial result (record it right here); in the chat this is left out — a result can only be recorded on the Panel */
  results?: { assessments: Assessment[]; editable: boolean } }) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const families = useStore((s) => s.families)
  const leads = useStore((s) => s.leads)
  const students = useStore((s) => s.students)
  const now = useNow()
  const me = useStore((s) => s.me())
  const assessments = useStore((s) => s.assessments)
  // owner 2026-11-20: one Trial per SUBJECT — a repeat needs the admin's reason (warned here before approving)
  const repeats = sub.status === "pending" && sub.type === "trial"
    ? repeatTrials(assessments, sessions, { leadId: sub.leadId, studentId: leads.find((l) => l.id === sub.leadId)?.trialStudentId }, sub.picks.map((p) => p.chosenSubject), sub.id)
    : []
  const [retrialReason, setRetrialReason] = useState("")
  const [previewing, setPreviewing] = useState(false)
  const needReason = repeats.length > 0 && !retrialReason.trim()

  const [editingPick, setEditingPick] = useState<number | null>(null)
  const [editSubject, setEditSubject] = useState("")
  const [editSlot, setEditSlot] = useState<FormOfferSlot | null>(null)
  // owner 2026-11-18: a form answered as ONE visit asks first — change one subject (they may split) or move all of them together
  const [ask, setAsk] = useState<number | null>(null)
  const [visitEdit, setVisitEdit] = useState<{ key: string; bySubject: Record<string, FormOfferSlot> } | null>(null)
  const [visitMode, setVisitMode] = useState(false)
  const oneVisit = canEditTogether(sub.type, sub.picks)
  const idle = editingPick === null && ask === null && !visitMode
  const [busy, setBusy] = useState(false)
  // owner 2026-11-18: a form can come back for a chat that has no Lead — the answers are enough to make one
  const noLead = !leads.some((l) => l.id === sub.primaryLeadId)
  const [askLead, setAskLead] = useState(false)

  const matchedFamily = sub.status === "pending" ? matchExistingFamily(families, { lineUserId: sub.lineUserId, phones: sub.parents.map((p) => p.phone) }) : null
  // a child we already know (test → trial) or a family on file: what did the parent change in this form?
  const knownStudent = students.find((x) => x.id === leads.find((l) => l.id === sub.leadId)?.trialStudentId)
  // owner 2026-10-29: the match is a suggestion — the admin picks รวม / แยก before approving
  const [newFamily, setNewFamily] = useState(false)
  const knownFamily = families.find((f) => f.id === knownStudent?.familyId) ?? (newFamily ? undefined : matchedFamily) ?? undefined
  const changes = sub.status === "pending" ? submissionChanges(knownFamily, knownStudent, sub) : []
  const [applyChanges, setApplyChanges] = useState(true)
  // owner 2026-11-19: "who told you about us" is free text — the system suggests the family, the admin confirms (or searches by hand)
  const [referrerId, setReferrerId] = useState<string | null>(null)

  /** returns true when it was approved (the preview dialog closes then) */
  const approve = async (): Promise<boolean> => {
    setBusy(true)
    try {
      if (report(await approveSubmission(sub, { applyChanges: changes.length > 0 && applyChanges, newFamily, referredByFamilyId: referrerId ?? undefined, retrialReason: repeats.length ? retrialReason.trim() : undefined }), (v) => (v.createdLead ? "อนุมัติแล้ว + สร้าง Lead จากฟอร์ม — สร้างคาบเรียนจริงแล้ว" : changes.length && applyChanges ? `อนุมัติแล้ว + อัปเดตข้อมูล ${changes.length} รายการ` : "อนุมัติแล้ว — สร้างคาบเรียนจริงแล้ว"))) { onChanged(); return true }
      return false
    } finally {
      setBusy(false)
    }
  }
  /** owner 2026-11-20: brothers/sisters on one Test form — approve them all in one go (they share one visit) */
  const approveGroup = async () => {
    setBusy(true)
    try {
      for (const x of [sub, ...(groupMates ?? [])]) {
        if (!report(await approveSubmission(x, { applyChanges: false }), tx("อนุมัติ {0} แล้ว", [x.studentNickname || x.studentName]))) return
      }
      onChanged()
    } finally {
      setBusy(false)
    }
  }
  const reject = async (createLead = false) => {
    setBusy(true)
    try {
      if (report(await rejectSubmission(sub, { createLead }), createLead ? "ปฏิเสธฟอร์มแล้ว — เก็บข้อมูลไว้เป็น Lead" : "ปฏิเสธฟอร์มแล้ว")) { setAskLead(false); onChanged() }
    } finally {
      setBusy(false)
    }
  }
  const onPencil = (i: number) => { if (oneVisit) setAsk(i); else startEdit(i) }
  const saveVisit = async () => {
    if (!visitEdit) return
    setBusy(true)
    try {
      // every subject keeps its place in the form, each moves to its own part of the new shared visit
      for (let i = 0; i < sub.picks.length; i++) {
        const slot = visitEdit.bySubject[sub.picks[i].chosenSubject]
        if (!slot) continue
        const r = await editSubmissionSlot(sub, i, sub.picks[i].chosenSubject, slot)
        if (!r.ok) { report(r, ""); return }
      }
      report({ ok: true, value: undefined }, tx("ย้ายทั้ง {0} วิชาแล้ว — ยังนัดพร้อมกัน", [sub.picks.length]))
      setVisitMode(false); setVisitEdit(null)
      onChanged()
    } finally {
      setBusy(false)
    }
  }
  const startEdit = (i: number) => { setAsk(null); setEditingPick(i); setEditSubject(sub.picks[i].chosenSubject); setEditSlot(null) }
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
    <Confirmation state={sub.status}>
      <ConfirmationHeader state={sub.status} icon={sub.type === "trial" ? <GraduationCapIcon /> : <ClipboardListIcon />}
        title={<>ฟอร์ม{FORM_TYPE_LABEL[sub.type]} — {sub.studentName}{sub.studentNickname && ` (${sub.studentNickname})`}</>} />
      <ConfirmationBody>
      {sub.referral && sub.status === "pending" && <div className="mt-1.5"><ReferrerPicker text={sub.referral} exceptFamilyId={knownFamily?.id} value={referrerId} onChange={setReferrerId} /></div>}
      {sub.referral && sub.status !== "pending" && <p className="mt-1.5 text-xs"><span className="text-muted-foreground">ใครแนะนำ (ผู้ปกครองพิมพ์):</span> <b>{sub.referral}</b></p>}

      <div className="mt-1.5 space-y-1">
        {sub.picks.map((pick, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs">
            <span>{pick.chosenSubject} · {fmtDate(pick.chosenSlot.date, { weekday: true })} {pick.chosenSlot.start} น. {pick.chosenSlot.source === "class" ? "(คลาสเดิม)" : ""}</span>
            {sub.status === "pending" && idle && (
              <Button variant="link" size="inline" type="button" className="text-muted-foreground hover:text-foreground" aria-label="แก้ไขวิชานี้" onClick={() => onPencil(i)}><PencilIcon className="size-3" /></Button>
            )}
          </div>
        ))}
      </div>


      {repeats.length > 0 && (
        <div className="mt-1.5 space-y-1.5 rounded-lg border border-warning/40 bg-warning-soft/60 p-2 text-2xs text-warning-ink">
          <p className="flex items-center gap-1 font-semibold"><TriangleAlertIcon className="size-3.5" /> Lead นี้เคย Trial วิชานี้ไปแล้ว</p>
          <ul className="space-y-0.5">
            {repeats.map((r) => <li key={r.subject}><b>{r.subject}</b> · {r.prior.map((a) => fmtDate(a.date)).join(", ")}</li>)}
          </ul>
          <p>ถ้าจะให้ Trial อีกครั้ง ต้องใส่เหตุผล (บันทึกไว้กับคาบ Trial)</p>
          <Textarea value={retrialReason} onChange={(e) => setRetrialReason(e.target.value)} rows={2} placeholder="เหตุผลที่ให้ Trial ซ้ำ" aria-label="เหตุผลที่ให้ Trial ซ้ำ" className="bg-background text-xs text-foreground" />
        </div>
      )}

      {matchedFamily && !knownStudent && (
        <FamilyMatchChoice className="mt-1.5" familyName={matchedFamily.name} reason="เบอร์ / LINE ตรงกัน" newFamily={newFamily} onChange={setNewFamily} />
      )}

      {/* owner 2026-11-25: the parent's personal details are not repeated here (Preview shows them) — only a short note that there is something new / changed */}
      {changes.length > 0 && (
        <div className="mt-1.5 space-y-1 text-2xs text-warning-ink">
          <p className="flex flex-wrap items-center gap-x-2"><b className="font-semibold">{tx("ผู้ปกครองแก้ข้อมูล {0} รายการ", [changes.length])}</b>
            <label className="flex items-center gap-1.5 font-medium"><Checkbox checked={applyChanges} onCheckedChange={(v) => setApplyChanges(!!v)} /> {tx("อัปเดตในระบบตามนี้ตอนอนุมัติ")}</label>
          </p>
          <ul className="space-y-0.5 text-muted-foreground">
            {changes.map((c) => <li key={c.key}>{c.label}: <span className="line-through opacity-60">{c.from}</span> → <b className="text-foreground">{c.to}</b></li>)}
          </ul>
        </div>
      )}

      {sub.status === "pending" && ask !== null && (
        <div className="mt-2 space-y-2 rounded-lg border bg-background p-2.5">
          <p className="text-xs font-medium">ฟอร์มนี้มีหลายวิชา — จะแก้แบบไหน?</p>
          <Button variant="outline" size="inline" type="button" className="block w-full rounded-lg p-2 text-left" onClick={() => startEdit(ask)}>
            <span className="block text-sm font-medium">แก้แยกวิชา <span className="font-normal text-muted-foreground">{sub.picks[ask].chosenSubject}</span></span>
            <span className="block text-xs font-normal text-muted-foreground">เปลี่ยนเฉพาะวิชานี้ — วัน เวลา อาจแยกกัน</span>
          </Button>
          <Button variant="outline" size="inline" type="button" className="block w-full rounded-lg p-2 text-left" onClick={() => { setAsk(null); setVisitMode(true); setVisitEdit(null) }}>
            <span className="block text-sm font-medium">{tx("แก้รวมทั้ง {0} วิชา", [sub.picks.length])}</span>
            <span className="block text-xs font-normal text-muted-foreground">ย้ายไปด้วยกัน — วัน เวลา ยังคงเดิม (นัดพร้อมกัน)</span>
          </Button>
          <Button size="xs" variant="ghost" onClick={() => setAsk(null)}>ยกเลิก</Button>
        </div>
      )}

      {sub.status === "pending" && visitMode && (
        <div className="mt-2 space-y-2 rounded-lg border bg-background p-2">
          <VisitPicker branch={branch} staff={staff} sessions={sessions} classes={classes} holidays={holidays} now={now}
            subjects={[...new Set(sub.picks.map((p) => p.chosenSubject))]} selectedKey={visitEdit?.key ?? null} onPick={(key, bySubject) => setVisitEdit((cur) => (cur?.key === key ? null : { key, bySubject }))} />
          <div className="flex gap-1.5">
            <Button size="xs" disabled={!visitEdit || busy} onClick={saveVisit}>บันทึก</Button>
            <Button size="xs" variant="ghost" onClick={() => { setVisitMode(false); setVisitEdit(null) }}>ยกเลิก</Button>
          </div>
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
      </ConfirmationBody>

      {sub.status === "pending" && idle && (
        <ConfirmationActions>
          {/* owner 2026-11-20: the whole answer sheet, read only — on the left so ปฏิเสธ / อนุมัติ stay together on the right */}
          <Button size="sm" variant="ghost" className="mr-auto" onClick={() => setPreviewing(true)}><EyeIcon /> Preview</Button>
          <Button size="sm" variant="outline" className="text-danger" disabled={busy} onClick={() => (noLead ? setAskLead(true) : reject())}><XIcon /> ปฏิเสธ</Button>
          <Button size="sm" disabled={busy || needReason} onClick={approve}><CheckIcon /> {noLead ? "อนุมัติ / สร้าง Lead" : "อนุมัติ"}</Button>
          {!!groupMates?.length && !noLead && <Button size="sm" disabled={busy || needReason} onClick={approveGroup}><CheckIcon /> {tx("อนุมัติทั้งกลุ่ม ({0} คน)", [groupMates.length + 1])}</Button>}
        </ConfirmationActions>
      )}
      {previewing && <SubmissionPreviewDialog sub={sub} onClose={() => setPreviewing(false)} editable={sub.status === "pending" && can(me, "session.manage")} onSaved={onChanged}
        onApprove={async () => { if (await approve()) setPreviewing(false) }} onReject={() => { setPreviewing(false); if (noLead) setAskLead(true); else void reject() }} approveBusy={busy} approveBlocked={needReason ? "ใส่เหตุผลที่ให้ Trial ซ้ำที่การ์ดก่อน" : undefined} approveLabel={noLead ? "อนุมัติ / สร้าง Lead" : "อนุมัติ"} />}
      {sub.status === "approved" && (
        <ConfirmationResult>
          <Button size="xs" variant="ghost" onClick={() => setPreviewing(true)}><EyeIcon /> Preview</Button>
          {sub.createdSessionId && (
            <Link href={`/calendar?sessionId=${sub.createdSessionId}`} className="ml-auto inline-flex items-center gap-1 text-info hover:underline">
              <CalendarIcon className="size-3" /> ดูในปฏิทิน
            </Link>
          )}
        </ConfirmationResult>
      )}
      {results && sub.status === "approved" && results.assessments.length > 0 && (
        <div className="space-y-2 border-t px-3.5 py-2.5">
          {results.assessments.map((a) => (
            <div key={a.id} className="space-y-1">
              {results.assessments.length > 1 && <p className="text-xs text-muted-foreground">{a.subject} · {fmtDate(a.date, { weekday: true })} {a.start}</p>}
              <AssessmentResult a={a} editable={results.editable} />
            </div>
          ))}
        </div>
      )}
      {sub.status === "rejected" && <ConfirmationResult><span>ไม่ได้สร้างคาบเรียน</span><Button size="xs" variant="ghost" onClick={() => setPreviewing(true)}><EyeIcon /> Preview</Button></ConfirmationResult>}
      {askLead && (
        <Dialog open onOpenChange={(o) => !o && setAskLead(false)}>
          <DialogContent className="lg:max-w-sm">
            <DialogHeader>
              <DialogTitle>เก็บข้อมูลนี้เป็น Lead ไว้ก่อนไหม?</DialogTitle>
              <DialogDescription>แชทนี้ยังไม่มี Lead แต่ผู้ปกครองกรอกข้อมูลมาครบแล้ว — ก่อนปฏิเสธฟอร์ม จะสร้าง Lead จากข้อมูลนี้ไว้ติดตามต่อไหม</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" disabled={busy} onClick={() => setAskLead(false)}>ยกเลิก</Button>
              <Button variant="outline" disabled={busy} onClick={() => reject(false)}>ปฏิเสธเลย ไม่สร้าง</Button>
              <Button disabled={busy} onClick={() => reject(true)}>สร้าง Lead แล้วปฏิเสธ</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </Confirmation>
  )
}
