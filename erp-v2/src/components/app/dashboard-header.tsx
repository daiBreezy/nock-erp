import { fmtDate } from "@/domain/dates"
import { tx } from "@/lib/i18n"

/** Shared "สวัสดี {ชื่อ}" greeting — was duplicated almost verbatim between the old Dashboard and Today
 *  pages (owner 2026-10-06: merged into one page, this is the one header both versions now share). */
export function DashboardHeader({ name, today, branchName }: { name: string; today: string; branchName: string }) {
  return (
    <div>
      <h2 className="text-xl font-semibold">{tx("สวัสดี")} {name}</h2>
      <p className="text-sm text-muted-foreground">{fmtDate(today, { weekday: true, year: true })}  {tx("· สาขา")}{branchName}</p>
    </div>
  )
}
