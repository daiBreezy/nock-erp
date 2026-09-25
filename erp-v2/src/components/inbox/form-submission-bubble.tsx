"use client"

import { avatarTone, initial } from "@/components/app/subject-color"
import { fmtDateTime } from "@/domain/dates"
import type { ChatMessage, Conversation, FormSubmission, FormSubmissionMeta } from "@/domain/types"
import { cn } from "@/lib/utils"
import { SubmissionReviewCard } from "./submission-review-card"

/** Parent's submission, shown inline — wraps the shared review card in the chat-bubble shell. */
export function FormSubmissionBubble({
  message, conversation, submissions, onChanged,
}: {
  message: ChatMessage; conversation: Conversation; submissions: FormSubmission[]; onChanged: () => void
}) {
  const meta = message.meta as FormSubmissionMeta
  const sub = submissions.find((s) => s.id === meta.submissionId)

  return (
    <div className="flex items-end gap-2">
      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold", avatarTone(conversation.id))}>{initial(conversation.name)}</span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm">
        {sub ? <SubmissionReviewCard submission={sub} onChanged={onChanged} /> : message.text}
        <div className="mt-1 text-[10px] text-muted-foreground">{fmtDateTime(message.at)}</div>
      </div>
    </div>
  )
}
