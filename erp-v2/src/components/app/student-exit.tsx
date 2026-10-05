"use client"

import { useEffect, useState } from "react"
import { CopyIcon, DoorOpenIcon, ExternalLinkIcon, RefreshCwIcon, SendIcon, StarIcon, UndoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fmtDate, fmtDateTime, toDateStr } from "@/domain/dates"
import * as Loss from "@/domain/rules/loss"
import type { ExitResponse, ID, Student } from "@/domain/types"
import { report } from "@/lib/feedback"
import { fetchExitResponse, sendExitForm } from "@/lib/forms"
import { useEntitlements, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" aria-pressed={on} onClick={onClick} className={cn("rounded-full border px-2.5 py-1 text-xs", on ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{children}</button>
}

const COME_BACK = { yes: "กลับมาแน่นอน", maybe: "อาจจะกลับ", no: "คงไม่กลับ" } as const
const SCORE_LABEL = { teacher: "ครู", content: "เนื้อหา", admin: "แอดมิน", value: "ความคุ้มค่า" } as const

/**
 * Step 1 (owner 2026-10-05): the parent told the admin their child is stopping → the admin sets the last day and sends
 * the exit form (LINE when the family has a chat, otherwise a link to copy). Siblings leaving too go on the same form.
 */
export function ExitRequestDialog({ stu, onClose, onCloseNow }: { stu: Student; onClose: () => void; onCloseNow: () => void }) {
  const students = useStore((s) => s.students)
  const fam = useStore((s) => s.families.find((f) => f.id === stu.familyId))
  const branch = useStore((s) => s.branches.find((b) => b.id === stu.branchId)!)
  const conv = useStore((s) => s.conversations.find((c) => c.familyId && c.familyId === stu.familyId))
  const system = useStore((s) => s.system)
  const request = useStore((s) => s.requestExit)
  const ents = useEntitlements()
  const today = toDateStr(useNow(60_000))
  // default last day: when the current package ends (or today)
  const running = ents.filter((e) => e.studentId === stu.id && e.to >= today).map((e) => e.to).sort().at(-1)
  const [lastDate, setLastDate] = useState(running ?? today)
  const siblings = students.filter((x) => x.familyId && x.familyId === stu.familyId && x.id !== stu.id && !x.archived && !x.exit)
  const [withIds, setWithIds] = useState<ID[]>([])
  const [busy, setBusy] = useState(false)
  const [link, setLink] = useState<{ url: string; sent: boolean } | null>(null)
  const ids = [stu.id, ...withIds]

  const send = async () => {
    setBusy(true)
    const r = await sendExitForm({
      branchId: branch.id, branchName: branch.name, brand: branch.brand, lang: system.preferences.language, conversationId: conv?.id ?? null,
      familyName: fam?.name ?? stu.nickname, lastDate,
      students: ids.map((id) => students.find((x) => x.id === id)!).map((x) => ({ id: x.id, nickname: x.nickname, grade: x.grade })),
      reasons: Loss.reasonsForStudent(system.lossReasons).map(({ id, label, en, ja }) => ({ id, label, en, ja })),
    })
    setBusy(false)
    if (!report(r, (v) => (v.sent ? "ส่งฟอร์มทาง LINE แล้ว" : "สร้างลิงก์แล้ว — คัดลอกส่งให้ผู้ปกครอง"))) return
    if (report(request(ids, { lastDate, token: r.value.token }), "")) setLink(r.value)
    if (r.value.sent) onClose()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><DoorOpenIcon className="size-5" /> แจ้งออก · {stu.nickname}</DialogTitle>
          <DialogDescription>ส่งแบบฟอร์มให้ผู้ปกครองบอกเหตุผล ให้คะแนน และบอกว่าจะกลับมาไหม (ไทย / English / 日本語) · ได้คำตอบแล้วค่อยกดปิดการออก</DialogDescription>
        </DialogHeader>
        {!link ? (
          <>
            <div className="space-y-1">
              <Label>เรียนวันสุดท้าย</Label>
              <Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">ยังเรียนได้ถึงวันนี้ · หลังจากนั้นจะเอาออกจากคาบตอนปิดการออก{running ? ` · แพ็กปัจจุบันหมด ${fmtDate(running)}` : ""}</p>
            </div>
            {siblings.length > 0 && (
              <div className="space-y-1.5">
                <Label>พี่น้องที่ออกด้วย (ฟอร์มเดียวกัน)</Label>
                {siblings.map((x) => (
                  <label key={x.id} className="flex items-center gap-2 text-sm"><Checkbox checked={withIds.includes(x.id)} onCheckedChange={(v) => setWithIds((w) => (v ? [...w, x.id] : w.filter((y) => y !== x.id)))} />{x.nickname} · {x.grade}</label>
                ))}
              </div>
            )}
            <p className="rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">{conv?.id.startsWith("line_") ? `ส่งในแชท LINE ของ${fam?.name ?? "ครอบครัว"}` : "ครอบครัวนี้ยังไม่มีแชท LINE — จะได้ลิงก์ไว้คัดลอกส่งเอง"}</p>
          </>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">ลิงก์ของ{fam?.name ?? stu.nickname} (ใช้ได้ 14 วัน ครั้งเดียว)</p>
            <div className="flex gap-1.5">
              <Input readOnly value={link.url} className="h-8 text-xs" onFocus={(e) => e.target.select()} />
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(link.url); report({ ok: true, value: undefined }, "คัดลอกลิงก์แล้ว") }}><CopyIcon /></Button>
              <Button size="sm" variant="outline" nativeButton={false} render={<a href={link.url} target="_blank" rel="noreferrer" />}><ExternalLinkIcon /></Button>
            </div>
          </div>
        )}
        <DialogFooter className="sm:justify-between">
          {!link ? <Button variant="ghost" className="text-muted-foreground" onClick={onCloseNow}>ปิดเลย ไม่ส่งฟอร์ม</Button> : <span />}
          {!link ? <Button disabled={busy || !lastDate} onClick={send}><SendIcon /> {busy ? "กำลังส่ง…" : "ส่งฟอร์มแจ้งออก"}</Button> : <Button onClick={onClose}>เสร็จ</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The parent's answers, as staff read them. */
export function ExitAnswersView({ answers }: { answers: NonNullable<Student["exit"]>["answers"] }) {
  const system = useStore((s) => s.system)
  if (!answers) return null
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-2 gap-y-1 text-sm">
      <dt className="text-muted-foreground">เหตุผลหลัก</dt><dd className="font-medium">{Loss.reasonLabel(answers.reasonId, system.lossReasons)}</dd>
      {answers.otherReasonIds.length > 0 && <><dt className="text-muted-foreground">เหตุผลอื่น</dt><dd>{answers.otherReasonIds.map((x) => Loss.reasonLabel(x, system.lossReasons)).join(", ")}</dd></>}
      <dt className="text-muted-foreground">คะแนน</dt>
      <dd className="flex flex-wrap gap-x-3">{(Object.keys(SCORE_LABEL) as (keyof typeof SCORE_LABEL)[]).map((k) => (
        <span key={k} className="flex items-center gap-0.5">{SCORE_LABEL[k]} {answers.scores[k] ?? "—"}{answers.scores[k] ? <StarIcon className="size-3 fill-amber-400 text-amber-400" /> : null}</span>
      ))}</dd>
      <dt className="text-muted-foreground">จะกลับมาไหม</dt><dd>{COME_BACK[answers.comeBack]}{answers.comeBackMonth ? ` · ราว ${fmtDate(`${answers.comeBackMonth}-01`, { year: true }).split(" ").slice(1).join(" ")}` : ""}</dd>
      <dt className="text-muted-foreground">แนะนำเพื่อน</dt><dd className={cn(answers.nps !== null && answers.nps <= 6 && "text-red-700")}>{answers.nps ?? "—"} / 10</dd>
      {answers.comment && <><dt className="text-muted-foreground">ความเห็น</dt><dd>“{answers.comment}”</dd></>}
      <dt className="text-muted-foreground">ติดต่อกลับได้</dt><dd>{answers.contactOk ? "ได้" : "ไม่ต้องการ"} · ตอบเป็นภาษา {answers.lang.toUpperCase()}</dd>
    </dl>
  )
}

