# กฎ Responsive + Component ของ erp-v2

> อ่านไฟล์นี้ก่อนทำงาน UI ที่เกี่ยวกับมือถือ/แท็บเล็ต/จอแคบ
> **เป้าหมาย: ไม่ต้องถ่าย screenshot รายหน้าอีก** — responsive อยู่ใน component กลาง หน้าใหม่แค่ประกอบร่างก็ได้ responsive ฟรี
> ที่มา: เจ้าของสังเกตว่างาน responsive กิน credit หนัก (2026-11-05) เพราะวิธีเดิมคือ "ถ่ายภาพ-ปรับ-ถ่าย" วนทุกขนาดทุกหน้า

---

## ทำไมงาน responsive ถึงกิน credit (เข้าใจก่อน จะได้เลี่ยงถูกจุด)

ตัวโค้ดไม่กี่บรรทัด แต่ตัวกินคือ **การตรวจด้วยภาพวนซ้ำ** — screenshot 1 รูป = token แพง, ต้องดู 3 ขนาด, CSS เดาไม่ถูกรอบเดียวเลยถ่ายซ้ำ

**กฎทอง 3 ข้อตอนทำ responsive:**
1. **ตรวจด้วย `read_page` (text) เป็นหลัก** — ถ่าย screenshot เฉพาะตอนต้องยืนยันสายตาจริงๆ (หน้าตัวแทน 1–2 หน้าตอนจบ ไม่ใช่ทุกหน้าทุกขนาด)
2. **แก้เป็นชุดก่อน แล้วค่อยตรวจรอบเดียว** — ไม่ถ่ายหลังทุกการแก้
3. **ถ้าต้องถ่าย ถ่าย scale เล็กลง** (`scale: 0.5`) — token ~1/4

---

## กฎข้อ 1 — Breakpoint มี **3 ระดับเท่านั้น**

ผูกกับเครื่องจริงที่ใช้งาน (Admin เดสก์ท็อป · ครู iPad):

| ระดับ | ช่วง | เครื่องจริง | layout |
|---|---|---|---|
| **base** | `< 640` | มือถือ | 1 คอลัมน์ · เรียงลงทั้งหมด · ปุ่ม/ช่องเต็มกว้าง · ตาราง = การ์ด |
| **`sm:`** | `≥ 640` | iPad แนวตั้ง | 2 คอลัมน์ · toolbar เริ่มเรียงแนวนอน · ตารางปกติ |
| **`lg:`** | `≥ 1024` | iPad แนวนอน / จอใหญ่ | เต็มรูปแบบ · **side panel ขวา** · KPI ได้ถึง 4 ใบ |

### ❌ ห้ามใช้ `md:` (768) และ `xl:` (1280)
ของเดิมมี `md:` 48 จุด, `xl:` 11 จุด ที่หลงมา ทำให้มี 5 สถานะให้คิด — เดายาก
→ แปลงเป็น sm:/lg: ให้หมด เหลือ **3 สถานะ** ที่พยากรณ์ได้ (ยกเว้นเคสพิเศษจริงๆ ที่ต้องมีจุดกลาง — ให้คอมเมนต์เหตุผลกำกับ)

### จุดตัดสินใจที่ตั้งไว้แล้ว (อย่าแก้โดยไม่ถามเจ้าของ)
- **Side panel vs Bottom sheet** = `useSidePanel()` ที่ `1024px` (`src/hooks/use-mobile.ts`)
  `< 1024` → Sheet เด้งจากล่าง · `≥ 1024` → side panel ขวา
- **useIsMobile()** = `< 768` (ใช้กับ date-range-picker ฯลฯ)
- **KPI** = `grid-cols-2 sm:grid-cols-3 lg:grid-cols-4` (`KpiRow` ใน page-layout.tsx — เจ้าของเลือก 2026-11-04)

---

## กฎข้อ 2 — Responsive อยู่ใน **Component กลาง** · Page ห้ามเขียน breakpoint เอง

หน้าใหม่ = ประกอบ primitive ที่ responsive ในตัวอยู่แล้ว → ไม่ต้องถ่ายภาพ

### Primitive ที่มีแล้ว — ใช้ตัวนี้ อย่าจัด layout เอง
`src/components/app/page-layout.tsx`
- `<Page>` — `mx-auto max-w-7xl space-y-4` (ความกว้าง+ระยะมาตรฐานทุกหน้า)
- `<PageHeader title description actions>` — หัว + CTA ขวา (flex-wrap เอง)
- `<KpiRow>` — การ์ด KPI 2→3→4
- `<FilterBar search>{filters}</FilterBar>` — มือถือ: search เต็มแถว + filter grid 2 คอลัมน์ · เดสก์ท็อป: แถวเดียวชิดขวา
- `<Toolbar end>` · `<SearchBox>` · `<RangeStepper>` · `<ShowChip>` · `<Segmented>` · `<Tabs>`

