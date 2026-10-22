// Core domain model for NockERP v2.
// Dates are local calendar strings ("YYYY-MM-DD"), times are "HH:mm" (branch local time).

export type ID = string
export type DateStr = string
export type TimeStr = string

export type Brand = "nockacademy" | "liclass"
/** driver (owner 2026-10-19, Transport): drives a school van — no ERP access, uses the driver app */
export type Role = "super_admin" | "director" | "area_manager" | "manager" | "admin" | "teacher" | "developer" | "driver"
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

export interface OpenHours {
  open: TimeStr
  close: TimeStr
}

export interface Room {
  id: ID
  name: string
}

/** Date-range override of the weekly hours (e.g. summer hours, exam week) */
export interface SpecialPeriod {
  id: ID
  name: string
  from: DateStr
  to: DateStr
  hours: Record<Weekday, OpenHours | null>
  /** inactive = kept for next year but ignored now (no effect on hours) */
  active: boolean
  /** when active periods overlap, the higher priority decides the hours that day */
  priority: PeriodPriority
  /** the period's own class blocks per weekday (only while it is active) — unset day = the normal blocks */
  blocks?: DayBlocks
  /** "this day only" changes made inside the period — gone with the period */
  blockDays?: Record<DateStr, ClassBlock[]>
  /** regular classes stop during the period (owner 2026-10-01: default = they keep going) */
  pauseRegular?: boolean
  /** why regular classes stop (owner 2026-10-09): "school" = NockAcademy / Liclass closes them itself → every
   *  student's package runs one class longer per paused session · "other" = no extension. Unset = "school". */
  pauseCause?: "school" | "other"
  /** owner 2026-10-13: Memo printed on the invoice + receipt of this period's courses only (replaces the brand memo) */
  invoiceMemo?: string
}

/** One row of the teacher board, e.g. 13:00–15:00 (owner 2026-10-01: each branch sets its own, per weekday) */
export interface ClassBlock {
  start: TimeStr
  end: TimeStr
}

export type DayBlocks = Partial<Record<Weekday, ClassBlock[]>>

export type PeriodPriority = "high" | "medium" | "low"

/** Settings → General Fees (staging): flat fees Create Invoice charges outside course packages.
 *  bus = per leg (pickup / drop-off counted separately) · entry & mock = one-off "Advance Optional" add-ons.
 *  A category can hold several priced types (e.g. bus "Standard" / "Far zone"). */
export type FeeKind = "bus" | "entry" | "mock"

export interface Fee {
  id: ID
  kind: FeeKind
  name: string
  price: number
  /** bus types only (owner 2026-10-16): the type covers homes up to this many km from the branch — the invoice
   *  suggests the first type that covers the family's pin; past the largest = outside the bus area */
  maxKm?: number
}

/** A bus run (Liclass, owner 2026-10-16): pickup runs bring students in before class, drop-off runs take them home
 *  after — set per weekday with a seat count, so the invoice can say "this day has a run / it's full". */
export interface BusRound {
  id: ID
  /** both (owner 2026-10-19): one trip that takes home the children whose class ended, then brings the next class in */
  kind: "pickup" | "dropoff" | "both"
  weekdays: Weekday[]
  /** pickup: arrives at the branch by · drop-off: leaves the branch at */
  time: TimeStr
  seats: number
  name?: string
  /** owner 2026-10-19 (Transport): the van that runs it */
  vehicleId?: ID
}

export type BusLegKind = "pickup" | "dropoff"

/** A bus zone (owner 2026-10-19, from v1 "สายเหนือ → คัน 1 · สายใต้ → คัน 2"): homes whose direction from the branch is
 *  between `from` and `to` (degrees clockwise from north; may wrap past 360) ride this zone's van when several vans
 *  leave at the same time. A family can be put in another zone by hand. */
export interface BusZone {
  id: ID
  name: string
  /** SUBJECT_PALETTE-like key for the dot colour */
  color: string
  from: number
  to: number
  vehicleId?: ID
}

/** A school van (owner 2026-10-19, Transport — from v1 Bus Route): the driver is who the day's trip sheet goes to. */
export interface Vehicle {
  id: ID
  name: string
  plate: string
  seats: number
  /** the usual driver (a Staff with the driver role) — owner 2026-10-19 */
  driverId?: ID
  /** older / fallback when no driver is linked */
  driverName: string
  driverPhone: string
  active: boolean
}

/**
 * One run on one day (owner 2026-10-19). Who rides is never stored — it comes from invoices, extra / cancelled rides
 * and parents riding along. Only what the admin decided for that day is kept: the stop order, children moved to
 * another run, a stand-in van, and when it was sent to the driver (with what was sent, to spot later changes).
 */
export interface BusTrip {
  /** `${roundId}|${date}` */
  id: string
  branchId: ID
  roundId: ID
  date: DateStr
  order?: ID[]
  /** children put on this run by hand (instead of the run the system picked) */
  pinned?: ID[]
  vehicleId?: ID | null
  sentAt?: string
  sentBy?: ID
  sentKey?: string
  /** owner 2026-10-19 ("สร้าง แก้ไข ลบ ปรับเปลี่ยน ยกเลิก"): this run doesn't go that day — its children need another run */
  cancelled?: { reason: string; by: ID; at: string }
  /** the run leaves at another time that day */
  time?: TimeStr
  /** a one-off run on that day only (field trip, exam day …) — not in the weekly runs */
  extra?: { kind: BusRound["kind"]; time: TimeStr; seats: number; vehicleId?: ID; name?: string }
  /** another driver that day (owner 2026-10-19: "พี่เบ้งอาจจะลากลับบ้าน" — staff or an outside driver) */
  driverId?: ID | null
  /** owner 2026-10-19 ("Admin manual set time ที่คิวของเด็กๆ หรือการออกรถได้เสมอ"): the van leaves at this time that day
   *  (set by hand — the stops after it are timed from here) */
  departAt?: TimeStr
  /** a child's stop time set by hand, by stop key (`studentId|leg`) — the stops after it follow on from it */
  stopTimes?: Record<string, TimeStr>
  /** real times typed in by the admin (no app / the driver forgot) — they win over what the driver app sent */
  actuals?: { start?: TimeStr; finish?: TimeStr; stops?: Record<string, { in?: TimeStr; out?: TimeStr; noshow?: boolean }> }
}

/** Package duration unit (Settings → Packages tabs: Hour / Week / Month). */
export type PriceUnit = "hour" | "week" | "month"

/** One cell of the branch price chart: subject × grade × duration → suggested price.
 *  Reference only (owner 2026-09-26) — it pre-fills Create Course, the real price lives on the Course. */
export interface PriceRow {
  unit: PriceUnit
  /** hours for "hour", weeks for "week", always 1 for "month" (price per month) */
  duration: number
  subject: string
  grade: string
  price: number
}

export interface Promotion {
  id: ID
  name: string
  type: "pct" | "amount"
  value: number
  /** which package type it discounts, and the minimum duration bought (hours / weeks / months) */
  unit: PriceUnit
  minDuration: number
  active: boolean
  from?: DateStr
  to?: DateStr
}

