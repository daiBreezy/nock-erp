// Families, students, staff and LINE linking (S4, S5, S6, F2, Flow E).

import { GLOBAL_ROLES } from "./permissions"
import { addDays } from "../dates"
import type { DateStr, Family, FormParentInput, FormSubmission, ID, Lead, Result, Session, Staff, Student } from "../types"
import { teachersOf } from "./scheduling"

const digits = (s: string) => s.replace(/\D/g, "")

/** Thai phone: 9–10 digits starting with 0 (landline 02-xxx-xxxx, mobile 08x-xxx-xxxx) */
export function validPhone(p: string) {
  const d = digits(p)
  return /^0\d{8,9}$/.test(d) && /^[\d\s-]+$/.test(p.trim())
}

export function formatPhone(p: string) {
  const d = digits(p)
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : d.length === 9 ? `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}` : p
}

export interface FieldError {
  field: string
  message: string
}

/** S4: family form validated before saving. Also catches same-submission data mistakes (owner
 *  2026-09-29: a reference form he was shown had two different parents with the identical phone
 *  number entered by accident) — one phone can't belong to two parents in the same family. */
export function validateFamily(f: Pick<Family, "name" | "parents" | "postcode">): FieldError[] {
  const errs: FieldError[] = []
  if (!f.name.trim()) errs.push({ field: "name", message: "ใส่ชื่อครอบครัว" })
  if (!f.parents.length) errs.push({ field: "parents", message: "ต้องมีผู้ปกครองอย่างน้อย 1 คน" })
  f.parents.forEach((p, i) => {
    if (!p.name.trim()) errs.push({ field: `parent${i}.name`, message: `ผู้ปกครองคนที่ ${i + 1}: ใส่ชื่อ` })
    if (!validPhone(p.phone)) errs.push({ field: `parent${i}.phone`, message: `ผู้ปกครองคนที่ ${i + 1}: เบอร์โทรไม่ถูกต้อง (เช่น 081-234-5678)` })
    const dup = f.parents.findIndex((other, j) => j < i && digits(other.phone) && digits(other.phone) === digits(p.phone))
    if (dup !== -1) errs.push({ field: `parent${i}.phone`, message: `ผู้ปกครองคนที่ ${i + 1}: เบอร์โทรซ้ำกับผู้ปกครองคนที่ ${dup + 1}` })
  })
  if (f.parents.filter((p) => p.primary).length !== 1 && f.parents.length) errs.push({ field: "parents", message: "เลือกผู้ปกครองหลัก 1 คน" })
  if (f.postcode && !/^\d{5}$/.test(f.postcode)) errs.push({ field: "postcode", message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" })
  return errs
}

/** "ภูมิ (ด.ช. ภูมิ ใจดี · ป.5 · ครอบครัวใจดี)" — nicknames repeat, so lists that act on a student show enough to tell them apart */
export function studentLabel(s: Pick<Student, "nickname" | "name" | "grade">, familyName?: string) {
  return `${s.nickname} (${[s.name, s.grade, familyName].filter(Boolean).join(" · ")})`
}

/** link that opens Create Invoice pre-filled to renew one package (same course + class, from the day after it ends) */
export const renewHref = (studentId: ID, entitlementId: ID) => `/billing?new=${studentId}&renew=${entitlementId}`

const NAME_PREFIX = /^(ด\.ช\.|ด\.ญ\.|เด็กชาย|เด็กหญิง|นางสาว|นาย|นาง|น\.ส\.|คุณแม่|คุณพ่อ|คุณ)\s*/

/** "ด.ช. ภูมิ ใจดี" → ["ภูมิ", "ใจดี"] (title prefix dropped) */
function nameParts(full: string) {
  return full.trim().replace(NAME_PREFIX, "").split(/\s+/).filter(Boolean)
}

/** Nickname guess for a student created from a parent form: the first name without the title ("ด.ช. ภูมิ ใจดี" → "ภูมิ"). Staff can edit it later. */
export function nicknameFrom(fullName: string) {
  return nameParts(fullName)[0] ?? fullName.trim()
}

/**
 * The family a lead becomes (E2E test 2026-09-28: converting a lead used to drop the parent — no family,
 * no phone, no LINE — so the first invoice could never reach the parent). Named after the child's surname,
 * the lead is the primary parent, and the lead's LINE identity carries over.
 */
export function familyFromLead(
  lead: Pick<Lead, "name" | "phone" | "lineUserId">,
  child: { studentName: string; parentName?: string; parentPhone?: string },
  id: ID,
): Family {
  const parts = nameParts(child.studentName)
  const surname = parts.length > 1 ? parts[parts.length - 1] : nameParts(lead.name).slice(-1)[0] ?? lead.name
  return {
    id,
    name: `ครอบครัว${surname}`,
    parents: [{ name: child.parentName?.trim() || lead.name, phone: formatPhone(child.parentPhone?.trim() || lead.phone), lineLinked: !!lead.lineUserId, primary: true }],
    lineUserId: lead.lineUserId,
  }
}

/** Same family a Test/Trial submission becomes, but built from the submission's own `parents[]` instead
 *  of collapsing to the lead's single name/phone — used once the form actually collected full parent
 *  details (see approveTestTrialSubmission). The first parent listed is the one who logged into LINE to
 *  submit, so only they get `lineLinked`/`primary`; others can be corrected by staff afterwards. */
export function familyFromSubmission(studentName: string, parents: FormParentInput[], family: { address?: string; postcode?: string; province?: string; location?: Family["location"]; addressNote?: string; sources?: Family["sources"]; taxInfo?: Family["taxInfo"] }, lineUserId: string | undefined, id: ID): Family {
  const parts = nameParts(studentName)
  const parentSurname = parents[0] ? nameParts(parents[0].name).slice(-1)[0] : undefined
  const surname = parts.length > 1 ? parts[parts.length - 1] : parentSurname ?? "ครอบครัวใหม่"
  // the parent marked "default contact" on the form is primary; none marked → the first one
  const primaryAt = Math.max(0, parents.findIndex((p) => p.primary))
  return {
    id,
    name: `ครอบครัว${surname}`,
    parents: parents.map((p, i) => ({
      name: p.name.trim(), phone: formatPhone(p.phone.trim()), email: p.email?.trim() || undefined,
      relationship: p.relationship?.trim() || undefined, birthDate: p.birthDate,
      lineId: p.lineId?.trim() || undefined, altPhones: p.altPhones?.map((x) => formatPhone(x.trim())).filter(Boolean),
      lineLinked: i === 0 && !!lineUserId, primary: i === primaryAt,
    })),
    address: family.address?.trim() || undefined,
    postcode: family.postcode?.trim() || undefined,
    province: family.province?.trim() || undefined,
    location: family.location,
    addressNote: family.addressNote?.trim() || undefined,
    sources: family.sources?.length ? family.sources : undefined,
    taxInfo: family.taxInfo,
    lineUserId,
  }
}

/** Conflict-safe lookup before creating a new Family from a submission: match by LINE identity first
 *  (same as `ensureLeadFamily` already does), then by any parent phone already on file — so a family that
 *  submits a second form (different LINE account, same phone) gets found instead of duplicated. Never
 *  merges automatically; the caller still shows the match to staff before anything is overwritten. */
export function matchExistingFamily(families: Family[], criteria: { lineUserId?: string; phones: string[] }): Family | null {
  if (criteria.lineUserId) {
    const byLine = families.find((f) => f.lineUserId === criteria.lineUserId)
    if (byLine) return byLine
  }
  const wanted = new Set(criteria.phones.map(digits).filter(Boolean))
  if (!wanted.size) return null
  return families.find((f) => f.parents.some((p) => wanted.has(digits(p.phone)) || (p.altPhones ?? []).some((x) => wanted.has(digits(x))))) ?? null
}

export function validateStudent(s: Pick<Student, "name" | "nickname" | "grade" | "birthDate">, today: DateStr): FieldError[] {
  const errs: FieldError[] = []
  if (!s.name.trim()) errs.push({ field: "name", message: "ใส่ชื่อ-นามสกุล" })
  if (!s.nickname.trim()) errs.push({ field: "nickname", message: "ใส่ชื่อเล่น" })
  if (!s.grade) errs.push({ field: "grade", message: "เลือกระดับชั้น" })
  if (s.birthDate) {
    if (s.birthDate > today) errs.push({ field: "birthDate", message: "วันเกิดอยู่ในอนาคต" })
    else if (s.birthDate < addDays(today, -365 * 25)) errs.push({ field: "birthDate", message: "วันเกิดเก่าเกินไป ตรวจสอบปี (ค.ศ.)" })
  }
  return errs
}

/** S5: no-login part-timers do not need an email */
export function validateStaff(s: Pick<Staff, "name" | "nickname" | "roles" | "branchIds" | "canLogin" | "email" | "assignments">, all: Staff[], selfId?: ID): FieldError[] {
  const errs: FieldError[] = []
  if (!s.name.trim()) errs.push({ field: "name", message: "ใส่ชื่อ" })
  if (!s.nickname.trim()) errs.push({ field: "nickname", message: "ใส่ชื่อเล่น" })
  if (!s.roles.length) errs.push({ field: "roles", message: "เลือกบทบาทอย่างน้อย 1" })
  if (!s.branchIds.length) errs.push({ field: "branchIds", message: "เลือกสาขาอย่างน้อย 1" })
  // owner 2026-10-09: per branch — a branch row needs a role (unless company-wide), a teacher there needs a subject
  const global = s.roles.some((r) => GLOBAL_ROLES.includes(r))
  for (const a of s.assignments ?? []) {
    if (!a.roles.length && !global) errs.push({ field: `branch:${a.branchId}`, message: "เลือกบทบาทของสาขานี้อย่างน้อย 1" })
    if (a.roles.includes("teacher") && !a.subjects.length) errs.push({ field: `branch:${a.branchId}`, message: "ครูต้องมีวิชาที่สอนในสาขานี้อย่างน้อย 1 วิชา" })
  }
  // S5 (owner 2026-10-09): email optional without a login, but a typed one must still be valid
  if (s.canLogin && !s.email?.trim()) errs.push({ field: "email", message: "บัญชีที่ล็อกอินได้ต้องมีอีเมลที่ถูกต้อง" })
  else if (s.email?.trim()) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errs.push({ field: "email", message: "อีเมลไม่ถูกต้อง" })
    else if (all.some((x) => x.id !== selfId && x.email?.toLowerCase() === s.email!.toLowerCase())) errs.push({ field: "email", message: "อีเมลนี้มีคนใช้แล้ว" })
  }
  return errs
}

/** F2: a teacher with future sessions must be replaced before deactivation */
export function futureSessionsOf(teacherId: ID, sessions: Session[], today: DateStr) {
  return sessions.filter((s) => !s.cancelled && s.date >= today && teachersOf(s).includes(teacherId))
}

/** Every teacher currently teaching this student, from upcoming sessions — covers one-off/make-up sessions too, not just their entitlement's class. */
export function teachersOfStudent(studentId: ID, sessions: Session[], today: DateStr) {
  const ids = new Set<ID>()
  sessions.filter((s) => !s.cancelled && s.date >= today && s.studentIds.includes(studentId)).forEach((s) => teachersOf(s).forEach((t) => ids.add(t)))
  return [...ids]
}

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O/1/I

/** Flow E: one-time family code, valid 7 days */
export function newLineCode(now: Date, rnd: () => number = Math.random) {
  const code = Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(rnd() * CODE_CHARS.length)]).join("")
  return { code, expiresAt: new Date(now.getTime() + 7 * 86400000).toISOString() }
}

