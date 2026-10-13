"use client"

// คลังคำถาม Nock (owner 2026-10-13): one list — every question asked of Nock; once someone answers it, it IS Nock's
// knowledge. A question can have answers from several people (each person edits only their own); thumbs up / down
// on each answer decide which one Nock uses. Who asked (role, branch), when, which part of the system (Location).
import { useState } from "react"
import { BookOpenCheckIcon, CircleHelpIcon, CodeXmlIcon, MessagesSquareIcon, PencilIcon, PlusIcon, SaveIcon, SparklesIcon, StarIcon, ThumbsDownIcon, ThumbsUpIcon, TrashIcon } from "lucide-react"
import { Pill, RoleChip, type Tone } from "@/components/app/badges"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { ColumnsMenu, DataTable, type Column } from "@/components/app/data-grid"
import { VoteBadge } from "@/components/nock/vote-badge"
import { useSort } from "@/components/app/data-table"
import { EntityPanel, PanelBody, PanelFooter, PanelMore } from "@/components/app/form-shell"
import { InfoTip } from "@/components/app/info-tip"
import { ImageAttach, ImageGallery, MetaGrid } from "@/components/app/images"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { FilterBar, KpiRow, Page, PageHeader, SearchBox, ShowChip, Tabs, Toolbar } from "@/components/app/page-layout"
import { DevTicketsView } from "@/components/nock/dev-tickets-view"
import { OPEN_STATUSES, visibleTickets } from "@/domain/rules/dev-tickets"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, toDateStr } from "@/domain/dates"
import { answerScore, bestAnswer, canAnswerNock, helpfulRate, knowledgeOf, locationLabel, NOCK_LOCATIONS, NOCK_STATUS_LABEL, visibleAnswer } from "@/domain/rules/nock"
import { matchesQuery } from "@/domain/rules/people"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import type { ID, NockAnswer, NockQuestion, NockStatus, Result, Role } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { ChipOverflow } from "@/components/app/chip-overflow"

const STATUS_TONE: Record<NockStatus, Tone> = { ai: "blue", unanswered: "red", answered: "green" }
const STATUS_SHORT: Record<NockStatus, string> = { ai: "Nock ตอบแล้ว", unanswered: "ยังไม่มีคำตอบ", answered: "คลังความรู้" }
const ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin", "teacher", "developer"]
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })

type SortKey = "date" | "votes" | "status"

