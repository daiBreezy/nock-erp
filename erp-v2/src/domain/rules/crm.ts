// CRM lead pipeline (Phase 2 rebuild). Spec ref: new-erp/js/crm.js (stage list + grouping).

import { daysBetween, fmtDate, toDateStr } from "../dates"
import type { Archived, TargetSchool, CourseWish, LeadKid, DateStr, TimeStr, Weekday, Family, FormSubmission, ID, Lead, LeadStage, Result, Student } from "../types"

export const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  new: "ลูกค้าใหม่",
  contacting: "กำลังติดต่อ",
  test_scheduled: "นัดสอบวัดระดับ",
  tested: "สอบแล้ว",
  trial_scheduled: "นัดทดลองเรียน",
  trialed: "ทดลองเรียนแล้ว",
  payment_pending: "รอชำระเงิน",
  enrolled: "ลงทะเบียนแล้ว",
  archived: "เก็บเข้าคลัง",
}

/**
 * A student added by hand with no lead behind it (owner 2026-10-21: walk-in / social — staff talk, then add the
 * student and invoice straight away) gets its lead record anyway, so the reports count them in the right channel:
 * an enroll-now lead (no Test / Trial) linked to the student, waiting for payment — it turns "enrolled" by itself when
 * the invoice is paid, like every other lead. Kept, never deleted: it is how this family came to us.
 */
export function leadForNewStudent(st: Pick<Student, "id" | "branchId" | "nickname" | "grade">, source: Lead["source"], at: { id: ID; by: ID; iso: string }): Lead {
  return {
    id: at.id, branchId: st.branchId, name: `ผู้ปกครองน้อง${st.nickname}`, childGrade: st.grade, subject: "", source,
    stage: "payment_pending", direct: true, assigneeId: at.by, phone: "", lineId: "", createdAt: at.iso, notes: [],
    convertedStudentId: st.id,
  }
}

export const LEAD_SOURCE_LABEL: Record<Lead["source"], string> = {
  line: "LINE OA",
  facebook: "Facebook",
  walkin: "Walk-in",
  phone: "โทรศัพท์",
  website: "เว็บไซต์",
  referral: "คนแนะนำ",
  other: "อื่นๆ",
}

export interface PipelineGroup {
  key: string
  label: string
  stages: LeadStage[]
}

/** Sub-stages folded into columns so the board reads as one funnel, not nine near-empty ones
 *  (owner 2026-09-29: 5 columns max — matches the reference board). Each card still shows its exact
 *  sub-stage as a chip when a column covers more than one (see `leadDetail`/LeadCard). */
export const PIPELINE_GROUPS: PipelineGroup[] = [
  { key: "contact", label: "ติดต่อ", stages: ["new", "contacting"] },
  { key: "test", label: "นัดสอบ", stages: ["test_scheduled", "tested"] },
  { key: "trial", label: "ทดลองเรียน", stages: ["trial_scheduled", "trialed"] },
  { key: "closing", label: "ปิดการขาย", stages: ["payment_pending", "enrolled"] },
  { key: "archived", label: "เก็บเข้าคลัง", stages: ["archived"] },
]

export function groupOf(stage: LeadStage): PipelineGroup {
  return PIPELINE_GROUPS.find((g) => g.stages.includes(stage))!
}

/** What the admin picks (owner 2026-10-05: "เอาแค่ 4 State" — the sub-steps inside move by themselves) */
export const BOARD_GROUPS = PIPELINE_GROUPS.filter((g) => g.key !== "archived")
/** picking a column puts the lead at its first step (the system moves it on from there) */
export const STAGE_FOR_GROUP: Record<string, LeadStage> = { contact: "contacting", test: "test_scheduled", trial: "trial_scheduled", closing: "payment_pending" }
/** the label staff see: the column, except for the two end states */
export const stageGroupLabel = (stage: LeadStage) => (stage === "enrolled" ? LEAD_STAGE_LABEL.enrolled : groupOf(stage).label)

/** Stages the board can drag a card onto directly — enrolled/archived need a dedicated action (student record / reason). */
export const DRAGGABLE_STAGES: LeadStage[] = ["new", "contacting", "test_scheduled", "tested", "trial_scheduled", "trialed", "payment_pending"]

