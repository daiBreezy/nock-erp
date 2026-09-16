# Discovery — Workload ปัจจุบันของ Teacher/TA (Teacher.nockacademy.com)

> สถานะ: 🟡 Discovery — ยืนยันจากการคุยกับ Nock + Screenshot ของจริง + Wireframe มือเขียนของ "Create Livestream" ฝั่ง Web Admin (31 ส.ค. 2569)
> ดู [[ia-proposal]] สำหรับข้อเสนอ IA ที่ตามมาจากเอกสารนี้

## 0. ทำไมโปรเจกต์นี้ถึงเกิด

Teacher/TA บนคอร์ส Premium Plus+ แบกรับ Workload เป็น Chain ต่อ Live class:

**คิด Live Quiz → ตรวจคำตอบ → เขียน Summary → ส่งผู้ปกครอง**

ไอเดียตั้งต้นจาก Nock:
1. Re-structure Video ทั้งหมดให้ละเอียดขึ้น รองรับการขยายตัว + ให้ AI อ้างอิงได้ (**แยกเป็น Phase อื่น ไม่อยู่ในเอกสารนี้**)
2. AI Support: ช่วยคิด Live Quiz / ช่วยตรวจ / เขียน Summary / Suggest Video รายบุคคล

## 1. โครงสร้างระบบปัจจุบัน (ยืนยันจาก Screenshot + คุยกับ Nock)

### 1.1 การแยกเว็บ
Teacher.nockacademy.com แยกออกมาจาก Admin.nockacademy.com เพื่อให้ Teacher/TA เข้าถึงได้อิสระ ไม่ต้องยุ่งกับความซับซ้อนของ Admin

⚠️ **แต่**: การสร้าง Live/Quiz/Homework ยังคงทำใน **Web Admin** อยู่ ไม่ใช่ Teacher.nockacademy.com — TA จึงต้อง Toggle ข้าม 2 ระบบอยู่แล้วในทางปฏิบัติ (ไม่มีใครพูดถึง Workload จุดนี้มาก่อน) — ดู Open Question 1 ใน [[ia-proposal]]

### 1.2 IA เดิม (จาก Screenshot จริง)
```
Top nav: Management | [Course tabs ต่อคอร์ส เช่น "สอบเข้า ม.1 รร. จุฬาภรณ์", "สอบเข้า ม.4 MWIT วมว. จก."] | Reports
ในแต่ละ Course: Dashboard / Overview / Feedback / Weeks / [Subject tabs: วิทยาศาสตร์ / คณิตศาสตร์ (พื้นฐาน) / คณิตศาสตร์ (เสริม)]
```

### 1.3 Chain 4 ขั้นตอน จับคู่กับของจริงตอนนี้

| ขั้นตอน | ทำที่ไหนตอนนี้ | Automation ตอนนี้ |
|---|---|---|
| คิด Live Quiz + Homework | **Web Admin** ในฟอร์ม "Create Livestream" เตรียมล่วงหน้าก่อน Live เริ่ม เป็น Choice ก/ข/ค/ง ติ๊กเฉลยตอนสร้างเลย พร้อม Upload PDF/Slide ประกอบ | ไม่มี — Manual ล้วน |
| Live Quiz — เก็บผล/ตรวจ | Teacher.nockacademy.com ระหว่าง Live (ในแอป) | **อัตโนมัติ** — แอปตรวจให้ คำนวณ % ถูกต่อข้อ แสดงแบบ Read-only |
| Homework — เก็บผล/ตรวจ | โพสต์คำถามชุดเดียวกันซ้ำใน **Facebook Page** หลัง Live จบ นักเรียนคอมเมนต์ Format คงที่ `ชื่อ/คำตอบ` (เช่น "น้องแอม/ก.") **TA อ่านคอมเมนต์แล้วพิมพ์คำตอบแต่ละคนเข้าตารางเอง** — ใช้ Component เดียวกับตาราง Live Quiz ผลลัพธ์ (จึงทำให้ Popup หน้าตาคล้ายกันจนสับสน) | **Manual เต็มรูปแบบ** — TA คือสะพานเชื่อมข้อมูลข้าม Platform |
| เขียน Summary (Feedback) | Teacher.nockacademy.com → Feedback tab. TA เขียน Comment **1 ชุดต่อวิชาต่อสัปดาห์** (ไม่ใช่รายคน) เก็บเป็น Template แล้ว "Compile" รวมกับคะแนนแต่ละคนออกเป็นรายงานรายบุคคล | มี Tool บางส่วนแล้ว: มี QA Flag เตือนเวลาคะแนนที่พิมพ์ในคอมเมนต์ไม่ตรงกับคะแนนจริงใน DB (Badge สีแดง ❌) — แปลว่า Manual Drift เป็นปัญหาจริงที่เกิดขึ้นบ่อยพอต้องมี QA แบบนี้อยู่แล้ว |
| ส่งผู้ปกครอง | Teacher.nockacademy.com → Weeks tab. Grid Checkbox 1 คอลัมน์ต่อวิชาต่อคน มีตัวนับ Sent/Not Sent | Manual เลือกเอง ไม่มี "Send ทั้งหมดที่พร้อม" แบบรวมศูนย์ในของเดิม |

### 1.4 Scale ที่ยืนยันแล้ว vs ยังไม่รู้

- ตัวอย่างที่เห็นจริง: นักเรียน 74 คน, "Not Sent" ~70 ในบางวิชา/สัปดาห์
- ❓ **VALIDATE — ยังไม่รู้ Volume จริง**: Homework กี่ครั้ง/สัปดาห์, TA มีกี่คนทั้งหมด, 1 TA ดูแลกี่คอร์ส Nock เองก็จำไม่ได้ตอนคุย **แนะนำให้สัมภาษณ์ TA จริง 1-2 คนก่อน** เหมือนวิธีที่ใช้ทำ Discovery ฝั่ง ERP (Admin interview)

## 2. Framing ปัญหา (ที่ตกลงกับ Nock แล้ว)

**Homework คือจุดที่ Manual หนักสุดและ Automate น้อยสุด** — หนักกว่าที่ Framing เดิม "ตรวจคำตอบ" บอกไว้ด้วยซ้ำ เพราะมันไม่ใช่ "การตรวจ" แต่คือ **การพิมพ์ข้อมูลข้าม Platform ด้วยมือ** (Facebook → LMS) รูปแบบคอมเมนต์ `ชื่อ/คำตอบ` ที่คงที่พอจะเขียน Automation จับคู่ชื่อ-คำตอบได้จริง

**การเขียน Summary คือโอกาสที่ชัดเป็นอันดับสอง** — มีหลักฐานจาก QA Flag ที่ต้องมีอยู่แล้วในของจริงวันนี้

**การคิด Live Quiz** เป็นงานจริงเหมือนกัน แต่อยู่บน Web Admin ไม่ใช่เว็บนี้ — ต้องเคลียร์ Open Question 1 ก่อนตัดสินใจว่าจะ Build ตรงนี้หรือเปล่า
