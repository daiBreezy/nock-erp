# NockERP — FLOWS.md
> Business Logic State Machines & Process Flows
> Claude อ่านไฟล์นี้เพื่อเข้าใจ business rules และ state transitions ทั้งหมด

---

## 1. Session State Flow

```
[upcoming] ──── Start Class ────► [active]
                                      │
                                 Check-In done
                                      │
                                      ▼
                                  [teaching]
                                      │
                                 Teacher Check-Out
                                      │
                                      ▼
                                   [ended]
                                      │
                              ┌───────┴───────┐
                         auto-trigger    teacher writes
                              │                │
                              ▼                ▼
                     [summary_pending]  [summary_written]
                                              │
                                        Translate (optional)
                                        AI Assist (optional)
                                              │
                                              ▼
                                      [summary_sent]
                                              │
                                   Saved to 3 places:
                                   • Inbox thread
                                   • Student Timeline
                                   • Session log
                                              │
                                              ▼
                                      [closed] ✓
```

### Session states in DB
```javascript
session.state values:
  'upcoming'         // ยังไม่เริ่ม — แสดงใน Calendar
  'active'           // กำลังเรียน — Check-In phase
  'ended'            // จบแล้ว รอ summary
  'summary_pending'  // รอครูเขียน summary
  'summary_written'  // ครูเขียนแล้ว รอส่ง
  'summary_sent'     // ส่ง parent แล้ว
  'closed'           // ปิด session สมบูรณ์
```

### Attendance per session student
```
session.attendance[studentName] = 'present' | 'absent' | 'leave' | 'reschedule' | 'transfer'
```

---

## 2. Attendance Deduction Rules

```
┌─────────────────┬──────────────┬──────────────────────────────────┐
│ Status          │ Deduct Hour? │ Notes                            │
├─────────────────┼──────────────┼──────────────────────────────────┤
│ present         │ ✅ YES        │ เรียนปกติ                        │
│ absent          │ ✅ YES        │ ขาดโดยไม่แจ้ง                   │
│ leave           │ ❌ NO         │ ลาล่วงหน้า (ภายใน quota)        │
│ leave_over      │ ✅ YES        │ ลาเกิน quota → หักเหมือน absent  │
│ reschedule      │ ❌ NO         │ เลื่อนวัน → ย้าย session ใหม่   │
│ transfer        │ ❌ NO         │ ย้ายสาขา/ครู → Enrollment ย้ายตาม│
└─────────────────┴──────────────┴──────────────────────────────────┘
```

### Leave Quota — คำนวณจาก Package
```
Leave Quota = hours_total ÷ 8

Package 24h  → quota = 3 leaves
Package 48h  → quota = 6 leaves
Package 72h  → quota = 9 leaves
Package 96h  → quota = 12 leaves

Logic:
  enrollment.leaves_used < enrollment.leave_quota
    → status = 'leave'      → ไม่หัก
  enrollment.leaves_used >= enrollment.leave_quota
    → status = 'leave_over' → หัก (เหมือน absent)
```

### Code reference: `CONST.ATTENDANCE_META`
```javascript
CONST.ATTENDANCE_META = {
  present:    { deduct: true,  cls: 'badge-green',  label: 'Present'     },
  absent:     { deduct: true,  cls: 'badge-red',    label: 'Absent'      },
  leave:      { deduct: false, cls: 'badge-yellow', label: 'Leave'       },
  leave_over: { deduct: true,  cls: 'badge-red',    label: 'Leave (over quota)' },
  reschedule: { deduct: false, cls: 'badge-blue',   label: 'Reschedule'  },
  transfer:   { deduct: false, cls: 'badge-gray',   label: 'Transfer'    },
}

// Check via:
Utils.shouldDeduct(attendanceStatus) // → true | false
```

---

## 2b. Reschedule Flow

