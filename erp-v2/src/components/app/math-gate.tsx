"use client"

// NEGATIVE-ACTIONS.md §1 — the "ด่านเลข (math gate)": before any permanent delete, a one-digit +/− problem that
// must be answered. It replaces a plain confirm() so the delete is a deliberate stop, not a reflex click.
import { useState } from "react"
import { TriangleAlertIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { makeMathProblem, mathAnswerOk } from "@/domain/rules/negative"

export function MathGate({ open, title, warning, confirmLabel = "ลบถาวร", onConfirm, onClose }: {
  open: boolean
  title: string
  /** why this is permanent / what is lost — shown in a red note */
  warning: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  // a fresh problem (and a cleared answer) each time the dialog opens — adjust-state-on-prop-change, no effect
  const [problem, setProblem] = useState(makeMathProblem)
  const [val, setVal] = useState("")
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setProblem(makeMathProblem()); setVal("") }
  }
  const ok = mathAnswerOk(problem, val)
  const close = () => { setVal(""); onClose() }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent className="lg:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="flex items-start gap-1.5 text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>{warning}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">ตอบโจทย์เพื่อยืนยันว่าตั้งใจลบ</p>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold tabular-nums">{problem.text} =</span>
            <Input autoFocus inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && ok) { onConfirm(); close() } }}
              className="w-20 text-center" placeholder="?" aria-label="คำตอบ" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>ยกเลิก</Button>
          <Button variant="destructive" disabled={!ok} onClick={() => { onConfirm(); close() }}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
