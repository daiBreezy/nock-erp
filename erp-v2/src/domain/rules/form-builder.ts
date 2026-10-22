import { LEAD_SOURCE_LABEL } from "./crm"
import { DEFAULT_LOSS_REASONS } from "./loss"
import { PARENT_RELATIONS } from "./people"
import { IMPROVE_LABEL, REASON_LABEL } from "./survey"
import type { AddressAnswer, CustomFormResponse, Family, FormAnswer, FormBind, FormDef, FormField, FormFieldType, GroupEntry, ID, Student } from "../types"

// Form builder (owner 2026-10-22): the company builds its own forms in Settings › System › ฟอร์ม and tunes the ERP's
// own forms. A system form's "core" fields are what the ERP needs to work (always shown, can't be edited); its
// "optional" fields can be hidden; any form can get extra questions. Custom-form answers belong to a family.
// Round 2 (owner 2026-10-22 "ลุยเลย"): steps + a review step, repeating groups ("+ เพิ่มนักเรียน"), questions tied to
// the family's data (filled in, and the answer updates the record), choices from the system, address + map pin, and
// questions shown only after a certain answer — so the builder can make forms like the ERP's own.

export interface FieldTypeInfo { type: FormFieldType; label: string; group: "basic" | "choice" | "score" | "file" | "layout"; hint: string }

/** every kind of question, grouped for the "+ เพิ่มคำถาม" menu */
export const FIELD_TYPES: FieldTypeInfo[] = [
  { type: "text", label: "ข้อความสั้น", group: "basic", hint: "ชื่อ คำตอบสั้นๆ" },
  { type: "textarea", label: "ข้อความยาว", group: "basic", hint: "ความคิดเห็น รายละเอียด" },
  { type: "number", label: "ตัวเลข", group: "basic", hint: "จำนวน อายุ" },
  { type: "date", label: "วันที่", group: "basic", hint: "เลือกวันจากปฏิทิน" },
  { type: "time", label: "เวลา", group: "basic", hint: "ชั่วโมง : นาที" },
  { type: "phone", label: "เบอร์โทร", group: "basic", hint: "ตรวจรูปแบบเบอร์ให้" },
  { type: "email", label: "อีเมล", group: "basic", hint: "ตรวจรูปแบบอีเมลให้" },
  { type: "address", label: "ที่อยู่ + ปักหมุด", group: "basic", hint: "ที่อยู่ และหมุดบนแผนที่" },
  { type: "single", label: "เลือก 1 ข้อ", group: "choice", hint: "ปุ่มตัวเลือก (+ อื่นๆ ได้)" },
  { type: "multi", label: "เลือกหลายข้อ", group: "choice", hint: "ติ๊กได้หลายข้อ (+ อื่นๆ ได้)" },
  { type: "dropdown", label: "Dropdown", group: "choice", hint: "รายการยาวๆ เลือก 1" },
  { type: "yesno", label: "ใช่ / ไม่ใช่", group: "choice", hint: "สองตัวเลือก" },
  { type: "nps", label: "คะแนน 0–10", group: "score", hint: "แนะนำให้ผู้อื่นไหม (NPS)" },
  { type: "scale5", label: "ความพึงพอใจ 1–5", group: "score", hint: "ไม่พอใจ → มากที่สุด" },
  { type: "file", label: "แนบไฟล์", group: "file", hint: "PDF เอกสาร" },
  { type: "image", label: "แนบรูป", group: "file", hint: "สลิป รูปบัตร" },
  { type: "consent", label: "ยอมรับเงื่อนไข", group: "layout", hint: "ช่องติ๊กที่ต้องติ๊ก" },
  { type: "section", label: "หัวข้อ / กลุ่มคำถาม", group: "layout", hint: "ตั้งให้เพิ่มได้หลายชุดได้" },
  { type: "page", label: "ขึ้นขั้นใหม่", group: "layout", hint: "แบ่งเป็นหน้า กดถัดไป" },
]
export const FIELD_GROUPS: { id: FieldTypeInfo["group"]; label: string }[] = [
  { id: "basic", label: "พื้นฐาน" }, { id: "choice", label: "ตัวเลือก" }, { id: "score", label: "คะแนน" }, { id: "file", label: "ไฟล์" }, { id: "layout", label: "จัดหน้า" },
]
export const typeInfo = (t: FormFieldType) => FIELD_TYPES.find((x) => x.type === t)!
export const hasOptions = (t: FormFieldType) => t === "single" || t === "multi" || t === "dropdown"
/** questions that take an answer (a heading / step doesn't) */
export const answerable = (f: Pick<FormField, "type">) => f.type !== "section" && f.type !== "page"
export const SCALE5_LABEL = ["ไม่พอใจ", "น้อย", "ปานกลาง", "มาก", "มากที่สุด"]

