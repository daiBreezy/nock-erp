# LOGIC SPEC 10 — Calendar Ops / Attendance / Consumption
> 13 Jul 2026 · ที่มา: mockup ที่ Nock ส่ง (Student / Student-in-Class / Class) + confirm
> ละเอียดกว่า BUSINESS-RULES เดิม — ใช้อันนี้เป็นหลัก

---

## 0. Session Type (แกนใหม่ · จาก "Create Class" mockup)
> ✅ **BUILT (14 Jul)** — `SESSION_TYPES` (calendar-form.js) · Type selector ทั้ง 2 ฟอร์ม
>   (calendar-form + classes.js) · badge บน Class Modal · seed demo · verify แล้ว
>   ⏭️ ยังเหลือ: enforce behavior (Test/Interview ข้าม summary/consume) — layer ถัดไป
แยกจากแกน group/single (ขนาด) — นี่คือ **จุดประสงค์** ของ session:
| Type | = | หักชั่วโมง? | summary? |
|---|---|---|---|
| **Learning** | Class Session (สอนปกติ) | ✅ หัก | ✅ เขียน |
| **Test** | Test Session (วัดระดับ/placement) | ❌ ไม่หัก enrollment | ผล placement |
| **Interview** | Interview Session (คุยผู้ปกครอง) | ❌ | ❌ |
| **Other** | Other Session | Phase 2 | — |
- ⇒ Session มี field `sessionType` · behavior (consume/summary/attendance) ขึ้นกับ type
- Reports: SessionFact ควรกรอง type = Learning สำหรับ metric การเรียน

## A. Student actions (attendance + consumption)
| Action | ทำอะไร | Consumption | บังคับ |
|---|---|---|---|
| **Present** | มาเรียนตามนัด | **หัก 1 session (Hour pkg)** | ต้อง submit Summary หลังจบ |
| **Absent** | ไม่มา ไม่แจ้งล่วงหน้า | หัก 1 session | ต้องใส่ Remark |
| **Leave** | แจ้งล่วงหน้า + เหตุผล ขอเลื่อน | **หัก Leave Quota** (ไม่หัก session ถ้าในโควตา) | ต้องใส่ Remark |
| **Reschedule** | นักเรียนขอย้ายไป session อื่น (ที่ว่าง + related กับ class เดิม) | ไม่หัก | เลือก session ปลายทาง |

- ✅ ยืนยัน (Nock): Present → หัก session · Leave (ในโควตา) → หัก Leave Quota
- ✅ **Leave เกินโควตา = หัก 1 session** (เท่ากับ Absent ในแง่ consumption)
- ✅ **1 Session = 2 Hours** (ตัวแปลงมาตรฐาน · Hour pkg 24h = 12 sessions)

## B. Class-level actions (Admin/Teacher ทำกับทั้งคลาส)
| Action | ทำอะไร | บังคับ |
|---|---|---|
| **Postpone** | เลื่อน **ทั้ง class session** ไปวัน/เวลาใหม่ | Reason + Remark + **notify ผู้ปกครองทุกคนในคลาส** |
| **Substitute — Day** | หาครูแทน**เฉพาะวัน** (ครูตกลงกันก่อน) | duration: one-time / period / permanent |
| **Substitute — Class** | เปลี่ยนครูประจำ**คลาสนั้น** | duration: one-time / period / permanent |
| **Combine** | รวม class หนึ่งเข้าอีก class | ย้ายนักเรียนเข้า primary class + notify ผู้ปกครองที่กระทบ |

> ✅ **BUILT (14 Jul)** — Substitute (`calSubstituteClass`) + Combine (`calCombineClass`)
>   ใน `calendar-ops-new.js` · เมนู Class Modal · verify แล้ว · ไม่มี money logic
> ✅ **Phase นี้ = แค่สลับ/ย้าย ไม่มี logic ซับซ้อน** (Nock 14 Jul)
> เรื่องเงิน/ผลงานครูคนเดิม vs ครูแทน = ผูกกับ **Payroll + HR (Phase 2)** — ยังไม่คิดตอนนี้
> Substitute: แค่ reassign teacher · Postpone: reason+remark+notify · Combine: merge+notify

> 🆕 **Substitute / Combine / Postpone = Phase นี้** (Nock 14 Jul: เลื่อนขึ้นมาทำเลย · มี Figma แล้ว)
> (เดิมมีแค่ Transfer = ย้ายครู/สาขา · Reschedule)

## C. Postpone (class) vs Reschedule (student) — อย่าสับสน
- **Reschedule** = นักเรียน **1 คน** ย้ายไป session อื่น
- **Postpone** = **ทั้งคลาส** เลื่อนพร้อมกัน (ครู/แอดมินสั่ง)

## C2. Reschedule — ข้อจำกัด (ยืนยัน 14 Jul · ยืดหยุ่นมาก)
- target session: **วิชาอะไรก็ได้ · grade อะไรก็ได้ · ครูใครก็ได้**
  (เหตุผล: ฝากเด็กไปนั่งอีกห้อง ครูที่นั่นก็สอนวิชาเดิมของเด็กได้)
- **สาขา: ยังไม่ข้าม** — cross-branch = Phase ถัดไป (phase นี้ = สาขาเดิม)
- ⭐ **target ต้องอยู่ "สัปดาห์เดียวกัน"** ("Only on Week Schedule") = make-up ในสัปดาห์นั้น
- ✅ **Reschedule ไม่หัก Leave Quota + ไม่หักชั่วโมง** (เพราะชดในสัปดาห์เดิม)
- action ทำได้ก่อน class ถึง End Class · ไม่มีลิมิตจำนวนครั้ง
- flow: More menu → Re-schedule → เลือกวัน/เวลา (ในสัปดาห์) → เลือก session ปลายทาง → Confirm
  → session เดิม mark "Reschedule" · เด็กไปโผล่ใน class ปลายทาง

### Reschedule vs Leave (เส้นแบ่ง)
| | เงื่อนไข | ผล |
|---|---|---|
| Reschedule | ชดได้ใน **สัปดาห์เดียวกัน** | ฟรี — ไม่หัก quota/ชั่วโมง |
| Leave | ชดในสัปดาห์นั้นไม่ได้ | หัก Leave Quota (เกิน → หัก session) |

## 🔑 Consumption model = ยึด enrollment ของนักเรียน (ยืนยัน 14 Jul)
> เด็กที่ reschedule ไปนั่งใน class วิชาอื่น (เช่น Eng) → **ยังหักชั่วโมงจาก enrollment
> วิชาของตัวเอง (Math)** ไม่ใช่หักตามวิชาของ class
- ⇒ session = "ที่นั่ง + เวลา + ครูคุม" · การหัก/attendance ผูก **student's enrollment subject**
- ⚠️ กระทบ SessionFact (Reports): subject ที่ consume = enrollment ของเด็ก ไม่ใช่ subject ของ class

## D. Student-in-Class states (marker บนตัวนักเรียน)
Trial Schedule · Test Schedule · Combine · Postpone · Reschedule
(เชื่อมกับ CRM Test/Trial + calendar ops)

## หน่วย consumption (ยืนยัน 13 Jul)
- ✅ **หักเป็นหน่วย Session เสมอ** (ไม่หักเป็น hours ย่อย) · 1 session = 2 hrs
