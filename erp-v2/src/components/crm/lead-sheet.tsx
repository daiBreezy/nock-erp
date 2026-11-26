"use client"

import { tx } from "@/lib/i18n"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { PanelForm } from "@/components/app/form-shell"
import { CoursePicker } from "@/components/billing/course-picker"
import { LeadDialog } from "./lead-dialog"
import Link from "next/link"
import { useEffect, useState } from "react"
import { SchoolPicker } from "@/components/app/school-picker"
import { BookOpenIcon, CalendarPlusIcon, ChevronDownIcon, ClipboardListIcon, PlusIcon, TargetIcon, XIcon, ArchiveIcon, CalendarIcon, GraduationCapIcon, MessageCircleIcon, PhoneIcon, ReceiptIcon, RotateCcwIcon, SendIcon, StickyNoteIcon, UserCheckIcon, UsersRoundIcon, PencilIcon, UserPlusIcon, UsersIcon } from "lucide-react"
import { AssessmentNote } from "@/components/app/assessment-note"
import { Pill } from "@/components/app/badges"
import { LeadChildDialog } from "@/components/crm/lead-child-dialog"
import { PanelFooter, PanelMore } from "@/components/app/form-shell"
import { Tabs } from "@/components/app/page-layout"
import { CourseWishEditor, LeadParentCard, ReturnsHint, SentForms, useSentForms } from "./lead-form-block"
import { decideSend, FORM_LABEL } from "@/domain/rules/form-send"
import { revokeFormLink } from "@/lib/forms"
import { FamilyInfoTab } from "@/components/app/family-info-tab"
import { FamilyForm, type FamilyFormOnly } from "@/components/app/family-form"
import { FamilyEditItems, type EditTarget } from "@/components/app/family-edit-menu"
import { NativeSelect } from "@/components/app/native-select"
import { gradeTone, avatarTone, initial, subjectColor } from "@/components/app/subject-color"
import { StudentSheet } from "@/components/app/student-sheet"
import { SendFormDialog } from "@/components/inbox/send-form-dialog"
import { FollowUpSection, LeadLostDialog, LostSummary } from "@/components/crm/lead-followups"
import { Input } from "@/components/ui/input"
import { sendEnrollForm, sendEnrollToChat } from "@/lib/forms"
import { Checkbox } from "@/components/ui/checkbox"
import { tagChip } from "@/components/app/tags"
import { classesOfCourse } from "@/domain/rules/catalog"
import { enrollClassOffers } from "@/domain/rules/forms"
import { SubmissionReviewCard } from "@/components/inbox/submission-review-card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CHANNEL_LABEL, followUpState, REACHED, RESULT_LABEL } from "@/domain/rules/loss"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { weekdayShort, fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import { InvoiceRows, INV_STATUS } from "@/components/billing/invoice-rows"
import { startFamilySet } from "@/lib/family-set"
import { flatFromKids, interestCourseIdsFor, leadKids, BOARD_GROUPS, daysAgoLabel, groupOf, LEAD_SOURCE_LABEL, scheduleInfo, STAGE_FOR_GROUP, stageGroupLabel } from "@/domain/rules/crm"
import { can, canEditLead } from "@/domain/rules/permissions"
import { catalogInterests } from "@/domain/rules/catalog"
import type { Assessment, FormSubmission, FormType, ID, Lead, LeadKid, LeadStage, TargetSchool } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { InfoTip } from "@/components/app/info-tip"
import { SpanTip } from "@/components/app/span-tip"

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
/** owner 2026-10-09: View → แก้ไข → back in the same panel; "new" = the empty form, then the new lead's view */
export function LeadSheet({ leadId: target, onClose }: { leadId: ID | "new" | null; onClose: () => void }) {
  const [createdId, setCreatedId] = useState<ID | null>(null)
  const [editing, setEditing] = useState(target === "new")
  const id = target === "new" ? createdId : target
  const lead = useStore((s) => (id ? s.leads.find((x) => x.id === id) : undefined))
  return (
    <Sheet open={target !== null} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-lg">
        {editing ? (
          <PanelForm>
            <LeadDialog key={lead?.id ?? "new"} lead={lead} onClose={() => (lead ? setEditing(false) : onClose())}
              onSaved={(l) => { if (target === "new") setCreatedId(l.id); setEditing(false) }} />
          </PanelForm>
        ) : id && <Body id={id} onEdit={() => setEditing(true)} />}
      </SheetContent>
    </Sheet>
  )
}

