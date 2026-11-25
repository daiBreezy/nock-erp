import { revokeToken, waitingLinksFor } from "./form-store"
import { revokeEnrollToken, waitingEnrollLinksFor } from "./parent-form-store"

type Kind = "test" | "trial" | "enroll"

export const blockedMessage = (kind: Kind) =>
  `ยังรอผู้ปกครองกรอก ${kind === "test" ? "ฟอร์ม Test" : kind === "trial" ? "ฟอร์ม Trial" : "ใบสมัครเรียน"} ที่ส่งไปแล้ว — ส่งฟอร์มอื่นไม่ได้ (ยกเลิกลิงก์เดิมก่อน)`

/**
 * owner 2026-11-25: ONE live form link per lead / chat. Called right before a new Test / Trial / enroll link is minted:
 *  • a DIFFERENT kind is still waiting for the parent → refuse;
 *  • the SAME kind is still waiting → this is "ส่งใหม่": the old link is cancelled (the parent must not hold two live links), then the new one may be made.
 * Answered / expired / cancelled links no longer count.
 */
export async function claimSend(q: { leadId?: string; conversationId?: string | null }, kind: Kind): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!q.leadId && !q.conversationId) return { ok: true }
  const waiting = [...(await waitingLinksFor(q)), ...(await waitingEnrollLinksFor(q))]
  const other = waiting.filter((l) => l.kind !== kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
  if (other) return { ok: false, error: blockedMessage(other.kind) }
  for (const l of waiting) await (l.kind === "enroll" ? revokeEnrollToken(l.token) : revokeToken(l.token))
  return { ok: true }
}
