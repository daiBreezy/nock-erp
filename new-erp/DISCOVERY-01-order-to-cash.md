# DISCOVERY 01 — Order to Cash (Invoice → Payment → Receipt)

> Business Discovery phase. NOT a design doc. NOT a UI spec.
> Status: **DRAFT — awaiting validation from Nock**
> Source: Admin interview + Nock's flow diagram (Invoice+Receipt / Monthly Bills), 10 Jul 2026
> ⚠️ Items marked `❓VALIDATE` are assumptions Claude made and Nock has NOT confirmed.

---

## 0. Scope correction (before anything else)

Two workflows were conflated in the original brief:

| ชื่อเดิมใน brief | สิ่งที่มันเป็นจริง | Domain |
|---|---|---|
| Monthly Billing / Prepare Monthly Bills | **Monthly Closing Package** — ประกอบเอกสารส่งสำนักงานบัญชี (KMD) | Period Close / Compliance |
| Generate Invoice → Teacher Review → Send Invoice | **Order to Cash** — ออกบิลค่าเรียนให้ผู้ปกครอง | Revenue / AR |

They share almost no data and no actor except Admin. **They must be analysed separately.**
This document covers Order to Cash only. Monthly Closing = `DISCOVERY-02`.

Confirmed billing model: **PRE-PAID PACKAGE** (24h/48h/72h/96h). There is no usage-based
monthly billing. An invoice is raised per enrollment / per renewal, not per calendar month.

---

## 1. Business Goal

แปลง "ความตั้งใจจะเรียนของผู้ปกครอง" ให้กลายเป็น **เงินสดที่รับรู้แล้ว + สิทธิ์เรียนที่ระบบรับรอง**
โดยมีหลักฐานครบถ้วนพอที่สำนักงานบัญชีจะลงบัญชีได้ และตรวจสอบย้อนหลังได้

Sub-goals:
- ผู้ปกครองรู้ว่าต้องจ่ายเท่าไหร่ ค่าอะไรบ้าง ภายในกี่วัน
- เงินที่เข้าบัญชีถูกจับคู่กับ Invoice ได้ถูกต้อง 100%
- ใบเสร็จออกได้เร็ว โดยไม่ต้องรอ Admin ว่าง

---

## 2. Actors

| Actor | บทบาทในสาย O2C | หมายเหตุ |
|---|---|---|
| **Admin (Master)** | สร้าง Invoice, ตรวจสลิป, สร้าง Receipt | 1 คน/สาขา · มี digital signature |
| **Admin (Normal)** | คุยกับผู้ปกครอง, ตามจ่าย | สร้าง INV ไม่ได้ |
| **Teacher** | Re-check Invoice ก่อนส่ง | ❓VALIDATE: ตรวจ field ไหนบ้าง |
| **Parent / Customer** | รับบิล, โอนเงิน, แนบสลิป | ไม่มี login (ใช้ Form + LINE) |
| **Shibasan** | ❓VALIDATE: อนุมัติ Document ก่อนเข้า KMD | ปรากฏเป็น gate สุดท้ายของ *ทุก* เส้นทาง |
| **KMD** | ❓VALIDATE: สำนักงานบัญชีภายนอก / document vault | ปลายทางของทุกเอกสาร |
| **KBiz / Krungsri** | ระบบธนาคาร — ยืนยันว่าเงินเข้าจริง | **T+1 lag** (ดู §8) |

---

## 3. Trigger

**Primary:** ผู้ปกครองตกลงซื้อ/ต่อ package (ผ่านการคุยกับ Admin)
**Secondary (system-driven, มีอยู่แล้วใน prototype):** `sessionsRemaining ≤ 2` → auto-draft renewal invoice
**Tertiary:** เกิด additional fee ระหว่างงวด (Book / Bus / Exam) → ต้องเข้าบิลรอบถัดไป

❓VALIDATE: additional fee ที่เกิดกลางคอร์ส (เช่น ซื้อหนังสือเดือนที่ 2) ออกบิลแยกทันที
หรือรอไปรวมกับบิลต่ออายุ?

---

## 4. Preconditions

- Student + Family record มีอยู่ในระบบ
- Enrollment / Package ที่จะซื้อ ถูกเลือกแล้ว
- ราคาถูกกำหนดแล้ว (3-tier: course override → branch price matrix → package default)
- ส่วนลด (sibling discount / promotion) ถูกคำนวณแล้ว
- ผู้สร้างต้องเป็น Admin Master ของสาขานั้น
- ❓VALIDATE: ต้องมี Teacher ที่รับผิดชอบ assign ไว้ (เพราะต้อง re-check)

