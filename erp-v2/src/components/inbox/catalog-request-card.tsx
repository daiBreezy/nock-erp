"use client"

import { BookOpenIcon, CalendarPlusIcon, UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { enrollClassOffers } from "@/domain/rules/forms"
import type { CatalogRequestMeta, ChatMessage, ID } from "@/domain/types"
import { sendEnrollToChat } from "@/lib/forms"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/**
 * A parent tapped "สนใจ" / "ขอนัดทดลองเรียน" in the course catalog (owner 2026-10-22) — the card shows which class,
 * with the next step one tap away: send the Trial form (that subject picked) or the enroll form offering that class.
 */
export function CatalogRequestCard({ message, linked, onTrial, onLink }: { message: ChatMessage; linked: boolean; onTrial: (subjects: string[]) => void; onLink: () => void }) {
  const meta = message.meta as CatalogRequestMeta
  const classes = useStore((s) => s.classes)
  const staff = useStore((s) => s.staff)
  const k = classes.find((c) => c.id === meta.classId)
  const sendEnroll = async () => {
    if (!k) return
    const offer = enrollClassOffers(classes, k.branchId, (id: ID) => staff.find((x) => x.id === id)?.nickname ?? "").find((o) => o.id === k.id)
    report(await sendEnrollToChat(message.conversationId, offer ? [offer] : []), "ส่งใบสมัครเรียน (คลาสนี้) แล้ว")
  }
  return (
    <div className="flex justify-start">
      <div className="w-full max-w-sm space-y-2.5 rounded-3xl border bg-card p-3.5 text-sm shadow-sm">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted"><BookOpenIcon className="size-4" /></span>
          <div className="min-w-0">
            <p className="font-medium">{meta.action === "trial" ? "ขอนัดทดลองเรียน" : "สนใจจาก Catalog"}</p>
            <p className="truncate">{meta.className}</p>
            <p className="text-xs text-muted-foreground">{meta.when}{!k && meta.classId ? " · คลาสนี้ปิดไปแล้ว" : ""}</p>
          </div>
        </div>
        {linked ? (
          <div className="flex flex-wrap gap-1.5 pl-[2.875rem]">
            <Button size="sm" variant={meta.action === "trial" ? "default" : "outline"} onClick={() => onTrial(meta.subjects)}><CalendarPlusIcon /> ส่งฟอร์ม Trial</Button>
            {k && <Button size="sm" variant="outline" onClick={sendEnroll}><UserPlusIcon /> ส่งใบสมัคร (คลาสนี้)</Button>}
          </div>
        ) : (
          <div className="pl-[2.875rem]"><Button size="sm" variant="outline" onClick={onLink}>ผูกแชทกับ Lead / ครอบครัวก่อน</Button></div>
        )}
      </div>
    </div>
  )
}