export default function NockPage() {
  const me = useStore((s) => s.me())
  const all = useStore((s) => s.nockQuestions)
  const staff = useStore((s) => s.staff)
  const answerer = canAnswerNock(me)
  const scope = useBranchScope()
  // owner 2026-10-13: no date range — All / Pending (no answer yet) / Done (answered)
  const [tab, setTab] = useQueryState<"questions" | "dev">("tab", "questions")
  const tickets = useStore((s) => s.devTickets)
  const openTickets = visibleTickets(tickets, me).filter((t) => OPEN_STATUSES.includes(t.status)).length
  // owner 2026-10-13: hide / show the answered ones (Done) — like Done on Billing; KPI cards narrow to one status
  const [showDone, setShowDone] = useQueryState<"0" | "1">("done", "1")
  const [status, setStatus] = useQueryState<NockStatus | "">("status", "")
  const [location, setLocation] = useQueryState<string>("location", "")
  const [role, setRole] = useState<Role | "">("")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<ID | "new" | null>(null)
  const [newTicket, setNewTicket] = useState(false)
  const { sort, toggle } = useSort<SortKey>("date", true)

  const who = (id?: ID) => staff.find((s) => s.id === id)
  // answerers see the whole bank; everyone else sees their own questions + the knowledge they may be told
  const visible = all.filter((x) => answerer || x.askedBy === me.id || !!bestAnswer(x, me.roles))
  const inScope = visible.filter((x) => scope.ids.includes(x.branchId) || x.manual)
  const filtered = inScope
    .filter((x) => !role || x.roles.includes(role))
    .filter((x) => !location || (x.locations ?? []).includes(location))
    .filter((x) => !q || matchesQuery(q, [x.question, x.aiAnswer, ...(x.answers ?? []).map((a) => a.text), who(x.askedBy)?.nickname]))
  const count = (st: NockStatus) => filtered.filter((x) => x.status === st).length
  const votesOf = (x: NockQuestion) => { const b = bestAnswer(x, answerer ? undefined : me.roles); return b ? answerScore(b) : x.aiAnswer ? (x.aiVotesUp?.length ?? 0) - (x.aiVotesDown?.length ?? 0) : -999 }
  const rows = filtered
    .filter((x) => (status ? true : showDone === "1" || x.status === "unanswered"))
    .filter((x) => !status || x.status === status)
    .sort((a, b) => {
      const v = sort.key === "votes" ? votesOf(a) - votesOf(b)
          : sort.key === "status" ? a.status.localeCompare(b.status)
            : a.at.localeCompare(b.at)
      return sort.desc ? -v : v
    })
  const kbAnswers = knowledgeOf(filtered).flatMap((k) => k.answers ?? [])
  const votes = kbAnswers.reduce((a, x) => ({ up: a.up + x.votesUp.length, down: a.down + x.votesDown.length }), { up: 0, down: 0 })

  // owner 2026-10-13: tidy, no sideways scroll (status stays in view) — the asker's name is in the panel, the table shows roles
  const columns: Column<NockQuestion>[] = [
    { id: "date", label: "วันที่ · เวลา", width: "112px", sort: "date", cell: (x) => <span className="tabular-nums"><span className="block whitespace-nowrap">{fmtDate(toDateStr(new Date(x.at)), { year: true })}</span><span className="text-xs text-muted-foreground">{timeOf(x.at)} น.</span></span> },
    { id: "question", label: "คำถาม", width: "260px", required: true, cell: (x) => {
      const b = bestAnswer(x, answerer ? undefined : me.roles)
      return <span className="block max-w-[340px]"><span className="block truncate font-medium">{x.question}</span><span className="block truncate text-xs text-muted-foreground">{b ? `ทีม: ${b.text}` : x.aiAnswer ? `Nock: ${x.aiAnswer}` : "—"}</span></span>
    } },
    { id: "part", label: "Part", width: "130px", cell: (x) => <ChipOverflow items={x.locations ?? []} label={locationLabel} render={(l) => <span className="rounded-full bg-muted px-2 py-0.5 text-xs whitespace-nowrap">{locationLabel(l)}</span>} /> },
    { id: "role", label: "Role", width: "100px", cell: (x) => <ChipOverflow items={x.roles} label={(r) => ROLE_LABEL[r]} render={(r) => <RoleChip role={r} />} /> },
    { id: "branch", label: "สาขา", width: "56px", align: "center", cell: (x) => (x.manual ? <span className="text-muted-foreground">—</span> : <BranchCode code={scope.code(x.branchId)} />) },
    { id: "answers", label: "คำตอบ", width: "64px", align: "center", info: "จำนวนคำตอบจากทีม — ถ้ามีหลายคำตอบ Nock ใช้คำตอบที่โหวตดีที่สุด", cell: (x) => (x.answers?.length ? <span className="tabular-nums">{x.answers.length}</span> : <span className="text-muted-foreground">—</span>) },
    { id: "votes", label: "โหวต", width: "64px", align: "center", sort: "votes", info: "โหวตของคำตอบที่ใช้อยู่ — ไอคอนบอกฝั่งที่มากกว่า (เขียว = ช่วยได้ · แดง = ไม่ช่วย)", cell: (x) => {
      const b = bestAnswer(x, answerer ? undefined : me.roles)
      return b ? <VoteBadge up={b.votesUp.length} down={b.votesDown.length} /> : <VoteBadge up={x.aiVotesUp?.length ?? 0} down={x.aiVotesDown?.length ?? 0} />
    } },
    { id: "status", label: "สถานะ", width: "110px", align: "right", sort: "status", required: true, cell: (x) => <Pill tone={STATUS_TONE[x.status]}>{STATUS_SHORT[x.status]}</Pill> },
  ]

  return (
    <Page>
      <PageHeader title={<span className="flex items-center gap-2">คลังคำถาม Nock <InfoTip text="ทุกคำถามที่ถาม Nock · คำถามที่มีคำตอบจากทีม = คลังความรู้ที่ Nock ใช้ตอบคนต่อไป · ตอบได้หลายคน แก้ได้เฉพาะคำตอบของตัวเอง · โหวตขึ้น / ลง เลือกว่า Nock ใช้คำตอบไหน · คำถามที่ Nock ตอบไม่ได้รอ Super Admin / Director / Area Manager / Manager ตอบ" /></span>}
        description={answerer ? "ตอบคำถามที่ Nock ยังไม่รู้ — ตอบแล้วกลายเป็นคลังความรู้" : "คำถามของคุณ และคลังความรู้ที่ทีมตอบไว้"}
        actions={tab === "dev" ? <Button onClick={() => setNewTicket(true)}><PlusIcon /> ส่งเรื่องถึง Dev</Button> : answerer && <Button onClick={() => setOpen("new")}><PlusIcon /> สร้างคลังความรู้</Button>} />
      {/* owner 2026-10-13: questions about using the system | เรื่องถึง Dev (bugs / help / suggestions) — one page */}
      <Tabs value={tab} onChange={setTab} options={[{ value: "questions", label: "คำถามการใช้งาน", icon: MessagesSquareIcon }, { value: "dev", label: <>เรื่องถึง Dev{openTickets > 0 && <span className="rounded-full bg-red-100 px-1.5 text-xs text-red-800 tabular-nums">{openTickets}</span>}</>, icon: CodeXmlIcon }]} />
      {tab === "dev" ? <DevTicketsView creating={newTicket} onCreated={() => setNewTicket(false)} /> : <>
      <KpiRow>
        <Kpi icon={MessagesSquareIcon} label="คำถามทั้งหมด" value={filtered.length} onClick={() => setStatus("")} active={!status} />
        <Kpi icon={CircleHelpIcon} label="ยังไม่มีคำตอบ" value={count("unanswered")} tone="red" valueClassName={count("unanswered") ? "text-red-700" : undefined} onClick={() => { setStatus(status === "unanswered" ? "" : "unanswered") }} active={status === "unanswered"} />
        <Kpi icon={SparklesIcon} label="Nock ตอบเอง" value={count("ai")} tone="sky" onClick={() => { setStatus(status === "ai" ? "" : "ai") }} active={status === "ai"} />
        <Kpi icon={BookOpenCheckIcon} label="คลังความรู้" value={count("answered")} tone="emerald" onClick={() => { setStatus(status === "answered" ? "" : "answered") }} active={status === "answered"}
          sub={votes.up + votes.down ? <span className="inline-flex items-center gap-1"><ThumbsUpIcon className="size-3 text-emerald-600" /> ช่วยได้ {Math.round((votes.up / (votes.up + votes.down)) * 100)}% ({votes.up + votes.down} โหวต)</span> : "ยังไม่มีโหวต"} />
      </KpiRow>

      <Toolbar>
        <ShowChip label="Done" on={showDone === "1"} count={filtered.filter((x) => x.status !== "unanswered").length} onChange={(v) => { setShowDone(v ? "1" : "0"); setStatus("") }} />
      </Toolbar>
      <FilterBar search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาคำถาม / คำตอบ / ผู้ถาม" />}>
        <NativeSelect className="h-9 w-36" value={role} onChange={(e) => setRole(e.target.value as Role | "")} placeholder="ทุก Role" options={ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))} />
        <NativeSelect className="h-9 w-44" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ทุก Part" options={NOCK_LOCATIONS.map((l) => ({ value: l.id, label: l.label }))} />
        <ColumnsMenu id="nock" columns={columns} />
        {scope.select}
      </FilterBar>

      <DataTable id="nock" columns={columns} rows={rows} rowKey={(x) => x.id} onRowClick={(x) => setOpen(x.id)} sort={sort} onSort={toggle} minWidth={900}
        empty={showDone === "0" ? "ไม่มีคำถามค้าง — Nock ตอบได้หมด" : "ไม่มีคำถามตามตัวกรอง"} />

      <EntityPanel open={!!open} onClose={() => setOpen(null)} wide>
        {open === "new" ? <CreatePanel onClose={() => setOpen(null)} /> : open && <QuestionPanel key={open} id={open} onClose={() => setOpen(null)} />}
      </EntityPanel>
      </>}
    </Page>
  )
}

