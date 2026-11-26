"use client"

// Note Calendar UI (owner 2026-10-15) — the editor is shared by the calendar board and the session panel, where the
// notes can be added, edited and deleted too ("จัดการ Note จากตรงนี้ได้ด้วย").
import { useRef, useState } from "react"
import { CheckIcon, EllipsisIcon, PencilLineIcon, PinIcon, PlusIcon, StickyNoteIcon, Trash2Icon, XIcon } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { calendarNotesFor, CALENDAR_NOTE_MAX, NOTE_KIND_LABEL } from "@/domain/rules/calendar-notes"
import type { CalendarNoteKind, ID, Session } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

/** add / edit one Note Calendar: text + ชั่วคราว | ถาวร. Enter or leaving the box saves, Esc cancels. */
export function NoteEditor({ text: initialText = "", kind: initialKind, canPermanent, onDone, onDelete, className }: {
  className?: string; text?: string; kind: CalendarNoteKind; canPermanent: boolean; onDone: (text: string, kind: CalendarNoteKind) => void
  /** an existing note: the 🗑 deletes it (a new one: the 🗑 just throws the draft away) */
  onDelete?: () => void
}) {
  const [text, setText] = useState(initialText)
  const [kind, setKind] = useState<CalendarNoteKind>(initialKind)
  const box = useRef<HTMLDivElement>(null)
  const done = useRef(false)
  const finish = (t: string) => { if (done.current) return; done.current = true; onDone(t.trim(), kind) }
  const pinned = kind === "permanent"
  // owner 2026-10-15: no ชั่วคราว / ถาวร pair — a note is for this session unless the 📌 is on; ✓ saves, 🗑 deletes
  return (
    // owner 2026-11-13: one field — the text area grows with what you type (several lines to read it all) and the three
    // buttons (pin · delete · save) sit inside it, bottom right, so there is no extra row. Enter saves, Shift+Enter = new line.
    <div ref={box} className={cn("relative mt-1 rounded-2xl border bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30", className)}
      onBlur={(e) => { if (!box.current?.contains(e.relatedTarget as Node)) finish(text) }}>
      <Textarea autoFocus rows={1} value={text} maxLength={CALENDAR_NOTE_MAX} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); finish(text) } if (e.key === "Escape") finish("") }}
        placeholder="Note เช่น MBook 1 (2-4)"
        className="field-sizing-content min-h-0 w-full resize-none rounded-2xl border-0 bg-transparent px-3 pt-2 pb-9 text-xs leading-relaxed text-foreground shadow-none outline-none focus-visible:ring-0" />
      <div className="absolute right-1.5 bottom-1.5 flex items-center gap-1">
        <Button variant="ghost" size="inline" type="button" aria-pressed={pinned} disabled={!canPermanent && !pinned} onClick={() => setKind(pinned ? "temporary" : "permanent")}
          aria-label="Note ถาวร" title={pinned ? "ถาวร — แสดงทุกคาบของคลาสนี้ (กดเพื่อเป็นเฉพาะคาบนี้)" : canPermanent ? "กดเพื่อปักหมุด — แสดงทุกคาบของคลาสนี้" : "คาบนี้ไม่ได้อยู่ในคลาสประจำ"}
          className={cn("grid size-7 shrink-0 place-items-center rounded-full disabled:opacity-40", pinned ? "bg-primary/10 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          <PinIcon className="size-3.5" />
        </Button>
        {/* owner 2026-11-26: an explicit ยกเลิก — closes the field and keeps / throws away nothing new */}
        <Button variant="ghost" size="inline" type="button" onClick={() => { done.current = true; onDone(initialText, initialKind) }} aria-label="ยกเลิก" title="ยกเลิก"
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><XIcon className="size-3.5" /></Button>
        {onDelete && <Button variant="ghost" size="inline" type="button" onClick={() => { done.current = true; onDelete() }} aria-label="ลบ Note" title="ลบ Note"
          className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-danger-soft/60 hover:text-danger"><Trash2Icon className="size-3.5" /></Button>}
        <Button variant="ghost" size="icon-md" type="button" onClick={() => finish(text)} aria-label="บันทึก Note" className="shrink-0 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"><CheckIcon className="size-3.5" /></Button>
      </div>
    </div>
  )
}

/** one student's Note Calendar in a session — the panel version: list + ⋯ (edit / delete) + "Note" to add */
export function CalendarNotes({ s, studentId, canEdit, extra, hideAdd, before }: {
  s: Session; studentId: ID; canEdit: boolean
  /** owner 2026-11-26: sits beside "+ Note" (the Summary button) — hidden while a note is being written / edited */
  extra?: React.ReactNode
  /** "+ Note" itself is hidden (the Summary is open) */
  hideAdd?: boolean
  /** owner 2026-11-26: the Summary preview — shown under the notes, above the buttons */
  before?: React.ReactNode
}) {
  const notes = calendarNotesFor(s, studentId, useStore((st) => st.calendarNotes))
  const add = useStore((st) => st.addCalendarNote)
  const edit = useStore((st) => st.editCalendarNote)
  const del = useStore((st) => st.deleteCalendarNote)
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ID | null>(null)
  const canPermanent = !!s.classId
  return (
    // owner 2026-11-26: one even gap (8px) between the notes, the Summary preview and the buttons — no margins on the children
    <div className="flex flex-col gap-2">
      {notes.length > 0 && <div className="space-y-0.5">
      {notes.map((n) => editing === n.id ? (
        <NoteEditor key={n.id} text={n.text} kind={n.kind} canPermanent={canPermanent || n.kind === "permanent"}
          onDelete={() => { setEditing(null); report(del(n.id, s.id), "ลบ Note แล้ว") }}
          onDone={(text, kind) => { setEditing(null); if (text && (text !== n.text || kind !== n.kind)) report(edit(n.id, s.id, text, kind), "แก้ Note แล้ว") }} />
      ) : (
        <div key={n.id} className="group/note flex min-w-0 items-center gap-1 text-xs text-foreground/80">
          {n.kind === "permanent" ? <PinIcon className="size-3 shrink-0 text-primary" aria-label="Note ถาวร" /> : <StickyNoteIcon className="size-3 shrink-0 text-muted-foreground" aria-label="Note ชั่วคราว" />}
          <Button variant="row" size="inline" type="button" disabled={!canEdit} onClick={() => setEditing(n.id)} title={`Note ${NOTE_KIND_LABEL[n.kind]} · ${n.text}`} className={cn("min-w-0 truncate text-left", canEdit && "hover:underline")}>{n.text}</Button>
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger render={<Button variant="ghost" size="icon-2xs" type="button" aria-label="จัดการ Note" className="shrink-0 rounded-full text-muted-foreground opacity-0 group-hover/note:opacity-100 hover:bg-muted focus-visible:opacity-100 data-[popup-open]:opacity-100" />}>
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
      </div>}
      {before}
      {adding ? (
        <NoteEditor kind="temporary" canPermanent={canPermanent}
          onDone={(text, kind) => { setAdding(false); if (text) report(add(s.id, studentId, text, kind), `บันทึก Note ${NOTE_KIND_LABEL[kind]}แล้ว`) }} />
      ) : (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {canEdit && !hideAdd && !editing && (
            <Button variant="outline" type="button" onClick={() => setAdding(true)} className="h-9 gap-1.5 px-4">
              <PlusIcon />Note
            </Button>
          )}
          {!editing && extra}
        </div>
      )}
    </div>
  )
}
