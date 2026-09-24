# Test Matrix — Class / Session / Attendance / Summary / Calendar (Staging)

> สถานะ: ✅ ผ่าน · 🔴 บั๊ก · ⚠️ ข้อสังเกต/ข้อจำกัด · ⬜ ยังไม่เทส · 🚫 เทสไม่ได้ (ต้องการเงื่อนไขเพิ่ม)
> ข้อมูลเทสทั้งหมดอยู่ใน TEST-Branch
> ความคืบหน้า (2026-09-24 บ่าย): เทสแล้ว **39/40** (D7, D4, E3 เสร็จด้วยบัญชี Director — เช็ค sidebar = NockAcademy LMS · DIRECTOR · TEST-Branch ทุกขั้น) · เหลือ: E4 Export PDF ต้องขออนุญาตดาวน์โหลด · A6 toast ซ้ำ

## A. Class
| # | กรณี | สถานะ | ผล |
|---|---|---|---|
| A1 | สร้าง Learning class วันเดียว → gen 8 สัปดาห์ ข้าม holiday | ✅ | 7 sessions (ข้าม 13 ต.ค.) |
| A2 | เลือกหลายวัน (Select multiple days) / Add another day → กี่ class | ✅ | พ+พฤ+ศ → แยก 3 class · class วันนี้ gen 9 sessions (รวมวันนี้) |
| A3 | ครูต่างกันต่อแถว (Different teacher for this row) | ✅/⚠️ | ได้ · ครูไม่ได้สอนวิชานั้น → บังคับ Remarks (ดี) แต่ข้อความไม่บอกว่าแถวไหน · ปุ่ม Create disabled โดยไม่บอกเหตุผลจนกว่าจะเลื่อนเจอ |
| A4 | คลาสเต็ม / คลาส Single รับคนเกิน | 🔴 | คลาส **Single รับนักเรียน 2 คนได้** · ข้อความยังบอก 'ไม่เกิน 6' · เกรดคลาสกลายเป็น ป.1, ป.5 · (กรณี 7 คนใน Group ยังไม่ได้เทส — มีนักเรียนแค่ 2) |
| A5 | ห้องเต็ม (branch 2 rooms) → คลาสที่ 3 เวลาเดียวกัน | 🔴 | ขึ้น 'all 2 room(s) booked' แต่ **สร้างคลาสที่ 3 ได้** (ศุกร์ 25 ก.ย. 11:00 มี 3 คลาส) |
| A6 | ครูชนเวลา | ✅/⚠️ | ถูกบล็อก (toast ต้องเทสซ้ำ) |
| A7 | สาขาปิดวันนั้น | ⚠️ | เตือนแต่สร้างได้ |
| A8 | Edit class: เปลี่ยนเวลา/วัน → session อนาคตเปลี่ยน? อดีตไม่เปลี่ยน? | 🔴 | อนาคตเปลี่ยนถูก แต่ **session วันนี้ที่ Ended แล้ว (มีเช็คชื่อ+summary) ถูกเปลี่ยนเวลา 16:00→18:00 ด้วย** = แก้ประวัติย้อนหลัง |
| A9 | Edit class: เปลี่ยนครู → session อนาคตเปลี่ยน? | ✅/🔴 | ถาม 'Update sessions?' + 'Past sessions are never changed' ✅ · session ที่ customized คงครูเดิม ✅ · 🔴 Calendar แสดงครูเป็น **UUID** (39cddd0b-…) |
| A10 | เพิ่ม holiday หลังสร้างคลาส → session วันนั้นหาย/ถูก flag? | ⚠️ | session ยังอยู่ + มีป้าย 🏖️ Holiday · นักเรียนยังถูกนัด · ไม่มีคำเตือนตอนเพิ่ม holiday / ไม่มี notification |
| A11 | Deactivate class → session อนาคต / นักเรียน | 🔴 | ไม่มี confirm · **session อนาคตยัง Upcoming ครบ** · ยังถูกเสนอเป็นปลายทาง Reschedule ได้ |
| A12 | Class for = Test / Interview (one-off) | ✅/⚠️ | สร้างได้ 1 session · ⚠️ แสดงเหมือนคลาสรายสัปดาห์ ('Fri · 11:00') และนับใน 'Recurring classes' |
| A13 | Add sessions จากแท็บ Sessions ของคลาส (+N) | ✅ | +2 → ต่อท้าย 19, 26 พ.ย. · toast 'Added 2 sessions' |

