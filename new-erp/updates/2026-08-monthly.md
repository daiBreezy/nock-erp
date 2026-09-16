Monthly Update — Aug 2026

Highlights
- Billing changed shape. Shibasan needed an invoice system fast. MJ's call: rather than build a throwaway automation flow, pull the real Billing module forward and build it in the ERP now. It's built and in testing. We got the real thing sooner and skipped a shortcut that would have been thrown away.
- ERP Phase 1 hit a real milestone. After about 3 months of dev with MJ, it was tested — first with MJ, then live with two branch Admins (Pin / Thonglor, Dear / Bangna). Both picked it up fast — a good signal for build quality.
- Live testing exposed model-level gaps quickly: Bundle Course is modeled as a single Course, so Admin can't manage it cleanly; class durations aren't fixed (25 / 45 min); NockAcademy's daily-repeating schedule breaks creating Class/Session from the Calendar; the Student→LINE link is still unclear and untested.
- Attendance→Payroll vendor evaluation closed. Jobcan does everything we need but has three dealbreakers — price, no ongoing support, rough UX. Priced out: Jobcan ≈ 43,200 THB/yr (Attendance only) vs Human Soft ≈ 56,000+ THB/yr (full Attendance→Payroll). The whole track then went on hold.
- Two new projects landed: Teacher.nockacademy.com (AI-assisted reduction of Teacher/TA workload on Premium Plus+) and Krujob (teacher-matching site, ~15% priority per Shibasan). Both at Research/Define.

Progress vs Plan
- August's plan (from July): focus Billing, Admin workload, invoice automation, replan Personalize Goal.
- Billing went further than planned — from "watch closely" to a built module now in testing.
- Invoice automation was deliberately dropped and replaced by building real Billing — a better outcome.
- Admin workload: Expense moved into real use — a Sheet and a fit-for-purpose template are built, but no concrete results to show yet. e-WHT is on hold. Attendance→Payroll: evaluation done, now on hold.
- Personalize Goal (Arm): live, users trickling in, but we still can't pin down why abandonment is so high. I see real potential but it's in the wrong place — not yet replanned. Carried forward.
- Moving House (landing migration off WordPress) took roughly two weeks of the team's time mid-month, then stalled — only the Landing page itself is finished, and Arm has been pulled onto other tasks.
- One short week (holiday, 3–7 Aug). My own ERP work (Bus Route rebuild, Billing sub-systems) ran early in the month, then paused. Phase 1 slipped — I set the timeline too aggressively without weighing the team's existing workload.

People & Team
- MJ made a good call on Billing and pushed it into testing.
- Arm led the Moving House dev and got the Landing page done, then was pulled onto other tasks, so the project is parked. Also owns Personalize Goal, which is live.
- Preaw & Wuth did website content/design for the first time — light output is expected, not a red flag.
- Admins Pin and Dear joined Phase 1 testing — both fast learners.
- The recurring theme: across UX/UI, Product, Liclass and NockAcademy the team isn't aligned on power / vision / attitude, and there's a wall I can't see through. I hold back from pushing the NockApp side so I don't add pressure — and the cost is near-zero visibility into where my asks stand, so I can't manage those timelines.

Key Insights
- Phase 1 took 3 months and the quality shows — and when Billing needed to move fast, MJ's instinct was to build the real thing into the ERP rather than bolt on a throwaway, and it reached testing anyway. Investing in the real thing paid off twice.
- Testing with real Admins is where the model meets reality. The gaps it surfaced (Bundle-as-Course, non-standard durations, daily-repeating schedules, Student→LINE) are design decisions, not bugs — far cheaper to find now than after launch.
- The month's plan bent around the team's real capacity: two weeks went to Moving House, Phase 1 slipped because the timeline ignored existing workload. A planning-input problem, not a skills one.
- The hardest problem is still structural and human — the wider team isn't aligned, there's a boundary I can't cross, and holding back to avoid adding pressure costs me the visibility and control to manage anything handed across it.

Next Month Focus (September)
1. Finish Billing and Phase 1 testing with the Admins (Dear, Pin), then act on the model gaps: Bundle Course, class durations, Calendar-driven Class/Session, Student→LINE.
2. Walk through and scope the two new projects — Teacher.nockacademy.com and Krujob.
3. Get Shibasan's call on Video Structure ownership.
4. Find the right home and direction for Personalize Goal.
5. Decide whether Moving House resumes or stays parked, given Arm's capacity.

