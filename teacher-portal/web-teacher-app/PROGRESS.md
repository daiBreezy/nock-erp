# Web Teacher (React) — Handoff / Progress

Real **React + Vite + TypeScript + Tailwind + shadcn/ui** app (rebuilt from the HTML prototype `../prototypes/web-teacher-v3.html`). Runs on this Mac.

## Run
```bash
cd "/Users/nockacademy/Documents/Claude/Projects/Teacher Portal/web-teacher-app"
npm run dev        # http://localhost:5188 (or default 5173)
npm run build      # typecheck + build (must stay green before delivering)
```

## Theme = shadcn preset `b397EAnS4` (Luma / Mist / Indigo / Inter / radius Large)
Tokens live in `src/index.css` (approximation now). To match EXACTLY: get the CSS from shadcn "Get Code" and paste into `src/index.css` (:root + .dark). Checkbox forced square (radius Large made it round). Data-table rows fixed 56px (global CSS).

## Architecture
- `src/data.ts` — static data + seeded gen + **mutable state**: `students`, `R` (results per student/subject/week), `fbTpl` (feedback templates), `sentSet`, `noClassSet` (live-stream), `hwQuestions`/`hwAnswers` (homework bank), `overrides`/`weekOverrides` (special cases) + `effOverride()` merge.
- `src/logic.ts` — pure derived helpers (subjStatus, overallStatus, subjWeekly, pct, ...).
- `src/store.ts` — zustand `useTick`/`useSync()` (module data mutates then `bump()`), all actions (updateStudent, submitFeedback, collectHw, sendReport, setResult, setQuizTotal/setHwTotal, ov* override actions, toggleNoClass...).
- `src/App.tsx` — sidebar (h-screen, only main scrolls) + page switch + mounts `<StudentDrawer/>` `<HomeworkDialog/>`.
- `src/pages/` — Dashboard, StudentList (columns lock/drag/sort/hide + img hover/change + more menu), Summary (Course seg + Week + All/Subject tabs + tables), Feedback (2-col editor + lesson topic), Report (per-subject SVG line charts).
- `src/components/` — StudentDrawer (Info/Preview tabs + A4 report + LINE send sim), report.tsx (A4, applies effOverride), status.tsx (StatusIcon/StatusPill), HomeworkDialog (ข้อ/เฉลย shared/คำตอบ per-student), SpecialCases (weekLevel vs student), CopyText, ui/* (shadcn).

## ✅ Built 7 Sep 2026 — Feedback/Summary restructure (this session)
- **Per-student report side panel** (StudentDrawer ▸ Information tab): เปิดจาก Summary → คลิกนักเรียน. โครงใหม่ = `OverallCard` (กราฟ 2 เส้น Quiz/HW ภาพรวมทุกวิชา + pill Quiz/HW สัปดาห์นี้) → `ParentSummaryBox` (สรุปส่งผู้ปกครอง auto-draft + ปุ่ม "ร่างใหม่", แก้ไขได้, เก็บที่ `parentSummary[idx|cid|wk]`) → SpecialCases → `SubjectReportCard` ต่อวิชา (กราฟเล็ก Quiz/HW + pill + edit rows att/quiz/hw + textarea feedback ใช้ร่วมทุกคน). Preview A4 tab + ส่ง LINE เดิมคงไว้.
- **กราฟ = Radial gauge (recharts)** `src/components/charts.tsx → RadialGauge` — Nock เปลี่ยนจากเส้น (สับสน) เป็น radial: center % + label + delta เทียบสัปดาห์ก่อน · Quiz #2a78d6 / HW #eb6834 · ค่า null = แกนเทา "–". ภาพรวม = 2 gauge · รายวิชา = 2 gauge เล็ก (วิชาไม่มีควิซ = "ไม่มี Live Quiz"). **เพิ่ม dep `recharts`**.
- **Metric** = Quiz% (ถูก/เต็ม) + HW% (คะแนน/เต็ม) เท่านั้น (ไม่รวมเข้าเรียน). ภาพรวม = เฉลี่ยวิชาที่มีข้อมูลในสัปดาห์นั้น. helpers: `studentSubWeekly` / `studentOverallWeekly` / `draftParentSummary` / `parentSummaryText` ใน logic.ts.
- **Feedback template = topic-aware ต่อ(วิชา×สัปดาห์)**: `draftFeedback(sub,wk)` ใน data.ts (อ้าง `topicOf`) — seed `fbTpl` + fallback ของ `fbText` ใช้อันนี้แทน `FB_TEXT` เดิม.
- **Feedback page restructure** (`src/pages/Feedback.tsx`): เขียนขวา / ภาพรวมซ้าย (desktop `lg:grid-cols-[0.85fr_1.15fr]` + `order` classes → มือถือ เขียนบน/ภาพรวมล่าง) · Live Lesson Topic ย้ายเป็นปุ่ม icon "หัวข้อคาบเรียน" → เปิด `<Sheet>` side panel · การ์ดภาพรวมซ้ายคลิกสลับวิชาได้.
- store: `setParentSummary` / `resetParentSummary`. `.claude/launch.json` เพิ่ม (vite dev :5173). build เขียว.

### Revision 2 (same day) — Nock feedback
- **Special cases → icon button + Modal** (`SpecialCases.tsx` รื้อใหม่ = `<Dialog>` grouped-by-subject cards ตาม mockup: date range + การ์ดต่อวิชา collapsible [ขยายเวลา/ไม่มีเรียน/วันชดเชย + Clear] + extra subject "เพิ่มใหม่"/Delete + footer Clear all/เพิ่มวิชา/บันทึก). Trigger บน Summary + badge นับ active.
- **ลบ per-student special cases ทั้งหมด** — `effOverride` = week-level ล้วน (data.ts), เอา SpecialCases ออกจาก StudentDrawer, ตัด `getOverride`/`mergeBool`. store เพิ่ม `ovClearSubject`.
- **ลบ Feedback Template card ออกจาก Summary** (AllView) — เกะกะ.
- **Feedback ▸ หัวข้อคาบเรียน = Sheet โชว์ทุกสัปดาห์**: segment control ราย Subject → list W1–W7 + Lesson Topic + วันที่ (ไฮไลต์สัปดาห์ปัจจุบัน).
- calendar range picker จริง ยังไม่ทำ (date range เป็น text + ไอคอน, prefill = WK_DATE[wk]).

### Revision 4 (9 Sep) — Dashboard (present/actionable) + cross-nav
- **Dashboard รื้อใหม่ course-centric** (`src/pages/Dashboard.tsx`): การ์ดต่อคอร์ส → สัปดาห์ปัจจุบัน + **เหลือกี่วัน (mock: remaining>ครึ่ง=2 วัน, ไม่งั้น 4)** + big picture (Active/Inactive/Churn/Homework) + **วิชาที่ยังไม่เสร็จ** (ปุ่ม Homework col/app, Feedback ยังไม่เตรียม) + ส่งผู้ปกครอง sent/total + **รายชื่อ Inactive คลิกเปิด drawer**.
- **Nav store กลาง** `src/nav.ts` (`useNav`: page + `summaryFocus`) — App.tsx ใช้ page จาก store แทน local state. `focusSummary({course,sub,week,field})` = set page=summary + focus.
- **Cross-nav + แถวกระพริบ**: กดงานค้างบน Dashboard → เด้งไป Summary, `useEffect` set course/week/sub ให้ตรง, โชว์ **FocusBanner** (บอกว่ากำลังไฮไลต์อะไร + ปุ่มเลิกไฮไลต์) + **แถว `.row-blink`** (keyframe ใน index.css: bg ส้มกระพริบ + แถบซ้าย #f59e0b) + scrollIntoView. field=homework→subject tab (แถวที่ยังไม่ collected), feedback→ring รอบ FeedbackEditor, send→All tab (แถวที่ยังไม่ isSent).
- Report **วางไว้ก่อน** ตามที่ Nock สั่ง (เสร็จ rev ก่อนหน้าแล้ว).

### Revision 4b (9 Sep) — Dashboard polish
- **KPI รวมทุกคอร์ส** (แถวบน): คอร์สที่ดูแล (+จำนวนวิชา) · นักเรียนทั้งหมด · Active · **Inactive⌄** · **Churn⌄** (2 อันหลังมี chevron → กดเปิด `StudentListDialog` รายชื่อ → คลิกชื่อ → เปิด drawer). ลบ section รายชื่อ inactive ท้ายการ์ดคอร์สออก (Nock ว่าแปลก).
- **Donut สัดส่วนนักเรียน** (Active/Inactive/Churn จากทั้งหมด) + **ตารางไลฟ์สัปดาห์นี้** (`SCHEDULE` mock วัน/เวลา ใน data.ts → เรียงตาม `DAY_ORDER` · โชว์วิชา/คอร์ส/หัวข้อ/สถานะ Feedback · ยังไม่มี Feedback = ปุ่มแดงกด→focus feedback).
- **กระพริบ 5 ครั้งแล้วหยุด** (`.row-blink` animation iteration 5, แถบซ้ายส้มค้างไว้) + **เอา FocusBanner ออก** · Summary auto-clear focus หลัง 5.5s.

### Revision 4c (9 Sep) — Dashboard course-card polish
- **Inactive/Churn ในการ์ดคอร์ส = คลิกได้ + chevron** → `StudentListDialog` กรองเฉพาะคอร์สนั้น (`onList(kind,cid)` · dialog state = `{kind, cid?}` · cid → studentsIn(cid), ไม่มี cid → ทั้งหมด).
- Section "ยังไม่เสร็จ": **Homework = icon + [x/y]** (เอาคำ "Homework"/"เหลือ N" ออก, มี title tooltip) · **Feedback = icon อย่างเดียว** · เพิ่ม **info "i" + hover** อธิบายความหมาย status (shadcn Tooltip · recharts Tooltip alias เป็น `RTooltip` กันชนชื่อ).
- **เอา progress bar ใต้ "ส่งผู้ปกครองแล้ว" ออก**.
- **Donut card สัดส่วนนักเรียน**: `h-full` + `flex-col justify-center` → donut กลางแนวตั้ง, legend เป็นลิสต์แนวตั้งจัดกลางด้านล่าง (X คน · Y%).

### Revision 4d (9 Sep) — course-card "ยังไม่เสร็จ" fixes
- **แถวชื่อวิชา = ชื่อซ้าย / status ขวา** (`flex justify` · ชื่อ `flex-1 truncate`, status `shrink-0`) — แก้ชื่อวิชายาวโดน truncate (เดิม `w-24`).
- **กด Homework status → `HwMissingDialog`** รายชื่อนักเรียนที่ยังไม่ได้กรอก (studentsIn กรอง `!collected`) → คลิกชื่อ → เปิด **HomeworkDialog** (`openHw`) กรอกได้เลย (เปลี่ยนจากเดิมที่ jump ไป Summary). Feedback icon ยัง jump ไป Summary เหมือนเดิม.

### Revision 7 (11 Sep) — LINE OA linking (ผูกรายชื่อ ↔ LINE ผู้ปกครอง)
- **โมเดล: ผูกที่ระดับ Guardian (ผู้ปกครอง)** ไม่ใช่รายนักเรียน — LINE `userId` เป็นของผู้ปกครอง 1 คน คุมลูกหลายคน. data.ts: `Guardian{lineUserId,lineStatus,linkToken,...}` + `guardians` + `students[].guardianId` (seed พี่น้อง `SIBLING_PAIRS=[[0,1],[7,8],[14,15]]` · 14/15 ข้ามคอร์ส) · helper `guardianOf/siblingsOf/lineStatusOf` · `sentMethod` (line|manual).
- **สถานะ:** 🟢 linked · 🟡 invited · ⚪ none · 🔴 broken (บล็อก/ลบเพื่อน). store: `sendLineInvite/confirmLineLink/unlinkLine/markSentManual` + sendReport บันทึก method=line.
- **`LinkLineDialog`** (`components/LinkLineDialog.tsx` + store `useLinkLine`, mount App) = popup เชิญผูก: guardian+เบอร์+badge · **sibling coverage** "ผูกครั้งเดียวคุมลูกทุกคน (ชื่อ)" · QR mock + ลิงก์ + โค้ด + ปุ่มส่งลิงก์เชิญ + ปุ่ม "จำลอง: ผูกสำเร็จ" (confirmLineLink) · ถ้า linked = โชว์ userId + ยกเลิกการผูก. export `LineStatusBadge`.
- **จุดผูก (ทุกที่ ทุกเวลา):** StudentList คอลัมน์ "LINE OA" (badge กดเปิด dialog) · StudentDrawer footer (badge + "จัดการการผูก") · Dashboard KPI "ผูก LINE แล้ว X/Y" → popup รายชื่อยังไม่ผูก → กดเปิด dialog.
- **Send gate** (StudentDrawer): linked → "ยืนยันส่งผ่าน LINE" (LineChat) · ไม่ผูก → เตือน + "ผูก LINE เลย" + ทางสำรอง **ดาวน์โหลดรายงาน (mock .txt) + ทำเครื่องหมายว่าส่งแล้ว (manual)** — จบที่ sended บันทึก method.
- ⏳ prototype: userId/QR/download จำลอง · จริงต้องต่อ **LINE Messaging API + webhook (Account Link)** ที่ backend · ผูกได้จาก Web Admin ด้วย (นักเรียนชุดเดียวกัน — ยังไม่มี Web Admin จริงในโปรเจกต์นี้).

### Revision 9 (11 Sep) — Report: accuracy → participation (engagement)
- Nock: "% ตอบถูก" คุณค่าต่ำ → เปลี่ยนเป็น **การมีส่วนร่วม** (ทำครบ/ทำไม่ครบ/ไม่ทำ) เพื่อดู engagement รายวิชา (วิชาไหนมีปัญหา/นิยม).
- logic.ts helpers: `subjWeeklyPart` (per วิชา×สัปดาห์: done=ทำครบทุกข้อ · partial=ทำบางส่วน · none=ไม่ทำ · นับเฉพาะคนมีคลาส) · `subjectParticipation` (รวมทั้งช่วง/วิชา) · `courseWeeklyPart` (รวมทุกวิชา/สัปดาห์ + donePct/partPct).
- Report.tsx: **ภาพรวม** KPI "ทำ Quiz ครบ %" + เส้นเทรนด์ done% (แทน %correct) · **รายสัปดาห์** stacked bar (ทำครบ/ไม่ครบ/ไม่ทำ จำนวนคน) + ตาราง (ทำครบ/ไม่ครบ/ไม่ทำ/%ทำครบ/เข้าเรียน/การบ้าน/ส่ง · ไฮไลต์ %ทำครบ ต่ำสุด) · **รายวิชา** stacked horizontal bar เทียบวิชา + heatmap "% ทำครบ" วิชา×สัปดาห์ (แทน topic-difficulty %correct). สี DONE #22c55e / PARTIAL #f59e0b / NONE #ef4444.

### Revision 8 (11 Sep) — แก้ช่องโหว่ข้ามสัปดาห์ (cross-week integrity)
- **ปัญหา:** Live W3 (13 ก.ย.) แต่ครูมาทำ 19 ก.ย. + วันเดียวกัน W4 live → หลายสัปดาห์ค้างพร้อมกัน. **audit:** data ปลอดภัย (ทุก state key ด้วย `wk` ไม่เขียนทับ) แต่ **Dashboard เห็นแค่ CUR_WEEK สัปดาห์เดียว → backlog สัปดาห์เก่าหล่นหาย** (test เจอ W3 ค้างส่ง 1 คน มองไม่เห็นบน Dashboard) + ทุก nav บังคับ CUR_WEEK + หน้าส่งไม่ขึ้นสัปดาห์เด่น.
- **fix 1 — open-weeks model:** `courseBacklog(cid)` (logic.ts) = ทุกสัปดาห์ ≤ ปัจจุบันที่ยังมี hw/feedback ค้าง หรือ ยังไม่ส่ง.
- **fix 2 — Dashboard backlog แยกตามสัปดาห์:** CourseCard โชว์เป็นบล็อกต่อสัปดาห์ (W+วันที่) · สัปดาห์เลยกำหนด = แถบแดง "ค้าง · เลยมา N สัปดาห์" · ปัจจุบัน = แถบน้ำเงิน · ต่อวิชา hw/feedback + "ค้างส่งผู้ปกครอง N คน" — ไม่มีอะไรถูกซ่อน, สัปดาห์ไม่ปนกัน (คนละบล็อก).
- **fix 3 — nav พกสัปดาห์ถูก:** `onHwList(cid,sub,wk)` · focusFeedback/focusSummary ใช้ `w.wk` ของงานนั้น (เลิก hardcode CUR_WEEK) · HwMissingDialog โชว์สัปดาห์.
- **fix 4 — กันส่งผิดสัปดาห์:** StudentDrawer send dialog มี **banner เด่น** "รายงาน สัปดาห์ที่ N · วันที่ · คอร์ส · น้อง{nick}" ทั้ง path LINE/manual.
- verified: กด W3 ค้างส่ง → Summary เปิดที่ W3 (ปุ่ม indigo) · drawer/กราฟ/สรุป = W3 · banner ส่ง = สัปดาห์ที่ 3.

### Revision 5 (10 Sep)
- **เอา Feedback ออกจาก Summary ▸ Subject tab** — ลบ `FeedbackEditor` + KPI "Feedback วิชานี้" (เหลือ 4 KPI). การเขียน Feedback อยู่หน้า Feedback อย่างเดียว. Dashboard ปุ่ม feedback (การ์ดคอร์ส + ตารางไลฟ์) เปลี่ยนไป **focusFeedback → หน้า Feedback** (nav เพิ่ม `feedbackFocus`, Feedback.tsx useEffect รับ set course/sub/week). `SummaryFocus.field` เหลือ homework|send.
- **จุดสร้าง Homework** (`src/components/HomeworkSetupDialog.tsx` + store `useHwSetup`, mount ใน App): ปุ่ม "สร้าง / แก้ Homework" ใน Subject view → popup ตั้ง **เฉลยกลาง (ทุกคน)** ต่อข้อ (Select ก/ข/ค/ง) + เพิ่ม/ลบข้อ (`hwQuestions[cid|sub|wk]` · setHwKey/addHwQuestion/deleteHwQuestion). คำตอบรายคน = คอลัมน์ Homework/HomeworkDialog เหมือนเดิม.

### Revision 6 (10 Sep) — เลือกสัปดาห์ล่วงหน้าได้
- `WeekPicker` (ใช้ร่วม Summary+Feedback): **เอา `disabled` ของสัปดาห์อนาคตออก** — เลือกได้ · สัปดาห์ > CUR_WEEK = ปุ่ม**เส้นประ** · เมื่อเลือกอนาคตโชว์ป้ายอำพัน "สัปดาห์ Wn ยังมาไม่ถึง — เตรียมข้อมูลล่วงหน้าได้ (Feedback/เฉลย Homework)". ปลอดภัย: R/fbTpl/hwQuestions ของสัปดาห์อนาคตยังไม่ seed → logic คืน pending/draft ไม่ crash · เตรียม Feedback (setFeedbackText สร้าง fbTpl) + เฉลย Homework (HomeworkSetupDialog) + special cases ได้ล่วงหน้า (quiz/attendance เป็น actual ยังแก้ inline ไม่ได้เพราะไม่มี R record — ตามธรรมชาติ).

### Revision 3 (same day) — Nock feedback
- **กราฟ radial → vertical grouped bar** (`charts.tsx → QuizHwBars`, recharts BarChart · Quiz/HW · y 0–100 · prop `light` สำหรับพื้นขาว A4). ภาพรวม = bars ราย**วิชา** (สัปดาห์ปัจจุบัน) · รายวิชา = bars ราย**สัปดาห์** W1–W5 (progression). ลบ `RadialGauge`.
- **Preview รายงาน (ReportA4) โชว์ bar chart เดียวกัน** — เพิ่ม `QuizHwBars light` ใต้ KPI (ขึ้นบนใบที่ส่งผู้ปกครอง + LINE preview ด้วย).
- **9 Sep: ตัด Homework ออกจาก bar chart ทั้งหมด** (Information + A4) เหลือแค่แท่ง Quiz ชั่วคราว — `QuizHwBars` render เฉพาะ `quiz` bar, `QuizHwLegend` เหลือ Quiz (BarRow ยังเก็บ hw ไว้ เผื่อเปิดกลับ). ตัวเลข HW ยังมีในตารางรายวิชา/report boxes.
- **9 Sep: Subject view (Summary) — 3 คอลัมน์ ทำควิซ/คะแนนควิซ/Homework = field กรอกในตัว + chevron popup** (`FieldShell`+`TextNum` inline · `CHEV_BTN`). ทำควิซ+คะแนนควิซ chevron = เปิด **`QuizDialog`** (`src/components/QuizDialog.tsx` + store `useQuizDialog`, mount ใน App.tsx) — **ตารางผลรายข้อ read-only แบบ Web Admin** ตาม mockup Nock: Question / Correct Answer / Correct Percentage / Student's Answer (เขียว/แดง/"-") + แถว Score + โลโก้ N · ข้อมูลรายข้อ mock deterministic จาก `quizDetail(idx,sub,wk)` ใน logic.ts (อิง lqDone/lqCorrect/lqT). Homework chevron = `openHw` (HomeworkDialog เดิม). `@radix-ui/react-popover`+`ui/popover.tsx` ยังอยู่แต่ตอนนี้ Summary ไม่ได้ใช้แล้ว.
  - ⏳ quiz field ในตารางยัง**แก้ inline ได้อยู่** — ถ้าจะให้ read-only ตาม Web Admin (TODO#3 เดิม) ค่อยสั่ง
- **9 Sep: รื้อ Report page ใหม่ (shadcn + recharts) = analytical retrospective** (`src/pages/Report.tsx`) — Report=อดีตเพื่อวิเคราะห์ · Dashboard=ปัจจุบัน actionable (Nock แยกชัด). shadcn `Tabs` 4 แท็บ: **ภาพรวม** (KPI 5 ตัว + line trend Quiz/HW/เข้าเรียน + donut สถานะ) · **รายสัปดาห์** (grouped bars + ตารางไฮไลต์สัปดาห์ Quiz ต่ำสุด) · **รายวิชา** (เทียบวิชา horizontal bars + **Topic difficulty heatmap** Subject×Week) · **นักเรียน** (Churn rate/Active/velocity WoW + donut + Inactivity buckets). helpers ใน logic.ts: `courseWeekly/courseTotals/courseStudents/subjectQuizAvg/courseVelocity/reportsSentByWeek`. ⏳ ยังไม่มี: New-student count (ไม่มี enroll date ชัด), at-risk watchlist (ย้ายไป Dashboard).
- **9 Sep: OverallCard เพิ่ม toggle รายวิชา/รายสัปดาห์** — "รายวิชา" = แท่ง Quiz เทียบวิชาในสัปดาห์ปัจจุบัน · "รายสัปดาห์" = แท่ง Quiz เฉลี่ยทุกวิชา W1→W(now) เห็นพัฒนาการ (ใช้ `studentOverallWeekly`).
- **ลบ label "Course"** หน้า Feedback + Report (page). "Week" ลบไปแล้ว rev ก่อน.
- **Popup**: date range prefill = ช่วงสัปดาห์จริง (`WK_DATE[wk]`) แก้ได้ · ชื่อวิชา**ทุกวิชา**เป็น input แก้ได้ (`ovRename`) · ลบคำ "แก้ไขชั่วคราว" · เพิ่ม info "i" + tooltip (การแก้ไขมีผลเฉพาะ W นั้นๆ) · **ล็อกสูง `h-[860px]`** (+`max-h-[calc(100vh-2rem)]` กันล้นจอ) — collapse/expand ไม่เปลี่ยนความสูง.

## ⏳ TODO — agreed with Nock, NOT yet built (do these next)
1. **Special-cases UX → icon button + Modal** (both Summary week-level AND drawer student-level). Restructure inside modal to **cards grouped BY SUBJECT** (each card collapsible, has checkboxes ขยายเวลา/ไม่มีเรียน/วันเรียนชดเชย + per-card Clear). Added subjects = own cards with "เพิ่มใหม่" tag + Delete. Date-range field opens a **calendar range picker** (add shadcn `calendar` + `popover`). Currently SpecialCases is an inline collapsible section — convert to modal-behind-icon.
2. **Homework cell (Summary Subject table) → click opens the existing HomeworkDialog popup** (not inline edit).
3. **ทำควิซ / คะแนนควิซ = READ-ONLY** (fixed from Web Admin). Remove the inline `InlineFrac`/`TextNum` editing for quiz — show plain text `X/Y`. Only Homework editable (via popup). Keep front/total logic only if still needed for Homework total (total-edit = all students).
4. **Summary page: remove Feedback** (cluttered). Delete the "Feedback Template" card (All Subjects view) and the `FeedbackEditor` in Subject view. Feedback stays on the Feedback page + in the drawer.
5. **Boolean Search — Student Page + Summary Page** (spec locked with Nock, see below). Replace StudentList's plain substring search; add a new search box to Summary.

### Item 5 spec — Boolean Search (locked 3 Sep 2026)
**Syntax = symbols + `field:value`** (Nock chose this over keyword AND/OR/NOT):
| write | meaning |
|---|---|
| `เอิร์ธ ป.5` | space between terms = **AND** (all must match) |
| `เอิร์ธ \| ป.6` or `เอิร์ธ OR ป.6` | `\|` / `OR` = **OR** |
| `-churn` | leading `-` = **NOT** (exclude) |
| `"สอบเข้า ม.4"` | `"..."` = exact phrase |
| `field:value` | scoped search |
| bare word | matches name / nick / id |

- **Fields (both pages):** `name`, `nick`, `id`, `grade`, `status`, `course`, `gc`, `phone`, `lineName`. Values case-insensitive; `course:MWIT` matches on the course display name substring.
- **Precedence:** OR is lowest; group AND-terms between `|`. (No parentheses in v1 — keep parser simple.) A bare `-term` negates the immediately-following term.
- **Summary Page scope (Nock's decision):** the box **filters the student rows shown in the Summary tables** — course/week stay the page context (not searchable). Add Summary-only scopes on top of the shared fields: `status:pending|ready|sended` (maps to `overallStatus`), and `hw:missing` (student has no HW collected this course/week). Everything else behaves identically to Student Page.
- **Build notes:** write one shared pure parser+matcher (e.g. `src/search.ts` — `parseQuery(str)` → predicate; `matchStudent(pred, student, ctx?)`). StudentList replaces the `search.toLowerCase().includes(...)` block at `StudentList.tsx:133`; Summary calls the same matcher over its roster. Keep an inline syntax hint (small `?` popover) so teachers discover `field:value`.

## Decisions (defaults — Nock said "โอเค"; confirm if he disagrees)
- Drawer (per-student) special-cases: **also icon-button + modal** (same pattern as Summary, for consistency).
- **Yes, add shadcn Calendar range picker** for the date-range field.

## Notes / product truth
- LINE send = simulation only (no backend). Homework = manual (no FB scraping). Live Quiz auto from app.
- Separate product from ERP (`../../NEW ERP!`) and Web/App (`../../Web App`) — never share data models. See `../CLAUDE.md`.

