"use client"

import { useState } from "react"
import { HeartHandshakeIcon, MegaphoneIcon, MessageSquareTextIcon, RadioIcon, SendIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate } from "@/domain/dates"
import { conversationType } from "@/domain/rules/inbox"
import * as Survey from "@/domain/rules/survey"
import type { Conversation } from "@/domain/types"
import { report } from "@/lib/feedback"
import { broadcastSurvey, broadcastText, remindSurvey } from "@/lib/forms"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type What = "survey" | "text"
type Audience = "customer" | "lead" | "all"
const AUDIENCE: Record<Audience, string> = { customer: "ลูกค้า (ครอบครัว)", lead: "Lead ที่ยังเปิดอยู่", all: "ทุกแชทในสาขา" }

/**
 * Broadcast (owner 2026-10-05): send once, it reaches everyone — the yearly satisfaction survey (one link per family)
 * or a text to a group of chats. Real LINE chats are pushed one by one; the count says how many went through LINE.
 */
export function BroadcastDialog({ conversations, onClose }: { conversations: Conversation[]; onClose: () => void }) {
  const campaigns = useStore((s) => s.surveyCampaigns)
  const responses = useStore((s) => s.surveyResponses)
  const leads = useStore((s) => s.leads)
  const [what, setWhat] = useState<What>("survey")
  const [audience, setAudience] = useState<Audience>("customer")
  const [text, setText] = useState("")
  const [busy, setBusy] = useState(false)
  const year = new Date().getFullYear()
  const current = campaigns.find((c) => c.year === year)
  const waiting = current ? Survey.notAnswered(current, responses) : []
  const answered = current ? responses.filter((r) => r.campaignId === current.id).length : 0

  const openLead = (c: Conversation) => { const l = leads.find((x) => x.id === c.leadId); return !!l && l.stage !== "archived" && l.stage !== "enrolled" }
  const targets = conversations.filter((c) => audience === "all" || (audience === "customer" ? conversationType(c) === "customer" : conversationType(c) === "lead" && openLead(c)))
  const live = targets.filter((c) => c.id.startsWith("line_")).length

  const run = async () => {
    setBusy(true)
    if (what === "survey") {
      const r = await broadcastSurvey()
      setBusy(false)
      if (report(r, (v) => `ส่งแบบสอบถามแล้ว ${v.sent} ครอบครัว (LINE จริง ${v.lineSent})`)) onClose()
      return
    }
    const r = await broadcastText(targets.map((c) => c.id), text)
    setBusy(false)
    if (report(r, (v) => `Broadcast แล้ว ${v.sent} แชท${v.failed ? ` · ไม่สำเร็จ ${v.failed}` : ""}`)) onClose()
  }
  const remind = async () => {
    if (!current) return
    setBusy(true)
    const r = await remindSurvey(current)
    setBusy(false)
    report(r, (v) => `ส่งเตือนแล้ว ${v.reminded} ครอบครัว`)
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MegaphoneIcon className="size-5 text-primary" /> Broadcast</DialogTitle>
          <DialogDescription>ส่งครั้งเดียว ถึงทุกคนในกลุ่ม — แต่ละครอบครัวได้รับเป็นแชทส่วนตัว</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {([["survey", HeartHandshakeIcon, "แบบสอบถามความพึงพอใจ", "1 ลิงก์ต่อครอบครัว · ทุกสาขา"], ["text", MessageSquareTextIcon, "ข้อความ", "ประกาศ / แจ้งวันหยุด / โปรโมชัน"]] as const).map(([k, Icon, title, sub]) => (
            <button key={k} type="button" onClick={() => setWhat(k)}
              className={cn("rounded-2xl border p-3 text-left text-sm", what === k ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted")}>
              <Icon className={cn("mb-1.5 size-5", what === k ? "text-primary" : "text-muted-foreground")} />
              <p className="font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </button>
          ))}
        </div>

        {what === "survey" ? (
          <div className="rounded-2xl bg-muted/50 p-3 text-sm">
            {current ? (
              <div className="space-y-2">
                <p className="font-medium">ปี {year + 543} ส่งไปแล้ว {fmtDate(current.sentAt.slice(0, 10))} · {current.recipients.length} ครอบครัว · ตอบแล้ว {answered}</p>
                <p className="text-xs text-muted-foreground">ยังไม่ตอบ {waiting.length} ครอบครัว · {current.remindedAt ? `เตือนแล้ว ${fmtDate(current.remindedAt.slice(0, 10))}` : "เตือนได้ 1 ครั้ง หลังส่ง 7 วัน"}</p>
              </div>
            ) : (
              <p>ส่งให้ <b>ทุกครอบครัวที่ลูกยังเรียนอยู่</b> · ไม่ตอบใน 7 วันเตือนได้ 1 ครั้ง · ผลดูที่ Reports › ความพึงพอใจ · <a href="/liff/survey?preview=1" target="_blank" rel="noreferrer" className="text-primary underline">ดูตัวอย่างฟอร์ม</a></p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">ส่งถึง</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(AUDIENCE) as Audience[]).map((a) => (
                  <button key={a} type="button" onClick={() => setAudience(a)}
                    className={cn("rounded-full border px-3 py-1 text-xs", audience === a ? "border-primary bg-primary/10 font-medium text-primary" : "bg-card hover:bg-muted")}>{AUDIENCE[a]}</button>
                ))}
              </div>
              <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">{targets.length} แชท{live > 0 && <> · <RadioIcon className="size-3 text-sky-600" /> LINE จริง {live}</>}</p>
            </div>
            <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="เช่น แจ้งหยุดเรียนวันที่ 23 ต.ค. (วันปิยมหาราช) ค่ะ 🙏" />
          </div>
        )}

        <DialogFooter>
          {what === "survey" && current ? (
            <Button disabled={busy || !Survey.canRemind(current, new Date().toISOString().slice(0, 10)) || !waiting.length} onClick={remind}><SendIcon /> เตือนคนที่ยังไม่ตอบ</Button>
          ) : (
            <Button disabled={busy || (what === "text" && (!text.trim() || !targets.length))} onClick={run}>
              <SendIcon /> {busy ? "กำลังส่ง…" : what === "survey" ? `ส่งแบบสอบถามปี ${year + 543}` : `ส่งถึง ${targets.length} แชท`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
