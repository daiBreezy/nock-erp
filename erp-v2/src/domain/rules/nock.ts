// Nock — the in-app helper (owner 2026-10-13). Answers "how do I…" questions by the asker's own permissions, and keeps
// every question so the team can answer what Nock couldn't; those answers become knowledge Nock uses next time.
// Pure rules only: the handbook, matching, what counts as answered, who may answer. The AI call is in /api/nock.

import type { NockKnowledge, NockQuestion, Role, Staff } from "../types"
import { ROLE_LABEL, ROLE_PERMISSIONS, type Permission } from "./permissions"

export interface GuideEntry {
  id: string
  title: string
  /** words that point at this topic (Thai has no spaces — matched as substrings) */
  keywords: string[]
  /** the permission needed to do it yourself — unset = everyone */
  perm?: Permission
  steps: string
  href: string
  hrefLabel: string
}

/** The built-in handbook — how this system works today. People's answers (NockKnowledge) add to it. */
export const NOCK_GUIDE: GuideEntry[] = [
  { id: "subject_add", title: "เพิ่มวิชาใหม่", keywords: ["เพิ่มวิชา", "วิชาใหม่", "subject", "รายวิชา", "เพิ่มรายวิชา"], perm: "settings.manage",
    steps: "วิชาเป็นรายการกลางของทุกสาขา: Settings › ระบบ › วิชา → พิมพ์ชื่อวิชาใหม่ เลือกสี แล้วกด เพิ่ม · จากนั้นแต่ละสาขาเลือกวิชาที่เปิดสอนที่ Settings › สาขา › วิชา", href: "/settings?view=system&sys=subjects", hrefLabel: "Settings › วิชา" },
  { id: "student_add", title: "เพิ่มนักเรียน", keywords: ["เพิ่มนักเรียน", "นักเรียนใหม่", "สร้างนักเรียน", "เพิ่มลูก"], perm: "student.manage",
    steps: "หน้านักเรียน › ปุ่ม เพิ่มนักเรียน → กรอกชื่อ ชื่อเล่น ชั้น แล้วผูกครอบครัว · หรือเปิด Panel ครอบครัว › เพิ่มลูก (ผูกครอบครัวให้อัตโนมัติ)", href: "/students", hrefLabel: "หน้านักเรียน" },
  { id: "class_add", title: "สร้างคลาส", keywords: ["สร้างคลาส", "เปิดคลาส", "คลาสใหม่", "เพิ่มคลาส"], perm: "class.manage",
    steps: "หน้าคลาส › สร้างคลาส หรือกดช่องว่างในปฏิทิน → เลือกแบบคลาส (ครู + ช่วงเวลา / วิชา + ระดับชั้น) วัน เวลา ครู ห้อง · ระบบเช็คครู/ห้องชนและวันหยุดให้", href: "/classes", hrefLabel: "หน้าคลาส" },
  { id: "course_add", title: "สร้างคอร์ส", keywords: ["สร้างคอร์ส", "คอร์สใหม่", "เพิ่มคอร์ส", "ตั้งราคา", "max student"], perm: "course.manage",
    steps: "หน้าคอร์ส › สร้างคอร์ส → Single/Bundle, วิชา, ระดับชั้น, แพ็กเกจ (ชม. / สัปดาห์ / รายเดือน) ราคาดึงจากตารางราคาของสาขา · Max Student = จำนวนนักเรียนสูงสุดของทั้งคอร์ส", href: "/courses", hrefLabel: "หน้าคอร์ส" },
  { id: "invoice_create", title: "ออกใบแจ้งหนี้", keywords: ["ใบแจ้งหนี้", "invoice", "ออกบิล", "เก็บเงิน", "สร้างใบ"], perm: "billing.manage",
    steps: "ใบแจ้งหนี้ & รับเงิน › สร้างใบแจ้งหนี้ → เลือกนักเรียน + คอร์ส (+ ค่ารถ/ค่าแรกเข้า) → บันทึก (ออกเลขทันที) → สร้าง PDF → ให้อีกคนอนุมัติ → ส่งผู้ปกครองทาง LINE → บันทึกรับเงิน → อีกคนยืนยันยอด → ออกใบเสร็จ + เข้าคลาสอัตโนมัติ", href: "/billing", hrefLabel: "ใบแจ้งหนี้" },
  { id: "invoice_approve", title: "อนุมัติใบแจ้งหนี้ / ยืนยันยอดเงิน", keywords: ["อนุมัติใบ", "approve invoice", "ยืนยันยอด", "ยืนยันเงิน", "force approve"], perm: "billing.approve",
    steps: "คนอนุมัติต้องไม่ใช่คนสร้าง (maker–checker) · เปิดใบใน Billing › อนุมัติ PDF · ยืนยันยอดที่รายการรับเงิน · ถ้าทำเองจำเป็นจริงใช้ Force Approve ใส่เหตุผล (แจ้งทั้งสาขา + Director)", href: "/billing", hrefLabel: "ใบแจ้งหนี้" },
  { id: "attendance", title: "เช็คชื่อ", keywords: ["เช็คชื่อ", "attendance", "มาเรียน", "ขาดเรียน"], perm: "attendance.mark",
    steps: "คาบเรียน & เช็คชื่อ › กดคาบ → กด มา / ลา ของนักเรียนแต่ละคน (บันทึกทันที) · คาบในอนาคตบันทึกได้แค่ลา", href: "/sessions", hrefLabel: "คาบเรียน & เช็คชื่อ" },
  { id: "summary_write", title: "เขียนสรุปการเรียน", keywords: ["สรุปการเรียน", "เขียนสรุป", "summary", "session summary"], perm: "summary.write",
    steps: "สรุปการเรียน › กดแถวคาบ → เขียนสรุปของนักเรียน → ส่งไป Approve · คนอนุมัติต้องไม่ใช่คนเขียน แล้วจึงส่งผู้ปกครอง", href: "/summaries", hrefLabel: "สรุปการเรียน" },
  { id: "summary_approve", title: "อนุมัติสรุปการเรียน", keywords: ["อนุมัติสรุป", "approve summary", "ส่งสรุป"], perm: "summary.approve",
    steps: "สรุปการเรียน › การ์ด รอส่งไป Approve → อนุมัติ (หรือเปิดแถวเพื่อขอแก้) → ส่งผู้ปกครอง", href: "/summaries", hrefLabel: "สรุปการเรียน" },
  { id: "long_leave", title: "ลาพักยาว (ไม่หักโควตา)", keywords: ["ลาพักยาว", "ลายาว", "ลาหลายวัน", "พักเรียน", "ไม่หักโควตา"], perm: "attendance.leave_override",
    steps: "เปิด Panel นักเรียน › ปุ่ม ⋯ ซ้ายล่าง › ลาพักยาว → เลือกคาบ หรือช่วงวันที่ + หมายเหตุ · สถานะเป็น Inactive ช่วงนั้น และวันจบคอร์สเลื่อนให้อัตโนมัติ", href: "/students", hrefLabel: "หน้านักเรียน" },
  { id: "student_exit", title: "นักเรียนแจ้งออก", keywords: ["แจ้งออก", "ลาออก", "เลิกเรียน", "ไม่เรียนต่อ"], perm: "student.manage",
    steps: "Panel นักเรียน › ⋯ › แจ้งออก → เลือกวันเรียนวันสุดท้าย เหตุผล และเงินที่เหลือ (คืนเงิน / เก็บเป็นเครดิต = ออกใบลดหนี้)", href: "/students", hrefLabel: "หน้านักเรียน" },
  { id: "holiday", title: "ตั้งวันหยุด", keywords: ["วันหยุด", "holiday", "ปิดสาขา", "หยุดเรียน"], perm: "holiday.manage",
    steps: "วันหยุดบริษัท: Settings › ระบบ › วันหยุด · วันหยุดของสาขา: Settings › สาขา › เวลาเปิด-ปิด & วันหยุด (เลือกเปิดทำการในวันหยุดบริษัทได้)", href: "/settings", hrefLabel: "Settings" },
  { id: "special_period", title: "ช่วงเวลาพิเศษ (เช่น Summer)", keywords: ["ช่วงเวลาพิเศษ", "summer", "ซัมเมอร์", "ปิดเทอม", "special period"], perm: "settings.manage",
    steps: "Settings › สาขา › เวลาเปิด-ปิด › ช่วงเวลาพิเศษ › เพิ่มช่วง → เวลาเปิดของช่วงนั้น คลาสปกติเรียนต่อ/หยุด และ Memo ใบแจ้งหนี้ของช่วง", href: "/settings", hrefLabel: "Settings" },
  { id: "invoice_memo", title: "แก้ Memo ใบแจ้งหนี้", keywords: ["memo", "เมโม", "หมายเหตุใบแจ้งหนี้"], perm: "settings.manage",
    steps: "Memo ของแบรนด์: Settings › ระบบ › การเงิน · Memo เฉพาะช่วงเวลาพิเศษ: ตั้งในช่วงนั้น (ใช้กับคอร์สของช่วง)", href: "/settings?view=system&sys=billing", hrefLabel: "Settings › การเงิน" },
  { id: "staff_add", title: "เพิ่มบุคลากร / ครู", keywords: ["เพิ่มครู", "ครูใหม่", "เพิ่มพนักงาน", "บุคลากร", "เพิ่มแอดมิน", "ให้สิทธิ์"], perm: "staff.manage",
    steps: "หน้าบุคลากร › เพิ่มบุคลากร → ชื่อ บทบาทต่อสาขา (Manager / Admin / Teacher) วิชาที่สอน และเปิดบัญชีล็อกอินถ้าต้องการ", href: "/staff", hrefLabel: "หน้าบุคลากร" },
  { id: "lead", title: "จัดการ Lead (CRM)", keywords: ["lead", "ลีด", "crm", "ลูกค้าใหม่", "ทดลองเรียน", "สอบวัดระดับ"], perm: "lead.manage",
    steps: "CRM › เพิ่ม Lead หรือรับจากแชท LINE → บันทึกการติดตาม → ส่งฟอร์มสอบ/ทดลองเรียน → ส่งใบสมัครเรียน · Lead ที่สมัครแล้วกลายเป็นนักเรียน", href: "/crm", hrefLabel: "CRM" },
  { id: "line_link", title: "ผูก LINE ผู้ปกครอง", keywords: ["ผูกไลน์", "ผูก line", "line ผู้ปกครอง", "เชื่อม line", "โค้ด line"], perm: "family.manage",
    steps: "Panel ครอบครัว › สร้างโค้ดผูก LINE → ให้ผู้ปกครองส่งโค้ดเข้า LINE OA ของสาขา · สาขาต้องเชื่อม LINE OA ก่อน (Settings › สาขา › LINE Integration)", href: "/families", hrefLabel: "หน้าครอบครัว" },
  { id: "reports", title: "ดูรายงาน", keywords: ["รายงาน", "report", "รายได้", "สถิติ"], perm: "reports.view",
    steps: "หน้า Reports → เลือกหัวข้อ (ภาพรวม รายได้ นักเรียน การเข้าเรียน Operations CRM ความพึงพอใจ) และช่วงเวลา", href: "/reports", hrefLabel: "Reports" },
  { id: "switch_branch", title: "เปลี่ยนสาขาที่ทำงาน", keywords: ["เปลี่ยนสาขา", "สลับสาขา", "ดูสาขาอื่น"],
    steps: "กดการ์ดชื่อคุณที่มุมซ้ายล่าง → เลือกสาขา (เห็นเฉพาะสาขาที่คุณดูแล) · Director / Area Manager ใช้ชิปสาขาในแต่ละหน้าดูหลายสาขาพร้อมกันได้", href: "/", hrefLabel: "Dashboard" },
]

