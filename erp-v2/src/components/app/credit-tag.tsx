import { CreditCardIcon } from "lucide-react"
import { tagChip } from "@/components/app/tags"
import { cn } from "@/lib/utils"

/** "Credit Course" — the student studies on credit: the course is added, the invoice is still to come (owner 2026-11-19).
 *  One tag, one colour app-wide (tags.ts `studentCredit`). */
export function CreditTag({ className, label = "Credit Course" }: { className?: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tagChip("studentCredit", "credit"), className)}>
      <CreditCardIcon className="size-3" />{label}
    </span>
  )
}