/** what a question can be tied to, and which kind of question fits */
export const BINDS: { key: FormBind; label: string; types: FormFieldType[]; child?: boolean }[] = [
  { key: "parent.name", label: "ชื่อผู้ปกครอง", types: ["text"] },
  { key: "parent.phone", label: "เบอร์ผู้ปกครอง", types: ["phone"] },
  { key: "parent.email", label: "อีเมลผู้ปกครอง", types: ["email"] },
  { key: "parent.relation", label: "ความสัมพันธ์", types: ["dropdown", "single"] },
  { key: "family.address", label: "ที่อยู่ครอบครัว", types: ["address", "textarea"] },
  { key: "child.name", label: "ชื่อ-นามสกุลลูก", types: ["text"], child: true },
  { key: "child.nickname", label: "ชื่อเล่นลูก", types: ["text"], child: true },
  { key: "child.grade", label: "ระดับชั้นลูก", types: ["dropdown", "single"], child: true },
  { key: "child.birthDate", label: "วันเกิดลูก", types: ["date"], child: true },
  { key: "child.school", label: "โรงเรียนของลูก", types: ["text"], child: true },
]
export const SOURCE_LABEL: Record<NonNullable<FormField["source"]>, string> = { subjects: "วิชาที่สาขาเปิด", grades: "ระดับชั้นของสาขา", offer: "Admin เลือกตอนส่ง (เวลา / คลาส)" }

let n = 0
export const fieldId = () => `ff_${Date.now().toString(36)}${(n++).toString(36)}`

/** a new question of a type, ready to edit */
export function newField(type: FormFieldType): FormField {
  const base: FormField = { id: fieldId(), type, label: "", required: type === "consent" }
  if (hasOptions(type)) return { ...base, options: ["ตัวเลือก 1", "ตัวเลือก 2"] }
  if (type === "consent") return { ...base, label: "ยอมรับเงื่อนไข" }
  if (type === "page") return { ...base, label: "ขั้นที่ 2" }
  return base
}

/** the fields a parent sees, in order (hidden optional system fields left out) */
export const visibleFields = (f: Pick<FormDef, "fields">) => f.fields.filter((x) => !x.hidden)

// ---------- layout: steps → items (a question, or a repeating group of questions) ----------

/** a form's questions (the name titles its first step) */
export type FormShape = { name?: string; fields: FormField[] }

export type LayoutItem = { kind: "field"; field: FormField } | { kind: "group"; section: FormField; fields: FormField[] }
export interface LayoutPage { title: string; page?: FormField; items: LayoutItem[] }

/** the form as the parent walks it: split into steps at each "ขึ้นขั้นใหม่"; a heading with `repeat` gathers the
 *  questions after it (until the next heading / step) into one group that can be added again */
