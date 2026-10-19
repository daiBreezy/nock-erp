"use client"

// Where the bus homes are (owner 2026-10-19: "เอา Location เหล่านั้นไป Analyze ได้ว่า จุดไหนมีความหนาแน่น และจะวาง Zone ใน
// รูปแบบไหน ให้สามารถเดินรถได้อย่างสะดวก และถูกต้อง"): how many homes are pinned, where they bunch up, and the ways to
// split them into zones side by side — the system marks the best one, the admin applies it (or sets zones by hand).
import { CheckIcon, MapPinHouseIcon, MapPinOffIcon, SparklesIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Hotspot, ZoneOption } from "@/domain/rules/zone-analysis"
import { cn } from "@/lib/utils"
import { ZONE_DOT } from "./zone-map"

export function ZoneAnalysisCard({ homes, kids, pinned, spots, options, current, onApply }: {
  homes: number; kids: number; pinned: number; spots: Hotspot[]; options: ZoneOption[]
  /** how many zones the branch has now */
  current: number
  onApply: (o: ZoneOption) => void
}) {
  const missing = homes - pinned
  return (
    <section className="space-y-4 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <h3 className="flex items-center gap-2 font-semibold"><SparklesIcon className="size-4 text-primary" />วิเคราะห์ตำแหน่งบ้าน</h3>
        <span className="text-sm"><b className="tabular-nums">{homes}</b> บ้านที่ใช้รถ <span className="text-muted-foreground">{`(${kids} คน)`}</span></span>
        <span className="flex items-center gap-1 text-sm"><MapPinHouseIcon className="size-4 text-emerald-600" /><b className="tabular-nums">{pinned}</b> ปักหมุดแล้ว</span>
        {missing > 0 && <span className="flex items-center gap-1 text-sm text-amber-700"><MapPinOffIcon className="size-4" /><b className="tabular-nums">{missing}</b> ยังไม่มีหมุด — ขอจากผู้ปกครองได้ในตารางด้านล่าง</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.6fr]">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">จุดที่บ้านหนาแน่น (บ้านห่างกันไม่เกิน 1 กม.)</p>
          {spots.length === 0 ? <p className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">บ้านยังกระจายกัน ไม่มีจุดที่รวมกันหลายบ้าน</p> : (
            <ol className="space-y-1">
              {spots.slice(0, 5).map((s, i) => (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-1.5 text-sm">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-rose-100 text-[11px] font-semibold text-rose-700">{i + 1}</span>
                  <span className="min-w-0 flex-1">{`${s.direction} · ${s.km} กม. จากสาขา`}</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{`${s.homes} บ้าน · ${s.kids} คน`}</span>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">แบบการแบ่งโซน — รถออกพร้อมกัน 1 โซนต่อรถ 1 คัน · เวลา = รถวิ่งจากบ้านไกลสุดเข้าสาขา</p>
          {options.length === 0 ? <p className="rounded-2xl border border-dashed p-3 text-center text-xs text-muted-foreground">ยังไม่มีบ้านที่ปักหมุด</p> : options.map((o) => (
            <div key={o.count} className={cn("space-y-1.5 rounded-2xl p-3 ring-1", o.recommended ? "bg-primary/5 ring-primary/30" : "ring-foreground/10")}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{o.count === 1 ? "ไม่แบ่ง (1 โซน)" : `${o.count} โซน`}</span>
                {o.recommended && <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">แนะนำ</span>}
                {o.count === current && <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">ใช้อยู่</span>}
                <span className="ml-auto text-xs text-muted-foreground tabular-nums">{`นานสุด ~${o.longest} นาที · รวม ${o.totalKm} กม. · มากสุด ${o.peak}/${o.seats} ที่ต่อเที่ยว`}</span>
                <Button size="xs" variant={o.recommended ? "default" : "outline"} onClick={() => onApply(o)}><CheckIcon /> ใช้แบบนี้</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {o.zones.map((z, i) => (
                  <span key={i} className={cn("inline-flex items-center gap-1.5 rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-foreground/10", z.peak > o.seats && "text-red-700 ring-red-300")}>
                    <span className={cn("size-2 rounded-full", ZONE_DOT[z.zone.color] ?? "bg-slate-400")} />
                    {`${z.zone.name} · ${z.homes} บ้าน · ไกลสุด ${z.farthestKm} กม. · ~${z.minutes} นาที · ${z.peak}/${o.seats} ที่`}
                  </span>
                ))}
              </div>
              {o.recommended && o.why && <p className="text-xs text-muted-foreground">{o.why}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
