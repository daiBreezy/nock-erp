# NockERP — CLAUDE.md
> Claude อ่านไฟล์นี้ทุกครั้งก่อนเริ่มทำงาน — อย่าลืม sync ให้ทันสมัยเสมอ

---

## 1. โปรเจกต์คืออะไร

**NockERP** คือระบบ ERP สำหรับสถาบันกวดวิชา (Education Operations)
ออกแบบมาเพื่อจัดการ: นักเรียน, ครู, คลาส, การเรียน, billing, CRM และ inbox

**Owner:** Nock (Director / CEO)
**Stage:** Interactive HTML Prototype (ยังไม่ใช่ production)
**Multi-branch:** รองรับหลายสาขา — ข้อมูลรวมกลาง แยกแสดงตามสาขา

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
├── COMPONENTS.md             ← ⭐ Component catalog (CSS classes + JS patterns)
├── FLOWS.md                  ← Business logic state machines
│
├── index.html                ← Shell: Sidebar + TopNav + view containers
│
├── css/
│   └── main.css              ← CSS ทั้งหมด (Design System + Components)
│
└── js/
    ├── data.js               ← window.DB + window.CONST  (โหลดก่อนสุด)
    ├── app.js                ← Navigation + Modal + window.Utils
    ├── session-card.js       ← ⭐ Shared: SessionCard renderer
    ├── attendance-picker.js  ← ⭐ Shared: AttendancePicker
    ├── timeline.js           ← ⭐ Shared: Timeline renderer
    ├── student-profile.js    ← ⭐ Shared: Unified Profile Modal (6 tabs)
    ├── dashboard.js
    ├── crm.js / crm-schedule.js
    ├── inbox.js
    ├── calendar.js / calendar-class.js / calendar-widget.js
    ├── students.js / families.js / staff.js
    ├── billing.js / reports.js / settings.js
    ├── sessions.js / attendance.js / summaries.js
    ├── notifications.js / tasks.js
    ├── courses.js / classes.js / logs.js
    └── placeholder.js        ← empty (no-op)
```

### Script Load Order (สำคัญมาก)
```
1. data.js              → window.DB + window.CONST
2. app.js               → navigation + Modal + window.Utils
3. session-card.js      → window.SessionCard
4. attendance-picker.js → window.AttendancePicker
5. [view modules]       → dashboard, crm, inbox, calendar, students …
6. timeline.js          → window.Timeline
7. student-profile.js   → window.openProfileModal
8. sessions, attendance, summaries, notifications, tasks, courses, classes, logs
9. placeholder.js
```

---

## 4. Design System

### Colors
```css
--primary:       #6366f1   /* Indigo */
--dark:          #1a1d23   /* Sidebar, titles */
--surface:       #f5f6fa   /* Page background */
--border:        #e5e7eb
--border-light:  #f3f4f6

/* Status */
--green:   #10b981  /* Active, Present, Paid */
--yellow:  #f59e0b  /* Pending, Warning, Leave */
--red:     #ef4444  /* Danger, Urgent, Absent */
--blue:    #6366f1  /* Info, Scheduled */
--orange:  #f97316  /* Science */
--purple:  #8b5cf6  /* Grammar, Trial */
```

### Subject Colors
```javascript
SUBJECT_COLOR = {
  'Eng':          'blue',
  'Math':         'green',
  'Science':      'orange',
  'Thai':         'green',
  'Eng (Active)': 'yellow',
  'Eng (Grammar)':'purple',
}
```

### Badge classes
```
.badge-green   = Active, Paid, Present
.badge-yellow  = Pending, Leave, Renewal
.badge-red     = Urgent, Absent, 1 left
.badge-blue    = Scheduled, Eng
.badge-purple  = Trial, Eng (Grammar)
.badge-orange  = Science
.badge-gray    = Inactive, Archived
```

---

## 5. ERP UI/UX Design Rules ⭐

> นี่คือ ERP — ไม่ใช่ Marketing website
> Optimize for: operational speed, information density, fast scanning

### หลักการหลัก
```
✅ ใช้: tables, compact analytics, grouped metrics
✅ ใช้: 2–4 column operational grid
✅ ใช้: gap 16–20px, padding 16–20px
✅ ใช้: border-radius subtle

