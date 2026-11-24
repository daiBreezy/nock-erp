import { ARCH_PAGES } from "./architecture"

// Feature tree (owner 2026-11-24): every "List" of the ERP (a page / app), its features as a tree you can expand, what each one does,
// and which parts are still Pending. The /checklist page (tab "ฟีเจอร์ทั้งหมด") reads this file only.
// Written from the code. A list with `tree: null` is not written yet. Claude fills it module by module and updates the
// branch of the tree it touched at the end of every piece of work (see erp-v2/CLAUDE.md).

export interface FeatureNode {
  /** the feature's name */
  t: string
  /** how it works — 1–3 short lines, shown when the node is opened */
  how?: string
  /** not finished / known gap */
  pending?: boolean
  /** put on hold on purpose / waiting for a talk before it is built (owner 2026-11-24) */
  hold?: boolean
  /** a page that shows it */
  href?: string
  /** sub-features */
  c?: FeatureNode[]
}

export interface FeatureList {
  id: string
  group: string
  label: string
  href?: string
  /** one line: what the page is for */
  purpose?: string
  /** true = converted from the ERP map (data/architecture.ts), not written feature by feature */
  draft?: boolean
  /** the day its named features were checked against the code (a script looks each one up) */
  checked?: string
  /** null = not written yet */
  tree: FeatureNode[] | null
}

export const FEATURE_GROUPS = ["หลัก", "คน", "งานสอน", "การเงิน & แอดมิน", "ระบบ", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "เอกสาร"] as const

