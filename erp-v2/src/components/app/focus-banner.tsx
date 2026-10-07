"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { CrosshairIcon, XIcon } from "lucide-react"
import { useQueryState } from "@/lib/hooks"
import { tx } from "@/lib/i18n"

/**
 * "เด้งมาเพื่อทำอะไร" (owner 2026-10-07): a Dashboard topic links to its page with `?focus=<key>`. This banner
 * says why you landed here, and every element on the page marked `data-focus="<key> …"` gets a highlight (the
 * first one scrolls into view). Pages mark their filter card / list / rows; the banner still explains when
 * nothing on the page is marked.
 */
export const FOCUS_TEXT: Record<string, { title: string; hint: string }> = {
  unmarked: { title: "คาบที่ยังไม่เช็คชื่อ", hint: "กดคาบที่ไฮไลต์เพื่อเช็คชื่อให้ครบ" },
  summary_write: { title: "สรุปการเรียนที่ต้องเขียน", hint: "กด \"เขียน / แก้\" ทีละรายการ" },
  summary_approve: { title: "สรุปการเรียนรออนุมัติ", hint: "ตรวจแล้วกดอนุมัติ หรือขอแก้" },
  invoice_approve: { title: "ใบแจ้งหนี้รออนุมัติ", hint: "เปิดใบที่ไฮไลต์เพื่อตรวจและอนุมัติ" },
  renewal: { title: "นักเรียนรอต่อคอร์ส", hint: "เปิดชื่อที่ไฮไลต์ แล้วบันทึกการติดตาม หรือออกใบต่อคอร์ส" },
  lead_new: { title: "ลีดใหม่ที่ยังไม่ได้ติดต่อ", hint: "ติดต่อแล้วย้ายขั้นตอน" },
  no_teacher: { title: "คาบที่ยังไม่มีครู (7 วันข้างหน้า)", hint: "เปิดคาบที่ไฮไลต์แล้วใส่ครู" },
  conflict: { title: "คาบชน (7 วันข้างหน้า)", hint: "คาบที่ชนมีกรอบแดง ย้ายเวลา ห้อง หรือครู" },
  unpaid: { title: "ใบแจ้งหนี้เลยกำหนดจ่าย", hint: "ทักผู้ปกครองตามใบที่ไฮไลต์" },
  unconfirmed: { title: "เงินเข้าแล้วแต่ยังไม่ยืนยัน", hint: "ตรวจสลิปแล้วกดยืนยัน" },
  survey_call: { title: "ผู้ปกครองไม่พอใจ ยังไม่ได้โทร", hint: "โทรตามรายชื่อที่ไฮไลต์แล้วบันทึกผล" },
  often_leave: { title: "นักเรียนลาบ่อย", hint: "ดูรายชื่อที่อัตราเข้าเรียนต่ำ แล้วทักผู้ปกครอง" },
  no_family: { title: "นักเรียนไม่ผูกครอบครัว", hint: "เปิดนักเรียนที่ไฮไลต์แล้วผูกครอบครัว" },
  no_address: { title: "ครอบครัวไม่มีที่อยู่", hint: "เปิดครอบครัวที่ไฮไลต์แล้วเติมที่อยู่" },
  no_line: { title: "ครอบครัวไม่มี LINE", hint: "เปิดครอบครัวที่ไฮไลต์แล้วส่งลิงก์ผูก LINE" },
  teacher_leave: { title: "ครูลา 7 วันข้างหน้า", hint: "จัดครูแทนในคาบที่ไฮไลต์" },
  small_class: { title: "คลาสคนน้อย", hint: "รวมคลาส หรือหานักเรียนเพิ่ม" },
  lead_quiet: { title: "Lead เงียบ ควรตัดสินใจ", hint: "ปิด Lead หรือลองช่องทางอื่น" },
  lead_follow_again: { title: "ถึงวันติดต่อ Lead ที่ปิดไปอีกครั้ง", hint: "ติดต่อแล้วเปิด Lead ใหม่ หรือเลื่อนวัน" },
  trial_idle: { title: "ทดลองเรียนแล้ว ยังไม่สมัคร", hint: "ทักผู้ปกครองแล้วส่งลิงก์สมัคร" },
}

const HIT = ["focus-hit"]

export function FocusBanner() {
  const pathname = usePathname()
  const [key, setKey] = useState<string | null>(null)
  const [found, setFound] = useState<number | null>(null)

  useEffect(() => {
    const k = new URLSearchParams(window.location.search).get("focus")
    setKey(k) // eslint-disable-line react-hooks/set-state-in-effect
    setFound(null)
  }, [pathname])

  useEffect(() => {
    if (!key) return
    let scrolled = false
    const marked = new Set<Element>()
    const apply = () => {
      const els = document.querySelectorAll(`[data-focus~="${CSS.escape(key)}"]`)
      els.forEach((el) => { if (!marked.has(el)) { el.classList.add(...HIT); marked.add(el) } })
      setFound(els.length)
      if (els[0] && !scrolled) { scrolled = true; els[0].scrollIntoView({ behavior: "smooth", block: "center" }) }
    }
    // pages render their data after mount (store hydration) — keep marking for a few seconds as rows appear
    apply()
    const obs = new MutationObserver(apply)
    obs.observe(document.body, { childList: true, subtree: true })
    const stop = setTimeout(() => obs.disconnect(), 4000)
    return () => { obs.disconnect(); clearTimeout(stop); marked.forEach((el) => el.classList.remove(...HIT)) }
  }, [key])

  if (!key) return null
  const text = FOCUS_TEXT[key]
  const close = () => {
    const p = new URLSearchParams(window.location.search)
    p.delete("focus")
    const qs = p.toString()
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname)
    setKey(null)
  }
  return (
    <div className="mx-auto mb-3 flex max-w-7xl items-center gap-3 rounded-2xl bg-primary/10 px-4 py-2.5 text-sm ring-1 ring-primary/30">
      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><CrosshairIcon className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="font-medium">{tx("มาจาก Dashboard:")} {text ? tx(text.title) : key}</span>
        {text && <span className="text-muted-foreground"> · {tx(text.hint)}</span>}
        {found !== null && found > 0 && <span className="text-muted-foreground"> · {tx("ไฮไลต์ไว้ {0} จุด", [found])}</span>}
      </span>
      <button type="button" onClick={close} aria-label={tx("ปิด")} className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-foreground"><XIcon className="size-4" /></button>
    </div>
  )
}

/**
 * Long, paginated lists: with ?focus=<key>, rows tagged with that key come first so they land on page 1
 * (`keysOf` returns the same space-separated keys the row puts in data-focus).
 */
export function useFocusFirst<T>(rows: T[], keysOf: (r: T) => string | undefined): T[] {
  const [focus] = useQueryState<string>("focus", "")
  if (!focus) return rows
  const has = (r: T) => (keysOf(r) ?? "").split(" ").includes(focus)
  return [...rows.filter(has), ...rows.filter((r) => !has(r))]
}