export interface Branch {
  id: ID
  code: string
  name: string
  /** English name (owner 2026-10-07) — shown when the UI is English / Japanese; empty = standard spelling of the place */
  nameEn?: string
  brand: Brand
  /** 3-digit branch number in document numbers (690930-01-001-0001) */
  branchNo: string
  /** province code shown next to the branch name (owner 2026-09-30: "Sukhumvit · BKK") — BKK = Bangkok, CBR = Chonburi, more later */
  province: string
  /** inactive branches disappear from the branch switcher and cannot take new work */
  active: boolean
  email?: string
  address?: string
  phones: string[]
  socials: string[]
  rooms: Room[]
  /** null = closed that weekday */
  hours: Record<Weekday, OpenHours | null>
  specialPeriods: SpecialPeriod[]
  subjects: string[]
  grades: string[]
  defaultSessionMinutes: number
  /** class blocks per weekday, versioned — "this day and every week after" adds a plan from that date, so earlier
   *  weeks keep what they had (owner 2026-10-01). The latest plan starting on/before a date applies. */
  blockPlans?: { from: DateStr; byDay: DayBlocks }[]
  /** "this day only" changes on normal days */
  blockDays?: Record<DateStr, ClassBlock[]>
  /** fallback bus price per leg when no bus fee type is set in General Fees */
  busFeePerLeg: number
  /** the branch's own pin — bus distances are measured from here (owner 2026-10-16) */
  location?: { lat: number; lng: number }
  busRounds?: BusRound[]
  vehicles?: Vehicle[]
  /** areas around the branch (owner 2026-10-19): each a slice by direction, served by one van */
  busZones?: BusZone[]
  /** send each trip to its driver by itself 60 min before it leaves, when it has no warnings (owner 2026-10-19) */
  busAutoSend?: boolean
  fees: Fee[]
  promotions: Promotion[]
  /** Settings → Packages: offered durations per unit + the price chart */
  packageDurations: { hour: number[]; week: number[] }
  /** leave quota per package (owner 2026-10-09) — key = duration (month: 1). Unset = the default rule
   *  (`defaultLeaveQuota`: 1 session = 2 hrs, 4 sessions = 1 leave). 0 = no leave allowed. */
  leaveQuotas?: Partial<Record<PriceUnit, Record<number, number>>>
  priceChart: PriceRow[]
  bankAccount: { bank: string; branchName: string; name: string; number: string }
  /** legacy simple flag — kept so existing "delivered via LINE" simulation logic still works; set from the server-side /api/line/status check */
  lineOaConnected: boolean
  /** owner 2026-10-15: this branch uses Nock (the AI helper) — unset = on; Settings › System can turn it off everywhere */
  aiHelper?: boolean
  /** the branch's public enroll-now link for the LINE Rich Menu (owner 2026-10-05) — refreshed when courses change */
  enrollLink?: { token: string; url: string; updatedAt: string }
  /** owner 2026-10-22: the branch's course catalog link (LINE Rich Menu + sent from Inbox) — one link, data refreshed on send */
  catalogLink?: { token: string; url: string; updatedAt: string }
  /** non-secret LINE identity — safe to keep in client state. The actual Channel Secret / Access Token live server-side only (.env.local), never here. */
  lineOa: LineOaConfig
}

export interface LineOaConfig {
  channelId: string
  /** e.g. "@123abcde" — shown to staff so they can find/QR the account, not used by the API itself */
  botBasicId: string
  /** short "lin.ee/..." add-friend link — printed on invoices/receipts for parents to scan/tap */
  addFriendUrl: string
  /** QR code image for the add-friend link, stored as a data URL (no file storage in this prototype) */
  qrImageDataUrl?: string
}

export type NotifyKey =
  | "renewal" | "new_lead" | "payslip" | "holiday_conflict" | "summary_deadline"
  | "student_added" | "starting_soon" | "invoice_sent" | "receipt_sent" | "summary_sent"

/** Settings → System (brand-wide, Director only): global catalogs + preferences. */
export interface SystemConfig {
  /** global subject catalog — branches pick from it; renaming updates every record */
  subjects: string[]
  /** how the parent form shows each subject in English / Japanese (Thai = the subject itself) */
  subjectNames?: Record<string, { en?: string; ja?: string; /** short code, e.g. En / Ma (owner 2026-10-15) — empty = the standard one */ abbr?: string }>
  /** owner 2026-10-12: the colour picked for each subject in Settings → System (key of the subject palette) */
  subjectColors?: Record<string, string>
  /** one default invoice memo per brand, inherited by every branch of that brand */
  invoiceMemos: Record<Brand, string>
  /** language = system default AND the parent form's default (parents can still switch TH/EN/JP on the form) */
  preferences: { language: FormLang; timezone: string; currency: string; dateFormat: "th-short" | "iso" }
  settings: SystemSettings
  /** the company every invoice / receipt is issued by (Liclass Education = parent company, owner 2026-09-30) */
  company: CompanyInfo
  /** why customers stop — one list for lost leads AND students who leave (owner 2026-10-05), editable in Settings */
  lossReasons?: LossReason[]
  /** where customers went instead — grows as admins type new ones */
  competitors?: string[]
  /** yearly parent survey window, e.g. 15 Sep – 15 Oct (owner 2026-10-05) — "MM-DD" */
  survey?: { from: string; to: string }
  /** owner 2026-10-15: turn Nock (the AI helper bubble) on / off for everyone — unset = on */
  aiHelper?: boolean
}

/** One reason a lead stopped / a student left. `for` = which form shows it; `contactOnly` = a lead we never got to
 *  talk to (couldn't reach / no reply). Labels in TH/EN/JP — the parent's exit form is in three languages. */
export interface LossReason {
  id: ID
  label: string
  en?: string
  ja?: string
  for: "both" | "lead" | "student"
  contactOnly?: boolean
  active: boolean
}

export interface CompanyInfo {
  nameTh: string
  nameEn: string
  addressTh: string
  addressEn: string
  taxId: string
  /** "สำนักงานใหญ่" / "Head Office" */
  office: string
}

export interface SystemSettings {
  notify: Record<NotifyKey, { inApp: boolean; line: boolean }>
  /** session packs: alert when remaining ≤ this */
  lowSessionThreshold: number
  /** subscriptions: alert this many days before expiry */
  renewalDaysBefore: number
  /** teachers must submit summaries within N hours after class */
  summaryDeadlineHours: number
}

export interface Staff {
  id: ID
  name: string
  nickname: string
  /** name in English (owner 2026-10-09) — optional; NockAcademy = TH + EN, Liclass = JP + EN. Empty = auto romanized */
  nameEn?: string
  /** nickname in English (optional, owner 2026-10-09) */
  nicknameEn?: string
  roles: Role[]
  branchIds: ID[]
  subjects: string[]
  active: boolean
  canLogin: boolean
  email?: string
  /** part-time teacher — offered as a substitute when a teacher is on leave (owner 2026-09-30) */
  partTime?: boolean
  /** profile photo (owner 2026-10-12) — small JPEG data URL in the prototype; unset = initial on a coloured circle */
  photo?: string
  /** what this person does at each branch (owner 2026-10-09): e.g. Bangna = Teacher (Eng, Math) Mon–Wed, Paradise =
   *  Admin + Teacher (Science) Thu–Fri. Branch roles follow the branch picked in the top bar; Director / Super Admin /
   *  Area Manager stay company-wide in `roles`. Unset (older records) = `roles` / `subjects` everywhere in `branchIds`.
   *  `roles`, `branchIds` and `subjects` are kept as the union of these so older code keeps working. */
  assignments?: StaffAssignment[]
  /** Area / Region Manager (owner 2026-10-09): the branches they look after. Director / Super Admin need none — they
   *  see every branch. Unset on an older Area Manager record = every branch (as before). */
  areaBranchIds?: ID[]
  /** notes about this person, newest first (owner 2026-10-09: Staff panel › Note) */
  notes?: { id: ID; at: string; by: ID; text: string }[]
  /** owner 2026-10-19 (drivers): phone, an outside driver hired for the day (not on staff), and the secret in their app link */
  phone?: string
  vendor?: boolean
  driverToken?: string
}

export interface StaffAssignment {
  branchId: ID
  /** branch roles only: manager / admin / teacher */
  roles: Role[]
  subjects: string[]
  /** days they work at this branch — empty = any day */
  weekdays: Weekday[]
}

/** traditional / company = set by the company in Settings → System (branchId null) · branch = created by that branch's Admin/Manager */
export type HolidayCategory = "traditional" | "company" | "branch"

export interface Holiday {
  id: ID
  branchId: ID | null // null = company-wide (from System)
  date: DateStr
  name: string
  category: HolidayCategory
  /** company-wide holidays only: branches that decided to stay OPEN that day (per-branch toggle off) */
  openBranchIds?: ID[]
}

export type CourseKind = "single" | "bundle"

/** Create Course (staging): Single = one subject, Bundle = several · package type + duration from
 *  Settings → Packages · price pre-filled from the branch price chart (reason required when changed) ·
 *  optional course fee charged on every purchase · optional start→end window · Active.
 *  Teachers are NOT on the course — they are set per Class (owner 2026-09-28). */
export interface Course {
  id: ID
  branchId: ID
  name: string
  kind: CourseKind
  /** เรียนเดี่ยว / กลุ่ม — each branch decides which course types it offers; the admin picks per the parent's need
   *  (owner 2026-09-30). Invoice class options only list classes of the same type. */
  format: ClassType
  subjects: string[]
  grades: string[]
  /** hour = buy N hours, used up by real session length · week = N weeks from the start date, any number of sessions ·
   *  month = calendar month (1st → end of month), any number of sessions */
  unit: PriceUnit
  /** hours for "hour", weeks for "week", 1 for "month" */
  duration: number
  /** price of one package (one month / one N-hour pack / one N-week pack) */
  price: number
  /** required when the price differs from the branch chart (or the chart has no price) */
  priceReason?: string
  /** optional equipment fee, charged on top of the price on every purchase */
  courseFee: number
  from?: DateStr
  to?: DateStr
  active: boolean
  /** owner 2026-10-13: most students one class of this course may hold — unset = the class type's default (CAPACITY) */
  maxStudents?: number
  /** owner 2026-10-13: a course made for a special period (e.g. Summer) — its invoices + receipts print that period's Memo */
  periodId?: ID
}

