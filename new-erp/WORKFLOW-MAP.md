# NockERP — Workflow Map & Automation Opportunities
> ประกอบจากบทสนทนา Discovery + Admin Interview (10 Jul 2026)
> บริษัท: **Liclass Education Co., Ltd.** (นิติบุคคลเดียว)
> สายธุรกิจ: `Liclass` (นร.ญี่ปุ่น) · `NA School` (นร.ไทย) · `NA App` (แอป)
>
> ⚠️ นี่คือ **AS-IS + TO-BE** ยังไม่ใช่ spec · ยังมี `❓` ที่รอคำตอบจาก Shibasan / KMD

---

## 🧭 หลักการจัดลำดับ

```
1. ELIMINATE  — งานนี้ควรมีอยู่ไหม?          ← ทำก่อนเสมอ
2. SIMPLIFY   — ถ้าต้องมี ทำให้สั้นลงได้ไหม?
3. AUTOMATE   — ถ้าสั้นสุดแล้ว ให้เครื่องทำได้ไหม?
4. ASSIST     — ถ้าเครื่องทำแทนไม่ได้ ช่วยมนุษย์ได้ไหม? (AI)
5. HUMAN      — ที่เหลือคือการตัดสินใจของคน
```

> **"Automate งานที่ไม่ควรมีอยู่ตั้งแต่แรก = ทำให้ของเสียเกิดเร็วขึ้น"**

---

# 📊 ภาพรวม — 18 Workflows ใน 4 Domain

| Domain | # | Workflow | ใครทำวันนี้ | สถานะ |
|---|---|---|---|---|
| **A. Master Data** | A1 | Customer / Student master | Admin (Google Sheet) | 🔴 ไม่มีระบบ |
| | A2 | Vendor master | Admin (Google **Doc**) | 🔴 ไม่มีระบบ |
| | A3 | Staff & Role assignment | — | 🟡 ERP มี แต่ model ผิด |
| **B. Order to Cash** | B1 | Fee accrual (Book/Bus/Exam) | ครู+Admin → Sheet | 🔴 ไม่มีระบบ |
| | B2 | Create Invoice | Master Admin | 🟡 ERP มี |
| | B3 | Teacher Re-check | ครู | 🔴 งานชดเชยความผิดพลาด |
| | B4 | Send Invoice | Admin → Webform | 🟡 Webform ยังเป็น prototype |
| | B5 | Receive Payment + Payslip | ผู้ปกครอง | 🔴 2 ช่องทาง |
| | B6 | Payment Verification (KBiz) | Admin | 🔴 มือ · T+1 |
| | B7 | Create + Send Receipt | Master Admin | 🟡 ERP มี |
| | B8 | Dunning (ทวงหนี้) | Admin → ครู | 🔴 ไม่มีเจ้าของ |
| **C. Procure to Pay** | C1 | Expense Request + Approval | ❌ **ยังไม่ใช้** | 🟡 ERP build แล้ว |
| | C2 | Payment Execution | Shibasan คนเดียว | 🔴 ไม่มี segregation |
| | C3 | Pay Voucher | Admin (เขียนมือ) | 🔴 20–30 ใบ/เดือน |
| | C4 | **WHT + 50 ทวิ** | Admin (เขียนมือ) | 🔴🔴 **เซ็นใบเปล่า** |
| | C5 | Petty Cash | Special Admin (Slack) | 🟡 ERP มี · imprest กำลังจะมา |
| | C6 | Overseas Payment (SaaS) | Shibasan / Admin | 🔴 Credit Advice · ❓ภ.พ.36 |
| | C7 | Recurring / Fixed Cost | Admin | 🟡 ERP มี |
| **D. Period Close** | D1 | Bank Statement Collection | Admin (4 บัญชี) | 🔴 มือ · โทรหา KBiz |
| | D2 | Statement Classification | Admin (ตาเปล่า) | 🔴 หัวใจของความวุ่นวาย |
| | D3 | Sales Tax Sheet | Admin (Sheet→Excel) | ❓ ยังไม่รู้ว่าคืออะไร |
| | D4 | Document Assembly → KMD | Admin (ปริ้น+จับชุด) | 🔴 มือ 100% |
| | D5 | Shibasan Approval | CEO | 🔴 คอขวด |

