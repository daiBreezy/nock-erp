# NockERP — Business Rules (Academy)

> ย้ายจาก CLAUDE.md เพื่อลด context/credit · อ่านไฟล์นี้ก่อนแก้ business logic ของ Academy

## 9. Business Rules ⭐

### Attendance & Consumption
```
Present            → หัก 1 session
Absent (no notice) → หัก 1 session
Leave (in quota)   → ไม่หัก
Leave (over quota) → หัก 1 session (leave_over)
Transfer           → ไม่หัก — Enrollment ย้ายตามนักเรียนไปด้วย
Reschedule         → ไม่หัก — ย้าย session ไปวัน/เวลาใหม่
```

### Leave Quota (สำคัญมาก)
```
Leave Quota = hours_total ÷ 8

Package 24h  → 3 leaves
Package 48h  → 6 leaves
Package 72h  → 9 leaves
Package 96h  → 12 leaves

เกิน quota → status เปลี่ยนเป็น 'leave_over' → หักชั่วโมง
```

### Reschedule Flow
```
1. Parent แจ้ง Admin ว่าจะขาด
2. Admin เปิด Calendar ดู slot ที่ว่างใน week นั้น
3. Admin บอก Parent ว่า "ย้ายได้วันไหนบ้าง"
4. Parent + Admin ตกลงกัน
5. Admin ย้ายนักเรียนไป Session ใหม่
6. Session เดิม → status: 'reschedule' (ไม่หักชั่วโมง)

⚠️ Admin ต้องเห็น Calendar ก่อนตอบ Parent เสมอ
```

### Transfer Flow
```
Transfer เกิดขึ้นเมื่อ:
  A) ย้ายสาขา  (Sukhumvit → Silom)
  B) ย้ายครู   (Kru Bee → Kru Arm)

สิ่งที่เกิดขึ้น:
  - Session นั้น → status: 'transfer' → ไม่หักชั่วโมง
  - Enrollment (hours ที่เหลือ) → ย้ายตามนักเรียนไปด้วย ✅
  - Admin → Assign นักเรียนเข้า Class ใหม่ที่สาขา/ครูใหม่
```

### Summary Rules
```
- ครูเขียน Summary แยกต่อนักเรียน (6 คน = 6 summaries)
- 1 Session ที่มี 6 นักเรียน → ครูต้องเขียน 6 summaries

⭐ Approval Flow (revised 11 Jun 2026):
  ครูเขียน → Submit for Approval → Admin/Manager Approve → ส่ง Parent
  - ผู้มีสิทธิ์ approve: Admin ทุกคน (Master+Normal) / Manager / Director
  - Admin/Manager กด [Send Back] ได้ → กลับเป็น draft ของครู
  - data shape: summaries[name] = {text, submitted:bool, sent:bool, approvedBy}

- Summary หลัง sent = immutable (ต้อง delete + resend)
- AI Assist ช่วย draft ได้ → ครูต้องแก้ก่อน submit
```

### Student Status (4 values)
```
active   → เรียนปกติ (sessions > 2)
renewal  → sessions ≤ 2 (badge 🟡 yellow) / sessions ≤ 1 (badge 🔴 red — urgent visual)
pause    → Auto: sessions = 0 / Manual: Admin กด (เช่น ไปต่างประเทศ)
archived → Manual: ลาออกถาวร (Restore ได้ → Active)
```
ไม่มี status = 'urgent' — ใช้ renewal + sessionsLeft เป็น visual sub-state

### Renewal
```
sessionsRemaining = 2 → status 'renewal' · badge 🟡 yellow
sessionsRemaining = 1 → status 'renewal' · badge 🔴 red (urgent visual)
sessionsRemaining = 0 → status 'pause' (auto)
Renewal = Enrollment ใหม่เสมอ (ไม่ extend เดิม)
Class Assignment หลัง Renewal = ขึ้นอยู่กับ Parent
  → ต้องการ Class เดิม: Admin ไม่ต้องทำอะไร (อยู่ใน Class เดิมต่อ)
  → ต้องการ Class ใหม่: Admin re-assign
```

