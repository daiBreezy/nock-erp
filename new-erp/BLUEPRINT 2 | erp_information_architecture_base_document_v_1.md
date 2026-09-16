# ERP Information Architecture (IA)

## System Overview

This ERP system is designed specifically for education operations with a human-first operational philosophy.

Core Principles:

- Flexible Operations
- Strict Logging
- Human-first Workflow
- AI-assisted Operations
- Shared Operational Visibility
- Event-driven Architecture
- Timeline-based Operational Tracking

---

# 1. System Modules

```plaintext
Dashboard
CRM
Inbox
Calendar
Students
Families
Staff
Courses
Classes
Sessions
Attendance
Summaries
Billing
Notifications
Tasks
Reports
Search
Settings
Logs & Timeline
```

---

# 2. Module Breakdown

## Dashboard

```plaintext
Dashboard
├── Role-based Widgets
├── Notifications
├── Tasks
├── Renewal Pending
├── Unread Inbox
├── Today's Classes
├── Operational Alerts
└── Quick Actions
```

---

## CRM

```plaintext
CRM
├── Leads
│   ├── New Lead
│   ├── Contacting
│   ├── Interested (Test)
│   ├── Interested (Trial)
│   └── Archived
│
├── Customers
│   ├── Active
│   ├── Renewal Pending
│   ├── Inactive
│   └── Archived
│
├── Notes
├── Tasks
├── Timeline
└── Search & Filters
```

---

## Inbox

```plaintext
Inbox
├── Shared Inbox
├── Assignment
├── Unread
├── Archived
├── Internal Notes
├── Conversation Timeline
├── Parent Communication
└── Summary Messages
```

---

## Calendar

```plaintext
Calendar
├── Daily View
├── Weekly View
├── Monthly View
├── Teacher View
├── Student View
├── Class View
├── Session View
├── Leave
├── Transfer
├── Reschedule
└── Room Capacity
```

---

## Students

```plaintext
Students
├── Student Profile
├── Enrollment History
├── Attendance
├── Learning Summaries
├── Timeline
├── Notes
├── Billing History
├── Branch Assignment
└── Search
```

---

## Families

```plaintext
Families
├── Parent Contacts
├── Primary Contact
├── Primary LINE
├── Preferred Language
├── Students
├── Inbox
├── Billing
├── Timeline
└── Notes
```

---

## Staff

```plaintext
Staff
├── Staff Profile
├── Roles
├── Primary Branch
├── Additional Branches
├── Schedule
├── Timeline
├── Activity Logs
└── Permissions
```

---

## Courses

```plaintext
Courses
├── Subject
├── Subject Type
├── Package
├── Hours
├── Classes
├── Leave Quota
└── Enrollment Rules
```

---

## Classes

```plaintext
Classes
├── Recurring Schedule
├── Teacher
├── Students
├── Capacity
├── Calendar
├── Transfers
├── Reschedules
└── Sessions
```

---

## Sessions

```plaintext
Sessions
├── Session Status
├── Check-In
├── Check-Out
├── Attendance
├── Session Timeline
├── Teacher Remarks
├── Parent Summaries
├── Logs
└── Consumption Tracking
```

---

## Attendance

```plaintext
Attendance
├── Present
├── Leave
├── Absent
├── Transfer
├── Reschedule
├── Consumption Rules
├── Leave Quota
└── Attendance Logs
```

---

## Summaries

```plaintext
Summaries
├── Session Summary
├── Monthly Summary
├── AI Assist
├── Translation
├── Delivery Status
├── Summary Logs
└── Parent Communication
```

---

## Billing

```plaintext
Billing
├── Payments
├── Payslips
├── Invoice
├── Invoice Status
├── Payment Verification
├── Payment Methods
├── Billing Timeline
└── Renewal Tracking
```

---

## Notifications