**Phase 2 (ยังไม่วิเคราะห์):** Staff Timesheet · Payroll · Visa · Work Permit

---

# 🔬 รายละเอียดแต่ละ Workflow + จุด Automation

---

## A1 · Customer / Student Master
**วันนี้:** ทุกอย่างอยู่ใน `customer management sheet` — ชื่อ, คอร์ส, Book, Bus, Exam, Lesson Fee
**ปัญหาราก:** *"เวลากวาดสายตาดู Sheet มันมึนงง เพราะตัวหนังสือมันเยอะ"* (C1.4)

| | |
|---|---|
| 🔴 **ELIMINATE** | Sheet ทั้งใบ — แทนด้วย Student/Family entity |
| 🤖 **AUTOMATE** | Lesson Fee = derive จาก Enrollment + Price Matrix (ไม่ต้องกรอก) |
| 👤 **HUMAN** | ตกลงราคาพิเศษ / ส่วนลด |

> **นี่คือ workflow ที่ต้องทำก่อนทุกอย่าง** — B1–B8 ทั้งหมดกินข้อมูลจากที่นี่

---

## A2 · Vendor Master
**วันนี้:** Google **Doc** (ไม่ใช่ Sheet ด้วยซ้ำ) · อัตรา WHT *"จำเอา"* (E1.6)

| | |
|---|---|
| 🤖 **AUTOMATE** | Vendor = `{ชื่อ, เลขผู้เสียภาษี, บุคคล/นิติบุคคล, ประเภทเงินได้, %WHT, เลขบัญชี}` |
| 🤖 **AUTOMATE** | เลือก vendor → ระบบรู้ทันทีว่าหักกี่ % → **ไม่ต้องจำ** |
| ✅ **ผลลัพธ์** | ตัดสาเหตุของ E2.8 (*ออก 50 ทวิ ใหม่เพราะจำนวนภาษีผิด*) |

---

## A3 · Staff & Role
**วันนี้:** *"บางสาขา Teacher ทุกคนก็เป็น Admin ได้"* (A6)
**ปัญหา:** ERP สมมติ `staff.role` = ค่าเดียว → **model ผิด**

| | |
|---|---|
| 🔧 **FIX** | `RoleAssignment(staff, branch, role)` — 1 คน หลาย role หลายสาขา |
| 🔧 **FIX** | `masterAdmin` เป็น *สิทธิ์ต่อสาขา* ไม่ใช่ *ยศของคน* |

---

## B1 · Fee Accrual — Book / Bus / Exam ⭐
**วันนี้:** ครู+Admin คุยกับผู้ปกครอง → จดลง Sheet → Admin ไปกวาดตาอ่านตอนออกบิล
**ผลลัพธ์:** ลืมค่าหนังสือ (C1.4) · ครูทักเรื่อง Bus บ่อยสุด (C2.3)

| | |
|---|---|
| 🆕 **ENTITY** | `BookIssuance` · `BusRegistration` · `ExamRegistration` |
| 🤖 **AUTOMATE** | เกิด event → รอเข้าบิลรอบถัดไปอัตโนมัติ (`unbilled charges`) |
| 👤 **HUMAN** | ครูกดบันทึกตอนแจกหนังสือ (10 วินาที) |
| ✅ **ผลลัพธ์** | **B3 (Teacher Re-check) หมดความจำเป็น** |

> 🔑 **นี่คือ workflow ที่มี leverage สูงสุดในฝั่งรายได้** — ไม่ใช่ตัว Invoice

---

## B2 · Create Invoice
**วันนี้:** 2–5 นาที/ใบ ถ้าข้อมูลครบ · ถ้าไม่ครบ = ไปตามถามครู/ผู้ปกครอง

| | |
|---|---|
| 🤖 **AUTOMATE** | Invoice = ประกอบเองจาก `Enrollment + unbilled charges + Promotion` |
| 🤖 **AUTOMATE** | ส่วนลดพี่น้อง / promotion คำนวณเอง (ERP มีแล้ว) |
| 👤 **HUMAN** | กดยืนยัน + แก้กรณีพิเศษ |
| 🎯 **เป้า** | 2–5 นาที → **< 30 วินาที** |

