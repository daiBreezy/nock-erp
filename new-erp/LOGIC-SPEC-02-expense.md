# LOGIC SPEC 02 — Expense / Procure-to-Pay
> เอกสารกฎ (ไม่ใช่ UI) · เดินทางไปกับ Figma → MJ · 13 Jul 2026
> วิธีใช้: **Nock อ่าน แล้ว ✅ ถูก / ❌ ผิด / ➕ ขาด — ไม่ต้องอธิบายเป็นคำพูด**
> ⭐ Spec นี้ถอด **2 ด้านเทียบกัน**: 🖥️ PROTOTYPE (จากโค้ด `fin-requests.js`/`data-finance.js`) vs 🌍 REALITY (จาก interview)
>
> **คอลัมน์ VERDICT:** ✅ ตรง = build ถูก · ⚠️ ต่าง = ต้องคุย · 🔴 ขาด = ยังไม่ build · 🟣 เกิน = build แต่จริงไม่ใช้

---

## 🎯 ภาพรวม — จุดต่างที่ใหญ่ที่สุด (อ่านอันนี้ก่อน)

> ✅ **ยืนยันโดย Nock (13 Jul):** approval หลายชั้น + Request lifecycle = **เป้าหมาย to-be ที่ถูกต้อง**
> เหตุที่ปัจจุบันทุกอย่างไหลไป Shibasan คนเดียว **เพราะยังไม่มีระบบจริง** ไม่ใช่เพราะไม่ต้องการระบบ
> ⇒ **Prototype build ถูกทาง — MJ build ต่อได้** (ไม่ใช่ "เกิน" อย่างที่ Claude เข้าใจผิดตอนแรก)

| # | 🖥️ Prototype (= to-be) | 🌍 ปัจจุบัน (as-is, ยังไม่มีระบบ) | VERDICT |
|---|---|---|---|
| 1 | มี Request system + approval หลายชั้น | ยังไม่มี Request · จ่ายตรง 100% · ขอผ่าน Slack | ✅ prototype ถูก · as-is รอระบบ |
| 2 | อนุมัติ 3 ชั้นตามวงเงิน (Mgr/AreaMgr/Director) | Shibasan อนุมัติคนเดียว **เพราะไม่มีระบบให้กระจาย** | ✅ to-be ที่ต้องการ |
| 3 | Shibasan จ่ายต้องผ่าน request | Shibasan จ่ายเองได้เลย ไม่ผ่านใคร | ⚠️ control gap — เป้าหมายคือให้เข้าระบบ |
| 4 | Petty imprest เติมเต็มสิ้นเดือน | ตรงกับ idea ของ Shibasan (ยังไม่ทำ) | ✅ aligned |
| 5 | — (ไม่มี WHT เลย) | WHT 32 ใบ/เดือน เขียนมือ | 🔴 ขาดทั้งก้อน |
| 6 | — (ไม่มี Overseas/FX) | จ่าย SaaS ตปท. (Zoom/Figma) | 🔴 ขาด |

> 💡 **ข้อสรุปสำหรับ MJ:** prototype ฝั่งนี้ = **to-be ที่ถูกต้อง** build ต่อได้เลย
> แต่ต้องรู้ว่า **การเปลี่ยนจาก "จ่ายตรง+Slack" → "Request+Approval" ไม่ใช่แค่เปิดระบบ**
> มันคือ **การเปลี่ยนพฤติกรรมคน** ที่ต้องมี Shibasan สั่ง (Policy) ควบคู่กับการมีระบบ (Software)

---

## PART A — ประเภทการจ่ายเงิน (transaction types) 🖥️

โค้ดแบ่ง type ไว้ (`txnType`):
| type | label | ทิศ | หมายเหตุ |
|---|---|---|---|
| `income`/`received` | Income / Top-up | เข้า | received = เติม petty |
| `budget` (source=central) | Direct Paid | ออก | จ่ายตรงจาก Central Bank |
| `usage` (source=petty) | Record | ออก | จ่ายจาก petty สาขา |
| `reimbursement` | Reimburse | ออก | staff สำรองจ่าย |
| `salary`/`rental`/`utility` | Recurring | ออก | ค่าประจำ |

> ➡️ **ตรวจ:** ครบไหม? 🌍 interview เพิ่ม: **WHT payment · Overseas/SaaS** → ยังไม่มี type รองรับ

