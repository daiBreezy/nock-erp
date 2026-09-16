# Remaining Pages — Discovery & Plan

> สถานะ: 🟡 วิเคราะห์จากภาพเว็บปัจจุบัน (2026-06-25)
> Scope: หน้าที่ยังไม่ได้ redesign นอกเหนือจาก Landing + Clip/ชั้นเรียน

## IA เต็มของเว็บ (จาก navbar ปัจจุบัน)
`ชั้นเรียน · คลิป · คอร์สของเรา · บทความ · คำถามที่พบบ่อย` + ลงชื่อเข้าใช้/สมัคร

ทำแล้ว: **Landing**, **Clip (ชั้นเรียน)** + prototypes ย่อย (live-stream, video-class, video-player, personalize-goal)

---

## หน้าที่ยังขาด (เรียงตามความง่าย→ยาก)

### 1. คำถามที่พบบ่อย (FAQ) — ง่ายสุด
- จุดประสงค์: ตอบข้อสงสัยก่อนสมัคร
- Reuse: navbar, footer, app-section เกือบทั้งหน้า
- ของใหม่: accordion (expand/collapse) อันเดียว
- คำถามจริง (จากภาพ): ลงทะเบียนยังไง / ต่างจากที่อื่นยังไง / ดาวน์โหลดแอป / จ่ายแล้วได้อะไร / ชำระเงินยังไง / ขอคืนเงิน / ยกเลิกแจ้งเตือนอีเมล

### 2. คอร์สของเรา (Courses) — reuse เยอะ
- จุดประสงค์: หน้าขายคอร์ส/แพ็กเกจ (ทับซ้อน Landing สูง)
- Section: hero (ทีมติวเตอร์) → testimonial → เพื่อนร่วมเรียน → pricing 3/6/12 → สิ่งที่คุณจะได้รับ → FAQ → app → footer
- Reuse: `.price`, testimonial track, learners highlight, app section, footer
- ของใหม่: hero ทีมติวเตอร์, บล็อก "สิ่งที่คุณจะได้รับ" (checklist)
- ⚠️ **ต้องตัดสินใจ:** แยกจาก Landing จริงไหม หรือยุบรวม

### 3. บทความ — List (Index)
- จุดประสงค์: SEO / ดึง traffic — แยกหมวด (เตรียมสอบ/คณิต/อังกฤษ/ไทย) + ล่าสุด + pagination
- Reuse: การ์ด `.vcard` (ดัดเป็น article card), สีประจำวิชา, navbar/footer
- ของใหม่: article card (thumb+หมวด+excerpt), section ต่อหมวด, pagination, hero "ยอดนิยม"

### 4. บทความ — Detail (อ่านบทความ) — ยากสุด (typography)
- จุดประสงค์: อ่านบทความเดียว เน้น readability
- Reuse: navbar/footer, related = article card
- ของใหม่: article header (title/ผู้เขียน/แชร์), prose typography, สารบัญ, CTA inline, related, sidebar โปรโมต

---

## ข้อสังเกตเชิงกลยุทธ์ (PO)
1. **คอร์สของเรา ≈ Landing** — ทับซ้อน pricing/testimonial/learners/app/features ต้องตัดสินใจแยก/ยุบ ไม่งั้น maintain ซ้ำ
2. **Shared component ชัดเจนแล้ว:** navbar, footer, app-section, pricing, testimonial, learners, card → ควรยกเป็น shared จริงจัง (ตอนนี้ก๊อปข้ามไฟล์ HTML)
3. **ราคา Premium ยืนยันตรง** (3/6/12 = 2,800/4,100/5,300) ✅ — แต่เว็บปัจจุบัน **ไม่มี Premium+** → เป็นของใหม่ ราคายังต้อง confirm

## แผนลำดับ build
FAQ → Courses → บทความ List → บทความ Detail
(ระหว่างทาง: พิจารณายก shared component เมื่อ stack ถูกเลือก)
