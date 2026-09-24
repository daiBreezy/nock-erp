# Staging Audit — NockERP (2026-09-23)

> ตรวจ `https://erp-staging.nockacademy.com` ทั้งแบบอ่านอย่างเดียว และแบบสร้างข้อมูลทดสอบจริง (ได้รับอนุญาตจากเจ้าของ)
> ผู้ทดสอบ: Claude (ล็อกอินเป็น Director — NockAcademy LMS)
> จุดประสงค์: (1) รู้ว่า Dev build อะไรไปแล้ว เพื่อ build prototype ใหม่ให้ตรง (2) หาจุดด้อยของระบบ

---

## 0. ข้อมูลทดสอบที่สร้างไว้บน Staging (ต้องลบ/ปิดทีหลัง)

ทุกอย่างอยู่ในสาขาแยก **TEST-Branch** (ไม่แตะ Thong lo ของ Dev):

| ประเภท | ชื่อ | สถานะตอนจบ |
|---|---|---|
| Branch | TEST-Branch (เปลี่ยน school type Nockacademy → Liclass ระหว่างเทส) | Active |
| Packages | Maths ป.5/ป.6 ราคา Hour + Month | บันทึกแล้ว |
| General Fees | Bus: TEST-Standard ฿150 · Entry: TEST-Entry ฿500 | บันทึกแล้ว |
| Promotion | TEST-Promo −10% (12 hrs) | Active |
| Holiday | TEST-Holiday 13 ต.ค. 2026 | Active |
| Staff | TEST-Teacher (no-login, test-teacher@example.com) | **ถูก delete (deactivate) แล้ว** |
| Course | TEST-Course Maths P5 ฿4,500/เดือน | Active |
| Class | Maths วันอังคาร 10:00–11:00 (7 sessions, ลบ 17 พ.ย. ไป 1) | Active |
| Family | "Family Family" (TEST-Parent) | Active |
| Students | TEST-StudentA (ป.5), TEST-StudentB (ป.1) | ในคลาส |
| Invoice | 260923020020001 (Void แล้ว) · 260923010020002 (ค้าง Generating PDF) · 260923010020003 (เจ้าของสร้างเอง, ค้าง Generating PDF) | — |
| Attendance / Summary | 29 ก.ย. StudentA Present + summary Approved · 6 ต.ค. กด Leave | — |

**ไม่ได้แตะ:** ข้อมูลของ Dev ใน Thong lo, ปุ่ม Send to accountant, การส่ง LINE จริง

---

## 1. ภาพรวมระบบที่ Dev build แล้ว

- **Stack:** Next.js (App Router + RSC, Turbopack) + React + Tailwind · Auth = **Clerk (ใช้ development keys บน staging)** · Font Inter + Noto Sans Thai · Icon Material Symbols Rounded
- **เมนูที่ใช้งานได้:** Calendar, Students, Families, Staff, Courses, Classes, Sessions, Attendance, Summaries, Billing, Settings, Notifications
- **ยังปิด (Coming soon):** Dashboard (มีแค่โครงเปล่า), CRM, Inbox, Tasks, Reports, Logs & Timeline → เปิด URL ตรงได้ 404
- **ไม่มีเลย:** ระบบ Finance/Expense, Payroll, Bus Route, Inventory, Period Close (ที่ prototype เรามีอยู่)

