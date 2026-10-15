"use client"

// Note Calendar UI (owner 2026-10-15) — the editor is shared by the calendar board and the session panel, where the
// notes can be added, edited and deleted too ("จัดการ Note จากตรงนี้ได้ด้วย").
import { useRef, useState } from "react"
import { CheckIcon, EllipsisIcon, PencilLineIcon, PinIcon, PlusIcon, StickyNoteIcon, Trash2Icon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { calendarNotesFor, CALENDAR_NOTE_MAX, NOTE_KIND_LABEL } from "@/domain/rules/calendar-notes"
import type { CalendarNoteKind, ID, Session } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"

/** add / edit one Note Calendar: text + ชั่วคราว | ถาวร. Enter or leaving the box saves, Esc cancels. */
export function NoteEditor({ text: initialText = "", kind: initialKind, canPermanent, onDone, className }: {
  className?: string; text?: string; kind: CalendarNoteKind; canPermanent: boolean; onDone: (text: string, kind: CalendarNoteKind) => void
}) {
  const [text, setText] = useState(initialText)
  const [kind, setKind] = useState<CalendarNoteKind>(initialKind)
  const box = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const finish = (t: string) => { if (done.current) return; done.current = true; onDone(t.trim(), kind) }
  const kinds: CalendarNoteKind[] = ["temporary", "permanent"]
  return (
    <div ref={box} className={cn("mt-1 space-y-1", className)} onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) finish(text) }}>
      <input autoFocus value={text} maxLength={CALENDAR_NOTE_MAX} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") finish(text); if (e.key === "Escape") finish("") }}
        placeholder="Note เช่น MBook 1 (2-4)" className="h-7 w-full min-w-0 rounded-full border bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/30" />
      <div className="flex items-center gap-1">
        {kinds.map((k) => (
          <button key={k} type="button" aria-pressed={kind === k} disabled={k === "permanent" && !canPermanent}
            title={k === "permanent" ? (canPermanent ? "แสดงทุกคาบของคลาสนี้" : "คาบนี้ไม่ได้อยู่ในคลาสประจำ") : "แสดงเฉพาะคาบนี้"}
            onClick={() => setKind(k)}
            className={cn("flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-medium disabled:opacity-40", kind === k ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "bg-muted text-muted-foreground hover:text-foreground")}>
            {k === "permanent" && <PinIcon className="size-3" />}{NOTE_KIND_LABEL[k]}
          </button>
        ))}
        <button type="button" onClick={() => finish(text)} aria-label="บันทึก Note" className="ml-auto grid size-6 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><CheckIcon className="size-3.5" /></button>
      </div>
    </div>
  )
}

/** one student's Note Calendar in a session — the panel version: list + ⋯ (edit / delete) + "Note" to add */
export function CalendarNotes({ s, studentId, canEdit }: { s: Session; studentId: ID; canEdit: boolean }) {
  const notes = calendarNotesFor(s, studentId, useStore((st) => st.calendarNotes))
  const add = useStore((st) => st.addCalendarNote)
  const edit = useStore((st) => st.editCalendarNote)
  const del = useStore((st) => st.deleteCalendarNote)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ID | null>(null)
  const canPermanent = !!s.classId
  return (
    <div className="space-y-0.5">
      {notes.map((n) => editing === n.id ? (
        <NoteEditor key={n.id} text={n.text} kind={n.kind} canPermanent={canPermanent || n.kind === "permanent"}
          onDone={(text, kind) => { setEditing(null); if (text && (text !== n.text || kind !== n.kind)) report(edit(n.id, s.id, text, kind), "แก้ Note แล้ว") }} />
      ) : (
        <div key={n.id} className="group/note flex min-w-0 items-center gap-1 text-xs text-foreground/80">
          {n.kind === "permanent" ? <PinIcon className="size-3 shrink-0 text-primary" aria-label="Note ถาวร" /> : <StickyNoteIcon className="size-3 shrink-0 text-muted-foreground" aria-label="Note ชั่วคราว" />}
          <button type="button" disabled={!canEdit} onClick={() => setEditing(n.id)} title={`Note ${NOTE_KIND_LABEL[n.kind]} · ${n.text}`} className={cn("min-w-0 truncate text-left", canEdit && "hover:underline")}>{n.text}</button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<button type="button" aria-label="จัดการ Note" className="grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground opacity-0 group-hover/note:opacity-100 hover:bg-muted focus-visible:opacity-100 data-[popup-open]:opacity-100" />}>
                <EllipsisIcon className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem onClick={() => setEditing(n.id)}><PencilLineIcon /> แก้ไข Note</DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => report(del(n.id, s.id), "ลบ Note แล้ว")}><Trash2Icon /> ลบ Note</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      ))}
      {adding ? (
        <NoteEditor kind="temporary" canPermanent={canPermanent}
          onDone={(text, kind) => { setAdding(false); if (text) report(add(s.id, studentId, text, kind), `บันทึก Note ${NOTE_KIND_LABEL[kind]}แล้ว`) }} />
      ) : canEdit && (
        <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1 text-xs text-muted-foreground italic hover:text-foreground">
          <PlusIcon className="size-3" />Note
        </button>
      )}
    </div>
  )
}
