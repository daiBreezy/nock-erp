# DESIGN-SYSTEM — แผนไล่เก็บ guard rails (รอบ 6+)

> Design System วางรากครบแล้ว 5 รอบ (tokens · brand theme · shared components · ListPage · eslint guard rails · ThemeSettings)
> **รอบนี้ = ไล่โค้ดเก่าให้เข้า DS จริง** จนกฎ eslint ทุกข้อเหลือ 0 แล้วเลื่อนจาก `warn` → `error` (ล็อกถาวร)
> วิธีดูเลขสด: `npx eslint src` · ไฟล์นี้อัปเดตทุกครั้งที่ปิดรอบย่อย

## ภาพรวม — มี **4 เรื่อง** รวม **~1,097 จุด** (ทำครบทั้ง 4 เรื่อง (1,096 จุด) → ทุกกฎเป็น `error` แล้ว)

| เรื่อง | กฎ eslint | จุดทั้งหมด | เหลือ | สถานะ |
|---|---|---:|---:|---|
| 1. สีสถานะ → token | no-hardcoded-status-color | 694 | **0** | ✅ ครบ 2026-11-11 (กฎยังเป็น `warn` — ดูหมายเหตุท้ายเรื่องที่ 1) |
| 2. controls ดิบ → Button/Input/NativeSelect | no-raw-controls | 329 | **0** | ✅ ครบ 2026-11-11 (รอบ 9a–9c) |
| 3. px → text token / spacing scale | no-px-text | 44 | **0** | ✅ ครบ 2026-11-11 |
| 4. breakpoint `md:`/`xl:` → base/sm/lg | no-adhoc-breakpoints | 29 | **0** | ✅ ครบ 2026-11-11 (md→sm · xl→lg) |

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
| 6.3 | ปฏิทิน | week-teacher-board (25), calendar/page (12), summary-panel (10), class-card (9), move/blocks/meta | 63 | ✅ เสร็จ |
| 6.4 | คาบ / เช็คชื่อ / สรุป | session-sheet (30), work-state, class-dialog, summaries, force-approve, period-banner | 68 | ✅ เสร็จ |
| 6.5 | Reports | reports/page (66), summary-tab, charts, attention-dialog | 82 | ✅ เสร็จ |
| 6.6 | รถรับส่ง / คนขับ | driver-app (32), labels (18), trip-row (13), zone-analysis, zone-map, trip-sheet | 79 | ✅ เสร็จ |
| 6.7 | CRM / นักเรียน / บุคลากร | staff-panel (18), lead-sheet (10), student-exit, renewal-followup, lead-followups, survey-calls, student-sheet + ปลีกย่อย | 97 | ✅ เสร็จ |
| 6.8 | ผู้ปกครอง / LIFF ฟอร์ม | parent-app (17), liff/form (13), liff/exit (11), liff/survey (9), catalog, form-renderer, form-builder, person-fields, parent-requests | 76 | ✅ เสร็จ |
| 6.9 | ตั้งค่า / Nock / Inbox / แอปเชลล์ + เก็บตก | holiday-planner (16), nock/page (14), nock-widget, app-shell, ai, confirmation, day/week-sessions + ไฟล์ปลีกย่อย | 107 | ✅ เสร็จ |

**ล็อกครบแล้ว (2026-11-11):** `no-restricted-syntax` (สีสถานะ · px · breakpoint · search icon) และ `react/forbid-elements` (controls ดิบ) เป็น **`error`** ถาวร · eslint ทั้ง src = 0 warning — เช็ค `npx eslint src` ก่อน commit
**ข้อที่ใช้ token `info` แทน AI_TONE (เพราะสีเดียวกัน = sky):** กล่องคำตอบ Nock (`nock/page`, `nock-widget`), การ์ดตัวอย่าง AI ใน `theme-tuner` — ถ้าวันหนึ่ง AI เปลี่ยนสีให้ย้าย 3 จุดนี้ไป `AI_TONE`
**"วันนี้" ในปฏิทินสัปดาห์** (`week-sessions`) ใช้ token `today-soft` ที่รอบ 1 เตรียมไว้

