"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArchiveIcon, CalendarIcon, MessageCircleIcon, PhoneIcon, ReceiptIcon, RotateCcwIcon, SendIcon, UserCheckIcon } from "lucide-react"
import { AssessmentNote } from "@/components/app/assessment-note"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone, avatarTone, initial, subjectColor } from "@/components/app/subject-color"
import { StudentSheet } from "@/components/app/student-sheet"
import { SendFormDialog } from "@/components/inbox/send-form-dialog"
import { FollowUpSection, LeadLostDialog, LostSummary } from "@/components/crm/lead-followups"
import { Input } from "@/components/ui/input"
import { sendEnrollForm } from "@/lib/forms"
import { SubmissionReviewCard } from "@/components/inbox/submission-review-card"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDateTime } from "@/domain/dates"
import { BOARD_GROUPS, daysAgoLabel, groupOf, LEAD_SOURCE_LABEL, scheduleInfo, STAGE_FOR_GROUP, stageGroupLabel } from "@/domain/rules/crm"
import { can } from "@/domain/rules/permissions"
import type { FormSubmission, ID, Lead, LeadStage } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** Stages that now move by themselves (E2E 2026-09-28) — the sheet says what will move them instead of a button. */
const AUTO_HINT: Partial<Record<LeadStage, string>> = {
  test_scheduled: "เช็คชื่อ “มา” ในคาบสอบ → เป็น “สอบแล้ว” เอง",
  tested: "ส่งฟอร์มทดลองเรียนด้านล่าง",
  trial_scheduled: "เช็คชื่อ “มา” ในคาบทดลอง → เป็น “ทดลองเรียนแล้ว” เอง",
  trialed: "ผู้ปกครองเลือกวันเริ่มเรียนแล้ว → ออกใบแจ้งหนี้ · ส่งแล้วเป็น “รอชำระเงิน” เอง",
  payment_pending: "ยืนยันยอดเงินครบ → เป็นนักเรียน (“ลงทะเบียนแล้ว”) เอง พร้อมส่งใบเสร็จทาง LINE",
}

/**
 * Every side panel in the app follows the same 3-part shell: SheetHeader (pinned) → scrolling body →
 * SheetFooter (pinned CTA row) — see src/components/ui/sheet.tsx. Keep new sections in the body; the
 * footer is reserved for the sheet's primary action(s) so it never has to be hunted for while scrolling.
 */
export function LeadSheet({ leadId, onClose }: { leadId: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 data-[side=right]:sm:max-w-lg">{leadId && <Body id={leadId} />}</SheetContent>
    </Sheet>
  )
}

