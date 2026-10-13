"use client"

// Nock (owner 2026-10-13): a floating helper on every page. Answers by the asker's own permissions; every question is
// kept (see /nock) — what Nock can't answer goes to the team, and their answers become knowledge Nock uses next time.
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRightIcon, LibraryBigIcon, Loader2Icon, SendHorizontalIcon, SendIcon, ThumbsDownIcon, ThumbsUpIcon, UserRoundCheckIcon, XIcon } from "lucide-react"
import { AiAvatar } from "@/components/ui/ai-avatar"
import { Button } from "@/components/ui/button"
import { fmtDateTime } from "@/domain/dates"
import * as Nock from "@/domain/rules/nock"
import type { NockQuestion, Result } from "@/domain/types"
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

function suggestionsFor(path: string): string[] {
  const ids = PAGE_TOPICS.find(([p]) => path.startsWith(p))?.[1] ?? ["switch_branch", "student_add", "invoice_create"]
  return ids.map((id) => Nock.NOCK_GUIDE.find((g) => g.id === id)!).filter(Boolean).map((g) => `${g.title} ทำยังไง?`)
}

export function NockWidget() {
  const [open, setOpen] = useState(false)
  return (
    <>
      {open && <NockPanel onClose={() => setOpen(false)} />}
      {/* owner 2026-10-13: Nock's face — the blinking orb */}
      {/* owner 2026-10-13: Nock hides at the screen edge, tilted 45° and peeking with its eyes — hover (or keyboard focus)
          and it springs out; mouse leaves and it springs back. Stays out while the chat is open. */}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={open ? "ปิด Nock" : "ถาม Nock"} title="ถาม Nock — ผู้ช่วยของ NockERP"
        className={cn("fixed right-0 bottom-6 z-40 rounded-full transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] focus-visible:outline-none print:hidden",
          open ? "-translate-x-5" : "translate-x-[38%] -rotate-45 hover:-translate-x-5 hover:rotate-0 focus-visible:-translate-x-5 focus-visible:rotate-0")}>
        <AiAvatar size="lg" />
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
  const knowledge = useStore((s) => s.nockKnowledge)
  const log = useStore((s) => s.logNockQuestion)
  const rate = useStore((s) => s.rateNockAnswer)
  const toTeam = useStore((s) => s.sendNockToTeam)
  const pathname = usePathname()
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

  async function ask(raw: string) {
    const question = raw.trim()
    if (!question || pending) return
    setText("")
    setPending({ question })
    const local = Nock.localAnswer(question, knowledge, me.roles)
    let ai: { answer: string; confident: boolean; links: { label: string; href: string }[] } | null = null
    if (model) {
      try {
        const system = Nock.nockSystemPrompt({ name: me.nickname, roles: me.roles, branch: branch?.name ?? "", page: pathname, knowledge, question })
        const history = mine.slice(-3).flatMap((q) => [{ role: "user" as const, text: q.question }, ...(q.answer || q.aiAnswer ? [{ role: "assistant" as const, text: q.answer ?? q.aiAnswer! }] : [])])
        const r = await fetch("/api/nock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, question, history }) })
        const j = await r.json()
        if (j.ok) ai = j
      } catch { /* fall back to the handbook */ }
    }
    const top = Nock.matchKnowledge(question, knowledge, me.roles, 1)[0]
    const used = top && top.score >= Nock.KNOWLEDGE_SURE ? top.item.id : undefined
    if (ai) quiet(log({ page: pathname, question, aiAnswer: ai.answer, aiSource: "ai", links: ai.links, status: ai.confident ? "ai" : "unanswered" }, used))
    else if (local) quiet(log({ page: pathname, question, aiAnswer: local.text, aiSource: local.source, links: local.links, status: "ai" }, local.knowledgeId))
    else quiet(log({ page: pathname, question, status: "unanswered" }))
    setPending(null)
  }

  return (
    <div role="dialog" aria-label="Nock" className="fixed right-5 bottom-26 z-40 flex h-[min(600px,calc(100vh-8rem))] w-[min(400px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-3xl bg-card shadow-2xl ring-1 ring-foreground/10 print:hidden">
      <div className="ai-aurora flex shrink-0 items-center gap-3 border-b px-4 py-3">
        <AiAvatar size="sm" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Nock</p>
          <p className="truncate text-xs text-muted-foreground">{model === undefined ? "…" : model ? `ผู้ช่วย AI · ${model}` : "ผู้ช่วย · ตอบจากคู่มือ + คำตอบของทีม"}</p>
        </div>
        <Button size="icon-sm" variant="ghost" aria-label="คลังคำถาม" title="คลังคำถาม Nock" nativeButton={false} render={<Link href="/nock" onClick={onClose} />}><LibraryBigIcon /></Button>
        <Button size="icon-sm" variant="ghost" aria-label="ปิด" onClick={onClose}><XIcon /></Button>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <Bubble from="nock">สวัสดีครับ {me.nickname} ถามเรื่องการใช้ระบบได้เลย — Nock ตอบตามสิทธิ์ของคุณ ถ้า Nock ยังไม่รู้ จะส่งคำถามให้ทีมตอบ แล้วคำตอบจะกลับมาที่นี่</Bubble>
        {mine.map((q) => <Exchange key={q.id} q={q} onRate={(h) => report(rate(q.id, h), h ? "ขอบคุณครับ" : "ส่งให้ทีมช่วยตอบแล้ว")} onTeam={() => report(toTeam(q.id), "ส่งให้ทีมแล้ว — คำตอบจะกลับมาที่นี่")} onLink={onClose} />)}
        {pending && <><Bubble from="me">{pending.question}</Bubble><Bubble from="nock"><Loader2Icon className="inline size-4 animate-spin" /> กำลังหาคำตอบ…</Bubble></>}
        {!mine.length && !pending && (
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-muted-foreground">ลองถาม:</p>
            {suggestionsFor(pathname).map((s) => (
              <button key={s} type="button" onClick={() => ask(s)} className="block w-full rounded-2xl border border-sky-200 bg-sky-50/60 px-3 py-2 text-left text-sm text-sky-900 hover:bg-sky-100 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">{s}</button>
            ))}
          </div>
        )}
        <div ref={end} />
      </div>

      {mine.length > 0 && !pending && (
        <div className="flex shrink-0 gap-1.5 overflow-x-auto px-4 pb-2">
          {suggestionsFor(pathname).map((s) => (
            <button key={s} type="button" onClick={() => ask(s)} className="shrink-0 rounded-full border border-sky-200 px-2.5 py-1 text-xs text-sky-800 hover:bg-sky-50 dark:border-sky-900 dark:text-sky-200">{s}</button>
          ))}
        </div>
      )}
      <form className="flex shrink-0 items-end gap-2 border-t px-3 py-3" onSubmit={(e) => { e.preventDefault(); ask(text) }}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={1} placeholder="ถาม Nock…" aria-label="คำถามถึง Nock"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); ask(text) } }}
          className="max-h-32 min-h-9 flex-1 resize-none rounded-2xl bg-input/50 px-3 py-2 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30" />
        <Button type="submit" size="icon" className="rounded-full bg-sky-600 hover:bg-sky-700" disabled={!text.trim() || !!pending} aria-label="ส่ง"><SendHorizontalIcon /></Button>
      </form>
    </div>
  )
}

