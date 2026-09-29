// Mock data generated relative to "today" so the prototype always looks current.

import { addDays, fromMinutes, nextWeekday, toDateStr, weekdayOf } from "@/domain/dates"
import { chartPrice } from "@/domain/rules/course"
import { generateSessions } from "@/domain/rules/scheduling"
import type {
  Assessment, AppNotification, Attendance, Branch, ChatMessage, Conversation, Course, Entitlement, Family, Holiday, Invoice, Klass, Lead, LessonSummary,
  ActivityLog, PriceRow, Session, StudentNote, Staff, Student, StudentLeave, SystemConfig, Weekday,
} from "@/domain/types"

export interface DB {
  branches: Branch[]
  staff: Staff[]
  holidays: Holiday[]
  courses: Course[]
  classes: Klass[]
  sessions: Session[]
  attendance: Attendance[]
  summaries: LessonSummary[]
  families: Family[]
  students: Student[]
  entitlements: Entitlement[]
  leaves: StudentLeave[]
  invoices: Invoice[]
  leads: Lead[]
  conversations: Conversation[]
  messages: ChatMessage[]
  notifications: AppNotification[]
  system: SystemConfig
  notes: StudentNote[]
  logs: ActivityLog[]
  assessments: Assessment[]
}

let seq = 0
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`

const wk = (open: string, close: string, closed: Weekday[] = [0]) =>
  Object.fromEntries(([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => [d, closed.includes(d) ? null : { open, close }])) as Branch["hours"]

/** Suggested prices: hour packs ~250 ฿/ชม. (cheaper per hour for bigger packs), 4/8-week packs, monthly; higher grades cost a bit more. */
function chart(subjects: string[], grades: string[], scale = 1): PriceRow[] {
  const rows: PriceRow[] = []
  const r = (n: number) => Math.round((n * scale) / 50) * 50
  subjects.forEach((subject) =>
    grades.forEach((grade, gi) => {
      const g = 1 + gi * 0.04
      ;[12, 24, 48, 72, 96].forEach((h) => rows.push({ unit: "hour", duration: h, subject, grade, price: r(h * 260 * g * (1 - Math.min(h, 96) / 480)) }))
      ;[4, 8].forEach((w) => rows.push({ unit: "week", duration: w, subject, grade, price: r(w * 1100 * g) }))
      rows.push({ unit: "month", duration: 1, subject, grade, price: r(4200 * g) })
    }),
  )
  return rows
}

export function buildSeed(now = new Date()): DB {
  seq = 0
  const today = toDateStr(now)
  const monday = addDays(today, -((weekdayOf(today) + 6) % 7))
  const start = addDays(monday, -14) // classes started two weeks ago

  const branches: Branch[] = [
    {
      id: "br_thl", code: "THL", name: "ทองหล่อ", brand: "nockacademy",
      rooms: [{ id: "rm_1", name: "ห้อง 1" }, { id: "rm_2", name: "ห้อง 2" }, { id: "rm_3", name: "ห้อง 3" }],
      hours: wk("09:00", "20:00"), subjects: ["คณิต", "อังกฤษ", "วิทย์"], grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"],
      defaultSessionMinutes: 60, busFeePerLeg: 150,
      specialPeriods: [{ id: "sp_summer", name: "Summer", from: addDays(monday, 42), to: addDays(monday, 69), hours: wk("08:00", "22:00", []), active: true, priority: "high" }],
      active: true, email: "thonglor@nockacademy.com", address: "123 ถ.สุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กทม. 10110", phones: ["02-111-2222", "081-234-5678"], socials: ["https://facebook.com/nockacademy"],
      fees: [
        { id: "fee_bus_std", kind: "bus", name: "Standard", price: 150 },
        { id: "fee_bus_far", kind: "bus", name: "โซนไกล", price: 200 },
        { id: "fee_entry", kind: "entry", name: "ค่าแรกเข้า", price: 1500 },
        { id: "fee_mock", kind: "mock", name: "Mock test", price: 800 },
      ],
      promotions: [
        { id: "pr_3m", name: "ต่อ 3 เดือน ลด 5%", type: "pct", value: 5, unit: "month", minDuration: 3, active: true },
        { id: "pr_48h", name: "48 ชม. ลด 1,000", type: "amount", value: 1000, unit: "hour", minDuration: 48, active: true },
      ],
      packageDurations: { hour: [12, 24, 48, 72, 96], week: [4, 8] },
      priceChart: chart(["คณิต", "อังกฤษ", "วิทย์"], ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"]),
      bankAccount: { bank: "กสิกรไทย", branchName: "สาขาทองหล่อ", name: "บจก. นกอะคาเดมี่", number: "123-4-56789-0" }, lineOaConnected: true,
      lineOa: { channelId: "1657800001", botBasicId: "@nockacademy", addFriendUrl: "https://lin.ee/p4w3XA7" },
    },
    {
      id: "br_ari", code: "ARI", name: "อารีย์", brand: "liclass",
      rooms: [{ id: "rm_a1", name: "ห้อง A" }, { id: "rm_a2", name: "ห้อง B" }],
      hours: wk("10:00", "19:00", [0, 1]), subjects: ["คณิต", "อังกฤษ"], grades: ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"],
      defaultSessionMinutes: 90, busFeePerLeg: 120, specialPeriods: [],
      active: true, email: "ari@liclass.com", address: "45 ซ.อารีย์ 1 แขวงสามเสนใน เขตพญาไท กทม. 10400", phones: ["02-333-4444"], socials: [],
      fees: [{ id: "fee_bus_ari", kind: "bus", name: "Standard", price: 120 }], promotions: [],
      packageDurations: { hour: [12, 24, 48], week: [] },
      priceChart: chart(["คณิต", "อังกฤษ"], ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"], 0.85),
      bankAccount: { bank: "ไทยพาณิชย์", branchName: "สาขาอารีย์", name: "บจก. ลิคลาส เอดูเคชั่น", number: "987-6-54321-0" }, lineOaConnected: false,
      lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
    },
  ]

  const st = (id: string, name: string, nickname: string, roles: Staff["roles"], branchIds: string[], subjects: string[], canLogin = true): Staff =>
    ({ id, name, nickname, roles, branchIds, subjects, active: true, canLogin, email: canLogin ? `${id}@nockacademy.com` : undefined })
  const staff: Staff[] = [
    st("u_nock", "นก ผู้อำนวยการ", "นก", ["director"], ["br_thl", "br_ari"], []),
    st("u_sa", "ซี ซูเปอร์แอดมิน", "ซี", ["super_admin"], ["br_thl", "br_ari"], []),
    st("u_am", "เอ ผู้จัดการเขต", "เอ", ["area_manager"], ["br_thl", "br_ari"], []),
    st("u_ploy", "พลอย แอดมิน", "พลอย", ["admin"], ["br_thl"], []),
    // branch Manager of ทองหล่อ only — approvals at อารีย์ must be blocked for him
    st("u_ton", "ต้น ผู้จัดการ", "ต้น", ["manager"], ["br_thl"], []),
    st("u_dai", "ได บรีซซี่", "ครูได", ["teacher"], ["br_thl"], ["คณิต", "วิทย์"]),
    st("u_jo", "โจ ใจเย็น", "ครูโจ", ["teacher"], ["br_thl"], ["คณิต"]),
    st("u_mint", "มิ้นท์ ศรีสุข", "ครูมิ้นท์", ["teacher"], ["br_thl", "br_ari"], ["อังกฤษ"]),
    st("u_prae", "แพร พากเพียร", "ครูแพร", ["teacher"], ["br_thl"], ["วิทย์", "อังกฤษ"]),
    st("u_beam", "บีม ใจดี", "ครูบีม", ["teacher"], ["br_ari"], ["คณิต"], false),
    { ...st("u_old", "โอ๊ต (ลาออก)", "ครูโอ๊ต", ["teacher"], ["br_thl"], ["คณิต"]), active: false },
  ]

  const holidays: Holiday[] = [
    { id: "hol_1", branchId: null, date: addDays(monday, 16), name: "วันหยุดชดเชย", category: "traditional" },
    { id: "hol_ny", branchId: null, date: `${today.slice(0, 4)}-12-31`, name: "วันสิ้นปี", category: "traditional" },
    { id: "hol_sport", branchId: null, date: addDays(monday, 25), name: "Sport day", category: "company", openBranchIds: ["br_ari"] },
    { id: "hol_thl", branchId: "br_thl", date: addDays(monday, 30), name: "ปิดปรับปรุงสาขา", category: "branch" },
  ]

  // courses carry their own package type + price (staging); prices come from the branch chart unless a reason is given
  const course = (c: Omit<Course, "price" | "courseFee" | "active"> & { price?: number; courseFee?: number; active?: boolean }): Course => {
    const branch = branches.find((b) => b.id === c.branchId)!
    const chart = chartPrice(branch, c).price
    return { courseFee: 0, active: true, ...c, price: c.price ?? chart ?? 0 }
  }
  const courses: Course[] = [
    course({ id: "co_math5", branchId: "br_thl", name: "คณิต ป.5 รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "month", duration: 1 }),
    course({ id: "co_math4", branchId: "br_thl", name: "คณิต ป.4 รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.4"], unit: "month", duration: 1, courseFee: 300 }),
    course({ id: "co_eng", branchId: "br_thl", name: "อังกฤษ ป.4–ม.1 รายเดือน", kind: "single", subjects: ["อังกฤษ"], grades: ["ป.4", "ป.5", "ป.6", "ม.1"], unit: "month", duration: 1, price: 4200, priceReason: "ราคาเดียวทุกระดับชั้น (คลาส Conversation รวมชั้น)" }),
    course({ id: "co_sci", branchId: "br_thl", name: "วิทย์ ม.ต้น 12 ชม.", kind: "single", subjects: ["วิทย์"], grades: ["ม.1", "ม.2", "ม.3"], unit: "hour", duration: 12, price: 3300, priceReason: "ราคาเดียว ม.ต้น" }),
    course({ id: "co_math_w4", branchId: "br_thl", name: "คณิต ป.5 เข้มข้น 4 สัปดาห์", kind: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "week", duration: 4, from: addDays(monday, 7), to: addDays(monday, 63) }),
    course({ id: "co_bundle6", branchId: "br_thl", name: "คณิต + อังกฤษ ป.6", kind: "bundle", subjects: ["คณิต", "อังกฤษ"], grades: ["ป.6"], unit: "month", duration: 1, courseFee: 500 }),
    course({ id: "co_ari", branchId: "br_ari", name: "คณิต ป.ต้น รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.1", "ป.2", "ป.3"], unit: "month", duration: 1, price: 3800, priceReason: "ราคาเดียว ป.ต้น" }),
  ]

  const families: Family[] = [
    { id: "fa_1", name: "ครอบครัวสุขใจ", parents: [{ name: "คุณแม่ สุดา", phone: "081-234-5678", lineLinked: true, primary: true }, { name: "คุณพ่อ วิชัย", phone: "089-111-2222", lineLinked: false, primary: false }] },
    { id: "fa_2", name: "ครอบครัวทองดี", parents: [{ name: "คุณแม่ ปราณี", phone: "086-555-1234", lineLinked: false, primary: true }] },
    { id: "fa_3", name: "ครอบครัวมั่นคง", parents: [{ name: "คุณพ่อ อนันต์", phone: "082-999-8888", lineLinked: true, primary: true }] },
    { id: "fa_4", name: "ครอบครัวรุ่งเรือง", parents: [{ name: "คุณแม่ จันทร์", phone: "090-123-4567", lineLinked: true, primary: true }] },
  ]
  const SURNAMES = ["ใจสู้", "รักเรียน", "ศรีสว่าง", "ทองคำ", "พูลผล", "มีสุข", "ชัยมงคล", "เพียรดี"]
  const s = (id: string, familyId: string | null, branchId: string, name: string, nickname: string, grade: string, usesBus = false): Student =>
    ({ id, familyId, branchId, name, nickname, grade, usesBus, createdBranchId: branchId, createdAt: new Date(now.getTime() - (90 + id.length * 37) * 86400000).toISOString() })
  const students: Student[] = [
    s("stu_1", "fa_1", "br_thl", "ด.ญ. ใบเตย สุขใจ", "ใบเตย", "ป.5", true),
    s("stu_2", "fa_1", "br_thl", "ด.ช. ภูผา สุขใจ", "ภูผา", "ม.1"),
    s("stu_3", "fa_2", "br_thl", "ด.ญ. น้ำใส ทองดี", "น้ำใส", "ป.5"),
    s("stu_4", "fa_3", "br_thl", "ด.ช. ก้อง มั่นคง", "ก้อง", "ป.5", true),
    s("stu_5", "fa_3", "br_thl", "ด.ญ. ขิม มั่นคง", "ขิม", "ม.2"),
    s("stu_6", "fa_4", "br_thl", "ด.ช. ตะวัน รุ่งเรือง", "ตะวัน", "ป.6"),
    s("stu_7", null, "br_thl", "ด.ญ. มายด์ (ทดลองเรียน)", "มายด์", "ป.5"),
    s("stu_8", "fa_4", "br_ari", "ด.ญ. ดาว รุ่งเรือง", "ดาว", "ป.2"),
    // more THL students so class cards look like a real day
    ...[
      ["ปันปัน", "ป.5"], ["ข้าวหอม", "ป.5"], ["ภูมิ", "ป.5"], ["แพรวา", "ป.6"], ["ต้นกล้า", "ป.6"], ["เจได", "ป.6"],
      ["มะปราง", "ม.1"], ["ไอซ์", "ม.1"], ["ออมสิน", "ม.2"], ["ธันวา", "ม.2"], ["ใบบัว", "ป.4"], ["คิน", "ป.4"],
      ["น้ำฝน", "ม.3"], ["ปลื้ม", "ม.3"], ["ซันนี่", "ป.5"], ["บุ๊ค", "ป.6"],
    ].map(([nick, grade], i) => s(`stu_${10 + i}`, i === 15 ? null : `fa_g${Math.floor(i / 2)}`, "br_thl", `ด.${i % 2 ? "ช" : "ญ"}. ${nick} ${SURNAMES[Math.floor(i / 2)]}`, nick, grade, i % 4 === 0)),
  ]
  // siblings share a family; every third family has no LINE yet
  SURNAMES.forEach((sn, i) =>
    families.push({ id: `fa_g${i}`, name: `ครอบครัว${sn}`, parents: [{ name: `คุณแม่ ${sn}`, phone: `08${i}-555-01${String(i).padStart(2, "0")}`, lineLinked: i % 3 !== 0, primary: true }] }),
  )

  const k = (id: string, branchId: string, name: string, subject: string, grades: string[], teacherId: string | null, roomId: string | null, weekday: Weekday, startT: string, minutes: number, studentIds: string[], co: string[] = [], kind: Klass["kind"] = "learning", type: Klass["type"] = "group"): Klass =>
    ({ id, branchId, name, subject, grades, kind, type, courseId: CLASS_COURSE[id] ?? null, teacherId, coTeacherIds: co, roomId, weekday, start: startT, minutes, startDate: nextWeekday(start, weekday), active: true, studentIds })
  const CLASS_COURSE: Record<string, string> = { cl_math5: "co_math5", cl_math_sat: "co_math5", cl_eng: "co_eng", cl_eng_thu: "co_eng", cl_sci: "co_sci", cl_math_jo: "co_math4", cl_ari: "co_ari" }
  const classes: Klass[] = [
    k("cl_math5", "br_thl", "คณิต ป.5 (อ.)", "คณิต", ["ป.5"], "u_dai", "rm_1", 2, "16:00", 60, ["stu_1", "stu_3", "stu_4", "stu_10", "stu_11", "stu_12"]),
    k("cl_eng", "br_thl", "อังกฤษ Conversation", "อังกฤษ", ["ป.5", "ป.6", "ม.1"], "u_mint", "rm_2", 3, "17:00", 90, ["stu_1", "stu_2", "stu_6", "stu_13", "stu_16"], ["u_prae"]),
    k("cl_sci", "br_thl", "วิทย์ ม.ต้น", "วิทย์", ["ม.1", "ม.2"], "u_dai", "rm_2", 6, "10:00", 120, ["stu_2", "stu_5", "stu_17", "stu_18", "stu_19"]),
    k("cl_math_sat", "br_thl", "คณิต ป.5 (ส.)", "คณิต", ["ป.5"], null, "rm_1", 6, "13:00", 60, ["stu_4", "stu_24"]), // no teacher → must still be visible
    k("cl_eng_thu", "br_thl", "อังกฤษ ป.6", "อังกฤษ", ["ป.6"], "u_mint", "rm_1", 4, "16:00", 60, ["stu_6", "stu_13", "stu_14", "stu_15", "stu_25"]),
    k("cl_math_jo", "br_thl", "คณิต ป.4", "คณิต", ["ป.4"], "u_jo", "rm_3", 1, "16:30", 60, ["stu_20", "stu_21"]),
    k("cl_ari", "br_ari", "คณิต ป.2", "คณิต", ["ป.2"], "u_beam", "rm_a1", 5, "15:00", 90, ["stu_8"]),
    // multi-subject class (owner 2026-09-28): Math 15 min + Eng 30 min in one session, one summary — monthly bundle course
    { ...k("cl_combo6", "br_thl", "คณิต + อังกฤษ ป.6", "คณิต", ["ป.6"], "u_prae", "rm_3", 5, "16:00", 45, ["stu_6", "stu_14"], ["u_mint"]), subjects: ["คณิต", "อังกฤษ"], courseId: "co_bundle6" },
  ]

  const sessions: Session[] = classes.flatMap((c) => generateSessions(c, holidays, () => uid("se"), 10))

  // ---- today's showcase: every card state + a teacher clash and a room clash, placed around "now" ----
  const nowMin = Math.min(17 * 60, Math.max(13 * 60, Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) * 30))
  const one = (subject: string, startMin: number, minutes: number, teacherId: string | null, roomId: string | null, studentIds: string[], co: string[] = [], trial = false): Session => ({
    id: uid("se"), branchId: "br_thl", classId: null, subject, date: today, start: fromMinutes(startMin), minutes,
    teacherId, coTeacherIds: co, roomId, studentIds, trial, customized: true, cancelled: false,
  })
  const showDone = one("คณิต", nowMin - 240, 60, "u_jo", "rm_3", ["stu_20", "stu_21", "stu_22", "stu_23"])
  const showSummary = one("อังกฤษ", nowMin - 180, 90, "u_mint", "rm_1", ["stu_13", "stu_14", "stu_15", "stu_25", "stu_6"], ["u_prae"])
  const showAttendance = one("วิทย์", nowMin - 90, 60, "u_prae", "rm_2", ["stu_17", "stu_18", "stu_19"])
  const showLive = one("คณิต", nowMin - 30, 90, "u_dai", "rm_1", ["stu_1", "stu_3", "stu_4", "stu_10", "stu_11", "stu_12"])
  const clashA = one("อังกฤษ", nowMin + 90, 60, "u_mint", "rm_2", ["stu_2", "stu_16", "stu_24"])
  const clashB = one("คณิต", nowMin + 90, 60, "u_mint", "rm_3", ["stu_20", "stu_21"]) // same teacher, same time
  const clashC = one("วิทย์", nowMin + 90, 90, "u_prae", "rm_2", ["stu_5", "stu_19"]) // same room as clashA
  const trial = one("คณิต", nowMin + 150, 60, "u_jo", "rm_3", ["stu_7"], [], true)
  sessions.push(showDone, showSummary, showAttendance, showLive, clashA, clashB, clashC, trial)

  const attendance: Attendance[] = []
  const summaries: LessonSummary[] = []
  const nowMs = now.getTime()
  const write = (se: Session, sid: string, status: LessonSummary["status"], at: number) =>
    summaries.push({
      id: uid("sm"), sessionId: se.id, studentId: sid, authorId: se.teacherId!, lastEditorId: se.teacherId!,
      text: "ตั้งใจเรียนดี ทำโจทย์ได้คล่องขึ้น การบ้านหน้า 12–13", status, history: [{ at: new Date(at).toISOString(), by: se.teacherId!, action: "write" }],
    })
  const mark = (se: Session, sid: string, status: Attendance["status"], at: number) =>
    attendance.push({ sessionId: se.id, studentId: sid, status, markedBy: se.teacherId ?? "u_ploy", markedAt: new Date(at).toISOString() })

  // showcase states (only when they are actually in the past)
  const endOf = (se: Session) => new Date(`${se.date}T${se.start}:00`).getTime() + se.minutes * 60000
  if (endOf(showDone) < nowMs) showDone.studentIds.forEach((sid) => { mark(showDone, sid, "present", endOf(showDone)); write(showDone, sid, "submitted", endOf(showDone)) })
  if (endOf(showSummary) < nowMs)
    showSummary.studentIds.forEach((sid, i) => { mark(showSummary, sid, i === 4 ? "leave" : "present", endOf(showSummary)); if (i < 2) write(showSummary, sid, "submitted", endOf(showSummary)) })
  const showcase = new Set([showDone, showSummary, showAttendance, showLive, clashA, clashB, clashC, trial].map((x) => x.id))

  // other past sessions: attendance + summaries like a normal history
  sessions.forEach((se) => {
    if (showcase.has(se.id)) return
    const end = endOf(se)
    if (end > nowMs) return
    se.studentIds.forEach((sid, i) => {
      const status = (i + se.date.charCodeAt(9)) % 7 === 0 ? "leave" : (i + se.date.charCodeAt(8)) % 9 === 0 ? "absent" : "present"
      mark(se, sid, status, end - 30 * 60000)
      if (status === "present" && se.teacherId) write(se, sid, nowMs - end < 7 * 86400000 ? (i % 2 ? "submitted" : "draft") : "sent", end)
    })
  })

  const monthStart = today.slice(0, 8) + "01"
  const ent = (id: string, studentId: string, courseId: string, classId: string, kind: Entitlement["kind"], from: string, to: string, total: number): Entitlement =>
    ({ id, studentId, courseId, subjects: courses.find((c) => c.id === courseId)!.subjects, classId, invoiceId: "inv_paid", kind, from, to, sessionsTotal: total })
  const entitlements: Entitlement[] = [
    ent("en_1", "stu_1", "co_math5", "cl_math5", "subscription", monthStart, addDays(monthStart, 60), 8),
    ent("en_2", "stu_3", "co_math5", "cl_math5", "subscription", monthStart, addDays(today, 5), 4),
    ent("en_3", "stu_4", "co_math5", "cl_math5", "subscription", monthStart, addDays(monthStart, 60), 8),
    ent("en_4", "stu_2", "co_sci", "cl_sci", "sessions", start, addDays(start, 120), 5),
    ent("en_5", "stu_5", "co_sci", "cl_sci", "sessions", start, addDays(start, 120), 10),
    ent("en_6", "stu_6", "co_eng", "cl_eng", "subscription", monthStart, addDays(monthStart, 29), 4),
    ent("en_7", "stu_1", "co_eng", "cl_eng", "subscription", monthStart, addDays(monthStart, 29), 4),
    ent("en_8", "stu_8", "co_ari", "cl_ari", "subscription", monthStart, addDays(monthStart, 29), 4),
  ]
  // everyone else enrolled in a class gets a package, except stu_24 (demo: "no package" warning)
  const courseFor: Record<string, string> = { คณิต: "co_math5", อังกฤษ: "co_eng", วิทย์: "co_sci" }
  classes.forEach((c) =>
    c.studentIds.forEach((sid, i) => {
      if (sid === "stu_24" || c.branchId !== "br_thl" || entitlements.some((e) => e.studentId === sid && e.classId === c.id)) return
      const hours = c.subject === "วิทย์"
      entitlements.push(ent(`en_auto_${c.id}_${sid}`, sid, c.grades.includes("ป.4") ? "co_math4" : courseFor[c.subject], c.id, hours ? "sessions" : "subscription", start, addDays(monthStart, i % 3 === 0 ? 36 : 60), hours ? 10 : 8))
    }),
  )

  const iso = (d: string) => new Date(`${d}T10:00:00`).toISOString()

  const lead = (id: string, name: string, childGrade: string, subject: string, source: Lead["source"], stage: Lead["stage"], daysBack: number, assigneeId: string | null, phone: string, lineId: string, extra: Partial<Lead> = {}): Lead =>
    ({ id, branchId: "br_thl", name, childGrade, subject, source, stage, assigneeId, phone, lineId, createdAt: iso(addDays(today, -daysBack)), notes: [], convertedStudentId: null, ...extra })
  const leads: Lead[] = [
    lead("ld_1", "คุณแม่นุ่น เจริญวงศ์", "ป.3", "คณิต", "line", "new", 1, "u_ploy", "089-100-1001", "@noon_mom"),
    lead("ld_2", "คุณพ่อวิโรจน์ บัวขาว", "ป.6", "อังกฤษ", "walkin", "contacting", 3, "u_ploy", "089-100-1002", "@wiroj_dad"),
    lead("ld_3", "คุณแม่พัชรา สมใจ", "ป.5", "วิทย์", "website", "test_scheduled", 2, "u_ton", "089-100-1003", "@pat_mom", {
      scheduledAt: iso(addDays(today, 3)), trialStudentId: "stu_ld3",
      notes: [{ at: iso(addDays(today, -1)), by: "u_ton", text: "โทรนัดแล้ว ผู้ปกครองสะดวกเช้าวันศุกร์ — ยืนยันวันสอบวัดระดับแล้ว" }],
    }),
    lead("ld_4", "คุณแม่เลนา ฟิชเชอร์", "ป.4", "อังกฤษ", "referral", "trialed", 5, "u_ploy", "089-100-1004", "@lena_mom", {
      scheduledAt: new Date(`${addDays(today, -2)}T14:00:00`).toISOString(), trialStudentId: "stu_ld4",
      notes: [{ at: iso(addDays(today, -2)), by: "u_ploy", text: "ทดลองเรียนผ่านแล้ว ผู้ปกครองขอเวลาตัดสินใจแพ็กเกจ 2-3 วัน" }],
    }),
    lead("ld_5", "คุณพ่อเบน นากามูระ", "ป.4", "อังกฤษ", "referral", "payment_pending", 2, "u_ploy", "089-100-1005", "@ben_dad"),
    lead("ld_6", "คุณแม่กิ่งแก้ว มั่งมี", "ม.1", "คณิต", "line", "trial_scheduled", 1, "u_ton", "089-100-1006", "@king_mom", { scheduledAt: iso(addDays(today, 1)), trialStudentId: "stu_ld6" }),
    lead("ld_7", "คุณแม่ดาว รุ่งโรจน์", "ป.6", "วิทย์", "website", "enrolled", 10, "u_ploy", "089-100-1007", "@dao_mom"),
    lead("ld_8", "คริส เบเกอร์", "ป.5", "คณิต", "website", "archived", 20, null, "081-000-0008", "", { archivedFrom: "test_scheduled", archiveReason: "ไม่ตอบกลับหลังนัดสอบ 2 สัปดาห์" }),
    lead("ld_9", "แอนนา ไวท์", "ป.3", "อังกฤษ", "walkin", "archived", 14, null, "081-000-0009", "", { archivedFrom: "contacting", archiveReason: "ย้ายไปเรียนที่อื่นแล้ว" }),
  ]

  // trial/test students — mirrors what approveTestTrialSubmission creates for real (minimal Student +
  // Family + booked Session + Assessment) so a lead already at "นัดสอบ"/"ทดลองเรียน" looks complete on
  // the CRM side panel (bookable session to jump to, not just a bare date on the Lead record)
  families.push(
    { id: "fam_ld3", name: "ครอบครัวสมใจ", parents: [{ name: "คุณแม่พัชรา สมใจ", phone: "089-100-1003", lineLinked: false, primary: true }] },
    { id: "fam_ld4", name: "ครอบครัวฟิชเชอร์", parents: [{ name: "คุณแม่เลนา ฟิชเชอร์", phone: "089-100-1004", lineLinked: true, primary: true }] },
    { id: "fam_ld6", name: "ครอบครัวมั่งมี", parents: [{ name: "คุณแม่กิ่งแก้ว มั่งมี", phone: "089-100-1006", lineLinked: true, primary: true }] },
  )
  students.push(
    s("stu_ld3", "fam_ld3", "br_thl", "ด.ญ. พัช สมใจ", "พัช", "ป.5"),
    s("stu_ld4", "fam_ld4", "br_thl", "ด.ญ. เลโอนา ฟิชเชอร์", "เลโอนา", "ป.4"),
    s("stu_ld6", "fam_ld6", "br_thl", "ด.ช. กิ่ง มั่งมี", "กิ่ง", "ม.1"),
  )
  const ld3Date = addDays(today, 3)
  const ld6Date = addDays(today, 1)
  const ld4Date = addDays(today, -2)
  const se_ld3: Session = { id: "se_ld3test", branchId: "br_thl", classId: null, subject: "วิทย์", date: ld3Date, start: "10:00", minutes: 60, teacherId: "u_prae", coTeacherIds: [], roomId: "rm_2", studentIds: ["stu_ld3"], trial: true, assessment: "test", customized: true, cancelled: false }
  const se_ld6: Session = { id: "se_ld6trial", branchId: "br_thl", classId: null, subject: "คณิต", date: ld6Date, start: "10:00", minutes: 60, teacherId: "u_jo", coTeacherIds: [], roomId: "rm_3", studentIds: ["stu_ld6"], trial: true, assessment: "trial", customized: true, cancelled: false }
  const se_ld4: Session = { id: "se_ld4trial", branchId: "br_thl", classId: null, subject: "อังกฤษ", date: ld4Date, start: "14:00", minutes: 60, teacherId: "u_mint", coTeacherIds: [], roomId: "rm_1", studentIds: ["stu_ld4"], trial: true, assessment: "trial", customized: true, cancelled: false }
  sessions.push(se_ld3, se_ld6, se_ld4)

  const assessments: Assessment[] = [
    { id: "as_ld3", type: "test", leadId: "ld_3", studentId: "stu_ld3", sessionId: se_ld3.id, subject: "วิทย์", date: ld3Date, start: "10:00" },
    { id: "as_ld6", type: "trial", leadId: "ld_6", studentId: "stu_ld6", sessionId: se_ld6.id, subject: "คณิต", date: ld6Date, start: "10:00" },
    {
      id: "as_ld4", type: "trial", leadId: "ld_4", studentId: "stu_ld4", sessionId: se_ld4.id, subject: "อังกฤษ", date: ld4Date, start: "14:00",
      result: "เหมาะกับคลาสกลุ่ม ป.4", note: "ตั้งใจเรียนดี กล้าพูดภาษาอังกฤษ แนะนำเริ่มเรียนได้เลย", notedBy: "u_mint", notedAt: new Date(`${ld4Date}T15:00:00`).toISOString(),
    },
  ]

  const isoAt = (daysBack: number, h: number, m: number) => {
    const d = new Date(`${addDays(today, -daysBack)}T00:00:00`)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const conversations: Conversation[] = [
    { id: "cv_1", branchId: "br_thl", name: "ครอบครัวสุขใจ", familyId: "fa_1", leadId: null, channel: "line", assigneeId: "u_ploy", lastMessageAt: isoAt(0, 9, 15), unread: true },
    { id: "cv_2", branchId: "br_thl", name: "คุณพ่อวิโรจน์ บัวขาว", familyId: null, leadId: "ld_2", channel: "line", assigneeId: "u_ploy", lastMessageAt: isoAt(0, 8, 40), unread: true },
    { id: "cv_3", branchId: "br_thl", name: "ครอบครัวทองดี", familyId: "fa_2", leadId: null, channel: "line", assigneeId: "u_ton", lastMessageAt: isoAt(1, 16, 0), unread: false },
    { id: "cv_4", branchId: "br_thl", name: "คุณสมชาย (สอบถามทั่วไป)", familyId: null, leadId: null, channel: "phone", assigneeId: null, lastMessageAt: isoAt(2, 11, 0), unread: false },
    { id: "cv_5", branchId: "br_thl", name: "คุณแม่พัชรา สมใจ", familyId: null, leadId: "ld_3", channel: "phone", assigneeId: "u_ton", lastMessageAt: isoAt(1, 10, 30), unread: false },
  ]
  const msg = (id: string, conversationId: string, author: ChatMessage["author"], senderId: string | null, text: string, daysBack: number, h: number, m: number): ChatMessage =>
    ({ id, conversationId, author, senderId, text, at: isoAt(daysBack, h, m) })
  const messages: ChatMessage[] = [
    // cv_1 — customer (fa_1 → ใบเตย/ภูผา)
    msg("m_1a", "cv_1", "parent", null, "สวัสดีค่ะ อยากสอบถามว่าใบเตยเหลือกี่คาบคะ", 1, 14, 0),
    msg("m_1b", "cv_1", "staff", "u_ploy", "สวัสดีค่ะ เดี๋ยวเช็คให้นะคะ", 1, 14, 5),
    msg("m_1c", "cv_1", "internal", "u_ploy", "แม่ใบเตยถามยอดคงเหลือ — เช็ค entitlement ให้ด้วย", 1, 14, 6),
    msg("m_1d", "cv_1", "parent", null, "ขอบคุณค่ะ รอฟังนะคะ", 0, 9, 15),
    // cv_2 — lead (ld_2)
    msg("m_2a", "cv_2", "parent", null, "สวัสดีครับ ลูกชายอยู่ ป.6 สนใจ อังกฤษ ครับ", 3, 14, 0),
    msg("m_2b", "cv_2", "staff", "u_ploy", "สวัสดีครับ! มีคอร์สอังกฤษ ป.6 พอดีครับ สนใจทดลองเรียนไหมครับ", 3, 14, 20),
    msg("m_2c", "cv_2", "parent", null, "สนใจครับ ขอราคาด้วยครับ", 0, 8, 40),
    // cv_3 — customer (fa_2), already read
    msg("m_3a", "cv_3", "parent", null, "น้ำใสขอลาวันพุธหน้าค่ะ ไม่สบาย", 1, 15, 50),
    msg("m_3b", "cv_3", "staff", "u_ton", "รับทราบค่ะ พักผ่อนเยอะๆนะคะ", 1, 16, 0),
    // cv_4 — plain contact, unassigned
    msg("m_4a", "cv_4", "parent", null, "สวัสดีครับ อยากทราบว่ามีสาขาอารีย์ไหมครับ", 2, 10, 50),
    msg("m_4b", "cv_4", "staff", "u_ploy", "มีครับ อยู่สาขาอารีย์เลยครับ ติดต่อได้ตามเบอร์สาขานะครับ", 2, 11, 0),
    // cv_5 — lead (ld_3), phone contact — no LINE yet
    msg("m_5a", "cv_5", "staff", "u_ton", "สวัสดีค่ะ โทรนัดสอบวัดระดับให้น้องพัชแล้วนะคะ", 1, 10, 25),
    msg("m_5b", "cv_5", "internal", "u_ton", "แม่สะดวกเช้าวันศุกร์ นัดไว้ 10:00 วิชาวิทย์แล้วค่ะ", 1, 10, 30),
  ]

  const ym = String((Number(today.slice(0, 4)) + 543) % 100).padStart(2, "0") + today.slice(5, 7) // พ.ศ. 2 หลัก, same as nextInvoiceNumber
  const invoices: Invoice[] = [
    {
      id: "inv_paid", branchId: "br_thl", studentId: "stu_1", number: `INV-THL-${ym}-0001`,
      course: { courseId: "co_math5", classId: "cl_math5", startDate: monthStart, periods: 1 }, bus: [], bookFee: 0, advanceFee: 0,
      concession: null, noteToParent: "ค่าเรียนคณิตเดือนนี้", status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: iso(monthStart),
      approvedBy: "u_nock", sentAt: iso(monthStart), delivery: "delivered", receiptNumber: `RC-THL-${ym}-0001`,
      payments: [{ id: "pay_1", amount: 4500, method: "transfer", reference: "KBank 1234", recordedBy: "u_ploy", recordedAt: iso(monthStart), confirmedBy: "u_nock" }],
    },
    {
      id: "inv_pending", branchId: "br_thl", studentId: "stu_3", number: `INV-THL-${ym}-0002`,
      course: { courseId: "co_math5", classId: "cl_math5", startDate: addDays(today, 7), periods: 2 }, bus: [], bookFee: 350, advanceFee: 0,
      concession: null, noteToParent: "", status: "pending_approval", pdf: "ready", createdBy: "u_ploy", createdAt: iso(today), payments: [],
    },
    {
      id: "inv_draft", branchId: "br_thl", studentId: "stu_6", number: null,
      course: { courseId: "co_eng", classId: "cl_eng", startDate: today, periods: 1 }, bus: [], bookFee: 0, advanceFee: 0,
      concession: { amount: 200, remark: "ลูกค้าเก่า ต่อคอร์สต่อเนื่อง" }, noteToParent: "", status: "draft", pdf: "none", createdBy: "u_ploy", createdAt: iso(today), payments: [],
    },
  ]

  // seed history so every student's Timeline has real entries (created, enrolled, invoices)
  const logs: ActivityLog[] = []
  const lg = (at: string, by: string | null, category: ActivityLog["category"], studentIds: string[], action: string, detail: string) =>
    logs.push({ id: `lg_${logs.length}`, at, by, category, studentIds, action, detail })
  students.forEach((st) => lg(st.createdAt, "u_ploy", "profile", [st.id], "สร้างนักเรียน", `${st.nickname} · ${st.grade} · สาขา${branches.find((b) => b.id === st.createdBranchId)?.name ?? ""}`))
  classes.forEach((k) => k.studentIds.forEach((sid) => lg(new Date(now.getTime() - 20 * 86400000).toISOString(), "u_ploy", "class", [sid], "เข้าคลาส", k.name)))
  invoices.filter((i) => i.status === "paid").forEach((i) => lg(i.createdAt, null, "billing", [i.studentId], "ชำระครบ", `${i.number} · ระบบเพิ่มเข้าคลาสอัตโนมัติ`))
  logs.sort((a, b) => b.at.localeCompare(a.at))
  const notes: StudentNote[] = [
    { id: "nt_1", studentId: "stu_1", by: "u_ploy", at: new Date(now.getTime() - 3 * 86400000).toISOString(), text: "ใบเตยตั้งใจเรียนดี ตอบคำถามในห้องได้เกือบทุกข้อ คุณแม่ขอให้เน้นโจทย์ปัญหาก่อนสอบกลางภาค" },
  ]

  const on = { inApp: true, line: false }
  const system: SystemConfig = {
    subjects: ["คณิต", "อังกฤษ", "วิทย์"],
    invoiceMemos: {
      nockacademy: "กรุณาชำระภายใน 5 วันหลังได้รับใบแจ้งหนี้ · โอนแล้วส่งสลิปทาง LINE OA",
      liclass: "",
    },
    preferences: { language: "th", timezone: "Asia/Bangkok (UTC+7)", currency: "THB (฿)", dateFormat: "th-short" },
    settings: {
      notify: {
        renewal: { inApp: true, line: true }, new_lead: on, payslip: on, holiday_conflict: on, summary_deadline: on,
        student_added: on, starting_soon: on, invoice_sent: { inApp: true, line: true }, receipt_sent: { inApp: true, line: true }, summary_sent: { inApp: true, line: true },
      },
      lowSessionThreshold: 2,
      renewalDaysBefore: 7,
      summaryDeadlineHours: 24,
    },
  }

  return { branches, staff, holidays, courses, classes, sessions, attendance, summaries, families, students, entitlements, leaves: [], invoices, leads, conversations, messages, notifications: [], system, notes, logs, assessments }
}
