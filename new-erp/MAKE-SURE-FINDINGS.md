# Make-Sure Walk — สรุปสิ่งที่จับได้ (13 Jul 2026)
> ไล่ทั้งระบบ ERP ทีละ part เพื่อ verify · นี่คือผลรวม

---

## 🔴 #1 STRUCTURAL REQUIREMENT — Business Line เป็น dimension หลัก
**สายธุรกิจ (Liclass / NAS / NA App) ต้องเป็นแกนคู่กับ "สาขา" ทุกที่:**
- เลขเอกสาร (01/02) · บัญชีรับแยกสาย · package type (hour/week) · VAT (อาจต่างสาย)
- Settings ต้องแยกสาย · Reports ต้องซอยตามสาย (รู้ว่าสายไหนกำไร)
- ⚠️ prototype เดิมรู้จักแค่ `branch` → **ต้องเพิ่ม `businessLine` เป็น first-class dimension**
- นี่คือช่องว่างโครงสร้างที่ใหญ่สุด กระทบเกือบทุกโมดูล

---

## 📝 เอกสารเก่าที่ไม่ตรง (แก้แล้ว)
| doc | เดิม | จริง |
|---|---|---|
| CRM pipeline | 8 stage เชิงเส้น | **5 คอลัมน์ · ขั้นตอน optional · ข้ามได้** |
| Bundle course | type ที่ 3 (block billing) | **ไม่มีจริง = Week package** (ลบทิ้ง) |
| Calendar ops | Transfer + Reschedule | **+ Substitute/Combine/Postpone (Phase 2)** |
| Week package | week-based | **ตอนนี้ยัง Month · อนาคตเปลี่ยนเป็น Week** |

## 🟣 Over-built pattern (PO ไม่รู้จัก/ลืม → ต้องยืนยันก่อน build)
- ราคา 3 ชั้น · Bundle/Block → **ตัดออก/ยุบ**
- Approval 3 ชั้น → เป็น to-be ที่ถูก (ต่างจากพวกบน)
- ⇒ กฎ: feature ซับซ้อนทุกอัน **ยืนยันกับ Nock ก่อนว่ามีจริง**

## ✅ กฎที่ยืนยันแล้ว (core business flow)
- **CRM**: Family-level → แตกเป็น Student · Test=placement (จัด class ตามระดับ) · Trial=1 คาบ · ทั้งคู่ optional
- **Customer**: Family=ผู้จ่าย (กลางบริษัท) · Student=ผู้เรียน+เจ้าของ INV/RE · **Invoice = 1 ต่อ 1 นักเรียน**
- **ส่วนลดพี่น้อง**: น้อง −20% · ข้ามสาย/สาขา · stack กับโปรชั่วโมงได้
- **Package**: Hour / Week (ราย enrollment ไม่ล็อกตามสาย)
- **Class**: คละเกรดได้ (ยึดระดับความสามารถ)
- **Attendance**: Present→หัก session · Leave(ในโควตา)→หัก quota · Leave เกิน/Absent→หัก session · **1 session = 2 hrs**
- **Summary**: ครูเขียนรายคน → Admin approve → ส่ง · **AI ช่วยได้แค่ template ไม่ใช่เนื้อหา**
- **Receipt**: 1 INV → หลาย RE (แตกตาม line, หลายรอบ, ห้ามตัดทิ้ง) · RE reflect INV number
- **เลขเอกสาร**: `INV[YYMMdd]-[biz]-[branch]-[run]` → RE ตามเลข INV
- **Inbox = LINE OA จริง** (ที่เดียวจบ)
- **Staff**: 1 คน = หลาย role×สาขา×วัน · role=สิทธิ์ตลอด (วัน=ที่อยู่ ไม่ล็อกสิทธิ์)

## 🟩 Phase 2 (ยืนยันว่าตั้งใจ ไม่ใช่ over-built)
Substitute (Day/Class) · Combine · Postpone

## ⛔ ยังบล็อก — รอ KMD/ธนาคาร
ดู `QUESTIONS-KMD-BANK.md` (20 คำถาม) · VAT · e-WHT · Bill Payment ฯลฯ

---

## Logic Specs ที่ถอดแล้ว (11 ไฟล์)
01 Invoice · 02 Expense · 03 Vendor/WHT⏸️ · 04 Receipt · 05 Fee ·
06 Customer · 07 Staff/Role · 08 Period Close · 09 Course/Class ·
10 Calendar Ops · 11 Summaries
