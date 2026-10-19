"use client"

// Bus Route chips (owner 2026-10-19 ref): trip type P / D / Both, trip status (Pending → Approved → OTW → Done),
// stop status (Done / OTW / Next / Cancel), the van badge and the driver — one look everywhere on the page.
import { ArrowLeftRightIcon, BanIcon, BusIcon, CheckCheckIcon, ClockIcon, FlagIcon, MapPinIcon, PencilIcon, UserXIcon } from "lucide-react"
import type { StopStatus, TripPlan, DriverInfo } from "@/domain/rules/transport"
import type { BusRound, BusZone } from "@/domain/types"
import { cn } from "@/lib/utils"
import { ZONE_DOT } from "./zone-map"

export const KIND_LABEL: Record<BusRound["kind"], string> = { pickup: "รอบรับ", dropoff: "รอบส่ง", both: "รอบรับ-ส่ง" }

/** P = pickup · D = drop-off · Both — as in the ref */
export function TripTypeChip({ kind, short }: { kind: BusRound["kind"] | "pickup" | "dropoff"; short?: boolean }) {
  const cfg = kind === "pickup" ? { Icon: MapPinIcon, s: "P", l: "รับ", tone: "bg-sky-100 text-sky-800" } : kind === "dropoff" ? { Icon: FlagIcon, s: "D", l: "ส่ง", tone: "bg-amber-100 text-amber-900" } : { Icon: ArrowLeftRightIcon, s: "Both", l: "รับ-ส่ง", tone: "bg-emerald-100 text-emerald-800" }
  return <span title={cfg.l} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", cfg.tone)}><cfg.Icon className="size-3" />{short ? cfg.s : cfg.l}</span>
}

export function TripStatusChip({ t }: { t: TripPlan }) {
  const m: Record<TripPlan["status"], { l: string; tone: string; Icon?: typeof ClockIcon }> = {
    draft: { l: "รออนุมัติ", tone: "bg-amber-100 text-amber-900" },
    scheduled: { l: `จะส่งเอง ${t.autoAt ?? ""}`, tone: "bg-sky-100 text-sky-800", Icon: ClockIcon },
    sent: { l: "อนุมัติแล้ว", tone: "bg-sky-100 text-sky-800", Icon: CheckCheckIcon },
    changed: { l: "แก้หลังส่ง", tone: "bg-red-100 text-red-800", Icon: PencilIcon },
    otw: { l: "กำลังวิ่ง", tone: "bg-red-600 text-white" },
    done: { l: "เสร็จแล้ว", tone: "bg-emerald-100 text-emerald-800", Icon: CheckCheckIcon },
    cancelled: { l: "ยกเลิก", tone: "bg-muted text-muted-foreground", Icon: BanIcon },
  }
  const c = m[t.status]
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", c.tone)}>{c.Icon && <c.Icon className="size-3" />}{c.l}</span>
}

export function StopStatusChip({ s }: { s: StopStatus }) {
  if (s === "waiting") return null
  const m: Record<Exclude<StopStatus, "waiting">, { l: string; tone: string; Icon?: typeof ClockIcon }> = {
    done: { l: "เสร็จ", tone: "text-emerald-700", Icon: CheckCheckIcon },
    otw: { l: "กำลังไป", tone: "bg-red-600 text-white" },
    next: { l: "ถัดไป", tone: "bg-sky-100 text-sky-800" },
    noshow: { l: "ไม่มา", tone: "bg-muted text-muted-foreground", Icon: UserXIcon },
    cancel: { l: "ยกเลิก", tone: "text-red-700 ring-1 ring-red-300", Icon: BanIcon },
  }
  const c = m[s]
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", c.tone)}>{c.Icon && <c.Icon className="size-3" />}{c.l}</span>
}

const VAN_TONES = ["bg-amber-100 text-amber-700", "bg-rose-100 text-rose-700", "bg-teal-100 text-teal-700", "bg-violet-100 text-violet-700", "bg-sky-100 text-sky-700"]
/** each van its own colour (by its position in the fleet) */
export function VanBadge({ index, name, plate }: { index: number; name: string; plate?: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", VAN_TONES[index % VAN_TONES.length])}><BusIcon className="size-4" /></span>
      <span className="min-w-0"><span className="block truncate text-sm font-medium">{name}</span>{plate && <span className="block truncate text-xs text-muted-foreground">{plate}</span>}</span>
    </span>
  )
}
export const vanTone = (index: number) => VAN_TONES[index % VAN_TONES.length]

/** zone as its letter (A, B …) in the zone colour — the full name on hover */
export function ZoneChip({ zone, index }: { zone?: BusZone; index: number }) {
  if (!zone) return <span className="text-xs text-muted-foreground">—</span>
  return <span title={zone.name} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"><span className={cn("size-2 rounded-full", ZONE_DOT[zone.color] ?? "bg-slate-400")} />{String.fromCharCode(65 + index)}</span>
}

export function DriverCell({ d, changed }: { d: DriverInfo | null; changed?: boolean }) {
  if (!d) return <span className="text-xs text-amber-700">ยังไม่มีคนขับ</span>
  return (
    <span className="flex min-w-0 items-center gap-2">
      {d.photo ? <img src={d.photo} alt="" className="size-8 shrink-0 rounded-full object-cover" /> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lime-100 text-xs font-semibold text-lime-800">{d.nickname.replace(/^(พี่|น้า|ลุง)/, "").slice(0, 1)}</span>}
      <span className="min-w-0">
        <span className="flex items-center gap-1 truncate text-sm font-medium">{d.nickname}{d.vendor && <span className="rounded-full bg-muted px-1.5 text-[10px] font-normal text-muted-foreground">Outsource</span>}{changed && <span className="rounded-full bg-amber-100 px-1.5 text-[10px] font-normal text-amber-800">แทนวันนี้</span>}</span>
        <span className="block truncate text-xs text-muted-foreground">{d.name}</span>
      </span>
    </span>
  )
}
