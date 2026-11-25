"use client"

import { useState } from "react"
import { ChevronDownIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fmtDate } from "@/domain/dates"
import { leadHistory, leadOfFamily } from "@/domain/rules/lead-history"
import type { Family } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const LABEL = { created: "สร้าง Lead", test: "ทดสอบ", trial: "ทดลองเรียน", enroll: "Enroll" } as const

/**
 * owner 2026-11-25: the Lead part of a Customer's story — folded away (nobody needs it once they have paid), a plain straight timeline when opened:
 * what happened, when, and the result. Shown only for a family that came from a Lead.
 */
export function LeadHistory({ family }: { family: Family }) {
  const leads = useStore((s) => s.leads)
  const students = useStore((s) => s.students)
  const assessments = useStore((s) => s.assessments)
  const invoices = useStore((s) => s.invoices)
  const [open, setOpen] = useState(false)
  const lead = leadOfFamily(family.id, leads, students)
  if (!lead) return null
  const events = leadHistory(lead, assessments, students, invoices)
  return (
    <section className="space-y-2 border-t pt-3">
      <Button variant="row" size="inline" type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 py-1 text-left text-sm">
        <span className="flex-1 font-semibold">{tx("ประวัติ Lead")}</span>
        <span className="text-xs text-muted-foreground">{events.length} {tx("เหตุการณ์")}</span>
        <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </Button>
      {open && (
        <ol className="space-y-2 border-l pl-4 text-sm">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute top-1.5 -left-5.25 size-2 rounded-full bg-border" />
              <p>{e.who ? `${e.who} ` : ""}{tx(LABEL[e.kind])} <span className="text-xs text-muted-foreground">· {fmtDate(e.at, { year: true })}</span></p>
              {e.result && <p className="text-xs text-muted-foreground">{tx("ผล")}: {e.result}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
