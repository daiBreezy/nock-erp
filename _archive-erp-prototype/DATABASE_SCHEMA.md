# NockERP — DATABASE_SCHEMA.md
> Relational Database Schema for Full-Stack Implementation
> Derived from: data.js (mock data source of truth) + FLOWS.md (business rules)
> Claude อ่านไฟล์นี้ก่อน implement backend หรือ API layer ใด ๆ

---

## Architecture Overview

```
Branch ──< BranchTimeSlot
Branch ──< BranchOperatingDay
Branch ──< BranchPackagePrice
Branch ──< Staff (via staff_branches)
Branch ──< Student

Subject ──< StaffSubject >── Staff  (Teacher brings Subject to Branch)
GlobalCourseTemplate ──< GlobalCourseTemplateSubject
GlobalCourseTemplate ──< BranchCourse (branch copies + customizes)
BranchCourse ──< BranchCourseSubject

BranchCourse → Enrollment (student buys Subject hours from Branch Course)
CalendarDayTemplate ──< CalendarTemplateCell  (Teacher × TimeSlot grid per day-of-week)
CalendarTemplateCell → Class (when students are assigned)
Class   ──< Session (each weekly occurrence)
Session ──< Attendance (per student)
Session ──< Summary    (per student)

Family  ──< Parent
Family  ──< Student
Student ──< Enrollment (hours package per Subject)
Student ──< Invoice
Student ──< Note

Lead    →  Student (when enrolled)
Conversation ──< Message
Holiday  (company-wide, Director-managed)
```

---

## 1. Lookup / Config Tables

### `branches`
```sql
id          VARCHAR(50)  PK   e.g. 'sukhumvit', 'silom'
name        VARCHAR(100)      e.g. 'Sukhumvit', 'Silom'
address     TEXT
phone       VARCHAR(20)
line_oa     VARCHAR(50)       e.g. '@nockacademy_sukhumvit'
room_count  INT          DEFAULT 1   -- max concurrent classes allowed
created_at  TIMESTAMP
```

### `branch_operating_days`
```sql
branch_id    VARCHAR(50)  FK → branches.id
day_of_week  INT          NOT NULL   1=Mon … 7=Sun
PRIMARY KEY (branch_id, day_of_week)
```

### `branch_time_slots`
> Time slots are per-branch and flexible — each branch defines their own
```sql
id          SERIAL       PK
branch_id   VARCHAR(50)  FK → branches.id
start_time  TIME         NOT NULL   e.g. '10:00'
end_time    TIME         NOT NULL   e.g. '12:00'
slot_type   VARCHAR(10)  NOT NULL   'class' | 'break'
label       VARCHAR(50)  NULL       e.g. 'Lunch Break' (for break slots)
sort        INT          NOT NULL   display order
```

### `branch_package_prices`
> Each branch sets their own pricing for standard hour packages
```sql
branch_id   VARCHAR(50)  FK → branches.id
hours       INT          NOT NULL   24 | 48 | 72 | 96
price       DECIMAL(10,2) NOT NULL
PRIMARY KEY (branch_id, hours)
```

### `rooms`
```sql
id          SERIAL       PK
branch_id   VARCHAR(50)  FK → branches.id
name        VARCHAR(50)       e.g. 'Room 1', 'Room 2'
capacity    INT
```
> Note: Room naming is optional. The critical constraint is `branch.room_count`
> which limits how many classes can run concurrently.

### `subjects`
```sql
id          VARCHAR(50)  PK   e.g. 'eng_active', 'math', 'science', 'thai', 'eng_grammar'
name        VARCHAR(100)      e.g. 'Eng (Active)', 'Math', 'Science', 'Thai', 'Eng (Grammar)'
color_key   VARCHAR(20)       'blue' | 'green' | 'orange' | 'yellow' | 'purple'
is_active   BOOLEAN      DEFAULT true
```

