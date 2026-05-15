# NockERP — CLAUDE.md
> Claude อ่านไฟล์นี้ทุกครั้งก่อนเริ่มทำงาน — อย่าลืม sync ให้ทันสมัยเสมอ

---

## 1. โปรเจกต์คืออะไร

**NockERP** คือระบบ ERP สำหรับสถาบันกวดวิชา (Education Operations)
ออกแบบมาเพื่อจัดการ: นักเรียน, ครู, คลาส, การเรียน, billing, CRM และ inbox

**Owner:** Nock (Admin / Director)
**Stage:** Interactive HTML Prototype (ยังไม่ใช่ production)

---

## 2. Tech Stack

```
Language:   HTML5, CSS3, Vanilla JavaScript (ES6+)
Framework:  ไม่มี — No React, No Vue, No dependencies
Fonts:      Inter (system-ui fallback)
Icons:      Emoji (ไม่ใช้ icon library)
Storage:    ไม่มี backend — ข้อมูลเป็น mock data ใน JS
```

---

## 3. โครงสร้างไฟล์

```
/NEW ERP!/
├── CLAUDE.md                 ← ไฟล์นี้ — อ่านก่อนเสมอ
├── Customer.md               ← ⭐ Mock data ทั้งหมด (Students, Staff, Sessions, Leads, Invoices, Inbox)
├── COMPONENTS.md             ← ⭐ CSS class catalog (badges, buttons, modals, layouts)
├── FLOWS.md                  ← ⭐ Business logic state machines (Session, Billing, CRM, Renewal)
├── BLUEPRINT 2 | ....md      ← Information Architecture ฉบับเต็ม
│
├── index.html                ← Shell: Sidebar + TopNav + view containers (ไม่มี inline CSS/JS)
│
├── css/
│   └── main.css              ← CSS ทั้งหมดของโปรเจกต์ (Design System)
│
└── js/
    ├── app.js                ← Navigation, Modal utils, Shared functions
    ├── session-card.js       ← ⭐ Shared SessionCard renderer (loads early)
    ├── attendance-picker.js  ← ⭐ Shared AttendancePicker + calSetAtt alias (loads early)
    ├── dashboard.js          ← Dashboard view content + logic
    ├── crm.js                ← CRM view content + logic
    ├── inbox.js              ← Inbox view content + logic
    ├── calendar.js           ← Calendar view content + logic
    ├── calendar-class.js     ← Calendar Class Modal (3-state machine)
    ├── students.js           ← Students view content + logic
    ├── families.js           ← Families view content + logic (Timeline tab added)
    ├── staff.js              ← Staff view content + logic
    ├── billing.js            ← Billing view content + logic
    ├── reports.js            ← Reports view content + logic
    ├── settings.js           ← Settings view content + logic
    ├── timeline.js           ← ⭐ Shared Timeline renderer (loads after settings.js)
    ├── student-profile.js    ← ⭐ Unified Student/Customer Profile Modal (6 tabs)
    ├── sessions.js           ← Sessions list view (all DB sessions, filter, class modal)
    ├── attendance.js         ← Attendance log + consumption bars
    ├── summaries.js          ← Summary tracking — pending / sent / write / send
    ├── notifications.js      ← Notification center — generated from DB, read/unread
    ├── tasks.js              ← Tasks view — DB-driven + manual tasks
    ├── courses.js            ← Courses catalog — aggregated from DB
    ├── classes.js            ← Class groups — recurring session slots
    ├── logs.js               ← Logs & Timeline — full audit trail
    └── placeholder.js        ← Empty (all modules now built)
```

### Script Load Order (สำคัญมาก)
```
1. data.js              → window.DB + window.CONST  (ต้องโหลดก่อนเสมอ)
2. app.js               → navigation + Modal + window.Utils
3. session-card.js      → window.SessionCard         (shared util — loads early)
4. attendance-picker.js → window.AttendancePicker    (shared util — loads early)
5. [view modules]       → dashboard, crm, inbox, calendar, students, families …
6. timeline.js          → window.Timeline            (shared util — loads after view modules)
7. student-profile.js   → window.openProfileModal    (overrides openStudentModal + openCustomerModal)
8. sessions, attendance, summaries, notifications, tasks, courses, classes, logs
9. placeholder.js       (empty — no-op)
```

