"use client"

import { useEffect, useRef, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, PlusIcon, RepeatIcon, TrashIcon } from "lucide-react"
import { Segmented } from "@/components/app/page-layout"
import { HUE, TAG_HUE } from "@/components/app/tags"
import { NativeSelect } from "@/components/app/native-select"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { InfoTip } from "@/components/app/info-tip"
import { Switch } from "@/components/ui/switch"
import { addDays, fmtDate, parseDate, toDateStr, weekdayOf, yearOf, weekdayShort } from "@/domain/dates"
import { can, inBranch } from "@/domain/rules/permissions"
import { closesBranch, holidayForBrand, holidayImpact, periodsIn } from "@/domain/rules/scheduling"
import { PeriodBanner } from "@/components/app/period-banner"
import { HOLIDAY_CATEGORY_LABEL } from "@/domain/rules/settings"
import type { Branch, Brand, Holiday, HolidayCategory } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { tx } from "@/lib/i18n"
import { Textarea } from "@/components/ui/textarea"
import { broadcastText, broadcastTexts, familyChatsOf, holidayParentText } from "@/lib/forms"
import { toast } from "@/lib/toast"

const TH_MONTH = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"]
const DOW = ["จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส.", "อา."]
const monthStart = (d: string) => d.slice(0, 7) + "-01"
const shiftMonth = (d: string, n: number) => { const x = parseDate(d); return toDateStr(new Date(x.getFullYear(), x.getMonth() + n, 1)) }

type Draft = { id?: string; name: string; date: string; category: HolidayCategory; brand?: Brand; seriesId?: string
  /** adding: also the same day in each of the next N years (0 = just this one) · editing a series row: apply to the whole series */
  repeat: number; scope: "one" | "series" }

// owner 2026-11-09: on this page brands are NA / LI; a day's colour says whom it closes — NA only, LI only, or both
const BRAND_LABEL: Record<Brand, string> = { nockacademy: "NA", liclass: "LI" }
type Scope = "na" | "li" | "both" | "branch"
const scopeOf = (h: Holiday): Scope => (h.branchId !== null ? "branch" : h.brand === "nockacademy" ? "na" : h.brand === "liclass" ? "li" : "both")
/* eslint-disable no-restricted-syntax -- ds-exception: whose brand a holiday closes (tags.ts holidayBrand: na ฟ้า · li ม่วง · both คราม) — identity, not status */
const SCOPE_TEXT: Record<Scope, string> = { na: "text-sky-700", li: "text-violet-700", both: "text-indigo-700", branch: "text-slate-700" }
const SCOPE_BG: Record<Scope, string> = { na: "bg-sky-50", li: "bg-violet-50", both: "bg-indigo-50", branch: "bg-slate-100" }
const SCOPE_BAR: Record<Scope, string> = { na: "bg-sky-400", li: "bg-violet-400", both: "bg-indigo-400", branch: "bg-slate-400" }
/* eslint-enable no-restricted-syntax */
const BRAND_CHIP: Record<Brand, string> = { nockacademy: HUE[TAG_HUE.holidayBrand.na].chip, liclass: HUE[TAG_HUE.holidayBrand.li].chip }
/** the day when several holidays fall on it: both brands if they together close both */
const dayScope = (hs: Holiday[]): Scope => {
  const s = new Set(hs.map(scopeOf))
  if (s.has("both") || (s.has("na") && s.has("li"))) return "both"
  return s.has("na") ? "na" : s.has("li") ? "li" : "branch"
}
const brandsOf = (h: Holiday): Brand[] => (h.branchId !== null ? [] : h.brand ? [h.brand] : ["nockacademy", "liclass"])
/** the default is laid out 5 years ahead (the app keeps it going) */
const DEFAULT_REPEAT = 5

/**
 * Holiday planner (owner design 2026-09-28): list on the left + month calendar on the right.
 * - System mode: the company calendar (traditional / company holidays) — Director only.
 * - Branch mode: every company holiday with a per-branch switch (on = branch closes, off = branch opens),
 *   plus the branch's own holidays that its Admin/Manager create — so they can judge which days to close.
 */