export type ClassKind = "learning" | "test" | "interview" | "other"
export type ClassType = "group" | "single"
export type ClassLayout = "teacher" | "subject"

export interface Klass {
  id: ID
  branchId: ID
  name: string
  /** primary subject — colour, filters, teacher matching */
  subject: string
  /** all subjects taught in one session (e.g. Math 15 min + Eng 30 min → one summary). Monthly packages only.
   *  Unset = just `subject`. */
  subjects?: string[]
  grades: string[]
  kind: ClassKind
  type: ClassType
  /** optional link to the course this class delivers (tells which package a session draws from) */
  courseId: ID | null
  /** primary teacher (responsible for attendance + summaries) */
  teacherId: ID | null
  /** additional teachers / assistants */
  coTeacherIds: ID[]
  roomId: ID | null
  weekday: Weekday
  start: TimeStr
  minutes: number
  startDate: DateStr
  active: boolean
  studentIds: ID[]
  /** students who attend only part of this class every time (standing arrangement) */
  seats?: Record<ID, Seat>
  /** how the class is laid out (owner 2026-09-30) — "teacher" = a teacher's 2-hour block: any subject the teacher
   *  teaches, any grade, students on different courses/books side by side · "subject" = one subject + grades (default).
   *  Both are used by both brands; either way a student can be put in any class — mismatches only warn. */
  layout?: ClassLayout
  /** a special-period class (owner 2026-10-01): sessions only inside the period, hidden while the period is inactive */
  periodId?: ID
}

export interface Session {
  id: ID
  branchId: ID
  classId: ID | null
  /** primary subject */
  subject: string
  /** every subject taught in this session (multi-subject class); unset = just `subject` */
  subjects?: string[]
  date: DateStr
  start: TimeStr
  minutes: number
  /** primary teacher */
  teacherId: ID | null
  coTeacherIds: ID[]
  roomId: ID | null
  studentIds: ID[]
  /** no package used — test/trial or other free session */
  trial: boolean
  /** set on a session booked from a Test/Trial form so it reads "สอบวัดระดับ" or "ทดลองเรียน", never mixed up */
  assessment?: FormType
  /** this session only: students who attend just part of it (planned — "today only the first hour") */
  seats?: Record<ID, Seat>
  /** students moved INTO this session from another one in the same week (Re-schedule) */
  rescheduledIn?: ID[]
  /** students moved OUT of this session — kept so the row can say where they went */
  rescheduledOut?: { studentId: ID; toSessionId: ID }[]
  /** last change made to this session by someone (owner 2026-10-01: its teachers see a red dot until they open it) */
  changed?: { at: string; by: ID; what: string }
  /** when each person last opened this session — the red dot is gone for them once seen */
  seenBy?: Record<ID, string>
  /** free-form reminder per student for this session, e.g. "Math Book Lesson 1 Page 2-6" (owner 2026-09-30) */
  notes?: Record<ID, string>
  /** edited individually — class-level edits no longer overwrite it */
  customized: boolean
  cancelled: boolean
  cancelReason?: string
  /** sits out because of a special period (its class belongs to an inactive/removed period, or regular classes pause
   *  during the period) — comes back by itself when the period changes back */
  pausedBy?: ID
  /** paused by a period the school chose (pauseCause "school") — the students' packages run one class longer */
  pausedSchool?: boolean
  /** the teacher is on leave (owner 2026-09-30): a substitute teaches, or the session is cancelled and every
   *  student's package runs one class longer */
  teacherLeave?: { teacherId: ID; reason: string; substituteId: ID | null; by: ID; at: string }
}

export type AttendanceStatus = "present" | "absent" | "leave"

/** The part of a longer class a student attends (owner 2026-09-30): a 2-hour class, one student only the first
 *  hour. offset = minutes after the class start. */
export interface Seat {
  offset: number
  minutes: number
}

export interface Attendance {
  sessionId: ID
  studentId: ID
  status: AttendanceStatus
  /** present: minutes actually attended when different from the student's seat (came for 1 of 2 hours today) */
  minutes?: number
  /** leave that does NOT use the leave quota (owner 2026-09-30) — the package still runs one class longer */
  noQuota?: boolean
  /** leave taken for several sessions at once ("ลา 3 คาบ") — the group is edited together: back early / longer */
  leaveGroup?: ID
  markedBy: ID
  markedAt: string
}

/** Student-level, date-range leave (abroad/illness/accident) that doesn't count against the leave quota and pushes out affected course end dates. */
export interface StudentLeave {
  id: ID
  studentId: ID
  from: DateStr
  to: DateStr
  reason: string
  createdBy: ID
  createdAt: string
  updatedBy?: ID
  updatedAt?: string
}

export type SummaryStatus = "draft" | "submitted" | "changes_requested" | "approved" | "sent"

export interface SummaryEvent {
  at: string
  by: ID
  action: "write" | "submit" | "request_changes" | "approve" | "force_approve" | "send" | "edit"
  note?: string
}

/** Books and their lesson topics, typed by teachers the first time and picked by everyone after (owner 2026-09-30 —
 *  no inventory yet). Per branch; teachers create and tidy them themselves. */
export interface LessonBook {
  id: ID
  branchId: ID
  name: string
  createdBy: ID
  createdAt: string
}

export interface LessonTopic {
  id: ID
  bookId: ID
  name: string
  createdBy: ID
  createdAt: string
}

export interface LessonSummary {
  id: ID
  sessionId: ID
  studentId: ID
  /** Feedback Summary — this student's report for this session */
  text: string
  bookId?: ID
  topicId?: ID
  /** Lesson Detail — what was covered (e.g. pages, exercises) */
  detail?: string
  /** owner 2026-10-14: the teacher's 1–5 "ความเข้าใจวันนี้" — what the Course Summary progress chart is drawn from */
  level?: number
  /** owner 2026-10-14: a Bundle session (several subjects) rates each subject on its own; `level` = their average */
  subjectLevels?: Record<string, number>
  status: SummaryStatus
  authorId: ID
  lastEditorId: ID
  history: SummaryEvent[]
}

/**
 * A whole-course report (owner 2026-10-06) — written by hand, once per entitlement (one per purchase round: a
 * student who buys the same course again later gets a second one, not a merged one, even if the course has
 * several subjects — kept as one summary per round, not split per subject). Same write → submit → approve →
 * send lifecycle as LessonSummary, reusing SummaryStatus/SummaryEvent and the same maker-checker rules.
 */
export interface CourseSummary {
  id: ID
  entitlementId: ID
  studentId: ID
  overallProgress: string
  toImprove: string
  strengths: string
  status: SummaryStatus
  authorId: ID
  lastEditorId: ID
  history: SummaryEvent[]
}

export interface Parent {
  name: string
  /** name in English (owner 2026-10-09) — optional; NockAcademy = TH + EN, Liclass = JP + EN. Empty = auto romanized */
  nameEn?: string
  phone: string
  lineLinked: boolean
  primary: boolean
  email?: string
  /** owner 2026-10-12: one of PARENT_RELATIONS (ผู้ปกครอง · พ่อ · แม่ · ญาติ) — names carry no คุณพ่อ / คุณแม่ */
  relationship?: string
  birthDate?: DateStr
  /** phone numbers beyond the primary `phone` above — additive so every existing `p.phone` read stays correct */
  altPhones?: string[]
  /** LINE ID the parent typed (e.g. "@mom_ploy") — not the Messaging API user id */
  lineId?: string
}

export interface Family {
  id: ID
  name: string
  /** name in English (owner 2026-10-09) — optional; NockAcademy = TH + EN, Liclass = JP + EN. Empty = auto romanized */
  nameEn?: string
  parents: Parent[]
  address?: string
  postcode?: string
  province?: string
  /** pin for the bus driver (Liclass) + how to find the house ("หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ") */
  location?: { lat: number; lng: number }
  /** owner 2026-10-19 (Transport): the bus zone this home belongs to, set by hand — unset = by direction from the branch */
  busZoneId?: ID
  addressNote?: string
  /** how the family found us (form "Acquisition" — several allowed) */
  sources?: LeadSource[]
  /** one LINE link code for the whole family (siblings share it) */
  lineCode?: { code: string; expiresAt: string }
  /** real LINE Messaging API user id, once linked via Inbox (see linkConversationToFamily) — enables real delivery, not just the lineLinked simulation flag */
  lineUserId?: string
  /** for receipts — optional, most families never fill this in */
  taxInfo?: { customerName: string; taxId: string; address: string }
}

