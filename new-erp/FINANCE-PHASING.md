# NockERP Finance — Phasing Map (Reality-Grounded)
> 13 Jul 2026 · เขียนบนข้อจำกัดจริงที่ Nock ยืนยัน (ไม่ใช่แผนในอุดมคติ)

---

## 🧱 ข้อจำกัดจริงที่ต้องยอมรับก่อน (foundation ของทั้งแผน)

1. **Prototype ≠ ระบบ** — `js/fin-*.js`, `billing.js` ฯลฯ เป็น HTML/JS mockup ไม่มี backend
   ไม่เก็บข้อมูลจริง **ใช้ทำงานจริงไม่ได้**
2. **Prototype ครอบคลุม ~60%** ของ workflow เท่านั้น — ไม่สมบูรณ์
3. **Nock ต่อ backend ไม่เป็น** → เปลี่ยน prototype เป็นระบบจริงเองไม่ได้
4. **MJ ไม่มีเวลา** → ยังไม่มีใครรับช่วง build จริง
5. ⇒ **"ERP ปลายทาง" ยังไม่มีเจ้าของและ timeline ที่แน่นอน**

### ผลลัพธ์ที่ตามมา (สำคัญที่สุด)
> Prototype ไม่ใช่ "product" — มันคือ **SPEC / พิมพ์เขียว** ให้คนที่จะ build จริงทีหลัง
> ตัวช่วย Admin ที่จับต้องได้ **ในอนาคตอันใกล้ = Automation + Policy** ไม่ใช่ ERP

```
มือ 100%  ──►  [ Automation + Policy ]  ──►  ERP จริง
(วันนี้)         ↑ ของจริงที่ช่วยได้ใกล้ๆนี้      ↑ ยังไม่มีเจ้าของ
                                              Prototype = พิมพ์เขียวของขั้นนี้
```

---

## 🗺️ Phasing Map — ทุก Workflow

**สถานะวันนี้:** 🔴 มือล้วน · 🟡 มี prototype (ใช้จริงไม่ได้) · 🟢 ERP จริง (— ยังไม่มีสักอัน)
**ตัวช่วยใกล้ๆนี้:** 🌉 Automation · 🟥 Policy · ⏸️ รอก่อน

| Workflow | วันนี้ | ตัวช่วยที่ทำได้เร็ว | ปลายทาง ERP | ใครทำตัวช่วยได้ตอนนี้ |
|---|---|---|---|---|
| **Invoice creation** | 🟡 prototype + Sheet มือ | 🌉 ประกอบบิลจาก Sheet + ส่ง LINE อัตโนมัติ | Invoice module | script/no-code |
| **Payment matching** | 🔴 เทียบ KBiz มือ | 🟥 Bill Payment (Ref) + 🌉 import statement | Payment/Alloc module | ธนาคาร + script |
| **Receipt** | 🟡 prototype + สร้างมือ | 🌉 auto-gen เมื่อจับคู่เงินได้ | Receipt module | script (ต่อจาก matching) |
| **Sales Tax report** | 🔴 Sheet→Excel→merge มือ | 🌉 รวม+แปลงอัตโนมัติจาก Sheet ที่มี | รายงาน derive จาก Invoice | ⭐ script (ง่ายสุด) |
| **WHT / 50 ทวิ** | 🔴 เขียนมือ | 🟥 e-WHT ผ่านธนาคาร (ลบทิ้ง) | WHT engine (ถ้าจำเป็น) | ธนาคาร + KMD |
| **Expense / Request** | 🟡 prototype + Sheet | 🟥 บังคับใช้ + 🌉 อ่าน Sheet จัดหมวด | มี prototype เป็น spec แล้ว | Policy ก่อน |
| **Reimbursement** | 🟡 prototype | ⏸️ รอ (ใช้ Sheet ไปก่อน) | prototype เป็น spec | — |
| **Petty cash** | 🔴 Slack + Sheet | 🟥 imprest เติม 10k อัตโนมัติ | Petty module | Shibasan สั่ง |
| **Statement classify** | 🔴 อ่านทีละบรรทัด | 🟥 Request-first + 🌉 auto-tag vendor | reconcile module | Policy ก่อน |
| **Overseas (SaaS)** | 🔴 เจอใน statement | 🟥 ขึ้นทะเบียนเป็น Recurring | Recurring module | Policy (list ให้ครบ) |
| **Recurring/Fixed** | 🔴 จำ+จ่าย | 🌉 ปฏิทินเตือน + auto-draft | prototype เป็น spec | script |
| **Document → KMD** | 🔴 ปริ้น+จับชุด | 🌉 folder อัตโนมัติต่อเดือน | Document Vault | script/Drive |
| **Master: Customer** | 🔴 Sheet | ⏸️ Sheet ยังเป็น source ไปก่อน | Student/Family entity | — |
| **Master: Vendor** | 🔴 Google Doc | 🌉 ย้าย Doc→Sheet มีโครงสร้าง | Vendor entity | ⭐ ง่ายมาก |
| **CEO approval** | 🔴 ดูไฟล์ทีละใบ | 🟥 validation ก่อนถึงมือ | rule engine | Policy + script |
| **Fee accrual (Book/Bus/Exam)** | 🔴 จด Sheet | ⏸️ ยากถ้าไม่มี ERP | entity ใหม่ | รอ ERP |
| **Staff/Role** | 🟡 prototype (model ผิด) | ⏸️ รอ | RoleAssignment | รอ ERP |
| **Dashboard/Reports** | 🟡 prototype | ⏸️ รอมีข้อมูลจริงก่อน | BI module | รอ data layer |

