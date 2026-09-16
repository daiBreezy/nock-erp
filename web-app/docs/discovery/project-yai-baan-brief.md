# Project "ย้ายบ้าน" — Project Brief

> เอกสารธงเหนือหัวของโปรเจกต์ ย้ายเว็บ NockAcademy ออกจาก WordPress ไป standalone
> อัปเดตล่าสุด: 2026-08-06 · สถานะ: Discovery (คุยแกะ requirement)

---

## 1. โปรเจกต์นี้คืออะไร (What)
ย้ายเว็บ **NockAcademy** (https://nockacademy.com/) ออกจาก **WordPress** ไปอยู่แบบ **standalone** (สร้างเว็บเอง ไม่พึ่ง service สำเร็จรูป) โดยอิงเนื้อหา/ข้อมูลเดิมที่มีอยู่บนเว็บ

ชื่อเล่นโปรเจกต์: **"ย้ายบ้าน" 🏠**

---

## 2. ทำไมต้องย้าย (Why) — Requirement จาก Director
1. **Tracking ทำได้ยาก** — เก็บ data / วัดผลบน WordPress ไม่เต็มที่
2. **ไม่ Flexible** — แก้ไขส่วนต่างๆ ลำบาก (รวมถึงหลังบ้าน Admin ที่รก ใช้ยาก ดูแล้วงง)
3. **ต้องเร็ว** — อะไรย้ายไปก่อนได้ ให้ย้ายก่อน ที่เหลือไว้ Phase ถัดไป

---

## 3. ย้ายอะไรบ้าง (Scope)

เว็บเดิมมี 2 โลก → เฟสแรกโฟกัส **โลก Marketing** เท่านั้น

### ✅ Phase 1 — ย้ายก่อน (โลก Marketing)
- Landing / หน้าแรก
- Courses (คอร์ส)
- Classrooms (แยกตามชั้น ป.5–ม.6)
- FAQ
- หน้ากฎหมาย (Terms, Refund, Privacy/Cookie, PDPA)

### ⏳ Phase ถัดไป — ไว้ทีหลัง
- **Articles** (บทความ ~หลายสิบหน้า ไม่ถึงร้อย) — ลิงก์กลับบ้านเก่าไปก่อนได้
- **โลก Learning ทั้งหมด** (คลิป, ห้องเรียน, ข้อสอบ, ระบบสมาชิก — ต้อง login) — ปุ่ม Login/เข้าเรียน ชั่วคราวลิงก์กลับ WordPress เดิม

---

## 4. บ้านใหม่ต้องเก่งอะไร (Pillars)
1. **Track เก่ง** 🎯 — คุมทุก element เอง ยิง event ได้อิสระ (นี่คือพระเอกตัวจริง)
2. **หลังบ้านเรียบง่าย** 🧩 — Headless CMS ที่ทีมแก้เนื้อหาเองได้ ไม่รกเหมือน WordPress
3. **เร็ว/คุมได้** ⚡ — เว็บ custom เบา เร็ว ปรับได้อิสระ

---

## 5. ข้อมูลสำคัญเชิงออกแบบ (Design Facts) ⭐
- **Tablet เป็น Hero** — เว็บเดิมออกแบบ Mobile เป็น visual หลัก ~80% แต่ Director ต้องการเปลี่ยนให้ **Tablet เป็นตัวตั้ง** เพราะ user ใช้ tablet เยอะกว่า
  - ⚠️ กระทบงานเดิม: prototype/app เดิมทำ mobile-first — ต้องทบทวน layout ใหม่
- **ผู้ใช้ส่วนใหญ่เป็นผู้ใหญ่** (ผู้ปกครอง/คนโต) เด็กเป็นส่วนน้อย → โทน/ภาษา/UX ควรออกแบบเพื่อผู้ใหญ่เป็นหลัก
- **ไม่กังวล SEO** — ไม่ต้องแบก technical SEO ตอนย้าย (ยิ่งทำให้ย้าย Marketing ได้เร็ว + ยืนยันว่า Articles ไว้ทีหลังได้)

---

## 6. ทีม & บทบาท
- **Lead (User):** ประสบการณ์เทคนิคน้อย → โฟกัสงาน Lead: ตัดสินใจ, จัดลำดับ, ตรวจของ, เชื่อมคน
- **Claude:** งานเทคนิคทั้งหมด (stack, code, tracking, CMS setup) + อธิบายเป็นภาษาคน + ทำ prototype ให้ดู
- **คนแก้เนื้อหา:** ระดับ "พอไหว" (เคยใช้ WordPress/Canva)
- **มี dev สาย tech ในทีม** ช่วย setup ได้

## 7. Toolset ที่วางไว้ (ยังไม่ต้องเปิดใช้ตอนนี้)
- จัดการงาน/requirement: **Notion**
- Hosting บ้านใหม่: **Vercel** (แนวโน้ม)
- หลังบ้านเนื้อหา: **Headless CMS** (ยังไม่เลือกตัว)
- Tracking: **Google Tag Manager + GA4** (+ อาจมี Facebook Pixel)

---

## 8. คำถามที่ยังเปิดอยู่ (Open Questions)
- [ ] Tracking — เอา data ไปทำอะไรต่อ? (ยิงแอด / remarketing / วัด funnel / ดู behavior) และตอนนี้ใช้ GA/Pixel/GTM อยู่ไหม
- [ ] Timeline / Deadline มีไหม
- [ ] งบประมาณ / ใครอนุมัติ
- [ ] "Tablet เป็น Hero" — มีข้อมูล/สถิติ user ยืนยันไหม (จะได้ตั้ง breakpoint ถูก)
- [ ] Domain — บ้านใหม่จะใช้ nockacademy.com เดิม หรือ subdomain ชั่วคราว
