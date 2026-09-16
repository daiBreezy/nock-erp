import { useEffect, useRef, useState, type ReactNode } from "react"
import { Send, Check, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, Lock, LockOpen, ClipboardList, Clock } from "lucide-react"
import { COURSES, CUR_WEEK, WEEKS, SUBJ, R, courseObj, isNoClass, topicOf, getWeekOverride } from "@/data"
import { fbPrepared, fbText, isSent, overallStatus, pct, studentsIn, subjStatus, type SubStatus } from "@/logic"
import { submitFeedback, unsubmitFeedback, setFeedbackText, sendReportBulk, setResult, useSync } from "@/store"
import { useNav } from "@/nav"
import { SpecialCases } from "@/components/SpecialCases"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusIcon, StatusPill } from "@/components/status"
import { CopyText } from "@/components/CopyText"
import { useDrawer } from "@/components/StudentDrawer"
import { useHwDialog } from "@/components/HomeworkDialog"
import { useHwSetup } from "@/components/HomeworkSetupDialog"
import { useQuizDialog } from "@/components/QuizDialog"

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[] }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-1">
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={cn("rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", value === o.v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{o.l}</button>
      ))}
    </div>
  )
}

export function WeekPicker({ week, setWeek }: { week: number; setWeek: (w: number) => void }) {
  const future = week > CUR_WEEK
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {WEEKS.map((w) => {
          const isFuture = w > CUR_WEEK
          return (
            <button key={w} onClick={() => setWeek(w)}
              className={cn("rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors",
                week === w ? "border-primary bg-primary text-primary-foreground"
                  : isFuture ? "border-dashed text-muted-foreground/70 hover:border-solid hover:text-foreground"
                    : w === CUR_WEEK ? "border-primary text-primary"
                      : "bg-card text-muted-foreground hover:text-foreground")}>W{w}</button>
          )
        })}
        <span className="text-[11px] text-muted-foreground">· W{CUR_WEEK} = ปัจจุบัน · เส้นประ = ล่วงหน้า</span>
      </div>
      {future && (
        <div className="inline-flex w-fit items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
          <Clock className="size-3.5" /> สัปดาห์ W{week} ยังมาไม่ถึง — เข้ามาเตรียมข้อมูลล่วงหน้าได้ (Feedback / เฉลย Homework)
        </div>
      )}
    </div>
  )
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return <Card><CardContent className="p-3"><div className="text-[11px] text-muted-foreground">{label}</div><div className={cn("text-lg font-bold", tone)}>{value}</div></CardContent></Card>
}

