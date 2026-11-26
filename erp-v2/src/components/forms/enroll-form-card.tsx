"use client"

import { useMemo, useState } from "react"
import { CheckIcon, ChevronDownIcon, CircleDashedIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { enrollFormReadiness } from "@/domain/rules/form-hub"
import type { Family } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-26 — what is inside the Enroll Form, shown only when its card is expanded: what we already have (the parent won't retype it) ·
 * what the parent still has to fill · what comes back into the ERP. (The card itself is form-card.tsx; the invoice is bound from the invoice.)
 */
export function EnrollDetail({ family }: { family: Family }) {
  const students = useStore((s) => s.students)
  const kids = useMemo(() => students.filter((x) => x.familyId === family.id && !x.archived), [students, family.id])
  const ready = useMemo(() => enrollFormReadiness(family, kids), [family, kids])
  // owner 2026-11-26: every group folds on its own (the form can be long — nothing is forced open but "what the parent still fills")
  const Block = ({ title, count, defaultOpen, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) => {
    const [open, setOpen] = useState(!!defaultOpen)
    return (
      <div className="rounded-xl bg-background">
        <Button variant="row" size="inline" type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
          <span className="flex-1 font-medium">{title}</span>
          {count !== undefined && <span className="text-xs text-muted-foreground">{count}</span>}
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </Button>
        {open && <ul className="space-y-1 px-3 pb-2.5 text-xs">{children}</ul>}
      </div>
    )
  }
  return (
    <div className="space-y-2">
      <Block title={tx("ผู้ปกครองต้องกรอก")} count={ready.missing.length} defaultOpen>
        {ready.missing.length ? ready.missing.map((f) => <li key={f.key} className="flex items-center gap-2"><CircleDashedIcon className="size-3.5 shrink-0 text-muted-foreground" />{f.label}</li>) : <li className="text-muted-foreground">{tx("ข้อมูลครบแล้ว — ผู้ปกครองแค่ตรวจและยืนยัน")}</li>}
      </Block>
      <Block title={tx("เรามีข้อมูลอยู่แล้ว (ไม่ต้องกรอกซ้ำ)")} count={ready.known.length}>
        {ready.known.length ? ready.known.map((f) => <li key={f.key} className="flex items-center gap-2"><CheckIcon className="size-3.5 shrink-0 text-primary" /><span className="shrink-0">{f.label}</span>{f.value && <span className="min-w-0 flex-1 truncate text-right text-muted-foreground">{f.value}</span>}</li>) : <li className="text-muted-foreground">{tx("ยังไม่มีข้อมูล")}</li>}
      </Block>
      <Block title={tx("ส่งแล้วจะได้กลับมา")}>
        {ready.returns.map((r) => <li key={r.label} className="flex gap-2"><span className="flex-1">{tx(r.label)}</span><span className="shrink-0 text-muted-foreground">→ {tx(r.to)}</span></li>)}
      </Block>
    </div>
  )
}
