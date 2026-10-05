Quarterly Update — Q3 2026 (Jul–Sep)

Quarter in One Line
- We understood Finance before building on it, built Billing for real instead of a shortcut, and ended the quarter with output KMD has approved and a locked pilot date.

What We Set Out To Do vs What Happened
- How the quarter moved: July = understand before building · August = build the real thing and put it in front of real users · September = prove it works and set a date. Each month's plan carried into the next.
- July — plan: understand the real Finance/Admin workflow before turning it into an ERP module. I went hands-on with Admin (Tangkwa) to map how the work actually flows. The process itself turned out to be broken, inherited from the past and never improved, so Finance stayed on hold as an ERP module on purpose. KMD and the bank cleared a big batch of blocking questions (VAT, WHT, the sibling-discount rule — my assumption was wrong, invoice numbering, the real 9th–10th deadline, Excel statements). Meanwhile MJ built most of the ERP foundation (login, branches, staff, course/class, calendar, attendance, summaries with a working Summary→LINE send).
- August — plan from July: Billing, Admin workload, invoice automation, replan Personalize Goal. Billing went further than planned: instead of a throwaway automation flow, MJ pulled the real Billing module forward and built it, so invoice automation was dropped for a better outcome. ERP Phase 1 was tested after about 3 months of dev — first with MJ, then live with two branch Admins (Pin, Dear) — and real use exposed model-level gaps (Bundle Course, non-standard class durations, daily-repeating schedules, Student→LINE). Attendance→Payroll was fully evaluated (Jobcan ≈ 43,200 THB/yr, Attendance only; Human Soft ≈ 56,000+ THB/yr, full). Expense moved into real use with a new Sheet and template.
- September — plan from August: finish Billing and Phase 1 testing, scope the new projects, settle Video Structure, Personalize Goal and Moving House. Billing reached 90%: when the bank API stalled, MJ and I switched to our own OCR reading the payslip Ref No., and KMD approved the Tax Invoice Report built from it. The pilot is locked for 15 Oct – 15 Nov at three branches. I rebuilt the ERP prototype as V2 (Inbox, CRM, Reports, Dashboard) to stay ahead of MJ's build. Web Teacher and Krujob reached prototype with Shibasan's feedback. e-WHT went from "is it possible?" in July to KBank agreed and the contract being signed. Brand CI and Brand SWAG started.

Biggest Wins
- Billing built for real, with output KMD accepted. Two calls paid off: building it properly instead of a shortcut (August), and the OCR workaround instead of waiting on the bank (September).
- ERP Phase 1 tested with real Admins after 3 months of dev. They picked it up fast, and the gaps surfaced early, when they're cheap to fix. One root fix (the class's duration deducts the package) removes a whole family of duration problems.
- Pilot date locked: 3 branches (NAS Bangna, NAS Pattaya, LIS), 15 Oct – 15 Nov 2026.
- Finance went from guesswork to a clear picture: the tax/accounting rules are confirmed, and e-WHT is an agreed service with KBank.
- ERP V2 now gives MJ a reference that stays one phase ahead.
- Web Teacher got positive feedback from a real user (K.Guitar), even at prototype stage.

What Didn't Go As Planned
- Two things, and neither changed the outcome: everything is still in progress.
- Work put on hold. Several tracks were deliberately set aside so Billing and the pilot could come first: Bus Route, HR Management, Budget/Expense, Attendance→Payroll, Web Teacher and Krujob. Moving House and Personalize Goal kept moving, but slowly.
- The banks were slow. The bank API for Billing stalled (Krungsri quoted too high, KBank never called back) and took several weeks of outreach before we switched to OCR. KBank on e-WHT also took most of the quarter to reach a meeting with their sales team.

People & Team
- MJ came back to Thailand in July and drove the ERP this quarter: the foundation, the call to build real Billing, and the OCR pivot. MJ and Arm now sync regularly and walk the system together.
- Arm shipped Personalize Goal and led dev on Moving House. Preaw & Wuth did website content/design for the first time.
- Admins Pin, Dear and Tueng own the pilot. Pin and Dear picked up Phase 1 fast, and Dear's homework feedback was substantial; MJ and I sorted it into fix, misunderstanding and park for later. Some branches weren't ready to test, so I'm testing it myself rather than waiting.
- The Finance/Admin vendor threads (e-WHT, Attendance→Payroll) sit with Admin; I stepped back from them at Shibasan's request in July.