---

## เรื่องที่ 2 — controls ดิบ → Button / Input / Textarea / NativeSelect (329)

**รอบ 9a/9b (2026-11-11):** ไฟล์ละ 1–3 จุดทำแล้ว (~100 จุด) · `Button` มี variant ใหม่ `chip` (ชิปเลือกได้ — เลือกผ่าน `aria-pressed`/`aria-checked`) · `row` (ปุ่มทั้งแถว/การ์ดตัวเลือก ชิดซ้าย) · size `inline` (ไม่บังคับสูง/padding) · ปุ่มตกแต่งเองที่ไม่เข้า chip/row ใช้ `ghost`+`inline` คง className เดิม — ถ้าจะรวมให้เป็นหน้าตาเดียวค่อยไล่ทีหลัง · ⚠ ชิปที่เคยเลือกแล้วพื้นทึบ (liff/exit, notifications, seat-hours, bundle, issue-receipt) เปลี่ยนเป็นพื้นอ่อน `bg-primary/10` ตามมาตรฐานเดียว · `<select>` ใน `inline-edit` คงดิบ = ds-exception (ต้องใช้ native picker)

แทน `<button>/<input>/<textarea>/<select>` ดิบ + Tailwind ด้วย component กลาง (ได้ focus/ปุ่ม/ช่องกรอกเหมือนกันทั้งแอป)
ไฟล์หนาสุด: session-sheet (25), reports (17), parent-app (15), nock-widget (12), week-teacher-board (11), class-dialog (8), student-sheet (8), invoice-editor (8), driver-app (8)
→ แบ่งรอบย่อยตามพื้นที่เหมือนเรื่องที่ 1 (แตกละเอียดตอนเริ่มทำ)

> หมายเหตุ: หลายไฟล์ซ้ำกับเรื่องที่ 1 (session-sheet, invoice-editor, reports, parent-app, driver-app) — ถ้าอยากรีวิว "ทีละหน้าจนจบ" แทนที่จะ "ทีละเรื่อง" บอกได้ จะสลับไปทำครบทุกกฎในไฟล์เดียวต่อรอบ

## เรื่องที่ 3 — px → text token (44) ✅ เสร็จ

ส่วนใหญ่เป็นขนาด layout/radius ไม่ใช่ตัวอักษร → แปลงเป็น spacing scale (n×4px เช่น `min-w-190`) · `rounded-lg/xl/2xl/3xl` (ผูก --radius) · `text-xl/2xl`

`text-[13px]` ฯลฯ → `text-2xs` / `text-xs` / `text-sm` + spacing scale
หนาสุด: parent-app (21) · ที่เหลือกระจาย 1–3 จุดต่อไฟล์ → จบได้ใน 1–2 รอบ

## เรื่องที่ 4 — breakpoint `md:`/`xl:` → base/sm/lg (29) ✅ เสร็จ

md→sm · xl→lg · max-md→max-sm · ⚠ reports/page ที่ xl→lg อาจแน่นที่ 1024px — ถ้าเห็นให้ปรับคอลัมน์

เหลือ 3 ระดับตาม RESPONSIVE.md
หนาสุด: reports/page (21) · ที่เหลือ app-shell, inbox, form-builder, branch-basic → จบได้ใน 1 รอบ

---

**รอบ 9c (2026-11-11):** ไฟล์หนาที่เหลือแปลงหมด · checkbox → `Checkbox` · color/range/time/file → `Input` · textarea → `Textarea` · select → `NativeSelect` · เก็บ warning ที่ไม่ใช่ DS ด้วย (unused imports, deps ของ useMemo) · ⚠ ปุ่มตกแต่งเอง ~190 จุดเป็น `ghost`+`inline` คง className เดิม — เปิดดูหน้าจอแล้วค่อยรวมเป็น chip/row เพิ่ม

