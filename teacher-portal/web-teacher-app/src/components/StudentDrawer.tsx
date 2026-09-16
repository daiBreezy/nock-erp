import { useState, type ReactNode } from "react"
import { create } from "zustand"
import { Send, Check, Sparkles, MessageSquareText, Download, TriangleAlert, Link2, CalendarClock } from "lucide-react"
import { CUR_WEEK, R, SUBJ, WK_DATE, courseObj, courseShort, students, topicOf, lineStatusOf, guardianOf } from "@/data"
import { actualSubs, fbPrepared, fbText, isNoClass, overallStatus, subjStatus, studentSubWeekly, studentOverallWeekly, parentSummaryText, draftParentSummary } from "@/logic"
import { sendReport, markSentManual, setResult, setFeedbackText, setParentSummary, resetParentSummary, useSync } from "@/store"
import { useLinkLine, LineStatusBadge } from "@/components/LinkLineDialog"
import { cn } from "@/lib/utils"
import { QuizHwBars, QuizHwLegend } from "@/components/charts"
import { useHwDialog } from "@/components/HomeworkDialog"
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { CopyText } from "@/components/CopyText"
import { ReportA4 } from "@/components/report"
import { StatusPill } from "@/components/status"

interface DrawerState { idx: number | null; course: string; wk: number; open: (idx: number, course: string, wk?: number) => void; close: () => void }
export const useDrawer = create<DrawerState>((set) => ({
  idx: null, course: "c1", wk: CUR_WEEK,
  open: (idx, course, wk = CUR_WEEK) => set({ idx, course, wk }),
  close: () => set({ idx: null }),
}))

