"use client"

// Parent app v1 (owner 2026-10-09) — what a parent sees inside LINE. Pure view of a ParentView: no store, no staff data,
// so the same screen runs on the parent's phone (/liff/parent) and in the staff preview (Family › ดูแบบผู้ปกครอง).
import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { ArrowLeftIcon, BookOpenIcon, EllipsisIcon, LayoutDashboardIcon, ChevronDownIcon, CalendarOffIcon, LoaderCircleIcon, BusIcon, MapPinHouseIcon, CalendarDaysIcon, ChevronRightIcon, GraduationCapIcon, DoorOpenIcon, MessageSquareTextIcon, UserIcon } from "lucide-react"
import type { ParentChild, ParentCourseSummary, ParentView } from "@/domain/rules/parent-view"
import { progressForSubject } from "@/domain/rules/summaries"
import { InfoTip } from "@/components/app/info-tip"
import { FilterChipGroup } from "@/components/app/filter-chip-group"
import { NativeSelect } from "@/components/app/native-select"
import { Segmented, Tabs } from "@/components/app/page-layout"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Pill } from "@/components/app/badges"
import { AiInsightBox, CourseProgress } from "@/components/app/course-progress"
import { subjectColor } from "@/components/app/subject-color"
import type { CatalogToken, FormLang, ParentRequest } from "@/domain/types"
import { cn } from "@/lib/utils"
import { useUiLang } from "@/lib/i18n"

// the map loads only when a parent opens "ปักหมุดบ้าน" (Leaflet is big — the rest of the app stays light in LINE)
const CatalogApp = dynamic(() => import("@/app/liff/catalog/catalog-app").then((m) => m.CatalogApp), { ssr: false, loading: () => <div className="h-40 animate-pulse rounded-[8px] bg-muted" /> })
const MapPin = dynamic(() => import("@/app/liff/form/map-pin").then((m) => m.MapPin), { ssr: false, loading: () => <div className="h-full animate-pulse rounded-[8px] bg-muted" /> })

