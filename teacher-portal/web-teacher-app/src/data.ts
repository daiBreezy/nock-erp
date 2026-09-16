export type Status = "active" | "inactive" | "churn"

export interface Student {
  idx: number
  id: string
  name: string
  nick: string
  grade: string
  gc: string
  lineName: string
  phone: string
  register: string
  premiumExp: string
  premiumPlusExp: string
  autoRenew: boolean
  notes: string
  examResults: string
  deliveryName: string
  address: string
  status: Status
  statusDur: string
  av: string
  photo?: string
  courses: string[]
  lastActiveWk: number
  deleted?: boolean
  guardianId?: string
}

// ผู้ปกครอง = จุดผูก LINE OA (1 คน คุมลูกได้หลายคน) — userId ผูกที่นี่ นักเรียนสืบทอดสถานะ
export type LineStatus = "linked" | "invited" | "none" | "broken"
export interface Guardian {
  id: string
  name: string
  phone: string
  lineUserId: string | null
  lineStatus: LineStatus
  linkToken: string
  linkedAt?: string
}

export interface Result {
  att: "present" | "absent" | "makeup" | "noclass"
  lqDone: number
  lqCorrect: number
  lqT: number
  collected: boolean
  late: boolean
  hwScore: number | null
  hwT: number
}

export const CUR_WEEK = 5
export const WEEKS = [1, 2, 3, 4, 5, 6, 7]
export const WK_DATE: Record<number, string> = { 1: "21–23 ก.ค.", 2: "28–30 ก.ค.", 3: "4–6 ส.ค.", 4: "11–13 ส.ค.", 5: "18–20 ส.ค.", 6: "25–27 ส.ค.", 7: "1–3 ก.ย." }

export const SUBJ: Record<string, { n: string; short: string; ic: string; lq: number; hw: number }> = {
  sci: { n: "วิทยาศาสตร์", short: "วิทย์", ic: "📘", lq: 10, hw: 10 },
  mathB: { n: "คณิตศาสตร์ (พื้นฐาน)", short: "คณิต พฐ.", ic: "📐", lq: 5, hw: 10 },
  mathA: { n: "คณิตศาสตร์ (เสริม)", short: "คณิต เสริม", ic: "📊", lq: 5, hw: 8 },
  eng: { n: "ภาษาอังกฤษ", short: "อังกฤษ", ic: "📗", lq: 8, hw: 10 },
}

export const COURSES = [
  { id: "c1", n: "สอบเข้า ม.4 MWIT วมว. อจ.", subs: ["sci", "mathB", "mathA"] },
  { id: "c2", n: "สอบเข้า ม.1 รร. จุฬาภรณ์", subs: ["sci", "mathB", "eng"] },
]

export const noClassSet = new Set<string>(["c1|mathA|4", "c2|eng|3"])

// ตารางไลฟ์ประจำสัปดาห์ (mock — วัน/เวลา ต่อวิชาในคอร์ส)
export const DAY_ORDER = ["จันทร์", "อังคาร", "พุธ", "พฤหัส", "ศุกร์", "เสาร์", "อาทิตย์"]
export const SCHEDULE: Record<string, { sub: string; day: string; time: string }[]> = {
  c1: [
    { sub: "sci", day: "จันทร์", time: "17:00–18:30" },
    { sub: "mathB", day: "อังคาร", time: "17:00–18:30" },
    { sub: "mathA", day: "พุธ", time: "17:00–18:30" },
  ],
  c2: [
    { sub: "sci", day: "จันทร์", time: "18:45–20:15" },
    { sub: "mathB", day: "อังคาร", time: "18:45–20:15" },
    { sub: "eng", day: "พุธ", time: "18:45–20:15" },
  ],
}

export const FB_TEXT: Record<string, string> = {
  sci: "สัปดาห์นี้น้องๆ ได้เรียนรู้เรื่องพันธุศาสตร์ เข้าใจการถ่ายทอดลักษณะทางพันธุกรรมของเมนเดล และอธิบายกฎการแยกตัว/การรวมกลุ่มอย่างอิสระได้อย่างถูกต้อง",
  mathB: "สัปดาห์นี้ทบทวนเรื่องสมการเชิงเส้นตัวแปรเดียว นักเรียนส่วนใหญ่แก้โจทย์พื้นฐานได้ดี ควรฝึกโจทย์ประยุกต์เพิ่มเติม",
  mathA: "สัปดาห์นี้เป็นโจทย์แข่งขันเรื่องทฤษฎีจำนวน เน้นการพิสูจน์ นักเรียนเริ่มจับแนวทางได้ แนะนำให้ฝึกโจทย์เก่าเพิ่ม",
  eng: "This week focused on reading comprehension and tense review. Most students improved on vocabulary usage.",
}

