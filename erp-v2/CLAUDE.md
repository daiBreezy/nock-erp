@AGENTS.md

# NockERP v2 — Prototype (สร้างใหม่จากผลเทส Staging)

> อ่านไฟล์นี้ก่อนทำงานใน `erp-v2/` · ภาษาสื่อสาร: ไทย
> ที่มา: ผลเทส Staging ของ Dev → `../new-erp/NockERP-Staging-Test-2026-09-24.xlsx` (รหัส BL-x, A1, C2 … ในโค้ดอ้างถึงไฟล์นี้)
> แผนเดิม: `../new-erp/REBUILD-PLAN.md` · Prototype เก่า (HTML) ยังอยู่ที่ `../new-erp/` ไม่ได้ใช้แล้วสำหรับงานนี้

## บทบาทของโปรเจกต์ (ตัดสินใจ 2026-09-24)
**erp-v2 = "แบบ" ให้ Dev ทำตาม ไม่ใช่ระบบจริง** → ไม่ต่อ Database / ไม่ทำ Production · ใช้ mock data + localStorage ต่อไป · ระบบจริงเป็นของ Dev (มี DB + Staging แล้ว)

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + **shadcn/ui style **`base-luma`** (เปลี่ยนจาก base-nova 2026-09-24 ตาม ref ของเจ้าของ · ปุ่ม/ช่องกรอกแบบแคปซูล การ์ดเงานุ่ม · radius Medium (0.625rem — เจ้าของเลือก) · สีหลักคงชมพูแดงแบรนด์) — Base UI ไม่ใช่ Radix → ใช้ prop `render` แทน `asChild`** + zustand (persist ลง localStorage) + date-fns + vitest
- ไม่มี backend — mock data สร้างสัมพันธ์กับ "วันนี้" ทุกครั้ง (`src/data/seed.ts`)
- dev: `npm run dev` (หรือ preview config `erp-v2` พอร์ต 3310) · test: `npm test` · lint: `npx eslint src`

## โครงสร้าง (สำคัญ)
```
src/domain/types.ts          ← โมเดลข้อมูลทั้งหมด
src/domain/rules/*.ts        ← ⭐ กฎธุรกิจเป็น pure function (ไม่มี UI) — แก้บั๊กทั้งหมดที่นี่
src/domain/rules/rules.test.ts ← regression test: 1 เคส = 1 บั๊กที่เจอบน Staging
src/store/store.ts           ← action ทุกตัวเรียก rule แล้วคืน Result {ok|error} เสมอ
src/lib/feedback.ts          ← report(result) → toast สำเร็จ/ผิดพลาด (ห้ามมี action เงียบ)
src/components/app/          ← shell, sidebar, demo panel, session sheet, class dialog
src/components/billing/      ← invoice editor / sheet
src/app/<route>/page.tsx     ← หน้าต่างๆ
```

## กติกาเวลาเขียนโค้ด
1. **กฎธุรกิจอยู่ใน `domain/rules` เท่านั้น** แล้ว UI + store เรียกใช้ตัวเดียวกัน (ห้ามคำนวณซ้ำใน component — ต้นเหตุ BL-2/BL-3 บน staging)
2. ทุก action ต้องผ่าน `report()` → มี toast เสมอ
3. สถานะคาบคำนวณจากเวลาเท่านั้น (`sessionState`) — ห้ามเก็บ "Live/Ended" เป็นข้อมูล
4. Select ใช้ `NativeSelect` (ใช้บน iPad/มือถือได้ดี) ไม่ใช้ Base UI Select
5. ข้อความ UI เป็นภาษาไทย · วันที่ใช้ `fmtDate` (มีวันที่เสมอ ไม่โชว์ ISO)
6. เพิ่มกฎใหม่ → เพิ่ม test ใน `rules.test.ts` ด้วย
7. **งาน responsive/มือถือ/แท็บเล็ต → อ่าน `RESPONSIVE.md` ก่อน** — breakpoint 3 ระดับ (base/sm/lg เท่านั้น ห้าม md/xl) · responsive อยู่ใน component กลาง หน้าห้ามเขียน breakpoint เอง · ตรวจด้วย `read_page` ถ่าย screenshot เฉพาะหน้าตัวแทน (ประหยัด credit)

## App ผู้ปกครองบน LINE (`src/components/parent/`) — กฎ UI (เจ้าของสั่ง 2026-11-06)

