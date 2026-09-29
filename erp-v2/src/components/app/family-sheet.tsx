"use client"

import { useState } from "react"
import { CopyIcon, MessageCircleIcon, PencilIcon, UserPlusIcon } from "lucide-react"
import { toast } from "sonner"
import { Pill } from "@/components/app/badges"
import { StudentForm } from "@/components/app/student-form"
import { StudentSheet } from "@/components/app/student-sheet"
import { gradeTone } from "@/components/app/subject-color"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { fmtDateTime } from "@/domain/dates"
import { lineCodeValid } from "@/domain/rules/people"
import type { Family, ID } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useBranch, useNow } from "@/lib/hooks"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/**
 * Family detail panel: parents + LINE linking (Flow E: one code per family, 7-day expiry) + children.
 * Shared by /families and the Inbox side-panel button so a family's contact info lives in exactly one
 * place, never a second hand-rolled summary that can drift out of sync with it.
 */
export function FamilySheet({ id, onClose, onEdit }: { id: ID | null; onClose: () => void; onEdit: (f: Family) => void }) {
  const branch = useBranch()
  const f = useStore((s) => s.families.find((x) => x.id === id))
  const kids = useStore((s) => s.students).filter((s) => s.familyId === id)
  const genCode = useStore((s) => s.generateLineCode)
  const simulate = useStore((s) => s.simulateLineLink)
  const now = useNow()
  const [addChild, setAddChild] = useState(false)
  const [studentOpen, setStudentOpen] = useState<ID | null>(null)
  const code = f?.lineCode && lineCodeValid(f, now).ok ? f.lineCode : null

  return (
    <>
      <Sheet open={!!f} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-md">
          {f && (
            <>
              <SheetHeader className="border-b pb-3">
                <SheetTitle className="text-lg">{f.name}</SheetTitle>
                <SheetDescription>{f.address ? `${f.address}${f.postcode ? ` ${f.postcode}` : ""}` : "ยังไม่มีที่อยู่"}</SheetDescription>
                <Button size="xs" variant="outline" className="w-fit" onClick={() => onEdit(f)}><PencilIcon /> แก้ไขครอบครัว</Button>
              </SheetHeader>
              <div className="space-y-5 px-4 pt-5 pb-6">
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">ผู้ปกครอง</h3>
                  <ul className="divide-y rounded-2xl border">
                    {f.parents.map((p, i) => (
                      <li key={i} className="flex flex-wrap items-center gap-2 p-2.5 text-sm">
                        <span className="font-medium">{p.name}</span>{p.primary && <span className="text-xs text-muted-foreground">(หลัก)</span>}
                        <span className="text-muted-foreground tabular-nums">{p.phone}</span>
                        <Pill tone={p.lineLinked ? "green" : "amber"} className="ml-auto">{p.lineLinked ? "LINE แล้ว" : "ยังไม่ผูก LINE"}</Pill>
                        {code && !p.lineLinked && <Button size="xs" variant="ghost" title="จำลอง: ผู้ปกครองส่งโค้ดเข้า LINE OA" onClick={() => report(simulate(f.id, i), `${p.name} ผูก LINE แล้ว`)}>จำลองส่งโค้ด</Button>}
                      </li>
                    ))}
                  </ul>
                  {!branch.lineOaConnected ? (
                    <p className="text-xs text-muted-foreground">สาขานี้ยังไม่เชื่อม LINE OA — ตั้งค่าที่ Settings → LINE Integration</p>
                  ) : !f.parents.every((p) => p.lineLinked) && (
                    code ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/60 p-2 text-sm">
                        <MessageCircleIcon className="size-4 text-emerald-600" />
                        โค้ดผูก LINE: <b className="font-mono tracking-widest">{code.code}</b>
                        <span className="text-xs text-muted-foreground">หมดอายุ {fmtDateTime(code.expiresAt)}</span>
                        <Button size="icon-xs" variant="ghost" aria-label="คัดลอก" onClick={() => { navigator.clipboard?.writeText(`แอด LINE ${branch.lineOa.botBasicId || "@nockacademy"} แล้วพิมพ์โค้ด ${code.code}`); toast.success("คัดลอกข้อความสำหรับส่งผู้ปกครองแล้ว") }}><CopyIcon /></Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => report(genCode(f.id), (v) => `สร้างโค้ด ${v.code} แล้ว (ใช้ได้ 7 วัน)`)}><MessageCircleIcon /> สร้างโค้ดผูก LINE</Button>
                    )
                  )}
                </section>
                <section className="space-y-2">
                  <div className="flex items-center"><h3 className="text-sm font-semibold">ลูก ({kids.length})</h3><Button size="xs" variant="ghost" className="ml-auto" onClick={() => setAddChild(true)}><UserPlusIcon /> เพิ่มลูก</Button></div>
                  <ul className="divide-y rounded-2xl border">
                    {kids.map((s) => (
                      <li key={s.id}>
                        <button onClick={() => setStudentOpen(s.id)} className="flex w-full items-center gap-2 p-2.5 text-left text-sm hover:bg-muted/40">
                          <span className="font-medium">{s.nickname}</span>
                          <span className={cn("rounded px-1 text-[10px]", gradeTone(s.grade))}>{s.grade}</span>
                          <span className="truncate text-xs text-muted-foreground">{s.name}</span>
                        </button>
                      </li>
                    ))}
                    {kids.length === 0 && <li className="p-4 text-center text-xs text-muted-foreground">ยังไม่มีลูกในครอบครัวนี้</li>}
                  </ul>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      {addChild && f && <StudentForm familyId={f.id} onClose={() => setAddChild(false)} />}
      <StudentSheet studentId={studentOpen} onClose={() => setStudentOpen(null)} />
    </>
  )
}