export type Gender = "male" | "female"

export interface Student {
  id: ID
  familyId: ID | null
  /** where this student's family found us — asked when staff add a student by hand (owner 2026-10-21: walk-ins and
   *  social enquiries skipped the CRM, so Reports' lead channels missed them) */
  source?: LeadSource
  branchId: ID
  name: string
  nickname: string
  /** name in English (owner 2026-10-09) — optional; NockAcademy = TH + EN, Liclass = JP + EN. Empty = auto romanized */
  nameEn?: string
  /** nickname in English (optional, owner 2026-10-09) */
  nicknameEn?: string
  grade: string
  /** owner 2026-10-12: names carry no ด.ช. / ด.ญ. (sorting, reading) — the gender is its own field, shown as a small icon */
  gender?: Gender
  /** profile photo (owner 2026-10-12) — small JPEG data URL in the prototype; unset = initial on a coloured circle */
  photo?: string
  usesBus: boolean
  birthDate?: DateStr
  school?: string
  /** the Ministry of Education school code when picked from the national list (owner 2026-10-07) — reports group
   *  by it, so spelling differences never split one school in two. Unset = typed by hand (not in the list). */
  schoolId?: string
  note?: string
  /** the branch and time the student record was created ("สร้างที่สาขาสีลม · 13 ก.ย. 67") */
  createdAt: string
  createdBranchId: ID
  /** left the school for good — set by hand. (Active/Inactive is automatic: packages + long leave) */
  archived?: { at: string; by: ID; reason: string }
  /** leaving (owner 2026-10-05): the parent tells the admin → the admin sends the exit form → closes it */
  exit?: StudentExit
  /** brought in by the import of the old system's students (owner 2026-09-30): they already bought courses with us,
   *  so no entry fee — the invoice tells the admin */
  imported?: { at: string; source: string }
  /** renewal check-in log (owner 2026-10-06, same shape as a lead's followUps) — "won't renew" goes through
   *  `exit` above instead of a separate close step; "couldn't reach" can set `nextTryOn` to drop off today's
   *  renewal list until that date */
  renewalFollowUps?: RenewalFollowUp[]
}

/** Internal staff note on a student (chat-style, never shown to parents). */
export interface StudentNote {
  id: ID
  studentId: ID
  by: ID
  at: string
  text: string
  /** written on a class in the calendar board (owner 2026-10-12) — shown there under the student AND in the student's Note tab */
  sessionId?: ID
}

/** Note Calendar (owner 2026-10-15) — a note on a student in a class on the calendar board, kept apart from the
 *  student's own Note tab. "permanent" shows on every session of that class; "temporary" only on the one session. */
export type CalendarNoteKind = "permanent" | "temporary"
export interface CalendarNote {
  id: ID
  studentId: ID
  kind: CalendarNoteKind
  /** temporary: the session it belongs to */
  sessionId?: ID
  /** permanent: the class — every session of it shows the note */
  classId?: ID
  text: string
  by: ID
  at: string
  editedBy?: ID
  editedAt?: string
}

export type LogCategory = "profile" | "class" | "attendance" | "billing" | "note"

/** Audit trail — every change that touches a student (owner 2026-09-28: every edit belongs in the log). */
export interface ActivityLog {
  id: ID
  at: string
  /** staff who did it; null = system (e.g. auto-enrol after payment) */
  by: ID | null
  category: LogCategory
  studentIds: ID[]
  /** short verb, e.g. "แก้ข้อมูล" */
  action: string
  detail: string
}

/** One placement Test or Trial a lead's child attends (owner 2026-09-28: always a place for the teacher to note
 *  the result — optional to fill — kept as data for evaluation). Also marks the student as test/trial in a joined class session. */
export interface Assessment {
  id: ID
  type: FormType
  leadId: ID
  studentId: ID
  sessionId: ID
  subject: string
  date: DateStr
  start: TimeStr
  /** short result line, e.g. "ระดับ ป.5 · 18/25" */
  result?: string
  note?: string
  notedBy?: ID
  notedAt?: string
}

export type EntitlementKind = "subscription" | "sessions"

export interface Entitlement {
  id: ID
  studentId: ID
  courseId: ID
  /** subjects of the course (a bundle has several) — lets make-up / one-off sessions of the same subject use this package */
  subjects: string[]
  /** the classes this package pays for — one course can run on several classes (อ. + พฤ. = 2 classes, owner 2026-09-30) */
  classIds: ID[]
  invoiceId: ID
  kind: EntitlementKind
  from: DateStr
  to: DateStr
  sessionsTotal: number
  /** leave quota copied from Settings › Packages when bought — later edits don't change it (owner 2026-10-09).
   *  Unset (older packages) = sessions bought ÷ 4. */
  leaveQuota?: number
  /** hour packs: minutes bought — used up by the minutes really attended, so a 1-hour visit to a 2-hour class takes
   *  1 hour (owner 2026-09-30). Unset = counted in sessions (older packages). */
  minutesTotal?: number
  /** hour packs: minutes left over that the admin kept for this student's next package of the same course */
  carryMinutes?: number
}

// ---------- CRM ----------

export type LeadStage =
  | "new" | "contacting"
  | "test_scheduled" | "tested"
  | "trial_scheduled" | "trialed"
  | "payment_pending" | "enrolled" | "archived"

export type LeadSource = "line" | "facebook" | "walkin" | "phone" | "website" | "referral" | "other"

export interface LeadNote {
  at: string
  by: ID
  text: string
}

/** Yearly parent satisfaction survey (owner 2026-10-05): one form per family, child ratings inside, TH/EN/JP. */
/** owner 2026-10-21: the questions of the school's real parent survey (Google Form, NockAcademy Bangna) — sent per
 *  family by LINE so the school still knows who answered (subjects / grade come from the enrolment, not asked) */
export type SurveyReason = "content" | "teaching" | "feedback" | "schedule" | "value" | "other"
export type SurveyTopic = "teacher" | "content" | "feedback" | "value" | "place"
export type SurveyImprove = "exam" | "challenge" | "activities" | "one_on_one" | "school" | "facility" | "other"
export interface SurveyAnswers {
  /** Q3: would recommend us, 0–10 */
  nps: number | null
  /** Q4: why that score (several) — "other" with its text */
  reasons: SurveyReason[]
  reasonOther: string
  /** Q5: satisfaction per topic, 5 = มากที่สุด … 1 = ไม่พอใจ */
  scores: Record<SurveyTopic, number | null>
  /** Q6: the one thing to improve most — "other" with its text */
  improve: SurveyImprove | null
  improveOther: string
  /** Q7: courses they'd like us to open */
  wantCourses: string
  /** Q8: a message to the teachers and the school */
  message: string
  lang: FormLang
}

export interface SurveyToken {
  token: string
  kind: "survey"
  campaignId: ID
  year: number
  familyId: ID
  familyName: string
  branchId: ID
  branchName: string
  brand: Brand
  lang: FormLang
  usesBus: boolean
  children: { id: ID; nickname: string; grade: string; teacherIds: ID[]; teacherNames: string[]; subjects: string[] }[]
  conversationId: ID | null
  createdAt: string
  expiresAt: string
  used: boolean
}

export interface SurveyResponse {
  id: ID
  token: string
  campaignId: ID
  year: number
  familyId: ID
  branchId: ID
  /** teachers of each child when sent — teacher scores go to them */
  teachers: Record<ID, ID[]>
  /** each child's grade + subjects when sent (the real form's Q1–Q2, filled in by the system) */
  kids?: { grade: string; subjects: string[] }[]
  answers: SurveyAnswers
  submittedAt: string
  /** unhappy → a manager calls them (owner: within 3 days) and notes what came of it */
  followUp?: { at: string; by: ID; note: string }
}

/** One year's send-out. */
export interface SurveyCampaign {
  id: ID
  year: number
  from: DateStr
  to: DateStr
  sentAt: string
  sentBy: ID
  /** every family it went to: by LINE, or only a link (no LINE) */
  recipients: { familyId: ID; branchId: ID; token: string; viaLine: boolean }[]
  remindedAt?: string
}