export function StudentDrawer() {
  useSync()
  const { idx, course, wk, close } = useDrawer()
  const openHw = useHwDialog((st) => st.open)
  const [tab, setTab] = useState("info")
  const [previewN, setPreviewN] = useState(0)
  const [lineOpen, setLineOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [sentVia, setSentVia] = useState<"line" | "manual">("line")

  if (idx == null) return null
  const s = students[idx]
  const c = courseObj(course)
  const subs = c.subs
  const ov = overallStatus(s, course, wk)
  const base = actualSubs(course, wk)
  const previewList = previewN ? Array.from({ length: previewN }, (_, i) => base[i % base.length]) : base

  return (
    <Sheet open onOpenChange={(o) => !o && close()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="flex-row items-center gap-3 space-y-0 border-b p-4">
          <Avatar className="size-10">
            {s.photo && <AvatarImage src={s.photo} />}
            <AvatarFallback style={{ background: s.av }} className="text-sm font-semibold text-white">{s.nick[0]}</AvatarFallback>
          </Avatar>
          <div>
            <div className="text-sm font-semibold"><CopyText text={s.nick}>{s.nick}</CopyText></div>
            <div className="text-xs text-muted-foreground"><CopyText text={s.id}>{s.id}</CopyText> · {s.grade} · {courseShort(course)} · W{wk}</div>
          </div>
        </SheetHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
          <div className="px-4 pt-3">
            <TabsList className="w-full">
              <TabsTrigger value="info" className="flex-1">Information</TabsTrigger>
              <TabsTrigger value="preview" className="flex-1">Preview รายงาน</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="info" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <OverallCard idx={idx} course={course} wk={wk} />
            <ParentSummaryBox key={idx + "|" + course + "|" + wk} idx={idx} course={course} wk={wk} nick={s.nick} />
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">แยกรายวิชา · ผล + กราฟ + Feedback (แก้ไขได้)</div>
              <div className="space-y-2.5">
                {subs.filter((sub) => !isNoClass(course, sub, wk)).map((sub) => (
                  <SubjectReportCard key={sub + "|" + wk} idx={idx} course={course} sub={sub} wk={wk} onFillHw={() => openHw(s.idx, course, sub, wk)} />
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="min-h-0 flex-1 overflow-y-auto bg-muted/40 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <b className="text-foreground">จำลองจำนวนวิชา:</b>
              {[1, 2, 3, 4, 5].map((k) => (
                <Button key={k} size="sm" variant={previewN === k ? "default" : "outline"} className="h-7 w-8 p-0" onClick={() => setPreviewN(k)}>{k}</Button>
              ))}
              <Button size="sm" variant={previewN === 0 ? "default" : "outline"} className="h-7" onClick={() => setPreviewN(0)}>ตามจริง ({base.length})</Button>
            </div>
            <ReportA4 idx={idx} course={course} wk={wk} subs={previewList} />
          </TabsContent>
        </Tabs>

        <div className="space-y-2 border-t bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground">LINE ผู้ปกครอง:</span>
            <LineStatusBadge status={lineStatusOf(idx)} />
            <button className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline" onClick={() => useLinkLine.getState().open(idx)}><Link2 className="size-3.5" /> จัดการการผูก</button>
          </div>
          <Button className="w-full" onClick={() => { setSent(false); setLineOpen(true) }}>
            {ov === "sended" ? "✓ ส่งแล้ว · ส่งซ้ำ" : <><Send className="mr-2 size-4" /> ส่งให้ผู้ปกครอง</>}
          </Button>
        </div>
      </SheetContent>

      <Dialog open={lineOpen} onOpenChange={setLineOpen}>
        <DialogContent className="max-w-md">
          <div className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            <CalendarClock className="size-4 shrink-0" /> รายงาน <b>สัปดาห์ที่ {wk}</b> · {WK_DATE[wk]} <span className="ml-auto text-xs font-normal text-muted-foreground">{courseShort(course)} · น้อง{s.nick}</span>
          </div>
          {sent ? (
            <>
              <div className="text-sm font-semibold">ส่งเรียบร้อย ✓</div>
              <div className="text-xs text-muted-foreground">{sentVia === "line" ? `ส่งเข้า LINE ผู้ปกครองน้อง${s.nick} แล้ว` : `ทำเครื่องหมายว่าส่งแบบ manual แล้ว — อย่าลืมส่งไฟล์ให้ผู้ปกครองน้อง${s.nick}`}</div>
              {sentVia === "line" && <LineChat idx={idx} course={course} wk={wk} delivered />}
              <Button className="mt-1 w-full" onClick={() => { setLineOpen(false); close() }}>เสร็จสิ้น</Button>
            </>
          ) : lineStatusOf(idx) === "linked" ? (
            <>
              <div className="text-sm font-semibold">ส่งรายงานให้ผู้ปกครอง</div>
              <div className="text-xs text-muted-foreground">🟢 ผูก LINE แล้ว — ส่งเข้า LINE ผู้ปกครองน้อง{s.nick} โดยตรง</div>
              <LineChat idx={idx} course={course} wk={wk} delivered={false} />
              <div className="mt-1 flex gap-2">
                <Button className="flex-1" onClick={() => { sendReport(s.idx, course, wk); setSentVia("line"); setSent(true) }}><Send className="mr-2 size-4" /> ยืนยันส่งผ่าน LINE</Button>
                <Button variant="outline" onClick={() => setLineOpen(false)}>ยกเลิก</Button>
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-semibold">ผู้ปกครองยังไม่ผูก LINE</div>
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-200">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> ส่งเข้า LINE อัตโนมัติไม่ได้ — ผูกบัญชีก่อน หรือดาวน์โหลดรายงานไปส่งเองแล้วทำเครื่องหมายว่าส่งแล้ว
              </div>
              <Button variant="outline" className="w-full" onClick={() => { setLineOpen(false); useLinkLine.getState().open(idx) }}><Link2 className="mr-2 size-4" /> ผูก LINE เลย ({guardianOf(idx).name})</Button>
              <div className="flex items-center gap-2 py-0.5 text-[11px] text-muted-foreground"><div className="h-px flex-1 bg-border" />หรือส่งแบบ manual<div className="h-px flex-1 bg-border" /></div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => downloadReport(idx, course, wk)}><Download className="mr-2 size-4" /> ดาวน์โหลดรายงาน</Button>
                <Button className="flex-1" onClick={() => { markSentManual(s.idx, course, wk); setSentVia("manual"); setSent(true) }}><Check className="mr-2 size-4" /> ทำเครื่องหมายว่าส่งแล้ว</Button>
              </div>
            </>
          )}
          <p className="text-center text-[11px] text-muted-foreground">* prototype — ยังไม่ต่อ LINE Messaging API จริง</p>
        </DialogContent>
      </Dialog>
    </Sheet>
  )
}

function downloadReport(idx: number, course: string, wk: number) {
  const s = students[idx]
  const body = `รายงานผลการเรียน — ${s.name} (${s.nick})\nคอร์ส ${courseShort(course)} · สัปดาห์ที่ ${wk}\n\n${parentSummaryText(idx, course, wk)}\n\n— NockAcademy`
  try {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }))
    a.download = `report-${s.nick}-W${wk}.txt`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  } catch { /* noop */ }
}

function OverallCard({ idx, course, wk }: { idx: number; course: string; wk: number }) {
  useSync()
  const [mode, setMode] = useState<"subject" | "week">("subject")
  const subs = courseObj(course).subs
  const subjectRows = subs.map((sub) => { const w = studentSubWeekly(idx, course, sub); return { label: SUBJ[sub].short, quiz: w.quiz[wk - 1] ?? null, hw: w.hw[wk - 1] ?? null } })
  const ow = studentOverallWeekly(idx, course)
  const weekRows = ow.labels.map((l, i) => ({ label: l, quiz: ow.quiz[i] ?? null, hw: ow.hw[i] ?? null }))
  const rows = mode === "subject" ? subjectRows : weekRows
  return (
    <div className="rounded-xl border p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">ภาพรวมทุกวิชา</span>
        <div className="inline-flex rounded-md border p-0.5 text-[11px] font-medium">
          <button onClick={() => setMode("subject")} className={cn("rounded px-2 py-0.5 transition-colors", mode === "subject" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>รายวิชา</button>
          <button onClick={() => setMode("week")} className={cn("rounded px-2 py-0.5 transition-colors", mode === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>รายสัปดาห์</button>
        </div>
        <QuizHwLegend className="ml-auto" />
      </div>
      <QuizHwBars rows={rows} height={168} />
      <p className="mt-1 text-[10px] text-muted-foreground">{mode === "subject" ? `Quiz = % ตอบถูก · เทียบรายวิชาในสัปดาห์ W${wk}` : `Quiz = % ตอบถูก · เทียบรายสัปดาห์ W1–W${ow.labels.length} (เฉลี่ยทุกวิชา)`}</p>
    </div>
  )
}

function ParentSummaryBox({ idx, course, wk, nick }: { idx: number; course: string; wk: number; nick: string }) {
  const [text, setText] = useState(() => parentSummaryText(idx, course, wk))
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-primary">
        <MessageSquareText className="size-3.5" /> สรุปส่งผู้ปกครอง · ระบบร่างให้
        <button className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground" onClick={() => { resetParentSummary(idx, course, wk); setText(draftParentSummary(idx, course, wk)) }}><Sparkles className="size-3" /> ร่างใหม่</button>
      </div>
      <textarea value={text} onChange={(e) => { setText(e.target.value); setParentSummary(idx, course, wk, e.target.value) }} className="min-h-20 w-full resize-y rounded-md border bg-background p-2.5 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      <p className="mt-1 text-[10px] text-muted-foreground">อ้างอิงผล Quiz/HW ของน้อง{nick} — แก้ไขได้ก่อนส่ง</p>
    </div>
  )
}

function SubjectReportCard({ idx, course, sub, wk, onFillHw }: { idx: number; course: string; sub: string; wk: number; onFillHw: () => void }) {
  useSync()
  const s = students[idx]
  const r = R[idx][sub]?.[wk]
  const { quiz, hw } = studentSubWeekly(idx, course, sub)
  const qNull = quiz[wk - 1] == null
  const rows = quiz.map((_, i) => ({ label: "W" + (i + 1), quiz: quiz[i] ?? null, hw: hw[i] ?? null }))
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <b className="text-sm">{SUBJ[sub].n}</b>
        <span className="text-[11px] text-muted-foreground">{topicOf(sub, wk)}</span>
        <div className="ml-auto flex items-center gap-2"><QuizHwLegend /><StatusPill st={subjStatus(s, course, sub, wk)} /></div>
      </div>
      {qNull && <div className="mb-1 text-[11px] font-medium text-muted-foreground">· สัปดาห์ W{wk} ไม่มี Live Quiz (ประเมินจากการบ้าน)</div>}
      <QuizHwBars rows={rows} height={132} />
      <div className="mt-2 border-t pt-1">
        <EditRow k="เข้าเรียน"><AttSelect value={r?.att ?? "present"} onChange={(v) => setResult(idx, sub, wk, { att: v })} /></EditRow>
        <EditRow k="Live Quiz (ทำ / ถูก)">
          <div className="flex items-center gap-1">
            <NumEdit value={r?.lqDone ?? 0} max={r?.lqT ?? 10} onSave={(v) => setResult(idx, sub, wk, { lqDone: v })} />
            <span className="text-muted-foreground">/</span>
            <NumEdit value={r?.lqCorrect ?? 0} max={r?.lqDone ?? 10} onSave={(v) => setResult(idx, sub, wk, { lqCorrect: v })} />
          </div>
        </EditRow>
        <EditRow k={<>Homework {r?.late && <span className="rounded bg-red-100 px-1 text-[10px] text-red-600">ช้า</span>}</>}>
          {r?.collected ? <NumEdit value={r.hwScore ?? 0} max={r.hwT} onSave={(v) => setResult(idx, sub, wk, { hwScore: v })} /> : <Button size="sm" variant="secondary" className="h-8" onClick={onFillHw}>กรอก</Button>}
        </EditRow>
      </div>
      <div className="mt-2">
        <div className="mb-1 flex items-center gap-1 text-[10px]">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">Feedback · ใช้ร่วมทุกคน</span>
          <span className="ml-auto text-muted-foreground">{fbPrepared(course, sub, wk) ? "Submit แล้ว · แก้ไขได้" : "ร่างโดยระบบ · แก้ไขได้"}</span>
        </div>
        <textarea defaultValue={fbText(course, sub, wk)} onChange={(e) => setFeedbackText(course, sub, wk, e.target.value)} className="min-h-16 w-full resize-y rounded-md border bg-background p-2 text-[12px] leading-relaxed focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
      </div>
    </div>
  )
}

function EditRow({ k, children }: { k: ReactNode; children: ReactNode }) {
  return <div className="flex items-center justify-between border-t py-1.5 text-sm first:border-t-0"><span className="text-muted-foreground">{k}</span>{children}</div>
}
function NumEdit({ value, max, onSave }: { value: number; max: number; onSave: (v: number) => void }) {
  return <Input type="number" defaultValue={value} min={0} max={max} onChange={(e) => onSave(Math.max(0, Math.min(max, +e.target.value || 0)))} className="h-8 w-16 text-center" />
}
function AttSelect({ value, onChange }: { value: string; onChange: (v: "present" | "absent") => void }) {
  return (
    <Select value={value === "makeup" ? "present" : value} onValueChange={(v) => onChange(v as "present" | "absent")}>
      <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="present">เข้าเรียน</SelectItem><SelectItem value="absent">ขาดเรียน</SelectItem></SelectContent>
    </Select>
  )
}

function LineChat({ idx, course, wk, delivered }: { idx: number; course: string; wk: number; delivered: boolean }) {
  const s = students[idx]
  return (
    <div className="mx-auto w-full max-w-[330px] overflow-hidden rounded-xl border shadow-sm">
      <div className="flex items-center gap-2 bg-[#06C755] px-3.5 py-2.5 text-white">
        <div className="flex size-7 items-center justify-center rounded-full bg-white text-xs font-extrabold text-[#06C755]">N</div>
        <div className="leading-tight"><div className="text-[13px] font-bold">NockAcademy</div><div className="text-[10px] opacity-90">Official Account</div></div>
      </div>
      <div className="flex max-h-[46vh] flex-col gap-2 overflow-y-auto bg-[#9cb4d4] p-3">
        <div className="flex items-end gap-1.5">
          <div className="flex size-6 items-center justify-center rounded-full bg-white text-[10px] font-extrabold text-[#06C755]">N</div>
          <div className="max-w-[78%] rounded-xl rounded-tl-sm bg-white px-2.5 py-2 text-xs leading-snug shadow">สวัสดีค่ะ คุณผู้ปกครองน้อง{s.nick} 🙏<br />รายงานผลการเรียนประจำสัปดาห์ที่ {wk} ค่ะ</div>
        </div>
        <div className="flex items-end gap-1.5">
          <div className="size-6 shrink-0" />
          <div className="w-[210px] rounded-xl bg-white p-1.5 shadow"><div className="w-[198px]"><ReportA4 idx={idx} course={course} wk={wk} subs={actualSubs(course, wk)} /></div></div>
        </div>
        {delivered && <div className="self-end text-[10px] font-semibold text-white/90">ส่งแล้ว · อ่านแล้ว ✓✓</div>}
      </div>
    </div>
  )
}
