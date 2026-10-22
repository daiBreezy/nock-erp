"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { CheckIcon, ChevronLeftIcon, ImageIcon, LoaderCircleIcon, PaperclipIcon, PencilIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { OTHER_PREFIX, SCALE5_LABEL, answerText, answerable, entryKey, isShown, layout, validateAnswers, type LayoutItem } from "@/domain/rules/form-builder"
import type { AddressAnswer, FormAnswer, FormDef, FormField, GroupEntry, ID } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

const MapPin = dynamic(() => import("@/app/liff/form/map-pin").then((m) => m.MapPin), { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-2xl bg-muted" /> })

type Answers = Record<ID, FormAnswer>

/**
 * A form as the parent fills it in (owner 2026-10-22: form builder) — the same component draws the builder's live
 * preview and the parent's page in LINE, so what the company designs is exactly what the family sees.
 * Round 2: steps (ถัดไป / ย้อนกลับ) checked one at a time, repeating groups ("+ เพิ่มนักเรียน"), address + map pin,
 * questions shown after a certain answer, and a review step before sending.
 * Field labels are the company's own words (not translated); only the form's own chrome is.
 */
export function FormRenderer({ form, answers, onChange, onSubmit, submitting, highlight, onPick, sticky }: {
  form: Pick<FormDef, "name" | "description" | "fields" | "review">
  answers: Answers
  onChange: (next: Answers) => void
  /** the last step's button — the answers are complete when this is called */
  onSubmit: () => void
  submitting?: boolean
  /** builder: the field being edited is outlined in the preview */
  highlight?: ID | null
  /** builder: clicking a question in the preview selects it in the editor */
  onPick?: (id: ID) => void
  /** parent's page: the buttons sit in a bar at the bottom of the screen */
  sticky?: boolean
}) {
  const pages = layout(form)
  const steps = pages.length + (form.review ? 1 : 0)
  const [at, setAt] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const step = Math.min(at, steps - 1)
  const reviewing = !!form.review && step === pages.length
  const last = step === steps - 1
  const set = (id: ID, v: FormAnswer) => { onChange({ ...answers, [id]: v }); setErrors((e) => { const n = { ...e }; delete n[id]; return n }) }

  const next = () => {
    const errs = reviewing ? validateAnswers(form, answers) : validateAnswers(form, answers, step)
    setErrors(errs)
    if (Object.keys(errs).length) {
      if (reviewing) { const p = pages.findIndex((_, i) => Object.keys(validateAnswers(form, answers, i)).length); setAt(p) }
      setTimeout(() => document.querySelector("[data-form-error]")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50)
      return
    }
    if (last) onSubmit()
    else { setAt(step + 1); setTimeout(() => document.querySelector("[data-form-top]")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50) }
  }
  // question numbers, counted once over the whole form (a group's questions count once, whatever the entries)
  const nums: Record<ID, number> = {}
  let no = 0
  for (const p of pages) for (const it of p.items) for (const f of it.kind === "field" ? [it.field] : it.fields) if (answerable(f)) nums[f.id] = ++no
  const count = (f: FormField) => nums[f.id] ?? 0
  const errCount = Object.keys(errors).length

  const buttons = (
    <div className="flex gap-2">
      {step > 0 && <Button variant="outline" size="lg" onClick={() => setAt(step - 1)} disabled={submitting}><ChevronLeftIcon /> {tx("ย้อนกลับ")}</Button>}
      <Button className="flex-1" size="lg" onClick={next} disabled={submitting}>
        {submitting ? <LoaderCircleIcon className="animate-spin" /> : last ? <SendIcon /> : null}{submitting ? tx("กำลังส่ง…") : last ? tx("ส่งคำตอบ") : tx("ถัดไป")}
      </Button>
    </div>
  )
  return (
    <div className="space-y-4" data-form-top>
      <div>
        <h1 className="text-lg font-semibold leading-snug">{form.name || tx("ชื่อฟอร์ม")}</h1>
        {form.description && step === 0 && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{form.description}</p>}
      </div>
      {steps > 1 && (
        <div>
          <div className="flex gap-1">{Array.from({ length: steps }, (_, i) => <span key={i} className={cn("h-1 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />)}</div>
          <p className="mt-1.5 text-xs text-muted-foreground">{tx("ขั้นที่ {0} / {1}", [step + 1, steps])} · {reviewing ? tx("ตรวจสอบ") : pages[step].title}</p>
        </div>
      )}
      {reviewing ? (
        <Review form={form} answers={answers} onEdit={(i) => setAt(i)} />
      ) : pages[step]?.items.map((it) => (
        <Item key={it.kind === "field" ? it.field.id : it.section.id} it={it} answers={answers} set={set} errors={errors} highlight={highlight} onPick={onPick} count={count} />
      ))}
      {errCount > 0 && <p className="text-center text-xs text-red-600">{tx("ยังตอบไม่ครบ {0} ข้อ", [errCount])}</p>}
      {sticky ? <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 px-4 py-3 backdrop-blur"><div className="mx-auto max-w-md">{buttons}</div></div> : buttons}
    </div>
  )
}

function Item({ it, answers, set, errors, highlight, onPick, count }: {
  it: LayoutItem; answers: Answers; set: (id: ID, v: FormAnswer) => void; errors: Record<string, string>
  highlight?: ID | null; onPick?: (id: ID) => void; count: (f: FormField) => number
}) {
  const pick = (id: ID) => (onPick ? { onClick: (e: React.MouseEvent) => { e.stopPropagation(); onPick(id) } } : {})
  const ring = (id: ID) => cn("rounded-2xl transition-shadow", onPick && "cursor-pointer", highlight === id && "ring-2 ring-primary/50 ring-offset-4 ring-offset-background")
  if (it.kind === "field") {
    const f = it.field
    if (!isShown(f, answers)) return null
    if (f.type === "section") return <div className={ring(f.id)} {...pick(f.id)}><Heading f={f} /></div>
    return <div className={ring(f.id)} {...pick(f.id)}><Question f={f} no={count(f)} v={answers[f.id] ?? null} set={(v) => set(f.id, v)} error={errors[f.id]} /></div>
  }
  // a repeating group: one card per entry, "+ เพิ่ม…" below (up to max)
  const g = it.section
  const entries = (Array.isArray(answers[g.id]) ? answers[g.id] : []) as GroupEntry[]
  const list = entries.length ? entries : [{}]
  const write = (i: number, id: ID, v: FormAnswer) => set(g.id, list.map((en, j) => (j === i ? { ...en, [id]: v } : en)))
  const max = g.repeat?.max ?? 5
  return (
    <div className={ring(g.id)} {...pick(g.id)}>
      <Heading f={g} />
      <div className="mt-3 space-y-3">
        {list.map((en, i) => (
          <div key={i} className="space-y-4 rounded-2xl border p-3">
            <div className="flex items-center">
              <p className="text-sm font-semibold">{g.label} {list.length > 1 && i + 1}</p>
              {list.length > 1 && <Button size="icon-sm" variant="ghost" className="ml-auto text-muted-foreground" aria-label={tx("ลบ")} onClick={(e) => { e.stopPropagation(); set(g.id, list.filter((_, j) => j !== i)) }}><Trash2Icon /></Button>}
            </div>
            {it.fields.map((f) => !isShown(f, en, answers) ? null : f.type === "section" ? <Heading key={f.id} f={f} /> : (
              <div key={f.id} className={ring(f.id)} {...pick(f.id)}>
                <Question f={f} no={count(f)} v={en[f.id] ?? null} set={(v) => write(i, f.id, v)} error={errors[entryKey(g.id, i, f.id)]} />
              </div>
            ))}
          </div>
        ))}
        {errors[g.id] && <p data-form-error className="text-xs text-red-600">{tx(errors[g.id])}</p>}
        {list.length < max && (
          <Button variant="outline" className="w-full border-dashed" onClick={(e) => { e.stopPropagation(); set(g.id, [...list, {}]) }}><PlusIcon /> {g.repeat?.add || tx("เพิ่มอีกชุด")}</Button>
        )}
      </div>
    </div>
  )
}

function Heading({ f }: { f: FormField }) {
  return (
    <div className="border-b pb-1.5 pt-2">
      <p className="font-semibold">{f.label || tx("หัวข้อ")}</p>
      {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
    </div>
  )
}

function Question({ f, no, v, set, error }: { f: FormField; no: number; v: FormAnswer; set: (v: FormAnswer) => void; error?: string }) {
  return (
    <div className="space-y-2" data-form-error={error ? "" : undefined}>
      {f.type !== "consent" && (
        <div>
          <p className="text-sm font-medium">{no}. {f.label || tx("คำถาม")}{f.required && <span className="text-red-600"> *</span>}</p>
          {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
        </div>
      )}
      <FieldInput f={f} v={v} set={set} invalid={!!error} />
      {error && <p className="text-xs text-red-600">{tx(error)}</p>}
    </div>
  )
}

/** every answer, step by step, with แก้ to jump back (owner: like the Test / Trial forms' review step) */
function Review({ form, answers, onEdit }: { form: Pick<FormDef, "name" | "fields">; answers: Answers; onEdit: (step: number) => void }) {
  return (
    <div className="space-y-3">{layout(form).map((p, i) => (
      <div key={i} className="rounded-2xl border p-3">
        <div className="mb-2 flex items-center"><p className="text-sm font-semibold">{p.title}</p><Button size="xs" variant="ghost" className="ml-auto" onClick={() => onEdit(i)}><PencilIcon /> {tx("แก้")}</Button></div>
        <dl className="space-y-1.5 text-sm">{p.items.map((it) => it.kind === "field" ? (
          answerable(it.field) && isShown(it.field, answers) ? <div key={it.field.id}><dt className="text-xs text-muted-foreground">{it.field.label}</dt><dd>{answerText(it.field, answers[it.field.id])}</dd></div> : null
        ) : (
          ((Array.isArray(answers[it.section.id]) ? answers[it.section.id] : []) as GroupEntry[]).map((en, k) => (
            <div key={`${it.section.id}${k}`} className="rounded-xl bg-muted/50 p-2">
              <p className="mb-1 text-xs font-medium">{it.section.label} {k + 1}</p>
              {it.fields.filter((f) => answerable(f) && isShown(f, en, answers)).map((f) => <div key={f.id}><dt className="text-xs text-muted-foreground">{f.label}</dt><dd>{answerText(f, en[f.id])}</dd></div>)}
            </div>
          ))
        ))}</dl>
      </div>
    ))}</div>
  )
}

const chip = (on: boolean) => cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")

function FieldInput({ f, v, set, invalid }: { f: FormField; v: FormAnswer; set: (v: FormAnswer) => void; invalid: boolean }) {
  switch (f.type) {
    case "text": case "phone": case "email": case "number": case "date": case "time":
      return <Input aria-invalid={invalid} type={f.type === "phone" ? "tel" : f.type === "text" ? "text" : f.type} inputMode={f.type === "number" ? "decimal" : undefined}
        value={v === null || typeof v === "object" ? "" : String(v)} onChange={(e) => set(e.target.value)} placeholder={f.type === "phone" ? "08x-xxx-xxxx" : f.type === "email" ? "name@email.com" : undefined} />
    case "textarea":
      return <Textarea aria-invalid={invalid} rows={3} value={v === null || typeof v === "object" ? "" : String(v)} onChange={(e) => set(e.target.value)} />
    case "address": {
      const a: AddressAnswer = v && typeof v === "object" && !Array.isArray(v) ? (v as AddressAnswer) : { address: typeof v === "string" ? v : "" }
      return (
        <div className="space-y-2">
          <Textarea aria-invalid={invalid} rows={2} value={a.address} placeholder={tx("บ้านเลขที่ ซอย ถนน แขวง เขต จังหวัด")} onChange={(e) => set({ ...a, address: e.target.value })} />
          <div className="h-52 overflow-hidden rounded-2xl border" onClick={(e) => e.stopPropagation()}>
            <MapPin value={a.lat !== undefined && a.lng !== undefined ? { lat: a.lat, lng: a.lng } : undefined} onChange={(ll) => set({ ...a, lat: ll.lat, lng: ll.lng })} locateLabel={tx("ใช้ตำแหน่งปัจจุบัน")} />
          </div>
          <p className="text-[11px] text-muted-foreground">{a.lat !== undefined ? tx("ปักหมุดแล้ว — ลากหมุดเพื่อปรับได้") : tx("แตะบนแผนที่เพื่อปักหมุดบ้าน (ไม่บังคับ)")}</p>
        </div>
      )
    }
    case "dropdown":
      return <NativeSelect aria-invalid={invalid} className="w-full" value={v === null ? "" : String(v)} placeholder={tx("เลือก")} onChange={(e) => set(e.target.value || null)} options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />
    case "single": case "multi": {
      const list = (Array.isArray(v) ? v : v ? [String(v)] : []) as string[]
      const other = list.find((a) => a.startsWith(OTHER_PREFIX))
      const toggle = (o: string) => {
        if (f.type === "single") return set(list.includes(o) ? null : o)
        set(list.includes(o) ? list.filter((a) => a !== o) : [...list, o])
      }
      const setOther = (on: boolean, text = "") => {
        const rest = list.filter((a) => !a.startsWith(OTHER_PREFIX))
        if (f.type === "single") return set(on ? OTHER_PREFIX + text : null)
        set(on ? [...rest, OTHER_PREFIX + text] : rest)
      }
      if (!f.options?.length && f.source === "offer") return <p className="rounded-xl bg-muted/60 px-3 py-2 text-xs text-muted-foreground">{tx("ตัวเลือกจะมาจากที่ Admin เลือกตอนส่งฟอร์ม")}</p>
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(f.options ?? []).map((o) => <button key={o} type="button" className={chip(list.includes(o))} onClick={() => toggle(o)}>{list.includes(o) && f.type === "multi" && <CheckIcon className="-ml-0.5 mr-1 inline size-3.5" />}{o}</button>)}
            {f.allowOther && <button type="button" className={chip(!!other)} onClick={() => setOther(!other)}>{tx("อื่นๆ")}</button>}
          </div>
          {other !== undefined && <Input autoFocus value={other.slice(OTHER_PREFIX.length)} onChange={(e) => setOther(true, e.target.value)} placeholder={tx("โปรดระบุ")} />}
        </div>
      )
    }
    case "yesno":
      return (
        <div className="flex gap-2">
          {([[true, "ใช่"], [false, "ไม่ใช่"]] as const).map(([val, label]) => <button key={label} type="button" className={cn(chip(v === val), "min-w-20")} onClick={() => set(v === val ? null : val)}>{tx(label)}</button>)}
        </div>
      )
    case "nps":
      return (
        <div>
          <div className="grid grid-cols-11 gap-1">{Array.from({ length: 11 }, (_, i) => (
            <button key={i} type="button" onClick={() => set(v === i ? null : i)}
              className={cn("aspect-square rounded-lg border text-sm tabular-nums", v === i ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>{i}</button>
          ))}</div>
          <div className="mt-1 flex justify-between text-[11px] text-muted-foreground"><span>{tx("ไม่แนะนำเลย")}</span><span>{tx("แนะนำแน่นอน")}</span></div>
        </div>
      )
    case "scale5":
      return (
        <div className="grid grid-cols-5 gap-1.5">{SCALE5_LABEL.map((label, i) => (
          <button key={i} type="button" onClick={() => set(v === i + 1 ? null : i + 1)}
            className={cn("flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-center", v === i + 1 ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")}>
            <span className="text-base font-semibold tabular-nums">{i + 1}</span><span className="text-[10px] leading-tight">{tx(label)}</span>
          </button>
        ))}</div>
      )
    case "file": case "image": {
      const Icon = f.type === "image" ? ImageIcon : PaperclipIcon
      return (
        <label className={cn("flex cursor-pointer items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm hover:bg-muted", invalid && "border-red-500")}>
          <Icon className="size-4 text-muted-foreground" />
          <span className={v ? "font-medium" : "text-muted-foreground"}>{v ? String(v) : f.type === "image" ? tx("แตะเพื่อแนบรูป") : tx("แตะเพื่อแนบไฟล์")}</span>
          <input type="file" className="sr-only" accept={f.type === "image" ? "image/*" : undefined} onChange={(e) => set(e.target.files?.[0]?.name ?? null)} />
        </label>
      )
    }
    case "consent":
      return (
        <label className="flex items-start gap-2 text-sm">
          <Checkbox checked={v === true} onCheckedChange={(c) => set(c ? true : null)} aria-invalid={invalid} className="mt-0.5" />
          <span>{f.label || tx("ยอมรับเงื่อนไข")}{f.required && <span className="text-red-600"> *</span>}{f.help && <span className="block text-xs text-muted-foreground">{f.help}</span>}</span>
        </label>
      )
    default:
      return null
  }
}
