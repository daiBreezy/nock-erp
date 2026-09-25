"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CHANNEL_LABEL } from "@/domain/rules/inbox"
import type { Conversation } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { NativeSelect } from "../app/native-select"

const CHANNELS: Conversation["channel"][] = ["line", "walkin", "phone", "other"]

export function ComposeDialog({ onClose, onSent }: { onClose: () => void; onSent: (conversationId: string) => void }) {
  const branch = useBranch()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students).filter((s) => s.branchId === branch.id)
  const leads = useStore((s) => s.leads).filter((l) => l.branchId === branch.id && l.stage !== "archived")
  const start = useStore((s) => s.startConversation)

  const familyIds = new Set(students.map((s) => s.familyId).filter((x): x is string => !!x))
  const branchFamilies = families.filter((f) => familyIds.has(f.id))

  const [to, setTo] = useState("")
  const [channel, setChannel] = useState<Conversation["channel"]>("line")
  const [text, setText] = useState("")

  const submit = () => {
    const [kind, id] = to.split(":")
    const input = kind === "fam" ? { familyId: id, channel, text } : kind === "lead" ? { leadId: id, channel, text } : null
    if (!input) return report({ ok: false, error: "เลือกครอบครัวหรือ Lead ก่อน" }, "")
    const r = start(input)
    if (report(r, "เริ่มบทสนทนาแล้ว")) onSent(r.ok ? r.value.conversationId : "")
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>เริ่มบทสนทนาใหม่</DialogTitle>
          <DialogDescription>ถ้ามีบทสนทนากับครอบครัว/Lead นี้อยู่แล้ว ข้อความจะต่อในอันเดิม</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label className="mb-1 text-xs">ถึง</Label>
            <NativeSelect
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="เลือกครอบครัวหรือ Lead"
              options={[
                ...branchFamilies.map((f) => ({ value: `fam:${f.id}`, label: `${f.name} (ครอบครัว)` })),
                ...leads.map((l) => ({ value: `lead:${l.id}`, label: `${l.name} (Lead)` })),
              ]}
            />
          </div>
          <div>
            <Label className="mb-1 text-xs">ช่องทาง</Label>
            <NativeSelect value={channel} onChange={(e) => setChannel(e.target.value as Conversation["channel"])} options={CHANNELS.map((c) => ({ value: c, label: CHANNEL_LABEL[c] }))} />
          </div>
          <div>
            <Label className="mb-1 text-xs">ข้อความ</Label>
            <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="พิมพ์ข้อความแรก…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!to || !text.trim()} onClick={submit}>ส่ง</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
