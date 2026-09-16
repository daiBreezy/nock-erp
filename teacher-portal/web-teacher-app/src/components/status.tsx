import { cn } from "@/lib/utils"
import type { SubStatus } from "@/logic"

export function StatusIcon({ st, className }: { st: SubStatus; className?: string }) {
  const c = cn("inline-block size-[17px] align-middle", className)
  if (st === "none") return <span className="font-semibold text-muted-foreground">—</span>
  if (st === "pending")
    return <svg className={c} viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="#8a86a3" strokeWidth="2.2" /></svg>
  if (st === "prepared")
    return (
      <svg className={c} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="11" fill="#b8721e" />
        <path d="M12 12V7.2M12 12l3.4 2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  return (
    <svg className={c} viewBox="0 0 24 24" fill="#2fa76a">
      <path d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.5 6.71 4.69 3.1 5.5l.34 3.7L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12zm-12.91 4.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
    </svg>
  )
}

const PILL_LABEL: Record<SubStatus, string> = { prepared: "พร้อมส่ง", pending: "รอ", sended: "ส่งแล้ว", none: "—" }

export function StatusPill({ st }: { st: SubStatus }) {
  const cls: Record<SubStatus, string> = {
    prepared: "bg-amber-100 text-amber-700",
    pending: "text-muted-foreground",
    sended: "text-emerald-600",
    none: "text-muted-foreground",
  }
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 text-xs font-semibold", cls[st], st === "prepared" && "pl-1")}>
      <StatusIcon st={st} className="size-4" /> {PILL_LABEL[st]}
    </span>
  )
}