const STUDENTS: FeatureNode[] = [
  { t: "ดูรายชื่อ", c: [
    { t: "การ์ดตัวเลข", how: "กำลังเรียน · รอต่อคอร์ส · นักเรียนใหม่เดือนนี้ · ต้องตามเรื่อง (แจ้งออก + ยังไม่ผูกครอบครัว). กดการ์ด = กรองตาราง กดซ้ำเพื่อล้าง" },
    { t: "ตาราง", how: "คอลัมน์: รูป · ชื่อเล่น · สาขา · ชั้น · ครอบครัว · Course · รถรับส่ง (เฉพาะสาขามีรถ) · Credit (ถ้าเปิด) · End date · เหลือ · สถานะ. ลาก/ปักหมุด/ซ่อนคอลัมน์ได้ จำค่าต่อคน", c: [
      { t: "คอลัมน์ที่ซ่อนไว้ก่อน (เปิดจากเมนูคอลัมน์)", how: "ชื่อ-นามสกุล · Enroll date · โรงเรียนเป้าหมาย · ผลสอบโรงเรียนรายวิชา (% + ▲▼)" },
      { t: "ลำดับแถว", how: "แจ้งออกก่อน → แพ็กเกจใกล้หมด (≤ 7 วัน/รอต่อ) → ที่เหลือตามที่เรียงเอง" },
      { t: "แก้ในตาราง", how: "คลิกแก้ได้เฉพาะชื่อเล่น · ชื่อ · ชั้น (ช่องอื่นเปิดแผง) · คลิกรูป = เปลี่ยน/ลบรูปโปรไฟล์" },
    ] },
    { t: "ค้นหา & ตัวกรอง", how: "ค้นหาชื่อ/ชื่อเล่น/ครอบครัว/เบอร์ · กรองชั้น · สถานะ (รวม แจ้งออก) · ติ๊ก Archived เพื่อดูคนที่เลิกเรียน (ซ่อนไว้ก่อน) · ตัวกรองอยู่ใน URL รีโหลด/ส่งลิงก์แล้วคงเดิม" },
    { t: "ส่งออก CSV", how: "เฉพาะผู้มีสิทธิ์ student.export · ไม่รวมเบอร์โทร/ที่อยู่" },
    { t: "ดูหลายสาขา", how: "Director / Area Manager เลือกดูหลายสาขาพร้อมกัน มีคอลัมน์สาขา" },
  ] },
  { t: "สถานะนักเรียน", how: "คำนวณจากแพ็กเกจ+ลา ไม่เก็บเป็นข้อมูล (นิยามเดียวทุกหน้า)", c: [
    { t: "Active", how: "มีแพ็กเกจที่ใช้อยู่ (หรือจ่ายแล้วคาบแรกยังอยู่ข้างหน้า)" },
    { t: "รอต่อคอร์ส (Renewal)", how: "แพ็กเกจทุกอันจะหมดภายใน 7 วัน" },
    { t: "Inactive", how: "ลาพักยาวอยู่ หรือไม่มีแพ็กเกจที่ใช้อยู่" },
    { t: "Archived", how: "เลิกเรียนแล้ว (ปิดบัญชี) — ประวัติยังอยู่" },
    { t: "แจ้งออก", how: "สถานะเสริมซ้อน: ผู้ปกครองบอกว่าจะออก ยังไม่ปิดบัญชี — แถวขึ้นแดง" },
  ] },
  { t: "สร้างนักเรียน", c: [
    { t: "เพิ่มเอง (แผงเพิ่มนักเรียน)", href: "/students", how: "ใช้ช่องเดียวกับฟอร์มที่ผู้ปกครองกรอกใน LINE · บังคับเลือกช่องทางที่รู้จัก · เลือกครอบครัว/รถได้", c: [
      { t: "ใส่เข้าคลาสทันที", how: "เลือกคลาสตอนสร้าง → เข้าตั้งแต่คาบถัดไปที่ยังไม่เริ่ม" },
      { t: "กันซ้ำ", how: "เช็กชื่อเต็มซ้ำ · ชื่อเล่น+วันเกิด/ครอบครัว/เบอร์ → ถามว่าจะ \"ใช้รายชื่อเดิม (รวม)\" แทนสร้างซ้ำ (ถ้าเคย Archive จะกลับมาเรียนให้)" },
    ] },
    { t: "จากฟอร์มผู้ปกครอง (LINE)", href: "/inbox", how: "ผู้ปกครองกรอกฟอร์ม Test/Trial/Enroll → แอดมินอนุมัติในแชท Inbox → ระบบสร้างหรือผูกนักเรียน+ครอบครัวให้", c: [
      { t: "Edit Form ก่อนอนุมัติ", how: "แก้คำตอบของผู้ปกครองได้ขณะรออนุมัติ (ช่อง null = ลบ) · อนุมัติแล้วแก้ไม่ได้" },
      { t: "ฟอร์ม enroll ซ้ำของนักเรียนเดิม", how: "นักเรียนเดิม (ชื่อตรงกันในครอบครัว) ไม่ถูกเขียนทับ — โรงเรียนเป้าหมายใหม่ยังไม่อัปเดตให้", pending: true },
    ] },
    { t: "จาก Lead (CRM)", href: "/crm", how: "เพิ่มลูกในการ์ด Lead → นักเรียนถูกสร้างเมื่อนัดสอบ/ทดลองเรียน แล้วโยงกับ Lead" },
    { t: "นำเข้าจากระบบเก่า", how: "นักเรียนที่นำเข้ามีป้าย imported — ไม่เก็บค่าแรกเข้า (ใบแจ้งหนี้บอกแอดมิน)" },
  ] },
  { t: "แผงนักเรียน (กดแถว)", c: [
    { t: "ภาพรวม", how: "ตัวเลข+แพ็กเกจ (เหลือกี่คาบ · จบวันไหน · อีกกี่วัน) · ข้อมูลพื้นฐาน (วันเกิด · โรงเรียน · โรงเรียนเป้าหมาย · รถ) · พี่น้องในครอบครัว · แถบแจ้งออก" },
    { t: "คลาส", how: "คาบเรียนของนักเรียน (วัน เวลา วิชา ครู รถ สถานะ) กรองตามวิชาได้ · สลับไป ประวัติคอร์ส" },
    { t: "การเงิน", how: "ใบแจ้งหนี้ของนักเรียน (เลขที่ รายการ ยอด สถานะ) — เห็นเฉพาะผู้มีสิทธิ์ billing.view" },
    { t: "โน้ต", how: "โน้ตภายในของนักเรียน" },
    { t: "Timeline", how: "ประวัติทุกอย่างที่เกิดกับนักเรียน (ใคร ทำอะไร เมื่อไร) — ผลสอบ/ลาพักยาว/Archive ก็ลงที่นี่" },
    { t: "เมนู ⋯", how: "แก้ไข · กลับมาเรียน (เมื่อ Archived) · ลาพักยาว · แจ้งออก (ปุ่มสีแดงอยู่ในเมนูนี้เท่านั้น)" },
  ] },
  { t: "ข้อมูลที่เก็บ", c: [
    { t: "โรงเรียน", how: "ค้นหาจากรายชื่อกระทรวงศึกษาธิการ (จังหวัดของสาขาขึ้นก่อน) หรือพิมพ์เอง — รายงานจัดกลุ่มตามรหัสโรงเรียน" },
    { t: "โรงเรียนเป้าหมาย", href: "/students", how: "สูงสุด 3 โรงเรียน เรียงตามที่อยากได้ — กรอกจากฟอร์มสมัครหรือแผง, เห็นในแผงนักเรียน/ครอบครัว/Lead" },
    { t: "ผลสอบโรงเรียน", href: "/exams", how: "กรอกที่เมนู ผลสอบโรงเรียน (ปีการศึกษา × 4 ครั้ง × วิชา) — ตารางนักเรียนมีคอลัมน์ซ่อนไว้ดูเทียบครั้งก่อน" },
    { t: "รถรับส่ง", how: "4 แบบ (ไม่ใช้ / รับ / ส่ง / รับ+ส่ง) — แสดงเฉพาะสาขาที่เปิดรถ" },
  ] },
  { t: "ลาพักยาว (ไม่หักโควตา)", how: "ช่วงวันที่ระดับนักเรียน — ช่วงนั้นสถานะ Inactive, ทุกแพ็กเกจยืดวันจบให้เอง, แจ้งเตือน Manager + ครูประจำวิชา, แก้ได้เสมอ (แจ้งซ้ำ)" },
  { t: "Credit Course (เรียนก่อนจ่าย)", how: "แอดมินเพิ่มคอร์สให้นักเรียนตรงๆ → สิทธิ์เรียนมีทันที ใบแจ้งหนี้ออกและตามทีหลัง · เป็น \"credit\" จนกว่าใบที่หยิบไปจะจ่ายแล้ว · คอลัมน์ Credit โชว์ยอดค้าง (ปิด/เปิดได้ใน Settings › System)" },
  { t: "แจ้งออก & Archive", c: [
    { t: "แจ้งออก (ขั้น 1)", how: "แอดมินใส่วันสุดท้าย (เริ่มต้น = วันที่แพ็กเกจจบ) แล้วส่งฟอร์มแจ้งออกทาง LINE หรือก๊อปลิงก์ · พี่น้องที่ออกด้วยไปอยู่ฟอร์มเดียวกัน" },
    { t: "ผู้ปกครองตอบฟอร์ม", how: "เหตุผลที่ออก · จะกลับไหม (แน่นอน/อาจจะ/ไม่) · คะแนนครู/เนื้อหา/แอดมิน/ความคุ้มค่า → ใช้ในรายงาน Lost" },
    { t: "ปิดบัญชี (Archive)", how: "ต้องใส่เหตุผล · นักเรียนถูกเอาออกจากทุกคลาสและคาบที่ยังไม่เริ่ม (ประวัติเก็บไว้) · บันทึกลง Timeline" },
    { t: "Restore (กลับมาเรียน)", how: "ยกเลิก Archive — แต่ไม่ได้ใส่กลับคลาสให้ ต้องเพิ่มเข้าคลาสใหม่จากปฏิทิน/ใบแจ้งหนี้" },
  ] },
  { t: "เลื่อนชั้นประจำปี", how: "วันเลื่อน (เริ่มต้น 1 เม.ย. Director ตั้งต่อธุรกิจ) · แบนเนอร์เตือนก่อน 7 วัน · Admin อนุมัติ (หรือสาขาตั้งอัตโนมัติ) · ม.6 → \"จบการศึกษา\" · ยกเว้นรายคนได้" },
  { t: "ต่อคอร์ส (Renewal)", how: "คนสถานะรอต่ออยู่ในรายการตามต่อ · บันทึกการโทร/ทัก (ติดต่อไม่ได้ → ตั้งวันลองใหม่ ซ่อนจากรายการวันนี้) · ไม่ต่อ = ไปทางแจ้งออก" },
]

