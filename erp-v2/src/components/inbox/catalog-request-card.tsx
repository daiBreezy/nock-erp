"use client"

import { BookOpenIcon } from "lucide-react"
import type { CatalogRequestMeta, ChatMessage } from "@/domain/types"
import { useStore } from "@/store/store"

/**
 * A parent tapped "สนใจ" / "ขอนัดทดลองเรียน" in the course catalog (owner 2026-10-22). owner 2026-11-20: just a quiet one-line note in the chat — no buttons
 * (a parent can send many, and a button each meant one form per tap). Everything they tapped is collected in the Lead panel, where the admin ticks
 * as many courses as they like and sends ONE form.
 */
export function CatalogRequestCard({ message }: { message: ChatMessage }) {
  const meta = message.meta as CatalogRequestMeta
  const classes = useStore((s) => s.classes)
  const closed = !!meta.classId && !classes.some((c) => c.id === meta.classId)
  return (
    <div className="flex justify-start">
      <div className="flex max-w-lg items-center gap-2 rounded-full border bg-card py-1.5 pr-4 pl-2 text-sm shadow-sm">
        <span className="grid size-6 shrink-0 place-items-center rounded-full bg-muted"><BookOpenIcon className="size-3.5" /></span>
        <span className="min-w-0 truncate"><span className="text-muted-foreground">{meta.action === "trial" ? "ขอนัดทดลองเรียน" : "สนใจจาก Catalog"} · </span><span className="font-medium">{meta.className}</span></span>
        <span className="shrink-0 text-xs text-muted-foreground">{meta.when}{closed ? " · คลาสนี้ปิดไปแล้ว" : ""}</span>
      </div>
    </div>
  )
}
