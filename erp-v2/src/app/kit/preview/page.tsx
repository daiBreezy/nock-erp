"use client"

// Inner viewport of the component gallery (/kit). Loaded inside a resizable iframe so the design-system components
// below re-evaluate their sm:/lg: breakpoints against the FRAME width, not the browser window — that is what makes
// /kit a one-stop responsive check (RESPONSIVE.md). Renders ONE component group chosen by ?only=…, or all of them.
// Mock data only — this touches no store seed / business logic.
import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  BookOpenIcon, DoorOpenIcon, LayoutGridIcon, ListIcon, PencilIcon, PlusIcon,
  RefreshCwIcon, SettingsIcon, Trash2Icon, UserRoundIcon, UsersIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  FilterBar, KpiRow, Page, PageHeader, RangeStepper, SearchBox, Segmented, ShowChip, Tabs, Toolbar,
  type SegmentOption,
} from "@/components/app/page-layout"
import { EntityPanel, FormShell, PanelBody, PanelFooter, PanelForm, PanelMore } from "@/components/app/form-shell"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { useSort } from "@/components/app/data-table"
import { Kpi } from "@/components/app/kpi"
import { GradeChips } from "@/components/app/grade-chips"
import { PackageBadge, PACKAGE_LEGEND } from "@/components/app/package-badge"
import { Pill, RoleChip, SessionStateBadge } from "@/components/app/badges"
import { HUE, TAG_HUE, tagChip } from "@/components/app/tags"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { SessionState } from "@/domain/rules/scheduling"

/** a labelled block so each component reads clearly inside its frame */
function Demo({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <section className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
    </section>
  )
}

const BTN_VARIANTS = ["default", "outline", "secondary", "ghost", "destructive", "link"] as const
const BTN_SIZES = ["lg", "default", "sm", "xs"] as const
const BADGE_VARIANTS = ["default", "secondary", "destructive", "outline", "ghost"] as const

function ButtonsDemo() {
  return (
    <div className="space-y-4">
      {BTN_VARIANTS.map((v) => (
        <Demo key={v} label={`variant: ${v}`}>
          {BTN_SIZES.map((s) => <Button key={s} variant={v} size={s}>{s}</Button>)}
          <Button variant={v} size="icon" aria-label="เพิ่ม"><PlusIcon /></Button>
          <Button variant={v} size="sm" disabled>disabled</Button>
          <Button variant={v}><PlusIcon /> มีไอคอน</Button>
        </Demo>
      ))}
    </div>
  )
}

function BadgesDemo() {
  return (
    <div className="space-y-4">
      <Demo label="Badge — ทุก variant">
        {BADGE_VARIANTS.map((v) => <Badge key={v} variant={v}>{v}</Badge>)}
      </Demo>
      <Demo label="Pill (badges.tsx) — โทนสถานะกลาง">
        {(["gray", "blue", "green", "amber", "red", "special"] as const).map((t) => <Pill key={t} tone={t}>{t}</Pill>)}
      </Demo>
    </div>
  )
}

function TagsDemo() {
  return (
    <div className="space-y-4">
      <Demo label="HUE — ทุกสีของระบบแท็ก (หนึ่งแท็ก หนึ่งสี ทั้งแอป)">
        {(Object.keys(HUE) as (keyof typeof HUE)[]).map((h) => (
          <span key={h} className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", HUE[h].chip)}>{h}</span>
        ))}
      </Demo>
      <Demo label="RoleChip — หนึ่งสีต่อบทบาท">
        {(Object.keys(TAG_HUE.role) as (keyof typeof TAG_HUE.role)[]).map((r) => <RoleChip key={r} role={r} />)}
      </Demo>
      <Demo label="SessionStateBadge — สถานะคาบตามเวลา">
        {(Object.keys(TAG_HUE.sessionState) as SessionState[]).map((s) => <SessionStateBadge key={s} state={s} />)}
      </Demo>
      <Demo label="leadStage / studentStatus — tagChip()">
        {(Object.keys(TAG_HUE.leadStage) as (keyof typeof TAG_HUE.leadStage)[]).map((k) => (
          <span key={k} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tagChip("leadStage", k))}>{k}</span>
        ))}
        {(Object.keys(TAG_HUE.studentStatus) as (keyof typeof TAG_HUE.studentStatus)[]).map((k) => (
          <span key={k} className={cn("rounded-full px-2 py-0.5 text-xs font-medium", tagChip("studentStatus", k))}>{k}</span>
        ))}
      </Demo>
      <Demo label="GradeChips — ชั้นเรียนในคาบ">
        <GradeChips grades={["ป.4", "ป.4", "ป.5", "ม.1"]} />
        <GradeChips grades={[]} planned={["ป.6", "ม.2"]} />
      </Demo>
      <Demo label="PackageBadge — ชั่วโมง / สัปดาห์ / เดือน">
        <PackageBadge course={{ unit: "hour", duration: 24 }} />
        <PackageBadge course={{ unit: "week", duration: 4 }} />
        <PackageBadge course={{ unit: "month", duration: 1 }} size="md" />
        <span className="text-xs text-muted-foreground">{PACKAGE_LEGEND}</span>
      </Demo>
    </div>
  )
}

