"use client"

// The driver's app (owner 2026-10-19: "เชื่อมกับ Line หรือสร้าง Web/App ใหม่ สำหรับ Driver"): opened from the link the
// school sends (in LINE or any browser) — no login, the secret in the link is the key. The office sees it live on Bus Route.
// Owner 2026-10-20: the first page is a list of trips; tap one to see only that drive — where it starts, every stop in
// order, where it ends — with the stop to go to now on top. The action is a big two-button bar at the bottom, easy to
// reach while driving: left = the negative one (ไม่มา / กลับ / แก้), right = the next step (เริ่มวิ่ง → ถึงแล้ว →
// รับแล้ว / ส่งแล้ว → จบเที่ยว).
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeftIcon, BusIcon, CheckIcon, ChevronRightIcon, FlagIcon, LoaderCircleIcon, MapIcon, MapPinCheckIcon, NavigationIcon, PhoneIcon, PlayIcon, RotateCcwIcon, SchoolIcon, UserIcon, UserXIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface Stop { key: string; nickname: string; name: string; grade: string; leg: "pickup" | "dropoff"; adult: boolean; phone: string; address?: string; addressNote?: string; loc?: { lat: number; lng: number }; eta: string | null }
interface Trip { tripId: string; driverName: string; branchName: string; date: string; kind: "pickup" | "dropoff" | "both"; time: string; name?: string; depart: string; finish: string; vehicle: { name: string; plate: string } | null; seats: number; used: number; km?: number; stops: Stop[] }
interface Ev { tripId: string; type: "start" | "arrive" | "done" | "noshow" | "finish"; stopKey?: string; at: string }