### CRM Lead Flow ⭐ (แก้ให้ตรง prototype · 13 Jul 2026)
```
Kanban 5 คอลัมน์ (ไม่ใช่ 8 stage):
Contact → Test schedule → Trial schedule → Billing → (= Customer)
                                                    └ Archived (แยก)

หน่วยของการ์ด:
  Contact       = ระดับ FAMILY (relationship: Mom/Dad/Aunt · source: Walk-In/Referral/New)
  Test/Trial/Billing = ระดับ STUDENT รายคน (แตกจาก family)
  ⇒ สอดคล้อง Invoice = ราย Student (LOGIC-SPEC-06)

Test  = วัดระดับ (placement) → output = เด็กควรเข้า class ไหน
        (ป.5 พื้นไม่แน่น → ครูจัดไปอยู่ class ป.4) → เชื่อมเข้า Class Assignment
Trial = ทดลองเรียนจริง 1 คาบ (isTrial:true → ไม่ consume hours)

⚠️ Test/Trial = ขั้นตอน OPTIONAL — ข้ามได้ทั้งคู่ · มาถึง Create Invoice เลยก็ได้
   (pipeline ไม่ใช่ด่านบังคับ — lead กระโดดเข้า Billing ตรงได้)

Billing column = พร้อมจ่าย → ปุ่ม Create invoice → จ่ายเสร็จ = Customer
Archived = drop ได้ทุกคอลัมน์ → บันทึก archivedFrom · Restore ได้
สถานะย่อย (Add / Done ✓) อยู่ในการ์ด ไม่ใช่คอลัมน์แยก
```

### CRM Form System
```
Form Types: Test Form | Trial Form | Enrollment Form

ส่งได้จาก:
  - Inbox thread → ปุ่ม [Send Form]
  - Pipeline card → ปุ่ม [Send Form]

Link = Unique per submission (token 7 วัน)
  → รู้ว่าส่งให้ lead ไหน, ส่งโดยใคร, สาขาไหน

Submission Notification = 2 ที่พร้อมกัน:
  → Inbox: "📋 Form submitted"
  → Pipeline card: badge "⏳ Pending Approval"

Admin Action:
  [Approve] → สร้าง records ทันที
  [Edit]    → แก้ใน ERP + คุยกับ Parent ใน Inbox → Approve

Enrollment Form = Stepper (5 steps)
  Step 1: Family Info | Step 2: Course+Package
  Step 3: Class selection | Step 4: Payment+Payslip
  Step 5: Summary + Submit

Returning Parent: Pre-fill อัตโนมัติ + [+Add Student] [+Add Parent]
```

### Branch Setup (เปิดสาขาใหม่)
```
Step 1: Branch Info      → ชื่อสาขา, ที่อยู่, เบอร์โทร, Line OA
Step 2: Rooms            → จำนวนห้อง (ตัวเลข — ใช้เช็ค concurrent class limit)
Step 3: Staff Assignment → เลือกครูมาสาขา + Subject ผูกมากับครูอัตโนมัติ
Step 4: Operating Days   → เลือกวันเปิดทำการ (default 5 วัน/สัปดาห์)
Step 5: Time Slots       → กำหนด slots + blocked periods ของสาขานี้ (flexible)
Step 6: Package Pricing  → ตั้งราคา 24h / 48h / 72h / 96h เฉพาะสาขา
Step 7: Calendar Template → วาด Teacher × Time Slot grid ต่อ day-of-week

เปิดสาขาได้ทันทีหลัง setup — ไม่มี minimum checklist
```

### Calendar & Class Template
```
Calendar Template = ตาราง Teacher (rows) × Time Slot (cols)
  → แยกต่อ Day of Week — 7 แผ่น/สาขา (จันทร์ ≠ อังคาร ≠ พุธ...)
  → สัปดาห์ถัดไป = Template เดิมซ้ำ (weekly repeat)
  → แต่ละ Cell = 1 Class (Teacher + Subject + Time Slot + Day)
  → Grade เริ่มจาก Grade เดียว → add Grade ต่างได้ (auto-rename: P.5 → P.5-6)

Class Rules:
  → Soft limit: 6 students/class (warn แต่ไม่ block)
  → Concurrent classes ≤ room_count ของสาขา (ถ้าเกิน = ERROR)
  → Teacher conflict ข้ามสาขา: วันเดียว + เวลาเดียว = ERROR

Session Generation (weekly):
  → Generate เฉพาะนักเรียนที่ยัง hours เหลืออยู่
  → นักเรียนหมด hours → ไม่ generate → หายจาก Calendar สัปดาห์ถัดไป

Student Assignment Suggestion:
  → เรียงจาก Grade ตรงก่อน
  → เรียงจาก Class ที่มีที่ว่างมากสุด (ascending students count)
```

### Holiday Management
```
Director เท่านั้น → add / edit / delete holidays (company-wide ทุกสาขา)
Admin             → view เท่านั้น + ตอบสนองเมื่อ holiday ชนกับ class

เมื่อ Class ชนกับ Holiday:
  System alert Admin → Admin เลือก:
    A) ย้าย Session → one-time exception เฉพาะ week นั้น
                      Template วันปกติสัปดาห์ถัดไปยังคงเดิม
    B) ข้าม Week   → ยกเลิก session นั้น ไม่หักชั่วโมง
```