export function daysAgo(createdAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86400000))
}

export function daysAgoLabel(createdAt: string, now: Date): string {
  const d = daysAgo(createdAt, now)
  return d === 0 ? "วันนี้" : `${d} วันก่อน`
}

const STAGE_ORDER: LeadStage[] = ["new", "contacting", "test_scheduled", "tested", "trial_scheduled", "trialed", "payment_pending", "enrolled"]

/** Automatic moves (form approved, child attended, invoice sent, payment confirmed) only ever push a lead forward —
 *  a late event never drags it back, and archived leads stay put. */
export function advanceStage(current: LeadStage, target: LeadStage): LeadStage {
  if (current === "archived") return current
  return STAGE_ORDER.indexOf(target) > STAGE_ORDER.indexOf(current) ? target : current
}

/** Drag-and-drop only moves between working stages; enrolling/archiving go through their own actions (need a record / a reason). */
export function canSetStage(current: LeadStage, target: LeadStage): Result {
  if (current === "archived") return { ok: false, error: "Lead นี้เก็บเข้าคลังแล้ว — เปิดรายละเอียดเพื่อกู้คืนก่อน" }
  if (target === "enrolled") return { ok: false, error: "เป็นนักเรียนเองเมื่อยืนยันยอดเงินของใบแจ้งหนี้" }
  if (target === "archived") return { ok: false, error: "ใช้ปุ่ม “เก็บเข้าคลัง” เพื่อใส่เหตุผล" }
  return { ok: true, value: undefined }
}

/** Where "กู้คืนจากคลัง" sends a lead back to — the stage it was archived from, or "new" when that's unknown
 *  (older data / archived from "archived" itself shouldn't happen, but never trap a lead there). */
export function restoreStage(l: Pick<Lead, "archivedFrom">): LeadStage {
  return l.archivedFrom && l.archivedFrom !== "archived" ? l.archivedFrom : "new"
}

/** every subject a lead is interested in (owner 2026-10-29) — older leads have only `subject` */
export function leadSubjects(l: Pick<Lead, "subject" | "subjects">): string[] {
  return l.subjects?.length ? l.subjects : l.subject ? [l.subject] : []
}

/** A lead needs a name and a way to reach them. Added from the chat (owner 2026-11-17) the LINE account is already known,
 *  so the name is all that is asked — grade / subject / phone come later. Added by hand: grade + subject (the pipeline
 *  card depends on them) and a phone OR a LINE ID (the phone alone is not required any more). */
export function validateLead(l: Pick<Lead, "name" | "childGrade" | "subject" | "phone"> & Partial<Pick<Lead, "lineId" | "lineUserId">>, opts?: { quick?: boolean }): string | null {
  if (!l.name.trim()) return "ใส่ชื่อผู้ปกครองหรือผู้ติดต่อ"
  if (opts?.quick) return null
  if (!l.childGrade.trim()) return "ใส่ระดับชั้นของลูก"
  if (!l.subject.trim()) return "เลือกวิชาที่สนใจ"
  // a lead that came from a real LINE chat already has a way to reach them (its LINE account) — phone / LINE ID can come later
  if (!l.phone.trim() && !l.lineId?.trim() && !l.lineUserId) return "ใส่เบอร์โทรหรือ LINE ID ติดต่อ"
  return null
}

/** A form came back for a chat that has no Lead (owner 2026-11-18: "ข้อมูลเรามันแน่นเกินกว่าจะสร้าง Lead แล้ว") — everything a Lead
 *  needs is in the answers: the main parent, their phone / LINE, the child's grade and the subjects they picked. The Lead takes the
 *  form's own `primaryLeadId`, so the submission and the new Lead already point at each other. */
export function leadFromSubmission(sub: Pick<FormSubmission, "primaryLeadId" | "branchId" | "parents" | "studentGrade" | "picks" | "acquisitions" | "lineUserId">, o: { nowIso: string; assigneeId: ID | null }): Lead {
  const parent = sub.parents.find((p) => p.primary) ?? sub.parents[0]
  const subjects = [...new Set(sub.picks.map((p) => p.chosenSubject))]
  return {
    id: sub.primaryLeadId, branchId: sub.branchId, name: parent?.name ?? "", childGrade: sub.studentGrade, subject: subjects[0] ?? "", subjects,
    source: sub.acquisitions?.[0] ?? "line", stage: "new", assigneeId: o.assigneeId, phone: parent?.phone ?? "", lineId: parent?.lineId ?? "",
    createdAt: o.nowIso, notes: [], convertedStudentId: null, ...(sub.lineUserId ? { lineUserId: sub.lineUserId } : {}),
  }
}