const DICT = {
  th: {
    hello: "สวัสดีค่ะ", schedule: "ตารางเรียน", summaries: "สรุปการเรียน", attendance: "การเข้าเรียน", bus: "รถรับส่ง",
    next: "คาบถัดไป", noClass: "ยังไม่มีคาบเรียนใน 30 วันข้างหน้า", packages: "คอร์สที่เรียนอยู่", left: (n: number, t: number) => `เหลือ ${n} / ${t} คาบ`, until: "ถึง",
    teacher: "ครู", room: "ห้อง", cancelled: "งดเรียน", pickup: "รถรับ", dropoff: "รถส่ง", busNote: "เวลารถรับ-ส่งแอดมินจะแจ้งทาง LINE",
    noSummary: "ยังไม่มีสรุปการเรียน", noAttendance: "ยังไม่มีประวัติการเข้าเรียน", noBus: "ไม่ได้ใช้รถรับส่ง", present: "มาเรียน", absent: "ขาด", leave: "ลา",
    rate: "มาเรียน", updated: "อัปเดต", today: "วันนี้", tomorrow: "พรุ่งนี้",
    courseEnd: "สรุปจบคอร์ส", newTag: "ใหม่", nextClasses: "คาบเรียนถัดไป", allCourses: "คอร์สเรียนทั้งหมด", noCourseEnd: "ยังไม่มีสรุปจบคอร์ส", lessonNotes: "สรุปรายคาบ", view: "ดูสรุปและพัฒนาการ", back: "กลับ", whole: "ทั้งคอร์ส",
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
    hours: (m: number) => `${m / 60 % 1 ? (m / 60).toFixed(1) : m / 60} ชม.`, more: "อื่นๆ", language: "ภาษา", statDone: "เรียนแล้ว", statPresent: "มา", statLeave: "ลา", statLeft: "เหลือ", overview: "ภาพรวม", classesHeld: "คลาสที่เรียนอยู่", everyDay: (d: string) => `ทุก ${d}`, openSchedule: "ดูตารางเรียน", noCourses: "ยังไม่มีคอร์สที่เรียนอยู่", students: (n: number) => `${n} คน`, nextShort: "ถัดไป",
    doneOf: "เรียนแล้ว / ทั้งหมด", leftN: (n: number) => `เหลือ ${n} คาบ`, catalog: "Catalog", catalogOff: "ยังไม่มีแคตตาล็อกของสาขานี้ — ถามแอดมินได้เลยค่ะ", pastTab: "ผ่านไปแล้ว", seq: (n: number, t: number) => `คาบที่ ${n}/${t}`, noSummaryYet: "ครูยังไม่ได้ส่งสรุปของคาบนี้", chipLeave: "แจ้งลา", chipBus: "ขอรถรับ-ส่ง",
    study: "การเรียน", all: "ทั้งหมด", upcomingH: "คาบที่จะถึง", pastH: "คาบที่ผ่านมา", manage: "แจ้งลา / รถรับ-ส่ง", leaveThis: "แจ้งลาคาบนี้", waiting: "รอแอดมิน", leaveSent: "แจ้งลาแล้ว", busSent: "ขอรถแล้ว", ridesOf: "รถรับ-ส่งของวันนั้น", pickAny: "เลือกสิ่งที่ต้องการแจ้ง", showAll: "ดูทั้งหมด", hide: "ซ่อน",
  },
  en: {
    hello: "Hello", schedule: "Schedule", summaries: "Summaries", attendance: "Attendance", bus: "School bus",
    next: "Next class", noClass: "No classes in the next 30 days", packages: "Current courses", left: (n: number, t: number) => `${n} of ${t} classes left`, until: "until",
    teacher: "Teacher", room: "Room", cancelled: "No class", pickup: "Pick-up", dropoff: "Drop-off", busNote: "Bus times will be sent on LINE by our staff",
    noSummary: "No lesson summaries yet", noAttendance: "No attendance yet", noBus: "Not using the school bus", present: "Present", absent: "Absent", leave: "Leave",
    rate: "Attended", updated: "Updated", today: "Today", tomorrow: "Tomorrow",
    courseEnd: "Course summaries", newTag: "New", nextClasses: "Next classes", allCourses: "All courses", noCourseEnd: "No course summary yet", lessonNotes: "Lesson notes", view: "View summary & progress", back: "Back", whole: "Whole course",
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
    hours: (m: number) => `${m / 60 % 1 ? (m / 60).toFixed(1) : m / 60} h`, more: "More", language: "Language", statDone: "Done", statPresent: "Present", statLeave: "Leave", statLeft: "Left", overview: "Overview", classesHeld: "Weekly classes", everyDay: (d: string) => `Every ${d}`, openSchedule: "Open schedule", noCourses: "No courses yet", students: (n: number) => `${n} children`, nextShort: "Next",
    doneOf: "Done / total classes", leftN: (n: number) => `${n} left`, catalog: "Catalog", catalogOff: "No catalog for this branch yet — please ask our staff", pastTab: "Past", seq: (n: number, t: number) => `Class ${n}/${t}`, noSummaryYet: "No summary sent for this class yet", chipLeave: "Absence", chipBus: "Bus",
    study: "Learning", all: "All", upcomingH: "Upcoming classes", pastH: "Past classes", manage: "Absence / bus", leaveThis: "Report absence for this class", waiting: "Waiting", leaveSent: "Absence sent", busSent: "Bus asked", ridesOf: "Bus on that day", pickAny: "Pick what to send", showAll: "Show all", hide: "Hide",
  },
  ja: {
    hello: "こんにちは", schedule: "時間割", summaries: "授業レポート", attendance: "出欠", bus: "送迎バス",
    next: "次の授業", noClass: "30日以内の授業はありません", packages: "受講中のコース", left: (n: number, t: number) => `残り ${n} / ${t} 回`, until: "まで",
    teacher: "講師", room: "教室", cancelled: "休講", pickup: "お迎え", dropoff: "お送り", busNote: "送迎時間はスタッフからLINEでお知らせします",
    noSummary: "授業レポートはまだありません", noAttendance: "出欠の記録はまだありません", noBus: "送迎バスの利用なし", present: "出席", absent: "欠席", leave: "お休み",
    rate: "出席率", updated: "更新", today: "今日", tomorrow: "明日",
    courseEnd: "コース修了レポート", newTag: "新着", nextClasses: "次の授業", allCourses: "受講中のコース", noCourseEnd: "コース修了レポートはまだありません", lessonNotes: "授業レポート", view: "レポートと成長を見る", back: "戻る", whole: "コース全体",
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
    hours: (m: number) => `${m / 60 % 1 ? (m / 60).toFixed(1) : m / 60}時間`, more: "その他", language: "言語", statDone: "受講", statPresent: "出席", statLeave: "欠席", statLeft: "残り", overview: "概要", classesHeld: "通っているクラス", everyDay: (d: string) => `毎週${d}`, openSchedule: "時間割を見る", noCourses: "受講中のコースはありません", students: (n: number) => `${n}名`, nextShort: "次回",
    doneOf: "受講済み / 全体", leftN: (n: number) => `残り${n}回`, catalog: "Catalog", catalogOff: "この校舎のカタログはまだありません — スタッフにお尋ねください", pastTab: "終了", seq: (n: number, t: number) => `第${n}回/${t}`, noSummaryYet: "この授業のレポートはまだ送られていません", chipLeave: "欠席", chipBus: "送迎",
    study: "学習", all: "すべて", upcomingH: "これからの授業", pastH: "これまでの授業", manage: "欠席／送迎", leaveThis: "この授業を欠席する", waiting: "確認待ち", leaveSent: "欠席連絡済み", busSent: "送迎依頼済み", ridesOf: "その日の送迎", pickAny: "連絡する内容を選択", showAll: "すべて表示", hide: "閉じる",
  },
}

