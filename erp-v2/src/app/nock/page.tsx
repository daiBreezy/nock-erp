"use client"

// คลังคำถาม Nock (owner 2026-10-13): one list — every question asked of Nock; once a person answers it, it IS Nock's
// knowledge. Who asked (role, branch), when, which part of the system (Location, chosen by the asker), answered or not,
// and 👍 / 👎 on each answer so the team can see which knowledge really helps.
import { useState } from "react"
import { BookOpenCheckIcon, CircleHelpIcon, MapPinIcon, MessagesSquareIcon, PlusIcon, SaveIcon, SparklesIcon, ThumbsDownIcon, ThumbsUpIcon, TrashIcon, UserRoundCheckIcon } from "lucide-react"
import { Pill, type Tone } from "@/components/app/badges"
import { BranchCode, useBranchScope } from "@/components/app/branch-scope"
import { HEAD } from "@/components/app/data-table"
import { EntityPanel, PanelBody, PanelFooter, PanelMore } from "@/components/app/form-shell"
import { InfoTip } from "@/components/app/info-tip"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { FilterBar, KpiRow, Page, PageHeader, SearchBox, Toolbar } from "@/components/app/page-layout"
import { usePeriod } from "@/components/app/period-control"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, toDateStr } from "@/domain/dates"
import { canAnswerNock, helpfulRate, knowledgeOf, locationLabel, NOCK_LOCATIONS, NOCK_STATUS_LABEL, visibleKnowledge } from "@/domain/rules/nock"
import { matchesQuery } from "@/domain/rules/people"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import type { ID, NockQuestion, NockStatus, Role } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const STATUS_TONE: Record<NockStatus, Tone> = { ai: "blue", unanswered: "red", answered: "green" }
const STATUS_SHORT: Record<NockStatus, string> = { ai: "Nock ตอบแล้ว", unanswered: "ยังไม่มีคำตอบ", answered: "คลังความรู้" }
const ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin", "teacher"]
const timeOf = (iso: string) => new Date(iso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })

