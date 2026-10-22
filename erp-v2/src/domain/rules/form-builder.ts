import { LEAD_SOURCE_LABEL } from "./crm"
import { DEFAULT_LOSS_REASONS } from "./loss"
import { PARENT_RELATIONS } from "./people"
import { IMPROVE_LABEL, REASON_LABEL } from "./survey"
import type { FormAnswer, FormDef, FormField, FormFieldType, CustomFormResponse, ID } from "../types"

// Form builder (owner 2026-10-22): the company builds its own forms in Settings › System › ฟอร์ม and tunes the ERP's
// own forms. A system form's "core" fields are what the ERP needs to work (always shown, can't be edited); its
// "optional" fields can be hidden; any form can get extra questions. Custom-form answers belong to a family.

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
  { type: "single", label: "เลือก 1 ข้อ", group: "choice", hint: "ปุ่มตัวเลือก (+ อื่นๆ ได้)" },
  { type: "multi", label: "เลือกหลายข้อ", group: "choice", hint: "ติ๊กได้หลายข้อ (+ อื่นๆ ได้)" },
  { type: "dropdown", label: "Dropdown", group: "choice", hint: "รายการยาวๆ เลือก 1" },
  { type: "yesno", label: "ใช่ / ไม่ใช่", group: "choice", hint: "สองตัวเลือก" },
  { type: "nps", label: "คะแนน 0–10", group: "score", hint: "แนะนำให้ผู้อื่นไหม (NPS)" },
  { type: "scale5", label: "ความพึงพอใจ 1–5", group: "score", hint: "ไม่พอใจ → มากที่สุด" },
  { type: "file", label: "แนบไฟล์", group: "file", hint: "PDF เอกสาร" },
  { type: "image", label: "แนบรูป", group: "file", hint: "สลิป รูปบัตร" },
  { type: "consent", label: "ยอมรับเงื่อนไข", group: "layout", hint: "ช่องติ๊กที่ต้องติ๊ก" },
  { type: "section", label: "หัวข้อ / คำอธิบาย", group: "layout", hint: "แบ่งหน้า ไม่ต้องตอบ" },
]
export const FIELD_GROUPS: { id: FieldTypeInfo["group"]; label: string }[] = [
  { id: "basic", label: "พื้นฐาน" }, { id: "choice", label: "ตัวเลือก" }, { id: "score", label: "คะแนน" }, { id: "file", label: "ไฟล์" }, { id: "layout", label: "จัดหน้า" },
]
export const typeInfo = (t: FormFieldType) => FIELD_TYPES.find((x) => x.type === t)!
export const hasOptions = (t: FormFieldType) => t === "single" || t === "multi" || t === "dropdown"
/** questions that take an answer (a heading doesn't) */
export const answerable = (f: Pick<FormField, "type">) => f.type !== "section"
export const SCALE5_LABEL = ["ไม่พอใจ", "น้อย", "ปานกลาง", "มาก", "มากที่สุด"]

let n = 0
export const fieldId = () => `ff_${Date.now().toString(36)}${(n++).toString(36)}`

/** a new question of a type, ready to edit */
export function newField(type: FormFieldType): FormField {
  const base: FormField = { id: fieldId(), type, label: "", required: type === "consent" }
  if (hasOptions(type)) return { ...base, options: ["ตัวเลือก 1", "ตัวเลือก 2"] }
  if (type === "consent") return { ...base, label: "ยอมรับเงื่อนไข" }
  return base
}

/** the fields a parent sees, in order (hidden optional system fields left out) */
export const visibleFields = (f: Pick<FormDef, "fields">) => f.fields.filter((x) => !x.hidden)

/** what's wrong with a form before it can be saved — one message per problem */
export function validateForm(f: Pick<FormDef, "name" | "fields">): { field?: ID; message: string }[] {
  const errs: { field?: ID; message: string }[] = []
  if (!f.name.trim()) errs.push({ message: "ตั้งชื่อฟอร์ม" })
  if (!f.fields.some((x) => answerable(x) && !x.hidden)) errs.push({ message: "เพิ่มคำถามอย่างน้อย 1 ข้อ" })
  for (const x of f.fields) {
    // a system field is the ERP's own — its text and choices come from the system
    if (x.lock) continue
    if (!x.label.trim()) errs.push({ field: x.id, message: x.type === "section" ? "ใส่หัวข้อ" : "ใส่คำถาม" })
    if (hasOptions(x.type)) {
      const opts = (x.options ?? []).map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) errs.push({ field: x.id, message: "ใส่ตัวเลือกอย่างน้อย 2 ข้อ" })
      if (new Set(opts).size !== opts.length) errs.push({ field: x.id, message: "ตัวเลือกซ้ำกัน" })
    }
  }
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

/** "อื่นๆ: <text>" — how an other-answer is stored in a choice answer */
export const OTHER_PREFIX = "อื่นๆ: "

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
// "ไม่ใช่" (false) is an answer; only a consent box needs true
const empty = (v: FormAnswer | undefined) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0)

