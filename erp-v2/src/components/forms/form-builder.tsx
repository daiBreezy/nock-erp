"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlignLeftIcon, CalendarIcon, CheckSquareIcon, ChevronDownIcon, CircleDotIcon, ClockIcon, CopyIcon, DownloadIcon, FileCheckIcon,
  ChevronsRightIcon, EyeIcon, GaugeIcon, GripVerticalIcon, HashIcon, HeadingIcon, ImageIcon, LinkIcon, ListIcon, LockIcon, MailIcon, MapPinIcon, RepeatIcon, ServerIcon, PaperclipIcon, PhoneIcon, PlusIcon, SmileIcon, ThumbsUpIcon, Trash2Icon, TypeIcon, XIcon,
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
import type { CustomFormResponse, FormAnswer, FormDef, FormField, FormFieldType, GroupEntry, ID } from "@/domain/types"
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
  single: CircleDotIcon, multi: CheckSquareIcon, dropdown: ListIcon, yesno: ThumbsUpIcon, nps: GaugeIcon, scale5: SmileIcon, file: PaperclipIcon, image: ImageIcon, consent: FileCheckIcon, page: ChevronsRightIcon, address: MapPinIcon,
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
  // a new key starts the preview over (first step, no answers)
  const [run, setRun] = useState(0)
  // preview: ถัดไป without filling in (owner 2026-10-22) — switch on to test the checks
  const [checks, setChecks] = useState(false)
  // drag & drop: the field being dragged and the one it's over
  const [drag, setDrag] = useState<ID | null>(null)
  const [over, setOver] = useState<ID | null>(null)
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
              <label className="flex items-center gap-2 text-sm"><Switch checked={!!d.review} onCheckedChange={(v) => setD((x) => ({ ...x, review: v || undefined }))} />{tx("มีขั้นตรวจสอบคำตอบก่อนส่ง")}<InfoTip text={tx("ขั้นสุดท้ายแสดงคำตอบทั้งหมด กด “แก้” กลับไปขั้นนั้นได้ — เหมือนฟอร์ม Test / Trial")} /></label>
            </div>
          </SettingsCard>

          <div className="flex items-center gap-2">
            <h2 className="font-semibold">{tx("คำถาม")}</h2>
            <span className="text-xs text-muted-foreground">{tx("{0} ข้อ", [FB.visibleFields(d).filter(FB.answerable).length])}</span>
            <div className="ml-auto"><AddMenu onAdd={add} /></div>
          </div>
          <ol className="space-y-2">
            {d.fields.map((f, i) => (
              <FieldCard key={f.id} f={f} open={sel === f.id} error={errOf(f.id)} before={d.fields.slice(0, i)} inGroup={!!FB.groupOf(d, f.id)}
                dragging={drag === f.id} dropHere={!!drag && over === f.id && drag !== f.id} dropBelow={d.fields.findIndex((x) => x.id === drag) < i}
                onDragStart={() => setDrag(f.id)} onDragEnter={() => setOver(f.id)} onDragEnd={() => { setDrag(null); setOver(null) }}
                onDrop={() => { if (drag) setD((x) => ({ ...x, fields: FB.moveFieldTo(x.fields, drag, f.id) })); setDrag(null); setOver(null) }}
                onOpen={() => setSel(sel === f.id ? null : f.id)} onChange={(p) => patch(f.id, p)} onCopy={() => copy(f.id)} onRemove={() => remove(f.id)} />
            ))}
          </ol>
          <AddMenu onAdd={add} wide />
        </div>

        {/* the parent's view, live — try it out (nothing is sent) */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="mb-2 flex items-center gap-2 text-sm"><span className="font-medium">{tx("ตัวอย่างที่ผู้ปกครองเห็น")}</span><InfoTip text={tx("ลองกรอกได้ — ไม่มีอะไรถูกส่ง · กดคำถามเพื่อแก้ข้อนั้น")} />
            <label className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground"><Switch size="sm" checked={checks} onCheckedChange={setChecks} />{tx("ตรวจว่าตอบครบ")}</label></div>
          <div className="mx-auto max-w-sm rounded-[2rem] border-8 border-foreground/80 bg-background shadow-lg">
            <div className="max-h-[70vh] overflow-y-auto p-4">
              <FormRenderer key={`${run}${checks}`} form={d} answers={answers} highlight={sel} onPick={setSel} onChange={setAnswers} skipChecks={!checks}
                onSubmit={() => report({ ok: true, value: undefined }, checks ? tx("ลองส่งผ่าน — ครบทุกข้อ (ไม่ได้ส่งจริง)") : tx("ลองส่งแล้ว (ไม่ได้ส่งจริง)"))} />
              <button type="button" className="mt-3 w-full text-center text-xs text-muted-foreground hover:underline" onClick={() => { setAnswers({}); setRun((n) => n + 1) }}>{tx("ล้างคำตอบที่ลองกรอก")}</button>
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
function FieldCard({ f, open, error, before, inGroup, dragging, dropHere, dropBelow, onDragStart, onDragEnter, onDragEnd, onDrop, onOpen, onChange, onCopy, onRemove }: {
  f: FormField; open: boolean; error?: string
  /** the questions above it (for "แสดงเมื่อ") · whether it sits in a repeating group */
  before: FormField[]; inGroup: boolean
  /** drag & drop (owner 2026-10-22: the handle on the left, instead of ↑ ↓) */
  dragging: boolean; dropHere: boolean; dropBelow: boolean
  onDragStart: () => void; onDragEnter: () => void; onDragEnd: () => void; onDrop: () => void
  onOpen: () => void; onChange: (p: Partial<FormField>) => void; onCopy: () => void; onRemove: () => void
}) {
  // only the handle starts a drag (text in the card stays selectable)
  const [handle, setHandle] = useState(false)
  const Icon = FIELD_ICON[f.type]
  const locked = !!f.lock
  return (
    <li draggable={handle} onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart() }} onDragEnd={() => { setHandle(false); onDragEnd() }}
      onDragEnter={onDragEnter} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); setHandle(false); onDrop() }}
      className={cn("relative rounded-2xl bg-card ring-1 ring-foreground/10 transition-shadow", f.type === "page" && "bg-muted/60", inGroup && "ml-6", open && "shadow-md ring-foreground/25", error && "ring-red-400", f.hidden && "opacity-60", dragging && "opacity-40")}>
      {dropHere && <span className={cn("absolute inset-x-2 h-0.5 rounded-full bg-foreground/60", dropBelow ? "-bottom-1.5" : "-top-1.5")} />}
      <div className="flex items-center gap-2 px-2 py-2.5">
        <span onMouseDown={() => setHandle(true)} onMouseUp={() => setHandle(false)} className="grid h-8 w-5 shrink-0 cursor-grab place-items-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground active:cursor-grabbing" aria-label={tx("ลากเพื่อจัดลำดับ")}><GripVerticalIcon className="size-4" /></span>
        <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"><Icon className="size-4" /></span>
          <span className="min-w-0">
            <span className={cn("block truncate text-sm", f.type === "section" || f.type === "page" ? "font-semibold" : "font-medium", !f.label && "text-muted-foreground")}>{f.label || tx(f.type === "section" || f.type === "page" ? "หัวข้อ (ยังไม่ใส่)" : "คำถาม (ยังไม่ใส่)")}{f.required && FB.answerable(f) && <span className="text-red-600"> *</span>}</span>
            <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">{tx(FB.typeInfo(f.type).label)}
              {f.repeat && <span className="inline-flex items-center gap-0.5"><RepeatIcon className="size-3" />{tx("เพิ่มได้ {0} ชุด", [f.repeat.max])}</span>}
              {f.bind && <span className="inline-flex items-center gap-0.5"><LinkIcon className="size-3" />{tx(FB.BINDS.find((b) => b.key === f.bind)?.label ?? "")}</span>}
              {f.source && <span className="inline-flex items-center gap-0.5"><ServerIcon className="size-3" />{tx(FB.SOURCE_LABEL[f.source])}</span>}
              {f.showIf && <span className="inline-flex items-center gap-0.5"><EyeIcon className="size-3" />{tx("แสดงเมื่อ “{0}”", [f.showIf.value])}</span>}
              {f.lock === "core" && <span className="inline-flex items-center gap-0.5"><LockIcon className="size-3" />{tx("ระบบต้องใช้")}</span>}
              {f.lock === "optional" && <span>· {f.hidden ? tx("ซ่อนอยู่") : tx("ช่องเสริมของระบบ")}</span>}
              {error && <span className="text-red-600">· {tx(error)}</span>}
            </span>
          </span>
        </button>
        {FB.canHide(f) && <Switch checked={!f.hidden} onCheckedChange={(v) => onChange({ hidden: !v })} aria-label={tx("แสดงในฟอร์ม")} />}
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
          {FB.hasOptions(f.type) && !f.source && <OptionsEditor f={f} onChange={onChange} />}
          <FieldExtras f={f} before={before} inGroup={inGroup} onChange={onChange} />
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

