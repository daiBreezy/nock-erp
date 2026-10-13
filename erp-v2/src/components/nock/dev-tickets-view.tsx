"use client"

// เรื่องถึง Dev (owner 2026-10-13): bugs / help / suggestions / questions sent from Nock. The reporter sees their own;
// Developers see every one, reply, and move it along (ใหม่ → รับเรื่อง → กำลังทำ → เสร็จ / ไม่ทำ).
import Link from "next/link"
import { useState } from "react"
import { ArchiveIcon, CheckCircle2Icon, CircleDotIcon, ImagePlusIcon, LoaderIcon, SendIcon } from "lucide-react"
import { Pill, RoleChip, type Tone } from "@/components/app/badges"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { useSort } from "@/components/app/data-table"
import { EntityPanel, PanelBody, PanelFooter } from "@/components/app/form-shell"
import { InfoTip } from "@/components/app/info-tip"
import { ImageAttach, ImageGallery, MetaGrid } from "@/components/app/images"
import { Field } from "@/components/app/student-form"
import { Input } from "@/components/ui/input"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { FilterBar, KpiRow, SearchBox, ShowChip, Toolbar } from "@/components/app/page-layout"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, toDateStr } from "@/domain/dates"
import { DEV_KIND_LABEL, DEV_SET_STATUSES, DEV_STATUS_LABEL, DONE_STATUSES, seesAllTickets, visibleTickets, canReplyTicket } from "@/domain/rules/dev-tickets"
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

const STATUS_TONE: Record<DevTicketStatus, Tone> = { new: "red", in_progress: "blue", done: "green", wont_do: "gray", on_hold: "amber" }
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
type SortKey = "date" | "status"

