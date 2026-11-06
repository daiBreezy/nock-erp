"use client"

// Parent app v1 (owner 2026-10-09) — what a parent sees inside LINE. Pure view of a ParentView: no store, no staff data,
// so the same screen runs on the parent's phone (/liff/parent) and in the staff preview (Family › ดูแบบผู้ปกครอง).
import { useState } from "react"
import dynamic from "next/dynamic"
import { ArrowLeftIcon, BookOpenIcon, ChevronDownIcon, RotateCcwIcon, CalendarOffIcon, ClipboardPenIcon, LoaderCircleIcon, BusIcon, MapPinHouseIcon, CalendarDaysIcon, CheckIcon, ChevronRightIcon, GraduationCapIcon, ClockIcon, DoorOpenIcon, MessageSquareTextIcon, PackageIcon, UserIcon, XIcon } from "lucide-react"
import type { ParentChild, ParentCourseSummary, ParentView } from "@/domain/rules/parent-view"
import { progressForSubject } from "@/domain/rules/summaries"
import { CourseProgress } from "@/components/app/course-progress"
import { subjectColor } from "@/components/app/subject-color"
import type { CatalogToken, FormLang, ParentRequest } from "@/domain/types"
import { cn } from "@/lib/utils"

// the map loads only when a parent opens "ปักหมุดบ้าน" (Leaflet is big — the rest of the app stays light in LINE)
const CatalogApp = dynamic(() => import("@/app/liff/catalog/catalog-app").then((m) => m.CatalogApp), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-2xl bg-muted" /> })
const MapPin = dynamic(() => import("@/app/liff/form/map-pin").then((m) => m.MapPin), { ssr: false, loading: () => <div className="h-full animate-pulse rounded-xl bg-muted" /> })

const DICT = {
  th: {
    hello: "สวัสดีค่ะ", schedule: "ตารางเรียน", summaries: "สรุปการเรียน", attendance: "การเข้าเรียน", bus: "รถรับส่ง",
    next: "คาบถัดไป", noClass: "ยังไม่มีคาบเรียนใน 30 วันข้างหน้า", packages: "คอร์สที่เรียนอยู่", left: (n: number, t: number) => `เหลือ ${n} / ${t} คาบ`, until: "ถึง",
    teacher: "ครู", room: "ห้อง", cancelled: "งดเรียน", pickup: "รถรับ", dropoff: "รถส่ง", busNote: "เวลารถรับ-ส่งแอดมินจะแจ้งทาง LINE",
    noSummary: "ยังไม่มีสรุปการเรียน", noAttendance: "ยังไม่มีประวัติการเข้าเรียน", noBus: "ไม่ได้ใช้รถรับส่ง", present: "มาเรียน", absent: "ขาด", leave: "ลา",
    rate: "มาเรียน", updated: "อัปเดต", today: "วันนี้", tomorrow: "พรุ่งนี้",
    courseEnd: "สรุปจบคอร์ส", lessonNotes: "สรุปรายคาบ", view: "ดูสรุปและพัฒนาการ", back: "กลับ", whole: "ทั้งคอร์ส",
    overall: "ภาพรวมพัฒนาการ", strengths: "จุดแข็ง", improve: "สิ่งที่ควรฝึกเพิ่ม", progress: "พัฒนาการ", by: "สรุปโดย",
    request: "แจ้งเรื่อง", leaveReq: "แจ้งลาหยุด", leaveReqSub: "เลือกคาบที่จะไม่มาเรียน", exitReq: "แจ้งลาออก", exitReqSub: "แจ้งหยุดเรียน · แอดมินจะติดต่อกลับ",
    pickClasses: "เลือกคาบที่จะลา", noUpcoming: "ไม่มีคาบเรียนใน 30 วันข้างหน้า", noteLabel: "หมายเหตุถึงแอดมิน (ไม่บังคับ)", send: "ส่ง", sending: "กำลังส่ง…",
    lastDay: "วันเรียนวันสุดท้าย", whyLeave: "เหตุผลที่หยุดเรียน (เลือกได้หลายข้อ)", sent: "ส่งเรื่องแล้ว — แอดมินจะยืนยันกลับทาง LINE", myRequests: "เรื่องที่แจ้งไว้",
    st_new: "รอแอดมิน", st_done: "ดำเนินการแล้ว", st_declined: "ไม่ได้ดำเนินการ", preview: "ตัวอย่าง — ไม่ได้ส่งจริง", classes: (n: number) => `${n} คาบ`,
    returnReq: "ต้องการกลับมาเรียน", returnSub: "แอดมินจะติดต่อกลับเพื่อจัดคลาสให้", startFrom: "อยากเริ่มเรียนประมาณวันที่ (ไม่บังคับ)", leftTag: "หยุดเรียน",
    leftSince: (d: string) => `หยุดเรียนตั้งแต่ ${d}`, leftNote: "ยังดูประวัติการเข้าเรียนและสรุปการเรียนได้ตามเดิม",
    homeReq: "ปักหมุดบ้าน (รถรับส่ง)", homeReqSub: "บอกตำแหน่งบ้านให้รถไปรับ-ส่งได้ถูกที่", homePick: "แตะแผนที่เพื่อปักหมุดบ้าน ลากหมุดเพื่อขยับ หรือใช้ตำแหน่งปัจจุบัน", homeNote: "จุดสังเกต / ทางเข้า", homeNotePh: "เช่น ซอย 2 บ้านหลังที่ 3 ประตูสีขาว", homeBanner: "ยังไม่มีตำแหน่งบ้านสำหรับรถรับส่ง — ช่วยปักหมุดให้หน่อยนะคะ", homeBannerBtn: "ปักหมุดบ้าน", locate: "ใช้ตำแหน่งปัจจุบัน", homeHave: "มีหมุดบ้านแล้ว — ย้ายหมุดได้ถ้าไม่ตรง",
    busReq: "ขอ / ยกเลิกรอบรถ", busReqSub: "ขอรถรับ-ส่งเพิ่ม หรือยกเลิกรอบที่ไม่ใช้", busPick: "แตะ รับ / ส่ง ของแต่ละวัน เพื่อขอเพิ่มหรือยกเลิก",
    busAdd: "ขอเพิ่ม", busCancel: "ยกเลิก", busCost: "รอบที่ขอเพิ่มคิดค่ารถในใบแจ้งหนี้รอบถัดไป · ยกเลิกรอบที่จ่ายแล้วไม่คืนเงิน", trips: (n: number) => `${n} เที่ยว`,
    adult: "ผู้ปกครอง", adultGo: "ผู้ปกครองไปด้วย", adultNote: "ผู้ปกครองนั่งรถไปด้วยได้ ไม่คิดค่ารถ (ใช้ 1 ที่นั่ง)",
    catalog: "Catalog", catalogOff: "ยังไม่มีแคตตาล็อกของสาขานี้ — ถามแอดมินได้เลยค่ะ", pastTab: "ผ่านไปแล้ว", seq: (n: number, t: number) => `คาบที่ ${n}/${t}`, noSummaryYet: "ครูยังไม่ได้ส่งสรุปของคาบนี้", chipLeave: "แจ้งลา", chipBus: "ขอรถรับ-ส่ง",
    study: "การเรียน", all: "ทั้งหมด", upcomingH: "คาบที่จะถึง", pastH: "คาบที่ผ่านมา", manage: "แจ้งลา / รถรับ-ส่ง", leaveThis: "แจ้งลาคาบนี้", waiting: "รอแอดมิน", leaveSent: "แจ้งลาแล้ว", busSent: "ขอรถแล้ว", ridesOf: "รถรับ-ส่งของวันนั้น", pickAny: "เลือกสิ่งที่ต้องการแจ้ง", showAll: "ดูทั้งหมด", hide: "ซ่อน",
  },
  en: {
    hello: "Hello", schedule: "Schedule", summaries: "Summaries", attendance: "Attendance", bus: "School bus",
    next: "Next class", noClass: "No classes in the next 30 days", packages: "Current courses", left: (n: number, t: number) => `${n} of ${t} classes left`, until: "until",
    teacher: "Teacher", room: "Room", cancelled: "No class", pickup: "Pick-up", dropoff: "Drop-off", busNote: "Bus times will be sent on LINE by our staff",
    noSummary: "No lesson summaries yet", noAttendance: "No attendance yet", noBus: "Not using the school bus", present: "Present", absent: "Absent", leave: "Leave",
    rate: "Attended", updated: "Updated", today: "Today", tomorrow: "Tomorrow",
    courseEnd: "Course summaries", lessonNotes: "Lesson notes", view: "View summary & progress", back: "Back", whole: "Whole course",
    overall: "Overall progress", strengths: "Strengths", improve: "To improve", progress: "Progress", by: "By",
    request: "Requests", leaveReq: "Report an absence", leaveReqSub: "Pick the classes your child will miss", exitReq: "Stop studying", exitReqSub: "Let us know · our staff will call you",
    pickClasses: "Classes to miss", noUpcoming: "No classes in the next 30 days", noteLabel: "Note to our staff (optional)", send: "Send", sending: "Sending…",
    lastDay: "Last day of class", whyLeave: "Why is your child stopping? (pick any)", sent: "Sent — our staff will confirm on LINE", myRequests: "Your requests",
    st_new: "Waiting", st_done: "Done", st_declined: "Not done", preview: "Preview — nothing is sent", classes: (n: number) => `${n} class${n > 1 ? "es" : ""}`,
    returnReq: "Come back to study", returnSub: "Our staff will call to arrange a class", startFrom: "Would like to start around (optional)", leftTag: "Stopped",
    leftSince: (d: string) => `Stopped studying since ${d}`, leftNote: "Attendance and lesson summaries are still here",
    homeReq: "Pin your home (school bus)", homeReqSub: "Show the bus where your home is", homePick: "Tap the map to pin your home, drag the pin to adjust, or use your current location", homeNote: "Landmark / way in", homeNotePh: "e.g. Soi 2, 3rd house, white gate", homeBanner: "We don't have your home location for the bus yet — please pin it", homeBannerBtn: "Pin home", locate: "Use my location", homeHave: "Your home is pinned — move the pin if it's off",
    busReq: "Add / cancel bus rides", busReqSub: "Ask for extra pick-ups / drop-offs, or cancel ones you don't need", busPick: "Tap Pick-up / Drop-off on a day to add or cancel it",
    busAdd: "Add", busCancel: "Cancel", busCost: "Extra rides are charged on the next invoice · paid rides you cancel aren't refunded", trips: (n: number) => `${n} ride${n > 1 ? "s" : ""}`,
    adult: "Parent", adultGo: "Parent rides along", adultNote: "A parent can ride along for free (takes 1 seat)",
    catalog: "Catalog", catalogOff: "No catalog for this branch yet — please ask our staff", pastTab: "Past", seq: (n: number, t: number) => `Class ${n}/${t}`, noSummaryYet: "No summary sent for this class yet", chipLeave: "Absence", chipBus: "Bus",
    study: "Learning", all: "All", upcomingH: "Upcoming classes", pastH: "Past classes", manage: "Absence / bus", leaveThis: "Report absence for this class", waiting: "Waiting", leaveSent: "Absence sent", busSent: "Bus asked", ridesOf: "Bus on that day", pickAny: "Pick what to send", showAll: "Show all", hide: "Hide",
  },
  ja: {
    hello: "こんにちは", schedule: "時間割", summaries: "授業レポート", attendance: "出欠", bus: "送迎バス",
    next: "次の授業", noClass: "30日以内の授業はありません", packages: "受講中のコース", left: (n: number, t: number) => `残り ${n} / ${t} 回`, until: "まで",
    teacher: "講師", room: "教室", cancelled: "休講", pickup: "お迎え", dropoff: "お送り", busNote: "送迎時間はスタッフからLINEでお知らせします",
    noSummary: "授業レポートはまだありません", noAttendance: "出欠の記録はまだありません", noBus: "送迎バスの利用なし", present: "出席", absent: "欠席", leave: "お休み",
    rate: "出席率", updated: "更新", today: "今日", tomorrow: "明日",
    courseEnd: "コース修了レポート", lessonNotes: "授業レポート", view: "レポートと成長を見る", back: "戻る", whole: "コース全体",
    overall: "全体の成長", strengths: "得意なところ", improve: "練習したいところ", progress: "成長の記録", by: "担当",
    request: "連絡", leaveReq: "お休みの連絡", leaveReqSub: "お休みする授業を選んでください", exitReq: "退会の連絡", exitReqSub: "スタッフからご連絡します",
    pickClasses: "お休みする授業", noUpcoming: "30日以内の授業はありません", noteLabel: "スタッフへのメモ（任意）", send: "送信", sending: "送信中…",
    lastDay: "最後の授業日", whyLeave: "退会の理由（複数選択可）", sent: "送信しました — スタッフがLINEでご連絡します", myRequests: "送信した連絡",
    st_new: "確認待ち", st_done: "対応済み", st_declined: "対応なし", preview: "プレビュー（送信されません）", classes: (n: number) => `${n}回`,
    returnReq: "再入会したい", returnSub: "スタッフからクラスのご相談のご連絡をします", startFrom: "再開希望日（任意）", leftTag: "退会",
    leftSince: (d: string) => `${d}から休会中`, leftNote: "出欠と授業レポートは引き続きご覧いただけます",
    homeReq: "自宅の位置（送迎）", homeReqSub: "送迎車が迷わないよう自宅の位置を送る", homePick: "地図をタップして自宅にピン、ドラッグで調整、または現在地を使用", homeNote: "目印／入り口", homeNotePh: "例：ソイ2、3軒目、白い門", homeBanner: "送迎用の自宅の位置がまだありません — ピンを立ててください", homeBannerBtn: "自宅にピン", locate: "現在地を使う", homeHave: "自宅のピンは登録済み — ずれていれば動かせます",
    busReq: "送迎の追加／キャンセル", busReqSub: "送迎の追加依頼、または不要な便のキャンセル", busPick: "日ごとに「お迎え／お送り」をタップして追加・キャンセル",
    busAdd: "追加", busCancel: "キャンセル", busCost: "追加分は次回の請求書に加算・支払い済みの便のキャンセルは返金なし", trips: (n: number) => `${n}便`,
    adult: "保護者", adultGo: "保護者も同乗", adultNote: "保護者の同乗は無料です（1席使用）",
    catalog: "Catalog", catalogOff: "この校舎のカタログはまだありません — スタッフにお尋ねください", pastTab: "終了", seq: (n: number, t: number) => `第${n}回/${t}`, noSummaryYet: "この授業のレポートはまだ送られていません", chipLeave: "欠席", chipBus: "送迎",
    study: "学習", all: "すべて", upcomingH: "これからの授業", pastH: "これまでの授業", manage: "欠席／送迎", leaveThis: "この授業を欠席する", waiting: "確認待ち", leaveSent: "欠席連絡済み", busSent: "送迎依頼済み", ridesOf: "その日の送迎", pickAny: "連絡する内容を選択", showAll: "すべて表示", hide: "閉じる",
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

type Tab = "study" | "catalog" | "request"

/** what the parent sends — the LIFF page posts it with LINE's proof of who they are */
export type BusAsk = { date: string; pickup?: "add" | "cancel"; dropoff?: "add" | "cancel"; adult?: boolean }
export type ParentRequestInput = { kind: "leave"; studentId: string; sessionIds: string[]; note?: string } | { kind: "exit"; studentId: string; lastDate: string; reasonIds: string[]; note?: string }
  | { kind: "bus"; studentId: string; bus: BusAsk[]; note?: string }
  | { kind: "return"; studentId: string; startDate?: string; note?: string }
  | { kind: "home"; studentId: string; home: { lat: number; lng: number; addressNote?: string }; note?: string }

/** `framed` = inside the staff preview's phone frame: the tab bar sticks to the frame, not the browser window */
export function ParentApp({ view, lang: initialLang, today, framed, openCourseSummary, onRequest, requests, openAction, catalogPreview }: { view: ParentView; lang?: FormLang; today: string; framed?: boolean
  /** staff preview: the branch catalog built from this browser's data (a parent's phone uses view.catalogToken) */
  catalogPreview?: CatalogToken
  /** opened from the สรุปจบคอร์ส LINE message (…&cs=<id>) — go straight to it */
  openCourseSummary?: string
  /** แจ้งลา / แจ้งลาออก (owner 2026-10-14) — unset in the staff preview (the forms show, nothing is sent) */
  onRequest?: (input: ParentRequestInput) => Promise<{ ok: boolean; error?: string }>
  requests?: ParentRequest[]
  /** rich menu deep link (…&act=leave|exit|bus|home) */
  openAction?: "leave" | "exit" | "bus" | "home" }) {
  const brand = view.children[0]?.brand ?? "nockacademy"
  // Japanese families at Liclass open in Japanese, everyone else in Thai — the chip switches any time
  const [lang, setLang] = useState<FormLang>(initialLang ?? (brand === "liclass" && /[\u3040-\u30ff\u4e00-\u9fff]/.test(view.familyName) ? "ja" : "th"))
  const opened = openCourseSummary ? view.children.find((c) => c.courseSummaries?.some((x) => x.id === openCourseSummary)) : undefined
  const [childId, setChildId] = useState(opened?.id ?? view.children[0]?.id ?? "")
  const [tab, setTab] = useState<Tab>(opened ? "study" : openAction === "exit" || openAction === "home" ? "request" : "study")
  const [ask, setAsk] = useState(openAction)
  const [csId, setCsId] = useState<string | null>(opened ? openCourseSummary! : null)
  const t = DICT[lang]
  const child = view.children.find((c) => c.id === childId) ?? view.children[0]
  const latin = lang !== "th" && !(lang === "ja" && brand === "liclass")
  const nick = (c: ParentChild) => (latin && c.nicknameEn) || c.nickname
  const family = (latin && view.familyNameEn) || view.familyName
  const tomorrow = (() => { const [y, m, d] = today.split("-").map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}` })()
  const dayLabel = (d: string) => (d === today ? t.today : d === tomorrow ? t.tomorrow : fmtDay(d, lang))
  const usesBus = view.children.some((c) => c.busDays.length > 0)
  // owner 2026-11-06: schedule + attendance + summaries + bus are ONE page; absences and bus asks live on each class row
  const tabs: { key: Tab; label: string; icon: typeof CalendarDaysIcon }[] = [
    { key: "study", label: t.study, icon: CalendarDaysIcon },
    { key: "catalog", label: t.catalog, icon: BookOpenIcon },
    { key: "request", label: t.request, icon: ClipboardPenIcon },
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
                <UserIcon className="size-3.5" />{nick(c)} <span className="text-xs opacity-70">{c.left ? t.leftTag : c.grade}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      <main className={cn("flex-1 space-y-3 p-3", framed ? "pb-3" : "pb-24")}>
        {/* owner 2026-10-19: a family on the bus without a home pin is asked for it, wherever they are in the app */}
        {usesBus && !view.home && !(tab === "request" && ask === "home") && (
          <button type="button" onClick={() => { setAsk("home"); setTab("request") }} className="flex w-full items-center gap-3 rounded-2xl bg-amber-50 p-3 text-left text-sm text-amber-900 ring-1 ring-amber-200">
            <MapPinHouseIcon className="size-5 shrink-0" /><span className="min-w-0 flex-1">{t.homeBanner}</span>
            <span className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white">{t.homeBannerBtn}</span>
          </button>
        )}
        {!child ? null : tab === "study"
          ? <Study key={child.id} view={view} child={child} t={t} lang={lang} dayLabel={dayLabel} csId={csId} setCsId={setCsId} onRequest={onRequest} requests={requests} onReturn={() => setTab("request")} />
          : tab === "catalog" ? (view.catalogToken || catalogPreview ? <Catalog token={view.catalogToken ?? ""} preview={catalogPreview} /> : <Empty text={t.catalogOff} />)
          : <RequestTab key={`${child.id}|${ask ?? ""}`} view={view} child={child} t={t} lang={lang} today={today} onRequest={onRequest} requests={requests} initial={ask} />}
        <p className="pt-2 text-center text-[11px] text-muted-foreground">{t.updated} {(() => { const g = new Date(view.generatedAt); return `${fmtDay(`${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`, lang)} ${String(g.getHours()).padStart(2, "0")}:${String(g.getMinutes()).padStart(2, "0")}` })()}</p>
      </main>

      <nav className={cn("z-10 mx-auto flex w-full max-w-lg border-t bg-background/95 backdrop-blur", framed ? "sticky bottom-0" : "fixed inset-x-0 bottom-0")}>
        {tabs.map((x) => (
          <button key={x.key} type="button" onClick={() => { setTab(x.key); setCsId(null) }} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", tab === x.key ? "font-medium text-primary" : "text-muted-foreground")}>
            <x.icon className="size-5" />{x.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

type T = (typeof DICT)["th"]

/** owner 2026-11-06: ตารางเรียน + การเข้าเรียน + สรุปการเรียน + รถรับส่ง in one page — filter by course or see everything; absence / bus asks sit on each class */
function Study({ child, t, lang, dayLabel, csId, setCsId, onRequest, requests, onReturn }: {
  view: ParentView; child: ParentChild; t: T; lang: FormLang; dayLabel: (d: string) => string; csId: string | null; setCsId: (id: string | null) => void
  onRequest?: (input: ParentRequestInput) => Promise<{ ok: boolean; error?: string }>; requests?: ParentRequest[]; onReturn: () => void
}) {
  const [course, setCourse] = useState("")
  const [view, setView] = useState<"all" | "past">("all")
  const open = csId ? child.courseSummaries?.find((x) => x.id === csId) : undefined
  if (open) return <CourseEnd cs={open} t={t} lang={lang} onBack={() => setCsId(null)} />
  const hasBus = child.brand === "liclass" || child.busDays.length > 0
  const inC = (x: { courseId?: string }) => !course || x.courseId === course
  const courseName = (id?: string) => child.courses.find((c) => c.id === id)?.name
  const many = child.courses.length > 1
  const upcoming = child.upcoming.filter(inC)
  const days = new Map<string, ParentChild["upcoming"]>()
  upcoming.forEach((c) => days.set(c.date, [...(days.get(c.date) ?? []), c]))
  const ends = (child.courseSummaries ?? []).filter(inC)
  const attendance = child.attendance.filter(inC)
  const key = (x: { date: string; subjects: string[] }) => `${x.date}|${x.subjects.join("+")}`
  const sums = new Map(child.summaries.filter(inC).map((x) => [key(x), x]))
  const past: { date: string; start: string; subjects: string[]; courseId?: string; status?: "present" | "absent" | "leave"; sum?: ParentChild["summaries"][number] }[] = attendance.map((a) => ({ ...a, sum: sums.get(key(a)) }))
  const used = new Set(past.map((r) => (r.sum ? key(r.sum) : "")))
  child.summaries.filter(inC).filter((x) => !used.has(key(x))).forEach((x) => past.push({ date: x.date, start: "", subjects: x.subjects, courseId: x.courseId, sum: x }))
  past.sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  const present = attendance.filter((a) => a.status === "present").length
  const pkgs = child.packages.filter(inC)
  return (
    <>
      {child.left && (
        // owner 2026-10-14: a child who left — history stays, and the family can ask to come back
        <section className="space-y-2 rounded-2xl bg-background p-4 text-center shadow-sm">
          <p className="font-medium">{t.leftSince(fmtDay(child.left.since, lang))}</p>
          <p className="text-sm text-muted-foreground">{t.leftNote}</p>
          <button type="button" onClick={onReturn} className="mx-auto mt-1 flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground">{t.returnReq}</button>
        </section>
      )}
      {many && (
        <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3">
          {[{ id: "", name: t.all }, ...child.courses].map((c) => (
            <button key={c.id || "all"} type="button" onClick={() => setCourse(c.id)} className={cn("shrink-0 rounded-full px-3 py-1.5 text-sm ring-1", course === c.id ? "bg-primary font-medium text-primary-foreground ring-primary" : "bg-background ring-foreground/10")}>{c.name}</button>
          ))}
        </div>
      )}
      <div className="flex rounded-full bg-muted p-1">
        {([["all", t.all], ["past", t.pastTab]] as const).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setView(k)} className={cn("flex-1 rounded-full px-3 py-1.5 text-sm", view === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{label}{k === "past" && <span className="ml-1 text-xs text-muted-foreground">{past.length}</span>}</button>
        ))}
      </div>
      {view === "all" && (
        <>
      {!child.left && (
        <>
          <p className="px-1 pt-1 text-sm font-semibold">{t.upcomingH}</p>
          {days.size === 0 ? <Empty text={t.noClass} /> : [...days.entries()].map(([date, list]) => (
            <section key={date} className="space-y-1.5">
              <p className="px-1 text-xs font-semibold text-muted-foreground">{dayLabel(date)}</p>
              {list.map((c, i) => <ClassCard key={c.sessionId} c={c} first={i === 0} child={child} t={t} hasBus={hasBus} tag={many && !course ? courseName(c.courseId) : undefined} onRequest={onRequest} requests={requests} />)}
            </section>
          ))}
        </>
      )}
      {pkgs.length > 0 && (
        <section className="rounded-2xl bg-background p-3 shadow-sm">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><PackageIcon className="size-3.5" />{t.packages}</p>
          <ul className="space-y-1.5">
            {pkgs.map((p, i) => (
              <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate">{p.course}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{p.remaining != null && p.total != null ? `${t.left(p.remaining, p.total)} · ` : ""}{t.until} {fmtDay(p.until, lang)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {ends.length > 0 && (
        <section className="space-y-1.5">
          <p className="flex items-center gap-1.5 px-1 text-xs font-semibold text-muted-foreground"><GraduationCapIcon className="size-3.5" />{t.courseEnd}</p>
          {ends.map((x) => (
            <button key={x.id} type="button" onClick={() => setCsId(x.id)} className="flex w-full items-center gap-3 rounded-2xl bg-background p-3 text-left shadow-sm">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><GraduationCapIcon className="size-5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{x.course}</span>
                <span className="block text-xs text-muted-foreground">{fmtDay(x.from, lang)} – {fmtDay(x.to, lang)} · {t.view}</span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </section>
      )}
        </>
      )}
      {view === "past" && (
        <>
          {attendance.length > 0 && (
            <section className="rounded-2xl bg-background p-3 text-center shadow-sm">
              <p className="text-xs text-muted-foreground">{t.rate}</p>
              <p className="text-2xl font-semibold tabular-nums">{present} / {attendance.length}</p>
            </section>
          )}
          {past.length === 0 ? <Empty text={t.noAttendance} /> : (
            <ul className="space-y-1.5">
              {past.map((r, i) => <PastRow key={`${r.date}${r.start}${i}`} r={r} t={t} lang={lang} tag={many && !course ? courseName(r.courseId) : undefined} />)}
            </ul>
          )}
        </>
      )}
    </>
  )
}

function PastRow({ r, t, lang, tag }: { r: { date: string; start: string; subjects: string[]; status?: "present" | "absent" | "leave"; sum?: { teacher: string; text: string; detail?: string } }; t: T; lang: FormLang; tag?: string }) {
  const tone = { present: "bg-emerald-100 text-emerald-800", absent: "bg-red-100 text-red-800", leave: "bg-amber-100 text-amber-900" }
  return (
    <li className="rounded-2xl bg-background p-3 text-sm shadow-sm">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{r.subjects.join(" + ")}{tag && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{tag}</span>}</span>
          <span className="block text-xs text-muted-foreground">{fmtDay(r.date, lang)} {r.start}</span>
        </span>
        {r.status && <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-xs", tone[r.status])}>{r.status === "present" ? <CheckIcon className="size-3" /> : r.status === "absent" ? <XIcon className="size-3" /> : <ClockIcon className="size-3" />}{t[r.status]}</span>}
      </div>
      <div className="mt-2 flex items-start gap-1.5 rounded-xl bg-muted/50 p-2 text-xs">
        <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        {r.sum ? (
          <span className="min-w-0 flex-1">
            {r.sum.detail && <span className="block font-medium">{r.sum.detail}</span>}
            <span className="block whitespace-pre-line">{r.sum.text}</span>
            {r.sum.teacher && <span className="mt-0.5 block text-muted-foreground">{t.teacher} {r.sum.teacher}</span>}
          </span>
        ) : <span className="text-muted-foreground">{t.noSummaryYet}</span>}
      </div>
    </li>
  )
}

type Ride = { pickup?: "add" | "cancel"; dropoff?: "add" | "cancel"; adult?: boolean }

/** one class ahead — and the two things a parent does with it: report an absence, ask for / cancel its bus ride */
function ClassCard({ c, first, child, t, hasBus, tag, onRequest, requests }: {
  c: ParentChild["upcoming"][number]; first: boolean; child: ParentChild; t: T; hasBus: boolean; tag?: string
  onRequest?: (input: ParentRequestInput) => Promise<{ ok: boolean; error?: string }>; requests?: ParentRequest[]
}) {
  const [open, setOpen] = useState(false)
  const [act, setAct] = useState<"leave" | "bus" | null>(null)
  const [leave, setLeave] = useState(false)
  const [ride, setRide] = useState<Ride>({})
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const mine = (requests ?? []).filter((r) => r.studentId === child.id && r.status === "new")
  const leaveWaiting = mine.some((r) => r.kind === "leave" && r.sessions?.some((x) => x.date === c.date && x.start === c.start))
  const busWaiting = mine.some((r) => r.kind === "bus" && r.bus?.some((x) => x.date === c.date))
  const booked: { pickup: boolean; dropoff: boolean; adult?: boolean } = child.busDays.find((b) => b.date === c.date) ?? { pickup: false, dropoff: false }
  const rides = (leg: "pickup" | "dropoff") => (ride[leg] === "add" ? true : ride[leg] === "cancel" ? false : booked[leg])
  const toggle = (leg: "pickup" | "dropoff") => setRide((r) => ({ ...r, [leg]: r[leg] ? undefined : booked[leg] ? "cancel" : "add" }))
  const canAdult = rides("pickup") || rides("dropoff")
  const rideChanged = !!(ride.pickup || ride.dropoff || (ride.adult && canAdult))
  const ready = (leave && !leaveWaiting) || rideChanged
  const canAct = !c.cancelled
  const courseLabel = child.courses.find((x) => x.id === c.courseId)?.name
  const send = async () => {
    if (!onRequest) return
    setBusy(true)
    let r: { ok: boolean; error?: string } = { ok: true }
    if (leave && !leaveWaiting) r = await onRequest({ kind: "leave", studentId: child.id, sessionIds: [c.sessionId], note })
    if (r.ok && rideChanged) r = await onRequest({ kind: "bus", studentId: child.id, bus: [{ date: c.date, ...ride, adult: canAdult ? ride.adult : undefined }], note })
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: t.sent } : { ok: false, text: r.error ?? "ส่งไม่สำเร็จ" })
    if (r.ok) { setLeave(false); setRide({}); setNote(""); setAct(null); setOpen(false) }
  }
  return (
    <article className={cn("rounded-2xl bg-background shadow-sm", c.cancelled && "opacity-60")}>
      <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); setMsg(null) }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left">
        <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{c.start}<span className="font-normal text-muted-foreground">–{c.end}</span></span>
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", c.cancelled && "line-through")}>{c.subjects.join(" + ")}{tag && <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">{tag}</span>}</span>
          {c.cancelled && <span className="block text-xs font-medium text-red-700">{t.cancelled}{c.cancelReason ? ` · ${c.cancelReason}` : ""}</span>}
          {leaveWaiting || busWaiting ? (
            <span className="mt-0.5 flex flex-wrap gap-1">
              {leaveWaiting && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900">{t.leaveSent} · {t.waiting}</span>}
              {busWaiting && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] text-sky-800">{t.busSent} · {t.waiting}</span>}
            </span>
          ) : null}
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {msg && <p className={cn("mx-3 mb-2 rounded-xl p-2 text-xs", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>{msg.text}</p>}
      {open && (
        <div className="space-y-2.5 border-t px-3 pt-2.5 pb-3">
          <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
            {c.teachers.length > 0 && <span className="flex items-center gap-1"><UserIcon className="size-3" />{t.teacher} {c.teachers.join(", ")}</span>}
            {c.room && <span className="flex items-center gap-1"><DoorOpenIcon className="size-3" />{c.room}</span>}
          </p>
          {(courseLabel || c.seq) && <p className="-mt-1.5 text-[11px] text-muted-foreground">{[courseLabel, c.seq && t.seq(c.seq.n, c.seq.total)].filter(Boolean).join(" · ")}</p>}
          {!c.cancelled && c.bus && <BusChips bus={c.bus} t={t} />}
          {canAct && (
            <>
          <div className="flex gap-1.5">
            {([["leave", t.chipLeave, CalendarOffIcon], ...(hasBus && first ? [["bus", t.chipBus, BusIcon]] as const : [])] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" aria-pressed={act === k} onClick={() => setAct(act === k ? null : k)} className={cn("flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ring-1", act === k ? "bg-primary/10 font-medium text-primary ring-primary/40" : "text-muted-foreground ring-foreground/15")}><Icon className="size-3.5" />{label}</button>
            ))}
          </div>
          {act === "leave" && (
          <button type="button" disabled={leaveWaiting} onClick={() => setLeave(!leave)} className={cn("flex w-full items-center gap-2.5 rounded-xl p-2.5 text-left text-sm ring-1 disabled:opacity-50", leave ? "bg-amber-50 ring-amber-400" : "ring-foreground/10")}>
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-md border", leave ? "border-amber-500 bg-amber-500 text-white" : "border-muted-foreground/40")}>{leave && <CheckIcon className="size-3.5" />}</span>
            <CalendarOffIcon className="size-4 text-amber-700" />{t.leaveThis}
          </button>
          )}
          {act === "bus" && hasBus && first && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">{t.ridesOf}</p>
              <div className="flex flex-wrap items-center gap-2">
                {(["pickup", "dropoff"] as const).map((leg) => {
                  const want = ride[leg], on = booked[leg]
                  return (
                    <button key={leg} type="button" onClick={() => toggle(leg)}
                      className={cn("rounded-full px-2.5 py-1.5 text-xs font-medium ring-1",
                        want === "add" ? "bg-emerald-100 text-emerald-800 ring-emerald-400" : want === "cancel" ? "bg-red-50 text-red-700 line-through ring-red-300" : on ? "bg-sky-100 text-sky-800 ring-sky-300" : "text-muted-foreground ring-foreground/15")}>
                      {want === "add" ? `+ ${t.busAdd} ` : want === "cancel" ? `${t.busCancel} ` : ""}{leg === "pickup" ? t.pickup : t.dropoff}
                    </button>
                  )
                })}
                {booked.adult ? <span className="rounded-full bg-violet-100 px-2.5 py-1.5 text-xs font-medium text-violet-800">{t.adultGo}</span> : (
                  <button type="button" disabled={!canAdult} onClick={() => setRide((r) => ({ ...r, adult: !r.adult }))}
                    className={cn("flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium ring-1 disabled:opacity-40", ride.adult && canAdult ? "bg-violet-100 text-violet-800 ring-violet-400" : "text-muted-foreground ring-foreground/15")}>
                    <UserIcon className="size-3.5" />{ride.adult && canAdult ? `+ ${t.adult}` : t.adult}
                  </button>
                )}
              </div>
              <p className="rounded-xl bg-amber-50 p-2 text-xs text-amber-900">{t.busCost} · {t.adultNote}</p>
            </div>
          )}
          {act && <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.noteLabel} className="w-full rounded-xl border bg-background p-2.5 text-sm" />}
          {act && <button type="button" disabled={!ready || busy || !onRequest} onClick={send} className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy && <LoaderCircleIcon className="size-4 animate-spin" />}{!onRequest ? t.preview : busy ? t.sending : t.send}
          </button>}
            </>
          )}
        </div>
      )}
    </article>
  )
}

function BusChips({ bus, t }: { bus: { pickup: boolean; dropoff: boolean; adult?: boolean }; t: T }) {
  return (
    <span className="flex gap-1.5">
      {bus.pickup && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900"><BusIcon className="size-3" />{t.pickup}</span>}
      {bus.dropoff && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] text-amber-900"><BusIcon className="size-3" />{t.dropoff}</span>}
      {bus.adult && <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] text-violet-800"><UserIcon className="size-3" />{t.adultGo}</span>}
    </span>
  )
}

/** one สรุปจบคอร์ส — the summary (a Bundle per subject too) and the progress charts */
function CourseEnd({ cs, t, lang, onBack }: { cs: ParentCourseSummary; t: T; lang: FormLang; onBack: () => void }) {
  const [only, setOnly] = useState("")
  const rows = only ? progressForSubject(cs.progress, only, cs.subjects) : cs.progress
  const lines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => { const m = l.match(/^([^:：]{1,20})[:：]\s*(.*)$/); return m && cs.subjects.includes(m[1].trim()) ? { subject: m[1].trim(), text: m[2] } : { subject: "", text: l } })
    .filter((l) => !only || l.subject === only)
  const block = (label: string, v: string) => {
    const ls = lines(v)
    return ls.length ? (
      <div className="rounded-2xl bg-background p-3 shadow-sm">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <div className="space-y-1 text-sm">{ls.map((l, i) => <p key={i} className="flex items-start gap-1.5">{l.subject && !only && <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[11px]", subjectColor(l.subject).chip)}>{l.subject}</span>}<span>{l.text}</span></p>)}</div>
      </div>
    ) : null
  }
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 px-1 text-sm text-muted-foreground"><ArrowLeftIcon className="size-4" />{t.back}</button>
      <section className="rounded-2xl bg-background p-3 shadow-sm">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><GraduationCapIcon className="size-3.5" />{t.courseEnd}</p>
        <p className="mt-0.5 text-lg font-semibold">{cs.course}</p>
        <p className="text-xs text-muted-foreground">{fmtDay(cs.from, lang)} – {fmtDay(cs.to, lang)}{cs.teacher && ` · ${t.by} ${cs.teacher}`}</p>
        {cs.bundle && (
          <div className="mt-2.5 flex gap-1 overflow-x-auto rounded-full bg-muted p-1">
            {["", ...cs.subjects].map((x) => (
              <button key={x || "all"} type="button" onClick={() => setOnly(x)} className={cn("flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-sm whitespace-nowrap", only === x ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>
                {x && <span className={cn("size-2 rounded-full", subjectColor(x).bar)} />}{x || t.whole}
              </button>
            ))}
          </div>
        )}
      </section>
      {block(t.overall, cs.overallProgress)}
      {block(t.strengths, cs.strengths)}
      {block(t.improve, cs.toImprove)}
      <section className="space-y-2 rounded-2xl bg-background p-3 shadow-sm">
        <p className="text-sm font-semibold">{t.progress}{only && ` · ${only}`}</p>
        <CourseProgress rows={rows} />
      </section>
    </div>
  )
}

/** แจ้งลาหยุด / แจ้งลาออก (owner 2026-10-14) — goes to the office team in the ERP; the parent is told on LINE */
function RequestTab({ view, child, t, lang, today, onRequest, requests, initial }: {
  view: ParentView; child: ParentChild; t: T; lang: FormLang; today: string
  onRequest?: (input: ParentRequestInput) => Promise<{ ok: boolean; error?: string }>; requests?: ParentRequest[]; initial?: "leave" | "exit" | "bus" | "home"
}) {
  // owner 2026-10-19: bus rides can be asked for / cancelled where the school runs a bus (Liclass, or already riding)
  const hasBus = child.brand === "liclass" || child.busDays.length > 0
  const [mode, setMode] = useState<"exit" | "return" | "home" | null>(child.left ? "return" : initial === "home" && !hasBus ? null : initial === "exit" || initial === "home" ? initial : null)
  // owner 2026-10-19: the house pin for the bus — starts where the school has it (if anywhere)
  const [homeLoc, setHomeLoc] = useState<{ lat: number; lng: number } | undefined>(view.home ? { lat: view.home.lat, lng: view.home.lng } : undefined)
  const [homeNote, setHomeNote] = useState(view.home?.addressNote ?? "")
  const [startDate, setStartDate] = useState("")
  const [lastDate, setLastDate] = useState(child.packages.map((p) => p.until).sort().at(-1) ?? today)
  const [reasons, setReasons] = useState<string[]>([])
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const mine = (requests ?? []).filter((r) => r.studentId === child.id)
  const label = (r: { label: string; en?: string; ja?: string }) => (lang === "en" && r.en) || (lang === "ja" && r.ja) || r.label
  const submit = async () => {
    if (!onRequest || !mode) return
    setBusy(true)
    const r = await onRequest(mode === "home" ? { kind: "home", studentId: child.id, home: { ...homeLoc!, addressNote: homeNote.trim() || undefined }, note }
      : mode === "return" ? { kind: "return", studentId: child.id, startDate: startDate || undefined, note }
      : { kind: "exit", studentId: child.id, lastDate, reasonIds: reasons, note })
    setBusy(false)
    setMsg(r.ok ? { ok: true, text: t.sent } : { ok: false, text: r.error ?? "ส่งไม่สำเร็จ" })
    if (r.ok) { setMode(null); setReasons([]); setNote(""); setStartDate("") }
  }
  const ready = mode === "exit" ? !!lastDate : mode === "home" ? !!homeLoc : mode === "return"
  return (
    <div className="space-y-3">
      {msg && <p className={cn("rounded-2xl p-3 text-sm", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>{msg.text}</p>}
      {!mode ? (
        <div className="grid gap-2">
          {(child.left ? [["return", RotateCcwIcon, t.returnReq, t.returnSub]] as const
            : [...(hasBus ? [["home", MapPinHouseIcon, t.homeReq, t.homeReqSub]] as const : []), ["exit", DoorOpenIcon, t.exitReq, t.exitReqSub]] as const).map(([k, Icon, title, sub]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setMsg(null) }} className="flex items-center gap-3 rounded-2xl bg-background p-4 text-left shadow-sm">
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", k === "return" ? "bg-emerald-100 text-emerald-700" : k === "home" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-700")}><Icon className="size-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-medium">{title}</span><span className="block text-xs text-muted-foreground">{sub}</span></span>
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      ) : (
        <section className="space-y-3 rounded-2xl bg-background p-3 shadow-sm">
          <button type="button" onClick={() => setMode(null)} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeftIcon className="size-4" />{t.back}</button>
          <p className="text-lg font-semibold">{mode === "return" ? t.returnReq : mode === "home" ? t.homeReq : t.exitReq}</p>
          {mode === "home" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{view.home ? t.homeHave : t.homePick}</p>
              <div className="h-64 overflow-hidden rounded-xl"><MapPin value={homeLoc} onChange={setHomeLoc} locateLabel={t.locate} /></div>
              <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{t.homeNote}</span>
                <input value={homeNote} onChange={(e) => setHomeNote(e.target.value)} placeholder={t.homeNotePh} className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
              </label>
            </div>
          ) : mode === "return" ? (
            <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{t.startFrom}</span>
              <input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
            </label>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{t.lastDay}</span>
                <input type="date" min={today} value={lastDate} onChange={(e) => setLastDate(e.target.value)} className="h-10 w-full rounded-xl border bg-background px-3 text-sm" />
              </label>
              {!!view.exitReasons?.length && (
                <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground">{t.whyLeave}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {view.exitReasons.map((r) => {
                      const on = reasons.includes(r.id)
                      return <button key={r.id} type="button" onClick={() => setReasons(on ? reasons.filter((x) => x !== r.id) : [...reasons, r.id])} className={cn("rounded-full px-3 py-1.5 text-sm ring-1", on ? "bg-primary/10 font-medium text-primary ring-primary/40" : "ring-foreground/10")}>{label(r)}</button>
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <label className="block space-y-1"><span className="text-xs font-medium text-muted-foreground">{t.noteLabel}</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border bg-background p-2.5 text-sm" />
          </label>
          <button type="button" disabled={!ready || busy || !onRequest} onClick={submit} className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50">
            {busy && <LoaderCircleIcon className="size-4 animate-spin" />}{!onRequest ? t.preview : busy ? t.sending : t.send}
          </button>
        </section>
      )}
      {mine.length > 0 && (
        <section className="space-y-1.5">
          <p className="px-1 text-xs font-semibold text-muted-foreground">{t.myRequests}</p>
          {mine.map((r) => (
            <article key={r.id} className="rounded-2xl bg-background p-3 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 font-medium">{r.kind === "leave" ? `${t.leaveReq} · ${t.classes(r.sessions?.length ?? 0)}` : r.kind === "return" ? t.returnReq : r.kind === "bus" ? t.busReq : r.kind === "home" ? t.homeReq : `${t.exitReq} · ${fmtDay(r.lastDate!, lang)}`}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px]", r.status === "new" ? "bg-amber-100 text-amber-900" : r.status === "done" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>{t[`st_${r.status}`]}</span>
              </div>
              {r.kind === "leave" && <p className="text-xs text-muted-foreground">{r.sessions?.map((x) => `${fmtDay(x.date, lang)} ${x.start}`).join(" · ")}</p>}
              {r.kind === "bus" && <p className="text-xs text-muted-foreground">{r.bus?.map((x) => `${fmtDay(x.date, lang)} ${[x.pickup && `${t.pickup} ${x.pickup === "add" ? "+" : "✕"}`, x.dropoff && `${t.dropoff} ${x.dropoff === "add" ? "+" : "✕"}`, x.adult && `+ ${t.adult}`].filter(Boolean).join(", ")}`).join(" · ")}</p>}
              {r.result && <p className="mt-1 text-xs">{r.result}</p>}
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function Catalog({ token, preview }: { token: string; preview?: CatalogToken }) {
  return <div className="-mx-3 -mt-3"><CatalogApp token={token} preview={preview} /></div>
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-2xl border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">{text}</p>
}
