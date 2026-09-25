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

export interface BreakTime {
  start: TimeStr
  end: TimeStr
  label: string
}

/** Date-range override of the weekly hours (e.g. summer hours, exam week) */
export interface SpecialPeriod {
  id: ID
  name: string
  from: DateStr
  to: DateStr
  hours: Record<Weekday, OpenHours | null>
}

export type FeeKind = "entry" | "book" | "exam" | "other"

export interface Fee {
  id: ID
  kind: FeeKind
  name: string
  price: number
}

export interface Promotion {
  id: ID
  name: string
  type: "pct" | "amount"
  value: number
  /** applies when the invoice buys at least this many periods (months / packs) */
  minPeriods: number
  active: boolean
  from?: DateStr
  to?: DateStr
}

export interface Branch {
  id: ID
  code: string
  name: string
  brand: Brand
  phone?: string
  email?: string
  address?: string
  lineId?: string
  rooms: Room[]
  /** null = closed that weekday */
  hours: Record<Weekday, OpenHours | null>
  /** breaks block scheduling unless overridden with a reason */
  breaks: Record<Weekday, BreakTime[]>
  specialPeriods: SpecialPeriod[]
  subjects: string[]
  grades: string[]
  defaultSessionMinutes: number
  busFeePerLeg: number
  fees: Fee[]
  promotions: Promotion[]
  bankAccount: { bank: string; name: string; number: string }
  /** legacy simple flag — kept so existing "delivered via LINE" simulation logic still works; set from the server-side /api/line/status check */
  lineOaConnected: boolean
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
  /** real LINE Messaging API user id, once linked via Inbox (see linkConversationToFamily) — enables real delivery, not just the lineLinked simulation flag */
  lineUserId?: string
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
  /** subject of the course — lets make-up / one-off sessions of the same subject use this package */
  subject: string
  classId: ID | null
  invoiceId: ID
  kind: EntitlementKind
  from: DateStr
  to: DateStr
  sessionsTotal: number
}

// ---------- CRM ----------

export type LeadStage =
  | "new" | "contacting"
  | "test_scheduled" | "tested"
  | "trial_scheduled" | "trialed"
  | "payment_pending" | "enrolled" | "archived"

export type LeadSource = "line" | "walkin" | "website" | "referral" | "other"

export interface LeadNote {
  at: string
  by: ID
  text: string
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

export type MessageKind = "text" | "form_request" | "form_submission"

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

export type ChatMessageMeta = FormRequestMeta | FormSubmissionMeta

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
  /** auto-applied best promotion (id kept so the invoice shows which one) */
  promotionId?: ID | null
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
  kind: "low_sessions" | "session_cancelled" | "approval_needed" | "holiday_impact" | "info" | "form_submitted"
  title: string
  body: string
  read: boolean
  roles: Role[]
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
  createdAt: string
  expiresAt: string
  used: boolean
}

export interface FormSubmission {
  id: ID
  token: string
  type: FormType
  leadId: ID
  conversationId: ID | null
  lineUserId: string
  parentName: string
  parentPhone: string
  studentName: string
  studentGrade: string
  chosenSubject: string
  /** denormalized snapshot — self-contained even if the token's offers later change */
  chosenSlot: FormOfferSlot
  status: FormStatus
  submittedAt: string
  reviewedAt?: string
  createdSessionId?: ID | null
  createdStudentId?: ID | null
}

/** Result of any action — every action returns one so the UI can always show feedback. */
export type Result<T = void> = { ok: true; value: T; warnings?: string[] } | { ok: false; error: string }