// ───────────────────────── first drafts: converted from the ERP map (data/architecture.ts), which was written from the code
/** split at " · " (or any separator) only OUTSIDE brackets, so "(ติดต่อ · นัดสอบ)" stays in one piece */
const splitTop = (text: string, sep: string): string[] => {
  const out: string[] = []
  let depth = 0, cur = ""
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if ("([{".includes(ch)) depth++
    if (")]}".includes(ch)) depth = Math.max(0, depth - 1)
    if (depth === 0 && text.startsWith(sep, i)) { out.push(cur.trim()); cur = ""; i += sep.length - 1; continue }
    cur += ch
  }
  out.push(cur.trim())
  return out.filter(Boolean)
}
const leaves = (parts: string[]): FeatureNode[] => parts.map((t) => ({ t }))
/**
 * One line of the ERP map → tree nodes (owner 2026-11-24): "Heading: detail" gets the detail under it; a detail made of short
 * " · " parts becomes one child per part; a " → " flow becomes numbered steps; a plain " · " line becomes sibling nodes.
 */
const toNodes = (item: string): FeatureNode[] => {
  const i = item.indexOf(": ")
  const balanced = (x: string) => (x.match(/[(\[{]/g)?.length ?? 0) === (x.match(/[)\]}]/g)?.length ?? 0)
  const head = i > 0 && i <= 44 && !item.slice(0, i).includes("→") && balanced(item.slice(0, i)) ? item.slice(0, i) : null
  const body = head ? item.slice(i + 2) : item
  const steps = splitTop(body, " → ")
  if (steps.length >= 3) return [{ t: head ?? "ลำดับขั้นตอน", c: steps.map((t, k) => ({ t: `${k + 1}. ${t}` })) }]
  const parts = splitTop(body, " · ")
  if (head) return parts.length >= 3 && parts.every((x) => x.length <= 80) ? [{ t: head, c: leaves(parts) }] : [{ t: head, how: body }]
  return parts.length >= 2 && parts.every((x) => x.length <= 120) ? leaves(parts) : [{ t: item }]
}
const fromArch = (href: string): { purpose: string; tree: FeatureNode[] } | null => {
  const p = ARCH_PAGES.find((x) => x.href === href)
  if (!p) return null
  const tree: FeatureNode[] = p.features.map((f) => ({ t: f.title, c: f.items.flatMap(toNodes) }))
  if (p.panels?.length) tree.push({ t: "แผง / หน้าต่างที่เปิดจากหน้านี้", c: p.panels.map((x) => ({ t: x })) })
  tree.push({ t: "ใครเห็น / ข้อมูล / กฎในโค้ด", how: `ใครเห็น: ${p.who}${p.reads ? ` · ข้อมูลที่ใช้: ${p.reads.join(", ")}` : ""}${p.rules ? ` · กฎธุรกิจ: ${p.rules.join(", ")}` : ""}` })
  return { purpose: p.purpose, tree }
}
const L = (id: string, group: (typeof FEATURE_GROUPS)[number], label: string, href?: string, tree?: FeatureNode[], archHref?: string): FeatureList => {
  if (tree) return { id, group, label, href, tree }
  const d = archHref ?? href ? fromArch((archHref ?? href)!) : null
  return d ? { id, group, label, href, purpose: d.purpose, tree: d.tree, draft: true, checked: "2026-11-24" } : { id, group, label, href, tree: null }
}

