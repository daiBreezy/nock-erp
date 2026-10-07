/**
 * Reports › สรุป (owner 2026-10-05): a written summary per topic — what the numbers say, what caused it, and what
 * to do next. Pure rules over numbers the Reports hook already has (no AI): every sentence points at a figure the
 * other tabs show, so a manager can check it. Thresholds are deliberately simple and listed at the top.
 */

import { yearOf } from "../dates"

/** sentences are written in Thai with {0} {1} … slots; the Reports page passes a translator (TH / EN / JP chip) */
export type Tr = (th: string, vars?: (string | number)[]) => string
const plain: Tr = (th, vars) => (vars ? th.replace(/\{(\d+)\}/g, (m, k) => String(vars[Number(k)] ?? m)) : th)
let T: Tr = plain

export type InsightArea = "revenue" | "students" | "sales" | "attendance" | "teaching" | "satisfaction"
export type InsightTone = "good" | "watch" | "bad"

export interface Insight {
  area: InsightArea
  tone: InsightTone
  title: string
  /** what the numbers show */
  facts: string[]
  /** why it happened — the biggest contributors first */
  causes: string[]
  /** what to do — concrete, with a target when we can size it */
  actions: string[]
}

export interface Counted { label: string; count: number }

export interface InsightInput {
  periodLabel: string
  /** e.g. "เทียบช่วงเดียวกันปีที่แล้ว" */
  vsLabel: string
  /** false when the compared period starts before our first record */
  comparable: boolean
  /** months in the period (for per-month targets) */
  periodMonths: number
  revenue: { now: number; prev: number }
  /** this year month by month up to the current month, with the same month last year */
  months: { label: string; now: number | null; last: number | null; newNow: number; newLast: number; lostNow: number; lostLast: number }[]
  flow: { newNow: number; newPrev: number; lostNow: number; lostPrev: number; returning: number; renewal: number | null; renewalPrev: number | null; active: number }
  /** average monthly spend of one active student */
  perStudentMonth: number | null
  exitReasons: Counted[]
  leadLostReasons: Counted[]
  leadLostStages: Counted[]
  /** times lost leads wanted that we could not offer */
  wantedTimes: Counted[]
  competitors: Counted[]
  sales: { leads: number; enrolled: number; conversion: number | null; open: number; bestSource?: { label: string; conversion: number }; worstSource?: { label: string; conversion: number; leads: number } }
  attendance: { rate: number | null; prevRate: number | null; worstBranch?: { label: string; rate: number }; worstDay?: { label: string; rate: number }; frequentLeavers: number }
  teaching: { pendingWork: number; lowFill: number; overFill: number; busiestTeacher?: { label: string; hours: number } }
  survey?: { year: number; nps: number | null; npsPrev: number | null; weakest?: { label: string; score: number }; toCall: number; notContinuing: number; wants: Counted[] }
  /** sessions per weekday (0 = Sun … 6 = Sat) per branch — to pick the quietest branches and days for a pilot */
  branchLoad: { label: string; byWeekday: number[] }[]
}

// ---- thresholds ----
const DROP = -0.05 // revenue / students down more than 5% = a problem
const RISE = 0.05
const ATT_OK = 0.8
const NPS_OK = 30

const DAY = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์"]

