"use client"

import { LockIcon } from "lucide-react"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"
import { fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation, Staff } from "@/domain/types"
import { cn } from "@/lib/utils"

/**
 * Plain text message / internal note — the default rendering for any message without a `kind`.
 * owner 2026-10-15 (like ChatGPT): our side = grey bubble on the right, the parent = plain text on the left, no colour ·
 * no time on the bubble — the day is a separator above, the date & time (and who sent it) show on hover
 */
export function MessageBubble({ message, conversation, staff, onUseAsSlip }: { message: ChatMessage; conversation: Conversation; staff: Staff[]; onUseAsSlip?: (mediaId: string) => void }) {
  const sender = message.senderId ? staff.find((s) => s.id === message.senderId)?.nickname : undefined
  if (message.author === "internal") {
    return (
      <SentAt message={message} who={sender} align="center">
        <Marker className="mx-auto w-fit max-w-[85%] items-start text-xs text-amber-800 dark:text-amber-300">
          <MarkerIcon className="mt-px [&>svg]:size-3.5"><LockIcon /></MarkerIcon>
          <MarkerContent><b className="font-medium">โน้ตภายใน{sender ? ` · ${sender}` : ""}</b> — {message.text}</MarkerContent>
        </Marker>
      </SentAt>
    )
  }
  const isStaff = message.author === "staff"
  const isImage = message.meta?.formKind === "image"
  return (
    <div className={cn("flex", isStaff && "justify-end")}>
      <SentAt message={message} who={isStaff ? sender ?? "ทีมงาน" : conversation.name} align={isStaff ? "end" : "start"}>
        <div className={cn("text-sm leading-relaxed whitespace-pre-wrap", isStaff ? "max-w-[75%] rounded-3xl bg-muted px-4 py-2.5" : "max-w-[85%] py-1", isStaff && isImage && "bg-transparent p-0")}>
          {isImage ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- parent's LINE photo served by our own route */}
              <img src={`/api/line/media/${(message.meta as { mediaId: string }).mediaId}`} alt={isStaff ? "รูปที่ส่ง" : "รูปจากผู้ปกครอง"} className="max-h-72 rounded-2xl" />
              {onUseAsSlip && !isStaff && (
                <button type="button" onClick={() => onUseAsSlip((message.meta as { mediaId: string }).mediaId)} className="mt-1.5 inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                  🧾 ใช้เป็นสลิป → บันทึกรับเงิน
                </button>
              )}
            </>
          ) : message.text}
        </div>
      </SentAt>
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
