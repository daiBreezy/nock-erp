"use client"

import { useState } from "react"
import { PlusIcon, SendIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fromMinutes, toMinutes, weekdayShort } from "@/domain/dates"
import { offerFields } from "@/domain/rules/form-builder"
import type { FormDef, ID } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * Sending a form whose choices the admin offers (owner 2026-10-22 round 2: like the Test / Trial forms' times / the
 * Enroll form's classes) — the admin picks them first: the branch's classes, or anything typed. A form without such
 * questions goes straight out.
 */
export function useSendForm(branchId: ID, send: (form: FormDef, offers?: Record<ID, string[]>) => void | Promise<void>) {
  const [pending, setPending] = useState<FormDef | null>(null)
  const start = (form: FormDef) => (offerFields(form).length ? setPending(form) : send(form))
  const dialog = pending ? <OfferDialog form={pending} branchId={branchId} onClose={() => setPending(null)} onSend={(o) => { const f = pending; setPending(null); send(f, o) }} /> : null
  return { start, dialog }
}

function OfferDialog({ form, branchId, onClose, onSend }: { form: FormDef; branchId: ID; onClose: () => void; onSend: (offers: Record<ID, string[]>) => void }) {
  const classes = useStore((s) => s.classes).filter((c) => c.branchId === branchId && c.active)
  const choices = classes.map((c) => `${c.name} · ${weekdayShort(c.weekday)} ${c.start}–${fromMinutes(toMinutes(c.start) + c.minutes)}`)
  const fields = offerFields(form)
  const [picked, setPicked] = useState<Record<ID, string[]>>({})
  const [typing, setTyping] = useState<Record<ID, string>>({})
  const toggle = (id: ID, o: string) => setPicked((p) => ({ ...p, [id]: p[id]?.includes(o) ? p[id].filter((x) => x !== o) : [...(p[id] ?? []), o] }))
  const ready = fields.every((x) => picked[x.id]?.length)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx("ส่ง “{0}”", [form.name])}</DialogTitle>
          <DialogDescription>{tx("เลือกตัวเลือกที่จะเสนอให้ผู้ปกครองเลือก")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto">
          {fields.map((x) => {
            const mine = picked[x.id] ?? []
            const extra = mine.filter((o) => !choices.includes(o))
            return (
              <div key={x.id} className="space-y-2">
                <p className="text-sm font-medium">{x.label}</p>
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border p-2">
                  {choices.map((o) => <li key={o}><label className="flex items-center gap-2 text-sm"><Checkbox checked={mine.includes(o)} onCheckedChange={() => toggle(x.id, o)} />{o}</label></li>)}
                  {!choices.length && <li className="text-xs text-muted-foreground">{tx("สาขานี้ยังไม่มีคลาส — พิมพ์เวลาเองด้านล่าง")}</li>}
                </ul>
                {extra.length > 0 && <div className="flex flex-wrap gap-1.5">{extra.map((o) => <span key={o} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">{o}<button type="button" aria-label={tx("ลบ")} onClick={() => toggle(x.id, o)}><XIcon className="size-3" /></button></span>)}</div>}
                <div className="flex gap-2">
                  <Input placeholder={tx("พิมพ์เวลา / คลาสเอง เช่น ส. 10:00–12:00")} value={typing[x.id] ?? ""} onChange={(e) => setTyping((t) => ({ ...t, [x.id]: e.target.value }))}
                    onKeyDown={(e) => { const v = (typing[x.id] ?? "").trim(); if (e.key === "Enter" && v && !mine.includes(v)) { toggle(x.id, v); setTyping((t) => ({ ...t, [x.id]: "" })) } }} />
                  <Button variant="outline" disabled={!(typing[x.id] ?? "").trim()} onClick={() => { const v = (typing[x.id] ?? "").trim(); if (!mine.includes(v)) toggle(x.id, v); setTyping((t) => ({ ...t, [x.id]: "" })) }}><PlusIcon /> {tx("เพิ่ม")}</Button>
                </div>
              </div>
            )
          })}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button disabled={!ready} onClick={() => onSend(picked)}><SendIcon /> {tx("ส่งฟอร์ม")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
