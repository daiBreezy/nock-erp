import { tagChip } from "@/components/app/tags"
import { cn } from "@/lib/utils"

const LABEL = { lead: "Lead", family: "ครอบครัว", student: "นักเรียน" } as const

/** Says what a side panel is about — Lead, family or student — so the three panels are never mistaken for each other. */
export function EntityTag({ kind, className }: { kind: keyof typeof LABEL; className?: string }) {
  return <span className={cn("inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap", tagChip("entity", kind), className)}>{LABEL[kind]}</span>
}
