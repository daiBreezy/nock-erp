# LOGIC SPEC 05 — Fee Accrual (Book / Bus / Exam) → Invoice source
> 13 Jul 2026 · ที่มา: Nock confirm + interview C1
> สัญลักษณ์: ✅ ยืนยัน · 🔄 แก้สมมติฐานเดิม

---

## 🔄 แก้สมมติฐานเดิม (สำคัญ)
- ❌ Claude เคยเดา: Book/Bus/Exam = **event stream** (ครูกดบันทึกตอนแจก) → **ผิด**
- ✅ ของจริง: ค่าใช้จ่ายทั้งหมดถูกจดใน **"customer management sheet"** —
  Sheet ยาวใบเดียว มี **Lead + Customer เรียงรวมกัน** + ข้อมูลพื้นฐาน + fee ทุกชนิด
- Invoice สร้างโดย **Admin กวาดอ่าน row ของนักเรียนคนนั้นจาก Sheet**

## ✅ กระบวนการจริง (as-is)
```
คุยกับผู้ปกครอง (Admin + ครู) → จดลง customer management sheet (row ต่อคน)
→ Confirm ครบกับผู้ปกครอง → Admin อ่าน row → Create Invoice
```

## 🔴 Root cause ที่ยืนยันแล้ว
- Sheet รก + ยาว + Lead ปน Customer → **Admin มองข้าม line** → "ลืมค่าหนังสือ" (C1.4)
- นี่คือเหตุผลที่ **Teacher Re-check** ต้องมีอยู่ (ตรวจว่า Admin ลืมอะไรไหม)
- ⇒ ปัญหาไม่ใช่ "การพิมพ์บิล" แต่คือ **"ข้อมูลอยู่ในที่ที่ต้องกวาดหา"**

## 🎯 ทางแก้ (to-be)
- customer management sheet = สิ่งที่ **Customer/Student master ใน ERP ต้องมาแทน**
- Book/Bus/Exam = **field/line มีโครงสร้าง ผูกกับนักเรียน** (ไม่ใช่ข้อความใน cell)
- Invoice **auto-pull** จาก row นักเรียน → ไม่มีอะไรให้กวาด ไม่มีอะไรให้ลืม
- ⇒ **Teacher Re-check หมดความจำเป็น** (ไม่มีการพิมพ์มือให้ตรวจ)

## ❓ ยังต้องถาม
- Book/Bus/Exam ในชีวิตจริง กรอกเป็น "จำนวนเงิน" หรือ "จำนวนหน่วย × ราคา"?
- ค่าที่เกิด**กลางคอร์ส** (ซื้อหนังสือเดือน 2) จดเพิ่มใน row เดิม หรือรอบใหม่?
- Lead กับ Customer ควรแยกคนละที่ใน ERP (Lead = CRM · Customer = Student master) ✅ ตรงกับที่ระบบมีอยู่แล้ว