## ข้อยกเว้นที่ตั้งใจ (ds-exception — ไม่ใช่สถานะ)

- **ข้อยกเว้นเชิงเทคนิค:** `inline-edit` `<select>` (native picker) · `native-select.tsx` import `ui/select` (ตัว wrapper เอง) · `transport/labels.tsx` `<img>` รูปคนขับเป็น data URL
- **สีประจำวันของไทย** (`week-teacher-board.tsx` `DAY_TONE`: อา.แดง จ.เหลือง อ.ชมพู พ.เขียว พฤ.ส้ม ศ.ฟ้า ส.ม่วง) — เป็นจานสี identity ไม่ใช่ success/danger → ครอบด้วย `/* eslint-disable … ds-exception */` คงสีเดิมไว้ (รอบ 6.3)
- **ไอคอนหัวใจวิชาโปรด** (`form-app.tsx`) — เก็บ `fill-red-500` (fill ไม่โดนกฎ หัวใจคงแดงเสมอ) · ส่วน `text-*` ใช้ danger · สเกลหน้า NPS/ความพอใจ (แดง/ส้ม/เขียว) map danger/·/success, ส้มกลางสเกลคงไว้ (รอบ 6.8)
- **แท็กสายรถ P/D/B** (`student-sheet.tsx` `BUS_TAG`: รับ ฟ้า · ส่ง ม่วง · ทั้งคู่ เขียว) — identity ของประเภทรับส่ง ไม่ใช่สถานะ → ds-exception (รอบ 6.7)
- **ป้ายรับ/ส่ง ฝั่งรถ** (`transport/labels.tsx` LegTag, `trip-sheet.tsx`, `driver-app.tsx` tile P/D/P+D) — ตระกูลเดียวกับ BUS_TAG → ds-exception (รอบ 6.6) · ⚠ ปัจจุบัน "ส่ง" เป็น**ม่วง**ใน student-sheet แต่**เหลือง**ฝั่งรถ — ควรรวมเป็นสีเดียวใน tags.ts
- **สีประจำคัน** (`labels.tsx` `VAN_TONES`) · **สีโซนรับส่ง** (`zone-map.tsx` `ZONE_DOT`) · **สีต่อ bundle พี่น้อง** (`billing/page.tsx` `BUNDLE_TONES`) — identity cycle → ds-exception (รอบ 6.6 / 6.9)
- **สีแบรนด์ที่วันหยุดปิด** (`holiday-planner.tsx` `SCOPE_TEXT/BG/BAR` + legend = tag `holidayBrand` na ฟ้า · li ม่วง · both ชมพู) → ds-exception (รอบ 6.9)
- **AI_TONE ทั้งไฟล์** (`components/app/ai.tsx`) — AI = ฟ้า ตามกฎเจ้าของ เป็น identity palette → ds-exception ระดับไฟล์ (รอบ 6.9)

## ค้างให้เจ้าของตัดสิน

- **การ์ดเลือกย้ายคาบ (session-sheet 6.4):** เดิมพื้น `rose` (ชมพู hardcode) → เปลี่ยนเป็น `bg-primary/5` + `ring-primary` ตามคอนเวนชัน "ตัวเลือกที่เลือก" ของแอป → ตามสีแบรนด์ (NA ชมพู / Liclass ฟ้า) ไม่ fix ชมพูตายตัว
- **สีวันหยุดบริษัท:** calendar ใช้เหลือง (warning) · start-date-picker เดิมใช้ rose → รอบ 6.7 ทำเป็น danger (คงโทนแดง) · ยังไม่ตรงกันทั้งแอป — ควรเลือกสีเดียว
- **สีลา (attendance.leave):** `tags.ts` กำหนด `sky` (ฟ้า) แต่ทุกหน้าจริงใช้ **เหลือง** มาตลอด → รอบ 6.1 คงเหลือง (`warning`) ไว้ ไม่แอบเปลี่ยน · ถ้าจะให้ตรง tags.ts ต้องเปลี่ยนเป็นฟ้าทั้งแอป