```plaintext
Notifications
├── In-App
├── Ex-App
├── Unread
├── Task Alerts
├── Renewal Alerts
├── Summary Reminders
└── Operational Notifications
```

---

## Tasks

```plaintext
Tasks
├── Manual Tasks
├── System Tasks
├── Assignment
├── Due Date
├── Completion Status
├── Timeline
└── Task Logs
```

---

## Reports

```plaintext
Reports
├── Revenue
├── Renewal Rate
├── Conversion Rate
├── Attendance
├── Teacher Activity
├── Room Usage
├── Student Retention
└── Operational Reports
```

---

## Search

```plaintext
Search
├── Global Search
├── Boolean Search
├── Smart Search
├── Filters
├── Timeline Search
└── Entity Search
```

---

## Settings

```plaintext
Settings
├── Branch Settings
├── Schedule Settings
├── Payment Methods
├── Roles & Permissions
├── Notification Settings
├── Summary Templates
└── System Configuration
```

---

## Logs & Timeline

```plaintext
Logs & Timeline
├── Entity Timeline
├── Session Timeline
├── Operational Log
├── Event History
├── Audit Logs
├── Filters
└── Search
```

---

# 3. Entity Relationships

```plaintext
Organization
├── Brands
│   └── Branches
│
├── Families
│   └── Students
│       ├── Enrollments
│       │   ├── Courses
│       │   ├── Classes
│       │   └── Sessions
│       │
│       ├── Attendance
│       ├── Summaries
│       ├── Billing
│       └── Timeline
│
├── Staff
│   ├── Roles
│   ├── Branch Assignments
│   ├── Sessions
│   └── Activity Logs
│
├── Inbox
├── Tasks
├── Notifications
└── Reports
```

---

# 4. Role Visibility & Permissions

## Director (CEO)

```plaintext
Access Scope
├── All Brands
├── All Branches
├── All Staff
├── All Students
└── Full Reports
```

---

## Area Manager

```plaintext
Access Scope
├── Multiple Assigned Branches
└── Assigned Staff & Students
```

---

## Manager

```plaintext
Access Scope
├── Single Branch
└── All Branch Data
```

---

## Admin

```plaintext
Access Scope
├── Single Branch
└── Branch Operations
```

---

## Teacher

```plaintext
Access Scope
├── Assigned Branches
└── All Students Within Assigned Branches
```

---

# 5. Operational Flows

## Lead Flow

```plaintext
New Lead
→ Contacting
→ Interested (Test)
→ Interested (Trial)
→ Enrollment
→ Customer Active
```

---

## Enrollment Flow

```plaintext
Parent Payment
→ Payslip Received
→ AI/Manual Invoice Creation
→ Admin Sends Invoice
→ Customer Active
→ Enrollment Created
→ Schedule Assigned
```

---

## Session Flow

```plaintext
Session Upcoming
→ Start Class
→ Check-In
→ Teaching
→ Check-Out
→ End Class
→ Summary Pending
→ Summary Sent
→ Session Closed
```

---

## Attendance Flow

```plaintext
Present
→ Consume Class

Absent Without Notice
→ Consume Class

Leave Within Quota
→ No Consume

Leave Over Quota
→ Consume Class

Transfer
→ No Consume

Reschedule
→ No Consume
```

---

## Renewal Flow

```plaintext
Remaining Classes ≤ 2
→ Renewal Pending
→ Parent Discussion
→ Payment
→ New Enrollment
```

---

## Summary Flow

```plaintext
Teacher Check-Out
→ Write Summary
→ AI Assist (Optional)
→ Send to Parent
→ Save to:
   - Inbox
   - Student Timeline
   - Session Timeline
```

---

# 6. Scheduling & Validation Engine

## Teacher Conflict

```plaintext
Teacher
cannot teach overlapping sessions
```

---

## Student Conflict

```plaintext
Student
cannot attend overlapping sessions
```

---

## Room Capacity Conflict

