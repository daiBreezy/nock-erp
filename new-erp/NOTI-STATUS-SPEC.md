# NockERP — Notification & Status Specification
> สำหรับ Dev team — ข้อมูลจาก codebase จริง (data.js + notifications.js)
> Last updated: 21 May 2026

---

## 1. STATUS TYPES — ทุก Entity

### 1.1 Student Status
ใช้ใน: `student.status` | แสดงใน: Students list, Profile modal, Dashboard

| Value | Label | Badge | Trigger |
|-------|-------|-------|---------|
| `active` | Active | 🟢 green | Default — เรียนปกติ, sessions เหลือ > 2 |
| `renewal` | Renewal | 🟡 yellow (2 left) / 🔴 red (1 left) | sessions remaining **≤ 2** |
| `pause` | Pause | ⚫ gray | Auto: sessions = 0 / Manual: Admin กด (เช่น ไปต่างประเทศ) |
| `archived` | Archived | ⚫ gray | Manual: ลาออกถาวร (Restore ได้ → Active) |

**หมายเหตุ:**
- ไม่มี `status = 'urgent'` แยก — ใช้ `renewal` เดียว แต่ badge เปลี่ยนสีตาม sessions left
  - sessions = 2 → badge 🟡 yellow
  - sessions = 1 → badge 🔴 red (urgent visual)
- Status คำนวณ real-time จาก `enrollment.sessionsRemaining`
- Renewal ≠ ต่อ enrollment เดิม → สร้าง enrollment ใหม่เสมอ

---

### 1.2 Lead Stage (CRM Pipeline)
ใช้ใน: `lead.stage` | แสดงใน: CRM → Leads, Pipeline

```
new → contacting → test_scheduled → tested
                                  ↘
                              trial_scheduled → trialed
                                                      ↘
                                                 payment_pending → enrolled ✓

ทุก stage → archived  (drop ออกได้เสมอ)
```

| Value | Label | Color | คำอธิบาย |
|-------|-------|-------|----------|
| `new` | New Lead | 🟣 indigo | เพิ่งเข้ามา, ยังไม่ได้ติดต่อ |
| `contacting` | Contacting | 🟡 amber | Admin กำลัง follow up |
| `test_scheduled` | Test Scheduled | 🟣 purple | นัด Test แล้ว, รอวัน test |
| `tested` | Tested | 🟡 dark-amber | ทำ Test แล้ว, รอ Trial |
| `trial_scheduled` | Trial Scheduled | 🟢 emerald | นัด Trial แล้ว |
| `trialed` | Trialed | 🟢 dark-green | เรียน Trial แล้ว |
| `payment_pending` | Payment Pending | 🔴 red | รอชำระเงิน / ส่ง slip |
| `enrolled` | Enrolled ✓ | 🟢 dark-green | สมัครเรียนแล้ว → กลายเป็น Student |
| `archived` | Archived | ⚫ gray | Drop จาก pipeline (บันทึก `archivedFrom`) |

**Sub-stage badges** (แสดงบน Kanban card):
- `test_scheduled` → 📅 "Scheduled" + วันที่
- `tested` → ✅ "Tested"
- `trial_scheduled` → 📅 "Scheduled" + วันที่
- `trialed` → ✅ "Trialed"

**กฎ archived:**
- บันทึก field `archivedFrom: <stage>` เสมอ
- สามารถ Restore กลับ stage เดิมได้ (ปุ่ม ↩ Restore)

---

### 1.3 Attendance Status
ใช้ใน: `session.attendance[studentName]` | แสดงใน: Attendance module, Session card

