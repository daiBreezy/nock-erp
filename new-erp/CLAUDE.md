# NockERP — CLAUDE.md
> Claude อ่านไฟล์นี้ทุกครั้งก่อนเริ่มทำงาน — อย่าลืม sync ให้ทันสมัยเสมอ
> ⭐ ก่อนแก้ระบบ **Finance** อ่าน [FINANCE-MODEL.md](FINANCE-MODEL.md) ก่อนเสมอ (โมเดล/flow ที่ตกลงไว้ — ปัจจุบันที่ build ยังไม่ตรง model นี้ทั้งหมด ดู "migration" ในไฟล์นั้น)

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
Language:     HTML5, CSS3, Vanilla JavaScript (ES6+)
Framework:    ไม่มี — No React, No Vue, No dependencies
Fonts:        Inter (system-ui fallback)
Icons:        Material Symbols Rounded (ผ่าน Google Fonts) — ใช้ UI.icon('name')
              ห้ามใช้ Emoji เป็น icon ใน UI อีกต่อไป
Design:       md3.css — Material Design 3 tokens + components (โหลดหลัง main.css)
Storage:      ไม่มี backend — ข้อมูลเป็น mock data ใน JS
```

---

## 3. โครงสร้างไฟล์

```
/NEW ERP!/
├── CLAUDE.md                 ← ไฟล์นี้ — อ่านก่อนเสมอ (lean)
├── FINANCE-MODEL.md          ← ⭐ Finance spec (อ่านก่อนแก้ Finance)
├── BUSINESS-RULES.md         ← Academy business logic (อ่านก่อนแก้ business rule)
├── CHANGELOG.md              ← ประวัติการแก้ไข
├── COMPONENTS.md             ← ⭐ Component catalog (CSS classes + JS patterns)
├── FLOWS.md                  ← Business logic state machines
│
├── index.html                ← Shell: Sidebar + TopNav + view containers
│
├── css/
│   ├── main.css              ← Base layout, sidebar, grid (โหลดก่อน)
│   └── md3.css               ← ⭐ Material Design 3 tokens + ALL components (โหลดหลัง)
│
└── js/
    ├── data.js               ← window.DB + window.CONST  (โหลดก่อนสุด)
    ├── data-settings.js      ← Settings pools: subjects/grades/packages/branchSettings/holidays
    ├── data-reports.js       ← ⭐ window.RD — metrics layer (5 สาขา/2 area · monthly fact table 2025+2026)
    ├── data-finance-settings.js ← ⭐ Finance-only config (categories/approval rules/petty cash/bank accounts/payment
    │                              methods/numbering/permissions) — แยกจาก Academy Settings เด็ดขาด, โหลดก่อน data-finance.js
    ├── data-finance.js       ← ⭐ window.FIN — Finance/Expense data layer (expenses/requests/accounts/recurring · approval tier · visibility)
    ├── data-sync.js          ← ⭐ window.Sync — derived-data layer (enrollments → display caches)
    ├── app.js                ← Navigation + Modal + window.Utils + switchSystem() (app-rail)
    ├── fin-side-panel.js     ← ⭐ Shared: FinPanel (drawer shell + section helpers, ใช้ร่วม fin-requests/fin-expenses)
    ├── fin-dashboard.js / fin-expenses.js / fin-requests.js / fin-reimburse.js / fin-recurring.js / fin-reports.js  ← ⭐ Finance system views
    ├── fin-settings.js       ← ⭐ Finance ▸ Settings shell + General/Categories/Payment Methods/Numbering
    ├── fin-settings-approval.js / fin-settings-accounts.js / fin-settings-permissions.js ← Finance Settings sections (§19)
    ├── ui.js                 ← ⭐⭐ window.UI — Shared Component Library (โหลดก่อน modules)
    ├── session-card.js       ← ⭐ Shared: SessionCard renderer
    ├── attendance-picker.js  ← ⭐ Shared: AttendancePicker
    ├── session-gen.js        ← ⭐ Shared: SessionGen (weekly generation)
    ├── bus-fee.js            ← ⭐ Shared: BusFee (ค่ารถ day-based · ชนวันรวมรอบเดียว)
    ├── data-bank.js          ← ⭐ window.Bank + DB.bankStatements (mock KBiz feed · จับคู่เงินเข้า↔invoice)
    ├── billing-payment.js    ← ⭐ Billing: แนบสลิป → Confirm Paid (KBiz statement) → เข้าคลาส · Void + audit
    ├── enroll-frequency.js   ← ⭐ ปรับรอบเรียน/สัปดาห์ ของ enrollment (ถาวร + boost ก่อนสอบ)
    ├── course-schedule.js    ← ⭐ Shared: CourseSched (เลือกคลาส/รอบ + วันเริ่ม → วันจบ · ข้ามวันหยุด · เช็คที่นั่ง/ชนคลาส)
    ├── timeline.js           ← ⭐ Shared: Timeline renderer
    ├── student-profile.js    ← ⭐ Shared: Unified Profile Modal (6 tabs)
    ├── dashboard.js
    ├── crm.js / crm-schedule.js
    ├── inbox.js
    ├── calendar.js / calendar-class.js / calendar-widget.js
    ├── students.js / families.js / staff.js
    ├── billing.js / reports.js / settings.js
    ├── sessions.js / attendance.js / summaries.js / course-end.js
    ├── notifications.js / tasks.js
    ├── courses.js / classes.js / logs.js
    └── placeholder.js        ← empty (no-op)
