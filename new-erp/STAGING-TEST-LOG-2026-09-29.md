# Staging Test Log — 2026-09-29

> เทสบน `https://erp-staging.nockacademy.com` ตาม Checklist ใน Asana (Task "Test · ทดสอบระบบ ERP Staging", S01–S20)
> ผู้เทส: Claude (ล็อกอิน Director — NockAcademy LMS) · ใช้เฉพาะ **TEST-Branch** · ไม่แตะข้อมูล Thong lo ของ Dev
> ผลแต่ละข้อ: ✅ ผ่าน · ❌ เจอปัญหา · ⚠️ ผ่านแต่มีข้อสังเกต · ⏭️ ยังไม่ได้เทส (บอกเหตุผล)
> รหัส C/H/M = บั๊กเดิมจาก `STAGING-AUDIT-2026-09-23.md`

หมายเหตุเครื่องมือ: เบราว์เซอร์ที่ใช้เทสปิด `confirm()` ของเบราว์เซอร์ไว้ (ตอบ "ยกเลิก" อัตโนมัติ) → ปุ่มที่ Staging ใช้ native confirm (เช่น ออกจากหน้าแก้ไขตอนมีข้อมูลค้าง) จะกดยืนยันไม่ได้ ต้องเทสด้วยมือ

## ⚠️ สภาพ Staging วันนี้
**ข้อมูลใช้งานถูกรีเซ็ตหมด** — Billing 0 ใบ (เดิม 22), Students 0, Classes 0, Staff เหลือแค่ Director · ที่ยังอยู่: สาขา Thong lo/TEST-Branch + ตั้งค่าสาขา (แพ็กเกจ, ค่าธรรมเนียม, โปร, วันหยุด, LINE) → ต้องสร้างข้อมูลทดสอบใหม่ทั้งชุดใน TEST-Branch

## ข้อมูลทดสอบที่สร้างเพิ่มวันนี้ (TEST-Branch)
| ประเภท | ชื่อ |
|---|---|
| General Fee (Mock test) | TEST-Mock ฿300 |
| Family | Tester Family (TEST-Parent Tester, Mom, @testparent, test-parent@example.com, Walk-In) — ตั้งใจใส่เบอร์ abc / postcode abcde / วันเกิด 2030 เพื่อเทส |
| Students | TEST-StudentA "Aye" (ป.5) · TEST-StudentB "Bee" (ป.1) — ยังไม่ผูกครอบครัว |
| Course | TEST-Course Maths P5 Monthly (Single, ป.5, Monthly ฿4,500, Course fee ฿200) |
| Class | Maths (Learning, Group, Kru Test, ทุก Tue 10:00–11:00 เริ่ม 29 ก.ย.) — StudentA + StudentB |
| Class | TEST-Exam clash (Test, Single, Kru Test, Tue 6 ต.ค. 13:00–14:00) |
| Invoice | 260929010020001 — StudentA, Maths Monthly 2 งวด (6 ต.ค.–30 พ.ย.) ฿10,250 · Self-approved · ส่งแล้ว (No LINE linked) · จ่ายครบ (เงินสด ฿5,000 + โอน ฿5,250 พร้อมสลิปทดสอบ) · ใบเสร็จออกแล้ว (ยอดผิด ฿10,750) |
| Staff | TEST-Teacher-01 ("Kru Test", no-login, Teacher @TEST-Branch จ–ศ, Maths+English, test-teacher01@example.com) |

## S02 · ตั้งค่าสาขา: ข้อมูล, ธนาคาร, LINE, เวลาเปิด
- ✅ Branch Info: แก้ไข → เบอร์ "abc" ถูกกัน ("Use only digits, spaces, and + - ( )") · ห้อง −1 ถูกกัน · ปุ่ม Save ล็อก
- ⚠️ ข้อความ error ยังเป็น Zod ดิบ "Too small: expected number to be >=1"
- ⚠️ ออกจากหน้าแก้ไข/สลับแท็บตอนมีข้อมูลค้าง ใช้ native `confirm()` (ไม่ใช่ dialog ของระบบ)
- ✅ Bank Account (H11): TEST-Branch = Liclass → บัญชี Liclass Education ตรงแบรนด์ · Invoice Memo ยังว่าง ("No memo set")
- ✅ LINE Integration: มีค่าครบ + กด Verify สำเร็จ (Last verified อัปเดตเป็น 29 Sep 11:19) · มี Webhook URL ให้คัดลอก
- ✅ Scheduling: พรีวิวตามวันที่, เวลาเปิด จ–ศ 10–20, คัดลอกไป Weekdays/Weekend, Special Schedules (ว่าง)

## S03 · ตั้งค่าสาขา: วิชา, เกรด, แพ็กเกจ, ค่าธรรมเนียม, โปร, วันหยุด
- ✅ Subjects: Maths, English
- ✅ Grades: ป.1–ม.6 + K1–K3 ครบ
- ✅ Packages: Hour 12/24/48/72/96 · Week 4w/8w "Multi class & Hour" · Month — ราคา Maths ป.5/ป.6 (Hour + Month) บันทึกอยู่ · Week ยังไม่มีราคา
- ✅ General Fees: ช่องว่างขึ้น error "Name and a non-negative price are required" (เดิมเงียบ) · เพิ่ม TEST-Mock ฿300 สำเร็จ
- ⚠️ General Fees: กด Enter ยังไม่ submit ต้องกดปุ่ม
- ✅ Promotions: TEST-Promo −10% (12 Hrs.) แสดง · ⚠️ ระบบยังเขียนว่า "Applying a promotion on Create Invoice is coming soon"
- ✅ Holidays (สาขา): TEST-Holiday 13 ต.ค. + TEST-Holiday-2 30 ก.ย. (ใหม่ — ไม่ได้สร้างวันนี้) · มี Import from global / Manage global calendar

