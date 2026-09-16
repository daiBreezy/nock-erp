# NockERP — Status Updates

> โฟลเดอร์นี้เก็บ **Weekly / Monthly / Quarterly Update** ที่ Nock ส่งให้ทีม/Shibasan
> Chat ที่ใช้สร้าง: "Update Weekly Report"

## จังหวะการส่ง
| ชนิด | รอบ | ทริกเกอร์ |
|------|-----|-----------|
| Weekly  | ทุกวันจันทร์ | scheduled routine (จันทร์เช้า) |
| Monthly | วันที่ 1 ของทุกเดือน | scheduled routine |
| Quarterly | 1 ม.ค. / 1 เม.ย. / 1 ก.ค. / 1 ต.ค. | scheduled routine (ต้นไตรมาส) |

ไฟล์ตั้งชื่อ: `YYYY-MM-DD-weekly.md` · `YYYY-MM-monthly.md` · `YYYY-Qn-quarterly.md`

---

## Voice & Style (สำคัญ — ยึดตามนี้)
- **Narrative / leadership update** — พูดถึง "คน, insight, ทีม, ปัญหา" ไม่ใช่ git changelog
- เขียนสั้น กระชับ เป็นธรรมชาติ เหมือน Nock เขียนเอง (มุมมองบุคคลที่ 1 "I")
- ภาษา: **เขียนทั้ง 2 ภาษาเสมอ (EN แล้วต่อด้วย TH)** ในไฟล์เดียวกัน คั่นด้วย `---` (ยืนยัน 20 Jul 2026)
- ไม่ต้องใส่ตัวเลข commit / ชื่อไฟล์ code
- **ไม่ดึงข้อมูลจาก git** — เรื่องที่เกิดขึ้นจริงมาจากไฟล์ update + Nock เท่านั้น · ถ้าพูดถึงงานเทคนิค ให้ **แปลเป็นภาษาคน** (เช่น "ปิดระบบ Finance" ไม่ใช่ "3,900 บรรทัดใน 13 ไฟล์")

## โครงสร้าง Weekly (ยึดตามตัวอย่างที่ Nock ให้)
```
Weekly Update (DD – DD Mon YYYY)

Last Week
- <สิ่งที่ทำเสร็จ / เกิดขึ้นจริง — คน + งาน>

This Week
- <แผน / สิ่งที่จะทำ>

Key Insight
- <ข้อคิด / สิ่งที่เรียนรู้เกี่ยวกับปัญหาจริง>

Team Building        (ใส่เมื่อมี)
- <เรื่องทีม / คน / mentoring>

Note                 (ใส่เมื่อมี)
- <หมายเหตุ / ข้อจำกัด / ความคืบหน้าเชิงคุณภาพ>
```
> Section ไม่ตายตัว — เพิ่ม/ลดได้ตามสัปดาห์ (เช่น "Problems & Fixes", "Decisions Needed")

## โครงสร้าง Monthly
```
Monthly Update — Mon YYYY

Highlights            (3-5 เรื่องใหญ่ของเดือน)
Progress vs Plan      (ทำได้ตามที่วางไว้ไหม)
People & Team
Key Insights
Next Month Focus
Risks / Decisions Needed
```

## โครงสร้าง Quarterly
```
Quarterly Update — Qn YYYY (Mon–Mon)

Quarter in One Line
What We Set Out To Do vs What Happened
Biggest Wins
What Didn't Go As Planned
People & Team
Strategic Insights
Next Quarter — Priorities
```

---

## วิธี Generate (ทุกครั้ง)
> ⛔ **ไม่ใช้ git เลย** (ไม่มี `git log` / `git status` / commit) — กฎ Nock 1 ก.ย. 2026
1. **อ่านแหล่งข้อมูลของรอบ:**
   - Weekly: อ่าน "This Week" ของไฟล์ weekly รอบก่อน = แผนที่กำลังรายงานผล
   - Monthly: อ่าน **ไฟล์ weekly ของเดือนนั้นให้ครบทุกไฟล์** + "Next Month Focus" ของ monthly/quarterly รอบก่อน
   - Quarterly: อ่านไฟล์ weekly + monthly ของทั้งไตรมาสให้ครบ
   - ⚠️ header ของ weekly = ชื่อสัปดาห์ที่กำลังจะถึง → section "Last Week" คือบันทึกจริงของสัปดาห์ก่อนหน้านั้น
2. **ถาม Nock 3–5 ข้อ** เพื่อเติมส่วน คน/insight/ปัญหา/แผน
3. **รับ raw notes ดิบๆ จาก Nock** → เรียบเรียงเข้า format (ห้ามเปลี่ยนความหมาย/แต่งเติมข้อเท็จจริงเอง)
4. เขียน draft → Nock ตรวจ/แก้ → save เข้า `updates/` (save = เขียนไฟล์ .md เท่านั้น)

## คำถามมาตรฐานที่ถาม Nock (Weekly)
1. สัปดาห์ที่แล้วมีเรื่อง **คน/ทีม** อะไรบ้าง? (ใครกลับ/มาใหม่/ติดปัญหา/ต้อง sync)
2. เจอ **ปัญหา/อุปสรรค** อะไร แก้ยังไง หรือยังค้าง?
3. **Key insight** อะไรที่ได้เรียนรู้สัปดาห์นี้?
4. **สัปดาห์นี้** จะโฟกัสอะไร?

> Nock จะพิมพ์ตอบ + พิมพ์ raw notes เข้ามา — ผมจัดเรียงให้