---

## 5. Input

| Input | ที่มาปัจจุบัน | ควรมาจากไหน (target) |
|---|---|---|
| Student / Family | ERP | ERP |
| Package + ชั่วโมง | Admin พิมพ์ | Enrollment record |
| ชั่วโมงคงเหลือ (สำหรับ renewal) | ❓ Sheet / จำ | Attendance ledger (derived) |
| **Book fee** | Admin จำ / ถามครู | Book issuance record ← **ยังไม่มี entity นี้** |
| **Bus fee** | Admin คำนวณตามวัน | Bus registration + day count ← มี `BusFee` แล้ว |
| **Exam fee** | Admin จำ | Exam registration ← **ยังไม่มี entity นี้** |
| ส่วนลด | คำนวณมือ | Promotion engine (มีแล้ว) |
| Payslip | Form submission **หรือ** LINE | ช่องทางเดียว |
| Bank transaction | KBiz หน้าเว็บ (ดูตา) | Bank feed / Bill Payment ref |

---

## 6. Step-by-step Process (AS-IS — ตามภาพของ Nock)

```
 1. Admin  : คุยกับผู้ปกครอง (LINE / โทร / หน้าเคาน์เตอร์)
 2. Admin  : สร้าง Invoice — รวม Course + Book + Bus + Exam ใน "ใบเดียว"
 3. Teacher: Re-check Invoice → หาข้อมูลที่ตกหล่น/ผิด        ⟵ human checksum
 4. Admin  : แก้ตามที่ครูทัก (ถ้ามี)
 5. Admin  : Send to Customer — ส่งเป็น "Form" (คล้าย Google Sheet)
 6. Parent : อ่านบิล → ตัดสินใจ → โอนเงิน (mobile banking)
 7. Parent : แนบ Payslip ใน Form → Submit          ┐ 2 ช่องทาง
    Parent : (หรือ) ส่ง Payslip ทาง LINE            ┘ แยกกัน
 8. Admin  : ถ้ามาทาง LINE → Download รูป → Upload เข้า Document ด้วยมือ
 9. ⏳ WAIT : รอ ≥1 วัน — KBiz แสดง transaction ของ "เมื่อวาน" เท่านั้น
10. Admin  : เปิด KBiz → ไล่หา transaction ที่ยอด/เวลา ตรงกับสลิป
11. Decision: ตรงกันไหม?
      ├─ ตรง   → ไป 12
      └─ ไม่ตรง → กลับไปคุยกับผู้ปกครอง (loop)
12. Admin  : สร้าง Receipt (ลายเซ็น Master Admin)
13. Admin  : Send Receipt to Customer
14. System : Invoice + Receipt + Payslip → Document → Invoice Bucket
15. Shibasan: Approval
16. → KMD
```

**Context switches ต่อ 1 ใบ:** ERP → LINE → Form → LINE → KBiz → ERP → Document → (Shibasan) → KMD
**≈ 7 ครั้ง × 50–100 ใบ/เดือน**

---

## 7. Decision Points

| # | คำถามที่ต้องตัดสิน | ใครตัดสิน | เกณฑ์ | Automatable? |
|---|---|---|---|---|
| D1 | Invoice ครบถ้วน/ถูกต้องไหม | Teacher | ❓VALIDATE | ✅ ถ้า line items derive จาก source |
| D2 | ผู้ปกครองจ่ายหรือยัง | Admin | เห็นสลิป | ⚠️ สลิปไม่ใช่หลักฐานเงินเข้า |
| D3 | สลิปตรงกับ transaction ไหม | Admin | ยอด + เวลา + ชื่อผู้โอน | ✅✅ ถ้ามี payment reference |
| D4 | จ่ายไม่ครบ / จ่ายเกิน ทำยังไง | Admin | ❌ **ไม่มี rule** | — |
| D5 | เกินกำหนดชำระ ทำยังไง | ❌ ไม่มีเจ้าของ | ❌ **ไม่มี rule** | ✅ dunning |
| D6 | Shibasan อนุมัติอะไร | Shibasan | ❓VALIDATE | ❓ |

**D4 และ D5 คือ business rule ที่หายไป** — ต้องถาม

---

## 8. Business Rules