export function lineCodeValid(f: Family, now: Date): Result {
  if (!f.lineCode) return { ok: false, error: "ยังไม่ได้สร้างโค้ด" }
  if (new Date(f.lineCode.expiresAt) < now) return { ok: false, error: "โค้ดหมดอายุแล้ว — สร้างใหม่" }
  return { ok: true, value: undefined }
}

/**
 * Student search for pickers — never renders the whole school (100,000 students must still be fast):
 * matches name / nickname / grade / school, best matches first (preferred grades, then starts-with),
 * capped at `limit`. Empty query returns nothing unless `preferGrades` narrows it to a class's grades.
 */
export function searchStudents<T extends { id: string; name: string; nickname: string; grade: string; school?: string }>(
  all: T[], q: string, opts: { exclude?: string[]; preferGrades?: string[]; limit?: number } = {},
): { items: T[]; total: number } {
  const limit = opts.limit ?? 8
  const needle = q.trim().toLowerCase()
  const exclude = new Set(opts.exclude ?? [])
  const prefer = new Set(opts.preferGrades ?? [])
  if (!needle && !prefer.size) return { items: [], total: 0 }
  const hits: { s: T; score: number }[] = []
  for (const s of all) {
    if (exclude.has(s.id)) continue
    const hay = `${s.nickname} ${s.name} ${s.grade} ${s.school ?? ""}`.toLowerCase()
    if (needle && !hay.includes(needle)) continue
    if (!needle && !prefer.has(s.grade)) continue
    const score = (prefer.has(s.grade) ? 0 : 2) + (needle && (s.nickname.toLowerCase().startsWith(needle) || s.name.toLowerCase().startsWith(needle)) ? 0 : 1)
    hits.push({ s, score })
  }
  hits.sort((a, b) => a.score - b.score || a.s.nickname.localeCompare(b.s.nickname, "th"))
  return { items: hits.slice(0, limit).map((h) => h.s), total: hits.length }
}