| Value | Label | Badge | หักชั่วโมง | คำอธิบาย |
|-------|-------|-------|-----------|----------|
| `present` | Present | 🟢 green | ✅ หัก 1 | มาเรียนปกติ |
| `absent` | Absent | 🔴 red | ✅ หัก 1 | ขาด ไม่แจ้ง |
| `leave` | Leave | 🟡 yellow | ❌ ไม่หัก | ลาใน quota (quota = total_hours ÷ 8) |
| `leave_over` | Leave (Over Quota) | 🟠 orange | ✅ หัก 1 | ลาเกิน quota |
| `reschedule` | Reschedule | 🔵 blue | ❌ ไม่หัก | ย้าย session ไปวันใหม่ |
| `transfer` | Transfer | 🟣 purple | ❌ ไม่หัก | ย้ายสาขา/ย้ายครู, hours ติดตามนักเรียน |

**Leave Quota formula:**
```
quota = Math.floor(total_hours / 8)

Package 24h  → 3 leaves
Package 48h  → 6 leaves
Package 72h  → 9 leaves
Package 96h  → 12 leaves
```

---

### 1.4 Session State
ใช้ใน: `session.state` | แสดงใน: Calendar, Sessions list

| Value | Label | คำอธิบาย |
|-------|-------|----------|
| `upcoming` | Upcoming | ยังไม่เริ่ม |
| `active` / `ongoing` | Live 🔴 | กำลังสอนอยู่ |
| `ended` / `done` | Ended ✅ | จบแล้ว |

**Session Flow:**
```
upcoming → [Admin clicks Start] → active/ongoing
         → [Admin clicks End]   → ended/done
         → [Teacher writes summary per student]
         → [Admin sends summary to parent]
         → closed
```

**Summary states** (per student per session):
- `{ text: null, sent: false }` → ยังไม่เขียน
- `{ text: "...", sent: false }` → เขียนแล้ว รอส่ง
- `{ text: "...", sent: true }` → ส่งแล้ว → **immutable** (ต้อง delete + resend)

---

### 1.5 Invoice Status
ใช้ใน: `student.invoices[].status` | แสดงใน: Billing module

| Value | Label | Badge | คำอธิบาย |
|-------|-------|-------|----------|
| `draft` | Draft | ⚫ gray | Admin สร้าง invoice ยังไม่ส่ง |
| `pending` | Pending Verification | 🟡 yellow | Parent ส่ง slip แล้ว รอ Admin ยืนยัน |
| `paid` | Paid | 🟢 green | Admin ยืนยัน payment แล้ว |

---

### 1.6 Form Submission Status
ใช้ใน: `DB.formSubmissions[].status` | แสดงใน: Inbox (chat bubble), CRM pipeline card

| Value | Label | คำอธิบาย |
|-------|-------|----------|
| `pending` | ⏳ Pending Review | Parent submit แล้ว รอ Admin Approve |
| `approved` | ✅ Approved | Admin อนุมัติ → สร้าง records ทันที |
| `rejected` | ❌ Rejected | Admin ปฏิเสธ → แจ้ง parent |

**Form Types:**
- `test` — Test Form (นัด test วิชา/ระดับ)
- `trial` — Trial Form (นัด trial class)
- `enrollment` — Enrollment Form (5 steps: Family Info → Course → Class → Payment → Summary)

**Unique Token:** ทุก form submission มี `token` อายุ 7 วัน
- รู้ว่าส่งให้ lead ไหน, ส่งโดยใคร, สาขาไหน

---

### 1.7 Staff Role
ใช้ใน: `staff.role` | ใน Permission matrix

| Value | Label | สิทธิ์หลัก |
|-------|-------|-----------|
| `director` | Director (CEO) | เห็นทุกอย่าง ทุกสาขา |
| `area_manager` | Area Manager | ดูแลหลายสาขาใน Area |
| `manager` | Branch Manager | ดูแลสาขาตัวเอง |
| `admin` | Admin | จัดการ day-to-day (CRM, Calendar, Attendance) |
| `teacher` | Teacher | เห็นเฉพาะ schedule + นักเรียน + session ของตัวเอง |

---

## 2. NOTIFICATIONS — ทุก Trigger

### 2.1 ตาราง Notification ทั้งหมด

