"use client"

// Course Summary panel (owner 2026-10-14: "แสดงเป็น Side Panel … มี Info, Edit เหมือน Panel อื่นๆ"): one course round
// per panel — Header (student · course · status) · Body (facts, the summary, progress charts, the session notes) ·
// Bottom (แก้ไข / Approve / ส่งผู้ปกครอง; Recall + Force Approve in ⋯). แก้ไข swaps the same panel to the form.
import Link from "next/link"
import { useState } from "react"
import { CheckIcon, LayersIcon, PencilIcon, SaveIcon, SendIcon, ShieldAlertIcon, SparklesIcon, Undo2Icon } from "lucide-react"
import { Pill } from "./badges"
import { avatarTone, gradeTone, initial, subjectColor } from "./subject-color"
import { EntityPanel, PanelBody, PanelFooter, PanelMore } from "./form-shell"
import { MetaGrid } from "./images"
import { Segmented } from "./page-layout"
import { InfoTip } from "./info-tip"
import { Field } from "./student-form"
import { Button } from "@/components/ui/button"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { can } from "@/domain/rules/permissions"
import * as Sum from "@/domain/rules/summaries"
import { subjectsOf } from "@/domain/rules/scheduling"
import { SUMMARY_STATUS_LABEL } from "@/domain/rules/summaries"
import { report } from "@/lib/feedback"
import { useLookup, useNow } from "@/lib/hooks"
import { AI_TONE } from "./ai"
import { CourseProgress } from "./course-progress"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { toast } from "sonner"

const FIELD_MAX = 250
type Draft = { overallProgress: string; toImprove: string; strengths: string }
const FIELDS: { key: keyof Draft; label: string }[] = [
  { key: "overallProgress", label: "Overall Progress" },
  { key: "toImprove", label: "To Improve" },
  { key: "strengths", label: "Strengths" },
]

export function CourseSummaryPanel({ round, onClose }: { round: Sum.EntitlementRound | null; onClose: () => void }) {
  return (
    <EntityPanel open={!!round} onClose={onClose} wide>
      {round && <Body key={round.representativeId} round={round} />}
    </EntityPanel>
  )
}

