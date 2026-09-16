# COMPONENTS.md — NockERP CSS Component Catalog
> อ่านไฟล์นี้แทนการอ่าน main.css (386 บรรทัด)
> ทุก class ที่มีอยู่จริงใน main.css อยู่ที่นี่ครบ

*Source: css/main.css | Last synced: 14 May 2026*

---

## 📋 Table of Contents
1. [Design Tokens](#1-design-tokens)
2. [Layout & Shell](#2-layout--shell)
3. [Buttons](#3-buttons)
4. [Badges & Pills](#4-badges--pills)
5. [Cards & KPI Cards](#5-cards--kpi-cards)
6. [Tables](#6-tables)
7. [Tabs & Filter Chips](#7-tabs--filter-chips)
8. [Modals](#8-modals)
9. [Forms & Settings](#9-forms--settings)
10. [Alerts & Timeline](#10-alerts--timeline)
11. [Calendar](#11-calendar)
12. [Inbox & Chat](#12-inbox--chat)
13. [CRM Pipeline](#13-crm-pipeline)
14. [Attendance Buttons](#14-attendance-buttons)
15. [Profile & People](#15-profile--people)
16. [Reports & Charts](#16-reports--charts)
17. [Misc Utilities](#17-misc-utilities)

---

## 1. Design Tokens

```css
/* Colors */
--primary:       #6366f1   /* Indigo — buttons, active, focus */
--primary-dark:  #5355d1   /* Hover */
--dark:          #1a1d23   /* Sidebar, page titles */
--surface:       #f5f6fa   /* Page background */
--white:         #ffffff
--border:        #e5e7eb
--border-light:  #f3f4f6

/* Text */
--text-primary:  #1a1d23
--text-secondary:#374151
--text-muted:    #6b7280
--placeholder:   #9ca3af

/* Semantic */
--green:  #10b981   /* Active, Paid, Present, Success */
--yellow: #f59e0b   /* Pending, Warning, Leave */
--red:    #ef4444   /* Danger, Urgent, Absent */
--blue:   #6366f1   /* Info, Scheduled */
--orange: #f97316   /* Science subject */
--purple: #8b5cf6   /* Trial, Transfer */
```

**Font:** Inter (system-ui fallback) — no external dependencies

---

## 2. Layout & Shell

### Page Structure
```html
<!-- Already in index.html — do NOT recreate -->
<nav class="app-rail">...</nav>          <!-- system switcher (Academy/Finance/HR) -->
<nav id="sidebar">
  <div class="sidebar-nav">
    <div id="nav-academy">...</div>      <!-- Academy menu -->
    <div id="nav-finance" hidden>...</div><!-- Finance menu (shown by switchSystem) -->
  </div>
</nav>
<div id="main">
  <div id="topnav">...</div>
  <div id="content">
    <div class="view active" id="view-[name]">
      <!-- Each module renders here -->
    </div>
  </div>
</div>
<div id="modals"><!-- Modal.create() injects here --></div>
```

### App Rail — system switcher (ClickUp 2-tier nav)
```html
<!-- index.html · style in main.css (.app-rail/.rail-item) -->
<nav class="app-rail">
  <div class="rail-brand"><img src="img/logo.png"></div>
  <button class="rail-item active" data-sys="academy" onclick="switchSystem('academy')">
    <span class="mdi">school</span><span class="rail-label">Academy</span></button>
  <button class="rail-item" data-sys="finance" onclick="switchSystem('finance')">…</button>
  <button class="rail-user" onclick="openSwitchModal()">  <!-- user avatar pinned bottom (margin-top:auto) -->
    <div class="rail-av" id="rail-av">N</div><span class="rail-label" id="rail-user-role">—</span></button>
</nav>
```
The user card lives on the rail (not the secondary sidebar). The secondary `#sidebar` shows
search + notifications + menu only — no logo, no user card.
`switchSystem(sys)` (app.js) toggles `.rail-item.active`, shows the matching `#nav-<sys>`
group, hides the others, updates the logo subtitle, and `showView()`s that system's
default. Adding a new system = new rail button + `#nav-<sys>` group + its view containers
+ a branch in `switchSystem`.

### Page Header (use at top of every view)
```html
<div class="page-header">
  <div>
    <div class="page-title">Page Name</div>
    <div class="page-sub">subtitle or count</div>
  </div>
  <div style="display:flex;gap:8px">
    <!-- action buttons -->
  </div>
</div>
```

### Grid Layouts
```html
<div class="grid-2">...</div>  <!-- 2 columns, gap:16px -->
<div class="grid-3">...</div>  <!-- 3 columns, gap:16px -->
<div class="kpi-grid">...</div><!-- 4 columns, gap:14px — for KPI cards -->
```

### Sidebar Elements
```css
.nav-section      /* nav group wrapper */
.nav-label        /* section label (uppercase, muted) */
.nav-item         /* clickable nav link */
.nav-item.active  /* current page — indigo left border */
.nav-badge        /* red count bubble — auto right-aligned */
.nav-badge.yellow /* yellow variant */
```

---

## 3. Buttons

```html
<!-- Sizes -->
<button class="btn btn-primary">Default</button>
<button class="btn btn-primary btn-sm">Small</button>
<button class="btn btn-primary btn-xs">Extra Small</button>

<!-- Variants -->
<button class="btn btn-primary">  Indigo filled — main action    </button>
<button class="btn btn-secondary">White outlined — secondary      </button>
<button class="btn btn-danger">   Red filled — destructive        </button>
<button class="btn btn-success">  Green filled — confirm/active   </button>
<button class="btn btn-ghost">    Transparent — subtle/archive    </button>

<!-- Inline chat/action button (next to names in tables) -->
<button class="chat-btn">💬</button>   <!-- 22×22px emoji button -->
<button class="chat-btn">📞</button>
```

**Rules:**
- Primary = main CTA per section (1 per view header)
- Secondary = supporting actions (View, Edit, Export)
- Ghost = low-priority (Archive, Cancel)
- `btn-sm` = filter bars, table rows
- `btn-xs` = inside modals, inline actions

---

## 4. Badges & Pills

### Status Badges
```html
<span class="badge badge-green">Active / Paid / Present</span>
<span class="badge badge-yellow">Pending / Leave / Renewal</span>
<span class="badge badge-red">Urgent / Absent / Overdue</span>
<span class="badge badge-blue">Scheduled / Info</span>
<span class="badge badge-purple">Trial / Transfer</span>
<span class="badge badge-gray">Inactive / Archived</span>
<span class="badge badge-orange">Science sessions</span>
```

### Semantic Mapping
| Badge | When to use |
|-------|------------|
| `badge-green` | active, paid, present, success |
| `badge-yellow` | renewal pending, leave, warning |
| `badge-red` | urgent (1 class left), absent, overdue |
| `badge-blue` | upcoming/scheduled, info |
| `badge-purple` | trial lead, transfer attendance |
| `badge-gray` | inactive, archived, walk-in |
| `badge-orange` | Science subject color |

### Pill (package/course tags)
```html
<span class="pill">Eng (Active) ป.4 · 48h.</span>
<span class="pill">Math ป.6 · 36h.</span>
<!-- Gray rounded rectangle, lighter than badge -->
```

### Nav Badge Dot (topnav notification)
```html
<div class="badge-dot"></div>
<!-- Red dot overlay on icon-btn -->
```

---

## 5. Cards & KPI Cards

### Basic Card
```html
<div class="card">
  <div class="card-header">
    <span class="card-title">Title</span>
    <button class="btn btn-ghost btn-xs">Action</button>
  </div>
  <div class="card-body">content</div>
</div>

<!-- Card with no padding (table inside) -->
<div class="card" style="padding:0;overflow:hidden">
  <div class="table-wrap">...</div>
</div>
```

### KPI Card
```html
<div class="kpi-grid">
  <div class="kpi-card">
    <div class="kpi-icon" style="background:#ede9fe">📚</div>
    <div class="kpi-label">TOTAL STUDENTS</div>
    <div class="kpi-value">87</div>
    <div class="kpi-change up">↑ 5 this month</div>
    <!-- kpi-change.up = green | kpi-change.down = red -->
  </div>
</div>
```

### CRM Stat Card (5-column bar)
```html
<div class="crm-stats">
  <div class="crm-stat-card">
    <div class="crm-stat-val">87</div>
    <div class="crm-stat-lbl">Total Customers</div>
    <div class="crm-stat-sub">+5 this month</div>
    <!-- crm-stat-sub.down = red -->
  </div>
</div>
```

---

## 6. Tables

### Standard Table
```html
<div class="card" style="padding:0;overflow:hidden">
  <div class="table-wrap">  <!-- handles horizontal overflow -->
    <table>
      <thead>
        <tr>
          <th onclick="sort('col')" class="sort-asc">Name ↑</th>
          <!-- th.sort-asc → appends " ↑" | th.sort-desc → " ↓" -->
        </tr>
      </thead>
      <tbody>
        <tr class="tr-click" onclick="..."> <!-- clickable row -->
          <td>content</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

### Table Controls Bar (filter + search above table)
```html
<div class="table-controls">  <!-- flex row, background:#f9fafb -->
  <input  class="tc-search" placeholder="Search…">
  <select class="tc-select">...</select>
  <span   class="ts-label">Filter:</span>
  <div style="margin-left:auto"><!-- right-aligned actions --></div>
</div>
```

---

## 7. Tabs & Filter Chips

### Tabs (inside views and modals)
```html
<div class="tabs">
  <div class="tab active" onclick="switchTab('a',this)">Tab A</div>
  <div class="tab"        onclick="switchTab('b',this)">Tab B</div>
</div>
```
- Border-bottom highlight on active
- Inside `.modal-tabbed` modal → modal stays fixed height, content scrolls

### Filter Chips (status/category filter)
```html
<div style="display:flex;gap:4px">
  <div class="filter-chip active" onclick="filter('all',this)">All</div>
  <div class="filter-chip"        onclick="filter('active',this)">Active</div>
  <div class="filter-chip"        onclick="filter('renewal',this)">Renewal</div>
</div>
<!-- Active chip = indigo filled -->
```

### Time Series Chips (Reports filter bar)
```html
<div class="ts-bar">
  <span class="ts-label">Period:</span>
  <div class="ts-chip active">7 Days</div>
  <div class="ts-chip">30 Days</div>
  <div class="ts-divider"></div>  <!-- vertical separator -->
  <input class="ts-date-input" type="date">
</div>
```

---

## 8. Modals

### Create Modal (always use Modal.create())
```javascript
Modal.create(
  id,          // unique string e.g. 'modal-student-mia'
  title,       // header text e.g. '👤 Mia Tanaka'
  bodyHTML,    // inner HTML string
  footerHTML,  // button row HTML ('' = no footer)
  size         // '' | 'modal-lg' | 'modal-xl' | 'modal-tabbed'
);
Modal.close(id);
Modal.closeAll();
```

### Size Reference
| Size | Width | Use for |
|------|-------|---------|
| `''` (default) | 640px | Simple info modals, confirmations |
| `'modal-lg'` | 760px | Profile modals (Students, Families, Staff) |
| `'modal-xl'` | 960px | Complex modals (Calendar class, CRM customer) |
| `'modal-tabbed'` | 760px + **fixed 78vh** | Tabbed modals — body scrolls, height fixed |

### Modal Body Sections
```html
<!-- Info grid (2-column label/value pairs) -->
<div class="info-grid">
  <div class="info-item">
    <div class="label">Phone</div>
    081-234-5678
  </div>
  <div class="info-item">
    <div class="label">Branch</div>
    Sukhumvit
  </div>
</div>

<!-- Section with title -->
<div class="modal-section">
  <div class="modal-section-title">SECTION TITLE</div>
  <!-- content -->
</div>
```

### Profile Header (inside modal)
```html
<div class="profile-header">
  <div class="profile-avatar">M</div>  <!-- single letter -->
  <div style="flex:1">
    <div class="profile-name">Mia Tanaka</div>
    <div class="profile-meta">Age 9 · Sukhumvit</div>
    <div class="profile-tags">
      <span class="badge badge-yellow">Renewal Pending</span>
    </div>
  </div>
  <div class="profile-stats">
    <div><div class="stat-val">46</div><div class="stat-lbl">Classes Used</div></div>
  </div>
</div>
```

---

## 9. Forms & Settings

```html
<div class="settings-group">
  <label class="settings-label">Field Name</label>
  <input  class="settings-input" type="text" placeholder="…">
  <select class="settings-input">...</select>
  <textarea class="settings-input" rows="3"></textarea>
</div>

<!-- 2-column row -->
<div class="settings-row">
  <div>...</div>
  <div>...</div>
</div>

<!-- 3-column row -->
<div class="settings-row-3">
  <div>...</div><div>...</div><div>...</div>
</div>

<!-- Phone entry (with remove button) -->
<div class="phone-entry">
  <input class="settings-input">
  <button class="btn btn-ghost btn-sm">✕</button>
</div>
```

---

## 10. Alerts & Timeline

### Alert / Risk Item
```html
<div class="alert-item">
  <div class="alert-bar danger"></div>  <!-- danger|warning|info -->
  <div class="alert-body">
    <div class="alert-level danger">DANGER</div>  <!-- danger|warning|info -->
    <div class="alert-text">Description of the issue</div>
    <div class="alert-time">2 min ago</div>
    <div class="alert-action">Take Action →</div>
  </div>
</div>
```
| Severity | Color | When |
|----------|-------|------|
| `danger` | Red | Happening now — fix immediately |
| `warning`| Yellow | Will happen soon if not fixed |
| `info` | Indigo | Good to know, not urgent |

### Timeline Item
```html
<div class="timeline-item">
  <div class="tl-dot" style="background:#10b981"></div>  <!-- custom color -->
  <div class="tl-content">
    <div class="tl-text">Summary sent — Session #38 · Kru Bee</div>
    <div class="tl-time">Today 10:15</div>
  </div>
</div>
```

### Task Item
```html
<div class="task-item">
  <div class="task-check" onclick="toggleTask(this)"></div>
  <!-- task-check.done → indigo bg + checkmark -->
  <div class="task-info">
    <div class="task-text">Task description</div>
    <!-- task-text.done → strikethrough gray -->
    <div class="task-sub">Subtask or note</div>
  </div>
  <div class="task-right">
    <div class="task-due">Tomorrow</div>
    <!-- task-due.urgent → red bold -->
    <span class="task-source ai">AI</span>
    <!-- task-source: ai|manager|admin|system -->
  </div>
</div>
```

### Notification Item
```html
<div class="notif-item">
  <div class="notif-icon blue">📅</div>
  <!-- notif-icon: blue|green|yellow|red -->
  <div>
    <div class="notif-text">Notification text</div>
    <div class="notif-time">5 min ago</div>
  </div>
</div>
```

---

## 11. Calendar

### Views Container
```html
<div class="cal-fill">  <!-- height: calc(100vh - 290px), overflow:auto -->
  <!-- Week / Teacher view grid -->
</div>
```

### Week View Grid
```html
<div class="cal-days">
  <!-- grid: 60px + 7 × 1fr -->
  <div class="cal-day-header"><!-- empty corner --></div>
  <div class="cal-day-header today">Wed 13</div>   <!-- .today = indigo -->
  <div class="cal-day-header holiday">Fri 15 🏖️</div> <!-- .holiday = red -->

  <!-- Time slot row -->
  <div class="cal-time">10:00<span class="end-time">12:00</span></div>
  <div class="cal-cell">
    <div class="cal-event green" onclick="openClassModal('s1')">
      Math G5 · Room 1
    </div>
  </div>

  <!-- Break row -->
  <div class="cal-time break-row">12:00</div>
  <div class="cal-cell break-cell"></div><!-- × 7 -->
</div>
```

### Calendar Event Colors
```css
.cal-event          /* default: indigo — Eng */
.cal-event.green    /* Math, Thai */
.cal-event.yellow   /* Eng (Active) */
.cal-event.purple   /* Eng (Grammar) */
.cal-event.orange   /* Science */
.holiday-event      /* Red — holiday block */
```
> ⚠️ สีมาจาก `CONST.SUBJECT_COLOR[session.subject]` — ไม่ hardcode

### Month View
```html
<div class="cal-month-grid">   <!-- 7-column grid -->
  <div class="cal-month-head">Mon</div>  <!-- × 7 -->
  <div class="cal-month-cell today">
    <span class="cal-month-num">13</span>
    <!-- .today → date number gets indigo circle -->
    <div class="cal-event green">Math G5</div>
  </div>
  <div class="cal-month-cell holiday">
    <span class="cal-month-num">15 🏖️</span>
  </div>
  <div class="cal-month-cell other-month">
    <span class="cal-month-num">1</span>
  </div>
</div>
```

### Year View (mini months)
```html
<div class="cal-year-grid">  <!-- 4-column grid -->
  <div class="cal-mini-month">
    <div class="cal-mini-title">May 2026</div>
    <div class="cal-mini-grid">
      <div class="cal-mini-cell">1</div>
      <div class="cal-mini-cell has-session">13</div>  <!-- 1-2 classes: indigo light -->
      <div class="cal-mini-cell has-many">14</div>     <!-- 3+ classes: indigo solid -->
      <div class="cal-mini-cell today-cell">13</div>   <!-- green -->
      <div class="cal-mini-cell holiday-cell">15</div> <!-- red -->
    </div>
  </div>
</div>
```

---

## 12. Inbox & Chat

```html
<div class="inbox-layout">  <!-- 280px list + flex chat area -->

  <!-- LEFT: conversation list -->
  <div class="inbox-list">
    <div class="inbox-item unread active" onclick="openConversation('id')">
      <span class="inbox-time">10:42</span>
      <div class="inbox-name">Tanaka Family</div>  <!-- bold if .unread -->
      <div class="inbox-preview">truncated preview…</div>
      <div class="inbox-assign-tag">👤 Admin Nock</div>
    </div>
  </div>

  <!-- RIGHT: chat area -->
  <div class="chat-area">
    <div class="chat-header">...</div>
    <div class="chat-messages">
      <div><div class="msg parent">Parent message<div class="msg-meta">Sender · time</div></div></div>
      <div><div class="msg staff">Staff reply<div class="msg-meta">Sender · time</div></div></div>
      <div><div class="msg internal">📎 Internal note (yellow dashed)</div></div>
    </div>
    <div class="chat-input">
      <input placeholder="Reply… (type // for internal note)">
      <button class="btn btn-primary">Send</button>
    </div>
  </div>

</div>
```
| Message type | Style |
|-------------|-------|
| `msg.parent` | Gray bg, left-aligned |
| `msg.staff` | Indigo bg, white text, right-aligned |
| `msg.internal` | Yellow bg, dashed border, italic |

---

## 13. CRM Pipeline

```html
<div class="crm-stats">  <!-- 5-col KPI bar -->
  <div class="crm-stat-card">
    <div class="crm-stat-val">87</div>
    <div class="crm-stat-lbl">Label</div>
    <div class="crm-stat-sub">+5 this month</div>
    <!-- .crm-stat-sub.down = red -->
  </div>
</div>

<div id="crm-pipeline" style="display:flex;gap:12px;overflow-x:auto">
  <div class="pipeline-col" data-stage="new">
    <div class="pipeline-header">
      NEW LEAD
      <span class="pipeline-count">3</span>
    </div>
    <div class="lead-card" draggable="true">
      <div class="lead-name">Sarah Mitchell</div>
      <div class="lead-meta">English Reading · Age 9</div>
      <div class="lead-tags">
        <span class="badge badge-blue">Referred</span>
        <button class="chat-btn">💬</button>
      </div>
    </div>
    <!-- .lead-card.archived → dashed border, 65% opacity -->
  </div>
</div>
```

---

## 14. Attendance Buttons

```html
<div class="att-row">  <!-- flex row, border-bottom separator -->
  <div class="att-name">Student Name</div>
  <div class="att-btns">
    <button class="att-btn present sel">Present</button>
    <!-- .sel variants: present=green, leave=yellow, absent=red,
         reschedule=blue, transfer=purple -->
    <button class="att-btn leave">Leave</button>
    <button class="att-btn absent">Absent</button>
    <button class="att-btn reschedule">Reschedule</button>
    <button class="att-btn transfer">Transfer</button>
  </div>
</div>

<!-- Summary states (ended class) -->
<textarea class="summary-ta">...</textarea>
<div class="summary-sent">✅ Summary sent to parent</div>
<div class="summary-pending">📝 Summary required</div>
```

---

## 15. Profile & People

### Session Card (Dashboard / Staff schedule)
```html
<div class="session-card">
  <div class="session-time">10:00–12:00</div>
  <div class="session-dot green"></div>  <!-- green|yellow|blue -->
  <div class="session-info">
    <div class="session-name">Math G5</div>
    <div class="session-meta">Room 1 · Sukhumvit</div>
    <div class="session-teacher">Kru Arm</div>
  </div>
</div>
```

### Renewal Item
```html
<div class="renewal-item">
  <div class="avatar">M</div>
  <div class="renewal-name">Mia Tanaka</div>
  <div class="renewal-classes">2 left</div>
  <button class="btn btn-primary btn-sm">Renew</button>
</div>
```

### Avatar (used everywhere for initials)
```html
<div class="avatar">N</div>  <!-- 32×32, indigo circle, white text -->
<!-- Custom size: style="width:52px;height:52px;font-size:20px" -->
```

---

## 16. Reports & Charts

```html
<div class="report-grid">  <!-- 2-column -->
  <div class="card">
    <div class="card-header"><span class="card-title">Revenue</span></div>
    <div class="report-chart">  <!-- height:140px, flex align-items:flex-end -->
      <div class="bar" style="height:70%"></div>     <!-- indigo -->
      <div class="bar green" style="height:90%"></div>
      <div class="bar yellow" style="height:50%"></div>
      <div class="bar red" style="height:30%"></div>
    </div>
    <div class="bar-labels">
      <span>Jan</span><span>Feb</span>
    </div>
  </div>
</div>
```

---

## 17. Misc Utilities

```css
/* Empty state (no results) */
.empty-state   → centered muted text, padding:40px

/* Divider line */
.divider       → 1px #f3f4f6 horizontal rule

/* Text helpers */
.text-muted    → color:#9ca3af
.text-danger   → color:#ef4444
.text-success  → color:#10b981
.fw-600        → font-weight:600
.mb-16         → margin-bottom:16px
```

### Scrollbar (auto-applied globally)
- Width: 5px, transparent track, light gray thumb

### Inline style patterns used often
```html
<!-- Muted small label -->
<div style="font-size:11px;color:#9ca3af">...</div>

<!-- Section separator -->
<div style="border-top:1px solid #f3f4f6;margin:12px 0"></div>

<!-- Right-aligned flex -->
<div style="display:flex;justify-content:flex-end;gap:8px">...</div>

<!-- Centered empty state (quick) -->
<div style="text-align:center;padding:24px;color:#9ca3af;font-size:13px">
  No data yet
</div>
```

---

## 18. Data Sync & Settings-Driven Catalogs ⭐

> **js/data-sync.js** — โหลดหลัง data-settings.js, ก่อน app.js
> DB.enrollments + Settings pools = single source of truth
> ห้ามใช้ CONST.SUBJECTS / CONST.ROOMS / hardcode ราคา ใน module ใหม่

### window.Sync (derived-data regenerator)
```javascript
Sync.all()            // รันทุกตัว — เรียกหลังแก้ Settings เสมอ
Sync.branchPricing()  // DB.packages + branchSettings.packages[].price → DB.branchPricing
Sync.studentCourses() // DB.enrollments → student.courses[] (display cache)
Sync.studentStatus()  // enrollments → active/renewal/pause (manual pause/archived ไม่ทับ)
Sync.customers()      // enrollments → DB.customers remain/total/status/revenue
Sync.familyTotals()   // DB.invoices(paid) → family.totalPaid/invoiceCount
Sync.dayHeaders()     // DB.holidays → dayHeaders.isHoliday + holidayName
```

### Utils — Settings-driven catalogs (app.js)
```javascript
Utils.subjectsFor(branch?)   // ชื่อวิชา active ของสาขา (ไม่ส่ง branch = pool ทั้งหมด)
Utils.packagesFor(branch)    // packages ที่เปิดในสาขา + ราคา override ต่อสาขา
Utils.pkgPrice(branch, 24)   // ราคา package ตามสาขา
Utils.roomsFor(branch)       // ชื่อห้องของสาขา (Settings → Branch Info → Rooms)
Utils.openDays(branch)       // วันเปิดทำการ เช่น ['Tue','Wed','Thu','Fri','Sat']
Utils.enrollmentsFor(stuId)  // enrollment records ของนักเรียน
Utils.leaveQuota(enr)        // โควต้าลา = packageHours ÷ 8
```

### Settings Scope Switcher (js/settings.js)
```javascript
window.ST_SCOPE          // 'global' | 'branch' — ทั้งหน้า Settings เปลี่ยนตาม dropdown
stSwitchScope(val)       // '__global__' หรือชื่อสาขา
// Global nav:  pool-subjects / pool-grades / pool-packages / holidays
// Branch nav:  info / scheduling / subjects / grades / packages / pricematrix / invoice
// Global = Director เท่านั้น + amber banner "กำลังแก้ค่ากลาง"
```

### Price Matrix (js/settings-pricematrix.js)
```javascript
bs.priceMatrix           // { 'Subject|Grade|Hours': price } ต่อสาขา
bs.packageTypes          // { hour:bool, week:bool } — type ที่สาขาขาย (settings-catalog.js)
stSetMatrix(branch, subject, grade, hours, value, el)  // ว่าง/เท่า default = inherit
                         // update ช่องเดียว ไม่ re-render — scroll ไม่เด้ง
Utils.coursePrice({...}) // 3 ชั้น: course.prices → bs.priceMatrix → pkgPrice

// Scale design (รองรับ 10 วิชา × 12 เกรด × 8 tiers):
// - filter chips: Subject / ระดับ (ประถม-มัธยม) / เฉพาะที่ตั้งราคาเอง
// - accordion ต่อวิชา — default เปิดเฉพาะวิชาที่มีราคา explicit (>3 วิชา)
// - sticky คอลัมน์แรก + scroll แนวนอนเมื่อ tier เยอะ
```

### Summary Approval (calendar-class/form + summaries.js)
```javascript
summaries[name] = {text, submitted, sent, approvedBy}
// ครู: Submit for Approval → กล่อง "รอ approve" + [Recall]
// Admin: หน้า Summaries = card GRID จัดกลุ่มตาม class (ไม่มีปุ่มบนการ์ด!)
//   คลิกการ์ด → Class Modal → [Approve] รายคน หรือ [Approve All (n) & Close]
//   Approve All = approve ทุกคนที่ submit + ปิด class ถ้า summary ครบ
calApproveSummary(sessionId, name) / calApproveAll(sessionId) / calRecallSummary(...)
refreshSummaries()   // เรียกหลัง approve ใน modal → list อัปเดต

// ⭐ Layout rule (จาก Nock): จอกว้าง = grid repeat(auto-fill,minmax(290px,1fr))
//   ไหลซ้าย→ขวา · การ์ด = ข้อมูลสรุป + badge เท่านั้น · CTA ทั้งหมดอยู่ใน modal
```

### Course End Summary (js/course-end.js)
```javascript
DB.courseEndSummaries   // [{id, studentId, enrollmentId, courseName, courseType,
                        //   status:'draft'|'pending_teacher'|'approved'|'sent',
                        //   teacher, confirmedBy, sentAt, subjects:[{subject, grade,
                        //   teacher, overall, strengths, improve, sessionSummaries[]}]}]
renderCourseEnd()       // render เข้า #sum-ces-tab (Summaries → tab "Course End")
cesOpen(id)             // detail modal — editable เมื่อ draft/pending_teacher
cesPDF(id)              // print window (PDF)
// Flow: Teacher สร้าง → draft → approved | Admin สร้าง → draft → pending_teacher → approved
// approved → [Send to Parent] → push เข้า DB.messages ของ family + status 'sent' (immutable)
// autoDraft(): enrollment regular remainHours=0 / bundle blocks หมด → draft อัตโนมัติ
```

### Bundle enrollment shape
```javascript
{ enrollType:'bundle', blocksPaid:2, blockUsed:5, admissionFeePaid:true, ... }
// student.courses cache: { bundle:true, hours:blocksPaid×blockSize, used:blockUsed, left:... }
// Bundle ไม่มี leave quota — _calLeaveQuota คืน {bundle:true, over:true}
```

---

## 19. Finance Side Panel ⭐ (js/fin-side-panel.js → window.FinPanel)
> Shared component ระหว่าง `fin-requests.js` + `fin-expenses.js` (6 Jul 2026, FINANCE-MODEL.md §17/§18) — one visual language:
> table stays **100% width**, click a row → a **drawer slides in from the right** (NOT a persistent split-panel — Nock's explicit call) ·
> drawer has **Info / Logs tabs** (mockup-confirmed, §18 — not a tab-less scroll).
```javascript
FinPanel.drawer(bodyHtml, closeFnName, {width})   // backdrop + fixed slide-over shell
FinPanel.drawerHeader(title, icon, closeFnName)   // title bar + ✕
FinPanel.tabStrip(tabs, activeKey, onClickFnName) // Info/Logs tab strip, tabs:[{key,label}]
FinPanel.topMeta(leftText, badgesHtml)            // muted meta row + badges w/ bottom border — NOT used by
                                                   //   fin-requests.js/fin-expenses.js anymore (§18 dropped the
                                                   //   bordered row for a plain stacked title→badges→meta), kept
                                                   //   for any future page that wants it
FinPanel.sectionLabel(text)                       // small label heading ("Payment method"/"Information"/…)
FinPanel.card(html)                               // card-sm wrapper, margin-top
FinPanel.fieldRow(label, value, copyText)         // label+value+copy button row
FinPanel.copyBtn(text, label)                     // one-click copy button (uses window.frCopy)
FinPanel.docTile(item)  / docGallery(items)        // item:{label?,name?,dataUrl?,type?} — thumbnail grid;
                                                   //   no dataUrl+name but has label → dashed "not attached yet" placeholder
FinPanel.timeline(items)                          // items:[{label,caption,state:done|current|upcoming|bad,extra?}]
                                                   //   vertical icon+line; `extra` = arbitrary HTML pinned to the
                                                   //   right of that row (e.g. the inline upload control/thumbnail
                                                   //   on a Workflow step — see fin-requests.js `workflowFileSteps`)
FinPanel.auditItems(logs, labelMap)               // {action,by,at}[] → timeline items, all state:'done'
```
**Drawer structure per mockup (§18, supersedes §17's 6-section draft):** both pages = **Info tab** (title → badges →
meta → note, no section-label header on top of it) then **Payment method** card → for Request only, **"Workflow &
File upload"** — one merged card (NOT separate Workflow/Files sections) where `workflowFileSteps(r)` attaches an
inline upload control (`uploadControl()`/`frFilePicked()`) or a small thumbnail (`fileThumbSmall()`) directly onto
whichever step is current — plus **Logs tab** (plain audit history, `FinPanel.timeline(FinPanel.auditItems(...))`).
Expense has no Workflow (no approval lifecycle) — Info tab there is just title/badges/meta → Information → Files.

**No standalone "Vendor" field:** Direct Paid always pays the vendor directly (no intermediary account per Nock,
6 Jul 2026) — the Payment method card's "Payment" row already **is** the vendor identity (`r.payTo || r.acctName`).

**Confirm buttons require a file:** `frConfirmSave`/`frTaxInvSave` (fin-requests.js) reject with a toast if no file
is attached — the footer's `#fr-action-btn` also starts `disabled` and is only enabled by `frFilePicked()` once a
file is chosen, matching the mockup's grayed→colored button states.

**"Request by" column (fin-expenses.js ledger):** shows the requester's name via `e.sourceRequestId → DB.expenseRequests`
lookup, or `—` if the expense never came from a request (Record Usage/Reimburse/Recurring/Top-up) — **kept, not removed**,
per Nock's explicit call overriding the ADDENDUM spec's suggestion to drop this column.

---

## 20. Finance Settings shell (js/fin-settings.js + -approval/-accounts/-permissions.js)
> Same left-nav + right-panel shape as Academy `js/settings.js` (7 Jul 2026, FINANCE-MODEL.md §19) — reused the
> pattern, not the code: Finance Settings has its **own** router/data, never touches `DB.branchSettings`/`stShowSection`/etc.
```javascript
// Shell pattern (fin-settings.js) — copy this shape for any future "own settings page":
navItem(section, icon, label)      // .st-nav-item row, same CSS class as Academy Settings (shared, not duplicated)
finStShowSection(name)             // switch-case router → #fin-st-panel, mirrors stShowSection(name)
// Section registration: simple sections live in fin-settings.js itself; sections with more
// logic get their own file exposing one render fn the router calls:
window.finRenderApproval()         // fin-settings-approval.js
window.finRenderPettyCash() / finRenderBankAccounts()  // fin-settings-accounts.js
window.finRenderPermissions()      // fin-settings-permissions.js
```
**CRUD list pattern** (Categories/Payment Methods/Bank Accounts/Approval Rules) — copied from
`settings-catalog.js`'s `stAddSubject`/`stConfirmAddSubject`/`stRemoveSubject`: `Modal.create()` for the add form,
direct `DB.financeXxx.push()`/`.splice()` for mutation, re-render via `finStShowSection(current)` afterward.

**Petty Cash** is a flat per-branch table (`DB.financePettyCash`, one row per branch) — deliberately **no**
Global/Branch scope-switcher like Academy Settings has, since only 2 of 8 Finance Settings sections are
branch-scoped (Petty Cash, Bank Accounts) and a page-wide scope dropdown would be confusing for the other 6.

---

## 21. Course Schedule Picker ⭐ (js/course-schedule.js → window.CourseSched)

> ใช้ใน Billing ▸ New Invoice — เลือก course แล้วต้องเลือก "คลาส + วันเริ่มเรียน" ทันที
> เพื่อให้ Admin ตอบผู้ปกครองได้สดๆ ว่า เรียนวันไหน · เริ่มเมื่อไหร่ · จบเมื่อไหร่ · ที่นั่งเหลือ

```javascript
CourseSched.resolve(uid, courseId, branch, student)
  → { course, rounds[], round, startDate, endDate, meetings, blocks,
      skipped[], perWeek, isBundle, lessonNo, conflicts[], classIds[] }
  → { empty:true } ถ้าไม่มีคลาสรองรับคอร์สนี้

CourseSched.render(uid, info)   → HTML บล็อกตาราง (.cs-box)
CourseSched.reset()             // เรียกตอนเปิด modal ใหม่
CourseSched.fmtTH(date)         // 'เสาร์ 25 ก.ค. 2569'
CourseSched.nextClassDate(days, from)      // วันเรียนถัดไป ข้ามวันหยุด
CourseSched.projectDates(days, start, n)   // {dates[], skipped[]}
```

**รอบเรียน (round)**
| Course type | 1 รอบ = | เลือก |
|---|---|---|
| single | 1 คลาส (เช่น จ.+พ. 10:00) | คลาสใดคลาสหนึ่ง |
| bundle | ทุกวิชาที่เรียน **วันเดียวกัน** (Sat = Math+Eng+Science) | รอบเดียว — Sat **หรือ** Sun |

- Bundle เรียน **สัปดาห์ละครั้ง** เสมอ → 1 block = `billingBlockSize` ครั้ง = n สัปดาห์
- `DB.courses[].bundleDays = ['Sat','Sun']` = Admin เปิดไว้กี่รอบ (คลาสจริงอยู่ใน DB.classes ที่ courseId ตรงกัน)
- ที่นั่งเต็ม (≥6) → รอบนั้น disable
- วันเริ่ม default = วันเรียนถัดไปที่ไม่ใช่วันหยุด · Admin เลื่อนไปข้างหน้าได้ · ตกวันที่คลาสไม่เรียน = ขยับให้เอง
- Bundle เข้ากลางคัน → `lessonNo` บอกว่าคลาสเรียนถึงครั้งที่เท่าไหร่แล้ว

**ผลลัพธ์ที่ติดไปกับ Invoice**
```javascript
inv.lines[i] = { …, courseId, classIds[], startDate, endDate, meetings, blocks, schedLabel }
inv.chosenSchedule[courseId] = { classIds[], startDate, endDate, meetings }
// billingConfirm() อ่านตรงนี้ → สร้าง enrollment ครบทุกวิชา + เข้า roster คลาส
```

**CSS** (md3.css): `.cs-box` `.cs-box.cs-warn` `.cs-round[.on|.full]` `.cs-subj` `.cs-row` `.cs-lbl` `.cs-date`

**Handlers**: `csPickRound(uid,roundId)` · `csSetStart(uid,date)` · `csSetBlocks(uid,n)` · `csGoCreateClass(courseId)`
— ทุกตัวเรียก `window.niRecalc()` ต่อ (host module ต้อง expose ฟังก์ชันชื่อนี้)

---

## 22. Billing Payment Confirmation ⭐ (js/billing-payment.js)

> State machine: `draft → sent → pending → paid` · `voided` แยกออกได้ทุกสถานะก่อน paid
> **กฎเหล็ก: enrollment เกิดตอน `paid` เท่านั้น** — ห้ามส่งเด็กเข้าคลาสก่อนยืนยันเงินเข้า

| สถานะ | แปลว่า | ปุ่มที่ขึ้นในตาราง |
|---|---|---|
| `draft` | ยังไม่ส่ง | Send · ⋯ Void |
| `sent` | ส่งบิลแล้ว รอสลิป | **แนบสลิป** · ⋯ Parent Form / Void |
| `pending` | มีสลิปแล้ว รอตรวจ statement | **Confirm Paid** · ⋯ ดูสลิป / สลิปไม่ถูกต้อง / Void |
| `paid` | เห็นเงินใน KBiz แล้ว + เข้าคลาสแล้ว | — (ออกใบเสร็จได้) |
| `voided` | ยกเลิก (ไม่ลบ) | แสดงเลขใบที่มาแทน |

*legacy alias: `submitted`→pending · `confirmed`→paid (ใบเก่ายังอ่านได้)*

```javascript
billingUploadSlip(id)   // แนบสลิป → pending   (Cash ไม่ต้องแนบไฟล์)
billingConfirmPaid(id)  // ต้องติ๊ก "ตรวจ statement ใน KBiz แล้ว" ปุ่มถึง enable
billingRejectSlip(id)   // ตีกลับ → sent (เหตุผลบังคับ, เก็บ rejectedSlips[])
billingVoid(id)         // เหตุผลบังคับ + option สร้างใบใหม่ทดแทน
billingViewSlip(id)
```

**field ที่เพิ่มบน invoice**
```javascript
inv.payslip     = { dataUrl, name, transferDate, amount, method, uploadedBy, uploadedAt }
inv.paidAt / inv.paidRef / inv.verifiedBy      // จาก Confirm Paid
inv.amountDiff                                  // จ่ายเกิน(+)/ขาด(−) ถ้ายอดสลิป ≠ บิล
inv.rejectedSlips[]                             // สลิปที่ตีกลับ + เหตุผล
inv.voidReason / voidedBy / voidedAt / replacedBy / replaces
inv.history[]   = [{ action, detail, by, at }]  // audit trail
inv._enrolled / inv._stockDone                  // กันทำซ้ำ
```

**Billing API (billing.js expose ให้โมดูลนี้)**
```javascript
Billing.src(id)          // invoice ตัวจริงใน DB.invoices (ไม่ใช่ ledger ที่เป็นสำเนา)
Billing.enroll(inv)      // สร้าง enrollment + เข้า roster → คืนจำนวนที่สร้าง
Billing.consumeStock(inv)
Billing.refresh()
```
> ⚠️ อย่าแก้ status บน `ledger` — เป็นสำเนา แก้แล้วหายตอน refresh ต้องแก้ที่ `DB.invoices`

**CSS** (md3.css): `.bp-drop` `.bp-thumb` `.bp-file` `.bp-kv` `.bp-check` `.bp-inline`

---

## 23. Bank Statement Matching ⭐ (js/data-bank.js → window.Bank)

> ผูก "เงินเข้าบัญชีจริง" กับ "บิล" เพื่อตรวจย้อนได้ — เดิมพิมพ์เลข ref มือ (หรือไม่พิมพ์เลย)
> ใช้ใน Billing ▸ Confirm Paid · prototype = mock feed (ยังไม่มี API KBiz จริง)

```javascript
DB.bankStatements[] = { id, ref, date, time, amount, branch, account,
                        channel, payerName, payerAcct, memo, matchedInvoiceId }

Bank.candidatesFor(inv, {q, limit})  // เรียงตามคะแนน + แนบ _score/_exact/_diff/_dayDiff
Bank.match(stmtId, invId)            // ผูก 2 ทาง · null ถ้าถูกจับคู่กับบิลอื่นแล้ว
Bank.unmatch(invId) · Bank.forInvoice(invId) · Bank.byRef(ref) · Bank.unmatched()
Bank.sync()                          // mock ดึงรายการใหม่จาก KBiz → คืนจำนวนที่เพิ่ม
Bank.acctFor(branch)                 // บัญชีรับเงินของสาขา
```

**สูตรคะแนนจับคู่** (`candidatesFor`)

| เงื่อนไข | คะแนน |
|---|---|
| ยอดตรงเป๊ะกับสลิป | +100 |
| ยอดต่างไม่เกิน 5% | +40 |
| สาขาเดียวกัน | +20 |
| ห่างจากวันโอน n วัน | +max(0, 20 − n×4) |

**กติกา**
- **1 statement = 1 invoice** — จับคู่แล้วหายจาก candidates ของบิลอื่น (กันนับเงินซ้ำ)
- ยืนยัน Paid ไม่ได้ถ้ายังไม่จับคู่ — ยกเว้น **เงินสด** หรือติ๊ก **"กรอกเลขเอง"**
- กรอกเอง → `inv.statementManual = true` (ยังไม่ตรวจกับ feed · ตรวจซ้ำภายหลังได้)
- ผลลัพธ์บน invoice: `statementId` · `paidRef` · `paidAt` · `verifiedBy` → โชว์บนใบเป็นบล็อก "หลักฐานเงินเข้า"

**CSS** (md3.css): `.bp-stmt-list` `.bp-stmt[.on]`
> day chips: `.cs-days` `.cs-daychip[.on|.ghost]` · จาก→ไป: `.cs-move` `.cs-move-lbl` `.cs-move-arrow`

---

## 24. Weekly Frequency ⭐ (course-schedule.js + js/enroll-frequency.js)

> **คลาสเปิดหลายวัน ≠ นักเรียนมาทุกวัน** — ความถี่เป็นของ *enrollment* ไม่ใช่ของ class
> Single course: default สัปดาห์ละ 1 ครั้ง · เลือกได้สูงสุด **2 วัน/สัปดาห์** · Bundle: ล็อกสัปดาห์ละครั้ง

```javascript
enrollment.days    = ['Tue','Wed']              // วันประจำที่มาเรียนจริง
enrollment.perWeek = 2
enrollment.boost   = { days:['Sat'], from:'2026-08-17', to:'2026-09-30' }   // เพิ่มรอบชั่วคราว
// ใบเก่าไม่มี days = มาทุกวันที่คลาสเปิด (backward compatible)
```

**ตอนออกบิล** (CourseSched) — day chips ใน New Invoice · เปลี่ยนความถี่ → วันเริ่ม/วันจบคำนวณใหม่ทันที
`csToggleDay(uid, day)` · `MAX_PER_WEEK = 2` · เหลือวันเดียวปิดไม่ได้

**หลังสมัครแล้ว** (EnrollFreq) — `openFreqModal(enrId)` **3 โหมด แยกตามเจตนา**:

| โหมด | UI | ผล |
|---|---|---|
| **ย้ายวัน** | จาก [chip] → ไป [chips] | `enr.days` เปลี่ยนวัน · ความถี่เท่าเดิม |
| **เพิ่มรอบถาวร** | เรียนอยู่ [chips] + เพิ่ม [chips] | `enr.days` เพิ่มวัน (สูงสุด 2) |
| **เพิ่มรอบชั่วคราว (ก่อนสอบ)** | เหมือนบน + ช่วงวันที่ | `enr.boost` · พ้นช่วงกลับวันเดิมอัตโนมัติ |

ทุก chip โชว์ **วัน + เวลา** (`.cs-daychip`) · layout จาก→ไป ใช้ `.cs-move` (grid 3 คอลัมน์ + ลูกศรกลาง)
`freqMode(m)` · `freqMoveFrom(d)` · `freqMoveTo(d)` · `freqToggleBoost(d)` · `freqDate(k,v)` · `freqApply(enrId)`

`EnrollFreq.daysOf(enr)` · `EnrollFreq.projectEnd(enr, days, from)` → `{left, endDate, skipped}`

**SessionGen** — `attendsOn(enr, dayName, dateStr)` ตัดสินว่าชื่อนักเรียนขึ้นใน session วันนั้นไหม
(boost ชนะ days · ไม่มี days = ขึ้นทุกวัน) · `eligibleStudents(cls, dayName, dateStr)`

> ⚠️ กฎเงิน (รอ Nock ยืนยัน): เรียนถี่ขึ้น = **ใช้ชั่วโมงในแพ็กเกจเร็วขึ้น ไม่คิดเงินเพิ่ม** → คอร์สจบเร็วขึ้น

---

## Quick Cheatsheet

```
New page?         → page-header + card + table-wrap + table
New modal?        → Modal.create(id, title, body, footer, size)
Tabbed modal?     → size='modal-tabbed', body has .tabs + panels
Status?           → badge badge-[green|yellow|red|blue|purple|gray]
Package/course?   → pill
Alert?            → alert-item + alert-bar [danger|warning|info]
KPI number?       → kpi-card + kpi-label + kpi-value + kpi-change
Chart bars?       → report-chart + bar [green|yellow|red]
Filter row?       → table-controls + tc-search + tc-select
Filter pills?     → filter-chip [active]
Avatar initial?   → .avatar (adjust size via inline style)
Inline action?    → chat-btn (22×22 emoji button)
Form field?       → settings-group + settings-label + settings-input
```