export function layout(f: FormShape): LayoutPage[] {
  const pages: LayoutPage[] = [{ title: f.name ?? "", items: [] }]
  let group: Extract<LayoutItem, { kind: "group" }> | null = null
  for (const x of visibleFields(f)) {
    if (x.type === "page") { pages.push({ title: x.label, page: x, items: [] }); group = null; continue }
    const page = pages[pages.length - 1]
    if (x.type === "section") {
      group = x.repeat ? { kind: "group", section: x, fields: [] } : null
      page.items.push(group ?? { kind: "field", field: x })
      continue
    }
    if (group) group.fields.push(x)
    else page.items.push({ kind: "field", field: x })
  }
  // a form that starts with a step: the first (empty) page goes
  return pages.filter((p, i) => i > 0 || p.items.length || pages.length === 1)
}

/** the group a field belongs to (its repeating heading), if any */
export function groupOf(f: FormShape, id: ID): FormField | null {
  for (const p of layout(f)) for (const it of p.items) if (it.kind === "group" && it.fields.some((x) => x.id === id)) return it.section
  return null
}

/** "ไม่ใช่" (false) is an answer; only a consent box needs true */
const empty = (v: FormAnswer | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && v !== null && "address" in v && !(v as AddressAnswer).address.trim())

/** is a question shown, given the answers next to it (a group entry first, then the whole form) */
export function isShown(x: Pick<FormField, "showIf">, scope: Record<ID, FormAnswer>, all: Record<ID, FormAnswer> = scope): boolean {
  if (!x.showIf) return true
  const v = x.showIf.field in scope ? scope[x.showIf.field] : all[x.showIf.field]
  if (empty(v)) return false
  const want = x.showIf.value
  if (Array.isArray(v)) return (v as unknown[]).some((a) => a === want || (typeof a === "string" && a.startsWith(OTHER_PREFIX) && want === "อื่นๆ"))
  if (typeof v === "boolean") return (v ? "ใช่" : "ไม่ใช่") === want
  return String(v) === want || (typeof v === "string" && v.startsWith(OTHER_PREFIX) && want === "อื่นๆ")
}

/** what's wrong with a form before it can be saved — one message per problem */
export function validateForm(f: FormShape & { name: string }): { field?: ID; message: string }[] {
  const errs: { field?: ID; message: string }[] = []
  if (!f.name.trim()) errs.push({ message: "ตั้งชื่อฟอร์ม" })
  if (!f.fields.some((x) => answerable(x) && !x.hidden)) errs.push({ message: "เพิ่มคำถามอย่างน้อย 1 ข้อ" })
  const groups = layout(f).flatMap((p) => p.items.filter((it): it is Extract<LayoutItem, { kind: "group" }> => it.kind === "group"))
  f.fields.forEach((x, i) => {
    // a system field is the ERP's own — its text and choices come from the system
    if (x.lock) return
    if (!x.label.trim()) errs.push({ field: x.id, message: x.type === "section" || x.type === "page" ? "ใส่หัวข้อ" : "ใส่คำถาม" })
    if (hasOptions(x.type) && !x.source) {
      const opts = (x.options ?? []).map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) errs.push({ field: x.id, message: "ใส่ตัวเลือกอย่างน้อย 2 ข้อ" })
      if (new Set(opts).size !== opts.length) errs.push({ field: x.id, message: "ตัวเลือกซ้ำกัน" })
    }
    if (x.repeat && !groups.find((g) => g.section.id === x.id)?.fields.length) errs.push({ field: x.id, message: "กลุ่มที่เพิ่มได้หลายชุดต้องมีคำถามข้างใต้" })
    if (x.showIf) {
      const j = f.fields.findIndex((y) => y.id === x.showIf!.field)
      if (j < 0 || j >= i) errs.push({ field: x.id, message: "เงื่อนไขต้องอ้างคำถามที่อยู่ก่อนหน้า" })
    }
    const bind = BINDS.find((b) => b.key === x.bind)
    if (bind?.child && !groups.some((g) => g.fields.some((y) => y.id === x.id))) errs.push({ field: x.id, message: "ข้อมูลของลูกต้องอยู่ในกลุ่มที่เพิ่มได้หลายชุด" })
  })
  return errs
}