### วิธีที่แต่ละ JS module ทำงาน
```javascript
// ทุก module ใช้ pattern นี้
(function() {
  // ✅ อ่านข้อมูลจาก DB — ไม่ define data เอง
  const students = DB.students;
  const STATUS_META = CONST.STUDENT_STATUS;

  const view = document.getElementById('view-[name]');
  view.innerHTML = `...HTML content...`;
  
  // module-specific functions only
})();
```

### Global Objects ที่ใช้ได้ทุก Module
```javascript
// ── Data ──
DB.students       // Student[] — 5 active students
DB.families       // Family[] — 5 families
DB.staff          // Staff[]  — 6 staff/teachers
DB.sessions       // Session[] — calendar sessions
DB.leads          // Lead[]   — CRM leads
DB.customers      // Customer[] — CRM customers
DB.conversations  // Conversation[] — inbox threads
DB.messages       // {[id]: Message[]} — inbox messages
DB.dayHeaders     // DayHeader[] — calendar week config

// ── Constants ──
CONST.STUDENT_STATUS   // active/renewal/urgent/inactive meta
CONST.ATTENDANCE_META  // present/leave/absent/reschedule/transfer
CONST.LEAD_STAGES      // new/contacting/test/trial/archived
CONST.ROLE_META        // Teacher/Admin badge meta
CONST.FAMILY_STATUS    // active/urgent/pending
CONST.SUBJECT_COLOR    // subject → color tag
CONST.TIME_SLOTS       // 2-hr class blocks + breaks
CONST.SLOT_HOURS       // slotId → {s, e} time strings
CONST.TEACHERS         // ['Kru Arm', ...]
CONST.STAFF_NAMES      // ['Admin Nock', 'Kru Arm', ...]
CONST.SUBJECTS         // ['Math G5', ...]
CONST.GRADES           // ['G3', 'G4', 'G5', 'G6']
CONST.ROOMS            // ['Room 1', 'Room 2', 'Room 3']
CONST.BRANCHES         // ['Sukhumvit', 'Silom']

// ── Utils ──
Utils.student(id)            // find student by id
Utils.studentByName(name)    // find student by name
Utils.family(id)             // find family by id
Utils.staffById(id)          // find staff by id
Utils.classesLeft(studentId) // min classes remaining
Utils.renewalStatus(id)      // 'active'|'renewal'|'urgent'
Utils.studentMeta(name)      // {family, left, cls} for Calendar
Utils.sessionsFor(name)      // all sessions for a student
Utils.upcomingFor(name)      // upcoming sessions only
Utils.shouldDeduct(att)      // true if att status deducts a class
Utils.currency(amt)          // '฿14,400'
Utils.daysLabel(d)           // 'Today' | '1 day ago' | 'N days ago'
Utils.statusBadge(status)    // <span class="badge ...">
Utils.attBadge(status)       // <span class="badge ...">
Utils.leadStageBadge(stage)  // <span style="...">
```

---

## 4. Design System

### Colors
```css
--primary:       #6366f1   /* Indigo — ปุ่มหลัก, active state, border accent */
--primary-dark:  #5355d1   /* Hover state ของ primary */
--dark:          #1a1d23   /* Sidebar bg, page title */
--surface:       #f5f6fa   /* Page background */
--white:         #ffffff
--border:        #e5e7eb
--border-light:  #f3f4f6

/* Text */
--text-primary:  #1a1d23
--text-secondary:#374151
--text-muted:    #6b7280
--text-placeholder:#9ca3af

/* Status */
--green:   #10b981  /* Active, Present, Paid, Success */
--yellow:  #f59e0b  /* Pending, Warning, Leave */
--red:     #ef4444  /* Danger, Alert, Absent, Overdue */
--blue:    #6366f1  /* Info, Scheduled */
--orange:  #f97316  /* Science subject color */
```

