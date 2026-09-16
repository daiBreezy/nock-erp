# Homework Room (ห้องทำการบ้าน) — Discovery + Build

> สถานะ: 🟡 Prototype build แล้ว (flow ครบ) | ดีเทลบางจุดรอเคาะ
> Platform: **App-only** (ดู [[platform-matrix]])

## Flow ที่ build แล้ว
1. **Setup** (`/homework`) — รายชื่อออนไลน์ (avatar scroll, แสดงสูงสุด 40) + เลือกวิชา + ตั้งเวลา + CTA เริ่มโฟกัส
2. **Focus** (`/homework/focus`) — วงแหวน progress + countdown (หรือนับขึ้นถ้าไม่จับเวลา) + จบได้ทุกเมื่อ
3. **Result** (`/homework/result`) — เวลาที่ใช้ไป + Cheers + ข้อความบันทึกลงปฏิทิน/Ranking

## Spec ที่ confirm จากโครงสร้าง
- วิชา (focus): Math, Eng, Thai, Physics, Biology, Social, Chemistry
- เวลา preset: 10/15/30/60 นาที + กำหนดเอง (custom) + ไม่จับเวลา
- custom → กดเพิ่มเป็น Quick select ได้ (เก็บใน localStorage `nock.quickDurations`)
- จบ → เวลาเก็บลง Usage Calendar (Profile) + ไปคำนวณใน Ranking
- รายชื่อออนไลน์ real-time: เข้า/ออกแล้ว avatar ปรากฏ/หาย, กดดู Profile คนอื่นได้

## ❓ Open questions (รอเคาะ)
1. **กลไก Cheer ยังไม่ชัด** — เพื่อน cheer เรา "ระหว่าง" focus หรือ "หลัง" จบ? cheer ได้กี่ครั้ง/คน? เห็น real-time ตอน focus ไหม?
2. **กดดู Profile คนอื่น** จากห้องนี้ → เปิด modal หรือไปหน้า Profile เต็ม?
3. **Real-time backend** — ใช้อะไร (WebSocket/Firebase/Pusher)? — เรื่อง System ค่อยว่ากัน
4. เริ่ม focus แล้ว **ออกจากแอป/ล็อกจอ** ให้ timer เดินต่อไหม (background)?

## หมายเหตุ build
- Prototype นี้ใช้ mock data + timer ฝั่ง client, ยังไม่ต่อ backend
- Cheer ตอนนี้ mock = `floor(seconds/90)+3`