### ที่ยืนยันแล้ว
- Invoice 1 ใบ รวมทุกค่าใช้จ่าย (Course + Book + Bus + Exam) — **ไม่แยกใบ**
- Master Admin เท่านั้นที่สร้าง Invoice + Receipt ได้ (1 คน/สาขา)
- ลายเซ็น Master Admin ปรากฏบน INV + Receipt (ไม่มีลายเซ็น Director)
- Receipt สร้างได้ก็ต่อเมื่อยืนยันเงินเข้าใน bank statement แล้ว
- **Renewal = Invoice ใหม่ + Enrollment ใหม่เสมอ** (ไม่ extend ของเดิม)
- Invoice status: `draft → sent → pending_verification → paid` (ไม่มี rejected)

### ⚠️ ข้อจำกัดทางเทคนิคที่กลายเป็น business rule
> **KBiz แสดง transaction แบบ T+1** — เห็นได้เฉพาะรายการของเมื่อวาน
> ⇒ **Receipt ออกวันเดียวกับที่ผู้ปกครองจ่ายไม่ได้ ตลอดกาล**
> นี่ไม่ใช่กฎธุรกิจ — นี่คือข้อจำกัดของเครื่องมือที่ถูกยอมรับจนกลายเป็นกฎ

### ❌ Business Rules ที่ยังไม่มี (ต้องนิยาม)
- Payment term — บิลออกแล้วต้องจ่ายภายในกี่วัน?
- Underpayment / Overpayment — จ่ายขาด 100 บาท ทำยังไง? จ่ายเกินเก็บเป็น credit ไหม?
- Partial payment — จ่ายเป็นงวดได้ไหม?
- Overdue — ค้างกี่วันถึงตัดสิทธิ์เรียน? ใครเป็นคนตัดสิน?
- Cancellation / Refund — ยกเลิกกลางคอร์สคืนเงินยังไง?
- Void / Credit Note — Invoice ที่ส่งไปแล้วผิด แก้ยังไง?

---

## 9. Exception Cases

| Exception | ปัจจุบันจัดการยังไง | ความถี่ | ปัญหา |
|---|---|---|---|
| สลิปปลอม / สลิปเก่าส่งซ้ำ | ตาเปล่า | ❓ | ตรวจไม่ได้จริง |
| โอนจากบัญชีคนอื่น (ญาติโอนให้) | Admin จำเอา | ❓ | matching พัง |
| โอนยอดรวมหลายบิล (ลูก 2 คน) | Admin แยกเอง | น่าจะบ่อย | matching พัง |
| จ่ายเงินสดที่สาขา | ❓VALIDATE | ❓ | ไม่มีใน flow เลย |
| ผู้ปกครองส่งสลิปทาง LINE | Admin download → upload | บ่อย | งานซ้ำซ้อน |
| Invoice ผิดหลังส่งไปแล้ว | ❓ | ❓ | ไม่มี void flow |
| ผู้ปกครองไม่จ่าย / เงียบ | ❓ ไม่มีใครตาม | ❓ | **ไม่มี owner** |

---

## 10. Output

- **Invoice** (PDF + Form) — ส่งผู้ปกครอง
- **Receipt** (PDF, มีลายเซ็น) — ส่งผู้ปกครอง
- **Payslip** (image) — เก็บเข้า Document
- **Enrollment ที่ active** — สิทธิ์เรียนของนักเรียน
- **Invoice Bucket entry** → Shibasan Approval → **KMD**
- Cash-in ที่ยืนยันแล้วในบัญชีธนาคาร

---

## 11. Next Workflow

- → **Learning / Session consumption** (หักชั่วโมง)
- → **DISCOVERY-02: Monthly Closing Package** (INV/RE เข้าชุดเอกสารส่ง KMD)
- → **Renewal** (เมื่อ `sessionsRemaining ≤ 2`) — วนกลับมาที่ workflow นี้
- → **Sales Tax Sheet** (❓ ถ้าบริษัทจด VAT)

---

## 12. Pain Points (เรียงตามต้นทุนจริง)

