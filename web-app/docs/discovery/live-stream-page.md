# Discovery — Live Stream Page (detail)

> เข้าจากหน้า Clip → กด "เข้าชมไลฟ์สด" → มาหน้านี้
> Layout อ้างอิงของจริง: Chat (ซ้าย) · Video (กลาง) · Video Group (ขวา)

## 3 Section หลัก
1. **Live Stream Video** (กลาง)
2. **Live Chat** (ซ้าย — collapse/expand ได้)
3. **Live Stream Video Group** (ขวา — ชุดที่ผ่านมาของ group นี้)

## 1) Live Stream Video — features
- **Video player** (ไลฟ์สด)
- **PIP / Floating Video** — เปิดหน้าต่างวิดีโอลอยได้ (ดูต่อขณะเลื่อนหน้า)
- **Description** ของวิดีโอ
- **Teacher name** (ครูผู้สอน)
- **Share to Social** (Facebook / X / LINE)
- **Notification** — รับแจ้งเตือน
- **Learning Document** (เอกสารประกอบการเรียน)
  - Teaching Slide PDF
  - Lesson Document PDF
  - **Personalize Goal** ⭐ (Feature ใหม่ — ยังไม่มีของเดิม, ค่อย dig down ต่อ)
- **Live Quiz** — ระหว่างเรียนมีควิซให้ทำสด
- **AI Summary** ⭐ — เกิด **หลังวิดีโอจบ** สรุปบทเรียนให้อัตโนมัติ (Feature ใหม่)

## 2) Live Chat — features
- **Collapse / Expand** ได้ (ซ่อน/ขยายพื้นที่)
- ส่งได้: **Text, GIF, Emoji, รูปภาพ (IMG)**
- แสดงรายชื่อผู้ส่ง + ข้อความ (real-time)
- ช่องพิมพ์ + ตัวนับ 0/200 + ปุ่มส่ง

## 3) Live Stream Video Group — features
- list **วิดีโอ group นี้ทั้งหมดที่ผ่านมา** (เป็น set เดียวกัน)
- แต่ละ item: thumbnail · ชื่อ · ความยาว · ครู · วิชา · ระดับชั้น (chip)
- เลื่อนดู (scroll) เลือกดูย้อนหลังตอนอื่นใน group

## Page Map (prototype flow)
```
clip-page.html (หน้าแรก)
 ├─ ปุ่ม "เข้าชมไลฟ์สด" / แถวกำลังไลฟ์ → live-stream.html
 ├─ การ์ดไลฟ์ย้อนหลัง / รับชมล่าสุด     → video-player.html
 └─ โลโก้/เมนูคลิป ← กลับได้ทุกหน้า

live-stream.html (ไลฟ์สด)
 └─ group ตอนอื่น (ที่จบแล้ว) → video-player.html

video-player.html (คลิปย้อนหลัง/playlist)
 ├─ AI Summary ใช้งานได้แล้ว (ไลฟ์จบ)
 └─ playlist sidebar: ตอนทั้งหมดในชุด
```
ความต่าง live vs player: player ไม่มี live chat/quiz, AI Summary พร้อมใช้, มี playlist "ตอนทั้งหมด"

## Open questions (ค่อย dig down)
- ⏳ Personalize Goal: ทำงานยังไง (ตั้งเป้า/ติดตามผล?)
- ⏳ AI Summary: รูปแบบผลลัพธ์ (bullet/quiz/key concept?)
- ⏳ Live Quiz: โครงสร้าง (กี่ข้อ/ให้คะแนน/leaderboard?)
- ⏳ สิทธิ์ดู: ต้อง login/free ก่อนเข้าหน้านี้ (ตาม access tier ที่ตกลง)
