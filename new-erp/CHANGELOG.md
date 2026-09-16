# NockERP — Changelog

> ประวัติการแก้ไข ย้ายออกจาก CLAUDE.md เพื่อลดขนาด context ที่ถูกโหลดทุก turn (ลด credit)

*31 Jul 2026 (1): **Bus Route รื้อ model ใหม่ — Route-based (Liclass only)** (Nock: คุยรอบใหญ่หลัง build ข้อมูลเยอะ)*
*  เดิม: STOPS[vid] ผูกกับคัน · เช้า/เย็น binary · single-round · reorder ด้วยลูกศร ▲▼ · ทุกสาขา*
*  ใหม่ (`DB.busRoutes[]`): **Route = คัน × รอบ × (รับ/ส่ง) × วัน × stops(ordered)** — 1 คันมีหลายรอบ/วันได้*
*  (`kind:'pickup'|'dropoff'` · `round:N` · `days[]` · `anchor` เวลาถึง/ออกโรงเรียน · stop มี `withParent`)*
*  (1) **Scope Liclass เท่านั้น** = Sriracha + Thonglor (ตัด Sukhumvit ออก — Nock academy ยังไม่มีรถ)*
*  (2) **Route CRUD** — tab Routes ใหม่: สร้าง/แก้/ลบ route (ชื่อ·รถ·ประเภท·รอบ·วัน·anchor) แทน Zones เดิม*
*  (3) **Drag & Drop** จัดลำดับจุด (`.br-grip` + HTML5 dnd `brDragStart/DragOver/Drop`) แทนลูกศร*
*  (4) **Weekly timetable** — แถว=Route · คอลัมน์=จ–อา · ช่อง=เวลา+จำนวน+สีรับ(ฟ้า)/ส่ง(ส้ม) · คลิก→Daily*
*  (5) **Add student + พ่วงผู้ปกครอง (optional, +1 ที่นั่ง)** · candidate จาก busRoster (บิลจ่ายแล้ว) autofill*
*  (6) ปรับ `js/bus-views.js` (timeline/track/sheet) + `brPreview` เป็น route-based (รับ routeId แทน vid)*
*  ค้าง batch หน้า: Map view (Nock เลือก real map · ต้องมี lat/lng) · reschedule class↔bus · report/map · Daily=ยังต่อ approve/track เดิม*
*  verify browser (Director): Daily 5 รอบ/ศุกร์ ✓ · Weekly grid ✓ · Routes drag โจ้ท้าย→หน้า ✓ · create route+add student+parent (seat=2) ✓ · Thonglor 2 routes ✓ · timeline/sheet/track ✓ · 0 console error*
*  ⏳ bus-report.js (renderBusWeek/Report เดิม) = dead code รอรื้อ batch map*

*23 Jul 2026 (5): **Day chips วัน+เวลา + ปรับรอบเรียนแบบ "จาก → ไป"** (Nock: การเลือกยังยุ่งยาก)*
*  (1) CourseSched: day picker เดิมเป็นปุ่มตัวย่อลอยๆ (อ./พ./พฤ./ส.) ไม่บอกเวลา → เปลี่ยนเป็น **chip วัน+เวลา***
*  (`.cs-daychip` วัน ตัวหนา + เวลาใต้ + ติ๊กเมื่อเลือก) · หัวข้อโชว์ "สัปดาห์ละ N ครั้ง" + badge "เร่ง" ชัดขึ้น*
*  (2) enroll-frequency: จาก 2 แท็บ (ปรับถาวร/ชั่วคราว) → **3 แท็บตามเจตนา**: **ย้ายวัน** (จาก→ไป · ความถี่เท่าเดิม)*
*  · **เพิ่มรอบถาวร** (เรียนอยู่ + เพิ่มวัน) · **เพิ่มรอบชั่วคราว (ก่อนสอบ)** — ทุกแท็บใช้ layout `.cs-move`*
*  grid 3 คอลัมน์ (ซ้าย → ลูกศร → ขวา) ให้เห็นทันทีว่าย้าย/เพิ่มจากวันไหนไปวันไหน เวลาเท่าไหร่*
*  กล่องผลกระทบเปลี่ยนข้อความตามโหมด (ย้ายวัน = "สัปดาห์ละ N ครั้งเท่าเดิม · วันจบแค่ขยับ" ไม่ใช่ "เร่ง")*
*  enr.days เรียงตามลำดับวันของคลาสเสมอ (sortDays)*
*  (3) 🐛 **fix ค่ารถคิดเกิน** — niSchedEntries ป้อน `round.days` (วันที่คลาสเปิดทั้งหมด) ให้ BusFee ⇒ คลาสเปิด*
*  อ./พ./พฤ./ส. แต่เด็กมาแค่อังคาร ก็โดนคิดค่ารถ 4 วัน (฿3,200) · แก้เป็นใช้ `sched.days` → ฿800 ·*
*  กดเพิ่มวันพุธ → ฿1,600 ถูกต้อง*
*  ✅ Nock ยืนยัน: เรียนถี่ขึ้น = ใช้ชั่วโมงเร็วขึ้น ไม่คิดเงินเพิ่ม (สมมติฐานเดิมถูก)*
*  verify browser: chip โชว์ "อ. 10:00-12:00" ครบทุกวัน ✓ · ย้ายวัน อ.→พฤ. (จบ 8 ก.ย.→10 ก.ย., 1x เท่าเดิม) ✓ ·*
*  เพิ่มรอบถาวร +อ. → 2x จบ 18 ส.ค. ✓ · boost ส. ถึง 30 ก.ย. ✓ · enr.days เรียง ['Tue','Thu'] ✓*