```

### Script Load Order (สำคัญมาก)
```
1. data.js              → window.DB + window.CONST
1b. data-settings.js    → DB.subjects / gradesPool / packages / branchSettings / holidays
1c. data-sync.js        → window.Sync + รัน Sync.all() ทันที (derive display caches)
2. app.js               → navigation + Modal + window.Utils
3. ui.js                → window.UI  ← ต้องโหลดก่อน modules ทุกตัว
4. session-card.js      → window.SessionCard
5. attendance-picker.js → window.AttendancePicker
5b. session-gen.js      → window.SessionGen
6. [view modules]       → dashboard, crm, inbox, calendar, students …
7. timeline.js          → window.Timeline
8. student-profile.js   → window.openProfileModal
9. sessions, attendance, summaries, notifications, tasks, courses, classes, logs
10. placeholder.js
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
✅ ใช้: จอกว้าง = card GRID ไหลซ้าย→ขวา (auto-fill minmax) — ห้าม card เต็มความกว้างเรียงลงล่าง
✅ ใช้: list card = ข้อมูลสรุป + badge เท่านั้น — CTA/ปุ่มทั้งหมดอยู่ใน detail modal
✅ ใช้: group records ตาม parent entity (summaries → ตาม class) ไม่ใช่การ์ดต่อ 1 record

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
Admin (Master)        ← 1 คน/สาขา — สร้าง Invoice+Receipt ได้ + มี Digital Signature
Admin (Normal)        ← day-to-day: CRM, Calendar, Attendance (ไม่สร้าง INV)
      ↓
Teacher               ← เห็นเฉพาะ schedule, นักเรียน, session ของตัวเอง
```

### Admin Sub-Tier (Master / Normal)
```
adminTier: 'master' | 'normal'   ← field เพิ่มเติมสำหรับ staff ที่ role = 'admin'

Master Admin:
  - สร้าง Invoice + Receipt ได้เพียงผู้เดียวในสาขา (1 คน/สาขา)
  - มี signature field → upload digital signature image
  - ระบบใช้ signature ของ Master Admin ใส่ลงบน INV + Receipt อัตโนมัติ
  - ไม่มี Director signature บน INV/Receipt อีกต่อไป

Unlock/Transfer:
  - Master Admin เองหรือ Director สามารถ transfer master tier ให้คนอื่นได้ (ชั่วคราว)
  - เมื่อ transfer → คนเดิม = Normal, คนใหม่ = Master
```

### Permission Matrix
```
Feature               Director  AreaMgr   Manager   MasterAdm NormAdm   Teacher
────────────────────────────────────────────────────────────────────────────────
ดูข้ามสาขา           ✅ all     ✅ area   ❌         ❌         ❌         ❌
Invoice / Receipt     ✅         ✅         ✅         ✅ create  ❌ view   ❌
Financial / Billing   ✅         ✅         ✅         ✅         ⚠️ view   ❌
Staff Management      ✅         ✅         ✅         ❌         ❌         ❌
CRM / Leads           ✅         ✅         ✅         ✅         ✅         ❌
Calendar / Sessions   ✅         ✅         ✅         ✅         ✅         ✅ own
Attendance            ✅         ✅         ✅         ✅         ✅         ✅ own
Summary Writing       ✅         ✅         ✅         ✅         ✅         ✅ own
Course End Summary    ✅         ✅         ✅ create  ✅ create  ✅ create  ✅ confirm
Reports               ✅         ✅ area    ✅ branch  ❌         ❌         ❌
Settings              ✅         ❌         ❌         ❌         ❌         ❌
```

### กฎ Role ใน Code
```javascript
// role values ใน DB
staff.role     = 'director' | 'area_manager' | 'manager' | 'admin' | 'teacher'
staff.adminTier = 'master' | 'normal'   // เฉพาะ role = 'admin'
staff.signature = null | 'data:image/...'  // เฉพาะ adminTier = 'master'

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
Course           (Global)         : 2 types — Regular หรือ Bundle (ดูด้านล่าง)
Class            (per branch)     : Teacher × Time Slot × Day — type: 'group' | 'single'
Session          (Generated)      : Class + Date + Students
Enrollment       (per student)    : Regular = Subject + Hours | Bundle = blocksPaid + blockUsed
```

### Course Types ⭐

```
courseType: 'regular' | 'bundle'

── Regular Course ────────────────────────────────────────────
สร้างได้ทั้ง Group หรือ Single class
Billing: ⭐ ราคา 3 ชั้น (เฉพาะเจาะจง → กว้าง):
  1. course.prices                = override เฉพาะ course (Course modal → Course Pricing)
  2. branchSettings.priceMatrix   = Settings → Price Matrix ('Subject|Grade|Hours' ต่อสาขา)
  3. pkgPrice                     = ราคา default ของ tier (Global → Packages & Tiers + branch override)
  เช่น Math/ป.5/24h = 7,200 · Math/ป.6/24h = 7,500 · Science/ป.5/24h = 7,800
  Utils.coursePrice({courseId|subject+grade, hours, branch}) เดินครบ 3 ชั้นให้
  Matrix UI: ช่องว่าง = inherit (จาง) · กรอก = explicit (เข้ม) · ลบ = กลับ inherit
Reschedule: ได้ (ไม่หักชั่วโมง)
Student join: ตอนไหนก็ได้ เริ่มจาก session ถัดไป

