"use client"

// Bus Route (owner 2026-10-19 — v1 Bus Route, then the owner's ref "Recreate ใหม่เลย"): the week as one table, a group
// per day, a row per trip that opens into its stops. Who rides which trip is worked out from invoices + extra /
// cancelled rides + parents riding along; the drivers' app reports the trips live. The admin checks the warnings,
// adds / moves / removes, swaps van or driver, and approves & sends — one trip or the whole week.
import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangleIcon, BusIcon, CalendarDaysIcon, ChartColumnIcon, CheckIcon, MapIcon, MessageCircleIcon, PlusIcon, RouteIcon, SettingsIcon, SquareCheckBigIcon, TableIcon, UsersIcon } from "lucide-react"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { FilterBar, KpiRow, Page, PageHeader, RangeStepper, SearchBox, Segmented, Toolbar } from "@/components/app/page-layout"
import { KIND_LABEL } from "@/components/transport/labels"
import { TransportCalendar } from "@/components/transport/transport-calendar"
import { TransportReport, TransportReportKpis } from "@/components/transport/transport-report"
import { TransportSettings } from "@/components/transport/transport-settings"
import { ExtraTripDialog } from "@/components/transport/trip-dialogs"
import { TripDetail, tripColumns } from "@/components/transport/trip-row"
import { DataTable } from "@/components/app/data-grid"
import { ZonesView } from "@/components/transport/zones-view"
import { Button } from "@/components/ui/button"
import { addDays, fmtDate, monthShort, toDateStr, yearOf } from "@/domain/dates"
import { allBranches } from "@/domain/rules/permissions"
import { mondayOf } from "@/domain/rules/scheduling"
import { planDay, weekDates, type DayPlan, type TripPlan } from "@/domain/rules/transport"
import type { Branch } from "@/domain/types"
import { useDriverEvents } from "@/lib/driver"
import { report } from "@/lib/feedback"
import { useBranch, useNow, useQueryState } from "@/lib/hooks"
import { nm } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type View = "week" | "report" | "vehicles" | "zones"
export interface WeekRow { branch: Branch; plan: DayPlan; trip: TripPlan }