/** Human-readable field changes for the student Timeline ("ชั้น ป.5 → ป.6"). */
export function studentChanges(a: Student, b: Student, familyName: (id: string) => string): string[] {
  const out: string[] = []
  const f = (label: string, x: unknown, y: unknown, show: (v: unknown) => string = (v) => (v === undefined || v === null || v === "" ? "—" : String(v))) => {
    if (show(x) !== show(y)) out.push(`${label} ${show(x)} → ${show(y)}`)
  }
  f("ชื่อ", a.name, b.name)
  f("ชื่อเล่น", a.nickname, b.nickname)
  f("ชั้น", a.grade, b.grade)
  f("โรงเรียน", a.school, b.school)
  f("วันเกิด", a.birthDate, b.birthDate)
  f("ใช้รถรับส่ง", a.usesBus, b.usesBus, (v) => (v ? "ใช้" : "ไม่ใช้"))
  f("ครอบครัว", a.familyId, b.familyId, (v) => (v ? familyName(String(v)) : "—"))
  f("หมายเหตุ", a.note, b.note)
  return out
}

// ---------- a returning family edits its details in a form (owner 2026-09-30) ----------

export interface FormChange { key: string; label: string; from: string; to: string }

const sameDigits = (a?: string, b?: string) => !!a && !!b && digits(a) === digits(b)
const put = (out: FormChange[], key: string, label: string, from: string | undefined, to: string | undefined) => {
  // an empty answer keeps what we have — a form never erases data on file
  if (to?.trim() && to.trim() !== (from ?? "").trim()) out.push({ key, label, from: from?.trim() || "—", to: to.trim() })
}