`src/components/app/form-shell.tsx`
- `<EntityPanel open onClose wide>` — ตัวครอบ panel (เลือก side/bottom ให้เองตาม `useSidePanel`)
- `<FormShell title description onClose footer>` · `<PanelBody>` · `<PanelFooter>` · `<PanelMore items>`

`src/components/app/data-grid.tsx`
- `<DataTable id columns rows rowKey …>` — ตารางมาตรฐาน (ตั้งค่าคอลัมน์/pin/ลากกว้าง/sort ครบ)
- `Column<R>` = `{ id, label, cell, align?, width?, required?, defaultHidden?, info?, sort? }`

### ช่องโหว่ที่ต้องปิด (หน้าที่ยัง hand-roll breakpoint = ตัวกิน credit)
เรียงตามน้ำหนัก:
1. **`app/reports/page.tsx` — 54 breakpoint!** ยังไม่ใช้ primitive กลาง → ยกเข้า Page/KpiRow/Tabs
2. **ฟอร์ม** — `form-builder` (11), `invoice-editor`, `settings/branch-basic` (11) → ต้องมี `FormGrid` กลาง (ดูด้านล่าง)
3. **DataTable บนมือถือ** — ยังตั้ง `minWidth = 900` → จอแคบเลื่อนแนวนอน (เจ้าของไม่ชอบ) → ทำโหมดการ์ด (ดูด้านล่าง)

---

## สเปกที่ตกลงแล้ว รอลงมือ (เจ้าของยืนยัน 2026-11-05)

### A) DataTable จอแคบ = **ยุบเป็นการ์ดต่อแถว** (ไม่ใช่เลื่อนแนวนอน)
ทำใน `data-grid.tsx` ให้ครบทุกตารางในคราวเดียว (~15 หน้าได้ผลพร้อมกัน — นี่คือจุดคุ้มสุด):
- `< 640px` → แต่ละ **row = การ์ด 1 ใบ** · ภายในการ์ดวนคอลัมน์ที่ไม่ซ่อน แสดงเป็น `label : cell` เรียงลง
- คอลัมน์ `required` ตัวแรก = **หัวการ์ด** (ตัวใหญ่) · ที่เหลือ = แถว label/value
- `rowActions` (⋯) = มุมขวาบนการ์ด · `onRowClick` = แตะทั้งการ์ด
- `≥ 640px` → ตารางปกติเหมือนเดิม (คงพฤติกรรม pin/ลากกว้าง/ตั้งค่าคอลัมน์)
- การตั้งค่าคอลัมน์ (ซ่อน/ลำดับ) ใช้ร่วมกัน — การ์ดก็เคารพคอลัมน์ที่ซ่อน
- (ทางเลือกเสริม) เพิ่ม field ใน `Column<R>`: `cardLabel?` (ชื่อย่อในการ์ดถ้าต่างจากหัวตาราง) · `hideInCard?` (คอลัมน์เทคนิคที่ไม่ต้องโชว์ในการ์ด)

### B) `FormGrid` — primitive ฟอร์มกลาง (ยังไม่มี ต้องสร้าง)
ฟอร์มทุกที่จัดเอง → ทำ `<FormGrid>` + `<Field label>` ไว้ใน form-shell.tsx:
- `grid-cols-1 sm:grid-cols-2` อัตโนมัติ · `<Field full>` = กินเต็มแถว
- ช่องกรอก/ปุ่มทั้งหมด `h-9` มาตรฐานเดิม · มือถือปุ่ม footer เต็มกว้าง
- ย้าย `form-builder`, `invoice-editor`, `branch-basic` มาใช้ → ลบ breakpoint ในหน้าเหล่านั้น

### C) Reports ใช้ primitive กลาง
`reports/page.tsx` → เปลี่ยน layout เป็น `<Page>` + `<KpiRow>` + `<Tabs>` + การ์ดกราฟ `grid-cols-1 lg:grid-cols-2` · ลบ breakpoint รายจุด 54 ตัว

---

## เช็กลิสต์ตอนทำหน้าใหม่ / แก้หน้าเดิม
- [ ] ใช้ `<Page><PageHeader>…` ไม่จัด container เอง
- [ ] มีแค่ `sm:` / `lg:` — ไม่มี `md:` / `xl:`
- [ ] ตาราง = `<DataTable>` (ได้โหมดการ์ดมือถือ + ตั้งค่าคอลัมน์ฟรี)
- [ ] ฟอร์ม = `<FormGrid>` ไม่เขียน grid breakpoint เอง
- [ ] panel = `<EntityPanel>` (เลือก side/bottom ให้เอง)
- [ ] ตรวจด้วย `read_page` ก่อน · screenshot เฉพาะหน้าตัวแทนตอนจบ