## B. Session
| # | กรณี | สถานะ | ผล |
|---|---|---|---|
| B1 | Add session attach class | ⚠️ | ไม่ดึงนักเรียนของคลาส |
| B2 | Add session standalone / Trial session | ✅/⚠️ | สร้างได้ มีป้าย Trial · เช็คชื่อ+summary ได้ · ⚠️ สร้างนอกเวลาเปิดสาขาได้ (แค่เตือน) |
| B3 | Edit session เฉพาะครั้ง (เวลา) | 🔴 | ถาม 'Just this session / This and every future' ✅ แต่ข้อความโชว์เวลาใหม่เป็นตารางเดิม · 🔴 **เลือก Just this session แล้วเกิด session ซ้ำ** (1 ต.ค. มีทั้ง 16:00 เดิม + 17:00 ใหม่) |
| B4 | Delete session มีนักเรียน → Notification | ✅ | |
| B5 | สถานะตามเวลา (Upcoming→Live→Ended→Closed) | 🔴 | ไม่เปลี่ยนตามเวลา: 14:00–15:00 ตอน 15:52 ยัง Upcoming · กดแล้วเป็น Live ค้างถึง 16:03+ · 6 ต.ค. Live ค้างหลายชม. · ส่ง summary แล้ว class "ended" 16:05 แต่หัวยัง Live · แสดงเวลา ISO UTC ดิบ `2026-09-23T09:05:05.319Z` |
| B6 | Closed state เกิดจากอะไร | ✅/⚠️ | ปิดอัตโนมัติข้ามคืน (sessions 23 ก.ย. → Closed เช้า 24) · เช็คชื่อถูกล็อก ✅ · ⚠️ ข้อความ 'start 15:52 · end 09:00' ไม่มีวันที่ ดูเหมือนจบก่อนเริ่ม |

## C. Attendance
| # | กรณี | สถานะ | ผล |
|---|---|---|---|
| C1 | เช็คชื่อครั้งแรก | 🔴 | **นอกช่วงเวลาเรียน** คลิกแรก = Start class (ไม่บันทึก) ต้องกดซ้ำ · **ในช่วงเวลาเรียน** คลิกเดียวบันทึกได้ · ไม่มี toast ทั้งคู่ |
| C2 | เช็คชื่อ session อนาคต | 🔴 | ทำได้ + สถานะเพี้ยน |
| C3 | เปลี่ยนผล Present ↔ Absent ↔ Leave / ยกเลิก | ✅/⚠️ | เปลี่ยนได้ (summary หายเมื่อเปลี่ยนเป็น Absent) · ⚠️ **ยกเลิกกลับเป็น 'ยังไม่เช็ค' ไม่ได้** |
| C4 | นักเรียนแบบนับคาบ: Present หักคาบ | ✅/⚠️ | 3 → 2 left หลัง Present · ⚠️ ช่อง sessions ตอน Add Student **default 0** (ต้นเหตุ StudentB 0 คาบ) · หน้า class แสดง '1/8' vs session '0/3' vs student '2 left' — ตัวเลขคนละความหมาย |
| C5 | Leave เกินโควตา | ⚠️ | แพ็ก 3 คาบ = โควตาลา 0 ('No leave remaining') · ยังไม่รู้สูตรโควตา |
| C6 | ไม่มีคาบเหลือ → ปุ่มล็อก | ✅ | "No sessions remaining" |
| C7 | Reschedule เข้า session อื่นในสัปดาห์ | ✅/🔴 | ย้ายสำเร็จ (ต้นทางโชว์ 'Rescheduled → 23 ต.ค. 17:00', ปลายทาง 1 student) · 🔴 **ย้ายเข้า session ของคลาสที่ Deactivate แล้วได้** · ⚠️ ต้นทางยังนับ 2 students + ปุ่มเช็คชื่อยังกดได้ · Attendance page Reschedule = coming soon |
| C8 | Attendance summary cards ตามช่วงวันที่ | 🔴 | ไม่กรองตามช่วง |
| C9 | Attendance filter Day/Week/Month/ครู/วิชา/เกรด | ⚠️ | subject filter เป็น mock |

