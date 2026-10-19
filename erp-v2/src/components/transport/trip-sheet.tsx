"use client"

// The driver's sheet for one trip (owner 2026-10-19, from v1 "ตารางคนขับ"): the map, then every stop in order with the
// time, child, parent's phone and how to find the house. Copy as text for LINE, print, or mark it sent.
import { CopyIcon, PrinterIcon, SendIcon, UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate } from "@/domain/dates"
import { driverText, type TripPlan } from "@/domain/rules/transport"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { nm } from "@/lib/i18n"
import { toast } from "@/lib/toast"
import { useStore } from "@/store/store"
import { KIND_LABEL, TripStatus } from "./trip-card"
import { TripMap } from "./trip-map"

export function TripSheet({ t, branch, onClose }: { t: TripPlan; branch: Branch; onClose: () => void }) {
  const sendTrips = useStore((s) => s.sendTrips)
  const text = driverText(t, nm(branch.name), fmtDate(t.date, { weekday: true }))
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); toast.success("คัดลอกใบงานแล้ว — วางในแชท LINE ของคนขับได้เลย") } catch { toast.error("คัดลอกไม่ได้ — ลองกดพิมพ์แทน") }
  }
  const print = () => {
    const w = window.open("", "_blank", "width=720,height=900")
    if (!w) return toast.error("เบราว์เซอร์บล็อกหน้าต่างพิมพ์")
    const rows = t.stops.map((s, i) => `<tr><td>${i + 1}</td><td>${s.eta ?? "—"}</td><td>${s.rider.nickname}${s.rider.adult ? " (+ผู้ปกครอง)" : ""}<br><small>${s.rider.grade}</small></td><td>${s.rider.phone}</td><td>${[s.rider.addressNote, s.rider.address].filter(Boolean).join("<br>")}</td><td style="width:40px"></td></tr>`).join("")
    w.document.write(`<!doctype html><meta charset="utf-8"><title>ใบงานคนขับ</title><style>body{font:14px system-ui;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left;vertical-align:top}small{color:#666}</style>
      <h2>${KIND_LABEL[t.round.kind]} ${t.round.time}${t.round.name ? ` · ${t.round.name}` : ""} — ${fmtDate(t.date, { weekday: true, year: true })}</h2>
      <p>${t.vehicle ? `${t.vehicle.name} · ${t.vehicle.plate} · ${t.vehicle.driverName} ${t.vehicle.driverPhone}` : ""} · ที่นั่ง ${t.used}/${t.seats} · ${t.round.kind === "pickup" ? `ถึงสาขา ${t.finish}` : `ออกจากสาขา ${t.depart}`}</p>
      <table><tr><th>#</th><th>เวลา</th><th>นักเรียน</th><th>โทร</th><th>ที่อยู่ / ทางเข้า</th><th>✓</th></tr>${rows}</table>`)
    w.document.close()
    w.focus()
    w.print()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center gap-2">{`${KIND_LABEL[t.round.kind]} ${t.round.time}${t.round.name ? ` · ${t.round.name}` : ""}`} <TripStatus t={t} /></DialogTitle>
          <DialogDescription>{`${fmtDate(t.date, { weekday: true, year: true })} · ${t.vehicle ? `${t.vehicle.name} (${t.vehicle.plate}) · ${t.vehicle.driverName} ${t.vehicle.driverPhone}` : "ยังไม่ได้เลือกรถ"} · ที่นั่ง ${t.used}/${t.seats}`}</DialogDescription>
        </DialogHeader>
        {branch.location && <TripMap branch={branch.location} kind={t.round.kind} stops={t.stops.map((s) => ({ loc: s.rider.loc, label: s.rider.nickname }))} className="h-72 overflow-hidden rounded-2xl" />}
        <ol className="divide-y rounded-2xl border text-sm">
          {t.round.kind === "dropoff" && <li className="px-3 py-2 text-xs text-muted-foreground">{`${t.depart} ออกจากสาขา${nm(branch.name)}`}</li>}
          {t.stops.map((s, i) => (
            <li key={s.rider.studentId} className="flex items-start gap-3 px-3 py-2">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-rose-600 text-xs font-semibold text-white">{i + 1}</span>
              <span className="w-11 shrink-0 font-medium tabular-nums">{s.eta ?? "—"}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-medium">{s.rider.nickname} <span className="text-xs font-normal text-muted-foreground">{s.rider.grade}</span>{s.rider.adult && <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 text-[11px] text-violet-800"><UserIcon className="size-3" />ผู้ปกครองไปด้วย</span>}</span>
                <span className="block text-xs text-muted-foreground">{[s.rider.phone, s.rider.addressNote, s.rider.address].filter(Boolean).join(" · ") || "ยังไม่มีที่อยู่"}</span>
              </span>
              {s.rider.loc && <a className="shrink-0 text-xs text-primary underline" href={`https://www.google.com/maps/dir/?api=1&destination=${s.rider.loc.lat},${s.rider.loc.lng}`} target="_blank" rel="noreferrer">นำทาง</a>}
            </li>
          ))}
          {t.round.kind === "pickup" && <li className="px-3 py-2 text-xs text-muted-foreground">{`${t.finish} ถึงสาขา${nm(branch.name)}`}</li>}
        </ol>
        <DialogFooter className="sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={copy}><CopyIcon /> คัดลอกข้อความ</Button>
            <Button variant="outline" onClick={print}><PrinterIcon /> พิมพ์</Button>
          </div>
          <Button disabled={t.status === "sent"} onClick={() => { if (report(sendTrips([{ roundId: t.round.id, date: t.date, key: t.key }]), `ส่งใบงานให้${t.vehicle?.driverName ?? "คนขับ"}แล้ว`)) onClose() }}>
            <SendIcon /> {t.status === "changed" ? "ส่งใหม่" : "ส่งให้คนขับ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