/** what the parent still has to fix — by field id */
export function validateAnswers(f: Pick<FormDef, "fields">, answers: Record<ID, FormAnswer>): Record<ID, string> {
  const errs: Record<ID, string> = {}
  for (const x of visibleFields(f)) {
    if (!answerable(x)) continue
    const v = answers[x.id]
    if (x.required && (x.type === "consent" ? v !== true : empty(v))) { errs[x.id] = x.type === "consent" ? "กรุณาติ๊กยอมรับ" : "กรุณาตอบข้อนี้"; continue }
    if (empty(v)) continue
    if (x.type === "email" && !EMAIL.test(String(v))) errs[x.id] = "รูปแบบอีเมลไม่ถูกต้อง"
    if (x.type === "phone" && String(v).replace(/\D/g, "").length < 9) errs[x.id] = "เบอร์โทรไม่ครบ"
    if (x.type === "number" && Number.isNaN(Number(v))) errs[x.id] = "ใส่เป็นตัวเลข"
    if ((x.type === "single" || x.type === "multi") && (Array.isArray(v) ? v : [String(v)]).some((a) => a === OTHER_PREFIX.trim() || a === OTHER_PREFIX)) errs[x.id] = "พิมพ์คำตอบ “อื่นๆ”"
  }
  return errs
}

/** an answer as one line of text (tables, the family panel, downloads) */
export function answerText(x: Pick<FormField, "type">, v: FormAnswer | undefined): string {
  if (empty(v)) return "—"
  if (x.type === "consent") return v === true ? "ยอมรับ" : "—"
  if (x.type === "yesno") return v === true || v === "yes" ? "ใช่" : "ไม่ใช่"
  if (Array.isArray(v)) return v.join(", ")
  return String(v)
}

export type FieldSummary =
  | { kind: "choice"; answered: number; rows: { label: string; count: number }[] }
  | { kind: "score"; answered: number; avg: number | null; dist: number[] }
  | { kind: "text"; answered: number; samples: string[] }
  | { kind: "none" }