export const TOPIC: Record<string, string[]> = {
  sci: ["ระบบนิเวศ", "อาหารและสารอาหาร", "ระบบร่างกายมนุษย์", "การเจริญเติบโตของสัตว์ & เทคโนโลยีชีวภาพ", "พืช", "พันธุศาสตร์", "ดิน หิน แร่"],
  mathB: ["จำนวนเต็ม", "เศษส่วน & ทศนิยม", "สมการเชิงเส้นตัวแปรเดียว", "อัตราส่วน & ร้อยละ", "เรขาคณิตพื้นฐาน", "สถิติเบื้องต้น", "โจทย์ปัญหาระคน"],
  mathA: ["ทฤษฎีจำนวน", "พีชคณิตเชิงแข่งขัน", "เรขาคณิตเชิงพิสูจน์", "การนับ & ความน่าจะเป็น", "อสมการ", "ฟังก์ชันเบื้องต้น", "โจทย์ประยุกต์"],
  eng: ["Tenses Review", "Reading Comprehension", "Vocabulary Building", "Conditionals", "Writing Skills", "Listening Practice", "Error Identification"],
}
export const topicOf = (sub: string, wk: number) => (TOPIC[sub] && TOPIC[sub][wk - 1]) || "-"

// ระบบร่าง feedback template ต่อ (วิชา × สัปดาห์) จาก Lesson Topic — ครูอ่าน/แก้ต่อได้
export function draftFeedback(sub: string, wk: number): string {
  const t = topicOf(sub, wk)
  if (sub === "eng") return `This week focused on ${t}. Students practiced the key concepts and applied them through in-class exercises. Encourage some extra review at home to reinforce vocabulary and structure.`
  const lead: Record<string, string> = { sci: "สัปดาห์นี้เรียนวิชาวิทยาศาสตร์", mathB: "สัปดาห์นี้เรียนวิชาคณิตศาสตร์ (พื้นฐาน)", mathA: "สัปดาห์นี้เรียนวิชาคณิตศาสตร์ (เสริม)" }
  return `${lead[sub] || "สัปดาห์นี้"} เรื่อง${t} น้องๆ ได้ทำความเข้าใจแนวคิดหลักและฝึกโจทย์ในคาบเรียน แนะนำให้ทบทวนและลองฝึกโจทย์ประยุกต์เพิ่มเติมที่บ้านเพื่อความเข้าใจที่แน่นขึ้น`
}

export const GRADES: [string, string][] = [["ป.4", "g"], ["ป.5", "b"], ["ป.6", "a"]]
export const courseObj = (id: string) => COURSES.find((c) => c.id === id)!
export const courseShort = (id: string) => courseObj(id).n.replace("สอบเข้า ", "")
export const isNoClass = (cid: string, sub: string, wk: number) => noClassSet.has(cid + "|" + sub + "|" + wk)

let _s = 987654321
const rnd = () => { _s = (_s * 1103515245 + 12345) & 0x7fffffff; return _s / 0x7fffffff }
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]
const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1))

const NICKS = ["Alin", "Somchai", "Kanya", "Tee", "Ploy", "Nut", "Mind", "Petch", "Fah", "Bam", "Guy", "Nink", "Prae", "Tan", "Aom", "Bright", "View", "Jane", "Kong", "Mook", "Nan", "Ohm", "Pun", "Ryu", "Gift", "Best"]
const SURN = ["Leelapong", "Somsuk", "Meesuk", "Wongsakul", "Ratana", "Charoen", "Srisai", "Thongdee", "Bunmee", "Phakdee", "Intira", "Kittithad", "Saengsuk", "Chaiyo"]
const COLORS = ["#d98a4a", "#5b8dd6", "#9c8fe0", "#3fa07a", "#d96a9c", "#6aa0d9", "#c98a3a", "#7a9c4a", "#b06bd0", "#4aa0a0"]
const ADDR = ["87/78 ประชาสงเคราะห์ 22", "5/64 หมู่บ้านดิเอ็กซ์", "151/2 ม.3 ตันหยงลุโละ", "56 หมู่ 12 ซอย 2 น้ำใส", "144/4 หมู่ 5 บ้านเกาะ", "97/31 บ้านไม้งามโครงการ 2", "224 ม.7 ต.ท่าพระ", "91/107 หมู่ 1 หมู่บ้านสุข"]
const DELN = ["นางมาริกา ศิริกุลชัย", "แม่ปูมังกร", "กฤษณะ แท่นหิน", "น.ส.ศิริวรรณ พิญญุพงษ์", "นบตล สุทธิปัญโญ"]
const REG = ["20 Apr 26", "15 Jun 25", "25 Dec 25", "15 Aug 25", "02 Feb 26", "11 Mar 26"]