/** a feature added to a list's tree (optionally inside one of its top-level groups) — for things built after the ERP map was written */
const add = (id: string, node: FeatureNode, at?: string) => {
  const l = FEATURE_LISTS.find((x) => x.id === id)
  if (!l?.tree) return
  const group = at ? l.tree.find((x) => x.t === at) : undefined
  if (group) (group.c ??= []).push(node)
  else l.tree.splice(Math.max(0, l.tree.length - 1), 0, node)
}

/** a known gap — added to a list's tree as a Pending node (keep in step with data/checklist.ts) */
const pend = (id: string, t: string, how: string, at?: string) => {
  const l = FEATURE_LISTS.find((x) => x.id === id)
  if (!l?.tree) return
  const node: FeatureNode = { t, how, pending: true }
  const group = at ? l.tree.find((x) => x.t === at) : undefined
  if (group) (group.c ??= []).push(node)
  else l.tree.push(node)
}

const EXAMS: FeatureNode[] = [
  { t: "ผลสอบโรงเรียนต่อครั้ง", how: "เลือกปีการศึกษา (ตัวเลือกกลาง) + ครั้งสอบ (กลางภาค 1 · ปลายภาค 1 · กลางภาค 2 · ปลายภาค 2) — หัวหน้าบอกช่วงเดือนของครั้งนั้น · ตารางนักเรียน: Done / Waiting + คะแนนรายวิชา", c: [
    { t: "ช่องวิชา", how: "▲▼ เทียบครั้งก่อน · คะแนน/เต็ม · % ขึ้นเมื่อ hover แถว · วิชาเพิ่มเติม (Optional) ซ่อนไว้ก่อน เปิดจากเมนูคอลัมน์" },
    { t: "ตัวกรอง", how: "ชั้น · โรงเรียน (ดรอปดาวน์ค้นหาได้) · วิชา → เหลือวิชาเดียว แสดง 4 ครั้งก่อนหน้า + ครั้งที่เลือก" },
    { t: "Edit ในตาราง", how: "กดปุ่ม Edit → ทุกช่องเป็นกล่อง คะแนน / เต็ม ออกจากกล่องแล้วบันทึกทันที · ช่องว่าง = ลบคะแนนวิชานั้น" },
    { t: "ช่วงเดือนของแต่ละครั้งสอบ", how: "ผมตั้งเอง: กลาง 1 ก.ค.–ส.ค. · ปลาย 1 ก.ย.–ต.ค. · กลาง 2 ธ.ค.–ม.ค. · ปลาย 2 ก.พ.–มี.ค. — ยังไม่ได้ยืนยัน", pending: true },
  ] },
  { t: "แผงนักเรียน", how: "ตาราง วิชา · คะแนนที่ได้ · คะแนนเต็ม · % ต่อครั้ง + การ์ดภาพรวมปีนี้ 4 ครั้ง · ครูกรอกได้เฉพาะนักเรียนในคลาสตัวเอง Admin/Manager ทั้งสาขา" },
  { t: "วิชา", how: "NockAcademy 8 วิชา (คณิต/วิทย์/อังกฤษ พื้นฐาน + เพิ่มเติม*, ไทย, สังคม; *Optional) · Liclass 5 (คณิต อังกฤษ วิทย์ สังคม ญี่ปุ่น) · ปุ่ม จัดการวิชา เพิ่มวิชาเองได้ต่อสาขา" },
  { t: "ใน Reports", href: "/reports?tab=students", how: "การ์ดพัฒนาการผลสอบ: เทียบครั้งล่าสุดกับครั้งก่อน รายวิชา และเฉลี่ยทุกครั้ง", c: [{ t: "วิธีวัดพัฒนาการ", how: "ผมเดาเอง (จุด % เฉลี่ยของครั้งล่าสุดเทียบครั้งก่อน) — ให้ Shibasan ดูว่าตรงไหม", pending: true }] },
]

const CHECKLIST_TREE: FeatureNode[] = [
  { t: "งานค้าง", how: "รายการที่ยังไม่เสร็จ แยกตามส่วนของ ERP — ค้าง · รอตัดสินใจ · ควรทำ · ใครรอ · วิธีเช็ก · ลิงก์ไปหน้า · ข้อที่เสร็จแล้วพับเก็บตามรอบ (src/data/checklist.ts)" },
  { t: "ฟีเจอร์ทั้งหมด", how: "ทรีของทุก List (หน้านี้) · กางทีละชั้น · Pending · เฉพาะ Pending · สารบัญซ้ายมีตัวเลข (src/data/features.ts)" },
  { t: "ป้ายที่เมนู", how: "ตัวเลขข้อที่ยังไม่เสร็จที่เมนู Checklist" },
  { t: "แผนที่ ERP", href: "/architecture", how: "หน้าเดิม (ร่างต้นทางของทรีหลายตัว) ยังอยู่ — กดจากปุ่มมุมขวาบน" },
]

