"use client"

// Owner 2026-10-19 ("จะต้องสามารถ สร้าง แก้ไข ลบ ปรับเปลี่ยน ยกเลิก ได้ด้วย"): the day's changes to a trip — another time,
// cancel, add a child, a one-off run — each a small dialog; nothing here changes the weekly runs.
import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtMoney } from "@/domain/dates"
import { busRate } from "@/domain/rules/settings"
import type { TripPlan } from "@/domain/rules/transport"
import type { Branch, BusTrip, DateStr } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"
import { KIND_LABEL } from "./labels"

const REASONS = ["รถเสีย", "วันหยุด / ปิดเรียน", "คนขับลา", "ไม่มีเด็กนั่ง"]

export function TripTimeDialog({ t, onClose }: { t: TripPlan; onClose: () => void }) {
  const setTime = useStore((s) => s.setTripTime)
  const usual = t.extra ? null : t.state?.time ? null : t.round.time
  const [time, setT] = useState(t.round.time)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>เปลี่ยนเวลาเฉพาะวันนี้</DialogTitle>
          <DialogDescription>{`${KIND_LABEL[t.round.kind]} · ${fmtDate(t.date, { weekday: true })} — รอบประจำสัปดาห์ไม่เปลี่ยน · เวลาถึงแต่ละจุดคำนวณใหม่`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1"><Label className="text-xs">{t.round.kind === "pickup" ? "ถึงสาขาก่อน" : "ออกจากสาขา"}</Label><Input type="time" value={time} onChange={(e) => setT(e.target.value)} /></div>
        <DialogFooter className="sm:justify-between">
          {t.timeChanged ? <Button variant="ghost" onClick={() => { if (report(setTime(t.round.id, t.date, null), "กลับไปเวลาเดิมแล้ว")) onClose() }}>กลับไปเวลาเดิม</Button> : <span />}
          <Button disabled={!time || time === usual} onClick={() => { if (report(setTime(t.round.id, t.date, time), `เปลี่ยนเป็น ${time} เฉพาะวันนี้แล้ว`)) onClose() }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TripCancelDialog({ t, onClose }: { t: TripPlan; onClose: () => void }) {
  const cancelTrip = useStore((s) => s.cancelTrip)
  const [reason, setReason] = useState("")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{`ยกเลิก${KIND_LABEL[t.round.kind]} ${t.round.time} วันนี้`}</DialogTitle>
          <DialogDescription>{`${fmtDate(t.date, { weekday: true })} · เด็ก ${t.stops.length} คนบนเที่ยวนี้จะย้ายไปกล่อง "ต้องตัดสินใจ" ให้เลือกรอบอื่น — กู้คืนได้ภายหลัง`}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className={reason === r ? "h-8 rounded-full border border-primary bg-primary/10 px-3 text-sm font-medium text-primary" : "h-8 rounded-full border px-3 text-sm text-muted-foreground hover:bg-muted"}>{r}</button>)}
        </div>
        <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผล (จำเป็น)" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ไม่ยกเลิก</Button>
          <Button variant="destructive" disabled={!reason.trim()} onClick={() => { if (report(cancelTrip(t.round.id, t.date, reason), "ยกเลิกเที่ยวนี้วันนี้แล้ว")) onClose() }}>ยกเลิกเที่ยวนี้</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** put a child on this trip for the day — riding already = just moved here; not riding = an extra ride (charged or free) */
export function AddRiderDialog({ t, branch, onClose }: { t: TripPlan; branch: Branch; onClose: () => void }) {
  const students = useStore((s) => s.students)
  const addRider = useStore((s) => s.addRiderToTrip)
  const [q, setQ] = useState("")
  const [pick, setPick] = useState<string | null>(null)
  const [charge, setCharge] = useState(true)
  const [adult, setAdult] = useState(false)
  // a Both trip carries both ways — which one is this child's?
  const [leg, setLeg] = useState<"pickup" | "dropoff">("pickup")
  const onTrip = new Set(t.stops.map((s) => s.rider.studentId))
  const list = useMemo(() => {
    const k = q.trim().toLowerCase()
    return students.filter((s) => s.branchId === branch.id && !s.archived && !onTrip.has(s.id) && (!k || `${s.nickname} ${s.name} ${s.grade}`.toLowerCase().includes(k))).slice(0, 30)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students, branch.id, q, t.id])
  const rate = busRate(branch, null)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{`เพิ่มเด็กเข้า${KIND_LABEL[t.round.kind]} ${t.round.time}`}</DialogTitle>
          <DialogDescription>{`${fmtDate(t.date, { weekday: true })} เท่านั้น · ถ้าเด็กยังไม่ได้ซื้อรอบนี้ = รอบรถเพิ่ม เก็บในรายชื่อนักเรียน คิดในใบแจ้งหนี้รอบถัดไป`}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input autoFocus className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ชื่อเล่น / ชื่อ / ชั้น" />
        </div>
        <ul className="max-h-60 divide-y overflow-y-auto rounded-2xl border text-sm">
          {list.map((s) => (
            <li key={s.id}><button type="button" onClick={() => setPick(s.id)} className={pick === s.id ? "flex w-full items-center gap-2 bg-primary/10 px-3 py-2 text-left" : "flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/50"}>
              <span className="font-medium">{s.nickname}</span><span className="text-xs text-muted-foreground">{`${s.grade} · ${s.name}`}</span>
            </button></li>
          ))}
          {list.length === 0 && <li className="px-3 py-4 text-center text-xs text-muted-foreground">ไม่พบนักเรียน</li>}
        </ul>
        {t.round.kind === "both" && (
          <div className="flex gap-1.5">
            {(["dropoff", "pickup"] as const).map((k) => <button key={k} type="button" onClick={() => setLeg(k)} className={leg === k ? "h-8 rounded-full border border-primary bg-primary/10 px-3 text-sm font-medium text-primary" : "h-8 rounded-full border px-3 text-sm text-muted-foreground hover:bg-muted"}>{k === "pickup" ? "รับมาเรียน (P)" : "ส่งกลับบ้าน (D)"}</button>)}
          </div>
        )}
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={charge} onCheckedChange={(v) => setCharge(!!v)} />{`คิดค่ารถ ${fmtMoney(rate)} (ถ้ายังไม่ได้ซื้อรอบนี้)`}</label>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={adult} onCheckedChange={(v) => setAdult(!!v)} />ผู้ปกครองไปด้วย (+1 ที่นั่ง ไม่คิดเงิน)</label>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!pick} onClick={() => { if (pick && report(addRider(t.round.id, t.date, pick, { charge, adult, leg }), (v) => (v.charged ? `เพิ่มแล้ว · ${fmtMoney(v.charged)} รอเรียกเก็บในใบถัดไป` : "เพิ่มเข้าเที่ยวนี้แล้ว"))) onClose() }}>เพิ่ม</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** a one-off run for one day (new, or editing one) */
export function ExtraTripDialog({ branch, date, trip, onClose }: { branch: Branch; date: DateStr; trip?: BusTrip; onClose: () => void }) {
  const save = useStore((s) => s.saveExtraTrip)
  const vans = (branch.vehicles ?? []).filter((v) => v.active)
  const [d, setD] = useState<NonNullable<BusTrip["extra"]>>(trip?.extra ?? { kind: "dropoff", time: "17:00", seats: vans[0]?.seats ?? 10, vehicleId: vans[0]?.id, name: "" })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{trip ? "แก้เที่ยวพิเศษ" : "เพิ่มเที่ยวพิเศษ"}</DialogTitle>
          <DialogDescription>{`${fmtDate(date, { weekday: true })} วันเดียว — เช่น ทัศนศึกษา วันสอบ · เพิ่มเด็กเข้าเที่ยวได้หลังสร้าง`}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-xs">ประเภท</Label><NativeSelect className="h-9" value={d.kind} onChange={(e) => setD({ ...d, kind: e.target.value as "pickup" | "dropoff" | "both" })} options={[{ value: "pickup", label: "รอบรับ (P)" }, { value: "dropoff", label: "รอบส่ง (D)" }, { value: "both", label: "รับ-ส่ง (Both)" }]} /></div>
          <div className="space-y-1"><Label className="text-xs">{d.kind === "pickup" ? "ถึงสาขาก่อน" : "ออกจากสาขา"}</Label><Input type="time" value={d.time} onChange={(e) => setD({ ...d, time: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">รถ</Label><NativeSelect className="h-9" value={d.vehicleId ?? ""} placeholder="เลือกรถ" onChange={(e) => setD({ ...d, vehicleId: e.target.value || undefined })} options={vans.map((v) => ({ value: v.id, label: `${v.name} · ${v.driverName}` }))} /></div>
          <div className="space-y-1"><Label className="text-xs">ที่นั่ง</Label><Input type="number" min={1} value={d.seats} onChange={(e) => setD({ ...d, seats: Number(e.target.value) })} /></div>
          <div className="col-span-2 space-y-1"><Label className="text-xs">ชื่อเที่ยว (ไม่บังคับ)</Label><Input value={d.name ?? ""} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="เช่น ทัศนศึกษา" /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => { if (report(save(date, d, trip?.roundId, branch.id), trip ? "แก้เที่ยวพิเศษแล้ว" : "เพิ่มเที่ยวพิเศษแล้ว — กด + เพิ่มเด็ก ที่การ์ด")) onClose() }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** another van and / or driver for this trip that day (owner 2026-10-19: a van breaks down · "พี่เบ้งอาจจะลากลับบ้าน") */
export function DayCrewDialog({ t, branch, onClose }: { t: TripPlan; branch: Branch; onClose: () => void }) {
  const staff = useStore((s) => s.staff)
  const setVehicle = useStore((s) => s.setTripVehicle)
  const setDriver = useStore((s) => s.setTripDriver)
  const vans = (branch.vehicles ?? []).filter((v) => v.active)
  const drivers = staff.filter((x) => x.active && x.roles.includes("driver"))
  const [van, setVan] = useState(t.vehicle?.id ?? "")
  const [drv, setDrv] = useState(t.driver?.id ?? "")
  const save = () => {
    const usualVan = t.round.vehicleId ?? ""
    const okV = setVehicle(t.round.id, t.date, van && van !== usualVan ? van : null)
    const usualDrv = vans.find((v) => v.id === (van || usualVan))?.driverId ?? ""
    const okD = setDriver(t.round.id, t.date, drv && drv !== usualDrv ? drv : null)
    if (report(okV.ok ? okD : okV, "เปลี่ยนรถ / คนขับเฉพาะวันนี้แล้ว")) onClose()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>เปลี่ยนรถ / คนขับวันนี้</DialogTitle>
          <DialogDescription>{`${KIND_LABEL[t.round.kind]} ${t.round.time} · ${fmtDate(t.date, { weekday: true })} เท่านั้น — รอบประจำไม่เปลี่ยน`}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1"><Label className="text-xs">รถ</Label><NativeSelect className="h-9" value={van} onChange={(e) => setVan(e.target.value)} options={vans.map((v) => ({ value: v.id, label: `${v.name} · ${v.plate}` }))} /></div>
        <div className="space-y-1"><Label className="text-xs">คนขับ</Label><NativeSelect className="h-9" value={drv} placeholder="คนขับประจำรถ" onChange={(e) => setDrv(e.target.value)} options={drivers.map((d) => ({ value: d.id, label: `${d.nickname} · ${d.name}${d.vendor ? " (Outsource)" : ""}` }))} /></div>
        <p className="text-xs text-muted-foreground">คนขับ Outsource เพิ่มได้ที่แท็บ รถ & คนขับ</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={save}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