export const students: Student[] = []
for (let i = 0; i < 26; i++) {
  const nick = NICKS[i]
  const g = pick(GRADES)
  const base = i < 15 ? "c1" : "c2"
  const courses = [base]
  if ([13, 14, 15, 24, 25].includes(i)) courses.push(base === "c1" ? "c2" : "c1")
  const r = rnd()
  const status: Status = r < 0.66 ? "active" : r < 0.87 ? "inactive" : "churn"
  students.push({
    idx: i, id: "100000" + String(i + 1).padStart(2, "0"), name: nick + " " + pick(SURN), nick, grade: g[0], gc: g[1],
    lineName: pick(["-", "-", "-", nick, "ไอน์สไตล์ ไม่ชอบขี้เกียจ", "Mungkorn", "JIN(จิน)", "Diamond A.D.R.S."]),
    phone: "08" + ri(1, 9) + "-" + ri(100, 999) + "-" + ri(1000, 9999),
    register: pick(REG), premiumExp: "05 Nov, 26", premiumPlusExp: "05 Nov, 26", autoRenew: rnd() < 0.18,
    notes: rnd() < 0.22 ? "✅ ต่อคอร์ส จภ. แล้ว" : "", examResults: rnd() < 0.15 ? "ผ่านรอบแรก" : "—",
    deliveryName: rnd() < 0.5 ? pick(DELN) : "—", address: pick(ADDR),
    status, statusDur: status === "active" ? "" : status === "inactive" ? pick(["7d", "14d", "21d", "30d"]) : pick(["2M", "3M", "6M"]),
    av: COLORS[i % COLORS.length], courses, lastActiveWk: 0,
  })
}

export const STATUS_LABEL: Record<Status, string> = { active: "Active", inactive: "Inactive", churn: "Churn" }

// ── Guardians + LINE OA linking ─────────────────────────────────
export const guardians: Record<string, Guardian> = {}
const SIBLING_PAIRS: [number, number][] = [[0, 1], [7, 8], [14, 15]] // จับพี่น้อง (14=c1,15=c2 ข้ามคอร์ส)
const G_STATUS: LineStatus[] = ["linked", "linked", "invited", "linked", "none", "linked", "broken", "linked", "linked", "invited", "linked", "none", "linked", "linked", "invited", "linked"]
let _gseq = 0
SIBLING_PAIRS.forEach(([a, b]) => { const gid = "g" + (++_gseq); students[a].guardianId = gid; students[b].guardianId = gid })
students.forEach((s) => { if (!s.guardianId) s.guardianId = "g" + (++_gseq) })
let _gi = 0
students.forEach((s) => {
  const gid = s.guardianId!
  if (guardians[gid]) return
  const members = students.filter((x) => x.guardianId === gid)
  const st = G_STATUS[_gi % G_STATUS.length]; _gi++
  const pn = members[0].deliveryName && members[0].deliveryName !== "—" ? members[0].deliveryName : "ผู้ปกครองน้อง" + members[0].nick
  guardians[gid] = {
    id: gid, name: pn, phone: members[0].phone,
    lineUserId: st === "linked" || st === "broken" ? "U" + gid + "a1b2c3" : null,
    lineStatus: st, linkToken: "lk_" + gid + "_" + Math.floor(rnd() * 1e6).toString(36),
    linkedAt: st === "linked" ? "3 ก.ย. 26" : undefined,
  }
})
export const guardianOf = (idx: number): Guardian => guardians[students[idx].guardianId!]
export const siblingsOf = (idx: number): Student[] => { const gid = students[idx].guardianId; return students.filter((s) => !s.deleted && s.guardianId === gid) }
export const lineStatusOf = (idx: number): LineStatus => guardianOf(idx)?.lineStatus ?? "none"

// วิธีที่ส่งรายงาน (line = push · manual = ดาวน์โหลดส่งเอง) — key `${idx}|${cid}|${wk}`
export const sentMethod: Record<string, "line" | "manual"> = {}

export function unionSubs(s: Student) {
  const set: string[] = []
  s.courses.forEach((cid) => courseObj(cid).subs.forEach((sub) => { if (!set.includes(sub)) set.push(sub) }))
  return set
}

// mutable state
export const R: Record<number, Record<string, Record<number, Result>>> = {}
export const fbTpl: Record<string, { prepared: boolean; text: string }> = {}
export const sentSet = new Set<string>() // `${idx}|${cid}|${wk}`