## S04 · ตั้งค่าระบบ
- ✅ ภาษา: เปลี่ยนเป็นภาษาไทยได้ (หน้า Settings + เมนูข้างแปลเป็นไทย) → เปลี่ยนกลับเป็น English แล้ว
- ⚠️ ภาษาไทยยังแปลไม่ครบ: หน้า Billing ทั้งหน้ายังเป็นอังกฤษ · Notification Preferences ยังเป็นอังกฤษ
- ⚠️ ไม่มีช่อง "รูปแบบวันที่" แล้ว (เหลือ ภาษา / Timezone / สกุลเงิน — Timezone, สกุลเงิน มีตัวเลือกเดียว)
- ✅ Global Subjects: หน้า rename/recolour + Add subject มีครบ (ไม่ได้กดเปลี่ยนจริง เพราะกระทบทุกสาขารวม Thong lo)
- ✅ Global Holidays: มี Add holiday / Broadcast to all branches / กรองแบรนด์ · ตอนนี้ว่าง · ⏭️ ไม่ได้กด Broadcast (จะยิงไป Thong lo ของ Dev ด้วย)
- ❌ Invoice Memos: หน้ายังว่างเปล่า ไม่มีรายการแบรนด์ให้แก้ (รอ 10 วิแล้ว)
- ⏭️ Notification Preferences: ระบบเขียนว่า "not ready"

## S05 · บุคลากร
- ✅ Add Staff 2 ขั้น (Info → Role) · สร้าง TEST-Teacher-01 สำเร็จ + list อัปเดตทันที (ป้าย Part-time, วิชา, สาขาถูก)
- ❌ H8 ยังไม่แก้: ปิด "Requires login" แล้ว Email ยังมี * และขึ้น "Invalid email" ถ้าเว้นว่าง → ครูพาร์ทไทม์ที่ไม่มีอีเมลสร้างไม่ได้
- ✅ No-login บังคับ Role = Teacher ("No-login staff must be Teacher")
- ⚠️ ขั้น Role: สาขาของ role ตั้งต้นเป็น Thong lo แม้ Default Branch ที่เลือกในขั้นแรกคือ TEST-Branch (ต้องเปลี่ยนเอง)
- ⚠️ ฟอร์มภาษาปน (หัวข้ออังกฤษ + คำอธิบายไทย)
- ⏭️ H9 (ลบครูที่ยังสอนคลาส) / H10 (Director ลบตัวเอง): ไม่ได้กด — การลบเป็น action ย้อนกลับไม่ได้ ระบบของผมไม่อนุญาต → **เจ้าของต้องเทสเอง**
- ⏭️ หลาย role ต่อคน: มีปุ่ม "Add more Role" แต่ไม่ได้เทส (no-login ใช้ได้แค่ Teacher)

## S06 · ครอบครัว
- ✅ Add Family: กด Save ตอนว่าง → Name/Surname/Line ID ขึ้น "Required" · อีเมลผิด → "Invalid email"
- ✅ ชื่อครอบครัวตั้งจากนามสกุล → "Tester Family" (เดิมได้ "Family Family" — แก้แล้ว)
- ✅ Acquisition source (Walk-In) + Set as default parent + ปุ่ม Add another Parent / Add more phone มีครบ
- ❌ H7 ยังไม่แก้: เบอร์ "abc" (โชว์ "abc (default)"), รหัสไปรษณีย์ "abcde", วันเกิดปี 2030 → บันทึกผ่านหมด
- ⚠️ ฟอร์มไม่มีช่องเลือกสาขา — ใช้สาขาที่เลือกอยู่ตอนนั้น (TEST-Branch) อัตโนมัติ
- ⚠️ Add Student to Family ตอนสาขายังไม่มีนักเรียนเลย ยังขึ้น "Every student at this branch is already linked to a family" (ข้อความชวนเข้าใจผิด)

## S07 · นักเรียน & LINE Link Code
- ✅ New Student (ชื่อ/ชื่อเล่น/เกรด) สร้างได้ + ขึ้น list ทันที · มีป้ายเตือนว่าปุ่ม Add Student เป็นทางลัดช่วง build (production จะสร้างจาก billing)
- ❌ M7 ยังไม่แก้: dropdown เกรดไม่มี K1–K3 (ทั้งที่สาขาเปิด K1–K3) และไม่กรองตามเกรดที่สาขาเปิด (โชว์ ป.1–ม.6 ทั้งหมด)
- ⚠️ C6: นักเรียนใหม่ที่ยังไม่มีคอร์ส = Inactive, Time Available 0h, "0 active students" — สอดคล้องกันแล้ว (ต้องเช็คซ้ำหลังจ่ายเงินเข้าคลาสใน S19)
- ⚠️ หน้า list ไม่แสดงเกรดของนักเรียน (ต้องเปิดโปรไฟล์ถึงเห็น "ป.5")
- ❌ ปุ่ม Message / Call ในโปรไฟล์ยังกดแล้วไม่มีอะไรเกิดขึ้น
- ⚠️ แท็บโปรไฟล์ยังใช้ emoji เป็นไอคอน (👤 📋 📅 ✅ 💰 📝 🔗)
- ✅ แท็บ LINE: Generate link code ได้ (THY9YE) + ปุ่ม Copy / Send code on LINE (ลิงก์ line.me/R/oaMessage/@998custi) / Generate new code
- ⏭️ ผูก LINE จริง + โค้ดไม่ตรง → Notifications: ต้องใช้มือถือผู้ปกครองส่งโค้ดเข้า OA จริง → **เจ้าของต้องเทสเอง**
- ⏭️ Smart search: ยังไม่ได้เทส (ทำใน S20)

