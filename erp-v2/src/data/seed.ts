// Mock data generated relative to "today" so the prototype always looks current.

import { addDays, fromMinutes, nextWeekday, toDateStr, weekdayOf } from "@/domain/dates"
import { generateSessions } from "@/domain/rules/scheduling"
import type {
  AppNotification, Attendance, Branch, Course, Entitlement, Family, Holiday, Invoice, Klass, LessonSummary,
  Package, Session, Staff, Student, Weekday,
} from "@/domain/types"

export interface DB {
  branches: Branch[]
  staff: Staff[]
  holidays: Holiday[]
  packages: Package[]
  courses: Course[]
  classes: Klass[]
  sessions: Session[]
  attendance: Attendance[]
  summaries: LessonSummary[]
  families: Family[]
  students: Student[]
  entitlements: Entitlement[]
  invoices: Invoice[]
  notifications: AppNotification[]
}

let seq = 0
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`

const wk = (open: string, close: string, closed: Weekday[] = [0]) =>
  Object.fromEntries(([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => [d, closed.includes(d) ? null : { open, close }])) as Branch["hours"]

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
      bankAccount: { bank: "กสิกรไทย", name: "บจก. นกอะคาเดมี่", number: "123-4-56789-0" }, lineOaConnected: true,
    },
    {
      id: "br_ari", code: "ARI", name: "อารีย์", brand: "liclass",
      rooms: [{ id: "rm_a1", name: "ห้อง A" }, { id: "rm_a2", name: "ห้อง B" }],
      hours: wk("10:00", "19:00", [0, 1]), subjects: ["คณิต", "อังกฤษ"], grades: ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"],
      defaultSessionMinutes: 90, busFeePerLeg: 120,
      bankAccount: { bank: "ไทยพาณิชย์", name: "บจก. ลิคลาส เอดูเคชั่น", number: "987-6-54321-0" }, lineOaConnected: false,
    },
  ]

  const st = (id: string, name: string, nickname: string, roles: Staff["roles"], branchIds: string[], subjects: string[], canLogin = true): Staff =>
    ({ id, name, nickname, roles, branchIds, subjects, active: true, canLogin, email: canLogin ? `${id}@nockacademy.com` : undefined })
  const staff: Staff[] = [
    st("u_nock", "นก ผู้อำนวยการ", "นก", ["director"], ["br_thl", "br_ari"], []),
    st("u_ploy", "พลอย แอดมิน", "พลอย", ["admin"], ["br_thl"], []),
    st("u_ton", "ต้น ผู้จัดการ", "ต้น", ["manager"], ["br_thl", "br_ari"], []),
    st("u_dai", "ได บรีซซี่", "ครูได", ["teacher"], ["br_thl"], ["คณิต", "วิทย์"]),
    st("u_jo", "โจ ใจเย็น", "ครูโจ", ["teacher"], ["br_thl"], ["คณิต"]),
    st("u_mint", "มิ้นท์ ศรีสุข", "ครูมิ้นท์", ["teacher"], ["br_thl", "br_ari"], ["อังกฤษ"]),
    st("u_prae", "แพร พากเพียร", "ครูแพร", ["teacher"], ["br_thl"], ["วิทย์", "อังกฤษ"]),
    st("u_beam", "บีม ใจดี", "ครูบีม", ["teacher"], ["br_ari"], ["คณิต"], false),
    { ...st("u_old", "โอ๊ต (ลาออก)", "ครูโอ๊ต", ["teacher"], ["br_thl"], ["คณิต"]), active: false },
  ]

  const holidays: Holiday[] = [
    { id: "hol_1", branchId: null, date: addDays(monday, 16), name: "วันหยุดชดเชย" },
  ]

  const packages: Package[] = [
    { id: "pk_m_math", branchId: "br_thl", subject: "คณิต", grades: ["ป.4", "ป.5", "ป.6"], unit: "month", price: 4500 },
    { id: "pk_m_eng", branchId: "br_thl", subject: "อังกฤษ", grades: ["ป.4", "ป.5", "ป.6", "ม.1"], unit: "month", price: 4200 },
    { id: "pk_h_sci", branchId: "br_thl", subject: "วิทย์", grades: ["ม.1", "ม.2", "ม.3"], unit: "hours", price: 6000, hours: 10 },
    { id: "pk_m_ari", branchId: "br_ari", subject: "คณิต", grades: ["ป.1", "ป.2", "ป.3"], unit: "month", price: 3800 },
  ]
  const courses: Course[] = [
    { id: "co_math5", branchId: "br_thl", name: "คณิต ป.5 รายเดือน", subject: "คณิต", grades: ["ป.5"], packageId: "pk_m_math" },
    { id: "co_eng", branchId: "br_thl", name: "อังกฤษ ป.4–ม.1 รายเดือน", subject: "อังกฤษ", grades: ["ป.4", "ป.5", "ป.6", "ม.1"], packageId: "pk_m_eng" },
    { id: "co_sci", branchId: "br_thl", name: "วิทย์ ม.ต้น 10 ชม.", subject: "วิทย์", grades: ["ม.1", "ม.2", "ม.3"], packageId: "pk_h_sci" },
    { id: "co_ari", branchId: "br_ari", name: "คณิต ป.ต้น รายเดือน", subject: "คณิต", grades: ["ป.1", "ป.2", "ป.3"], packageId: "pk_m_ari" },
  ]

  const families: Family[] = [
    { id: "fa_1", name: "ครอบครัวสุขใจ", parents: [{ name: "คุณแม่ สุดา", phone: "081-234-5678", lineLinked: true, primary: true }, { name: "คุณพ่อ วิชัย", phone: "089-111-2222", lineLinked: false, primary: false }] },
    { id: "fa_2", name: "ครอบครัวทองดี", parents: [{ name: "คุณแม่ ปราณี", phone: "086-555-1234", lineLinked: false, primary: true }] },
    { id: "fa_3", name: "ครอบครัวมั่นคง", parents: [{ name: "คุณพ่อ อนันต์", phone: "082-999-8888", lineLinked: true, primary: true }] },
    { id: "fa_4", name: "ครอบครัวรุ่งเรือง", parents: [{ name: "คุณแม่ จันทร์", phone: "090-123-4567", lineLinked: true, primary: true }] },
  ]
  const SURNAMES = ["ใจสู้", "รักเรียน", "ศรีสว่าง", "ทองคำ", "พูลผล", "มีสุข", "ชัยมงคล", "เพียรดี"]
  const s = (id: string, familyId: string | null, branchId: string, name: string, nickname: string, grade: string, usesBus = false): Student =>
    ({ id, familyId, branchId, name, nickname, grade, usesBus })
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
    ({ id, branchId, name, subject, grades, kind, type, teacherId, coTeacherIds: co, roomId, weekday, start: startT, minutes, startDate: nextWeekday(start, weekday), active: true, studentIds })
  const classes: Klass[] = [
    k("cl_math5", "br_thl", "คณิต ป.5 (อ.)", "คณิต", ["ป.5"], "u_dai", "rm_1", 2, "16:00", 60, ["stu_1", "stu_3", "stu_4", "stu_10", "stu_11", "stu_12"]),
    k("cl_eng", "br_thl", "อังกฤษ Conversation", "อังกฤษ", ["ป.5", "ป.6", "ม.1"], "u_mint", "rm_2", 3, "17:00", 90, ["stu_1", "stu_2", "stu_6", "stu_13", "stu_16"], ["u_prae"]),
    k("cl_sci", "br_thl", "วิทย์ ม.ต้น", "วิทย์", ["ม.1", "ม.2"], "u_dai", "rm_2", 6, "10:00", 120, ["stu_2", "stu_5", "stu_17", "stu_18", "stu_19"]),
    k("cl_math_sat", "br_thl", "คณิต ป.5 (ส.)", "คณิต", ["ป.5"], null, "rm_1", 6, "13:00", 60, ["stu_4", "stu_24"]), // no teacher → must still be visible
    k("cl_eng_thu", "br_thl", "อังกฤษ ป.6", "อังกฤษ", ["ป.6"], "u_mint", "rm_1", 4, "16:00", 60, ["stu_6", "stu_13", "stu_14", "stu_15", "stu_25"]),
    k("cl_math_jo", "br_thl", "คณิต ป.4", "คณิต", ["ป.4"], "u_jo", "rm_3", 1, "16:30", 60, ["stu_20", "stu_21"]),
    k("cl_ari", "br_ari", "คณิต ป.2", "คณิต", ["ป.2"], "u_beam", "rm_a1", 5, "15:00", 90, ["stu_8"]),
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
    ({ id, studentId, courseId, classId, invoiceId: "inv_paid", kind, from, to, sessionsTotal: total })
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
      entitlements.push(ent(`en_auto_${c.id}_${sid}`, sid, courseFor[c.subject], c.id, hours ? "sessions" : "subscription", start, addDays(monthStart, i % 3 === 0 ? 36 : 60), hours ? 10 : 8))
    }),
  )

  const iso = (d: string) => new Date(`${d}T10:00:00`).toISOString()
  const ym = today.slice(2, 4) + today.slice(5, 7)
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

  return { branches, staff, holidays, packages, courses, classes, sessions, attendance, summaries, families, students, entitlements, invoices, notifications: [] }
}