```
Parent แจ้ง Admin ว่าจะขาด
        │
        ▼
Admin เปิด Calendar
        │
        ▼
Admin ดู slot ที่ว่างใน week เดียวกัน
(Calendar แสดงเฉพาะ slot ที่ครูสอนจริง)
        │
        ▼
Admin บอก Parent ว่า "ย้ายได้วันไหน เวลาไหนบ้าง"
        │
        ▼
Parent + Admin ตกลงกัน → Confirm
        │
        ▼
Admin ย้ายนักเรียนไป Session ใหม่
        │
        ├── Session เดิม → attendance: 'reschedule' (ไม่หักชั่วโมง)
        └── Session ใหม่ → นักเรียนถูก add เข้า roster

⚠️ Admin ต้องเห็น Calendar ก่อนตอบ Parent เสมอ
⚠️ ถ้า slot ที่ต้องการเต็ม → ต้องหา slot อื่น หรือข้าม week
```

---

## 2c. Transfer Flow

```
Transfer เกิดขึ้นเมื่อ:
  A) นักเรียนย้ายสาขา  (Sukhumvit → Silom)
  B) นักเรียนย้ายครู   (Kru Bee → Kru Arm)

สิ่งที่เกิดขึ้น:
        │
        ▼
Session ที่ย้าย → attendance: 'transfer' → ไม่หักชั่วโมง
        │
        ▼
Enrollment (hours ที่เหลือ) → ย้ายตามนักเรียนไปด้วย ✅
(ไม่ต้องซื้อ package ใหม่)
        │
        ▼
Admin assign นักเรียนเข้า Class ใหม่ที่สาขา/ครูใหม่
        │
        ▼
นักเรียนปรากฏใน Calendar ของสาขา/ครูใหม่ทันที
```

---

## 3. Enrollment & Renewal Flow

```
┌─────────────────────────────────────────────────────────┐
│                    ENROLLMENT LIFECYCLE                 │
└─────────────────────────────────────────────────────────┘

  Enrollment Created
        │
        ▼
  [active] ──────────────────────────────────────────────►
        │                                              classes
        │                                              consumed
        │  classes.left ≤ 2
        ├──────────────────► ⚠️ badge-yellow "Renewal Pending"
        │                         │
        │                         ▼
        │                   Contact Parent
        │                         │
        │  classes.left ≤ 1       ▼
        ├──────────────────► 🔴 badge-red "URGENT"
        │                         │
        │                   Payment Received
        │                         │
        │                         ▼
        │                   Create New Invoice
        │                         │
        │                         ▼
        │                   Invoice → Paid
        │                         │
        │                         ▼
        │                   Create New Enrollment
        │                         │
        │                         ▼
        └──────────────────► [active] ← continues schedule
```

### Renewal threshold constants
```
classes.left ≤ 2  →  renewalStatus = 'renewal'  →  badge-yellow
classes.left ≤ 1  →  renewalStatus = 'urgent'   →  badge-red
classes.left > 2  →  renewalStatus = 'active'   →  badge-green

// Check via:
Utils.renewalStatus(studentId)  // → 'urgent' | 'renewal' | 'active'
Utils.classesLeft(studentId)    // → minimum left across all courses
```

---

## 4. CRM Lead Pipeline Flow

```
[new]
    │
    ▼ Admin reaches out
[contacting]
    │
    ▼ Admin sends Test Form (Unique Link)
[test_scheduled]  ← Form approved, Test session created
    │
    ▼ Test session happened
[tested]
    │
    ▼ Admin sends Trial Form
[trial_scheduled] ← Form approved, Trial session created
    │
    ├──── not fit / no reply ──────► [archived]
    │                                    │
    │                              archivedFrom stage saved
    │                              e.g. archivedFrom: 'trial_scheduled'
    │
    ▼ Trial done → auto-notify Admin → Admin sends Enrollment Form
[payment_pending] ← Enrollment Form submitted + payslip attached
    │
    ▼ Admin Approves Enrollment Form
[enrolled] ──────────────────────────────────────────────►
    │                                                  Lead → Student
    │                                               Family confirmed
    │                                              (exits pipeline)
    ▼
   *** lead.converted_to = student.id ***
   *** Pipeline filter: stage ≠ 'enrolled' ***
```