## S08 · คอร์ส
- ✅ Create Course: การ์ดสาขา + "5 package plans" + Single/Bundle + วิชา + เกรด (Select all) + Duration type (None/Hourly/Weekly/Monthly)
- ✅ ราคาเติมอัตโนมัติจากตารางสาขา: Maths ป.5 Monthly → ฿4,500 ("Auto-filled from the branch chart")
- ✅ แก้ราคาเป็น ฿4,000 → ขึ้นช่อง "Reason for price change *" และกดสร้างไม่ได้ถ้าไม่ใส่ ("A remark is required when the price differs from the chart")
- ✅ Course fee ติดลบ (−100) ถูกกัน · ตั้ง ฿200 ได้
- ❌ ชื่อคอร์ส: ฟอร์มบอก "Name the course, or leave a default by subject and grade" แต่พอเว้นว่างกลับขึ้น "Name is required." (ชื่อ default ไม่ถูกเติมให้จริง)
- ⚠️ ถึงสาขาเปิดวิชาเดียว (Maths) ก็ยังต้องกดเลือกวิชาเอง ก่อนเลือกจะขึ้นเตือน "ป.5: no chart price" ชวนสับสน
- ⚠️ การ์ดคอร์สไม่แสดง Course fee ฿200
- ✅ สร้างเสร็จ list อัปเดตทันที (1 course · Single · Active)

## S09 · คลาส
- ✅ Class for: Learning / Test / Interview with parent / Other × Group / Single มีครบ · Learning เปลี่ยนเป็นฟอร์ม recurring (Starting date + วัน×เวลา + "Different teacher for this row" + Add another day + Multiple days)
- ✅ เลือกคอร์สจาก "Select Course" แล้วเติมวิชา/ประเภทให้อัตโนมัติ
- ✅ H2 แก้แล้ว: เลือกวันเสาร์ (สาขาปิด) → ขึ้น "Branch is closed on Saturdays" และกด Create แล้วไม่สร้าง · ช่องชั่วโมงอิงเวลาเปิดสาขา (10–19 สำหรับคาบ 1 ชม.)
- ⚠️ ก่อนเลือก Class for ช่องชั่วโมงยังโชว์ 09–20 (ยังไม่อิงสาขาจนกว่าจะเลือกวันที่)
- ✅ สร้างคลาส Tue 10:00 → gen 8 คาบ (29 ก.ย. – 24 พ.ย.) **ข้าม 13 ต.ค. (วันหยุด) ถูกต้อง**
- ✅ H3 แก้แล้ว: คลาสใหม่ครูคนเดิม Tue 6 ต.ค. 10:30 → เตือน "Oct 6: teacher already booked" + toast "Teacher is already booked 10:30–11:30 on Tuesday…" และไม่สร้าง
- ✅ C7 แก้แล้ว: เพิ่ม 2 คนพร้อมกัน → ทั้งคู่เป็น subscription "Renews 29 Oct" เหมือนกัน
- ❌ H1 ยังไม่แก้: นักเรียน ป.1 เข้าคลาสคอร์ส ป.5 ได้โดยไม่มีเตือน → หัวคลาสกลายเป็น "Maths · ป.1, ป.5"
- ⚠️ Add Student ในคลาสให้สิทธิ์เรียนทันที (Renews 29 Oct) โดยไม่ผ่าน Billing — ต้องยืนยันว่าเป็นทางลัดช่วง build เท่านั้น
- ⚠️ คลาส Test แบบครั้งเดียวถูกนับรวมใน "Recurring classes" (การ์ดบอก 2)
- ⚠️ ชื่อคลาสที่พิมพ์ไว้ถูกล้าง/โชว์เป็น placeholder ระหว่างเปลี่ยน dropdown (สุดท้ายบันทึกชื่อถูก)
- ⏭️ จำกัด 6 คน/คลาส: มีข้อความ "Should not exceed 6 students / class" แต่ยังไม่ได้เทสเพิ่มคนที่ 7 (มีนักเรียนทดสอบแค่ 2 คน)

## S10 · ปฏิทิน
- ✅ 4 มุมมองทำงาน: Day (บอร์ดครู × ชั่วโมง + ปุ่ม Create Class ในช่องว่าง) · Week · Month · List (จัดกลุ่มตามวัน)
- ✅ Week: วันหยุด 30 ก.ย. และ ส.–อา. แรเงาเป็นวันปิด
- ⚠️ Month: ไม่แสดงวันหยุด 30 ก.ย. (ไม่แรเงา/ไม่มีป้าย)
- ✅ ชื่อครูแสดง "Kru Test" ตรงกันทุกหน้า (ไม่มี UUID)
- ⚠️ List: คาบหลัง 27 ต.ค. ขึ้น "0 students" เพราะสิทธิ์ subscription หมด 29 ต.ค. (ตรรกะน่าจะถูก แต่ไม่มีป้ายบอกว่าทำไมนักเรียนหาย)
- ⚠️ คลาส TEST-Exam (Test/Single) โชว์ชื่อเป็น "Maths" + ไอคอน group ในปฏิทิน ไม่ใช่ชื่อคลาสที่ตั้ง
- ⏭️ Add Session จากปฏิทิน: ยังไม่ได้เทส

## S11 · คาบเรียน (Session)
- ❌ สถานะตามเวลา: คาบวันนี้ 10:00–11:00 ตอน 11:31 ยังเป็น "Upcoming" (ควร Ended)
- ❌ พอกดเช็คชื่อคาบที่เลยเวลาแล้ว → กลายเป็น "Live — Class started at 11:35" (หลังเวลาจบ) แล้วค่อยเปลี่ยนเป็น "Ended"
- ❌ ข้อความสถานะ Ended โชว์เวลาดิบ: "Class ended · start 11:35 · end 2026-09-29T04:35:33.695Z"
- ✅ Reschedule: ย้ายนักเรียนเข้าคาบอื่นในสัปดาห์เดียวกันได้ + toast "Rescheduled to 2026-10-06" · ⚠️ toast โชว์วันที่แบบ ISO ไม่มีเวลา · ⚠️ ระบบเสนอให้ย้ายเข้าคลาสประเภท "Test" (สอบ) ได้ด้วย · ⚠️ ข้อความบอก "(Wed–Sun)" แต่คาบต้นทางเป็นวันอังคาร
- ⏭️ Add Session แบบ attach class / แก้เฉพาะครั้ง / Availability timeline / ลบ session (H12 — ลบ = ย้อนกลับไม่ได้ ระบบไม่ให้ผมกด)

