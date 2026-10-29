# WORKLOG — บันทึกข้อสรุปข้ามเครื่อง

> วิธีใช้: เครื่องไหนทำงานเสร็จ ให้จดสรุป "ทำอะไร / ตัดสินใจอะไร / เหลืออะไร" ไว้บนสุด (ใหม่สุดอยู่บน) แล้ว `git push`
> อีกเครื่อง `git pull` + อ่านไฟล์นี้ ก็ตามงานต่อได้ ถึงจะไม่เห็นแชทดิบ

---

## 2026-10-29 (ค่ำ) — erp-v2: สลิปเดียวจ่ายหลายใบแจ้งหนี้ (พี่น้อง) + ใบเสร็จรวม/แยก

**ตัดสินใจ (เจ้าของ 29 ต.ค.):** ใบแจ้งหนี้ยังแยกต่อนักเรียน · ผู้ปกครองโอนครั้งเดียว = สลิป 1 ใบเป็นหลักฐานให้หลายใบได้ · Admin เลือกเองว่าจะออกใบเสร็จรวมหรือแยก ใบไหนบ้าง

**ทำแล้ว:**
- `Payment.groupId` — แต่ละใบเก็บส่วนของตัวเอง + สลิป/เลขอ้างอิงเดียวกัน
- กฎ `billing.ts`: `canRecordGroupPayment` (≥2 ใบ · ครอบครัวเดียวกัน · สาขาเดียวกัน (บัญชีธนาคารเดียว) · อนุมัติแล้ว · ยอดสลิป = ยอดค้างรวมพอดี) · `paymentGroup` · `receiptNumbersFor` (ใบเสร็จรวมใช้เลขของใบแจ้งหนี้ใบแรก ที่เหลือใช้เลขตัวเอง — คงกฎ "เลขใบเสร็จ = เลขใบแจ้งหนี้") · `invoicesOnReceipt` · +3 tests (364)
- store: `recordGroupPayment` · `confirmPayment` ของสลิปกลุ่ม = ยืนยันทุกใบพร้อมกัน (เช็คสิทธิ์ทุกใบก่อน all-or-nothing, Force แจ้งครั้งเดียว) → ครบแล้วออก**ใบเสร็จรวมเป็นค่าเริ่มต้น** + ส่ง LINE ข้อความเดียว (`Msg.familyReceiptMessage`) · `setReceiptGrouping` จัดใหม่ภายหลัง
- หน้าใบแจ้งหนี้: ช่อง "จ่ายรวมกับใบของพี่น้อง (สลิปเดียว)" (ติ๊กแล้วเติมยอดรวมให้) · ป้าย "สลิปเดียวกับ INV… น้อง…" · หลังชำระครบ: "ใบเสร็จของสลิปนี้" ติ๊กใบที่รวม (ไม่ติ๊ก = แยก) → บันทึกการจัดใบเสร็จ
- ใบเสร็จ PDF: ใบรวมแสดงรายการทุกคน (นำหน้าด้วยชื่อเล่น) · REF = เลขใบแจ้งหนี้ทุกใบ · Memo อ้างเลขใบแจ้งหนี้ · ชื่อลูกค้า = ผู้ปกครองหลัก (ถ้าไม่มีชื่อออกใบกำกับภาษี)
- ✅ tsc · eslint · ลองในเบราว์เซอร์ครบวง (ใส่ใบทดสอบ 2 ใบให้ใบเตย+ภูผา → จ่ายสลิปเดียว → Force ยืนยัน → ใบเสร็จรวม → แยก → รวมกลับ → PDF) แล้วคืนข้อมูลเดิม

---

## 2026-10-29 (บ่าย) — erp-v2: รายชื่อซ้ำ (ระบบแนะนำ · Admin ตัดสิน) + เข้าคลาสตอนเพิ่มนักเรียน (Row 25)

**ตัดสินใจ (เจ้าของ 29 ต.ค.):**
- **Row 25 = ทำ** — เพิ่มนักเรียนแล้วเลือกคลาสได้ในขั้นตอนเดียว ขึ้นปฏิทินทันที (ยังไม่จ่ายเงิน = ระบบเตือนในคาบ)
- **Row 42 = ปิด** — Regional MGR ใช้ชิปสาขาที่มีทุกหน้าก็พอ (ปฏิทินคงรายสาขา)
- **รายชื่อซ้ำ = ระบบแนะนำ Admin ตัดสินใจ** (รวม / แยก) — เคสหลัก: import ข้อมูลครั้งแรก, นักเรียนกลับมาเรียนใหม่ (ข้อมูลเดิมยังอยู่), Admin ใหม่เพิ่มซ้ำ
- **แชทนี้ (เครื่องนี้) คุยแค่ ERP v2**

**ทำแล้ว:**
- กฎ `findStudentDuplicates` / `findFamilyDuplicates` / `sameName` ใน `domain/rules/people.ts` (+4 tests): นักเรียน = ชื่อ-นามสกุลเหมือน (ไม่สนคำนำหน้า/ช่องว่าง) · ชื่อเล่น + วันเกิด · ชื่อเล่น + ครอบครัวเดียวกัน · ชื่อเล่น + เบอร์ผู้ปกครองตรง (รวมคนที่ออกไปแล้ว) · ครอบครัว = เบอร์ (ทุกฟอร์แมต) / LINE / ชื่อครอบครัว+ที่อยู่ · พี่น้องคนละชื่อเล่นไม่นับซ้ำ
- **เพิ่มนักเรียน:** พบซ้ำ → หน้าต่าง "พบนักเรียนที่อาจซ้ำ" (เหตุผลเป็นชิป) → **รวม** = ใช้รายชื่อเดิม (ออกไปแล้ว = กลับมาเรียน + เติมข้อมูลที่กรอก) / **แยก** = เพิ่มใหม่ · ช่องทางที่มาบังคับเฉพาะตอนเพิ่มใหม่จริง (`components/app/duplicate-dialog.tsx`)
- **เพิ่มครอบครัว:** เหมือนกัน — รวม = ใช้ครอบครัวเดิม + เพิ่มผู้ปกครองที่ยังไม่มี + เติมที่อยู่ที่ว่าง
- **อนุมัติฟอร์ม LINE** (Test/Trial ใน Inbox + ใบสมัครเรียน): เดิมรวมเข้าครอบครัวที่เบอร์/LINE ตรงให้เอง → ตอนนี้ต้องเลือก "รวม — ใช้ครอบครัวนี้ / ไม่ใช่ — สร้างครอบครัวใหม่" (`FamilyMatchChoice`, store `opts.newFamily`)
- **Row 25:** ฟอร์มเพิ่มนักเรียน › "เข้าคลาส (ไม่บังคับ)" — รายการคลาสของสาขา (ชั้นที่ตรงขึ้นก่อน, เลือกหลายคลาสได้, คลาสที่ไม่มีคาบข้างหน้ากดไม่ได้) → บันทึกแล้วเข้าคลาสตั้งแต่คาบถัดไป (`addStudentToSession` scope following) · รวมกับรายชื่อเดิมก็เข้าคลาสให้ด้วย
- +คำแปล EN/JA ครบ · ✅ tsc · 359 tests · ดูในเบราว์เซอร์แล้ว (หน้าต่างซ้ำขึ้นตอนเพิ่ม "ก้อง มั่นคง" ซ้ำ — กดยกเลิก ไม่ได้บันทึก)

**ปิดคำถาม grill (29 ต.ค. เย็น):**
- **Lead ฟอร์มหลายวิชาคนละวัน** (เจ้าของ: ยังเป็น Lead จนกว่าจ่ายเงิน) → Lead ขยับเป็น "สอบแล้ว/ทดลองเรียนแล้ว" เมื่อเด็กมาครบ**ทุกวิชา**ของฟอร์ม (เดิมขยับตั้งแต่วิชาแรก) — `Forms.allAssessmentsAttended`
- **วันนัดสอบ/ทดลองใน Assessment** (ผมตัดสินเอง — เรื่องเทคนิค) → ย้าย/แก้คาบแล้ววันในบันทึกผลตามคาบใหม่ (`Forms.assessmentsFollowSessions` ใน `editSession`/`moveSession`) · +2 tests (361)

**ยังค้าง (จุดเล็ก):** (token mint ก่อนเช็ค env, 2 คลาสเวลาเดียวกัน approve ไม่ได้, แยก LINE/mock ด้วย id prefix, submission ต้อง pull เอง)

---

## 2026-10-29 — สถานะ Feedback sheet (ERP-test-feedback) + เคลียร์ของค้าง

> เครื่องนี้ pull งาน Feedback ของ 28 ต.ค. มาแล้ว (Row 12,16,34,35,36,41,44,48,49,50,51) — รอบนั้นไม่ได้จดลง WORKLOG เลยจดสถานะทั้งชีตไว้ที่นี่
> ⚠ pull แล้วมี package ใหม่ → ต้อง `npm install` ใน `erp-v2` (และ `web-app/app`) ก่อนรัน ไม่งั้นหน้าที่ใช้ `recharts` พัง

**ทำวันนี้ (erp-v2):**
- **Row 42 (Regional Manager ดูหลายสาขา):** Dashboard มีชิปสาขาแล้ว (สาขานี้ / ทุกสาขา / ภูมิภาค / ธุรกิจ / รายสาขา) — ตัวเลข งาน และ Overview สัปดาห์/เดือน ตามที่เลือก · หน้ารายการทุกหน้ามีอยู่แล้ว · **ยังไม่มี:** ปฏิทิน · รถรับส่ง · Inbox (ปฏิทินผูกห้อง/ครูต่อสาขา — เสนอให้คงรายสาขา สลับที่ sidebar)
- **Row 32 / 18:** ปฏิทินแสดงถึง 22:00 (เดิม 21:00) · ช่องเวลาตอนสร้างคลาสพิมพ์เวลาไหนก็ได้อยู่แล้ว
- **Row 43 (First timer):** ป้าย "ใหม่" ในคาบมีคำอธิบาย hover = คาบแรกที่มาเรียนกับเรา
- **Lead สนใจหลายวิชา** (ค้างจาก 12 ต.ค.): `Lead.subjects[]` (ตัวแรก = `subject`) · `leadSubjects()` ใน rules/crm.ts · ฟอร์ม Lead เลือกได้หลายวิชา (chip) · ตาราง/Kanban/หัว Lead panel แสดงครบ (คอลัมน์วิชาในตารางไม่แก้ในตารางแล้ว — แก้ที่ panel)
- placeholder ฟอร์ม Lead ตามกฎชื่อ/เบอร์ · +คำแปล EN/JA 2 ข้อความ · ✅ tsc · 355 tests

**สถานะ Feedback ที่ชีตยังเป็น FALSE:**
| Row | เรื่อง | สถานะใน erp-v2 |
|---|---|---|
| 12, 16, 34–36, 41, 44, 48–51 | (ทำแล้ว 28 ต.ค.) | ✅ |
| 25 | กรอกนักเรียนแล้วเลือกคาบที่มีอยู่ → เข้าปฏิทินทันที | ✅ (29 ต.ค. บ่าย) |
| 32 | สร้างคลาสได้ถึง 20:00 | ✅ (วันนี้) |
| 33 | Liclass ค่าคงที่ต่อคอร์ส (Mirai 180) | ✅ มี `Course.courseFee` ใส่ในใบให้เอง |
| 37 | ปุ่มไม่ใช้รถในใบแจ้งหนี้ | ✅ มีปุ่ม "ไม่ใช้รถ" แล้ว |
| 38, 39, 40 | เวลาเรียนโผล่ก่อนจ่าย / เตือน subscription ทั้งที่ไม่มีใบ / error ตอนสร้างใบ | ⚠ บั๊กของ Staging (Dev) — erp-v2: เข้าคลาสหลังจ่าย, ไม่มีเตือนแบบนั้น |
| 42 | Regional Manager ดูหลายสาขาทุกโมดูล | ✅ ปิด (เจ้าของ: ชิปสาขาที่มีพอแล้ว) |
| 43 | First timer หมายถึงอะไร | ✅ (วันนี้) |
| 45 | ปฏิทินแสดงชื่อเล่น + ชั้น | ✅ บอร์ดแสดงชื่อเล่น + ชั้นอยู่แล้ว |
| 46 | แก้/ลบโน้ตในคลาส | ✅ (15 ต.ค. — Note ถาวร/ชั่วคราว แก้/ลบได้) |
| 47 | ย้ายวันเรียนประจำถาวร (พ. → พฤ.) | ✅ มีแล้ว: เปิดคาบ › ย้ายวัน › ย้ายคลาสถาวร |

**ค้าง / ถามเจ้าของ:** Row 25 · ปฏิทินหลายสาขา (Row 42) · คำถาม grill 28 ต.ค. (ด้านล่าง) · web-app: สีวิชาบน Landing, โรงเรียนญี่ปุ่น, ลิงก์ Liclass
- เรื่อง "ผู้ปกครองมีลูกหลายคนใน CRM" ปิดแล้ว — ตัดสินใจ 19 ต.ค.: Lead แยกต่อเด็ก ผูกครอบครัวเดียวกัน (siblingLeadId)

**web-app:** ลบ `src/assets/landing/hero-visual.png` (ไม่ได้ใช้) · Nav กว้าง 1200px เท่า section · `git stash` ว่างแล้ว (ของค้างเครื่องที่ทำงานไม่มีแล้ว)

---

## 2026-10-28 — erp-v2: แก้บั๊ก Form approval (all-or-nothing + idempotent) จากการ grill

**ที่มา:** ลองใช้สกิล grill (plugin "Skills For Real Engineers" ของ Matt Pocock) ซักฟีเจอร์ Form ของ erp-v2 ทั้ง flow/validation + ความเชื่อมโยงข้อมูล + edge cases → เจอบั๊กจริง 2 จุดในขั้นตอน approve ฟอร์ม Test/Trial แล้วแก้รอบนี้

**ทำอะไร (`erp-v2/src`):**
- **บั๊ก 1 — Partial booking (orphan session):** เดิมใน `store.approveTestTrialSubmission` ฟอร์มหลายวิชาคนละเวลา จองทีละ pick แล้ว `set` ทันที ถ้า pick หลัง fail (ครู/ห้องถูกจองไประหว่างที่ parent ถือลิงก์) → คาบของ pick แรกค้างในปฏิทิน แต่ไม่มี Assessment/ไม่ advance lead → เพิ่ม pure `planApproval()` ใน `domain/rules/forms.ts` validate **ทุก pick** ก่อน (กฎ block เดียวกับ `addSession`/`addStudentToSession`; pick generic ตัวหลังเห็นตัวก่อนหน้า กันแย่งครู/ห้องกันเอง) store จะไม่สร้างอะไรเลยถ้าแผนไม่ผ่าน + มี session rollback กัน commit พลาดกลางคัน
- **บั๊ก 2 — Re-approve ซ้ำ = ข้อมูลซ้ำ:** `approveSubmission` (lib) จอง store ก่อน แล้วค่อย POST review ถ้า POST fail submission ค้าง "pending" → กด approve ซ้ำได้ Student/Session/Assessment ซ้ำ → เพิ่ม `submissionId` ลง `Assessment` + pure `priorApproval()` ถ้าเคยอนุมัติแล้วคืนผลเดิม (no-op) ให้ caller re-POST ไป reconcile server
- **test:** +5 เคสใน `rules.test.ts` (holiday ล้มทั้งแผน, ทุก pick ผ่าน, pick ชนล้มทั้งแผน, รวม 2 ชม., idempotent) · **i18n:** +EN/JA 4 ข้อความใหม่ใน `lib/i18n-dict/auto.ts` (ตามกฎแปลทุกหน้า)
- ✅ `tsc --noEmit` + `npm test` (352 ผ่าน) · commit `3b8a35c` push ขึ้น origin/main แล้ว

**เหลือทำ (คำถาม product จาก grill — ยังไม่ได้แตะ):**
- [ ] เด็กคนเดิมที่มีหลาย Lead (sibling leadId:null) เกิด Student ซ้ำได้ (`trialStudentId` ผูก 1 Lead = 1 Student) — ใครรวมร่าง?
- [x] (29 ต.ค.: ระบบแนะนำ Admin ตัดสิน รวม/แยก) `matchExistingFamily` จับคู่ด้วยเบอร์พ่อแม่คนไหนก็ได้ → เสี่ยง false-merge (ญาติใช้เบอร์เดียว) / ซ้ำ (พิมพ์เบอร์ต่างฟอร์แมต) — ควรให้แอดมินยืนยันก่อน merge ไหม
- [x] (29 ต.ค.: ตามคาบเมื่อย้าย) `Assessment` store `date`/`start` เป็นสำเนา ขัดกฎ "derive ไม่ store" — ตั้งใจเป็น snapshot วันนัด หรือหลุด?
- [x] (29 ต.ค.: ขยับเมื่อมาครบทุกวิชา) lead stage กับฟอร์มหลายวิชาคนละวัน (`scheduledAt` = คาบแรก; attended เกิดตอนเช็คชื่อวิชาแรก แล้ววิชาที่ค้าง?)
- [ ] จุดเล็ก: token mint ก่อนเช็ค env (orphan token), 2 คลาสจริงเวลาเดียวกัน approve ไม่ได้, แยก LINE/mock ด้วย `id.startsWith("line_")` (ควรมี field channel), submission ต้อง pull เองถึงเห็น

---

## 2026-10-28 (บ่าย) — Web App: Landing Hero แยกชั้น + Parallax, Live สว่าง, ฟอนต์ Montserrat

**ตัดสินใจ (เจ้าของ):**
- ฟอนต์อังกฤษ/ตัวเลข = **Montserrat** · ไทย = Noto Sans Thai (`tailwind.config.js` `fontFamily.sans` + import บรรทัด 1 ของ `index.css` น้ำหนัก 400–800)
- Hero: ภาพแยกชิ้นลอยแยกกัน · เมฆ + วิดีโอ + Quiz + Chat ขึ้นเร็วกว่า Tablet ตอน scroll (ความเร็วไม่เท่ากัน) · ขอบล่าง Section วิ่งขึ้นบังรูป · ไม่มีปุ่มใน Hero · พื้น = ท้องฟ้ายามเช้า (แบบ A)
- Live section กลับเป็นโทนสว่าง (แบบ A: ชมพู → พีช → ม่วงอ่อน + แสงฟุ้งลอย) · ไม่มีเส้นแบ่ง Section บน Landing

**ทำอะไร (`web-app/app`):**
- **Hero แยกชั้น:** 15 ชิ้นใน `public/landing-hero/*.webp` (Tablet, ครูดาว + เงา, Live Quiz, Chat, วิดีโอ 5, เมฆ 5 ก้อนที่ตัดแยกจากไฟล์เมฆรวม) · ตำแหน่ง % หาโดยสคริปต์เทียบกับ `web-app/assets/Landing/Full Hero.png` (OpenCV, ไม่ได้เก็บใน repo) — Chat วางมือ (ไฟล์สัดส่วนไม่ตรงรูปรวม) · ตั้งค่าที่ `HERO_LAYERS` ใน `Landing.tsx` (`float` / `dur` / `delay` / `rise`)
- **Parallax ลื่น:** ใช้ CSS scroll-driven animation (`.hero-rise` ใน `index.css`, `animation-timeline: scroll()`) — เดิม JS ขยับช้ากว่า scroll 1 เฟรม = กระตุก · เบราว์เซอร์ไม่รองรับ → JS fallback · `--hero-k` ย่อการขยับบนมือถือ · ทั้งภาพช้ากว่าหน้า `--rise: -0.16`
- **Live (Landing):** วิดีโอ = คลิปวน 11 วิจาก Production (`api.nockacademy.com/upload/schedule/file1789727990.mp4`, ~10 MB, ลิงก์ตรง) · แชทพิมพ์ส่งได้ (ข้อความขึ้นขวา แบบ Production) · list hover ได้แต่กดไม่ได้ · กระดิ่งไม่มีพื้น · หัว: ป้าย Live + ข้อความซ้าย / ปุ่มขวา
- **แชทหน้าไลฟ์ (Web + App):** `components/watch/LiveChatPanel.tsx` แบบเดียวกับ Landing (สะอาดแบบแชท AI, ส่งได้, ตัดปุ่มอีโมจิ)
- **Course:** การ์ดกว้างขั้นต่ำ 184px (ชื่อคอร์สบรรทัดเดียว) เลื่อนแนวนอนเมื่อไม่พอ · Hover = ลอย + เงา + ขอบเข้มตามสีการ์ด
- **Hero อื่นๆ:** แถบเหลือง "ออนไลน์" อยู่หลังตัวอักษร (`isolate` + `-z-10`) · ระยะล่างตัดพื้นใสด้วย `-mb-[8.5%]`
- ✅ `tsc -b`, `oxlint` · ดูในเบราว์เซอร์แล้ว (Desktop + มือถือ)

**เหลือทำ:**
- [x] `src/assets/landing/hero-visual.png` (ลบแล้ว 29 ต.ค.) (ภาพ Hero ก้อนเดียวเดิม) ไม่ได้ใช้แล้ว — ลบได้
- [ ] ลิงก์ Liclass School (`LICLASS_URL`) รอเจ้าของส่ง · ~~Nav กว้าง 1280px~~ ปรับเป็น 1200px แล้ว 29 ต.ค.

---

## 2026-10-28 — Web App: Landing (โรงเรียน · ไลฟ์สด) + หน้าสาขา + ความโค้งการ์ด

**ตัดสินใจ (เจ้าของ):**
- เมนู "โรงเรียน" **เอาออกจาก Nav** · Landing มี section โรงเรียน 2 ฝั่ง: ซ้าย **Liclass School** (คนญี่ปุ่น — ลิงก์จะส่งมาทีหลัง) | ขวา **NockAcademy School** → `/school`
- หน้าสาขาเรียง: Header → ติวเตอร์ → คอร์ส → (ตารางเรียน **ซ่อน** รอดึงจาก ERP) → แผนที่และเวลาทำการ → บรรยากาศห้องเรียน → Facebook (2 โพสต์) · **ตัด** ผลสอบ & รีวิว · ติดต่อ = **LINE อย่างเดียว** (ปุ่มใต้เวลาทำการ + FAB) · Header ไม่มีปุ่มไอคอนติดต่อ
- ความโค้งการ์ดทั้งเว็บ **24px คุมที่เดียว** (`tailwind.config.js` `borderRadius.card` → class `rounded-card`) · Thumbnail/ตัวเล่นวิดีโอคง 16px
- Live section บน Landing = Hook หลัก

**ทำอะไร (`web-app/app/src`):**
- **Landing › โรงเรียน:** การ์ดขาวบนพื้นขาว รูปพื้นหลังครึ่งขวาจางเข้าขาว (Liclass = รูปห้องเรียนญี่ปุ่น Unsplash ชั่วคราว, NockAcademy = รูปสาขาพาราไดซ์ พาร์ค) · ลิงก์ Liclass ใส่ที่ `LICLASS_URL` ใน `Landing.tsx` (ว่าง = "เร็วๆ นี้" กดไม่ได้)
- **Landing › ไลฟ์สด:** พื้นไล่สีเข้มไหลช้าๆ (`.live-flow` / `.live-drift` ใน `index.css`) · หัว: ป้าย Live + ข้อความ ซ้าย / ปุ่ม "เข้าดูไลฟ์ตอนนี้" ขวา · ซ้าย = วิดีโอ + (ไลฟ์สดวันนี้ แบบ Figma: thumbnail · Live Now!/เวลา · ครู • ชั้น · กระดิ่ง | เอกสารประกอบการเรียน) · ขวา = แชทสดแบบสะอาด (ไม่มีเส้นคั่น, ช่องพิมพ์โค้ง) — ตาราง/เอกสารเป็นข้อมูลตัวอย่าง
- **ขอบ section เท่ากัน:** ทุก section ใช้กล่อง 1200px · รูปแอปใน AppShowcase ชิดซ้าย · (Nav ยังกว้าง 1280px — ยังไม่ได้ปรับ)
- **Footer:** Copyright แยกเป็นแถบล่าง (สูง `h-14` — เจ้าของถามวิธีปรับเป็น 32px = `h-8`)
- **หน้าสาขา:** รูป Header เลื่อนดูได้ถ้ามีหลายรูป (ลูกศรไอคอนอย่างเดียว + จุด) · กดรูปบรรยากาศ = Lightbox พื้นดำ 95% เลื่อนทีละรูป กดที่ว่าง/X/Esc ปิด · แผนที่ซ้าย + เวลาทำการ (list ไม่มีกรอบ) ขวา · `ContactFab` ช่องทางเดียว = ปุ่มเป็นลิงก์ตรง · ลบ emoji ในโพสต์ตัวอย่าง
- ✅ `tsc -b`, `oxlint` · ดูในเบราว์เซอร์แล้ว (Desktop + มือถือ)
- ⚠️ แก้ `tailwind.config.js` แล้วต้องรีสตาร์ท dev server หน้าเว็บถึงเปลี่ยน

---

## 2026-10-27 (บ่าย) — Web App: ภาพปกข้อสอบ, Section เด่น, Search/Filter, Landing ผลตอบรับ + ฟีเจอร์

**ตัดสินใจ (เจ้าของ):**
- Search / Filter **ทั้งระบบ** แบบเดียวกัน: Search ซ้าย (ไม่กว้างเต็มแถว) · Filter เป็น Dropdown 2 ตัว **วิชา + ชั้นเรียน** อยู่ขวา · ใช้ shadcn ทั้งหมด
- Landing › ผลตอบรับ + ฟีเจอร์ **ใช้เนื้อหา/รูปตาม Production** (nockacademy.com) ไม่แต่งเอง
- ฟีเจอร์ของเรา ใช้การ์ดแบบ "How it works" (การ์ดปักหมุด เอียงสลับ + เส้นประเชื่อม) ใส่รูป iPad · ไม่มีเลขลำดับ · เส้นประนิ่ง · พื้น #FFFFFF

**ทำอะไร (`web-app/app/src`):**
- **ภาพปกชุดข้อสอบ:** illustration abstract ฟรีจาก Unsplash 12 รูป (มีรูปที่เจ้าของเลือก "red rectangle and blue circle") เลือกตาม id ชุดข้อสอบ → ชุดเดิมได้รูปเดิม · โหลดไม่ขึ้นวาดรูปทรง SVG แทน → `components/AbstractThumb.tsx` · ใช้ใน LearnHub, ห้องสอบ Web/App, รายการห้องสอบ App Tablet แนวนอน
- **LearnHub › Set your Goal! / ห้องสอบ:** เป็นแผงสีเข้ม (Goal = ชมพูแบรนด์→ส้ม, ห้องสอบ = คราม→ม่วง) + การ์ดขาวด้านใน ให้แยกจากแถววิดีโอชัด → `FeatureBand` ใน `web/pages/LearnHub.tsx`
- **Search + Filter:** `components/SearchFilter.tsx` (`SearchInput` · `FilterSelect` = shadcn `Select` · `FilterBar` · ตัวเลือก `SUBJECT_FILTER` / `GRADE_FILTER` ป.1–ม.6 · `gradeMatches` รองรับช่วง "ม.1-3") → LearnHub (กรองแถวไลฟ์ย้อนหลังจริง), ห้องสอบ Web + App (ตัดตัวกรอง ช่วงสอบ/เรียง/สถานะ ที่เดิมไม่ได้กรองอะไร), ห้องสอบ App Tablet, FAQ, ค้นหาเพื่อน · ไม่ได้แปลง: chip วิดีโอที่เกี่ยวข้อง (แบบ YouTube) และ chip เลือกวิชา/เวลาในห้องการบ้าน (เป็นการเลือก ไม่ใช่ตัวกรอง)
- **Landing › ผลตอบรับจากผู้ใช้งานจริง:** โปสเตอร์ "น้องผู้ผ่านการสอบคัดเลือก" 23 ใบ ดาวน์โหลดจาก Production → `public/testimonials/` (ลิงก์ `_astro/` ของ Production เปลี่ยนทุก build) · shadcn **Carousel** (`components/ui/carousel.tsx`, ติดตั้ง `embla-carousel-react` + `embla-carousel-autoplay` 8.6.0) เลื่อนเองทุก 3.5 วิ · วิดีโอ YouTube `wbHOA5RZeaM` (น้องพราว) แสดงปก + ปุ่ม Play กดแล้วค่อยโหลด · ตัดรีวิวแต่งเอง 4 ใบ
- **Landing › ฟีเจอร์ของเรา:** 5 ฟีเจอร์ตาม Production (ไลฟ์สดทุกวัน · 4000+ คลิป · ห้องสอบ · แบบทดสอบ · ห้องเรียนไม่จำกัดวิชา) + รูป iPad จาก Production → `public/features/` + การ์ดเตี้ย "และ Feature อื่นๆ อีกมากมาย" · `components/ui/how-it-works.tsx` ปรับจาก prompt: Tailwind 3, ไม่ใช้ `motion`, วัดตำแหน่งการ์ดจริงวาดเส้น · จอ ≥1280 = 3 คอลัมน์เรียงแบบงู · 768–1279 = ซ้าย/ขวาสลับ · มือถือเรียงลง
- ✅ `tsc -b`, `oxlint` · ดูในเบราว์เซอร์แล้ว (Desktop + มือถือ)

**เหลือทำ (TODO):**
- [ ] Landing ที่ยังต่างจาก Figma/Production: ไลฟ์สด (หัวชิดซ้าย + การ์ดเอกสาร), วิชาเรียน (สี tile ต่างจากสีวิชาในแอป — รอเจ้าของตัดสิน), โรงเรียนคนญี่ปุ่น (ควรเป็น ทองหล่อ トンロー校 / ศรีราชา シラチャ校), แถบดาวน์โหลดแอป
- [ ] แจ้ง Dev ปัญหา Course section ใน Production (ดูรายการในหัวข้อด้านล่าง)

---

## 2026-10-27 — Web App: แยก Web/Learn กับ Mobile App ออกจากกัน (เฟส 1)

**ตัดสินใจ (เจ้าของ):**
- **Web/Learn** = เปิดผ่าน browser → Desktop + Tablet + Mobile · **Mobile App** = โหลดจาก Store (Capacitor) → Mobile + Tablet — เป็นอิสระต่อกัน
- ตอนนี้ **repo เดียว แยกโฟลเดอร์** (แบบ ก) · อนาคตค่อยแยกเป็นคนละโปรเจกต์ (แบบ ข)
- App บน Tablet: **แนวตั้ง = แบบ ก** (BottomNav + เนื้อหา 2 คอลัมน์) · **แนวนอน = แบบ ข+ค** (Navigation Rail ด้านซ้าย + รายการ | รายละเอียด)

**ทำอะไร (`web-app/app/src`):**
- `web/` = Web/Learn (WebApp routes, `components/` เดิมของ web, หน้า marketing/school, LearnHub/Exam/Quiz/Goals/Lesson/Live เวอร์ชัน Web) · `app/` = Mobile App (MobileApp routes + AppShell, BottomNav, NavRail, TopBar, หน้าเวอร์ชัน App) · ที่เหลือ (`data/ lib/ auth/ components/ pages/`) = ใช้ร่วม
- **กฎ:** `web/` กับ `app/` ห้าม import กันเอง — บังคับด้วย oxlint `no-restricted-imports` (`.oxlintrc.json`)
- เลือกโหมดตอนเปิด (`src/mode.ts`): แอป native = App เสมอ · browser = Web · ดู App บน browser ด้วย `?app` (จำใน session) กลับด้วย `?web` — เช่น `http://localhost:5199/?app#/`
- ขนาดจอ App (`app/layout.ts`): ด้านสั้น < 600px = มือถือ · ≥ 600 = Tablet (กว้าง > สูง = แนวนอน) — หมุนจอแล้วเปลี่ยนทันที
- หน้า Web บนมือถือ: ใช้เมนู Web (hamburger) ไม่มี BottomNav ของ App แล้ว · หน้าที่ยังไม่มีเวอร์ชัน Web → เมนู Web + คอลัมน์กลาง 720px
- ลบ `pages/Home.tsx` เก่า (ไม่มี route ใช้แล้ว) · ✅ `tsc -b`, `vite build`, `oxlint` ผ่าน · ดูในเบราว์เซอร์แล้ว: มือถือ (Web/App), Tablet แนวตั้ง/แนวนอน, หน้าเรียนแบบ ค

**รอบ 2 (วันเดียวกัน):**
- แบบ ค บน Tablet แนวนอนเพิ่ม: **ห้องสอบ** (`app/pages/exam/ExamSplit.tsx` รายการชุดข้อสอบซ้าย | รายละเอียดขวา, `/exam` ยังไม่เลือก = ข้อความชวนเลือก) · **ไลฟ์** (วิดีโอ + รายละเอียดซ้าย | แชทสดค้างขวา)
- แถบปุ่มล่าง (Checkout, Pay, EditProfile, HomeworkRoom, LearningPlan, GoalResult) เปลี่ยนจาก fixed กว้าง 440px กลางจอ → `sticky bottom-0` กว้างเท่าหน้า + เว้นขอบล่าง iPhone (safe-area)
- **shadcn เฟส 8 จบ:** LearnHub (web) + LiveStream (web + app) — ปุ่มไอคอน / ลิงก์ "ดูทั้งหมด" / ปุ่มแจ้งเตือน / chip กรอง → `Button` · ที่เหลือเป็นการ์ดกดได้ทั้งใบ (ตั้งใจคง custom ตามเฟสก่อน)
- ✅ `tsc -b`, `vite build`, `oxlint` (0 error) · ดูในเบราว์เซอร์แล้ว
- **Accordion (shadcn)** ในสารบัญหน้าเรียน (Web + App): เปิดทีละบท บทที่ดูอยู่เปิดไว้ · ในบท = บทเรียน / แบบฝึกหัด / แบบทดสอบ (บทอื่นกดแล้วพาไปบทนั้น)
- **Resizable (shadcn, `react-resizable-panels` 4.14.5)** จอแบ่งทุกหน้าลากปรับขนาดได้ + จำขนาดไว้ (`lib/useSavedLayout.ts`, localStorage): Web หน้าเรียน (สารบัญ | วิดีโอ) · Web ไลฟ์ จอ xl (แชท | วิดีโอ | รายการวิดีโอ) · App แนวนอน หน้าเรียน / ไลฟ์ (วิดีโอ | แชท) / ห้องสอบ (รายการ | รายละเอียด) — หน้าใหม่ที่เป็นจอแบ่งให้ใช้ตัวนี้
- **shadcn รอบเก็บกวาด (raw `<button>` 97 → 57 ที่เหลือคือการ์ด/แถวรายการ/UI เฉพาะทางที่ตั้งใจเก็บ):** ปุ่ม CTA + ปุ่มไอคอน (Quiz, ย้อนกลับ, ปฏิทิน, auth) → `Button`, จับเวลาใน Quiz → `Checkbox` · ห้องสอบ: ข้อสอบ/คะแนนรวม → `Tabs`, ตัวกรอง → `DropdownMenu` (วิชา/ชั้นกรองจริง) · FAQ + เฉลย → `Accordion` · ลิ้นชักสารบัญ/แชท → `Sheet` (เพิ่ม `hideClose`), ป๊อปอัป GoalTest → `Dialog` · ชำระเงิน → `RadioGroup`, นาทีเรียน → `Slider`, chip ห้องการบ้าน → `ToggleGroup` · เพิ่ม ui: tabs, radio-group, slider, toggle, toggle-group, checkbox
- **ป้ายวิชา/ชั้น (เจ้าของกำหนด):** วิชา ยาว→สั้น คณิตศาสตร์→คณิต→Math→Ma · วิทยาศาสตร์→วิทย์→Science→Sc · ภาษาไทย→ไทย→Thai→Th · ภาษาอังกฤษ→อังกฤษ→English→En · ชั้น ป.1–6 = G1–6, ม.1–6 = G7–12 → `lib/labels.ts` + `SubjectBadge` / `GradeBadge` (`components/LearnBadges.tsx`) ใช้ใน LearnHub, หน้าเรียน, ไลฟ์, ตารางไลฟ์, รายวิชา
- **หน้าดูวิดีโอ / ไลฟ์ แบบ YouTube (Web + App):** `components/watch/*` — ตัวเล่น · ชื่อ · ครู + ติดตาม · ถูกใจ/แชร์/บันทึก/⋯ · กล่องรายละเอียด (ย่อ/ขยาย) · การ์ดแชทสด · เอกสาร · Goal · chip + วิดีโอที่เกี่ยวข้อง · Web ไลฟ์ ≥1280px แชทขวา (ลากได้ ปิดได้) จอแคบเป็นแผง · App มือถือวิดีโอค้างบน แชทเลื่อนขึ้นจากล่าง · หน้าเรียนคงสารบัญซ้าย (ลากได้)
- **ปรับตามเจ้าของ:** ตัดของที่ระบบไม่มี (ติดตาม / ถูกใจ / แชร์ / ผู้ติดตาม / ยอดคนดู / กล่องคำอธิบาย) → เหลือแถวครู · "เริ่มไลฟ์เมื่อ…" · ป้าย | บันทึก · ⋯ (`WatchMeta`) · ปุ่ม/กล่องรองเป็น outline · แถบแชทสดบางแถวเดียว (ไม่ยืดตามกล่องข้างๆ) · หน้าเรียน: สารบัญย้ายไปขวา ไม่มีปุ่มย้อนกลับ/ย่อในแผง → ซ่อนแผงด้วยปุ่มมุมมอง (โรงภาพยนตร์ / มุมมองปกติ) บนตัวเล่นแบบ YouTube · ไม่มี emoji ในระบบแล้ว (อารมณ์ใน Goal, ไอคอนเอกสาร, ถูก/ผิด → ไอคอน lucide · ข้อความ mock ตัด emoji)
- **Landing › Course ของเรา (ตาม Production nockacademy.com):** 6 แพ็กเกจ + 9 แถวสิทธิ์ จาก snapshot API `apiv2.nockacademy.com/v1/landing/course-products` (27 ต.ค.) → `data/coursePlans.ts` · Premium Plus+ 3 คอร์ส (จุฬาภรณ ป.6 / MWIT ม.3 / EP ป.6, ราคาตามเวลาที่เหลือ ถึง 4–5 พ.ย. = ฿500) + Premium 3/6/12 เดือน ฿2,800 / 4,100 / 5,300 · ป้าย 17,573+ แบบ Figma (แคปซูลส้ม รูปการ์ตูน DiceBear) · แถบช่องทางชำระเงิน · ตารางเดียวทุกขนาดจอ: คอลัมน์ชื่อแถวค้างซ้าย การ์ดแพ็กเกจเลื่อนแนวนอนเมื่อพื้นที่ไม่พอ (1280px พอดีไม่ต้องเลื่อน) · ทุกแถว + หัวการ์ดแบ่งช่องสูงคงที่ ตรงกันทุกคอลัมน์ · ป้าย Popular / Most Popular วางบนขอบบนการ์ด · `web/components/CoursePlans.tsx` · ปัญหาที่เจอใน Production (ราคาปลอมโชว์ก่อน API มา, แสดง 7/9 สิทธิ์, ชั้น "ป.4–ม.3" ไม่ตรง API "ทุกชั้นเรียน", 1280px ล้น, มือถือป้ายแถวซ้อน) — ของเราแก้แล้ว ยังไม่ได้แจ้ง Dev
- **Avatar (ReUI):** `components/ui/avatar.tsx` เปลี่ยนเป็นแบบ ReUI (Root ไม่ตัดขอบ, เพิ่ม `AvatarIndicator` / `AvatarStatus`) แต่ใช้ `@radix-ui/react-avatar` เดิม — ไม่ติดตั้ง `radix-ui` ทั้งก้อน, ไม่เอา Button ของ prompt (จะทับปุ่มทั้งแอป), ไม่ใส่ CSS Tailwind 4 (โปรเจกต์ใช้ Tailwind 3) · Landing ส่วน Course: ป้าย 17,573+ ใช้รูปการ์ตูน DiceBear (ไม่ใช่รูปคนจริง)
- **ตารางเรียนหน้าสาขา (`/school/:branch`):** ตาราง shadcn `Table` คอลัมน์ วัน · เวลา · วิชา · ชั้น (ตามเจ้าของ) กดหัวคอลัมน์เรียงได้ · แสดง 5 แถว + แสดงเพิ่ม / แสดงน้อยลง · มือถือเลื่อนแนวนอน
  - **ข้อมูลคลาสจริง** จาก Sheet "Data for Import" แท็บ `… (Class)` 8 สาขา → `data/schoolClasses.ts` (สร้างด้วยสคริปต์ ไม่แก้มือ) · กฎ: ชลบุรีเอาเฉพาะ Status = Present · แถวซ้ำ (วัน/เวลา/วิชา/ชั้นเดียวกัน หลายครู) รวมเป็นแถวเดียว · ชีตไม่มีคอลัมน์ชั้น → ดูจากชื่อคลาส (ประถม / ม.ต้น / ม.ปลาย / ติวเข้า ม.1 = ป.5–6) ไม่งั้นใช้ช่วงชั้นของคอร์สวิชานั้นในสาขา · ไม่แสดงชื่อครู · ดึงแบบ `export?format=csv&gid=` (gviz ตัดแถวทิ้ง)
- **แผนที่สาขา (`/school`):** เปลี่ยนจาก OpenStreetMap เป็น **OpenFreeMap สไตล์ Liberty** (ผ่าน MapLibre ใน Leaflet — ฟรี ไม่ต้องใช้ key · CARTO ตอนนี้ต้องใช้ key แล้ว ลองแล้วขึ้น "API KEY REQUIRED") · เจ้าของเลือกไม่ใช้ Google Maps (ต้องมี key + ผูกบัตร) · เลือกสาขาแล้วหมุดอยู่ค่อนล่าง ป๊อปอัปเห็นเต็มใบ เว้นที่ด้านบน (เช็คแล้วทั้ง Desktop + มือถือ) · ปุ่มซูมย้ายไปมุมขวาล่าง
- **ปรับรอบ 2:** ตัดปุ่มบันทึก / ⋯ (ระบบไม่มี) · การ์ดวิดีโอที่เกี่ยวข้องกลับเป็นการ์ดเดิมตาม Figma (มงกุฎ · คอมเมนต์ · ความยาว · ชื่อ · ป้าย — ไม่มีรูปครู) → ย้ายเป็น `components/VideoCard.tsx` ใช้ร่วมกับ LearnHub · `Thumbnail` ย้ายไป `components/` · เอกสาร + "Set your Goal!" เป็นการ์ดขนาดเท่ากันแถวเดียว (กว้างสุด 300px) แทนแถบยาวเต็มจอ · โหมดโรงภาพยนตร์มีปุ่ม "แสดงสารบัญ" ใต้วิดีโอ (นอกจากปุ่มบนตัวเล่น)

**เหลือทำ (TODO):**
- [ ] หน้าที่ยังใช้ร่วม (`src/pages/` — profile, more, homework, pricing, checkout, auth, goal, exam result/solution, learn subject) → แยกเป็นเวอร์ชัน Web / App เมื่อออกแบบหน้าตาแต่ละฝั่งแล้ว (ตอนนี้ทั้งสองฝั่งแสดงเป็นคอลัมน์กลาง 720px — Web ยังไม่มีดีไซน์ Desktop ของหน้าเหล่านี้)
- [ ] ของที่แก้ค้างในเครื่องที่ทำงาน (DesktopNav เมนูมือถือ + SchoolList) เก็บไว้ใน `git stash` — cloud ทำซ้ำไปแล้ว น่าจะทิ้งได้ แต่ยังไม่ได้เทียบ

---

## 2026-10-26 — Web App: shadcn เฟส 8 — จบ migration ✅ (เก็บกวาด + สรุป)

**แปลงครบทั้งโปรเจกต์แล้ว** (เฟส 1–7) — ทุกเฟส build + screenshot ผ่าน + merge เข้า main (Vercel auto-deploy)

- **12 ui components** (`src/components/ui/`): button, card, badge, select, dialog, dropdown-menu, avatar, sheet, input, label, progress, textarea
- **Token mapping:** สีแบรนด์เดิม map เข้า shadcn CSS variables (index.css) + คง token เดิมครบใน tailwind.config → ไม่มีหน้าไหนเพี้ยน
- **ตั้งใจคงเป็น custom** (shadcn ไม่ได้ช่วย / เป็น UI เฉพาะทาง): Quiz (choice state), Focus timer ring, GoalCard/Ring, mood emoji, range slider, carousel (Banner), แถบพื้นสี (PromoBar/AnnouncementBar/SystemUpdate), ContactFab, subject-colored cards (SubjectGrid/ScheduleStrip), list rows (settings/terms/more/notifications), avatar-initial, podium (Ranking), Faq accordion (animated), UpgradeCard gradient
- **ยังไม่ทำ:** marketing stubs (Article/Course/Grade/Term/NockForSchool ยังเป็น 6 บรรทัด placeholder) · `sonner` ติดตั้งไว้แล้วเผื่อทำ toast ภายหลัง (ยังไม่มีระบบ toast ใน web-app)
- ✅ `tsc -b` (fresh), `vite build`, `oxlint` ผ่านหมด

---

## 2026-10-26 — Web App: shadcn เฟส 7 (payment/ + marketing/ + Pricing/Notifications)

- **payment:** Checkout (back/CTA) · Pay (back/card Input+Label/CTA) · PayResult (CTA) → shadcn
- **pricing:** PricingPlans (Premium Plus CTA→Button) · Pricing (back→Button) · UpgradeCard คงเป็น custom (gradient)
- **marketing:** Landing (hero CTAs + pricing เลือก + ลิงก์→Button; subject cards/mockup คงเดิม) · Faq (search→Input; accordion animated คงเดิม)
- **อื่นๆ:** Notifications (อ่านทั้งหมด→Button) · **ShareSheet → Sheet (bottom)** · LearnHub (search→Input + CTA หลัก→Button; การ์ด content เฉพาะทางคงเดิม)
- marketing stubs (Article/Course/Grade/Term/NockForSchool 6 บรรทัด) ข้าม
- ✅ `tsc -b` / `vite build` / `oxlint` ผ่าน · Playwright ยืนยัน (Pricing, Landing, Checkout)

---

## 2026-10-26 — Web App: shadcn เฟส 6 (exam/ + homework/ + goal/)

- **component ใหม่:** `progress`, `textarea`
- **exam:** ExamList (search→Input, back→Button) · ExamDetail (back + SubjectCard CTA/menu→Button) · ExamResult (progress→Progress, CTA→Button) · Solution (back→Button) · **Quiz คงเป็น custom** (ตัวเลือก state-color, navigator, bullet เฉพาะทาง)
- **homework:** HomeworkRoom (back/custom input→Input/CTA→Button) · Result (CTA→Button) · Focus (จบโฟกัส→Button; ring timer คงเดิม)
- **goal:** GoalOverview/GoalResult/LearningPlan/ParentLink/GoalSetup/GoalTest/GoalWizard — progress→Progress, back/X/CTA→Button, chips/option→Button · **คงเป็น custom:** choices (ก/ข/ค/ง), mood emoji, range slider, GoalCard ring, NumberOption
- ✅ `tsc -b` / `vite build` / `oxlint` ผ่าน · Playwright ยืนยัน (GoalWizard, ExamList)

---

## 2026-10-26 — Web App: shadcn เฟส 5 (profile/ + more/)

- **EditProfile:** fields → Input/Label · FB connect / save / เปลี่ยนรูป / back → Button
- **Nakama:** search → Input · tabs → Button · add → Button(icon) · back → Button
- **Settings:** language toggle → Button · back → Button
- **More:** sign-out confirm → **Sheet (bottom)** + Button
- **Profile:** ปุ่มแก้ไข (icon) → Button
- **คงเป็น custom:** list rows (settings/terms/more) · back-header ที่เหลือ · avatar-initial · Achievements grid · Ranking podium · UsageChart/Calendar
- ✅ `tsc -b` / `vite build` ผ่าน · Playwright ยืนยัน (More sign-out Sheet, Nakama)

---

## 2026-10-26 — Web App: shadcn เฟส 4 (auth/)

- **component ใหม่:** `input`, `label`
- **AuthLanding:** phone → Input · ปุ่ม/ปิด/social → Button (outline)
- **EmailAuth:** email/password → Input (+ eye toggle) · toggle signin/signup → Button · ลืมรหัสผ่าน → Button(link) · label → Label
- **OtpVerify:** ช่อง OTP 4 หลัก → Input · ปุ่ม/ย้อน/ปิด/ขอ OTP ใหม่/social → Button
- **Welcome:** ชื่อเล่น → Input/Label · grade chips → Button (outline/default) · ปุ่ม → Button
- ✅ `tsc -b` / `vite build` ผ่าน · Playwright ยืนยัน 4 หน้า (auth/email/otp/welcome)
- หมายเหตุ: standing permission จากเจ้าของ = auto-merge ทุกเฟสเข้า main (Vercel อัปเดตเอง)

---

## 2026-10-26 — Web App: shadcn เฟส 3 (Home + home/*)

- **การ์ดแถว → Card asChild:** HomeworkCard · ShareCard · GoalEntry · ExamStrip (การ์ดสอบ)
- **ปุ่ม/ลิงก์ → Button:** ExamStrip "ดูทั้งหมด" (link) · LiveNext toggle ประถม/มัธยม
- **chip → Badge:** LiveNext (LIVE / ป.4-6) · ScheduleStrip (พรีเมียม) · ExamStrip (จำนวนข้อ / สถานะ)
- **คงเป็น custom (ตั้งใจ):** Banner (carousel) · SubjectGrid + ScheduleStrip card (พื้นสีวิชา) · SystemUpdate (แถบสี) · grade chip พื้นสีวิชา
- ✅ `tsc -b` / `vite build` ผ่าน · Playwright ยืนยันหน้า Home ครบ (มือถือ)

---

## 2026-10-26 — Web App: shadcn เฟส 2 (marketing shell + เมนูมือถือ)

- **component ใหม่:** `avatar`, `sheet` (+ ของเฟส 1: button/card/badge/select/dialog/dropdown-menu)
- **DesktopNav:** ปุ่ม login/สมัคร → Button · badge Premium/ป.6 → Badge · รูปโปรไฟล์ → Avatar · เมนู ⌄ → DropdownMenu (โปรไฟล์ / ออกจากระบบ ใช้ `logout` จริง) · **เพิ่มเมนูมือถือ Sheet (hamburger)** — เดิมจอเล็กไม่มี nav เลย ตอนนี้มีลิงก์ครบ + ปุ่ม login
- **AnnouncementModal** → Dialog (จาก custom overlay) · **TopBar** ปุ่มปฏิทิน → Button
- **คงเป็น custom (ตั้งใจ):** PromoBar / AnnouncementBar (แถบพื้นสี ปุ่มขาวบนสี — shadcn variant ไม่เข้า) · ContactFab (ปุ่มลอยเฉพาะทาง) · MarketingFooter (ลิงก์ nav plain — idiomatic) · BottomNav (NavLink)
- ✅ `tsc -b` / `vite build` / `oxlint` ผ่าน · Playwright ยืนยัน เมนูมือถือ Sheet + Announcement Dialog + desktop nav

---

## 2026-10-26 — Web App: เตรียมขึ้น Vercel (ยังไม่เคยขึ้น)

- พบว่า **web-app ไม่เคยขึ้น Vercel** — ที่ขึ้นไว้คือ **erp-v2** เท่านั้น (https://nock-erp-three.vercel.app, Root = erp-v2, ตั้งค่าใน dashboard ไม่มี vercel.json)
- เพิ่ม **`web-app/app/vercel.json`** (framework vite · build `npm run build` · output `dist` · install `npm install --legacy-peer-deps` เพราะ React 19 + Radix) — ไม่กระทบ erp-v2 (คนละ root)
- **ขั้นตอนฝั่งเจ้าของ (ต้องทำเองใน Vercel):** vercel.com → Add New Project → เลือก repo `nock-erp` → **Root Directory = `web-app/app`** → Deploy · push main = อัปเดตลิงก์เอง (ได้ URL ที่ 2 แยกจาก erp-v2)
- Preview ชั่วคราว (snapshot, เฉพาะบัญชีเจ้าของ): Artifact https://claude.ai/artifact/E168eiS1Dp4qSzpqnsE8hD (กดเมนู โรงเรียน / `#/school`)

---

## 2026-10-26 — Web App: เริ่มแปลงเป็น shadcn/ui (เฟส 1 — Foundation + หน้า School)

> เป้าหมายใหญ่: แปลง web-app ทั้งโปรเจกต์ (77 ไฟล์ / 46 หน้า) เป็น shadcn/ui — ทำเป็นเฟสๆ verify ทุกเฟส

**ตัดสินใจ:** เลือก **shadcn** (ไม่ใช่ HeroUI) เพราะอยู่บน Tailwind เดียวกัน · เป็นเจ้าของโค้ด component เอง · ไม่เพิ่ม runtime theme engine · map token แบรนด์เดิมได้

**เฟส 1 ทำแล้ว:**
- **Foundation:** path alias `@/` (tsconfig.app + vite) · `src/lib/utils.ts` (cn) · `components.json` (style new-york) · ติดตั้ง Radix + cva/clsx/tailwind-merge/tailwindcss-animate/sonner
- **Token mapping (สำคัญ):** `src/index.css` เพิ่ม CSS variables ของ shadcn map เข้าสีแบรนด์เดิม — `--primary` = brand #FF5A5E · `--foreground` = ink · `--border/--input` = line · `--destructive` = live · (มี `.dark` เผื่ออนาคต แต่แอปยัง light-only) · `tailwind.config.js` เพิ่ม token shadcn โดย**คง token เดิมครบ** (brand/ink/surface/line/subject) → โค้ดเก่ายังทำงานระหว่างย้าย
- **Components (`src/components/ui/`):** button · card (เพิ่ม asChild) · badge · select · dialog · dropdown-menu
- **แปลงหน้า School (pilot):** `SchoolList` (filter → shadcn Select บนมือถือ + chips เป็น Button · การ์ด → Card/Badge/Button · ปุ่มแชท → DropdownMenu) · `SchoolBranch` (3 modal → Dialog · การ์ดคอร์ส/รีวิว/ติดต่อ/FB → Card · ปุ่ม/ลิงก์ → Button · badge → Badge)
- แก้ bug เดิม: `Section` icon type แคบไป (ไม่รับ className) ทำให้ `tsc -b` แดง — ขยาย type แล้ว
- ✅ `tsc -b` / `vite build` / `oxlint` ผ่าน · Playwright จอ 390px + 1280px ยืนยันหน้าตาเหมือนเดิม (Select เปิดสวย, modal, การ์ด, contact)

**เหลือทำ (เฟสต่อไป):** แปลงอีก ~44 หน้า/component ที่เหลือ (home, profile, exam, goal, homework, payment, marketing, auth, more, web/*, bottom-nav ฯลฯ) + เพิ่ม ui component ตามที่แต่ละหน้าใช้ (input, label, tabs, tooltip, sheet, toast/sonner, avatar, switch, checkbox ฯลฯ) — ทำทีละชุด build/screenshot ทุกชุด

---

## 2026-10-26 — Web App: ขัด Responsive หน้า School (3 จุด)

**ทำอะไร (web-app/app):**
- **Filter เลือกสาขา (SchoolList):** จอเล็กเปลี่ยนจาก chips 8 อัน (เด้งหลายแถวเปลืองที่) → เป็น **dropdown "เลือกสาขา"** (`<select>` + `appearance-none`, chevron วางใน `pr-12` / `right-4` → ไม่ตกขอบอีก) · จอใหญ่ (sm+) ยังเป็น chips เหมือนเดิม
- **การ์ดสาขา (SchoolList):** สลับลำดับปุ่มล่างการ์ด → ไอคอนแชท/แผนที่ **ฝั่งซ้าย**, ปุ่ม "ดูรายละเอียด" (flex-1) **ฝั่งขวา** · popup ปุ่มแชทย้าย anchor `right-0` → `left-0` (กันล้นขอบซ้าย)
- **Section ติดต่อสาขา (SchoolBranch):** จากการ์ดแนวตั้งใบใหญ่ (p-5, วงกลม 48px) → **แถวแนวนอนกะทัดรัด** (px-4 py-3, วงกลม 40px, ไอคอน + ชื่อ/ค่า บรรทัดเดียว) ประหยัดพื้นที่แนวตั้งลงมาก

**หมายเหตุ stack:** web-app ใช้ **React 19 + Tailwind v3 + lucide-react** (ไม่ใช่ shadcn — ไม่มี components.json / ui/ / Radix)
- ✅ ผ่าน: `tsc --noEmit`, `oxlint`, `vite build` · ตรวจด้วย Playwright จอ 390px ครบ 3 จุด

---

## 2026-10-26 — Web App: หน้า School (สาขา NockAcademy) ครบทั้งชุด

**ทำอะไร (web-app/app — React):**
- เมนู nav เพิ่ม **"โรงเรียน"** → 2 หน้า: `/school` (list) + `/school/:branch` (template reuse ทุกสาขา)
- ข้อมูลทั้งหมดอยู่ที่ `src/data/school.ts` (ที่เดียว) — 8 สาขาแบรนด์ NockAcademy
- **หน้า list:** แผนที่ **Leaflet + OpenStreetMap** (ฟรี ไม่ต้องใช้ key) ปักหมุดครบ 8 สาขา · hover pin = popup การ์ด (รูป+2 CTA) · **chip กรองสาขา** (กด→โชว์การ์ดเดียว+ซูมหมุด) · การ์ด 4 คอลัมน์ จัดกลุ่ม กทม./ชลบุรี · CTA outline + ปุ่มแชท (hover กาง LINE/FB/โทร) + ปุ่มแผนที่ · CTA เปิดแท็บใหม่
- **หน้า branch:** hero = รูปโรงเรียนจริงเป็นพื้นหลัง + text ชิดล่าง + CTA ไอคอน + ปุ่ม Back · ที่ตั้ง+Google Map embed (พิกัดจริง) · เวลาทำการ · คอร์ส (การ์ด thumbnail ไอคอนวิชา + modal ดูทั้งหมด) · ตารางเรียน · ครู (รูปจริง portrait 3:4 hover โชว์ชื่อจริง+วิชา) · ห้องเรียน (คลิกดู modal) · รีวิว (marquee เลื่อนอัตโนมัติ+modal) · ติดต่อ (LINE/FB/โทร การ์ดแนวตั้ง) · FB posts (การ์ด 2 คอลัมน์) · ContactFab

**ข้อมูลจริง (ดึง 2026-10-26):**
- Google Sheet **"NA WEB"** → ที่ตั้ง(lat/lng+ลิงก์) · เบอร์ · LINE OA · Facebook · รายชื่อครู (ต่อสาขา)
- Google Sheet **"Data for Import"** → คอร์สต่อสาขา ~130 คอร์ส (ดึงเต็มผ่าน gviz CSV)
- รูปจริง: **ครู 32 รูป** → `app/public/teachers/` · **โรงเรียน 9 รูป** → `app/public/school/` (แปลง HEIC→jpg) · map ใน `school.ts`
- รายชื่อสาขายืนยันจากเจ้าของ (ชลบุรี: ศรีราชา/บ่อวิน/พัทยา/ตึกน้ำ · กทม.: บางนา/พาราไดร์พาร์ค/กรีนเพลส/รามคำแหง)

**ตัดสินใจ (สำคัญ) — การจัดการ/แก้ข้อมูลเอง:**
- แนะนำเจ้าของ: เริ่มที่ **Google Sheet เป็นแหล่งข้อมูล** (แก้ในชีต→เว็บดึงมา) ก่อน → ระยะยาวขยับไป **Headless CMS** (Sanity/Directus มี UI แก้+อัปโหลดรูป) · **ไม่ทำหน้า Admin เอง** (ซ้ำกับ ERP ของ Dev) — ยังไม่ได้ลงมือต่อ Sheet/CMS (ตอนนี้ยัง hardcode ใน school.ts)

**เหลือทำ (TODO):**
- [ ] ต่อ Google Sheet เป็น data source จริง (ตอนนี้ hardcode)
- [ ] รูปครูที่ยังไม่มี: ครูแฟง(GP) · ครูมิ้งค์(TU) · ครูหนึ่ง(PA) · ครูแพร์(BO) → ใช้ตัวอักษร placeholder
- [ ] รูป Google Street View / Places (hero/thumbnail) + FB feed จริง = ต้องมี API key / token
- [ ] mock ที่เหลือ: ตารางเรียน · รีวิว · FB posts · ที่อยู่ข้อความ

---

## 2026-10-22 — Catalog คอร์สสำหรับผู้ปกครอง

- เจ้าของ: อยากให้ผู้ปกครองดูคอร์ส + คลาส (วัน/เวลา) เอง กรองตามระดับชั้น / วิชา · Admin ส่งในแชท หรือผู้ปกครองเปิดจาก Rich Menu · เลือก: **แสดงราคาเริ่มต้น** · ปุ่มครบ 3: สนใจ → เข้าแชท / ขอนัดทดลองเรียน / สมัครเรียนเลย
- กฎ `domain/rules/catalog.ts`: คอร์สที่เปิดขาย (active, ยังไม่หมดเขต, ไม่ใช่ค่าย) · คลาสของคอร์ส = คลาสที่ผูก courseId · ถ้าไม่มี = ยืมคลาสวิชา/รูปแบบเดียวกันที่ชั้นตรงกัน (และไม่ได้เป็นของคอร์สอื่น) · ราคา = ราคา + ค่าอุปกรณ์ · test 3 ข้อ
- ลิงก์: 1 ลิงก์ต่อสาขา (`pk_…`, `.data/catalogs.json`) — อัปเดตทุกครั้งที่ส่ง / กดอัปเดต ลิงก์เดิมไม่เปลี่ยน → วาง Rich Menu ครั้งเดียว
- หน้า LIFF `/liff/catalog` (หรือ `/liff/form?token=pk_…`): Dropdown ระดับชั้น + Chip วิชา · การ์ดคอร์ส (ราคาเริ่มต้น) · คลาส (ทุก ส. 10:00–11:30 · ครู · เหลือ N ที่ / เต็ม) · TH / EN / JP · `?preview=<branchId>` = Admin ดูตัวอย่าง (ไม่ส่งอะไร)
- สนใจ / ทดลองเรียน → การ์ดในแชท Inbox (`catalog_request`): ปุ่ม "ส่งฟอร์ม Trial" (เลือกวิชานั้นไว้แล้ว) · "ส่งใบสมัคร (คลาสนี้)" · แชทที่ยังไม่ผูก Lead → ให้ผูกก่อน · สมัคร → ใบสมัครที่เสนอคลาสนั้นเปิดทันที
- Inbox › + › Catalog คอร์ส (✓ วันที่ส่งล่าสุด) · Settings › LINE Rich Menu: ช่องที่ 7 "คอร์สเรียน" + ปุ่ม สร้างลิงก์ / อัปเดต / คัดลอก / ดูตัวอย่าง (⚠ OA Manager มีสูงสุด 6 ช่อง → ช่องที่ 7 ต้องให้ Dev ตั้งผ่าน Messaging API)
- ✅ Calendar Preview ข้างแชท (เจ้าของเลือก "แผงข้างแชท + หาเวลาว่าง"): ปุ่มปฏิทินที่หัวแชท → แผงขวา 2 แท็บ · **หาเวลาว่าง** = วิชา + ช่วงวันที่ → ชั่วโมงว่าง (ครูสอนวิชานั้น + ห้องว่าง — `findOfferSlots` ตัวเดียวกับฟอร์ม Test/Trial) + คลาสจริงที่ยังมีที่ → ติ๊กหลายช่วง → "ใส่ในข้อความ" (`freeTimesReply`: ภาษาไทยเสมอ 1 บรรทัดต่อวัน — ไม่ส่งเอง แอดมินกดส่ง) · **ตารางสัปดาห์** = คาบทั้งสาขา จ.–อา. (เวลา วิชา ครู คน/ที่นั่ง) · ช่องพิมพ์ในแชทเป็นหลายบรรทัดแล้ว (Enter ส่ง, Shift+Enter ขึ้นบรรทัด)

---

## 2026-10-22 — ส่งฟอร์ม Test / Trial: Modal เลือก Slot ใหม่ + มาวันเดียว / แยกวัน

- เจ้าของ: Modal เดิม "อุบาท" · Test ต้องถามก่อนว่ามาวันเดียวกันไหม (มาวันเดียว = เลือก Slot ครั้งเดียว) · Trial แยกตามวิชาถูกแล้ว รวมแบบ Test ไม่ได้ · มีแค่ Test / Trial ที่เลือก Slot
- `components/inbox/send-form-dialog.tsx` ใหม่: 1 วิชา (Chip เลือกหลายวิชา) → 2 มาสอบวันเดียวกันไหม (เฉพาะ Test 2+ วิชา: มาวันเดียว / แยกวัน) → 3 เวลาที่จะเสนอ (ช่วงวันที่บรรทัดเดียว · รายการต่อวัน · ปุ่มเวลา "เริ่ม–จบ" · คลาสจริงสีม่วงพร้อมชื่อคลาส/ครู) · แถบล่างบอกว่ายังขาดเวลาของวิชาไหน
- มาวันเดียว = รายการเดียวจาก `commonSlots` (ทุกวิชาว่างพร้อมกัน ต่อกัน 2 ชม.) · แยกวัน / Trial = รายการต่อวิชา
- Token ฟอร์มมี `visit: "same" | "separate"` (Trial = separate เสมอ; ลิงก์เก่าไม่มีค่า = เดิม) → หน้า LIFF: separate = เลือกเวลาแยกต่อวิชา (เดิมบังคับเวลาร่วมทุกวิชา ทำให้ Trial 2 วิชาเลือกไม่ได้ถ้าเวลาไม่ตรงกัน) · สรุปขั้นตรวจสอบแยกต่อวิชา
- อนุมัติ (`store.approveSubmission`): ทุกวิชาเวลาเดียวกัน = คาบรวม 2 ชม. (เดิม) · คนละเวลา = จองแต่ละวิชาแยก (คลาสจริง = เข้าคลาส / ว่าง = เปิดคาบใหม่) · Assessment ต่อวิชาผูกคาบของวิชานั้น

---

## 2026-10-22 — Form Builder (Settings › ระบบ › ฟอร์ม)

- เจ้าของ: ฟอร์มเยอะมาก → ให้บริษัทสร้างฟอร์มเองได้ เลือกช่องเอง · เลือก: ทำทั้ง "ฟอร์มใหม่ของบริษัท" + "ปรับฟอร์มของระบบ" · ชนิดช่องครบ · คำตอบผูกกับครอบครัว + ดูรวมได้
- รายการฟอร์ม: Settings › ระบบ › แท็บ "ฟอร์ม" (ตาราง: ชื่อ · ระบบ / สร้างเอง · จำนวนคำถาม · คำตอบ · แก้ไขล่าสุด · สถานะ) → หน้า `/settings/forms/[id]`
- ตัวสร้าง: ซ้าย = รายการคำถาม (กดเพื่อแก้ · เลื่อนขึ้นลง · ทำซ้ำ · ลบ · เปลี่ยนชนิด · ตัวเลือก + "อื่นๆ" · ต้องตอบ) · ขวา = หน้าที่ผู้ปกครองเห็นแบบสด ลองกรอก / ลองส่งได้ (ไม่ส่งจริง) · แถบล่าง: ⋯ (ทำสำเนา / ลบ) · ยกเลิกการแก้ · บันทึก
- ชนิดช่อง 17 แบบ (`domain/rules/form-builder.ts` FIELD_TYPES): ข้อความสั้น/ยาว ตัวเลข วันที่ เวลา เบอร์ อีเมล · เลือก 1 / หลายข้อ (+อื่นๆ) / Dropdown / ใช่-ไม่ใช่ · คะแนน 0–10 / 1–5 · แนบไฟล์ / รูป · ยอมรับเงื่อนไข · หัวข้อ
- ฟอร์มของระบบ (Test / Trial / สมัครเรียน / แจ้งหยุด / ความพึงพอใจ): ช่อง "core" (กุญแจ) ระบบต้องใช้ แก้/ซ่อน/ลบไม่ได้ · ช่องเสริม (optional) ปิดสวิตช์ซ่อนได้ · เพิ่มคำถามของบริษัทได้ · ลบฟอร์มระบบไม่ได้ (ทำสำเนาเป็นฟอร์มใหม่ได้)
- ส่ง: หน้าครอบครัว › ฟอร์ม › ส่งฟอร์ม → ทาง LINE (มีแชท) หรือคัดลอกลิงก์ · ลิงก์ `pc_…` ถือสำเนาฟอร์ม ณ ตอนส่ง (แก้ฟอร์มทีหลังไม่กระทบลิงก์ที่ส่งไปแล้ว) · หน้าผู้ปกครอง `/liff/custom` (TH/EN/JP) ตรวจคำตอบซ้ำที่ server · ส่งได้ครั้งเดียว
- คำตอบ: แท็บ "คำตอบ" ของฟอร์ม (สรุปทุกข้อ: ตัวเลือก = นับ, คะแนน = เฉลี่ย + กระจาย, ข้อความ = รายการ · ตาราง + ดาวน์โหลด .csv) และในหน้าครอบครัว (กดดูคำตอบครบ) · แจ้งเตือน Admin/Manager สาขาเมื่อมีคนตอบ
- ข้อมูลจำลอง: ฟอร์ม Open House (26 คำตอบ) + ค่ายภาษาอังกฤษ (11 คำตอบ) · store v114 · Nock guide เพิ่มหัวข้อ form_builder
- รอบ 2 (เจ้าของ "ลุยเลย" — ให้สร้างฟอร์มแบบที่ใช้อยู่ได้): **ขึ้นขั้นใหม่** (แบ่งหน้า ถัดไป/ย้อนกลับ ตรวจทีละขั้น) · **หัวข้อเพิ่มได้หลายชุด** (+ เพิ่มนักเรียน, สูงสุด N) · **ผูกกับข้อมูลระบบ** (`bind`: ชื่อ/เบอร์/อีเมล/ความสัมพันธ์ผู้ปกครอง · ที่อยู่ครอบครัว · ชื่อ/ชื่อเล่น/ระดับชั้น/วันเกิด/โรงเรียนลูก — ตอนส่งใส่ข้อมูลเดิมให้ ลูกแต่ละคน = 1 ชุด · ตอบแล้วอัปเดตครอบครัว/นักเรียน (`bindUpdates`; ลูกใหม่ไม่สร้างเอง)) · **ตัวเลือกจากระบบ** (`source`: วิชา / ระดับชั้นของสาขา / Admin เลือกตอนส่ง — มี Dialog ให้เลือกคลาสของสาขาหรือพิมพ์เวลาเอง) · **ที่อยู่ + ปักหมุด** (ช่องใหม่ ใช้แผนที่เดียวกับฟอร์มเดิม) · **แสดงเมื่อ** (`showIf` ถามต่อตามคำตอบ) · **ขั้นตรวจสอบก่อนส่ง** (`review`)
- ฟอร์มระบบใน Builder จัดใหม่ตามของจริง (ขั้น ผู้ปกครอง → นักเรียน (+เพิ่ม) → วิชา/เวลา · ตรวจสอบ) · ฟอร์มค่ายตัวอย่างเป็น 3 ขั้น + เพิ่มน้อง + ผูกข้อมูล + ที่อยู่เมื่อเลือกรถรับส่ง · store v115 · แก้บั๊ก: เมนู "ส่งฟอร์ม" ในหน้าครอบครัวพังตอนเปิด (Label นอก Group) · ทดสอบส่งจริงแบบไม่ผ่าน LINE: ข้อมูลเดิมขึ้นครบ 2 คน, ตอบแล้วระดับชั้นนักเรียนอัปเดต — ลบข้อมูลทดสอบแล้ว
- ⚠ Dev / ยังไม่ทำ (ข้อ 7–8 ที่คุยไว้): ฟอร์ม LIFF ของระบบ (Test / Trial / สมัคร / แจ้งหยุด / ความพึงพอใจ) **ยังเป็นหน้าที่เขียนตายตัว — ยังไม่อ่านค่าจาก Builder** และฟอร์มที่สร้างเองยังไม่มี "หลังส่งทำอะไรต่อ" (สร้าง Lead / การ์ดตรวจ / จองคาบ) → รอบถัดไป · แนบไฟล์ใน prototype เก็บแค่ชื่อไฟล์ (ระบบจริงต้องอัปโหลดไฟล์)

---

## 2026-10-22 — แบบสอบถามความพึงพอใจ = คำถามเดียวกับ Google Form จริงของโรงเรียน

- เจ้าของส่ง Google Form Satisfaction ที่ใช้อยู่จริง → ฟอร์ม LIFF + รายงานปรับให้ตรงกัน · เลือก "คำถามฟอร์มจริง + รู้ว่าใครตอบ" และ **ตัดคำถาม "เรียนต่อปีหน้าไหม" ออก** (ฟอร์มจริงไม่มี)
- คำถาม (`erp-v2/src/app/liff/survey/page.tsx`, TH/EN/JP): วิชา / ระดับชั้น (ระบบใส่จากการลงเรียน) · แนะนำ 0–10 · เหตุผล (หลายข้อ + อื่นๆ) · พอใจ 5 ระดับ × 5 ด้าน (ครู · หลักสูตร · Feedback · ความคุ้มค่า · สถานที่) · ปรับปรุงเรื่องใดมากที่สุด (1 ข้อ + อื่นๆ) · คอร์สที่อยากให้เปิด (ไม่บังคับ) · ข้อความถึงครู (บังคับ)
- กฎ `domain/rules/survey.ts`: ไม่แนะนำ = NPS 0–6 → CRM ให้โทรคุย · `summarize` (NPS, พอใจเฉลี่ย 5 ด้าน, เหตุผลแยกกลุ่ม 9–10 / 7–8 / 0–6, เรื่องที่อยากให้ปรับ) · คะแนนครู · กลุ่มวิชา + ระดับ · คำตอบรูปแบบเก่าไม่นับ (`isCurrent`)
- Reports › ความพึงพอใจ: กรองปี + กลุ่มวิชา · 5 ด้านเรียงคะแนน · NPS รายสาขา · เหตุผล · เรื่องที่อยากให้ปรับ · คะแนนครู · ตารางตามโทร (มีคอลัมน์ "อยากให้ปรับปรุง") · ข้อความแยก 7–10 / 0–6 · สี NPS = Tag `npsGroup` (เขียว / เหลือง / แดง)
- ข้อมูลจำลอง reset (store v110)
- รอบ 2 (เจ้าของ): ตัวกรองย้ายไปแถวเดียวกับ Period chip ของแท็บอื่น (ระยะเท่ากัน) · ปี = Dropdown · แยกตัวกรอง วิชา / ชั้นเรียน (`kidMatch` — ลูกคนเดียวกัน) · "รวม N" อยู่บรรทัดหัวการ์ด (`Panel sub`) · การ์ดปรับปรุง + คอร์สที่อยากเปิด อยู่แถวเดียวกัน · ชี้ "อื่นๆ" (เหตุผล / ปรับปรุง) เห็นข้อความที่พิมพ์ (ซ้ำรวม ×N, เกิน ~10 บรรทัดเลื่อนดู) · store v111
- รอบ 3: การ์ด NPS = ตัวเดียวกับ Overview (`NpsCard`: คะแนนเต็มแถว · เหตุผล ซ้าย · ปรับปรุง ขวา) · 5 ด้าน = แถบ 100% แบ่งตามระดับที่ตอบ 1–5 (Likert, สี Tag `satisfaction` แดง→เขียว · `summarize.levels`) — ลอง Radar แล้วเลิก เพราะบอกแค่ค่าเฉลี่ย ไม่เห็นว่าพอใจน้อย / มากกี่คน (`recharts` + `components/ui/chart.tsx` ของ shadcn ยังติดตั้งอยู่ ใช้ทำกราฟอื่นต่อได้) · **ตัดการ์ดคะแนนครูรายคน** (เจ้าของเลือก — ฟอร์มจริงให้คะแนน "คุณครูผู้สอน" ครั้งเดียวต่อครอบครัว แยกไม่ได้ว่าครูคนไหน; ถ้าอยากได้รายคนต้องเพิ่มคำถามในฟอร์ม) · คอร์สที่อยากเปิด เต็มแถว · ตารางติดตามแสดงทุกครอบครัวที่ให้ 0–6 พร้อมสถานะ โทรแล้ว / รอโทร / เกิน 3 วัน · store v112
- ⚠ Dev: ระบบจริงต้องเก็บ `scores` ราย 5 ด้าน + `reasons[]` + `improve` + ผูกคำตอบกับครอบครัว / นักเรียน (Google Form เดิมไม่รู้ว่าใครตอบ)

---

## 2026-10-21 — Tag = Component เดียว สีเดียว ทั้งระบบ

- หลัก (เจ้าของ): Tag เดียวกันโผล่หน้าไหนก็คือ Tag เดิม สีเดิม · รายงาน / กราฟที่พูดถึงข้อมูลนั้นใช้สีของ Tag นั้น (เช่น Trial เหลืองใน CRM → Trial ใน Sankey เหลือง)
- ที่เดียว: `erp-v2/src/components/app/tags.ts` — `HUE` (คลาส Chip + สีทึบสำหรับกราฟ) + `TAG_HUE` (leadStage · role · studentStatus · sessionState · attendance · studentFlow) + `tagChip` / `tagHex`
- ใช้แล้ว: CRM ขั้น Lead · Chip Role (Reports เคยมีสี Role ของตัวเองที่ขัดกับหน้าบุคลากร — ลบแล้ว ใช้ RoleChip) · สถานะคาบ · TONE ของ Pill · Sankey Lead (เส้นทาง = สีขั้น CRM, นัด = สีเช็คชื่อ, ผล = สีขั้น CRM: หลุด = เก็บเข้าคลัง เทา) · Sankey นักเรียน/คอร์ส + กราฟเคลื่อนไหว (สีสถานะนักเรียน) · Subject Engine ใช้สีวิชาจาก Settings (`subjectHex`)

---

## 2026-10-21 — เพิ่มนักเรียน: "มาจากช่องทางไหน" (บังคับ) + Lead อัตโนมัติ

- ปัญหา: Lead ในรายงานนับได้แค่ LINE OA + Lead ที่ Admin เปิดใน CRM — Walk-in / Social ที่ Admin สร้างนักเรียน + ใบแจ้งหนี้เลย ไม่มี Lead → ช่องทางเพี้ยน (LINE ดูเยอะเกิน), Conversion ต่ำกว่าจริง
- แก้: ฟอร์ม + เพิ่มนักเรียน มีช่อง **มาจากช่องทางไหน \*** (สำหรับเจ้าหน้าที่ · เฉพาะสร้างใหม่) · `Student.source` · store บังคับเมื่อสร้างนักเรียนใหม่ที่ยังไม่มี Lead
- นักเรียนที่ยังไม่มี Lead → ระบบสร้าง Lead ให้ (`leadForNewStudent`): แบบ "สมัครเลย" (direct) ช่องทางตามที่เลือก สถานะรอชำระ ผูกกับนักเรียน → จ่ายเงินแล้วกลายเป็น "สมัครแล้ว" เอง · **ไม่ลบ** (เป็นประวัติว่าครอบครัวมาจากไหน) — ไปโผล่ใน Sankey Lead ช่อง สมัครเลย
- Walk-in ที่มาถามแต่ไม่ซื้อ: ใช้ + Lead ในหน้า CRM ได้อยู่แล้ว (เลือกช่องทาง Walk-in)
- ⚠ ถึง Dev: ระบบจริงต้องเก็บช่องทางตอนสร้างนักเรียน และสร้าง Lead ให้นักเรียนที่ไม่มี Lead — ไม่อย่างนั้นรายงาน Lead / ช่องทางจะผิด

---

## 2026-10-21 — Reports: นักเรียน / คอร์ส เป็น Sankey (แทนรายการ + กราฟ 12 เดือน)

- กราฟ 12 เดือนเอาออก (ไม่ตาม Period chip) — ใช้ Sankey ที่ตามช่วงที่เลือกแทน (rule `stockFlow`): นับแต่ละคน / คอร์ส **ครั้งเดียว** ซ้าย = เข้ามาทางไหน (มีอยู่แล้วต้นช่วง — รวมที่แพ็กเพิ่งหมด < 30 วัน และย้ายมาจากระบบเดิม · ใหม่ · กลับมาซื้อใหม่) → ขวา = ณ สิ้นช่วง / วันนี้ (เรียนอยู่ · พัก · **รอต่อ** = แพ็กหมด < 30 วัน · ซื้อแล้วยังไม่เริ่ม · Lost) · ซ้ายรวม = ขวารวม
- หัว Sankey: ซ้าย = ทั้งหมดในช่วง (ต้นช่วง x · เข้ามา y) · ขวา = เรียนอยู่ + ป้าย Net
- แถบด้านบน = ตัวเลขที่ลง Sankey ไม่ได้: นักเรียน Churn · นักเรียนต่อ · Returning Student · คอร์ส Churn · คอร์สต่อ · Returning · Actual buy · คอร์ส/คน
- **Churn ใหม่ = Lost ÷ ทุกคนใน Sankey** (นับต่อคน ไม่ใช่ต่อเหตุการณ์) — ตัวเลขใหม่/Lost จึงต่างจากเดิม (เดิมนับเป็นครั้ง)
- Sankey component รับ size / unit / of / name แล้ว (ใช้ได้ทั้ง Lead และนักเรียน / คอร์ส)

---

## 2026-10-21 — Reports: Lead แยก Test / Trial ตามนัดจริง

- เดิม Funnel ขั้น "นัด Test / Trial" นับจากสถานะ Lead (เส้นตรง Test → Trial) → คนที่ไป Trial อย่างเดียวถูกนับเป็น Test ด้วย และไม่เห็นคนนัดแล้วไม่มา
- ใหม่: นับจาก **บันทึกนัด (Assessment) + เช็คชื่อคาบนั้น** (`leadAppointments`): มา = เช็คชื่อมา หรือบันทึกผลแล้ว · ไม่มา = ขาด/ลา หรือเลยวันแล้วไม่มีเช็คชื่อ · ยังไม่ถึง = นัดไว้ · Lead ที่ไม่มีบันทึก (ข้อมูลเก่า) อ่านจากสถานะแทน
- Funnel: Lead ใหม่ → ติดต่อแล้ว → นัด Test / Trial → **มาจริง** → รอชำระ → สมัครแล้ว · รายการซ้าย: นัด Test (มาจริง x) / นัด Trial (มาจริง y) · ตาราง **แยกตามเส้นทาง** (Test อย่างเดียว / Trial อย่างเดียว / Test → Trial / สมัครเลย): Lead · มาจริง · ไม่มา · สมัครแล้ว · อัตราปิด (`leadPaths`)
- (รอบ 2 — เจ้าของ: 3 ส่วนแยกกันตัวใครตัวมัน) รวมเป็นตารางเดียว: แถวบน = ขั้น Funnel เป็นยอดรวม (Lead ใหม่ · ติดต่อแล้ว · นัด · มาจริง · รอชำระ · สมัครแล้ว + Conversion) · แถวล่าง = ขั้นเดียวกันแยกตามเส้นทาง (Test อย่างเดียว / Trial อย่างเดียว / Test → Trial / สมัครเลย / ยังไม่ได้นัด) รวมกันเท่าแถวบน · ไม่มา แสดงในช่องมาจริง · อัตราปิดท้ายแถว
- (รอบ 3) ภาพรวมเหลือ 4 ขั้น: Lead ใหม่ → นัด Test / Trial → มาจริง → สมัครแล้ว (ตัด ติดต่อแล้ว / รอชำระ — ยังอยู่ใน rule + แท็บ CRM / Export) · % = จากขั้นที่แสดงก่อนหน้า
- (รอบ 4) **Sankey "เส้นทางของ Lead"** แทนตารางแยกตามเส้นทาง (`components/reports/sankey.tsx`, rule `leadSankey`): ช่องทาง → เส้นทาง (Test อย่างเดียว / Trial อย่างเดียว / ทั้ง Test + Trial / สมัครเลย / ยังไม่ได้นัด — คนละกลุ่มกัน) → นัด (มาตามนัด / ไม่มา / รอวันนัด / ไม่ได้นัด) → ผล (สมัครแล้ว / ยังคุยอยู่ / หลุด) · ทุกคอลัมน์รวม = Lead ใหม่ · ชี้แถบ = จำนวน + % ของต้นทาง · ชี้กล่อง = เหลือแถบที่ผ่านกล่อง + (Test/Trial) บอกยอดรวมทั้งหมด · แถบสุดท้ายสีตามผล
- (รอบ 5) ตัดการ์ด 4 ขั้น + "ทุกเส้นทาง" ออก → ตัวเลขหลักของแต่ละขั้นวางเป็นหัวเหนือคอลัมน์ของ Sankey ตรงตำแหน่ง: 133 Lead ใหม่ (ช่องทาง) · 100 นัด Test / Trial (เส้นทาง) · 87 มาตามนัด (นัด) · 47 สมัครแล้ว + Conversion (ผล) · % จากขั้นก่อนใต้ตัวเลข · ค่าความจาง Sankey ปรับได้ที่ BAND_OPACITY
- ⚠ ถึง Dev: ระบบจริงต้องนับ Test/Trial จากบันทึกนัด + เช็คชื่อ ไม่ใช่จากสถานะ Lead
- Demo (persist v109): Lead ย้อนหลังมีบันทึกนัดตามสถานะ (ไม่มีคาบ — ผลบันทึก = มา) · tests 328

---

## 2026-10-21 — Reports: กราฟ 12 เดือนใต้ตัวเลข นักเรียน / คอร์ส

- (แก้ตามเจ้าของ: กดช่องแล้วขึ้นกรอบแดง "แย่" → เปลี่ยนเป็นปุ่ม ยอดคงเหลือ / เข้า–ออก / อัตรา บนหัวกราฟ ซ้าย = ปุ่ม + ข้อความ · ขวา = Legend · การ์ด KPI นักเรียน / คอร์ส / Lead ใช้แบบเดียวกับการ์ดช่วงเวลา (วันนี้ / 7 วันล่าสุด…) — พื้นขาว เส้นขอบ ตัวเลขขนาดเดียวกัน สูงเท่ากัน)
- ใต้ตัวเลขของส่วนนักเรียนและส่วนคอร์ส มีกราฟ 12 เดือนของตัวเอง (`components/reports/trend-chart.tsx`) · **กดช่องตัวเลขเพื่อสลับกราฟ** (ไม่มีปุ่มเพิ่ม · ช่องของกราฟที่เปิดอยู่มีกรอบชมพู):
  - **ยอดคงเหลือ** (Total Active / Pause / Active ต้นช่วง / Returning / คอร์ส÷นักเรียน) = ยอด ณ สิ้นเดือน Active + Pause
  - **เข้า–ออก** (Net / ใหม่ / กลับมาซื้อใหม่ / Lost / Course Actual buy — เปิดเป็นค่าเริ่มต้น) = เหนือเส้น ใหม่ + กลับมาซื้อใหม่ · ใต้เส้น Lost · เส้น Net
  - **อัตรา** (Churn / นักเรียนต่อ / คอร์สต่อ) = 2 เส้นรายเดือน
  - ชี้เดือนไหน ตัวเลขเดือนนั้นขึ้นบนหัวกราฟ (ไม่ชี้ = เดือนล่าสุด)
- (รอบ 2) การ์ด KPI เล็กลง (สูงตามเนื้อหา) · **Lead + Funnel รวมเป็น Section เดียว** (Lead เดียวกัน: ตัวเลข 5 ช่องบน + Funnel ทุกขั้นข้างล่าง) · Subject Engine เต็มแถว
- (รอบ 3) นักเรียน | คอร์ส วางซ้าย–ขวา (จอกว้าง ≥1280) ทั้งคู่ 4 × 3 เรื่องเดียวกันอยู่ตำแหน่งเดียวกัน (นักเรียน: Total Active กับ Net สูง 2 ช่อง แทนช่องที่คอร์สมีแต่นักเรียนไม่มี) · รายได้รายเดือน | Subject Engine ซ้าย–ขวา (รายได้ตามสาขา ถ้าเปิดเทียบ อยู่แถวถัดไป)
- (รอบ 4) เลิกใช้กล่องตัวเลขในส่วนนักเรียน / คอร์ส ("เละ") → อ่านจากบนลงล่าง: แถบบน = Active ต้นช่วง · Active วันนี้ · Pause (คอร์ส + คอร์ส/นักเรียน) · กลาง 2 คอลัมน์ = ซ้าย ใหม่ / กลับมาซื้อใหม่ / Lost / **= Net** (เส้นรวม) · ขวา Churn / ต่อ / Returning (+ Course Actual buy) — ชื่อซ้าย ตัวเลขขวา · ล่าง = กราฟ · สองฝั่งแถวตรงกัน
- (รอบ 5) Lead แบบเดียวกัน: ซ้าย = แถบ Total Lead · Conversion rate + รายการ Test / Trial (% ของ Lead) / = สมัครแล้ว · ขวา = Funnel
- (รอบ 6) แถบบน 3 ช่องทั้งสองฝั่ง (คอร์ส/นักเรียน ย้ายลงรายการขวา) · แถวรวม (Net / สมัครแล้ว) เป็นแถบพื้นเทาอ่อน ไม่มีเส้นเทาคั่น · Funnel แสดงแค่ % (คำอธิบายไปอยู่ใน ⓘ) · กราฟสองฝั่งชิดล่างให้ระดับเท่ากัน
- Rules: `trendMonths` · `returningBack` (คำนวณวันกลับมาครั้งเดียว นับได้ทุกช่วง) · `courseFlow().on(date)` (คอร์ส Active / พัก ณ วันใดก็ได้) + `in(r)` มี churn · tests +3 (325)
- ข้อมูลจำลอง (persist v108): นักเรียนเก่าบางคนซื้อคอร์สที่ 2 (เรียนต่อถึงวันนี้ / เลิกคอร์สนั้นแต่ยังเรียนอีกคอร์ส / เลิกแล้วกลับมาซื้อ) + เช็คชื่อรายสัปดาห์ที่มีช่วงขาด/ลา 4–6 คาบเป็นระยะ → คอร์สที่พัก / Returning Course มีตัวเลขย้อนหลัง · คาบเก่าที่มา = มีสรุปส่งแล้ว (ไม่เพิ่มงานค้าง)
- ข้อจำกัด demo: คอร์สหลักของนักเรียนเก่าไม่มีคาบ → ช่วงพักของคอร์สที่ 2 ถูกนับเป็น Returning Student ด้วย · ข้อมูลใน localStorage ~5.5M ตัวอักษร (ใหญ่ขึ้น ~0.2M)

---

## 2026-10-21 — Reports: จัด Overview + คำถามที่พักไว้

- Overview: เอา "ประเภทรายได้" ออก (อยู่แท็บรายได้แล้ว) · ตัด Net Growth + Lost/Pause · เพิ่ม NPS (คะแนน + แนะนำ/เฉยๆ/ไม่แนะนำ + ความเห็นประทับใจ/อยากให้ปรับปรุง จากรอบแบบสอบถามล่าสุด) · ส่วนนักเรียนเพิ่ม **Churn rate = Lost ÷ (Active ต้นช่วง + ใหม่ + กลับมาซื้อใหม่)** และ Active ต้นช่วง (สูตร Lost ÷ Active ต้นช่วง เกิน 100% ใน YTD จึงไม่ใช้) · Members Conversion rate ย้ายไปแท็บ Operations
- รอเจ้าของตัดสิน: แยก Course เป็น Section (มีจุดที่ไม่ตรงกับ Student — ถามแล้ว)
- **คำถามที่พักไว้ (เรื่อง Report จากชีท Eastern Region) — ถามต่อทีละข้อ:** 1) Conversion ในชีท 88–94% คืออะไร (Renewal? Test/Trial→สมัคร?) 2) Churn Rate ในชีทคิดยังไง 3) "Courses" ในชีทนับอะไร 4) Unique Students นับใคร (มาเรียนจริง / Active ตามแพ็ก) 5) Returning ในกราฟ New vs Returning คือนิยามไหน 6) กราฟย้อนหลังยาวแค่ไหน / ข้อมูลก่อนระบบ 7) กราฟวิชาต่อสาขานับอะไร (J1 Admission = วิชา?) 8) ตารางเทียบสาขาใครเห็น

---

## 2026-10-20 — แอปคนขับว่าง ทั้งที่อนุมัติเที่ยวแล้ว

- สาเหตุ: Chrome บนเครื่องนี้เปิด ERP ค้างไว้อีกหน้าต่าง (ข้อมูลคนละชุด ไม่มีเที่ยวที่อนุมัติ) → ทุก 30 วิ ส่ง "รายการว่าง" ไปทับรายการของอีกเบราว์เซอร์
- แก้: server เก็บเที่ยวที่อนุมัติแยกตามเบราว์เซอร์ (`.data/driver-trips.json`, id ต่อเบราว์เซอร์ใน localStorage `nock-driver-source`) แอปคนขับเห็นรวมกัน · เบราว์เซอร์ที่ปิดไปหลุดเองใน 10 นาที · เที่ยวแยกไฟล์จากการกดของคนขับ (`driver.json` = events) → ส่งเที่ยวทุก 30 วิไม่ทับการกดของคนขับ
- ลิงก์แอปคนขับ (demo): `https://liff.line.me/2011740783-OinXaLm7?app=driver&t=drv_demo_br_thl_0` (น้าสมชาย) · `…_1` (น้าชัย)

---

## 2026-10-20 — LINE ใช้ได้เองโดยไม่ต้องสั่ง Claude (เจ้าของ: "ต้องมาสั่งนายทุกรอบเลยหรอ")

- **การผูก LINE ↔ ครอบครัว เก็บที่ server ด้วย** (`.data/line-links.json`, `server/line-links.ts`, API `/api/line/links`, hook `useLineLinkSync` ใน AppShell): ERP ส่งการผูกทุกอันขึ้น server (เพิ่ม/ย้ายเท่านั้น ไม่เคยลบ) · ถ้าเบราว์เซอร์ถูกล้างข้อมูล เปิดหน้าไหนก็ได้ → ผูกครอบครัวกลับเอง (`restoreLinks` ใน store/keep-line-links.ts + tests) · แชท LINE ที่เข้ามาใหม่ของบัญชีที่ผูกแล้ว ไปอยู่กับครอบครัวนั้นเอง · ตอนนี้ daiBreezy ↔ ครอบครัวใจสู้ (fa_g0)
- **`npm run line` รันเองบนเครื่อง Mac ที่ทำงาน** (launchd): `~/Library/LaunchAgents/com.nockacademy.erp-line.plist` — เปิดเองตอน login + เปิดใหม่ถ้าหยุด (ทดสอบ kill แล้วกลับมาเองใน ~10 วิ) · log: `~/Library/Logs/nock-erp-line.log` · URL tunnel เปลี่ยนทุกครั้งแต่สคริปต์อัปเดต Webhook + LIFF ใน LINE เอง · Rich Menu ใช้ liff.line.me ไม่ต้องแก้
  - ปิด: `launchctl bootout gui/$(id -u)/com.nockacademy.erp-line` · เปิดใหม่: `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.nockacademy.erp-line.plist`
  - ⚠ ห้ามรัน `npm run line` ซ้อนในเครื่องนี้ (ชนพอร์ต 3311) · เครื่องที่บ้านยังไม่ได้ตั้ง (ต้องรัน `npm run line` เอง หรือตั้ง plist แบบเดียวกัน — path ต่างเครื่อง)
  - ข้อจำกัด: เครื่องนี้ต้องเปิดอยู่ · URL ถาวรต้องใช้ Cloudflare tunnel แบบมีบัญชี/โดเมน

---

## 2026-10-20 — แก้ "เที่ยวรถหายหมด"

- สาเหตุ: เบราว์เซอร์ที่ยังไม่มีข้อมูลเก็บไว้ (เปิดใหม่ / ล้างข้อมูล) เริ่มจาก seed เปล่า — ข้อมูลตัวอย่างรถรับส่ง (รถ คนขับ เด็กที่นั่งรถ) ใส่ให้เฉพาะตอนรีเซ็ตหรืออัปเดตเวอร์ชัน → หน้ารถรับส่งว่าง
- แก้: ข้อมูลเริ่มต้นใส่ demo รถรับส่ง + ครอบครัว LINE เหมือนตอนรีเซ็ต · persist v102 (เครื่องที่ค้างข้อมูลเปล่าจะได้ demo เอง)

---

## 2026-10-19 (ดึก) — รถรับส่ง: ผู้ปกครองส่งหมุดบ้าน + วิเคราะห์ตำแหน่ง/โซน + Admin เลือกโซนให้นักเรียน

- แอปผู้ปกครอง (LINE): แจ้งเรื่อง › **ปักหมุดบ้าน (รถรับส่ง)** — แผนที่ + จุดสังเกต · ครอบครัวที่ใช้รถแต่ยังไม่มีหมุด เห็นแถบเหลือง "ช่วยปักหมุดบ้าน" ทุกหน้า · ลิงก์ตรง `?app=parent&act=home` · ParentRequest kind `home`
- แชท Inbox: การ์ด "ปักหมุดบ้าน" — ระยะจากสาขา · ทิศ · เข้าโซนไหน · ห่างจากหมุดเดิมกี่ ม. · แผนที่ · **บันทึกหมุดบ้าน** (store `setFamilyHome`) แล้วตอบผู้ปกครองทาง LINE · ตัวอย่างที่ /inbox/cards
- รถรับส่ง › โซน: การ์ด **วิเคราะห์ตำแหน่งบ้าน** (`rules/zone-analysis.ts` + tests) — บ้านที่ใช้รถ / ปักหมุดแล้ว / ยังไม่มีหมุด · **จุดที่บ้านหนาแน่น** (บ้านห่างกัน ≤1 กม.) วงแดงบนแผนที่ · **เปรียบเทียบแบบแบ่งโซน** 1 โซน … 1 โซนต่อรถ: เวลาเที่ยวนานสุด, กม.รวม, ที่นั่งมากสุดต่อเที่ยว (จากรอบรถจริง 7 วัน) → ป้าย "แนะนำ" + ปุ่ม "ใช้แบบนี้"
- ตาราง **นักเรียนที่ใช้รถ** (DataTable): ระยะทาง · หมุดบ้าน · **เลือกโซนเอง** (บ้านไม่มีหมุดก็ได้) · ปุ่ม **ขอหมุดจากผู้ปกครอง** = เปิดแชทครอบครัวพร้อมข้อความ+ลิงก์ (Admin กดส่งเอง)
- Demo ทองหล่อ: บ้านรวมกลุ่มทิศตะวันออก ~5 กม. · บางบ้านยังไม่มีหมุด · persist v101
- ยังไม่ได้เทสในเบราว์เซอร์: หน้าปักหมุดในแอปผู้ปกครอง (tsc ผ่าน) · ยังไม่ได้อัปเดตคำอธิบาย Nock

---

## 2026-10-19 (ค่ำ 2) — รถรับส่ง: ระบบแนะนำลำดับคิว ไกลสุด → เข้าสาขา

- ระบบแนะนำลำดับให้เองทุกเที่ยว (`inwardSweep` ใน rules/transport.ts): **รอบรับ** = บ้านที่ไกลสาขาที่สุดก่อน แล้วไล่เข้ามาจนถึงสาขา (จุดสุดท้าย = บ้านใกล้สุด) · **รอบส่ง** = กลับกัน (ใกล้ก่อน → ไกลสุด) · **รับ-ส่ง** = ส่งก่อน (ใกล้ → ไกล) แล้วรับกลับ (ไกลสุด → สาขา) · บ้านที่ห่างสาขาพอๆ กัน (ไม่เกิน 0.5 กม.) เรียงตามบ้านที่ใกล้จุดก่อนหน้า ไม่ให้รถวิ่งย้อนไปมา
- ในเที่ยวขึ้นป้าย "ลำดับที่ระบบแนะนำ: …" · Admin กด "แก้ไข" ลากเรียงเองได้ → ป้าย "Admin จัดลำดับเอง" + ปุ่ม "ใช้ลำดับที่ระบบแนะนำ" (กลับไปลำดับแนะนำ เวลาคำนวณใหม่) · tests 307

---

## 2026-10-19 (ค่ำ) — รถรับส่ง: มุมมองรายวันเป็นค่าเริ่มต้น + ระยะทาง + demo ทองหล่อ 2 คัน 2 โซน + Both

- แท็บ "เที่ยวรถ" มีสวิตช์ **วัน / สัปดาห์** — **วัน** เป็นค่าเริ่มต้น (เจ้าของ: รายสัปดาห์วุ่นวายเกินไป) · เลื่อนทีละวัน · วันที่ไม่มีเที่ยว มีลิงก์ "ไปวันที่มีเที่ยวถัดไป" · ปฏิทินดูวันเดียวได้
- **ระยะทาง** ทุกเที่ยว: คอลัมน์ "ระยะทาง" ในตาราง · หัววัน "x เที่ยว · y กม." · KPI ระยะทางรวม · แถบเวลาในเที่ยว · รายงาน (ตามรถ / คนขับ) · แอปคนขับ
- แอปคนขับ: ส่งเที่ยวที่อนุมัติขึ้น server ซ้ำทุก 30 วิ + ตอนกลับมาที่แท็บ + ลองใหม่ถ้าส่งไม่สำเร็จ (เคยหายเพราะ hot reload ทำให้ตัวส่งในแท็บหยุด)
- Demo **ทองหล่อ**: รถ 2 คัน (รถตู้ 1 น้าสมชาย · รถตู้ 2 น้าชัย ฮข 3318) ออกเวลาเดียวกันทุกรอบ · 2 โซน (สายตะวันออก → คัน 1 · สายตะวันตกเฉียงเหนือ → คัน 2) · **เสาร์ 12:05 รับ-ส่ง (Both)** ส่งเด็กคลาส 10:00–12:00 แล้วรับเด็กคลาส 13:00 · persist v100 (ข้อมูลรีเซ็ต — เที่ยวที่อนุมัติ/เที่ยวพิเศษที่เคยสร้างหายไป)

---

## 2026-10-19 (เย็น) — รถรับส่ง: Estimate / Check in / Check out + Admin ตั้งเวลาเอง

- ตารางเที่ยว (Bus Route) กลับมาใช้ `DataTable` กลาง (เจ้าของ: "Table ในรูปแบบที่เราทำกันไว้ มันหายไปไหน") — DataTable มี `expanded` (แถวกดขยายได้) ใช้หน้าอื่นได้ด้วย
- จุดรับส่งแต่ละจุด: **ประมาณ (Estimate)** · **Check in = รถไปถึงบ้าน** · **Check out = รับ / ส่งเด็กแล้ว** (หรือไม่มา) · สาย +นาที นับจาก Check in
- แอปคนขับ 2 จังหวะต่อจุด: **ถึงแล้ว** (ม่วง) → **รับแล้ว / ส่งแล้ว** (เขียว) · ไม่มา · แก้ (ย้อนทีละขั้น) — ปุ่มทึบเฉพาะจุดปัจจุบัน
- **Admin ตั้งเวลาเองได้เสมอ** (คลิกเวลาในตาราง):
  - เวลาออกรถของวันนั้น (`BusTrip.departAt`) → เวลาทุกจุดคำนวณต่อจากนี้
  - เวลาคิวของเด็กแต่ละคน (`BusTrip.stopTimes`) → ขึ้นป้าย "ตั้งเอง" จุดถัดไปคำนวณต่อจากเวลานั้น เวลาถึงสาขาเลื่อนตาม
  - เวลาจริง (ออกรถ / Check in / Check out / ไม่มา / จบเที่ยว) แทนคนขับได้ (`BusTrip.actuals`) — ชนะข้อมูลจากแอป ขึ้น "(แอดมิน)"
  - ลบเวลาออก = กลับไปให้ระบบคำนวณ / ใช้เวลาจากแอป
- กฎ `timeStops(…, manual)` + store `setTripDepart` / `setStopTime` / `setTripActual` · event ใหม่ `arrive` (server เก็บ check in / check out แยกกัน) · tests 305

---

## 2026-10-19 (บ่าย) — Bus Route ทำใหม่ตาม Ref ของเจ้าของ + คนขับ + แอปคนขับ

### ตัดสินใจ (เจ้าของตอบ 4 ข้อ)
1. **มีเที่ยว Both** (รับ-ส่งในเที่ยวเดียว) — ใช่
2. **คนขับเป็นบุคลากรในระบบ** (role ใหม่ `driver`) แต่ **จ้าง Outsource ได้บางวัน** ("พี่เบ้งอาจจะลากลับบ้าน") → เปลี่ยนคนขับเฉพาะวันได้
3. **คนขับต้องมีแอป** (เชื่อม LINE หรือ Web ใหม่) → ทำเป็นเว็บแอปเปิดจากลิงก์ใน LINE ไม่ต้องล็อกอิน
4. "ศรีราชามีรถ 2 คัน แต่ **Recreate ใหม่เลย**" → หน้าเดิม (รายวัน/สัปดาห์ แบบการ์ด) ถูกแทนด้วยหน้าตาม Ref

### หน้า รถรับส่ง (`/transport`) ใหม่
- แท็บ: **ตารางสัปดาห์ · รายงาน · รถ & คนขับ · โซน**
- ตารางสัปดาห์: KPI (เที่ยว · รถที่วิ่ง · นักเรียน + ผู้ปกครองไปด้วย · อนุมัติแล้ว x/y) · มุมมอง ตาราง / ปฏิทิน · เลื่อนสัปดาห์ · ค้นหา (เด็ก/คนขับ/ชั้น/รถ) · ตัวกรอง โซน / ประเภท / รถ / **สาขา** (Director เห็นทุกสาขาที่มีรถในตารางเดียว)
- แบ่งตามวัน · หัววันมี **เพิ่มเที่ยว** (เที่ยวพิเศษ) + กล่อง "ต้องตัดสินใจ" · แถวเที่ยว = รถ (สีต่อคัน) · เวลาออก→ถึง · ผู้โดยสาร x/ที่นั่ง · โซน (A/B) · คนขับ (Outsource / แทนวันนี้) · P / D / Both · สาขา · สถานะ (รออนุมัติ → อนุมัติแล้ว → กำลังวิ่ง → เสร็จ / ยกเลิก)
- กดแถว = ขยายดูจุด (ลำดับ เด็ก ชั้น ที่อยู่ กม. P/D เวลาประมาณ/จริง สถานะ: เสร็จ / กำลังไป / ถัดไป / ไม่มา / ยกเลิก) · **แก้ไข** = ลากเรียง + ✕ เอาออก · **เพิ่มผู้โดยสาร** · แผนที่ & ใบงาน · ⋯ (เปลี่ยนรถ/คนขับเฉพาะวัน · เวลา · ยกเลิก/กู้คืน · คัดลอกลิงก์แอปคนขับ) · **อนุมัติ & ส่ง** ทีละเที่ยว หรือ **อนุมัติทั้งหมด & ส่ง** ที่หัวหน้า
- ปฏิทิน: สัปดาห์ × ชั่วโมง บล็อกสีตามรถ กดแล้วเปิดแถวในตาราง
- รายงาน: ผู้โดยสารรวม · ที่นั่งใช้ % · เวลาต่อเที่ยว · ตรงเวลา % (จากแอปคนขับ) + ตารางตามรถ / ตามคนขับ
- รถ & คนขับ: รถเลือก **คนขับประจำ** จากรายชื่อ · การ์ด **คนขับ** (เพิ่ม/แก้ · Outsource · คัดลอกลิงก์แอป) · รอบรถ รับ / ส่ง / **รับ-ส่ง**

### เที่ยว Both (`rules/transport.ts` + `rules/bus.ts`)
- ออกเวลา T: ส่งเด็กที่เลิกเรียนก่อน T (ใกล้สุดก่อน) แล้วรับเด็กที่เรียนเริ่ม ≥ T+45 นาที (BOTH_LEAD_MIN) กลับมา · ที่นั่งนับทีละขา (คนลงก่อนคนขึ้น) · ไม่มีใครรับกลับ = จบที่บ้านหลังสุดท้าย (test)

### แอปคนขับ
- ลิงก์ `https://liff.line.me/<LIFF>?app=driver&t=<token>` (token ต่อคนขับ สร้างตอนส่งเที่ยวแรก / ตอนเพิ่มคนขับ)
- วันนี้/วันอื่น · เริ่มวิ่ง → แต่ละจุด รับแล้ว / ส่งแล้ว / ไม่มา (แก้ได้) · โทร · นำทาง · เปิดทั้งเส้นทางใน Google Maps · จบเที่ยว
- server `.data/driver.json` (`server/driver-store.ts`) · API `/api/driver/publish|events` (staff) · `/api/driver/me|event` (สาธารณะ ตรวจ token) · หน้า Admin poll ทุก 30 วิ → สถานะ + เวลาจริง + สาย +นาที
- ⚠ Prototype: ลิงก์ = กุญแจ (ไม่มี login) — ระบบจริง Dev ควรใช้ LINE Login ผูก userId ของคนขับ

### Demo
- คนขับเป็น Staff: ทองหล่อ น้าสมชาย · ศรีราชา น้าเอื้อง (รถตู้ 1) · น้าเบ้ง (รถตู้ 2) · พี่ต้อม (Outsource) · วันเสาร์ศรีราชา 12:15 รถทั้ง 2 คันเป็นเที่ยว Both แบ่งตามโซน · persist v98
- ยังไม่ทำ: แจ้ง ETA ให้ผู้ปกครองตอนรถใกล้ถึง · ตำแหน่งรถสด (GPS)

---

## 2026-10-19 — เคลียร์เรื่องค้าง

### ตัดสินใจ (เจ้าของ)
- **Test / Trial ส่งให้ครอบครัวลูกค้าเดิมได้** (เช่น ลูกคนที่ 2): Inbox › + › ฟอร์ม › Test / Trial เปิดได้ในแชทครอบครัว → เลือก "ชั้นของลูก" → ตอนส่งสร้าง Lead ให้เด็กคนนั้น (`siblingLead` ใน rules/crm.ts + test) ผ่านผู้ปกครองหลัก + LINE ของครอบครัว · อนุมัติแล้วเด็กเข้าครอบครัวเดิม (match LINE/เบอร์) ไม่สร้างซ้ำ
- **ไม่ย้าย prototype ไป next-intl** — ใช้ตัวแปลหน้าจอ + เทสกันคำแปลหลุดต่อ · Dev ใช้ i18n มาตรฐานในระบบจริง เอา `erp-v2/i18n-export/*.json` ไปเป็นคำแปลตั้งต้น

### ผู้ปกครองขอ / ยกเลิกรอบรถผ่าน LINE → แอดมินอนุมัติในแชท
- แอปผู้ปกครอง › แจ้งเรื่อง › **ขอ / ยกเลิกรอบรถ** (เฉพาะ Liclass หรือเด็กที่ใช้รถอยู่): ทุกวันที่มีเรียน แตะ รถรับ / รถส่ง → ยังไม่มี = ขอเพิ่ม (เขียว) · มีอยู่ = ยกเลิก (แดง ขีดฆ่า) · Rich Menu ลิงก์ตรง `…?app=parent&act=bus`
- server ตรวจ: เฉพาะวันเรียนของลูกตัวเอง · ขอเพิ่มได้เฉพาะขาที่ยังไม่มี / ยกเลิกได้เฉพาะขาที่มีอยู่ (ParentRequest kind "bus", `bus: BusChange[]`)
- แชท Inbox: การ์ด "ขอ / ยกเลิกรอบรถ" แต่ละวัน + รอบรถ / ที่ว่าง (หรือ "เต็ม" / "ไม่มีรอบ") + ค่ารถ (เที่ยว × ราคา) · **อนุมัติ** หรือ ⋯ ไม่ดำเนินการ (แจ้งเหตุผล) → ตอบผู้ปกครองทาง LINE อัตโนมัติ
- อนุมัติ: ขอเพิ่ม = BusAddOn (เก็บในรายชื่อนักเรียน › Billing › รอเรียกเก็บ → ดึงเข้าใบแจ้งหนี้รอบถัดไปเอง) · ยกเลิก = รอบเพิ่มที่ยังไม่เก็บเงิน → ลบทิ้ง (ไม่คิดเงิน) · รอบที่จ่ายแล้ว → บันทึก `cancel` (รถไม่ไป · ไม่คืนเงิน ตามกฎ 2026-09-30) — ไม่นับที่นั่งในรอบรถ ไม่ขึ้นในแอปผู้ปกครอง
- กฎ `rules/bus.ts`: busChangeLegs, cancelBusRides (+ tests) · store `cancelBusRides` · ตัวอย่างการ์ดที่ /inbox/cards · Settings › LINE Rich Menu = 6 ช่อง (+ แจ้งลา, รถรับส่ง)
- ⚠ Rich Menu จริงตั้งใน LINE OA Manager — ต้องเพิ่มช่อง "รถรับส่ง" เอง (หรือให้ Claude ทำเมื่อ login)
- **ผู้ปกครองนั่งรถไปด้วย** (owner: +1 ที่นั่ง ไม่คิดเงิน): ในหน้าขอรอบรถ แต่ละวันมีปุ่ม "ผู้ปกครอง" (กดได้เมื่อเด็กนั่งรถวันนั้นอย่างน้อย 1 ขา) → การ์ด Admin "+ ผู้ปกครองไปด้วย (รับ+ส่ง) · ไม่คิดเงิน" + เช็คที่นั่ง (เด็ก + ผู้ปกครอง ไม่พอ = แดง) → อนุมัติ = BusAddOn `companion` (amount 0, ไม่ดึงเข้าใบแจ้งหนี้, นับ +1 ที่นั่งในรอบรถผ่าน `roundLoad`) · แอปผู้ปกครอง แท็บรถรับส่งขึ้นชิป "ผู้ปกครองไปด้วย" · รายชื่อนักเรียน › Billing แสดง "ไม่คิดเงิน"
- demo ใบเฟิร์นใช้รถเฉพาะวันคณิต (วันอังกฤษว่าง → ลองขอเพิ่มได้) · persist v92

### หน้า "รถรับส่ง" (Transport) — ต่อจาก Bus Route ของ v1 (`new-erp/LOGIC-SPEC-15-bus-route.md`)
- หลัก: **ไม่มีใครพิมพ์ชื่อเด็กเข้ารถ** — ใครนั่งรอบไหนคำนวณจากใบแจ้งหนี้ (ขาที่จ่าย) + รอบที่ขอเพิ่ม/ยกเลิก + ผู้ปกครองที่นั่งไปด้วย → เข้ารอบที่ตรงเวลาเรียน (`rules/transport.ts` planDay + 5 tests)
- เมนู งานสอน › **รถรับส่ง** (`/transport`, สิทธิ์ session.manage) 3 มุมมอง:
  - **รายวัน**: KPI (เที่ยว · ที่นั่ง · ต้องดู · ส่งแล้ว) · กล่อง "ต้องตัดสินใจ" (เด็กไม่มีรอบตรงเวลา → เลือกใส่รอบ · คำขอรถที่ยังไม่อนุมัติ → ไปแชท) · การ์ดเที่ยวรถ: ลำดับจุด + เวลาถึง (เรียง nearest-neighbour, ETA 22 กม./ชม. ×1.35 + จอด 3 นาที — Dev ใช้ Google จริง) · ⋯ เลื่อน/ย้ายรอบ · เปลี่ยนรถเฉพาะวัน · คำเตือน (เกินที่นั่ง / ไม่มีหมุด / นอกพื้นที่ / ไม่ได้เลือกรถ) · "แผนที่ & ใบงานคนขับ" (แผนที่จุดเรียงเลข + คัดลอกข้อความ LINE + พิมพ์) · ส่งให้คนขับ / ส่งทั้งวัน · แก้หลังส่ง = "แก้หลังส่ง — ส่งใหม่"
  - **สัปดาห์**: ตารางรอบ × วัน (ที่นั่งใช้/ทั้งหมด · แดง = มีคำเตือน · เขียว = ส่งแล้ว) กดเปิดรายวัน
  - **รถ & รอบรถ**: รถ (ชื่อ ทะเบียน ที่นั่ง คนขับ เบอร์) · รอบรถ + รถที่วิ่ง · สวิตช์ **ส่งอัตโนมัติ 60 นาทีก่อนรถออกเมื่อไม่มีคำเตือน**
- เก็บเฉพาะสิ่งที่ Admin ตัดสินใจ (`BusTrip`: ลำดับ · เด็กที่ย้ายเอง · รถแทน · ส่งเมื่อไร + สิ่งที่ส่ง) · รถหลายคันออกเวลาเดียวกัน = แบ่งตามทิศบ้าน
- demo ทองหล่อ: รถตู้ 1 (ฮข 2210 · น้าสมชาย · 10 ที่) + เด็ก ~12 คนมีใบค่ารถของตัวเอง หมุดบ้านรอบสาขา (1 ครอบครัวไม่มีหมุด) · persist v94
- **รถหลายคัน + โซน** (owner: "วาง Case รถมากกว่า 1 คัน · แบ่ง Zone ของนักเรียน"): รถรับส่ง › **โซน** — แผนที่บ้านที่นั่งรถ (จุดสีตามโซน + ลิ่มโซนจากสาขา) · "แบ่งโซนอัตโนมัติ" = หนึ่งโซนต่อรถหนึ่งคัน ตัดตรงช่องว่างกว้างสุดระหว่างกลุ่มบ้าน ตั้งชื่อตามทิศ (สายเหนือ / สายใต้) · แก้ชื่อ / รถที่วิ่งได้ · บ้านตรงเส้นแบ่งเลือกโซนเอง (`Family.busZoneId`) · "ไม่ใช้โซน" = แบ่งตามทิศเอง
- รถหลายคันออกเวลาเดียวกัน → เด็กขึ้นรถของโซนบ้านตัวเอง (ไม่มีโซน = แบ่งตามทิศ) · การ์ดเที่ยวรถมีชิปโซน + เลขลำดับสีตามโซน (`Branch.busZones`, rules/transport autoZones/zoneOf + tests)
- demo **ศรีราชา (LIS)**: รถตู้ 1 (756 · น้าเอื้อง) + รถตู้ 2 (1719 · น้าเบ้ง) ออกพร้อมกัน จ–ศ 15:30/17:30 · ส. 09:30/12:30 · บ้าน 9 หลังเหนือ/ใต้สาขา → สายใต้ = คัน 1 · สายเหนือ = คัน 2 · ค่ารถ Standard ฿100 ≤8 กม. / โซนไกล ฿150 ≤15 กม. · persist v96
- **สร้าง / แก้ / ลบ / ปรับ / ยกเลิก ได้ครบ** (owner: "จะต้องสามารถ สร้าง แก้ไข ลบ ปรับเปลี่ยน ยกเลิก ได้ด้วย"):
  - รถ + รอบรถประจำสัปดาห์: รถ & รอบรถ (มีแล้ว)
  - เที่ยวรายวัน (⋯ หัวการ์ด): **ยกเลิกเที่ยวนี้วันนี้** (เหตุผล: รถเสีย / วันหยุด / คนขับลา / ไม่มีเด็กนั่ง — เด็กไปกล่อง "ต้องตัดสินใจ" · กู้คืนได้) · **เปลี่ยนเวลาเฉพาะวันนี้** (กลับเวลาเดิมได้) · **เที่ยวพิเศษ** วันเดียว (ปุ่มหัวหน้า — สร้าง / แก้ / ลบ · รับเฉพาะเด็กที่เพิ่มเอง ไม่ดึงเด็กจากรอบประจำ)
  - เด็กในเที่ยว: **+ เพิ่มเด็ก** (ค้นหา · ยังไม่ได้ซื้อรอบนี้ = รอบรถเพิ่ม คิดเงิน/ไม่คิดเงิน · ผู้ปกครองไปด้วย) · ⋯ ที่ชื่อ: **ผู้ปกครองไปด้วย / ไม่ไปแล้ว** · **เอาออกจากเที่ยวนี้** (= ยกเลิกรอบนั้น: ยังไม่เก็บเงิน = ไม่คิด · จ่ายแล้ว = ไม่คืน) · เลื่อน / ย้ายรอบ (มีแล้ว)
  - โซน: **เพิ่มโซน** (แบ่งครึ่งโซนที่กว้างสุด) · แก้ทิศ (องศา) · เปลี่ยนสี · **ลบโซน** (พื้นที่รวมกับโซนข้างๆ) · ชื่อ / รถ (มีแล้ว)
  - `BusTrip.cancelled / time / extra` · store cancelTrip / restoreTrip / setTripTime / saveExtraTrip / deleteExtraTrip / addRiderToTrip / removeRiderFromTrip / setCompanion · tests (12 ใน transport)
- รอบ 2 (ยังไม่ทำ): หน้าคนขับใน LINE ติ๊กรับ/ส่ง · แจ้งผู้ปกครองรถใกล้ถึง · รายงาน

### LINE Rich Menu เปิดช้า → เร็วขึ้น ~20 เท่า
- สาเหตุ: tunnel ชี้ไปที่ dev server → มือถือต้องโหลด JS แบบ dev 11 MB (36 ไฟล์) ≈ 20 วิ
- แก้: `npm run line` build หน้าผู้ปกครองเป็น production แยกที่พอร์ต **3311** (`.next-line-a/-b` สลับกัน) แล้วให้ tunnel ชี้ไปที่นั่น · โค้ดเปลี่ยน = build ใหม่เองหลังหยุดแก้ 20 วิ (~13 วิ) · Staff ยังใช้ dev 3310 เหมือนเดิม · `LINE_DEV=1 npm run line` = แบบเดิม
- เบาลงอีก: root layout โหลด Staff shell (store + พจนานุกรม 4,000 วลี) เฉพาะหน้า Staff (`components/app/shell-gate.tsx`) · `subject-color.ts` ไม่ import store/i18n แล้ว (shell เสียบให้) · `/liff/form` แยก parent app กับฟอร์มเป็น dynamic import (`form-app.tsx`)
- ผล: เปิด Rich Menu โหลด 0.24 MB ≈ 1 วิ ผ่าน tunnel

### Mockup ในแอปผู้ปกครอง
- ครอบครัวที่ผูก LINE จริงแต่ไม่มีคลาสข้างหน้า → ได้ลูก demo "ใบเฟิร์น" (`store/linked-demo.ts` + test) เรียน 2 คลาสจริง (คณิต อ. 16:00 · อังกฤษ พ. 17:00) แพ็กเกจจ่ายแล้ว เช็คชื่อย้อนหลัง โน้ตที่ส่งแล้ว 3 อัน และวันใช้รถ (Liclass) · ทำทุกครั้งที่ reseed / รีเซ็ตข้อมูล · persist v91
- `vitest.config.mts` ใส่ alias `@/` → เทสโหลด seed ได้

### LINE
- tunnel เปลี่ยน URL อีก (19 ต.ค. 08:10) → LIFF ค้าง URL เก่าอีก · LINE Developers หลุด login → เจ้าของต้อง login + ใส่ `LINE_LOGIN_CHANNEL_SECRET` ใน `erp-v2/.env.local` (ทางแก้ถาวร)
- ✅ เจ้าของใส่ `LINE_LOGIN_CHANNEL_SECRET` แล้ว (บรรทัด 19 ของ .env.local — คนละตัวกับ LINE_CHANNEL_SECRET ของ Messaging API) · `npm run line` อัปเดต LIFF endpoint เองได้แล้ว (เช็คใน Console ตรงกัน) → tunnel เปลี่ยน URL ไม่ต้องแก้มืออีก · **เครื่องอื่นต้องใส่ secret นี้ใน .env.local ของเครื่องนั้นด้วย** (ไฟล์ไม่ขึ้น git)

## 2026-10-15 — Nock ลากแล้วไหลเข้ามุม, Workload ครู, เปิด/ปิด AI Helper

- **Nock:** ปล่อยเมาส์แล้วไหลจากจุดที่ปล่อยเข้ามุมจอ ไม่หยุดที่ขอบ เอียงแอบมองต่อในจังหวะเดียว (ease-in-out 400 ms) · hover ออก/กลับ 400 ms
- **บุคลากร:** คอลัมน์ "คาบ / สัปดาห์" (EN: Session / Week) แสดงแค่ `6 (5.8hr.)` · คอลัมน์ Workload = ไอคอนเดียว ตามวันที่สอนมากสุดในสัปดาห์: 1–2 คาบ Healthy · 3–4 Warning · 5+ Load! (`workloadOf` ใน `staff-overview.ts`) — **logic จะมาแก้กันทีหลัง (เจ้าของบอก)**
- **Settings › ระบบ › AI (Nock):** สวิตช์เปิด/ปิด AI Helper ให้ทุกคน (`SystemConfig.aiHelper`, ไม่ตั้ง = เปิด)
- **รอบ 2:** Workload เห็นเฉพาะ Manager ขึ้นไป (`reports.view`) + ⓘ อธิบายแต่ละสถานะ · Reports › Operations มี "Workload ครู" (จ.–อา. ระบายสีรายวัน) · ไม่แสดงป้าย "ปิดบัญชีแล้ว" ในตารางบุคลากร (แถวยังจาง)
- **AI Helper รายสาขา:** การ์ดในหน้า Settings ของแต่ละสาขา (`Branch.aiHelper`) — Nock แสดงเมื่อเปิดทั้งระบบ **และ** เปิดที่สาขา
- **ปฏิทิน:** ⋯ ที่หัวครูแสดงทุกวัน (วันที่ผ่านไปแล้วบอกว่าแก้ได้ที่ Side Panel ของคาบ · วันที่ยังไม่มีคลาส = สร้างคลาสให้ครูคนนี้)
- **Note Calendar** (`CalendarNote`, `domain/rules/calendar-notes.ts`): แยกจาก Note ของนักเรียน · 2 แบบ ถาวร (ปักหมุด แสดงทุกคาบของคลาส — ต้องเป็นคาบของคลาสประจำ) / ชั่วคราว (เฉพาะคาบนั้น) · แก้ไข / ลบได้ (⋯ ต่อ Note) · ทุกการเพิ่ม/แก้/ลบลง Log · persist v89

### ภาษา: เทสกันคำแปลหลุด + ไฟล์คำแปลให้ Dev (2026-10-16)
- `src/lib/i18n-coverage.test.ts` สแกนโค้ดทุกไฟล์ (TypeScript AST) หาข้อความไทยที่โชว์ในหน้า Staff → ถ้าไม่มีคำแปล EN/JA เทสล้ม (`npm test`) = เพิ่มข้อความใหม่แล้วลืมแปลไม่ได้อีก
- เจอ 165 วลีที่ยังไม่มีคำแปล → แปลครบแล้ว (`i18n-dict/coverage.ts`) · ตอนนี้ 0 ที่หลุด
- ไม่ต้องแปล (ตั้งใจเป็นไทย): ข้อความ LINE ถึงผู้ปกครอง · ตัวอย่างแชท · คำค้นของ Nock · เอกสาร PDF/Excel (ภาษาไทยตามกฎหมาย) · หน้าผู้ปกครอง (มีตัวเลือกภาษาของตัวเอง)
- `npm run i18n:check` → รายการที่หลุดใน i18n-missing.json · `npm run i18n:export` → `erp-v2/i18n-export/{th,en,ja}.json` (4,361 วลี, key = ข้อความไทย แบบ gettext, {0} = ค่าที่ใส่) ให้ Dev ใช้เป็นคำแปลตั้งต้น
- ย้ายพจนานุกรมไป `i18n-dict/index.ts` (+ `shell.ts`) ไม่ผูก store → เทสโหลดได้

### ธีม: Header โปร่ง · Sidebar/แท็บ/เมนูที่เลือก ตามสีธีม (2026-10-16)
- Header บนสุดไม่มีพื้นหลัง (โปร่ง + blur) · ช่องค้นหาใช้สีการ์ด (ไม่กลืนกับพื้น)
- theme-tuner: --sidebar = สีพื้นเข้มขึ้นนิด โปร่ง 72% · --muted (พื้นแท็บ Segmented / hover) จากสีพื้น · --accent / --sidebar-accent = สีหลักผสมสีพื้น (เมนูที่เลือกเปลี่ยนตามธีม) · ปุ่มแท็บที่เลือกใช้สีการ์ด

### รถรับส่ง Liclass ในใบแจ้งหนี้: แผนที่ + ระยะทาง + รอบรถเต็มไหม (2026-10-16)
- ใบแจ้งหนี้ › ค่ารถ: แผนที่จริง (สาขา B · บ้าน H · เส้นประ · วงพื้นที่รับส่ง) · "ห่างสาขา X กม. (เส้นตรง) → แนะนำประเภทค่ารถ" + ปุ่มใช้ประเภทนี้ · เกินระยะไกลสุด = แดง "นอกพื้นที่รับส่ง"
- ประเภทค่ารถเลือกให้อัตโนมัติตามระยะ จนกว่า Admin จะเลือกเอง
- ทุกวันเรียน: ข้างติ๊ก รับ/ส่ง มีชิปรอบรถ "15:30 · 3/8" · เต็ม = แดง · ไม่มีรอบ = แดง (ถ้าติ๊ก) + แถบเตือน "ไม่มีรอบรถ / รถเต็ม N วัน — แจ้งผู้ปกครอง"
- กฎ `domain/rules/bus.ts` (+ bus.test.ts 4 tests): distanceKm (haversine เส้นตรง — Dev ใช้ระยะถนนจริงได้) · busZone (Fee.maxKm) · roundFor (รับ = รอบล่าสุดก่อนเริ่มคลาส ≤90 นาที, ส่ง = รอบแรกหลังเลิก ≤90 นาที) · roundRiders (นับจากขาในใบแจ้งหนี้ที่ไม่ void + BusAddOn)
- Settings › สาขา › ค่าธรรมเนียม: ค่ารถแต่ละประเภท "ไม่เกิน X กม." · หมุดสาขา · รอบรถ (รับ/ส่ง · เวลา · วัน · ที่นั่ง · ชื่อ) · seed ทองหล่อ: Standard ≤5 กม. / โซนไกล ≤10 กม. + 6 รอบ · persist v90

### ออกใบแจ้งหนี้ = เปิดแผงในหน้าเดิม ไม่เด้งไป Billing (2026-10-16)
- Student panel (ปุ่มล่าง "ออกใบแจ้งหนี้" · แท็บ Billing: ใบใหม่ + คลิกใบเดิม · "ต่ออายุ" ของแพ็กเกจ) · Lead panel · Session panel ("ยังไม่ได้จ่าย → ออกใบแจ้งหนี้") → เปิด InvoiceSheet ซ้อนในหน้านั้นเลย
- เหลือลิงก์ไป /billing เฉพาะจาก Dashboard / แจ้งเตือน (รายการรออนุมัติ)

### เลือกคอร์ส + คลาสที่เดียว = ใบแจ้งหนี้ (2026-10-16 รอบ 3 — แทนรอบก่อนด้านล่าง)
- เจ้าของ: Admin ถามผู้ปกครองในแชท (คอร์สไหน · วันไหน) แล้วเลือกเองในใบแจ้งหนี้ → ลดการส่งฟอร์มไปมา · ไม่ต้องมีหน้าต่างเลือกคอร์ส/คลาสซ้ำ
- ส่งใบสมัครเรียน = ขอข้อมูลครอบครัวอย่างเดียว (ผู้ปกครอง · เด็ก · วันอยากเริ่ม · รถ) ไม่มีตัวเลือกคอร์ส/คลาส (token classOffers = [])
- การ์ดใบสมัครในแชท / CRM → "สร้างนักเรียน + ใบแจ้งหนี้" (approveEnrollment ไม่ใส่คอร์ส = สร้างแค่ครอบครัว+นักเรียน+Lead) → เปิด InvoiceSheet ทันที
- Inbox › + › ใบแจ้งหนี้: Lead ที่ยังไม่มีนักเรียน → convertLeadToStudent ก่อน แล้วเปิดใบแจ้งหนี้
- เลือกคอร์ส (CoursePicker): เพิ่มตัวกรองชั้น ตั้งต้นที่ชั้นของนักเรียน (ล้างได้ = เห็นทุกคอร์ส) · คลาสในใบแจ้งหนี้: ตรงคอร์สก่อน + "แสดงคลาสอื่น" (มีอยู่แล้ว)
- LINE: tunnel เปลี่ยน URL 3 ครั้งเช้านี้ → LIFF ค้าง URL เก่า = Rich Menu/ลิงก์ฟอร์มเปิดไม่ได้ · แก้ Endpoint ใน Console แล้ว · ต้องใส่ LINE_LOGIN_CHANNEL_SECRET ใน .env.local ถึงจะอัปเดตเองอัตโนมัติ

### ใบสมัครเรียน = ร่างใบแจ้งหนี้ + สร้างใบแจ้งหนี้จาก Inbox (2026-10-16)
- เจ้าของตกลง: Enroll form = ใบแจ้งหนี้ที่ยังขาด "คลาส + วันเริ่ม" → ต้องร่าง/สร้างใบแจ้งหนี้จาก Inbox ได้ต่อผู้ปกครอง
- Inbox › + › ใบแจ้งหนี้ (มีลูกหลายคน → เลือกลูก) เปิด InvoiceSheet ในหน้า Inbox เลย · "ใช้เป็นสลิป" เปิดใบที่ค้างอยู่
- ส่งใบสมัครเรียน (Admin): 1 คอร์ส/แพ็กเกจ + จำนวนงวด ที่ตกลงในแชท → 2 คลาสที่เข้ากับคอร์ส (ปุ่ม "ทุกคลาส", ที่ว่าง) → 3 เสนอรถรับส่ง (Liclass / สาขาที่มีค่ารถ)
- ฟอร์มผู้ปกครอง: การ์ด "คอร์สที่ตกลงกันไว้" (ดูอย่างเดียว) · เลือกคลาส · วันเริ่ม · รถ ไป-กลับ / ขาไป / ขากลับ
- ใบสมัครที่ส่งกลับ → การ์ดในแชท "รอสร้างใบแจ้งหนี้" + ปุ่ม "ตรวจ + ร่างใบแจ้งหนี้" (คอร์ส/งวด/คลาส/รถ ติดมาแล้ว)
- กรณีไม่มี LINE: Admin สร้างนักเรียน + ใบแจ้งหนี้ตรงๆ ไม่ต้องใช้ฟอร์ม
- ค้างถามเจ้าของ: Test/Trial ส่งให้ครอบครัวลูกค้าเดิม (ลูกคนที่ 2) ได้ไหม · แนวทาง i18n

### ฟอร์มสมัครเรียน = แบบ Test / Trial (2026-10-16)
- **Flow จริง (เจ้าของ):** ทุกอย่างเริ่มจากคุยใน LINE → แอดมินเสนอตัวเลือก → ผู้ปกครองเลือก · คอร์ส/แพ็กเกจตกลงในแชท แอดมินใส่ตอนออกใบแจ้งหนี้ · ไม่มีสมัครเองจาก Rich Menu (ต้องคุยแอดมินก่อน) · Case ไม่มี LINE = แอดมินสร้างนักเรียน + ใบแจ้งหนี้เอง ไม่ใช้ฟอร์ม
- **แอดมิน:** Inbox › + › ฟอร์ม › Enroll → `SendEnrollDialog` ติ๊กคลาสจริงที่จะเสนอ (ที่ว่าง, กรองวิชา/ชั้น) → `EnrollToken.classOffers`
- **ผู้ปกครอง:** มี classOffers = ถามแค่ "เลือกคลาสที่สะดวก" (หลายวันได้, เต็มเลือกไม่ได้) + วันเริ่ม (+ รถ) — ไม่ถามวิชา/คอร์ส/แพ็กเกจ/ตารางเวลาอีก (ลิงก์เก่าไม่มี offers ยังใช้แบบเดิมได้)
- **ตรวจใบสมัคร (CRM):** คลาสที่ผู้ปกครองเลือกติ๊กไว้ให้ (ติ๊กได้หลายคลาส) · เลือกคอร์ส/แพ็กเกจที่ตกลงในแชท → สร้างนักเรียน + ร่างใบแจ้งหนี้ → จ่ายครบเข้าคลาสเหล่านั้น
- Settings › LINE Rich Menu: เอาลิงก์สมัครเองออก ปุ่ม "สมัครเรียน" = ข้อความเข้าแชท

### UI ทั้งระบบ (2026-10-15 ช่วงบ่าย)
- **Toast / Noti / Hover Card = shadcn Base UI ทั้งหมด:** Toast ระบบมุมขวาล่าง (`lib/toast.ts`, เอา Sonner ออก) · Noti มุมขวาบน (`components/app/noti.tsx`) · ป้ายชี้ทุกจุดเป็น Hover Card (เหลือ Tooltip แค่ sidebar ตอนพับ)
- **ปฏิทิน:** การ์ดคลาส = บรรทัดบน วิชา + ไอคอนประเภท (Trial ฟ้า · Test ม่วง · Interview ส้ม · อื่นๆ เทา) + สถานะ · บรรทัดสอง เวลา + 🚪ห้อง 👥นักเรียน ประเภทกลุ่ม ครูร่วม · ไอคอนชุดเดียวทุกมุมมอง (`work-state.tsx` WORK_ICON, `session-meta.tsx`) · กดทั้งการ์ดเปิด Panel · ช่องว่างกด = สร้างคลาส · ปุ่มทุกชั่วโมง / ตั้งช่วงเวลา / ซ่อนวันว่าง อยู่บรรทัด Filter · Week/Month เต็มจอ · List = DataTable เรียงได้ มีคอลัมน์ประเภท · เรียนบางช่วง = ไอคอนนาฬิกา · ตัวย่อวิชา En/Ma/Sc/Jp/EA/EG (ตั้งได้ที่ Settings › วิชา)
- **Panel คาบ:** แท็บข้อมูลคาบมีไอคอนทุกบรรทัด · จัดการ Note ได้ (📌 = ถาวร, 🗑, ✓) · เหตุผลครูลา = Chip (อื่นๆ ต้องกรอก)
- **ตาราง:** คอลัมน์สาขาใน นักเรียน/ครอบครัว/บุคลากร/บิล/CRM (2 สาขา + "N+") · Super Admin/Director/Dev = All · บุคลากรซ่อน อีเมล/Class·Month/Student·Month เป็นค่าเริ่มต้น (`defaultHidden`)
- **บั๊ก:** ครอบครัวที่ผูก LINE จริงไม่ถูกรีเซ็ตชื่อ/ผู้ปกครองตอน reseed แล้ว (`store/keep-line-links.ts`) — ชื่อที่เจ้าของตั้งครั้งก่อนหายไปแล้ว ต้องตั้งใหม่ 1 ครั้ง
- **ภาษา:** ตอนนี้แปลด้วยตัวแปลหน้าจอ + พจนานุกรม (ไม่ใช่ i18n แบบ key) — เสนอเจ้าของ 2 ทาง: ให้ Dev ใช้ next-intl ในระบบจริง หรือย้าย prototype ทีละหน้า (รอเจ้าของเลือก)

### Workload (2026-10-15 รอบ 3 — แทนของเดิม)
- เห็นเฉพาะ **Director** · หน้าบุคลากรมีคอลัมน์ **Class / Month** (คลาสไม่นับซ้ำ, คาบเดี่ยว = 1) และ **Student / Month** (นักเรียนไม่นับซ้ำ) — กดหัวคอลัมน์ = เรียงมาก→น้อย (`monthLoad` ใน `staff-overview.ts`)
- **ไม่มีเกณฑ์ เยอะ/น้อย** (เอา Healthy/Warning/Load! ออก) · **เอา Workload ออกจาก Reports** — เจ้าของ: เทียบครูบนหน้า Report อันตราย

### AI Helper (Nock) — ลอง Silk shader แล้ว ไม่เอา (2026-10-15)
- ลองทำลูก Nock เป็น shader "Silk" เคลื่อนไหว + กระจกฝ้า + ทรงกลมมีแสงเงา + สีชมพูแบรนด์ → เจ้าของ: "อุบาทมาก" **ย้อนกลับเป็นลูกกลมสีฟ้าแบบเดิมทั้งหมด** และ **ไม่ต้องแก้อะไรที่เกี่ยวกับ AI Helper อีก**

### ฟอร์มผู้ปกครอง = หน้า Admin สร้างเอง (2026-10-15)
- **ช่องชุดเดียวกัน** `components/people/person-fields.tsx` — ParentFields / FamilyFields / StudentFields ใช้ทั้งฟอร์ม LINE (`/liff/form` ทั้ง Test/Trial และสมัครเรียน) และ Panel ของ Admin (`FamilyForm`, `StudentForm`) — **เพิ่ม/แก้ช่องที่ไฟล์นี้ที่เดียว** ป้ายมาจากพจนานุกรมฟอร์ม (TH/EN/JP), Admin ใช้ TH
- **ชื่อ = ชื่อ + นามสกุล** แยกช่องทั้งสองที่ · **ชื่อครอบครัว** ไม่บังคับ — ไม่ใส่ = "ครอบครัว" + นามสกุลผู้ปกครองหลัก (`familyNameFor`, `familyFromSubmission` เปลี่ยนจากนามสกุลเด็ก → ผู้ปกครองหลัก)
- **ช่องเสริม (ไม่บังคับ) ผู้ปกครองเห็นด้วย:** ชื่ออังกฤษ (ผู้ปกครอง/นักเรียน/ชื่อเล่น/ครอบครัว), เพศ · โรงเรียนใช้ตัวเลือกจากรายชื่อกระทรวง (SchoolPicker) ทั้งสองที่ → ได้ `schoolId` ด้วย · ชื่อเล่นไม่บังคับ (ไม่ใส่ = ชื่อจริง)
- **เอาช่อง "LINE ID" ออก** — เปิดฟอร์มใน LINE = ผูก LINE อัตโนมัติอยู่แล้ว (ขึ้นป้าย "เชื่อม LINE แล้ว") · ข้อมูล lineId เก่ายังอยู่ไม่ลบ
- Admin มีเพิ่มแค่ส่วน "สำหรับเจ้าหน้าที่" ในนักเรียน: ผูกครอบครัว + ใช้รถรับส่ง · Admin ได้ช่องที่เคยขาด: หลายเบอร์ + เบอร์หลัก, จังหวัด, หมุดแผนที่, รายละเอียดที่อยู่, รู้จักเราจาก
- ข้อมูลใหม่ไหลครบ: types (`FormStudentExtras`, `FormSubmission.student*`, `familyName`) → API submit → อนุมัติฟอร์ม → นักเรียน/ครอบครัว · `buildFormPrefill` ส่งกลับไปให้ฟอร์มครั้งหน้า (+ test)

### Inbox (2026-10-15)
- **ชิดขอบเต็มจอ:** เอา margin ทั้ง 4 ด้านออก — `main` ไม่มี padding เฉพาะ `/inbox` (`app-shell.tsx`) · รายการแชท + ห้องแชทเต็มพื้นที่ใต้แถบบน ไม่มีกรอบการ์ดมุมโค้ง
- **แชทแบบ ChatGPT:** ฝั่ง ERP = bubble เทาขวา · ฝั่งลูกค้า = ตัวหนังสือเปล่าซ้าย ไม่มีสี ไม่มี avatar · bubble ไม่มีเวลาแล้ว → ตัวคั่นวัน (วันนี้ / เมื่อวาน / วันที่) ด้วย shadcn **Marker** (`components/ui/marker.tsx` เขียนเองตาม API ในเอกสาร — เครื่อง Cloud ต่อ ui.shadcn.com ไม่ได้) · hover ข้อความ = ผู้ส่ง + วันเวลา (Hover Card) · โน้ตภายใน = Marker 🔒 สีเหลืองอำพัน · กฎ `chatDayLabel` / `groupByDay` ใน `domain/rules/inbox.ts` (+ test)
- **AI Elements ที่เอามาใช้:** Suggestion = ข้อความตอบเร็วเหนือช่องพิมพ์ (`QUICK_REPLIES`, กดแล้วเติมในช่อง ยังต้องกดส่งเอง, ซ่อนเมื่อเริ่มพิมพ์) · Message Scroller = เปิดแชทแล้วเลื่อนไปข้อความล่าสุด ข้อความใหม่เลื่อนตามถ้าอยู่ล่างสุด
- **Confirmation (AI Elements):** การ์ดอนุมัติ / ปฏิเสธฟอร์ม Test/Trial ใช้กรอบเดียวกันทั้งหมด (`components/ai-elements/confirmation.tsx`) — หัวการ์ด ไอคอน · ชื่อ · สถานะ (รอผู้ปกครองตอบ / รออนุมัติ / อนุมัติแล้ว / ปฏิเสธแล้ว) · ปุ่ม ปฏิเสธ / อนุมัติ อยู่ท้ายการ์ด · อนุมัติแล้วท้ายการ์ด = ดูในปฏิทิน · การ์ด "ส่งฟอร์ม" ฝั่งเราใช้กรอบเดียวกัน · Lead sheet ใช้การ์ดเดียวกัน (เอากรอบซ้อนออก)
- **แชท:** ระยะห่างระหว่างข้อความมากขึ้น (space-y-6, ขอบซ้ายขวา px-10) · เลื่อนแชทแล้วขอบบน/ล่างจางลง (mask fade 2rem)

### LINE (2026-10-15)
- **LINE ไม่ต้องตั้งใหม่อีก:** `npm run line` (`erp-v2/scripts/line-up.mjs`) เปิด tunnel → ตั้ง Webhook (+ทดสอบ) → ตั้ง LIFF Endpoint (ต้องมี `LINE_LOGIN_CHANNEL_SECRET` ใน .env.local) → เก็บ URL ที่ `.data/public-url.json` → tunnel หลุดเปิดใหม่+ตั้งใหม่เอง · `LINE_PUBLIC_URL` = โดเมนคงที่ (ngrok static) ถ้ามี
- **ความปลอดภัย tunnel:** `src/proxy.ts` — เข้าผ่าน tunnel ได้แค่ /liff, webhook, API ฝั่งผู้ปกครอง, รูปที่ส่งให้ผู้ปกครอง · หน้า staff/Inbox/Settings/API ส่งข้อความ = 404 (localhost + Wi-Fi ออฟฟิศใช้ได้ปกติ)
- **รันเองตอนเปิดเครื่อง:** `zsh erp-v2/scripts/install-line-service.sh` (ปิด: `... off`) — เจ้าของต้องรันเอง (Claude ติดสิทธิ์ติดตั้ง LaunchAgent)

## 2026-10-14 — AI key ใน Settings, คุยกับ Nock แบบส่วนตัว, Course Summary มีกราฟ + AI ประเมิน

- **Settings › ระบบ › AI (Nock)** (แท็บเหมือน LINE Integration): เลือก Google Gemini / OpenAI → วาง key → เลือก model → ทดสอบการเชื่อมต่อ · key เก็บฝั่ง server (`erp-v2/.data/ai-config.json`, git-ignore) ส่งกลับมาแค่แบบซ่อน · `/api/nock` + `/api/ai/course-summary` ใช้ key นี้ก่อน แล้วค่อยใช้ `.env.local`
- **Nock คุยส่วนตัว**: ถามอะไรก็ได้ ไม่ต้องเลือก Part · ไม่เข้าคลังเอง · เมื่อ Nock ตอบไม่ได้ หรือผู้ถามกด 👎 / "ให้ผู้รู้ช่วยตอบ" → Nock ถามว่าจะส่งเข้าคลังให้ผู้รู้ไหม (เลือก Part แล้ว สร้าง / ไม่สร้าง) · store: `promoteNockQuestion` / `declineNockPromote`, `inBank`
- **Course Summary**:
  - ครูให้คะแนน "ความเข้าใจวันนี้" 1–5 ตอนเขียนสรุปคาบ (`LessonSummary.level`, `Sum.LEVEL_LABEL`)
  - การ์ด Course Summary มี KPI (เช็คชื่อ / มาเรียน % / เข้าใจเฉลี่ย / พัฒนาการ), กราฟเส้นความเข้าใจรายคาบ (+ค่าเฉลี่ย 3 คาบ), กราฟแท่งเข้าเรียนรายเดือน, กล่อง "AI ประเมินพัฒนาการ" (`components/app/course-progress.tsx`, กฎ `Sum.courseProgress`)
  - Generate Summary → ถ้าตั้งค่า AI แล้ว AI เขียน 3 ช่อง + ประเมิน (ไม่ส่งชื่อนักเรียน); ยังไม่ตั้งค่า → ใช้ร่างจากกฎเหมือนเดิม
  - Bundle = ฟอร์มเดียว แยกบรรทัดตามวิชา · สรุปคาบของคลาส Bundle เขียน "คณิต: … · อังกฤษ: …" แล้วระบบแยกให้ (`noteForSubject`)
  - ตัวอย่าง: นักเรียน ป.6 ทองหล่อ 6 คนในคลาส คณิต+อังกฤษ 3 เดือน แต่ละคนมีเส้นเรื่องต่างกัน (ดีขึ้น / ลดลง / คงที่) · persist v81
- Course Summary (ต่อ): ตารางแถวละคอร์ส (ชั้น · ประเภท Single/Bundle · ครู · กำหนดส่ง · สถานะ) + All/Pending/Done + filter วิชา/ครู · เปิดเป็น Side Panel (Info → แก้ไข) · Bundle ดูทั้งคอร์ส / แยกวิชา · คาบ Bundle ให้คะแนนความเข้าใจแยกวิชา · ทุก Course Summary มีประวัติคาบ (seed v85)
- Nock: ไม่มีการ์ดเด้งทุกคำตอบ → ⋯ หลังคำตอบ (สร้างคลังความรู้ / ถึง Dev / ค้นหาใกล้เคียง) · หัวแชทเหลือ Nock + ⋯ + ✕
- LINE: ข้อความสรุปจบคอร์สมีลิงก์ `https://liff.line.me/<LIFF>?app=parent&cs=<id>` → App ผู้ปกครองเปิดหน้าสรุป + กราฟทันที · tunnel ใหม่ (quick tunnel URL เปลี่ยนทุกครั้ง — ต้องอัปเดต Webhook URL + LIFF Endpoint ใน LINE Console)
- ย้ายวัน 2 แบบ (session panel › ย้ายวัน): **ครั้งนี้ครั้งเดียว** = ภายในสัปดาห์นี้ + สัปดาห์หน้า (`RESCHEDULE_WEEKS`) · **ตั้งแต่ครั้งนี้เป็นต้นไป** = ย้ายคลาสถาวร (`moveStudentToClass`: ออกจากคาบที่ยังไม่เริ่มของคลาสเดิม เข้าคลาสใหม่ แพ็กเกจจบวันเดิม ไม่ยืด) · ทุกคนย้ายได้ (สิทธิ์ใหม่ `student.move`, ครู = เฉพาะคาบตัวเอง) · ทุกการย้ายเข้า Log (ใคร/เมื่อไร/จากไหน→ไหน) + ป้าย "ย้ายมาแล้ว N ครั้ง" ในหน้าย้าย (`movesOf`)
- LINE parent app จอดำ = localStorage เต็ม (seed 6.4M) → storage ไม่ throw, หน้า /liff ไม่แตะ store, ประวัติคาบ ≤ 8/คอร์ส · reseed เก็บการผูก LINE ไว้ (`keepLineLinks`)
- **แจ้งลา / แจ้งลาออก จาก LINE** (App ผู้ปกครอง แท็บ "แจ้งเรื่อง", deep link `?app=parent&act=leave|exit`): ผู้ปกครองเลือกคาบที่จะลา หรือวันสุดท้าย+เหตุผล → `/api/parent-view/requests` (ยืนยันตัวตนด้วย LIFF token, ไฟล์ `.data/parent-requests.json`) → ERP ดึงทุก 20 วิ (`ParentRequestWatcher`) เป็นแจ้งเตือน + เด้ง + Dashboard → หน้าแจ้งเตือน › คำขอผู้ปกครอง: บันทึกลา (หัก/ไม่หักโควตา) · รับเรื่องแจ้งออก (`exitFromParent`) · ไม่ดำเนินการ+เหตุผล — ผู้ปกครองได้ข้อความ LINE ทุกขั้น · token LINE หมดอายุ → login ใหม่เอง
- **แปลภาษาทุกหน้า** (ชิป TH / EN / JP): `lib/screen-translate.ts` แปลข้อความไทยบนจอทั้งหมด (+ placeholder / tooltip) ตอนแสดง — ประโยคตรงตัว → แยกตาม " · " → pattern ที่มีตัวเลข/ชื่อ · พจนานุกรม ~2,900 วลี EN+JA ดึงจากโค้ด (`i18n-dict/auto.ts`) + `vocab.ts` · ข้อมูลที่คนพิมพ์ (ชื่อ โน้ต ชื่อคอร์ส) คงเดิม · **ข้อความไทยใหม่ต้องเพิ่ม EN+JA ใน i18n-dict**
- ตอบเจ้าของ: Memo ช่วงพิเศษแทน Memo แบรนด์ (เป็นแบบนี้อยู่แล้ว) · แท็บ Settings ไม่ต้องมีหน้า info แยก (หน้าแรก = ข้อมูลสาขารวม)

## 2026-10-13 — Nock (AI ผู้ช่วย + คลังคำถาม), Max Student ต่อคอร์ส, หน้า list มาตรฐานเดียว

**Nock — ผู้ช่วยในระบบ (เจ้าของสั่ง 13 ต.ค.)**
- ปุ่มลอย ✦ มุมขวาล่างทุกหน้า (ทุก role) → หน้าต่างแชท · ตอบ**ตามสิทธิ์ของคนถาม** (เช่น Admin ถามเพิ่มวิชา → บอกว่าทำเองไม่ได้ ต้องให้ Super Admin/Director + ลิงก์ไปหน้านั้น) · v1 = ตอบ + พาไปหน้า + ส่งให้ทีม (ยังไม่ทำงานแทน)
- **ทุกคำถามถูกเก็บ** → หน้า `/nock` "คลังคำถาม Nock" (เมนู ระบบ) · คำถามที่ Nock ตอบไม่ได้ / คนถามกด 👎 / กด "ส่งให้ทีม" = **ยังไม่มีคำตอบ** + แจ้งเตือน Super Admin / Director / Area Manager / Manager (คนตอบได้) · คนอื่นเห็นเฉพาะคำถามของตัวเอง
- คนตอบ → คำตอบกลับไปที่แชทของคนถาม (+ แจ้งเตือน) และ**เข้าคลังความรู้** (เลือกได้ว่าบอกทุกคนหรือเฉพาะบางบทบาท) → คนต่อไปถามคล้ายกัน Nock ตอบจากคลังทันที = "เรียนรู้" · แท็บคลังความรู้ แก้/เพิ่ม/ลบได้ + นับว่าใช้ตอบไปกี่ครั้ง
- AI: `/api/nock` ใช้ **GEMINI_API_KEY หรือ OPENAI_API_KEY** ใน `erp-v2/.env.local` (ตัวอย่างใน `.env.local.example`, `NOCK_MODEL` เปลี่ยนรุ่นได้) · **ยังไม่ได้ใส่ key** → ตอนนี้ Nock ตอบจากคู่มือในระบบ (`NOCK_GUIDE` 19 หัวข้อ) + คลังความรู้ · กฎทั้งหมดอยู่ `domain/rules/nock.ts` (+ tests)
- **รอบ 2 (13 ต.ค.):** คำถาม = คลังความรู้ (ทีมตอบแล้ว = ความรู้ · สร้างความรู้เองได้) · **Location** = คนถามเลือกเองว่าเกี่ยวกับส่วนไหนของระบบ (หลายส่วนได้ · ส่งไม่ได้ถ้ายังไม่เลือก) · ตารางแสดง ใคร / Role / สาขา / วันที่ เวลา / Location / 👍👎 / สถานะ · ตัวกรอง ช่วงวันที่ · ค้นหา · Staff · Status · Location · สาขา · 👍/👎 ต่อความรู้ (คนละ 1 โหวต · 👍👎 ของคนถามต่อคำตอบที่ Nock ดึงจากความรู้ = โหวตให้ความรู้นั้นด้วย)
- ข้อกำหนดสำหรับ Dev: เก็บ `nock_questions` (คำถาม + คำตอบ + locations + votes) ใน DB (prototype ใช้ localStorage) · ระบบจริงควรค้นคลังด้วย embedding แทน trigram

**เรื่องถึง Dev (13 ต.ค.):** role ใหม่ **Developer** (`dev.manage`, ตัวอย่าง: เดฟ) · ใน Nock ปุ่ม "ส่งถึง Dev" → ประเภท (บั๊ก / ขอความช่วยเหลือ / ข้อเสนอแนะ / คำถาม) + หัวเรื่อง + รายละเอียด + Location · แนบหน้า/สาขา/role อัตโนมัติ · เลขที่ DEV-0001 · หน้า Nock มีแท็บ "เรื่องถึง Dev" · Staff เห็นเฉพาะของตัวเอง Developer เห็นทั้งหมด · Dev ตอบ + เปลี่ยนสถานะ (ใหม่ → รับเรื่อง → กำลังทำ → เสร็จ / ไม่ทำ ต้องใส่เหตุผล) คนแจ้งได้แจ้งเตือนทุกครั้ง · คำถามการใช้งาน: หลายคนตอบได้ (แก้ได้เฉพาะของตัวเอง) โหวตเลือกคำตอบที่ Nock ใช้ · ทุกคนโหวตคำตอบของ Nock ได้ · All / Pending / Done

**อื่นๆ วันนี้:** Max Student = ต่อ**คอร์ส** (รวมทุกคลาส · เต็มแล้วเลือกคอร์สในใบแจ้งหนี้ให้นักเรียนใหม่ไม่ได้ ต่ออายุได้) · ตารางเลือกคอร์สในใบแจ้งหนี้เป็น Table · ข้อความอธิบายใน Panel/ฟอร์ม → ไอคอน ⓘ (`InfoTip`) · คาบเรียน/รายงานเข้าเรียน/สรุปการเรียน ใช้แถวเดียวกัน (`SessionLine`: แถบสี + เวลาเริ่ม–จบ + สถานะท้ายสุด) + แถบเครื่องมือ 2 แถว (ค้นหาซ้าย ตัวกรองขวา) · สรุปการเรียน 6 สถานะ + ปุ่มซ่อน "ส่งแล้ว" · Dashboard ต้องจัดการ = การ์ดต่อกลุ่ม · Settings: แท็บแนวนอน, สาขาจัดกลุ่มแบบตัวเลือกสาขา, ข้อมูลสาขาเป็น Info → แก้ไข, วิชา/วันหยุดแยกแท็บ · Memo ช่วงเวลาพิเศษบนใบแจ้งหนี้/ใบเสร็จ · ตัวอย่าง Course Summary Single + Bundle

### ค้าง / ต้องถามเจ้าของ
- [ ] ใส่ API key ของ Gemini หรือ OpenAI (เจ้าของใส่เองใน `.env.local`)
- [ ] Course Summary ของ Bundle: ฟอร์มเดียวแยกบรรทัดต่อวิชา (ตอนนี้) หรือแยกฟอร์มต่อวิชา
- [ ] Memo ช่วงเวลาพิเศษ: แทน (ตอนนี้) หรือต่อท้าย Memo แบรนด์
- [ ] Settings แท็บอื่นเป็น Info → แก้ไข ด้วยไหม
- [ ] "รอส่งไป Approve" = ครูส่งแล้วรออนุมัติ ใช่ไหม

---

## 2026-10-12 (ดึก) — ปฏิทินรายวัน, โน้ตหลายอัน, ยกเลิกการลาครู, Dashboard สัปดาห์/เดือน, CRM

- **ปฏิทิน › รายวัน** = บอร์ดครูแบบเดียวกับ "ตารางครูทั้งสัปดาห์" (มีรายชื่อนักเรียน) แต่คอลัมน์เวลาเป็นชั่วโมงเรียงกัน ไม่มีแถบ Room คั่น — ห้องอยู่ในช่องคลาสเลย · ปุ่ม "ทุกชั่วโมง / เฉพาะเวลาที่มีคลาส" ที่หัววัน (`WeekTeacherBoard dayCount=1`)
- **หัวครูบนบอร์ด:** ปุ่ม ⋯ ไม่กินที่จนกว่าจะ hover แล้วเลื่อนออกมาดันตัวเลข
- **โน้ตบนบอร์ด:** เพิ่มได้หลายอัน (+ Note) แต่ละอันบรรทัดของตัวเอง ใหม่สุดก่อน + เวลา (วันนี้ = 13:00, เก่ากว่า = 2d) · เก็บเป็น `StudentNote` ที่มี `sessionId` → ขึ้นในแท็บโน้ตของนักเรียน ("จากคาบ คณิต · 12 ต.ค. 09:00") และใน Session sheet ด้วย
- **ยกเลิกการลาของครู:** store `undoTeacherLeave` — ครูกลับมาสอน (เอาครูแทนออก / คาบที่ยกเลิกกลับมา + เอาคาบที่ยืดให้นักเรียนคืน) ถ้าครูติดคาบอื่นจะไม่ยอม · ปุ่ม "ยกเลิกการลา" ใน Session sheet + เมนู ⋯ หัวครูบนบอร์ด "ยกเลิกการลา (ทั้งวัน)"
- **ปฏิทิน › สัปดาห์:** ปุ่มมุมซ้ายบน ซ่อนวันที่ไม่มีคลาส (`?hideEmpty=1`)
- **Dashboard สัปดาห์/เดือน** (เดิมมีแค่ KPI 3 ใบ): มาเรียน % · นักเรียนหลุด · Lead ใหม่ · กราฟรายรับรายวัน · คาบเรียน (เรียนแล้ว/ที่เหลือ/ยกเลิก) · รายชื่อนักเรียนใหม่ · นักเรียนหลุด · Lead ใหม่ตามช่องทาง (`PeriodOverview` ใน app/page.tsx)
- **CRM ตาราง:** คอลัมน์รูปแยกจากชื่อ · ขั้นตอนแยกสี (ติดต่อ ฟ้า · นัดสอบ ม่วง · ทดลอง เหลือง · ปิดการขาย ส้ม · ลงทะเบียน เขียว · คลัง เทา) · Lead ในคลังแสดงจาง · เอาคอลัมน์ "กู้คืน" ออก (กู้คืนได้ที่ ⋯ ใน Lead panel) · แถบเครื่องมือไม่ตกบรรทัดตอนเปลี่ยนมุมมอง (จำนวนดูที่ pager) · Kanban/ตาราง เป็นไอคอน + hover ชื่อ (`Segmented iconOnly`)
- **Sort 3 สถานะทุกตาราง:** ค่าเริ่มต้น (ลำดับของหน้า ไม่มีลูกศร) → ↑ → ↓ → กลับค่าเริ่มต้น (`useSort` ใน data-table.tsx, `SortState.custom`) · CRM: ปุ่มคอลัมน์อยู่หน้าสวิตช์มุมมอง (สวิตช์ไม่ขยับตอนสลับ)
- **ปุ่มคอลัมน์** ทุกตาราง = ไอคอนอย่างเดียว hover "การจัดการคอลัมน์" (ซ่อนกี่คอลัมน์ = ตัวเลขมุม)
- **ชื่อสาขาใน shell** (แถบบน + การ์ดผู้ใช้) = "LIS · ทองหล่อ" แบบเดียวกับเมนูเลือกสาขา (`branchShort`)
- **กฎ: รูป/อวตาร กับ ชื่อ แยกคอลัมน์ทุกตาราง** (เจ้าของย้ำ 3 รอบ)

### ค้าง / ต้องถามเจ้าของ
- [x] **Lead สนใจหลายวิชา** (ทำแล้ว 29 ต.ค.) — ตอนนี้ Lead มีวิชาเดียว (`subject`) เสนอ: เพิ่ม `subjects` หลายวิชา แสดงเป็น chip หลายอันในตาราง/การ์ด แก้ได้ใน Lead panel
- [x] **ผู้ปกครองมีลูกหลายคนใน CRM** (ตัดสินใจ 19 ต.ค.: Lead ต่อเด็ก ผูกครอบครัว) — ตอนนี้ 1 Lead = ผู้ปกครอง + ลูก 1 คน เสนอ: Lead = ครอบครัว มีรายการลูกในนั้น (ชื่อ ชั้น วิชา ขั้นตอนของแต่ละคน) ตารางแสดง 1 แถวต่อผู้ปกครอง + chip ลูกทุกคน หรือแถวต่อเด็กแต่มีป้ายครอบครัวเดียวกัน

---

## 2026-10-12 (ค่ำ) — Data table ที่แต่ละคนจัดเองได้ (`components/app/data-grid.tsx`)

**ทุกตารางรายการใช้ `DataTable` ตัวเดียว** (นักเรียน · ครอบครัว · บุคลากร · คอร์ส · คลาส · CRM ตาราง · ใบแจ้งหนี้ · รายงานเข้าเรียนรายคน) — `TableShell` / `SortHeader` / `Th` เดิมลบแล้ว
- หัวคอลัมน์: ⋮⋮ ลากไปวางตำแหน่งไหนก็ได้ · 🔒 ล็อก = ย้ายไปหน้าสุด + ติดอยู่กับที่ตอนเลื่อนตารางแนวนอน (sticky) · ปลดล็อก = กลับไปตำแหน่งเดิมเสมอ · ⓘ (`info`) ยังใช้ได้
- ไอคอน ⋮⋮ / 🔒 บนหัวคอลัมน์ไม่กินพื้นที่จนกว่าจะ hover — hover แล้วเลื่อนออกมา ดันชื่อคอลัมน์ไปข้างๆ (คอลัมน์ที่ล็อกอยู่ โชว์กุญแจตลอด)
- **hover ต้องไม่ทำให้คอลัมน์ขยาย:** หัวคอลัมน์มีตัววัดความกว้างที่มองไม่เห็น (ชื่อ+ไอคอนเรียง) แถวที่มองเห็นไม่มีความกว้างของตัวเอง → ไอคอนเลื่อนออกมาแล้วชื่อย่อเป็น … แทน · ไอคอนดินสอ/ลูกศรของ `EditCell` วางทับท้ายข้อความ (absolute) ไม่ดันความกว้าง
- ปุ่ม **"คอลัมน์"** ในแถบเครื่องมือ (ก่อนชิปสาขา): รายการคอลัมน์ตามลำดับที่แสดง — ลากเรียง · ติ๊กแสดง/ซ่อน · ล็อก · "คืนค่าเริ่มต้น" · ปุ่มเป็นสีชมพูเมื่อจัดไม่เหมือนค่าเริ่มต้น · คอลัมน์หลัก (`required` เช่น ชื่อเล่น) ซ่อนไม่ได้ และต้องเหลืออย่างน้อย 1 คอลัมน์
- บันทึก **แยกรายคน รายตาราง** (localStorage `nockerp-table-layout`, key = userId:tableId) — สลับคนในโหมดสาธิตจะเห็นของแต่ละคน
- ทุกแถวบรรทัดเดียว ไม่ตกบรรทัด และไม่ตัดเนื้อหา — คอลัมน์ขยายตามเนื้อหา (`width` = ความกว้างขั้นต่ำ)
- **ข้อกำหนดสำหรับ Dev (ระบบจริง):** prototype เก็บ layout ใน localStorage (อยู่ครบหลัง Refresh / Logout-Login แต่ไม่ข้ามเครื่อง/เบราว์เซอร์) → ระบบจริงต้องเก็บในฐานข้อมูล **ต่อผู้ใช้ x ต่อตาราง** เช่น `user_table_prefs (user_id, table_id, column_order[], locked[], hidden[], updated_at)` · โหลดตอน Login / เปิดหน้า · บันทึกทันทีที่ลาก/ล็อก/ซ่อน · "คืนค่าเริ่มต้น" = ลบแถวนั้น · table_id ชุดเดียวกับ prototype (students, families, staff, courses, classes, crm, billing, attendance) · column id ห้ามเปลี่ยนชื่อ (ใช้เป็น key) · คอลัมน์ใหม่ที่ยังไม่อยู่ใน order ที่บันทึก → ต่อท้าย · **การเรียง (sort) ไม่บันทึก — เจ้าของตัดสินใจ 12 ต.ค.:** เปิดหน้า = ระบบเรียงให้ตามค่าเริ่มต้นของหน้านั้นเสมอ ผู้ใช้กดเรียงเองได้ระหว่างใช้งาน (Refresh = กลับค่าเริ่มต้น)
- เพิ่มคอลัมน์ใหม่ = เพิ่ม object ใน `columns` ของหน้านั้น (id ต้องไม่ซ้ำ ไม่เปลี่ยน — ใช้เป็น key ของ layout ที่บันทึกไว้)

**ปฏิทิน:** สวิตช์ "ตารางครูทั้งสัปดาห์ | รายวัน" อยู่หน้าสวิตช์ช่วงเวลา (วัน/สัปดาห์/เดือน/รายการ) · **รายวัน** = ปฏิทินแบบปกติ แถบเวลาด้านซ้าย การ์ดวางตามเวลา เหมือน Week view (`DayView` ใน calendar/page.tsx · กดช่องว่าง = สร้างคลาสเวลานั้น) แทนบอร์ดครู 1 วันแบบเดิม
**Lead panel:** ข้อความ "อัตโนมัติ: …" ใต้ปุ่ม → ไอคอน ⓘ hover อ่าน · ปุ่มหลัก "สร้างนักเรียน (ข้ามสอบ/ทดลอง)" เดิมขึ้นกับทุก Lead ที่ยังไม่มีนักเรียนทดลอง (เป็นทางลัด ไม่ใช่ขั้นต่อไป) → ย้ายไป ⋯ ชื่อ "สร้างนักเรียนทันที (ข้ามสอบ/ทดลอง)" · Lead ใหม่/กำลังติดต่อ ปุ่มหลัก = บันทึกการติดตาม · ขั้นอื่นที่ระบบเดินเอง ไม่มีปุ่มหลัก (ดู ⓘ)
**กฎ: Negative CTA อยู่ในปุ่ม ⋯ ทุก Panel** (`PanelMore` ใน `form-shell.tsx`, ซ้ายสุดของ Bottom bar) — นักเรียน: แจ้งออก / ลาพักยาว · บุคลากร: ปิดบัญชี · คอร์ส: ปิดขาย (เปิดขายอีกครั้ง) · คลาส: ปิดคลาส · ใบแจ้งหนี้: ยกเลิกใบ · Lead มี ⋯ อยู่แล้ว (ปิด Lead) — ไม่มีปุ่มแดงข้างปุ่มหลักอีก
**ลาไม่หักโควตา = ลาพักยาว (เจ้าของยืนยัน 12 ต.ค.):** ในหน้าต่างลาของคาบ ตัวเลือกที่ 2 = "ลาพักยาว · ไม่หักโควตา" → บันทึกเป็น `StudentLeave` (ฟอร์มเดียวกันเป๊ะ `LongLeaveFields` ใน `leave-dialog.tsx` — เลือกได้ 2 แบบ อย่างใดอย่างหนึ่ง: **เลือกคาบ** (เริ่มลา + จำนวนคาบ → แสดงรายการคาบทุกวิชา, วันจบ = คาบสุดท้าย) หรือ **ช่วงวันที่** (เริ่ม–ถึง → แสดงคาบที่อยู่ในช่วงด้วย: "หยุด n คาบ" + วัน เวลา วิชา) + หมายเหตุบังคับ · บันทึกเป็นช่วงวันเสมอ · ลาใหม่เปิดที่ "เลือกคาบ", แก้ของเดิมเปิดที่ "ช่วงวันที่") ตัวเดียวกับ ⋯ › ลาพักยาว — ขึ้นการ์ดในหน้านักเรียน, สถานะ Inactive ช่วงนั้น, ยืดทุกคอร์ส · แถวนักเรียนในคาบมีป้าย "ลาพักยาว" · ไม่สร้างเช็คชื่อแบบ `noQuota` ใหม่แล้ว (ของเก่ายังอ่านได้ และถูกแทนที่เมื่อแก้)
**ตัวเลือกช่วงวัน:** Panel บุคลากรใช้ `RangeStepper` (‹ 12 ต.ค. – 18 ต.ค. 69 › + กลับวันนี้) เหมือนหน้ารายการ

**Side panel นักเรียน:** การ์ด "ลาพักยาว" แสดงเฉพาะเมื่อมีการลาแล้ว · Bottom bar มีปุ่ม ⋯ (ซ้าย) → แจ้งออก / ลาพักยาว (archived → กลับมาเรียน) · ภาพรวม: แสดงเฉพาะคอร์สที่ยังใช้อยู่ · คอร์สที่หมดแล้วย้ายไป **คลาส › ประวัติคอร์ส** (มีลิงก์ "ประวัติคอร์สที่หมดแล้ว n รายการ" ใต้รายการ กดแล้วพาไปเลย · ปุ่มต่ออายุยังอยู่)

**รอบเดียวกัน:** ลูกในตารางครอบครัวแถวเดียว · คอร์ส: นักเรียน/คลาสที่ผูก ชิดกลาง, วันเริ่มชิดขวา (ช่วงวันที่บรรทัดเดียว) · คลาส: สถานะชิดขวา · บุคลากร: ประเภทอยู่หลังชื่อจริง, Full-time (เขียว) / Part-time (เหลือง) เป็น chip · รายงานเข้าเรียน: ชื่อเล่น / ชื่อ-นามสกุล แยกคอลัมน์ · CRM: คอลัมน์สุดท้ายชื่อ "กู้คืน" (ไม่มีลูกศรแล้ว)

---

## 2026-10-12 (ต่อ) — ชื่อไม่มีคำนำหน้า, ความสัมพันธ์ผู้ปกครอง, สีวิชา, รูปบุคลากร, Courses / Classes

- **ชื่อ:** นักเรียนไม่มี ด.ช./ด.ญ. (เพศเป็นฟิลด์ `Student.gender` → ไอคอน ♂/♀ เล็กๆ ข้างชื่อเล่น) · ผู้ปกครอง/Lead ไม่มี คุณพ่อ/คุณแม่ — ตัดอัตโนมัติตอนบันทึก (`cleanStudent` / `cleanParent` ใน `domain/rules/people.ts`) · ฟอร์มนักเรียนมีช่องเพศ
- **ความสัมพันธ์ผู้ปกครอง** = ผู้ปกครอง · พ่อ · แม่ · ญาติ เท่านั้น (`PARENT_RELATIONS`) — คอลัมน์ใหม่ในตารางครอบครัว (แก้ในตารางได้), ฟอร์มครอบครัว + ฟอร์มผู้ปกครอง (LIFF) ใช้ 4 ตัวเลือกเดียวกัน
- **เบอร์โทร** เก็บ/แสดงเป็นตัวเลขล้วน ไม่มี `-`
- **สีวิชา:** Settings › ระบบ › วิชาและวันหยุด — เลือกสีต่อวิชาได้ (วงกลมหน้าชื่อวิชา) + วิชาใหม่เลือกสีตอนเพิ่ม (`system.subjectColors`, palette 11 สีใน `subject-color.ts`)
- **บุคลากร:** ตำแหน่งแต่ละ Role คนละสี (`ROLE_TONE`) · วิชาเป็น chip ตามสีวิชา · คนหนึ่งมีหลาย Role/หลายวิชาได้ (ตัวอย่าง: พลอย = Admin + Teacher อังกฤษ) · **คอลัมน์รูปแยกจากชื่อ** — คลิกรูป → popup อัปโหลด / เปลี่ยนรูป / เอารูปออก (`Staff.photo`)
- **Popup เลือกสาขา (การ์ดผู้ใช้ล่างซ้าย)** โครงเดียวกับ Branch filter: จัดกลุ่ม "สาขา BKK / CBR" · "LIS · ทองหล่อ" + รหัส
- **คอร์ส:** ตารางเดิมพัง (colgroup 11 ช่อง แต่มี 9 คอลัมน์ → ชื่อคอร์สโดนบีบเหลือ 48px) → เปลี่ยนเป็น `TableShell` เหมือนหน้าอื่น: วิชา | ชื่อคอร์ส | ชั้น | ประเภท | Package (ⓘ) | ราคา | นักเรียน | คลาส | สาขา | วันเริ่ม + แบ่งหน้า
- **คลาส:** วิชา กับ ชื่อคลาส แยกคอลัมน์ · ครูแสดงชื่อเล่นอย่างเดียว (+n = ครูร่วม, hover ดูชื่อ) · ไอคอนนาฬิกาเล็กเพราะโดนบีบในคอลัมน์แคบ → `shrink-0` + ขยายคอลัมน์
- **สาขาในตาราง** = รหัสอย่างเดียว (TL, GP, PP) — Courses, Classes, Reports › ความพึงพอใจ
- **กฎ: chip ในตารางห้ามโดนบัง** — ไม่ตัดทิ้ง ถ้าเต็มคอลัมน์ให้ขึ้นบรรทัดใหม่ (`flex-wrap`) · คอลัมน์วิชาของบุคลากรกว้าง 240px
- รอบต่อมา: ราคาในตารางคอร์สแสดงแค่ราคา (ไม่มี / เดือน) · จำนวนนักเรียนในคลาสแสดงแค่ตัวเลข (hover = รับได้กี่คน, เต็ม = สีส้ม) · สถานะนักเรียนชิดขวา · **นักเรียนมีคอลัมน์รูปแยกจากชื่อแล้ว** (`Student.photo`, ใช้ `PhotoCell` ร่วมกับบุคลากร — `components/app/photo-cell.tsx`) · "ไม่มี LINE" = ไอคอน Unlink สีส้ม (hover อธิบาย) · ลูกในตารางครอบครัวแสดงครบทุกคน ไม่ซ่อน
- persist v67 (ข้อมูลตัวอย่างโหลดใหม่)

## 2026-10-12 — ตารางนักเรียน: Course / Package แยกคอลัมน์ + เอาแก้ไขในตารางกลับมา

- **ตารางนักเรียน:** แยก `Course` (ชื่อคอร์ส + "+n") กับ `Package` (เฉพาะป้าย H/W/M + ตัวเลข ไม่มีข้อความรอง, sort ได้) · คอลัมน์ `สถานะ` ย้ายไปท้ายสุด ชิดซ้าย
- **ไอคอน ⓘ บนหัวคอลัมน์:** `SortHeader` มี prop `info` (hover ดูคำอธิบาย) — ใช้แล้วที่ Package (legend H/W/M, สีจาง = หมดแล้ว)
- **แก้ไขในตาราง กลับมาแล้ว** (`components/app/inline-edit.tsx` → `EditCell`) ทุกตาราง เฉพาะบางช่อง ช่องอื่นกด → Side Panel:
  - นักเรียน: ชื่อเล่น · ชื่อ-นามสกุล · ชั้น
  - ครอบครัว: ชื่อครอบครัว · ผู้ปกครองหลัก · เบอร์ · ที่อยู่ · รหัสไปรษณีย์
  - CRM (มุมมองตาราง): ชื่อ · ชั้น · วิชา · ช่องทาง · ผู้รับผิดชอบ · เบอร์ (Lead ที่ archived แก้ไม่ได้)
  - บุคลากร: ชื่อเล่น · ชื่อ-นามสกุล · อีเมล · ประเภท (บัญชีที่ปิดแล้วแก้ไม่ได้)

---

## 2026-10-09 (เย็น) — ERP: มาตรฐานหน้า + Side Panel แบบเดียวกันทุก Entity

**มาตรฐานหน้า (ใช้ทุกหน้า):** Breadcrumb → `PageHeader` (ชื่อ · คำอธิบาย · CTA) → `KpiRow` การ์ด KPI แบบเดียว (`kpi.tsx`) → `Toolbar` (ทุก control สูง h-9 · **ชิปสาขาอยู่ท้ายแถวเสมอ**) → เนื้อหา
- เลือกมุมมอง/ช่วง = `Segmented` เทา · หัวข้อ = `Tabs` ขีดเส้นใต้ · แสดง/ซ่อน = `ShowChip` · คำอธิบาย = `InfoTip` (hover)
- วันที่ทุกหน้า list = `usePeriod()` วันนี้ · สัปดาห์นี้ · เดือนนี้ · กำหนดเอง + ‹ ช่วง › (default สัปดาห์) — Sessions / Attendance / Summaries แสดง **รายวัน** เหมือนกัน (Attendance ยังมีมุมมองรายนักเรียน)
- ชิปสาขา: Director/Super Admin เห็นทุกสาขา · Area Manager เห็นเฉพาะสาขาที่ดูแล · Teacher/Admin/Manager ไม่เห็น
- Reports › ความพึงพอใจ: ซ่อนแถวช่วงเวลา ใช้ Segmented ปี + InfoTip · ครอบครัวโชว์ชื่อไม่มีคำว่า "ครอบครัว" (เรียงได้)

**Side Panel แบบเดียวกันทุก Entity (เจ้าของสั่ง "ต้องเป็นรูปแบบเดียวกันหมด"):** คลิกแถว → Panel ข้อมูล · ปุ่ม แก้ไข → Panel เดียวกันกลายเป็นฟอร์ม · ปุ่มสร้าง → Panel เปิดฟอร์มว่าง บันทึกแล้วกลายเป็นหน้าข้อมูล
- โครง Panel = Header · Body (scroll เฉพาะ body) · Bottom (CTA: ลบ/ยกเลิก/ปิด ซ้าย · หลักขวา) · ตารางดูอย่างเดียว ไม่มีไอคอน action/ลูกศร
- ทำแล้ว: **Course · Family (+Inbox) · Lead · Class · Staff · Student · Invoice**
- โค้ดกลาง `components/app/form-shell.tsx`: `FormShell` (ฟอร์มเดียว render เป็น popup หรือใน panel) · `PanelForm` / `useInPanel` · `EntityPanel` / `PanelBody` / `PanelFooter`
- Invoice: CTA ท้าย = ยกเลิกใบ (ซ้าย) · แก้ไข · สร้าง PDF / อนุมัติ PDF · ส่วนที่ต้องกรอก (ข้อความส่งผู้ปกครอง, บันทึกรับเงิน) ยังอยู่ใน body

### ค้าง / ต้องถามเจ้าของ
- [x] **แก้ไขในตาราง (hover แล้วแก้ได้เลย)** — 12 ต.ค. เจ้าของตอบ: เอากลับ **ทุกตาราง** เฉพาะบางช่อง ช่องอื่นกด → เปิด Side Panel (ดูหัวข้อ 2026-10-12)

---

## 2026-10-09 — เคาะคำถามค้าง (คุยก่อน ยังไม่ Build)

**1. ปฏิทิน › ปุ่ม Summary** = Side Panel ภาพรวมช่วงที่ดูอยู่ (วัน/สัปดาห์/เดือน): ตัวเลขรวม (คลาส/คาบ/ครู/นักเรียน) + **ปัญหาทั้งหมดที่ Admin ต้องจัดการ** (คาบชน, ไม่มีครู, ครูลา, ไม่ระบุห้อง, วันหยุด ฯลฯ) + ตารางคลาส (คลาส · วิชา · ครูหลัก/ร่วม · ห้อง · วัน-เวลา · จำนวนนักเรียน · จำนวนคาบในช่วง) — **Tab สลับ จัดกลุ่มตาม ครู | วิชา** · ดู Summary ของ Staging ก่อนทำ (ห้ามตกช่อง)

**2. ช่วงเวลาพิเศษ**
- ขยายวันจบ → สร้างคาบคลาสพิเศษเพิ่มอัตโนมัติ ✅ · ย่อวันจบ → ยกเลิกคาบที่เกินช่วงใหม่ (เตือนก่อนถ้าคาบมีนักเรียน) ✅
- หยุดคลาสปกติ → เพิ่มตัวเลือก **"สาเหตุ"**: เหตุจากโรงเรียน (NockAcademy/Liclass ปิดเอง) = **ขยายแพ็กเกจให้นักเรียนทุกคนในห้องที่ถูกหยุดคาบ** · เหตุอื่น = ไม่ขยาย

**3. ชื่อ 2 ภาษา** — นักเรียน · ผู้ปกครอง/ครอบครัว · บุคลากร (ครบ 3 กลุ่ม) + **ชื่อเล่น**ด้วย · NA = ช่อง TH + EN · Liclass = ช่อง JP + EN · **EN ไม่บังคับ (Optional)** — ว่าง = ใช้ชื่อที่แปลงอัตโนมัติ (`romanize.ts`) แสดงเป็น placeholder แบบ `Branch.nameEn`

**4. Cohort** — ครบแล้ว (สาขา × ปีที่สมัคร, M0–M12/24, คลิกสาขาดูรายเดือนที่สมัคร) ปิดเรื่อง

**5. Business rule 15 ข้อใน Sheet — ปิดครบ**
- ✅ เคาะไว้ก่อนแล้ว: BL-8 (เลขตอน PDF) · BL-14 · BL-17 (Credit Note 30 ก.ย.) · BL-18 · D8 · G4 · C5 (ข้อ 6)
- **A10 เพิ่มวันหยุดหลังมีคลาส** → Admin เลือกเองว่าจะแจ้งผู้ปกครองหรือไม่ (ตัวเลือกใน dialog เดิม)
- **A7 สร้างคลาสวันที่สาขาปิด** → สร้างได้แต่**เตือนสีแดง**
- **B2 สร้างคาบนอกเวลาเปิด** → **เตือนสีส้ม/เหลือง** ธรรมดา (อาจเกิดได้จริงในอนาคต)
- **F8 ชั้นไม่ตรงคลาส** → **ไม่เตือนตอนดึงนักเรียนเข้าคลาส** (NA = ดุลพินิจ Admin, Liclass กำลังเปิดคลาสหลายเกรด) · **เตือนเบาๆ ตอนเลือก Course ใน Invoice** ว่า Course อาจไม่ตรงชั้นของนักเรียน — ต้องเอาคำเตือน/override เดิม (`attendance.ts` F8) ออกจากจุดเพิ่มนักเรียนเข้าคลาส
- **D4 สรุปการเรียนที่อนุมัติแล้ว** → **ล็อก แก้ไม่ได้อีก** (ไม่ต้องทำประวัติการแก้)
- **G3 Export นักเรียน** → Admin · Manager · Area Manager · Super Admin · Director (ครูไม่ได้) — ตรงกับปัจจุบัน
- **S5 บุคลากรไม่ล็อกอิน** → มีช่อง Email ให้กรอก (ไม่บังคับ) แต่**ไม่ให้สิทธิ์เข้าระบบ** เก็บข้อมูลเฉยๆ — อนาคตอาจเปิดให้เข้าได้
- **S9 มือถือ** → ยังไม่โฟกัส ERP บนมือถือ (ทำในอนาคต)

**6. โควตาลา → ตั้งต่อแพ็กเกจใน Settings › แพ็กเกจ** — ช่อง "โควตาลา (ครั้ง)" ใต้แต่ละบรรทัดใน list แพ็กเกจ **ทุก Tab (ชั่วโมง / สัปดาห์ / รายเดือน)** · ค่าเริ่ม = **4 คาบ : ลา 1 ครั้ง** โดยถือ **1 คาบ = 2 ชม.** (ชั่วโมง: 8 ชม. = ลา 1 · สัปดาห์/เดือน: 4 คาบ = ลา 1) แสดงเป็น placeholder · Admin แก้ได้ ใส่ **0** ได้ (สัปดาห์/เดือนอาจไม่มีโควตาลา) · เสนอ: snapshot โควตาไว้ที่แพ็กเกจที่ซื้อ (Entitlement) ตอนซื้อ แก้ Settings ภายหลังไม่กระทบของเก่า — แทนสูตร `leaveQuota()` เดิม

**ไอเดียใหม่ — App ผู้ปกครอง (School to Parent)** (ยังแค่ไอเดีย)
- ผู้ปกครองดูของลูกทุกคน: วันไหนมีเรียน กี่โมง ใครสอน · Summary · Attendance · เวลารถรับ-ส่ง · (Liclass) ยื่นลาให้ลูกแล้วมีผลจริงบน ERP
- **Version แรก = ดูข้อมูลทั่วไปอย่างเดียว** ยังไม่ต้องมีระบบซับซ้อน · ต้องเชื่อมกับ ERP จริง
- ยังต้องคุย: ทำเป็น LINE (LIFF) / เว็บ / App store · ข้อมูลเวลารถรับ-ส่งยังไม่มีใน erp-v2 (มีแค่ติ๊ก pickup/drop-off ของค่ารถ)

**คุยต่อ App ผู้ปกครอง:** ทำใน LINE (LIFF) ✅ · Version แรก = ดูอย่างเดียว + **รถรับส่งของนักเรียนที่ซื้อรถ** · รถ: ซื้อคอร์ส 2 วัน/สัปดาห์ → เลือกได้ทุกคาบว่ารับอย่างเดียว / ส่งอย่างเดียว / คละ (ตรงกับ BusLeg ต่อวันในใบแจ้งหนี้อยู่แล้ว) · สเปกเต็ม Bus Route อยู่ที่ `new-erp/LOGIC-SPEC-15-bus-route.md`

### ✅ Build แล้ว (เจ้าของ "Build เลย") — 222 tests
- **โควตาลา** — Settings › แพ็กเกจ ทุก Tab มีแถว "โควตาลา (ครั้ง)" ใต้ list (placeholder = ค่าเริ่ม: ชั่วโมง ÷ 2 ÷ 4 · สัปดาห์/เดือน = คาบที่ซื้อจริง ÷ 4) · ตอนจ่ายครบ copy โควตาลงแพ็กเกจ (`Entitlement.leaveQuota`) — แก้ Settings ภายหลังไม่กระทบของเก่า · กฎ `defaultLeaveQuota` / `leaveQuotaFor` (settings.ts) · `Branch.leaveQuotas`
- **A7 / B2** — วันสาขาปิด = เตือนแดง · นอกเวลาเปิด = เตือนส้ม · ทั้งคู่สร้างได้ไม่ต้องใส่เหตุผล (`Issue.tone`)
- **A10** — Dialog เพิ่มวันหยุด / สาขาหยุดวันนั้น: ติ๊ก "แจ้งผู้ปกครอง N ครอบครัว" (ค่าเริ่ม = ไม่แจ้ง) + แก้ข้อความได้ → ส่งเข้าแชทของแต่ละครอบครัว (`familyChatsOf`, `holidayParentText`)
- **F8** — เอาคำเตือนชั้นไม่ตรงออกจากการเพิ่มนักเรียนเข้าคลาส/คาบ · เตือนเบาๆ ตอนเลือก Course ใน Invoice ("อาจไม่ตรงชั้น")
- **D4** — สรุปที่อนุมัติแล้วล็อก: ไม่มีปุ่ม "ดึงกลับไปแก้" · ขอแก้ไขได้เฉพาะตอนรออนุมัติ (`Sum.canRequestChanges`) ทั้ง Session + Course Summary
- **S5** — ช่องอีเมลมีเสมอ (ไม่ล็อกอิน = ไม่บังคับ แต่ถ้ากรอกต้องถูกรูปแบบ) + ป้าย "ไม่ล็อกอิน" ในตาราง
- **ปฏิทิน › Summary** — ปุ่มที่หัวปฏิทิน เปิด Side Panel: ตัวเลขรวม · "ต้องจัดการ" (คาบชน, ไม่มีครู, ครูออกแล้ว, วันสาขาปิด, ตรงวันหยุด, ไม่ระบุห้อง, เกินจำนวน, นอกเวลา, ไม่มีนักเรียน, รอเช็คชื่อ/สรุป, ครูลา, ยกเลิก — คลิกเปิดคาบ) · คลาสทั้งหมด Tab **ตามครู | ตามวิชา** · `domain/rules/calendar-summary.ts`
- **ช่วงเวลาพิเศษ** — ขยายวันจบ → สร้างคาบคลาสพิเศษที่ขาดให้ (`fillPeriodClasses`) · ย่อ/เลื่อน → เตือนจำนวนคาบ+นักเรียนก่อนบันทึก แล้วพักคาบนอกช่วง (`periodShrinkImpact`) · หยุดคลาสปกติ → เลือก **สาเหตุ** เหตุจากโรงเรียน (ค่าเริ่ม, ยืดแพ็กเกจ) / เหตุอื่น · `SpecialPeriod.pauseCause`, `Session.pausedSchool`, `schoolPauseCancels`
- **ชื่อ 2 ภาษา** — ช่อง EN (ไม่บังคับ, placeholder = ชื่อที่แปลงอัตโนมัติ) ของ ชื่อ + ชื่อเล่น นักเรียน · ชื่อครอบครัว + ผู้ปกครอง · ชื่อ + ชื่อที่แสดงของบุคลากร · ช่องหลักขึ้นป้าย (TH) หรือ (JP) ตามแบรนด์สาขา · `nm()` ใช้ชื่อ EN ที่กรอกก่อน romanize · หน้าจอญี่ปุ่นแสดงชื่อที่พิมพ์เป็นญี่ปุ่นตามเดิม (`components/app/name-fields.tsx`)
- **App ผู้ปกครอง v1 (LINE)** — ลิงก์ Rich Menu `https://liff.line.me/<LIFF_ID>?app=parent` (ต้องเปิดที่ endpoint `/liff/form` เพราะ LIFF init ได้เฉพาะใต้ URL ที่ลงทะเบียน) → LINE Login → server ยืนยัน ID token กับ LINE (`/api/parent-view/me`) → ข้อมูลของครอบครัวที่ `lineUserId` ตรง
  - เห็น: ตารางเรียน 30 วัน (วัน เวลา วิชา ครู ห้อง งดเรียน) · รถรับ/ส่งรายวัน (จากใบแจ้งหนี้ + วันรถเพิ่ม) · สรุปการเรียน (เฉพาะที่ส่งแล้ว) · การเข้าเรียน 20 ครั้งล่าสุด · คอร์สที่เหลือ · หลายลูกสลับชิป · TH / EN / JP
  - ERP ส่งข้อมูลขึ้น server อัตโนมัติ (`usePublishParentViews` ใน app shell, หน่วง 4 วิ, เฉพาะครอบครัวที่ผูก LINE) → `.data/parent-app.json` · Staff ดูตัวอย่างได้ที่ ครอบครัว › **ดูแบบผู้ปกครอง**
  - กฎ `domain/rules/parent-view.ts` (`parentView`, `busDaysOf`)

**ข้อจำกัด / ต้องทำต่อ:**
- [ ] **ทดสอบ App ผู้ปกครองจากมือถือจริง** — ต้อง: LIFF app เปิดสิทธิ์ `openid` (ไม่งั้นไม่มี ID token) · endpoint ต้องเป็น URL จริง (cloudflared / Vercel) · ครอบครัวต้องผูก `lineUserId` ที่ Inbox ก่อน · บน localhost LINE Login ขึ้น 400 (ปกติ)
- [ ] **เวลารถรับ-ส่ง** ยังไม่มีในระบบ — แอปบอกแค่ "รับ/ส่ง วันไหน" + ข้อความว่าแอดมินจะแจ้งเวลาทาง LINE · ต้องทำโมดูล Bus Route (เส้นทาง/ETA) ตาม LOGIC-SPEC-15 ก่อน
- [ ] ข้อมูลตัวอย่างยังไม่มีนักเรียนที่ซื้อรถ — แท็บ "รถรับส่ง" จึงไม่โผล่ใน preview (มี test ครอบคลุม)
- [ ] Liclass ยื่นลาจากแอป (Version ถัดไป)
- [ ] ยังไม่ได้รัน `next build` (dev server ใช้ `.next` อยู่) — tsc + eslint + 230 tests ผ่าน

### ✅ รอบเทส (บ่าย 9 ต.ค.) — เจ้าของเทสแล้วสั่งแก้
- **LINE:** สร้าง Rich Menu ใน OA "Nock Test" แล้ว (ช่อง A = `liff.line.me/2011740783-OinXaLm7?app=parent`) · App ผู้ปกครองเปิดได้จริงบนมือถือ ✅ · tunnel ตอนนี้ = cloudflared quick tunnel (URL เปลี่ยนทุกครั้ง → แก้ Endpoint ใน LINE Developers) · ผูก daiBreezy กับครอบครัวใจสู้ในเครื่องนี้ · ปิด hydration warning จาก LINE Android (`suppressHydrationWarning` ที่ `<html>`) · รูป Rich Menu ที่ทำให้: `erp-v2/public/brand/line-richmenu-2500x1686.jpg`
- **บุคลากร:** ตารางดูอย่างเดียว → กดแถวเปิด **Side Panel** (Header · Body scroll อย่างเดียว · Bottom = ปิดบัญชี / แก้ไข) · แท็บ **ข้อมูล** (ภาพรวมสัปดาห์: คาบเสร็จ/เหลือ, สรุปเขียนแล้ว/เหลือ, นักเรียนในมือ, ต้องต่อคอร์ส) · **คาบสอน** (1 สัปดาห์ แยกวัน, ◀▶) · **สรุปการเรียน** (ทุกคาบในสัปดาห์ เขียนแล้ว x/y → กดเปิด Session panel เขียนได้เลย) · โน้ต · Log · กฎ `domain/rules/staff-overview.ts`
- **บทบาทแยกตามสาขา** (`Staff.assignments`: สาขา → บทบาท Manager/Admin/Teacher + วิชา + วันทำงาน) · สิทธิ์เปลี่ยนตามสาขาที่เลือก (`staffAt`, `me()` cached) · จัดครูนอกวันทำงาน = เตือนส้ม · **Area Manager เลือกสาขาที่ดูแล** (`areaBranchIds`) เห็น/ทำได้เฉพาะเขต · **Director / Super Admin ไม่ต้องเลือกสาขา** เห็นทุกสาขา · Admin Export นักเรียนได้แล้ว
- **เลิกแก้ในตารางทุกหน้า** (นักเรียน/ครอบครัว/CRM/บุคลากร) — ลบ `inline-edit.tsx`
- **Chip สาขา** (`components/app/branch-scope.tsx`) ทุกหน้ารายการ + Reports · ตัวเลือก: สาขานี้ · ทุกสาขา · ภูมิภาค · ธุรกิจ · ภูมิภาค×ธุรกิจ · "LIS · ทองหล่อ" · เห็นเฉพาะ Director/Super Admin (ทุกสาขา) + Area Manager (เขตตัวเอง) — สาขาเดียว/Admin/ครูไม่เห็น · ดูหลายสาขา = ป้ายรหัสสาขาต่อท้ายแถว · `?branch=` ใน URL
- **โครงหน้ามาตรฐาน** (`components/app/page-layout.tsx`): แถบบน = Breadcrumb · `PageHeader` (ชื่อ · คำอธิบาย · CTA) · `KpiRow` (4 ใบ, กดกรองได้ — `Kpi onClick/active`) · `Toolbar` (Chip สาขาซ้ายสุด) · ตาราง · กว้าง max-w-7xl ทุกหน้า (แจ้งเตือน 4xl เพราะเป็น feed, ปฏิทิน/Inbox เต็มจอ) · ใช้แล้ว: นักเรียน, ครอบครัว, บุคลากร, คอร์ส, คลาส, CRM, ใบแจ้งหนี้, คาบเรียน, รายงานเข้าเรียน, สรุปการเรียน, Reports, ฟอร์มผู้ปกครอง, แจ้งเตือน

**กฎที่เจ้าของย้ำ (จดใน memory แล้ว):** Panel = Header · Body · Bottom · CTA อยู่ Bottom · scroll แค่ Body · หลังแก้ UI ต้องรีโหลดแท็บเจ้าของเสมอ

---

## 2026-10-07 — ใบแจ้งหนี้: ย่อเลขที่ตรงกลาง + ปุ่มแสดง/ซ่อน Void

- เลขที่ใบแจ้งหนี้ย่อตรงกลาง เช่น `691007…0001` (เก็บส่วนต้นที่เป็นวันที่ กับเลขรันท้าย) hover เพื่อดูเลขเต็ม
  - ใช้ `MidText` ใน `data-table.tsx` ซึ่งนำไปใช้กับรหัสยาวอื่นได้
- ตัวกรองใหม่:
  - **All | Pending** (Pending = รอสร้าง PDF / รออนุมัติ / อนุมัติแล้ว / ส่งแล้วรอชำระ / มีเงินรอยืนยัน)
  - ปุ่ม toggle แสดง/ซ่อน **Done** (ชำระครบ, ค่าเริ่มต้นแสดง) และ **Void** (ยกเลิก, ค่าเริ่มต้นซ่อน) พร้อมตัวเลขจำนวน
  - การ์ดด้านบนยังกรองทีละสถานะได้เหมือนเดิม (`?filter=`, `?done=`, `?void=`)
- รวมคอลัมน์ "การส่ง / เงิน" เข้าไปในสถานะ: ไอคอนเล็กต่อท้าย (📤 ส้ม = ไม่ถึงผู้ปกครอง · 📤 แดง = ส่ง LINE ไม่สำเร็จ · 👛 ม่วง = รอยืนยันเงิน) hover เพื่อดูความหมาย
- แถบเครื่องมืออยู่บรรทัดเดียว ช่องค้นหาแคบลง

## 2026-10-07 — โรงเรียนจากรายชื่อกระทรวงศึกษาธิการ + Report โรงเรียน 3 มุมมอง

- **แหล่งข้อมูล:** Open Data ของกระทรวงศึกษาธิการ `https://exchange-api.moe.go.th/api/openv1/GetopenData49/{ปีการศึกษา}/1` (ฟรี ไม่ต้องใช้ key)
  - 1 แถว = 1 โรงเรียน มีรหัสโรงเรียน, ชื่อ, จังหวัด, เขต/อำเภอ, สังกัด, พิกัด
  - ปี 2567 มีประมาณ 56,000 แห่ง ครบทั้งรัฐ เอกชน กทม. อปท. สาธิต และโรงเรียนนานาชาติ
- **Prototype:** ใส่เฉพาะ กทม. + ชลบุรี 2,089 แห่ง (`public/data/schools-bkk-cbr.json` ประมาณ 350 KB โหลดเมื่อเปิดช่องค้นหาเท่านั้น)
  - ตัดสถาบันอุดมศึกษาออก แต่เก็บโรงเรียนสาธิตไว้
  - ตัดศูนย์ กศน. ออก
- **Dev ต้องทำในระบบจริง:**
  - ดึงข้อมูลทั้งประเทศเข้า DB และอัปเดตปีละครั้ง
  - API ใช้หน้า `/1` (หน้า 2 คือชุดเดิมซ้ำ ส่วนหน้า 3 ขึ้น error 500)
  - ช่องโรงเรียนควรค้นหาที่ฝั่ง server
- **ช่องโรงเรียน** (ฟอร์มนักเรียน → `SchoolPicker`)
  - ค้นหาด้วยชื่อหรือเขต/อำเภอ โดยไม่สนคำว่า "โรงเรียน", ช่องว่าง หรือวงเล็บ
  - เรียงจังหวัดของสาขาขึ้นก่อน แสดงผลสูงสุด 30 รายการ
  - ถ้าไม่มีในรายชื่อ เลือก "ใช้ชื่อนี้" ได้ และจะมีป้าย "พิมพ์เอง"
  - เก็บ `Student.schoolId` (รหัสกระทรวง) คู่กับชื่อโรงเรียน
- **Reports › โรงเรียนของนักเรียน** จัดกลุ่มตามรหัสโรงเรียน สะกดต่างกันก็นับเป็นโรงเรียนเดียว มี 3 แท็บ:
  1. โรงเรียน → สาขา (Region): แบบเดิม
  2. สาขา → โรงเรียน: ตารางรายสาขา ได้แก่ นักเรียน, จำนวนโรงเรียน, 3 โรงเรียนหลัก, % ที่มาจาก 3 โรงเรียนแรก (เกิน 60% เป็นสีส้ม = พึ่งไม่กี่โรงเรียน) กดแถวเพื่อดูทุกโรงเรียนของสาขานั้น
  - แท็บ 1: บรรทัดสาขาเหลือแค่รหัส + จำนวน เช่น "BKK TL 11 · PP 5" ไม่มีชื่อเต็มและ LIS/NAS แล้ว ส่วน hover แสดงรายชื่อเต็มของทุกสาขา (ชื่อ · LIS/NAS · ภูมิภาค · จำนวนคน)
  3. ภูมิภาค → โรงเรียน: BKK | CBR คู่กัน แต่ละฝั่งเป็นแถบอันดับโรงเรียน
  - แท็บจะซ่อนเมื่อขอบเขตที่เลือกด้านบนไม่มีอะไรให้เทียบ
- **Seed:** ใช้โรงเรียนจริงจากรายชื่อพร้อมรหัสกระทรวง (store version 64 ซึ่งจะรีเซ็ต mock data) · 212 tests

## 2026-10-07 — ตารางนักเรียน: Course + Enroll/End date · สถานะเป็นอังกฤษล้วน · Report โรงเรียน

- **สถานะนักเรียน** เป็นภาษาอังกฤษล้วน ไม่มีวงเล็บ: Active / Renewal / Inactive / Archived
- **ตารางนักเรียน**
  - คอลัมน์ใหม่: ชื่อเล่น | ชื่อ-นามสกุล | ชั้น | ครอบครัว | Course | Enroll date | End date | สถานะ | เหลือ (sort ได้ทุกคอลัมน์)
  - Course ใช้แพ็กเกจปัจจุบันที่จะหมดก่อน (ถ้ามีหลายคอร์สจะขึ้น +N) และแสดงป้ายแพ็กเกจไว้ข้างหน้า
  - นักเรียนที่ไม่มีแพ็กเกจตอนนี้ จะแสดงคอร์สล่าสุดแบบสีจาง
  - End date ภายใน 7 วันเป็นสีส้ม
  - เอาคอลัมน์ "คลาส" และ "โรงเรียน" ออก โรงเรียนยังดูได้ใน panel นักเรียน
- **Reports › นักเรียน:** การ์ดใหม่ "โรงเรียนของนักเรียน"
  - นับเฉพาะนักเรียน Active ตอนนี้ ตามสาขาที่เลือก
  - แสดงจำนวนโรงเรียน, สัดส่วนของ 3 โรงเรียนแรก, จำนวนที่ยังไม่ระบุโรงเรียน
  - แถบอันดับนักเรียนต่อโรงเรียน (โชว์ 5 อันดับแรกแล้วกดดูทั้งหมดได้)
  - กฎอยู่ที่ `schoolBreakdown()` และมี test แล้ว
- โรงเรียนแต่ละแถวบอกว่านักเรียนมาจาก Region ไหน (ป้าย BKK / CBR) และ Branch ไหน กี่คน เช่น "TL ทองหล่อ (LIS) 13 · BN บางนา (NAS) 8" เอาเมาส์ชี้เพื่อดูครบทุกสาขา
- **Seed:** ใส่โรงเรียนตัวอย่างให้นักเรียนตามจังหวัดของสาขา (BKK / CBR) ประมาณ 1 ใน 10 คนเว้นว่างไว้ (store version 63 ซึ่งจะรีเซ็ต mock data)

## 2026-10-07 — Data table: แยกคอลัมน์, Alignment ตรงทุกแถว, แก้ไขในตารางได้ทันที

**มาตรฐานตารางใหม่** (`components/app/data-table.tsx`)
- `TableShell cols=[…]` กำหนดความกว้างคอลัมน์ตายตัว (table-fixed): status หรือชื่อที่ยาวจะตัด … อยู่ในคอลัมน์ตัวเอง ไม่ดันคอลัมน์อื่น ทุกแถวสูงเท่ากันและจัดกึ่งกลางแนวตั้ง
- `HEAD` / `ROW` / `Th` / `GradeCell` / `gradeCompare` ใช้ร่วมกันทุกหน้า
- ชั้นเรียนแยกเป็นคอลัมน์ของตัวเองและ sort ตามลำดับชั้นของสาขา
- ตัวเลขชิดขวา

**แก้ในตารางได้เลย** (`components/app/inline-edit.tsx` → `EditCell`)
- hover แล้วช่องจะแสดงเป็นกรอบพร้อมไอคอนดินสอ หรือลูกศร (ช่องที่เป็นตัวเลือก) คลิกแล้วแก้ได้ทันที
- Enter หรือคลิกออกนอกช่อง = บันทึก, Esc = ยกเลิก
- บันทึกผ่าน save* ของ store ใช้กฎตรวจสอบเดียวกับฟอร์ม และมี toast ทุกครั้ง
- คลิกช่องที่แก้ไม่ได้ = เปิด side panel / popup เหมือนเดิม
- ผู้ไม่มีสิทธิ์จะเห็นเป็นข้อความธรรมดา

ช่องที่แก้ได้ในแต่ละหน้า:
- **นักเรียน** (เปลี่ยนเป็นตารางจริง + แบ่งหน้า): ชื่อเล่น, ชื่อ-นามสกุล, ชั้น, โรงเรียน
- **ครอบครัว**: ชื่อครอบครัว, ผู้ปกครองหลัก, เบอร์, ที่อยู่, รหัสไปรษณีย์
- **Lead**: ชื่อ, ชั้น, วิชา, ช่องทาง, ผู้ดูแล, เบอร์ (ขั้นตอนยังต้องเปลี่ยนผ่านขั้นตอนปกติ)
- **บุคลากร** (เปลี่ยนเป็นตาราง): ชื่อเล่น, ชื่อ, อีเมล, Full/Part-time (ตำแหน่ง วิชา สาขา ยังแก้ใน popup)

**ตารางอื่นที่จัดใหม่**
- คลาส, คอร์ส: ความกว้างคอลัมน์ตายตัว และทุกช่องอยู่ในบรรทัดเดียว
- ใบแจ้งหนี้: จาก grid เป็นตาราง แยก เลขที่ / สร้างเมื่อ / นักเรียน / ชั้น / รายการ / ยอด / จ่ายแล้ว / สถานะ / การส่ง พร้อม sort และแบ่งหน้า
- รายงานเข้าเรียน: เป็นตาราง sort ได้ทุกคอลัมน์

**ข้อมูลที่ควรรู้:** seed มีลีด "คุณแม่นุ่น" ชั้น ป.3 แต่สาขาทองหล่อ (LIS) ไม่มี ป.3 ในรายการชั้น ถ้าแก้ชั้นแล้วจะเลือกกลับเป็น ป.3 ไม่ได้

## 2026-10-07 — แจ้งเตือน: กรองตามหัวข้อ + ปุ่มส่งข้อความถึงทีม · เมนูแจ้งเตือนเหมือนเมนูอื่น · AI = สีฟ้า

- **หน้าแจ้งเตือน**
  - มีชิปกรองตามหัวข้อ พร้อมตัวเลข และกรองทั้ง "ต้องจัดการ" และ "ประวัติ" พร้อมกัน (`?topic=`)
    - หัวข้อ: ทั้งหมด, เช็คชื่อ & สรุป, รออนุมัติ, ต่อคอร์ส, ตารางเรียน, ฟอร์มผู้ปกครอง, ข้อความทีม, อื่นๆ
    - หัวข้อที่ไม่มีรายการจะซ่อน
  - "ส่งข้อความถึงทีม" เปลี่ยนเป็นปุ่มที่หัวหน้า กดแล้วจึงเปิดกล่องส่งข้อความ (มีปุ่มปิดและยกเลิก) และกล่องปิดเองหลังส่ง
- **เมนูแจ้งเตือนใน sidebar** แสดงบรรทัดเดียว ไม่มีกรอบ เหมือนเมนูอื่น และมี badge สีแดงบอกจำนวนที่ยังไม่อ่าน
- **ทุกส่วนที่ AI เขียนเป็นสีฟ้า** เพื่อให้รู้ว่าเป็นมุมมองของ AI ไม่ใช่ข้อมูลระบบ (คลาสรวมอยู่ที่ `components/app/ai.tsx`: `AI_TONE`, `AiIcon`, `AiChip`)
  - Dashboard: AI สรุปงานวันนี้
  - Reports › สรุป: กล่องหัว, ไอคอนแท็บ, ชิป "AI" บนการ์ดแต่ละหัวข้อ, กล่อง "แนะนำ"
  - ปุ่ม Generate Summary ใน Course Summary

## 2026-10-07 — Dashboard ใหม่: AI สรุปงานวันนี้ + การ์ด "ต้องจัดการ" + ไฮไลต์ปลายทาง

เจ้าของบอกว่า Dashboard "รกและโล่งในเวลาเดียวกัน" และ "งานที่รอคุณ" ซ้ำกับ "คาบเรียนวันนี้"

**โครงหน้า "วันนี้" แบบใหม่**
1. **KPI 4 ใบ:** นักเรียนที่เรียนอยู่, รายรับ, นักเรียนใหม่, ลีดที่กำลังตาม (ปุ่ม Need Attention ถูกรวมเข้าการ์ด "ต้องจัดการ" แล้ว)
2. **AI สรุปงานวันนี้** (ซ้าย) คู่กับ **คาบเรียนวันนี้** (ขวา) ซึ่งย้ายแถบความคืบหน้าเช็คชื่อและสรุปมาไว้ในการ์ดนี้
   - AI บอกว่าควรทำอะไรก่อน 5 ข้อ พร้อมเหตุผล และป้าย ทำเลย / วันนี้ / สัปดาห์นี้
   - ด้านล่างมีหมายเหตุเรื่องเวลาว่างก่อนคาบถัดไป และแนวโน้มเดือนนี้ (MTD) เช่น ยอดเงินเข้าตก
   - ตรรกะอยู่ที่ `domain/rules/today.ts` (`dailyBrief`) เป็น rule-based Dev จะสลับเป็น LLM ที่คืนข้อมูลรูปแบบเดียวกันก็ได้
3. **ต้องจัดการ** (เต็มความกว้าง แบ่งซ้าย/ขวา) แสดงทุกหัวข้องานพร้อมตัวเลข:
   - งานประจำวัน, ลูกค้า (รอต่อคอร์ส + ด่วน, ลีดใหม่), ขาย, เงิน, ครูและการสอน, นักเรียนและข้อมูล
   - รวมทุกอย่างจาก Need Attention แต่ตัดหัวข้อที่ซ้ำกันออก
   - หัวข้อที่ไม่มีงานยังแสดงอยู่ แบบจางและมี ✓
4. **กิจกรรมล่าสุด** กลายเป็นปุ่มไอคอนนาฬิกาที่หัวหน้า (badge = จำนวนของวันนี้) กดแล้วเปิด popup แยกตามวันพร้อมเวลา

**กดหัวข้อแล้วไปหน้านั้นพร้อมไฮไลต์**
- ลิงก์แนบ `?focus=<key>` แล้ว `FocusBanner` (ใน app shell) จะ:
  - แสดงแถบ "มาจาก Dashboard: … · ต้องทำอะไร · ไฮไลต์ไว้ N จุด"
  - ใส่กรอบกะพริบให้ทุกแถวที่มี `data-focus` ตรงกัน แล้วเลื่อนไปที่แถวแรก
- รายการยาวที่มีหลายหน้า (CRM, ครอบครัว, คลาส) จะดันแถวที่เกี่ยวข้องขึ้นหน้าแรก (`useFocusFirst`)
- หน้าที่ถูกทำ marker:
  - sessions (เพิ่ม `?range=recent` สำหรับ 30 วัน และ `?work=`)
  - summaries (`?bucket=`)
  - billing, students, families, classes, attendance
  - calendar list (คาบชน / ไม่มีครู / ครูลา)
  - CRM (`?archived=1` ใช้กับลีดที่ปิดแล้วแต่ถึงวันติดต่ออีกครั้ง)
  - การ์ดโทรหาผู้ปกครองไม่พอใจ
- `leadFlags` / `invoiceOverdue` / `paymentUnconfirmed` ใน reports.ts ใช้ร่วมกันทั้ง Need Attention และไฮไลต์ ตัวเลขจึงตรงกัน
- แปล EN/JP ครบ (`i18n-dict/today.ts`) · 205 tests

## 2026-10-07 — Reports: เปรียบเทียบภูมิภาค / ธุรกิจ + แก้ชื่อสาขา CB

- Reports › ภาพรวม มีการ์ดใหม่ **"เปรียบเทียบภูมิภาค / ธุรกิจ"** (ใต้แถบช่วงเวลา) ซึ่งสลับได้ 3 แบบ: ภูมิภาค (BKK/CBR) · ประเภทธุรกิจ (NAS/LIS) · ภูมิภาค × ธุรกิจ
  - ซ้ายเป็นโดนัทสัดส่วนรายได้ ขวาเป็นตาราง: รายได้ (แถบ + %), เติบโต, Active, เข้า, Lost, สุทธิ, เข้าเรียน, รายได้/คน
  - ถ้าช่วงก่อนหน้าไม่มีข้อมูลให้เทียบ ช่อง "เติบโต" จะเป็น "—" (เดิมโชว์ +786%)
  - กฎอยู่ที่ `groupFigures()` ใน `domain/rules/reports.ts` และมี test แล้ว
- แก้ชื่อสาขา CB เป็น **ชลบุรี (ตึกน้ำ)** (เดิมพิมพ์ผิดเป็นทุ่งน้ำ) ใน store version 62 ซึ่งจะรีเซ็ต mock data
- รายได้ตามสาขา: เพิ่มระยะห่างระหว่างยอดเงินกับ %

## 2026-10-07 — เตรียมขึ้น Vercel (แชร์ลิงก์ prototype)

- **รหัสผ่านหน้าแรก**: `src/proxy.ts` (Next 16 เรียก middleware ว่า Proxy) — ทำงานเมื่อมี env `DEMO_PASSWORD` เท่านั้น (เครื่องเราไม่เปลี่ยน) · ชื่อผู้ใช้ `DEMO_USER` (ค่าเริ่ม `nock`) · เบราว์เซอร์ขึ้นกล่องล็อกอินเอง · ยกเว้น /liff, API ฟอร์มผู้ปกครอง และ LINE webhook (ผู้ปกครอง/LINE ใส่รหัสไม่ได้)
- **ไฟล์ฝั่ง server** (ฟอร์มผู้ปกครอง, LINE inbox, รูป): บน Vercel เขียนที่ `/tmp` แทน `.data/` (`src/server/data-dir.ts`) — ใช้ได้แต่ข้อมูลหายได้เมื่อ Vercel รีสตาร์ท · ไม่ใส่ LINE keys บน Vercel → ส่ง LINE จริงไม่ได้ (ตั้งใจ — กันคนมีลิงก์ส่งข้อความถึงผู้ปกครองจริง)
- **สาขาจริง 10 สาขา + ดู Reports ตามภูมิภาค / ประเภทธุรกิจ** (เจ้าของให้โครงสร้าง) — BKK: Liclass TL ทองหล่อ · NAS BN บางนา, PP พาราไดซ์ พาร์ค, GP กรีนเพลส, RH รามคำแหง · CBR: Liclass SR ศรีราชา · NAS SR ศรีราชา, CB ชลบุรี (ทุ่งน้ำ), PT พัทยา, BW บ่อวิน · seed ใช้ id เดิม (br_thl = TL Liclass, br_ari = BN …) ตัดสาขาสมมติ 2 สาขา (วิภาวดี, บ้านบึง) · เลขเอกสาร = ธุรกิจ (01 NAS / 02 LIS) + branchNo ไม่ชนกัน · persist v61 (ข้อมูลตัวอย่างรีเซ็ต)
  - ตัวเลือกขอบเขตใน Reports (dropdown แบ่งกลุ่ม): ทุกสาขา · **ภูมิภาค** BKK / CBR · **ประเภทธุรกิจ** NAS / LIS · **ภูมิภาค × ธุรกิจ** (BKK·NAS …) · สาขาแยกตามภูมิภาค (รหัส · ชื่อ (NAS/LIS)) — กฎ `scopeBranchIds` + 2 tests · ชื่อสาขาทุกที่แสดงธุรกิจด้วย "ทองหล่อ · LIS · BKK" (มี ศรีราชา 2 แห่ง) · ชื่อ CB "ทุ่งน้ำ" ภาษาไทยผมเดาจาก Tuknam — ให้เจ้าของเช็ค
- **Reports › นักเรียน ปรับใหม่** (เจ้าของ: ข้อมูลไม่น่าสนใจ) — ตัด "Active รายเดือน" → **ความเคลื่อนไหวรายเดือน** แท่งขึ้น-ลง (เหนือเส้น = ใหม่ + กลับมาเรียน · ใต้เส้น = Lost + Pause · ชี้เดือนดูตัวเลข + สุทธิ) คู่ **Donut สัดส่วนในช่วงนี้** (ใหม่/กลับมา/Pause/Lost กลางวง = สุทธิ) · รายชื่อความเคลื่อนไหว (3 คอลัมน์) ย้ายเข้าป๊อปอัป "ดูรายชื่อ ›" · การ์ดคะแนนผู้ปกครองที่ออก เหลือ NPS ตัวใหญ่ + แถบ "จะกลับมาไหม" กดแล้วเปิดรายละเอียด (คะแนน 4 หัวข้อ + ความเห็น) · **Cohort Retention ย้ายไปแท็บภาพรวม** + สลับ **12M / 24M** (คำนวณถึง 24 เดือน `COHORT_MONTHS = 24`) · `use-reports` เพิ่ม `movementMonthly` · `DonutLegend` มี `colors` / `stack`
- **Reports จัดหัวหน้า** (เจ้าของสั่ง) — Export + PDF รวมเป็นปุ่ม **"ดาวน์โหลด ▾"** เมนู .PDF (หน้าที่เปิดอยู่) / .xlsx (ทุกแท็บ 21 ชีต) · คำอธิบาย/สูตรใต้หัวการ์ดทุกใบ (Panel `hint`) เปลี่ยนเป็นไอคอน **?** ชี้แล้วขึ้นป๊อปอัป (`InfoTip` ใน `charts.tsx`, ใช้ซ้ำได้) — สูตรในการ์ดอัตราเข้าเรียนด้วย · แถบ Tab + ปุ่มช่วงเวลา **ติดใต้แถบบนตอนเลื่อน** (sticky top-14)
- **Reports ช่วงวันที่กำหนดเอง → ปฏิทินเลือกช่วงของ shadcn** (เจ้าของสั่ง) — ชิปเดียว กดแล้วเปิดปฏิทิน 2 เดือน (ภาษาตามที่เลือก) คลิกวันแรก → วันสุดท้าย แล้วปิดเอง · เลือกเกินวันนี้ไม่ได้ · ชิปแสดงช่วงที่เลือก · `components/app/date-range-picker.tsx` (ใช้ซ้ำหน้าอื่นได้) · แก้ import ผิดใน `ui/calendar.tsx`
- **ขึ้นแล้ว: https://nock-erp-three.vercel.app** (Vercel ทีม "Nock", Hobby, โปรเจกต์ nock-erp, root `erp-v2`) — ถามรหัสก่อนเข้า (ทดสอบ 401 แล้ว) · หน้า /liff เปิดได้ไม่ต้องรหัส · ลิงก์แบบ `nock-xxxx-nock3.vercel.app` ของแต่ละ deploy ติดล็อกของ Vercel (ต้องล็อกอิน Vercel) — แชร์ลิงก์ nock-erp-three เท่านั้น · ชื่อผู้ใช้ตอนนี้ = รหัสเดียวกับรหัสผ่าน (เจ้าของใส่ซ้ำทั้งสองช่อง) แก้ได้ที่ Settings › Environment Variables แล้ว Redeploy
- ขั้นตอนฝั่งเจ้าของ: vercel.com → Continue with GitHub → Add New Project → nock-erp → **Root Directory = erp-v2** → Environment Variables: `DEMO_PASSWORD` (+ `DEMO_USER`) → Deploy · push main = อัปเดตลิงก์เอง · `next build` ผ่านแล้ว

## 2026-10-07 — ชิปเลือกภาษา (เริ่ม)

- **ชิปภาษาบนแถบบน หลังชื่อสาขา** (เจ้าของสั่ง) — 🌐 TH ▾ → English / ไทย / 日本語 · จำต่อคนต่อเบราว์เซอร์ (`lib/i18n.ts`, zustand persist `nockerp-ui-lang`) · ตั้ง `<html lang>` ตาม
- วิธีแปล (prototype): **ข้อความไทยคือกุญแจ** `t("ปฏิทิน")` → แปลตามภาษาที่เลือก ไม่มีคำแปล = แสดงไทย → แปลทีละหน้าได้โดยไม่ต้องรื้อ · Dev ระบบจริงควรเปลี่ยนเป็น message id
- **แปลแล้ว (EN / 日本語): Reports ทุกแท็บ → Dashboard → Settings ทั้งหมด** (เจ้าของเลือกลำดับ) — รวม AI สรุป (`insights.ts`) + Need Attention (`needsAttention`) ที่เป็นประโยคจากกฎ: กฎรับตัวแปล `tr` (ค่าเริ่ม = ไทย, tests เดิมผ่าน) · วันที่/เดือน/วันในสัปดาห์/ปีตามภาษา (`setDateLocale` ใน `domain/dates.ts`: ไทย = พ.ศ., EN/JP = ค.ศ.; `yearOf`, `monthShort`, `weekdayShort`, `weekdayLong`) · เหตุผลหลุด/ออกใช้ชื่อ EN/JP ที่มีในข้อมูลอยู่แล้ว
  - วิธีทำ: `scripts/i18n-wrap.mjs` (TS AST codemod) ครอบข้อความไทยใน JSX/attribute/string/template เป็น `tx("…", [vars])` อัตโนมัติ (`--keys` = ดึงรายการคำ) · ข้ามค่าคงที่ระดับโมดูล/การเทียบค่าข้อมูล → แก้มือที่จุดแสดงผล `tx(LABEL[x])` · พจนานุกรม `src/lib/i18n-dict/{reports,dashboard,settings}.ts` · `tx()` เรียกได้ทุกที่ หน้าเว็บ remount เมื่อเปลี่ยนภาษา (`<main key={lang}>`)
  - **ที่ยังเป็นไทยโดยตั้งใจ = ข้อมูล**: ชื่อสาขา/นักเรียน/ครู/ครอบครัว/วิชา/ห้อง/ระดับชั้น ที่อยู่ ข้อความที่คนพิมพ์ ชื่อโปรโมชัน · หน้าอื่นที่ยังไม่แปล: CRM, Inbox, ปฏิทิน, นักเรียน, คลาส, คาบ, Billing, ฟอร์ม ฯลฯ (ค่อยๆ ทำต่อด้วยสคริปต์เดิม) · โหมดสาธิตมุมซ้ายล่างยังไทย
- **ชื่อเป็นตัวอักษรอังกฤษเมื่อเลือก EN / 日本語** (เจ้าของสั่ง) — `domain/rules/romanize.ts` + 4 tests
  - **สาขา/สถานที่**: รายการชื่อมาตรฐาน (กรุงเทพ = Bangkok, ทองหล่อ = Thonglor … ~70 แห่ง) · Settings › ข้อมูลสาขา มีช่อง **"ชื่อภาษาอังกฤษ"** (`Branch.nameEn`, ว่าง = ใช้ชื่อมาตรฐาน แสดงเป็น placeholder) · ญี่ปุ่นใช้ชื่ออังกฤษ (เจ้าของ: สาขา 2 ภาษาพอ)
  - **วิชา** (`sj()`): คณิต/คณิตศาสตร์ = Math · อังกฤษ = English (ย่อ Eng) · วิทย์ = Science (Sci) · ญี่ปุ่น = Japanese (Jpn) + จีน/ไทย/ฟิสิกส์/เคมี/ชีวะ/สังคม · ญี่ปุ่นเป็น 数学/英語/理科/日本語 · ชื่อที่ตั้งใน Settings › System (ช่อง English/日本語) มาก่อน
  - **ชื่อคน** (`nm()`): แปลงอักษรไทยเป็นอังกฤษแบบที่คนไทยสะกดชื่อ (จ = j, แ + ตัวสะกด = a, ไม่ใส่วรรณยุกต์) · คำนำหน้า น้อง = N' · ครู = T' · ครอบครัว X = X Family · คุณแม่/คุณพ่อ = Mom/Dad · ด.ช./ด.ญ. = Master/Miss · ชื่อเล่นที่มาจากคำอังกฤษใช้รายการ (แอน = Ann, มิ้นท์ = Mint, พลอย = Ploy …) · ชั้น ป.4 = P.4 · ห้อง 3 = Room 3 · ตัวอักษรย่อในวงกลมรูปก็เปลี่ยนตาม
  - ตรงตัวอย่างเจ้าของ: Sangjai Family / Thongchai Family / N'Ton / T'Ann · **ข้อจำกัด**: กฎเดาเสียงที่ภาษาเขียนไม่บอกไม่ได้ เช่น พัชรา → "Phatra" (จริง Phatchara), เจริญ → "Jerin" · ถ้าต้องการให้ถูก 100% ต้องเพิ่มช่อง "ชื่อภาษาอังกฤษ" ให้นักเรียน/ครอบครัว/บุคลากรแบบเดียวกับสาขา (ยังไม่ทำ — รอเจ้าของตัดสินใจ)
  - ใช้แล้วใน Reports · Dashboard · Settings · เมนู/การ์ดผู้ใช้ (`scripts/i18n-names.mjs` ครอบ `.name/.nickname/.subject` ที่แสดงบนจอเป็น `nm()/sj()`) · ไม่แปล: ชื่อโปรโมชัน ชื่อวันหยุด/ช่วงพิเศษ ข้อความที่คนพิมพ์
- **รอบแรกแปลแค่กรอบแอป (ก่อนรอบข้างบน)**: เมนูซ้ายทุกกลุ่ม/ทุกรายการ · ชื่อหน้าบนแถบ · ค้นหา · การ์ดแจ้งเตือน · การ์ดผู้ใช้/เลือกสาขา · ชิปช่วงพิเศษ · หน้าไม่มีสิทธิ์ — **เนื้อหาในแต่ละหน้ายังเป็นไทย** (~140 ไฟล์มีข้อความไทย) ต้องคุยลำดับหน้าที่จะแปลต่อ · ข้อมูล (ชื่อสาขา/นักเรียน/วิชา) ไม่แปล

## 2026-10-06 (ค่ำ) — ทำครบ 4 หัวข้อที่ค้างคุยไว้ตอนเช้า

**1. Filter มาตรฐาน** — sync กับ URL ทุกหน้า (`?type=`, `?assignee=`, `?view=` ฯลฯ) เพื่อให้ reload/แชร์ลิงก์แล้ว filter ยังอยู่ — hook กลาง `useQueryState` (`lib/hooks.ts`) + component กลาง `FilterChipGroup` (ดึงจาก chip ผู้ดูแลใน Inbox) ใช้กับ Inbox/CRM/Calendar/Students/Billing

**2. Dashboard รวม "วันนี้"** — ยุบ `/dashboard` (ผู้บริหารเท่านั้น) เข้า `/` (ทุกคน) เป็นหน้าเดียว 3 แท็บ: วันนี้/สัปดาห์นี้/เดือนนี้ (`dashboard.view` คุมว่าเห็น KPI/สัปดาห์/เดือนไหม — Admin/ครูเห็นแค่วันนี้เหมือนเดิม)
  - Gamify: progress bar ฝังในการ์ดเดิม ("เช็คชื่อวันนี้ X/Y" ใน "งานที่รอคุณ", "ติดต่อวันนี้ X/Y" ใน "รอต่อคอร์ส") เขียวขึ้น+ประกายเมื่อครบ
  - **Renewal follow-up**: `Student.renewalFollowUps` (เหมือน Lead follow-up) — Admin บันทึกการติดต่อ, "ไม่รับสาย" ตั้งวันนัดใหม่ได้ (snooze ออกจากลิสต์จนถึงวันนั้น), "ยืนยันไม่ต่อ" เปิด flow "แจ้งออก" เดิมตรงๆ
  - Need Attention ย้ายมาอยู่ Dashboard ด้วย (เดิมมีแค่ Reports) — ดึง component กลาง `attention-dialog.tsx`
  - เพิ่ม 3 หมวดใน `needsAttention()`: นักเรียนไม่ผูกครอบครัว / ครอบครัวไม่มีที่อยู่ / ครอบครัวไม่มีช่องทาง LINE

**3. Settings › System** — จาก scroll ยาว 7 การ์ด จัดเป็น 5 แท็บซ้าย (เหมือนแท็บ Settings › Branch เดิม): ทั่วไป / วิชาและวันหยุด / การเงิน / ลูกค้าและ CRM / การแจ้งเตือน

**4. Course Summary** (ใหม่ทั้งฟีเจอร์ — แยกจาก Session Summary เดิม, แท็บใหม่ใน `/summaries`)
  - เขียนเองโดยครู (ไม่ใช่ auto) แต่ **auto-gather จาก Session Summaries ทันทีที่ขยายการ์ด** (ไม่ต้องกดปุ่ม) — 3 ช่อง Overall Progress (รวมข้อความทุกคาบ) / To Improve / Strengths (คัดจาก keyword ตายตัว เช่น "ดี/เก่ง" → Strengths, "ควร/ยังไม่/พลาด" → To Improve)
  - **1 คอร์ส = 1 รอบต่อเนื่อง ไม่ใช่ 1 entitlement** — แพ็กรายเดือนต่อกันทุกเดือนยังนับเป็นรอบเดียว (`entitlementRounds()`, เกณฑ์ไม่ต่อกัน = ใช้ `LOST_AFTER_DAYS` เดียวกับที่ Reports ใช้นิยาม "หลุดแล้วกลับมา") — มีเจ้าของเทสเจอเองว่านักเรียนคนเดียวโผล่ 11 การ์ดซ้ำกัน (เดือนละรอบ) ก่อนแก้เป็น 3 รอบจริง
  - popup เปิดเป็นรายนักเรียน เห็นทุกคอร์สค้างพร้อมกัน ย่อ/ขยายทีละใบ + ปุ่มรวม "Submit to Approve (N)" (ครู) / "Submit & Send (N)" (ผู้อนุมัติ — กด Approve แล้วส่ง LINE เลยในคลิกเดียว)
  - maker-checker ใช้กฎชุดเดียวกับ Session Summary จริงๆ (`canEdit/canApprove/canForceApprove/canSend` ใน `summaries.ts` ทำให้ generic รับได้ทั้ง 2 ชนิด แทนที่จะ copy)

**บั๊กที่เจอระหว่างทาง (แก้แล้ว)**: Zustand infinite-loop (filter ใน selector คืน array ใหม่ทุกครั้ง — ย้าย filter ออกนอก selector), การ์ดแรกเปิดค้างตั้งแต่ต้นข้าม auto-fill logic (ให้เริ่มย่อทุกใบเสมอ), Force Approve แล้วไม่มีปุ่มส่งต่อ (เพิ่ม action แยกสำหรับสถานะ approved), Director มีทั้งสิทธิ์เขียน+อนุมัติแต่เห็นปุ่มได้แค่อันเดียว (โชว์ทั้ง 2 ปุ่มพร้อมกันถ้าเข้าเงื่อนไข)

persist bump → v60 (schema เปลี่ยนหลายรอบ: `courseSummaries` ใหม่, `text` ควบ 3 ช่อง) · 193 tests

---

## 2026-10-06 — หัวข้อคุยต่อ (เจ้าของสั่ง: คุยก่อน ยังไม่ Build)

1. **Filter ในแต่ละจุดของ ERP** — ไล่ทุกหน้าว่าควรกรองอะไรได้บ้าง ให้รูปแบบเหมือนกันทั้งระบบ (ล่าสุดใช้ชิปกรองแบบ Inbox ผู้ดูแล / Reports ช่วงเวลา)
2. **Course Summary ของนักเรียนแต่ละคน** — รวบรวม Session Summary หลายคาบเป็นสรุปทั้งคอร์ส · หน้า Summary แบ่ง 2 Tab: Session Summary | Course Summary
3. **Dashboard กับ "วันนี้"** — แบ่งหน้าที่สองหน้านี้ยังไงไม่ให้ซ้ำ · ปรับหน้าตา แบ่ง Section ให้สวยและใช้ประโยชน์ได้มากที่สุด
4. **Settings › System** — ตอนนี้ทุกอย่างรวมหน้าเดียว ต้องแบ่งเมนู/หมวดให้เป็นระเบียบ

## 2026-10-05 (บ่าย) — งานค้างรอ build (เจ้าของสั่งเก็บไว้ ทำต่อหลัง credit reset)

1. **ฟอร์มสมัครทันที (Enroll)** — build แล้วตอนเช้า (`f812c9e`) แต่เจ้าของยังไม่เห็น เพราะเปิดดูฟอร์มไม่ได้ → แก้ด้วยข้อ 2 แล้วให้เจ้าของตรวจว่าข้อมูลครบไหม
2. **ดูฟอร์มได้ทันทีโดยไม่ต้องส่ง** — เจ้าของยังงงว่าฟอร์มมีข้อมูลครบหรือยัง · ทำหน้า "ฟอร์มทั้งหมด" รวมทุกฟอร์มผู้ปกครอง (Test · Trial · สมัครทันที · แจ้งออก · ความพึงพอใจ) กดเปิดดูได้ทันที (โหมดตัวอย่าง ไม่ส่งข้อมูล) + สรุปว่าแต่ละฟอร์มถามอะไร / ข้อมูลไปลงตรงไหนใน ERP · ลิงก์ดูตัวอย่างที่มีอยู่: `/liff/form?preview=test|trial|enroll`, `/liff/exit?preview=1`, `/liff/survey?preview=1`
3. **CRM ขั้นปิดการขาย** — ชำระเงินแล้ว + ยืนยันจนเป็นนักเรียน → การ์ด Lead ที่กลายเป็นนักเรียนแล้วต้องออกจากคอลัมน์ไปเลย (ไม่ค้างในบอร์ด)
4. **ผู้ปกครองไม่พอใจ (แบบสอบถาม)** — ย้ายรายการ + บันทึกการโทร ไปไว้ที่หน้า CRM ให้ Admin จัดการ · หน้า Reports แสดงเฉพาะผลที่เสร็จแล้ว (ตัวเลข/สรุป) ไม่ใช่ปุ่มให้ทำงาน (หลักใหม่: Reports = ดูผล, งานที่ต้องทำอยู่หน้าทำงาน)
5. **Calendar มุมมองวัน → รายวัน** — แสดงแบบตารางครู (รายชื่อนักเรียนอยู่ในช่องเลย) ไม่ใช่การ์ด

**✅ build แล้วทั้ง 5 ข้อ (เจ้าของ "Build เลย")**
- หน้าใหม่ **`/forms` "ฟอร์มผู้ปกครอง"** (เมนูหลัก ใต้ Inbox, Admin ขึ้นไป): เลือกฟอร์ม 5 แบบ (Test · Trial · สมัครทันที · แจ้งหยุดเรียน · ความพึงพอใจ) → ฟอร์มจริงโหมดตัวอย่างในกรอบมือถือ (กดเล่นได้ ไม่ส่งข้อมูล) สลับภาษา TH/EN/日本語 + แบรนด์ NockAcademy/Liclass · ด้านซ้าย: ใครกรอก · ส่งยังไง · ถามอะไรบ้าง (แยกขั้น, * = บังคับ) · ส่งแล้วไปไหนในระบบ
- **CRM:** Lead ที่เป็นนักเรียนแล้ว (enrolled) ไม่อยู่บนบอร์ด/ตารางอีก — คอลัมน์ปิดการขายเหลือแค่ "รอชำระ" + บอก "เป็นนักเรียนแล้ว N (ซ่อน)" · สวิตช์ "แสดงที่ปิดแล้ว (เป็นนักเรียน / เก็บเข้าคลัง)"
- **ผู้ปกครองไม่พอใจ** ย้ายไปหัวหน้า CRM (`components/crm/survey-calls.tsx`: เบอร์โทรกดโทรได้ · กำหนดโทร/เกินกำหนด · บันทึกผลการโทร → ออกจากรายการ) · Reports เหลือ "ผลการติดตาม" อ่านอย่างเดียว · Need Attention ชี้ไป CRM · **หลัก: Reports = ดูผล, งานที่ต้องทำอยู่หน้าทำงาน**
- **Lead เหลือ 4 State ให้ Admin เลือก** (เจ้าของ: "Admin งานวันนึงก็เยอะแล้ว") — dropdown ในหน้า Lead + ฟอร์มปิด Lead = ติดต่อ / นัดสอบ / ทดลองเรียน / ปิดการขาย (ตรงกับคอลัมน์บอร์ด) · เลือกคอลัมน์ = ไปขั้นแรกของคอลัมน์นั้น (`STAGE_FOR_GROUP`) · ขั้นย่อยข้างในระบบเลื่อนเอง (เช็คชื่อ/ส่งใบ/บันทึกติดตาม/อนุมัติฟอร์ม) — ข้อมูลยังเก็บขั้นย่อย (Reports/Funnel ใช้) แต่ไม่โชว์เป็นตัวเลือกหรือป้ายบนการ์ดแล้ว · ตาราง CRM แสดงชื่อคอลัมน์
- **หน้า Lead จัดใหม่** (เจ้าของ: "เละเทะ"): หัว = ชื่อ + ชั้น + วิชา/แหล่ง/กี่วัน (+ป้ายสมัครตรง) · State 4 ตัว · ผู้ดูแล · ไอคอน Inbox/ปฏิทิน · **เมนู ⋯** = บันทึกการติดตาม (หน้าต่าง) · ส่งฟอร์มสอบ/ทดลอง · ส่งใบสมัครเรียน · ปิด Lead (กู้คืนเมื่อปิดแล้ว) · แถบเหลือง "ติดต่อไม่ได้ N ครั้ง · ปิด Lead?" เฉพาะตอนเงียบ · เนื้อหาเป็นกล่องเท่ากัน: ฟอร์มรอตรวจ (ถ้ามี) → นัดสอบ/ทดลอง + ผล → ติดต่อ + ครอบครัว → ทำไมปิด (ถ้าปิด) → **ประวัติการติดต่อ** (โน้ต + การโทร/LINE รวมเส้นเดียว) → ฟอร์มก่อนหน้า (พับ) · ตัดหัวข้อ "ความสนใจ" (ซ้ำกับหัว) · ปุ่มล่างเหลือแค่งานหลัก
- **หน้า Lead "ผลแต่ละขั้น"** (เจ้าของ: ขั้น Test เห็นผลติดต่อ · ขั้น Trial เห็นผล Test ด้วย · ปิดการขายเห็นทั้ง Test + Trial): ไล่ขั้นติดต่อ → สอบ → ทดลอง → ปิดการขาย ถึงขั้นปัจจุบัน · ขั้นก่อนหน้าติ๊ก ✓ อ่านอย่างเดียว (ติดต่อกี่ครั้ง/ผลล่าสุด/โน้ต · ผลสอบ/ผลทดลอง + ครูที่บันทึก) · ขั้นปัจจุบันกรอกผลได้ · ไม่มีผล = "ข้ามขั้นนี้" / "สมัครตรง — ไม่ได้สอบ" · ปิดการขาย = สถานะใบแจ้งหนี้ · seed: ld_4/ld_6 มีผลสอบก่อนทดลอง, ld_5 มีครบ (สอบ+ทดลอง), follow-up ของ ld_3–6 · persist v58
- **ปิด Lead: "ติดต่อไม่ได้ / ไม่ตอบ LINE / เบอร์ผิด" เลือกได้ทุกขั้น** (เจ้าของ: ปิดเพราะติดต่อไม่ได้ แต่ popup ไม่มีตัวเลือก) — เดิมมีแค่ขั้นติดต่อ · ถ้าติดต่อล่าสุดไม่ได้ → ขึ้นต้นรายการ + เลือกไว้ให้ (เบอร์ผิด/ไม่ตอบ LINE/ไม่รับสายตามบันทึกล่าสุด) · ถ้าคุยกันได้ปกติ → อยู่ท้ายรายการ
- **Reports › CRM: การ์ด "Lead ที่หลุด" เต็มแถว ขึ้นก่อนแหล่งที่มา** (`5c7b465`, เจ้าของ: ข้อมูลนี้สำคัญมาก) — Donut 2 วง: หลุดที่ขั้นไหน (เรียงตาม funnel) + เหตุผล (มาก→น้อย) พร้อม legend % / จำนวน · เหตุผลที่ <3% รวมเป็น "อื่นๆ" สีเทา (บอกไว้ว่ามีอะไร) · ใต้ donut ยังมี "ไปเรียนที่ไหนแทน" + "เวลาที่ต้องการแต่เราไม่มี" · ตัดการ์ด "Pipeline ตอนนี้" (ซ้ำกับตัวเลขด้านบน → ใส่ลิงก์ไป CRM ในตัวเลขแทน) · "แยกตามสาขา" เต็มแถวตอนเทียบสาขา
  - ปรับ spacing (เจ้าของ: ยังเละ) — **list ยาวแสดงแค่ 5 อันดับ + "ดูทั้งหมด N รายการ"** (ที่เหลือรวมเป็น "อื่นๆ (N)" สีเทาใน donut จนกว่าจะกดขยาย) · legend กว้างไม่เกิน max-w-sm ตัวเลขชิดชื่อ ไม่ลอยไปขอบการ์ด · donut กับ legend ชิดบน · "ไปเรียนที่ไหนแทน" / "เวลาที่ต้องการ" ใช้ `TopList` 5 อันดับ + ขยายเหมือนกัน
  - "ไปเรียนที่ไหนแทน" / "เวลาที่ต้องการแต่เราไม่มี" เปลี่ยนเป็น **แถบอันดับ** (เลขอันดับ · ชื่อ · แถบยาวเทียบอันดับ 1 · จำนวน · %) + ไอคอนหัวข้อ + "รวม N" · แถบเทา = คู่แข่ง, แถบส้ม = เวลา · มีเส้นแบ่งกลางเหมือนแถว donut
- **เมนู "+" บอกฟอร์มที่ส่งไปแล้ว** (เจ้าของสั่ง) — ✓ "ส่งแล้ว 5 ต.ค." ท้ายรายการ (ล่าสุด) แต่ยังกดส่งซ้ำได้เสมอ · ดูจากแชท: Test/Trial = การ์ดฟอร์มในแชท · Enroll/ลาออก/ความพึงพอใจ = ลิงก์ token `pe_`/`pf_`/`ps_` ที่ส่งในแชท + ลาออกดู `student.exit.sentAt` (ในเมนูย่อยบอกรายลูก) + ความพึงพอใจดูว่าครอบครัวอยู่ในรอบที่ส่งแล้ว · ลาออก: ลูกที่ส่งฟอร์มไปแล้วยังเลือกส่งใหม่ได้ (ซ่อนเฉพาะคนที่ปิดออกแล้ว)
- **Inbox รวมรายการแชท + ห้องแชทเป็นการ์ดเดียว** (เจ้าของสั่ง) — เส้นแบ่งกลางลากปรับความกว้างรายการได้ 240–480px (ชี้แล้วขึ้นไอคอนจับ ⋮ · ดับเบิลคลิก = กลับค่าเดิม 288 · ปุ่มลูกศรซ้าย/ขวาได้) จำความกว้างไว้ในเครื่องนั้น · **ชิปกรองผู้ดูแล**: ทุกคน · ของฉัน · ยังไม่มอบหมาย · รายชื่อคนที่ดูแลแชทอยู่ (มีจำนวนกำกับ)
- **Inbox ปุ่ม "+" หน้าช่องพิมพ์ + Broadcast** (เจ้าของสั่ง)
  - "+" → **ฟอร์ม** ▸ Test Form · Trial (เฉพาะแชท Lead → เปิดหน้าเลือกเวลาข้ามขั้นเลือกประเภท) · Enroll (Lead หรือครอบครัว — ลูกค้าเดิมสมัครให้น้อง, กรอกข้อมูลผู้ปกครองให้แล้ว) · ลาออก (ลูก >1 คน → เลือกคน → หน้าส่งฟอร์มแจ้งออกเดิม) · ความพึงพอใจ (ส่งลิงก์ของครอบครัวในรอบปีนี้ซ้ำ — ยังไม่เปิดรอบ/ตอบแล้ว/ไม่อยู่ในรอบ → บอกเหตุผล) · **รูปภาพ** (≤5 MB, เก็บที่ `.data/line-media` เสิร์ฟผ่าน route เดิม · แชท LINE จริงส่งเป็นรูปได้เมื่อระบบเปิดผ่าน https เพราะ LINE ดึงรูปเอง — ไม่งั้นรูปอยู่ในแชทเรา + แจ้งเหตุผล) · เมนูที่ใช้ไม่ได้เป็นสีจางพร้อมบอกเหตุผล
  - **Broadcast** (ไอคอนโทรโข่งข้างปุ่มเขียนใหม่) — ส่งครั้งเดียวถึงทุกคน แต่ละคนได้เป็นแชทส่วนตัว · (1) แบบสอบถามความพึงพอใจ: ยังไม่เปิดรอบปีนี้ → ส่งทุกครอบครัวที่ลูกเรียนอยู่ (ทุกสาขา, 1 ลิงก์/ครอบครัว) · เปิดแล้ว → สถานะ + เตือนคนยังไม่ตอบ · (2) ข้อความ: เลือกกลุ่ม ลูกค้า / Lead ที่ยังเปิด / ทุกแชทในสาขา → บอกจำนวน + กี่แชทเป็น LINE จริง ก่อนกดส่ง
  - โค้ด: `lib/forms.ts` (`postToChat`, `sendEnrollToChat`, `sendSurveyToChat`, `broadcastText`, `broadcastSurvey`) · `components/inbox/broadcast-dialog.tsx` · `api/line/media` POST · store `sendChatImage` · **ยังไม่มี:** ประวัติ Broadcast / ตั้งเวลาส่ง / กรองกลุ่มตามชั้น-วิชา
- **Inbox หัวแชทจัดใหม่** (เจ้าของ: spacing ไม่สวย) — ชื่อ + ป้าย / ช่องทางใต้ชื่อ · ผู้ดูแลเป็นปุ่ม Action "👤 พลอย ▾" (เมนูเลือกคน ✓ + ยกเลิกมอบหมาย) วางหน้าปุ่ม (i) เปิด Side Panel · ลำดับขวา: ส่งฟอร์ม · ผู้ดูแล · (i) สูง 32px เท่ากันกึ่งกลางแนวเดียว · **ต้นเหตุ: `NativeSelect` บังคับสูงขั้นต่ำ 36px** ทำให้ select ที่สั่ง h-6/h-8 ล้นกล่องเยื้องลงทุกที่ → แก้ที่ตัวกลาง (ค่าเริ่ม h-9, สั่งความสูงได้จริง)
- **Reports › ช่วงเวลาแยกบรรทัดใต้ Tab + ช่วงใหม่ + เลือกวันเอง** (เจ้าของสั่ง) — 3 กลุ่มคั่นเส้น: Today · Week (7 วันล่าสุด) · Month (30 วันล่าสุด) · 3/6 Months · 1 Year | YTD · MTD · QTD (ตั้งแต่ต้นปี/เดือน/ไตรมาส เทียบช่วงเดียวกันของปี/เดือน/ไตรมาสก่อน) | YoY · MoM (เดือนที่แล้วทั้งเดือน เทียบเดือนเดียวกันปีก่อน / เดือนก่อนหน้า) · QoQ (ไตรมาสที่แล้วเทียบไตรมาสก่อน) | 📅 กำหนดเอง (วันที่เริ่ม–จบ ไม่เกินวันนี้ เทียบช่วงก่อนหน้าที่ยาวเท่ากัน) · ชี้ที่ชิปเห็นคำอธิบาย · หัวหน้า Reports บอกช่วงที่ใช้ + ช่วงที่เทียบเสมอ (ข้ามปีมีปีกำกับ) · **Week/Month เปลี่ยนความหมาย** จาก "สัปดาห์นี้/เดือนนี้" เป็น 7/30 วันล่าสุด (เดือนนี้ = MTD แล้ว) · การ์ด "คาบสัปดาห์นี้" ยังนับ จ.–อา. เหมือนเดิม · แท็บสรุปมีไอคอน AI ✨ + หัว "AI สรุปและประเมิน" (prototype ยังเป็นกฎ — ระบบจริงต่อ AI) · +3 tests
- **Reports › การเข้าเรียน จัดการ์ดเป็นคู่ที่ข้อมูลยาวพอกัน** (เจ้าของสั่ง) — อัตราเข้าเรียนรายเดือน (กราฟเตี้ยลง h-28) | แยกตามวิชา → แยกตามสาขา | คลาสที่เข้าเรียนต่ำสุด (โชว์จำนวนแถวเท่าสาขา) → แยกตามวัน | นักเรียนลาบ่อย · ทุกคู่สูงเท่ากัน · `MonthBars` มี prop `height`
- **Reports › แท็บ "สรุป" (ใหม่ อยู่หน้าสุด)** (เจ้าของ: อยากได้ Summary ที่เขียนอธิบาย + สาเหตุ + วิธีแก้) — การ์ดละหัวข้อ: รายได้ · นักเรียน · ขาย (CRM) · การเข้าเรียน · ครูและคลาส · ความพึงพอใจ · แต่ละการ์ด = ป้าย ต้องแก้/เฝ้าดู/ดี + หัวเรื่องมีตัวเลข + **ข้อมูล / สาเหตุ / แนะนำ** · ปัญหาขึ้นก่อน · บนสุด "ทำก่อนสัปดาห์นี้" 3 ข้อ · เปลี่ยนช่วงเวลา/สาขาแล้วสรุปเปลี่ยนตาม
  - เขียนด้วย **กฎตายตัว ไม่ใช้ AI** (`domain/rules/insights.ts` + 5 tests) — ทุกประโยคชี้ไปที่ตัวเลขที่แท็บอื่นแสดง ตรวจสอบได้ · ระบบจริงให้ Dev ต่อ AI เขียนให้สละสลวยได้ แต่ตัวเลข/สาเหตุควรมาจากกฎชุดนี้
  - รายได้ลด → หาเดือนที่ลดมากสุดเทียบปีที่แล้ว → นักเรียนใหม่เดือนนั้นลดกี่ % → Churn / ต่อคอร์ส → เหตุผลออกอันดับ 1 → เวลาที่ลูกค้าอยากได้แต่เราไม่มี → **แผนทดลองเปิดคาบ** (วันที่เวลานั้นระบุ หรือ 2 วันธรรมดาที่ว่างสุด × 2 สาขาที่ว่างสุดในวันนั้น จากคาบ 8 สัปดาห์ล่าสุด) 1–2 เดือน แล้วค่อยขยาย + **ต้องการนักเรียนเพิ่มกี่คน** = รายได้ที่หาย/เดือน ÷ รายได้เฉลี่ยต่อคน/เดือน (ตัวอย่างเจ้าของ → ระบบเขียนได้ตรง: ก.ย. ใหม่น้อยลง 80% · เปิด 15:00–17:00 พฤหัส-ศุกร์ ที่สาขาว่างสุด · ต้องการ ~15 คน)
  - ไม่อ้างการเปลี่ยนแปลงที่เทียบไม่ได้: ช่วงก่อนไม่มีข้อมูล → ไม่เขียน "เพิ่มขึ้น X%" · รายได้ใช้เฉพาะเดือนที่มีข้อมูลครบทั้งสองปี (ข้อมูลปีที่แล้วเริ่มกลางปี)
- **Reports ไล่ spacing ทุก Tab** (เจ้าของ: ยังมีหลายจุดไม่ดีพอ) — ตารางสาขาแบ่ง 2 ฝั่ง (รายได้ตามสาขา · Net Growth · Churn · CRM · NPS) มีเส้นแบ่ง + ระยะทั้งสองฝั่ง · **รายได้**: ตัวเลขสรุป 4 ช่องบนสุด · คาดการณ์คู่กับรายได้รายเดือน (ตัวเลข 3 ช่องเรียงแถวบนตาราง) · ประเภทรายได้คู่ Subject Engine (เลิกมีการ์ดลอยเดี่ยว) · ครอบครัวทั้งหมด = 2 คอลัมน์ 20 อันดับ + ดูทั้งหมด · **นักเรียน**: ความเคลื่อนไหวแยก 3 คอลัมน์ ใหม่ / กลับมาเรียน / Lost (ล่าสุด 10 + ดูทั้งหมด) แทนตารางกว้างครึ่งว่าง · เหตุผลออกชื่อไม่ตัด · **การเข้าเรียน**: คลาสต่ำสุดบอกสาขา (เดิมชื่อซ้ำ "อังกฤษ ป.6" หลายแถว) · **ความพึงพอใจ**: อยากให้เปิดเพิ่ม = แถบอันดับเต็มการ์ด · ผลการติดตามเว้นช่องไม่ให้ตัวเลขติดข้อความ + 10 แรก + ดูทั้งหมด · ความเห็นรวมข้อความซ้ำเป็นแถบอันดับพร้อมจำนวน (ประทับใจ | อยากให้ปรับปรุง)
- **Calendar รายวัน** = ตารางครูของวันเดียว (`WeekTeacherBoard dayCount={1}`) · เอามุมมองการ์ดเดิม (`day-board.tsx`) + ตัวเลือกแยกตามห้อง/เฉพาะที่มีคลาส ออก

---

## 2026-10-05 — ฟอร์ม 4 แบบ: Lead หลุด / นักเรียนออก / สมัครทันที / ความพึงพอใจประจำปี (เคาะแล้ว)

**หลักร่วม:** ใช้ระบบฟอร์มเดียวกับ Test/Trial (ลิงก์ LINE → ผู้ปกครองกรอก → การ์ดตรวจใน Inbox) · **รายการเหตุผลชุดเดียว** ใช้ทั้ง Lead หลุดและนักเรียนออก (Admin แก้รายการได้ใน Settings) · **ฟอร์มฝั่งผู้ปกครองมี 3 ภาษา: ไทย / อังกฤษ / ญี่ปุ่น**
1. **นักเรียนออก:** ผู้ปกครองแจ้ง Admin เอง (Admin คุยกับผู้ปกครองเป็นหลัก) → Admin กดส่งฟอร์มออกให้ผู้ปกครองกรอกเหตุผล/คะแนน/จะกลับไหม → Admin ปิด (คืนเงิน/เครดิต) → Archive แบบมีโครงสร้าง · "อาจจะกลับ" → สร้าง Lead Win-back
2. **Lead หลุด:** Admin ตัดสินใจเองจากระยะเวลาที่ขาดการติดต่อ · ก่อนปิดต้อง**ติดตามและบันทึกผล** (โทร / ทักไลน์ → ผลการติดต่อ) ให้เห็นความเคลื่อนไหว · ฟอร์มปิด Lead = **Popup สั้นแผ่นเดียว** (หยุดขั้นไหน · เหตุผลหลัก/รอง · ไปที่ไหน · เวลาที่ต้องการ · ติดตามอีกครั้ง · หมายเหตุ)
3. **สมัครทันที:** ส่งได้ทั้งจาก **Rich Menu** (ยังไม่มี — ทำเพิ่ม) และ Admin ส่งลิงก์ · ผู้ปกครองกรอก → Admin เลือกคอร์ส/คลาส → ครอบครัว+นักเรียน+ร่างใบแจ้งหนี้ในครั้งเดียว · Lead ข้ามไป "รอชำระ" ป้าย "สมัครตรง" · มีช่อง "ให้ครูประเมินระดับคาบแรก"
4. **ความพึงพอใจประจำปี:** ส่งช่วง ก.ย.–ต.ค. (ตั้งใน Settings) · 1 ชุดต่อครอบครัว คะแนนแยกรายลูก · **ระบุตัวตน** (ติดตามคนไม่พอใจได้) แต่ครูเห็นแค่ค่าเฉลี่ยของตัวเอง · คำถามหลักคงที่ทุกปี · NPS 0–6 หรือ "ไม่เรียนต่อ" → Need Attention + Manager โทรใน 3 วัน
- ลำดับ build: (2) Lead หลุด + บันทึกติดตาม → (1) นักเรียนออก → (3) สมัครทันที + Rich Menu → (4) ความพึงพอใจ

**✅ (2) Lead หลุด** (`fc63b1b`): บันทึกการติดตามใน LeadSheet (โทร / LINE / อื่นๆ → คุยแล้ว·ตอบกลับ·ไม่รับสาย·ไม่ตอบ·ให้ติดต่อใหม่·เบอร์ผิด + โน้ต · บันทึกครั้งแรกย้าย "ใหม่" → "กำลังติดต่อ" เอง) · แถบสถานะ "ตอบล่าสุด X วันก่อน · ติดต่อไม่ได้ติดกัน N ครั้ง" · ไม่ได้ ≥3 ครั้ง / เงียบ ≥14 วัน / เบอร์ผิด → ปุ่ม "ปิด Lead นี้?" · **Popup ปิด Lead แผ่นเดียว** (ขั้นที่หยุด · เหตุผลหลักตามขั้น — ยังไม่ได้คุยมีชุด "ติดต่อไม่ได้/ไม่ตอบ/เบอร์ผิด" · เหตุผลอื่น · ไปที่ไหน (สะสมรายชื่อคู่แข่ง) · เวลาที่ต้องการ · ติดต่ออีกครั้ง 1/3/6 เดือน · หมายเหตุ) · Need Attention: "Lead เงียบ ควรตัดสินใจ" + "ถึงวันติดต่อ Lead ที่ปิดไปอีกครั้ง" · Settings › ระบบ › "เหตุผลที่ลูกค้าหยุด / ออก" (ไทย/EN/日本語, ใช้กับ Lead/นักเรียน/ทั้งคู่, ปิดใช้แทนลบ) · Reports CRM: เหตุผล + คู่แข่ง + เวลาที่ลูกค้าต้องการแต่ไม่มี · กฎ `domain/rules/loss.ts`
**✅ (1) นักเรียนออก**: StudentSheet ปุ่ม "แจ้งออก" (แทน Archive) → วันเรียนวันสุดท้าย (ค่าเริ่มต้น = วันหมดแพ็ก) + เลือกพี่น้องที่ออกด้วย → ส่งฟอร์มทาง LINE (ถ้ามีแชท) หรือได้ลิงก์ไว้คัดลอก · หน้า `/liff/exit` (TH/EN/JP, มือถือ, ลิงก์ใช้ครั้งเดียว 14 วัน, ไม่ต้อง login LINE — token พอ) · ลิงก์ LIFF เดิมรับ token `pf_` แล้วส่งต่อมาหน้านี้ · server `src/server/parent-form-store.ts` + `/api/parent-forms/{token,submit,responses}` · ส่งแล้วขึ้นข้อความในแชท Inbox · แผงแจ้งออกในหน้านักเรียน (รอคำตอบ/ตอบแล้ว + คำตอบ) → "ปิดการออก" (แก้เหตุผลได้ · เงินที่เหลือ: ไม่มี/คืนเงิน/เครดิต) → Archive + ออกจากคลาส **หลังวันเรียนวันสุดท้าย** + แจ้ง office สาขา · ตอบ "กลับ/อาจจะ" + ยินยอมติดต่อ → สร้าง Lead win-back (ปิดไว้ + วันติดต่ออีกครั้ง = เดือนที่บอก, ไม่นับใน Funnel) · "ไม่ออกแล้ว" ยกเลิกได้ · "ปิดเลย ไม่ส่งฟอร์ม" ได้ · Reports แท็บนักเรียน: "ทำไมนักเรียนออก" + คะแนน/NPS/จะกลับไหม/ความเห็น · seed: ~60% ของนักเรียนที่หลุดมีบันทึกออก · persist v55 · 175 tests
- **โน้ตถึง Dev:** ปุ่ม "คืนเงิน/เครดิต" ตอนนี้แค่บันทึก — ใบลดหนี้ยังออกจากแท็บ Billing แยก
**✅ (3) สมัครทันที + Rich Menu**: ฟอร์มผู้ปกครองเดิม (`/liff/form`) มีโหมด "ใบสมัครเรียน" สำหรับลิงก์ `pe_` — ขั้นผู้ปกครอง/ที่อยู่/ใบกำกับภาษีใช้ร่วมกับ Test/Trial · ขั้นนักเรียน (`app/liff/form/enroll.tsx`, TH/EN/JP): วิชา · คอร์สที่สนใจ (กรองตามชั้น+วิชา, มีราคา) · แพ็กเกจ (รายเดือน/ชั่วโมง/สัปดาห์/ไม่แน่ใจ) · ตารางวัน×ช่วงเวลาที่สะดวก (เช้า/บ่าย/เย็น) · วันเริ่ม · รถรับส่ง (Liclass) · ให้ครูประเมินระดับคาบแรก (ค่าเริ่มต้นเปิด) · ยอมรับเงื่อนไข · เปิดนอก LINE ได้ (ใน LINE จะผูก LINE ให้อัตโนมัติ) · ดูตัวอย่าง `/liff/form?preview=enroll`
  - ลิงก์: **Rich Menu ต่อสาขา** (Settings › สาขา › LINE Integration → การ์ด "LINE Rich Menu · สมัครเรียนทันที": สร้าง/อัปเดตคอร์สในลิงก์ — token เดิม เมนูไม่ต้องแก้ · ขั้นตอนตั้งใน LINE OA Manager + ตัวอย่างเมนู 3 ช่อง) และ **ลิงก์ครั้งเดียวจาก Lead** (LeadSheet "ส่งใบสมัครเรียนทาง LINE" / สร้างลิงก์) · server `parent-form-store.ts` (enroll) + `/api/parent-forms/{enroll,enroll-submit,enroll-submissions}`
  - ERP: หัวหน้า CRM "ใบสมัครเรียนรอจัดคลาส" → หน้าต่างตรวจ (ข้อมูลที่ผู้ปกครองขอ · บอกถ้าเจอครอบครัวเดิม · เลือกคอร์ส(เลือกให้ตามที่ขอ)+คลาส(เตือนถ้าไม่เข้ากัน)+วันเริ่ม+งวด) → `approveEnrollment`: ครอบครัว + นักเรียน (โน้ตประเมินระดับ) + Lead `direct` "สมัครตรง" ที่ "รอชำระ" + ร่างใบแจ้งหนี้ต่อคน (ค่าแรกเข้าตามกฎเดิม, แพ็กชั่วโมงเศษ=เก็บไว้) → ส่ง/จ่ายตามขั้นปกติ จ่ายครบ = เข้าคลาส+เป็นนักเรียนเอง · ป้าย "สมัครตรง" บนการ์ด CRM · Funnel ไม่นับ Lead สมัครตรงในขั้น Test/Trial · 176 tests
  - ทดสอบจริงในเบราว์เซอร์ครบวง (Rich Menu link → กรอกแบบมือถือ → CRM → ร่างใบ 691005-01-001-0003 + ค่าแรกเข้า)
- **โน้ตถึง Dev:** สร้าง Rich Menu ผ่าน Messaging API อัตโนมัติได้ (อัปรูป + ตั้ง action) — prototype ให้ Admin ตั้งเองใน OA Manager
**✅ (4) ความพึงพอใจประจำปี**: Settings › ระบบ › "แบบสอบถามความพึงพอใจประจำปี" — ช่วงส่ง (ค่าเริ่มต้น 15 ก.ย.–15 ต.ค. ทุกปี) · ปุ่มส่งปีนี้ (ทุกครอบครัวที่มีลูกเรียนอยู่ 1 ลิงก์/ครอบครัว · มี LINE → ส่งในแชท · ไม่มี → คัดลอกลิงก์) · สถิติส่ง/ตอบ · ส่งเตือน 1 ครั้งหลัง 7 วัน (เฉพาะคนยังไม่ตอบ, ลิงก์เดิม) · หน้า `/liff/survey` (TH/EN/JP, มือถือ): แนะนำเพื่อน 0–10 * · พอใจโดยรวม · รายลูก (ครูผู้สอน/พัฒนาการ/เนื้อหาเหมาะกับระดับ) · บริการ (แอดมิน/สรุปการเรียน/ตารางเรียน/สถานที่/รถรับส่งถ้าใช้/ความคุ้มค่า) · ปีหน้าเรียนต่อไหม * · อยากให้เปิดอะไรเพิ่ม · ประทับใจ / อยากให้ปรับ · ลิงก์ LIFF เดิมรับ `ps_` แล้วส่งต่อ · server `surveys.json` + `/api/parent-forms/{survey,survey-submit,survey-responses}` · ERP ดึงคำตอบเข้ามาเอง (`syncSurveyResponses`) → ไม่พอใจ (0–6 หรือไม่เรียนต่อ) แจ้ง Manager/Area/Director ของสาขา
  - Reports แท็บ **ความพึงพอใจ** (เลือกปี): NPS เทียบปีก่อน · อัตราตอบ · พอใจโดยรวม · % เรียนต่อ · ไม่พอใจ · ยังไม่ได้โทร (เกิน 3 วัน) · หัวข้อเรียงต่ำสุดก่อน (+ปีก่อน) · NPS ตามสาขา (+ปีก่อน) · คะแนนครู · อยากให้เปิดเพิ่ม · ตารางผู้ปกครองไม่พอใจ + บันทึกผลการโทร · ความเห็น · Need Attention "ผู้ปกครองไม่พอใจ ยังไม่ได้โทร" · กฎ `domain/rules/survey.ts` · seed 2 ปี (2568 ครบ, 2569 กำลังเก็บ) · persist v56 · 178 tests
  - **โน้ตถึง Dev:** ส่งอัตโนมัติวันแรกของช่วง (cron) แทนปุ่ม · ครูเห็นค่าเฉลี่ยของตัวเองได้ที่หน้าครู (ยังไม่ได้ทำ)

---

## 2026-10-01 (ต่อ) — Reports: คุยสเปก (ยังไม่ build)

Ref: `~/Documents/ERP Screen Shot/Reports.png` (ตัวเลขในภาพเจ้าของคิดเอง ใช้เป็น reference เท่านั้น) · prototype เก่ามีสูตรที่ดึงมาใช้ได้: `new-erp/js/data-reports.js`

**เคาะแล้ว**
- การ์ดตามช่วงเวลา: ใช้ป้าย "vs ช่วงก่อนหน้า" / "vs ปีที่แล้ว" ตามช่วงของการ์ด (ไม่ใช่ MoM ทุกใบ)
- Overview = หน้าสรุป · แต่ละแท็บเป็นรายละเอียดเชิงลึก · เพิ่มแท็บ **Operations** (ชั่วโมงสอนของครู, Part-time, การใช้ห้องและครู)
- Revenue = นับตามวันที่เงินเข้า (ตรงกับรายงานภาษีขาย) หักใบลดหนี้ แยกค่าเรียน/ค่ารถ/ค่าแรกเข้า
- Active = มีสิทธิ์เรียนครอบคลุมวันนี้ · ลาพักยาว = Pause (แยก)
- Churn = สิทธิ์เรียนหมดแล้วไม่ต่อภายใน 30 วัน → Lost · ลาพักยาว → Pause
- Attendance rate = มา ÷ (มา+ลา) ของคาบที่ผ่านไปแล้ว ไม่นับคาบยกเลิก
- คอร์สหลายวิชา: แบ่งรายได้ตามสัดส่วนนาทีของแต่ละวิชา
- Forecast = ใบแจ้งหนี้รอจ่าย + แพ็กใกล้หมด × อัตราต่อคอร์ส (ทำใน R3)
- สิทธิ์: Director เห็นทุกสาขาและเทียบได้ · Area Manager เห็นเฉพาะ Area ของตัวเอง · Manager เห็นสาขาตัวเองโดยไม่มีหน้าเทียบสาขา · Admin/ครูไม่เห็น
- ข้อมูลย้อนหลัง: ถ้า Import มาก็แสดง ถ้าไม่ได้ Import ก็ไม่แสดง (ไม่ใส่ตัวเลขปลอม)
- Export ได้ทั้ง xlsx (ตามแท็บ) และ PDF สรุป
- ลำดับ: R1 Overview+Revenue+Students → R2 Attendance+Operations → R3 CRM funnel+Cohort+Forecast

**ยังรอ:** รูปแบบ Cohort (แถวสาขา × ปีที่สมัคร ตาม ref ใหม่ หรือแถวรายเดือนที่สมัคร) · นิยาม "นักเรียนใหม่" (อธิบายใหม่แล้ว) · รายการ Need Attention + เกณฑ์ (เสนอแล้ว)

**เจ้าของ: "Build เลย ค่อยมาปรับกัน" → R1 ✅**
- กฎ `src/domain/rules/reports.ts` (ทุกตัวเลขมาจากที่นี่ คำนวณจากข้อมูลจริง ไม่เก็บยอดสำเร็จ — Dev แปลงเป็น SQL ได้): `periodRange`/`compareRange`/`COMPARE_LABEL` · `change` (ช่วงที่เทียบเริ่มก่อนข้อมูลชิ้นแรก → "—" ไม่โชว์ % ปลอม) · `revenueRows` (ใบที่จ่ายแล้ว ณ วันเงินเข้า + ใบลดหนี้ติดลบ = ตรงกับรายงานภาษีขาย, ส่วนลด/เครดิตกระจายตามสัดส่วนบรรทัดคอร์ส) · `monthlyRevenue`, `revenueByBranch`, `revenueBySubject` (หลายวิชาแบ่งเท่ากัน — ยังไม่มีนาทีต่อวิชา), `packageMix`, `packageByGrade`, `topFamilies` · `studentEvents` (ใหม่ / ต่อคอร์ส / Lost = หมดแพ็ก+30 วัน / กลับมาเรียน · นักเรียน Import ไม่นับเป็นใหม่), `stateOn` (Active/Pause), `renewalRate`, `activeByMonth`, `pausesIn` · `attendanceRate` · `demandByDayHour` · `needsAttention` (13 เรื่อง, เกณฑ์ใน `ATTENTION_THRESHOLDS` — **ยังไม่มี UI ให้ Admin ปรับ** ทำทีหลังใน Settings)
- สิทธิ์ `reports.view` (Director/Super Admin/Area Manager/Manager) · `reportBranchIds` + `canCompareBranches` (Manager ไม่เห็นตารางเทียบสาขา) · เมนู Reports เปิดแล้ว
- หน้า `/reports`: KPI 5 ใบ (รายได้, Active+Pause, คาบสัปดาห์นี้, อัตราเข้าเรียน, Need Attention → หน้าต่างรายการแยกกลุ่ม กดไปหน้าที่แก้) · เลือกสาขา · ช่วง วันนี้/สัปดาห์/เดือน/3M/6M/1Y/YTD · แท็บ ภาพรวม / รายได้ / นักเรียน (การเข้าเรียน, Operations = R2 · CRM = R3 ขึ้นป้ายไว้) · Export .xlsx (`lib/reports-export.ts` 11 ชีต) + PDF (พิมพ์หน้า — print CSS ซ่อน sidebar/header)
- seed: ประวัติ 15 เดือน ~130 นักเรียน / ~540 ใบแจ้งหนี้ที่จ่ายแล้ว + แพ็กเกจ + ลาพักยาว (`buildHistory` ใน seed.ts, deterministic) · persist v48 · 165 tests
- ปรับตามเจ้าของ: ครอบครัว Top 5 · Subject Engine จัดกึ่งกลาง สีแถบตรงกับวงกลม · **seed เป็น 12 สาขา** (NockAcademy 10 · Liclass 2 — ชื่อสาขาใหม่ 10 แห่งเป็นชื่อชั่วคราวจาก ref รอเจ้าของให้ชื่อจริง) แต่ละสาขามี 2 คอร์ส 2 คลาส · Area Manager เอ = โซน BKK · ประวัติ ~420 นักเรียน / ~2,200 ใบ · รายได้ตามสาขา 2 คอลัมน์ × 5 แถบเทียบสาขาอันดับ 1 · persist v49
- ปรับตามเจ้าของ (ต่อ): แพ็กเกจจัดกลุ่ม Hourly/Weekly/Monthly + แถบสัดส่วน · Net Growth/Churn Split 2 คอลัมน์ + แถบยอดรวม · Heatmap 08:00–21:00 เสมอ · การ์ดข้างกันยืดเต็มความสูง (`Panel fill/center`) · Hover กราฟรายเดือนแบบ ref (เดือนปัจจุบันเทียบช่วงวันเดียวกันปีที่แล้ว)
- **R2 ✅** แท็บ **การเข้าเรียน**: อัตรา/มา/ลา/ไม่หักโควตา/คาบยกเลิก (ครูลา·ช่วงพิเศษ·อื่นๆ) · รายเดือน · ตามสาขา/วิชา/วัน/คลาส (เขียว ≥80% · แดง <80%) · นักเรียนลาบ่อย (กดเปิด) — แท็บ **Operations**: Teacher Health (คาบ, ชั่วโมง, นักเรียน, อัตราเข้าเรียน, ยังไม่เช็คชื่อ, สรุปค้าง, สรุปตรงเวลาตามเส้นตาย `summaryDeadlineHours`, สอนแทน, ลา · กรองเฉพาะ Part-time = ชั่วโมงคิดค่าสอน) · การใช้ห้อง (ชม.มีคาบ ÷ ชม.เปิด นับจากคาบแรกในระบบ) · ความเต็มของคลาส (เทียบ กลุ่ม 6 / เดี่ยว 3)
  - กฎใหม่ใน `reports.ts`: `attendanceBy`, `frequentLeavers`, `cancellations`, `teacherStats`, `roomUtilization`, `classFill` · Export เพิ่ม 6 ชีต · 168 tests
  - แก้บั๊ก R1: คาบวันก่อนๆ มีสถานะ `closed` ไม่ใช่ `ended` → อัตราเข้าเรียนเดิมนับแค่คาบวันนี้ (แก้แล้ว)
  - seed: 10 สาขาใหม่มีครูคนละ 1 คน (บางคน Part-time) + นักเรียนปัจจุบันในคลาส + เช็คชื่อ/สรุป 2 สัปดาห์ · สรุปมีเวลาส่ง (ส่วนหนึ่งส่งช้า) · persist v52
  - ข้อมูลเช็คชื่อมีตั้งแต่คาบแรกในระบบเท่านั้น (ประวัติก่อนหน้ามีแต่ใบแจ้งหนี้) — แท็บบอกวันที่เริ่มไว้
- **R3 ✅** (เจ้าของ: "ไปต่อเลย" = ใช้ Cohort แบบที่เสนอ)
  - **Forecast** (`forecastRevenue`): แพ็กล่าสุดของนักเรียนแต่ละคอร์สต่ออายุตอนหมดด้วยอัตราต่อคอร์ส 6 เดือนล่าสุด (ทบไปเรื่อยๆ ถึงสิ้นปี, ราคาเท่าที่จ่ายล่าสุด) + ใบแจ้งหนี้ที่อนุมัติ/ส่งแล้วรอจ่าย (นักเรียนที่มีใบรอจ่ายเริ่มนับรอบถัดไป) · **ไม่รวมนักเรียนใหม่** (โชว์ค่าเฉลี่ย 3 เดือนแยกไว้ `avgNewRevenue`) · กราฟรายได้รายเดือนแสดงแท่งลายทาง (เดือนนี้ = จริง + ส่วนที่เหลือ) + hover "คาดการณ์ทั้งเดือน" · แท็บรายได้มีการ์ดคาดการณ์ถึงสิ้นปี
  - **Cohort** (`cohortRetention`): แถว = สาขา × ปีที่สมัคร (ตาม ref เจ้าของ) · M0–M12 = % ที่ยังมีแพ็กครอบคลุม ณ N เดือนหลังจ่ายใบแรก · เดือนที่ยังไม่ถึงเว้นว่าง (สามเหลี่ยม) · กดสาขา → แยกตามเดือนที่สมัคร · นักเรียน Import ไม่อยู่ใน Cohort · อยู่ในแท็บนักเรียน
  - **แท็บ CRM**: Funnel (Lead → ติดต่อ → Test/Trial → ทดลองเรียน → รอชำระ → สมัคร, นับทุกขั้นที่ผ่าน, Lead ที่ปิดนับถึงขั้นที่หลุด) · Lead รายเดือน · แหล่งที่มา (Lead, สมัคร, Conversion, วันถึงสมัครแบบมัธยฐาน, รายได้จากนักเรียนที่มาจากแหล่งนั้น) · Lead ที่หลุดตามขั้น + เหตุผล · แยกตามสาขา
  - seed: นักเรียนประวัติทุกคนมี Lead ต้นทาง + Lead ที่ไม่สมัคร (ปิดพร้อมเหตุผล / ล่าสุดยังเปิดอยู่) · persist v53 · Export เพิ่ม 4 ชีต · 171 tests
- **โน้ตถึง Dev:** Forecast เป็นค่าคาดหมาย (ความน่าจะเป็นทบกัน) ไม่ใช่ยอดที่จะเข้าแน่นอน · Funnel ไม่มีประวัติ stage → ใช้ stage ปัจจุบัน/archivedFrom (ถ้า DB เก็บ stage history ได้จะแม่นกว่า) · "ยอดเงินเข้า" อิงวันที่ยืนยันเงิน (`receiptDate`)

---

## 2026-10-01 — Calendar แบบ Flexible (ตารางครูทั้งสัปดาห์) ✅ ขั้น 1–6a (เครื่องทำงาน)

**ข้อตกลงกับเจ้าของ (คุยก่อน build)**
1. ช่วงคลาส (แถวตารางครู) แต่ละสาขาตั้งเอง **แยกได้ทุกวัน** · ทางลัด: ใช้แบบวันจันทร์กับ จ.–ศ. / วันเสาร์กับ ส.–อา. / ทุกวัน · แก้จากหัววันถาม "เฉพาะวันนี้" หรือ "วันนี้และทุกสัปดาห์ต่อจากนี้" · **เฉพาะ Admin / Manager ของสาขา** · ต้องข้ามเครื่องได้ (prototype = localStorage → **Dev ต้องเก็บใน DB**)
2. เปลี่ยนช่วงแล้ว **ระบบถามว่าจะเลื่อนคลาสในช่วงนั้นตามไหม** แล้วเลื่อนให้ (ข.)
3. ทุกการเปลี่ยนแปลง → แจ้งเตือนในระบบ (ยังไม่ส่ง LINE) · **จุดแดง** ที่ช่องคาบ เห็นเฉพาะครูของคาบนั้น (หลัก+ร่วม) ไม่รวมคนแก้ · หายเมื่อเปิด side panel แล้วปิด
4. หัวครู hover ⋯ → เปลี่ยนครู (ทั้งวัน, ครู Part-time ได้) / ยกเลิกคลาส (ทั้งวัน, ยืดแพ็กเกจให้) · รายคาบเปลี่ยนจาก side panel · มีป้าย "ลา · เปลี่ยนครู" / "แทนครูX"
5. ไม่มีการ์ด: ช่องขาว = มีนักเรียน · เทาอ่อน = มีคาบแต่ไม่มีนักเรียน · ว่าง = พื้นตาราง · คาบที่กำลังเรียนมีแถบสีซ้าย · hover ช่องว่าง = "+ สร้างคลาส"
6. ลากชื่อนักเรียนไปคาบอื่น (ข้ามวันได้) → ถาม เฉพาะคาบนี้ / N คาบ / ทุกคาบที่ตามมา (ย้ายคลาสถาวร แพ็กเกจตาม) · Undo ใน toast · เฉพาะ Admin/Manager
7. แถว Room: ห้อง (ตัวหนา) · จำนวนนักเรียน · ไอคอนประเภท Test/Trial/Interview/Others · Group/Single (ข้อความโผล่เมื่อช่องกว้างพอ)
8. คาบชน: แจ้งบนสุดของแท็บแรกใน side panel + แก้จากช่องได้ (รวมคาบ / ย้ายห้อง-ครู-เวลา / ยกเลิก — ทีละจุดหรือทั้งหมด) · คาบที่ผ่านไปแล้วไม่เตือน
9. Special Period (ขั้น 6b — ยังไม่ build): มีช่วงคลาส+คลาสของตัวเอง (ข.) · ตอนสร้างเลือกว่าคลาสปกติเรียนต่อ (default) หรือหยุด (ค.) · ปิด/ลบช่วง = วันกลับเป็นปกติ · เตือนก่อนปิดถ้าคลาสพิเศษมีนักเรียน · ช่วงซ้อนกันได้ — คลาสพิเศษทั้งสองช่วงแสดงทั้งคู่, ช่วงคลาสใช้ priority สูงกว่า (เท่ากัน → อันที่เพิ่มทีหลัง)
10. จอเล็ก: โหมด compact (ขั้น 6c — เสนอไว้)

**ทำแล้ว (commit แยกทีละขั้น)**
- ขั้น 1–5: ช่องไร้การ์ด+สี · จุดแดง (`Session.changed/seenBy`, `unseenChange`, `markSessionSeen`, ตัวห่อ TRACKED ใน store) · เมนูหัวครูทั้งวัน (`substituteTeacherForDay`, `cancelTeacherDay`) · ลากนักเรียน (`moveStudent`, `undoLastMove`) · แก้คาบชน (`components/app/conflict-resolver.tsx`, `mergeSessions`)
- ขั้น 6a: โมเดลช่วงคลาสใหม่ — `ClassBlock {start,end}` · `Branch.blockPlans [{from, byDay}]` (แผนรายวันในสัปดาห์ เริ่มมีผลตั้งแต่วันที่) · `Branch.blockDays` (เฉพาะวัน) · `SpecialPeriod.blocks/blockDays` (เลิกใช้ `Branch.blocks` เดิม)
  - กฎ `scheduling.ts`: `blocksOn(branch,date)` (ช่วงพิเศษ → เฉพาะวัน → แผนล่าสุด) · `blockFor` · `validateBlocks` · `applyBlocks` (ในช่วงพิเศษ = แก้เฉพาะในช่วง) · `blockChangeReaches` · `blockShifts` · `shiftInBlock` (คาบในช่วงที่ขยับเลื่อนตาม offset เดิม, คาบเต็มช่วงยืด/หดตามช่วงใหม่)
  - store `setDayBlocks` — สิทธิ์ `canEditBlocks` · เลื่อนคาบทั้งหมดพร้อมกันแล้ว **คืนเฉพาะคาบที่จะชน** (อยู่เวลาเดิม, บอกจำนวนใน toast) · คลาสประจำเลื่อนเวลาตาม (เฉพาะวันปกติแบบ "ต่อจากนี้") · แจ้งทั้งสาขา + จุดแดงที่คาบที่เลื่อน
  - UI: `components/calendar/blocks-dialog.tsx` (ปุ่ม "ตั้งช่วงเวลา" ที่หัววันของตารางครู + ปุ่ม "แก้" รายวันใน Settings › เวลาเปิด-ปิด › การ์ด "ช่วงคลาส") · หัววันโชว์ป้ายช่วงพิเศษ
  - persist v45 · 157 tests
- ขั้น 6b: **คลาสพิเศษของช่วงเวลาพิเศษ** — `Klass.periodId` (สร้างคลาสแล้วเลือก "ช่วงเวลาพิเศษ" · สร้างจากวันในช่วง = เลือกให้อัตโนมัติ) → คาบมีเฉพาะในช่วง ทุกสัปดาห์จนจบช่วง · `SpecialPeriod.pauseRegular` (คลาสปกติ: เรียนต่อ = default / หยุดทั้งหมด) · กฎ `periodPause` + `syncPeriodSessions` (พักคาบด้วย `Session.pausedBy` — กลับมาเองเมื่อเปิดช่วงอีกครั้ง/เปลี่ยนเป็นเรียนต่อ, ไม่แตะคาบที่ผ่านไปหรือยกเลิกด้วยเหตุอื่น) เรียกตอนบันทึกสาขาและตอนสร้างคลาส · ปิด/ลบช่วงที่คลาสพิเศษยังมีนักเรียน → ถามยืนยันก่อน · ป้าย "Summer" ที่ช่องคาบ + หัววัน · seed: Summer มีช่วงคลาสของตัวเอง + "Summer English Camp" · persist v46 · 160 tests
  - **โน้ตถึง Dev / ถามเจ้าของ:** ขยายวันจบของช่วงหลังสร้างคลาสพิเศษแล้ว ยังไม่สร้างคาบเพิ่มให้อัตโนมัติ · คาบที่พักเพราะ "หยุดคลาสปกติ" ยังไม่ยืดแพ็กเกจ (ต้องถามว่าควรยืดไหม)

**เหลือ:** 6c compact mode · หัวปฏิทินตาม Ref (รอเจ้าของ: ปุ่ม Summary หมายถึงอะไร) · Import Google Sheet · PDF รายเดือน · ทดสอบ LINE จริง

---

## 2026-09-30 (ต่อ 2) — เจ้าของเคาะ Flow การเงินที่เหลือ (คุยก่อน ยังไม่ build)

1. **เพิ่มรอบรถหลังจ่ายแล้ว (Liclass):**
   - Admin เพิ่มวันใช้รถที่หน้านักเรียน รอบรถมีผลทันที
   - ยอดค้างเรียกเก็บจะถูกดึงเข้า Invoice ใบถัดไป
   - **ลดวันใช้รถ = ไม่คืนเงิน**
   - นักเรียนไม่ต่อคอร์ส = ออก Invoice ใหม่เก็บเฉพาะค่ารถได้เลย
2. **PDF Invoice/Receipt ของจริง:** เจ้าของจะส่งตัวอย่างเอกสารจริงมา → ทำตามหน้าตานั้น
3. **คืนเงิน:** ทำ 2 แบบ
   - (ก) **Credit Note** คืนเงินจริง บันทึกบัญชีที่โอนออก + สลิป
   - (ข) **ไม่คืนเงินสด เก็บเป็นเครดิต**ไว้หักใบถัดไป
   - เหตุผล = Chip ให้เลือก หรือพิมพ์เอง
   - เลือกได้ทีละรายการว่าจะคืน**อะไร**และคืน**เท่าไร**
   - เอกสารที่จ่ายแล้วห้ามแก้ ใช้เอกสารใหม่หักล้าง
4. **ส่ง Accounting:** Liclass Education = บริษัทแม่ · Liclass School + Nockacademy School = บริษัทลูก
   - Sales Tax Report ส่งรวมทุกบริษัท = **Sheet เดียว เรียงตามเลข Statement**
   - เจ้าของจะส่งตัวอย่าง Sheet มา
5. **คอร์ส 1 คอร์สหลายคลาส = นับเป็นหลายคลาส:**
   - ราคาคอร์สเป็นราคาเดียว ไม่ว่าจะเรียน 1/2/3 วัน/สัปดาห์ (ตามที่ Admin/Manager ตั้งคลาส)
   - **Monthly pro-rate นับเป็น "จำนวนสัปดาห์" ที่ได้เรียนในเดือน** ไม่นับจำนวนคาบ
   - แพ็กชั่วโมงใช้ชั่วโมงร่วมกันกระเป๋าเดียว
6. **แพ็กชั่วโมงนับเป็นคาบ** (24 ชม. ÷ 1:30 = 16 คาบ)
   - ถ้าหารไม่ลงตัว โชว์เศษเป็นนาที แล้วให้ Admin เลือก: เก็บเศษผูกไว้กับนักเรียน / เพิ่มเป็น +1 คาบ / ตัดเศษทิ้ง
7. **Reports/Tasks/Logs + ส่ง Dev:** พักไว้จนกว่า Flow ทั้งหมดจะนิ่ง

**ยืนยันรอบ 2:**
- Pro-rate: 3+ สัปดาห์ = 100% · 2 = 60% · 1 = 30% · นับสัปดาห์ตามวันเปิด/ปิดของสาขานั้นๆ
- เศษนาที: เก็บผูกกับนักเรียน (ไปรวมกับแพ็กถัดไป) / +1 คาบฟรี ไม่เก็บเงินเพิ่ม / ตัดทิ้ง
- เครดิต: ผูกกับ**นักเรียนคนนั้น + คอร์สนั้น** · Invoice ถัดไปหักให้อัตโนมัติ Admin กดไม่ใช้ได้
- รอบรถเพิ่มครั้งเดียว (เช่น พรุ่งนี้วันเดียว) ก็ใช้วิธีเดียวกัน = ยอดค้างไปเก็บใบถัดไป
- การนับสัปดาห์ (เจ้าของให้ตัดสินใจไปก่อน): สัปดาห์เริ่มที่**วันแรกที่สาขาเปิด**ในสัปดาห์ จ.–อา. นั้น (เปิด จ.–ศ. → เริ่มวันจันทร์ · เปิดตั้งแต่ พ. → เริ่มวันพุธ) และนับเข้าเดือนของวันนั้น (สัปดาห์ที่เริ่มก่อนเดือนแรกนับรวมในเดือนแรก)

**Build ข้อ 5 + 6 เสร็จ ✅**
- `CourseLine.classId` → **`classIds[]`** และ `Entitlement.classId` → **`classIds[]`** (1 คอร์สหลายคลาส ทุกคลาสนับเป็นคลาสของตัวเอง)
- `quoteCourse({ klasses[] })` คืน `slots` (วันที่ + คลาส + นาที) → ตอนจ่ายเงินพาเข้าคาบถูกคลาส
- **Monthly pro-rate นับสัปดาห์** (`weekKey`, `openDaysOf`, `PeriodLine.weeks`)
- **แพ็กชั่วโมง = คาบเต็ม** ตามความยาวจริงของแต่ละคลาส (24 ชม. ÷ 1:30 = 16) เศษโชว์เป็นนาที Admin ต้องเลือก:
  - `CourseLine.leftover`: carry = เก็บไว้ / extra = +1 คาบฟรี / drop = ตัดทิ้ง
  - ถ้ายังไม่เลือก บันทึกไม่ได้
- **เศษที่เก็บไว้:** `Entitlement.carryMinutes` → Invoice ถัดไปของคอร์สเดียวกันดึงเข้าอัตโนมัติ (`carriedMinutes`, `CourseLine.carryIn`) ใบที่ยกเลิกคืนเศษให้
- ลาใช้โควตายืดไปคาบถัดไปของคลาสไหนก็ได้ในแพ็ก (`nextClassDates(klasses[])`)
- UI:
  - เลือกคลาสเป็นการ์ดติ๊กหลายอัน + ชิปกรองวัน
  - ตารางเดือนโชว์ "N สัปดาห์ · N คาบ → %"
  - กล่องฟ้าถามเรื่องเศษนาที
  - InvoiceSheet / หน้านักเรียน โชว์ชื่อหลายคลาส "A + B"
- seed:
  - แก้ให้ตรงกัน: วิทย์ 12 ชม. = 6 คาบ, ขิม 2 แพ็ก = 12
  - เพิ่ม "อังกฤษ Conversation 10 ชม." (คลาส 90 นาที → 6 คาบ + เศษ 60 นาที) ไว้ลอง
- persist 31→33 · 129 tests
- ทดสอบในเบราว์เซอร์:
  - รายเดือน พ.+พฤ. ต.ค. = 7 คาบ 5 สัปดาห์ → 100%
  - 10 ชม. → ถามเศษ 60 นาที, กด +1 คาบ → 7 คาบ ราคาเท่าเดิม

**Build ข้อ 1 รอบรถเพิ่ม เสร็จ ✅**
- โมเดล `BusAddOn` (วันที่, รับ/ส่ง, ประเภทค่ารถ, ราคา ณ ตอนบันทึก, หมายเหตุ) · `Invoice.busExtras: BusExtraLine[]` · `totals.busExtra`
- กฎ `pendingBusAddOns` (รอเรียกเก็บ = ยังไม่อยู่ในใบที่ไม่ใช่ void) · `billedOn` · `busAddOnAmount` · `validateBusAddOn` · `duplicateBusDay` (เที่ยวเดียวกันวันเดียวกันซ้ำไม่ได้)
- หน้าต่างนักเรียน → การเงิน → **"รอบรถเพิ่ม"**:
  - เพิ่มหลายวัน, ติ๊กรับ/ส่ง, เลือกประเภทค่ารถ, ใส่หมายเหตุ
  - รายการแต่ละวันโชว์ "รอเรียกเก็บ" หรือ "ใบ INV-…"
  - ลบได้เฉพาะวันที่ยังไม่ถูกเรียกเก็บ
- Invoice ใบถัดไปดึงให้อัตโนมัติ (ติ๊กออกเพื่อเลื่อนไปใบหลังได้) · ออกใบเฉพาะค่ารถได้ · ลดวันใช้รถไม่คืนเงิน
- store กันเรียกเก็บซ้ำ · ใบที่ void คืนรายการเป็นรอเรียกเก็บ
- InvoiceSheet / ข้อความ LINE / รายการใบแสดง "ค่ารถเพิ่ม (รอบก่อน …)"
- seed: ใบเตยมีรอบรถเพิ่มรอเรียกเก็บ 2 วัน · persist 33→34 · 133 tests
- ยังไม่มี: ตารางรถสำหรับคนขับ (รอบรถรวมทั้งสาขาต่อวัน) — ถ้าต้องการค่อยทำ

**Build ข้อ 3 คืนเงิน / ลดหนี้ เสร็จ ✅**
- โมเดล `CreditNote` (เลข CN-THL-6909-0001, mode: refund | credit, items, reasons + remark, stopFrom, status, refund record) · `Invoice.creditsUsed` · `totals.credit`
- กฎ `domain/rules/refunds.ts`:
  - `refundableItems`: คอร์ส (สุทธิหลังโปร), ค่ารถ, ค่ารถเพิ่ม, หนังสือ, Advance แต่ละตัว หักส่วนที่คืนไปแล้ว
  - `unusedShare`: แนะนำยอดตามคาบที่เหลือหลังวันหยุดเรียน
  - `validateCreditNote`: ต้องจ่ายครบแล้ว, ≥1 รายการ, ไม่เกินรายการ/ยอดจ่าย, มีเหตุผล
  - `canApproveCreditNote` / Force (maker–checker เหมือน Invoice)
  - `validateRefundRecord`: ต้องระบุบัญชีที่โอนออก + วันที่ + เลขอ้างอิง ไว้เทียบ Statement
  - `availableCredit` / `autoCredits`: เครดิตผูกนักเรียน + คอร์ส ใช้ได้ครั้งเดียว ไม่เกินค่าคอร์สนั้น ใบ void คืนเครดิต
- อนุมัติแล้วถ้ามี "หยุดเรียนตั้งแต่":
  - แพ็กจบก่อนวันนั้น (แพ็กชั่วโมงลดจำนวนคาบ)
  - เอาออกจากคาบหลังวันนั้นที่ยังไม่เช็คชื่อ
  - ออกจากรายชื่อคลาสถ้าไม่มีแพ็กอื่นจ่ายคลาสนั้นอยู่
- UI:
  - InvoiceSheet ใบที่ชำระแล้ว → "คืนเงิน / ลดหนี้" → ทำใบลดหนี้: เลือกโหมด, ชิปเหตุผล + พิมพ์เอง, วันหยุดเรียน, ติ๊กรายการ + ใส่ยอดเอง (ปุ่ม "ตามคาบที่เหลือ 3/5 = ฿2,610")
  - การ์ดใบลดหนี้: อนุมัติ / Force / ยกเลิก / บันทึกโอนคืน
  - Invoice ใบถัดไปหักเครดิตคอร์สอัตโนมัติ (ติ๊กออกได้) · ข้อความ LINE มีบรรทัดหักเครดิต
- persist 34→35 · 139 tests
- ทดสอบในเบราว์เซอร์: สร้าง CN แบบเครดิต ฿2,610 → Force อนุมัติ → Invoice ใหม่คอร์สคณิตหัก −฿2,610 ให้เอง
- ยังไม่มี: หน้ารวมใบลดหนี้ทั้งหมด (ตอนนี้ดูผ่านใบแจ้งหนี้แต่ละใบ) · PDF ใบลดหนี้ (ทำพร้อม PDF จริง)

**ไฟล์ตัวอย่างจากเจ้าของ (2026-09-30):**
- `~/Documents/Sheet/INV + REC.xlsx` = แบบใบแจ้งหนี้ + ใบเสร็จจริง
- `~/Documents/Sheet/Sales Tax report.xlsx` = รายงานภาษีขาย 1 แท็บ/เดือน
- Google Sheet "BN ⭐📅 Schedule" (อ่านผ่าน Drive connector ได้) — แท็บ `Student_data(copy)` คือรายชื่อนักเรียน ไม่มีแท็บ Course/Class จริง

**เจ้าของเคาะเรื่องเอกสาร:**
- **เลขเอกสาร `yymmdd-ประเภทธุรกิจ-สาขา-running`** เช่น 690930-01-001-0001
  - ออกเลขทันทีที่กดสร้าง Invoice = เป็นใบจริงตั้งแต่ตอนนั้น มีปัญหาให้ Void ไม่ลบ
- ทุกเอกสารออกในนาม **บริษัท ลิคลาส เอ็ดดูเคชั่น จำกัด** (บริษัทแม่)
- ผู้จัดทำ + ผู้มีอำนาจลงนาม = **Admin ที่สร้าง Invoice ใบนั้น**
- ทุกสาขาใช้ Google Sheet template เดียวกัน

**Build เลขเอกสาร + PDF จริง ✅**
- `nextInvoiceNumber("INV" | "CN", branch, date)`:
  - ประเภทธุรกิจ `BUSINESS_CODE` NockAcademy = 01, Liclass = 02
  - `Branch.branchNo` 3 หลัก (Settings → ข้อมูลสาขา, ล็อกเมื่อออกเอกสารแล้ว, เพิ่มสาขาใหม่ได้เลขถัดไปของแบรนด์)
  - running เริ่มใหม่ทุกวันต่อธุรกิจ + สาขา
- เลขออกตอน **สร้าง** Invoice (store `saveInvoice`) · ใบเสร็จใช้ **เลขเดียวกับใบแจ้งหนี้** (ตาม template) · ใบลดหนี้ `CN-690930-01-001-0001`
- สถานะ `draft` แสดงเป็น "รอสร้าง PDF" · ตัดคำว่า "ร่าง/ยังไม่มีเลข" ออกทั้งระบบ
- `SystemConfig.company` (ชื่อ TH/EN, ที่อยู่ TH/EN, Tax ID 0205557003965, สำนักงานใหญ่)
- กฎ `domain/rules/documents.ts`:
  - `invoiceItems`: บรรทัดในเอกสาร — รายเดือนแยกเดือนละแถว, แพ็กชั่วโมง/สัปดาห์ qty = จำนวนแพ็ก, Course fee, โปร/ส่วนลด/เครดิตเป็นแถวติดลบ, รวมแล้ว = ยอด Invoice เสมอ (มีเทส)
  - `customerOf`: ชื่อจริงนักเรียน หรือข้อมูลภาษีของครอบครัว
  - `invoiceDates`: ครบกำหนดสิ้นเดือน · `receiptDate`: วันที่เงินเข้า
  - `preparedBy` · `documentFileName` "เลข ชื่อลูกค้า"
- หน้า **`/print/invoice|receipt|credit-note/[id]`**:
  - A4 หน้าตาตาม template: หัวบริษัท, ลูกค้า, ตารางรายการ, ช่องทางชำระเงิน, Memo, Sub Total / VAT 7% = 0 / Total, Total Due By, ลายเซ็น
  - ปุ่ม "พิมพ์ / บันทึก PDF" ชื่อไฟล์ตั้งให้ตาม template
- InvoiceSheet มีปุ่ม PDF ใบแจ้งหนี้ / PDF ใบเสร็จ · การ์ดใบลดหนี้มีลิงก์ PDF
- persist 35→36 · 141 tests

**เจ้าของเคาะ (2026-09-30 ต่อ):**
- **เวลาเรียนยืดหยุ่น:** คลาส 2 ชม. แต่นักเรียนบางคนเรียน 1 ชม. ได้ทั้งแบบประจำและครั้งคราว เลือกได้ว่าชั่วโมงแรกหรือหลัง
  - รายเดือนราคาเท่าเดิม ต่างแค่การหัก
  - Session ต้อง flexible และช่วยเรื่องเศษชั่วโมงด้วย
- **สรุปการเรียน:** Book / Lesson Topic / Lesson Detail / Feedback (= รายงานการเรียนต่อคาบของนักเรียนคนนั้น)
  - Book/Topic พิมพ์สร้างเองแล้วคนอื่นเลือกได้ กันพิมพ์ซ้ำ
  - ใช้ในสาขา โดยครูที่สอน / ช่วยสอน / สอนแทน · ครูสร้างและจัดการเอง
  - ส่งผู้ปกครองครบทั้ง 4 ช่อง
- **Export รายงานภาษีขาย:** ทำเลย

**Build ✅ (3 commits: `70ea4e6`, `2e7b852`, + export)**
1. **เวลาเรียนยืดหยุ่น** (`domain/rules/seats.ts`)
   - `Seat {offset, minutes}` · `Klass.seats` (ประจำ ตั้งจาก Invoice ตอนจ่ายเงิน) · `Session.seats` (คาบนี้) · `Attendance.minutes` (มาจริงกี่นาที)
   - `Entitlement.minutesTotal` → แพ็กชั่วโมงหักตามนาทีที่เรียนจริง: ขาด = หักตามเวลาปกติ, ลา = ไม่หัก
     - "เหลือ X คาบ" = นาทีที่เหลือ ÷ เวลาเรียนปกติ
     - เศษไม่หาย ค้างในยอดคงเหลือ
   - Invoice: เลือก "เต็มคลาส / ชม.แรก / ชม.หลัง" ต่อคลาส → แพ็ก 24 ชม. ชม.แรกของคลาส 2 ชม. = 24 คาบ ราคาเท่าเดิม
   - หน้าคาบ:
     - ป้าย "ชม.แรก (1 ชม.)"
     - เมนู ⋮ "เวลาเรียนของ…" (คาบนี้ / ทุกคาบ)
     - ใต้นักเรียนที่มา มี "เรียนจริง 2 ชม. ▾" เลือก 1:30 / 1 ชม. / 30 นาที ได้ (ล็อกเมื่อปิดคาบ)
2. **สรุปการเรียนแบบใหม่** (`domain/rules/lessons.ts`, `components/app/lesson-picker.tsx`)
   - `LessonBook` / `LessonTopic` ต่อสาขา
   - พิมพ์เพื่อค้นหา/สร้าง: ชื่อเดียวกันต่างตัวเล็ก-ใหญ่/ช่องว่าง = อันเดิม, พิมพ์ผิดนิดหน่อยถาม "ใช่อันนี้ไหม?"
   - ครูแก้ชื่อ / รวมที่ซ้ำได้เอง (สรุปเก่าย้ายตาม)
   - สรุปใหม่เติมหนังสือเดิม + บทถัดไปให้
   - **Summary Template** = ใช้ Book/Topic/Detail เดียวกันกับทุกคนที่มาเรียนคาบนั้น (Feedback แยกรายคน) — ตีความเอง รอเจ้าของยืนยัน
   - LINE ผู้ปกครองได้ครบ 4 ช่อง
3. **Export รายงานภาษีขาย** (`salesTaxRows`/`salesTaxTotals` ใน documents.ts, `lib/sales-tax-export.ts` ใช้ exceljs, ปุ่ม "รายงานภาษีขาย" หน้าใบแจ้งหนี้)
   - ทั้งบริษัท (ทุกสาขาที่ผู้ใช้เห็น) · 1 แท็บต่อเดือน ชื่อแท็บ "26-09" · หัวบริษัทเหมือนไฟล์จริง
   - คอลัมน์ ลำดับ / วันที่ (วันที่เงินเข้า) / เลขที่ใบกำกับ / ชื่อ / มูลค่า + ธุรกิจ / สาขา / อ้างอิง
   - ใบลดหนี้ที่อนุมัติ = แถวติดลบในเดือนที่ออก · ท้ายแท็บรวม + แยกตามธุรกิจ (NockAcademy / Liclass)
   - มีพรีวิวรายเดือนก่อนดาวน์โหลด
- persist 36→38 · 150 tests

**ค้าง/สมมติฐาน:**
- running รีเซ็ตรายวัน — เดาจากตัวอย่าง
- จำนวนที่นั่งแยกรายชั่วโมง (คลาส 2 ชม. ที่คนเรียนคนละชั่วโมง) ยังนับรวมทั้งคลาส
- ไฟล์ PDF ทั้งเดือนเป็นโฟลเดอร์ (zip) ยังไม่ทำ — ตอนนี้บันทึก PDF ได้ทีละใบ

**คาบชนในเดโม (เจ้าของถาม 2026-09-30):** ในระบบสร้างคาบชนไม่ได้อยู่แล้ว (ครูชน / ห้องซ้ำ / ห้องเต็ม = block ทุกทาง: สร้างคลาส, แก้คลาส, คาบเดี่ยว, ลากย้าย, เปลี่ยนครู, อนุมัติฟอร์ม) — ที่เห็นบนปฏิทินมาจาก "คาบโชว์" ใน seed ที่ใส่ตรงๆ ไม่ผ่านกฎ
- แก้ seed ให้เหลือคาบชน **จุดเดียว** (ครูมิ้นท์ 2 คาบเวลาเดียวกัน) ไว้โชว์หน้าจอเตือน
- คาบโชว์อื่นหาห้อง/ครูที่ว่างเองไม่ให้ชนคลาสปกติ · persist 38→39
- หน้าจอเตือนคาบชนเก็บไว้เป็นตัวกันพลาดสำหรับข้อมูลที่ Import จาก Google Sheet

**การวางคลาสแบบ NockAcademy (เจ้าของส่ง ref ตารางวัน 2026-09-30):**
- 1 คลาส = ครู + ช่วง 2 ชม. + ห้อง · นักเรียนหลายวิชา / หลายเล่ม / หลายระดับเรียนด้วยกัน · บางคนเรียน 1 ชม.
- เจ้าของเคาะ:
  - ครูเป็นตัวกำหนดวิชา · ใส่เด็กคอร์สไหนก็ได้ Admin/ครูจัดเอง
  - ช่วงเวลามาตรฐานแต่ละสาขาตั้งเอง
  - ห้องจัดรายวันได้
  - จำนวนคนไม่บล็อก (เตือนเกิน 6)
  - ป้ายเรียนเดี่ยว = เตือนเกิน 3 · คอร์สเรียนเดี่ยวเข้าคลาสไหนก็ได้แต่เตือน
  - ไม่ต้องนับรายชั่วโมง
  - ตั้งเวลาเรียนก่อนวันเรียนได้ (ผู้ปกครองโทรมาก่อน)
  - คลาสแบบ วิชา + ระดับ ก็ยังใช้ ทั้ง 2 แบบใช้ได้ทั้ง 2 ธุรกิจ
  - ตารางทั้งสัปดาห์แบบ A (เรียงวันลงมา)
- **Build ✅**
  - `Klass.layout` = "teacher" | "subject"
  - `Branch.blocks {weekday, weekend, minutes}` + Settings → เวลาเปิด-ปิด → การ์ด "ช่วงคลาสมาตรฐาน" (เพิ่ม/ลบ/เติมต่อกันจนปิดสาขา)
  - สร้างคลาส: เลือก "ครู + ช่วงเวลา" (วิชามาจากครู ไม่มีระดับชั้น ชื่อ "ครูได · ศ. 17:00") หรือ "วิชา + ระดับชั้น" · แถววัน/เวลามีชิปช่วงมาตรฐานให้กด
  - จำนวนคนเป็นแค่คำเตือนทุกที่ (สร้างคลาส / เพิ่มนักเรียน / ย้ายคาบ)
  - Invoice: คลาสที่ตรงขึ้นก่อน กด "แสดงคลาสอื่น" เลือกได้ทุกคลาสพร้อมเหตุผล (`classFit` / `classChoices`)
  - หน้าคาบ: กดป้ายเวลาเรียนข้างชื่อ ("2 ชม." / "ชม.แรก") เพื่อเปลี่ยนได้ทันที รวมถึงคาบอนาคต
  - ปฏิทิน → **"ตารางครูทั้งสัปดาห์"**:
    - วันละตาราง เรียงลงมา · คอลัมน์ครู · แถว Room + ช่วงมาตรฐาน
    - ในช่อง "ชื่อเล่น (วิชา · หนังสือล่าสุด)" + เวลาเฉพาะของคนเรียนไม่เต็ม + จุดสีเช็คชื่อ
    - คาบนอกช่วงเป็นแถวของตัวเอง · ช่องว่างกดสร้างคลาส · แถบกระโดดไปวัน
  - seed: คลาส "ครูได · ศ. 17:00" (คณิต + วิทย์, มีคนเรียน ชม.แรก / ชม.หลัง) · persist 39→40 · 150 tests
- ยังไม่ทำ: พิมพ์ตารางสัปดาห์เป็น PDF (วันละหน้า)

**ปรับแถวนักเรียนในหน้าคาบ (เจ้าของสั่ง 2026-09-30):**
- เอาชื่อจริงออก · เอา Progress Bar ออก (เหลือ "คาบ 4/5" ในบรรทัดคอร์ส)
- ชื่อซ้าย เกรดขวา · ชื่อคอร์สแบบสั้น `shortCourse` "คณิต · รายเดือน" (hover เห็นชื่อเต็ม)
- ตัดช่องว่างหน้ารูป (เหลือเฉพาะตอนเปิดโหมดเลือกหลายคน)
- เวลาเรียน: ป้ายเวลากดได้ทุกคาบ → เลือก ชม.แรก / ชม.หลัง หรือ **"กำหนดเอง"** (เวลาเริ่ม + กี่นาที เช่น 45 / 25) ป้ายขึ้น "เรียน 45 นาที"
- ตัด section "เรียนจริง" หลังเช็คชื่อออก (เวลาเรียนตั้งที่ป้ายเวลาอย่างเดียว)
- ฟอร์มสรุปเป็นแบบ shadcn: ไม่มีหัวข้อลอยเหนือช่อง ใช้ placeholder แทน
- ตัดปุ่ม Summary Template → เมื่อเลือกหนังสือ/บทเรียน/รายละเอียดแล้ว มีลิงก์ "ใช้กับทุกคนที่มาเรียน (N คน)" แล้วแก้รายคนได้

**ตารางครูทั้งสัปดาห์ รอบ 2 (เจ้าของสั่ง 2026-09-30):**
- วงเล็บหลังชื่อ = **โน้ตพิมพ์อิสระ** ต่อนักเรียนต่อคาบ ไว้เตือนความจำ เช่น "Math Book Lesson 1 Page 2-6" — ไม่ใช่ชื่อวิชา
  - `Session.notes` + `setSessionNote`
  - แก้ได้ในตาราง (กดที่โน้ต หรือ "+ โน้ต" ตอนชี้ช่อง)
  - หน้าคาบโชว์ "📝 โน้ต"
- แสดงเกรดนักเรียน
- วันที่ผ่านแล้วหัวสีเทา "ผ่านไปแล้ว" · วันนี้หัวสีแดง "วันนี้" · ช่วงที่ผ่านแล้วพื้นเทา · ช่วงที่กำลังเรียนขึ้น "กำลังเรียน"
- ผลรายคน: มา / ขาด / ลา / ยังไม่เช็ค / ยกเลิก
  - ย้ายเข้า "↩ ย้ายมาจาก จัน 28 ก.ย." · ย้ายออกเป็นชื่อขีดฆ่า "→ ย้ายไป พฤห 1 ต.ค. 17:00" (กดเปิดคาบปลายทาง)
- seed มีโน้ตตัวอย่างในคลาส "ครูได · ศ. 17:00" · persist 40→41
- **รอบ 3 ตาม Ref ดีไซน์เจ้าของ (shadcn):**
  - หัวครูเป็น avatar + ชื่อ + วิชาที่สอน + Badge จำนวนคลาสวันนั้น
  - แถว Room (ไม่มีห้องขึ้น "-") · คอลัมน์เวลาเป็นเวลาเริ่ม/จบซ้อนกัน
  - คลาสเป็นการ์ดสีตามวิชา: ชื่อวิชา (+เวลาถ้าไม่เต็มช่วง), Badge สอบวัดระดับ/ทดลองเรียน (การ์ดเส้นประ), จำนวนนักเรียน, ครูช่วยสอน, ไอคอนสถานะ (รอเริ่ม / กำลังเรียน / รอเช็คชื่อ / รอสรุป / เสร็จ)
  - คลาสที่กำลังเรียนเป็นการ์ดทึบ
  - นักเรียน 2 คอลัมน์: avatar · ชื่อเล่น · Note… ✎ (กดแก้) · เวลาเฉพาะ · ผล · เกรด
  - เส้นแดงเวลาปัจจุบันในช่วงที่กำลังเรียน · ช่องว่างชี้แล้วขึ้น "+ สร้างคลาส" แบบเส้นประ

**ปฏิทิน + เช็คชื่อ (เจ้าของสั่ง 2026-09-30 ต่อ):**
- ปฏิทิน:
  - "วัน" (default) มี 2 โหมดสลับได้: ตารางครู (ทั้งสัปดาห์) / รายวัน (มุมมองวันแบบเดิม ลากย้ายได้)
  - สถานะคลาสเป็น Dropdown แบบเดียวกับครู / วิชา
  - แถบวันใช้สีประจำวันแบบไทย (วันนี้สีเข้ม ผ่านแล้วจางลง) · พื้นหลังหน้าปฏิทินสีเทา
- **ไม่มี "ขาด" แล้ว** — เช็คชื่อมีแค่ มา / ลา / ย้ายวัน
  - ลามี 2 แบบ: **หักโควตา** (เดิม) กับ **ไม่หักโควตา** (`Attendance.noQuota` ไม่นับโควตา แต่ยืดวันจบให้ 1 คาบ)
  - ปุ่ม "ย้ายวัน" = Re-schedule เดิม
- **ครูลา** (เมนูคาบ ⋮ → ครูลา) `store.teacherLeave` / `Session.teacherLeave`:
  - มีครูสอนแทน → เปลี่ยนครูคาบนั้น (เช็คครูชน)
  - ไม่มี → ยกเลิกคาบ + แจ้งเตือน + วันเรียนจบของนักเรียนทุกคนเลื่อนออกไป 1 คาบ (`teacherLeaveCancels` ใน `resolveEntitlements`) และพาเข้าคาบถัดไปให้
  - หัวคาบโชว์ "ครูโจลา (ป่วย) · ครูได สอนแทน"
- seed: ไม่มี absent · คาบทดลอง/สอบตัวอย่างหาห้อง/ครูว่างเอง (เหลือคาบชนจุดเดียวเสมอ) · persist →43 · 152 tests
- **เจ้าของเคาะเพิ่ม:** เด็กไม่มา = ลา (Admin เลือกแบบตามดุลพินิจ) · ลาทั้ง 2 แบบเลือก**จำนวนคาบ**ได้ และแก้ได้ตลอด (กลับมาก่อน / ลาต่อ) · ครูลาเลือก**ครู Part-time** สอนแทนได้
  - `markLeave(sessionId, studentId, {count, noQuota})` + `Attendance.leaveGroup`: ลาเป็นชุดตั้งแต่คาบนี้ไป N คาบในคลาสของแพ็กเดียวกัน (`leaveRunSessions`) · แก้จากคาบไหนในชุดก็ได้ (ลด = มาเรียนก่อน, เพิ่ม = ลาต่อ, "ยกเลิกการลา (มาเรียน)") · คาบที่ปิดแล้วไม่แตะ
  - หน้าลา: เลือกหักโควตา (บอกโควตาเหลือ) / ไม่หักโควตา + จำนวนคาบ + พรีวิวรายวัน (ใช้โควตา / เกินโควตาไม่ชดเชย / ยืดวันจบ) · แถวนักเรียนขึ้น "ลาชุด 3 คาบ"
  - `Staff.partTime` · seed ครูฝน / ครูแก้ว (Part-time) · หน้าบุคลากรติ๊ก Part-time ได้ · หน้าครูลาเรียงครูประจำก่อน แล้วตามด้วย "· Part-time"
  - 153 tests · ลองในเบราว์เซอร์: ลาไม่หักโควตา 3 คาบ → แก้เหลือ 2 คาบ ถูกต้อง
- ใบลดหนี้ในรายงานภาษีขาย: เสนอเป็นแถวติดลบในเดือนที่ออกใบลดหนี้ อ้างเลข Invoice เดิม — ยังไม่ได้ build
- **ต่อไป:** Export รายงานภาษีขาย (xlsx แท็บต่อเดือน + โฟลเดอร์ PDF) · Import จาก Google Sheet (`Student_data`)

**📌 งานที่เจ้าของฝากไว้ (2026-09-30):** Import **Student list, Course list, Class list จาก Google Sheet** เข้าระบบ และต้องสร้างบน ERP ได้จริง (นักเรียนที่ Import เข้ามา = `Student.imported` → ไม่เก็บค่าแรกเข้า) — รอตัวอย่าง Sheet จากเจ้าของ

---

## 2026-09-30 (ต่อ) — ใบแจ้งหนี้หลายคอร์ส + Select Course แบบการ์ด (ก้อน 1/3 ของ "Invoice ตาม Staging") ✅ (เครื่องทำงาน)

**เจ้าของเคาะ:** (1) Director เห็นทุกสาขา แต่**สร้างใบแจ้งหนี้เลือกคอร์สได้เฉพาะสาขาตัวเอง** (2) สาขาต้องบอก**จังหวัด** — BKK = กรุงเทพฯ, CBR = ชลบุรี (อนาคตเพิ่มได้) (3) คอร์สมี**เรียนเดี่ยว/กลุ่ม** — Admin เลือกตามความต้องการผู้ปกครอง แต่ละสาขาสร้างตามข้อตกลงของตัวเอง

**ทำแล้ว:**
- โมเดล: `Invoice.course` → **`Invoice.lines: CourseLine[]`** (แต่ละคอร์สมีคลาส/วันเริ่ม/จำนวนงวดของตัวเอง) · `Course.format: "group" | "single"` · `Branch.province` · persist 28→29
- กฎ (`billing.ts`): `quoteLine` / `invoiceTotals().lines` (ราคา+Course fee+โปรโมชันแยกต่อคอร์ส) · `invoiceSessionDates` (ค่ารถตามวันเรียนรวมทุกคอร์ส วันละครั้ง) · `classOptionsFor` (คลาสวิชาเดียวกัน + **รูปแบบเดียวกัน** เดี่ยว/กลุ่ม, คลาสที่ผูกคอร์สขึ้นก่อน) · validate บอกว่าคอร์สที่เท่าไรผิด + ห้ามคอร์ส+คลาสซ้ำในใบเดียว · `course.ts`: `filterCourses` (เฉพาะสาขา, active, ยังไม่หมดช่วง, กรองวิชา/รูปแบบ/แพ็กเกจ + ค้นหา) · `settings.ts`: `branchLabel` "ทองหล่อ · BKK", `KNOWN_PROVINCES`, validate จังหวัด
- UI: **`CoursePicker`** (ตาม `Course selection.png`: การ์ด multi-select, ตัวกรอง วิชา/เดี่ยว-กลุ่ม/แพ็กเกจ + ค้นหา, ป้าย Single/Bundle + เดี่ยว/กลุ่ม + ชั้น + แพ็กเกจ + ราคา + ช่วงวันที่ + จำนวนคลาสที่ผูก, เตือนไม่ตรงชั้น, "แสดงเพิ่ม" ทีละ 24, ปุ่มสร้างคอร์สใหม่แล้วติ๊กให้เลย) · **InvoiceEditor** เป็นการ์ดต่อคอร์ส (ลบได้, ต่ออายุจากชิปคอร์สเดิมได้, เลือกนักเรียนทีหลังก็ขยับวันเริ่มต่อจากแพ็กเดิมให้) · InvoiceSheet/ข้อความ LINE/ใบเสร็จ/รายการใบแจ้งหนี้/หน้าคอร์ส (รายได้ต่อคอร์ส)/หน้าต่างนักเรียน แสดงทุกคอร์ส · ยืนยันยอดครบ = เข้าคลาส + สร้างสิทธิ์**ทุกคอร์ส** · Create Course มีสวิตช์ กลุ่ม/เดี่ยว · Settings สาขา + เพิ่มสาขา มีช่องจังหวัด · Sidebar/หัวหน้า โชว์ "สาขาทองหล่อ · BKK" · seed มีคอร์สเรียนเดี่ยว "คณิต ป.5 เรียนเดี่ยว 12 ชม." + คลาสเดี่ยว
- 121 tests · tsc/eslint สะอาด · ทดสอบในเบราว์เซอร์: เลือก 2 คอร์ส → เลือกคลาส → ยอดรวมถูก, เตือนซื้อซ้อน, ชิปต่ออายุเลื่อนวันเริ่มเป็น 1 พ.ย., บันทึกร่างแล้ว InvoiceSheet โชว์ทั้ง 2 คอร์ส

**ก้อน 2–3 เสร็จ (`cd95177`):**
- **ค่ารถ:** เลือกประเภทค่ารถจาก General Fees (`Invoice.busFeeId`, ถ้าไม่เลือกใช้ประเภทแรก)
  - กล่องค่ารถโชว์หมุดบ้าน, ทาง (addressNote), ที่อยู่ และลิงก์เปิดแผนที่ ถ้ายังไม่ปักหมุดขึ้นเตือนสีเหลือง
- **Advance Optional:** ชิปเลือกค่าแรกเข้า/Mock จาก General Fees
  - `Invoice.advance: AdvanceItem[]` เก็บชื่อ + ราคา ณ ตอนออกใบ แทน `advanceFee` แบบตัวเลขเดิม
  - ใส่ค่าแรกเข้าให้อัตโนมัติเฉพาะคนที่ยังไม่เคยจ่าย ยกเว้นเองถ้าเคยมีใบที่จ่ายค่าแรกเข้า หรือเป็นนักเรียนที่มีใบชำระแล้ว (`entryFeePaidOn` / `defaultAdvance`)
  - Mock ต้องกดเลือกเอง
- InvoiceSheet และข้อความ LINE แสดงชื่อประเภทค่ารถ + รายการ Advance ทีละตัว
- seed: ครอบครัวสุขใจมีหมุดบ้าน · persist 29→30 · 123 tests
- ทดสอบในเบราว์เซอร์กับใบเตย:
  - 4 คาบติ๊กรถให้เอง
  - Standard ฿1,200 → โซนไกล ฿1,600 ยอดรวมเปลี่ยนถูก
  - ค่าแรกเข้าถูกยกเว้น

**เจ้าของเคาะเรื่องค่าแรกเข้า (2026-09-30):** จะมีระบบ **Import รายชื่อนักเรียนเก่าทั้งหมด** จากระบบเดิม ใครถูก Import เข้ามาถือเป็นนักเรียนเก่าที่เคยซื้อคอร์สแล้ว = ไม่เก็บค่าแรกเข้า และตอนสร้าง Invoice ต้องบอก Admin ให้ชัด
- ทำแล้ว: `Student.imported { at, source }` · `entryFeeWaiver()` ยกเว้นค่าแรกเข้าเมื่อ (1) เคยมีใบชำระที่มีค่าแรกเข้า (ตาม Staging) หรือ (2) เป็นนักเรียนที่ Import เข้ามา
  - ใบชำระที่ไม่มีค่าแรกเข้าไม่นับแล้ว (ยึดตาม Staging)
- ใบแจ้งหนี้โชว์ป้าย "นักเรียนเก่า" ข้างชื่อ + กล่องฟ้า "นักเรียนเก่า — นำเข้าจากระบบเดิม (วันที่) เคยซื้อคอร์สกับเราแล้ว ไม่ต้องเก็บค่าแรกเข้า"
- seed: นักเรียนเดิมทุกคนติด imported · persist 30→31 · 123 tests
- **ยังไม่ได้ทำ:** หน้าจอ Import เอง (อัปไฟล์รายชื่อ → จับคู่ครอบครัว/สถานะ) — ทำเป็นงานถัดไปได้

**ยังค้าง:**
- เทส LINE จริงกับเจ้าของ
- ส่วนของ Staging ที่ยังไม่ทำ:
  - เลือกหลายคลาสต่อคอร์ส (กรองตามวัน)
  - Upload pay slip & Statement checking
  - Accounts status
  - Refund/Credit note

---

## 2026-09-28 (ต่อ 2) — ERP: เทียบกับ Staging ใหม่ทั้งหมด + ขั้นที่ 1 Settings ✅ (เครื่องบ้าน)

**เจ้าของติ:** erp-v2 ตัดข้อมูลไปเยอะเกิน — Create Invoice, Create Course (Package หาย), Settings รวมทุกอย่างไว้หน้าเดียว ทั้งที่ Staging แยกเมนูเป็นเรื่องๆ → **กฎใหม่: เปิด Staging ดูก่อนออกแบบทุกหน้า ห้ามตัดช่อง/รวมเมนูที่ Staging มี** (จดใน `erp-v2/CLAUDE.md` แล้ว)

**สิ่งที่ Staging มี (เปิดดูอย่างเดียว ไม่สร้าง/แก้ข้อมูล — ยอดใบแจ้งหนี้ยัง 22 เท่าเดิม):**
- **Settings:** รายชื่อสาขา → 11 แท็บ (Branch Info · Bank Account + Invoice Memo · LINE (มีรูป QR) · Scheduling (พรีวิวตามวันที่, คัดลอกไปวันธรรมดา/เสาร์อาทิตย์, Special Schedules — **ไม่เก็บเวลาพัก**) · Subjects · Grades (Primary/Middle-High/Special K1–K3) · **Packages** (Hour 2/2.5/12/24/48/72/96h · Week 4w/8w "Multi class & Hour" · Month; ตารางราคา วิชา×เกรด×ระยะเวลา) · **General Fees** (Bus/Entry/Mock หมวดละหลายประเภท) · **Promotions** (ชื่อ, %/฿, ประเภทแพ็กเกจ, ระยะขั้นต่ำ, ช่วงวันที่, Active) · Staff · Holidays (import จากปฏิทินกลาง)) + **System** (Global Subjects rename, Global Holidays + Broadcast, Invoice Memos ต่อแบรนด์, ภาษา/Timezone/สกุลเงิน/รูปแบบวันที่, Notification prefs "not ready")
- **Create Course:** การ์ดสาขา + Package plans (ช่วงราคา) · Single/Bundle · ชื่อ (ว่างได้ = ตั้งจากวิชา+เกรด) · วิชา · เกรดหลายระดับ + Select all · Duration type (ไม่มี/Hourly/Weekly/Monthly) + ระยะ · **ราคาเติมอัตโนมัติจากตารางสาขา แก้ได้** · Course fee (ค่าอุปกรณ์) · ช่วงวันที่ (optional) · Active
- **Create Invoice:** เลือก **Lead หรือลูกค้า** · **หลายคอร์ส** (Add more; Select Course กรองวิชา/ประเภท/ชั่วโมง, สร้างคอร์สใหม่ได้) · ต่อคอร์ส: งวด, เตือนซื้อซ้อน + remark, pro-rate (`Sep 2026 · 1 session → 30%`), **เลือกหลายคลาส** (กรองตามวัน), วันเริ่ม, ช่วงวันที่ + คาบ/ชม. · Discount (โปรอัตโนมัติ + Check Promotion) · Concession (จำนวน+เหตุผล) · **Bus fee ต่อคอร์ส** (ประเภทจาก General Fees × คาบ, ติ๊กรับ/ส่ง) · Book fee · **Advance Optional** (list ค่าแรกเข้า/Mock, ยกเว้นค่าแรกเข้าอัตโนมัติถ้าเคยจ่าย) · Detail: Family, Tax detail · Workflow: Created → PDF Approved (**Approve with Reason**) → Send → **Upload pay slip & Statement checking** → Create Receipt → Send · List กรอง **Accounts status** (Needs reconciliation / Ready for accountant / Sent to accountant / email failed)

**ขั้นที่ 1 เสร็จ — Settings แยกตาม Staging:** `/settings` (สาขา | ระบบ) + `/settings/branches/[id]` 11 แท็บ แต่ละการ์ดมีปุ่มบันทึกของตัวเอง (บันทึกเฉพาะช่องของการ์ดนั้น ไม่ทับกัน) · seed มีค่ารถ 2 ประเภท / ค่าแรกเข้า / Mock, โปร 2 อัน, ตารางราคาครบ · ใบแจ้งหนี้ใช้ค่ารถจาก General Fees แล้ว · โปรโมชันเช็คตามประเภทแพ็กเกจ + ระยะขั้นต่ำ · persist 17→18 · 67 tests · ทดสอบในเบราว์เซอร์: แก้ราคาในตาราง → บันทึกจริง, แท็บค่าธรรมเนียม/โปรโมชัน/เวลาเปิด-ปิด/System แสดงครบ

**ต่อ — วันหยุดตามดีไซน์เจ้าของ (`~/Documents/ERP Screen Shot/Holiday.png`):** แท็บ "เวลาเปิด-ปิด & วันหยุด" มี sub-tab เวลาปกติ / ช่วงเวลาพิเศษ / วันหยุด · หน้าวันหยุด = **รายการซ้าย (กรองทั้งปี/เดือนนี้) + ปฏิทินรายเดือนขวา** (ชี้ช่องว่างแล้วกด + เพิ่ม) · วันหยุดมี 3 ประเภท: **ประเพณี / บริษัท** (สร้างที่ Settings → System โดย Director) และ **ของสาขา** (Admin/Manager ของสาขานั้นสร้าง) · วันหยุดบริษัทมี**สวิตช์ต่อสาขา** (เปิด = หยุด, ปิด = สาขานี้เปิดทำการ → จาง + ขีดฆ่าในปฏิทิน) · เปิดสวิตช์กลับเป็นหยุด → ถามก่อนพร้อมจำนวนคาบที่กระทบ + ติ๊กยกเลิกคาบ · Admin/Manager เข้าเมนูตั้งค่าได้ **เฉพาะวันหยุดของสาขาตัวเอง** (permission ใหม่ `holiday.manage`) · โมเดล: `Holiday.category`, `Holiday.openBranchIds` (`closesBranch()` ใน scheduling.ts ใช้ทั้งระบบ) · persist 18→19 · 70 tests · ทดสอบในเบราว์เซอร์ด้วยบัญชี Admin พลอย + Director แล้ว

**ต่อ — ช่วงเวลาพิเศษ (เจ้าของอธิบาย):** = ช่วงวันที่ที่โรงเรียนเปิด-ปิดไม่เหมือนปกติ เช่น **Summer เปิด 08:00–22:00 ทุกวัน** → ระหว่างช่วงนั้นระบบใช้เวลาของช่วงแทนเวลาปกติ (สร้างคลาส/ย้ายคาบ/ฟอร์ม Trial ผ่าน `hoursFor`) · ปรับหน้าจอ: ปุ่ม "เปิดทุกวัน … ใช้กับทุกวัน" คลิกเดียว + ปรับรายวันได้ + โชว์เวลาปกติเทียบ + ป้าย ใช้อยู่/กำลังจะถึง/ผ่านไปแล้ว · กฎใหม่ `validateSpecialPeriods` (ห้ามช่วงทับกัน, เวลาปิดต้องหลังเปิด) · seed มี Summer ของทองหล่อ · persist 19→20 · 72 tests

**ต่อ — ตัดเวลาพักออก (เจ้าของตัดสินใจ):** ระบบ**ไม่เก็บเวลาพัก** ให้คนจัดการกันเอง (ตรงกับ Staging) → ลบ `Branch.breaks` / `BreakTime` / `breaksFor` / เช็ค "ทับเวลาพัก" ใน `slotProblem` / การ์ดเวลาพัก · persist 20→21 · 72 tests

**ต่อ — ช่วงเวลาพิเศษรอบ 2 (เจ้าของขอ):** การ์ดแต่ละช่วง**พับ/ขยายได้** (พับ = บรรทัดเดียว ชื่อ·วันที่·เวลา·สถานะ) · สวิตช์ **Active/Inactive** (`SpecialPeriod.active` — Inactive = เก็บไว้ใช้ปีหน้า ไม่มีผลกับเวลาเปิด และทับวันที่กับช่วงอื่นได้) · แสดงช่วงพิเศษ **บนกระดานวันหยุด** (แถบเหลือง + ป้ายชื่อช่วง), **หน้าปฏิทิน** (แถบบอกช่วงที่อยู่ในมุมมอง) และ **ป้ายบนแถบบนทุกหน้า** "☀ ช่วง Summer · ถึง 6 ธ.ค." เมื่อวันนี้อยู่ในช่วง · helper `periodOn`/`periodsIn` ใน scheduling.ts, `PeriodBanner` · persist 21→22 · 73 tests · ทดสอบในเบราว์เซอร์ (เลื่อนเวลาระบบเข้าช่วง Summer) แล้ว

---

### 2026-09-28 (ต่อ 3) — ขั้นที่ 2: Course ตาม Staging + ดีไซน์ Course Page ✅

**เจ้าของยืนยัน (สำคัญ):**
- **ครูไม่อยู่ใน Course** → ตั้งที่ Create Class เท่านั้น
- **ตัด "No duration"** — ทุกคอร์สต้องเลือกแพ็กเกจ
- **แพ็กเกจ 3 แบบ:** **Hourly** = ซื้อชั่วโมง ใช้จนหมดเมื่อไรก็ได้ หักตามความยาวคาบจริง (24 ชม. ที่คาบ 2 ชม. = 12 คาบ, 90 นาที = 16 คาบ) · **Weekly** = ซื้อ N สัปดาห์ เรียนกี่คาบก็ได้ในช่วงนั้น · **Monthly** = วันที่ 1 – สิ้นเดือนตามปฏิทิน เรียนกี่คาบก็ได้
- Hourly หักชั่วโมงเมื่อเช็คชื่อ **มา/ขาด** · **ลา ไม่หัก**
- **คลาสหลายวิชา** (เช่น Math 15 นาที + Eng 30 นาที เขียน summary ครั้งเดียว) = ใช้กับแพ็กเกจ **Monthly เท่านั้น** ไม่ต้องนับนาทีต่อวิชา แค่เช็คว่าคอร์สที่นักเรียนลงครอบคลุมวิชานั้นไหม
- ลบการ์ด "แพ็กเกจราคา" ที่หน้าคอร์สทิ้ง (ราคามาจาก Settings → Packages ที่เดียว)
- Special Period มี **Priority** ให้เลือกตอนสร้าง (ลูกศรในดีไซน์ `Special Period.png`)

**ทำแล้ว:** ลบ `Package` ออกทั้งระบบ → `Course` เก็บเอง: `kind` (single/bundle) · `subjects[]` · `grades[]` · `unit` (hour/week/month) + `duration` · `price` (เติมจากตารางราคาสาขา, bundle = รวมราคาทุกวิชา) · `priceReason` (บังคับเมื่อราคาไม่ตรงตาราง) · `courseFee` · `from/to` · `active` · กฎ `domain/rules/course.ts` · ฟอร์ม `components/courses/course-dialog.tsx` ตาม Staging (การ์ดสาขา + ปุ่ม "N แพ็กเกจ" ดูช่วงราคา, Single/Bundle, เกรดแบ่งกลุ่ม + เลือกทั้งหมด, เตือน "ราคาต่างกัน ควรแยกคอร์ส") · **หน้า Course ตามดีไซน์ Course Page.png:** KPI 4 ใบ, ค้นหา + กรอง สาขา/วิชา/ประเภท/แพ็กเกจ, เรียงคอลัมน์ได้, **กดขยายแถวเห็นคลาสที่ผูก** (วิชา วัน เวลา เกรด นักเรียน ครู ห้อง สถานะ), แก้ไข/ทำสำเนา/เปิด-ปิดขาย · `Klass.courseId` (ผูกคลาส↔คอร์ส, optional) · ใบแจ้งหนี้คิดราคาจากคอร์ส: รายสัปดาห์ = ทุกคาบใน N สัปดาห์, รายชั่วโมง = จำนวนคาบตามความยาวคาบจริง, + Course fee · `Entitlement.subjects[]` (bundle ครอบคลุมหลายวิชา) · persist 22→23 · 78 tests · ทดสอบในเบราว์เซอร์แล้ว

**+ Priority ของ Special Period ✅:** `SpecialPeriod.priority` (สูง/กลาง/ต่ำ, ไอคอน ⏫/^/⏬ ตามดีไซน์) · ช่วงที่ Active ทับวันกันได้ถ้า Priority ต่างกัน — วันนั้นใช้เวลาของช่วงที่ Priority สูงกว่า (`periodOn`) · Priority เท่ากันแล้วทับกัน = บันทึกไม่ได้ · persist 23→24 · 79 tests

**ขั้นที่ 3 Create Class ตามดีไซน์ ✅:** ฟอร์มเดียวสร้าง**หลายคลาสพร้อมกัน** — ตั้งวิชา/ครู/Support Teacher/ระดับชั้น/Class for/Class type/ห้องครั้งเดียว แล้วกด "+ เพิ่มวัน/เวลา" ได้หลายแถว (วัน + เวลาเริ่ม–จบ) → 1 แถว = 1 คลาส (`createClasses` ตรวจทุกแถวก่อน ไม่สร้างถ้าแถวไหนไม่ผ่าน) · **ความยาวคาบอิสระทีละ 5 นาที** (ขั้นต่ำ 5 นาที — มีผลกับการนับแพ็กเกจชั่วโมง) · **เตือนชนรายแถว**ทันที (ครู/ห้อง/เวลาเปิดสาขา + แถวในฟอร์มทับกันเอง `overlappingRows`) · **หลายวิชาในคลาสเดียว** (`Klass.subjects`/`Session.subjects`, วิชาแรก = วิชาหลักที่ใช้ทั้งระบบ) เขียนสรุปครั้งเดียวต่อคาบ ใช้กับแพ็กเกจรายเดือน · สิทธิ์เรียนครอบคลุมคาบหลายวิชาได้ก็ต่อเมื่อคอร์สมีครบทุกวิชา · ครูหลักต้องสอนครบทุกวิชา ไม่งั้นต้องใส่เหตุผล · **เลือกคอร์ส (ไม่บังคับ)** แล้วเติมวิชา/ระดับชั้นให้ · seed มีคลาสรวม "คณิต + อังกฤษ ป.6" ผูกคอร์ส Bundle

**เจ้าของติ: ห้ามแสดงรายชื่อนักเรียนทั้งหมดเป็นปุ่ม ("ถ้ามีนักเรียน 100,000 คน")** → ทำตัวค้นหากลาง `StudentSearch` + กฎ `searchStudents` (ค้นชื่อ/ชื่อเล่น/ชั้น/โรงเรียน, ชั้นตรงคลาสขึ้นก่อน, แสดงไม่เกิน 8 คน + บอกว่ามีทั้งหมดกี่คน) ใช้ใน 3 ที่: สร้างคลาส, เพิ่มนักเรียนเข้าคาบ, เลือกนักเรียนในใบแจ้งหนี้ · เทสค้นใน 100,000 คน < 200ms · **กฎ: ทุกหน้าที่เลือกข้อมูลที่โตได้ไม่จำกัด (นักเรียน ครอบครัว ลีด) ต้องเป็นช่องค้นหา ไม่ใช่ list/dropdown ทั้งหมด**

persist 24→25 · 85 tests · ทดสอบในเบราว์เซอร์: เตือนชนรายแถว (ครูโจชนวันจันทร์, ห้องเต็ม, แถวทับกันเอง) → แก้แล้วสร้างจริง 2 คลาส 16 คาบ

**หน้าคลาส + ครอบครัว เปลี่ยนจากการ์ดเป็นตาราง (เจ้าของขอ: การ์ดอ่านยาก กวาดสายตาเยอะ):** ตัวช่วยกลาง `components/app/data-table.tsx` (หัวคอลัมน์กดเรียง, แบ่งหน้า 25 แถว + "x–y จาก N") · **คลาส:** คอลัมน์ คลาส (สีวิชา + ชิปวิชา + กลุ่ม/เดี่ยว) · คอร์ส · วัน·เวลา·นาที · ชั้น · นักเรียน x/ความจุ · ครู (+ support) · ห้อง · คาบถัดไป · สถานะ — กรอง ครู/วิชา/วัน/ประเภท/สถานะ + ค้นหา — คลิกแถวเปิดแผงแก้เหมือนเดิม · **ครอบครัว:** คอลัมน์ ครอบครัว · ผู้ปกครองหลัก (+N) · เบอร์ · LINE x/y ผูกแล้ว · ลูก (โชว์ 3 + เหลือ) · ที่อยู่ — กรองสถานะ LINE + ค้นหาได้ถึงชื่อลูก — คลิกแถวเปิดแผงรายละเอียด (ผู้ปกครอง/โค้ดผูก LINE/ลูก/เพิ่มลูก) · แถบเตือนนักเรียนไม่มีครอบครัวบอกแค่จำนวน (ไม่ไล่รายชื่อ) · **กฎ UI: หน้ารายการใช้ตาราง ไม่ใช่การ์ด**

**หน้าคลาสปรับตามดีไซน์ `Class Page.png`:** KPI 4 ใบ (คลาสที่เปิดอยู่ / นักเรียน / ครู / ใกล้หมดแพ็กเกจ — ใช้ threshold จาก Settings → System) · ค้นหา (ชื่อครู ชั้น วิชา ห้อง) + ปุ่มสลับลำดับ + กรอง สาขา / วิชา / ประเภทคอร์ส / แพ็กเกจ (อิงคอร์สที่ผูก) · คอลัมน์ วิชา · วัน · เวลา · ชั้น · นักเรียน · ครู (avatar + ชื่อเล่น + ชื่อจริง + support) · ห้อง · สาขา · สถานะ · › — คลาสที่ปิดแล้วอยู่ท้ายตาราง แสดงจางๆ · ชื่อคลาสแสดงใต้วิชาเฉพาะเมื่อตั้งชื่อเอง · สาขายังโชว์รหัส (THL) แทนภูมิภาค (BKK) — รอเจ้าของตอบว่าจะเพิ่มช่องภูมิภาคไหม

---

### 2026-09-30 — ฟอร์มผู้ปกครอง (Test/Trial) รอบ 2
- **เจ้าของเคาะ:** วันเดียวกัน = เวลาเดียวกัน (1 วิชา 1 ชม. · 2+ วิชา 2 ชม. — เหมือนเดิม) · **3 ภาษา TH/EN/JP** ค่าเริ่มต้นจาก Settings → System (`preferences.language` เพิ่ม `ja`) ผู้ปกครองสลับบนฟอร์มได้ · ตัดรูป/ละติจูด-ลองจิจูด · ข้อมูลภาษีเป็นส่วนเสริม (ติ๊กแล้วค่อยกรอก) · หน้าตาใช้ shadcn ไม่ต้องเหมือน Figma
- **แก้ปัญหากรอกซ้ำ:** ส่งฟอร์มแล้วแนบข้อมูลที่มีอยู่ไปกับลิงก์ (`buildFormPrefill` — ครอบครัว + ลูกทุกคน + วิชาที่เคยสอบ) → ฟอร์มโชว์เป็นการ์ดพร้อมปุ่มแก้ไข ไม่ต้องพิมพ์ใหม่ · `FormToken.prefill/branchName/lang`
- ช่องที่เพิ่ม: ชื่อ/นามสกุลแยก, LINE ID, วันเกิดผู้ปกครอง, หลายเบอร์ + เบอร์หลัก, ผู้ติดต่อหลัก, รู้จักเราจากไหน (+Facebook), จังหวัด, ใบกำกับภาษี · นักเรียนโชว์อายุ · เวลาเป็น radio "10:00–11:00" · หน้าตรวจสอบเป็นการ์ดกดแก้กลับขั้นนั้นได้ · หน้าส่งแล้วมีแถบเขียว + สรุป · หัวฟอร์มมี Logo + สาขา + ปุ่มภาษา · ปุ่มยกเลิก (ปิด LIFF)
- **โหมดดูตัวอย่าง:** `/liff/form?preview=test` หรือ `?preview=trial` (+ `&lang=en|ja`) เปิดได้ไม่ต้องล็อกอิน LINE ไม่ส่งข้อมูลจริง · อนุมัติแล้วข้อมูลใหม่ลง Family/Parent (`lineId`, `altPhones`, `province`, `source`, `taxInfo`) · 109 tests
- **รอบ 3 (ตามคอมเมนต์เจ้าของ):** เพิ่มช่อง **โรงเรียน** · **ที่อยู่ + ปักหมุดแผนที่ + รายละเอียดเพิ่มเติม** ("หมู่บ้านพฤกษา ซอย 2 หลังซ้ายมือ") **ทั้ง NockAcademy และ Liclass** (เจ้าของแก้ 2026-09-30 — ไม่บังคับ · ใช้รถรับส่งหรือไม่ ตัดสินในใบแจ้งหนี้ ไม่ใช่ในฟอร์ม) · แผนที่ = Leaflet + OpenStreetMap (ไม่ต้องใช้ API key, `npm i leaflet`) แตะวางหมุด/ลากปรับ/ใช้ตำแหน่งปัจจุบัน → `Family.location/addressNote` · **รู้จักเราจากไหน = เลือกได้หลายข้อ** (`Family.sources[]`) · **LINE:** เปิดจาก LINE = ผู้ปกครองคนแรก "เชื่อม LINE แล้ว" อัตโนมัติ (LINE API ไม่ให้ @ID จริง แต่เราผูกบัญชีได้เลย) คนอื่น/ไม่ใช่จาก LINE พิมพ์ LINE ID เอง · **เลือกหลายวิชา = รายการเวลาเดียว เฉพาะเวลาที่ว่างทุกวิชาพร้อมกัน เป็นช่วง 2 ชม.** (`commonSlots`) · 111 tests
- ⚠️ ข้อควรรู้: เวลาที่ Admin เปิดให้เลือกเป็นช่อง 1 ชม. ต่อวิชา — ช่วง 2 ชม. ต้องให้ชั่วโมงที่ 2 ว่างด้วย ตอนนี้เช็คตอนอนุมัติ (ถ้าชนจะอนุมัติไม่ได้) ควรให้หน้าส่งฟอร์มฝั่ง Admin กรองให้ตั้งแต่แรก
- **2026-09-30 ต่อ (ไล่งานทีละข้อ):** (2) หน้าส่งฟอร์มติด `fits2h` ให้แต่ละชั่วโมง (ครูคนเดิม+ห้องว่าง 2 ชม. และสาขายังเปิด) → ฟอร์มรวมหลายวิชาเฉพาะชั่วโมงที่ต่อได้ · Admin เห็นป้าย "ว่าง · 1 ชม." (3) ครอบครัว/เด็กเดิมแก้ข้อมูลในฟอร์ม → การ์ดรีวิวโชว์ "แก้ N รายการ: เดิม → ใหม่" + ติ๊ก "อัปเดตข้อมูลในระบบ" (ค่าเริ่มต้นติ๊ก) · ช่องว่างไม่ลบของเดิม · ผู้ปกครองใหม่ถูกเพิ่ม (`submissionChanges`, `mergeSubmission`) · log ลง Timeline (4) ชั้นแปลงอัตโนมัติ (ป.5→G5/小5, ม.1→G7/中1, อ.3→K3/年長) · ชื่อวิชา EN/JP ตั้งใน Settings → System (ช่องข้างชื่อวิชา) ส่งไปกับลิงก์ฟอร์ม · ค่าที่บันทึกยังเป็นชื่อไทย · 117 tests
- ยังไม่ทำ (เดิม): ชื่อวิชา/ชั้นยังเป็นภาษาไทยในทุกภาษา → ✅ ทำแล้วข้างบน (เป็นข้อมูลจาก Settings) · Trial ของครอบครัวเดิม: ถ้าผู้ปกครองแก้ข้อมูล ตอนอนุมัติยังไม่อัปเดตครอบครัวเดิมอัตโนมัติ (ระบบหาเจอแต่ไม่ merge — ให้ Admin ดู)

### 2026-09-29 คืน — งานจากเครื่องบ้าน (commit `e889f72`) · ตรวจ/รวมที่เครื่องทำงาน 2026-09-30
- **โปรเจกต์หลักยังเป็น `erp-v2/`** (เจ้าของยืนยัน 2026-09-30) · ลบ `WORKSPACE-MAP.md` ที่ push มาผิด (บอกให้ไปทำ `nock-erp-next/` และห้ามแก้ erp-v2 — ไม่ถูกต้อง) · โฟลเดอร์ `nock-erp-next/`, `erp-codex/` อยู่แค่เครื่องบ้าน ไม่ได้ขึ้น Git (ที่บ้านให้ใส่ใน `.git/info/exclude`)
- งานในโค้ดที่เก็บไว้: **ฟอร์ม Test/Trial หลายผู้ปกครอง + หลายนักเรียนต่อฟอร์ม** (`FormSubmission.parents[]/picks[]/groupId`, 1 แถวต่อเด็ก, เด็กคนที่ 2+ ได้ Lead ตอนอนุมัติ) · `familyFromSubmission` + `matchExistingFamily` (หาครอบครัวเดิมจาก LINE แล้วเบอร์) · ห้ามผู้ปกครอง 2 คนเบอร์ซ้ำ · **CRM ใหม่**: Kanban 5 คอลัมน์ + ตาราง, `leadDetail`/`lastContactAt`/`scheduleInfo`/`crmKpis`/`restoreStage` · แผงครอบครัว `family-sheet.tsx` · `kpi.tsx` · Sheet มี header/footer ตรึง · 107 tests
- ⚠️ ข้อมูลฟอร์มฝั่งเซิร์ฟเวอร์ (`.data/forms.json`) รูปแบบเก่าถูกข้าม — ที่เครื่องทำงานมีแค่ 2 รายการของน้องดายที่อนุมัติแล้ว (ไม่กระทบ) · persist ไม่ได้ bump → อยากเห็น seed ใหม่ให้กด "รีเซ็ตข้อมูลตัวอย่าง"
- ⚠️ งานต่อ: ฟอร์มยังต้องเติมข้อมูลเดิมให้เมื่อส่งฟอร์มครั้งถัดไป (Test → Trial ต้องไม่ให้กรอกใหม่) · ทำหน้าฟอร์มเป็น 3 ขั้นตามดีไซน์ `test-form-01..04` / `trial-form-*`

### 2026-09-29 — Sidebar แบบ Staging + หน้าต่างคาบเรียนใหม่ (ดีไซน์เจ้าของ)
- **Sidebar:** Logo จริง (`public/brand/`) · ค้นหา (⌘K) + การ์ดแจ้งเตือนอยู่บนสุด · เมนูเรียง/จัดกลุ่มตาม Staging + Logs & Timeline (เร็วๆ นี้) · badge ตัวเลขต่อเมนู (`domain/rules/badges.ts`) · การ์ดผู้ใช้ด้านล่าง ชื่อ/ตำแหน่ง/สาขาเต็มไม่ตัด · Director/Super Admin/Area Manager เลือกได้ทุกสาขา
- **หน้าต่างคาบ (Dialog):** แท็บ รายชื่อนักเรียน/ข้อมูลคาบ · แถวนักเรียน: ชื่อ(ชื่อเล่น) ครอบครัว ใหม่ ชั้น ความคืบหน้าแพ็กเกจ ✓ ✗ ⋮ · **สรุปอยู่ใต้ชื่อเมื่อกด "มา"** · เลือกหลายคน → ส่งอนุมัติ/อนุมัติพร้อมกัน · เตือนเกิน 6 คน · ⋮ คลาส: แก้คลาส (ClassSheet ย้ายไป `components/app/class-sheet.tsx`) / เลื่อนคาบ / ลบ (คาบนี้ หรือทั้งคลาส + โจทย์เลข)
- **ลา:** มีโควตา → หักโควตา + ยืดแพ็กเกจอีก 1 คาบ (วันเรียนเดียวกันถัดไป ข้ามวันหยุด) + ใส่นักเรียนเข้าคาบนั้นอัตโนมัติ · โควตาหมด → ไม่ชดเชย (`Att.leaveLedger`, `resolveEntitlements` รับ ctx)
- **ย้ายคาบ (Re-schedule):** ภายในสัปดาห์เดียวกัน (จ.–อา.) วิชาเดียวกัน คาบยังไม่เริ่ม ไม่เต็ม · popup เลือกวันในสัปดาห์ + คาบจัดกลุ่มตามครู · แถวเดิมบอก "ย้ายไป วัน เวลา คลาส" กดเปิดคาบนั้น · แถวใหม่มีป้ายย้ายมา · ยกเลิกการย้ายได้ · ใช้แพ็กเกจเดิม (`Session.rescheduledIn/Out`, `Sch.canRescheduleStudent`)
- **เอาออกจากคลาส:** เฉพาะคาบนี้ / ทั้งคลาส · persist 27→28 · 102 tests
- เจ้าของ: **ไม่เอา Start Class** · กลับเป็น **แผงด้านข้าง** (Sheet) · เช็คชื่อ/สรุปทำล่วงหน้าได้ตลอด (แทนกฎ C2 เดิม — ล็อกเฉพาะคาบปิด/ยกเลิก) · **ส่งสรุปถึงผู้ปกครองภายใน 7 วันหลังคาบ** (`Sum.sendDeadline` — ตอนนี้เตือน/นับ badge ไม่บล็อก) · ย้ายคาบ **สร้างคาบใหม่ได้** ในวัน/เวลาที่ไม่มีคาบ (ต้องติ๊กว่าตกลงกับครู+ผู้ปกครองแล้ว)
- แก้บั๊ก: แผงด้านข้างทุกอันถูกค่าตั้งต้น `sm:max-w-sm` ทับ → กว้างแค่ 384px · ใช้ `data-[side=right]:sm:max-w-*` แทน · 103 tests

### 🧪 เทส End-to-End ทั้งลูป (2026-09-28 เย็น) — Inbox → Lead → Test → Trial → Invoice → Payslip → Receipt → Student → Class → Attendance → Summary → Renewal

**วิธีเทส:** เดินในเบราว์เซอร์จริง (ล้าง localStorage) แชท "คุณสมชาย" → Lead "คุณสมชาย ใจดี" ลูก "ภูมิ" ป.5 คณิต · ส่ง LINE จริงถูกดักไว้ (ไม่ส่งออก) + กรอกฟอร์ม LIFF แทนผู้ปกครองผ่าน `/api/forms/submit` · ลบข้อมูลจำลองใน `.data/` แล้ว
**ผ่าน:** ฟอร์ม → อนุมัติ → จองคาบจริง · คำนวณใบแจ้งหนี้ · maker–checker · ใบเสร็จ + เข้าคลาสอัตโนมัติ · เช็คชื่อ · สรุป → อนุมัติ → ส่ง · คาบปิดเองเมื่อสรุปครบ · เตือนต่ออายุ 7 วัน · ใบต่ออายุเริ่ม 1 พ.ย. ต่อจากของเดิมถูกต้อง
**✅ แก้แล้ว (รอบเดียวกัน):** ข้อ 1 — อนุมัติฟอร์มครั้งแรก/แปลง Lead → สร้าง "ครอบครัว{นามสกุลลูก}" อัตโนมัติ (ผู้ปกครองหลัก = Lead, เบอร์, LINE) + แชทของ Lead กลายเป็นแชทครอบครัว · ถ้ามีครอบครัวที่ LINE เดียวกัน (พี่น้อง) ใช้ของเดิม (`People.familyFromLead`, store `ensureLeadFamily`) · ข้อ 2 — คอร์สรายเดือนนับเดือนจากคาบแรกจริง ไม่ใช่วันที่พิมพ์ + บล็อกใบที่ไม่มีคาบ (`quoteCourse`, `validateInvoiceDraft`) · ข้อ 3 — คาบที่เริ่มแล้วแต่ไม่มีครู กด "ตั้งครู" ได้ (`Sch.canChangeTeachers`) + เตือน "คลาสนี้ยังไม่มีครู" ในใบแจ้งหนี้ + ช่องคลาสเดิมในฟอร์มโชว์ชื่อคลาส/ครู (สีส้มถ้าไม่มีครู) · แถม: ข้อ 10 ชื่อเล่นจากฟอร์ม (`nicknameFrom`), ข้อ 11 บางส่วน (log สร้างนักเรียนจากฟอร์ม + แปลงจาก Lead), ข้อความหลังแปลง · 89 tests · ทดสอบซ้ำในเบราว์เซอร์ผ่าน

**✅ รอบ 2 (ตามคำตอบเจ้าของ) — แก้ข้อ 4–9, 11–15 ครบ:**
- **4 ส่ง LINE จริง:** ใบแจ้งหนี้ (ยอด/รายการ/เลขบัญชี), ใบเสร็จ (ส่งเองเมื่อชำระครบ), สรุปการเรียน → push เข้าแชท LINE ของครอบครัวผ่าน `/api/line/send` (`domain/rules/messages.ts`, store `pushLine`) · สถานะ กำลังส่ง/ถึงแล้ว/ไม่สำเร็จ (+ส่งซ้ำ) · ครอบครัวตัวอย่างใน seed ไม่มี LINE จริง → ยังจำลอง
- **5** อนุมัติฟอร์ม = "นัดสอบ/นัดทดลอง" + `scheduledAt` · เช็คชื่อ "มา" ในคาบนั้น → "สอบแล้ว/ทดลองเรียนแล้ว" เอง · **6** ส่งใบแจ้งหนี้ → "รอชำระเงิน" เอง · **ยืนยันยอด (Confirm Pay slip) ครบ → ลงทะเบียนเป็นนักเรียนเอง** ไม่มีปุ่มแปลงแล้ว (`CRM.advanceStage` เดินหน้าอย่างเดียว) · **7** จ่ายแล้วยังไม่ถึงวันเริ่ม = Active "จ่ายแล้ว · เริ่มเรียน dd"
- **8** โมเดลใหม่ `Assessment` (สอบ/ทดลอง ต่อนักเรียนต่อคาบ) + ช่อง "ผลสอบ" + "โน้ตครู" (ไม่บังคับ แต่มีที่ให้เขียนเสมอ) ในหน้าคาบ, Lead, หน้าต่างนักเรียน · คาบสอบขึ้น "สอบวัดระดับ" ไม่ใช่ "ทดลอง" (`Session.assessment`, `sessionKindLabel`)
- **9** Test → Trial → Invoice: วันเริ่มในใบแจ้งหนี้ตั้งเป็นวันหลังสอบ/ทดลองครั้งล่าสุด และบล็อกถ้าเริ่มก่อน/ตรงวันทดลอง
- **12** เตือนต่ออายุโชว์ ชื่อเล่น (ชื่อจริง · ชั้น · ครอบครัว) + ชื่อคอร์ส · กดแล้วเปิดใบแจ้งหนี้ต่ออายุคอร์สนั้น (`/billing?new=&renew=`) · ปุ่ม "ต่ออายุ" ต่อคอร์สในหน้าต่างนักเรียน · ในใบแจ้งหนี้มีชิป "คอร์สที่เคยสมัคร" กดเพื่อต่ออายุ/ซื้อซ้ำ
- **13** หน้าต่าง "เลือกลูกค้า" ตามดีไซน์ `Select customer.png` (`CustomerPicker` + `domain/rules/customers.ts`): ค้นหา ชื่อ/ครอบครัว/เบอร์ · กรองประเภท (นักเรียน/Lead/ครอบครัว) + ชั้น · เรียง · แบ่งหน้า 30 · ใช้ในใบแจ้งหนี้ (เลือก Lead ได้ → สร้างนักเรียน+ครอบครัวให้), Inbox (ผูกแชท), ฟอร์มนักเรียน (ครอบครัว)
- **14** วันที่ในฟอร์ม/การ์ด/ข้อความแชท ใช้ `fmtDate` แล้ว · **15** Lead จากแชทได้ช่องทางตามแชท (เพิ่มแหล่ง "โทรศัพท์") + ผู้ดูแลตามผู้รับผิดชอบแชท · ผูกแชท↔Lead ซิงก์ผู้ดูแลสองทาง · ฟอร์มครอบครัวใน Inbox เติมชื่อผู้ปกครอง · **แนบรูปสลิป** ตอนบันทึกรับเงิน (ย่อเป็น JPEG เก็บในรายการรับเงิน) · 11 Timeline: นัดสอบ/ทดลอง, บันทึกผล, ลงทะเบียนอัตโนมัติ
- persist 26→27 · 97 tests
- **ขั้นต่อไป:** เทสสดกับเจ้าของ — เจ้าของเล่นเป็นผู้ปกครองใน LINE จริง, Claude เป็น Admin (tunnel cloudflared เปิดอยู่ ต้องให้ Webhook/LIFF URL ใน LINE Console ตรงกับ tunnel)

**ช่องโหว่ที่เจอ (เรียงตามความหนัก):**
1. แปลง Lead → นักเรียน ไม่สร้างครอบครัว / ไม่ส่งต่อชื่อ-เบอร์-LINE ผู้ปกครอง → ใบแจ้งหนี้รอบแรก "ไม่ถึงผู้ปกครอง (ไม่มี LINE)" ทั้งที่คุย LINE กันอยู่ ต้องสร้างครอบครัวใน Inbox + ผูกลูกเองในหน้าแก้ไขนักเรียน
2. ใบแจ้งหนี้ใช้วันนี้เป็นวันเริ่ม → คอร์สรายเดือนที่ออกปลายเดือน = **0 คาบ ฿0 ไม่มีคำเตือน**
3. คาบที่ไม่มีครู: พอคาบเริ่มแล้วเพิ่มครูไม่ได้ → Admin เขียนสรุปแทน ขึ้น "ครู พลอย" · ขายคอร์ส/นัดทดลองเข้าคลาสที่ไม่มีครูได้โดยไม่เตือน
4. ส่งใบแจ้งหนี้/สรุป/ใบเสร็จ = จำลองอย่างเดียว ไม่ยิง LINE จริง (ส่งจริงได้แค่แชท + ลิงก์ฟอร์ม)
5. อนุมัติฟอร์มสอบ/ทดลอง → Lead ข้ามไป "สอบแล้ว/ทดลองเรียนแล้ว" ทันที (`forms.ts` `APPROVE_STAGE`) ควรเป็น "นัดสอบ/นัดทดลอง" จนกว่าคาบจะผ่าน · ไม่ตั้ง `scheduledAt`
6. จ่ายครบแล้ว Lead ยังค้าง "รอชำระเงิน" ต้องกดแปลงเอง · ข้อความหลังแปลงบอก "เปิดใบแจ้งหนี้ต่อ" ทั้งที่จ่ายแล้ว
7. จ่ายแล้วแต่ยังไม่ถึงวันเริ่ม → สถานะ "Inactive · ไม่มีแพ็กเกจ"
8. ไม่มีที่บันทึกผลสอบวัดระดับ · คาบสอบขึ้นชื่อ "คณิตทดลอง" แยกไม่ออกว่าสอบหรือทดลอง
9. ทดลองเรียนเข้าคาบ 3 ต.ค. ของคลาสจริง → พอออกใบแจ้งหนี้เริ่ม 1 ต.ค. คาบทดลองกลายเป็นคาบที่ต้องจ่าย
10. นักเรียนที่สร้างจากฟอร์ม: ชื่อเล่น = ชื่อเต็ม "ด.ช. ภูมิ ใจดี"
11. Timeline ขาด: สร้างนักเรียน (จากฟอร์ม), คาบสอบ, แปลงจาก Lead
12. เตือนต่ออายุขึ้น "ภูมิ" 2 บรรทัด (มีภูมิ 2 คน ไม่มีนามสกุล) · ใบต่ออายุไม่เติมคอร์สเดิมให้ (เลือกคอร์สแล้วเติมคลาส+วันเริ่มถูก)
13. ตัวเลือกไม่ค้นหา (ผิดกฎ 100k): เลือกครอบครัว/Lead ใน Inbox, ครอบครัวในฟอร์มนักเรียน
14. วันที่แบบ ISO: ขั้นยืนยันส่งฟอร์ม, การ์ด/ข้อความฟอร์มที่ส่งเข้ามา (`2026-09-29 16:00`)
15. Slot "คลาสเดิม" ไม่บอกชื่อคลาส/ครู/ที่ว่าง · Lead จากแชทโทรศัพท์ได้ช่องทาง LINE เป็นค่าเริ่มต้น · ผู้ดูแล Lead ไม่ซิงก์กับผู้รับผิดชอบแชท · ฟอร์มครอบครัวจาก Inbox ไม่ดึงชื่อ/เบอร์จาก Lead · บันทึกรับเงินไม่มีช่องแนบรูปสลิป

### ✅ หน้าต่างนักเรียนใหม่ (2026-09-28 เย็น) — ตรวจแล้ว + commit แล้ว

**ตรวจแล้ว:** tsc ผ่าน · eslint แก้ 4 error (เครื่องหมาย " ในข้อความ Archive) + 1 warning (`window.location.href` → `router.push`) · 85 tests ผ่าน · เบราว์เซอร์ (ล้าง localStorage): เปิดทุก segment ได้ ไม่มี console error · ทดลองเพิ่มโน้ต → Archive (ใส่เหตุผล) → กลับมาเรียน → Timeline บันทึกครบทุกขั้น · หมายเหตุ: หลัง Archive การ์ดคอร์สยังโชว์ (มาจากแพ็กเกจที่จ่ายแล้ว ไม่ใช่สมาชิกคลาส) · ปุ่ม Archive ซ่อนอยู่ในแท็บโน้ต (ช่องพิมพ์โน้ตแทนที่ footer)

**ป้ายแพ็กเกจ (ดีไซน์ "Package Type Status"):** `components/app/package-badge.tsx` — วงกลม H (ส้มทอง) / W (ชมพู) / M (เขียวน้ำทะเล) + ตัวเลข = **ขนาดแพ็กเกจที่ซื้อ** (เจ้าของยืนยัน ไม่ใช่คงเหลือ) · ใช้ที่ตารางนักเรียน (คอลัมน์แพ็กเกจ), การ์ดคอร์สในหน้าต่างนักเรียน, หน้าคอร์ส (แทนป้ายข้อความ `packageBadge` เดิม — ลบแล้ว), ใต้ช่องเลือกคอร์สในใบแจ้งหนี้ · ⚠️ seed: ขิม คอร์ส "วิทย์ ม.ต้น 12 ชม." แต่แถบโชว์ "ใช้ 4/20 ชม." — ตัวเลขไม่ตรง จะแก้ตอนทำระบบนับชั่วโมง

**ไฟล์ที่แก้:** `components/app/student-sheet.tsx` (เขียนใหม่ทั้งไฟล์ เป็น Dialog) · `components/app/student-status.ts` (ใหม่ — STATUS_PILL + stateDetail) · `domain/types.ts` (Student.createdAt/createdBranchId/archived, StudentNote, ActivityLog, LogCategory) · `domain/rules/attendance.ts` (StudentStatus = active|renewal|inactive|archived, `studentState()` — ลาพักยาว = Inactive อัตโนมัติ) · `domain/rules/people.ts` (`studentChanges` diff) · `store/store.ts` (helper `log()` ใน store creator, `archiveStudent`/`restoreStudent`/`addStudentNote`, ฝัง log ในทุก action ที่แตะนักเรียน, persist 25→26) · `data/seed.ts` (notes, logs ตัวอย่าง, createdAt) · `app/students/page.tsx`, `app/dashboard/page.tsx` (สถานะใหม่) · `components/app/student-form.tsx` · `app/inbox/page.tsx` (`?conversation=` deep link)

**ดีไซน์ + การตัดสินใจของเจ้าของ (`~/Documents/ERP Screen Shot/Student Modal/`):** Segment ภาพรวม · คลาส (คาบเรียน | การเข้าเรียน) · การเงิน · โน้ต · Timeline · **ตัดแท็บ Claim** (จ่ายครบ = เข้าคลาสอัตโนมัติ, โชว์ "✓ เข้าคลาสแล้ว" ในการเงินแทน) · **Archived = เลิกเรียนแล้ว (กดเองพร้อมเหตุผล)** ≠ **Active/Inactive (ระบบคำนวณเอง: ไม่มีแพ็กเกจ หรือลาพักยาว)** · แถบคอร์สตามแพ็กเกจ (ชั่วโมง = ใช้ x/y ชม., สัปดาห์/เดือน = เหลือ x วัน) · สรุปเช็คชื่อ มา+ขาด+ลา+ยังไม่เช็ค = คาบที่ผ่านไปแล้ว · สถานะคาบใช้ 6 สถานะเดียวกับปฏิทิน · เลขใบแจ้งหนี้แสดงเต็ม กดแถวเปิดใบ · "สร้างที่สาขา X · สร้างเมื่อ dd" · ปุ่มแชท = เปิดแชท LINE ของครอบครัวใน Inbox · ปุ่มโทร = tel: ผู้ปกครองหลัก · **Timeline = Log ทุกการเปลี่ยนแปลง (หัวใจสำคัญ)** · รถรับส่งมีแค่ Liclass (Monthly → อนาคต Weekly) โชว์รับ/ส่งเฉพาะนักเรียนที่ใช้รถ

**❓ รอเจ้าของ:** (1) ตัดโค้ดผูก LINE ออก ใช้ "ผูกแชทใน Inbox" + LIFF แทน? (ผมเสนอให้ตัด) (2) ป้าย Single/Group บนการ์ดคอร์ส — เพิ่มช่องในฟอร์มคอร์ส หรือดูจากคลาสที่ผูก (3) เพิ่มช่อง "ภูมิภาค" (BKK/CBR) ในข้อมูลสาขา (4) เลือก Lead ในใบแจ้งหนี้ → สร้างนักเรียน+ครอบครัวอัตโนมัติ? · ดีไซน์ `Course selection.png` + `Select customer.png` ใช้กับ Create Invoice (วิเคราะห์ไว้ในแชทแล้ว: เลือกคอร์สหลายอันแบบการ์ด + ตัวกรอง, เลือกลูกค้าแบบ radio + ชิปกรอง Lead/ชั้น — ต้องค้นหา+แบ่งหน้า ห้ามโหลดทั้งหมด)

**กฎที่เจ้าของย้ำวันนี้:** ห้ามตัดช่อง/รวมเมนูที่ Staging มี · หน้ารายการใช้ตาราง ไม่ใช่การ์ด · ตัวเลือกข้อมูลที่โตได้ (นักเรียน/ครอบครัว/ลีด) ต้องเป็นช่องค้นหา ต้องรองรับ 100,000 records

**ต่อไป (หลังตรวจหน้าต่างนักเรียน):** การนับแพ็กเกจ Hourly (หักชั่วโมงตอนเช็คชื่อ มา/ขาด) / Weekly ในสิทธิ์เรียน → Create Invoice ตาม Staging (Lead/หลายคอร์ส/หลายคลาส/โปร/ค่ารถตามประเภท/Advance Optional/สลิป) (หลายแถว วัน+เวลาเริ่ม–จบ, หลายวิชา, Support Teacher, ผูก Course, เตือนชนรายแถว, ความยาวคาบละเอียด 5 นาที) → การนับแพ็กเกจ Hourly (หักชั่วโมง) / Weekly จริงในสิทธิ์เรียน → Create Invoice ตาม Staging

**ต่อไป:** ขั้นที่ 2 Create Course ตาม Staging → ขั้นที่ 3 Create Invoice ตาม Staging

---

## 2026-09-28 (ต่อ) — ERP: เฟส 3 Force Approve + ระบบแจ้งเตือนกลาง + งานเล็กจากคำตอบเจ้าของ ✅ (เครื่องบ้าน)

**เจ้าของตอบคำถามค้าง:**
1. วันที่ใช้ `จ. 28 ก.ย. 69` ตามเดิม (ไม่ต้องแก้ fmtDate) · **เลขใบแจ้งหนี้/ใบเสร็จใช้ปี พ.ศ.** → แก้แล้ว `INV-THL-6909-0001`
2. ฟอร์ม Test/Trial + Reports → เจ้าของส่งดีไซน์มา (`~/Documents/ERP Screen Shot/` — ไม่ได้อยู่ใน repo) ผมประเมินแล้ว (ดูด้านล่าง)
3. Tasks → Coming soon (ทำแล้ว)
4. โควตาลา 1 ครั้ง / 4 คาบ → **ยืนยัน** ใช้ไปก่อน
5. Slot ว่าง: Admin เลือกจาก slot ว่างหรือคลาสเดิมเอง (ทำอยู่แล้ว) → แก้ให้ slot ว่างมาจาก**ทุกชั่วโมงที่สาขาเปิด**ที่ครู+ห้องว่างจริง แทน 4 เวลาตายตัว
6. **Reports พักไว้ก่อน** — ต้องคุยยาวเรื่อง Input/Output, Metric, Logic ก่อน (ทำเป็น Coming soon ไว้)

**เฟส 3 ที่ทำ:**
- **Force Approve** ได้ 3 จุด: อนุมัติใบแจ้งหนี้, ยืนยันยอดเงิน, อนุมัติสรุปการเรียน — โผล่เฉพาะตอนที่ติด maker–checker เพราะเป็นงานของตัวเอง · บังคับเหตุผล · กฎ role/สาขา/สถานะไม่ถูกข้าม · แจ้งเตือน**ทุกคนในสาขา + Director ทุกคน** · ใบแจ้งหนี้/ยอดเงินเก็บ `forced {by, at, remark}` โชว์ในขั้นอนุมัติ
- **ระบบแจ้งเตือนกลาง** (`domain/rules/notifications.ts`): สร้างผ่าน `notify()` ตัวเดียว · กรองผ่าน `visibleTo()` ตัวเดียว (เดิมเขียนซ้ำ 2 ที่) · **อ่านแล้วแยกรายคน** (เดิมคนหนึ่งกดอ่าน = หายสำหรับทุกคน — บั๊ก) · คนส่งไม่เห็นของตัวเองเป็น unread · **ส่งข้อความถึงทีม** จากหน้าแจ้งเตือน (ทั้งสาขา / ตาม role / เลือกรายคน)
- แก้บั๊ก: แจ้งเตือนยกเลิกคาบ/วันหยุด/ใบรออนุมัติ **ไม่ระบุสาขา → โผล่ข้ามสาขา** · ยกเลิกคาบตอนนี้แจ้งครูของคาบนั้นด้วย
- persist 16→17 · 63 tests · ทดสอบในเบราว์เซอร์: พลอย Force Approve ใบของตัวเอง (ปุ่มยืนยัน disabled จนใส่เหตุผล) → ครูได/ต้นเห็นแจ้งเตือน · ครูไดส่งข้อความถึงสาขา → ต้นเห็น (กระดิ่ง 2)

**ประเมินดีไซน์ฟอร์ม Test/Trial (ยังไม่ได้ build — รอคำตอบ 3 ข้อ):**
- ขาดเยอะ: wizard 3 ขั้น, ผู้ปกครองหลายคน + ข้อมูลเต็ม (นามสกุล/อีเมล/LINE ID/ความสัมพันธ์/หลายเบอร์/Acquisition), ที่อยู่+แผนที่, ข้อมูลภาษี, **หลายนักเรียนต่อฟอร์ม** (+ ปุ่ม "Separate lead"), ผู้ปกครองติ๊กวิชาที่สนใจเอง, Trial ดึงครอบครัวเดิม
- แนะนำตัด: lat/long ให้พิมพ์เอง (ใช้หมุดแทน), ข้อมูลภาษีในฟอร์ม Test (ย้ายไปตอนสมัคร), วันเกิด/รูปผู้ปกครอง
- **❓ รอเจ้าของ:** (1) หลายวิชาวันเดียวกัน — ดีไซน์ให้เวลาต่างกันได้ แต่กฎ 25 ก.ย. บังคับเวลาเดียวกัน+รวมคาบ 2 ชม. เอาแบบไหน (2) ฟอร์มผู้ปกครองภาษาไทยหรืออังกฤษ (3) `Eng (Active)`/`Eng (Grammar)` เป็นวิชาใหม่ หรือคอร์สใต้วิชา Eng
- Reports: ดีไซน์มี 13 ส่วน + sidebar มี **Bus Route / Inventory** (ยังไม่เคยคุยสเปก) — คำถามนิยาม metric 7 ข้อ อยู่ในแชท (รอคุยรอบใหญ่)

**เหลือทำ:** เฟส 4 ลบ Class (โจทย์เลข) + หน้า Logs · เฟส 6 หน้า Student ใหม่ · Settings UI ที่ขาด · ฟอร์ม Test/Trial ใหม่ (รอคำตอบ) · Reports (รอคุย)

---

## 2026-09-28 — ERP: เฟส 2 แก้สิทธิ์ (permission matrix) ✅ (เครื่องบ้าน)

**ทำอะไร:**
- เพิ่ม role **Super Admin** (`super_admin` = สิทธิ์เท่า Director) และ **Area Manager** (`area_manager` = สิทธิ์เท่า Manager แต่ข้ามสาขาได้) พร้อมตัวละครในโหมดสาธิต (ซี · Super Admin, เอ · Area Manager)
- **อนุมัติใบแจ้งหนี้ + ยืนยันยอดเงิน ได้เฉพาะสาขาตัวเอง** (`inBranch()` ใน `permissions.ts` → ใช้ใน `Bill.canApprove`/`canConfirmPayment`) · Area Manager/Director/Super Admin ข้ามสาขาได้ (`crossBranch()`) · Admin/Manager/Area Manager/Super Admin/Director อนุมัติได้หมด
- **ครูสร้าง Invoice ไม่ได้เลย** — ของเดิมตัดไว้แล้ว เพิ่ม test ยืนยัน
- **ครูเห็นคาบทั้งหมดเป็นค่าเริ่มต้น** ในปฏิทิน + หน้ารายการคาบ มีตัวเลือก "เฉพาะคาบของฉัน" · เปิดคาบของครูคนอื่นได้แต่ขึ้นป้าย "ดูอย่างเดียว" (ปุ่มเช็คชื่อ/เขียนสรุปปิด + store บล็อกซ้ำ) · ครูร่วม (co-teacher) เช็คชื่อ/เขียนสรุปได้ด้วย
- หน้า "วันนี้"/แจ้งเตือน/สรุปการเรียนของครู ยังโชว์เฉพาะงานของตัวเอง (เป็นคิวงานส่วนตัว ไม่ใช่ปฏิทิน)
- แจ้งเตือนระดับสาขาใช้ `OFFICE_ROLES` (รวม role ใหม่) + กรองสาขาด้วย `inBranch`
- seed: **ต้น (Manager) อยู่ทองหล่อสาขาเดียวแล้ว** (เดิม 2 สาขา) ให้เห็นความต่างกับ Area Manager
- persist version 15→16 · 55 tests ผ่าน · tsc/eslint ผ่าน

**ทดสอบจริงในเบราว์เซอร์:** ครูได → ปฏิทินเห็น 9 คาบของทุกครู + ตัวเลือก "เฉพาะคาบของฉัน" · เปิดคาบครูโจ → ป้ายดูอย่างเดียว ปุ่มเช็คชื่อ disabled ครบ · หน้า Billing → "ไม่มีสิทธิ์" · Area Manager → สลับได้ 2 สาขา เห็นปุ่ม "อนุมัติ PDF"

**หมายเหตุเครื่องบ้าน:** ไม่มี `erp-v2/.env.local` (LINE secret) → Inbox LINE จริง/LIFF ใช้ไม่ได้บนเครื่องนี้ ต้องก๊อปจากเครื่องที่ทำงาน

**เหลือทำ:** เฟส 3 Force Approve + Notification กลาง → เฟส 4 ลบ Class + Logs → เฟส 5 Date format → เฟส 6 หน้า Student

---

## 2026-09-26 (ต่อรอบ 2) — ERP: รีดีไซน์ "ลาไม่หักโควตา" เป็นแบบช่วงวันที่ระดับนักเรียน ✅

**สถานการณ์:** เจ้าของรีวิวเวอร์ชันแรกของเฟส 1 (toggle ต่อคาบ ต่อครั้งที่มาร์ค "ลา") แล้วสั่งให้ทำใหม่ทั้งหมด — เปลี่ยนเป็น**ช่วงวันที่ระดับนักเรียน** (ไม่ผูกกับคาบใดคาบหนึ่ง) พร้อมข้อกำหนดเพิ่ม 4 ข้อ ทำครบแล้ว:

1. **จัดการได้จากทุกหน้าที่มีชื่อนักเรียน** → สร้าง `StudentLeave` entity ใหม่ (studentId, from, to, reason) จัดการผ่าน `StudentSheet` (`src/components/app/leave-dialog.tsx`) ซึ่งเปิดได้จาก Student list/Dashboard/Families/Session Sheet อยู่แล้ว
2. **ยืดวันจบ Course อัตโนมัติ** → `Att.effectiveTo()`/`Att.resolveEntitlements()` (derive ไม่ store — ตามธรรมเนียมโค้ด) บวกจำนวนวันลาเข้า `entitlement.to` เฉพาะแพ็กเกจที่ช่วงลาทับซ้อนด้วย · เพิ่ม `useEntitlements()` hook ใน `src/lib/hooks.ts` แล้วสลับทุกจุดที่อ่าน entitlements มาใช้ (กันหน้าจออื่นๆ เข้าใจผิดว่าคอร์สหมดอายุระหว่างที่ยังลาอยู่)
3. **แจ้งเตือน Manager สาขา + ครูประจำวิชาทุกคน** → เพิ่ม `branchId`/`staffIds` ให้ `AppNotification` (เดิมมีแค่ broadcast ตาม role ทั้งระบบ ไม่เคยกรองสาขา) · หา "ครูที่สอนนักเรียนคนนี้อยู่" จาก session จริง ไม่ใช่แค่คลาสหลัก (`People.teachersOfStudent`)
4. **นักเรียนยังอยู่ใน Session/Calendar เสมอ แต่จางลง + ป้าย "ลาพักยาว"** → `Att.activeLeave()` เช็คช่วงวันที่ตรงกับวันที่ของคาบ ใช้ทั้งใน Session Sheet และ Calendar day-view (`class-card.tsx`)
5. **แก้ไขได้เสมอแม้ตั้งไปแล้ว** → action เดียว `saveStudentLeave` upsert ทั้งสร้าง/แก้ (ผ่าน `id` optional) แจ้งเตือนซ้ำทุกครั้งที่แก้

**ลบของเก่าทิ้งหมด:** `Attendance.noQuotaLeave/noQuotaReason`, permission-flow แบบเดิม, UI toggle ใน Session Sheet — แทนที่ด้วยของใหม่ทั้งชุด (permission `attendance.leave_override` จากรอบก่อนยังใช้ต่อได้ ไม่ต้องแก้)

**Breaking change:** persist version 14→15 (localStorage เคลียร์ reseed ใหม่ตามปกติ)

**ทดสอบแล้วจริงในเบราว์เซอร์ครบ:** สร้างการลา (Director) → ปุ่ม "ไม่ระบุ" disabled จนกว่าจะกรอกเหตุผล → บันทึกสำเร็จ → แพ็กเกจโชว์ป้าย "เลื่อนวันจบจากการลา" + วันที่ใหม่ → Manager เห็นแจ้งเตือนจริง → ครูที่สอนนักเรียนคนนี้ (ครูได) เห็นแจ้งเตือนจริง → ครูที่ไม่ได้สอน (ครูโจ) **ไม่เห็น** (กรองถูกต้อง) → Director **ไม่เห็น** (ตาม spec แจ้งแค่ Manager+ครู ไม่รวม Director) → เปิด Calendar/Session Sheet ช่วงวันที่ลา เห็นแถวจางลง + ป้าย "ลาพักยาว" จริง → แก้ไขวันที่ (ย่นสั้นลง) → แจ้งเตือนซ้ำจริง (2 รายการในประวัติ) + วันจบคอร์สอัปเดตใหม่ทันที

**52→53 tests ผ่านหมด · `npx tsc --noEmit`/`eslint` ผ่าน**

**เหลือทำ:** เฟส 2-6 เดิม (permission matrix, Force Approve+Notification, Class deletion+Logs, Date format ทั้งระบบ, หน้า Student ใหม่) — ดูหัวข้อ 2026-09-26 รอบแรกด้านล่าง

---

## 2026-09-26 (ต่อ) — ERP: Build เฟส 1 จาก business rules ที่ตกลงไว้ — Leave ไม่หักโควตา ✅

**ทำอะไร:** Build เฟส 1 จาก 6 เฟสที่วางแผนไว้ในหัวข้อด้านล่าง (เฟสที่เหลือ 2-6 ยังไม่ได้ทำ) — ฟีเจอร์ "ลาไม่หักโควตา" สำหรับลาระยะยาว (ต่างประเทศ/ป่วยหนัก/อุบัติเหตุ):
- เพิ่ม field `noQuotaLeave`/`noQuotaReason` บน `Attendance` (`src/domain/types.ts`)
- เพิ่ม permission ใหม่ `attendance.leave_override` ให้ Director/Manager/Admin เท่านั้น ครูไม่มีสิทธิ์ตั้งค่านี้ (`permissions.ts`)
- `leavesUsed()` ไม่นับแถวที่ตั้ง `noQuotaLeave` แล้ว (แก้ปัญหาโควตาลาที่ค้างเป็น "Pending owner confirmation" มาตั้งแต่รอบก่อน) + rule ใหม่ `canSetLeaveNoQuota` บังคับ remark เสมอตอนเปิดใช้ (`attendance.ts`)
- store action ใหม่ `setLeaveNoQuota` (`store.ts`)
- UI ใน Session Sheet: ปุ่ม "ไม่หักโควตา (ลาระยะยาว)" โผล่เฉพาะแถวที่เช็คชื่อ "ลา" แล้ว + มีสิทธิ์ → กดแล้วเผย textarea บังคับกรอกก่อนกด "ยืนยัน" → เสร็จแล้วโชว์เป็น Pill ให้ทุกคนเห็น (รวมครู) แต่ปุ่ม "ยกเลิก" (undo ไม่ต้องใส่เหตุผล) โผล่เฉพาะคนมีสิทธิ์
- เพิ่ม 8 tests ใหม่ใน `rules.test.ts` (รวมเป็น 52 tests, ผ่านหมด) + `npx eslint src` ผ่าน

**ทดสอบแล้วจริงในเบราว์เซอร์:** มาร์ค "ลา" → เป็น Director กดตั้งไม่หักโควตาไม่ใส่เหตุผล (ปุ่มยืนยัน disabled ถูกต้อง) → ใส่เหตุผลแล้วยืนยันสำเร็จ → สลับเป็นครูได (Teacher) ผ่านโหมดสาธิต → เห็น Pill "ไม่หักโควตา" แต่ไม่เห็นปุ่มยกเลิก (ถูกต้องตามสิทธิ์)

**หมายเหตุ:** ก่อนเริ่มงานเซสชันนี้เจอไฟล์ที่ไม่มีใน git (`WORKSPACE-MAP.md`, `erp-codex/`, `nock-erp-next/` — น่าจะมาจากเซสชัน Codex CLI แยกต่างหาก อ้างว่า nock-erp-next เป็นโปรเจกต์หลักแทน erp-v2) — เจ้าของยืนยันแล้วว่า **erp-v2 คือของจริงที่ทำต่อ** ไฟล์พวกนั้นเป็นของเก่า/ทดลองที่ยังไม่ลบ ไม่ต้องสนใจ

**เหลือทำ:** เฟส 2-6 ตามลำดับในหัวข้อ WORKLOG ด้านล่าง (permission matrix, Force Approve+Notification, Class deletion+Logs, Date format ทั้งระบบ, หน้า Student ใหม่)

---

## 2026-09-26 — ERP: วิจัย Settings/Billing ของจริง + feedback สตาฟ + ตัดสินใจ business rules ชุดใหญ่ (ยังไม่ได้ Build)

**สถานะ:** เซสชันนี้เป็น**การวิจัย+ตัดสินใจล้วนๆ ไม่มีโค้ดเปลี่ยนเลย** — เปิดแชทใหม่ให้เริ่ม Plan mode ต่อจากตรงนี้ได้ทันที (context ของแชทเดิมเต็มแล้ว)

### สิ่งที่ไปเก็บมา (reference ห้ามลืม)
1. **Settings จริงที่ `erp-staging.nockacademy.com`** — Branch Settings มี 11 แท็บ (Info/Bank/LINE/Scheduling/Subjects/Grades/**Packages**/**General Fees**/Promotions/Staff/Holidays) + Settings→System ระดับ brand (Global Subjects/Holidays/Invoice Memos/Preferences) — erp-v2 ขาดไปครึ่งนึง โดยเฉพาะ General Fees (Bus/Entry/Mock — เรามีแค่ `busFeePerLeg` ตัวเดียว) และทั้งหมวด System
2. **Create Invoice flow จริง** — ผูกกับ Class/Session จริงเสมอ (บังคับ "Select Class" ก่อนคำนวณราคาได้) → pro-rate ตามจำนวนคาบที่เหลือจริงในเดือนนั้น (tier 100/60/30% แบบที่คุยกันไว้ก่อนหน้า ยืนยันด้วยตาแล้ว) → Discount(จาก Promotion catalog) แยกจาก Concession(ลดเฉพาะใบนี้) → Book fee(กรอกอิสระ) → Advance Optional(จาก General Fees, auto-waive ถ้าเคยจ่ายแล้ว)
3. **Google Sheet feedback จริงจากสตาฟ** (`ERP-test-feedback`, 28 รายการจาก Dear/Pin/Tu. + Dev punch-list 5 ข้อ) — บั๊กใหม่ที่ยืนยันชัด: **session generation ของจริงถูก cap ไว้แค่ 9 ครั้ง** ไม่ครบคอร์ส (erp-v2 ไม่มีปัญหานี้ ปลอดภัยอยู่แล้ว)

### ตัดสินใจ business rules ชุดใหญ่ (เจ้าของยืนยันแล้วทุกข้อ 2026-09-26)

- **Leave ไม่หักโควตา (ฟีเจอร์ใหม่):** สำหรับลาระยะยาว (ต่างประเทศ/ป่วยหนัก/อุบัติเหตุ) บังคับใส่ remark เสมอ · **Admin หรือ Manager ตัดสินใจอนุมัติเองได้เลย** ไม่ต้องขึ้นไปสูงกว่านั้น
- **สิทธิ์อนุมัติ Invoice:** Admin/Manager/Area Manager/Super Admin/Director อนุมัติได้หมด **แต่เฉพาะสาขาตัวเอง** (Area Manager ขึ้นไปข้ามสาขาได้) · **Teacher สร้าง Invoice ไม่ได้เลย** (ตัดสิทธิ์ทั้งหมด ไม่ใช่แค่ approve ไม่ได้)
- **ครูเห็นคาบทั้งหมดเป็น default** มี filter กรองเหลือแค่ของตัวเองได้ — **กลับด้านจากสมมติฐานเดิม** ที่ตั้งไว้ตอนสร้าง erp-v2 (เดิมคิดว่าเห็นแค่ของตัวเอง) ต้องแก้ `permissions.ts`
- **Force Approve:** อนุญาตให้ข้าม maker-checker ได้ในบางกรณี **บังคับ remark ทุกครั้ง** + แจ้งเตือนทั้งสาขา + แจ้งเตือน Director เสมอ
- **Package price ใน Settings = ข้อมูลอ้างอิง/Optional เท่านั้น** ไม่ใช่ตัวบังคับราคาจริง — แค่ช่วย Admin ตอนตั้งราคา Course เอง (ราคาจริงอยู่ที่ Course) → **ไม่ต้องทำ pricing matrix ซับซ้อน** แบบที่เคยเสนอไว้ ทำแค่ "ราคาแนะนำ" พอ (สวนทางกับที่ผมเข้าใจตอนแรกจากการดู staging เฉยๆ — เชื่อคำตอบเจ้าของ ไม่ใช่ที่สังเกตเอง)
- **ราคาต่างกันได้เต็มที่ตามสาขา+วิชา+เกรด** — ยืนยัน flexible
- **Invoice ผูก Class จริงเสมอ** ต้องรู้วันเริ่ม/วันจบคอร์สแจ้งผู้ปกครองได้จริง (ตรงกับที่เจอใน staging)
- **สร้าง Class จาก Invoice ได้เลย** เป็น fallback — flow ปกติ Admin สร้าง Class ไว้ก่อนอยู่แล้ว
- **ต้องการระบบ Notification ภายในที่ดีมาก** ให้ทีมสื่อสารกันได้ (reschedule แจ้งครูเป็นแค่ 1 use-case ในภาพใหญ่กว่านี้) — ควรออกแบบเป็นระบบกลาง ไม่ใช่แพทช์ทีละจุด
- **ลบ Class ได้เสมอ** ถ้ายังไม่เคยมีคนเรียน หรือไม่มีคนเรียนแล้ว — ป้องกันลบพลาดด้วย **popup โจทย์เลขสุ่ม (เช่น "4+3=" ให้พิมพ์คำตอบ)** ก่อนลบจริงทุกครั้ง + **log ทุกการกระทำเสมอ (ใคร ทำอะไร เมื่อไหร่)** — นี่คือที่มาของหน้า **Logs** ที่ erp-v2 ยังไม่มี ต้องสร้างคู่กับฟีเจอร์นี้
- **Format วันที่ทั้งระบบ = `จ. 24 กย 26`** (ย่อวัน + วันที่ + เดือนย่อไทย + ปี พ.ศ. 2 หลัก) — เช็ค `fmtDate` ปัจจุบันว่าตรงรูปแบบนี้อยู่แล้วหรือต้องแก้
- **หน้า Student ต้องปรับใหม่:** KPI cards (จำนวนนักเรียน/นักเรียนใหม่/Churn ตาม time period ที่ filter ได้/ใกล้หมดคอร์ส) + Search (boolean) + Filter (Grade/School/Course/Subject/Package[Hour,Week,Month]/Status[Active,Inactive,Renewal,Overdue,Archived]/Branch) + Sort (Name/Grade/Enroll date/Expire date/Status) — วิเคราะห์เชิงลึก (ที่มานักเรียนจากโรงเรียนไหนเยอะสุด ฯลฯ) ยกไปหน้า **Reports** แทน ไม่ต้องอัดในหน้า Student

### เหลือทำ (เริ่มจากตรงนี้ในแชทใหม่)

- [ ] **เข้า Plan mode** ออกแบบ implementation ให้ครบทุกข้อข้างบน — แนะนำแบ่งเฟส เพราะแต่ละอันเป็นคนละฟีเจอร์กัน:
  1. Leave ไม่หักโควตา (เล็ก, ทำก่อนได้)
  2. แก้ permission matrix (Invoice approval, ครูเห็นคาบทั้งหมด+filter) — กระทบ `permissions.ts` + `billing.ts` (canApprove)
  3. Force Approve + Notification ระบบ (ทั้งสองอันผูกกัน เพราะ Force Approve ต้องยิง noti)
  4. Class deletion (math-captcha confirm) + หน้า **Logs** (audit trail ใหม่ทั้งหน้า)
  5. Date format ทั้งระบบ → `จ. 24 กย 26`
  6. หน้า Student ใหม่ (KPI+filter+sort)
- [ ] ยังไม่ได้ตัดสินใจ: package matrix ที่เคยเสนอ **ยกเลิกแล้ว** ตามคำตอบข้อ 5 — อย่าไปทำ อ่าน WORKLOG นี้ก่อนเริ่ม กัน rebuild ผิดทาง
- [ ] ของเดิมที่ค้างมาจากรอบก่อนๆ ยังไม่ได้ทำ: Enroll/Billing form ผ่าน LIFF, GENERIC_TIMES ตั้งค่าต่อสาขาไม่ได้, ทดสอบ LIFF จริงจากมือถือให้จบ

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

**ตามมาต่อ (เจ้าของทดลองใช้จริงแล้วเจอ edge case):** ตอนแรกให้ผู้ปกครองเลือกได้แค่ 1 ช่วงเวลารวมทั้งฟอร์ม ถึงจะเสนอหลายวิชาก็ตาม — เจ้าของแก้ requirement ว่า **เลือกได้ทีละวิชา** แต่ถ้า 2 วิชาขึ้นไปตรงกัน "วันเดียวกัน" ต้อง**บังคับเวลาเริ่มเดียวกัน** และรวมเป็น**นัดเดียวห้องเดียว ไม่เกิน 2 ชม.** (เช่น เลือกคณิต+อังกฤษวันเดียวกัน → รวมเป็นคาบเดียว 120 นาที ห้องเดียว ครูคนละคนแต่อยู่คาบเดียวกัน) ถ้าคนละวันเลือกเวลาต่างกันได้อิสระ — แก้แล้ว: LIFF ให้เลือกได้ทีละวิชา (ล็อกเวลาให้ตรงกันถ้าวันเดียวกัน, ตัวเลือกอื่นในวันนั้นจะกดไม่ได้) → `submit` ส่งเป็น picks[] หลายอันได้ → ตอน Approve เช็คหา submission พี่น้องที่ leadId/วันที่/เวลาตรงกันแล้วรวม (`buildCombinedSessionDraft`) สร้างคาบเดียว 120 นาที ห้องเดียวจริง (`src/domain/rules/forms.ts`) → **ทดสอบจริงแล้ว**: ส่ง 2 วิชาเวลาเดียวกัน → อนุมัติแค่อันเดียว → อีกอันอนุมัติตามอัตโนมัติ → เช็ค localStorage เจอคาบเดียวจริง "คณิต + อังกฤษ" 120 นาที ห้องเดียว ครูสองคน

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