/** Enroll-now form (owner 2026-10-05): a family that wants to start without a test / trial. */
export type EnrollPackage = "hour" | "week" | "month" | "unsure"

/** A course the enroll form offers — a snapshot (the parent's page has no access to ERP data). */
export interface EnrollCourseOption { id: ID; name: string; subjects: string[]; grades: string[]; unit: PriceUnit; duration: number; price: number }

/** owner 2026-10-15: a real weekly class the admin offers in the enroll form — the parent picks the days that suit
 *  them (course / package were agreed in the chat; the admin puts them on the invoice) */
/** owner 2026-10-16: the enroll form is an invoice still missing the class + start date — the admin already
 *  put in the course / package agreed in the chat, how many periods, and whether the bus is offered (Liclass) */
export interface EnrollPlan { course: EnrollCourseOption; periods: number; bus: boolean }

export interface EnrollClassOffer { id: ID; name: string; subjects: string[]; grades: string[]; weekday: Weekday; start: TimeStr; minutes: number; teacher?: string; seatsLeft: number }

/** The link: a reusable one per branch (LINE Rich Menu) or a one-time one an admin sends to a lead. */
export interface EnrollToken {
  token: string
  kind: "enroll"
  reusable: boolean
  branchId: ID
  branchName: string
  brand: Brand
  lang: FormLang
  grades: string[]
  subjects: string[]
  subjectNames?: SystemConfig["subjectNames"]
  courses: EnrollCourseOption[]
  /** the classes the admin offers (owner 2026-10-15) — set = the form asks only "which classes", nothing about
   *  subjects / courses / packages */
  classOffers?: EnrollClassOffer[]
  plan?: EnrollPlan
  /** set when an admin sent it to a lead */
  leadId?: ID
  conversationId: ID | null
  prefill?: FormPrefill
  createdAt: string
  expiresAt?: string
  used: boolean
}

export interface EnrollChild extends FormStudentExtras {
  name: string
  nickname?: string
  grade: string
  birthDate?: DateStr
  school?: string
  note?: string
  subjects: string[]
  courseIds: ID[]
  pkg: EnrollPackage
  /** convenient times as "<weekday 0–6>-<am|pm|eve>" */
  times: string[]
  startDate: DateStr
  /** the offered classes the parent picked (owner 2026-10-15) */
  classIds?: ID[]
  /** periods agreed in the chat (from the admin's plan) */
  periods?: number
  /** Liclass bus: which way (owner 2026-10-16) — set with bus = true */
  busLeg?: "both" | "pickup" | "dropoff"
  bus: boolean
  /** the parent wants the teacher to check the level in the first class (no test before) */
  placement: boolean
}

export interface EnrollSubmission {
  id: ID
  token: string
  branchId: ID
  leadId?: ID
  conversationId: ID | null
  lineUserId?: string
  lineName?: string
  parents: FormParentInput[]
  familyAddress?: string
  familyPostcode?: string
  familyProvince?: string
  familyLocation?: { lat: number; lng: number }
  familyAddressNote?: string
  acquisitions?: LeadSource[]
  taxInfo?: { customerName: string; taxId: string; address: string }
  /** the family name the parent typed (optional — empty = "ครอบครัว" + the main parent's surname) */
  familyName?: string
  familyNameEn?: string
  children: EnrollChild[]
  acceptedTerms: boolean
  lang: FormLang
  status: "pending" | "approved" | "rejected"
  submittedAt: string
  reviewedAt?: string
  createdStudentIds?: ID[]
}

/** What a parent answers on the exit form (TH / EN / JP form, stored language-neutral). */
export interface ExitAnswers {
  reasonId: ID
  otherReasonIds: ID[]
  /** 1–5, null = skipped */
  scores: { teacher: number | null; content: number | null; admin: number | null; value: number | null }
  comeBack: "yes" | "maybe" | "no"
  /** YYYY-MM when they might come back */
  comeBackMonth?: string
  /** would recommend us, 0–10 */
  nps: number | null
  comment: string
  /** OK to contact them with offers later */
  contactOk: boolean
  lang: FormLang
}

/** one ย้ายคลาสถาวร (owner 2026-10-14) — kept so it can be taken back while the new class hasn't been taught yet */
export interface ClassMove {
  id: ID
  studentId: ID
  fromClassId: ID
  toClassId: ID
  /** the session it took effect from */
  fromSessionId: ID
  at: string
  by: ID
  leftSessionIds: ID[]
  joinedSessionIds: ID[]
  /** packages that got the new class added */
  entitlementIds: ID[]
  undoneAt?: string
  undoneBy?: ID
}

/**
 * แจ้งลาหยุด / แจ้งลาออก sent by a parent from the parent app in LINE (owner 2026-10-14) — stored on the server
 * (the parent's phone can't reach the ERP's data); the office team sees it, acts in the ERP, and the parent is told.
 */
/** one class day in a bus request (owner 2026-10-19) */
export interface BusChange {
  date: DateStr
  start: TimeStr
  subjects: string[]
  pickup?: "add" | "cancel"
  dropoff?: "add" | "cancel"
  /** a parent rides along that day (on every leg the child rides) — takes a seat, costs nothing (owner 2026-10-19) */
  adult?: boolean
}

export interface ParentRequest {
  id: ID
  /** return = a child who left wants to come back (owner 2026-10-14) · bus = ask for extra rides / cancel rides (owner 2026-10-19)
   *  · home = the parent pins the house for the bus (owner 2026-10-19 "นักเรียนที่ต้องการใช้รถ จะต้องให้ Location แก่เรา") */
  kind: "leave" | "exit" | "return" | "bus" | "home"
  familyId: ID
  familyName: string
  branchId?: ID
  lineUserId: string
  studentId: ID
  studentNickname: string
  createdAt: string
  /** leave: the classes the child will miss */
  sessions?: { sessionId: ID; date: DateStr; start: TimeStr; subjects: string[] }[]
  /** bus: per class day, which legs to add or cancel (the parent's ask — the admin approves or declines) */
  bus?: BusChange[]
  /** home: where the house is (+ how to find it) — saved on the family when the admin approves */
  home?: { lat: number; lng: number; addressNote?: string }
  /** return: when they'd like to start again */
  startDate?: DateStr
  /** exit: last day + why */
  lastDate?: DateStr
  reasonIds?: ID[]
  /** free text from the parent (both kinds) */
  note?: string
  status: "new" | "done" | "declined"
  handledAt?: string
  handledBy?: ID
  /** what the school did / why not — also what the parent sees */
  result?: string
}

/** A link sent to a family for the exit form (server-side, like Test/Trial tokens). */
export interface ExitToken {
  token: string
  kind: "exit"
  branchId: ID
  branchName: string
  brand: Brand
  lang: FormLang
  conversationId: ID | null
  familyName: string
  students: { id: ID; nickname: string; grade: string }[]
  lastDate: DateStr
  /** snapshot of the reason list in three languages — the form page has no access to Settings */
  reasons: { id: ID; label: string; en?: string; ja?: string }[]
  createdAt: string
  expiresAt: string
  used: boolean
}

export interface ExitResponse {
  id: ID
  token: string
  branchId: ID
  studentIds: ID[]
  answers: ExitAnswers
  submittedAt: string
}

export interface StudentExit {
  status: "sent" | "answered" | "closed"
  lastDate: DateStr
  token?: string
  sentAt: string
  sentBy: ID
  /** copied from the server when the admin closes it — Reports read it from here */
  answers?: ExitAnswers
  /** final reason (the parent's, or the admin's when the parent never answered) */
  reasonId?: ID
  otherReasonIds?: ID[]
  noReply?: boolean
  money?: "refund" | "credit" | "none"
  note?: string
  closedAt?: string
  closedBy?: ID
  /** the parent told us themselves from LINE (ParentRequest) — no separate exit form needed */
  fromParentRequest?: ID
}

export type ContactChannel = "call" | "line" | "other"
/** talked / replied = they answered · no_answer / no_reply = nothing back · call_back = asked us to try later */
export type ContactResult = "talked" | "replied" | "no_answer" | "no_reply" | "call_back" | "wrong_number"

export interface LeadFollowUp {
  id: ID
  at: string
  by: ID
  channel: ContactChannel
  result: ContactResult
  note?: string
}

/** A renewal check-in call/message and what came of it (owner 2026-10-06). Unlike a lead follow-up, a result that
 *  didn't reach anyone can set `nextTryOn` directly — no separate "close" step — so the student drops off today's
 *  renewal list until that date instead of being nagged about every day. */
