import { R, SUBJ, WK_DATE, courseObj, students, effOverride } from "@/data"
import { actualSubs, fbText, pct } from "@/logic"
import { cn } from "@/lib/utils"
import { QuizHwBars } from "@/components/charts"

const ACC: Record<string, string> = { sci: "#2fa76a", mathB: "#3d7fd9", mathA: "#8b5cf6", eng: "#0f9188" }

export function ReportA4({ idx, course, wk, subs }: { idx: number; course: string; wk: number; subs?: string[] }) {
  const s = students[idx]
  const list = subs ?? actualSubs(course, wk)
  const c = courseObj(course)
  const ov = effOverride(idx, course, wk)
  let present = 0, qd = 0, qc = 0, hwc = 0
  list.forEach((sub) => { const r = R[s.idx][sub]?.[wk]; if (!r) return; if (r.att === "present" || r.att === "makeup") present++; qd += r.lqDone; qc += r.lqCorrect; if (r.collected) hwc++ })
  const n = list.length
  const barRows = list.map((sub) => {
    const r = R[s.idx][sub]?.[wk]
    const noCls = ov.noClass[sub]
    return { label: SUBJ[sub].short, quiz: r && !noCls && r.lqDone ? pct(r.lqCorrect, r.lqT) : null, hw: r && !noCls && r.collected ? pct(r.hwScore ?? 0, r.hwT) : null }
  })

  return (
    <div className="mx-auto flex aspect-[210/297] w-full max-w-[560px] flex-col overflow-hidden rounded-md border bg-white shadow-xl" data-n={n}>
      <div className="shrink-0 px-5 py-4 text-white" style={{ background: "linear-gradient(125deg,#443398,#6d5bd0 62%,#8f74e6)" }}>
        <div className="mb-3 flex items-center gap-2">
          <div className="flex size-6 items-center justify-center rounded-md bg-white/20 text-xs font-extrabold">N</div>
          <div className="text-xs font-bold tracking-wide">NockAcademy</div>
          <div className="ml-auto rounded-full border border-white/30 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest opacity-90">รายงานผลการเรียน</div>
        </div>
        <div className="text-lg font-bold leading-tight">{s.name}</div>
        <div className="text-[11px] opacity-90">{c.n} · สัปดาห์ที่ {wk} · {ov.dateRange || WK_DATE[wk]}</div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2.5 p-4 text-[#2a2a33]">
        <div className="grid grid-cols-3 gap-2">
          {[["เข้าเรียน", `${present}/${n}`], ["Quiz ถูกเฉลี่ย", `${pct(qc, qd)}%`], ["ส่งการบ้าน", `${hwc}/${n}`]].map(([l, v]) => (
            <div key={l} className="rounded-lg border bg-slate-50 px-2 py-2 text-center">
              <div className="text-base font-extrabold text-[#5645b8]">{v}</div>
              <div className="text-[9px] font-semibold text-slate-500">{l}</div>
            </div>
          ))}
        </div>
        <div className="shrink-0 rounded-lg border bg-slate-50 px-2 pb-1 pt-1.5">
          <div className="mb-0.5 flex items-center justify-between px-1">
            <span className="text-[9px] font-bold text-slate-500">พัฒนาการรายวิชา (Quiz ตอบถูก %)</span>
            <span className="flex items-center gap-1 text-[8px] text-slate-500"><span className="size-2 rounded-[2px]" style={{ background: "#2a78d6" }} />Quiz</span>
          </div>
          <QuizHwBars rows={barRows} height={88} light />
        </div>
        <div className={cn("grid min-h-0 gap-2", n >= 4 ? "grid-cols-2" : "grid-cols-1")}>
          {list.map((sub, i) => {
            const r = R[s.idx][sub]?.[wk]
            const acc = ACC[sub] || "#6d5bd0"
            const noCls = ov.noClass[sub]
            const att = noCls ? "ไม่มีเรียน" : r?.att === "makeup" ? "เข้าเรียน (ชดเชย)" : r?.att === "present" ? "เข้าเรียน" : "ขาดเรียน"
            const attCls = noCls ? "bg-slate-100 text-slate-500" : r?.att === "absent" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
            return (
              <div key={sub + i} className="overflow-hidden rounded-lg border" style={{ borderLeft: `3px solid ${acc}` }}>
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5">
                  <span className="size-2 rounded-full" style={{ background: acc }} />
                  <span className="text-xs font-bold">{ov.rename[sub] || SUBJ[sub].n}</span>
                  {ov.makeup[sub] && <span className="rounded-full bg-blue-100 px-1.5 text-[9px] font-semibold text-blue-600">ชดเชย</span>}
                  <span className={cn("ml-auto rounded-full px-1.5 text-[9px] font-semibold", attCls)}>{att}</span>
                </div>
                <div className="flex flex-wrap gap-1 px-3 pt-1.5">
                  <Metric l="Quiz ตอบถูก" v={r?.lqDone ? `${r.lqCorrect}/${r.lqT}` : "–"} c={acc} />
                  <Metric l="ทำ" v={r?.lqDone ? `${r.lqDone}/${r.lqT}` : "–"} />
                  <Metric l="การบ้าน" v={ov.lateHw[sub] ? "ขยายเวลา" : r?.collected ? `${r.hwScore}/${r.hwT}` : "ไม่ส่ง"} />
                </div>
                <div className={cn("px-3 pb-2 pt-1.5 text-[10.5px] leading-snug text-slate-600", n >= 4 ? "line-clamp-3" : "line-clamp-[7]")}>{fbText(course, sub, wk)}</div>
              </div>
            )
          })}
          {ov.extraSubs.map((e, i) => (
            <div key={e.id} className="overflow-hidden rounded-lg border" style={{ borderLeft: "3px solid #94a3b8" }}>
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5">
                <span className="size-2 rounded-full bg-slate-400" />
                <span className="text-xs font-bold">{e.name || `วิชาเพิ่มเติม ${i + 1}`}</span>
                {e.date && <span className="ml-auto text-[9px] text-slate-400">{e.date}</span>}
              </div>
              <div className="px-3 pb-2 pt-1.5 text-[10.5px] leading-snug text-slate-400">{e.livestreamId ? `Livestream: ${e.livestreamId}` : "วิชาที่เพิ่มในรายงาน"}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Metric({ l, v, c }: { l: string; v: string; c?: string }) {
  return (
    <span className="rounded-md border bg-slate-50 px-1.5 py-0.5 text-[10px] text-slate-500">
      {l} <b className="font-bold" style={c ? { color: c } : undefined}>{v}</b>
    </span>
  )
}
