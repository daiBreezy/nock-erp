"use client"

// Nock (owner 2026-10-13): a floating helper on every page. Answers by the asker's own permissions; every question is
// kept (see /nock) — what Nock can't answer goes to the team, and their answers become knowledge Nock uses next time.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRightIcon, LibraryBigIcon, Loader2Icon, ArrowUpIcon, CheckIcon, CodeXmlIcon, MapPinIcon, SendIcon, ThumbsDownIcon, ThumbsUpIcon, UserRoundCheckIcon, XIcon } from "lucide-react"
import { AiAvatar } from "@/components/ui/ai-avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { fmtDateTime } from "@/domain/dates"
import * as Nock from "@/domain/rules/nock"
import type { DevTicketKind, NockQuestion, Result } from "@/domain/types"
import { DEV_KIND_LABEL } from "@/domain/rules/dev-tickets"
import { DEV_KIND_ICON } from "./dev-kind-icon"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import { report } from "@/lib/feedback"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const PAGE_TOPICS: [string, string[]][] = [
  ["/billing", ["invoice_create", "invoice_approve", "invoice_memo"]],
  ["/settings", ["subject_add", "holiday", "special_period"]],
  ["/students", ["student_add", "long_leave", "student_exit"]],
  ["/families", ["line_link", "student_add"]],
  ["/classes", ["class_add", "holiday"]],
  ["/calendar", ["class_add", "holiday", "special_period"]],
  ["/courses", ["course_add", "invoice_create"]],
  ["/sessions", ["attendance", "summary_write"]],
  ["/attendance", ["attendance", "long_leave"]],
  ["/summaries", ["summary_write", "summary_approve"]],
  ["/crm", ["lead", "line_link"]],
  ["/inbox", ["line_link", "lead"]],
  ["/staff", ["staff_add"]],
  ["/reports", ["reports"]],
]

/** the conversation itself is the feedback — only failures need a toast */
const quiet = (r: Result<unknown>) => { if (!r.ok) toast.error(r.error) }

/** starter questions for this page — each already knows which part of the system it is about */
function suggestionsFor(path: string): { text: string; locations: string[] }[] {
  const ids = PAGE_TOPICS.find(([p]) => path.startsWith(p))?.[1] ?? ["switch_branch", "student_add", "invoice_create"]
  return ids.map((id) => Nock.NOCK_GUIDE.find((g) => g.id === id)!).filter(Boolean).map((g) => ({ text: `${g.title} ทำยังไง?`, locations: g.locations }))
}

export function NockWidget() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {/* owner 2026-10-13: click anywhere outside the panel to close it */}
      {open && <div aria-hidden className="fixed inset-0 z-30" onClick={() => setOpen(false)} />}
      {open && <NockPanel onClose={() => setOpen(false)} />}
      {/* owner 2026-10-13: Nock's face — the blinking orb */}
      {/* owner 2026-10-13: Nock hides at the screen edge, tilted 45° and peeking with its eyes — hover (or keyboard focus)
          and it springs out; mouse leaves and it springs back. Stays out while the chat is open. */}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "ปิด Nock" : "ถาม Nock"} title="ถาม Nock — ผู้ช่วยของ NockERP"
        className={cn("fixed right-0 bottom-6 z-40 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none print:hidden",
          open ? "-translate-x-5" : "translate-x-[38%] -rotate-45 hover:-translate-x-5 hover:rotate-0 focus-visible:-translate-x-5 focus-visible:rotate-0")}>
        <AiAvatar size="lg" followMouse />
        {open && <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-background text-foreground shadow ring-1 ring-foreground/10"><XIcon className="size-3" /></span>}
      </button>
    </>
  )
}

type Pending = { question: string } | null

