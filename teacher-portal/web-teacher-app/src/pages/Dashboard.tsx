import { useState } from "react"
import { Clock, Send, PenLine, ClipboardList, ChevronRight, CheckCircle2, CalendarClock, Tv, Radio, Info } from "lucide-react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip } from "recharts"
import { CUR_WEEK, COURSES, R, SUBJ, WK_DATE, SCHEDULE, DAY_ORDER, courseObj, courseShort, topicOf, lineStatusOf, students } from "@/data"
import { fbPrepared, isNoClass, pct, studentsIn, courseBacklog } from "@/logic"
import { useSync } from "@/store"
import { useNav } from "@/nav"
import { useDrawer } from "@/components/StudentDrawer"
import { useHwDialog } from "@/components/HomeworkDialog"
import { useLinkLine, LineStatusBadge } from "@/components/LinkLineDialog"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const ST = { active: "#10b981", inactive: "#f59e0b", churn: "#ef4444" }
const tip = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--popover-foreground))" }

function Kpi({ label, value, sub, tone, onOpen }: { label: string; value: string | number; sub?: string; tone?: string; onOpen?: () => void }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">{label}</div>
        {onOpen && <ChevronRight className="size-4 text-muted-foreground" />}
      </div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </>
  )
  return onOpen
    ? <button onClick={onOpen} className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-muted/40">{inner}</button>
    : <Card><CardContent className="p-4">{inner}</CardContent></Card>
}

function Stat({ label, value, tone, onClick }: { label: string; value: string | number; tone?: string; onClick?: () => void }) {
  const inner = (
    <>
      <div className="flex items-center justify-between gap-1"><span className="text-[11px] text-muted-foreground">{label}</span>{onClick && <ChevronRight className="size-3.5 text-muted-foreground" />}</div>
      <div className={cn("text-lg font-semibold tabular-nums", tone)}>{value}</div>
    </>
  )
  return onClick
    ? <button onClick={onClick} className="rounded-lg bg-muted/50 px-3 py-2 text-left transition-colors hover:bg-muted">{inner}</button>
    : <div className="rounded-lg bg-muted/50 px-3 py-2">{inner}</div>
}