export interface RenewalFollowUp {
  id: ID
  at: string
  by: ID
  channel: ContactChannel
  result: ContactResult
  note?: string
  nextTryOn?: DateStr
}

export interface LeadLost {
  /** the step the lead stopped at (defaults to where it was) */
  stage: LeadStage
  reasonId: ID
  otherReasonIds: ID[]
  competitor?: string
  /** the time they wanted that we could not offer (reason = schedule) */
  wantedTime?: string
  /** try again on this day — shows in Need Attention */
  followUpOn?: DateStr
  note?: string
  at: string
  by: ID
}

export interface Lead {
  id: ID
  branchId: ID
  name: string
  childGrade: string
  subject: string
  source: LeadSource
  stage: LeadStage
  assigneeId: ID | null
  phone: string
  lineId: string
  createdAt: string
  /** test / trial appointment, when scheduled */
  scheduledAt?: string
  archivedFrom?: LeadStage
  archiveReason?: string
  /** the short close-lead form (owner 2026-10-05) — archiveReason keeps the main reason's label for older screens */
  lost?: LeadLost
  /** came through the enroll-now form — no test / trial (the funnel skips those steps for it) */
  direct?: boolean
  /** a student who left and said they may come back — a closed lead to call again (not a new lead in the funnel) */
  winBackOf?: ID
  /** every call / LINE follow-up and what came of it — shows whether a quiet lead is really gone */
  followUps?: LeadFollowUp[]
  notes: LeadNote[]
  /** set once the lead becomes a real Student record */
  convertedStudentId?: ID | null
  /** real LINE Messaging API user id, once linked via Inbox — lets staff send a real Test/Trial form link */
  lineUserId?: string
  /** minimal Student created when a test/trial form is approved, before formal enrollment —
   *  reused by later test/trial approvals and by convertLeadToStudent, so a lead never
   *  accumulates duplicate Student rows */
  trialStudentId?: ID | null
}

// ---------- Inbox ----------

export type ConversationChannel = "line" | "walkin" | "phone" | "other"

export interface Conversation {
  id: ID
  branchId: ID
  name: string
  /** linked to an enrolled family, a CRM lead, or neither ("contact") — decides the info panel + badge */
  familyId: ID | null
  leadId: ID | null
  channel: ConversationChannel
  assigneeId: ID | null
  lastMessageAt: string
  /** true while there's a parent message staff hasn't opened yet */
  unread: boolean
}

export type MessageAuthor = "parent" | "staff" | "internal"

export type MessageKind = "text" | "form_request" | "form_submission" | "image"

export interface FormRequestMeta {
  formKind: "form_request"
  token: string
  type: FormType
  subjects: string[]
}

export interface FormSubmissionMeta {
  formKind: "form_submission"
  submissionId: ID
  type: FormType
}

/** a photo the parent sent in LINE (e.g. a pay slip) — file kept server-side, served by /api/line/media/[id] */
export interface ImageMeta {
  formKind: "image"
  mediaId: string
}

/** the parent sent the exit form back — the chat shows the answers with ปิดการออก / ไม่ออกแล้ว (owner 2026-10-14) */
export interface ExitFormMeta {
  formKind: "exit_form"
  token: string
  studentIds: ID[]
}

/** แจ้งลา / แจ้งลาออก / กลับมาเรียน sent from the parent app — handled right in the chat (owner 2026-10-14) */
export interface ParentRequestMeta {
  formKind: "parent_request"
  requestId: ID
}

/** owner 2026-10-22: a parent tapped "สนใจคลาสนี้" / "ขอนัดทดลองเรียน" in the course catalog — a card in the chat */
export interface CatalogRequestMeta {
  formKind: "catalog_request"
  action: "interest" | "trial"
  classId: ID
  courseId?: ID
  /** what the parent saw, so the card reads well even if the class changes later */
  className: string
  subjects: string[]
  when: string
}

export type ChatMessageMeta = FormRequestMeta | FormSubmissionMeta | ImageMeta | ExitFormMeta | ParentRequestMeta | CatalogRequestMeta

export interface ChatMessage {
  id: ID
  conversationId: ID
  author: MessageAuthor
  /** staff id — set for "staff"/"internal", null for "parent" */
  senderId: ID | null
  text: string
  at: string
  /** absent/"text" = plain bubble — every existing message stays valid with no migration */
  kind?: MessageKind
  meta?: ChatMessageMeta
}

// ---------- Billing ----------

export interface BusLeg {
  date: DateStr
  pickup: boolean
  dropoff: boolean
}

/** One course on an invoice (Staging: an invoice can carry several courses — each with its own class, start and periods). */
/** Liclass: a parent asks for extra bus days after paying — the bus runs right away and the charge waits for the
 *  student's next invoice (owner 2026-09-30). Fewer bus days are never refunded. Billed = on a non-void invoice. */
export interface BusAddOn {
  id: ID
  branchId: ID
  studentId: ID
  date: DateStr
  pickup: boolean
  dropoff: boolean
  busFeeId: ID | null
  /** price copied when recorded (legs × bus fee) */
  amount: number
  note?: string
  /** owner 2026-10-19: a ride taken OFF (the parent cancelled it in LINE) — the bus doesn't come for these legs.
   *  amount 0: a ride already paid for isn't refunded; an unbilled extra ride is simply dropped instead. */
  cancel?: boolean
  /** owner 2026-10-19: a parent riding along with the child on these legs — +1 seat on the bus run, never charged */
  companion?: boolean
  createdBy: ID
  createdAt: string
}

/** Refund (owner 2026-09-30): a paid invoice is never edited — a Credit Note cancels part of it.
 *  refund = money goes back (recorded with the account it left from) · credit = kept as credit for the same
 *  student + course, taken off their next invoice automatically. */
export type CreditMode = "refund" | "credit"

export interface CreditNoteItem {
  /** "line:<lineId>" · "bus" · "busExtra" · "book" · "advance:<feeId>" */
  key: string
  label: string
  /** the course this money belongs to — credit is tied to student + course */
  courseId?: ID
  amount: number
}

export interface CreditNote {
  id: ID
  branchId: ID
  studentId: ID
  invoiceId: ID
  number: string
  mode: CreditMode
  items: CreditNoteItem[]
  /** chips + free text */
  reasons: string[]
  remark: string
  /** the student stops the chosen courses from this day (packages end, removed from later sessions) */
  stopFrom?: DateStr
  status: "pending_approval" | "approved" | "void"
  createdBy: ID
  createdAt: string
  approvedBy?: ID
  forced?: ForcedAction
  voidReason?: string
  /** refund mode: the money actually sent back — from which account, so the statement line has a document */
  refund?: { fromAccount: string; date: DateStr; reference: string; recordedBy: ID; recordedAt: string }
}

/** Course credit taken off an invoice */
export interface CreditUse {
  creditNoteId: ID
  courseId: ID
  amount: number
}

/** A bus add-on billed on an invoice — a copy, so the invoice total never changes afterwards. */
export interface BusExtraLine {
  addOnId: ID
  date: DateStr
  pickup: boolean
  dropoff: boolean
  amount: number
}

export interface AdvanceItem {
  feeId: ID
  name: string
  amount: number
}

export interface CourseLine {
  id: ID
  courseId: ID
  /** one course, several classes (e.g. Tue + Thu) — each is counted as its own class */
  classIds: ID[]
  startDate: DateStr
  periods: number
  /** required when the student already has an active entitlement for the course */
  overlapRemark?: string
  /** hour packs: minutes carried in from the student's previous package of this course */
  carryIn?: number
  /** per class: the part of the class this student attends (unset = the whole class) */
  seats?: Record<ID, Seat>
  /** hour packs that don't divide into whole sessions (owner 2026-09-30): keep the minutes for the next package,
   *  add one more session free, or drop them */
  leftover?: Leftover
}

export type Leftover = "carry" | "extra" | "drop"

