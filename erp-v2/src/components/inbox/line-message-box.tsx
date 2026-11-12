"use client"

// owner 2026-11-12: one LINE message — plain text you can edit freely (no bubble, no frame). A spec to talk through with
// Admin / Dev; it never changes what the system really sends.
import { useEffect, useRef, useState } from "react"
import { MoreHorizontalIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/lib/toast"
import { useLineDrafts, type DraftBox } from "@/store/line-drafts"

export interface BoxView extends DraftBox { draft?: boolean; edited: boolean; custom: boolean }

/** the message the parent gets = main language (Thai / Japanese) + a divider + the English translation (last block) */
const SEP = "\n\n———\n\n"
export const splitTranslation = (text: string) => { const i = text.lastIndexOf(SEP); return i < 0 ? { main: text, trans: null as string | null } : { main: text.slice(0, i), trans: text.slice(i + SEP.length) } }

export function LineMessageBox({ box, autoEdit, showTranslation = true }: { box: BoxView; autoEdit?: boolean; showTranslation?: boolean }) {
  const [renaming, setRenaming] = useState(!!autoEdit)
  const { save, remove, restore, revert } = useLineDrafts()
  // owner 2026-11-12: the message is a field you type in directly (saved as you type, faint frame, small character count)
  const change = (p: Partial<DraftBox>) => save({ key: box.key, brand: box.brand, group: box.group, title: box.title, hint: box.hint, text: box.text, ...p }, box.custom)
  // owner 2026-11-12: the English block is only a translation example — hide it so each reader sees just their own language
  const { main, trans } = splitTranslation(box.text)
  const hidden = trans !== null && !showTranslation
  const shown = hidden ? main : box.text
  // owner 2026-11-12: edit the main language → the English block follows (debounced, via /api/ai/translate)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const lastMain = useRef(main)
  const latest = useRef({ box, main })
  useEffect(() => { latest.current = { box, main } })
  useEffect(() => {
    if (trans === null || main === lastMain.current) return
    if (!box.edited && !box.custom) { lastMain.current = main; return } // reverted to the system text — its English is already right
    if (!main.trim()) return
    const timer = setTimeout(async () => {
      setErr(null)
      setBusy(true)
      try {
        const r = await fetch("/api/ai/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: main, from: box.brand === "liclass" ? "ja" : "th" }) }).then((x) => x.json())
        if (latest.current.main !== main) return // typed more meanwhile — the next round translates the newer text
        if (r.ok) { lastMain.current = main; save({ ...latest.current.box, text: main + SEP + r.text }, latest.current.box.custom) } else setErr(r.error ?? "แปลไม่สำเร็จ")
      } catch { setErr("แปลไม่สำเร็จ") }
      setBusy(false)
    }, 1500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main])
  const del = () => {
    remove(box.key, box.custom)
    toast.success(`ลบ “${box.title}” แล้ว`, box.custom ? undefined : { action: { label: "เลิกลบ", onClick: () => restore(box.key) } })
  }
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-start justify-between gap-2">
        {renaming ? (
          <div className="min-w-0 grow space-y-1.5">
            <Input autoFocus value={box.title} onChange={(e) => change({ title: e.target.value })} placeholder="ชื่อ" aria-label="ชื่อ" className="font-semibold" />
            <Input value={box.hint} onChange={(e) => change({ hint: e.target.value })} placeholder="ส่งเมื่อไหร่ / ส่งจากไหน" aria-label="คำอธิบาย" onKeyDown={(e) => { if (e.key === "Enter") setRenaming(false) }} />
          </div>
        ) : (
          <div>
            <p className="text-sm font-semibold leading-tight">{box.title}
              {box.draft && <span className="ml-2 rounded-full border border-dashed px-2 py-0.5 align-middle text-2xs font-normal text-muted-foreground">ร่าง — ยังไม่ส่งอัตโนมัติ</span>}
              {box.custom && <span className="ml-2 rounded-full border border-dashed px-2 py-0.5 align-middle text-2xs font-normal text-primary">เพิ่มเอง</span>}
              {box.edited && <span className="ml-2 rounded-full border border-dashed px-2 py-0.5 align-middle text-2xs font-normal text-primary">แก้ไขแล้ว</span>}
            </p>
            <p className="text-xs text-muted-foreground">{box.hint}</p>
          </div>
        )}
        {renaming ? <Button type="button" size="sm" onClick={() => setRenaming(false)}>เสร็จ</Button> : (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="เมนูข้อความ" />}><MoreHorizontalIcon /></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setRenaming(true)}><PencilIcon />แก้ชื่อ / คำอธิบาย</DropdownMenuItem>
              {box.edited && <DropdownMenuItem onClick={() => { revert(box.key); toast.success("คืนเป็นข้อความที่ระบบสร้างแล้ว") }}><RotateCcwIcon />คืนค่าเดิมของระบบ</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={del}><Trash2Icon />ลบ</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Textarea value={shown} onChange={(e) => change({ text: hidden ? e.target.value + SEP + trans : e.target.value })} placeholder="พิมพ์ข้อความได้เลย" aria-label={box.title} className="min-h-32 border-foreground/10 text-sm leading-relaxed" />
      <p className="text-right text-2xs text-muted-foreground">{shown.length.toLocaleString()} ตัวอักษร{hidden && " · ซ่อนคำแปล English ไว้"}{busy && " · กำลังแปลเป็น English…"}{err && ` · แปลอัตโนมัติไม่ได้: ${err}`}</p>
    </div>
  )
}