| # | Pain | ต้นทุน |
|---|---|---|
| P1 | **Payment matching ด้วยตาเปล่า** — เทียบสลิปกับ KBiz ทีละใบ | 50–100 ครั้ง/เดือน × ~5 นาที = **4–8 ชม./เดือน/สาขา** |
| P2 | **T+1 lag** — ต้องกลับมาทำงานเดิมซ้ำในวันถัดไป | เปิดงานค้าง = context switch × 2 |
| P3 | **สลิปเข้า 2 ทาง** (Form + LINE) | download→upload ด้วยมือ, หลุดได้ |
| P4 | **Teacher re-check** = มนุษย์ทำหน้าที่ validation | ครูเสียเวลา + ยังผิดได้อยู่ดี |
| P5 | **Invoice เป็น "Form" ไม่ใช่ระบบ** | ไม่รู้ว่าผู้ปกครองเปิดอ่านหรือยัง |
| P6 | **ไม่มีใครเป็นเจ้าของหนี้ค้าง** | รายได้รั่วโดยไม่มีใครรู้ |
| P7 | **Shibasan = คอขวดเดี่ยว** ของทุกเส้นทาง | ❓VALIDATE |

---

## 13. Root Cause

> **P1, P2, P3 ทั้งหมดมีรากเดียวกัน: เงินที่โอนเข้ามา ไม่มีอะไรบอกว่ามันเป็นของ Invoice ใบไหน**

ผู้ปกครองโอนเงินธรรมดา (plain transfer) → statement มีแค่ *ยอด + ชื่อผู้โอน + เวลา*
ไม่มี invoice number ⇒ ต้องใช้มนุษย์เดา ⇒ ต้องใช้สลิปเป็นตัวช่วยเดา ⇒ ต้องรอ T+1 เพื่อยืนยัน

**สลิปมีอยู่เพราะระบบจับคู่เงินไม่ได้ — ไม่ใช่เพราะสลิปจำเป็น**

รากที่สอง:
> **P4 มีอยู่เพราะ line item บน Invoice ถูก "พิมพ์" ไม่ใช่ "derive"**
> Book/Exam ไม่มี entity ต้นทางในระบบ ⇒ Admin ต้องจำ ⇒ ครูต้องตรวจ

---

## 14. Automation Opportunities (เรียงตาม ROI)

### 🥇 A1 — เปลี่ยนจาก "โอนเงิน" เป็น **Bill Payment (Ref1/Ref2)**
QR บนใบแจ้งหนี้ที่ฝัง `Ref1 = Invoice No`, `Ref2 = Student ID`
⇒ statement มีเลขที่บิลติดมาด้วย ⇒ **matching อัตโนมัติ ~100%**
⇒ **สลิปไม่จำเป็นอีกต่อไป** ⇒ ลบ P1 + P3 ออกทั้งก้อน
⚠️ ต้องยืนยันกับธนาคารว่าเปิด service นี้ให้ได้ (KBank / Krungsri มี — ต้องเช็คค่าธรรมเนียม)

### 🥈 A2 — Bank feed / statement import แทนการเปิดหน้าเว็บดู
ถ้ายังไม่มี API → อย่างน้อย import ไฟล์ statement เข้า ERP แล้วให้ระบบ suggest คู่ที่ตรง
⇒ ลด P1 ได้ ~70% แม้ยังไม่มี A1
⚠️ **ไม่ลบ T+1 lag** — lag แก้ได้ด้วย A1 (real-time notification) เท่านั้น

### 🥉 A3 — Invoice line items ต้อง **derive จาก source ไม่ใช่พิมพ์**
สร้าง entity: `BookIssuance`, `ExamRegistration` (Bus มีแล้ว)
⇒ Invoice ประกอบตัวเองจากสิ่งที่เกิดขึ้นจริง ⇒ **Teacher re-check ไม่จำเป็น** (P4 หาย)
⇒ ครูเปลี่ยนจาก "ตรวจบิล" เป็น "บันทึกตอนแจกหนังสือ" — งานย้ายไปต้นทาง

### A4 — ช่องทางรับสลิปเดียว
ถ้ายังต้องมีสลิปช่วงเปลี่ยนผ่าน → LINE OA ต้อง forward เข้า ERP อัตโนมัติ ไม่ใช่ download มือ

### A5 — Dunning อัตโนมัติ
overdue → เตือนผู้ปกครอง + สร้าง task ให้ Admin (แก้ P6)

### A6 — Auto-receipt
เมื่อ A1 ยืนยันเงินเข้า → **สร้าง + ส่ง Receipt อัตโนมัติ ไม่ต้องมี Admin**
⇒ ขั้นตอน 9–13 หายไปทั้งหมด

---

## 15. Database Entities

**มีอยู่แล้ว:** `Student` `Family` `Enrollment` `Invoice` `InvoiceLine` `Package` `Promotion` `Staff`