// per-student parent summary (auto-draft, editable) — key `${idx}|${cid}|${wk}`
export const parentSummary: Record<string, string> = {}

COURSES.forEach((c) => c.subs.forEach((sub) => {
  for (const wk of WEEKS) { if (wk > CUR_WEEK) continue; const prepared = wk < CUR_WEEK ? true : sub !== "mathA"; fbTpl[c.id + "|" + sub + "|" + wk] = { prepared, text: prepared ? draftFeedback(sub, wk) : "" } }
}))

students.forEach((s) => {
  R[s.idx] = {}
  const subs = unionSubs(s)
  subs.forEach((sub) => {
    R[s.idx][sub] = {}
    const cid = s.courses.find((c) => courseObj(c).subs.includes(sub))!
    for (const wk of WEEKS) {
      if (wk > CUR_WEEK) continue
      if (noClassSet.has(cid + "|" + sub + "|" + wk)) { R[s.idx][sub][wk] = { att: "noclass" } as Result; continue }
      const present = rnd() > 0.14
      let att: Result["att"] = present ? "present" : "absent"
      if (!present && rnd() < 0.4) att = "makeup"
      const attended = att === "present" || att === "makeup"
      if (attended) s.lastActiveWk = Math.max(s.lastActiveWk, wk)
      const lqT = SUBJ[sub].lq
      const lqDone = attended ? (rnd() < 0.85 ? lqT : ri(Math.ceil(lqT * 0.5), lqT)) : 0
      const lqCorrect = Math.round(lqDone * (0.5 + rnd() * 0.48))
      const hwT = SUBJ[sub].hw
      const collected = wk < CUR_WEEK ? rnd() < 0.95 : rnd() < 0.6
      const late = collected && rnd() < 0.13
      const hwScore = collected ? ri(Math.floor(hwT * 0.4), hwT) : null
      R[s.idx][sub][wk] = { att, lqDone, lqCorrect, lqT, collected, late, hwScore, hwT }
    }
  })
  s.courses.forEach((cid) => {
    for (const wk of WEEKS) { if (wk >= CUR_WEEK) continue; if (rnd() < 0.9) sentSet.add(s.idx + "|" + cid + "|" + wk) }
    if (rnd() < 0.14) sentSet.add(s.idx + "|" + cid + "|" + CUR_WEEK)
  })
})

export const enrollments: { s: Student; course: string }[] = []
students.forEach((s) => s.courses.forEach((cid) => enrollments.push({ s, course: cid })))

// report overrides (เคสพิเศษ → มีผลบนรายงาน A4)
export interface ExtraSubject { id: string; name: string; livestreamId: string; date: string }
export interface Override {
  lateHw: Record<string, boolean>       // sub -> ขยายเวลาส่งการบ้าน
  noClass: Record<string, boolean>      // sub -> ไม่มีเรียน (บนรายงาน)
  makeup: Record<string, boolean>       // sub -> วันเรียนชดเชย (tag)
  rename: Record<string, string>        // sub -> ชื่อวิชาแก้ชั่วคราว
  dateRange?: string                    // ช่วงสัปดาห์แก้ชั่วคราว
  extraSubs: ExtraSubject[]             // วิชาเพิ่มเติม
}
const emptyOverride = (): Override => ({ lateHw: {}, noClass: {}, makeup: {}, rename: {}, extraSubs: [] })
export const overrides: Record<string, Override> = {}      // per-student `${idx}|${wk}`
export const weekOverrides: Record<string, Override> = {}  // whole-week `${course}|${wk}`
export const getWeekOverride = (course: string, wk: number): Override => (weekOverrides[course + "|" + wk] ||= emptyOverride())
// เคสพิเศษ = ระดับ Week ทั้งหมด (ทั้งคลาส) — ไม่มีรายบุคคลแล้ว
export const effOverride = (_idx: number, course: string, wk: number): Override => getWeekOverride(course, wk)

// Homework question bank (Manual): questions/keys shared per course|sub|wk · answers per student
export const HW_ANS = ["ก.", "ข.", "ค.", "ง."]
export const hwQuestions: Record<string, string[]> = {} // `${cid}|${sub}|${wk}` -> answer keys (เฉลย)
export const hwAnswers: Record<string, string[]> = {} // `${idx}|${sub}|${wk}` -> student answers
COURSES.forEach((c) => c.subs.forEach((sub) => {
  for (const wk of WEEKS) {
    if (wk > CUR_WEEK || isNoClass(c.id, sub, wk)) continue
    hwQuestions[c.id + "|" + sub + "|" + wk] = Array.from({ length: SUBJ[sub].hw }, (_, i) => HW_ANS[(i * 3) % 4])
  }
}))