**กฎเหล็ก: ใช้ component ชุดเดียวกับ ERP — ห้ามเขียน `<button>/<input>/<textarea>` ดิบ + Tailwind เอง**
- ปุ่ม `Button` · ช่องกรอก `Input` / `Textarea` / `Label` · ติ๊ก `Checkbox` (`components/ui/*`)
- ตัวเลขสรุป = `Kpi` (`components/app/kpi.tsx`) · ป้ายสถานะ = `Pill` (`badges.tsx`) สีตาม `tags.ts` (หนึ่งแท็ก = หนึ่งสีทั้งแอป)
- เลือกหนึ่งอย่าง = `Segmented` / `FilterChipGroup layout="scroll"` · ตัวเลือกติ๊ก/สลับ = `Chip` ใน parent-app.tsx (หน้าตาเดียวกับ `ShowChip`: h-9 · ขอบชมพูเมื่อเลือก)
- คำอธิบายยาวๆ = `InfoTip` (ⓘ) ไม่ใช่บรรทัดเทาใต้ช่อง · ห้าม emoji ใช้ lucide icon
- เฉพาะ component ที่ **ไม่แตะ store** เท่านั้น (หน้านี้รันบนมือถือผู้ปกครอง ไม่มีข้อมูลพนักงาน) — เช็ค import ก่อนใช้; ถ้า component กลางจำเป็นแต่แตะ store ให้แยกส่วนที่ไม่แตะ store ออกมาก่อน ไม่ใช่เขียนใหม่

**หลักทำให้สวย อ่านง่าย ไม่รก (สรุปจากที่เจ้าของแก้ ERP มาหลายเดือน)**
1. **หนึ่งหน้า = หนึ่งหน้าที่** — ภาพรวม (ทุกคน/ทุกคอร์ส) แยกจากตารางเรียน (เจาะทีละคน/คอร์ส/คาบ) · แตะที่ภาพรวมเพื่อเจาะลง ไม่ซ้ำข้อมูลสองที่
2. **ลำดับความสำคัญบนลงล่าง**: สิ่งที่ต้องรู้ตอนนี้ (คาบถัดไป) ก่อน → ตัวเลขสรุป (KPI) → รายการ → ประวัติ (พับไว้) · ของที่ผ่านไปแล้ว/ไม่ด่วนซ่อนหลังแท็บหรือแตะกาง
3. **การ์ดเดียวหน้าตาเดียว** — พื้น `bg-card` · `rounded-3xl` · `shadow-sm ring-1 ring-foreground/5` เหมือน `Kpi`; หน้า "ทั้งหมด" กับ "ผ่านไปแล้ว" ใช้แพทเทิร์นการ์ดเดียวกัน (แถวย่อ 1 บรรทัด + ลูกศรกางรายละเอียด)
4. **ข้อมูลรอง (ครู/ห้อง/ลำดับคาบ/รถ) ซ่อนไว้ในการ์ดที่กาง** — แถวย่อเหลือ เวลา(บรรทัดเดียว) · วิชา · ลูกศร; ป้ายสถานะอยู่ท้ายสุดและกว้างพอดีข้อความ
5. **ปุ่มทำการ (แจ้งลา/ขอรถ) ไม่โชว์รอ** — ซ่อนในการ์ด ให้เลือกชิปว่าจะทำอะไรก่อน แล้วค่อยเห็นฟอร์ม; ปุ่มหลักหนึ่งปุ่มต่อพื้นที่ (เต็มความกว้าง `size="lg"`)
6. **สีน้อยแต่มีความหมาย** — พื้นกลาง ขาว/เทา, สีแบรนด์ (ชมพู/ฟ้า Liclass) เฉพาะสิ่งที่กดได้/ที่เลือก, สีเขียว/เหลือง/แดง เฉพาะสถานะ (มา/ลา/ขาด) ผ่าน `Pill` เท่านั้น
7. **ระยะห่างเป็นขั้น**: ระหว่างกลุ่ม `space-y-6` · ระหว่างการ์ด `space-y-2.5`/`gap-2` · ในการ์ด `p-3` · ตัวหนังสือ 14 หลัก / 12 รอง / ไม่เล็กกว่า 11 · ปุ่มกดสูงอย่างน้อย 36px (`h-9`)
8. **เลื่อนแนวตั้งเท่านั้น** (ชิป/แถวเลื่อนข้างได้เฉพาะแถวชิปที่มี fade) · ไม่มีข้อความยาวล้น (`truncate` / `line-clamp`) · ข้อความหลายภาษา (TH/EN/JP) ต้องไม่ดันเลย์เอาต์
9. **ว่างต้องบอก** — ไม่มีข้อมูล = `Empty` ข้อความสั้น 1 บรรทัด ไม่ทิ้งพื้นที่โล่ง
10. **ลำดับตัวอักษร (Hierarchy) + น้อยเส้น** (เจ้าของสั่งซ้ำ 2026-11-06 "เส้นเยอะ ชนกัน ไม่รู้จะ focus อะไร"): ชื่อนักเรียน text-lg > ชื่อคอร์ส text-base semibold > ตัวเลข text-lg + ป้ายเล็กใต้ > ข้อความรอง text-xs muted; แยกกลุ่มด้วยเส้นเดียว (divider ระหว่างนักเรียน) + ระยะห่าง ไม่ใช้กรอบ/การ์ดซ้อนกรอบ; ตัวเลขสรุปเรียง 4 ช่องเท่ากันไม่มีสี/กรอบ; ไม่มีแถบหัวสีฟ้า/คำทักทาย (หัว = ชื่อครอบครัวบรรทัดเดียว); ภาษา/ข้อมูลเสริมอยู่แท็บ "อื่นๆ"
11. **สีตามเวลา**: คาบวันนี้ = แดงอ่อน (`bg-red-50`) · คาบที่ยังไม่ถึง = ขาว · คาบที่ผ่านแล้ว = เทาจาง (`bg-muted/70 text-muted-foreground`)
12. ตรวจด้วย `read_page`/ข้อความก่อน screenshot; เพิ่มข้อความใหม่ต้องมีครบ TH/EN/JP ใน `DICT` ของ parent-app.tsx

