"use client"

// Set once (owner 2026-10-19, Transport): the vans with their drivers, the runs each van does, and whether trips go
// to the driver by themselves. Home pins, the branch pin and fee distances stay in Settings › Branch › Fees.
import Link from "next/link"
import { BusIcon, PlusIcon, TrashIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { SaveRow, SettingsCard, useBranchDraft } from "@/components/settings/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { weekdayShort } from "@/domain/dates"
import { AUTO_SEND_BEFORE_MIN } from "@/domain/rules/transport"
import type { Branch, BusRound, Vehicle, Weekday } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { DriversCard } from "./drivers-card"
import { KIND_LABEL } from "./labels"

const validate = (b: Branch): string | null => {
  for (const v of b.vehicles ?? []) if (!v.name.trim() || !(v.seats > 0)) return "รถทุกคันต้องมีชื่อ และที่นั่งมากกว่า 0"
  for (const r of b.busRounds ?? []) {
    if (!/^\d{2}:\d{2}$/.test(r.time) || !r.weekdays.length || !(r.seats > 0)) return "รอบรถทุกรอบต้องมีเวลา วัน และที่นั่ง"
    const v = (b.vehicles ?? []).find((x) => x.id === r.vehicleId)
    if (v && r.seats > v.seats) return `รอบ ${r.time} ที่นั่งเกินรถ ${v.name} (${v.seats} ที่)`
  }
  return null
}

export function TransportSettings({ branch }: { branch: Branch }) {
  const { b, setB, dirty, reset, save } = useBranchDraft(branch, ["vehicles", "busRounds", "busAutoSend"])
  const vehicles = b.vehicles ?? [], rounds = b.busRounds ?? []
  const putV = (id: string, patch: Partial<Vehicle>) => setB({ ...b, vehicles: vehicles.map((v) => (v.id === id ? { ...v, ...patch } : v)) })
  const putR = (id: string, patch: Partial<BusRound>) => setB({ ...b, busRounds: rounds.map((r) => (r.id === id ? { ...r, ...patch } : r)) })
  const addV = () => setB({ ...b, vehicles: [...vehicles, { id: uid("veh"), name: `รถตู้ ${vehicles.length + 1}`, plate: "", seats: 10, driverName: "", driverPhone: "", active: true }] })
  const addR = (kind: BusRound["kind"]) => setB({ ...b, busRounds: [...rounds, { id: uid("bro"), kind, weekdays: [1, 2, 3, 4, 5], time: kind === "pickup" ? "15:30" : kind === "both" ? "16:30" : "17:30", seats: vehicles[0]?.seats ?? 10, vehicleId: vehicles[0]?.id }] })
  const drivers = useStore((s) => s.staff).filter((x) => x.roles.includes("driver") && x.branchIds.includes(branch.id) && x.active)
  const sorted = [...rounds].sort((x, y) => (x.kind === y.kind ? x.time.localeCompare(y.time) : ["pickup", "both", "dropoff"].indexOf(x.kind) - ["pickup", "both", "dropoff"].indexOf(y.kind)))
  return (
    <div className="space-y-4">
      <SettingsCard title={`รถ (${vehicles.length})`} hint="รถแต่ละคันกับคนขับ — ใบงานรายวันส่งถึงคนขับคันนั้น · รถเสียวันไหนเลือกรถแทนได้ที่การ์ดเที่ยวรถ"
        action={<Button size="xs" variant="outline" onClick={addV}><PlusIcon /> เพิ่มรถ</Button>}>
        {vehicles.length === 0 && <p className="flex items-center justify-center gap-2 rounded-xl border border-dashed p-5 text-sm text-muted-foreground"><BusIcon className="size-4" /> ยังไม่มีรถ</p>}
        <div className="space-y-1.5">
          {vehicles.map((v) => (
            <div key={v.id} className="grid items-center gap-2 rounded-xl border px-2 py-1.5 sm:grid-cols-[1fr_7rem_5rem_1.2fr_auto_auto]">
              <Input value={v.name} placeholder="ชื่อรถ" onChange={(e) => putV(v.id, { name: e.target.value })} />
              <Input value={v.plate} placeholder="ทะเบียน" onChange={(e) => putV(v.id, { plate: e.target.value })} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Input className="text-right tabular-nums" type="number" min={1} value={v.seats} onChange={(e) => putV(v.id, { seats: Number(e.target.value) })} />ที่</span>
              <NativeSelect className="h-9" value={v.driverId ?? ""} placeholder={drivers.length ? "คนขับประจำ" : "เพิ่มคนขับในการ์ดด้านล่างก่อน"} onChange={(e) => putV(v.id, { driverId: e.target.value || undefined })}
                options={drivers.map((d) => ({ value: d.id, label: d.vendor ? `${d.nickname} (Outsource)` : d.nickname }))} />
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground"><Switch checked={v.active} onCheckedChange={(x) => putV(v.id, { active: x })} />ใช้งาน</label>
              <Button size="icon-sm" variant="ghost" aria-label="ลบ" disabled={rounds.some((r) => r.vehicleId === v.id)} title={rounds.some((r) => r.vehicleId === v.id) ? "ยังมีรอบรถใช้คันนี้อยู่" : undefined}
                onClick={() => setB({ ...b, vehicles: vehicles.filter((x) => x.id !== v.id) })}><TrashIcon /></Button>
            </div>
          ))}
        </div>
      </SettingsCard>

      <DriversCard branch={branch} />

      <SettingsCard title={`รอบรถ (${rounds.length})`} hint="รอบรับ = ถึงสาขาก่อนเวลานี้ · รอบส่ง = ออกจากสาขาเวลานี้ · รอบรับ-ส่ง = ออกเวลานี้ ส่งเด็กที่เลิกเรียนก่อน แล้วรับเด็กที่เรียนรอบถัดไปกลับมา — เด็กเข้ารอบที่ตรงเวลาเรียนเอง · รถหลายคันออกเวลาเดียวกัน ระบบแบ่งตามทิศบ้านให้"
        action={<span className="flex gap-1.5"><Button size="xs" variant="outline" onClick={() => addR("pickup")}><PlusIcon /> รอบรับ</Button><Button size="xs" variant="outline" onClick={() => addR("dropoff")}><PlusIcon /> รอบส่ง</Button><Button size="xs" variant="outline" onClick={() => addR("both")}><PlusIcon /> รอบรับ-ส่ง</Button></span>}>
        <div className="space-y-1.5">
          {sorted.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border px-2 py-1.5">
              <Pill tone={r.kind === "pickup" ? "blue" : r.kind === "both" ? "green" : "amber"}>{KIND_LABEL[r.kind]}</Pill>
              <Input type="time" className="w-28" value={r.time} onChange={(e) => putR(r.id, { time: e.target.value })} />
              <span className="flex gap-1">
                {([1, 2, 3, 4, 5, 6, 0] as Weekday[]).map((d) => { const on = r.weekdays.includes(d); return (
                  <button key={d} type="button" onClick={() => putR(r.id, { weekdays: on ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d] })}
                    className={on ? "h-7 min-w-8 rounded-full border border-primary bg-primary/10 px-1.5 text-xs font-medium text-primary" : "h-7 min-w-8 rounded-full border px-1.5 text-xs text-muted-foreground hover:bg-muted"}>{weekdayShort(d)}</button>
                ) })}
              </span>
              <NativeSelect className="h-9 w-40" value={r.vehicleId ?? ""} placeholder="เลือกรถ" onChange={(e) => putR(r.id, { vehicleId: e.target.value || undefined })}
                options={vehicles.map((v) => ({ value: v.id, label: v.name }))} />
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Input className="w-16 text-right tabular-nums" type="number" min={1} value={r.seats} onChange={(e) => putR(r.id, { seats: Number(e.target.value) })} />ที่นั่ง</span>
              <Input className="min-w-28 flex-1" value={r.name ?? ""} placeholder="ชื่อรอบ (ไม่บังคับ) เช่น สายเหนือ" onChange={(e) => putR(r.id, { name: e.target.value || undefined })} />
              <Button size="icon-sm" variant="ghost" aria-label="ลบ" onClick={() => setB({ ...b, busRounds: rounds.filter((x) => x.id !== r.id) })}><TrashIcon /></Button>
            </div>
          ))}
        </div>
      </SettingsCard>

      <SettingsCard title="ส่งใบงานให้คนขับ" hint="ระบบส่งเองเมื่อเที่ยวนั้นไม่มีอะไรต้องดู — Admin ดูแค่เที่ยวที่มีคำเตือน">
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={!!b.busAutoSend} onCheckedChange={(x) => setB({ ...b, busAutoSend: x })} />
          <span>{`ส่งอัตโนมัติ ${AUTO_SEND_BEFORE_MIN} นาทีก่อนรถออก เมื่อไม่มีคำเตือน`}<span className="block text-xs text-muted-foreground">ปิด = Admin กด &quot;ส่งให้คนขับ&quot; เองทุกเที่ยว</span></span>
        </label>
        <p className="mt-3 text-xs text-muted-foreground">หมุดสาขา · ระยะของค่ารถแต่ละประเภท อยู่ที่ <Link className="text-primary underline" href={`/settings/branches/${branch.id}?tab=fees`}>ตั้งค่าสาขา › ค่าธรรมเนียม</Link></p>
      </SettingsCard>

      <SaveRow dirty={dirty} onReset={reset} onSave={() => { const bad = validate(b); return bad ? report({ ok: false, error: bad }, "") : save("บันทึกรถรับส่งแล้ว") }} />
    </div>
  )
}
