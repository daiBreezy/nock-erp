"use client"

import { useEffect, useState } from "react"
import { PhoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fmtDate } from "@/domain/dates"
import * as Survey from "@/domain/rules/survey"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { pullSurveyResponses } from "@/lib/forms"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const CONT = { yes: "เรียนต่อ", maybe: "ยังไม่แน่ใจ", no: "ไม่เรียนต่อ" } as const

/**
 * Unhappy parents from the yearly survey (owner 2026-10-05: an action for the admin, so it lives on CRM — Reports only
 * shows the outcome): call within 3 days, note what came of it, and the family leaves this list.
 */
export function SurveyCalls({ branchId }: { branchId: ID }) {
  const responses = useStore((s) => s.surveyResponses)
  const families = useStore((s) => s.families)
  const followUp = useStore((s) => s.surveyFollowUp)
  const today = useNow(60_000).toISOString().slice(0, 10)
  const [notes, setNotes] = useState<Record<string, string>>({})
  useEffect(() => { pullSurveyResponses() }, [])
  const list = Survey.toCall(responses.filter((r) => r.branchId === branchId), today)
  if (!list.length) return null
  return (
    <section data-focus="survey_call" className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200 dark:bg-red-950/30 dark:ring-red-900">
      <p className="mb-2 flex items-center gap-2 font-semibold text-red-900 dark:text-red-100"><PhoneIcon className="size-5" /> ผู้ปกครองไม่พอใจ — โทรคุยภายใน {Survey.CALL_WITHIN_DAYS} วัน ({list.length})</p>
      <ul className="space-y-1.5">
        {list.map(({ r, due, overdue }) => {
          const fam = families.find((f) => f.id === r.familyId)
          const parent = fam?.parents.find((p) => p.primary) ?? fam?.parents[0]
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-background px-3 py-2 text-sm">
              <span className="font-medium">{fam?.name ?? "ครอบครัว"}</span>
              {parent && <a href={`tel:${parent.phone.replace(/\D/g, "")}`} className="text-xs text-sky-700 hover:underline">{parent.name} · {parent.phone}</a>}
              <span className="text-xs text-red-700">แนะนำเพื่อน {r.answers.nps ?? "—"}/10{r.answers.continueNext ? ` · ${CONT[r.answers.continueNext]}` : ""}</span>
              {r.answers.improve && <span className="text-xs text-muted-foreground">“{r.answers.improve}”</span>}
              <span className={cn("text-xs", overdue ? "font-medium text-red-700" : "text-muted-foreground")}>{overdue ? `เกินกำหนด (${fmtDate(due)})` : `โทรภายใน ${fmtDate(due)}`}</span>
              <span className="ml-auto flex min-w-64 flex-1 gap-1 sm:flex-none">
                <Input className="h-8 text-xs" placeholder="โทรแล้วได้อะไร" value={notes[r.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
                <Button size="sm" disabled={!notes[r.id]?.trim()} onClick={() => report(followUp(r.id, notes[r.id] ?? ""), "บันทึกการโทรแล้ว")}>บันทึก</Button>
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
