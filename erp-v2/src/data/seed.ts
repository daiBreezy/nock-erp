// Mock data generated relative to "today" so the prototype always looks current.

import { addDays, fromMinutes, nextWeekday, toDateStr, toMinutes, weekdayOf } from "@/domain/dates"
import { chartPrice } from "@/domain/rules/course"
import { cleanParent, cleanStudent, formatPhone, splitParentTitle } from "@/domain/rules/people"
import { invoiceTotals } from "@/domain/rules/billing"
import { reasonLabel } from "@/domain/rules/loss"
import { generateSessions } from "@/domain/rules/scheduling"
import { entitlementRounds } from "@/domain/rules/summaries"
import { packageCovers } from "@/domain/rules/attendance"
import type {
  Assessment, AppNotification, Attendance, DevTicket, NockQuestion, Branch, BusAddOn, DayBlocks, ChatMessage, CourseSummary, CreditNote, LessonBook, LessonTopic, Conversation, Course, Entitlement, Family, Holiday, Invoice, Klass, Lead, LessonSummary,
  ActivityLog, PriceRow, Session, StudentNote, Staff, Student, StudentLeave, SurveyCampaign, SurveyResponse, SystemConfig, Weekday,
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
  courseSummaries: CourseSummary[]
  nockQuestions: NockQuestion[]
  devTickets: DevTicket[]
  families: Family[]
  students: Student[]
  entitlements: Entitlement[]
  leaves: StudentLeave[]
  invoices: Invoice[]
  busAddOns: BusAddOn[]
  creditNotes: CreditNote[]
  lessonBooks: LessonBook[]
  lessonTopics: LessonTopic[]
  leads: Lead[]
  conversations: Conversation[]
  messages: ChatMessage[]
  notifications: AppNotification[]
  system: SystemConfig
  notes: StudentNote[]
  logs: ActivityLog[]
  assessments: Assessment[]
  /** yearly parent survey (owner 2026-10-05): each send-out + the answers pulled from the form server */
  surveyCampaigns: SurveyCampaign[]
  surveyResponses: SurveyResponse[]
}