function CardsDemo() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>การ์ดมาตรฐาน</CardTitle>
          <CardDescription>Card · CardHeader · CardContent · CardFooter</CardDescription>
          <CardAction><Button size="icon-sm" variant="ghost" aria-label="ตั้งค่า"><SettingsIcon /></Button></CardAction>
        </CardHeader>
        <CardContent className="text-muted-foreground">เนื้อหาในการ์ด — มุมโค้ง เงานุ่ม ตามสไตล์ base-luma</CardContent>
        <CardFooter className="border-t"><Button size="sm" variant="outline">ปุ่มใน footer</Button></CardFooter>
      </Card>
      <Card size="sm">
        <CardHeader><CardTitle>การ์ดเล็ก (size=sm)</CardTitle></CardHeader>
        <CardContent className="text-muted-foreground">ระยะในการ์ดแน่นขึ้น ใช้กับรายการหนาแน่น</CardContent>
      </Card>
    </div>
  )
}

function KpiDemo() {
  return (
    <KpiRow>
      <Kpi icon={BookOpenIcon} label="คลาสที่เปิดอยู่" value={128} tone="primary" />
      <Kpi icon={UsersIcon} label="นักเรียน" value={"1,240"} tone="emerald" />
      <Kpi icon={UserRoundIcon} label="ครู" value={36} tone="special" />
      <Kpi icon={RefreshCwIcon} label="ใกล้หมดแพ็กเกจ (ต่อคอร์ส)" value={9} tone="amber" emphasis />
    </KpiRow>
  )
}

const VIEW_OPTS: SegmentOption<"table" | "board">[] = [
  { value: "table", label: "ตาราง", icon: ListIcon },
  { value: "board", label: "บอร์ด", icon: LayoutGridIcon },
]
const TAB_OPTS: SegmentOption<"overview" | "students" | "finance">[] = [
  { value: "overview", label: "ภาพรวม" },
  { value: "students", label: "นักเรียน" },
  { value: "finance", label: "การเงิน" },
]

function ToolbarDemo() {
  const [q, setQ] = useState("")
  const [view, setView] = useState<"table" | "board">("table")
  const [tab, setTab] = useState<"overview" | "students" | "finance">("overview")
  const [showClosed, setShowClosed] = useState(false)
  const [week, setWeek] = useState(0)
  return (
    <div className="space-y-5">
      <PageHeader title="หัวหน้า (PageHeader)" description="ชื่อหน้า + คำอธิบายสั้น · CTA ชิดขวา"
        actions={<Button><PlusIcon /> สร้าง</Button>} />
      <Demo label="FilterBar + SearchBox">
        <FilterBar search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหา…" />}>
          <ShowChip label="รวมที่ปิดแล้ว" on={showClosed} count={12} onChange={setShowClosed} />
        </FilterBar>
      </Demo>
      <Demo label="Toolbar + RangeStepper + Segmented">
        <Toolbar end={<Segmented value={view} onChange={setView} options={VIEW_OPTS} label="มุมมอง" />}>
          <RangeStepper label={week === 0 ? "สัปดาห์นี้" : `สัปดาห์ ${week > 0 ? "+" : ""}${week}`} current={week === 0}
            onPrev={() => setWeek((w) => w - 1)} onNext={() => setWeek((w) => w + 1)} onToday={() => setWeek(0)} />
        </Toolbar>
      </Demo>
      <Demo label="Tabs (เปลี่ยนหัวข้อ)" className="block">
        <Tabs value={tab} onChange={setTab} options={TAB_OPTS} />
      </Demo>
    </div>
  )
}