### Badge classes
```
.badge-green   = Active, Paid, Present
.badge-yellow  = Pending, Warning, Leave
.badge-red     = Danger, Urgent, Absent, 1 class left
.badge-blue    = Scheduled, Info
.badge-purple  = Trial, Test scheduled
.badge-orange  = Science sessions
.badge-gray    = Inactive, Archived, Walk-in
```

### Alert severity (Risk & Alert panel)
```
danger  = กำลังเกิดขึ้นตอนนี้ ต้องแก้ทันที (สีแดง)
warning = กำลังจะเกิดในอนาคต ถ้าไม่แก้ = ปัญหา (สีเหลือง)
info    = ควรรู้ไว้ ไม่ urgent (สีม่วง/น้ำเงิน)
```

---

## 5. Business Rules (สำคัญมาก)

### Attendance & Consumption
```
Present               → หักชั่วโมง 1 ครั้ง
Absent (no notice)    → หักชั่วโมง 1 ครั้ง
Leave (within quota)  → ไม่หัก
Leave (over quota)    → หักชั่วโมง 1 ครั้ง
Transfer              → ไม่หัก (ย้ายไปครั้งอื่น)
Reschedule            → ไม่หัก (เลื่อนวัน)
```

### Renewal Flow
```
Remaining Classes ≤ 2 → trigger "Renewal Pending" alert
→ ติดต่อ parent → payment → create new enrollment → continue schedule
```

### CRM Lead Stages
```
New Lead → Contacting → Interested (Test) → Interested (Trial) → [Enrolled]
                                                                      ↓
                                                              กลายเป็น Customer
                                                              (ออกจาก Lead pipeline)

Archived = lead ที่ไม่ได้ต่อ ต้องแสดง source stage เช่น "Archived (Test)"
```

### Enrollment = Customer
```
เมื่อ Lead จ่ายเงินและ Enroll แล้ว → ย้ายไป Customer tab ทันที
Lead pipeline จะไม่แสดง "Enrolled" stage
```

### Session Flow
```
Upcoming → Start Class → Check-In → Teaching → Check-Out → End Class
→ Summary Pending → Summary Written → Summary Sent → Session Closed
```

### Summary Flow
```
Teacher Check-Out → Write Summary → AI Assist (optional) → Translate (optional)
→ Send to Parent → Save to: Inbox + Student Timeline + Session Timeline
```

### Billing
```
Course format ใน table: [Course Name: Xh.] เช่น [Eng Active:48h.] [Math:24h.]
Invoice status: Draft → Pending Verification → Paid
Payment trigger: Payslip received → AI detect → Generate Invoice → Admin verify → Active
```

---

## 6. Module Status

| Module              | Status         | หมายเหตุ                                        |
|---------------------|---------------|--------------------------------------------------|
| Dashboard           | 🟡 Partial     | Today's sessions now LIVE from DB via SessionCard |
| CRM                 | 🟡 Partial     | Pipeline OK, Timeline tab now uses live data      |
| Inbox               | 🟢 Complete    | Chat bubble UI, channel badges, note mode         |
| Calendar            | 🟢 Complete    | Search bar, filter chips, card list view          |
| CRM Schedule        | 🟢 Complete    | Day/Week view, date navigation, slot selection    |
| Students            | 🟢 Complete    | list+filter+sort, unified via student-profile.js  |
| Billing             | 🟡 Partial     | course format ยังไม่ถูก                          |
| Reports             | 🟢 Complete    | 5 tabs (Overview/Revenue/Students/Attendance/CRM), CSS bar charts, live DB |
| Settings            | 🟢 Complete    | 4 tabs (General/Branches/Teachers/System), all fields, toggle switches     |
| Notifications       | 🟢 Complete    | Generated from DB — renewals, summaries, leads, billing, filter+mark read  |
| Families            | 🟢 Complete    | list+filter, modal 4 tabs + Timeline              |
| Staff               | 🟢 Complete    | roster+filter, modal 3 tabs done                  |
| **StudentProfile**  | 🟢 Complete    | Unified modal — 6 tabs, works from everywhere     |
| **Timeline**        | 🟢 Complete    | Shared renderer — Student, Families, CRM modals   |
| **SessionCard**     | 🟢 Complete    | Shared card row — Dashboard + Calendar            |
| **AttendancePicker**| 🟢 Complete    | Shared att buttons — CalendarClass + others       |
| Sessions    | 🟢 Complete    | List all sessions, filter, attendance stats, click → Class Modal |
| Attendance  | 🟢 Complete    | Full log, consumption bars, deduction tracking                   |
| Summaries   | 🟢 Complete    | Pending/sent view, send to parent, link to Class Modal           |
| Tasks       | 🟢 Complete    | DB-driven tasks, dual filter (show/priority), add task modal     |
| Courses     | 🟢 Complete    | Course catalog from DB, card grid, branch filter, detail modal   |
| Classes     | 🟢 Complete    | Class groups by slot/teacher, table view, detail modal           |
| Logs        | 🟢 Complete    | Full audit trail, module filter, search, Timeline renderer       |

