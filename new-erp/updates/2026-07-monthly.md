Monthly Update — Jul 2026

Highlights
- Kept pushing Finance/Admin workflow discovery with Tangkwa, and did it hands-on myself even though Finance isn't my strength — I wanted to understand the real process before we build anything on top of it, not the other way around. What I found: the process itself is broken, inherited from the past, and never improved to work efficiently. That has to get stable before it becomes an ERP module.
- KMD and the bank finally cleared a big backlog of blocking tax/accounting questions: VAT status confirmed, WHT rules clarified on utilities and rent, the sibling-discount rule corrected (doesn't cross business lines — my original assumption was wrong), invoice numbering resets daily, the real monthly deadline is the 9th–10th, and bank statements can now be pulled as Excel.
- Opened two vendor threads — KBank on e-WHT, Jobcan on Payroll vs Attendance overlap — and handed both to Admin to own and chase directly. Still open at month-end.
- MJ is back in Thailand. MJ and Arm now have a real working rhythm, walking the system together — the mentoring I asked for is actually happening.
- Bus Route had to be rebuilt mid-month after the real requirement turned out deeper than expected — not just "does the customer want the bus" but "which specific days." The module isn't at Dev-ready maturity yet, so this kind of rework is expected friction, not a setback.

Progress vs Plan
- Finance as an ERP module stays on hold — deliberately. The real-world flow is too broken to encode into a system yet; building UI on top of a broken process would just digitize the dysfunction.
- Real-world Finance progress was slow this month, and not for lack of effort — nobody on the team, including me, actually has deep expertise here. Everyone's been following inherited habit without truly understanding it. So July was Learning + Research + Improvement happening at once, not execution against a checklist.
- The role split that's emerged: I own understanding the real process directly with Admin; Admin owns chasing the vendors (KBank, Jobcan) once a thread is opened. That's working, but only because I'm still actively present in both — see the Admin Workload risk below.
- Bus Route isn't behind plan either — it simply hasn't reached the Dev stage, so discovering a deeper requirement and rebuilding around it is normal at this point.

People & Team
- MJ and Arm are syncing regularly now, walking through the system together — the mentoring relationship I asked MJ to build with Arm is actually running.
- Bigger, harder to name: I'm not confident the company's overall team structure is well-designed. I can map and shape the small pod I run directly (MJ + Arm), but at the whole-company level I can't clearly see how teams are meant to hand information to each other. Everyone seems to guard their own scope, and anything outside it, nobody wants to touch. "Team," at that level, is still more abstract than concrete.

Key Insights
- Finance's core problem is people, not the lack of a system. Admin does accounting work they don't fully understand — scattered data sources, constant switching between tools, too much held in memory instead of anywhere written down.
- Progress that looks stalled on the surface can be diagnostic rather than wasted — this month's slow visible movement on Finance is evidence of how tangled the real process is, not evidence that nothing happened.
- I can shape team structure well at the pod level I'm directly inside of, but I don't have that same visibility or control at the company level — that gap is worth taking seriously, not just noting.

Next Month Focus (August)
1. ERP – Billing: it's tied into data across nearly the whole system, so it needs extra focus — watching carefully for edge cases as it goes.
2. Admin Workload — I can't step back from this yet; if I do, the team steps back too.
   - Vendor threads: e-WHT, and Attendance → Payroll.
   - Expense structure — already assigned as homework to the team, needs following up.
3. Automation for Invoice Creation — MJ needs to build this to take load off Admin this month.
4. Replan Arm's "Personalized Goal" feature — I see real potential in it, but it's currently pointed in the wrong direction. Needs to be straightened out.

Risks / Decisions Needed
- If KMD/KBank shifts WHT from a manual process to KBank's service, that's a workflow change requiring sign-off from both KMD and KBank on what changes downstream.
- Company-level team structure is an open question I don't have a clear picture of — worth surfacing as a real structural issue, not just something specific to Finance.
- Arm's Personalized Goal feature needs a direction/scope decision this month — the potential is real, but it's currently in the wrong place.
- I still can't disengage from Admin Workload support without the team disengaging too — that dependency is worth watching, not just accepting.

---

อัปเดตประจำเดือน — กรกฎาคม 2026

Highlights
- เดินหน้า Finance/Admin workflow discovery กับ Tangkwa ต่อ และลงมือทำเองโดยตรงทั้งที่ Finance ไม่ใช่จุดแข็งของผม — เพราะอยากเข้าใจ process จริงก่อน ไม่ใช่สร้างอะไรทับลงไปก่อนแล้วค่อยเข้าใจทีหลัง สิ่งที่เจอคือ ตัว process เองมีปัญหามาจากอดีต ไม่เคยถูกปรับปรุงให้ทำงานง่ายขึ้นเลย ต้องทำให้นิ่งก่อนถึงจะเอาไปเป็น module บน ERP ได้
- KMD และธนาคารตอบคำถามภาษี/บัญชีที่ค้างมานานมาชุดใหญ่ในที่สุด: ยืนยันสถานะ VAT, กฎ WHT ชัดขึ้น (ค่าน้ำ-ไฟ, ค่าเช่า), แก้กฎส่วนลดพี่น้อง (ไม่ข้าม business line — ที่เดาไว้ก่อนหน้านี้ผิด), เลข invoice reset ทุกวัน, deadline จริงคือวันที่ 9-10 ของเดือน, และดึง statement ธนาคารเป็น Excel ได้แล้ว
- เปิดสายกับ vendor 2 เจ้า — KBank เรื่อง e-WHT และ Jobcan เรื่อง Payroll ทับซ้อนกับ Attendance ไหม — ส่งต่อให้ Admin เป็นเจ้าของและไล่ตามเองทั้งคู่ ยังค้างอยู่ ณ สิ้นเดือน
- MJ กลับไทยแล้ว MJ กับ Arm มีจังหวะทำงานร่วมกันจริงแล้ว เดิน walkthrough ระบบด้วยกัน — mentoring ที่ผมขอไว้เกิดขึ้นจริงแล้ว
- Bus Route ต้องรื้อกลางเดือน หลัง requirement จริงลึกกว่าที่คิด — ไม่ใช่แค่ "ลูกค้าอยากใช้รถไหม" แต่ต้องรู้ "วันไหนบ้าง" โมดูลนี้ยังไม่ถึงจุดพร้อม Dev เลยถือเป็นแรงเสียดทานปกติของช่วงนี้ ไม่ใช่ความล้มเหลว

Progress vs Plan
- Finance ในฐานะ module บน ERP ยัง Hold ไว้โดยตั้งใจ — flow จริงยังพังเกินกว่าจะเอาไปใส่ในระบบตอนนี้ ถ้าสร้าง UI ทับ process ที่พังอยู่ ก็แค่ทำให้ความผิดปกตินั้นกลายเป็นดิจิทัล
- Finance ฝั่งโลกจริงคืบหน้าช้าเดือนนี้ ไม่ใช่เพราะไม่พยายาม แต่เพราะไม่มีใครในทีม รวมถึงตัวผมเอง ที่เชี่ยวชาญเรื่องนี้จริงๆ ทุกคนทำตามความเคยชินโดยไม่เข้าใจลึกๆ กรกฎาคมนี้จึงเป็น Learning + Research + Improvement พร้อมกัน ไม่ใช่การลงมือทำตาม checklist
- บทบาทที่เกิดขึ้นเองคือ: ผมเป็นคนเข้าใจ process จริงโดยตรงกับ Admin ส่วน Admin เป็นคนไล่ตาม vendor (KBank, Jobcan) เมื่อสายถูกเปิดแล้ว — มันเวิร์ก แต่เวิร์กเพราะผมยังอยู่ในทั้งสองฝั่งจริงๆ (ดู risk เรื่อง Admin Workload ด้านล่าง)
- Bus Route ก็ไม่ได้หลุดแผนเช่นกัน — แค่ยังไม่ถึงจุด Dev เจอ requirement ที่ลึกกว่าเดิมแล้วต้องรื้อ ถือเป็นเรื่องปกติของช่วงนี้

People & Team
- MJ กับ Arm sync กันสม่ำเสมอแล้ว เดิน walkthrough ระบบด้วยกัน — ความสัมพันธ์แบบ mentoring ที่ผมขอ MJ ให้สร้างกับ Arm กำลังทำงานจริง
- เรื่องที่หนักกว่าและอธิบายยากกว่า: ไม่มั่นใจว่าโครงสร้างทีมทั้งบริษัทถูกออกแบบมาดีจริงไหม ผมออกแบบและดูแล pod เล็กๆ ที่ตัวเองอยู่ในนั้นได้ (MJ+Arm) แต่ในระดับทั้งบริษัท มองไม่เห็นภาพว่าทีมต่างๆ ควรส่งต่อข้อมูลกันยังไง ทุกคนดูป้องกันขอบเขตงานตัวเองเป็นค่าเริ่มต้น นอกเหนือจากนั้นไม่มีใครอยากยุ่ง คำว่า "Team" ในระดับนั้นยังเป็นนามธรรมมากกว่ารูปธรรม

Key Insights
- ปัญหาหลักของ Finance คือเรื่องคน ไม่ใช่การขาดระบบ — Admin ทำงานบัญชีที่ตัวเองไม่เข้าใจทั้งหมด ข้อมูลกระจัดกระจาย สลับเครื่องมือตลอด เก็บไว้ในความจำเยอะเกินไปแทนที่จะจดไว้ที่ไหนสักที่
- ความคืบหน้าที่ดูเหมือนช้าบนผิวหน้า อาจเป็นสัญญาณวินิจฉัย ไม่ใช่เวลาที่เสียเปล่า — ความคืบหน้าที่ช้าของ Finance เดือนนี้คือหลักฐานว่า process จริงซับซ้อนแค่ไหน ไม่ใช่หลักฐานว่าไม่มีอะไรเกิดขึ้น
- ผมออกแบบโครงสร้างทีมได้ดีในระดับ pod ที่ตัวเองอยู่ในนั้นโดยตรง แต่ไม่มี visibility หรือ control แบบเดียวกันในระดับบริษัท — ช่องว่างนี้ควรถูกจริงจังกับมัน ไม่ใช่แค่สังเกตแล้วผ่านไป

Next Month Focus (สิงหาคม)
1. ERP – Billing: ผูกกับข้อมูลเกือบทั้งระบบ ต้อง Focus เป็นพิเศษ — ระวัง Case ต่างๆ ที่อาจเกิดขึ้นระหว่างทาง
2. Admin Workload — ยังถอยออกมาไม่ได้ ถ้าถอย ทีมจะถอยตามแน่นอน
   - สาย vendor: e-WHT และ Attendance → Payroll
   - โครงสร้าง Expense — มอบเป็นการบ้านให้ทีมไปแล้ว ต้องคอยติดตาม
3. Automation สร้าง Invoice — MJ ต้องสร้างมาช่วยแบ่งเบา Admin เดือนนี้
4. ปรับแผน Feature "Personalized Goal" ของ Arm — เห็น Potential จริง แต่ตอนนี้อยู่ผิดที่ผิดทาง ต้องตบให้เข้าที่

Risks / Decisions Needed
- ถ้า KMD/KBank ตัดสินใจเปลี่ยน WHT จากเขียนมือเป็นใช้ service ของ KBank นั่นคือการเปลี่ยน workflow ต้องให้ทั้ง KMD และ KBank ยืนยันผลกระทบที่ตามมา
- โครงสร้างทีมระดับบริษัทยังเป็นคำถามเปิดที่ผมยังไม่เห็นภาพชัด — ควรหยิบขึ้นมาพูดในฐานะปัญหาเชิงโครงสร้างจริงๆ ไม่ใช่แค่ปัญหาเฉพาะฝั่ง Finance
- Feature Personalized Goal ของ Arm ต้องตัดสินใจทิศทาง/scope เดือนนี้ — potential มีจริง แต่ตอนนี้วางผิดที่
- ยังถอยออกจากการซัพพอร์ต Admin Workload ไม่ได้ ถ้าถอยทีมจะถอยตาม — dependency นี้ต้องจับตา ไม่ใช่แค่ยอมรับไปเฉยๆ