### Lead stage badge colors — `CONST.LEAD_STAGES`
```javascript
{
  new:               { label: 'New Lead',          bg: '#dbeafe', color: '#1e40af' },
  contacting:        { label: 'Contacting',        bg: '#fef3c7', color: '#d97706' },
  test_scheduled:    { label: 'Test Scheduled',    bg: '#ede9fe', color: '#7c3aed' },
  tested:            { label: 'Tested',            bg: '#fef9c3', color: '#a16207' },
  trial_scheduled:   { label: 'Trial Scheduled',   bg: '#d1fae5', color: '#065f46' },
  trialed:           { label: 'Trialed',           bg: '#dcfce7', color: '#15803d' },
  payment_pending:   { label: 'Payment Pending',   bg: '#fee2e2', color: '#b91c1c' },
  enrolled:          { label: 'Enrolled',          bg: '#dcfce7', color: '#15803d' },
  archived:          { label: 'Archived',          bg: '#f3f4f6', color: '#6b7280' },
}
```

### Lead → Customer transition rule
```
เมื่อ lead.stage = 'enrolled' AND invoice.status = 'paid':
  1. สร้าง students record
  2. สร้าง families record (ถ้ายังไม่มี)
  3. lead.converted_to = student.id
  4. Pipeline filter: แสดงเฉพาะ stage ≠ 'enrolled'
```

---

## 5. Billing & Invoice Flow

```
Payslip/PromptPay Received
        │
        ▼
  [AI Detection]  ← ระบบสแกน slip อัตโนมัติ (future feature)
        │
        ▼
  Invoice Created → status: 'draft'
        │
        ▼
  Admin Reviews
        │
        ├── reject ──────────────► back to draft / delete
        │
        ▼
  status: 'pending_verification'
        │
        ▼
  Admin Verifies & Approves
        │
        ▼
  status: 'paid'  ✓
        │
        ├── Enrollment Activated (if new enrollment)
        ├── Course classes.left updated
        └── Receipt sent to parent (Inbox message)
```

### Invoice status values
```javascript
invoice.status:
  'draft'                 // สร้างแล้ว ยังไม่ส่ง
  'pending_verification'  // ส่งแล้ว รอ admin verify
  'paid'                  // ชำระแล้ว verified
  'overdue'               // เกินกำหนด ยังไม่จ่าย
  'cancelled'             // ยกเลิก
```

### Course format in billing table
```
[Subject] [Grade] · [Hours]h.   ← รูปแบบที่กำหนด
Examples:
  Eng (Active) ป.4 · 48h.
  Math ป.6 · 24h.
  Science ป.5 · 36h.
  Thai ป.5 · 24h.
```

---

## 6. Summary Writing Flow

```
Session ends (teacher Check-Out)
        │
        ▼
  session.state = 'summary_pending'
        │
        ▼
  Teacher opens Summary form
        │
        ├── Write manually
        └── AI Assist button ─────► AI generates draft from session data
                                           │
                                           ▼
                                     Teacher edits draft
        │
        ▼
  session.state = 'summary_written'
        │
        ▼
  [Optional] Translate to Thai/English
        │
        ▼
  Send to Parent
        │
        ▼
  session.state = 'summary_sent'
        │
        ├── Saved to: Inbox (new message in parent's thread)
        ├── Saved to: Student Timeline (tab in student modal)
        └── Saved to: Session log (session.summary field)
        │
        ▼
  session.state = 'closed'
```

### Summary data structure
```javascript
session.summary = {
  text:        String,   // เนื้อหา summary
  textTh:      String,   // แปลไทย (ถ้ามี)
  writtenBy:   String,   // teacher name
  writtenAt:   String,   // timestamp
  sentAt:      String,   // timestamp ที่ส่ง
  sentVia:     'inbox',  // channel
}
```

---

## 7. Inbox Message Flow

