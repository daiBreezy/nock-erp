"use client"

import { useState } from "react"
import { CopyIcon, MessageCircleIcon, PlusIcon, SearchIcon, TrashIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Pill } from "@/components/app/badges"
import { Field, StudentForm } from "@/components/app/student-form"
import { StudentSheet } from "@/components/app/student-sheet"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { fmtDateTime } from "@/domain/dates"
import { lineCodeValid, validateFamily } from "@/domain/rules/people"
import type { Family, ID } from "@/domain/types"
import { uid } from "@/data/seed"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

export default function FamiliesPage() {
  const branch = useBranch()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const genCode = useStore((s) => s.generateLineCode)
  const simulate = useStore((s) => s.simulateLineLink)
  const now = useNow()
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Family | "new" | null>(null)
  const [addStudentTo, setAddStudentTo] = useState<ID | null>(null)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)

  const shown = families
    .filter((f) => students.some((s) => s.familyId === f.id && s.branchId === branch.id) || !students.some((s) => s.familyId === f.id))
    .filter((f) => !q || `${f.name} ${f.parents.map((p) => `${p.name} ${p.phone}`).join(" ")}`.includes(q))
  const orphans = students.filter((s) => s.branchId === branch.id && !s.familyId)

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-8" placeholder="ชื่อครอบครัว / ผู้ปกครอง / เบอร์" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button className="ml-auto" onClick={() => setEditing("new")}><PlusIcon /> เพิ่มครอบครัว</Button>
      </div>
      {orphans.length > 0 && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">นักเรียน {orphans.length} คนยังไม่ผูกครอบครัว ({orphans.map((s) => s.nickname).join(", ")}) — ส่งใบแจ้งหนี้/สรุปทาง LINE ไม่ได้</p>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        {shown.map((f) => {
          const kids = students.filter((s) => s.familyId === f.id)
          const linked = f.parents.some((p) => p.lineLinked)
          const code = f.lineCode && lineCodeValid(f, now).ok ? f.lineCode : null
          return (
            <div key={f.id} className="space-y-3 rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{f.name}</div>
                  <div className="text-xs text-muted-foreground">{f.address}{f.postcode && ` ${f.postcode}`}</div>
                </div>
                <Button size="xs" variant="outline" onClick={() => setEditing(f)}>แก้ไข</Button>
              </div>
              <div className="space-y-1 text-sm">
                {f.parents.map((p, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <span>{p.name}{p.primary && <span className="text-xs text-muted-foreground"> (หลัก)</span>}</span>
                    <span className="text-muted-foreground">{p.phone}</span>
                    <Pill tone={p.lineLinked ? "green" : "amber"}>{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                    {code && !p.lineLinked && (
                      <Button size="xs" variant="ghost" title="จำลอง: ผู้ปกครองส่งโค้ดเข้า LINE OA" onClick={() => report(simulate(f.id, i), `${p.name} ผูก LINE แล้ว`)}>จำลองส่งโค้ด</Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Flow E: one code per family, 7-day expiry, works for every parent */}
              {!branch.lineOaConnected ? (
                <p className="text-xs text-muted-foreground">สาขานี้ยังไม่เชื่อม LINE OA — ตั้งค่าที่หน้าตั้งค่าสาขา</p>
              ) : !f.parents.every((p) => p.lineLinked) && (
                code ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-2 text-sm">
                    <MessageCircleIcon className="size-4 text-emerald-600" />
                    โค้ดผูก LINE: <b className="font-mono tracking-widest">{code.code}</b>
                    <span className="text-xs text-muted-foreground">หมดอายุ {fmtDateTime(code.expiresAt)}</span>
                    <Button size="icon-xs" variant="ghost" aria-label="คัดลอก" onClick={() => { navigator.clipboard?.writeText(`แอด LINE @nockacademy แล้วพิมพ์โค้ด ${code.code}`); toast.success("คัดลอกข้อความสำหรับส่งผู้ปกครองแล้ว") }}><CopyIcon /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => report(genCode(f.id), (v) => `สร้างโค้ด ${v.code} แล้ว (ใช้ได้ 7 วัน)`)}>
                    <MessageCircleIcon /> {linked ? "สร้างโค้ดให้ผู้ปกครองคนอื่น" : "สร้างโค้ดผูก LINE"}
                  </Button>
                )
              )}

              <div className="flex flex-wrap items-center gap-1.5 border-t pt-2">
                {kids.map((s) => (
                  <button key={s.id} onClick={() => setStudentOpen(s.id)} className="rounded-full border px-2 py-0.5 text-xs hover:bg-muted">
                    {s.nickname} <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span>
                  </button>
                ))}
                <Button size="xs" variant="ghost" onClick={() => setAddStudentTo(f.id)}><UserPlusIcon /> เพิ่มลูก</Button>
              </div>
            </div>
          )
        })}
      </div>
      {editing && <FamilyForm family={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {addStudentTo && <StudentForm familyId={addStudentTo} onClose={() => setAddStudentTo(null)} />}
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </div>
  )
}

function FamilyForm({ family, onClose }: { family?: Family; onClose: () => void }) {
  const save = useStore((s) => s.saveFamily)
  const [f, setF] = useState<Family>(family ?? { id: uid("fa"), name: "", parents: [{ name: "", phone: "", lineLinked: false, primary: true }] })
  const [touched, setTouched] = useState(false)
  const errs = validateFamily(f)
  const err = (field: string) => touched && errs.find((e) => e.field === field)?.message
  const setParent = (i: number, patch: Partial<Family["parents"][number]>) => setF((x) => ({ ...x, parents: x.parents.map((p, j) => (j === i ? { ...p, ...patch } : patch.primary ? { ...p, primary: false } : p)) }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>{family ? `แก้ ${family.name}` : "เพิ่มครอบครัว"}</DialogTitle></DialogHeader>
        <Field label="ชื่อครอบครัว *" error={err("name")}><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="ครอบครัวสุขใจ" /></Field>
        <div className="space-y-2">
          {f.parents.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto_auto] items-end gap-2">
              <Field label={`ผู้ปกครอง ${i + 1}`} error={err(`parent${i}.name`)}><Input value={p.name} onChange={(e) => setParent(i, { name: e.target.value })} placeholder="คุณแม่ สุดา" /></Field>
              <Field label="เบอร์โทร" error={err(`parent${i}.phone`)}><Input inputMode="tel" value={p.phone} onChange={(e) => setParent(i, { phone: e.target.value })} placeholder="081-234-5678" /></Field>
              <label className="flex h-8 items-center gap-1 text-xs"><input type="radio" checked={p.primary} onChange={() => setParent(i, { primary: true })} /> หลัก</label>
              <Button size="icon-sm" variant="ghost" disabled={f.parents.length === 1} aria-label="ลบ" onClick={() => setF({ ...f, parents: f.parents.filter((_, j) => j !== i) })}><TrashIcon /></Button>
            </div>
          ))}
          <Button size="xs" variant="outline" onClick={() => setF({ ...f, parents: [...f.parents, { name: "", phone: "", lineLinked: false, primary: false }] })}><PlusIcon /> เพิ่มผู้ปกครอง</Button>
        </div>
        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <Field label="ที่อยู่"><Input value={f.address ?? ""} onChange={(e) => setF({ ...f, address: e.target.value })} /></Field>
          <Field label="รหัสไปรษณีย์" error={err("postcode")}><Input inputMode="numeric" maxLength={5} value={f.postcode ?? ""} onChange={(e) => setF({ ...f, postcode: e.target.value || undefined })} /></Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button onClick={() => { setTouched(true); if (report(save(f), "บันทึกครอบครัวแล้ว")) onClose() }}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
