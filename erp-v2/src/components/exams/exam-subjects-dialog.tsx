"use client"

import { useState } from "react"
import { PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import * as Exam from "@/domain/rules/exams"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { useStore } from "@/store/store"

/** Which subjects the Exam Result page asks for at this branch (owner 2026-11-23): the default five, plus whatever the admin adds. */
export function ExamSubjectsDialog({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  const save = useStore((s) => s.setExamSubjects)
  const [list, setList] = useState(Exam.examSubjectsOf(branch))
  const [text, setText] = useState("")
  const add = () => {
    const v = text.trim()
    if (v && !list.includes(v)) setList([...list, v])
    setText("")
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="lg:max-w-md">
        <DialogHeader>
          <DialogTitle>วิชาในผลสอบโรงเรียน · {branch.name}</DialogTitle>
          <DialogDescription>วิชาที่ครู/แอดมินกรอกได้ — เริ่มต้น 5 วิชา เพิ่มวิชาอื่นได้ (วิชาที่เคยกรอกแล้วไม่หายถ้าเอาออกภายหลัง)</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {list.map((s) => (
            <span key={s} className="inline-flex h-8 items-center gap-1 rounded-full bg-muted pl-3 pr-1 text-sm">
              {s}
              <Button size="icon-xs" variant="ghost" aria-label={`เอา ${s} ออก`} disabled={list.length <= 1} onClick={() => setList(list.filter((x) => x !== s))}><XIcon /></Button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="เพิ่มวิชา เช่น ศิลปะ" />
          <Button variant="outline" disabled={!text.trim()} onClick={add}><PlusIcon /> เพิ่ม</Button>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setList(Exam.defaultExamSubjects(branch.brand))}>กลับเป็นค่าเริ่มต้น</Button>
          <Button onClick={() => report(save(branch.id, list), "บันทึกวิชาแล้ว") && onClose()}>บันทึก</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