export default function TransportPage() {
  const branch = useBranch()
  const now = useNow(30_000)
  const today = toDateStr(now)
  const [view, setView] = useQueryState<View>("view", "week")
  const [mode, setMode] = useQueryState<"table" | "calendar">("mode", "table")
  const [date, setDate] = useState(today)
  const [q, setQ] = useState("")
  const [fZone, setFZone] = useState("")
  const [fType, setFType] = useState("")
  const [fBus, setFBus] = useState("")
  const [fBranch, setFBranch] = useState("")
  const [open, setOpen] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<{ date: string; branch: Branch } | null>(null)
  const me = useStore((s) => s.me())
  const branches = useStore((s) => s.branches)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const classes = useStore((s) => s.classes)
  const invoices = useStore((s) => s.invoices)
  const busAddOns = useStore((s) => s.busAddOns)
  const trips = useStore((s) => s.busTrips)
  const staff = useStore((s) => s.staff)
  const parentRequests = useStore((s) => s.parentRequests)
  const sendTrips = useStore((s) => s.sendTrips)
  const moveRider = useStore((s) => s.moveRider)
  const events = useDriverEvents()

  // branches with a bus: the one in the top bar, or all of them (Branch filter) for those who see every branch
  const busBranches = branches.filter((b) => (b.busRounds ?? []).length || (b.vehicles ?? []).length)
  const scope = fBranch === "*" ? busBranches : branches.filter((b) => b.id === (fBranch || branch.id))
  const ctx = useMemo(() => ({ students, families, classes, invoices, busAddOns, trips: trips ?? [], parentRequests, staff, events, now }), [students, families, classes, invoices, busAddOns, trips, parentRequests, staff, events, now])
  const monday = mondayOf(date)
  const days = useMemo(() => weekDates(monday), [monday])
  const plans = days.map((d) => scope.map((b) => ({ branch: b, plan: planDay(b, d, ctx) })))
  const k = q.trim().toLowerCase()
  const match = (r: WeekRow) => {
    const t = r.trip
    if (fType && t.round.kind !== fType) return false
    if (fBus && t.vehicle?.id !== fBus) return false
    if (fZone && !t.zoneIds.includes(fZone)) return false
    if (!k) return true
    return [t.driver?.nickname, t.driver?.name, t.vehicle?.name, t.vehicle?.plate, ...t.stops.flatMap((x) => [x.rider.nickname, x.rider.name, x.rider.grade])].some((v) => v?.toLowerCase().includes(k))
  }
  // a trip shows when it has children, or was cancelled / added for the day (so it can be restored / filled)
  const rowsByDay: WeekRow[][] = plans.map((dayPlans) => dayPlans.flatMap(({ branch: b, plan }) => plan.trips.filter((t) => t.stops.length || t.status === "cancelled" || t.extra).map((trip) => ({ branch: b, plan, trip }))).filter(match))
  const all = rowsByDay.flat()
  const live = all.filter((r) => r.trip.status !== "cancelled" && r.trip.stops.length)
  const approved = live.filter((r) => ["sent", "otw", "done"].includes(r.trip.status)).length
  const toSend = live.filter((r) => ["draft", "changed", "scheduled"].includes(r.trip.status))
  const studentsCount = new Set(live.flatMap((r) => r.trip.stops.map((x) => x.rider.studentId))).size
  const parentsCount = live.reduce((n, r) => n + r.trip.stops.filter((x) => x.rider.adult).length, 0)
  const vans = new Set(live.map((r) => r.trip.vehicle?.id).filter(Boolean)).size
  const zonesAll = scope.flatMap((b) => (b.busZones ?? []).map((z) => ({ z, b })))
  const vansAll = scope.flatMap((b) => (b.vehicles ?? []).map((v) => ({ v, b })))
  const hasBus = scope.some((b) => (b.busRounds ?? []).length)
  const columns = tripColumns((id) => open.has(id))
  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); if (n.has(id)) n.delete(id); else n.add(id); return n })
  const approveAll = () => report(sendTrips(toSend.map((r) => ({ roundId: r.trip.round.id, date: r.trip.date, key: r.trip.key, driverId: r.trip.driver?.id }))), `อนุมัติ & ส่ง ${toSend.length} เที่ยวให้คนขับแล้ว`)

  return (
    <Page className="max-w-[90rem]">
      <PageHeader title="รถรับส่ง"
        description="Bus Route — ใครนั่งเที่ยวไหนระบบจัดให้จากใบแจ้งหนี้และคำขอ · คนขับรายงานผ่านแอป · Admin ดูคำเตือน แล้วอนุมัติ & ส่ง"
        actions={view === "week" && hasBus && toSend.length > 0 ? <Button onClick={approveAll}><CheckIcon /> {`อนุมัติทั้งหมด & ส่ง (${toSend.length})`}</Button> : undefined} />

      <Toolbar end={allBranches(me) && busBranches.length > 1 && (view === "week" || view === "report") ? (
        <NativeSelect className="h-9 w-44" value={fBranch} placeholder={`สาขา: ${nm(branch.name)}`} onChange={(e) => setFBranch(e.target.value)}
          options={[{ value: "*", label: "ทุกสาขาที่มีรถ" }, ...busBranches.filter((b) => b.id !== branch.id).map((b) => ({ value: b.id, label: nm(b.name) }))]} />
      ) : undefined}>
        <Segmented label="หน้า" value={view} onChange={setView} options={[
          { value: "week", label: "ตารางสัปดาห์", icon: RouteIcon }, { value: "report", label: "รายงาน", icon: ChartColumnIcon },
          { value: "vehicles", label: "รถ & คนขับ", icon: SettingsIcon }, { value: "zones", label: "โซน", icon: MapIcon },
        ]} />
      </Toolbar>

      {view === "vehicles" ? <TransportSettings key={branch.id} branch={branch} />
        : view === "zones" ? <ZonesView branch={branch} />
        : !hasBus ? (
          <div className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <BusIcon className="mx-auto mb-2 size-8" />
            {`สาขา${nm(branch.name)}ยังไม่มีรอบรถ — `}<button type="button" className="text-primary underline" onClick={() => setView("vehicles")}>เพิ่มรถและรอบรถ</button>
          </div>
        ) : <>
          {view === "report" ? <TransportReportKpis rows={live} /> : <KpiRow>
            <Kpi icon={RouteIcon} label="เที่ยวสัปดาห์นี้" value={live.length} sub={all.length > live.length ? `ยกเลิก / ว่าง ${all.length - live.length} เที่ยว` : "ทุกเที่ยวมีคนนั่ง"} />
            <Kpi icon={BusIcon} label="รถที่วิ่ง" value={vans} sub={`มี ${vansAll.filter((x) => x.v.active).length} คันในสาขาที่เลือก`} tone="amber" />
            <Kpi icon={UsersIcon} label="นักเรียน" value={studentsCount} sub={`ผู้ปกครองนั่งไปด้วย ${parentsCount} เที่ยว`} tone="sky" />
            <Kpi icon={SquareCheckBigIcon} label="อนุมัติแล้ว" value={`${approved}/${live.length}`} sub={toSend.length ? `รออนุมัติ ${toSend.length} เที่ยว` : "ส่งคนขับครบแล้ว"} tone="emerald" />
          </KpiRow>}

          <Toolbar end={<RangeStepper current={monday === mondayOf(today)} label={`${fmtDate(monday)} – ${fmtDate(addDays(monday, 6))}`}
            onPrev={() => setDate(addDays(date, -7))} onNext={() => setDate(addDays(date, 7))} onToday={() => setDate(today)} />}>
            {view === "week" && <Segmented label="มุมมอง" value={mode} onChange={setMode} options={[{ value: "table", label: "ตาราง", icon: TableIcon }, { value: "calendar", label: "ปฏิทิน", icon: CalendarDaysIcon }]} />}
            <span className="text-sm font-medium text-muted-foreground">{`${monthShort(Number(monday.slice(5, 7)) - 1)} ${yearOf(Number(monday.slice(0, 4)))}`}</span>
          </Toolbar>
          <FilterBar search={<SearchBox value={q} onChange={setQ} placeholder="ชื่อเด็ก / คนขับ / ชั้น / รถ" />}>
            {zonesAll.length > 0 && <NativeSelect className="h-9 w-32" value={fZone} placeholder="ทุกโซน" onChange={(e) => setFZone(e.target.value)} options={zonesAll.map(({ z }) => ({ value: z.id, label: z.name }))} />}
            <NativeSelect className="h-9 w-40" value={fType} placeholder="ทุกประเภทเที่ยว" onChange={(e) => setFType(e.target.value)} options={(["pickup", "dropoff", "both"] as const).map((x) => ({ value: x, label: KIND_LABEL[x] }))} />
            <NativeSelect className="h-9 w-40" value={fBus} placeholder="ทุกคัน" onChange={(e) => setFBus(e.target.value)} options={vansAll.map(({ v, b }) => ({ value: v.id, label: scope.length > 1 ? `${v.name} · ${nm(b.name)}` : v.name }))} />
          </FilterBar>

          {view === "report" ? <TransportReport rows={live} />
            : mode === "calendar" ? <TransportCalendar rows={all} days={days} today={today} onPick={(id) => { setMode("table"); setOpen(new Set([id])) }} /> : (
            <div className="space-y-6">
              {days.map((d, i) => {
                const rows = rowsByDay[i]
                const issues = plans[i].flatMap((p) => [
                  ...p.plan.unplaced.map((u) => ({ type: "u" as const, u, plan: p.plan })),
                  ...p.plan.requests.map((r) => ({ type: "r" as const, r })),
                ])
                if (!rows.length && !issues.length && d !== today) return null
                return (
                  <section key={d} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3 border-b pb-2">
                      <h3 className="text-base font-semibold">{fmtDate(d, { weekday: true })}</h3>
                      <span className="text-sm text-muted-foreground">{`${rows.length} เที่ยว`}</span>
                      {d === today && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">วันนี้</span>}
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => setAdding({ date: d, branch: scope.length === 1 ? scope[0] : branch })}><PlusIcon /> เพิ่มเที่ยว</Button>
                    </div>
                    {issues.length > 0 && (
                      <div className="space-y-1.5 rounded-2xl bg-amber-50 p-3 text-sm ring-1 ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-900">
                        <p className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-100"><AlertTriangleIcon className="size-4" />{`ต้องตัดสินใจ ${issues.length}`}</p>
                        {issues.map((x, j) => x.type === "u" ? (
                          <div key={`u${j}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-background px-3 py-1.5">
                            <span className="min-w-0 flex-1"><span className="font-medium">{x.u.rider.nickname}</span><span className="text-muted-foreground">{` · ${x.u.kind === "pickup" ? "รับ" : "ส่ง"} · ${x.u.reason}`}</span></span>
                            <NativeSelect className="h-8 w-auto min-w-44" value="" placeholder="ใส่เข้าเที่ยว…" onChange={(e) => e.target.value && report(moveRider(d, x.u.rider.studentId, e.target.value), "ใส่เข้าเที่ยวแล้ว")}
                              options={x.plan.trips.filter((t) => (t.round.kind === x.u.kind || t.round.kind === "both") && t.status !== "cancelled").map((t) => ({ value: t.round.id, label: `${t.round.time} · ${t.vehicle?.name ?? ""} · ${t.used}/${t.seats}` }))} />
                          </div>
                        ) : (
                          <div key={`r${j}`} className="flex flex-wrap items-center gap-2 rounded-xl bg-background px-3 py-1.5">
                            <span className="min-w-0 flex-1"><span className="font-medium">{x.r.studentNickname}</span><span className="text-muted-foreground"> · ผู้ปกครองขอ / ยกเลิกรอบรถ — ยังไม่ได้อนุมัติ</span></span>
                            <Button size="sm" variant="outline" nativeButton={false} render={<Link href={`/inbox?conversation=line_${x.r.lineUserId}`} />}><MessageCircleIcon /> อนุมัติในแชท</Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {rows.length > 0 && (
                      <DataTable id="transport-trips" columns={columns} rows={rows} rowKey={(r) => r.trip.id} onRowClick={(r) => toggle(r.trip.id)} minWidth={1100}
                        rowClassName={(r) => cn(r.trip.status === "cancelled" && "opacity-55", r.trip.status === "otw" && "shadow-[inset_3px_0_0_var(--color-red-500)]")}
                        expanded={(r) => (open.has(r.trip.id) ? <TripDetail r={r} /> : null)} />
                    )}
                    {!rows.length && !issues.length && <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">ไม่มีเที่ยวรถวันนี้</p>}
                  </section>
                )
              })}
              {!all.length && <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">สัปดาห์นี้ไม่มีเที่ยวรถตามตัวกรอง</p>}
            </div>
          )}
        </>}
      {adding && <ExtraTripDialog branch={adding.branch} date={adding.date} onClose={() => setAdding(null)} />}
    </Page>
  )
}
