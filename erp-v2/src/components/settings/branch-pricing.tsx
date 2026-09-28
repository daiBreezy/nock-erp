"use client"

import { useState } from "react"
import { BusIcon, ClipboardCheckIcon, PencilIcon, PlusIcon, TagIcon, TicketIcon, TrashIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { fmtDate, fmtMoney } from "@/domain/dates"
import { durationLabel, durationsOf, FEE_KIND_LABEL, PRICE_UNIT_LABEL, validateFee, validatePromotion } from "@/domain/rules/settings"
import type { Branch, Fee, FeeKind, PriceUnit, Promotion } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { SaveRow, SettingsCard, useBranchDraft } from "./common"

const FEE_ICON: Record<FeeKind, typeof BusIcon> = { bus: BusIcon, entry: TicketIcon, mock: ClipboardCheckIcon }

/** General Fees (staging): priced types for the flat fees Create Invoice charges outside course packages. */
export function FeesTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["fees"])
  const [adding, setAdding] = useState<FeeKind | null>(null)
  const [form, setForm] = useState({ name: "", price: "" })
  const upd = (id: string, patch: Partial<Fee>) => setB({ ...b, fees: b.fees.map((f) => (f.id === id ? { ...f, ...patch } : f)) })

  const addType = (kind: FeeKind) => {
    const fee: Fee = { id: uid("fee"), kind, name: form.name.trim(), price: Number(form.price) }
    const err = form.price === "" ? "ใส่ราคา" : validateFee(fee)
    if (err) return report({ ok: false, error: err }, "")
    setB({ ...b, fees: [...b.fees, fee] })
    setAdding(null)
    setForm({ name: "", price: "" })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">ประเภทค่าธรรมเนียมแบบราคาตายตัวที่ใบแจ้งหนี้คิดนอกเหนือจากค่าคอร์ส — ใส่ได้หลายประเภทต่อหมวด เพื่อคิดราคาต่างกันตามเงื่อนไข</p>
      {(["bus", "entry", "mock"] as FeeKind[]).map((kind) => {
        const Icon = FEE_ICON[kind]
        const list = b.fees.filter((f) => f.kind === kind)
        return (
          <SettingsCard key={kind} title={FEE_KIND_LABEL[kind].title} hint={FEE_KIND_LABEL[kind].hint}
            action={<Button size="xs" variant="outline" onClick={() => { setAdding(kind); setForm({ name: "", price: "" }) }}><PlusIcon /> เพิ่มประเภท</Button>}>
            {list.length === 0 && adding !== kind && (
              <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground"><Icon className="size-4" /> ยังไม่มีประเภท</p>
            )}
            <div className="space-y-1.5">
              {list.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <Input className="flex-1" value={f.name} onChange={(e) => upd(f.id, { name: e.target.value })} />
                  <Input className="w-32 text-right tabular-nums" type="number" min={0} value={f.price} onChange={(e) => upd(f.id, { price: Number(e.target.value) })} />
                  <span className="w-10 text-xs text-muted-foreground">{kind === "bus" ? "/เที่ยว" : "บาท"}</span>
                  <Button size="icon-sm" variant="ghost" aria-label="ลบ" onClick={() => setB({ ...b, fees: b.fees.filter((x) => x.id !== f.id) })}><TrashIcon /></Button>
                </div>
              ))}
              {adding === kind && (
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/40 p-2">
                  <Field label="ชื่อประเภท" className="min-w-40 flex-1"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="เช่น Standard" /></Field>
                  <Field label="ราคา (฿)"><Input className="w-32" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="เช่น 100" /></Field>
                  <Button size="sm" onClick={() => addType(kind)}>เพิ่มประเภท</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>ยกเลิก</Button>
                </div>
              )}
            </div>
          </SettingsCard>
        )
      })}
      <SaveRow dirty={dirty} onReset={reset} onSave={() => {
        const bad = b.fees.map((f) => validateFee(f)).find(Boolean)
        return bad ? report({ ok: false, error: bad }, "") : save("บันทึกค่าธรรมเนียมแล้ว")
      }} />
    </div>
  )
}

const emptyPromo = (unit: PriceUnit, minDuration: number): Promotion => ({ id: uid("pr"), name: "", type: "pct", value: 0, unit, minDuration, active: true })

