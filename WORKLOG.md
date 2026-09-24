# WORKLOG — บันทึกข้อสรุปข้ามเครื่อง

> วิธีใช้: เครื่องไหนทำงานเสร็จ ให้จดสรุป "ทำอะไร / ตัดสินใจอะไร / เหลืออะไร" ไว้บนสุด (ใหม่สุดอยู่บน) แล้ว `git push`
> อีกเครื่อง `git pull` + อ่านไฟล์นี้ ก็ตามงานต่อได้ ถึงจะไม่เห็นแชทดิบ

---

## ▶️ วิธีเปิด prototype ดู (ทุกวัน)

**ดับเบิลคลิกไฟล์ `start-servers.command`** (อยู่ที่ root ของ `nock-erp/`) → เปิด server ครบ 3 ตัวในทีเดียว
แล้วเปิดลิงก์ในเบราว์เซอร์:
- Web App: http://localhost:5199/
- Web Teacher: http://localhost:5200/
- ERP: http://localhost:8000/new-erp/index.html
- KruJob: http://localhost:8000/krujob/krujob-proto.html
- Web Landing/Learn: http://localhost:8000/web-app/prototypes/landing-page.html

> ปิดหน้าต่าง Terminal ที่เด้งขึ้น = server ดับ (เลิกใช้แล้วค่อยปิด) / ต้อง `npm install` ใน 2 โปรเจกต์ React ก่อนครั้งแรก

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

## 2026-09-24 (บ่าย) — ERP: เริ่ม Build Prototype ใหม่ `erp-v2/` จากผลเทส Staging

**ทำอะไร:**
- สรุปผลเทสทั้งหมดเป็น Sheet → `new-erp/NockERP-Staging-Test-2026-09-24.xlsx` (89 ข้อ ไทย+อังกฤษ มีคอลัมน์ข้อแนะนำ/สถานะ Dev)
- เจ้าของสั่งเริ่ม build → สร้าง `erp-v2/` = **Next.js 16 + TypeScript + Tailwind v4 + shadcn/ui (base-nova) + zustand** mock data ไม่มี backend
- กฎธุรกิจแยกเป็น pure function ใน `erp-v2/src/domain/rules/` + **22 regression tests** (1 test = 1 บั๊กที่เจอบน staging)
- เสร็จแล้ว: App shell (สิทธิ์ตาม role) · หน้า "วันนี้" · ปฏิทิน 4 มุมมอง + สร้างคลาสจากช่องว่าง · Session sheet (เช็คชื่อ/สรุป/อนุมัติ) · Billing ครบวง (ร่าง→PDF→อนุมัติ→ส่ง→รับเงิน→ยืนยัน→ใบเสร็จ+เข้าคลาส)
- ทดสอบในเบราว์เซอร์แล้ว (สลับ Director/Admin ผ่านโหมดสาธิต + เลื่อนเวลา) — ตารางแก้บั๊ก → `erp-v2/CLAUDE.md`

**ตัดสินใจ (สำคัญ):**
- ใช้ Next.js ตาม Dev (แผนเดิมแนะนำไว้) · Select ใช้ native `<select>` (ใช้บน iPad ได้ดี)
- Day view แบ่งตาม "ห้อง" เป็นค่าเริ่มต้น (มีเลน "ยังไม่มีครู/ยังไม่ระบุห้อง" เสมอ) · เลขใบแจ้งหนี้ออกตอนสร้าง PDF (`INV-สาขา-ปปดด-0001`), ใบเสร็จ `RC-…`
- สมมติฐานที่ต้องให้เจ้าของยืนยัน: โควตาลา = 1 ครั้งต่อ 4 คาบ · สิทธิ์อนุมัติใบแจ้งหนี้/สรุป = Director/Manager/Admin · ครูเห็นเฉพาะคาบตัวเอง

**เหลือทำ (TODO):**
- [ ] หน้าที่ยังเป็น placeholder: คาบเรียน, สรุปการเรียน, คลาส, นักเรียน, ครอบครัว, บุคลากร, คอร์ส&ราคา, รายงานเข้าเรียน, ตั้งค่าสาขา, แจ้งเตือน
- [ ] ให้เจ้าของยืนยัน 15 ข้อ "Business rule" ใน Sheet

---

## 2026-09-23 — ERP: ตรวจ Staging ของ Dev ครบทุกหน้า + เทสลึก (เตรียม build ใหม่ให้ตรง Dev)

**ทำอะไร:**
- เข้า `https://erp-staging.nockacademy.com` (Director) ไล่ทุกเมนู/ฟอร์ม/dialog + สร้างข้อมูลทดสอบในสาขาแยก **TEST-Branch** แล้วเทส flow จริง
- รายงานเต็ม → **`new-erp/STAGING-AUDIT-2026-09-23.md`** (โครงระบบที่ Dev ทำ + บั๊ก/จุดด้อยเรียงตามความรุนแรง + รายการข้อมูล TEST ที่สร้างไว้)