let seq = 0
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(seq++).toString(36)}`

/** 2-hour blocks from start times: Mon–Fri one list, Sat–Sun another */
const blockWeek = (weekday: string[], weekend: string[]): DayBlocks => {
  const b = (ts: string[]) => ts.map((t) => ({ start: t, end: `${String(Number(t.slice(0, 2)) + 2).padStart(2, "0")}${t.slice(2)}` }))
  return { 1: b(weekday), 2: b(weekday), 3: b(weekday), 4: b(weekday), 5: b(weekday), 6: b(weekend), 0: b(weekend) }
}

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

// real-sounding session notes, so the sent pile and the Course Summary "Generate" have something to gather
const SESSION_NOTES = [
  "ตั้งใจเรียนดี ทำโจทย์ได้คล่องขึ้น การบ้านหน้า 12–13",
  "เข้าใจเรื่องเศษส่วนดีขึ้นมาก ยังสะเพร่าตอนทดเลข การบ้านแบบฝึกหัด 3.2",
  "อ่านออกเสียงชัดขึ้น กล้าตอบคำถามเป็นภาษาอังกฤษ ทบทวนคำศัพท์ Unit 4",
  "ทำโจทย์ปัญหาได้เองครบทุกข้อ ควรฝึกเขียนวิธีทำให้เป็นขั้นตอน",
  "วันนี้ง่วงนิดหน่อย แต่ทำแบบฝึกหัดเสร็จ ฝากผู้ปกครองดูเรื่องเวลานอน",
  "ทดลองทำข้อสอบเก่า ได้ 16/20 ผิดเรื่องร้อยละ 2 ข้อ จะทบทวนคาบหน้า",
  "ฟังจับใจความได้ดี เขียนประโยค Past simple ยังสลับกริยาช่อง 2",
]

// notes for a Bundle class — one session covers both subjects, so the note names each one (Course Summary splits them)
const COMBO_NOTES = [
  "คณิต: ทำโจทย์เศษส่วนได้คล่องขึ้น · อังกฤษ: อ่านออกเสียงชัด กล้าตอบ",
  "คณิต: ยังสับสนการทดเลข ควรฝึกเพิ่ม · อังกฤษ: จำคำศัพท์ Unit 5 ได้ดี",
  "คณิต: แก้โจทย์ปัญหาได้เองครบทุกข้อ · อังกฤษ: Grammar Past simple ยังสลับ ต้องทบทวน",
  "คณิต: ตั้งใจเรียนดี ทำแบบฝึกหัดเสร็จ · อังกฤษ: ฟังจับใจความเก่งขึ้น",
]

export function buildSeed(now = new Date()): DB {
  seq = 0
  const today = toDateStr(now)
  const monday = addDays(today, -((weekdayOf(today) + 6) % 7))
  const start = addDays(monday, -14) // classes started two weeks ago

  const branches: Branch[] = [
    {
      id: "br_thl", code: "TL", branchNo: "001", name: "ทองหล่อ", nameEn: "Thonglor", brand: "liclass", province: "BKK",
      rooms: [{ id: "rm_1", name: "ห้อง 1" }, { id: "rm_2", name: "ห้อง 2" }, { id: "rm_3", name: "ห้อง 3" }],
      hours: wk("09:00", "20:00"), subjects: ["คณิต", "อังกฤษ", "วิทย์"], grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"],
      defaultSessionMinutes: 60, busFeePerLeg: 150,
      // standard 2-hour blocks (owner ref: 13–15 / 15–17 / 17–19)
      blockPlans: [{ from: "2020-01-01", byDay: blockWeek(["13:00", "15:00", "17:00"], ["09:00", "11:00", "13:00", "15:00"]) }],
      // Summer has its own blocks and its own classes (owner 2026-10-01); regular classes keep going (default)
      specialPeriods: [{ id: "sp_summer", name: "Summer", from: addDays(monday, 42), to: addDays(monday, 69), hours: wk("08:00", "22:00", []), active: true, priority: "high",
        blocks: blockWeek(["09:00", "13:00", "16:00", "18:00"], ["09:00", "13:00"]),
        invoiceMemo: "Summer Camp 2026 · ค่าเรียนชำระครั้งเดียวก่อนวันเริ่ม ไม่คืนเงินหลังเริ่มเรียน (ย้ายรอบได้ 1 ครั้ง) · รวมค่าเอกสารแล้ว" }],
      active: true, email: "thonglor@liclass.com", address: "123 ถ.สุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กทม. 10110", phones: ["02-111-2222", "081-234-5678"], socials: ["https://facebook.com/nockacademy"],
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
      bankAccount: { bank: "กสิกรไทย", branchName: "สาขาทองหล่อ", name: "บจก. ลิคลาส เอดูเคชั่น", number: "123-4-56789-0" }, lineOaConnected: true,
      lineOa: { channelId: "1657800001", botBasicId: "@nockacademy", addFriendUrl: "https://lin.ee/p4w3XA7" },
    },
    {
      id: "br_ari", code: "BN", branchNo: "001", name: "บางนา", nameEn: "Bangna", brand: "nockacademy", province: "BKK",
      rooms: [{ id: "rm_a1", name: "ห้อง A" }, { id: "rm_a2", name: "ห้อง B" }],
      hours: wk("10:00", "19:00", [0, 1]), subjects: ["คณิต", "อังกฤษ"], grades: ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"],
      defaultSessionMinutes: 90, busFeePerLeg: 120, specialPeriods: [],
      blockPlans: [{ from: "2020-01-01", byDay: blockWeek(["15:00", "17:00"], ["10:00", "12:00", "14:00", "16:00"]) }],
      active: true, email: "bangna@nockacademy.com", address: "45 ซ.บางนา-ตราด 25 แขวงบางนาใต้ เขตบางนา กทม. 10400", phones: ["02-333-4444"], socials: [],
      fees: [{ id: "fee_bus_ari", kind: "bus", name: "Standard", price: 120 }], promotions: [],
      packageDurations: { hour: [12, 24, 48], week: [] },
      priceChart: chart(["คณิต", "อังกฤษ"], ["ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6"], 0.85),
      bankAccount: { bank: "ไทยพาณิชย์", branchName: "สาขาบางนา", name: "บจก. นกอะคาเดมี่", number: "987-6-54321-0" }, lineOaConnected: false,
      lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
    },
    // the rest of the company (owner 2026-10-01: ~12 branches — NockAcademy 10, Liclass 2). Names are placeholders
    // from the Reports ref; light setup (one class + two courses each) so Reports has every branch to compare
    ...([
      // owner 2026-10-07: the real branches — BKK: Liclass TL · NAS BN PP GP RH · CBR: Liclass SR · NAS SR CB PT BW
      ["br_prd", "PP", "002", "พาราไดซ์ พาร์ค", "Paradise Park", "nockacademy", "BKK"], ["br_skv", "GP", "003", "กรีนเพลส", "Green Place", "nockacademy", "BKK"],
      ["br_slm", "RH", "004", "รามคำแหง", "Ramkhumhaeng", "nockacademy", "BKK"], ["br_src", "SR", "002", "ศรีราชา", "Sriracha", "liclass", "CBR"],
      ["br_bna", "SR", "005", "ศรีราชา", "Sriracha", "nockacademy", "CBR"], ["br_cbr", "CB", "006", "ชลบุรี (ตึกน้ำ)", "Chonburi (Tuknam)", "nockacademy", "CBR"],
      ["br_pty", "PT", "007", "พัทยา", "Pattaya", "nockacademy", "CBR"], ["br_sth", "BW", "008", "บ่อวิน", "Bowin", "nockacademy", "CBR"],
    ] as const).map(([id, code, branchNo, name, nameEn, brand, province]): Branch => ({
      id, code, branchNo, name, nameEn, brand, province,
      rooms: [{ id: `${id}_r1`, name: "ห้อง 1" }, { id: `${id}_r2`, name: "ห้อง 2" }],
      hours: wk("09:00", "20:00"), subjects: ["คณิต", "อังกฤษ", "วิทย์"], grades: ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"],
      defaultSessionMinutes: 60, busFeePerLeg: 150, specialPeriods: [],
      blockPlans: [{ from: "2020-01-01", byDay: blockWeek(["13:00", "15:00", "17:00"], ["09:00", "11:00", "13:00", "15:00"]) }],
      active: true, email: `${code.toLowerCase()}@${brand}.com`, address: "", phones: [], socials: [],
      fees: [{ id: `${id}_bus`, kind: "bus", name: "Standard", price: 150 }], promotions: [],
      packageDurations: { hour: [12, 24, 48, 72, 96], week: [4] },
      priceChart: chart(["คณิต", "อังกฤษ", "วิทย์"], ["ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3"], brand === "liclass" ? 0.85 : 1),
      bankAccount: { bank: "กสิกรไทย", branchName: `สาขา${name}`, name: brand === "liclass" ? "บจก. ลิคลาส เอดูเคชั่น" : "บจก. นกอะคาเดมี่", number: "000-0-00000-0" }, lineOaConnected: false,
      lineOa: { channelId: "", botBasicId: "", addFriendUrl: "" },
    })),
  ]
  const ALL_BRANCHES = branches.map((b) => b.id)
  // Area Manager เอ looks after the Bangkok zone (owner: Area Manager sees only their area)
  const BKK_ZONE = branches.filter((b) => b.province === "BKK").map((b) => b.id)

  const st = (id: string, name: string, nickname: string, roles: Staff["roles"], branchIds: string[], subjects: string[], canLogin = true): Staff =>
    ({ id, name, nickname, roles, branchIds, subjects, active: true, canLogin, email: canLogin ? `${id}@nockacademy.com` : undefined })
  const staff: Staff[] = [
    st("u_nock", "นก ผู้อำนวยการ", "นก", ["director"], ALL_BRANCHES, []),
    st("u_sa", "ซี ซูเปอร์แอดมิน", "ซี", ["super_admin"], ALL_BRANCHES, []),
    { ...st("u_am", "เอ ผู้จัดการเขต", "เอ", ["area_manager"], BKK_ZONE, []), areaBranchIds: BKK_ZONE },
    // owner 2026-10-12: some staff do more than one job — พลอย is Admin and also teaches English
    st("u_ploy", "พลอย แอดมิน", "พลอย", ["admin", "teacher"], ["br_thl"], ["อังกฤษ"]),
    // branch Manager of ทองหล่อ only — approvals at บางนา must be blocked for him
    st("u_ton", "ต้น ผู้จัดการ", "ต้น", ["manager"], ["br_thl"], []),
    st("u_dai", "ได บรีซซี่", "ครูได", ["teacher"], ["br_thl"], ["คณิต", "วิทย์", "อังกฤษ"]),
    st("u_jo", "โจ ใจเย็น", "ครูโจ", ["teacher"], ["br_thl"], ["คณิต"]),
    st("u_mint", "มิ้นท์ ศรีสุข", "ครูมิ้นท์", ["teacher"], ["br_thl", "br_ari"], ["อังกฤษ"]),
    st("u_prae", "แพร พากเพียร", "ครูแพร", ["teacher"], ["br_thl"], ["วิทย์", "อังกฤษ"]),
    { ...st("u_beam", "บีม ใจดี", "ครูบีม", ["teacher"], ["br_ari"], ["คณิต"], false), partTime: true },
    // part-time teachers — substitutes when a teacher is on leave
    { ...st("u_fon", "ฝน ขยันสอน", "ครูฝน", ["teacher"], ["br_thl"], ["คณิต", "อังกฤษ"], false), partTime: true },
    { ...st("u_kaew", "แก้ว ใจงาม", "ครูแก้ว", ["teacher"], ["br_thl"], ["วิทย์"], false), partTime: true },
    // owner 2026-10-13: the development team — answers เรื่องถึง Dev
    st("u_dev", "เดฟ ทีมพัฒนา", "เดฟ", ["developer"], ALL_BRANCHES, []),
    { ...st("u_old", "โอ๊ต (ลาออก)", "ครูโอ๊ต", ["teacher"], ["br_thl"], ["คณิต"]), active: false },
  ]

  const holidays: Holiday[] = [
    { id: "hol_1", branchId: null, date: addDays(monday, 16), name: "วันหยุดชดเชย", category: "traditional" },
    { id: "hol_ny", branchId: null, date: `${today.slice(0, 4)}-12-31`, name: "วันสิ้นปี", category: "traditional" },
    { id: "hol_sport", branchId: null, date: addDays(monday, 25), name: "Sport day", category: "company", openBranchIds: ["br_ari"] },
    { id: "hol_thl", branchId: "br_thl", date: addDays(monday, 30), name: "ปิดปรับปรุงสาขา", category: "branch" },
  ]

  // courses carry their own package type + price (staging); prices come from the branch chart unless a reason is given
  const course = (c: Omit<Course, "price" | "courseFee" | "active" | "format"> & { price?: number; courseFee?: number; active?: boolean; format?: Course["format"] }): Course => {
    const branch = branches.find((b) => b.id === c.branchId)!
    const chart = chartPrice(branch, c).price
    return { courseFee: 0, active: true, format: "group", ...c, price: c.price ?? chart ?? 0 }
  }
  const courses: Course[] = [
    course({ id: "co_math5", branchId: "br_thl", name: "คณิต ป.5 รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "month", duration: 1 }),
    course({ id: "co_math4", branchId: "br_thl", name: "คณิต ป.4 รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.4"], unit: "month", duration: 1, courseFee: 300 }),
    course({ id: "co_eng", branchId: "br_thl", name: "อังกฤษ ป.4–ม.1 รายเดือน", kind: "single", subjects: ["อังกฤษ"], grades: ["ป.4", "ป.5", "ป.6", "ม.1"], unit: "month", duration: 1, price: 4200, priceReason: "ราคาเดียวทุกระดับชั้น (คลาส Conversation รวมชั้น)" }),
    course({ id: "co_sci", branchId: "br_thl", name: "วิทย์ ม.ต้น 12 ชม.", kind: "single", subjects: ["วิทย์"], grades: ["ม.1", "ม.2", "ม.3"], unit: "hour", duration: 12, price: 3300, priceReason: "ราคาเดียว ม.ต้น" }),
    course({ id: "co_math_w4", branchId: "br_thl", name: "คณิต ป.5 เข้มข้น 4 สัปดาห์", kind: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "week", duration: 4, from: addDays(monday, 7), to: addDays(monday, 63) }),
    // owner 2026-10-13: a course made for Summer — its invoices + receipts print Summer's Memo
    course({ id: "co_summer_eng", branchId: "br_thl", name: "Summer English Camp 4 สัปดาห์", kind: "single", subjects: ["อังกฤษ"], grades: ["ป.5", "ป.6"], unit: "week", duration: 4, periodId: "sp_summer", price: 8900, priceReason: "ราคาแคมป์ Summer" }),
    course({ id: "co_bundle6", branchId: "br_thl", name: "คณิต + อังกฤษ ป.6", kind: "bundle", subjects: ["คณิต", "อังกฤษ"], grades: ["ป.6"], unit: "month", duration: 1, courseFee: 500 }),
    course({ id: "co_math5_pv", branchId: "br_thl", name: "คณิต ป.5 เรียนเดี่ยว 12 ชม.", kind: "single", format: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "hour", duration: 12, price: 7200, priceReason: "เรียนเดี่ยว (Private) ราคาต่อชั่วโมงสูงกว่ากลุ่ม" }),
    // 10 h on the 90-min Conversation class = 6 sessions + 60 min leftover (demo: the admin decides the leftover)
    course({ id: "co_eng_h10", branchId: "br_thl", name: "อังกฤษ Conversation 10 ชม.", kind: "single", subjects: ["อังกฤษ"], grades: ["ป.5", "ป.6", "ม.1"], unit: "hour", duration: 10, price: 5500, priceReason: "แพ็กชั่วโมงคลาส Conversation" }),
    course({ id: "co_ari", branchId: "br_ari", name: "คณิต ป.ต้น รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.1", "ป.2", "ป.3"], unit: "month", duration: 1, price: 3800, priceReason: "ราคาเดียว ป.ต้น" }),
    // hour packs come in many sizes (owner 2026-10-01: 12 / 24 / 48 / 72 / 96 ชม.)
    ...[24, 48, 72, 96].map((h) => course({ id: `co_eng_h${h}`, branchId: "br_thl", name: `อังกฤษ ป.6 ${h} ชม.`, kind: "single", subjects: ["อังกฤษ"], grades: ["ป.6"], unit: "hour", duration: h })),
    // the other branches: monthly Maths, a 4-week Maths and English hour packs
    ...branches.slice(2).flatMap((b) => [
      course({ id: `co_${b.id}_m`, branchId: b.id, name: "คณิต ป.5 รายเดือน", kind: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "month", duration: 1 }),
      course({ id: `co_${b.id}_w4`, branchId: b.id, name: "คณิต ป.5 4 สัปดาห์", kind: "single", subjects: ["คณิต"], grades: ["ป.5"], unit: "week", duration: 4 }),
      ...[12, 24, 48, 72, 96].map((h) => course({ id: h === 12 ? `co_${b.id}_e` : `co_${b.id}_e${h}`, branchId: b.id, name: `อังกฤษ ป.6 ${h} ชม.`, kind: "single", subjects: ["อังกฤษ"], grades: ["ป.6"], unit: "hour", duration: h })),
    ]),
  ]

  const families: Family[] = [
    { id: "fa_1", name: "ครอบครัวสุขใจ", parents: [{ name: "คุณแม่ สุดา", phone: "081-234-5678", lineLinked: true, primary: true }, { name: "คุณพ่อ วิชัย", phone: "089-111-2222", lineLinked: false, primary: false }], address: "88/12 หมู่บ้านพฤกษา ซ.สุขุมวิท 71", location: { lat: 13.7236, lng: 100.5972 }, addressNote: "เข้าซอย 2 บ้านหลังที่ 3 ซ้ายมือ ประตูสีขาว" },
    { id: "fa_2", name: "ครอบครัวทองดี", parents: [{ name: "คุณแม่ ปราณี", phone: "086-555-1234", lineLinked: false, primary: true }] },
    { id: "fa_3", name: "ครอบครัวมั่นคง", parents: [{ name: "คุณพ่อ อนันต์", phone: "082-999-8888", lineLinked: true, primary: true }] },
    { id: "fa_4", name: "ครอบครัวรุ่งเรือง", parents: [{ name: "คุณแม่ จันทร์", phone: "090-123-4567", lineLinked: true, primary: true }] },
  ]
  const SURNAMES = ["ใจสู้", "รักเรียน", "ศรีสว่าง", "ทองคำ", "พูลผล", "มีสุข", "ชัยมงคล", "เพียรดี"]
  const s = (id: string, familyId: string | null, branchId: string, name: string, nickname: string, grade: string, usesBus = false): Student =>
    ({ id, familyId, branchId, name, nickname, grade, usesBus, createdBranchId: branchId, createdAt: new Date(now.getTime() - (90 + id.length * 37) * 86400000).toISOString(),
      // the demo's existing students came in with the import of the old system (owner 2026-09-30)
      imported: { at: new Date(now.getTime() - 120 * 86400000).toISOString(), source: "ระบบเดิม" } })
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
    families.push({ id: `fa_g${i}`, name: `ครอบครัว${sn}`, parents: [{ name: `${["มาลี", "สมพร", "วรรณา", "ปราณี", "จันทร์เพ็ญ", "นิตยา", "ศศิธร", "อัญชลี"][i]} ${sn}`, relationship: "แม่", phone: `08${i}-555-01${String(i).padStart(2, "0")}`, lineLinked: i % 3 !== 0, primary: true }] }),
  )

  const k = (id: string, branchId: string, name: string, subject: string, grades: string[], teacherId: string | null, roomId: string | null, weekday: Weekday, startT: string, minutes: number, studentIds: string[], co: string[] = [], kind: Klass["kind"] = "learning", type: Klass["type"] = "group"): Klass =>
    ({ id, branchId, name, subject, grades, kind, type, courseId: CLASS_COURSE[id] ?? null, teacherId, coTeacherIds: co, roomId, weekday, start: startT, minutes, startDate: nextWeekday(start, weekday), active: true, studentIds })
  const CLASS_COURSE: Record<string, string> = { cl_math5: "co_math5", cl_math_sat: "co_math5", cl_eng: "co_eng", cl_eng_thu: "co_eng", cl_sci: "co_sci", cl_math_jo: "co_math4", cl_ari: "co_ari", cl_math5_pv: "co_math5_pv" }
  const classes: Klass[] = [
    k("cl_math5", "br_thl", "คณิต ป.5 (อ.)", "คณิต", ["ป.5"], "u_dai", "rm_1", 2, "16:00", 60, ["stu_1", "stu_3", "stu_4", "stu_10", "stu_11", "stu_12"]),
    k("cl_eng", "br_thl", "อังกฤษ Conversation", "อังกฤษ", ["ป.5", "ป.6", "ม.1"], "u_mint", "rm_2", 3, "17:00", 90, ["stu_1", "stu_2", "stu_6", "stu_13", "stu_16"], ["u_prae"]),
    k("cl_sci", "br_thl", "วิทย์ ม.ต้น", "วิทย์", ["ม.1", "ม.2"], "u_dai", "rm_2", 6, "10:00", 120, ["stu_2", "stu_5", "stu_17", "stu_18", "stu_19"]),
    k("cl_math_sat", "br_thl", "คณิต ป.5 (ส.)", "คณิต", ["ป.5"], null, "rm_1", 6, "13:00", 60, ["stu_4", "stu_24"]), // no teacher → must still be visible
    k("cl_eng_thu", "br_thl", "อังกฤษ ป.6", "อังกฤษ", ["ป.6"], "u_mint", "rm_1", 4, "16:00", 60, ["stu_6", "stu_13", "stu_14", "stu_15", "stu_25"]),
    k("cl_math_jo", "br_thl", "คณิต ป.4", "คณิต", ["ป.4"], "u_jo", "rm_3", 1, "16:30", 60, ["stu_20", "stu_21"]),
    // NockAcademy's usual layout (owner ref 2026-09-30): a teacher's 2-hour block, students of different subjects/books
    // side by side, some for one hour only
    { ...k("cl_block_dai", "br_thl", "ครูได · ศ. 17:00", "คณิต", [], "u_dai", "rm_1", 5, "17:00", 120, ["stu_10", "stu_11", "stu_17", "stu_18"]),
      layout: "teacher" as const, subjects: ["คณิต", "วิทย์"], seats: { stu_11: { offset: 0, minutes: 60 }, stu_18: { offset: 60, minutes: 60 } } },
    k("cl_math5_pv", "br_thl", "คณิต ป.5 เดี่ยว", "คณิต", ["ป.5"], "u_dai", "rm_3", 4, "17:30", 60, [], [], "learning", "single"),
    k("cl_ari", "br_ari", "คณิต ป.2", "คณิต", ["ป.2"], "u_beam", "rm_a1", 5, "15:00", 90, ["stu_8"]),
    // multi-subject class (owner 2026-09-28): Math 15 min + Eng 30 min in one session, one summary — monthly bundle course
    { ...k("cl_combo6", "br_thl", "คณิต + อังกฤษ ป.6", "คณิต", ["ป.6"], "u_prae", "rm_3", 5, "16:00", 45, ["stu_6", "stu_14"], ["u_mint"]), subjects: ["คณิต", "อังกฤษ"], courseId: "co_bundle6", startDate: nextWeekday(addDays(monday, -84), 5) }, // running ~3 months, so the Bundle progress charts have a history
    // a Summer-only class: sessions only inside the period, gone from the calendar if Summer is switched off
    { ...k("cl_summer_eng", "br_thl", "Summer English Camp", "อังกฤษ", ["ป.5", "ป.6"], "u_mint", "rm_2", 1, "09:00", 120, ["stu_6", "stu_14"]), startDate: addDays(monday, 42), periodId: "sp_summer", courseId: "co_summer_eng" },
    ...branches.slice(2).flatMap((b, i) => [
      { ...k(`cl_${b.id}_m`, b.id, "คณิต ป.5", "คณิต", ["ป.5"], null, `${b.id}_r1`, ((i % 5) + 1) as Weekday, "16:00", 90, []), courseId: `co_${b.id}_m` },
      { ...k(`cl_${b.id}_e`, b.id, "อังกฤษ ป.6", "อังกฤษ", ["ป.6"], null, `${b.id}_r2`, 6, "10:00", 120, []), courseId: `co_${b.id}_e` },
    ]),
  ]

  const sessions: Session[] = classes.flatMap((c) => generateSessions(c, holidays, () => uid("se"), c.id === "cl_combo6" ? 22 : 10, c.periodId ? addDays(monday, 69) : undefined))
  // free-form reminders on the teacher-block class (owner 2026-09-30: "Math Book Lesson 1 Page 2-6")
  sessions.filter((x) => x.classId === "cl_block_dai").forEach((x, i) => {
    x.notes = { stu_10: `Math Book ป.5 เล่ม 2 · Lesson ${i + 1} หน้า ${i * 4 + 2}-${i * 4 + 6}`, stu_17: `ตะลุยโจทย์วิทย์ ชุด ${i + 1}` }
  })

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
  const clashB = one("คณิต", nowMin + 90, 60, "u_mint", "rm_3", ["stu_20", "stu_21"]) // the ONE demo clash: same teacher, same time
  const trial = one("คณิต", nowMin + 150, 60, "u_jo", "rm_3", ["stu_7"], [], true)
  // the app never lets a clash be created — so apart from clashA/B, every showcase session is fitted around the regular
  // classes of the day (another room / another teacher), otherwise the calendar looks like clashes are allowed (owner 2026-09-30)
  const span = (x: Session) => [toMinutes(x.start), toMinutes(x.start) + x.minutes] as const
  const overlap = (a: Session, b: Session) => a.date === b.date && span(a)[0] < span(b)[1] && span(b)[0] < span(a)[1]
  const staffOf = (x: Session) => [x.teacherId, ...x.coTeacherIds].filter(Boolean)
  const clashes = (x: Session, others: Session[]) => others.some((o) => overlap(x, o) && (o.roomId === x.roomId || staffOf(o).some((t) => staffOf(x).includes(t))))
  const fit = (x: Session) => {
    const others = sessions.filter((o) => o.date === x.date && !o.cancelled)
    for (const roomId of ["rm_1", "rm_2", "rm_3"].sort((r) => (r === x.roomId ? -1 : 1)))
      for (const teacherId of [x.teacherId, "u_jo", "u_dai", "u_prae", "u_mint"]) {
        const y = { ...x, roomId, teacherId, coTeacherIds: x.coTeacherIds.filter((t) => t !== teacherId) }
        if (!clashes(y, others)) return Object.assign(x, y)
        const solo = { ...y, coTeacherIds: [] }
        if (!clashes(solo, others)) return Object.assign(x, solo)
      }
    return null
  }
  const showcaseList: Session[] = []
  for (const x of [showDone, showSummary, showAttendance, showLive, clashA, trial]) if (fit(x)) { sessions.push(x); showcaseList.push(x) }
  // clashB may only collide with clashA (same teacher) — find it a room that nothing else uses
  if (showcaseList.includes(clashA)) {
    const others = sessions.filter((o) => o.date === today && !o.cancelled && o !== clashA)
    const room = ["rm_3", "rm_1", "rm_2"].find((r) => r !== clashA.roomId && !clashes({ ...clashB, roomId: r, teacherId: null, coTeacherIds: [] }, others) && !others.some((o) => overlap(o, clashB) && staffOf(o).includes("u_mint")))
    if (room) { clashB.roomId = room; sessions.push(clashB); showcaseList.push(clashB) }
  }

  const attendance: Attendance[] = []
  const summaries: LessonSummary[] = []
  const nowMs = now.getTime()
  // approver = the branch Manager at ทองหล่อ, the Director elsewhere (never the teacher who wrote it — D5)
  const approverOf = (se: Session) => (se.branchId === "br_thl" ? "u_ton" : "u_nock")
  const write = (se: Session, sid: string, status: LessonSummary["status"], at: number) => {
    const h = (hours: number) => new Date(at + hours * 3_600_000).toISOString()
    // submitted within the deadline most of the time; about one in six a day late (Teacher Health shows it)
    const submitH = (se.id.charCodeAt(se.id.length - 1) + sid.length) % 6 === 0 ? 30 : 2
    const by = approverOf(se)
    summaries.push({
      id: uid("sm"), sessionId: se.id, studentId: sid, authorId: se.teacherId!, lastEditorId: status === "changes_requested" ? by : se.teacherId!,
      // a Bundle class (several subjects in one session) writes one note naming each subject (owner 2026-10-14)
      text: (se.subjects?.length ?? 0) > 1 ? COMBO_NOTES[(se.date.charCodeAt(9) + sid.length) % COMBO_NOTES.length] : SESSION_NOTES[(se.date.charCodeAt(9) + sid.length + se.start.charCodeAt(1)) % SESSION_NOTES.length],
      // 1–5 understanding: drifts upward over the months with some ups and downs, so the progress chart has a story
      level: Math.max(1, Math.min(5, Math.round(2 + (1 - Math.min(1, (nowMs - at) / (120 * 86400000))) * 2 + (((se.id.charCodeAt(se.id.length - 1) + sid.charCodeAt(sid.length - 1)) % 3) - 1) * 0.6 + (sid.charCodeAt(sid.length - 1) % 2) * 0.4))),
      status, history: [
        { at: h(0), by: se.teacherId!, action: "write" },
        ...(status === "draft" ? [] : [{ at: h(submitH), by: se.teacherId!, action: "submit" as const }]),
        ...(status === "changes_requested" ? [{ at: h(submitH + 4), by, action: "request_changes" as const, note: "ช่วยเพิ่มว่าการบ้านครั้งหน้าคืออะไร" }] : []),
        ...(status === "approved" || status === "sent" ? [{ at: h(submitH + 4), by, action: "approve" as const }] : []),
        ...(status === "sent" ? [{ at: h(submitH + 5), by, action: "send" as const }] : []),
      ],
    })
  }
  const mark = (se: Session, sid: string, status: Attendance["status"], at: number) =>
    attendance.push({ sessionId: se.id, studentId: sid, status, markedBy: se.teacherId ?? "u_ploy", markedAt: new Date(at).toISOString() })

  const showcase = new Set(showcaseList.map((x) => x.id))
  // showcase states (only when they are actually in the past)
  const endOf = (se: Session) => new Date(`${se.date}T${se.start}:00`).getTime() + se.minutes * 60000
  if (showcase.has(showDone.id) && endOf(showDone) < nowMs) showDone.studentIds.forEach((sid) => { mark(showDone, sid, "present", endOf(showDone)); write(showDone, sid, "submitted", endOf(showDone)) })
  if (showcase.has(showSummary.id) && endOf(showSummary) < nowMs)
    showSummary.studentIds.forEach((sid, i) => { mark(showSummary, sid, i === 4 ? "leave" : "present", endOf(showSummary)); if (i < 2) write(showSummary, sid, "submitted", endOf(showSummary)) })

  // other past sessions: attendance + summaries like a normal history
  sessions.forEach((se) => {
    if (showcase.has(se.id)) return
    const end = endOf(se)
    if (end > nowMs) return
    se.studentIds.forEach((sid, i) => {
      const status = (i + se.date.charCodeAt(9)) % 7 === 0 ? "leave" : "present" // no "absent" any more (owner 2026-09-30): มา · ลา · ย้ายวัน
      mark(se, sid, status, end - 30 * 60000)
      // owner 2026-10-13: the week in view should hold every stage — sent ones included, not only last week's
      const age = (nowMs - end) / 86400000
      const cycle: LessonSummary["status"][] = ["draft", "submitted", "changes_requested", "approved", "sent", "sent", "sent"]
      if (status === "present" && se.teacherId) write(se, sid, age < 1 ? (i % 2 ? "submitted" : "draft") : age < 7 ? cycle[(i + se.date.charCodeAt(9)) % cycle.length] : "sent", end)
    })
  })

  const monthStart = today.slice(0, 8) + "01"
  const ent = (id: string, studentId: string, courseId: string, classId: string, kind: Entitlement["kind"], from: string, to: string, total: number): Entitlement =>
    ({ id, studentId, courseId, subjects: courses.find((c) => c.id === courseId)!.subjects, classIds: [classId], invoiceId: "inv_paid", kind, from, to, sessionsTotal: total })
  const entitlements: Entitlement[] = [
    ent("en_1", "stu_1", "co_math5", "cl_math5", "subscription", monthStart, addDays(monthStart, 60), 8),
    ent("en_2", "stu_3", "co_math5", "cl_math5", "subscription", monthStart, addDays(today, 5), 4),
    ent("en_3", "stu_4", "co_math5", "cl_math5", "subscription", monthStart, addDays(monthStart, 60), 8),
    // วิทย์ 12 ชม. at 2 h/session = 6 sessions per pack (hour packs are counted in sessions, owner 2026-09-30)
    ent("en_4", "stu_2", "co_sci", "cl_sci", "sessions", start, addDays(start, 120), 6),
    ent("en_5", "stu_5", "co_sci", "cl_sci", "sessions", start, addDays(start, 120), 12), // 2 packs
    ent("en_6", "stu_6", "co_eng", "cl_eng", "subscription", monthStart, addDays(monthStart, 29), 4),
    ent("en_7", "stu_1", "co_eng", "cl_eng", "subscription", monthStart, addDays(monthStart, 29), 4),
    ent("en_8", "stu_8", "co_ari", "cl_ari", "subscription", monthStart, addDays(monthStart, 29), 4),
  ]
  // everyone else enrolled in a class gets a package, except stu_24 (demo: "no package" warning)
  const courseFor: Record<string, string> = { คณิต: "co_math5", อังกฤษ: "co_eng", วิทย์: "co_sci" }
  classes.forEach((c) =>
    c.studentIds.forEach((sid, i) => {
      if (sid === "stu_24" || c.branchId !== "br_thl" || entitlements.some((e) => e.studentId === sid && e.classIds.includes(c.id))) return
      const hours = c.subject === "วิทย์"
      entitlements.push(ent(`en_auto_${c.id}_${sid}`, sid, c.grades.includes("ป.4") ? "co_math4" : courseFor[c.subject], c.id, hours ? "sessions" : "subscription", start, addDays(monthStart, i % 3 === 0 ? 36 : 60), hours ? 6 : 8))
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
    { id: "fam_ld3", name: "ครอบครัวสมใจ", nameEn: "Somjai Family", parents: [{ name: "คุณแม่พัชรา สมใจ", nameEn: "Mom Patchara Somjai", phone: "089-100-1003", lineLinked: false, primary: true }] },
    { id: "fam_ld4", name: "ครอบครัวฟิชเชอร์", parents: [{ name: "คุณแม่เลนา ฟิชเชอร์", phone: "089-100-1004", lineLinked: true, primary: true }] },
    { id: "fam_ld6", name: "ครอบครัวมั่งมี", parents: [{ name: "คุณแม่กิ่งแก้ว มั่งมี", phone: "089-100-1006", lineLinked: true, primary: true }] },
    { id: "fam_ld5", name: "ครอบครัวนากามูระ", parents: [{ name: "คุณพ่อเบน นากามูระ", phone: "089-100-1005", lineLinked: true, primary: true }] },
  )
  students.push(
    s("stu_ld3", "fam_ld3", "br_thl", "ด.ญ. พัช สมใจ", "พัช", "ป.5"),
    s("stu_ld4", "fam_ld4", "br_thl", "ด.ญ. เลโอนา ฟิชเชอร์", "เลโอนา", "ป.4"),
    s("stu_ld6", "fam_ld6", "br_thl", "ด.ช. กิ่ง มั่งมี", "กิ่ง", "ม.1"),
    s("stu_ld5", "fam_ld5", "br_thl", "ด.ช. เคนตะ นากามูระ", "เคนตะ", "ป.4"),
  )
  const ld3Date = addDays(today, 3)
  const ld6Date = addDays(today, 1)
  const ld4Date = addDays(today, -2)
  const se_ld3: Session = { id: "se_ld3test", branchId: "br_thl", classId: null, subject: "วิทย์", date: ld3Date, start: "10:00", minutes: 60, teacherId: "u_prae", coTeacherIds: [], roomId: "rm_2", studentIds: ["stu_ld3"], trial: true, assessment: "test", customized: true, cancelled: false }
  const se_ld6: Session = { id: "se_ld6trial", branchId: "br_thl", classId: null, subject: "คณิต", date: ld6Date, start: "10:00", minutes: 60, teacherId: "u_jo", coTeacherIds: [], roomId: "rm_3", studentIds: ["stu_ld6"], trial: true, assessment: "trial", customized: true, cancelled: false }
  const se_ld4: Session = { id: "se_ld4trial", branchId: "br_thl", classId: null, subject: "อังกฤษ", date: ld4Date, start: "14:00", minutes: 60, teacherId: "u_mint", coTeacherIds: [], roomId: "rm_1", studentIds: ["stu_ld4"], trial: true, assessment: "trial", customized: true, cancelled: false }
  // ld_5 (ปิดการขาย) went through test + trial last week
  const se_ld5t: Session = { ...se_ld4, id: "se_ld5test", date: addDays(today, -8), start: "11:00", studentIds: ["stu_ld5"], assessment: "test" }
  const se_ld5r: Session = { ...se_ld4, id: "se_ld5trial", date: addDays(today, -4), start: "16:00", studentIds: ["stu_ld5"], assessment: "trial" }
  // demo test/trial bookings also get a free room/teacher — the one demo clash stays the only one
  for (const x of [se_ld3, se_ld6, se_ld4, se_ld5t, se_ld5r]) if (fit(x)) sessions.push(x)

  const assessments: Assessment[] = [
    { id: "as_ld3", type: "test", leadId: "ld_3", studentId: "stu_ld3", sessionId: se_ld3.id, subject: "วิทย์", date: ld3Date, start: "10:00" },
    { id: "as_ld6", type: "trial", leadId: "ld_6", studentId: "stu_ld6", sessionId: se_ld6.id, subject: "คณิต", date: ld6Date, start: "10:00" },
    {
      id: "as_ld4", type: "trial", leadId: "ld_4", studentId: "stu_ld4", sessionId: se_ld4.id, subject: "อังกฤษ", date: ld4Date, start: "14:00",
      result: "เหมาะกับคลาสกลุ่ม ป.4", note: "ตั้งใจเรียนดี กล้าพูดภาษาอังกฤษ แนะนำเริ่มเรียนได้เลย", notedBy: "u_mint", notedAt: new Date(`${ld4Date}T15:00:00`).toISOString(),
    },
    // the tests before those trials (owner 2026-10-05: a later step shows the earlier steps' results)
    { id: "as_ld4t", type: "test", leadId: "ld_4", studentId: "stu_ld4", sessionId: se_ld4.id, subject: "อังกฤษ", date: addDays(ld4Date, -5), start: "10:00",
      result: "ระดับ ป.4 · 21/30", note: "ฟัง-พูดดี ไวยากรณ์ยังสับสน past tense", notedBy: "u_mint", notedAt: new Date(`${addDays(ld4Date, -5)}T11:00:00`).toISOString() },
    { id: "as_ld6t", type: "test", leadId: "ld_6", studentId: "stu_ld6", sessionId: se_ld6.id, subject: "คณิต", date: addDays(today, -4), start: "13:00",
      result: "ระดับ ม.1 · 14/25", note: "พื้นฐานเศษส่วนยังไม่แน่น แนะนำทดลองคลาสปรับพื้นฐาน", notedBy: "u_jo", notedAt: new Date(`${addDays(today, -4)}T14:30:00`).toISOString() },
  ]
  assessments.push(
    { id: "as_ld5t", type: "test", leadId: "ld_5", studentId: "stu_ld5", sessionId: se_ld5t.id, subject: "อังกฤษ", date: se_ld5t.date, start: se_ld5t.start,
      result: "ระดับ ป.4 · 24/30", note: "คำศัพท์ดีมาก ฟังจับใจความได้", notedBy: "u_mint", notedAt: new Date(`${se_ld5t.date}T12:00:00`).toISOString() },
    { id: "as_ld5r", type: "trial", leadId: "ld_5", studentId: "stu_ld5", sessionId: se_ld5r.id, subject: "อังกฤษ", date: se_ld5r.date, start: se_ld5r.start,
      result: "เข้ากลุ่ม ป.4 ได้", note: "กล้าตอบ เข้ากับเพื่อนในคลาสเร็ว", notedBy: "u_mint", notedAt: new Date(`${se_ld5r.date}T17:00:00`).toISOString() },
  )
  const l5 = leads.find((x) => x.id === "ld_5")
  if (l5) l5.trialStudentId = "stu_ld5"
  // contact step: the calls / LINE before the test (shown under "ติดต่อ" on later steps)
  const fu = (leadId: string, list: [number, "call" | "line", "talked" | "replied" | "no_answer", string][]) => {
    const l = leads.find((x) => x.id === leadId)
    if (l) l.followUps = list.map(([daysBack, channel, result, note], i) => ({ id: `fu_${leadId}_${i}`, at: iso(addDays(today, -daysBack)), by: l.assigneeId ?? "u_ploy", channel, result, note }))
  }
  fu("ld_3", [[2, "call", "no_answer", ""], [2, "line", "replied", "สนใจวิทย์ ป.5 ขอสอบวัดระดับก่อน"]])
  fu("ld_4", [[9, "call", "talked", "ลูกเรียนโรงเรียนนานาชาติ อยากเสริมอังกฤษ"]])
  fu("ld_6", [[6, "line", "replied", "อยากให้ลูกปรับพื้นฐานคณิต ม.1"]])
  fu("ld_5", [[12, "line", "replied", "ลูกย้ายมาจากญี่ปุ่น อยากเรียนอังกฤษเพิ่ม"]])

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
    msg("m_4a", "cv_4", "parent", null, "สวัสดีครับ อยากทราบว่ามีสาขาบางนาไหมครับ", 2, 10, 50),
    msg("m_4b", "cv_4", "staff", "u_ploy", "มีครับ อยู่สาขาบางนาเลยครับ ติดต่อได้ตามเบอร์สาขานะครับ", 2, 11, 0),
    // cv_5 — lead (ld_3), phone contact — no LINE yet
    msg("m_5a", "cv_5", "staff", "u_ton", "สวัสดีค่ะ โทรนัดสอบวัดระดับให้น้องพัชแล้วนะคะ", 1, 10, 25),
    msg("m_5b", "cv_5", "internal", "u_ton", "แม่สะดวกเช้าวันศุกร์ นัดไว้ 10:00 วิชาวิทย์แล้วค่ะ", 1, 10, 30),
  ]

  // yymmdd-business-branch-running, พ.ศ. 2 digits — same as nextInvoiceNumber (Liclass = 02, ทองหล่อ = 001)
  const docNo = (d: string, n: number) => `${String((Number(d.slice(0, 4)) + 543) % 100).padStart(2, "0")}${d.slice(5, 7)}${d.slice(8, 10)}-02-001-${String(n).padStart(4, "0")}`
  const invoices: Invoice[] = [
    {
      id: "inv_paid", branchId: "br_thl", studentId: "stu_1", number: docNo(monthStart, 1),
      lines: [{ id: "ln_1", courseId: "co_math5", classIds: ["cl_math5"], startDate: monthStart, periods: 1 }], bus: [], bookFee: 0, advance: [],
      concession: null, noteToParent: "ค่าเรียนคณิตเดือนนี้", status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: iso(monthStart),
      approvedBy: "u_nock", sentAt: iso(monthStart), delivery: "delivered", receiptNumber: docNo(monthStart, 1),
      payments: [{ id: "pay_1", amount: 4500, method: "transfer", reference: "KBank 1234", recordedBy: "u_ploy", recordedAt: iso(monthStart), confirmedBy: "u_nock" }],
    },
    {
      id: "inv_pending", branchId: "br_thl", studentId: "stu_3", number: docNo(today, 1),
      lines: [{ id: "ln_2", courseId: "co_math5", classIds: ["cl_math5"], startDate: addDays(today, 7), periods: 2 }], bus: [], bookFee: 350, advance: [],
      concession: null, noteToParent: "", status: "pending_approval", pdf: "ready", createdBy: "u_ploy", createdAt: iso(today), payments: [],
    },
    {
      id: "inv_draft", branchId: "br_thl", studentId: "stu_6", number: docNo(today, 2),
      lines: [{ id: "ln_3", courseId: "co_eng", classIds: ["cl_eng"], startDate: today, periods: 1 }], bus: [], bookFee: 0, advance: [],
      concession: { amount: 200, remark: "ลูกค้าเก่า ต่อคอร์สต่อเนื่อง" }, noteToParent: "", status: "draft", pdf: "none", createdBy: "u_ploy", createdAt: iso(today), payments: [],
    },
    // owner 2026-10-13: paid today, weeks before Summer starts — the invoice + receipt still print Summer's Memo
    {
      id: "inv_summer", branchId: "br_thl", studentId: "stu_14", number: docNo(today, 3),
      lines: [{ id: "ln_4", courseId: "co_summer_eng", classIds: ["cl_summer_eng"], startDate: addDays(monday, 42), periods: 1 }], bus: [], bookFee: 0, advance: [],
      concession: null, noteToParent: "ค่าเรียน Summer English Camp", status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: iso(today),
      approvedBy: "u_ton", sentAt: iso(today), delivery: "delivered", receiptNumber: docNo(today, 3),
      payments: [{ id: "pay_summer", amount: 8900, method: "transfer", reference: "SCB 5521", recordedBy: "u_ploy", recordedAt: iso(today), confirmedBy: "u_ton" }],
    },
  ]
  entitlements.push(ent("en_summer", "stu_14", "co_summer_eng", "cl_summer_eng", "subscription", addDays(monday, 42), addDays(monday, 69), 4))
  entitlements[entitlements.length - 1].invoiceId = "inv_summer"

  // books + topics teachers already typed (demo) — everyone in the branch picks from these
  const lessonBooks: LessonBook[] = [
    { id: "bk_m5", branchId: "br_thl", name: "Maths Challenge ป.5 เล่ม 1", createdBy: "u_dai", createdAt: iso(addDays(today, -40)) },
    { id: "bk_eng", branchId: "br_thl", name: "Active English Book 2", createdBy: "u_mint", createdAt: iso(addDays(today, -40)) },
  ]
  const lessonTopics: LessonTopic[] = [
    { id: "tp_1", bookId: "bk_m5", name: "บทที่ 1 เศษส่วน", createdBy: "u_dai", createdAt: iso(addDays(today, -40)) },
    { id: "tp_2", bookId: "bk_m5", name: "บทที่ 2 ทศนิยม", createdBy: "u_dai", createdAt: iso(addDays(today, -30)) },
    { id: "tp_3", bookId: "bk_m5", name: "บทที่ 3 ร้อยละ", createdBy: "u_dai", createdAt: iso(addDays(today, -20)) },
    { id: "tp_4", bookId: "bk_eng", name: "Unit 1 My Family", createdBy: "u_mint", createdAt: iso(addDays(today, -40)) },
    { id: "tp_5", bookId: "bk_eng", name: "Unit 2 At School", createdBy: "u_mint", createdAt: iso(addDays(today, -25)) },
  ]

  // extra bus days asked for after paying — waiting for ใบเตย's next invoice (demo)
  const busAddOns: BusAddOn[] = [
    { id: "ba_1", branchId: "br_thl", studentId: "stu_1", date: addDays(today, -3), pickup: false, dropoff: true, busFeeId: "fee_bus_std", amount: 150, note: "แม่ติดประชุม ขอส่งกลับบ้าน", createdBy: "u_ploy", createdAt: iso(addDays(today, -4)) },
    { id: "ba_2", branchId: "br_thl", studentId: "stu_1", date: addDays(today, 2), pickup: true, dropoff: true, busFeeId: "fee_bus_std", amount: 300, createdBy: "u_ploy", createdAt: iso(addDays(today, -1)) },
  ]

  // ---- 15 months of history for Reports (owner 2026-10-01) — real records, as if the system had been running:
  // students who joined, renewed, paused, left and came back; every paid invoice has its package. Deterministic.
  const history = buildHistory({ today, branches, courses, classes, families, students, invoices, entitlements, leads })
  const leaves: StudentLeave[] = history.leaves

  // the other branches get a teacher each and their current students in class, with the last two weeks of
  // attendance + summaries — so Attendance / Operations reports compare every branch (owner 2026-10-01)
  const TEACHER_NICK = ["ครูเอิร์น", "ครูบอส", "ครูแนน", "ครูเจ", "ครูปาล์ม", "ครูนุ่น", "ครูกอล์ฟ", "ครูเมย์", "ครูต้า", "ครูเบล"]
  branches.slice(2).forEach((b, i) => {
    const tid = `u_t_${b.id}`
    staff.push({ id: tid, name: TEACHER_NICK[i].replace("ครู", "") + " (ครู)", nickname: TEACHER_NICK[i], roles: ["teacher"], branchIds: [b.id], subjects: ["คณิต", "อังกฤษ"], active: true, canLogin: false, partTime: i % 4 === 3 })
    const current = students.filter((st) => st.branchId === b.id && entitlements.some((e) => e.studentId === st.id && e.from <= today && today <= e.to)).map((st) => st.id)
    const rosters: Record<string, string[]> = { [`cl_${b.id}_m`]: current.slice(0, 5), [`cl_${b.id}_e`]: current.slice(5, 9) }
    for (const k of classes.filter((x) => x.branchId === b.id)) {
      k.teacherId = tid
      k.studentIds = rosters[k.id] ?? []
      for (const se of sessions.filter((x) => x.classId === k.id)) {
        se.teacherId = tid
        se.studentIds = [...k.studentIds]
        const end = endOf(se)
        if (end > nowMs) continue
        se.studentIds.forEach((sid, j) => {
          // some branches see more leave than others
          const status = (j + se.date.charCodeAt(9) + i) % (4 + (i % 4)) === 0 ? "leave" : "present"
          mark(se, sid, status, end - 30 * 60000)
          if (status === "present") write(se, sid, nowMs - end < 86400000 ? "draft" : nowMs - end < 3 * 86400000 ? (j % 2 ? "submitted" : "sent") : "sent", end)
        })
      }
    }
  })

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
    subjectColors: { คณิต: "rose", อังกฤษ: "sky", วิทย์: "emerald" },
    company: {
      nameTh: "บริษัท ลิคลาส เอ็ดดูเคชั่น จำกัด", nameEn: "Liclass Education Co.,Ltd.",
      addressTh: "53/30-31 ม.3 ต.บ้านสวน อ.เมืองชลบุรี จ.ชลบุรี 20000", addressEn: "53/30-31 Moo3, Ban Suan, Mueang, Chonburi 20000",
      taxId: "0205557003965", office: "สำนักงานใหญ่ / Head Office",
    },
    invoiceMemos: {
      nockacademy: "กรุณาชำระภายใน 5 วันหลังได้รับใบแจ้งหนี้ · โอนแล้วส่งสลิปทาง LINE OA",
      liclass: "",
    },
    competitors: ["ติวเตอร์ที่บ้าน", "สถาบันใกล้โรงเรียน", "เรียนออนไลน์"],
    survey: { from: "09-15", to: "10-15" },
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

  const { surveyCampaigns, surveyResponses } = buildSurveys({ today, branches, families, students, entitlements, classes, staff })
  assignSchools(students, branches)

  // owner 2026-10-12: names without titles (ด.ช. / คุณแม่ …), parent relationship as its own field, phones as plain digits
  students.forEach((x, i) => { students[i] = cleanStudent(x) })
  families.forEach((f, i) => { families[i] = { ...f, parents: f.parents.map(cleanParent) } })
  leads.forEach((l, i) => { leads[i] = { ...l, name: splitParentTitle(l.name).name, phone: formatPhone(l.phone) } })

  // owner 2026-10-13: more Bundle examples for Course Summary — a few ทองหล่อ students whose คณิต + อังกฤษ month
  // just ended or ends this week (one per stage in buildCourseSummaries)
  students.filter((st) => st.branchId === "br_thl" && st.grade === "ป.6" && !["stu_6", "stu_14"].includes(st.id) && !entitlements.some((e) => e.studentId === st.id && e.courseId === "co_bundle6")).slice(0, 6).forEach((st, i) => {
    const to = addDays(today, [-9, -6, -4, -2, 1, 4][i])
    // three back-to-back months = one Course Summary round (~12 sessions to chart)
    for (const m of [2, 1, 0]) entitlements.push(ent(`en_bundle_demo_${i}${m ? `_${m}` : ""}`, st.id, "co_bundle6", "cl_combo6", "subscription", addDays(to, -29 - 30 * m), addDays(to, -30 * m), 4))
    // owner 2026-10-14: they sit in the class that month — check-ins, notes per subject and a 1–5 understanding with a
    // different story each (getting better / slipping / steady / up and down) so the Course Summary charts show it
    const story = [[2, 2, 2, 3, 3, 3, 4, 3, 4, 4, 5, 5], [4, 4, 4, 3, 4, 3, 3, 2, 3, 2, 2, 2], [3, 4, 3, 3, 4, 3, 4, 3, 4, 4, 3, 4], [1, 2, 2, 3, 2, 3, 4, 3, 4, 4, 5, 5], [3, 3, 4, 3, 4, 4, 4, 5, 4, 5, 5, 5], [2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4]][i]
    sessions.filter((se) => se.classId === "cl_combo6" && !se.cancelled && se.date >= addDays(to, -89) && se.date <= to && endOf(se) < nowMs)
      .sort((x, y) => x.date.localeCompare(y.date)).forEach((se, n) => {
        if (!se.studentIds.includes(st.id)) se.studentIds = [...se.studentIds, st.id]
        const leave = i === 1 ? n % 3 === 2 : n === 5
        mark(se, st.id, leave ? "leave" : "present", endOf(se) - 30 * 60000)
        if (leave) return
        write(se, st.id, (nowMs - endOf(se)) / 86400000 < 1 ? "draft" : "sent", endOf(se))
        // คณิต follows the story, อังกฤษ its own (a step behind, then catching up) — each subject has its own chart
        const math = story[Math.min(n, story.length - 1)]
        const eng = Math.max(1, Math.min(5, story[Math.max(0, Math.min(n, story.length - 1) - 2)] + ((n + i) % 3 === 0 ? 1 : 0)))
        Object.assign(summaries[summaries.length - 1], { subjectLevels: { คณิต: math, อังกฤษ: eng }, level: Math.round((math + eng) / 2) })
      })
  })
  const courseSummaries = buildCourseSummaries({ today, now, courses, classes, entitlements })

  // owner 2026-10-14 ("แสดงให้มันสมบูรณ์ … จะได้เห็นข้อมูลทั้งหมด"): every finished course that has a Course Summary
  // gets its session history — weekly sessions with check-ins, a note per session and a 1–5 understanding that tells a
  // story — so its panel shows real charts (sessions up to yesterday; rounds already holding 3+ notes are left as they are).
  const csRounds = entitlementRounds(entitlements).filter((r) => r.from < today && courseSummaries.some((c) => c.entitlementId === r.representativeId))
  csRounds.forEach((r, ri) => {
    const course = courses.find((c) => c.id === r.courseId)
    const stu = students.find((x) => x.id === r.studentId)
    if (!course || !stu) return
    const ents = entitlements.filter((e) => r.entitlementIds.includes(e.id))
    // notes already on record for THIS course (another subject the same months doesn't count)
    const has = summaries.filter((m) => m.studentId === r.studentId && sessions.some((se) => se.id === m.sessionId && se.studentIds.includes(r.studentId) && ents.some((e) => packageCovers(e, se)))).length
    if (has >= 3) return
    const cap = ents.every((e) => e.kind === "sessions") ? ents.reduce((n, e) => n + e.sessionsTotal, 0) : 16
    const weeks: string[] = []
    for (let d = r.from; d <= r.to && d < today && weeks.length < 40; d = addDays(d, 7)) weeks.push(d)
    // up to 8 sessions — enough for the charts while the whole demo still fits a phone's browser storage
    const dates = weeks.slice(-Math.min(cap, 8))
    const teacher = courseSummaries.find((c) => c.entitlementId === r.representativeId)?.authorId ?? "u_dai"
    const combo = course.subjects.length > 1
    // a different shape per course: steady climb, slow start, dip then recovery, already strong
    const shapes = [[2, 2, 3, 3, 3, 4, 4, 4, 5], [1, 2, 2, 2, 3, 3, 4, 4, 4], [3, 3, 2, 2, 3, 4, 4, 5, 5], [4, 4, 4, 5, 4, 5, 5, 5, 5]]
    const shape = shapes[ri % shapes.length]
    const at = (n: number) => shape[Math.min(shape.length - 1, Math.floor((n / Math.max(1, dates.length - 1)) * (shape.length - 1)))]
    dates.forEach((date, n) => {
      const se: Session = { id: uid("se"), branchId: stu.branchId, classId: null, subject: course.subjects[0], ...(combo ? { subjects: course.subjects } : {}), date, start: "16:00", minutes: 60,
        teacherId: teacher, coTeacherIds: [], roomId: null, studentIds: [stu.id], trial: false, customized: false, cancelled: false }
      sessions.push(se)
      const end = new Date(`${date}T17:00:00`).getTime()
      const leave = (n + ri) % 7 === 3
      mark(se, stu.id, leave ? "leave" : "present", end - 30 * 60000)
      if (leave) return
      write(se, stu.id, "sent", end)
      const sm = summaries[summaries.length - 1]
      const lv = Math.max(1, Math.min(5, at(n) + ((n * 7 + ri) % 5 === 0 ? -1 : 0)))
      if (combo) {
        const other = Math.max(1, Math.min(5, at(Math.max(0, n - 2)) + ((n + ri) % 4 === 0 ? 1 : 0)))
        Object.assign(sm, { subjectLevels: { [course.subjects[0]]: lv, [course.subjects[1]]: other }, level: Math.round((lv + other) / 2) })
      } else sm.level = lv
    })
  })

  // owner 2026-10-13: Nock's bank — answered questions are knowledge (with 👍/👎), plus some Nock answered and some waiting
  const ago = (h: number) => new Date(now.getTime() - h * 3_600_000).toISOString()
  const nockQuestions: NockQuestion[] = [
    { id: "nq_2", at: ago(5), askedBy: "u_ploy", roles: ["admin", "teacher"], branchId: "br_thl", locations: ["billing"], question: "ผู้ปกครองโอนเงินเกิน ต้องคืนส่วนต่างยังไง", status: "unanswered" },
    { id: "nq_4", at: ago(30), askedBy: "u_t_br_ari", roles: ["teacher"], branchId: "br_ari", locations: ["sessions", "summaries"], question: "เช็คชื่อผิดคน แก้ได้ไหม", aiAnswer: "เช็คชื่อ: คาบเรียน & เช็คชื่อ › กดคาบ → กด มา / ลา ของนักเรียนแต่ละคน (บันทึกทันที)", aiSource: "guide", links: [{ label: "คาบเรียน & เช็คชื่อ", href: "/sessions" }], status: "unanswered", helpful: false, aiVotesUp: [], aiVotesDown: ["u_t_br_ari"] },
    { id: "nq_3", at: ago(26), askedBy: "u_ploy", roles: ["admin", "teacher"], branchId: "br_thl", locations: ["settings"], question: "อยากเพิ่มวิชาภาษาจีน ต้องทำยังไง", aiAnswer: "เพิ่มวิชาใหม่ — สิทธิ์ของคุณ (Admin, Teacher) ทำเองไม่ได้ ต้องให้ Super Admin, Director เป็นคนทำ", aiSource: "guide", links: [{ label: "Settings › วิชา", href: "/settings?view=system&sys=subjects" }], status: "ai", helpful: true, aiVotesUp: ["u_ploy", "u_ton"], aiVotesDown: [] },
    { id: "nq_5", at: ago(50), askedBy: "u_dai", roles: ["teacher"], branchId: "br_thl", locations: ["sessions"], question: "นักเรียนมาสายครึ่งคาบ ต้องเช็คว่ามาหรือขาด", aiAnswer: "นักเรียนมาสาย: เช็คเป็น มา และเขียนในสรุปการเรียนว่ามาสายกี่นาที (ระบบไม่มีสถานะ มาสาย แยก) · ถ้าลาทั้งคาบให้เช็ค ลา", aiSource: "knowledge", fromKnowledgeId: "nq_6", fromAnswerId: "na_6", status: "ai", helpful: true, aiVotesUp: ["u_dai"], aiVotesDown: [] },
    { id: "nq_6", at: ago(120), askedBy: "u_mint", roles: ["teacher"], branchId: "br_thl", locations: ["sessions", "summaries"], question: "นักเรียนมาสาย ต้องเช็คชื่อยังไง", status: "answered", answers: [{ id: "na_6", by: "u_ton", at: ago(110), text: "นักเรียนมาสาย: เช็คเป็น มา และเขียนในสรุปการเรียนว่ามาสายกี่นาที (ระบบไม่มีสถานะ มาสาย แยก) · ถ้าลาทั้งคาบให้เช็ค ลา", audience: [], votesUp: ["u_dai", "u_mint", "u_ploy"], votesDown: [] }] },
    { id: "nq_1", at: ago(80), askedBy: "u_dai", roles: ["teacher"], branchId: "br_thl", locations: ["classes", "calendar"], question: "ผู้ปกครองขอเปลี่ยนวันเรียนถาวร ต้องทำยังไง", status: "answered", answers: [
      { id: "na_1a", by: "u_ton", at: ago(72), text: "เปิด Panel คลาสเดิม › เอานักเรียนออกจากคลาส แล้วเพิ่มเข้าคลาสวันใหม่ (Panel คลาส › เพิ่มนักเรียน) · ถ้าย้ายแค่ครั้งเดียวใช้ ย้ายคาบ (Re-schedule) ในคาบนั้นแทน · แพ็กเกจเดิมใช้ต่อได้ ไม่ต้องออกใบใหม่", audience: [], votesUp: ["u_dai", "u_ploy"], votesDown: ["u_mint"] },
      // a second person's answer — thumbs decide which one Nock uses
      { id: "na_1b", by: "u_nock", at: ago(60), text: "ย้ายคลาสถาวร: แจ้งแอดมินให้ย้ายในหน้าคลาส แล้วแจ้งผู้ปกครองทาง LINE ว่าเริ่มวันไหน", audience: [], votesUp: ["u_mint"], votesDown: ["u_dai"] },
    ] },
    { id: "nq_7", at: ago(200), askedBy: "u_nock", roles: ["director"], branchId: "br_thl", locations: ["billing", "reports"], question: "ส่วนลดพิเศษ (Concession) ให้ได้สูงสุดเท่าไหร่", status: "answered", manual: true, answers: [{ id: "na_7", by: "u_nock", at: ago(200), text: "ไม่มีเพดานในระบบ แต่ต้องใส่เหตุผลทุกครั้ง และใบที่มีส่วนลดต้องให้อีกคนอนุมัติ · นโยบายบริษัท: เกิน 10% ต้องขอ Director ก่อน", audience: ["super_admin", "director", "area_manager", "manager"], votesUp: ["u_ton"], votesDown: [] }] },
  ]

  // owner 2026-10-13: sample "screenshots" so the image preview has something to show (SVG data URLs)
  const shot = (title: string, line: string, tone: string) => `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500"><rect width="800" height="500" fill="#f4f4f5"/><rect x="40" y="40" width="720" height="420" rx="24" fill="#fff" stroke="#e4e4e7"/><text x="80" y="110" font-family="sans-serif" font-size="30" font-weight="bold" fill="#18181b">${title}</text><rect x="80" y="150" width="640" height="56" rx="14" fill="${tone}"/><text x="104" y="186" font-family="sans-serif" font-size="22" fill="#18181b">${line}</text><rect x="80" y="240" width="420" height="16" rx="8" fill="#e4e4e7"/><rect x="80" y="276" width="560" height="16" rx="8" fill="#e4e4e7"/><rect x="80" y="312" width="360" height="16" rx="8" fill="#e4e4e7"/></svg>`)}`

  // owner 2026-10-13: เรื่องถึง Dev — one in each stage
  const devTickets: DevTicket[] = [
    { id: "dv_1", number: "DEV-0001", at: ago(4), by: "u_ploy", roles: ["admin", "teacher"], branchId: "br_thl", kind: "bug", title: "กดสร้าง PDF ใบแจ้งหนี้แล้วหมุนค้าง", detail: "ใบ INV ของน้องใบเตย กดสร้าง PDF แล้วขึ้น กำลังสร้าง… ค้างไป 10 นาที ลองใหม่ก็เหมือนเดิม", locations: ["billing"], pageUrl: "/billing?open=inv_pending", status: "new", thread: [],
      images: [shot("ใบแจ้งหนี้ INV-0001", "กำลังสร้าง PDF… (ค้าง 10 นาที)", "#fef3c7"), shot("ลองกดอีกครั้ง", "กำลังสร้าง PDF… (เหมือนเดิม)", "#fee2e2")] },
    { id: "dv_2", number: "DEV-0002", at: ago(30), by: "u_dai", roles: ["teacher"], branchId: "br_thl", kind: "idea", title: "อยากให้เช็คชื่อทั้งคาบได้ในปุ่มเดียว", detail: "คาบที่มาครบทุกคน อยากมีปุ่ม มาทุกคน จะได้ไม่ต้องกดทีละคน", locations: ["sessions"], pageUrl: "/sessions", status: "in_progress",
      thread: [{ id: "dm_1", by: "u_dev", at: ago(26), text: "ไอเดียดีครับ รับเรื่องแล้ว — เก็บไว้ทำหลังเรื่องด่วน", status: "on_hold" }, { id: "dm_2", by: "u_dev", at: ago(20), text: "กำลังทำ คาดว่าเสร็จสัปดาห์หน้า", status: "in_progress" }] },
    { id: "dv_3", number: "DEV-0003", at: ago(75), by: "u_ton", roles: ["manager"], branchId: "br_thl", kind: "help", title: "Export รายชื่อนักเรียนเป็น Excel ไม่ได้", detail: "กด Export แล้วไม่มีไฟล์ลงมา", locations: ["students"], pageUrl: "/students", status: "done",
      thread: [{ id: "dm_3", by: "u_dev", at: ago(70), text: "Safari บล็อกการดาวน์โหลด — แก้ให้ใช้ได้ทุกเบราว์เซอร์แล้ว ลองใหม่ได้เลยครับ", status: "done" }, { id: "dm_4", by: "u_ton", at: ago(68), text: "ได้แล้ว ขอบคุณครับ" }] },
    // owner 2026-10-13: examples of คำถามถึง Dev — some from นก (Director) so they show in the owner's own view
    { id: "dv_4", number: "DEV-0004", at: ago(52), by: "u_nock", roles: ["director"], branchId: "br_thl", kind: "question", title: "ข้อมูลในระบบ backup ทุกวันไหม ถ้าเครื่องเสียข้อมูลหายหรือเปล่า", detail: "อยากรู้ว่าข้อมูลนักเรียน ใบแจ้งหนี้ ถูกสำรองไว้ที่ไหน บ่อยแค่ไหน และกู้คืนได้ย้อนหลังกี่วัน", locations: ["other"], pageUrl: "/", status: "done",
      thread: [{ id: "dm_5", by: "u_dev", at: ago(48), text: "สำรองอัตโนมัติทุกคืนตี 2 เก็บย้อนหลัง 30 วัน (เก็บคนละที่กับเซิร์ฟเวอร์หลัก) · เครื่องที่ใช้งานเสียข้อมูลไม่หาย เพราะข้อมูลอยู่บนเซิร์ฟเวอร์ · ขอกู้คืนได้ที่เรื่องถึง Dev", status: "done" }, { id: "dm_6", by: "u_nock", at: ago(47), text: "เข้าใจแล้ว ขอบคุณครับ" }] },
    { id: "dv_5", number: "DEV-0005", at: ago(20), by: "u_ploy", roles: ["admin", "teacher"], branchId: "br_thl", kind: "question", title: "ส่งใบแจ้งหนี้ทาง LINE ได้กี่ใบต่อวัน มีลิมิตไหม", detail: "ต้นเดือนต้องส่งใบแจ้งหนี้ 200 กว่าใบ กลัวโดน LINE บล็อก", locations: ["billing", "inbox"], pageUrl: "/billing", status: "in_progress",
      thread: [{ id: "dm_7", by: "u_dev", at: ago(18), text: "รับเรื่องแล้วครับ กำลังเช็คแพ็กเกจ LINE OA ของสาขา จะตอบภายในวันนี้", status: "in_progress" }] },
    { id: "dv_6", number: "DEV-0006", at: ago(3), by: "u_nock", roles: ["director"], branchId: "br_thl", kind: "question", title: "ดึงข้อมูลรายได้ไปทำรายงานใน Google Sheets ได้ไหม", detail: "บัญชีอยากได้ข้อมูลรายได้รายวันใน Google Sheets อัตโนมัติ ไม่ต้อง export เอง", locations: ["reports", "billing"], pageUrl: "/reports", status: "new", thread: [],
      images: [shot("Google Sheets ที่บัญชีใช้อยู่", "วันที่ · สาขา · รายได้ · จำนวนใบ", "#dcfce7")] },
    { id: "dv_7", number: "DEV-0007", at: ago(150), by: "u_nock", roles: ["director"], branchId: "br_thl", kind: "idea", title: "ให้ผู้ปกครองจ่ายเงินผ่านบัตรเครดิตในระบบ", detail: "ผู้ปกครองหลายคนอยากจ่ายด้วยบัตร", locations: ["billing"], pageUrl: "/billing", status: "wont_do",
      thread: [{ id: "dm_8", by: "u_dev", at: ago(140), text: "ตอนนี้ยังไม่ทำ — ต้องสมัคร Payment Gateway และมีค่าธรรมเนียม 2.5–3.5% ต่อรายการ ขอให้ฝ่ายบัญชีตัดสินใจเรื่องค่าธรรมเนียมก่อน แล้วค่อยเปิดเรื่องใหม่", status: "wont_do" }] },
  ]

  return { branches, staff, holidays, courses, classes, sessions, attendance, summaries, courseSummaries, nockQuestions, devTickets, families, students, entitlements, leaves, invoices, busAddOns, creditNotes: [] as CreditNote[], lessonBooks, lessonTopics, leads, conversations, messages, notifications: [], system, notes, logs, assessments, surveyCampaigns, surveyResponses }
}

