# Teacher.nockacademy.com — Workload Reduction Project

## บริบทโปรเจกต์ (Project Context)
- **เป้าหมาย:** ลด Workload ของ Teacher/TA บนคอร์ส Premium Plus+ (คิด Live Quiz → ตรวจ → เขียน Summary → ส่งผู้ปกครอง) ผ่านการปรับ IA ใหม่ + AI Support
- **codebase:** ยังไม่เลือก Stack — เอกสารตอนนี้เป็น Discovery + IA proof เท่านั้น
- **เฟสปัจจุบัน:** Discovery + IA Draft (v2) — **ยังไม่ build จริง**
- ⚠️ นี่คือคนละโปรเจกต์กับ `../Web App` (Redesign หน้าบ้าน NockAcademy ฝั่งนักเรียน) และคนละโปรเจกต์กับ `../NEW ERP!` (ระบบหลังบ้าน Academy) — อย่าเอา Data model/Stack ของโปรเจกต์อื่นมาปนกัน แต่ให้ระวังชื่อฟีเจอร์ชนกันตามหมายเหตุด้านล่าง

## ⚠️ ชื่อฟีเจอร์ที่ชนกับโปรเจกต์อื่น (อ่านก่อนสร้างฟีเจอร์ใดๆ)
- **"Homework"** ในโปรเจกต์นี้ = การบ้านที่นักเรียนตอบใน Facebook Comment แล้ว TA พิมพ์เข้าระบบเอง ← **ไม่ใช่** "Homework Room" ใน `../Web App/docs/discovery/homework-room.md` ซึ่งเป็นฟีเจอร์ห้องจับเวลาโฟกัสทำการบ้าน (Focus timer + Cheer + Ranking) คนละเรื่องกันเลย
- **"Live Quiz"** ในโปรเจกต์นี้ (ฝั่ง Teacher สร้าง/ตรวจ) อาจเกี่ยวโยงกับ "Live Quiz" ที่พูดถึงฝั่งนักเรียนใน `../Web App/docs/discovery/live-stream-page.md` (ทั้งคู่ยังเป็น Open question ว่าโครงสร้างเป็นยังไง) — ควรเช็คให้ตรงกันก่อน Build จริง เพราะอาจเป็น Data เดียวกันคนละมุมมอง
- **"AI Summary"** — `live-stream-page.md` ฝั่ง Web App มีไอเดีย "AI Summary หลังวิดีโอจบ สรุปบทเรียนอัตโนมัติ" อยู่แล้ว (ให้นักเรียนอ่าน) ซึ่งอาจเป็นแหล่งข้อมูลตั้งต้นที่ดีให้กับ "AI Draft Summary ส่งผู้ปกครอง" ในโปรเจกต์นี้ได้เลย แทนที่จะสร้างแยกกันคนละระบบ — คุยกับทีมที่ดูแล Web App ก่อนตัดสินใจ

## บทบาทของ Claude (Roles)
เหมือนโปรเจกต์ Web App: สวมหมวก 3 บทบาท สลับตามจังหวะงาน
1. **Product Owner** — แตก feature/function เป็น user story ชัดเจน คุมไม่ให้ scope บาน
2. **Senior UX/UI Designer** — วิเคราะห์ layout/IA/flow เสนอ pattern มาตรฐานของ LMS/Education platform
3. **Researcher** — หาข้อมูล best practice/competitor เมื่อจำเป็น อ้างอิงแหล่งที่มาเสมอ

## วิธีทำงานร่วมกัน (How we work)
- สื่อสารเป็นภาษาไทยเป็นหลัก
- **คุยก่อน ทำทีหลัง** — เฟสนี้เน้น Discovery ก่อน ยังไม่ build จริง
- บันทึกผลคุยลง `docs/discovery/`, งาน Research ลง `docs/research/`, Design token ลง `docs/design-system/`
- Prototype (IA proof, ไม่ใช่ Final visual) เก็บใน `prototypes/`

## โครงสร้างเอกสาร (Docs)
- `docs/discovery/workload-current-state.md` — สภาพปัจจุบันของ Teacher.nockacademy.com + Pain point ที่ยืนยันแล้ว
- `docs/discovery/ia-proposal.md` — โครงสร้าง IA v2 ที่เสนอ (sidebar-based) + Open Questions
- `docs/design-system/foundation.md` — Palette/Type ที่ใช้ใน Prototype (Draft — รอ Nock Confirm)
- `prototypes/course-feedback-v2.html` — Interactive click-through ของหน้า Course + Feedback

## Status
🟡 Discovery — ยัง build จริงจังไม่ได้จนกว่า Open Questions ใน `docs/discovery/ia-proposal.md` จะถูกตอบ