---

## 🎯 3 กลุ่มที่ควรลงมือ "ตอนนี้เลย" (ไม่ต้องรอ ERP / ไม่ต้องรอ MJ)

### 🟥 กลุ่ม POLICY — 0 บรรทัดโค้ด · แค่ Shibasan ตัดสินใจ
| ทำอะไร | ผลทันที |
|---|---|
| "ไม่มี Request = ไม่มีเงินออก" | ตัดงานคัดแยก statement |
| imprest petty cash เติม 10k/เดือน | ลบ Petty Top-up request |
| ขึ้นทะเบียน SaaS ทั้งหมดเป็น Recurring list | statement ไม่มีรายการปริศนา |
| เลิกเซ็น 50 ทวิ ใบเปล่า | ปิด control gap |

### 🟩 กลุ่ม INTEGRATION — เจรจาภายนอก · ROI สูงสุด
| ทำอะไร | ถามใคร |
|---|---|
| Bill Payment (Ref1/Ref2) | KBank RM |
| e-Withholding Tax | KBank + KMD |
| ยืนยันสถานะ VAT | KMD |

### 🌉 กลุ่ม AUTOMATION สะพาน — script/no-code เล็กๆ · ทำได้โดยไม่ต้องมี backend
เรียงตาม "ง่าย + เห็นผลเร็ว":
1. ⭐ **Sales Tax report** — รวม Sheet ทุกสาขา→Excel All Branch อัตโนมัติ (ลบงานทั้งกอง)
2. ⭐ **Vendor Doc → Sheet มีโครงสร้าง** (ชื่อ/เลขภาษี/ประเภท/%WHT) — ฐานของ WHT ที่ถูกต้อง
3. **Statement auto-tag** — จับคู่ชื่อ vendor อัตโนมัติ 80-90%
4. **Document folder ต่อเดือน** — จัดชุดเอกสารส่ง KMD อัตโนมัติ

---

## ⚖️ กฎกันสะพานกลายเป็นระบบถาวร

> **ทุกสะพาน Automation ต้องตอบได้ว่า "ERP ตัวไหนจะมากลืนมัน"**
> ถ้าตอบไม่ได้ = นั่นไม่ใช่สะพาน มันคือระบบถาวรที่ปลอมตัวมา (แล้วไม่มีใคร maintain)

| สะพาน | ERP ที่จะมากลืน |
|---|---|
| Sales Tax script | รายงาน derive จาก Invoice module |
| Vendor Sheet | Vendor entity |
| Statement auto-tag | Reconcile module |
| Invoice-from-Sheet | Invoice module |

---

## 🚧 บทบาทใหม่ของ Prototype

Prototype ที่ build ไว้ (~60%) **ไม่ทิ้ง** — แต่เปลี่ยนหน้าที่:

```
เดิมคิดว่า:  Prototype → ปรับนิดหน่อย → ใช้งานจริง   ❌ (ทำไม่ได้ ไม่มีคนต่อ backend)
ความจริง:   Prototype = SPEC ที่กดได้ → ส่งให้ dev/บริษัทรับจ้าง build จริง  ✅
```

**สิ่งที่ต้องทำกับ prototype เพื่อให้เป็น spec ที่ดี:**
- เติมส่วนที่ขาด (อีก 40%) ให้ workflow ครบ — เพื่อให้คน build ไม่ต้องเดา
- แนบ workflow-map + business rules กำกับทุกหน้าจอ
- ระบุชัดว่าหน้าไหน = final spec / หน้าไหน = ยังต้องคุย

---

## 📌 สรุปการตัดสินใจที่ต้องขอจาก Nock

1. **ยอมรับไหมว่า** ในกรอบเวลาอันใกล้ ตัวช่วย Admin = Automation+Policy ไม่ใช่ ERP?
2. **เริ่มที่กลุ่มไหนก่อน** — Policy (ฟรี เร็ว) / Sales Tax script (เห็นผลชัด) / Integration (ROI สูงแต่รอคนนอก)?
3. **ใครจะเป็นคนทำ Automation สะพาน** — Nock เอง? Arm? หรือหาคนใหม่? (MJ ไม่มีเวลา)
