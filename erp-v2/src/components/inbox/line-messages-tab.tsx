"use client"

// owner 2026-11-09: "ฉันจะดูตัวอย่างข้อความ LINE ได้จากไหน" — EVERY text the system sends to parents, built by the SAME
// functions the store / forms / API use (domain/rules/messages.ts), from a real invoice of the demo data.
// Nothing is sent from here. Language by brand: Liclass = Japanese + English, NockAcademy = Thai + English.
import { LanguagesIcon, PlusIcon } from "lucide-react"
import { Empty } from "@/components/app/empty"
import { LineMessageBox, type BoxView } from "@/components/inbox/line-message-box"
import { Button } from "@/components/ui/button"
import { boxKey, useLineDrafts } from "@/store/line-drafts"
import { InfoTip } from "@/components/app/info-tip"
import { useMemo, useState } from "react"
import { Segmented } from "@/components/app/page-layout"
import { addDays, toDateStr } from "@/domain/dates"
import { invoiceTotals } from "@/domain/rules/billing"
import {
  busDoneMessage, courseSummaryMessage, customFormMessage, dateArg, familyReceiptMessage, formLinkMessage, holidayMessage, invoiceBundleMessage, invoiceMessage,
  leaveDoneMessage, nameArg, notice, receiptMessage, summaryMessage, surveyMessage, voidMessage,
} from "@/domain/rules/messages"
import type { CourseSummary, LessonSummary } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

type Item = { title: string; hint: string; text: string; draft?: boolean }

function Group({ title, hint, boxes, onAdd, autoEditKey, showTranslation }: { title: string; hint: string; boxes: BoxView[]; onAdd: () => void; autoEditKey: string | null; showTranslation: boolean }) {
  return (
    <section className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div className="flex items-end justify-between gap-3">
        <div><h2 className="text-base font-semibold">{title}</h2><p className="text-sm text-muted-foreground">{hint}</p></div>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}><PlusIcon />เพิ่มข้อความ</Button>
      </div>
      {boxes.length === 0 ? <p className="text-sm text-muted-foreground">ไม่มีข้อความในกลุ่มนี้</p>
        : <div className="grid items-start gap-x-8 gap-y-6 lg:grid-cols-3">{boxes.map((x) => <LineMessageBox key={x.key} box={x} autoEdit={x.key === autoEditKey} showTranslation={showTranslation} />)}</div>}
    </section>
  )
}

