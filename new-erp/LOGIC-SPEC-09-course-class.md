# LOGIC SPEC 09 — Course / Class
> 13 Jul 2026 · make sure walk · Nock confirm
> ✅ ยืนยัน · 🗑️ ตัดทิ้ง

---

## Package type — มีแค่ 2 (ยืนยัน 13 Jul)
```
Hour package  (24/48/72/96h) · consume ราย session · renewal ≤2 · leave = hrs÷8
Week package  · consume ราย week · ตารางประจำสัปดาห์ · duration 30/50/75/90 นาที
```
- ⚠️ **ตอนนี้ Week ยัง implement เป็น Month อยู่** → อนาคตเปลี่ยนเป็น Week
  (เหตุ: แต่ละเดือนมี 4/5 สัปดาห์ไม่เท่ากัน = คิดเงินเพี้ยน)
- 🗑️ **ไม่มี "Bundle course" เป็น type ที่ 3** — Nock ยืนยันว่าไม่มีจริง (ลืมไปว่าเคยใส่)
- "Course Admission M.1" = **Week package** (ตารางประจำสัปดาห์) ไม่ใช่ Bundle
- คำว่า "block" ในโค้ด/CLAUDE.md = "week" (ศัพท์ซ้ำซ้อน)
- ⚠️ **CLAUDE.md section "Bundle Course" = stale** (bundleStartDate/billingBlockSize/
  admissionFee ฯลฯ) → ต้องล้าง/ยุบเข้า Week ทีหลัง (ไฟล์ใหญ่ ยังไม่แก้ตอนนี้)

## Class (ยืนยัน)
- ✅ **คละเกรดได้** — Class ยึด "ระดับความสามารถ" ไม่ใช่เกรดจริง
  (Test placement จัด ป.5 พื้นอ่อน → เข้า class ป.4)
- soft limit 6 คน/class (warn ไม่ block)
- concurrent classes ≤ จำนวนห้องของสาขา
- ครูชนเวลาข้ามสาขา (วัน+เวลาเดียวกัน คนละสาขา) = ERROR

## Architecture (ยืนยันจาก CLAUDE.md — ยังตรง)
```
Subject (base: Eng/Math/Science/Thai...) → Course → Class (per branch) → Session
Teacher: Subject(s) + Grade range · ผูก subject มากับครู
```

## Pattern เตือน (over-built ที่เจอแล้ว 3 จุด)
- "ราคา 3 ชั้น" · "Approval 3 ชั้น" · "Bundle/Block" ← ทั้งหมด PO ไม่รู้จัก/ลืม
- ⇒ เวลา build จริง **ยืนยันทุก feature ที่ซับซ้อนกับ Nock ก่อน** ว่ามีจริงไหม
