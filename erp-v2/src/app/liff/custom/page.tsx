"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle2Icon, LoaderCircleIcon, XCircleIcon } from "lucide-react"
import { FormRenderer } from "@/components/forms/form-renderer"
import type { CustomFormToken, FormAnswer, ID } from "@/domain/types"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

// A form the company built in Settings › System › ฟอร์ม (owner 2026-10-22), as the family fills it in — opened from
// the LINE link. The link carries a copy of the form, so it reads nothing from the ERP. TH / EN / JP for the page's own
// words; the questions are the company's.

type Phase = "init" | "invalid" | "ready" | "sending" | "done"
const LANGS = [{ key: "th", label: "TH" }, { key: "en", label: "EN" }, { key: "ja", label: "JP" }] as const

export default function CustomFormPage() {
  return <Suspense fallback={null}><CustomForm /></Suspense>
}

function CustomForm() {
  const token = useSearchParams().get("token") ?? ""
  const lang = useUiLang((s) => s.lang)
  const setLang = useUiLang((s) => s.setLang)
  const [phase, setPhase] = useState<Phase>(token ? "init" : "invalid")
  const [why, setWhy] = useState(token ? "" : "invalid")
  const [t, setT] = useState<CustomFormToken | null>(null)
  const [answers, setAnswers] = useState<Record<ID, FormAnswer>>({})

  useEffect(() => {
    if (!token) return
    fetch(`/api/parent-forms/custom-token?token=${encodeURIComponent(token)}`).then((r) => r.json()).then((r) => {
      // questions tied to the family's data start filled in (owner 2026-10-22 round 2)
      if (r.ok) { setT(r.token); setAnswers(r.token.prefill ?? {}); setPhase("ready") } else { setWhy(r.error ?? "invalid"); setPhase("invalid") }
    }).catch(() => { setWhy("invalid"); setPhase("invalid") })
  }, [token])

  const submit = async () => {
    if (!t) return
    setPhase("sending")
    const r = await fetch("/api/parent-forms/custom-submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, answers }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "network" }))
    if (r.ok) setPhase("done")
    else if (r.fields) setPhase("ready")
    else { setWhy(r.error ?? "invalid"); setPhase("invalid") }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-background px-4 pb-24 pt-4">
      <div className="mb-4 flex justify-end">
        <div className="flex rounded-full bg-muted p-0.5">{LANGS.map((l) => (
          <button key={l.key} type="button" onClick={() => setLang(l.key)} className={cn("rounded-full px-2.5 py-1 text-xs", lang === l.key ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{l.label}</button>
        ))}</div>
      </div>
      {phase === "init" && <div className="grid place-items-center py-24 text-muted-foreground"><LoaderCircleIcon className="size-6 animate-spin" /></div>}
      {phase === "invalid" && (
        <div className="grid place-items-center gap-2 py-24 text-center">
          <XCircleIcon className="size-10 text-muted-foreground" />
          <p className="font-medium">{why === "used" ? tx("ส่งฟอร์มนี้ไปแล้ว ขอบคุณค่ะ") : why === "expired" ? tx("ลิงก์หมดอายุแล้ว — ติดต่อสถาบันเพื่อขอลิงก์ใหม่") : tx("ลิงก์นี้ไม่ถูกต้อง")}</p>
        </div>
      )}
      {phase === "done" && (
        <div className="grid place-items-center gap-2 py-24 text-center">
          <CheckCircle2Icon className="size-12 text-emerald-600" />
          <p className="text-lg font-semibold">{tx("ได้รับคำตอบแล้ว")}</p>
          <p className="text-sm text-muted-foreground">{tx("ขอบคุณมากค่ะ 🙏")}</p>
        </div>
      )}
      {(phase === "ready" || phase === "sending") && t && (
        <FormRenderer form={t.form} answers={answers} onChange={setAnswers} onSubmit={submit} submitting={phase === "sending"} sticky />
      )}
    </main>
  )
}
