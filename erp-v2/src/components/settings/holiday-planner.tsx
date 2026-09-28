"use client"

import { useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, TrashIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { addDays, fmtDate, parseDate, toDateStr, weekdayOf } from "@/domain/dates"
import { can, inBranch } from "@/domain/rules/permissions"
import { closesBranch, holidayImpact } from "@/domain/rules/scheduling"
import { HOLIDAY_CATEGORY_LABEL } from "@/domain/rules/settings"
import type { Branch, Holiday, HolidayCategory } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

const TH_MONTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
const DOW = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]
const monthStart = (d: string) => d.slice(0, 7) + "-01"
const shiftMonth = (d: string, n: number) => { const x = parseDate(d); return toDateStr(new Date(x.getFullYear(), x.getMonth() + n, 1)) }

type Draft = { id?: string; name: string; date: string; category: HolidayCategory }

/**
 * Holiday planner (owner design 2026-09-28): list on the left + month calendar on the right.
 * - System mode: the company calendar (traditional / company holidays) — Director only.
 * - Branch mode: every company holiday with a per-branch switch (on = branch closes, off = branch opens),
 *   plus the branch's own holidays that its Admin/Manager create — so they can judge which days to close.
 */
export function HolidayPlanner({ branch }: { branch?: Branch }) {
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const all = useStore((s) => s.holidays)
  const sessions = useStore((s) => s.sessions)
  const act = useStore(useShallow((s) => ({ add: s.addHoliday, update: s.updateHoliday, remove: s.removeHoliday, setOpen: s.setHolidayOpen })))
  const today = toDateStr(useNow())
  const [anchor, setAnchor] = useState(monthStart(today))
  const [scope, setScope] = useState<"year" | "month">("year")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [closing, setClosing] = useState<Holiday | null>(null)

  const isBranch = !!branch
  const manageBranch = isBranch && can(me, "holiday.manage") && inBranch(me, branch.id)
  const manageCompany = can(me, "settings.manage")
  const year = anchor.slice(0, 4)
  const visible = all
    .filter((h) => (isBranch ? h.branchId === null || h.branchId === branch.id : h.branchId === null))
    .sort((a, b) => a.date.localeCompare(b.date))
  const listed = visible.filter((h) => (scope === "month" ? h.date.slice(0, 7) === anchor.slice(0, 7) : h.date.startsWith(year)))
  const closed = (h: Holiday) => (isBranch ? closesBranch(h, branch.id) : true)
  const canEdit = (h: Holiday) => (h.branchId === null ? !isBranch && manageCompany : manageBranch)

  const openAdd = (date = today) => setDraft({ name: "", date, category: isBranch ? "branch" : "traditional" })

  // month grid, Monday first (same as every calendar view in the system)
  const first = parseDate(anchor)
  const gridStart = addDays(anchor, -((weekdayOf(anchor) + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const rows = cells.slice(35).every((d) => parseDate(d).getMonth() !== first.getMonth()) ? cells.slice(0, 35) : cells

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <section className="space-y-3">
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h3 className="font-semibold">{isBranch ? "วันหยุด" : "ปฏิทินวันหยุดบริษัท"}</h3>
            <p className="text-xs text-muted-foreground">
              {isBranch ? "วันหยุดบริษัท (จาก System) เปิด/ปิดได้ต่อสาขา + วันหยุดของสาขาเอง" : "มีผลกับทุกสาขา — แต่ละสาขาเลือกเปิดทำการในวันไหนก็ได้"}
            </p>
          </div>
          {(isBranch ? manageBranch : manageCompany) && <Button size="sm" variant="outline" onClick={() => openAdd()}><PlusIcon /> เพิ่ม</Button>}
        </div>
        <NativeSelect className="h-9 w-44" value={scope} onChange={(e) => setScope(e.target.value as "year" | "month")}
          options={[{ value: "year", label: `ทั้งปี ${Number(year) + 543}` }, { value: "month", label: `เฉพาะ${TH_MONTH[first.getMonth()]}` }]} />
        <div className="max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
          {listed.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">ไม่มีวันหยุดในช่วงนี้</p>}
          {listed.map((h) => {
            const isClosed = closed(h)
            return (
              <div key={h.id} onClick={() => setAnchor(monthStart(h.date))}
                className={cn("flex cursor-pointer items-center gap-3 rounded-2xl p-2.5 transition-colors hover:bg-muted/50", isClosed ? "bg-card ring-1 ring-foreground/5" : "bg-muted/40 opacity-60", h.date < today && "opacity-50")}>
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", h.category === "company" ? "bg-violet-100 text-violet-700" : h.category === "branch" ? "bg-sky-100 text-sky-700" : "bg-rose-100 text-rose-700")}>
                  <CalendarDaysIcon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] text-muted-foreground">{HOLIDAY_CATEGORY_LABEL[h.category]}</span>
                  <span className="block truncate text-sm font-medium">{h.name}</span>
                  <span className="block text-xs text-muted-foreground">{fmtDate(h.date, { weekday: true, year: true })}</span>
                </span>
                {isBranch && h.branchId === null ? (
                  manageBranch ? (
                    <span className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-muted-foreground">{isClosed ? "หยุด" : "เปิดทำการ"}</span>
                      <Switch checked={isClosed} aria-label="สาขานี้หยุดวันนี้"
                        onCheckedChange={(v) => (v ? setClosing(h) : report(act.setOpen(h.id, branch.id, true, false), `${branch.name}เปิดทำการวัน${h.name} — คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ`))} />
                    </span>
                  ) : <span className="text-[11px] text-muted-foreground">{isClosed ? "หยุด" : "เปิดทำการ"}</span>
                ) : canEdit(h) && (
                  <span className="flex" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon-sm" variant="ghost" aria-label="แก้" onClick={() => setDraft({ id: h.id, name: h.name, date: h.date, category: h.category })}><PencilIcon /></Button>
                    <Button size="icon-sm" variant="ghost" aria-label="ลบ" onClick={() => report(act.remove(h.id), "ลบวันหยุดแล้ว (คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ)")}><TrashIcon /></Button>
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5">
        <div className="mb-2 flex items-center gap-2">
          <Button size="icon-sm" variant="outline" aria-label="เดือนก่อน" onClick={() => setAnchor(shiftMonth(anchor, -1))}><ChevronLeftIcon /></Button>
          <span className="min-w-36 text-center font-medium">{TH_MONTH[first.getMonth()]} {first.getFullYear() + 543}</span>
          <Button size="icon-sm" variant="outline" aria-label="เดือนถัดไป" onClick={() => setAnchor(shiftMonth(anchor, 1))}><ChevronRightIcon /></Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAnchor(monthStart(today))}>วันนี้</Button>
        </div>
        <div className="grid grid-cols-7 overflow-hidden rounded-2xl border text-sm">
          {DOW.map((d) => <div key={d} className="border-b bg-muted/40 py-1.5 text-center text-xs text-muted-foreground">{d}</div>)}
          {rows.map((d) => {
            const inMonth = parseDate(d).getMonth() === first.getMonth()
            const hs = visible.filter((h) => h.date === d)
            const shut = hs.some(closed)
            const canAdd = (isBranch ? manageBranch : manageCompany) && inMonth && !hs.some((h) => (isBranch ? h.branchId === branch.id : h.branchId === null))
            const n = isBranch ? sessions.filter((s) => !s.cancelled && s.date === d && s.branchId === branch.id).length : 0
            return (
              <div key={d} className={cn("group relative min-h-20 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-muted/20 text-muted-foreground/50", shut && inMonth && "bg-rose-50", d === today && "ring-2 ring-primary ring-inset")}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs", shut && "font-semibold text-rose-700")}>{parseDate(d).getDate()}</span>
                  {n > 0 && inMonth && <span className="text-[10px] text-muted-foreground">{n} คาบ</span>}
                </div>
                {hs.map((h) => (
                  <p key={h.id} className={cn("mt-0.5 truncate text-[11px]", closed(h) ? "text-rose-700" : "text-muted-foreground line-through")} title={`${h.name} · ${HOLIDAY_CATEGORY_LABEL[h.category]}`}>{h.name}</p>
                ))}
                {canAdd && (
                  <button onClick={() => openAdd(d)} className="absolute inset-x-1.5 bottom-1.5 hidden items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 py-0.5 text-[11px] text-primary group-hover:flex">
                    <PlusIcon className="size-3" /> เพิ่ม
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-rose-200" /> หยุด</span>
          {isBranch && <span className="line-through">ชื่อขีดฆ่า = วันหยุดบริษัทที่สาขานี้เปิดทำการ</span>}
          <span>เอาเมาส์ชี้ช่องว่างเพื่อเพิ่มวันหยุด</span>
        </p>
      </section>

      {draft && (
        <HolidayDialog draft={draft} branch={branch} onClose={() => setDraft(null)}
          onSave={(d, cancel) => {
            const ok = d.id
              ? report(act.update(d.id, { name: d.name, date: d.date, category: d.category }), "แก้วันหยุดแล้ว")
              : report(act.add({ name: d.name, date: d.date, category: d.category, branchId: branch?.id ?? null }, cancel), (v) => `เพิ่มวันหยุดแล้ว${v.affected ? ` · ${cancel ? "ยกเลิก" : "กระทบ"} ${v.affected} คาบ` : ""}`)
            if (ok) setDraft(null)
          }} />
      )}
      {closing && branch && (
        <CloseDayDialog holiday={closing} branch={branch} affected={holidayImpact(closing.date, branch.id, sessions).length} onClose={() => setClosing(null)}
          onConfirm={(cancel) => report(act.setOpen(closing.id, branch.id, false, cancel), `${branch.name}หยุดวัน${closing.name}แล้ว`) && setClosing(null)} />
      )}
    </div>
  )
}

function HolidayDialog({ draft, branch, onClose, onSave }: { draft: Draft; branch?: Branch; onClose: () => void; onSave: (d: Draft, cancel: boolean) => void }) {
  const sessions = useStore((s) => s.sessions)
  const [d, setD] = useState(draft)
  const [cancel, setCancel] = useState(true)
  const affected = !d.id && d.date ? holidayImpact(d.date, branch?.id ?? null, sessions) : []
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{d.id ? "แก้วันหยุด" : branch ? `เพิ่มวันหยุดของสาขา${branch.name}` : "เพิ่มวันหยุดบริษัท"}</DialogTitle>
          <DialogDescription>{branch ? "มีผลเฉพาะสาขานี้" : "มีผลกับทุกสาขา — สาขาเลือกเปิดทำการเองได้ที่หน้าสาขา"}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="ชื่อวันหยุด *" className="sm:col-span-2"><Input autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder="เช่น วันสงกรานต์" /></Field>
          <Field label="วันที่ *"><Input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></Field>
          <Field label="ประเภท">
            {branch ? <Input value={HOLIDAY_CATEGORY_LABEL.branch} disabled /> : (
              <NativeSelect value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as HolidayCategory })}
                options={(["traditional", "company"] as HolidayCategory[]).map((c) => ({ value: c, label: HOLIDAY_CATEGORY_LABEL[c] }))} />
            )}
          </Field>
        </div>
        {affected.length > 0 && (
          <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
            วันนั้นมี <b>{affected.length} คาบ</b>{branch ? "" : " (ทุกสาขา)"} · นักเรียน {affected.reduce((n, s) => n + s.studentIds.length, 0)} คน
            <label className="mt-1 flex items-center gap-2"><Checkbox checked={cancel} onCheckedChange={(v) => setCancel(!!v)} /> ยกเลิกคาบเหล่านี้ + แจ้งทีมให้ติดต่อผู้ปกครอง/นัดชดเชย</label>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!d.name.trim() || !d.date} onClick={() => onSave(d, cancel)}>{d.id ? "บันทึก" : "เพิ่มวันหยุด"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CloseDayDialog({ holiday, branch, affected, onClose, onConfirm }: { holiday: Holiday; branch: Branch; affected: number; onClose: () => void; onConfirm: (cancel: boolean) => void }) {
  const [cancel, setCancel] = useState(true)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>สาขา{branch.name}หยุดวัน{holiday.name}?</DialogTitle>
          <DialogDescription>{fmtDate(holiday.date, { weekday: true, year: true })}</DialogDescription>
        </DialogHeader>
        {affected > 0 ? (
          <div className="rounded-md bg-amber-50 p-2 text-sm text-amber-900">
            วันนั้นสาขานี้มี <b>{affected} คาบ</b>
            <label className="mt-1 flex items-center gap-2"><Checkbox checked={cancel} onCheckedChange={(v) => setCancel(!!v)} /> ยกเลิกคาบเหล่านี้ + แจ้งทีม</label>
          </div>
        ) : <p className="text-sm text-muted-foreground">วันนั้นสาขานี้ไม่มีคาบ</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => onConfirm(cancel)}>ยืนยันหยุด</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
