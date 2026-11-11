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

## รอบ 10 — ผลสำรวจ (2026-11-11) — ยังไม่แก้โค้ด

**หลักการ (เจ้าของยืนยัน):** ทุกหน้าต้องเรียก component กลางจาก DS เพื่อให้แก้ที่ DS ที่เดียวแล้วทั้งแอปเปลี่ยนตาม — ไม่เขียนสี/ปุ่ม/ระยะห่างเองในหน้า

### B. สีนอกชุดสถานะ — ~295 จุด

| กลุ่ม | จุด | ไฟล์หลัก | แนวทาง |
|---|---:|---|---|
| **มีที่รวมศูนย์แล้ว (ปล่อย)** | ~100 | `subject-color.ts` (71) · `tags.ts` (28) | เป็นจานสี identity ที่ตั้งใจ |
| **identity ที่ตั้ง `ds-exception` แล้ว** | ~65 | `week-teacher-board` DAY_TONE (33) · `holiday-planner` (12) · `transport/labels` VAN_TONES (9) · `billing/page` BUNDLE_TONES · `zone-map` | คงไว้ — รอบ 16 ทบทวนว่าย้ายเข้า `tags.ts` ได้ไหม |
| **กระดาษพิมพ์/กรอบเครื่อง (ปล่อย)** | ~25 | `print-document` · `print/bundle` · `preview-layout` (กรอบมือถือ) · `doc-thumbs` | พื้นขาว/เทากลาง ไม่ผูกธีม |
| **หลุดมาเอง ต้องแปลงเป็น token** | ~100 | ดูหัวข้อถัดไป | รอบ 12 |

**ข้อสังเกตสำคัญ:** `violet` ถูกใช้เป็น "สีที่ห้าไม่เป็นทางการ" ในความหมายเดียวกันหลายที่ — **เครดิต/ส่วนลด** (`invoice-editor` · `invoice-sheet` · `credit-notes`) · **โน้ต/ประเมิน** (`noti` note · `assessment-note` · `blocks-dialog`) · **คาบพิเศษ/สอบวัดระดับ** (`session-meta` test · `session-sheet` partial · `class-card` ลาพักยาว) · **รอดำเนินการ/รอยืนยัน** (`summaries` draft · `notifications` pay · `reports` part-time · `kpi`) · **ตัวเลือกที่เลือกในตัวเลือกลูกค้า** (`customer-picker` — ควรเป็น `primary` ตามกฎ "ตัวเลือกที่เลือก")
→ เสนอ: เพิ่ม semantic token `special-soft/-ink` (ม่วง) ใน `globals.css` แล้วย้ายความหมายพวกนี้เข้า token เดียว

อีกกลุ่ม: `work-state` · `badges` (super_admin) ใช้ `slate` = สถานะกลาง/ยกเลิก → ควรเป็น `muted`/token เป็นกลาง · `dev-tickets-view` ฟ้า/teal = ฝั่ง Dev/ฝั่งเรา · `send-form-dialog` ม่วง = "คลาสจริง" vs slot ว่าง (identity)

### E. หน้าที่ใช้ layout กลาง (นับคร่าวๆ จากโค้ด)

| กลุ่ม | หน้า | สถานะ |
|---|---|---|
| ใช้ `ListPage` | students · classes · courses · families · staff · crm | ✅ |
| ใช้ `Page`/`PageHeader`/`KpiRow` | attendance · sessions · summaries · transport · reports · nock · notifications · dashboard · settings | ✅ ต้องไล่ดู KPI/toolbar/empty ว่าตรงมาตรฐาน |
| ใช้ `PageHeader` แต่ไม่ใช้ `Page` | billing · calendar | 🟡 เช็คว่าตรงมาตรฐานไหม |
| layout เฉพาะ (ตั้งใจ) | inbox (แชท) · calendar (บอร์ด) · `/liff/*` (ฟอร์มผู้ปกครอง ใช้ "มาตรฐานฟอร์ม" ใน CLAUDE.md) · print | ตรวจกับมาตรฐานของตัวเอง |
| ว่าง (Coming soon) | logs · tasks | ไม่ต้องทำ |
| `Empty` ใช้จริง | reports (18) · settings/forms (2) — หน้าอื่น 0 | 🟡 หลายหน้าแสดงว่างด้วยข้อความเอง |

