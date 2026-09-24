# NockERP — แผน Build Prototype ใหม่ (2026-09-23)

> สรุปรวมทุกอย่างจากการตรวจ Staging ของ Dev + บริบทจากเจ้าของ → ใช้เป็นแผนตั้งต้นของ prototype ใหม่
> รายละเอียดบั๊ก/วิธีทำซ้ำอยู่ที่ [STAGING-AUDIT-2026-09-23.md](STAGING-AUDIT-2026-09-23.md)

---

## 1. สรุปสถานการณ์

| | Staging (Dev) | Prototype เดิม (`new-erp/`) |
|---|---|---|
| Stack | Next.js + React + Tailwind + Clerk + DB จริง | HTML + Vanilla JS + mock data |
| ขอบเขต | 11 เมนูใช้งานได้ | ~27 views (รวม Finance/Payroll/Bus/Inventory) |
| สถานะ | Flow หลักมีครบ แต่บั๊กเยอะ + ช้า | ออกแบบไว้กว้าง แต่ไม่ตรงกับที่ Dev ทำจริงแล้ว |

**เป้าหมาย prototype ใหม่:** ยึดโครงสร้างและ business logic ที่ Dev ทำจริง → แก้ Flow ที่มีปัญหา + ปรับ UX ให้ใช้ง่าย → ใช้เป็นแบบให้ Dev ปรับตาม และออกแบบโมดูลที่ Dev ยังไม่ได้ทำ

---

## 2. Business rules ที่ยืนยันแล้ว (ต้องคงไว้)

1. **นักเรียนเกิดจาก Billing/Enrollment** ไม่ใช่เพิ่มมือ (Invoice → จ่าย → Entitlement → Claim เข้าคลาส)
2. **Invoice = Maker–Checker:** คนสร้างอนุมัติใบตัวเองไม่ได้ ต้องอีกคน (role ใดก็ได้)
3. **ราคามาจาก Branch Packages** (Hour / Week / Month × วิชา × เกรด) · แก้ราคาคอร์สต้องใส่เหตุผล
4. **Multi-brand** (Nockacademy / Liclass) → memo, holiday, บัญชีธนาคาร, เลข invoice ผูก brand
5. **LINE Link Code:** ยังไม่มี Inbox → ผูกผู้ปกครองด้วยโค้ด (Branch ตั้ง LINE OA ใน Settings → แอดมิน gen code → ผู้ปกครองส่งโค้ดกลับ → ผูก userId) → ใช้ส่ง Invoice / Receipt / Summary
6. **Invoice 3 สถานะ:** Invoice → Payment (+ bank reconciliation) → Receipt
7. **Class:** Learning = recurring หลายวัน, gen session ล่วงหน้า 8 สัปดาห์ ข้าม holiday, ≤6 คน/คลาส
8. **Summary:** ครูเขียน → Submit → Approve → Send to parent
9. **Staff:** หลาย role ต่อสาขา · no-login สำหรับพาร์ทไทม์ · ลบ = deactivate
10. **Monthly package คิดราคาตามจำนวนสัปดาห์ที่เหลือในเดือนที่ซื้อ** (Dev เพิ่ม 2026-09-23):
    - เหลือ 3–5 สัปดาห์ = 100% · 2 สัปดาห์ = 60% · 1 สัปดาห์ = 30%
    - ตัวอย่าง: ซื้อ 23 ก.ย. เหลือเรียน 1 ครั้ง → ฿4,500 × 30% = ฿1,350 (PDF เขียน "Sep 2026: 1 session (30%)")
11. **Concession** = ส่วนลดที่ Admin ใส่ให้ลูกค้าโดยตรง ด้วยเหตุผลใดก็ได้ แต่ **ต้องใส่ Remark ทุกครั้ง**

---

## 3. ปัญหาราย Flow → สิ่งที่ prototype ต้องแก้

