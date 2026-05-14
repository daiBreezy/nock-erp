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
│ reschedule      │ ❌ NO         │ เลื่อนวัน → ย้าย session         │
│ transfer        │ ❌ NO         │ ย้ายกลุ่ม → ไม่นับชั่วโมง       │
└─────────────────┴──────────────┴──────────────────────────────────┘
```

### Code reference: `CONST.ATTENDANCE_META`
```javascript
CONST.ATTENDANCE_META = {
  present:    { deduct: true,  cls: 'badge-green',  label: 'Present'     },
  absent:     { deduct: true,  cls: 'badge-red',    label: 'Absent'      },
  leave:      { deduct: false, cls: 'badge-yellow', label: 'Leave'       },
  reschedule: { deduct: false, cls: 'badge-blue',   label: 'Reschedule'  },
  transfer:   { deduct: false, cls: 'badge-gray',   label: 'Transfer'    },
}

// Check via:
Utils.shouldDeduct(attendanceStatus) // → true | false
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
[new_lead]
    │
    ▼ staff reaches out
[contacting]
    │
    ▼ parent responds, interested
[interested_test]  ← ตั้งนัด Test (ทดสอบระดับ)
    │
    ▼ test done, confirmed fit
[interested_trial] ← ตั้งนัด Trial class (ทดลองเรียนฟรี)
    │
    ├──── not fit / no reply ──────► [archived]
    │                                    │
    │                              source stage saved:
    │                              e.g. "Archived (Trial)"
    │
    ▼ trial done, parent agrees to enroll
[payment_pending]  ← รอ payslip
    │
    ▼ payslip received
[enrolled] ──────────────────────────────────────────────►
    │                                                  moves to
    │                                               Customer tab
    │                                              (exits pipeline)
    ▼
   *** Lead record archived / hidden from pipeline ***
   *** New DB.customers entry created ***
```

### Lead stage badge colors — `CONST.LEAD_STAGES`
```javascript
{
  new_lead:          { label: 'New Lead',          bg: '#dbeafe', color: '#1e40af' },
  contacting:        { label: 'Contacting',        bg: '#fef3c7', color: '#d97706' },
  interested_test:   { label: 'Test Scheduled',    bg: '#ede9fe', color: '#7c3aed' },
  interested_trial:  { label: 'Trial Scheduled',   bg: '#d1fae5', color: '#065f46' },
  payment_pending:   { label: 'Payment Pending',   bg: '#fee2e2', color: '#b91c1c' },
  enrolled:          { label: 'Enrolled',          bg: '#dcfce7', color: '#15803d' },
  archived:          { label: 'Archived',          bg: '#f3f4f6', color: '#6b7280' },
}
```

### Lead → Customer transition rule
```
เมื่อ Lead stage = 'enrolled' AND invoice paid:
  1. สร้าง DB.customers entry ใหม่
  2. Lead.stage = 'enrolled' (ไม่แสดงใน pipeline)
  3. Pipeline filter: แสดงเฉพาะ stage ≠ 'enrolled'
  4. Customer tab: แสดงข้อมูลจาก DB.customers
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
[Course Name: Xh.]   ← รูปแบบที่กำหนด
Examples:
  [Eng Active: 48h.]
  [Math G6: 24h.]
  [Science: 36h.]
  [Thai Lang: 24h.]
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
{ type: 'enrollment',  date, desc: 'Enrolled in Math G6 (24h)'        }
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

Subject color mapping:
  Math      → #6366f1  (indigo/primary)
  English   → #10b981  (green)
  Science   → #f97316  (orange)
  Thai      → #f59e0b  (yellow)
  default   → #6b7280  (gray)

Session block shows:
  Line 1: [time] subject
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

## 11. openCustomerModal() Cross-Module Bridge

```
CRM customer row → 👤 Profile button
Inbox chat header → 👤 Profile button
Calendar session block → click student name
        │
        ▼
openCustomerModal(studentName)  ← defined in app.js
        │
        ▼
Looks up DB.students.find(s => s.name === studentName)
        │
        ▼
Opens 5-tab student modal (defined in students.js)
  Tab 1: Overview
  Tab 2: Enrollments & Courses
  Tab 3: Attendance Log
  Tab 4: Timeline
  Tab 5: Notes
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

*Last updated: 14 May 2026 | NockERP FLOWS.md — Business Logic State Machines*