---

## B3 · Teacher Re-check 🗑️
**วันนี้:** ครูตรวจทุกใบ · 10 ใบ ทัก 1–2 ใบ · ทักเรื่อง Bus บ่อยสุด

| | |
|---|---|
| 🗑️ **ELIMINATE** | **หลังทำ B1 เสร็จ** — ครูคือ error-correction layer ของสเปรดชีต ไม่ใช่ผู้อนุมัติธุรกิจ |
| 📊 **KPI** | วัด `% invoice ที่ครูแก้` → ถ้าเข้าใกล้ 0% → ปิดด่านนี้ |
| ⚠️ **อย่าเพิ่งลบ** | ลบก่อนแก้ต้นเหตุ = บิลผิดหลุดถึงผู้ปกครอง |

---

## B4 · Send Invoice
**วันนี้:** Webform **ยังไม่มีจริง** (C3.3) — มีแต่ prototype

| | |
|---|---|
| 🤖 **AUTOMATE** | ส่งผ่าน LINE OA + Email อัตโนมัติเมื่อ Invoice ถูก issue |
| 🆕 **NEW** | **Payment Portal** = หน้าเดียวที่แสดงบิล + QR + ปุ่มดูใบเสร็จ |
| 📊 **TRACK** | `invoice.viewed` — วันนี้ไม่รู้ว่าผู้ปกครองเปิดอ่านหรือยัง |

---

## B5 · Receive Payment + Payslip 🔥
**วันนี้:** ผู้ปกครองโอนธรรมดา → ส่งสลิปทาง Webform/LINE → Admin เก็บลงเครื่องส่วนตัว (C3.4)

| | |
|---|---|
| 🥇 **ELIMINATE** | **Bill Payment (Ref1=Invoice No, Ref2=Student ID)** → statement รู้เองว่าเงินเป็นของบิลไหน |
| 🗑️ **ผลพลอยได้** | **สลิปไม่จำเป็นอีกต่อไป** — สลิปมีอยู่เพราะระบบจับคู่เงินไม่ได้ |
| 🤖 **ระหว่างเปลี่ยนผ่าน** | LINE OA → forward สลิปเข้า ERP อัตโนมัติ (เลิกเก็บในเครื่องส่วนตัว) |
| 🧠 **AI ASSIST** | OCR สลิป · ตรวจสลิปซ้ำ (hash) |

---

## B6 · Payment Verification 🔥🔥
**วันนี้:** รอ T+1 → เปิด KBiz → ไล่ทีละชื่อ **2 นาที/รายการ** (C3.5)
**เคสยาก:** ชื่อผู้โอนไม่ตรง → ดูนามสกุล / เช็ค LINE OA (C4.3)

| | |
|---|---|
| 🗑️ **ELIMINATE** | หลังทำ B5 (Bill Payment) → **workflow นี้หายไปทั้งอัน** |
| ⏱ **T+1 หายด้วย** | Bill Payment มี real-time notification ⇒ ยืนยันเงินเข้าทันที |
| 🤖 **ถ้ายังทำไม่ได้** | import statement (CSV) → auto-suggest คู่ที่ตรง → Admin กดยืนยัน |
| 🧠 **AI ASSIST** | fuzzy matching เมื่อชื่อผู้โอน ≠ ชื่อผู้ปกครอง (ดูนามสกุล / ประวัติ) |
| 👤 **HUMAN** | เคสกำกวมจริงๆ เท่านั้น |

### เคสพิเศษที่ต้องมี entity รองรับ
| เคส | ต้องมี |
|---|---|
| จ่ายเกิน → เก็บเป็นส่วนลดบิลหน้า (C4.1) | 🆕 `CustomerCredit` |
| จ่ายขาด → โอนเพิ่ม = multi payslip | 🆕 `PaymentAllocation` (1 INV ← n Payment) |
| แม่โอนรวมลูก 2 คน (C4.2) | 🆕 `PaymentAllocation` (1 Payment → n INV) |

---

