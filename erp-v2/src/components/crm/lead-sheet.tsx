"use client"

import { useEffect, useState } from "react"
import { ArchiveIcon, CheckIcon, FileTextIcon, PhoneIcon, RotateCcwIcon, SendIcon, UserCheckIcon, XIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { StudentSheet } from "@/components/app/student-sheet"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDateTime } from "@/domain/dates"
import { daysAgoLabel, LEAD_SOURCE_LABEL, LEAD_STAGE_LABEL } from "@/domain/rules/crm"
import { can } from "@/domain/rules/permissions"
import type { FormSubmission, FormType, ID, LeadStage } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const FORM_TYPE_LABEL: Record<FormType, string> = { test: "สอบวัดระดับ", trial: "ทดลองเรียน" }
const APPROVE_STAGE: Record<FormType, LeadStage> = { test: "tested", trial: "trialed" }

/** Forward path a lead normally walks — used to suggest the next action button. */
const NEXT_STAGE: Partial<Record<LeadStage, { stage: LeadStage; label: string }[]>> = {
  new: [{ stage: "contacting", label: "เริ่มติดต่อแล้ว" }],
  contacting: [{ stage: "test_scheduled", label: "นัดสอบวัดระดับ" }, { stage: "trial_scheduled", label: "นัดทดลองเรียน" }],
  test_scheduled: [{ stage: "tested", label: "สอบแล้ว" }],
  tested: [{ stage: "trial_scheduled", label: "นัดทดลองเรียน" }, { stage: "payment_pending", label: "พร้อมสมัคร → รอชำระเงิน" }],
  trial_scheduled: [{ stage: "trialed", label: "ทดลองเรียนแล้ว" }],
  trialed: [{ stage: "payment_pending", label: "พร้อมสมัคร → รอชำระเงิน" }],
}

