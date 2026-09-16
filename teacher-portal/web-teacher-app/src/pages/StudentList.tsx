import { useMemo, useRef, useState, type ReactNode } from "react"
import { MoreHorizontal, Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, FileText, Check, Ban, Trash2, Lock, LockOpen, EyeOff, Copy } from "lucide-react"
import { CopyText } from "@/components/CopyText"
import { cn } from "@/lib/utils"
import { students as ALL, GRADES, STATUS_LABEL, courseShort, lineStatusOf, type Student } from "@/data"
import { useSync, writeStudent, updateStudent, deleteStudent, setPhoto } from "@/store"
import { LineStatusBadge, useLinkLine } from "@/components/LinkLineDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuCheckboxItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDrawer } from "@/components/StudentDrawer"

type Seg = "all" | "active" | "inactive" | "churn"
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
const parseDate = (str: string) => { const p = str.replace(",", "").split(" "); return new Date(2000 + (+p[2] || 0), MONTHS[p[1]] ?? 0, +p[0] || 1).getTime() }

function StatusBadge({ s }: { s: Student }) {
  const text = { active: "text-emerald-600", inactive: "text-amber-600", churn: "text-red-600" }[s.status]
  const dot = { active: "bg-emerald-500", inactive: "bg-amber-500", churn: "bg-red-500" }[s.status]
  return (
    <div className={cn("flex items-center gap-2 text-xs font-semibold", text)}>
      <span className={cn("size-2 rounded-full", dot)} />
      {STATUS_LABEL[s.status]}
      {s.statusDur && <span className="rounded-full bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">{s.statusDur}</span>}
    </div>
  )
}

function EditCell({ idx, field, copy }: { idx: number; field: keyof Student; copy?: boolean }) {
  const input = (
    <Input
      defaultValue={String(ALL[idx][field] ?? "")}
      onChange={(e) => writeStudent(idx, field, e.target.value)}
      className="h-8 border-transparent bg-transparent px-2 shadow-none hover:border-input focus-visible:border-ring"
    />
  )
  if (!copy) return input
  return (
    <div className="group/c flex items-center gap-1">
      {input}
      <button onClick={(e) => { e.stopPropagation(); try { navigator.clipboard?.writeText(String(ALL[idx][field] ?? "")) } catch { /* noop */ } }}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/c:opacity-50 hover:!opacity-100" title="คัดลอก"><Copy className="size-3" /></button>
    </div>
  )
}

interface Col { id: string; label: string; w: number; sortKey?: string; center?: boolean; cell: (s: Student) => ReactNode }