Strategic Insights
- Understand the real process before building on it. Finance's problem was process, not the lack of a system, and slow progress there in July was diagnostic, not wasted.
- Build the real thing, not a throwaway. It paid off twice on Billing.
- Billing has to be complete before anything else. It's money, so issues can't be allowed to surface later.
- Real users are where the model meets reality. The gaps are design decisions, not bugs, and fixing them at the root beats patching each case.
- When the right path stalls on someone else's timeline, build a workaround instead of waiting.
- A reference only helps if it keeps up with the build, so V2 has to stay one phase ahead of MJ.
- Putting work on hold is a choice, not a failure. Narrowing the focus to Billing is what got it to 90%.

Next Quarter — Priorities
1. Pilot: get the student/course/class import working before 15 Oct, run the pilot (15 Oct – 15 Nov, Bangna / Pattaya / LIS), and track issues during and after.
2. Billing: finish the last 10% — every realistic scenario, including Master Admin — before the pilot ends.
3. ERP Phase 2: MJ builds Inbox > Form > CRM while the pilot runs, with V2 kept one phase ahead.
4. e-WHT go-live: finish K-Cash Connect access, the Admins learn through KBank's sessions, then switch over.
5. Brand: Brand CI decision and hand-off to Design; Brand SWAG brings the clicker cost down (about 60–70 THB a piece now) and moves to the next prototype.
6. After the pilot, review the tracks on hold (Bus Route, HR, Budget/Expense, Attendance→Payroll, Web Teacher, Krujob, Moving House, Personalize Goal) and decide which comes back first.

Risks / Decisions Needed
- The import has to land before 15 Oct, or the pilot can't start with real students.
- Some branches aren't ready to test, so real-use issues may surface late. I'm covering it by testing myself.
- e-WHT depends on K-Cash Connect access being completed.
- Shibasan: Brand CI direction · Video Structure owner (Shibasan is chasing it) · direction for Personalize Goal.

---

อัปเดตประจำไตรมาส — Q3 2026 (ก.ค.–ก.ย.)

Quarter in One Line
- เราทำความเข้าใจ Finance ก่อนสร้างทับ สร้าง Billing ของจริงแทนทางลัด และจบไตรมาสด้วย Output ที่ KMD Approve และวัน Pilot ที่ล็อกแล้ว

What We Set Out To Do vs What Happened
- ภาพรวมของไตรมาส: กรกฎาคม = เข้าใจก่อนสร้าง · สิงหาคม = สร้างของจริงแล้วเอาไปให้คนใช้จริงลอง · กันยายน = พิสูจน์ว่าใช้ได้ และกำหนดวันใช้งาน แผนของแต่ละเดือนต่อยอดไปเดือนถัดไป
- กรกฎาคม — แผน: เข้าใจ workflow จริงของ Finance/Admin ก่อนเอาไปเป็น module บน ERP ผมลงมือเองกับ Admin (Tangkwa) เพื่อดูว่างานเดินจริงยังไง เจอว่าตัว process เองพังมาจากอดีตและไม่เคยถูกปรับปรุง Finance จึง Hold เป็น module บน ERP โดยตั้งใจ KMD และธนาคารตอบคำถามที่ค้างชุดใหญ่ (VAT, WHT, กฎส่วนลดพี่น้อง — ที่ผมเดาไว้ผิด, เลข invoice, deadline จริงวันที่ 9–10, statement เป็น Excel) ระหว่างนั้น MJ สร้างพื้นฐาน ERP ไปเกือบครบ (Login, สาขา, Staff, Course/Class, Calendar, Attendance, Summary รวมถึงส่ง Summary ผ่าน LINE ได้จริง)
- สิงหาคม — แผนจากกรกฎา: Billing, Admin Workload, Automation Invoice, ปรับแผน Personalize Goal Billing ไปไกลกว่าแผน: แทนที่จะทำ Automation ชั่วคราวทิ้งขว้าง MJ ขยับ Billing ของจริงขึ้นมาสร้างเลย Automation Invoice จึงถูกตัดออกเพื่อผลที่ดีกว่า ERP Phase 1 ได้ test หลัง Dev ราว 3 เดือน — รอบแรกกับ MJ แล้วจริงกับ Admin 2 สาขา (พิณ, เดียร์) การใช้จริงเปิดช่องโหว่เชิง model (Bundle Course, Duration ไม่ตายตัว, ตารางซ้ำทุกวัน, Student→LINE) ประเมิน Attendance→Payroll ครบ (Jobcan ≈ 43,200 บาท/ปี เฉพาะ Attendance; Human Soft ≈ 56,000+ บาท/ปี ครบชุด) และ Expense เริ่มใช้งานจริงด้วย Sheet และ Template ใหม่
- กันยายน — แผนจากสิงหา: จบ Billing และการ test Phase 1, วาง scope project ใหม่, เคลียร์ Video Structure, Personalize Goal และ Moving House Billing ถึง 90%: เมื่อ Bank API ติด ผมกับ MJ เปลี่ยนไปใช้ OCR ของเราเองอ่าน Payslip Ref No. แล้ว KMD Approve Tax Invoice Report ที่สร้างจากข้อมูลนี้ ล็อก Pilot 15 ต.ค. – 15 พ.ย. ที่ 3 สาขา ผมทำ Prototype ERP ใหม่เป็น V2 (Inbox, CRM, Report, Dashboard) เพื่อนำหน้างาน MJ Web Teacher และ Krujob ได้ Prototype พร้อม Feedback จาก Shibasan e-WHT จาก "ทำได้ไหม?" ในเดือนกรกฎา กลายเป็นตกลงกับ KBank และกำลังเซ็นสัญญา และเริ่ม Brand CI กับ Brand SWAG