export function Summary() {
  useSync()
  const openDrawer = useDrawer((s) => s.open)
  const focus = useNav((s) => s.summaryFocus)
  const clearFocus = useNav((s) => s.clearSummaryFocus)
  const [course, setCourse] = useState("c1")
  const [week, setWeek] = useState(CUR_WEEK)
  const [sub, setSub] = useState("all")
  const [sel, setSel] = useState<Set<number>>(new Set())

  // รับ focus จาก Dashboard: sync course/week/sub แล้วเคลียร์เองหลังกระพริบเสร็จ (~5 ครั้ง)
  useEffect(() => {
    if (!focus) return
    setCourse(focus.course); setWeek(focus.week); setSub(focus.sub)
    const t = setTimeout(() => clearFocus(), 5500)
    return () => clearTimeout(t)
  }, [focus, clearFocus])

  const c = courseObj(course)
  const subs = c.subs
  const roster = studentsIn(course)
  const focusActive = focus && focus.course === course && focus.week === week

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Summary</h1><p className="text-sm text-muted-foreground">หน้าจัดการหลัก — เลือก Course → Week → All (ภาพรวม) หรือ รายวิชา (จัดการ)</p></div>

      <Segmented value={course} onChange={(v) => { setCourse(v); setSub("all"); setSel(new Set()) }} options={COURSES.map((x) => ({ v: x.id, l: x.n }))} />

      <div className="flex flex-wrap items-start gap-2">
        <WeekPicker week={week} setWeek={setWeek} />
        <SpecialCases o={getWeekOverride(course, week)} course={course} wk={week} />
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {[{ v: "all", l: "All Subjects" }, ...subs.map((s) => ({ v: s, l: SUBJ[s].n }))].map((t) => (
          <button key={t.v} onClick={() => setSub(t.v)} className={cn("border-b-2 px-4 py-2 text-sm font-semibold -mb-px", sub === t.v ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{t.l}</button>
        ))}
      </div>

      {sub === "all"
        ? <AllView course={course} week={week} roster={roster} subs={subs} sel={sel} setSel={setSel} openDrawer={openDrawer} focus={focusActive && focus && focus.field === "send" ? focus : null} />
        : <SubjectView course={course} week={week} sub={sub} roster={roster} openDrawer={openDrawer} focus={focusActive && focus && focus.sub === sub ? focus : null} />}
    </div>
  )
}

function AllView({ course, week, roster, subs, sel, setSel, openDrawer, focus }: any) {
  const sent = roster.filter((s: any) => overallStatus(s, course, week) === "sended").length
  const ready = roster.filter((s: any) => overallStatus(s, course, week) === "prepared").length
  const pend = roster.filter((s: any) => overallStatus(s, course, week) === "pending").length
  const missFb = subs.filter((sub: string) => !isNoClass(course, sub, week) && !fbPrepared(course, sub, week)).length
  const selectable = roster.filter((s: any) => overallStatus(s, course, week) !== "sended").map((s: any) => s.idx)
  const allSel = selectable.length > 0 && selectable.every((i: number) => sel.has(i))

  const doSend = () => { if (!sel.size) return; sendReportBulk([...sel], course, week); setSel(new Set()) }

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="นักเรียนในคอร์ส" value={`${roster.length}`} />
        <Kpi label="พร้อมส่ง" value={`${ready}`} tone="text-amber-600" />
        <Kpi label="รอดำเนินการ" value={`${pend}`} />
        <Kpi label={`ส่งแล้ว (W${week})`} value={`${sent}`} tone="text-emerald-600" />
        <Kpi label="วิชายังไม่พร้อม Feedback" value={`${missFb}`} tone="text-red-600" />
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">{sel.size} เลือกไว้</div>
        <Button size="sm" onClick={doSend} disabled={!sel.size}><Send className="mr-2 size-4" /> ส่งให้ผู้ปกครอง</Button>
      </div>

      <RosterTable course={course} week={week} roster={roster} subs={subs} sel={sel} setSel={setSel} openDrawer={openDrawer} selectable={selectable} allSel={allSel} focus={focus} />
      <p className="text-xs text-muted-foreground">✦ พร้อม · ○ รอ · ✓ ส่งแล้ว · — ไม่มีเรียน · กดหัวคอลัมน์ = Sort · เมนู ▾ = Lock/Sort · ลากสลับคอลัมน์ · คลิกแถว = เปิดรายงาน (ตารางนี้แก้ข้อมูลไม่ได้)</p>
    </>
  )
}