/** Last time staff actually reached out — the most recent note, or creation if nothing's logged yet.
 *  "days ago" on a "กำลังติดต่อ" card must count from here, not from createdAt (that's just when the lead arrived). */
export function lastContactAt(l: Pick<Lead, "notes" | "createdAt" | "followUps">): string {
  return [l.createdAt, ...l.notes.map((n) => n.at), ...(l.followUps ?? []).map((f) => f.at)].sort().at(-1)!
}

/** Countdown to a test/trial appointment — same day-math as `sendDeadline` in summaries.ts (calendar days, not ms). */
export function scheduleInfo(scheduledAt: string, now: Date): { date: DateStr; daysLeft: number; overdue: boolean } {
  const date = toDateStr(new Date(scheduledAt))
  const daysLeft = daysBetween(toDateStr(now), date)
  return { date, daysLeft, overdue: daysLeft < 0 }
}

export interface LeadDetail {
  text: string
  /** same fact, without the weekday prefix — fits the Kanban card's narrower row (table/sheet use `text`). */
  shortText: string
  /** severity only — no UI/colour knowledge in domain/rules; the component maps this to a Pill tone. */
  level: "muted" | "info" | "warn" | "danger"
}

/** The one glanceable fact each pipeline stage needs — shared by the Kanban card, the table row and the
 *  lead sheet so the three views can never drift out of sync with each other. */
export function leadDetail(l: Pick<Lead, "stage" | "createdAt" | "notes" | "scheduledAt" | "archiveReason" | "archivedFrom" | "followUps">, now: Date): LeadDetail {
  const plain = (text: string, level: LeadDetail["level"]): LeadDetail => ({ text, shortText: text, level })

  if (l.stage === "archived") {
    const from = l.archivedFrom && l.archivedFrom !== "archived" ? LEAD_STAGE_LABEL[l.archivedFrom] : null
    const reason = l.archiveReason || "ไม่ระบุเหตุผล"
    return plain(from ? `จาก "${from}" · ${reason}` : reason, "muted")
  }
  if (l.stage === "enrolled") return plain("ลงทะเบียนแล้ว", "info")

  if (l.stage === "test_scheduled" || l.stage === "trial_scheduled") {
    if (!l.scheduledAt) return plain("ยังไม่นัดวัน", "warn")
    const { date, daysLeft, overdue } = scheduleInfo(l.scheduledAt, now)
    const long = fmtDate(date, { weekday: true })
    const short = fmtDate(date)
    if (overdue) { const suffix = `เลยนัด ${-daysLeft} ว`; return { text: `${long} · ${suffix}`, shortText: `${short} · ${suffix}`, level: "danger" } }
    const suffix = daysLeft === 0 ? "วันนี้" : daysLeft === 1 ? "พรุ่งนี้" : `อีก ${daysLeft} ว`
    return { text: `${long} · ${suffix}`, shortText: `${short} · ${suffix}`, level: daysLeft <= 1 ? "warn" : "info" }
  }
  if (l.stage === "tested") return plain("สอบแล้ว · รอนัดทดลองเรียน", "info")
  if (l.stage === "trialed") return plain("ทดลองเรียนแล้ว · รอออกใบแจ้งหนี้", "info")
  if (l.stage === "payment_pending") return plain("รอผู้ปกครองชำระเงิน", "warn")

  // new / contacting: how long since we actually talked to them, not since the lead first arrived
  const days = daysAgo(lastContactAt(l), now)
  if (l.stage === "new") return days === 0 ? plain("เพิ่งเข้ามาวันนี้", "info") : plain(`รอติดต่อมา ${days} ว`, days >= 2 ? "warn" : "info")
  return days === 0 ? plain("ติดต่อวันนี้", "muted") : plain(`ติดต่อล่าสุด ${days} ว ก่อน`, days >= 3 ? "warn" : "muted")
}

