"use client"

import { useRef, useState } from "react"
import { ImagePlusIcon, RefreshCwIcon, Trash2Icon } from "lucide-react"
import { toast } from "@/lib/toast"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { avatarTone, initial } from "@/components/app/subject-color"
import { slipDataUrl } from "@/lib/image"
import { cn } from "@/lib/utils"

interface Person { id: string; nickname: string; photo?: string }

/** a person's photo, or their initial on a coloured circle */
export function PersonAvatar({ person, className }: { person: Person; className?: string }) {
  return person.photo
    // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing for next/image to optimise
    ? <img src={person.photo} alt={person.nickname} className={cn("size-9 shrink-0 rounded-full object-cover", className)} />
    : <span className={cn("grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold", avatarTone(person.id), className)}>{initial(person.nickname)}</span>
}

/**
 * Photo column of a people table (owner 2026-10-12: photo and name in their own columns — staff, students): click →
 * a small popup to upload / change / remove the photo. The click never reaches the row (that one opens the side
 * panel). `onSave` returns false when the store refused (the toast says why). Without permission: just the picture.
 */
export function PhotoCell({ person, disabled, onSave }: { person: Person; disabled?: boolean; onSave: (photo: string | undefined, msg: string) => boolean }) {
  const [open, setOpen] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  if (disabled) return <PersonAvatar person={person} />
  const setPhoto = (photo: string | undefined, msg: string) => { if (onSave(photo, msg)) setOpen(false) }
  const item = "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
  return (
    <div onClick={(e) => e.stopPropagation()}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<button type="button" aria-label={`รูปของ ${person.nickname}`} title="คลิกเพื่อเปลี่ยนรูป" className="rounded-full focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none hover:ring-2 hover:ring-primary/30" />}>
          <PersonAvatar person={person} />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-48 gap-0 p-1.5">
          <p className="px-2 pb-1 text-xs text-muted-foreground">รูปของ {person.nickname}</p>
          <button type="button" className={item} onClick={() => file.current?.click()}>
            {person.photo ? <><RefreshCwIcon className="size-4" />เปลี่ยนรูป</> : <><ImagePlusIcon className="size-4" />อัปโหลดรูป</>}
          </button>
          {person.photo && (
            <button type="button" className={cn(item, "text-red-700")} onClick={() => setPhoto(undefined, "เอารูปออกแล้ว")}><Trash2Icon className="size-4" />เอารูปออก</button>
          )}
          <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0]
            e.target.value = ""
            if (!f) return
            try { setPhoto(await slipDataUrl(f, 256), person.photo ? "เปลี่ยนรูปแล้ว" : "อัปโหลดรูปแล้ว") } catch { toast.error("อ่านรูปไม่ได้ — ลองไฟล์อื่น") }
          }} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