function Chips<T extends string>({ all, value, onChange, emptyLabel }: { all: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; emptyLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {emptyLabel && <button type="button" aria-pressed={!value.length} onClick={() => onChange([])} className={cn("rounded-full border px-3 py-1 text-sm", !value.length ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{emptyLabel}</button>}
      {all.map((o) => {
        const on = value.includes(o.id)
        return <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{o.label}</button>
      })}
    </div>
  )
}
const ROLE_OPTS = ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r] }))

/** thumbs up (green) / down (red) with counts — press again to take your vote back */
function VoteButtons({ up, down, onVote, inline }: { up: ID[]; down: ID[]; onVote: (v: boolean | null) => Result; inline?: boolean }) {
  const me = useStore((s) => s.me())
  const mine = up.includes(me.id) ? true : down.includes(me.id) ? false : null
  const btns = (
    <>
      <Button size="xs" variant="outline" className={cn(mine === true && "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950")} onClick={() => report(onVote(mine === true ? null : true), mine === true ? "ยกเลิกโหวตแล้ว" : "โหวตว่าช่วยได้")}>
        <ThumbsUpIcon className="text-emerald-600" /> {up.length}
      </Button>
      <Button size="xs" variant="outline" className={cn(mine === false && "border-red-500 bg-red-50 text-red-800 dark:bg-red-950")} onClick={() => report(onVote(mine === false ? null : false), mine === false ? "ยกเลิกโหวตแล้ว" : "โหวตว่าไม่ช่วย")}>
        <ThumbsDownIcon className="text-red-600" /> {down.length}
      </Button>
    </>
  )
  return inline ? btns : <div className="flex gap-1.5 pt-1">{btns}</div>
}