const REPORTS: FeatureNode[] = [
  { t: "ตัวควบคุมบนสุด", c: [
    { t: "ขอบเขต", how: "ทุกสาขา (หรือทุกสาขาในเขตที่ดูได้) · ภูมิภาค/จังหวัด · ประเภทธุรกิจ (NockAcademy / Liclass) · ภูมิภาค × ธุรกิจ · สาขาเดียว — ตัวเลือกที่เห็นตามสิทธิ์" },
    { t: "ช่วงเวลา", how: "เลือกปี · สะสมถึงวันนี้ · ไตรมาส · เดือน" },
    { t: "เทียบกับ", how: "ไม่เทียบ · ช่วงก่อนหน้า (MoM/QoQ) · ปีก่อน (YoY) · เลือกปีเอง — ตัวเลขขึ้น Δ อัตโนมัติ" },
    { t: "ดาวน์โหลดรายงาน", how: "ปุ่มดาวน์โหลดตามขอบเขต/ช่วงเวลา/การเทียบที่เลือก" },
  ] },
  { t: "แท็บ ภาพรวม", c: [
    { t: "การ์ดสรุป นักเรียน / คอร์ส / Lead", how: "แต่ละการ์ดมีตัวเลขสรุปของช่วงที่เลือก (เทียบช่วงก่อนเมื่อเปิดเทียบ) และปุ่มไปดูทั้งหมดที่แท็บ รายได้/นักเรียน" },
    { t: "รายได้รายเดือน", how: "รายได้จริงรายเดือนของปี + ประมาณการเดือนที่เหลือ (จริงสะสม + คาดว่าจะเข้าอีก = ประมาณการทั้งปี) เทียบปีก่อนได้" },
    { t: "Subject Engine", how: "รายได้ค่าเรียนแยกวิชา — คอร์สที่มีหลายวิชาแบ่งรายได้เท่าๆ กัน" },
    { t: "รายได้ตามสาขา", how: "เทียบทุกสาขาในขอบเขต (ขึ้นเมื่อเปิดเทียบ)" },
  ] },
  { t: "แท็บ รายได้", c: [
    { t: "การ์ด", how: "รายได้รวม · ใบแจ้งหนี้ที่จ่ายแล้ว · นักเรียนที่จ่าย · เฉลี่ยต่อใบ" },
    { t: "ประเภทรายได้", how: "ค่าเรียน · ค่ารถ · ค่าแรกเข้า/ค่าธรรมเนียม · … · ใบลดหนี้ (ติดลบ) พร้อม % เปลี่ยนเทียบช่วงก่อน และยอดรวม" },
    { t: "Subject Engine · รายได้ตามสาขา", how: "แยกรายได้ค่าเรียนตามวิชา และตามสาขา (สาขาขึ้นเมื่อเปิดเทียบ)" },
    { t: "แพ็กเกจขายดี", how: "จำนวน (Volume) เทียบรายได้ (Value) ของแต่ละแพ็กเกจ" },
    { t: "แพ็กเกจ × วิชา / ระดับชั้น", how: "ตารางไขว้ สลับดูตามวิชาหรือตามระดับชั้น และสลับตัวเลขเป็นจำนวนหรือยอดเงิน" },
    { t: "ครอบครัวทั้งหมด", how: "ครอบครัวที่จ่ายเงินในช่วงนี้ (แสดงจำนวนครอบครัว) — ตารางรายครอบครัว" },
  ] },
  { t: "แท็บ นักเรียน", c: [
    { t: "การ์ดนักเรียน", how: "Active วันนี้ · Pause (ลาพักยาว) · ใหม่ · กลับมาซื้อใหม่ · Churn (เทียบช่วงก่อน)" },
    { t: "พัฒนาการผลสอบโรงเรียน", href: "/exams", how: "เทียบครั้งล่าสุดกับครั้งก่อน: จุด % เฉลี่ย · ▲/=/▼ กี่คน · รายวิชา · เฉลี่ยแต่ละครั้งที่สอบ", c: [{ t: "วิธีวัดพัฒนาการ", how: "ผมเดาเอง — ให้ Shibasan ดูว่าตรงไหม", pending: true }] },
    { t: "การไหลเข้า–ออก · นักเรียน", how: "Sankey: ต้นช่วง → ใหม่/กลับมา → Active/Pause/รอต่อ/Churn — แต่ละคนนับครั้งเดียว" },
    { t: "การไหลเข้า–ออก · คอร์ส", how: "แบบเดียวกัน แต่นับทีละคอร์สที่นักเรียนถือ (คอร์ส/คน, Act buy)" },
    { t: "ความเคลื่อนไหวรายเดือน", how: "เหนือเส้น = เข้า (ใหม่ + กลับมา) ใต้เส้น = ออก (Pause/Lost)" },
    { t: "สัดส่วนในช่วงนี้", how: "โดนัท ใหม่/กลับมา/Pause/Lost + สุทธิ · ดูรายชื่อได้" },
    { t: "แยกตามสาขา", how: "ตารางสาขา: Active · ใหม่ · กลับมา · Lost · Pause · สุทธิ (เมื่อเปิดเทียบ)" },
  ] },
  { t: "แท็บ การเข้าเรียน", c: [
    { t: "การ์ด", how: "อัตราเข้าเรียน · มา · ลา · คาบยกเลิก · ยกเลิกเพราะครูลา · หยุดช่วงพิเศษ/อื่นๆ" },
    { t: "อัตราเข้าเรียนรายเดือน", how: "กราฟรายเดือน" },
    { t: "แยกตามวิชา / สาขา / วัน", how: "เทียบอัตราเข้าเรียน" },
    { t: "คลาสที่เข้าเรียนต่ำสุด", how: "จัดอันดับคลาส กดเปิดแผงได้" },
    { t: "นักเรียนลาบ่อย", how: "ลา ≥ 2 ครั้งในช่วงนี้ = เสี่ยงหลุด · กดชื่อเปิดแผงนักเรียน" },
  ] },
  { t: "แท็บ Operations", c: [
    { t: "การ์ดครู", how: "ครูที่สอนในช่วงนี้ · ชั่วโมงสอนรวม · ชั่วโมง Part-time · งานค้างของครู" },
    { t: "Members Conversion rate", how: "Admin/ครูที่ดูแล Lead — ดูแลกี่ราย สมัครกี่ราย (ตามผู้ดูแลของ Lead ที่เข้ามาในช่วงนี้)" },
    { t: "Teacher Performance", how: "ตารางครู: อายุงาน · Lead → ทดสอบ/ทดลอง → ลงทะเบียน · นักเรียน/คอร์ส · Churn · Referral · ACI (NPS ผู้ปกครองของครูคนนั้น)", c: [
      { t: "ข้อมูลที่โชว์เป็นข้อมูลปลอม (mock)", how: "โปรโตไทป์ยังไม่มีข้อมูลอายุงาน/funnel/churn/คะแนนรายครู ตัวเลขทุกตัวสร้างจากรหัสครู (คงที่ทุกครั้งที่เปิด) — เปลี่ยนที่ mockTeacher เมื่อ Dev ต่อข้อมูลจริง", pending: true },
      { t: "Metric และ Logic การแสดงผล", how: "ยังไม่มั่นใจว่าโอเคไหม — รอ Shibasan รีวิว", pending: true },
    ] },
    { t: "ความเต็มของคลาส", how: "นักเรียน ÷ ขนาดที่แนะนำ (กลุ่ม 6 · เดี่ยว 3) เรียงคลาสที่ว่างสุดขึ้นบน — บอกจำนวนคลาสที่คนน้อย/เกิน" },
    { t: "Teacher Health (ซ่อนไว้)", how: "ของเดิม ปิดไว้ด้วยสวิตช์ SHOW_TEACHER_HEALTH — ถูกแทนด้วย Teacher Performance" },
  ] },
  { t: "แท็บ CRM", c: [
    { t: "การ์ด", how: "Lead ใหม่ · สมัครแล้ว · Conversion · วันถึงสมัคร (มัธยฐาน) · Lead ที่ยังเปิดอยู่" },
    { t: "Lead รายเดือน", how: "กราฟรายเดือน" },
    { t: "Lead ที่หลุด", how: "ปิดไปที่ขั้นไหน · เพราะอะไร · จากคอร์ส/ครูไหน — ข้อมูลสำคัญ ให้ดูก่อนแหล่งที่มา" },
    { t: "แหล่งที่มา (Source)", how: "เรียงตามจำนวนที่สมัคร · รายได้ = เงินที่นักเรียนจาก Lead เหล่านี้จ่ายมาแล้วทั้งหมด" },
    { t: "แยกตามสาขา", how: "เทียบสาขา" },
  ] },
  { t: "แท็บ ความพึงพอใจ", c: [
    { t: "การ์ด", how: "NPS · ตอบแล้ว · พอใจเฉลี่ย 5 ด้าน · ไม่แนะนำ (0–6) · ยังไม่ได้โทร" },
    { t: "ความพึงพอใจ 5 ด้าน", how: "จากแบบสอบถามผู้ปกครอง (ครู · เนื้อหา · แอดมิน ฯลฯ)" },
    { t: "คอร์สที่อยากให้เปิดเพิ่ม", how: "สรุปจากคำตอบผู้ปกครอง" },
    { t: "NPS ตามสาขา", how: "เทียบสาขา" },
    { t: "ผลการติดตามผู้ปกครองที่ไม่พอใจ", how: "ผู้ปกครองที่ให้คะแนนต่ำ — โทรหาแล้วหรือยัง (ควรโทรภายใน 3 วัน)" },
    { t: "ข้อความถึงครูและสถาบัน", how: "คอมเมนต์ที่ผู้ปกครองเขียน" },
    { t: "ตัวกรองของแท็บนี้", how: "แท็บนี้ใช้ตัวกรองของแบบสอบถามเอง แทนแถบช่วงเวลา/เทียบปกติ" },
  ] },
]

