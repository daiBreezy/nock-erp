# LOGIC SPEC 13 — Enrollment lifecycle (กระดูกสันหลัง)
> 13 Jul 2026 · Nock confirm · scope = tutoring (Liclass/NAS)

---

## หน่วย (ยืนยัน)
- ✅ **1 enrollment = 1 วิชา** (Math 24h + Eng 24h = 2 enrollments)
- นักเรียนถือหลาย enrollment ขนานกัน · นับ consumption/renew **แยกรายวิชา**
  (Math หมดก่อน → renew Math ได้ โดย Eng ยังเหลือ)

## enrollment เก็บอะไร
```
studentId · subject · packageType (hour|week) · branch · businessLine
hour pkg:  hoursTotal · sessionsLeft (1 session = 2 hrs)
week pkg:  weeksTotal · weeksUsed   (ตอนนี้ยัง month-based)
leaveQuota = hoursTotal ÷ 8 · leaveUsed
status: active / renewal(≤2 left) / pause(0) / archived
```

## ความสัมพันธ์
- **Invoice (ราย student) → หลาย line** → line วิชา ผูก 1 enrollment · line Book/Bus/Exam **ไม่สร้าง enrollment**
- 1 Invoice ครอบได้ **หลาย enrollment** (Math enr + Eng enr) + ค่าอื่น
- **Renewal = enrollment ใหม่เสมอ** (ไม่ extend เดิม · 1 renewal = 1 enrollment ใหม่)
- Session generate เฉพาะ enrollment ที่ยังเหลือ (hours/weeks > 0)

## Mid-course fee (ยืนยัน 14 Jul)
- ✅ **ซื้อหนังสือ/ของเพิ่มกลางคอร์ส = เข้า enrollment เดิมไม่ได้** (fee ผูกตอนสร้างบิลแรก)
- ถ้าเกิดจริง → (a) **แยกบิลใหม่** หรือ (b) **ผูกกับบิล renewal รอบหน้า** (ถ้าตกลงต่อคอร์ส)

## Refund / ยกเลิกกลางคอร์ส (ยืนยัน 14 Jul)
- ✅ **ไม่คืนเงินเลย** (prepaid = ซื้อแล้วซื้อเลย) → **ไม่มี refund workflow**
- นักเรียนเลิกกลางคัน (เหลือชั่วโมง) → archive · ชั่วโมงที่เหลือ = **ริบ (breakage)**
- 📌 ทางบัญชี: unearned hours ที่ริบ = รับรู้เป็นรายได้ตอน archive
- หมายเหตุ: จ่ายเกิน (overpay) ยังเก็บเป็น CustomerCredit ได้ (คนละเรื่องกับ refund)

## Activation timing (ยืนยัน — จาก Create Invoice mockup)
- ✅ ตอนสร้าง Invoice **เลือก Schedule ต่อ course** (วันเริ่ม + Link Learning Dates)
- ✅ **enrollment/session เริ่มนับที่ "วันแรกที่เลือก"** (ไม่ใช่ตอน receipt/ตอน confirm)
- session count แสดงตอนสร้าง: **X12 = 24h · X24 = 48h** → ยืนยัน 1 session = 2 hrs