export interface Invoice {
  id: ID
  branchId: ID
  studentId: ID
  /** assigned only when the PDF is generated — drafts never consume a number */
  number: string | null
  /** courses bought on this invoice (empty = other fees only) */
  lines: CourseLine[]
  bus: BusLeg[]
  /** bus fee type from General Fees (Standard / โซนไกล …) — unset = the branch's first bus type */
  busFeeId?: ID | null
  /** extra bus days recorded after an earlier invoice, charged here */
  busExtras?: BusExtraLine[]
  /** course credit (from a Credit Note) taken off this invoice */
  creditsUsed?: CreditUse[]
  bookFee: number
  /** Advance Optional (Staging): entry / mock fees picked from General Fees — name + price copied so a later price change never rewrites an invoice */
  advance: AdvanceItem[]
  concession: { amount: number; remark: string } | null
  /** auto-applied best promotion (id kept so the invoice shows which one) */
  promotionId?: ID | null
  noteToParent: string
  status: InvoiceStatus
  pdf: "none" | "generating" | "ready" | "failed"
  createdBy: ID
  createdAt: string
  approvedBy?: ID
  /** set when the approver skipped maker–checker (approved their own invoice) — remark is mandatory */
  forced?: ForcedAction
  sentAt?: string
  /** real LINE push (E2E 2026-09-28): sending → delivered / failed · no_line = family has no LINE */
  delivery?: LineDelivery
  deliveryError?: string
  voidReason?: string
  payments: Payment[]
  receiptNumber?: string
  /** the receipt message to the parent, pushed automatically when the invoice becomes paid */
  receiptDelivery?: LineDelivery
}

export type LineDelivery = "sending" | "delivered" | "failed" | "no_line"

export type InvoiceStatus = "draft" | "pending_approval" | "approved" | "sent" | "paid" | "void"

export interface Payment {
  id: ID
  amount: number
  method: "transfer" | "cash"
  reference: string
  recordedBy: ID
  recordedAt: string
  /** pay-slip image (downscaled JPEG data URL — prototype has no file storage) */
  slip?: string
  confirmedBy?: ID
  /** set when the recorder confirmed their own payment (Force) */
  forced?: ForcedAction
}

/** Force Approve (owner 2026-09-26): skip maker–checker, remark always required, whole branch + Director notified. */
export interface ForcedAction {
  by: ID
  at: string
  remark: string
}

export type NotificationKind =
  | "low_sessions" | "session_cancelled" | "approval_needed" | "holiday_impact" | "info" | "form_submitted" | "student_leave"
  | "force_approved" | "message" | "nock"
  /** owner 2026-10-14: a student gave notice (แจ้งออก) — pops up for the office team */
  | "student_exit"
  /** owner 2026-10-14: a parent sent แจ้งลา / แจ้งลาออก from LINE */
  | "parent_request"

/** One internal notification — the single team-communication channel (see domain/rules/notifications.ts). */
export interface AppNotification {
  id: ID
  at: string
  kind: NotificationKind
  title: string
  body: string
  /** who has read it — per person, so one person reading never clears it for the rest of the team */
  readBy: ID[]
  /** staff who caused/sent it (team messages, force approvals) — never notified about their own action */
  fromId?: ID
  roles: Role[]
  /** only staff at this branch (plus director) see it — unset means org-wide, same as before this field existed */
  branchId?: ID
  /** also/only delivered to these specific staff regardless of role */
  staffIds?: ID[]
}

// ---------- Parent-facing forms (Test / Trial) — server-side only, see src/server/form-store.ts ----------

export type FormType = "test" | "trial"
export type FormStatus = "pending" | "approved" | "rejected"

/** Where a candidate time slot came from — decides how Approve books it. */
export type SlotSource = "generic" | "class"

/** One candidate time offered to a parent — either an open admin-defined time ("generic")
 *  or a real occurrence of an existing class ("class", joins that Session on approve). */
export interface FormOfferSlot {
  id: ID
  date: DateStr
  start: TimeStr
  minutes: number
  source: SlotSource
  teacherId: ID | null
  roomId: ID | null
  /** set only when source === "class" */
  classId: ID | null
  /** set only when source === "class" — the real Session to join on approve */
  sessionId: ID | null
  /** a generic slot whose teacher AND a room are free for a whole 2-hour visit (2+ subjects same day) and the
   *  branch is still open — only these can be combined (owner 2026-09-30). Unset on old tokens = allowed. */
  fits2h?: boolean
}

export interface FormSubjectOffer {
  subject: string
  slots: FormOfferSlot[]
}

/** One link a parent can open (in LIFF) to submit a Test/Trial form — single use, expires. */
export interface FormToken {
  token: string
  type: FormType
  leadId: ID
  branchId: ID
  conversationId: ID | null
  offers: FormSubjectOffer[]
  /** snapshot of branch.grades at send time — the LIFF page has no access to branch master data */
  grades: string[]
  /** shown in the form header */
  branchName?: string
  /** Liclass runs a school bus → its form asks for the address + map pin; NockAcademy doesn't */
  brand?: Brand
  /** default language (Settings) — parent can switch */
  lang?: FormLang
  /** EN/JP names of the offered subjects (snapshot of Settings) */
  subjectNames?: SystemConfig["subjectNames"]
  prefill?: FormPrefill
  /** owner 2026-10-22: "same" = every chosen subject in one visit (one shared time) · "separate" = a time per subject
   *  (Trial always; Test when the admin chose separate days). Unset on older links = same. */
  visit?: "same" | "separate"
  createdAt: string
  expiresAt: string
  used: boolean
}

/** A parent as typed into the form — not yet a `Parent` record (no `lineLinked`/`primary`,
 *  those only make sense once merged into an actual `Family`). */
export interface FormParentInput {
  name: string
  /** owner 2026-10-15: the form and the admin panel collect the same fields — English name optional on both */
  nameEn?: string
  phone: string
  email?: string
  relationship?: string
  birthDate?: DateStr
  lineId?: string
  /** extra numbers besides `phone` (the default one) */
  altPhones?: string[]
  /** the default contact of the family — exactly one per submission */
  primary?: boolean
}

/** Parent form languages (owner 2026-09-29): TH / EN / JP, default from Settings, switchable on the form */
export type FormLang = "th" | "en" | "ja"

/** What the system already knows about this family/child, sent with the form link so the parent never
 *  types it again (owner 2026-09-29: the Trial form used to start empty after the Test form was filled). */
export interface FormPrefill {
  parents: FormParentInput[]
  address?: string
  postcode?: string
  province?: string
  location?: { lat: number; lng: number }
  addressNote?: string
  acquisitions?: LeadSource[]
  taxInfo?: { customerName: string; taxId: string; address: string }
  familyName?: string
  familyNameEn?: string
  students: ({ name: string; nickname?: string; grade: string; birthDate?: DateStr; school?: string; note?: string; interests?: string[] } & FormStudentExtras)[]
}

/** owner 2026-10-15: the extra (optional) child fields the admin panel always had — the parent form asks them too */
export interface FormStudentExtras {
  /** Ministry school code when picked from the list (same picker on the form and in the ERP) */
  schoolId?: string
  nameEn?: string
  nicknameEn?: string
  gender?: Gender
}

/** One subject + the exact slot chosen for it — a submission row now holds one of these per subject
 *  the parent picked for that child, replacing the old one-row-per-pick shape. */
export interface FormPick {
  chosenSubject: string
  /** denormalized snapshot — self-contained even if the token's offers later change */
  chosenSlot: FormOfferSlot
}

/** One child in a Test/Trial submission. A parent submitting for 2 children produces 2 `FormSubmission`
 *  rows sharing one `groupId` — this keeps the existing "1 Lead per child" invariant (types.ts Lead docs)
 *  instead of inventing a multi-child Lead. */
export interface FormSubmission {
  id: ID
  token: string
  type: FormType
  /** every child submitted together in the same parent session shares this — shown to staff so they can
   *  see "these N children arrived together", but each is still reviewed/approved independently */
  groupId: ID
  /** the token's own lead — every child in the group is a sibling of this one, even a child who gets
   *  their own new Lead below (source for copied subject/assignee/branch context) */
  primaryLeadId: ID
  /** this child's own Lead: same as `primaryLeadId` for the first/primary child; null for an additional
   *  child added via "Add another Student" until approval lazily creates one, same as the Student already does */
  leadId: ID | null
  branchId: ID
  conversationId: ID | null
  lineUserId: string
  parents: FormParentInput[]
  familyAddress?: string
  familyPostcode?: string
  familyProvince?: string
  familyLocation?: { lat: number; lng: number }
  familyAddressNote?: string
  acquisitions?: LeadSource[]
  taxInfo?: { customerName: string; taxId: string; address: string }
  studentName: string
  studentNickname?: string
  studentGrade: string
  studentBirthDate?: DateStr
  studentSchool?: string
  studentNote?: string
  studentSchoolId?: string
  studentNameEn?: string
  studentNicknameEn?: string
  studentGender?: Gender
  /** the family name the parent typed (optional — empty = "ครอบครัว" + the main parent's surname) */
  familyName?: string
  familyNameEn?: string
  picks: FormPick[]
  status: FormStatus
  submittedAt: string
  reviewedAt?: string
  createdSessionId?: ID | null
  createdStudentId?: ID | null
}