export interface CrmKpis {
  total: number
  /** not yet enrolled or archived */
  active: number
  /** test/trial appointment due today or tomorrow */
  dueSoon: number
  /** test/trial appointment date already passed without a result */
  overdue: number
  enrolled: number
  /** enrolled ÷ total, rounded to the nearest percent */
  conversionRate: number
}

export function crmKpis(leads: Lead[], now: Date): CrmKpis {
  const total = leads.length
  const active = leads.filter((l) => l.stage !== "enrolled" && l.stage !== "archived").length
  const appointments = leads
    .filter((l) => l.scheduledAt && (l.stage === "test_scheduled" || l.stage === "trial_scheduled"))
    .map((l) => scheduleInfo(l.scheduledAt!, now))
  const overdue = appointments.filter((a) => a.overdue).length
  const dueSoon = appointments.filter((a) => !a.overdue && a.daysLeft <= 1).length
  const enrolled = leads.filter((l) => l.stage === "enrolled").length
  return { total, active, dueSoon, overdue, enrolled, conversionRate: total ? Math.round((enrolled / total) * 100) : 0 }
}

/**
 * Test / Trial for a family that is already a customer (owner 2026-10-19: e.g. a second child) — the funnel runs on
 * a lead, so the child gets its own one, contacted through the family's primary parent and LINE. Approving the form
 * then adds the child to this family (matched by LINE / phone), never a duplicate family.
 */
export function siblingLead(f: Family, input: { id: ID; branchId: ID; childGrade: string; subject: string; by: ID; now: string }): Lead {
  const parent = f.parents.find((p) => p.primary) ?? f.parents[0]
  return {
    id: input.id, branchId: input.branchId, name: parent?.name ?? f.name, childGrade: input.childGrade, subject: input.subject,
    source: f.sources?.[0] ?? "line", stage: "contacting", assigneeId: input.by, phone: parent?.phone ?? "", lineId: parent?.lineId ?? "",
    lineUserId: f.lineUserId, createdAt: input.now, convertedStudentId: null,
    notes: [{ at: input.now, by: input.by, text: `ลูกอีกคนของ${f.name} — ส่งฟอร์ม Test / Trial จาก Inbox` }],
  }
}

/** owner 2026-11-20: a Lead's children as grades — one entry per child (1 child = 1 grade). The first is always `childGrade` (the edit form still sets that one);
 *  older leads that only have a `childCount` get "" (not known yet) for the others. */
export function childGradesOf(l: Pick<Lead, "childGrade" | "childGrades" | "childCount">): string[] {
  const n = Math.max(1, l.childGrades?.length ?? 0, l.childCount ?? 1)
  return Array.from({ length: n }, (_, i) => (i === 0 ? l.childGrade : l.childGrades?.[i] ?? ""))
}

const norm = (x?: string) => (x ?? "").trim().toLowerCase()

/**
 * owner 2026-11-20: the children of a Lead, each with their own name · grade · subjects / courses · note. Older leads (no `kids`) become kid 1 from the flat fields
 * (+ blank kids up to their count); children that came in on the parent's forms / the family file fill the blank names first, then join as new kids (matched by name).
 */
export function leadKids(lead: Pick<Lead, "kids" | "childGrade" | "childGrades" | "childCount" | "subject" | "subjects" | "interestCourseIds">, known: { name: string; grade: string; alias?: string }[] = []): LeadKid[] {
  const kids: LeadKid[] = lead.kids?.length
    ? lead.kids.map((k) => ({ ...k }))
    : childGradesOf(lead).map((grade, i) => ({ id: `k${i + 1}`, name: "", grade, subjects: i === 0 ? leadSubjects(lead) : [], courseIds: i === 0 ? [...(lead.interestCourseIds ?? [])] : [], note: "" }))
  for (const f of known) {
    const hit = kids.find((k) => k.name && (norm(k.name) === norm(f.name) || norm(k.name) === norm(f.alias)))
    if (hit) { if (!hit.grade && f.grade) hit.grade = f.grade; continue }
    const blank = kids.find((k) => !k.name)
    if (blank) { blank.name = f.alias || f.name; if (!blank.grade) blank.grade = f.grade }
    else kids.push({ id: `k${kids.length + 1}`, name: f.alias || f.name, grade: f.grade, subjects: [], courseIds: [], note: "" })
  }
  return kids
}

