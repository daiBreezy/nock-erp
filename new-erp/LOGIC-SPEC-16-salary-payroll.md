# LOGIC SPEC 16 — Salary / Payroll (⏸️ Phase 2 · HR)
> 14 Jul 2026 · ที่มา: Salary flow diagram · HR = Phase 2 (ยังไม่ build)
> เก็บ discovery ไว้ก่อน

---

## AS-IS Flow
```
Jobcan (ระบบลงเวลาพนักงาน · external) = ต้นทาง OT/Late
  ↓
Request OT (staff ขอรายวัน · ต่อคน ต่อครั้ง)
  ├─ Shibasan Approval → Approve
  └─ Reject → "Cut OT" (ตัด OT วันนั้นของคนนั้น) → วน
  ↓
Admin download ตาราง Jobcan (OT · Late)
  ↓
Calculate Salary = Base + OT − (หักมาสาย)
  ↓
Fill Payroll ใน KBiz
  ↓
Shibasan Approval (สุดท้าย)
```

## ข้อค้นพบสำคัญ
- ✅ **Jobcan = StaffTimesheet** (ลงเวลาพนักงาน) — คนละ entity กับ StudentAttendance
  → ยืนยันการแยก 2 attendance ที่เสนอตั้งแต่ต้น
- **external integration**: Jobcan (download/API) + KBiz payroll
- เชื่อม Teacher comp 2 โมเดล:
  - Full-time → flow นี้ (Base+OT−Late → KBiz)
  - Part-time → vendor/WHT (LOGIC-SPEC-03/07) คนละ flow
- Shibasan อนุมัติ 2 จุด: OT (รายวัน) + Salary (สุดท้าย)

## Automation (Phase 2)
- ดึง Jobcan อัตโนมัติ (API) · OT approval ใน ERP · คำนวณเงินเดือนอัตโนมัติ · export KBiz
- OT rule: base + OT rate − late deduction (สูตรต้องได้จาก HR ตอน Phase 2)

## ⏸️ สถานะ: Phase 2 · ยังไม่ build · รอ HR module
