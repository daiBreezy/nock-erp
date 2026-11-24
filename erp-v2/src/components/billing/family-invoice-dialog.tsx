"use client"

import { familyDisplay } from "@/domain/rules/people"
import { useMemo, useState } from "react"
import { CheckIcon, UsersRoundIcon, UserRoundSearchIcon } from "lucide-react"
import { GradeCell, Pager, usePage } from "@/components/app/data-table"
import { SearchBox } from "@/components/app/page-layout"
import { avatarTone, gradeTone, initial } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { fmtDate } from "@/domain/dates"
import { lastPaidInvoice } from "@/domain/rules/billing"
import type { ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * Create invoices for a whole family (owner 2026-11-05): pick any child → the family's children at this branch → tick who
 * renews. Each gets a Draft from their last invoice and all are linked as ONE set from the start (one panel, one PDF,
 * one message, one slip). A child with no earlier invoice is added to the set afterwards from the set's panel.
 */
export function FamilyInvoiceDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (firstId: ID) => void }) {
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const invoices = useStore((s) => s.invoices)
  const create = useStore((s) => s.createFamilyBundle)
  const createBlank = useStore((s) => s.createBlankFamilyBundle)
  const [picking, setPicking] = useState(true)
  const [studentId, setStudentId] = useState<ID | null>(null)
  const [picked, setPicked] = useState<ID[]>([])
  const seed = students.find((s) => s.id === studentId)
  const fam = families.find((f) => f.id === seed?.familyId)
  const kids = seed?.familyId ? students.filter((s) => s.familyId === seed.familyId && s.branchId === seed.branchId) : seed ? [seed] : []
  const choose = (id: ID) => {
    setStudentId(id)
    const st = students.find((s) => s.id === id)
    const ks = st?.familyId ? students.filter((s) => s.familyId === st.familyId && s.branchId === st.branchId) : st ? [st] : []
    setPicked(ks.map((k) => k.id))
  }
  const submit = () => {
    // owner 2026-11-20: a child with no earlier invoice is fine — the set starts as blank Drafts and the courses are filled in after
    if (picked.some((id) => !lastPaidInvoice(id, invoices))) {
      const b = createBlank(picked)
      if (!b.ok) { report(b, ""); return }
      report({ ok: true, value: undefined }, `สร้างชุดครอบครัว ${b.value.created.length} ใบ (ใบเปล่า) แล้ว — เติมคอร์สให้ลูกแต่ละคน`)
      onCreated(b.value.created[0].id); onClose()
      return
    }
    const sources = picked.map((id) => lastPaidInvoice(id, invoices)!.id)
    const r = create(sources)
    if (!r.ok) { report(r, ""); return }
    const { created, failed } = r.value
    report({ ok: true, value: undefined }, `สร้าง Draft ${created.length} ใบแล้ว${created.length > 1 ? " · ผูกเป็นชุดครอบครัว" : ""}${failed.length ? ` · ไม่สำเร็จ ${failed.length} ใบ: ${failed[0].error}` : ""}`)
    if (created[0]) { onCreated(created[0].id); onClose() }
  }
  return (
    <>
      {picking && <FamilyPicker onClose={() => (studentId ? setPicking(false) : onClose())} onConfirm={(firstKidId) => { choose(firstKidId); setPicking(false) }} />}
      {!picking && (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
          <DialogContent className="lg:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><UsersRoundIcon className="size-4" /> สร้างใบแจ้งหนี้ทั้งครอบครัว</DialogTitle>
              <DialogDescription>{fam ? famLabel(fam.name) : "ยังไม่ผูกครอบครัว"} — ติ๊กลูกที่อยู่ในชุด — ถ้าทุกคนมีใบเดิม ระบบสร้าง Draft จากใบล่าสุด · ถ้ามีคนยังไม่เคยมีใบ ทั้งชุดเริ่มเป็นใบเปล่าให้เติมคอร์สเอง (ผูกเป็นชุดเดียว ส่ง อนุมัติ รับเงินพร้อมกัน)</DialogDescription>
            </DialogHeader>
            <div className="divide-y rounded-lg border">
              {kids.map((k) => {
                const last = lastPaidInvoice(k.id, invoices)
                return (
                  <label key={k.id} className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-muted/40">
                    <Checkbox checked={picked.includes(k.id)} onCheckedChange={(v) => setPicked(v ? [...picked, k.id] : picked.filter((x) => x !== k.id))} />
                    <span className="font-medium">{k.nickname}</span>
                    <GradeCell grade={k.grade} tone={gradeTone(k.grade)} />
                    <span className="ml-auto text-xs text-muted-foreground">{last ? `ต่อจากใบ ${fmtDate(last.createdAt.slice(0, 10))}` : "ยังไม่มีใบเดิม — ใบเปล่า เติมคอร์สทีหลัง"}</span>
                  </label>
                )
              })}
            </div>
            <DialogFooter className="items-center">
              <Button variant="ghost" className="mr-auto" onClick={() => setPicking(true)}><UserRoundSearchIcon /> เปลี่ยนนักเรียน</Button>
              <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
              <Button disabled={picked.length === 0} onClick={submit}>สร้าง Draft ({picked.length})</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}

/**
 * owner 2026-11-20: a family invoice is for families with TWO OR MORE children — only those are listed, by family name,
 * with how many children and each one's nickname + grade. Search + paging keep it light for a big branch.
 */
function FamilyPicker({ onConfirm, onClose }: { onConfirm: (firstKidId: ID) => void; onClose: () => void }) {
  const branch = useBranch()
  const students = useStore((s) => s.students)
  const families = useStore((s) => s.families)
  const [q, setQ] = useState("")
  const [picked, setPicked] = useState<ID | null>(null)
  const all = useMemo(() => {
    const by = new Map<ID, typeof students>()
    for (const st of students) if (st.familyId && st.branchId === branch.id) by.set(st.familyId, [...(by.get(st.familyId) ?? []), st])
    return families
      .map((f) => ({ f, kids: (by.get(f.id) ?? []).slice().sort((a, b) => branch.grades.indexOf(b.grade) - branch.grades.indexOf(a.grade) || a.nickname.localeCompare(b.nickname, "th")) }))
      .filter((r) => r.kids.length >= 2)
      .sort((a, b) => a.f.name.localeCompare(b.f.name, "th"))
  }, [students, families, branch.id, branch.grades])
  const rows = useMemo(() => {
    const k = q.trim().toLowerCase()
    return k ? all.filter((r) => `${r.f.name} ${r.kids.map((c) => `${c.name} ${c.nickname}`).join(" ")}`.toLowerCase().includes(k)) : all
  }, [all, q])
  const page = usePage(rows, 30)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-3 lg:max-w-lg">
        <DialogHeader className="flex-row items-center gap-2 border-b pb-3">
          <UsersRoundIcon className="size-5" />
          <DialogTitle>เลือกครอบครัว</DialogTitle>
        </DialogHeader>
        <SearchBox value={q} onChange={(v) => { setQ(v); page.setPage(0) }} placeholder="ค้นหาชื่อครอบครัว / ชื่อลูก" block autoFocus />
        <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
          {page.rows.map((r) => {
            const sel = picked === r.f.id
            return (
              <li key={r.f.id}>
                <Button variant="row" size="inline" type="button" aria-pressed={sel} onClick={() => setPicked(r.f.id)} onDoubleClick={() => onConfirm(r.kids[0].id)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2.5 transition-colors">
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border-2", sel ? "border-primary" : "border-muted-foreground/50")}>{sel && <span className="size-2.5 rounded-full bg-primary" />}</span>
                  <span className={cn("grid size-10 shrink-0 place-items-center rounded-full font-semibold", avatarTone(r.f.id))}>{initial(r.f.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{famLabel(r.f.name)} <span className="text-xs font-normal text-muted-foreground">· {r.kids.length} คน</span></span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {r.kids.map((c) => <span key={c.id} className="inline-flex items-center gap-1 text-xs text-muted-foreground">{c.nickname}<span className={cn("rounded-full px-1.5 py-0.5 text-2xs font-medium", gradeTone(c.grade))}>{c.grade}</span></span>)}
                    </span>
                  </span>
                </Button>
              </li>
            )
          })}
          {rows.length === 0 && <li className="p-8 text-center text-sm text-muted-foreground">{all.length ? "ไม่พบ — ลองคำค้นอื่น" : "ยังไม่มีครอบครัวที่มีลูก 2 คนขึ้นไปในสาขานี้"}</li>}
        </ul>
        <Pager {...page} unit="ครอบครัว" />
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button disabled={!picked} onClick={() => { const r = all.find((x) => x.f.id === picked); if (r) onConfirm(r.kids[0].id) }}><CheckIcon /> ยืนยัน</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** family names are stored as "ครอบครัวXXX" already (seed) — add the word only when it is missing */
const famLabel = familyDisplay