/** a system form's core field can't be removed or hidden — every other change is fine */
export function canRemove(x: FormField) { return x.lock !== "core" && x.lock !== "optional" }
export function canHide(x: FormField) { return x.lock === "optional" }

/** move a field up (-1) or down (+1) */
export function moveField(fields: FormField[], id: ID, by: -1 | 1): FormField[] {
  const i = fields.findIndex((x) => x.id === id), j = i + by
  if (i < 0 || j < 0 || j >= fields.length) return fields
  const out = [...fields];[out[i], out[j]] = [out[j], out[i]]
  return out
}

/** drag & drop (owner 2026-10-22): move a field so it lands where another one is */
export function moveFieldTo(fields: FormField[], id: ID, overId: ID): FormField[] {
  const from = fields.findIndex((x) => x.id === id), to = fields.findIndex((x) => x.id === overId)
  if (from < 0 || to < 0 || from === to) return fields
  const out = [...fields]
  const [f] = out.splice(from, 1)
  out.splice(to, 0, f)
  return out
}

/** "อื่นๆ: <text>" — how an other-answer is stored in a choice answer */
export const OTHER_PREFIX = "อื่นๆ: "

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** one question's problem, or null */
function checkOne(x: FormField, v: FormAnswer | undefined): string | null {
  if (x.required && (x.type === "consent" ? v !== true : empty(v))) return x.type === "consent" ? "กรุณาติ๊กยอมรับ" : x.type === "address" ? "กรุณาใส่ที่อยู่" : "กรุณาตอบข้อนี้"
  if (empty(v)) return null
  if (x.type === "email" && !EMAIL.test(String(v))) return "รูปแบบอีเมลไม่ถูกต้อง"
  if (x.type === "phone" && String(v).replace(/\D/g, "").length < 9) return "เบอร์โทรไม่ครบ"
  if (x.type === "number" && Number.isNaN(Number(v))) return "ใส่เป็นตัวเลข"
  if ((x.type === "single" || x.type === "multi") && (Array.isArray(v) ? v : [String(v)]).some((a) => a === OTHER_PREFIX.trim() || a === OTHER_PREFIX)) return "พิมพ์คำตอบ “อื่นๆ”"
  return null
}

/** the error key of a question inside a group entry */
export const entryKey = (groupId: ID, i: number, id: ID) => `${groupId}.${i}.${id}`

/** what the parent still has to fix on one step (or the whole form) — by field id, or group.entry.field */
export function validateAnswers(f: FormShape, answers: Record<ID, FormAnswer>, page?: number): Record<string, string> {
  const errs: Record<string, string> = {}
  const pages = layout(f)
  for (const p of page === undefined ? pages : [pages[page]].filter(Boolean)) for (const it of p.items) {
    if (it.kind === "field") {
      const x = it.field
      if (!answerable(x) || !isShown(x, answers)) continue
      const e = checkOne(x, answers[x.id])
      if (e) errs[x.id] = e
      continue
    }
    const entries = (Array.isArray(answers[it.section.id]) ? answers[it.section.id] : []) as GroupEntry[]
    if (!entries.length) { errs[it.section.id] = "เพิ่มอย่างน้อย 1 ชุด"; continue }
    entries.forEach((en, i) => {
      for (const x of it.fields) {
        if (!answerable(x) || !isShown(x, en, answers)) continue
        const e = checkOne(x, en[x.id])
        if (e) errs[entryKey(it.section.id, i, x.id)] = e
      }
    })
  }
  return errs
}

/** an answer as one line of text (tables, the family panel, downloads) */
export function answerText(x: Pick<FormField, "type">, v: FormAnswer | undefined): string {
  if (empty(v)) return "—"
  if (x.type === "consent") return v === true ? "ยอมรับ" : "—"
  if (x.type === "yesno") return v === true || v === "yes" ? "ใช่" : "ไม่ใช่"
  if (x.type === "address" && typeof v === "object" && v && !Array.isArray(v)) { const a = v as AddressAnswer; return a.lat !== undefined ? `${a.address} (📍)` : a.address }
  if (Array.isArray(v)) return (v as unknown[]).map((a) => (typeof a === "string" ? a : "")).filter(Boolean).join(", ")
  return String(v)
}