---

## PART B — Request Lifecycle 🖥️ (นี่คือหัวใจที่ build ไว้)

```
pending ──approve──► approved ──[KBiz โอนจริง นอกระบบ]──► markTransferred
   │                    │                                    (SA แนบสลิป → paid)
   │                    └──cancel (ก่อน confirm)                    │
   └──reject                                                        ▼
                                                    uploadReqTaxInv (แนบ tax invoice)
                                                            → closed + **สร้าง Ledger ตรงนี้**
```

**กฎที่ build ไว้:**
- `approve` = แค่ endorse **เงินยังไม่ขยับ** → รอโอนจริงผ่าน KBiz (นอกระบบ)
- `reject` = **บังคับใส่ remark**
- `cancel` = ได้เฉพาะตอน approved (ก่อน confirm) · **บังคับ reason + remark**
- ⭐ **Ledger (Expense entry) สร้างตอน "แนบ tax invoice → closed"** ไม่ใช่ตอนโอน
  (การตัดสินใจ Nock 6 Jul: ledger ต้องสะท้อนรายจ่ายที่มีเอกสารครบ ไม่ใช่แค่โอนเงิน)
- ยกเว้น **Petty Top-up** → สร้าง ledger ตอนโอนเลย (ไม่มี tax invoice step)

> ➡️ **ตรวจ:** 🌍 ปัจจุบันไม่มี lifecycle นี้ — Admin จ่ายตรงแล้วเขียน Pay Voucher มือ
> lifecycle นี้ = **เป้าหมาย** ที่อยากให้เป็น ใช่ไหม? หรือซับซ้อนเกินของจริง?

---

## PART C — ใครอนุมัติได้ (approval tiers) 🖥️ vs 🌍 ⚠️ จุดต่างใหญ่

### 🖥️ Prototype: อนุมัติตามวงเงิน (3 ชั้น)
| วงเงิน | ต้องใช้ระดับ | โค้ด |
|---|---|---|
| ≤ 1,000 | ไม่ต้องอนุมัติ (`none`) | tierFor |
| > 1,000 | Manager | TIER_RANK manager:2 |
| > 3,000 | Area Manager | area_manager:3 |
| > 5,000 | Director / Special Admin | director:4 |

+ กฎเสริม: **Petty Top-up → Director/Special เท่านั้น** (ดึงจาก Central)
+ ต้อง `inScope` (เห็นเฉพาะสาขาที่ตัวเองดูแล)

### 🌍 Reality: Shibasan อนุมัติคนเดียว
- interview B7: *"ชิบะซังคนเดียว"* กดเงินออกได้
- interview D3: Special Admin รวบ request จาก Slack → ส่ง Shibasan approve

> ✅ **ยืนยัน (Nock 13 Jul):** ระบบ 3 ชั้น = **to-be ที่ต้องการ** — build ถูกแล้ว
> ปัจจุบัน Shibasan อนุมัติคนเดียว **เพราะยังไม่มีระบบให้กระจายอำนาจ** ไม่ใช่เพราะไม่อยากกระจาย
> ➡️ **ยังต้องตรวจ (ให้ threshold ตรงจริง):**
> - วงเงิน 1k / 3k / 5k เป็นเลข mock — **เลขจริงที่อยากให้แต่ละชั้นอนุมัติได้คือเท่าไหร่?**
> - ใครเป็น Manager / Area Manager ที่จะรับสิทธิ์อนุมัติจริง? (ต้อง map กับ Staff)

---

## PART D — Petty Cash (imprest) 🖥️ ✅ ตรงกับ idea Shibasan

**กฎที่ build:**
- `pettyBudget(branch)` = วงเงินต่อสาขา (default 10,000 · แก้ใน Settings)
- running balance ต่อสาขา (`pettyBalance`) — ติดลบได้
- **สิ้นเดือนเติมกลับให้เต็ม** = imprest system

**🌍 Reality:** ตรงเป๊ะกับที่ Shibasan เสนอ (D3: auto top-up 10k ทุกสาขาทุกเดือน)

> ➡️ **ตรวจ:** เติม 10k **เท่ากันทุกสาขา** หรือ **แต่ละสาขาไม่เท่ากัน**? (โค้ดรองรับต่างกันได้)
> 🌍 interview D3: "บางสาขาเดือนละครั้ง บางสาขาหลายครั้ง" → วงเงินอาจต้องต่างกัน