function NockPanel({ onClose }: { onClose: () => void }) {
  const me = useStore((s) => s.me())
  const branch = useStore((s) => s.branches.find((b) => b.id === s.branchId))
  const all = useStore((s) => s.nockQuestions)
  const log = useStore((s) => s.logNockQuestion)
  const rate = useStore((s) => s.rateNockAnswer)
  const toTeam = useStore((s) => s.sendNockToTeam)
  const pathname = usePathname()
  // owner 2026-10-13: the asker says which part of the system the question is about (one or more) — not taken from the page
  const [locs, setLocs] = useState<string[]>([])
  const [needLoc, setNeedLoc] = useState(false)
  // owner 2026-10-13: "ส่งถึง Dev" — a bug / help / suggestion / question straight to the developers
  const [view, setView] = useState<"chat" | "dev">("chat")
  const [text, setText] = useState("")
  const [pending, setPending] = useState<Pending>(null)
  const [model, setModel] = useState<string | null | undefined>(undefined)
  const end = useRef<HTMLDivElement>(null)
  // my conversation = my questions, oldest first (a team answer shows up here when it arrives)
  const mine = useMemo(() => all.filter((q) => q.askedBy === me.id).slice(0, 30).reverse(), [all, me.id])

  useEffect(() => {
    fetch("/api/nock").then((r) => r.json()).then((j) => setModel(j.provider ? `${j.provider === "gemini" ? "Gemini" : "OpenAI"} · ${j.model}` : null)).catch(() => setModel(null))
  }, [])
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }) }, [mine.length, pending])

  async function ask(raw: string, locations = locs) {
    const question = raw.trim()
    if (!question || pending) return
    if (!locations.length) { setNeedLoc(true); return }
    setNeedLoc(false)
    setText("")
    setPending({ question })
    const local = Nock.localAnswer(question, all, me.roles, locations)
    let ai: { answer: string; confident: boolean; links: { label: string; href: string }[] } | null = null
    if (model) {
      try {
        const system = Nock.nockSystemPrompt({ name: me.nickname, roles: me.roles, branch: branch?.name ?? "", locations, knowledge: all, question })
        const history = mine.slice(-3).flatMap((q) => [{ role: "user" as const, text: q.question }, ...(Nock.bestAnswer(q, me.roles)?.text || q.aiAnswer ? [{ role: "assistant" as const, text: Nock.bestAnswer(q, me.roles)?.text ?? q.aiAnswer! }] : [])])
        const r = await fetch("/api/nock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, question, history }) })
        const j = await r.json()
        if (j.ok) ai = j
      } catch { /* fall back to the handbook */ }
    }
    const top = Nock.matchKnowledge(question, all, me.roles, locations, 1)[0]
    const used = top && top.score >= Nock.KNOWLEDGE_SURE ? top : undefined
    if (ai) quiet(log({ locations, question, aiAnswer: ai.answer, aiSource: "ai", links: ai.links, status: ai.confident ? "ai" : "unanswered", fromKnowledgeId: used?.item.id, fromAnswerId: used?.answer.id }))
    else if (local) quiet(log({ locations, question, aiAnswer: local.text, aiSource: local.source, links: local.links, status: "ai", fromKnowledgeId: local.knowledgeId, fromAnswerId: local.answerId }))
    else quiet(log({ locations, question, status: "unanswered" }))
    setPending(null)
  }

  // owner 2026-10-13: smaller, no divider lines, a calm chat like Claude / ChatGPT — Nock speaks as plain text next to its
  // face, your messages are soft grey bubbles, the composer is one rounded box with the send button inside
  return (
    <div role="dialog" aria-label="Nock" className="fixed right-5 bottom-24 z-40 flex h-[min(520px,calc(100vh-8rem))] w-[min(360px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[28px] bg-background shadow-2xl ring-1 ring-foreground/8 print:hidden">
      <div className="flex shrink-0 items-center gap-2.5 px-4 pt-3.5 pb-2">
        <AiAvatar size="xs" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold">Nock</p>
          <p className="truncate text-[11px] text-muted-foreground">{model === undefined ? "…" : model ? model : "ตอบจากคู่มือ + คำตอบของทีม"}</p>
        </div>
        <Button size="sm" variant={view === "dev" ? "secondary" : "ghost"} className="h-7 gap-1 rounded-full px-2.5 text-xs text-muted-foreground" title="แจ้งปัญหา ขอความช่วยเหลือ เสนอแนะ หรือถามทีมพัฒนาโดยตรง" onClick={() => setView(view === "dev" ? "chat" : "dev")}><CodeXmlIcon /> ส่งถึง Dev</Button>
        <Button size="icon-sm" variant="ghost" className="text-muted-foreground" aria-label="คลังคำถาม" title="คลังคำถาม Nock" nativeButton={false} render={<Link href="/nock" onClick={onClose} />}><LibraryBigIcon /></Button>
        <Button size="icon-sm" variant="ghost" className="text-muted-foreground" aria-label="ปิด" onClick={onClose}><XIcon /></Button>
      </div>

      {view === "dev" ? <DevTicketForm onDone={() => setView("chat")} onLink={onClose} /> : <>
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pt-2 pb-3">
        {!mine.length && !pending ? (
          <div className="flex h-full flex-col justify-end gap-4 pb-1">
            <div className="flex flex-col items-start gap-2">
              <AiAvatar size="md" followMouse />
              <p className="text-lg font-semibold">สวัสดีครับ {me.nickname}</p>
              <p className="text-sm text-muted-foreground">ถามเรื่องการใช้ระบบได้เลย — Nock ตอบตามสิทธิ์ของคุณ ถ้ายังไม่รู้ จะส่งให้ทีมตอบ แล้วคำตอบจะกลับมาที่นี่</p>
            </div>
            <div className="flex flex-col gap-1.5">
              {suggestionsFor(pathname).map((x) => (
                <button key={x.text} type="button" onClick={() => { setLocs(x.locations); ask(x.text, x.locations) }} className="rounded-2xl bg-muted/60 px-3 py-2 text-left text-sm hover:bg-muted">{x.text}</button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {mine.map((q) => <Exchange key={q.id} q={q} onRate={(h) => report(rate(q.id, h), h ? "ขอบคุณครับ" : "ส่งให้ทีมช่วยตอบแล้ว")} onTeam={() => report(toTeam(q.id), "ส่งให้ทีมแล้ว — คำตอบจะกลับมาที่นี่")} onLink={onClose} />)}
            {pending && <><Bubble from="me">{pending.question}</Bubble><Bubble from="nock"><span className="inline-flex items-center gap-1.5 text-muted-foreground"><Loader2Icon className="size-3.5 animate-spin" /> กำลังคิด…</span></Bubble></>}
          </>
        )}
        <div ref={end} />
      </div>

      <form className="shrink-0 px-3 pb-3" onSubmit={(e) => { e.preventDefault(); ask(text) }}>
        <div className={cn("rounded-3xl bg-muted/60 px-1.5 pt-1.5 pb-1.5 focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring/20", needLoc && "ring-2 ring-amber-400")}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="ถาม Nock…" aria-label="คำถามถึง Nock"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(text) } }}
            className="block max-h-28 min-h-8 w-full resize-none bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted-foreground" />
          <div className="flex items-center gap-1">
            <LocationPicker value={locs} onChange={(v) => { setLocs(v); if (v.length) setNeedLoc(false) }} />
            <Button type="submit" size="icon-sm" className="ml-auto rounded-full" disabled={!text.trim() || !!pending} aria-label="ส่ง"><ArrowUpIcon /></Button>
          </div>
        </div>
        {needLoc && <p className="pt-1.5 text-center text-[11px] text-amber-700">เลือก Part ของระบบที่เกี่ยวข้องก่อน (ปุ่มหมุดด้านล่าง)</p>}
        {mine.length > 0 && <p className="pt-1.5 text-center text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1">Nock อาจตอบผิดได้ · กด <ThumbsDownIcon className="size-3 text-red-600" /> เพื่อส่งให้ทีมช่วยตอบ</span></p>}
      </form>
      </>}
    </div>
  )
}