**ต้องเพิ่ม:**
| Entity | เหตุผล |
|---|---|
| `Payment` | ปัจจุบัน "การจ่ายเงิน" ไม่มีตัวตน — มีแค่ invoice.status = paid |
| `PaymentAllocation` | 1 payment → หลาย invoice (พี่น้อง) / 1 invoice ← หลาย payment (ผ่อน) |
| `BankTransaction` | ธุรกรรมดิบจาก statement |
| `BankAccount` | KBank saving / KBank currency / Krungsri ×2 |
| `Receipt` | ตอนนี้เป็นแค่ view ของ Invoice — ต้องเป็น document ของตัวเอง (มีเลขที่ของตัวเอง) |
| `BookIssuance` | ต้นทางของ book fee |
| `ExamRegistration` | ต้นทางของ exam fee |
| `CreditNote` | ยกเลิก/คืนเงิน |
| `Document` | payslip / PDF / ไฟล์แนบ + link ไป entity |
| `ApprovalRecord` | Shibasan approval |

---

## 16. External Integrations

| ระบบ | ทิศทาง | สถานะปัจจุบัน | เป้าหมาย |
|---|---|---|---|
| **KBiz (KBank)** | inbound txn | เปิดเว็บดูตา, T+1 | Bill Payment ref + statement import |
| **Krungsri Business** | inbound txn | เปิดเว็บดูตา | statement import |
| **LINE OA** | ส่งบิล / รับสลิป | มือ | ส่ง INV/RE + รับสลิปอัตโนมัติ |
| **KMD** | outbound เอกสาร | ❓VALIDATE | monthly export package |
| **Payroll System** | — | ไม่เกี่ยวกับ O2C | Phase 2 |

**ไม่มี GL** — บัญชี outsource ⇒ ERP ผลิต export ไม่ใช่ลงบัญชี

---

## 17. User Permissions

| Action | Director | Manager | Admin Master | Admin Normal | Teacher | Parent |
|---|---|---|---|---|---|---|
| Create Invoice | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Send Invoice | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| Re-check Invoice | ✅ | ✅ | ✅ | ✅ | ✅ own | ❌ |
| Verify Payment | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Receipt | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Void / Credit Note | ✅ | ❓ | ❌ | ❌ | ❌ | ❌ |
| Upload Payslip | — | — | — | — | — | ✅ |

❓VALIDATE: Shibasan อยู่ตรงไหนใน role hierarchy นี้?

---

## 18. Activity Logs (ต้องบันทึกทุกตัว — immutable)

`invoice.created` `invoice.line_changed` `invoice.teacher_rechecked` `invoice.sent`
`invoice.viewed_by_parent` `payslip.uploaded` `payment.matched(auto|manual)`
`payment.mismatch_flagged` `receipt.created` `receipt.sent`
`invoice.voided` `credit_note.issued` `document.approved(shibasan)` `export.sent_to_kmd`

---

## 19. Notifications

| Event | → ใคร | ช่องทาง |
|---|---|---|
| Invoice sent | Parent | LINE + Email |
| Invoice ไม่ถูกเปิดอ่านใน 3 วัน | Admin | ERP |
| Payment matched | Admin + Parent | ERP / LINE |
| Payment **mismatch** | Admin | ERP (urgent) |
| Receipt issued | Parent | LINE |
| Invoice overdue | Parent → แล้ว escalate ไป Admin | LINE → ERP |
| Renewal due (`≤2 sessions`) | Admin | ERP (มีแล้ว) |
| Teacher re-check pending | Teacher | ERP |

---

## 20. Reports & KPIs

**KPI หลัก (ต้องดีขึ้นหลังทำ ERP):**
- ⏱ **Invoice → Cash (DSO)** — วันนี้ ≥ T+1 เสมอ · เป้า: same-day
- ⏱ **นาที/ใบ ที่ Admin ใช้กับ payment matching** — วันนี้ ~5 นาที · เป้า: 0
- 📉 **% invoice ที่ต้องแก้หลัง teacher re-check** — วัดว่า A3 ได้ผลไหม
- 💸 **ยอดค้างชำระ + อายุหนี้ (AR aging)** — วันนี้ **ไม่มีใครรู้ตัวเลขนี้**
- 🔁 **% auto-matched payments** — เป้า > 95%
- 📄 **จำนวน context switch ต่อใบ** — วันนี้ ~7 · เป้า ≤ 2

---

## 21. Future AI Opportunities

