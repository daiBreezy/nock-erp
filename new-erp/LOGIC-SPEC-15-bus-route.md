# LOGIC SPEC 15 — Bus / Student Route (🆕 โมดูลใหม่)
> 13 Jul 2026 · ที่มา: Class "Bus" tab mockup · ไม่เคยอยู่ใน map
> ✅ **BUILT (14 Jul)** — `js/bus-route.js` + nav "Bus Route" (Operations) · prototype ทำงานจริง
>   3 tabs (Daily Ops/Vehicles/Zones) · live tracking · แทนรถ · schedule table · verify แล้ว
> ✅ **BUILT (15 Jul)** — `js/bus-views.js` — output views 2 ตัว (Nock ขอ "อยากเห็นของจริง"):
>   1) **Live Tracking modal** (`brTrack`) — รถวิ่งไล่จุดจริง · route rail (รับแล้ว✓/🚌กำลังไป/รอ) ·
>      progress bar · current-stop ETA/ระยะ · ปุ่ม "จำลองการวิ่ง" (setInterval) + "จุดถัดไป" + reset ·
>      ถ้ารถ running จริง sync pickedN กลับการ์ด Daily · ปุ่ม Preview Route/Live Tracking เรียกอันนี้
>   2) **Driver route sheet modal** (`brSheet`) — เอกสารจริงส่งคนขับ · หัวเอกสาร+รอบ+วันที่ พ.ศ. ·
>      กล่องรถ/คนขับ/โทรฉุกเฉิน/ที่นั่ง · ตารางจุดเรียงลำดับ (เวลา/นักเรียน/ที่อยู่/รับ-ส่ง/ช่องเช็ค) ·
>      Print (เปิดหน้าต่างพิมพ์) · Download (txt) · ส่งให้คนขับ (mock LINE) · ปุ่ม "ตารางคนขับ" เรียกอันนี้
> ✅ **Route editing + date nav (15 Jul)** — ตอบ Nock "route ต้องแก้ได้ · เพิ่ม/ลบคน · ดูวันอื่นยังไง":
>   - **Date navigation** — ◀ / วันที่ (พ.ศ.) / ▶ + ปุ่ม Today · `brSetDate(±1)` · `brToday()`
>   - **Status แยกต่อวัน** — `RT[date][vid]` (lazy `rtOf()`) · แต่ละวัน approve เอง (daily gate) · วันใหม่ = Pending
>   - **เพิ่มนักเรียน** — ปุ่ม "เพิ่มนักเรียนเข้าคันนี้" → modal (ชื่อ/เกรด/รับ-ส่ง/ที่อยู่/ETA) · เตือนถ้าเต็ม cap
>   - **ลบนักเรียน** — ปุ่ม ✕ ต่อแถว (`brRemoveStop`) · เพิ่ม/ลบ/สลับ → route กลับเป็น Pending รอ approve ใหม่
>   - แก้ลำดับ/ลบได้เฉพาะ pending|approved + มุมมองเช้า (เย็น = ลำดับกลับด้าน อ่านอย่างเดียว)
> ✅ **Week View + Report (15 Jul)** — `js/bus-report.js`:
>   - **Week View tab** — grid คัน × วัน (จ–ศ · เสาร์-อาทิตย์ หยุด) · ต่อช่อง = pax + ☀เช้า/🌙เย็น + สถานะย่อ ·
>     week nav ◀▶ (brSetDate ±7) + Today · คลิกช่อง → `BusRoute.goDay()` เปิด Daily วันนั้น
>   - **Report tab (Route Summary §79)** — KPI (เที่ยว/สัปดาห์ · คน-เที่ยว · เวลาเฉลี่ย/รอบ · ค่ารถรวม) ·
>     Insight (คันที่ใช้เวลานานสุด) · ตารางรายวัน (วัน/คัน/คนขับ/รอบ/เช้า/เย็น/ระยะ/เวลา/ค่ารถ) · Export CSV ·
>     ระยะ/เวลา = mock จากจำนวนจุด (base+ต่อจุด) — เก็บเป็น historical เพื่อ optimize อนาคต

---

## มันคืออะไร
จัดการ **รถรับ-ส่งนักเรียน** — เชื่อมกับ Bus fee (LOGIC-SPEC-01)
Admin ดูตาราง/สร้างเส้นทางรายวัน แล้วส่งให้คนขับ
- ⭐ **ต้องมี Menu/module ของตัวเอง** (Nock 14 Jul) — Admin จัดการละเอียด · แก้ได้ตลอดเวลา
  (ไม่ใช่แค่ tab ใน Class)

## ข้อมูล (จาก mockup)
- ต่อ class/วัน: รายชื่อนักเรียน + **ที่อยู่** + type **Pickup / Dropoff / Both**
- ลำดับจุด (1,2,3...) · pin แต่ละจุด
- ปุ่ม **Route** → เมนู:
  - **Class Route** (เส้นทางของ class นี้)
  - **Preview Route** (เปิด Google Map)
  - **Download Route** · **Share Route** (ส่งให้คนขับ · ราย day/week)

## เชื่อมกับอะไร
- **Bus fee** = 100/วัน × learning dates · pickup/dropoff เลือกตอนสร้าง Invoice
- Student address (Master Data)
- **Google Maps integration** (Preview/route optimization)

