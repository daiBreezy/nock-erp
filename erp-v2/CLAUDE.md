@AGENTS.md

# NockERP v2 — Prototype (สร้างใหม่จากผลเทส Staging)

> อ่านไฟล์นี้ก่อนทำงานใน `erp-v2/` · ภาษาสื่อสาร: ไทย
> ที่มา: ผลเทส Staging ของ Dev → `../new-erp/NockERP-Staging-Test-2026-09-24.xlsx` (รหัส BL-x, A1, C2 … ในโค้ดอ้างถึงไฟล์นี้)
> แผนเดิม: `../new-erp/REBUILD-PLAN.md` · Prototype เก่า (HTML) ยังอยู่ที่ `../new-erp/` ไม่ได้ใช้แล้วสำหรับงานนี้

## Stack
Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4 + **shadcn/ui style `base-nova` (Base UI ไม่ใช่ Radix → ใช้ prop `render` แทน `asChild`)** + zustand (persist ลง localStorage) + date-fns + vitest
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

## โหมดสาธิต (มุมซ้ายล่าง)
สลับคน/บทบาท (Director นก · Admin พลอย · Manager ต้น · Teacher ครูได/ครูมิ้นท์) · เลื่อนเวลาระบบ ±ชม./วัน (ดูสถานะคาบเปลี่ยน) · รีเซ็ตข้อมูล

## สถานะ (2026-09-24)
✅ เสร็จ: Domain rules + 22 tests · App shell (สิทธิ์ตาม role, สาขา, แจ้งเตือน) · หน้า "วันนี้" · ปฏิทิน 4 มุมมอง + สร้างคลาสจากช่องว่าง · Session sheet (เช็คชื่อ/สรุป/แก้/ยกเลิกคาบ) · Billing ครบวง (ร่าง → PDF → อนุมัติ → ส่ง → รับเงิน → ยืนยัน → ใบเสร็จ + เข้าคลาส)
✅ Calendar รอบ 2 (ตาม ref Figma ของ Admin): Day view แบบบอร์ด คอลัมน์=ครู/ห้อง แถว=ชั่วโมง (ชั่วโมงว่างย่อ) การ์ดโชว์รายชื่อนักเรียน+เกรด+เช็คชื่อ · สีตามวิชา (`subject-color.ts`) · สถานะการ์ด `workState`: รอเริ่ม/กำลังเรียน/รอเช็คชื่อ/รอสรุป/เสร็จแล้ว/ยกเลิก (+ค้าง) · Drag & drop → ถาม "เฉพาะคาบนี้ / คาบนี้และถัดไป" (`moveSession`) · ครูหลายคน + ครูหลัก (`coTeacherIds`) · คาบชนกันซ้อนในช่องเดียวกรอบแดง
⬜ ต่อไป: คาบเรียน & เช็คชื่อ (list) · สรุปการเรียน (คิว) · คลาส (แก้/ปิด/เอานักเรียนออก) · นักเรียน · ครอบครัว (LINE ระดับครอบครัว) · บุคลากร · คอร์ส&ราคา · รายงานเข้าเรียน · ตั้งค่าสาขา · แจ้งเตือน

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
