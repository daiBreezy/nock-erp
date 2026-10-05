/**
 * Reports › สรุป (owner 2026-10-05): a written summary per topic — what the numbers say, what caused it, and what
 * to do next. Pure rules over numbers the Reports hook already has (no AI): every sentence points at a figure the
 * other tabs show, so a manager can check it. Thresholds are deliberately simple and listed at the top.
 */

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
  if (a >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`
  if (a >= 10_000) return `฿${Math.round(n / 1000).toLocaleString("en-US")}K`
  return `฿${Math.round(n).toLocaleString("en-US")}`
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
  return { days: days.map((d) => DAY[d]), branches }
}

/** Students needed to close a monthly revenue gap */
export const studentsToClose = (gapPerMonth: number, perStudentMonth: number | null) => (perStudentMonth && gapPerMonth > 0 ? Math.ceil(gapPerMonth / perStudentMonth) : null)

const top = (xs: Counted[]) => (xs.length ? [...xs].sort((a, b) => b.count - a.count)[0] : undefined)
const UNREACHABLE = /ติดต่อไม่ได้|ไม่รับสาย|ไม่ตอบ/

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
    ? `รายได้${ch < 0 ? "ลดลง" : "เพิ่มขึ้น"} ${pct(ch)} — จาก ${baht(i.revenue.prev)} ${ch < 0 ? "เหลือ" : "เป็น"} ${baht(i.revenue.now)} (${i.periodLabel} ${i.vsLabel})`
    : trend !== null
      ? `รายได้${i.periodLabel} ${baht(i.revenue.now)} · ${recent.length} เดือนล่าสุด${trend < 0 ? "ลดลง" : "เพิ่มขึ้น"} ${pct(trend)} เทียบเดือนเดียวกันปีที่แล้ว`
      : `รายได้${i.periodLabel} ${baht(i.revenue.now)} — ยังเทียบปีที่แล้วไม่ได้ (ข้อมูลในระบบเริ่มทีหลัง)`
  if (ch === null && trend !== null) facts.push(`ทั้งช่วง${i.periodLabel}ยังเทียบไม่ได้ เพราะข้อมูลปีที่แล้วเริ่มกลางปี — จึงเทียบเฉพาะเดือนที่มีข้อมูลทั้งสองปี (${recent.map((m) => m.label).join(", ")})`)
  const worst = [...yoy].sort((a, b) => a.ch - b.ch)[0]
  const best = [...yoy].sort((a, b) => b.ch - a.ch)[0]
  if (worst && worst.ch < 0) facts.push(`เดือนที่ลดลงมากสุด: ${worst.label} ${baht(worst.now!)} จากปีที่แล้ว ${baht(worst.last!)} (−${pct(worst.ch)})`)
  if (best && best.ch > 0) facts.push(`เดือนที่โตมากสุด: ${best.label} ${baht(best.now!)} จากปีที่แล้ว ${baht(best.last!)} (+${pct(best.ch)})`)
  if (!yoy.length) facts.push("ยังไม่มีเดือนไหนที่มีข้อมูลทั้งปีนี้และปีที่แล้วให้เทียบกัน")
  if (i.flow.renewal !== null) facts.push(`อัตราต่อคอร์ส ${pct0(i.flow.renewal)}${i.comparable && i.flow.renewalPrev !== null ? ` (ช่วงก่อน ${pct0(i.flow.renewalPrev)})` : ""}`)

  const falling = tone === "bad" || (worst && worst.ch <= DROP)
  if (falling) {
    // what drove the worst month: fewer new students, more leaving
    if (worst) {
      const n = pctChange(worst.newNow, worst.newLast)
      if (n !== null && n < 0) causes.push(`${worst.label} มีนักเรียนใหม่ ${worst.newNow} คน น้อยกว่าปีที่แล้ว (${worst.newLast} คน) ถึง ${pct(n)} — รายได้ที่หายส่วนใหญ่มาจากช่วงนี้`)
      if (worst.lostNow > worst.lostLast) causes.push(`${worst.label} นักเรียนหลุด ${worst.lostNow} คน มากกว่าปีที่แล้ว (${worst.lostLast} คน)`)
    }
    const lc = i.comparable ? pctChange(i.flow.lostNow, i.flow.lostPrev) : null
    if (lc !== null && lc > RISE) causes.push(`Churn เพิ่มขึ้น ${pct(lc)} — หลุด ${i.flow.lostNow} คน (ช่วงก่อน ${i.flow.lostPrev})`)
    if (i.comparable && i.flow.renewal !== null && i.flow.renewalPrev !== null && i.flow.renewal < i.flow.renewalPrev - 0.03) causes.push(`ต่อคอร์สน้อยลงจาก ${pct0(i.flow.renewalPrev)} เหลือ ${pct0(i.flow.renewal)}`)
    const er = top(i.exitReasons)
    if (er) causes.push(`เหตุผลที่ออกมากสุด: "${er.label}" (${er.count} คน)`)
    const wt = top(i.wantedTimes)
    if (wt) causes.push(`ผู้ปกครองอยากได้เวลา "${wt.label}" แต่เรายังไม่ได้เปิด (${wt.count} ราย จาก Lead ที่หลุด)`)
    if (!causes.length) causes.push("ยังไม่เห็นสาเหตุชัด — จำนวนนักเรียนใหม่และที่หลุดใกล้เคียงช่วงก่อน ลองดูราคาต่อคอร์ส / แพ็กเกจที่ขาย")

    const gap = i.comparable && i.revenue.prev > i.revenue.now ? (i.revenue.prev - i.revenue.now) / Math.max(1, i.periodMonths) : worst && worst.last! > worst.now! ? worst.last! - worst.now! : 0
    const need = studentsToClose(gap, i.perStudentMonth)
    if (wt) {
      const p = pilotPlan(i.branchLoad, wt.label)
      actions.push(`ทดลองเปิดคาบ "${wt.label}" ${p.days.length ? `วัน${p.days.join(" และ ")}` : ""} ที่สาขา${p.branches.join(" และ ")} ก่อน (สาขาที่ว่างที่สุดในวันนั้น) แล้วติดตามผล 1–2 เดือน`)
      actions.push("ถ้าได้ผลดี ค่อยขยายไปทุกสาขา เริ่มจากสาขาที่ไม่ยุ่งในวันนั้นก่อน · ส่ง LINE ชวน Lead ที่เคยขอเวลานี้กลับมาทันทีที่เปิด")
    }
    if (need) actions.push(`ต้องการนักเรียนเพิ่มประมาณ ${need} คน เพื่อปิดรายได้ที่หายไป (~${baht(gap)}/เดือน · เฉลี่ย ${baht(i.perStudentMonth!)}/คน/เดือน)`)
    if (i.flow.renewal !== null && i.flow.renewal < 0.8) actions.push("โทรหาผู้ปกครองที่แพ็กจะหมดใน 30 วัน ก่อนแพ็กหมด — เสนอแพ็กต่อพร้อมสรุปพัฒนาการของลูก")
  } else if (tone === "good") {
    if (i.comparable) causes.push(i.flow.newNow > i.flow.newPrev ? `นักเรียนใหม่มากขึ้น ${i.flow.newNow} คน (ช่วงก่อน ${i.flow.newPrev})` : "นักเรียนเดิมต่อคอร์สต่อเนื่อง")
    if (best && best.ch > 0 && best.newNow > best.newLast) causes.push(`${best.label} ได้นักเรียนใหม่ ${best.newNow} คน (ปีที่แล้ว ${best.newLast})`)
    actions.push("รักษาช่องทางที่ได้นักเรียนใหม่ไว้ · ดูแท็บ CRM ว่าแหล่งไหนปิดการขายได้ดีที่สุดแล้วเพิ่มงบตรงนั้น")
    if (i.flow.renewal !== null && i.flow.renewal < 0.85) actions.push(`อัตราต่อคอร์ส ${pct0(i.flow.renewal)} ยังเพิ่มได้ — โทรหาผู้ปกครองที่แพ็กจะหมดใน 30 วัน ก่อนแพ็กหมด`)
  } else {
    actions.push(trend === null ? "เก็บข้อมูลต่ออีกระยะ — เมื่อมีข้อมูลปีที่แล้วครบ สรุปจะเทียบให้เอง" : "ยอดทรงตัว — โฟกัสลดนักเรียนหลุด (ต่อคอร์ส) จะได้ผลเร็วกว่าหาใหม่")
  }
  return { area: "revenue", tone, title, facts, causes, actions }
}

function students(i: InsightInput): Insight {
  const f = i.flow
  const net = f.newNow + f.returning - f.lostNow
  const lc = i.comparable ? pctChange(f.lostNow, f.lostPrev) : null
  const tone: InsightTone = net < 0 || (lc !== null && lc > 0.2) ? "bad" : net > 0 ? "good" : "watch"
  const facts = [`เข้าใหม่ ${f.newNow} · กลับมาเรียน ${f.returning} · หลุด ${f.lostNow} → สุทธิ ${net > 0 ? "+" : ""}${net} คน · Active ตอนนี้ ${f.active} คน`]
  if (lc !== null) facts.push(`หลุด${lc >= 0 ? "เพิ่มขึ้น" : "ลดลง"} ${pct(lc)} จากช่วงก่อน (${f.lostPrev} คน)`)
  const causes: string[] = [], actions: string[] = []
  const er = [...i.exitReasons].sort((a, b) => b.count - a.count).slice(0, 3)
  if (er.length) causes.push(`เหตุผลที่ออก (จากฟอร์มแจ้งออก): ${er.map((r) => `${r.label} ${r.count}`).join(" · ")}`)
  if (i.comparable && f.newNow < f.newPrev) causes.push(`นักเรียนใหม่น้อยลง ${f.newNow} คน (ช่วงก่อน ${f.newPrev})`)
  const r0 = er[0]?.label ?? ""
  if (/เวลา|ตาราง/.test(r0)) actions.push("เหตุผลอันดับ 1 คือเวลาไม่ลงตัว — เปิดเวลาที่ผู้ปกครองขอ (ดูหัวข้อขาย) และให้ Admin เสนอย้ายคลาสก่อนผู้ปกครองตัดสินใจออก")
  else if (/ราคา|ค่าใช้จ่าย/.test(r0)) actions.push("เหตุผลอันดับ 1 คือราคา — เสนอแพ็กรายชั่วโมงเล็กลง / ผ่อนจ่าย ให้ครอบครัวที่กำลังจะหมดแพ็ก")
  else if (/ครู/.test(r0)) actions.push("เหตุผลอันดับ 1 เกี่ยวกับครู — ดูคะแนนครูในแท็บความพึงพอใจ แล้วคุยกับครูที่คะแนนต่ำ")
  if (tone === "bad") actions.push("ตั้งเป้าลดนักเรียนหลุดเดือนละ 20% — Admin โทรหานักเรียนที่ลาบ่อย / แพ็กใกล้หมด ทุกสัปดาห์")
  if (!actions.length) actions.push(net > 0 ? "สุทธิเป็นบวก — ทำต่อ และติดตามเหตุผลที่ออกทุกเดือน" : "ติดตามเหตุผลที่ออกทุกเดือน")
  return { area: "students", tone, title: `นักเรียนสุทธิ ${net > 0 ? "+" : ""}${net} คน · หลุด ${f.lostNow} คน`, facts, causes, actions }
}

function sales(i: InsightInput): Insight {
  const s = i.sales
  const tone: InsightTone = s.conversion === null ? "watch" : s.conversion < 0.25 ? "bad" : s.conversion >= 0.4 ? "good" : "watch"
  const facts = [`Lead ${s.leads} ราย · สมัคร ${s.enrolled} · Conversion ${pct0(s.conversion)} · ยังเปิดอยู่ ${s.open} ราย`]
  if (s.bestSource) facts.push(`แหล่งที่ปิดได้ดีสุด: ${s.bestSource.label} (${pct0(s.bestSource.conversion)})`)
  if (s.worstSource) facts.push(`แหล่งที่ปิดได้น้อยสุด: ${s.worstSource.label} (${pct0(s.worstSource.conversion)} จาก ${s.worstSource.leads} ราย)`)
  const causes: string[] = [], actions: string[] = []
  const st = top(i.leadLostStages)
  if (st) causes.push(`หลุดมากสุดที่ขั้น "${st.label}" (${st.count} ราย)`)
  const rs = [...i.leadLostReasons].sort((a, b) => b.count - a.count).slice(0, 3)
  if (rs.length) causes.push(`เหตุผลหลัก: ${rs.map((r) => `${r.label} ${r.count}`).join(" · ")}`)
  const wt = top(i.wantedTimes)
  if (wt) causes.push(`เวลาที่ลูกค้าต้องการแต่เราไม่มี: ${wt.label} (${wt.count} ราย)`)
  const cp = top(i.competitors.filter((c) => c.label !== "ไม่ทราบ"))
  if (cp) causes.push(`ไปเรียนที่อื่นแทน: ${cp.label} (${cp.count} ราย)`)
  if (rs[0] && UNREACHABLE.test(rs[0].label)) actions.push("เหตุผลอันดับ 1 คือติดต่อไม่ได้ — โทรภายใน 1 ชั่วโมงหลัง Lead เข้า ถ้าไม่รับให้ส่ง LINE ตามทันที และลองอีกครั้งตอนเย็น")
  if (st && /Test|Trial|นัด/.test(st.label)) actions.push("หลุดที่ขั้นนัด Test / Trial มาก — ส่งเตือนนัดผ่าน LINE ก่อน 1 วัน และโทรยืนยันเช้าวันนัด")
  if (s.worstSource && s.bestSource) actions.push(`ย้ายงบ/เวลาจาก ${s.worstSource.label} ไป ${s.bestSource.label} ที่ปิดได้ดีกว่า`)
  if (wt) actions.push(`เวลา "${wt.label}" ถูกขอบ่อย — ดูแผนทดลองเปิดคาบในหัวข้อรายได้`)
  if (!actions.length) actions.push("ติดตาม Lead ที่ยังเปิดอยู่ให้ครบทุกรายในสัปดาห์นี้")
  return { area: "sales", tone, title: `Conversion ${pct0(s.conversion)} — Lead ${s.leads} ราย สมัคร ${s.enrolled}`, facts, causes, actions }
}

function attendance(i: InsightInput): Insight | null {
  const a = i.attendance
  if (a.rate === null) return null
  const tone: InsightTone = a.rate < ATT_OK ? "bad" : a.prevRate !== null && a.rate < a.prevRate - 0.03 ? "watch" : "good"
  const facts = [`อัตราเข้าเรียน ${pct0(a.rate)}${a.prevRate !== null ? ` (ช่วงก่อน ${pct0(a.prevRate)})` : ""} · เป้า ${pct0(ATT_OK)} ขึ้นไป`]
  const causes: string[] = [], actions: string[] = []
  if (a.worstBranch && a.worstBranch.rate < ATT_OK) causes.push(`สาขา${a.worstBranch.label} ต่ำสุด ${pct0(a.worstBranch.rate)}`)
  if (a.worstDay && a.worstDay.rate < ATT_OK) causes.push(`วัน${a.worstDay.label} ลามากสุด (มา ${pct0(a.worstDay.rate)})`)
  if (a.frequentLeavers) causes.push(`นักเรียนลาบ่อย (≥ 2 ครั้ง) ${a.frequentLeavers} คน — เสี่ยงหลุด`)
  if (a.frequentLeavers) actions.push("Admin โทรหาผู้ปกครองของนักเรียนที่ลาบ่อย ถามว่าเวลาเรียนยังสะดวกไหม ก่อนจะกลายเป็นนักเรียนหลุด")
  if (a.worstDay && a.worstDay.rate < ATT_OK) actions.push(`ดูคลาสวัน${a.worstDay.label} — ถ้าลาบ่อยเพราะติดกิจกรรมโรงเรียน เสนอย้ายวันให้`)
  if (!actions.length) actions.push("อยู่ในเกณฑ์ดี — ติดตามต่อทุกเดือน")
  return { area: "attendance", tone, title: `อัตราเข้าเรียน ${pct0(a.rate)}`, facts, causes, actions }
}

function teaching(i: InsightInput): Insight {
  const t = i.teaching
  const tone: InsightTone = t.pendingWork > 10 || t.lowFill > 5 ? "watch" : "good"
  const facts = [`งานค้างของครู (เช็คชื่อ + สรุปการเรียน) ${t.pendingWork} รายการ · คลาสที่มีนักเรียน ≤ 1 คน ${t.lowFill} คลาส · เกินขนาด ${t.overFill} คลาส`]
  if (t.busiestTeacher) facts.push(`ครูที่สอนมากสุด: ${t.busiestTeacher.label} ${t.busiestTeacher.hours} ชม.`)
  const causes: string[] = [], actions: string[] = []
  if (t.lowFill) causes.push(`คลาสคนน้อย ${t.lowFill} คลาส ใช้ครูและห้องเท่าคลาสเต็ม — ต้นทุนต่อหัวสูง`)
  if (t.pendingWork) causes.push("งานค้างทำให้ผู้ปกครองไม่ได้สรุปการเรียนตรงเวลา")
  if (t.lowFill) actions.push("รวมคลาสคนน้อยที่ระดับ/วิชาเดียวกัน หรือเปิดรับนักเรียนเพิ่มในคลาสนั้นก่อนเปิดคลาสใหม่")
  if (t.pendingWork) actions.push("ตั้งเตือนครูทุกเย็นให้ปิดงานเช็คชื่อ + สรุปการเรียนภายในวัน")
  if (!actions.length) actions.push("อยู่ในเกณฑ์ดี")
  return { area: "teaching", tone, title: `งานค้างครู ${t.pendingWork} · คลาสคนน้อย ${t.lowFill}`, facts, causes, actions }
}

function satisfaction(i: InsightInput): Insight | null {
  const s = i.survey
  if (!s || s.nps === null) return null
  const tone: InsightTone = s.nps < 0 ? "bad" : s.nps < NPS_OK || (s.npsPrev !== null && s.nps < s.npsPrev) ? "watch" : "good"
  const facts = [`NPS ปี ${s.year + 543} ${s.nps > 0 ? "+" : ""}${s.nps}${s.npsPrev !== null ? ` (ปีก่อน ${s.npsPrev > 0 ? "+" : ""}${s.npsPrev})` : ""}`]
  if (s.notContinuing) facts.push(`ผู้ปกครองตอบว่าปีหน้าไม่เรียนต่อ ${s.notContinuing} ครอบครัว`)
  const causes: string[] = [], actions: string[] = []
  if (s.weakest) causes.push(`หัวข้อคะแนนต่ำสุด: ${s.weakest.label} ${s.weakest.score.toFixed(1)}/5`)
  const w = s.wants.slice(0, 3)
  if (w.length) causes.push(`ผู้ปกครองขอเพิ่ม: ${w.map((x) => `${x.label} ${x.count}`).join(" · ")}`)
  if (s.toCall) actions.push(`ยังมีผู้ปกครองไม่พอใจที่ยังไม่ได้โทร ${s.toCall} ครอบครัว — โทรภายใน 3 วัน (รายชื่ออยู่หน้า CRM)`)
  if (s.weakest) actions.push(`ปรับเรื่อง "${s.weakest.label}" ก่อน เพราะคะแนนต่ำสุด`)
  if (w[0]) actions.push(`พิจารณาเปิด "${w[0].label}" ที่ผู้ปกครองขอมากสุด`)
  return { area: "satisfaction", tone, title: `NPS ${s.nps > 0 ? "+" : ""}${s.nps}`, facts, causes, actions }
}

const ORDER: InsightTone[] = ["bad", "watch", "good"]

/** All topics, problems first; `headline` = the first action of each problem topic (what to do this week). */
export function buildInsights(i: InsightInput) {
  const list = [revenue(i), students(i), sales(i), attendance(i), teaching(i), satisfaction(i)].filter((x): x is Insight => !!x)
  const sorted = [...list].sort((a, b) => ORDER.indexOf(a.tone) - ORDER.indexOf(b.tone))
  return {
    insights: sorted,
    counts: { bad: list.filter((x) => x.tone === "bad").length, watch: list.filter((x) => x.tone === "watch").length, good: list.filter((x) => x.tone === "good").length },
    headline: sorted.filter((x) => x.tone !== "good" && x.actions.length).slice(0, 3).map((x) => ({ area: x.area, action: x.actions[0] })),
  }
}