/** Shown on the student while leaving is open: last day, the link, the parent's answers when they come back. */
export function ExitPanel({ stu }: { stu: Student }) {
  const cancel = useStore((s) => s.cancelExit)
  const [resp, setResp] = useState<ExitResponse | null>(null)
  const [closing, setClosing] = useState(false)
  const [checked, setChecked] = useState(0)
  const ex = stu.exit
  const token = ex?.token
  useEffect(() => {
    if (!token || ex?.status === "closed") return
    let alive = true
    fetchExitResponse(token).then((r) => alive && setResp(r))
    return () => { alive = false }
  }, [token, ex?.status, checked])
  if (!ex) return null
  if (ex.status === "closed") {
    return (
      <section className="space-y-2 rounded-2xl border bg-muted/30 p-3">
        <p className="text-sm font-medium">ออกแล้ว · เรียนวันสุดท้าย {fmtDate(ex.lastDate)}{ex.noReply ? " · ผู้ปกครองไม่ได้ตอบฟอร์ม (Admin ปิดเอง)" : ""}</p>
        {ex.answers ? <ExitAnswersView answers={ex.answers} /> : <ReasonLine reasonId={ex.reasonId} note={ex.note} />}
        {ex.money && ex.money !== "none" && <p className="text-xs text-muted-foreground">เงินที่เหลือ: {ex.money === "refund" ? "คืนเงิน" : "เก็บเป็นเครดิต"}</p>}
      </section>
    )
  }
  const link = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/liff/exit?token=${token}` : ""
  return (
    <section className="space-y-2 rounded-2xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="flex flex-wrap items-center gap-2">
        <DoorOpenIcon className="size-4 text-amber-700" />
        <p className="flex-1 text-sm font-medium">แจ้งออก · เรียนวันสุดท้าย {fmtDate(ex.lastDate, { weekday: true })}</p>
        <span className={cn("rounded-full px-2 py-0.5 text-xs", resp ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900")}>{resp ? `ผู้ปกครองตอบแล้ว ${fmtDateTime(resp.submittedAt)}` : token ? `ส่งฟอร์มแล้ว ${fmtDateTime(ex.sentAt)} · รอคำตอบ` : "ยังไม่ได้ส่งฟอร์ม"}</span>
      </div>
      {resp ? <ExitAnswersView answers={resp.answers} /> : token && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="truncate">{link}</span>
          <Button size="icon-xs" variant="ghost" aria-label="คัดลอกลิงก์" onClick={() => { navigator.clipboard?.writeText(link); report({ ok: true, value: undefined }, "คัดลอกลิงก์แล้ว") }}><CopyIcon /></Button>
          <Button size="icon-xs" variant="ghost" aria-label="ดูคำตอบล่าสุด" onClick={() => setChecked((n) => n + 1)}><RefreshCwIcon /></Button>
        </div>
      )}
      <div className="flex flex-wrap justify-end gap-1.5">
        <Button size="sm" variant="ghost" onClick={() => report(cancel(stu.id), `${stu.nickname} เรียนต่อ — ยกเลิกแจ้งออกแล้ว`)}><UndoIcon /> ไม่ออกแล้ว</Button>
        <Button size="sm" onClick={() => setClosing(true)}>{resp ? "ปิดการออก" : "ปิดการออก (ไม่รอคำตอบ)"}</Button>
      </div>
      {closing && <CloseExitDialog stu={stu} response={resp} onClose={() => setClosing(false)} />}
    </section>
  )
}

function ReasonLine({ reasonId, note }: { reasonId?: ID; note?: string }) {
  const system = useStore((s) => s.system)
  return <p className="text-sm">เหตุผล: <b>{Loss.reasonLabel(reasonId, system.lossReasons)}</b>{note ? ` · ${note}` : ""}</p>
}

/**
 * Step 2: close it — the parent's reason when they answered (the admin can still correct it), otherwise the admin
 * picks what they know. What happens to money left over. Then archive + out of classes after the last day.
 */
export function CloseExitDialog({ stu, response, onClose }: { stu: Student; response: ExitResponse | null; onClose: () => void }) {
  const close = useStore((s) => s.closeExit)
  const system = useStore((s) => s.system)
  const today = toDateStr(useNow(60_000))
  const a = response?.answers
  const reasons = Loss.reasonsForStudent(system.lossReasons)
  const [reasonId, setReasonId] = useState<ID>(a?.reasonId ?? "")
  const [others, setOthers] = useState<ID[]>(a?.otherReasonIds ?? [])
  const [money, setMoney] = useState<"refund" | "credit" | "none">("none")
  const [note, setNote] = useState("")
  const [lastDate, setLastDate] = useState(stu.exit?.lastDate ?? today)
  const input = { answers: a, reasonId, otherReasonIds: others.filter((x) => x !== reasonId), money, note, lastDate }
  const err = Loss.validateExitClose(input, system.lossReasons)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ปิดการออก · {stu.nickname}</DialogTitle>
          <DialogDescription>{a ? "ใช้คำตอบของผู้ปกครอง (แก้เหตุผลได้ถ้าคุยแล้วได้ข้อมูลเพิ่ม)" : "ผู้ปกครองยังไม่ได้ตอบ — เลือกเหตุผลที่รู้จากที่คุยกัน"} · เอาออกจากคลาส หลังวันเรียนวันสุดท้าย · ประวัติยังอยู่ครบ กด “กลับมาเรียน” ได้ภายหลัง</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-[8rem_1fr] items-center gap-2 text-sm">
          <Label>เรียนวันสุดท้าย</Label><Input type="date" value={lastDate} onChange={(e) => setLastDate(e.target.value)} />
        </div>
        <div className="space-y-1.5"><Label>เหตุผลหลัก *</Label>
          <div className="flex flex-wrap gap-1.5">{reasons.map((r) => <Chip key={r.id} on={reasonId === r.id} onClick={() => setReasonId(r.id)}>{r.label}</Chip>)}</div></div>
        <div className="space-y-1.5"><Label>เหตุผลอื่น</Label>
          <div className="flex flex-wrap gap-1.5">{reasons.filter((r) => r.id !== reasonId).map((r) => <Chip key={r.id} on={others.includes(r.id)} onClick={() => setOthers((o) => (o.includes(r.id) ? o.filter((x) => x !== r.id) : [...o, r.id]))}>{r.label}</Chip>)}</div></div>
        <div className="space-y-1.5"><Label>เงินที่เหลือในแพ็ก</Label>
          <div className="flex flex-wrap gap-1.5">{([["none", "ไม่มี / ใช้หมดแล้ว"], ["refund", "คืนเงิน"], ["credit", "เก็บเป็นเครดิต"]] as const).map(([k, l]) => <Chip key={k} on={money === k} onClick={() => setMoney(k)}>{l}</Chip>)}</div>
          {money !== "none" && <p className="text-xs text-muted-foreground">ออกใบลดหนี้จากใบแจ้งหนี้ของนักเรียน (แท็บ Billing) — {money === "refund" ? "แบบคืนเงิน" : "แบบเครดิตคอร์ส"}</p>}</div>
        <div className="space-y-1"><Label>หมายเหตุ{reasonId === "lr_other" && !a?.comment ? " *" : ""}</Label><Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="เช่น คุยทางโทรศัพท์ คุณแม่บอกว่า…" /></div>
        {a && a.comeBack !== "no" && a.contactOk && <p className="rounded-lg bg-emerald-50 p-2 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">ผู้ปกครองบอกว่า{COME_BACK[a.comeBack]}{a.comeBackMonth ? ` ราว ${fmtDate(`${a.comeBackMonth}-01`, { year: true }).split(" ").slice(1).join(" ")}` : ""} → จะสร้าง Lead ไว้โทรหาอีกครั้ง (ขึ้นใน Need Attention ตามวันนั้น)</p>}
        {err && reasonId && <p className="text-xs text-red-700">{err}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="destructive" disabled={!!err} onClick={() => report(close(stu.id, input), `${stu.nickname} ออกแล้ว`) && onClose()}><DoorOpenIcon /> ปิดการออก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