/** roles that hold a permission, as names — "Super Admin, Director" */
export function rolesWith(p: Permission): Role[] {
  return (Object.keys(ROLE_PERMISSIONS) as Role[]).filter((r) => ROLE_PERMISSIONS[r].includes(p))
}

const roleNames = (roles: Role[]) => roles.map((r) => ROLE_LABEL[r]).join(", ")
const hasPerm = (roles: Role[], p?: Permission) => !p || roles.some((r) => ROLE_PERMISSIONS[r].includes(p))

/** A handbook entry told to someone with these roles: the steps if they can do it, else who to ask. */
export function guideAnswer(g: GuideEntry, roles: Role[]): string {
  if (hasPerm(roles, g.perm)) return `${g.title}: ${g.steps}`
  return `${g.title} — สิทธิ์ของคุณ (${roleNames(roles)}) ทำเองไม่ได้ ต้องให้ ${roleNames(rolesWith(g.perm!))} เป็นคนทำ · แจ้งได้ทางปุ่ม "ส่งให้ทีม" หรือข้อความถึงทีมที่หน้าแจ้งเตือน`
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "").replace(/[?？!.,·:;"'()]/g, "")

/** character trigrams — works for Thai, which has no spaces between words */
function grams(s: string): Set<string> {
  const t = norm(s)
  const out = new Set<string>()
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3))
  if (t.length && t.length < 3) out.add(t)
  return out
}

