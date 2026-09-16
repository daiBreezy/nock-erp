# LOGIC SPEC 12 — Business Line × Branch Model (ราก)
> 13 Jul 2026 · #1 structural requirement · Nock confirm
> ที่มา: Vendor Doc (Sriracha เช่าที่เดียว มี 3 สาย)

---

## โครงสร้าง (ยืนยันแล้ว)
```
Branch (ที่ตั้งกายภาพ · 5)        BusinessLine (3)
  Sukhumvit                       Liclass  (นักเรียนญี่ปุ่นในไทย)
  Silom                           NAS      (Nockacademy School · นักเรียนไทย)
  Bang-Na                         NA App   (แอปเรียนพิเศษ เด็กไทย)
  Sriracha
  Pattaya
```
- ✅ **แบบ A: Branch = ที่ตั้ง · ในนั้นมีหลายสาย** (Sriracha = Liclass+NAS+NA App เช่าที่เดียว)
- ✅ **2 แกนตั้งฉากกัน** — ทุก entity ต้องรู้ทั้ง `branch` × `businessLine`
- ✅ **sparse matrix** — แต่ละสาขาเปิดสายไม่เท่ากัน (Sukhumvit=Liclass เท่านั้น? · Pattaya=NAS?)
- config ต่อสาขาว่าเปิดสายไหน (เหมือน pattern `branchSettings` เดิม)

## ⚠️ prototype เดิมรู้จักแค่ `branch` → ต้องเพิ่ม `businessLine`
กระทบ: doc numbering (01/02=biz) · บัญชีรับ (แยกสาย) · package type · VAT · Reports · Settings

## Matrix จริง ✅ (ยืนยัน 15 Jul — A4)
> **กฎ: ทุกสาขามีแค่ 1 Business Type — ยกเว้น Sriracha ที่มีครบ 3**
| Business Type | สาขา |
|---|---|
| **Liclass** | **Sriracha · Thonglor** (2 สาขาเท่านั้น) |
| **Nockacademy (NAS)** | หลายสาขา |
| **NA App** | สาขา = **เช่าที่เป็น Studio** ให้ครู Livestream (ไม่ใช่ห้องเรียน physical) · มีที่ **กทม** · **ทีม Dev อยู่ Sriracha** |
| **Sriracha** | ⭐ **มีทั้ง 3 types ในที่เดียว** |

⇒ matrix เป็น **sparse จริง** และ **NA App ไม่ใช่ "สาขาเรียน"** — เป็น studio/dev site
  (ยืนยันอีกชั้นว่า NA App = คนละโลก · ยัง park ไว้)

## ✅ ยืนยัน + ขอบเขต (13 Jul)
- **NA App = แอป (digital/subscription) คนละโลกกับ tutoring** — ยืนยันแล้ว
- ⏸️ **NA App = พักไว้ก่อน** (Nock: จะทำให้สับสน) → ยังไม่ถอด logic
- ⇒ **scope การคุยตอนนี้ = tutoring เท่านั้น (Liclass + NAS)** · class × session × attendance
- NA App = โลกที่ 2 (app user + subscription) ค่อยแยกคุยทีหลัง