/** What the form says differently from the family/student on file — shown to staff before anything is overwritten. */
export function submissionChanges(family: Family | undefined, student: Student | undefined, sub: FormSubmission): FormChange[] {
  const out: FormChange[] = []
  if (family) {
    sub.parents.forEach((p, i) => {
      const cur = family.parents.find((x) => sameDigits(x.phone, p.phone) || x.name.trim() === p.name.trim())
      if (!cur) return void out.push({ key: `parent${i}`, label: "เพิ่มผู้ปกครอง", from: "—", to: `${p.name} · ${p.phone}` })
      const who = `ผู้ปกครอง ${cur.name}`
      put(out, `parent${i}.name`, `${who}: ชื่อ`, cur.name, p.name)
      if (!sameDigits(cur.phone, p.phone)) put(out, `parent${i}.phone`, `${who}: เบอร์หลัก`, cur.phone, p.phone)
      put(out, `parent${i}.email`, `${who}: อีเมล`, cur.email, p.email)
      put(out, `parent${i}.lineId`, `${who}: LINE ID`, cur.lineId, p.lineId)
      put(out, `parent${i}.relationship`, `${who}: ความสัมพันธ์`, cur.relationship, p.relationship)
      put(out, `parent${i}.birthDate`, `${who}: วันเกิด`, cur.birthDate, p.birthDate)
      const added = (p.altPhones ?? []).filter((x) => x.trim() && ![cur.phone, ...(cur.altPhones ?? [])].some((y) => sameDigits(x, y)))
      if (added.length) out.push({ key: `parent${i}.altPhones`, label: `${who}: เบอร์เพิ่ม`, from: (cur.altPhones ?? []).join(", ") || "—", to: [...(cur.altPhones ?? []), ...added].join(", ") })
    })
    put(out, "address", "ที่อยู่", family.address, sub.familyAddress)
    put(out, "province", "จังหวัด", family.province, sub.familyProvince)
    put(out, "postcode", "รหัสไปรษณีย์", family.postcode, sub.familyPostcode)
    put(out, "addressNote", "รายละเอียดที่อยู่", family.addressNote, sub.familyAddressNote)
    const loc = (l?: { lat: number; lng: number }) => (l ? `${l.lat.toFixed(5)}, ${l.lng.toFixed(5)}` : undefined)
    put(out, "location", "หมุดแผนที่", loc(family.location), loc(sub.familyLocation))
    const newSources = (sub.acquisitions ?? []).filter((x) => !(family.sources ?? []).includes(x))
    if (newSources.length) out.push({ key: "sources", label: "รู้จักเราจาก", from: (family.sources ?? []).join(", ") || "—", to: [...(family.sources ?? []), ...newSources].join(", ") })
    if (sub.taxInfo?.taxId && sub.taxInfo.taxId !== family.taxInfo?.taxId) out.push({ key: "taxInfo", label: "ใบกำกับภาษี", from: family.taxInfo ? `${family.taxInfo.customerName} · ${family.taxInfo.taxId}` : "—", to: `${sub.taxInfo.customerName} · ${sub.taxInfo.taxId}` })
  }
  if (student) {
    put(out, "student.name", "นักเรียน: ชื่อ", student.name, sub.studentName)
    put(out, "student.nickname", "นักเรียน: ชื่อเล่น", student.nickname, sub.studentNickname)
    put(out, "student.grade", "นักเรียน: ชั้น", student.grade, sub.studentGrade)
    put(out, "student.birthDate", "นักเรียน: วันเกิด", student.birthDate, sub.studentBirthDate)
    put(out, "student.school", "นักเรียน: โรงเรียน", student.school, sub.studentSchool)
    put(out, "student.note", "นักเรียน: หมายเหตุ", student.note, sub.studentNote)
  }
  return out
}

