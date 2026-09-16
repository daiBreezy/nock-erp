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
<nav id="sidebar">...</nav>
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