function Body({ id, onEdit }: { id: ID; onEdit: () => void }) {
  const lead = useStore((s) => s.leads.find((x) => x.id === id))
  const [invoice, setInvoice] = useState<ID | "new" | null>(null)
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const conversations = useStore((s) => s.conversations)
  const me = useStore((s) => s.me())
  const moveStage = useStore((s) => s.moveLeadStage)
  const assignLead = useStore((s) => s.assignLead)
  const restore = useStore((s) => s.restoreLead)
  const addNote = useStore((s) => s.addLeadNote)
  const convert = useStore((s) => s.convertLeadToStudent)
  const now = useNow()
  const [note, setNote] = useState("")
  const [childDialog, setChildDialog] = useState(false)
  // owner 2026-11-18: one tab per kind of content — progress first (what staff need most), then who, then the log
  const [tab, setTab] = useState<"progress" | "info">("progress")
  // owner 2026-11-25: the “แก้ไข” menu asks WHO (family details · a guardian · a new guardian · a child) and opens just that
  const [familyEdit, setFamilyEdit] = useState<FamilyFormOnly | null>(null)
  const [studentEdit, setStudentEdit] = useState(false)
  // owner 2026-11-25: opening a Lead makes sure each named child is on file as a Student (Lead state) — older Leads get them the first time they are opened (silent; no-op without permission)
  useEffect(() => { useStore.getState().syncLeadRecords(id) }, [id])
  const [archiving, setArchiving] = useState(false)
  const [openStudentId, setOpenStudentId] = useState<ID | null>(null)
  // null until the first answer comes back — so a form that is really approved never flashes “waiting” while it loads
  const [submissions, setSubmissions] = useState<FormSubmission[] | null>(null)
  const [sendingFormOpen, setSendingFormOpen] = useState(false)
  // owner 2026-11-20: a form planned from courses ticked in the summary (type + the courses it opens on)
  const [formPlan, setFormPlan] = useState<{ type: FormType; courseIds: ID[]; kids?: LeadKid[] } | null>(null)
  const [followingUp, setFollowingUp] = useState(false)
  const [enrolling, setEnrolling] = useState(false)
  const assessments = useStore((s) => s.assessments)
  const messages = useStore((s) => s.messages)
  const allClasses = useStore((s) => s.classes)
  const allCourses = useStore((s) => s.courses)

  const pollSubmissions = () => fetch("/api/forms/submissions").then((r) => r.json()).then((d) => setSubmissions(d.submissions ?? [])).catch(() => {})
  useEffect(() => {
    let cancelled = false
    const poll = () => fetch("/api/forms/submissions").then((r) => r.json()).then((d) => { if (!cancelled) setSubmissions(d.submissions ?? []) }).catch(() => {})
    poll()
    const t = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (!lead) return null
  const convertNow = () => { const r = convert(lead.id); if (report(r, "สร้างนักเรียน + ครอบครัวแล้ว — ออกใบแจ้งหนี้ได้เลย")) setOpenStudentId(r.ok ? r.value.studentId : null) }
  // owner 2026-11-19: what the parent tapped "interested" on in the catalog is data — grade · subject · course (kept in the chat, shown here)
  const convIds = new Set(conversations.filter((c) => c.leadId === lead.id || (lead.lineUserId && c.id === `line_${lead.lineUserId}`)).map((c) => c.id))
  const interests = catalogInterests(messages.filter((m) => convIds.has(m.conversationId)), { classes: allClasses, courses: allCourses })
  // owner 2026-11-20: a form with 2 children is 2 answer sheets in one group — the 2nd child has no Lead until it is approved, but belongs to this panel from the moment
  // the parent presses send (sheets are found by the group's first Lead); once approved, that child's results come along too
  const mySubmissions = (submissions ?? []).filter((s) => s.leadId === lead.id || s.primaryLeadId === lead.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const groupSubIds = new Set(mySubmissions.map((s) => s.id))
  const myAssessments = assessments.filter((a) => a.leadId === lead.id || (!!a.submissionId && groupSubIds.has(a.submissionId))).sort((a, b) => a.date.localeCompare(b.date))
  const latestAssessment = myAssessments.at(-1)

  // once a lead has a real Student record (trial or fully converted), its family — parents, siblings — is
  // the fuller, live contact record; show it here too so this panel never falls behind what Inbox knows
  const linkedStudent = students.find((s) => s.id === (lead.convertedStudentId ?? lead.trialStudentId))
  const linkedFamily = linkedStudent ? families.find((f) => f.id === linkedStudent.familyId) : undefined
  // owner 2026-11-25: the Lead's own family file (made on demand) wins; else the one its child already belongs to
  const ownFamily = families.find((f) => f.id === lead.familyId) ?? linkedFamily
  const ownKids = ownFamily ? students.filter((s) => s.familyId === ownFamily.id) : []
  const familyChildren = linkedFamily ? students.filter((s) => s.familyId === linkedFamily.id) : []
  // every child we know of: the children on the parent's forms (even before approval) + the family's children on file, one line each
  const children = (() => {
    const out: { key: string; name: string; grade: string }[] = []
    const seen = new Set<string>()
    const add = (key: string, name: string, grade: string, ...aliases: (string | undefined)[]) => {
      const ids = [key, ...aliases].filter((x): x is string => !!x).map((x) => x.trim().toLowerCase())
      if (ids.some((x) => seen.has(x))) return
      ids.forEach((x) => seen.add(x))
      out.push({ key, name, grade })
    }
    for (const sub of [...mySubmissions].reverse()) add(sub.studentName, sub.studentNickname || sub.studentName, sub.studentGrade, sub.studentNickname)
    for (const c of familyChildren) add(c.name, c.nickname || c.name, c.grade, c.nickname)
    return out
  })()
  const conversation = conversations.find((c) => c.leadId === lead.id)
  // each child with their own name · grade · interests · note — the children already on the parent's forms / the family file are folded in by name
  const kids = leadKids(lead, children.map((c) => ({ name: c.key, grade: c.grade, alias: c.name !== c.key ? c.name : undefined })))

  const canManage = canEditLead(me, lead) // owner 2026-11-25: the assigned person helps too, whatever their role
  const stageEditable = canManage && lead.stage !== "archived" && lead.stage !== "enrolled"

  const isOpen = lead.stage !== "archived" && lead.stage !== "enrolled"
  const quiet = followUpState(lead, now)
  // one timeline: notes + calls / LINE follow-ups, newest first (owner 2026-10-05: tidy, nothing scattered)
  const timeline = [
    ...lead.notes.map((n, i) => ({ key: `n${i}`, at: n.at, by: n.by, kind: "note" as const, text: n.text })),
    ...(lead.followUps ?? []).map((f) => ({ key: f.id, at: f.at, by: f.by, kind: "fu" as const, text: f.note ?? "", f })),
  ].sort((x, y) => y.at.localeCompare(x.at))

  const ensureFamily = useStore.getState().ensureLeadFamilyFile
  // the same family form the Customer's panel uses — one record, so editing here is editing the family
  if (familyEdit && ownFamily) {
    return (
      <PanelForm>
        <FamilyForm key={`${ownFamily.id}-${JSON.stringify(familyEdit)}`} family={ownFamily} only={familyEdit} onClose={() => setFamilyEdit(null)} onSaved={() => setFamilyEdit(null)} />
      </PanelForm>
    )
  }
  // the missing family-level things (address · home pin · PDPA …) are filled on the family file — start it first if there is none
  const openFamily = () => { if (!ownFamily && !ensureFamily(lead.id).ok) return; setTab("info"); setFamilyEdit("family") }
  const pickEdit = (t: EditTarget) => {
    if (t.kind === "student") { setStudentEdit(true); setOpenStudentId(t.id); return }
    if (t.kind === "newStudent") { setChildDialog(true); return }
    setFamilyEdit(t.kind === "family" ? "family" : t.kind === "newParent" ? "newParent" : { parent: t.index })
  }
  // owner 2026-11-25: ONE “แก้ไข” — in ⋯, like the family panel — asking WHO (family details · a guardian · a child · the Lead itself). No separate button.
  const editItem = canManage ? (ownFamily
    ? { label: "แก้ไข", icon: PencilIcon, onClick: () => undefined, sub: <FamilyEditItems family={ownFamily} kids={ownKids} onPick={pickEdit} /> }
    : { label: "แก้ไข", icon: PencilIcon, onClick: onEdit }) : false
  return (
    <>
      <SheetHeader className="gap-3 border-b pb-0">
        {/* owner 2026-11-20: same header as the Inbox chat — avatar · name · ONE quiet grey line (type · channel · age); the two dropdowns sit under it, side by side */}
        <div className="flex items-center gap-3 pr-10">
          <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-lg font-semibold", avatarTone(lead.id))}>{initial(lead.name)}</span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-lg">{lead.name} {lead.childGrade && <span className={cn("ml-1 rounded px-1.5 py-0.5 align-middle text-xs", gradeTone(lead.childGrade))}>{lead.childGrade}</span>}</SheetTitle>
            <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
              <span className="inline-flex items-center gap-1"><TargetIcon className="size-3" /> Lead</span>
              <span aria-hidden>·</span>
              <span>{LEAD_SOURCE_LABEL[lead.source]} · {daysAgoLabel(lead.createdAt, now)}</span>
              {lead.direct && <Pill tone="green">สมัครตรง</Pill>}
            </SheetDescription>
          </div>
          {latestAssessment && <Button size="icon-sm" variant="outline" aria-label="ดูคาบในปฏิทิน" title="ดูคาบสอบ / ทดลองในปฏิทิน" nativeButton={false} render={<Link href={`/calendar?sessionId=${latestAssessment.sessionId}`} />}><CalendarIcon /></Button>}
        </div>
        <div className="flex items-center gap-2">
          {stageEditable ? (
            // 4 choices = the 4 board columns (owner 2026-10-05); the steps inside them move automatically
            <NativeSelect
              className="h-9 min-w-0 flex-1"
              aria-label="สถานะ Lead"
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
          <NativeSelect
            className="h-9 min-w-0 flex-1"
            aria-label="ผู้ดูแล Lead"
            disabled={!canManage}
            value={lead.assigneeId ?? ""}
            onChange={(e) => report(assignLead(lead.id, e.target.value || null), e.target.value ? "มอบหมายแล้ว" : "ยกเลิกมอบหมายแล้ว")}
            options={[
              { value: "", label: "ยังไม่มอบหมาย" },
              ...staff.filter((x) => (x.active && x.branchIds.includes(lead.branchId) && can(x, "lead.manage")) || x.id === lead.assigneeId).map((x) => ({ value: x.id, label: x.nickname })),
            ]}
          />
        </div>
        {canManage && isOpen && quiet.suggestClose && (
          <div className="flex items-center gap-2 rounded-xl bg-warning-soft/60 px-3 py-1.5 text-xs text-warning-ink">
            <span className="flex-1">{quiet.lastReach ? `ตอบล่าสุด ${quiet.silentDays} วันก่อน` : "ยังติดต่อไม่ได้"} · ติดต่อไม่ได้ติดกัน {quiet.tries} ครั้ง</span>
            <Button size="xs" variant="outline" onClick={() => setArchiving(true)}><ArchiveIcon /> ปิด Lead?</Button>
          </div>
        )}
        <Tabs className="-mx-4 border-b-0 px-3" value={tab} onChange={setTab} options={[
          { value: "progress", label: "ภาพรวม" },
          { value: "info", label: "ข้อมูลครอบครัว" },
        ]} />
      </SheetHeader>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 text-sm">
        {tab === "info" && <>
        {/* owner 2026-11-25: Lead and Customer are one record — once there is a family file it is shown with the SAME body as the Customer's family panel */}
        {ownFamily && (
          <>
            <FamilyInfoTab f={ownFamily} kids={ownKids} onOpenStudent={(id) => (id === "new" ? setChildDialog(true) : setOpenStudentId(id))} onAddParent={() => pickEdit({ kind: "newParent" })} onGoBilling={() => undefined} />
          </>
        )}
        {/* contact always first (owner 2026-10-05) */}
        {!ownFamily && <Section title="ติดต่อ">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-info hover:underline"><PhoneIcon className="size-3.5" />{lead.phone}</a>}
            {lead.lineId && <span className="text-muted-foreground">LINE {lead.lineId}</span>}
            {!lead.phone && !lead.lineId && <span className="text-muted-foreground">ยังไม่มีช่องทางติดต่อ</span>}
          </div>
          {linkedFamily && (
            <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
              <p className="text-xs font-medium">{linkedFamily.name}</p>
              {linkedFamily.parents.map((p) => (
                <div key={p.name} className="flex flex-wrap items-center gap-1.5 text-xs">
                  <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="text-info hover:underline">{p.name} · {p.phone}</a>
                  <Pill tone={p.lineLinked ? "green" : "amber"}>{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                </div>
              ))}
            </div>
          )}
        </Section>}
        {!ownFamily && canManage && (
          <Button variant="outline" onClick={() => { const r = ensureFamily(lead.id); report(r, "เริ่มเก็บข้อมูลครอบครัวแล้ว — กรอกที่อยู่ ผู้ปกครอง ฯลฯ ได้เลย") }}><UsersIcon /> เริ่มเก็บข้อมูลครอบครัว</Button>
        )}

        {!ownFamily && familyChildren.length > 0 && (
          <Section title={`ลูก (${familyChildren.length})`}>
            <div className="flex flex-wrap items-center gap-1.5">
              {familyChildren.map((c) => (
                <Button variant="outline" size="inline" key={c.id} type="button" onClick={() => setOpenStudentId(c.id)} className="rounded-full border bg-background px-2 py-0.5 text-xs hover:bg-muted">{c.nickname} · {c.grade}</Button>
              ))}
            </div>
          </Section>
        )}

        </>}

        {tab === "progress" && <>
        {/* owner 2026-11-20: the summary + note box + contact history are the "ติดต่อ" step, the forms sit under สอบ / ทดลอง — one stepper, no separate boxes */}
        {/* owner 2026-11-20: no frame, no title — the stepper IS the panel */}
        <div>
          <LeadSteps onOpenInvoice={(id) => setInvoice(id)} lead={lead} assessments={myAssessments} canManage={canManage} now={now} subs={mySubmissions} subsReady={submissions !== null} onChanged={pollSubmissions}
            next={{
              kids, interests, canSend: !!lead.lineUserId,
              onSendForm: (type, courseIds, picked) => setFormPlan({ type, courseIds, kids: picked }),
              onEnroll: async (courseIds) => {
                if (!conversation) return
                const picked = allCourses.filter((c) => courseIds.includes(c.id))
                const classIds = new Set(picked.flatMap((c) => classesOfCourse(c, allClasses)))
                const offers = enrollClassOffers(allClasses, lead.branchId, (tid) => staff.find((x) => x.id === tid)?.nickname ?? "").filter((o) => classIds.has(o.id))
                report(await sendEnrollToChat(conversation.id, offers), tx("ส่งใบสมัครเรียน {0} คอร์สแล้ว", [courseIds.length]))
              },
              onInvoice: lead.trialStudentId && can(me, "billing.manage") ? () => setInvoice("new") : undefined,
            }}
            contact={{
              summary: [kids.map((k) => [k.name, k.grade].filter(Boolean).join(" ")).filter(Boolean).join(", ") || tx("{0} คน", [kids.length]), [...new Set(kids.flatMap((k) => k.subjects))].join(", "), timeline.length ? tx("โน้ต/ติดต่อ {0}", [timeline.length]) : ""].filter(Boolean).join(" · "),
              body: (
                <div className="space-y-3">
                  <LeadKids lead={lead} canManage={canManage} kids={kids} interests={interests} onOpenFamily={openFamily} />
                  {canManage && (
                    <div className="flex gap-2 border-t pt-3">
                      <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="จดโน้ต / ผลคุย" rows={1} className="min-h-9 flex-1" />
                      <Button size="sm" disabled={!note.trim()} onClick={() => { if (report(addNote(lead.id, note), "บันทึกโน้ตแล้ว")) setNote("") }}>บันทึก</Button>
                    </div>
                  )}
                  {timeline.length > 0 && (
                    <ol className="space-y-2">
                      {timeline.map((x) => (
                        <li key={x.key} className="flex gap-2">
                          <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                            {x.kind === "note" ? <StickyNoteIcon className="size-3.5" /> : x.f.channel === "call" ? <PhoneIcon className="size-3.5" /> : <MessageCircleIcon className="size-3.5" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            {x.kind === "fu" && <span className={cn("mr-1.5 font-medium", REACHED.includes(x.f.result) ? "text-success" : "text-danger")}>{CHANNEL_LABEL[x.f.channel]} · {RESULT_LABEL[x.f.result]}</span>}
                            {x.text && <span>{x.text}</span>}
                            <p className="text-xs text-muted-foreground">{staff.find((st) => st.id === x.by)?.nickname ?? "—"} · {fmtDateTime(x.at)}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ),
            }} />
        </div>

        {lead.stage === "archived" && (lead.lost || lead.archiveReason) && (
          <Section title="ทำไมถึงปิด Lead"><LostSummary lead={lead} /></Section>
        )}

        </>}


      </div>

      {/* owner 2026-11-18: bottom bar = ⋯ on the left, แก้ไข on the right — every other action lives in ⋯ */}
      <PanelFooter>
        {!canManage ? (
          <>
            <p className="text-xs text-muted-foreground">ดูอย่างเดียว — ไม่มีสิทธิ์จัดการ Lead</p>
            <span className="ml-auto">{conversation && <Button variant="outline" size="icon" aria-label="เปิดแชทใน Inbox" title="เปิดแชทใน Inbox" nativeButton={false} render={<Link href={`/inbox?conversation=${conversation.id}`} />}><MessageCircleIcon /></Button>}</span>
          </>
        ) : (
          <>
            <PanelMore items={
              isOpen ? [
                editItem,
                { label: "บันทึกการติดตาม (โทร / LINE)", icon: PhoneIcon, onClick: () => setFollowingUp(true) },
                // owner 2026-11-18: no LINE / form needed — staff fill the child in (and book the test / trial) right here
                { label: lead.trialStudentId ? "นัดสอบ / ทดลองเรียน (กรอกเอง)" : "เพิ่มลูก / นัดสอบ-ทดลอง (กรอกเอง)", icon: UserPlusIcon, onClick: () => setChildDialog(true) },
                // owner 2026-11-20: the menu keeps only what has no button in its own step (forms + the single invoice live in the steps)
                // 2+ children → one blank set first, the courses go in after
                kids.length > 1 && can(me, "billing.manage") && { label: `ออกใบแจ้งหนี้ทั้งครอบครัว (${kids.length} คน)`, icon: UsersRoundIcon, onClick: () => { const r = startFamilySet({ leadId: lead.id }); if (report(r, "สร้างชุดครอบครัวแล้ว — เติมคอร์สให้ลูกแต่ละคน")) setInvoice(r.value.firstId) } },
                // no LINE yet → the step button can't send the application; this makes the one-time link instead
                !lead.lineUserId && { label: "สร้างลิงก์ใบสมัครเรียน (ยังไม่มี LINE)", icon: UserPlusIcon, onClick: () => setEnrolling(true) },
                // owner 2026-10-12: the skip-ahead shortcut is not the next step
                // the child's real name is needed first — a child is added before the lead can be enrolled
                { label: "สร้างนักเรียนทันที (ข้ามสอบ/ทดลอง)", icon: UserCheckIcon, onClick: lead.trialStudentId ? convertNow : () => setChildDialog(true) },
                { label: "ปิด Lead", icon: ArchiveIcon, destructive: true, onClick: () => setArchiving(true) },
              ] : lead.stage === "archived" ? [
                { label: "กู้คืนจากคลัง", icon: RotateCcwIcon, onClick: () => report(restore(lead.id), "กู้คืนแล้ว") },
              ] : [
                editItem,
                !!lead.convertedStudentId && { label: "เปิดโปรไฟล์นักเรียน", icon: GraduationCapIcon, onClick: () => setOpenStudentId(lead.convertedStudentId!) },
              ]
            } />
            <span className="ml-auto flex items-center gap-2">
              {/* owner 2026-10-12: what moves the stage by itself — an ⓘ to hover, not a line of text */}
              {AUTO_HINT[lead.stage] && <InfoTip text={`อัตโนมัติ: ${AUTO_HINT[lead.stage]}`} />}
              {conversation && <Button variant="outline" size="icon" aria-label="เปิดแชทใน Inbox" title="เปิดแชทใน Inbox" nativeButton={false} render={<Link href={`/inbox?conversation=${conversation.id}`} />}><MessageCircleIcon /></Button>}
            </span>
          </>
        )}
      </PanelFooter>
      {invoice && <InvoiceSheet id={invoice} defaultStudentId={lead.trialStudentId ?? undefined} defaultCourseIds={invoice === "new" ? interestCourseIdsFor(lead, students.find((x) => x.id === lead.trialStudentId)) : undefined} onClose={() => setInvoice(null)} />}

      {childDialog && <LeadChildDialog lead={lead} onClose={() => setChildDialog(false)} />}
      {archiving && <LeadLostDialog lead={lead} onClose={() => setArchiving(false)} />}
      {followingUp && (
        <Dialog open onOpenChange={(o) => !o && setFollowingUp(false)}>
          <DialogContent className="max-h-[85vh] overflow-y-auto lg:max-w-lg">
            <DialogHeader><DialogTitle>บันทึกการติดตาม · {lead.name}</DialogTitle><DialogDescription>โทร / ทัก LINE แล้วได้ผลยังไง — ใช้ตัดสินใจว่าควรปิด Lead ไหม</DialogDescription></DialogHeader>
            <FollowUpSection lead={lead} canManage={canManage} onClose={() => { setFollowingUp(false); setArchiving(true) }} />
          </DialogContent>
        </Dialog>
      )}
      {enrolling && (
        <Dialog open onOpenChange={(o) => !o && setEnrolling(false)}>
          <DialogContent className="lg:max-w-md">
            <DialogHeader><DialogTitle>ส่งใบสมัครเรียน · {lead.name}</DialogTitle><DialogDescription>สมัครทันที ไม่ต้องสอบ / ทดลองเรียน</DialogDescription></DialogHeader>
            <EnrollLinkButton lead={lead} />
          </DialogContent>
        </Dialog>
      )}
      {(sendingFormOpen || formPlan) && lead.lineUserId && (
        <SendFormDialog leadId={lead.id} branchId={lead.branchId} conversationId={`line_${lead.lineUserId}`} lineUserId={lead.lineUserId}
          initialType={formPlan?.type} initialCourseIds={formPlan?.courseIds} initialKids={formPlan?.kids} initialSubjects={formPlan?.kids ? [...new Set(formPlan.kids.flatMap((k) => k.subjects))] : undefined} onClose={() => { setSendingFormOpen(false); setFormPlan(null) }} />
      )}
      <StudentSheet studentId={openStudentId} startEditing={studentEdit} onClose={() => { setOpenStudentId(null); setStudentEdit(false) }} />
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
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={busy} onClick={send}><SendIcon /> {lead.lineUserId ? "ส่งใบสมัครเรียนทาง LINE" : "สร้างลิงก์ใบสมัครเรียน"}</Button>
        <InfoTip text="ผู้ปกครองกรอกข้อมูล · เลือกคอร์ส/เวลาที่สะดวก · ขึ้นที่หัวหน้า CRM ให้จัดคลาสและออกใบแจ้งหนี้" />
      </div>
      {url && <Input readOnly value={url} className="h-8 text-xs" onFocus={(e) => { e.target.select(); navigator.clipboard?.writeText(url) }} />}
    </div>
  )
}

const STEP_KEYS = ["contact", "test", "trial", "closing"] as const

/**
 * owner 2026-11-20: ONE stepper holds the whole story of the lead — each step owns what belongs to it:
 *   ติดต่อ → the summary (what they want), the note box and the contact history · สอบ / ทดลอง → the forms (waiting + earlier) and the results · ปิดการขาย → the invoice.
 * Only the step the lead is on is open; finished steps fold to one line (tap to open), steps ahead are faint — so the panel stays short.
 */
function LeadSteps({ lead, assessments, canManage, now, contact, subs, subsReady, onChanged, next, onOpenInvoice }: {
  /** the answer sheets have been fetched at least once */
  subsReady: boolean;
  /** owner 2026-11-20: tap an invoice in the closing step → its panel (progress) opens */
  onOpenInvoice: (id: ID) => void
  lead: Lead; assessments: Assessment[]; canManage: boolean; now: Date
  contact: { summary: string; body: React.ReactNode }
  subs: FormSubmission[]; onChanged: () => void
  /** owner 2026-11-20: what a step can DO — send its form to the family (the courses / subjects they like are listed right there) */
  next: Omit<NextStepProps, "lead" | "type">
}) {
  const leadOpen = lead.stage !== "archived" && lead.stage !== "enrolled"
  const invoices = useStore((s) => s.invoices)
  const allStudents = useStore((s) => s.students)
  // more than one child on these forms / results → say whose each result is
  const childCount = Math.max(new Set(subs.map((x) => x.studentName)).size, new Set(assessments.map((x) => x.studentId)).size)
  const studentId = lead.convertedStudentId ?? lead.trialStudentId
  const g = lead.stage === "archived" ? groupOf(lead.archivedFrom ?? "new").key : groupOf(lead.stage).key
  const upTo = lead.stage === "enrolled" ? 3 : STEP_KEYS.indexOf(g as (typeof STEP_KEYS)[number])
  // owner 2026-11-20: EVERY child's live invoices (a family set too), newest first — each opens its panel to follow the progress
  const convs = useStore((st) => st.conversations)
  // the family: through the child on file, else through this lead's chat (the chat is linked to the family once the child exists)
  const fams = useStore((st) => st.families)
  const famId = allStudents.find((x) => x.id === studentId)?.familyId ?? convs.find((c) => c.leadId === lead.id && c.familyId)?.familyId ?? (lead.lineUserId ? fams.find((f) => f.lineUserId === lead.lineUserId)?.id : undefined)
  // a child already on file under the name typed in the contact card counts too (the invoice may have been made before the card was linked)
  const kidNames = new Set((lead.kids ?? []).map((k) => k.name.trim().toLowerCase()).filter(Boolean))
  const byName = allStudents.filter((x) => x.branchId === lead.branchId && (kidNames.has(x.nickname.trim().toLowerCase()) || kidNames.has(x.name.trim().toLowerCase()))).map((x) => x.id)
  const kidStudentIds = new Set([...byName, studentId, ...(lead.kids ?? []).map((k) => k.studentId), ...(famId ? allStudents.filter((x) => x.familyId === famId).map((x) => x.id) : [])].filter((x): x is ID => !!x))
  const myInvoices = [...invoices].filter((i) => kidStudentIds.has(i.studentId) && i.status !== "void").sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const inv = myInvoices[0]
  const visible = STEP_KEYS.filter((k) => !(lead.direct && (k === "test" || k === "trial")))
  // a step is open when it is the current one or a form is waiting in it (a parent's new form shows at once, whatever step the lead is on) — unless the user folded / opened it
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const waiting = (k: string) => subs.some((x) => x.type === k && x.status === "pending")
  const label = { contact: "ติดต่อ", test: "สอบวัดระดับ", trial: "ทดลองเรียน", closing: "ปิดการขาย" } as const
  const step = (key: (typeof STEP_KEYS)[number]) => {
    const i = STEP_KEYS.indexOf(key), current = i === upTo, future = i > upTo, past = i < upTo
    const n = visible.indexOf(key) + 1
    let summary = "", body: React.ReactNode
    if (key === "contact") {
      summary = contact.summary
      body = contact.body
    } else if (key === "test" || key === "trial") {
      const mine = assessments.filter((x) => x.type === key)
      const pend = subs.filter((x) => x.type === key && x.status === "pending")
      const hist = subs.filter((x) => x.type === key && x.status !== "pending")
      const done = mine.filter((x) => x.result || x.note).length
      summary = [pend.length ? tx("ฟอร์มรอตรวจ {0}", [pend.length]) : "", mine.length ? `${[...new Set(mine.map((x) => x.subject))].join(", ")} · ${tx("บันทึกผล {0}/{1}", [done, mine.length])}` : "", !pend.length && !mine.length && lead.scheduledAt ? fmtDateTime(lead.scheduledAt) : ""].filter(Boolean).join(" · ")
      const none = !mine.length && !pend.length && !hist.length
      body = (
        <div className="space-y-2">
          {/* owner 2026-11-25: ONE card per form, the same one the chat shows — waiting for review (with the approve / reject buttons) → approved (with the result to record, Panel only) */}
          {subs.filter((x) => x.type === key).map((sub) => (
            <SubmissionReviewCard key={sub.id} submission={sub} onChanged={onChanged}
              groupMates={sub.status === "pending" && sub.groupId && key === "test" ? pend.filter((x) => x.id !== sub.id && x.groupId === sub.groupId) : undefined}
              results={{ assessments: mine.filter((a) => a.submissionId === sub.id), editable: canManage }} />
          ))}
          {/* a test / trial booked by hand (no form behind it) keeps its own small card */}
          {mine.filter((a) => !a.submissionId || !subs.some((x) => x.id === a.submissionId)).map((x) => (
            <AssessmentNote key={x.id} a={x} editable={canManage} compact showWhen child={childCount > 1 ? allStudents.find((st) => st.id === x.studentId)?.nickname : undefined} />
          ))}
          {canManage && leadOpen && !past && pend.length === 0 && <NextStepForm lead={lead} type={key} {...next} subs={subs} subsReady={subsReady} />}
          {none && (current && lead.scheduledAt ? (() => {
            const due = scheduleInfo(lead.scheduledAt, now)
            return <p className={cn(due.overdue ? "font-medium text-danger" : "")}>นัด {fmtDateTime(lead.scheduledAt)} · {due.overdue ? <SpanTip days={-due.daysLeft} phrase="เลยนัด {0}" /> : due.daysLeft === 0 ? "วันนี้" : due.daysLeft === 1 ? "พรุ่งนี้" : <SpanTip days={due.daysLeft} phrase="อีก {0}" />}</p>
          })() : <p className="text-muted-foreground">{current ? "ยังไม่ได้นัด — ส่งฟอร์มจากเมนู ⋯" : (key === "test" ? "ไม่ได้สอบวัดระดับ" : "ไม่ได้ทดลองเรียน")}</p>)}
        </div>
      )
    } else {
      summary = inv ? (myInvoices.length > 1 ? tx("ใบแจ้งหนี้ {0} ใบ", [myInvoices.length]) : `${tx("ใบแจ้งหนี้ {0}", [inv.number ?? "ร่าง"])} · ${INV_STATUS[inv.status]}`) : ""
      body = (
        <div className="space-y-2">
          {myInvoices.length > 0 ? (
            <InvoiceRows list={myInvoices} onOpen={onOpenInvoice} />
          ) : <p className="text-muted-foreground">ยังไม่ออกใบแจ้งหนี้</p>}
          {/* owner 2026-11-20: more invoices / another enroll form stay one tap away under the list */}
          {canManage && leadOpen && <NextStepForm lead={lead} type="enroll" {...next} subs={subs} subsReady={subsReady} onInvoice={myInvoices.length ? undefined : next.onInvoice} />}
        </div>
      )
    }
    const expandable = !future || (canManage && leadOpen) || waiting(key)
    const isOpen = expandable && (touched[key] ?? (current || waiting(key) || (future && i === upTo + 1 && canManage && leadOpen) || (key === "closing" && myInvoices.length > 0)))
    const hasContent = waiting(key) || (key === "closing" && myInvoices.length > 0) || (key !== "contact" && key !== "closing" && (assessments.some((x) => x.type === key) || subs.some((x) => x.type === key)))
    if (future && !hasContent) body = canManage && leadOpen ? <NextStepForm lead={lead} type={key === "test" || key === "trial" ? key : "enroll"} {...next} subs={subs} subsReady={subsReady} /> : null
    return (
      <li key={key} className="relative flex gap-3 pb-3 last:pb-0">
        {n < visible.length && <span className={cn("absolute top-6 left-2.75 h-[calc(100%-1.25rem)] w-px", future ? "border-l border-dashed border-border" : "bg-border")} />}
        <span className={cn("z-10 grid size-6 shrink-0 place-items-center rounded-full text-2xs font-semibold", current ? "bg-primary text-primary-foreground" : future ? "border border-dashed bg-background text-muted-foreground" : "bg-muted text-muted-foreground")}>{n}</span>
        <div className="min-w-0 flex-1">
          {!expandable ? (
            <p className="py-0.5 text-sm text-muted-foreground">{label[key]}</p>
          ) : (
            <Button variant="ghost" size="inline" type="button" aria-expanded={isOpen} onClick={() => setTouched((t) => ({ ...t, [key]: !isOpen }))} className="flex w-full items-center gap-1.5 py-0.5 text-left hover:bg-transparent aria-expanded:bg-transparent dark:hover:bg-transparent">
              <span className={cn("text-sm font-medium", !current && "text-muted-foreground", future && "font-normal")}>{label[key]}</span>
              {current && <span className="text-xs font-normal text-primary">ขั้นปัจจุบัน</span>}
              {!isOpen && summary && <span className="min-w-0 flex-1 truncate text-xs font-normal text-muted-foreground">{summary}</span>}
              <ChevronDownIcon className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
            </Button>
          )}
          {isOpen && <div className="mt-2">{body}</div>}
        </div>
      </li>
    )
  }
  return <ol>{visible.map(step)}</ol>
}

interface NextStepProps {
  lead: Lead; type: "test" | "trial" | "enroll"; kids: LeadKid[]; interests: ReturnType<typeof catalogInterests>; canSend: boolean
  onSendForm: (type: FormType, courseIds: ID[], kids: LeadKid[]) => void; onEnroll: (courseIds: ID[]) => void; onInvoice?: () => void
}

/**
 * owner 2026-11-20: the next thing to do in a step — pick WHICH child (when there is more than one), see that child's courses of interest (ticked = all, untick the ones to leave out) or
 * their subjects, and ONE button that sends the form for that child.
 */
function NextStepForm({ lead, type, kids, interests, canSend, subs, subsReady, onSendForm, onEnroll, onInvoice }: NextStepProps & { subs: FormSubmission[]; subsReady: boolean }) {
  const courses = useStore((s) => s.courses)
  // children are ticked: everyone by default (one form, one link, they come together) — untick to send to just one child
  const [offKids, setOffKids] = useState<string[]>([])
  const [off, setOff] = useState<ID[]>([])
  const sent = useSentForms(lead, type, subs, subsReady)
  // nothing sent yet → the send form is open straight away; something already out → it stays closed until “ส่งอีกครั้ง”
  const [composing, setComposing] = useState(false)
  const [confirmBlock, setConfirmBlock] = useState(false)
  // owner 2026-11-25: ONE live link per lead — a form waiting for the parent blocks every OTHER form; the same form again is “ส่งใหม่” (the old link is cancelled by the send)
  const decision = decideSend(type, sent.links)
  const open = decision.action !== "blocked" && (composing || !sent.everSent || decision.action === "resend" && composing)
  const cancelLink = async (token: string) => { if (report(await revokeFormLink(token), tx("ยกเลิกลิงก์แล้ว"))) sent.refresh() }
  const picked = kids.filter((k) => !offKids.includes(k.id))
  if (!kids.length) return null
  // what they like: the ticked children's courses (a course two children share is listed once) — or, with none, their subjects
  const rows = [...new Map(picked.flatMap((k) => kidInterestRows(k, kids, interests, courses)).map((r) => [r.courseId ?? r.key, r])).values()]
  const selectable = [...new Set(rows.map((r) => r.courseId).filter((x): x is ID => !!x))]
  const ticked = selectable.filter((id) => !off.includes(id))
  const send = () => (type === "enroll" ? onEnroll(ticked) : onSendForm(type, ticked, picked))
  const toggleKid = (id: string) => setOffKids((o) => (o.includes(id) ? o.filter((x) => x !== id) : kids.length - o.length > 1 ? [...o, id] : o))
  const noun = type === "test" ? "ส่งฟอร์ม Test" : type === "trial" ? "ส่งฟอร์ม Trial" : "ส่งใบสมัคร"
  return (
    <div className="space-y-2">
      {/* owner 2026-11-25: a form that is already out says so (and where it stands); a NEW one is one quiet step away */}
      <SentForms type={type} items={sent.items} onCancel={cancelLink} />
      {decision.action === "blocked" && (
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl bg-muted/40 p-2.5 text-xs text-muted-foreground">
          <span>{tx("รอผู้ปกครองกรอก{0} — ส่งฟอร์มอื่นไม่ได้", [tx(FORM_LABEL[decision.blocking.kind])])} · {fmtDateTime(decision.blocking.sentAt)}</span>
          {/* the way out is right here: cancel that link (two taps), then this form can be sent */}
          {canSend && (confirmBlock
            ? <span className="flex items-center gap-1"><Button size="xs" variant="ghost" type="button" className="text-danger" onClick={() => { void cancelLink(decision.blocking.token); setConfirmBlock(false) }}>{tx("ยืนยันยกเลิกลิงก์")}</Button><Button size="xs" variant="ghost" type="button" onClick={() => setConfirmBlock(false)}>{tx("ไม่")}</Button></span>
            : <Button size="xs" variant="ghost" type="button" onClick={() => setConfirmBlock(true)}>{tx("ยกเลิกลิงก์{0}", [tx(FORM_LABEL[decision.blocking.kind])])}</Button>)}
        </div>
      )}
      {!sent.ready ? null : decision.action === "blocked" ? null : !open ? (
        <Button size="xs" variant="ghost" type="button" className="text-muted-foreground" onClick={() => setComposing(true)}><SendIcon /> {decision.action === "resend" ? tx("{0} ใหม่ (ยกเลิกลิงก์เดิม)", [tx(noun)]) : sent.everSent ? tx("{0} อีกครั้ง", [tx(noun)]) : tx(noun)}</Button>
      ) : (
        // owner 2026-11-25: the send form is a CARD like every other box in the steps
        <div className="space-y-2 rounded-xl bg-muted/40 p-2.5">
          {decision.action === "resend" && <p className="text-xs text-warning-ink">{tx("ลิงก์เดิมจะใช้ไม่ได้ — ผู้ปกครองต้องใช้ลิงก์ใหม่")}</p>}
          {/* who / what the form is for — a tick on each child (several children), the courses they like (what the parent picks times for) */}
          {kids.length === 1 && (() => {
            // one child: no card, no name — just what the form is for
            const mine = kidInterestRows(kids[0], kids, interests, courses)
            return (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">{type === "enroll" ? tx("คอร์สที่คุยกัน") : tx("ให้ผู้ปกครองเลือกเวลาสำหรับ")}</p>
                {mine.length > 0 ? (
                  <ul className="space-y-1.5">
                    {mine.map((r) => <InterestItem key={r.key} r={r} ticked={ticked} toggle={(id) => setOff((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))} />)}
                  </ul>
                ) : kids[0].subjects.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">{kids[0].subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}</div>
                ) : <p className="text-xs text-muted-foreground">{tx("ยังไม่ได้ระบุวิชา / คอร์สที่สนใจ")}</p>}
              </div>
            )
          })()}
          {kids.length > 1 && kids.map((k, i) => {
            const on = !offKids.includes(k.id)
            const mine = kidInterestRows(k, kids, interests, courses)
            return (
              <div key={k.id} className={cn("space-y-1.5 rounded-xl bg-muted/40 p-2.5", !on && "opacity-60")}>
                <div className="flex items-center gap-2">
                  {kids.length > 1 && <Checkbox checked={on} aria-label={tx("ส่งให้ {0}", [k.name || tx("ลูกคนที่ {0}", [i + 1])])} onCheckedChange={() => toggleKid(k.id)} />}
                  <p className="min-w-0 flex-1 truncate text-sm font-semibold">{k.name || tx("ลูกคนที่ {0}", [i + 1])}{k.grade && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{k.grade}</span>}</p>
                </div>
                {mine.length > 0 ? (
                  <ul className="space-y-1.5">
                    {mine.map((r) => <InterestItem key={r.key} r={r} ticked={ticked} toggle={(id) => setOff((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]))} />)}
                  </ul>
                ) : k.subjects.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">{tx("สนใจวิชา")} {k.subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}</div>
                ) : <p className="text-xs text-muted-foreground">{tx("ยังไม่ได้ระบุวิชา / คอร์สที่สนใจ")}</p>}
              </div>
            )
          })}
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={!canSend} onClick={() => { send(); setComposing(false) }}>{type === "trial" ? <CalendarPlusIcon /> : type === "test" ? <ClipboardListIcon /> : <UserPlusIcon />} {picked.length > 1 && type !== "enroll" ? tx("{0} ({1} คน)", [noun, picked.length]) : noun}</Button>
            {type === "enroll" && onInvoice && <Button size="sm" variant="outline" onClick={onInvoice}><ReceiptIcon /> ออกใบแจ้งหนี้</Button>}
            <ReturnsHint type={type} />
            {(sent.everSent || decision.action === "resend") && <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>{tx("ยกเลิก")}</Button>}
            {!canSend && <span className="text-2xs text-muted-foreground">ต้องผูก LINE ใน Inbox ก่อน</span>}
          </div>
        </div>
      )}
      {type === "enroll" && !open && onInvoice && <div><Button size="xs" variant="ghost" type="button" className="text-muted-foreground" onClick={onInvoice}><ReceiptIcon /> ออกใบแจ้งหนี้</Button></div>}
    </div>
  )
}

/** One even block per topic — same title style and spacing everywhere in the sheet. */
/**
 * owner 2026-11-20: the Lead at a glance — subjects · courses · the child's grade · how many children. Everything saves the moment it is
 * changed (no edit button), so staff keep it current while they talk to the family.
 */
type InterestRow = { key: string; courseId: ID | null; title: string; sub: string; grades: string[]; trial: boolean; at: string; manual: boolean }
/** a child's courses of interest: the ones staff added to THIS child — plus, when the family has just one child, what the parent tapped in the catalog (it can only be theirs) */
function kidInterestRows(kid: LeadKid, kids: LeadKid[], interests: ReturnType<typeof catalogInterests>, courses: { id: ID; name: string }[]): InterestRow[] {
  const manual: InterestRow[] = kid.courseIds.map((cid) => ({ key: `m_${cid}`, courseId: cid, title: courses.find((x) => x.id === cid)?.name ?? "—", sub: "", grades: [], trial: false, at: "", manual: true }))
  return kids.length === 1 ? [...catalogRowsOf(kids, interests), ...manual] : manual
}
/** catalog taps no child has been given yet */
function catalogRowsOf(kids: LeadKid[], interests: ReturnType<typeof catalogInterests>): InterestRow[] {
  const assigned = new Set(kids.flatMap((k) => k.courseIds))
  return interests.filter((i) => !(i.courseId && assigned.has(i.courseId)))
    .map((i) => ({ key: i.id, courseId: i.courseId, title: i.course || i.className, sub: i.course && i.className ? `${i.className} · ${i.when}` : !i.className ? "ยังไม่มีรอบเรียน" : i.when, grades: i.grades, trial: i.action === "trial", at: i.at, manual: false }))
}

/**
 * owner 2026-11-20: every child has their own block — name · grade · subjects / courses of interest · note. Each field saves as soon as it is changed. With more than one
 * child, what the parent tapped in the catalog waits in its own list until it is given to a child.
 */
/** schools the family hopes to enter — chips (rank · name · ×) + one picker to add (owner 2026-11-23) */
function TargetSchools({ targets, canManage, province, onChange }: { targets: TargetSchool[]; canManage: boolean; province?: string; onChange: (t: TargetSchool[]) => void }) {
  if (!targets.length && !canManage) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5 pl-6">
      <TargetIcon className="size-3.5 shrink-0 text-muted-foreground" aria-label={tx("โรงเรียนที่อยากสอบเข้า")} />
      {targets.map((t, i) => (
        <span key={`${t.school}-${i}`} className="inline-flex h-6 items-center gap-1 rounded-full bg-muted pl-2 pr-1 text-xs">
          <span className="tabular-nums text-muted-foreground">{i + 1}</span><span className="max-w-40 truncate" title={t.school}>{t.school}</span>
          {canManage && <Button size="icon-xs" variant="ghost" type="button" className="size-4" aria-label={tx("เอาโรงเรียนนี้ออก")} onClick={() => onChange(targets.filter((_, j) => j !== i))}><XIcon className="size-3" /></Button>}
        </span>
      ))}
      {canManage && targets.length < 3 && (
        <SchoolPicker key={targets.length} className="h-7 w-52" province={province} onChange={(v) => v.school && onChange([...targets, { school: v.school, schoolId: v.schoolId }])} />
      )}
    </div>
  )
}

/** owner 2026-11-25: the child as a quiet summary — name · grade, subjects, each course with the days / start the parent chose, the schools they hope for, the note */
function KidPreview({ k, index, kids, interests, canManage, province, onEdit }: { k: LeadKid; index: number; kids: LeadKid[]; interests: ReturnType<typeof catalogInterests>; canManage: boolean; province?: string; onEdit: () => void }) {
  const courses = useStore((s) => s.courses)
  const students = useStore((s) => s.students)
  const rows = kidInterestRows(k, kids, interests, courses)
  const schools = k.targetSchools ?? (k.studentId ? students.find((x) => x.id === k.studentId)?.targetSchools : undefined) ?? []
  const wishText = (cid?: ID) => {
    const w = cid ? k.wishes?.[cid] : undefined
    const parts = [w?.slots.length ? w.slots.map((x) => `${weekdayShort(x.weekday)} ${x.start}`).join(", ") : "", w?.startDate ? `${tx("เริ่ม")} ${fmtDate(w.startDate, { weekday: true })}` : ""].filter(Boolean)
    return parts.length ? parts.join(" · ") : tx("ยังไม่ระบุวัน/เวลา · วันเริ่ม")
  }
  void province
  const many = kids.length > 1
  return (
    <section className="space-y-1 rounded-xl bg-muted/40 p-2.5">
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{many && <span className="mr-1.5 text-xs font-semibold text-muted-foreground">{index + 1}</span>}{k.name || tx("ลูกคนที่ {0}", [index + 1])}{k.grade && <span className="ml-1.5 text-xs font-normal text-muted-foreground">{k.grade}</span>}</p>
        {/* the subjects only when no course is picked yet — a course already says its subject */}
        {rows.length === 0 && k.subjects.map((x) => <span key={x} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", subjectColor(x).chip)}>{x}</span>)}
        {canManage && <Button size="xs" variant="ghost" type="button" onClick={onEdit}><PencilIcon /> {tx("แก้ไข")}</Button>}
      </div>
      {rows.length > 0 ? rows.map((r) => (
        <div key={r.key} className="text-xs">
          <p className="text-sm">{r.title}</p>
          {r.courseId && <p className="text-muted-foreground">{wishText(r.courseId)}</p>}
        </div>
      )) : <p className="text-xs text-muted-foreground">{tx("ยังไม่ได้เลือกคอร์ส")}</p>}
      {schools.length > 0 && <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground"><TargetIcon className="size-3.5" />{schools.map((t, j) => <span key={j}>{j + 1} {t.school}</span>)}</p>}
      {k.note && <p className="text-xs text-muted-foreground">{k.note}</p>}
    </section>
  )
}

function LeadKids({ lead, canManage, kids, interests, onOpenFamily }: { lead: Lead; canManage: boolean; kids: LeadKid[]; interests: ReturnType<typeof catalogInterests>; onOpenFamily: () => void }) {
  const branch = useStore((s) => s.branches.find((b) => b.id === lead.branchId))
  const courses = useStore((s) => s.courses)
  const saveLead = useStore((s) => s.saveLead)
  const allStudents = useStore((s) => s.students)
  const now = useNow()
  const [pickingFor, setPickingFor] = useState<string | null>(null)
  // owner 2026-11-25: each child is a PREVIEW by default; “แก้ไข” opens the edit form on a draft, “บันทึก” writes it once and goes back to the preview (a child with no name yet starts in edit)
  const [drafts, setDrafts] = useState<Record<string, LeadKid>>(() => Object.fromEntries(kids.filter((k) => canManage && !k.name.trim()).map((k) => [k.id, k])))
  if (!branch) return null
  const save = (next: LeadKid[]) => report(saveLead({ ...lead, ...flatFromKids(next) }, { quick: true }), "บันทึกแล้ว")
  const patch = (id: string, p: Partial<LeadKid>) => {
    if (id in drafts) setDrafts((d) => ({ ...d, [id]: { ...d[id], ...p } }))
    else save(kids.map((k) => (k.id === id ? { ...k, ...p } : k)))
  }
  const endEdit = (id: string) => setDrafts((d) => Object.fromEntries(Object.entries(d).filter(([key]) => key !== id)))
  const saveKid = (id: string) => { if (drafts[id]) save(kids.map((k) => (k.id === id ? drafts[id] : k))); endEdit(id) }
  const unassigned = kids.length > 1 ? catalogRowsOf(kids, interests) : []
  const picking = pickingFor ? (drafts[pickingFor] ?? kids.find((k) => k.id === pickingFor)) : undefined
  return (
    <div className="space-y-3">
      {/* owner 2026-11-25: the ONE place for what we know — the guardian first, then each child (grade · courses · wished days / times · start day) */}
      <LeadParentCard lead={lead} canEdit={canManage} onOpenFamily={onOpenFamily} />
      {kids.map((kid, i) => {
        const editing = kid.id in drafts
        const k = drafts[kid.id] ?? kid
        if (!editing) return <KidPreview key={kid.id} k={k} index={i} kids={kids} interests={interests} canManage={canManage} province={branch.province} onEdit={() => setDrafts((d) => ({ ...d, [kid.id]: kid }))} />
        return (
        // owner 2026-11-20: tight — three lines per child: name · grade, subjects + courses, note (labels live in the placeholders)
        <section key={k.id} className="space-y-1.5 rounded-xl bg-muted/40 p-2.5">
          <div className="flex items-center gap-2">
            <span className="w-4 shrink-0 text-center text-xs font-semibold text-muted-foreground" title={tx("ลูกคนที่ {0}", [i + 1])}>{i + 1}</span>
            <Input key={`${k.id}-${k.name}`} className="h-8 min-w-0 flex-1" defaultValue={k.name} disabled={!canManage} placeholder={tx("ชื่อลูกคนที่ {0}", [i + 1])} aria-label={tx("ชื่อลูกคนที่ {0}", [i + 1])}
              onBlur={(e) => { const v = e.target.value.trim(); if (v !== k.name) patch(k.id, { name: v }) }} />
            <NativeSelect className="h-8 w-28 shrink-0" aria-label={tx("ชั้นของลูกคนที่ {0}", [i + 1])} disabled={!canManage} value={k.grade} placeholder="ชั้น"
              onChange={(e) => patch(k.id, { grade: e.target.value })} options={branch.grades.map((x) => ({ value: x, label: x }))} />
            {canManage && kids.length > 1 && <Button size="icon-xs" variant="ghost" type="button" className="shrink-0" aria-label={tx("เอาลูกคนที่ {0} ออก", [i + 1])} onClick={() => save(kids.filter((x) => x.id !== k.id))}><XIcon /></Button>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pl-6">
            {branch.subjects.map((x) => {
              const on = k.subjects.includes(x)
              return (
                <Button key={x} variant="ghost" size="inline" type="button" disabled={!canManage} aria-pressed={on} title="วิชาที่สนใจ" onClick={() => patch(k.id, { subjects: on ? k.subjects.filter((y) => y !== x) : [...k.subjects, x] })}
                  className={cn("rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", on ? cn(subjectColor(x).chip, "ring-transparent") : "text-muted-foreground ring-border hover:bg-muted")}>{x}</Button>
              )
            })}
            {canManage && <Button size="xs" variant="ghost" type="button" className="text-muted-foreground" onClick={() => setPickingFor(k.id)}><PlusIcon /> {k.courseIds.length ? "คอร์ส" : "เลือกคอร์ส"}</Button>}
          </div>
          {(() => {
            const rows = kidInterestRows(k, kids, interests, courses)
            return rows.length > 0 && (
              <ul className="ml-6 divide-y rounded-xl border">
                {rows.map((r) => (
                  <li key={r.key} className="flex items-start gap-2 px-2.5 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{r.title}{r.grades.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{r.grades.join(" · ")}</span>}</p>
                      {r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}
                      {r.courseId && <CourseWishEditor kid={k} courseId={r.courseId} disabled={!canManage} onChange={(w) => patch(k.id, { wishes: { ...k.wishes, [r.courseId!]: w } })} />}
                    </div>
                    {!r.manual && <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-2xs font-medium", tagChip("interest", "catalog"))} title="ผู้ปกครองกด สนใจ ใน Catalog"><BookOpenIcon className="size-2.5" /> Catalog</span>}
                    {r.trial && <Pill tone="amber">ขอนัดทดลองเรียน</Pill>}
                    {r.at && <span className="shrink-0 text-2xs text-muted-foreground">{fmtDate(r.at.slice(0, 10), { year: true })}</span>}
                    {r.manual && canManage && <Button variant="ghost" size="icon-xs" type="button" aria-label="เอาคอร์สนี้ออก" onClick={() => patch(k.id, { courseIds: k.courseIds.filter((x) => x !== r.courseId) })}><XIcon /></Button>}
                  </li>
                ))}
              </ul>
            )
          })()}
          {/* owner 2026-11-23: the schools the family hopes to enter (max 3, best first) */}
          <TargetSchools targets={k.targetSchools ?? (k.studentId ? allStudents.find((x) => x.id === k.studentId)?.targetSchools : undefined) ?? []} canManage={canManage} province={branch.province}
            onChange={(t) => patch(k.id, { targetSchools: t.length ? t : undefined })} />
          <Textarea key={`${k.id}-${k.note}`} rows={1} className="ml-6 min-h-8 w-[calc(100%-1.5rem)] py-1.5" defaultValue={k.note} disabled={!canManage} placeholder="โน้ตเรื่องลูกคนนี้" aria-label={tx("โน้ตลูกคนที่ {0}", [i + 1])}
            onBlur={(e) => { const v = e.target.value.trim(); if (v !== k.note) patch(k.id, { note: v }) }} />
          <div className="flex justify-end gap-2 pt-1">
            <Button size="xs" variant="ghost" type="button" onClick={() => endEdit(kid.id)}>{tx("ยกเลิก")}</Button>
            <Button size="xs" type="button" onClick={() => saveKid(kid.id)}>{tx("บันทึก")}</Button>
          </div>
        </section>
        )
      })}
      {canManage && kids.length < 6 && <Button size="xs" variant="outline" type="button" onClick={() => { const nk: LeadKid = { id: `k${Date.now().toString(36)}`, name: "", grade: "", subjects: [], courseIds: [], note: "" }; save([...kids, nk]); setDrafts((d) => ({ ...d, [nk.id]: nk })) }}><PlusIcon /> เพิ่มลูก</Button>}
      {unassigned.length > 0 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="flex items-center gap-1 text-xs font-semibold"><BookOpenIcon className="size-3.5 text-muted-foreground" /> จาก Catalog — ยังไม่ได้เลือกว่าเป็นของลูกคนไหน</p>
          <ul className="divide-y rounded-xl border">
            {unassigned.map((r) => (
              <li key={r.key} className="flex items-center gap-2 px-2.5 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{r.title}</p>
                  {r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}
                </div>
                {r.trial && <Pill tone="amber">ขอนัดทดลองเรียน</Pill>}
                {canManage && r.courseId && (
                  <NativeSelect className="h-8 w-36 shrink-0" aria-label="ให้ลูกคนไหน" value="" placeholder="ให้ลูกคนไหน"
                    onChange={(e) => { const kid = kids.find((x) => x.id === e.target.value); if (kid) patch(kid.id, { courseIds: [...new Set([...kid.courseIds, r.courseId!])] }) }}
                    options={kids.map((x, j) => ({ value: x.id, label: x.name || tx("ลูกคนที่ {0}", [j + 1]) }))} />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
      {picking && (
        <CoursePicker forForm branch={branch} today={toDateStr(now)} studentGrade={picking.grade || undefined} onInvoice={picking.courseIds} interestedIds={interests.map((i) => i.courseId).filter((x): x is ID => !!x)} onClose={() => setPickingFor(null)}
          onConfirm={(picked) => { patch(picking.id, { courseIds: [...new Set([...picking.courseIds, ...picked.map((c) => c.id)])] }); setPickingFor(null) }} />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 rounded-2xl border p-3">
      <h3 className="text-xs font-semibold text-muted-foreground">{title}</h3>
      {children}
    </section>
  )
}

function InterestItem({ r, ticked, toggle }: { r: InterestRow; ticked: ID[]; toggle: (courseId: ID) => void }) {
  return (
    <li className="flex items-start gap-2">
      <Checkbox className="mt-0.5" checked={!!r.courseId && ticked.includes(r.courseId)} disabled={!r.courseId} aria-label={`เลือก ${r.title}`} onCheckedChange={() => r.courseId && toggle(r.courseId)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{r.title}{r.grades.length > 0 && <span className="ml-1.5 text-xs text-muted-foreground">{r.grades.join(" · ")}</span>}</p>
        {r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}
      </div>
      {!r.manual && <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-2xs font-medium", tagChip("interest", "catalog"))}><BookOpenIcon className="size-2.5" /> Catalog</span>}
    </li>
  )
}
