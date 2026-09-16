# LOGIC SPEC 07 — Staff & Role Assignment
> 13 Jul 2026 · ที่มา: Nock confirm · แก้ model เดิม (staff.role = ค่าเดียว → ผิด)
> ✅ ยืนยัน

---

## โครงสร้าง (ยืนยันแล้ว)
```
Staff ──< RoleAssignment >── (branch × role × schedule)
1 คน ถือได้หลาย assignment พร้อมกัน
```

**ตัวอย่างจริง (ครูมิ้น):**
| วัน | สาขา | role |
|---|---|---|
| จ-อ-พ | ตึกน้ำ | Teacher |
| พฤ-ศ | ศรีราชา | Admin |

## กฎ (ยืนยันแล้ว)
- ✅ 1 คน = **หลาย role × หลายสาขา** พร้อมกันได้
- ✅ **schedule (วัน) = ข้อมูลว่า "ปกติอยู่สาขาไหน"** — ไม่ล็อกสิทธิ์
- ✅ **แบบ B: มี role = มีสิทธิ์ตลอดสัปดาห์** (ไม่ต้องเช็ควันก่อนทำ)
- ✅ permission = union ของทุก role ที่ถือ (active เสมอ)
- ✅ **masterAdmin = สิทธิ์ต่อสาขา** (1 คน/สาขา ออก INV/RE ได้ + ลายเซ็น) — ไม่ใช่ยศของคน

## แก้ model เดิม
- ❌ เดิม `staff.role` = string เดียว → รองรับเคสนี้ไม่ได้
- ✅ ต้องเป็น `RoleAssignment[]` = `{staffId, branch, role, days[]}`
- days[] ใช้เพื่อ workload/scheduling (effectiveLoad ฯลฯ) ไม่ใช่ authorization

## Teacher Compensation — 2 โมเดล (ยึด Vendor Doc เป็น source)
- **Full-time** → เงินเดือน (salary · recurring · Finance)
- **Part-time** → จ่ายแบบ **vendor** (หัก WHT ภงด.3 ค่าบริการ 3%) — อยู่ในทะเบียน vendor จริง
  (ครูปาล์ม/วิน/ดาว/นนท์... ใน Vendor Doc)
- ⚠️ **ครู part-time = เป็นทั้ง Staff (Academy) + Vendor (Finance) คนเดียวกัน**
  → data model ต้องเชื่อม 2 ตัวตน (ไม่งั้นจ่ายผิด/ออก 50 ทวิ ผิดคน)
- 📌 รายละเอียดการจ่าย/หัก = **ยึดตาม Vendor Doc** (ข้อมูลจาก Admin ตรง) ไม่เดา
- payroll เต็มรูปแบบ = Phase 2 (HR)

## Multi-branch view (ยืนยัน 14 Jul)
- ✅ ถือ role 2 สาขา → **เห็นข้อมูลรวม · ใช้ Branch filter เลือกดู** (ไม่ต้องสลับ context/login)