/** Demo history for Reports: ~130 past/current students over the last 15 months with monthly / hour-pack invoices. */
/** Per-subject wording for Course Summaries — a Bundle writes one paragraph per subject (owner 2026-10-13). */
const CS_TEXT: Record<string, { progress: string; improve: string; strength: string }> = {
  คณิต: { progress: "คณิต: เข้าใจเศษส่วนและทศนิยมดีขึ้นชัดเจน ทำแบบทดสอบท้ายบทได้ 85%", improve: "คณิต: ทดเลขสะเพร่า ควรตรวจคำตอบทุกครั้ง", strength: "คณิต: วิเคราะห์โจทย์ปัญหาได้เอง" },
  อังกฤษ: { progress: "อังกฤษ: คำศัพท์เพิ่มขึ้นมาก อ่านออกเสียงชัด กล้าพูดในห้อง", improve: "อังกฤษ: Grammar เรื่อง Past simple ยังสลับ", strength: "อังกฤษ: ฟังจับใจความเก่ง" },
  วิทย์: { progress: "วิทย์: เข้าใจเรื่องแรงและการเคลื่อนที่ ทำการทดลองตามขั้นตอนได้", improve: "วิทย์: สรุปผลการทดลองยังสั้นไป", strength: "วิทย์: ช่างสังเกต ถามคำถามดี" },
}
const csText = (subjects: string[]) => {
  const parts = subjects.map((x) => CS_TEXT[x] ?? CS_TEXT["คณิต"])
  return { overallProgress: parts.map((x) => x.progress).join("\n"), toImprove: parts.map((x) => x.improve).join("\n"), strengths: parts.map((x) => x.strength).join("\n") }
}

