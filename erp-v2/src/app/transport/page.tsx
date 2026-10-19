"use client"

// Transport (owner 2026-10-19 — from v1 Bus Route, "ให้ Admin จัดการ Transportation ได้ดี และไม่ต้องคิดให้ได้มากที่สุด").
// Who rides which run is worked out from invoices + extra / cancelled rides + parents riding along; the admin looks at
// the warnings, moves / reorders when needed and sends the day's sheets to the drivers.
import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangleIcon, BusIcon, CalendarDaysIcon, CheckCheckIcon, MessageCircleIcon, SendIcon, SettingsIcon, UsersIcon } from "lucide-react"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { KpiRow, Page, PageHeader, RangeStepper, Segmented, Toolbar } from "@/components/app/page-layout"
import { TransportSettings } from "@/components/transport/transport-settings"
import { KIND_LABEL, TripCard } from "@/components/transport/trip-card"
import { Button } from "@/components/ui/button"
import { addDays, fmtDate, toDateStr, weekdayShort } from "@/domain/dates"
import { mondayOf } from "@/domain/rules/scheduling"
import { planDay, weekDates, type DayPlan } from "@/domain/rules/transport"
import { report } from "@/lib/feedback"
import { useBranch, useNow, useQueryState } from "@/lib/hooks"
import { nm } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type View = "day" | "week" | "settings"

export default function TransportPage() {
  const branch = useBranch()
  const now = useNow(60_000)
  const today = toDateStr(now)
  const [view, setView] = useQueryState<View>("view", "day")
  const [date, setDate] = useState(today)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const classes = useStore((s) => s.classes)
  const invoices = useStore((s) => s.invoices)
  const busAddOns = useStore((s) => s.busAddOns)
  const trips = useStore((s) => s.busTrips)
  const parentRequests = useStore((s) => s.parentRequests)
  const moveRider = useStore((s) => s.moveRider)
  const sendTrips = useStore((s) => s.sendTrips)
  const ctx = useMemo(() => ({ students, families, classes, invoices, busAddOns, trips: trips ?? [], parentRequests, now }), [students, families, classes, invoices, busAddOns, trips, parentRequests, now])
  const plan = useMemo(() => planDay(branch, date, ctx), [branch, date, ctx])
  const hasBus = (branch.busRounds ?? []).length > 0

  const live = plan.trips.filter((t) => t.stops.length)
  const empty = plan.trips.length - live.length
  const seatsUsed = live.reduce((a, t) => a + t.used, 0), seatsAll = live.reduce((a, t) => a + t.seats, 0)
  const warnCount = live.filter((t) => t.warnings.length).length + plan.unplaced.length + plan.requests.length
  const sent = live.filter((t) => t.status === "sent").length
  const toSend = live.filter((t) => t.status === "draft" || t.status === "changed")

  return (
    <Page>
      <PageHeader title="รถรับส่ง"
        description="ใครนั่งรอบไหน ระบบจัดให้จากใบแจ้งหนี้และคำขอของผู้ปกครอง — ดูคำเตือน แล้วส่งใบงานให้คนขับ"
        actions={view === "day" && toSend.length > 0 && (
          <Button onClick={() => report(sendTrips(toSend.map((t) => ({ roundId: t.round.id, date: t.date, key: t.key }))), `ส่งใบงาน ${toSend.length} เที่ยวให้คนขับแล้ว`)}><SendIcon /> {`ส่งทั้งวัน (${toSend.length})`}</Button>
        )} />

      <Toolbar end={view !== "settings" && hasBus && (
        <RangeStepper current={view === "day" ? date === today : mondayOf(date) === mondayOf(today)}
          label={view === "day" ? fmtDate(date, { weekday: true }) : `${fmtDate(mondayOf(date))} – ${fmtDate(addDays(mondayOf(date), 6))}`}
          onPrev={() => setDate(addDays(date, view === "day" ? -1 : -7))} onNext={() => setDate(addDays(date, view === "day" ? 1 : 7))} onToday={() => setDate(today)} />
      )}>
        <Segmented label="มุมมอง" value={view} onChange={setView} options={[
          { value: "day", label: "รายวัน", icon: CalendarDaysIcon }, { value: "week", label: "สัปดาห์", icon: BusIcon }, { value: "settings", label: "รถ & รอบรถ", icon: SettingsIcon },
        ]} />
      </Toolbar>

      {view === "settings" ? <TransportSettings key={branch.id} branch={branch} /> : !hasBus ? (
        <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          <BusIcon className="mx-auto mb-2 size-8" />
          {`สาขา${nm(branch.name)}ยังไม่มีรอบรถ — `}<button type="button" className="text-primary underline" onClick={() => setView("settings")}>เพิ่มรถและรอบรถ</button>
        </div>
      ) : view === "week" ? <WeekGrid date={date} ctx={ctx} onPick={(d) => { setDate(d); setView("day") }} /> : (
        <>
          <KpiRow>
            <Kpi icon={BusIcon} label="เที่ยววันนี้" value={live.length} sub={empty ? `ไม่มีคน ${empty} รอบ` : "ทุกรอบมีคนนั่ง"} tone="primary" />
            <Kpi icon={UsersIcon} label="ที่นั่งที่ใช้" value={`${seatsUsed}/${seatsAll}`} sub="รวมผู้ปกครองที่นั่งไปด้วย" tone="sky" />
            <Kpi icon={AlertTriangleIcon} label="ต้องดู" value={warnCount} sub={warnCount ? "ดูกล่องคำเตือนด้านล่าง" : "ไม่มีอะไรต้องแก้"} tone={warnCount ? "red" : "emerald"} />
            <Kpi icon={CheckCheckIcon} label="ส่งคนขับแล้ว" value={`${sent}/${live.length}`} sub={branch.busAutoSend ? "เที่ยวที่ไม่มีคำเตือนส่งเอง" : "ส่งเองทุกเที่ยว"} tone="emerald" />
          </KpiRow>

          {(plan.unplaced.length > 0 || plan.requests.length > 0) && <Warnings plan={plan} onMove={(sid, rid) => report(moveRider(plan.date, sid, rid), "ใส่เข้ารอบรถแล้ว")} />}

          {live.length === 0 ? (
            <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">วันนี้ไม่มีใครนั่งรถ</p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {live.map((t) => <TripCard key={t.id} t={t} branch={branch} others={plan.trips} />)}
            </div>
          )}
          {empty > 0 && <p className="text-xs text-muted-foreground">{`รอบที่ไม่มีคนนั่งวันนี้: ${plan.trips.filter((t) => !t.stops.length).map((t) => `${KIND_LABEL[t.round.kind]} ${t.round.time}`).join(" · ")}`}</p>}
        </>
      )}
    </Page>
  )
}