/** one question's answers across responses — counts for choices, average + spread for scores, the texts otherwise */
export function summarizeField(x: FormField, responses: Pick<CustomFormResponse, "answers">[]): FieldSummary {
  if (!answerable(x)) return { kind: "none" }
  const vals = responses.map((r) => r.answers[x.id]).filter((v) => !empty(v))
  if (hasOptions(x.type) || x.type === "yesno") {
    const counts = new Map<string, number>()
    const opts = x.type === "yesno" ? ["ใช่", "ไม่ใช่"] : (x.options ?? [])
    for (const o of opts) counts.set(o, 0)
    for (const v of vals) for (const a of (Array.isArray(v) ? v : [x.type === "yesno" ? answerText(x, v) : String(v)])) {
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
  if (x.type === "consent") { const n = vals.filter((v) => v === true).length; return { kind: "choice", answered: n, rows: [{ label: "ยอมรับ", count: n }] } }
  return { kind: "text", answered: vals.length, samples: vals.map((v) => answerText(x, v)) }
}

// ---------- the ERP's own forms, as the builder shows them ----------

// choices show what the system really offers (the preview looks like the real form) — the system fills them in, they can't be edited here
const core = (id: string, type: FormFieldType, label: string, required = true, help?: string, options?: string[]): FormField => ({ id, type, label, required, lock: "core", help, options })
const opt = (id: string, type: FormFieldType, label: string, help?: string, options?: string[]): FormField => ({ id, type, label, required: false, lock: "optional", help, options })
const GRADES = ["อ.1", "อ.2", "อ.3", "ป.1", "ป.2", "ป.3", "ป.4", "ป.5", "ป.6", "ม.1", "ม.2", "ม.3", "ม.4", "ม.5", "ม.6"]
const SUBJECTS = ["คณิต", "อังกฤษ", "วิทย์"]
const SLOTS = ["ส. 10:00–12:00", "ส. 13:00–15:00", "อา. 10:00–12:00"]
const STUDENT_REASONS = DEFAULT_LOSS_REASONS.filter((r) => r.for !== "lead" && r.active).map((r) => r.label)
const sec = (id: string, label: string): FormField => ({ id, type: "section", label, required: false, lock: "core" })

const PARENT = [
  sec("p_sec", "ผู้ปกครอง"),
  core("p_name", "text", "ชื่อ-นามสกุลผู้ปกครอง"),
  core("p_phone", "phone", "เบอร์โทร", true, "เพิ่มได้หลายเบอร์ เลือกเบอร์หลัก"),
  opt("p_relation", "dropdown", "ความสัมพันธ์กับนักเรียน", undefined, [...PARENT_RELATIONS]),
  opt("p_birth", "date", "วันเกิดผู้ปกครอง"),
  opt("p_email", "email", "อีเมล"),
  opt("p_source", "multi", "รู้จักเราจากช่องทางไหน", undefined, Object.values(LEAD_SOURCE_LABEL)),
  opt("p_address", "textarea", "ที่อยู่ + ปักหมุดบนแผนที่"),
  opt("p_tax", "text", "ต้องการใบกำกับภาษี (ชื่อ / เลขผู้เสียภาษี / ที่อยู่)"),
]
const CHILD = [
  sec("c_sec", "นักเรียน (เพิ่มได้หลายคน)"),
  core("c_name", "text", "ชื่อ-นามสกุลนักเรียน"),
  core("c_grade", "dropdown", "ระดับชั้น", true, undefined, GRADES),
  opt("c_nick", "text", "ชื่อเล่น"),
  opt("c_birth", "date", "วันเกิด"),
  opt("c_school", "text", "โรงเรียน"),
  opt("c_note", "textarea", "หมายเหตุ"),
]

/** the system forms' fields (what the ERP needs is "core") — the builder starts from these */
export const SYSTEM_FORMS: Omit<FormDef, "updatedAt">[] = [
  { id: "sys_test", kind: "system", systemKey: "test", name: "สอบวัดระดับ (Test)", description: "นัดสอบวัดระดับ — Admin ส่งจากหน้า Lead / Inbox", active: true,
    fields: [...PARENT, ...CHILD, core("c_subjects", "multi", "วิชาที่สนใจ", true, undefined, SUBJECTS), core("c_slot", "single", "วัน-เวลาสอบ", true, "จากเวลาที่ Admin เสนอ", SLOTS)] },
  { id: "sys_trial", kind: "system", systemKey: "trial", name: "ทดลองเรียน (Trial)", description: "นัดทดลองเรียน — ข้อมูลเดิมขึ้นให้ กดแก้ได้", active: true,
    fields: [...PARENT, ...CHILD, core("c_subjects", "multi", "วิชาที่สนใจ", true, undefined, SUBJECTS), core("c_slot", "single", "วัน-เวลาทดลองเรียน", true, "เวลาว่างทั่วไป หรือเข้าคลาสจริง", SLOTS)] },
  { id: "sys_enroll", kind: "system", systemKey: "enroll", name: "สมัครเรียน", description: "เลือกคลาสที่แอดมินเสนอ", active: true,
    fields: [...PARENT, ...CHILD, core("e_classes", "multi", "เลือกคลาสที่สะดวก", true, "จากคลาสที่แอดมินเสนอ", SLOTS), core("e_start", "date", "อยากเริ่มเรียนวันที่"), opt("e_bus", "yesno", "ต้องการรถรับส่ง"), core("e_terms", "consent", "ยอมรับเงื่อนไขการเรียน การลา และการชำระเงิน")] },
  { id: "sys_exit", kind: "system", systemKey: "exit", name: "แจ้งหยุดเรียน", description: "เมื่อนักเรียนจะออก — ระบบใส่ชื่อลูก + วันเรียนวันสุดท้ายให้", active: true,
    fields: [core("x_reason", "single", "เหตุผลหลัก", true, "รายการแก้ได้ใน Settings › ระบบ › ลูกค้าและ CRM", STUDENT_REASONS), opt("x_more", "multi", "เหตุผลอื่น", undefined, STUDENT_REASONS), opt("x_stars", "scale5", "ให้คะแนน: ครู · เนื้อหา · แอดมิน · ความคุ้มค่า"), core("x_back", "single", "จะกลับมาเรียนไหม", true, undefined, ["กลับมาแน่นอน", "อาจจะ", "คงไม่"]), opt("x_nps", "nps", "แนะนำเพื่อนไหม"), opt("x_msg", "textarea", "อยากบอกอะไรเรา"), opt("x_promo", "consent", "ยินยอมให้ติดต่อเมื่อมีโปรโมชัน")] },
  { id: "sys_survey", kind: "system", systemKey: "survey", name: "ความพึงพอใจประจำปี", description: "ปีละครั้ง ก.ย.–ต.ค. — คำถามเดียวกับฟอร์มเดิมของโรงเรียน", active: true,
    fields: [core("s_nps", "nps", "แนะนำ NockAcademy ให้ผู้อื่น"), core("s_reasons", "multi", "เหตุผลที่ให้คะแนน", true, undefined, Object.values(REASON_LABEL).filter((x) => x !== "อื่นๆ")), core("s_scores", "scale5", "ความพึงพอใจ 5 ด้าน", true, "ครูผู้สอน · หลักสูตร · Feedback · ความคุ้มค่า · สถานที่"), core("s_improve", "single", "อยากให้ปรับปรุงเรื่องใดมากที่สุด", true, undefined, Object.values(IMPROVE_LABEL).filter((x) => x !== "อื่นๆ")), opt("s_courses", "text", "คอร์สที่อยากให้เปิดเพิ่ม"), core("s_msg", "textarea", "ข้อความถึงครูและสถาบัน")] },
]

/** a fresh custom form */
export function newForm(id: ID, now: string, by?: ID): FormDef {
  return { id, kind: "custom", name: "", description: "", fields: [{ ...newField("text"), label: "คำถามแรก" }], active: true, updatedAt: now, updatedBy: by }
}
