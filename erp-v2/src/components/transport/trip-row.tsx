"use client"

// One trip as a row of the week table (owner 2026-10-19 Bus Route ref): van · time (+late) · passengers · zone · driver ·
// trip type · branch · status · ⋯ — open it for the stops: order · child (+Parent) · grade · home · P/D · est. / actual
// time · stop status. "แก้ไข" turns on drag-to-reorder and ✕ remove; "+ เพิ่มผู้โดยสาร" adds a child for the day.
import { useState } from "react"
import { ArrowRightLeftIcon, BanIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, CopyIcon, EllipsisIcon, GripVerticalIcon, MapIcon, MapPinIcon, MapPinOffIcon, PencilIcon, PlusIcon, RotateCcwIcon, SendIcon, TrashIcon, UserCogIcon, UserIcon, UserMinusIcon, XIcon } from "lucide-react"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { TripPlan } from "@/domain/rules/transport"
import type { Branch } from "@/domain/types"
import { driverAppUrl } from "@/lib/driver"
import { report } from "@/lib/feedback"
import { nm } from "@/lib/i18n"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { DriverCell, KIND_LABEL, StopStatusChip, TripStatusChip, TripTypeChip, VanBadge, ZoneChip } from "./labels"
import { AddRiderDialog, DayCrewDialog, ExtraTripDialog, TripCancelDialog, TripTimeDialog } from "./trip-dialogs"
import { TripSheet } from "./trip-sheet"

/** the week table's columns — header and rows share them */
export const TRIP_COLS = "grid-cols-[2rem_minmax(9rem,1.1fr)_minmax(8rem,1fr)_4.5rem_3.5rem_minmax(9rem,1.3fr)_4.5rem_minmax(6rem,0.8fr)_7rem_2.5rem]"
const STOP_COLS = "grid-cols-[2rem_minmax(10rem,1.6fr)_4.5rem_3.5rem_minmax(10rem,1.8fr)_4rem_6rem_6.5rem_2.5rem]"

