"use client"

// One run on one day (owner 2026-10-19, Transport): who is on it in the order the van goes, when it reaches each home,
// seats, and what needs a look. The admin only moves / reorders / swaps the van / sends — the rest is worked out.
import { useState } from "react"
import { AlertTriangleIcon, ArrowDownIcon, ArrowUpIcon, ArrowRightLeftIcon, BusIcon, CheckIcon, ClockIcon, EllipsisIcon, LogInIcon, LogOutIcon, MapIcon, MapPinOffIcon, PinIcon, SendIcon, UserIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { TripPlan } from "@/domain/rules/transport"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { TripSheet } from "./trip-sheet"

export const KIND_LABEL = { pickup: "รอบรับ", dropoff: "รอบส่ง" } as const

export function TripStatus({ t }: { t: TripPlan }) {
  if (t.status === "sent") return <Pill tone="green"><CheckIcon className="size-3" />ส่งคนขับแล้ว</Pill>
  if (t.status === "changed") return <Pill tone="red"><AlertTriangleIcon className="size-3" />แก้หลังส่ง — ส่งใหม่</Pill>
  if (t.status === "scheduled") return <Pill tone="blue"><ClockIcon className="size-3" />{`จะส่งเอง ${t.autoAt}`}</Pill>
  return <Pill tone="gray">ยังไม่ส่ง</Pill>
}

export function TripCard({ t, branch, others }: { t: TripPlan; branch: Branch; others: TripPlan[] }) {
  const setOrder = useStore((s) => s.setTripOrder)
  const moveRider = useStore((s) => s.moveRider)
  const setVehicle = useStore((s) => s.setTripVehicle)
  const sendTrips = useStore((s) => s.sendTrips)
  const [sheet, setSheet] = useState(false)
  const Kind = t.round.kind === "pickup" ? LogInIcon : LogOutIcon
  const ids = t.stops.map((s) => s.rider.studentId)
  const move = (i: number, d: -1 | 1) => {
    const next = [...ids]
    ;[next[i], next[i + d]] = [next[i + d], next[i]]
    report(setOrder(t.round.id, t.date, next), "สลับลำดับแล้ว — เวลาแต่ละจุดคำนวณใหม่")
  }
  const sameKind = others.filter((o) => o.round.kind === t.round.kind && o.round.id !== t.round.id)
  const full = t.used > t.seats
  const vehicles = (branch.vehicles ?? []).filter((v) => v.active)
  return (
    <section className={cn("flex flex-col rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5", t.warnings.length && "ring-amber-300")}>
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", t.round.kind === "pickup" ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-800")}><Kind className="size-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{`${KIND_LABEL[t.round.kind]} ${t.round.time}`}{t.round.name && <span className="font-normal text-muted-foreground">{` · ${t.round.name}`}</span>}</p>
          <p className="text-xs text-muted-foreground tabular-nums">{t.round.kind === "pickup" ? `ออก ${t.depart} → ถึงสาขา ${t.finish}` : `ออกจากสาขา ${t.depart} → คนสุดท้าย ${t.finish}`}{t.km ? ` · ${t.km} กม.` : ""}</p>
        </div>
        <TripStatus t={t} />
      </header>

      <div className="flex flex-wrap items-center gap-2 px-4 pt-3 text-sm">
        <BusIcon className="size-4 text-muted-foreground" />
        <NativeSelect className="h-8 w-auto min-w-40" value={t.vehicle?.id ?? ""} placeholder="เลือกรถ"
          onChange={(e) => report(setVehicle(t.round.id, t.date, e.target.value || null), e.target.value !== t.round.vehicleId ? "เปลี่ยนรถเฉพาะวันนี้แล้ว" : "กลับไปใช้รถประจำรอบแล้ว")}
          options={vehicles.map((v) => ({ value: v.id, label: `${v.name} · ${v.driverName}` }))} />
        {t.substitute && <Pill tone="amber">รถแทนวันนี้</Pill>}
        <span className={cn("ml-auto rounded-full px-2.5 py-1 text-xs font-medium tabular-nums", full ? "bg-red-100 text-red-800" : "bg-muted text-muted-foreground")}>{`ที่นั่ง ${t.used}/${t.seats}`}</span>
      </div>

      {t.warnings.length > 0 && (
        <p className="mx-4 mt-2 flex items-start gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          <AlertTriangleIcon className="mt-0.5 size-3.5 shrink-0" />{t.warnings.join(" · ")}
        </p>
      )}

      <ol className="flex-1 divide-y px-2 py-2">
        {t.stops.length === 0 && <li className="px-2 py-6 text-center text-sm text-muted-foreground">ไม่มีใครนั่งรอบนี้</li>}
        {t.stops.map((s, i) => (
          <li key={s.rider.studentId} className="flex items-center gap-2.5 px-2 py-2 text-sm">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
            <span className="w-11 shrink-0 text-xs font-medium tabular-nums">{s.eta ?? "—"}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 truncate font-medium">
                {s.rider.nickname}
                <span className="text-xs font-normal text-muted-foreground">{s.rider.grade}</span>
                {s.rider.adult && <span title="ผู้ปกครองนั่งไปด้วย (+1 ที่นั่ง ไม่คิดเงิน)" className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 text-[11px] text-violet-800"><UserIcon className="size-3" />+1</span>}
                {s.rider.pinned && <span title="ย้ายมารอบนี้เอง"><PinIcon className="size-3 text-muted-foreground" /></span>}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {!s.rider.loc ? <span className="inline-flex items-center gap-1 text-amber-700"><MapPinOffIcon className="size-3" />ยังไม่ปักหมุดบ้าน</span> : [s.km !== null && `${s.km} กม.`, s.rider.addressNote, s.rider.phone].filter(Boolean).join(" · ")}
              </span>
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="จัดการ" />}><EllipsisIcon /></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled={i === 0} onClick={() => move(i, -1)}><ArrowUpIcon /> เลื่อนขึ้น</DropdownMenuItem>
                <DropdownMenuItem disabled={i === t.stops.length - 1} onClick={() => move(i, 1)}><ArrowDownIcon /> เลื่อนลง</DropdownMenuItem>
                {sameKind.length > 0 && (
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger><ArrowRightLeftIcon /> ย้ายไปรอบอื่น</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuGroup>
                        <DropdownMenuLabel>{KIND_LABEL[t.round.kind]}</DropdownMenuLabel>
                        {sameKind.map((o) => <DropdownMenuItem key={o.round.id} onClick={() => report(moveRider(t.date, s.rider.studentId, o.round.id), `ย้าย${s.rider.nickname}ไปรอบ ${o.round.time} แล้ว`)}>{`${o.round.time}${o.round.name ? ` · ${o.round.name}` : ""} · ${o.used}/${o.seats}`}</DropdownMenuItem>)}
                      </DropdownMenuGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                )}
                {s.rider.loc && <DropdownMenuItem render={<a href={`https://www.google.com/maps?q=${s.rider.loc.lat},${s.rider.loc.lng}`} target="_blank" rel="noreferrer" />}><MapIcon /> เปิดแผนที่บ้าน</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ol>

      <footer className="flex items-center gap-2 border-t px-4 py-2.5">
        <Button size="sm" variant="ghost" onClick={() => setSheet(true)} disabled={!t.stops.length}><MapIcon /> แผนที่ & ใบงานคนขับ</Button>
        <Button size="sm" className="ml-auto" variant={t.status === "sent" ? "outline" : "default"} disabled={!t.stops.length || t.status === "sent"}
          onClick={() => report(sendTrips([{ roundId: t.round.id, date: t.date, key: t.key }]), `ส่งใบงานให้${t.vehicle?.driverName ?? "คนขับ"}แล้ว`)}>
          <SendIcon /> {t.status === "changed" ? "ส่งใหม่" : t.status === "sent" ? "ส่งแล้ว" : "ส่งให้คนขับ"}
        </Button>
      </footer>
      {sheet && <TripSheet t={t} branch={branch} onClose={() => setSheet(false)} />}
    </section>
  )
}
