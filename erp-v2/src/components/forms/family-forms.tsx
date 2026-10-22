"use client"

import { useEffect, useState } from "react"
import { ChevronDownIcon, ClipboardListIcon, SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { fmtDate } from "@/domain/dates"
import type { Family, ID } from "@/domain/types"
import { pullCustomFormResponses, sendCustomForm } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { ResponseAnswers } from "./form-builder"
import { useSendForm } from "./send-form"

/**
 * The family panel's forms (owner 2026-10-22: custom-form answers belong to a family) — what this family answered,
 * and "ส่งฟอร์ม" to send one of the company's forms (through LINE when the family has a LINE chat; otherwise the link
 * is copied to send yourself).
 */
export function FamilyForms({ family }: { family: Family }) {
  const forms = useStore((s) => s.formDefs)
  const all = useStore((s) => s.formResponses)
  const conv = useStore((s) => s.conversations.find((c) => c.familyId === family.id))
  const branchId = useStore((s) => s.students.find((x) => x.familyId === family.id)?.branchId ?? s.branchId)
  const [open, setOpen] = useState<ID | null>(null)
  const [sending, setSending] = useState(false)
  useEffect(() => { pullCustomFormResponses() }, [])
  const mine = all.filter((r) => r.familyId === family.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  const sendable = forms.filter((f) => f.kind === "custom" && f.active)
  const sender = useSendForm(branchId, async (form, offers) => {
    setSending(true)
    const r = await sendCustomForm(form, { id: family.id, branchId, conversationId: conv?.id }, offers)
    setSending(false)
    if (r.ok && !r.value.sent) navigator.clipboard?.writeText(r.value.url).catch(() => undefined)
    report(r, (v) => (v.sent ? tx("ส่ง “{0}” ทาง LINE แล้ว", [form.name]) : tx("คัดลอกลิงก์ “{0}” แล้ว — ครอบครัวนี้ยังไม่มีแชท LINE ส่งลิงก์เองได้", [form.name])))
  })
  return (
    <section className="space-y-2">
      {sender.dialog}
      <div className="flex items-center">
        <h3 className="text-sm font-semibold">{tx("ฟอร์ม")} ({mine.length})</h3>
        {sendable.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="xs" variant="ghost" className="ml-auto" disabled={sending} />}><SendIcon /> {tx("ส่งฟอร์ม")} <ChevronDownIcon className="text-muted-foreground" /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuGroup>
                <DropdownMenuLabel>{conv?.id.startsWith("line_") ? tx("ส่งทาง LINE ถึงครอบครัวนี้") : tx("ยังไม่มีแชท LINE — จะคัดลอกลิงก์ให้")}</DropdownMenuLabel>
                {sendable.map((f) => <DropdownMenuItem key={f.id} onClick={() => sender.start(f)}><ClipboardListIcon />{f.name}</DropdownMenuItem>)}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <ul className="divide-y rounded-2xl border">
        {mine.map((r) => {
          const form = forms.find((f) => f.id === r.formId)
          return (
            <li key={r.id}>
              <button type="button" onClick={() => setOpen(open === r.id ? null : r.id)} className="flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-muted/40">
                <ClipboardListIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate font-medium">{form?.name ?? tx("ฟอร์มที่ถูกลบแล้ว")}</span>
                <span className="text-xs text-muted-foreground">{fmtDate(r.submittedAt.slice(0, 10))}</span>
                <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open === r.id && "rotate-180")} />
              </button>
              {open === r.id && form && <div className="border-t bg-muted/30 px-3 py-3"><ResponseAnswers form={form} r={r} /></div>}
            </li>
          )
        })}
        {mine.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">{tx("ยังไม่เคยตอบฟอร์ม")}</li>}
      </ul>
    </section>
  )
}
