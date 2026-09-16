# LOGIC SPEC 08 — Period Close (Monthly → KMD)
> 13 Jul 2026 · ที่มา: Nock confirm + ผัง Monthly Bills + interview D/E
> ✅ ยืนยัน · ❓ รอ · ⛔ รอ KMD
>
> ✅ **BUILT (15 Jul)** — `js/period-close.js` + nav "Period Close" (Finance & Admin):
>   - Month selector (◀▶) + status (Open/In Review/Submitted) + KPI (validation ผ่าน · Service Bills · Bank · AR)
>   - **Final-gate validation** (6 rules): Service Bill ครบชุด (INV+RE+Payslip) · RE ครบยอด · Bank ครบทุกบัญชี ·
>     Sales Tax sheet · WHT (ใบฟ้า+เหลือง) · vendor docs → แต่ละข้อ Pass/ต้องแก้ + "ดูที่ขาด"
>   - **Bundle checklist** 6 หมวด (spec §11) พร้อม progress + แนบเพิ่ม
>   - **Service Bills table** — ดึง paid invoice จริงจาก DB.invoices + จับคู่ RE (DB.receipts) + Payslip (seed) → ครบชุด/ไม่ครบ
>   - **Gate**: ปุ่ม "ส่งให้ Shibasan" disabled จนกว่า validation ผ่านครบ (กัน reject) · Export bundle (manifest txt)
>   - verify แล้ว: แนบ Bank 3→5 + Sales Tax → validation 2/6→4/6, Pass ขยับ, submit ยังล็อกเพราะ WHT/Payslip ขาด · no error
>   - ที่ยัง mock (รอ KMD/ข้อมูลจริง): Bank statement lines · Sales Tax คอลัมน์ · WHT ผูก vendor · payslip presence (seed)

---

## หน่วย & จังหวะ (ยืนยันแล้ว)
- ✅ **1 ชุดรวมทั้งบริษัท** (ทุกสาขา ทุกสาย) · รายเดือน · ส่ง KMD
- ✅ Shibasan อนุมัติ **2 จังหวะ**: ทยอยเช็คระหว่างเดือน + เช็คก้อนใหญ่ตอนจบ

## เนื้อในชุด (ยืนยันแล้ว)
1. Bank statements ทุกบัญชี (KBank saving+currency · Krungsri ×2 · Credit Advice)
2. Sales Tax sheet — รวม all-branch (Excel)
3. Service Bills = **INV + RE + Payslip** จับเป็นชุด (ต่อการจ่าย 1 ครั้ง)
4. Pay Vouchers — ต้นฉบับให้ KMD (สำเนาเก็บเอง)
5. WHT — ใบฟ้า + ใบเหลือง (ของเดือนนั้น)
6. ใบเสร็จ/ใบกำกับจาก vendor

## Root cause (การประกอบชุด = pain)
- Admin ต้อง **ปริ้น + จับคู่ INV/RE/Payslip เป็นชุด + รวมทุกอย่างด้วยมือ**
- statement ต้องนั่งแยกว่าบรรทัดไหนคืออะไร (spec แยก — ดู WORKFLOW-MAP D2)
- ⇒ to-be: Document Vault ผูกเอกสารกับ transaction ตั้งแต่เกิด → กดปุ่ม export

## Final-gate check = validation ได้
- Shibasan reject เพราะ "ข้อมูลไม่ครบ / รายละเอียดไม่ตรง" (interview F, ยืนยัน reject จริง)
- ⇒ กฎพวกนี้เขียนเป็น **validation rules** ให้ระบบเช็คก่อนถึงมือ CEO ได้

## Deadline ✅ (KMD ยืนยัน 15 Jul)
- ✅ **ประมาณวันที่ 9-10 ของเดือน** · **ถ้านัดเพิ่มรอบ = โดนค่าปรับ**
- (เดิมเข้าใจว่า "ไม่มีวันตายตัว ~สัปดาห์ที่ 2" — ตอนนี้ชัดแล้วว่า 9-10)
- 📌 เอกสารดิจิทัล: เคยสแกนส่งได้ แต่ KMD มารับเองเพราะเอกสารเยอะ (สแกนกินเวลา+ไฟล์ใหญ่)

## ❓ ยังต้องถาม (Nock/Admin)
- Final-gate: Shibasan เช็คอะไรบ้างที่ระบบยังไม่ได้เช็ค (→ validation rules)

## ⛔ รอ KMD (ห้ามเดา)
- Sales Tax sheet มีคอลัมน์อะไร (ค้าง 5 รอบ) + VAT ผูกกับอะไร (สาขา? สินค้า? สาย?)
- Bank statement classification: ปน AR + AP + ค่าใช้จ่าย Shibasan (ดู WORKFLOW-MAP D2)