## B7 · Create + Send Receipt
**วันนี้:** ต้องรอ KBiz ยืนยัน → สร้างมือ → ส่ง LINE OA
**⚠️ ปัญหา:** เลขใบเสร็จ *"เรียงตามการโอนก่อน-หลัง"* · ใบแจ้งหนี้ *"เรียงตามตัวอักษร"* (C5.2)

| | |
|---|---|
| 🤖 **AUTOMATE** | เงินเข้ายืนยันแล้ว → **สร้าง + ส่ง Receipt เอง ไม่ต้องมี Admin** |
| 🔧 **FIX** | เลขเอกสารต้อง **รันต่อเนื่อง** (ERP มี `FIN.nextDocNumber()` แล้ว) ❓ยืนยันกับ KMD |
| ✅ | ลายเซ็น Master Admin ใส่อัตโนมัติ (ERP มี `staff.signature`) |

---

## B8 · Dunning
**วันนี้:** ไม่จ่าย 2–3 วัน → Admin ทวง → นานกว่านั้น ครูทวง (C4.8) · **ไม่มี rule เขียนไว้**

| | |
|---|---|
| 🤖 **AUTOMATE** | overdue → เตือนผู้ปกครองอัตโนมัติ + สร้าง task ให้ Admin |
| 👤 **HUMAN** | ตัดสินใจ "ไม่ให้เรียนต่อ" |
| ❓ **ต้องนิยาม** | payment term กี่วัน · ใครเป็นเจ้าของ · escalate เมื่อไหร่ |
| 📝 **หมายเหตุ** | prepaid ⇒ ความเสี่ยงต่ำ แต่ **มีอยู่จริง** ไม่ใช่ศูนย์ |

---

## C1 · Expense Request + Approval
**วันนี้:** ❌ **ยังไม่ใช้เลย — จ่ายตรง 100%** (D2) · Request มาทาง **Slack**

| | |
|---|---|
| 🔑 **RULE** | **ทุกบาทที่ออกจากบัญชี Outcome ต้องมี Request ก่อนเสมอ** |
| ✅ **ERP มีแล้ว** | `fin-requests.js` (Direct Pay / Petty Top-up) + `fin-reimburse.js` |
| ⚠️ **ปัญหาไม่ใช่ซอฟต์แวร์** | เป็น **change management** — ต้องให้คนเลิกใช้ Slack |
| 🤖 **AUTOMATE** | approval tier ตามวงเงิน (ERP มีแล้ว: 1k/3k/5k) |

> 🔑 กฎข้อเดียวนี้ทำให้ **D2 (Statement Classification) หายไปทั้ง workflow**

---

## C2 · Payment Execution 🚨
**วันนี้:** *"ชิบะซังคนเดียว"* กดเงินออกได้ (B7) · จ่ายเองได้เลย *"กี่รายการก็ได้ แล้วแต่เขา"* (B8)
**ผลลัพธ์:** Admin เจอรายการปริศนาใน statement → *"ถามใน Slack ว่าเป็นรายจ่ายของใคร"* (B9)

| | |
|---|---|
| 🚨 **CONTROL GAP** | ไม่มี segregation of duties — ผู้อนุมัติ = ผู้จ่าย = คนเดียวกัน |
| 🔧 **FIX** | CEO ก็ต้องสร้าง Request เหมือนคนอื่น (หรืออย่างน้อย **บันทึกย้อนหลังทันที**) |
| 🗑️ **ELIMINATE** | *"ถาม Slack ว่ารายจ่ายของใคร"* — งานนี้ไม่ควรมีอยู่ |
| 👤 **HUMAN** | การอนุมัติจ่ายจริง |

---

## C3 · Pay Voucher
**วันนี้:** **เขียนด้วยมือ 20–30 ใบ/เดือน × 5 นาที ≈ 2 ชม.** · ต้นฉบับให้ KMD สำเนาเก็บเอง (D5, D6)

| | |
|---|---|
| 🤖 **AUTOMATE** | Voucher = สร้างจาก Request + Payment อัตโนมัติ (PDF) |
| 🗑️ **ELIMINATE** | *"ต้นฉบับ + สำเนา + สแกน"* — ถ้า KMD รับไฟล์ได้ ❓ต้องถาม |
| ✅ **ประหยัด** | ~2 ชม./เดือน + กระดาษ + การสแกน |

