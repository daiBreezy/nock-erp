"use client"

import { avatarTone, initial } from "@/components/app/subject-color"
import { fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation, Staff } from "@/domain/types"
import { cn } from "@/lib/utils"

/** Plain text bubble / internal note — the default rendering for any message without a `kind`. */
export function MessageBubble({ message, conversation, staff }: { message: ChatMessage; conversation: Conversation; staff: Staff[] }) {
  if (message.author === "internal") {
    return (
      <div className="flex justify-center">
        <div className="max-w-[75%] rounded-xl border border-dashed border-amber-400 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <b>โน้ตภายใน</b> — {staff.find((s) => s.id === message.senderId)?.nickname}
          <div className="mt-0.5">{message.text}</div>
        </div>
      </div>
    )
  }
  const isStaff = message.author === "staff"
  return (
    <div className={cn("flex items-end gap-2", isStaff && "flex-row-reverse")}>
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold", avatarTone(isStaff ? (message.senderId ?? "staff") : conversation.id))}>
        {isStaff ? initial(staff.find((s) => s.id === message.senderId)?.nickname ?? "A") : initial(conversation.name)}
      </span>
      <div className={cn("max-w-[70%] rounded-2xl px-3 py-2 text-sm", isStaff ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-muted")}>
        {message.text}
        <div className={cn("mt-1 text-[10px]", isStaff ? "text-primary-foreground/70" : "text-muted-foreground")}>{fmtDateTime(message.at)}</div>
      </div>
    </div>
  )
}