### Session Flow
```
Upcoming → Start → Active → End → Summary Pending
→ Summary Written (per student) → Submit → Awaiting Approval
→ Admin/Manager Approve → Summary Sent → Closed
Summary หลัง sent = immutable (ต้อง delete + resend)
```

### Bundle Attendance Rules
```
Bundle ไม่มี Reschedule และไม่มี Leave Quota
ขาด = Absent → ไม่หักชั่วโมง (Bundle ไม่นับ hours แบบ Regular)
บันทึก attendance ปกติ — แต่ไม่มี make-up class
อนาคต: อาจเพิ่ม rule เพิ่มเติมสำหรับ Bundle
```

### Course End Summary ⭐
```
Trigger:
  Auto: enrollment hours = 0 (Regular) หรือ block หมด (Bundle)
  Manual: Admin / Manager / Teacher กด "Create Course End Summary"

Workflow:
  [Teacher creates] → draft → Teacher approve → sent to Parent
  [Admin/Manager creates] → draft → pending_teacher_review
                          → Teacher reviews + confirms → sent to Parent
  Teacher confirmation = required เสมอ (ข้อมูลต้องมาจาก Teacher)

Content:
  Regular (1 subject): session summaries ทั้งหมดของ subject นั้น + teacher notes
  Bundle (n subjects): แยก section ต่อ subject — แต่รวมใน 1 document

Output:
  - View ใน ERP (read-only page)
  - PDF ที่ download / share ได้
  - ส่งผ่าน Inbox ไปยัง Parent

Status flow:
  draft → pending_teacher (ถ้าสร้างโดย Admin/Manager)
        → approved (Teacher confirm)
        → sent (ส่ง Parent แล้ว)
  sent = immutable
```

### Healthy Status Formula ⭐
```
Effective Load = Σ (จำนวน students ใน class แต่ละ class ที่ครูสอน week นั้น)

ตัวอย่าง:
  ครู A: 4 classes × 6 students = 24 load  → Warning
  ครู B: 4 classes × 2 students = 8 load   → Healthy
  ครู C: 2 classes × 6 students = 12 load  → Healthy

Thresholds (ปรับได้ใน Settings → Capacity):
  Healthy : effectiveLoad ≤ 20   (green)
  Warning : 21 ≤ load ≤ 30       (yellow)
  Danger  : load > 30            (red)

Display: '{classes}/wk · avg {avg}/class'
ทำไมต้องคิดแบบนี้:
  1 class × 1 student = เขียน 1 summary → เบา
  1 class × 6 students = เขียน 6 summaries → หนัก
  ดังนั้น student count per class ส่งผลต่อ workload จริง
```

### Billing
```
Course display: '[Subject] [Grade] · [Hours]h.'  เช่น 'Math ป.5 · 24h.'

Invoice Status Flow:
  draft → sent → pending_verification → paid
  (ไม่มี 'rejected' — ถ้าผิด Admin แก้ใน draft แล้วส่งใหม่)

Invoice Creator:
  Master Admin ของสาขาเท่านั้น (adminTier = 'master') — สร้าง Invoice + Receipt ได้
  Signature ของ Master Admin → ใส่ลงบน INV + Receipt อัตโนมัติ
  ไม่มี Director signature บน INV/Receipt

Invoice Creation Entry Points:
  A) Inbox thread → ปุ่ม [New Invoice] ใน thread actions
  B) CRM Pipeline card → ปุ่ม [Create Invoice] ตอน stage = payment_pending
  C) Billing page → ปุ่ม [New Invoice] ใน page header

Invoice ↔ Enrollment Link (สำคัญ):
  Invoice.enrollmentId → Enrollment ที่ซื้อ
  Invoice.studentId    → Student ที่ซื้อ
  Invoice.packageId    → Package ที่เลือก (24h/48h/72h/96h)
  Invoice.subjects[]   → วิชาที่รวมใน package นี้

Auto-Draft Trigger (Renewal):
  sessionsRemaining ≤ 2 → system สร้าง draft invoice อัตโนมัติ
  → notification ไป Admin: "Mia Tanaka — Renewal Invoice draft ready"

Receipt:
  หลัง Admin เปลี่ยน status → 'paid' → system generate Receipt
  Receipt = read-only version of Invoice + timestamp confirmed

Renewal:
  Invoice ใหม่ต่อ Enrollment ใหม่เสมอ (ไม่ extend เดิม)
  1 Renewal = 1 Invoice = 1 Enrollment record ใหม่
```

---