export function TripRow({ t, branch, others, open, onToggle }: { t: TripPlan; branch: Branch; others: TripPlan[]; open: boolean; onToggle: () => void }) {
  const s = useStore()
  const [edit, setEdit] = useState(false)
  const [dlg, setDlg] = useState<null | "time" | "cancel" | "add" | "extra" | "crew" | "sheet">(null)
  const [drag, setDrag] = useState<string | null>(null)
  const staff = s.staff
  const vIndex = Math.max(0, (branch.vehicles ?? []).findIndex((v) => v.id === t.vehicle?.id))
  const zones = branch.busZones ?? []
  const zone = zones.find((z) => z.id === t.zoneIds[0])
  const keys = t.stops.map((x) => x.key)
  const send = () => report(s.sendTrips([{ roundId: t.round.id, date: t.date, key: t.key, driverId: t.driver?.id }]), `อนุมัติ & ส่งให้${t.driver?.nickname ?? "คนขับ"}แล้ว`)
  const reorder = (from: string, to: string) => {
    if (from === to) return
    const next = keys.filter((k) => k !== from)
    next.splice(next.indexOf(to) + (keys.indexOf(from) < keys.indexOf(to) ? 1 : 0), 0, from)
    report(s.setTripOrder(t.round.id, t.date, next), "สลับลำดับแล้ว — เวลาแต่ละจุดคำนวณใหม่")
  }
  const copyLink = async () => {
    const tok = t.driver?.id ? staff.find((x) => x.id === t.driver!.id)?.driverToken : undefined
    if (!tok) return toast.info("ลิงก์แอปคนขับจะสร้างเมื่ออนุมัติ & ส่งเที่ยวแรกให้คนขับคนนี้")
    try { await navigator.clipboard.writeText(driverAppUrl(tok)); toast.success(`คัดลอกลิงก์แอปของ${t.driver!.nickname}แล้ว — ส่งใน LINE ได้เลย`) } catch { toast.error("คัดลอกไม่ได้") }
  }
  const cancelled = t.status === "cancelled"
  const late = t.late && t.late > 0 ? t.late : null
  return (
    <div className={cn("overflow-hidden rounded-2xl ring-1 ring-foreground/5", open && "ring-primary/30 shadow-sm", t.status === "otw" && "ring-red-300", cancelled && "opacity-60")}>
      <div role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()}
        className={cn("grid cursor-pointer items-center gap-3 px-3 py-2.5 text-sm", TRIP_COLS, open ? "bg-primary/5" : "bg-card hover:bg-muted/40")}>
        <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">{open ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}</span>
        {t.vehicle ? <VanBadge index={vIndex} name={t.vehicle.name} plate={t.vehicle.plate} /> : <span className="text-xs text-amber-700">ยังไม่ได้เลือกรถ</span>}
        <span className="min-w-0">
          <span className="block font-medium tabular-nums">{`${t.depart} → ${t.finish}`}</span>
          <span className="block truncate text-xs text-muted-foreground">{`${t.minutes} นาที`}{late && <span className="font-medium text-red-600">{` +${late}`}</span>}{t.round.name ? ` · ${t.round.name}` : ""}{t.extra ? " · เที่ยวพิเศษ" : ""}{t.timeChanged ? " · เวลาเปลี่ยนวันนี้" : ""}</span>
        </span>
        <span className={cn("flex items-center gap-1 tabular-nums", t.used > t.seats && "font-semibold text-red-700")}><UserIcon className="size-3.5 text-muted-foreground" />{`${t.used}/${t.seats}`}</span>
        <ZoneChip zone={zone} index={zones.indexOf(zone!)} />
        <DriverCell d={t.driver} changed={t.driverChanged} />
        <TripTypeChip kind={t.round.kind} short />
        <span className="min-w-0"><span className="block truncate">{nm(branch.name)}</span><span className="block text-xs text-muted-foreground">{branch.province}</span></span>
        <span className="flex justify-end"><TripStatusChip t={t} /></span>
        <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
          <TripMenu t={t} onDlg={setDlg} onSend={send} onCopyLink={copyLink} />
        </span>
      </div>

      {open && (
        <div className="border-t bg-card">
          {t.warnings.length > 0 && !cancelled && <p className="mx-3 mt-2 rounded-xl bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{t.warnings.join(" · ")}</p>}
          {cancelled ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">{`ยกเลิกวันนี้ — ${t.state?.cancelled?.reason ?? ""} · เด็กของเที่ยวนี้อยู่ใน "ต้องตัดสินใจ" ของวันนี้`}</p>
          ) : <>
            <div className={cn("grid items-center gap-3 border-b px-3 py-2 text-xs text-muted-foreground", STOP_COLS)}>
              <span>ลำดับ</span><span>นักเรียน</span><span /><span className="text-center">ชั้น</span><span>ที่อยู่</span><span>P/D</span><span>ประมาณ / จริง</span><span className="text-right">สถานะ</span><span />
            </div>
            {t.stops.length === 0 && <p className="px-4 py-5 text-center text-sm text-muted-foreground">ไม่มีใครนั่งเที่ยวนี้</p>}
            {t.stops.map((x, i) => (
              <div key={x.key} draggable={edit} onDragStart={() => setDrag(x.key)} onDragOver={(e) => edit && e.preventDefault()} onDrop={() => { if (drag) reorder(drag, x.key); setDrag(null) }}
                className={cn("grid items-center gap-3 border-b px-3 py-2 text-sm last:border-0", STOP_COLS, x.status === "otw" && "bg-primary/5", drag === x.key && "opacity-50")}>
                {edit ? <GripVerticalIcon className="size-4 cursor-grab text-muted-foreground" /> : <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", x.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary")}>{i + 1}</span>}
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{x.rider.nickname.slice(0, 1)}</span>
                  <span className="min-w-0"><span className="block truncate font-medium">{x.rider.nickname}</span><span className="block truncate text-xs text-muted-foreground">{x.rider.name}</span></span>
                </span>
                <span>{x.rider.adult && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700"><UserIcon className="size-3" />+ผู้ปกครอง</span>}</span>
                <span className="text-center"><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", gradeTone(x.rider.grade))}>{x.rider.grade}</span></span>
                <span className="min-w-0 text-xs">
                  {x.rider.loc ? <><span className="flex items-center gap-1 truncate text-sm"><MapPinIcon className="size-3 shrink-0 text-muted-foreground" />{x.rider.addressNote ?? x.rider.familyName}</span><span className="block truncate text-muted-foreground">{[x.rider.address, x.km !== null && `${x.km} กม.`].filter(Boolean).join(" · ")}</span></>
                    : <span className="inline-flex items-center gap-1 text-amber-700"><MapPinOffIcon className="size-3" />ยังไม่ปักหมุดบ้าน</span>}
                </span>
                <TripTypeChip kind={x.rider.leg} short />
                <span className="text-xs tabular-nums">
                  <span className="flex items-center gap-1 text-sm"><ClockIcon className="size-3 text-muted-foreground" />{x.eta ?? "—"}</span>
                  {x.actual && <span className={cn("block", x.late && x.late > 0 ? "text-red-600" : "text-emerald-700")}>{x.actual}{x.late && x.late > 0 ? ` (+${x.late} นาที)` : ""}</span>}
                </span>
                <span className="flex justify-end"><StopStatusChip s={x.status} /></span>
                <span>
                  {edit ? <Button size="icon-sm" variant="ghost" aria-label="เอาออก" onClick={() => report(s.removeRiderFromTrip(t.round.id, t.date, x.rider.studentId, x.rider.leg), `เอา${x.rider.nickname}ออกจากเที่ยวนี้แล้ว`)}><XIcon /></Button> : (
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="จัดการ" />}><EllipsisIcon /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {others.filter((o) => o.round.id !== t.round.id && (o.round.kind === x.rider.leg || o.round.kind === "both") && o.status !== "cancelled").length > 0 && (
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger><ArrowRightLeftIcon /> ย้ายไปเที่ยวอื่น</DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                              <DropdownMenuGroup>
                                <DropdownMenuLabel>{x.rider.leg === "pickup" ? "เที่ยวที่รับได้" : "เที่ยวที่ส่งได้"}</DropdownMenuLabel>
                                {others.filter((o) => o.round.id !== t.round.id && (o.round.kind === x.rider.leg || o.round.kind === "both") && o.status !== "cancelled").map((o) => (
                                  <DropdownMenuItem key={o.id} onClick={() => report(s.moveRider(t.date, x.rider.studentId, o.round.id), `ย้าย${x.rider.nickname}แล้ว`)}>{`${KIND_LABEL[o.round.kind]} ${o.round.time} · ${o.vehicle?.name ?? ""} · ${o.used}/${o.seats}`}</DropdownMenuItem>
                                ))}
                              </DropdownMenuGroup>
                            </DropdownMenuSubContent>
                          </DropdownMenuSub>
                        )}
                        {x.rider.adult
                          ? <DropdownMenuItem onClick={() => report(s.setCompanion(x.rider.studentId, t.date, false), "ผู้ปกครองไม่ไปแล้ว")}><XIcon /> ผู้ปกครองไม่ไปแล้ว</DropdownMenuItem>
                          : <DropdownMenuItem onClick={() => report(s.setCompanion(x.rider.studentId, t.date, true), "ผู้ปกครองนั่งไปด้วยแล้ว (+1 ที่นั่ง)")}><UserIcon /> ผู้ปกครองไปด้วย</DropdownMenuItem>}
                        {x.rider.loc && <DropdownMenuItem render={<a href={`https://www.google.com/maps?q=${x.rider.loc.lat},${x.rider.loc.lng}`} target="_blank" rel="noreferrer" />}><MapIcon /> เปิดแผนที่บ้าน</DropdownMenuItem>}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={() => report(s.removeRiderFromTrip(t.round.id, t.date, x.rider.studentId, x.rider.leg), `เอา${x.rider.nickname}ออกจากเที่ยวนี้แล้ว`)}><UserMinusIcon /> เอาออกจากเที่ยวนี้</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </span>
              </div>
            ))}
            {/* children taken off this trip that day — faded, as in the ref */}
            {t.cancelled.map((r) => (
              <div key={`${r.studentId}|${r.leg}|x`} className={cn("grid items-center gap-3 border-b px-3 py-2 text-sm opacity-50 last:border-0", STOP_COLS)}>
                <span className="text-center text-xs">—</span>
                <span className="min-w-0"><span className="block truncate font-medium line-through">{r.nickname}</span><span className="block truncate text-xs">{r.name}</span></span>
                <span /><span className="text-center text-xs">{r.grade}</span><span className="truncate text-xs">{r.addressNote ?? ""}</span><TripTypeChip kind={r.leg} short /><span />
                <span className="flex justify-end"><StopStatusChip s="cancel" /></span><span />
              </div>
            ))}
          </>}
          <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            <TripMenu t={t} onDlg={setDlg} onSend={send} onCopyLink={copyLink} />
            {!cancelled && <Button size="sm" variant="outline" onClick={() => setDlg("add")}><PlusIcon /> เพิ่มผู้โดยสาร</Button>}
            {!cancelled && <Button size="sm" variant="ghost" onClick={() => setDlg("sheet")} disabled={!t.stops.length}><MapIcon /> แผนที่ & ใบงาน</Button>}
            <span className="ml-auto flex gap-2">
              {!cancelled && t.stops.length > 1 && <Button size="sm" variant={edit ? "default" : "outline"} onClick={() => setEdit(!edit)}><PencilIcon /> {edit ? "เสร็จ" : "แก้ไข"}</Button>}
              {!cancelled && t.stops.length > 0 && (t.status === "draft" || t.status === "changed" || t.status === "scheduled") && <Button size="sm" onClick={send}><SendIcon /> {t.status === "changed" ? "ส่งใหม่" : "อนุมัติ & ส่ง"}</Button>}
            </span>
          </div>
        </div>
      )}
      {dlg === "time" && <TripTimeDialog t={t} onClose={() => setDlg(null)} />}
      {dlg === "cancel" && <TripCancelDialog t={t} onClose={() => setDlg(null)} />}
      {dlg === "add" && <AddRiderDialog t={t} branch={branch} onClose={() => setDlg(null)} />}
      {dlg === "extra" && <ExtraTripDialog branch={branch} date={t.date} trip={t.state} onClose={() => setDlg(null)} />}
      {dlg === "crew" && <DayCrewDialog t={t} branch={branch} onClose={() => setDlg(null)} />}
      {dlg === "sheet" && <TripSheet t={t} branch={branch} onClose={() => setDlg(null)} />}
    </div>
  )
}