## S12 · เช็คชื่อ (Attendance)
- ✅ กดเช็คชื่อครั้งแรก = บันทึกทันที (Present 1/2) — เดิมต้องกด 2 ครั้ง
- ⚠️ ไม่มี toast ตอนเช็คชื่อ (มา/ขาด/ลา) เลย
- ✅ Present / Absent / Leave บันทึกได้ทุกแบบ (ไอคอนเปลี่ยนสี)
- ❌ C4 ยังไม่แก้: คาบอนาคต (6 ต.ค.) เช็ค Present ได้ และคาบกลายเป็น "Live — Class started at 11:36" ทันที
- ⚠️ กดลาไม่บอกโควตาลา/ผลต่อแพ็กเกจ
- ⚠️ ลำดับแถวนักเรียนสลับทุกครั้งที่กด (เสี่ยงกดผิดคน)
- ❌ หน้า Attendance: การ์ดสรุป (PRESENT 2 / ABSENT 1 / TOTAL DEDUCTED 3) **ไม่เปลี่ยนตามสัปดาห์** — สัปดาห์ 28 ก.ย.–4 ต.ค. และ 5–11 ต.ค. ได้ตัวเลขเท่ากัน (นับ Present ของ 6 ต.ค. เข้าสัปดาห์นี้ด้วย)
- ❌ M6 ยังไม่แก้: ตัวกรองวิชาเป็นค่า mock (Eng, Math, Science, Thai, Eng (Active), Eng (Grammar)) ไม่ใช่ Maths/English ของจริง
- ⚠️ ABSENT ของนักเรียน subscription ขึ้นคำว่า "Deducted"
- ⚠️ นักเรียนที่กดลาแล้วค่อย Reschedule → ในหน้า Attendance ขึ้นแค่ "Reschedule" ข้อมูลการลาหายไป
- ⚠️ Attendance → ปุ่ม Reschedule ยัง "coming soon"
- ✅ หน้า Sessions: สรุป Live/Today/Upcoming/Completed + ตัวนับ ✓1 L0 ✗1 ตรงกับที่เช็ค · ⚠️ ยังใช้ emoji (🟢📅✅) เป็นไอคอนสถานะ

## S13 · สรุปการเรียน
- ✅ Present → เกิดช่องสรุปให้ครูอัตโนมัติ (STUDENT SUMMARIES · 1 pending)
- ✅ Save Draft (toast "Draft saved") → Submit for approval (toast "Submitted for approval")
- ✅ Request changes: ต้องใส่เหตุผล → toast "Sent back to the teacher" + โชว์ "Changes requested: …" + ปุ่ม Resubmit · ⚠️ ถ้าไม่ใส่เหตุผลกด Send back แล้วเงียบ ไม่มีข้อความเตือน
- ❌ H6 ยังไม่แก้: คนเขียน/ส่งสรุปกด Approve ของตัวเองได้ (toast "Summary approved")
- ❌ H6: ปุ่ม "Send to Parent" โผล่ตั้งแต่ยังรออนุมัติ
- ⚠️ หน้า Summaries: การ์ด "NOT WRITTEN YET 1" นับสรุปของคาบ 6 ต.ค. ที่อยู่นอกสัปดาห์ที่เลือก
- ❌ **บั๊กใหม่:** Send to Parent → toast "Summary sent to parent" + สถานะ "Sent" ทั้งที่นักเรียนยังไม่ผูกครอบครัว/LINE (ควรขึ้น "No LINE linked" และไม่ส่ง) — หน้า Summaries ก็ขัดกันเอง: ป้าย "Sent" แต่เขียนว่า "Parent not linked to LINE"

## S14 · Billing: สร้างใบแจ้งหนี้
- ✅ เลือกลูกค้า (นักเรียน) → คอร์ส → คลาส/วันเริ่ม → งวด ครบ
- ✅ C2 แก้แล้ว: เริ่ม 29 ก.ย. 2 งวด → 29 ก.ย.–31 ต.ค. "4 sessions · 4h" (ข้าม 13 ต.ค.) · เริ่ม 6 ต.ค. → 6 ต.ค.–30 พ.ย. "7 sessions · 7h" ถูก
- ✅ Pro-rate: ก.ย. 1 คาบ → 30% ฿1,350 · ต.ค. 3 คาบ → 100%
- ⚠️ ช่วงวันที่ขัดกันเอง: หัวบรรทัด "Tue 6 Oct → Tue 24 Nov" แต่ข้างล่าง "→ Mon 30 Nov"
- ✅ Course fee ฿200 × 2 งวด = ฿400 รวมอัตโนมัติ
- ✅ นักเรียนมี subscription อยู่แล้ว → เตือน + บังคับใส่เหตุผล
- ❌ H4 ยังไม่แก้: Periods = −2 → ยอด ฿−9,400 (ปุ่มถูกล็อกเพราะเหตุผลอื่น)
- ❌ H5 ยังไม่แก้: ค่ารถ Pickup + Drop off ติ๊กให้ทุกรอบอัตโนมัติ (฿2,100) · ✅ ติ๊กออกรายขาได้ ยอดคำนวณใหม่ถูก (฿1,050) · ⚠️ หัวข้อยังเขียน "Pickup & Drop off"
- ✅ Advance Optional (TEST-Mock ฿300) · Concession −฿500 + เหตุผล · Check Promotion ("Needs 12 Hrs. — currently 0")
- ✅ ยอดรวม ฿10,250 = 9,000 + 400 + 1,050 + 300 − 500 ถูกต้อง
- ❌ Select Class ยังเสนอคลาสสอบครั้งเดียว (TEST-Exam) ให้คอร์สรายเดือน · ชื่อครูในนี้ "TEST-Teacher-01" แต่หน้าอื่น "Kru Test"
- ❌ tooltip ยังหลุด dev note: "(D3)", "Delete draft — lands with Step 7 (Save Draft)"
- ⏭️ Book fee: ไม่ได้เทส