```plaintext
Concurrent sessions
cannot exceed branch room capacity
```

---

# 7. Timeline & Logging Architecture

## Entity Timeline

```plaintext
Student Timeline
Family Timeline
Staff Timeline
Conversation Timeline
```

---

## Session Timeline

```plaintext
Class Session History
```

---

## Operational Log Center

```plaintext
System-wide operational monitoring
```

---

# 8. Search Architecture

## Smart Search

```plaintext
Natural language search
```

---

## Boolean Search

```plaintext
AND
OR
NOT
```

---

# 9. Core System Philosophy

```plaintext
Human-first Operations
AI-assisted Workflow
```

---

```plaintext
Flexible Operations
+
Strict Logging
```

---

```plaintext
Entity history never resets
```

---

```plaintext
Single source of operational truth
```

---

```plaintext
Shared operational calendar
```

---

```plaintext
Good AI
requires good operational data
```

---

# 10. UX Flows

## CRM Lead Flow

```plaintext
Sidebar
→ CRM
→ Lead List
→ Open Lead Profile
→ Timeline / Inbox / Notes
→ Create Task
→ Move Status
→ Schedule Trial/Test
→ Enrollment
```

---

## Shared Inbox Flow

```plaintext
Sidebar
→ Inbox
→ Unassigned Conversations
→ Assign Owner
→ Open Conversation
→ Internal Notes
→ Reply to Parent
→ Create Task
→ Archive Conversation
```

---

## Calendar Operational Flow

```plaintext
Sidebar
→ Calendar
→ Weekly View
→ Select Session
→ Open Session Modal
→ Check-In Students
→ Attendance Update
→ Check-Out Students
→ End Class
→ Summary Pending
```

---

## Teacher Session Flow

```plaintext
Dashboard
→ Today's Classes
→ Open Session
→ Start Class
→ Check-In Students
→ Teach
→ Check-Out Students
→ End Class
→ Write Summaries
→ Send to Parents
```

---

## Enrollment Flow

```plaintext
Student/Family Profile
→ Create Enrollment
→ Select Course
→ Select Branch
→ Select Schedule
→ Assign Class
→ Confirm Enrollment
→ Payment Verification
→ Active Enrollment
```

---

## Billing Flow

```plaintext
Inbox/Form/LINE
→ Payslip Received
→ AI Detect Payment
→ Generate Invoice
→ Admin Review
→ Send Invoice
→ Activate Enrollment
```

---

## Renewal Flow

```plaintext
Remaining Classes ≤ 2
→ Renewal Pending Alert
→ Parent Discussion
→ Payment
→ Create New Enrollment
→ Continue Schedule
```

---

## Summary Flow

```plaintext
Open Session
→ Student List
→ Select Student
→ Write Summary
→ AI Assist (Optional)
→ Translate (Optional)
→ Send to Parent
→ Save to Timeline
```

---

# 11. Wireframe Structure

## Global Layout

```plaintext
┌──────────────────────────────────────┐
│ Top Navigation                       │
│ Search | Notifications | Profile     │
├───────────────┬──────────────────────┤
│ Sidebar       │ Main Content         │
│               │                      │
│ Dashboard     │ Dynamic Module Area  │
│ CRM           │                      │
│ Inbox         │                      │
│ Calendar      │                      │
│ Students      │                      │
│ Families      │                      │
│ Staff         │                      │
│ Billing       │                      │
│ Reports       │                      │
│ Settings      │                      │
└───────────────┴──────────────────────┘
```

---

