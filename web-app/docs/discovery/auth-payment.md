# Auth & Payment — Discovery (Web + App)

> สถานะ: Auth flow 🟢 build แล้ว | Package/Payment flow 🟡 รอ build
> ดู [[packages-access]] สำหรับ tier/dynamic pricing

## ✅ การตัดสินใจที่เคาะแล้ว

### Auth
- **Guest-first** — เปิดแอปดูคลิปฟรีได้เลย, เด้ง login เมื่อแตะสิ่งที่ต้องมีตัวตน (Live สด, ซื้อ, ห้องการบ้าน social, โปรไฟล์, Cheer)
- **วิธีสมัคร/เข้าระบบ:** หลัก = **เบอร์โทร → OTP** · เสริม = Email/Password, Google, Apple, Facebook
- **สมัครเก็บข้อมูลน้อยสุด** — ที่เหลือไปเติมใน Edit profile / Welcome (ข้ามได้)
- **ไม่ verify ทันที** — phone ผ่าน OTP อยู่แล้ว; email ค่อย verify ตอนจ่ายเงิน
- **iOS:** มี social → ต้องมี Sign in with Apple (กฎ Apple)
- เก็บ parent email (PDPA ผู้เยาว์) — เก็บภายหลังได้

### Payment (ต่างกันชัดเจน Web vs App)
- **Web:** PromptPay · จ่ายทีหลัง · โอนบัญชี · บัตรเครดิต → **อัปโหลดสลิปยืนยัน** (มี manual verification)
- **App:** In-App Purchase + ช่องทางที่ store ของแต่ละ OS อนุญาต
- ⚠️ **กับดัก:** P+ dynamic pricing (ราคาลดตามวัน) ขัดกับ IAP price tier ตายตัว → ต้องออกแบบตอนทำ Payment flow

## Auth flow ที่ build แล้ว (App)
- `/auth` — Landing: เบอร์+OTP หลัก + ปุ่ม Apple/Google/Facebook/อีเมล
- `/auth/otp` — กรอก 6 หลัก + นับถอยหลัง resend
- `/auth/email` — toggle เข้าสู่ระบบ/สมัคร (email+password)
- `/auth/welcome` — โปรไฟล์ขั้นต่ำ (ชื่อเล่น+ระดับชั้น) ข้ามได้
- Sign out — ใน More → popup ยืนยัน → `/auth`
- State: `src/auth/AuthContext.tsx` (localStorage `nock.auth`)

## ✅ Package + Pricing (build แล้ว)
- `components/pricing/PricingPlans.tsx` = **component กลาง ใช้ร่วม Web + App** (responsive)
- Mobile: `UpgradeCard` (บน Profile) → `/pricing`
- P+ **dynamic price** คำนวณสด (วันนี้ ฿2,705 จาก ฿5,000, ขั้นต่ำ ฿500) + Premium 3/6/12/18/24/36 + โรงเรียน(เร็วๆนี้)

## ✅ Payment flow (build แล้ว) — user เลือกวิธีจ่ายเอง
- `/checkout` — สรุปออเดอร์ + เลือกวิธี: PromptPay · โอนธนาคาร · บัตร · จ่ายทีหลัง/ผ่อน · IAP
- `/checkout/pay` — แตกตามวิธี: QR+อัปสลิป / บัญชี+สลิป / ฟอร์มบัตร / ผ่อนเป็นงวด / IAP
- `/checkout/result` — **needsSlip → "รอตรวจสอบ"** (manual verify), บัตร/IAP → "สำเร็จทันที"
- ⚠️ **iOS compliance:** การให้เลือกจ่ายนอก IAP เสี่ยงผิดกฎ Apple — flag ไว้ ปรับตอนส่ง store จริง

## 🔜 รอ build ต่อ
1. **Paywall** — gate Live (P+), gate clip ล็อก; ปรับตาม login state (Guest/Free/Member)
2. เชื่อม AuthContext + สถานะ package เข้ากับ gating จริง (ตอนนี้ยังไม่บังคับ login/จ่าย)
