"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { FileSignatureIcon, InfoIcon, PenLineIcon, PlusIcon, RadioIcon, SendIcon, SparklesIcon, UserSearchIcon, UserCheckIcon, ChevronDownIcon, CheckIcon, ClipboardListIcon, FileTextIcon, GraduationCapIcon, HeartHandshakeIcon, ImageIcon, LogOutIcon, MegaphoneIcon, SearchIcon, UserPlusIcon, XIcon, GripVerticalIcon, CheckCircle2Icon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ExitRequestDialog } from "@/components/app/student-exit"
import { BroadcastDialog } from "@/components/inbox/broadcast-dialog"
import { sendEnrollToChat, sendSurveyToChat } from "@/lib/forms"
import { Pill } from "@/components/app/badges"
import { FamilyForm } from "@/components/app/family-form"
import { FamilySheet } from "@/components/app/family-sheet"
import { CustomerPicker } from "@/components/app/customer-picker"
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDate, fmtDateTime } from "@/domain/dates"
import { CHANNEL_LABEL, CONVERSATION_TYPE_LABEL, conversationType, type ConversationType, SOURCE_OF_CHANNEL, unreadCount } from "@/domain/rules/inbox"
import { can } from "@/domain/rules/permissions"
import type { ChatMessage, Conversation, Family, FormSubmission, FormType, ID, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useQueryState } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const LIST_DEFAULT = 288
const clampWidth = (w: number) => Math.min(480, Math.max(240, Math.round(w)))

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
  // deep link from the student modal's chat button: /inbox?conversation=<id>
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("conversation")
    if (wanted) setSelectedId(wanted) // eslint-disable-line react-hooks/set-state-in-effect
  }, [])
  const [search, setSearch] = useState("")
  const [searching, setSearching] = useState(false)
  // owner 2026-10-06: filters sync to the URL (?type=&read=&assignee=) so a reload or shared link keeps them
  const [typeFilter, setTypeFilter] = useQueryState<"all" | ConversationType>("type", "all")
  const [readFilter, setReadFilter] = useQueryState<"all" | "unread" | "read">("read", "all")
  const userId = useStore((s) => s.userId)
  const [assigneeFilter, setAssigneeFilter] = useQueryState<string>("assignee", "all")
  const assignees = [...new Set(conversations.map((c) => c.assigneeId).filter((x): x is string => !!x && x !== userId))]
  const assigneeChips = [
    { key: "all", label: "ทุกคน", count: conversations.length },
    { key: "me", label: "ของฉัน", count: conversations.filter((c) => c.assigneeId === userId).length },
    { key: "none", label: "ยังไม่มอบหมาย", count: conversations.filter((c) => !c.assigneeId).length },
    ...assignees.map((id) => ({ key: id, label: staff.find((x) => x.id === id)?.nickname ?? "—", count: conversations.filter((c) => c.assigneeId === id).length })),
  ]
  // list width: dragged on the divider, remembered on this device only
  const [listWidth, setListWidth] = useState(LIST_DEFAULT)
  useEffect(() => { try { const w = Number(localStorage.getItem("inbox.listWidth")); if (w) setListWidth(clampWidth(w)) } catch {} }, []) // eslint-disable-line react-hooks/set-state-in-effect
  const saveWidth = (w: number) => { const v = clampWidth(w); setListWidth(v); try { localStorage.setItem("inbox.listWidth", String(v)) } catch {} }
  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const x0 = e.clientX, w0 = listWidth
    let last = w0
    const move = (ev: PointerEvent) => { last = clampWidth(w0 + ev.clientX - x0); setListWidth(last) }
    const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); document.body.style.cursor = ""; saveWidth(last) }
    document.body.style.cursor = "col-resize"
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", up)
  }
  const [composing, setComposing] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const [openStudentId, setOpenStudentId] = useState<ID | null>(null)
  const [openLeadId, setOpenLeadId] = useState<ID | null>(null)
  const [openFamilyId, setOpenFamilyId] = useState<ID | null>(null)
  const [editingFamily, setEditingFamily] = useState<Family | null>(null)
  const [linking, setLinking] = useState(false)
  const [pickingLink, setPickingLink] = useState(false)
  const [creatingFamily, setCreatingFamily] = useState(false)
  const [creatingLead, setCreatingLead] = useState(false)
  const [sendingFormOpen, setSendingFormOpen] = useState(false)
  const [formType, setFormType] = useState<FormType | undefined>(undefined)
  const [exitStudent, setExitStudent] = useState<Student | null>(null)
  const [broadcasting, setBroadcasting] = useState(false)
  const sendImage = useStore((s) => s.sendChatImage)
  const imageInput = useRef<HTMLInputElement>(null)
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
    .filter((c) => assigneeFilter === "all" || (assigneeFilter === "none" ? !c.assigneeId : c.assigneeId === (assigneeFilter === "me" ? userId : assigneeFilter)))
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt))

  const selected = conversations.find((c) => c.id === selectedId) ?? null
  const thread = selected ? messages.filter((m) => m.conversationId === selected.id).sort((a, b) => a.at.localeCompare(b.at)) : []
  const family = selected?.familyId ? families.find((f) => f.id === selected.familyId) : null
  const lead = selected?.leadId ? leads.find((l) => l.id === selected.leadId) : null
  const isNote = draft.trim().startsWith("//")
  // the family's children still studying — "ลาออก" asks which one (a form already sent can be sent again)
  const kids = family ? students.filter((x) => x.familyId === family.id && !x.archived && x.exit?.status !== "closed") : []
  // owner 2026-10-05: which forms this chat already got (✓ + date in the "+" menu) — sending again is always allowed
  const surveyCamps = useStore((s) => s.surveyCampaigns)
  const lastAt = (xs: (string | undefined)[]) => xs.filter((x): x is string => !!x).sort().at(-1)
  const linkSent = (prefix: string) => lastAt(thread.filter((m) => m.author === "staff" && m.text.includes(`token=${prefix}`)).map((m) => m.at))
  const sentAt = {
    test: lastAt(thread.filter((m) => m.kind === "form_request" && m.meta?.formKind === "form_request" && m.meta.type === "test").map((m) => m.at)),
    trial: lastAt(thread.filter((m) => m.kind === "form_request" && m.meta?.formKind === "form_request" && m.meta.type === "trial").map((m) => m.at)),
    enroll: linkSent("pe_"),
    exit: lastAt([linkSent("pf_"), ...kids.map((k) => k.exit?.sentAt)]),
    survey: lastAt([linkSent("ps_"), ...surveyCamps.filter((c) => family && c.recipients.some((r) => r.familyId === family.id)).map((c) => c.sentAt)]),
  }
  const uploadImage = async (file: File) => {
    if (!selected) return
    const body = new FormData()
    body.append("file", file)
    body.append("conversationId", selected.id)
    setSending(true)
    try {
      const r = await fetch("/api/line/media", { method: "POST", body }).then((x) => x.json())
      if (!r.ok) return report({ ok: false, error: r.error ?? "อัปโหลดรูปไม่สำเร็จ" }, "")
      if (isLive(selected.id)) { syncLive(); report({ ok: true, value: undefined }, r.pushed ? "ส่งรูปทาง LINE แล้ว" : (r.note ?? "บันทึกรูปแล้ว")) }
      else report(sendImage(selected.id, r.mediaId), "ส่งรูปแล้ว")
    } catch {
      report({ ok: false, error: "เรียก API ไม่ได้" }, "")
    } finally {
      setSending(false)
    }
  }
  const isLive = (id: ID) => id.startsWith("line_")

  // pay slip sent in LINE → open this family's unpaid invoice with the photo attached to "บันทึกรับเงิน"
  const invoices = useStore((s) => s.invoices)
  const router = useRouter()
  const useAsSlip = (mediaId: string) => {
    const famId = family?.id ?? (lead?.trialStudentId ? students.find((s) => s.id === lead.trialStudentId)?.familyId : null)
    const kids = new Set(students.filter((s) => s.familyId && s.familyId === famId).map((s) => s.id))
    const open = invoices.filter((i) => kids.has(i.studentId) && (i.status === "approved" || i.status === "sent")).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (!open.length) return report({ ok: false, error: "แชทนี้ยังไม่มีใบแจ้งหนี้ที่รอชำระ — ผูกแชทกับครอบครัว/Lead และส่งใบแจ้งหนี้ก่อน" }, "")
    router.push(`/billing?open=${open[0].id}&slip=${mediaId}`)
  }

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
    // owner 2026-10-05: list + chat in one card, the divider between them drags to resize the list
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-7xl overflow-hidden rounded-3xl bg-card shadow-sm ring-1 ring-foreground/5">
      {/* Conversation list */}
      <div className="flex shrink-0 flex-col" style={{ width: listWidth }}>
        <div className="space-y-2 border-b p-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Inbox</h2>
              <p className="text-xs text-muted-foreground">{unreadCount(conversations) > 0 ? `${unreadCount(conversations)} ยังไม่อ่าน` : "อ่านครบแล้ว"}</p>
            </div>
            <div className="flex gap-1.5">
              {/* owner 2026-10-09: search is an icon like Broadcast — opens the box only when needed */}
              <Button size="icon-sm" variant={searching || search ? "default" : "outline"} aria-label="ค้นหา" title="ค้นหาชื่อ" onClick={() => { if (searching && !search) setSearching(false); else setSearching(true) }}><SearchIcon /></Button>
              <Button size="icon-sm" variant="outline" aria-label="Broadcast" title="Broadcast — ส่งถึงทุกคน" onClick={() => setBroadcasting(true)}><MegaphoneIcon /></Button>
              <Button size="icon-sm" variant="outline" aria-label="เริ่มบทสนทนาใหม่" onClick={() => setComposing(true)}><PenLineIcon /></Button>
            </div>
          </div>
          {(searching || search) && (
            <div className="relative">
              <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ค้นหาชื่อ…" className="pr-8" onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); setSearching(false) } }} />
              {search && <button type="button" aria-label="ล้าง" className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => { setSearch(""); setSearching(false) }}><XIcon className="size-4" /></button>}
            </div>
          )}
          {/* owner 2026-10-09: three dropdowns in one row — type · read · who looks after it (was a row of chips) */}
          <div className="grid grid-cols-3 gap-1.5">
            <NativeSelect value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
              options={[{ value: "all", label: "ทุกประเภท" }, ...(["customer", "lead", "contact"] as const).map((t) => ({ value: t, label: CONVERSATION_TYPE_LABEL[t] }))]} />
            <NativeSelect value={readFilter} onChange={(e) => setReadFilter(e.target.value as typeof readFilter)}
              options={[{ value: "all", label: "ทั้งหมด" }, { value: "unread", label: "ยังไม่อ่าน" }, { value: "read", label: "อ่านแล้ว" }]} />
            <NativeSelect value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} aria-label="ผู้ดูแล"
              options={assigneeChips.map((a) => ({ value: a.key, label: `${a.label} (${a.count})` }))} />
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

      <div role="separator" aria-orientation="vertical" aria-label="ลากเพื่อปรับความกว้างรายการแชท" tabIndex={0}
        onPointerDown={startResize} onDoubleClick={() => saveWidth(LIST_DEFAULT)}
        onKeyDown={(e) => { if (e.key === "ArrowLeft") saveWidth(listWidth - 16); if (e.key === "ArrowRight") saveWidth(listWidth + 16) }}
        className="group relative w-px shrink-0 cursor-col-resize bg-border outline-none hover:bg-primary/40 focus-visible:bg-primary">
        <span className="absolute inset-y-0 -right-1.5 -left-1.5" />
        <span className="absolute top-1/2 left-1/2 grid h-8 w-4 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"><GripVerticalIcon className="size-3.5" /></span>
      </div>

      {/* Chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
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
                <p className="mt-0.5 text-xs text-muted-foreground">{CHANNEL_LABEL[selected.channel]}</p>
              </div>
              {lead && (
                <Button size="sm" variant="outline" onClick={() => setSendingFormOpen(true)}><FileSignatureIcon /> ส่งฟอร์ม</Button>
              )}
              {/* owner 2026-10-05: assignee is an action next to the side-panel button, same size as the others */}
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button size="sm" variant="outline" aria-label="มอบหมายผู้ดูแล" className={cn(!selected.assigneeId && "text-muted-foreground")} />}>
                  <UserCheckIcon /> {selected.assigneeId ? staff.find((s) => s.id === selected.assigneeId)?.nickname : "มอบหมาย"} <ChevronDownIcon className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {staff.filter((s) => s.active && s.branchIds.includes(branch.id) && can(s, "inbox.manage")).map((s) => (
                    <DropdownMenuItem key={s.id} onClick={() => report(assign(selected.id, s.id), "มอบหมายแล้ว")}>
                      <CheckIcon className={cn(selected.assigneeId === s.id ? "opacity-100" : "opacity-0")} /> {s.nickname}
                    </DropdownMenuItem>
                  ))}
                  {selected.assigneeId && <><DropdownMenuSeparator /><DropdownMenuItem onClick={() => report(assign(selected.id, null), "ยกเลิกมอบหมายแล้ว")}>ยกเลิกมอบหมาย</DropdownMenuItem></>}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="icon-sm" variant="outline" aria-label="ข้อมูลติดต่อ"
                onClick={() => { if (family) setOpenFamilyId(family.id); else if (lead) setOpenLeadId(lead.id); else setLinking(true) }}
              >
                <InfoIcon />
              </Button>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {thread.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">เริ่มบทสนทนา</p>}
                {thread.map((m) => {
                  if (m.kind === "form_request") return <FormRequestBubble key={m.id} message={m} submissions={submissions} />
                  if (m.kind === "form_submission") return <FormSubmissionBubble key={m.id} message={m} conversation={selected} submissions={submissions} onChanged={pollSubmissions} />
                  return <MessageBubble key={m.id} message={m} conversation={selected} staff={staff} onUseAsSlip={useAsSlip} />
                })}
              </div>
              <div className="space-y-1.5 border-t p-3">
                <div className="flex gap-2">
                  {/* owner 2026-10-05: "+" before the type bar — send a form or a photo into this chat */}
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button size="icon" variant="outline" aria-label="แนบฟอร์ม / รูปภาพ" />}><PlusIcon /></DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="start" className="w-44">
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger><FileTextIcon /> ฟอร์ม</DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="w-64 whitespace-nowrap">
                          <DropdownMenuItem disabled={!lead} onClick={() => { setFormType("test"); setSendingFormOpen(true) }}><ClipboardListIcon /> Test Form{!lead ? <Hint>เฉพาะ Lead</Hint> : <Sent at={sentAt.test} />}</DropdownMenuItem>
                          <DropdownMenuItem disabled={!lead} onClick={() => { setFormType("trial"); setSendingFormOpen(true) }}><GraduationCapIcon /> Trial{!lead ? <Hint>เฉพาะ Lead</Hint> : <Sent at={sentAt.trial} />}</DropdownMenuItem>
                          <DropdownMenuItem disabled={!lead && !family} onClick={async () => report(await sendEnrollToChat(selected.id), "ส่งใบสมัครเรียนแล้ว")}><UserPlusIcon /> Enroll{!lead && !family ? <Hint>ผูกแชทก่อน</Hint> : <Sent at={sentAt.enroll} />}</DropdownMenuItem>
                          {kids.length > 1 ? (
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger><LogOutIcon /> ลาออก<Sent at={sentAt.exit} /></DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuGroup>
                                  <DropdownMenuLabel>ลูกคนไหน</DropdownMenuLabel>
                                  {kids.map((k) => <DropdownMenuItem key={k.id} onClick={() => setExitStudent(k)}>{k.nickname} · {k.grade}<Sent at={k.exit?.sentAt} /></DropdownMenuItem>)}
                                </DropdownMenuGroup>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>
                          ) : (
                            <DropdownMenuItem disabled={!kids.length} onClick={() => setExitStudent(kids[0])}><LogOutIcon /> ลาออก{!kids.length ? <Hint>เฉพาะลูกค้า</Hint> : <Sent at={sentAt.exit} />}</DropdownMenuItem>
                          )}
                          <DropdownMenuItem disabled={!family} onClick={async () => report(await sendSurveyToChat(selected.id), "ส่งแบบสอบถามความพึงพอใจแล้ว")}><HeartHandshakeIcon /> ความพึงพอใจ{!family ? <Hint>เฉพาะลูกค้า</Hint> : <Sent at={sentAt.survey} />}</DropdownMenuItem>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                      <DropdownMenuItem onClick={() => imageInput.current?.click()}><ImageIcon /> รูปภาพ</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <input ref={imageInput} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) uploadImage(f) }} />
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
          </>
        )}
      </div>

      {composing && <ComposeDialog onClose={() => setComposing(false)} onSent={(id) => { setComposing(false); if (id) select(id) }} />}
      {sendingFormOpen && selected && lead && (
        <SendFormDialog
          leadId={lead.id} branchId={lead.branchId} conversationId={selected.id} lineUserId={lead.lineUserId ?? ""} initialType={formType}
          onClose={() => { setSendingFormOpen(false); setFormType(undefined) }}
        />
      )}
      {linking && selected && (
        <Dialog open onOpenChange={(o) => !o && setLinking(false)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>เชื่อมโยงบทสนทนานี้</DialogTitle>
              <DialogDescription>ยังไม่ผูกกับครอบครัวหรือ Lead — บทสนทนานี้จะจำการผูกไว้ถาวร (แม้เป็นข้อความ LINE จริง)</DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Button className="w-full" onClick={() => { setLinking(false); setPickingLink(true) }}><UserSearchIcon /> ผูกกับลูกค้าเดิม / Lead</Button>
              <Button variant="outline" className="w-full" onClick={() => { setLinking(false); setCreatingLead(true) }}><PlusIcon /> สร้าง Lead ใหม่จากข้อความนี้</Button>
              <Button variant="outline" className="w-full" onClick={() => { setLinking(false); setCreatingFamily(true) }}><PlusIcon /> สร้างครอบครัวใหม่ (ลูกค้าเก่าที่ยังไม่มีในระบบ)</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {pickingLink && selected && (
        <CustomerPicker kinds={["student", "family", "lead"]} title="ผูกแชทนี้กับลูกค้า / Lead" onClose={() => setPickingLink(false)}
          onConfirm={(row) => {
            const familyId = row.kind === "family" ? row.id : row.kind === "student" ? row.familyId : null
            const ok = row.kind === "lead"
              ? report(linkLead(selected.id, row.id), `ผูก Lead "${row.title}" แล้ว`)
              : familyId ? report(linkFamily(selected.id, familyId), "ผูกครอบครัวแล้ว") : report({ ok: false, error: "นักเรียนคนนี้ยังไม่ผูกครอบครัว — ผูกครอบครัวในหน้านักเรียนก่อน" }, "")
            if (ok) setPickingLink(false)
          }} />
      )}
      {creatingFamily && selected && (
        <FamilyForm
          initialName={`ครอบครัว${selected.name.replace(/^(คุณแม่|คุณพ่อ|คุณ)\s*/, "").split(/\s+/).pop() ?? ""}`}
          initialParent={{ name: selected.name }}
          onClose={() => setCreatingFamily(false)}
          onSaved={(newFamily) => report(linkFamily(selected.id, newFamily.id), `สร้างและผูก "${newFamily.name}" แล้ว — เพิ่มลูกได้ที่หน้าครอบครัว`)}
        />
      )}
      {creatingLead && selected && (
        <LeadDialog
          initialName={selected.name}
          initial={{ source: SOURCE_OF_CHANNEL[selected.channel], assigneeId: selected.assigneeId }}
          onClose={() => setCreatingLead(false)}
          onSaved={(newLead) => report(linkLead(selected.id, newLead.id), `สร้างและผูก Lead "${newLead.name}" แล้ว`)}
        />
      )}
      {exitStudent && <ExitRequestDialog stu={exitStudent} onClose={() => setExitStudent(null)} onCloseNow={() => { setExitStudent(null); setOpenStudentId(exitStudent.id) }} />}
      {broadcasting && <BroadcastDialog conversations={conversations} onClose={() => { setBroadcasting(false); syncLive() }} />}
      <StudentSheet studentId={openStudentId} onClose={() => setOpenStudentId(null)} />
      <LeadSheet leadId={openLeadId} onClose={() => setOpenLeadId(null)} />
      <FamilySheet id={openFamilyId} onClose={() => setOpenFamilyId(null)} onEdit={(f) => setEditingFamily(f)} />
      {editingFamily && <FamilyForm family={editingFamily} onClose={() => setEditingFamily(null)} />}
    </div>
  )
}

/** why a menu item is greyed out — small, on the right, never wraps the label */
function Hint({ children }: { children: React.ReactNode }) {
  return <span className="ml-auto pl-3 text-[10px] font-normal">{children}</span>
}

/** ✓ the form already went to this chat (with when) — the item stays clickable to send it again */
function Sent({ at }: { at?: string }) {
  if (!at) return null
  return <span className="ml-auto flex items-center gap-1 pl-3 text-[10px] font-normal text-emerald-700" title="ส่งไปแล้ว — กดเพื่อส่งใหม่"><CheckCircle2Icon className="size-3.5 text-emerald-600" />ส่งแล้ว {fmtDate(at.slice(0, 10))}</span>
}