/** every value a question got in one response — one, or one per group entry */
export function valuesIn(f: FormShape, x: FormField, r: Pick<CustomFormResponse, "answers">): FormAnswer[] {
  const g = groupOf(f, x.id)
  if (!g) return [r.answers[x.id]]
  const entries = (Array.isArray(r.answers[g.id]) ? r.answers[g.id] : []) as GroupEntry[]
  return entries.map((en) => en[x.id])
}

export type FieldSummary =
  | { kind: "choice"; answered: number; rows: { label: string; count: number }[] }
  | { kind: "score"; answered: number; avg: number | null; dist: number[] }
  | { kind: "text"; answered: number; samples: string[] }
  | { kind: "none" }

/** one question's answers across responses — counts for choices, average + spread for scores, the texts otherwise
 *  (a question in a repeating group counts every entry, e.g. every child) */
export function summarizeField(x: FormField, responses: Pick<CustomFormResponse, "answers">[], form?: FormShape): FieldSummary {
  if (!answerable(x)) return { kind: "none" }
  const vals = responses.flatMap((r) => (form ? valuesIn(form, x, r) : [r.answers[x.id]])).filter((v) => !empty(v))
  if (hasOptions(x.type) || x.type === "yesno") {
    const counts = new Map<string, number>()
    const opts = x.type === "yesno" ? ["ใช่", "ไม่ใช่"] : (x.options ?? [])
    for (const o of opts) counts.set(o, 0)
    for (const v of vals) for (const a of (Array.isArray(v) ? (v as string[]) : [x.type === "yesno" ? answerText(x, v) : String(v)])) {
      const k = a.startsWith(OTHER_PREFIX) ? "อื่นๆ" : a
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    return { kind: "choice", answered: vals.length, rows: [...counts].map(([label, count]) => ({ label, count })) }
  }
  if (x.type === "nps" || x.type === "scale5") {
    const nums = vals.map(Number).filter((v) => !Number.isNaN(v))
    const top = x.type === "nps" ? 10 : 5, from = x.type === "nps" ? 0 : 1
    const dist = Array.from({ length: top - from + 1 }, (_, i) => nums.filter((v) => v === from + i).length)
    return { kind: "score", answered: nums.length, avg: nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null, dist }
  }
  if (x.type === "consent") { const c = vals.filter((v) => v === true).length; return { kind: "choice", answered: c, rows: [{ label: "ยอมรับ", count: c }] } }
  return { kind: "text", answered: vals.length, samples: vals.map((v) => answerText(x, v)) }
}

// ---------- system data in, answers back to the records ----------

const primary = (f: Family) => f.parents.find((p) => p.primary) ?? f.parents[0]

function bindValue(key: FormBind, fam: Family, kid?: Student): FormAnswer {
  const p = primary(fam)
  switch (key) {
    case "parent.name": return p?.name ?? null
    case "parent.phone": return p?.phone ?? null
    case "parent.email": return p?.email ?? null
    case "parent.relation": return p?.relationship ?? null
    case "family.address": return fam.address ? { address: fam.address, ...(fam.location ?? {}) } : null
    case "child.name": return kid?.name ?? null
    case "child.nickname": return kid?.nickname ?? null
    case "child.grade": return kid?.grade ?? null
    case "child.birthDate": return kid?.birthDate ?? null
    case "child.school": return kid?.school ?? null
  }
}

/** answers filled in from the family's data when the form is sent — a repeating group with child questions gets one
 *  entry per child (the entry remembers which child) */
export function prefillFor(f: FormShape, fam: Family, kids: Student[]): Record<ID, FormAnswer> {
  const out: Record<ID, FormAnswer> = {}
  for (const p of layout(f)) for (const it of p.items) {
    if (it.kind === "field") {
      if (it.field.bind) { const v = bindValue(it.field.bind, fam); if (!empty(v)) out[it.field.id] = it.field.type === "textarea" && v && typeof v === "object" && "address" in v ? (v as AddressAnswer).address : v }
      continue
    }
    if (!it.fields.some((x) => x.bind?.startsWith("child."))) continue
    out[it.section.id] = kids.slice(0, it.section.repeat?.max ?? 10).map((k) => Object.fromEntries([["_studentId", k.id], ...it.fields.filter((x) => x.bind).map((x) => [x.id, bindValue(x.bind!, fam, k)])]) as GroupEntry)
  }
  return out
}

/** the changes an answered form makes to the family and its children (only tied questions; only what changed) —
 *  a child is updated when the entry came from that child; a new child (no `_studentId`) is left for staff */
export function bindUpdates(f: FormShape, answers: Record<ID, FormAnswer>, fam: Family, kids: Student[]) {
  const family: Partial<Family> = {}
  const parent: Partial<Family["parents"][number]> = {}
  const students: { id: ID; patch: Partial<Student> }[] = []
  const str = (v: FormAnswer) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "")
  for (const p of layout(f)) for (const it of p.items) {
    if (it.kind === "field") {
      const x = it.field, v = answers[x.id]
      if (!x.bind || empty(v)) continue
      if (x.bind === "parent.name") parent.name = str(v)
      if (x.bind === "parent.phone") parent.phone = str(v)
      if (x.bind === "parent.email") parent.email = str(v)
      if (x.bind === "parent.relation") parent.relationship = str(v)
      if (x.bind === "family.address") {
        if (typeof v === "object" && v && !Array.isArray(v) && "address" in v) { const a = v as AddressAnswer; family.address = a.address.trim(); if (a.lat !== undefined && a.lng !== undefined) family.location = { lat: a.lat, lng: a.lng } }
        else family.address = str(v)
      }
      continue
    }
    for (const en of (Array.isArray(answers[it.section.id]) ? answers[it.section.id] : []) as GroupEntry[]) {
      const kid = kids.find((k) => k.id === en._studentId)
      if (!kid) continue
      const patch: Partial<Student> = {}
      for (const x of it.fields) {
        const v = en[x.id]
        if (!x.bind || empty(v)) continue
        const s = str(v)
        if (x.bind === "child.name" && s !== kid.name) patch.name = s
        if (x.bind === "child.nickname" && s !== kid.nickname) patch.nickname = s
        if (x.bind === "child.grade" && s !== kid.grade) patch.grade = s
        if (x.bind === "child.birthDate" && s !== (kid.birthDate ?? "")) patch.birthDate = s
        if (x.bind === "child.school" && s !== (kid.school ?? "")) patch.school = s
      }
      if (Object.keys(patch).length) students.push({ id: kid.id, patch })
    }
  }
  const p0 = primary(fam)
  const parentChanged = p0 && (Object.keys(parent) as (keyof typeof parent)[]).some((k) => parent[k] !== p0[k])
  if (parentChanged) family.parents = fam.parents.map((p) => (p === p0 ? { ...p, ...parent } : p))
  if (family.address === fam.address) delete family.address
  return { family, students }
}