### Flow หลักที่ออกแบบไว้
1. **Order-to-cash:** Create Invoice (เลือกลูกค้า → คอร์ส → คลาส/วันเริ่ม → งวด → ค่ารถ/หนังสือ/Advance → Discount) → Generate PDF → **Approve โดยคนอื่นที่ไม่ใช่คนสร้าง** → Send to Parent (LINE) → Upload pay slip + bank reconciliation → **Entitlement → Claim เข้าคลาส** → Create Receipt → Send receipt → Send to accountant (email batch)
2. **สถานะ Invoice 3 จุด:** Invoice → Payment → Receipt (มี legend อธิบายครบใน Billing "?")
3. **ราคา:** มาจาก Branch → Packages (Hour 12/24/48/72/96 hrs · Week 4w/8w · Month) × วิชา × เกรด → Course ดึงราคาอัตโนมัติ, แก้ราคาต้องใส่ "Reason for price change"
4. **Multi-brand:** Nockacademy / Liclass — memo, holiday, บัญชีธนาคาร, เลข invoice ผูกกับ brand
5. **Branch settings 11 แท็บ:** Info, Bank Account, LINE Integration (OA ต่อสาขา), Scheduling (เวลาเปิด + special period), Subjects, Grades (ป.1–ม.6 + K1–K3), Packages, General Fees, Promotions, Staff, Holidays
6. **Staff:** หลาย role ต่อสาขา (Teacher/Admin/Manager/Area Manager/Director) + วันทำงาน + วิชา · มี "no-login" สำหรับครูพาร์ทไทม์ · ลบ = deactivate + ต้องแก้โจทย์เลขยืนยัน
7. **Class:** Class for (Learning/Test/Interview/Other) × Group/Single · Learning = recurring หลายวัน, ครูต่างกันต่อแถว, gen sessions ล่วงหน้า 8 สัปดาห์ (ข้าม holiday) · เตือนครูชน/ห้องเต็ม/สาขาปิด · จำกัด 6 คน/คลาส
8. **Session:** Present / Absent / Leave / Reschedule · แก้เฉพาะครั้ง (ไม่กระทบ class) · Availability timeline · ลบ session ที่มีนักเรียน → Notification
9. **Summary:** ครูเขียน → Submit → Approve / Request changes → Send to Parent
10. **Family:** หลายผู้ปกครอง, Line ID บังคับ, Acquisition source, ผูกนักเรียน · Student link LINE ด้วย link code

### บริบทจากเจ้าของ: ทำไมต้องมี LINE Link Code
ยังไม่มี **Inbox** (ช่องแชทกับผู้ปกครองผ่าน LINE OA) → ระบบจึงผูกผู้ปกครองด้วย **Link Code** แทน:
1. แต่ละ Branch ตั้งค่า LINE OA ของตัวเองใน Settings → Branch → **LINE Integration** (Channel ID, Basic ID, Add-friend URL, QR, Channel access token, Channel secret, Webhook URL + Verify)
2. แอดมินเปิดโปรไฟล์นักเรียน → แท็บ **LINE** → Generate link code → ส่งลิงก์ให้ผู้ปกครอง (เปิด LINE พร้อมโค้ดกรอกไว้แล้ว)
3. ผู้ปกครองกดส่งโค้ดกลับใน OA → webhook จับคู่ → นักเรียน/ผู้ปกครองถูกผูกกับ LINE userId
4. โค้ดไม่ตรง → เข้า Notifications ("LINE link code that didn't match any student")
5. เมื่อผูกแล้ว ระบบ push ได้: Invoice, Receipt, Lesson Summary (ถ้ายังไม่ผูก → สถานะ "No LINE linked" และข้ามการส่ง)

### บริบทจากเจ้าของ: Invoice ต้องมีคนที่ 2 อนุมัติ (Maker–Checker)
คนสร้าง Invoice **อนุมัติใบของตัวเองไม่ได้** ต้องให้บุคคลอื่นกด Approve PDF ก่อนจึงจะส่งให้ผู้ปกครองได้
(ตรงกับที่ Staging เขียนไว้: "A different person than the creator must approve this PDF before it can be sent")

---

## 2. จุดด้อย / บั๊กที่พบ (เรียงตามความรุนแรง)

### 🔴 Critical — ใช้งานจริงไม่ได้ / เงิน-ข้อมูลผิด