```
Inbound (from parent via LINE/Form):
  Parent sends message
        │
        ▼
  New conversation created in DB.conversations
  OR appended to existing thread
        │
        ▼
  conv.unread = true → shows in Inbox list
        │
        ▼
  Staff sees in Inbox → assigns to self or colleague
        │
        ├── Reply (type message) → type: 'staff'
        └── Internal Note (type //) → type: 'internal'

Outbound (from system):
  Summary sent → auto-message in parent thread (type: 'staff')
  Invoice sent → auto-message in parent thread (type: 'staff')
```

### Message types
```javascript
message.type:
  'inbound'   // ข้อความจาก parent
  'staff'     // ตอบโดย staff
  'internal'  // note ภายใน (ไม่เห็นโดย parent) — prefix '//'
```

### Internal note shortcut
```
พิมพ์ // ต้นข้อความ → ระบบจะ strip '//' และ save เป็น type:'internal'
แสดงใน chat ด้วย prefix: "📎 Note (Internal): ..."
```

---

## 8. Student Timeline Events

Events ที่บันทึกใน student.timeline:

```javascript
{ type: 'enrollment',  date, desc: 'Enrolled in Math ป.6 (24h)'        }
{ type: 'session',     date, desc: 'Class with Kru Arm — Present'      }
{ type: 'attendance',  date, desc: 'Absent — Lesson 5'                 }
{ type: 'summary',     date, desc: 'Summary sent: ...'                 }
{ type: 'payment',     date, desc: 'Invoice #INV-001 paid ฿12,000'     }
{ type: 'renewal',     date, desc: 'Renewal reminder sent'             }
{ type: 'note',        date, desc: 'Staff note: parent called about...' }
```

---

## 9. Calendar Session Display Rules

```
Session block color → from CONST.SUBJECT_COLOR[session.subject]

Subject → color key → hex:
  Math          → green  → #10b981
  Thai          → green  → #10b981
  Eng           → blue   → #6366f1
  Eng (Active)  → yellow → #f59e0b
  Eng (Grammar) → purple → #8b5cf6
  Science       → orange → #f97316

Display label via: Utils.subjectLabel(session) → 'Math ป.5'
  ⚠️ ห้าม hardcode 'Math ป.5' — ใช้ Utils.subjectLabel() เสมอ

Session block shows:
  Line 1: Utils.subjectLabel(session)   e.g. 'Math ป.5'
  Line 2: student names (comma-separated)
  Line 3: teacher name

Block height: proportional to CONST.SLOT_HOURS[slotId] * row height
```

### Calendar slot types
```javascript
CONST.TIME_SLOTS:
  type: 'class'   // bookable class slot (8 slots per day)
  type: 'break'   // lunch/dinner break — not bookable, shown as gray
```

---

## 10. Alert Severity Rules (Dashboard)

```
danger  🔴  = กำลังเกิดขึ้นตอนนี้ ต้องแก้ทันที
              Examples:
              - classes.left = 0 (หมดแล้ว ยังไม่ต่อ)
              - invoice overdue > 7 days
              - session started แต่ไม่มี check-in

warning ⚠️  = กำลังจะเกิดในอนาคต ถ้าไม่แก้ = ปัญหา
              Examples:
              - classes.left ≤ 1 (urgent renewal)
              - classes.left ≤ 2 (renewal pending)
              - invoice due in 3 days

info    ℹ️  = ควรรู้ไว้ ไม่ urgent
              Examples:
              - new lead came in
              - summary not written after 24h
              - trial class scheduled tomorrow
```

---

## 11. openProfileModal() Cross-Module Bridge

```
CRM customer row → 👤 Profile button
Inbox chat header → 👤 Profile button
Calendar session block → click student name
Course card → click student name
Attendance log → click student name
        │
        ▼
openProfileModal(studentName)  ← defined in student-profile.js
  window.openProfileModal = function(name) { ... }
        │
        ▼
Looks up DB.students.find(s => s.name === studentName)
        │
        ▼
Opens 6-tab unified student modal (student-profile.js)
  Tab 1: Overview       — status, courses, KPI
  Tab 2: Courses        — enrollment + hours breakdown
  Tab 3: Sessions       — session history + attendance
  Tab 4: Billing        — invoices + payment status
  Tab 5: Timeline       — chronological activity log
  Tab 6: Notes          — staff notes
```

