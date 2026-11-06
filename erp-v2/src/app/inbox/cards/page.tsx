"use client"

// owner 2026-10-15: "ทำให้ฉันเห็นตัวอย่างได้หน่อย" — every card the Inbox chat can show, in every state, with sample
// data. The buttons work as a preview: they say what they would do and never change real data.
import Link from "next/link"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Page, PageHeader } from "@/components/app/page-layout"
import { RequestCard } from "@/components/app/parent-requests"
import { FormLinkBubble, FormRequestBubble } from "@/components/inbox/form-request-bubble"
import { MessageBubble } from "@/components/inbox/message-bubble"
import { ExitFormCardView } from "@/components/inbox/parent-cards"
import { addDays, toDateStr } from "@/domain/dates"
import type { ChatMessage, Conversation, ExitResponse, FormSubmission, ParentRequest, Student } from "@/domain/types"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"

const CONV = { id: "demo", name: "ครอบครัวตัวอย่าง", channel: "line", familyId: "demo", leadId: null } as unknown as Conversation
const msg = (id: string, author: ChatMessage["author"], text: string, at: string, extra: Partial<ChatMessage> = {}): ChatMessage =>
  ({ id, conversationId: "demo", author, senderId: author === "parent" ? null : "u_ploy", text, at, ...extra })

function Section({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/5">
        <div className="mx-auto max-w-3xl space-y-6">{children}</div>
      </div>
    </section>
  )
}

/** owner 2026-11-06: one form's whole journey as states side by side — Admin sends → the parent sends it back → Admin handles */
function Flow({ steps }: { steps: { title: string; hint: string; node: React.ReactNode }[] }) {
  return (
    <div className="grid items-start gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
      {steps.flatMap((st, i) => [
        <div key={st.title} className="min-w-0 space-y-2">
          <div className="flex items-center gap-2"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span><div><p className="text-sm font-semibold leading-tight">{st.title}</p><p className="text-xs text-muted-foreground">{st.hint}</p></div></div>
          {st.node}
        </div>,
        ...(i < steps.length - 1 ? [<ChevronRightIcon key={`a${i}`} className="mt-1 hidden size-5 self-start text-muted-foreground lg:block" />] : []),
      ])}
    </div>
  )
}

function FlowSection({ title, steps }: { title: string; steps: { title: string; hint: string; node: React.ReactNode }[] }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="rounded-3xl bg-card p-6 shadow-sm ring-1 ring-foreground/5"><Flow steps={steps} /></div>
    </section>
  )
}

