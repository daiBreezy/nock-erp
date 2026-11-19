"use client"

import { Panel, Empty, InfoTip, fmtNum, fmtPct } from "@/components/reports/charts"
import { monthShort, yearOf } from "@/domain/dates"
import type { Staff } from "@/domain/types"
import { pointsByTeacher } from "@/domain/rules/referral"
import { tx, nm } from "@/lib/i18n"
import { useStore } from "@/store/store"
import { cn } from "@/lib/utils"

/**
 * Teacher Performance (owner 2026-11-19) — replaces Teacher Health on the Operations tab.
 * ⚠ MOCK: the prototype has no tenure / per-teacher funnel / churn / referral / score data yet, so every number below is
 * made up from the teacher's id (stable between renders). When Dev wires the real fields, replace `mockTeacher` only.
 */
export interface PerfRow {
  id: string; name: string; since: string; tenureDays: number
  leads: number; tests: number; enrolled: number          // Lead → Test/Trial → Enrollment
  students: number; courses: number
  churned: number; referrals: number
  /** ACI: the average NPS (0–10) the parents of this teacher's students gave, and how many answered */
  aci: number; aciN: number
}

const hash = (s: string, k = 0) => { let h = 2166136261 ^ k; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return ((h >>> 0) % 10000) / 10000 }
const between = (s: string, k: number, lo: number, hi: number) => Math.round(lo + hash(s, k) * (hi - lo))

export function mockTeacher(t: Staff, today: string): PerfRow {
  const tenureDays = between(t.id, 1, 20, 2900)
  const d = new Date(`${today}T00:00:00`); d.setDate(d.getDate() - tenureDays)
  const leads = between(t.id, 2, 8, 70)
  const tests = Math.min(leads, Math.round(leads * (0.45 + hash(t.id, 3) * 0.4)))
  const enrolled = Math.min(tests, Math.round(tests * (0.3 + hash(t.id, 4) * 0.5)))
  const students = between(t.id, 5, 8, 42)
  return {
    id: t.id, name: t.nickname, since: d.toISOString().slice(0, 10), tenureDays, leads, tests, enrolled,
    students, courses: Math.max(1, Math.round(students / between(t.id, 6, 3, 6))),
    churned: between(t.id, 7, 0, Math.max(1, Math.round(students * 0.2))), referrals: between(t.id, 8, 0, 6),
    aci: Math.round((6.4 + hash(t.id, 9) * 3.4) * 10) / 10, aciN: between(t.id, 10, 3, 24),
  }
}

/** 7y 2m · 2m 14d · 18d — calendar years / months / days between the start date and today, as two fixed slots */
function tenureParts(since: string, today: string): [string, string] {
  const a = new Date(`${since}T00:00:00`), b = new Date(`${today}T00:00:00`)
  let m = (b.getFullYear() - a.getFullYear()) * 12 + b.getMonth() - a.getMonth()
  if (b.getDate() < a.getDate()) m--
  const from = new Date(a); from.setMonth(from.getMonth() + m)
  const days = Math.round((b.getTime() - from.getTime()) / 86400000)
  if (m >= 12) return [`${Math.floor(m / 12)}y`, `${m % 12}m`]
  if (m >= 1) return [`${m}m`, `${days}d`]
  return ["", `${days}d`]
}

/** a value split into slots of fixed width, each right-aligned — so the day, the month and the year sit in the same place on every row */
const Slots = ({ parts, widths, aligns = [] }: { parts: string[]; widths: string[]; aligns?: ("left" | "right")[] }) => (
  <span className="inline-flex justify-end gap-1 tabular-nums">{parts.map((x, i) => <span key={i} className={widths[i]} style={{ textAlign: aligns[i] ?? "right" }}>{x}</span>)}</span>
)
function startParts(since: string): string[] {
  const [y, m, d] = since.split("-").map(Number)
  const yr = yearOf(y)
  return [String(d), monthShort(m - 1), String(yr > 2400 ? String(yr).slice(-2) : yr)]
}
const rate = (a: number, b: number) => (b ? a / b : null)
const tone = (r: number | null) => (r === null ? "text-muted-foreground" : r >= 0.6 ? "text-success" : r < 0.4 ? "text-danger" : "")

/** "38/56   68%" — the % after the count; fixed-width slots so 1-, 2- and 3-digit numbers line up */
function Frac({ a, b, r }: { a: number; b: number; r: number | null }) {
  return (
    <span className="inline-flex items-baseline justify-end gap-2 tabular-nums">
      <span className="w-16 text-right text-xs text-muted-foreground">{a}/{b}</span>
      <span className={cn("w-10 text-right font-medium", tone(r))}>{fmtPct(r)}</span>
    </span>
  )
}

const Head = ({ tip, children }: { tip: string; children: React.ReactNode }) => <span className="inline-flex items-center gap-1">{children}<InfoTip text={tip} /></span>

