# LOGIC SPEC 04 — Payment & Receipt
> เอกสารกฎ · เดินทางไปกับ Figma → MJ · 13 Jul 2026
> ที่มา: mockup "Create Receipt / Split" + interview (C3–C5) + Nock confirm
> สัญลักษณ์: ✅ ยืนยันแล้ว · ❓ รอยืนยัน
>
> ✅ **BUILT (15 Jul)** — `js/billing-receipt.js` (แยกจาก billing.js) · Receipt tab ใน doc modal:
>   - **Coverage bar** ราย line (receipted/remaining · % · ปิดที่ 100%)
>   - **Auto** = ออกใบเดียวครบทุก line · **Manual (แตกใบเสร็จ)** = เลือก line ต่อใบ · line ที่ออกแล้ว disabled กันซ้ำ
>   - **RE numbering**: `RE<refNo>` ใบแรก · `/2 /3` ใบถัดไป (reflect INV)
>   - **Customer Tax** (ชื่อ/เลขภาษี/ที่อยู่) เก็บต่อใบ · พิมพ์ลง Bill To
>   - **ส่วนลดพี่น้อง/promotion** ผูกกับใบที่มี course line ใบแรก (ownsDiscount) → Σ(receipt)=invoice เป๊ะ
>   - **Gate**: ออกได้เฉพาะ status Paid/confirmed (ยืนยันเงินเข้า KBiz · T+1) · ยังไม่ Paid = แสดงข้อความล็อก
>   - verify แล้ว: แตก Math|Thai+Eng → RE6905-59 (฿3,960 หลังหักส่วนลด) + RE6905-59/2 (฿14,400) · Σ=฿18,360 เป๊ะ
>   - ⚠️ ยังไม่ผูก DB.receipts pool เดิม (legacy) — inv.receipts เป็น store ใหม่ใน session

---

## Receipt splitting (ยืนยันแล้ว 13 Jul)

- ✅ **1 Invoice → หลาย Receipt ได้**
- ✅ **แตกตาม line item** (ลูกค้าอยากแยกค่าเรียน / ค่าเดินทาง คนละใบ) — ไม่ใช่แตกตามการจ่าย
- ✅ **แตกได้หลายรอบ** (ออกค่าเรียนวันนี้ · ค่าเดินทางทีหลัง)
- ✅ **ห้ามตัดทิ้งถาวร** — สุดท้าย Σ(ทุก receipt) = ยอด invoice เป๊ะ
- ⇒ ระบบต้อง track ต่อ line: **receipted / ยังเหลือ** + กันไม่ให้ line ซ้ำใบ

**Invariant:** ทุก line ถูกจัดลงได้แค่ 1 receipt · ณ เวลาใดก็ตาม coverage ≤ 100% · ปิด invoice ได้เมื่อ = 100%

## Receipt fields (จาก mockup)
- Customer Tax (ชื่อ/เลขภาษี/ที่อยู่) — เก็บต่อ receipt
- สร้างได้ 2 แบบ (ยืนยัน 14 Jul):
  - **Auto Create** = ออก **ใบเดียวครบทุก line อัตโนมัติ** (ไม่แตก)
  - **Manual Create** = customize/แตกได้ตามใจ
- เลขที่ RE-prefix (RE69052401012)
- ส่วนลดพี่น้อง 20% แสดงบน receipt ด้วย

## Payment (จาก interview)
- ✅ ออก Receipt **หลังยืนยันเงินเข้าจริงใน KBiz** เท่านั้น (C4.9) — ไม่เชื่อสลิปอย่างเดียว
- ✅ T+1: KBiz เห็นเฉพาะรายการเมื่อวาน → receipt ออกวันเดียวกับจ่ายไม่ได้ (C5.1)
- ⏱ เทียบสลิป 2 นาที/รายการ (C3.5)

## Payment ≠ Receipt split (ยืนยันแล้ว 13 Jul)
- ✅ **Invoice คือตัวกำหนดการจ่าย** — 1 invoice = ยอดที่ต้องจ่าย
- ✅ การแตก receipt = **แบ่งกระดาษเท่านั้น** ตัวเงินไม่แตกตามใบเสร็จ
- ✅ ไม่มีเคส "เงินแยก + ใบเสร็จแยก" พร้อมกัน

## เลขที่ Receipt ✅ (Nock ออกแบบ 13 Jul)
- RE **reflect จาก INV ตรงๆ**: `INV691124-01-02-001` → `RE691124-01-02-001`
- แตกหลายใบ → `/1`, `/2` (ดู LOGIC-SPEC-01 PART F)
- ✅ แก้ปัญหาเดิม (ใบเสร็จเรียงตามการโอน = ตรวจย้อนยาก)

## ❓ ยังต้องถามต่อ (minor)
- Auto Create ทำอะไร (ออกใบเดียวครบ vs แนะนำการแตก)
