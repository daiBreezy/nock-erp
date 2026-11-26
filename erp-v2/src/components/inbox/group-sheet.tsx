"use client"

// A LINE group belongs to ONE family, but who is in it is a mix (owner 2026-11-12): guardians and students who are in the
// ERP, and relatives (an uncle, an aunt) who only follow the news and must NOT become family members. So staff say, per
// LINE member, who they are — the role is kept on the conversation, never forced onto the family.
// Side panel like every other entity (Header · Body · Bottom — owner 2026-10-09), not a popup.
import { familyDisplay } from "@/domain/rules/people"
import { useMemo, useState } from "react"
import { LinkIcon, UsersIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { NativeSelect } from "@/components/app/native-select"
import { Pill } from "@/components/app/badges"
import { CustomerPicker } from "@/components/app/customer-picker"
import { EntityPanel, PanelBody, PanelFooter } from "@/components/app/form-shell"
import { InfoTip } from "@/components/app/info-tip"
import { avatarTone, initial } from "@/components/app/subject-color"
import { groupFamilyCandidates, groupMemberLabel, groupSenders, MEMBER_ROLE_LABEL } from "@/domain/rules/inbox"
import type { Conversation } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** `parent:2` · `student:<id>` · `follower` · "" (not said yet) */
const roleValue = (conv: Conversation, userId: string, parentIdx: number) => {
  const r = conv.members?.[userId]
  return !r ? "" : r.kind === "parent" ? `parent:${parentIdx}` : r.kind === "student" ? `student:${r.studentId}` : "follower"
}

export function GroupSheet({ conversationId, onClose }: { conversationId: string; onClose: () => void }) {
  const conv = useStore((s) => s.conversations.find((c) => c.id === conversationId))
  const messages = useStore((s) => s.messages)
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const linkGroup = useStore((s) => s.linkGroupToFamily)
  const setMember = useStore((s) => s.setGroupMember)
  const [picking, setPicking] = useState(false)

  const family = conv?.familyId ? families.find((f) => f.id === conv.familyId) : undefined
  const kids = useMemo(() => (family ? students.filter((x) => x.familyId === family.id && !x.archived) : []), [family, students])
  const senders = useMemo(() => groupSenders(messages, conversationId), [messages, conversationId])
  // people the ERP already knows may belong to different families → it can't pick one by itself, staff choose
  const candidates = useMemo(() => (family ? [] : groupFamilyCandidates(senders, families).map((id) => families.find((f) => f.id === id)).filter((f) => !!f)), [family, senders, families])
  if (!conv) return null

  const options = [
    { value: "", label: "ยังไม่ระบุ" },
    ...(family?.parents ?? []).map((p, i) => ({ value: `parent:${i}`, label: `ผู้ปกครอง · ${p.name}${p.relationship ? ` (${p.relationship})` : ""}`, group: "ในครอบครัว" })),
    ...kids.map((k) => ({ value: `student:${k.id}`, label: `นักเรียน · ${k.nickname || k.name}`, group: "ในครอบครัว" })),
    { value: "follower", label: "ผู้ติดตามข่าว (ญาติ — ไม่ใช่สมาชิก ERP)", group: "นอกครอบครัว" },
  ]
  const change = (userId: string, v: string) => {
    const [kind, ref] = v.split(":")
    const role = !v ? null : kind === "parent" ? ({ kind: "parent", parentIndex: Number(ref) } as const) : kind === "student" ? ({ kind: "student", studentId: ref } as const) : ({ kind: "follower" } as const)
    report(setMember(conversationId, userId, role), "บันทึกแล้ว")
  }

  return (
    <>
      <EntityPanel open onClose={onClose}>
        <SheetHeader className="shrink-0 border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"><UsersIcon className="size-4" /></span>
            <SheetTitle className="truncate text-lg">{conv.name}</SheetTitle>
            <Pill tone="gray">แชทกลุ่ม</Pill>
            {family && <Pill tone="green">{familyDisplay(family.name)}</Pill>}
          </div>
          <SheetDescription>{senders.length ? `มีคนพิมพ์ ${senders.length} คน` : "ยังไม่มีใครพิมพ์ในกลุ่ม"}</SheetDescription>
        </SheetHeader>

        <PanelBody>
          <section className="space-y-2">
            <h3 className="flex items-center gap-1 text-sm font-semibold">ครอบครัว <InfoTip text="กลุ่ม LINE หนึ่งกลุ่มผูกกับครอบครัวเดียว — ผูกแล้วถึงจะส่งฟอร์ม / Catalog เข้ากลุ่มได้" /></h3>
            {family ? <Pill tone="green">{familyDisplay(family.name)}</Pill> : <p className="text-sm text-muted-foreground">ยังไม่ผูก</p>}
            {candidates.length > 1 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">คนในกลุ่มมาจากหลายครอบครัว — เลือก:</span>
                {candidates.map((f) => <Button key={f!.id} size="xs" variant="outline" onClick={() => report(linkGroup(conversationId, f!.id), "ผูกกลุ่มกับครอบครัวแล้ว")}>{f!.name}</Button>)}
              </div>
            )}
          </section>

          <section className="space-y-2 border-t pt-4">
            <h3 className="flex items-center gap-1 text-sm font-semibold">คนในกลุ่ม ({senders.length}) <InfoTip text="“ผู้ติดตามข่าว” = ญาติที่อยากเห็นข่าวสารเฉยๆ · ไม่ถูกเพิ่มเป็นสมาชิกครอบครัวใน ERP" /></h3>
            {senders.length === 0 && <p className="text-sm text-muted-foreground">จะขึ้นชื่อเมื่อมีคนพิมพ์ในกลุ่ม</p>}
            <ul className="divide-y rounded-2xl border">
              {senders.map((s) => {
                const parentIdx = family?.parents.findIndex((p) => p.lineUserId === s.userId) ?? -1
                const shown = groupMemberLabel(conv, s, family, kids)
                return (
                  <li key={s.userId} className="flex flex-wrap items-center gap-2 p-2.5">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold", avatarTone(s.userId))}>{initial(shown.name)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{shown.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{shown.name !== s.name ? `LINE: ${s.name}` : shown.role ? MEMBER_ROLE_LABEL[shown.role] : "ยังไม่ระบุ"}</div>
                    </div>
                    <NativeSelect aria-label={`ระบุว่า ${s.name} เป็นใคร`} className="w-full sm:w-56 sm:shrink-0" value={roleValue(conv, s.userId, parentIdx)} options={options} onChange={(e) => change(s.userId, e.target.value)} />
                  </li>
                )
              })}
            </ul>
          </section>
        </PanelBody>

        <PanelFooter>
          <Button className="ml-auto" onClick={() => setPicking(true)}><LinkIcon /> {family ? "เปลี่ยนครอบครัว" : "ผูกกับครอบครัว"}</Button>
        </PanelFooter>
      </EntityPanel>
      {picking && (
        <CustomerPicker kinds={["family"]} title="ผูกกลุ่มนี้กับครอบครัว" onClose={() => setPicking(false)}
          onConfirm={(row) => { if (report(linkGroup(conversationId, row.id), "ผูกกลุ่มกับครอบครัวแล้ว")) setPicking(false) }} />
      )}
    </>
  )
}
