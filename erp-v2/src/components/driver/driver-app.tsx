"use client"

// The driver's app (owner 2026-10-19: "เชื่อมกับ Line หรือสร้าง Web/App ใหม่ สำหรับ Driver"): opened from the link the
// school sends (in LINE or any browser) — no login, the secret in the link is the key. Today's trips in order; tap
// "เริ่มวิ่ง", then at each stop "ถึงแล้ว" (check in) and รับแล้ว / ส่งแล้ว (check out) or ไม่มา, then "จบเที่ยว". The office sees it live on Bus Route.
import { useCallback, useEffect, useMemo, useState } from "react"
import { BusIcon, CheckIcon, FlagIcon, LoaderCircleIcon, MapIcon, MapPinCheckIcon, NavigationIcon, PhoneIcon, PlayIcon, RotateCcwIcon, UserIcon, UserXIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Stop { key: string; nickname: string; name: string; grade: string; leg: "pickup" | "dropoff"; adult: boolean; phone: string; address?: string; addressNote?: string; loc?: { lat: number; lng: number }; eta: string | null }
interface Trip { tripId: string; driverName: string; branchName: string; date: string; kind: "pickup" | "dropoff" | "both"; time: string; name?: string; depart: string; finish: string; vehicle: { name: string; plate: string } | null; seats: number; used: number; km?: number; stops: Stop[] }
interface Ev { tripId: string; type: "start" | "arrive" | "done" | "noshow" | "finish"; stopKey?: string; at: string }

const KIND = { pickup: "รอบรับ", dropoff: "รอบส่ง", both: "รอบรับ-ส่ง" } as const
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
const dayLabel = (d: string) => { const x = new Date(`${d}T12:00:00`); return `${DAYS[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}` }

export function DriverApp({ token }: { token: string }) {
  const [trips, setTrips] = useState<Trip[] | null>(null)
  const [events, setEvents] = useState<Ev[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState("")
  const [day, setDay] = useState(today())
  const load = useCallback(() => fetch(`/api/driver/me?t=${encodeURIComponent(token)}`).then((r) => r.json()).then((j) => {
    if (!j.ok) { setError("ลิงก์นี้ใช้ไม่ได้ — ขอลิงก์ใหม่จากแอดมิน"); return }
    setTrips(j.trips); setEvents(j.events)
  }).catch(() => setError("เชื่อมต่อไม่ได้ — ลองใหม่อีกครั้ง")), [token])
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t) }, [load])
  const tap = async (tripId: string, type: string, stopKey?: string) => {
    setBusy(`${tripId}|${type}|${stopKey ?? ""}`)
    await fetch("/api/driver/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, tripId, type, stopKey }) }).catch(() => {})
    await load()
    setBusy("")
  }
  const days = useMemo(() => [...new Set((trips ?? []).map((t) => t.date))].sort(), [trips])
  const list = (trips ?? []).filter((t) => t.date === day).sort((a, b) => a.depart.localeCompare(b.depart))
  if (error) return <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-muted-foreground">{error}</div>
  if (!trips) return <div className="flex min-h-dvh items-center justify-center"><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></div>
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-muted/40 pb-10">
      <header className="sticky top-0 z-10 space-y-2 bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><BusIcon className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold">{`สวัสดีครับ ${trips[0]?.driverName ?? ""}`}</p><p className="text-xs text-muted-foreground">งานขับรถรับส่งของคุณ</p></div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(days.length ? days : [today()]).map((d) => (
            <button key={d} type="button" onClick={() => setDay(d)} className={cn("h-8 shrink-0 rounded-full px-3 text-sm", d === day ? "bg-primary font-medium text-primary-foreground" : "bg-muted text-muted-foreground")}>{d === today() ? "วันนี้" : dayLabel(d)}</button>
          ))}
        </div>
      </header>
      <main className="space-y-3 p-3">
        {list.length === 0 && <p className="rounded-2xl bg-background p-8 text-center text-sm text-muted-foreground">วันนี้ไม่มีงาน</p>}
        {list.map((t) => {
          const evs = events.filter((e) => e.tripId === t.tripId)
          const started = evs.find((e) => e.type === "start"), finished = evs.find((e) => e.type === "finish")
          // per stop: check in (arrive) and check out (done / no-show)
          const inOf = (k: string) => evs.filter((e) => e.stopKey === k && e.type === "arrive").at(-1)
          const mark = (k: string) => evs.filter((e) => e.stopKey === k && (e.type === "done" || e.type === "noshow")).at(-1)
          const nextKey = started && !finished ? t.stops.find((s) => !mark(s.key))?.key : undefined
          const doneCount = t.stops.filter((s) => mark(s.key)).length
          // ends at the last home: a drop-off run, or a Both run with nobody to bring back
          const endsHome = t.kind === "dropoff" || (t.kind === "both" && !t.stops.some((s) => s.leg === "pickup"))
          return (
            <section key={t.tripId} className={cn("overflow-hidden rounded-3xl bg-background shadow-sm", finished && "opacity-70")}>
              <div className="flex items-center gap-2 border-b px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{`${KIND[t.kind]} ${t.time}`}{t.name ? <span className="font-normal text-muted-foreground">{` · ${t.name}`}</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{`${t.vehicle ? `${t.vehicle.name} · ${t.vehicle.plate} · ` : ""}ออก ${t.depart} · ${endsHome ? "คนสุดท้าย" : "ถึงสาขา"} ${t.finish} · ${t.used}/${t.seats} ที่${t.km ? ` · ${t.km} กม.` : ""}`}</p>
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-medium", finished ? "bg-emerald-100 text-emerald-800" : started ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground")}>{finished ? `เสร็จ ${hhmm(finished.at)}` : started ? `${doneCount}/${t.stops.length}` : "ยังไม่เริ่ม"}</span>
              </div>
              {!started && (
                <button type="button" disabled={!!busy} onClick={() => tap(t.tripId, "start")} className="flex h-12 w-full items-center justify-center gap-2 bg-primary text-sm font-semibold text-primary-foreground disabled:opacity-60"><PlayIcon className="size-4" />{t.kind === "dropoff" ? `เริ่มวิ่ง — ออกจาก${t.branchName}` : "เริ่มวิ่ง"}</button>
              )}
              <ol className="divide-y">
                {t.stops.map((s, i) => {
                  const m = mark(s.key), ci = inOf(s.key), isNext = s.key === nextKey
                  return (
                    <li key={s.key} className={cn("space-y-2 px-4 py-3", isNext && "bg-primary/5")}>
                      <div className="flex items-start gap-3">
                        <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", m?.type === "done" ? "bg-emerald-500 text-white" : m?.type === "noshow" ? "bg-muted text-muted-foreground line-through" : isNext ? "bg-primary text-primary-foreground" : "bg-muted")}>{m?.type === "done" ? <CheckIcon className="size-4" /> : i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="flex flex-wrap items-center gap-1.5 font-medium">
                            <span className={cn("rounded-full px-1.5 text-[11px]", s.leg === "pickup" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900")}>{s.leg === "pickup" ? "รับ" : "ส่ง"}</span>
                            {s.nickname} <span className="text-xs font-normal text-muted-foreground">{s.grade}</span>
                            {s.adult && <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 text-[11px] text-violet-800"><UserIcon className="size-3" />+ผู้ปกครอง</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">{[s.addressNote, s.address].filter(Boolean).join(" · ") || "ไม่มีที่อยู่"}</p>
                        </div>
                        <span className="shrink-0 text-right text-sm font-medium tabular-nums">
                          {s.eta ?? "—"}<span className="block text-[11px] font-normal text-muted-foreground">ประมาณ</span>
                          {ci && <span className="block text-xs font-normal text-violet-700">{`ถึง ${hhmm(ci.at)}`}</span>}
                          {m && <span className={cn("block text-xs font-normal", m.type === "noshow" ? "text-muted-foreground" : "text-emerald-700")}>{m.type === "noshow" ? `ไม่มา ${hhmm(m.at)}` : `${s.leg === "pickup" ? "รับ" : "ส่ง"} ${hhmm(m.at)}`}</span>}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pl-10">
                        {s.phone && <a href={`tel:${s.phone.replace(/[^0-9+]/g, "")}`} className="flex h-9 items-center gap-1 rounded-full border px-3 text-xs"><PhoneIcon className="size-3.5" />โทร</a>}
                        {s.loc && <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.loc.lat},${s.loc.lng}`} target="_blank" rel="noreferrer" className="flex h-9 items-center gap-1 rounded-full border px-3 text-xs"><NavigationIcon className="size-3.5" />นำทาง</a>}
                        {started && !finished && (m ? (
                          <button type="button" onClick={() => tap(t.tripId, "undo", s.key)} className="flex h-9 items-center gap-1 rounded-full px-3 text-xs text-muted-foreground"><RotateCcwIcon className="size-3.5" />แก้</button>
                        ) : <>
                          {ci
                            ? <button type="button" disabled={!!busy} onClick={() => tap(t.tripId, "done", s.key)} className="flex h-9 items-center gap-1 rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white disabled:opacity-60"><CheckIcon className="size-3.5" />{s.leg === "pickup" ? "รับแล้ว" : "ส่งแล้ว"}</button>
                            : <button type="button" disabled={!!busy} onClick={() => tap(t.tripId, "arrive", s.key)} className={cn("flex h-9 items-center gap-1 rounded-full px-4 text-xs font-semibold disabled:opacity-60", isNext ? "bg-violet-600 text-white" : "border border-violet-300 text-violet-700")}><MapPinCheckIcon className="size-3.5" />ถึงแล้ว</button>}
                          <button type="button" disabled={!!busy} onClick={() => tap(t.tripId, "noshow", s.key)} className="flex h-9 items-center gap-1 rounded-full border px-3 text-xs text-red-700 disabled:opacity-60"><UserXIcon className="size-3.5" />ไม่มา</button>
                          {ci && <button type="button" onClick={() => tap(t.tripId, "undo", s.key)} className="flex h-9 items-center gap-1 rounded-full px-3 text-xs text-muted-foreground"><RotateCcwIcon className="size-3.5" />แก้</button>}
                        </>)}
                      </div>
                    </li>
                  )
                })}
              </ol>
              {started && !finished && (
                <button type="button" disabled={!!busy} onClick={() => tap(t.tripId, "finish")} className="flex h-12 w-full items-center justify-center gap-2 border-t text-sm font-semibold text-primary disabled:opacity-60"><FlagIcon className="size-4" />{endsHome ? "ส่งครบแล้ว — จบเที่ยว" : `ถึง${t.branchName}แล้ว — จบเที่ยว`}</button>
              )}
              {t.stops.some((s) => s.loc) && (
                <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/${t.stops.filter((s) => s.loc).map((s) => `${s.loc!.lat},${s.loc!.lng}`).join("/")}`} className="flex h-10 items-center justify-center gap-1.5 border-t text-xs text-muted-foreground"><MapIcon className="size-3.5" />เปิดเส้นทางทั้งหมดใน Google Maps</a>
              )}
            </section>
          )
        })}
      </main>
    </div>
  )
}
