// Dashboard box standard (owner 2026-11-10: "padding ในหน้าเดียวกันต้องเท่ากัน"). ONE source of truth for every box
// on the dashboard so they never drift again: padding 16px (p-4) · radius rounded-3xl (22px) · soft ring.
//  - raw boxes (Hero / Alert / Sales) spread DASH_BOX on their <section>.
//  - boxes built on the shared <Card> (คาบ / Pulse) use <DashCard>, which pins the same 16px padding (the card's `sm`
//    size token) and the same radius — so a <Card> on the dashboard matches the raw boxes exactly.
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export const DASH_BOX = "rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5"

/** the shared <Card>, pinned to the dashboard box standard (16px padding via the sm size token, rounded-3xl radius) */
export function DashCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card data-size="sm" className={cn("rounded-3xl", className)} {...props} />
}
