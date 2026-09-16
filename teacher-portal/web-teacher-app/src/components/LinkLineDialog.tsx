import { create } from "zustand"
import { QrCode, Copy, Send, Users, Unlink, CheckCircle2, TriangleAlert } from "lucide-react"
import { guardianOf, siblingsOf, type LineStatus } from "@/data"
import { sendLineInvite, confirmLineLink, unlinkLine, useSync } from "@/store"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface LinkLineState { idx: number | null; open: (idx: number) => void; close: () => void }
export const useLinkLine = create<LinkLineState>((set) => ({ idx: null, open: (idx) => set({ idx }), close: () => set({ idx: null }) }))

const LINE_META: Record<LineStatus, { label: string; cls: string }> = {
  linked: { label: "ผูกแล้ว", cls: "bg-emerald-100 text-emerald-700" },
  invited: { label: "รอผูก", cls: "bg-amber-100 text-amber-700" },
  none: { label: "ยังไม่ผูก", cls: "bg-muted text-muted-foreground" },
  broken: { label: "หลุด/บล็อก", cls: "bg-red-100 text-red-600" },
}
export function LineStatusBadge({ status, className }: { status: LineStatus; className?: string }) {
  const m = LINE_META[status]
  return <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", m.cls, className)}><span className="size-1.5 rounded-full bg-current opacity-70" />{m.label}</span>
}

export function LinkLineDialog() {
  useSync()
  const { idx, close } = useLinkLine()
  if (idx == null) return null
  const g = guardianOf(idx)
  const sibs = siblingsOf(idx)
  const linked = g.lineStatus === "linked"
  const url = "https://line.nockapp.co/link/" + g.linkToken
  const copy = (t: string) => { try { navigator.clipboard?.writeText(t) } catch { /* noop */ } }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base"><span className="flex size-6 items-center justify-center rounded-md bg-[#06C755] text-[10px] font-bold text-white">L</span> ผูก LINE OA — ผู้ปกครอง</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{g.name}</div>
            <div className="text-xs text-muted-foreground">📱 {g.phone}</div>
          </div>
          <LineStatusBadge status={g.lineStatus} />
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
          <div className="mb-1 inline-flex items-center gap-1.5 font-semibold text-primary"><Users className="size-3.5" /> ผูกครั้งเดียว คุมลูกทุกคน ({sibs.length})</div>
          <div className="flex flex-wrap gap-1.5">{sibs.map((s) => <span key={s.idx} className="rounded-full bg-card px-2 py-0.5 text-[11px] font-medium">{s.nick} <span className="text-muted-foreground">· {s.grade}</span></span>)}</div>
        </div>

        {linked ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              <div><div className="font-semibold">ผูกบัญชีเรียบร้อย</div><div className="text-xs opacity-80">ส่ง Summary เข้า LINE ผู้ปกครองได้ทันที · ผูกเมื่อ {g.linkedAt} · <span className="font-mono">{g.lineUserId?.slice(0, 12)}…</span></div></div>
            </div>
            <Button variant="outline" className="w-full text-destructive hover:text-destructive" onClick={() => unlinkLine(g.id)}><Unlink className="mr-2 size-4" /> ยกเลิกการผูก</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {g.lineStatus === "broken" && <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-950/30 dark:text-red-300"><TriangleAlert className="size-4 shrink-0" /> เคยผูกแล้วแต่ผู้ปกครองบล็อก/ลบเพื่อน — ต้องผูกใหม่</div>}
            <div className="flex gap-3">
              <div className="flex size-24 shrink-0 items-center justify-center rounded-lg border bg-card"><QrCode className="size-16 text-foreground" /></div>
              <div className="min-w-0 flex-1 space-y-2">
                <div>
                  <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">ลิงก์เชิญผูก (ส่งให้ผู้ปกครอง)</div>
                  <div className="flex items-center gap-1"><input readOnly value={url} className="h-8 min-w-0 flex-1 rounded-md border bg-muted/40 px-2 text-xs" /><Button variant="outline" size="icon" className="size-8" onClick={() => copy(url)}><Copy className="size-3.5" /></Button></div>
                </div>
                <div>
                  <div className="mb-0.5 text-[11px] font-medium text-muted-foreground">โค้ดผูก</div>
                  <div className="inline-flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 font-mono text-sm font-semibold tracking-wider">{g.linkToken.slice(-6).toUpperCase()}<button onClick={() => copy(g.linkToken.slice(-6).toUpperCase())}><Copy className="size-3.5 text-muted-foreground" /></button></div>
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => sendLineInvite(g.id)}><Send className="mr-2 size-4" /> {g.lineStatus === "invited" ? "ส่งลิงก์เชิญอีกครั้ง" : "ส่งลิงก์เชิญผูก"}</Button>
            <div className="rounded-lg border border-dashed p-2.5">
              <div className="mb-1.5 text-center text-[11px] text-muted-foreground">— จำลอง (prototype) —</div>
              <Button variant="secondary" className="w-full" onClick={() => confirmLineLink(g.id)}><CheckCircle2 className="mr-2 size-4" /> จำลอง: ผู้ปกครองสแกน + ผูกสำเร็จ</Button>
            </div>
          </div>
        )}
        <p className="text-center text-[11px] text-muted-foreground">* prototype — ยังไม่ต่อ LINE Messaging API จริง (userId/QR จำลอง)</p>
      </DialogContent>
    </Dialog>
  )
}
