"use client"

import { useState } from "react"
import Link from "next/link"
import { ArchiveIcon, ArchiveRestoreIcon, CakeIcon, ChevronDownIcon, MessagesSquareIcon, ReceiptIcon, SmartphoneIcon, Trash2Icon, UsersIcon, UsersRoundIcon, PencilIcon } from "lucide-react"
import { ParentPreview } from "@/components/parent/parent-preview"
import { tx } from "@/lib/i18n"
import { Pill } from "@/components/app/badges"
import { tagInk } from "@/components/app/tags"
import { avatarTone, initial } from "@/components/app/subject-color"
import { MathGate } from "@/components/app/math-gate"
import { ReasonDialog } from "@/components/app/reason-dialog"
import { StudentPanelContent } from "@/components/app/student-sheet"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { startFamilySet } from "@/lib/family-set"
import { Tabs } from "@/components/app/page-layout"
import { InvoiceSheet } from "@/components/billing/invoice-sheet"
import { FamilyBillingTab, FamilyClassTab, FamilyOverview, FamilyNotesTab } from "@/components/app/family-tabs"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { can } from "@/domain/rules/permissions"
import { EntityPanel, PanelBody, PanelFooter, PanelForm, PanelMore } from "./form-shell"
import { FamilyForm, type FamilyFormOnly } from "./family-form"
import { FamilyEditItems, type EditTarget } from "./family-edit-menu"
import { FamilyForms } from "@/components/forms/family-forms"
import { StudentExams } from "@/components/exams/student-exams"
import { FamilyInfoTab } from "@/components/app/family-info-tab"
import { EnrollFormCard } from "@/components/forms/enroll-form-card"
import { toDateStr } from "@/domain/dates"
import { studentState } from "@/domain/rules/attendance"
import { birthdaysToday, mainLineAccount, familyDisplay, familyCore } from "@/domain/rules/people"
import { STATUS_PILL } from "@/components/app/student-status"
import { useEntitlements, useNow } from "@/lib/hooks"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export type FamilyTab = "overview" | "info" | "billing" | "courses" | "exams" | "notes" | "forms"

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
  // owner 2026-11-25: edit ONE person / the family's own details (the “แก้ไข” menu asks who)
  const [editOnly, setEditOnly] = useState<FamilyFormOnly | undefined>()
  const [studentEdit, setStudentEdit] = useState(false)
  const id = target === "new" ? createdId : target
  const f = useStore((s) => s.families.find((x) => x.id === id))
  const kids = useStore((s) => s.students).filter((s) => s.familyId === id)
  const lineConvs = useStore((s) => s.conversations)
  // owner 2026-11-20: Inbox talks to ONE person — the chat button opens the main contact's chat (else any chat of the family)
  const mainAccount = f ? mainLineAccount(f) : undefined
  const conv = lineConvs.find((c) => c.familyId === id && !!mainAccount && c.id === `line_${mainAccount}`) ?? lineConvs.find((c) => c.familyId && c.familyId === id)
  const me = useStore((s) => s.me())
  const archive = useStore((s) => s.archiveFamily)
  const restore = useStore((s) => s.restoreFamily)
  const del = useStore((s) => s.deleteFamily)
  const [studentOpen, setStudentOpenRaw] = useState<ID | null>(null)
  const setStudentOpen = (v: ID | null) => { setStudentOpenRaw(v); if (!v) setStudentEdit(false) }
  const pick = (t: EditTarget) => {
    if (t.kind === "student") { setStudentEdit(true); setStudentOpenRaw(t.id); return }
    if (t.kind === "newStudent") { setStudentOpenRaw("new" as ID); return }
    setEditOnly(t.kind === "family" ? "family" : t.kind === "newParent" ? "newParent" : { parent: t.index }); setEditing(true)
  }
  // owner 2026-11-20: the family panel is a workplace, not a card — สมาชิก · ใบแจ้งหนี้ · คอร์ส · ฟอร์ม (it used to show only people, so the work on invoices disappeared)
  const [tab, setTab] = useState<FamilyTab>(initialTab ?? "overview")
  const [invoice, setInvoice] = useState<ID | "new" | null>(null)
  const [invoiceFor, setInvoiceFor] = useState<ID | undefined>()
  const [parentApp, setParentApp] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const manage = can(me, "family.manage")
  // owner 2026-11-20: next to the name — "Active" while ANY child is still Active · a small cake on anyone's birthday (a guardian or a child)
  const ents = useEntitlements()
  const leaves = useStore((s) => s.leaves)
  const renewalDays = useStore((s) => s.system.settings.renewalDaysBefore)
  const today = toDateStr(useNow())
  const anyActive = kids.some((k) => studentState(k, ents.filter((e) => e.studentId === k.id), leaves.filter((l) => l.studentId === k.id), today, renewalDays).status === "active")
  const bdayNames = f ? birthdaysToday(f, kids, today) : []
  return (
    <>
      {parentApp && f && <ParentPreview family={f} onClose={() => setParentApp(false)} />}
      <EntityPanel open={target !== null} onClose={onClose} wide={!!studentOpen}>
          {studentOpen ? (
            // owner 2026-11-20: a child opens IN PLACE — this same panel swaps to the student (Back returns here), no second sheet on top
            <StudentPanelContent studentId={studentOpen} familyId={f?.id} startEditing={studentEdit} onClose={() => setStudentOpen(null)} back={f ? { label: familyDisplay(f.name), onBack: () => setStudentOpen(null) } : undefined} />
          ) : editing ? (
            <PanelForm>
              <FamilyForm key={`${f?.id ?? "new"}-${JSON.stringify(editOnly ?? "all")}`} family={f} only={editOnly} onClose={() => { setEditOnly(undefined); if (f) setEditing(false); else onClose() }}
                onSaved={(saved) => { if (target === "new") setCreatedId(saved.id); setEditOnly(undefined); setEditing(false) }} />
            </PanelForm>
          ) : f && (
            <>
              <SheetHeader className="shrink-0 gap-3 border-b pb-0">
                {/* owner 2026-11-20: like the Inbox chat header — the type is a quiet grey word under the name, not a pill */}
                {/* owner 2026-11-20: the thumb belongs in the Header — like the student and the lead: thumb · name · one quiet line (type · children · main parent) */}
                <div className="flex items-center gap-3 pr-10">
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(f.id))}>{initial(familyCore(f.name))}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <SheetTitle className="truncate text-lg">{/* owner 2026-11-24: always "[name] Family" — no Thai "ครอบครัว" prefix */}{familyDisplay(f.name)}{f.nameEn && <span className="ml-1.5 font-normal text-muted-foreground">({f.nameEn})</span>}</SheetTitle>
                      {f.archived ? <Pill tone="gray">เก็บเข้าคลัง</Pill> : anyActive && <Pill tone={STATUS_PILL.active.tone}>{STATUS_PILL.active.label}</Pill>}
                      {bdayNames.length > 0 && <span title={`${tx("วันเกิดวันนี้")}: ${bdayNames.join(", ")}`} className={cn("inline-grid size-5 shrink-0 place-items-center opacity-70", tagInk("birthday", "today"))}><CakeIcon className="size-4" aria-label={tx("วันเกิดวันนี้")} /></span>}
                    </div>
                    {/* h-5 = the same line height as the student's (its status pills / ⓘ are 20px) — the two panel headers are the same height (owner 2026-11-20) */}
                    <SheetDescription className="mt-0.5 flex h-5 flex-wrap items-center gap-x-1.5 overflow-hidden text-xs">
                      <span className="inline-flex items-center gap-1"><UsersIcon className="size-3" /> {f.archived ? `เก็บเข้าคลัง · ${f.archived.reason}` : tx("ลูก {0} คน", [kids.length])}</span>
                    </SheetDescription>
                  </div>
                </div>
                <Tabs className="-mx-4 border-b-0 px-3" value={tab} onChange={setTab} options={[
                  { value: "overview", label: tx("ภาพรวม") },
                  { value: "info", label: tx("ข้อมูลครอบครัว") },
                  { value: "billing", label: tx("การเงิน") },
                  { value: "courses", label: tx("คลาส") },
                  { value: "exams", label: tx("ผลสอบ") },
                  { value: "notes", label: tx("โน้ต") },
                  { value: "forms", label: tx("ฟอร์มพิเศษ") },
                ]} />
              </SheetHeader>
              <PanelBody>
                {tab === "overview" && <FamilyOverview family={f} kids={kids} onOpen={setStudentOpen} onGoBilling={() => setTab("billing")} />}
                {tab === "info" && <FamilyInfoTab f={f} kids={kids} onOpenStudent={setStudentOpen} onAddParent={() => pick({ kind: "newParent" })} onGoBilling={() => setTab("billing")} />}
                {tab === "billing" && <FamilyBillingTab kids={kids} />}
                {tab === "courses" && <FamilyClassTab kids={kids} />}
                {tab === "exams" && <StudentExams students={kids} />}
                {tab === "notes" && <FamilyNotesTab kids={kids} />}
                {tab === "forms" && (
                  <div className="space-y-3">
                    <p className="rounded-2xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{tx("ฟอร์มของครอบครัวนี้ — ดูว่ามีข้อมูลอะไรอยู่แล้ว ส่งแล้วได้อะไรกลับมา · ฟอร์มที่บริษัทสร้างเอง (ตั้งค่า › ฟอร์ม) อยู่ด้านล่าง · Test / Trial อยู่ในแผง Lead")}</p>
                    <EnrollFormCard family={f} />
                    <FamilyForms family={f} />
                  </div>
                )}
              </PanelBody>
              {/* Bottom = actions (owner 2026-10-09) · NEGATIVE-ACTIONS.md §2–3: archive / restore / delete */}
              {/* owner 2026-11-20: Bottom = ⋯ on the left (view as parent · edit · archive · delete), the one main action on the right (new invoice → pick a child or the whole family) */}
              <PanelFooter>
                <PanelMore items={[
                  // owner 2026-11-25: “แก้ไข” lives in ⋯ and asks WHO (family details · a guardian · a child) before opening anything
                  { label: tx("แก้ไข"), icon: PencilIcon, onClick: () => undefined, sub: <FamilyEditItems family={f} kids={kids} onPick={pick} /> },
                  { label: "ดูแบบผู้ปกครอง", icon: SmartphoneIcon, onClick: () => setParentApp(true) },
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
              <ReasonDialog open={archiving} title={`เก็บครอบครัว “${familyDisplay(f.name)}” เข้าคลัง`} description="ครอบครัวจะหายจากลิสต์ปกติแต่ประวัติยังอยู่ — เอากลับมาได้" onConfirm={(r) => report(archive(f.id, r), "เก็บครอบครัวเข้าคลังแล้ว")} onClose={() => setArchiving(false)} />
              <MathGate open={deleting} title={`ลบครอบครัว “${familyDisplay(f.name)}”`} warning="การลบนี้ย้อนกลับไม่ได้ — ครอบครัวนี้ยังไม่มีนักเรียนผูกอยู่" onConfirm={() => { if (report(del(f.id), "ลบครอบครัวแล้ว")) onClose() }} onClose={() => setDeleting(false)} />
            </>
          )}
      </EntityPanel>
      {invoice && <InvoiceSheet id={invoice} defaultStudentId={invoiceFor} onClose={() => { setInvoice(null); setInvoiceFor(undefined) }} />}
    </>
  )
}
