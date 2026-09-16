import { create } from "zustand"
import { Check, Plus, Trash2 } from "lucide-react"
import { SUBJ, WK_DATE, students, hwQuestions, hwAnswers, HW_ANS } from "@/data"
import { addHwQuestion, deleteHwQuestion, setHwKey, setHwAnswer, saveHw, ensureHw, useSync } from "@/store"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface HwState { idx: number | null; course: string; sub: string; wk: number; open: (idx: number, course: string, sub: string, wk: number) => void; close: () => void }
export const useHwDialog = create<HwState>((set) => ({
  idx: null, course: "c1", sub: "", wk: 1,
  open: (idx, course, sub, wk) => set({ idx, course, sub, wk }),
  close: () => set({ idx: null }),
}))

export function HomeworkDialog() {
  useSync()
  const { idx, course, sub, wk, close } = useHwDialog()
  if (idx == null) return null
  ensureHw(idx, course, sub, wk)
  const s = students[idx]
  const qs = hwQuestions[course + "|" + sub + "|" + wk] || []
  const ans = hwAnswers[idx + "|" + sub + "|" + wk] || []
  const correct = qs.reduce((n, key, i) => n + (ans[i] === key ? 1 : 0), 0)

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">เก็บ Homework — {s.nick} · {SUBJ[sub].n}</DialogTitle>
          <p className="text-xs text-muted-foreground">W{wk} · {WK_DATE[wk]} · กรอกด้วยมือ (Manual) · แก้ไขได้จนกว่าจะส่งให้ผู้ปกครอง</p>
        </DialogHeader>

        <div className="rounded-lg border">
          <div className="grid grid-cols-[44px_1fr_1fr_36px] border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
            <span>ข้อ</span><span>เฉลย <span className="normal-case text-[9px] font-normal">(ทุกคน)</span></span><span>คำตอบ <span className="normal-case text-[9px] font-normal">(รายคน)</span></span><span />
          </div>
          {qs.map((key, i) => (
            <div key={i} className="grid grid-cols-[44px_1fr_1fr_36px] items-center gap-2 border-b px-3 py-1.5 last:border-b-0">
              <span className="text-sm text-muted-foreground">{i + 1}</span>
              <Select value={key} onValueChange={(v) => setHwKey(course, sub, wk, i, v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{HW_ANS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={ans[i] ?? HW_ANS[0]} onValueChange={(v) => setHwAnswer(idx, sub, wk, i, v)}>
                <SelectTrigger className={ans[i] === key ? "h-8 text-emerald-600" : "h-8 text-red-500"}><SelectValue /></SelectTrigger>
                <SelectContent>{HW_ANS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => deleteHwQuestion(course, sub, wk, i)} disabled={qs.length <= 1}><Trash2 className="size-3.5" /></Button>
            </div>
          ))}
          <button onClick={() => addHwQuestion(course, sub, wk)} className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:bg-muted/40"><Plus className="size-3.5" /> เพิ่มข้อ</button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">ถูก <b className="text-foreground">{correct}/{qs.length}</b></span>
          <div className="ml-auto flex gap-2">
            <Button onClick={() => { saveHw(idx, course, sub, wk); close() }}><Check className="mr-2 size-4" /> บันทึกคะแนน</Button>
            <Button variant="outline" onClick={close}>ปิด</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