/** 0–1 how alike two questions are */
export function similarity(a: string, b: string): number {
  const A = grams(a)
  const B = grams(b)
  if (!A.size || !B.size) return 0
  let common = 0
  A.forEach((g) => { if (B.has(g)) common++ })
  return common / Math.min(A.size, B.size) * (2 * Math.min(A.size, B.size) / (A.size + B.size))
}

/** knowledge this person may be told (an entry limited to some roles stays hidden from the rest) */
export function visibleKnowledge(k: Pick<NockKnowledge, "roles">, roles: Role[]): boolean {
  return !k.roles.length || k.roles.some((r) => roles.includes(r))
}

export function matchGuide(q: string, limit = 3): { entry: GuideEntry; score: number }[] {
  const t = norm(q)
  return NOCK_GUIDE.map((entry) => ({ entry, score: entry.keywords.filter((k) => t.includes(norm(k))).length + (similarity(q, entry.title) > 0.5 ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export function matchKnowledge(q: string, items: NockKnowledge[], roles: Role[], limit = 4): { item: NockKnowledge; score: number }[] {
  return items.filter((k) => visibleKnowledge(k, roles))
    .map((item) => ({ item, score: Math.max(similarity(q, item.question), similarity(q, item.answer) * 0.6) }))
    .filter((x) => x.score >= 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** a knowledge entry this close is the same question — answer with it directly */
export const KNOWLEDGE_SURE = 0.55

/**
 * Nock's answer without an AI model: a near-identical answered question first, then the handbook. null = Nock
 * doesn't know — the question goes to the team.
 */
export function localAnswer(q: string, items: NockKnowledge[], roles: Role[]):
  { text: string; source: "knowledge" | "guide"; links: { label: string; href: string }[]; knowledgeId?: string } | null {
  const k = matchKnowledge(q, items, roles, 1)[0]
  if (k && k.score >= KNOWLEDGE_SURE) return { text: k.item.answer, source: "knowledge", links: [], knowledgeId: k.item.id }
  const g = matchGuide(q, 1)[0]
  if (g) return { text: guideAnswer(g.entry, roles), source: "guide", links: [{ label: g.entry.hrefLabel, href: g.entry.href }] }
  return null
}

/** what the AI model is told — the asker, their permissions, the handbook and the matching knowledge */
export function nockSystemPrompt(input: { name: string; roles: Role[]; branch: string; page: string; knowledge: NockKnowledge[]; question: string }): string {
  const allowed = (Object.values(ROLE_PERMISSIONS).flat() as Permission[]).filter((p, i, a) => a.indexOf(p) === i)
  const can = allowed.filter((p) => hasPerm(input.roles, p))
  const cannot = allowed.filter((p) => !hasPerm(input.roles, p))
  const guide = matchGuide(input.question, 4).map((x) => x.entry)
  const guideText = (guide.length ? guide : NOCK_GUIDE).map((g) => `- [${g.id}] ${g.title} (ต้องมีสิทธิ์: ${g.perm ? `${g.perm} = ${roleNames(rolesWith(g.perm))}` : "ทุกคน"}) → ${g.steps} · ลิงก์ ${g.href}`).join("\n")
  const kb = matchKnowledge(input.question, input.knowledge, input.roles).map((x) => `- ถาม: ${x.item.question}\n  ตอบ (ทีมเขียน): ${x.item.answer}`).join("\n")
  return [
    "คุณคือ Nock ผู้ช่วยในระบบ NockERP ของโรงเรียนกวดวิชา NockAcademy / Liclass ตอบเป็นภาษาไทย สั้น ชัด เป็นขั้นตอน",
    `ผู้ถาม: ${input.name} · บทบาท: ${roleNames(input.roles)} · สาขา: ${input.branch} · อยู่หน้า: ${input.page}`,
    `สิทธิ์ที่ผู้ถามมี: ${can.join(", ") || "—"}`,
    `สิทธิ์ที่ผู้ถามไม่มี: ${cannot.join(", ") || "—"}`,
    "กฎ: ตอบจากข้อมูลด้านล่างเท่านั้น ห้ามเดา · ถ้าเรื่องนั้นต้องใช้สิทธิ์ที่ผู้ถามไม่มี ให้บอกว่าทำเองไม่ได้ และต้องให้ใคร (บทบาทไหน) ทำ แนะนำให้กดปุ่ม \"ส่งให้ทีม\" · ถ้าข้อมูลไม่พอจะตอบ ให้ confident = false",
    `คู่มือระบบ:\n${guideText}`,
    kb ? `คำตอบที่ทีมเคยเขียนไว้ (เชื่อถือได้ ใช้ก่อนคู่มือ):\n${kb}` : "",
    'ตอบเป็น JSON อย่างเดียว: {"answer": "ข้อความคำตอบ", "confident": true|false, "links": [{"label": "ชื่อหน้า", "href": "/path"}]}',
  ].filter(Boolean).join("\n\n")
}

/** Super Admin, Director, Area Manager and Manager answer the team's questions */
export const NOCK_ANSWERERS: Role[] = ["super_admin", "director", "area_manager", "manager"]
export function canAnswerNock(me: Pick<Staff, "roles">): boolean {
  return me.roles.some((r) => NOCK_ANSWERERS.includes(r))
}

export const NOCK_STATUS_LABEL: Record<NockQuestion["status"], string> = { ai: "Nock ตอบแล้ว", unanswered: "ยังไม่มีคำตอบ", answered: "ทีมตอบแล้ว" }