/** one person's answer: text, who, when, who may be told it, thumbs — its writer can edit / remove it */
function AnswerCard({ q, a, used, onEdit }: { q: NockQuestion; a: NockAnswer; used: boolean; onEdit: () => void }) {
  const me = useStore((s) => s.me())
  const staff = useStore((s) => s.staff)
  const vote = useStore((s) => s.voteNockAnswer)
  const remove = useStore((s) => s.deleteNockAnswer)
  const mine = a.by === me.id
  const rate = helpfulRate(a)
  return (
    <section className={cn("space-y-2 rounded-2xl p-3 ring-1", used ? "bg-emerald-50/70 ring-emerald-300 dark:bg-emerald-950/30 dark:ring-emerald-900" : "bg-card ring-foreground/10")}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-medium">{staff.find((s) => s.id === a.by)?.nickname ?? "—"}{mine && " (คุณ)"}</span>
        <span className="text-muted-foreground">{fmtDate(toDateStr(new Date(a.at)))} {timeOf(a.at)} น.</span>
        {used && <Pill tone="green"><StarIcon className="size-3" /> Nock ใช้คำตอบนี้</Pill>}
        <span className="ml-auto text-muted-foreground">บอก: {a.audience.length ? a.audience.map((r) => ROLE_LABEL[r]).join(", ") : "ทุกคน"}</span>
      </div>
      <p className="text-sm whitespace-pre-line">{a.text}</p>
      <ImageGallery images={a.images} size="sm" />
      <div className="flex flex-wrap items-center gap-1.5">
        <VoteButtons up={a.votesUp} down={a.votesDown} onVote={(v) => vote(q.id, a.id, v)} inline />
        {rate !== null && <span className={cn("text-xs font-medium", rate >= 0.7 ? "text-emerald-700" : rate >= 0.4 ? "text-amber-700" : "text-red-700")}>ช่วยได้ {Math.round(rate * 100)}%</span>}
        {mine && (
          <span className="ml-auto flex gap-1">
            <Button size="xs" variant="ghost" onClick={onEdit}><PencilIcon /> แก้</Button>
            <Button size="xs" variant="ghost" className="text-red-700" onClick={() => report(remove(q.id, a.id), "ลบคำตอบแล้ว")}><TrashIcon /> ลบ</Button>
          </span>
        )}
      </div>
    </section>
  )
}