export function TeacherPerformance({ teachers, today }: { teachers: Staff[]; today: string }) {
  // owner 2026-11-19: Referral points are real now (1 point per referred family that paid, shared by the referrer's teachers) — added on top of the mock figure
  const awards = useStore((s) => s.referralAwards)
  const real = pointsByTeacher(awards)
  const rows = teachers.map((t) => { const m = mockTeacher(t, today); return { ...m, referrals: m.referrals + (real.get(t.id) ?? 0) } }).sort((a, b) => b.tenureDays - a.tenureDays)
  return (
    <Panel title={tx("Teacher Performance")} hint={tx("เรียงตามอายุงาน (นานสุดอยู่บน) · ข้อมูลจำลอง — ยังไม่ต่อข้อมูลจริง")}>
      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] table-fixed text-sm [&_td]:px-3 [&_th]:px-3 [&_td:first-child]:pl-0 [&_th:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:last-child]:pr-0">
            {/* one width per column — the gaps between numbers stay equal whatever the digits are */}
            <colgroup>{["9rem", "7.5rem", "6rem", "9.5rem", "9.5rem", "5rem", "4rem", "6.5rem", "4rem", "5.5rem"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left font-normal">{tx("ครู")}</th>
                <th className="text-right font-normal">{tx("เริ่มงาน")}</th>
                <th className="text-right font-normal">{tx("อายุงาน")}</th>
                <th className="whitespace-nowrap text-right font-normal">Lead → Test/Trial</th>
                <th className="text-right font-normal"><Head tip={tx("Conversion Rate = Test/Trial → Enrollment · จำนวนที่สมัครจริง ÷ จำนวน Test/Trial ของครูคนนี้")}>Conversion</Head></th>
                <th className="text-right font-normal">{tx("นักเรียน")}</th>
                <th className="text-right font-normal">{tx("คอร์ส")}</th>
                <th className="text-right font-normal">Churn</th>
                <th className="text-right font-normal"><Head tip={tx("Referral Enrollments · ผู้ปกครองใหม่กรอก Ref ID ของผู้แนะนำตอนสมัคร → ระบบดูว่านักเรียนของครอบครัวผู้แนะนำเรียนคอร์สอะไรอยู่ และครูของแต่ละคอร์สคือใคร → ครูเหล่านั้นได้ 1 คะแนน Ref ต่อครอบครัวที่แนะนำมา")}>Ref</Head></th>
                <th className="text-right font-normal"><Head tip={tx("Academic Improvement (ACI) · เฉลี่ยคะแนน NPS (0–10) ที่ผู้ปกครองให้ โดยดูว่าครอบครัวนั้นมีนักเรียนเรียนคอร์สอะไรอยู่ แล้วคะแนนไปที่ครูของคอร์สนั้น (ตัวเลขเล็ก = จำนวนผู้ปกครองที่ตอบ)")}>ACI</Head></th>
              </tr>
            </thead>
            <tbody>{rows.map((r) => {
              const c1 = rate(r.tests, r.leads), c2 = rate(r.enrolled, r.tests), churn = rate(r.churned, r.students)
              return (
                <tr key={r.id} className="border-t">
                  <td className="py-1.5">{nm(r.name)}</td>
                  <td className="text-right text-muted-foreground"><Slots parts={startParts(r.since)} widths={["w-4", "w-8", "w-4"]} aligns={["right", "left", "right"]} /></td>
                  <td className="text-right"><Slots parts={tenureParts(r.since, today)} widths={["w-6", "w-7"]} /></td>
                  <td className="text-right"><Frac a={r.tests} b={r.leads} r={c1} /></td>
                  <td className="text-right"><Frac a={r.enrolled} b={r.tests} r={c2} /></td>
                  <td className="text-right tabular-nums">{fmtNum(r.students)}</td>
                  <td className="text-right tabular-nums">{fmtNum(r.courses)}</td>
                  <td className={cn("text-right tabular-nums", churn !== null && churn > 0.15 && "font-medium text-danger")}><span className="inline-flex items-baseline justify-end gap-2"><span className="w-4 text-right">{r.churned}</span><span className="w-10 text-right text-xs text-muted-foreground">({fmtPct(churn)})</span></span></td>
                  <td className="text-right tabular-nums">{r.referrals ? (Number.isInteger(r.referrals) ? r.referrals : r.referrals.toFixed(2)) : "—"}</td>
                  <td className={cn("text-right tabular-nums", r.aci >= 8.5 ? "text-success" : r.aci < 7 ? "text-danger" : "")}><span className="inline-flex items-baseline justify-end gap-1.5"><span className="font-medium">{r.aci.toFixed(1)}</span><span className="w-8 text-right text-xs text-muted-foreground">({r.aciN})</span></span></td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      ) : <Empty />}
    </Panel>
  )
}