function Bubble({ from, children, className }: { from: "me" | "nock" | "team"; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-[88%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line",
      from === "me" ? "ml-auto rounded-br-md bg-primary text-primary-foreground"
        : from === "team" ? "rounded-bl-md bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-50 dark:ring-emerald-900"
          : "rounded-bl-md bg-sky-50 text-sky-950 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-50 dark:ring-sky-900", className)}>
      {children}
    </div>
  )
}

function Exchange({ q, onRate, onTeam, onLink }: { q: NockQuestion; onRate: (helpful: boolean) => void; onTeam: () => void; onLink: () => void }) {
  const staff = useStore((s) => s.staff)
  return (
    <div className="space-y-1.5">
      <Bubble from="me">{q.question}</Bubble>
      {q.aiAnswer ? (
        <Bubble from="nock">
          {q.aiAnswer}
          {!!q.links?.length && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {q.links.map((l) => <Link key={l.href} href={l.href} onClick={onLink} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100 dark:bg-sky-950 dark:text-sky-200">{l.label} <ArrowRightIcon className="size-3" /></Link>)}
            </span>
          )}
        </Bubble>
      ) : (
        <Bubble from="nock">Nock ยังไม่รู้คำตอบเรื่องนี้ — ส่งคำถามให้ทีมแล้ว คำตอบจะกลับมาที่นี่ และ Nock จะจำไว้ตอบคนต่อไป</Bubble>
      )}
      {q.status === "ai" && (
        <div className="flex items-center gap-1 pl-1 text-xs text-muted-foreground">
          {q.helpful === undefined ? <>
            <span>ตอบตรงไหม?</span>
            <button type="button" aria-label="ตอบตรง" onClick={() => onRate(true)} className="grid size-6 place-items-center rounded-full hover:bg-muted"><ThumbsUpIcon className="size-3.5" /></button>
            <button type="button" aria-label="ไม่ตรง ส่งให้ทีม" onClick={() => onRate(false)} className="grid size-6 place-items-center rounded-full hover:bg-muted"><ThumbsDownIcon className="size-3.5" /></button>
          </> : <span>ขอบคุณที่บอก</span>}
          <button type="button" onClick={onTeam} className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 hover:bg-muted"><SendIcon className="size-3" /> ส่งให้ทีม</button>
        </div>
      )}
      {q.status === "unanswered" && <p className="pl-1 text-xs text-amber-700">รอทีมตอบ · {fmtDateTime(q.at)}</p>}
      {q.status === "answered" && q.answer && (
        <Bubble from="team">
          <span className="mb-1 flex items-center gap-1 text-xs font-medium text-emerald-800 dark:text-emerald-200"><UserRoundCheckIcon className="size-3.5" /> ตอบโดย {staff.find((s) => s.id === q.answeredBy)?.nickname ?? "ทีม"}</span>
          {q.answer}
        </Bubble>
      )}
    </div>
  )
}
