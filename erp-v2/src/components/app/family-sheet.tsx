"use client"

import { useState } from "react"
import Link from "next/link"
import { ArchiveIcon, ArchiveRestoreIcon, CakeIcon, ChevronDownIcon, MailIcon, MessageCircleIcon, MessagesSquareIcon, PencilIcon, StarIcon, PhoneIcon, ReceiptIcon, SmartphoneIcon, Trash2Icon, UserPlusIcon, UsersIcon, UsersRoundIcon } from "lucide-react"
import { ParentPreview } from "@/components/parent/parent-preview"
import { tx } from "@/lib/i18n"
import { Pill } from "@/components/app/badges"
import { avatarTone, initial } from "@/components/app/subject-color"
import { MathGate } from "@/components/app/math-gate"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { StudentSheet } from "@/components/app/student-sheet"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { startFamilySet } from "@/lib/family-set"
import { Tabs } from "@/components/app/page-layout"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { FamilyBillingTab, FamilyClassTab, FamilyKidsList, FamilyOverview, FamilyProfile, InfoGrid, NotSet, PhoneValue, FamilyNotesTab } from "@/components/app/family-tabs"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { can } from "@/domain/rules/permissions"
import { EntityPanel, PanelBody, PanelFooter, PanelForm, PanelMore } from "./form-shell"
import { FamilyForm } from "./family-form"
import { FamilyForms } from "@/components/forms/family-forms"
import { fmtDate } from "@/domain/dates"
import type { Family, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export type FamilyTab = "overview" | "info" | "billing" | "courses" | "notes" | "forms"

/**
 * Family detail panel: overview snapshot · family info (family / guardians / students) · billing · class · notes · forms.
 * LINE: no link code any more (owner 2026-11-20) — a LINE account the admin pulls into this family from the Inbox is linked at once.
 * Shared by /families and the Inbox side-panel button so a family's contact info lives in exactly one
 * place, never a second hand-rolled summary that can drift out of sync with it.
 */
export function FamilySheet({ id: target, onClose, initialTab }: { id: ID | "new" | null; onClose: () => void; /** which tab opens first — unset: ภาพรวม */ initialTab?: FamilyTab }) {
  // owner 2026-10-09: View → แก้ไข → back in the same panel; "new" opens the empty form and becomes the view once saved
  const [createdId, setCreatedId] = useState<ID | "new" | null>(null)
  const [editing, setEditing] = useState(target === "new")
  const id = target === "new" ? createdId : target
  const f = useStore((s) => s.families.find((x) => x.id === id))
  const kids = useStore((s) => s.students).filter((s) => s.familyId === id)
  const lineConvs = useStore((s) => s.conversations)
  const conv = lineConvs.find((c) => c.familyId && c.familyId === id)
  const me = useStore((s) => s.me())
  const archive = useStore((s) => s.archiveFamily)
  const restore = useStore((s) => s.restoreFamily)
  const del = useStore((s) => s.deleteFamily)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  // owner 2026-11-20: the family panel is a workplace, not a card — สมาชิก · ใบแจ้งหนี้ · คอร์ส · ฟอร์ม (it used to show only people, so the work on invoices disappeared)
  const [tab, setTab] = useState<FamilyTab>(initialTab ?? "overview")
  const [invoice, setInvoice] = useState<ID | "new" | null>(null)
  const [invoiceFor, setInvoiceFor] = useState<ID | undefined>()
  const [parentApp, setParentApp] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const manage = can(me, "family.manage")
  // owner 2026-11-20: LINE shows by itself — the ID the guardian typed, else the name they show in LINE (the API never gives the @ID); linked with neither = "linked"
  const lineConv = f?.lineUserId ? lineConvs.find((c) => c.id === `line_${f.lineUserId}`) : undefined
  const lineOf = (p: Family["parents"][number], i: number): React.ReactNode => {
    const mine = p.lineUserId ? p.lineUserId === f?.lineUserId : p.primary || i === 0
    const name = mine && p.lineLinked ? lineConv?.lineName : undefined
    if (p.lineId) return <>{p.lineId}{name && <span className="text-muted-foreground"> · {name}</span>}</>
    if (name) return name
    return p.lineLinked ? <span className="text-success-ink">{tx("เชื่อม LINE แล้ว")}</span> : <NotSet what="LINE" />
  }

  return (
    <>
      {parentApp && f && <ParentPreview family={f} onClose={() => setParentApp(false)} />}
      <EntityPanel open={target !== null} onClose={onClose}>
          {editing ? (
            <PanelForm>
              <FamilyForm key={f?.id ?? "new"} family={f} onClose={() => (f ? setEditing(false) : onClose())}
                onSaved={(saved) => { if (target === "new") setCreatedId(saved.id); setEditing(false) }} />
            </PanelForm>
          ) : f && (
            <>
              <SheetHeader className="shrink-0 gap-3 border-b pb-0">
                {/* owner 2026-11-20: like the Inbox chat header — the type is a quiet grey word under the name, not a pill */}
                {/* owner 2026-11-20: the thumb belongs in the Header — like the student and the lead: thumb · name · one quiet line (type · children · main parent) */}
                <div className="flex items-center gap-3 pr-10">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(f.id))}>{initial(f.name.replace(/^ครอบครัว/, "") || f.name)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="truncate text-lg">{f.name}{f.nameEn && <span className="ml-1.5 font-normal text-muted-foreground">({f.nameEn})</span>}</SheetTitle>
                      {f.archived && <Pill tone="gray">เก็บเข้าคลัง</Pill>}
                    </div>
                    <SheetDescription className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
                      <span className="inline-flex items-center gap-1"><UsersIcon className="size-3" /> Family</span>
                      <span aria-hidden>·</span>
                      <span>{f.archived ? `เก็บเข้าคลัง · ${f.archived.reason}` : tx("ลูก {0} คน", [kids.length])}{!f.archived && (f.parents.find((p) => p.primary) ?? f.parents[0]) ? ` · ${(f.parents.find((p) => p.primary) ?? f.parents[0]).name}` : ""}</span>
                    </SheetDescription>
                  </div>
                </div>
                <Tabs className="-mx-4 border-b-0 px-3" value={tab} onChange={setTab} options={[
                  { value: "overview", label: tx("ภาพรวม") },
                  { value: "info", label: tx("ข้อมูลครอบครัว") },
                  { value: "billing", label: tx("การเงิน") },
                  { value: "courses", label: tx("คลาส") },
                  { value: "notes", label: tx("โน้ต") },
                  { value: "forms", label: tx("ฟอร์มพิเศษ") },
                ]} />
              </SheetHeader>
              <PanelBody>
                {tab === "overview" && <FamilyOverview kids={kids} onOpen={setStudentOpen} />}
                {tab === "info" && <>
                <section className="space-y-2"><h3 className="text-sm font-semibold">ครอบครัว</h3>
                <FamilyProfile family={f} kids={kids} onGoBilling={() => setTab("billing")} />
                </section>
                {/* owner 2026-11-20: the divider separates the HEADINGS (ครอบครัว | ผู้ปกครอง | นักเรียน), not the people inside one */}
                <section className="space-y-2 border-t pt-4">
                  <h3 className="text-sm font-semibold">ผู้ปกครอง</h3>
                  <div className="space-y-3">
                    {f.parents.map((p, i) => (
                      <div key={i} className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-medium">{p.name}{p.nameEn && <span className="ml-1.5 font-normal text-muted-foreground">({p.nameEn})</span>}</span>{p.primary && <StarIcon className="size-3.5 fill-muted-foreground/40 text-muted-foreground/60" aria-label={tx("ผู้ปกครองหลัก")}><title>{tx("ผู้ปกครองหลัก")}</title></StarIcon>}
                        </div>
                        <InfoGrid rows={[
                          { icon: UsersIcon, label: tx("ความสัมพันธ์"), value: p.relationship || <NotSet what="ความสัมพันธ์" /> },
                          { icon: PhoneIcon, label: tx("โทร"), value: <PhoneValue numbers={[p.phone, ...(p.altPhones ?? [])]} /> },
                          { icon: MessageCircleIcon, label: "LINE", value: lineOf(p, i) },

                          { icon: MailIcon, label: tx("อีเมล"), value: p.email || <NotSet what="อีเมล" /> },
                          { icon: CakeIcon, label: tx("วันเกิด"), value: p.birthDate ? fmtDate(p.birthDate, { year: true }) : <NotSet what="วันเกิด" /> },
                        ]} />
                      </div>
                    ))}
                  </div>
                  {!f.parents.some((p) => p.lineLinked) && <p className="text-xs text-muted-foreground">{tx("ยังไม่ผูก LINE — ให้ผู้ปกครองแอด LINE OA แล้วดึงแชทเข้าครอบครัวนี้จาก Inbox ระบบจะเชื่อมให้ทันที")}</p>}
                </section>
                <section className="space-y-2 border-t pt-4">
                  <div className="flex items-center"><h3 className="text-sm font-semibold">{tx("นักเรียน")} ({kids.length})</h3><Button size="xs" variant="ghost" className="ml-auto" onClick={() => setStudentOpen("new")}><UserPlusIcon /> {tx("เพิ่มลูก")}</Button></div>
                  <FamilyKidsList kids={kids} onOpen={setStudentOpen} plain />
                </section>
                </>}
                {tab === "billing" && <FamilyBillingTab kids={kids} />}
                {tab === "courses" && <FamilyClassTab kids={kids} />}
                {tab === "notes" && <FamilyNotesTab kids={kids} />}
                {tab === "forms" && (
                  <div className="space-y-3">
                    <p className="rounded-2xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{tx("ฟอร์มที่บริษัทสร้างเอง (ตั้งค่า › ฟอร์ม) เช่น แบบสอบถามพิเศษ — ดูคำตอบของครอบครัวนี้และส่งฟอร์มให้ได้ที่นี่ · ใบสมัคร / Test / Trial อยู่ในแผง Lead")}</p>
                    <FamilyForms family={f} />
                  </div>
                )}
              </PanelBody>
              {/* Bottom = actions (owner 2026-10-09) · NEGATIVE-ACTIONS.md §2–3: archive / restore / delete */}
              {/* owner 2026-11-20: Bottom = ⋯ on the left (view as parent · edit · archive · delete), the one main action on the right (new invoice → pick a child or the whole family) */}
              <PanelFooter>
                <PanelMore items={[
                  { label: "ดูแบบผู้ปกครอง", icon: SmartphoneIcon, onClick: () => setParentApp(true) },
                  { label: "แก้ไข", icon: PencilIcon, onClick: () => setEditing(true) },
                  manage && !f.archived && { label: "เก็บเข้าคลัง", icon: ArchiveIcon, destructive: true, onClick: () => setArchiving(true) },
                      manage && !f.archived && { label: "ลบถาวร", icon: Trash2Icon, destructive: true, disabled: kids.length > 0, title: kids.length > 0 ? "ครอบครัวนี้มีนักเรียนผูกอยู่ — เก็บเข้าคลังแทน" : undefined, onClick: () => setDeleting(true) },
                ]} />
                <Button size="icon" variant="outline" className="ml-auto rounded-full" disabled={!conv} aria-label={tx("แชท LINE กับผู้ปกครอง")} title={conv ? tx("เปิดแชท LINE กับผู้ปกครองใน Inbox") : tx("ครอบครัวนี้ยังไม่มีแชท LINE ใน Inbox")} nativeButton={!conv} render={conv ? <Link href={`/inbox?conversation=${conv.id}`} /> : undefined}><MessagesSquareIcon /></Button>
                {manage && f.archived && <Button variant="outline" onClick={() => report(restore(f.id), "เอาครอบครัวกลับจากคลังแล้ว")}><ArchiveRestoreIcon /> เอากลับจากคลัง</Button>}
                {!f.archived && can(me, "billing.manage") && kids.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="outline" />}><ReceiptIcon /> {tx("ออกใบแจ้งหนี้")} <ChevronDownIcon /></DropdownMenuTrigger>
                    <DropdownMenuContent align="end" side="top">
                      {kids.map((k) => <DropdownMenuItem key={k.id} onClick={() => { setInvoiceFor(k.id); setInvoice("new") }}>{k.nickname} · {k.grade}</DropdownMenuItem>)}
                      {kids.length > 1 && <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => { const r = startFamilySet({ familyId: f.id }); if (report(r, "สร้างชุดครอบครัวแล้ว — เติมคอร์สให้ลูกแต่ละคน")) { setInvoiceFor(undefined); setInvoice(r.value.firstId) } }}><UsersRoundIcon /> {tx("ทั้งครอบครัว")} ({kids.length} {tx("คน")})</DropdownMenuItem>
                      </>}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </PanelFooter>
              <ReasonDialog open={archiving} title={`เก็บครอบครัว “${f.name}” เข้าคลัง`} description="ครอบครัวจะหายจากลิสต์ปกติแต่ประวัติยังอยู่ — เอากลับมาได้" onConfirm={(r) => report(archive(f.id, r), "เก็บครอบครัวเข้าคลังแล้ว")} onClose={() => setArchiving(false)} />
              <MathGate open={deleting} title={`ลบครอบครัว “${f.name}”`} warning="การลบนี้ย้อนกลับไม่ได้ — ครอบครัวนี้ยังไม่มีนักเรียนผูกอยู่" onConfirm={() => { if (report(del(f.id), "ลบครอบครัวแล้ว")) onClose() }} onClose={() => setDeleting(false)} />
            </>
          )}
      </EntityPanel>
      <StudentSheet studentId={studentOpen} familyId={f?.id} onClose={() => setStudentOpen(null)} back={f ? { label: f.name, onBack: () => setStudentOpen(null) } : undefined} />
      {invoice && <InvoiceSheet id={invoice} defaultStudentId={invoiceFor} onClose={() => { setInvoice(null); setInvoiceFor(undefined) }} />}
    </>
  )
}