/** owner 2026-10-22 round 2: what makes a question work like the ERP's own forms */
function FieldExtras({ f, before, inGroup, onChange }: { f: FormField; before: FormField[]; inGroup: boolean; onChange: (p: Partial<FormField>) => void }) {
  const targets = before.filter((x) => (FB.hasOptions(x.type) || x.type === "yesno") && !x.hidden)
  const target = targets.find((x) => x.id === f.showIf?.field)
  const valuesOf = (x?: FormField) => (!x ? [] : x.type === "yesno" ? ["ใช่", "ไม่ใช่"] : [...(x.options ?? []), ...(x.allowOther ? ["อื่นๆ"] : [])])
  const binds = FB.BINDS.filter((b) => b.types.includes(f.type) && (!b.child || inGroup))
  // a step has none of these
  if (f.type === "page") return null
  return (
    <div className="grid gap-3 rounded-xl bg-muted/40 p-3 sm:grid-cols-2">
      {f.type === "section" && (
        <div className="space-y-2 sm:col-span-2">
          <label className="flex items-center gap-2 text-sm"><Switch checked={!!f.repeat} onCheckedChange={(v) => onChange({ repeat: v ? { add: tx("เพิ่มอีกชุด"), max: 5 } : undefined })} />{tx("ให้คำถามใต้หัวข้อนี้เพิ่มได้หลายชุด")}<InfoTip text={tx("เช่น ข้อมูลนักเรียน — ผู้ปกครองกด “+ เพิ่มนักเรียน” ได้ · คำถามที่อยู่ใต้หัวข้อนี้ (จนถึงหัวข้อหรือขั้นถัดไป) จะเป็นหนึ่งชุด")} /></label>
          {f.repeat && (
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem]">
              <div><p className="mb-1 text-xs text-muted-foreground">{tx("ข้อความปุ่มเพิ่ม")}</p><Input value={f.repeat.add} onChange={(e) => onChange({ repeat: { ...f.repeat!, add: e.target.value } })} /></div>
              <div><p className="mb-1 text-xs text-muted-foreground">{tx("เพิ่มได้สูงสุด")}</p><Input type="number" min={1} max={20} value={f.repeat.max} onChange={(e) => onChange({ repeat: { ...f.repeat!, max: Math.max(1, Math.min(20, Number(e.target.value) || 1)) } })} /></div>
            </div>
          )}
        </div>
      )}
      {FB.answerable(f) && binds.length > 0 && (
        <div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><LinkIcon className="size-3" />{tx("ผูกกับข้อมูลในระบบ")}<InfoTip text={tx("ตอนส่ง ระบบใส่ข้อมูลเดิมให้ · ผู้ปกครองแก้แล้วส่ง ข้อมูลครอบครัว / นักเรียนอัปเดตตาม (ข้อมูลลูกต้องอยู่ในกลุ่มที่เพิ่มได้หลายชุด)")} /></p>
          <NativeSelect className="w-full bg-background" value={f.bind ?? ""} placeholder={tx("ไม่ผูก")} onChange={(e) => onChange({ bind: (e.target.value || undefined) as FormField["bind"] })} options={binds.map((b) => ({ value: b.key, label: tx(b.label) }))} /></div>
      )}
      {FB.hasOptions(f.type) && (
        <div><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><ServerIcon className="size-3" />{tx("ตัวเลือกมาจาก")}</p>
          <NativeSelect className="w-full bg-background" value={f.source ?? ""} placeholder={tx("พิมพ์เอง")} onChange={(e) => onChange({ source: (e.target.value || undefined) as FormField["source"], options: e.target.value ? [] : f.options?.length ? f.options : ["ตัวเลือก 1", "ตัวเลือก 2"] })}
            options={(Object.keys(FB.SOURCE_LABEL) as NonNullable<FormField["source"]>[]).map((k) => ({ value: k, label: tx(FB.SOURCE_LABEL[k]) }))} /></div>
      )}
      {(
        <div className={cn(f.type === "section" && "sm:col-span-2")}><p className="mb-1 flex items-center gap-1 text-xs text-muted-foreground"><EyeIcon className="size-3" />{tx("แสดงเมื่อ")}</p>
          {targets.length ? (
            <div className="flex gap-2">
              <NativeSelect className="min-w-0 flex-1 bg-background" value={f.showIf?.field ?? ""} placeholder={tx("แสดงเสมอ")} onChange={(e) => { const t = targets.find((x) => x.id === e.target.value); onChange({ showIf: t ? { field: t.id, value: valuesOf(t)[0] ?? "" } : undefined }) }}
                options={targets.map((x) => ({ value: x.id, label: x.label || tx("คำถาม (ยังไม่ใส่)") }))} />
              {target && <NativeSelect className="w-36 bg-background" value={f.showIf!.value} onChange={(e) => onChange({ showIf: { field: target.id, value: e.target.value } })} options={valuesOf(target).map((v) => ({ value: v, label: v }))} />}
            </div>
          ) : <p className="text-xs text-muted-foreground">{tx("ใส่คำถามแบบเลือกไว้ข้างบนก่อน")}</p>}
        </div>
      )}
    </div>
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
  const qs = FB.visibleFields(form).filter(FB.answerable)
  // a question in a repeating group: every entry's answer, " / " between them
  const cell = (q: FormField, r: CustomFormResponse) => FB.valuesIn(form, q, r).map((v) => FB.answerText(q, v)).join(" / ")
  const fam = (id: ID) => nm(families.find((f) => f.id === id)?.name ?? "—")
  const download = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const head = [tx("ครอบครัว"), tx("สาขา"), tx("วันที่ตอบ"), ...qs.map((q) => q.label)]
    const lines = rs.map((r) => [fam(r.familyId), branches.find((b) => b.id === r.branchId)?.name ?? "", r.submittedAt.slice(0, 10), ...qs.map((q) => cell(q, r))])
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
        {qs.map((q) => <SummaryCard key={q.id} q={q} rs={rs} form={form} />)}
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
                {qs.slice(0, 3).map((q) => <td key={q.id} className="max-w-48 truncate">{cell(q, r)}</td>)}
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

/** every question with its answer, step by step (a repeating group: one block per entry) — the family panel shows the same */
export function ResponseAnswers({ form, r }: { form: FB.FormShape; r: Pick<CustomFormResponse, "answers"> }) {
  return (
    <div className="space-y-3 text-sm">{FB.layout(form).map((p, i) => (
      <div key={i} className="space-y-2">
        {FB.layout(form).length > 1 && <p className="text-xs font-semibold">{p.title}</p>}
        <dl className="space-y-2">{p.items.map((it) => it.kind === "field" ? (
          FB.answerable(it.field) && FB.isShown(it.field, r.answers) ? <div key={it.field.id}><dt className="text-xs text-muted-foreground">{it.field.label}</dt><dd className="whitespace-pre-line">{FB.answerText(it.field, r.answers[it.field.id])}</dd></div> : null
        ) : ((Array.isArray(r.answers[it.section.id]) ? r.answers[it.section.id] : []) as GroupEntry[]).map((en, k) => (
          <div key={`${it.section.id}${k}`} className="space-y-1.5 rounded-xl bg-muted/50 p-2">
            <p className="text-xs font-medium">{it.section.label} {k + 1}</p>
            {it.fields.filter((f) => FB.answerable(f) && FB.isShown(f, en, r.answers)).map((f) => <div key={f.id}><dt className="text-xs text-muted-foreground">{f.label}</dt><dd>{FB.answerText(f, en[f.id])}</dd></div>)}
          </div>
        )))}</dl>
      </div>
    ))}</div>
  )
}

function SummaryCard({ q, rs, form }: { q: FormField; rs: CustomFormResponse[]; form: FormDef }) {
  const s = FB.summarizeField(q, rs, form)
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
