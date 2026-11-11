# DESIGN-SYSTEM — แผนไล่เก็บ guard rails (รอบ 6+)

> Design System วางรากครบแล้ว 5 รอบ (tokens · brand theme · shared components · ListPage · eslint guard rails · ThemeSettings)
> **รอบนี้ = ไล่โค้ดเก่าให้เข้า DS จริง** จนกฎ eslint ทุกข้อเหลือ 0 แล้วเลื่อนจาก `warn` → `error` (ล็อกถาวร)
> วิธีดูเลขสด: `npx eslint src` · ไฟล์นี้อัปเดตทุกครั้งที่ปิดรอบย่อย

## ภาพรวม — มี **4 เรื่อง** รวม **~1,097 จุด** (ทำไปแล้ว 61 · เหลือ 1,036)

| เรื่อง | กฎ eslint | จุดทั้งหมด | เหลือ | สถานะ |
|---|---|---:|---:|---|
| 1. สีสถานะ → token | no-hardcoded-status-color | 694 | **572** | 🟡 กำลังทำ (ทำไป 122) |
| 2. controls ดิบ → Button/Input/NativeSelect | no-raw-controls | 329 | 329 | ⬜ ยังไม่เริ่ม |
| 3. px → text token / spacing scale | no-px-text | 44 | 44 | ⬜ ยังไม่เริ่ม |
| 4. breakpoint `md:`/`xl:` → base/sm/lg | no-adhoc-breakpoints | 29 | 29 | ⬜ ยังไม่เริ่ม |

> ทำ **เรื่องละรอบ ไล่ตามลำดับ** (สีสถานะก่อน เพราะเห็นผลชัดสุด) · เรื่องใหญ่แบ่งเป็นรอบย่อยตาม "พื้นที่ของแอป" รอบละ ~60–80 จุด จะได้รีวิวทีละหน้าจอทัน

---

## เรื่องที่ 1 — สีสถานะ → token (เหลือ 633)

**กลไก:** สีสถานะมาจาก token กลางที่ `globals.css` ที่เดียว — แก้ทีเดียวเปลี่ยนทั้งแอป
- map: `emerald→success` · `amber→warning` · `red/rose→danger` · `sky→info` (indigo/violet/primary = ไม่ใช่สถานะ คงไว้)
- ป้าย/ชิป → `bg-{t}-soft text-{t}-ink` (dark-aware เอง ตัด `dark:` ทิ้ง) · แถบ/จุด/ไอคอนทึบ → `bg-{t}` · ตัวเลข/ไอคอนบนพื้นขาว → `text-{t}`

| รอบ | พื้นที่ | ไฟล์หลัก | จุด | สถานะ |
|---|---|---|---:|---|
| 6.1 | Dashboard + เข้าเรียน + แจ้งเตือน | attendance, course-progress, noti, notifications, work-boxes, stat-card | 61 | ✅ เสร็จ (86e9496) |
| 6.2 | ใบแจ้งหนี้ / ใบเสร็จ | invoice-editor (34), invoice-sheet (12), renewal-drafts, bundle, course-picker, credit-notes, sales-tax | 61 | ✅ เสร็จ |
| 6.3 | ปฏิทิน | week-teacher-board (25), calendar/page (12), summary-panel (10), class-card (9), move/blocks/meta | ~63 | ⬜ |
| 6.4 | คาบ / เช็คชื่อ / สรุป | session-sheet (30), work-state, class-dialog, summaries, force-approve, period-banner | ~68 | ⬜ |
| 6.5 | Reports | reports/page (66), summary-tab, charts, attention-dialog | ~82 | ⬜ |
| 6.6 | รถรับส่ง / คนขับ | driver-app (32), labels (18), trip-row (13), zone-analysis, zone-map, trip-sheet | ~79 | ⬜ |
| 6.7 | CRM / นักเรียน / บุคลากร | staff-panel (18), lead-sheet (10), student-exit, renewal-followup, lead-followups, survey-calls, student-sheet | ~80 | ⬜ |
| 6.8 | ผู้ปกครอง / LIFF ฟอร์ม | parent-app (17), liff/form (13), liff/exit (11), liff/survey (9), form-renderer, form-builder, person-fields | ~76 | ⬜ |
| 6.9 | ตั้งค่า / Nock / Inbox / แอปเชลล์ + เก็บตก | holiday-planner (16), nock/page (14), nock-widget, app-shell, ai, confirmation, day/week-sessions + ไฟล์ปลีกย่อย | ~124 | ⬜ |

---

## เรื่องที่ 2 — controls ดิบ → Button / Input / Textarea / NativeSelect (329)

แทน `<button>/<input>/<textarea>/<select>` ดิบ + Tailwind ด้วย component กลาง (ได้ focus/ปุ่ม/ช่องกรอกเหมือนกันทั้งแอป)
ไฟล์หนาสุด: session-sheet (25), reports (17), parent-app (15), nock-widget (12), week-teacher-board (11), class-dialog (8), student-sheet (8), invoice-editor (8), driver-app (8)
→ แบ่งรอบย่อยตามพื้นที่เหมือนเรื่องที่ 1 (แตกละเอียดตอนเริ่มทำ)

> หมายเหตุ: หลายไฟล์ซ้ำกับเรื่องที่ 1 (session-sheet, invoice-editor, reports, parent-app, driver-app) — ถ้าอยากรีวิว "ทีละหน้าจนจบ" แทนที่จะ "ทีละเรื่อง" บอกได้ จะสลับไปทำครบทุกกฎในไฟล์เดียวต่อรอบ

## เรื่องที่ 3 — px → text token (44)

`text-[13px]` ฯลฯ → `text-2xs` / `text-xs` / `text-sm` + spacing scale
หนาสุด: parent-app (21) · ที่เหลือกระจาย 1–3 จุดต่อไฟล์ → จบได้ใน 1–2 รอบ

## เรื่องที่ 4 — breakpoint `md:`/`xl:` → base/sm/lg (29)

เหลือ 3 ระดับตาม RESPONSIVE.md
หนาสุด: reports/page (21) · ที่เหลือ app-shell, inbox, form-builder, branch-basic → จบได้ใน 1 รอบ

---

## ค้างให้เจ้าของตัดสิน

- **สีลา (attendance.leave):** `tags.ts` กำหนด `sky` (ฟ้า) แต่ทุกหน้าจริงใช้ **เหลือง** มาตลอด → รอบ 6.1 คงเหลือง (`warning`) ไว้ ไม่แอบเปลี่ยน · ถ้าจะให้ตรง tags.ts ต้องเปลี่ยนเป็นฟ้าทั้งแอป
