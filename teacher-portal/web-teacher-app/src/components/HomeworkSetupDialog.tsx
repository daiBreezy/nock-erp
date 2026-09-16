import { create } from "zustand"
import { Plus, Trash2, Users } from "lucide-react"
import { SUBJ, WK_DATE, hwQuestions, HW_ANS } from "@/data"
import { addHwQuestion, deleteHwQuestion, setHwKey, useSync } from "@/store"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface HwSetupState { cid: string | null; sub: string; wk: number; open: (cid: string, sub: string, wk: number) => void; close: () => void }
export const useHwSetup = create<HwSetupState>((set) => ({
  cid: null, sub: "", wk: 1,
  open: (cid, sub, wk) => set({ cid, sub, wk }),
  close: () => set({ cid: null }),
}))

export function HomeworkSetupDialog() {
  useSync()
  const { cid, sub, wk, close } = useHwSetup()
  if (cid == null) return null
  const key = cid + "|" + sub + "|" + wk
  const qs = hwQuestions[key] || []

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">สร้าง Homework — {SUBJ[sub].n}</DialogTitle>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="size-3.5" /> W{wk} · {WK_DATE[wk]} · ตั้ง “เฉลย” ใช้ร่วมกับนักเรียนทุกคนในสัปดาห์นี้</p>
        </DialogHeader>

        <div className="rounded-lg border">
          <div className="grid grid-cols-[44px_1fr_36px] border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
            <span>ข้อ</span><span>เฉลย <span className="font-normal normal-case text-[9px]">(ทุกคน)</span></span><span />
          </div>
          {qs.length === 0 && <div className="px-3 py-4 text-center text-xs text-muted-foreground">ยังไม่มีข้อ — กด “เพิ่มข้อ” เพื่อเริ่มสร้าง</div>}
          {qs.map((k, i) => (
            <div key={i} className="grid grid-cols-[44px_1fr_36px] items-center gap-2 border-b px-3 py-1.5 last:border-b-0">
              <span className="text-sm text-muted-foreground">{i + 1}</span>
              <Select value={k} onValueChange={(v) => setHwKey(cid, sub, wk, i, v)}>
                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                <SelectContent>{HW_ANS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive" onClick={() => deleteHwQuestion(cid, sub, wk, i)}><Trash2 className="size-3.5" /></Button>
            </div>
          ))}
          <button onClick={() => addHwQuestion(cid, sub, wk)} className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-primary hover:bg-muted/40"><Plus className="size-3.5" /> เพิ่มข้อ</button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">รวม <b className="text-foreground">{qs.length}</b> ข้อ</span>
          <Button className="ml-auto" onClick={close}>เสร็จสิ้น</Button>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">* เฉลยนี้แชร์ให้ทุกคน — คำตอบรายคนกรอกที่ตาราง (คอลัมน์ Homework)</p>
      </DialogContent>
    </Dialog>
  )
}
