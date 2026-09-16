import { useState, type ReactNode } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from "recharts"
import { COURSES, CUR_WEEK, WEEKS, SUBJ, WK_DATE, courseObj, courseShort, topicOf } from "@/data"
import { courseWeekly, courseTotals, courseStudents, courseVelocity, reportsSentByWeek, pct, courseWeeklyPart, subjectParticipation, subjWeeklyPart } from "@/logic"
import { useSync } from "@/store"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Segmented } from "@/pages/Summary"

const QUIZ = "#2a78d6", HW = "#eb6834", ATT = "#10b981"
const DONE = "#22c55e", PARTIAL = "#f59e0b", NONE = "#ef4444"
const ST = { active: "#10b981", inactive: "#f59e0b", churn: "#ef4444" }
const wkWeeks = WEEKS.filter((w) => w <= CUR_WEEK)
const axis = "hsl(var(--muted-foreground))", grid = "hsl(var(--border))"
const tip = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12, color: "hsl(var(--popover-foreground))" }

function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">{label}</div><div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone)}>{value}</div>{sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}</CardContent></Card>
}
function Box({ title, desc, right, children }: { title: string; desc?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <Card><CardContent className="p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div><div className="text-sm font-semibold">{title}</div>{desc && <div className="text-[11px] text-muted-foreground">{desc}</div>}</div>
        {right}
      </div>
      {children}
    </CardContent></Card>
  )
}
function Legend({ items }: { items: { c: string; l: string }[] }) {
  return <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">{items.map((i) => <span key={i.l} className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[3px]" style={{ background: i.c }} />{i.l}</span>)}</div>
}

export function Report() {
  useSync()
  const [course, setCourse] = useState("c1")
  const [tab, setTab] = useState("overview")

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Report</h1><p className="text-sm text-muted-foreground">สรุปผลย้อนหลังของคอร์ส (W1–W{CUR_WEEK}) เพื่อวิเคราะห์และปรับปรุง — read-only</p></div>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={course} onChange={setCourse} options={COURSES.map((x) => ({ v: x.id, l: x.n }))} />
        <span className="ml-auto text-[11px] text-muted-foreground">{courseShort(course)} · {WK_DATE[1]?.split("–")[0]}–{WK_DATE[CUR_WEEK]}</span>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="overview">ภาพรวม</TabsTrigger>
          <TabsTrigger value="week">รายสัปดาห์</TabsTrigger>
          <TabsTrigger value="subject">รายวิชา</TabsTrigger>
          <TabsTrigger value="student">นักเรียน</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-4"><Overview course={course} /></TabsContent>
        <TabsContent value="week" className="mt-4"><ByWeek course={course} /></TabsContent>
        <TabsContent value="subject" className="mt-4"><BySubject course={course} /></TabsContent>
        <TabsContent value="student" className="mt-4"><ByStudent course={course} /></TabsContent>
      </Tabs>
    </div>
  )
}

function Overview({ course }: { course: string }) {
  const t = courseTotals(course), cs = courseStudents(course), weekly = courseWeekly(course)
  const part = courseWeeklyPart(course)
  const overallDone = pct(part.reduce((a, p) => a + p.done, 0), part.reduce((a, p) => a + p.total, 0))
  const trend = weekly.map((w, i) => ({ week: w.week, done: part[i].donePct, hw: w.hw, att: w.att }))
  const donut = [{ name: "Active", value: cs.active, fill: ST.active }, { name: "Inactive", value: cs.inactive, fill: ST.inactive }, { name: "Churn", value: cs.churn, fill: ST.churn }]
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <Kpi label="นักเรียน" value={`${cs.active}/${cs.total}`} sub="active / ทั้งหมด" />
        <Kpi label="ทำ Quiz ครบ" value={`${overallDone}%`} sub="ทำครบทุกข้อ" tone="text-[color:#2a78d6]" />
        <Kpi label="ส่งการบ้าน" value={`${t.hw ?? "–"}%`} tone="text-amber-600" />
        <Kpi label="เข้าเรียน" value={`${t.att ?? "–"}%`} tone="text-emerald-600" />
        <Kpi label="รายงานส่งแล้ว" value={`${t.sentPct}%`} sub="ต่อผู้ปกครอง" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <Box title="แนวโน้มรวมทั้งคอร์ส" desc="% ทำ Quiz ครบ · เข้าเรียน · ส่งการบ้าน — ต่อสัปดาห์" right={<Legend items={[{ c: QUIZ, l: "ทำครบ Quiz" }, { c: HW, l: "การบ้าน" }, { c: ATT, l: "เข้าเรียน" }]} />}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={grid} />
                <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} />
                <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: axis }} />
                <Tooltip contentStyle={tip} formatter={(v: any, n: any) => [v == null ? "–" : v + "%", n]} />
                <Line dataKey="done" name="ทำครบ Quiz" stroke={QUIZ} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                <Line dataKey="hw" name="การบ้าน" stroke={HW} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 3 }} connectNulls isAnimationActive={false} />
                <Line dataKey="att" name="เข้าเรียน" stroke={ATT} strokeWidth={2} dot={{ r: 3 }} connectNulls isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Box>
        <Box title="สถานะนักเรียน" desc={`ทั้งหมด ${cs.total} คน`}>
          <div className="relative h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={62} outerRadius={90} paddingAngle={2} stroke="none">
                  {donut.map((d) => <Cell key={d.name} fill={d.fill} />)}
                </Pie>
                <Tooltip contentStyle={tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold">{cs.active}</span><span className="text-[11px] text-muted-foreground">active</span></div>
          </div>
          <div className="mt-1"><Legend items={[{ c: ST.active, l: `Active ${cs.active}` }, { c: ST.inactive, l: `Inactive ${cs.inactive}` }, { c: ST.churn, l: `Churn ${cs.churn}` }]} /></div>
        </Box>
      </div>
    </div>
  )
}

