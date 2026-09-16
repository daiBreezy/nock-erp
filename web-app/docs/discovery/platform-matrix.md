# Platform Matrix — Web Learn vs App

> สถานะ: ✅ Confirmed (2026-06-26)
> หลักการ: **ออกแบบ design system ชุดเดียว (responsive, mobile-first)** ใช้ component ร่วมกัน แล้ว gate เป็นรายฟีเจอร์ว่าโผล่บน platform ไหน — ไม่ทำ design แยกสองชุด

## เส้นแบ่ง (หลักการ)
- **Web Learn = "เนื้อหาเรียน" ล้วน** → Banner, Live, Schedule, Class, Exam Room, Share, Notification
- **App = Web ทั้งหมด + ชั้น personal / social / gamification** → Homework Room, Profile, Usage, Achievement, Ranking, Nakama

> หมายเหตุ: เดิม Clip Page → เปลี่ยนชื่อเป็น **Learn Page**

## Matrix

| Section / Feature | Web | App | หมายเหตุ |
|---|:--:|:--:|---|
| Banner (auto-scroll) | ✅ | ✅ | |
| Live | ✅ | ✅ | |
| Live Schedule | ✅ | ✅ | |
| Class | ✅ | ✅ | |
| Exam Room | ✅ | ✅ | ออกแบบที่นี่ → ยกไปเว็บ (เว็บยังไม่มี) |
| Share App | ✅ | ✅ | target ต่างกัน (SMS เด่นบน App) |
| Notification | ✅ | ✅ | in-app center เหมือนกัน; push = layer เฉพาะ App |
| Homework Room | — | ✅ | timer/focus + real-time social |
| Profile / Usage Summary / Calendar | — | ✅ | |
| Achievement / Ranking / Nakama | — | ✅ | gamification + social |
| Settings / T&C / Others | — | ✅ | |

## Implications
1. Component ที่ใช้ร่วม Web+App (Banner, Live, Schedule, Class, Exam, Notification) ต้อง responsive จริงจังตั้งแต่แรก
2. Exam Room = ตัวเดียวในกลุ่ม "ใช้ร่วม" ที่ยังไม่มีบนเว็บ → ออกแบบ responsive ที่นี่แล้วยกไปเว็บ
3. Notification: in-app center ใช้ design เดียว, push เป็น layer เสริมเฉพาะ App
4. กลุ่ม App-only → mobile-first เต็มตัว ไม่ต้องห่วง desktop layout
