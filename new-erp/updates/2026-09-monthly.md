Monthly Update — Sep 2026

Highlights
- Billing went from "built, in testing" to a real milestone. The bank API route stalled (Krungsri quoted too high, KBank never called back), so MJ and I pivoted: our own OCR (Gemini) reads the customer's payslip Ref No. and links Invoice → Payslip → Receipt. KMD then approved the Tax Invoice Report built from that data, which moved Billing from 50% to 90%. The last 10% is testing every realistic scenario so each branch Admin is covered day to day.
- The pilot date is locked: 15 Oct – 15 Nov 2026, three branches — NAS Bangna (Dear), NAS Pattaya (Tueng), LIS (Pin). MJ moves on to Inbox > Form > CRM (Phase 2) once the pilot is running.
- Before opening production to every Admin, one piece was still missing: importing the students we still serve today, which Admins keep mainly in Google Sheets. Admins asked to import students, courses and classes; MJ will have the import working before 15 Oct.
- I built ERP V2, a new prototype that keeps pace with MJ. The first one had gone stale and couldn't be reused. V2 adds Inbox, CRM, Reports and Dashboard, and serves as the reference for MJ's Phase 2, 3, 4.
- Admins got their first homework (build their branch's real Classes, Courses, and both Single and Bundle Invoices). Dear's feedback was substantial; MJ and I sorted it into three groups: fix, misunderstanding, park for later. Some branches weren't ready to test, so I'm testing it myself rather than waiting.
- e-WHT: we met KBank's sales team, agreed to use the service, and the contract is being signed. We're now applying for KBank's K-Cash Connect; once access is set up, the team starts learning e-WHT.
- Web Teacher and Krujob each got a first prototype and Shibasan's feedback, then went on hold — not the current priority, and no Dev has time to prototype the LINE OA Homework idea. Web Teacher did get positive feedback from a real user (K.Guitar).
- Started Brand CI and Brand SWAG. Two full CI directions wait on Shibasan. For SWAG, the first clicker prototype is printed; it costs about 60–70 THB per piece, and the supplier is reworking the design to bring that down (3–5 business days).

Progress vs Plan
- Plan from August: (1) finish Billing + Phase 1 testing and act on the model gaps · (2) scope Teacher.nockacademy.com and Krujob · (3) Video Structure owner · (4) a home for Personalize Goal · (5) decide Moving House resume or park.
- (1) Billing: well ahead on the money side (90%, KMD-approved); testing continues up to 15 Oct. On the model gaps, I found a new approach for class duration: the Class's duration is what deducts from the Package (a 2-hour class deducts 2 hours). The other gaps (Bundle Course, Calendar-driven Class/Session, Student→LINE) are sorted through the homework feedback.
- (2) Done, then paused: both got a prototype and feedback, then went on hold.
- (3) Video Structure: I haven't followed up; Shibasan will chase it himself.
- (4) Personalize Goal: launched, with a fairly good response, but it still seems to be in the wrong place.
- (5) Moving House: still in process, but Arm has little time to focus, so it moves slowly.
- Where we slipped: only the banks. Outreach was slow and took a lot of effort before we changed approach.

Key Insights
- Billing has to be complete before anything else. It's money, so issues can't be allowed to surface later, and it stays the #1 test priority.
- When the "right" integration path (bank API) stalls on someone else's timeline, building a workaround (OCR) beats waiting. It paid off when KMD accepted the output.
- A reference only helps if it keeps up with the build. The first ERP prototype fell behind and couldn't be reused, so V2 has to stay one phase ahead of MJ.
- When the people who should test don't have time, waiting only delays go-live. Testing it myself and adding their feedback as it arrives is faster.
- Fixing the model at its root beats patching each case: making class duration deduct the package removes a whole family of duration problems at once.

Next Month Focus (October)
1. Finish the last 10% of Billing: test every realistic scenario, including Master Admin.
2. Get the student/course/class import working before 15 Oct, then start the pilot (Bangna, Pattaya, LIS) and track issues during and after.
3. Keep ERP V2 one phase ahead of MJ; MJ starts Phase 2 (Inbox > Form > CRM) while the pilot runs.
4. e-WHT: finish K-Cash Connect access, then learn e-WHT through KBank's sessions.
5. Brand CI: get Shibasan's decision, then hand to Design. Brand SWAG: lower the clicker cost and move to the next prototype.

Risks / Decisions Needed
- The import feature has to land before 15 Oct, or the pilot can't start with real students.
- Some branches aren't ready to test, so real-use issues may surface late. I'm covering it by testing myself.
- Brand CI is blocked on Shibasan's decision.
- e-WHT depends on K-Cash Connect access being completed.
- Web Teacher and Krujob stay on hold; the LINE OA Homework check needs a Dev with time.
- Video Structure ownership is with Shibasan. Personalize Goal's direction and Moving House's pace are still open.

---

อัปเดตประจำเดือน — กันยายน 2026

Highlights
- Billing ก้าวจาก "build เสร็จ อยู่ใน test" มาเป็นหมุดหมายจริง เส้นทาง Bank API ติด (Krungsri ราคาสูง, KBank ไม่ติดต่อกลับ) ผมกับ MJ จึงเปลี่ยนแผน ใช้ OCR (Gemini) ของเราเองอ่าน Payslip Ref No. แล้วผูก Invoice → Payslip → Receipt จากนั้น KMD Approve Tax Invoice Report ที่สร้างจากข้อมูลนี้ ทำให้ Billing ขึ้นจาก 50% เป็น 90% อีก 10% ที่เหลือคือ test ทุกสถานการณ์ที่เกิดขึ้นได้จริง เพื่อให้ Admin แต่ละสาขาใช้งานประจำวันได้ครบ
- ล็อกวัน Pilot แล้ว: 15 ต.ค. – 15 พ.ย. 2026 ใน 3 สาขา — NAS Bangna (เดียร์), NAS Pattaya (ตึ๋ง), LIS (พิณ) พอ Pilot เริ่มรัน MJ จะไป Dev Inbox > Form > CRM (Phase 2) ต่อ
- ก่อนเปิด Production ให้ Admin ทุกคนใช้ ยังขาดส่วนสำคัญ คือการ Import รายชื่อนักเรียนเก่าที่ยังเรียนอยู่ ซึ่ง Admin เก็บใน Google Sheet เป็นหลัก Admin เสนอให้ Import ได้ทั้งนักเรียน คอร์ส และคลาส MJ จะทำให้ใช้งานได้ก่อน 15 ต.ค.
- ผมทำ ERP V2 ขึ้นมาใหม่ให้ล้อไปกับ MJ เพราะตัวแรกเก่าและข้อมูลไม่ได้อัปเดต นำกลับมาใช้ไม่ได้ V2 เพิ่ม Inbox, CRM, Report, Dashboard และเป็น Reference ให้ MJ ใน Phase 2, 3, 4
- ให้การบ้านชิ้นแรกกับ Admin (สร้าง Class, Course ตามสาขาจริง และ Invoice ทั้ง Single และ Bundle) เดียร์ส่ง Feedback มาเยอะ ผมกับ MJ คัดเป็น 3 กลุ่ม: ต้องแก้, เข้าใจผิด, วางไว้ก่อน บางสาขายังไม่สะดวกเทส ผมจึงเทสเองแทนการรอ
- e-WHT: ได้คุยกับ Sales ของ KBank ตกลงใช้ Service และกำลังเซ็นสัญญา ตอนนี้อยู่ขั้นสมัคร K-Cash Connect เมื่อเข้าใช้ได้สมบูรณ์ จะเริ่มศึกษา e-WHT
- Web Teacher กับ Krujob ได้ Prototype แรกและ Feedback จาก Shibasan แล้วต้อง Hold — ยังไม่ใช่ Priority และยังไม่มี Dev ว่างมาลอง Prototype เรื่อง Homework บน LINE OA แต่ Web Teacher ได้ Feedback เชิงบวกจากผู้ใช้จริง (K.Guitar)
- เริ่ม Brand CI และ Brand SWAG: CI ขึ้นโครง 2 แบบรอ Shibasan ตัดสินใจ SWAG ได้ Prototype คลิกเกอร์ตัวแรกแล้ว ราคาประมาณ 60–70 บาท/ชิ้น ซัพพลายเออร์กำลังปรับดีไซน์ให้ถูกลง (3–5 วันทำการ)

Progress vs Plan
- แผนจากเดือนสิงหา: (1) จบ Billing + test Phase 1 แล้วแก้ช่องโหว่เชิง model · (2) วาง scope Teacher.nockacademy.com และ Krujob · (3) เจ้าของ Video Structure · (4) ที่ทางของ Personalize Goal · (5) ตัดสิน Moving House ไปต่อหรือ park
- (1) Billing: เดินไปไกลกว่าแผนฝั่งเรื่องเงิน (90%, KMD Approve) test ต่อไปถึง 15 ต.ค. ส่วนช่องโหว่เชิง model คิด Solution ใหม่เรื่อง Duration: ให้ Duration ของ Class เป็นตัวหัก Package (Class 2 ชม. หัก 2 ชม.) ช่องโหว่อื่น (Bundle Course, Class/Session จาก Calendar, Student→LINE) ไล่ดูผ่าน Feedback ของการบ้าน
- (2) ทำแล้วและถูก Hold: ทั้งสองมี Prototype และ Feedback แล้ว
- (3) Video Structure: ผมไม่ได้ตามต่อ Shibasan จะตามเอง
- (4) Personalize Goal: Launch ไปแล้ว ผลตอบรับค่อนข้างดี แต่ยังดูเหมือนอยู่ผิดที่ผิดทาง
- (5) Moving House: ยังอยู่ใน Process แต่ Arm มีเวลา focus น้อย จึงค่อยๆ เดินไป
- ที่ล่าช้า: มีแค่เรื่องธนาคาร ตามช้าและใช้แรงมากก่อนจะเปลี่ยนวิธี

Key Insights
- Billing ต้องสมบูรณ์ก่อนไปเรื่องอื่น เพราะเป็นเรื่องเงิน ปล่อยให้เจอปัญหาทีหลังไม่ได้ จึงเป็น Priority การ test อันดับ 1
- เมื่อทางที่ "ถูก" (Bank API) ติดเพราะต้องรอฝ่ายอื่น การ Build ทางเลี่ยง (OCR) เองดีกว่ารอ และได้ผลเมื่อ KMD รับ Output
- Reference จะมีประโยชน์ก็ต่อเมื่อเดินทันงาน Dev ERP ตัวแรกตามไม่ทันจนใช้ต่อไม่ได้ V2 จึงต้องนำหน้า MJ ไปหนึ่ง Phase เสมอ
- เมื่อคนที่ควรเทสไม่มีเวลา การรอมีแต่ทำให้ Go-live ช้าลง เทสเองแล้วค่อยเอา Feedback ของเขามาเสริมเร็วกว่า
- แก้ที่ต้นตอของ model ดีกว่าไล่แพตช์ทีละเคส: ให้ Duration ของ Class หัก Package ช่วยตัดปัญหาเรื่อง Duration ได้ทั้งตระกูลในทีเดียว

Next Month Focus (ตุลาคม)
1. จบ Billing อีก 10% สุดท้าย: test ทุกสถานการณ์ที่เกิดขึ้นได้ รวมถึง Master Admin
2. ให้ฟีเจอร์ Import นักเรียน/คอร์ส/คลาสใช้งานได้ก่อน 15 ต.ค. แล้วเริ่ม Pilot (Bangna, Pattaya, LIS) ตามเก็บปัญหาทั้งระหว่างและหลังใช้งาน
3. ให้ ERP V2 นำหน้า MJ ไปหนึ่ง Phase เสมอ; MJ เริ่ม Phase 2 (Inbox > Form > CRM) ระหว่าง Pilot รัน
4. e-WHT: ให้ได้เข้าใช้ K-Cash Connect แล้วเริ่มเรียนรู้ e-WHT
5. Brand CI: ให้ได้คำตัดสินจาก Shibasan แล้วส่งต่อ Design · Brand SWAG: ลดราคาต่อชิ้นของคลิกเกอร์และไป Prototype รอบต่อไป

Risks / Decisions Needed
- ฟีเจอร์ Import ต้องเสร็จก่อน 15 ต.ค. ไม่เช่นนั้น Pilot จะเริ่มด้วยนักเรียนจริงไม่ได้
- บางสาขายังไม่พร้อมเทส ปัญหาตอนใช้งานจริงอาจโผล่ช้า ผมรับมือด้วยการเทสเอง
- Brand CI ติดรอ Shibasan ตัดสินใจ
- e-WHT ขึ้นกับการเข้าใช้ K-Cash Connect ให้สมบูรณ์
- Web Teacher และ Krujob ยัง Hold; เรื่อง Homework บน LINE OA ต้องรอ Dev ที่มีเวลาตรวจ
- Video Structure อยู่ที่ Shibasan ส่วนทิศทางของ Personalize Goal และความเร็วของ Moving House ยังเปิดอยู่
