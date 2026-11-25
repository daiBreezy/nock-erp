/**
 * owner 2026-11-25 — when may a form be sent to a lead?
 *   • ONE live link at a time: while a Test / Trial / enroll link is still waiting for the parent, nothing else can be sent.
 *   • Sending the SAME form again = "ส่งใหม่": the old link is cancelled first (otherwise the parent holds two live links and may answer both).
 *   • A link that was answered (approve / reject can follow — no need to wait), expired or cancelled no longer counts.
 * The server enforces the same (one waiting link per lead / chat); this decides what the panel offers.
 */
export type FormKind = "test" | "trial" | "enroll"
export type LinkState = "waiting" | "answered" | "expired" | "cancelled"
export interface SentLink { token: string; kind: FormKind; sentAt: string; state: LinkState }

export const FORM_LABEL: Record<FormKind, string> = { test: "ฟอร์ม Test", trial: "ฟอร์ม Trial", enroll: "ใบสมัครเรียน" }

export type SendDecision =
  | { action: "send" }
  | { action: "resend"; replaces: SentLink }
  | { action: "blocked"; blocking: SentLink; reason: string }

export function decideSend(kind: FormKind, links: SentLink[]): SendDecision {
  const waiting = links.filter((l) => l.state === "waiting").sort((a, b) => b.sentAt.localeCompare(a.sentAt))
  if (!waiting.length) return { action: "send" }
  const same = waiting.find((l) => l.kind === kind)
  if (same) return { action: "resend", replaces: same }
  const other = waiting[0]
  return { action: "blocked", blocking: other, reason: `รอผู้ปกครองกรอก${FORM_LABEL[other.kind]} — ส่งฟอร์มอื่นไม่ได้` }
}

/** the link a send must cancel first (the same kind that is still waiting), if any */
export const linkToReplace = (kind: FormKind, links: SentLink[]): SentLink | undefined => {
  const d = decideSend(kind, links)
  return d.action === "resend" ? d.replaces : undefined
}