/**
 * Course Summaries (owner 2026-10-13: "show examples, Single and Bundle"): rounds that ended long ago were sent;
 * the ones due now walk every stage — not written yet, draft, waiting approval, sent back, approved, sent —
 * separately for Single and Bundle courses so each kind shows every state.
 */
function buildCourseSummaries(db: { today: string; now: Date; courses: Course[]; classes: Klass[]; entitlements: Entitlement[] }): CourseSummary[] {
  const out: CourseSummary[] = []
  const due = addDays(db.today, 7)
  const STAGES: (CourseSummary["status"] | null)[] = [null, "submitted", "sent", "changes_requested", "approved", "draft", "submitted", "sent"]
  const seen = new Map<string, number>()
  const rounds = entitlementRounds(db.entitlements).sort((a, b) => a.to.localeCompare(b.to) || a.studentId.localeCompare(b.studentId))
  for (const r of rounds) {
    if (r.to > due) continue
    const course = db.courses.find((c) => c.id === r.courseId)
    if (!course) continue
    const ent = db.entitlements.find((e) => e.id === r.representativeId)
    const klass = db.classes.find((k) => ent?.classIds.includes(k.id)) ?? db.classes.find((k) => k.courseId === course.id)
    const teacher = klass?.teacherId ?? "u_dai"
    const approver = course.branchId === "br_thl" ? "u_ton" : "u_nock"
    const old = r.to < addDays(db.today, -14)
    // walk the stages per branch and per kind, so every branch shows every stage for Single and for Bundle
    const key = `${course.branchId}:${course.kind}`
    const n = seen.get(key) ?? 0
    seen.set(key, n + 1)
    const status = old ? "sent" : STAGES[n % STAGES.length]
    if (!status) continue
    // packages still running were written a little before now — never in the future
    const base = Math.min(new Date(`${r.to}T18:00:00`).getTime(), db.now.getTime() - 26 * 3_600_000)
    const at = (d: number) => new Date(base + d * 3_600_000).toISOString()
    const history: CourseSummary["history"] = [{ at: at(0), by: teacher, action: "write" }]
    if (status !== "draft") history.push({ at: at(2), by: teacher, action: "submit" })
    if (status === "changes_requested") history.push({ at: at(20), by: approver, action: "request_changes", note: "เพิ่มตัวอย่างงานที่ทำได้ดีหน่อย" })
    if (status === "approved" || status === "sent") history.push({ at: at(20), by: approver, action: "approve" })
    if (status === "sent") history.push({ at: at(21), by: approver, action: "send" })
    out.push({ id: `cs_${r.representativeId}`, entitlementId: r.representativeId, studentId: r.studentId, ...csText(course.subjects), status, authorId: teacher, lastEditorId: status === "changes_requested" ? approver : teacher, history })
  }
  return out
}

