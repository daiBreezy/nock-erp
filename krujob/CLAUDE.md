# KruJob — Project Context (อ่านก่อนเริ่มงานทุกครั้ง)

> ไฟล์นี้คือ context ส่งต่อข้ามเครื่อง Claude Code จะอ่านอัตโนมัติเมื่อเปิดโฟลเดอร์นี้
> เดิมพัฒนาบนอีกเครื่อง ย้ายมาทำต่อ

## โปรเจกต์คืออะไร
**KruJob** = การ Re-design เว็บหางานครู **krujob.com** (job board สำหรับครู เชื่อมครู↔โรงเรียน/สถาบันกวดวิชาในไทย)
- Owner: Nock (พูดไทย)
- Ref: Grab · LinkedIn · JobDB · JobThai
- แยกจากโปรเจกต์ NockERP (คนละอัน)

## Deliverable
- **`krujob-proto.html`** — interactive HTML prototype ไฟล์เดียว self-contained (เปิดใน Chrome ได้เลย)
- ยังเป็น prototype (ยังไม่ production, ไม่มี backend, ข้อมูลเป็น mock ใน JS)

## Tech / วิธีทำงาน
```
Vanilla HTML/CSS/JS ไฟล์เดียว · ไม่มี framework · ไม่มี build
Font: Inter + IBM Plex Sans Thai (Google Fonts CDN)
Icons: Tabler Icons (inline SVG) — ห้ามใช้ emoji เด็ดขาด
School logos: รูปจริงฝังเป็น data URI (base64) ใน `SCHOOL_LOGO_IMG{}` — ถ้าไม่มีรูป fallback เป็นไอคอน Tabler (SCHOOL_ICON) · ต้นฉบับรูปอยู่โฟลเดอร์ "School LOGO" · schoolIco() เลือกให้เอง
Theme: shadcn "Lime" (oklch tokens) light/dark · i18n TH/EN
Mobile-first (กลยุทธ์ LINE-first)
```
- เวลาแก้ต้องเปิดดูจริงใน Chrome / preview เสมอ แล้ว verify ก่อนบอกว่าเสร็จ
- Nock ชอบให้ลงมือทำจริง + จับ feature ให้ครบ + คุยเป็นภาษาไทย

## ⚠️ Gotchas สำคัญ (พลาดง่าย)
1. **oklab ไม่ใช่ oklch สำหรับ tint** — `color-mix(in oklch, สีเขียว, ขาว)` เรนเดอร์เป็น **แดง/แซลมอน** (บั๊ก hue ของ oklch กับสี achromatic) → ใช้ `color-mix(in oklab, ...)` เสมอ
2. **primary สว่างมาก (lime 0.84)** — ห้ามใช้ `color:var(--primary)` เป็นสีตัวอักษรบนพื้นอ่อน (จาง) → ใช้ `var(--primary-accent)` (เขียวเข้ม อ่านง่าย) ที่นิยามไว้แล้ว
3. **Icons = Tabler เท่านั้น** — มีระบบ runtime hydrator (`TI{}` = path, `EMAP{}` = emoji→ชื่อ, `hydrateIcons()`) แปลง emoji→SVG อัตโนมัติ เพิ่มไอคอนใหม่ที่ TI/EMAP จุดเดียว ห้ามใส่ emoji ดิบ
4. **Google Maps (iframe)** — ทำงานใน Chrome (ไฟล์ local) แต่ถูกบล็อกใน Claude Artifact viewer (CSP frame-src) → มี schematic เป็น fallback
5. **Navigation** — `go(id)` สลับ .screen ด้วยคลาส .active/.back; ต้องลบ .back ออกจากจอปลายทางตอน forward (แก้บั๊กแล้ว) · top nav แสดงเฉพาะหน้า hub (feed/myjobs/schools)

## Product decisions (ที่ตกลงกับ Nock)
- **Phasing:** (1) Job board + Teacher/School profile → (2) Professional network → (3) Marketplace (สอนแทน/งานรายวัน)
- **ฝั่งครู = priority #1** · solo builder ไม่มีทีม dev → ค่อยๆทำ
- ครูฟรี (มี Boost optional) · โรงเรียนจ่าย (subscription ค้นครู + Boost)
- **Verification = แรงจูงใจ ไม่บังคับ** (ยืนยันมาก → ดันอันดับ +% → trust) เชื่อมคุรุสภา/DBD
- **LINE = ช่องทางหลัก** (Login + daily match digest) — ซ่อน setting
- **รองรับทุกคน** ครูไทย+ต่างชาติ / รร.ทุกประเภท → i18n รองรับทุกภาษา (base TH/EN)
- **Location = ปัจจัย match #1** (ปัจจุบัน + จังหวัดเป้าหมาย/ย้าย)
- Feed 2 ทาง (โรงเรียนโพสต์รับครู / ครูโพสต์หางาน) · search เรียง Match% ก่อน
- School profile = mini-website (4 tab: ข้อมูล/รีวิว/งาน/FAQ) + rating + Monthly TOP 10

## สร้างเสร็จแล้ว ✅ (ฝั่งครู)
Top nav (unified) + Notifications dropdown · Feed (2-panel + segment control งานแนะนำ/ใหม่/Match + inline search) · Map view (Google Maps iframe + รัศมี 1/3/5/10/15 + เส้นรถไฟฟ้า + หมุดโลโก้) · Search · Job Detail (+ JD หน้าที่/คุณสมบัติ) · School Profile · My Jobs (Match/New/Saved/Applied + paywall blur → Pricing) · Schools directory · Register (social login) · progressive Onboarding · Teacher Profile · CV autofill + multi-CV/default · Verification Center · Settings (theme/lang/LINE) · Applied re-apply 7 วัน + countdown · Tabler icons ครบ 0 emoji

## ยังไม่ทำ (ค้าง)
- **ฝั่งโรงเรียน (สำคัญสุด):** ลงประกาศงาน + ATS จัดการผู้สมัคร + ค้นหาครู + แชท
- Messages/Chat (ครู↔โรงเรียน)
- Notifications page เต็ม (ตอนนี้มีแค่ dropdown)
- Boost flow (ซื้อ/ดัน)

## Artifact เดิม (บนคลาวด์)
https://claude.ai/code/artifact/6b2a1bda-a79c-4079-bbf8-2e1b8d668799
(เปิดได้ถ้า login claude.ai บัญชีเดิม nockacademylms@gmail.com)
