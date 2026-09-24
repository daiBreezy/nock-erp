// Core domain model for NockERP v2.
// Dates are local calendar strings ("YYYY-MM-DD"), times are "HH:mm" (branch local time).

export type ID = string
export type DateStr = string
export type TimeStr = string

export type Brand = "nockacademy" | "liclass"
export type Role = "director" | "manager" | "admin" | "teacher"
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6 // 0 = Sunday

export interface OpenHours {
  open: TimeStr
  close: TimeStr
}

export interface Room {
  id: ID
  name: string
}

export interface Branch {
  id: ID
  code: string
  name: string
  brand: Brand
  rooms: Room[]
  /** null = closed that weekday */
  hours: Record<Weekday, OpenHours | null>
  subjects: string[]
  grades: string[]
  defaultSessionMinutes: number
  busFeePerLeg: number
  bankAccount: { bank: string; name: string; number: string }
  lineOaConnected: boolean
}

export interface Staff {
  id: ID
  name: string
  nickname: string
  roles: Role[]
  branchIds: ID[]
  subjects: string[]
  active: boolean
  canLogin: boolean
  email?: string
}

export interface Holiday {
  id: ID
  branchId: ID | null // null = all branches
  date: DateStr
  name: string
}

export type PackageUnit = "month" | "hours"

export interface Package {
  id: ID
  branchId: ID
  subject: string
  grades: string[]
  unit: PackageUnit
  price: number
  /** for unit = "hours" */
  hours?: number
}

export interface Course {
  id: ID
  branchId: ID
  name: string
  subject: string
  grades: string[]
  packageId: ID
}

export type ClassKind = "learning" | "test" | "interview" | "other"
export type ClassType = "group" | "single"

export interface Klass {
  id: ID
  branchId: ID
  name: string
  subject: string
  grades: string[]
  kind: ClassKind
  type: ClassType
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
}

export interface Session {
  id: ID
  branchId: ID
  classId: ID | null
  subject: string
  date: DateStr
  start: TimeStr
  minutes: number
  /** primary teacher */
  teacherId: ID | null
  coTeacherIds: ID[]
  roomId: ID | null
  studentIds: ID[]
  trial: boolean
  /** edited individually — class-level edits no longer overwrite it */
  customized: boolean
  cancelled: boolean
  cancelReason?: string
}

export type AttendanceStatus = "present" | "absent" | "leave"

export interface Attendance {
  sessionId: ID
  studentId: ID
  status: AttendanceStatus
  markedBy: ID
  markedAt: string
}

export type SummaryStatus = "draft" | "submitted" | "changes_requested" | "approved" | "sent"

export interface SummaryEvent {
  at: string
  by: ID
  action: "write" | "submit" | "request_changes" | "approve" | "send" | "edit"
  note?: string
}

export interface LessonSummary {
  id: ID
  sessionId: ID
  studentId: ID
  text: string
  status: SummaryStatus
  authorId: ID
  lastEditorId: ID
  history: SummaryEvent[]
}

export interface Parent {
  name: string
  phone: string
  lineLinked: boolean
  primary: boolean
}

export interface Family {
  id: ID
  name: string
  parents: Parent[]
  address?: string
  postcode?: string
  /** one LINE link code for the whole family (siblings share it) */
  lineCode?: { code: string; expiresAt: string }
}

export interface Student {
  id: ID
  familyId: ID | null
  branchId: ID
  name: string
  nickname: string
  grade: string
  usesBus: boolean
  birthDate?: DateStr
  school?: string
  note?: string
}

export type EntitlementKind = "subscription" | "sessions"

export interface Entitlement {
  id: ID
  studentId: ID
  courseId: ID
  classId: ID | null
  invoiceId: ID
  kind: EntitlementKind
  from: DateStr
  to: DateStr
  sessionsTotal: number
}

// ---------- Billing ----------

export interface BusLeg {
  date: DateStr
  pickup: boolean
  dropoff: boolean
}

export interface CourseLine {
  courseId: ID
  classId: ID | null
  startDate: DateStr
  periods: number
  /** required when the student already has an active entitlement for the course */
  overlapRemark?: string
}

export interface Invoice {
  id: ID
  branchId: ID
  studentId: ID
  /** assigned only when the PDF is generated — drafts never consume a number */
  number: string | null
  course: CourseLine | null
  bus: BusLeg[]
  bookFee: number
  advanceFee: number
  concession: { amount: number; remark: string } | null
  noteToParent: string
  status: InvoiceStatus
  pdf: "none" | "generating" | "ready" | "failed"
  createdBy: ID
  createdAt: string
  approvedBy?: ID
  sentAt?: string
  delivery?: "delivered" | "no_line"
  voidReason?: string
  payments: Payment[]
  receiptNumber?: string
}

export type InvoiceStatus = "draft" | "pending_approval" | "approved" | "sent" | "paid" | "void"

export interface Payment {
  id: ID
  amount: number
  method: "transfer" | "cash"
  reference: string
  recordedBy: ID
  recordedAt: string
  confirmedBy?: ID
}

export interface AppNotification {
  id: ID
  at: string
  kind: "low_sessions" | "session_cancelled" | "approval_needed" | "holiday_impact" | "info"
  title: string
  body: string
  read: boolean
  roles: Role[]
}

/** Result of any action — every action returns one so the UI can always show feedback. */
export type Result<T = void> = { ok: true; value: T; warnings?: string[] } | { ok: false; error: string }
