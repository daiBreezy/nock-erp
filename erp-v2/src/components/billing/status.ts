import type { Tone } from "@/components/app/badges"
import type { Invoice } from "@/domain/types"

export function invoiceTone(inv: Invoice): Tone {
  if (inv.status === "void") return "red"
  if (inv.status === "paid") return "green"
  if (inv.status === "pending_approval") return "amber"
  if (inv.status === "sent" || inv.status === "approved") return "blue"
  return "gray"
}
