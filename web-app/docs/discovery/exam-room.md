# Exam Room (ห้องสอบ) — Discovery + Build

> สถานะ: 🟡 Prototype build แล้ว (flow ครบ) | Platform: **Web + App** (ออกแบบที่นี่ → ยกไปเว็บ ดู [[platform-matrix]])

## Flow ที่ build แล้ว
1. **List** (`/exam`) — Grade filter (เปลี่ยนได้ตลอด) + รายการ: ชื่อ, จำนวนข้อ, grade (multi), status (ทำแล้ว/ทำค้างไว้/ยังไม่ทำ)
2. **Detail** (`/exam/:id`)
   - ถ้า `type=multi` → เลือกวิชาก่อน → เลือกชุด
   - ถ้า `type=single` → เลือกชุดเลย (มีได้หลายชุด)
   - เลือกชุดแล้ว → CTA panel เด้ง: **เริ่มสอบ · ดาวน์โหลดเอกสาร · ดูเฉลย · ดูคะแนน/Ranking**
3. **Quiz** (`/exam/:id/quiz`) — ทีละข้อ + stepper 1..N (เทา=ยังไม่ทำ, เขียว=ทำแล้ว, น้ำเงิน=ข้อปัจจุบัน)
   - เลือกคำตอบ → auto-advance ไปข้อถัดไปที่ยังไม่ทำ
   - ข้ามได้, กด stepper กระโดดได้
   - ทำครบ → popup "ทำครบทุกข้อแล้ว" → ส่งข้อสอบ
4. **Result** (`/exam/:id/result`) — คะแนน X/20 + progress + เวลา + CTA (เฉลย / กลับ list)
5. **Solution** (`/exam/:id/solution`) — เฉลยแบบ accordion กลุ่มละ 5 ข้อ (1-5,6-10..) + **วิดีโอเฉลยต่อกลุ่ม** + เฉลยรายข้อ

## Data model (`src/data/exam.ts`)
- `Exam { type: 'multi'|'single', grades[], status, subjects?, sets[] }`
- `ExamSet { subjectKey?, questionCount }`
- mock questions ผ่าน `buildQuestions(count)`

## ❓ Open questions / TODO
1. **ยกไป Web Learn** — Exam Room นี้เว็บยังไม่มี ต้อง port (responsive อยู่แล้ว)
2. ดาวน์โหลดเอกสาร = ไฟล์อะไร (PDF ข้อสอบ?) เก็บที่ไหน
3. Ranking ของชุดข้อสอบ — เกณฑ์จัดอันดับ (คะแนน/เวลา?)
4. "ทำค้างไว้" — resume ต่อจากเดิม หรือเริ่มใหม่?
5. ข้อสอบจริง: รูปภาพ/สมการในโจทย์, จำนวนตัวเลือกไม่คงที่
6. จับเวลาสอบ: มี time limit ต่อชุดไหม หรือจับเฉยๆ