export function HolidayPlanner({ branch }: { branch?: Branch }) {
  const me = useStore((s) => s.me())
  const all = useStore((s) => s.holidays)
  const sessions = useStore((s) => s.sessions)
  const act = useStore(useShallow((s) => ({ loadThai: s.loadThaiHolidayMock, add: s.addHoliday, update: s.updateHoliday, remove: s.removeHoliday, setOpen: s.setHolidayOpen })))
  const today = toDateStr(useNow())
  const [anchor, setAnchor] = useState(monthStart(today))
  const [scope, setScope] = useState<"year" | "month">("year")
  const [draft, setDraft] = useState<Draft | null>(null)
  const [closing, setClosing] = useState<Holiday | null>(null)
  const [removing, setRemoving] = useState<Holiday | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [brandFilter, setBrandFilter] = useState<"all" | Brand>("all")

  const isBranch = !!branch
  const manageBranch = isBranch && can(me, "holiday.manage") && inBranch(me, branch.id)
  const manageCompany = can(me, "settings.manage")
  const year = anchor.slice(0, 4)
  // owner 2026-11-09: Liclass and NockAcademy keep different calendars — a branch sees its own brand's company holidays only
  const visible = all
    .filter((h) => (isBranch ? h.branchId === branch.id || (h.branchId === null && holidayForBrand(h, branch.brand)) : h.branchId === null && (brandFilter === "all" || !h.brand || h.brand === brandFilter)))
    .sort((a, b) => a.date.localeCompare(b.date))
  // days in the year each brand is closed (company holidays; a day closing both counts for both)
  const yearDays = (pred: (h: Holiday) => boolean) => new Set(all.filter((h) => h.branchId === null && h.date.startsWith(year) && pred(h)).map((h) => h.date)).size
  const counts = { all: yearDays(() => true), na: yearDays((h) => holidayForBrand(h, "nockacademy")), li: yearDays((h) => holidayForBrand(h, "liclass")) }
  const listed = visible.filter((h) => (scope === "month" ? h.date.slice(0, 7) === anchor.slice(0, 7) : h.date.startsWith(year)))
  const months = Object.entries(listed.reduce<Record<string, Holiday[]>>((m, h) => { (m[h.date.slice(0, 7)] ??= []).push(h); return m }, {})).sort(([a], [b]) => a.localeCompare(b))
  // the list opens at the current month (owner 2026-11-09)
  const listKey = `${year}|${scope}|${brandFilter}`
  useEffect(() => {
    const box = listRef.current, cur = box?.querySelector<HTMLElement>(`[data-month="${today.slice(0, 7)}"]`)
    if (box && cur) box.scrollTop = cur.offsetTop - box.offsetTop - 4
  }, [listKey, today])
  const closed = (h: Holiday) => (isBranch ? closesBranch(h, branch.id) : true)
  const canEdit = (h: Holiday) => (h.branchId === null ? !isBranch && manageCompany : manageBranch)

  const openAdd = (date = today) => setDraft({ name: "", date, category: isBranch ? "branch" : "traditional", brand: !isBranch && brandFilter !== "all" ? brandFilter : undefined, repeat: 0, scope: "one" })

  // month grid, Monday first (same as every calendar view in the system)
  const first = parseDate(anchor)
  const gridStart = addDays(anchor, -((weekdayOf(anchor) + 6) % 7))
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  const rows = cells.slice(35).every((d) => parseDate(d).getMonth() !== first.getMonth()) ? cells.slice(0, 35) : cells
  // special periods (e.g. Summer) shown on the board so closing decisions account for them
  const periods = branch ? periodsIn(branch, rows[0], rows[rows.length - 1]) : []
  const periodOf = (d: string) => periods.find((p) => p.from <= d && d <= p.to)

  return (
    // company mode (owner 2026-11-09): no frame, fills the page height; wider gap between the list and the calendar
    <div className={cn("grid gap-8 lg:grid-cols-[minmax(0,22rem)_1fr]", !isBranch && "lg:h-[calc(100dvh-22rem)] lg:min-h-[34rem]")}>
      <section className={cn("space-y-3", !isBranch && "flex min-h-0 flex-col space-y-0 gap-3")}>
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <h3 className="font-semibold">{isBranch ? tx("วันหยุด") : tx("ปฏิทินวันหยุดบริษัท")}</h3>
            <p className="text-xs text-muted-foreground">
              {isBranch ? tx("วันหยุดบริษัท (จาก System) เปิด/ปิดได้ต่อสาขา + วันหยุดของสาขาเอง") : tx("มีผลกับทุกสาขา — แต่ละสาขาเลือกเปิดทำการในวันไหนก็ได้")}
            </p>
          </div>
          {(isBranch ? manageBranch : manageCompany) && <Button size="sm" variant="outline" onClick={() => openAdd()}><PlusIcon />  {tx("เพิ่ม")}</Button>}
        </div>
        {!isBranch && (
          <Segmented<"all" | Brand> value={brandFilter} onChange={setBrandFilter} label={tx("แบรนด์")} className="w-full [&>button]:flex-1 [&>button]:justify-center"
            options={([["all", tx("ทั้งหมด"), counts.all], ["nockacademy", BRAND_LABEL.nockacademy, counts.na], ["liclass", BRAND_LABEL.liclass, counts.li]] as const).map(([value, label, n]) => ({
              value, label: <>{label}<span className="tabular-nums text-muted-foreground">{n}</span></>,
            }))} />
        )}
        <NativeSelect className="h-9 w-44" value={scope} onChange={(e) => setScope(e.target.value as "year" | "month")}
          options={[{ value: "year", label: tx("ทั้งปี {0}", [yearOf(Number(year))]) }, { value: "month", label: tx("เฉพาะ{0}", [tx(TH_MONTH[first.getMonth()])]) }]} />
        <div ref={listRef} className={cn("-m-1 space-y-1.5 overflow-y-auto p-1", isBranch ? "max-h-[32rem]" : "min-h-0 flex-1")}>
          {listed.length === 0 && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{tx("ไม่มีวันหยุดในช่วงนี้")}</p>}
          {months.map(([month, items]) => (
            <div key={month} data-month={month} className="space-y-1">
              <div className="flex items-baseline gap-2 px-1 pt-2">
                <span className={cn("flex items-center gap-1.5 text-xs font-semibold", month === today.slice(0, 7) && "text-primary")}>{month === today.slice(0, 7) && <span className="size-1.5 rounded-full bg-primary" />}{tx(TH_MONTH[Number(month.slice(5)) - 1])}</span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">{tx("{0} วัน", [new Set(items.map((h) => h.date)).size])}</span>
              </div>
              {items.map((h) => {
                const isClosed = closed(h)
                const sc = scopeOf(h)
                const d = parseDate(h.date)
                return (
                  <div key={h.id} onClick={() => setAnchor(monthStart(h.date))}
                    className={cn("group/row flex cursor-pointer items-center gap-2.5 rounded-xl py-1.5 pr-2 pl-2 transition-colors hover:bg-muted/50", !isClosed && "opacity-50", h.date < today && "opacity-50")}>
                    <span className={cn("h-8 w-1 shrink-0 rounded-full", SCOPE_BAR[sc])} />
                    <span className="w-12 shrink-0 text-xs text-muted-foreground tabular-nums"><span className="block">{weekdayShort(weekdayOf(h.date))}</span><span className="block text-sm font-semibold text-foreground">{d.getDate()}</span></span>
                    <span className={cn("min-w-0 flex-1 truncate text-sm font-medium", !isClosed && "line-through")} title={h.name}>{h.name}{h.seriesId && <RepeatIcon className="ml-1 inline size-3 text-muted-foreground" aria-label={tx("ทุกปี")} />}</span>
                    {brandsOf(h).length > 0 && <span className="flex shrink-0 gap-1">{brandsOf(h).map((b) => <span key={b} className={cn("rounded px-1.5 py-0.5 text-2xs font-semibold", BRAND_CHIP[b])}>{BRAND_LABEL[b]}</span>)}</span>}
                    {isBranch && h.branchId === null ? (
                      manageBranch ? (
                        <span className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Switch checked={isClosed} aria-label={tx("สาขานี้หยุดวันนี้")} title={isClosed ? tx("หยุด") : tx("เปิดทำการ")}
                            onCheckedChange={(v) => (v ? setClosing(h) : report(act.setOpen(h.id, branch.id, true, false), tx("{0}เปิดทำการวัน{1} — คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ", [branch.name, h.name])))} />
                        </span>
                      ) : null
                    ) : canEdit(h) && (
                      // owner 2026-11-09: the edit / delete icons show only on hover
                      <span className="flex shrink-0 opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100" onClick={(e) => e.stopPropagation()}>
                        <Button size="icon-sm" variant="ghost" aria-label={tx("แก้")} onClick={() => setDraft({ id: h.id, name: h.name, date: h.date, category: h.category, brand: h.brand, seriesId: h.seriesId, repeat: 0, scope: "one" })}><PencilIcon /></Button>
                        <Button size="icon-sm" variant="ghost" aria-label={tx("ลบ")} onClick={() => (h.seriesId ? setRemoving(h) : report(act.remove(h.id), tx("ลบวันหยุดแล้ว (คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ)")))}><TrashIcon /></Button>
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {!isBranch && manageCompany && (
          <Button size="sm" variant="ghost" className="w-full" onClick={() => report(act.loadThai(), (v) => (v.added ? tx("เพิ่มวันหยุดไทยตัวอย่าง {0} วัน", [v.added]) : tx("มีวันหยุดไทยตัวอย่างครบแล้ว")))}>
            <PlusIcon /> {tx("ใส่ชุดวันหยุดไทย (ตัวอย่าง · 13 วัน/ปี)")}
          </Button>
        )}
      </section>

      <section className={cn("rounded-3xl bg-card p-3 shadow-sm ring-1 ring-foreground/5", !isBranch && "flex min-h-0 flex-col")}>
        <div className="mb-2 flex items-center gap-2">
          <Button size="icon-sm" variant="outline" aria-label={tx("เดือนก่อน")} onClick={() => setAnchor(shiftMonth(anchor, -1))}><ChevronLeftIcon /></Button>
          <span className="min-w-36 text-center font-medium">{tx(TH_MONTH[first.getMonth()])} {yearOf(first.getFullYear())}</span>
          <Button size="icon-sm" variant="outline" aria-label={tx("เดือนถัดไป")} onClick={() => setAnchor(shiftMonth(anchor, 1))}><ChevronRightIcon /></Button>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setAnchor(monthStart(today))}>{tx("วันนี้")}</Button>
        </div>
        {periods.length > 0 && (
          <div className="mb-2 space-y-1">
            {periods.map((p) => <PeriodBanner key={p.id} period={p} />)}
          </div>
        )}
        <div className={cn("grid grid-cols-7 overflow-hidden rounded-2xl border text-sm", !isBranch && "min-h-0 flex-1")} style={isBranch ? undefined : { gridTemplateRows: `auto repeat(${rows.length / 7}, minmax(0, 1fr))` }}>
          {DOW.map((d) => <div key={d} className="border-b bg-muted/40 py-1.5 text-center text-xs text-muted-foreground">{weekdayShort((DOW.indexOf(d) + 1) % 7)}</div>)}
          {rows.map((d) => {
            const inMonth = parseDate(d).getMonth() === first.getMonth()
            const hs = visible.filter((h) => h.date === d)
            const shut = hs.some(closed)
            const sc = dayScope(hs.filter(closed))
            const canAdd = (isBranch ? manageBranch : manageCompany) && inMonth && !hs.some((h) => (isBranch ? h.branchId === branch.id : h.branchId === null))
            const n = isBranch ? sessions.filter((s) => !s.cancelled && s.date === d && s.branchId === branch.id).length : 0
            const sp = periodOf(d)
            return (
              <div key={d} className={cn("group relative min-h-20 border-r border-b p-1.5 [&:nth-child(7n)]:border-r-0", !inMonth && "bg-muted/20 text-muted-foreground/50", sp && inMonth && "bg-warning-soft/50", shut && inMonth && SCOPE_BG[sc], d === today && "ring-2 ring-primary ring-inset")}>
                {sp && <span className="absolute inset-x-0 top-0 h-1 bg-warning" />}
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs", shut && cn("font-semibold", SCOPE_TEXT[sc]))}>{parseDate(d).getDate()}</span>
                  {n > 0 && inMonth && <span className="text-2xs text-muted-foreground">{n}  {tx("คาบ")}</span>}
                </div>
                {sp && inMonth && (d === sp.from || parseDate(d).getDate() === 1 || weekdayOf(d) === 1) && <p className="truncate text-2xs font-medium text-warning">☀ {sp.name}</p>}
                {hs.map((h) => (
                  <p key={h.id} className={cn("mt-0.5 truncate text-2xs", closed(h) ? SCOPE_TEXT[scopeOf(h)] : "text-muted-foreground line-through")} title={`${h.name} · ${tx(HOLIDAY_CATEGORY_LABEL[h.category])}`}>{h.name}</p>
                ))}
                {canAdd && (
                  <Button variant="ghost" size="inline" onClick={() => openAdd(d)} className="absolute inset-x-1.5 bottom-1.5 hidden items-center justify-center gap-1 rounded-lg border border-dashed border-primary/40 py-0.5 text-2xs text-primary group-hover:flex">
                    <PlusIcon className="size-3" />  {tx("เพิ่ม")}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
        <p className="mt-2 flex flex-wrap gap-3 text-2xs text-muted-foreground">
          {!isBranch && <>
            {/* eslint-disable-next-line no-restricted-syntax -- ds-exception: holiday-brand legend swatch (identity) */}
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-sky-200" />{BRAND_LABEL.nockacademy}</span>
            {/* eslint-disable-next-line no-restricted-syntax -- ds-exception: holiday-brand legend swatch (tags.ts holidayBrand) */}
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-violet-200" />{BRAND_LABEL.liclass}</span>
            {/* eslint-disable-next-line no-restricted-syntax -- ds-exception: holiday-brand legend swatch (tags.ts holidayBrand) */}
            <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-indigo-200" />{BRAND_LABEL.nockacademy} + {BRAND_LABEL.liclass}</span>
          </>}
          {/* eslint-disable-next-line no-restricted-syntax -- ds-exception: holiday-brand legend swatch (tags.ts holidayBrand) */}
          {isBranch && <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-indigo-200" />  {tx("หยุด")}</span>}
          {isBranch && <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-warning/60" />  {tx("ช่วงเวลาพิเศษ")}</span>}
          {isBranch && <span className="line-through">{tx("ชื่อขีดฆ่า = วันหยุดบริษัทที่สาขานี้เปิดทำการ")}</span>}
          <span>{tx("เอาเมาส์ชี้ช่องว่างเพื่อเพิ่มวันหยุด")}</span>
        </p>
      </section>

      {draft && (
        <HolidayDialog draft={draft} branch={branch} onClose={() => setDraft(null)}
          onSave={(d, cancel) => {
            const ok = d.id
              ? report(act.update(d.id, { name: d.name, date: d.date, category: d.category, brand: d.brand }, d.scope), tx("แก้วันหยุดแล้ว"))
              : report(act.add({ name: d.name, date: d.date, category: d.category, branchId: branch?.id ?? null, ...(d.brand && !branch ? { brand: d.brand } : {}) }, cancel, d.repeat),
                (v) => tx("เพิ่มวันหยุดแล้ว{0}", [(v.created > 1 ? tx(" · ตั้งไว้ {0} ปี", [v.created]) : "") + (v.affected ? tx(" · {0} {1} คาบ", [cancel ? tx("ยกเลิก") : tx("กระทบ"), v.affected]) : "")]))
            if (ok) setDraft(null)
            return ok
          }} />
      )}
      {removing && (
        <Dialog open onOpenChange={(o) => !o && setRemoving(null)}>
          <DialogContent className="lg:max-w-sm">
            <DialogHeader>
              <DialogTitle>{tx("ลบวันหยุด {0}", [removing.name])}</DialogTitle>
              <DialogDescription>{tx("เป็นวันหยุดประจำปี — ตั้งไว้หลายปี เลือกว่าจะลบแค่ปีนี้หรือทุกปีต่อจากนี้")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setRemoving(null)}>{tx("ยกเลิก")}</Button>
              <Button variant="outline" onClick={() => { if (report(act.remove(removing.id, "one"), tx("ลบวันหยุดแล้ว (คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ)"))) setRemoving(null) }}>{tx("ลบเฉพาะ {0}", [fmtDate(removing.date, { year: true })])}</Button>
              <Button variant="destructive" onClick={() => { if (report(act.remove(removing.id, "series"), tx("ลบวันหยุดแล้ว (คาบที่ยกเลิกไปแล้วไม่ถูกคืนอัตโนมัติ)"))) setRemoving(null) }}>{tx("ลบทุกปีต่อจากนี้")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {closing && branch && (
        <CloseDayDialog holiday={closing} branch={branch} affected={holidayImpact(closing.date, branch.id, sessions)} onClose={() => setClosing(null)}
          onConfirm={(cancel) => { const ok = report(act.setOpen(closing.id, branch.id, false, cancel), tx("{0}หยุดวัน{1}แล้ว", [branch.name, closing.name])); if (ok) setClosing(null); return ok }} />
      )}
    </div>
  )
}

type ParentMsg = { on: boolean; text: string }

/** A10 (owner 2026-10-09): Admin chooses whether to tell parents — off by default, message can be edited */
function ParentNotice({ chats, msg, setMsg }: { chats: number; msg: ParentMsg; setMsg: (m: ParentMsg) => void }) {
  if (!chats) return null
  return (
    <div className="mt-2 space-y-1.5 border-t border-warning/30 pt-2">
      <label className="flex items-center gap-2"><Checkbox checked={msg.on} onCheckedChange={(v) => setMsg({ ...msg, on: !!v })} />  {tx("แจ้งผู้ปกครอง {0} ครอบครัวทางแชท", [chats])}</label>
      {msg.on && <Textarea rows={3} className="bg-background text-sm" value={msg.text} onChange={(e) => setMsg({ ...msg, text: e.target.value })} />}
    </div>
  )
}

/** `build` = the unedited default for a brand — each family gets it in ITS brand's language (Liclass: Japanese + English,
 *  NockAcademy: Thai + English); text the admin edited goes out as typed, to everyone */
async function sendParentNotice(chatIds: string[], msg: ParentMsg, build?: (brand: Brand) => string) {
  if (!msg.on || !chatIds.length) return
  const st = useStore.getState()
  const brandOf = (convId: string) => st.branches.find((b) => b.id === st.conversations.find((c) => c.id === convId)?.branchId)?.brand ?? "nockacademy"
  const r = msg.text.trim() || !build
    ? await broadcastText(chatIds, msg.text || (build ? build("nockacademy") : ""))
    : await broadcastTexts(chatIds.map((id) => ({ id, text: build(brandOf(id)) })))
  if (r.ok) toast.success(tx("แจ้งผู้ปกครองแล้ว {0} ครอบครัว{1}", [r.value.sent, r.value.failed ? tx(" · ไม่สำเร็จ {0}", [r.value.failed]) : ""]))
  else toast.error(r.error)
}

function HolidayDialog({ draft, branch, onClose, onSave }: { draft: Draft; branch?: Branch; onClose: () => void; onSave: (d: Draft, cancel: boolean) => boolean }) {
  const sessions = useStore((s) => s.sessions)
  const [d, setD] = useState(draft)
  const [cancel, setCancel] = useState(true)
  const affected = !d.id && d.date ? holidayImpact(d.date, branch?.id ?? null, sessions, [], d.brand) : []
  const chats = familyChatsOf(affected)
  const [msg, setMsg] = useState<ParentMsg>({ on: false, text: "" })
  const draftOf = (b: Brand) => holidayParentText(b, d.name || "…", d.date || toDateStr(new Date()), cancel)
  const text = msg.text || draftOf(branch?.brand ?? d.brand ?? "nockacademy")
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{d.id ? tx("แก้วันหยุด") : branch ? tx("เพิ่มวันหยุดของสาขา{0}", [branch.name]) : tx("เพิ่มวันหยุดบริษัท")}</DialogTitle>
          <DialogDescription>{branch ? tx("มีผลเฉพาะสาขานี้") : tx("มีผลกับทุกสาขา — สาขาเลือกเปิดทำการเองได้ที่หน้าสาขา")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={tx("ชื่อวันหยุด *")} className="sm:col-span-2"><Input autoFocus value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} placeholder={tx("เช่น วันสงกรานต์")} /></Field>
          <Field label={tx("วันที่ *")}><Input type="date" value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></Field>
          <Field label={tx("ประเภท")}>
            {branch ? <Input value={HOLIDAY_CATEGORY_LABEL.branch} disabled /> : (
              <NativeSelect value={d.category} onChange={(e) => setD({ ...d, category: e.target.value as HolidayCategory })}
                options={(["traditional", "company"] as HolidayCategory[]).map((c) => ({ value: c, label: tx(HOLIDAY_CATEGORY_LABEL[c]) }))} />
            )}
          </Field>
        </div>
        {/* owner 2026-11-09: which brand it closes, and the "every year" default laid out several years ahead */}
        {!branch && (
          <Field label={tx("แบรนด์ที่หยุด")}>
            <NativeSelect value={d.brand ?? ""} onChange={(e) => setD({ ...d, brand: (e.target.value || undefined) as Brand | undefined })}
              options={[{ value: "", label: `${BRAND_LABEL.nockacademy} + ${BRAND_LABEL.liclass}` }, { value: "nockacademy", label: BRAND_LABEL.nockacademy }, { value: "liclass", label: BRAND_LABEL.liclass }]} />
          </Field>
        )}
        {!d.id ? (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-muted/50 p-3">
            <Switch checked={d.repeat > 0} onCheckedChange={(v) => setD({ ...d, repeat: v ? DEFAULT_REPEAT : 0 })} aria-label={tx("ซ้ำทุกปี")} />
            <span className="flex-1 text-sm font-medium">{tx("ซ้ำทุกปี (วันที่เดิม)")}<InfoTip className="ml-1" text={tx("ใช้กับวันหยุดที่ตรงวันเดิมทุกปี เช่น วันแม่ ปีใหม่ — ตั้งครั้งเดียวไว้หลายปี วันหยุดที่เปลี่ยนตามปี (วันพระใหญ่ วันหยุดชดเชย) ให้เพิ่มทีละปีเมื่อประกาศ")} /></span>
            {d.repeat > 0 && <NativeSelect className="w-36" value={String(d.repeat)} onChange={(e) => setD({ ...d, repeat: Number(e.target.value) })} options={[1, 2, 3, 5, 10].map((n) => ({ value: String(n), label: tx("ไปอีก {0} ปี", [n]) }))} />}
          </div>
        ) : d.seriesId ? (
          <Field label={tx("แก้ชื่อ / ประเภท / แบรนด์ของ")}>
            <NativeSelect value={d.scope} onChange={(e) => setD({ ...d, scope: e.target.value as "one" | "series" })} options={[{ value: "one", label: tx("เฉพาะวันนี้") }, { value: "series", label: tx("ทุกปีในชุดนี้") }]} />
          </Field>
        ) : null}
        {affected.length > 0 && (
          <div className="rounded-md bg-warning-soft/60 p-2 text-sm text-warning-ink">
            
            {tx("วันนั้นมี")} <b>{affected.length}  {tx("คาบ")}</b>{branch ? "" : tx(" (ทุกสาขา)")}  {tx("· นักเรียน")} {affected.reduce((n, s) => n + s.studentIds.length, 0)}  {tx("คน")}
            <label className="mt-1 flex items-center gap-2"><Checkbox checked={cancel} onCheckedChange={(v) => setCancel(!!v)} />  {tx("ยกเลิกคาบเหล่านี้ + แจ้งทีมให้ติดต่อผู้ปกครอง/นัดชดเชย")}</label>
            <ParentNotice chats={chats.length} msg={{ ...msg, text }} setMsg={setMsg} />
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button disabled={!d.name.trim() || !d.date} onClick={() => { if (onSave(d, cancel)) void sendParentNotice(chats, msg, draftOf) }}>{d.id ? tx("บันทึก") : tx("เพิ่มวันหยุด")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CloseDayDialog({ holiday, branch, affected: list, onClose, onConfirm }: { holiday: Holiday; branch: Branch; affected: { studentIds: string[] }[]; onClose: () => void; onConfirm: (cancel: boolean) => boolean }) {
  const [cancel, setCancel] = useState(true)
  const affected = list.length
  const chats = familyChatsOf(list)
  const [msg, setMsg] = useState<ParentMsg>({ on: false, text: "" })
  const draftOf = (b: Brand) => holidayParentText(b, holiday.name, holiday.date, cancel)
  const text = msg.text || draftOf(branch.brand)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>{tx("สาขา")}{branch.name}{tx("หยุดวัน")}{holiday.name}?</DialogTitle>
          <DialogDescription>{fmtDate(holiday.date, { weekday: true, year: true })}</DialogDescription>
        </DialogHeader>
        {affected > 0 ? (
          <div className="rounded-md bg-warning-soft/60 p-2 text-sm text-warning-ink">
            
            {tx("วันนั้นสาขานี้มี")} <b>{affected}  {tx("คาบ")}</b>
            <label className="mt-1 flex items-center gap-2"><Checkbox checked={cancel} onCheckedChange={(v) => setCancel(!!v)} />  {tx("ยกเลิกคาบเหล่านี้ + แจ้งทีม")}</label>
            <ParentNotice chats={chats.length} msg={{ ...msg, text }} setMsg={setMsg} />
          </div>
        ) : <p className="text-sm text-muted-foreground">{tx("วันนั้นสาขานี้ไม่มีคาบ")}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button onClick={() => { if (onConfirm(cancel)) void sendParentNotice(chats, msg, draftOf) }}>{tx("ยืนยันหยุด")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