---

## 12. Quick Reference — Key Utils

```javascript
// Data lookups
Utils.student(id)            // → student object by id
Utils.studentByName(name)    // → student object by name
Utils.family(id)             // → family object by id
Utils.sessionsFor(name)      // → all sessions containing student
Utils.upcomingFor(name)      // → upcoming sessions only

// Business logic
Utils.classesLeft(studentId) // → min remaining across all courses
Utils.renewalStatus(studentId) // → 'urgent' | 'renewal' | 'active'
Utils.studentMeta(name)      // → { family, left, cls } for calendar display
Utils.shouldDeduct(att)      // → true | false

// Formatting
Utils.currency(amount)       // → '฿12,000'
Utils.daysLabel(days)        // → 'Today' | '1 day ago' | 'X days ago'

// Badge HTML generators
Utils.statusBadge(status)    // → <span class="badge badge-green">Active</span>
Utils.attBadge(status)       // → <span class="badge badge-red">Absent</span>
Utils.leadStageBadge(stage)  // → <span class="badge" style="...">Contacting</span>
```

---

---

## 13. User Roles & Permissions Flow

```
Role Hierarchy:
  Director (CEO)    → เห็นทุกอย่าง ทุกสาขา ทุก Area
       ↓
  Area Manager      → เห็นทุกสาขาใน Area ที่รับผิดชอบ
       ↓
  Manager           → เห็นแค่สาขาตัวเอง (Branch Manager)
       ↓
  Admin             → จัดการ day-to-day ของสาขา
       ↓
  Teacher           → เห็นเฉพาะ schedule + นักเรียน + session ตัวเอง

Permission Matrix:
  Feature               Director  AreaMgr   Manager   Admin     Teacher
  ─────────────────────────────────────────────────────────────────────
  ดูข้ามสาขา           ✅ all     ✅ area   ❌         ❌         ❌
  Financial / Billing   ✅         ✅         ✅         ⚠️ view   ❌
  Staff Management      ✅         ✅         ✅         ❌         ❌
  CRM / Leads           ✅         ✅         ✅         ✅         ❌
  Calendar / Sessions   ✅         ✅         ✅         ✅         ✅ own
  Attendance            ✅         ✅         ✅         ✅         ✅ own
  Summary Writing       ✅         ✅         ✅         ✅         ✅ own
  Reports               ✅         ✅ area    ✅ branch  ❌         ❌
  Settings              ✅         ❌         ❌         ❌         ❌
```

### Role values in DB
```javascript
staff.role = 'director' | 'area_manager' | 'manager' | 'admin' | 'teacher'
```

---

## 14. Branch Setup Flow

```
Step 1: Branch Info
  Admin/Director กรอก:
  → ชื่อสาขา, ที่อยู่, เบอร์โทร, Line OA
        │
        ▼
Step 2: Rooms
  → ระบุจำนวนห้อง (ตัวเลข เช่น "3")
  → ใช้เป็น hard limit: concurrent classes ≤ room_count
        │
        ▼
Step 3: Staff Assignment
  → เลือกครูจาก Global Staff list มา assign สาขานี้
  → ครู 1 คน assign ได้หลายสาขา (multi-branch teacher)
  → Subject ของครูผูกมาอัตโนมัติ (ไม่ต้องเลือก Subject แยก)
  → Cross-branch conflict check: ครูคนเดียว + วันเดียว + เวลาเดียว = ❌ ERROR
        │
        ▼
Step 4: Operating Days
  → Admin เลือกวันที่สาขาเปิดทำการ (default: จันทร์–ศุกร์)
        │
        ▼
Step 5: Time Slots
  → กำหนด class slots ของสาขา เช่น 10:00-12:00, 13:00-15:00, 15:00-17:00
  → กำหนด break slots: Lunch (12:00-13:00), Break (17:00-17:30)
  → Flexible: แต่ละสาขาตั้งเองได้อิสระ
        │
        ▼
Step 6: Package Pricing
  → ตั้งราคาสำหรับ 24h / 48h / 72h / 96h ของสาขานี้
  → แต่ละสาขาตั้งราคาเองได้ (ไม่ global)
        │
        ▼
Step 7: Calendar Template
  → วาด Teacher × Time Slot grid ต่อ day-of-week
  → (ดู Flow 15 ด้านล่าง)
        │
        ▼
  ⚡ สาขาพร้อมรับนักเรียนทันที (ไม่มี minimum checklist)
```

