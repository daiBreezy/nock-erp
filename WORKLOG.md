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

## 2026-09-25 (ต่อ) — ERP: รีดีไซน์ฟอร์ม Test/Trial — เลือก time slot + อนุมัติ = จองคาบจริง + รีวิวในแชท

**ทำอะไร:** สร้างใหม่ทั้งกระบวนการ "ส่งฟอร์ม Test/Trial" ตามที่เจ้าของขอ 3 อย่าง:
1. **Admin เลือก time slot ตอนส่งฟอร์ม** — เลือกวิชา → ช่วงวันที่ → เห็น slot ผสมกัน (เวลาว่างทั่วไป + เวลาคลาสจริงที่มีอยู่ ป้าย "คลาสเดิม") → เลือกได้หลายอัน → เพิ่มวิชาอื่นได้ → ส่ง ผู้ปกครองเห็น slot ที่เลือกไว้ใน LIFF แล้วเลือกแค่ 1 อัน (ไม่ใช่พิมพ์เวลาเอง)
2. **กด "อนุมัติ" = จองคาบจริงในปฏิทิน** ผ่าน engine ตรวจชนกันตัวเดียวกับที่ใช้ทั้งระบบ (`validateClass`) — เลือก slot จากคลาสเดิม → เข้าคลาสนั้นจริง (`addStudentToSession`); เลือก slot ว่างทั่วไป → สร้างคาบใหม่จริง (`addSession`, เพิ่งไปเสริม `isHoliday` + `now` check ที่ขาดไปให้ด้วย)
3. **รีวิวฟอร์มในแชท Inbox ได้เลย** — ข้อความฟอร์มเป็น bubble พิเศษ (`kind: "form_request"/"form_submission"`) มีปุ่ม อนุมัติ/แก้ไข/ปฏิเสธ ในตัว ไม่ต้องเปิด LeadSheet แยก (LeadSheet ก็ใช้ตัวเดียวกัน — logic อยู่ที่เดียว `src/lib/forms.ts` + `src/domain/rules/forms.ts`)

**ตัดสินใจสำคัญที่เจ้าของเลือกเอง:**
- Approve ผูกเข้าคลาส/สร้างคาบ**จริง**ผ่าน conflict engine (ไม่ใช่แค่บันทึกนัดหมายเฉยๆ) — งานใหญ่กว่าเดิมแต่เจ้าของยืนยันเอาแบบนี้
- ปุ่ม Edit = แก้ได้ทุกอย่าง (วัน/เวลา/วิชา) ไม่ใช่แค่เลือกใหม่จาก slot เดิมที่เสนอไป

**นักเรียน 1 คนต่อ Lead** — สร้างตอนอนุมัติครั้งแรก (`Lead.trialStudentId`) ใช้ซ้ำได้ทั้ง test/trial/สมัครจริง ไม่สร้างซ้ำ

**ทดสอบแล้วจริงในเบราว์เซอร์ (ไม่ใช่แค่ unit test):** ส่งฟอร์มจริงจาก Inbox → เห็น slot ผสม generic+คลาสเดิมถูกต้อง → submit ผ่าน API (แทนที่ LINE Login จริงเพราะเทสเองไม่ได้) → bubble ขึ้นในแชทจริง → Approve slot คลาสเดิม → นักเรียนเข้า roster จริงในคาบนั้นเลย → Approve slot ว่างทั่วไป → สร้างคาบใหม่จริงบนปฏิทิน (`trial:true`) → **ลองจองซ้ำที่ครู/เวลาเดิมอีกรอบ → engine บล็อกถูกต้องจริง** ("ครูโจ มีสอนชนเวลา") ไม่ปล่อยผ่าน → ลองปุ่ม Edit เปลี่ยนเวลาได้จริง ไม่ไปสร้างคาบซ้ำ

**Breaking change:** `FormToken`/`FormSubmission`/`ChatMessage` schema เปลี่ยน (bump persist version 13→14 — localStorage เดิมจะถูกล้าง reseed ใหม่ตามธรรมเนียมเดิมของโปรเจกต์) และ `.data/forms.json` เก่าเข้ากันไม่ได้ (ย้ายไปเป็น `.data/forms.json.pre-slotpicker.bak` แล้ว ไฟล์ใหม่จะถูกสร้างเองตอนใช้งานจริง)