*23 Jul 2026 (4): **ความถี่การเรียนต่อสัปดาห์ (1x / 2x) + เพิ่มรอบชั่วคราวก่อนสอบ***
*  โจทย์ (Nock): 1 course ปกติเรียนสัปดาห์ละ 1 ครั้ง แต่เรียน 2 ครั้ง/สัปดาห์ก็ได้ (Single course) · และมีเคสที่*
*  สมัครไปแล้วเรียน 1 ครั้ง/สัปดาห์ พอใกล้สอบผู้ปกครองขอเพิ่มเป็น 2 ครั้ง/สัปดาห์เฉพาะช่วง*
*  ปัญหาเดิม: class.days = ['Mon','Wed'] แล้ว "ทุกคนในคลาสมาทุกวัน" — ระบบไม่รู้จักความถี่ระดับนักเรียน*
*  (1) course-schedule.js: เพิ่ม **day picker ความถี่** ใน New Invoice — default = วันแรกของคลาส (1 ครั้ง/สัปดาห์)*
*  กดเพิ่มได้สูงสุด MAX_PER_WEEK=2 · เหลือวันเดียวปิดไม่ได้ · เปลี่ยนแล้ว **วันเริ่ม/วันจบคำนวณใหม่ทันที***
*  (2) enrollment เก็บ `days[]` + `perWeek` (จาก inv.lines[].days → chosenSchedule → Billing.enroll)*
*  (3) session-gen.js: `attendsOn(enr, day, date)` — generate ชื่อนักเรียนเฉพาะวันที่เขาลงเรียนจริง ·*
*  รองรับ `enr.boost = {days,from,to}` (เพิ่มรอบเฉพาะช่วง) · ใบเก่าไม่มี days = มาทุกวันของคลาส (backward compat)*
*  (4) `js/enroll-frequency.js` (ใหม่) → **ปรับรอบเรียนหลังสมัครแล้ว** — 2 โหมด: **ปรับถาวร** (เปลี่ยน enr.days)*
*  · **เพิ่มรอบชั่วคราว (ก่อนสอบ)** (enr.boost + ช่วงวันที่ · พ้นช่วงกลับวันเดิมเอง) · preview "วันจบคอร์สเปลี่ยน*
*  X → Y (เร็วขึ้น)" + เตือนว่าชั่วโมงเท่าเดิม ไม่มีค่าใช้จ่ายเพิ่ม แต่ต้องต่อคอร์สเร็วขึ้น · เก็บ enr.history[]*
*  (5) student-profile.js Overview: การ์ด Course Quota โชว์ "อ.+พ. · สัปดาห์ละ 2 ครั้ง" + badge boost + ปุ่ม*
*  "ปรับรอบ" (อ่านจาก DB.enrollments จริง ไม่ใช่ display cache)*
*  ⚠️ สมมติฐานที่ยังรอ Nock ยืนยัน: เรียนถี่ขึ้น = ใช้ชั่วโมงในแพ็กเกจเร็วขึ้น ไม่คิดเงินเพิ่ม*
*  verify browser: Eng Active 48h คลาส อ./พ./พฤ./ส. → default อ. อย่างเดียว 24 ครั้ง จบ ม.ค. 2570 · กด พ. เพิ่ม*
*  → สัปดาห์ละ 2 ครั้ง จบ ต.ค. 2569 ✓ · กดวันที่ 3 ถูกบล็อก ✓ · enrollment เก็บ days ['Tue','Wed'] ✓ ·*
*  SessionGen: days=['Tue'] → ขึ้นเฉพาะอังคาร ✓ · boost Sat ในช่วง → ขึ้น อ.+ส. ✓ · สัปดาห์หลังหมดช่วง →*
*  กลับเป็นอังคารอย่างเดียว ✓ · ใบเก่าไม่มี days → ขึ้นครบทุกวันเหมือนเดิม ✓ · Tom Chen ปรับถาวร 1x→2x:*
*  จบ 8 ก.ย. → 25 ส.ค. ✓ · Student Profile โชว์ "อ.+พ. · สัปดาห์ละ 2 ครั้ง" ✓*

