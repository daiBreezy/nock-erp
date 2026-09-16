# LOGIC SPEC 06 — Customer / Family / Student Master
> 13 Jul 2026 · ที่มา: Nock confirm · แทน "customer management sheet"
> ✅ ยืนยัน · ❓ รอ

---

## โครงสร้างหลัก (ยืนยันแล้ว)
```
Family  = หน่วยจ่ายเงิน · entity กลางทั้งบริษัท (ข้ามสาย/ข้ามสาขา)
  └─ Student(s) = หน่วยที่เรียน · เจ้าของ Invoice/Receipt · ข้ามสาขาได้
```
- ✅ **Invoice = 1 ใบต่อ 1 Student** (พี่น้องแยกใบ)
- ✅ **Family = ผู้จ่าย** (แม่โอนก้อนเดียวให้ลูกหลายคน → 1 payment → หลาย invoice)
- ✅ **ส่วนลดพี่น้อง 20%** ผูกที่ Family · ลงที่ invoice ของ "น้อง"
  - 🔴 **แก้ 15 Jul (KMD):** **ห้ามข้าม business type** (พี่ NAS + น้อง Liclass = ไม่ได้ลด)
    ข้าม **สาขา** ใน business type เดียวกัน = ยังได้ · เดิมเข้าใจว่าข้ามสายได้ = ผิด
- ✅ ลูกคนละสาขา/สาย = คนละ business code บนเลขเอกสาร ก็ยังถูก (เพราะ invoice ต่อ student)

## เชื่อมกับ spec อื่น
- Payment ก้อนเดียว → หลาย invoice = **PaymentAllocation** (spec 04)
- customer management sheet = ต้นทาง fee (spec 05) → ต้องกลายเป็น master นี้
- Lead ปนใน sheet เดิม → แยกไป CRM · Customer → Student master (ระบบมีแยกแล้ว)

## Consumption model = ราย enrollment (ยืนยัน 13 Jul)
```
Hour package (24/48/72/96h) · renewal เมื่อเหลือ ≤2 · leave = hours÷8
Week package · เรียนตามตารางรายสัปดาห์ · duration 30/50/75/90 นาที
```
- ⚠️ **type เป็นราย enrollment ไม่ล็อกตามสาย** — NAS *มัก* ใช้ Hour · Liclass *มัก* ใช้ Week
  แต่ทั้งคู่ใช้ได้ทั้ง 2 แบบ (นักเรียนคนเดียวอาจมีทั้ง hour + week enrollment)
- ✅ สถานะนักเรียน 4 แบบ (active/renewal/pause/archived) ใช้ทั้งคู่ — **แต่ trigger ต่างกัน**
- ⚠️ กฎ renewal/leave/consumption ต้อง **แตกตาม package type** (hour vs week)
- Liclass ต้องมี weeksPaid/weekUsed (ยังไม่มีใน prototype เต็ม)

## ⚠️ ฝากถาม KMD
- ส่วนลดข้ามสายธุรกิจ (ให้บน INV Liclass เพราะพี่เรียน NAS) — กระทบบัญชี/VAT ไหม

## ❓ ยังต้องถาม
- "น้อง" ตัดสินจากอายุ ณ ตอนสมัคร · ถ้าพี่เรียนจบไปแล้ว น้องยังได้ 20% ต่อไหม
- ค่ากลางคอร์ส (ซื้อหนังสือเดือน 2) เพิ่มใน enrollment เดิม หรือรอบใหม่