---

## 15. Calendar Template Creation Flow

```
Admin เปิด Calendar Template (Settings หรือ Calendar view)
        │
        ▼
เลือก Day of Week (เช่น "วันจันทร์")
        │
        ▼
เห็น Grid: Teacher (rows) × Time Slot (cols)
  T.Nok  | [08-09] | [10-11] | [LUNCH] | [13-15] | [15-17] | [BREAK] | [17:30-19:30]
  T.Daw  | ....
  T.Lek  | ....
        │
        ▼
Admin คลิก Cell (เช่น T.Nok × 10:00-12:00)
        │
        ▼
กรอก Grade (เริ่มจาก Grade เดียว เช่น P.5)
        │
        ▼
Cell ถูก fill → ปรากฏบน Calendar Template
  ⚠️ ถ้า concurrent cells ในเวลาเดียวกัน > room_count → ❌ ERROR

Template repeats ทุกสัปดาห์โดยอัตโนมัติ
  → วันจันทร์ Week 2 = วันจันทร์ Week 1 (เหมือนกันทุกสัปดาห์)
  → แต่ละ day-of-week มี template เป็นของตัวเอง (จันทร์ ≠ อังคาร)
```

### Grade Label Auto-Update Rule
```
Cell เริ่มต้น: P.5 (Grade ของนักเรียนคนแรก)

Admin assign นักเรียน P.6 เข้า class นี้:
  → Teacher ตัดสินใจว่าเรียน curriculum เดียวกันได้ไหม
  → ถ้าใช่ → system auto-update grade_label: P.5 → P.5-6
  → ถ้าไม่ → Admin หา class อื่นให้

Grade label แสดงบน Calendar cell เสมอ (P.5-6, M.1, etc.)
```

### Student Assignment Suggestion
```
Admin กำลัง assign นักเรียนใหม่ (Subject X, Grade Y)
        │
        ▼
System Suggest Classes เรียงตามลำดับ:
  1. Grade ตรงก่อน (Exact match)
  2. Grade range ที่รวม Grade นั้นได้ (เช่น P.4-6 รับ P.5 ได้)
  3. เรียงจาก students น้อยสุด → มากสุด (ที่ว่างมากก่อน)
  ⚠️ Class ที่ > 6 students → แสดง warning บน suggestion

Admin เลือก class → ยืนยัน → นักเรียนถูก assign
  → ปรากฏใน Calendar ทุกสัปดาห์ที่มี sessions เหลือ
  → เมื่อ hours หมด → หายจาก Calendar อัตโนมัติ
```

### Class vs Session (ความต่าง)
```
CLASS   = Template cell ที่มีนักเรียน (ทำซ้ำทุกสัปดาห์)
          เช่น: Eng Active · อังคาร 10:00 · T.Nok · P.5-6
          → มีอยู่ตลอด ไม่หายไป

SESSION = การเรียน 1 ครั้ง จริงในวันที่กำหนด
          เช่น: Eng Active · อังคาร 3 Jun 2026 · 10:00–11:00
          → เกิดขึ้น เสร็จแล้วจบ

นักเรียน 1 คน join หลาย Class ได้:
  Mia join Class อังคาร + Class พฤหัส (วิชาเดียวกัน)
  → ใช้ 2 sessions/week → Package 24h หมดใน 6 สัปดาห์
```

---

## 16. Holiday Management Flow