const DAYS = { th: ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."], en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], ja: ["日", "月", "火", "水", "木", "金", "土"] }
const MONTHS = { th: ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."], en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] }

function fmtDay(date: string, lang: FormLang) {
  const [y, m, d] = date.split("-").map(Number)
  const w = new Date(y, m - 1, d).getDay()
  if (lang === "ja") return `${m}月${d}日(${DAYS.ja[w]})`
  return `${DAYS[lang][w]} ${d} ${MONTHS[lang as "th" | "en"][m - 1]}`
}

type Tab = "overview" | "study" | "catalog" | "request"

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
  const [childId, setChildId] = useState(opened?.id ?? (view.children.length > 1 ? "" : view.children[0]?.id ?? ""))
  const paid = view.paid !== false
  const [tab, setTab] = useState<Tab>(!paid ? "catalog" : opened || openAction === "leave" || openAction === "bus" ? "study" : openAction === "exit" || openAction === "home" ? "request" : "overview")
  const [ask, setAsk] = useState(paid ? openAction : undefined)
  // an unpaid family only sees Catalog + อื่นๆ — whatever tab state says
  const cur: Tab = paid || tab === "catalog" || tab === "request" ? tab : "catalog"
  // the catalog speaks the parent app's language
  useEffect(() => { useUiLang.getState().setLang(lang) }, [lang])
  // owner 2026-11-06: Overview = every child · course · weekly class; tapping one drills into ตารางเรียน (child → course → class)
  const [course, setCourse] = useState("")
  const drill = (childId: string, courseId = "") => { setChildId(childId); setCourse(courseId); setTab("study"); setCsId(null) }
  const [csId, setCsId] = useState<string | null>(opened ? openCourseSummary! : null)
  const t = DICT[lang]
  const child = view.children.find((c) => c.id === childId) ?? view.children[0]
  // ตารางเรียน can show every child at once (childId "")
  const kids = childId === "" && tab === "study" ? view.children : child ? [child] : []
  const latin = lang !== "th" && !(lang === "ja" && brand === "liclass")
  const nick = (c: ParentChild) => (latin && c.nicknameEn) || c.nickname
  const family = (latin && view.familyNameEn) || view.familyName
  const tomorrow = (() => { const [y, m, d] = today.split("-").map(Number); const x = new Date(y, m - 1, d + 1); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}` })()
  const dayLabel = (d: string) => (d === today ? t.today : d === tomorrow ? t.tomorrow : fmtDay(d, lang))
  const usesBus = view.children.some((c) => c.busDays.length > 0)
  // owner 2026-11-06: schedule + attendance + summaries + bus are ONE page; absences and bus asks live on each class row
  const showChildTabs = view.children.length > 1 && (cur === "study" || cur === "overview")
  const childTabs = showChildTabs ? (
    <Tabs className="-mx-4 px-4" value={childId} onChange={(id) => { setChildId(id); setCourse("") }} options={[{ value: "", label: t.all }, ...view.children.map((c) => ({ value: c.id, label: nick(c) }))]} />
  ) : null
  // the compact bar shows once the full header has left the screen (works for the framed preview and the real LINE page alike)
  const headerRef = useRef<HTMLElement>(null)
  const [compact, setCompact] = useState(false)
  useEffect(() => {
    const el = headerRef.current
    if (!el || typeof IntersectionObserver === "undefined") return
    // watch inside the nearest scrolling box (the framed preview scrolls an inner div; the real LINE page scrolls the window → root null)
    let root: HTMLElement | null = el.parentElement
    while (root && !/(auto|scroll)/.test(getComputedStyle(root).overflowY)) root = root.parentElement
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting), { root })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  const tabs: { key: Tab; label: string; icon: typeof CalendarDaysIcon }[] = [
    ...(paid ? [{ key: "overview" as Tab, label: t.overview, icon: LayoutDashboardIcon }, { key: "study" as Tab, label: t.schedule, icon: CalendarDaysIcon }] : []),
    { key: "catalog", label: t.catalog, icon: BookOpenIcon },
    { key: "request", label: t.more, icon: EllipsisIcon },
  ]

  return (
    <div className={cn("mx-auto flex max-w-lg flex-col bg-background", framed ? "min-h-full" : "min-h-dvh")}>
      {/* owner 2026-11-06: no blue band, no greeting — a quiet line of who/where; the child switcher only where a child is the subject */}
      <header ref={headerRef} className="space-y-2.5 px-4 pt-4">
        <div>
          <p className="truncate text-lg font-semibold">{family}</p>
          <p className="truncate text-xs text-muted-foreground">{brand === "liclass" ? "Liclass" : "NockAcademy"} · {child?.branchName}</p>
        </div>
        {childTabs}
      </header>
      {/* owner 2026-11-09 (option ข): the header never scrolls away for good — once the full one is out of sight a small bar takes
          its place at the top (family name + the child tabs). It lives in a zero-height sticky wrapper, so showing / hiding it
          never moves the content (no jump, no scroll ping-pong) */}
      <div className="pointer-events-none sticky top-0 z-20 h-0">
        <div className={cn("pointer-events-auto absolute inset-x-0 top-0 flex items-center gap-2 border-b bg-background/95 px-4 backdrop-blur transition-opacity duration-150", compact ? "opacity-100" : "invisible opacity-0")} aria-hidden={!compact}>
          <p className={cn("truncate text-sm font-semibold", childTabs ? "max-w-[34%] shrink-0" : "py-2.5")}>{family}</p>
          {childTabs && <div className="min-w-0 flex-1">{childTabs}</div>}
        </div>
      </div>

      <main className={cn("flex-1 space-y-4 p-3", framed ? "pb-3" : "pb-24")}>
        {/* owner 2026-10-19: a family on the bus without a home pin is asked for it, wherever they are in the app */}
        {paid && usesBus && !view.home && !(cur === "request" && ask === "home") && (
          <button type="button" onClick={() => { setAsk("home"); setTab("request") }} className="flex w-full items-center gap-3 rounded-[8px] bg-amber-50 p-3 text-left text-sm text-amber-900 ring-1 ring-amber-200">
            <MapPinHouseIcon className="size-5 shrink-0" /><span className="min-w-0 flex-1">{t.homeBanner}</span>
            <span className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">{t.homeBannerBtn}</span>
          </button>
        )}
        {!child ? null : cur === "overview" ? <Overview view={childId ? { ...view, children: view.children.filter((c) => c.id === childId) } : view} t={t} lang={lang} today={today} dayLabel={dayLabel} nick={nick} onDrill={drill} />
          : cur === "study"
          ? <Study key={childId} today={today} course={course} setCourse={setCourse} kids={kids} nick={nick} t={t} lang={lang} dayLabel={dayLabel} csId={csId} setCsId={setCsId} onRequest={onRequest} requests={requests} onReturn={() => setTab("request")} />
          : cur === "catalog" ? (view.catalogToken || catalogPreview ? <Catalog token={view.catalogToken ?? ""} preview={catalogPreview} /> : <Empty text={t.catalogOff} />)
          : <RequestTab paid={paid} key={`${child.id}|${ask ?? ""}`} lang={lang} setLang={setLang} updatedAt={view.generatedAt} view={view} child={child} t={t} today={today} onRequest={onRequest} requests={requests} initial={ask} />}
      </main>

      <nav className={cn("z-10 mx-auto flex w-full max-w-lg border-t bg-background/95 backdrop-blur", framed ? "sticky bottom-0" : "fixed inset-x-0 bottom-0")}>
        {tabs.map((x) => (
          <button key={x.key} type="button" onClick={() => { setTab(x.key); setCsId(null) }} className={cn("flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]", cur === x.key ? "font-medium text-primary" : "text-muted-foreground")}>
            <x.icon className="size-5" />{x.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

const daysBetween = (a: string, b: string) => Math.round((new Date(`${b}T12:00:00`).getTime() - new Date(`${a}T12:00:00`).getTime()) / 86_400_000)

type T = (typeof DICT)["th"]

/** one chip look for every pick-one / toggle in the parent app — same as ShowChip / FilterChipGroup in the ERP (h-9 · pill · picked = pink outline) */
function Chip({ on, onClick, children, disabled, state }: { on?: boolean; onClick: () => void; children: React.ReactNode; disabled?: boolean; state?: "add" | "cancel" | "booked" }) {
  return (
    <button type="button" aria-pressed={!!on} disabled={disabled} onClick={onClick}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-3xl border px-3 text-sm whitespace-nowrap transition-colors disabled:opacity-40",
        state === "add" ? "border-emerald-400 bg-emerald-100 font-medium text-emerald-800" : state === "cancel" ? "border-red-300 bg-red-50 text-red-700 line-through" : state === "booked" ? "border-sky-300 bg-sky-100 text-sky-800"
          : on ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted/50")}>
      {children}
    </button>
  )
}

/** owner 2026-11-06: the whole family at a glance — every child, every course (KPI card), every weekly class; each one opens ตารางเรียน on that child / course */
function Overview({ view, t, lang, today, dayLabel, nick, onDrill }: { view: ParentView; t: T; lang: FormLang; today: string; dayLabel: (d: string) => string; nick: (c: ParentChild) => string; onDrill: (childId: string, courseId?: string) => void }) {
  return (
    // owner 2026-11-06: no cards — children are told apart by ONE divider; name (big) > next classes (small nested card) > courses (name, days, 4 numbers)
    <div className="divide-y">
      {view.children.map((c) => {
        const next = c.upcoming.filter((x) => !x.cancelled).slice(0, 2)
        return (
          <section key={c.id} className="space-y-4 py-5 first:pt-1 last:pb-1">
            <button type="button" onClick={() => onDrill(c.id)} className="flex w-full items-center gap-3 text-left">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-muted text-base font-semibold text-muted-foreground">{nick(c).slice(0, 1)}</span>
              <span className="min-w-0 flex-1 truncate text-lg font-semibold">{nick(c)}</span>
              <Pill tone={c.left ? "gray" : "blue"}>{c.left ? t.leftTag : c.grade}</Pill>
            </button>
            {next.length > 0 && (
              <div className="space-y-1.5">
              <p className="px-1 text-xs font-semibold text-muted-foreground">{t.nextClasses}</p>
              <div className="overflow-hidden rounded-[8px] bg-card text-sm ring-1 ring-foreground/5">
                {next.map((x) => (
                  <button key={x.sessionId} type="button" onClick={() => onDrill(c.id, x.courseId)} className="flex w-full items-center gap-2 px-3 py-1.5 text-left">
                    <span className={cn("w-14 shrink-0 text-xs", x.date === today ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground")}>{dayLabel(x.date)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{x.start}</span>
                    <span className="min-w-0 flex-1 truncate">{x.subjects.join(" + ")}</span>
                  </button>
                ))}
              </div>
              </div>
            )}
            {c.left ? <p className="text-xs text-muted-foreground">{t.leftSince(fmtDay(c.left.since, lang))}</p>
              : c.packages.length === 0 ? <p className="text-sm text-muted-foreground">{t.noCourses}</p>
              : (
                <div className="space-y-1.5">
                  <p className="px-1 text-xs font-semibold text-muted-foreground">{t.allCourses}</p>
                  <CourseRows pkgs={c.packages} t={t} lang={lang} onPick={(courseId) => onDrill(c.id, courseId)} />
                </div>
              )}
          </section>
        )
      })}
    </div>
  )
}

/**
 * owner 2026-11-06: a course is a ROW, not a KPI card — name (+ until) · its weekly days right under the name · four EQUAL stats
 * (done / present / leave / left) filling the width with hairline dividers, no colour. Same rows in Overview and ตารางเรียน.
 */
function CourseRows({ pkgs, t, lang, onPick }: { child?: ParentChild; pkgs: ParentChild["packages"]; t: T; lang: FormLang; onPick?: (courseId?: string) => void }) {
  return (
    <div className="space-y-3">
      {pkgs.map((p, i) => {
        const stats = [[t.statDone, `${p.done}/${p.sessions}`], [t.statPresent, `${p.present}`], [t.statLeave, `${p.leaves}/${p.leaveQuota}`], [t.statLeft, p.remaining != null ? `${p.remaining}` : "–"]]
        return (
          // owner ref 2026-11-06: subject tile · name + dates · link · 4 equal numbers in one outlined pill · one line per weekly class with its own progress
          <section key={i} className="space-y-3 rounded-[16px] bg-card p-4 shadow-sm ring-1 ring-foreground/5">
            <div className="flex items-center gap-3">
              <span className={cn("grid size-11 shrink-0 place-items-center rounded-[8px] text-sm font-semibold", subjectColor(p.subject ?? "").chip)}>{(p.subject ?? "?").slice(0, 2)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold">{p.course}</span>
                <span className="block truncate text-xs text-muted-foreground">{fmtDay(p.from, lang)} → {fmtDay(p.until, lang)}</span>
              </span>
              {onPick && <button type="button" onClick={() => onPick(p.courseId)} className="flex shrink-0 items-center gap-0.5 text-xs text-primary">{t.openSchedule}<ChevronRightIcon className="size-3.5" /></button>}
            </div>
            <div className="grid grid-cols-4 divide-x rounded-[8px] border py-2 text-center">
              {stats.map(([label, value]) => (
                <div key={label}><p className="text-lg leading-tight font-semibold tabular-nums">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
              ))}
            </div>
            {p.slots.length > 0 && (
              <ul className="space-y-1 text-sm">
                {p.slots.map((x) => (
                  <li key={`${x.weekday}${x.start}`} className="flex items-center gap-2">
                    <span className="min-w-0 flex-1 truncate"><span className="font-medium">{t.everyDay(DAYS[lang][x.weekday])}</span> <span className="text-muted-foreground">{x.start} · {t.hours(x.minutes)}</span></span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{x.done}/{x.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}

/** owner 2026-11-06: ตารางเรียน + การเข้าเรียน + สรุปการเรียน + รถรับส่ง in one page — all children or one, all courses or one; absence / bus asks sit on each class.
 *  No KPI / course card here (that is the Overview's job); the day sits IN the row so there are no day headings (owner: "กินพื้นที่มากเกินไป"). */
function Study({ today, course, setCourse, kids, nick, t, lang, dayLabel, csId, setCsId, onRequest, requests, onReturn }: {
  today: string; course: string; setCourse: (id: string) => void; kids: ParentChild[]; nick: (c: ParentChild) => string; t: T; lang: FormLang; dayLabel: (d: string) => string; csId: string | null; setCsId: (id: string | null) => void
  onRequest?: (input: ParentRequestInput) => Promise<{ ok: boolean; error?: string }>; requests?: ParentRequest[]; onReturn: () => void
}) {
  // owner 2026-11-09: the course summaries have their own segment (ทั้งหมด · ผ่านไปแล้ว · สรุปจบคอร์ส) — not on the Overview, not at the foot of the schedule
  const [view, setView] = useState<"all" | "past" | "ends">(csId ? "ends" : "all")
  const open = csId ? kids.flatMap((k) => k.courseSummaries ?? []).find((x) => x.id === csId) : undefined
  if (open) return <CourseEnd cs={open} t={t} lang={lang} onBack={() => setCsId(null)} />
  const multi = kids.length > 1
  const courses = [...new Map(kids.flatMap((k) => k.courses).map((c) => [c.id, c])).values()]
  const many = courses.length > 1
  const inC = (x: { courseId?: string }) => !course || x.courseId === course
  const courseName = (id?: string) => courses.find((c) => c.id === id)?.name
  const tagOf = (k: ParentChild, courseId?: string) => [multi ? nick(k) : "", many && !course ? courseName(courseId) ?? "" : ""].filter(Boolean).join(" · ") || undefined
  const hasBusOf = (k: ParentChild) => k.brand === "liclass" || k.busDays.length > 0
  const upcoming = kids.filter((k) => !k.left).flatMap((k) => k.upcoming.filter(inC).map((c) => ({ k, c }))).sort((a, b) => (a.c.date + a.c.start).localeCompare(b.c.date + b.c.start))
  const firstOfDay = new Set<string>()
  const ends = kids.flatMap((k) => (k.courseSummaries ?? []).filter(inC))
  const key = (x: { date: string; subjects: string[] }) => `${x.date}|${x.subjects.join("+")}`
  const past = kids.flatMap((k) => {
    const sums = new Map(k.summaries.filter(inC).map((x) => [key(x), x]))
    const rows: { k: ParentChild; date: string; start: string; subjects: string[]; courseId?: string; status?: "present" | "absent" | "leave"; sum?: ParentChild["summaries"][number] }[] = k.attendance.filter(inC).map((a) => ({ ...a, k, sum: sums.get(key(a)) }))
    const used = new Set(rows.map((r) => (r.sum ? key(r.sum) : "")))
    k.summaries.filter(inC).filter((x) => !used.has(key(x))).forEach((x) => rows.push({ k, date: x.date, start: "", subjects: x.subjects, courseId: x.courseId, sum: x }))
    return rows
  }).sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start))
  const only = kids.length === 1 ? kids[0] : undefined
  return (
    <>
      {only?.left && (
        // owner 2026-10-14: a child who left — history stays, and the family can ask to come back
        <section className="space-y-2 rounded-[8px] bg-card ring-1 ring-foreground/5 p-4 text-center shadow-sm">
          <p className="font-medium">{t.leftSince(fmtDay(only.left.since, lang))}</p>
          <p className="text-sm text-muted-foreground">{t.leftNote}</p>
          <Button className="mx-auto mt-1" onClick={onReturn}>{t.returnReq}</Button>
        </section>
      )}
      {many && <FilterChipGroup layout="scroll" value={course} onChange={setCourse} options={[{ value: "", label: t.all }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />}
      <Segmented className="w-full [&>button]:flex-1" label={t.schedule} value={view} onChange={setView} options={[{ value: "all", label: t.all }, { value: "past", label: `${t.pastTab} ${past.length}` }, { value: "ends", label: `${t.courseEnd} ${ends.length}` }]} />
      {view === "all" && (
        <>
          {upcoming.length === 0 ? <Empty text={t.noClass} /> : (
            <div className="space-y-1.5">
              {upcoming.map(({ k, c }) => {
                const d = `${k.id}|${c.date}`
                const first = !firstOfDay.has(d)
                firstOfDay.add(d)
                return <ClassCard key={`${k.id}${c.sessionId}`} isToday={c.date === today} dayText={dayLabel(c.date)} c={c} first={first} child={k} t={t} hasBus={hasBusOf(k)} tag={tagOf(k, c.courseId)} onRequest={onRequest} requests={requests} />
              })}
            </div>
          )}
        </>
      )}
      {view === "past" && (past.length === 0 ? <Empty text={t.noAttendance} /> : (
        <ul className="space-y-1.5">
          {past.map((r, i) => <PastRow key={`${r.k.id}${r.date}${r.start}${i}`} r={r} t={t} lang={lang} tag={tagOf(r.k, r.courseId)} />)}
        </ul>
      ))}
      {view === "ends" && (ends.length === 0 ? <Empty text={t.noCourseEnd} /> : (
        <div className="space-y-2.5">
          {[...ends].sort((a, b) => (b.sentAt ?? b.to).localeCompare(a.sentAt ?? a.to)).map((x) => {
            const owner = kids.find((k) => (k.courseSummaries ?? []).some((c) => c.id === x.id))
            const fresh = daysBetween(x.sentAt?.slice(0, 10) ?? x.to, today) <= 30
            return (
              <button key={x.id} type="button" onClick={() => setCsId(x.id)} className="flex w-full items-start gap-3 rounded-[16px] bg-card p-4 text-left shadow-sm ring-1 ring-foreground/5">
                <span className="grid size-11 shrink-0 place-items-center rounded-[8px] bg-primary/10 text-primary"><GraduationCapIcon className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2"><span className="min-w-0 flex-1 truncate text-base font-semibold">{multi && owner ? `${nick(owner)} · ` : ""}{x.course}</span>{fresh && <Pill tone="red">{t.newTag}</Pill>}</span>
                  <span className="block truncate text-xs text-muted-foreground">{fmtDay(x.from, lang)} – {fmtDay(x.to, lang)}{x.teacher && ` · ${t.by} ${x.teacher}`}</span>
                  <span className="mt-1.5 line-clamp-2 block text-sm text-muted-foreground">{x.overallProgress.replace(/\s*\n\s*/g, " ")}</span>
                  <span className="mt-2 flex items-center gap-0.5 text-xs font-medium text-primary">{t.view}<ChevronRightIcon className="size-3.5" /></span>
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </>
  )
}

function PastRow({ r, t, lang, tag }: { r: { date: string; start: string; subjects: string[]; status?: "present" | "absent" | "leave"; sum?: { teacher: string; text: string; detail?: string } }; t: T; lang: FormLang; tag?: string }) {
  const [open, setOpen] = useState(false)
  const tone = { present: "green", absent: "red", leave: "amber" } as const
  return (
    <li className="rounded-[8px] bg-muted/70 text-muted-foreground">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
        <span className="w-24 shrink-0">
          <span className="block truncate text-xs">{fmtDay(r.date, lang)}</span>
          <span className="block whitespace-nowrap text-sm font-semibold tabular-nums">{r.start || "–"}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 text-sm font-medium break-words">{r.subjects.join(" + ")}</span>
          {tag && <span className="block truncate text-xs">{tag}</span>}
        </span>
        {r.status && <Pill tone={tone[r.status]}>{t[r.status]}</Pill>}
        <ChevronDownIcon className={cn("size-4 shrink-0 self-center transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t px-3 pt-2.5 pb-3">
          {(tag || r.sum?.teacher) && <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">{r.sum?.teacher && <span className="flex items-center gap-1"><UserIcon className="size-3" />{t.teacher} {r.sum.teacher}</span>}{tag && <span>{tag}</span>}</p>}
          <div className="flex items-start gap-1.5 rounded-[8px] bg-muted/50 p-2 text-xs">
            <MessageSquareTextIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            {r.sum ? (
              <span className="min-w-0 flex-1">
                {r.sum.detail && <span className="block font-medium">{r.sum.detail}</span>}
                <span className="block whitespace-pre-line">{r.sum.text}</span>
              </span>
            ) : <span className="text-muted-foreground">{t.noSummaryYet}</span>}
          </div>
        </div>
      )}
    </li>
  )
}

type Ride = { pickup?: "add" | "cancel"; dropoff?: "add" | "cancel"; adult?: boolean }

/** one class ahead — and the two things a parent does with it: report an absence, ask for / cancel its bus ride */
function ClassCard({ dayText, isToday, c, first, child, t, hasBus, tag, onRequest, requests }: {
  dayText: string; isToday: boolean; c: ParentChild["upcoming"][number]; first: boolean; child: ParentChild; t: T; hasBus: boolean; tag?: string
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
    <article className={cn("rounded-[8px] bg-card shadow-sm ring-1 ring-foreground/5", c.cancelled && "opacity-60")}>
      {/* owner 2026-11-06: day over time on the left (fixed column) · subject (may wrap to 2 lines) with who / which course under it · the card grows with long text */}
      <button type="button" aria-expanded={open} onClick={() => { setOpen(!open); setMsg(null) }} className="flex w-full items-start gap-3 px-3 py-2.5 text-left">
        <span className="w-24 shrink-0">
          <span className={cn("block truncate text-sm font-semibold", isToday && "text-red-600 dark:text-red-400")}>{dayText}</span>
          <span className="block whitespace-nowrap text-xs tabular-nums text-muted-foreground">{c.start}–{c.end}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span className={cn("line-clamp-2 text-sm font-medium break-words", c.cancelled && "line-through")}>{c.subjects.join(" + ")}</span>
          {tag && <span className="block truncate text-xs text-muted-foreground">{tag}</span>}
          {c.cancelled && <span className="block text-xs font-medium text-red-700">{t.cancelled}{c.cancelReason ? ` · ${c.cancelReason}` : ""}</span>}
          {leaveWaiting || busWaiting ? (
            <span className="mt-1 flex flex-wrap gap-1">
              {leaveWaiting && <Pill tone="amber">{t.leaveSent} · {t.waiting}</Pill>}
              {busWaiting && <Pill tone="blue">{t.busSent} · {t.waiting}</Pill>}
            </span>
          ) : null}
        </span>
        <ChevronDownIcon className={cn("size-4 shrink-0 self-center text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {msg && <p className={cn("mx-3 mb-2 rounded-[8px] p-2 text-xs", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>{msg.text}</p>}
      {open && (
        <div className="space-y-2.5 border-t px-3 pt-2.5 pb-3">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            {(courseLabel || c.seq) && <Pill tone="gray" className="max-w-full"><BookOpenIcon className="size-3 shrink-0" /><span className="truncate">{[courseLabel, c.seq && t.seq(c.seq.n, c.seq.total)].filter(Boolean).join(" · ")}</span></Pill>}
            <span className="flex flex-wrap gap-1.5">
              {c.teachers.length > 0 && <Pill tone="gray" className="max-w-full"><UserIcon className="size-3 shrink-0" /><span className="truncate">{c.teachers.join(", ")}</span></Pill>}
              {c.room && <Pill tone="gray" className="max-w-full"><DoorOpenIcon className="size-3 shrink-0" /><span className="truncate">{c.room}</span></Pill>}
            </span>
          </div>
          {!c.cancelled && c.bus && <BusChips bus={c.bus} t={t} />}
          {canAct && (
            <>
          <div className="flex gap-1.5">
            {([["leave", t.chipLeave, CalendarOffIcon], ...(hasBus && first ? [["bus", t.chipBus, BusIcon]] as const : [])] as const).map(([k, label, Icon]) => (
              <Chip key={k} on={act === k} onClick={() => setAct(act === k ? null : k)}><Icon className="size-4" />{label}</Chip>
            ))}
          </div>
          {act === "leave" && (
            <label className={cn("flex w-full items-center gap-2.5 rounded-[8px] border p-3 text-sm", leaveWaiting ? "opacity-50" : "cursor-pointer", leave && "border-primary bg-primary/5")}>
              <Checkbox checked={leave} disabled={leaveWaiting} onCheckedChange={(v) => setLeave(!!v)} />{t.leaveThis}
            </label>
          )}
          {act === "bus" && hasBus && first && (
            <div className="space-y-2">
              <p className="flex items-center gap-1 text-xs font-medium text-muted-foreground">{t.ridesOf}<InfoTip text={`${t.busCost} · ${t.adultNote}`} /></p>
              <div className="flex flex-wrap items-center gap-2">
                {(["pickup", "dropoff"] as const).map((leg) => {
                  const want = ride[leg], on = booked[leg]
                  return (
                    <Chip key={leg} onClick={() => toggle(leg)} state={want === "add" ? "add" : want === "cancel" ? "cancel" : on ? "booked" : undefined}>
                      {want === "add" ? `+ ${t.busAdd} ` : want === "cancel" ? `${t.busCancel} ` : ""}{leg === "pickup" ? t.pickup : t.dropoff}
                    </Chip>
                  )
                })}
                {booked.adult ? <Pill tone="violet">{t.adultGo}</Pill> : (
                  <Chip on={!!ride.adult && canAdult} disabled={!canAdult} onClick={() => setRide((r) => ({ ...r, adult: !r.adult }))}><UserIcon className="size-4" />{ride.adult && canAdult ? `+ ${t.adult}` : t.adult}</Chip>
                )}
              </div>
            </div>
          )}
          {act && <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t.noteLabel} />}
          {act && (
            <Button className="w-full" size="lg" disabled={!ready || busy || !onRequest} onClick={send}>
              {busy && <LoaderCircleIcon className="animate-spin" />}{!onRequest ? t.preview : busy ? t.sending : t.send}
            </Button>
          )}
            </>
          )}
        </div>
      )}
    </article>
  )
}

function BusChips({ bus, t }: { bus: { pickup: boolean; dropoff: boolean; adult?: boolean }; t: T }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {bus.pickup && <Pill tone="amber"><BusIcon className="size-3" />{t.pickup}</Pill>}
      {bus.dropoff && <Pill tone="amber"><BusIcon className="size-3" />{t.dropoff}</Pill>}
      {bus.adult && <Pill tone="violet"><UserIcon className="size-3" />{t.adultGo}</Pill>}
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
      <div className="rounded-[8px] bg-card ring-1 ring-foreground/5 p-3 shadow-sm">
        <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
        <div className="space-y-1 text-sm">{ls.map((l, i) => <p key={i} className="flex items-start gap-1.5">{l.subject && !only && <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[11px]", subjectColor(l.subject).chip)}>{l.subject}</span>}<span>{l.text}</span></p>)}</div>
      </div>
    ) : null
  }
  return (
    <div className="space-y-3">
      <button type="button" onClick={onBack} className="flex items-center gap-1 px-1 text-sm text-muted-foreground"><ArrowLeftIcon className="size-4" />{t.back}</button>
      <section className="rounded-[8px] bg-card ring-1 ring-foreground/5 p-3 shadow-sm">
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><GraduationCapIcon className="size-3.5" />{t.courseEnd}</p>
        <p className="mt-0.5 text-lg font-semibold">{cs.course}</p>
        <p className="text-xs text-muted-foreground">{fmtDay(cs.from, lang)} – {fmtDay(cs.to, lang)}{cs.teacher && ` · ${t.by} ${cs.teacher}`}</p>
        {cs.bundle && (
          <FilterChipGroup className="mt-2.5" layout="scroll" value={only} onChange={setOnly} options={["", ...cs.subjects].map((x) => ({ value: x, label: x || t.whole }))} />
        )}
      </section>
      {/* owner 2026-11-09: the AI reading sits right under the course name — the first thing the parent reads */}
      <AiInsightBox rows={rows} />
      {block(t.overall, cs.overallProgress)}
      {block(t.strengths, cs.strengths)}
      {block(t.improve, cs.toImprove)}
      <section className="space-y-2 rounded-[8px] bg-card ring-1 ring-foreground/5 p-3 shadow-sm">
        <p className="text-sm font-semibold">{t.progress}{only && ` · ${only}`}</p>
        <CourseProgress rows={rows} hideAi />
      </section>
    </div>
  )
}

/** แจ้งลาหยุด / แจ้งลาออก (owner 2026-10-14) — goes to the office team in the ERP; the parent is told on LINE */
function RequestTab({ paid, setLang, updatedAt, view, child, t, lang, today, onRequest, requests, initial }: {
  paid: boolean; setLang: (l: FormLang) => void; updatedAt: string
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
      {msg && <p className={cn("rounded-[8px] p-3 text-sm", msg.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>{msg.text}</p>}
      {/* owner 2026-11-06: อื่นๆ is a LIST of what you can do — language (dropdown at the right) for everyone; the rest once the family has paid */}
      {!mode && (
        <div className="divide-y overflow-hidden rounded-[8px] bg-card ring-1 ring-foreground/5">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1 font-medium">{t.language}</span>
            <NativeSelect className="w-32 shrink-0" value={lang} onChange={(e) => setLang(e.target.value as FormLang)} options={[{ value: "th", label: "ไทย" }, { value: "en", label: "English" }, { value: "ja", label: "日本語" }]} />
          </div>
          {paid && (child.left ? [["return", t.returnReq, t.returnSub]] as const
            : [...(hasBus ? [["home", t.homeReq, t.homeReqSub]] as const : []), ["exit", t.exitReq, t.exitReqSub]] as const).map(([k, title, sub]) => (
            <button key={k} type="button" onClick={() => { setMode(k); setMsg(null) }} className="flex w-full items-center gap-3 px-3 py-3 text-left">
              <span className="min-w-0 flex-1"><span className="block font-medium">{title}</span><span className="block truncate text-xs text-muted-foreground">{sub}</span></span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
      {!mode ? null : (
        <section className="space-y-3 rounded-[8px] bg-card ring-1 ring-foreground/5 p-3 shadow-sm">
          <button type="button" onClick={() => setMode(null)} className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeftIcon className="size-4" />{t.back}</button>
          <p className="text-lg font-semibold">{mode === "return" ? t.returnReq : mode === "home" ? t.homeReq : t.exitReq}</p>
          {mode === "home" ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{view.home ? t.homeHave : t.homePick}</p>
              <div className="h-64 overflow-hidden rounded-[8px]"><MapPin value={homeLoc} onChange={setHomeLoc} locateLabel={t.locate} /></div>
              <div className="space-y-1.5"><Label>{t.homeNote}</Label>
                <Input value={homeNote} onChange={(e) => setHomeNote(e.target.value)} placeholder={t.homeNotePh} />
              </div>
            </div>
          ) : mode === "return" ? (
            <div className="space-y-1.5"><Label>{t.startFrom}</Label>
              <Input type="date" min={today} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>{t.lastDay}</Label>
                <Input type="date" min={today} value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
              </div>
              {!!view.exitReasons?.length && (
                <div className="space-y-1.5"><p className="text-xs font-medium text-muted-foreground">{t.whyLeave}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {view.exitReasons.map((r) => {
                      const on = reasons.includes(r.id)
                      return <Chip key={r.id} on={on} onClick={() => setReasons(on ? reasons.filter((x) => x !== r.id) : [...reasons, r.id])}>{label(r)}</Chip>
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
          <div className="space-y-1.5"><Label>{t.noteLabel}</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button className="w-full" size="lg" disabled={!ready || busy || !onRequest} onClick={submit}>
            {busy && <LoaderCircleIcon className="animate-spin" />}{!onRequest ? t.preview : busy ? t.sending : t.send}
          </Button>
        </section>
      )}
      {paid && mine.length > 0 && (
        <section className="space-y-1.5">
          <p className="px-1 text-xs font-semibold text-muted-foreground">{t.myRequests}</p>
          {mine.map((r) => (
            <article key={r.id} className="rounded-[8px] bg-card ring-1 ring-foreground/5 p-3 text-sm shadow-sm">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 font-medium">{r.kind === "leave" ? `${t.leaveReq} · ${t.classes(r.sessions?.length ?? 0)}` : r.kind === "return" ? t.returnReq : r.kind === "bus" ? t.busReq : r.kind === "home" ? t.homeReq : `${t.exitReq} · ${fmtDay(r.lastDate!, lang)}`}</span>
<Pill tone={r.status === "new" ? "amber" : r.status === "done" ? "green" : "gray"}>{t[`st_${r.status}`]}</Pill>
              </div>
              {r.kind === "leave" && <p className="text-xs text-muted-foreground">{r.sessions?.map((x) => `${fmtDay(x.date, lang)} ${x.start}`).join(" · ")}</p>}
              {r.kind === "bus" && <p className="text-xs text-muted-foreground">{r.bus?.map((x) => `${fmtDay(x.date, lang)} ${[x.pickup && `${t.pickup} ${x.pickup === "add" ? "+" : "✕"}`, x.dropoff && `${t.dropoff} ${x.dropoff === "add" ? "+" : "✕"}`, x.adult && `+ ${t.adult}`].filter(Boolean).join(", ")}`).join(" · ")}</p>}
              {r.result && <p className="mt-1 text-xs">{r.result}</p>}
            </article>
          ))}
        </section>
      )}
      {!mode && <p className="pt-2 text-center text-[11px] text-muted-foreground">{t.updated} {(() => { const g = new Date(updatedAt); return `${fmtDay(`${g.getFullYear()}-${String(g.getMonth() + 1).padStart(2, "0")}-${String(g.getDate()).padStart(2, "0")}`, lang)} ${String(g.getHours()).padStart(2, "0")}:${String(g.getMinutes()).padStart(2, "0")}` })()}</p>}
    </div>
  )
}

function Catalog({ token, preview }: { token: string; preview?: CatalogToken }) {
  return <div className="-mx-3 -mt-4"><CatalogApp embedded token={token} preview={preview} /></div>
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-[8px] border border-dashed bg-background p-8 text-center text-sm text-muted-foreground">{text}</p>
}
