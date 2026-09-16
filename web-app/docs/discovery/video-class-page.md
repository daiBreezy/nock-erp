# Discovery — Video Class Page

> เข้าจากหน้าแรก → การ์ดวิชา (Video Class) → หน้านี้
> คนละประเภทกับ Livestream playback (อันนั้นมาจากไลฟ์ที่จบ)

## Page flow — Confirmed ✅
```
หน้าแรก (Video Class card: Math) → video-class-subject.html (browse)
   ├─ Filter: สลับ Subject + Grade ได้ตลอดเวลา (filter สำคัญในหน้านี้)
   ├─ Section แรก: Playlist ที่รับชมล่าสุด (เหมือน section บน clip page แต่ filter เหลือวิชานั้น)
   └─ Playlist แบ่งตาม Grade → กด playlist → video-class.html (player)
```

## Lesson Playlist (sidebar player) — Confirmed ✅
- หัว Playlist แสดง: ชื่อ Playlist · จำนวนบทเรียน · เวลารวมทุกวิดีโอ · **status icon**
- **Status icon 3 stage** (ไอคอนเดียว เปลี่ยนสี + hover tooltip):
  - Enable (เทา) = ยังไม่ได้เรียน
  - Pending (ส้ม) = เรียน/ทำ action ไม่ครบ
  - Done (เขียว) = ครบทุก action ทุก Lesson
- แต่ละ Lesson แสดง: thumbnail · ชื่อ · duration · status (เหมือนกัน) · **3 action icon เล็ก** (Video / Quiz / Exercise)
- Logic status ของ Lesson: ดู Video + Quiz + Exercise ครบ = Done / ทำบางส่วน = Pending / ยังไม่แตะ = Enable

## 3 Action — Confirmed ✅
| Action | พฤติกรรม |
|--------|----------|
| Video | เล่นวิดีโอบทเรียน |
| Quiz (แบบฝึกหัด) | โชว์ปุ่ม Quiz 1..N ใต้วิดีโอ กดแล้วเปิด **modal 2 ฝั่ง** (ซ้าย=โจทย์/รูป, ขวา=choice; choice เป็น text เรียงตั้ง หรือ image 2x2) |
| Exercise (แบบทดสอบ) | เปลี่ยน section เป็นชุดข้อสอบ — **2 คอลัมน์** (desktop/tablet นอน), **1 คอลัมน์** (tablet ตั้ง/mobile) |

## ส่วนที่ Lesson Video & Live Video ใช้ร่วมกัน — Confirmed ✅
- **เอกสารประกอบการเรียน** (Lesson Video **ไม่มี** Personalize Goal / Live Video มี)
- **AI Summary** (มีทั้งคู่)
- **Description: clamp 3 บรรทัด** + ปุ่ม "แสดงเพิ่มเติม" ขยาย/ย่อ

## หน้า browse (video-class-subject) — Confirmed ✅
- **Filter:** Subject = chip (ตัดคำ "วิชา" ทิ้ง) · Grade = **chip dropdown** (กดเปิดเมนูเลือก)
- **Playlist ทั้งหมด:** กด **"แสดงทั้งหมด" expand ลงมา** (ไม่เด้งหน้าใหม่)
- แต่ละ Grade แสดง: **จำนวน Playlist · ดูแล้วกี่ Playlist · รวมกี่วิดีโอ**
- แต่ละ Playlist แสดง: **กี่ Lesson · ดูแล้วกี่ Lesson** (เช่น 4/8)
- **Status "New" 2 แบบ:**
  - `Playlist ใหม่` (badge ม่วง) — playlist เพิ่งมา
  - `Lesson ใหม่` (badge น้ำเงิน) — playlist เดิมแต่มี lesson ใหม่

## Layout — Confirmed ✅
- **List บทเรียนอยู่ฝั่งขวา** (base UX เดียวกับหน้า Live Stream — ให้ผู้ใช้คุ้นเคย)
- Main content ฝั่งซ้าย/กลาง สลับตาม action ที่เลือก

## Sidebar (ขวา) = Accordion บทเรียน
- แต่ละหน่วย (unit) กดขยาย/ย่อได้
- ในแต่ละบทเรียนมี **3 action**:
  1. **บทเรียน** → ดูวิดีโอ (main = video player)
  2. **แบบฝึกหัด** → ควิซ **แบบเดียวกับ Live Quiz** ที่เด้งระหว่างดูวิดีโอ (ทำทีละข้อ)
  3. **แบบทดสอบ** → เปลี่ยน main section เป็น **แบบทดสอบ** (ชุดข้อสอบหลายข้อ + ส่งคำตอบ)
- สถานะ action: เสร็จแล้ว (เช็คเขียว) / กำลังทำ / ล็อก

## Main content / 3 action — Confirmed ✅
| Action | พฤติกรรม |
|--------|-----------|
| บทเรียน | Video player + รายละเอียดบทเรียน |
| **แบบฝึกหัด** | **Modal เด้งทับบนจอวิดีโอ** (เหมือน Live Quiz) — ไม่เปลี่ยน section, วิดีโอยังอยู่ข้างหลัง ปิด modal กลับมาดูต่อได้ |
| **แบบทดสอบ** | เปลี่ยน section เป็นชุดข้อสอบ เรียง **แนวตั้ง (บนลงล่าง)** ทีละข้อ + ปุ่มส่งคำตอบ |

## เชื่อมโยง (prototype)
- clip-page การ์ดวิชา (math/eng/thai/sci) → video-class.html
- โลโก้/back → clip-page.html

## Open questions (ค่อย dig down)
- ⏳ แบบฝึกหัด vs Live Quiz: ใช้ engine/ฐานข้อมูลเดียวกันไหม
- ⏳ แบบทดสอบ: ให้คะแนน/เฉลย/ทำซ้ำได้ไหม, เก็บสถิติไหม
- ⏳ การปลดล็อก: ต้องดูบทเรียนจบก่อนถึงทำแบบฝึกหัด/ทดสอบไหม (สังเกตของเดิมมีไอคอนล็อก)
- ⏳ ความสัมพันธ์กับ "ห้องสอบ" บนหน้าแรก (ใช้ระบบข้อสอบเดียวกันไหม)