export function LeadSheet({ leadId, onClose }: { leadId: ID | null; onClose: () => void }) {
  return (
    <Sheet open={!!leadId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">{leadId && <Body id={leadId} />}</SheetContent>
    </Sheet>
  )
}

function Body({ id }: { id: ID }) {
  const lead = useStore((s) => s.leads.find((x) => x.id === id))
  const staff = useStore((s) => s.staff)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const moveStage = useStore((s) => s.moveLeadStage)
  const addNote = useStore((s) => s.addLeadNote)
  const convert = useStore((s) => s.convertLeadToStudent)
  const now = useNow()
  const [note, setNote] = useState("")
  const [archiving, setArchiving] = useState(false)
  const [openStudentId, setOpenStudentId] = useState<ID | null>(null)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])
  const [sendingForm, setSendingForm] = useState<FormType | null>(null)

  useEffect(() => {
    let cancelled = false
    const poll = () => fetch("/api/forms/submissions").then((r) => r.json()).then((d) => { if (!cancelled) setSubmissions(d.submissions ?? []) }).catch(() => {})
    poll()
    const t = setInterval(poll, 5000)
    return () => { cancelled = true; clearInterval(t) }
  }, [])

  if (!lead) return null
  const mySubmissions = submissions.filter((s) => s.leadId === lead.id)
  const pending = mySubmissions.filter((s) => s.status === "pending")

  const assignee = staff.find((x) => x.id === lead.assigneeId)
  const canManage = can(me, "lead.manage")
  const next = NEXT_STAGE[lead.stage] ?? []

  const sendForm = async (type: FormType) => {
    if (!lead.lineUserId) return
    setSendingForm(type)
    try {
      const tokenRes = await fetch("/api/forms/token", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, leadId: lead.id, branchId: lead.branchId }) })
      const tokenData = await tokenRes.json()
      if (!tokenData.ok) { report({ ok: false, error: tokenData.error ?? "สร้างลิงก์ไม่สำเร็จ" }, ""); return }
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID
      if (!liffId) { report({ ok: false, error: "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_LIFF_ID ใน .env.local" }, ""); return }
      const url = `https://liff.line.me/${liffId}?token=${tokenData.token}`
      const sendRes = await fetch("/api/line/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: `line_${lead.lineUserId}`, text: `กรุณากรอกแบบฟอร์ม${FORM_TYPE_LABEL[type]}ที่ลิงก์นี้ค่ะ 🙏\n${url}` }) })
      const sendData = await sendRes.json()
      report(sendData.ok ? { ok: true, value: undefined } : { ok: false, error: sendData.error ?? "ส่งลิงก์ไม่สำเร็จ" }, `ส่งฟอร์ม${FORM_TYPE_LABEL[type]}ทาง LINE แล้ว`)
    } catch {
      report({ ok: false, error: "เรียก API ไม่ได้" }, "")
    } finally {
      setSendingForm(null)
    }
  }

  const review = async (sub: FormSubmission, status: "approved" | "rejected") => {
    await fetch("/api/forms/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sub.id, status }) })
    setSubmissions((prev) => prev.map((s) => (s.id === sub.id ? { ...s, status } : s)))
    if (status === "approved") {
      report(moveStage(lead.id, APPROVE_STAGE[sub.type]), `อนุมัติแล้ว — ย้ายไป "${LEAD_STAGE_LABEL[APPROVE_STAGE[sub.type]]}"`)
      addNote(lead.id, `อนุมัติฟอร์ม${FORM_TYPE_LABEL[sub.type]}: ${sub.studentName} (${sub.studentGrade}, ${sub.subject}) · สะดวก ${sub.preferredTime}`)
    } else {
      report({ ok: true, value: undefined }, "ปฏิเสธฟอร์มแล้ว")
    }
  }

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
          <Pill tone={lead.stage === "archived" ? "gray" : lead.stage === "enrolled" ? "green" : "blue"}>{LEAD_STAGE_LABEL[lead.stage]}</Pill>
          {assignee && <Pill tone="gray"><UserCheckIcon className="size-3" /> {assignee.nickname}</Pill>}
        </div>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6 text-sm">
        <Section title="ติดต่อ">
          <div className="space-y-1">
            {lead.phone && <a href={`tel:${lead.phone.replace(/\D/g, "")}`} className="inline-flex items-center gap-1 text-sky-700 hover:underline"><PhoneIcon className="size-3" />{lead.phone}</a>}
            {lead.lineId && <div className="text-muted-foreground">LINE: {lead.lineId}</div>}
            {!lead.phone && !lead.lineId && <p className="text-muted-foreground">ยังไม่มีช่องทางติดต่อ</p>}
            {lead.scheduledAt && <div className="text-muted-foreground">นัดหมาย: {fmtDateTime(lead.scheduledAt)}</div>}
          </div>
        </Section>

        {canManage && lead.stage !== "enrolled" && lead.stage !== "archived" && (
          <Section title="ขั้นตอนถัดไป">
            <div className="flex flex-wrap gap-1.5">
              {next.map((n) => (
                <Button key={n.stage} size="sm" variant="outline" onClick={() => report(moveStage(lead.id, n.stage), `ย้ายไป "${LEAD_STAGE_LABEL[n.stage]}" แล้ว`)}>
                  <CheckIcon /> {n.label}
                </Button>
              ))}
              {lead.stage === "payment_pending" && (
                <Button size="sm" onClick={() => { const r = convert(lead.id); if (report(r, "แปลงเป็นนักเรียนแล้ว — เปิดใบแจ้งหนี้ต่อได้ที่หน้าการเงิน")) setOpenStudentId(r.ok ? r.value.studentId : null) }}>
                  <UserCheckIcon /> แปลงเป็นนักเรียน
                </Button>
              )}
            </div>
          </Section>
        )}

        {lead.stage === "enrolled" && lead.convertedStudentId && (
          <Section title="นักเรียน">
            <Button size="sm" variant="outline" onClick={() => setOpenStudentId(lead.convertedStudentId!)}>เปิดโปรไฟล์นักเรียน</Button>
          </Section>
        )}

        {lead.stage === "archived" && lead.archiveReason && (
          <Section title="เหตุผลที่เก็บเข้าคลัง">
            <p className="text-muted-foreground">{lead.archiveReason}</p>
          </Section>
        )}

        {canManage && lead.stage !== "enrolled" && lead.stage !== "archived" && (
          <Section title="แบบฟอร์ม">
            {!lead.lineUserId ? (
              <p className="text-muted-foreground">ยังไม่ได้ผูก LINE — ผูกได้จากหน้า Inbox ก่อนถึงจะส่งฟอร์มได้</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="outline" disabled={sendingForm === "test"} onClick={() => sendForm("test")}><SendIcon /> ส่งฟอร์มสอบวัดระดับ</Button>
                <Button size="sm" variant="outline" disabled={sendingForm === "trial"} onClick={() => sendForm("trial")}><SendIcon /> ส่งฟอร์มทดลองเรียน</Button>
              </div>
            )}
            {pending.length > 0 && (
              <div className="mt-3 space-y-2">
                {pending.map((sub) => (
                  <div key={sub.id} className="rounded-lg border border-amber-300 bg-amber-50 p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900"><FileTextIcon className="size-3.5" /> ฟอร์ม{FORM_TYPE_LABEL[sub.type]} — รออนุมัติ</div>
                    <div className="mt-1.5 space-y-0.5 text-xs text-amber-950">
                      <div>ผู้ปกครอง: {sub.parentName} · {sub.parentPhone}</div>
                      <div>นักเรียน: {sub.studentName} · {sub.studentGrade} · {sub.subject}</div>
                      <div>สะดวก: {sub.preferredTime}</div>
                    </div>
                    <div className="mt-2 flex gap-1.5">
                      <Button size="xs" onClick={() => review(sub, "approved")}><CheckIcon /> อนุมัติ</Button>
                      <Button size="xs" variant="ghost" className="text-red-700" onClick={() => review(sub, "rejected")}><XIcon /> ปฏิเสธ</Button>
                    </div>
                  </div>
                ))}
              </div>
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

        {canManage && (
          <div className="border-t pt-3">
            {lead.stage === "archived" ? (
              <Button size="sm" variant="outline" onClick={() => report(moveStage(lead.id, lead.archivedFrom && lead.archivedFrom !== "archived" ? lead.archivedFrom : "new"), "กู้คืนแล้ว")}>
                <RotateCcwIcon /> กู้คืนจากคลัง
              </Button>
            ) : lead.stage !== "enrolled" && (
              <Button size="sm" variant="outline" className="text-red-700" onClick={() => setArchiving(true)}>
                <ArchiveIcon /> เก็บเข้าคลัง
              </Button>
            )}
          </div>
        )}
      </div>
      {archiving && <ArchiveDialog id={lead.id} onClose={() => setArchiving(false)} />}
      <StudentSheet studentId={openStudentId} onClose={() => setOpenStudentId(null)} />
    </>
  )
}

function ArchiveDialog({ id, onClose }: { id: ID; onClose: () => void }) {
  const archive = useStore((s) => s.archiveLead)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เก็บ Lead นี้เข้าคลัง?</DialogTitle>
          <DialogDescription>จะย้ายออกจากไปป์ไลน์หลัก — กู้คืนได้ภายหลังจากรายละเอียด Lead</DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <Label>เหตุผล *</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เช่น ไม่ตอบกลับ / ย้ายไปเรียนที่อื่น" />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => report(archive(id, reason), "เก็บเข้าคลังแล้ว") && onClose()}>ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
