import { R, fbTpl, sentSet, students, CUR_WEEK, WEEKS, SUBJ, courseObj, isNoClass, topicOf, draftFeedback, parentSummary, type Student } from "./data"
export { isNoClass } from "./data"

export type SubStatus = "prepared" | "pending" | "sended" | "none"

export const studentsIn = (cid: string) => students.filter((s) => !s.deleted && s.courses.includes(cid))
export const fbPrepared = (cid: string, sub: string, wk: number) => { const t = fbTpl[cid + "|" + sub + "|" + wk]; return !!(t && t.prepared) }
export const fbText = (cid: string, sub: string, wk: number) => { const t = fbTpl[cid + "|" + sub + "|" + wk]; return t && t.text ? t.text : draftFeedback(sub, wk) }
export const isSent = (s: Student, cid: string, wk: number) => sentSet.has(s.idx + "|" + cid + "|" + wk)
export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)
export const actualSubs = (cid: string, wk: number) => courseObj(cid).subs.filter((sub) => !isNoClass(cid, sub, wk))

export function subjStatus(s: Student, cid: string, sub: string, wk: number): SubStatus {
  if (isNoClass(cid, sub, wk)) return "none"
  if (isSent(s, cid, wk)) return "sended"
  const r = R[s.idx][sub]?.[wk]
  if (fbPrepared(cid, sub, wk) && r && r.collected) return "prepared"
  return "pending"
}

export function overallStatus(s: Student, cid: string, wk: number): SubStatus {
  if (isSent(s, cid, wk)) return "sended"
  const subs = courseObj(cid).subs
  const ready = subs.every((sub) => {
    if (isNoClass(cid, sub, wk)) return true
    const r = R[s.idx][sub]?.[wk]
    return fbPrepared(cid, sub, wk) && r && r.collected
  })
  return ready ? "prepared" : "pending"
}

// ── Live Quiz per-question detail (mock — จำลองข้อมูลที่มาจาก Web Admin, read-only) ──
const QUIZ_OPTS = ["ก.", "ข.", "ค.", "ง."]
const hashStr = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h }
const rngFrom = (seed: number) => { let a = seed >>> 0; return () => { a += 0x6d2b79f5; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

export interface QuizRow { q: number; correct: string; pct: number; answer: string; ok: "correct" | "wrong" | "blank" }
export function quizDetail(idx: number, sub: string, wk: number): { rows: QuizRow[]; correctN: number; total: number } {
  const r = R[idx][sub]?.[wk]
  const total = r?.lqT ?? 0, done = r?.lqDone ?? 0, correct = r?.lqCorrect ?? 0
  const rand = rngFrom(idx * 1009 + hashStr(sub) * 7 + wk * 31)
  const statuses: QuizRow["ok"][] = []
  for (let i = 0; i < correct; i++) statuses.push("correct")
  for (let i = 0; i < done - correct; i++) statuses.push("wrong")
  for (let i = 0; i < total - done; i++) statuses.push("blank")
  for (let i = statuses.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1));[statuses[i], statuses[j]] = [statuses[j], statuses[i]] }
  const rows: QuizRow[] = statuses.map((ok, i) => {
    const correctAns = QUIZ_OPTS[Math.floor(rand() * 4)]
    const pct = Math.round((45 + rand() * 35) * 100) / 100
    let answer = "-"
    if (ok === "correct") answer = correctAns
    else if (ok === "wrong") { const w = QUIZ_OPTS.filter((o) => o !== correctAns); answer = w[Math.floor(rand() * w.length)] }
    return { q: i + 1, correct: correctAns, pct, answer, ok }
  })
  return { rows, correctN: correct, total }
}

// ── งานค้างแยกตามสัปดาห์ (กัน backlog ข้ามสัปดาห์หล่นหาย) ──
export interface WeekBacklog { wk: number; subjects: { sub: string; app: number; col: number; fb: boolean }[]; unsent: number }
export function courseBacklog(cid: string): WeekBacklog[] {
  const roster = studentsIn(cid)
  const res: WeekBacklog[] = []
  for (const wk of WEEKS) {
    if (wk > CUR_WEEK) continue
    const subjects = actualSubs(cid, wk).map((sub) => {
      let app = 0, col = 0
      roster.forEach((s) => { const r = R[s.idx][sub]?.[wk]; if (!r || r.att === "noclass") return; app++; if (r.collected) col++ })
      return { sub, app, col, fb: fbPrepared(cid, sub, wk) }
    })
    const unsent = roster.filter((s) => !isSent(s, cid, wk)).length
    const hasPending = subjects.some((s) => s.col < s.app || !s.fb) || unsent > 0
    if (hasPending) res.push({ wk, subjects, unsent })
  }
  return res
}

const upToNow = () => WEEKS.filter((w) => w <= CUR_WEEK)