/** owner 2026-11-20: the courses staff marked as "interested" for THIS child — the invoice starts with them ticked. The kid matched by name; a lone kid, or no match → every course the lead is interested in */
export function interestCourseIdsFor(lead: Pick<Lead, "kids" | "childGrade" | "childGrades" | "childCount" | "subject" | "subjects" | "interestCourseIds">, child?: { name?: string; nickname?: string }): ID[] {
  const kids = leadKids(lead)
  const hit = child ? kids.find((k) => k.name && (norm(k.name) === norm(child.nickname) || norm(k.name) === norm(child.name))) : undefined
  const ids = hit ? hit.courseIds : kids.length === 1 ? kids[0].courseIds : kids.flatMap((k) => k.courseIds)
  return [...new Set(ids)]
}

/** the flat Lead fields the rest of the app reads (board filters, lists, Reports) — derived from the kids: kid 1's grade, every kid's subjects and courses */
export function flatFromKids(kids: LeadKid[]): Pick<Lead, "kids" | "childGrade" | "childGrades" | "childCount" | "subject" | "subjects" | "interestCourseIds"> {
  const subjects = [...new Set(kids.flatMap((k) => k.subjects))]
  return { kids, childGrade: kids[0]?.grade ?? "", childGrades: kids.map((k) => k.grade), childCount: kids.length, subject: subjects[0] ?? "", subjects, interestCourseIds: [...new Set(kids.flatMap((k) => k.courseIds))] }
}

/** owner 2026-11-25: the Lead's kid a Student came from — by link, else (the lead's own trial / converted Student) by name, else the lone kid */
export function kidForStudent(leads: Pick<Lead, "kids" | "childGrade" | "childGrades" | "childCount" | "subject" | "subjects" | "interestCourseIds" | "trialStudentId" | "convertedStudentId">[], student?: { id: string; name?: string; nickname?: string }): LeadKid | undefined {
  if (!student) return undefined
  for (const l of leads) { const k = l.kids?.find((x) => x.studentId === student.id); if (k) return k }
  const lead = leads.find((l) => l.trialStudentId === student.id || l.convertedStudentId === student.id)
  if (!lead) return undefined
  const kids = leadKids(lead)
  return kids.find((k) => k.name && (norm(k.name) === norm(student.nickname) || norm(k.name) === norm(student.name))) ?? (kids.length === 1 ? kids[0] : undefined)
}

/** owner 2026-11-25: a new invoice line starts with what the parent wished for: the classes that sit on the wished weekday + time, and the start day */
export function lineFromWish(wish: CourseWish | undefined, options: { id: string; weekday: Weekday; start: TimeStr }[]): { classIds: string[]; startDate?: DateStr } {
  if (!wish) return { classIds: [] }
  const classIds = wish.slots.flatMap((sl) => options.filter((k) => k.weekday === sl.weekday && k.start === sl.start).map((k) => k.id))
  return { classIds: [...new Set(classIds)], startDate: wish.startDate }
}

/** which of a kid's wanted things are still unknown — what the Lead panel lists as missing for the invoice */
export function wishGaps(kid: Pick<LeadKid, "courseIds" | "wishes">): { noCourse: boolean; noSlot: ID[]; noStart: ID[] } {
  return {
    noCourse: kid.courseIds.length === 0,
    noSlot: kid.courseIds.filter((id) => !kid.wishes?.[id]?.slots.length),
    noStart: kid.courseIds.filter((id) => !kid.wishes?.[id]?.startDate),
  }
}

/** owner 2026-11-25: a Lead's place in the shared Archived box — the new envelope, else built from the older stage + close-lead form so nothing is lost */
export function archivedOf(lead: Pick<Lead, "stage" | "archived" | "lost" | "archiveReason" | "createdAt">): Archived | undefined {
  if (lead.archived) return lead.archived
  if (lead.stage !== "archived") return undefined
  return { at: lead.lost?.at ?? lead.createdAt, by: lead.lost?.by ?? "", reason: lead.archiveReason ?? "", kind: "lead_lost" }
}

