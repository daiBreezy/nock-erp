"use client"

import { ChevronDownIcon, PencilIcon, PlusIcon, StarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import type { Family, ID, Student } from "@/domain/types"
import { tx } from "@/lib/i18n"

/** owner 2026-11-25: "แก้ไข" asks WHO first — the family's own details, one guardian, a new guardian, or one child — and opens just that. */
export type EditTarget = { kind: "family" } | { kind: "parent"; index: number } | { kind: "newParent" } | { kind: "student"; id: ID } | { kind: "newStudent" }

/** the “who?” list — used inside a submenu of a panel's ⋯ or in a menu of its own */
export function FamilyEditItems({ family, kids, onPick }: { family: Pick<Family, "parents">; kids: Pick<Student, "id" | "nickname" | "name" | "grade">[]; onPick: (t: EditTarget) => void }) {
  return (
    <>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{tx("แก้ไขใคร?")}</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onPick({ kind: "family" })}>{tx("ครอบครัว")} <span className="text-xs text-muted-foreground">· {tx("ที่อยู่ · ใบกำกับภาษี ฯลฯ")}</span></DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{tx("ผู้ปกครอง")}</DropdownMenuLabel>
          {family.parents.map((p, i) => <DropdownMenuItem key={i} onClick={() => onPick({ kind: "parent", index: i })}>{p.name}{(p as { primary?: boolean }).primary && <StarIcon className="size-3 text-muted-foreground" />}</DropdownMenuItem>)}
          <DropdownMenuItem onClick={() => onPick({ kind: "newParent" })}><PlusIcon /> {tx("เพิ่มผู้ปกครอง")}</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{tx("นักเรียน")}</DropdownMenuLabel>
          {kids.map((k) => <DropdownMenuItem key={k.id} onClick={() => onPick({ kind: "student", id: k.id })}>{k.nickname || k.name}{k.grade && <span className="text-xs text-muted-foreground">· {k.grade}</span>}</DropdownMenuItem>)}
          <DropdownMenuItem onClick={() => onPick({ kind: "newStudent" })}><PlusIcon /> {tx("เพิ่มนักเรียน")}</DropdownMenuItem>
        </DropdownMenuGroup>
    </>
  )
}

export function FamilyEditMenu({ family, kids, onPick, disabled, className }: { family: Pick<Family, "parents">; kids: Pick<Student, "id" | "nickname" | "name" | "grade">[]; onPick: (t: EditTarget) => void; disabled?: boolean; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" disabled={disabled} className={className} />}><PencilIcon /> {tx("แก้ไข")} <ChevronDownIcon className="text-muted-foreground" /></DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" className="w-max min-w-56 max-w-sm">
        <FamilyEditItems family={family} kids={kids} onPick={onPick} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
