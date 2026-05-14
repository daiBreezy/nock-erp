# Customer.md — NockERP Mock Database
> ไฟล์นี้คือ Single Source of Truth สำหรับ Mock Data ทั้งหมดใน NockERP
> ทุก Module ต้องอ้างอิงข้อมูลจากที่นี่เท่านั้น — อย่าสร้าง mock data ซ้ำในไฟล์อื่น

*Last updated: 14 May 2026*

---

## 📋 Table of Contents

1. [System Config](#1-system-config)
2. [Staff & Teachers](#2-staff--teachers)
3. [Families](#3-families)
4. [Students](#4-students)
5. [Courses & Enrollment](#5-courses--enrollment)
6. [Invoices & Billing](#6-invoices--billing)
7. [Sessions / Calendar](#7-sessions--calendar)
8. [CRM — Leads Pipeline](#8-crm--leads-pipeline)
9. [CRM — Customers (CRM View)](#9-crm--customers-crm-view)
10. [Inbox / Conversations](#10-inbox--conversations)
11. [Business Rules Quick Reference](#11-business-rules-quick-reference)

---

## 1. System Config

### Branches
| ID | Name | Rooms | LINE |
|----|------|-------|------|
| `sukhumvit` | Sukhumvit Branch | Room 1, Room 2, Room 3 | @nock-sukhumvit |
| `silom` | Silom Branch | Room 1, Room 2, Room 3 | @nock-silom |

### Time Slots (Daily Schedule)
| Slot ID | Time | Type | Label |
|---------|------|------|-------|
| `0` | 10:00 – 12:00 | Class | Morning |
| `b1` | 12:00 – 13:00 | Break | 🍱 Lunch Break |
| `1` | 13:00 – 15:00 | Class | Afternoon |
| `2` | 15:00 – 17:00 | Class | Afternoon 2 |
| `b2` | 17:00 – 18:00 | Break | ☕ Rest Break |
| `3` | 18:00 – 20:00 | Class | Evening |

### Holidays (2026)
| Date | Name (EN) | Name (TH) | Type |
|------|-----------|-----------|------|
| 15 May 2026 | Visakha Bucha Day | วันวิสาขบูชา | วันหยุดราชการ |

### Subjects & Colors
| Subject | Color Tag | Grade |
|---------|-----------|-------|
| Math G5 | `green` | G5 |
| Math G6 | (default/indigo) | G6 |
| Eng Read | `yellow` | G3–G4 |
| Eng Active | `yellow` | G4–G5 |
| Science | `orange` | G5 |
| Thai Lang | `green` | G5 |

---

## 2. Staff & Teachers

### Staff Roster

#### Kru Arm — Math G5
```
id:           arm
name:         Kru Arm
fullName:     Aranya Sombat
role:         Teacher
subject:      Math G5
branches:     Sukhumvit
phone:        090-111-2222
line:         @kru_arm
email:        arm@nockacademy.com
status:       active
joinDate:     2024-06-01
thisWeekSessions: 5
totalSessions:    87
avgRating:        4.8
activeStudents:   [Ploy Srirak]
schedule:
  Mon → Math G5 · 09:00 Rm1 | Math G5 · 15:00 Rm2
  Wed → Math G5 · 15:00 Rm2
  Thu → Math G6 · 15:00 Rm2 (co-teach)
notes:
  - Admin Nock (1 May): "Excellent at making abstract concepts visual. Students love her energy."
```

#### Kru Bee — English Reading
```
id:           bee
name:         Kru Bee
fullName:     Benyapa Rattana
role:         Teacher
subject:      English Reading
branches:     Sukhumvit
phone:        090-222-3333
line:         @kru_bee
email:        bee@nockacademy.com
status:       active
joinDate:     2024-03-15
thisWeekSessions: 7
totalSessions:    142
avgRating:        4.9
activeStudents:   [Mia Tanaka, Kevin Park]
schedule:
  Mon → Eng Read · 09:00 Rm1
  Tue → Eng Read · 10:30 Rm1
  Wed → Eng Read · 10:30 Rm1
  Thu → Eng Read · 10:30 Rm1
  Sat → Eng Read · 09:00 Rm1 | Math G6 · 10:00 Rm2
notes:
  - Admin Nock (5 May): "Top performer. Parents frequently request Kru Bee by name. Consider for senior teacher role."
```

#### Kru Cat — Math Grade 6
```
id:           cat
name:         Kru Cat
fullName:     Chotika Panya
role:         Teacher
subject:      Math Grade 6
branches:     Sukhumvit
phone:        090-333-4444
line:         @kru_cat
email:        cat@nockacademy.com
status:       active
joinDate:     2025-01-10
thisWeekSessions: 4
totalSessions:    63
avgRating:        4.7
activeStudents:   [Tom Chen]
schedule:
  Tue → Math G6 · 15:00 Rm2
  Wed → Math G6 · 15:00 Rm2
  Thu → Math G6 · 15:00 Rm2
  Sat → Math G6 · 10:00 Rm2
notes: (none)
```

#### Kru Dan — Science
```
id:           dan
name:         Kru Dan
fullName:     Danai Wongkham
role:         Teacher
subject:      Science
branches:     Sukhumvit, Silom
phone:        090-444-5555
line:         @kru_dan
email:        dan@nockacademy.com
status:       active
joinDate:     2024-09-01
thisWeekSessions: 4
totalSessions:    58
avgRating:        4.6
activeStudents:   [James Wilson]
schedule:
  Mon → Science · 14:30 Rm3
  Tue → Science · 14:30 Rm3
  Wed → Science · 14:30 Rm3
  Thu → Science · 14:30 Rm3
notes:
  - Admin Nock (8 May): "Covers both branches. Check travel schedule to avoid double-booking."
```

#### Kru Eve — Thai Language
```
id:           eve
name:         Kru Eve
fullName:     Evapha Chinarat
role:         Teacher
subject:      Thai Language
branches:     Silom
phone:        090-555-6666
line:         @kru_eve
email:        eve@nockacademy.com
status:       active
joinDate:     2025-03-01
thisWeekSessions: 3
totalSessions:    34
avgRating:        4.8
activeStudents:   [Ploy Srirak]
schedule:
  Mon → Thai Lang · 16:30 Rm1
  Wed → Thai Lang · 16:30 Rm1
  Sat → Thai Lang · 15:00 Rm1
notes: (none)
```

#### Admin Nock
```
id:           nock
name:         Admin Nock
fullName:     Nockacademy Admin
role:         Admin
subject:      —
branches:     Sukhumvit, Silom
phone:        090-000-1111
line:         @admin_nock
email:        nock@nockacademy.com
status:       active
joinDate:     2024-01-01
```

---

## 3. Families

### Tanaka Family
```
id:           tanaka
name:         Tanaka Family
branch:       Sukhumvit
assignee:     Admin Nock
status:       active
totalPaid:    ฿14,400
invoiceCount: 1
lastContact:  Today 10:42
channel:      LINE
unreadCount:  1

Parents:
  - Mom: Nami Tanaka | LINE: @tanaka_mom | phone: 081-234-5678
         email: nami.tanaka@email.com | LINE Active: YES

Students:
  - Mia Tanaka

Notes:
  - Admin Nock (9 May): "Very responsive on LINE. Always pays on time. Mia is their only child enrolled."
```

### Wilson Family
```
id:           wilson
name:         Wilson Family
branch:       Sukhumvit
assignee:     (Unassigned)
status:       urgent
totalPaid:    ฿4,800
invoiceCount: 1
lastContact:  Today 09:15
channel:      LINE
unreadCount:  1

Parents:
  - Dad: Ben Wilson  | LINE: @wilson_dad | phone: 082-345-6789
         email: ben.wilson@email.com | LINE Active: YES
  - Mom: Sara Wilson | LINE: (none)      | phone: 082-345-6780
         email: (none) | LINE Active: NO

Students:
  - James Wilson

Notes:
  - Admin Nock (9 May): "Dad handles all communication. James has 1 class left — URGENT renewal needed."
```

### Chen Family
```
id:           chen
name:         Chen Family
branch:       Sukhumvit
assignee:     Kru Bee
status:       active
totalPaid:    ฿10,800
invoiceCount: 1
lastContact:  Yesterday
channel:      LINE
unreadCount:  0

Parents:
  - Mom: Lisa Chen | LINE: @chen_mom | phone: 083-456-7890
         email: lisa.chen@email.com | LINE Active: YES

Students:
  - Tom Chen

Notes:
  - Admin Nock (5 May): "Sent payment slip for INV-2026-0028. Tom attending regularly."
```

### Srirak Family
```
id:           srirak
name:         Srirak Family
branch:       Silom
assignee:     Admin Nock
status:       active
totalPaid:    ฿14,400
invoiceCount: 2
lastContact:  Mon
channel:      LINE
unreadCount:  0

Parents:
  - Mom: Wan Srirak | LINE: @srirak_mom | phone: 084-567-8901
         email: wan.srirak@email.com | LINE Active: YES

Students:
  - Ploy Srirak

Notes:
  - Admin Nock (10 May): "Requested Wednesday-only schedule. Ploy enrolled in 2 subjects."
```

### Park Family
```
id:           park
name:         Park Family
branch:       Silom
assignee:     (Unassigned)
status:       active
totalPaid:    ฿7,200
invoiceCount: 1
lastContact:  Fri
channel:      LINE
unreadCount:  0

Parents:
  - Dad: Jin Park | LINE: @park_dad | phone: 085-678-9012
         email: jin.park@email.com | LINE Active: YES

Students:
  - Kevin Park

Notes: (none)
```

---

## 4. Students

### Mia Tanaka
```
id:          mia
name:        Mia Tanaka
age:         9
branch:      Sukhumvit
family:      Tanaka Family
line:        @tanaka_mom  (family contact)
phone:       081-234-5678
enrollDate:  2026-02-01
teacher:     Kru Bee
status:      renewal  ← 2 classes left

Courses:
  Eng Active | total: 48h | used: 46h | left: 2 | price: ฿14,400

Schedule (upcoming):
  Tue 19 May · 10:30 · Room 1 · Kru Bee
  Thu 21 May · 10:30 · Room 1 · Kru Bee

Attendance (recent, newest first):
  Tue 13 May  Eng Active  present  (deducted)
  Thu 8 May   Eng Active  present  (deducted)
  Tue 6 May   Eng Active  leave    (no deduction)
  Thu 1 May   Eng Active  present  (deducted)
  Tue 29 Apr  Eng Active  absent   (deducted)
  Thu 24 Apr  Eng Active  present  (deducted)

Notes:
  - Kru Bee (13 May): "Mia making great progress with reading comprehension. Recommend phonics workbook vol.2."
  - Admin Nock (13 May): "Parent confirmed renewal interest — waiting for payment slip."
```

### Tom Chen
```
id:          tom
name:        Tom Chen
age:         12
branch:      Sukhumvit
family:      Chen Family
line:        @chen_mom  (family contact)
phone:       082-345-6789
enrollDate:  2026-01-15
teacher:     Kru Cat
status:      active

Courses:
  Math G6 | total: 36h | used: 22h | left: 14 | price: ฿10,800

Schedule (upcoming):
  Tue 19 May · 15:00 · Room 2 · Kru Cat
  Thu 21 May · 15:00 · Room 2 · Kru Cat
  Sat 23 May · 10:00 · Room 2 · Kru Cat

Attendance (recent, newest first):
  Tue 13 May  Math G6  present  (deducted)
  Thu 8 May   Math G6  present  (deducted)
  Tue 6 May   Math G6  present  (deducted)
  Thu 1 May   Math G6  present  (deducted)
  Tue 29 Apr  Math G6  leave    (no deduction)
  Thu 24 Apr  Math G6  present  (deducted)

Notes:
  - Kru Cat (6 May): "Tom is strong in algebra but needs more practice with geometry proofs."
```

### Ploy Srirak
```
id:          ploy
name:        Ploy Srirak
age:         10
branch:      Silom
family:      Srirak Family
line:        @srirak_mom  (family contact)
phone:       083-456-7890
enrollDate:  2026-01-20
teacher:     Kru Arm / Kru Eve
status:      active

Courses:
  Math G5  | total: 24h | used: 6h  | left: 18 | price: ฿7,200
  Thai Lang | total: 24h | used: 6h  | left: 18 | price: ฿7,200

Schedule (upcoming):
  Wed 14 May · 15:00 · Room 2 · Kru Arm  (Math G5)
  Wed 14 May · 16:30 · Room 1 · Kru Eve  (Thai Lang)
  Wed 21 May · 15:00 · Room 2 · Kru Arm  (Math G5)

Attendance (recent, newest first):
  Wed 7 May   Math G5    present  (deducted)
  Wed 7 May   Thai Lang  present  (deducted)
  Wed 30 Apr  Math G5    present  (deducted)
  Wed 30 Apr  Thai Lang  leave    (no deduction)
  Wed 23 Apr  Math G5    present  (deducted)
  Wed 23 Apr  Thai Lang  present  (deducted)

Notes:
  - Admin Nock (10 May): "Parents requested schedule to stay on Wednesdays only."
```

### James Wilson
```
id:          james
name:        James Wilson
age:         11
branch:      Sukhumvit
family:      Wilson Family
line:        @wilson_dad  (family contact)
phone:       084-567-8901
enrollDate:  2026-03-01
teacher:     Kru Dan
status:      urgent  ← 1 class left — URGENT RENEWAL

Courses:
  Science | total: 12h | used: 11h | left: 1 | price: ฿4,800

Schedule (upcoming):
  Thu 14 May · 14:30 · Room 3 · Kru Dan

Attendance (recent, newest first):
  Tue 12 May  Science  present  (deducted)
  Thu 8 May   Science  present  (deducted)
  Tue 6 May   Science  absent   (deducted)
  Thu 1 May   Science  present  (deducted)
  Tue 29 Apr  Science  present  (deducted)

Notes:
  - Kru Dan (8 May): "James missed last Tuesday without notice. Parent should be contacted re: renewal urgently."
  - Admin Nock (9 May): "Called Wilson dad — will send payment slip by Friday."
```

### Kevin Park
```
id:          kevin
name:        Kevin Park
age:         8
branch:      Silom
family:      Park Family
line:        @park_dad  (family contact)
phone:       085-678-9012
enrollDate:  2026-04-01
teacher:     Kru Bee
status:      active

Courses:
  Eng Read | total: 24h | used: 8h | left: 16 | price: ฿7,200

Schedule (upcoming):
  Mon 18 May · 09:00 · Room 1 · Kru Bee
  Wed 20 May · 09:00 · Room 1 · Kru Bee

Attendance (recent, newest first):
  Mon 12 May  Eng Read  present  (deducted)
  Wed 7 May   Eng Read  present  (deducted)
  Mon 5 May   Eng Read  present  (deducted)
  Wed 30 Apr  Eng Read  leave    (no deduction)

Notes:
  - Kru Bee (12 May): "Kevin is enthusiastic and picks up vocabulary fast. Consider level-up assessment soon."
```

---

## 5. Courses & Enrollment

### Course Catalog
| Course Name | Subject | Grade | Hours | Price (THB) | Teacher |
|-------------|---------|-------|-------|-------------|---------|
| Eng Active | English Reading (Intensive) | G4–G5 | 48h | ฿14,400 | Kru Bee |
| Eng Read | English Reading | G3–G4 | 24h | ฿7,200 | Kru Bee |
| Math G5 | Math Grade 5 | G5 | 24h | ฿7,200 | Kru Arm |
| Math G6 | Math Grade 6 | G6 | 36h | ฿10,800 | Kru Cat |
| Science | Science | G5 | 12h | ฿4,800 | Kru Dan |
| Thai Lang | Thai Language | G5 | 24h | ฿7,200 | Kru Eve |

### Enrollment Summary (Active Students)
| Student | Course | Total | Used | Left | Status |
|---------|--------|-------|------|------|--------|
| Mia Tanaka | Eng Active | 48h | 46h | **2** | 🟡 Renewal Pending |
| Tom Chen | Math G6 | 36h | 22h | **14** | 🟢 Active |
| Ploy Srirak | Math G5 | 24h | 6h | **18** | 🟢 Active |
| Ploy Srirak | Thai Lang | 24h | 6h | **18** | 🟢 Active |
| James Wilson | Science | 12h | 11h | **1** | 🔴 URGENT Renewal |
| Kevin Park | Eng Read | 24h | 8h | **16** | 🟢 Active |

---

## 6. Invoices & Billing

### Invoice History (All Students)

| Invoice ID | Student | Family | Course | Amount | Date | Status |
|------------|---------|--------|--------|--------|------|--------|
| INV-2026-0028 | Tom Chen | Chen Family | Math G6 36h. | ฿10,800 | 2026-01-15 | Paid |
| INV-2026-0029 | Ploy Srirak | Srirak Family | Math G5 24h. | ฿7,200 | 2026-01-20 | Paid |
| INV-2026-0030 | Ploy Srirak | Srirak Family | Thai Lang 24h. | ฿7,200 | 2026-01-20 | Paid |
| INV-2026-0032 | Mia Tanaka | Tanaka Family | Eng Active 48h. | ฿14,400 | 2026-02-01 | Paid |
| INV-2026-0041 | James Wilson | Wilson Family | Science 12h. | ฿4,800 | 2026-03-01 | Paid |
| INV-2026-0048 | Kevin Park | Park Family | Eng Read 24h. | ฿7,200 | 2026-04-01 | Paid |

### Family Revenue Summary
| Family | Total Paid | Invoices | Status |
|--------|-----------|----------|--------|
| Tanaka Family | ฿14,400 | 1 | Active |
| Wilson Family | ฿4,800 | 1 | Urgent |
| Chen Family | ฿10,800 | 1 | Active |
| Srirak Family | ฿14,400 | 2 | Active |
| Park Family | ฿7,200 | 1 | Active |
| **Total** | **฿51,600** | **6** | |

### Billing Rules
```
Invoice format in tables: [Course Name: Xh.]
  e.g. [Eng Active:48h.] [Math G6:36h.]

Invoice statuses:
  Draft → Pending Verification → Paid

Payment trigger flow:
  Payslip received → (AI detect) → Generate Invoice → Admin verify → Active
```

---

## 7. Sessions / Calendar

> Current week: 11–17 May 2026
> Today: Wednesday 13 May 2026 (as of system reference date)

### Session State Machine
```
upcoming → active → ended
```

### Session Fields
```
id, date, slotId (0/1/2/3), col (1=Mon…7=Sun),
subject, grade, teacher, room, color, state,
branch, studentNames[], attendance{}, summaries{}
```

### All Sessions (May 2026 — Current Week)

#### Monday 11 May (ended)

| ID | Slot | Subject | Grade | Teacher | Room | Branch | State |
|----|------|---------|-------|---------|------|--------|-------|
| s1 | 0 (10–12) | Math G5 | G5 | Kru Arm | Room 1 | Sukhumvit | ended |
| s2 | 1 (13–15) | Science | G5 | Kru Dan | Room 3 | Sukhumvit | ended |
| s3 | 2 (15–17) | Thai Lang | G5 | Kru Eve | Room 1 | Silom | ended |

**s1 — Math G5, Mon 11 May**
```
students:    Ploy Srirak, Nat B, Jay C, Sam D
attendance:  Ploy Srirak=present, Nat B=present, Jay C=leave, Sam D=present
summaries:   Ploy Srirak={text:"Fractions — great progress!",sent:true}
             Nat B={text:"",sent:false}, Sam D={text:"",sent:false}
```

**s2 — Science, Mon 11 May**
```
students:    James Wilson
attendance:  James Wilson=present
summaries:   James Wilson={text:"Plant biology — engaged.",sent:true}
```

**s3 — Thai Lang, Mon 11 May**
```
students:    Ploy Srirak, Pan G, Wan H
attendance:  Ploy Srirak=present, Pan G=absent, Wan H=present
summaries:   Ploy Srirak={text:"Thai vowels — excellent!",sent:true}
             Pan G={text:"",sent:false}, Wan H={text:"",sent:false}
```

---

#### Tuesday 12 May (ended)

| ID | Slot | Subject | Grade | Teacher | Room | Branch | State |
|----|------|---------|-------|---------|------|--------|-------|
| s4 | 0 (10–12) | Eng Read | G4 | Kru Bee | Room 1 | Sukhumvit | ended |
| s5 | 1 (13–15) | Science | G5 | Kru Dan | Room 3 | Sukhumvit | ended |
| s6 | 2 (15–17) | Math G6 | G6 | Kru Cat | Room 2 | Sukhumvit | ended |

**s4 — Eng Read, Tue 12 May**
```
students:    Mia Tanaka, Kevin Park, Leo E, Ava F, Max G
attendance:  Mia Tanaka=present, Kevin Park=present, Leo E=present, Ava F=leave, Max G=present
summaries:   Mia Tanaka={text:"Reading comprehension drills.",sent:true}
             Kevin Park={text:"Vocab expansion.",sent:true}
             Leo E={text:"",sent:false}, Max G={text:"",sent:false}
```

**s5 — Science, Tue 12 May**
```
students:    James Wilson
attendance:  James Wilson=absent
summaries:   James Wilson={text:"",sent:false}
```

**s6 — Math G6, Tue 12 May**
```
students:    Tom Chen, Amy B, Ben C, Cal D, Dan E, Eva F
attendance:  Tom Chen=present, Amy B=present, Ben C=present, Cal D=leave, Dan E=present, Eva F=present
summaries:   Tom Chen={text:"Quadratics intro.",sent:true}
             Amy B, Ben C, Dan E, Eva F={text:"",sent:false}
```

---

#### Wednesday 13 May — TODAY (mix of states)

| ID | Slot | Subject | Grade | Teacher | Room | Branch | State |
|----|------|---------|-------|---------|------|--------|-------|
| s7 | 0 (10–12) | Math G5 | G5 | Kru Arm | Room 2 | Sukhumvit | ended |
| s8 | 0 (10–12) | Eng Read | G4 | Kru Bee | Room 1 | Sukhumvit | ended |
| s9 | 1 (13–15) | Science | G5 | Kru Dan | Room 3 | Sukhumvit | **active** ← 🟢 |
| s10 | 2 (15–17) | Math G6 | G6 | Kru Cat | Room 2 | Sukhumvit | upcoming |
| s11 | 2 (15–17) | Thai Lang | G5 | Kru Eve | Room 1 | Silom | upcoming |

**s7 — Math G5, Wed 13 May**
```
students:    Ploy Srirak, Nat B, Jay C, Sam D
attendance:  all present
summaries:   all {text:"",sent:false}  ← Summary Pending
```

**s8 — Eng Read, Wed 13 May**
```
students:    Mia Tanaka, Kevin Park, Leo E, Ava F, Max G
attendance:  Mia Tanaka=present, Kevin Park=leave, Leo E=present, Ava F=present, Max G=present
summaries:   all pending {text:"",sent:false}
```

**s9 — Science, Wed 13 May (ACTIVE)**
```
startedAt:   14:35
students:    James Wilson
attendance:  James Wilson=present
summaries:   {}  ← not yet (class in progress)
```

**s10 — Math G6, Wed 13 May (upcoming)**
```
students:    Tom Chen, Amy B, Ben C, Cal D, Dan E, Eva F
attendance:  {}
summaries:   {}
```

**s11 — Thai Lang, Wed 13 May (upcoming)**
```
students:    Ploy Srirak, Pan G, Wan H
attendance:  {}
summaries:   {}
```

---

#### Thursday 14 May (upcoming)

| ID | Slot | Subject | Grade | Teacher | Room | Branch | State |
|----|------|---------|-------|---------|------|--------|-------|
| s12 | 0 (10–12) | Eng Read | G4 | Kru Bee | Room 1 | Sukhumvit | upcoming |
| s13 | 1 (13–15) | Science | G5 | Kru Dan | Room 3 | Sukhumvit | upcoming |
| s14 | 2 (15–17) | Math G6 | G6 | Kru Cat | Room 2 | Sukhumvit | upcoming |

```
s12 students: Mia Tanaka, Kevin Park, Leo E, Ava F, Max G
s13 students: James Wilson
s14 students: Tom Chen, Amy B, Ben C, Cal D, Dan E, Eva F
```

---

#### Friday 15 May — 🏖️ HOLIDAY (วันวิสาขบูชา)
> ไม่มี Sessions ในวันนี้

---

#### Saturday 16 May (upcoming)

| ID | Slot | Subject | Grade | Teacher | Room | Branch | State |
|----|------|---------|-------|---------|------|--------|-------|
| s15 | 0 (10–12) | Eng Read | G4 | Kru Bee | Room 1 | Sukhumvit | upcoming |
| s16 | 1 (13–15) | Math G6 | G6 | Kru Cat | Room 2 | Sukhumvit | upcoming |
| s17 | 2 (15–17) | Thai Lang | G5 | Kru Eve | Room 1 | Silom | upcoming |

```
s15 students: Mia Tanaka, Kevin Park, Leo E, Ava F
s16 students: Tom Chen, Amy B, Ben C, Cal D, Dan E
s17 students: Ploy Srirak, Pan G, Wan H
```

---

#### Sunday 17 May — No sessions

---

### Student Meta (for Calendar Class Modal)
| Student | Family | Classes Left | Badge |
|---------|--------|-------------|-------|
| Mia Tanaka | Tanaka Family | 2 | badge-yellow |
| Tom Chen | Chen Family | 14 | badge-green |
| Ploy Srirak | Srirak Family | 18 | badge-green |
| James Wilson | Wilson Family | 1 | badge-red |
| Kevin Park | Park Family | 16 | badge-green |

---

## 8. CRM — Leads Pipeline

### Lead Stages
```
New Lead → Contacting → Interested (Test) → Interested (Trial) → [Enrolled → Customer]
                                                                        ↓
                                                                 Archived (with source stage)
```

### Active Leads

#### Stage: New Lead
| ID | Name | Course | Age | Source | Assignee | Days Ago | LINE | Phone |
|----|------|--------|-----|--------|----------|---------|------|-------|
| sarah | Sarah Mitchell | English Reading | 9 | Referred | Admin Nock | 1 | @sarah_mom | 089-111-2222 |
| arjun | Arjun Patel | Math Grade 4 | 10 | Website | (none) | 3 | @arjun_dad | 089-333-4444 |
| emma | Emma Liu | Science | 12 | Walk-in | Admin Nock | 5 | (none) | 089-555-6666 |

#### Stage: Contacting
| ID | Name | Course | Age | Source | Assignee | Days Ago | LINE | Phone |
|----|------|--------|-----|--------|----------|---------|------|-------|
| kevin | Kevin Park* | Thai Language | 8 | Referral | Kru Eve | 4 | @park_mom | 089-777-8888 |
| nadia | Nadia Sorokin | Math Grade 5 | 11 | Website | Admin Nock | 6 | @nadia_mom | 089-999-0000 |
| ben | Ben Torres | English | 7 | Referral | (none) | 2 | (none) | 089-111-3333 |

*Note: "Kevin Park" in CRM Leads is a different person from Kevin Park the student

#### Stage: Interested (Test)
| ID | Name | Course | Age | Source | Assignee | Sched Date | LINE | Phone |
|----|------|--------|-----|--------|----------|-----------|------|-------|
| lily | Lily Wang | Science | 13 | Website | Kru Dan | 16 May 10:30 | @lily_mom | 089-222-4444 |
| daan | Daan Smits | Math Grade 6 | 12 | Referral | Kru Cat | 17 May 09:00 | @daan_dad | 089-333-5555 |

#### Stage: Interested (Trial)
| ID | Name | Course | Age | Source | Assignee | Sched Date | LINE | Phone |
|----|------|--------|-----|--------|----------|-----------|------|-------|
| hana | Hana Yamamoto | English Reading | 9 | Referral | Kru Bee | 15 May 10:30 | @hana_mom | 089-444-6666 |
| luca | Luca Romano | Thai Language | 11 | Walk-in | Kru Eve | 18 May 13:00 | @luca_dad | 089-555-7777 |

### Archived Leads
| ID | Name | Course | Age | Source | Archived From |
|----|------|--------|-----|--------|---------------|
| chris | Chris Baker | Math G5 | 11 | Website | test |
| anna | Anna White | English | 8 | Walk-in | contacting |

---

## 9. CRM — Customers (CRM View)

> หมายเหตุ: ข้อมูลใน CRM Customers tab อาจต่างจาก Students module เล็กน้อยเพราะเป็น CRM-view ที่เน้น commercial data

| Name | Family | Branch | Course | Package | Teacher | Schedule | Remain | Total | Since | Until | Status | Revenue |
|------|--------|--------|--------|---------|---------|----------|--------|-------|-------|-------|--------|---------|
| Mia Tanaka | Tanaka Family | Sukhumvit | English Reading | Eng Active:48h. | Kru Bee | Tue/Thu 10:30 | 2 | 48 | Jan 2026 | Jun 2026 | renewal | ฿51,000 |
| Tom Chen | Chen Family | Sukhumvit | Math Grade 6 | Math:24h. | Kru Cat | Mon/Wed 15:00 | 14 | 20 | Mar 2026 | Aug 2026 | active | ฿18,000 |
| Ploy Srirak | Srirak Family | Silom | Math G5 + Thai | Math:24h. Thai:20h. | Kru Arm / Kru Eve | Mon/Thu multi | 18 | 44 | Nov 2025 | Jul 2026 | active | ฿33,000 |
| James Wilson | Wilson Family | Sukhumvit | Science | Sci:20h. | Kru Dan | Tue/Thu 13:00 | 1 | 20 | Feb 2026 | May 2026 | urgent | ฿11,000 |
| Kevin Park | Park Family | Silom | Thai Language | Thai:20h. | Kru Eve | Mon/Wed 16:30 | 9 | 10 | Apr 2026 | Jul 2026 | active | ฿4,200 |

### Dashboard KPIs
```
Total Customers:    87 (mock: 5 real + 82 implied)
Active Leads:       9
Renewal Pending:    6
Conversion Rate:    68%
Revenue (May):      ฿124,500
```

---

## 10. Inbox / Conversations

### Conversation List

| ID | Family | Student | Branch | Channel | Unread | Time | Assignee | Preview |
|----|--------|---------|--------|---------|--------|------|----------|---------|
| tanaka | Tanaka Family | Mia Tanaka | Sukhumvit | LINE | YES | Today 10:42 | Admin Nock | ขอบคุณมากค่ะ สรุปบทเรียนดีมาก… |
| wilson | Wilson Family | James Wilson | Sukhumvit | LINE | YES | Today 09:15 | (Unassigned) | Hi, can we reschedule Tuesday's… |
| chen | Chen Family | Tom Chen | Sukhumvit | LINE | YES | Yesterday | Kru Bee | Invoice attached. Please confirm… |
| srirak | Srirak Family | Ploy Srirak | Silom | LINE | no | Mon | Admin Nock | Ploy will be absent this Thursday… |
| romano | Romano Family | Luca Romano | Silom | LINE | no | Mon | (Unassigned) | Thank you for the trial session! |
| park | Park Family | Kevin Park | Silom | LINE | no | Fri | (Unassigned) | When is the next class schedule? |

> Note: Romano Family is from CRM (Luca Romano = Trial lead) — not a full enrolled student yet

### Message Threads

#### Tanaka Family
```
Mon 09:10  parent   Tanaka Mom    — สวัสดีค่ะ อยากสอบถามเรื่องตารางเรียนสัปดาห์หน้าค่ะ
Mon 09:25  staff    Admin Nock    — สวัสดีครับคุณแม่ สัปดาห์หน้า Mia มีเรียนวันอังคาร และพฤหัสบดีครับ เวลา 10:30–12:00 ครับ
Mon 10:00  parent   Tanaka Mom    — ขอบคุณค่ะ แล้วสรุปบทเรียนส่งได้เมื่อไหร่คะ?
Mon 10:05  internal Admin Nock    — 📎 Summary for last session pending — remind teacher to submit
Mon 10:30  staff    Admin Nock    — คุณแม่ครับ สรุปบทเรียนจะส่งภายในวันนี้เลยครับ
Today 10:42 parent  Tanaka Mom    — ขอบคุณมากค่ะ สรุปบทเรียนดีมากเลยนะคะ Mia ชอบมากค่ะ 🙏
```

#### Wilson Family
```
Today 09:15  parent  Wilson Dad  — Hi, can we reschedule Tuesday's class? James has a doctor appointment.
```

#### Chen Family
```
Yesterday  parent  Chen Mom  — Please find the payment slip attached. Invoice #INV-2026-0049 confirmed.
```

#### Srirak Family
```
Mon  parent  Srirak Mom  — สวัสดีค่ะ แจ้งว่า Ploy จะไม่มาเรียนวันพฤหัสนี้ค่ะ ขอ Leave ค่ะ
```

#### Romano Family
```
Mon  parent  Romano Dad  — Thank you so much for the trial session! Luca really enjoyed it.
```

#### Park Family
```
Fri  parent  Park Dad  — สวัสดีครับ อยากถามว่าตารางเรียนของ Kevin อาทิตย์หน้าเป็นยังไงบ้างครับ?
```

---

## 11. Business Rules Quick Reference

### Attendance → Class Deduction
| Status | Deduct? | Notes |
|--------|---------|-------|
| Present | YES | -1 class |
| Absent (no notice) | YES | -1 class |
| Leave (within quota) | NO | 0 deduction |
| Leave (over quota) | YES | -1 class |
| Transfer | NO | ย้ายไปครั้งอื่น |
| Reschedule | NO | เลื่อนวัน |

### Renewal Alert Thresholds
```
≤ 2 classes left  → "Renewal Pending" (badge-yellow, status: renewal)
≤ 1 class left    → "URGENT Renewal"  (badge-red, status: urgent)
```

### Session Flow
```
upcoming → [Start Class] → active → [End Class] → ended
                                                     ↓
                                           Summary Pending
                                                     ↓
                                           Summary Written
                                                     ↓
                                           Summary Sent → Session Closed
```

### Summary Recipients
```
Sent → Inbox (parent thread) + Student Timeline + Session Timeline
```

### CRM Lead Flow
```
New Lead → Contacting → Interested (Test) → Interested (Trial)
                                                     ↓
                                              [Enroll + Pay]
                                                     ↓
                                              Move to Customers
                                         (disappears from Lead pipeline)
```

### Billing Flow
```
Payslip received → AI detect → Generate Invoice → Admin verify → Active (Paid)
```

---

## 12. Minor / Background Students

> นักเรียนเหล่านี้ปรากฏใน Session data แต่ยังไม่มี full profile ใน Students module

| Name | Appears In | Notes |
|------|-----------|-------|
| Nat B | Math G5 sessions (s1, s7) | Student in Kru Arm's class |
| Jay C | Math G5 sessions (s1, s7) | Student in Kru Arm's class |
| Sam D | Math G5 sessions (s1, s7) | Student in Kru Arm's class |
| Leo E | Eng Read sessions (s4, s8, s12, s15) | Student in Kru Bee's class |
| Ava F | Eng Read sessions (s4, s8, s12, s15) | Student in Kru Bee's class |
| Max G | Eng Read sessions (s4, s8, s12) | Student in Kru Bee's class |
| Amy B | Math G6 sessions (s6, s10, s14, s16) | Student in Kru Cat's class |
| Ben C | Math G6 sessions (s6, s10, s14, s16) | Student in Kru Cat's class |
| Cal D | Math G6 sessions (s6, s10, s14, s16) | Student in Kru Cat's class |
| Dan E | Math G6 sessions (s6, s10, s14, s16) | Student in Kru Cat's class |
| Eva F | Math G6 sessions (s6, s10, s14) | Student in Kru Cat's class |
| Pan G | Thai Lang sessions (s3, s11, s17) | Student in Kru Eve's class |
| Wan H | Thai Lang sessions (s3, s11, s17) | Student in Kru Eve's class |

---

*Customer.md — NockERP Single Source of Truth*
*Generated: 14 May 2026 | Maintained by Claude*