**Seed values:**
| id           | name          | color_key |
|--------------|---------------|-----------|
| eng          | Eng           | blue      |
| math         | Math          | green     |
| science      | Science       | orange    |
| thai         | Thai          | green     |
| eng_active   | Eng (Active)  | yellow    |
| eng_grammar  | Eng (Grammar) | purple    |

### `grades`
```sql
id    VARCHAR(10)  PK   e.g. 'p1', 'p2', … 'p6', 'm1', 'm2', 'm3'
label VARCHAR(10)       e.g. 'ป.1', 'ป.2', … 'ป.6', 'ม.1'
sort  INT               for ordering
```

### `holidays`
> Company-wide holidays — managed by Director only
```sql
id          SERIAL        PK
date        DATE          NOT NULL UNIQUE
name        VARCHAR(100)  NOT NULL   e.g. 'วันสงกรานต์'
created_by  VARCHAR(50)   FK → staff.id   (must be director role)
created_at  TIMESTAMP
```

**Holiday Conflict Rules:**
```
When holiday matches a class day → System alerts Admin
Admin chooses:
  A) Move session → one-time exception for that week only
                    Template repeats normally next week
  B) Skip week   → cancel that session, no hour deduction
```

---

## 2. People Tables

### `staff`
```sql
id              VARCHAR(50)   PK   e.g. 'arm', 'bee', 'cat', 'dan', 'eve', 'nock'
name            VARCHAR(100)  NOT NULL   e.g. 'Kru Arm'
full_name       VARCHAR(150)             e.g. 'Aranya Sombat'
role            VARCHAR(20)   NOT NULL
              -- ENUM: 'director' | 'area_manager' | 'manager' | 'admin' | 'teacher'
              -- director    = CEO/Owner — เห็นทุก branch ทุก area
              -- area_manager = ดูแลหลาย branch ใน area เดียวกัน
              -- manager     = Branch Manager — ดูแล branch ตัวเอง
              -- admin       = Day-to-day ops (CRM, Calendar, Attendance)
              -- teacher     = เห็นเฉพาะ schedule + นักเรียน + session ตัวเอง
phone           VARCHAR(20)
line_id         VARCHAR(50)              e.g. '@kru_arm'
email           VARCHAR(100)
status          VARCHAR(20)   DEFAULT 'active'   'active' | 'inactive'
join_date       DATE
this_week_sessions  INT       DEFAULT 0
total_sessions  INT           DEFAULT 0
avg_rating      DECIMAL(3,1)  NULL
area_id         VARCHAR(50)   NULL   FK → areas.id (for area_manager role)
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

### `staff_branches` (many-to-many)
```sql
staff_id    VARCHAR(50)  FK → staff.id
branch_id   VARCHAR(50)  FK → branches.id
PRIMARY KEY (staff_id, branch_id)
```

### `staff_subjects` (which subjects a teacher teaches + grade range)
```sql
staff_id      VARCHAR(50)  FK → staff.id
subject_id    VARCHAR(50)  FK → subjects.id
grade_range   VARCHAR(20)  NOT NULL   'primary' | 'secondary' | 'both'
              -- primary   = ป.1–ป.6 only
              -- secondary = ม.1–ม.3 only
              -- both      = ป.1–ม.3
PRIMARY KEY (staff_id, subject_id)
```

> **Key Rule:** When a Teacher is assigned to a branch (via `staff_branches`),
> their subjects automatically become available at that branch.
> Admin does NOT need to select subjects separately — they come with the teacher.

### `families`
```sql
id            VARCHAR(50)   PK   e.g. 'tanaka', 'wilson', 'chen'
name          VARCHAR(100)  NOT NULL   e.g. 'Tanaka Family'
branch_id     VARCHAR(50)   FK → branches.id
assignee_id   VARCHAR(50)   FK → staff.id   NULL = unassigned
status        VARCHAR(20)   DEFAULT 'active'   'active' | 'urgent' | 'pending' | 'inactive'
total_paid    DECIMAL(10,2) DEFAULT 0
invoice_count INT           DEFAULT 0
last_contact  TIMESTAMP     NULL
channel       VARCHAR(20)   'LINE' | 'Phone' | 'Email' | 'Walk-in'
unread_count  INT           DEFAULT 0
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