type TRow = { id: string; subject: string; name: string; students: number; teacher: string; room: string; active: boolean }
const T_ROWS: TRow[] = [
  { id: "1", subject: "คณิต", name: "Math ม.3 เสาร์เช้า", students: 8, teacher: "ครูได", room: "A1", active: true },
  { id: "2", subject: "วิทย์", name: "Sci ป.6 อาทิตย์", students: 12, teacher: "ครูมิ้นท์", room: "B2", active: true },
  { id: "3", subject: "อังกฤษ", name: "Eng ม.1 พุธเย็น", students: 5, teacher: "ครูได", room: "A2", active: true },
  { id: "4", subject: "คณิต", name: "Math ป.4 เสาร์บ่าย", students: 10, teacher: "ครูต้น", room: "C1", active: false },
  { id: "5", subject: "ไทย", name: "Thai ป.5 อาทิตย์", students: 7, teacher: "ครูมิ้นท์", room: "B1", active: true },
  { id: "6", subject: "วิทย์", name: "Sci ม.2 ศุกร์เย็น", students: 9, teacher: "ครูต้น", room: "A1", active: true },
]

function TableDemo() {
  const { sort, toggle } = useSort<"subject" | "name" | "students" | "teacher" | "room">("name")
  const rows = [...T_ROWS].sort((a, b) => {
    const v = sort.key === "students" ? a.students - b.students : String(a[sort.key]).localeCompare(String(b[sort.key]), "th")
    return sort.custom ? (sort.desc ? -v : v) : 0
  })
  const columns: Column<TRow>[] = [
    { id: "subject", label: "วิชา", width: "110px", sort: "subject", cell: (r) => <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", HUE.sky.chip)}>{r.subject}</span> },
    { id: "name", label: "ชื่อคลาส", width: "190px", sort: "name", required: true, className: "font-medium", cell: (r) => r.name },
    { id: "students", label: "นักเรียน", width: "96px", sort: "students", align: "right", className: "tabular-nums", info: "จำนวนนักเรียนที่ลงในคลาสนี้", cell: (r) => <span className="inline-flex items-center gap-1"><UsersIcon className="size-3.5 text-muted-foreground" />{r.students}</span> },
    { id: "teacher", label: "ครู", width: "130px", sort: "teacher", cell: (r) => r.teacher },
    { id: "room", label: "ห้อง", width: "90px", sort: "room", defaultHidden: true, cell: (r) => <span className="inline-flex items-center gap-1.5"><DoorOpenIcon className="size-4 text-muted-foreground" />{r.room}</span> },
    { id: "status", label: "สถานะ", width: "100px", align: "right", cell: (r) => (r.active ? <span className="text-sm font-medium text-success">เปิดอยู่</span> : <span className="text-sm text-muted-foreground">ปิดแล้ว</span>) },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">เรียง · ปักหมุด · ลากกว้าง · ตั้งค่าคอลัมน์ (ลองลากกรอบให้แคบ &lt; 640 เพื่อดูว่าตอนนี้ยังเลื่อนแนวนอน — รอทำโหมดการ์ด A)</p>
        <ColumnsMenu id="kit-demo" columns={columns} />
      </div>
      <DataTable id="kit-demo" columns={columns} rows={rows} rowKey={(r) => r.id} sort={sort} onSort={toggle}
        rowClassName={(r) => !r.active && "opacity-45"} minWidth={760} empty="ไม่มีข้อมูล" />
    </div>
  )
}

function PanelDemo() {
  const [view, setView] = useState(false)
  const [edit, setEdit] = useState(false)
  const [form, setForm] = useState(false)
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">แผงเลือกข้าง/ล่างให้เองตามความกว้างเฟรม (&lt; 1024 = เด้งจากล่าง · ≥ 1024 = แผงขวา) — เปิดในเฟรมเพื่อดูสองแบบ</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setView(true)}>เปิดแผงข้อมูล (EntityPanel · View)</Button>
        <Button variant="outline" onClick={() => setEdit(true)}>ฟอร์มในแผง (PanelForm)</Button>
        <Button variant="outline" onClick={() => setForm(true)}>ฟอร์ม popup (FormShell)</Button>
      </div>

      {/* View panel: Header · Body (เลื่อน) · Bottom — ทั้งหมดอยู่ใน Sheet.Root ที่ EntityPanel สร้างให้ */}
      <EntityPanel open={view} onClose={() => setView(false)} wide>
        <SheetHeader className="shrink-0 border-b pb-3">
          <SheetTitle className="text-lg">แผงรายละเอียด</SheetTitle>
          <SheetDescription>Header · Body (เลื่อน) · Bottom</SheetDescription>
        </SheetHeader>
        <PanelBody>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="rounded-2xl bg-muted/40 px-3 py-2 text-sm">แถวข้อมูล {i + 1}</div>
          ))}
        </PanelBody>
        <PanelFooter>
          <PanelMore items={[{ label: "ปิดบัญชี", icon: Trash2Icon, destructive: true, onClick: () => {} }]} />
          <Button variant="outline" className="ml-auto" onClick={() => setView(false)}>ปิด</Button>
          <Button variant="outline" onClick={() => setView(false)}><PencilIcon /> แก้ไข</Button>
        </PanelFooter>
      </EntityPanel>

      {/* FormShell ในแผง: ห่อด้วย <PanelForm> → เรนเดอร์เป็น Header·Body·Bottom ภายใน EntityPanel (ไม่ใช่ popup) */}
      <EntityPanel open={edit} onClose={() => setEdit(false)}>
        <PanelForm>
          <FormShell title="แก้ไขในแผง" description="FormShell เดียวกัน เมื่ออยู่ใน PanelForm" onClose={() => setEdit(false)}
            footer={<><Button variant="outline" onClick={() => setEdit(false)}>ยกเลิก</Button><Button onClick={() => setEdit(false)}>บันทึก</Button></>}>
            <label className="block space-y-1 text-sm"><span className="text-muted-foreground">ชื่อ</span><Input placeholder="เช่น Math ม.3" /></label>
            <label className="block space-y-1 text-sm"><span className="text-muted-foreground">หมายเหตุ</span><Input placeholder="พิมพ์…" /></label>
          </FormShell>
        </PanelForm>
      </EntityPanel>

      {/* FormShell โหมด popup (Dialog) — นอก PanelForm */}
      {form && (
        <FormShell title="สร้างรายการ" description="FormShell โหมด popup (Dialog)" onClose={() => setForm(false)}
          footer={<><Button variant="outline" onClick={() => setForm(false)}>ยกเลิก</Button><Button onClick={() => setForm(false)}>บันทึก</Button></>}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">ชื่อ</span><Input placeholder="เช่น Math ม.3" /></label>
            <label className="space-y-1 text-sm"><span className="text-muted-foreground">ห้อง</span><Input placeholder="A1" /></label>
          </div>
        </FormShell>
      )}
    </div>
  )
}