/** ส่งถึง Dev (owner 2026-10-13): kind · title · detail · Location — the page, branch and role are attached automatically */
function DevTicketForm({ onDone, onLink }: { onDone: () => void; onLink: () => void }) {
  const me = useStore((s) => s.me())
  const branch = useStore((s) => s.branches.find((b) => b.id === s.branchId))
  const send = useStore((s) => s.sendDevTicket)
  const pathname = usePathname()
  const [kind, setKind] = useState<DevTicketKind>("bug")
  const [title, setTitle] = useState("")
  const [detail, setDetail] = useState("")
  const [locs, setLocs] = useState<string[]>([])
  const [sent, setSent] = useState<string | null>(null)
  const pageUrl = typeof window === "undefined" ? pathname : `${pathname}${window.location.search}`
  if (sent) return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-emerald-100 text-emerald-700"><CheckIcon className="size-6" /></span>
      <p className="font-semibold">ส่งถึง Dev แล้ว · {sent}</p>
      <p className="text-sm text-muted-foreground">ทีมพัฒนาจะตอบกลับในเรื่องนี้ — คุณจะได้แจ้งเตือนทุกครั้งที่มีความคืบหน้า</p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" nativeButton={false} render={<Link href="/nock?tab=dev" onClick={onLink} />}>ดูเรื่องที่ส่ง</Button>
        <Button size="sm" onClick={onDone}>กลับไปคุยกับ Nock</Button>
      </div>
    </div>
  )
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 pt-1 pb-3">
      <div>
        <p className="font-semibold">ส่งเรื่องถึงทีมพัฒนา</p>
        <p className="text-xs text-muted-foreground">Dev ตอบกลับในระบบ · เรื่องที่ส่งเห็นเฉพาะคุณกับ Dev</p>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(DEV_KIND_LABEL) as DevTicketKind[]).map((k) => {
          const Icon = DEV_KIND_ICON[k]
          return <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)} className={cn("flex items-center gap-1.5 rounded-2xl border px-2.5 py-2 text-left text-xs", kind === k ? "border-primary bg-primary/5 font-medium text-primary" : "hover:bg-muted")}><Icon className="size-4 shrink-0" />{DEV_KIND_LABEL[k]}</button>
        })}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="หัวเรื่องสั้นๆ" className="h-9 w-full rounded-2xl bg-muted/60 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20" />
      <textarea value={detail} onChange={(e) => setDetail(e.target.value)} rows={5} placeholder={kind === "bug" ? "ทำอะไรอยู่ แล้วเกิดอะไรขึ้น (ควรเป็นอย่างไร)" : kind === "idea" ? "อยากให้ระบบมีอะไร ช่วยงานแบบไหน" : "เล่ารายละเอียด"} className="w-full resize-none rounded-2xl bg-muted/60 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/20" />
      <LocationPicker value={locs} onChange={setLocs} />
      <p className="text-[11px] text-muted-foreground">แนบให้อัตโนมัติ: หน้า {pageUrl} · สาขา{branch?.name} · {me.roles.map((r) => ROLE_LABEL[r]).join(", ")}</p>
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>ยกเลิก</Button>
        <Button size="sm" disabled={!title.trim() || !detail.trim() || !locs.length} onClick={() => { const r = send({ kind, title, detail, locations: locs, pageUrl }); if (r.ok) setSent(r.value.number); else toast.error(r.error) }}><SendIcon /> ส่งถึง Dev</Button>
      </div>
    </div>
  )
}