**เหลือทำ:**
- [ ] ยังไม่ได้ทดสอบจริงจากมือถือผ่าน LIFF (ทดสอบผ่าน API แทน เพราะต้อง LINE Login จริงซึ่งเทสเองไม่ได้) — ควรลองส่งฟอร์มแล้วกดลิงก์จากมือถือจริงอีกรอบ
- [ ] `GENERIC_TIMES` (09:00/12:00/15:00/19:00) ยัง hardcode ไว้ใน `src/domain/rules/forms.ts` — ยังไม่ให้ตั้งค่าต่อสาขาได้
- [ ] Enroll/Billing form (ของเดิมที่ค้างไว้)

---

## 2026-09-25 — ERP: Dashboard/CRM/Inbox + เชื่อม LINE OA จริง + ฟอร์ม Test/Trial (LIFF)

**ทำอะไร (เรียงตามลำดับที่ทำ):**
- **Dashboard**: KPI (นักเรียน/รอต่อคอร์ส/รายรับเดือนนี้/ลีด) + renewal list + recent activity
- **CRM**: pipeline kanban ตาม stage เดิม (new→contacting→test→trial→payment_pending→enrolled/archived) + LeadSheet (โน้ต/เก็บเข้าคลัง/แปลงเป็นนักเรียน)
- **Inbox**: เดิมเป็น mock ล้วน → **ต่อ LINE Messaging API จริงแล้ว** (webhook รับข้อความเข้า + ส่งออกจริง) เก็บข้อมูลฝั่ง server เป็นไฟล์ (`.data/*.json`, gitignore แล้ว) เพราะ webhook handler แตะ localStorage ของ browser ไม่ได้
- **Settings → LINE Integration**: Channel ID/Bot Basic ID/Add-Friend URL/QR เก็บที่ branch (ไม่ลับ) — **Channel Secret/Access Token ต้องตั้งใน `.env.local` เท่านั้น** (ไม่มีปุ่ม Save ฝั่ง client เพราะไม่ปลอดภัย) มีปุ่มเช็คสถานะจริงจาก `/api/line/status`
- **ผูก LINE เข้ากับ Family/Lead**: จากบทสนทนา LINE จริงที่ยังไม่รู้จัก → ผูกกับที่มีอยู่ หรือสร้างใหม่ (prefill ชื่อจาก LINE) ได้เลยจาก Inbox — เก็บ `lineUserId` ไว้ที่ Family/Lead ถาวร (ไม่หลุดตอน sync)
- **ฟอร์ม Test/Trial ผ่าน LIFF**: ผู้ปกครองกรอกฟอร์มจริงในแอป LINE (รู้ตัวตนอัตโนมัติ ไม่ต้องเดา token) → staff กด "ส่งฟอร์ม" จาก LeadSheet → ผู้ปกครองกรอก → staff เห็น "รออนุมัติ" ใน LeadSheet → Approve = ขยับ stage อัตโนมัติ (อ้างอิง flow จาก `new-erp/js/crm-forms.js` + `crm-review.js` เดิม — ของเก่า "form.html" เป็นแค่ mockup ไม่เคยเขียนกลับจริง)

**ทดสอบแล้วจริงบนเครื่องนี้:** ส่ง/รับข้อความ LINE จริงสำเร็จ (LINE OA ทดสอบชื่อ "Nock Test" @907obckw ในบัญชี LINE Developers ของ daiBreezy) ผูก Family จากข้อความจริงสำเร็จ