```
Director เปิด Settings → Holidays
        │
        ▼
Add Holiday: วันที่ + ชื่อ (เช่น "วันสงกรานต์")
        │
        ▼
System ตรวจสอบว่ามี Class ไหนชนกับวันนั้น
        │
        ├── ไม่มี Class → บันทึกปกติ
        │
        └── มี Class → System alert Admin ที่สาขานั้น
                          "Class [X] ชนกับ [ชื่อวันหยุด] — จะจัดการยังไง?"
                                │
                    ┌───────────┴──────────────┐
                    ▼                          ▼
              ย้าย Session                 ข้าม Week
              (Move)                       (Skip)
                    │                          │
          Admin เลือกวันอื่น          Session ถูกยกเลิก
          ใน week เดียวกัน            → ไม่หักชั่วโมง
                    │
          Session ใหม่ถูกสร้าง
          (one-time exception)
                    │
          Template วันปกติ
          สัปดาห์ถัดไปยังคงเดิม ✅

Permission:
  Director → add / edit / delete holidays (company-wide)
  Admin     → view เท่านั้น + ตอบสนองต่อ conflict alert
```

---

## 15. Trial Session → CRM Follow-up Flow

```
Lead มา Trial → เข้า Session จริง (session.isTrial = true)
        │
        ▼
Session จบ → ระบบ auto-notify Admin ทันที ⚠️
  Notification: "Trial เสร็จแล้ว — [ชื่อ Lead] รอ follow up"
        │
        ▼
Admin ติดต่อ Parent → ถามว่าจะ enroll ไหม
        │
        ├── ตกลง → Lead stage: payment_pending
        │             → รับ payslip → Invoice → Paid
        │             → สร้าง Student + Enrollment
        │             → Lead.converted_to = student.id
        │
        └── ไม่ตกลง → Lead stage: archived
                        → บันทึก archivedFrom: 'trial'

⚠️ ถ้า Admin ไม่ follow up ภายใน 24h → ระบบ reminder อีกครั้ง
```

---

## 16. Centralized DB — Branch Filter Rules

```
ข้อมูลทั้งหมดอยู่ใน Central DB
แสดงผลแยกตาม branch ของ user ที่ login อยู่

กฎการ Filter:
  Director     → ไม่ filter (เห็นทุก branch)
  Area Manager → filter เฉพาะ branches ใน area ของตัวเอง
  Manager      → filter เฉพาะ branch ของตัวเอง
  Admin        → filter เฉพาะ branch ของตัวเอง
  Teacher      → filter เฉพาะ sessions/students ของตัวเอง

ข้อมูลที่ "ข้ามสาขา" ได้:
  Staff    → staff.branches = ['Sukhumvit','Silom'] → เห็นได้ทั้งสาขา
  Student  → ย้ายสาขา = เปลี่ยน student.branch_id เท่านั้น
  Family   → family อาจมีลูกหลายคน หลายสาขา
  Courses  → Subject catalog ใช้ร่วมกันทุกสาขา
```

---

## 17. CRM Form System Flow

### Form Types
```
Test Form       → ส่งครั้งแรก เพื่อนัด Test + เก็บข้อมูล Family/Student
Trial Form      → ส่งหลัง Test ผ่าน เพื่อนัด Trial class
Enrollment Form → ส่งหลัง Trial เพื่อ Enroll จริง (มี payment)
```

### Form Entry Points (2 ทาง)
```
1. จาก Inbox thread → ปุ่ม [Send Form] → เลือก type
2. จาก Pipeline card → ปุ่ม [Send Form] → เลือก type
```

### Unique Link Structure
```
/form?token=a7f3k9x2
  token เก็บ:
  → form_type:  'test' | 'trial' | 'enrollment'
  → lead_id:    xxx (null ถ้า new lead)
  → sent_by:    staff_id
  → branch_id:  'sukhumvit'
  → expires_at: 7 วันหลังส่ง
```