Biggest Wins
- Billing ที่ build จริง พร้อม Output ที่ KMD ยอมรับ มาจาก 2 การตัดสินใจที่คุ้ม: สร้างของจริงแทนทางลัด (สิงหา) และใช้ OCR แทนการรอธนาคาร (กันยา)
- ERP Phase 1 ผ่านการ test กับ Admin จริงหลัง Dev 3 เดือน น้องๆ เรียนรู้ไว และเจอช่องโหว่ตั้งแต่ยังแก้ถูก การแก้ที่ต้นตอจุดเดียว (ให้ Duration ของ Class หัก Package) ตัดปัญหาเรื่อง Duration ได้ทั้งตระกูล
- ล็อกวัน Pilot: 3 สาขา (NAS Bangna, NAS Pattaya, LIS) 15 ต.ค. – 15 พ.ย. 2026
- Finance จากการเดา กลายเป็นภาพที่ชัด: กฎภาษี/บัญชียืนยันแล้ว และ e-WHT เป็น Service ที่ตกลงกับ KBank แล้ว
- ERP V2 เป็น Reference ที่นำหน้า MJ ไปหนึ่ง Phase
- Web Teacher ได้ Feedback เชิงบวกจากผู้ใช้จริง (K.Guitar) ตั้งแต่ขั้น Prototype

What Didn't Go As Planned
- มี 2 เรื่อง และไม่ได้กระทบผลลัพธ์ ทุกอย่างยังอยู่ใน Progress
- งานที่ถูก Hold: หลาย track ถูกพักไว้โดยตั้งใจ เพื่อให้ Billing และ Pilot มาก่อน: Bus Route, HR Management, Budget/Expense, Attendance→Payroll, Web Teacher และ Krujob ส่วน Moving House และ Personalize Goal ยังเดินต่อแต่ช้า
- ธนาคารล่าช้า: Bank API สำหรับ Billing ติด (Krungsri ราคาสูง, KBank ไม่ติดต่อกลับ) ใช้เวลาตามหลายสัปดาห์ก่อนเปลี่ยนไปใช้ OCR ฝั่ง e-WHT กับ KBank ก็ใช้เวลาเกือบทั้งไตรมาสกว่าจะได้นัดคุยกับ Sales