## Dashboard Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Dashboard                            │
├──────────────────────────────────────┤
│ KPI Cards                            │
│ Revenue | Active Students | Renewal  │
├──────────────────────────────────────┤
│ Today's Classes                      │
├──────────────────────────────────────┤
│ Tasks                                │
├──────────────────────────────────────┤
│ Notifications                        │
├──────────────────────────────────────┤
│ Renewal Pending                      │
└──────────────────────────────────────┘
```

---

## CRM Lead List Wireframe

```plaintext
┌──────────────────────────────────────┐
│ CRM                                  │
├──────────────────────────────────────┤
│ Filters | Search | Status Tabs       │
├──────────────────────────────────────┤
│ Lead List                            │
│                                      │
│ Name | Status | Branch | Owner       │
│ Name | Status | Branch | Owner       │
│ Name | Status | Branch | Owner       │
├──────────────────────────────────────┤
│ Timeline Preview                     │
└──────────────────────────────────────┘
```

---

## Student Profile Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Student Profile                      │
├──────────────────────────────────────┤
│ Student Info                         │
│ Family | Branch | Active Courses     │
├──────────────────────────────────────┤
│ Tabs                                 │
│ Timeline | Attendance | Billing      │
│ Summaries | Notes | Enrollments      │
├──────────────────────────────────────┤
│ Timeline Feed                        │
│                                      │
│ - Summary Sent                       │
│ - Attendance Updated                 │
│ - Payment Received                   │
└──────────────────────────────────────┘
```

---

## Shared Inbox Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Inbox                                │
├───────────────┬──────────────────────┤
│ Conversation  │ Chat Thread          │
│ List          │                      │
│               │ Parent Messages      │
│ Assigned      │ Staff Replies        │
│ Unread        │ Internal Notes       │
│ Archived      │ Timeline             │
├───────────────┴──────────────────────┤
│ Reply Box                            │
└──────────────────────────────────────┘
```

---

## Calendar Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Calendar                             │
├──────────────────────────────────────┤
│ View Switcher                        │
│ Day | Week | Month | Teacher         │
├──────────────────────────────────────┤
│ Calendar Grid                        │
│                                      │
│ Sessions                             │
│ Transfers                            │
│ Leaves                               │
│ Reschedules                          │
├──────────────────────────────────────┤
│ Session Detail Modal                 │
└──────────────────────────────────────┘
```

---

## Session Modal Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Session Information                  │
├──────────────────────────────────────┤
│ Subject | Teacher | Time             │
│ Branch | Capacity                    │
├──────────────────────────────────────┤
│ Student List                         │
│                                      │
│ □ Present                            │
│ □ Leave                              │
│ □ Absent                             │
│ □ Transfer                           │
├──────────────────────────────────────┤
│ Start Class                          │
│ Check-In                             │
│ Check-Out                            │
│ End Class                            │
├──────────────────────────────────────┤
│ Session Timeline                     │
└──────────────────────────────────────┘
```

---

## Summary Composer Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Student Summary                      │
├──────────────────────────────────────┤
│ Student Info                         │
├──────────────────────────────────────┤
│ Free Text Summary                    │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ AI Assist                            │
│ Improve | Translate | Shorten        │
├──────────────────────────────────────┤
│ Send to Parent                       │
└──────────────────────────────────────┘
```

---

## Billing Wireframe

```plaintext
┌──────────────────────────────────────┐
│ Billing                              │
├──────────────────────────────────────┤
│ Payments | Invoices | Pending        │
├──────────────────────────────────────┤
│ Invoice Table                        │
│                                      │
│ Student | Amount | Status            │
├──────────────────────────────────────┤
│ Payslip Preview                      │
├──────────────────────────────────────┤
│ Generate Invoice                     │
│ Send Invoice                         │
└──────────────────────────────────────┘
```

---

# 12. UX Principles

```plaintext
Fast Operations
Low Friction
Shared Visibility
Timeline-first UX
Operational Flexibility
Human-centered Workflow
```

---

# 13. UI Philosophy

```plaintext
Operational clarity over visual complexity
```

---

```plaintext
Every important action should be traceable
```

---

```plaintext
Important information should be visible within 1-2 clicks
```

---

```plaintext
Timeline is the operational memory of the system
```