/** Apply the form's non-empty answers onto what's on file (after staff confirmed). New parents are appended. */
export function mergeSubmission(family: Family | undefined, student: Student | undefined, sub: FormSubmission): { family?: Family; student?: Student } {
  const keep = <T,>(cur: T, next: T | undefined) => (typeof next === "string" ? (next.trim() ? next.trim() : cur) : next ?? cur)
  let f = family
  if (f) {
    const parents = [...f.parents]
    for (const p of sub.parents) {
      const i = parents.findIndex((x) => sameDigits(x.phone, p.phone) || x.name.trim() === p.name.trim())
      if (i < 0) { parents.push({ name: p.name.trim(), phone: formatPhone(p.phone), email: p.email, relationship: p.relationship, birthDate: p.birthDate, lineId: p.lineId, altPhones: p.altPhones, lineLinked: false, primary: false }); continue }
      const cur = parents[i]
      const alt = [...(cur.altPhones ?? []), ...(p.altPhones ?? []).filter((x) => x.trim() && ![cur.phone, ...(cur.altPhones ?? [])].some((y) => sameDigits(x, y)))]
      parents[i] = { ...cur, name: keep(cur.name, p.name), phone: p.phone?.trim() ? formatPhone(p.phone) : cur.phone, email: keep(cur.email, p.email), lineId: keep(cur.lineId, p.lineId), relationship: keep(cur.relationship, p.relationship), birthDate: keep(cur.birthDate, p.birthDate), altPhones: alt.length ? alt : undefined }
    }
    f = {
      ...f, parents,
      address: keep(f.address, sub.familyAddress), province: keep(f.province, sub.familyProvince), postcode: keep(f.postcode, sub.familyPostcode),
      addressNote: keep(f.addressNote, sub.familyAddressNote), location: sub.familyLocation ?? f.location,
      sources: [...new Set([...(f.sources ?? []), ...(sub.acquisitions ?? [])])],
      taxInfo: sub.taxInfo?.taxId ? sub.taxInfo : f.taxInfo,
    }
  }
  const st = student && {
    ...student, name: keep(student.name, sub.studentName), nickname: keep(student.nickname, sub.studentNickname), grade: keep(student.grade, sub.studentGrade),
    birthDate: keep(student.birthDate, sub.studentBirthDate), school: keep(student.school, sub.studentSchool), note: keep(student.note, sub.studentNote),
  }
  return { family: f, student: st }
}