/** a step that ends outside the chat (CRM, Reports) — said in words, not drawn as a card the Inbox doesn't have */
function Outcome({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">{children}</p>
}

/** a small grey caption above each example */
const Label = ({ children }: { children: React.ReactNode }) => <p className="pt-4 text-xs font-medium text-muted-foreground">{children}</p>

export default function InboxCardsPreview() {
  const now = useNow(60_000)
  const today = toDateStr(now)
  const at = (days: number, time: string) => new Date(`${addDays(today, days)}T${time}:00`).toISOString()
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const lossReasons = useStore((s) => s.system.lossReasons)
  const reasons = lossReasons ?? []
  const sessions = useStore((s) => s.sessions)
  const kid = students.find((x) => !x.archived) ?? students[0]
  const kid2 = students.find((x) => !x.archived && x.id !== kid?.id) ?? kid
  const upcoming = sessions.filter((x) => !x.cancelled && x.date > today && kid && x.studentIds.includes(kid.id)).slice(0, 2)

  const req = (over: Partial<ParentRequest>): ParentRequest => ({
    id: `demo_${over.kind}_${over.status}`, kind: "leave", familyId: "demo", familyName: "ครอบครัวตัวอย่าง", lineUserId: "demo",
    studentId: kid?.id ?? "", studentNickname: kid?.nickname ?? "น้องตัวอย่าง", createdAt: at(0, "09:10"), status: "new", ...over,
  })
  const leaveSessions = upcoming.map((x) => ({ sessionId: x.id, date: x.date, start: x.start, subjects: [x.subject] }))
  // owner 2026-10-19: a bus request — the demo child of the LINE family (Liclass) when there is one
  const busKid = students.find((x) => x.id.startsWith("stu_demo_")) ?? kid
  const busDays = [...new Map(sessions.filter((x) => !x.cancelled && x.date > today && busKid && x.studentIds.includes(busKid.id)).sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start)).map((x) => [x.date, x])).values()].slice(0, 2)
  const busChanges = busDays.map((x, i) => (i === 0 ? { date: x.date, start: x.start, subjects: [x.subject], pickup: "add" as const, dropoff: "add" as const, adult: true } : { date: x.date, start: x.start, subjects: [x.subject], dropoff: "cancel" as const }))
  const busReq = (over: Partial<ParentRequest>) => req({ kind: "bus", studentId: busKid?.id ?? "", studentNickname: busKid?.nickname ?? "", branchId: busKid?.branchId,
    bus: busChanges.length ? busChanges : [{ date: addDays(today, 2), start: "16:00", subjects: ["คณิต"], pickup: "add" }], ...over })
  // owner 2026-10-19: a parent pins the house for the bus — a Thonglor bus child (their old pin moves ~300 m)
  const pinKid = students.find((x) => x.branchId === "br_thl" && x.usesBus && x.familyId && families.find((f) => f.id === x.familyId)?.location)
  const pinFam = families.find((f) => f.id === pinKid?.familyId)
  const homeReq = pinKid && pinFam?.location ? req({ kind: "home", studentId: pinKid.id, studentNickname: pinKid.nickname, familyId: pinFam.id, familyName: pinFam.name, branchId: pinKid.branchId,
    home: { lat: pinFam.location.lat + 0.0027, lng: pinFam.location.lng + 0.0004, addressNote: "ซอย 2 บ้านหลังที่ 3 ประตูสีขาว" } }) : null
  const subs = [
    { token: "t_pending", status: "pending" }, { token: "t_ok", status: "approved" }, { token: "t_no", status: "rejected" },
  ] as unknown as FormSubmission[]
  const exitKid = (status: "answered" | "closed"): Student | null => kid2 ? ({
    ...kid2, exit: { status, lastDate: addDays(today, 10), token: "demo", sentAt: at(-2, "10:00"), sentBy: "u_ploy",
      ...(status === "closed" ? { reasonId: reasons[0]?.id, money: "credit" as const, closedAt: at(-1, "15:00"), closedBy: "u_ploy" } : {}) },
  }) : null
  const response: ExitResponse = {
    id: "demo", token: "demo", branchId: kid2?.branchId ?? "", studentIds: kid2 ? [kid2.id] : [], submittedAt: at(-1, "20:15"),
    answers: { reasonId: reasons[0]?.id ?? "", otherReasonIds: reasons[1] ? [reasons[1].id] : [], scores: { teacher: 5, content: 4, admin: 4, value: 3 }, comeBack: "maybe", comeBackMonth: addDays(today, 90).slice(0, 7), nps: 8, comment: "ลูกย้ายไปเรียนพิเศษใกล้บ้าน ขอบคุณครูมากค่ะ", contactOk: true, lang: "th" },
  }
  const answered = exitKid("answered"), closed = exitKid("closed")

  return (
    <Page>
      <PageHeader title="ตัวอย่างการ์ดในแชท"
        description="ทุกการ์ดที่ Inbox แสดงได้ ในทุกสถานะ — ข้อมูลตัวอย่าง กดปุ่มได้แต่ไม่บันทึกจริง"
        actions={<Link href="/inbox" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeftIcon className="size-4" />กลับไป Inbox</Link>} />

      {/* owner 2026-11-06: every form's journey as states side by side — Admin sends → the parent sends it back → Admin handles */}
      <FlowSection title="Flow ฟอร์มสอบวัดระดับ (Test)" steps={[
        { title: "Admin ส่งไป", hint: "รอผู้ปกครองตอบ", node: <FormRequestBubble message={msg("f1", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_wait", type: "test", subjects: ["คณิต"] } })} submissions={subs} /> },
        { title: "ผู้ปกครองส่งกลับมา", hint: "รออนุมัติ — แอดมินตรวจ / แก้เวลา", node: <FormRequestBubble message={msg("f2", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_pending", type: "test", subjects: ["คณิต"] } })} submissions={subs} /> },
        { title: "Admin จัดการ", hint: "อนุมัติ = จองคาบสอบจริง · หรือปฏิเสธ", node: <div className="space-y-3"><FormRequestBubble message={msg("f3", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_ok", type: "test", subjects: ["คณิต"] } })} submissions={subs} /><FormRequestBubble message={msg("f4", "staff", "", at(0, "10:01"), { kind: "form_request", meta: { formKind: "form_request", token: "t_no", type: "test", subjects: ["คณิต"] } })} submissions={subs} /></div> },
      ]} />
      <FlowSection title="Flow ฟอร์มทดลองเรียน (Trial)" steps={[
        { title: "Admin ส่งไป", hint: "รอผู้ปกครองตอบ", node: <FormRequestBubble message={msg("t1", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_wait", type: "trial", subjects: ["อังกฤษ"] } })} submissions={subs} /> },
        { title: "ผู้ปกครองส่งกลับมา", hint: "รออนุมัติ — แอดมินตรวจ / แก้เวลา", node: <FormRequestBubble message={msg("t2", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_pending", type: "trial", subjects: ["อังกฤษ"] } })} submissions={subs} /> },
        { title: "Admin จัดการ", hint: "อนุมัติ = จองเข้าคาบ / คลาสจริง · หรือปฏิเสธ", node: <div className="space-y-3"><FormRequestBubble message={msg("t3", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_ok", type: "trial", subjects: ["อังกฤษ"] } })} submissions={subs} /><FormRequestBubble message={msg("t4", "staff", "", at(0, "10:01"), { kind: "form_request", meta: { formKind: "form_request", token: "t_no", type: "trial", subjects: ["อังกฤษ"] } })} submissions={subs} /></div> },
      ]} />
      <FlowSection title="Flow ใบสมัครเรียน" steps={[
        { title: "Admin ส่งไป", hint: "เลือกคลาสที่เสนอแล้วส่งในแชท", node: <FormLinkBubble message={msg("e1", "staff", "กรอกใบสมัครเรียนได้ที่ลิงก์นี้เลยค่ะ 🙏\nhttps://liff.line.me/demo?token=demo3", at(0, "11:02"))} answered={false} /> },
        { title: "ผู้ปกครองส่งกลับมา", hint: "เลือกคลาสที่สะดวก + ยอมรับเงื่อนไข", node: <FormLinkBubble message={msg("e2", "staff", "กรอกใบสมัครเรียนได้ที่ลิงก์นี้เลยค่ะ 🙏\nhttps://liff.line.me/demo?token=demo3", at(0, "11:02"))} answered /> },
        { title: "Admin จัดการ", hint: "ที่ CRM", node: <Outcome>Lead “ใบสมัครเรียนรอจัดคลาส” → เลือกคอร์ส / แพ็กเกจ + วันเริ่ม → สร้างครอบครัว + นักเรียน + ร่างใบแจ้งหนี้ → จ่ายครบ = เข้าคลาส</Outcome> },
      ]} />
      <FlowSection title="Flow แจ้งหยุดเรียน" steps={[
        { title: "Admin ส่งไป", hint: "ที่หน้านักเรียน กด \"แจ้งออก\"", node: <FormLinkBubble message={msg("x1", "staff", `รบกวนผู้ปกครองช่วยตอบแบบฟอร์มสั้นๆ เรื่องการหยุดเรียนของ${kid2?.nickname ?? "น้อง"}ค่ะ 🙏\nhttps://liff.line.me/demo?token=demo1`, at(0, "11:00"))} answered={false} /> },
        { title: "ผู้ปกครองส่งกลับมา", hint: "มีคำตอบ + ปิดการออก / ไม่ออกแล้ว", node: answered ? <ExitFormCardView at={at(-1, "20:15")} kids={[answered]} linked preview={{ response }} /> : <Outcome>ยังไม่มีนักเรียนตัวอย่าง</Outcome> },
        { title: "Admin จัดการ", hint: "ปิดการออก — คืนเงิน / เครดิต / ไม่มี", node: closed ? <ExitFormCardView at={at(-3, "18:00")} kids={[closed]} linked preview={{ response: null }} /> : <Outcome>ยังไม่มีนักเรียนตัวอย่าง</Outcome> },
      ]} />
      <FlowSection title="Flow ความพึงพอใจประจำปี (NPS)" steps={[
        { title: "Admin ส่งไป", hint: "Settings › ระบบ › ส่งปีนี้", node: <FormLinkBubble message={msg("n1", "staff", "ขอเวลา 3 นาทีช่วยตอบแบบสอบถามความพึงพอใจประจำปีหน่อยนะคะ 🙏\nhttps://liff.line.me/demo?token=demo4", at(0, "11:03"))} answered={false} /> },
        { title: "ผู้ปกครองส่งกลับมา", hint: "1 ฟอร์มต่อครอบครัว", node: <FormLinkBubble message={msg("n2", "staff", "ขอเวลา 3 นาทีช่วยตอบแบบสอบถามความพึงพอใจประจำปีหน่อยนะคะ 🙏\nhttps://liff.line.me/demo?token=demo4", at(0, "11:03"))} answered /> },
        { title: "Admin จัดการ", hint: "ที่ CRM / Reports", node: <Outcome>ไม่แนะนำ → CRM ให้ Admin / Manager โทรคุยใน 3 วัน · ผลรวมที่ Reports › ความพึงพอใจ (NPS เทียบปีก่อน · รายสาขา · คะแนนครู)</Outcome> },
      ]} />

      <Section title="1. การ์ดที่ต้องจัดการ" hint="ผู้ปกครองส่งมาจาก LINE — ปุ่มอยู่ในการ์ด กดแล้วแชทตอบผู้ปกครองให้อัตโนมัติ">
        <Label>แจ้งลาหยุด · รอดำเนินการ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "leave", sessions: leaveSessions.length ? leaveSessions : [{ sessionId: "x", date: addDays(today, 2), start: "16:00", subjects: ["คณิต"] }], note: "ไปต่างจังหวัดกับครอบครัวค่ะ" })} /></div>
        <Label>แจ้งลาออก · รอดำเนินการ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "exit", lastDate: addDays(today, 14), reasonIds: reasons.slice(0, 2).map((x) => x.id), note: "ย้ายบ้านค่ะ" })} /></div>
        <Label>ขอ / ยกเลิกรอบรถ · รอดำเนินการ (อนุมัติ = รอบที่เพิ่มเก็บในรายชื่อนักเรียน คิดเงินในใบแจ้งหนี้รอบถัดไป)</Label>
        <div className="max-w-md"><RequestCard preview r={busReq({ note: "วันอังคารแม่ไปรับไม่ทันค่ะ" })} /></div>
        <Label>ปักหมุดบ้าน (รถรับส่ง) · รอดำเนินการ (บันทึก = ใช้หมุดนี้กับครอบครัว · ดูระยะทางและโซนก่อน)</Label>
        {homeReq && <div className="max-w-md"><RequestCard preview r={homeReq} /></div>}
        <Label>อยากกลับมาเรียน · รอดำเนินการ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "return", startDate: addDays(today, 7), note: "อยากกลับมาเรียนคณิตเหมือนเดิมค่ะ" })} /></div>
        <Label>จัดการแล้ว — แสดงผลและใครทำ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "leave", status: "done", sessions: leaveSessions.slice(0, 1), handledBy: "u_ploy", handledAt: at(0, "09:30"), result: "บันทึกลา 1 คาบ (หักโควตา)" })} /></div>
        <div className="max-w-md"><RequestCard preview r={busReq({ id: "demo_bus_done", status: "done", handledBy: "u_ploy", handledAt: at(0, "10:05"), result: "เพิ่มรอบรถ 2 เที่ยว ฿300 — เก็บในใบแจ้งหนี้รอบถัดไป · ยกเลิก 1 เที่ยว (1 เที่ยวจ่ายแล้ว ไม่คืนเงิน)" })} /></div>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "return", status: "declined", handledBy: "u_ploy", handledAt: at(0, "11:00"), result: "คลาสเต็มช่วงนี้ — แอดมินจะโทรเสนอเวลาอื่นค่ะ" })} /></div>
      </Section>

      <Section title="2. ข้อความทั่วไป" hint="ข้อความของเรา · ของผู้ปกครอง · โน้ตภายใน (ผู้ปกครองไม่เห็น)">
        <MessageBubble message={msg("m1", "parent", "สวัสดีค่ะ พรุ่งนี้น้องขอลา 1 วันนะคะ", at(0, "08:00"))} conversation={CONV} staff={staff} />
        <MessageBubble message={msg("m2", "staff", "รับทราบค่ะ แอดมินบันทึกลาให้เรียบร้อยแล้วนะคะ 🙏", at(0, "08:05"))} conversation={CONV} staff={staff} />
        <MessageBubble message={msg("m3", "internal", "ผู้ปกครองขอลาบ่อย — ลองเสนอเปลี่ยนวันเรียน", at(0, "08:06"))} conversation={CONV} staff={staff} />
      </Section>
    </Page>
  )
}
