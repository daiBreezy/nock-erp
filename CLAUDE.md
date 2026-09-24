# NockAcademy Monorepo

รวมทุกโปรเจกต์ของ NockAcademy ไว้ใน repo เดียว เพื่อ backup + ทำงานข้ามเครื่อง (บ้าน ↔ ที่ทำงาน)

- **GitHub:** https://github.com/daiBreezy/nock-erp
- **ภาษาสื่อสาร:** ไทยเป็นหลัก

## โปรเจกต์ในนี้

| โฟลเดอร์ | คืออะไร | อ่านต่อ |
|---|---|---|
| `erp-v2/` | ⭐ ERP Prototype ใหม่ (Next.js + shadcn) สร้างจากผลเทส Staging | `erp-v2/CLAUDE.md` |
| `new-erp/` | เอกสาร ERP (spec, ผลเทส Staging) + prototype HTML เก่า | `new-erp/CLAUDE.md` |
| `web-app/` | NA Web redesign — front-end (Clip Page, Landing) | `web-app/CLAUDE.md` |
| `teacher-portal/` | Portal ครู (WEB Teacher) | `teacher-portal/` |
| `krujob/` | หน้าสมัครงานครู (KRU JOB) | `krujob/` |
| `_archive-erp-prototype/` | ERP prototype เก่า เก็บไว้เผื่ออ้างอิง (ไม่ใช้แล้ว) | — |

> แต่ละโปรเจกต์มี context เฉพาะของตัวเองในไฟล์ CLAUDE.md ของโฟลเดอร์นั้น — อ่านอันนั้นก่อนเริ่มงานในโปรเจกต์นั้นๆ

## บริบทข้ามเครื่อง (สำคัญ)

ประวัติแชทกับ Claude **ไม่ข้ามเครื่อง** (เก็บ local แต่ละเครื่อง) — ข้อสรุป/การตัดสินใจสำคัญจึงถูกจดไว้ที่:

👉 **`WORKLOG.md`** (ที่ root นี้) — อ่านไฟล์นี้ก่อนเริ่มงาน เพื่อรู้ว่าเครื่องอื่นทำอะไร/ตัดสินใจอะไรไปแล้ว

## Workflow ทำงานข้ามเครื่อง (กฎทอง)

1. **ก่อนเริ่มงาน:** `git pull` (ดึงของล่าสุดจากอีกเครื่อง)
2. **หลังเลิกงาน:** จดสรุปลง `WORKLOG.md` แล้ว `git push`
3. อย่าลืม push ก่อนสลับเครื่องทุกครั้ง

## ตั้งเครื่องใหม่ (เช่น เครื่องที่บ้าน)

```bash
git clone https://github.com/daiBreezy/nock-erp.git
```
ได้ครบทั้ง 4 โปรเจกต์ในครั้งเดียว (ยกเว้น `node_modules` — ต้อง `npm install` ใหม่ในโปรเจกต์ที่เป็น React)