const SECTIONS: Record<string, { title: string; node: React.ReactNode }> = {
  buttons: { title: "Button", node: <ButtonsDemo /> },
  badges: { title: "Badge · Pill", node: <BadgesDemo /> },
  tags: { title: "Tags · Chips · Package", node: <TagsDemo /> },
  cards: { title: "Card", node: <CardsDemo /> },
  kpi: { title: "KPI", node: <KpiDemo /> },
  toolbar: { title: "Page · Toolbar · Filters", node: <ToolbarDemo /> },
  table: { title: "DataTable", node: <TableDemo /> },
  panel: { title: "Panel · Form", node: <PanelDemo /> },
}

function PreviewInner() {
  const sp = useSearchParams()
  const only = sp.get("only")
  const [dark, setDark] = useState(sp.get("mode") === "dark")

  // the tool page (parent) owns the light/dark switch and streams it in, so one toggle flips every frame at once
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === "kit:mode") setDark(!!e.data.dark) }
    window.addEventListener("message", onMsg)
    window.parent?.postMessage({ type: "kit:ready" }, "*")
    return () => window.removeEventListener("message", onMsg)
  }, [])

  const picked = only && SECTIONS[only]
  const body = picked ? (
    picked.node
  ) : (
    <Page>
      <PageHeader title="คลังคอมโพเนนต์" description="ทุกกลุ่มในหน้าเดียว" />
      {Object.entries(SECTIONS).map(([k, s]) => (
        <section key={k} className="space-y-3">
          <h2 className="text-sm font-semibold text-primary">{s.title}</h2>
          {s.node}
        </section>
      ))}
    </Page>
  )

  // `.dark` on this wrapper: tokens (--background/--card…) are redefined here and inherit down, and the dark: variant
  // (&:is(.dark *)) fires on every descendant — so the whole frame renders in the chosen mode (globals.css)
  return <div className={cn("min-h-screen bg-background p-4 text-foreground", dark && "dark")}>{body}</div>
}

export default function KitPreviewPage() {
  return (
    <Suspense fallback={null}>
      <PreviewInner />
    </Suspense>
  )
}
