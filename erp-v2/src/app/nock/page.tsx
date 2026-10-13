"use client"

// คลังคำถาม Nock (owner 2026-10-13): every question anyone asked Nock. The team answers the ones Nock couldn't; an
// answer goes into Nock's knowledge, so the next person who asks something like it gets it straight away.
import Link from "next/link"
import { useState } from "react"
import { BookOpenCheckIcon, CircleHelpIcon, MessagesSquareIcon, PlusIcon, SaveIcon, SparklesIcon, TrashIcon, UserRoundCheckIcon } from "lucide-react"
import { Pill, type Tone } from "@/components/app/badges"
import { HEAD } from "@/components/app/data-table"
import { EntityPanel, PanelBody, PanelFooter, PanelMore } from "@/components/app/form-shell"
import { InfoTip } from "@/components/app/info-tip"
import { Kpi } from "@/components/app/kpi"
import { NativeSelect } from "@/components/app/native-select"
import { FilterBar, KpiRow, Page, PageHeader, SearchBox, Tabs } from "@/components/app/page-layout"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { fmtDateTime } from "@/domain/dates"
import { canAnswerNock, NOCK_STATUS_LABEL } from "@/domain/rules/nock"
import { matchesQuery } from "@/domain/rules/people"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import type { ID, NockKnowledge, NockStatus, Role } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const STATUS_TONE: Record<NockStatus, Tone> = { ai: "blue", unanswered: "red", answered: "green" }
const ROLES: Role[] = ["super_admin", "director", "area_manager", "manager", "admin", "teacher"]

