# Design System — Foundation (Direction)

> สถานะ: 🟢 ทิศทางหลัก confirmed | รายละเอียด token รอทำต่อ
> ใช้ร่วมกันทั้ง Clip Page + Landing Page

## ทิศทางหลัก (Confirmed ✅)
- **Material Design 3 (MD3)** เป็นฐานหลักของ design
- **Clean · Minimal · เน้น White Space** — พื้นที่ดูสะอาดตา หายใจได้
- อ้างอิงหน้าตา: internal Calendar/Create Class screen (MD3 style, 2026-06)

## Design cues จาก reference (Calendar screen)
- **Shape:** มุมโค้งใหญ่ (rounded-lg/xl) บนการ์ด ปุ่ม search badge
- **Elevation:** แยกชั้นด้วย surface tone + เส้นบางๆ ไม่ใช่เงาหนัก (flat-ish ตาม MD3 tonal)
- **Color-coded subjects (pastel/soft):**
  - Math = ชมพู (soft pink)
  - Science = เทอควอยซ์ (teal)
  - Eng (Active) = ม่วง (purple)
  - Eng (Grammar) = ส้ม (orange/peach)
  - → เก็บระบบ "สีประจำวิชา" เดิมไว้ แต่ทำให้ soft + clean
- **Badges/pills:** มุมมน คอนทราสต์อ่อน (ระดับชั้น ป.x, สถานะ Test/Interview)
- **Buttons:** filled (primary, indigo เข้ม) + outlined (secondary)
- **Controls:** segmented control (Day/Week/Month/Year/List), rounded search field, dropdown filter pills

## หลักการนำไปใช้ (กับ Clip Page IA)
- Filter-as-button → ใช้ filter pill/dropdown สไตล์ MD3 (ตรงกับ reference)
- Clip group card → การ์ด MD3 มุมโค้ง surface อ่อน whitespace เยอะ
- ป้ายฟรี/ล็อก, จำนวนวิดีโอ, ความยาว → pill badges
- สีประจำวิชาบนการ์ด → ใช้ระบบ pastel เดียวกับ reference

## ยังต้องทำต่อ (TODO)
- [ ] นิยาม color token เต็ม (primary/secondary/surface + 4 สีวิชา + semantic) ตาม MD3 tonal palette
- [ ] Type scale (MD3) + เลือกฟอนต์ไทย
- [ ] Spacing scale + radius scale + elevation levels
- [ ] Core components: button, card, chip/badge, segmented control, input, dropdown
- [ ] Dark mode (MD3 รองรับ tonal dark โดยธรรมชาติ)