export default function NockPage() {
  const me = useStore((s) => s.me())
  const all = useStore((s) => s.nockQuestions)
  const staff = useStore((s) => s.staff)
  const answerer = canAnswerNock(me)
  const scope = useBranchScope()
  const period = usePeriod("month")
  const [status, setStatus] = useQueryState<NockStatus | "">("status", "")
  const [location, setLocation] = useQueryState<string>("location", "")
  const [asker, setAsker] = useState("")
  const [q, setQ] = useState("")
  const [open, setOpen] = useState<ID | "new" | null>(null)

  // answerers see the whole bank; everyone else sees their own questions + the knowledge they may be told
  const visible = all.filter((x) => answerer || x.askedBy === me.id || (x.status === "answered" && visibleKnowledge(x, me.roles)))
  const inScope = visible.filter((x) => scope.ids.includes(x.branchId) || x.manual)
  const inRange = inScope.filter((x) => { const d = toDateStr(new Date(x.at)); return d >= period.from && d <= period.to })
  const filtered = inRange
    .filter((x) => !asker || x.askedBy === asker)
    .filter((x) => !location || (x.locations ?? []).includes(location))
    .filter((x) => !q || matchesQuery(q, [x.question, x.aiAnswer, x.answer, staff.find((s) => s.id === x.askedBy)?.nickname]))
  const shown = filtered.filter((x) => !status || x.status === status)
  const count = (st: NockStatus) => filtered.filter((x) => x.status === st).length
  const kb = knowledgeOf(filtered)
  const votes = kb.reduce((a, k) => ({ up: a.up + (k.votesUp?.length ?? 0), down: a.down + (k.votesDown?.length ?? 0) }), { up: 0, down: 0 })
  const who = (id?: ID) => staff.find((s) => s.id === id)
  const askers = [...new Set(inScope.map((x) => x.askedBy))].map((id) => who(id)).filter((s): s is NonNullable<typeof s> => !!s)

  return (
    <Page>
      <PageHeader title={<span className="flex items-center gap-2">คลังคำถาม Nock <InfoTip text="ทุกคำถามที่ถาม Nock · คำถามที่ทีมตอบแล้ว = คลังความรู้ที่ Nock ใช้ตอบคนต่อไป · คำถามที่ Nock ตอบไม่ได้ (หรือคนถามกด 👎 / ส่งให้ทีม) รอ Super Admin / Director / Area Manager / Manager ตอบ · 👍 / 👎 บอกว่าความรู้เรื่องนั้นช่วยได้จริงไหม" /></span>}
        description={answerer ? "ตอบคำถามที่ Nock ยังไม่รู้ — ตอบแล้วกลายเป็นคลังความรู้" : "คำถามของคุณ และคลังความรู้ที่ทีมตอบไว้"}
        actions={answerer && <Button onClick={() => setOpen("new")}><PlusIcon /> สร้างคลังความรู้</Button>} />
      <KpiRow>
        <Kpi icon={MessagesSquareIcon} label="คำถามทั้งหมด" value={filtered.length} onClick={() => setStatus("")} active={!status} />
        <Kpi icon={CircleHelpIcon} label="ยังไม่มีคำตอบ" value={count("unanswered")} tone="red" valueClassName={count("unanswered") ? "text-red-700" : undefined} onClick={() => setStatus(status === "unanswered" ? "" : "unanswered")} active={status === "unanswered"} />
        <Kpi icon={SparklesIcon} label="Nock ตอบเอง" value={count("ai")} tone="sky" onClick={() => setStatus(status === "ai" ? "" : "ai")} active={status === "ai"} />
        <Kpi icon={BookOpenCheckIcon} label="คลังความรู้" value={count("answered")} tone="emerald" sub={votes.up + votes.down ? `👍 ${Math.round((votes.up / (votes.up + votes.down)) * 100)}% ช่วยได้ (${votes.up + votes.down} โหวต)` : "ยังไม่มีโหวต"} onClick={() => setStatus(status === "answered" ? "" : "answered")} active={status === "answered"} />
      </KpiRow>

      <Toolbar>{period.control}</Toolbar>
      <FilterBar search={<SearchBox value={q} onChange={setQ} placeholder="ค้นหาคำถาม / คำตอบ / ผู้ถาม" />}>
        <NativeSelect className="h-9 w-36" value={asker} onChange={(e) => setAsker(e.target.value)} placeholder="Staff ทุกคน" options={askers.map((s) => ({ value: s.id, label: s.nickname }))} />
        <NativeSelect className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value as NockStatus | "")} placeholder="ทุกสถานะ" options={(Object.keys(STATUS_SHORT) as NockStatus[]).map((k) => ({ value: k, label: STATUS_SHORT[k] }))} />
        <NativeSelect className="h-9 w-44" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="ทุก Location" options={NOCK_LOCATIONS.map((l) => ({ value: l.id, label: l.label }))} />
        {scope.select}
      </FilterBar>

      <div className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className={HEAD}>
            <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
              <th className="w-28">วันที่ · เวลา</th><th>คำถาม</th><th className="w-40">Location</th><th className="w-28">ผู้ถาม</th><th className="w-32">Role</th><th className="w-20">สาขา</th><th className="w-24">👍 / 👎</th><th className="w-32">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">{status === "unanswered" ? "ไม่มีคำถามค้าง — Nock ตอบได้หมด" : "ไม่มีคำถามตามตัวกรอง"}</td></tr>}
            {shown.map((x) => {
              const a = who(x.askedBy)
              return (
                <tr key={x.id} onClick={() => setOpen(x.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5">
                  <td className="whitespace-nowrap tabular-nums"><span className="block">{fmtDate(toDateStr(new Date(x.at)))}</span><span className="text-xs text-muted-foreground">{timeOf(x.at)} น.</span></td>
                  <td>
                    <span className="line-clamp-1 font-medium">{x.question}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{x.answer ? `ทีม: ${x.answer}` : x.aiAnswer ? `Nock: ${x.aiAnswer}` : "—"}</span>
                  </td>
                  <td><span className="flex flex-wrap gap-1">{(x.locations ?? []).map((l) => <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-xs whitespace-nowrap">{locationLabel(l)}</span>)}</span></td>
                  <td className="whitespace-nowrap font-medium">{a?.nickname ?? "—"}</td>
                  <td className="text-xs text-muted-foreground">{x.roles.map((r) => ROLE_LABEL[r]).join(", ")}</td>
                  <td>{x.manual ? <span className="text-xs text-muted-foreground">—</span> : <BranchCode code={scope.code(x.branchId)} />}</td>
                  <td className="whitespace-nowrap text-xs tabular-nums">
                    {x.status === "answered" ? <><span className="text-emerald-700">👍 {x.votesUp?.length ?? 0}</span> <span className="ml-1 text-red-700">👎 {x.votesDown?.length ?? 0}</span></>
                      : x.helpful === false ? <span className="text-red-700">👎 คำตอบ Nock</span> : x.helpful ? <span className="text-emerald-700">👍 คำตอบ Nock</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td><Pill tone={STATUS_TONE[x.status]}>{STATUS_SHORT[x.status]}</Pill></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <EntityPanel open={!!open} onClose={() => setOpen(null)}>
        {open === "new" ? <CreatePanel onClose={() => setOpen(null)} /> : open && <QuestionPanel key={open} id={open} onClose={() => setOpen(null)} />}
      </EntityPanel>
    </Page>
  )
}

function Chips<T extends string>({ all, value, onChange, label, emptyLabel }: { all: { id: T; label: string }[]; value: T[]; onChange: (v: T[]) => void; label?: string; emptyLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-label={label}>
      {emptyLabel && <button type="button" aria-pressed={!value.length} onClick={() => onChange([])} className={cn("rounded-full border px-3 py-1 text-sm", !value.length ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{emptyLabel}</button>}
      {all.map((o) => {
        const on = value.includes(o.id)
        return <button key={o.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.id) : [...value, o.id])} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{o.label}</button>
      })}
    </div>
  )
}
const ROLE_OPTS = ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r] }))

function Votes({ k }: { k: NockQuestion }) {
  const me = useStore((s) => s.me())
  const vote = useStore((s) => s.voteNockKnowledge)
  const mine = k.votesUp?.includes(me.id) ? true : k.votesDown?.includes(me.id) ? false : null
  const rate = helpfulRate(k)
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-muted/50 p-2.5 text-sm">
      <span className="text-muted-foreground">ความรู้นี้ช่วยได้ไหม?</span>
      <Button size="sm" variant={mine === true ? "default" : "outline"} onClick={() => report(vote(k.id, mine === true ? null : true), mine === true ? "ยกเลิกโหวตแล้ว" : "ขอบคุณที่บอก")}><ThumbsUpIcon /> {k.votesUp?.length ?? 0}</Button>
      <Button size="sm" variant={mine === false ? "destructive" : "outline"} onClick={() => report(vote(k.id, mine === false ? null : false), mine === false ? "ยกเลิกโหวตแล้ว" : "รับทราบ — ทีมจะปรับคำตอบ")}><ThumbsDownIcon /> {k.votesDown?.length ?? 0}</Button>
      {rate !== null && <span className={cn("ml-auto text-xs font-medium", rate >= 0.7 ? "text-emerald-700" : rate >= 0.4 ? "text-amber-700" : "text-red-700")}>ช่วยได้ {Math.round(rate * 100)}%</span>}
    </div>
  )
}

function QuestionPanel({ id, onClose }: { id: ID; onClose: () => void }) {
  const me = useStore((s) => s.me())
  const x = useStore((s) => s.nockQuestions.find((q) => q.id === id))
  const staff = useStore((s) => s.staff)
  const branches = useStore((s) => s.branches)
  const answerQ = useStore((s) => s.answerNockQuestion)
  const remove = useStore((s) => s.deleteNockQuestion)
  const [answer, setAnswer] = useState(x?.answer ?? "")
  const [audience, setAudience] = useState<Role[]>(x?.audience ?? [])
  const [locations, setLocations] = useState<string[]>(x?.locations ?? [])
  const [editing, setEditing] = useState(x?.status !== "answered")
  if (!x) return null
  const answerer = canAnswerNock(me)
  const who = (sid?: ID) => staff.find((s) => s.id === sid)?.nickname ?? "—"
  const branch = branches.find((b) => b.id === x.branchId)
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex flex-wrap items-center gap-1.5 pr-8"><Pill tone={STATUS_TONE[x.status]}>{NOCK_STATUS_LABEL[x.status]}</Pill>{x.helpful === false && <Pill tone="red">คนถามกด 👎 คำตอบของ Nock</Pill>}</div>
        <SheetTitle className="text-lg">{x.question}</SheetTitle>
        <SheetDescription>
          {x.manual ? `เขียนเข้าคลังโดย ${who(x.askedBy)}` : <>ถามโดย <b className="text-foreground">{who(x.askedBy)}</b> · {x.roles.map((r) => ROLE_LABEL[r]).join(", ")} · สาขา{branch?.name ?? "—"}</>} · {fmtDate(toDateStr(new Date(x.at)), { weekday: true })} {timeOf(x.at)} น.
        </SheetDescription>
        <div className="flex flex-wrap items-center gap-1"><MapPinIcon className="size-3.5 text-muted-foreground" />{(x.locations ?? []).map((l) => <span key={l} className="rounded-full bg-muted px-2 py-0.5 text-xs">{locationLabel(l)}</span>)}</div>
      </SheetHeader>
      <PanelBody>
        {!x.manual && (
          <section className="space-y-1.5 rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900">
            <p className="flex items-center gap-1.5 text-xs font-medium text-sky-800 dark:text-sky-200"><SparklesIcon className="size-3.5" /> Nock ตอบ{x.aiSource && ` · จาก${x.aiSource === "ai" ? " AI" : x.aiSource === "knowledge" ? "คลังความรู้" : "คู่มือระบบ"}`}</p>
            <p className="text-sm whitespace-pre-line">{x.aiAnswer || "Nock ไม่รู้คำตอบ"}</p>
          </section>
        )}
        {x.status === "answered" && !editing && (
          <>
            <section className="space-y-1 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900">
              <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"><UserRoundCheckIcon className="size-3.5" /> คำตอบในคลังความรู้ · {who(x.answeredBy)}{x.answeredAt && ` · ${fmtDate(toDateStr(new Date(x.answeredAt)))}`}</p>
              <p className="text-sm whitespace-pre-line">{x.answer}</p>
              <p className="text-xs text-muted-foreground">Nock บอกคำตอบนี้กับ: {x.audience?.length ? x.audience.map((r) => ROLE_LABEL[r]).join(", ") : "ทุกคน"}</p>
            </section>
            <Votes k={x} />
          </>
        )}
        {answerer && editing && (
          <>
            <Field label="คำตอบของทีม" hint="ตอบแล้วคำถามนี้กลายเป็นคลังความรู้ — Nock ใช้ตอบคนต่อไปที่ถามคล้ายกัน · เขียนว่าทำที่หน้าไหน กดอะไร ใครทำได้">
              <Textarea rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="เช่น เปิด Panel นักเรียน › ⋯ › …" />
            </Field>
            {x.aiAnswer && !answer && <Button size="xs" variant="outline" onClick={() => setAnswer(x.aiAnswer!)}>ใช้คำตอบของ Nock</Button>}
            <Field label="Location (เลือกได้หลายส่วน)" hint="ส่วนของระบบที่คำตอบนี้เกี่ยวข้อง — Nock ใช้ช่วยหาความรู้ที่ตรงเรื่อง"><Chips all={NOCK_LOCATIONS} value={locations} onChange={setLocations} /></Field>
            <Field label="ใครเห็นคำตอบนี้" hint="ทุกคน = Nock บอกได้ทุกบทบาท · เลือกบทบาท = บอกเฉพาะบทบาทนั้น (เช่น เรื่องนโยบายราคาบอกแค่ Manager ขึ้นไป)"><Chips all={ROLE_OPTS} value={audience} onChange={setAudience} emptyLabel="ทุกคน" /></Field>
          </>
        )}
      </PanelBody>
      {answerer && (
        <PanelFooter>
          <PanelMore items={[{ label: "ลบคำถามนี้", icon: TrashIcon, destructive: true, onClick: () => { if (report(remove(x.id), "ลบแล้ว")) onClose() } }]} />
          {editing ? (
            <>
              {x.status === "answered" && <Button variant="ghost" className="ml-auto" onClick={() => setEditing(false)}>ยกเลิก</Button>}
              <Button className={x.status === "answered" ? undefined : "ml-auto"} disabled={!answer.trim() || !locations.length} onClick={() => { if (report(answerQ(x.id, answer, { audience, locations }), x.status === "answered" ? "บันทึกคำตอบแล้ว" : "ตอบแล้ว — เข้าคลังความรู้ของ Nock")) setEditing(false) }}>
                <SaveIcon /> {x.status === "answered" ? "บันทึก" : "ตอบคำถาม"}
              </Button>
            </>
          ) : <Button className="ml-auto" variant="outline" onClick={() => setEditing(true)}>แก้คำตอบ</Button>}
        </PanelFooter>
      )}
    </>
  )
}

function CreatePanel({ onClose }: { onClose: () => void }) {
  const create = useStore((s) => s.createNockKnowledge)
  const [f, setF] = useState<{ question: string; answer: string; audience: Role[]; locations: string[] }>({ question: "", answer: "", audience: [], locations: [] })
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <SheetTitle className="flex items-center gap-1.5 text-lg">สร้างคลังความรู้<InfoTip text="เขียนความรู้ให้ Nock ล่วงหน้า โดยไม่ต้องรอมีคนถาม — เขียนคำถามแบบที่คนมักถาม และคำตอบเป็นขั้นตอน" /></SheetTitle>
      </SheetHeader>
      <PanelBody>
        <Field label="คำถาม"><Input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="เช่น ผู้ปกครองโอนเงินเกิน ต้องคืนยังไง" /></Field>
        <Field label="คำตอบ"><Textarea rows={8} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></Field>
        <Field label="Location (เลือกได้หลายส่วน) *" hint="ส่วนของระบบที่ความรู้นี้เกี่ยวข้อง"><Chips all={NOCK_LOCATIONS} value={f.locations} onChange={(locations) => setF({ ...f, locations })} /></Field>
        <Field label="ใครเห็นคำตอบนี้" hint="ทุกคน = Nock บอกได้ทุกบทบาท · เลือกบทบาท = บอกเฉพาะบทบาทนั้น"><Chips all={ROLE_OPTS} value={f.audience} onChange={(audience) => setF({ ...f, audience })} emptyLabel="ทุกคน" /></Field>
      </PanelBody>
      <PanelFooter>
        <Button className="ml-auto" disabled={!f.question.trim() || !f.answer.trim() || !f.locations.length} onClick={() => { if (report(create(f), "เพิ่มเข้าคลังความรู้แล้ว — Nock ใช้ได้ทันที")) onClose() }}><SaveIcon /> สร้าง</Button>
      </PanelFooter>
    </>
  )
}
