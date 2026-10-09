"use client"

// Parent app v1 (owner 2026-10-09) — what a parent sees inside LINE. Pure view of a ParentView: no store, no staff data,
// so the same screen runs on the parent's phone (/liff/parent) and in the staff preview (Family › ดูแบบผู้ปกครอง).
import { useState } from "react"
import { BusIcon, CalendarDaysIcon, CheckIcon, ClockIcon, DoorOpenIcon, MessageSquareTextIcon, PackageIcon, UserIcon, XIcon } from "lucide-react"
import type { ParentChild, ParentView } from "@/domain/rules/parent-view"
import type { FormLang } from "@/domain/types"
import { cn } from "@/lib/utils"

const DICT = {
  th: {
    hello: "สวัสดีค่ะ", schedule: "ตารางเรียน", summaries: "สรุปการเรียน", attendance: "การเข้าเรียน", bus: "รถรับส่ง",
    next: "คาบถัดไป", noClass: "ยังไม่มีคาบเรียนใน 30 วันข้างหน้า", packages: "คอร์สที่เรียนอยู่", left: (n: number, t: number) => `เหลือ ${n} / ${t} คาบ`, until: "ถึง",
    teacher: "ครู", room: "ห้อง", cancelled: "งดเรียน", pickup: "รถรับ", dropoff: "รถส่ง", busNote: "เวลารถรับ-ส่งแอดมินจะแจ้งทาง LINE",
    noSummary: "ยังไม่มีสรุปการเรียน", noAttendance: "ยังไม่มีประวัติการเข้าเรียน", noBus: "ไม่ได้ใช้รถรับส่ง", present: "มาเรียน", absent: "ขาด", leave: "ลา",
    rate: "มาเรียน", updated: "อัปเดต", today: "วันนี้", tomorrow: "พรุ่งนี้",
  },
  en: {
    hello: "Hello", schedule: "Schedule", summaries: "Summaries", attendance: "Attendance", bus: "School bus",
    next: "Next class", noClass: "No classes in the next 30 days", packages: "Current courses", left: (n: number, t: number) => `${n} of ${t} classes left`, until: "until",
    teacher: "Teacher", room: "Room", cancelled: "No class", pickup: "Pick-up", dropoff: "Drop-off", busNote: "Bus times will be sent on LINE by our staff",
    noSummary: "No lesson summaries yet", noAttendance: "No attendance yet", noBus: "Not using the school bus", present: "Present", absent: "Absent", leave: "Leave",
    rate: "Attended", updated: "Updated", today: "Today", tomorrow: "Tomorrow",
  },
  ja: {
    hello: "こんにちは", schedule: "時間割", summaries: "授業レポート", attendance: "出欠", bus: "送迎バス",
    next: "次の授業", noClass: "30日以内の授業はありません", packages: "受講中のコース", left: (n: number, t: number) => `残り ${n} / ${t} 回`, until: "まで",
    teacher: "講師", room: "教室", cancelled: "休講", pickup: "お迎え", dropoff: "お送り", busNote: "送迎時間はスタッフからLINEでお知らせします",
    noSummary: "授業レポートはまだありません", noAttendance: "出欠の記録はまだありません", noBus: "送迎バスの利用なし", present: "出席", absent: "欠席", leave: "お休み",
    rate: "出席率", updated: "更新", today: "今日", tomorrow: "明日",
  },
}

const LANGS: { key: FormLang; label: string }[] = [{ key: "th", label: "TH" }, { key: "en", label: "EN" }, { key: "ja", label: "JP" }]
const DAYS = { th: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ja: ["日", "月", "火", "水", "木", "金", "土"] }
const MONTHS = { th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }

function fmtDay(date: string, lang: FormLang) {
  const [y, m, d] = date.split("-").map(Number)
  const w = new Date(y, m - 1, d).getDay()
  if (lang === "ja") return `${m}月${d}日(${DAYS.ja[w]})`
  return `${DAYS[lang][w]} ${d} ${MONTHS[lang as "th" | "en"][m - 1]}`
}

type Tab = "schedule" | "summaries" | "attendance" | "bus"