export function LineMessagesTab() {
  const invoices = useStore((s) => s.invoices)
  const students = useStore((s) => s.students)
  const branches = useStore((s) => s.branches)
  const courses = useStore((s) => s.courses)
  const classes = useStore((s) => s.classes)
  const holidays = useStore((s) => s.holidays)
  const today = toDateStr(useNow(60_000))
  const [brand, setBrand] = useState<"nockacademy" | "liclass">("liclass")
  const { overrides, removed, added, add, restoreAll } = useLineDrafts()
  const [autoEditKey, setAutoEditKey] = useState<string | null>(null)
  const [showTranslation, setShowTranslation] = useState(true)
  const removedHere = removed.filter((k) => k.startsWith(`${brand}|`)).length

  const sample = useMemo(() => {
    const inv = invoices.filter((i) => i.status !== "void" && i.lines.length > 0 && branches.find((b) => b.id === i.branchId)?.brand === brand)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    const branch = inv && branches.find((b) => b.id === inv.branchId)
    const student = inv && students.find((x) => x.id === inv.studentId)
    if (!inv || !branch || !student) return null
    const totals = invoiceTotals(inv, { branch, courses, classes, holidays })
    return { inv: { ...inv, number: inv.number ?? "INV-SAMPLE-001" }, branch, student, totals }
  }, [invoices, students, branches, courses, classes, holidays, brand])

  const groups = useMemo(() => {
    if (!sample) return []
    const { inv, branch, student, totals } = sample
    const b = branch.brand
    const nick = student.nickname
    const line0 = totals.lines[0]
    const courseName = line0?.course?.name ?? "—"
    const start = line0?.quote?.from ?? addDays(today, 1)
    const link = "https://liff.line.me/…?token=…"
    const lesson = { text: "ตั้งใจเรียนดีมาก ทำแบบฝึกหัดได้ครบ", detail: "หน้า 12–15" } as unknown as LessonSummary
    const course = { overallProgress: "พัฒนาขึ้นมากในช่วงนี้", strengths: "ตั้งใจฟัง กล้าถาม", toImprove: "ฝึกทำโจทย์ข้อยาวเพิ่ม" } as unknown as CourseSummary
    const day = addDays(today, 3)
    const out: { title: string; hint: string; items: Item[] }[] = [
      { title: "การเงิน — ใบแจ้งหนี้ · ใบเสร็จ", hint: "ส่งจากหน้า Billing", items: [
        { title: "ส่งใบแจ้งหนี้", hint: "Admin กดส่งใบที่อนุมัติแล้ว", text: invoiceMessage(inv, totals, { student, branch }) },
        { title: "ส่งใบแจ้งหนี้รวมพี่น้อง", hint: "ลิงก์ใบของพี่น้องเข้าด้วยกัน → ข้อความเดียว", text: invoiceBundleMessage([{ inv, totals, student }, { inv, totals, student }], { branch }) },
        { title: "ออกใบเสร็จ + สรุปคอร์ส", hint: "หลังยืนยันยอดเงิน — สมัครคอร์สแล้ว: วัน-เวลาเรียน วันเริ่ม/จบ วันหยุด ลาได้กี่ครั้ง", text: receiptMessage({ ...inv, receiptNumber: inv.number.replace("INV", "RC") }, totals.total, { student, totals, branch }) },
        { title: "ใบเสร็จรวมพี่น้อง", hint: "สลิปเดียวจ่ายหลายใบ", text: familyReceiptMessage(inv.number.replace("INV", "RC"), [{ number: inv.number, total: totals.total, student }, { number: inv.number, total: totals.total, student }], b) },
        { title: "ยกเลิกใบแจ้งหนี้ (Void)", hint: "ส่งเมื่อ Admin กด “แจ้งผู้ปกครอง” เท่านั้น — ไม่ส่งเอง", text: voidMessage(inv, { student, brand: b }) },
      ] },
      { title: "การเรียน — สรุปจากครู", hint: "ข้อความที่ครูเขียนส่งครั้งเดียวตามที่เขียน · ป้ายกำกับรอบๆ เป็นสองภาษา", items: [
        { title: "สรุปการเรียนรายคาบ", hint: "ครูเขียน → อนุมัติ → ส่ง", text: summaryMessage(lesson, { student, session: { subject: "คณิต", date: today, start: "16:00" }, book: "Hello Math 1", topic: "Unit 2", brand: b }) },
        { title: "สรุปจบคอร์ส", hint: "ส่งหนึ่งครั้งต่อรอบการซื้อ + ลิงก์กราฟใน LINE", text: courseSummaryMessage(course, { student, course: { name: courseName }, entitlement: { from: start, to: addDays(start, 60) }, brand: b }, link) },
        { title: "เตือนก่อนเรียนวันแรก", hint: "ยังไม่มีในระบบ — ร่างข้อความที่ส่งได้ก่อนวันเรียนวันแรก", draft: true,
          text: notice(b, "firstClass", nameArg(nick), dateArg(start, { weekday: true }), line0?.klasses[0]?.start ?? "16:00", nameArg(courseName)) },
        { title: "เตือนต่อคอร์ส (คาบใกล้หมด)", hint: "ยังไม่มีในระบบ — ฝั่งพนักงานเห็นรายการต่ออายุ แต่ไม่ส่งถึงผู้ปกครอง", draft: true,
          text: notice(b, "renewal", nameArg(nick), nameArg(courseName), 2, dateArg(addDays(today, 14), { year: true })) },
      ] },
      { title: "ลิงก์ฟอร์ม — Admin ส่งในแชท", hint: "จาก Inbox / CRM / หน้านักเรียน", items: [
        { title: "ฟอร์มสอบวัดระดับ", hint: "ส่งให้ Lead เลือกเวลาสอบ", text: formLinkMessage(b, "test", ["คณิต", "อังกฤษ"], link) },
        { title: "ฟอร์มทดลองเรียน", hint: "ส่งให้ Lead เลือกเวลาทดลอง", text: formLinkMessage(b, "trial", ["อังกฤษ"], link) },
        { title: "ฟอร์มแจ้งหยุดเรียน", hint: "หน้านักเรียน › แจ้งออก", text: notice(b, "exitForm", nameArg(nick), link) },
        { title: "ใบสมัครเรียน (ทั่วไป)", hint: "ลิงก์ใบสมัคร — Admin จัดคลาสเอง", text: notice(b, "enrollGeneral", link) },
        { title: "ใบสมัครเรียน (เลือกคลาส)", hint: "Admin เสนอคลาส ผู้ปกครองเลือกที่สะดวก", text: notice(b, "enrollPick", link) },
        { title: "ใบสมัครเรียน (ตามที่คุยกัน)", hint: "มีแผนคอร์สที่คุยกันไว้แล้ว", text: notice(b, "enrollPlan", link) },
        { title: "แบบสอบถามความพึงพอใจ (NPS)", hint: "ส่งปีละครั้ง", text: surveyMessage(b, link) },
        { title: "เตือนแบบสอบถามซ้ำ", hint: "7 วันหลังส่ง ให้ครอบครัวที่ยังไม่ตอบ", text: surveyMessage(b, link, true) },
        { title: "ฟอร์มกำหนดเอง", hint: "แบบฟอร์มที่บริษัทสร้างเอง", text: customFormMessage(b, "แบบสอบถามหลังกิจกรรม Open House", link) },
        { title: "แคตตาล็อกคอร์สและตารางเรียน", hint: "ลิงก์ให้ดูคอร์สทั้งสาขา", text: notice(b, "catalog", link) },
        { title: "ขอให้ปักหมุดบ้าน (รถรับส่ง)", hint: "หน้า Transport — ร่างรอ Admin กดส่ง", text: notice(b, "pinAsk", nameArg(nick), link) },
      ] },
      { title: "ประกาศ", hint: "Admin เลือกว่าจะแจ้งผู้ปกครองหรือไม่ — แต่ละครอบครัวได้ภาษาตามแบรนด์ตัวเอง", items: [
        { title: "วันหยุด + งดคาบเรียน", hint: "เพิ่มวันหยุดที่มีคาบเรียน", text: holidayMessage(b, "วันหยุดชดเชย", day, true) },
        { title: "วันหยุด (ไม่มีคาบ)", hint: "แจ้งเฉยๆ", text: holidayMessage(b, "วันหยุดชดเชย", day, false) },
      ] },
      { title: "ตอบกลับอัตโนมัติ — เมื่อผู้ปกครองส่งคำขอจากแอป LINE", hint: "ตอบทันทีว่าได้รับเรื่องแล้ว", items: [
        { title: "ขอกลับมาเรียน", hint: "นักเรียนที่ออกไปแล้ว", text: notice(b, "reqReturn", nameArg(nick)) },
        { title: "แจ้งลา", hint: "เลือกคาบที่จะลา", text: notice(b, "reqLeave", nameArg(nick), 2) },
        { title: "ขอ / ยกเลิกรอบรถ", hint: "เลือกวันที่จะขอหรือยกเลิกรถ", text: notice(b, "reqBus", nameArg(nick)) },
        { title: "ส่งหมุดบ้าน", hint: "สำหรับรถรับส่ง", text: notice(b, "reqHome", nameArg(nick)) },
        { title: "แจ้งหยุดเรียน", hint: "แจ้งลาออกจากแอป", text: notice(b, "reqExit", nameArg(nick)) },
      ] },
      { title: "Admin ตอบผลคำขอ", hint: "ส่งเมื่อ Admin กดรับเรื่อง/บันทึก — ข้อความปฏิเสธ Admin พิมพ์เอง ส่งตามที่พิมพ์", items: [
        { title: "บันทึกลาแล้ว", hint: "ระบุวัน-เวลาที่บันทึก", text: leaveDoneMessage(b, nick, [{ date: day, start: "16:00" }, { date: addDays(day, 7), start: "16:00" }]) },
        { title: "รับเรื่องแจ้งหยุดเรียน", hint: "รับเรื่องแล้วจะติดต่อกลับ", text: notice(b, "doneExit", nameArg(nick)) },
        { title: "ยินดีต้อนรับกลับมา", hint: "กู้คืนนักเรียนแล้ว", text: notice(b, "doneReturn", nameArg(nick)) },
        { title: "บันทึกหมุดบ้านแล้ว", hint: "ใช้กับทั้งครอบครัว", text: notice(b, "doneHome", nameArg(nick)) },
        { title: "อนุมัติรอบรถ", hint: "เพิ่ม / ยกเลิก / ผู้ปกครองนั่งไปด้วย", text: busDoneMessage(b, nick, { withDays: 1, addTrips: 2, amount: 300, cancelTrips: 1 }) },
      ] },
    ]
    return out
  }, [sample, today])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Segmented value={brand} onChange={setBrand} label="แบรนด์" options={[{ value: "liclass", label: "Liclass" }, { value: "nockacademy", label: "NockAcademy" }]} />
        <Button type="button" variant="chip" aria-pressed={showTranslation} onClick={() => setShowTranslation((v) => !v)}><LanguagesIcon />{showTranslation ? "ซ่อนคำแปล English" : "แสดงคำแปล English"}</Button>
        <InfoTip text="ข้อความจริงที่ระบบส่งให้ผู้ปกครอง · Liclass = ญี่ปุ่น + อังกฤษ · NockAcademy = ไทย + อังกฤษ · ภาษาอังกฤษเป็นตัวอย่างคำแปล กดปุ่มเพื่อซ่อน/แสดง — แก้ / เพิ่ม / ลบได้อิสระเพื่อคุยกับ Admin และ Dev เป็นร่างสเปกเท่านั้น (บันทึกในเครื่องนี้ ไม่เปลี่ยนข้อความที่ระบบส่งจริง)" />
        {removedHere > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => restoreAll(brand)}>กู้คืนที่ลบ ({removedHere})</Button>}
      </div>
      {!sample ? (
        <Empty>ยังไม่มีใบแจ้งหนี้ของแบรนด์นี้ให้ทำตัวอย่าง</Empty>
      ) : groups.map((g) => {
        const generated: BoxView[] = g.items.flatMap((x) => {
          const key = boxKey(brand, g.title, x.title)
          if (removed.includes(key)) return []
          const ov = overrides[key]
          return [ov ? { ...ov, draft: x.draft, edited: true, custom: false } : { key, brand, group: g.title, title: x.title, hint: x.hint, draft: x.draft, text: x.text, edited: false, custom: false }]
        })
        const mine: BoxView[] = added.filter((x) => x.brand === brand && x.group === g.title).map((x) => ({ ...x, edited: false, custom: true }))
        return <Group key={g.title} title={g.title} hint={g.hint} boxes={[...generated, ...mine]} autoEditKey={autoEditKey} showTranslation={showTranslation} onAdd={() => setAutoEditKey(add(brand, g.title))} />
      })}
    </div>
  )
}