/** Result of any action — every action returns one so the UI can always show feedback. */
export type Result<T = void> = { ok: true; value: T; warnings?: string[] } | { ok: false; error: string }

// ---------- Nock — the in-app AI helper + knowledge bank (owner 2026-10-13) ----------

/** ai = Nock answered (AI / knowledge / handbook) · unanswered = waiting for the team · answered = a person answered → knowledge */
export type NockStatus = "ai" | "unanswered" | "answered"

/**
 * One question asked of Nock — and, once a person answers it, one piece of Nock's knowledge (owner 2026-10-13:
 * "คำถามและคลังความรู้คือเรื่องเดียวกัน — ได้คำตอบแล้ว = กลายเป็นคลังความรู้").
 */
export interface NockQuestion {
  id: ID
  at: string
  askedBy: ID
  /** the asker's roles at the time — answers are given by these permissions */
  roles: Role[]
  branchId: ID
  /** the parts of the system it is about — chosen by the asker (NOCK_LOCATIONS ids), one or more */
  locations: string[]
  question: string
  /** what Nock replied (empty when it had nothing) */
  aiAnswer?: string
  aiSource?: "ai" | "knowledge" | "guide"
  links?: { label: string; href: string }[]
  /** the knowledge (an answered question + which of its answers) Nock used for this reply — the asker's thumbs count for that answer */
  fromKnowledgeId?: ID
  fromAnswerId?: ID
  status: NockStatus
  /** the asker's thumbs up / down on Nock's reply — down sends it to the team */
  helpful?: boolean
  /** everyone's thumbs on Nock's own reply (owner 2026-10-13: "ทุกคนกดไลค์ / unlike คำตอบของ Nock ได้") */
  aiVotesUp?: ID[]
  aiVotesDown?: ID[]
  /** people's answers — one is enough to make the question knowledge; thumbs decide which one Nock uses */
  answers?: NockAnswer[]
  /** written straight into the bank (not asked through Nock) */
  manual?: boolean
  /** owner 2026-10-14: chatting with Nock stays private; a question joins the bank only when the asker chooses
   *  (Nock couldn't answer / the answer missed). false = chat only · unset = in the bank (older records) */
  inBank?: boolean
  /** the asker said "ไม่สร้าง" when offered */
  bankDeclined?: boolean
  /** pictures with the question (owner 2026-10-13) — small JPEG data URLs in the prototype, files in the real system */
  images?: string[]
}

/** One person's answer to a question (owner 2026-10-13): only its writer edits it; others add their own; thumbs pick the one Nock uses */
export interface NockAnswer {
  id: ID
  by: ID
  at: string
  text: string
  /** who Nock may tell this answer to — empty = everyone */
  audience: Role[]
  votesUp: ID[]
  votesDown: ID[]
  images?: string[]
}

// ---------- เรื่องถึง Dev (owner 2026-10-13): any staff → the development team, answered inside the ERP ----------

export type DevTicketKind = "bug" | "help" | "idea" | "question"
export type DevTicketStatus = "new" | "in_progress" | "done" | "wont_do" | "on_hold"

/** A bug / help request / suggestion / question for the developers. The reporter sees their own; Developers see all. */
export interface DevTicket {
  id: ID
  /** DEV-0001 */
  number: string
  at: string
  by: ID
  roles: Role[]
  branchId: ID
  kind: DevTicketKind
  title: string
  detail: string
  /** the parts of the system it is about (NOCK_LOCATIONS ids) — chosen by the reporter */
  locations: string[]
  /** where they were when they sent it — attached automatically for the developers */
  pageUrl: string
  status: DevTicketStatus
  /** screenshots / pictures (owner 2026-10-13) */
  images?: string[]
  /** the conversation between the reporter and the developers (status changes are logged here too) */
  thread: { id: ID; by: ID; at: string; text: string; status?: DevTicketStatus; images?: string[] }[]
}

// ---------------- Form builder (owner 2026-10-22) ----------------

/** what a question asks for — every kind a school form needs */
export type FormFieldType =
  | "section"   // a heading / explanation, no answer
  | "text" | "textarea" | "number" | "date" | "time" | "phone" | "email"
  | "single" | "multi" | "dropdown" | "yesno"
  | "nps"       // 0–10
  | "scale5"    // 1–5
  | "file" | "image"
  | "consent"   // a box that must be ticked
  | "page"      // owner 2026-10-22: a new step (ถัดไป / ย้อนกลับ) — its label is the step's title
  | "address"   // owner 2026-10-22: address text + a pin on the map

export interface FormField {
  id: ID
  type: FormFieldType
  label: string
  /** a line under the question */
  help?: string
  required: boolean
  /** single / multi / dropdown */
  options?: string[]
  /** single / multi: an "อื่นๆ" choice with its own text box */
  allowOther?: boolean
  /** a field of a system form: "core" = the ERP needs it (always shown, not editable) · "optional" = can be hidden */
  lock?: "core" | "optional"
  /** an optional system field switched off */
  hidden?: boolean
  /** a heading whose questions (until the next heading / step) repeat — "+ เพิ่มนักเรียน" up to `max` */
  repeat?: { add: string; max: number }
  /** owner 2026-10-22: tied to the family's / child's data — shown filled in, and the answer updates the record */
  bind?: FormBind
  /** choices that come from the system when the form is sent (the branch's subjects / grades, or what the admin offers) */
  source?: "subjects" | "grades" | "offer"
  /** shown only when an earlier question's answer is (or includes) this value */
  showIf?: { field: ID; value: string }
}

/** what a question can be tied to — child.* inside a repeating group (one entry per child) */
export type FormBind = "parent.name" | "parent.phone" | "parent.email" | "parent.relation" | "family.address" | "child.name" | "child.nickname" | "child.grade" | "child.birthDate" | "child.school"

export interface AddressAnswer { address: string; lat?: number; lng?: number }
/** one filled-in set of a repeating group (e.g. one child); `_studentId` = the child it was filled in from */
export interface GroupEntry { [fieldId: string]: FormAnswer }

export interface FormDef {
  id: ID
  name: string
  description?: string
  /** "system" = one of the ERP's own forms (its core fields are locked) · "custom" = made by the company */
  kind: "system" | "custom"
  /** which system form (test / trial / enroll / exit / survey) */
  systemKey?: string
  fields: FormField[]
  /** a custom form can be switched off (no new sends) */
  active: boolean
  /** a last step showing every answer before sending (owner 2026-10-22, like the Test / Trial forms) */
  review?: boolean
  updatedAt: string
  updatedBy?: ID
}

/** one answer: text / number as text, choices as a list, a file as its name */
export type FormAnswer = string | string[] | number | boolean | null | AddressAnswer | GroupEntry[]

/** a family's answers to a custom form */
export interface CustomFormResponse {
  id: ID
  formId: ID
  token: string
  familyId: ID
  branchId: ID
  answers: Record<ID, FormAnswer>
  submittedAt: string
}

/** a custom-form link sent to a family — carries a copy of the form (the parent's page can't read the ERP's data) */
export interface CustomFormToken {
  token: string
  kind: "custom"
  formId: ID
  form: Pick<FormDef, "id" | "name" | "description" | "fields" | "review">
  /** answers filled in from the family's data (bound questions) */
  prefill?: Record<ID, FormAnswer>
  familyId: ID
  branchId: ID
  conversationId?: ID
  createdAt: string
  expiresAt: string
  used: boolean
}

// ---------------- Course catalog (owner 2026-10-22) ----------------

/** a course as the parent sees it in the catalog — its starting price and the classes that teach it */
export interface CatalogCourse {
  id: ID
  name: string
  subjects: string[]
  grades: string[]
  format: ClassType
  unit: PriceUnit
  duration: number
  /** one package (price + course fee) — shown as "เริ่มต้น" */
  price: number
  classIds: ID[]
}

/** the branch's catalog link — a snapshot of its courses + classes (the parent's page can't read the ERP) */
export interface CatalogToken {
  token: string
  kind: "catalog"
  branchId: ID
  branchName: string
  brand: Brand
  lang: FormLang
  grades: string[]
  subjects: string[]
  subjectNames?: SystemConfig["subjectNames"]
  courses: CatalogCourse[]
  classes: EnrollClassOffer[]
  createdAt: string
  updatedAt: string
}