❌ หลีกเลี่ยง: giant hero sections, cinematic spacing
❌ หลีกเลี่ยง: oversized cards, excessive empty space
❌ หลีกเลี่ยง: full-width stretched progress bars
❌ หลีกเลี่ยง: unnecessary vertical spacing
```

### KPI Cards
```
- Height: compact — แค่พอแสดง icon + label + value + sub
- Grid: repeat(4, 1fr) สำหรับ 4 metrics
- Padding: 16px ภายใน
- ห้ามมี dead space
```

### Tables
```
- ใช้ table สำหรับ list data (ไม่ใช่ card ต่อ row)
- Row height: compact (~40px)
- Cell padding: 8px 12px
- เห็น 10+ rows โดยไม่ต้อง scroll
```

### Dashboard
```
- แสดง operational insight ทันทีที่เปิด
- Minimize scrolling
- ทุก section ต้องมี data จริง ห้าม empty
```

### Progress Bars
```
- ใช้เฉพาะเมื่อ proportional meaning ชัดเจน
- ห้าม stretch เต็ม width โดยไม่มีความหมาย
- Prefer: compact metric rows, segmented display
```

---

## 6. Component Management System ⭐

> เมื่อ components เยอะขึ้น ต้องมีระบบจัดการ

### หลักการ: 3 ระดับ Component

```
Level 1 — Design Tokens (css/main.css)
  CSS variables, base classes (.badge, .btn, .card)
  → แก้ที่นี่ = เปลี่ยนทุกที่