function DonutCard({ active, inactive, churn, total }: { active: number; inactive: number; churn: number; total: number }) {
  const data = [{ name: "Active", value: active, fill: ST.active }, { name: "Inactive", value: inactive, fill: ST.inactive }, { name: "Churn", value: churn, fill: ST.churn }]
  return (
    <Card className="h-full"><CardContent className="flex h-full flex-col p-4">
      <div className="mb-2 text-sm font-semibold">สัดส่วนนักเรียน</div>
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="relative h-[190px] w-full max-w-[230px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">{data.map((d) => <Cell key={d.name} fill={d.fill} />)}</Pie>
              <RTooltip contentStyle={tip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold">{total}</span><span className="text-[11px] text-muted-foreground">นักเรียน</span></div>
        </div>
        <div className="mt-4 flex flex-col items-center gap-1.5 text-xs">
          {data.map((d) => <span key={d.name} className="inline-flex items-center gap-2"><span className="size-2.5 rounded-[3px]" style={{ background: d.fill }} /><span className="font-medium">{d.name}</span><span className="text-muted-foreground tabular-nums">{d.value} คน · {pct(d.value, total)}%</span></span>)}
        </div>
      </div>
    </CardContent></Card>
  )
}

function LiveStreamCard() {
  const focusFeedback = useNav((s) => s.focusFeedback)
  const wk = CUR_WEEK
  const lives: { cid: string; sub: string; day: string; time: string; topic: string; fb: boolean }[] = []
  COURSES.forEach((c) => (SCHEDULE[c.id] || []).forEach((e) => {
    if (isNoClass(c.id, e.sub, wk)) return
    lives.push({ cid: c.id, sub: e.sub, day: e.day, time: e.time, topic: topicOf(e.sub, wk), fb: fbPrepared(c.id, e.sub, wk) })
  }))
  lives.sort((a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.time.localeCompare(b.time))
  return (
    <Card><CardContent className="p-4">
      <div className="mb-3 flex items-center gap-2"><Radio className="size-4 text-primary" /><span className="text-sm font-semibold">ตารางไลฟ์สัปดาห์นี้</span><span className="text-xs text-muted-foreground">W{wk} · {WK_DATE[wk]}</span></div>
      <div className="space-y-1.5">
        {lives.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2">
            <div className="w-24 shrink-0"><div className="text-sm font-semibold">{l.day}</div><div className="text-[11px] text-muted-foreground tabular-nums">{l.time}</div></div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-medium"><Tv className="size-3.5 text-muted-foreground" /> {SUBJ[l.sub].n} <span className="text-[11px] font-normal text-muted-foreground">· {courseShort(l.cid)}</span></div>
              <div className="truncate text-xs text-muted-foreground">หัวข้อ: {l.topic}</div>
            </div>
            {l.fb
              ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"><CheckCircle2 className="size-3" /> Feedback แล้ว</span>
              : <button onClick={() => focusFeedback({ course: l.cid, sub: l.sub, week: wk })} className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-200"><PenLine className="size-3" /> ยังไม่มี Feedback</button>}
          </div>
        ))}
      </div>
    </CardContent></Card>
  )
}

function CourseCard({ cid, onList, onHwList }: { cid: string; onList: (kind: "inactive" | "churn", cid: string) => void; onHwList: (cid: string, sub: string, wk: number) => void }) {
  const focusSummary = useNav((s) => s.focusSummary)
  const focusFeedback = useNav((s) => s.focusFeedback)
  const roster = studentsIn(cid)
  const active = roster.filter((s) => s.status === "active").length
  const inactive = roster.filter((s) => s.status === "inactive").length
  const churn = roster.filter((s) => s.status === "churn").length
  const backlog = courseBacklog(cid)

  return (
    <Card><CardContent className="space-y-3 p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{courseObj(cid).n}</div>
          <div className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="size-3.5" /> สัปดาห์ปัจจุบัน <b className="text-foreground">W{CUR_WEEK}</b> · {WK_DATE[CUR_WEEK]}</div>
        </div>
        <div className={cn("ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", backlog.length === 0 ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700")}>
          {backlog.length === 0 ? <><CheckCircle2 className="size-3.5" /> จัดการครบทุกสัปดาห์</> : <><Clock className="size-3.5" /> ค้าง {backlog.length} สัปดาห์</>}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Active" value={active} tone="text-emerald-600" />
        <Stat label="Inactive" value={inactive} tone={inactive ? "text-amber-600" : undefined} onClick={inactive ? () => onList("inactive", cid) : undefined} />
        <Stat label="Churn" value={churn} tone={churn ? "text-red-600" : undefined} onClick={churn ? () => onList("churn", cid) : undefined} />
      </div>

      <div>
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>งานค้างตามสัปดาห์</span>
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild><button className="text-muted-foreground hover:text-foreground" aria-label="ความหมายของสถานะ"><Info className="size-3.5" /></button></TooltipTrigger>
              <TooltipContent className="max-w-[270px] text-left font-normal normal-case leading-relaxed">
                <div className="mb-1 font-semibold">แยกงานตามสัปดาห์ ป้องกันข้อมูลปนกัน</div>
                <div className="flex items-center gap-1.5"><ClipboardList className="size-3.5 text-amber-500" /> <b>[x/y]</b> = Homework — กดดูรายชื่อคนที่ยังไม่ได้ทำ</div>
                <div className="mt-1 flex items-center gap-1.5"><PenLine className="size-3.5 text-red-400" /> = ยังไม่เตรียม Feedback</div>
                <div className="mt-1 flex items-center gap-1.5"><Send className="size-3.5 text-blue-500" /> = ยังไม่ส่งผู้ปกครอง · <b className="text-red-500">แถบแดง = เลยสัปดาห์ (backlog)</b></div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {backlog.length === 0 && <div className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">ทุกสัปดาห์เก็บ Homework + Feedback + ส่งผู้ปกครองครบแล้ว ✓</div>}

        <div className="space-y-2">
          {backlog.map((w) => {
            const incomplete = w.subjects.filter((s) => s.col < s.app || !s.fb)
            const overdue = CUR_WEEK - w.wk
            return (
              <div key={w.wk} className={cn("rounded-lg border p-2.5", overdue > 0 ? "border-red-200 bg-red-50/50 dark:border-red-500/30 dark:bg-red-950/20" : "bg-card")}>
                <div className="mb-1.5 flex items-center gap-2">
                  <span className="text-sm font-semibold">W{w.wk}</span>
                  <span className="text-[11px] text-muted-foreground">{WK_DATE[w.wk]}</span>
                  {overdue > 0
                    ? <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">ค้าง · เลยมา {overdue} สัปดาห์</span>
                    : <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">สัปดาห์ปัจจุบัน</span>}
                </div>
                <div className="space-y-1.5">
                  {incomplete.map((s) => (
                    <div key={s.sub} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">{SUBJ[s.sub].n}</span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {s.col < s.app && <button onClick={() => onHwList(cid, s.sub, w.wk)} title={`เก็บ Homework แล้ว ${s.col}/${s.app} — เหลือ ${s.app - s.col} · กดดูรายชื่อ`} className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-200"><ClipboardList className="size-3.5" /> {s.col}/{s.app}</button>}
                        {!s.fb && <button onClick={() => focusFeedback({ course: cid, sub: s.sub, week: w.wk })} title="ยังไม่ได้เตรียม Feedback" aria-label="เตรียม Feedback" className="inline-flex items-center rounded-md bg-red-100 p-1.5 text-red-600 hover:bg-red-200"><PenLine className="size-3.5" /></button>}
                      </div>
                    </div>
                  ))}
                  {w.unsent > 0 && (
                    <button onClick={() => focusSummary({ course: cid, sub: "all", week: w.wk, field: "send" })} className="group flex w-full items-center gap-2 rounded-md border bg-card px-2.5 py-1.5 text-left text-sm transition-colors hover:border-primary/50 hover:bg-muted/40">
                      <Send className="size-4 text-blue-600" /><span className="flex-1">ค้างส่งผู้ปกครอง <b>{w.unsent}</b> คน</span><ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </CardContent></Card>
  )
}

function StudentListDialog({ kind, list, onClose, onPick }: { kind: "inactive" | "churn" | null; list: any[]; onClose: () => void; onPick: (idx: number, course: string) => void }) {
  return (
    <Dialog open={kind != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle className="text-base">{kind === "churn" ? "นักเรียน Churn" : "นักเรียน Inactive"} ({list.length} คน)</DialogTitle></DialogHeader>
        <div className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto px-2">
          {list.length === 0 && <div className="px-1 py-4 text-center text-sm text-muted-foreground">ไม่มีนักเรียนในสถานะนี้</div>}
          {list.map((s) => (
            <button key={s.idx} onClick={() => onPick(s.idx, s.courses[0])} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60">
              <Avatar className="size-8">{s.photo && <AvatarImage src={s.photo} />}<AvatarFallback style={{ background: s.av }} className="text-[10px] text-white">{s.nick[0]}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{s.nick} <span className="font-normal text-muted-foreground">· {s.name}</span></div><div className="text-[11px] text-muted-foreground">{s.grade} · {courseShort(s.courses[0])} · หาย {s.statusDur}</div></div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function HwMissingDialog({ data, onClose, onPick }: { data: { cid: string; sub: string; wk: number; list: any[] } | null; onClose: () => void; onPick: (idx: number) => void }) {
  return (
    <Dialog open={data != null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">ยังไม่ได้กรอก Homework{data && ` — ${SUBJ[data.sub].n}`} ({data?.list.length ?? 0} คน)</DialogTitle>
          {data && <p className="text-xs font-medium text-primary">สัปดาห์ที่ {data.wk} · {WK_DATE[data.wk]}</p>}
        </DialogHeader>
        <div className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto px-2">
          {data && data.list.length === 0 && <div className="px-1 py-4 text-center text-sm text-muted-foreground">เก็บครบทุกคนแล้ว ✓</div>}
          {data?.list.map((s) => (
            <button key={s.idx} onClick={() => onPick(s.idx)} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60">
              <Avatar className="size-8">{s.photo && <AvatarImage src={s.photo} />}<AvatarFallback style={{ background: s.av }} className="text-[10px] text-white">{s.nick[0]}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{s.nick} <span className="font-normal text-muted-foreground">· {s.name}</span></div><div className="text-[11px] text-muted-foreground">{s.grade} · {s.id}</div></div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"><ClipboardList className="size-3.5" /> กรอก</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function Dashboard() {
  useSync()
  const openDrawer = useDrawer((s) => s.open)
  const openHw = useHwDialog((s) => s.open)
  const [list, setList] = useState<{ kind: "inactive" | "churn"; cid?: string } | null>(null)
  const [hw, setHw] = useState<{ cid: string; sub: string; wk: number } | null>(null)
  const live = students.filter((s) => !s.deleted)
  const active = live.filter((s) => s.status === "active")
  const inactive = live.filter((s) => s.status === "inactive")
  const churn = live.filter((s) => s.status === "churn")
  const totalSubjects = new Set(COURSES.flatMap((c) => c.subs)).size
  const notLinked = live.filter((s) => lineStatusOf(s.idx) !== "linked")
  const linkedCount = live.length - notLinked.length
  const [lineListOpen, setLineListOpen] = useState(false)
  const listStudents = !list ? [] : (list.cid ? studentsIn(list.cid) : live).filter((s) => s.status === list.kind)
  const hwList = hw ? studentsIn(hw.cid).filter((s) => { const r = R[s.idx][hw.sub]?.[hw.wk]; return r && r.att !== "noclass" && !r.collected }) : []

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1><p className="text-sm text-muted-foreground">สิ่งที่ต้องจัดการตอนนี้ — สัปดาห์ปัจจุบัน (W{CUR_WEEK}) · กดงานที่ค้างเพื่อไปทำต่อทันที</p></div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="คอร์สที่ดูแล" value={COURSES.length} sub={`${totalSubjects} วิชา`} />
        <Kpi label="นักเรียนทั้งหมด" value={live.length} sub="Premium Plus" />
        <Kpi label="Active" value={active.length} tone="text-emerald-600" />
        <Kpi label="Inactive" value={inactive.length} tone="text-amber-600" onOpen={() => setList({ kind: "inactive" })} />
        <Kpi label="Churn" value={churn.length} tone="text-red-600" onOpen={() => setList({ kind: "churn" })} />
        <Kpi label="ผูก LINE แล้ว" value={`${linkedCount}/${live.length}`} tone={notLinked.length ? "text-amber-600" : "text-emerald-600"} onOpen={() => setLineListOpen(true)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.7fr]">
        <DonutCard active={active.length} inactive={inactive.length} churn={churn.length} total={live.length} />
        <LiveStreamCard />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-2">
        {COURSES.map((c) => <CourseCard key={c.id} cid={c.id} onList={(kind, cid) => setList({ kind, cid })} onHwList={(cid, sub, wk) => setHw({ cid, sub, wk })} />)}
      </div>

      <StudentListDialog kind={list?.kind ?? null} list={listStudents} onClose={() => setList(null)} onPick={(idx, course) => { openDrawer(idx, course, CUR_WEEK); setList(null) }} />
      <HwMissingDialog data={hw ? { ...hw, list: hwList } : null} onClose={() => setHw(null)} onPick={(idx) => { if (hw) openHw(idx, hw.cid, hw.sub, hw.wk); setHw(null) }} />

      <Dialog open={lineListOpen} onOpenChange={(o) => !o && setLineListOpen(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">ยังไม่ผูก LINE ({notLinked.length} คน)</DialogTitle></DialogHeader>
          <div className="-mx-2 max-h-[60vh] space-y-0.5 overflow-y-auto px-2">
            {notLinked.length === 0 && <div className="px-1 py-4 text-center text-sm text-muted-foreground">ผูก LINE ครบทุกคนแล้ว ✓</div>}
            {notLinked.map((s) => (
              <button key={s.idx} onClick={() => { useLinkLine.getState().open(s.idx); setLineListOpen(false) }} className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-muted/60">
                <Avatar className="size-8">{s.photo && <AvatarImage src={s.photo} />}<AvatarFallback style={{ background: s.av }} className="text-[10px] text-white">{s.nick[0]}</AvatarFallback></Avatar>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{s.nick} <span className="font-normal text-muted-foreground">· {s.name}</span></div><div className="text-[11px] text-muted-foreground">{s.grade} · {courseShort(s.courses[0])}</div></div>
                <LineStatusBadge status={lineStatusOf(s.idx)} />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