/** Promotions (staging): discount offered against a package duration tier. */
export function PromotionsTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["promotions"])
  const [editing, setEditing] = useState<Promotion | null>(null)
  const upsert = (p: Promotion) => setB({ ...b, promotions: b.promotions.some((x) => x.id === p.id) ? b.promotions.map((x) => (x.id === p.id ? p : x)) : [...b.promotions, p] })

  return (
    <SettingsCard title={`โปรโมชัน (${b.promotions.length})`} hint="ส่วนลดตามระยะเวลาแพ็กเกจที่ซื้อ — ใบแจ้งหนี้เลือกโปรที่ลดได้มากที่สุดให้อัตโนมัติ"
      action={<Button size="xs" variant="outline" onClick={() => setEditing(emptyPromo("hour", durationsOf(b, "hour")[0] ?? 1))}><PlusIcon /> เพิ่มโปรโมชัน</Button>}>
      {b.promotions.length === 0 && <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><TagIcon className="size-4" /> ยังไม่มีโปรโมชัน</p>}
      <div className="divide-y rounded-2xl border empty:hidden">
        {b.promotions.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <TagIcon className="size-4 text-muted-foreground" />
            <span className="font-medium">{p.name}</span>
            <Pill tone="violet">ลด {p.type === "pct" ? `${p.value}%` : fmtMoney(p.value)}</Pill>
            <span className="text-xs text-muted-foreground">{PRICE_UNIT_LABEL[p.unit]} · ขั้นต่ำ {durationLabel(p.unit, p.minDuration)}{p.from || p.to ? ` · ${p.from ? fmtDate(p.from) : "…"} → ${p.to ? fmtDate(p.to) : "ไม่มีวันสิ้นสุด"}` : ""}</span>
            <span className="ml-auto flex items-center gap-2">
              <Switch checked={p.active} onCheckedChange={(v) => upsert({ ...p, active: v })} aria-label="เปิดใช้" />
              <Button size="icon-sm" variant="ghost" aria-label="แก้" onClick={() => setEditing(p)}><PencilIcon /></Button>
              <Button size="icon-sm" variant="ghost" aria-label="ลบ" onClick={() => setB({ ...b, promotions: b.promotions.filter((x) => x.id !== p.id) })}><TrashIcon /></Button>
            </span>
          </div>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save("บันทึกโปรโมชันแล้ว")} />
      {editing && <PromotionDialog branch={b} initial={editing} onClose={() => setEditing(null)} onDone={(p) => { upsert(p); setEditing(null) }} />}
    </SettingsCard>
  )
}

function PromotionDialog({ branch, initial, onClose, onDone }: { branch: Branch; initial: Promotion; onClose: () => void; onDone: (p: Promotion) => void }) {
  const [p, setP] = useState(initial)
  const [dated, setDated] = useState(!!(initial.from || initial.to))
  const durations = durationsOf(branch, p.unit)
  const submit = () => {
    const next = dated ? p : { ...p, from: undefined, to: undefined }
    const err = validatePromotion(next)
    if (err) return report({ ok: false, error: err }, "")
    onDone(next)
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{branch.promotions.some((x) => x.id === p.id) ? "แก้โปรโมชัน" : "เพิ่มโปรโมชัน"}</DialogTitle>
          <DialogDescription>กดบันทึกโปรโมชันที่หน้าแท็บอีกครั้งเพื่อยืนยัน</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อโปรโมชัน *" className="sm:col-span-2"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder="เช่น Special Discount" /></Field>
          <Field label="ประเภทส่วนลด">
            <NativeSelect value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as Promotion["type"] })} options={[{ value: "pct", label: "เปอร์เซ็นต์ (%)" }, { value: "amount", label: "จำนวนเงิน (฿)" }]} />
          </Field>
          <Field label="มูลค่าส่วนลด"><Input type="number" min={0} value={p.value || ""} onChange={(e) => setP({ ...p, value: Number(e.target.value) })} placeholder="เช่น 20" /></Field>
          <Field label="ประเภทแพ็กเกจ">
            <NativeSelect value={p.unit} onChange={(e) => { const unit = e.target.value as PriceUnit; setP({ ...p, unit, minDuration: durationsOf(branch, unit)[0] ?? 1 }) }}
              options={(["hour", "week", "month"] as PriceUnit[]).map((u) => ({ value: u, label: PRICE_UNIT_LABEL[u] }))} />
          </Field>
          <Field label="ระยะขั้นต่ำ">
            {p.unit === "month" ? (
              <Input type="number" min={1} value={p.minDuration} onChange={(e) => setP({ ...p, minDuration: Number(e.target.value) })} />
            ) : (
              <NativeSelect value={String(p.minDuration)} onChange={(e) => setP({ ...p, minDuration: Number(e.target.value) })}
                options={durations.map((d) => ({ value: String(d), label: durationLabel(p.unit, d) }))} placeholder={durations.length ? undefined : "ยังไม่มีระยะเวลาในแท็บแพ็กเกจ"} />
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={dated} onCheckedChange={(v) => setDated(!!v)} /> กำหนดวันเริ่ม → วันสิ้นสุด (ไม่ติ๊ก = ไม่มีวันสิ้นสุด)</label>
          {dated && (
            <>
              <Field label="เริ่ม"><Input type="date" value={p.from ?? ""} onChange={(e) => setP({ ...p, from: e.target.value || undefined })} /></Field>
              <Field label="สิ้นสุด"><Input type="date" value={p.to ?? ""} onChange={(e) => setP({ ...p, to: e.target.value || undefined })} /></Field>
            </>
          )}
          <label className="flex items-center gap-2 text-sm"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} /> เปิดใช้งาน</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={submit}>ตกลง</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