export const pctChange = (now: number, prev: number) => (prev > 0 ? (now - prev) / prev : null)
const pct = (x: number) => `${Math.round(Math.abs(x) * 100)}%`
const pct0 = (x: number | null) => (x === null ? "—" : `${Math.round(x * 100)}%`)
export function baht(n: number) {
  const a = Math.abs(n)
  if (a >= 1_000_000) return T("฿{0}M", [(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")])
  if (a >= 10_000) return T("฿{0}K", [Math.round(n / 1000).toLocaleString("en-US")])
  return T("฿{0}", [Math.round(n).toLocaleString("en-US")])
}

/** Days a wanted-time label names ("เสาร์เช้า 9–11" → [6]); empty when it names none ("หลังเลิกเรียน 17:30–19:00"). */
export function daysIn(label: string): number[] {
  return DAY.map((d, i) => (label.includes(d) ? i : -1)).filter((i) => i >= 0)
}

/**
 * Where to try a new time slot first: the given days (or the two quietest weekdays Mon–Fri) and the two branches
 * with the fewest sessions on those days — a small pilot before rolling it out everywhere.
 */
export function pilotPlan(load: InsightInput["branchLoad"], wanted: string) {
  const named = daysIn(wanted)
  const total = (d: number) => load.reduce((a, b) => a + (b.byWeekday[d] ?? 0), 0)
  const days = named.length ? named : [1, 2, 3, 4, 5].sort((a, b) => total(a) - total(b) || a - b).slice(0, 2).sort((a, b) => a - b)
  const branches = [...load].sort((a, b) => days.reduce((n, d) => n + (a.byWeekday[d] ?? 0), 0) - days.reduce((n, d) => n + (b.byWeekday[d] ?? 0), 0) || a.label.localeCompare(b.label)).slice(0, 2).map((b) => b.label)
  return { days: days.map((d) => T(DAY[d])), branches }
}

/** Students needed to close a monthly revenue gap */
export const studentsToClose = (gapPerMonth: number, perStudentMonth: number | null) => (perStudentMonth && gapPerMonth > 0 ? Math.ceil(gapPerMonth / perStudentMonth) : null)

const top = (xs: Counted[]) => (xs.length ? [...xs].sort((a, b) => b.count - a.count)[0] : undefined)
// reason labels arrive in the UI language (TH / EN / JP) — match all three
const UNREACHABLE = /ติดต่อไม่ได้|ไม่รับสาย|ไม่ตอบ|reach|no reply|連絡|返信/i

// ---------------------------------------------------------------- per topic

function revenue(i: InsightInput): Insight {
  const ch = i.comparable ? pctChange(i.revenue.now, i.revenue.prev) : null
  const facts: string[] = [], causes: string[] = [], actions: string[] = []
  // month by month vs the same month last year (months without last year's data are left out by the caller)
  const yoy = i.months.filter((m) => m.now !== null && m.last).map((m) => ({ ...m, ch: pctChange(m.now!, m.last!)! }))
  // the period itself can't be compared → judge by the last three months that can
  const recent = yoy.slice(-3)
  const trend = ch ?? (recent.length ? pctChange(recent.reduce((a, m) => a + m.now!, 0), recent.reduce((a, m) => a + m.last!, 0)) : null)
  const tone: InsightTone = trend === null ? "watch" : trend <= DROP ? "bad" : trend >= RISE ? "good" : "watch"
  const title = ch !== null
    ? T("รายได้{0} {1} — จาก {2} {3} {4} ({5} {6})", [ch < 0 ? T("ลดลง") : T("เพิ่มขึ้น"), pct(ch), baht(i.revenue.prev), ch < 0 ? T("เหลือ") : T("เป็น"), baht(i.revenue.now), i.periodLabel, i.vsLabel])
    : trend !== null
      ? T("รายได้{0} {1} · {2} เดือนล่าสุด{3} {4} เทียบเดือนเดียวกันปีที่แล้ว", [i.periodLabel, baht(i.revenue.now), recent.length, trend < 0 ? T("ลดลง") : T("เพิ่มขึ้น"), pct(trend)])
      : T("รายได้{0} {1} — ยังเทียบปีที่แล้วไม่ได้ (ข้อมูลในระบบเริ่มทีหลัง)", [i.periodLabel, baht(i.revenue.now)])
  if (ch === null && trend !== null) facts.push(T("ทั้งช่วง{0}ยังเทียบไม่ได้ เพราะข้อมูลปีที่แล้วเริ่มกลางปี — จึงเทียบเฉพาะเดือนที่มีข้อมูลทั้งสองปี ({1})", [i.periodLabel, recent.map((m) => m.label).join(", ")]))
  const worst = [...yoy].sort((a, b) => a.ch - b.ch)[0]
  const best = [...yoy].sort((a, b) => b.ch - a.ch)[0]
  if (worst && worst.ch < 0) facts.push(T("เดือนที่ลดลงมากสุด: {0} {1} จากปีที่แล้ว {2} (−{3})", [worst.label, baht(worst.now!), baht(worst.last!), pct(worst.ch)]))
  if (best && best.ch > 0) facts.push(T("เดือนที่โตมากสุด: {0} {1} จากปีที่แล้ว {2} (+{3})", [best.label, baht(best.now!), baht(best.last!), pct(best.ch)]))
  if (!yoy.length) facts.push(T("ยังไม่มีเดือนไหนที่มีข้อมูลทั้งปีนี้และปีที่แล้วให้เทียบกัน"))
  if (i.flow.renewal !== null) facts.push(T("อัตราต่อคอร์ส {0}{1}", [pct0(i.flow.renewal), i.comparable && i.flow.renewalPrev !== null ? T(" (ช่วงก่อน {0})", [pct0(i.flow.renewalPrev)]) : ""]))

  const falling = tone === "bad" || (worst && worst.ch <= DROP)
  if (falling) {
    // what drove the worst month: fewer new students, more leaving
    if (worst) {
      const n = pctChange(worst.newNow, worst.newLast)
      if (n !== null && n < 0) causes.push(T("{0} มีนักเรียนใหม่ {1} คน น้อยกว่าปีที่แล้ว ({2} คน) ถึง {3} — รายได้ที่หายส่วนใหญ่มาจากช่วงนี้", [worst.label, worst.newNow, worst.newLast, pct(n)]))
      if (worst.lostNow > worst.lostLast) causes.push(T("{0} นักเรียนหลุด {1} คน มากกว่าปีที่แล้ว ({2} คน)", [worst.label, worst.lostNow, worst.lostLast]))
    }
    const lc = i.comparable ? pctChange(i.flow.lostNow, i.flow.lostPrev) : null
    if (lc !== null && lc > RISE) causes.push(T("Churn เพิ่มขึ้น {0} — หลุด {1} คน (ช่วงก่อน {2})", [pct(lc), i.flow.lostNow, i.flow.lostPrev]))
    if (i.comparable && i.flow.renewal !== null && i.flow.renewalPrev !== null && i.flow.renewal < i.flow.renewalPrev - 0.03) causes.push(T("ต่อคอร์สน้อยลงจาก {0} เหลือ {1}", [pct0(i.flow.renewalPrev), pct0(i.flow.renewal)]))
    const er = top(i.exitReasons)
    if (er) causes.push(T("เหตุผลที่ออกมากสุด: \"{0}\" ({1} คน)", [er.label, er.count]))
    const wt = top(i.wantedTimes)
    if (wt) causes.push(T("ผู้ปกครองอยากได้เวลา \"{0}\" แต่เรายังไม่ได้เปิด ({1} ราย จาก Lead ที่หลุด)", [wt.label, wt.count]))
    if (!causes.length) causes.push(T("ยังไม่เห็นสาเหตุชัด — จำนวนนักเรียนใหม่และที่หลุดใกล้เคียงช่วงก่อน ลองดูราคาต่อคอร์ส / แพ็กเกจที่ขาย"))

    const gap = i.comparable && i.revenue.prev > i.revenue.now ? (i.revenue.prev - i.revenue.now) / Math.max(1, i.periodMonths) : worst && worst.last! > worst.now! ? worst.last! - worst.now! : 0
    const need = studentsToClose(gap, i.perStudentMonth)
    if (wt) {
      const p = pilotPlan(i.branchLoad, wt.label)
      actions.push(T("ทดลองเปิดคาบ \"{0}\" {1} ที่สาขา{2} ก่อน (สาขาที่ว่างที่สุดในวันนั้น) แล้วติดตามผล 1–2 เดือน", [wt.label, p.days.length ? T("วัน{0}", [p.days.join(T(" และ "))]) : "", p.branches.join(T(" และ "))]))
      actions.push(T("ถ้าได้ผลดี ค่อยขยายไปทุกสาขา เริ่มจากสาขาที่ไม่ยุ่งในวันนั้นก่อน · ส่ง LINE ชวน Lead ที่เคยขอเวลานี้กลับมาทันทีที่เปิด"))
    }
    if (need) actions.push(T("ต้องการนักเรียนเพิ่มประมาณ {0} คน เพื่อปิดรายได้ที่หายไป (~{1}/เดือน · เฉลี่ย {2}/คน/เดือน)", [need, baht(gap), baht(i.perStudentMonth!)]))
    if (i.flow.renewal !== null && i.flow.renewal < 0.8) actions.push(T("โทรหาผู้ปกครองที่แพ็กจะหมดใน 30 วัน ก่อนแพ็กหมด — เสนอแพ็กต่อพร้อมสรุปพัฒนาการของลูก"))
  } else if (tone === "good") {
    if (i.comparable) causes.push(i.flow.newNow > i.flow.newPrev ? T("นักเรียนใหม่มากขึ้น {0} คน (ช่วงก่อน {1})", [i.flow.newNow, i.flow.newPrev]) : T("นักเรียนเดิมต่อคอร์สต่อเนื่อง"))
    if (best && best.ch > 0 && best.newNow > best.newLast) causes.push(T("{0} ได้นักเรียนใหม่ {1} คน (ปีที่แล้ว {2})", [best.label, best.newNow, best.newLast]))
    actions.push(T("รักษาช่องทางที่ได้นักเรียนใหม่ไว้ · ดูแท็บ CRM ว่าแหล่งไหนปิดการขายได้ดีที่สุดแล้วเพิ่มงบตรงนั้น"))
    if (i.flow.renewal !== null && i.flow.renewal < 0.85) actions.push(T("อัตราต่อคอร์ส {0} ยังเพิ่มได้ — โทรหาผู้ปกครองที่แพ็กจะหมดใน 30 วัน ก่อนแพ็กหมด", [pct0(i.flow.renewal)]))
  } else {
    actions.push(trend === null ? T("เก็บข้อมูลต่ออีกระยะ — เมื่อมีข้อมูลปีที่แล้วครบ สรุปจะเทียบให้เอง") : T("ยอดทรงตัว — โฟกัสลดนักเรียนหลุด (ต่อคอร์ส) จะได้ผลเร็วกว่าหาใหม่"))
  }
  return { area: "revenue", tone, title, facts, causes, actions }
}

function students(i: InsightInput): Insight {
  const f = i.flow
  const net = f.newNow + f.returning - f.lostNow
  const lc = i.comparable ? pctChange(f.lostNow, f.lostPrev) : null
  const tone: InsightTone = net < 0 || (lc !== null && lc > 0.2) ? "bad" : net > 0 ? "good" : "watch"
  const facts = [T("เข้าใหม่ {0} · กลับมาเรียน {1} · หลุด {2} → สุทธิ {3}{4} คน · Active ตอนนี้ {5} คน", [f.newNow, f.returning, f.lostNow, net > 0 ? "+" : "", net, f.active])]
  if (lc !== null) facts.push(T("หลุด{0} {1} จากช่วงก่อน ({2} คน)", [lc >= 0 ? T("เพิ่มขึ้น") : T("ลดลง"), pct(lc), f.lostPrev]))
  const causes: string[] = [], actions: string[] = []
  const er = [...i.exitReasons].sort((a, b) => b.count - a.count).slice(0, 3)
  if (er.length) causes.push(T("เหตุผลที่ออก (จากฟอร์มแจ้งออก): {0}", [er.map((r) => `${r.label} ${r.count}`).join(" · ")]))
  if (i.comparable && f.newNow < f.newPrev) causes.push(T("นักเรียนใหม่น้อยลง {0} คน (ช่วงก่อน {1})", [f.newNow, f.newPrev]))
  const r0 = er[0]?.label ?? ""
  if (/เวลา|ตาราง|schedule|時間/i.test(r0)) actions.push(T("เหตุผลอันดับ 1 คือเวลาไม่ลงตัว — เปิดเวลาที่ผู้ปกครองขอ (ดูหัวข้อขาย) และให้ Admin เสนอย้ายคลาสก่อนผู้ปกครองตัดสินใจออก"))
  else if (/ราคา|ค่าใช้จ่าย|cost|費用/i.test(r0)) actions.push(T("เหตุผลอันดับ 1 คือราคา — เสนอแพ็กรายชั่วโมงเล็กลง / ผ่อนจ่าย ให้ครอบครัวที่กำลังจะหมดแพ็ก"))
  else if (/ครู|teacher|講師/i.test(r0)) actions.push(T("เหตุผลอันดับ 1 เกี่ยวกับครู — ดูคะแนนครูในแท็บความพึงพอใจ แล้วคุยกับครูที่คะแนนต่ำ"))
  if (tone === "bad") actions.push(T("ตั้งเป้าลดนักเรียนหลุดเดือนละ 20% — Admin โทรหานักเรียนที่ลาบ่อย / แพ็กใกล้หมด ทุกสัปดาห์"))
  if (!actions.length) actions.push(net > 0 ? T("สุทธิเป็นบวก — ทำต่อ และติดตามเหตุผลที่ออกทุกเดือน") : T("ติดตามเหตุผลที่ออกทุกเดือน"))
  return { area: "students", tone, title: T("นักเรียนสุทธิ {0}{1} คน · หลุด {2} คน", [net > 0 ? "+" : "", net, f.lostNow]), facts, causes, actions }
}

function sales(i: InsightInput): Insight {
  const s = i.sales
  const tone: InsightTone = s.conversion === null ? "watch" : s.conversion < 0.25 ? "bad" : s.conversion >= 0.4 ? "good" : "watch"
  const facts = [T("Lead {0} ราย · สมัคร {1} · Conversion {2} · ยังเปิดอยู่ {3} ราย", [s.leads, s.enrolled, pct0(s.conversion), s.open])]
  if (s.bestSource) facts.push(T("แหล่งที่ปิดได้ดีสุด: {0} ({1})", [s.bestSource.label, pct0(s.bestSource.conversion)]))
  if (s.worstSource) facts.push(T("แหล่งที่ปิดได้น้อยสุด: {0} ({1} จาก {2} ราย)", [s.worstSource.label, pct0(s.worstSource.conversion), s.worstSource.leads]))
  const causes: string[] = [], actions: string[] = []
  const st = top(i.leadLostStages)
  if (st) causes.push(T("หลุดมากสุดที่ขั้น \"{0}\" ({1} ราย)", [st.label, st.count]))
  const rs = [...i.leadLostReasons].sort((a, b) => b.count - a.count).slice(0, 3)
  if (rs.length) causes.push(T("เหตุผลหลัก: {0}", [rs.map((r) => `${r.label} ${r.count}`).join(" · ")]))
  const wt = top(i.wantedTimes)
  if (wt) causes.push(T("เวลาที่ลูกค้าต้องการแต่เราไม่มี: {0} ({1} ราย)", [wt.label, wt.count]))
  const cp = top(i.competitors.filter((c) => c.label !== "ไม่ทราบ"))
  if (cp) causes.push(T("ไปเรียนที่อื่นแทน: {0} ({1} ราย)", [cp.label, cp.count]))
  if (rs[0] && UNREACHABLE.test(rs[0].label)) actions.push(T("เหตุผลอันดับ 1 คือติดต่อไม่ได้ — โทรภายใน 1 ชั่วโมงหลัง Lead เข้า ถ้าไม่รับให้ส่ง LINE ตามทันที และลองอีกครั้งตอนเย็น"))
  if (st && /Test|Trial|นัด|テスト|体験/.test(st.label)) actions.push(T("หลุดที่ขั้นนัด Test / Trial มาก — ส่งเตือนนัดผ่าน LINE ก่อน 1 วัน และโทรยืนยันเช้าวันนัด"))
  if (s.worstSource && s.bestSource) actions.push(T("ย้ายงบ/เวลาจาก {0} ไป {1} ที่ปิดได้ดีกว่า", [s.worstSource.label, s.bestSource.label]))
  if (wt) actions.push(T("เวลา \"{0}\" ถูกขอบ่อย — ดูแผนทดลองเปิดคาบในหัวข้อรายได้", [wt.label]))
  if (!actions.length) actions.push(T("ติดตาม Lead ที่ยังเปิดอยู่ให้ครบทุกรายในสัปดาห์นี้"))
  return { area: "sales", tone, title: T("Conversion {0} — Lead {1} ราย สมัคร {2}", [pct0(s.conversion), s.leads, s.enrolled]), facts, causes, actions }
}

function attendance(i: InsightInput): Insight | null {
  const a = i.attendance
  if (a.rate === null) return null
  const tone: InsightTone = a.rate < ATT_OK ? "bad" : a.prevRate !== null && a.rate < a.prevRate - 0.03 ? "watch" : "good"
  const facts = [T("อัตราเข้าเรียน {0}{1} · เป้า {2} ขึ้นไป", [pct0(a.rate), a.prevRate !== null ? T(" (ช่วงก่อน {0})", [pct0(a.prevRate)]) : "", pct0(ATT_OK)])]
  const causes: string[] = [], actions: string[] = []
  if (a.worstBranch && a.worstBranch.rate < ATT_OK) causes.push(T("สาขา{0} ต่ำสุด {1}", [a.worstBranch.label, pct0(a.worstBranch.rate)]))
  if (a.worstDay && a.worstDay.rate < ATT_OK) causes.push(T("วัน{0} ลามากสุด (มา {1})", [a.worstDay.label, pct0(a.worstDay.rate)]))
  if (a.frequentLeavers) causes.push(T("นักเรียนลาบ่อย (≥ 2 ครั้ง) {0} คน — เสี่ยงหลุด", [a.frequentLeavers]))
  if (a.frequentLeavers) actions.push(T("Admin โทรหาผู้ปกครองของนักเรียนที่ลาบ่อย ถามว่าเวลาเรียนยังสะดวกไหม ก่อนจะกลายเป็นนักเรียนหลุด"))
  if (a.worstDay && a.worstDay.rate < ATT_OK) actions.push(T("ดูคลาสวัน{0} — ถ้าลาบ่อยเพราะติดกิจกรรมโรงเรียน เสนอย้ายวันให้", [a.worstDay.label]))
  if (!actions.length) actions.push(T("อยู่ในเกณฑ์ดี — ติดตามต่อทุกเดือน"))
  return { area: "attendance", tone, title: T("อัตราเข้าเรียน {0}", [pct0(a.rate)]), facts, causes, actions }
}

function teaching(i: InsightInput): Insight {
  const t = i.teaching
  const tone: InsightTone = t.pendingWork > 10 || t.lowFill > 5 ? "watch" : "good"
  const facts = [T("งานค้างของครู (เช็คชื่อ + สรุปการเรียน) {0} รายการ · คลาสที่มีนักเรียน ≤ 1 คน {1} คลาส · เกินขนาด {2} คลาส", [t.pendingWork, t.lowFill, t.overFill])]
  if (t.busiestTeacher) facts.push(T("ครูที่สอนมากสุด: {0} {1} ชม.", [t.busiestTeacher.label, t.busiestTeacher.hours]))
  const causes: string[] = [], actions: string[] = []
  if (t.lowFill) causes.push(T("คลาสคนน้อย {0} คลาส ใช้ครูและห้องเท่าคลาสเต็ม — ต้นทุนต่อหัวสูง", [t.lowFill]))
  if (t.pendingWork) causes.push(T("งานค้างทำให้ผู้ปกครองไม่ได้สรุปการเรียนตรงเวลา"))
  if (t.lowFill) actions.push(T("รวมคลาสคนน้อยที่ระดับ/วิชาเดียวกัน หรือเปิดรับนักเรียนเพิ่มในคลาสนั้นก่อนเปิดคลาสใหม่"))
  if (t.pendingWork) actions.push(T("ตั้งเตือนครูทุกเย็นให้ปิดงานเช็คชื่อ + สรุปการเรียนภายในวัน"))
  if (!actions.length) actions.push(T("อยู่ในเกณฑ์ดี"))
  return { area: "teaching", tone, title: T("งานค้างครู {0} · คลาสคนน้อย {1}", [t.pendingWork, t.lowFill]), facts, causes, actions }
}

function satisfaction(i: InsightInput): Insight | null {
  const s = i.survey
  if (!s || s.nps === null) return null
  const tone: InsightTone = s.nps < 0 ? "bad" : s.nps < NPS_OK || (s.npsPrev !== null && s.nps < s.npsPrev) ? "watch" : "good"
  const facts = [T("NPS ปี {0} {1}{2}{3}", [yearOf(s.year), s.nps > 0 ? "+" : "", s.nps, s.npsPrev !== null ? T(" (ปีก่อน {0})", [`${s.npsPrev > 0 ? "+" : ""}${s.npsPrev}`]) : ""])]
  if (s.notContinuing) facts.push(T("ผู้ปกครองตอบว่าปีหน้าไม่เรียนต่อ {0} ครอบครัว", [s.notContinuing]))
  const causes: string[] = [], actions: string[] = []
  if (s.weakest) causes.push(T("หัวข้อคะแนนต่ำสุด: {0} {1}/5", [s.weakest.label, s.weakest.score.toFixed(1)]))
  const w = s.wants.slice(0, 3)
  if (w.length) causes.push(T("ผู้ปกครองขอเพิ่ม: {0}", [w.map((x) => `${x.label} ${x.count}`).join(" · ")]))
  if (s.toCall) actions.push(T("ยังมีผู้ปกครองไม่พอใจที่ยังไม่ได้โทร {0} ครอบครัว — โทรภายใน 3 วัน (รายชื่ออยู่หน้า CRM)", [s.toCall]))
  if (s.weakest) actions.push(T("ปรับเรื่อง \"{0}\" ก่อน เพราะคะแนนต่ำสุด", [s.weakest.label]))
  if (w[0]) actions.push(T("พิจารณาเปิด \"{0}\" ที่ผู้ปกครองขอมากสุด", [w[0].label]))
  return { area: "satisfaction", tone, title: `NPS ${s.nps > 0 ? "+" : ""}${s.nps}`, facts, causes, actions }
}

const ORDER: InsightTone[] = ["bad", "watch", "good"]

/** All topics, problems first; `headline` = the first action of each problem topic (what to do this week). */
export function buildInsights(i: InsightInput, tr?: Tr) {
  T = tr ?? plain
  const list = [revenue(i), students(i), sales(i), attendance(i), teaching(i), satisfaction(i)].filter((x): x is Insight => !!x)
  const sorted = [...list].sort((a, b) => ORDER.indexOf(a.tone) - ORDER.indexOf(b.tone))
  return {
    insights: sorted,
    counts: { bad: list.filter((x) => x.tone === "bad").length, watch: list.filter((x) => x.tone === "watch").length, good: list.filter((x) => x.tone === "good").length },
    headline: sorted.filter((x) => x.tone !== "good" && x.actions.length).slice(0, 3).map((x) => ({ area: x.area, action: x.actions[0] })),
  }
}
