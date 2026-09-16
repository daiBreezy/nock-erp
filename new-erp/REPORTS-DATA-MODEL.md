# Reports Data Model — Fact + Dimensions
> 14 Jul 2026 · ตอบโจทย์ "วางข้อมูลยังไง / time-series / business line"
> หลักการ: **อย่าเก็บรายงาน · เก็บ event ที่ติดแท็กครบ · รายงาน = group by**

---

## 🔑 หลักการเดียว
```
1 event = 1 แถว · ติดแท็กมิติครบทุกอัน · รายงานคำนวณสด
→ time-series = group by "วันที่" (ไม่ต้องจัดการพิเศษ)
→ business line = แค่เพิ่ม column · invoice/enrollment รู้สายอยู่แล้ว
```

## มิติ (Dimensions) — แท็กที่ติดบน "ทุก" event
| มิติ | ค่า |
|---|---|
| **date** | วันที่ (→ rollup week/month/quarter/year/YTD) |
| **businessLine** | Liclass / NAS / NA App |
| **branch** | Sukhumvit / Silom / Bang-Na / Sriracha / Pattaya |
| **subject** | Math / Eng / Science / ... |
| **grade** | ป.1–ม.6 |
| **packageType / tier** | Hour(24/48/72/96) · Week |
| **teacher** | |
| **family / student** | |
| **leadSource** | Walk-in / Referral / ... (เฉพาะ lead) |

## Fact tables — 4 ตาราง (แยกตาม "grain" ของ event)

### 1. RevenueFact — 1 แถว/invoice line ที่จ่ายแล้ว
`date · biz · branch · subject · grade · package · family · student · amount · feeType(course/book/bus/exam)`
→ ป้อน: Total Revenue · Revenue by Branch · Subject Engine · Package Heatmap · Top Families

### 2. SessionFact — 1 แถว/นักเรียน/session
`date · time · biz · branch · subject · grade · teacher · student · attendance(present/absent/leave) · sessionsConsumed`
→ ป้อน: Attendance rate · Demand Heatmap (date×time · subject×grade) · Total Sessions · Teacher load

### 3. EnrollmentFact — 1 แถว/เหตุการณ์ enrollment
`date · biz · branch · subject · student · event(new/renew/pause/churn) · cohortMonth`
→ ป้อน: Net Growth (new/churn) · Churn Split (lost/pause) · Cohort Retention · Total Students

### 4. LeadFact — 1 แถว/การเปลี่ยน stage ของ lead
`date · biz · branch · source · stage(contact→test→trial→billing→customer)`
→ ป้อน: Conversion Rate · CRM funnel · Acquisition velocity

### 5. InventoryFact — 1 แถว/stock movement (🆕)
`date · biz · branch · item · subject · grade · movement(sale-inv/sale-standalone/giveaway/restock) · qty · value`
→ ป้อน: Book sales · Stock level · Out-of-stock · Supplier spend

### 6. ExpenseFact — 1 แถว/รายจ่ายที่บันทึกแล้ว (🆕)
`date · biz · branch · category · vendor · amount · whtAmount · source(central/petty) · paymentType`
→ ป้อน: Expense by category · Petty cash · WHT summary · **P&L ต่อสาย**

## 🎯 P&L ต่อ Business Line (คำถามที่ค้างมาตั้งแต่ต้น)
```
RevenueFact (ต่อ businessLine) − ExpenseFact (ต่อ businessLine) = กำไร/ขาดทุนต่อสาย
```
⇒ ตอบได้ในที่สุดว่า **Liclass / NAS สายไหนทำกำไร** — เพราะทั้ง 2 fact ติดแท็ก businessLine

## หลักประกัน "เห็นทุกอย่าง"
> **ทุกโมดูล เมื่อเกิดเหตุการณ์ → เขียน fact 1 แถว** (append-only event log)
> รายงานไม่เคย hardcode · รายงานใหม่ = query ใหม่ (ไม่แก้ data model)
> จุดบอด = event ที่ไม่ถูกเก็บ → วินัยเดียวที่ต้องมี: ทุก state change ต้องบันทึก

## ทุกรายงานในภาพ = group by จาก 4 ตารางนี้
| รายงาน | fact | group by |
|---|---|---|
| Revenue by Branch | RevenueFact | branch, sum(amount) |
| Subject Engine | RevenueFact | subject |
| Package Heatmap | RevenueFact | package × grade |
| Demand Heatmap | SessionFact | date/time × subject/grade |
| Cohort Retention | EnrollmentFact | cohortMonth × monthsElapsed |
| Churn Split | EnrollmentFact | branch × event |
| Conversion Rate | LeadFact | stage funnel |

## ทำไมวิธีนี้แก้ปัญหาคุณ
- **"วางข้อมูลยังไง"** → เก็บ 4 fact + dimension เท่านั้น ไม่ต้องออกแบบรายงานทีละอัน
- **"time-series"** → date เป็น dimension · ทุก period view = filter/group date เดียวกัน
- **"ขาด business line"** → เพิ่ม column `businessLine` ในทุก fact (ข้อมูลมีอยู่แล้ว)
- prototype `data-reports.js` (window.RD) ทำแนวนี้อยู่แล้ว — แค่เพิ่ม businessLine + แตกเป็น 4 grain

## ❓ ต้องยืนยันกับ Nock
- 4 fact ครบไหม? มีรายงานที่อยากได้แต่ไม่ตรง 4 อันนี้ไหม
- มิติครบไหม? (เช่น อยากซอยตาม "ครู" ในรายงานรายได้ด้วยไหม)
