import { useState } from "react"
import { SlidersHorizontal, Calendar, ChevronDown, Plus, Info } from "lucide-react"
import { SUBJ, WK_DATE, courseObj, isNoClass, type Override } from "@/data"
import { ovToggle, ovDate, ovRename, ovAddExtra, ovDelExtra, ovSetExtra, ovClear, ovClearSubject, toggleNoClass, useSync } from "@/store"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function CheckRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <label className={cn("flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors", checked ? "bg-primary/10 font-medium" : "hover:bg-muted")}>
      <Checkbox checked={checked} onCheckedChange={onToggle} /> {label}
    </label>
  )
}

function SubjectCard({ o, course, wk, subKey, name, isExtra, extraId }: { o: Override; course: string; wk: number; subKey: string; name: string; isExtra?: boolean; extraId?: string }) {
  const [open, setOpen] = useState(true)
  const onName = (v: string) => (isExtra && extraId ? ovSetExtra(o, extraId, "name", v) : ovRename(o, subKey, v))
  return (
    <div className="rounded-xl border">
      <div className="flex w-full items-center gap-2 px-3.5 py-2.5">
        <Input value={name} onChange={(e) => onName(e.target.value)} placeholder="ชื่อวิชา" className="h-8 max-w-[200px] text-sm font-semibold" />
        {isExtra && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">เพิ่มใหม่</span>}
        <button onClick={() => setOpen((v) => !v)} className={cn("ml-auto flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-transform", !open && "-rotate-180")}><ChevronDown className="size-4" /></button>
      </div>
      {open && (
        <div className="space-y-1 border-t p-2.5">
          <CheckRow label="ขยายเวลาส่งการบ้าน" checked={!!o.lateHw[subKey]} onToggle={() => ovToggle(o, "lateHw", subKey)} />
          <CheckRow label="ไม่มีเรียน" checked={isNoClass(course, subKey, wk)} onToggle={() => toggleNoClass(course, subKey, wk)} />
          <CheckRow label="วันที่เรียนชดเชย" checked={!!o.makeup[subKey]} onToggle={() => ovToggle(o, "makeup", subKey)} />
          <div className="flex items-center justify-between px-1 pt-1">
            {isExtra ? <button onClick={() => extraId && ovDelExtra(o, extraId)} className="text-xs font-semibold text-destructive hover:underline">Delete</button> : <span />}
            <Button variant="outline" size="sm" className="h-8 rounded-full" onClick={() => ovClearSubject(o, course, subKey, wk)}>Clear</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export function SpecialCases({ o, course, wk }: { o: Override; course: string; wk: number }) {
  useSync()
  const subs = courseObj(course).subs
  const activeCount = subs.filter((s) => o.lateHw[s] || o.makeup[s] || isNoClass(course, s, wk)).length + o.extraSubs.length

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button aria-label={`Live stream / เคสพิเศษ · W${wk}`} title={`Live stream / เคสพิเศษ · W${wk}`} className="relative inline-flex size-9 items-center justify-center rounded-lg border bg-card hover:bg-muted">
          <SlidersHorizontal className="size-4 text-primary" />
          {activeCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">{activeCount}</span>}
        </button>
      </DialogTrigger>
      <DialogContent className="flex h-[860px] max-h-[calc(100vh-2rem)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-5 text-primary" /> จัดการ Live stream · W{wk}
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild><button className="text-muted-foreground hover:text-foreground" aria-label="คำอธิบาย"><Info className="size-4" /></button></TooltipTrigger>
                <TooltipContent className="max-w-[250px] text-left leading-relaxed">การแก้ไขต่างๆ ที่เกิดขึ้นในสัปดาห์นี้ (W{wk}) จะเปลี่ยนเฉพาะแค่สัปดาห์นั้นๆ ไม่ส่งผลกระทบไปถึงสัปดาห์อื่นๆ</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-6 py-4">
          <div>
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">ช่วงสัปดาห์</div>
            <div className="relative">
              <Input defaultValue={o.dateRange || WK_DATE[wk]} placeholder="เช่น 31 ส.ค. – 4 ก.ย." onChange={(e) => ovDate(o, e.target.value)} className="pr-9" />
              <Calendar className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          {subs.map((sub) => <SubjectCard key={sub} o={o} course={course} wk={wk} subKey={sub} name={o.rename[sub] || SUBJ[sub].n} />)}
          {o.extraSubs.map((e) => <SubjectCard key={e.id} o={o} course={course} wk={wk} subKey={e.id} name={e.name} isExtra extraId={e.id} />)}
        </div>

        <div className="flex shrink-0 items-center justify-between border-t px-6 py-3">
          <button onClick={() => ovClear(o)} className="text-sm font-semibold text-primary hover:underline">Clear all</button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => ovAddExtra(o)}><Plus className="mr-1.5 size-4" /> เพิ่มวิชา</Button>
            <DialogClose asChild><Button size="sm">บันทึก</Button></DialogClose>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
