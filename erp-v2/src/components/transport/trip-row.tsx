"use client"

// One trip as a row of the week table — the standard DataTable (owner 2026-10-19 Bus Route ref + "Table ในรูปแบบที่เราทำกันไว้"):
// van · time (+late) · passengers · zone · driver · trip type · branch · status · ⋯ — open it for the stops: order · child (+Parent) · grade · home · P/D · est. / actual
// time · stop status. "แก้ไข" turns on drag-to-reorder and ✕ remove; "+ เพิ่มผู้โดยสาร" adds a child for the day.
import { useState } from "react"
import { ArrowRightLeftIcon, BanIcon, ChevronDownIcon, ChevronUpIcon, ClockIcon, CopyIcon, EllipsisIcon, GripVerticalIcon, MapIcon, MapPinIcon, MapPinOffIcon, PencilIcon, PlusIcon, RotateCcwIcon, SendIcon, TrashIcon, UserCogIcon, UserIcon, UserMinusIcon, XIcon } from "lucide-react"
import { type Column } from "@/components/app/data-grid"
import { HEAD } from "@/components/app/data-table"
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

/** a trip with the branch and day it belongs to — one row of the week table */
export interface TripRowData { branch: Branch; plan: { trips: TripPlan[] }; trip: TripPlan }

/** the week table's columns (owner 2026-10-19: the standard DataTable — arrange / lock / hide like every list) */
export function tripColumns(isOpen: (id: string) => boolean): Column<TripRowData>[] {
  return [
    { id: "open", label: "", width: "44px", required: true, cell: ({ trip: t }) => <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground">{isOpen(t.id) ? <ChevronUpIcon className="size-4" /> : <ChevronDownIcon className="size-4" />}</span> },
    { id: "van", label: "รถ", width: "150px", required: true, cell: ({ trip: t, branch }) => t.vehicle ? <VanBadge index={Math.max(0, (branch.vehicles ?? []).findIndex((v) => v.id === t.vehicle?.id))} name={t.vehicle.name} plate={t.vehicle.plate} /> : <span className="text-xs text-amber-700">ยังไม่ได้เลือกรถ</span> },
    { id: "time", label: "เวลาเที่ยว", width: "150px", cell: ({ trip: t }) => {
      const late = t.late && t.late > 0 ? t.late : null
      return (
        <span className="block">
          <span className="block font-medium tabular-nums">{`${t.depart} → ${t.finish}`}</span>
          <span className="block text-xs text-muted-foreground">{`${t.minutes} นาที`}{late && <span className="font-medium text-red-600">{` +${late}`}</span>}{t.round.name ? ` · ${t.round.name}` : ""}{t.extra ? " · เที่ยวพิเศษ" : ""}{t.timeChanged ? " · เวลาเปลี่ยนวันนี้" : ""}</span>
        </span>
      )
    } },
    { id: "pax", label: "ผู้โดยสาร", width: "90px", cell: ({ trip: t }) => <span className={cn("flex items-center gap-1 tabular-nums", t.used > t.seats && "font-semibold text-red-700")}><UserIcon className="size-3.5 text-muted-foreground" />{`${t.used}/${t.seats}`}</span> },
    { id: "zone", label: "โซน", width: "64px", cell: ({ trip: t, branch }) => { const zones = branch.busZones ?? []; const zone = zones.find((z) => z.id === t.zoneIds[0]); return <ZoneChip zone={zone} index={zones.indexOf(zone!)} /> } },
    { id: "driver", label: "คนขับ", width: "170px", cell: ({ trip: t }) => <DriverCell d={t.driver} changed={t.driverChanged} /> },
    { id: "type", label: "ประเภท", width: "80px", cell: ({ trip: t }) => <TripTypeChip kind={t.round.kind} short /> },
    { id: "branch", label: "สาขา", width: "110px", cell: ({ branch }) => <span className="block"><span className="block">{nm(branch.name)}</span><span className="block text-xs text-muted-foreground">{branch.province}</span></span> },
    { id: "status", label: "สถานะ", width: "120px", align: "right", cell: ({ trip: t }) => <TripStatusChip t={t} /> },
    { id: "menu", label: "", width: "48px", required: true, cell: (r) => <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}><TripActions r={r} /></span> },
  ]
}