── Package Types ─────────────────────────────────────────────
type:'hour' — นับชั่วโมง (24/48/72/96h) · class มาตรฐาน 2h · leave quota = h÷8
type:'week' — ⭐ นับสัปดาห์ (default 4 weeks/course) สำหรับ Liclass:
  - Course มีตารางประจำสัปดาห์ fixed เช่น Mon (Subj 1+2 × 90 นาที), Fri (Subj 2+3 × 90 นาที)
  - class duration ยืดหยุ่น: 30 / 50 / 75 / 90 นาที (ไม่ใช่ 2h เสมอ)
  - consumption หักเป็นสัปดาห์ — เรียนซ้ำตารางเดิมจนครบ weeks
  - enrollment fields (future): weeksPaid, weekUsed
  - ✅ Calendar Day view = minute-based แล้ว (CalendarWidget.renderDay) —
    อ่าน session.startTime + session.durationMin จริง (fallback slot 2h ถ้าไม่มี)
    · class วาง/สูงตามนาที เริ่ม :30 ได้ · week/teacher/month view ยังใช้ slotId

── Bundle Course ─────────────────────────────────────────────
เหมาะสำหรับ: สอบเข้า ม.1, Intensive course มี fixed schedule
สร้างได้เฉพาะ Group class

fields พิเศษ:
  bundleStartDate    : '2026-04-01'
  bundleEndDate      : '2027-02-28'
  bundleDayOfWeek    : 'Sat'          ← วันที่เปิดสอน
  bundleSubjects[]   : [              ← subjects + time slot ใน 1 วัน
    { subjectId:'subj-math',    slotId:'slot-0800' },
    { subjectId:'subj-eng',     slotId:'slot-1000' },
    { subjectId:'subj-science', slotId:'slot-1300' },
  ]
  billingBlockSize   : 4              ← กี่ class days ต่อ 1 block
  billingBlockPrice  : 5900           ← THB per block
  admissionFee       : 1500           ← ค่าแรกเข้า (first enrollment only)

Billing Unit:
  1 Block = billingBlockSize class days = 8h per subject (2h/class × 4 classes)
  Student จ่ายทีละ 1 block หรือหลาย block (multi-block payment)
  ค่าแรกเข้า 1,500 → จ่ายครั้งแรกเพียงครั้งเดียว ไม่มีใน renewal

Lesson Flow:
  Lesson ไหลตาม Class schedule ไม่ใช่ตาม student แต่ละคน
  Student A join Block 1 → เรียน Lesson 1
  Student B join Block 3 → เรียน Lesson 9 (lesson ปัจจุบัน)
  ไม่มี reschedule สำหรับ Bundle — ขาด = ขาด

Hours tracking:
  ทุก Subject ใน Bundle ได้ hours เท่ากัน (= slot duration × blockSize)
  คำนวณอัตโนมัติ — ไม่ต้องกรอกแยก
```

### Class Type
```
classType: 'group' | 'single'   ← tag บน Class เท่านั้น

'group'  → เรียนกลุ่ม (2+ students, soft limit 6)
'single' → เรียนคนเดียวหรือกลุ่มเล็ก (1-2 students)

ราคาเท่ากัน — แค่ tag เพื่อ categorize
Bundle Course → บังคับ 'group' เสมอ
Regular Course → เลือกได้ทั้งสองแบบ
```

### Global Objects
```javascript
// Data
DB.students / DB.families / DB.staff / DB.sessions / DB.enrollments
DB.leads / DB.customers / DB.conversations / DB.messages / DB.dayHeaders
DB.subjects / DB.gradesPool / DB.packages / DB.branchSettings / DB.holidays

// Constants
CONST.GRADES       // ['ป.1','ป.2',...,'ม.6']
CONST.BRANCHES     // ['Sukhumvit','Silom']
CONST.TEACHERS     // ['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve']
CONST.SUBJECT_COLOR // subject → color key
CONST.SLOT_HOURS   // slotId → {s, e}
CONST.STUDENT_STATUS / ATTENDANCE_META / LEAD_STAGES
// ⚠️ CONST.SUBJECTS / CONST.ROOMS = legacy fallback เท่านั้น
//    module ใหม่ต้องใช้ Utils.subjectsFor() / Utils.roomsFor() แทน

// Utils
Utils.subjectLabel(session)         → 'Math ป.5'
Utils.subjectLabel('Math','ป.5')    → 'Math ป.5'
Utils.currency(amt)                 → '฿14,400'
Utils.statusBadge(status)           → <span class="badge ...">
Utils.attBadge(status)              → <span class="badge ...">
Utils.sessionsFor(name)             → sessions[]
Utils.studentByName(name)           → student
Utils.renewalStatus(id)             → 'active'|'renewal'|'pause'|'archived'
Utils.statusBadge(status, left?)    → badge แดงถ้า renewal + left ≤ 1

// Utils — Settings-driven catalogs ⭐ (single source = Settings)
Utils.subjectsFor(branch?)          → ชื่อวิชา active ของสาขา
Utils.packagesFor(branch)           → packages เปิดใช้ + ราคา override ต่อสาขา
Utils.pkgPrice(branch, hours)       → ราคา package ตามสาขา
Utils.roomsFor(branch)              → ชื่อห้องของสาขา
Utils.openDays(branch)              → วันเปิดทำการ ['Tue','Wed',...]
Utils.enrollmentsFor(studentId)     → enrollment records
Utils.summariesForStudent(name)     → {session[], courseEnd[]} (derived · ไม่เก็บซ้ำที่ student)
Utils.leaveQuota(enr)               → packageHours ÷ 8