function ByWeek({ course }: { course: string }) {
  const part = courseWeeklyPart(course), weekly = courseWeekly(course), sent = reportsSentByWeek(course)
  const rows = part.map((p, i) => ({ ...p, att: weekly[i].att, hw: weekly[i].hw, sent: sent[i].sent, tot: sent[i].total }))
  const weak = Math.min(...rows.map((r) => (r.total ? r.donePct : 999)))
  return (
    <div className="space-y-4">
      <Box title="การมีส่วนร่วม Quiz แต่ละสัปดาห์" desc="ทำครบ / ทำไม่ครบ / ไม่ทำ (จำนวนคน) — สัปดาห์ไหนนักเรียนมีส่วนร่วมมาก/น้อย" right={<Legend items={[{ c: DONE, l: "ทำครบ" }, { c: PARTIAL, l: "ทำไม่ครบ" }, { c: NONE, l: "ไม่ทำ" }]} />}>
        <div className="h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 16, right: 8, left: -22, bottom: 0 }} barCategoryGap="26%">
              <CartesianGrid vertical={false} stroke={grid} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: axis }} />
              <Tooltip contentStyle={tip} formatter={(v: any, n: any) => [v + " คน", n]} />
              <Bar dataKey="done" stackId="p" name="ทำครบ" fill={DONE} maxBarSize={32} isAnimationActive={false} />
              <Bar dataKey="partial" stackId="p" name="ทำไม่ครบ" fill={PARTIAL} maxBarSize={32} isAnimationActive={false} />
              <Bar dataKey="none" stackId="p" name="ไม่ทำ" fill={NONE} radius={[3, 3, 0, 0]} maxBarSize={32} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Box>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>สัปดาห์</TableHead><TableHead className="text-right">ทำครบ</TableHead><TableHead className="text-right">ทำไม่ครบ</TableHead><TableHead className="text-right">ไม่ทำ</TableHead><TableHead className="text-right">% ทำครบ</TableHead><TableHead className="text-right">เข้าเรียน</TableHead><TableHead className="text-right">การบ้าน</TableHead><TableHead className="text-right">รายงานส่ง</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {rows.map((r) => {
                const isWeak = r.total > 0 && r.donePct === weak
                return (
                  <TableRow key={r.week} className={cn(isWeak && "bg-red-50 dark:bg-red-950/30")}>
                    <TableCell className="whitespace-nowrap font-medium">{r.week} <span className="text-[11px] text-muted-foreground">· {WK_DATE[+r.week.slice(1)]}</span></TableCell>
                    <TableCell className="text-right tabular-nums text-emerald-600">{r.done}</TableCell>
                    <TableCell className="text-right tabular-nums text-amber-600">{r.partial}</TableCell>
                    <TableCell className="text-right tabular-nums text-red-600">{r.none}</TableCell>
                    <TableCell className={cn("text-right font-semibold tabular-nums", isWeak && "text-red-600")}>{r.total ? r.donePct + "%" : "–"}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{r.att ?? "–"}%</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{r.hw ?? "–"}%</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{r.sent}/{r.tot}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent></Card>
    </div>
  )
}

const heat = (v: number | null) => v == null ? "bg-muted text-muted-foreground" : v >= 80 ? "bg-emerald-500/85 text-white" : v >= 60 ? "bg-emerald-400/60 text-emerald-950 dark:text-emerald-50" : v >= 40 ? "bg-amber-400/60 text-amber-950 dark:text-amber-50" : "bg-red-400/70 text-red-950 dark:text-red-50"

function BySubject({ course }: { course: string }) {
  const subs = courseObj(course).subs
  const parts = subjectParticipation(course)
  return (
    <div className="space-y-4">
      <Box title="การมีส่วนร่วม Quiz รายวิชา (ทั้งช่วง)" desc="วิชาที่ “ไม่ทำ” เยอะ = มีปัญหา/ความสนใจต่ำ · “ทำครบ” เยอะ = ได้รับความนิยม" right={<Legend items={[{ c: DONE, l: "ทำครบ" }, { c: PARTIAL, l: "ทำไม่ครบ" }, { c: NONE, l: "ไม่ทำ" }]} />}>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={parts} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 4 }}>
              <CartesianGrid horizontal={false} stroke={grid} />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: axis }} />
              <YAxis type="category" dataKey="short" width={70} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} />
              <Tooltip contentStyle={tip} formatter={(v: any, n: any) => [v + " คน", n]} />
              <Bar dataKey="done" stackId="p" name="ทำครบ" fill={DONE} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="partial" stackId="p" name="ทำไม่ครบ" fill={PARTIAL} maxBarSize={24} isAnimationActive={false} />
              <Bar dataKey="none" stackId="p" name="ไม่ทำ" fill={NONE} radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Box>
      <Box title="% ทำ Quiz ครบ · รายวิชา × สัปดาห์" desc="ช่องแดง = สัปดาห์ที่นักเรียนทำครบน้อย → วิชานั้นเริ่มมีปัญหา/ความสนใจตก">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-center text-xs">
            <thead>
              <tr><th className="p-1 text-left font-medium text-muted-foreground">วิชา</th>{wkWeeks.map((w) => <th key={w} className="p-1 font-medium text-muted-foreground">W{w}</th>)}</tr>
            </thead>
            <tbody>
              {subs.map((sub) => {
                const pw = subjWeeklyPart(course, sub)
                return (
                  <tr key={sub}>
                    <td className="whitespace-nowrap p-1 text-left font-medium">{SUBJ[sub].short}</td>
                    {wkWeeks.map((w, i) => {
                      const p = pw[i], v = p.total ? Math.round((p.done / p.total) * 100) : null
                      return <td key={w} title={`${topicOf(sub, w)} · ทำครบ ${p.done}/${p.total}`} className={cn("rounded-md p-2 font-semibold tabular-nums", heat(v))}>{v == null ? "–" : v}</td>
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Box>
    </div>
  )
}

function ByStudent({ course }: { course: string }) {
  const cs = courseStudents(course), v = courseVelocity(course)
  const donut = [{ name: "Active", value: cs.active, fill: ST.active }, { name: "Inactive", value: cs.inactive, fill: ST.inactive }, { name: "Churn", value: cs.churn, fill: ST.churn }]
  const buckets = [{ name: "Inactive 2 wk", value: cs.inact2 }, { name: "Inactive 3 wk", value: cs.inact3 }, { name: "Inactive 4 wk+", value: cs.inact4 }]
  const churnRate = cs.total ? Math.round((cs.churn / cs.total) * 100) : 0
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Churn rate" value={`${churnRate}%`} sub={`${cs.churn} คน`} tone="text-red-600" />
        <Kpi label="Active" value={`${cs.active}`} tone="text-emerald-600" />
        <Kpi label="ดีขึ้น (WoW)" value={`${v.up}`} sub="Quiz สูงขึ้น" tone="text-emerald-600" />
        <Kpi label="ถดถอย (WoW)" value={`${v.down}`} sub="Quiz ลดลง" tone="text-red-600" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Box title="สัดส่วนสถานะ" desc={`ทั้งหมด ${cs.total} คน`}>
          <div className="relative h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={donut} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="none">{donut.map((d) => <Cell key={d.name} fill={d.fill} />)}</Pie>
                <Tooltip contentStyle={tip} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-semibold">{cs.total}</span><span className="text-[11px] text-muted-foreground">นักเรียน</span></div>
          </div>
          <Legend items={[{ c: ST.active, l: `Active ${cs.active}` }, { c: ST.inactive, l: `Inactive ${cs.inactive}` }, { c: ST.churn, l: `Churn ${cs.churn}` }]} />
        </Box>
        <Box title="ระดับการหายไป (Inactivity)" desc="ยิ่งหายนานยิ่งเสี่ยงหลุด — สะสมช่วงที่ผ่านมา">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets} layout="vertical" margin={{ top: 4, right: 28, left: 20, bottom: 4 }}>
                <CartesianGrid horizontal={false} stroke={grid} />
                <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: axis }} />
                <YAxis type="category" dataKey="name" width={92} tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: axis }} />
                <Tooltip contentStyle={tip} formatter={(v: any) => [v + " คน", ""]} />
                <Bar dataKey="value" fill={ST.inactive} radius={[0, 4, 4, 0]} maxBarSize={22} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Box>
      </div>
    </div>
  )
}