### Flow A — รับนักเรียนใหม่ (Family → Student → Invoice → จ่าย → เข้าคลาส)
| ปัญหาที่เจอ | แนวทางใน prototype |
|---|---|
| ไม่เช็คเกรด (ป.1 ซื้อคอร์ส ป.5 ได้) | กรองคอร์ส/คลาสตามเกรด + เตือนถ้าไม่ตรง (override ได้พร้อมเหตุผล) |
| เพิ่มนักเรียนเข้าคลาสได้คนละแบบ (subscription vs 0 คาบ) | กติกาเดียว: ประเภทสิทธิ์มาจากคอร์ส/invoice เสมอ |
| ฟอร์ม Family ไม่ validate (เบอร์ abc, วันเกิดอนาคต) | validate เบอร์ไทย / รหัสไปรษณีย์ / วันเกิด |
| Family ไม่มีปุ่มสร้างนักเรียน, ข้อความ "linked all" ผิด | สร้างนักเรียนจากหน้า Family ได้เลย · empty state ที่ถูกต้อง |
| สถานะนักเรียนขัดกัน (Inactive แต่อยู่ 4 คลาส) | สถานะคำนวณจากสิทธิ์จริง แสดงที่เดียวกันทุกหน้า |

### Flow B — การเงิน (Invoice → Approve → Send → รับเงิน → Receipt)
| ปัญหาที่เจอ | แนวทางใน prototype |
|---|---|
| PDF ค้าง ไม่มี timeout/retry | สถานะ Failed + ปุ่ม Retry ชัดเจน |
| ช่วงเรียน "29 ก.ย. → 29 ก.ย. · 0 ชม." | คำนวณวันจบจากจำนวนงวด × ตารางคลาส (ข้าม holiday) แสดง preview รายครั้ง |
| ยอด Detail / Edit / PDF ไม่ตรงกัน | แหล่งข้อมูลเดียว: ทุกหน้าแสดงทุกบรรทัด (fee, ส่วนลด, holiday closure) |
| ค่ารถติ๊กให้อัตโนมัติ + คิดแค่ 1 ครั้ง | ค่ารถ opt-in · คิดตามจำนวนครั้งจริง |
| งวดติดลบแสดงยอดติดลบ | จำกัดขั้นต่ำ 1 ที่ input |
| Void ไม่ใส่เหตุผลแล้วเงียบ | ช่องเหตุผลติด * + error ใต้ช่อง |
| แก้ใบหลัง Approve | แก้แล้วสถานะกลับเป็น "รออนุมัติ" อัตโนมัติ |
| ผู้อนุมัติไม่รู้ว่ามีงานรอ | คิว "รออนุมัติ" + notification ถึงผู้มีสิทธิ์ |

### Flow C — การเรียนประจำวัน (Session → เช็คชื่อ → Summary → ส่งผู้ปกครอง)
| ปัญหาที่เจอ | แนวทางใน prototype |
|---|---|
| เช็คชื่อ session อนาคตได้ · สถานะกลายเป็น Ended/Live | ล็อกเช็คชื่อจนถึงวันเรียน (Leave ล่วงหน้าได้แต่ไม่เปลี่ยนสถานะ session) |
| Leave ไม่ขึ้นในแถว แต่ไปนับผิดเดือน | บันทึกลาเป็นรายการของ session นั้นจริง |
| Summary อนุมัติตัวเองได้, Send ก่อน Approve | ใช้ Maker–Checker เหมือน Invoice (หรือกำหนดสิทธิ์ชัด) |
| Attendance filter เป็น mock | ดึงวิชาจริงของสาขา |

### Flow D — ตั้งค่าสาขา (Branch → Packages → Course → Class)
| ปัญหาที่เจอ | แนวทางใน prototype |
|---|---|
| สร้างคลาสวันที่สาขาปิดได้ · เวลา 09–20 ตายตัว | บล็อก (หรือ override พร้อมเหตุผล) · เวลาอิงเวลาเปิดสาขา |
| สาขาใหม่ปิดทุกวันโดยไม่บอก | Setup checklist หลังสร้างสาขา (เวลาเปิด, วิชา, เกรด, ราคา, บัญชี, LINE) |
| บัญชีธนาคารผิดชื่อ brand | แสดง/แก้บัญชีต่อสาขา |
| แพ็กเกจรายเดือนไม่ขึ้นใน plan list | แสดงครบทุกประเภท |
| ลบครูที่ยังมีคลาส → ชื่อเป็น UUID | เตือน + บังคับย้ายครูก่อนลบ |