function QuestionPanel({ id, onClose }: { id: ID; onClose: () => void }) {
  const me = useStore((s) => s.me())
  const x = useStore((s) => s.nockQuestions.find((q) => q.id === id))
  const staff = useStore((s) => s.staff)
  const branches = useStore((s) => s.branches)
  const answerQ = useStore((s) => s.answerNockQuestion)
  const editA = useStore((s) => s.editNockAnswer)
  const removeQ = useStore((s) => s.deleteNockQuestion)
  const voteAi = useStore((s) => s.voteNockAi)
  const mineA = x?.answers?.find((a) => a.by === me.id)
  // null = viewing · "new" = writing my answer · an id = editing my answer
  const [mode, setMode] = useState<null | "new" | ID>(null)
  const [text, setText] = useState("")
  const [audience, setAudience] = useState<Role[]>([])
  const [images, setImages] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>(x?.locations ?? [])
  if (!x) return null
  const answerer = canAnswerNock(me)
  const who = (sid?: ID) => staff.find((s) => s.id === sid)?.nickname ?? "—"
  const used = bestAnswer(x, answerer ? undefined : me.roles)
  const answers = (x.answers ?? []).filter((a) => answerer || visibleAnswer(a, me.roles)).slice().sort((a, b) => answerScore(b) - answerScore(a) || a.at.localeCompare(b.at))
  const startNew = () => { setText(answers.length ? "" : x.aiAnswer ?? ""); setAudience([]); setImages([]); setMode("new") }
  const startEdit = (a: NockAnswer) => { setText(a.text); setAudience(a.audience); setImages(a.images ?? []); setMode(a.id) }
  const save = () => {
    const ok = mode === "new" ? report(answerQ(x.id, text, { audience, locations, images }), answers.length ? "เพิ่มคำตอบของคุณแล้ว" : "ตอบแล้ว — เข้าคลังความรู้ของ Nock") : report(editA(x.id, mode!, text, audience, images), "แก้คำตอบแล้ว")
    if (ok) setMode(null)
  }
  return (
    <>
      {/* owner 2026-10-13: tidy — chips + question in the header, the facts as a label / value grid */}
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 pr-8"><Pill tone={STATUS_TONE[x.status]}>{NOCK_STATUS_LABEL[x.status]}</Pill>{x.helpful === false && <Pill tone="red"><ThumbsDownIcon className="size-3" /> คนถามบอกว่า Nock ตอบไม่ตรง</Pill>}</div>
        <SheetTitle className="text-lg leading-snug">{x.question}</SheetTitle>
      </SheetHeader>
      <PanelBody>
        <MetaGrid rows={[
          [x.manual ? "เขียนโดย" : "ถามโดย", <><b>{who(x.askedBy)}</b>{x.roles.map((r) => <RoleChip key={r} role={r} />)}</>],
          ...(x.manual ? [] : [["สาขา", branches.find((b) => b.id === x.branchId)?.name ?? "—"] as [string, React.ReactNode]]),
          ["วันที่", `${fmtDate(toDateStr(new Date(x.at)), { weekday: true, year: true })} · ${timeOf(x.at)} น.`],
          ["Part", <>{(x.locations ?? []).map((l) => <span key={l} className="rounded-full bg-background px-2 py-0.5 text-xs ring-1 ring-foreground/10">{locationLabel(l)}</span>)}</>],
        ]} />
        <ImageGallery images={x.images} />
        {!x.manual && (
          <section className="space-y-1.5 rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900">
            <p className="flex items-center gap-1.5 text-xs font-medium text-sky-800 dark:text-sky-200"><SparklesIcon className="size-3.5" /> Nock ตอบ{x.aiSource && ` · จาก${x.aiSource === "ai" ? " AI" : x.aiSource === "knowledge" ? "คลังความรู้" : "คู่มือระบบ"}`}</p>
            <p className="text-sm whitespace-pre-line">{x.aiAnswer || "Nock ไม่รู้คำตอบ"}</p>
            {x.aiAnswer && <VoteButtons up={x.aiVotesUp ?? []} down={x.aiVotesDown ?? []} onVote={(v) => voteAi(x.id, v)} />}
          </section>
        )}
        {answers.length > 0 && <p className="text-sm font-semibold">คำตอบจากทีม ({answers.length}){answers.length > 1 && <span className="ml-1 font-normal text-muted-foreground">— โหวตขึ้น / ลง เลือกว่า Nock ใช้คำตอบไหน</span>}</p>}
        {answers.map((a) => mode === a.id ? null : <AnswerCard key={a.id} q={x} a={a} used={a.id === used?.id} onEdit={() => startEdit(a)} />)}
        {mode && (
          <section className="space-y-3 rounded-2xl bg-muted/40 p-3">
            <Field label={mode === "new" ? "คำตอบของคุณ" : "แก้คำตอบของคุณ"} hint="คำตอบเข้าคลังความรู้ — Nock ใช้ตอบคนต่อไป · เขียนว่าทำที่หน้าไหน กดอะไร ใครทำได้">
              <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น เปิด Panel นักเรียน › ⋯ › …" />
            </Field>
            <Field label="รูปประกอบ (ไม่บังคับ)" hint="ภาพหน้าจอขั้นตอน — คนที่เปิดดูกดดูรูปเต็มได้"><ImageAttach value={images} onChange={setImages} /></Field>
            {mode === "new" && <Field label="Part (เลือกได้หลายส่วน)" hint="Part = ส่วนของระบบที่คำถามนี้เกี่ยวข้อง"><Chips all={NOCK_LOCATIONS} value={locations} onChange={setLocations} /></Field>}
            <Field label="ใครเห็นคำตอบนี้" hint="ทุกคน = Nock บอกได้ทุกบทบาท · เลือกบทบาท = บอกเฉพาะบทบาทนั้น"><Chips all={ROLE_OPTS} value={audience} onChange={setAudience} emptyLabel="ทุกคน" /></Field>
          </section>
        )}
      </PanelBody>
      {answerer && (
        <PanelFooter>
          <PanelMore items={[{ label: "ลบคำถามนี้", icon: TrashIcon, destructive: true, onClick: () => { if (report(removeQ(x.id), "ลบแล้ว")) onClose() } }]} />
          {mode ? (
            <>
              <Button variant="ghost" className="ml-auto" onClick={() => setMode(null)}>ยกเลิก</Button>
              <Button disabled={!text.trim() || (mode === "new" && !locations.length)} onClick={save}><SaveIcon /> {mode === "new" ? (answers.length ? "เพิ่มคำตอบ" : "ตอบคำถาม") : "บันทึก"}</Button>
            </>
          ) : mineA ? (
            <Button className="ml-auto" variant="outline" onClick={() => startEdit(mineA)}><PencilIcon /> แก้คำตอบของฉัน</Button>
          ) : (
            <Button className="ml-auto" onClick={startNew}><PlusIcon /> {answers.length ? "เพิ่มคำตอบของฉัน" : "ตอบคำถาม"}</Button>
          )}
        </PanelFooter>
      )}
    </>
  )
}

