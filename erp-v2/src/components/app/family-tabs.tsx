"use client"

import { useState } from "react"
import { BusIcon, CakeIcon, CalendarCheckIcon, CalendarIcon, CalendarXIcon, UserRoundPlusIcon, TimerIcon, ChevronRightIcon, ClockIcon, CopyIcon, MailIcon, MapPinIcon, MegaphoneIcon, PhoneIcon, ReceiptIcon, SchoolIcon, ShieldCheckIcon, StarIcon, UsersIcon, WalletIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { NativeSelect } from "@/components/app/native-select"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { STATUS_PILL } from "@/components/app/student-status"
import { useInvoicesOf, useOwed } from "@/components/billing/invoice-rows"
import { StudentBilling, StudentClassTab, StudentNotes } from "@/components/app/student-sheet"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"
import { report } from "@/lib/feedback"
import { daysBetween, endTime, fmtDate, fmtMoney, toDateStr } from "@/domain/dates"
import * as Att from "@/domain/rules/attendance"
import { sessionState } from "@/domain/rules/scheduling"
import { PackageBadge } from "@/components/app/package-badge"
import { subjectColor } from "@/components/app/subject-color"
import { studentState } from "@/domain/rules/attendance"
import { BUS_USE_LABEL, busUseOf, leadToCustomer, PDPA_LABEL } from "@/domain/rules/people"
import { LEAD_SOURCE_LABEL } from "@/domain/rules/crm"
import { branchHasBus } from "@/domain/rules/settings"
import type { Family, ID, Student } from "@/domain/types"
import { useEntitlements, useNow } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** owner 2026-11-20: a DROPDOWN (not a segmented control) — "everyone" + one entry per child; only when the family has more than one child */
function KidFilter({ kids, value, onChange }: { kids: Student[]; value: ID | "all"; onChange: (v: ID | "all") => void }) {
  if (kids.length < 2) return null
  return <NativeSelect className="h-9 w-36 shrink-0" value={value} onChange={(e) => onChange(e.target.value as ID | "all")} options={[{ value: "all", label: tx("ทุกคน") }, ...kids.map((k) => ({ value: k.id, label: k.nickname }))]} />
}

/** Billing tab = the student's own Billing tab for the picked child (or every child at once) — the child dropdown sits in the table's own toolbar, before the columns icon */
export function FamilyBillingTab({ kids }: { kids: Student[] }) {
  const [kid, setKid] = useState<ID | "all">("all")
  const owed = useOwed(useInvoicesOf(new Set(kids.map((k) => k.id))))
  const shown = kid === "all" ? kids : kids.filter((k) => k.id === kid)
  return shown.length > 0 ? (
    <StudentBilling key={kid} kids={shown}
      toolbar={<><Pill tone={owed > 0 ? "amber" : "gray"}>{owed > 0 ? `${tx("ค้างชำระ")} ${fmtMoney(owed)}` : tx("ไม่มียอดค้าง")}</Pill><KidFilter kids={kids} value={kid} onChange={setKid} /></>} />
  ) : null
}

/** Class tab = the student's own Class tab for the picked child — the child dropdown sits after the "คาบเรียน / ประวัติคอร์ส" tabs; "all" = ONE table (a student column) and one course history */
export function FamilyClassTab({ kids }: { kids: Student[] }) {
  const [kid, setKid] = useState<ID | "all">("all")
  const shown = kid === "all" ? kids : kids.filter((k) => k.id === kid)
  return shown.length > 0 ? <StudentClassTab key={kid} kids={shown} filter={<KidFilter kids={kids} value={kid} onChange={setKid} />} /> : null
}

/** Note tab = the student's own Note tab (the chat-style list + the type bar) for the picked child, or for every child — the dropdown sits on top, each note is tagged with the child */
export function FamilyNotesTab({ kids }: { kids: Student[] }) {
  const [kid, setKid] = useState<ID | "all">("all")
  const shown = kid === "all" ? kids : kids.filter((k) => k.id === kid)
  return shown.length > 0 ? <StudentNotes key={kid} kids={shown} filter={<KidFilter kids={kids} value={kid} onChange={setKid} />} /> : null
}

/** label / value facts — a quiet block: small, light text, a small light icon, "-" when empty; 2 columns when the panel is wide, 1 when narrow (container query on the panel's own width) */
export type InfoRow = { icon: React.ElementType; label: string; value: React.ReactNode }
export function InfoGrid({ rows, className }: { rows: InfoRow[]; className?: string }) {
  return (
    <div className={cn("@container", className)}>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs @lg:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} title={r.label} className="flex min-w-0 items-center gap-2">
            <r.icon className="size-3.5 shrink-0 text-muted-foreground/60" />
            <dt className="sr-only">{r.label}</dt>
            <dd className="min-w-0 flex-1 truncate text-foreground/75">{r.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
/** an empty fact is just "-" (the row's tooltip still says what it is) */
export const NotSet = ({ what }: { what?: string }) => <span className="text-muted-foreground/70" title={what ? tx(what) : undefined}>-</span>

const copyText = (text: string, done: string) => { navigator.clipboard?.writeText(text).catch(() => undefined); report({ ok: true, value: undefined }, done) }

/** the first number only; hover = every number, each with a copy button (owner 2026-11-20) */
export function PhoneValue({ numbers }: { numbers: (string | undefined)[] }) {
  const list = numbers.filter((x): x is string => !!x)
  if (!list.length) return <NotSet what="เบอร์โทร" />
  return (
    <HoverCard>
      <HoverCardTrigger render={<span className="cursor-default tabular-nums" />}>{list[0]}{list.length > 1 && <span className="ml-1 text-muted-foreground">+{list.length - 1}</span>}</HoverCardTrigger>
      <HoverCardContent align="start" className="space-y-1">
        {list.map((n, i) => (
          <div key={n} className="flex items-center gap-3">
            {/* owner 2026-11-20: the first number is the main one — a star marks it, the others keep an empty slot so the numbers line up */}
            <span className="grid size-3.5 shrink-0 place-items-center" title={i === 0 ? tx("เบอร์หลัก") : undefined}>{i === 0 && <StarIcon className="size-3.5 fill-muted-foreground/40 text-muted-foreground/60" aria-label={tx("เบอร์หลัก")} />}</span>
            <span className="tabular-nums">{n}</span>
            <Button size="icon-xs" variant="ghost" aria-label={`${tx("คัดลอก")} ${n}`} title={tx("คัดลอก")} onClick={() => copyText(n, "คัดลอกเบอร์แล้ว")}><CopyIcon /></Button>
          </div>
        ))}
      </HoverCardContent>
    </HoverCard>
  )
}

/** ONE line: the place's name (the "AA Vallage" note) leads, else the address; hover = the full address + the pin, with copy and "open in Google Maps" */
export function AddressValue({ note, address, location }: { note?: string; address: string; location?: { lat: number; lng: number } }) {
  const place = note?.trim()
  const main = place || address
  if (!main) return <NotSet what="ที่อยู่" />
  const full = [place, address].filter(Boolean).join(" · ")
  const maps = location ? `https://www.google.com/maps?q=${location.lat},${location.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address || place || "")}`
  return (
    <HoverCard>
      <HoverCardTrigger render={<span className="block cursor-default truncate" />}>{main}</HoverCardTrigger>
      <HoverCardContent align="start" className="max-w-80 space-y-2">
        <div className="space-y-0.5">
          {place && <p className="font-medium text-foreground">{place}</p>}
          {address && <p>{address}</p>}
          {location && <p className="tabular-nums text-muted-foreground">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>}
        </div>
        <div className="flex gap-1.5">
          <Button size="xs" variant="outline" type="button" onClick={() => copyText(location ? `${full} (${location.lat}, ${location.lng})` : full, "คัดลอกที่อยู่แล้ว")}><CopyIcon /> {tx("คัดลอก")}</Button>
          <Button size="xs" variant="outline" nativeButton={false} render={<a href={maps} target="_blank" rel="noreferrer" />}><MapPinIcon /> {tx("เปิดใน Google Maps")}</Button>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}

/** Overview › each child as a small profile (owner 2026-11-20): name · grade · status on top (tap = that child's panel), then birthday · school · bus as facts */
export function FamilyKidsList({ kids, onOpen, plain }: { kids: Student[]; onOpen: (id: ID) => void; /** no lines between the children (the family panel's info tab divides by heading instead) */ plain?: boolean }) {
  const ents = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const branches = useStore((s) => s.branches)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const today = toDateStr(useNow())
  if (!kids.length) return <p className="py-4 text-center text-xs text-muted-foreground">{tx("ยังไม่มีลูกในครอบครัวนี้")}</p>
  return (
    <div className={plain ? "space-y-1" : "divide-y"}>
      {kids.map((k) => {
        const state = studentState(k, ents.filter((e) => e.studentId === k.id), leaves.filter((l) => l.studentId === k.id), today, renewalDays)
        const bus = branchHasBus(branches.find((b) => b.id === k.branchId))
        const age = k.birthDate ? Math.floor(daysBetween(k.birthDate, today) / 365.25) : null
        const mine = ents.filter((e) => e.studentId === k.id)
        const enrolled = mine.map((e) => e.from).sort()[0]
        const ends = mine.map((e) => e.to).sort().slice(-1)[0]
        const left = ends ? daysBetween(today, ends) : null
        const rows: InfoRow[] = [
          { icon: CalendarCheckIcon, label: tx("วัน Enroll"), value: enrolled ? fmtDate(enrolled, { year: true }) : <NotSet what="วัน Enroll" /> },
          // owner 2026-11-20: just the date + (days left) — grey · yellow under 7 days · red under 3
          { icon: CalendarXIcon, label: tx("วันสิ้นสุด"), value: ends ? <>{fmtDate(ends, { year: true })} <span className={cn(left === null ? "" : left < 3 ? "text-destructive" : left <= 7 ? "text-warning-ink" : "text-muted-foreground")}>{left !== null && left >= 0 ? `(${left}d)` : `(${tx("หมดแล้ว")})`}</span></> : <NotSet what="วันสิ้นสุด" /> },
          { icon: CakeIcon, label: tx("วันเกิด"), value: k.birthDate ? <>{fmtDate(k.birthDate, { year: true })}<span className="text-muted-foreground"> · {tx("อายุ {0} ปี", [age ?? 0])}</span></> : <NotSet what="วันเกิด" /> },
          { icon: SchoolIcon, label: tx("โรงเรียน"), value: k.school || <NotSet what="โรงเรียน" /> },
          ...(bus ? [{ icon: BusIcon, label: tx("รถรับส่ง"), value: k.usesBus ? `${tx("รถรับส่ง")}: ${BUS_USE_LABEL[busUseOf(k)]}` : <span className="text-muted-foreground">{tx("ไม่ใช้รถรับส่ง")}</span> }] : []),
        ]
        return (
          <section key={k.id} className="py-3">
            <Button variant="row" size="inline" type="button" onClick={() => onOpen(k.id)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left text-sm hover:bg-muted/50">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(k.id))}>{initial(k.nickname)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5"><span className="font-medium">{k.nickname}</span><span className={cn("rounded px-1 text-2xs", gradeTone(k.grade))}>{k.grade}</span></span>
                <span className="block truncate text-xs text-muted-foreground">{k.name}</span>
              </span>
              <Pill tone={STATUS_PILL[state.status].tone}>{STATUS_PILL[state.status].label}</Pill>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Button>
            <InfoGrid rows={rows} className="mt-2 pl-1" />
          </section>
        )
      })}
    </div>
  )
}

/**
 * Overview › the family as a PROFILE (owner 2026-11-20): who they are, where they live, how to reach them, how they found us, PDPA, tax, what is owed.
 * Every line is always there — an empty one says "not filled in", so you see at a glance what the family file is missing.
 */
export function FamilyProfile({ family, kids, onGoBilling }: { family: Family; kids: Student[]; onGoBilling: () => void }) {
  const families = useStore((s) => s.families)
  const leads = useStore((s) => s.leads)
  const invoices = useStore((s) => s.invoices)
  const ents = useEntitlements()
  const lc = leadToCustomer(family, kids, leads, invoices, ents)
  const today = toDateStr(useNow())
  const owed = useOwed(useInvoicesOf(new Set(kids.map((k) => k.id))))
  const main = family.parents.find((p) => p.primary) ?? family.parents[0]
  const addr = [family.address, family.province, family.postcode].filter(Boolean).join(" ")
  const referrer = family.referredByFamilyId ? families.find((f) => f.id === family.referredByFamilyId)?.name : undefined
  const sources = [...(family.sources ?? []).map((x) => LEAD_SOURCE_LABEL[x] ?? x), ...(family.sourceLabels ?? [])]
  const rows: InfoRow[] = [
    { icon: MapPinIcon, label: tx("ที่อยู่"), value: <AddressValue note={family.addressNote} address={addr} location={family.location} /> },
    { icon: PhoneIcon, label: tx("โทร"), value: <PhoneValue numbers={[main?.phone, ...(main?.altPhones ?? [])]} /> },
    { icon: MailIcon, label: tx("อีเมล"), value: main?.email || <NotSet what="อีเมล" /> },
    { icon: UserRoundPlusIcon, label: tx("เป็น Lead วันแรก"), value: lc.leadSince ? <>{tx("เป็น Lead")} {fmtDate(lc.leadSince, { year: true })}</> : <NotSet what="เป็น Lead วันแรก" /> },
    { icon: TimerIcon, label: tx("จาก Lead เป็นลูกค้า"), value: lc.days !== null && lc.customerSince ? <>{tx("เป็นลูกค้า")} {fmtDate(lc.customerSince, { year: true })}<span className="text-muted-foreground"> · {tx("ใช้เวลา {0} วัน", [lc.days])}</span></> : lc.leadSince ? <span className="text-muted-foreground">{tx("ยังไม่เป็นลูกค้า · เป็น Lead มา {0} วัน", [Math.max(0, daysBetween(lc.leadSince, today))])}</span> : <NotSet what="จาก Lead เป็นลูกค้า" /> },
    { icon: MegaphoneIcon, label: tx("รู้จักเราจาก"), value: sources.length ? sources.join(", ") : <NotSet what="รู้จักเราจาก" /> },
    { icon: UsersIcon, label: tx("ผู้แนะนำ"), value: family.referralText || referrer ? <>{tx("แนะนำโดย")} {family.referralText}{referrer && <span className="text-muted-foreground"> → {referrer}</span>}</> : <NotSet what="ผู้แนะนำ" /> },
    { icon: ShieldCheckIcon, label: "PDPA", value: family.pdpa ? `PDPA · ${PDPA_LABEL[family.pdpa]}` : <NotSet what="PDPA" /> },
    { icon: ReceiptIcon, label: tx("ใบกำกับภาษี"), value: family.taxInfo?.customerName ? <>{tx("ใบกำกับภาษี")} · {family.taxInfo.customerName}{family.taxInfo.taxId && <span className="text-muted-foreground"> · {family.taxInfo.taxId}</span>}</> : <NotSet what="ข้อมูลใบกำกับภาษี" /> },
    { icon: WalletIcon, label: tx("ค้างชำระ"), value: owed > 0 ? <Button variant="link" size="inline" type="button" className="h-auto p-0 text-sm" onClick={onGoBilling}>{tx("ค้างชำระ")} {fmtMoney(owed)} · {tx("ดูใบแจ้งหนี้")}</Button> : <span className="text-muted-foreground">{tx("ไม่มียอดค้าง")}</span> },
  ]
  return (
    // owner 2026-11-20: plain information, no card and no line of its own — the panel divides by heading
    <InfoGrid rows={rows} />
  )
}

/**
 * Overview = a SNAPSHOT of the family (owner 2026-11-20): for every child, each course they hold, when the next session is, and what is left (sessions · hours).
 * Tap a child → that child's panel. Profile facts live in the "ข้อมูลครอบครัว" tab.
 */
export function FamilyOverview({ kids, onOpen }: { kids: Student[]; onOpen: (id: ID) => void }) {
  const ents = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const sessions = useStore((s) => s.sessions)
  const attendance = useStore((s) => s.attendance)
  const classes = useStore((s) => s.classes)
  const courses = useStore((s) => s.courses)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const now = useNow(60_000)
  const today = toDateStr(now)
  if (!kids.length) return <p className="py-4 text-center text-xs text-muted-foreground">{tx("ยังไม่มีลูกในครอบครัวนี้")}</p>
  return (
    <div className="divide-y">
      {kids.map((k) => {
        const mine = ents.filter((e) => e.studentId === k.id)
        const state = studentState(k, mine, leaves.filter((l) => l.studentId === k.id), today, renewalDays)
        const current = mine.filter((e) => e.to >= today).sort((a, b) => a.to.localeCompare(b.to))
        return (
          <section key={k.id} className="py-3 first:pt-0">
            <Button variant="row" size="inline" type="button" onClick={() => onOpen(k.id)} className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left text-sm hover:bg-muted/50">
              <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(k.id))}>{initial(k.nickname)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5"><span className="font-medium">{k.nickname}</span><span className={cn("rounded px-1 text-2xs", gradeTone(k.grade))}>{k.grade}</span></span>
                <span className="block truncate text-xs text-muted-foreground">{k.name}</span>
              </span>
              <Pill tone={STATUS_PILL[state.status].tone}>{STATUS_PILL[state.status].label}</Pill>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Button>
            {current.length === 0 ? <p className="mt-1.5 pl-1 text-xs text-muted-foreground">{tx("ไม่มีคอร์สที่ใช้อยู่")}</p> : (
              <ul className="mt-2 space-y-1.5">
                {current.map((e) => {
                  const c = courses.find((x) => x.id === e.courseId)
                  const upcoming = sessions
                    .filter((x) => x.studentIds.includes(k.id) && !x.cancelled && Att.packageCovers(e, x) && x.date >= today && sessionState(x, now) === "upcoming")
                    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start))
                  const next = upcoming[0]
                  const bal = Att.balance(e, sessions, attendance, classes)
                  const left = Math.min(bal.remaining, upcoming.length || bal.remaining)
                  const leftMin = bal.remainingMinutes ?? upcoming.slice(0, left).reduce((m, x) => m + x.minutes, 0)
                  const hours = +(leftMin / 60).toFixed(1)
                  return (
                    <li key={e.id} className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-2 text-xs">
                      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-xs font-semibold", subjectColor(c?.subjects[0] ?? "").chip)}>{(c?.subjects[0] ?? "?").slice(0, 2)}</span>
                      <span className="min-w-0 flex-1 space-y-0.5">
                        <span className="flex items-center gap-1.5 text-sm font-medium"><span className="truncate">{c?.name ?? tx("คอร์ส")}</span>{c && <PackageBadge course={c} size="sm" />}</span>
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <CalendarIcon className="size-3 shrink-0" />
                          {next ? <span className="truncate text-foreground/80">{tx("คาบถัดไป")} {fmtDate(next.date)} · {next.start}–{endTime(next.start, next.minutes)}</span> : <span>{tx("ยังไม่มีคาบถัดไป")}</span>}
                        </span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="block text-sm font-semibold">{left} <span className="text-xs font-normal text-muted-foreground">{tx("คาบ")}</span></span>
                        <span className="flex items-center justify-end gap-1 text-muted-foreground"><ClockIcon className="size-3" />{hours} {tx("ชม.")}</span>
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