- **OCR สลิป** → อ่านยอด/เวลา/ธนาคาร (ช่วงเปลี่ยนผ่าน ก่อนมี A1)
- **ตรวจสลิปปลอม / สลิปซ้ำ** → hash + duplicate detection
- **Fuzzy payment matching** → เมื่อชื่อผู้โอน ≠ ชื่อผู้ปกครอง
- **Payment prediction** → ทำนายว่าครอบครัวไหนจะจ่ายช้า → ตามล่วงหน้า
- **Churn prediction ตอน renewal** → บิลไหนเสี่ยงไม่ต่อ
- **Invoice anomaly detection** → แทน Teacher re-check ระยะยาว

---

## ✅ ANSWERED (Nock, 10 Jul 2026)

| # | คำถาม | คำตอบ | ผลกระทบ |
|---|---|---|---|
| 1 | Shibasan คือใคร | **Director / CEO** | ⚠️ CEO = approval gate ของ *ทุก* เอกสาร → คอขวด (ดู §12 P7) · ❓ Shibasan = Nock คนเดียวกันหรือไม่ ยังไม่ตอบ |
| 2 | KMD คืออะไร | **สำนักงานบัญชี outsource** | ยืนยัน: ERP ไม่มี GL — ผลิต export เท่านั้น |
| 3 | ไม่จ่ายทำยังไง | **ไม่เคยเกิด · ถ้าเกิด = ไม่ให้เรียนต่อ** | ✅ **ไม่ต้องมี AR aging / dunning / collection** — prepaid ป้องกันโดยธรรมชาติ |
| 4 | จ่ายเงินสด | **ไม่เคยเกิด · ถ้ามี = ข้าม payslip verification** | Low priority · แต่ต้องมี `paymentMethod: cash` + ข้าม step 9–11 |
| 6 | 50–100 ใบ/เดือน | **ทั้งบริษัท (5 สาขา)** | ⚠️ ≈ 2–5 ใบ/วัน → **O2C ไม่ใช่ workload หลัก** — Claude ประเมิน §12 P1 สูงเกินไป |

### 🔧 แก้ไขข้อสรุปที่ผิด
- **§12 P1** — matching กิน ~4–8 ชม./เดือน **ทั้งบริษัท** ไม่ใช่ต่อสาขา
- **§12 P6 (ไม่มีเจ้าของหนี้ค้าง)** — **ยกเลิก** prepaid ทำให้ไม่มีลูกหนี้
- **§14 A1 (Bill Payment)** — ยังถูกต้อง (ลบ step 7–13 + ลบ T+1) แต่ **ไม่ใช่ ROI สูงสุดของโครงการ**
- **§14 A5 (Dunning)** — **ยกเลิก**

### ➕ สิ่งที่โผล่ขึ้นมาแทน
- **Unearned Revenue / Deferred Revenue** — prepaid ⇒ เงินที่รับแล้วแต่ยังสอนไม่ครบ = หนี้สิน
  ERP ต้องรายงาน "มูลค่าชั่วโมงคงเหลือ" ให้ KMD ทุกเดือน ❓ ตอนนี้ใครทำ?
- **Invoice expiry / auto-void** — บิลที่ส่งแล้วไม่มีใครจ่าย ต้องหมดอายุ (แทน dunning)

---

## ❓ OPEN QUESTIONS — ยังต้องได้คำตอบ

1. **Shibasan = Nock หรือคนละคน?** (CLAUDE.md ระบุ Director/CEO = Nock)
2. **CEO approval — เคยปฏิเสธไหม? เกณฑ์คืออะไร?** ถ้าไม่เคย = พิธีกรรม → เปลี่ยนเป็น dashboard
3. **Teacher re-check ตรวจ field อะไรบ้าง?** (ชั่วโมง? หนังสือ? ราคา?)
4. **"Form" ที่ส่งบิล + รับสลิป คืออะไร?** Google Form / Google Sheet / เว็บของเราเอง
5. **จ่ายเกิน / จ่ายขาด / โอนรวมหลายคน** ทำยังไง
6. **ยกเลิกกลางคอร์ส** คืนเงินไหม · Invoice ที่ส่งผิดแก้ยังไง (void / credit note)
7. **บัญชีธนาคาร 4 บัญชี** แต่ละอันรับเงินอะไร
8. **Unearned revenue** ตอนนี้ใครคำนวณ
9. 🔥 **Admin ใช้เวลา 100 ชม./เดือน ไปกับอะไรบ้าง (% breakdown)** — ตัวนี้กำหนดว่าเราควร optimize อะไรก่อน