function TripMenu({ t, onDlg, onSend, onCopyLink }: { t: TripPlan; onDlg: (d: "time" | "cancel" | "add" | "extra" | "crew" | "sheet") => void; onSend: () => void; onCopyLink: () => void }) {
  const restore = useStore((s) => s.restoreTrip)
  const del = useStore((s) => s.deleteExtraTrip)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="จัดการเที่ยวนี้" />}><EllipsisIcon /></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        {t.status === "cancelled" ? <DropdownMenuItem onClick={() => report(restore(t.round.id, t.date), "กู้คืนเที่ยวนี้แล้ว")}><RotateCcwIcon /> กู้คืนเที่ยวนี้</DropdownMenuItem> : <>
          {t.stops.length > 0 && <DropdownMenuItem onClick={onSend}><SendIcon /> {t.status === "sent" || t.status === "otw" || t.status === "done" ? "ส่งให้คนขับอีกครั้ง" : "อนุมัติ & ส่งให้คนขับ"}</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => onDlg("sheet")}><MapIcon /> แผนที่ & ใบงานคนขับ</DropdownMenuItem>
          <DropdownMenuItem onClick={onCopyLink}><CopyIcon /> คัดลอกลิงก์แอปคนขับ</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onDlg("add")}><PlusIcon /> เพิ่มผู้โดยสาร</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDlg("crew")}><UserCogIcon /> เปลี่ยนรถ / คนขับวันนี้</DropdownMenuItem>
          {t.extra ? <DropdownMenuItem onClick={() => onDlg("extra")}><PencilIcon /> แก้เที่ยวพิเศษ</DropdownMenuItem> : <DropdownMenuItem onClick={() => onDlg("time")}><ClockIcon /> เปลี่ยนเวลาเฉพาะวันนี้</DropdownMenuItem>}
          <DropdownMenuSeparator />
          {t.extra ? <DropdownMenuItem variant="destructive" onClick={() => report(del(t.round.id, t.date), "ลบเที่ยวพิเศษแล้ว")}><TrashIcon /> ลบเที่ยวพิเศษ</DropdownMenuItem>
            : <DropdownMenuItem variant="destructive" onClick={() => onDlg("cancel")}><BanIcon /> ยกเลิกเที่ยวนี้วันนี้</DropdownMenuItem>}
        </>}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