---

## PART E — Reimbursement 🖥️

**กฎที่ build:**
- **ทุก role สร้างได้ รวม Teacher**
- อนุมัติ = **Director/Special เท่านั้น** · จ่ายจาก Central
- **Forward** จากสาขา → Central ได้ (ถ้าวงเงินเกิน comfort ของ branch admin)
- status: `pending → forwarded → paid / rejected` · reject บังคับ remark

> ➡️ **ตรวจ:** 🌍 interview ไม่ได้ลงลึกเรื่อง reimbursement — ตรงกับความจริงไหม? ใครเบิกบ่อยสุด?

---

## PART F — 🔴 สิ่งที่ Prototype ไม่มีเลย (ขาดทั้งก้อน)

### F1. WHT (หัก ณ ที่จ่าย) 🔴
- 🌍 32 ใบ/เดือน เขียนมือ · อัตรา "จำเอา" · เลขไม่รัน · Shibasan เซ็นใบเปล่า · โดนค่าปรับ
- ต้องการ: **Vendor master** (ประเภทเงินได้ → %) + generate 50 ทวิ + เลขรัน + digital sig
- ⚠️ **แยกเป็น LOGIC-SPEC-03 ต่างหาก** (ใหญ่พอตัว)

### F2. Overseas / SaaS (Zoom/Figma/Gather) 🔴
- 🌍 จ่ายผ่านธนาคาร → Credit Advice · เกี่ยว FX + อาจ ภ.พ.36
- ต้องการ: type ใหม่ + recurring subscription list

### F3. Vendor Master 🔴
- 🌍 อยู่ใน Google Doc · อัตรา WHT "จำเอา"
- ต้องการ entity: `{ชื่อ, เลขผู้เสียภาษี, บุคคล/นิติบุคคล, ประเภทเงินได้, %WHT, เลขบัญชี}`
- **เป็นฐานของ F1** — ไม่มีอันนี้ WHT engine ทำงานไม่ได้

---

## PART G — Balance / Ledger 🖥️

- Central Bank: opening 1,500,000 + Σ signed(central entries)
- Petty: running balance ต่อสาขา
- soft delete: `status:'inactive'` (ไม่ลบจริง) — **ไม่มี Delete มีแต่ Inactivate**

> ➡️ **ตรวจ:** opening balance 1.5M เป็นเลข mock — เลขจริงมาจากไหน? ใครใส่?

---

## 🔴 สรุป — สิ่งที่ MJ ต้องรู้จาก spec นี้

| ลำดับ | ประเด็น | Action |
|---|---|---|
| 1 | **Approval 3 ชั้น อาจเกินจริง** (Shibasan อนุมัติคนเดียว) | ⚠️ ยืนยันก่อน build ต่อ |
| 2 | **Request lifecycle ยังไม่มีใครใช้** (จ่ายตรง 100%) | ⚠️ ต้องมี policy เปลี่ยนพฤติกรรม |
| 3 | **WHT ขาดทั้งก้อน** (32 ใบ/เดือน pain สูง) | 🔴 → LOGIC-SPEC-03 |
| 4 | **Vendor Master ขาด** (ฐานของ WHT) | 🔴 build ก่อน WHT |
| 5 | **Overseas/FX ขาด** | 🔴 |
| 6 | **Petty imprest ตรง idea Shibasan** | ✅ build ต่อได้เลย |

---

## ✍️ ช่องให้ Nock ตรวจ

- [ ] PART C — Approval 3 ชั้น = อยากได้จริง หรือ Shibasan อนุมัติคนเดียวพอ: __________
- [ ] PART B — Request lifecycle (approve→transfer→tax invoice→ledger) ตรงที่อยากได้ไหม: __________
- [ ] PART D — Petty เติม 10k เท่ากันทุกสาขา หรือต่างกัน: __________
- [ ] PART E — Reimbursement ตรงจริงไหม ใครเบิกบ่อยสุด: __________
- [ ] PART G — opening balance จริงมาจากไหน: __________
- [ ] ถัดไป: ถอด WHT (Spec 03) เลยไหม หรือเคลียร์ Vendor Master ก่อน: __________