const BASE_COLS: Col[] = [
  { id: "name", label: "Name", w: 150, sortKey: "name", cell: (s) => <EditCell idx={s.idx} field="name" copy /> },
  { id: "nick", label: "Nickname", w: 110, sortKey: "nick", cell: (s) => <EditCell idx={s.idx} field="nick" copy /> },
  { id: "lineName", label: "LINE Name", w: 130, cell: (s) => <EditCell idx={s.idx} field="lineName" /> },
  {
    id: "grade", label: "Grade", w: 100, center: true, cell: (s) => (
      <Select value={s.grade} onValueChange={(v) => updateStudent(s.idx, { grade: v, gc: (GRADES.find((g) => g[0] === v) || ["", ""])[1] })}>
        <SelectTrigger className="h-8 w-[76px]"><SelectValue /></SelectTrigger>
        <SelectContent>{GRADES.map((g) => <SelectItem key={g[0]} value={g[0]}>{g[0]}</SelectItem>)}</SelectContent>
      </Select>
    ),
  },
  { id: "premiumExp", label: "Premium Exp.", w: 120, cell: (s) => <span className="text-muted-foreground">{s.premiumExp}</span> },
  { id: "autoRenew", label: "Auto Renew", w: 80, center: true, cell: (s) => <Checkbox defaultChecked={s.autoRenew} onCheckedChange={(v) => writeStudent(s.idx, "autoRenew", !!v)} /> },
  { id: "premiumPlusExp", label: "Premium Plus Exp.", w: 130, cell: (s) => <span className="text-muted-foreground">{s.premiumPlusExp}</span> },
  { id: "register", label: "Register Date", w: 120, sortKey: "register", cell: (s) => <span className="text-muted-foreground">{s.register}</span> },
  { id: "status", label: "Status", w: 130, cell: (s) => <StatusBadge s={s} /> },
  { id: "line", label: "LINE OA", w: 120, cell: (s) => <button onClick={(e) => { e.stopPropagation(); useLinkLine.getState().open(s.idx) }} className="transition-opacity hover:opacity-80" title="จัดการการผูก LINE"><LineStatusBadge status={lineStatusOf(s.idx)} /></button> },
  { id: "notes", label: "Notes", w: 210, cell: (s) => <EditCell idx={s.idx} field="notes" /> },
  {
    id: "examResults", label: "Exam Results", w: 150, cell: (s) => (
      <Select value={s.examResults || "—"} onValueChange={(v) => updateStudent(s.idx, { examResults: v })}>
        <SelectTrigger className="h-8 w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{["—", "รอผล", "ผ่านรอบแรก", "ผ่านรอบสอง", "ไม่ผ่าน"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    ),
  },
  { id: "deliveryName", label: "Delivery Name", w: 130, cell: (s) => <EditCell idx={s.idx} field="deliveryName" /> },
  { id: "address", label: "Address", w: 180, cell: (s) => <EditCell idx={s.idx} field="address" /> },
  { id: "phone", label: "Phone", w: 130, cell: (s) => <EditCell idx={s.idx} field="phone" /> },
  { id: "course", label: "Course", w: 150, cell: (s) => <div className="flex flex-wrap gap-1">{s.courses.map((c, i) => <span key={c} className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", i > 0 ? "bg-teal-100 text-teal-700" : "bg-primary/10 text-primary")}>{courseShort(c)}</span>)}</div> },
]
const colById = (id: string) => BASE_COLS.find((c) => c.id === id)!
const DEFAULT_COLS = BASE_COLS.filter((c) => c.id !== "course").map((c) => c.id)

function PhotoCell({ s, onPreview, onLeave }: { s: Student; onPreview: (e: React.MouseEvent, s: Student) => void; onLeave: () => void }) {
  const change = () => {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*"
    inp.onchange = () => { const f = inp.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => setPhoto(s.idx, String(rd.result)); rd.readAsDataURL(f) }
    inp.click()
  }
  return (
    <div className="cursor-pointer" title="Hover = ดูรูปเต็ม · Click = เปลี่ยนรูป" onMouseEnter={(e) => onPreview(e, s)} onMouseLeave={onLeave} onClick={change}>
      <Avatar className="size-8 ring-2 ring-transparent hover:ring-primary">
        {s.photo && <AvatarImage src={s.photo} />}
        <AvatarFallback style={{ background: s.av }} className="text-xs font-semibold text-white">{s.nick[0]}</AvatarFallback>
      </Avatar>
    </div>
  )
}

function SortIcon({ active, dir }: { active: boolean; dir: number }) {
  if (!active) return <ArrowUpDown className="size-3 text-muted-foreground/50" />
  return dir > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />
}

export function StudentList() {
  const tick = useSync()
  const openDrawer = useDrawer((s) => s.open)
  const [seg, setSeg] = useState<Seg>("all")
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<{ key: string; dir: number }>({ key: "id", dir: 1 })
  const [order, setOrder] = useState<string[]>(DEFAULT_COLS)
  const [locked, setLocked] = useState<string[]>([])
  const [preview, setPreview] = useState<{ s: Student; x: number; y: number } | null>(null)
  const dragId = useRef<string | null>(null)

  const visLocked = locked.filter((id) => order.includes(id))
  const visUnlocked = order.filter((id) => !locked.includes(id))
  const cols = [...visLocked, ...visUnlocked].map(colById)

  const counts = { all: ALL.filter((r) => !r.deleted).length, active: 0, inactive: 0, churn: 0 } as Record<string, number>
  ALL.forEach((r) => { if (!r.deleted) counts[r.status]++ })

  const rows = useMemo(() => {
    const out = ALL.filter((r) => {
      if (r.deleted) return false
      if (seg !== "all" && r.status !== seg) return false
      if (search) { const q = search.toLowerCase(); if (!(r.name.toLowerCase().includes(q) || r.nick.toLowerCase().includes(q) || r.id.includes(q))) return false }
      return true
    })
    const val = (r: Student) => sort.key === "id" ? r.id : sort.key === "register" ? parseDate(r.register) : String(r[sort.key as keyof Student] ?? "").toLowerCase()
    return [...out].sort((a, b) => { const x = val(a), y = val(b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir })
  }, [seg, search, sort, tick])

  const toggleSort = (key: string) => setSort((s) => (s.key === key ? { key, dir: -s.dir } : { key, dir: 1 }))
  const toggleLock = (id: string) => setLocked((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]))
  const hideCol = (id: string) => setOrder((o) => o.filter((x) => x !== id))
  const showCol = (id: string, on: boolean) => setOrder((o) => (on ? [...o, id] : o.filter((x) => x !== id)))
  const dropCol = (targetId: string) => {
    const src = dragId.current; dragId.current = null
    if (!src || src === targetId) return
    setOrder((o) => { const a = o.filter((x) => x !== src); const ti = a.indexOf(targetId); a.splice(ti < 0 ? a.length : ti, 0, src); return a })
  }

  // sticky left offsets
  let acc = 60 + 110
  const leftOf: Record<string, number> = {}
  cols.forEach((c) => { if (locked.includes(c.id)) { leftOf[c.id] = acc; acc += c.w } })
  const lastLock = visLocked.length ? visLocked[visLocked.length - 1] : null
  const total = 60 + 110 + cols.reduce((a, c) => a + c.w, 0) + 56
  const stick = "sticky bg-card z-10"
  const edge = "shadow-[6px_0_8px_-6px_rgba(20,16,40,0.15)]"

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Student list</h1>
        <p className="text-sm text-muted-foreground">แก้ได้ทุกช่อง · กดหัวตาราง Sort · เมนูหัวคอลัมน์ (Lock/Hide) · ลากสลับคอลัมน์ · ⋯ เมนูรายคน</p>
      </div>

      <Tabs value={seg} onValueChange={(v) => setSeg(v as Seg)}>
        <TabsList>
          {(["all", "active", "inactive", "churn"] as Seg[]).map((v) => (
            <TabsTrigger key={v} value={v} className="capitalize">{v} <span className="ml-1.5 text-muted-foreground">{counts[v]}</span></TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex items-center justify-between gap-3">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input placeholder="ค้นหาชื่อ / ชื่อเล่น / รหัส" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm"><SlidersHorizontal className="mr-2 size-4" /> คอลัมน์</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>แสดง / ซ่อน คอลัมน์</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {BASE_COLS.map((c) => (
              <DropdownMenuCheckboxItem key={c.id} checked={order.includes(c.id)} onCheckedChange={(v) => showCol(c.id, !!v)} onSelect={(e) => e.preventDefault()}>{c.label}</DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <Table style={{ width: total }}>
            <TableHeader>
              <TableRow>
                <TableHead style={{ width: 60, left: 0 }} className={cn(stick, !visLocked.length && edge)}>IMG</TableHead>
                <TableHead style={{ width: 110, left: 60 }} className={cn(stick, !visLocked.length && edge, "cursor-pointer select-none")} onClick={() => toggleSort("id")}>
                  <span className="inline-flex items-center gap-1">ID <SortIcon active={sort.key === "id"} dir={sort.dir} /></span>
                </TableHead>
                {cols.map((c) => {
                  const lk = locked.includes(c.id)
                  return (
                    <TableHead
                      key={c.id} title={c.label} draggable
                      onDragStart={() => (dragId.current = c.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => dropCol(c.id)}
                      style={{ width: c.w, left: lk ? leftOf[c.id] : undefined }}
                      className={cn(c.center && "text-center", lk && stick, lastLock === c.id && edge)}
                    >
                      <div className={cn("flex items-center gap-1", c.center && "justify-center")}>
                        {lk && <Lock className="size-3 text-muted-foreground" />}
                        <span className={cn("truncate", c.sortKey && "cursor-pointer")} onClick={() => c.sortKey && toggleSort(c.sortKey!)}>{c.label}</span>
                        {c.sortKey && <SortIcon active={sort.key === c.sortKey} dir={sort.dir} />}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button className="ml-auto text-muted-foreground/60 hover:text-foreground"><ChevronDown className="size-3.5" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-44">
                            {c.sortKey && <><DropdownMenuItem onClick={() => setSort({ key: c.sortKey!, dir: 1 })}><ArrowUp className="mr-2 size-4" /> เรียง A → Z</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setSort({ key: c.sortKey!, dir: -1 })}><ArrowDown className="mr-2 size-4" /> เรียง Z → A</DropdownMenuItem>
                              <DropdownMenuSeparator /></>}
                            <DropdownMenuItem onClick={() => toggleLock(c.id)}>{lk ? <><LockOpen className="mr-2 size-4" /> ปลดล็อก</> : <><Lock className="mr-2 size-4" /> Lock ชิดซ้าย</>}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => hideCol(c.id)}><EyeOff className="mr-2 size-4" /> ซ่อนคอลัมน์</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableHead>
                  )
                })}
                <TableHead style={{ width: 56 }} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((s) => (
                <TableRow key={s.idx} className="group">
                  <TableCell style={{ left: 0 }} className={cn(stick, "group-hover:bg-muted", !visLocked.length && edge)}>
                    <PhotoCell s={s} onPreview={(e, st) => setPreview({ s: st, x: e.clientX, y: e.clientY })} onLeave={() => setPreview(null)} />
                  </TableCell>
                  <TableCell style={{ left: 60 }} className={cn(stick, "group-hover:bg-muted font-medium tabular-nums", !visLocked.length && edge)}><CopyText text={s.id}>{s.id}</CopyText></TableCell>
                  {cols.map((c) => {
                    const lk = locked.includes(c.id)
                    return <TableCell key={c.id} style={{ left: lk ? leftOf[c.id] : undefined }} className={cn(c.center && "text-center", lk && stick, lk && "group-hover:bg-muted", lastLock === c.id && edge)}>{c.cell(s)}</TableCell>
                  })}
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem><Ban className="mr-2 size-4" /> Ignore</DropdownMenuItem>
                        <DropdownMenuItem><Check className="mr-2 size-4" /> Check</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openDrawer(s.idx, s.courses[0])}><FileText className="mr-2 size-4" /> Summary</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => deleteStudent(s.idx)}><Trash2 className="mr-2 size-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">แสดง {rows.length} จาก {ALL.filter((r) => !r.deleted).length} คน</p>

      {preview && (
        <div className="pointer-events-none fixed z-50 rounded-xl border bg-popover p-2 shadow-xl" style={{ left: Math.min(preview.x + 12, window.innerWidth - 190), top: Math.max(8, preview.y - 80) }}>
          {preview.s.photo
            ? <img src={preview.s.photo} className="size-40 rounded-lg object-cover" />
            : <div className="flex size-40 items-center justify-center rounded-lg text-6xl font-bold text-white" style={{ background: preview.s.av }}>{preview.s.nick[0]}</div>}
        </div>
      )}
    </div>
  )
}
