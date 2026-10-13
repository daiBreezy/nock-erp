"use client"

// เรื่องถึง Dev (owner 2026-10-13): bugs / help / suggestions / questions sent from Nock. The reporter sees their own;
// Developers see every one, reply, and move it along (ใหม่ → รับเรื่อง → กำลังทำ → เสร็จ / ไม่ทำ).
import Link from "next/link"
import { useState } from "react"
import { CheckCircle2Icon, CircleDotIcon, InboxIcon, LoaderIcon, MapPinIcon, SendIcon } from "lucide-react"
import { Pill, RoleChip, type Tone } from "@/components/app/badges"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { useSort } from "@/components/app/data-table"
import { EntityPanel, PanelBody, PanelFooter } from "@/components/app/form-shell"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { FilterBar, KpiRow, SearchBox, Segmented, Toolbar } from "@/components/app/page-layout"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, toDateStr } from "@/domain/dates"
import { DEV_KIND_LABEL, DEV_STATUS_LABEL, OPEN_STATUSES, seesAllTickets, visibleTickets, canReplyTicket } from "@/domain/rules/dev-tickets"
import { locationLabel, NOCK_LOCATIONS } from "@/domain/rules/nock"
import { matchesQuery } from "@/domain/rules/people"
import type { DevTicket, DevTicketKind, DevTicketStatus, ID, Role } from "@/domain/types"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import { ALL_ROLES } from "@/domain/rules/notifications"
import { report } from "@/lib/feedback"
import { useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { DEV_KIND_ICON } from "./dev-kind-icon"
import { ChipOverflow } from "@/components/app/chip-overflow"

const STATUS_TONE: Record<DevTicketStatus, Tone> = { new: "red", acknowledged: "amber", in_progress: "blue", done: "green", wont_do: "gray" }
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
type Show = "all" | "pending" | "done"
type SortKey = "date" | "status"

export function DevTicketsView() {
  const me = useStore((s) => s.me())
  const all = useStore((s) => s.devTickets)
  const staff = useStore((s) => s.staff)
  const isDev = seesAllTickets(me)
  const scope = useBranchScope()
  const [show, setShow] = useQueryState<Show>("dshow", "all")
  const [location, setLocation] = useState("")
  const [role, setRole] = useState<Role | "">("")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<ID | null>(null)
  const { sort, toggle } = useSort<SortKey>("date", true)
  const who = (id: ID) => staff.find((s) => s.id === id)

  const mine = visibleTickets(all, me).filter((t) => scope.ids.includes(t.branchId))
  const filtered = mine
    .filter((t) => !location || t.locations.includes(location))
    .filter((t) => !role || t.roles.includes(role))
    .filter((t) => !q || matchesQuery(q, [t.number, t.title, t.detail, who(t.by)?.nickname]))
  const rows = filtered
    .filter((t) => (show === "pending" ? OPEN_STATUSES.includes(t.status) : show === "done" ? !OPEN_STATUSES.includes(t.status) : true))
    .sort((a, b) => { const v = sort.key === "status" ? a.status.localeCompare(b.status) : a.at.localeCompare(b.at); return sort.desc ? -v : v })
  const count = (sts: DevTicketStatus[]) => filtered.filter((t) => sts.includes(t.status)).length

  // owner 2026-10-13: same tidy layout as the question list — kind as a chip, roles instead of names, status at the right
  const columns: Column<DevTicket>[] = [
    { id: "number", label: "เลขที่", width: "84px", cell: (t) => <span className="font-mono text-xs">{t.number}</span> },
    { id: "date", label: "วันที่ · เวลา", width: "112px", sort: "date", cell: (t) => <span className="tabular-nums"><span className="block whitespace-nowrap">{fmtDate(toDateStr(new Date(t.at)), { year: true })}</span><span className="text-xs text-muted-foreground">{timeOf(t.at)} น.</span></span> },
    // owner 2026-10-13: the kind is just its icon in the table — the header ⓘ explains each one
    { id: "kind", label: "ประเภท", width: "64px", align: "center", info: <span className="flex flex-col gap-1.5">{(Object.keys(DEV_KIND_LABEL) as DevTicketKind[]).map((k) => <span key={k} className="flex items-center gap-2"><KindIcon kind={k} />{DEV_KIND_LABEL[k]}</span>)}</span>, cell: (t) => <KindIcon kind={t.kind} /> },
    { id: "title", label: "เรื่อง", width: "240px", required: true, cell: (t) => <span className="block max-w-[320px]"><span className="block truncate font-medium">{t.title}</span><span className="block truncate text-xs text-muted-foreground">{t.detail}</span></span> },
    { id: "part", label: "Part", width: "140px", cell: (t) => <ChipOverflow items={t.locations} label={locationLabel} render={(l) => <span className="rounded-full bg-muted px-2 py-0.5 text-xs whitespace-nowrap">{locationLabel(l)}</span>} /> },
    { id: "role", label: "Role", width: "100px", cell: (t) => <ChipOverflow items={t.roles} label={(r) => ROLE_LABEL[r]} render={(r) => <RoleChip role={r} />} /> },
    { id: "branch", label: "สาขา", width: "56px", align: "center", cell: (t) => <BranchCode code={scope.code(t.branchId)} /> },
    { id: "replies", label: "ตอบกลับ", width: "64px", align: "center", cell: (t) => (t.thread.length ? <span className="tabular-nums">{t.thread.length}</span> : <span className="text-muted-foreground">—</span>) },
    { id: "status", label: "สถานะ", width: "130px", align: "right", sort: "status", required: true, cell: (t) => <Pill tone={STATUS_TONE[t.status]}>{DEV_STATUS_LABEL[t.status]}</Pill> },
  ]

  return (
    <>
      <KpiRow>
        <Kpi icon={InboxIcon} label="เรื่องทั้งหมด" value={filtered.length} onClick={() => setShow("all")} active={show === "all"} />
        <Kpi icon={CircleDotIcon} label="ใหม่ (ยังไม่มีคนรับ)" value={count(["new"])} tone="red" valueClassName={count(["new"]) ? "text-red-700" : undefined} />
        <Kpi icon={LoaderIcon} label="Dev กำลังดู / กำลังทำ" value={count(["acknowledged", "in_progress"])} tone="sky" />
        <Kpi icon={CheckCircle2Icon} label="เสร็จแล้ว" value={count(["done"])} tone="emerald" sub={count(["wont_do"]) ? `ไม่ทำ ${count(["wont_do"])} เรื่อง` : undefined} onClick={() => setShow(show === "done" ? "all" : "done")} active={show === "done"} />
      </KpiRow>
      <Toolbar>
        <Segmented label="แสดง" value={show} onChange={setShow} options={[{ value: "all", label: "All" }, { value: "pending", label: <>Pending{count(OPEN_STATUSES) > 0 && <span className="rounded-full bg-red-100 px-1.5 text-xs text-red-800 tabular-nums">{count(OPEN_STATUSES)}</span>}</> }, { value: "done", label: "Done" }]} />
      </Toolbar>
      {/* owner 2026-10-13: anyone can send to Dev — so the filters are exactly the question list's: search · Role · Part · columns · branch */}
      <FilterBar search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาเลขที่ / เรื่อง / ผู้แจ้ง" />}>
        <NativeSelect className="h-9 w-36" value={role} onChange={(e) => setRole(e.target.value as Role | "")} placeholder="ทุก Role" options={ALL_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
        <NativeSelect className="h-9 w-44" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ทุก Part" options={NOCK_LOCATIONS.map((l) => ({ value: l.id, label: l.label }))} />
        <ColumnsMenu id="dev-tickets" columns={columns} />
        {scope.select}
      </FilterBar>
      <DataTable id="dev-tickets" columns={columns} rows={rows} rowKey={(t) => t.id} onRowClick={(t) => setOpen(t.id)} sort={sort} onSort={toggle} minWidth={960}
        empty={isDev ? "ไม่มีเรื่องตามตัวกรอง" : "คุณยังไม่ได้ส่งเรื่องถึง Dev — กด ส่งถึง Dev ในหน้าต่าง Nock"} />
      <EntityPanel open={!!open} onClose={() => setOpen(null)} wide>
        {open && <TicketPanel key={open} id={open} />}
      </EntityPanel>
    </>
  )
}

const KIND_TONE: Record<DevTicketKind, Tone> = { bug: "red", help: "amber", idea: "violet", question: "blue" }
/** the kind of ticket as a coloured chip with its icon */
export function KindChip({ kind }: { kind: DevTicketKind }) {
  const Icon = DEV_KIND_ICON[kind]
  return <Pill tone={KIND_TONE[kind]}><Icon className="size-3" />{DEV_KIND_LABEL[kind]}</Pill>
}

const KIND_ICON_TONE: Record<DevTicketKind, string> = { bug: "bg-red-100 text-red-700", help: "bg-amber-100 text-amber-800", idea: "bg-violet-100 text-violet-700", question: "bg-sky-100 text-sky-700" }
/** the kind as a small coloured icon (hover = its name) */
function KindIcon({ kind }: { kind: DevTicketKind }) {
  const Icon = DEV_KIND_ICON[kind]
  return <span title={DEV_KIND_LABEL[kind]} className={cn("inline-grid size-6 place-items-center rounded-full", KIND_ICON_TONE[kind])}><Icon className="size-3.5" /></span>
}

function TicketPanel({ id }: { id: ID }) {
  const me = useStore((s) => s.me())
  const t = useStore((s) => s.devTickets.find((x) => x.id === id))
  const staff = useStore((s) => s.staff)
  const branches = useStore((s) => s.branches)
  const reply = useStore((s) => s.replyDevTicket)
  const setStatus = useStore((s) => s.setDevTicketStatus)
  const [text, setText] = useState("")
  const [next, setNext] = useState<DevTicketStatus | "">("")
  if (!t) return null
  const isDev = seesAllTickets(me)
  const who = (sid: ID) => staff.find((s) => s.id === sid)
  const send = () => {
    const ok = next ? report(setStatus(t.id, next, text), `เปลี่ยนเป็น ${DEV_STATUS_LABEL[next]} แล้ว`) : report(reply(t.id, text), "ส่งข้อความแล้ว")
    if (ok) { setText(""); setNext("") }
  }
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 pr-8">
          <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
          <Pill tone={STATUS_TONE[t.status]}>{DEV_STATUS_LABEL[t.status]}</Pill>
          <KindChip kind={t.kind} />
        </div>
        <SheetTitle className="text-lg">{t.title}</SheetTitle>
        <SheetDescription className="flex flex-wrap items-center gap-1.5">
          แจ้งโดย <b className="text-foreground">{who(t.by)?.nickname}</b> {t.roles.map((r) => <RoleChip key={r} role={r} />)} · สาขา{branches.find((b) => b.id === t.branchId)?.name} · {fmtDate(toDateStr(new Date(t.at)), { weekday: true })} {timeOf(t.at)} น.
        </SheetDescription>
        <div className="flex flex-wrap items-center gap-1">
          <MapPinIcon className="size-3.5 text-muted-foreground" />{t.locations.map((l) => <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-xs">{locationLabel(l)}</span>)}
          <span className="ml-2 text-xs text-muted-foreground">หน้า: {isDev ? <Link href={t.pageUrl} className="font-mono underline">{t.pageUrl}</Link> : <span className="font-mono">{t.pageUrl}</span>}</span>
        </div>
      </SheetHeader>
      <PanelBody>
        <section className="rounded-2xl bg-muted/50 p-3 text-sm whitespace-pre-line">{t.detail}</section>
        {t.thread.map((m) => {
          const fromDev = who(m.by)?.roles.includes("developer")
          return (
            <div key={m.id} className={cn("max-w-[85%] space-y-1 rounded-2xl p-3 text-sm", fromDev ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:ring-teal-900" : "ml-auto bg-muted")}>
              <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><b className="text-foreground">{who(m.by)?.nickname}</b>{fromDev && <RoleChip role="developer" />} · {fmtDate(toDateStr(new Date(m.at)))} {timeOf(m.at)} น.{m.status && <Pill tone={STATUS_TONE[m.status]}>→ {DEV_STATUS_LABEL[m.status]}</Pill>}</p>
              {m.text && <p className="whitespace-pre-line">{m.text}</p>}
            </div>
          )
        })}
        {!t.thread.length && <p className="text-center text-xs text-muted-foreground">ยังไม่มีการตอบกลับ{isDev ? "" : " — Dev จะตอบในนี้ และคุณจะได้แจ้งเตือน"}</p>}
      </PanelBody>
      {canReplyTicket(me, t) && (
        <PanelFooter>
          <div className="w-full space-y-2">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={next === "wont_do" ? "เหตุผลที่ไม่ทำ (จำเป็น)" : isDev ? "ตอบกลับคนแจ้ง…" : "เพิ่มข้อมูลให้ Dev…"} />
            <div className="flex flex-wrap items-center gap-2">
              {isDev && <NativeSelect className="h-9 w-52" value={next} onChange={(e) => setNext(e.target.value as DevTicketStatus | "")} placeholder="ไม่เปลี่ยนสถานะ" options={(Object.keys(DEV_STATUS_LABEL) as DevTicketStatus[]).filter((x) => x !== t.status).map((x) => ({ value: x, label: `เปลี่ยนเป็น: ${DEV_STATUS_LABEL[x]}` }))} />}
              <Button className="ml-auto" disabled={!next && !text.trim()} onClick={send}><SendIcon /> {next ? "บันทึกสถานะ" : "ส่ง"}</Button>
            </div>
          </div>
        </PanelFooter>
      )}
    </>
  )
}
