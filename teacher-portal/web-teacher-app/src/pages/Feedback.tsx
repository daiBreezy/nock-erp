import { useEffect, useState } from "react"
import { Tv, PanelRightOpen } from "lucide-react"
import { COURSES, CUR_WEEK, WEEKS, SUBJ, WK_DATE, courseObj, isNoClass, topicOf } from "@/data"
import { fbPrepared, fbText } from "@/logic"
import { useSync } from "@/store"
import { useNav } from "@/nav"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { StatusPill } from "@/components/status"
import { Segmented, WeekPicker, FeedbackEditor } from "@/pages/Summary"

export function Feedback() {
  useSync()
  const fFocus = useNav((s) => s.feedbackFocus)
  const clearFFocus = useNav((s) => s.clearFeedbackFocus)
  const [course, setCourse] = useState("c1")
  const [week, setWeek] = useState(CUR_WEEK)
  const c = courseObj(course)
  const subs = c.subs
  const [sub, setSub] = useState(subs[0])
  useEffect(() => { if (fFocus) { setCourse(fFocus.course); setWeek(fFocus.week); setSub(fFocus.sub); clearFFocus() } }, [fFocus, clearFFocus])
  const cur = subs.includes(sub) ? sub : subs[0]
  const nc = isNoClass(course, cur, week)

  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-semibold tracking-tight">Feedback</h1><p className="text-sm text-muted-foreground">เขียน Feedback (ขวา) · ภาพรวมทุกวิชา (ซ้าย) · กดปุ่มหัวข้อคาบเรียนเพื่อดู Live Lesson Topic</p></div>

      <Segmented value={course} onChange={(v) => { setCourse(v); setSub(courseObj(v).subs[0]) }} options={COURSES.map((x) => ({ v: x.id, l: x.n }))} />
      <WeekPicker week={week} setWeek={setWeek} />

      <div className="flex flex-wrap items-center gap-2 border-b">
        <div className="flex flex-wrap gap-1">
          {subs.map((s) => {
            const dc = isNoClass(course, s, week)
            return <button key={s} disabled={dc} onClick={() => setSub(s)} className={cn("border-b-2 px-4 py-2 text-sm font-semibold -mb-px", dc ? "cursor-not-allowed opacity-40 border-transparent" : cur === s ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>{SUBJ[s].n}{dc && " (ไม่มีเรียน)"}</button>
          })}
        </div>
        <TopicPanel course={course} />
      </div>

      {nc
        ? <Card><CardContent className="p-6 text-sm text-muted-foreground">ไม่มีการเรียนการสอน {SUBJ[cur].n} ใน W{week}</CardContent></Card>
        : (
          <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
            <Card className="order-2 lg:order-1"><CardContent className="space-y-2.5 p-4">
              <div className="text-sm font-semibold">ภาพรวม Feedback ทุกวิชา · W{week}</div>
              {subs.map((s) => {
                const dc = isNoClass(course, s, week), p = fbPrepared(course, s, week)
                return (
                  <button key={s} onClick={() => !dc && setSub(s)} className={cn("block w-full rounded-lg border bg-muted/30 p-3 text-left transition-colors", dc ? "cursor-default opacity-70" : "hover:border-primary/50", s === cur && "border-primary/40")}>
                    <div className="mb-1 flex items-center justify-between"><b className="text-sm">{SUBJ[s].n} {s === cur && <span className="rounded bg-blue-100 px-1.5 text-[10px] text-blue-600">กำลังแก้</span>}</b>
                      {dc ? <span className="text-xs text-muted-foreground">ไม่มีเรียน</span> : p ? <StatusPill st="prepared" /> : <span className="text-xs text-muted-foreground">ยังไม่เตรียม</span>}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground">{dc ? "—" : fbText(course, s, week)}</div>
                  </button>
                )
              })}
            </CardContent></Card>

            <Card className="order-1 lg:order-2"><CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between"><h3 className="text-sm font-semibold">เขียน Feedback — {SUBJ[cur].n} · W{week}</h3>{fbPrepared(course, cur, week) ? <StatusPill st="prepared" /> : <span className="text-xs text-muted-foreground">ยังไม่ Submit</span>}</div>
              <FeedbackEditor course={course} sub={cur} week={week} />
            </CardContent></Card>
          </div>
        )}
    </div>
  )
}

function TopicPanel({ course }: { course: string }) {
  const subs = courseObj(course).subs
  const [seg, setSeg] = useState(subs[0])
  const cur = subs.includes(seg) ? seg : subs[0]
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="mb-1 ml-auto inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
          <Tv className="size-3.5" /> หัวข้อคาบเรียน <PanelRightOpen className="size-3.5" />
        </button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-md">
        <SheetHeader><SheetTitle className="flex items-center gap-2 text-primary"><Tv className="size-4" /> Live Lesson Topic · ทุกสัปดาห์</SheetTitle></SheetHeader>
        <div className="mt-4 flex flex-wrap gap-1 rounded-lg border bg-card p-1">
          {subs.map((s) => (
            <button key={s} onClick={() => setSeg(s)} className={cn("flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors", cur === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{SUBJ[s].n}</button>
          ))}
        </div>
        <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto">
          {WEEKS.map((w) => {
            const dc = isNoClass(course, cur, w)
            return (
              <div key={w} className={cn("flex items-center gap-3 rounded-lg border p-2.5", w === CUR_WEEK && "border-primary/40 bg-primary/5")}>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">W{w}</span>
                <div className="min-w-0">
                  <div className={cn("truncate text-sm", dc ? "text-muted-foreground" : "font-medium")}>{dc ? "— ไม่มีเรียน" : topicOf(cur, w)}</div>
                  <div className="text-[11px] text-muted-foreground">{WK_DATE[w]}{w === CUR_WEEK && " · สัปดาห์ปัจจุบัน"}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-[11px] text-muted-foreground">✦ ระบบใช้หัวข้อแต่ละสัปดาห์ + คะแนน Quiz เฉลี่ยของห้อง ร่าง Feedback ให้อัตโนมัติ</div>
      </SheetContent>
    </Sheet>
  )
}