## D. Summary
| # | กรณี | สถานะ | ผล |
|---|---|---|---|
| D1 | เกิดเฉพาะคน Present | ✅ | |
| D2 | Save Draft → Submit → Approve | ✅ | |
| D3 | Request changes → แก้ → Submit ใหม่ | ✅ | Send back + note → 'Changes requested' → Resubmit |
| D4 | แก้หลัง Approve | ✅/⚠️ | Approved แล้วข้อความเป็น read-only ทั้งหน้า Summaries และหน้า session (ไม่มีปุ่ม Edit) · ทางเดียวคือ **Request changes** (บังคับใส่ note) → toast 'Sent back to the teacher' → สถานะ 'Changes requested' → แก้ → Resubmit ('Submitted for approval') → Approve ('Summary approved') ✅ · ⚠️ **Director แก้ + Resubmit + Approve เองได้ทั้งหมด** (ครูไม่ได้แตะ ไม่มีร่องรอยว่าใครแก้ข้อความ = ต่อยอด H6 อนุมัติตัวเอง) · ⚠️ ไม่มี confirm ก่อนดึงกลับ · กรณี summary ที่ Sent ไปแล้วยังไม่ได้เทส (ห้ามส่งจริง) |
| D5 | Send to parent (no LINE) | 🔴 | **ส่งได้ขณะยัง 'Awaiting approval' (ข้าม approve)** · ไม่มี confirm · แจ้ง 'Summary sent to parent' + สถานะ Sent ทั้งที่นักเรียนไม่มี family/LINE |
| D6 | "Not written yet" counter / Staff "Summary Pending" | ⚠️ | Staff Summary Pending = 0 ถูก · 🔴 การ์ด Summaries ไม่กรองตามช่วงวันที่ (นับ summary 29 ก.ย. ในสัปดาห์ 21–27) · รายการเดียวกันแสดง 'Sent' + 'Parent not linked to LINE' |
| D7 | ครู (Dai) เขียน → Director approve | ✅/⚠️ | ฝั่งครู ✅: เขียน+Submit ได้, เห็นแค่ Withdraw · ฝั่ง Director ✅: เห็นใน Summaries (Awaiting approval 1) → Approve → toast 'Approved — saved, not sent to TA's parent yet' · การ์ด Awaiting 1→0, Approved-not-sent 1→2 · ⚠️ ระหว่างกด Approve ปุ่ม Send to Parent เปลี่ยนเป็น 'Sending…' ด้วย (ชวนตกใจว่าส่งไปแล้ว — จริงๆ ไม่ได้ส่ง) · ⚠️ ขณะ Awaiting Director แก้ข้อความครูใน textarea ได้ก่อน Approve · ⚠️ ชื่อครูแสดง 'dai Test' (ไม่ใช่ Dai Breezy) · ⚠️ หน้า session: 'Class ended · start 09:07 · end 09:07' (0 นาที) |

## E. Calendar
| # | กรณี | สถานะ | ผล |
|---|---|---|---|
| E1 | แสดง session ทุกมุมมอง | ✅ | |
| E2 | สะท้อนการแก้/ลบ/reschedule/customized | ⚠️ | Calendar ตามทัน แต่สะท้อนบั๊ก B3 (session ซ้ำ) + ชื่อครูเป็น UUID · list ในหน้าคลาสไม่ refresh หลังแก้ |
| E3 | Create Class จากช่องว่าง | ✅/🔴 | Day view (TEST-Branch, ศ. 25 ก.ย.) คลิกช่อง 14:00 → เปิด Create New Class ที่ **prefill สาขา + ครูของคอลัมน์ + วันที่ + เวลา** ✅ · สร้าง 'TEST-E3 Calendar' (Maths · Test · Single · 1 ชม.) → toast 'Class created' → โผล่ใน Calendar 14:00–15:00 ✅ · ⚠️ ช่องว่างถูกเสนอเป็นช่วง 2 ชม. (ตัดสั้นลงถ้าชนคลาสถัดไป) และ default ความยาว 2 ชม. · ⚠️ ไม่กำหนดห้องให้ (Room ว่าง) · ⚠️ การ์ดใน Calendar โชว์แค่ 'Maths' ไม่โชว์ชื่อคลาส · 🔴 **Day view ซ่อน session ที่ไม่มีครู / ครูถูกลบ (UUID)** — ศ. 25 ก.ย. List view มี 5 sessions (3 conflicts ที่ 11:00 + 17:00) แต่ Day view เห็นแค่ 2 → ช่องที่ดูว่างอาจไม่ว่างจริง และ Create Class จากช่องนั้นจะชนห้อง/เวลาโดยไม่รู้ตัว |
| E4 | Summary → Export PDF | 🟡/🔴 | เปิด 'Summary — Week' ได้ (การ์ด Total sessions / Est. students / Teachers / Holiday conflicts + ตาราง) · ยังไม่กด Export PDF (ต้องขออนุญาตดาวน์โหลด) · 🔴 **หัวข้อบอก 'Week' แต่ตารางมี 18 sessions ช่วง 23 ก.ย.–14 ต.ค.** (3 สัปดาห์) · 🔴 3 sessions ที่ชนกัน ศ. 25 ก.ย. 11:00 สถานะ 'OK' ทั้งหมด (เช็คแค่ holiday ไม่เช็คห้อง/เวลาชน) · ครูเป็น UUID ในตาราง + chip นับครู · Est. students = ผลรวมต่อ session (ไม่ใช่จำนวนคนจริง) |
| E5 | Day view แสดงครบ? | 🔴 | **ซ่อน session ที่ไม่มีครู / ครูถูกลบ (UUID)** — วันนี้ 24 ก.ย. ไม่เห็น 16:00 · 25 ก.ย. Month บอก 'Maths ×5' กดเข้าไป Day view เห็น 2 · filter 'No teacher' ใน Day view = ว่าง (คอลัมน์ยังชื่อ dai Test) แต่ Week view เห็น · ครู UUID ไม่มีใน dropdown → filter ไม่ได้ |
| E6 | Week view | ✅/⚠️ | แสดงครบทุก session ✅ · ⚠️ session ชนกัน 3 อันบีบจนอ่านไม่ออก ('M… 11…') · ป้าย 'Week 4' ไม่ชัดว่าสัปดาห์ของอะไร |
| E7 | Month view | ✅/⚠️ | รวมเป็น 'Maths ×N' + จุดแดง conflict + ไฮไลต์ holiday ✅ · ⚠️ Month เริ่มวันอาทิตย์ แต่ Week เริ่มวันจันทร์ · คลิกวัน → ไป Day view (ที่ซ่อน session ตาม E5) · hover popover โผล่ผิดที่ (ทับ sidebar) |