---

## C4 · WHT & 50 ทวิ 🚨🔥
**วันนี้:**
- 32 รายการ (มิ.ย.) · เขียนมือ 5 นาที/ใบ ≈ **2.5 ชม./เดือน** (E1.1, E2.2)
- อัตราหัก **"จำเอา"** (E1.6)
- เลขที่หนังสือรับรอง **"ไม่เคยรัน"** (E2.3)
- 🚨 **"ให้ชิบะเซ็นใบเปล่าก่อนทีเดียว แล้วค่อยมาเขียนเองทีหลัง"** (E2.5)
- ส่ง vendor ทาง **ไปรษณีย์** · โดนทวงบ่อย · เคยออกใหม่เพราะ **จำนวนภาษีผิด** (E2.7, E2.8)
- 💸 **เดือนนี้โดนค่าปรับ** (E3.3)

| | |
|---|---|
| 🚨 **CONTROL GAP** | **ลายเซ็นบนกระดาษเปล่า + ไม่มีเลขคุม** = ความเสี่ยงร้ายแรง ❓ต้องถาม KMD ทันที |
| 🥇 **ELIMINATE ทั้ง workflow** | **e-Withholding Tax ผ่านธนาคาร** → ธนาคารหัก+นำส่งเอง → **ไม่ต้องออก 50 ทวิ ไม่ต้องเซ็น ไม่ต้องส่งไปรษณีย์** |
| 🤖 **ถ้า e-WHT ทำไม่ได้** | Vendor master → คำนวณเอง → generate 50 ทวิ (PDF) → digital signature → เลขรันอัตโนมัติ → ส่งอีเมล |
| ✅ **Digital signature ถูกกฎหมาย** | ข้อหารือ กค 0702/1057 — ไม่ต้องเซ็นมือ (❓ยืนยันกับ KMD) |
| 📌 **สำคัญ** | **WHT ไม่ใช่ module — เป็น attribute ของการจ่ายเงิน** |

---

## C5 · Petty Cash
**วันนี้:** Request ผ่าน **Slack** → Special Admin รวบยอด → Shibasan approve
**Idea ของ Shibasan:** auto top-up ให้ balance = **10,000 ทุกสาขาทุกเดือน** (D3)

| | |
|---|---|
| ✅ **เห็นด้วย** | นี่คือ **imprest system** มาตรฐาน — ถูกต้องตามหลักบัญชี |
| 🗑️ **ELIMINATE** | Petty Top-up Request หายไปทั้งประเภท (เติมอัตโนมัติ) |
| 🤖 **AUTOMATE** | ยอดเติม = 10,000 − balance ปัจจุบัน (ERP มี `FIN.pettyBudget(branch)` แล้ว) |
| 🧠 **AI ASSIST** | OCR ใบเสร็จ → กันเคส *"เลข Usage ไม่ตรงกับ Payslip"* (D4) |

---

## C6 · Overseas Payment (Zoom / Gather / Figma / Claude)
**วันนี้:** โอนออกผ่านธนาคาร → ได้ **Credit Advice** → *"ไม่มั่นใจว่าทำไมต้องโทรหา KBiz"* (B4)

| | |
|---|---|
| 🗑️ **ELIMINATE?** | *"โทรหา KBiz"* — ไม่มีใครรู้ว่าทำไปทำไม → **ถามธนาคาร** |
| 🤖 **AUTOMATE** | เป็น `Recurring` subscription → รู้ล่วงหน้า ไม่ต้องมาเจอใน statement |
| ❓ **ต้องถาม KMD** | ภ.ง.ด.54? · **ภ.พ.36** (VAT นำส่งแทนผู้ให้บริการต่างชาติ)? |
| ⚠️ **ผูกกับ VAT** | ถ้าบริษัทจด VAT → ต้องยื่น ภ.พ.36 เอง |

---

