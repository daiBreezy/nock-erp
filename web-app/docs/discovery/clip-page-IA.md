# Clip Page — โครงหน้าใหม่ (Information Architecture) — ร่าง v2

## โครงล่าสุด v2 (Confirmed ✅)
ลำดับ section:
1. **Live Stream** — หลายไลฟ์พร้อมกัน (Live A, Live B, เผื่อ C อนาคต)
   - แสดงไลฟ์ที่กำลังสด **วางข้างกัน** (N ช่อง) + **ตารางไลฟ์วันนี้** แบบคอลัมน์ต่อช่อง
   - 1 วัน 6–8 ไลฟ์ (A 3–4, B 3–4 เวลาเดียวกัน) → layout ต้อง scale หลายช่อง
2. **Latest Record Livestream** — **วิดีโอเดี่ยว** (playback จากไลฟ์ที่จบ)
   - มี **Popular tag** + **Sorting** (Newest upload / Popular)
3. **รับชมล่าสุด (Continue watching)** — แสดงเป็น Video Class
4. **Our service** — Package หลัก 3 ตัว (3/6/12 เดือน) + Package รอง card เล็ก (18/24/36 เดือน)
5. **Video Class** — แยกตามวิชา (Math / Eng / Thai / …)

หลักเพิ่มเติม:
- **คลิปเดี่ยว ≠ คลิป Group** → คนละ section เสมอ (playback เดี่ยว → จับเป็น Video Group ทีหลัง)
- **Icons:** Material Icons/Symbols ทั้งหมด (ห้าม emoji)
- **Date format:** `dd Mon yy` เช่น `22 Sep 26`

---

# (เดิม) ร่าง v1

> สังเคราะห์จาก discovery (clip-page.md) + research (clip-page-benchmark.md)
> Persona: นักเรียน | เป้าหมาย: Browse/Watch + Convert (Guest→สมัคร, Free→จ่าย)
> สถานะ: 🟡 ร่างเสนอ รอ review

## หลักการออกแบบ (Design Principles)
1. **Mobile-first / touch-friendly** เป็น default
2. **3 ฟีเจอร์หลักเด่นพอกัน:** Browse คลิป · Live · ห้องสอบ
3. **Soft paywall** — ให้ลิ้มรสก่อน ค่อย gate (flow เดิมถูกแล้ว)
4. **สะอาด ไม่ยัด** — card group โชว์เฉพาะข้อมูลที่ช่วยตัดสินใจ
5. **ปรับตามสถานะ login** (Guest / Free / Member)

## โครงหน้าใหม่ (เรียงบนลงล่าง)

```
┌─ HEADER (sticky) ─────────────────────────────┐
│ Logo · Nav · [Filter ▾ ปุ่ม] · Search · CTA   │
│ CTA = Guest:"สมัครฟรี" / Free:"อัปเกรด" / Member:โปรไฟล์ │
└───────────────────────────────────────────────┘

1. 🔴 LIVE ZONE (เด่นสุด — บนสุด)
   - ไลฟ์เด่นวันนี้ (banner ใหญ่ + ปุ่มเข้าชม)
   - ตารางไลฟ์วันต่อไป (การ์ดเลื่อน + ปุ่ม "ตั้งเตือน/+ปฏิทิน")

2. 🎯 BROWSE คลิป (แกนหลัก)
   - [Filter เป็นปุ่ม] เกรด · วิชา (เปิด panel/dropdown)
   - Tabs/Section: ล่าสุด | ยอดนิยม
   - Grid: Clip GROUP cards (จำนวนวิดีโอ + ความยาวรวม + ป้ายฟรี/ล็อก + bookmark)

3. 📝 ห้องสอบ (ฟีเจอร์หลัก)
   - การ์ดชุดข้อสอบ (O-NET / กลางภาค / ปลายภาค) + View All

4. 💰 CONVERT (ท้ายหน้า — สำหรับ Guest/Free)
   - Pricing (จัดวางใหม่ สะอาด) → Member ซ่อน/ย่อ

[ Promo strip เล็กๆ — โฆษณา/โปรโมตบริษัท (Hero เดิม) วางแทรกแบบไม่เด่นแย่ง ]
[ Testimonials ⏳ — ยังไม่ตัดสินใจ (อาจย้าย Landing) ]
```

## Access สำคัญ (อัปเดต)
- ไลฟ์สด = **lead magnet**: Guest ต้องสมัครฟรีก่อนถึงดูได้ → Live banner สำหรับ Guest = ปุ่ม "สมัครฟรีเพื่อดู"

## การปรับตาม Login State
| Element | Guest | Free | Member |
|---------|-------|------|--------|
| Header CTA | สมัครฟรี | อัปเกรด/จ่าย | โปรไฟล์ |
| Pricing zone | แสดง | แสดง (เน้น) | ซ่อน/ย่อ |
| Card ล็อก | ป้าย "ล็อก" → modal signup | ป้าย "ล็อก" → modal payment | ปลดล็อกหมด |

## เทียบกับของเดิม (เปลี่ยนอะไร)
| เดิม | ใหม่ | เหตุผล |
|------|------|--------|
| Sidebar filter ซ้าย กินที่ | ปุ่ม Filter | space + mobile |
| Live อยู่กลางๆ | Live ขึ้นบนสุด | "สำคัญมาก ควรเด่น" |
| ห้องสอบล่างสุด | เลื่อนเป็นฟีเจอร์หลัก | "ฟีเจอร์หลัก ควรเด่น" |
| การ์ด = ?(เข้าใจผิดว่าคลิปเดี่ยว) | การ์ด = clip group ชัดเจน | ตรงของจริง |
| Testimonials ในหน้า | เสนอย้าย Landing | persona ไม่ตรง |
| ไม่ responsive | mobile-first | เป้าหมายหลักของ redesign |

## ข้อค้างที่ยังต้องตัดสินใจ
- ⏳ ลำดับ: Live ก่อน หรือ Browse ก่อน? (ร่างนี้ให้ Live ก่อน)
- ⏳ Testimonials: ย้าย Landing จริงไหม
- ⏳ Guest ต้อง login ก่อนดูไลฟ์ไหม
- ⏳ Hero promo เดิม วางตรงไหน (Live banner รวม / promo strip / ตัด)
