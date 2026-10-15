"use client"

import { FileTextIcon } from "lucide-react"
import { Confirmation, ConfirmationBody, ConfirmationHeader } from "@/components/ai-elements/confirmation"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { ChatMessage, FormRequestMeta, FormSubmission } from "@/domain/types"

/** Staff→parent request recap — status-only, no actions (the parent's own submission card owns those).
 *  Same Confirmation shell as the approve / reject card, on our side of the chat. */
export function FormRequestBubble({ message, submissions }: { message: ChatMessage; submissions: FormSubmission[] }) {
  const meta = message.meta as FormRequestMeta
  const status = submissions.find((s) => s.token === meta.token)?.status ?? "waiting"
  return (
    <div className="flex justify-end">
      <Confirmation state={status} className="max-w-sm">
        <ConfirmationHeader state={status} icon={<FileTextIcon />} title={<>ส่งฟอร์ม{FORM_TYPE_LABEL[meta.type]}</>} />
        <ConfirmationBody className="pl-[3.25rem] text-xs text-muted-foreground">{meta.subjects.join(", ")}</ConfirmationBody>
      </Confirmation>
    </div>
  )
}
