# Discovery — IA Proposal v2 (Sidebar) สำหรับ Teacher.nockacademy.com

> สถานะ: 🟡 Draft v2 — ผ่านการ Review รอบแรกจาก Nock (ในฐานะ PO + Senior UX Reviewer) แล้ว
> อ่าน [[workload-current-state]] ก่อน เพื่อเข้าใจที่มาของทุกจุดในนี้
> Prototype: `prototypes/course-feedback-v2.html`

## v1 ทำไมถึงตก

v1 ลอกโครง IA ของเว็บเดิม (Top-nav → Course tab → Sub-tab → Subject tab) มาแปะ AI Panel เพิ่ม — Nock Feedback ตรงๆ ว่า "มึนงงและสับสนมากๆ ทำงานได้ยากมากๆ" เพราะมันสืบทอดปัญหาจริงของเว็บเดิม (Nest ลึก, Workload กระจายเป็น Column ย่อยเยอะ) แทนที่จะแก้

## v2 — สร้างจาก Reference Wireframe ของ Nock เอง

- **Sidebar ซ้าย แบบ Section-first**: Dashboard / Student list / Course / Feedback / Report — เรียบ ไม่ Nest ใต้ Course
- **Course selector เป็น Pill แยกอิสระ** ไม่ผูกกับ Nav หลัก — สลับคอร์สไม่กระทบ Section ที่ดูอยู่
- **Feedback ขึ้นเป็น Section ระดับบนสุดของตัวเอง** — แยกงาน "แต่งเนื้อหา" (เขียน Comment) ออกจากงาน "ติดตามสถานะ" (หน้า Course)
- **แถวนักเรียนยุบเหลือ Status เดียว** (`Prepared` / `Pending` / `Sended`) แทนที่จะมี Column แยกทีละวิชา — รายละเอียดรายวิชา (Quiz/Homework/Feedback) ย้ายไปอยู่ **Drawer เลื่อนจากขวา** เปิดเมื่อคลิกแถว
- **ปุ่ม "Sent to Parent" รวมศูนย์ปุ่มเดียว** พร้อม Checkbox + Select all แทน Grid Checkbox แยกทีละวิชา
- พื้นที่ที่มี AI ช่วย ต้อง Flag ให้เห็นชัด (Spark icon ✦ + Panel โทนสีต่างหาก) แยกจากส่วนที่ Manual เสมอ
- ไอคอน Copy ข้าง ID/ชื่อ/เบอร์ (TA ต้อง Paste ไปที่อื่นบ่อย เช่น LINE)

## ไอเดีย AI เดิม ไปอยู่ตรงไหนใน v2

| ไอเดีย | อยู่ตรงไหนใน v2 | สถานะ |
|---|---|---|
| AI ช่วยคิด Live Quiz | ยังไม่ได้วางที่ | **ติดอยู่ที่ Open Question 1** |
| AI ช่วยตรวจ (Homework) | Drawer นักเรียน → แถว Homework → Modal: คอมเมนต์ Facebook ดิบคู่กับตาราง Auto-match แก้ไขได้ทีละแถว (AI เสนอ TA ยืนยัน) | ออกแบบใน Prototype แล้ว |
| AI เขียน Summary | Section Feedback: ร่าง Comment จากหัวข้อบทเรียน + การกระจายคะแนนของห้อง, QA Mismatch เตือนก่อนบันทึกเลย | ออกแบบใน Prototype แล้ว |
| AI Suggest Video รายบุคคล | ยังไม่ได้วางที่ | **ติดที่ Phase Video Re-structure** (แยกเอกสาร) |

## Visual Language ที่ใช้ใน Draft

Sidebar โทน Lavender/Purple อ่อน (ตาม Reference ของ Nock), Status `Prepared` = Amber, `Sended` = Green, `Pending` = เหลืองมัว, **สี Teal สงวนไว้เฉพาะจุดที่ AI แตะ** เพื่อไม่ให้ปนกับความหมาย Status ตัวอักษร: IBM Plex Sans Thai (UI/Label), Sarabun (Comment ยาว) — รายละเอียดเต็มใน [[foundation]]

## ❓ Open Questions — ต้องเคลียร์ก่อน/ระหว่าง Build

1. **การสร้าง Live/Quiz/Homework อยู่ตรงไหน** — ตอนนี้: Web Admin ทางเลือก: (ก) ย้าย Authoring มาไว้ที่นี่แล้วใส่ AI ช่วย (ข) ปล่อยไว้ที่ Admin แล้วใส่ AI ช่วยฝั่งนั้นแทน (คนละ Scope/Codebase) (ค) ตัดออกจาก Scope รอบนี้ไปก่อนชัดเจน
2. **ความเป็นไปได้จริงของการดึงคอมเมนต์ Facebook** — ไอเดีย Homework AI-match สมมติว่ามี Graph API เข้าถึง Page ได้ (สิทธิ์/Rate limit) — ยังไม่ยืนยันทาง Technical
3. **Suggest Video** — รอ Phase Video Re-structure (Taxonomy/Tagging) เสร็จก่อน ยังไม่ลงรายละเอียดในเอกสารนี้
4. **ความหมายของ Status** — ตีความไว้ว่า `Prepared` = ทุกวิชา (Quiz+Homework+Feedback) พร้อมส่งแล้ว (ไม่ว่า AI Draft หรือ Manual), `Pending` = ยังขาดบางอย่าง, `Sended` = ส่งจริงแล้ว — ❓ ต้องยืนยันว่าตรงกับ Reference ของ Nock จริงไหม
5. **Volume จริง** — TA กี่คน, Homework กี่ครั้ง/สัปดาห์, ต่อคอร์ส — ต้องรู้ก่อนประเมิน ROI ของ Feature Homework AI-match จริงจัง

## ⚠️ Cross-reference กับโปรเจกต์อื่น (สำคัญ — อ่าน `CLAUDE.md` ของโปรเจกต์นี้ก่อนตัดสินใจ Build)

พบว่า `../Web App` (Redesign หน้าบ้านฝั่งนักเรียน) มี Discovery doc ชื่อ `homework-room.md` และ `live-stream-page.md` ที่ใช้คำว่า "Homework" และ "Live Quiz" เหมือนกัน **แต่คนละความหมาย/คนละฟีเจอร์** ห้ามเอามาปนกัน — ดูรายละเอียดใน CLAUDE.md ของโปรเจกต์นี้ นอกจากนี้ `live-stream-page.md` มีไอเดีย "AI Summary หลังวิดีโอจบ" อยู่แล้วซึ่งอาจใช้เป็นวัตถุดิบตั้งต้นให้ AI Draft Summary ของโปรเจกต์นี้ได้ — ควรคุยกับทีมที่ดูแล Web App ก่อน Build ซ้ำซ้อนกัน

## Scope ที่ตัดออกชัดเจน

- Video Re-structure (Phase แยก มีเอกสาร Discovery ของตัวเองทีหลัง)
- Krujob (โปรเจกต์อื่น ~15% priority ตาม Shibasan)
- Reports/Churn/Renewal Analytics — ไม่ใช่ Pain Point ด้าน Workload ที่คุยกันรอบนี้
