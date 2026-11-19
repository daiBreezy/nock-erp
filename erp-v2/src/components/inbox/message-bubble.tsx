"use client"

import { LockIcon } from "lucide-react"
import { DocThumbs, type DocItem } from "@/components/billing/doc-thumbs"
import { useStore } from "@/store/store"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation, Staff } from "@/domain/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { avatarTone, initial } from "@/components/app/subject-color"
import { MEMBER_ROLE_LABEL } from "@/domain/rules/inbox"

/**
 * Plain text message / internal note — the default rendering for any message without a `kind`.
 * owner 2026-10-15 (like ChatGPT): our side = grey bubble on the right, the parent = plain text on the left, no colour ·
 * (2026-11-12: the parent's bubble is a faint grey outline, ours a grey fill) · no time on the bubble — the day is a separator above, the date & time (and who sent it) show on hover
 */
export function MessageBubble({ message, conversation, staff, onUseAsSlip, memberLabel, continued }: { message: ChatMessage; conversation: Conversation; staff: Staff[]; onUseAsSlip?: (mediaId: string) => void; memberLabel?: { name: string; role: "parent" | "student" | "follower" | null }; continued?: boolean }) {
  const sender = message.senderId ? staff.find((s) => s.id === message.senderId)?.nickname : undefined
  if (message.author === "internal") {
    return (
      <SentAt message={message} who={sender} align="center">
        <Marker className="mx-auto w-fit max-w-[85%] items-start text-xs text-warning-ink">
          <MarkerIcon className="mt-px [&>svg]:size-3.5"><LockIcon /></MarkerIcon>
          <MarkerContent><b className="font-medium">โน้ตภายใน{sender ? ` · ${sender}` : ""}</b> — {message.text}</MarkerContent>
        </Marker>
      </SentAt>
    )
  }
  const isStaff = message.author === "staff"
  const isImage = message.meta?.formKind === "image"
  // LINE group: several people share one thread → name + avatar say which of them wrote it (colour stable per person)
  const member = !isStaff && conversation.group && message.sender ? { userId: message.sender.userId, name: memberLabel?.name ?? message.sender.name, role: memberLabel?.role ?? null } : undefined
  return (
    // a run of messages from the same person in a group shares ONE avatar + name (the next ones sit closer, under the first)
    <div className={cn("flex", isStaff && "justify-end", member && "items-start gap-2.5", member && continued && "-mt-4")}>
      {member && (continued ? <span className="size-7 shrink-0" aria-hidden /> : <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(member.userId))}>{initial(member.name)}</span>)}
      <div className={cn("min-w-0", isStaff ? "max-w-[75%]" : "max-w-[85%]")}>
      {member && !continued && <div className="mb-1 px-1 text-xs font-medium text-muted-foreground">{member.name}{member.role && <span className="font-normal"> · {MEMBER_ROLE_LABEL[member.role]}</span>}</div>}
      <SentAt message={message} who={isStaff ? sender ?? "ทีมงาน" : member?.name ?? conversation.name} align={isStaff ? "end" : "start"}>
        <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", "w-fit rounded-3xl px-3.5 py-2", isStaff ? "bg-muted" : "border border-border", isImage && "border-0 bg-transparent p-0")}>
          {isImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- parent's LINE photo served by our own route */}
              <img src={`/api/line/media/${(message.meta as { mediaId: string }).mediaId}`} alt={isStaff ? "รูปที่ส่ง" : "รูปจากผู้ปกครอง"} className="max-h-72 rounded-2xl" />
              {onUseAsSlip && !isStaff && (
                <Button variant="outline" size="inline" type="button" onClick={() => onUseAsSlip((message.meta as { mediaId: string }).mediaId)} className="mt-1.5 inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                  🧾 ใช้เป็นสลิป → บันทึกรับเงิน
                </Button>
              )}
            </>
          ) : message.text}
        </div>
      </SentAt>
      {message.meta?.formKind === "invoice_doc" && <InvoiceDocs ids={message.meta.invoiceIds} />}
      </div>
    </div>
  )
}

/** the invoice(s) sent with this message (owner 2026-11-19): a thumbnail of each document under the text — click always opens the preview (PDF viewer with download / share) */
function InvoiceDocs({ ids }: { ids: string[] }) {
  const invoices = useStore((s) => s.invoices)
  const docs: DocItem[] = ids.map((id) => invoices.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x)
    .map((inv) => ({ key: inv.id, kind: "invoice" as const, label: `ใบแจ้งหนี้ ${inv.number ?? ""}`.trim(), src: `/print/invoice/${inv.id}` }))
  if (!docs.length) return null
  return (
    <div className="mt-1.5 flex items-center justify-end gap-2">
      <span className="truncate text-xs text-muted-foreground">{docs.length > 1 ? `ใบแจ้งหนี้ ${docs.length} ใบ` : docs[0].label}</span>
      <DocThumbs docs={docs} size={88} />
    </div>
  )
}

/** hover a message → who sent it + date & time */
function SentAt({ message, who, align, children }: { message: ChatMessage; who?: string; align: "start" | "end" | "center"; children: React.ReactElement }) {
  return (
    <HoverCard>
      <HoverCardTrigger render={children} />
      <HoverCardContent side="top" align={align} className="w-auto px-2.5 py-1.5 text-xs">
        {who && <span className="font-medium">{who} · </span>}
        <span className="text-muted-foreground">{fmtDateTime(message.at)}</span>
      </HoverCardContent>
    </HoverCard>
  )
}