### Flow E — ผูก LINE ผู้ปกครอง
| ปัญหา / คำถาม | แนวทางใน prototype |
|---|---|
| โค้ดผูกระดับนักเรียน (พี่น้องต้องส่งหลายครั้ง) | ผูกระดับ Family · 1 โค้ดครอบทุกคนในบ้าน |
| พ่อ/แม่คนละ LINE | ผูกได้หลายคน + เลือกผู้รับหลัก |
| ต้องแอด OA ก่อน | หน้า/ลิงก์ 2 ขั้น: แอดเพื่อน → ส่งโค้ด |
| อายุ/ความปลอดภัยของโค้ด | โค้ดหมดอายุ + ใช้ครั้งเดียว + แสดงสถานะ |
| ต่อยอด | เตรียมโครงสร้างสำหรับ Inbox |

---

## 4. หลักการ UX ที่ใช้ทั้ง prototype

1. **ทุกการกดต้องมี feedback:** loading → สำเร็จ (toast) / ผิดพลาด (ข้อความภาษาคน) — ไม่มีการ "เงียบ"
2. **ภาษาเดียว** (ไทยเป็นหลัก, ศัพท์เฉพาะคงอังกฤษได้) · ไม่มี dev note / error ดิบ / emoji icon
3. **ฟอร์มสั้นลง:** แบ่งเป็นขั้น (stepper) + ค่า default ที่ถูก + validate ทันทีที่กรอก
4. **สถานะเข้าใจง่าย:** ใช้คำ + สีชุดเดียวทั้งระบบ (Invoice / Session / Student)
5. **ยืนยันก่อนทำสิ่งที่ย้อนไม่ได้** และบอกผลกระทบ ("มีนักเรียน 2 คนใน session นี้")
6. **Responsive:** ใช้บน iPad/มือถือได้ (sidebar หุบได้)
7. **Empty state ที่บอกว่าต้องทำอะไรต่อ**

---

## 5. ขอบเขต (เสนอ)

**Phase 1 — ตรงกับที่ Dev มี + แก้ Flow**
Calendar · Students · Families · Staff · Courses · Classes · Sessions · Attendance · Summaries · Billing · Settings (Branch 11 แท็บ + System) · Notifications · Sign-in

**Phase 2 — โมดูลที่ Dev ยังไม่ทำ**
Dashboard · Inbox (ต่อยอด LINE) · CRM · Tasks · Reports · Logs & Timeline

**Phase 3 — Finance / อื่น ๆ** (ดึง spec จาก prototype เดิม: FINANCE-MODEL, LOGIC-SPEC-xx)

---

## 6. การตัดสินใจ

1. **UI library:** ✅ **shadcn/ui** (เจ้าของเลือก) → ต้องใช้ React
   - Stack ที่แนะนำ: **Next.js (App Router) + TypeScript + Tailwind + shadcn/ui** + mock data (ยังไม่ต่อ DB) — ยังรอเจ้าของยืนยัน
2. **ขอบเขตรอบแรก:** ✅ **Phase 1 ก่อน** แล้วค่อยต่อ Phase 2
3. **Prototype เดิม:** ✅ **เก็บไว้ที่เดิม** (`new-erp/`) — prototype ใหม่สร้างในโฟลเดอร์แยก
4. **ยังไม่เริ่ม build** จนกว่าเจ้าของสั่ง

## 7. ยังค้าง
- เทส Billing ครบวง (รอ Dev แก้ Database) → อัปเดตหัวข้อ Flow B
- เทสสิทธิ์ของแต่ละ role (มีบัญชี Dai Breezy = Teacher แล้ว)
- ลบข้อมูล TEST-Branch บน staging เมื่อเสร็จ