## S15 · Billing: PDF → อนุมัติ → ส่งผู้ปกครอง
- ✅ C1 แก้แล้ว: Generate PDF เสร็จใน ~12 วิ → "Waiting for approval" · ⚠️ ไม่มี toast ตอนเสร็จ
- ✅ C3: ยอด list = drawer = PDF = ฿10,250
- ⚠️ drawer โชว์ "1m" (ซื้อ 2 เดือน), เวลา "10:00:00", ค่ารถวันที่แบบ ISO "2026-10-06 to 2026-11-24", "Mock examTEST mock Oct" (ไม่เว้นวรรค)
- ⚠️ ลิงก์ LINE ท้าย PDF = lin.ee/59Kc8QC ไม่ตรงกับ Add-friend URL ของสาขา (lin.ee/p4w3XA7)
- ⚠️ ไฟล์ PDF อยู่บนลิงก์สาธารณะ (r2.dev) เปิดได้โดยไม่ต้องล็อกอิน — มีชื่อลูกค้า/ยอดเงิน
- ✅ Maker–Checker: คนสร้างไม่มีปุ่ม Approve ปกติ → มี "Approve with Reason" (ต้องใส่เหตุผลถึงกดได้ + บันทึก "Self-approved · Reason" ใน workflow)
- ✅ Send to Parent: ไม่ใส่ Note to parent → ปุ่มล็อก ("required for Liclass") · มี dialog ยืนยัน · ไม่มี LINE → toast "nothing was delivered" + ปุ่ม Send again + ป้าย "No LINE linked"
- ❌ ขั้น "Send to Parent" ใน workflow ยังติ๊ก ✓ ทั้งที่ส่งไม่ถึง
- ✅ หลังส่งแล้วแก้ไขไม่ได้ ("Only a draft invoice can be edited")
- ⏭️ Retry PDF (ไม่มีใบค้าง) · ผู้ปกครองได้รับทาง LINE จริง (ไม่มีผู้ปกครองที่ผูก LINE)

## S16 · Billing: รับเงิน → Claim → ใบเสร็จ → ส่งบัญชี
- ✅ กันยอดเกิน: ใส่ ฿20,000 → "Amount can't exceed the outstanding balance of ฿10,250"
- ✅ จ่ายบางส่วนเงินสด ฿5,000 → "Payment logged — pending verification" → Confirm (มี dialog ยืนยัน) → "Payment verified" · ยอดค้างเหลือ ฿5,250
- ❌ คนบันทึกเงินกด Confirm เองได้ (ไม่มีคนที่ 2 ตรวจเงิน)
- (รอบ 2 — เทสต่อหลังเจ้าของสั่ง "Test ต่อเลย")
- ⚠️ ช่อง Amount เติมยอดค้างให้อัตโนมัติ (฿5,250) — ถ้าพิมพ์ทับโดยไม่ลบก่อนจะกลายเป็น 52505250 แล้วขึ้น error เกินยอด
- ⚠️ โอนเงิน (Bank transfer) โดยไม่แนบสลิปก็บันทึกได้ — สลิปไม่บังคับ
- ✅ Reject pay slip: ไม่ใส่เหตุผล → toast "Enter a reason for rejecting this pay slip" · ใส่เหตุผล → "Payment rejected" + บันทึก "Pay slip rejected — เหตุผล" ใน workflow
- ✅ แนบรูปสลิป (PNG) ได้ มีพรีวิว + Log Payment → Confirm → verified · จ่ายครบ ฿10,250
- ❌ Bank reconciliation: ช่อง "Bank transaction id" + ปุ่ม Add กดแล้วไม่บันทึก (ไม่มี request ไปเซิร์ฟเวอร์ ไม่มี toast) ทั้งคลิกและกด Enter · ช่องแรกเติมเลข ref ของรายการที่ถูก reject ไว้ให้ (TESTREF5250) ไม่ใช่ของรายการที่ confirm
- ✅ Auto-claim: จ่ายครบแล้วนักเรียน A → Active, Subscription 29 ก.ย.–30 พ.ย., 8h / 8 classes ตรงกับที่ซื้อ (C6 ผ่าน) · Students list: "2 active students"
- ✅ Revenue การ์ด = ฿10.3K · list = ฿10,250
- ✅ Split Receipt: แบ่งรายการเป็นหลายใบได้ ส่วนลด ฿500 กระจายตามสัดส่วนอัตโนมัติ · ⚠️ ข้อความ "฿500discount" ไม่เว้นวรรค
- ❌ **บั๊กเงิน:** ใบเสร็จออกยอด **฿10,750** (drawer + PDF) ทั้งที่ใบแจ้งหนี้/เงินที่รับจริง = ฿10,250 — PDF มีบรรทัด Concession −฿500 แต่ Sub Total/Total ไม่หักออก
- ❌ เลขใบเสร็จ = 260929010020001 ซ้ำกับเลขใบแจ้งหนี้
- ❌ PDF ใบเสร็จเขียนวิธีชำระ "Bank Transfer" อย่างเดียว ทั้งที่ ฿5,000 จ่ายเงินสด
- ✅ Send Receipt to Parent: มี dialog ยืนยัน → ไม่มี LINE → toast "nothing was sent…" + ป้าย No LINE linked + **ไม่ติ๊ก ✓** (ถูกต้องกว่าฝั่ง Invoice)
- ⏭️ Send to accountant: ไม่ได้กด (ส่งอีเมลจริง)

