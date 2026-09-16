# Personalize Goal — Journey Architecture & Strategy

> ที่มา: Personalized_Goal_Strategy.pdf + บทสนทนา (มุม Product + UX + CVR)
> สถานะ: 🟡 strategy confirmed (ระดับภาพรวม) · รอแตก MVP scope + ออกแบบ

## แนวคิดหลัก (Key Insight)
ทำให้ user รู้สึกว่า **"ฉันกำลังสร้างอนาคตการเรียนของตัวเอง"** ไม่ใช่ **"กำลังโดนขายคอร์ส"**
→ Personalize Goal = Layer กลางที่เปลี่ยน "ผู้เข้าชม" เป็น "ผู้ลงทุนทางอารมณ์" ก่อนจ่ายเงิน

## 3 Layer ของ NA
| Layer | คือ | หน้าที่ |
|-------|-----|---------|
| 1 · Content Hook | free lesson, social, ไฟล์ดาวน์โหลด | **ดึงคนเข้ามา** |
| 2 · AI Personalization | quiz, goal, analysis, report | **ทำให้ผูกพันทางอารมณ์** |
| 3 · Paid Learning System | roadmap, AI practice, progress tracking | **เปลี่ยน commitment → payment** |

## Overall Entry Flow
```
Social (TikTok/FB) → Landing (Preview + Download + AI Insight CTA)
  → Free Download (NO LOGIN)
  → "Want to know your weak points?" (Personalized Insight CTA)
  → Intent Detection Layer → Student Journey  /  Parent Journey
```

## Student Journey (เป้า: emotional engagement → self-discovery → AI personalization → paid)
Entry "Improve My Learning" → Motivation select → Grade → Weak subject → Confidence reflection
→ Mini Diagnostic Quiz (3–5 ข้อ) → AI Learning Analysis (strength/weakness/learning style/score prediction)
→ Gap Visualization (Current 58% → Target 80% + timeline) → Personalized Goal ("Improve Math +15%, 15 min/day")
→ Premium Study Plan (Week1 ✅ / Week2 🔒 / AI practice 🔒 / tracking 🔒) → Signup/Subscribe (save + unlock)

**Psychology:** Curiosity → Self Reflection → Personal Discovery → Emotional Realization → Hope → Commitment → Payment

## Parent Journey (เป้า: trust → confidence ว่าลูกดีขึ้น → consult/subscribe)
Entry "Help My Child Improve" → Child info (grade/school/performance) → Concern select
→ Quick Learning Check OR Upload Score → AI Child Analysis (weak foundation/retention/confidence)
→ Improvement Projection (+12–18% ใน 3 เดือน) → Personalized Study Plan → Consultation CTA / Subscription CTA

**Psychology:** Concern → Problem Awareness → Trust → Hope → Confidence → Action → Payment
**Parent ไม่ได้ซื้อ feature — ซื้อ "ความหวังว่าลูกจะดีขึ้น"**

## System Architecture
```
Social → Free Lesson Download → AI Personalization Hub
  → Intent Detection (Student/Parent behavior)
  → Personalized Experience Flow → AI Analysis + Goal Engine
  → Premium Learning Path → Subscription / Conversion
```
ประเด็น: "Download" เป็นแค่ **Entry Hook** ไม่ใช่ปลายทาง

## เชื่อมกับสิ่งที่ทำไว้แล้ว (ต้อง reconcile)
- Landing = parent (เดิมตกลงไว้) → ตรงกับ Parent Journey
- Clip page = student → Student Journey
- Access tier (Guest/Free/Member) + soft paywall → Layer 3 conversion
- ปุ่ม "Personalize Goal" ในหน้า Live/Lesson video = จุดเข้า/ต่อยอดของ Layer 2 นี้
- Premium Study Plan ที่ gate (🔒) = soft paywall เดิม

## Flow ละเอียด (จาก user) — Confirmed ✅
**Insight:** Parent = 80% ของ guest → ออกแบบ **parent-first**. เป้าหมาย = ให้ Parent/Student ตั้ง Goal ของตัวเอง.

```
กดลิงก์ (livestream/อื่นๆ) → Modal Personalize Goal Setting
 ├─ Q1: Parent หรือ Student?
 ├─ Q2: เป้าหมาย → "เพิ่มคะแนนสอบ" | "สอบเข้า"
 │     เพิ่มคะแนนสอบ → Subject (multi-select) → Grade (single)
 │     สอบเข้า       → School (single) → Grade
 ├─ Student → ทำ Test (ระบบ generate หรือดึงจาก Exercise/Quiz มาประกอบเป็น Test)
 └─ Parent  → สร้าง Link ส่งให้ Student → Student ทำเสร็จ → Result ส่งกลับ Parent อัตโนมัติ
```

### Test mechanics — Confirmed ✅
- **10 ข้อ/วิชา**
- ทำครบ **5 ข้อ → Skip ได้** (กลับมาทำต่อภายหลังได้)
- กด Skip → **Popup ยืนยัน**: confirm = ได้ Result แบบ **ไม่สมบูรณ์**
- **Cut-scene คั่นระหว่างทาง** โชว์ความคืบหน้า/ผลบางส่วน + ให้กำลังใจ (สร้าง momentum)
- จังหวะ cut-scene (เสนอ):
  - **ข้อ 3** = Hook ("ระบบเริ่มเห็นแนวทางแล้ว") + progress
  - **ข้อ 5** = จุด Skip ("ปลดล็อกผลเบื้องต้น · ทำต่อเพื่อความแม่นยำ") + [ดูผลเบื้องต้น/ทำต่อ]
  - **ข้อ 10** = Complete ("Result พร้อมแล้ว")
