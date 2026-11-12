"use client"

// owner 2026-11-12: one LINE message — plain text you can edit freely (no bubble, no frame). A spec to talk through with
// Admin / Dev; it never changes what the system really sends.
import { useState } from "react"
import { MoreHorizontalIcon, PencilIcon, RotateCcwIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/lib/toast"
import { useLineDrafts, type DraftBox } from "@/store/line-drafts"

export interface BoxView extends DraftBox { draft?: boolean; edited: boolean; custom: boolean }

export function LineMessageBox({ box, autoEdit }: { box: BoxView; autoEdit?: boolean }) {
  const [renaming, setRenaming] = useState(!!autoEdit)
  const { save, remove, restore, revert } = useLineDrafts()
  // owner 2026-11-12: the message is a field you type in directly (saved as you type, faint frame, small character count)
  const change = (p: Partial<DraftBox>) => save({ key: box.key, brand: box.brand, group: box.group, title: box.title, hint: box.hint, text: box.text, ...p }, box.custom)
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
      <Textarea value={box.text} onChange={(e) => change({ text: e.target.value })} placeholder="พิมพ์ข้อความได้เลย" aria-label={box.title} className="min-h-32 border-foreground/10 text-sm leading-relaxed" />
      <p className="text-right text-2xs text-muted-foreground">{box.text.length.toLocaleString()} ตัวอักษร</p>
    </div>
  )
}
