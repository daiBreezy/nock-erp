"use client"

import { useState } from "react"
import { PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { fmtDate } from "@/domain/dates"
import { siblingLead } from "@/domain/rules/crm"
import { buildFormPrefill, FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormType, ID } from "@/domain/types"
import { sendTestTrialForm } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { SlotPicker } from "./slot-picker"
import { NativeSelect } from "@/components/app/native-select"
import { uid } from "@/data/seed"

const TYPES: FormType[] = ["test", "trial"]

interface Block {
  subject: string
  selected: Map<string, FormOfferSlot>
}

export function SendFormDialog({
  leadId, branchId, conversationId, lineUserId, onClose, initialType,
}: {
  /** null = a family that is already a customer (owner 2026-10-19: e.g. a second child) — a lead is made for the child on send */
  leadId: ID | null; branchId: ID; conversationId: ID; lineUserId: string; onClose: () => void
  /** picked already (Inbox "+" menu → Test / Trial) — skips the type step */
  initialType?: FormType
}) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const lead = useStore((s) => s.leads.find((l) => l.id === leadId))
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const assessments = useStore((s) => s.assessments)
  const conversations = useStore((s) => s.conversations)
  const lang = useStore((s) => s.system.preferences.language)
  const subjectNames = useStore((s) => s.system.subjectNames)
  const now = useNow()
  // what we already know about this family → pre-filled in the form, never typed twice
  const trialStudent = students.find((x) => x.id === lead?.trialStudentId)
  const family = families.find((f) => f.id === trialStudent?.familyId)
    ?? families.find((f) => f.id === conversations.find((c) => c.id === conversationId)?.familyId)
    ?? (lead?.lineUserId ? families.find((f) => f.lineUserId === lead.lineUserId) : undefined)
  const knownStudents = family ? students.filter((x) => x.familyId === family.id && !x.archived) : trialStudent ? [trialStudent] : []

  const [step, setStep] = useState<"type" | "offers" | "confirm">(initialType ? "offers" : "type")
  const [type, setType] = useState<FormType>(initialType ?? "test")
  const [blocks, setBlocks] = useState<Block[]>([{ subject: branch.subjects[0] ?? "", selected: new Map() }])
  const [sending, setSending] = useState(false)
  // existing family: the new child's grade (the lead needs it)
  const [childGrade, setChildGrade] = useState("")
  const me = useStore((s) => s.userId)
  const saveLead = useStore((s) => s.saveLead)

  const setBlockSubject = (i: number, subject: string) => setBlocks((bs) => bs.map((b, idx) => (idx === i ? { ...b, subject, selected: new Map() } : b)))
  const toggleSlot = (i: number, slot: FormOfferSlot) =>
    setBlocks((bs) =>
      bs.map((b, idx) => {
        if (idx !== i) return b
        const next = new Map(b.selected)
        if (next.has(slot.id)) next.delete(slot.id)
        else next.set(slot.id, slot)
        return { ...b, selected: next }
      }),
    )
  const addBlock = () => setBlocks((bs) => [...bs, { subject: branch.subjects[0] ?? "", selected: new Map() }])
  const removeBlock = (i: number) => setBlocks((bs) => bs.filter((_, idx) => idx !== i))

  const offersReady = blocks.length > 0 && blocks.every((b) => b.subject && b.selected.size > 0) && (!!leadId || !!childGrade)

  const send = async () => {
    setSending(true)
    try {
      let useLead = lead
      if (!useLead) {
        if (!family) return report({ ok: false, error: "ผูกแชทนี้กับครอบครัวก่อน" }, "")
        const made = saveLead(siblingLead(family, { id: uid("ld"), branchId, childGrade, subject: blocks[0].subject, by: me, now: now.toISOString() }))
        if (!made.ok) return report(made, "")
        useLead = made.value
      }
      const r = await sendTestTrialForm({
        leadId: useLead.id, branchId, conversationId, lineUserId, type,
        offers: blocks.map((b) => ({ subject: b.subject, slots: [...b.selected.values()] })),
        grades: branch.grades,
        branchName: branch.name, brand: branch.brand, lang,
        subjectNames: Object.fromEntries(blocks.map((b) => [b.subject, subjectNames?.[b.subject] ?? {}])),
        prefill: buildFormPrefill({ lead: useLead, family, students: knownStudents, assessments }),
      })
      if (report(r, `ส่งฟอร์ม${FORM_TYPE_LABEL[type]}ทาง LINE แล้ว`)) onClose()
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ส่งฟอร์ม{step !== "type" ? FORM_TYPE_LABEL[type] : ""}</DialogTitle>
          <DialogDescription>
            {step === "type" && "เลือกประเภทฟอร์มที่จะส่งให้ผู้ปกครอง"}
            {step === "offers" && "เลือกวิชา ช่วงวันที่ และช่วงเวลาที่จะเสนอให้เลือก — เลือกได้หลายช่วง"}
            {step === "confirm" && "ตรวจสอบก่อนส่งจริง"}
          </DialogDescription>
        </DialogHeader>

        {step === "type" && (
          <div className="flex gap-2">
            {TYPES.map((t) => (
              <Button key={t} variant={type === t ? "default" : "outline"} className="flex-1" onClick={() => setType(t)}>
                {FORM_TYPE_LABEL[t]}
              </Button>
            ))}
          </div>
        )}

        {step === "offers" && (
          <div className="space-y-4">
            {!leadId && (
              <div className="space-y-1 rounded-lg bg-muted/60 p-3 text-sm">
                <p className="font-medium">ลูกค้าเดิม — ลูกคนไหน</p>
                <p className="text-xs text-muted-foreground">{`${family?.name ?? ""} · สร้าง Lead ให้เด็กคนนี้ตอนส่ง · อนุมัติแล้วเด็กเข้าครอบครัวเดิม`}</p>
                <NativeSelect className="h-9" value={childGrade} onChange={(e) => setChildGrade(e.target.value)} placeholder="ชั้นของลูก *" options={branch.grades.map((g) => ({ value: g, label: g }))} />
              </div>
            )}
            {blocks.map((b, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                {blocks.length > 1 && (
                  <div className="flex justify-end">
                    <Button size="xs" variant="ghost" className="text-red-700" onClick={() => removeBlock(i)}><Trash2Icon /> ลบวิชานี้</Button>
                  </div>
                )}
                <SlotPicker
                  branch={branch} staff={staff} sessions={sessions} classes={classes} holidays={holidays} now={now}
                  subject={b.subject} onSubjectChange={(s) => setBlockSubject(i, s)} subjectOptions={branch.subjects}
                  selected={new Set(b.selected.keys())} onToggle={(slot) => toggleSlot(i, slot)}
                />
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={addBlock}><PlusIcon /> เพิ่มวิชาอื่น</Button>
          </div>
        )}

        {step === "confirm" && (
          <div className="space-y-2 text-sm">
            {!lineUserId && <p className="text-red-700">ยังไม่ได้ผูก LINE — ผูกได้จากหน้า Inbox ก่อนถึงจะส่งฟอร์มได้</p>}
            {blocks.map((b, i) => (
              <div key={i} className="rounded-lg border p-2.5">
                <p className="font-medium">{b.subject}</p>
                <p className="text-xs text-muted-foreground">{[...b.selected.values()].map((s) => `${fmtDate(s.date, { weekday: true })} ${s.start}`).join(" · ")}</p>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          {step === "type" && <Button onClick={() => setStep("offers")}>ถัดไป</Button>}
          {step === "offers" && (
            <>
              <Button variant="outline" onClick={() => setStep("type")}>ย้อนกลับ</Button>
              <Button disabled={!offersReady} onClick={() => setStep("confirm")}>ถัดไป</Button>
            </>
          )}
          {step === "confirm" && (
            <>
              <Button variant="outline" onClick={() => setStep("offers")}>ย้อนกลับ</Button>
              <Button disabled={!lineUserId || sending} onClick={send}><SendIcon /> ส่ง</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