| # | ID | ชื่อ Noti | Priority | Trigger Condition | ผู้รับ | Channel |
|---|----|-----------|---------|--------------------|--------|---------|
| 1 | `renew-urgent-{id}` | URGENT: {student} | 🔴 danger | `student.status === 'urgent'` (≤ 1 class) | Admin, Manager | In-app + LINE Notify |
| 2 | `renew-{id}` | Renewal: {student} | 🟡 warning | `student.status === 'renewal'` (≤ 2 classes) | Admin | In-app + LINE Notify |
| 3 | `summ-pending` | {N} Summary Not Written | 🟡 warning | `session.state === 'done'` + `summary.text === null` | Teacher (ของตัวเอง), Admin | In-app |
| 4 | `summ-send` | {N} Summary Ready to Send | 🔵 info | `summary.text` ≠ null + `summary.sent === false` | Admin | In-app |
| 5 | `leads-new` | {N} New Lead(s) Not Contacted | 🔵 info | `lead.stage === 'new'` | Admin, Manager | In-app |
| 6 | `today-sessions` | {N} Sessions Today | 🔵 info | session.date === today + state === 'upcoming' | Teacher, Admin | In-app |
| 7 | `billing-pending` | Invoice รอ Verify | 🟡 warning | invoice.status === 'pending' + > 12 ชม. | Admin | In-app |

---

### 2.2 Notification Detail (ทีละ trigger)

#### 🔴 #1 — URGENT Renewal
```
Trigger:   student.remainingSessions <= 1  (status = 'urgent')
Title:     "URGENT: {student.name}"
Body:      "เหลือ {N} class เท่านั้น — ถ้าไม่ต่อจะหมดสัญญา"
Time tag:  "เร่งด่วน"
Action:    [Follow Up] → openFollowUpModal(studentName)
Priority:  danger (red)
Channel:   In-app notification + LINE Notify (webhook)
Recipient: Admin (ทุก branch ที่นักเรียนสังกัด)
```

#### 🟡 #2 — Renewal Pending
```
Trigger:   student.remainingSessions <= 2  (status = 'renewal')
Title:     "Renewal: {student.name}"
Body:      "เหลือ {N} class — ควรติดต่อผู้ปกครองเพื่อต่อ package"
Time tag:  "ภายใน 7 วัน"
Action:    [Follow Up] → openFollowUpModal(studentName)
Priority:  warning (yellow)
Channel:   In-app notification + LINE Notify
Recipient: Admin
```

#### 🟡 #3 — Summary Not Written
```
Trigger:   session.state ∈ {done, ended}  AND  summary.text === null
           (ตรวจทุก session ที่ summary ยังไม่ถูกเขียน)
Title:     "{N} Summary Not Written"
Body:      "{student1} · {subject}, {student2} · {subject}, ..."
Time tag:  "ค้างอยู่"
Action:    [Go to Summaries] → showView('summaries')
Priority:  warning (yellow)
Channel:   In-app
Recipient: Teacher (เฉพาะ session ของตัวเอง), Admin (ทุก session)
```

#### 🔵 #4 — Summary Ready to Send
```
Trigger:   summary.text ≠ null  AND  summary.sent === false
Title:     "{N} Summary Ready to Send"
Body:      "Written but not sent to parents: {name1}, {name2}, ..."
Time tag:  "พร้อมส่ง"
Action:    [Send Now] → showView('summaries')
Priority:  info (blue)
Channel:   In-app
Recipient: Admin
```

#### 🔵 #5 — New Leads Not Contacted
```
Trigger:   lead.stage === 'new'  (ยังไม่ได้ติดต่อ)
Title:     "{N} New Lead(s) Not Contacted"
Body:      "{name1}, {name2}, ..."
Time tag:  "รอการติดต่อ"
Action:    [Open CRM] → showView('crm')
Priority:  info (blue)
Channel:   In-app
Recipient: Admin, Manager
Note:      หลัง Trial → system auto-notify Admin ให้ follow up ทันที (Trial auto-notify)
```