Risks / Decisions Needed
- Cross-team alignment and visibility through the NockApp wall — I can't manage timelines on anything handed across it. Top structural risk, building for months.
- Video Structure has no owner — needs Shibasan's call.
- Phase 1 model gaps need design decisions before the build is "done."
- Personalize Goal is mispositioned — needs a direction decision (carried from July).
- A stack of tracks is now on hold — Bus Route, HR Management, Budget/Expense, e-WHT, Attendance→Payroll (evaluated but parked). Deliberate deprioritization; may come back later. Noted so it stays a conscious choice.
- Moving House stalled after one page — depends on Arm's capacity; needs a resume-or-park decision.

---

อัปเดตประจำเดือน — สิงหาคม 2026

Highlights
- Billing เปลี่ยนรูป Shibasan ต้องการระบบ invoice ด่วน — MJ ตัดสินใจว่าแทนที่จะทำ automation ชั่วคราวทิ้งขว้าง ก็ขยับ Billing module ขึ้นมา build จริงใน ERP เลย ตอนนี้ build เสร็จ อยู่ใน test ได้ของจริงเร็วกว่าแผน และไม่เสียแรงกับทางลัด
- ERP Phase 1 ถึงหมุดหมายจริง หลัง dev กับ MJ ราว 3 เดือน ได้ test — รอบแรกกับ MJ แล้ว test จริงกับ Admin 2 สาขา (ปิ่น / Thonglor, เดียร์ / Bangna) ทั้งคู่เรียนรู้ไว เป็นสัญญาณที่ดีของคุณภาพงาน
- การ test จริงเปิดช่องโหว่เชิง model เร็ว: Bundle Course ถูกจัดเป็น Course เดียว Admin จัดการไม่คล่อง · duration ต่อ class ไม่ตายตัว (25 / 45 นาที) · ตารางซ้ำทุกวันของ NockAcademy ทำให้สร้าง Class/Session จาก Calendar ไม่ได้ · Student→LINE ยังไม่ชัด ยังไม่ได้ test
- ปิดการประเมิน vendor Attendance→Payroll แล้ว Jobcan ทำได้ครบแต่ติด 3 เรื่อง — ราคา, ไม่มี support ต่อเนื่อง, UX ใช้ยาก เทียบราคา: Jobcan ≈ 43,200 บาท/ปี (Attendance อย่างเดียว) vs Human Soft ≈ 56,000+ บาท/ปี (ครบ Attendance→Payroll) จากนั้น track นี้เข้า hold ทั้งหมด
- Project ใหม่ 2 อย่าง: Teacher.nockacademy.com (ใช้ AI ลด workload Teacher/TA บน Premium Plus+) และ Krujob (web จับคู่ครู ~15% priority ตาม Shibasan) ทั้งคู่ขั้น Research/Define

Progress vs Plan
- แผนสิงหา (จาก update กรกฎาคม): โฟกัส Billing, Admin workload, invoice automation, replan Personalize Goal
- Billing ไปไกลกว่าแผน — จาก "จับตาเป็นพิเศษ" กลายเป็น module ที่ build เสร็จ กำลัง test
- Invoice automation ถูกตัดทิ้งโดยตั้งใจ แทนด้วยการทำ Billing จริง (MJ ตัดสินใจ) — เป็นผลลัพธ์ที่ดีกว่า
- Admin workload: Expense เริ่มใช้งานจริงแล้ว — ทำ Sheet + Template ที่เหมาะสม แต่ยังไม่มีผลลัพธ์รูปธรรม · e-WHT = hold · Attendance→Payroll: ประเมินเสร็จ แล้ว hold
- Personalize Goal (Arm): live แล้ว มี user เข้ามาบ้าง แต่ยังจับไม่ถูกว่าทำไม abandon เยอะ ฉันมองว่ามี potential แต่อยู่ผิดที่ผิดทาง — ยังไม่ได้ replan ยกยอดต่อ
- Moving House (ย้าย landing ออกจาก WordPress) กินเวลาทีมราว 2 สัปดาห์กลางเดือน แล้ว stall — เสร็จแค่ Landing page หน้าเดียว และ Arm ถูกดึงไป task อื่น
- มีสัปดาห์สั้น 1 สัปดาห์ (หยุดยาว 3–7 ส.ค.) · งาน ERP ที่ฉันลงมือเอง (Bus Route rebuild, Billing sub-systems) ทำต้นเดือนแล้ว pause · Phase 1 หลุด เพราะฉันวาง timeline เร่งไปโดยไม่ชั่ง workload เดิมของทีม