const ORD: Record<SubStatus, number> = { prepared: 0, pending: 1, sended: 2, none: 3 }
const AvatarCell = ({ s }: { s: any }) => (
  <Avatar className="size-8">{s.photo && <AvatarImage src={s.photo} />}<AvatarFallback style={{ background: s.av }} className="text-[10px] text-white">{s.nick[0]}</AvatarFallback></Avatar>
)
function RosterTable({ course, week, roster, subs, sel, setSel, openDrawer, selectable, allSel, focus }: any) {
  const liveSubs = subs.filter((sub: string) => !isNoClass(course, sub, week))
  useEffect(() => {
    if (!focus) return
    const t = setTimeout(() => document.querySelector(".row-blink")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80)
    return () => clearTimeout(t)
  }, [focus])
  const [sort, setSort] = useState<{ key: string; dir: number }>({ key: "id", dir: 1 })
  const [order, setOrder] = useState<string[]>([])
  const [locked, setLocked] = useState<string[]>([])
  const dragId = useRef<string | null>(null)

  const COLS: any[] = [
    { id: "num", label: "#", w: 48, cell: (_: any, i: number) => <span className="text-muted-foreground">{i + 1}</span> },
    { id: "id", label: "ID", w: 110, sort: "id", cell: (s: any) => <CopyText text={s.id}><span className="font-medium tabular-nums">{s.id}</span></CopyText> },
    { id: "img", label: "IMG", w: 56, center: true, cell: (s: any) => <AvatarCell s={s} /> },
    { id: "name", label: "Full name", w: 170, sort: "name", cell: (s: any) => <CopyText text={s.name}>{s.name}</CopyText> },
    { id: "nick", label: "Nick name", w: 100, sort: "nick", cell: (s: any) => <CopyText text={s.nick}>{s.nick}</CopyText> },
    { id: "grade", label: "Grade", w: 100, cell: (s: any) => <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold">{s.grade}</span> },
    ...liveSubs.map((sub: string) => ({ id: "subj_" + sub, label: SUBJ[sub].n, w: 0, cell: (s: any) => <StatusIcon st={subjStatus(s, course, sub, week)} /> })),
  ]
  const defOrder = COLS.map((c) => c.id)
  const ord = order.length ? order.filter((id) => defOrder.includes(id)) : defOrder
  const fullOrd = [...ord, ...defOrder.filter((id) => !ord.includes(id))]
  const byId = (id: string) => COLS.find((c) => c.id === id)
  const visLocked = locked.filter((id) => fullOrd.includes(id))
  const visUnlocked = fullOrd.filter((id) => !locked.includes(id))
  const cols = [...visLocked, ...visUnlocked].map(byId)

  const val = (s: any) => sort.key === "status" ? ORD[overallStatus(s, course, week)] : sort.key === "id" ? s.id : String(s[sort.key] ?? "").toLowerCase()
  const sorted = [...roster].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir })
  const toggleSort = (k: string) => setSort((p) => (p.key === k ? { key: k, dir: -p.dir } : { key: k, dir: 1 }))
  const toggleLock = (id: string) => setLocked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const drop = (t: string) => { const src = dragId.current; dragId.current = null; if (!src || src === t) return; setOrder(() => { const a = fullOrd.filter((x) => x !== src); const ti = a.indexOf(t); a.splice(ti < 0 ? a.length : ti, 0, src); return a }) }

  let acc = 44
  const leftOf: Record<string, number> = {}
  cols.forEach((c) => { if (locked.includes(c.id)) { leftOf[c.id] = acc; acc += c.w } })
  const lastLock = visLocked.length ? visLocked[visLocked.length - 1] : null
  const stick = "sticky bg-card z-10", edge = "shadow-[6px_0_8px_-6px_rgba(20,16,40,0.15)]"
  const arrow = (k: string) => sort.key === k ? (sort.dir > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 text-muted-foreground/50" />

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="overflow-x-auto"><Table className="w-full table-fixed">
        <TableHeader><TableRow>
          <TableHead style={{ width: 56, left: 0 }} className={cn(stick, !visLocked.length && edge)}><Checkbox checked={allSel} onCheckedChange={(v) => setSel(v ? new Set(selectable) : new Set())} /></TableHead>
          {cols.map((c) => {
            const lk = locked.includes(c.id)
            return (
              <TableHead key={c.id} title={c.label} draggable onDragStart={() => (dragId.current = c.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(c.id)}
                style={{ width: c.w || undefined, left: lk ? leftOf[c.id] : undefined }} className={cn(c.center && "text-center", lk && stick, lastLock === c.id && edge)}>
                <div className={cn("flex items-center gap-1", c.center && "justify-center")}>
                  {lk && <Lock className="size-3 text-muted-foreground" />}
                  <span className={cn("truncate", c.sort && "cursor-pointer")} onClick={() => c.sort && toggleSort(c.sort)}>{c.label}</span>
                  {c.sort && arrow(c.sort)}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><button className="ml-auto text-muted-foreground/60 hover:text-foreground"><ChevronDown className="size-3.5" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-44">
                      {c.sort && <><DropdownMenuItem onClick={() => setSort({ key: c.sort, dir: 1 })}><ArrowUp className="mr-2 size-4" /> เรียง A → Z</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSort({ key: c.sort, dir: -1 })}><ArrowDown className="mr-2 size-4" /> เรียง Z → A</DropdownMenuItem><DropdownMenuSeparator /></>}
                      <DropdownMenuItem onClick={() => toggleLock(c.id)}>{lk ? <><LockOpen className="mr-2 size-4" /> ปลดล็อก</> : <><Lock className="mr-2 size-4" /> Lock ชิดซ้าย</>}</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </TableHead>
            )
          })}
          <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("status")}>
            <span className="inline-flex items-center gap-1">Status {arrow("status")}</span>
          </TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {sorted.map((s: any, i: number) => (
            <TableRow key={s.idx} className={cn("group cursor-pointer", focus?.field === "send" && !isSent(s, course, week) && "row-blink")} onClick={() => openDrawer(s.idx, course, week)}>
              <TableCell style={{ left: 0 }} className={cn(stick, "group-hover:bg-muted", !visLocked.length && edge)} onClick={(e) => e.stopPropagation()}>
                <Checkbox checked={sel.has(s.idx)} onCheckedChange={(v: any) => setSel((cur: Set<number>) => { const n = new Set(cur); v ? n.add(s.idx) : n.delete(s.idx); return n })} />
              </TableCell>
              {cols.map((c) => {
                const lk = locked.includes(c.id)
                return <TableCell key={c.id} style={{ left: lk ? leftOf[c.id] : undefined }} className={cn("truncate", c.center && "text-center", lk && stick, lk && "group-hover:bg-muted", lastLock === c.id && edge)}>{c.cell(s, i)}</TableCell>
              })}
              <TableCell className="text-right"><div className="flex justify-end"><StatusPill st={overallStatus(s, course, week)} /></div></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table></div>
    </div>
  )
}

function SubjectView({ course, week, sub, roster, openDrawer, focus }: any) {
  useSync()
  const openHw = useHwDialog((st: any) => st.open)
  const openHwSetup = useHwSetup((st) => st.open)
  const nc = isNoClass(course, sub, week)
  useEffect(() => {
    if (!focus) return
    const t = setTimeout(() => document.querySelector(".row-blink")?.scrollIntoView({ behavior: "smooth", block: "center" }), 80)
    return () => clearTimeout(t)
  }, [focus])
  if (nc) return <Card><CardContent className="p-6 text-sm text-muted-foreground">ไม่มีการเรียนการสอน {SUBJ[sub].n} ใน W{week}</CardContent></Card>
  const app = roster
  const present = app.filter((s: any) => { const r = R[s.idx][sub]?.[week]; return r?.att === "present" || r?.att === "makeup" }).length
  const lqN = app.filter((s: any) => (R[s.idx][sub]?.[week]?.lqDone ?? 0) > 0).length
  const totDone = app.reduce((a: number, s: any) => a + (R[s.idx][sub]?.[week]?.lqDone ?? 0), 0)
  const totCorr = app.reduce((a: number, s: any) => a + (R[s.idx][sub]?.[week]?.lqCorrect ?? 0), 0)
  const hwCol = app.filter((s: any) => R[s.idx][sub]?.[week]?.collected).length

  return (
    <>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="เข้าเรียน" value={`${present}/${app.length}`} tone="text-emerald-600" />
        <Kpi label="Live Quiz เข้าทำ" value={`${lqN}/${app.length}`} />
        <Kpi label="ตอบถูกเฉลี่ย" value={`${pct(totCorr, totDone)}%`} tone="text-primary" />
        <Kpi label="Homework เก็บแล้ว" value={`${hwCol}/${app.length}`} tone="text-amber-600" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
        <div className="text-sm"><b>Homework · {SUBJ[sub].n}</b> <span className="text-muted-foreground">— เฉลยกลาง ใช้ร่วมกับนักเรียนทุกคนใน W{week}</span></div>
        <Button size="sm" onClick={() => openHwSetup(course, sub, week)}><ClipboardList className="mr-1.5 size-4" /> สร้าง / แก้ Homework</Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="overflow-x-auto"><Table className="w-full table-fixed">
          <TableHeader><TableRow>
            <TableHead style={{ width: 56 }}><Checkbox /></TableHead>
            <TableHead style={{ width: 48 }}>#</TableHead>
            <TableHead style={{ width: 110 }}>ID</TableHead>
            <TableHead style={{ width: 170 }}>Full name</TableHead>
            <TableHead style={{ width: 100 }}>Nick name</TableHead>
            <TableHead style={{ width: 120 }}>Attendance</TableHead>
            <TableHead>ทำควิซ</TableHead>
            <TableHead>คะแนนควิซ</TableHead>
            <TableHead>Homework</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {app.map((s: any, i: number) => {
              const r = R[s.idx][sub]?.[week]
              const blink = focus?.field === "homework" && !r?.collected
              return (
                <TableRow key={s.idx} className={cn("cursor-pointer", blink && "row-blink")} onClick={() => openDrawer(s.idx, course, week)}>
                  <TableCell onClick={(e) => e.stopPropagation()}><Checkbox /></TableCell>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="truncate"><CopyText text={s.id}><span className="font-medium tabular-nums">{s.id}</span></CopyText></TableCell>
                  <TableCell className="truncate"><CopyText text={s.name}>{s.name}</CopyText></TableCell>
                  <TableCell className="truncate"><CopyText text={s.nick}>{s.nick} {r?.late && <span className="rounded bg-red-100 px-1 text-[10px] text-red-600">ช้า</span>}</CopyText></TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Select value={r?.att === "absent" ? "absent" : "present"} onValueChange={(v) => setResult(s.idx, sub, week, { att: v as "present" | "absent" })}>
                      <SelectTrigger className="h-8 w-[104px]"><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="present">เข้าเรียน</SelectItem><SelectItem value="absent">ขาดเรียน</SelectItem></SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FieldShell front={r?.lqDone ?? 0} total={r?.lqT ?? 0} onFront={(v) => setResult(s.idx, sub, week, { lqDone: v })}>
                      <QuizChevron idx={s.idx} sub={sub} week={week} />
                    </FieldShell>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FieldShell front={r?.lqCorrect ?? 0} total={r?.lqT ?? 0} onFront={(v) => setResult(s.idx, sub, week, { lqCorrect: v })}>
                      <QuizChevron idx={s.idx} sub={sub} week={week} />
                    </FieldShell>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FieldShell front={r?.hwScore ?? 0} total={r?.hwT ?? 0} onFront={(v) => setResult(s.idx, sub, week, { hwScore: v, collected: true })}>
                      <button className={CHEV_BTN} title="เปิดตารางการบ้าน (ข้อ/เฉลย)" onClick={() => openHw(s.idx, course, sub, week)}><ChevronRight className="size-4" /></button>
                    </FieldShell>
                  </TableCell>
                  <TableCell className="text-right"><div className="flex justify-end"><StatusPill st={subjStatus(s, course, sub, week)} /></div></TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table></div>
      </div>
    </>
  )
}

function TextNum({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  return (
    <input type="number" value={value} min={0} onClick={(e) => e.stopPropagation()}
      onChange={(e) => onSave(Math.max(0, +e.target.value || 0))}
      className="w-7 cursor-pointer rounded-sm border-0 bg-transparent p-0 text-right text-sm tabular-nums outline-none hover:underline focus:bg-muted focus:underline [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
  )
}
const CHEV_BTN = "flex h-full items-center rounded-r-[5px] border-l px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"

// เซลล์ = field กรอกในตัว (front) + /total + chevron (popup ของแต่ละคอลัมน์)
function FieldShell({ front, total, onFront, children }: { front: number; total: number; onFront: (v: number) => void; children: ReactNode }) {
  return (
    <div className="inline-flex h-8 items-center rounded-md border bg-background">
      <div className="flex items-center gap-0.5 pl-2 pr-2">
        <TextNum value={front} onSave={onFront} />
        <span className="text-sm tabular-nums text-muted-foreground">/{total}</span>
      </div>
      {children}
    </div>
  )
}

// chevron ทำควิซ + คะแนนควิซ → เปิด QuizDialog เดียวกัน (ผลรายข้อ read-only จาก Web Admin)
function QuizChevron({ idx, sub, week }: { idx: number; sub: string; week: number }) {
  const openQuiz = useQuizDialog((st) => st.open)
  return <button className={CHEV_BTN} title="ดูผล Live Quiz รายข้อ" onClick={() => openQuiz(idx, sub, week)}><ChevronRight className="size-4" /></button>
}

export function FeedbackEditor({ course, sub, week }: { course: string; sub: string; week: number }) {
  useSync()
  const prep = fbPrepared(course, sub, week)
  return (
    <div className={cn("rounded-xl border p-4", prep ? "border-emerald-200 bg-emerald-50/60" : "border-teal-200 bg-teal-50/60")}>
      <div className={cn("mb-2 flex items-center gap-2 text-xs font-semibold", prep ? "text-emerald-700" : "text-teal-700")}>
        {prep ? "✓ Submit แล้ว · Prepared — แก้ไขได้ตลอด" : "✦ ร่างโดย AI · ยังไม่ Submit"}
        <span className="ml-auto text-[11px] font-normal text-muted-foreground">Live topic: {topicOf(sub, week)}</span>
      </div>
      <textarea defaultValue={fbText(course, sub, week)} onChange={(e) => setFeedbackText(course, sub, week, e.target.value)}
        className="min-h-24 w-full resize-y rounded-md border bg-background p-2.5 text-sm leading-relaxed shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      <div className="mt-2.5 flex gap-2">
        {prep
          ? <><Button size="sm" variant="outline" onClick={() => submitFeedback(course, sub, week)}>บันทึกการแก้ไข</Button><Button size="sm" variant="outline" onClick={() => unsubmitFeedback(course, sub, week)}>ยกเลิก Submit</Button></>
          : <Button size="sm" onClick={() => submitFeedback(course, sub, week)}><Check className="mr-2 size-4" /> Submit → Prepared ทั้งห้อง</Button>}
      </div>
    </div>
  )
}
