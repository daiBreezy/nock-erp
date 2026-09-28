// Families, students, staff and LINE linking (S4, S5, S6, F2, Flow E).

import { addDays } from "../dates"
import type { DateStr, Family, ID, Lead, Result, Session, Staff, Student } from "../types"
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

/** S4: family form validated before saving */
export function validateFamily(f: Pick<Family, "name" | "parents" | "postcode">): FieldError[] {
  const errs: FieldError[] = []
  if (!f.name.trim()) errs.push({ field: "name", message: "ใส่ชื่อครอบครัว" })
  if (!f.parents.length) errs.push({ field: "parents", message: "ต้องมีผู้ปกครองอย่างน้อย 1 คน" })
  f.parents.forEach((p, i) => {
    if (!p.name.trim()) errs.push({ field: `parent${i}.name`, message: `ผู้ปกครองคนที่ ${i + 1}: ใส่ชื่อ` })
    if (!validPhone(p.phone)) errs.push({ field: `parent${i}.phone`, message: `ผู้ปกครองคนที่ ${i + 1}: เบอร์โทรไม่ถูกต้อง (เช่น 081-234-5678)` })
  })
  if (f.parents.filter((p) => p.primary).length !== 1 && f.parents.length) errs.push({ field: "parents", message: "เลือกผู้ปกครองหลัก 1 คน" })
  if (f.postcode && !/^\d{5}$/.test(f.postcode)) errs.push({ field: "postcode", message: "รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก" })
  return errs
}

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
export function validateStaff(s: Pick<Staff, "name" | "nickname" | "roles" | "branchIds" | "canLogin" | "email">, all: Staff[], selfId?: ID): FieldError[] {
  const errs: FieldError[] = []
  if (!s.name.trim()) errs.push({ field: "name", message: "ใส่ชื่อ" })
  if (!s.nickname.trim()) errs.push({ field: "nickname", message: "ใส่ชื่อเล่น" })
  if (!s.roles.length) errs.push({ field: "roles", message: "เลือกบทบาทอย่างน้อย 1" })
  if (!s.branchIds.length) errs.push({ field: "branchIds", message: "เลือกสาขาอย่างน้อย 1" })
  if (s.canLogin) {
    if (!s.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email)) errs.push({ field: "email", message: "บัญชีที่ล็อกอินได้ต้องมีอีเมลที่ถูกต้อง" })
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
