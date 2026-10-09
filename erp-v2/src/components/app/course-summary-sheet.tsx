"use client"

import Link from "next/link"
import { useState } from "react"
import { CheckIcon, ChevronDownIcon, MapPinIcon, SendIcon, SparklesIcon, XIcon } from "lucide-react"
import { ForceApprove } from "./force-approve"
import { Pill } from "./badges"
import { avatarTone, gradeTone, initial } from "./subject-color"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import * as Sum from "@/domain/rules/summaries"
import { SUMMARY_STATUS_LABEL } from "@/domain/rules/summaries"
import type { CourseSummary, ID, Staff } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { AI_TONE } from "./ai"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "sonner"

const FIELD_MAX = 250
type Draft = { overallProgress: string; toImprove: string; strengths: string }
const emptyDraft: Draft = { overallProgress: "", toImprove: "", strengths: "" }

/**
 * Every Course Summary a student has due, in one popup (owner 2026-10-06 — redesigned from the owner's
 * reference mocks). A teacher writes several at once and submits them together; an admin reviews the same
 * list and can approve (which sends right away) one at a time or all together.
 */
export function CourseSummaryStudentSheet({ studentId, rounds, onClose }: { studentId: ID | null; rounds: Sum.EntitlementRound[]; onClose: () => void }) {
  return (
    <Dialog open={!!studentId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
        {studentId && <Body studentId={studentId} rounds={rounds} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  )
}

function Body({ studentId, rounds, onClose }: { studentId: ID; rounds: Sum.EntitlementRound[]; onClose: () => void }) {
  const student = useStore((s) => s.students.find((x) => x.id === studentId))
  const family = useStore((s) => s.families.find((f) => f.id === student?.familyId))
  const courseSummaries = useStore((s) => s.courseSummaries)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const canManage = can(me, "summary.approve")
  const approve = useStore((s) => s.approveCourseSummary)
  const send = useStore((s) => s.sendCourseSummary)
  const save = useStore((s) => s.saveCourseSummary)
  // starts fully collapsed, not the first card pre-opened — opening always goes through the same click (which
  // is also what triggers the auto-gather-from-sessions fill below), so there's no "already open" card that skips it
  const [open, setOpen] = useState<ID | null>(null)
  const [drafts, setDrafts] = useState<Record<ID, Draft>>({})

  if (!student) return null

  const draftOf = (round: Sum.EntitlementRound): Draft => {
    if (drafts[round.representativeId]) return drafts[round.representativeId]
    const cs = courseSummaries.find((x) => x.entitlementId === round.representativeId)
    return cs ? { overallProgress: cs.overallProgress, toImprove: cs.toImprove, strengths: cs.strengths } : emptyDraft
  }
  const patchDraft = (repId: ID, patch: Partial<Draft>) => setDrafts((d) => ({ ...d, [repId]: { ...draftOf(rounds.find((r) => r.representativeId === repId)!), ...patch } }))

  const pendingToSubmit = rounds.filter((r) => {
    const cs = courseSummaries.find((x) => x.entitlementId === r.representativeId)
    return !cs || cs.status === "draft" || cs.status === "changes_requested"
  })
  const pendingToApprove = rounds
    .map((r) => courseSummaries.find((x) => x.entitlementId === r.representativeId))
    .filter((cs): cs is NonNullable<typeof cs> => !!cs && Sum.canApprove(cs, me).ok)

  const submitAll = () => {
    let n = 0
    pendingToSubmit.forEach((r) => { const d = draftOf(r); if (d.overallProgress.trim() && save(r.representativeId, student.id, d, true).ok) n++ })
    if (n) toast.success(`ส่งอนุมัติแล้ว ${n} คอร์ส`)
  }
  const approveAndSendAll = () => {
    let n = 0
    pendingToApprove.forEach((cs) => { if (approve(cs.id).ok) { send(cs.id); n++ } })
    if (n) toast.success(`อนุมัติ + ส่งผู้ปกครองแล้ว ${n} คอร์ส`)
  }

  return (
    <div className="space-y-3">
      <DialogHeader className="flex-row items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(student.id))}>{initial(student.nickname)}</span>
        <div className="min-w-0 flex-1 text-left">
          <DialogTitle className="text-base">{student.name} <span className="font-normal text-muted-foreground">({student.nickname})</span></DialogTitle>
          <DialogDescription>
            {family ? <Link href="/families" className="text-primary underline">{family.name}</Link> : "ยังไม่ผูกครอบครัว"}
          </DialogDescription>
        </div>
        <span className={cn("rounded-full px-2.5 py-0.5 text-sm font-medium", gradeTone(student.grade))}>{student.grade}</span>
      </DialogHeader>

      <p className="text-sm font-semibold text-muted-foreground">Course Summary ({rounds.length})</p>

      <div className="space-y-3">
        {rounds.map((round) => (
          <CourseCard key={round.representativeId} round={round} studentId={student.id} expanded={open === round.representativeId} onToggle={() => setOpen(open === round.representativeId ? null : round.representativeId)}
            draft={draftOf(round)} setDraft={(patch) => patchDraft(round.representativeId, patch)} canManage={canManage} me={me}
            onSaveDraft={() => report(save(round.representativeId, student.id, draftOf(round), false), "บันทึกร่างแล้ว")}
            onApproveAndSend={(cs) => { if (report(approve(cs.id), "อนุมัติแล้ว")) report(send(cs.id), "ส่งผู้ปกครองทาง LINE แล้ว") }}
            onSend={(cs) => report(send(cs.id), "ส่งผู้ปกครองทาง LINE แล้ว")} />
        ))}
      </div>

      <div className="flex items-center justify-end gap-2 border-t pt-3">
        <Button variant="ghost" onClick={onClose}>Close</Button>
        {/* owner 2026-10-06: a Director/Admin can write AND approve — show whichever batch actions actually
         *  apply, not one or the other, so writing your own draft never dead-ends with no submit button */}
        {pendingToSubmit.length > 0 && (
          <Button variant={canManage ? "outline" : "default"} disabled={!pendingToSubmit.some((e) => draftOf(e).overallProgress.trim())} onClick={submitAll}>
            <CheckIcon /> Submit to Approve ({pendingToSubmit.length}) Pending
          </Button>
        )}
        {canManage && pendingToApprove.length > 0 && (
          <Button onClick={approveAndSendAll}>
            <SendIcon /> Submit &amp; Send ({pendingToApprove.length}) Pending
          </Button>
        )}
      </div>
    </div>
  )
}

function CourseCard({ round, studentId, expanded, onToggle, draft, setDraft, canManage, me, onSaveDraft, onApproveAndSend, onSend }: {
  round: Sum.EntitlementRound; studentId: ID; expanded: boolean; onToggle: () => void; draft: Draft; setDraft: (p: Partial<Draft>) => void
  canManage: boolean; me: Staff
  onSaveDraft: () => void; onApproveAndSend: (cs: CourseSummary) => void; onSend: (cs: CourseSummary) => void
}) {
  const now = useNow(60_000)
  const course = useStore((s) => s.courses.find((c) => c.id === round.courseId))
  const branch = useStore((s) => s.branches.find((b) => b.id === s.students.find((x) => x.id === studentId)?.branchId))
  const staff = useStore((s) => s.staff)
  const roundEntitlements = useStore((s) => s.entitlements).filter((e) => round.entitlementIds.includes(e.id))
  const sessions = useStore((s) => s.sessions)
  const summaries = useStore((s) => s.summaries)
  const cs = useCourseSummary(round.representativeId)
  const approve = useStore((s) => s.approveCourseSummary)
  const requestChanges = useStore((s) => s.requestCourseSummaryChanges)
  const [asking, setAsking] = useState(false)
  const [note, setNote] = useState("")

  // every session covered by ANY entitlement in this round's chain — a year of back-to-back monthly packages
  // is one round, so its Session Summaries span the whole year, not just the latest billing cycle
  const covered = sessions.filter((se) => roundEntitlements.some((e) => Att.packageCovers(e, se)))
  const sessionSummaries = covered
    .map((se) => ({ se, sm: summaries.find((x) => x.sessionId === se.id && x.studentId === studentId) }))
    .filter((x): x is { se: typeof x.se; sm: NonNullable<typeof x.sm> } => !!x.sm && !!x.sm.text.trim())
    .sort((a, b) => a.se.date.localeCompare(b.se.date))

  const status = cs?.status
  const editable = !status || status === "draft" || status === "changes_requested"
  const due = Sum.courseSummaryDeadline(round, now)
  const who = (id: ID) => staff.find((x) => x.id === id)?.nickname ?? "?"
  const banner = status === "changes_requested"
    ? { tone: "bg-amber-100 text-amber-900", label: `Recall by · ${who(cs!.lastEditorId)} · ${fmtDateTime(cs!.history.at(-1)!.at)}` }
    : status === "approved" || status === "sent"
      ? { tone: "bg-emerald-100 text-emerald-900", label: `Approve by · ${who(cs!.history.findLast((h) => h.action === "approve" || h.action === "force_approve")?.by ?? cs!.lastEditorId)} · ${fmtDateTime(cs!.history.at(-1)!.at)}` }
      : null
  const abbr = (course?.name ?? "??").replace(/[^A-Za-zก-๙]/g, "").slice(0, 2).toUpperCase() || "CS"

  const approveCheck = cs && Sum.canApprove(cs, me)
  const isBlank = !draft.overallProgress.trim() && !draft.toImprove.trim() && !draft.strengths.trim()
  const generate = () => setDraft(Sum.draftCourseSummary(sessionSummaries.map((x) => x.sm)))
  // a Course Summary IS its session summaries gathered together — open a blank, editable card with some
  // already in hand and it fills itself in immediately, no separate click needed (owner 2026-10-06)
  const expand = () => { if (!expanded && editable && isBlank && sessionSummaries.length) generate(); onToggle() }

  return (
    <div className="overflow-hidden rounded-2xl border">
      <div className="flex w-full items-center gap-3 p-3">
        <button type="button" onClick={expand} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-sm font-semibold text-primary">{abbr}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{course?.name ?? "คอร์ส"}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <MapPinIcon className="size-3" /> {branch?.name ?? "—"} · {fmtDate(round.from)} – {fmtDate(round.to, { year: true })}
              {round.entitlementIds.length > 1 && ` (${round.entitlementIds.length} รอบต่อเนื่อง)`}
            </p>
          </div>
        </button>
        {status === "submitted" && canManage && !expanded && approveCheck?.ok && (
          <button type="button" onClick={() => onApproveAndSend(cs!)} className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 hover:bg-emerald-200">Approve</button>
        )}
        <Pill tone={status === "sent" ? "blue" : status === "approved" ? "green" : status === "submitted" ? "amber" : status === "changes_requested" ? "red" : "gray"}>
          {status ? SUMMARY_STATUS_LABEL[status] : "ยังไม่เขียน"}
        </Pill>
        <button type="button" onClick={expand} className="shrink-0" aria-label={expanded ? "ย่อ" : "ขยาย"}>
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
        </button>
      </div>

      {banner && <div className={cn("px-3 py-1.5 text-right text-xs font-medium", banner.tone)}>{banner.label}</div>}

      {expanded && (
        <div className="space-y-3 border-t p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Required · due: {fmtDate(due.deadline, { weekday: true })} · <span className={cn("font-medium", due.overdue ? "text-red-700" : due.daysLeft <= 2 ? "text-red-700" : "text-foreground")}>{due.overdue ? `เลย ${-due.daysLeft} วัน` : `${due.daysLeft} วัน`}</span>
            </p>
            {editable && (
              <Button size="xs" variant="outline" className={cn("gap-1", AI_TONE.button)} disabled={!sessionSummaries.length} onClick={generate}>
                <SparklesIcon className="size-3.5" /> Generate Summary
              </Button>
            )}
          </div>
          {sessionSummaries.length > 0 && editable && <p className="text-xs text-muted-foreground">รวบรวมจาก {sessionSummaries.length} Session Summaries ด้านล่าง — แก้ไขได้ตามจริง</p>}

          {(["overallProgress", "toImprove", "strengths"] as const).map((k) => (
            <Field key={k} label={k === "overallProgress" ? "Overall Progress" : k === "toImprove" ? "To Improve" : "Strengths"}
              value={draft[k]} editable={editable} onChange={(v) => setDraft({ [k]: v.slice(0, FIELD_MAX) })} />
          ))}

          {sessionSummaries.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-semibold">Session Summaries</p>
              <ul className="space-y-0.5 text-sm text-muted-foreground">
                {sessionSummaries.map(({ se, sm }) => (
                  <li key={se.id} className="flex items-start justify-between gap-2"><span>• {sm.text}</span><span className="shrink-0">{fmtDate(se.date)}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-1.5">
            {editable && <Button size="sm" variant="ghost" onClick={onSaveDraft}>Save Draft</Button>}
            {status === "submitted" && canManage && cs && !approveCheck?.ok && (
              Sum.canForceApprove(cs, me, "x").ok && <ForceApprove onForce={(remark) => approve(cs.id, remark)} success="Force Approve แล้ว — แจ้งทั้งสาขา + Director" />
            )}
            {(status === "submitted" || status === "approved") && canManage && cs && (
              <>
                {status === "submitted" && <Button size="sm" variant="outline" onClick={() => setAsking(true)}><XIcon /> Recall</Button>}
                {status === "submitted" && approveCheck?.ok && <Button size="sm" onClick={() => onApproveAndSend(cs)}><SendIcon /> Approve</Button>}
                {status === "approved" && <Button size="sm" onClick={() => onSend(cs)}><SendIcon /> ส่งผู้ปกครอง</Button>}
              </>
            )}
          </div>

          {asking && cs && (
            <div className="space-y-1.5">
              <Textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="บอกครูว่าต้องแก้อะไร (จำเป็น)" rows={2} />
              <div className="flex justify-end gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>ยกเลิก</Button>
                <Button size="sm" disabled={!note.trim()} onClick={() => report(requestChanges(cs.id, note), "ส่งกลับให้ครูแก้แล้ว") && (setAsking(false), setNote(""))}>ส่งกลับ</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function useCourseSummary(entitlementId: ID) {
  return useStore((s) => s.courseSummaries.find((x) => x.entitlementId === entitlementId))
}

function Field({ label, value, editable, onChange }: { label: string; value: string; editable: boolean; onChange: (v: string) => void }) {
  if (!editable) {
    return value ? (
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      </div>
    ) : null
  }
  return (
    <div className="relative rounded-lg border p-2 pt-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} maxLength={FIELD_MAX}
        className="resize-none border-0 p-0 shadow-none focus-visible:ring-0" />
      <span className="absolute right-2 bottom-1 text-[10px] text-muted-foreground">{value.length}</span>
    </div>
  )
}
