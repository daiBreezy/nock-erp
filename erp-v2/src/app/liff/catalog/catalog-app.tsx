"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowLeftIcon, CalendarCheckIcon, CheckIcon, HeartIcon, LoaderCircleIcon, XCircleIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { DAY, endTime, filterCatalog } from "@/domain/rules/catalog"
import type { CatalogCourse, CatalogToken, EnrollClassOffer, ID } from "@/domain/types"
import { tx, useUiLang } from "@/lib/i18n"
import { subjectColor } from "@/components/app/subject-color"
import { cn } from "@/lib/utils"

/**
 * The course catalog a parent opens from LINE (owner 2026-10-22) — the admin sends it, or it sits on the Rich Menu.
 * Filter by grade / subject → each course's starting price and its classes (day, time, teacher, seats left).
 * "สนใจ" / "ทดลองเรียน" land as a card in the admin's chat; "สมัคร" opens the enroll form offering that class.
 */
export function CatalogApp({ token, preview, embedded, onDetail }: { token: string; preview?: CatalogToken
  /** inside the parent app: called with a back function while a course is open (null when the list shows) — the PARENT APP's header then carries the back arrow, like the course summary (owner 2026-11-09) */
  onDetail?: (back: (() => void) | null) => void
  /** inside the parent app: no title, no language switch (those live in อื่นๆ), nothing sticky — the parent app's own header is above */
  embedded?: boolean }) {
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
  // owner 2026-11-06: tap a cover card to open the course; ♥ keeps favourites on this phone
  const [openId, setOpenId] = useState<ID | null>(null)
  useEffect(() => {
    onDetail?.(openId ? () => setOpenId(null) : null)
    return () => onDetail?.(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId])
  // this component only renders in the browser (dynamic, ssr: false) so localStorage is safe to read up front
  const [favs, setFavs] = useState<ID[]>(() => { try { return JSON.parse(localStorage.getItem("nockerp-catalog-fav") ?? "[]") } catch { return [] } })
  const [onlyFav, setOnlyFav] = useState(false)
  const toggleFav = (id: ID) => setFavs((cur) => { const next = cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]; try { localStorage.setItem("nockerp-catalog-fav", JSON.stringify(next)) } catch { /* ignore */ } return next })

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

  const courses = useMemo(() => (t ? filterCatalog(t.courses, { grade, subject }).filter((c) => !onlyFav || favs.includes(c.id)) : []), [t, grade, subject, onlyFav, favs])
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

  const open = openId ? t.courses.find((c) => c.id === openId) : undefined
  const meta = (c: CatalogCourse) => `${c.grades.join(", ")} · ${c.format === "single" ? tx("เรียนเดี่ยว") : tx("เรียนกลุ่ม")}`
  // the cover: the course picture, else the subject's colour with its name big (owner 2026-11-06: "Card Course ให้แสดงเป็นรูป")
  const cover = (c: CatalogCourse, className?: string) => {
    const sc = subjectColor(c.subjects[0] ?? "")
    // eslint-disable-next-line @next/next/no-img-element -- catalog pictures are data / remote URLs
    return c.image ? <img src={c.image} alt={c.name} className={cn("w-full object-cover", className)} /> : (
      <div className={cn("grid w-full place-items-center px-3 text-center", sc.chip, className)}>
        <span className="line-clamp-2 text-xl font-bold break-words">{c.subjects.map(subjectName).join(" + ")}</span>
      </div>
    )
  }
  const fav = (id: ID, className?: string) => (
    <button type="button" aria-pressed={favs.includes(id)} aria-label={tx("สนใจ")} onClick={(e) => { e.stopPropagation(); toggleFav(id) }}
      className={cn("grid size-8 place-items-center rounded-full bg-background/90 shadow-sm", className)}>
      <HeartIcon className={cn("size-4", favs.includes(id) ? "fill-primary text-primary" : "text-muted-foreground")} />
    </button>
  )

  return (
    <main className={cn("mx-auto max-w-md bg-background", embedded ? "pb-4" : "min-h-dvh pb-10")}>
      {open ? (
        <div className="space-y-4 px-4 pt-4">
          {!(embedded && onDetail) && <button type="button" onClick={() => setOpenId(null)} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeftIcon className="size-4" />{tx("กลับ")}</button>}
          <div className="relative overflow-hidden rounded-[8px]">
            {cover(open, "aspect-[16/9]")}
            {fav(open.id, "absolute top-2 right-2")}
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold leading-snug break-words">{open.name}</h2>
            <p className="text-xs text-muted-foreground">{meta(open)}</p>
            <p className="text-sm font-medium">{price(open)}</p>
          </div>
          {note && <p className="rounded-[8px] bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{note}</p>}
          <div className="divide-y overflow-hidden rounded-[8px] border bg-card">
            {(() => {
              const classes = open.classIds.map(classOf).filter((k): k is EnrollClassOffer => !!k).filter((k) => !grade || k.grades.includes(grade))
              return classes.length ? classes.map((k) => {
                const key = `${open.id}|${k.id}`, done = sent[key], full = k.seatsLeft <= 0
                return (
                  <div key={k.id} className="space-y-2 px-3 py-3">
                    <div className="flex items-start gap-2 text-sm">
                      <CalendarCheckIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1"><span className="block font-medium">{when(k)}</span><span className="block text-xs break-words text-muted-foreground">{k.name}{k.teacher && ` · ${tx("ครู")}${lang === "th" ? "" : " "}${k.teacher.replace(/^ครู/, "")}`}</span></span>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs", full ? "bg-muted text-muted-foreground" : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200")}>{full ? tx("เต็ม") : tx("เหลือ {0} ที่", [k.seatsLeft])}</span>
                    </div>
                    {done ? (
                      <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300"><CheckIcon className="size-3.5" />{done === "trial" ? tx("ส่งคำขอทดลองเรียนแล้ว — แอดมินจะติดต่อกลับในแชท") : tx("ส่งถึงแอดมินแล้ว — แอดมินจะติดต่อกลับในแชท")}</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => ask("interest", open.id, k)}><HeartIcon /> {tx("สนใจ")}</Button>
                        <Button size="sm" variant="outline" disabled={!!busy || full} onClick={() => ask("trial", open.id, k)}>{tx("ทดลองเรียน")}</Button>
                        <Button size="sm" disabled={!!busy || full} onClick={() => ask("enroll", open.id, k)}>{busy === key + "enroll" ? <LoaderCircleIcon className="animate-spin" /> : null}{tx("สมัครเรียน")}</Button>
                      </div>
                    )}
                  </div>
                )
              }) : (
                <div className="flex items-center gap-2 px-3 py-3 text-sm">
                  <p className="min-w-0 flex-1 text-xs text-muted-foreground">{tx("ยังไม่มีรอบเรียน — กดสนใจ แอดมินจะหาเวลาที่สะดวกให้")}</p>
                  {sent[`${open.id}|`] ? <span className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><CheckIcon className="size-3.5" />{tx("ส่งแล้ว")}</span>
                    : <Button size="sm" variant="outline" disabled={!!busy} onClick={() => ask("interest", open.id)}><HeartIcon /> {tx("สนใจ")}</Button>}
                </div>
              )
            })()}
          </div>
        </div>
      ) : (
        <>
          <header className={cn("space-y-3 bg-background px-4 pb-3", embedded ? "pt-4" : "sticky top-0 z-10 border-b pt-4 backdrop-blur")}>
            {!embedded && (
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">{t.branchName}</p>
                  <h1 className="text-lg font-semibold">{tx("คอร์สเรียนและตารางเรียน")}</h1>
                </div>
                <NativeSelect className="w-32 shrink-0" value={lang} onChange={(e) => setLang(e.target.value as typeof lang)} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} />
              </div>
            )}
            <div className="flex gap-2">
              <NativeSelect className="min-w-0 flex-1" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder={tx("ทุกระดับชั้น")} options={t.grades.map((g) => ({ value: g, label: g }))} />
              <NativeSelect className="min-w-0 flex-1" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={tx("ทุกวิชา")} options={t.subjects.map((s) => ({ value: s, label: subjectName(s) }))} />
              <button type="button" aria-pressed={onlyFav} aria-label={tx("สนใจ")} onClick={() => setOnlyFav(!onlyFav)} className={cn("grid size-9 shrink-0 place-items-center rounded-full border", onlyFav ? "border-primary bg-primary/10" : "")}>
                <HeartIcon className={cn("size-4", onlyFav ? "fill-primary text-primary" : "text-muted-foreground")} />
              </button>
            </div>
          </header>

          <div className="space-y-3 px-4 pt-1">
            <p className="text-xs text-muted-foreground">{tx("{0} คอร์ส", [courses.length])}</p>
            {note && <p className="rounded-[8px] bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">{note}</p>}
            <div className="grid grid-cols-2 gap-3">
              {courses.map((c) => (
                <div key={c.id} role="button" tabIndex={0} onClick={() => { setNote(""); setOpenId(c.id) }} onKeyDown={(e) => { if (e.key === "Enter") setOpenId(c.id) }}
                  className="relative cursor-pointer overflow-hidden rounded-[8px] bg-card text-left shadow-sm ring-1 ring-foreground/5">
                  {cover(c, "aspect-[4/3]")}
                  {fav(c.id, "absolute top-2 right-2")}
                  <div className="space-y-0.5 p-2.5">
                    <p className="line-clamp-2 text-sm leading-snug font-semibold break-words">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{meta(c)}</p>
                    <p className="truncate text-xs font-medium">{price(c)}</p>
                  </div>
                </div>
              ))}
            </div>
            {!courses.length && <p className="rounded-[8px] border border-dashed p-8 text-center text-sm text-muted-foreground">{tx("ยังไม่มีคอร์สสำหรับตัวเลือกนี้ — ลองเปลี่ยนระดับชั้น / วิชา")}</p>}
          </div>
        </>
      )}
    </main>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return <main className="grid min-h-dvh place-items-center gap-2 p-6 text-center">{children}</main>
}
