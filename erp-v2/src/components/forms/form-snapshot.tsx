"use client"

import { useEffect } from "react"
import type { Family, ID, Student } from "@/domain/types"
import { useStore } from "@/store/store"
import { pullCustomFormResponses } from "@/lib/forms"
import { tx } from "@/lib/i18n"
import { FormCard, type FormActions } from "./form-card"
import { useFormItems } from "./use-form-items"

/**
 * owner 2026-11-26 — the overview's snapshot: every form that went out and is NOT done yet (waiting for the parent · to review · to close),
 * as collapsed cards. Gone from here the moment it is done — it stays in "ฟอร์มทั้งหมด". With `studentId` only that child's forms show.
 * Nothing open = nothing drawn (no empty box).
 */
export function FormSnapshot({ family, studentId, actions, className }: { family: Family; studentId?: ID; actions?: FormActions; className?: string }) {
  useEffect(() => { pullCustomFormResponses() }, [])
  const { items, subs } = useFormItems(family)
  const open = items.filter((x) => x.open && (!studentId || x.studentIds.includes(studentId)) && !(studentId && x.kind === "exit"))
  if (!open.length) return null
  return (
    <section className={`space-y-2 ${className ?? ""}`}>
      <h3 className="text-sm font-semibold">{tx("ฟอร์มที่ยังไม่จบงาน")} <span className="font-normal text-muted-foreground">({open.length})</span></h3>
      {open.map((it) => <FormCard key={it.key} item={it} family={family} sub={subs.find((x) => x.id === it.subId)} actions={actions} />)}
    </section>
  )
}

/** the same snapshot on ONE child's overview — only that child's forms (their exit notice already has its own panel there) */
export function StudentFormSnapshot({ stu }: { stu: Student }) {
  const family = useStore((s) => s.families.find((f) => f.id === stu.familyId))
  if (!family) return null
  return <FormSnapshot family={family} studentId={stu.id} className="mb-4" />
}