export function DevTicketsView({ creating, onCreated }: { creating: boolean; onCreated: () => void }) {
  const me = useStore((s) => s.me())
  const all = useStore((s) => s.devTickets)
  const staff = useStore((s) => s.staff)
  const isDev = seesAllTickets(me)
  const scope = useBranchScope()
  // owner 2026-10-13: hide / show the finished ones (เสร็จแล้ว · ไม่ทำ) like Done on Billing; a KPI card narrows to one status
  const [showDone, setShowDone] = useQueryState<"0" | "1">("ddone", "1")
  const [status, setStatus] = useState<DevTicketStatus | "">("")
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
    .filter((t) => (status ? t.status === status : showDone === "1" || !DONE_STATUSES.includes(t.status)))
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
        <Kpi icon={CircleDotIcon} label="ใหม่ (ยังไม่มีคนรับ)" value={count(["new"])} tone="red" valueClassName={count(["new"]) ? "text-red-700" : undefined} onClick={() => setStatus(status === "new" ? "" : "new")} active={status === "new"} />
        <Kpi icon={LoaderIcon} label="กำลังทำ" value={count(["in_progress"])} tone="sky" onClick={() => setStatus(status === "in_progress" ? "" : "in_progress")} active={status === "in_progress"} />
        <Kpi icon={ArchiveIcon} label="เก็บไว้ก่อน" value={count(["on_hold"])} tone="amber" onClick={() => setStatus(status === "on_hold" ? "" : "on_hold")} active={status === "on_hold"} />
        <Kpi icon={CheckCircle2Icon} label="เสร็จแล้ว" value={count(["done"])} tone="emerald" sub={count(["wont_do"]) ? `ไม่ทำ ${count(["wont_do"])} เรื่อง` : undefined} onClick={() => setStatus(status === "done" ? "" : "done")} active={status === "done"} />
      </KpiRow>
      <Toolbar>
        <ShowChip label="Done" on={showDone === "1"} count={count(DONE_STATUSES)} onChange={(v) => { setShowDone(v ? "1" : "0"); setStatus("") }} />
        {status && <Button size="sm" variant="ghost" onClick={() => setStatus("")}>ดูทุกสถานะ</Button>}
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
      {/* owner 2026-10-13: "ส่งเรื่องถึง Dev" from the page too (not only from Nock) — once sent, its panel opens */}
      <EntityPanel open={creating} onClose={onCreated} wide>
        {creating && <CreateTicketPanel onSent={(id) => { onCreated(); setOpen(id) }} />}
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

function CreateTicketPanel({ onSent }: { onSent: (id: ID) => void }) {
  const me = useStore((s) => s.me())
  const branch = useStore((s) => s.branches.find((b) => b.id === s.branchId))
  const send = useStore((s) => s.sendDevTicket)
  const [kind, setKind] = useState<DevTicketKind>("question")
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [locs, setLocs] = useState<string[]>([])
  const [images, setImages] = useState<string[]>([])
  const pageUrl = typeof window === "undefined" ? "/nock" : `${window.location.pathname}${window.location.search}`
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <SheetTitle className="flex items-center gap-1.5 text-lg">ส่งเรื่องถึง Dev<InfoTip text="ทีมพัฒนาตอบกลับในเรื่องนี้ — คุณได้แจ้งเตือนทุกครั้งที่มีความคืบหน้า · เรื่องที่ส่งเห็นเฉพาะคุณกับ Developer" /></SheetTitle>
        <SheetDescription>ส่งในนาม {me.nickname} · {me.roles.map((r) => ROLE_LABEL[r]).join(", ")} · สาขา{branch?.name}</SheetDescription>
      </SheetHeader>
      <PanelBody>
        <Field label="ประเภท">
          <div className="grid gap-1.5 sm:grid-cols-4">
            {(Object.keys(DEV_KIND_LABEL) as DevTicketKind[]).map((k) => {
              const Icon = DEV_KIND_ICON[k]
              return <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-sm", kind === k ? "border-primary bg-primary/5 font-medium text-primary" : "hover:bg-muted")}><Icon className="size-4 shrink-0" />{DEV_KIND_LABEL[k]}</button>
            })}
          </div>
        </Field>
        <Field label="หัวเรื่อง *"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="สั้นๆ ให้ Dev รู้ว่าเรื่องอะไร" /></Field>
        <Field label="รายละเอียด *" hint={kind === "bug" ? "ทำอะไรอยู่ แล้วเกิดอะไรขึ้น ควรเป็นอย่างไร" : kind === "idea" ? "อยากให้ระบบมีอะไร ช่วยงานแบบไหน" : "เล่ารายละเอียดให้ Dev เข้าใจ"}>
          <Textarea rows={6} value={detail} onChange={(e) => setDetail(e.target.value)} />
        </Field>
        <Field label="รูปประกอบ (ไม่บังคับ)" hint="ภาพหน้าจอช่วยให้ Dev เห็นปัญหาเร็วขึ้น — คนที่เปิดเรื่องนี้กดดูรูปเต็มได้"><ImageAttach value={images} onChange={setImages} /></Field>
        <Field label="Part (เลือกได้หลายส่วน) *" hint="Part = ส่วนของระบบที่เกี่ยวข้อง">
          <div className="flex flex-wrap gap-1.5">
            {NOCK_LOCATIONS.map((l) => {
              const on = locs.includes(l.id)
              return <button key={l.id} type="button" aria-pressed={on} onClick={() => setLocs(on ? locs.filter((x) => x !== l.id) : [...locs, l.id])} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{l.label}</button>
            })}
          </div>
        </Field>
      </PanelBody>
      <PanelFooter>
        <Button className="ml-auto" disabled={!title.trim() || !detail.trim() || !locs.length} onClick={() => { const r = send({ kind, title, detail, locations: locs, pageUrl, images }); if (report(r, (v) => `ส่งถึง Dev แล้ว · ${v.number}`)) onSent(r.value.id) }}><SendIcon /> ส่งถึง Dev</Button>
      </PanelFooter>
    </>
  )
}