/** the trip's actions + their dialogs */
function useTripActions({ trip: t, branch }: TripRowData) {
  const s = useStore()
  const [dlg, setDlg] = useState<null | "time" | "cancel" | "add" | "extra" | "crew" | "sheet">(null)
  const send = () => report(s.sendTrips([{ roundId: t.round.id, date: t.date, key: t.key, driverId: t.driver?.id }]), `อนุมัติ & ส่งให้${t.driver?.nickname ?? "คนขับ"}แล้ว`)
  const copyLink = async () => {
    const tok = t.driver?.id ? s.staff.find((x) => x.id === t.driver!.id)?.driverToken : undefined
    if (!tok) return toast.info("ลิงก์แอปคนขับจะสร้างเมื่ออนุมัติ & ส่งเที่ยวแรกให้คนขับคนนี้")
    try { await navigator.clipboard.writeText(driverAppUrl(tok)); toast.success(`คัดลอกลิงก์แอปของ${t.driver!.nickname}แล้ว — ส่งใน LINE ได้เลย`) } catch { toast.error("คัดลอกไม่ได้") }
  }
  const dialogs = <>
    {dlg === "time" && <TripTimeDialog t={t} onClose={() => setDlg(null)} />}
    {dlg === "cancel" && <TripCancelDialog t={t} onClose={() => setDlg(null)} />}
    {dlg === "add" && <AddRiderDialog t={t} branch={branch} onClose={() => setDlg(null)} />}
    {dlg === "extra" && <ExtraTripDialog branch={branch} date={t.date} trip={t.state} onClose={() => setDlg(null)} />}
    {dlg === "crew" && <DayCrewDialog t={t} branch={branch} onClose={() => setDlg(null)} />}
    {dlg === "sheet" && <TripSheet t={t} branch={branch} onClose={() => setDlg(null)} />}
  </>
  return { setDlg, send, copyLink, dialogs }
}

function TripActions({ r }: { r: TripRowData }) {
  const a = useTripActions(r)
  return <><TripMenu t={r.trip} onDlg={a.setDlg} onSend={a.send} onCopyLink={a.copyLink} />{a.dialogs}</>
}

const STOP_TH = "px-3 py-2 text-left font-medium whitespace-nowrap"
const STOP_TD = "px-3 py-2 align-middle"