### Test / Trial Form Structure
```
[Family Section]
  Parent 1: ชื่อ, เบอร์, LINE ID
  [+ Add New Parent]  ← เพิ่มผู้ปกครองได้

[Student Section]
  Student 1: ชื่อ, Grade, Subject ที่สนใจ
  [+ Add New Student] ← สมัครหลายคนพร้อมกัน

[Schedule Section]
  "Please select Test/Trial date & time:"
  ○ Wed 12 Jun 26, 13:00
  ○ Wed 12 Jun 26, 17:00
  ○ Thu 13 Jun 26, 15:00
  ○ Fri 14 Jun 26, 10:00
  ○ Sun 16 Jun 26, 09:00

  Slots มาจาก:
  A) Existing class ที่ตรง Grade+Subject และมีที่ว่าง
  B) Empty time slots ของสาขา (สร้าง Class ใหม่ได้)
  Parent ไม่เห็นความต่าง — System จัดการ logic เอง

[Submit]
```

### Enrollment Form Structure (Stepper)
```
Step 1: ยืนยัน Family Info (pre-filled จาก Lead)
Step 2: เลือก Course + Package → แสดงราคาทันที
Step 3: เลือก Class ประจำ (Week 1 / Week 2 view)
Step 4: Payment method + แนบ Pay slip (บังคับก่อน Submit)
Step 5: Summary ยอดรวม + [Confirm & Submit]
```

### Returning Parent
```
Family มีอยู่แล้ว → Pre-fill ข้อมูล Parent ทั้งหมดอัตโนมัติ
ต้องการเพิ่ม Student ใหม่ → [+ Add New Student]
ต้องการเพิ่ม Parent ใหม่ → [+ Add New Parent]
ไม่ต้องกรอก Parent เดิมซ้ำ
```

---

## 18. Form Submission Review Flow

```
Parent Submit Form
        │
        ▼ ทั้งสองที่พร้อมกัน
    ┌───┴───────────────────────┐
    ▼                           ▼
Inbox Thread                Pipeline Card
"📋 Form submitted"         badge "⏳ Pending Approval"
    │                           │
    └───────────┬───────────────┘
                ▼
        Admin เห็น Submission card
        แสดง: ข้อมูล Parent + Student + เวลาที่เลือก
                │
        ┌───────┴────────────┐
        ▼                    ▼
    [Approve]              [Edit]
        │                    │
        ▼              Admin แก้ข้อมูล/เวลา
  สร้าง records         คุยกับ Parent ใน Inbox
  ตาม form type         ตกลงแล้ว → [Approve]
```

### Records ที่สร้างเมื่อ Approve

**Test/Trial Form:**
```
→ Family record (ถ้าใหม่)
→ Lead record (stage: test_scheduled หรือ trial_scheduled)
→ Session (is_trial=true หรือ is_test=true)
→ Notification ถึง Admin ที่เกี่ยวข้อง
```

**Enrollment Form:**
```
→ Lead stage → 'enrolled'
→ Student record สร้างจาก Lead
→ Family record ยืนยัน
→ Enrollment per Subject (แยกต่อวิชา)
→ Invoice per Subject (แยกต่อวิชา)
→ Class assignment (recurring)
→ Invoice status: 'paid' (payslip แนบมาแล้ว → Admin verify)
```

---

*Last updated: 20 May 2026 | NockERP FLOWS.md — Business Logic State Machines*
*Added: Roles, Leave Quota, Reschedule, Transfer, Trial Flow, Class Template, Centralized DB*
*Revised 20 May 2026: Replaced Section 14 with full Branch Setup Flow (7 steps),*
*added Section 15 Calendar Template Creation (Teacher×TimeSlot grid, day-of-week, grade auto-update),*
*added Section 16 Holiday Management Flow (Director-only, move/skip options)*
*Revised 20 May 2026: Updated Section 4 CRM Lead Pipeline (new stages: test_scheduled, tested,*
*trial_scheduled, trialed), added Section 17 CRM Form System Flow (3 form types, unique link,*
*stepper, returning parent), added Section 18 Form Submission Review Flow (dual notification,*
*Approve/Edit, records created per form type)*
