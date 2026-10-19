"use client"

// แจ้งลา / แจ้งลาออก from parents in LINE (owner 2026-10-14) — the office team handles each one here and the parent
// is told on LINE: a leave is recorded on the classes (หักโควตา or not), a notice to stop makes the student แจ้งออก.
import { useState } from "react"
import dynamic from "next/dynamic"
import { BusIcon, MapPinHouseIcon, UserIcon, CalendarOffIcon, CheckIcon, DoorOpenIcon, EllipsisIcon, RotateCcwIcon, XIcon } from "lucide-react"
import { Pill } from "./badges"
import { Confirmation, ConfirmationActions, ConfirmationBody, ConfirmationHeader, ConfirmationResult } from "@/components/ai-elements/confirmation"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { fmtDate, fmtDateTime, fmtMoney } from "@/domain/dates"
import { busChangeLegs, checkRide, companionLegs, distanceKm, rideTimes } from "@/domain/rules/bus"
import { compassDeg, zoneName, zoneOf } from "@/domain/rules/transport"
import { busDaysOf } from "@/domain/rules/parent-view"
import { busRate } from "@/domain/rules/settings"
import { can } from "@/domain/rules/permissions"
import * as Loss from "@/domain/rules/loss"
import type { ParentRequest } from "@/domain/types"
import { closeParentRequest, fetchParentRequests } from "@/lib/parent-requests"
import { report } from "@/lib/feedback"
import { useLookup } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { toast } from "@/lib/toast"
import { cn } from "@/lib/utils"

// the home-pin card's map — Leaflet only loads when one is on screen
const ZoneMap = dynamic(() => import("@/components/transport/zone-map").then((m) => m.ZoneMap), { ssr: false, loading: () => <div className="h-48 animate-pulse rounded-xl bg-muted" /> })

export function ParentRequestsList({ branchId, showDone }: { branchId: string; showDone?: boolean }) {
  const reqs = useStore((s) => s.parentRequests ?? [])
  const students = useStore((s) => s.students)
  const mine = reqs.filter((r) => (r.branchId ?? students.find((x) => x.id === r.studentId)?.branchId) === branchId && (showDone || r.status === "new"))
  if (!mine.length) return null
  return (
    <section className="space-y-2">
      <p className="flex items-center gap-2 text-sm font-semibold">คำขอจากผู้ปกครองทาง LINE <Pill tone="red">{mine.filter((r) => r.status === "new").length} รอจัดการ</Pill></p>
      {mine.map((r) => <RequestCard key={r.id} r={r} />)}
    </section>
  )
}