// Sync — derived-data regenerator (js/data-sync.js) ⭐
Sync.all()             // เรียกหลังแก้ Settings — regenerate ทุก cache
Sync.branchPricing()   // packages → DB.branchPricing
Sync.studentCourses()  // DB.enrollments → student.courses[] (display cache)
Sync.dayHeaders()      // DB.holidays → dayHeaders.isHoliday
```

### Single Source of Truth (สำคัญมาก) ⭐
```
DB.enrollments        = ชั่วโมง/block ของนักเรียน — student.courses[] เป็นแค่ display cache
DB.packages + branchSettings.packages[].price = ราคา — DB.branchPricing เป็น derived
DB.branchSettings.rooms = ชื่อห้อง (แก้ใน Settings → Branch Info)
DB.branchSettings.regularHours = วันเปิดทำการ (Classes form disable วันปิดอัตโนมัติ)
DB.holidays           = วันหยุด → dayHeaders.isHoliday (Calendar ขึ้นเอง)
enr.leaveUsed         = โควต้าลาที่ใช้ไป — calConfirmLeave เพิ่มให้อัตโนมัติ

ห้ามแก้ display cache ตรงๆ — แก้ที่ source แล้วเรียก Sync
```

---

## 9. Business Rules ⭐
> ⬇️ ย้ายไป [BUSINESS-RULES.md](BUSINESS-RULES.md) เพื่อลด context ที่โหลดทุก turn — อ่านก่อนแก้ business logic (attendance/leave/reschedule/transfer/summary/CRM/calendar/bundle/course-end/billing)

## 9. Mock Data (ย่อ — รายละเอียดเต็มอยู่ใน js/data.js)

- **Students** 7 คน (enr-001..009 ใน DB.enrollments; hours sync จาก enrollments) · James Wilson = URGENT (1 left) · Win Klahan = Bundle Admission ม.1
- **Staff:** Kru Arm/Cat(Math) · Kru Bee(Eng) · Kru Dan(Science, Sukhumvit+Silom) · Kru Eve(Thai, Silom) · Admin Nock(admin master+signature, **specialAdmin**) · Nock(director) · Manager Mint(manager) — fields ดู data.js
- **Branches (operational):** Sukhumvit (Room A/B/C, ราคา global) · Silom (Room A/B, override ถูกกว่า) · Finance ใช้ 5 สาขาจาก DB.reportBranches (Sukhumvit/Silom/Bang-Na/Sriracha/Pattaya)
- **Bundle demo:** crs-006 Admission ม.1 → cls-007/8/9 → s18/19/20 → enr-009 (Win) → INV-2026-0050 (13,300 paid)

---

## 10. Module Status

| Module           | Status      | หมายเหตุ |
|------------------|-------------|----------|
| Dashboard        | 🟢 Complete | Sessions live · Revenue KPI = paid invoices จาก DB.invoices จริง (ไม่ใช่ ฿0) · ROW2 align-items:start (การ์ดสูงตามเนื้อหา ไม่ยืดเปล่า) |
| CRM              | 🟢 Complete | Pipeline kanban + Timeline · lead card โชว์ grade badge (childGrade) แทน "Age undefined" (fix) · detail modal Grade field |
| Inbox            | 🟢 Complete | Chat UI, channel badges |
| Calendar         | 🟢 Complete | Filter, card list view |
| CRM Schedule     | 🟢 Complete | Day/Week, date nav |
| Students         | 🟢 Complete | Filter+sort, unified profile |
| Families         | 🟢 Complete | Modal 4 tabs + Timeline |
| Staff            | 🟢 Complete | Roster + Add/Edit + Profile modal · roleAssignments · adminTier + signature (Master Admin) · effectiveLoad workload |
| Billing          | 🟢 Complete | ⭐⭐ **State machine ยืนยันเงินเข้า** (`js/billing-payment.js`) — `draft → sent → pending (มีสลิป) → paid` · void ได้ทุกสถานะก่อน paid · **เด็กเข้าคลาสได้เมื่อ paid เท่านั้น** (เดิม confirmed สร้าง enrollment โดยยังไม่รู้ว่าจ่ายหรือยัง) · flow จริงของ Admin: ผู้ปกครองส่งสลิปทาง LINE → Admin **แนบสลิป** (`billingUploadSlip`) → เปิด **KBiz เช็ค statement** → **Confirm Paid** — ⭐ **จับคู่กับ statement KBiz** (`js/data-bank.js → window.Bank`): ระบบไล่หารายการเงินเข้าที่น่าจะใช่ (ยอดตรง+วันใกล้+สาขาเดียวกัน = คะแนนสูง) → Admin กดเลือก → ผูก 2 ทาง `inv.statementId ↔ stmt.matchedInvoiceId` · **1 statement ใช้ได้บิลเดียว** · ปุ่ม "ดึงรายการใหม่" = `Bank.sync()` · ไม่เจอ → ติ๊ก "กรอกเลขเอง" (flag `statementManual`) · เงินสด = ข้าม · **ยืนยันไม่ได้ถ้ายังไม่จับคู่** · เลข ref โชว์บนใบ invoice (`_stmtBlock`) → ตัดสต็อก + `Billing.enroll()` เข้า roster + เข้า Revenue + ออกใบเสร็จได้ · เตือน**จ่ายเกิน/ขาด** (`inv.amountDiff`) · **สลิปไม่ถูกต้อง** → ตีกลับเป็น sent (เก็บใน `rejectedSlips[]`) · **Void** = เหตุผลบังคับ + `voidReason`/`voidedBy`/`replacedBy` + สร้างใบใหม่ทดแทนอัตโนมัติ (`replaces`) · `inv.history[]` = audit trail · modal เหลือ 2 ปุ่ม (Save Draft / Create & Send) · ⭐⭐ **Course Schedule picker ใน New Invoice** (`js/course-schedule.js → window.CourseSched`) — เลือก course แล้วกางตารางในบรรทัดนั้นเลย: เลือกคลาส/รอบ (Bundle = รอบ Sat/Sun เลือกรอบเดียว สัปดาห์ละครั้ง · 1 block = billingBlockSize ครั้ง) · ⭐ **ความถี่/สัปดาห์** — Single course default **สัปดาห์ละ 1 ครั้ง** เลือกได้สูงสุด 2 วัน (คลาสเปิดหลายวันไม่ได้แปลว่านักเรียนมาทุกวัน) → วันจบขยับตามอัตโนมัติ · ที่นั่ง n/6 (เต็ม=disable) · **วันเริ่ม default = วันเรียนถัดไป เลื่อนไปข้างหน้าได้** · **วันจบคำนวณอัตโนมัติ ข้ามวันหยุด** (แสดงว่าข้ามวันไหน) · เตือน**ชนคลาสเดิม**ของนักเรียน · Bundle เข้ากลางคัน = badge "เข้าที่ครั้งที่ N" · ไม่มีคลาสรองรับ → ปุ่มไปสร้างที่ Classes · ผลลัพธ์ติดไปกับ `inv.lines[].{classIds,startDate,endDate,meetings,blocks}` + `inv.chosenSchedule[courseId]={classIds,startDate,…}` → `Billing.enroll()` สร้าง enrollment ครบทุกวิชาของ Bundle พร้อม startDate จริง · BusFee/Book fee อ่านจาก**รอบที่เลือกจริง**และ**ทุกวิชาใน Bundle** · ⭐ Invoice **line items** (inv.lines[] + discount) · New Invoice = multi-course (Add/Remove course) → auto Subtotal/Promotion/Total ผ่าน Utils.applyPromotion → save เข้า DB.invoices จริง (id max+1) · doc preview render หลายบรรทัด · Utils.invoiceLines/Subtotal/Hours (fallback ใบเก่า) · ⭐ **Receipt splitting** (`js/billing-receipt.js`, spec 04) — Receipt tab = manager: coverage bar ราย line · Auto/Manual แตกตาม line · RE numbering /n · Customer Tax ต่อใบ · discount ผูกใบแรกที่มี course line (Σ=invoice) · gate เฉพาะ Paid |
| Bus Route        | 🟢 Complete | ⭐⭐ **รื้อ model ใหม่ Route-based (Liclass only)** `js/bus-route.js` (+`bus-views.js`, spec 15) · **`DB.busRoutes[]`** = Route (คัน × รอบ × รับ/ส่ง × วัน × stops ordered) — `kind:'pickup'|'dropoff'` · `round:N` (หลายรอบ/วัน) · `days[]` · `anchor` (เวลาถึง/ออกโรงเรียน · engine `computeSchedule` ย้อนกลับ) · stop มี `withParent`(+1 ที่นั่ง)/`dist` · Scope = **Sriracha + Thonglor** เท่านั้น · 4 tabs: **Daily** (การ์ดรายรอบ · schedule + stops · Approve→Start→Live · date nav) · **Weekly** (ตารางเดินรถทั้งสัปดาห์: แถว=Route × คอลัมน์=จ–อา · ช่อง เวลา+จำนวน+สีรับ/ส่ง · คลิก→Daily) · **Routes** (CRUD: สร้าง/แก้/ลบ · **Drag&Drop** จัดลำดับจุด `br-grip` · Add student + พ่วงผู้ปกครอง · candidate จาก busRoster autofill) · **Vehicles** · **Live Tracking** (`brTrack` route-based) · **Driver sheet** (`brSheet` route-based) · **Timeline** (`brTimeline`) · ⏳ batch หน้า: Map view (real map, ต้อง lat/lng) · reschedule class↔bus · `bus-report.js` = dead code รอรื้อ |
| Inventory        | 🟢 Complete | ⭐ `js/inventory.js` (spec 14) · KPI (items/Warning/Out/มูลค่า) · ตาราง+filter · detail modal (supplier+Reorder+**Stock Movements**) · 4 movement types (sale-invoice/standalone/giveaway/restock) · Add/Edit · ⏳ follow-up: ผูก Book fee บน Invoice |
| Period Close     | 🟢 Complete | ⭐ `js/period-close.js` (spec 08) · month-end bundle ส่ง KMD · month selector · **Final-gate validation** 6 rules (Service Bill ครบชุด/RE/Bank/SalesTax/WHT/vendor) · **Bundle checklist** 6 หมวด · **Service Bills** จับคู่ INV+RE+Payslip (ดึง DB.invoices+DB.receipts) · gate ปุ่มส่ง Shibasan จน validation ผ่านครบ · Export manifest · บาง input รอ KMD (bank lines/sales-tax cols/WHT-vendor) |
| Reports          | 🟢 Complete | ⭐ **Executive BI** — อ่านจาก metrics layer (data-reports.js / window.RD: 5 สาขา/2 area · 2025+2026 YTD seed) · scope switcher (Company/Area/Branch) · time engine (Period × Compare + auto MoM/QoQ/YoY delta) · 7 tabs: **Overview** (KPI+delta, period strip, Revenue YoY, attendance donut, Needs Attention) · **Compare** (leaderboard heatmap + benchmark + per-student toggle + contribution; Manager ไม่เห็น) · **Financial** (Outstanding/Discount/ARPU + Family LTV) · **Students** (net growth, churn split, retention, cohort) · **Acquisition** (source/funnel/velocity) · **Courses** (package Volume/Value + Subject engine + Package×Grade) · **Operations** (teacher health + utilization + Demand Heatmap pivot) |
| Settings         | 🟢 Complete | ⭐ Scope switcher: dropdown = 🌐 Global (Director) / สาขา — ทั้งหน้าเปลี่ยนตาม scope · Global: Subjects Pool / Grades Pool / Packages & Tiers / Holidays · Branch: Info / Scheduling / เปิดวิชา-เกรด-แพ็กเกจ / **Promotions** (ในหน้า Packages) / Price Matrix / Invoice · stShowSection() router |
| Authorize        | 🟢 Complete | ⭐ `js/auth.js` — Admin เพิ่ม Staff → **เฉพาะ email นั้น login ได้** · role/สาขาดึงจาก roleAssignments (top role) · session ค้างตอน reload · `applyRoleGate()` ซ่อนเมนูตาม role (Teacher = ชุดสอนเท่านั้น · Settings = Director) · ⚠️ front-end gate ไม่มี backend/password |
| Notifications    | 🟢 Complete | DB-driven, filter+mark read |
| Sessions         | 🟢 Complete | ⭐ ศูนย์ปฏิบัติการ — filter + **Group by selector (Day/Teacher/Branch/Status)** · แต่ละแถวกาง inline accordion (lazy render) โชว์ attendance รายคน + summary + AttendancePicker · upcoming = โชว์ roster เฉยๆ · ปุ่ม "Open full class" → Class Modal · ปุ่ม **Generate next week** (SessionGen) |
| SessionGen       | 🟢 Complete | js/session-gen.js — generateWeek(monday,{commit}) จาก DB.classes · เฉพาะนักเรียน hours/blocks เหลือ · ข้าม holiday + class ว่าง · id เสถียร gen-<monday>-<classId>-<col> (regen ไม่ซ้ำ) |
| Attendance       | 🟢 Complete | ⭐ reframe เป็น report/history — Consumption รายคน + Attendance History (audit log, filter ได้) · เช็คชื่อจริงทำที่ Sessions (sessToggle) ไม่ใช่หน้านี้ |
| Summaries        | 🟢 Complete | 2 tabs (Session / Course End) · Session tab: filter bar (Search + Course/Subject/Grade/Teacher dropdowns จาก DB จริง) + status chips นับจำนวน (Awaiting/Draft/Not Written/Sent) + sort ใหม่→เก่า/เก่า→ใหม่ · AND filtering · card grid หัวคั่นตามวัน "Day (Today) · n classes" · Bundle = 1 course entry → subject-session ติด badge ม่วง · ไม่มีปุ่มบนการ์ด |
| CourseEnd        | 🟢 Complete | js/course-end.js — draft→pending_teacher→approved→sent, PDF, Inbox send, auto-draft เมื่อ enrollment หมด |
| Tasks            | 🟢 Complete | DB-driven, add modal |
| Courses          | 🟢 Complete | Subject×Grade catalog, branch filter |
| Classes          | 🟢 Complete | Group by subject+grade+teacher |
| Logs             | 🟢 Complete | Audit trail, Timeline renderer |
| StudentProfile   | 🟢 Complete | Unified modal, **7 tabs** (Overview/Sessions/**Summaries**/Attendance/Payment/Notes/Timeline) · Summaries tab = derived view ผ่าน Utils.summariesForStudent (session + course-end ดึงสดจากต้นทาง ไม่เก็บซ้ำ) |
| Timeline         | 🟢 Complete | Shared renderer |
| SessionCard      | 🟢 Complete | Shared card row |
| AttendancePicker | 🟢 Complete | Shared att buttons |
| **Finance system** | 🟢 Complete | ⭐ **แยกระบบจาก Academy** ผ่าน app-rail (ClickUp 2-tier nav: icon rail = สลับระบบ Academy/Finance/HR-soon + **user avatar อยู่ล่าง rail** · `switchSystem()` ใน app.js สลับ `#nav-academy`/`#nav-finance`). Sidebar รอง = **เมนูล้วน** (เอา logo + user card ออก เหลือ search/noti/menu). Modular data layer `js/data-finance.js → window.FIN` (DB.expenses/expenseRequests/financeAccounts/recurringPayments) · petty-cash float รัน balance (ติดลบได้, top-up = 'received') · Central Bank จ่ายตรง · reimbursement track · approval tier (1k→Mgr · 3k→AreaMgr · 5k→Director/Special) · visibility ตาม role+area (FIN.visibleBranches) · specialAdmin flag (live = CURRENT_USER.specialAdmin) |
| ↳ FIN ▸ Dashboard | 🟢 Complete | ⭐ js/fin-dashboard.js (rename จาก fin-overview.js, §19) — **command center, ไม่ทำงานเอง** (ตาม UX Constitution: Dashboard = surface attention only, ไม่ duplicate review UI): KPI (Needs attention · Pending approvals **คลิก→ไป fin-requests ตรงๆ** · Spend MoM · Central Bank +**runway เดือน**) · **Needs attention** alert cards (problem→impact→action ชี้ไปเมนูที่เกี่ยว — pending req→fin-requests, reimburse→fin-reimburse) · **Branch petty — budget/used/remaining** (budget ต่อสาขาจาก `FIN.pettyBudget(branch)`, §19 — ไม่ใช่ flat constant แล้ว) + period compare · **Upcoming/forecast** (recurring due + fixed cost/mo) · spendOps = discretionary (ไม่รวม salary/rent) |
| ↳ FIN ▸ Expenses  | 🟢 Complete | ⭐ js/fin-expenses.js — **ledger ประวัติเท่านั้น** (ไม่มี tab Pending/ปุ่ม New Request/approval UI — ย้ายไป FIN▸Requests หมด) · **ตาราง 100% width เสมอ** (ไม่ใช่ split-panel) — คลิกแถว → **Side Panel drawer** สไลด์เข้าจากขวา (shared shell `js/fin-side-panel.js → window.FinPanel`, เหมือน Requests ทุกประการ) · cols Date/Type/Category/Description/Amount/Source/**Request by**(ชื่อผู้ยื่น request จริงถ้ามาจาก Direct Paid ผ่าน `e.sourceRequestId`, "—" ถ้าเป็น log ธรรมดา)/Location/Status + per-week **+/− total พร้อม collapse chevron** · filters Source/Branch/Status/Category · **Record Usage = inline batch editor** (`#fx-batch-editor`, ขยายในหน้าเดียวกัน ไม่ใช่ modal) — cols File/Date/**Type**/Category/Description/Amount/Source/Location/Status · Method A: ลาก/เลือกไฟล์ใบเสร็จหลายไฟล์ → mock AI อ่านสร้างแถว editable ต่อไฟล์ (thumbnail จริง, ช่องไม่มั่นใจเว้นว่าง ไม่เดา) · Method B: "+ Add Row" กรอกมือ ตารางเดียวกัน · ช่องที่ขาดข้อมูล = **ขอบสีเหลืองบน field เอง** + badge **Required**/**Ready** · **Save all = partial validation** (แถว Ready บันทึก+หาย, แถวขาดข้อมูลอยู่ต่อ ไม่ปิด editor จนครบ) · Cancel = text-link ยุบ section · แก้ไข record เดิม 1 รายการ = flow แยก (`fxEditOne`, ไม่ใช่ batch) · **ไม่มี Delete — Inactivate เท่านั้น** · **Detail drawer มี Info/Logs tabs** (มาจาก mockup ที่ Nock ส่งมา §18 — ไม่ใช่ scroll เดียวไม่มี tab แบบที่เคย build ไว้ก่อนหน้า) Info tab: title→badges→meta→**Information**(paid to/amount)→**Files**(gallery มี label กำกับ Invoice/Transfer slip/Tax invoice) · Logs tab: `FinPanel.timeline` audit history · `FIN.markTransferred`/`uploadReqTaxInv` ส่ง acct fields+invoice+slip+tax-invoice ต่อเข้า Expense ที่เกิดจาก Direct Paid ให้ไม่หาย · ดู FINANCE-MODEL.md §13/§16/§18 |
| ↳ FIN ▸ Requests  | 🟢 Complete | ⭐⭐ js/fin-requests.js — **ตาราง 100% width เสมอ** (ไม่ใช่ master-detail split แบบเดิมแล้ว — Nock ตัดสินใจ 6 Jul 2026 ให้กลับไปแบบ Expense เดิม) คลิกแถว → **Side Panel drawer** สไลด์เข้าจากขวา (shared shell `js/fin-side-panel.js`, `↑`/`↓` เลื่อน drawer ไปแถวถัดไป) Direct Paid + Petty Top-up เท่านั้น (Reimbursement แยกหน้า — approver คนละคน) · **3 tabs by "ใครต้องทำ" ไม่ใช่ by stage**: **Needs your action** (default, เรียงค้างนานสุดก่อน, badge-fin-requests, cols …Needs/Status) / **Awaiting others** (…Waiting on/Status) / **History** (…Result/Decided by) · FIN.actionableRequestsFor/awaitingOthersFor/requestHistoryFor · **+ New Request** → Direct Paid (Vendor+**Account name/Account number/PromptPay แยก 3 ช่อง**+invoice เก็บ docDataUrl จริง) / Petty Top-up · **Request lifecycle:** Pending→Approved(รอโอน KBiz)→Paid(แนบสลิป)→Closed(tax inv, สร้าง Ledger ตรงนี้) · **Detail drawer ตาม mockup (§18): Info/Logs tabs** — Info: title→badges→meta→note (ไม่มี Vendor แยก เพราะจ่ายตรง vendor เสมอ) →**Payment method**→**"Workflow & File upload"** (ช่องเดียวรวม Workflow+Files, ปุ่ม/thumbnail อัปโหลดไฟล์ฝังอยู่ใน step ปัจจุบันเลย ผ่าน `workflowFileSteps()`+`FinPanel.timeline`'s `extra` slot) → ปุ่ม footer เดียว state-driven (Approve/Reject → **Confirm upload**(disabled จนกว่าจะแนบไฟล์) → **Confirm upload & Complete**) · Logs tab = audit history แยกต่างหาก · **Reject บังคับ remark** · `r.approveRemark` แยกจาก `r.remark`(reject/cancel) กันทับกัน · ดู FINANCE-MODEL.md §11-12/§16/§18 |
| ↳ FIN ▸ Reimbursement | 🟢 Complete | ⭐ js/fin-reimburse.js — staff สำรองจ่าย → claim คืน · **ทุก role สร้างได้ รวม Teacher** (เปิด Finance ให้ Teacher เห็น**เฉพาะเมนูนี้ + คำขอตัวเอง** ผ่าน applyFinanceNavGate ใน app.js) · **Detail = FinPanel drawer (Info/Logs tabs)** เหมือน Expenses/Requests แล้ว (เลิก modal เก่า, §18) — Info: title→badges→**Payment method (pay back to staff: Pay to/Bank/Account/PromptPay + QR)**→Files gallery(payslip/tax/payback slip)→Workflow timeline · **Create modal เก็บบัญชีปลายทาง** (payTo/payBank/payAcctNumber/payPromptPay + QR) — payslip บังคับ · ตาราง 100% width คลิกแถว→drawer · **2-tier approve:** branch Admin+ จ่ายจาก **Petty สาขา** · **Forward to Central** (mockup "Forward Reason": Amount too high/Problem with info/Wrong info/Other) → Director/Special จ่ายจาก **Central Bank** แทน · footer state+role-driven (pending→Forward\|Reject\|Approve&Pay · forwarded→Reject\|Approve&Pay(Central) · payback slip optional) · Pending→Forwarded→Paid/Rejected(**remark บังคับ**) · FIN.reimActionableFor/reimActor/forwardReimbursement/isReimCentralApprover · badge = reimActionableFor |
| ↳ FIN ▸ Recurring | 🟢 Complete | js/fin-recurring.js — ⭐ **Salary per-branch payee breakdown** (lines จาก DB.staff · SALARY_BY_ROLE) + status badge (paid/due/scheduled, **ไม่มี Post/Inactive action**) · Rent & Utilities table · **6-month Forecast** · detailed create (Salary: branch→staff lines→payday / Rent) |
| ↳ FIN ▸ Reports   | 🟢 Complete | js/fin-reports.js — period chips · KPI · **branch comparison** (bars) · **income vs outcome by month** · spend-by-category · recurring forecast (FIN.forecast) |
| ↳ FIN ▸ Settings  | 🟢 Complete | ⭐⭐ 4 ไฟล์ (`fin-settings.js` + `-approval`/`-accounts`/`-permissions.js`, §19) — **แยกจาก Academy Settings เด็ดขาด** เจ้าของ config เอง (`js/data-finance-settings.js`) shell แบบ Academy Settings (left-nav `.st-nav-item` + panel) 8 sections: **General**(currency/fiscal year/default branch/tax behavior — เก็บ config ยังไม่มีจุดคำนวณอ่าน) · **Categories**(CRUD, ย้ายมาจาก hardcoded CATEGORIES เดิม) · **Approval Rules**(gate เดิม 1k/3k/5k ตอนนี้แก้ได้) · **Petty Cash**(ตารางแถวต่อสาขา — ย้ายมาจาก flat PETTY_BUDGET=10000) · **Bank Accounts**(directory จริง ใช้ quick-fill ตอนสร้าง Direct Paid request) · **Payment Methods**(CRUD แล้ว แต่ยังไม่ wire เข้า Requests' dropdown เดิม) · **Numbering**(`PREFIX-YEAR-PADDEDSEQ`, `FIN.nextDocNumber()` — record ใหม่ได้เลขนี้ ของเก่า id เดิมไม่เปลี่ยน) · **Permissions**(⚠️ preview/edit เท่านั้น ยังไม่ต่อเข้า authorization จริง — Phase 2) · ดู FINANCE-MODEL.md §19 |

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

⭐ UI RULES (บังคับ — ห้ามละเมิด)
8.  ใช้ UI.pageHeader()   สำหรับ page header ทุกหน้า
9.  ใช้ UI.kpiGrid()      สำหรับ KPI cards ทุกหน้า
10. ใช้ UI.filterBar()    สำหรับ filter + search bar ทุกหน้า
11. ใช้ UI.badge()        แทนการเขียน <span class="badge ..."> ตรงๆ
12. ใช้ UI.icon('name')   แทน Emoji สำหรับ icon ทุกตัว
13. ใช้ UI.avatar()       แทนการเขียน <div class="avatar" style="..."> ตรงๆ
14. ใช้ UI.emptyState()   สำหรับ empty state ทุกที่
15. ใช้ CSS variables     แทน hardcode color เช่น var(--md-primary) แทน #6366f1
16. ใช้ CSS classes       แทน inline style เช่น class="text-muted" แทน style="color:#9ca3af"
17. ห้ามเขียน style="color:#xxx" ทุกกรณี — ใช้ .text-primary .text-muted .text-error .text-success .text-warning
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

*Last updated: 20 Jul 2026 — ประวัติการแก้ไขทั้งหมด: [CHANGELOG.md](CHANGELOG.md)*
