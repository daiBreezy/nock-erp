// Checklist (owner 2026-11-24): what is done, what is still open, what should be done next — in ONE file the /checklist page reads.
// Claude updates this at the end of every piece of work (see erp-v2/CLAUDE.md). Keep each line short enough for the owner to understand alone.

/** open = started / known gap · decide = waiting for an answer · todo = should be done (not started) · done */
export type CheckStatus = "open" | "decide" | "todo" | "done"

export interface CheckItem {
  id: string
  /** which part of the ERP (a CHECK_AREAS entry) */
  area: string
  title: string
  status: CheckStatus
  /** who it waits for — "คุณ" · "Shibasan" · "ผม (Claude)" · "Dev" */
  waiting?: string
  /** where / how to check it (shown behind an ⓘ) */
  how?: string
  /** the page to open */
  href?: string
  /** YYYY-MM-DD — when it was added (open) or finished (done) */
  date: string
  /** done items are grouped under a round, e.g. "Feedback Shibasan" */
  round?: string
}

export const CHECK_AREAS = ["Exam Result", "Invoice / Receipt", "Liclass", "นักเรียน & ฟอร์ม", "Reports", "LINE & แอปผู้ปกครอง", "สัปดาห์นี้ (Weekly)", "ระบบ & ทั่วไป"] as const