function buildHistory(db: { today: string; branches: Branch[]; courses: Course[]; classes: Klass[]; families: Family[]; students: Student[]; invoices: Invoice[]; entitlements: Entitlement[]; leads: Lead[] }) {
  let seed = 20261001
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const NICK = ["มิว", "ปุณ", "ต้นข้าว", "ขนุน", "พีช", "ฟ้า", "ใบข้าว", "นะโม", "ภูริ", "กาย", "แพรว", "มีน", "ไข่มุก", "ทอฟฟี่", "ปิงปอง", "จูน", "ข้าวปั้น", "ซอล", "โอบอุ้ม", "ชิน"]
  const PARENT_FIRST = ["สุภาพร", "วิไลวรรณ", "ธนพล", "อรุณี", "กนกวรรณ", "สมศักดิ์", "ปิยะนุช", "จิราพร", "ณัฐวุฒิ", "รัตนา", "ศิริพร", "ประเสริฐ"]
  const SN = ["วงศ์", "ศรี", "สาย", "บุญ", "แสง", "ชื่น", "นาค", "พรหม", "ทอง", "แก้ว"].flatMap((a) => ["ใหญ่", "ทอง", "สุข", "มี", "ดาว", "ใจ", "ดี", "มา", "งาม", "ชัย"].map((b) => a + b))
  const leaves: StudentLeave[] = []
  const iso = (d: string, h = 10) => new Date(`${d}T${String(h).padStart(2, "0")}:00:00`).toISOString()
  const startAt = addDays(db.today, -456)
  let running = 5000
  const classFor = (c: Course) => db.classes.find((k) => k.branchId === c.branchId && k.courseId === c.id)
    ?? db.classes.find((k) => k.branchId === c.branchId && k.active && !k.periodId && k.kind === "learning" && c.subjects.includes(k.subject) && (!k.grades.length || k.grades.some((g) => c.grades.includes(g))))
    ?? db.classes.find((k) => k.branchId === c.branchId && k.active && !k.periodId && k.kind === "learning" && c.subjects.includes(k.subject))
  for (let i = 0; i < 420; i++) {
    // ทองหล่อ is the biggest; the other branches share the rest, bigger ones first
    const branch = rnd() < 0.2 ? db.branches[0] : db.branches[1 + Math.floor(Math.pow(rnd(), 1.6) * (db.branches.length - 1))]
    const options = db.courses.filter((c) => c.branchId === branch.id && c.active && classFor(c))
    if (!options.length) continue
    // what families buy: about half monthly, 4 in 10 hour packs (24 / 48 h most), the rest weekly
    const r0 = rnd()
    const unit = r0 < 0.5 ? "month" : r0 < 0.9 ? "hour" : "week"
    const ofUnit = options.filter((c) => c.unit === unit)
    const weight = (c: Course) => (c.unit !== "hour" ? 1 : ({ 12: 3, 24: 4, 48: 3, 72: 1.5, 96: 1 } as Record<number, number>)[c.duration] ?? 1)
    const pool = ofUnit.length ? ofUnit : options
    let w = rnd() * pool.reduce((a, c) => a + weight(c), 0)
    const course = pool.find((c) => (w -= weight(c)) <= 0) ?? pool[0]
    const klass = classFor(course)!
    const grade = pick(course.grades)
    const joined = addDays(startAt, Math.floor(rnd() * 440))
    // about a quarter are siblings of the previous child (never more than 2 per family)
    const sib = i > 0 && rnd() < 0.25 ? db.students[db.students.length - 1] : undefined
    const familyId = sib?.branchId === branch.id && sib.familyId?.startsWith("fa_h") && db.students.filter((x) => x.familyId === sib.familyId).length < 2 ? sib.familyId : `fa_h${i}`
    const surname = familyId === `fa_h${i}` ? SN[(i * 37) % SN.length] : db.students[db.students.length - 1].name.split(" ").pop()!
    if (familyId === `fa_h${i}`) db.families.push({ id: familyId, name: `ครอบครัว${surname}`, parents: [{ name: `${PARENT_FIRST[i % PARENT_FIRST.length]} ${surname}`, relationship: (["แม่", "แม่", "พ่อ", "ผู้ปกครอง", "แม่", "ญาติ"] as const)[i % 6], phone: `08${i % 10}-700-${String(1000 + i)}`, lineLinked: rnd() < 0.7, primary: true }] })
    const nick = pick(NICK)
    const sid = `stu_h${i}`
    // the lead this student came from (CRM report): a few days to a few weeks before the first payment
    const SOURCES: Lead["source"][] = ["line", "line", "line", "facebook", "facebook", "referral", "referral", "walkin", "website", "phone"]
    const leadAt = addDays(joined, -(3 + Math.floor(rnd() * 25)))
    db.leads.push({ id: `ld_h${i}`, branchId: branch.id, name: `ผู้ปกครองน้อง${nick}`, childGrade: grade, subject: course.subjects[0], source: pick(SOURCES), stage: "enrolled", assigneeId: "u_ploy",
      phone: `08${i % 10}-700-${String(1000 + i)}`, lineId: "", createdAt: iso(leadAt), notes: [], convertedStudentId: sid })
    // …and leads that never became students, stopped somewhere along the way
    for (let j = 0; j < (rnd() < 0.5 ? 1 : 2); j++) {
      const stops: Lead["stage"][] = ["new", "contacting", "contacting", "test_scheduled", "tested", "tested", "trialed", "trialed", "payment_pending"]
      const from = pick(stops)
      const at = addDays(leadAt, Math.floor(rnd() * 60) - 30)
      if (at > db.today) continue
      const open = addDays(at, 21) > db.today // recent ones are still in the pipeline
      // follow-ups: early leads were chased by phone / LINE and never answered; later ones talked at least once
      const early = from === "new" || from === "contacting"
      const followUps = Array.from({ length: early ? 1 + Math.floor(rnd() * 3) : Math.floor(rnd() * 2) + 1 }, (_, k) => {
        const channel: "call" | "line" = rnd() < 0.5 ? "call" : "line"
        const reached = !early && k === 0
        return { id: `fu_x${i}_${j}_${k}`, at: iso(addDays(at, 2 + k * 3), 15), by: "u_ploy", channel,
          result: (reached ? (channel === "call" ? "talked" : "replied") : channel === "call" ? "no_answer" : "no_reply") as "talked" | "replied" | "no_answer" | "no_reply" }
      })
      const reasonId = early ? pick(["lr_unreachable", "lr_no_reply", "lr_unreachable", "lr_not_interested"]) : pick(["lr_price", "lr_price", "lr_schedule", "lr_schedule", "lr_travel", "lr_competitor", "lr_results", "lr_child", "lr_not_ready", "lr_no_course"])
      const competitor = reasonId === "lr_competitor" ? pick(["ติวเตอร์ที่บ้าน", "สถาบันใกล้โรงเรียน", "เรียนออนไลน์", "ไม่ทราบ"]) : undefined
      const closedAt = addDays(at, 14)
      db.leads.push({ id: `ld_x${i}_${j}`, branchId: branch.id, name: `ผู้ปกครอง ${pick(SN)}`, childGrade: grade, subject: course.subjects[0], source: pick(["facebook", "facebook", "website", "line", "walkin", "phone", "other"] as Lead["source"][]),
        stage: open ? from : "archived", archivedFrom: open ? undefined : from, archiveReason: open ? undefined : reasonLabel(reasonId, undefined),
        lost: open ? undefined : { stage: from, reasonId, otherReasonIds: [], competitor, wantedTime: reasonId === "lr_schedule" ? pick(["เสาร์เช้า 9–11", "หลังเลิกเรียน 17:30–19:00", "อาทิตย์บ่าย"]) : undefined, at: iso(closedAt, 16), by: "u_ploy",
          followUpOn: reasonId === "lr_not_ready" || reasonId === "lr_schedule" ? addDays(closedAt, 90) : undefined },
        followUps: followUps.filter((f) => f.at <= iso(open ? db.today : closedAt, 23)),
        assigneeId: "u_ploy", phone: `09${j}-800-${String(1000 + i)}`, lineId: "", createdAt: iso(at), notes: [], convertedStudentId: null })
    }
    db.students.push({ id: sid, familyId, branchId: branch.id, name: `ด.${i % 2 ? "ช" : "ญ"}. ${nick} ${surname}`, nickname: nick, grade, usesBus: false, createdBranchId: branch.id, createdAt: iso(joined) })
    // one package after another; each renewal 86% likely, sometimes a 6–12 week break and back
    // a 2-hour class a week: a 24-hour pack lasts 12 weeks
    const len = course.unit === "month" ? 30 : course.unit === "week" ? course.duration * 7 : Math.round(course.duration * 3.5)
    let at = joined
    for (let k = 0; k < 24 && at <= db.today; k++) {
      const paidOn = addDays(at, Math.floor(rnd() * 3))
      if (paidOn > db.today) break
      const id = `inv_h${i}_${k}`
      const n = ++running
      const no = `${String((Number(paidOn.slice(0, 4)) + 543) % 100).padStart(2, "0")}${paidOn.slice(5, 7)}${paidOn.slice(8, 10)}-${branch.brand === "liclass" ? "02" : "01"}-${branch.branchNo}-${n}`
      db.invoices.push({
        id, branchId: branch.id, studentId: sid, number: no, lines: [{ id: `ln_h${i}_${k}`, courseId: course.id, classIds: [klass.id], startDate: at, periods: 1 }],
        bus: [], bookFee: k === 0 && rnd() < 0.4 ? 350 : 0, advance: [], concession: rnd() < 0.1 ? { amount: 200, remark: "ส่วนลดพี่น้อง" } : null,
        noteToParent: "", status: "paid", pdf: "ready", createdBy: "u_ploy", createdAt: iso(addDays(at, -2)), approvedBy: "u_nock", sentAt: iso(addDays(at, -2)), delivery: "delivered",
        receiptNumber: no, payments: [{ id: `pay_h${i}_${k}`, amount: 0, method: "transfer", reference: "", recordedBy: "u_ploy", recordedAt: iso(paidOn, 11), confirmedBy: "u_nock" }],
      })
      db.entitlements.push({ id: `en_h${i}_${k}`, studentId: sid, courseId: course.id, subjects: course.subjects, classIds: [], invoiceId: id, kind: course.unit === "hour" ? "sessions" : "subscription", from: at, to: addDays(at, len - 1), sessionsTotal: course.unit === "hour" ? 6 : 4 })
      if (rnd() < 0.05) leaves.push({ id: `lv_h${i}_${k}`, studentId: sid, from: addDays(at, 7), to: addDays(at, 35), reason: "ไปต่างประเทศกับครอบครัว", createdBy: "u_ploy", createdAt: iso(at) })
      const r = rnd()
      if (r < 0.09) break
      at = r < 0.14 ? addDays(at, len + 42 + Math.floor(rnd() * 42)) : addDays(at, len)
    }
  }
  // students who stopped (last package ended > 30 days ago): most went through the exit form (owner 2026-10-05)
  const EXIT_REASONS = ["lr_schedule", "lr_schedule", "lr_price", "lr_price", "lr_moved", "lr_travel", "lr_competitor", "lr_results", "lr_child", "lr_goal_met", "lr_goal_met", "lr_teacher"]
  for (const st of db.students.filter((x) => x.id.startsWith("stu_h"))) {
    const end = db.entitlements.filter((e) => e.studentId === st.id).map((e) => e.to).sort().at(-1)
    if (!end || addDays(end, 30) > db.today || rnd() > 0.6) continue
    const reasonId = pick(EXIT_REASONS)
    const replied = rnd() < 0.75
    const happy = !["lr_teacher", "lr_results", "lr_price"].includes(reasonId)
    const score = () => (rnd() < 0.15 ? null : Math.max(1, Math.min(5, Math.round((happy ? 4.2 : 3) + (rnd() - 0.5) * 2))))
    const comeBack = reasonId === "lr_goal_met" || reasonId === "lr_moved" ? "no" : pick(["yes", "maybe", "maybe", "no"] as const)
    const closedAt = iso(addDays(end, 3), 14)
    st.exit = {
      status: "closed", lastDate: end, sentAt: iso(addDays(end, -5)), sentBy: "u_ploy", reasonId, otherReasonIds: rnd() < 0.3 ? [pick(EXIT_REASONS)].filter((x) => x !== reasonId) : [],
      noReply: !replied, money: "none", closedAt, closedBy: "u_ploy",
      answers: replied ? {
        reasonId, otherReasonIds: [], scores: { teacher: score(), content: score(), admin: score(), value: score() }, comeBack,
        comeBackMonth: comeBack !== "no" && rnd() < 0.6 ? addDays(end, 60 + Math.floor(rnd() * 120)).slice(0, 7) : undefined,
        nps: rnd() < 0.1 ? null : Math.max(0, Math.min(10, Math.round((happy ? 8 : 5.5) + (rnd() - 0.5) * 5))),
        comment: rnd() < 0.3 ? pick(["ครูใจดี ลูกชอบมาก", "อยากให้มีเวลาเรียนวันเสาร์มากกว่านี้", "ค่าเรียนสูงไปนิด", "ขอบคุณที่ดูแลมาตลอดค่ะ"]) : "",
        contactOk: rnd() < 0.8, lang: pick(["th", "th", "th", "en", "ja"] as const),
      } : undefined,
    }
    st.archived = { at: closedAt, by: "u_ploy", reason: reasonLabel(reasonId, undefined) }
  }

  // payments = the invoice total (the same quote every page uses)
  for (const inv of db.invoices) if (inv.id.startsWith("inv_h")) {
    const branch = db.branches.find((b) => b.id === inv.branchId)!
    inv.payments[0].amount = invoiceTotals(inv, { branch, courses: db.courses, classes: db.classes, holidays: [] }).total
  }
  return { leaves }
}

