# Content Model — โครงเนื้อหาหลัก (Canonical) ✅

> เอกสารอ้างอิงกันสับสน: เนื้อหาในระบบมี **2 สายแยกกันชัดเจน**
> ทุก list ของ Lesson/วิดีโอ **ต้องมี Video Thumbnail**

## สาย 1 — Live Stream / Livestream Playback
```
Live Stream (สด)
  └─ ไลฟ์ย้อนหลังล่าสุด (ไลฟ์จบ → กลายเป็นวิดีโอเดี่ยว อัตโนมัติ)
       └─ จัด Group ตาม Subject
            └─ Group ตามหัวข้อ = Playlist
```
**ตัวอย่าง:**
- ไลฟ์ "Live Math ม.6 จำนวนจริง Part 4" → เข้าไปอยู่ใน Playlist **"จำนวนจริง"**
- กดเข้า Playlist → เจอ:
  - Live Math ม.6 จำนวนจริง Part 1
  - Live Math ม.6 จำนวนจริง Part 2
  - Live Math ม.6 จำนวนจริง Part 3
  - Live Math ม.6 จำนวนจริง Part 4

→ หน้าเล่น = `live-stream.html` (ตอนสด) / `video-player.html` (ย้อนหลัง + AI Summary)

## สาย 2 — Video Lesson (Video Class)
```
Subject
  └─ Grade
       └─ Lesson Playlist
            └─ Lesson
                 ├─ Lesson Video
                 ├─ แบบฝึกหัด (เหมือน Live Quiz)
                 └─ แบบทดสอบ
```
**ตัวอย่าง:**
- Playlist Lesson **"Verb"** (Eng ม.2) → กดเข้า → เจอ Lesson:
  - Lesson: การวางโครงสร้าง Verb
  - Lesson: Verb เชิงลึก
  - Lesson: การใช้ Verb
  - Lesson: Verb ที่สำคัญ
- แต่ละ Lesson เปิดเข้าไป → มี 3 action: **Lesson Video / แบบฝึกหัด / แบบทดสอบ**

→ หน้าเล่น = `video-class.html`

## ความต่างสำคัญ (อย่าสับสน)
| | สาย 1 Livestream Playback | สาย 2 Video Lesson |
|---|---|---|
| ที่มา | ไลฟ์ที่จบแล้ว (auto) | คอร์สที่ผลิตไว้ |
| จัดกลุ่ม | Subject → หัวข้อ (Playlist ของ Parts) | Subject → Grade → Lesson Playlist |
| ข้างใน item | วิดีโอเดี่ยว (Part 1,2,3…) | Lesson (มี 3 action) |
| มี แบบฝึกหัด/ทดสอบ? | ไม่มี (มีแต่ AI Summary) | มี |

## กฎ UI
- **ทุก Lesson/วิดีโอ list ต้องมี Video Thumbnail**
- list อยู่ฝั่งขวาเสมอ (base UX เดียวกันทั้ง live + video class)

## แยกหน้าตา Live vs Lesson — Confirmed ✅
ต้องแยกชัดให้ user ไม่สับสน ใช้ 3 signal พร้อมกัน:
| | ไลฟ์ย้อนหลัง (replay) | Lesson (วิดีโอเรียน) |
|---|---|---|
| สี accent | **เทาเข้ม (VOD)** | indigo/สีวิชา |
| ป้ายประเภท | "ไลฟ์ย้อนหลัง" + history icon | "บทเรียน" + จำนวน Lesson |
| meta | วันที่ + ครู (วิดีโอเดี่ยว) | progress + status + 3 action icon (เป็นชุด) |

**กฎสี (สำคัญ):** 🔴 **แดง = สงวนไว้เฉพาะ LIVE สดเท่านั้น** (+ จุดกระพริบ) · ไลฟ์ย้อนหลังห้ามใช้แดง (จะเข้าใจผิดว่ากำลังไลฟ์) → ใช้เทาเข้มแบบ VOD แทน

## "รับชมล่าสุด" — content rule — Confirmed ✅
- **Clip page:** แสดง **ทั้ง Live และ Lesson** (ปนกันได้ → ต้องอาศัย visual แยกประเภทด้านบน)
- **Subject page (video-class-subject):** แสดง **เฉพาะ Lesson Playlist ของวิชานั้น**
