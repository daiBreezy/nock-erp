"use client"

// Parent app in LINE (owner 2026-10-09): rendered by the LIFF endpoint page (/liff/form?app=parent — LIFF only starts
// under its registered endpoint), opened from the Rich Menu → LINE Login → LINE proves who the parent is →
// the family's published view. Never touches the ERP store (that is staff data in the staff's own browser).
import { useEffect, useState } from "react"
import { LoaderCircleIcon, Link2OffIcon, XCircleIcon } from "lucide-react"
import { ParentApp, type ParentRequestInput } from "@/components/parent/parent-app"
import type { ParentRequest } from "@/domain/types"
import type { ParentView } from "@/domain/rules/parent-view"

type Phase = { kind: "loading" } | { kind: "error"; text: string } | { kind: "not_linked"; name: string } | { kind: "ready"; view: ParentView }

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` }

/** …&cs=<id> from the สรุปจบคอร์ส LINE message (LINE may hand it over inside liff.state) */
function courseSummaryParam() {
  if (typeof window === "undefined") return undefined
  const q = new URLSearchParams(window.location.search)
  const state = new URLSearchParams((q.get("liff.state") ?? "").replace(/^[^?]*\?/, ""))
  return q.get("cs") ?? state.get("cs") ?? undefined
}

/** …&act=leave|exit — a rich-menu button straight to แจ้งลา / แจ้งลาออก (owner 2026-10-14) */
function actionParam(): "leave" | "exit" | undefined {
  if (typeof window === "undefined") return undefined
  const q = new URLSearchParams(window.location.search)
  const state = new URLSearchParams((q.get("liff.state") ?? "").replace(/^[^?]*\?/, ""))
  const a = q.get("act") ?? state.get("act")
  return a === "leave" || a === "exit" ? a : undefined
}

export function ParentLiff() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" })
  const [idToken, setIdToken] = useState("")
  const [requests, setRequests] = useState<ParentRequest[]>([])
  const loadRequests = (tok: string) => fetch("/api/parent-view/requests", { headers: { Authorization: `Bearer ${tok}` } }).then((r) => r.json()).then((j) => j.ok && setRequests(j.requests)).catch(() => {})
  const sendRequest = async (input: ParentRequestInput) => {
    const r = await fetch("/api/parent-view/requests", { method: "POST", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, body: JSON.stringify(input) })
      .then((x) => x.json()).catch(() => ({ ok: false, error: "ส่งไม่สำเร็จ — ลองใหม่อีกครั้ง" }))
    if (r.ok) loadRequests(idToken)
    return r as { ok: boolean; error?: string }
  }
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const liff = (await import("@line/liff")).default
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (!liffId) throw new Error("ยังไม่ได้ตั้งค่า LIFF ID")
        await liff.init({ liffId })
        if (!liff.isLoggedIn()) { liff.login({ redirectUri: window.location.href }); return }
        const idToken = liff.getIDToken()
        if (!idToken) throw new Error("LINE ไม่ส่งข้อมูลยืนยันตัวตน — ต้องเปิดสิทธิ์ openid ของ LIFF app")
        const res = await fetch("/api/parent-view/me", { headers: { Authorization: `Bearer ${idToken}` } }).then((r) => r.json())
        if (cancelled) return
        if (res.ok) { sessionStorage.removeItem("nockerp-relogin"); setIdToken(idToken); loadRequests(idToken); setPhase({ kind: "ready", view: res.view }) }
        else if (res.error === "not_linked") setPhase({ kind: "not_linked", name: res.name ?? "" })
        else if (res.error === "auth" && !sessionStorage.getItem("nockerp-relogin")) {
          // LINE's ID token lasts about an hour — an old login in the browser gets a fresh one once, by itself
          sessionStorage.setItem("nockerp-relogin", "1")
          liff.logout()
          liff.login({ redirectUri: window.location.href })
          return
        }
        else setPhase({ kind: "error", text: "ยืนยันตัวตนกับ LINE ไม่สำเร็จ — ลองเปิดใหม่จากแอป LINE" })
      } catch (e) {
        if (!cancelled) setPhase({ kind: "error", text: e instanceof Error ? e.message : "เปิดไม่สำเร็จ — ลองเปิดใหม่จากแอป LINE" })
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (phase.kind === "ready") return <ParentApp view={phase.view} today={today()} openCourseSummary={courseSummaryParam()} onRequest={sendRequest} requests={requests} openAction={actionParam()} />
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 p-6 text-center">
      {phase.kind === "loading" && <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />}
      {phase.kind === "error" && <><XCircleIcon className="size-10 text-muted-foreground" /><p className="text-sm">{phase.text}</p></>}
      {phase.kind === "not_linked" && (
        <>
          <Link2OffIcon className="size-10 text-muted-foreground" />
          <p className="font-medium">ยังไม่พบข้อมูลนักเรียนของบัญชี LINE นี้{phase.name ? ` (${phase.name})` : ""}</p>
          <p className="max-w-xs text-sm text-muted-foreground">ทักแชทหาแอดมินเพื่อเชื่อมบัญชี LINE กับข้อมูลครอบครัว แล้วเปิดหน้านี้ใหม่ได้เลยค่ะ</p>
          <p className="max-w-xs text-xs text-muted-foreground">No student linked to this LINE account yet — message us to connect. · このLINEアカウントはまだ登録されていません。</p>
        </>
      )}
    </div>
  )
}