## S17 · Billing: แบบร่าง, แก้ไข, Void & ตัวกรอง
- ✅ Save draft → toast "Invoice saved as draft" + list อัปเดตทันที
- ❌ แบบร่างได้เลขใบกำกับจริงทันที (260929010020001) → ถ้าลบ/void แบบร่าง เลขจะขาดช่วง
- ✅ แก้ได้เฉพาะ Draft
- (รอบ 2) สร้างใบที่ 2 ให้ StudentB (Maths P5, 1 งวด ฿1,850) → ⚠️ H1 ฝั่ง Billing ด้วย: นักเรียน ป.1 ซื้อคอร์ส ป.5 ได้โดยไม่มีเตือน
- ✅ M8: เลขต่อเนื่อง 260929010020001 → 260929010020002 (แบรนด์เดียว ยังไม่ได้เทสข้ามแบรนด์)
- ✅ Void: ไม่ใส่เหตุผล → toast "Enter a reason for voiding this invoice" · ใส่เหตุผล → "Invoice voided" + ป้าย "This invoice is void · เหตุผล" · ⚠️ ช่อง Reason ยังไม่มี * · ข้อความ "…0002will" ยังไม่เว้นวรรค
- ✅ Void ไม่ได้ถ้ามีการจ่ายเงินแล้ว ("Can't void an invoice with payment against it")
- ❌ **บั๊กใหม่:** ใบที่ Void เป็นแบบร่างที่ไม่เคยส่ง แต่ workflow ขึ้น "Send to Parent ✓ Sent"
- ✅ ตัวกรอง All/Draft/Pending/Paid/Void/Hide Void + Accounts (Needs reconciliation/Ready/Sent) นับถูก · การ์ด CANCEL INVOICES = 1, TOTAL = 2 ถูก
- ❌ ยังไม่มี Refund / Credit note → ใบที่จ่ายแล้วแต่ใบเสร็จยอดผิด (฿10,750) ไม่มีทางแก้ (Void ไม่ได้ + ไม่มี credit note)

## S18 · การแจ้งเตือน (รอบ 2)
- ✅ มีแจ้งเตือน "Invoice … was approved by its creator … Reason: …" และ "−฿500 concession on invoice … Reason: …"
- ⚠️ หัวหน้าเขียน "All caught up" ทั้งที่ยังมีรายการค้าง 2 รายการ
- ❌ กดที่ตัวแจ้งเตือนแล้วไม่พาไปหน้าที่เกี่ยวข้อง (ไม่เปลี่ยนหน้า ไม่เปิดใบแจ้งหนี้)
- ✅ ปุ่ม ✓ Dismiss เอาแจ้งเตือนออกได้
- ⏭️ ลบ session ที่มีนักเรียน (ต้องลบ — เจ้าของเทส) · โค้ด LINE ไม่ตรง (ต้องใช้มือถือ) · คาบใกล้หมด (ยังไม่มีแพ็กเกจแบบชั่วโมงที่ใกล้หมด)

## S19 · ข้อมูลเชื่อมกันข้ามเมนู (รอบ 2)
- ✅ คลาส → gen คาบ → ขึ้นปฏิทินทุกมุมมอง
- ✅ เช็คชื่อ → หน้า Attendance + โปรไฟล์นักเรียน (แท็บ Attendance) ตรงกัน
- ⚠️ สรุปการเรียน → หน้า Summaries ตรง แต่โปรไฟล์นักเรียนไม่มีแท็บสรุปการเรียนให้ดู
- ✅ จ่ายครบ → นักเรียนอยู่ในคลาส: โปรไฟล์ Active ถึง 30 พ.ย. 8 คาบ · ปฏิทินคาบ พ.ย. มีนักเรียน A เพิ่มเข้ามาเอง · แท็บ Payment ขึ้น ฿10,250 Paid
- ❌ ลา → ข้อมูลลาหายหลัง Reschedule ทั้งในหน้า Attendance และโปรไฟล์ (ขึ้นแค่ "reschedule")
- ❌ ชื่อครูไม่ตรงกัน: ปฏิทิน/คลาส "Kru Test" · Students/Billing/โปรไฟล์ "TEST-Teacher-01"

## เพิ่มเติม (รอบ 2)
- S09 ✅ ปิดคลาส (Deactivate) → toast "Class deactivated" → เปิดกลับ (Activate) → "Class activated" · ⚠️ ปิดคลาสได้ทันทีไม่มีเตือน ทั้งที่มีนักเรียนถูก Reschedule เข้าคาบของคลาสนี้ (และแท็บ Students ของคลาสนั้นขึ้น 0)
- S11 ❌ Add Session แบบ Attach to a class (Maths, พฤ. 1 ต.ค. 14:00) → คาบใหม่ "0 students" ไม่ดึงนักเรียนของคลาสมา · ไม่มี toast ตอนสร้าง
- S11 ❌ คาบ 6 ต.ค. (อนาคต) ยังค้างสถานะ "Live" ในปฏิทิน