/** one request — on the Notifications page and as a card in the family's chat (owner 2026-10-14) */
/** `preview` = the example page: same card, the buttons only say what they would do */
export function RequestCard({ r, preview }: { r: ParentRequest; preview?: boolean }) {
  const me = useStore((s) => s.me())
  const sync = useStore((s) => s.syncParentRequests)
  const markLeave = useStore((s) => s.markLeave)
  const exitFromParent = useStore((s) => s.exitFromParent)
  const restoreStudent = useStore((s) => s.restoreStudent)
  const addBusAddOns = useStore((s) => s.addBusAddOns)
  const cancelBusRides = useStore((s) => s.cancelBusRides)
  const addBusCompanions = useStore((s) => s.addBusCompanions)
  const invoices = useStore((s) => s.invoices)
  const busAddOns = useStore((s) => s.busAddOns)
  const classes = useStore((s) => s.classes)
  const branches = useStore((s) => s.branches)
  const attendance = useStore((s) => s.attendance)
  const system = useStore((s) => s.system)
  const L = useLookup()
  const [busy, setBusy] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [why, setWhy] = useState("")
  const open = r.status === "new"
  const allowed = can(me, "student.manage")

  const finish = async (status: "done" | "declined", result: string, reply: string) => {
    const res = await closeParentRequest({ id: r.id, status, result, by: me.id, reply })
    if (!res.ok) { toast.error(res.error ?? "บันทึกไม่สำเร็จ"); return false }
    sync(await fetchParentRequests())
    toast.success(`${result}${res.sent ? " · แจ้งผู้ปกครองทาง LINE แล้ว" : ""}`)
    return true
  }
  const recordLeave = async (noQuota: boolean) => {
    setBusy(true)
    const done = (r.sessions ?? []).filter((x) => markLeave(x.sessionId, r.studentId, { count: 1, noQuota }).ok)
    const failed = (r.sessions?.length ?? 0) - done.length
    if (!done.length) { setBusy(false); return toast.error("บันทึกลาไม่ได้ — คาบอาจเริ่มไปแล้ว หรือถูกยกเลิก") }
    const days = done.map((x) => `${fmtDate(x.date, { weekday: true })} ${x.start}`).join(", ")
    await finish("done", `บันทึกลา ${done.length} คาบ (${noQuota ? "ไม่หักโควตา" : "หักโควตา"})${failed ? ` · ${failed} คาบบันทึกไม่ได้` : ""}`,
      `บันทึกการลาของ${r.studentNickname}แล้วค่ะ ${days} 🙏`)
    setBusy(false)
  }
  const acceptExit = async () => {
    setBusy(true)
    if (report(exitFromParent(r), "")) await finish("done", "รับเรื่องแจ้งออกแล้ว — โทรคุยกับผู้ปกครอง แล้วปิดเรื่องในหน้านักเรียน", `รับเรื่องการหยุดเรียนของ${r.studentNickname}แล้วค่ะ แอดมินจะติดต่อกลับเร็วๆ นี้ 🙏`)
    setBusy(false)
  }
  // owner 2026-10-14: a child who left wants to come back — restore them, then arrange a class + invoice as usual
  const acceptReturn = async () => {
    setBusy(true)
    if (report(restoreStudent(r.studentId), "")) await finish("done", "กู้คืนนักเรียนแล้ว — โทรคุย จัดคลาส แล้วออกใบแจ้งหนี้", `ยินดีต้อนรับ${r.studentNickname}กลับมาค่ะ 😊 แอดมินจะติดต่อกลับเพื่อจัดคลาสให้นะคะ`)
    setBusy(false)
  }
  // owner 2026-10-19: extra rides go on the student's list and onto the next invoice; cancelled ones come off the bus
  const stu = L.student(r.studentId)
  const branch = branches.find((b) => b.id === (r.branchId ?? stu?.branchId))
  const feeId = invoices.filter((i) => i.studentId === r.studentId && i.status !== "void" && i.busFeeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.busFeeId
    ?? branch?.fees.find((f) => f.kind === "bus")?.id ?? null
  const rate = branch ? busRate(branch, feeId ?? "") : 0
  const adds = busChangeLegs(r.bus ?? [], "add"), cancels = busChangeLegs(r.bus ?? [], "cancel")
  const addTrips = adds.reduce((n, x) => n + Number(x.pickup) + Number(x.dropoff), 0)
  const cancelTrips = cancels.reduce((n, x) => n + Number(x.pickup) + Number(x.dropoff), 0)
  const myClassIds = classes.filter((k) => k.studentIds.includes(r.studentId)).map((k) => k.id)
  const busCtx = { branchId: branch?.id ?? "", invoices, busAddOns, classes }
  // what the child rides now, and with the parent: every leg the child rides that day after the request
  const bookedNow = busDaysOf(r.studentId, invoices, busAddOns)
  const booked = (d: string) => bookedNow.get(d) ?? { pickup: false, dropoff: false }
  const withAdult = companionLegs(r.bus ?? [], booked)
  const approveBus = async () => {
    setBusy(true)
    const parts: string[] = [], reply: string[] = []
    // the parent's seats first — they follow the child's rides as asked (computed before the rides change)
    if (withAdult.length) {
      const p = addBusCompanions(r.studentId, withAdult, "ผู้ปกครองขอไปด้วยทาง LINE")
      if (!p.ok) { setBusy(false); return report(p, "") }
      parts.push(`ผู้ปกครองนั่งไปด้วย ${withAdult.length} วัน (ไม่คิดเงิน)`)
      reply.push(`ผู้ปกครองนั่งรถไปด้วย ${withAdult.length} วัน (ไม่มีค่าใช้จ่าย)`)
    }
    if (adds.length) {
      const a = addBusAddOns(r.studentId, adds, feeId, "ผู้ปกครองขอทาง LINE")
      if (!a.ok) { setBusy(false); return report(a, "") }
      parts.push(`เพิ่มรอบรถ ${addTrips} เที่ยว ${fmtMoney(a.value.amount)} — เก็บในใบแจ้งหนี้รอบถัดไป`)
      reply.push(`เพิ่มรถรับส่ง ${addTrips} เที่ยว (${fmtMoney(a.value.amount)} รวมในใบแจ้งหนี้รอบถัดไป)`)
    }
    if (cancels.length) {
      const c = cancelBusRides(r.studentId, cancels, "ผู้ปกครองยกเลิกทาง LINE")
      if (!c.ok) { setBusy(false); return report(c, "") }
      parts.push(`ยกเลิก ${cancelTrips} เที่ยว${c.value.stopped ? ` (${c.value.stopped} เที่ยวจ่ายแล้ว ไม่คืนเงิน)` : ""}`)
      reply.push(`ยกเลิกรถ ${cancelTrips} เที่ยว`)
    }
    await finish("done", parts.join(" · "), `${reply.join(" และ")}ของ${r.studentNickname}เรียบร้อยแล้วค่ะ 🙏`)
    setBusy(false)
  }
  // owner 2026-10-19: a parent pinned the house — check it on the map, then save it on the family
  const families = useStore((s) => s.families)
  const setFamilyHome = useStore((s) => s.setFamilyHome)
  const fam = families.find((f) => f.id === r.familyId)
  const homeZone = r.home && branch ? zoneOf({ location: r.home, busZoneId: fam?.busZoneId }, branch.location, branch.busZones ?? []) : null
  const approveHome = async () => {
    if (!r.home) return
    setBusy(true)
    if (report(setFamilyHome(r.familyId, r.home, r.home.addressNote), "")) {
      const km = branch?.location ? ` · ${Math.round(distanceKm(branch.location, r.home) * 10) / 10} กม. จากสาขา` : ""
      await finish("done", `บันทึกหมุดบ้านแล้ว${km}${homeZone ? ` · โซน ${homeZone.name}` : ""}`, `บันทึกตำแหน่งบ้านสำหรับรถรับส่งของ${r.studentNickname}เรียบร้อยแล้วค่ะ 🙏`)
    }
    setBusy(false)
  }
  const decline = async () => {
    setBusy(true)
    if (await finish("declined", why.trim(), `เรื่องที่แจ้งไว้สำหรับ${r.studentNickname}: ${why.trim()}`)) setDeclining(false)
    setBusy(false)
  }

  /** seats on the run for this leg: `need` = the child (+ the parent) — red when they don't fit or there's no run */
  const Seats = ({ leg, date, need }: { leg: "pickup" | "dropoff"; date: string; need: number }) => {
    if (!(branch?.busRounds ?? []).length) return null
    const chk = checkRide(leg, date, rideTimes(classes, myClassIds, date), branch?.busRounds ?? [], busCtx, r.studentId)
    if (!chk.round) return <span className="ml-1 font-medium text-red-700">· ไม่มีรอบ</span>
    const free = chk.round.seats - chk.taken
    return <span className={cn("ml-1", free < need ? "font-medium text-red-700" : "text-muted-foreground")}>{free < need ? `· ${chk.round.time} ที่ไม่พอ (ว่าง ${Math.max(0, free)})` : `· ${chk.round.time} ว่าง ${free}`}</span>
  }
  const Icon = r.kind === "leave" ? CalendarOffIcon : r.kind === "return" ? RotateCcwIcon : r.kind === "bus" ? BusIcon : r.kind === "home" ? MapPinHouseIcon : DoorOpenIcon
  const title = r.kind === "leave" ? "แจ้งลาหยุด" : r.kind === "return" ? "อยากกลับมาเรียน" : r.kind === "bus" ? "ขอ / ยกเลิกรอบรถ" : r.kind === "home" ? "ปักหมุดบ้าน (รถรับส่ง)" : "แจ้งลาออก"
  // owner 2026-10-15: the same card as every other one in the chat — state on top, details, then what to do
  const state = open ? "pending" : r.status === "done" ? "approved" : "rejected"
  return (
    <Confirmation state={state} className="max-w-none">
      <ConfirmationHeader state={state} icon={<Icon />} label={open ? "รอดำเนินการ" : r.status === "done" ? "ดำเนินการแล้ว" : "ไม่ดำเนินการ"}
        title={<>{title} · {L.student(r.studentId)?.nickname ?? r.studentNickname} <span className="font-normal text-muted-foreground">· {r.familyName} · {fmtDateTime(r.createdAt)}</span></>} />
      <ConfirmationBody className="space-y-1 pl-[3.25rem]">
        {r.kind === "leave" ? (
          <ul className="flex flex-wrap gap-1.5 text-xs">
            {r.sessions?.map((x) => {
              const a = attendance.find((m) => m.sessionId === x.sessionId && m.studentId === r.studentId)
              return <li key={x.sessionId} className="rounded-full bg-muted px-2 py-0.5">{fmtDate(x.date, { weekday: true })} {x.start} · {x.subjects.join(" + ")}{a ? ` · ${a.status === "leave" ? "ลาแล้ว" : a.status === "present" ? "มาแล้ว" : a.status}` : ""}</li>
            })}
          </ul>
        ) : r.kind === "bus" ? (
          <div className="space-y-1">
            <ul className="space-y-1 text-xs">
              {r.bus?.map((x) => {
                return (
                  <li key={x.date} className="flex flex-wrap items-center gap-1.5">
                    <span className="w-28 shrink-0 font-medium">{`${fmtDate(x.date, { weekday: true })} ${x.start}`}</span>
                    {(["pickup", "dropoff"] as const).filter((leg) => x[leg]).map((leg) => {
                      const add = x[leg] === "add"
                      return (
                        <span key={leg} className={cn("rounded-full px-2 py-0.5", add ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700")}>
                          {`${add ? "+ ขอ" : "✕ ยกเลิก"}${leg === "pickup" ? "รับ" : "ส่ง"}`}
                          {add && <Seats leg={leg} date={x.date} need={1 + Number(!!x.adult)} />}
                        </span>
                      )
                    })}
                    {/* owner 2026-10-19: a parent riding along — one more seat on each leg the child rides, no charge */}
                    {withAdult.filter((l) => l.date === x.date).map((l) => (
                      <span key="adult" className="flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-800">
                        <UserIcon className="size-3" />{`+ ผู้ปกครองไปด้วย (${[l.pickup && "รับ", l.dropoff && "ส่ง"].filter(Boolean).join("+")}) · ไม่คิดเงิน`}
                        {(["pickup", "dropoff"] as const).filter((leg) => l[leg] && x[leg] !== "add").map((leg) => <Seats key={leg} leg={leg} date={x.date} need={2} />)}
                      </span>
                    ))}
                  </li>
                )
              })}
            </ul>
            {withAdult.length > 0 && <p className="text-xs text-muted-foreground">ผู้ปกครองนั่งไปด้วย = ใช้ 1 ที่นั่งต่อเที่ยว ไม่คิดค่ารถ</p>}
            {addTrips > 0 && <p className="text-xs text-muted-foreground">{`ค่ารถเพิ่ม ${addTrips} เที่ยว × ${fmtMoney(rate)} = ${fmtMoney(addTrips * rate)} → เก็บในรายชื่อนักเรียน รวมในใบแจ้งหนี้รอบถัดไป`}</p>}
            {cancelTrips > 0 && <p className="text-xs text-muted-foreground">ยกเลิกรอบที่ยังไม่เรียกเก็บ = ไม่คิดเงิน · รอบที่จ่ายแล้ว = ไม่คืนเงิน</p>}
          </div>
        ) : r.kind === "home" && r.home ? (
          <div className="space-y-1.5 text-xs">
            <p>
              {branch?.location ? `${Math.round(distanceKm(branch.location, r.home) * 10) / 10} กม. จากสาขา · ${zoneName(compassDeg(branch.location, r.home)).replace(/^สาย/, "ทิศ")}` : "ยังไม่ได้ปักหมุดสาขา"}
              {homeZone ? <> · เข้า<b>{` โซน ${homeZone.name}`}</b></> : (branch?.busZones ?? []).length ? " · ยังไม่อยู่ในโซนไหน" : ""}
              {fam?.location ? ` · ห่างจากหมุดเดิม ${Math.round(distanceKm(fam.location, r.home) * 1000)} ม.` : " · ครอบครัวนี้ยังไม่มีหมุดบ้าน"}
            </p>
            {r.home.addressNote && <p>{`จุดสังเกต: ${r.home.addressNote}`}</p>}
            {branch?.location && (
              <ZoneMap branch={branch.location} className="h-48 overflow-hidden rounded-xl" zones={branch.busZones ?? []}
                homes={[...(fam?.location ? [{ loc: fam.location, color: "slate", label: "หมุดเดิม" }] : []), { loc: r.home, color: homeZone?.color ?? "rose", label: `บ้าน${r.studentNickname}`, big: true }]} />
            )}
            <a className="text-primary underline" href={`https://www.google.com/maps?q=${r.home.lat},${r.home.lng}`} target="_blank" rel="noreferrer">เปิดใน Google Maps</a>
          </div>
        ) : r.kind === "return" ? (
          <p className="text-xs">{r.startDate ? <>อยากเริ่มเรียนราว <b>{fmtDate(r.startDate, { weekday: true, year: true })}</b></> : "ยังไม่ระบุวันเริ่ม"}</p>
        ) : (
          <p className="text-xs">เรียนวันสุดท้าย <b>{fmtDate(r.lastDate!, { weekday: true, year: true })}</b>{r.reasonIds?.length ? ` · เหตุผล: ${r.reasonIds.map((id) => Loss.reasonLabel(id, system.lossReasons)).join(", ")}` : ""}</p>
        )}
        {r.note && <p className="text-xs text-muted-foreground">“{r.note}”</p>}
        {declining && (
          <div className="space-y-1.5 pt-1">
            <Textarea autoFocus rows={2} value={why} onChange={(e) => setWhy(e.target.value)} placeholder="เหตุผล — ข้อความนี้ส่งถึงผู้ปกครองทาง LINE (จำเป็น)" />
          </div>
        )}
      </ConfirmationBody>
      {open && (allowed || preview) && (declining ? (
        <ConfirmationActions>
          <Button size="sm" variant="ghost" onClick={() => setDeclining(false)}>ยกเลิก</Button>
          <Button size="sm" disabled={!why.trim() || busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : decline())}>ส่ง</Button>
        </ConfirmationActions>
      ) : (
        <ConfirmationActions>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button size="icon-sm" variant="ghost" aria-label="เพิ่มเติม" className="mr-auto" />}><EllipsisIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuItem onClick={() => setDeclining(true)}><XIcon /> ไม่ดำเนินการ (แจ้งเหตุผล)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {r.kind === "leave" ? <>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : recordLeave(true))}>บันทึกลา · ไม่หักโควตา</Button>
            <Button size="sm" disabled={busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : recordLeave(false))}><CheckIcon /> บันทึกลา · หักโควตา</Button>
          </> : r.kind === "bus" ? <Button size="sm" disabled={busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : approveBus())}><CheckIcon /> อนุมัติ</Button>
            : r.kind === "home" ? <Button size="sm" disabled={busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : approveHome())}><CheckIcon /> บันทึกหมุดบ้าน</Button>
            : r.kind === "return" ? <Button size="sm" disabled={busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : acceptReturn())}><CheckIcon /> รับเรื่อง · กู้คืนนักเรียน</Button>
            : <Button size="sm" disabled={busy} onClick={() => (preview ? toast.info("ตัวอย่าง — กดจริงจะบันทึก และแจ้งผู้ปกครองทาง LINE") : acceptExit())}><CheckIcon /> รับเรื่อง (แจ้งออก)</Button>}
        </ConfirmationActions>
      ))}
      {!open && <ConfirmationResult>{L.teacher(r.handledBy ?? null).label} · {r.handledAt && fmtDateTime(r.handledAt)}{r.result ? ` — ${r.result}` : ""}</ConfirmationResult>}
    </Confirmation>
  )
}
