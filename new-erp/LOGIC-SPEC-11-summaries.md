# LOGIC SPEC 11 — Summaries / Course-End
> 13 Jul 2026 · make sure walk · Nock confirm

---

## Session Summary (ยืนยัน)
- ครูเขียน **ต่อนักเรียนรายคน** (1 คาบ 6 คน = 6 summaries)
- ✅ Flow: **ครูเขียน → Submit → Admin/Manager Approve → ส่ง Parent**
- หลัง sent = immutable (แก้ = delete + resend)

## Course-End Summary (ยืนยัน)
- trigger: hours/weeks หมด (auto) หรือ Admin/ครูกดสร้าง
- ครูสร้าง → ครู approve → ส่ง · Admin สร้าง → **ครูต้อง confirm ก่อนส่ง**

## Course Summary + Skill Analytics (🆕 จาก mockup — ต่างจาก Session Summary)
- **Session Summary** = ต่อคาบ ต่อคน (free-text + ดาว)
- **Course Summary** = rollup รายเดือน (June/July/Aug Summary · n Sessions) + รวมทั้งคอร์ส
  - **Report Analytics: skill % — Logic / Analytics / Context Reading** (เช่น 80/64/96)
  - **Overall Progress · To Improve · Strengths** (free-text) + ดาวรวม
  - Contact us section (Online Learning / Chat with Admin)
- **Summary Template** = 5 topic · ให้ **ดาว (rating)** ต่อ topic

## 🔑 AI role (แก้จากที่เคยเขียน — จาก Template mockup)
- ✅ Template (topic + ดาว) = **โครงทำล่วงหน้าได้**
- ✅ **skill % น่าจะคำนวณจากดาวอัตโนมัติ** (Logic/Analytics/Context ← ratings)
- ⚠️ **free-text** (Overall/To Improve/Strengths · per-session narrative) = ครูเขียนเอง (AI ช่วยเนื้อไม่ได้)
- ⇒ AI/ระบบช่วย: โครง + คำนวณ analytics · **ไม่ช่วย: เนื้อ narrative**
- ❓ skill % มาจากไหนแน่ (map ดาว→skill ยังไง)

## 🎨 Parent-facing Course Summary — DESIGN PROPOSAL (14 Jul)
> ✅ **BUILT (14 Jul)** — `js/course-summary.js` · ปุ่มในหน้า Summaries · verify แล้ว
>   skill dimension ต่อวิชา · ดาว→ระดับ (Developing/Proficient/Strong) + เทรนด์ ·
>   AI compile → ครู Overwrite/Confirm → Send · text editable (หัวใจ)
> Nock: อย่าลอก mockup · คิดจากโจทย์ "พ่อแม่อ่านแล้วเห็นว่าลูกโตขึ้น"
> ⚠️ ตัวเลข skill% ใน mockup = เชื่อไม่ได้ · เป็น design ที่ต้องคิดใหม่

**หลักคิด 3 ข้อ:**
1. **การเติบโต = ความเปลี่ยนแปลง** (ก่อน→หลัง) ไม่ใช่ภาพนิ่ง · เลขเดี่ยวโชว์ growth ไม่ได้
2. **Text = ตัวสินค้า** · ตัวเลข/กราฟ = แค่ทำให้อ่านง่าย · ประโยคเฉพาะเจาะจงจากครูมีน้ำหนักสุด
3. **อย่าสร้าง precision ปลอม** — ใช้ระดับ (Developing/Proficient/Strong) + เทรนด์ ↑ แทน % เป๊ะ

**โครง (เรียงตามที่พ่อแม่อยากรู้):**
1. มาเรียนสม่ำเสมอไหม → attendance (จาก SessionFact)
2. ได้เรียนอะไรจริง → หัวข้อที่เรียน (text)
3. ★เก่งขึ้นไหม★ → เทรนด์ก่อน→หลัง (visual โชว์ "ขยับ")
4. เก่ง/ต้องพัฒนาอะไร → Strengths / To Improve (text)
5. ต่อไปเรียนอะไร → คำแนะนำ (text)

- ทั้งหมด **derive** จาก session summary + rating + attendance → ครูไม่ทำงานเพิ่ม

**กระบวนการสร้าง Course Summary (ยืนยัน 14 Jul):**
```
Class/Session Summaries (ครูเขียน+ให้ดาว) → AI รวบเป็น Course Summary → Teacher Overwrite/Confirm
```
- ✅ AI = รวบ session summaries ที่มีอยู่ (ไม่แต่งเอง) · ครูตรวจ/แก้/ยืนยัน
- ✅ **ดาว = input เร็วสุดของครู** · **ระดับ (Developing/Proficient/Strong) = output พ่อแม่** (map จากดาวเฉลี่ย)

**★ Rating rubric — แต่ละ Subject เจ้าของ skill dimension เอง (3-5 อัน):**
```
Math → ตรรกะ · การคำนวณ · การแก้โจทย์
Eng  → การอ่าน · ไวยากรณ์ · การพูด
```
- ครูให้ดาว dimension เดิมทุกคาบของวิชานั้น → เฉลี่ย/คาบ → **เทรนด์ข้ามคาบ = การเติบโต**
- ตั้ง dimension ต่อวิชาใน Settings · แก้ปัญหา "หัวข้อกลางใช้ทุกวิชาไม่ได้"
- Class Summary โชว์ average ดาว/คาบ · Course Summary โชว์เทรนด์ระดับ + text

## เชื่อมกับ workload
- summary รายคน = ตัวขับ effectiveLoad ของครู (class × students)
- ดู Healthy Status Formula ใน BUSINESS-RULES