// ผลรายคน รายวิชา ต่อสัปดาห์ (Quiz% = ถูก/เต็ม · HW% = คะแนน/เต็ม) — null เมื่อไม่มีเรียน/ไม่มีควิซ/ไม่ส่ง
export function studentSubWeekly(idx: number, cid: string, sub: string) {
  const quiz: (number | null)[] = [], hw: (number | null)[] = []
  for (const wk of upToNow()) {
    const r = R[idx][sub]?.[wk]
    if (!r || r.att === "noclass" || isNoClass(cid, sub, wk)) { quiz.push(null); hw.push(null); continue }
    const attended = r.att === "present" || r.att === "makeup"
    quiz.push(attended && r.lqDone > 0 ? pct(r.lqCorrect, r.lqT) : null)
    hw.push(r.collected && r.hwScore != null ? pct(r.hwScore, r.hwT) : null)
  }
  return { quiz, hw }
}

// ภาพรวมทุกวิชาของนักเรียน ต่อสัปดาห์ = เฉลี่ยวิชาที่มีข้อมูลในสัปดาห์นั้น
export function studentOverallWeekly(idx: number, cid: string) {
  const weeks = upToNow()
  const per = courseObj(cid).subs.map((sub) => studentSubWeekly(idx, cid, sub))
  const avgAt = (arr: "quiz" | "hw", wi: number) => {
    const vals = per.map((p) => p[arr][wi]).filter((v): v is number => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }
  return { labels: weeks.map((w) => "W" + w), quiz: weeks.map((_, wi) => avgAt("quiz", wi)), hw: weeks.map((_, wi) => avgAt("hw", wi)) }
}

// ร่างสรุปส่งผู้ปกครองอัตโนมัติ (รายคน) — ครูแก้ต่อได้
export function draftParentSummary(idx: number, cid: string, wk: number): string {
  const s = students[idx]
  const ow = studentOverallWeekly(idx, cid)
  const nowQ = ow.quiz[wk - 1] ?? null, nowH = ow.hw[wk - 1] ?? null, prevQ = wk >= 2 ? ow.quiz[wk - 2] ?? null : null
  const trend = nowQ != null && prevQ != null
    ? (nowQ - prevQ > 5 ? "พัฒนาการดีขึ้นจากสัปดาห์ก่อน" : nowQ - prevQ < -5 ? "สัปดาห์นี้ทำได้น้อยลงเล็กน้อย ควรทบทวนเพิ่ม" : "ผลการเรียนคงที่สม่ำเสมอ")
    : "เริ่มเก็บข้อมูลพัฒนาการ"
  let best: { sub: string; p: number } | null = null
  actualSubs(cid, wk).forEach((sub) => { const p = studentSubWeekly(idx, cid, sub).quiz[wk - 1]; if (p != null && (!best || p > best.p)) best = { sub, p } })
  const parts: string[] = []
  const head = `สัปดาห์นี้น้อง${s.nick}` + (nowQ != null ? ` ทำ Live Quiz เฉลี่ย ${nowQ}%` : "") + (nowH != null ? ` และการบ้าน ${nowH}%` : "") + ` (${trend})`
  parts.push(head)
  if (best) parts.push(`ทำได้ดีเป็นพิเศษในวิชา${SUBJ[(best as { sub: string }).sub].n} เรื่อง${topicOf((best as { sub: string }).sub, wk)}`)
  parts.push("แนะนำให้ฝึกทบทวนโจทย์เพิ่มเติมก่อนเข้าสัปดาห์ถัดไปครับ")
  return parts.join(" ")
}
export const parentSummaryText = (idx: number, cid: string, wk: number) => parentSummary[idx + "|" + cid + "|" + wk] ?? draftParentSummary(idx, cid, wk)

// ── Report (retrospective) aggregates ──────────────────────────────
const avgNN = (vals: (number | null)[]) => { const v = vals.filter((x): x is number => x != null); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null }

// ค่าเฉลี่ยทั้งคอร์ส ต่อสัปดาห์ (att/quiz/hw) — เฉลี่ยข้ามวิชา
export function courseWeekly(cid: string) {
  const subs = courseObj(cid).subs
  const per = subs.map((sub) => subjWeekly(cid, sub))
  return WEEKS.filter((w) => w <= CUR_WEEK).map((w, wi) => ({
    week: "W" + w,
    att: avgNN(per.map((p) => p.att[wi])),
    quiz: avgNN(per.map((p) => p.quiz[wi])),
    hw: avgNN(per.map((p) => p.hw[wi])),
  }))
}

// รายงานที่ส่งผู้ปกครองแล้ว ต่อสัปดาห์
export function reportsSentByWeek(cid: string) {
  const roster = studentsIn(cid)
  return WEEKS.filter((w) => w <= CUR_WEEK).map((w) => ({ week: "W" + w, sent: roster.filter((s) => isSent(s, cid, w)).length, total: roster.length }))
}

// ค่าเฉลี่ยรวมทั้งคอร์ส (ช่วงที่ผ่านมา)
export function courseTotals(cid: string) {
  const rows = courseWeekly(cid)
  const sent = reportsSentByWeek(cid)
  const totSent = sent.reduce((a, r) => a + r.sent, 0), totPoss = sent.reduce((a, r) => a + r.total, 0)
  return { att: avgNN(rows.map((r) => r.att)), quiz: avgNN(rows.map((r) => r.quiz)), hw: avgNN(rows.map((r) => r.hw)), sentPct: pct(totSent, totPoss || 0) }
}

// สถานะนักเรียน + inactivity buckets
export function courseStudents(cid: string) {
  const roster = studentsIn(cid)
  const by = (st: string) => roster.filter((s) => s.status === st).length
  const inact = (n: number) => roster.filter((s) => (n >= 4 ? CUR_WEEK - s.lastActiveWk >= 4 : CUR_WEEK - s.lastActiveWk === n)).length
  return { total: roster.length, active: by("active"), inactive: by("inactive"), churn: by("churn"), inact2: inact(2), inact3: inact(3), inact4: inact(4) }
}

// Quiz เฉลี่ยรายวิชา (ทั้งช่วง) — เทียบวิชา
export function subjectQuizAvg(cid: string) {
  return courseObj(cid).subs.map((sub) => { const w = subjWeekly(cid, sub); return { sub, short: SUBJ[sub].short, quiz: avgNN(w.quiz), hw: avgNN(w.hw), att: avgNN(w.att) } })
}

// ── การมีส่วนร่วม Quiz (participation) = ทำครบ / ทำไม่ครบ / ไม่ทำ ──
export interface Participation { done: number; partial: number; none: number; total: number }
// รายวิชา ต่อสัปดาห์ (นับเฉพาะนักเรียนที่มีคลาสสัปดาห์นั้น)
export function subjWeeklyPart(cid: string, sub: string): Participation[] {
  const roster = studentsIn(cid)
  return WEEKS.filter((w) => w <= CUR_WEEK).map((wk) => {
    if (isNoClass(cid, sub, wk)) return { done: 0, partial: 0, none: 0, total: 0 }
    let done = 0, partial = 0, none = 0, total = 0
    roster.forEach((s) => {
      const r = R[s.idx][sub]?.[wk]
      if (!r || r.att === "noclass") return
      total++
      if (r.lqT > 0 && r.lqDone >= r.lqT) done++
      else if (r.lqDone > 0) partial++
      else none++
    })
    return { done, partial, none, total }
  })
}
// รวมทั้งช่วง ต่อวิชา — ดูว่าวิชาไหน engagement สูง/ต่ำ
export function subjectParticipation(cid: string) {
  return courseObj(cid).subs.map((sub) => {
    const agg = subjWeeklyPart(cid, sub).reduce((a, w) => ({ done: a.done + w.done, partial: a.partial + w.partial, none: a.none + w.none, total: a.total + w.total }), { done: 0, partial: 0, none: 0, total: 0 })
    return { sub, short: SUBJ[sub].short, ...agg }
  })
}
// รวมทุกวิชา ต่อสัปดาห์ — สำหรับ trend/ตาราง
export function courseWeeklyPart(cid: string) {
  const subs = courseObj(cid).subs
  return WEEKS.filter((w) => w <= CUR_WEEK).map((wk, wi) => {
    let done = 0, partial = 0, none = 0, total = 0
    subs.forEach((sub) => { const p = subjWeeklyPart(cid, sub)[wi]; done += p.done; partial += p.partial; none += p.none; total += p.total })
    return { week: "W" + wk, done, partial, none, total, donePct: pct(done, total), partPct: pct(done + partial, total) }
  })
}

// Learning velocity — นับคนดีขึ้น/คงที่/ถดถอย (Quiz รวม สัปดาห์ล่าสุด vs ก่อนหน้า)
export function courseVelocity(cid: string) {
  const roster = studentsIn(cid)
  let up = 0, down = 0, flat = 0
  roster.forEach((s) => {
    const ow = studentOverallWeekly(s.idx, cid)
    const now = ow.quiz[CUR_WEEK - 1] ?? null, prev = CUR_WEEK >= 2 ? ow.quiz[CUR_WEEK - 2] ?? null : null
    if (now == null || prev == null) return
    if (now - prev > 5) up++; else if (now - prev < -5) down++; else flat++
  })
  return { up, down, flat }
}

export function subjWeekly(cid: string, sub: string) {
  const roster = studentsIn(cid)
  const att: (number | null)[] = [], quiz: (number | null)[] = [], hw: (number | null)[] = []
  for (const wk of WEEKS) {
    if (wk > CUR_WEEK || isNoClass(cid, sub, wk)) { att.push(null); quiz.push(null); hw.push(null); continue }
    let ap = 0, pr = 0, qd = 0, qc = 0, col = 0
    roster.forEach((s) => {
      const r = R[s.idx][sub]?.[wk]
      if (!r || r.att === "noclass") return
      ap++; if (r.att === "present" || r.att === "makeup") pr++; qd += r.lqDone; qc += r.lqCorrect; if (r.collected) col++
    })
    att.push(pct(pr, ap)); quiz.push(pct(qc, qd)); hw.push(pct(col, ap))
  }
  return { att, quiz, hw }
}
