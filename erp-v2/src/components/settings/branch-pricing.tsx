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
import { fmtDate, fmtMoney, weekdayShort } from "@/domain/dates"
import { MapPin } from "@/app/liff/form/map-pin"
import { durationsOf, FEE_KIND_LABEL, PRICE_UNIT_LABEL, validateFee, validatePromotion } from "@/domain/rules/settings"
import type { Branch, BusRound, Fee, FeeKind, PriceUnit, Promotion, Weekday } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { SaveRow, SettingsCard, useBranchDraft } from "./common"
import { durationText, tx } from "@/lib/i18n"

const FEE_ICON: Record<FeeKind, typeof BusIcon> = { bus: BusIcon, entry: TicketIcon, mock: ClipboardCheckIcon }

/** General Fees (staging): priced types for the flat fees Create Invoice charges outside course packages. */
export function FeesTab({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["fees", "location", "busRounds"])
  const [adding, setAdding] = useState<FeeKind | null>(null)
  const [form, setForm] = useState({ name: "", price: "" })
  const upd = (id: string, patch: Partial<Fee>) => setB({ ...b, fees: b.fees.map((f) => (f.id === id ? { ...f, ...patch } : f)) })

  const addType = (kind: FeeKind) => {
    const fee: Fee = { id: uid("fee"), kind, name: form.name.trim(), price: Number(form.price) }
    const err = form.price === "" ? tx("ใส่ราคา") : validateFee(fee)
    if (err) return report({ ok: false, error: err }, "")
    setB({ ...b, fees: [...b.fees, fee] })
    setAdding(null)
    setForm({ name: "", price: "" })
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{tx("ประเภทค่าธรรมเนียมแบบราคาตายตัวที่ใบแจ้งหนี้คิดนอกเหนือจากค่าคอร์ส — ใส่ได้หลายประเภทต่อหมวด เพื่อคิดราคาต่างกันตามเงื่อนไข")}</p>
      {(["bus", "entry", "mock"] as FeeKind[]).map((kind) => {
        const Icon = FEE_ICON[kind]
        const list = b.fees.filter((f) => f.kind === kind)
        return (
          <SettingsCard key={kind} title={tx(FEE_KIND_LABEL[kind].title)} hint={tx(FEE_KIND_LABEL[kind].hint)}
            action={<Button size="xs" variant="outline" onClick={() => { setAdding(kind); setForm({ name: "", price: "" }) }}><PlusIcon />  {tx("เพิ่มประเภท")}</Button>}>
            {list.length === 0 && adding !== kind && (
              <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground"><Icon className="size-4" />  {tx("ยังไม่มีประเภท")}</p>
            )}
            <div className="space-y-1.5">
              {list.map((f) => (
                <div key={f.id} className="flex items-center gap-2">
                  <Icon className="size-4 text-muted-foreground" />
                  <Input className="flex-1" value={f.name} onChange={(e) => upd(f.id, { name: e.target.value })} />
                  <Input className="w-32 text-right tabular-nums" type="number" min={0} value={f.price} onChange={(e) => upd(f.id, { price: Number(e.target.value) })} />
                  <span className="w-10 text-xs text-muted-foreground">{kind === "bus" ? tx("/เที่ยว") : tx("บาท")}</span>
                  {/* owner 2026-10-16: how far this bus type reaches — the invoice suggests the type from the home's distance */}
                  {kind === "bus" && <span className="flex items-center gap-1 text-xs text-muted-foreground">{tx("ไม่เกิน")}<Input className="w-20 text-right tabular-nums" type="number" min={0} step={0.5} value={f.maxKm ?? ""} placeholder="—" onChange={(e) => upd(f.id, { maxKm: e.target.value === "" ? undefined : Number(e.target.value) })} />{tx("กม.")}</span>}
                  <Button size="icon-sm" variant="ghost" aria-label={tx("ลบ")} onClick={() => setB({ ...b, fees: b.fees.filter((x) => x.id !== f.id) })}><TrashIcon /></Button>
                </div>
              ))}
              {adding === kind && (
                <div className="flex flex-wrap items-end gap-2 rounded-xl bg-muted/40 p-2">
                  <Field label={tx("ชื่อประเภท")} className="min-w-40 flex-1"><Input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={tx("เช่น Standard")} /></Field>
                  <Field label={tx("ราคา (฿)")}><Input className="w-32" type="number" min={0} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder={tx("เช่น 100")} /></Field>
                  <Button size="sm" onClick={() => addType(kind)}>{tx("เพิ่มประเภท")}</Button>
                  <Button size="sm" variant="ghost" onClick={() => setAdding(null)}>{tx("ยกเลิก")}</Button>
                </div>
              )}
            </div>
          </SettingsCard>
        )
      })}
      {(b.brand === "liclass" || b.fees.some((f) => f.kind === "bus")) && <BusSetup b={b} setB={setB} />}
      <SaveRow dirty={dirty} onReset={reset} onSave={() => {
        const bad = b.fees.map((f) => validateFee(f)).find(Boolean) ?? (b.busRounds ?? []).map(validateBusRound).find(Boolean)
        return bad ? report({ ok: false, error: bad }, "") : save(tx("บันทึกค่าธรรมเนียมแล้ว"))
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
    <SettingsCard title={tx("โปรโมชัน ({0})", [b.promotions.length])} hint={tx("ส่วนลดตามระยะเวลาแพ็กเกจที่ซื้อ — ใบแจ้งหนี้เลือกโปรที่ลดได้มากที่สุดให้อัตโนมัติ")}
      action={<Button size="xs" variant="outline" onClick={() => setEditing(emptyPromo("hour", durationsOf(b, "hour")[0] ?? 1))}><PlusIcon />  {tx("เพิ่มโปรโมชัน")}</Button>}>
      {b.promotions.length === 0 && <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground"><TagIcon className="size-4" />  {tx("ยังไม่มีโปรโมชัน")}</p>}
      <div className="divide-y rounded-2xl border empty:hidden">
        {b.promotions.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <TagIcon className="size-4 text-muted-foreground" />
            <span className="font-medium">{p.name}</span>
            <Pill tone="violet">{tx("ลด")} {p.type === "pct" ? `${p.value}%` : fmtMoney(p.value)}</Pill>
            <span className="text-xs text-muted-foreground">{tx(PRICE_UNIT_LABEL[p.unit])}  {tx("· ขั้นต่ำ")} {durationText(p.unit, p.minDuration)}{p.from || p.to ? ` · ${p.from ? fmtDate(p.from) : "…"} → ${p.to ? fmtDate(p.to) : tx("ไม่มีวันสิ้นสุด")}` : ""}</span>
            <span className="ml-auto flex items-center gap-2">
              <Switch checked={p.active} onCheckedChange={(v) => upsert({ ...p, active: v })} aria-label={tx("เปิดใช้")} />
              <Button size="icon-sm" variant="ghost" aria-label={tx("แก้")} onClick={() => setEditing(p)}><PencilIcon /></Button>
              <Button size="icon-sm" variant="ghost" aria-label={tx("ลบ")} onClick={() => setB({ ...b, promotions: b.promotions.filter((x) => x.id !== p.id) })}><TrashIcon /></Button>
            </span>
          </div>
        ))}
      </div>
      <SaveRow dirty={dirty} onReset={reset} onSave={() => save(tx("บันทึกโปรโมชันแล้ว"))} />
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
          <DialogTitle>{branch.promotions.some((x) => x.id === p.id) ? tx("แก้โปรโมชัน") : tx("เพิ่มโปรโมชัน")}</DialogTitle>
          <DialogDescription>{tx("กดบันทึกโปรโมชันที่หน้าแท็บอีกครั้งเพื่อยืนยัน")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tx("ชื่อโปรโมชัน *")} className="sm:col-span-2"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} placeholder={tx("เช่น Special Discount")} /></Field>
          <Field label={tx("ประเภทส่วนลด")}>
            <NativeSelect value={p.type} onChange={(e) => setP({ ...p, type: e.target.value as Promotion["type"] })} options={[{ value: "pct", label: tx("เปอร์เซ็นต์ (%)") }, { value: "amount", label: tx("จำนวนเงิน (฿)") }]} />
          </Field>
          <Field label={tx("มูลค่าส่วนลด")}><Input type="number" min={0} value={p.value || ""} onChange={(e) => setP({ ...p, value: Number(e.target.value) })} placeholder={tx("เช่น 20")} /></Field>
          <Field label={tx("ประเภทแพ็กเกจ")}>
            <NativeSelect value={p.unit} onChange={(e) => { const unit = e.target.value as PriceUnit; setP({ ...p, unit, minDuration: durationsOf(branch, unit)[0] ?? 1 }) }}
              options={(["hour", "week", "month"] as PriceUnit[]).map((u) => ({ value: u, label: tx(PRICE_UNIT_LABEL[u]) }))} />
          </Field>
          <Field label={tx("ระยะขั้นต่ำ")}>
            {p.unit === "month" ? (
              <Input type="number" min={1} value={p.minDuration} onChange={(e) => setP({ ...p, minDuration: Number(e.target.value) })} />
            ) : (
              <NativeSelect value={String(p.minDuration)} onChange={(e) => setP({ ...p, minDuration: Number(e.target.value) })}
                options={durations.map((d) => ({ value: String(d), label: durationText(p.unit, d) }))} placeholder={durations.length ? undefined : tx("ยังไม่มีระยะเวลาในแท็บแพ็กเกจ")} />
            )}
          </Field>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={dated} onCheckedChange={(v) => setDated(!!v)} />  {tx("กำหนดวันเริ่ม → วันสิ้นสุด (ไม่ติ๊ก = ไม่มีวันสิ้นสุด)")}</label>
          {dated && (
            <>
              <Field label={tx("เริ่ม")}><Input type="date" value={p.from ?? ""} onChange={(e) => setP({ ...p, from: e.target.value || undefined })} /></Field>
              <Field label={tx("สิ้นสุด")}><Input type="date" value={p.to ?? ""} onChange={(e) => setP({ ...p, to: e.target.value || undefined })} /></Field>
            </>
          )}
          <label className="flex items-center gap-2 text-sm"><Switch checked={p.active} onCheckedChange={(v) => setP({ ...p, active: v })} />  {tx("เปิดใช้งาน")}</label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button onClick={submit}>{tx("ตกลง")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

const validateBusRound = (r: BusRound) => !/^\d{2}:\d{2}$/.test(r.time) ? tx("ใส่เวลารอบรถ") : !r.weekdays.length ? tx("เลือกวันของรอบรถ") : !(r.seats > 0) ? tx("ที่นั่งรอบรถต้องมากกว่า 0") : null

/** Liclass bus (owner 2026-10-16): the branch pin (distances are measured from it) + the bus runs per weekday with seats. */
function BusSetup({ b, setB }: { b: Branch; setB: (b: Branch) => void }) {
  const rounds = b.busRounds ?? []
  const put = (id: string, patch: Partial<BusRound>) => setB({ ...b, busRounds: rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const add = (kind: BusRound["kind"]) => setB({ ...b, busRounds: [...rounds, { id: uid("bro"), kind, weekdays: [1, 2, 3, 4, 5], time: kind === "pickup" ? "15:30" : "17:30", seats: 8 }] })
  const sorted = [...rounds].sort((x, y) => x.kind.localeCompare(y.kind) * -1 || x.time.localeCompare(y.time))
  return (
    <>
      <SettingsCard title={tx("หมุดสาขา (รถรับส่ง)")} hint={tx("ระยะทางไปบ้านนักเรียนวัดจากหมุดนี้ — ใบแจ้งหนี้ใช้เลือกประเภทค่ารถ / บอกว่าอยู่นอกพื้นที่")}>
        <div className="h-64 overflow-hidden rounded-2xl"><MapPin value={b.location} onChange={(v) => setB({ ...b, location: v })} locateLabel={tx("ใช้ตำแหน่งปัจจุบัน")} /></div>
      </SettingsCard>
      <SettingsCard title={tx("รอบรถ ({0})", [rounds.length])} hint={tx("รอบรับก่อนเรียน / ส่งหลังเรียน ต่อวัน พร้อมจำนวนที่นั่ง — ใบแจ้งหนี้บอกได้ว่าวันที่เรียนมีรอบไหม เต็มหรือยัง")}
        action={<span className="flex gap-1.5"><Button size="xs" variant="outline" onClick={() => add("pickup")}><PlusIcon /> {tx("รอบรับ")}</Button><Button size="xs" variant="outline" onClick={() => add("dropoff")}><PlusIcon /> {tx("รอบส่ง")}</Button></span>}>
        {rounds.length === 0 && <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground"><BusIcon className="size-4" /> {tx("ยังไม่มีรอบรถ")}</p>}
        <div className="space-y-1.5">
          {sorted.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border px-2 py-1.5">
              <Pill tone={r.kind === "pickup" ? "green" : "amber"}>{r.kind === "pickup" ? tx("รับ") : tx("ส่ง")}</Pill>
              <Input type="time" className="w-28" value={r.time} onChange={(e) => put(r.id, { time: e.target.value })} />
              <span className="flex gap-1">
                {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => { const on = r.weekdays.includes(d); return (
                  <button key={d} type="button" onClick={() => put(r.id, { weekdays: on ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d] })}
                    className={on ? "h-7 min-w-8 rounded-full border border-primary bg-primary/10 px-1.5 text-xs font-medium text-primary" : "h-7 min-w-8 rounded-full border px-1.5 text-xs text-muted-foreground hover:bg-muted"}>{weekdayShort(d)}</button>
                ) })}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Input className="w-16 text-right tabular-nums" type="number" min={1} value={r.seats} onChange={(e) => put(r.id, { seats: Number(e.target.value) })} />{tx("ที่นั่ง")}</span>
              <Input className="min-w-28 flex-1" value={r.name ?? ""} placeholder={tx("ชื่อรอบ (ไม่บังคับ)")} onChange={(e) => put(r.id, { name: e.target.value || undefined })} />
              <Button size="icon-sm" variant="ghost" aria-label={tx("ลบ")} onClick={() => setB({ ...b, busRounds: rounds.filter((x) => x.id !== r.id) })}><TrashIcon /></Button>
            </div>
          ))}
        </div>
      </SettingsCard>
    </>
  )
}