const KIND = { pickup: "รอบรับ", dropoff: "รอบส่ง", both: "รอบรับ-ส่ง" } as const
const hhmm = (iso: string) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` }
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }
const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."]
const dayLabel = (d: string) => { const x = new Date(`${d}T12:00:00`); return `${DAYS[x.getDay()]} ${x.getDate()}/${x.getMonth() + 1}` }

/** where a trip is: started / finished, each stop's check in + check out, and the stop to go to now */
function progress(t: Trip, events: Ev[]) {
  const evs = events.filter((e) => e.tripId === t.tripId)
  const started = evs.find((e) => e.type === "start"), finished = evs.find((e) => e.type === "finish")
  const inOf = (k: string) => evs.filter((e) => e.stopKey === k && e.type === "arrive").at(-1)
  const outOf = (k: string) => evs.filter((e) => e.stopKey === k && (e.type === "done" || e.type === "noshow")).at(-1)
  const current = started && !finished ? t.stops.find((s) => !outOf(s.key)) : undefined
  const done = t.stops.filter((s) => outOf(s.key)).length
  // the last stop with a mark — what "แก้ล่าสุด" takes back
  const lastMarked = [...evs].filter((e) => e.stopKey).sort((a, b) => a.at.localeCompare(b.at)).at(-1)?.stopKey
  return { started, finished, inOf, outOf, current, done, lastMarked }
}

export function DriverApp({ token }: { token: string }) {
  const [trips, setTrips] = useState<Trip[] | null>(null)
  const [name, setName] = useState("")
  const [events, setEvents] = useState<Ev[]>([])
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [day, setDay] = useState(today())
  const [openId, setOpenId] = useState<string | null>(null)
  const load = useCallback(() => fetch(`/api/driver/me?t=${encodeURIComponent(token)}`).then((r) => r.json()).then((j) => {
    if (!j.ok) { setError("ลิงก์นี้ใช้ไม่ได้ — ขอลิงก์ใหม่จากแอดมิน"); return }
    setTrips(j.trips); setEvents(j.events); setName(j.driverName ?? j.trips[0]?.driverName ?? "")
  }).catch(() => setError("เชื่อมต่อไม่ได้ — ลองใหม่อีกครั้ง")), [token])
  useEffect(() => { load(); const t = setInterval(load, 30_000); return () => clearInterval(t) }, [load])
  const tap = async (tripId: string, type: string, stopKey?: string) => {
    setBusy(true)
    await fetch("/api/driver/event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, tripId, type, stopKey }) }).catch(() => {})
    await load()
    setBusy(false)
  }
  const days = useMemo(() => [...new Set((trips ?? []).map((t) => t.date))].sort(), [trips])
  const list = (trips ?? []).filter((t) => t.date === day).sort((a, b) => a.depart.localeCompare(b.depart))
  const open = (trips ?? []).find((t) => t.tripId === openId)
  if (error) return <div className="flex min-h-dvh items-center justify-center p-6 text-center text-sm text-muted-foreground">{error}</div>
  if (!trips) return <div className="flex min-h-dvh items-center justify-center"><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></div>
  if (open) return <TripView t={open} events={events} busy={busy} onBack={() => setOpenId(null)} onTap={(type, key) => tap(open.tripId, type, key)} />
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-muted/40 pb-10">
      <header className="sticky top-0 z-10 space-y-2 bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BusIcon className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="font-semibold">{`สวัสดีครับ ${name}`}</p><p className="text-xs text-muted-foreground">งานขับรถรับส่งของคุณ — แตะรอบที่จะขับ</p></div>
        </div>
        <div className="flex gap-1.5 overflow-x-auto">
          {(days.length ? days : [today()]).map((d) => (
            <button key={d} type="button" onClick={() => setDay(d)} className={cn("h-9 shrink-0 rounded-full px-4 text-sm", d === day ? "bg-primary font-medium text-primary-foreground" : "bg-muted text-muted-foreground")}>{d === today() ? "วันนี้" : dayLabel(d)}</button>
          ))}
        </div>
      </header>
      <main className="space-y-2.5 p-3">
        {/* owner 2026-10-20: say why it's empty — jobs appear once the office approves them (the page checks every 30 s) */}
        {list.length === 0 && (
          <div className="space-y-1 rounded-3xl bg-background p-8 text-center">
            <p className="font-medium">ยังไม่มีงานวันนี้</p>
            <p className="text-sm text-foreground/70">งานจะขึ้นที่นี่เมื่อแอดมินอนุมัติเที่ยวรถให้คุณ — หน้านี้อัปเดตเองทุก 30 วินาที</p>
          </div>
        )}
        {list.map((t) => {
          const p = progress(t, events)
          return (
            <button key={t.tripId} type="button" onClick={() => setOpenId(t.tripId)}
              className={cn("block w-full space-y-3 rounded-3xl bg-background p-4 text-left shadow-sm ring-1 ring-foreground/10", p.finished && "bg-muted/60", p.started && !p.finished && "ring-2 ring-primary")}>
              {/* top row, centred: type · trip · status + chevron side by side (owner 2026-10-20) */}
              <span className="flex items-center gap-3">
                <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl text-lg font-bold", t.kind === "dropoff" ? "bg-amber-200 text-amber-950" : t.kind === "pickup" ? "bg-sky-200 text-sky-950" : "bg-emerald-200 text-emerald-950")}>{t.kind === "pickup" ? "P" : t.kind === "dropoff" ? "D" : "P+D"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg leading-tight font-semibold">{`${KIND[t.kind]} ${t.time}`}</span>
                  {t.name && <span className="block truncate text-sm text-foreground/70">{t.name}</span>}
                </span>
                <span className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold whitespace-nowrap", p.finished ? "bg-emerald-600 text-white" : p.started ? "bg-red-600 text-white" : "bg-foreground/10 text-foreground/80")}>
                  {p.finished ? `เสร็จ ${hhmm(p.finished.at)}` : p.started ? `กำลังวิ่ง ${p.done}/${t.stops.length}` : "ยังไม่เริ่ม"}
                </span>
                <ChevronRightIcon className="size-6 shrink-0 text-foreground/50" />
              </span>
              {/* the details, full width */}
              <span className="block space-y-1.5 rounded-2xl bg-muted/50 p-3">
                <span className="block text-base font-semibold tabular-nums">{`ออก ${p.started ? hhmm(p.started.at) : t.depart} → ${t.kind === "pickup" ? "ถึงสาขา" : "กลับถึงสาขา"} ${p.finished ? hhmm(p.finished.at) : t.finish}`}</span>
                {/* who, in the order the van goes */}
                <span className="line-clamp-2 block text-sm text-foreground/85">{t.stops.map((x) => `${x.leg === "pickup" ? "รับ" : "ส่ง"}${x.nickname}`).join(" → ")}</span>
                <span className="block text-sm text-foreground/65">{`${t.stops.length} จุด · ${t.used}/${t.seats} ที่${t.km ? ` · ${t.km} กม.` : ""}${t.vehicle ? ` · ${t.vehicle.name} ${t.vehicle.plate}` : ""}`}</span>
                {p.started && !p.finished && <span className="block h-2 overflow-hidden rounded-full bg-background"><span className="block h-full rounded-full bg-primary" style={{ width: `${(p.done / Math.max(1, t.stops.length)) * 100}%` }} /></span>}
              </span>
            </button>
          )
        })}
      </main>
    </div>
  )
}

/** one drive: start → every stop → end, the current stop up front, the next step in the bottom bar */
function TripView({ t, events, busy, onBack, onTap }: { t: Trip; events: Ev[]; busy: boolean; onBack: () => void; onTap: (type: string, stopKey?: string) => void }) {
  const p = progress(t, events)
  const cur = p.current
  const curIn = cur ? p.inOf(cur.key) : undefined
  const verb = (s: Stop) => (s.leg === "pickup" ? "รับ" : "ส่ง")
  // the bottom bar: left = negative, right = the next step
  const bar: { left: { label: string; icon: typeof CheckIcon; onClick: () => void; tone: "neutral" | "danger" }; right?: { label: string; icon: typeof CheckIcon; onClick: () => void; tone: string } } =
    p.finished ? { left: { label: "กลับไปรายการ", icon: ArrowLeftIcon, onClick: onBack, tone: "neutral" } }
      : !p.started ? { left: { label: "กลับ", icon: ArrowLeftIcon, onClick: onBack, tone: "neutral" }, right: { label: t.kind === "pickup" ? "เริ่มวิ่ง" : `เริ่มวิ่ง — ออกจาก${t.branchName}`, icon: PlayIcon, onClick: () => onTap("start"), tone: "bg-primary text-primary-foreground" } }
        : cur ? { left: { label: "ไม่มา", icon: UserXIcon, onClick: () => onTap("noshow", cur.key), tone: "danger" }, right: curIn
          ? { label: `${verb(cur)}${cur.nickname}แล้ว`, icon: CheckIcon, onClick: () => onTap("done", cur.key), tone: "bg-emerald-600 text-white" }
          : { label: `ถึงบ้าน${cur.nickname}แล้ว`, icon: MapPinCheckIcon, onClick: () => onTap("arrive", cur.key), tone: "bg-violet-600 text-white" } }
          : { left: { label: "แก้ล่าสุด", icon: RotateCcwIcon, onClick: () => p.lastMarked && onTap("undo", p.lastMarked), tone: "neutral" }, right: { label: t.kind === "pickup" ? `ถึง${t.branchName}แล้ว — จบเที่ยว` : `กลับถึง${t.branchName} — คืนกุญแจ`, icon: FlagIcon, onClick: () => onTap("finish"), tone: "bg-primary text-primary-foreground" } }
  const navAll = t.stops.filter((s) => s.loc)
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-muted/40 pb-32">
      <header className="sticky top-0 z-10 bg-background/95 px-3 py-2.5 shadow-sm backdrop-blur">
        <div className="flex items-center gap-2">
          <button type="button" onClick={onBack} aria-label="กลับ" className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-muted"><ArrowLeftIcon className="size-5" /></button>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{`${KIND[t.kind]} ${t.time}`}{t.name ? <span className="font-normal text-muted-foreground">{` · ${t.name}`}</span> : null}</p>
            <p className="truncate text-xs text-muted-foreground">{`${t.vehicle ? `${t.vehicle.name} · ${t.vehicle.plate} · ` : ""}${t.used}/${t.seats} ที่${t.km ? ` · ${t.km} กม.` : ""}`}</p>
          </div>
          <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-medium", p.finished ? "bg-emerald-100 text-emerald-800" : p.started ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground")}>
            {p.finished ? `เสร็จ ${hhmm(p.finished.at)}` : p.started ? `${p.done}/${t.stops.length}` : "ยังไม่เริ่ม"}
          </span>
        </div>
        {p.started && <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.done / Math.max(1, t.stops.length)) * 100}%` }} /></div>}
      </header>

      <main className="space-y-3 p-3">
        {/* the stop to go to now — big, with call / navigate */}
        {cur && (
          <section className="space-y-3 rounded-3xl bg-background p-4 shadow-sm ring-2 ring-primary">
            <p className="text-xs font-medium text-primary">{curIn ? `ถึงแล้ว ${hhmm(curIn.at)} — รอ${verb(cur)}เด็ก` : "ไปที่นี่ต่อ"}</p>
            <div>
              <p className="flex flex-wrap items-center gap-1.5 text-xl font-semibold">
                <span className={cn("rounded-full px-2 py-0.5 text-xs", cur.leg === "pickup" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900")}>{verb(cur)}</span>
                {cur.nickname} <span className="text-sm font-normal text-muted-foreground">{cur.grade}</span>
                {cur.adult && <span className="flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 text-xs font-normal text-violet-800"><UserIcon className="size-3" />+ผู้ปกครอง</span>}
              </p>
              <Address className="mt-1 text-base text-foreground/80" text={[cur.addressNote, cur.address].filter(Boolean).join(" · ")} />
              <p className="mt-1 text-sm tabular-nums">{`ประมาณ ${cur.eta ?? "—"}`}</p>
            </div>
            {/* owner 2026-10-20: "ยังไม่ถึง" is a proper button on the same line as call / navigate */}
            <div className={cn("grid gap-2", curIn ? "grid-cols-3" : "grid-cols-2")}>
              {cur.phone ? <a href={`tel:${cur.phone.replace(/[^0-9+]/g, "")}`} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium"><PhoneIcon className="size-4 shrink-0" />{curIn ? "โทร" : "โทรผู้ปกครอง"}</a> : <span />}
              {cur.loc ? <a href={`https://www.google.com/maps/dir/?api=1&destination=${cur.loc.lat},${cur.loc.lng}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border text-sm font-medium"><NavigationIcon className="size-4 shrink-0" />นำทาง</a> : <span />}
              {curIn && <button type="button" disabled={busy} onClick={() => onTap("undo", cur.key)} className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-amber-300 bg-amber-50 text-sm font-medium text-amber-900 disabled:opacity-50"><RotateCcwIcon className="size-4 shrink-0" />ยังไม่ถึง</button>}
            </div>
          </section>
        )}

        {/* the whole drive: from → each stop → to — every stop with its estimate, check in and check out (owner 2026-10-20) */}
        <section className="overflow-hidden rounded-3xl bg-background shadow-sm">
          <p className="border-b px-4 py-2.5 text-xs font-medium text-muted-foreground">เส้นทางรอบนี้</p>
          <ol className="divide-y">
            <EndRow icon={t.kind === "pickup" ? <BusIcon className="size-4" /> : <SchoolIcon className="size-4" />}
              title={t.kind === "pickup" ? "เริ่มวิ่ง — ไปบ้านแรก" : `ออกจาก${t.branchName}`} label={p.started ? "ออกแล้ว" : "เวลาออก"} time={p.started ? hhmm(p.started.at) : t.depart} done={!!p.started} />
            {t.stops.map((s, i) => {
              const out = p.outOf(s.key), inn = p.inOf(s.key), now = s.key === cur?.key
              return (
                <li key={s.key} className={cn("px-4 py-3", now && "bg-primary/10 shadow-[inset_4px_0_0_var(--primary)]", out && "bg-muted/50")}>
                  <div className="flex items-center gap-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                      out?.type === "done" ? "bg-emerald-500 text-white" : out?.type === "noshow" ? "bg-red-100 text-red-700" : now ? "bg-primary text-primary-foreground" : "bg-muted")}>
                      {out?.type === "done" ? <CheckIcon className="size-4" /> : out?.type === "noshow" ? <UserXIcon className="size-4" /> : i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <span className={cn("shrink-0 rounded-full px-1.5 text-[11px]", s.leg === "pickup" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900")}>{verb(s)}</span>
                        <span className="truncate">{s.nickname}</span>
                        {s.adult && <UserIcon className="size-3.5 shrink-0 text-violet-700" />}
                        {out?.type === "noshow" && <span className="shrink-0 rounded-full bg-red-50 px-1.5 text-[11px] text-red-700">ไม่มา</span>}
                      </span>
                      <Address className="text-sm text-foreground/75" text={[s.addressNote, s.address].filter(Boolean).join(" · ")} />
                    </span>
                    {out && p.started && !p.finished && <button type="button" disabled={busy} onClick={() => onTap("undo", s.key)} className="flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs text-muted-foreground"><RotateCcwIcon className="size-3" />แก้</button>}
                  </div>
                  <div className="mt-2 ml-11 grid grid-cols-3 gap-1.5 text-center">
                    <TimeCell label="ประมาณ" value={s.eta ?? "—"} />
                    <TimeCell label="Check in" value={inn ? hhmm(inn.at) : "—"} tone={inn ? "bg-violet-600 text-white" : undefined} />
                    <TimeCell label={out?.type === "noshow" ? "ไม่มา" : "Check out"} value={out ? hhmm(out.at) : "—"} tone={out ? (out.type === "noshow" ? "bg-red-600 text-white" : "bg-emerald-600 text-white") : undefined} />
                  </div>
                </li>
              )
            })}
            {/* owner 2026-10-20: every trip ends back at the branch — the driver returns the van keys */}
            <EndRow icon={<SchoolIcon className="size-4" />}
              title={t.kind === "pickup" ? `ถึง${t.branchName}` : `กลับถึง${t.branchName} — คืนกุญแจรถ`} label={p.finished ? "จบแล้ว" : "ประมาณ"} time={p.finished ? hhmm(p.finished.at) : t.finish} done={!!p.finished} />
          </ol>
          {navAll.length > 0 && (
            <a target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/${navAll.map((s) => `${s.loc!.lat},${s.loc!.lng}`).join("/")}`} className="flex h-12 items-center justify-center gap-1.5 border-t text-sm text-muted-foreground"><MapIcon className="size-4" />เปิดเส้นทางทั้งหมดใน Google Maps</a>
          )}
        </section>
      </main>

      {/* owner 2026-10-20: big buttons at the bottom — left negative, right the next step */}
      <footer className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg border-t bg-background/95 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {/* owner 2026-10-20: left 30% · right 70% */}
        <div className={cn("grid gap-3", bar.right ? "grid-cols-[3fr_7fr]" : "grid-cols-1")}>
          <button type="button" disabled={busy} onClick={bar.left.onClick}
            className={cn("flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 text-sm font-semibold disabled:opacity-50", bar.left.tone === "danger" ? "border-red-300 text-red-700" : "border-foreground/15")}>
            <bar.left.icon className="size-5 shrink-0" /><span className="max-w-full truncate">{bar.left.label}</span>
          </button>
          {bar.right && (
            <button type="button" disabled={busy} onClick={bar.right.onClick} className={cn("flex h-16 min-w-0 items-center justify-center gap-2 rounded-2xl px-3 text-base font-semibold shadow-sm disabled:opacity-50", bar.right.tone)}>
              {busy ? <LoaderCircleIcon className="size-5 animate-spin" /> : <bar.right.icon className="size-5 shrink-0" />}<span className="truncate">{bar.right.label}</span>
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

/** where the drive starts / ends — the branch, the first home, or the last one */
function EndRow({ icon, title, label, time, done }: { icon: React.ReactNode; title: string; label: string; time: string; done: boolean }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", done ? "bg-emerald-500 text-white" : "bg-foreground text-background")}>{icon}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{title}</span>
      <span className="shrink-0 text-right"><span className="block text-sm font-semibold tabular-nums">{time}</span><span className="block text-[11px] text-muted-foreground">{label}</span></span>
    </li>
  )
}

/** one of a stop's three times — estimate / check in / check out */
function TimeCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  // owner 2026-10-20: "มองสี ไม่ชัด" — a filled cell once the time is in, a clear outline before
  return (
    <span className={cn("rounded-xl px-1 py-1.5 ring-1", tone ?? "bg-background ring-foreground/15", tone && "ring-transparent")}>
      <span className={cn("block text-[11px] font-medium", tone ? "text-white/90" : "text-foreground/60")}>{label}</span>
      <span className={cn("block text-base font-bold tabular-nums", value === "—" && "text-foreground/35")}>{value}</span>
    </span>
  )
}

/** an address: 2 lines, then "แสดงเพิ่มเติม" when it's longer (owner 2026-10-20) */
function Address({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [long, setLong] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => { const el = ref.current; if (el && !open) setLong(el.scrollHeight > el.clientHeight + 1) }, [text, open])
  if (!text) return <span className={cn("block", className)}>ไม่มีที่อยู่</span>
  return (
    <span className={cn("block", className)}>
      <span ref={ref} className={cn("block", !open && "line-clamp-2")}>{text}</span>
      {(long || open) && <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(!open) }} className="mt-0.5 text-sm font-medium text-primary">{open ? "แสดงน้อยลง" : "แสดงเพิ่มเติม"}</button>}
    </span>
  )
}