**ข้อสรุปสำคัญ:**
- Dev ใช้ **Next.js + React + Tailwind + Clerk** (ไม่ใช่ HTML ล้วนแบบ prototype เรา) · ทำไปแล้ว 11 เมนู · Dashboard/CRM/Inbox/Tasks/Reports/Logs ยังไม่มี · Finance ทั้งระบบยังไม่มี
- บั๊กหนักสุด: Generate PDF ค้างตลอด (flow เงินเดินไม่ได้), ช่วงเรียนคอร์สคำนวณ 0 ชม., เช็คชื่อ session อนาคตได้ + สถานะ session เพี้ยน, ยอด invoice ไม่ตรงกันระหว่าง detail/edit/PDF

**เหลือทำ (TODO):**
- [ ] ตัดสินใจ: build ใหม่ด้วย stack ไหน (แนะนำ Next.js ให้ตรง Dev) + ขอบเขต (11 เมนูก่อน หรือรวมโมดูลที่ Dev ยังไม่ทำ)
- [ ] ส่งรายงานให้ Dev · ลบ/ปิดข้อมูล TEST-Branch บน staging เมื่อ Dev ดูเสร็จ
- [x] ~~เทส Billing ครบวง~~ ✅ (หลัง Dev แก้ Database) → ผลอยู่ใน audit หัวข้อ 2.5
- [ ] เทส Class/Session/Attendance/Summary/Calendar → **`new-erp/TEST-MATRIX-SCHEDULING.md`** (2026-09-24: **39/40** · D7 ✅, D4 ✅/⚠️ Director แก้+อนุมัติเองได้ทั้งวง, E3 ✅/🔴 Day view ซ่อน session ไม่มีครู/ครูถูกลบ) · เหลือ E4 ต้องขออนุญาตดาวน์โหลด · A6 toast ซ้ำ
- [x] ~~Billing retest~~ (24 ก.ย. บ่าย) → audit หัวข้อ **2.5.1**: C1 PDF ✅ แก้แล้ว (Retry ได้), C2 ช่วงเรียน ✅ แก้แล้ว แต่สรุป '5 sessions · 10 hrs' ผิด, H4 ติดลบ 🔴 ยังอยู่, H5 ค่ารถ auto 🔴 ยังอยู่ · Calendar → matrix E4–E7: 🔴 Day view ซ่อน session ไม่มีครู/ครู UUID, 🔴 Summary 'Week' แสดง 3 สัปดาห์ + ไม่ flag session ชนกัน
- [x] ~~เทสสิทธิ์ Role Teacher~~ ✅ → หัวข้อ G ใน test matrix (🔴 Teacher เข้า Billing เต็มสิทธิ์ · 🔴 สลับเป็น Director เองเมื่อมี session ค้าง)
- [ ] Business rules ใหม่จาก Dev (pro-rate รายเดือน 100/60/30%, Concession + remark) บันทึกใน `new-erp/REBUILD-PLAN.md` แล้ว
- [ ] **แผนหลังเทสครบ:** สรุปปัญหาราย Flow → จัดลำดับความสำคัญ → ออกแบบการปรับปรุง (โดยเฉพาะ UI/UX ให้ใช้ง่ายขึ้น) → ทำ prototype หน้าที่ปรับ → ส่ง Dev

---

## 2026-09-16 — Web App: สร้างหน้า Landing (React) ตาม Ref Figma

**ทำอะไร:**
- เติมหน้า `web-app/app` route `/landing` (เดิมเป็น stub) ให้เต็มทั้งหน้า → `src/pages/marketing/Landing.tsx`
- 9 ส่วนตาม Ref (`Landing Page.png`): Hero → ผลตอบรับ → Live → Course/ราคา → ฟีเจอร์ → วิชา → คนญี่ปุ่น → App CTA → Footer
- reuse ของเดิม: `DesktopNav`, `AppShowcase`, `MarketingFooter`, design tokens; ตารางราคาดึงราคาจริงจาก `data/packages.ts`, วิชาจาก `data/learn.ts`

**ตัดสินใจ (สำคัญ):**
- **Hero ใช้ static image ก้อนเดียว** (`assets/Landing/Full Hero.png` → ย่อเป็น `app/src/assets/landing/hero-visual.png` transparent 2400px) วางบนพื้น `#FFF1F2`
  → เลิกวิธีให้ Claude จัดวางเลเยอร์ย่อยเอง (พังง่าย + กิน credit) เปลี่ยนเป็น "โครง HTML + static image" แทน
- แนวทางต่อไป: section อื่นถ้าต้องเป๊ะตาม Ref → export เป็นรูปแล้ววางแบบ static เหมือน Hero
- source asset Figma เก็บใน `web-app/assets/Landing/` (มี layer ย่อย + Full Hero)

**เหลือทำ (TODO):**
- [ ] จูน section ที่ยัง mock เอง (ผลตอบรับ/Live/ตารางราคา) ให้ตรง Ref — รอ asset รูป
- [ ] เนื้อหา mock ที่ต้องแทนด้วยของจริง: testimonial, ตารางไลฟ์, ข้อความ chat, สาขาญี่ปุ่น

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
