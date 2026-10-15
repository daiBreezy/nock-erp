"use client"

// owner 2026-10-15: "ทำให้ฉันเห็นตัวอย่างได้หน่อย" — every card the Inbox chat can show, in every state, with sample
// data. The buttons work as a preview: they say what they would do and never change real data.
import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"
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

/** a small grey caption above each example */
const Label = ({ children }: { children: React.ReactNode }) => <p className="-mb-3 pt-2 text-xs font-medium text-muted-foreground">{children}</p>

export default function InboxCardsPreview() {
  const now = useNow(60_000)
  const today = toDateStr(now)
  const at = (days: number, time: string) => new Date(`${addDays(today, days)}T${time}:00`).toISOString()
  const staff = useStore((s) => s.staff)
  const students = useStore((s) => s.students)
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

      <Section title="1. การ์ดที่ต้องจัดการ" hint="ผู้ปกครองส่งมาจาก LINE — ปุ่มอยู่ในการ์ด กดแล้วแชทตอบผู้ปกครองให้อัตโนมัติ">
        <Label>แจ้งลาหยุด · รอดำเนินการ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "leave", sessions: leaveSessions.length ? leaveSessions : [{ sessionId: "x", date: addDays(today, 2), start: "16:00", subjects: ["คณิต"] }], note: "ไปต่างจังหวัดกับครอบครัวค่ะ" })} /></div>
        <Label>แจ้งลาออก · รอดำเนินการ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "exit", lastDate: addDays(today, 14), reasonIds: reasons.slice(0, 2).map((x) => x.id), note: "ย้ายบ้านค่ะ" })} /></div>
        <Label>อยากกลับมาเรียน · รอดำเนินการ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "return", startDate: addDays(today, 7), note: "อยากกลับมาเรียนคณิตเหมือนเดิมค่ะ" })} /></div>
        <Label>ผู้ปกครองส่งฟอร์มแจ้งออกกลับมา · รอดำเนินการ (มีคำตอบ + ปิดการออก / ไม่ออกแล้ว)</Label>
        {answered && <ExitFormCardView at={at(-1, "20:15")} kids={[answered]} linked preview={{ response }} />}
        <Label>จัดการแล้ว — แสดงผลและใครทำ</Label>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "leave", status: "done", sessions: leaveSessions.slice(0, 1), handledBy: "u_ploy", handledAt: at(0, "09:30"), result: "บันทึกลา 1 คาบ (หักโควตา)" })} /></div>
        <div className="max-w-md"><RequestCard preview r={req({ kind: "return", status: "declined", handledBy: "u_ploy", handledAt: at(0, "11:00"), result: "คลาสเต็มช่วงนี้ — แอดมินจะโทรเสนอเวลาอื่นค่ะ" })} /></div>
        {closed && <ExitFormCardView at={at(-3, "18:00")} kids={[closed]} linked preview={{ response: null }} />}
      </Section>

      <Section title="2. การ์ดที่เราส่งให้ผู้ปกครอง" hint="ฟอร์มทุกแบบเป็นการ์ดเดียวกัน — สถานะเปลี่ยนเองเมื่อผู้ปกครองตอบ">
        <Label>ฟอร์มสอบวัดระดับ / ทดลองเรียน — รอผู้ปกครองตอบ · รออนุมัติ · อนุมัติแล้ว · ปฏิเสธแล้ว</Label>
        <FormRequestBubble message={msg("r1", "staff", "", at(0, "10:00"), { kind: "form_request", meta: { formKind: "form_request", token: "t_wait", type: "test", subjects: ["คณิต"] } })} submissions={subs} />
        <FormRequestBubble message={msg("r2", "staff", "", at(0, "10:01"), { kind: "form_request", meta: { formKind: "form_request", token: "t_pending", type: "trial", subjects: ["อังกฤษ"] } })} submissions={subs} />
        <FormRequestBubble message={msg("r3", "staff", "", at(0, "10:02"), { kind: "form_request", meta: { formKind: "form_request", token: "t_ok", type: "trial", subjects: ["คณิต", "วิทย์"] } })} submissions={subs} />
        <FormRequestBubble message={msg("r4", "staff", "", at(0, "10:03"), { kind: "form_request", meta: { formKind: "form_request", token: "t_no", type: "test", subjects: ["อังกฤษ"] } })} submissions={subs} />
        <Label>ฟอร์มแจ้งลาออก — รอผู้ปกครองตอบ · ผู้ปกครองตอบแล้ว</Label>
        <FormLinkBubble message={msg("l1", "staff", `รบกวนผู้ปกครองช่วยตอบแบบฟอร์มสั้นๆ เรื่องการหยุดเรียนของ${kid2?.nickname ?? "น้อง"}ค่ะ 🙏\nhttps://liff.line.me/demo?token=demo1`, at(0, "11:00"))} answered={false} />
        <FormLinkBubble message={msg("l2", "staff", `รบกวนผู้ปกครองช่วยตอบแบบฟอร์มสั้นๆ เรื่องการหยุดเรียนของ${kid2?.nickname ?? "น้อง"}ค่ะ 🙏\nhttps://liff.line.me/demo?token=demo2`, at(0, "11:01"))} answered />
        <Label>ใบสมัครเรียน · แบบสอบถามความพึงพอใจ</Label>
        <FormLinkBubble message={msg("l3", "staff", "กรอกใบสมัครเรียนได้ที่ลิงก์นี้เลยค่ะ 🙏\nhttps://liff.line.me/demo?token=demo3", at(0, "11:02"))} answered={false} />
        <FormLinkBubble message={msg("l4", "staff", "ขอเวลา 3 นาทีช่วยตอบแบบสอบถามความพึงพอใจประจำปีหน่อยนะคะ 🙏\nhttps://liff.line.me/demo?token=demo4", at(0, "11:03"))} answered={false} />
      </Section>

      <Section title="3. ข้อความทั่วไป" hint="ข้อความของเรา · ของผู้ปกครอง · โน้ตภายใน (ผู้ปกครองไม่เห็น)">
        <MessageBubble message={msg("m1", "parent", "สวัสดีค่ะ พรุ่งนี้น้องขอลา 1 วันนะคะ", at(0, "08:00"))} conversation={CONV} staff={staff} />
        <MessageBubble message={msg("m2", "staff", "รับทราบค่ะ แอดมินบันทึกลาให้เรียบร้อยแล้วนะคะ 🙏", at(0, "08:05"))} conversation={CONV} staff={staff} />
        <MessageBubble message={msg("m3", "internal", "ผู้ปกครองขอลาบ่อย — ลองเสนอเปลี่ยนวันเรียน", at(0, "08:06"))} conversation={CONV} staff={staff} />
      </Section>
    </Page>
  )
}