---

## 7. Mock Data (ข้อมูลตัวอย่างในระบบ)

### Students (active)
```
Mia Tanaka     | Age 9  | Sukhumvit | English Reading      | 2 left  | Renewal Pending
Tom Chen       | Age 12 | Sukhumvit | Math Grade 6         | 14 left | Active
Ploy Srirak    | Age 10 | Silom     | Math G5 + Thai Lang  | 18 left | Active
James Wilson   | Age 11 | Sukhumvit | Science              | 1 left  | URGENT renewal
```

### Staff / Teachers
```
Kru A  (Kru Arm)  | Math          | Sukhumvit
Kru B  (Kru Bee)  | English       | Sukhumvit
Kru D  (Kru Dan)  | Science       | Sukhumvit, Silom
Kru E  (Kru Eve)  | Thai Language | Silom
Kru C  (Kru Cat)  | Math Grade 6  | Sukhumvit
```

### Branches
```
Sukhumvit Branch  | 4 rooms | LINE: @nock-sukhumvit
Silom Branch      | 3 rooms | LINE: @nock-silom
```

### Holidays (May 2026)
```
15 May 2026  | Visakha Bucha Day | วันวิสาขบูชา (วันหยุดราชการ)
```

---

## 8. วิธีทำงานร่วมกัน (Working Protocol)

### กฎสำหรับ Claude
1. อ่าน CLAUDE.md ก่อนทำงานทุกครั้ง
2. แก้ไข **ทีละ module** เท่านั้น — อย่าพยายามแก้หลาย module พร้อมกัน
3. เขียนไฟล์ทีละไฟล์ — แต่ละไฟล์ต้องไม่เกิน **500 บรรทัด**
4. ถ้าต้องการข้อมูลเพิ่มเติม ถามก่อน อย่าเดา
5. หลังทำงาน update module status ใน CLAUDE.md ด้วย

### กฎสำหรับ User (Nock)
1. สั่งงาน **1 module ต่อ session**
2. บอก acceptance criteria ให้ชัด ("เสร็จแล้วคือ...")
3. Preview ก่อน approve ทุกครั้ง
4. ถ้าอยากแก้ระหว่างทาง — บอกก่อน อย่า assume

### Template การสั่งงาน
```
Module: [ชื่อ module]
ต้องการ: [อธิบาย feature]
Business rule: [ถ้ามี]
เสร็จแล้วคือ: [acceptance criteria]
```

---

## 9. คำสั่งที่ใช้บ่อย

```bash
# เปิด preview ใน browser
open index.html

# Git: save progress
git add -A && git commit -m "feat: [module] description"

# Git: ย้อนกลับถ้าพัง
git checkout -- [filename]
```

---

*Last updated: 15 May 2026 — All 18 modules complete · Prototype feature-complete*
*Architecture refactored: data.js + Utils added — all modules now read from window.DB*
*Phase 1–4 complete: all core modules built. Remaining placeholders: Tasks, Courses, Classes, Logs.*

---

> **⭐ Mock Data ทั้งหมดอยู่ใน `Customer.md`** — ดูข้อมูล Students, Families, Staff, Sessions, Leads, Invoices, Inbox จากที่เดียว