/** what the admin has to decide: children with no run, and parents' bus requests waiting in the chat */
function Warnings({ plan, onMove }: { plan: DayPlan; onMove: (studentId: string, roundId: string) => void }) {
  return (
    <section className="space-y-2 rounded-3xl bg-amber-50 p-4 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100"><AlertTriangleIcon className="size-4" /> ต้องตัดสินใจ</p>
      <ul className="space-y-1.5 text-sm">
        {plan.unplaced.map((u) => {
          const runs = plan.trips.filter((t) => t.round.kind === u.kind)
          return (
            <li key={`${u.kind}|${u.rider.studentId}`} className="flex flex-wrap items-center gap-2 rounded-2xl bg-background px-3 py-2">
              <span className="min-w-0 flex-1">
                <span className="font-medium">{u.rider.nickname}</span>
                <span className="text-muted-foreground">{` · ${KIND_LABEL[u.kind]} · ${u.reason}`}</span>
              </span>
              {runs.length > 0 && (
                <NativeSelect className="h-8 w-auto min-w-44" value="" placeholder="ใส่เข้ารอบ…" onChange={(e) => e.target.value && onMove(u.rider.studentId, e.target.value)}
                  options={runs.map((t) => ({ value: t.round.id, label: `${t.round.time}${t.round.name ? ` · ${t.round.name}` : ""} · ${t.used}/${t.seats}` }))} />
              )}
            </li>
          )
        })}
        {plan.requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-background px-3 py-2">
            <span className="min-w-0 flex-1"><span className="font-medium">{r.studentNickname}</span><span className="text-muted-foreground"> · ผู้ปกครองขอ / ยกเลิกรอบรถ — ยังไม่ได้อนุมัติ</span></span>
            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/inbox?conversation=line_${r.lineUserId}`} />}><MessageCircleIcon /> อนุมัติในแชท</Button>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** the week at a glance: each run × day — riders / seats, red when something needs a look; a click opens the day */
function WeekGrid({ date, ctx, onPick }: { date: string; ctx: Parameters<typeof planDay>[2]; onPick: (d: string) => void }) {
  const branch = useBranch()
  const monday = mondayOf(date)
  const days = useMemo(() => weekDates(monday), [monday])
  const plans = useMemo(() => days.map((d) => planDay(branch, d, ctx)), [days, branch, ctx])
  const runs = [...(branch.busRounds ?? [])].sort((a, b) => (a.kind === b.kind ? a.time.localeCompare(b.time) : a.kind === "pickup" ? -1 : 1))
  return (
    <div className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/60 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>รอบรถ</th>
            {days.map((d, i) => <th key={d} className="text-center!"><button type="button" onClick={() => onPick(d)} className="hover:text-foreground">{`${weekdayShort((i + 1) % 7)} ${fmtDate(d)}`}</button>{plans[i].unplaced.length + plans[i].requests.length > 0 && <AlertTriangleIcon className="ml-1 inline size-3 text-red-600" />}</th>)}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t [&>td]:px-3 [&>td]:py-2">
              <td className="whitespace-nowrap"><span className={cn("mr-1.5 rounded-full px-1.5 py-0.5 text-[11px]", r.kind === "pickup" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-900")}>{r.kind === "pickup" ? "รับ" : "ส่ง"}</span>{r.time}{r.name ? <span className="text-xs text-muted-foreground">{` · ${r.name}`}</span> : null}</td>
              {days.map((d, i) => {
                const t = plans[i].trips.find((x) => x.round.id === r.id)
                if (!t) return <td key={d} className="text-center text-muted-foreground/40">—</td>
                const bad = t.warnings.length > 0 && t.stops.length > 0
                return (
                  <td key={d} className="text-center">
                    <button type="button" onClick={() => onPick(d)} className={cn("min-w-14 rounded-full px-2 py-1 text-xs tabular-nums", !t.stops.length ? "text-muted-foreground" : bad ? "bg-red-100 font-medium text-red-800" : t.status === "sent" ? "bg-emerald-100 text-emerald-800" : "bg-muted")}>
                      {t.stops.length ? `${t.used}/${t.seats}` : "0"}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-3 py-2 text-xs text-muted-foreground">ตัวเลข = ที่นั่งที่ใช้ / ทั้งหมด · แดง = มีคำเตือน · เขียว = ส่งคนขับแล้ว · กดวันเพื่อเปิดรายวัน</p>
    </div>
  )
}
