"use client"

import { FileTextIcon } from "lucide-react"
import { Pill, type Tone } from "@/components/app/badges"
import { fmtDateTime } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { ChatMessage, FormRequestMeta, FormSubmission } from "@/domain/types"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<"waiting" | "pending" | "approved" | "rejected", string> = {
  waiting: "รอผู้ปกครองตอบ",
  pending: "รออนุมัติ",
  approved: "อนุมัติแล้ว",
  rejected: "ปฏิเสธแล้ว",
}
const STATUS_TONE: Record<keyof typeof STATUS_LABEL, Tone> = { waiting: "gray", pending: "amber", approved: "green", rejected: "red" }

/** Staff→parent request recap — status-only, no actions (the parent's own submission bubble owns those). */
export function FormRequestBubble({ message, submissions }: { message: ChatMessage; submissions: FormSubmission[] }) {
  const meta = message.meta as FormRequestMeta
  const submission = submissions.find((s) => s.token === meta.token)
  const status = submission?.status ?? "waiting"

  return (
    <div className="flex flex-row-reverse items-end gap-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">A</span>
      <div className="max-w-[70%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
        <div className="flex items-center gap-1.5 font-medium"><FileTextIcon className="size-3.5" /> ส่งฟอร์ม{FORM_TYPE_LABEL[meta.type]}</div>
        <div className="mt-1 text-xs text-primary-foreground/85">{meta.subjects.join(", ")}</div>
        <div className={cn("mt-1.5")}>
          <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
        </div>
        <div className="mt-1 text-[10px] text-primary-foreground/70">{fmtDateTime(message.at)}</div>
      </div>
    </div>
  )
}