| # | ปัญหา | วิธีทำซ้ำ |
|---|---|---|
| C1 | **Generate PDF ค้าง "Generating…" ตลอดเฉพาะ TEST-Branch** (รอ >1 ชม. ทุกใบ) ไม่มี timeout / retry → flow การเงินเดินต่อไม่ได้ · **Thong lo gen ได้ปกติ** (ใบ 260923010010008 ที่เจ้าของสร้างวันนี้ผ่าน) → ปัญหาผูกกับสาขาใหม่ · ตัดสาเหตุแล้ว: brand (Nockacademy→Liclass ก็ยังค้าง), เวลาเปิดสาขา (เปิด จ–ศ แล้วก็ยังค้าง) · ยังสงสัย: สาขาใหม่ขาด config บางอย่างที่ PDF worker ต้องใช้ / job queue ค้าง → **Dev กำลังตรวจ (อาจเกี่ยวกับงานแก้ Database ที่ทำอยู่ช่วงเดียวกัน)** · ใบ StudentA ที่ไม่มีค่ารถ กด Save & Generate แล้ว server ตอบ 500 แบบเงียบ (ไม่ถูกสร้าง) | TEST-Branch → New Invoice → Save & Generate PDF |
| C2 | **ช่วงเรียนของคอร์สคำนวณผิด:** ซื้อ 2 เดือน แต่ระบบได้ "29 Sept → 29 Sept · 0 hrs" → ค่ารถคิดแค่ 1 วัน (฿300 แทน ~฿2,100), promotion แบบชั่วโมงใช้ไม่ได้ ("currently 0 hrs") | Create Invoice → คอร์สรายเดือน, Periods = 2 → ดูบรรทัด Start/วันจบ · invoice ของ Dev เองก็เป็น "1 Sept → 7 Sept · 0 hrs" |
| C3 | **ยอด Invoice ไม่ตรงกันระหว่างหน้าจอ:** invoice 260922010010007 — PDF มี Equipment Fee ฿1,000 + holiday closure −฿700 (รวม ฿5,300) แต่ drawer ไม่แสดง 2 บรรทัดนี้ และหน้า Edit บอก Total ฿5,000 → ถ้ากด Save อาจทับยอด | Billing → เปิด 260922010010007 → เทียบ Detail / Edit / PDF |
| C4 | **เช็คชื่อ session ในอนาคตได้** และสถานะเพี้ยน: เช็ค Present วันที่ 29 ก.ย. (ยังไม่ถึง) → session กลายเป็น "Ended/Completed" · กด Leave วันที่ 6 ต.ค. → session กลายเป็น **"Live — Class started at 10:54"** · หน้า Sessions โชว์ Live now = 1 แต่ Today = 0 | Calendar → List → เปิด session อนาคต → Present / Leave |
| C5 | **Leave ไม่ถูกบันทึกในแถว แต่ถูกนับในสรุปผิดเดือน:** Attendance (Sep 2026) นับ Leave = 1 ทั้งที่การลาเป็นของ 6 ต.ค. และไม่มีแถวแสดง | หลัง C4 → Attendance → Month |
| C6 | **สถานะนักเรียนขัดกัน:** นักเรียนลงเรียน 4 คลาสแต่เป็น Inactive, Classes Left 0, Enrolled "—", list บอก "0 active students" | Students → Mritunjay |
| C7 | **เพิ่มนักเรียนเข้าคลาสพร้อมกันได้คนละรูปแบบ:** StudentA = subscription "Renews 23 Oct", StudentB = "0/7" sessions → StudentB เช็คชื่อไม่ได้เลย ("No sessions remaining") และไม่มี notification "running low" | Class → Add Student → เลือก 2 คน (ต่างเกรด) |

### 🟠 High — validation / business rule หลวม