/** 📍 which part(s) of the system the question is about */
function LocationPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const label = value.length ? value.map(Nock.locationLabel).join(", ") : "เลือก Part ของระบบ"
  return (
    <Popover>
      <PopoverTrigger render={<button type="button" className={cn("flex max-w-[230px] items-center gap-1 rounded-full px-2.5 py-1 text-xs", value.length ? "bg-background font-medium ring-1 ring-foreground/10" : "text-muted-foreground hover:bg-background")} />}>
        <MapPinIcon className="size-3.5 shrink-0" /><span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-64 p-2">
        <p className="px-1.5 pb-1.5 text-xs text-muted-foreground">Part ของระบบที่เกี่ยวข้อง (เลือกได้หลายส่วน)</p>
        <div className="flex flex-wrap gap-1">
          {Nock.NOCK_LOCATIONS.map((l) => {
            const on = value.includes(l.id)
            return <button key={l.id} type="button" aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== l.id) : [...value, l.id])}
              className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{l.label}</button>
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function Bubble({ from, children }: { from: "me" | "nock" | "team"; children: React.ReactNode }) {
  if (from === "me") return <div className="ml-auto w-fit max-w-[85%] rounded-3xl bg-muted px-3.5 py-2 text-sm whitespace-pre-line">{children}</div>
  return (
    <div className="flex gap-2.5">
      {from === "nock" ? <AiAvatar size="xs" blinking={false} className="mt-0.5" /> : <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><UserRoundCheckIcon className="size-3.5" /></span>}
      <div className="min-w-0 flex-1 text-sm leading-relaxed whitespace-pre-line">{children}</div>
    </div>
  )
}

function Exchange({ q, onRate, onTeam, onLink }: { q: NockQuestion; onRate: (helpful: boolean) => void; onTeam: () => void; onLink: () => void }) {
  const staff = useStore((s) => s.staff)
  const me = useStore((s) => s.me())
  const best = Nock.bestAnswer(q, me.roles)
  return (
    <div className="space-y-3">
      <div>
        <Bubble from="me">{q.question}</Bubble>
        {!!q.locations?.length && <p className="mt-1 flex items-center justify-end gap-1 text-[10px] text-muted-foreground"><MapPinIcon className="size-3" />{(q.locations ?? []).map(Nock.locationLabel).join(", ")}</p>}
      </div>
      {q.aiAnswer ? (
        <Bubble from="nock">
          {q.aiAnswer}
          {!!q.links?.length && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {q.links.map((l) => <Link key={l.href} href={l.href} onClick={onLink} className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium hover:bg-muted">{l.label} <ArrowRightIcon className="size-3" /></Link>)}
            </span>
          )}
        </Bubble>
      ) : (
        <Bubble from="nock">Nock ยังไม่รู้คำตอบเรื่องนี้ — ส่งคำถามให้ทีมแล้ว คำตอบจะกลับมาที่นี่ และ Nock จะจำไว้ตอบคนต่อไป</Bubble>
      )}
      {q.status === "ai" && (
        <div className="flex items-center gap-1 pl-8 text-xs text-muted-foreground">
          {q.helpful === undefined ? <>
            <span>ตอบตรงไหม?</span>
            <button type="button" aria-label="ตอบตรง" onClick={() => onRate(true)} className="grid size-6 place-items-center rounded-full hover:bg-muted"><ThumbsUpIcon className="size-3.5 text-emerald-600" /></button>
            <button type="button" aria-label="ไม่ตรง ส่งให้ทีม" onClick={() => onRate(false)} className="grid size-6 place-items-center rounded-full hover:bg-muted"><ThumbsDownIcon className="size-3.5 text-red-600" /></button>
          </> : <span>ขอบคุณที่บอก</span>}
          <button type="button" onClick={onTeam} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-muted"><SendIcon className="size-3" /> ส่งให้ทีม</button>
        </div>
      )}
      {q.status === "unanswered" && <p className="pl-8 text-xs text-amber-700">รอทีมตอบ · {fmtDateTime(q.at)}</p>}
      {q.status === "answered" && best && (
        <Bubble from="team">
          <span className="mb-0.5 block text-xs font-medium text-emerald-700 dark:text-emerald-300">ตอบโดย {staff.find((s) => s.id === best.by)?.nickname ?? "ทีม"}{(q.answers?.length ?? 0) > 1 && ` · คำตอบที่โหวตดีที่สุดจาก ${q.answers!.length} คำตอบ`}</span>
          {best.text}
        </Bubble>
      )}
    </div>
  )
}