/** `framed` = inside the staff preview's phone frame: the tab bar sticks to the frame, not the browser window */
export function ParentApp({ view, lang: initialLang, today, framed }: { view: ParentView; lang?: FormLang; today: string; framed?: boolean }) {
  const brand = view.children[0]?.brand ?? "nockacademy"
  // Japanese families at Liclass open in Japanese, everyone else in Thai — the chip switches any time
  const [lang, setLang] = useState<FormLang>(initialLang ?? (brand === "liclass" && /[\u3040-\u30ff\u4e00-\u9fff]/.test(view.familyName) ? "ja" : "th"))
  const [childId, setChildId] = useState(view.children[0]?.id ?? "")
  const [tab, setTab] = useState<Tab>("schedule")
  const t = DICT[lang]
  const child = view.children.find((c) => c.id === childId) ?? view.children[0]
  const latin = lang !== "th" && !(lang === "ja" && brand === "liclass")
  const nick = (c: ParentChild) => (latin && c.nicknameEn) || c.nickname
  const family = (latin && view.familyNameEn) || view.familyName
  const tomorrow = (() => { const [y, m, d] = today.split("-").map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}` })()
  const dayLabel = (d: string) => (d === today ? t.today : d === tomorrow ? t.tomorrow : fmtDay(d, lang))
  const usesBus = view.children.some((c) => c.busDays.length > 0)
  const tabs: { key: Tab; label: string; icon: typeof CalendarDaysIcon }[] = [
    { key: "schedule", label: t.schedule, icon: CalendarDaysIcon },
    { key: "summaries", label: t.summaries, icon: MessageSquareTextIcon },
    { key: "attendance", label: t.attendance, icon: CheckIcon },
    ...(usesBus ? [{ key: "bus" as Tab, label: t.bus, icon: BusIcon }] : []),
  ]

  return (
    <div className={cn("mx-auto flex max-w-lg flex-col bg-muted/40", framed ? "min-h-full" : "min-h-dvh")}>
      <header className={cn("px-4 pt-4 pb-3 text-white", brand === "liclass" ? "bg-sky-600" : "bg-primary")}>
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs opacity-80">{brand === "liclass" ? "Liclass" : "NockAcademy"} · {child?.branchName}</p>
            <p className="truncate text-lg font-semibold">{t.hello} {family}</p>
          </div>
          <div className="flex rounded-full bg-white/20 p-0.5">
            {LANGS.map((l) => <button key={l.key} type="button" onClick={() => setLang(l.key)} className={cn("rounded-full px-2.5 py-1 text-xs", lang === l.key ? "bg-white font-medium text-foreground" : "text-white/90")}>{l.label}</button>)}
          </div>
        </div>
        {view.children.length > 1 && (
          <div className="mt-3 flex gap-1.5 overflow-x-auto">
            {view.children.map((c) => (
              <button key={c.id} type="button" onClick={() => setChildId(c.id)} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-sm", c.id === child?.id ? "bg-white font-medium text-foreground" : "bg-white/20")}>
                <UserIcon className="size-3.5" />{nick(c)} <span className="text-xs opacity-70">{c.grade}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <main className={cn("flex-1 space-y-3 p-3", framed ? "pb-3" : "pb-24")}>
        {!child ? null : tab === "schedule" ? <Schedule child={child} t={t} dayLabel={dayLabel} lang={lang} /> : tab === "summaries" ? (
          child.summaries.length === 0 ? <Empty text={t.noSummary} /> : child.summaries.map((s, i) => (
            <article key={i} className="rounded-2xl bg-background p-3 shadow-sm">
              <p className="text-xs text-muted-foreground">{fmtDay(s.date, lang)} · {s.subjects.join(" + ")} · {t.teacher} {s.teacher}</p>
              {s.detail && <p className="mt-1 text-xs font-medium">{s.detail}</p>}
              <p className="mt-1 text-sm whitespace-pre-line">{s.text}</p>
            </article>
          ))
        ) : tab === "attendance" ? <AttendanceList child={child} t={t} lang={lang} /> : <BusList child={child} t={t} lang={lang} dayLabel={dayLabel} />}
        <p className="pt-2 text-center text-[11px] text-muted-foreground">{t.updated} {(() => { const g = new Date(view.generatedAt); return `${fmtDay(`${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`, lang)} ${String(g.getHours()).padStart(2, "0")}:${String(g.getMinutes()).padStart(2, "0")}` })()}</p>
      </main>

      <nav className={cn("z-10 mx-auto flex w-full max-w-lg border-t bg-background/95 backdrop-blur", framed ? "sticky bottom-0" : "fixed inset-x-0 bottom-0")}>
        {tabs.map((x) => (
          <button key={x.key} type="button" onClick={() => setTab(x.key)} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", tab === x.key ? "font-medium text-primary" : "text-muted-foreground")}>
            <x.icon className="size-5" />{x.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

type T = (typeof DICT)["th"]

function Schedule({ child, t, dayLabel, lang }: { child: ParentChild; t: T; dayLabel: (d: string) => string; lang: FormLang }) {
  const days = new Map<string, ParentChild["upcoming"]>()
  child.upcoming.forEach((c) => days.set(c.date, [...(days.get(c.date) ?? []), c]))
  return (
    <>
      {child.packages.length > 0 && (
        <section className="rounded-2xl bg-background p-3 shadow-sm">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><PackageIcon className="size-3.5" />{t.packages}</p>
          <ul className="space-y-1.5">
            {child.packages.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{p.course}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{p.remaining != null && p.total != null ? `${t.left(p.remaining, p.total)} · ` : ""}{t.until} {fmtDay(p.until, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {days.size === 0 ? <Empty text={t.noClass} /> : [...days.entries()].map(([date, list]) => (
        <section key={date} className="space-y-1.5">
          <p className="px-1 text-xs font-semibold text-muted-foreground">{dayLabel(date)}</p>
          {list.map((c) => (
            <article key={c.sessionId} className={cn("rounded-2xl bg-background p-3 shadow-sm", c.cancelled && "opacity-60")}>
              <div className="flex items-start gap-3">
                <div className="w-14 shrink-0 text-center">
                  <p className="text-base font-semibold tabular-nums">{c.start}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">{c.end}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate font-medium", c.cancelled && "line-through")}>{c.subjects.join(" + ")}</p>
                  <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    {c.teachers.length > 0 && <span className="flex items-center gap-1"><UserIcon className="size-3" />{t.teacher} {c.teachers.join(", ")}</span>}
                    {c.room && <span className="flex items-center gap-1"><DoorOpenIcon className="size-3" />{c.room}</span>}
                  </p>
                  {c.cancelled && <p className="mt-1 text-xs font-medium text-red-700">{t.cancelled}{c.cancelReason ? ` · ${c.cancelReason}` : ""}</p>}
                  {!c.cancelled && c.bus && <BusChips bus={c.bus} t={t} />}
                </div>
              </div>
            </article>
          ))}
        </section>
      ))}
    </>
  )
}

function BusChips({ bus, t }: { bus: { pickup: boolean; dropoff: boolean }; t: T }) {
  return (
    <p className="mt-1.5 flex gap-1.5">
      {bus.pickup && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900"><BusIcon className="size-3" />{t.pickup}</span>}
      {bus.dropoff && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900"><BusIcon className="size-3" />{t.dropoff}</span>}
    </p>
  )
}

function AttendanceList({ child, t, lang }: { child: ParentChild; t: T; lang: FormLang }) {
  if (child.attendance.length === 0) return <Empty text={t.noAttendance} />
  const present = child.attendance.filter((a) => a.status === "present").length
  const tone = { present: "bg-emerald-100 text-emerald-800", absent: "bg-red-100 text-red-800", leave: "bg-amber-100 text-amber-900" }
  return (
    <>
      <section className="rounded-2xl bg-background p-3 text-center shadow-sm">
        <p className="text-xs text-muted-foreground">{t.rate}</p>
        <p className="text-2xl font-semibold tabular-nums">{present} / {child.attendance.length}</p>
      </section>
      <ul className="divide-y overflow-hidden rounded-2xl bg-background shadow-sm">
        {child.attendance.map((a, i) => (
          <li key={i} className="flex items-center gap-2 px-3 py-2 text-sm">
            <span className="w-28 shrink-0 text-xs text-muted-foreground">{fmtDay(a.date, lang)} {a.start}</span>
            <span className="min-w-0 flex-1 truncate">{a.subjects.join(" + ")}</span>
            <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", tone[a.status])}>{a.status === "present" ? <CheckIcon className="size-3" /> : a.status === "absent" ? <XIcon className="size-3" /> : <ClockIcon className="size-3" />}{t[a.status]}</span>
          </li>
        ))}
      </ul>
    </>
  )
}

function BusList({ child, t, lang, dayLabel }: { child: ParentChild; t: T; lang: FormLang; dayLabel: (d: string) => string }) {
  if (child.busDays.length === 0) return <Empty text={t.noBus} />
  const classAt = (d: string) => child.upcoming.find((c) => c.date === d && !c.cancelled)
  return (
    <>
      <p className="rounded-2xl bg-amber-50 p-3 text-xs text-amber-900">{t.busNote}</p>
      <ul className="divide-y overflow-hidden rounded-2xl bg-background shadow-sm">
        {child.busDays.map((b) => {
          const c = classAt(b.date)
          return (
            <li key={b.date} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="w-24 shrink-0 font-medium">{dayLabel(b.date)}</span>
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{c ? `${c.start}–${c.end} · ${c.subjects.join(" + ")}` : fmtDay(b.date, lang)}</span>
              <BusChips bus={b} t={t} />
            </li>
          )
        })}
      </ul>
    </>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">{text}</p>
}