## S20 · ความเร็ว, Error & มือถือ (รอบ 2)
- ⚠️ ยังช้า — ทุกหน้าต้องรอ 4–7 วิ · Network ยังเห็น prefetch ทุกเมนูซ้ำ + ERR_ABORTED หลายรายการ
- ❌ M2 ยังไม่แก้: /settings/branches/abc → "This page couldn't load · A server error occurred" · หน้า 404 ยังเป็นแบบ default ไม่มีเมนูข้าง
- ❌ Smart search: พิมพ์ "Aye" + Enter ไม่มีผลลัพธ์/ไม่มี dropdown
- ❌ มือถือ (375px): เมนูข้างกว้าง 224px (~60% ของจอ) ไม่มีปุ่ม hamburger เนื้อหาถูกตัด
- ✅ iPad (768px): ปฏิทินใช้งานได้ แสดงครบ
- ❌ error ดิบจาก Zod + dev note ใน tooltip ยังอยู่ · เมนู CRM/Inbox มี badge หลอก (5, 3)

## S01
- ⏭️ ไม่ได้ล็อกเอาต์/ล็อกอิน role อื่น (ไม่มีบัญชี role อื่น + ไม่ออกจาก session เจ้าของ) · ✅ เปลี่ยนภาษาเป็นไทยได้ (ดู S04)

## รอบ 3 — เทสข้อที่เหลือ (29 ก.ย. บ่าย)
- ✅ S01 M3 แก้แล้ว: สลับสาขา TEST-Branch → Thong lo หน้า Students อัปเดตเองภายใน 3 วิ (2 → 0 คน) · สลับกลับได้
- ✅ S03 เปิด/ปิดวิชา: เปิด English → Save → ป้าย "All changes saved" + ตาราง Packages โชว์ English ทันที → ปิดกลับตามเดิม · ⚠️ ไม่มี toast
- ✅ S02 Special Schedule: เพิ่ม "TEST-Special Dec" 1–15 ธ.ค. เปิดเฉพาะจันทร์ 10–20 → Save → พรีวิวตามวันที่ถูก (7 ธ.ค. เปิด / 8 ธ.ค. ปิด / 13 ต.ค. HOLIDAY)
- ✅ S03 Promotions: ช่องว่าง → "Promotion name is required / Enter a discount value" · 150% → "can't exceed 100" · สร้าง "TEST-Promo-Month" 5% Monthly → toast "created" · ⚠️ แสดง "1 Months"
- ✅ S14 โปรฯ ใช้กับใบแจ้งหนี้ได้แล้ว: คอร์สรายเดือน → "TEST-Promo-Month · auto-applied −฿225" ยอด ฿4,475 ถูก (หักจากค่าเรียน ไม่หักค่าอุปกรณ์) → ข้อความ "coming soon" ในหน้าตั้งค่าโปรฯ ล้าสมัย (ไม่ได้บันทึกใบนี้)
- ⚠️ S14 Book fee: ส่วน Book fee ว่าง ไม่มีหนังสือให้เลือก และไม่มีหน้าจอให้ผูกหนังสือกับคอร์ส → เทสไม่ได้
- ❌ S03 Holidays **บั๊กใหม่ (สำคัญ):** เพิ่มวันหยุด "TEST-Holiday-3" 3 พ.ย. (วันอังคารที่มีคาบ) → ไม่มีเตือนว่ามีคาบวันนั้น · ปฏิทินขึ้น 🏖️ Holiday แต่คาบยังอยู่ Upcoming + นักเรียนที่จ่ายเงินแล้ว 1 คน · ไม่ยกเลิก ไม่แจ้งเตือน ไม่ยืดสิทธิ์
- ❌ S09 จำกัด 6 คน: เพิ่มนักเรียนจนคลาสมี 7 คนได้ ไม่มีเตือน/บล็อก (มีแค่ข้อความ "Should not exceed 6")
- ✅ S09 เอานักเรียนออก: เมนู ⋮ → "Remove from class" บังคับเลือกเหตุผล (Moved away / Stopped / Transferred / Completed / Other) → toast "Student removed from class" (7 → 6)
- ⚠️ S09 ต่อคอร์ส (Renew): ไม่มีปุ่ม Renew แยก — ต่อผ่าน Invoice (เทสแล้วใน S14: มีเตือน subscription เดิม + บังคับ remark)
- ✅ S11 แก้คาบเฉพาะครั้ง: ⋮ → Edit session → เปลี่ยน 20 ต.ค. เป็น 15:00 → ถาม "Just this session / This and every future Tuesday" → เลือกเฉพาะครั้ง → toast "Session updated" · 27 ต.ค. ยัง 10:00 ✅ · ⚠️ dialog เขียน "part of the Tuesday 15:00–16:00 class" (ควรเป็น 10:00–11:00) · ⚠️ รายชื่อนักเรียนในหน้าแก้ไขยังมี KidG ที่ถูกเอาออกจากคลาสแล้ว (ไม่ติ๊ก)
- ✅ S11 Availability timeline: แสดงช่วงครูไม่ว่าง / เวลาที่เลือก / 2 ห้อง + คำอธิบายสีแดง
- ⚠️ ข้อสังเกต: หลังเพิ่มคาบเสริม 1 ต.ค. แบบผูกคลาส "Time Available" ของนักเรียน A/B เพิ่มคนละ 1 ชม. ทั้งที่ไม่ได้อยู่ในคาบนั้น
- ✅ S05 หลาย role: ใส่ Admin ให้ครู no-login → "No-login staff must be Teacher" · ใส่ Teacher @ TEST-Branch ซ้ำ → กัน "Duplicate role assignment" · ⚠️ error โชว์ UUID ดิบ "teacher @ b25f7b84-…" · ⏭️ ไม่ได้เพิ่ม role ที่ Thong lo (จะโผล่ในรายชื่อสาขาของ Dev) · ⚠️ แท็บ Schedule / Log ของ Staff = coming soon
- ✅ S06 ผูกนักเรียนเข้าครอบครัว: Tester Family ← StudentA + StudentB → toast "Student added to family" · ⚠️ ปุ่ม View Profile / แท็บ Timeline ของครอบครัว = coming soon · ⚠️ ปุ่มโทร = "tel:abc" (ผลจาก H7)
- ⏭️ S15 Retry PDF: ไม่มีใบที่ PDF ค้าง ทำให้เกิดเองไม่ได้
- ⏭️ S18 คาบใกล้หมด: แพ็กเกจชั่วโมงเล็กสุด 12 ชม. ต้องเรียนจริงหลายคาบถึงจะใกล้หมด ทำในวันเดียวไม่ได้
- ⏭️ S02 สร้างสาขาใหม่: ไม่ได้สร้าง — สาขาจะโผล่ในตัวเลือกสาขาของทุกคนรวม Dev → ขอให้เจ้าของตัดสินใจ

