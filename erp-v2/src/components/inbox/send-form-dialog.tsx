"use client"

import { useState } from "react"
import { PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormOfferSlot, FormType, ID } from "@/domain/types"
import { sendTestTrialForm } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { Button } from "../ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog"
import { SlotPicker } from "./slot-picker"

const TYPES: FormType[] = ["test", "trial"]

interface Block {
  subject: string
  selected: Map<string, FormOfferSlot>
}

export function SendFormDialog({
  leadId, branchId, conversationId, lineUserId, onClose,
}: {
  leadId: ID; branchId: ID; conversationId: ID; lineUserId: string; onClose: () => void
}) {
  const branch = useBranch()
  const staff = useStore((s) => s.staff)
  const sessions = useStore((s) => s.sessions)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const now = useNow()

  const [step, setStep] = useState<"type" | "offers" | "confirm">("type")
  const [type, setType] = useState<FormType>("test")
  const [blocks, setBlocks] = useState<Block[]>([{ subject: branch.subjects[0] ?? "", selected: new Map() }])
  const [sending, setSending] = useState(false)

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

  const offersReady = blocks.length > 0 && blocks.every((b) => b.subject && b.selected.size > 0)

  const send = async () => {
    setSending(true)
    try {
      const r = await sendTestTrialForm({
        leadId, branchId, conversationId, lineUserId, type,
        offers: blocks.map((b) => ({ subject: b.subject, slots: [...b.selected.values()] })),
        grades: branch.grades,
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
                <p className="text-xs text-muted-foreground">{[...b.selected.values()].map((s) => `${s.date} ${s.start}`).join(" · ")}</p>
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