/** the form as it goes out: choices from the system filled in (the branch's subjects / grades, what the admin offers) */
export function resolveSources<F extends Pick<FormDef, "fields">>(f: F, src: { subjects: string[]; grades: string[]; offers?: Record<ID, string[]> }): F {
  return { ...f, fields: f.fields.map((x) => (!x.source ? x : { ...x, options: x.source === "subjects" ? src.subjects : x.source === "grades" ? src.grades : src.offers?.[x.id] ?? [] })) }
}
/** questions whose choices the admin picks when sending */
export const offerFields = (f: Pick<FormDef, "fields">) => visibleFields(f).filter((x) => x.source === "offer")

// ---------- the ERP's own forms, as the builder shows them ----------

// choices show what the system really offers (the preview looks like the real form) — the system fills them in, they can't be edited here
const core = (id: string, type: FormFieldType, label: string, required = true, help?: string, options?: string[]): FormField => ({ id, type, label, required, lock: "core", help, options })
const opt = (id: string, type: FormFieldType, label: string, help?: string, options?: string[]): FormField => ({ id, type, label, required: false, lock: "optional", help, options })
const GRADES = ["อ.1", "อ.2", "อ.3", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"]
const SUBJECTS = ["คณิต", "อังกฤษ", "วิทย์"]
const SLOTS = ["ส. 10:00–12:00", "ส. 13:00–15:00", "อา. 10:00–12:00"]
const STUDENT_REASONS = DEFAULT_LOSS_REASONS.filter((r) => r.for !== "lead" && r.active).map((r) => r.label)
const sec = (id: string, label: string, repeat?: FormField["repeat"]): FormField => ({ id, type: "section", label, required: false, lock: "core", repeat })
const step = (id: string, label: string): FormField => ({ id, type: "page", label, required: false, lock: "core" })
const bound = (f: FormField, bind: FormBind, source?: FormField["source"]): FormField => ({ ...f, bind, source })

// owner 2026-10-22 round 2: the system forms laid out like the real ones — steps, a "+ เพิ่มนักเรียน" group, questions
// tied to the family's data, choices from the system, and a review step
const PARENT = [
  step("p_step", "ผู้ปกครอง"),
  bound(core("p_name", "text", "ชื่อ-นามสกุลผู้ปกครอง"), "parent.name"),
  bound(core("p_phone", "phone", "เบอร์โทร", true, "เพิ่มได้หลายเบอร์ เลือกเบอร์หลัก"), "parent.phone"),
  bound(opt("p_relation", "dropdown", "ความสัมพันธ์กับนักเรียน", undefined, [...PARENT_RELATIONS]), "parent.relation"),
  opt("p_birth", "date", "วันเกิดผู้ปกครอง"),
  bound(opt("p_email", "email", "อีเมล"), "parent.email"),
  opt("p_source", "multi", "รู้จักเราจากช่องทางไหน", undefined, Object.values(LEAD_SOURCE_LABEL)),
  bound(opt("p_address", "address", "ที่อยู่ + ปักหมุดบนแผนที่"), "family.address"),
  opt("p_tax", "yesno", "ต้องการใบกำกับภาษี"),
  { ...opt("p_tax_info", "textarea", "ชื่อ / เลขผู้เสียภาษี / ที่อยู่ในใบกำกับ"), showIf: { field: "p_tax", value: "ใช่" } },
]
const CHILD = [
  step("c_step", "นักเรียน"),
  sec("c_sec", "นักเรียน", { add: "เพิ่มนักเรียน", max: 5 }),
  bound(core("c_name", "text", "ชื่อ-นามสกุลนักเรียน"), "child.name"),
  bound(core("c_grade", "dropdown", "ระดับชั้น", true, undefined, GRADES), "child.grade", "grades"),
  bound(opt("c_nick", "text", "ชื่อเล่น"), "child.nickname"),
  bound(opt("c_birth", "date", "วันเกิด"), "child.birthDate"),
  bound(opt("c_school", "text", "โรงเรียน"), "child.school"),
  opt("c_note", "textarea", "หมายเหตุ"),
]
const subjects = { ...core("c_subjects", "multi", "วิชาที่สนใจ", true, undefined, SUBJECTS), source: "subjects" as const }
const slot = (label: string, help: string) => ({ ...core("c_slot", "single", label, true, help, SLOTS), source: "offer" as const })

/** the system forms' fields (what the ERP needs is "core") — the builder starts from these */
export const SYSTEM_FORMS: Omit<FormDef, "updatedAt">[] = [
  { id: "sys_test", kind: "system", systemKey: "test", name: "สอบวัดระดับ (Test)", description: "นัดสอบวัดระดับ — Admin ส่งจากหน้า Lead / Inbox", active: true, review: true,
    fields: [...PARENT, ...CHILD, subjects, slot("วัน-เวลาสอบ", "จากเวลาที่ Admin เสนอ")] },
  { id: "sys_trial", kind: "system", systemKey: "trial", name: "ทดลองเรียน (Trial)", description: "นัดทดลองเรียน — ข้อมูลเดิมขึ้นให้ กดแก้ได้", active: true, review: true,
    fields: [...PARENT, ...CHILD, subjects, slot("วัน-เวลาทดลองเรียน", "เวลาว่างทั่วไป หรือเข้าคลาสจริง")] },
  { id: "sys_enroll", kind: "system", systemKey: "enroll", name: "สมัครเรียน", description: "เลือกคลาสที่แอดมินเสนอ", active: true, review: true,
    fields: [...PARENT, ...CHILD, { ...core("e_classes", "multi", "เลือกคลาสที่สะดวก", true, "จากคลาสที่แอดมินเสนอ", SLOTS), source: "offer" }, core("e_start", "date", "อยากเริ่มเรียนวันที่"), opt("e_bus", "yesno", "ต้องการรถรับส่ง"), core("e_terms", "consent", "ยอมรับเงื่อนไขการเรียน การลา และการชำระเงิน")] },
  { id: "sys_exit", kind: "system", systemKey: "exit", name: "แจ้งหยุดเรียน", description: "เมื่อนักเรียนจะออก — ระบบใส่ชื่อลูก + วันเรียนวันสุดท้ายให้", active: true,
    fields: [core("x_reason", "single", "เหตุผลหลัก", true, "รายการแก้ได้ใน Settings › ระบบ › ลูกค้าและ CRM", STUDENT_REASONS), opt("x_more", "multi", "เหตุผลอื่น", undefined, STUDENT_REASONS), opt("x_stars", "scale5", "ให้คะแนน: ครู · เนื้อหา · แอดมิน · ความคุ้มค่า"), core("x_back", "single", "จะกลับมาเรียนไหม", true, undefined, ["กลับมาแน่นอน", "อาจจะ", "คงไม่"]),
      { ...opt("x_when", "text", "ประมาณเดือนไหน"), showIf: { field: "x_back", value: "กลับมาแน่นอน" } }, opt("x_nps", "nps", "แนะนำเพื่อนไหม"), opt("x_msg", "textarea", "อยากบอกอะไรเรา"), opt("x_promo", "consent", "ยินยอมให้ติดต่อเมื่อมีโปรโมชัน")] },
  { id: "sys_survey", kind: "system", systemKey: "survey", name: "ความพึงพอใจประจำปี", description: "ปีละครั้ง ก.ย.–ต.ค. — คำถามเดียวกับฟอร์มเดิมของโรงเรียน", active: true,
    fields: [core("s_nps", "nps", "แนะนำ NockAcademy ให้ผู้อื่น"), core("s_reasons", "multi", "เหตุผลที่ให้คะแนน", true, undefined, Object.values(REASON_LABEL).filter((x) => x !== "อื่นๆ")), core("s_scores", "scale5", "ความพึงพอใจ 5 ด้าน", true, "ครูผู้สอน · หลักสูตร · Feedback · ความคุ้มค่า · สถานที่"), core("s_improve", "single", "อยากให้ปรับปรุงเรื่องใดมากที่สุด", true, undefined, Object.values(IMPROVE_LABEL).filter((x) => x !== "อื่นๆ")), opt("s_courses", "text", "คอร์สที่อยากให้เปิดเพิ่ม"), core("s_msg", "textarea", "ข้อความถึงครูและสถาบัน")] },
]

/** a fresh custom form */
export function newForm(id: ID, now: string, by?: ID): FormDef {
  return { id, kind: "custom", name: "", description: "", fields: [{ ...newField("text"), label: "คำถามแรก" }], active: true, updatedAt: now, updatedBy: by }
}
