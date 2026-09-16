# Design Foundation — Teacher.nockacademy.com (Draft)

> สถานะ: 🟡 Draft — มาจาก Prototype `prototypes/course-feedback-v2.html` เท่านั้น ยังไม่ผ่านการ Confirm เป็น Design System จริงจัง
> ต่างจาก `../Web App/docs/design-system/foundation.md` (MD3 · Clean/Minimal ฝั่งนักเรียน) — เว็บนี้เป็นเครื่องมือปฏิบัติการของ Staff ไม่ใช่หน้าตาที่นักเรียน/ผู้ปกครองเห็น จึงเลือกทิศทางที่ต่างออกไปได้ (เน้นความเร็วในการอ่าน/สแกนข้อมูล มากกว่าความสวยงามแบบ Marketing)

## Color

| Token | Light | Dark | ใช้ทำอะไร |
|---|---|---|---|
| `--bg` | #f4f2fb | #161421 | พื้นหลังหน้า |
| `--surface` | #ffffff | #1d1a2c | Card/Table/Panel |
| `--ink` / `--ink-muted` | #2b2740 / #736e8c | #eae7f5 / #a49dc2 | ตัวอักษรหลัก/รอง |
| `--primary` | #6d5bd0 | #8b7cea | ปุ่มหลัก, Active state, Sidebar highlight (โทน Lavender/Purple ตาม Reference ของ Nock) |
| `--ai` | #0f9188 | #3fc7bd | **สงวนไว้เฉพาะจุดที่ AI แตะเท่านั้น** ห้ามใช้เป็นสี Semantic อื่น |
| `--green` (Sended) | #2fa76a | #4fc386 | Status สำเร็จ |
| `--amber` (Prepared) | #e79433 | #eaa858 | Status พร้อมส่ง รอ Confirm |
| `--pending` (Pending) | #d7a92e | #e1bb52 | Status ยังไม่พร้อม |
| `--danger` | #dd5b5b | #e8807f | Error/Mismatch |

หลักการ: สี Semantic (เขียว/ส้ม/เหลือง/แดง) แยกขาดจากสี AI (Teal) เสมอ — ป้องกันผู้ใช้สับสนระหว่าง "สถานะงาน" กับ "จุดที่ AI ช่วย"

## Type

- **UI/Label/Heading**: IBM Plex Sans Thai (500/600/700) — อ่าน Thai ได้ดี ให้ความรู้สึก Technical/Product เหมาะกับ Sidebar, ปุ่ม, Table header
- **Body/Comment ยาว**: Sarabun (400/500) — ออกแบบมาสำหรับอ่าน Thai ต่อเนื่อง เหมาะกับ Feedback Comment ที่เป็นย่อหน้ายาว
- ทั้งคู่โหลดจาก Google Fonts, มี Thai glyph ครบ (สำคัญเพราะ Copy ส่วนใหญ่ของสินค้าจริงเป็นภาษาไทย)

## Layout

- Sidebar ซ้ายคงที่ (230px, Collapse ได้เหลือ Icon-only)
- Main content: KPI card row (Grid, gap ไม่ใช้ Margin เดี่ยว) → Pill/Week selector → Toolbar (Search+Filter+Bulk action) → Table (Sticky header, overflow-x auto)
- Table ทุกคอลัมน์ตัวเลขใช้ `tabular-nums`
- Drawer เลื่อนจากขวา (460px) สำหรับรายละเอียดต่อรายการ แทนการยัดทุกอย่างในตารางหลัก

## สิ่งที่ยังไม่ Confirm

- Palette นี้เป็นการตีความจาก Reference Mockup ที่ Nock ส่งมา (ภาพเดียว) ไม่ใช่ Brand Guideline อย่างเป็นทางการ — ควรเทียบกับ Design System จริงของ NockAcademy (ถ้ามี) ก่อนใช้งานจริง