export default function NockPage() {
  const me = useStore((s) => s.me())
  const questions = useStore((s) => s.nockQuestions)
  const knowledge = useStore((s) => s.nockKnowledge)
  const staff = useStore((s) => s.staff)
  const answerer = canAnswerNock(me)
  const [tab, setTab] = useQueryState<"questions" | "knowledge">("tab", "questions")
  const [status, setStatus] = useQueryState<NockStatus | "">("status", answerer ? "unanswered" : "")
  const [q, setQ] = useState("")
  const [openQ, setOpenQ] = useState<ID | null>(null)
  const [openK, setOpenK] = useState<ID | "new" | null>(null)

  // answerers see the whole bank; everyone else sees their own questions
  const scoped = answerer ? questions : questions.filter((x) => x.askedBy === me.id)
  const who = (id?: ID) => staff.find((s) => s.id === id)?.nickname ?? "—"
  const count = (st: NockStatus) => scoped.filter((x) => x.status === st).length
  const shownQ = scoped
    .filter((x) => !status || x.status === status)
    .filter((x) => !q || matchesQuery(q, [x.question, x.aiAnswer, x.answer, who(x.askedBy)]))
  const shownK = knowledge.filter((k) => !q || matchesQuery(q, [k.question, k.answer]))

  return (
    <Page>
      <PageHeader title={<span className="flex items-center gap-2">คลังคำถาม Nock <InfoTip text="ทุกคำถามที่ถาม Nock อยู่ที่นี่ · คำถามที่ Nock ตอบไม่ได้ (หรือคนถามกด 👎 / ส่งให้ทีม) รอให้ Super Admin / Director / Area Manager / Manager ตอบ · คำตอบเข้าคลังความรู้ แล้ว Nock ใช้ตอบคนต่อไป" /></span>}
        description={answerer ? "ตอบคำถามที่ Nock ยังไม่รู้ — Nock เรียนรู้จากคำตอบของทีม" : "คำถามที่คุณถาม Nock และคำตอบ"}
        actions={answerer && tab === "knowledge" && <Button onClick={() => setOpenK("new")}><PlusIcon /> เพิ่มความรู้</Button>} />
      <KpiRow className="lg:grid-cols-4">
        <Kpi icon={MessagesSquareIcon} label="คำถามทั้งหมด" value={scoped.length} onClick={() => { setTab("questions"); setStatus("") }} active={tab === "questions" && !status} />
        <Kpi icon={CircleHelpIcon} label="ยังไม่มีคำตอบ" value={count("unanswered")} tone="red" valueClassName={count("unanswered") ? "text-red-700" : undefined} onClick={() => { setTab("questions"); setStatus(status === "unanswered" ? "" : "unanswered") }} active={tab === "questions" && status === "unanswered"} />
        <Kpi icon={SparklesIcon} label="Nock ตอบเอง" value={count("ai")} tone="sky" onClick={() => { setTab("questions"); setStatus(status === "ai" ? "" : "ai") }} active={tab === "questions" && status === "ai"} />
        <Kpi icon={BookOpenCheckIcon} label="คลังความรู้ของ Nock" value={knowledge.length} tone="emerald" sub={`ทีมตอบแล้ว ${count("answered")} คำถาม`} onClick={() => setTab("knowledge")} active={tab === "knowledge"} />
      </KpiRow>

      <Tabs value={tab} onChange={setTab} options={[{ value: "questions", label: "คำถาม", icon: MessagesSquareIcon }, { value: "knowledge", label: "คลังความรู้", icon: BookOpenCheckIcon }]} />
      <FilterBar search={<SearchBox value={q} onChange={setQ} placeholder={tab === "questions" ? "ค้นหาคำถาม / คำตอบ / ผู้ถาม" : "ค้นหาความรู้"} />}>
        {tab === "questions" && <NativeSelect className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value as NockStatus | "")} placeholder="ทุกสถานะ" options={(Object.keys(NOCK_STATUS_LABEL) as NockStatus[]).map((k) => ({ value: k, label: NOCK_STATUS_LABEL[k] }))} />}
      </FilterBar>

      {tab === "questions" ? (
        <div className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
          <table className="w-full min-w-[760px] text-sm">
            <thead className={HEAD}>
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                <th className="w-36">เวลา</th><th>คำถาม</th><th className="w-36">ผู้ถาม</th><th className="w-28">หน้า</th><th className="w-36">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {shownQ.length === 0 && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">{status === "unanswered" ? "ไม่มีคำถามค้าง — Nock ตอบได้หมด" : "ยังไม่มีคำถาม"}</td></tr>}
              {shownQ.map((x) => (
                <tr key={x.id} onClick={() => setOpenQ(x.id)} className="cursor-pointer border-b last:border-0 hover:bg-muted/40 [&>td]:px-3 [&>td]:py-2.5">
                  <td className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">{fmtDateTime(x.at)}</td>
                  <td>
                    <span className="line-clamp-1 font-medium">{x.question}</span>
                    <span className="line-clamp-1 text-xs text-muted-foreground">{x.answer ? `ทีม: ${x.answer}` : x.aiAnswer ? `Nock: ${x.aiAnswer}` : "—"}</span>
                  </td>
                  <td className="whitespace-nowrap">{who(x.askedBy)} <span className="text-xs text-muted-foreground">{x.roles.map((r) => ROLE_LABEL[r]).join(", ")}</span></td>
                  <td className="text-xs text-muted-foreground">{x.page}</td>
                  <td><Pill tone={STATUS_TONE[x.status]}>{NOCK_STATUS_LABEL[x.status]}</Pill>{x.helpful === false && <span className="ml-1 text-xs text-red-700">👎</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
          <table className="w-full min-w-[760px] text-sm">
            <thead className={HEAD}>
              <tr className="[&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:font-medium">
                <th>คำถาม · คำตอบ</th><th className="w-44">ใครเห็น</th><th className="w-24 text-right!">ใช้ตอบแล้ว</th><th className="w-40">แก้ล่าสุด</th>
              </tr>
            </thead>
            <tbody>
              {shownK.length === 0 && <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">ยังไม่มีความรู้ — ตอบคำถามในแท็บคำถาม แล้วคำตอบจะเข้ามาที่นี่</td></tr>}
              {shownK.map((k) => (
                <tr key={k.id} onClick={() => answerer && setOpenK(k.id)} className={cn("border-b last:border-0 [&>td]:px-3 [&>td]:py-2.5", answerer && "cursor-pointer hover:bg-muted/40")}>
                  <td><span className="line-clamp-1 font-medium">{k.question}</span><span className="line-clamp-2 text-xs text-muted-foreground">{k.answer}</span></td>
                  <td className="text-xs">{k.roles.length ? k.roles.map((r) => ROLE_LABEL[r]).join(", ") : "ทุกคน"}</td>
                  <td className="text-right tabular-nums">{k.uses}</td>
                  <td className="text-xs whitespace-nowrap text-muted-foreground">{fmtDateTime(k.updatedAt)} · {who(k.createdBy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EntityPanel open={!!openQ} onClose={() => setOpenQ(null)}>
        {openQ && <QuestionPanel key={openQ} id={openQ} onClose={() => setOpenQ(null)} />}
      </EntityPanel>
      <EntityPanel open={!!openK} onClose={() => setOpenK(null)}>
        {openK && <KnowledgePanel key={openK} id={openK} onClose={() => setOpenK(null)} />}
      </EntityPanel>
    </Page>
  )
}

function RolePicker({ value, onChange }: { value: Role[]; onChange: (r: Role[]) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button" aria-pressed={!value.length} onClick={() => onChange([])} className={cn("rounded-full border px-3 py-1 text-sm", !value.length ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>ทุกคน</button>
      {ROLES.map((r) => {
        const on = value.includes(r)
        return <button key={r} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== r) : [...value, r])} className={cn("rounded-full border px-3 py-1 text-sm", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{ROLE_LABEL[r]}</button>
      })}
    </div>
  )
}

function QuestionPanel({ id, onClose }: { id: ID; onClose: () => void }) {
  const me = useStore((s) => s.me())
  const x = useStore((s) => s.nockQuestions.find((q) => q.id === id))
  const staff = useStore((s) => s.staff)
  const knowledge = useStore((s) => s.nockKnowledge)
  const answerQ = useStore((s) => s.answerNockQuestion)
  const k = knowledge.find((kk) => kk.id === x?.knowledgeId)
  const [answer, setAnswer] = useState(x?.answer ?? "")
  const [roles, setRoles] = useState<Role[]>(k?.roles ?? [])
  const [toKnowledge, setToKnowledge] = useState(true)
  if (!x) return null
  const answerer = canAnswerNock(me)
  const who = (sid?: ID) => staff.find((s) => s.id === sid)?.nickname ?? "—"
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <div className="flex items-center gap-2 pr-8"><Pill tone={STATUS_TONE[x.status]}>{NOCK_STATUS_LABEL[x.status]}</Pill>{x.helpful === false && <Pill tone="red">คนถามกด 👎</Pill>}</div>
        <SheetTitle className="text-lg">{x.question}</SheetTitle>
        <SheetDescription>ถามโดย {who(x.askedBy)} ({x.roles.map((r) => ROLE_LABEL[r]).join(", ")}) · {fmtDateTime(x.at)} · จากหน้า <Link href={x.page} className="underline">{x.page}</Link></SheetDescription>
      </SheetHeader>
      <PanelBody>
        <section className="space-y-1.5 rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:ring-sky-900">
          <p className="flex items-center gap-1.5 text-xs font-medium text-sky-800 dark:text-sky-200"><SparklesIcon className="size-3.5" /> Nock ตอบ{x.aiSource && ` · จาก${x.aiSource === "ai" ? " AI" : x.aiSource === "knowledge" ? "คลังความรู้" : "คู่มือระบบ"}`}</p>
          <p className="text-sm whitespace-pre-line">{x.aiAnswer || "Nock ไม่รู้คำตอบ"}</p>
        </section>
        {x.status === "answered" && !answerer && (
          <section className="space-y-1 rounded-2xl bg-emerald-50 p-3 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:ring-emerald-900">
            <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"><UserRoundCheckIcon className="size-3.5" /> ตอบโดย {who(x.answeredBy)} · {x.answeredAt && fmtDateTime(x.answeredAt)}</p>
            <p className="text-sm whitespace-pre-line">{x.answer}</p>
          </section>
        )}
        {answerer && (
          <>
            <Field label="คำตอบของทีม" hint="เขียนให้คนถามและ Nock เข้าใจ: ทำที่หน้าไหน กดอะไร ใครทำได้ · ถ้าคำตอบของ Nock ถูกแล้ว กด ใช้คำตอบของ Nock แล้วแก้เพิ่มได้">
              <Textarea rows={6} value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder="เช่น เปิด Panel นักเรียน › ⋯ › …" />
            </Field>
            {x.aiAnswer && !answer && <Button size="xs" variant="outline" onClick={() => setAnswer(x.aiAnswer!)}>ใช้คำตอบของ Nock</Button>}
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={toKnowledge} onCheckedChange={(v) => setToKnowledge(!!v)} /> เพิ่มเข้าคลังความรู้ของ Nock <InfoTip text="Nock จะใช้คำตอบนี้ตอบคนต่อไปที่ถามเรื่องคล้ายกัน" /></label>
            {toKnowledge && <Field label="ใครเห็นคำตอบนี้" hint="ทุกคน = Nock บอกได้ทุกบทบาท · เลือกบทบาท = Nock บอกเฉพาะคนที่มีบทบาทนั้น (เช่น เรื่องการเงินบอกแค่ Manager ขึ้นไป)"><RolePicker value={roles} onChange={setRoles} /></Field>}
          </>
        )}
      </PanelBody>
      {answerer && (
        <PanelFooter>
          <Button className="ml-auto" disabled={!answer.trim()} onClick={() => { if (report(answerQ(x.id, answer, { roles, addToKnowledge: toKnowledge }), toKnowledge ? "บันทึกคำตอบแล้ว · Nock เรียนรู้เรื่องนี้แล้ว" : "บันทึกคำตอบแล้ว")) onClose() }}>
            <SaveIcon /> {x.status === "answered" ? "บันทึกคำตอบ" : "ตอบคำถาม"}
          </Button>
        </PanelFooter>
      )}
    </>
  )
}

function KnowledgePanel({ id, onClose }: { id: ID | "new"; onClose: () => void }) {
  const k = useStore((s) => (id === "new" ? undefined : s.nockKnowledge.find((x) => x.id === id)))
  const save = useStore((s) => s.saveNockKnowledge)
  const remove = useStore((s) => s.deleteNockKnowledge)
  const [f, setF] = useState<Pick<NockKnowledge, "question" | "answer" | "roles">>({ question: k?.question ?? "", answer: k?.answer ?? "", roles: k?.roles ?? [] })
  return (
    <>
      <SheetHeader className="shrink-0 border-b pb-3">
        <SheetTitle className="flex items-center gap-1.5 text-lg">{k ? "แก้ความรู้ของ Nock" : "เพิ่มความรู้ให้ Nock"}<InfoTip text="Nock ใช้ความรู้ในคลังตอบคำถามที่คล้ายกัน — เขียนคำถามแบบที่คนมักถาม และคำตอบเป็นขั้นตอน" /></SheetTitle>
        {k && <SheetDescription>ใช้ตอบไปแล้ว {k.uses} ครั้ง</SheetDescription>}
      </SheetHeader>
      <PanelBody>
        <Field label="คำถาม"><Input value={f.question} onChange={(e) => setF({ ...f, question: e.target.value })} placeholder="เช่น ผู้ปกครองโอนเงินเกิน ต้องคืนยังไง" /></Field>
        <Field label="คำตอบ"><Textarea rows={8} value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} /></Field>
        <Field label="ใครเห็นคำตอบนี้" hint="ทุกคน = Nock บอกได้ทุกบทบาท · เลือกบทบาท = บอกเฉพาะบทบาทนั้น"><RolePicker value={f.roles} onChange={(roles) => setF({ ...f, roles })} /></Field>
      </PanelBody>
      <PanelFooter>
        {k && <PanelMore items={[{ label: "ลบความรู้นี้", icon: TrashIcon, destructive: true, onClick: () => { if (report(remove(k.id), "ลบแล้ว")) onClose() } }]} />}
        <Button className="ml-auto" onClick={() => { if (report(save({ ...f, id: k?.id }), "บันทึกความรู้แล้ว — Nock ใช้ได้ทันที")) onClose() }}><SaveIcon /> บันทึก</Button>
      </PanelFooter>
    </>
  )
}