function CreatePanel({ onClose }: { onClose: () => void }) {
  const create = useStore((s) => s.createNockKnowledge)
  const [f, setF] = useState<{ question: string; answer: string; audience: Role[]; locations: string[]; questionImages: string[]; answerImages: string[] }>({ question: "", answer: "", audience: [], locations: [], questionImages: [], answerImages: [] })
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <SheetTitle className="flex items-center gap-1.5 text-lg">สร้างคลังความรู้<InfoTip text="เขียนความรู้ให้ Nock ล่วงหน้า โดยไม่ต้องรอมีคนถาม — เขียนคำถามแบบที่คนมักถาม และคำตอบเป็นขั้นตอน" /></SheetTitle>
      </SheetHeader>
      <PanelBody>
        <Field label="คำถาม"><Input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="เช่น ผู้ปกครองโอนเงินเกิน ต้องคืนยังไง" /></Field>
        <Field label="รูปประกอบคำถาม (ไม่บังคับ)" hint="เช่น ภาพหน้าจอที่คนมักสงสัย"><ImageAttach value={f.questionImages} onChange={(questionImages) => setF({ ...f, questionImages })} /></Field>
        <Field label="คำตอบ"><Textarea rows={8} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></Field>
        <Field label="รูปประกอบคำตอบ (ไม่บังคับ)" hint="เช่น ภาพหน้าจอขั้นตอน — คนที่เปิดดูกดดูรูปเต็มได้"><ImageAttach value={f.answerImages} onChange={(answerImages) => setF({ ...f, answerImages })} /></Field>
        <Field label="Part (เลือกได้หลายส่วน) *" hint="Part = ส่วนของระบบที่ความรู้นี้เกี่ยวข้อง"><Chips all={NOCK_LOCATIONS} value={f.locations} onChange={(locations) => setF({ ...f, locations })} /></Field>
        <Field label="ใครเห็นคำตอบนี้" hint="ทุกคน = Nock บอกได้ทุกบทบาท · เลือกบทบาท = บอกเฉพาะบทบาทนั้น"><Chips all={ROLE_OPTS} value={f.audience} onChange={(audience) => setF({ ...f, audience })} emptyLabel="ทุกคน" /></Field>
      </PanelBody>
      <PanelFooter>
        <Button className="ml-auto" disabled={!f.question.trim() || !f.answer.trim() || !f.locations.length} onClick={() => { if (report(create(f), "เพิ่มเข้าคลังความรู้แล้ว — Nock ใช้ได้ทันที")) onClose() }}><SaveIcon /> สร้าง</Button>
      </PanelFooter>
    </>
  )
}
