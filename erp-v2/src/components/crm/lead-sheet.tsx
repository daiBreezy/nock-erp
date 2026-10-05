"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArchiveIcon, CalendarIcon, EllipsisIcon, MessageCircleIcon, PhoneIcon, ReceiptIcon, RotateCcwIcon, SendIcon, StickyNoteIcon, UserCheckIcon, UserPlusIcon } from "lucide-react"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { CHANNEL_LABEL, followUpState, REACHED, RESULT_LABEL } from "@/domain/rules/loss"
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
  const [followingUp, setFollowingUp] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
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

  const isOpen = lead.stage !== "archived" && lead.stage !== "enrolled"
  const quiet = followUpState(lead, now)
  // one timeline: notes + calls / LINE follow-ups, newest first (owner 2026-10-05: tidy, nothing scattered)
  const timeline = [
    ...lead.notes.map((n, i) => ({ key: `n${i}`, at: n.at, by: n.by, kind: "note" as const, text: n.text })),
    ...(lead.followUps ?? []).map((f) => ({ key: f.id, at: f.at, by: f.by, kind: "fu" as const, text: f.note ?? "", f })),
  ].sort((x, y) => y.at.localeCompare(x.at))

  return (
    <>
      <SheetHeader className="gap-3 border-b pb-4">
        <div className="flex items-center gap-3 pr-8">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold", avatarTone(lead.id))}>{initial(lead.name)}</span>
          <div className="min-w-0">
            <SheetTitle className="text-lg">{lead.name} <span className={cn("ml-1 rounded px-1.5 py-0.5 align-middle text-xs", gradeTone(lead.childGrade))}>{lead.childGrade}</span></SheetTitle>
            <SheetDescription className="flex flex-wrap items-center gap-x-1.5">
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(lead.subject).chip)}>{lead.subject}</span>
              <span>{LEAD_SOURCE_LABEL[lead.source]} · {daysAgoLabel(lead.createdAt, now)}</span>
              {lead.direct && <Pill tone="green">สมัครตรง</Pill>}
            </SheetDescription>
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
          <span className="ml-auto flex items-center gap-1">
            {conversation && <Button size="icon-sm" variant="outline" aria-label="เปิดแชทใน Inbox" title="เปิดแชทใน Inbox" nativeButton={false} render={<Link href={`/inbox?conversation=${conversation.id}`} />}><MessageCircleIcon /></Button>}
            {latestAssessment && <Button size="icon-sm" variant="outline" aria-label="ดูคาบในปฏิทิน" title="ดูคาบสอบ / ทดลองในปฏิทิน" nativeButton={false} render={<Link href={`/calendar?sessionId=${latestAssessment.sessionId}`} />}><CalendarIcon /></Button>}
            {canManage && (
              // everything that isn't needed every time lives here (owner 2026-10-05)
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="icon-sm" variant="outline" aria-label="เพิ่มเติม" />}><EllipsisIcon /></DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  {isOpen ? (
                    <>
                      <DropdownMenuItem onClick={() => setFollowingUp(true)}><PhoneIcon /> บันทึกการติดตาม (โทร / LINE)</DropdownMenuItem>
                      <DropdownMenuItem disabled={!lead.lineUserId} onClick={() => setSendingFormOpen(true)}>
                        <SendIcon /><span className="flex flex-col"><span>ส่งฟอร์มสอบ / ทดลองเรียน</span>{!lead.lineUserId && <span className="text-xs text-muted-foreground">ต้องผูก LINE ใน Inbox ก่อน</span>}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEnrolling(true)}><UserPlusIcon /> ส่งใบสมัครเรียน (สมัครทันที)</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setArchiving(true)}><ArchiveIcon /> ปิด Lead</DropdownMenuItem>
                    </>
                  ) : lead.stage === "archived" ? (
                    <DropdownMenuItem onClick={() => report(restore(lead.id), "กู้คืนแล้ว")}><RotateCcwIcon /> กู้คืนจากคลัง</DropdownMenuItem>
                  ) : <DropdownMenuItem disabled>ลงทะเบียนแล้ว</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </span>
        </div>
        {canManage && isOpen && quiet.suggestClose && (
          <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <span className="flex-1">{quiet.lastReach ? `ตอบล่าสุด ${quiet.silentDays} วันก่อน` : "ยังติดต่อไม่ได้"} · ติดต่อไม่ได้ติดกัน {quiet.tries} ครั้ง</span>
            <Button size="xs" variant="outline" onClick={() => setArchiving(true)}><ArchiveIcon /> ปิด Lead?</Button>
          </div>
        )}
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        {pending.length > 0 && (
          <Section title={`ฟอร์มรอตรวจ (${pending.length})`}>
            {pending.map((sub) => (
              <div key={sub.id} className="rounded-xl border border-amber-300 bg-amber-50 p-2.5 text-xs dark:bg-amber-950/30">
                <SubmissionReviewCard submission={sub} onChanged={pollSubmissions} />
              </div>
            ))}
          </Section>
        )}

        {(lead.scheduledAt || myAssessments.length > 0) && (
          <Section title="นัดสอบ / ทดลองเรียน">
            {lead.scheduledAt && (lead.stage === "test_scheduled" || lead.stage === "trial_scheduled") && (() => {
              const due = scheduleInfo(lead.scheduledAt!, now)
              return <p className={cn(due.overdue ? "font-medium text-red-700" : due.daysLeft <= 1 ? "text-amber-700" : "")}>{fmtDateTime(lead.scheduledAt!)} · {due.overdue ? `เลยนัด ${-due.daysLeft} วัน` : due.daysLeft === 0 ? "วันนี้" : due.daysLeft === 1 ? "พรุ่งนี้" : `อีก ${due.daysLeft} วัน`}</p>
            })()}
            {myAssessments.map((a) => <AssessmentNote key={a.id} a={a} editable={canManage} showWhen />)}
          </Section>
        )}

        <Section title="ติดต่อ">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline"><PhoneIcon className="size-3.5" />{lead.phone}</a>}
            {lead.lineId && <span className="text-muted-foreground">LINE {lead.lineId}</span>}
            {!lead.phone && !lead.lineId && <span className="text-muted-foreground">ยังไม่มีช่องทางติดต่อ</span>}
          </div>
          {linkedFamily && (
            <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
              <p className="text-xs font-medium">{linkedFamily.name}</p>
              {linkedFamily.parents.map((p) => (
                <div key={p.name} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="text-sky-700 hover:underline">{p.name} · {p.phone}</a>
                  <Pill tone={p.lineLinked ? "green" : "amber"}>{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                </div>
              ))}
              {familyChildren.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                  <span className="text-xs text-muted-foreground">ลูก</span>
                  {familyChildren.map((c) => (
                    <button key={c.id} type="button" onClick={() => setOpenStudentId(c.id)} className="rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted">{c.nickname} · {c.grade}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </Section>

        {lead.stage === "archived" && (lead.lost || lead.archiveReason) && (
          <Section title="ทำไมถึงปิด Lead"><LostSummary lead={lead} /></Section>
        )}

        <Section title={`ประวัติการติดต่อ (${timeline.length})`}>
          {canManage && (
            <div className="flex gap-2">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="จดโน้ต / ผลคุย" rows={1} className="min-h-9 flex-1" />
              <Button size="sm" disabled={!note.trim()} onClick={() => { if (report(addNote(lead.id, note), "บันทึกโน้ตแล้ว")) setNote("") }}>บันทึก</Button>
            </div>
          )}
          {timeline.length ? (
            <ol className="space-y-2">
              {timeline.map((x) => (
                <li key={x.key} className="flex gap-2">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                    {x.kind === "note" ? <StickyNoteIcon className="size-3.5" /> : x.f.channel === "call" ? <PhoneIcon className="size-3.5" /> : <MessageCircleIcon className="size-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    {x.kind === "fu" && <span className={cn("mr-1.5 font-medium", REACHED.includes(x.f.result) ? "text-emerald-700" : "text-red-700")}>{CHANNEL_LABEL[x.f.channel]} · {RESULT_LABEL[x.f.result]}</span>}
                    {x.text && <span>{x.text}</span>}
                    <p className="text-xs text-muted-foreground">{staff.find((st) => st.id === x.by)?.nickname ?? "—"} · {fmtDateTime(x.at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          ) : <p className="text-muted-foreground">ยังไม่มีประวัติ</p>}
        </Section>

        {history.length > 0 && (
          <details className="rounded-xl border">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted-foreground">ฟอร์มก่อนหน้า ({history.length})</summary>
            <div className="space-y-2 border-t p-2.5">
              {history.map((sub) => <div key={sub.id} className="rounded-lg border bg-muted/30 p-2.5 text-xs"><SubmissionReviewCard submission={sub} onChanged={pollSubmissions} /></div>)}
            </div>
          </details>
        )}
      </div>

      <SheetFooter className="flex-row flex-wrap items-center justify-end gap-2">
        {!canManage ? (
          <p className="mr-auto text-xs text-muted-foreground">ดูอย่างเดียว — ไม่มีสิทธิ์จัดการ Lead</p>
        ) : lead.stage === "enrolled" ? (
          lead.convertedStudentId ? <Button size="sm" variant="outline" onClick={() => setOpenStudentId(lead.convertedStudentId!)}>เปิดโปรไฟล์นักเรียน</Button>
            : <p className="text-xs text-muted-foreground">ลงทะเบียนแล้ว — ยังไม่พบโปรไฟล์นักเรียนที่ผูกไว้</p>
        ) : lead.stage === "archived" ? (
          <Button size="sm" variant="outline" onClick={() => report(restore(lead.id), "กู้คืนแล้ว")}><RotateCcwIcon /> กู้คืนจากคลัง</Button>
        ) : lead.trialStudentId ? (
          <>
            <Button size="sm" variant="outline" onClick={() => setOpenStudentId(lead.trialStudentId!)}>เปิดโปรไฟล์นักเรียน</Button>
            {can(me, "billing.manage") && <Button size="sm" nativeButton={false} render={<Link href={`/billing?new=${lead.trialStudentId}`} />}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>}
          </>
        ) : (
          <Button size="sm" onClick={() => { const r = convert(lead.id); if (report(r, "สร้างนักเรียน + ครอบครัวแล้ว — ออกใบแจ้งหนี้ได้เลย")) setOpenStudentId(r.ok ? r.value.studentId : null) }}>
            <UserCheckIcon /> สร้างนักเรียน (ข้ามสอบ/ทดลอง)
          </Button>
        )}
        {canManage && AUTO_HINT[lead.stage] && <p className="basis-full text-right text-xs text-muted-foreground">อัตโนมัติ: {AUTO_HINT[lead.stage]}</p>}
      </SheetFooter>

      {archiving && <LeadLostDialog lead={lead} onClose={() => setArchiving(false)} />}
      {followingUp && (
        <Dialog open onOpenChange={(o) => !o && setFollowingUp(false)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader><DialogTitle>บันทึกการติดตาม · {lead.name}</DialogTitle><DialogDescription>โทร / ทัก LINE แล้วได้ผลยังไง — ใช้ตัดสินใจว่าควรปิด Lead ไหม</DialogDescription></DialogHeader>
            <FollowUpSection lead={lead} canManage={canManage} onClose={() => { setFollowingUp(false); setArchiving(true) }} />
          </DialogContent>
        </Dialog>
      )}
      {enrolling && (
        <Dialog open onOpenChange={(o) => !o && setEnrolling(false)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>ส่งใบสมัครเรียน · {lead.name}</DialogTitle><DialogDescription>สมัครทันที ไม่ต้องสอบ / ทดลองเรียน</DialogDescription></DialogHeader>
            <EnrollLinkButton lead={lead} />
          </DialogContent>
        </Dialog>
      )}
      {sendingFormOpen && lead.lineUserId && (
        <SendFormDialog leadId={lead.id} branchId={lead.branchId} conversationId={`line_${lead.lineUserId}`} lineUserId={lead.lineUserId} onClose={() => setSendingFormOpen(false)} />
      )}
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

/** One even block per topic — same title style and spacing everywhere in the sheet. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border p-3">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}