export interface ArchiveEntry { kind: "lead_lost" | "customer_exit"; type: "lead" | "family" | "student"; id: string; name: string; at: string; by: string; reason: string }

/** ONE list of everyone archived — Leads and Customers together; the CRM shows `lead_lost`, the Families / Students pages `customer_exit` */
export function archiveBox(d: { leads: (Pick<Lead, "id" | "name" | "stage" | "archived" | "lost" | "archiveReason" | "createdAt">)[]; families: { id: string; name: string; archived?: Archived }[]; students: { id: string; name: string; archived?: Archived }[] }): ArchiveEntry[] {
  const out: ArchiveEntry[] = []
  for (const l of d.leads) { const a = archivedOf(l); if (a) out.push({ kind: a.kind ?? "lead_lost", type: "lead", id: l.id, name: l.name, at: a.at, by: a.by, reason: a.reason }) }
  for (const f of d.families) if (f.archived) out.push({ kind: f.archived.kind ?? "customer_exit", type: "family", id: f.id, name: f.name, at: f.archived.at, by: f.archived.by, reason: f.archived.reason })
  for (const s of d.students) if (s.archived) out.push({ kind: s.archived.kind ?? "customer_exit", type: "student", id: s.id, name: s.name, at: s.archived.at, by: s.archived.by, reason: s.archived.reason })
  return out.sort((a, b) => b.at.localeCompare(a.at))
}

/**
 * owner 2026-11-25: ONE place for each fact. The parent lives on the FAMILY file, a child on the STUDENT record — the Lead only keeps what is
 * about the sale (interested courses, wished days, start day, notes). The Lead's own name / phone / kids' name · grade · target schools are a
 * cache the store re-derives from those records after every edit (`pullFromRecords`), so no screen can ever show two different answers.
 */
export function pullFromRecords<L extends Pick<Lead, "name" | "phone" | "lineId" | "kids" | "childGrade" | "childGrades" | "childCount" | "subject" | "subjects" | "interestCourseIds">>(
  lead: L,
  family: { parents: { name: string; phone: string; lineId?: string; primary?: boolean }[] } | undefined,
  students: { id: string; name: string; nickname: string; grade: string; targetSchools?: TargetSchool[] }[],
): L {
  const main = family?.parents.find((p) => p.primary) ?? family?.parents[0]
  const name = main?.name?.trim() ? main.name : lead.name
  const phone = main ? main.phone : lead.phone
  const linked = (lead.kids ?? []).some((k) => k.studentId && students.some((s) => s.id === k.studentId))
  const lineId = main?.lineId?.trim() ? main.lineId : lead.lineId
  let next: L = { ...lead, name, phone, lineId }
  if (linked) {
    const kids = (lead.kids ?? []).map((k) => {
      const st = k.studentId ? students.find((s) => s.id === k.studentId) : undefined
      return st ? { ...k, name: st.nickname || st.name, grade: st.grade, targetSchools: st.targetSchools?.length ? st.targetSchools : k.targetSchools } : k
    })
    next = { ...next, ...flatFromKids(kids) }
  }
  const same = next.name === lead.name && next.phone === lead.phone && next.lineId === lead.lineId && JSON.stringify(next.kids) === JSON.stringify(lead.kids) && next.childGrade === lead.childGrade
  return same ? lead : next
}

/** the kids that have a name and a grade but no Student record yet — a Student (Lead state) is made for each, so the child is on file from the start */
export function kidsNeedingStudent(kids: LeadKid[], students: { id: string }[]): LeadKid[] {
  return kids.filter((k) => k.name.trim() && k.grade && !(k.studentId && students.some((s) => s.id === k.studentId)))
}

/** the Lead-side edit of a child that belongs to the Student record, to write there (kid name = the Student's nickname; the full name only follows when it was just the nickname) */
export function studentPatchFromKid(kid: LeadKid, st: { name: string; nickname: string }): { name: string; nickname: string; grade: string; targetSchools?: TargetSchool[] } {
  const nick = kid.name.trim()
  return { name: st.name === st.nickname ? nick : st.name, nickname: nick || st.nickname, grade: kid.grade, targetSchools: kid.targetSchools }
}
