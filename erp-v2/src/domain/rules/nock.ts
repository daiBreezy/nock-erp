// Nock — the in-app helper (owner 2026-10-13). Answers "how do I…" questions by the asker's own permissions, and keeps
// every question so the team can answer what Nock couldn't; those answers become knowledge Nock uses next time.
// Pure rules only: the handbook, matching, what counts as answered, who may answer. The AI call is in /api/nock.

import type { NockAnswer, NockQuestion, Role, Staff } from "../types"
import { ROLE_LABEL, ROLE_PERMISSIONS, type Permission } from "./permissions"

/** Parts of the system a question can be about (owner 2026-10-13: the asker picks — not the page they were on) */
export const NOCK_LOCATIONS: { id: string; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "crm", label: "CRM / Lead" },
  { id: "inbox", label: "Inbox (LINE)" },
  { id: "forms", label: "ฟอร์มผู้ปกครอง" },
  { id: "calendar", label: "ปฏิทิน" },
  { id: "students", label: "นักเรียน" },
  { id: "families", label: "ครอบครัว" },
  { id: "staff", label: "บุคลากร" },
  { id: "courses", label: "คอร์ส" },
  { id: "classes", label: "คลาส" },
  { id: "sessions", label: "คาบเรียน & เช็คชื่อ" },
  { id: "attendance", label: "รายงานเข้าเรียน" },
  { id: "summaries", label: "สรุปการเรียน" },
  { id: "billing", label: "ใบแจ้งหนี้ & รับเงิน" },
  { id: "transport", label: "รถรับส่ง" },
  { id: "reports", label: "Reports" },
  { id: "settings", label: "ตั้งค่า" },
  { id: "other", label: "อื่นๆ" },
]
export const locationLabel = (id: string) => NOCK_LOCATIONS.find((l) => l.id === id)?.label ?? id

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
  /** where in the system it lives (NOCK_LOCATIONS) */
  locations: string[]
}

