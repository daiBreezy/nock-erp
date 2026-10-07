"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CheckIcon, ChevronDownIcon, PencilLineIcon, SchoolIcon, XIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { searchSchools, type SchoolRef } from "@/domain/rules/schools"
import { cn } from "@/lib/utils"

/** the national list (BKK + CBR in the prototype), fetched once per page load — ~350 KB, only when a picker opens */
let cache: Promise<SchoolRef[]> | null = null
export function loadSchools() {
  cache ??= fetch("/data/schools-bkk-cbr.json").then((r) => r.json() as Promise<SchoolRef[]>).catch(() => { cache = null; return [] })
  return cache
}

/**
 * โรงเรียน (owner 2026-10-07): search the Ministry of Education list and pick — the branch's own province first.
 * Not in the list (new / abroad / tutoring centre)? "ใช้ชื่อนี้" keeps what was typed, without a school code.
 */
export function SchoolPicker({ value, schoolId, province, onChange, className }: {
  value?: string
  schoolId?: string
  /** BKK / CBR — the branch's province, ranked first */
  province?: string
  onChange: (v: { school?: string; schoolId?: string }) => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<SchoolRef[] | null>(null)
  const [q, setQ] = useState("")
  const [active, setActive] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => { if (open) loadSchools().then(setList) }, [open])
  const hits = useMemo(() => (list ? searchSchools(list, q, { province }) : []), [list, q, province])
  const current = list?.find((x) => x.id === schoolId)

  const pick = (x: SchoolRef) => { onChange({ school: x.name, schoolId: x.id }); setOpen(false); setQ("") }
  const typed = () => { if (q.trim()) { onChange({ school: q.trim(), schoolId: undefined }); setOpen(false); setQ("") } }

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) setTimeout(() => input.current?.focus(), 0) }}>
      <PopoverTrigger
        render={<button type="button" />}
        className={cn("flex h-9 w-full min-w-0 items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 text-left text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/30", className)}
      >
        <SchoolIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className={cn("min-w-0 flex-1 truncate", !value && "text-muted-foreground")} title={value}>{value || "ค้นหาโรงเรียน"}</span>
        {value && !schoolId && <span className="shrink-0 rounded bg-amber-100 px-1 text-[10px] text-amber-800" title="พิมพ์เอง — ไม่อยู่ในรายชื่อกระทรวงศึกษาธิการ">พิมพ์เอง</span>}
        {value
          ? <span role="button" tabIndex={-1} aria-label="ล้าง" onClick={(e) => { e.stopPropagation(); onChange({ school: undefined, schoolId: undefined }) }} className="shrink-0 text-muted-foreground hover:text-foreground"><XIcon className="size-3.5" /></span>
          : <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(28rem,calc(100vw-2rem))] gap-0 p-0">
        <div className="border-b p-2">
          <input
            ref={input} value={q} placeholder="พิมพ์ชื่อโรงเรียน หรือ เขต / อำเภอ"
            onChange={(e) => { setQ(e.target.value); setActive(0) }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
              if (e.key === "Enter") { e.preventDefault(); if (hits[active]) pick(hits[active]); else typed() }
            }}
            className="h-9 w-full rounded-xl bg-input/50 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>
        <ul className="max-h-72 overflow-y-auto p-1">
          {!list && <li className="p-3 text-center text-xs text-muted-foreground">กำลังโหลดรายชื่อโรงเรียน…</li>}
          {list && hits.length === 0 && <li className="p-3 text-center text-xs text-muted-foreground">ไม่พบในรายชื่อ</li>}
          {hits.map((x, i) => (
            <li key={x.id}>
              <button type="button" onMouseEnter={() => setActive(i)} onClick={() => pick(x)}
                className={cn("flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left", i === active && "bg-muted")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{x.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{x.d} · {x.p === "BKK" ? "กรุงเทพฯ" : x.p === "CBR" ? "ชลบุรี" : x.p} · {x.a}</span>
                </span>
                {(current?.id ?? schoolId) === x.id && <CheckIcon className="size-4 shrink-0 text-primary" />}
              </button>
            </li>
          ))}
        </ul>
        {q.trim() && (
          <button type="button" onClick={typed} className="flex w-full items-center gap-2 border-t px-3 py-2 text-left text-xs text-muted-foreground hover:bg-muted">
            <PencilLineIcon className="size-3.5" /> ไม่มีในรายชื่อ — ใช้ชื่อ “{q.trim()}”
          </button>
        )}
        <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">รายชื่อจากกระทรวงศึกษาธิการ (กรุงเทพฯ + ชลบุรี)</p>
      </PopoverContent>
    </Popover>
  )
}
