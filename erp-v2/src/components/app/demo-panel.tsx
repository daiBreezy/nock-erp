"use client"

import { useState } from "react"
import { BellRingIcon, FlaskConicalIcon, PaletteIcon, RotateCcwIcon, UserRoundIcon } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { conversationType } from "@/domain/rules/inbox"
import { openThemeTuner } from "./theme-tuner"
import { notify } from "./noti"
import { DEMO_NOTIS } from "@/data/demo-notis"
import { toast } from "@/lib/toast"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fmtDateTime } from "@/domain/dates"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { NativeSelect } from "./native-select"

const H = 3_600_000

/** Prototype-only controls: switch person/role and move the clock to demo time-based rules. */
export function DemoPanel() {
  const staff = useStore((s) => s.staff)
  const userId = useStore((s) => s.userId)
  const setUser = useStore((s) => s.setUser)
  const offset = useStore((s) => s.clockOffset)
  const setOffset = useStore((s) => s.setClockOffset)
  const reset = useStore((s) => s.resetData)
  const restart = useStore((s) => s.restartAsVisitor)
  const conversations = useStore((s) => s.conversations)
  const [clearChat, setClearChat] = useState(true)
  const [busy, setBusy] = useState("")
  const now = useNow(10_000)
  // real LINE chats of one person (not groups) — the owner's own test accounts
  const liveChats = conversations.filter((c) => c.id.startsWith("line_") && !c.group)
  // owner 2026-11-18: test a flow, then start the next one from zero — forget the link on the server, then reseed without it
  const startOver = async (id: string) => {
    setBusy(id)
    const r = await fetch("/api/line/reset-tester", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: id, clearChat }) })
      .then((x) => x.json()).catch(() => ({ ok: false, error: "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" }))
    setBusy("")
    if (!r.ok) { toast.error(r.error ?? "เริ่มใหม่ไม่สำเร็จ"); return }
    restart(id.slice(5))
    toast.success(clearChat ? "เริ่มใหม่แล้ว — กลับเป็น Visitor, ล้างแชทแล้ว, ข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น" : "เริ่มใหม่แล้ว — กลับเป็น Visitor, ข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น")
  }

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0" />}>
        <FlaskConicalIcon />
        <span className="truncate group-data-[collapsible=icon]:hidden">โหมดสาธิต</span>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 space-y-3">
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">ใช้งานในฐานะ</div>
          <NativeSelect
            value={userId}
            onChange={(e) => {
              setUser(e.target.value)
              const u = staff.find((s) => s.id === e.target.value)!
              toast.info(`สลับเป็น ${u.nickname} (${u.roles.map((r) => ROLE_LABEL[r]).join(", ")})`)
            }}
            options={staff.filter((s) => s.active && s.canLogin).map((s) => ({ value: s.id, label: `${s.nickname} · ${s.roles.map((r) => ROLE_LABEL[r]).join(", ")}` }))}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">เวลาของระบบ</div>
          <div className="rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium tabular-nums">{fmtDateTime(now.toISOString())}</div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {[
              ["-1 วัน", -24 * H], ["-1 ชม.", -H], ["+1 ชม.", H], ["+1 วัน", 24 * H],
            ].map(([l, d]) => (
              <Button key={l as string} size="xs" variant="secondary" onClick={() => setOffset(offset + (d as number))}>
                {l}
              </Button>
            ))}
          </div>
          {offset !== 0 && (
            <Button size="xs" variant="ghost" className="mt-1 w-full" onClick={() => setOffset(0)}>
              กลับเป็นเวลาจริง
            </Button>
          )}
        </div>
        {liveChats.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">ทดสอบกับ LINE จริง — เริ่มใหม่จาก 0</div>
            <div className="space-y-1">
              {liveChats.map((c) => (
                <div key={c.id} className="flex items-center gap-2 rounded-lg bg-muted px-2.5 py-1.5 text-sm">
                  <UserRoundIcon className="size-3.5 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{c.name}</span>
                  <span className="shrink-0 text-2xs text-muted-foreground">{{ contact: "Visitor", lead: "Lead", customer: "Cust" }[conversationType(c)] ?? ""}</span>
                  <Button size="xs" variant="outline" disabled={busy === c.id} onClick={() => startOver(c.id)}>เริ่มใหม่</Button>
                </div>
              ))}
            </div>
            <label className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground"><Checkbox checked={clearChat} onCheckedChange={(v) => setClearChat(!!v)} /> ล้างข้อความในแชทด้วย</label>
            <p className="mt-1 text-2xs text-muted-foreground">ข้อมูลตัวอย่างทั้งหมดกลับเป็นค่าเริ่มต้นด้วย (เหมือนปุ่มรีเซ็ต) · LINE อื่นที่ผูกไว้ยังคงเดิม</p>
          </div>
        )}
        <Button size="sm" variant="outline" className="w-full" onClick={() => DEMO_NOTIS.forEach((n) => notify({ kind: n.kind, title: n.title, body: n.body, action: n.action ? { label: n.action, onClick: () => toast.success(n.action!) } : undefined }))}><BellRingIcon /> จำลอง Noti หลายใบ</Button>
        <Button size="sm" variant="outline" className="w-full" onClick={openThemeTuner}><PaletteIcon /> ปรับสีธีม (การ์ด · พื้นหลัง)</Button>
        <Button
          size="sm"
          variant="destructive"
          className="w-full"
          onClick={() => {
            reset()
            toast.success("รีเซ็ตข้อมูลตัวอย่างแล้ว")
          }}
        >
          <RotateCcwIcon /> รีเซ็ตข้อมูลตัวอย่าง
        </Button>
      </PopoverContent>
    </Popover>
  )
}
