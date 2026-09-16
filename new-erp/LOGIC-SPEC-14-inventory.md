# LOGIC SPEC 14 — Inventory (Books / Stock)
> 13 Jul 2026 · 🆕 โมดูลใหม่ (ไม่เคยอยู่ใน scope เดิม) · ที่มา: Inventory mockup ที่ Nock ส่ง
>
> ✅ **BUILT (15 Jul)** — `js/inventory.js` + nav "Inventory" (Operations) · self-contained mock:
>   - KPI: Inventory Items / Warning (≤5) / Out of Stock / มูลค่าสต็อก · filter (type/branch/status/search)
>   - ตาราง: Item/Type/Subject/Grades(range)/Price/Stock/Stock status(In stock·Warning·Out of stock)/Location
>   - Detail modal: info grid + supplier (MOQ/ต้นทุน) + **Reorder (+MOQ)** · **Stock Movements log**
>   - ปรับสต็อก 4 แบบ (spec §39): sale-invoice · sale-standalone · giveaway · restock — แต่ละแบบ push movement + ตัด/เติม stock
>   - Add/Edit item modal (name/type/sub/subject/grades/price/stock/branch/supplier)
>   - stock ≤0 = Out of stock badge · เตือนตอนตัดจนติดลบ (spec §34 edge case)
>   - verify แล้ว: giveaway−1 + Reorder+25 → stock 4→28 · badge Warning→In stock · KPI/มูลค่าอัปเดต · no error
>   - ⏳ **follow-up**: ผูก Book fee บน Invoice ให้ดึง price+grade coverage จากที่นี่ (ตอนนี้ Inventory standalone)

---

## มันคืออะไร
หนังสือ (และของอื่น) = **stock item จริง** มีจำนวน มี supplier ไม่ใช่แค่ "ค่า Book" ลอยๆ บนบิล
⇒ **Book fee บน Invoice ดึงมาจาก Inventory item** (ราคา + grade coverage)

## Inventory item เก็บอะไร (จาก mockup)
```
Items type (Book) · Sub type (Learning Book / Dictionary / Text Book)
Item name · รูป (upload ≤5MB)
Subject (Math/Eng Active/Eng Grammar/Science/Eng) · Grade(s) [หลายเกรด]
Selling Price · Stock (จำนวนคงเหลือ)
Location = per branch (Sukhumvit BKK...)
Status: Active / Inactive · Stock status: Active / Warning / Out of stock
Supplier: บริษัท + ที่อยู่ · Order MOQ · Unit type · Price/Unit
```

## กฎที่เชื่อมกับ Invoice
- ✅ **1 book ผูกกับ Subject + หลาย Grade** (เช่น Math book ครอบ ป.2–ป.6)
- ✅ Book fee = **เก็บครั้งเดียวต่อเล่ม** · เช็คจาก grade coverage ว่านักเรียนมีเล่มนั้นยัง
- ราคา book = Selling Price ต่อสาขา (ไม่ใช่ free-type) → **แก้ความเข้าใจใน LOGIC-SPEC-05**
- Supplier ผูก → เชื่อม procurement/Vendor (สั่งซื้อเมื่อ stock ต่ำ MOQ)

## Dashboard/ops
- KPI: Inventory Items · Warning · Out of Stock
- Last Order date · reorder ตาม MOQ

## Stock mechanics (ยืนยัน 13 Jul)
- ✅ **stock ตัดตอนยืนยันการจ่ายเงินแล้ว** (payment confirmed) — ไม่ใช่ตอนสร้างบิล/ตอนแจก
- ✅ **Out of stock → item Inactive · เลือกใส่บิลไม่ได้ · แจ้ง Admin**
- ⚠️ edge case: 2 บิลจองเล่มสุดท้ายก่อนจ่าย → อาจตัดติดลบ (เก็บไว้)

## ขอบเขต item (ยืนยัน 13 Jul)
- ✅ **ไม่ใช่แค่หนังสือ** — มีของอื่นได้ (อุปกรณ์/ชุด/ของแจก)
- ✅ disposition ได้ 3 ทาง: **ผูก Invoice · ขายแยก · แจก** (แต่ละแบบตัด stock)
- ⇒ ต้องมี stock movement types: sale(invoice) · sale(standalone) · giveaway · restock-in
- book = item type ที่ผูก subject+grade · item อื่นอาจไม่ผูก