| # | ปัญหา |
|---|---|
| H1 | **ไม่เช็คเกรด:** นักเรียน ป.1 ซื้อคอร์ส ป.5 และเข้าคลาส ป.5 ได้ ไม่มีคำเตือน · คลาสกลายเป็น "ป.1, ป.5" |
| H2 | **สร้างคลาส/เซสชันในวันที่สาขาปิดได้** (แค่ขึ้น info สีเหลือง ไม่บล็อก) · เวลาในฟอร์มล็อก 09–20 ไม่อิงเวลาเปิดสาขา |
| H3 | **Error เงียบ:** สร้างคลาสที่ครูชนเวลา → server ตอบ 400 แต่ UI ไม่แสดงอะไร · Void ไม่ใส่เหตุผล → กดแล้วเงียบ (ช่องไม่ได้ติด * required) |
| H4 | **Periods purchased รับค่าติดลบ** → หน้าจอโชว์ Total −฿13,500 (ปุ่ม Save ถูกล็อกไว้ แต่ tooltip บอกเหตุผลผิด) |
| H5 | **ค่ารถถูกใส่อัตโนมัติทุก invoice** (Pickup + Drop off ติ๊กไว้ให้) แม้นักเรียนไม่ได้ใช้รถ → เสี่ยงเก็บเงินเกิน |
| H6 | **Summary อนุมัติตัวเองได้** (คนเขียน = คนกด Approve) ขณะที่ Invoice ห้าม · ปุ่ม Send to Parent โผล่ก่อน Approve |
| H7 | **ข้อมูลฟอร์ม Family ไม่ validate:** เบอร์ "abc" (สร้างลิงก์ tel:abc), รหัสไปรษณีย์ "abcde", วันเกิดปี 2030 → บันทึกผ่านหมด · ชื่อ family ได้ "Family Family" (ซ้ำนามสกุล) |
| H8 | **Staff no-login ยังบังคับ Email** (ครูพาร์ทไทม์อาจไม่มี) |
| H9 | **ลบครูที่ยังสอนคลาส Active ได้โดยไม่เตือน** → หน้า Classes แสดง **UUID ดิบ** แทนชื่อครู, ตัวนับ Teachers ยังนับ Active |
| H10 | **Director ลบตัวเองได้** (ปุ่ม Delete NockAcademy LMS) → เสี่ยงล็อกตัวเองออก (ไม่ได้ทดลองกด) |
| H11 | **Branch "Nockacademy" แต่บัญชีธนาคารชื่อ "Liclass Education Co., Ltd."** (บัญชีผูกอัตโนมัติ แก้ไม่ได้ในหน้าสาขา) |
| H12 | ลบ session ที่มีนักเรียน → dialog ยืนยันไม่บอกว่ามีนักเรียนกี่คน (แต่มี notification ตามหลัง ✅) |

### 🟡 Medium — เสถียรภาพ / performance

| # | ปัญหา |
|---|---|
| M1 | **ช้ามาก:** TTFB 2–3 วิ, ข้อมูลขึ้นจอ 8–9 วิต่อหน้า (มีข้อมูลแค่หลักหน่วย) · บันทึก settings ~10 วิ · สร้างสาขา ~20 วิ · **ทุกครั้งที่เปลี่ยนหน้า แอป prefetch ทั้ง 12 เมนู (RSC) ซ้ำ** — session เดียวมี >2,700 request (ส่วนใหญ่ ERR_ABORTED) → น่าจะเป็นต้นเหตุ server หนัก |
| M2 | **URL id ผิดรูปแบบ → server crash** ("A server error occurred") แทน 404 (`/settings/branches/abc`) · หน้า 404 เป็น default Next.js ไม่มี sidebar |
| M3 | **Switch branch แล้วหน้าเดิมไม่อัปเดต** ต้อง reload เอง |
| M4 | List ไม่ refresh หลังสร้างข้อมูล (เช่น Invoice ใหม่ไม่ขึ้นจนกว่าจะ reload) · ปุ่ม Save บางจุดยัง disabled ช่วงแรก กดแล้วไม่ทำงาน |
| M5 | Filter/dropdown โหลดช้ากว่าฟอร์ม → ช่วงแรกเลือกวิชาที่สาขาไม่สอนได้ (race) |
| M6 | Attendance filter "All Subjects" เป็น **mock hard-code** (Eng, Math, Science, Thai, Eng (Active)…) ไม่ใช่วิชาจริง · คอลัมน์ Family แสดง "—" ทั้งที่ผูกแล้ว |
| M7 | Grade dropdown ตอนสร้างนักเรียนไม่กรองตามเกรดที่สาขาเปิด และไม่มี K1–K3 |
| M8 | Invoice numbering: เลขรันต่อข้าม brand (…02…0001 → …01…0002) หลังเปลี่ยน school type |
| M9 | Clerk ใช้ development keys บน staging (ต้องเปลี่ยนก่อน production) |