### ข้อมูลทดสอบที่สร้างเพิ่มรอบ 3
Students TEST-StudentC–G (ป.5, เข้าคลาส Maths; G ถูกเอาออก) · Special Schedule "TEST-Special Dec" · Promotion "TEST-Promo-Month" 5% · Holiday "TEST-Holiday-3" 3 พ.ย. · Family Tester ผูก StudentA+B · คาบ 20 ต.ค. ย้ายเป็น 15:00 · คาบเสริม 1 ต.ค. 14:00

## รอบ 4 — ข้อที่เจ้าของอนุญาต (29 ก.ย. บ่าย)
เจ้าของอนุญาต: สร้างสาขาใหม่ · ใส่ role ที่ Thong lo · วิชากลาง + วันหยุดกลาง · ส่งของเข้า LINE ของเจ้าของผ่านนักเรียน Aye (ไม่อนุญาต Send to accountant)
- ✅ สร้างสาขา: ช่องว่าง → "Branch Name: Required" · สร้าง "TEST-Branch-2" (แบรนด์ Nockacademy) เสร็จใน 4 วิ (เดิม ~20 วิ) · ตั้งต้นปิดทุกวัน, ไม่มีวันหยุด, ไม่มี Staff
- ❌ H11 ยังไม่แก้: สาขาแบรนด์ **Nockacademy** ได้บัญชีธนาคาร "Bank of Ayudhya … Liclass Education Co., Ltd."
- ✅ ปิดสาขา (Deactivate): มีโจทย์เลขยืนยัน (5 − 2) · ตอบผิดกดแล้วเงียบ ไม่มีข้อความเตือน ⚠️ · ตอบถูก → Inactive · **TEST-Branch-2 ถูกปิดใช้งานแล้ว**
- ✅ วันหยุดกลาง: เพิ่ม "TEST-Global-Holiday" 31 ธ.ค. (All brands) · ⚠️ ไม่มี toast
- ✅ Import from global ที่ TEST-Branch-2 → ได้วันหยุดกลางมา · ⚠️ ข้อความ "31 Dec 2026from global" ไม่เว้นวรรค
- ⏭️ Broadcast to all branches: ใช้ native confirm() "Push every active global holiday to every branch?" — เบราว์เซอร์ของผมตอบยกเลิกอัตโนมัติ และระบบไม่ให้ผมข้าม → **เจ้าของต้องกดเอง**
- ✅ วิชากลาง: เปลี่ยน Maths → "Maths (TEST)" → หน้า Courses แสดงชื่อใหม่ทันที → เปลี่ยนกลับเป็น "Maths" แล้ว · ⚠️ ไม่มี toast
- ✅ หลาย role ข้ามสาขา: TEST-Teacher-01 เพิ่ม Teacher @ Thong lo (เสาร์, Maths) → list ขึ้น "TEST-Branch, Thong lo" → เอา role Thong lo ออกแล้ว · ⚠️ ไม่มี toast
- ✅ LINE: นักเรียน Aye ขึ้น "Linked to a parent's LINE account · Linked Tue, 29 Sep 2026" (เจ้าของส่งโค้ด THY9YE แล้ว)
- ✅ ส่งเข้า LINE จริง (ไปที่ LINE ของเจ้าของ): ใบแจ้งหนี้ Send again → "Invoice sent again" / Sent · ใบเสร็จ → "Receipt(s) sent to parent" / Sent · สรุปการเรียนคาบ 6 ต.ค. → Submit → Approve → "Summary sent to parent" / Sent
- ⏳ รอเจ้าของยืนยันว่าได้รับ 3 ข้อความใน LINE จริง + ทดลองส่งโค้ดผิดเข้า OA
- ✅ เจ้าของยืนยัน: ได้รับ ใบแจ้งหนี้ / ใบเสร็จ / สรุปการเรียน ใน LINE จริงครบ 3 อย่าง
- ❌ Broadcast to all branches: เจ้าของกดเอง + OK แล้วไม่มีอะไรเกิดขึ้น · Thong lo ยัง 0 วันหยุด, TEST-Branch ยัง 3 วันหยุด → วันหยุดกลางไม่ถูกส่งไปสาขาไหน
- ❓ เจ้าของถามถึงข้อความ "วันเริ่มเรียนวันแรก" ทาง LINE — ระบบไม่มีฟีเจอร์นี้ (LINE ส่งได้แค่ สรุปการเรียน / ใบแจ้งหนี้ / ใบเสร็จ ตามคำอธิบายในหน้า LINE Integration)
- ⏭️ เจ้าของไม่อนุญาต Send to accountant
- ❌ โค้ดผิด: เจ้าของส่งโค้ดผิดเข้า OA @998custi → รอ ~20 วิ รีโหลด 2 รอบ ไม่มีแจ้งเตือน "link code that didn't match" · การผูก LINE เดิมของ Aye ยังอยู่ · ⚠️ ยังไม่ชี้ขาด เพราะส่งจาก LINE ที่ผูกกับ Aye อยู่แล้ว → ควรเทสซ้ำด้วย LINE บัญชีที่ยังไม่เคยผูก
