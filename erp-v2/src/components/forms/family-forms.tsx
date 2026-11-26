"use client"

import { useEffect, useState } from "react"
import { ChevronDownIcon, ClipboardListIcon, SendIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { isNewcomer } from "@/domain/rules/form-hub"
import type { Family, ID } from "@/domain/types"
import { pullCustomFormResponses, sendCustomForm, sendEnrollToChat } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"
import { FormCard, type FormActions } from "./form-card"
import { useFormItems } from "./use-form-items"
import { useSendForm } from "./send-form"

/**
 * owner 2026-11-26 — "ฟอร์มทั้งหมด": every form sent to this family as one card each (open ones first, finished ones after) + "ส่งฟอร์ม"
 * for the company's own forms and an Enroll Form without an invoice. (An Enroll Form WITH an invoice is made from "ออกใบแจ้งหนี้ ⌄".)
 */
export function FamilyForms({ family, actions }: { family: Family; actions?: FormActions }) {
  const forms = useStore((s) => s.formDefs)
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const conv = useStore((s) => s.conversations.find((c) => c.familyId === family.id))
  const branchId = useStore((s) => s.students.find((x) => x.familyId === family.id)?.branchId ?? s.branchId)
  const [sending, setSending] = useState(false)
  useEffect(() => { pullCustomFormResponses() }, [])
  const { items, subs, reload } = useFormItems(family)
  const sendable = forms.filter((f) => f.kind === "custom" && f.active)
  const newcomer = students.some((k) => k.familyId === family.id && !k.archived && isNewcomer(k.id, invoices))
  const sender = useSendForm(branchId, async (form, offers) => {
    setSending(true)
    const r = await sendCustomForm(form, { id: family.id, branchId, conversationId: conv?.id }, offers)
    setSending(false)
    if (r.ok && !r.value.sent) navigator.clipboard?.writeText(r.value.url).catch(() => undefined)
    report(r, (v) => (v.sent ? tx("ส่ง “{0}” ทาง LINE แล้ว", [form.name]) : tx("คัดลอกลิงก์ “{0}” แล้ว — ส่งให้ผู้ปกครองเอง", [form.name])))
  })
  const sendEnrollOnly = async () => {
    if (!conv) return
    setSending(true)
    const r = await sendEnrollToChat(conv.id, [], undefined, undefined)
    setSending(false)
    if (report(r, tx("ส่งใบสมัครเรียนแล้ว"))) reload()
  }
  const canSend = sendable.length > 0 || newcomer
  return (
    <section className="space-y-2">
      {sender.dialog}
      <div className="flex items-center">
        <h3 className="text-sm font-semibold">{tx("ฟอร์มทั้งหมด")} ({items.length})</h3>
        {canSend && (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" className="ml-auto" disabled={sending} />}><SendIcon /> {tx("ส่งฟอร์ม")} <ChevronDownIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              {sendable.length > 0 && (
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{conv?.id.startsWith("line_") ? tx("ส่งทาง LINE ถึงครอบครัวนี้") : tx("ยังไม่มีแชท LINE — จะคัดลอกลิงก์ให้")}</DropdownMenuLabel>
                  {sendable.map((f) => <DropdownMenuItem key={f.id} onClick={() => sender.start(f)}><ClipboardListIcon />{f.name}</DropdownMenuItem>)}
                </DropdownMenuGroup>
              )}
              {sendable.length > 0 && newcomer && <DropdownMenuSeparator />}
              {newcomer && <DropdownMenuItem disabled={!conv} onClick={sendEnrollOnly}><UserPlusIcon />{tx("ใบสมัครเรียน (ไม่ผูกใบแจ้งหนี้)")}</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div className="space-y-2">
        {items.map((it) => <FormCard key={it.key} item={it} family={family} sub={subs.find((x) => x.id === it.subId)} actions={actions} />)}
        {items.length === 0 && <p className="rounded-2xl border p-4 text-center text-xs text-muted-foreground">{tx("ยังไม่เคยส่งฟอร์มให้ครอบครัวนี้")}</p>}
      </div>
    </section>
  )
}