### 🔵 Low — UX / ยังไม่เสร็จ

- Smart search, ปุ่ม Message/Call ในโปรไฟล์นักเรียน **กดแล้วไม่มีอะไรเกิดขึ้น**
- Dashboard การ์ดสีดำโชว์ "—" · CRM/Inbox มี badge ตัวเลขหลอก (5, 3)
- Staff Schedule / Log = "Coming soon" · Invoice Memos หน้าเปล่า · Notification Preferences "not ready" · Promotion บน invoice "coming soon" (แต่ Check Promotion ใช้ได้แล้ว)
- **Tooltip หลุด dev note:** "(D3)", "Delete draft — lands with Step 7 (Save Draft)"
- Error message ดิบจาก Zod: "Too small: expected number to be >=1"
- Add fee type ช่องว่าง → กดแล้วเงียบ · Enter ไม่ submit
- "Add Student to Family" บอก "Every student is already linked" ตอนที่สาขายังไม่มีนักเรียนเลย
- ภาษาปน ไทย/อังกฤษ · emoji เป็น icon ในแท็บนักเรียน · ไม่มี dark mode
- **Mobile ใช้ไม่ได้** (sidebar กิน 60% ไม่มี hamburger) · ตาราง Billing ล้นที่จอ ~800px

---

## 2.5 เทส Billing ครบวง (หลัง Dev แก้ Database) — invoice 260923010020005

| ขั้น | ผล |
|---|---|
| Generate PDF | ✅ ใช้ได้แล้ว (ใบใหม่) · ใบเก่าที่ค้างยังค้าง แต่ Dev เพิ่มปุ่ม **Retry PDF** แล้ว |
| ราคา | ✅ ฿1,350 = ฿4,500 × 30% (pro-rate รายเดือน: เหลือ 1 สัปดาห์) + ค่ารถ ฿300 |
| Duplicate subscription | ✅ บังคับใส่ remark ถ้านักเรียนมี subscription อยู่แล้ว |
| Maker–Checker | ✅ คนสร้างไม่เห็นปุ่ม Approve · **Dai Breezy (Teacher) Approve ได้** → role ใดก็ได้ |
| Send to Parent | ✅ ไม่มี LINE → toast "nothing was delivered" + ปุ่ม Send again · ⚠️ ขั้นนี้ติ๊ก ✓ ทั้งที่ไม่ถึงผู้ปกครอง · ⚠️ ปุ่ม Send ในหน้า list ไม่ทำอะไรถ้ายังไม่กรอก Note to parent (ต้องทดสอบซ้ำว่ามี toast หรือไม่) |
| แก้ไขหลังส่ง | ✅ แก้ได้เฉพาะ Draft · ✅ Void ไม่ได้ถ้ามีการจ่ายแล้ว · ⚠️ **ไม่มี Refund / Credit note** |
| Log payment | ✅ กันยอดเกิน (toast) · ✅ จ่ายบางส่วน ฿1,000 (โอน+สลิป) + ฿650 (เงินสด) · ⚠️ **คนเดียวกันบันทึกและ Confirm เงินเองได้** (ไม่มี maker–checker ขั้นรับเงิน) |
| Claim | ✅ auto-claim หลังจ่ายครบ (Maths 1 period + Bus) · ⚠️ จ่าย pro-rate เดือน ก.ย. (30%) แต่สิทธิ์ "Renews 23 Oct" → เสี่ยงให้เรียนเกินที่จ่าย (ต้องให้ Dev ยืนยัน) |
| Receipt | ✅ สร้างได้ (มี Split Receipt) · ⚠️ drawer ไม่อัปเดตหลังสร้าง (เสี่ยงกดซ้ำ) · ⚠️ เลขใบเสร็จ 260923010020001 รูปแบบเดียวกับเลข invoice |
| Bank reconciliation | ✅ ใส่ transaction id → "ready to send to accountant" · ⚠️ ref ที่กรอกตอนอัปโหลดสลิปไม่ถูกใช้ให้อัตโนมัติ |
| เลข invoice | ⚠️ กระโดด 0003 → 0005 (0004 หายไปตอนที่ server ตอบ 500) — ใบกำกับภาษีควรต่อเนื่อง |
| ข้อมูลนักเรียน | ⚠️ หน้า Students แสดง "0 left" แม้เป็น subscription ที่จ่ายแล้ว · ยังแสดงครูที่ถูกลบ |