export const FEATURE_LISTS: FeatureList[] = [
  L("dashboard", "หลัก", "Dashboard", "/"),
  L("crm", "หลัก", "CRM (ลีด)", "/crm"),
  L("inbox", "หลัก", "Inbox", "/inbox"),
  L("calendar", "หลัก", "ปฏิทิน", "/calendar"),
  L("forms", "หลัก", "ฟอร์มผู้ปกครอง", "/forms"),
  L("students", "คน", "นักเรียน", "/students", STUDENTS),
  L("families", "คน", "ครอบครัว", "/families"),
  L("staff", "คน", "บุคลากร", "/staff"),
  L("courses", "งานสอน", "คอร์ส", "/courses"),
  L("classes", "งานสอน", "คลาส", "/classes"),
  L("sessions", "งานสอน", "คาบเรียน & เช็คชื่อ", "/sessions"),
  L("attendance", "งานสอน", "รายงานเข้าเรียน", "/attendance"),
  L("summaries", "งานสอน", "สรุปการเรียน", "/summaries"),
  L("exams", "งานสอน", "ผลสอบโรงเรียน", "/exams", EXAMS),
  L("transport", "งานสอน", "รถรับส่ง", "/transport"),
  L("billing", "การเงิน & แอดมิน", "ใบแจ้งหนี้ & รับเงิน", "/billing"),
  L("reports", "การเงิน & แอดมิน", "Reports", "/reports", REPORTS),
  L("tasks", "การเงิน & แอดมิน", "Tasks (Coming soon)", "/tasks"),
  L("settings", "ระบบ", "ตั้งค่า", "/settings"),
  L("nock", "ระบบ", "คลังคำถาม Nock", "/nock"),
  L("logs", "ระบบ", "Logs & Timeline (Coming soon)", "/logs"),
  L("checklist", "ระบบ", "Checklist & ฟีเจอร์", "/checklist", CHECKLIST_TREE),
  L("notifications", "ระบบ", "แจ้งเตือน", "/notifications"),
  L("parent-app", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "แอปผู้ปกครอง (LINE)", undefined, undefined, "/liff/form?app=parent"),
  L("liff-form", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "ฟอร์มผู้ปกครอง (LIFF)", undefined, undefined, "/liff/form"),
  L("liff-exit", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "ฟอร์มแจ้งออก", undefined, undefined, "/liff/exit"),
  L("liff-survey", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "แบบสอบถามความพึงพอใจ", undefined, undefined, "/liff/survey"),
  L("liff-custom", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "ฟอร์มที่บริษัทสร้างเอง", undefined, undefined, "/liff/custom"),
  L("liff-catalog", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "แคตตาล็อกคอร์ส", undefined, undefined, "/liff/catalog"),
  L("driver-app", "ฝั่งผู้ปกครอง & คนขับ (LINE)", "แอปคนขับ", undefined, undefined, "/liff/form?app=driver"),
  L("print", "เอกสาร", "เอกสารพิมพ์ (Invoice · Receipt · เซ็ต)", undefined, undefined, "/print"),
]

