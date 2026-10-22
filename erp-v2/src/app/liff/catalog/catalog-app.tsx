"use client"

import { useEffect, useMemo, useState } from "react"
import { BookOpenIcon, CalendarCheckIcon, CheckIcon, GraduationCapIcon, HeartIcon, LoaderCircleIcon, UserIcon, UsersIcon, XCircleIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { DAY, endTime, filterCatalog } from "@/domain/rules/catalog"
import type { CatalogCourse, CatalogToken, EnrollClassOffer, ID } from "@/domain/types"
import { tx, useUiLang } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * The course catalog a parent opens from LINE (owner 2026-10-22) — the admin sends it, or it sits on the Rich Menu.
 * Filter by grade / subject → each course's starting price and its classes (day, time, teacher, seats left).
 * "สนใจ" / "ทดลองเรียน" land as a card in the admin's chat; "สมัคร" opens the enroll form offering that class.
 */
export function CatalogApp({ token, preview }: { token: string; preview?: CatalogToken }) {
  const lang = useUiLang((s) => s.lang)
  const setLang = useUiLang((s) => s.setLang)
  const [t, setT] = useState<CatalogToken | null>(preview ?? null)
  const [failed, setFailed] = useState(false)
  const [me, setMe] = useState<{ userId: string; displayName: string } | null>(null)
  const [grade, setGrade] = useState("")
  const [subject, setSubject] = useState("")
  const [sent, setSent] = useState<Record<string, "interest" | "trial">>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState("")

  useEffect(() => {
    if (preview) return
    let dead = false
    ;(async () => {
      const r = await fetch(`/api/catalog?token=${encodeURIComponent(token)}`).then((x) => x.json()).catch(() => ({ ok: false }))
      if (dead) return
      if (!r.ok) { setFailed(true); return }
      setT(r.token)
      // inside LINE: who is looking (the buttons reach the admin's chat with this)
      try {
        const liff = (await import("@line/liff")).default
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID
        if (liffId) {
          await liff.init({ liffId })
          if (liff.isInClient() && liff.isLoggedIn()) { const p = await liff.getProfile(); if (!dead) setMe({ userId: p.userId, displayName: p.displayName }) }
        }
      } catch { /* outside LINE — browsing still works */ }
    })()
    return () => { dead = true }
  }, [token, preview])

  const courses = useMemo(() => (t ? filterCatalog(t.courses, { grade, subject }) : []), [t, grade, subject])
  if (failed) return <Center><XCircleIcon className="size-10 text-muted-foreground" /><p className="font-medium">{tx("ลิงก์นี้ไม่ถูกต้อง")}</p></Center>
  if (!t) return <Center><LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" /></Center>
  const subjectName = (s: string) => (lang !== "th" && t.subjectNames?.[s]?.[lang]) || tx(s)
  // the rules' Thai labels (priceLabel / classWhen), built from translated pieces so EN / JP read whole
  const price = (c: CatalogCourse) => tx("เริ่มต้น {0} บาท / {1}", [c.price.toLocaleString("en-US"), c.unit === "month" ? tx("เดือน") : tx(c.unit === "hour" ? "{0} ชม." : "{0} สัปดาห์", [c.duration])])
  const when = (k: EnrollClassOffer) => tx("ทุก {0} {1}–{2}", [tx(DAY[k.weekday]), k.start, endTime(k.start, k.minutes)])
  const classOf = (id: ID) => t.classes.find((k) => k.id === id)

  const ask = async (action: "interest" | "trial" | "enroll", courseId: ID, k?: EnrollClassOffer) => {
    const key = `${courseId}|${k?.id ?? ""}`
    setNote("")
    if (preview) { if (action === "enroll") setNote(tx("ตัวอย่าง: จะเปิดใบสมัครของคลาสนี้")); else setSent((x) => ({ ...x, [key]: action })); return }
    if (action !== "enroll" && !me) { setNote(tx("เปิดลิงก์นี้ใน LINE เพื่อส่งถึงแอดมินค่ะ")); return }
    setBusy(key + action)
    const r = await fetch("/api/catalog/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action, courseId, classId: k?.id, lineUserId: me?.userId, displayName: me?.displayName }) }).then((x) => x.json()).catch(() => ({ ok: false }))
    setBusy(null)
    if (!r.ok) { setNote(r.error && r.error !== "line" ? r.error : tx("ส่งไม่สำเร็จ ลองอีกครั้งค่ะ")); return }
    if (action === "enroll") window.location.assign(r.url)
    else setSent((x) => ({ ...x, [key]: action }))
  }

  return (
    <main className="mx-auto min-h-dvh max-w-md bg-background pb-10">
      <header className="sticky top-0 z-10 space-y-3 border-b bg-background/95 px-4 pb-3 pt-4 backdrop-blur">
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{t.branchName}</p>
            <h1 className="text-lg font-semibold">{tx("คอร์สเรียนและตารางเรียน")}</h1>
          </div>
          <div className="flex rounded-full bg-muted p-0.5">{(["th", "en", "ja"] as const).map((l) => (
            <button key={l} type="button" onClick={() => setLang(l)} className={cn("rounded-full px-2.5 py-1 text-xs", lang === l ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{l === "ja" ? "JP" : l.toUpperCase()}</button>
          ))}</div>
        </div>
        <div className="flex gap-2">
          <NativeSelect className="w-36 shrink-0" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={tx("ทุกระดับชั้น")} options={t.grades.map((g) => ({ value: g, label: g }))} />
          <div className="flex min-w-0 gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {[["", tx("ทุกวิชา")], ...t.subjects.map((s) => [s, subjectName(s)])].map(([v, label]) => (
              <button key={v} type="button" onClick={() => setSubject(v)} className={cn("shrink-0 rounded-full border px-3 text-sm", subject === v ? "border-foreground/40 bg-muted font-medium" : "text-muted-foreground")}>{label}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 pt-4">
        <p className="text-xs text-muted-foreground">{tx("{0} คอร์ส", [courses.length])}</p>
        {note && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{note}</p>}
        {courses.map((c) => {
          const classes = c.classIds.map(classOf).filter((k): k is EnrollClassOffer => !!k).filter((k) => !grade || k.grades.includes(grade))
          return (
            <section key={c.id} className="overflow-hidden rounded-3xl border bg-card">
              <div className="space-y-1.5 p-4">
                <div className="flex items-start gap-2">
                  <BookOpenIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <h2 className="min-w-0 flex-1 font-semibold leading-snug">{c.name}</h2>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><GraduationCapIcon className="size-3.5" />{c.grades.join(", ")}</span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">{c.format === "single" ? <UserIcon className="size-3.5" /> : <UsersIcon className="size-3.5" />}{c.format === "single" ? tx("เรียนเดี่ยว") : tx("เรียนกลุ่ม")}</span>
                </div>
                <p className="text-sm font-medium">{price(c)}</p>
              </div>
              <div className="divide-y border-t">
                {classes.length ? classes.map((k) => {
                  const key = `${c.id}|${k.id}`, done = sent[key], full = k.seatsLeft <= 0
                  return (
                    <div key={k.id} className="space-y-2 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CalendarCheckIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1"><span className="block font-medium">{when(k)}</span><span className="block text-xs text-muted-foreground">{k.name}{k.teacher && ` · ${tx("ครู")}${lang === "th" ? "" : " "}${k.teacher.replace(/^ครู/, "")}`}</span></span>
                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", full ? "bg-muted text-muted-foreground" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200")}>{full ? tx("เต็ม") : tx("เหลือ {0} ที่", [k.seatsLeft])}</span>
                      </div>
                      {done ? (
                        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><CheckIcon className="size-3.5" />{done === "trial" ? tx("ส่งคำขอทดลองเรียนแล้ว — แอดมินจะติดต่อกลับในแชท") : tx("ส่งถึงแอดมินแล้ว — แอดมินจะติดต่อกลับในแชท")}</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                          <Button size="sm" variant="outline" disabled={!!busy} onClick={() => ask("interest", c.id, k)}><HeartIcon /> {tx("สนใจ")}</Button>
                          <Button size="sm" variant="outline" disabled={!!busy || full} onClick={() => ask("trial", c.id, k)}>{tx("ทดลองเรียน")}</Button>
                          <Button size="sm" disabled={!!busy || full} onClick={() => ask("enroll", c.id, k)}>{busy === key + "enroll" ? <LoaderCircleIcon className="animate-spin" /> : null}{tx("สมัครเรียน")}</Button>
                        </div>
                      )}
                    </div>
                  )
                }) : (
                  <div className="flex items-center gap-2 px-4 py-3 text-sm">
                    <p className="min-w-0 flex-1 text-xs text-muted-foreground">{tx("ยังไม่มีรอบเรียน — กดสนใจ แอดมินจะหาเวลาที่สะดวกให้")}</p>
                    {sent[`${c.id}|`] ? <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><CheckIcon className="size-3.5" />{tx("ส่งแล้ว")}</span>
                      : <Button size="sm" variant="outline" disabled={!!busy} onClick={() => ask("interest", c.id)}><HeartIcon /> {tx("สนใจ")}</Button>}
                  </div>
                )}
              </div>
            </section>
          )
        })}
        {!courses.length && <p className="rounded-3xl border border-dashed p-8 text-center text-sm text-muted-foreground">{tx("ยังไม่มีคอร์สสำหรับตัวเลือกนี้ — ลองเปลี่ยนระดับชั้น / วิชา")}</p>}
      </div>
    </main>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center gap-2 p-6 text-center">{children}</main>
}