**ตัดสินใจสำคัญ (ต้องรู้ก่อนทำต่อ):**
- erp-v2 มี **ชั้น server บางๆ แล้ว** (Next.js API routes + ไฟล์ JSON ใต้ `.data/`) — เกินขอบเขตเดิมที่ตกลงว่า "ไม่ต่อ Database จริง" นิดหน่อย แต่จำเป็นสำหรับ Inbox/Form ที่ต้องรับข้อมูลจากคนนอก (ไม่ใช่แค่ demo ในเบราว์เซอร์เดียว) — ยังไม่ใช่ Database จริง แค่ไฟล์ ไม่มี auth/schema
- ทดสอบผ่าน **localtunnel** (`npx localtunnel`) ชั่วคราว — URL เปลี่ยนทุกครั้งที่ restart ต้องอัปเดต Webhook URL ใน LINE Console ใหม่ทุกครั้ง (เจอ tunnel ตายเงียบมาแล้ว 1 ครั้งระหว่างทดสอบ) — **ถ้าจะใช้ต่อเนื่องจริงต้อง deploy จริง** (Vercel เป็นต้น) ไม่ใช่ tunnel
- ใช้ **LINE Login channel แยกต่างหาก** สำหรับ LIFF (ชื่อ "NockERP Forms") เพราะ LINE เปลี่ยนนโยบายแล้ว — เพิ่ม LIFF เข้า Messaging API channel ตรงๆ ไม่ได้อีกต่อไป
- **เลิกใช้ localtunnel เปลี่ยนเป็น `cloudflared` (quick tunnel, ฟรี ไม่ต้องสมัคร)** — เจอบั๊กจริง: localtunnel มีหน้า "Tunnel website ahead!" (ต้องพิมพ์ IP ยืนยันก่อนเข้า) โผล่ให้ browser จริงทุกตัวที่เข้าเว็บ (ผู้ปกครองเปิดลิงก์ผ่าน LINE ก็จะเจอหน้านี้ก่อน) — เจอตอนเทส `/liff/form` จริง จึงสลับ tunnel ทั้งระบบ (webhook + LIFF endpoint) ไปที่ `cloudflared` แทน ไม่มีหน้าเตือนแบบนี้

- **แก้บั๊กจริง: หน้า `/liff/form` โหลดค้างตลอด (spinner ไม่หยุด)** — เจอตอนเจ้าของลองกดลิงก์จริงจากมือถือ สาเหตุ: Next.js dev server บล็อก request ไป `/_next/static/*` (JS chunk รวมถึง `@line/liff` SDK) จาก origin ที่ไม่ใช่ localhost โดย default (เห็น warning "Blocked cross-origin request to Next.js dev resource" ใน log server) — พอ chunk โหลดไม่ได้ `import("@line/liff")` ค้างเงียบๆ ไม่ throw ด้วย ทำให้หน้าจอค้างที่ "กำลังเปิดฟอร์ม…" ตลอดไป → แก้ด้วยเพิ่ม `allowedDevOrigins: ["*.trycloudflare.com"]` ใน `erp-v2/next.config.ts` (ต้อง restart dev server ถึงจะมีผล เพราะเป็น config ไม่ hot-reload) → ทดสอบซ้ำแล้ว: หน้าเปิดผ่าน ไปถึงหน้า LINE Login จริงสำเร็จ (เห็นหน้า "Continue as daiBreezy" ของ access.line.me)

**เหลือทำ (TODO):**
- [x] ~~สร้าง LIFF app ใน LINE Console~~ ✅ เสร็จ (LIFF ID `2011740783-OinXaLm7` ใส่ใน `.env.local` แล้ว) — อัปเดต Endpoint URL + Webhook URL เป็น cloudflared URL แล้วทั้งคู่ verify ผ่าน
- [x] ~~บั๊ก LIFF โหลดค้าง~~ ✅ แก้แล้ว (ดูหัวข้อด้านบน) — ยืนยันผ่านถึงหน้า LINE Login จริงแล้ว แต่ยังไม่ได้กด Log in จนจบ (ตั้งใจเว้นไว้ให้เจ้าของกดเองจากมือถือจริง)
- [ ] ทดสอบฟอร์ม Test/Trial แบบ end-to-end จริงจากมือถือให้จบ (กด Log in → กรอกฟอร์ม → submit → staff เห็น "รออนุมัติ" ใน LeadSheet)
- [ ] cloudflared quick tunnel URL เปลี่ยนทุกครั้งที่ restart เหมือน localtunnel — ต้องอัปเดต Webhook URL + LIFF Endpoint URL ใน LINE Console ใหม่ทุกครั้งที่ restart เครื่อง/tunnel ตาย (ยังไม่ได้ทำ named tunnel แบบถาวร)
- [ ] Enroll/Billing form (ตามที่ตกลงไว้ว่าจะทำ Test/Trial ก่อน) — ต้องต่อกับ Billing จริงที่มีอยู่แล้ว (ไม่ใช่สร้าง invoice แยกแบบของเก่า)
- [ ] ผูก Student โดยตรง (ตอนนี้ผูกได้แค่ Family จาก Inbox แล้วต้องไปเพิ่มลูกที่หน้าครอบครัวแยก)
- [ ] Reports/Tasks/Logs (Phase 2 ที่เหลือ ตามลำดับเดิมใน log ก่อนหน้า)
- [ ] Settings UI ให้ครบ (แท็บวิชา&ระดับชั้น/ค่าธรรมเนียม/โปรโมชัน/System) — ค้างมาตั้งแต่รอบก่อน

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