/** Two years of the parent survey (owner 2026-10-05): last year's finished, this year's in progress. Deterministic. */
/**
 * Sample schools (owner 2026-10-07: Reports shows which schools our students come from) — by the branch's
 * province, weighted so a few schools dominate like real catchments; ~1 in 10 left blank (not asked yet).
 * Uses a hash of the id, not the seeded random, so the rest of the demo data stays exactly the same.
 */
// real schools from the Ministry list (public/data/schools-bkk-cbr.json) — id = Ministry school code; repeats = weight
const SCHOOLS: Record<string, [string, string][]> = {
  BKK: [
    ["1110100025", "เซนต์คาเบรียล"], ["1110100025", "เซนต์คาเบรียล"],
    ["1410391101", "โรงเรียนสาธิตมหาวิทยาลัยศรีนครินทรวิโรฒ ประสานมิตร (ฝ่ายประถม)"], ["1410391101", "โรงเรียนสาธิตมหาวิทยาลัยศรีนครินทรวิโรฒ ประสานมิตร (ฝ่ายประถม)"],
    ["1110100111", "มาแตร์เดอีวิทยาลัย"], ["1110100048", "อัสสัมชัญ"], ["1110100030", "ราชินีบน"], ["1110700070", "บางกอกพัฒนา"],
    ["1410071101", "โรงเรียนสาธิตจุฬาลงกรณ์มหาวิทยาลัย (ฝ่ายประถม)"], ["1110700024", "ร่วมฤดีวิเทศศึกษา"], ["1010720146", "เตรียมอุดมศึกษาน้อมเกล้า"],
    ["1110100682", "สารสาสน์ธนบุรี"], ["1110700091", "นานาชาติรีเจ้นท์-พระราม 9"],
  ],
  CBR: [
    ["1120100082", "อัสสัมชัญศรีราชา"], ["1120100082", "อัสสัมชัญศรีราชา"], ["1120100074", "ดาราสมุทร"], ["1120100074", "ดาราสมุทร"],
    ["1020080310", "ชลกันยานุกูล"], ["1020080309", "ชลราษฎรอำรุง"], ["1120100084", "เซนต์ปอลคอนแวนต์"],
    ["1420011101", "โรงเรียนสาธิต \"พิบูลบำเพ็ญ\" มหาวิทยาลัยบูรพา"], ["1020080001", "อนุบาลชลบุรี"], ["1120100161", "มารีวิทย์บ่อวิน"],
  ],
}
function assignSchools(students: Student[], branches: Branch[]) {
  const hash = (x: string) => [...x].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  for (const st of students) {
    if (st.school) continue
    const h = hash(st.id)
    if (h % 10 === 0) continue
    const list = SCHOOLS[branches.find((b) => b.id === st.branchId)?.province === "CBR" ? "CBR" : "BKK"]
    const [id, name] = list[h % list.length]
    st.schoolId = id
    st.school = name
  }
}