/** a whole part put on hold */
const hold = (id: string, t: string, how: string) => { const l = FEATURE_LISTS.find((x) => x.id === id); if (l?.tree) l.tree.push({ t, how, hold: true }) }

add("transport", { t: "การ์ดรายงาน (แท็บ รายงาน)", how: "ผู้โดยสารรวม · ที่นั่งที่ใช้ · เวลาต่อเที่ยว · ตรงเวลา — แยกตามประเภทเที่ยว (รอบรับ P · รอบส่ง D · รับ-ส่ง Both)" }, "มุมมอง")

// features built after the ERP map was written (Feedback Shibasan, 23 Nov 2026) — also in the trees of the lists that carry them
add("billing", { t: "ดูตัวอย่างใบแจ้งหนี้", how: "ปุ่ม ดูตัวอย่าง ในฟอร์มสร้างใบ → กระดาษ A4 เลขที่ \"DRAFT\" ไม่ออกเลข ไม่บันทึก · เปิดดูเมื่อไรก็ได้ แล้วกดสร้างเมื่อพอใจ · ลายเซ็น = ผู้สร้าง + ผู้อนุมัติ (ฟอนต์ลายเซ็นชื่อจริง)" }, "ตัวช่วยออกใบ")
add("billing", { t: "รวมรายการในใบเสร็จ", how: "ปุ่ม รวมรายการในใบเสร็จ: ติ๊กหลายบรรทัดแล้วรวมเป็นรายการเดียว ตั้งชื่อเองได้ (เช่น คอร์ส A 4,500 + ค่ารถ 500 = 5,000) · ยอดรวมเท่าเดิม · ใบแจ้งหนี้และรายงานบัญชียังเห็นบรรทัดเดิม" }, "บัญชี & เอกสาร")
add("billing", { t: "ใบเสร็จรวมหลายใบ / หลายเดือน", how: "ตอนออกใบเสร็จ เลือกรวมใบอื่นของครอบครัวที่จ่ายแล้วยังไม่ออกใบเสร็จ (เช่นคนละเดือน) ลงเอกสารใบเดียว ใช้เลขของใบแรก" }, "บัญชี & เอกสาร")
add("summaries", { t: "Liclass ไม่มี Summary", how: "สาขา Liclass ซ่อนเมนูนี้ ซ่อนสถานะ \"รอสรุป\" และช่องสรุปในแผงคาบทั้งหมด" })
add("sessions", { t: "ข้อต่างของ Liclass", how: "ไม่มีโควตาลา (ลาได้ไม่จำกัด — แพ็กเกจรายชั่วโมงยืดวันจบทุกครั้ง รายสัปดาห์/เดือนไม่ยืด) · Reschedule ไม่ล็อก 2 สัปดาห์ (ยังเช็กที่นั่งเต็ม) · ไม่มีสรุปการเรียน" })
add("calendar", { t: "Special Period (ช่วงเวลาพิเศษ)", how: "ช่วงที่ active = ปฏิทินสลับเป็นช่วงนั้น คาบปกติหยุดหมด (ข้อมูลยังเก็บ) · ช่วงที่ active ทับกันไม่ได้ · ตั้งที่ ตั้งค่า › ช่วงเวลาพิเศษ · สาเหตุที่หยุด: เหตุจากโรงเรียน = ยืดแพ็กเกจ / เหตุอื่น = ไม่ยืด" })
add("settings", { t: "ช่วงเวลาพิเศษ (Special Period)", how: "ชื่อ · วันเริ่ม-จบ · เวลาเปิดปิดต่อวัน · Memo ใบแจ้งหนี้ · สาเหตุที่คลาสปกติหยุด (โรงเรียนปิด = ยืดแพ็กเกจ) · เปิด/ปิดใช้งาน · ห้ามช่วงที่ active ทับกัน" })
add("families", { t: "โรงเรียนเป้าหมายของลูก", how: "ในข้อมูลลูกแต่ละคน (สูงสุด 3 โรงเรียน เรียงตามที่อยากได้)" })
add("crm", { t: "โรงเรียนเป้าหมายต่อลูก", how: "ในแถวลูกของ Lead: ชิปอันดับ + ปุ่มเพิ่มโรงเรียน (สูงสุด 3) — นักเรียนที่ผูกแล้วใช้ค่าเดียวกัน" })
add("liff-form", { t: "โรงเรียนที่อยากสอบเข้า", how: "ช่องไม่บังคับ เลือกได้สูงสุด 3 โรงเรียน เรียงอันดับ (ใช้ตัวเลือกโรงเรียนเดียวกับโรงเรียนปัจจุบัน) · ไปอยู่ในแผงนักเรียน/Lead เมื่ออนุมัติฟอร์ม" })
add("settings", { t: "วิชาในผลสอบโรงเรียน", how: "จัดการที่หน้า ผลสอบโรงเรียน › จัดการวิชา (ต่อสาขา) — ค่าเริ่มต้น NockAcademy 8 วิชา / Liclass 5" })