### 2.5.1 Billing retest (2026-09-24 บ่าย, Director, TEST-Branch)

| จุด | ผล |
|---|---|
| C1 PDF ค้าง | ✅ **แก้แล้ว** — ใบค้าง 0003/0002 กด **Retry PDF** ในแถว → ~20 วิ gen สำเร็จ → 'Waiting for approval' · ใบใหม่ 0006 Generate PDF ~30 วิ สำเร็จ · ⚠️ ปุ่ม Retry อยู่ในแถว list (ใน drawer มีแค่ icon ไม่ทำงาน/ไม่มี tooltip) · ไม่มี toast ตอน gen เสร็จ |
| C2 ช่วงเรียน | ✅ **แก้แล้ว** — 2 periods เริ่ม 29 ก.ย. → '29 Sept → 31 Oct' · แยกราคา Sep 30% ฿1,350 + Oct 100% ฿4,500 · ค่ารถคิดตามรอบจริง ×4 (ข้าม holiday 13 ต.ค.) ฿150/ขา · ติ๊กออกรายขาได้ ยอดคำนวณใหม่ถูก · 🔴 บรรทัดสรุปคอร์สเขียน **'5 sessions · 10 hrs'** แต่จริง 4 ครั้ง × 1 ชม. (นับ holiday + ชม.เป็น 2 เท่า) · ⚠️ หน้า Create บอก Oct 'Max 3 sessions' แต่หน้า Edit ใบเดียวกันบอก 'Max 4 sessions' · ⚠️ drawer แสดงคอร์ส '1m' ทั้งที่ซื้อ 2 เดือน · ⚠️ หัวบรรทัดบอก '29 Sept → 27 Oct' แต่ด้านล่าง '→ 31 Oct' |
| C3 ยอดไม่ตรงกัน | ✅ (ใบใหม่ 0006) list = drawer = edit = ฿6,900 · ขาที่ติ๊กออก/remark ถูกบันทึกครบ |
| H4 Periods ติดลบ | 🔴 **ยังไม่แก้** — ใส่ -1 → ราคา ฿-4,500 |
| H5 ค่ารถ auto | 🔴 **ยังไม่แก้** — Bus fee ติ๊ก Pickup + Drop off ทุกรอบให้อัตโนมัติ (฿1,200) |
| H3 Void ไม่ใส่เหตุผล | ✅/⚠️ มี toast 'Enter a reason for voiding this invoice' (ไม่เงียบแล้ว) · ⚠️ ช่อง Reason ไม่มี * และปุ่ม Void ไม่ disabled · ข้อความ '…0006will' ขาดเว้นวรรค |
| Save draft (ใหม่) | ✅ toast 'Invoice saved as draft' + list refresh ทันที (M4 ดีขึ้น) · ⚠️ Draft ได้เลขใบกำกับจริงทันที (260924010020006) → ถ้าลบ/void draft เลขจะขาดช่วง · ⚠️ timeline ติ๊ก 'Invoice Created' ✓ ทั้งที่ยังเป็น draft |
| Filter / cards | ✅ Draft/Pending/Paid/Void กรองถูก · ⚠️ การ์ด **PENDING = 0 ขณะมี 3 ใบรออนุมัติ** (header บอก '3 pending approvals') — ชื่อซ้ำความหมาย · ⚠️ ตารางล้นแนวนอนที่จอ ~1200px (คอลัมน์ Ref # โดนตัด) |
| Select Class ใน invoice | ⚠️ เสนอคลาส one-off (Test: TEST-Exam, TEST-E3 Calendar) ให้เลือกสำหรับคอร์ส 2 เดือน · คลาสของครูที่ถูกลบ (TEST-Teacher) ยังเลือกได้ และ invoice ลิงก์ไปที่ TEST-Teacher · ชื่อครูใน list นี้ = 'Dai Breezy'/'NockAcademy LMS' แต่ Calendar = 'dai Test'/UUID (ข้อมูลครูไม่ตรงกันข้ามหน้า) |
| Drawer | ⚠️ Family แสดง '—' ทั้งที่ list บอก 'Family Family' |

> ⚠️ **แก้ไขข้อสรุปเดิม:** toast ของระบบหายภายใน ~4 วิ — หัวข้อที่เคยสรุปว่า "เงียบ ไม่แจ้งอะไร" (H3: สร้างคลาสครูชน, Void ไม่ใส่เหตุผล) อาจมี toast ที่หายไปก่อนตรวจ → **ต้องเทสซ้ำ**

---

## 2.6 เทสการเชื่อมต่อ Class → Session → Attendance → Summary → Calendar → Student

เทสด้วย session วันนี้ (23 ก.ย. 14:00–15:00, attach class Maths) เวลาเทสจริง 15:50

| จุด | ผล |
|---|---|
| Class → gen sessions | ✅ 8 สัปดาห์ ข้าม holiday · ✅ Calendar แสดงครบทุกมุมมอง |
| Add Session แบบ attach class | ⚠️ **ไม่ดึงนักเรียนของคลาสมาให้** (0 students) ต้อง Add student เอง · session ถูก mark "Customized" |
| สถานะตามเวลา | 🔴 session 14:00–15:00 ตอน 15:52 ยังเป็น **Upcoming** (ควร Ended) |
| **สาเหตุบั๊ก "Live"** | 🔴 **กดเช็คชื่อครั้งแรก = สั่ง "เริ่มคลาส" แทนการบันทึก** (session → Live "started at 15:52") ต้องกดซ้ำอีกครั้งถึงบันทึก · ไม่มี toast ทั้งสองครั้ง · อธิบายกรณี 6 ต.ค. กลายเป็น Live |
| Absent | ✅ บันทึกได้ (กดครั้งที่ 2) · ⚠️ Attendance บอก "Deducted" แม้เป็น subscription |
| Attendance summary cards | 🔴 **ไม่กรองตามช่วงวันที่** — สัปดาห์ 21–27 ก.ย. นับ Present (29 ก.ย.) + Leave (6 ต.ค.) ที่อยู่นอกช่วง |
| Attendance → Reschedule | ⚠️ "coming soon" |
| Session → Reschedule | ⚠️ ย้ายได้เฉพาะเข้า session ที่มีอยู่แล้ว **ในสัปดาห์เดียวกัน (พ.–อา.)** · ไม่มีการสร้าง session ชดเชยใหม่ |
| Summary | ✅ Present → เกิดช่อง summary → Submit → Approve → หน้า Summaries ตรงกัน · ⚠️ อนุมัติตัวเองได้ |
| Student profile → Attendance | ✅ แสดง Leave 6 ต.ค. และ 2 sessions ก.ย. (ข้อมูลต่อกัน) · ⚠️ ในหน้า session ไม่แสดงว่าลาแล้ว |
| Student list | ⚠️ Classes left "0" แม้ subscription จ่ายแล้ว · ครูที่ลบยังแสดง · Family "—" ในหน้า Attendance |

---

## 3. ยังไม่ได้เทส (ต้องการเงื่อนไขเพิ่ม)

- Approve invoice (ต้องมี account ที่ 2 + PDF ต้อง gen สำเร็จก่อน — ติด C1)
- Upload slip / partial payment / cash / bank reconciliation / Claim entitlement / Receipt / Send to accountant
- LINE: ส่ง invoice/receipt/summary, link code parent (ต้องมี LINE OA staging)
- Role permission (Teacher/Admin/Manager เห็นอะไร) — ต้องมี account แต่ละ role
- Sign-in: Forgot password / New here
- เปลี่ยนภาษาเป็นไทย
- Reschedule flow, Renew flow, Deactivate class/branch, Remove student จากคลาส (เปิด dialog ดูแล้ว ยังไม่กดยืนยัน)