- **Honesty:** ผลเบื้องต้น/cut-scene ต้องสื่อชัดว่า "ยังไม่สมบูรณ์ ทำครบจะแม่นกว่า" — รักษา trust

### Result Page (Parent เห็น)
- **AI Summary:** Strength / Weak point / Improve point (+ แนะนำเพิ่มได้) — **กระชับ มีตัวเลข อ่านง่าย เห็นไว**
- **Test result:** รายข้อ ถูก/ผิด + เฉลย + คะแนนรวม %
- **Video Playlist Suggestion:** สอดคล้องกับ Goal
- **Package list** (subscription) + **Contact us** (admin)
- **Learning Plan:** กดเข้าไปสร้าง → ถาม:
  - ระยะ: สั้น (14 วัน–1 เดือน) / ยาว (1–3 เดือน)
  - เวลาเรียน/วัน
  - ช่วงเวลาสะดวก: 8:00–12:00 / 13:00–16:00 / 16:00–18:00 / 18:00–20:00 / 20:00–22:00
  - → ระบบ generate Learning Plan ให้สอดคล้องกับ Result + Goal
- **Gate การ subscribe:** Subscribe → ใช้ Plan+Result ต่อได้ + สร้างเพิ่มเรื่อยๆ / ไม่ subscribe → เห็น Result อย่างเดียว ทำต่อไม่ได้

### Insight Quiz (ใหม่ — รอออกแบบ)
- เพิ่มหลังเลือก Goal เสร็จ · **สมัครใจ / Skip ได้**
- เป้า: เข้าใจ insight ของ user ลึกขึ้น เพื่อให้ AI Summary สื่อ "เราช่วยแก้ปัญหาอะไร" ไม่ใช่แค่คะแนน
- ✅ **แยกชุดคำถามตาม role** (Parent มองลูก/concern · Student มองตัวเอง/self-perception) — *(แก้จากเดิมที่ว่าใช้ชุดเดียวกัน)*
- ✅ **มีผล = ปรับคำแนะนำ (playlist/plan) + โทนการสื่อสาร** (ไม่ใช่แค่โชว์)
- โครงเดียวกันทั้ง 2 ชุด (รองรับ Multi Subject): **Part A General (ถามครั้งเดียว) + Part B Per-subject (1 การ์ด/วิชา)**
  - **Parent:** General = concern / เวลาทบทวนของลูก / อยากเห็นอะไรเปลี่ยน · Per-subject = ท่าทีลูกต่อวิชานี้
  - **Student:** General = motivation / เวลาเรียนเอง / อุปสรรค · Per-subject = ความมั่นใจ + ติดตรงไหน
  - ทั้งคู่ feed เข้า dimension เดียวกัน → Per-subject ปรับ playlist วิชานั้น · General ปรับ Learning Plan + โทน
- ⏳ ยังต้องเคาะ: สเกล/ตัวเลือกแต่ละข้อให้ลงตัว + วิธี generate Test จาก multi-subject

## รายละเอียดเพิ่ม — Confirmed ✅
- **Confidence scale = 5 Mood Icon** (กดเลือก) + ข้อความเล็ก: น้อยมาก / น้อย / กลาง / ดี / ดีมาก
- **Test source:** ดึงจาก **Quiz + Exercise เป็นหลัก** → ถ้าหาไม่ได้ค่อย **Generate (ทางเลือกสุดท้าย)**
- **ผลเบื้องต้น (ข้อ 5):** โชว์ลึกพอให้ "อยากทำต่อ" (teaser จูงใจ ไม่จบในตัว)
- **CTA "ทำต่อให้ครบ" ค้างไว้ตลอด** บนหน้า Result ถ้ายังไม่สมบูรณ์

## Entry Points (3 ทาง) — Confirmed ✅
1. **Social** — link ที่แชร์ออกไป
2. **Clip page** — section "Create Personalize Goal" *(ยังไม่มี → เพิ่มใน prototype)*
3. **Live Stream** — จากหน้าไลฟ์

## Open questions (ต้อง dig ต่อ)
- ⏳ MVP scope: เริ่มที่ Student Journey ก่อนไหม / ตัด AI ส่วนไหนทำทีหลัง
- ✅ Intent Detection: **ให้เลือกเอง (ปุ่ม Student/Parent)** — ไม่ infer
- ⏳ MVP journey: รอ user อธิบาย flow ละเอียด
- ⏳ AI Analysis: ใช้ข้อมูลจริงจาก diagnostic quiz / score prediction คำนวณยังไงให้ honest (ไม่ over-promise)
- ⏳ Diagnostic Quiz: ใช้ engine เดียวกับ แบบฝึกหัด/แบบทดสอบ ไหม
- ⏳ จุด entry: เข้าจาก Landing CTA, หลัง free download, หรือปุ่มในวิดีโอ — ทำทุกจุดไหม
- ⏳ ต้อง login ตอนไหน (strategy บอก "save progress" ตอน signup = login ท้ายสุด)