add("dashboard", { t: "ลำดับงานที่ควรทำก่อน (Daily brief)", how: "เรียงตาม \"ยิ่งรอยิ่งเสีย\": ทำก่อน = หาครูแทน · คาบชน · ยังไม่เช็คชื่อ · คำขอผู้ปกครอง → วันนี้ = แพ็กหมด ≤ 2 วัน · ลีดใหม่ (ติดต่อใน 24 ชม.) · แจ้งออก · โทรหาผู้ปกครองที่ไม่พอใจ (ใน 3 วัน) · อนุมัติสรุป/ใบแจ้งหนี้ · ยืนยันเงิน · ค้างชำระ → เร็วๆ นี้ = ครูลา · รอต่อคอร์ส · ทดลองแล้วยังไม่สมัคร · ลีดถึงวันติดตาม · ลีดเงียบ · ลาบ่อย · คลาสเล็ก → ท้ายสุด = ข้อมูลไม่ครบ (ไม่มีครอบครัว/LINE/ที่อยู่)" })

// known gaps (same as src/data/checklist.ts — keep both in step)
pend("billing", "เพิ่มใบอื่นเข้าใบเสร็จที่ออกไปแล้ว", "ตอนนี้รวมใบหลายใบ/หลายเดือนได้เฉพาะตอนออกใบเสร็จครั้งแรก")
pend("billing", "ทดสอบใช้จริงเต็มวง: ดูตัวอย่าง → สร้างใบ → รับเงิน → ใบเสร็จรวมบรรทัด → PDF", "ใบแจ้งหนี้ \"ดูตัวอย่าง\" และใบเสร็จรวมบรรทัด (ตั้งชื่อใหม่) ทำแล้ว แต่ยังไม่ได้ทดสอบตลอดวงจร")
pend("liff-form", "ช่อง \"How did you hear about us?\" ต่อสาขา", "แต่ละสาขามีรายการให้เลือกของตัวเองและจัดการเองได้ที่สาขาตัวเอง — ยังไม่ได้ทำ")
hold("parent-app", "Course Catalog / LINE Rich Menu / ข้อความ LINE ถึงผู้ปกครอง", "พักไว้ก่อน — ยังต้องคุยก่อนว่าจะเอายังไง (Welcome · Course Summary · Invoice · Noti)")
hold("tasks", "ทั้งหน้ายังเป็น Coming soon", "ยังไม่ได้ตกลงสเปก — พักไว้")
hold("logs", "ทั้งหน้ายังเป็น Coming soon", "ยังไม่ได้ตกลงสเปก — ตอนนี้ประวัติดูได้ที่ Timeline ในแผงนักเรียน/ครอบครัว/บุคลากร")
pend("billing", "คืนเงิน (refund) ของ Liclass", "ยังใช้โควตาลาค่าเริ่มต้น (÷4) ทั้งที่ Liclass ไม่มีโควตา")

const walk = (nodes: FeatureNode[], f: (n: FeatureNode) => void) => nodes.forEach((n) => { f(n); if (n.c) walk(n.c, f) })
const size = (nodes: FeatureNode[]): number => nodes.reduce((a, n) => a + 1 + (n.c ? size(n.c) : 0), 0)
/** Pending / Hold nodes inside a list's tree */
export const pendingOf = (l: FeatureList) => { let n = 0; if (l.tree) walk(l.tree, (x) => { if (x.pending) n++ }); return n }
export const holdOf = (l: FeatureList) => { let n = 0; if (l.tree) walk(l.tree, (x) => { if (x.hold) n++ }); return n }
export const featureCount = (l: FeatureList) => (l.tree ? size(l.tree) : 0)
/** Pending / Hold counted below one node (not the node itself) — shown on a collapsed row so nothing hides inside it */
export const flagsBelow = (n: FeatureNode) => { let pending = 0, hold = 0; if (n.c) walk(n.c, (x) => { if (x.pending) pending++; if (x.hold) hold++ }); return { pending, hold } }
export const hasFlag = (n: FeatureNode): boolean => !!n.pending || !!n.hold || !!n.c?.some(hasFlag)