function buildSurveys(db: { today: string; branches: Branch[]; families: Family[]; students: Student[]; entitlements: Entitlement[]; classes: Klass[]; staff: Staff[] }) {
  let seed = 4242
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648 }
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)]
  const year = Number(db.today.slice(0, 4))
  const campaigns: SurveyCampaign[] = [], responses: SurveyResponse[] = []
  for (const y of [year - 1, year]) {
    const from = `${y}-09-15`, to = `${y}-10-15`
    if (from > db.today) continue
    const id = `sv_${y}`
    const active = (sid: string) => db.entitlements.some((e) => e.studentId === sid && e.from <= from && from <= e.to)
    const fams = db.families.filter((f) => db.students.some((s) => s.familyId === f.id && active(s.id)))
    const recipients = fams.map((f) => ({ familyId: f.id, branchId: db.students.find((s) => s.familyId === f.id)!.branchId, token: `ps_seed_${y}_${f.id}`, viaLine: f.parents.some((p) => p.lineLinked) }))
    campaigns.push({ id, year: y, from, to, sentAt: `${from}T09:00:00.000Z`, sentBy: "u_nock", recipients, remindedAt: y < year ? `${y}-09-22T09:00:00.000Z` : undefined })
    const share = y < year ? 0.68 : 0.5
    for (const r of recipients) {
      if (rnd() > share) continue
      const kids = db.students.filter((s) => s.familyId === r.familyId && active(s.id))
      const branchMood = (db.branches.findIndex((b) => b.id === r.branchId) % 4) * 0.15 // some branches score a bit lower
      const base = 4.3 - branchMood + (y === year ? 0.1 : 0)
      const sc = (bias = 0) => (rnd() < 0.08 ? null : Math.max(1, Math.min(5, Math.round(base + bias + (rnd() - 0.5) * 2))))
      const nps = Math.max(0, Math.min(10, Math.round(8.3 - branchMood * 3 + (y === year ? 0.4 : 0) + (rnd() - 0.55) * 5)))
      const teachers: Record<string, string[]> = {}
      kids.forEach((k) => { teachers[k.id] = [...new Set(db.classes.filter((c) => c.studentIds.includes(k.id) && c.teacherId).map((c) => c.teacherId!))] })
      const day = Math.floor(rnd() * (y < year ? 25 : 18))
      const submitted = `${y}-09-${String(15 + Math.min(day, 15)).padStart(2, "0")}T${String(9 + Math.floor(rnd() * 10)).padStart(2, "0")}:00:00.000Z`
      if (submitted.slice(0, 10) > db.today) continue
      const cont = nps <= 4 ? pick(["no", "maybe"] as const) : nps <= 6 ? pick(["maybe", "yes"] as const) : "yes"
      responses.push({
        id: `svr_${y}_${r.familyId}`, token: r.token, campaignId: id, year: y, familyId: r.familyId, branchId: r.branchId, teachers, submittedAt: submitted,
        answers: {
          nps, overall: sc(), continueNext: cont,
          children: kids.map((k) => ({ studentId: k.id, teacher: sc(0.2), progress: sc(-0.1), level: sc() })),
          service: { admin: sc(0.1), summary: sc(-0.3), schedule: sc(-0.4), place: sc(0.1), bus: kids.some((k) => k.usesBus) ? sc(-0.2) : null, value: sc(-0.5) },
          wants: rnd() < 0.5 ? [pick(["วิทย์", "อังกฤษ", "คณิต", "เสาร์เช้า", "อาทิตย์", "เย็นวันธรรมดา"])] : [],
          praise: rnd() < 0.3 ? pick(["ครูใส่ใจลูกมาก", "ลูกชอบมาเรียน เกรดดีขึ้นชัดเจน", "แอดมินตอบไว", "สรุปการเรียนละเอียดดีค่ะ"]) : "",
          improve: rnd() < 0.3 ? pick(["อยากให้มีเวลาเรียนวันอาทิตย์", "ที่จอดรถน้อย", "ค่าเรียนขึ้นบ่อย", "อยากได้การบ้านเพิ่ม"]) : "",
          lang: pick(["th", "th", "th", "en", "ja"] as const),
        },
        // last year's unhappy families were all called; this year's some are still waiting
        followUp: nps <= 6 && (y < year || rnd() < 0.4) ? { at: `${submitted.slice(0, 10)}T15:00:00.000Z`, by: "u_ton", note: pick(["โทรคุยแล้ว ปรับเวลาเรียนให้", "คุณแม่ขอบคุณที่โทรมา จะลองต่ออีกเทอม", "แจ้งผู้จัดการสาขาแล้ว"]) } : undefined,
      })
    }
  }
  return { surveyCampaigns: campaigns, surveyResponses: responses }
}