### เจ้าของตัดสินแล้ว / ยังรอ
1. ✅ **เพิ่ม token `special` (ม่วง) — ตัดสินแล้ว 2026-11-11 (รอบ 11)** ดูหัวข้อ "รอบ 11" ด้านล่าง
2. **สีบทบาทพนักงาน** (`tags.ts` `role`): admin amber · driver lime · director rose ใกล้สีระบบ — เลือกสีใหม่
3. **`customer-picker` เลือกแล้วเป็นม่วง** → เปลี่ยนเป็น primary (ตามกฎ "ตัวเลือกที่เลือก") โอเคไหม

## รอบ 12 — Pill/KPI ผูก token สถานะ + กฎ no-raw-palette (2026-11-11)

- `HUE.red/amber/emerald.chip` (tags.ts → `Pill` + แท็กทั้งหมด) และ `KPI_TONE` (red/amber/emerald/sky) **ดึงจาก token** `danger-/warning-/success-/info-soft/-ink` แล้ว → แก้สีสถานะที่ `globals.css` ที่เดียว ป้ายและ KPI ตามทั้งแอป (ส่วน `hex` ของกราฟยังเป็นสีตรง — ค้างไว้)
- **สีบทบาทพนักงาน (ผมเลือกเอง ตามกฎ "ไม่ชน system colour"):** super_admin เทาเข้มทึบ · director ชมพู · area_manager คราม · manager ม่วง · admin teal · teacher ฟ้า · developer เทา · driver slate (เดิม admin amber / driver lime / director rose / area_manager orange)
- **`customer-picker`:** ตัวเลือกที่เลือก = สีหลัก (primary) ตามกฎ "ตัวเลือกที่เลือก" (เดิมม่วง) · ชิปประเภทลูกค้าใช้ `Button variant="chip"`
- **กฎ eslint ใหม่ `no-raw-palette`** (ใน `no-restricted-syntax` = `error`): ห้าม violet/indigo/purple/pink/orange/lime/teal/cyan/fuchsia/neutral/slate/gray/zinc/stone แบบดิบใน `app/**/*.tsx` + `components/**/*.tsx` — ใช้ token (`primary`/`special`/`muted`/สถานะ) หรือแท็กใน `tags.ts` · identity จริงต้อง `ds-exception`
- แปลง: slate/zinc → `muted` (work-state · session-meta · week-teacher-board · zone dots · reports) · ช่วงพิเศษ/นาฬิกา → `special` · ฝั่ง Dev ใน tickets → `info` · ดาวกลางสเกล → `warning` · อวาตาร์คนขับ → `muted`
- **ds-exception เพิ่ม:** กระดาษพิมพ์ (`print-document`, `print/bundle`) · กรอบมือถือ (`preview-layout`) · `doc-thumbs` · `noti` (ชนิดแจ้งเตือน) · `start-date-picker` (วันที่ผ่านไปแล้ว = ส้ม ตามเจ้าของ 2026-11-09) · ไอคอนผู้ปกครองของคนขับ · สัญลักษณ์วันหยุดแบรนด์
- **ไม่ถูกตรวจ:** ไฟล์ `.ts` (`tags.ts` · `subject-color.ts` · `transport/zone-map` ฯลฯ — เป็นจานสี identity ตั้งใจ) และ `components/ui/**`

## รอบ 11 — token `special` (2026-11-11)

