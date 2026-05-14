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
├── BLUEPRINT 2 | ....md      ← Information Architecture ฉบับเต็ม
│
├── index.html                ← Shell: Sidebar + TopNav + view containers (ไม่มี inline CSS/JS)
│
├── css/
│   └── main.css              ← CSS ทั้งหมดของโปรเจกต์ (Design System)
│
└── js/
    ├── app.js                ← Navigation, Modal utils, Shared functions
    ├── dashboard.js          ← Dashboard view content + logic
    ├── crm.js                ← CRM view content + logic
    ├── inbox.js              ← Inbox view content + logic
    ├── calendar.js           ← Calendar view content + logic
    ├── students.js           ← Students view content + logic
    ├── billing.js            ← Billing view content + logic
    ├── reports.js            ← Reports view content + logic
    └── settings.js           ← Settings view content + logic
```

### วิธีที่แต่ละ JS module ทำงาน
```javascript
// ทุก module ใช้ pattern นี้
(function() {
  const view = document.getElementById('view-[name]');
  view.innerHTML = `...HTML content...`;
  
  // module-specific functions
  function init() { ... }
  init();
})();
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

| Module      | Status         | หมายเหตุ                          |
|-------------|---------------|-----------------------------------|
| Dashboard   | 🟡 Partial     | มี layout แต่ยังไม่ครบ interactions |
| CRM         | 🟡 Partial     | Pipeline OK, Customer table basic  |
| Inbox       | 🟡 Partial     | ยังไม่มี assignment feature         |
| Calendar    | 🟡 Partial     | ยังไม่มี holiday, summary modal     |
| Students    | 🟡 Partial     | profile ยังเป็น inline panel        |
| Billing     | 🟡 Partial     | course format ยังไม่ถูก            |
| Reports     | 🔴 Basic       | ยังไม่มี timeseries, tabs           |
| Settings    | 🔴 Basic       | form fields ยังไม่ครบ              |
| Families    | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |
| Staff       | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |
| Courses     | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |
| Classes     | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |
| Sessions    | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |
| Attendance  | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |
| Summaries   | ⬜ Placeholder  | ยังไม่ได้สร้าง                      |

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

*Last updated: 13 May 2026 | อัพเดทโดย Claude ทุกครั้งที่มีการเปลี่ยนแปลง module status*