/** what opens under a trip: its stops, then the trip's buttons */
export function TripDetail({ r }: { r: TripRowData }) {
  const { trip: t, plan } = r
  const others = plan.trips
  const s = useStore()
  const a = useTripActions(r)
  const [edit, setEdit] = useState(false)
  const [drag, setDrag] = useState<string | null>(null)
  const keys = t.stops.map((x) => x.key)
  const reorder = (from: string, to: string) => {
    if (from === to) return
    const next = keys.filter((k) => k !== from)
    next.splice(next.indexOf(to) + (keys.indexOf(from) < keys.indexOf(to) ? 1 : 0), 0, from)
    report(s.setTripOrder(t.round.id, t.date, next), "สลับลำดับแล้ว — เวลาแต่ละจุดคำนวณใหม่")
  }
  const cancelled = t.status === "cancelled"
  return (
    <div className="space-y-2 bg-muted/20 px-4 py-3">
      {t.warnings.length > 0 && !cancelled && <p className="rounded-xl bg-amber-50 px-3 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{t.warnings.join(" · ")}</p>}
      {cancelled ? (
        <p className="px-4 py-6 text-center text-sm text-muted-foreground">{`ยกเลิกวันนี้ — ${t.state?.cancelled?.reason ?? ""} · เด็กของเที่ยวนี้อยู่ใน "ต้องตัดสินใจ" ของวันนี้`}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/5">
          <table className="w-full text-sm">
            <thead className={HEAD}>
              <tr><th className={cn(STOP_TH, "w-14")}>ลำดับ</th><th className={STOP_TH}>นักเรียน</th><th className={cn(STOP_TH, "text-center")}>ชั้น</th><th className={STOP_TH}>ที่อยู่</th><th className={STOP_TH}>P/D</th><th className={STOP_TH}>ประมาณ / จริง</th><th className={cn(STOP_TH, "text-right")}>สถานะ</th><th className="w-12" /></tr>
            </thead>
            <tbody>
              {t.stops.length === 0 && <tr><td colSpan={8} className="px-4 py-5 text-center text-muted-foreground">ไม่มีใครนั่งเที่ยวนี้</td></tr>}
              {t.stops.map((x, i) => (
                <tr key={x.key} draggable={edit} onDragStart={() => setDrag(x.key)} onDragOver={(e) => edit && e.preventDefault()} onDrop={() => { if (drag) reorder(drag, x.key); setDrag(null) }}
                  className={cn("border-b last:border-0", x.status === "otw" && "bg-primary/5", drag === x.key && "opacity-50")}>
                  <td className={STOP_TD}>{edit ? <GripVerticalIcon className="size-4 cursor-grab text-muted-foreground" /> : <span className={cn("grid size-6 place-items-center rounded-full text-xs font-semibold", x.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-primary/10 text-primary")}>{i + 1}</span>}</td>
                  <td className={STOP_TD}>
                    <span className="flex items-center gap-2">
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold">{x.rider.nickname.slice(0, 1)}</span>
                      <span className="min-w-0"><span className="flex items-center gap-1.5 font-medium whitespace-nowrap">{x.rider.nickname}{x.rider.adult && <span className="inline-flex items-center gap-0.5 rounded-full bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700"><UserIcon className="size-3" />+ผู้ปกครอง</span>}</span><span className="block text-xs whitespace-nowrap text-muted-foreground">{x.rider.name}</span></span>
                    </span>
                  </td>
                  <td className={cn(STOP_TD, "text-center")}><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", gradeTone(x.rider.grade))}>{x.rider.grade}</span></td>
                  <td className={cn(STOP_TD, "text-xs")}>
                    {x.rider.loc ? <><span className="flex items-center gap-1 text-sm"><MapPinIcon className="size-3 shrink-0 text-muted-foreground" />{x.rider.addressNote ?? x.rider.familyName}</span><span className="block text-muted-foreground">{[x.rider.address, x.km !== null && `${x.km} กม.`].filter(Boolean).join(" · ")}</span></>
                      : <span className="inline-flex items-center gap-1 text-amber-700"><MapPinOffIcon className="size-3" />ยังไม่ปักหมุดบ้าน</span>}
                  </td>
                  <td className={STOP_TD}><TripTypeChip kind={x.rider.leg} short /></td>
                  <td className={cn(STOP_TD, "text-xs whitespace-nowrap tabular-nums")}>
                    <span className="flex items-center gap-1 text-sm"><ClockIcon className="size-3 text-muted-foreground" />{x.eta ?? "—"}</span>
                    {x.actual && <span className={cn("block", x.late && x.late > 0 ? "text-red-600" : "text-emerald-700")}>{x.actual}{x.late && x.late > 0 ? ` (+${x.late} นาที)` : ""}</span>}
                  </td>
                  <td className={cn(STOP_TD, "text-right")}><StopStatusChip s={x.status} /></td>
                  <td className={STOP_TD}>
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
                  </td>
                </tr>
              ))}
              {/* children taken off this trip that day — faded, as in the ref */}
              {t.cancelled.map((c) => (
                <tr key={`${c.studentId}|${c.leg}|x`} className="border-b opacity-50 last:border-0">
                  <td className={cn(STOP_TD, "text-center text-xs")}>—</td>
                  <td className={STOP_TD}><span className="block font-medium line-through">{c.nickname}</span><span className="block text-xs">{c.name}</span></td>
                  <td className={cn(STOP_TD, "text-center text-xs")}>{c.grade}</td>
                  <td className={cn(STOP_TD, "text-xs")}>{c.addressNote ?? ""}</td>
                  <td className={STOP_TD}><TripTypeChip kind={c.leg} short /></td>
                  <td className={STOP_TD} />
                  <td className={cn(STOP_TD, "text-right")}><StopStatusChip s="cancel" /></td>
                  <td className={STOP_TD} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {!cancelled && <Button size="sm" variant="outline" onClick={() => a.setDlg("add")}><PlusIcon /> เพิ่มผู้โดยสาร</Button>}
        {!cancelled && <Button size="sm" variant="ghost" onClick={() => a.setDlg("sheet")} disabled={!t.stops.length}><MapIcon /> แผนที่ & ใบงาน</Button>}
        <span className="ml-auto flex gap-2">
          {!cancelled && t.stops.length > 1 && <Button size="sm" variant={edit ? "default" : "outline"} onClick={() => setEdit(!edit)}><PencilIcon /> {edit ? "เสร็จ" : "แก้ไข"}</Button>}
          {!cancelled && t.stops.length > 0 && (t.status === "draft" || t.status === "changed" || t.status === "scheduled") && <Button size="sm" onClick={a.send}><SendIcon /> {t.status === "changed" ? "ส่งใหม่" : "อนุมัติ & ส่ง"}</Button>}
        </span>
      </div>
      {a.dialogs}
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