## C7 · Recurring / Fixed Cost
**รายการจริง (D9):** ค่าเช่าที่ · น้ำ · ไฟ · เน็ต · โทรศัพท์ · Fujifilm · JOBCAN · ค่าเช่ารถตู้ · กยศ · KMD · ค่าโฆษณา

| | |
|---|---|
| 🤖 **AUTOMATE** | schedule → auto-create Request ก่อนถึงกำหนด (ERP มี `fin-recurring.js`) |
| 🔧 | ค่าเช่า → WHT 5% · ค่าโฆษณา → 2% · **ผูกกับ Vendor master (A2)** |
| ⚠️ **ตรวจสอบ** | น้ำ/ไฟ จ่าย**ผู้ให้เช่า** (E1.4) → ❓ประเภทเงินได้อะไร ต้องหัก WHT ไหม |

---

## D1 · Bank Statement Collection
**วันนี้:** โหลด PDF จาก 4 บัญชี + Credit Advice (ต้องโทรขอ)

| | |
|---|---|
| 🤖 **AUTOMATE** | Bank API / auto-import CSV |
| ❓ **ถามธนาคาร** | มี API ไหม · ได้ CSV ไหม (ไม่ใช่ PDF) · ทำไม Credit Advice ต้องโทร |

---

## D2 · Statement Classification 🔥 หัวใจของความวุ่นวาย
**วันนี้:** Admin อ่าน statement ทีละบรรทัด → ตัดสินว่าเป็น *ค่าเรียน / Bill ตปท. / ค่าใช้จ่าย Shibasan* → กระจายลง Sheet หลายใบ

| | |
|---|---|
| 🗑️ **ELIMINATE ทั้ง workflow** | ถ้า **C1 (Request ก่อนจ่าย)** + **B5 (Bill Payment ref)** สำเร็จ |
| | statement เปลี่ยนจาก *"ต้องตีความ"* → เป็น *"แค่ยืนยัน ✅/❌"* |
| 🤖 **AUTOMATE** | auto-reconcile: statement line ↔ Request / Invoice |
| 👤 **HUMAN** | เฉพาะรายการที่ match ไม่ได้ (ควรเหลือ ~0) |

```
วันนี้:   statement → 👤 ตีความ → Sheet หลายใบ
เป้าหมาย: Request/Invoice (รู้ล่วงหน้า) → จ่าย/รับ → statement ยืนยัน ✅
```

---

## D3 · Sales Tax Sheet
**สถานะ:** ❓ **ยังไม่รู้ว่าคืออะไร — ค้าง 4 รอบแล้ว**
เป็นหลักฐานว่าบริษัท**น่าจะ**จด VAT (Co., Ltd. + NA App = digital service)

| | |
|---|---|
| ⛔ **หยุด** | ห้ามออกแบบจนกว่าจะรู้สถานะ VAT |
| 🤖 **ถ้าจด VAT** | รายงานภาษีขาย = derive จาก Invoice + `taxCode` ต่อ line item |
| 🗑️ | Google Sheet → Excel → merge all-branch = **หายทั้งหมด** |

---

## D4 · Document Assembly → KMD
**วันนี้:** ปริ้น Invoice + Receipt + Payslip → จับเป็นชุด → รวมกับ Voucher + 50 ทวิ (ใบฟ้า+เหลือง) → ส่ง KMD

| | |
|---|---|
| 🤖 **AUTOMATE** | Document vault — เอกสารผูกกับ transaction ตั้งแต่เกิด ไม่ต้องมาจับชุดทีหลัง |
| 🤖 **AUTOMATE** | Monthly export package (1 ปุ่ม) |
| ❓ **ถาม KMD** | รับไฟล์ดิจิทัลได้ไหม · อยากได้ฟอร์แมตไหน |
| ✅ | ถ้ารับไฟล์ได้ → **ปริ้น + จับชุด + ส่งของ หายทั้งหมด** |

---

## D5 · Shibasan Approval 🚨
**วันนี้:** CEO เปิดไฟล์ทีละไฟล์ → reject เพราะ *"ข้อมูลไม่ครบ / รายละเอียดไม่ตรง"*
**แต่:** ตอนเซ็น 50 ทวิ กลับ **เซ็นใบเปล่า** ⇒ approval ไม่สม่ำเสมอ