## F. Cross-module
| # | กรณี | สถานะ | ผล |
|---|---|---|---|
| F1 | Remove student จากคลาส (เหตุผล) → หลุดจาก session อนาคต, อดีตคงอยู่ | 🔴 | ครั้งแรก 'An unexpected error occurred' · ครั้งสอง error ดิบ 'Student <uuid> is not on class <uuid>' · สุดท้าย class = No students **แต่ session อนาคตทุกครั้งยังมีนักเรียน 1 คน** (ข้อมูลไม่ตรงกัน) |
| F2 | ลบครู → คลาสแสดง UUID | 🔴 | |
| F3 | Claim จาก invoice → นักเรียนเข้าคลาส | ✅ | auto-claim |
| F4 | Notification นักเรียนคาบใกล้หมด | ✅/⚠️ | (อัปเดต 24 ก.ย. บ่าย) **มีแล้ว**: หน้า Notifications แสดง Urgent 'TEST-StudentA 1 session left', 'TEST-StudentB 1 session left', 'TEST-StudentB 0 sessions left' + ปุ่ม Send LINE reminder (disabled เพราะไม่มี LINE) · ⚠️ StudentA เป็น subscription แต่ถูกนับเป็น '1 session left' · ⚠️ พิมพ์ /billing ตรงๆ ใน URL แล้วเด้งไปหน้า Notifications |
| F5 | Student profile Schedule/Attendance ตรงกับ session | ⚠️ | Attendance ตรง, หน้า session ไม่โชว์ leave |

## G. สิทธิ์ Role Teacher (บัญชี Dai Breezy, 2026-09-24)
| หน้า | ผล | สถานะ |
|---|---|---|
| Sidebar | เห็นทุกเมนูเหมือน Director | ⚠️ |
| Staff | อ่านอย่างเดียว ไม่มี Add/Delete · เห็นเฉพาะสาขาตัวเอง | ✅ |
| Settings | เห็นการ์ดสาขา แต่เปิดหน้าแก้สาขาไม่ได้ (redirect) | ✅ |
| Courses | ไม่มีปุ่มสร้าง | ✅ |
| Summary | Submit ได้ · Approve/Send ไม่ได้ (มีแค่ Withdraw) | ✅ |
| Billing | **เข้าได้เต็ม: เห็นรายได้, New Invoice, Send to accountant, Approve invoice ได้** | 🔴 |
| Students | **Export ข้อมูลนักเรียนได้** + Add Student | ⚠️ PII |
| Classes / Sessions | สร้างคลาส/เซสชันได้ · กำหนดครูคนอื่นได้ · เห็น session ครูทุกคน | ⚠️ |
| Auth | ถ้า Director เคยล็อกอินค้างในเบราว์เซอร์เดียวกัน ครูเปิด /billing แล้ว **ถูกสลับเป็น Director เอง** (Clerk multi-session) | 🔴 |
