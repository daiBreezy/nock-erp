"use client"

import type { ChatMessage, FormSubmission, FormSubmissionMeta } from "@/domain/types"
import { SubmissionReviewCard } from "./submission-review-card"

/** Parent's submission, shown inline on the parent's side — the shared review card (a Confirmation) */
export function FormSubmissionBubble({
  message, submissions, onChanged,
}: {
  message: ChatMessage; submissions: FormSubmission[]; onChanged: () => void
}) {
  const meta = message.meta as FormSubmissionMeta
  const sub = submissions.find((s) => s.id === meta.submissionId)
  return sub ? <SubmissionReviewCard submission={sub} onChanged={onChanged} /> : <p className="text-sm">{message.text}</p>
}