People & Team
- MJ ตัดสินใจดีเรื่อง Billing และดันจนเข้า test
- Arm คุม dev Moving House ทำ Landing page เสร็จ แล้วถูกดึงไป task อื่น project เลย park ไว้ · ดูแล Personalize Goal ที่ live อยู่
- Preaw & Wuth ทำงาน content/design ฝั่ง website ครั้งแรก output เบาถือว่าปกติ ไม่ใช่ red flag
- Admin ปิ่น และ เดียร์ เข้าร่วม test Phase 1 ทั้งคู่เรียนรู้ไว
- ธีมที่วนซ้ำ: ข้าม UX/UI, Product, Liclass และ NockAcademy ทีมยังไม่ align เรื่อง power / vision / attitude และมีกำแพงที่ฉันมองไม่เห็น ฉันเกรงใจไม่กล้าเร่งฝั่ง NockApp เพื่อไม่ให้เพิ่มความกดดัน — ผลคือแทบไม่เห็น progress งานที่ส่งไป และคุม timeline ฝั่งนั้นไม่ได้

Key Insights
- Phase 1 ใช้เวลา 3 เดือน และคุณภาพเห็นผล — พอ Billing ต้องเร่ง MJ เลือก build ของจริงเข้า ERP แทนที่จะต่อทางลัดทิ้งขว้าง แล้วก็ยังเข้า test ได้ การลงทุนกับของจริงคุ้มสองต่อ
- Test กับ Admin จริงคือจุดที่ model เจอโลกจริง ช่องโหว่ที่เจอ (Bundle เป็น Course, duration ไม่ตายตัว, ตารางซ้ำทุกวัน, Student→LINE) เป็นการตัดสินใจเชิง design ไม่ใช่ bug — เจอตอนนี้ถูกกว่าเจอหลัง launch มาก
- แผนของเดือนบิดตาม capacity จริงของทีม: 2 สัปดาห์ไป Moving House, Phase 1 หลุดเพราะ timeline ไม่ได้คิดถึง workload เดิม — เรื่อง input ตอนวางแผน ไม่ใช่เรื่องทักษะ
- เรื่องที่หนักที่สุดยังเป็นเรื่องโครงสร้างและคน — ทีมภาพรวมยังไม่ align มีกำแพงที่ข้ามไม่ได้ และการเกรงใจไม่เร่งเพื่อเลี่ยงการเพิ่มความกดดัน แลกมาด้วยการเสีย visibility และการคุม timeline ของงานที่ส่งข้ามฝั่งไป

Next Month Focus (กันยายน)
1. Test Billing + Phase 1 กับ Admin (เดียร์, ปิ่น) ให้จบ แล้วลงมือแก้ช่องโหว่เชิง model: Bundle Course, class duration, การสร้าง Class/Session จาก Calendar, Student→LINE
2. Walkthrough + วาง scope 2 project ใหม่ — Teacher.nockacademy.com และ Krujob
3. ให้ได้ข้อสรุปเรื่องเจ้าของ Video Structure (เสนอ Shibasan แล้ว)
4. หา "ที่ที่ถูกต้อง" และทิศทางให้ Personalize Goal
5. ตัดสินใจว่า Moving House ไปต่อหรือ park ยาว ตาม capacity ของ Arm

Risks / Decisions Needed
- Align ทีม และ visibility ข้ามกำแพงฝั่ง NockApp — คุม timeline งานที่ส่งข้ามไปไม่ได้เลย เป็น risk เชิงโครงสร้างอันดับหนึ่ง สะสมมาหลายเดือน
- Video Structure ไม่มีเจ้าของ — รอ Shibasan เคาะ
- ช่องโหว่เชิง model ของ Phase 1 ต้องการการตัดสินใจเชิง design ก่อนถึงจะเรียกว่า build เสร็จ
- Personalize Goal วางผิดที่ — ต้องตัดสินใจเรื่องทิศทาง (ยกยอดจากกรกฎาคม)
- Track ที่ hold กองรวมกัน — Bus Route, HR Management, Budget/Expense, e-WHT, Attendance→Payroll (ประเมินแล้วแต่ park) — hold โดยตั้งใจเพราะยังไม่สำคัญตอนนี้ อนาคตอาจเอากลับมา บันทึกไว้ให้เป็นการเลือกอย่างรู้ตัว
- Moving House stall หลังทำได้หน้าเดียว — ขึ้นกับ capacity ของ Arm ต้องตัดสินใจ resume หรือ park
