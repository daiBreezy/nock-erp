"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { endTime, fmtDate } from "@/domain/dates"
import { FORM_TYPE_LABEL } from "@/domain/rules/forms"
import type { FormSubjectOffer, FormType } from "@/domain/types"
import { tx } from "@/lib/i18n"

/**
 * owner 2026-11-20: "Preview Form" on a form we SENT — what the parent was offered: the form's type, and for each subject every time they can pick
 * from (day by day). Read only. Read from the form's own link, so it shows exactly what the parent sees; once the link is used / has expired it
 * says so and points to the parent's answers.
 */
export function FormRequestPreviewDialog({ token, type, onClose }: { token: string; type: FormType; onClose: () => void }) {
  const [state, setState] = useState<{ loading: true } | { loading: false; ok: true; offers: FormSubjectOffer[]; branchName?: string; grades: string[]; bus?: boolean; used?: boolean } | { loading: false; ok: false }>({ loading: true })
  useEffect(() => {
    let live = true
    fetch(`/api/forms/token?token=${encodeURIComponent(token)}&peek=1`).then((r) => r.json()).then((d) => {
      if (!live) return
      setState(d?.ok ? { loading: false, ok: true, offers: d.offers ?? [], branchName: d.branchName, grades: d.grades ?? [], bus: d.bus, used: d.used } : { loading: false, ok: false })
    }).catch(() => live && setState({ loading: false, ok: false }))
    return () => { live = false }
  }, [token])
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[92vh] flex-col gap-3 lg:max-w-lg">
        <DialogHeader>
          <DialogTitle>{tx("ฟอร์ม{0} ที่ส่งให้ผู้ปกครอง", [FORM_TYPE_LABEL[type]])}</DialogTitle>
          <DialogDescription>สิ่งที่ผู้ปกครองเห็นและเลือกได้ (อ่านอย่างเดียว)</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1 text-sm">
          {state.loading && <p className="py-6 text-center text-muted-foreground">กำลังโหลด…</p>}
          {!state.loading && !state.ok && <p className="py-6 text-center text-muted-foreground">ไม่พบฟอร์มนี้</p>}
          {!state.loading && state.ok && (
            <>
              {state.used && <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">ผู้ปกครองกรอกฟอร์มนี้แล้ว — ดูคำตอบที่ Preview Form บนการ์ดที่ส่งกลับมา</p>}
              {(state.branchName || state.grades.length > 0) && (
                <p className="text-xs text-muted-foreground">{[state.branchName, state.grades.length ? tx("ให้เลือกชั้น {0}", [state.grades.join(", ")]) : ""].filter(Boolean).join(" · ")}</p>
              )}
              {state.offers.map((o) => <OfferDays key={o.subject} offer={o} />)}
            </>
          )}
        </div>
        <div className="flex justify-end"><Button variant="outline" onClick={onClose}>ปิด</Button></div>
      </DialogContent>
    </Dialog>
  )
}

function OfferDays({ offer }: { offer: FormSubjectOffer }) {
  const days = useMemo(() => {
    const m = new Map<string, FormSubjectOffer["slots"]>()
    for (const s of [...offer.slots].sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))) m.set(s.date, [...(m.get(s.date) ?? []), s])
    return [...m.entries()]
  }, [offer.slots])
  return (
    <section className="space-y-1.5 border-t pt-3 first:border-t-0 first:pt-0">
      <h3 className="text-sm font-semibold">{offer.subject} <span className="text-xs font-normal text-muted-foreground">{tx("{0} เวลาให้เลือก", [offer.slots.length])}</span></h3>
      {days.length === 0 && <p className="text-xs text-muted-foreground">ไม่มีเวลาให้เลือก</p>}
      <dl className="grid grid-cols-[6.5rem_1fr] gap-x-3 gap-y-1.5">
        {days.map(([date, list]) => (
          <div key={date} className="contents">
            <dt className="pt-0.5 text-xs text-muted-foreground">{fmtDate(date, { weekday: true })}</dt>
            <dd className="flex flex-wrap gap-1">
              {list.map((s) => (
                <span key={s.id} className="rounded-full border px-2 py-0.5 text-xs tabular-nums">{s.start}–{endTime(s.start, s.minutes)}{s.source === "class" && <span className="ml-1 text-muted-foreground">· คลาสเดิม</span>}</span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