- `globals.css`: `--special` / `--special-soft` / `--special-ink` (ม่วง) + `bg-/text-/border-special…` ใน `@theme` · light `#ede9fe`/`#5b21b6` · dark `#2e1065`/`#ddd6fe` (ตรวจ computed style ทั้งสองธีมแล้ว)
- ความหมาย = **เครดิต/ส่วนลด · โน้ต/ประเมิน · คาบพิเศษ/สอบวัดระดับ/ลาพักยาว · รอดำเนินการ/รอยืนยัน · Bundle/แพ็กพิเศษ · ถึงแล้ว (คนขับ)**
- ย้ายเข้า token แล้ว: `Pill`/`Kpi` tone `violet` → **`special`** (เปลี่ยนชื่อที่ผู้เรียก 22 ไฟล์) · noti (โน้ต) · assessment-note · blocks-dialog · session-meta · session-sheet · class-card · invoice-editor/sheet · credit-notes · summaries · notifications · reports · dev-tickets · driver-app/labels (ถึงแล้ว) · ป้ายผู้ปกครองนั่งไปด้วยใน parent-requests → `busLeg.adult`
- **ยังคง violet ตั้งใจ (identity):** `tags.ts` · `subject-color.ts` · `week-teacher-board` DAY_TONE · `holiday-planner` · `labels` VAN_TONES · `billing/page` BUNDLE_TONES · `zone-map` · `send-form-dialog` (คลาสจริง) · `customer-picker` (รอเจ้าของตัดสินข้อ 3)
- **ยังไม่ขยายกฎ eslint** (จะทำรอบ 12 พร้อม palette อื่น เพราะต้องใส่ `ds-exception` ให้กลุ่ม identity ก่อน)

### ข้อค้นพบใหม่ (ยังไม่แก้)
`Pill` / `KPI_TONE` / `HUE.*.chip` สำหรับ **แดง/เหลือง/เขียว/ฟ้า ยังใช้สี Tailwind ตรงๆ** (`bg-red-100 text-red-800` …) ไม่ได้ดึงจาก token `danger-soft` / `warning-soft` / `success-soft` / `info-soft` — ต่างจาก `special` ที่ผูก token แล้ว ผลคือถ้าแก้สีสถานะใน `globals.css` ป้าย Pill และ KPI จะไม่เปลี่ยนตาม → ควรให้ `Pill`/`KPI_TONE` derive จาก token (รอบ 12)

## เจ้าของตัดสินแล้ว (2026-11-11) — ปิดข้อ F ทั้ง 3

- **F1 สีวันหยุดบริษัท = เหลือง (`warning`) ทั้งแอป** — `start-date-picker` เปลี่ยนจากแดงเป็นเหลือง ตรงกับปฏิทิน
- **F2 สีลา = เหลือง (`warning`)** — "ลา" เป็น negative แบบ warning · `tags.ts` `attendance.leave` เปลี่ยนจาก `sky` เป็น `amber` (หน้าจริงใช้เหลืองอยู่แล้ว)
- **F3 ป้ายรับ/ส่งรถ = ห้ามชน system colour (แดง/เหลือง/เขียว)** — ใหม่: tag family `busLeg` ใน `tags.ts`: รับ=ฟ้า (sky) · ส่ง=ม่วง (violet) · ทั้งคู่=เทาเข้ม (slate) · ผู้ปกครองนั่งไปด้วย=teal · ใช้ร่วมกันที่ student-sheet, transport/labels, trip-sheet, driver-app (ตัด ds-exception ของ BUS_TAG/LegTag ออกหมดแล้ว) · เหตุที่ตัด "เขียว" ของ ทั้งคู่: ชน success
- **ผลข้างเคียง:** ป้ายวันหยุด "ทั้งสองแบรนด์" (`holidayBrand.both`) จากกุหลาบ (ใกล้แดง) → คราม (indigo)

## ยังต้องทบทวน (พบตอนทำ F3 — ยังไม่ได้แก้)

`tags.ts` `role` ใช้สีที่ใกล้ system colour: `admin`=amber (ใกล้เหลือง) · `driver`=lime (ใกล้เขียว) · `director`=rose (ใกล้แดง) · `area_manager`=orange — ถ้าจะใช้กฎ "ไม่ชน system colour" กับป้ายบทบาทด้วย ต้องให้เจ้าของเลือกสีใหม่