## โหมดสาธิต (มุมซ้ายล่าง)
สลับคน/บทบาท (Director นก · Admin พลอย · Manager ต้น · Teacher ครูได/ครูมิ้นท์) · เลื่อนเวลาระบบ ±ชม./วัน (ดูสถานะคาบเปลี่ยน) · รีเซ็ตข้อมูล

## สถานะ (2026-09-24)
✅ เสร็จ: Domain rules + 22 tests · App shell (สิทธิ์ตาม role, สาขา, แจ้งเตือน) · หน้า "วันนี้" · ปฏิทิน 4 มุมมอง + สร้างคลาสจากช่องว่าง · Session sheet (เช็คชื่อ/สรุป/แก้/ยกเลิกคาบ) · Billing ครบวง (ร่าง → PDF → อนุมัติ → ส่ง → รับเงิน → ยืนยัน → ใบเสร็จ + เข้าคลาส)
✅ Calendar รอบ 2 (ตาม ref Figma ของ Admin): Day view แบบบอร์ด คอลัมน์=ครู/ห้อง แถว=ชั่วโมง (ชั่วโมงว่างย่อ) การ์ดโชว์รายชื่อนักเรียน+เกรด+เช็คชื่อ · สีตามวิชา (`subject-color.ts`) · สถานะการ์ด `workState`: รอเริ่ม/กำลังเรียน/รอเช็คชื่อ/รอสรุป/เสร็จแล้ว/ยกเลิก (+ค้าง) · Drag & drop → ถาม "เฉพาะคาบนี้ / คาบนี้และถัดไป" (`moveSession`) · ครูหลายคน + ครูหลัก (`coTeacherIds`) · คาบชนกันซ้อนในช่องเดียวกรอบแดง
✅ รอบ 3: Day board ล็อกหัวครู (sticky top) + คอลัมน์เวลา (sticky left) · โหมด "เฉพาะที่มีคลาส" · Side panel คาบ: เปลี่ยน/เพิ่มครู (เฉพาะคาบนี้/ถัดไป), เพิ่มนักเรียน (ทดลอง/ถาวร), เปิดรายละเอียดนักเรียน (StudentSheet) · สร้างครบทุกหน้า Phase 1 · 32 tests
⬜ ต่อไป: Phase 2 (Dashboard, CRM, Inbox, Reports) · ยืนยัน business rules ที่ตั้งสมมติฐานไว้
✅ Phase 2 (2026-09-25): Dashboard/CRM/Inbox + LINE OA จริง (webhook+push) · ฟอร์ม Test/Trial ผ่าน LIFF — Admin เลือก time slot (ผสม slot ว่างทั่วไป + คลาสจริงที่มีอยู่) ให้ผู้ปกครองเลือก · อนุมัติ = จองคาบจริงผ่าน `validateClass` conflict engine เดียวกับทั้งระบบ (ผูกเข้าคลาสเดิมหรือสร้างคาบใหม่) · รีวิว/แก้ไข/อนุมัติฟอร์มได้ในแชท Inbox โดยตรง (`src/domain/rules/forms.ts`, `src/lib/forms.ts`, `src/components/inbox/*`) · 44 tests
✅ Business rules เฟส 1 (2026-09-26): "ลาพักยาว ไม่หักโควตา" — ช่วงวันที่ระดับนักเรียน (`StudentLeave`, `src/domain/rules/attendance.ts`: `effectiveTo`/`resolveEntitlements`/`activeLeave`/`canSaveLeave`) จัดการจาก `StudentSheet` ได้ทุกหน้า · ยืดวันจบคอร์สอัตโนมัติ (derive ไม่ store — `useEntitlements()` hook) · แจ้งเตือน Manager สาขา+ครูประจำวิชา (`AppNotification.branchId/staffIds` ใหม่) · โชว์จางๆ+ป้ายใน Session Sheet/Calendar · แก้ไขได้เสมอ (re-notify) · 53 tests (WORKLOG มีรายละเอียดเต็ม)