#### 🔵 #6 — Today's Sessions
```
Trigger:   session.date === today  AND  session.state === 'upcoming'
Title:     "{N} Session(s) Today"
Body:      "First: {subject} at {startTime} · {room}"
Time tag:  "วันนี้"
Action:    [View Sessions] → showView('sessions')
Priority:  info (blue) — read:true (ไม่นับเป็น unread)
Channel:   In-app
Recipient: Teacher (เฉพาะ session ของตัวเอง), Admin
```

#### 🟡 #7 — Invoice Pending Verification
```
Trigger:   invoice.status === 'pending'  AND  submittedAt > 12 hours ago
Title:     "{INV-ID} รอ Verify"
Body:      "{family} ส่ง payment slip มา {N} ชม. — ยังไม่ได้ confirm"
Time tag:  "{N} ชม. ที่แล้ว"
Action:    [Verify Invoice] → showView('billing')
Priority:  warning (yellow)
Channel:   In-app
Recipient: Admin, Manager
```

---

### 2.3 Notification Priority Levels

| Priority | Value | Border | Background | Badge |
|----------|-------|--------|------------|-------|
| 🔴 Urgent | `danger` | `--md-error` | `--md-error-container` | badge-red |
| 🟡 Warning | `warning` | `--md-warning` | `--md-warning-container` | badge-yellow |
| 🔵 Info | `info` | `--md-primary` | `--md-primary-container` | badge-blue |

---

### 2.4 Delivery Channels

| Channel | ใช้เมื่อ | Status |
|---------|---------|--------|
| **In-app** (Notifications page) | ทุก notification | ✅ Implemented |
| **Sidebar badge** | unread count | ✅ Implemented |
| **Sidebar pulse dot** | มี unread | ✅ Implemented |
| **LINE Notify** (webhook) | Renewal URGENT + WARN | 🔲 Planned (token ใน Settings) |
| **EMAIL** | — | ❌ Not planned |

---

### 2.5 Auto-Notification Events (Future / Business Rules)

events ที่ระบบควร trigger noti อัตโนมัติ (ยังไม่ implement ใน prototype):

| Event | Trigger | Noti ถึง |
|-------|---------|---------|
| Lead ผ่าน Trial | `lead.stage → 'trialed'` | Admin: "Follow up หลัง Trial" |
| Form ถูก Submit | `formSubmission.status = 'pending'` | Admin: Inbox bubble + Pipeline badge |
| Session Start | Admin กด Start | Teacher: reminder ส่ง summary ภายใน 24 ชม. |
| Summary deadline | 24 ชม. หลัง session.state = done | Teacher: "กรุณาเขียน summary" |
| Invoice อนุมัติ | `invoice.status → 'paid'` | Parent (LINE): "ยืนยันการชำระเงิน" |
| Holiday conflict | session ชนกับ holiday | Admin: "เลือก: ย้าย / ข้าม week" |
| Teacher conflict | same teacher + same time + diff branch | System: ERROR (ห้าม save) |

---

## 3. STATUS FLOW DIAGRAMS

### 3.1 Student Life Cycle
```
[Lead: enrolled] → Student created
                     ↓
                  status: active
                  (sessions > 2)
                     ↓ (sessions ≤ 2)
                  status: renewal  ←── Noti #2 ส่ง
                     ↓ (sessions ≤ 1)
                  status: urgent   ←── Noti #1 ส่ง (LINE + in-app)
                     ↓ (ต่อ enrollment)
                  status: active   (enrollment ใหม่)
                     ↓ (ไม่ต่อ / หยุดเรียน)
                  status: inactive
```

### 3.2 Lead Pipeline Flow
```
new → contacting → test_scheduled → tested ─┐
                                             ├→ trial_scheduled → trialed → payment_pending → enrolled ✓
                                             │
      any stage ──────────────────────────── ┴→ archived (archivedFrom บันทึกไว้)
                                                    ↓ (Restore)
                                                 stage เดิม
```