function Body({ round }: { round: Sum.EntitlementRound }) {
  const now = useNow(60_000)
  const L = useLookup()
  const me = useStore((s) => s.me())
  const student = useStore((s) => s.students.find((x) => x.id === round.studentId))
  const family = useStore((s) => s.families.find((f) => f.id === student?.familyId))
  const course = useStore((s) => s.courses.find((c) => c.id === round.courseId))
  const branch = useStore((s) => s.branches.find((b) => b.id === student?.branchId))
  const allEntitlements = useStore((s) => s.entitlements)
  const sessions = useStore((s) => s.sessions)
  const summaries = useStore((s) => s.summaries)
  const attendance = useStore((s) => s.attendance)
  const cs = useStore((s) => s.courseSummaries.find((x) => x.entitlementId === round.representativeId))
  const save = useStore((s) => s.saveCourseSummary)
  const approve = useStore((s) => s.approveCourseSummary)
  const send = useStore((s) => s.sendCourseSummary)
  const requestChanges = useStore((s) => s.requestCourseSummaryChanges)
  const canManage = can(me, "summary.approve")

  const status = cs?.status
  const editable = !status || status === "draft" || status === "changes_requested"
  const stored: Draft = cs ? { overallProgress: cs.overallProgress, toImprove: cs.toImprove, strengths: cs.strengths } : { overallProgress: "", toImprove: "", strengths: "" }
  const [mode, setMode] = useState<"view" | "edit" | "recall" | "force">("view")
  const [draft, setDraft] = useState<Draft>(stored)
  const [note, setNote] = useState("")
  const [thinking, setThinking] = useState(false)
  const [aiInsights, setAiInsights] = useState<Sum.Insight[] | null>(null)
  // owner 2026-10-14: a Bundle shows the whole course AND each subject on its own — "" = ทั้งคอร์ส
  const [only, setOnly] = useState("")

  // every session covered by ANY entitlement in the round — a year of back-to-back monthly packages is one round
  const roundEntitlements = allEntitlements.filter((e) => round.entitlementIds.includes(e.id))
  const covered = sessions.filter((se) => roundEntitlements.some((e) => Att.packageCovers(e, se))).sort((a, b) => a.date.localeCompare(b.date))
  const sessionSummaries = covered
    .map((se) => ({ se, sm: summaries.find((x) => x.sessionId === se.id && x.studentId === round.studentId) }))
    .filter((x): x is { se: typeof x.se; sm: NonNullable<typeof x.sm> } => !!x.sm && !!x.sm.text.trim())
  const today = toDateStr(now)
  const allSubjects = course?.subjects ?? []
  // a subject view keeps only that subject's sessions, and only its part of a "คณิต: … · อังกฤษ: …" note
  const noteIn = (text: string) => (only ? Sum.noteForSubject(text, only, allSubjects) : text)
  const inView = (se: (typeof covered)[number]) => !only || subjectsOf(se).includes(only)
  const progressRows: Sum.ProgressRow[] = covered.filter((se) => se.date <= today && !se.cancelled && inView(se)).map((se) => {
    const sm = summaries.find((x) => x.sessionId === se.id && x.studentId === round.studentId)
    return { date: se.date, attended: attendance.find((a) => a.sessionId === se.id && a.studentId === round.studentId)?.status ?? null, level: only ? sm?.subjectLevels?.[only] ?? sm?.level : sm?.level, text: sm?.text ? noteIn(sm.text) : undefined }
  })
  const notesShown = sessionSummaries.filter((x) => inView(x.se)).map((x) => ({ ...x, text: noteIn(x.sm.text) })).filter((x) => x.text.trim())

  if (!student) return null
  const bundle = course?.kind === "bundle"
  const due = Sum.courseSummaryDeadline(round, now)
  const approveCheck = cs && Sum.canApprove(cs, me)
  const lastBy = (actions: string[]) => cs?.history.findLast((h) => actions.includes(h.action))
  const approved = lastBy(["approve", "force_approve"])
  const recalled = status === "changes_requested" ? lastBy(["request_changes"]) : undefined

  const ruleDraft = () => setDraft(bundle
    ? Sum.draftBundleCourseSummary(course!.subjects.map((subject) => ({ subject, texts: sessionSummaries.filter((x) => subjectsOf(x.se).includes(subject)).map((x) => x.sm) })))
    : Sum.draftCourseSummary(sessionSummaries.map((x) => x.sm)))
  // Generate: the AI set in Settings › ระบบ › AI writes the summary + the assessment; not set (or it fails) → rules draft
  const generate = async () => {
    setThinking(true)
    try {
      const r = await fetch("/api/ai/course-summary", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ course: course?.name ?? "", subjects: allSubjects, bundle, rows: covered.filter((se) => se.date <= today && !se.cancelled).map((se) => {
          const sm = summaries.find((x) => x.sessionId === se.id && x.studentId === round.studentId)
          return { date: se.date, attended: attendance.find((a) => a.sessionId === se.id && a.studentId === round.studentId)?.status ?? null, level: sm?.level, text: sm?.text }
        }) }) }).then((x) => x.json())
      if (r.ok) {
        setDraft({ overallProgress: r.overallProgress, toImprove: r.toImprove, strengths: r.strengths })
        setAiInsights(r.insights?.length ? r.insights : null)
        toast.success(`AI เขียนสรุปให้แล้ว (${r.model}) — ตรวจและแก้ได้ก่อนส่ง`)
      } else {
        ruleDraft()
        toast(r.notConfigured ? "ยังไม่ได้ตั้งค่า AI — ใช้สรุปอัตโนมัติจากสรุปคาบแทน (ตั้งค่าได้ที่ Settings › ระบบ › AI)" : `AI ไม่ตอบ (${r.error}) — ใช้สรุปอัตโนมัติแทน`)
      }
    } catch { ruleDraft() } finally { setThinking(false) }
  }
  // a Course Summary IS its session summaries gathered together — a blank one fills itself when you start writing
  const startEdit = () => {
    if (!stored.overallProgress.trim() && !stored.toImprove.trim() && !stored.strengths.trim() && sessionSummaries.length) ruleDraft()
    else setDraft(stored)
    setMode("edit")
  }
  const saveIt = (submit: boolean) => { if (report(save(round.representativeId, round.studentId, draft, submit), submit ? "ส่งอนุมัติแล้ว" : "บันทึกร่างแล้ว")) setMode("view") }
  const closeNote = () => { setMode("view"); setNote("") }

  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-3 pr-8">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(student.id))}>{initial(student.nickname)}</span>
          <div className="min-w-0 flex-1">
            <SheetTitle className="flex items-center gap-1.5 text-lg">
              <span className="truncate">{student.nickname}</span>
              <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(student.grade))}>{student.grade}</span>
            </SheetTitle>
            <p className="truncate text-sm text-muted-foreground">{mode === "edit" ? "เขียน Course Summary · " : "Course Summary · "}{course?.name ?? "คอร์ส"}</p>
          </div>
          <Pill tone={status === "sent" ? "green" : status === "approved" ? "blue" : status === "submitted" ? "amber" : status === "draft" ? "violet" : "red"}>
            {status ? SUMMARY_STATUS_LABEL[status] : "ยังไม่เขียน"}
          </Pill>
        </div>
      </SheetHeader>

      <PanelBody>
        <MetaGrid rows={[
          ["นักเรียน", <>{student.name}{family && <Link href="/families" className="text-xs text-primary underline">{family.name}</Link>}</>],
          ["คอร์ส", <>{course?.name}{bundle && <Pill tone="violet"><LayersIcon className="size-3" /> Bundle</Pill>}{course?.subjects.map((x) => <span key={x} className={cn("rounded-full px-1.5 py-0.5 text-[11px]", subjectColor(x).chip)}>{x}</span>)}</>],
          ["ช่วงเรียน", <>{fmtDate(round.from)} – {fmtDate(round.to, { year: true })}{round.entitlementIds.length > 1 && <span className="text-muted-foreground">({round.entitlementIds.length} รอบต่อเนื่อง)</span>}<span className="text-muted-foreground">· {branch?.name}</span></>],
          ...(status === "sent" ? [] : [["กำหนดส่ง", <span key="d" className={cn(due.overdue || due.daysLeft <= 2 ? "font-medium text-red-700" : "")}>{fmtDate(due.deadline, { weekday: true })} · {due.overdue ? `เลย ${-due.daysLeft} วัน` : `อีก ${due.daysLeft} วัน`}</span>] as [string, React.ReactNode]]),
          ...(cs ? [["เขียนโดย", L.teacher(cs.authorId).label] as [string, React.ReactNode]] : []),
          ...(approved ? [["อนุมัติโดย", `${L.teacher(approved.by).label} · ${fmtDateTime(approved.at)}`] as [string, React.ReactNode]] : []),
        ]} />

        {recalled && <p className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"><b>ขอแก้ไข</b> · {L.teacher(recalled.by).label}: {recalled.note}</p>}

        {(mode === "recall" || mode === "force") && (
          <section className="space-y-1.5 rounded-2xl bg-muted/40 p-3">
            <p className="text-sm font-medium">{mode === "recall" ? "ส่งกลับให้ครูแก้" : "Force Approve — อนุมัติงานตัวเอง"}</p>
            <Textarea autoFocus rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={mode === "recall" ? "บอกครูว่าต้องแก้อะไร (จำเป็น)" : "เหตุผลที่ต้องอนุมัติเอง (จำเป็น)"} />
          </section>
        )}

        {bundle && (
          <Segmented label="ดูสรุป" value={only || "all"} onChange={(v) => setOnly(v === "all" ? "" : v)}
            options={[{ value: "all", label: "ทั้งคอร์ส" }, ...allSubjects.map((x) => ({ value: x, label: <><span className={cn("size-2 rounded-full", subjectColor(x).bar)} />{x}</> }))]} />
        )}

        {mode === "edit" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-sm font-semibold">สรุปทั้งคอร์ส<InfoTip text={`รวบรวมจาก ${sessionSummaries.length} สรุปคาบ — แก้ไขได้ตามจริง${bundle ? " · Bundle: เขียนแยกบรรทัดตามวิชา เช่น คณิต: …" : ""}`} /></p>
              <Button size="sm" variant="outline" className={cn("gap-1", AI_TONE.button)} disabled={!sessionSummaries.length || thinking} onClick={generate}>
                <SparklesIcon className={cn("size-3.5", thinking && "animate-pulse")} /> {thinking ? "AI กำลังเขียน…" : "Generate Summary"}
              </Button>
            </div>
            {FIELDS.map((f) => (
              <Field key={f.key} label={<>{f.label}<span className="ml-auto font-normal text-muted-foreground tabular-nums">{draft[f.key].length}/{FIELD_MAX}</span></>}>
                <Textarea rows={3} maxLength={FIELD_MAX} value={draft[f.key]} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value.slice(0, FIELD_MAX) })} />
              </Field>
            ))}
          </section>
        ) : (
          <section className="space-y-2">
            <p className="text-sm font-semibold">{only ? `สรุปวิชา${only}` : "สรุปทั้งคอร์ส"}</p>
            {FIELDS.some((f) => stored[f.key].split("\n").some((l) => l.trim() && (!only || l.trim().startsWith(`${only}:`))))
              ? FIELDS.map((f) => <SummaryField key={f.key} label={f.label} value={stored[f.key]} subjects={allSubjects} only={only} />)
              : <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">{only && FIELDS.some((f) => stored[f.key].trim()) ? `ยังไม่มีส่วนของวิชา${only} — แก้ไขแล้วขึ้นบรรทัดด้วย "${only}: …"` : "ยังไม่ได้เขียน"}</p>}
          </section>
        )}

        <section className="space-y-2">
          <p className="text-sm font-semibold">พัฒนาการ{only && ` · ${only}`}</p>
          <CourseProgress rows={progressRows} aiInsights={aiInsights} />
        </section>

        {notesShown.length > 0 && (
          <section>
            <p className="mb-1.5 text-sm font-semibold">สรุปรายคาบ{only && ` · ${only}`} ({notesShown.length})</p>
            <ul className="divide-y rounded-2xl ring-1 ring-foreground/10">
              {notesShown.slice().reverse().map(({ se, sm, text }) => (
                <li key={se.id} className="flex items-start gap-3 px-3 py-2 text-sm">
                  <span className="w-16 shrink-0 text-xs text-muted-foreground">{fmtDate(se.date)}</span>
                  <span className="min-w-0 flex-1">{bundle && !only && subjectsOf(se).length < 2 && subjectsOf(se).map((x) => <span key={x} className={cn("mr-1 rounded-full px-1.5 py-0.5 text-[11px]", subjectColor(x).chip)}>{x}</span>)}{text}</span>
                  {(() => { const lv = only ? sm.subjectLevels?.[only] ?? sm.level : sm.level; return lv && <span className="shrink-0 text-xs text-muted-foreground tabular-nums" title={Sum.LEVEL_LABEL[lv]}>{lv}/5</span> })()}
                </li>
              ))}
            </ul>
          </section>
        )}
      </PanelBody>

      <PanelFooter>
        {mode === "edit" ? (
          <>
            <Button variant="ghost" className="ml-auto" onClick={() => setMode("view")}>ยกเลิก</Button>
            <Button variant="outline" onClick={() => saveIt(false)}><SaveIcon /> บันทึกร่าง</Button>
            <Button disabled={!draft.overallProgress.trim()} title={draft.overallProgress.trim() ? undefined : "เขียน Overall Progress ก่อน"} onClick={() => saveIt(true)}><CheckIcon /> ส่งอนุมัติ</Button>
          </>
        ) : mode === "recall" || mode === "force" ? (
          <>
            <Button variant="ghost" className="ml-auto" onClick={closeNote}>ยกเลิก</Button>
            {mode === "recall"
              ? <Button disabled={!note.trim()} onClick={() => { if (report(requestChanges(cs!.id, note), "ส่งกลับให้ครูแก้แล้ว")) closeNote() }}><Undo2Icon /> ส่งกลับ</Button>
              : <Button disabled={!note.trim()} onClick={() => { if (report(approve(cs!.id, note), "Force Approve แล้ว — แจ้งทั้งสาขา + Director")) closeNote() }}><ShieldAlertIcon /> Force Approve</Button>}
          </>
        ) : (
          <>
            {/* negative / rare actions in ⋯ (owner 2026-10-12) */}
            <PanelMore items={[
              status === "submitted" && canManage && { label: "ส่งกลับให้ครูแก้ (Recall)", icon: Undo2Icon, onClick: () => setMode("recall") },
              status === "submitted" && canManage && !!cs && !approveCheck?.ok && Sum.canForceApprove(cs, me, "x").ok && { label: "Force Approve", icon: ShieldAlertIcon, onClick: () => setMode("force") },
            ]} />
            <div className="ml-auto flex gap-2">
              {editable && <Button variant={cs ? "outline" : "default"} onClick={startEdit}><PencilIcon /> {cs ? "แก้ไข" : "เขียนสรุป"}</Button>}
              {status === "submitted" && canManage && approveCheck?.ok && <Button onClick={() => { if (report(approve(cs!.id), "อนุมัติแล้ว")) report(send(cs!.id), "ส่งผู้ปกครองทาง LINE แล้ว") }}><SendIcon /> Approve &amp; ส่ง</Button>}
              {status === "approved" && canManage && <Button onClick={() => report(send(cs!.id), "ส่งผู้ปกครองทาง LINE แล้ว")}><SendIcon /> ส่งผู้ปกครอง</Button>}
            </div>
          </>
        )}
      </PanelFooter>
    </>
  )
}

/** a summary field in the info view — Bundle lines "คณิต: …" get their subject chip */
function SummaryField({ label, value, subjects, only }: { label: string; value: string; subjects: string[]; only?: string }) {
  const lines = value.split("\n").filter((l) => l.trim())
    .filter((l) => !only || l.trim().startsWith(`${only}:`) || l.trim().startsWith(`${only}：`))
  if (!lines.length) return null
  return (
    <div className="rounded-2xl bg-muted/40 p-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="space-y-1 text-sm">
        {lines.map((line, i) => {
          const m = line.match(/^([^:：]{1,20})[:：]\s*(.*)$/)
          return m && subjects.includes(m[1].trim())
            ? <p key={i} className="flex items-start gap-1.5"><span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[11px]", subjectColor(m[1].trim()).chip)}>{m[1].trim()}</span><span>{m[2]}</span></p>
            : <p key={i} className="whitespace-pre-wrap">{line}</p>
        })}
      </div>
    </div>
  )
}