✅ Business rules เฟส 2 (2026-09-28): สิทธิ์ใหม่ — role เพิ่ม `super_admin`/`area_manager` · อนุมัติใบแจ้งหนี้+ยืนยันเงินได้เฉพาะสาขาตัวเอง (`inBranch`/`crossBranch` ใน `permissions.ts` — Area Manager ขึ้นไปข้ามสาขาได้) · ครูสร้าง Invoice ไม่ได้ · ครูเห็นคาบทั้งหมดใน Calendar/รายการคาบ (มีตัวกรอง "เฉพาะคาบของฉัน") แต่คาบคนอื่น = ดูอย่างเดียว · 55 tests
✅ เฟส 3 (2026-09-28): **Force Approve** (ใบแจ้งหนี้/ยืนยันยอดเงิน/สรุปการเรียน — คนทำงานอนุมัติงานตัวเองได้เมื่อใส่เหตุผล, กฎ role/สาขา/สถานะยังบังคับเหมือนเดิม, `canForce*` ใน billing.ts/summaries.ts, UI `components/app/force-approve.tsx`) · **ระบบแจ้งเตือนกลาง** `domain/rules/notifications.ts`: ทุก action สร้างผ่าน `notify()` · ทุกหน้ากรองผ่าน `visibleTo()` · อ่านแล้วแยกรายคน (`readBy`) · ส่งข้อความถึงทีม (ทั้งสาขา/ตาม role/รายคน) ที่หน้าแจ้งเตือน · เลขเอกสาร (2026-11-05): `[INV|RC|CN]-[NAS|LIS]-[รหัสสาขา 2 ตัว]-[yymmdd พ.ศ.]-[running 3 หลัก/วัน/สาขา]` เช่น `INV-LIS-TL-691105-002` (`documentNumber`/`nextInvoiceNumber`, ใบเสร็จ = RC- เลขเดียวกัน) · slot ว่างในฟอร์ม Test/Trial = ทุกชั่วโมงที่สาขาเปิด (`openHourStarts`) · Reports/Tasks = Coming soon · 63 tests
✅ Settings ตาม Staging (2026-09-28): `/settings` = รายชื่อสาขา (เพิ่ม/ปิดสาขา) | System · `/settings/branches/[id]` = 11 แท็บเหมือน Staging (ข้อมูลสาขา/บัญชีธนาคาร/LINE/เวลาเปิด-ปิด/วิชา/ระดับชั้น/แพ็กเกจ&ราคา/ค่าธรรมเนียม/โปรโมชัน/บุคลากร/วันหยุด) แต่ละการ์ดบันทึกเฉพาะช่องของตัวเอง (`useBranchDraft(branch, keys)`) · กฎ `domain/rules/settings.ts` · โมเดลใหม่: `Branch.priceChart/packageDurations/phones/socials/active`, `Fee.kind = bus|entry|mock`, `Promotion.unit/minDuration`, `SystemConfig` (วิชากลาง, Invoice Memo ต่อแบรนด์, preferences, การแจ้งเตือน) · **กฎ: ห้ามตัดช่อง/รวมเมนูที่ Staging มี — เปิด Staging ดูก่อนออกแบบทุกหน้า** · 67 tests