Level 2 — Shared JS Components (js/*.js แยกไฟล์)
  SessionCard, AttendancePicker, Timeline, StudentProfile
  → ใช้ได้จากทุก module ผ่าน window.ComponentName

Level 3 — Module-local HTML (ใน view module แต่ละอัน)
  inline HTML template เฉพาะ module นั้น
  → ห้าม copy-paste ข้าม module — ถ้าใช้ซ้ำ 2+ ที่ = ย้ายขึ้น Level 2
```

### กฎ Component
```
1. ก่อนเขียน component ใหม่ → เช็ค COMPONENTS.md ก่อนว่ามีอยู่แล้วไหม
2. ถ้า HTML pattern เหมือนกัน 2+ module → สร้างเป็น Shared Component
3. ทุก Shared Component ต้อง document ใน COMPONENTS.md
4. ห้าม hardcode color/spacing — ใช้ CSS class หรือ CONST เสมอ
5. หลัง build/แก้ component → update COMPONENTS.md ทันที
```

### Audit Checklist (รันทุกครั้งก่อน approve)
```
□ มี copy-paste HTML ซ้ำกัน 2+ ที่ไหม? → ย้ายเป็น Shared
□ มี hardcode color (#xxx) ที่ควรใช้ CSS variable ไหม?
□ มี spacing ที่ใหญ่เกิน ERP rules ไหม?
□ COMPONENTS.md up-to-date ไหม?
```

---

## 7. User Roles & Permissions ⭐

### 5 Roles (Hierarchy)
```
Director (CEO)        ← Nock — เห็นทุกอย่าง ทุกสาขา ทุก Area
      ↓
Area Manager          ← ดูแลหลายสาขาใน Area ที่รับผิดชอบ
      ↓
Manager               ← ดูแลสาขาตัวเอง (Branch Manager)
      ↓
Admin                 ← จัดการ day-to-day ของสาขา (CRM, Calendar, Attendance)
      ↓
Teacher               ← เห็นเฉพาะ schedule, นักเรียน, session ของตัวเอง
```

### Permission Matrix
```
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

### กฎ Role ใน Code
```javascript
// role values ใน DB
staff.role = 'director' | 'area_manager' | 'manager' | 'admin' | 'teacher'

// ยังไม่ implement permission check ใน prototype
// แต่ต้องออกแบบ UI ให้รองรับได้ในอนาคต
```

---

## 8. Data Architecture — Centralized + Branch Filter ⭐

> ข้อมูลทั้งหมดอยู่ที่ "กล่องกลาง" เดียว — แต่แสดงผลแยกตามสาขา
> ไม่แยก database ต่อสาขา เพราะ Staff/Student/Family ข้ามสาขาได้

### ทำไม Centralized?
```
Staff:   Kru Dan สอนทั้ง Sukhumvit และ Silom → record เดียว multi-branch
Student: ย้ายสาขาได้ → แค่เปลี่ยน branch field
Family:  พ่อแม่คนเดียว อาจมีลูก 2 คนคนละสาขา → family record เดียว
Course:  Math ป.5 = เหมือนกันทุกสาขา → ไม่ต้องสร้างซ้ำ
```

### สิ่งที่ "กลาง" vs สิ่งที่ "ของสาขา"
```
🌐 กลาง (shared ทุกสาขา):        🏫 ของสาขา (มี branch_id):
─────────────────────────        ──────────────────────────
Students                          Room Count
Families                          Operating Days
Staff / Teachers                  Time Slots (per branch, flexible)
Subjects catalog                  Package Pricing
Global Course Templates           Branch Courses (ปรับ/สร้างเอง)
Holidays (Director sets)          Calendar Templates (per day-of-week)
                                  Class Instances (with students)
                                  Sessions (generated weekly)
                                  Invoices
```

### Subject + Grade (สำคัญมาก)
```
Subject = ชื่อวิชา base เท่านั้น: 'Math', 'Eng', 'Science', 'Thai', 'Eng (Active)', 'Eng (Grammar)'
Grade   = แยก field: 'ป.1'–'ป.6', 'ม.1'–'ม.3'
Course  = Marketing/Product unit — มี 1 หรือหลาย Subject
  ชั่วโมงแยกต่อ Subject (ไม่ใช่ pool รวม)
  เช่น: "Math 24h" หรือ "Course สอบเข้า ม.1 (Math 24h + Eng 24h + Science 48h)"

// ใน session:
session.subject = 'Math'       ← base เท่านั้น
session.grade   = 'ป.5'        ← แยก field
Utils.subjectLabel(s)          → 'Math ป.5'  ← ใช้สำหรับ display
```

### Teacher Architecture (สำคัญมาก)
```
Teacher มี 2 dimensions:
  Subject(s)  : สอนวิชาอะไร (single หรือ multi-subject ได้)
  Grade Range : ประถม (ป.1–6) | มัธยมต้น (ม.1–3) | ทั้งคู่

Subject ผูกกับ Teacher — เมื่อสาขาเลือก Teacher → Subject ของ Teacher นั้น available ทันที
ไม่ต้องเลือก Subject แยกต่างหาก

ตัวอย่าง:
  Teacher A: Math | ประถม + มัธยมต้น
  Teacher B: Eng (Active) | ประถม
  Teacher C: Math + Science | ประถม

Teacher Cross-Branch:
  ครู 1 คน assign ได้หลายสาขา (เช่น Wed-Thu Silom, Fri Bangna, Sat-Sun Sukhumvit)
  ห้าม: วันเดียวกัน + เวลาเดียวกัน + ต่างสาขา = ERROR (ครูอยู่ 2 ที่พร้อมกันไม่ได้)
```

### Architecture: Subject → Course → Class → Session
```
Subject          (Global catalog) : Eng, Math, Science, Thai, Eng (Active), Eng (Grammar)
Teacher          (Global)         : Subject(s) + Grade Range
Course Template  (Global)         : Director สร้าง — bundle Subjects + default hours ต่อ Subject
Branch Course    (per branch)     : ปรับจาก Global Template หรือสร้างเองได้ + ตั้งราคาเอง
Class            (per branch)     : Teacher × Time Slot × Day — สร้างใน Calendar grid
Session          (Generated)      : Class + Date + Students — generate ทุกสัปดาห์
Enrollment       (per student)    : Subject + Hours — แยกต่อ Subject, renew แยกได้
```

### Global Objects
```javascript
// Data
DB.students / DB.families / DB.staff / DB.sessions
DB.leads / DB.customers / DB.conversations / DB.messages / DB.dayHeaders

// Constants
CONST.SUBJECTS     // ['Eng','Math','Science','Thai','Eng (Active)','Eng (Grammar)']
CONST.GRADES       // ['ป.1','ป.2',...,'ป.6','ม.1','ม.2','ม.3']
CONST.BRANCHES     // ['Sukhumvit','Silom']
CONST.TEACHERS     // ['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve']
CONST.SUBJECT_COLOR // subject → color key
CONST.SLOT_HOURS   // slotId → {s, e}
CONST.STUDENT_STATUS / ATTENDANCE_META / LEAD_STAGES

// Utils
Utils.subjectLabel(session)         → 'Math ป.5'
Utils.subjectLabel('Math','ป.5')    → 'Math ป.5'
Utils.currency(amt)                 → '฿14,400'
Utils.statusBadge(status)           → <span class="badge ...">
Utils.attBadge(status)              → <span class="badge ...">
Utils.sessionsFor(name)             → sessions[]
Utils.studentByName(name)           → student
Utils.renewalStatus(id)             → 'active'|'renewal'|'urgent'
```

---

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
- Summary หลัง sent = immutable (ต้อง delete + resend)
- AI Assist ช่วย draft ได้ → ครูต้องแก้และ approve ก่อนส่ง
```

### Renewal
```
sessionsRemaining ≤ 2 → "Renewal Pending"
sessionsRemaining ≤ 1 → "URGENT"
Renewal = Enrollment ใหม่เสมอ (ไม่ extend เดิม)
Class Assignment หลัง Renewal = ขึ้นอยู่กับ Parent
  → ต้องการ Class เดิม: Admin ไม่ต้องทำอะไร (อยู่ใน Class เดิมต่อ)
  → ต้องการ Class ใหม่: Admin re-assign
```

### CRM Lead Flow
```
new → contacting → test_scheduled → tested
    → trial_scheduled → trialed
    → payment_pending → enrolled ✅ (= Student)

Archived = drop ออกได้ทุก stage → บันทึก archivedFrom เสมอ
Trial session = isTrial: true → ไม่ consume enrollment hours
หลัง Trial → ระบบ auto-notify Admin ให้ follow up ทันที ⚠️
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
→ Summary Written (per student) → Summary Sent → Closed
Summary หลัง sent = immutable (ต้อง delete + resend)
```

### Billing
```
Course display: '[Subject] [Grade] · [Hours]h.'  เช่น 'Math ป.5 · 24h.'
Invoice: Draft → Pending Verification → Paid
Renewal: Invoice ใหม่ต่อ Enrollment ใหม่เสมอ
```

---

## 9. Mock Data (ข้อมูลปัจจุบัน)

### Students
```
Mia Tanaka   | ป.4 | Sukhumvit | Eng (Active) ป.4 | 2 left  | Renewal
Tom Chen     | ป.6 | Sukhumvit | Math ป.6          | 14 left | Active
Ploy Srirak  | ป.5 | Silom     | Math ป.5 + Thai ป.5 | 18 left | Active
James Wilson | ป.5 | Sukhumvit | Science ป.5       | 1 left  | URGENT
Kevin Park   | ป.4 | Sukhumvit | Eng (Active) ป.4  | 16 left | Active
```

### Staff
```
Kru Arm | Math ป.5 / ป.6     | Sukhumvit
Kru Bee | Eng (Active) / Eng | Sukhumvit
Kru Cat | Math ป.6            | Sukhumvit
Kru Dan | Science             | Sukhumvit, Silom
Kru Eve | Thai                | Silom
```

### Branches
```
Sukhumvit | Rooms 1–3 | Eng (Active) available
Silom     | Rooms 1–2 | Thai, Math available
```

---

## 10. Module Status

| Module           | Status      | หมายเหตุ |
|------------------|-------------|----------|
| Dashboard        | 🟡 Partial  | Sessions live, UI density needs review |
| CRM              | 🟡 Partial  | Pipeline OK, Timeline live |
| Inbox            | 🟢 Complete | Chat UI, channel badges |
| Calendar         | 🟢 Complete | Filter, card list view |
| CRM Schedule     | 🟢 Complete | Day/Week, date nav |
| Students         | 🟢 Complete | Filter+sort, unified profile |
| Families         | 🟢 Complete | Modal 4 tabs + Timeline |
| Staff            | 🟢 Complete | Roster, modal 3 tabs |
| Billing          | 🟡 Partial  | course format updated, layout TBD |
| Reports          | 🟢 Complete | 5 tabs, CSS charts, live DB |
| Settings         | 🟢 Complete | 4 tabs, all fields |
| Notifications    | 🟢 Complete | DB-driven, filter+mark read |
| Sessions         | 🟢 Complete | List, filter, Class Modal |
| Attendance       | 🟢 Complete | Log, consumption bars |
| Summaries        | 🟢 Complete | Pending/sent, send to parent |
| Tasks            | 🟢 Complete | DB-driven, add modal |
| Courses          | 🟢 Complete | Subject×Grade catalog, branch filter |
| Classes          | 🟢 Complete | Group by subject+grade+teacher |
| Logs             | 🟢 Complete | Audit trail, Timeline renderer |
| StudentProfile   | 🟢 Complete | Unified modal, 6 tabs |
| Timeline         | 🟢 Complete | Shared renderer |
| SessionCard      | 🟢 Complete | Shared card row |
| AttendancePicker | 🟢 Complete | Shared att buttons |

---

## 11. Working Protocol

### กฎสำหรับ Claude
```
1. อ่าน CLAUDE.md ก่อนทำงานทุกครั้ง
2. เช็ค COMPONENTS.md ก่อนสร้าง component ใหม่
3. แก้ทีละ module เท่านั้น
4. ไฟล์ต้องไม่เกิน 500 บรรทัด
5. ใช้ Utils.subjectLabel() เสมอ — ห้าม hardcode 'Math ป.5'
6. หลังแก้ → update CLAUDE.md + COMPONENTS.md
7. ก่อน approve → รัน Audit Checklist (Section 6)
```

### กฎสำหรับ User (Nock)
```
1. สั่งงาน 1 module ต่อ session
2. Preview ก่อน approve
3. บอก acceptance criteria ให้ชัด
```

### คำสั่งที่ใช้บ่อย
```bash
# Preview
open "/Users/nockacademy/Documents/Claude/Projects/NEW ERP!/index.html"

# Direct link
file:///Users/nockacademy/Documents/Claude/Projects/NEW%20ERP!/index.html

# Git
git add -A && git commit -m "feat: [module] description"
git checkout -- [filename]   # ย้อนกลับ
```

---

*Last updated: 20 May 2026*
*Added: 5 User Roles (Director/AreaMgr/Manager/Admin/Teacher) + Permission Matrix*
*Added: Centralized DB Architecture + Branch Filter rules*
*Added: Leave Quota formula (hours ÷ 8), Reschedule Flow, Transfer Flow*
*Added: Calendar-first Class Template creation, Class vs Session distinction*
*Added: Summary per-student rule, Trial auto-notify flow*
*Revised 20 May 2026: Course = Marketing unit (single/multi-subject), Teacher Grade Range,*
*Branch Setup 7 Steps, Calendar per Day-of-Week template, Holiday Management (Director only),*
*Teacher cross-branch conflict rule, Student assignment suggestion algorithm*
*Revised 20 May 2026: CRM Lead stages updated (test_scheduled/tested/trial_scheduled/trialed),*
*added CRM Form System (3 form types, unique link, stepper, dual notification, Approve/Edit)*
