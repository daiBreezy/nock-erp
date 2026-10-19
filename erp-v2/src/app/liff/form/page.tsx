"use client"

import { Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import { LoaderCircleIcon } from "lucide-react"

// owner 2026-10-19 ("เปิด Link จาก Line rich menu ช้าโคตรๆ"): the parent app and the forms are separate downloads —
// opening the Rich Menu loads only the parent app, a form link only the form.
const Loading = () => <div className="flex min-h-dvh items-center justify-center"><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></div>
const ParentLiff = dynamic(() => import("@/components/parent/parent-liff").then((m) => m.ParentLiff), { ssr: false, loading: Loading })
const LiffForm = dynamic(() => import("./form-app").then((m) => m.LiffForm), { ssr: false, loading: Loading })

export default function LiffFormPage() {
  return (
    <Suspense fallback={<Loading />}>
      <LiffEntry />
    </Suspense>
  )
}

/** One LIFF app for everything parents open: ?app=parent = the parent app (owner 2026-10-09), else a form.
 *  LINE first opens the endpoint with ?liff.state=<original query> — read `app` from there too. */
function LiffEntry() {
  const params = useSearchParams()
  const state = new URLSearchParams((params.get("liff.state") ?? "").replace(/^[^?]*\?/, ""))
  return params.get("app") === "parent" || state.get("app") === "parent" ? <ParentLiff /> : <LiffForm />
}

