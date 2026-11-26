"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { buildFormItems, type FormItem } from "@/domain/rules/form-hub"
import type { EnrollSubmission, Family } from "@/domain/types"
import { fetchEnrollSubmissions } from "@/lib/forms"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-26 — every form sent to a family, in one list (the "ฟอร์มทั้งหมด" tab) · the ones not done yet are what the overview shows.
 * Enroll answers live on the server, so they are fetched here; everything else is already in the store.
 */
export function useFormItems(family: Family) {
  const students = useStore((s) => s.students)
  const invoices = useStore((s) => s.invoices)
  const sends = useStore((s) => s.formSends)
  const responses = useStore((s) => s.formResponses)
  const forms = useStore((s) => s.formDefs)
  const campaigns = useStore((s) => s.surveyCampaigns)
  const surveyAnswers = useStore((s) => s.surveyResponses)
  const conv = useStore((s) => s.conversations.find((c) => c.familyId === family.id))
  const [subs, setSubs] = useState<EnrollSubmission[]>([])
  const kids = useMemo(() => students.filter((x) => x.familyId === family.id && !x.archived), [students, family.id])
  const mine = useMemo(() => (sends ?? []).filter((x) => x.familyId === family.id), [sends, family.id])
  const load = useCallback(() => {
    const tokens = new Set(mine.filter((x) => x.kind === "enroll").map((x) => x.token))
    void fetchEnrollSubmissions().then((xs) => setSubs(xs.filter((x) => tokens.has(x.token) || (!!conv && x.conversationId === conv.id)).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)))).catch(() => undefined)
  }, [mine, conv])
  useEffect(load, [mine.length, conv?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const items: FormItem[] = useMemo(() => buildFormItems({
    family, kids, sends: mine, enrollSubs: subs, invoices,
    responses: responses.filter((r) => r.familyId === family.id),
    formNames: Object.fromEntries(forms.map((f) => [f.id, f.name])),
    surveys: campaigns.filter((c) => c.recipients.some((r) => r.familyId === family.id)).map((c) => ({ key: c.id, year: c.year, sentAt: c.sentAt, answeredAt: surveyAnswers.find((a) => a.campaignId === c.id && a.familyId === family.id)?.submittedAt })),
  }), [family, kids, mine, subs, invoices, responses, forms, campaigns, surveyAnswers])
  return { items, subs, reload: load }
}