/** The built-in handbook — how this system works today. People's answers (answered questions) add to it. */
export const NOCK_GUIDE: GuideEntry[] = [
  { id: "subject_add", locations: ["settings"], title: "เพิ่มวิชาใหม่", keywords: ["เพิ่มวิชา", "วิชาใหม่", "subject", "รายวิชา", "เพิ่มรายวิชา"], perm: "settings.manage",
    steps: "วิชาเป็นรายการกลางของทุกสาขา: Settings › ระบบ › วิชา → พิมพ์ชื่อวิชาใหม่ เลือกสี แล้วกด เพิ่ม · จากนั้นแต่ละสาขาเลือกวิชาที่เปิดสอนที่ Settings › สาขา › วิชา", href: "/settings?view=system&sys=subjects", hrefLabel: "Settings › วิชา" },
  { id: "student_add", locations: ["students", "families"], title: "เพิ่มนักเรียน", keywords: ["เพิ่มนักเรียน", "นักเรียนใหม่", "สร้างนักเรียน", "เพิ่มลูก"], perm: "student.manage",
    steps: "หน้านักเรียน › ปุ่ม เพิ่มนักเรียน → กรอกชื่อ ชื่อเล่น ชั้น แล้วผูกครอบครัว · หรือเปิด Panel ครอบครัว › เพิ่มลูก (ผูกครอบครัวให้อัตโนมัติ)", href: "/students", hrefLabel: "หน้านักเรียน" },
  { id: "class_add", locations: ["classes", "calendar"], title: "สร้างคลาส", keywords: ["สร้างคลาส", "เปิดคลาส", "คลาสใหม่", "เพิ่มคลาส"], perm: "class.manage",
    steps: "หน้าคลาส › สร้างคลาส หรือกดช่องว่างในปฏิทิน → เลือกแบบคลาส (ครู + ช่วงเวลา / วิชา + ระดับชั้น) วัน เวลา ครู ห้อง · ระบบเช็คครู/ห้องชนและวันหยุดให้", href: "/classes", hrefLabel: "หน้าคลาส" },
  { id: "course_add", locations: ["courses"], title: "สร้างคอร์ส", keywords: ["สร้างคอร์ส", "คอร์สใหม่", "เพิ่มคอร์ส", "ตั้งราคา", "max student"], perm: "course.manage",
    steps: "หน้าคอร์ส › สร้างคอร์ส → Single/Bundle, วิชา, ระดับชั้น, แพ็กเกจ (ชม. / สัปดาห์ / รายเดือน) ราคาดึงจากตารางราคาของสาขา · Max Student = จำนวนนักเรียนสูงสุดของทั้งคอร์ส", href: "/courses", hrefLabel: "หน้าคอร์ส" },
  { id: "invoice_create", locations: ["billing"], title: "ออกใบแจ้งหนี้", keywords: ["ใบแจ้งหนี้", "invoice", "ออกบิล", "เก็บเงิน", "สร้างใบ"], perm: "billing.manage",
    steps: "ใบแจ้งหนี้ & รับเงิน › สร้างใบแจ้งหนี้ → เลือกนักเรียน + คอร์ส (+ ค่ารถ/ค่าแรกเข้า) → บันทึก (ออกเลขทันที) → สร้าง PDF → ให้อีกคนอนุมัติ → ส่งผู้ปกครองทาง LINE → บันทึกรับเงิน → อีกคนยืนยันยอด → ออกใบเสร็จ + เข้าคลาสอัตโนมัติ", href: "/billing", hrefLabel: "ใบแจ้งหนี้" },
  { id: "invoice_approve", locations: ["billing"], title: "อนุมัติใบแจ้งหนี้ / ยืนยันยอดเงิน", keywords: ["อนุมัติใบ", "approve invoice", "ยืนยันยอด", "ยืนยันเงิน", "force approve"], perm: "billing.approve",
    steps: "คนอนุมัติต้องไม่ใช่คนสร้าง (maker–checker) · เปิดใบใน Billing › อนุมัติ PDF · ยืนยันยอดที่รายการรับเงิน · ถ้าทำเองจำเป็นจริงใช้ Force Approve ใส่เหตุผล (แจ้งทั้งสาขา + Director)", href: "/billing", hrefLabel: "ใบแจ้งหนี้" },
  { id: "attendance", locations: ["sessions", "attendance"], title: "เช็คชื่อ", keywords: ["เช็คชื่อ", "attendance", "มาเรียน", "ขาดเรียน"], perm: "attendance.mark",
    steps: "คาบเรียน & เช็คชื่อ › กดคาบ → กด มา / ลา ของนักเรียนแต่ละคน (บันทึกทันที) · คาบในอนาคตบันทึกได้แค่ลา", href: "/sessions", hrefLabel: "คาบเรียน & เช็คชื่อ" },
  { id: "summary_write", locations: ["summaries"], title: "เขียนสรุปการเรียน", keywords: ["สรุปการเรียน", "เขียนสรุป", "summary", "session summary"], perm: "summary.write",
    steps: "สรุปการเรียน › กดแถวคาบ → เขียนสรุปของนักเรียน → ส่งไป Approve · คนอนุมัติต้องไม่ใช่คนเขียน แล้วจึงส่งผู้ปกครอง", href: "/summaries", hrefLabel: "สรุปการเรียน" },
  { id: "summary_approve", locations: ["summaries"], title: "อนุมัติสรุปการเรียน", keywords: ["อนุมัติสรุป", "approve summary", "ส่งสรุป"], perm: "summary.approve",
    steps: "สรุปการเรียน › การ์ด รอส่งไป Approve → อนุมัติ (หรือเปิดแถวเพื่อขอแก้) → ส่งผู้ปกครอง", href: "/summaries", hrefLabel: "สรุปการเรียน" },
  { id: "long_leave", locations: ["students"], title: "ลาพักยาว (ไม่หักโควตา)", keywords: ["ลาพักยาว", "ลายาว", "ลาหลายวัน", "พักเรียน", "ไม่หักโควตา"], perm: "attendance.leave_override",
    steps: "เปิด Panel นักเรียน › ปุ่ม ⋯ ซ้ายล่าง › ลาพักยาว → เลือกคาบ หรือช่วงวันที่ + หมายเหตุ · สถานะเป็น Inactive ช่วงนั้น และวันจบคอร์สเลื่อนให้อัตโนมัติ", href: "/students", hrefLabel: "หน้านักเรียน" },
  { id: "student_exit", locations: ["students"], title: "นักเรียนแจ้งออก", keywords: ["แจ้งออก", "ลาออก", "เลิกเรียน", "ไม่เรียนต่อ"], perm: "student.manage",
    steps: "Panel นักเรียน › ⋯ › แจ้งออก → เลือกวันเรียนวันสุดท้าย เหตุผล และเงินที่เหลือ (คืนเงิน / เก็บเป็นเครดิต = ออกใบลดหนี้)", href: "/students", hrefLabel: "หน้านักเรียน" },
  { id: "holiday", locations: ["settings", "calendar"], title: "ตั้งวันหยุด", keywords: ["วันหยุด", "holiday", "ปิดสาขา", "หยุดเรียน"], perm: "holiday.manage",
    steps: "วันหยุดบริษัท: Settings › ระบบ › วันหยุด · วันหยุดของสาขา: Settings › สาขา › เวลาเปิด-ปิด & วันหยุด (เลือกเปิดทำการในวันหยุดบริษัทได้)", href: "/settings", hrefLabel: "Settings" },
  { id: "special_period", locations: ["settings", "calendar"], title: "ช่วงเวลาพิเศษ (เช่น Summer)", keywords: ["ช่วงเวลาพิเศษ", "summer", "ซัมเมอร์", "ปิดเทอม", "special period"], perm: "settings.manage",
    steps: "Settings › สาขา › เวลาเปิด-ปิด › ช่วงเวลาพิเศษ › เพิ่มช่วง → เวลาเปิดของช่วงนั้น คลาสปกติเรียนต่อ/หยุด และ Memo ใบแจ้งหนี้ของช่วง", href: "/settings", hrefLabel: "Settings" },
  { id: "invoice_memo", locations: ["settings", "billing"], title: "แก้ Memo ใบแจ้งหนี้", keywords: ["memo", "เมโม", "หมายเหตุใบแจ้งหนี้"], perm: "settings.manage",
    steps: "Memo ของแบรนด์: Settings › ระบบ › การเงิน · Memo เฉพาะช่วงเวลาพิเศษ: ตั้งในช่วงนั้น (ใช้กับคอร์สของช่วง)", href: "/settings?view=system&sys=billing", hrefLabel: "Settings › การเงิน" },
  { id: "staff_add", locations: ["staff"], title: "เพิ่มบุคลากร / ครู", keywords: ["เพิ่มครู", "ครูใหม่", "เพิ่มพนักงาน", "บุคลากร", "เพิ่มแอดมิน", "ให้สิทธิ์"], perm: "staff.manage",
    steps: "หน้าบุคลากร › เพิ่มบุคลากร → ชื่อ บทบาทต่อสาขา (Manager / Admin / Teacher) วิชาที่สอน และเปิดบัญชีล็อกอินถ้าต้องการ", href: "/staff", hrefLabel: "หน้าบุคลากร" },
  { id: "lead", locations: ["crm"], title: "จัดการ Lead (CRM)", keywords: ["lead", "ลีด", "crm", "ลูกค้าใหม่", "ทดลองเรียน", "สอบวัดระดับ"], perm: "lead.manage",
    steps: "CRM › เพิ่ม Lead หรือรับจากแชท LINE → บันทึกการติดตาม → ส่งฟอร์มสอบ/ทดลองเรียน → ส่งใบสมัครเรียน · Lead ที่สมัครแล้วกลายเป็นนักเรียน", href: "/crm", hrefLabel: "CRM" },
  { id: "line_link", locations: ["families", "inbox"], title: "ผูก LINE ผู้ปกครอง", keywords: ["ผูกไลน์", "ผูก line", "line ผู้ปกครอง", "เชื่อม line", "โค้ด line"], perm: "family.manage",
    steps: "Panel ครอบครัว › สร้างโค้ดผูก LINE → ให้ผู้ปกครองส่งโค้ดเข้า LINE OA ของสาขา · สาขาต้องเชื่อม LINE OA ก่อน (Settings › สาขา › LINE Integration)", href: "/families", hrefLabel: "หน้าครอบครัว" },
  { id: "reports", locations: ["reports"], title: "ดูรายงาน", keywords: ["รายงาน", "report", "รายได้", "สถิติ"], perm: "reports.view",
    steps: "หน้า Reports → เลือกหัวข้อ (ภาพรวม รายได้ นักเรียน การเข้าเรียน Operations CRM ความพึงพอใจ) และช่วงเวลา", href: "/reports", hrefLabel: "Reports" },
  { id: "form_builder", locations: ["settings"], title: "สร้างฟอร์มเอง / ปรับฟอร์มของระบบ", keywords: ["สร้างฟอร์ม", "ฟอร์ม", "แบบสอบถาม", "form builder", "เพิ่มคำถาม", "ส่งฟอร์ม", "คำตอบฟอร์ม", "ลงทะเบียน", "หลายขั้น", "เพิ่มนักเรียน", "ผูกข้อมูล", "เงื่อนไข"], perm: "settings.manage",
    steps: "Settings › ระบบ › ฟอร์ม → + สร้างฟอร์ม → ตั้งชื่อ แล้วกด + เพิ่มคำถาม (ข้อความ ตัวเลข วันที่ เบอร์ อีเมล เลือก 1 / หลายข้อ / Dropdown ใช่-ไม่ใช่ คะแนน 0–10 / 1–5 แนบไฟล์ / รูป ยอมรับเงื่อนไข หัวข้อ) · ขวามือคือหน้าที่ผู้ปกครองเห็น ลองกรอกได้ → บันทึก · ส่ง: หน้าครอบครัว › ฟอร์ม › ส่งฟอร์ม (ส่งทาง LINE หรือคัดลอกลิงก์) · ดูคำตอบ: แท็บ คำตอบ ของฟอร์ม (สรุปทุกข้อ + ดาวน์โหลด .csv) และในหน้าครอบครัว · ฟอร์มของระบบ (Test / Trial / สมัครเรียน / แจ้งหยุด / ความพึงพอใจ): ช่องที่มีกุญแจระบบต้องใช้ แก้ไม่ได้ ช่องเสริมปิดได้ เพิ่มคำถามได้ · ทำฟอร์มแบบหลายขั้นได้: “ขึ้นขั้นใหม่” แบ่งหน้า · หัวข้อตั้ง “เพิ่มได้หลายชุด” (เช่น + เพิ่มนักเรียน) · ผูกกับข้อมูลในระบบ (ข้อมูลเดิมขึ้นให้ ตอบแล้วอัปเดตครอบครัว/นักเรียน) · ตัวเลือกมาจากระบบ (วิชา / ระดับชั้นของสาขา / Admin เลือกตอนส่ง) · แสดงเมื่อ (ถามต่อตามคำตอบ) · ขั้นตรวจสอบก่อนส่ง", href: "/settings?view=system&sys=forms", hrefLabel: "Settings › ฟอร์ม" },
  { id: "catalog", locations: ["inbox", "settings"], title: "ส่ง Catalog คอร์สให้ผู้ปกครอง", keywords: ["catalog", "แคตตาล็อก", "คอร์สทั้งหมด", "ตารางเรียน", "ราคาคอร์ส", "rich menu", "สนใจคลาส"], perm: "lead.manage",
    steps: "Inbox › แชท › + › Catalog คอร์ส → ส่งลิงก์ (ลิงก์เดียวต่อสาขา อัปเดตทุกครั้งที่ส่ง) · ผู้ปกครองเลือกระดับชั้น / วิชา เห็นคอร์ส ราคาเริ่มต้น และวัน-เวลาของคลาส (ที่ว่าง) → กด สนใจ / ทดลองเรียน (ขึ้นเป็นการ์ดในแชท: ส่งฟอร์ม Trial ที่เลือกวิชาไว้ให้ หรือส่งใบสมัครของคลาสนั้น) หรือ สมัครเรียน (เปิดใบสมัครของคลาสนั้นทันที) · วางบน Rich Menu: Settings › สาขา › LINE › LINE Rich Menu → สร้างลิงก์ / อัปเดต / ดูตัวอย่าง", href: "/inbox", hrefLabel: "Inbox" },
  { id: "inbox_calendar", locations: ["inbox"], title: "ดูเวลาว่าง / ตารางสาขา ข้างแชท", keywords: ["เวลาว่าง", "ว่างวันไหน", "หาเวลา", "ตารางสัปดาห์", "ปฏิทินในแชท", "เสนอเวลา"], perm: "lead.manage",
    steps: "Inbox › เปิดแชท › ปุ่มปฏิทิน (มุมขวาบน) → แท็บ หาเวลาว่าง: เลือกวิชา + ช่วงวันที่ → เห็นชั่วโมงที่ครู + ห้องว่าง และคลาสจริงที่ยังมีที่ → กดเลือกหลายช่วง → ใส่ในข้อความ (ขึ้นในช่องพิมพ์ ตรวจแล้วกดส่งเอง) · แท็บ ตารางสัปดาห์: คาบทั้งสาขารายวัน (เวลา วิชา ครู จำนวน/ที่นั่ง) เลื่อนสัปดาห์ได้ · ช่องพิมพ์: Shift+Enter = ขึ้นบรรทัดใหม่", href: "/inbox", hrefLabel: "Inbox" },
  { id: "ai_settings", locations: ["settings"], title: "ตั้งค่า AI ของ Nock", keywords: ["api key", "ตั้งค่า ai", "gemini", "openai", "chatgpt", "เชื่อม ai"], perm: "settings.manage",
    steps: "Settings › ระบบ › AI (Nock) → เลือก Google Gemini หรือ OpenAI → วาง API key → บันทึก → ทดสอบการเชื่อมต่อ · key เก็บฝั่ง server ไม่แสดงซ้ำ", href: "/settings?view=system&sys=ai", hrefLabel: "Settings › AI" },
  { id: "calendar_note", locations: ["calendar"], title: "เขียน Note ในปฏิทิน", keywords: ["note", "โน้ต", "จดโน้ต", "note ถาวร", "note ชั่วคราว", "ลบโน้ต", "แก้โน้ต"], perm: "calendar.view",
    steps: "ปฏิทิน › ชี้ที่ชื่อนักเรียนในคาบ › + Note → พิมพ์ แล้วเลือก ชั่วคราว (เฉพาะคาบนี้) หรือ ถาวร (ปักหมุด แสดงทุกคาบของคลาสนี้) → Enter · แก้ไข/ลบ: ชี้ที่ Note › ⋯ · Note ปฏิทินแยกจาก Note ของนักเรียน · เขียนได้เฉพาะคาบที่สอน (Admin ขึ้นไปได้ทุกคาบ)", href: "/calendar", hrefLabel: "ปฏิทิน" },
  // owner 2026-10-19: Transport
  { id: "transport_day", locations: ["transport"], title: "จัดเที่ยวรถ / อนุมัติ & ส่งให้คนขับ", keywords: ["รถรับส่ง", "รอบรถ", "คนขับ", "ใบงานคนขับ", "bus route", "route", "จัดรถ", "รถเต็ม"], perm: "session.manage",
    steps: "เมนู รถรับส่ง › ตารางสัปดาห์: ทั้งสัปดาห์เป็นตาราง แบ่งตามวัน กดแถวเพื่อดูจุดรับส่ง (เวลาประมาณ / จริงจากแอปคนขับ) · ระบบจัดเด็กเข้าเที่ยวเองจากใบแจ้งหนี้ + รอบที่ขอเพิ่ม/ยกเลิก + ผู้ปกครองที่นั่งไปด้วย ตามเวลาเรียน · กล่อง \"ต้องตัดสินใจ\" = เด็กที่ไม่มีเที่ยวตรงเวลา / คำขอที่ยังไม่อนุมัติ · \"แก้ไข\" ในแถว = ลากเรียงจุด / เอาเด็กออก · \"เพิ่มผู้โดยสาร\" · ⋯ = เปลี่ยนรถ / คนขับเฉพาะวันนี้, เปลี่ยนเวลา, ยกเลิกเที่ยว (กู้คืนได้), คัดลอกลิงก์แอปคนขับ · \"เพิ่มเที่ยว\" ที่หัววัน = เที่ยวพิเศษวันเดียว · \"อนุมัติ & ส่ง\" ทีละเที่ยว หรือ \"อนุมัติทั้งหมด & ส่ง\" ทั้งสัปดาห์ · ตัวกรอง โซน / ประเภท (P รับ · D ส่ง · Both รับ-ส่ง) / รถ / สาขา · มุมมองปฏิทิน · แท็บรายงาน = ที่นั่งใช้ เวลาเฉลี่ย ตรงเวลา ตามรถและคนขับ · เวลา: ประมาณ (Estimate) / Check in = รถถึงบ้าน / Check out = รับ-ส่งเด็กแล้ว (จากแอปคนขับ) · คลิกเวลาเพื่อตั้งเอง: เวลาออกรถ หรือเวลาของเด็กแต่ละคน (จุดถัดไปคำนวณต่อ) และใส่เวลาจริงแทนคนขับได้ · ลบเวลาออก = กลับไปคำนวณเอง", href: "/transport", hrefLabel: "รถรับส่ง" },
  { id: "transport_zones", locations: ["transport"], title: "แบ่งโซนรถรับส่ง (รถหลายคัน)", keywords: ["โซน", "zone", "แบ่งโซน", "สายเหนือ", "สายใต้", "รถหลายคัน", "แบ่งรถ"], perm: "session.manage",
    steps: "รถรับส่ง › โซน: กด \"แบ่งโซนอัตโนมัติ\" ระบบแบ่งบ้านที่นั่งรถตามทิศจากสาขา หนึ่งโซนต่อรถหนึ่งคัน (ตัดตรงช่องว่างกว้างสุดระหว่างกลุ่มบ้าน) แล้วตั้งชื่อเช่น สายเหนือ / สายใต้ · เปลี่ยนชื่อโซนและรถที่วิ่งได้ · บ้านที่อยู่ตรงเส้นแบ่ง เลือกโซนเองได้ที่ชื่อบ้าน · เมื่อรถหลายคันออกเวลาเดียวกัน เด็กขึ้นรถของโซนบ้านตัวเอง · \"ไม่ใช้โซน\" = ระบบแบ่งตามทิศเองทุกวัน", href: "/transport?view=zones", hrefLabel: "รถรับส่ง › โซน" },
  { id: "transport_setup", locations: ["transport", "settings"], title: "เพิ่มรถ / คนขับ / รอบรถ", keywords: ["เพิ่มรถ", "รถตู้", "คนขับ", "เพิ่มรอบรถ", "ทะเบียนรถ", "ที่นั่งรถ", "outsource", "แอปคนขับ", "ลิงก์คนขับ"], perm: "settings.manage",
    steps: "รถรับส่ง › รถ & คนขับ: เพิ่มรถ (ชื่อ ทะเบียน ที่นั่ง คนขับประจำ) · การ์ดคนขับ = เพิ่มคนขับของโรงเรียนหรือ Outsource แต่ละคนมีลิงก์แอปคนขับ (ส่งทาง LINE ไม่ต้องล็อกอิน: เริ่มวิ่ง → รับแล้ว / ส่งแล้ว / ไม่มา → จบเที่ยว) · รอบรถ: รับ / ส่ง / รับ-ส่ง (ส่งเด็กที่เลิกแล้วรับเด็กรอบถัดไปในเที่ยวเดียว) เวลา วัน รถ ที่นั่ง · หมุดสาขากับระยะของค่ารถอยู่ที่ Settings › สาขา › ค่าธรรมเนียม", href: "/transport?view=vehicles", hrefLabel: "รถ & คนขับ" },
  { id: "ai_helper_toggle", locations: ["settings"], title: "เปิด/ปิด AI Helper (Nock)", keywords: ["ปิด nock", "เปิด nock", "ปิด ai", "ai helper", "ซ่อน nock"], perm: "settings.manage",
    steps: "ทั้งระบบ: Settings › ระบบ › AI (Nock) › สวิตช์ AI Helper · รายสาขา: Settings › เลือกสาขา › ข้อมูลสาขา › การ์ด AI Helper (Nock) — Nock แสดงเมื่อเปิดทั้งสองที่", href: "/settings?view=system&sys=ai", hrefLabel: "Settings › AI (Nock)" },
  { id: "teacher_workload", locations: ["staff"], title: "ดู Workload ครู", keywords: ["workload", "ภาระงาน", "ครูสอนเยอะ", "ครูสอนหนัก", "load"],
    steps: "เฉพาะ Director: หน้าบุคลากร › คอลัมน์ Class / Month (คลาสที่สอนเดือนนี้) และ Student / Month (นักเรียนไม่นับซ้ำ) · กดหัวคอลัมน์เพื่อเรียงจากมากไปน้อย · ยังไม่มีเกณฑ์ว่าเยอะหรือน้อย — ดูทั้งสองตัวคู่กัน", href: "/staff", hrefLabel: "บุคลากร" },
  { id: "switch_branch", locations: ["other"], title: "เปลี่ยนสาขาที่ทำงาน", keywords: ["เปลี่ยนสาขา", "สลับสาขา", "ดูสาขาอื่น"],
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

/** this person may be told an answer unless it's limited to other roles */
export function visibleAnswer(a: Pick<NockAnswer, "audience">, roles: Role[]): boolean {
  return !a.audience?.length || a.audience.some((r) => roles.includes(r))
}

/** thumbs score of an answer — up minus down */
export const answerScore = (a: Pick<NockAnswer, "votesUp" | "votesDown">) => (a.votesUp?.length ?? 0) - (a.votesDown?.length ?? 0)

/** the answer Nock uses: the best-voted one this person may be told (a tie goes to the earlier answer) */
export function bestAnswer(q: Pick<NockQuestion, "answers">, roles?: Role[]): NockAnswer | undefined {
  return (q.answers ?? []).filter((a) => !roles || visibleAnswer(a, roles))
    .slice().sort((a, b) => answerScore(b) - answerScore(a) || a.at.localeCompare(b.at))[0]
}

/** the knowledge bank = every question with at least one answer */
export const knowledgeOf = (all: NockQuestion[]) => all.filter((q) => (q.answers?.length ?? 0) > 0)

/** a person may see this knowledge if at least one of its answers is for them */
export const visibleKnowledge = (q: Pick<NockQuestion, "answers">, roles: Role[]) => !!bestAnswer(q, roles)

/** one vote per person on an answer: up (true) / down (false) / none (null) */
export function applyVote<T extends Pick<NockAnswer, "votesUp" | "votesDown">>(a: T, who: string, vote: boolean | null): T {
  const up = (a.votesUp ?? []).filter((x) => x !== who)
  const down = (a.votesDown ?? []).filter((x) => x !== who)
  return { ...a, votesUp: vote === true ? [...up, who] : up, votesDown: vote === false ? [...down, who] : down }
}

/** share of thumbs up (null = no votes yet) */
export function helpfulRate(a: Pick<NockAnswer, "votesUp" | "votesDown">): number | null {
  const up = a.votesUp?.length ?? 0
  const down = a.votesDown?.length ?? 0
  return up + down ? up / (up + down) : null
}

export function matchGuide(q: string, limit = 3, locations: string[] = []): { entry: GuideEntry; score: number }[] {
  const t = norm(q)
  return NOCK_GUIDE.map((entry) => ({ entry, score: entry.keywords.filter((k) => t.includes(norm(k))).length + (similarity(q, entry.title) > 0.5 ? 1 : 0) + (entry.locations.some((l) => locations.includes(l)) ? 0.5 : 0) }))
    .filter((x) => x.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

/** the team's answers that fit this question — same part of the system counts a little, thumbs a little */
/** "ค้นหาคำตอบใกล้เคียงจากคลังความรู้" (owner 2026-10-14) — a looser match than the one Nock answers from, so the asker
 *  can read related knowledge themselves; never the question itself */
export function similarKnowledge(q: Pick<NockQuestion, "id" | "question">, all: NockQuestion[], roles: Role[], limit = 3) {
  return knowledgeOf(all).filter((item) => item.id !== q.id).flatMap((item) => {
    const answer = bestAnswer(item, roles)
    if (!answer) return []
    return [{ item, answer, score: Math.max(similarity(q.question, item.question), similarity(q.question, answer.text) * 0.6) }]
  }).filter((x) => x.score >= 0.08).sort((a, b) => b.score - a.score).slice(0, limit)
}

export function matchKnowledge(q: string, all: NockQuestion[], roles: Role[], locations: string[] = [], limit = 4): { item: NockQuestion; answer: NockAnswer; score: number }[] {
  return knowledgeOf(all).flatMap((item) => {
    const answer = bestAnswer(item, roles)
    if (!answer) return []
    const text = Math.max(similarity(q, item.question), similarity(q, answer.text) * 0.6)
    const place = (item.locations ?? []).some((l) => locations.includes(l)) ? 0.08 : 0
    const rate = helpfulRate(answer)
    return [{ item, answer, score: text + (text >= 0.2 ? place + (rate === null ? 0 : (rate - 0.5) * 0.1) : 0) }]
  })
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
export function localAnswer(q: string, all: NockQuestion[], roles: Role[], locations: string[] = []):
  { text: string; source: "knowledge" | "guide"; links: { label: string; href: string }[]; knowledgeId?: string; answerId?: string } | null {
  const k = matchKnowledge(q, all, roles, locations, 1)[0]
  if (k && k.score >= KNOWLEDGE_SURE) return { text: k.answer.text, source: "knowledge", links: [], knowledgeId: k.item.id, answerId: k.answer.id }
  const g = matchGuide(q, 1, locations)[0]
  if (g) return { text: guideAnswer(g.entry, roles), source: "guide", links: [{ label: g.entry.hrefLabel, href: g.entry.href }] }
  return null
}

/** what the AI model is told — the asker, their permissions, the handbook and the matching knowledge */
export function nockSystemPrompt(input: { name: string; roles: Role[]; branch: string; locations: string[]; knowledge: NockQuestion[]; question: string }): string {
  const allowed = (Object.values(ROLE_PERMISSIONS).flat() as Permission[]).filter((p, i, a) => a.indexOf(p) === i)
  const can = allowed.filter((p) => hasPerm(input.roles, p))
  const cannot = allowed.filter((p) => !hasPerm(input.roles, p))
  const guide = matchGuide(input.question, 4, input.locations).map((x) => x.entry)
  const guideText = (guide.length ? guide : NOCK_GUIDE).map((g) => `- [${g.id}] ${g.title} (ต้องมีสิทธิ์: ${g.perm ? `${g.perm} = ${roleNames(rolesWith(g.perm))}` : "ทุกคน"}) → ${g.steps} · ลิงก์ ${g.href}`).join("\n")
  const kb = matchKnowledge(input.question, input.knowledge, input.roles, input.locations).map((x) => `- [${(x.item.locations ?? []).map(locationLabel).join(", ")}] ถาม: ${x.item.question}\n  ตอบ (ทีมเขียน): ${x.answer.text}`).join("\n")
  return [
    "คุณคือ Nock ผู้ช่วยในระบบ NockERP ของโรงเรียนกวดวิชา NockAcademy / Liclass ตอบเป็นภาษาไทย สั้น ชัด เป็นขั้นตอน",
    `ผู้ถาม: ${input.name} · บทบาท: ${roleNames(input.roles)} · สาขา: ${input.branch} · ถามเรื่องส่วน: ${input.locations.map(locationLabel).join(", ") || "ไม่ระบุ"}`,
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

export const NOCK_STATUS_LABEL: Record<NockQuestion["status"], string> = { ai: "Nock ตอบแล้ว", unanswered: "ยังไม่มีคำตอบ", answered: "คลังความรู้ (ทีมตอบแล้ว)" }
