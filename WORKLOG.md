# WORKLOG — บันทึกข้อสรุปข้ามเครื่อง

> วิธีใช้: เครื่องไหนทำงานเสร็จ ให้จดสรุป "ทำอะไร / ตัดสินใจอะไร / เหลืออะไร" ไว้บนสุด (ใหม่สุดอยู่บน) แล้ว `git push`
> อีกเครื่อง `git pull` + อ่านไฟล์นี้ ก็ตามงานต่อได้ ถึงจะไม่เห็นแชทดิบ

---

## 2026-09-16 — ตั้งระบบ monorepo + backup ขึ้น GitHub (เครื่องที่ทำงาน)

**ทำอะไร:**
- รวม 4 โปรเจกต์ (NEW ERP!, Web App, Teacher Portal, krujob) เข้า repo เดียว = monorepo
- โครงสร้าง: `new-erp/`, `web-app/`, `teacher-portal/`, `krujob/` + `_archive-erp-prototype/`
- ย้าย ERP prototype เก่าที่เคยอยู่ root ของ `nock-erp` เข้ากล่อง `_archive-erp-prototype/`
- ใส่ `.gitignore` (กัน `node_modules`, `dist`, `.DS_Store`, `.env`)
- push ขึ้น GitHub สำเร็จ (commit `f5ad1d8`)

**ตัดสินใจ (สำคัญ):**
- ใช้ **1 monorepo** แทน 4 repo แยก → เพราะทำงานคนเดียว เน้นง่าย + ข้ามเครื่องสะดวก (clone/pull/push ครั้งเดียวครบ)
- **account หลัก = `daiBreezy`** (repo: `daiBreezy/nock-erp`)
- repo เก่า `nockacademylms/NEW-ERP-` = ปล่อยไว้เป็น archive ของ NEW ERP! (ไม่ใช้ต่อ)
- ไฟล์ mockup PNG ใน `web-app/Learning Page [Export Design]/` (~103M) → เก็บใน git ได้ (ไม่มีไฟล์เดี่ยวเกินลิมิต 100MB)
- token ของ daiBreezy เก็บใน macOS keychain แล้ว → push/pull ครั้งต่อไปไม่ต้องพิมพ์รหัส

**เหลือทำ (TODO):**
- [ ] โฟลเดอร์เดิม 4 อันที่กระจายอยู่ (`NEW ERP!`, `Web App`, `Teacher Portal`, `krujob` ระดับ `Projects/`) — ตอนนี้ยังอยู่ครบ แต่ของจริงย้ายมา `nock-erp/` แล้ว → ต้องตัดสินใจ เก็บ archive หรือลบ (กันแก้ผิดโฟลเดอร์)
- [x] ~~ตั้งให้ Claude push แทนได้~~ ✅ เสร็จ — ย้าย session มาที่ `nock-erp/` แล้ว + เพิ่ม allow rules ใน `.claude/settings.local.json` (git pull/push/commit/... ) → สั่ง "pull"/"push" ได้เลย
- [ ] เครื่องที่บ้าน: `git clone` monorepo ลงมา (แยกจาก repo ERP เก่า) — และสร้าง `.claude/settings.local.json` ที่นั่นด้วย (ไฟล์ local ไม่ตามมากับ git) ถ้าอยากให้ Claude push แทนได้เหมือนเครื่องนี้