People & Team
- MJ กลับไทยเดือนกรกฎา และเป็นคนขับเคลื่อน ERP ไตรมาสนี้: พื้นฐานระบบ, การตัดสินใจสร้าง Billing จริง และการเปลี่ยนไปใช้ OCR MJ กับ Arm sync กันสม่ำเสมอและเดินระบบด้วยกัน
- Arm ส่งมอบ Personalize Goal และคุม Dev Moving House Preaw & Wuth ทำงาน Content/Design ฝั่งเว็บครั้งแรก
- Admin พิณ เดียร์ ตึ๋ง เป็นเจ้าของ Pilot พิณกับเดียร์เรียนรู้ Phase 1 ไว และเดียร์ส่ง Feedback การบ้านมาเยอะ ผมกับ MJ คัดเป็น ต้องแก้ / เข้าใจผิด / วางไว้ก่อน บางสาขายังไม่สะดวกเทส ผมจึงเทสเองแทนการรอ
- สาย vendor ของ Finance/Admin (e-WHT, Attendance→Payroll) อยู่กับ Admin ผมถอยออกมาตามที่ Shibasan ขอตั้งแต่กรกฎา

Strategic Insights
- เข้าใจ process จริงก่อนสร้างทับ ปัญหาของ Finance คือ process ไม่ใช่การขาดระบบ และความคืบหน้าที่ช้าในเดือนกรกฎาคือการวินิจฉัย ไม่ใช่เวลาที่เสียเปล่า
- สร้างของจริง ไม่ใช่ทางลัดทิ้งขว้าง คุ้มสองต่อกับ Billing
- Billing ต้องสมบูรณ์ก่อนไปเรื่องอื่น เพราะเป็นเรื่องเงิน ปล่อยให้เจอปัญหาทีหลังไม่ได้
- ผู้ใช้จริงคือจุดที่ model เจอโลกจริง ช่องโหว่ที่เจอเป็นเรื่อง design ไม่ใช่ bug และแก้ที่ต้นตอดีกว่าไล่แพตช์ทีละเคส
- เมื่อทางที่ถูกติดเพราะรอฝ่ายอื่น ให้สร้างทางเลี่ยงเองแทนการรอ
- Reference จะมีประโยชน์ก็ต่อเมื่อเดินทันงาน Dev V2 จึงต้องนำหน้า MJ ไปหนึ่ง Phase เสมอ
- การ Hold งานคือการเลือก ไม่ใช่ความล้มเหลว การบีบโฟกัสมาที่ Billing คือสิ่งที่พามันมาถึง 90%

Next Quarter — Priorities
1. Pilot: ให้ Import นักเรียน/คอร์ส/คลาสใช้งานได้ก่อน 15 ต.ค. รัน Pilot (15 ต.ค. – 15 พ.ย., Bangna / Pattaya / LIS) และเก็บปัญหาทั้งระหว่างและหลังใช้งาน
2. Billing: จบอีก 10% สุดท้าย — ทุกสถานการณ์ที่เกิดได้จริง รวมถึง Master Admin — ก่อน Pilot จบ
3. ERP Phase 2: MJ Dev Inbox > Form > CRM ระหว่าง Pilot รัน โดยให้ V2 นำหน้าไปหนึ่ง Phase
4. e-WHT go-live: เข้าใช้ K-Cash Connect ให้ได้ Admin เรียนผ่าน Session ของ KBank แล้วเปลี่ยนมาใช้จริง
5. Brand: ได้คำตัดสิน Brand CI แล้วส่งต่อ Design · Brand SWAG ลดราคาคลิกเกอร์ (ตอนนี้ราว 60–70 บาท/ชิ้น) แล้วไป Prototype รอบต่อไป
6. หลัง Pilot ทบทวน track ที่ Hold ไว้ (Bus Route, HR, Budget/Expense, Attendance→Payroll, Web Teacher, Krujob, Moving House, Personalize Goal) แล้วตัดสินใจว่าอะไรกลับมาก่อน

Risks / Decisions Needed
- ฟีเจอร์ Import ต้องเสร็จก่อน 15 ต.ค. ไม่เช่นนั้น Pilot จะเริ่มด้วยนักเรียนจริงไม่ได้
- บางสาขายังไม่พร้อมเทส ปัญหาตอนใช้งานจริงอาจโผล่ช้า ผมรับมือด้วยการเทสเอง
- e-WHT ขึ้นกับการเข้าใช้ K-Cash Connect ให้สมบูรณ์
- Shibasan: ทิศทาง Brand CI · เจ้าของ Video Structure (Shibasan ตามอยู่) · ทิศทางของ Personalize Goal