**รอบ 2 (Calendar ตาม ref ของ Admin):** Day view แบบบอร์ดครู×ชั่วโมง โชว์รายชื่อนักเรียนในการ์ด · สีตามวิชา · สถานะการ์ด 6 แบบ (รอเริ่ม/กำลังเรียน/รอเช็คชื่อ/รอสรุป/เสร็จแล้ว/ยกเลิก) · Drag & drop + ถามเฉพาะคาบนี้/ทั้งหมดที่ตามมา · ครูหลายคน+ครูหลัก · จำลองคาบชนกันในข้อมูลตัวอย่าง (27 tests)

**รอบ 3:** ล็อกหัวครู/คอลัมน์เวลาใน Day view · โหมดเฉพาะที่มีคลาส · Side panel คาบ: เปลี่ยน/เพิ่มครู, เพิ่มนักเรียน, ดูรายละเอียดนักเรียน · สร้างครบทุกหน้า Phase 1 + logic เพิ่ม (วันหยุดยกเลิกคาบ+แจ้งเตือน, ปิดบัญชีครูต้องส่งต่อคาบ, LINE code ระดับครอบครัวหมดอายุ 7 วัน, validate ครอบครัว/นักเรียน/บุคลากร, ต่อคอร์สเริ่มวันถัดจากแพ็กเกจเดิม, เตือนลาเกินโควตา) · 32 tests

**รอบ 4 (หยุดกลางทางตามที่เจ้าของสั่ง — ประหยัด credit):**
- ✅ แก้ "ไม่มีแพ็กเกจครอบคลุม" ผิด → หาแพ็กเกจจากคลาส หรือวิชาเดียวกัน (คาบชดเชย/คาบเดี่ยว)
- 🟡 Settings ให้ครบเท่าของเดิม: **ทำไปแค่ชั้นข้อมูล+กฎ** (types: breaks, specialPeriods, fees, promotions, SystemSettings · rules: hoursFor/slotProblem, bestPromotion ใน invoiceTotals, lowBalanceAlert รับ threshold) — **ยังไม่มีหน้าจอ UI** และ seed ยังใส่ fees/promotions ว่าง
- เจ้าของถามว่า Inbox/CRM/Reports หายไปไหน → ไม่ได้ลบ: เป็น Phase 2 ยังไม่ได้สร้างใน erp-v2 · prototype เก่า `new-erp/` ยังอยู่ครบ 28 หน้า (มี CRM/Inbox/Reports/Finance ให้ดึงสเปก)

**ตัดสินใจ:** erp-v2 เป็น "แบบ" ให้ Dev ทำตาม (ทาง A) — **ไม่ต่อ Database จริง** · ระบบจริง/Staging/Production เป็นของ Dev

**เหลือทำ (TODO) — ลำดับที่ตกลงกับเจ้าของ:**
- [ ] 1. Settings UI ให้ครบ: แท็บ วิชา&ระดับชั้น · เวลาพัก+ช่วงเวลาพิเศษ · ค่าธรรมเนียม (ค่าแรกเข้า/หนังสือ/สอบ) · โปรโมชัน · System (เปิด-ปิดแจ้งเตือน 10 แบบ, threshold คาบใกล้หมด, วันเตือนต่อคอร์ส) + ใส่ข้อมูลตัวอย่าง fees/promotions ใน seed + แสดงโปรโมชันใน invoice editor/sheet
- [ ] 2. ใส่เมนู Dashboard/CRM/Inbox/Reports/Tasks/Logs กลับใน sidebar (ป้าย Phase 2)
- [ ] 3. Phase 2 ตามลำดับ: Dashboard → CRM (สเปก stage: new/contacting/test/trial/payment_pending/enrolled/archived จาก `new-erp/js/crm.js`) → Inbox (`new-erp/js/inbox.js`) → Reports → Tasks → Logs
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
