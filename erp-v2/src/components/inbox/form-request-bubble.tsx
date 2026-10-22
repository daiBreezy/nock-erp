"use client"

import { ClipboardListIcon, ExternalLinkIcon, FileTextIcon, HeartHandshakeIcon, LogOutIcon, UserPlusIcon } from "lucide-react"
import { FORM_LINK_LABEL, formLinkOf } from "@/domain/rules/inbox"
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

const LINK_ICON = { exit: <LogOutIcon />, enroll: <UserPlusIcon />, survey: <HeartHandshakeIcon />, custom: <ClipboardListIcon /> } as const

/** owner 2026-10-15: the exit / enroll / survey links we send look like the Test / Trial card — not a raw text + URL */
export function FormLinkBubble({ message, answered }: { message: ChatMessage; answered: boolean }) {
  const link = formLinkOf(message)!
  const state = answered ? "answered" : "waiting"
  return (
    <div className="flex justify-end">
      <Confirmation state={state} className="max-w-sm">
        <ConfirmationHeader state={state} icon={LINK_ICON[link.form]} title={link.form === "custom" ? `${FORM_LINK_LABEL.custom} “${link.who ?? ""}”` : FORM_LINK_LABEL[link.form]} />
        <ConfirmationBody className="flex items-center gap-2 pl-[3.25rem] text-xs text-muted-foreground">
          {link.who && link.form !== "custom" && <span className="truncate">{link.who}</span>}
          <a href={link.url} target="_blank" rel="noreferrer" className="ml-auto inline-flex shrink-0 items-center gap-1 hover:text-foreground hover:underline"><ExternalLinkIcon className="size-3" />เปิดลิงก์</a>
        </ConfirmationBody>
      </Confirmation>
    </div>
  )
}