export const CHECKLIST: CheckItem[] = [
  // ───────────────────────── ยังไม่เสร็จ
  { id: "exam-months", area: "Exam Result", title: "ยืนยันช่วงเดือนของแต่ละครั้งสอบ (ผมตั้งเอง: กลาง 1 ก.ค.–ส.ค. · ปลาย 1 ก.ย.–ต.ค. · กลาง 2 ธ.ค.–ม.ค. · ปลาย 2 ก.พ.–มี.ค.)", status: "decide", waiting: "คุณ / Shibasan", how: "เปิดหน้า ผลสอบโรงเรียน — บรรทัดเล็กใต้ชื่อหน้าคือช่วงเดือน · แก้ที่ termRange ใน domain/rules/exams.ts", href: "/exams", date: "2026-11-23" },
  { id: "exam-prev4", area: "Exam Result", title: "ตัวกรองวิชา: \"4 ครั้งก่อนหน้า\" ผมทำเป็น 4 ครั้งก่อน + ครั้งที่เลือก (5 คอลัมน์) — ตรงที่ต้องการไหม", status: "decide", waiting: "คุณ", how: "ผลสอบโรงเรียน → ตัวกรอง › วิชา → เลือกวิชาหนึ่ง", href: "/exams", date: "2026-11-23" },
  { id: "exam-spacing", area: "Exam Result", title: "ระยะห่างตัวเลขในช่องวิชา — เลือก ก) ชิดแน่น (ลูกศรไม่ตรงกันแนวตั้ง) หรือ ข) คงแบบตอนนี้ (ตรงกัน แต่เลขสั้นมีช่องว่าง)", status: "decide", waiting: "คุณ", href: "/exams", date: "2026-11-23" },
  { id: "exam-metric", area: "Reports", title: "Metric \"พัฒนาการผลสอบโรงเรียน\" (เทียบครั้งล่าสุดกับครั้งก่อน) ผมเดาวิธีวัดเอง — ให้ Shibasan ดูว่าตรงไหม", status: "decide", waiting: "Shibasan", how: "Reports › นักเรียน → การ์ดแรกใต้ตัวเลขสรุป", href: "/reports?tab=students", date: "2026-11-23" },
  { id: "rep-teacher", area: "Reports", title: "Teacher Performance — ยังไม่มั่นใจว่า Metric และ Logic การแสดงผลโอเคไหม", status: "decide", waiting: "Shibasan", how: "Reports → แท็บที่มี Teacher Performance", href: "/reports", date: "2026-11-23" },
  { id: "inv-e2e", area: "Invoice / Receipt", title: "ยังไม่ได้ทดสอบใช้จริงเต็มวง: ดูตัวอย่าง → สร้างใบ → รับเงิน → ออกใบเสร็จรวมบรรทัด → ดู PDF", status: "open", waiting: "คุณ", how: "Billing → เพิ่ม/สร้างใบแจ้งหนี้ → ดูตัวอย่าง", href: "/billing", date: "2026-11-23" },
  { id: "feat-tree", area: "ระบบ & ทั่วไป", title: "ทรีฟีเจอร์ 28 List: ชื่อฟีเจอร์ตรวจกับโค้ดแล้ว (สคริปต์ไล่หาทุกชื่อ — ตรงทั้งหมด ยกเว้น 2 ชื่อที่แก้แล้ว) แต่คำอธิบายยาวๆ ยังไม่ได้อ่านเทียบทีละบรรทัด — คุณอ่านเจอข้อไม่ตรง/ขาด บอกผมได้ ผมแก้", status: "todo", waiting: "คุณ (อ่านเจออะไรบอกผม)", how: "Checklist → ฟีเจอร์ทั้งหมด → List ที่มีป้าย ตรวจกับโค้ดแล้ว", href: "/checklist?view=features", date: "2026-11-24" },
  { id: "line-msgs", area: "LINE & แอปผู้ปกครอง", title: "ข้อความถึงผู้ปกครองทาง LINE (Welcome · Course Summary · Invoice · Noti ฯลฯ) — รอคุยก่อนว่าจะเอายังไง", status: "decide", waiting: "คุณ / Shibasan", date: "2026-11-23" },
  { id: "parent-catalog", area: "LINE & แอปผู้ปกครอง", title: "Course Catalog สำหรับผู้ปกครอง — ต้องคุยก่อนทำ", status: "decide", waiting: "คุณ", date: "2026-11-23" },
  { id: "parent-richmenu", area: "LINE & แอปผู้ปกครอง", title: "LINE Rich Menu สำหรับผู้ปกครอง — ต้องคุยก่อนทำ", status: "decide", waiting: "คุณ", date: "2026-11-23" },
  { id: "rep-mock", area: "Reports", title: "Teacher Performance (Reports › Operations) แสดงข้อมูลปลอม (mock) — ตัวเลขสร้างจากรหัสครู ไม่ใช่ข้อมูลจริง · ต้องรอ Dev ต่อข้อมูลจริงก่อนให้ Shibasan ตัดสินจาก Metric", status: "open", waiting: "Dev / Shibasan", how: "Reports → แท็บ Operations → Teacher Performance", href: "/reports?tab=operations", date: "2026-11-24" },
  { id: "wk-present", area: "สัปดาห์นี้ (Weekly)", title: "Present Phase 3 ให้ทุกทีม (วิธีใช้ + ทำไม LINE Link Code สำคัญ) — รอยืนยัน", status: "decide", waiting: "คุณ", date: "2026-11-23" },
  { id: "wk-feedback", area: "สัปดาห์นี้ (Weekly)", title: "เก็บ Feedback การใช้งานจริงจากสาขา (เริ่มใช้จริงประมาณ 1 ธ.ค.)", status: "todo", waiting: "คุณ", date: "2026-11-23" },

  // ───────────────────────── เสร็จแล้ว
  { id: "d-rc-add", area: "Invoice / Receipt", title: "เพิ่มใบอื่นเข้าใบเสร็จที่ออกไปแล้ว — Admin เลือกกี่เดือนก็ได้ (ปุ่ม เพิ่มใบอื่นเข้าใบเสร็จ ในขั้นตอนใบเสร็จ)", status: "done", date: "2026-11-24", round: "Feedback Shibasan", href: "/billing" },
  { id: "d-refund-weeks", area: "Invoice / Receipt", title: "Refund: Hourly ใช้ ÷ คาบ · Monthly/Weekly ใช้สัปดาห์ที่เหลือ (3+ = 100% · 2 = 60% · 1 = 30%) นับจากวันหยุดเรียน", status: "done", date: "2026-11-24", round: "Feedback Shibasan", href: "/billing" },
  { id: "d-enroll-target", area: "นักเรียน & ฟอร์ม", title: "ฟอร์ม enroll ซ้ำของเด็กเดิม → โรงเรียนเป้าหมายอัปเดตตามที่กรอกใหม่ · อธิบายไว้ในหน้า ฟอร์มผู้ปกครอง", status: "done", date: "2026-11-24", round: "Feedback Shibasan", href: "/forms" },
  { id: "d-hear-branch", area: "นักเรียน & ฟอร์ม", title: "ช่อง \"รู้จักเราจากไหน\" รายการของแต่ละสาขา — จัดการและ Preview ได้ในหน้า ฟอร์มผู้ปกครอง (เลือกสาขา + กล่องแก้รายการ)", status: "done", date: "2026-11-24", round: "Feedback Shibasan", href: "/forms" },
  { id: "d-lis-period", area: "Liclass", title: "Special Period: คาบปกติหยุดเมื่อ active · ช่วงที่ active ทับกันไม่ได้", status: "done", date: "2026-11-23", round: "Feedback Shibasan", href: "/settings" },
  { id: "d-lis-summary", area: "Liclass", title: "ซ่อน Summary ทั้งหมดของ Liclass (เมนู · สถานะรอสรุป · ช่องในแผงคาบ)", status: "done", date: "2026-11-23", round: "Feedback Shibasan" },
  { id: "d-lis-leave", area: "Liclass", title: "ลาไม่จำกัด (รายชั่วโมงยืดวันจบ · รายสัปดาห์/เดือนไม่ยืด) + Reschedule ไม่ล็อกสัปดาห์", status: "done", date: "2026-11-23", round: "Feedback Shibasan" },
  { id: "d-inv-preview", area: "Invoice / Receipt", title: "ปุ่ม \"ดูตัวอย่าง\" ใบแจ้งหนี้ (กระดาษเลข DRAFT ไม่ออกเลข)", status: "done", date: "2026-11-23", round: "Feedback Shibasan", href: "/billing" },
  { id: "d-rc-merge", area: "Invoice / Receipt", title: "ใบเสร็จ: รวมบรรทัดตั้งชื่อใหม่ + รวมใบหลายเดือนตอนออกใบเสร็จ", status: "done", date: "2026-11-23", round: "Feedback Shibasan", href: "/billing" },
  { id: "d-roles", area: "ระบบ & ทั่วไป", title: "Manager / Area MGR ทำได้เท่า Admin (มี test กัน) + แจ้งเตือนใบแจ้งหนี้ถึง Area MGR", status: "done", date: "2026-11-23", round: "Feedback Shibasan" },
  { id: "d-exam", area: "Exam Result", title: "เมนู ผลสอบโรงเรียน: ปีการศึกษา × 4 ครั้ง × วิชา (NockAcademy 8 / Liclass 5) · Done/Waiting · กรองวิชา/โรงเรียน · Edit ในตาราง · แผงนักเรียน", status: "done", date: "2026-11-23", round: "Feedback Shibasan", href: "/exams" },
  { id: "d-target", area: "นักเรียน & ฟอร์ม", title: "โรงเรียนเป้าหมาย (สูงสุด 3) ในฟอร์มสมัคร · แผงนักเรียน/ครอบครัว · Lead · คอลัมน์ตารางนักเรียน", status: "done", date: "2026-11-23", round: "Feedback Shibasan", href: "/students" },
  { id: "d-ds", area: "ระบบ & ทั่วไป", title: "ปรับ DS: ดรอปดาวน์ตัวกรองมีช่องค้นหา · Kpi ที่เลือกเป็นเทาเข้ม · ไอคอนหัวตารางอยู่ฝั่งตรงข้ามตัวอักษร (ทุกตาราง)", status: "done", date: "2026-11-23", round: "Feedback Shibasan" },
  { id: "d-checklist", area: "ระบบ & ทั่วไป", title: "หน้า Checklist นี้ (สารบัญตามส่วนของ ERP · ข้อที่ยังไม่เสร็จ · เสร็จแล้วพับไว้) + ป้ายตัวเลขที่เมนู + กติกาให้ Claude อัปเดตท้ายงานทุกครั้ง", status: "done", date: "2026-11-24", round: "Checklist", href: "/checklist" },
  { id: "d-featuretree", area: "ระบบ & ทั่วไป", title: "แท็บ \"ฟีเจอร์ทั้งหมด\": ทรีกางได้ + ป้าย Pending + คำอธิบายการทำงาน · ครบ 31 List (ละเอียด 3 + ร่าง 28)", status: "done", date: "2026-11-24", round: "Checklist", href: "/checklist?view=features" },
  { id: "d-bilingual", area: "ระบบ & ทั่วไป", title: "Checklist และทรีฟีเจอร์เป็นไทย + อังกฤษ (สลับตามปุ่มภาษา · ภาษาญี่ปุ่นแสดงอังกฤษ) พร้อมเทสต์กันลืมแปล", status: "done", date: "2026-11-24", round: "Checklist", href: "/checklist" },
  { id: "d-arch", area: "ระบบ & ทั่วไป", title: "หน้า ERP Architecture — แผนที่ทุกหน้า/ฟีเจอร์ของ ERP", status: "done", date: "2026-11-21", round: "ERP Architecture", href: "/architecture" },
  { id: "d-sp-impact", area: "ระบบ & ทั่วไป", title: "ศูนย์ผลกระทบช่วงพิเศษ: คาบที่หยุด นักเรียนที่กระทบ แยกกลุ่ม ขึ้น Dashboard พร้อมจำนวนบ้านที่ยังไม่ส่งข้อความ", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/settings" },
  { id: "d-sp-credit", area: "ระบบ & ทั่วไป", title: "Credit คาบสำหรับแพ็กเกจรายสัปดาห์/เดือน (สร้างเอง ถอนเองเมื่อคาบกลับมา ยกเลิกคาบชดเชยแล้วกลับมา) + Refund / ลดครั้งถัดไป เป็นใบลดหนี้ + ชดเชยคาบจริง", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/students" },
  { id: "d-sp-bus", area: "ระบบ & ทั่วไป", title: "รถรับส่งตามคาบจริง (คาบยกเลิก/ถูกพัก = ถอดออกจากรอบ) + รอบรถเพิ่มต้องเป็นวันที่มีคาบ + คืนค่ารถที่จ่ายแล้วเป็นใบลดหนี้", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/transport" },
  { id: "d-sp-msg", area: "ระบบ & ทั่วไป", title: "ข้อความถึงผู้ปกครองเรื่องช่วงพิเศษ: 1 ข้อความต่อครอบครัว ชุดข้อความแก้ได้ 2 ที่ ส่งเองทีละบ้าน + แถบช่วงพิเศษในแอปผู้ปกครอง", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/settings" },
  { id: "d-sp-date", area: "ระบบ & ทั่วไป", title: "ช่องเลือกวันที่เห็นช่วงพิเศษ: ห้ามเลือก Trial และวันเริ่มคลาสปกติ เตือน teal ที่อื่น", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/billing" },
  { id: "d-sp-count", area: "ระบบ & ทั่วไป", title: "แถบนับถอยหลังช่วงพิเศษ (เทา/ส้ม/แดง) บน Dashboard และ Calendar + ตัวย่อวัน ว / Nd ทั้งระบบ (ชี้ดูคำเต็ม)", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/" },
  { id: "d-sp-invoice", area: "ระบบ & ทั่วไป", title: "ใบแจ้งหนี้ต่อคอร์สรายเดือน/รายสัปดาห์ที่ตกในช่วงพิเศษ: ไม่คิดเงินสัปดาห์ที่คลาสปกติหยุด (รายเดือน: ทั้งเดือน = ฿0, ซ้อนบางส่วน = คิดตามสัปดาห์ที่เหลือ · รายสัปดาห์: คิดเฉพาะสัปดาห์ที่คลาสเปิด + ข้อความเตือน)", status: "done", date: "2026-11-25", round: "ช่วงพิเศษ (Special Period)", href: "/billing" },
  { id: "d-form-hub", area: "นักเรียน & ฟอร์ม", title: "การ์ด Enroll + ใบแจ้งหนี้ในแผงครอบครัว: ลิงก์เดียวใบเดี่ยว/ชุดครอบครัว · สลิปหลายใบ (Ref ID ไม่ซ้ำ ยอดรวมต้องเท่ายอดค้าง) · void ใบใดใบหนึ่ง = ลิงก์ตาย", status: "done", date: "2026-11-25", round: "ฟอร์มในแผง + Lead/Customer + ผลสอบ", href: "/families" },
  { id: "d-form-send", area: "นักเรียน & ฟอร์ม", title: "กฎส่งฟอร์ม: ลิงก์ที่รอผู้ปกครองมีได้ 1 อัน · ส่งซ้ำ = ยกเลิกลิงก์เก่าให้ · ปุ่ม ยกเลิกลิงก์ · หน้าผู้ปกครองขึ้นว่าถูกยกเลิก", status: "done", date: "2026-11-25", round: "ฟอร์มในแผง + Lead/Customer + ผลสอบ", href: "/crm" },
  { id: "d-lead-customer", area: "นักเรียน & ฟอร์ม", title: "Lead = Customer ที่ยังไม่จ่าย (record เดียว สองสถานะ): หน้ารายการไม่ปนกัน · ยืนยันยอดแรกใน Billing = เป็น Customer · เด็ก/ผู้ปกครองเก็บที่แฟ้มจริง · ประวัติ Lead ในแผง Customer", status: "done", date: "2026-11-25", round: "ฟอร์มในแผง + Lead/Customer + ผลสอบ", href: "/crm" },
  { id: "d-lead-steps", area: "นักเรียน & ฟอร์ม", title: "Step ติดต่อเก็บข้อมูลกลาง (ผู้ปกครอง · เด็ก · วัน/เวลาที่สะดวก · วันเริ่ม → ค่าเริ่มต้นใบแจ้งหนี้) · Step ฟอร์มส่งอย่างเดียว · ปุ่มแก้ไข ถามก่อนว่าแก้ใคร", status: "done", date: "2026-11-25", round: "ฟอร์มในแผง + Lead/Customer + ผลสอบ", href: "/crm" },
  { id: "d-exam-panels", area: "Exam Result", title: "ผลสอบในแผงนักเรียนและแผงครอบครัว (แท็บ ผลสอบ) + คอลัมน์ ผลสอบเฉลี่ย ในตารางนักเรียน", status: "done", date: "2026-11-25", round: "ฟอร์มในแผง + Lead/Customer + ผลสอบ", href: "/students" },
  { id: "d-inv-preview", area: "Invoice / Receipt", title: "ดูกระดาษใบแจ้งหนี้ (DRAFT) ในแผงทันทีหลังสร้าง ก่อนมีเลข Official · ปุ่ม Force Approve ไม่มีคำว่า PDF", status: "done", date: "2026-11-25", round: "ฟอร์มในแผง + Lead/Customer + ผลสอบ", href: "/billing" },
  { id: "o-form-resend", area: "นักเรียน & ฟอร์ม", title: "ยังไม่ได้กด ส่งใหม่ ผ่านหน้าจอจริง (ตรวจด้วย API แล้ว)", status: "open", waiting: "ผม (Claude)", how: "ต้องเชื่อม LINE ก่อน แล้วกด ส่งฟอร์มอีกครั้ง ในแผง Lead", href: "/crm", date: "2026-11-25" },
  { id: "o-lead-pickers", area: "นักเรียน & ฟอร์ม", title: "ตัวเลือกเลือกนักเรียน/ครอบครัวในหน้าอื่น (Inbox · Billing สร้างใบ · ปฏิทิน) ยังเห็นนักเรียนสถานะ Lead", status: "open", waiting: "ผม (Claude)", how: "เปิดตัวเลือกในหน้าเหล่านั้นแล้วดูว่ามีรายชื่อที่เป็น Lead ปนอยู่", href: "/billing", date: "2026-11-25" },
  { id: "o-form-other", area: "นักเรียน & ฟอร์ม", title: "ฟอร์มอื่น (รถ · PDPA · โอนย้าย) ยังไม่เข้าโครงกลาง form-hub · การ์ด Enroll ยังไม่อยู่ในแผงนักเรียน", status: "todo", waiting: "ผม (Claude)", how: "ตอนนี้โครงกลางมีเฉพาะ Enroll ในแผงครอบครัว", href: "/families", date: "2026-11-25" },
  { id: "o-dash-redesign", area: "ระบบ & ทั่วไป", title: "รีดีไซน์ Dashboard: กล่องคงที่ รกน้อยลง มี empty state (ยังไม่เริ่ม)", status: "decide", waiting: "คุณ", how: "ต้องคุยหน้าตาที่อยากได้ก่อนเริ่ม", href: "/", date: "2026-11-25" },
  { id: "o-bank", area: "ระบบ & ทั่วไป", title: "Bank Account ใน System › การเงิน (ต่อสาขา/NA/LI + อัปโหลด QR) — จอดไว้", status: "decide", waiting: "คุณ", how: "ตอนนี้ QR บนใบแจ้งหนี้ใช้เฉพาะ NA", href: "/settings", date: "2026-11-25" },
]

export const checklistOpen = () => CHECKLIST.filter((i) => i.status !== "done").length
