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

## 7. Data Architecture

### Subject + Grade (สำคัญมาก)
```
Subject = ชื่อวิชา base เท่านั้น: 'Math', 'Eng', 'Science', 'Thai', 'Eng (Active)', 'Eng (Grammar)'
Grade   = แยก field: 'ป.1'–'ป.6', 'ม.1'–'ม.3'
Course  = Subject × Grade (สิ่งที่สาขาเปิดสอน) → display: 'Math ป.5'

// ใน session:
session.subject = 'Math'       ← base เท่านั้น
session.grade   = 'ป.5'        ← แยก field
Utils.subjectLabel(s)          → 'Math ป.5'  ← ใช้สำหรับ display
```

### Architecture: Subject → Course → Class → Session
```
Subject  (Brand catalog)    : Eng, Math, Science, Thai, Eng (Active), Eng (Grammar)
Course   (Branch creates)   : Subject × Grade × Branch — แต่ละสาขาสร้างเอง
Class    (Recurring group)  : Course + Teacher + Room + Schedule
Session  (Each occurrence)  : Class + Date + Attendance + Summary
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

## 8. Business Rules

### Attendance & Consumption
```
Present            → หัก 1 ครั้ง
Absent (no notice) → หัก 1 ครั้ง
Leave (in quota)   → ไม่หัก
Leave (over quota) → หัก 1 ครั้ง
Transfer           → ไม่หัก
Reschedule         → ไม่หัก
```

### Renewal
```
sessionsRemaining ≤ 2 → "Renewal Pending"
sessionsRemaining ≤ 1 → "URGENT"
Renewal = Enrollment ใหม่เสมอ (ไม่ extend เดิม)
```

### CRM Lead Flow
```
New Lead → Contacting → Test → Trial → [Enrolled = กลายเป็น Student]
Archived = lead ที่ drop ออก ต้องบันทึก archivedFrom stage
Trial/Test = Lead เข้า session จริง (isTrial = true) ไม่ consume enrollment
```

### Session Flow
```
Upcoming → Start → ongoing → End → done
→ Summary Pending → Written → Sent → Closed
Summary หลัง sent = immutable (ต้อง delete + resend)
```

### Billing
```
Course display: 'Math ป.5 · 24h.'
Invoice: Draft → Pending → Paid
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

*Last updated: 15 May 2026*
*Subject+Grade architecture: subject และ grade แยก field, ใช้ Utils.subjectLabel() สำหรับ display*
*ERP Design Rules + Component Management System: added Section 5 & 6*