*23 Jul 2026 (3): **จับคู่ Pay slip ↔ KBiz statement** (`js/data-bank.js` → window.Bank + DB.bankStatements, ใหม่)*
*  ปัญหา (Nock): ตรวจสลิปกับ statement เป็น manual ล้วน — ช่อง "Ref. statement" เป็น optional free-text ไม่มีระบบ*
*  ไปจับเลข statement มาผูกกับ invoice ⇒ ตรวจย้อนไม่ได้ว่าเงินก้อนไหนคือบิลใบไหน · เสี่ยงจับคู่ซ้ำ/ผิดใบ*
*  แก้: mock statement feed ต่อสาขา (บัญชี KBank ต่อสาขา · สร้าง line จากบิลที่รอเงิน ~80% + รายการรบกวน) ·*
*  `Bank.candidatesFor(inv)` ให้คะแนน: ยอดตรงเป๊ะ +100 · ต่างไม่เกิน 5% +40 · สาขาเดียวกัน +20 · วันยิ่งใกล้ยิ่งสูง*
*  → Confirm Paid dialog เปลี่ยนจาก checkbox + free-text เป็น **รายการ statement ให้กดเลือก** (badge ยอดตรง /*
*  ต่างเท่าไหร่ / ห่างกี่วัน · ค้นหา ref-ชื่อผู้โอน-ยอด · ปุ่ม "ดึงรายการใหม่" = Bank.sync() จำลองดึงจาก KBiz)*
*  ผูก 2 ทาง inv.statementId ↔ stmt.matchedInvoiceId · **1 statement = 1 invoice** (จับคู่แล้วหายจากรายการบิลอื่น)*
*  ยืนยันไม่ได้ถ้ายังไม่จับคู่ (gate ใหม่แทน checkbox เดิม) · ไม่เจอในรายการ → ติ๊ก "กรอกเลขเอง" + flag*
*  statementManual (ทำเครื่องหมายว่ายังไม่ตรวจกับ feed) · เงินสด = ข้ามการจับคู่ · เลข ref + วันเวลา + บัญชี +*
*  ชื่อผู้โอน โชว์บนใบ invoice (_stmtBlock) เป็นหลักฐานเงินเข้า · fix: STATUS/filter/KPI รับ legacy*
*  'pending_verification' จาก seed data (เดิมตกไปเป็น Draft)*
*  verify browser: บิล ฿17,950 → matcher ยก KB2607230006 (CHEN C. ยอดตรง) ขึ้นอันดับ 1 ✓ · ปุ่ม disabled จน*
*  เลือก ✓ · confirm → paidRef+statementId ผูก 2 ทาง ✓ · statement เดิมหายจาก candidates ของบิลอื่น ✓ ·*
*  กรอกเอง: ปุ่ม disabled จนพิมพ์ ref ✓ · ใบ invoice โชว์บล็อก "หลักฐานเงินเข้า" ✓*

*23 Jul 2026 (2): **Billing state machine — ยืนยันเงินเข้าก่อนเข้าคลาส** (`js/billing-payment.js`, ใหม่)*
*  ปัญหา: เดิมมี 2 เส้นแยกกัน — paid (เข้า Revenue+ตัดสต็อก แต่ไม่สร้าง enrollment) กับ confirmed (สร้าง enrollment*
*  + เข้า roster แต่ไม่เคยเป็น paid ไม่เข้า Revenue ไม่ตัดสต็อก และไม่มีปุ่มอะไรต่อ = ตาย) ⇒ เด็กเข้าคลาสได้โดย*
*  ระบบไม่รู้ว่าจ่ายเงินหรือยัง · ปุ่ม Verify โผล่เฉพาะ status 'pending' ซึ่งไม่มี flow ไหนสร้างเลย*
*  แก้เป็นเส้นเดียวตาม flow จริงของ Admin (Nock ยืนยัน): draft → sent → **pending (มีสลิปแล้ว)** → **paid***
*  1) ผู้ปกครองส่งสลิปทาง LINE → Admin กด "แนบสลิป" (billingUploadSlip: วันที่โอน/ยอด/ช่องทาง/ไฟล์ · เงินสด*
*  ไม่ต้องแนบไฟล์) → pending · 2) Admin เปิด KBiz เช็ค statement (นอกระบบ) · 3) กด **Confirm Paid** —*
*  checkbox "ตรวจ statement ใน KBiz แล้ว" **บังคับติ๊กก่อนปุ่มถึงจะกดได้** + วันที่เงินเข้า + Ref.statement →*
*  status paid + ตัดสต็อก + Billing.enroll() ส่งเข้า roster + เข้า Revenue + ออกใบเสร็จได้*
*  เพิ่ม: เตือน**จ่ายเกิน/ขาด**เทียบยอดสลิปกับบิล (เก็บ inv.amountDiff) · **สลิปไม่ถูกต้อง** → ตีกลับเป็น sent*
*  (เก็บ rejectedSlips[] + เหตุผลบังคับ) · **Void** ทุกสถานะก่อน paid — เหตุผลบังคับ (dropdown+note) เก็บใบเก่าไว้*
*  (voidReason/voidedBy/voidedAt/replacedBy) + สร้างใบใหม่ทดแทนอัตโนมัติ (copy lines, status draft, replaces) ·*
*  inv.history[] = audit trail ทุก action · billing.js: STATUS map ใหม่ + rowActions() ต่อสถานะ + KPI (Pending →*
*  "รอตรวจ statement", Total Documents → Voided) + filter chips ใหม่ + modal เหลือ 2 ปุ่ม (Save Draft / Create &*
*  Send to Parent — ตัด "Mark as Paid" ออก เพราะเงินเข้าทีหลังเสมอ) · billingConfirm/billingVerify = legacy alias*
*  fix: billingSend เดิมแก้ ledger (สำเนา) ไม่ใช่ DB.invoices → status หายตอน refresh*
*  verify browser: sent → แนบสลิป(Cash) → pending → Confirm Paid (ปุ่ม disabled จนติ๊ก KBiz ✓) → paid + 3*
*  enrollment + Win เข้า roster cls-007 ✓ · จ่ายขาด ฿500 ขึ้นเตือนถูก ✓ · Void ไม่กรอกเหตุผล = บล็อก ✓ · void*
*  แล้วได้ใบใหม่ INV-0062 draft ผูก replaces/replacedBy ✓*

*23 Jul 2026: **Billing ▸ New Invoice — Course Schedule picker** (`js/course-schedule.js` → window.CourseSched, ใหม่)*
*  ปัญหา: Admin คุยกับผู้ปกครองสดๆ แต่ modal ไม่โชว์ตารางเรียนเลย — scheduleOptions ถูกคำนวณตอนกด Save แล้วโยนให้*
*  parent เลือกทีหลัง ⇒ Admin ต้องเปิดหน้า Classes อีกจอถึงตอบได้ว่าเรียนวันไหน/เริ่มเมื่อไหร่/จบเมื่อไหร่*
*  แก้: เลือก course ปุ๊บ กางบล็อกตารางในบรรทัดนั้นเลย — เลือกคลาส (single) หรือ **รอบ Sat/Sun** (bundle · เลือกรอบ*
*  เดียว สัปดาห์ละครั้ง · 1 block = billingBlockSize ครั้ง) · ที่นั่ง n/6 เต็ม=disable · วันเริ่ม default = วันเรียนถัดไป*
*  (เลื่อนไปข้างหน้าได้) · **วันจบคำนวณอัตโนมัติข้ามวันหยุด** พร้อมบอกว่าข้ามวันไหน · เตือนชนคลาสเดิมของนักเรียน ·*
*  bundle เข้ากลางคัน = badge "เข้าที่ครั้งที่ N" · ไม่มีคลาสรองรับ → ปุ่มไปสร้างที่ Classes*
*  data.js: crs-006 +bundleDays['Sat','Sun'] · +cls-010/011/012 (รอบอาทิตย์) · billing.js: line row กาง .ni-line-sched,*
*  bundle คิดราคาเป็น block, BusFee อ่านรอบที่เลือกจริง (ไม่ใช่คลาสแรกที่เจอ), Book fee ดึงทุกวิชาใน bundle (เดิม*
*  วิชาแรกวิชาเดียว), lines[] เก็บ classIds/startDate/endDate/meetings/blocks, chosenSchedule = object ต่อ course,*
*  billingConfirm สร้าง enrollment ครบทุกวิชาพร้อม startDate จริง · verify browser: Ploy/Math ป.5 → จ.+พ. 12 ครั้ง*
*  ข้ามวันหยุด 2 วัน ✓ · Mia/Math ป.5 → เตือนชน Eng Active วันพุธ ✓ · Win/Bundle 2 blocks → ฿11,800 · 8 ครั้ง ·*
*  confirm สร้าง 3 enrollment (Math/Eng/Science 16h) ✓ · ⚠️ ค้าง: state machine ยัง confirmed ก่อน paid (รอ Nock ตอบ)*

*18 Jun 2026: Traveling (Bus) fee — js/bus-fee.js (window.BusFee) · คิด "ต่อวันเดินรถ (day-of-week)" ไม่ใช่ต่อ*
*  course → course ที่เรียนวันเดียวกัน (ชนวัน) รวมเป็นรอบเดียว (รับก่อนคลาสแรก · ส่งหลังคลาสสุดท้าย) · ไม่ชน =*
*  แยกรอบ · pickup/dropoff ต่อวัน (เรต/รอบจาก Settings default 100 × สัปดาห์) · เสียบเข้า New Invoice modal*
*  (billing.js): ค่ารถ derive จากวันเรียนของคอร์สที่เลือก (DB.classes) → รวมใน Total ควบ promotion · save เป็น*
*  bus line (fee:'bus') · verify: Eng Active + Math ป.5 ชน Wed → รวมแถวเดียว shared, toggle ลดยอดถูก · ก้อนแรกของ*
*  Invoice-creation flow (ยังเหลือ: schedule curation, book ownership, sibling discount, parent form, class-created)*

*7 Jul 2026: Reimbursement ยกเครื่องตาม mockup ที่ Nock ส่งมา — (1) **detail modal → FinPanel drawer** (Info/Logs*
*  tabs) ให้เข้าพวกกับ Expenses/Requests: Payment method (pay-back-to-staff) → Files gallery → Workflow timeline;*
*  spacing กระชับตาม mockup (เลิก doc-preview 280px + sp-4 gap ของ modal เดิม) · (2) **Create เก็บบัญชีปลายทาง***
*  ที่จะโอนคืน staff (payTo/payBank/payAcctNumber/payPromptPay + QR upload) — เดิมไม่มี ระบบไม่รู้จะจ่ายคืนที่ไหน ·*
*  (3) **Forward to Central flow** (ใหม่): branch admin ที่จ่ายเองไม่ไหว → กด Forward + เลือกเหตุผล (Amount too*
*  high/Problem with info/Wrong info/Other) → Director/Special จ่ายจาก Central Bank แทน (ก่อนหน้านี้จ่ายจาก petty*
*  สาขาอย่างเดียว ไม่มีทางออก) · data-finance.js: +isReimCentralApprover/reimActor/reimActionableFor/*
*  forwardReimbursement, payReimbursement รับ status forwarded→source central + payback slip; badge = reimActionableFor ·*
*  verify browser: forward→central approve จ่ายจาก Central + post ledger source:central ✓ · ตาราง list 100% width กระชับ*

*7 Jul 2026: Finance IA expansion (§19) — Nock คุยกับ GPT สรุปว่า Finance ยังขาด Dashboard กับ Settings · วางแผน*
*  ผ่าน Plan Mode ก่อน build เพราะงานใหญ่ (rename + data layer ใหม่ + 8 settings section) · **Dashboard rename**:*
*  `fin-overview.js`→`fin-dashboard.js` ทุก id/label/filename (mechanical, ไม่เปลี่ยน logic) · **`js/data-finance-*
*  settings.js` ใหม่** — Finance เป็นเจ้าของ config เองทั้งหมด แยกจาก Academy Settings เด็ดขาด: financeGeneral/*
*  financeCategories(ย้ายจาก hardcoded CATEGORIES)/financeApprovalRules(ย้ายจาก tierFor 1k/3k/5k)/financePettyCash*
*  (ย้ายจาก flat PETTY_BUDGET=10000 → ต่อสาขา)/financeBankAccounts(ใหม่ ไม่ทับ financeAccounts เดิม)/*
*  financePaymentMethods/financeNumbering/financePermissions · data-finance.js แก้ 4 จุดให้อ่านตารางใหม่แทน*
*  hardcode (verify แล้ว tier boundaries เหมือนเดิมทุกค่า) · เพิ่ม `FIN.nextDocNumber()` ให้เลขที่เอกสารแบบ*
*  `REQ-2026-00001` (record ใหม่เท่านั้น ของเดิมไม่เปลี่ยน) wire เข้า Request/Expense/Reimbursement/Recurring*
*  create flow ครบ · Bank Account quick-fill picker ใน Direct Paid create form · **Settings UI 4 ไฟล์ใหม่***
*  (fin-settings.js + -approval/-accounts/-permissions.js) 8 section ครบตาม spec ที่ขอ, CRUD pattern copy จาก*
*  settings-catalog.js · nav เพิ่ม section "System" เก็บ Settings · **จงใจไม่ทำ** (บอกตรงๆ): Permissions ยังไม่ต่อ*
*  เข้า authorization จริง (เสี่ยงพัง approve/reject/transfer flow ที่เพิ่ง build+test — Phase 2), Payment Methods*
*  ยังไม่มี consumer (Requests ยัง hardcode 'central'/'transfer' เดิม) · ทดสอบผ่าน preview ครบ (nav, 8 section,*
*  regression tierFor, numbering format, quick-fill, Teacher nav gate).*

*6 Jul 2026 (d): Mockup-driven rebuild (§18) — Nock ส่ง mockup 6 สถานะของ Request detail panel มาให้ดู ต่างจาก*
*  §17 (build เมื่อกี้เอง) หลายจุด: **Info/Logs tabs กลับมา** (§17 เอาออกไปคิดผิดว่า spec อยากได้ scroll เดียว) ·*
*  **Workflow+Files รวมเป็นช่องเดียว "Workflow & File upload"** — ปุ่ม/thumbnail อัปโหลดไฟล์ฝังอยู่ใน step ปัจจุบัน*
*  เลย (ไม่แยก section) ผ่าน `FinPanel.timeline()` ตัวใหม่ที่รับ `item.extra` · ปุ่ม footer เดียวเปลี่ยนข้อความตาม*
*  สถานะ (Approve→Confirm upload→Confirm upload & Complete) **บังคับแนบไฟล์ก่อนถึงกดได้** (ปุ่ม disabled จนกว่าจะ*
*  เลือกไฟล์ ผ่าน `frFilePicked()`) — ของเดิมปล่อยให้ข้ามได้ · ตัดแถว "Vendor" แยกออกจาก Payment method (Nock: จ่าย*
*  ตรง vendor เสมอ ไม่มีบัญชีคนกลาง) · เพิ่ม `FinPanel.tabStrip()` ใหม่ · rebuild `fin-requests.js`+`fin-expenses.js`*
*  ทั้งคู่ตามนี้ · ทดสอบผ่าน preview ครบทุก state ตรงกับ mockup (pending→approved→paid→closed).*

*6 Jul 2026 (c): Shared Side Panel component (§17) — Nock ถามทำไม Requests panel ไม่เหมือน Expense, สรุปว่าทิศทาง*
*  ที่ถูกคือ **Requests กลับไปเป็นตาราง 100% + drawer overlay เหมือน Expense** (ไม่ใช่ Expense เปลี่ยนเป็น persistent*
*  split แบบ Requests ตามที่ ADDENDUM spec เสนอ — Nock override) · สร้าง `js/fin-side-panel.js → window.FinPanel`*
*  (drawer shell/sectionLabel/card/fieldRow/copyBtn/docGallery/timeline ใช้ร่วมกัน) · rewrite `fin-requests.js`*
*  กลับไปตาราง 100% width + `frOpen(id)` เปิด drawer (sections: Overview→Information→**Workflow**→Files→**Audit**→*
*  Actions — แยก Workflow/Audit จริงตาม addendum) · rewrite `fin-expenses.js` เอา Info/Logs tabs ออก เหลือ scroll*
*  เดียวกัน sections เดียวกับ Requests (ไม่มี Workflow) · แก้ "Request by" column ให้ lookup `e.sourceRequestId →*
*  requestedBy` จริง (ไม่ตัดคอลัมน์ทิ้งตามที่ spec เสนอ — Nock override อีกจุด) · เพิ่ม COMPONENTS.md §19 documenting*
*  FinPanel API · ทดสอบผ่าน preview ครบทุก flow.*

*6 Jul 2026 (b): Document timeline follow-up (§16) — user เปิด Expense detail เจอ Document file โชว์ไฟล์เดียว*
*  แม้ workflow จริงมีเอกสาร 3 จุดเวลา (Invoice/Pay slip/Tax Invoice) — วิเคราะห์ workflow ก่อน build ตาม Finance*
*  UX Constitution: **Request panel** (`fin-requests.js`) เปลี่ยนจาก invoice block ตัวเดียวเป็น `documentsBlock(r)`*
*  โชว์เอกสารสะสมตามสถานะจริง (pending/approved→Invoice · paid→+Pay slip · closed→+Tax invoice ครบ 3) ·*
*  **Expense gallery** (`docThumb`) โชว์ caption ใต้ thumbnail ตาม `d.label` (Invoice/Transfer slip/Tax invoice) ·*
*  **Logs backfill** — `FIN.uploadReqTaxInv` (เพิ่ม param `user`) เขียนประวัติจริงลง `e.logs[]` ตอนสร้าง Expense*
*  (invoice_attached/payslip_attached/tax_invoice_attached/ledger_created พร้อมวันที่+ผู้ทำจริงของแต่ละ stage)*
*  แทนที่จะมีแค่ "created" วันเดียว · เพิ่ม field ใหม่ `r.transferredBy`/`r.taxInvBy` เก็บว่าใครทำ stage นั้น ๆ ·*
*  ทดสอบผ่าน preview ครบ flow Confirm Transfer → Upload Tax Invoice · **follow-up ทันที:** พบ 2 seed expense เก่า*
*  ("Air purifier x2", "Projector replacement") badge Direct Paid แต่ไม่มี request ผูกจริง เลยมีแค่ไฟล์เดียว —*
*  เพิ่ม `backfillDirectPaidSeed()` สร้าง closed request ผูกจริง (req-008/009) + เอกสาร/log ครบ 3 stage ให้ทั้งคู่.*

*6 Jul 2026: Architecture Refactor §15 — 2 จุดค้างตัดสินใจแล้ว → build ส่วนแรก. **Decision 1: Ledger สร้างหลัง Tax*
*  Invoice (Completed)** ไม่ใช่ตอน Confirm เหมือนเดิม — เฉพาะ Direct Paid (`kind:'budget'`); Petty Top-up ไม่กระทบ*
*  (ยังสร้างตอน paid/Confirm เหมือนเดิม เพราะไม่มี Tax Invoice step ให้รอ). **Decision 2: Reimbursement แยก page*
*  ต่อไป** ไม่ merge เข้า Request entity เดียว. Code: `FIN.markTransferred` (kind:'budget') เลิกสร้าง Expense —*
*  แค่เก็บ slip (ตอนนี้เป็น dataURL จริง ไม่ใช่แค่ filename) + สถานะ 'paid' · `FIN.uploadReqTaxInv` เพิ่ม*
*  param dataUrl/type (bug fix: tax invoice ก็เก็บไฟล์จริงแล้ว) และเป็นจุดสร้าง Expense จริง — carry invoice*
*  (จากตอนยื่น)+transfer slip+tax invoice เข้า `e.docs[]` ทั้ง 3 ไฟล์ พร้อม `e.sourceRequestId` ลิงก์กลับไป*
*  request (bidirectional link เริ่มต้น) · `fin-requests.js` frConfirmSave/frTaxInvSave อ่านไฟล์เป็น dataURL*
*  ก่อนส่งเข้า FIN แทนส่งแค่ชื่อไฟล์ · ทดสอบผ่าน preview: Confirm Transfer ไม่สร้าง ledger, Upload Tax Invoice*
*  ถึงสร้าง พร้อมเอกสารครบ. ดู FINANCE-MODEL.md §15 สำหรับ build order ที่เหลือ (shared Side Panel/Workflow*
*  component, ปรับคอลัมน์ตาราง — ยังไม่เริ่ม).*

*3 Jul 2026 (e): Record Usage → inline batch editor ตาม mockup ที่ user ส่งมา — เอา Modal ออก ขยาย section ในหน้า*
*  Expenses เอง (`#fx-batch-editor`, ระหว่าง filter bar กับ ledger) แทน · เพิ่มคอลัมน์ **Type** (Expense/Income) ต่อแถว ·*
*  ช่องขาดข้อมูล = ขอบเหลืองบน field จริง + badge Ready(เขียว)/Required(เหลือง) แบบง่าย (ตัด "Need category" ฯลฯ ออก) ·*
*  File cell โชว์ thumbnail จริง 32×32 แทนไอคอน+ชื่อไฟล์ · Cancel = text-link ยุบกลับ · Save all ยัง partial validation*
*  เหมือนเดิม (แถว Ready หาย, แถวขาดอยู่ต่อ).*

*3 Jul 2026 (d): Expense detail → slide-over panel ตาม mockup ที่ user ส่งมา — เอา Modal ออก ใช้ `#fx-drawer-root`*
*  แทน (backdrop+panel 420px, ปิดด้วย ✕/backdrop) · tabs **Info/Logs** · Info: title+badge→branch/date/recordedby→*
*  Paid to(avatar/vendor icon)→Amount→**Payment card**(account name/number/PromptPay ปุ่ม copy)→**Document gallery**
*  หลายไฟล์+Add More→Inactivate/Edit · Logs = audit trail ใหม่ (`e.logs[]`, FIN.logExpense) · data model:*
*  `e.docs[]` แทนช่อง docDataUrl เดี่ยว (legacy auto-migrate) · `FIN.markTransferred` ส่ง acctName/acctNumber/*
*  promptPay + invoice/slip จาก Direct Paid request เข้า Expense ที่เกิดขึ้นจริง (เดิมข้อมูลหายหลัง confirm) ·*
*  ledger table เพิ่มคอลัมน์ **Request by** (avatar) + weekly +/− total พร้อม collapse chevron (9 คอลัมน์ —*
*  ตั้งใจเกิน ≤8 เดิมเพราะมี reference ตรงจาก user).*

*3 Jul 2026 (c): Finance UX Refactor — click/speed rebuild (ไม่ใช่ visual pass) — **Requests เป็น master-detail**:
*  list (~60%) + panel ถาวร (~38%, sticky) แทน modal เดิม — คลิกแถว → panel เปลี่ยนทันที ไม่มี open/close animation ·
*  keyboard ↑/↓ เลื่อน selection (ไม่ผูก action ทำลายล้างกับคีย์) · Cancel confirm เป็น inline ใน panel เดิม ·
*  ลำดับข้อมูลใน panel ตาม money decision จริง: what→vendor+amount(ปุ่ม copy)→payment method+**Account name/Account
*  number/PromptPay แยก 3 ช่อง**(เดิมช่องเดียว, ปุ่ม copy ทุกช่อง)→invoice preview จริง→note→Requester/Approval→action
*  →**Activity Log** (timeline แนวตั้ง Requested→Approved→Transferred→Invoice Uploaded→Completed หรือสาย Rejected/
*  Cancelled, แสดงเสมอ ไม่ซ่อน) · แยก `r.approveRemark` ออกจาก `r.remark` กัน cancel ทับ remark ตอน approve ·
*  **Expenses → Record Usage เป็น batch editor**: ลาก/เลือกไฟล์ใบเสร็จหลายไฟล์พร้อมกัน → AI (mock) อ่านแต่ละไฟล์สร้างแถว
*  editable ให้ (ช่องไม่มั่นใจ = เว้นว่างให้กรอกเอง ไม่เดา) + "+ Add Row" กรอกมือแถวว่างในตารางเดียวกัน → **Save All**
*  = partial validation (แถว Ready บันทึก+หายไป, แถวที่ขาดข้อมูลอยู่ต่อให้แก้ ไม่ปิด modal จนกว่าจะครบ) · แก้ไข record
*  เดิม 1 รายการแยกเป็น flow ง่ายต่างหาก (`fxEditOne`).*

*3 Jul 2026 (b): Finance UX Constitution — workflow split, ไม่ใช่แค่ visual — **Expenses ≠ Requests** ตาม "หนึ่งหน้า*
*  หนึ่งจุดประสงค์": Expenses (js/fin-expenses.js) เหลือแค่ ledger ประวัติ (ตัด tab Pending + ปุ่ม New Request + frOpen ออกหมด) ·*
*  **Requests ใหม่** (js/fin-requests.js, nav+badge-fin-requests) = พื้นที่ทำงานของ SA — Direct Paid+Petty Top-up เท่านั้น ·*
*  3 tabs by "ใครต้องทำ" ไม่ใช่ by stage: **Needs your action** (default, เรียงค้างนานสุดก่อน) / **Awaiting others** / **History** ·*
*  FIN.actionableRequestsFor/awaitingOthersFor/requestHistoryFor ใหม่ · Reimbursement แยกหน้าเดิม (approver ต่างกัน) ·*
*  Overview เลิก duplicate review UI (ลบ ovApprovals modal, KPI/alert เด้งไป fin-requests ตรงๆ) · frOpen เรียงลำดับใหม่ตาม*
*  money decision (what→who+amount→payment+account[มีปุ่ม copy]→invoice preview จริง[docDataUrl เก็บตอนยื่น Direct Paid*
*  เหมือน payslip ของ Reimbursement]→metadata→Activity) · **Cancel เป็น inline ในโมดัลเดิม** (frOpen(id,'cancel')) ไม่เปิด*
*  modal ใหม่ซ้อนแล้ว.*

*3 Jul 2026: Spec conformance — กลุ่ม A (FINANCE-MODEL.md §10) — เอา hard-delete ออก (fxRemove ลบทิ้ง · Inactivate เป็น*
*  soft-delete ทางเดียว), Reject requires remark ทุก request (FIN.reject คืน 'remark_required' ถ้าไม่กรอก) · เพิ่ม Cancel*
*  (FIN.cancel/canCancelReq — เฉพาะ status:'approved' ก่อน Confirm/Ledger, reason+remark บังคับทั้งคู่, สิทธิ์เดียวกับผู้อนุมัติ) ·*
*  Pending tab (block 1/2/3) รวมปุ่มเดิม (Approve/Reject/Transfer/Upload Tax Inv) เป็น**modal เดียว state-driven** frOpen*
*  (เหมือนแพทเทิร์น rbOpen ของ Reimbursement) — footer เปลี่ยนตาม r.status: pending→Approve/Reject · approved→Confirm/Cancel ·*
*  paid(budget)→Upload Tax Inv · Overview "Pending approvals" modal เรียก frOpen แทน frApprove/frReject ตรงๆ (แก้ bug*
*  canApprove→canApproveReq ให้เช็ค petty_topup gate ถูกต้องด้วย).*

*2 Jul 2026 (b): All ledger เพิ่ม Type column — FIN.txnType(e) → Record(เทา)/Direct Paid(ฟ้า)/Reimburse(ชมพู)/*
*  Recurring(teal, =salary+rental+utility)/Top-up(amber)/Income(เขียว) · Category ซ่อนสำหรับ received/income (Type บอกแล้ว) ·*
*  Top-up: amount สีกลาง (text-primary) ไม่ใช่เขียว income · "Paid to"→"Recorded by" = createdBy (คนเสมอ, ไม่มี vendor).*

*2 Jul 2026: (A) Direct Paid modal ใหม่ — Upload Invoice เด่นบนสุด (dropzone) → mock AI อ่าน→auto-fill (rqReadInvoice) +*
*  field เลขบัญชี/QR (rq-acct) + Note/Remark (rq-note) · (B) Petty imprest budget 10,000/สาขา — FIN.{pettyBudget,pettyUsed,*
*  pettyRemaining} · pettyUsed = real ledger ถ้ามี else synthetic (deterministic) สำหรับเทียบ period · (C) Overview*
*  Branch petty list (Budget/Used/Remaining) + period chips MTD/MoM/QTD/QoQ/YTD/YoY (periodMonths+sumUsed·ovSetPeriod) ·*
*  Director เห็นทุกสาขา. หมายเหตุ: real finance data มีแค่ เม.ย.–มิ.ย. 2026 → QoQ/YoY ใช้ synthetic.*

*30 Jun 2026: Request lifecycle (flow B) + Direct Paid tier gate — approve = endorse only (ไม่ post เงินทันที) → status*
*  Pending→Approved(รอโอน KBiz)→Paid(SA แนบสลิป, post เงินออก)→Closed(Direct Paid: upload tax inv) · Create/Approve*
*  Transaction = external KBiz (ระบบไม่แตะ) · FIN.{markTransferred,uploadReqTaxInv,awaitingTransferFor,awaitingTaxInvFor,canTransfer} ·*
*  Pending tab = 4 stage (รออนุมัติ/รอโอน/รอ tax inv/เบิกคืน) · "Budget"→"Direct Paid" + field payTo (vendor) · tier = endorsement*
*  gate ของ Direct Paid เท่านั้น (Reimburse ใช้ Admin review) · spec ครบใน FINANCE-MODEL.md > Workflows.*

*29 Jun 2026 (6): Nav consolidation (Option A) + Paid-to cleanup — ยุบเมนู Requests เข้า Expenses:*
*  Expenses มี Tabs **All / Pending** (Pending = approval queue รวม budget+petty_topup+reimbursement, approve/reject/review ในตัว) ·*
*  "+ New Request" chooser (Budget/Petty top-up) + "Record Usage" บนหน้าเดียว · ลบ js/fin-requests.js + nav + view ·*
*  frApprove/frReject ย้ายมา global ใน fin-expenses (Overview ยังเรียกได้) · badge ย้าย #badge-fin-req → #badge-fin-expenses ·*
*  **Record Usage ตัด Paid-to + Staff/Vendor toggle** (vendor→description) · paidCell โชว์เฉพาะ staff, อื่น="—" ·*
*  Reduce credit: ย้าย Business Rules → BUSINESS-RULES.md (CLAUDE.md 890→~590 บรรทัด).*

*29 Jun 2026 (5): Finance migration ตาม FINANCE-MODEL.md (5/6) — Expense=log ล้วน (เอา pending/approve ออก, flow=upload/done) ·*
*  Reimbursement ผู้จ่าย=Admin จาก Petty สาขา (isReimApprover=admin+, payReimbursement source=petty, reimbursementsFor=branch scope) ·*
*  Petty Top-up = Request (kind:'petty_topup', Director/SA approve → post received petty; ปุ่ม "Request Petty Cash") ·*
*  Budget Request +payMethod (central/transfer) แสดง Type column ใน Requests · FIN.canApproveReq แยก authority ·*
*  ทุก flow auto-post เข้า ledger · เหลือ Recurring rework (variable + INV aggregation).*

*Last updated: 29 Jun 2026*
*Revised 29 Jun 2026 (4): Finance ▸ Overview rebuild = command center — js/fin-overview.js:*
*  Needs-attention alert cards (problem→impact→action: negative petty float / reimb aging>7 / pending*
*  requests / branch burn ▲>50% / Central runway<4mo / recurring due) · Branch watch table (spendOps*
*  MoM excl salary+rent · float · status เรียง worst-first) · Upcoming+forecast (FIN.forecast/fixed cost) ·*
*  KPI Pending approvals คลิก→ovApprovals() modal (requests inline approve/reject + reimburse review) ·*
*  เอา Recent Activity ออก · seed June petty spend (Bang-Na burn → float ติดลบ -1,490 เป็น demo story).*
*Revised 29 Jun 2026 (3): Finance ▸ Reimbursement (staff สำรองจ่าย → claim คืน) — js/fin-reimburse.js +*
*  DB.reimbursements + FIN.{reimbursementsFor,isReimApprover,pendingReimFor,addReimbursement,*
*  payReimbursement,rejectReimbursement,daysSince}. กฎ: ทุก role สร้างได้รวม Teacher · เปิด Finance ให้ Teacher*
*  เห็นเฉพาะเมนู Reimbursement + คำขอตัวเอง (app.js applyFinanceNavGate/financeLimited · switchSystem default*
*  = fin-reimburse สำหรับ teacher) · Payslip บังคับ (tax invoice optional) upload+preview · approve = Director/*
*  Special เท่านั้น (จ่ายจาก Central Bank) · Pending(aging)→Paid(−Central, post ledger reimbursement)/Rejected*
*  (remark บังคับ, approve remark optional) · ย้าย mock "Rei" petty เดิม → flow นี้ + seed paid central entry.*
*  ⏸️ ค้างคุย: top-up ควรหัก Central (transfer) ให้ reconcile · เส้นทางเงินเข้า Central (เชื่อม Billing?)*
*Revised 29 Jun 2026 (2): Finance polish + Reports — nav: user avatar ย้ายลง app-rail (.rail-user),*
*  sidebar รองเอา logo+user ออก (เมนูล้วน) · updateUserCard set #rail-av/#rail-user-role ·*
*  Overview: account balances = compact card grid (display:grid inline — .card-grid ไม่มีใน CSS) + callout padding ·*
*  Expenses: Month view (cards) → Daily drill (level state) · Document column + detail modal doc preview/upload*
*  (FileReader docDataUrl · seeded sample facsimile) · เอา POST column/checkbox ออก · branch filter ใช้งานจริง ·*
*  Recurring: rebuild — salary per-branch payee lines (DB.staff × SALARY_BY_ROLE) + status badge + 6-mo forecast,*
*  เอา Post now/Inactive ออก · detailed create (salary branch→staff→payday) · fin-reports.js (branch compare/IvO/category/forecast)*
*Revised 29 Jun 2026: ⭐ Finance / Expense system (Core) — แยกระบบจาก Academy ด้วย ClickUp 2-tier nav:*
*  app-rail (icon rail ซ้ายสุด = สลับระบบ Academy/Finance/HR-soon) + `switchSystem()` ใน app.js สลับ*
*  `#nav-academy`/`#nav-finance` (Academy เมนูเดิมไม่แตะ). Modular data layer js/data-finance.js (window.FIN):*
*  DB.expenses (unified ledger: usage/received/reimbursement/salary/rental/income · source central|petty ·*
*  docStatus paper/nodoc/cashsale/none = ใบกำกับภาษี · posted = POST) · petty float รัน balance ติดลบได้*
*  (FIN.ledger คำนวณ balanceAfter · seed ตรงตามชีต Liclass: 5000→ติดลบ→top-up→recover) · Central Bank จ่ายตรง ·*
*  DB.expenseRequests + approval tier (FIN.approvalTier: <1k none · 1k–3k Manager · 3k–5k Area Mgr · 5k+ Director/Special) ·*
*  FIN.canApprove (role rank + scope) · FIN.visibleBranches (Director/Special=all · Area Mgr=area · Mgr/Admin=branch) ·*
*  DB.recurringPayments (Salary/Rental — Director/Special create, no approval). 4 view modules (fin-overview/expenses/*
*  requests/recurring) + Reports placeholder. specialAdmin: live = CURRENT_USER.specialAdmin (staff flag = future appoint UI).*
*  switchRole/switchBranch เรียก _refreshFinanceViews() ให้ visibility อัปเดต. Verified: balance math · tier matrix ·*
*  approve posts expense · central+tier auto-creates Request · admin@Silom เห็นเฉพาะ Silom. ถัดไป: Finance Reports + Dashboard.*
*Last updated (prev): 16 Jun 2026*
*Revised 16 Jun 2026 (7): Reports = Executive BI (3 chunks) — js/data-reports.js (window.RD):*
*  monthly fact table 5 สาขา/2 area + seed 2025+2026 YTD (deterministic) · aggregate/derive/series ·*
*  reports.js rewrite: scope (Company/Area/Branch) + time engine (Period×Compare, auto MoM/QoQ/YoY) ·*
*  7 tabs: Overview(+Needs Attention) · Compare(leaderboard+heatmap+benchmark+per-student toggle,*
*  Manager hidden) · Financial(Outstanding/Discount/ARPU/Family LTV) · Students(net growth/churn*
*  split/cohort) · Acquisition(source/funnel/velocity) · Courses(package Volume·Value + Subject*
*  engine + Package×Grade) · Operations(teacher health + utilization + Demand Heatmap pivot)*
*Revised 16 Jun 2026 (6): Promotion Settings UI (Track A step 4 · จบ Track A) — Promotions section*
*  ในหน้า Settings → branch → Packages · stRenderPromotions + stAddPromotion/stSetPromo/stRemovePromotion*
*  (เกณฑ์ชม./pct/aggregate/active) · แก้แล้วไหลเข้า Utils.applyPromotion ทันที (verify 15%→25%)*
*Revised 16 Jun 2026 (5): Multi-course New Invoice (Track A step 3) — modal เลือกหลาย course,*
*  per-line price (coursePrice ตามสาขา), live Subtotal/Promotion/Total, save เข้า DB.invoices จริง*
*  (fix bug เดิม: niSave ไม่ push DB.invoices → refresh หาย · id เป็น max+1 กันชน)*
*Revised 16 Jun 2026 (4): Promotion engine (Track A step 2) — branchSettings[].promotions[]*
*  ({type:'discount_pct', thresholdHours, pct, aggregate, active}) ต่อสาขา (Silom 72→15/96→20,*
*  Sukhumvit 72→10/96→15) · Utils.applyPromotion({lines,branch}) คิดจากยอด hours รวม (aggregate)*
*  หรือ line เดียว · เลือกเกณฑ์สูงสุดที่ถึง · คืน {discount,subtotal,total} · verify ตรง INV-0059*
*Revised 16 Jun 2026 (3): Invoice line items (Track A step 1) — inv.lines[] + inv.discount ·*
*  Utils.invoiceLines/invoiceSubtotal/invoiceHours (fallback ใบเก่า course string เดียว) ·*
*  billing _docHtml render หลายบรรทัด + Sub Total/Discount row/Total · buildLedger ส่ง lines+discount ·*
*  demo INV-2026-0059 (Ploy 3 courses รวม 72h → promo −15% −3,240 = 18,360) · backward-compatible*
*Revised 16 Jun 2026 (2): Calendar Day view → minute-based (CalendarWidget.renderDay) —*
*  absolute positioning บน continuous time axis (08:00–20:00, PXMIN=1.15) · event วาง top/height*
*  ตาม startTime+durationMin จริง (evTime() fallback slot 2h) · hour gridlines + break shading +*
*  holiday overlay + selectable empty-slot create (อิง slotId เดิม) · Liclass demo s21–s23 Fri 29*
*  (90/50/75 นาที เริ่ม off-hour) · week/teacher/month/list ยังใช้ slotId*
*Revised 16 Jun 2026: Weekly session generation — js/session-gen.js (window.SessionGen):*
*  generateWeek(mondayStr,{commit}) สร้าง session จาก DB.classes ต่อสัปดาห์ ·*
*  generate เฉพาะนักเรียนที่ hours/blocks เหลือ (regular remainHours>0 · bundle block ยังไม่หมด) ·*
*  ข้าม pending_payment/archived · ข้าม holiday · ข้าม class ที่ไม่มีนักเรียน ·*
*  id เสถียร (gen-<monday>-<classId>-<col>) regenerate ไม่ซ้ำ · ปุ่ม "Generate next week" ใน Sessions*
*  (load order: session-gen.js หลัง attendance-picker.js ก่อน view modules)*
*Revised 15 Jun 2026 (3): Sessions เพิ่ม Group by selector (Day/Teacher/Branch/Status) —*
*  groupers map + generic header (icon/label/count) · status เรียง Live→Upcoming→Ended ·*
*  Today/Holiday badge เฉพาะตอน group=Day*
*Revised 15 Jun 2026 (2): Sessions = ศูนย์ปฏิบัติการ — แต่ละแถวกาง inline accordion (lazy render)*
*  โชว์ attendance รายคน + summary + AttendancePicker แทนการเด้ง Class Modal (sessToggle/renderDetail)*
*  · Attendance reframe เป็น report/history (เช็คชื่อย้ายไป Sessions) · UI.table รองรับ opts.tbodyId*
*  · fix Attendance bug: .replace('<tbody></tbody>') ไม่ match → ตารางไม่ render (38 records หาย)*
*Revised 15 Jun 2026: Summaries (Session tab) filter bar — Search + Course/Subject/Grade/Teacher*
*  dropdowns (จาก DB.courses / Utils.subjectsFor / CONST.GRADES / CONST.TEACHERS), status chips*
*  นับจำนวน (Awaiting/Draft/Not Written/Sent), sort ใหม่→เก่า(default)/เก่า→ใหม่, AND filtering,*
*  card grid หัวคั่นตามวัน, Bundle = 1 course entry → subject-session ติด badge ม่วง*
*  (เพิ่ม demo summaries ให้ s18/s19/s20 — Win Klahan awaiting/draft/sent)*
*Revised 11 Jun 2026 (4): Summary approval UX fix — submit แล้วขึ้นกล่อง "รอ approve" + Recall,*
*  notification แจ้ง Admin อัตโนมัติ, fix studentMeta family undefined ·*
*  Price Matrix แยกเป็น js/settings-pricematrix.js — accordion ต่อวิชา + filter*
*  (Subject/ระดับ/เฉพาะ override) + sticky column รองรับ worst case 10 วิชา × 12 เกรด × 8 tiers*
*Revised 11 Jun 2026 (3): ⭐ Settings scope architecture — dropdown 🌐 Global/Branch ทั้งหน้าเปลี่ยนตาม:*
*  Global (Director เท่านั้น + amber banner): Subjects Pool (CRUD + used-in-branches lock),*
*  Grades Pool, Packages & Tiers (Hour/Week + default price), Holidays*
*  Branch: Package Types toggle (Hour/Week ต่อสาขา default ตาม schoolType), Price Matrix*
*  (Subject×Grade×Tier · inherit จาง/explicit เข้ม · bs.priceMatrix), เปิดวิชา/เกรดจาก pool*
*  ราคา 3 ชั้น: course.prices → bs.priceMatrix → pkgPrice ผ่าน Utils.coursePrice*
*Revised 11 Jun 2026 (2): ⭐ Course End Summary module — js/course-end.js + DB.courseEndSummaries:*
*  Summaries page แยก 2 tabs (Session / Course End), status flow draft→pending_teacher→approved→sent,*
*  Teacher confirm บังคับเสมอ, Bundle = section ต่อ subject ใน 1 document, PDF print window,*
*  ส่ง Parent ผ่าน Inbox thread จริง, auto-draft เมื่อ enrollment hours/blocks หมด,*
*  demo records ครบ 3 สถานะ (James pending_teacher · Win bundle draft · Mia sent)*
*Revised 11 Jun 2026: ⭐ Data connectivity overhaul — new js/data-sync.js (window.Sync):*
*  DB.enrollments = source of truth → student.courses/customers/family totals เป็น derived cache,*
*  Settings เชื่อมจริงทั้งระบบ: Packages (ราคา override ต่อสาขา → Billing), Subjects (per-branch*
*  → dropdowns ทุก form), Rooms (ตั้งชื่อใน Branch Info → Calendar/Classes/Schedule),*
*  Operating Days (→ disable วันปิดใน Class form), Holidays (→ Calendar dayHeaders อัตโนมัติ),*
*  Leave Quota ทำงานจริง (enr.leaveUsed + calConfirmLeave), Bundle demo chain ครบ loop (Win Klahan),*
*  เพิ่ม Sora enrollment, James 12h→24h, Lena stage trialed, Director+Manager staff records,*
*  Room names unified เป็น Room A/B/C ทั้งระบบ, stSaveAll บันทึกจริง*
*Added: 5 User Roles (Director/AreaMgr/Manager/Admin/Teacher) + Permission Matrix*
*Added: Centralized DB Architecture + Branch Filter rules*
*Added: Leave Quota formula (hours ÷ 8), Reschedule Flow, Transfer Flow*
*Added: Calendar-first Class Template creation, Class vs Session distinction*
*Added: Summary per-student rule, Trial auto-notify flow*
*Revised 20 May 2026: Course = Marketing unit (single/multi-subject), Teacher Grade Range,*
*Branch Setup 7 Steps, Calendar per Day-of-Week template, Holiday Management (Director only),*
*Teacher cross-branch conflict rule, Student assignment suggestion algorithm*
*Revised 20 May 2026: CRM Lead stages updated (test_scheduled/tested/trial_scheduled/trialed),*
*added CRM Form System (3 form types, unique link, stepper, dual notification, Approve/Edit)*
*Revised 27 May 2026: Staff model updated — added nick, subjects[], grades[] fields (multi-select)*
*Revised 27 May 2026: Settings full UX redesign — left-nav sidebar + stShowSection() router,*
*Scheduling 3 sub-tabs (Op Hours day-editor / Special / Holidays), Grades grouped level cards*
*Revised 27 May 2026: Invoice Flow rules added to Billing section (draft→paid, auto-draft, receipt)*
*Revised 29 May 2026: Admin Master/Normal sub-tier + Digital Signature for Invoice/Receipt*
*Revised 29 May 2026: Bundle Course model — fixed schedule, block billing (4 class days/block),*
*  admission fee, no reschedule, lesson flow follows class not student*
*Revised 29 May 2026: Class Type tag (group/single), Course End Summary workflow + PDF*
*Revised 29 May 2026: Healthy Status = effectiveLoad formula (Σ students/class/week, thresholds 20/30)*