## Fleet & Capacity (ยืนยัน 14 Jul)
- รถ **ต่อสาขา** (ไม่เท่ากัน): Sriracha = 2 คัน · Thonglor = 1 คัน
- ความจุ **10 นักเรียน + คนขับ = 11 ที่**
- ต้อง track **จำนวนเด็ก/รอบ → รู้ที่ว่าง** (ผู้ปกครองโทรขอติดรถกลางคัน → เช็คที่เหลือ)
- 1 คัน วิ่งได้ **หลายรอบ/วัน** (เกิน capacity → แบ่งรอบ)

## Area splitting (ตอบจุดที่ Nock ติด)
- ✅ **วิธี A: Admin กำหนดโซนเอง** → assign นักเรียนเข้าคันตามโซน (เหนือ→คัน1 · ใต้→คัน2)
  → **Google จัดลำดับ (optimize) ภายในคัน** ให้
- คน = ตัดสินใจโซน · เครื่อง = จัดลำดับ · (auto-clustering = Phase หลัง)
- เกิน 10 คน/คัน → ระบบแบ่ง **หลายรอบ** อัตโนมัติ

## 📋 Schedule Table (Nock อยากได้ — output ของ route)
ต่อวัน · แสดงชัดว่ารถวิ่งยังไง:
| คัน | รอบ | ทิศ (เช้า/เย็น) | ออกจากจุดจอด | จุด 1 (เด็ก·เวลา) | จุด 2… | ถึงโรงเรียน | ที่นั่งใช้/ว่าง |
- เวลาแต่ละจุด = **ETA จาก Google** (traffic-aware)
- optimize by **เวลาเป็นหลัก** (รถติด) · ระยะเป็นรอง

## Route + Fee (ยืนยัน 14 Jul)
- ✅ **Google auto-optimize ก่อน → Admin แก้ลำดับเองได้** (คนขับรู้ทางลัดที่ Google ไม่รู้)
- ✅ **ที่อยู่นักเรียนมาจาก Form ที่ผู้ปกครองกรอก** → geocode → ป้อน optimizer
- ✅ เช้า/เย็น = คนละ route (บ้าน→โรงเรียน / โรงเรียน→บ้าน)
- ✅ **ค่ารถ = 100 บาท/รอบ** (pickup 100 · dropoff 100 · **Both = 200/วัน**)
- ✅ same-day merge: หลาย class วันเดียว → คิดรถ **รอบเดียวต่อวัน**

## 📄 Route Menu — โครงหน้า (proposal 14 Jul · แก้ได้ตลอด)
**① Daily Operations** (หลัก) — เลือกวัน + สาขา
- ต่อคัน: รอบเช้า | รอบเย็น · แต่ละรอบ = รายการจุด (ลำดับ·เด็ก·ที่อยู่·รับ/ส่ง·ETA·ที่นั่งใช้/ว่าง)
- ปุ่ม: Auto-optimize · ลากจัดลำดับเอง · +เพิ่มเด็ก ad-hoc · Preview Map · Download · Share
- Schedule Table รวม (คัน·รอบ·ออกจุดจอด·ถึงโรงเรียน·ที่นั่ง)

**② Vehicles** — คัน · capacity · คนขับ(vendor) · depot · ต่อสาขา

**③ Zones** — นิยามโซน + assign เด็ก→คัน (เหนือ→คัน1 · ใต้→คัน2)

## Route Lifecycle (ยืนยัน 14 Jul)
```
Build ล่วงหน้า (ได้เป็นเดือน) → Admin ปรับ/แก้ลำดับจุด (1,2,3...)
→ Admin APPROVE (ทุกวัน) → บันทึก + ส่งคนขับ
→ มีเปลี่ยนแปลง → ส่งคนขับใหม่ได้
```
- ✅ **Route pre-build ทั้งเดือน** · เก็บ detail ให้ Admin ไล่ดูรายวัน
- ✅ **Approve = daily gate** (Admin approve ให้คนขับทุกวัน)

## Live tracking (ระหว่างวิ่ง)
- รับถึงคนที่เท่าไหร่แล้ว (stop #) · รับเสร็จ/ยัง · เวลาที่ใช้ต่อจุด
- ⇒ สถานะ route: pending → approved → running → completed

## Vehicle detail + แทนรถ
- เลขรถ · คนขับ · **เบอร์โทรคนขับ (โทรฉุกเฉิน)** · จุดจอด (depot)
- ✅ **รถเสีย → substitute รถคันอื่นมาแทนรายวันได้** (ไม่กระทบ route ถาวร)

## 📊 Route Summary Report (Nock อยากได้)
`คัน · วันไหน · กี่รอบ · รอบละกี่คน · ใช้เวลาเท่าไหร่`
- เก็บเป็น historical data → **ปรับปรุงการจัดรถในอนาคต** (optimize จากของจริง)
- เชื่อม Reports: อาจเป็น fact ใหม่ `RouteFact` (date·vehicle·round·pax·duration)

## Entities (สำหรับ MJ)
`Vehicle(branch, number, capacity=10, driver, driverPhone, depot)` · `Zone(branch, name, area)` ·
`Route(vehicle, date, direction, round, status, approvedBy, substituteVehicle?)` ·
`Stop(route, student, geo, type, plannedTime, actualTime, seatSeq, pickedUp)`

## ❓ ยังต้องถาม (minor)
- คนขับ = vendor (Vendor Doc: น้าเอื้อง/น้าเบ้ง เช่ารถตู้ ภงด.3) — ยืนยัน
- จุดจอดรถ (depot) = ที่โรงเรียน หรือคนละที่