function Body({ id }: { id: ID }) {
  const lead = useStore((s) => s.leads.find((x) => x.id === id))
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const conversations = useStore((s) => s.conversations)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const moveStage = useStore((s) => s.moveLeadStage)
  const restore = useStore((s) => s.restoreLead)
  const addNote = useStore((s) => s.addLeadNote)
  const convert = useStore((s) => s.convertLeadToStudent)
  const now = useNow()
  const [note, setNote] = useState("")
  const [archiving, setArchiving] = useState(false)
  const [openStudentId, setOpenStudentId] = useState<ID | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [sendingFormOpen, setSendingFormOpen] = useState(false)
  const assessments = useStore((s) => s.assessments)

  const pollSubmissions = () => fetch("/api/forms/submissions").then((r) => r.json()).then((d) => setSubmissions(d.submissions ?? [])).catch(() => {})
  useEffect(() => {
    let cancelled = false
    const poll = () => fetch("/api/forms/submissions").then((r) => r.json()).then((d) => { if (!cancelled) setSubmissions(d.submissions ?? []) }).catch(() => {})
    poll()
    const t = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (!lead) return null
  const myAssessments = assessments.filter((a) => a.leadId === lead.id).sort((a, b) => a.date.localeCompare(b.date))
  const latestAssessment = myAssessments.at(-1)
  const mySubmissions = submissions.filter((s) => s.leadId === lead.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const pending = mySubmissions.filter((s) => s.status === "pending")
  const history = mySubmissions.filter((s) => s.status !== "pending")

  // once a lead has a real Student record (trial or fully converted), its family — parents, siblings — is
  // the fuller, live contact record; show it here too so this panel never falls behind what Inbox knows
  const linkedStudent = students.find((s) => s.id === (lead.convertedStudentId ?? lead.trialStudentId))
  const linkedFamily = linkedStudent ? families.find((f) => f.id === linkedStudent.familyId) : undefined
  const familyChildren = linkedFamily ? students.filter((s) => s.familyId === linkedFamily.id) : []
  const conversation = conversations.find((c) => c.leadId === lead.id)

  const assignee = staff.find((x) => x.id === lead.assigneeId)
  const canManage = can(me, "lead.manage")
  const stageEditable = canManage && lead.stage !== "archived" && lead.stage !== "enrolled"

  return (
    <>
      <SheetHeader className="border-b pb-3">
        <div className="flex items-center gap-3 pr-8">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold", avatarTone(lead.id))}>{initial(lead.name)}</span>
          <div className="min-w-0">
            <SheetTitle className="text-lg">{lead.name} <span className={cn("ml-1 rounded px-1.5 py-0.5 align-middle text-xs", gradeTone(lead.childGrade))}>{lead.childGrade}</span></SheetTitle>
            <SheetDescription>{lead.subject} · {LEAD_SOURCE_LABEL[lead.source]} · {daysAgoLabel(lead.createdAt, now)}</SheetDescription>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {stageEditable ? (
            // 4 choices = the 4 board columns (owner 2026-10-05); the steps inside them move automatically
            <NativeSelect
              className="h-8 w-40"
              value={groupOf(lead.stage).key}
              onChange={(e) => {
                const g = BOARD_GROUPS.find((x) => x.key === e.target.value)
                if (g && g.key !== groupOf(lead.stage).key) report(moveStage(lead.id, STAGE_FOR_GROUP[g.key]), `ย้ายไป "${g.label}" แล้ว`)
              }}
              options={BOARD_GROUPS.map((g) => ({ value: g.key, label: g.label }))}
            />
          ) : (
            <Pill tone={lead.stage === "archived" ? "gray" : lead.stage === "enrolled" ? "green" : "blue"}>{stageGroupLabel(lead.stage)}</Pill>
          )}
          {assignee && <Pill tone="gray"><UserCheckIcon className="size-3" /> {assignee.nickname}</Pill>}
        </div>
        {(conversation || latestAssessment) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {conversation && (
              <Button size="xs" variant="outline" nativeButton={false} render={<Link href={`/inbox?conversation=${conversation.id}`} />}>
                <MessageCircleIcon /> เปิดแชทใน Inbox
              </Button>
            )}
            {latestAssessment && (
              <Button size="xs" variant="outline" nativeButton={false} render={<Link href={`/calendar?sessionId=${latestAssessment.sessionId}`} />}>
                <CalendarIcon /> ดูคาบในปฏิทิน
              </Button>
            )}
          </div>
        )}
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4 text-sm">
        <Section title="ความสนใจ">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(lead.subject).chip)}>{lead.subject}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(lead.childGrade))}>{lead.childGrade}</span>
            <Pill tone="gray">{LEAD_SOURCE_LABEL[lead.source]}</Pill>
            {lead.direct && <Pill tone="green">สมัครตรง (ไม่ผ่านสอบ/ทดลอง)</Pill>}
          </div>
        </Section>

        <Section title="ติดต่อ">
          <div className="space-y-1">
            {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline"><PhoneIcon className="size-3" />{lead.phone}</a>}
            {lead.lineId && <div className="text-muted-foreground">LINE: {lead.lineId}</div>}
            {!lead.phone && !lead.lineId && <p className="text-muted-foreground">ยังไม่มีช่องทางติดต่อ</p>}
          </div>
          {linkedFamily && (
            <div className="mt-2 space-y-1.5 rounded-lg border bg-muted/30 p-2">
              <p className="text-xs font-medium">{linkedFamily.name}</p>
              {linkedFamily.parents.map((p) => (
                <div key={p.name} className="text-xs">
                  <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="text-sky-700 hover:underline">{p.name} · {p.phone}</a>
                  <Pill tone={p.lineLinked ? "green" : "amber"} className="ml-1">{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                </div>
              ))}
              {familyChildren.length > 0 && (
                <div className="pt-1">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">ลูก ({familyChildren.length})</p>
                  <div className="flex flex-wrap gap-1">
                    {familyChildren.map((s) => (
                      <button key={s.id} type="button" onClick={() => setOpenStudentId(s.id)} className="rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted">{s.nickname} · {s.grade}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Section>

        {lead.scheduledAt && (
          <Section title="นัดหมาย Test/Trial">
            {lead.stage === "test_scheduled" || lead.stage === "trial_scheduled" ? (() => {
              const due = scheduleInfo(lead.scheduledAt!, now)
              return (
                <div className={cn(due.overdue ? "font-medium text-red-700" : due.daysLeft <= 1 ? "text-amber-700" : "text-muted-foreground")}>
                  {fmtDateTime(lead.scheduledAt!)} · {due.overdue ? `เลยนัด ${-due.daysLeft} วัน` : due.daysLeft === 0 ? "วันนี้" : due.daysLeft === 1 ? "พรุ่งนี้" : `อีก ${due.daysLeft} วัน`}
                </div>
              )
            })() : (
              <div className="text-muted-foreground">{fmtDateTime(lead.scheduledAt)}</div>
            )}
          </Section>
        )}

        {myAssessments.length > 0 && (
          <Section title="ผลสอบ / ทดลองเรียน">
            <div className="space-y-2">
              {myAssessments.map((a) => (
                <div key={a.id}>
                  <AssessmentNote a={a} editable={canManage} showWhen />
                  <Link href={`/calendar?sessionId=${a.sessionId}`} className="mt-1 inline-flex items-center gap-1 text-xs text-sky-700 hover:underline"><CalendarIcon className="size-3" /> ดูคาบนี้ในปฏิทิน</Link>
                </div>
              ))}
            </div>
          </Section>
        )}

        {lead.stage === "archived" && (lead.lost || lead.archiveReason) && (
          <Section title="ทำไมถึงปิด Lead"><LostSummary lead={lead} /></Section>
        )}

        <Section title={`การติดตาม (${lead.followUps?.length ?? 0})`}>
          <FollowUpSection lead={lead} canManage={canManage} onClose={() => setArchiving(true)} />
        </Section>

        {canManage && lead.stage !== "enrolled" && lead.stage !== "archived" && (
          <Section title="สมัครเรียนทันที (ไม่ต้องสอบ / ทดลอง)">
            <EnrollLinkButton lead={lead} />
          </Section>
        )}

        {canManage && lead.stage !== "enrolled" && lead.stage !== "archived" && (
          <Section title="แบบฟอร์ม">
            {!lead.lineUserId ? (
              <p className="text-muted-foreground">ยังไม่ได้ผูก LINE — ผูกได้จากหน้า Inbox ก่อนถึงจะส่งฟอร์มได้</p>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setSendingFormOpen(true)}><SendIcon /> ส่งฟอร์ม</Button>
            )}
            {pending.length > 0 && (
              <div className="mt-3 space-y-2">
                {pending.map((sub) => (
                  <div key={sub.id} className="rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs">
                    <SubmissionReviewCard submission={sub} onChanged={pollSubmissions} />
                  </div>
                ))}
              </div>
            )}
            {history.length > 0 && (
              <details className="mt-3 rounded-lg border">
                <summary className="cursor-pointer px-2.5 py-2 text-xs font-medium text-muted-foreground">ประวัติแบบฟอร์มก่อนหน้า ({history.length})</summary>
                <div className="space-y-2 border-t p-2.5">
                  {history.map((sub) => (
                    <div key={sub.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs">
                      <SubmissionReviewCard submission={sub} onChanged={pollSubmissions} />
                    </div>
                  ))}
                </div>
              </details>
            )}
            {sendingFormOpen && lead.lineUserId && (
              <SendFormDialog
                leadId={lead.id} branchId={lead.branchId} conversationId={`line_${lead.lineUserId}`} lineUserId={lead.lineUserId}
                onClose={() => setSendingFormOpen(false)}
              />
            )}
          </Section>
        )}

        <Section title={`โน้ต (${lead.notes.length})`}>
          <div className="space-y-2">
            {lead.notes.length === 0 && <p className="text-muted-foreground">ยังไม่มีโน้ต</p>}
            {[...lead.notes].reverse().map((n, i) => (
              <div key={i} className="rounded-lg border p-2">
                <p>{n.text}</p>
                <p className="mt-1 text-xs text-muted-foreground">{staff.find((s) => s.id === n.by)?.nickname ?? n.by} · {fmtDateTime(n.at)}</p>
              </div>
            ))}
          </div>
          {canManage && (
            <div className="mt-2 flex gap-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="บันทึกการติดต่อ / ผลคุย" rows={2} className="flex-1" />
              <Button size="sm" disabled={!note.trim()} onClick={() => { if (report(addNote(lead.id, note), "บันทึกโน้ตแล้ว")) setNote("") }}>บันทึก</Button>
            </div>
          )}
        </Section>
      </div>

      <SheetFooter className="flex-row flex-wrap items-center justify-between gap-2">
        {!canManage ? (
          <p className="text-xs text-muted-foreground">ดูอย่างเดียว — ไม่มีสิทธิ์จัดการ Lead</p>
        ) : (
          <>
            <div>
              {lead.stage === "archived" ? (
                <Button size="sm" variant="outline" onClick={() => report(restore(lead.id), "กู้คืนแล้ว")}><RotateCcwIcon /> กู้คืนจากคลัง</Button>
              ) : lead.stage !== "enrolled" && (
                <Button size="sm" variant="ghost" className="text-muted-foreground hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30" onClick={() => setArchiving(true)}><ArchiveIcon /> ปิด Lead</Button>
              )}
            </div>
            {lead.stage === "enrolled" ? (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {lead.convertedStudentId ? (
                  <Button size="sm" variant="outline" onClick={() => setOpenStudentId(lead.convertedStudentId!)}>เปิดโปรไฟล์นักเรียน</Button>
                ) : (
                  <p className="text-xs text-muted-foreground">ลงทะเบียนแล้ว — ยังไม่พบโปรไฟล์นักเรียนที่ผูกไว้</p>
                )}
              </div>
            ) : lead.stage !== "archived" && (
              <div className="flex flex-wrap items-center justify-end gap-1.5">
                {lead.trialStudentId ? (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setOpenStudentId(lead.trialStudentId!)}>เปิดโปรไฟล์นักเรียน</Button>
                    {can(me, "billing.manage") && <Button size="sm" nativeButton={false} render={<Link href={`/billing?new=${lead.trialStudentId}`} />}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>}
                  </>
                ) : (
                  <Button size="sm" onClick={() => { const r = convert(lead.id); if (report(r, "สร้างนักเรียน + ครอบครัวแล้ว — ออกใบแจ้งหนี้ได้เลย")) setOpenStudentId(r.ok ? r.value.studentId : null) }}>
                    <UserCheckIcon /> สร้างนักเรียน (ข้ามสอบ/ทดลอง)
                  </Button>
                )}
              </div>
            )}
          </>
        )}
        {canManage && AUTO_HINT[lead.stage] && <p className="basis-full text-xs text-muted-foreground">อัตโนมัติ: {AUTO_HINT[lead.stage]}</p>}
      </SheetFooter>

      {archiving && <LeadLostDialog lead={lead} onClose={() => setArchiving(false)} />}
      <StudentSheet studentId={openStudentId} onClose={() => setOpenStudentId(null)} />
    </>
  )
}

/** Enroll-now form for this lead (owner 2026-10-05) — pushed in LINE when linked, otherwise a link to copy. */
function EnrollLinkButton({ lead }: { lead: Lead }) {
  const [busy, setBusy] = useState(false)
  const [url, setUrl] = useState("")
  const send = async () => {
    setBusy(true)
    const r = await sendEnrollForm(lead)
    setBusy(false)
    if (report(r, (v) => (v.sent ? "ส่งใบสมัครเรียนทาง LINE แล้ว" : "สร้างลิงก์แล้ว — คัดลอกส่งให้ผู้ปกครอง")) && !r.value.sent) setUrl(r.value.url)
  }
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">ผู้ปกครองกรอกข้อมูล + เลือกคอร์ส/เวลาที่สะดวก → ขึ้นที่หัวหน้า CRM ให้จัดคลาสและออกใบแจ้งหนี้</p>
      <Button size="sm" variant="outline" disabled={busy} onClick={send}><SendIcon /> {lead.lineUserId ? "ส่งใบสมัครเรียนทาง LINE" : "สร้างลิงก์ใบสมัครเรียน"}</Button>
      {url && <Input readOnly value={url} className="h-8 text-xs" onFocus={(e) => { e.target.select(); navigator.clipboard?.writeText(url) }} />}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}
