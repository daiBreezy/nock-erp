"use client"

import { CheckIcon, ImageIcon, PaperclipIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { OTHER_PREFIX, SCALE5_LABEL, answerable, visibleFields } from "@/domain/rules/form-builder"
import type { FormAnswer, FormDef, FormField, ID } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * A form as the parent fills it in (owner 2026-10-22: form builder) — the same component draws the builder's live
 * preview and the parent's page in LINE, so what the company designs is exactly what the family sees.
 * Field labels are the company's own words (not translated); only the form's own chrome is.
 */
export function FormRenderer({ form, answers, onChange, errors = {}, highlight, onPick }: {
  form: Pick<FormDef, "name" | "description" | "fields">
  answers: Record<ID, FormAnswer>
  onChange: (id: ID, v: FormAnswer) => void
  errors?: Record<ID, string>
  /** builder: the field being edited is outlined in the preview */
  highlight?: ID | null
  /** builder: clicking a question in the preview selects it in the editor */
  onPick?: (id: ID) => void
}) {
  let no = 0
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold leading-snug">{form.name || tx("ชื่อฟอร์ม")}</h1>
        {form.description && <p className="mt-1 text-sm text-muted-foreground whitespace-pre-line">{form.description}</p>}
      </div>
      {visibleFields(form).map((f) => {
        if (answerable(f)) no++
        return (
          <div key={f.id} onClick={onPick ? () => onPick(f.id) : undefined}
            className={cn("rounded-2xl transition-shadow", onPick && "cursor-pointer", highlight === f.id && "ring-2 ring-primary/50 ring-offset-4 ring-offset-background")}>
            {f.type === "section" ? (
              <div className="border-b pb-1.5 pt-2">
                <p className="font-semibold">{f.label || tx("หัวข้อ")}</p>
                {f.help && <p className="text-sm text-muted-foreground">{f.help}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                {f.type !== "consent" && (
                  <div>
                    <p className="text-sm font-medium">{no}. {f.label || tx("คำถาม")}{f.required && <span className="text-red-600"> *</span>}</p>
                    {f.help && <p className="text-xs text-muted-foreground">{f.help}</p>}
                  </div>
                )}
                <FieldInput f={f} v={answers[f.id] ?? null} set={(v) => onChange(f.id, v)} invalid={!!errors[f.id]} />
                {errors[f.id] && <p className="text-xs text-red-600">{tx(errors[f.id])}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const chip = (on: boolean) => cn("rounded-full border px-3 py-1.5 text-sm transition-colors", on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted")

function FieldInput({ f, v, set, invalid }: { f: FormField; v: FormAnswer; set: (v: FormAnswer) => void; invalid: boolean }) {
  switch (f.type) {
    case "text": case "phone": case "email": case "number": case "date": case "time":
      return <Input aria-invalid={invalid} type={f.type === "phone" ? "tel" : f.type === "text" ? "text" : f.type} inputMode={f.type === "number" ? "decimal" : undefined}
        value={v === null ? "" : String(v)} onChange={(e) => set(e.target.value)} placeholder={f.type === "phone" ? "08x-xxx-xxxx" : f.type === "email" ? "name@email.com" : undefined} />
    case "textarea":
      return <Textarea aria-invalid={invalid} rows={3} value={v === null ? "" : String(v)} onChange={(e) => set(e.target.value)} />
    case "dropdown":
      return <NativeSelect aria-invalid={invalid} className="w-full" value={v === null ? "" : String(v)} placeholder={tx("เลือก")} onChange={(e) => set(e.target.value || null)} options={(f.options ?? []).map((o) => ({ value: o, label: o }))} />
    case "single": case "multi": {
      const list = Array.isArray(v) ? v : v ? [String(v)] : []
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
