"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlignLeftIcon, ArrowDownIcon, ArrowUpIcon, CalendarIcon, CheckSquareIcon, ChevronDownIcon, CircleDotIcon, ClockIcon, CopyIcon, DownloadIcon, FileCheckIcon,
  GaugeIcon, HashIcon, HeadingIcon, ImageIcon, ListIcon, LockIcon, MailIcon, PaperclipIcon, PhoneIcon, PlusIcon, SmileIcon, ThumbsUpIcon, Trash2Icon, TypeIcon, XIcon,
} from "lucide-react"
import { Pill } from "@/components/app/badges"
import { EntityPanel, PanelBody, PanelFooter, PanelMore } from "@/components/app/form-shell"
import { NativeSelect } from "@/components/app/native-select"
import { HEAD, ROW } from "@/components/app/data-table"
import { Empty, InfoTip, ShareBar, TopList } from "@/components/reports/charts"
import { SettingsCard } from "@/components/settings/common"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate } from "@/domain/dates"
import * as FB from "@/domain/rules/form-builder"
import type { CustomFormResponse, FormAnswer, FormDef, FormField, FormFieldType, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { nm, tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { FormRenderer } from "./form-renderer"
import { uid } from "@/data/seed"
import { pullCustomFormResponses } from "@/lib/forms"

/** one icon per kind of question */
export const FIELD_ICON: Record<FormFieldType, typeof TypeIcon> = {
  section: HeadingIcon, text: TypeIcon, textarea: AlignLeftIcon, number: HashIcon, date: CalendarIcon, time: ClockIcon, phone: PhoneIcon, email: MailIcon,
  single: CircleDotIcon, multi: CheckSquareIcon, dropdown: ListIcon, yesno: ThumbsUpIcon, nps: GaugeIcon, scale5: SmileIcon, file: PaperclipIcon, image: ImageIcon, consent: FileCheckIcon,
}

// ---------------- Settings › System › ฟอร์ม: every form ----------------

/** owner 2026-10-22: the forms list — the ERP's own forms (tune them) and the company's own (build them) */
export function FormsList() {
  const router = useRouter()
  const forms = useStore((s) => s.formDefs)
  const responses = useStore((s) => s.formResponses)
  const saveForm = useStore((s) => s.saveForm)
  const now = useStore((s) => s.now)
  const userId = useStore((s) => s.userId)
  useEffect(() => { pullCustomFormResponses() }, [])
  const create = () => {
    const f = { ...FB.newForm(uid("fm"), now().toISOString(), userId), name: tx("ฟอร์มใหม่") }
    const r = saveForm(f)
    if (report(r, tx("สร้างฟอร์มแล้ว"))) router.push(`/settings/forms/${r.value.id}`)
  }
  const sorted = [...forms].sort((a, b) => (a.kind === b.kind ? b.updatedAt.localeCompare(a.updatedAt) : a.kind === "custom" ? -1 : 1))
  return (
    <SettingsCard title={tx("ฟอร์ม")} hint={tx("สร้างฟอร์มของบริษัทเอง เลือกคำถามได้ทุกแบบ · ฟอร์มของระบบปรับได้ (ช่องที่ระบบต้องใช้ล็อกไว้)")}
      action={<Button size="sm" onClick={create}><PlusIcon /> {tx("สร้างฟอร์ม")}</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={HEAD}><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-normal">
            <th>{tx("ฟอร์ม")}</th><th>{tx("ประเภท")}</th><th className="text-right!">{tx("คำถาม")}</th><th className="text-right!">{tx("คำตอบ")}</th><th>{tx("แก้ไขล่าสุด")}</th><th>{tx("สถานะ")}</th>
          </tr></thead>
          <tbody>{sorted.map((f) => {
            const n = FB.visibleFields(f).filter(FB.answerable).length
            const answers = f.kind === "custom" ? responses.filter((r) => r.formId === f.id).length : null
            return (
              <tr key={f.id} className={ROW} onClick={() => router.push(`/settings/forms/${f.id}`)}>
                <td className="max-w-80"><p className="truncate font-medium">{f.name}</p>{f.description && <p className="truncate text-xs text-muted-foreground">{f.description}</p>}</td>
                <td>{f.kind === "system" ? <Pill tone="blue"><LockIcon className="size-3" />{tx("ระบบ")}</Pill> : <Pill tone="violet">{tx("สร้างเอง")}</Pill>}</td>
                <td className="text-right tabular-nums">{n}</td>
                <td className="text-right tabular-nums">{answers ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="whitespace-nowrap text-muted-foreground">{fmtDate(f.updatedAt.slice(0, 10))}</td>
                <td>{f.active ? <Pill tone="green">{tx("ใช้งาน")}</Pill> : <Pill>{tx("ปิดไว้")}</Pill>}</td>
              </tr>
            )
          })}</tbody>
        </table>
      </div>
    </SettingsCard>
  )
}

// ---------------- the builder ----------------

/** owner 2026-10-22: build / tune one form — questions on the left, the parent's view live on the right */
export function FormBuilder({ form }: { form: FormDef }) {
  const router = useRouter()
  const saveForm = useStore((s) => s.saveForm)
  const deleteForm = useStore((s) => s.deleteForm)
  const duplicateForm = useStore((s) => s.duplicateForm)
  const [d, setD] = useState<FormDef>(form)
  const [sel, setSel] = useState<ID | null>(form.fields.find((x) => !x.lock)?.id ?? null)
  const [answers, setAnswers] = useState<Record<ID, FormAnswer>>({})
  const [tryErrs, setTryErrs] = useState<Record<ID, string>>({})
  const dirty = JSON.stringify(d) !== JSON.stringify(form)
  const errs = FB.validateForm(d)
  const errOf = (id: ID) => errs.find((e) => e.field === id)?.message
  const sys = d.kind === "system"

  const patch = (id: ID, p: Partial<FormField>) => setD((x) => ({ ...x, fields: x.fields.map((f) => (f.id === id ? { ...f, ...p } : f)) }))
  const add = (type: FormFieldType) => {
    const f = FB.newField(type)
    setD((x) => {
      const i = sel ? x.fields.findIndex((y) => y.id === sel) : -1
      const fields = [...x.fields]; fields.splice(i < 0 ? fields.length : i + 1, 0, f)
      return { ...x, fields }
    })
    setSel(f.id)
  }
  const remove = (id: ID) => { setD((x) => ({ ...x, fields: x.fields.filter((f) => f.id !== id) })); if (sel === id) setSel(null) }
  const copy = (id: ID) => setD((x) => {
    const i = x.fields.findIndex((f) => f.id === id); const f = { ...x.fields[i], id: FB.fieldId(), lock: undefined, hidden: undefined }
    const fields = [...x.fields]; fields.splice(i + 1, 0, f); setSel(f.id)
    return { ...x, fields }
  })
  const save = () => { const r = saveForm(d); if (report(r, tx("บันทึกฟอร์มแล้ว"))) setD(r.value) }

  return (
    <div className="pb-24">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-4">
          <SettingsCard title={tx("ข้อมูลฟอร์ม")} hint={sys ? tx("ฟอร์มของระบบ — ช่องที่มีกุญแจคือข้อมูลที่ระบบต้องใช้ แก้ / ซ่อนไม่ได้ · ช่องเสริมซ่อนได้ · เพิ่มคำถามของบริษัทได้") : undefined}
            action={!sys ? <label className="flex items-center gap-2 text-sm">{tx("ใช้งาน")}<Switch checked={d.active} onCheckedChange={(v) => setD((x) => ({ ...x, active: v }))} /></label> : undefined}>
            <div className="space-y-3">
              <div><p className="mb-1 text-xs text-muted-foreground">{tx("ชื่อฟอร์ม")} *</p><Input value={d.name} disabled={sys} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} aria-invalid={!d.name.trim()} /></div>
              <div><p className="mb-1 text-xs text-muted-foreground">{tx("คำอธิบาย (ขึ้นใต้ชื่อฟอร์ม)")}</p><Textarea rows={2} value={d.description ?? ""} onChange={(e) => setD((x) => ({ ...x, description: e.target.value }))} /></div>
            </div>
          </SettingsCard>

          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{tx("คำถาม")}</h2>
            <span className="text-xs text-muted-foreground">{tx("{0} ข้อ", [FB.visibleFields(d).filter(FB.answerable).length])}</span>
            <div className="ml-auto"><AddMenu onAdd={add} /></div>
          </div>
          <ol className="space-y-2">
            {d.fields.map((f, i) => (
              <FieldCard key={f.id} f={f} index={i} total={d.fields.length} open={sel === f.id} error={errOf(f.id)}
                onOpen={() => setSel(sel === f.id ? null : f.id)} onChange={(p) => patch(f.id, p)}
                onMove={(by) => setD((x) => ({ ...x, fields: FB.moveField(x.fields, f.id, by) }))} onCopy={() => copy(f.id)} onRemove={() => remove(f.id)} />
            ))}
          </ol>
          <AddMenu onAdd={add} wide />
        </div>

        {/* the parent's view, live — try it out (nothing is sent) */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 flex items-center gap-2 text-sm"><span className="font-medium">{tx("ตัวอย่างที่ผู้ปกครองเห็น")}</span><InfoTip text={tx("ลองกรอกได้ — ไม่มีอะไรถูกส่ง · กดคำถามเพื่อแก้ข้อนั้น")} /></div>
          <div className="mx-auto max-w-sm rounded-[2rem] border-8 border-foreground/80 bg-background shadow-lg">
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <FormRenderer form={d} answers={answers} errors={tryErrs} highlight={sel} onPick={setSel} onChange={(id, v) => { setAnswers((a) => ({ ...a, [id]: v })); setTryErrs((e) => { const n = { ...e }; delete n[id]; return n }) }} />
              <Button className="mt-5 w-full" onClick={() => { const e = FB.validateAnswers(d, answers); setTryErrs(e); report(Object.keys(e).length ? { ok: false, error: tx("ยังตอบไม่ครบ {0} ข้อ", [Object.keys(e).length]) } : { ok: true, value: undefined }, tx("ลองส่งผ่าน — ครบทุกข้อ (ไม่ได้ส่งจริง)")) }}>{tx("ส่งคำตอบ")}</Button>
              <button type="button" className="mt-2 w-full text-center text-xs text-muted-foreground hover:underline" onClick={() => { setAnswers({}); setTryErrs({}) }}>{tx("ล้างคำตอบที่ลองกรอก")}</button>
            </div>
          </div>
        </div>
      </div>

      {/* bottom bar: negative actions in ⋯, save on the right (panel standard) */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur md:left-[var(--sidebar-width,0px)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 md:px-6">
          <PanelMore items={[
            { label: tx("ทำสำเนาเป็นฟอร์มใหม่"), icon: CopyIcon, onClick: () => { const r = duplicateForm(d.id); if (report(r, tx("ทำสำเนาแล้ว"))) router.push(`/settings/forms/${r.value.id}`) } },
            !sys && { label: tx("ลบฟอร์ม"), icon: Trash2Icon, destructive: true, onClick: () => { if (confirm(tx("ลบฟอร์ม “{0}”? คำตอบที่เคยได้ยังดูได้ที่หน้าครอบครัว", [d.name]))) { if (report(deleteForm(d.id), tx("ลบฟอร์มแล้ว"))) router.push("/settings?view=system&sys=forms") } } },
          ]} />
          <p className={cn("text-sm", errs.length ? "text-red-600" : "text-muted-foreground")}>
            {errs.length ? tx("ต้องแก้ {0} จุดก่อนบันทึก — {1}", [errs.length, tx(errs[0].message)]) : dirty ? tx("ยังไม่ได้บันทึก") : tx("บันทึกแล้ว")}
          </p>
          <div className="ml-auto flex gap-2">
            {dirty && <Button variant="ghost" onClick={() => setD(form)}>{tx("ยกเลิกการแก้")}</Button>}
            <Button disabled={!dirty} onClick={save}>{tx("บันทึก")}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddMenu({ onAdd, wide }: { onAdd: (t: FormFieldType) => void; wide?: boolean }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size={wide ? "default" : "sm"} className={cn(wide && "w-full border-dashed")} />}><PlusIcon /> {tx("เพิ่มคำถาม")} <ChevronDownIcon className="text-muted-foreground" /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="max-h-[70vh] w-64 overflow-y-auto">
        {FB.FIELD_GROUPS.map((g, gi) => (
          <DropdownMenuGroup key={g.id}>
            {gi > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{tx(g.label)}</DropdownMenuLabel>
            {FB.FIELD_TYPES.filter((t) => t.group === g.id).map((t) => {
              const Icon = FIELD_ICON[t.type]
              return <DropdownMenuItem key={t.type} onClick={() => onAdd(t.type)}><Icon /><span className="flex-1">{tx(t.label)}</span><span className="text-[11px] text-muted-foreground">{tx(t.hint)}</span></DropdownMenuItem>
            })}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** one question — a summary line; opened, everything about it */
function FieldCard({ f, index, total, open, error, onOpen, onChange, onMove, onCopy, onRemove }: {
  f: FormField; index: number; total: number; open: boolean; error?: string
  onOpen: () => void; onChange: (p: Partial<FormField>) => void; onMove: (by: -1 | 1) => void; onCopy: () => void; onRemove: () => void
}) {
  const Icon = FIELD_ICON[f.type]
  const locked = !!f.lock
  return (
    <li className={cn("rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow", open && "shadow-md ring-primary/40", error && "ring-red-400", f.hidden && "opacity-60")}>
      <div className="flex items-center gap-2 px-3 py-2.5">
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", f.type === "section" ? "bg-muted" : "bg-primary/10 text-primary")}><Icon className="size-4" /></span>
          <span className="min-w-0">
            <span className={cn("block truncate text-sm", f.type === "section" ? "font-semibold" : "font-medium", !f.label && "text-muted-foreground")}>{f.label || tx(f.type === "section" ? "หัวข้อ (ยังไม่ใส่)" : "คำถาม (ยังไม่ใส่)")}{f.required && f.type !== "section" && <span className="text-red-600"> *</span>}</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">{tx(FB.typeInfo(f.type).label)}
              {f.lock === "core" && <span className="inline-flex items-center gap-0.5"><LockIcon className="size-3" />{tx("ระบบต้องใช้")}</span>}
              {f.lock === "optional" && <span>· {f.hidden ? tx("ซ่อนอยู่") : tx("ช่องเสริมของระบบ")}</span>}
              {error && <span className="text-red-600">· {tx(error)}</span>}
            </span>
          </span>
        </button>
        {FB.canHide(f) && <Switch checked={!f.hidden} onCheckedChange={(v) => onChange({ hidden: !v })} aria-label={tx("แสดงในฟอร์ม")} />}
        <div className="flex shrink-0">
          <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label={tx("เลื่อนขึ้น")}><ArrowUpIcon /></Button>
          <Button size="icon-sm" variant="ghost" disabled={index === total - 1} onClick={() => onMove(1)} aria-label={tx("เลื่อนลง")}><ArrowDownIcon /></Button>
        </div>
      </div>
      {open && !locked && (
        <div className="space-y-3 border-t px-3 py-3">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
            <div><p className="mb-1 text-xs text-muted-foreground">{f.type === "section" ? tx("หัวข้อ") : tx("คำถาม")} *</p><Input autoFocus value={f.label} onChange={(e) => onChange({ label: e.target.value })} aria-invalid={!f.label.trim()} /></div>
            <div><p className="mb-1 text-xs text-muted-foreground">{tx("ชนิด")}</p>
              <NativeSelect className="w-full" value={f.type} onChange={(e) => { const t = e.target.value as FormFieldType; onChange({ type: t, options: FB.hasOptions(t) ? (f.options?.length ? f.options : ["ตัวเลือก 1", "ตัวเลือก 2"]) : undefined, allowOther: FB.hasOptions(t) ? f.allowOther : undefined }) }}
                options={FB.FIELD_TYPES.map((t) => ({ value: t.type, label: tx(t.label) }))} /></div>
          </div>
          <div><p className="mb-1 text-xs text-muted-foreground">{f.type === "section" ? tx("คำอธิบาย") : tx("คำอธิบายใต้คำถาม (ไม่บังคับ)")}</p><Input value={f.help ?? ""} onChange={(e) => onChange({ help: e.target.value || undefined })} /></div>
          {FB.hasOptions(f.type) && <OptionsEditor f={f} onChange={onChange} />}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 text-sm">
            {FB.answerable(f) && <label className="flex items-center gap-2"><Switch checked={f.required} onCheckedChange={(v) => onChange({ required: v })} />{tx("ต้องตอบ")}</label>}
            {(f.type === "single" || f.type === "multi") && <label className="flex items-center gap-2"><Switch checked={!!f.allowOther} onCheckedChange={(v) => onChange({ allowOther: v || undefined })} />{tx("มีช่อง “อื่นๆ”")}</label>}
            <div className="ml-auto flex gap-1">
              <Button size="sm" variant="ghost" onClick={onCopy}><CopyIcon /> {tx("ทำซ้ำ")}</Button>
              {FB.canRemove(f) && <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={onRemove}><Trash2Icon /> {tx("ลบ")}</Button>}
            </div>
          </div>
        </div>
      )}
      {open && locked && (
        <div className="border-t px-3 py-3 text-xs text-muted-foreground">
          {f.lock === "core" ? tx("ช่องนี้ระบบใช้ทำงาน (เช่น สร้างนักเรียน จองคาบ) — แก้ข้อความ / ตัวเลือก / ลบไม่ได้ เลื่อนตำแหน่งได้") : tx("ช่องเสริมของระบบ — ปิดสวิตช์เพื่อไม่ถามในฟอร์ม (ข้อความแก้ไม่ได้)")}
          {f.help && <p className="mt-1">{f.help}</p>}
        </div>
      )}
    </li>
  )
}

function OptionsEditor({ f, onChange }: { f: FormField; onChange: (p: Partial<FormField>) => void }) {
  const opts = f.options ?? []
  const set = (i: number, v: string) => onChange({ options: opts.map((o, j) => (j === i ? v : o)) })
  return (
    <div>
      <p className="mb-1 text-xs text-muted-foreground">{tx("ตัวเลือก")}</p>
      <ul className="space-y-1.5">{opts.map((o, i) => (
        <li key={i} className="flex items-center gap-2">
          <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{i + 1}</span>
          <Input value={o} onChange={(e) => set(i, e.target.value)} aria-invalid={!o.trim()} />
          <Button size="icon-sm" variant="ghost" disabled={opts.length <= 2} onClick={() => onChange({ options: opts.filter((_, j) => j !== i) })} aria-label={tx("ลบตัวเลือก")}><XIcon /></Button>
        </li>
      ))}</ul>
      <Button size="sm" variant="ghost" className="mt-1" onClick={() => onChange({ options: [...opts, tx("ตัวเลือก {0}", [opts.length + 1])] })}><PlusIcon /> {tx("เพิ่มตัวเลือก")}</Button>
    </div>
  )
}

// ---------------- answers of a custom form ----------------

/** owner 2026-10-22: answers belong to a family — a summary per question + every response (download as CSV) */
export function FormResponses({ form }: { form: FormDef }) {
  const all = useStore((s) => s.formResponses)
  const families = useStore((s) => s.families)
  const branches = useStore((s) => s.branches)
  const rs = useMemo(() => all.filter((r) => r.formId === form.id).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)), [all, form.id])
  const [open, setOpen] = useState<CustomFormResponse | null>(null)
  useEffect(() => { pullCustomFormResponses() }, [])
  const qs = form.fields.filter(FB.answerable)
  const fam = (id: ID) => nm(families.find((f) => f.id === id)?.name ?? "—")
  const download = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const head = [tx("ครอบครัว"), tx("สาขา"), tx("วันที่ตอบ"), ...qs.map((q) => q.label)]
    const lines = rs.map((r) => [fam(r.familyId), branches.find((b) => b.id === r.branchId)?.name ?? "", r.submittedAt.slice(0, 10), ...qs.map((q) => FB.answerText(q, r.answers[q.id]))])
    const blob = new Blob(["﻿" + [head, ...lines].map((l) => l.map((x) => esc(String(x))).join(",")).join("\n")], { type: "text/csv;charset=utf-8" })
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${form.name}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  if (!rs.length) return <Empty>{tx("ยังไม่มีคำตอบ — ส่งฟอร์มให้ครอบครัวได้จากหน้าครอบครัว › ส่งฟอร์ม")}</Empty>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm"><span className="text-2xl font-semibold tabular-nums">{rs.length}</span> <span className="text-muted-foreground">{tx("ครอบครัวตอบแล้ว")}</span></p>
        <Button variant="outline" size="sm" className="ml-auto" onClick={download}><DownloadIcon /> {tx("ดาวน์โหลด (.csv)")}</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {qs.map((q) => <SummaryCard key={q.id} q={q} rs={rs} />)}
      </div>
      <SettingsCard title={tx("คำตอบทั้งหมด")} hint={tx("กดแถวเพื่อดูคำตอบครบทุกข้อ")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={HEAD}><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-normal"><th>{tx("ครอบครัว")}</th><th>{tx("สาขา")}</th><th>{tx("วันที่ตอบ")}</th>{qs.slice(0, 3).map((q) => <th key={q.id} className="max-w-48 truncate">{q.label}</th>)}</tr></thead>
            <tbody>{rs.map((r) => (
              <tr key={r.id} className={ROW} onClick={() => setOpen(r)}>
                <td className="font-medium">{fam(r.familyId)}</td>
                <td className="text-muted-foreground">{branches.find((b) => b.id === r.branchId)?.code}</td>
                <td className="whitespace-nowrap text-muted-foreground">{fmtDate(r.submittedAt.slice(0, 10))}</td>
                {qs.slice(0, 3).map((q) => <td key={q.id} className="max-w-48 truncate">{FB.answerText(q, r.answers[q.id])}</td>)}
              </tr>
            ))}</tbody>
          </table>
        </div>
      </SettingsCard>
      <EntityPanel open={!!open} onClose={() => setOpen(null)}>
        {open && <>
          <div className="border-b px-4 py-3"><p className="font-semibold">{fam(open.familyId)}</p><p className="text-xs text-muted-foreground">{form.name} · {fmtDate(open.submittedAt.slice(0, 10))}</p></div>
          <PanelBody><ResponseAnswers form={form} r={open} /></PanelBody>
          <PanelFooter><Button variant="outline" className="ml-auto" onClick={() => setOpen(null)}>{tx("ปิด")}</Button></PanelFooter>
        </>}
      </EntityPanel>
    </div>
  )
}

/** every question with its answer (the family panel shows the same) */
export function ResponseAnswers({ form, r }: { form: Pick<FormDef, "fields">; r: Pick<CustomFormResponse, "answers"> }) {
  return (
    <dl className="space-y-3 text-sm">{form.fields.filter(FB.answerable).map((q) => (
      <div key={q.id}><dt className="text-xs text-muted-foreground">{q.label}</dt><dd className="whitespace-pre-line">{FB.answerText(q, r.answers[q.id])}</dd></div>
    ))}</dl>
  )
}

function SummaryCard({ q, rs }: { q: FormField; rs: CustomFormResponse[] }) {
  const s = FB.summarizeField(q, rs)
  const Icon = FIELD_ICON[q.type]
  return (
    <section className="flex min-w-0 flex-col rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/10 sm:p-5">
      <div className="mb-3 flex items-center gap-2"><Icon className="size-4 shrink-0 text-muted-foreground" /><h3 className="min-w-0 flex-1 truncate font-semibold" title={q.label}>{q.label}</h3><span className="text-xs text-muted-foreground">{tx("ตอบ {0}", [s.kind === "none" ? 0 : s.answered])}</span></div>
      {s.kind === "choice" && <TopList wide top={8} color="var(--color-primary)" rows={s.rows.map((x) => ({ label: x.label, value: x.count }))} />}
      {s.kind === "score" && (
        <div className="space-y-2">
          <p><span className="text-3xl font-semibold tabular-nums">{s.avg === null ? "—" : s.avg.toFixed(1)}</span> <span className="text-sm text-muted-foreground">{tx("เฉลี่ย")} / {q.type === "nps" ? 10 : 5}</span></p>
          <ul className="space-y-1 text-xs">{s.dist.map((c, i) => (
            <li key={i} className="grid grid-cols-[1.5rem_1fr_2rem] items-center gap-2"><span className="text-right tabular-nums text-muted-foreground">{(q.type === "nps" ? 0 : 1) + i}</span><ShareBar value={c / Math.max(1, ...s.dist)} className="h-2" /><span className="text-right tabular-nums">{c}</span></li>
          )).reverse()}</ul>
        </div>
      )}
      {s.kind === "text" && <TextAnswers samples={s.samples} />}
    </section>
  )
}

function TextAnswers({ samples }: { samples: string[] }) {
  const [all, setAll] = useState(false)
  if (!samples.length) return <p className="text-sm text-muted-foreground">{tx("ยังไม่มีคนตอบข้อนี้")}</p>
  return (
    <div>
      <ul className="space-y-1.5 text-sm">{(all ? samples : samples.slice(0, 6)).map((t, i) => <li key={i} className="rounded-xl bg-muted/60 px-3 py-1.5">{t}</li>)}</ul>
      {samples.length > 6 && <button type="button" onClick={() => setAll((a) => !a)} className="mt-2 text-xs text-primary hover:underline">{all ? tx("ย่อ") : tx("ดูทั้งหมด {0} รายการ", [samples.length])}</button>}
    </div>
  )
}
