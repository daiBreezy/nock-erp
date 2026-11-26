"use client"

import { useState } from "react"
import { CheckIcon, StarIcon, UserPlusIcon } from "lucide-react"
import { NativeSelect } from "@/components/app/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PARENT_RELATIONS, parentIndexOfAccount, familyDisplay } from "@/domain/rules/people"
import type { Conversation, Family, LinkWho } from "@/domain/types"
import { tx } from "@/lib/i18n"
import { cn } from "@/lib/utils"

/**
 * owner 2026-11-20: ONE family holds several LINE accounts (dad · mum · an aunt). Linking a chat to a family asks WHO this account is —
 * a guardian already in the family, or a new relative added as a guardian. Each account belongs to one person and never overwrites another's.
 */
export function LinkWhoDialog({ conversation, family, onConfirm, onClose }: { conversation: Conversation; family: Family; onConfirm: (who: LinkWho) => void; onClose: () => void }) {
  const account = conversation.id.startsWith("line_") ? conversation.id.slice(5) : ""
  const current = parentIndexOfAccount(family, account)
  const taken = (i: number) => !!family.parents[i].lineUserId || (family.lineUserId && parentIndexOfAccount(family, family.lineUserId) === i)
  const firstFree = family.parents.findIndex((_, i) => !taken(i))
  // default: this chat's current guardian, else the first guardian with no LINE yet, else "someone new"
  const [pick, setPick] = useState<number | "new">(current >= 0 ? current : firstFree >= 0 ? firstFree : "new")
  const [name, setName] = useState(conversation.lineName ?? conversation.name)
  const [relation, setRelation] = useState<string>("ญาติ")
  const ok = pick !== "new" || name.trim().length > 0
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-sm">
        <DialogHeader>
          <DialogTitle>{tx("แชท LINE นี้คือใคร?")}</DialogTitle>
          <DialogDescription>{tx("{0} ผูกได้หลายบัญชี LINE (พ่อ · แม่ · ญาติ) — เลือกว่าบัญชีนี้เป็นของใคร", [familyDisplay(family.name)])}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          {family.parents.map((p, i) => (
            <Button key={i} type="button" variant="outline" aria-pressed={pick === i} onClick={() => setPick(i)} className="h-auto justify-start gap-2 py-2 text-left">
              {pick === i ? <CheckIcon className="size-4 text-primary" /> : <span className="size-4" />}
              <span className="min-w-0 flex-1 truncate">{p.name}{p.relationship && <span className="text-muted-foreground"> · {p.relationship}</span>}</span>
              {p.primary && <StarIcon className="size-3.5 shrink-0 fill-muted-foreground/40 text-muted-foreground/60" />}
              {taken(i) && i !== current && <span className="shrink-0 text-xs text-muted-foreground">{tx("มี LINE แล้ว")}</span>}
            </Button>
          ))}
          <Button type="button" variant="outline" aria-pressed={pick === "new"} onClick={() => setPick("new")} className={cn("h-auto justify-start gap-2 py-2 text-left")}>
            {pick === "new" ? <CheckIcon className="size-4 text-primary" /> : <UserPlusIcon className="size-4" />}
            <span className="flex-1">{tx("คนอื่น — เพิ่มเป็นผู้ปกครองใหม่")}</span>
          </Button>
          {pick === "new" && (
            <div className="grid gap-2 pl-6">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={tx("ชื่อ")} />
              <NativeSelect value={relation} onChange={(e) => setRelation(e.target.value)} options={PARENT_RELATIONS.map((r) => ({ value: r, label: r }))} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{tx("ยกเลิก")}</Button>
          <Button disabled={!ok} onClick={() => onConfirm(pick === "new" ? { newParent: { name: name.trim(), relationship: relation } } : { parentIndex: pick })}>{tx("ผูก LINE")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
