"use client"

// Bus zones (owner 2026-10-19 — "การแบ่ง Zone ของนักเรียน เพื่อให้รถวิ่งรับได้สะดวกมากขึ้น"): homes split by direction
// from the branch, one zone per van. The system draws the zones from where the homes are; the admin can rename,
// change the van, or put a home in another zone by hand (a house right on the border).
import { useMemo } from "react"
import { MapPinOffIcon, PinIcon, PlusIcon, TrashIcon, WandSparklesIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toDateStr } from "@/domain/dates"
import { distanceKm } from "@/domain/rules/bus"
import { busDaysOf } from "@/domain/rules/parent-view"
import { autoZones, compassDeg, ZONE_COLORS, zoneName, zoneOf } from "@/domain/rules/transport"
import type { Branch, BusZone, Family, Student } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { ZONE_DOT, ZoneMap } from "./zone-map"

interface Home { fam: Family; kids: Student[]; zone: BusZone | null; byHand: boolean; km: number | null }

export function ZonesView({ branch }: { branch: Branch }) {
  const today = toDateStr(useNow(60_000))
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const busAddOns = useStore((s) => s.busAddOns)
  const saveZones = useStore((s) => s.saveBusZones)
  const setFamilyZone = useStore((s) => s.setFamilyZone)
  const zones = useMemo(() => branch.busZones ?? [], [branch.busZones])
  const vans = (branch.vehicles ?? []).filter((v) => v.active)
  // the homes that ride the bus from this branch (paid rides ahead, or marked as a bus user)
  const homes = useMemo((): Home[] => {
    const riders = students.filter((s) => s.branchId === branch.id && !s.archived && s.familyId
      && (s.usesBus || [...busDaysOf(s.id, invoices, busAddOns).keys()].some((d) => d >= today)))
    const byFam = new Map<string, Student[]>()
    riders.forEach((s) => byFam.set(s.familyId!, [...(byFam.get(s.familyId!) ?? []), s]))
    return [...byFam.entries()].flatMap(([fid, kids]) => {
      const fam = families.find((f) => f.id === fid)
      if (!fam) return []
      const zone = zoneOf(fam, branch.location, zones)
      return [{ fam, kids, zone, byHand: !!fam.busZoneId && zones.some((z) => z.id === fam.busZoneId), km: fam.location && branch.location ? Math.round(distanceKm(branch.location, fam.location) * 10) / 10 : null }]
    }).sort((a, b) => (a.km ?? 99) - (b.km ?? 99))
  }, [students, families, invoices, busAddOns, branch, zones, today])
  const pinned = homes.filter((h) => h.fam.location)
  const auto = () => {
    const made = autoZones(pinned.map((h) => compassDeg(branch.location!, h.fam.location!)), Math.max(1, vans.length), vans.map((v) => v.id))
    report(saveZones(branch.id, made.map((z, i) => ({ ...z, id: zones[i]?.id ?? uid("zone") }))), `แบ่ง ${made.length} โซนตามทิศบ้านแล้ว — ${made.map((z) => z.name).join(" · ")}`)
  }
  const putZone = (id: string, patch: Partial<BusZone>) => report(saveZones(branch.id, zones.map((z) => (z.id === id ? { ...z, ...patch } : z))), "บันทึกโซนแล้ว")
  // owner 2026-10-19: zones can be added / removed by hand too — a new one takes the widest slice's second half
  const addZone = () => {
    const widest = [...zones].sort((a, b) => ((b.to - b.from + 360) % 360 || 360) - ((a.to - a.from + 360) % 360 || 360))[0]
    const span = widest ? ((widest.to - widest.from + 360) % 360 || 360) : 360
    const cut = widest ? Math.round((widest.from + span / 2) % 360) : 0
    const fresh: BusZone = { id: uid("zone"), name: zoneName(widest ? (cut + span / 4) % 360 : 0), color: ZONE_COLORS[zones.length % ZONE_COLORS.length], from: cut, to: widest ? widest.to : 360, vehicleId: vans[zones.length]?.id }
    report(saveZones(branch.id, [...zones.map((z) => (widest && z.id === widest.id ? { ...z, to: cut } : z)), fresh]), `เพิ่มโซน ${fresh.name} แล้ว — ปรับทิศได้`)
  }
  const removeZone = (z: BusZone) => {
    // its slice goes to the zone before it, so no home is left out
    const rest = zones.filter((x) => x.id !== z.id)
    const prev = rest.find((x) => x.to === z.from)
    report(saveZones(branch.id, rest.map((x) => (prev && x.id === prev.id ? { ...x, to: z.to } : x))), `ลบโซน ${z.name} แล้ว`)
  }

  if (!branch.location) return <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">ปักหมุดสาขาก่อน (ตั้งค่าสาขา › ค่าธรรมเนียม) — โซนวัดจากทิศของบ้านเทียบกับสาขา</p>
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-3xl bg-card p-4 text-sm shadow-sm ring-1 ring-foreground/5">
        <p className="min-w-0 flex-1 text-muted-foreground">
          {vans.length > 1 ? `มีรถ ${vans.length} คัน — เมื่อรถออกเวลาเดียวกัน เด็กขึ้นรถของโซนบ้านตัวเอง รถแต่ละคันวิ่งเฉพาะทิศของตัวเอง` : "มีรถคันเดียว — ยังไม่ต้องแบ่งโซน (แบ่งไว้ดูการกระจายบ้านได้)"}
        </p>
        <Button onClick={auto} disabled={!pinned.length}><WandSparklesIcon /> {zones.length ? "แบ่งโซนใหม่อัตโนมัติ" : "แบ่งโซนอัตโนมัติ"}</Button>
        <Button variant="outline" onClick={addZone}><PlusIcon /> เพิ่มโซน</Button>
        {zones.length > 0 && <Button variant="ghost" className="text-muted-foreground" onClick={() => report(saveZones(branch.id, []), "เลิกใช้โซนแล้ว — รถหลายคันแบ่งตามทิศเอง")}>ไม่ใช้โซน</Button>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <ZoneMap branch={branch.location} className="h-[28rem] overflow-hidden rounded-3xl shadow-sm ring-1 ring-foreground/5"
          zones={zones} homes={pinned.map((h) => ({ loc: h.fam.location!, color: h.zone?.color ?? "slate", label: `${h.kids.map((k) => k.nickname).join(", ")} · ${h.zone?.name ?? "ไม่มีโซน"}` }))} />

        <div className="space-y-3">
          {zones.length === 0 && <p className="rounded-3xl border border-dashed p-6 text-center text-sm text-muted-foreground">ยังไม่มีโซน — กด &quot;แบ่งโซนอัตโนมัติ&quot; ระบบแบ่งตามกลุ่มบ้านให้ หนึ่งโซนต่อรถหนึ่งคัน</p>}
          {zones.map((z) => {
            const members = homes.filter((h) => h.zone?.id === z.id)
            return (
              <section key={z.id} className="rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn("size-3 shrink-0 rounded-full", ZONE_DOT[z.color] ?? "bg-slate-400")} />
                  <Input className="h-8 min-w-28 flex-1 font-medium" defaultValue={z.name} onBlur={(e) => e.target.value.trim() && e.target.value !== z.name && putZone(z.id, { name: e.target.value.trim() })} />
                  <NativeSelect className="h-8 w-36" value={z.vehicleId ?? ""} placeholder="รถที่วิ่ง" onChange={(e) => putZone(z.id, { vehicleId: e.target.value || undefined })}
                    options={vans.map((v) => ({ value: v.id, label: `${v.name} · ${v.driverName}` }))} />
                  <span className="text-xs text-muted-foreground tabular-nums">{`${members.length} บ้าน · ${members.reduce((a, h) => a + h.kids.length, 0)} คน`}</span>
                  <Button size="icon-sm" variant="ghost" aria-label="ลบโซน" title="ลบโซน — พื้นที่รวมเข้ากับโซนข้างๆ" onClick={() => removeZone(z)}><TrashIcon /></Button>
                </div>
                {/* direction slice (degrees clockwise from north) + colour */}
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>ทิศ</span>
                  <Input key={`f${z.id}${z.from}`} type="number" min={0} max={359} className="h-8 w-16 text-right tabular-nums" defaultValue={z.from} onBlur={(e) => Number(e.target.value) !== z.from && putZone(z.id, { from: ((Number(e.target.value) % 360) + 360) % 360 })} />
                  <span>° ถึง</span>
                  <Input key={`t${z.id}${z.to}`} type="number" min={0} max={360} className="h-8 w-16 text-right tabular-nums" defaultValue={z.to} onBlur={(e) => Number(e.target.value) !== z.to && putZone(z.id, { to: ((Number(e.target.value) % 360) + 360) % 360 || 360 })} />
                  <span>° (0 = เหนือ · 90 = ตะวันออก · 180 = ใต้ · 270 = ตะวันตก)</span>
                  <span className="ml-auto flex gap-1">
                    {ZONE_COLORS.map((c) => <button key={c} type="button" aria-label={c} onClick={() => putZone(z.id, { color: c })} className={cn("size-5 rounded-full ring-offset-2", ZONE_DOT[c], z.color === c && "ring-2 ring-foreground/40")} />)}
                  </span>
                </div>
                <ul className="mt-2 divide-y text-sm">
                  {members.map((h) => <HomeRow key={h.fam.id} h={h} zones={zones} onZone={(zid) => report(setFamilyZone(h.fam.id, zid), zid ? "ย้ายโซนแล้ว" : "กลับไปตามทิศแล้ว")} />)}
                  {members.length === 0 && <li className="py-2 text-xs text-muted-foreground">ยังไม่มีบ้านในโซนนี้</li>}
                </ul>
              </section>
            )
          })}
          {homes.some((h) => !h.zone) && (
            <section className="rounded-3xl bg-amber-50 p-3 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900">
              <p className="mb-1 text-sm font-medium text-amber-900 dark:text-amber-100">{zones.length ? "ยังไม่อยู่ในโซน" : "บ้านที่นั่งรถ"}</p>
              <ul className="divide-y text-sm">
                {homes.filter((h) => !h.zone).map((h) => <HomeRow key={h.fam.id} h={h} zones={zones} onZone={(zid) => report(setFamilyZone(h.fam.id, zid), "ย้ายโซนแล้ว")} />)}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

function HomeRow({ h, zones, onZone }: { h: Home; zones: BusZone[]; onZone: (zoneId: string | null) => void }) {
  return (
    <li className="flex items-center gap-2 py-1.5">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate font-medium">{h.kids.map((k) => `${k.nickname} ${k.grade}`).join(", ")}{h.byHand && <span title="ตั้งโซนเอง"><PinIcon className="size-3 text-muted-foreground" /></span>}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {h.fam.location ? `${h.km} กม. · ${h.fam.name}` : <span className="inline-flex items-center gap-1 text-amber-700"><MapPinOffIcon className="size-3" />ยังไม่ปักหมุดบ้าน · {h.fam.name}</span>}
        </span>
      </span>
      {zones.length > 0 && (
        <NativeSelect className="h-8 w-32" value={h.byHand ? h.fam.busZoneId ?? "" : ""} placeholder="ตามทิศบ้าน" onChange={(e) => onZone(e.target.value || null)}
          options={zones.map((z) => ({ value: z.id, label: z.name }))} />
      )}
    </li>
  )
}
