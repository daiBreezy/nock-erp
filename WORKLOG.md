# WORKLOG — บันทึกข้อสรุปข้ามเครื่อง

> วิธีใช้: เครื่องไหนทำงานเสร็จ ให้จดสรุป "ทำอะไร / ตัดสินใจอะไร / เหลืออะไร" ไว้บนสุด (ใหม่สุดอยู่บน) แล้ว `git push`
> อีกเครื่อง `git pull` + อ่านไฟล์นี้ ก็ตามงานต่อได้ ถึงจะไม่เห็นแชทดิบ

---

## 🏠 คู่มือตั้งเครื่องบ้าน (first-time setup — ทำครั้งเดียว)

> ยืนยันแล้ว: ไฟล์เดิมบนเครื่องบ้าน "ไม่ได้ใช้เลย" ลบทิ้งได้ (ทุกอย่างอยู่บน GitHub ครบแล้ว)

1. **ลบ/เก็บโฟลเดอร์ NockAcademy เก่าบนเครื่องบ้าน** (รวมโฟลเดอร์ที่เคยผูก `nock-erp` แบบเก่า) — เป็นของซ้ำ ปลอดภัยที่จะลบ
2. **Clone monorepo ลงมาใหม่:**
   ```bash
   cd ~/Documents/Claude/Projects   # หรือที่ไหนก็ได้ที่อยากเก็บ
   git clone https://github.com/daiBreezy/nock-erp.git
   ```
3. **สร้างไฟล์ permission** (ให้ Claude สั่ง push/pull แทนได้ — ไฟล์ .local ไม่ตามมากับ git ต้องสร้างเองทุกเครื่อง):
   ```bash
   mkdir -p nock-erp/.claude && cat > nock-erp/.claude/settings.local.json << 'EOF'
   {
     "permissions": {
       "allow": [
         "Bash(git pull:*)", "Bash(git push:*)", "Bash(git add:*)",
         "Bash(git commit:*)", "Bash(git fetch:*)", "Bash(git status:*)",
         "Bash(git log:*)", "Bash(git diff:*)", "Bash(git ls-remote:*)", "Bash(git rev-parse:*)"
       ]
     }
   }
   EOF
   ```
4. **โปรเจกต์ React** (`web-app/app`, `teacher-portal/web-teacher-app`) ถ้าจะรัน ต้อง `npm install` ใหม่ (node_modules ไม่ได้ขึ้น git)
5. เปิด Claude Code ที่โฟลเดอร์ `nock-erp` แล้วทำงานได้เลย — pull ก่อนเริ่ม / push หลังเลิก

> token ของ daiBreezy: push ครั้งแรกบนเครื่องบ้านจะถาม username (`daiBreezy`) + token อีกครั้ง (คนละ keychain) ใส่ครั้งเดียวแล้วจำ

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
- [x] ~~โฟลเดอร์เดิม 4 อันที่กระจายอยู่~~ ✅ เสร็จ — เทียบแล้วไฟล์งานเหมือน monorepo เป๊ะ (ต่างแค่ .DS_Store/.git/node_modules) → ย้ายเข้า `Projects/_ARCHIVE_pre-monorepo_2026-09-16/` แล้ว (ยังไม่ลบ เผื่อถอย; มั่นใจแล้วค่อยลบกล่องนี้ทีหลัง) ตอนนี้ `Projects/` เหลือแค่ `nock-erp/` + กล่อง archive
- [x] ~~ตั้งให้ Claude push แทนได้~~ ✅ เสร็จ — ย้าย session มาที่ `nock-erp/` แล้ว + เพิ่ม allow rules ใน `.claude/settings.local.json` (git pull/push/commit/... ) → สั่ง "pull"/"push" ได้เลย
- [ ] เครื่องที่บ้าน: `git clone` monorepo ลงมา (แยกจาก repo ERP เก่า) — และสร้าง `.claude/settings.local.json` ที่นั่นด้วย (ไฟล์ local ไม่ตามมากับ git) ถ้าอยากให้ Claude push แทนได้เหมือนเครื่องนี้