### `parents`
```sql
id          SERIAL        PK
family_id   VARCHAR(50)   FK → families.id
role        VARCHAR(50)         'Mom' | 'Dad' | 'Guardian'
name        VARCHAR(100)  NOT NULL
phone       VARCHAR(20)
line_id     VARCHAR(50)
email       VARCHAR(100)
line_active BOOLEAN       DEFAULT false
is_primary  BOOLEAN       DEFAULT false
created_at  TIMESTAMP
```

### `students`
```sql
id            VARCHAR(50)   PK   e.g. 'mia', 'tom', 'ploy', 'james', 'kevin'
name          VARCHAR(100)  NOT NULL
age           INT
branch_id     VARCHAR(50)   FK → branches.id
family_id     VARCHAR(50)   FK → families.id
line_id       VARCHAR(50)
phone         VARCHAR(20)
enroll_date   DATE
primary_teacher_id  VARCHAR(50)  FK → staff.id   NULL = multiple
status        VARCHAR(20)   DEFAULT 'active'
              -- ENUM: 'active' | 'renewal' | 'urgent' | 'inactive'
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

> **Note:** `student.status` is COMPUTED from `enrollments.left` — do NOT store directly in production.
> Threshold: left ≤ 1 → 'urgent', left ≤ 2 → 'renewal', else 'active'

---

## 3. Course & Class Tables

### `global_course_templates`
> Director-created course bundles — available to all branches as a starting point
```sql
id            SERIAL        PK
name          VARCHAR(150)  NOT NULL   e.g. 'Course สอบเข้า ม.1'
description   TEXT
target_grade  VARCHAR(50)   NULL       e.g. 'ป.4–6' (marketing target)
is_active     BOOLEAN       DEFAULT true
created_by    VARCHAR(50)   FK → staff.id
created_at    TIMESTAMP
```

### `global_course_template_subjects`
> Which subjects (with default hours) are in each global template
```sql
template_id   INT           FK → global_course_templates.id
subject_id    VARCHAR(50)   FK → subjects.id
default_hours INT           NOT NULL   e.g. 24, 48
PRIMARY KEY (template_id, subject_id)
```

### `branch_courses`
> Branch-specific course offering — either cloned from global template or created from scratch
```sql
id              SERIAL        PK
branch_id       VARCHAR(50)   FK → branches.id
name            VARCHAR(150)  NOT NULL
template_id     INT           FK → global_course_templates.id   NULL if created from scratch
is_active       BOOLEAN       DEFAULT true
created_by      VARCHAR(50)   FK → staff.id
created_at      TIMESTAMP
```

### `branch_course_subjects`
> Subject-level detail for each branch course (hours and price per subject)
```sql
branch_course_id  INT           FK → branch_courses.id
subject_id        VARCHAR(50)   FK → subjects.id
hours             INT           NOT NULL   e.g. 24, 48 (per subject, NOT pooled)
price             DECIMAL(10,2) NOT NULL   branch sets their own price
PRIMARY KEY (branch_course_id, subject_id)
```

**Example:**
```
Branch Course: "Course สอบเข้า ม.1" at Silom branch
  → Math: 48h · ฿12,000
  → Eng:  24h · ฿7,500
  → Science: 24h · ฿8,000

Branch Course: "Math only" at Sukhumvit branch
  → Math: 24h · ฿6,500