### 3.3 Session → Summary Flow
```
session.state: upcoming → active → ended/done
                                       ↓
                          [Teacher writes summary per student]
                          summary: {text: null, sent: false}
                                → {text: "...", sent: false}  ←── Noti #4
                                → {text: "...", sent: true}   (immutable)
```

### 3.4 Invoice Flow
```
Admin creates → status: draft
Parent pays   → slip upload → status: pending  ←── Noti #7 (ถ้า > 12 ชม.)
Admin verifies→ status: paid
```

### 3.5 Form Submission Flow
```
Admin sends form link (token, 7 วัน)
        ↓
Parent fills + submits
        ↓
formSubmission.status: pending  ←── Noti ใน Inbox + Pipeline badge
        ↓
Admin reviews:
  [Approve] → records created (Student, Enrollment, Invoice)
  [Edit]    → แก้ใน ERP → ส่งให้ parent ดูใน Inbox → Approve
  [Reject]  → แจ้ง parent
```

---

## 4. WHO RECEIVES WHAT — Permission Matrix

| Notification | Director | Area Mgr | Manager | Admin | Teacher |
|-------------|----------|----------|---------|-------|---------|
| URGENT Renewal | ✅ all | ✅ area | ✅ branch | ✅ branch | ❌ |
| Renewal Pending | ✅ | ✅ | ✅ | ✅ | ❌ |
| Summary Not Written | ✅ | ✅ | ✅ | ✅ | ✅ own only |
| Summary Ready to Send | ✅ | ✅ | ✅ | ✅ | ❌ |
| New Leads | ✅ | ✅ | ✅ | ✅ | ❌ |
| Today's Sessions | ✅ | ✅ | ✅ | ✅ | ✅ own only |
| Invoice Pending | ✅ | ✅ | ✅ | ✅ | ❌ |
| Holiday Conflict | ✅ | ✅ | ✅ | ✅ | ❌ |

---

## 5. FIELD REFERENCE — Quick Lookup

### Student object (key fields)
```typescript
{
  id:                 string        // 'mia', 'tom', etc.
  name:               string
  grade:              string        // 'ป.4', 'ป.5', 'ม.1'
  branch:             string        // 'Sukhumvit' | 'Silom'
  status:             'active' | 'renewal' | 'urgent' | 'inactive'
  courses: [{
    subject:          string        // 'Math', 'Eng', etc.
    left:             number        // sessions remaining
    total:            number        // sessions in this enrollment
    hoursLeft:        number
    hoursTotal:       number
  }]
  invoices: [{
    id:               string        // 'INV-2026-XXXX'
    date:             string
    amount:           number        // THB
    status:           'draft' | 'pending' | 'paid'
    course:           string
  }]
}
```

### Lead object (key fields)
```typescript
{
  id:           string
  name:         string
  course:       string        // วิชาที่สนใจ
  subject:      string
  grade:        string
  age:          number
  stage:        LeadStage     // ดู Section 1.2
  source:       'Referral' | 'Website' | 'Walk-in'
  assignee:     string        // ชื่อ Admin/Teacher
  branch:       string
  daysAgo:      number
  schedDate?:   string        // วันนัด test/trial
  archivedFrom?: string       // stage ก่อน archive
  line?:        string
  phone?:       string
  convId?:      string        // link to Inbox conversation
}
```

### Session object (key fields)
```typescript
{
  id:         string
  date:       string          // 'YYYY-MM-DD'
  slotId:     0 | 1 | 2 | 3
  subject:    string
  grade:      string
  teacher:    string
  room:       string
  branch:     string
  state:      'upcoming' | 'active' | 'ongoing' | 'ended' | 'done'
  attendance: {
    [studentName: string]: AttendanceStatus
  }
  summaries: {
    [studentName: string]: {
      text:   string | null
      sent:   boolean
    }
  }
}
```

---

*Document auto-generated from NockERP codebase — data.js + notifications.js + CLAUDE.md*
*สำหรับคำถามเพิ่มเติม: ดู CLAUDE.md (Business Rules section)*
