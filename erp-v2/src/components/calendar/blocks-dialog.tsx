"use client"

import { useState } from "react"
import { CheckIcon, PlusIcon, SparklesIcon, TrashIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { endTime, fmtDate, fromMinutes, toMinutes, weekdayOf } from "@/domain/dates"
import * as Sch from "@/domain/rules/scheduling"
import type { Branch, ClassBlock, DateStr } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const DAY_FULL = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"]

function Choice({ on, onClick, title, detail }: { on: boolean; onClick: () => void; title: string; detail?: string }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick}
      className={cn("flex items-start gap-2 rounded-xl border p-2 text-left text-sm", on ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", on && "border-primary bg-primary text-primary-foreground")}>{on && <CheckIcon className="size-3" />}</span>
      <span><span className="font-medium">{title}</span>{detail && <span className="block text-xs text-muted-foreground">{detail}</span>}</span>
    </button>
  )
}

/**
 * Class blocks of one day (owner 2026-10-01): Admin / Manager of the branch set the rows of the teacher board —
 * only this date, or this date and every week after (that weekday, Mon–Fri, Sat–Sun or every day). Inside a special
 * period the change stays in that period. Classes sitting in a block that moved can follow it.
 */
export function BlocksDialog({ branch, date, onClose, scope: initialScope = "day" }: { branch: Branch; date: DateStr; onClose: () => void; scope?: Sch.BlockScope }) {
  const sessions = useStore((s) => s.sessions)
  const save = useStore((s) => s.setDayBlocks)
  const now = useNow(60_000)
  const current = Sch.blocksOn(branch, date)
  const [blocks, setBlocks] = useState<ClassBlock[]>(current)
  const [scope, setScope] = useState<Sch.BlockScope>(initialScope)
  const wd = weekdayOf(date)
  const [days, setDays] = useState<Sch.BlockDays>("same")
  const [shift, setShift] = useState(true)
  const period = Sch.periodsOn(branch, date)[0]
  const error = Sch.validateBlocks(blocks)

  const put = (i: number, patch: Partial<ClassBlock>) => setBlocks((b) => b.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const lastEnd = blocks.length ? [...blocks].sort((a, b) => a.start.localeCompare(b.start)).at(-1)!.end : (wd === 0 || wd === 6 ? "09:00" : "13:00")
  const add = () => setBlocks((b) => [...b, { start: lastEnd, end: endTime(lastEnd, 120) }])
  // back-to-back blocks of the first block's length until the branch closes
  const fill = () => {
    const close = branch.hours[wd]?.close
    if (!close || !blocks.length) return
    const sorted = [...blocks].sort((a, b) => a.start.localeCompare(b.start))
    const len = toMinutes(sorted[0].end) - toMinutes(sorted[0].start)
    const out = [sorted[0]]
    for (let m = toMinutes(sorted[0].end); m + len <= toMinutes(close); m += len) out.push({ start: fromMinutes(m), end: fromMinutes(m + len) })
    setBlocks(out)
  }

  // how many upcoming sessions sit in a block that moves — they follow it when "shift" is on
  const reaches = Sch.blockChangeReaches(branch, date, scope, days)
  const nextBranch = { ...branch, ...Sch.applyBlocks(branch, date, blocks, scope, days) }
  const toShift = error ? [] : sessions.filter((x) => x.branchId === branch.id && !x.cancelled && reaches(x.date) && Sch.sessionState(x, now) === "upcoming"
    && !!Sch.shiftInBlock(x.start, x.minutes, Sch.blocksOn(branch, x.date), Sch.blocksOn(nextBranch, x.date)))

  const submit = () => report(save({ branchId: branch.id, date, blocks, scope, days, shift: shift && toShift.length > 0 }),
    (v) => `บันทึกช่วงเวลาแล้ว${v.period ? ` (ช่วง ${v.period})` : ""}${v.shifted ? ` · เลื่อนคาบตาม ${v.shifted} คาบ` : ""}${v.skipped ? ` · ${v.skipped} คาบเลื่อนไม่ได้เพราะจะชน — ยังอยู่เวลาเดิม` : ""}`) && onClose()

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>ตั้งช่วงเวลาคลาส</DialogTitle>
          <DialogDescription>วัน{DAY_FULL[wd]} {fmtDate(date, { year: true })} · {branch.name} · แถวของตารางครูและช่วงที่เลือกได้ตอนสร้างคลาส</DialogDescription>
        </DialogHeader>
        {period && (
          <p className="flex items-center gap-1.5 rounded-xl bg-violet-50 p-2 text-xs text-violet-900 dark:bg-violet-950/40 dark:text-violet-100">
            <SparklesIcon className="size-4 shrink-0" /> วันนี้อยู่ในช่วงพิเศษ &quot;{period.name}&quot; ({fmtDate(period.from)}–{fmtDate(period.to)}) — แก้แล้วมีผลเฉพาะในช่วงนี้ วันปกติไม่เปลี่ยน
          </p>
        )}

        <div className="space-y-1.5">
          {blocks.map((b, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="w-12 text-xs text-muted-foreground">ช่วง {i + 1}</span>
              <input type="time" step={900} value={b.start} aria-label="เวลาเริ่ม" className="h-9 rounded-3xl bg-input/50 px-3" onChange={(e) => put(i, { start: e.target.value })} />
              <span className="text-muted-foreground">–</span>
              <input type="time" step={900} value={b.end} aria-label="เวลาจบ" className="h-9 rounded-3xl bg-input/50 px-3" onChange={(e) => put(i, { end: e.target.value })} />
              <span className="text-xs text-muted-foreground tabular-nums">{b.start && b.end && toMinutes(b.end) > toMinutes(b.start) ? `${(toMinutes(b.end) - toMinutes(b.start)) / 60} ชม.` : ""}</span>
              <Button size="icon-xs" variant="ghost" className="ml-auto" aria-label="ลบช่วง" onClick={() => setBlocks((x) => x.filter((_, j) => j !== i))}><TrashIcon /></Button>
            </div>
          ))}
          {!blocks.length && <p className="text-xs text-muted-foreground">ไม่มีช่วง — ตารางครูจะแสดงตามเวลาของคาบที่มีจริง</p>}
          <div className="flex gap-1.5 pt-1">
            <Button size="xs" variant="outline" onClick={add}><PlusIcon /> เพิ่มช่วง</Button>
            {blocks.length > 0 && branch.hours[wd] && <Button size="xs" variant="ghost" onClick={fill}>เติมต่อกันจนปิดสาขา ({branch.hours[wd]!.close})</Button>}
          </div>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">ใช้กับ</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Choice on={scope === "day"} onClick={() => setScope("day")} title="เฉพาะวันนี้" detail={fmtDate(date, { weekday: true })} />
            <Choice on={scope === "following"} onClick={() => setScope("following")} title="วันนี้และทุกสัปดาห์ต่อจากนี้" detail={period ? `จนจบช่วง ${period.name}` : "ตั้งแต่วันนี้ไป"} />
          </div>
          {scope === "following" && (
            <div className="flex flex-wrap gap-1.5">
              {([["same", `ทุกวัน${DAY_FULL[wd]}`], ["weekdays", "จ.–ศ. ทั้งหมด"], ["weekend", "ส.–อา."], ["all", "ทุกวัน"]] as const).map(([k, label]) => (
                <button key={k} type="button" aria-pressed={days === k} onClick={() => setDays(k)}
                  className={cn("rounded-full border px-3 py-1 text-xs", days === k ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{label}</button>
              ))}
            </div>
          )}
        </div>

        {toShift.length > 0 && (
          <div className="space-y-1.5 rounded-xl bg-amber-50 p-2.5 text-sm text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
            <p>มี <b>{toShift.length} คาบ</b> ที่อยู่ในช่วงที่เปลี่ยนเวลา — เลื่อนตามช่วงใหม่ไหม?</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <Choice on={shift} onClick={() => setShift(true)} title="เลื่อนตามไปทั้งหมด" detail="คาบที่จะชนกับคาบอื่นอยู่เวลาเดิม" />
              <Choice on={!shift} onClick={() => setShift(false)} title="ไม่เลื่อน" detail="คาบอยู่เวลาเดิม แสดงเป็นแถวแยก" />
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">บันทึกแล้วแจ้งเตือนทุกคนในสาขา{shift && toShift.length ? " · ครูของคาบที่เลื่อนเห็นจุดแดงที่คาบ" : ""}</p>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!!error} onClick={submit}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