```

**Enrollment from branch course:**
```
Each subject in the course → creates 1 Enrollment record + 1 Invoice
Student buys "Course สอบเข้า ม.1" → 3 enrollments + 3 invoices (one per subject)
Student can renew each subject independently
```

### `calendar_day_templates`
> Weekly repeating schedule per branch, per day-of-week
```sql
id          SERIAL        PK
branch_id   VARCHAR(50)   FK → branches.id
day_of_week INT           NOT NULL   1=Mon … 7=Sun
created_at  TIMESTAMP
UNIQUE (branch_id, day_of_week)
```

### `calendar_template_cells`
> Each cell in the Teacher × Time Slot grid = a potential Class
```sql
id              SERIAL        PK
template_id     INT           FK → calendar_day_templates.id
teacher_id      VARCHAR(50)   FK → staff.id
slot_id         INT           FK → branch_time_slots.id
subject_id      VARCHAR(50)   FK → subjects.id
grade_label     VARCHAR(20)   NOT NULL   e.g. 'P.5', 'P.5-6', 'M.1'
                -- Auto-updated when students of different grade are added
is_active       BOOLEAN       DEFAULT true
created_at      TIMESTAMP
UNIQUE (template_id, teacher_id, slot_id)
```

**Grade label auto-update rule:**
```
Initially: 'P.5' (first student's grade)
Add P.6 student: → system updates to 'P.5-6'
Add P.4 student: → system updates to 'P.4-6'
Teacher decides if mixed grades are appropriate before confirming
```

### `enrollments`
> One row per student × subject package purchased

```sql
id            SERIAL        PK
student_id    VARCHAR(50)   FK → students.id
subject_id    VARCHAR(50)   FK → subjects.id
grade_id      VARCHAR(10)   FK → grades.id
hours_total   INT           NOT NULL   e.g. 48, 36, 24, 12
hours_used    INT           DEFAULT 0
hours_left    INT           AS (hours_total - hours_used)  -- computed
leave_quota   INT           AS (hours_total / 8)
              -- 24h→3, 48h→6, 72h→9, 96h→12
leaves_used   INT           DEFAULT 0
price         DECIMAL(10,2)
invoice_id    INT           FK → invoices.id   NULL until paid
status        VARCHAR(20)   DEFAULT 'active'   'active' | 'completed' | 'suspended'
start_date    DATE
end_date      DATE          NULL = open-ended
created_at    TIMESTAMP
updated_at    TIMESTAMP
```

**Leave logic:**
```
leaves_used < leave_quota  → attendance status = 'leave'      → ไม่หัก
leaves_used >= leave_quota → attendance status = 'leave_over' → หัก (เหมือน absent)
```

**Display helper:** `[subject.name] [grade.label] · [hours_total]h.`
Example: `Eng (Active) ป.4 · 48h.`

### `classes`
> Active class — a calendar_template_cell that has students assigned

```sql
id              SERIAL        PK
template_cell_id INT          FK → calendar_template_cells.id
branch_id       VARCHAR(50)   FK → branches.id
teacher_id      VARCHAR(50)   FK → staff.id
subject_id      VARCHAR(50)   FK → subjects.id
slot_id         INT           FK → branch_time_slots.id
day_of_week     INT           1=Mon … 7=Sun
grade_label     VARCHAR(20)   e.g. 'P.5', 'P.5-6' (mirrors template_cell, auto-updated)
student_count   INT           DEFAULT 0   (denormalized for quick capacity check)
status          VARCHAR(20)   DEFAULT 'active'   'active' | 'paused' | 'ended'
created_at      TIMESTAMP
```

**Capacity rules:**
```
student_count > 6           → ⚠️ Warning (soft limit, not blocked)
concurrent classes at same slot > branch.room_count → ❌ ERROR (hard block)
```

### `class_students` (students enrolled in a class group)
```sql
class_id    INT           FK → classes.id
student_id  VARCHAR(50)   FK → students.id
joined_at   TIMESTAMP
left_at     TIMESTAMP     NULL = still in class
PRIMARY KEY (class_id, student_id)
```

---

## 4. Session & Attendance Tables

### `sessions`
> Each physical class occurrence

```sql
id          VARCHAR(20)   PK   e.g. 's1', 's2' / UUID in production
class_id    INT           FK → classes.id   NULL if one-off
subject_id  VARCHAR(50)   FK → subjects.id
grade_id    VARCHAR(10)   FK → grades.id
teacher_id  VARCHAR(50)   FK → staff.id
room_id     INT           FK → rooms.id
branch_id   VARCHAR(50)   FK → branches.id
date        DATE          NOT NULL
slot_id     INT           FK → time_slots.id
col         INT                1=Mon … 7=Sun  (for calendar display)
color_key   VARCHAR(20)        derived from subject — may be denormalized for perf
state       VARCHAR(30)   DEFAULT 'upcoming'
            -- ENUM: 'upcoming' | 'active' | 'ended' | 'summary_pending'
            --        'summary_written' | 'summary_sent' | 'closed'
started_at  VARCHAR(10)   NULL   e.g. '14:35'  (teacher check-in time)
ended_at    VARCHAR(10)   NULL   (teacher check-out time)
is_trial    BOOLEAN       DEFAULT false   (CRM trial class)
created_at  TIMESTAMP
updated_at  TIMESTAMP
```

### `session_students`
> Which students were in a session (roster)

```sql
session_id  VARCHAR(20)   FK → sessions.id
student_id  VARCHAR(50)   FK → students.id   NULL if not in DB (lead/trial)
student_name VARCHAR(100)  denormalized for display (supports non-DB students)
PRIMARY KEY (session_id, student_name)
```

### `attendance`
> Per-student attendance record per session

```sql
id          SERIAL        PK
session_id  VARCHAR(20)   FK → sessions.id
student_id  VARCHAR(50)   FK → students.id   NULL if trial/lead
student_name VARCHAR(100) NOT NULL
status      VARCHAR(20)   NOT NULL
            -- ENUM: 'present' | 'absent' | 'leave' | 'leave_over' | 'reschedule' | 'transfer'
deducts     BOOLEAN       AS (status IN ('present','absent','leave_over'))
            -- or computed from ATTENDANCE_META
recorded_at TIMESTAMP
recorded_by VARCHAR(50)   FK → staff.id
```

**Deduction rule (ATTENDANCE_META):**
| status     | deducts | badge_class   |
|------------|---------|---------------|
| present    | TRUE    | badge-green   |
| absent     | TRUE    | badge-red     |
| leave      | FALSE   | badge-yellow  |
| leave_over | TRUE    | badge-red     |
| reschedule | FALSE   | badge-blue    |
| transfer   | FALSE   | badge-gray    |

### `summaries`
> Session summary written by teacher, sent to parent

```sql
id          SERIAL        PK
session_id  VARCHAR(20)   FK → sessions.id
student_id  VARCHAR(50)   FK → students.id
student_name VARCHAR(100) NOT NULL
text        TEXT          NOT NULL
text_th     TEXT          NULL   (Thai translation)
written_by  VARCHAR(50)   FK → staff.id
written_at  TIMESTAMP
sent_at     TIMESTAMP     NULL
sent_via    VARCHAR(20)   'inbox' | 'line' | NULL
is_sent     BOOLEAN       DEFAULT false
```

> **Rule:** Once `is_sent = true` → **immutable**. To modify: delete + resend creates new record.

---

## 5. Billing Tables

### `invoices`
```sql
id          VARCHAR(30)   PK   e.g. 'INV-2026-0032'
student_id  VARCHAR(50)   FK → students.id
family_id   VARCHAR(50)   FK → families.id
amount      DECIMAL(10,2) NOT NULL
status      VARCHAR(30)   DEFAULT 'draft'
            -- ENUM: 'draft' | 'pending_verification' | 'paid' | 'overdue' | 'cancelled'
course_label VARCHAR(100)       e.g. 'Eng (Active) ป.4 · 48h.'
                                -- format: '[subject] [grade] · [hours]h.'
due_date    DATE          NULL
paid_at     TIMESTAMP     NULL
created_at  TIMESTAMP
created_by  VARCHAR(50)   FK → staff.id
updated_at  TIMESTAMP
```

**Invoice → status flow:**
```
draft → pending_verification → paid
draft → cancelled
paid  → (immutable)
```

---

## 6. CRM Tables

### `form_tokens`
> Unique link generated when Admin sends a form to a Parent
```sql
id          VARCHAR(20)   PK   e.g. 'a7f3k9x2'
form_type   VARCHAR(20)   NOT NULL   'test' | 'trial' | 'enrollment'
lead_id     VARCHAR(50)   FK → leads.id   NULL if new lead
sent_by     VARCHAR(50)   FK → staff.id
branch_id   VARCHAR(50)   FK → branches.id
expires_at  TIMESTAMP     NOT NULL   (created_at + 7 days)
used_at     TIMESTAMP     NULL       (set when Parent submits)
created_at  TIMESTAMP
```

### `form_submissions`
> Parent's submitted form — pending Admin review
```sql
id              SERIAL        PK
token_id        VARCHAR(20)   FK → form_tokens.id
form_type       VARCHAR(20)   NOT NULL   'test' | 'trial' | 'enrollment'
branch_id       VARCHAR(50)   FK → branches.id
status          VARCHAR(20)   DEFAULT 'pending'
                -- 'pending' | 'approved' | 'edited' | 'rejected'
payload         JSONB         NOT NULL   raw form data
                -- { parents:[], students:[], schedule, course, payment... }
reviewed_by     VARCHAR(50)   FK → staff.id   NULL until reviewed
reviewed_at     TIMESTAMP     NULL
submitted_at    TIMESTAMP     NOT NULL
```

**After Admin Approves:**
```
Test/Trial submission →
  → families record (if new)
  → leads record / stage updated
  → session created (is_test=true or is_trial=true)

Enrollment submission →
  → lead.stage = 'enrolled' → student created
  → enrollments (per subject)
  → invoices (per subject)
  → class_students (assigned)
```

### `leads`
```sql
id              VARCHAR(50)   PK   e.g. 'sarah', 'arjun' / UUID
name            VARCHAR(100)  NOT NULL
course_interest VARCHAR(100)       e.g. 'Eng (Active)', 'Math ป.4'
age             INT           NULL
source          VARCHAR(50)        'Referred' | 'Website' | 'Walk-in' | 'Referral'
stage           VARCHAR(30)   DEFAULT 'new'
                -- ENUM: 'new' | 'contacting' | 'test' | 'trial' | 'payment_pending' | 'enrolled' | 'archived'
days_ago        INT                days since lead created (compute from created_at)
assignee_id     VARCHAR(50)   FK → staff.id   NULL = unassigned
line_id         VARCHAR(50)
phone           VARCHAR(20)
sched_date      VARCHAR(50)   NULL   scheduled test/trial date (e.g. '16 May 10:30')
archived_from   VARCHAR(30)   NULL   stage before archived (e.g. 'test', 'contacting')
converted_to    VARCHAR(50)   FK → students.id   NULL until enrolled
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

**Lead stage badge colors (LEAD_STAGES):**
| stage           | label              | bg       | color   |
|-----------------|--------------------|----------|---------|
| new             | New Lead           | #ede9fe  | #6366f1 |
| contacting      | Contacting         | #fef3c7  | #f59e0b |
| test            | Interested (Test)  | #ffedd5  | #f97316 |
| trial           | Interested (Trial) | #f5f3ff  | #8b5cf6 |
| payment_pending | Payment Pending    | #fee2e2  | #b91c1c |
| enrolled        | Enrolled           | #dcfce7  | #15803d |
| archived        | Archived           | #f3f4f6  | #9ca3af |

**Lead → Customer rule:**
```
When lead.stage = 'enrolled' AND invoice.status = 'paid':
  1. Create students record
  2. Create families record  
  3. lead.converted_to = student.id
  4. Lead hidden from pipeline (show only stage ≠ 'enrolled' by default)
```

---

## 7. Inbox / Messaging Tables

### `conversations`
```sql
id          VARCHAR(50)   PK   e.g. 'tanaka', 'wilson' / UUID
family_id   VARCHAR(50)   FK → families.id
student_id  VARCHAR(50)   FK → students.id   (primary student for thread)
branch_id   VARCHAR(50)   FK → branches.id
channel     VARCHAR(20)        'LINE' | 'Phone' | 'Email' | 'Form'
assignee_id VARCHAR(50)   FK → staff.id   NULL = unassigned
unread      BOOLEAN       DEFAULT false
last_msg_at TIMESTAMP
preview_text VARCHAR(200)
created_at  TIMESTAMP
```

### `messages`
```sql
id          SERIAL        PK
conv_id     VARCHAR(50)   FK → conversations.id
type        VARCHAR(20)   NOT NULL
            -- ENUM: 'inbound' | 'staff' | 'internal'
            -- 'inbound'  = from parent (LINE/etc.)
            -- 'staff'    = staff reply (visible to parent)
            -- 'internal' = internal note (hidden from parent) — prefix '//' triggers this
text        TEXT          NOT NULL
sender_name VARCHAR(100)
sender_id   VARCHAR(50)   FK → staff.id   NULL if inbound
created_at  TIMESTAMP
is_read     BOOLEAN       DEFAULT false
```

**Internal note rule:**
```
If message starts with '//' → strip '//' → save as type: 'internal'
Display prefix: "📎 Note (Internal): ..."
```

---

## 8. Notes Table (Polymorphic)

### `notes`
```sql
id          SERIAL        PK
entity_type VARCHAR(30)   NOT NULL   'student' | 'family' | 'staff' | 'session'
entity_id   VARCHAR(50)   NOT NULL
type        VARCHAR(20)              'teacher' | 'admin' | 'system'
text        TEXT          NOT NULL
author_id   VARCHAR(50)   FK → staff.id
author_name VARCHAR(100)  (denormalized for display)
note_date   VARCHAR(20)              display date string e.g. '13 May'
created_at  TIMESTAMP
```

---

## 9. Student Timeline Events

### `timeline_events`
```sql
id          SERIAL        PK
student_id  VARCHAR(50)   FK → students.id
type        VARCHAR(30)   NOT NULL
            -- ENUM: 'enrollment' | 'session' | 'attendance' | 'summary'
            --        'payment' | 'renewal' | 'note'
date        DATE          NOT NULL
description TEXT          NOT NULL   e.g. 'Enrolled in Math ป.6 (24h)'
ref_id      VARCHAR(50)   NULL   FK to related record (session_id, invoice_id, etc.)
created_at  TIMESTAMP
```

**Sample timeline descriptions by type:**
```
enrollment  → 'Enrolled in Math ป.6 (24h)'
session     → 'Class with Kru Arm — Present'
attendance  → 'Absent — Lesson 5'
summary     → 'Summary sent: Fractions — great progress!'
payment     → 'Invoice #INV-001 paid ฿12,000'
renewal     → 'Renewal reminder sent'
note        → 'Staff note: parent called about schedule'
```

---

## 10. Key Computed / Derived Values

These are computed at query time, NOT stored (except for perf denormalization):

```sql
-- Student renewal status
CASE
  WHEN MIN(e.hours_left) <= 1 THEN 'urgent'
  WHEN MIN(e.hours_left) <= 2 THEN 'renewal'
  ELSE 'active'
END AS renewal_status
FROM enrollments e WHERE e.student_id = :id AND e.status = 'active'

-- Hours consumed (deductible attendance only)
SELECT COUNT(*) AS deducted
FROM attendance a
WHERE a.student_id = :id
  AND a.session_id IN (SELECT id FROM sessions WHERE subject_id = :subject)
  AND a.deducts = true

-- Unread messages count per conversation
SELECT COUNT(*) FROM messages WHERE conv_id = :id AND is_read = false AND type = 'inbound'

-- Invoice overdue flag
status = 'overdue' WHEN due_date < NOW() AND status NOT IN ('paid','cancelled')
```

---

## 11. Enum Reference (Quick Lookup)

```javascript
// student.status (computed)
'active' | 'renewal' | 'urgent' | 'inactive'

// session.state
'upcoming' | 'active' | 'ended' | 'summary_pending' | 'summary_written' | 'summary_sent' | 'closed'

// attendance.status
'present' | 'absent' | 'leave' | 'leave_over' | 'reschedule' | 'transfer'

// invoice.status
'draft' | 'pending_verification' | 'paid' | 'overdue' | 'cancelled'

// lead.stage
'new' | 'contacting' | 'test' | 'trial' | 'payment_pending' | 'enrolled' | 'archived'

// enrollment.status
'active' | 'completed' | 'suspended'

// message.type
'inbound' | 'staff' | 'internal'

// note.type
'teacher' | 'admin' | 'system'

// timeline_events.type
'enrollment' | 'session' | 'attendance' | 'summary' | 'payment' | 'renewal' | 'note'

// staff.role
'Teacher' | 'Admin'

// family.status
'active' | 'urgent' | 'pending' | 'inactive'
```

---

## 12. Key Business Rules for Backend

```
1. ATTENDANCE DEDUCTION
   - present, absent, leave_over → deducts = true → enrollment.hours_used++
   - leave, reschedule, transfer → deducts = false → no deduction

2. RENEWAL THRESHOLDS
   - hours_left ≤ 1 → status = 'urgent'  → notify staff immediately
   - hours_left ≤ 2 → status = 'renewal' → show warning badge

3. SESSION STATE MACHINE
   - upcoming → active (teacher starts class)
   - active → ended (teacher checks out)
   - ended → summary_pending (auto-trigger)
   - summary_pending → summary_written (teacher writes)
   - summary_written → summary_sent (send to parent)
   - summary_sent → closed (confirmed delivery)
   - Once summary_sent → immutable (cannot edit, must resend)

4. CRM LEAD → STUDENT
   - lead.stage = 'enrolled' + invoice.status = 'paid'
   → Create students + families records
   → lead.converted_to = student.id
   → Lead filtered from pipeline (stage = 'enrolled' hidden)

5. INVOICE COURSE LABEL FORMAT
   → '[subject_name] [grade_label] · [hours_total]h.'
   → 'Eng (Active) ป.4 · 48h.'   ← must follow this format exactly

6. INTERNAL MESSAGE
   → text starts with '//' → strip → type = 'internal'
   → Display: '📎 Note (Internal): ...'
   → NOT visible to parent/customer

7. SUBJECT DISPLAY
   → ALWAYS use: subject.name + ' ' + grade.label
   → 'Math ป.5', 'Eng (Active) ป.4'
   → NEVER hardcode 'Math ป.5' as a single string in DB
```

---

## 13. Suggested Tech Stack for Full-Stack

```
Backend:   Node.js (Express) or Python (FastAPI)
Database:  PostgreSQL (relational, with JSONB for flexible fields)
ORM:       Prisma (Node) or SQLAlchemy (Python)
Auth:      JWT + Role-based (Admin | Teacher)
Realtime:  Socket.io or Supabase Realtime (for Inbox)
File:      AWS S3 or Supabase Storage (payment slip images)
Cache:     Redis (session states, renewal badges)

Frontend:  Keep as Vanilla JS → or migrate to Next.js / Nuxt
API:       REST + optional GraphQL for complex profile queries
```

---

*Last updated: 20 May 2026 | NockERP DATABASE_SCHEMA.md*
*Source of truth: data.js + FLOWS.md + CLAUDE.md*
*Updated: 5 Roles (director/area_manager/manager/admin/teacher), Leave Quota formula (hours÷8), leaves_used field*
*Revised 20 May 2026: Added branch_time_slots (per-branch, flexible), branch_operating_days,*
*branch_package_prices, holidays (Director-only), global_course_templates + subjects,*
*branch_courses + branch_course_subjects (multi-subject courses), calendar_day_templates,*
*calendar_template_cells (Teacher×TimeSlot grid), staff_subjects.grade_range,*
*updated classes to reference template_cell, branches.phone/line_oa/room_count*