## ตารางแก้บั๊ก (รหัสจากไฟล์เทส → จุดที่แก้)
| รหัส | แก้ที่ |
|---|---|
| A1, A12 | `generateSessions` (8 สัปดาห์ ข้ามวันหยุด / one-off) |
| A3–A7 | `validateClass` + ClassDialog (บอกเหตุผลทีละช่อง, override ต้องใส่เหตุผล, ห้องเต็ม = block) |
| A8, A9 | `applyClassEdit` / `editableByClass` (ไม่แตะคาบที่เริ่มแล้ว/มีเช็คชื่อ/customized) |
| A11 | store `deactivateClass` (ยกเลิกคาบอนาคต) |
| B1 | `sessionFromClass` คัดลอกรายชื่อนักเรียน |
| B3 | `editSingleSession` แก้ record เดิม ไม่สร้างใหม่ |
| B5, B6, C2 | `sessionState` จากเวลา + `canMark` (อนาคตลาได้อย่างเดียว) |
| C1, C3 | Session sheet: คลิกเดียวบันทึก + toast · ปุ่มล้างการเช็คชื่อ |
| C4, F7 | `balance`, `studentStatus` (นิยามเดียวทุกหน้า) |
| D5, D8 | `summaries.canSend` / `canApprove` (ห้ามอนุมัติงานตัวเอง, ส่งหลังอนุมัติ, บอกตรงๆ ถ้าไม่มี LINE) |
| E4–E7 | Calendar: สรุปตามช่วงที่เห็นจริง, Day view มีเลน "ยังไม่มีครู/ยังไม่ระบุห้อง", +N, เริ่มสัปดาห์วันจันทร์ทุกมุมมอง |
| F1 | `removeFromClass` ลบจากคาบอนาคตด้วย |
| F2, F6 | `useLookup().teacher` แสดงชื่อ + "(ออกแล้ว)" ไม่โชว์ UUID |
| F4 | `lowBalanceAlert` เฉพาะแพ็กนับคาบ |
| BL-2/3/4 | `quoteCourse` + `invoiceTotals` ตัวเดียวใช้ทุกหน้า |
| BL-5 | periods ≥ 1 (rule + input) |
| BL-6 | `defaultBusLegs` ติ๊กเฉพาะนักเรียนที่ใช้รถ |
| BL-7 | `canVoid` เหตุผลบังคับ |
| BL-8/9 | `nextInvoiceNumber` ออกเลขตอนสร้าง PDF, ใบเสร็จ prefix RC |
| BL-10 | การ์ด Billing แยกความหมายชัด |
| BL-14, BL-18 | maker–checker ทั้งอนุมัติใบและยืนยันเงิน |
| BL-15/16 | สถานะ "ไม่ถึงผู้ปกครอง" · ส่งต้องมีข้อความ |
| BL-19 | สิทธิ์เรียนครอบคลุมเฉพาะช่วงที่จ่าย |
| G1–G4 | `permissions.ts` ซ่อนเมนู + บล็อก action ใน store |

## มาตรฐานฟอร์ม (เจ้าของสั่ง 2026-11-09) — ทุกฟอร์มผู้ปกครอง (`/liff/form` · `/liff/exit` · `/liff/survey` · `/liff/custom`) + แผงแอดมิน
- หน้า: `max-w-lg` · **`bg-background` (พื้นขาว)** · `p-4` · `space-y-4`; หัวหน้า `text-xl font-semibold`; หัวแบรนด์ `text-lg font-semibold` + สาขา `text-xs muted`
- **ไม่ใช้การ์ดซ้อนกรอบ** (เปลืองที่) — แต่ละกลุ่ม/หัวข้อแบ่งด้วย **เส้น divider** (`border-t pt-4`, ตัวแรกไม่มีเส้น `first:border-t-0 first:pt-0`) + `space-y-3` ในกลุ่ม; กรอบ/วงแดงเฉพาะกลุ่มที่ยังตอบไม่ครบ
- หัวข้อกลุ่ม `text-sm font-semibold` + คำอธิบาย `text-xs muted`; ป้ายช่อง `text-xs`; คำถามยาว (survey/custom/exit) `text-sm font-semibold`; ตัวเลือก/ชิป `text-sm` (สูง ≥ `min-h-11` บนมือถือ)
- **ช่องกรอก 1 ช่อง = 1 บรรทัด** ไม่ใช้ `grid-cols-2` กับ input (จังหวัด / รหัสไปรษณีย์ แยกบรรทัด); กลุ่มช่องอยู่ใต้หัวข้อกลุ่ม (ชื่อ · ข้อมูลทั่วไป · ติดต่อ · ที่อยู่ …) — ช่องฟอร์มกลางอยู่ที่ `components/people/person-fields.tsx` (`Group` + `F`)
