import { create } from "zustand"
import { GraduationCap } from "lucide-react"
import { SUBJ, WK_DATE, students, topicOf } from "@/data"
import { quizDetail } from "@/logic"
import { useSync } from "@/store"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface QuizState { idx: number | null; sub: string; wk: number; open: (idx: number, sub: string, wk: number) => void; close: () => void }
export const useQuizDialog = create<QuizState>((set) => ({
  idx: null, sub: "", wk: 1,
  open: (idx, sub, wk) => set({ idx, sub, wk }),
  close: () => set({ idx: null }),
}))

export function QuizDialog() {
  useSync()
  const { idx, sub, wk, close } = useQuizDialog()
  if (idx == null) return null
  const s = students[idx]
  const { rows, correctN, total } = quizDetail(idx, sub, wk)

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-base"><span className="font-bold">Live Quiz</span> <span className="font-normal text-muted-foreground">— {s.nick}</span></DialogTitle>
          <p className="text-sm"><span className="font-semibold">Lesson</span> — {topicOf(sub, wk)} · {SUBJ[sub].n} <span className="text-muted-foreground">({WK_DATE[wk]})</span></p>
        </DialogHeader>

        <div className="overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-[11px] font-semibold uppercase text-muted-foreground">
                <th className="px-3 py-2.5 text-center font-semibold">Question</th>
                <th className="px-3 py-2.5 text-center font-semibold">Correct Answer</th>
                <th className="px-3 py-2.5 text-center font-semibold">Correct Percentage</th>
                <th className="px-3 py-2.5 text-center font-semibold">Student's Answer</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.q} className="border-b last:border-b-0 even:bg-muted/20">
                  <td className="px-3 py-2.5 text-center text-muted-foreground">{r.q}</td>
                  <td className="px-3 py-2.5 text-center font-medium">{r.correct}</td>
                  <td className="px-3 py-2.5 text-center text-muted-foreground tabular-nums">{r.pct.toFixed(2)}%</td>
                  <td className={cn("px-3 py-2.5 text-center font-semibold", r.ok === "correct" ? "text-emerald-600" : r.ok === "wrong" ? "text-red-500" : "text-muted-foreground")}>{r.answer}</td>
                </tr>
              ))}
              <tr className="bg-muted/40">
                <td className="px-3 py-3 text-center"><span className="inline-flex size-7 items-center justify-center rounded-md bg-gradient-to-br from-pink-500 to-orange-400 text-white"><GraduationCap className="size-4" /></span></td>
                <td />
                <td className="px-3 py-3 text-center font-bold">Score</td>
                <td className="px-3 py-3 text-center font-bold tabular-nums">{correctN}/{total}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-center text-[11px] text-muted-foreground">ผล Live Quiz ดึงจาก Web Admin อัตโนมัติ — ครูแก้ไขไม่ได้</p>
      </DialogContent>
    </Dialog>
  )
}