| | |
|---|---|
| 🔧 **เปลี่ยนโมเดล** | จาก **approve by volume** → **approve by exception** |
| 🤖 **AUTOMATE** | validation rules ตรวจ *"ครบ/ไม่ครบ"* ก่อนถึง CEO |
| 👤 **HUMAN** | CEO เห็นเฉพาะรายการผิดปกติ + dashboard ภาพรวม |
| 🔥 **ต้องการ** | **เหตุผล reject 10 ครั้งล่าสุด** = validation rule 10 ข้อ |

---

# 🎯 สรุป — Automation Leverage เรียงตาม ROI

| อันดับ | Lever | ลบ/ลด workflow อะไร | ต้องเขียนโค้ดไหม |
|---|---|---|---|
| 🥇 **1** | **Bill Payment (Ref1/Ref2)** | B5 (สลิป) · B6 (matching + T+1) · ครึ่งหนึ่งของ D2 | ❌ **คุยกับธนาคาร** |
| 🥈 **2** | **e-Withholding Tax** | C4 เกือบทั้งหมด (50 ทวิ · เซ็น · ไปรษณีย์ · ค่าปรับ) | ❌ **คุยกับธนาคาร + KMD** |
| 🥉 **3** | **"ไม่มี Request = ไม่มีเงินออก"** | D2 (statement classification) ทั้งหมด | ⚠️ **change management** |
| 4 | **Master Data** (A1 + A2) | ต้นเหตุของ B1, B3, C4 (จำเอา) | ✅ |
| 5 | **Fee Accrual entities** (B1) | B3 (Teacher Re-check) | ✅ |
| 6 | **Validation Rules** | D5 (CEO reject loop) | ✅ |
| 7 | **Imprest Petty Cash** | Petty Top-up Request ทั้งประเภท | ✅ (ง่าย) |
| 8 | **Document Vault + Export** | D4 (ปริ้น จับชุด ส่งของ) | ✅ |

> 🔑 **3 อันดับแรก ไม่ต้องเขียนโค้ดเลย** — เป็นการเจรจากับธนาคาร, สำนักบัญชี, และคนในบริษัท
> ถ้าทำ 3 ข้อนี้ได้ **workflow หายไปประมาณ 40% ก่อนที่ ERP จะเขียนบรรทัดแรกด้วยซ้ำ**

---

# 🤖 สิ่งที่ AI ช่วยได้ (และสิ่งที่ไม่ควรให้ AI ทำ)

| ✅ AI เหมาะ | ❌ AI ไม่เหมาะ |
|---|---|
| OCR ใบเสร็จ / สลิป | ตัดสินใจอนุมัติจ่ายเงิน |
| Fuzzy matching ชื่อผู้โอน | คำนวณอัตราภาษี (ต้อง deterministic) |
| ตรวจสลิปซ้ำ / สลิปปลอม | ตัดสินว่าใครไม่ได้เรียนต่อ |
| Anomaly detection ใน statement | สร้างเอกสารภาษี |
| ทำนายว่าครอบครัวไหนจะไม่ต่อคอร์ส | |
| Draft course-end summary | |

> **กฎ: ภาษีและเงิน = deterministic เสมอ** AI ใช้ได้เฉพาะ *ชี้เป้า* ไม่ใช่ *ตัดสิน*

---

# ⛔ 3 เรื่องที่ต้องแก้ก่อนเขียนโค้ด

1. 🚨 **การเซ็น 50 ทวิ ใบเปล่า** (E2.5) + ไม่มีเลขคุม (E2.3) → ถาม KMD ถึงความเสี่ยง
2. 🚨 **CEO อนุมัติ + จ่ายเงิน + ไม่บันทึก** (B7/B8/B9) → ไม่มี segregation of duties
3. ❓ **สถานะ VAT** → บล็อกอยู่ 3 workflow (D3, C6, และ tax code บน Invoice)

**ทั้ง 3 ข้อ ไม่ใช่ปัญหาซอฟต์แวร์** — และ ERP ที่สร้างทับปัญหาพวกนี้ จะทำให้มัน*ถาวร*ขึ้น ไม่ใช่หายไป