function TicketPanel({ id }: { id: ID }) {
  const me = useStore((s) => s.me())
  const t = useStore((s) => s.devTickets.find((x) => x.id === id))
  const staff = useStore((s) => s.staff)
  const branches = useStore((s) => s.branches)
  const reply = useStore((s) => s.replyDevTicket)
  const setStatus = useStore((s) => s.setDevTicketStatus)
  const [text, setText] = useState("")
  const [replyImages, setReplyImages] = useState<string[]>([])
  const [attaching, setAttaching] = useState(false)
  const [next, setNext] = useState<DevTicketStatus | "">("")
  if (!t) return null
  const isDev = seesAllTickets(me)
  const who = (sid: ID) => staff.find((s) => s.id === sid)
  const send = () => {
    const ok = next ? report(setStatus(t.id, next, text), `เปลี่ยนเป็น ${DEV_STATUS_LABEL[next]} แล้ว`) : report(reply(t.id, text, replyImages), "ส่งข้อความแล้ว")
    if (ok) { setText(""); setNext(""); setReplyImages([]); setAttaching(false) }
  }
  return (
    <>
      {/* owner 2026-10-13: tidy — chips + title in the header, the facts as a label / value grid, then the story */}
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 pr-8">
          <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
          <KindChip kind={t.kind} />
          <Pill tone={STATUS_TONE[t.status]}>{DEV_STATUS_LABEL[t.status]}</Pill>
        </div>
        <SheetTitle className="text-lg leading-snug">{t.title}</SheetTitle>
      </SheetHeader>
      <PanelBody>
        <MetaGrid rows={[
          ["แจ้งโดย", <><b>{who(t.by)?.nickname}</b>{t.roles.map((r) => <RoleChip key={r} role={r} />)}</>],
          ["สาขา", branches.find((b) => b.id === t.branchId)?.name ?? "—"],
          ["วันที่", `${fmtDate(toDateStr(new Date(t.at)), { weekday: true, year: true })} · ${timeOf(t.at)} น.`],
          ["Part", <>{t.locations.map((l) => <span key={l} className="rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-foreground/10">{locationLabel(l)}</span>)}</>],
          ["หน้าที่เปิดอยู่", isDev ? <Link href={t.pageUrl} className="font-mono text-xs underline">{t.pageUrl}</Link> : <span className="font-mono text-xs">{t.pageUrl}</span>],
        ]} />
        <section className="space-y-2">
          <p className="text-sm font-semibold">รายละเอียด</p>
          <p className="text-sm whitespace-pre-line">{t.detail}</p>
          <ImageGallery images={t.images} />
        </section>
        <section className="space-y-2 border-t pt-4">
          <p className="text-sm font-semibold">การตอบกลับ{t.thread.length > 0 && ` (${t.thread.length})`}</p>
          {t.thread.map((m) => {
            const fromDev = who(m.by)?.roles.includes("developer")
            return (
              <div key={m.id} className={cn("max-w-[85%] space-y-1.5 rounded-2xl p-3 text-sm", fromDev ? "bg-teal-50 ring-1 ring-teal-200 dark:bg-teal-950/40 dark:ring-teal-900" : "ml-auto bg-muted")}>
                <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"><b className="text-foreground">{who(m.by)?.nickname}</b>{fromDev && <RoleChip role="developer" />}<span>{fmtDate(toDateStr(new Date(m.at)))} {timeOf(m.at)} น.</span>{m.status && <Pill tone={STATUS_TONE[m.status]}>→ {DEV_STATUS_LABEL[m.status]}</Pill>}</p>
                {m.text && <p className="whitespace-pre-line">{m.text}</p>}
                <ImageGallery images={m.images} size="sm" />
              </div>
            )
          })}
          {!t.thread.length && <p className="text-xs text-muted-foreground">ยังไม่มีการตอบกลับ{isDev ? "" : " — Dev จะตอบในนี้ และคุณจะได้แจ้งเตือน"}</p>}
        </section>
      </PanelBody>
      {canReplyTicket(me, t) && (
        <PanelFooter>
          <div className="w-full space-y-2">
            <Textarea rows={2} value={text} onChange={(e) => setText(e.target.value)} placeholder={next === "wont_do" ? "เหตุผลที่ไม่ทำ (จำเป็น)" : isDev ? "ตอบกลับคนแจ้ง…" : "เพิ่มข้อมูลให้ Dev…"} />
            {attaching && <ImageAttach value={replyImages} onChange={setReplyImages} />}
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => setAttaching(!attaching)}><ImagePlusIcon /> รูป{replyImages.length > 0 && ` (${replyImages.length})`}</Button>
              {/* owner 2026-10-13: the Developer picks the status — กำลังทำ · เสร็จแล้ว · ไม่ทำ · เก็บไว้ก่อน */}
              {isDev && (
                <span className="flex flex-wrap items-center gap-1">
                  <span className="text-xs text-muted-foreground">สถานะ:</span>
                  {DEV_SET_STATUSES.map((x) => {
                    const on = (next || t.status) === x
                    return <button key={x} type="button" aria-pressed={on} disabled={x === t.status} onClick={() => setNext(next === x ? "" : x)}
                      className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted", x === t.status && "cursor-default")}>{DEV_STATUS_LABEL[x]}</button>
                  })}
                </span>
              )}
              <Button className="ml-auto" disabled={!next && !text.trim() && !replyImages.length} onClick={send}><SendIcon /> {next ? "บันทึกสถานะ" : "ส่ง"}</Button>
            </div>
          </div>
        </PanelFooter>
      )}
    </>
  )
}
