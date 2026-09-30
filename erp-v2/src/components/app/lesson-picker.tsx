"use client"

import { useState } from "react"
import { ChevronDownIcon, MergeIcon, PencilIcon, PlusIcon, Settings2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import * as Les from "@/domain/rules/lessons"
import type { ID, Result } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

type Item = { id: ID; name: string }

/**
 * Type-to-pick with create (owner 2026-09-30): a book or topic is typed once and picked by everyone after. The same
 * name in another case/spacing picks the existing one; a near miss asks "did you mean …?" before creating.
 */
export function CatalogCombo({ label, items, value, onChange, onCreate, disabled, placeholder, onManage }: {
  label: string
  items: Item[]
  value?: ID
  onChange: (id: ID | undefined) => void
  onCreate: (name: string) => Result<Item>
  disabled?: boolean
  placeholder?: string
  onManage?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const current = items.find((x) => x.id === value)
  const n = Les.normalizeName(q)
  const list = items.filter((x) => !n || Les.normalizeName(x.name).includes(n)).slice(0, 30)
  const same = q ? Les.findSame(items, q) : undefined
  const similar = q && !same ? Les.findSimilar(items, q) : []
  const pick = (id: ID | undefined) => { onChange(id); setOpen(false); setQ("") }
  const create = () => { const r = onCreate(q); if (report(r, (v) => `เพิ่ม "${v.name}" แล้ว — ครูคนอื่นเลือกใช้ได้ด้วย`)) pick(r.value.id) }

  return (
    <div className="relative">
      {/* shadcn field look: the label is the placeholder, no floating caption (owner 2026-09-30) */}
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} aria-label={label} title={current ? `${label}: ${current.name}` : undefined}
        className="flex h-9 w-full items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 text-left text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50">
        <span className={cn("flex-1 truncate", !current && "text-muted-foreground")}>{current?.name ?? placeholder ?? label}</span>
        <ChevronDownIcon className="size-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-11 z-30 space-y-1 rounded-xl border bg-popover p-1.5 shadow-lg">
          <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="ค้นหา หรือพิมพ์ชื่อใหม่"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (same) pick(same.id); else if (q.trim() && !similar.length) create() } if (e.key === "Escape") setOpen(false) }} />
          <ul className="max-h-56 overflow-y-auto">
            {current && <li><button type="button" className="w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted" onClick={() => pick(undefined)}>— ไม่ระบุ —</button></li>}
            {list.map((x) => (
              <li key={x.id}><button type="button" onClick={() => pick(x.id)} className={cn("w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted", x.id === value && "bg-primary/10 font-medium text-primary")}>{x.name}</button></li>
            ))}
            {!list.length && !q && <li className="px-2 py-1.5 text-xs text-muted-foreground">ยังไม่มีรายการ — พิมพ์ชื่อเพื่อสร้าง</li>}
          </ul>
          {similar.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              ใช่อันนี้ไหม? {similar.map((x) => <button key={x.id} type="button" className="mr-1 font-semibold underline" onClick={() => pick(x.id)}>{x.name}</button>)}
            </div>
          )}
          {q.trim() && !same && (
            <button type="button" onClick={create} className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-sm text-primary hover:bg-primary/5">
              <PlusIcon className="size-4" /> สร้าง &quot;{Les.cleanName(q)}&quot;{similar.length > 0 && " (ชื่อไม่ซ้ำจริง)"}
            </button>
          )}
          {onManage && <button type="button" onClick={() => { setOpen(false); onManage() }} className="flex w-full items-center gap-1.5 border-t px-2 pt-1.5 text-xs text-muted-foreground hover:text-foreground"><Settings2Icon className="size-3.5" /> จัดการรายการ (แก้ชื่อ / รวมที่ซ้ำ)</button>}
        </div>
      )}
    </div>
  )
}

/** Teachers tidy the catalog themselves: rename, or merge a duplicate into the one to keep (summaries move along). */
export function CatalogManager({ kind, items, onClose }: { kind: "book" | "topic"; items: Item[]; onClose: () => void }) {
  const rename = useStore((s) => s.renameLessonItem)
  const merge = useStore((s) => s.mergeLessonItem)
  const [editing, setEditing] = useState<ID | null>(null)
  const [name, setName] = useState("")
  const [merging, setMerging] = useState<ID | null>(null)
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>จัดการ{kind === "book" ? "หนังสือ" : "บทเรียน"}</DialogTitle>
          <DialogDescription>แก้ชื่อแล้วทุกสรุปที่ใช้อยู่เปลี่ยนตาม · รายการซ้ำให้ &quot;รวมเข้ากับ&quot; อันที่จะเก็บไว้</DialogDescription>
        </DialogHeader>
        <ul className="divide-y rounded-xl border">
          {items.map((x) => (
            <li key={x.id} className="space-y-1.5 p-2 text-sm">
              {editing === x.id ? (
                <div className="flex gap-1.5">
                  <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
                  <Button size="sm" onClick={() => report(rename(kind, x.id, name), "แก้ชื่อแล้ว") && setEditing(null)}>บันทึก</Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>ยกเลิก</Button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="flex-1">{x.name}</span>
                  <Button size="icon-xs" variant="ghost" aria-label="แก้ชื่อ" onClick={() => { setEditing(x.id); setName(x.name); setMerging(null) }}><PencilIcon /></Button>
                  {items.length > 1 && <Button size="xs" variant="ghost" onClick={() => setMerging(merging === x.id ? null : x.id)}><MergeIcon /> รวมเข้ากับ…</Button>}
                </div>
              )}
              {merging === x.id && (
                <div className="flex flex-wrap gap-1.5 rounded-lg bg-muted/50 p-2 text-xs">
                  <span className="w-full text-muted-foreground">ย้ายทุกสรุปของ &quot;{x.name}&quot; ไปที่ แล้วลบอันนี้:</span>
                  {items.filter((y) => y.id !== x.id).map((y) => (
                    <button key={y.id} type="button" className="rounded-full border bg-background px-2.5 py-1 hover:border-primary"
                      onClick={() => report(merge(kind, x.id, y.id), (v) => `รวมแล้ว · ย้าย ${v.moved} สรุป`) && setMerging(null)}>{y.name}</button>
                  ))}
                </div>
              )}
            </li>
          ))}
          {!items.length && <li className="p-4 text-center text-sm text-muted-foreground">ยังไม่มีรายการ</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
