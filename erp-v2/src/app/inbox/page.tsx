"use client"

import { useCallback, useEffect, useState } from "react"
import { FileSignatureIcon, InfoIcon, PenLineIcon, PlusIcon, RadioIcon, SendIcon, SparklesIcon, UserSearchIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Pill } from "@/components/app/badges"
import { FamilyForm } from "@/components/app/family-form"
import { StudentSheet } from "@/components/app/student-sheet"
import { avatarTone, initial } from "@/components/app/subject-color"
import { ComposeDialog } from "@/components/inbox/compose-dialog"
import { FormRequestBubble } from "@/components/inbox/form-request-bubble"
import { FormSubmissionBubble } from "@/components/inbox/form-submission-bubble"
import { MessageBubble } from "@/components/inbox/message-bubble"
import { SendFormDialog } from "@/components/inbox/send-form-dialog"
import { LeadDialog } from "@/components/crm/lead-dialog"
import { LeadSheet } from "@/components/crm/lead-sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fmtDateTime } from "@/domain/dates"
import { CHANNEL_LABEL, CONVERSATION_TYPE_LABEL, conversationType, type ConversationType, unreadCount } from "@/domain/rules/inbox"
import { can } from "@/domain/rules/permissions"
import type { ChatMessage, Conversation, FormSubmission, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export default function InboxPage() {
  const branch = useBranch()
  const conversations = useStore((s) => s.conversations).filter((c) => c.branchId === branch.id)
  const messages = useStore((s) => s.messages)
  const staff = useStore((s) => s.staff)
  const families = useStore((s) => s.families)
  const leads = useStore((s) => s.leads)
  const students = useStore((s) => s.students)
  const openConversation = useStore((s) => s.openConversation)
  const assign = useStore((s) => s.assignConversation)
  const send = useStore((s) => s.sendChatMessage)
  const simulateReply = useStore((s) => s.simulateParentReply)
  const mergeLive = useStore((s) => s.mergeLiveConversations)
  const linkFamily = useStore((s) => s.linkConversationToFamily)
  const linkLead = useStore((s) => s.linkConversationToLead)

  const [selectedId, setSelectedId] = useState<ID | null>(conversations[0]?.id ?? null)
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<"all" | ConversationType>("all")
  const [readFilter, setReadFilter] = useState<"all" | "unread" | "read">("all")
  const [composing, setComposing] = useState(false)
  const [showInfo, setShowInfo] = useState(true)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [openStudentId, setOpenStudentId] = useState<ID | null>(null)
  const [openLeadId, setOpenLeadId] = useState<ID | null>(null)
  const [linkFamilyId, setLinkFamilyId] = useState("")
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [linkLeadId, setLinkLeadId] = useState("")
  const [creatingLead, setCreatingLead] = useState(false)
  const [sendingFormOpen, setSendingFormOpen] = useState(false)
  const [submissions, setSubmissions] = useState<FormSubmission[]>([])

  // Polls the real LINE webhook's server-side store so messages a parent sends show up here without
  // a manual refresh. `/api/line/webhook` is the writer; this page is just a reader.
  const syncLive = useCallback(() => {
    fetch("/api/line/conversations")
      .then((r) => r.json())
      .then((data: { conversations: Conversation[]; messages: ChatMessage[] }) => mergeLive(data.conversations, data.messages))
      .catch(() => {})
  }, [mergeLive])
  useEffect(() => {
    syncLive()
    const t = setInterval(syncLive, 4000)
    return () => clearInterval(t)
  }, [syncLive])

  // Same live status source form_request/form_submission bubbles below read from — mergeLiveConversations
  // never patches an existing message, so status always comes from this poll, joined at render time.
  const pollSubmissions = useCallback(() => {
    fetch("/api/forms/submissions").then((r) => r.json()).then((d) => setSubmissions(d.submissions ?? [])).catch(() => {})
  }, [])
  useEffect(() => {
    pollSubmissions()
    const t = setInterval(pollSubmissions, 5000)
    return () => clearInterval(t)
  }, [pollSubmissions])

  const lastMessage = (id: ID) => [...messages].filter((m) => m.conversationId === id).sort((a, b) => b.at.localeCompare(a.at))[0]

  const filtered = conversations
    .filter((c) => typeFilter === "all" || conversationType(c) === typeFilter)
    .filter((c) => readFilter === "all" || (readFilter === "unread" ? c.unread : !c.unread))
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))

  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const thread = selected ? messages.filter((m) => m.conversationId === selected.id).sort((a, b) => a.at.localeCompare(b.at)) : []
  const family = selected?.familyId ? families.find((f) => f.id === selected.familyId) : null
  const lead = selected?.leadId ? leads.find((l) => l.id === selected.leadId) : null
  const familyStudents = family ? students.filter((s) => s.familyId === family.id) : []
  const isNote = draft.trim().startsWith("//")
  const isLive = (id: ID) => id.startsWith("line_")

  const select = (id: ID) => {
    setSelectedId(id)
    openConversation(id)
    if (isLive(id)) fetch("/api/line/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: id }) }).catch(() => {})
  }

  const submit = async () => {
    if (!selected || !draft.trim()) return
    const text = draft
    // internal notes never leave the system, so live conversations use the same local-only path as mock ones
    if (isLive(selected.id) && !isNote) {
      setSending(true)
      try {
        const res = await fetch("/api/line/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: selected.id, text }) })
        const data = await res.json()
        if (!data.ok) { report({ ok: false, error: data.error ?? "ส่งไม่สำเร็จ" }, ""); return }
        setDraft("")
        syncLive()
        report({ ok: true, value: undefined }, "ส่งข้อความแล้ว")
      } catch {
        report({ ok: false, error: "เรียก API ไม่ได้" }, "")
      } finally {
        setSending(false)
      }
      return
    }
    if (report(send(selected.id, text), isNote ? "บันทึกโน้ตแล้ว" : "ส่งข้อความแล้ว")) setDraft("")
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl gap-4">
      {/* Conversation list */}
      <div className="flex w-72 shrink-0 flex-col rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Inbox</h2>
              <p className="text-xs text-muted-foreground">{unreadCount(conversations) > 0 ? `${unreadCount(conversations)} ยังไม่อ่าน` : "อ่านครบแล้ว"}</p>
            </div>
            <Button size="icon-sm" variant="outline" aria-label="เริ่มบทสนทนาใหม่" onClick={() => setComposing(true)}><PenLineIcon /></Button>
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ…" />
          <div className="flex gap-1.5">
            <NativeSelect className="flex-1" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              options={[{ value: "all", label: "ทุกประเภท" }, ...(["customer", "lead", "contact"] as const).map((t) => ({ value: t, label: CONVERSATION_TYPE_LABEL[t] }))]} />
            <NativeSelect className="flex-1" value={readFilter} onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
              options={[{ value: "all", label: "ทั้งหมด" }, { value: "unread", label: "ยังไม่อ่าน" }, { value: "read", label: "อ่านแล้ว" }]} />
          </div>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-2">
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">ไม่พบบทสนทนา</p>}
          {filtered.map((c) => {
            const lm = lastMessage(c.id)
            const type = conversationType(c)
            return (
              <button key={c.id} onClick={() => select(c.id)}
                className={cn("flex w-full items-start gap-2.5 rounded-2xl p-2.5 text-left hover:bg-muted/60", selected?.id === c.id && "bg-muted")}>
                <span className={cn("relative grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(c.id))}>
                  {initial(c.name)}
                  {c.unread && <span className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full border-2 border-card bg-primary" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className={cn("truncate text-sm", c.unread ? "font-semibold" : "font-medium")}>{c.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{lm ? fmtDateTime(lm.at).split(" ")[1] : ""}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1">
                    {isLive(c.id) && <Pill tone="blue" className="px-1.5 py-0 text-[9px]"><RadioIcon className="size-2.5" /> LIVE</Pill>}
                    <Pill tone={type === "customer" ? "green" : type === "lead" ? "amber" : "gray"} className="px-1.5 py-0 text-[9px]">{CONVERSATION_TYPE_LABEL[type]}</Pill>
                    <span className="truncate text-xs text-muted-foreground">{lm?.text ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{c.assigneeId ? staff.find((s) => s.id === c.assigneeId)?.nickname : "ยังไม่มอบหมาย"}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
        {!selected ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
            <UserSearchIcon className="size-8 opacity-40" />
            <p className="text-sm">เลือกบทสนทนาทางซ้าย</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b p-3">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(selected.id))}>{initial(selected.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-sm font-semibold">{selected.name}</span>
                  {isLive(selected.id) && <Pill tone="blue"><RadioIcon className="size-2.5" /> LIVE — LINE จริง</Pill>}
                  <Pill tone={conversationType(selected) === "customer" ? "green" : conversationType(selected) === "lead" ? "amber" : "gray"}>{CONVERSATION_TYPE_LABEL[conversationType(selected)]}</Pill>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{CHANNEL_LABEL[selected.channel]}</span>
                  <NativeSelect className="ml-1 h-6 w-32 text-xs" value={selected.assigneeId ?? ""} onChange={(e) => report(assign(selected.id, e.target.value || null), e.target.value ? "มอบหมายแล้ว" : "ยกเลิกมอบหมายแล้ว")}
                    placeholder="ยังไม่มอบหมาย" options={staff.filter((s) => s.active && s.branchIds.includes(branch.id) && can(s, "inbox.manage")).map((s) => ({ value: s.id, label: s.nickname }))} />
                </div>
              </div>
              {lead && (
                <Button size="sm" variant="outline" onClick={() => setSendingFormOpen(true)}><FileSignatureIcon /> ส่งฟอร์ม</Button>
              )}
              <Button size="icon-sm" variant={showInfo ? "secondary" : "outline"} aria-label="ข้อมูลติดต่อ" onClick={() => setShowInfo((v) => !v)}><InfoIcon /></Button>
            </div>

            <div className="flex min-h-0 flex-1">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {thread.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">เริ่มบทสนทนา</p>}
                  {thread.map((m) => {
                    if (m.kind === "form_request") return <FormRequestBubble key={m.id} message={m} submissions={submissions} />
                    if (m.kind === "form_submission") return <FormSubmissionBubble key={m.id} message={m} conversation={selected} submissions={submissions} onChanged={pollSubmissions} />
                    return <MessageBubble key={m.id} message={m} conversation={selected} staff={staff} />
                  })}
                </div>
                <div className="space-y-1.5 border-t p-3">
                  <div className="flex gap-2">
                    <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit() } }}
                      placeholder="พิมพ์ตอบผู้ปกครอง… (// สำหรับโน้ตภายใน)" className={cn(isNote && "border-amber-400 bg-amber-50")} />
                    <Button onClick={submit} disabled={!draft.trim() || sending}>{sending ? "กำลังส่ง…" : <><SendIcon /> ส่ง</>}</Button>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>พิมพ์ <code className="rounded bg-muted px-1">{"//"}</code> ขึ้นต้น = โน้ตภายใน ผู้ปกครองไม่เห็น</span>
                    {isLive(selected.id) ? (
                      <span className="inline-flex items-center gap-1 text-sky-700"><RadioIcon className="size-3" /> ข้อความไหลจาก LINE จริง — sync ทุก 4 วิ</span>
                    ) : (
                      <button className="inline-flex items-center gap-1 hover:text-foreground hover:underline" onClick={() => { if (report(simulateReply(selected.id), "จำลองข้อความตอบกลับแล้ว")) openConversation(selected.id) }}>
                        <SparklesIcon className="size-3" /> จำลองข้อความจากผู้ปกครอง
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {showInfo && (
                <div className="w-64 shrink-0 space-y-4 overflow-y-auto border-l p-3 text-sm">
                  <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">ข้อมูลติดต่อ</h3>
                  {family ? (
                    <div className="space-y-2">
                      <div className="font-medium">{family.name}</div>
                      {family.parents.map((p) => (
                        <div key={p.name} className="text-xs">
                          <a href={`tel:${p.phone.replace(/\D/g, "")}`} className="text-sky-700 hover:underline">{p.name} · {p.phone}</a>
                          <Pill tone={p.lineLinked ? "green" : "amber"} className="ml-1">{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                        </div>
                      ))}
                      <div className="pt-1">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">ลูก ({familyStudents.length})</p>
                        {familyStudents.map((s) => (
                          <button key={s.id} onClick={() => setOpenStudentId(s.id)} className="block w-full rounded-lg p-1.5 text-left text-xs hover:bg-muted">{s.nickname} · {s.grade}</button>
                        ))}
                      </div>
                    </div>
                  ) : lead ? (
                    <div className="space-y-2">
                      <div className="font-medium">{lead.name}</div>
                      <div className="text-xs text-muted-foreground">{lead.subject} · {lead.childGrade}</div>
                      <Button size="xs" variant="outline" onClick={() => setOpenLeadId(lead.id)}>เปิดรายละเอียด Lead</Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-xs text-muted-foreground">ยังไม่ผูกกับครอบครัวหรือ Lead — บทสนทนานี้จะจำการผูกไว้ถาวร (แม้เป็นข้อความ LINE จริง)</p>
                      <div className="space-y-1.5 border-b pb-3">
                        <p className="text-xs font-medium text-muted-foreground">ลูกค้า (ครอบครัว)</p>
                        <div className="flex gap-1.5">
                          <NativeSelect className="flex-1" value={linkFamilyId} onChange={(e) => setLinkFamilyId(e.target.value)}
                            placeholder="เลือกครอบครัว" options={families.filter((f) => students.some((s) => s.familyId === f.id && s.branchId === branch.id)).map((f) => ({ value: f.id, label: f.name }))} />
                          <Button size="xs" disabled={!linkFamilyId} onClick={() => { if (report(linkFamily(selected.id, linkFamilyId), "ผูกครอบครัวแล้ว")) setLinkFamilyId("") }}>ผูก</Button>
                        </div>
                        <Button size="xs" variant="outline" className="w-full" onClick={() => setCreatingFamily(true)}><PlusIcon /> สร้างครอบครัวใหม่จากข้อความนี้</Button>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">ลีด (CRM)</p>
                        <div className="flex gap-1.5">
                          <NativeSelect className="flex-1" value={linkLeadId} onChange={(e) => setLinkLeadId(e.target.value)}
                            placeholder="เลือก Lead" options={leads.filter((l) => l.branchId === branch.id && l.stage !== "archived").map((l) => ({ value: l.id, label: l.name }))} />
                          <Button size="xs" disabled={!linkLeadId} onClick={() => { if (report(linkLead(selected.id, linkLeadId), "ผูก Lead แล้ว")) setLinkLeadId("") }}>ผูก</Button>
                        </div>
                        <Button size="xs" variant="outline" className="w-full" onClick={() => setCreatingLead(true)}><PlusIcon /> สร้าง Lead ใหม่จากข้อความนี้</Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {composing && <ComposeDialog onClose={() => setComposing(false)} onSent={(id) => { setComposing(false); if (id) select(id) }} />}
      {sendingFormOpen && selected && lead && (
        <SendFormDialog
          leadId={lead.id} branchId={lead.branchId} conversationId={selected.id} lineUserId={lead.lineUserId ?? ""}
          onClose={() => setSendingFormOpen(false)}
        />
      )}
      {creatingFamily && selected && (
        <FamilyForm
          initialName={selected.name}
          onClose={() => setCreatingFamily(false)}
          onSaved={(newFamily) => report(linkFamily(selected.id, newFamily.id), `สร้างและผูก "${newFamily.name}" แล้ว — เพิ่มลูกได้ที่หน้าครอบครัว`)}
        />
      )}
      {creatingLead && selected && (
        <LeadDialog
          initialName={selected.name}
          onClose={() => setCreatingLead(false)}
          onSaved={(newLead) => report(linkLead(selected.id, newLead.id), `สร้างและผูก Lead "${newLead.name}" แล้ว`)}
        />
      )}
      <StudentSheet studentId={openStudentId} onClose={() => setOpenStudentId(null)} />
      <LeadSheet leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
    </div>
  )
}
