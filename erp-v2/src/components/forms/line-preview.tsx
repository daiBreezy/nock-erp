"use client"

// LINE OA preview (owner 2026-11-06): what each kind of LINE user sees — a parent who hasn't paid yet, a parent who
// has, and a bus driver — in a phone frame, on the ฟอร์มผู้ปกครอง page.
import { useMemo, useState } from "react"
import { ArrowRightIcon, BusIcon, LockOpenIcon, LockIcon, UserRoundIcon } from "lucide-react"
import { PreviewLayout } from "./preview-layout"
import { DriverApp } from "@/components/driver/driver-app"
import { Segmented } from "@/components/app/page-layout"
import { ParentApp } from "@/components/parent/parent-app"
import { toDateStr } from "@/domain/dates"
import type { ParentCourseSummary } from "@/domain/rules/parent-view"
import type { Family } from "@/domain/types"
import { SAMPLE_COURSE, SAMPLE_IMPROVE, SAMPLE_OVERALL, SAMPLE_STRENGTHS, SAMPLE_TEACHER, SAMPLE_WEEK_DETAILS, SAMPLE_WEEK_NOTES } from "@/data/line-preview-sample"
import { catalogSnapshot } from "@/lib/forms"
import { useNow } from "@/lib/hooks"
import { buildParentView } from "@/lib/parent-app"
import { useStore } from "@/store/store"

type Who = "unpaid" | "paid" | "driver"

const INFO: Record<Who, { who: string; sees: string[]; how: string }> = {
  unpaid: {
    who: "ผู้ปกครองที่ยังไม่ชำระเงิน (ยังไม่มีใบแจ้งหนี้ที่จ่ายแล้ว)",
    sees: ["คอร์ส (Catalog) — ดูคอร์สและตารางเรียนของสาขา กดหัวใจเก็บที่สนใจ", "อื่นๆ — เปลี่ยนภาษา · คำขอของฉัน"],
    how: "ชำระเงินแล้วเมนูที่เหลือจะเปิดให้อัตโนมัติ",
  },
  paid: {
    who: "ผู้ปกครองที่ชำระเงินแล้ว",
    sees: ["ภาพรวม — ทุกคน ทุกคอร์ส คาบถัดไป", "ตารางเรียน — เจาะทีละคน / คอร์ส / คาบ · สรุปหลังเรียน · แจ้งลา · ขอรถรับ-ส่ง", "คอร์ส (Catalog)", "อื่นๆ — ปักหมุดบ้าน · แจ้งออก · ขอรถกลับ · ภาษา"],
    how: "ข้อมูลอัปเดตอัตโนมัติจาก ERP",
  },
  driver: {
    who: "คนขับรถรับส่ง (ของโรงเรียน หรือ Outsource) — ลิงก์แอปของแต่ละคน ไม่ต้องล็อกอิน",
    sees: ["รายการเที่ยวรถของวัน — แตะเพื่อเปิดเที่ยว", "เส้นทางทีละจุด: โทรผู้ปกครอง · นำทาง · ถึงบ้านแล้ว · รับ/ส่งแล้ว · ไม่มา · แก้ล่าสุด", "จบเที่ยว"],
    how: "แอดมินอนุมัติเที่ยวรถที่หน้ารถรับส่ง → ขึ้นในแอปคนขับ · ออฟฟิศเห็นสถานะสดบน Bus Route",
  },
}

export function LinePreview() {
  const [who, setWho] = useState<Who>("unpaid")
  const [run, setRun] = useState(0) // restart: the phone is rebuilt from scratch
  const i = INFO[who]
  return (
    <PreviewLayout onRestart={() => setRun((n) => n + 1)}
      picker={<Segmented<Who> value={who} onChange={setWho} label="มุมมอง LINE OA" options={[
        { value: "unpaid", label: "ผู้ปกครอง · ยังไม่จ่าย", icon: LockIcon },
        { value: "paid", label: "ผู้ปกครอง · จ่ายแล้ว", icon: LockOpenIcon },
        { value: "driver", label: "คนขับ", icon: BusIcon },
      ]} />}
      phone={who === "driver" ? <div key={run} className="relative h-full overflow-hidden rounded-[1.9rem] bg-white [transform:translateZ(0)]"><div className="h-full overflow-y-auto"><DriverApp token="preview" demo /></div></div> : <ParentPhone key={`${who}-${run}`} paid={who === "paid"} />}
      info={<>
        <div className="rounded-2xl bg-muted/50 p-3"><p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><UserRoundIcon className="size-3.5" />ใครใช้</p><p className="text-sm">{i.who}</p></div>
        <div className="space-y-2">
          <p className="text-sm font-semibold">เห็นอะไรบ้าง</p>
          <ul className="list-disc space-y-1 pl-5 text-sm">{i.sees.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowRightIcon className="size-3" />{i.how}</p>
        <p className="text-xs text-muted-foreground">{who === "driver" ? "ลองกดเล่นได้เลย (ไม่ส่งข้อมูลจริง) · กด เริ่มใหม่ เพื่อกลับไปเริ่มต้น" : "ลองกดเล่นได้เลย — ใช้ครอบครัวตัวอย่าง · กด เริ่มใหม่ เพื่อกลับไปเริ่มต้น"}</p>
      </>} />
  )
}

function ParentPhone({ paid }: { paid: boolean }) {
  const now = useNow()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const family: Family | undefined = useMemo(() => families.find((f) => students.some((st) => st.familyId === f.id)), [families, students])
  const view = useMemo(() => {
    if (!family) return null
    const v = { ...buildParentView(family), paid }
    // owner 2026-11-09: a sample course summary (already "sent") so the preview shows the card on the Overview and the full page
    const kid = v.children[0]
    if (paid && kid && !(kid.courseSummaries ?? []).length) {
      const day = (n: number) => toDateStr(new Date(new Date(`${toDateStr(now)}T12:00:00`).getTime() - n * 86_400_000))
      const rows = [60, 53, 46, 39, 32, 25, 18, 11, 4].map((n, i) => ({ date: day(n), attended: (i === 3 ? "leave" : "present") as "leave" | "present", text: SAMPLE_WEEK_NOTES[i] || undefined, detail: SAMPLE_WEEK_DETAILS[i] || undefined }))
      const cs: ParentCourseSummary = {
        id: "preview_cs", course: kid.packages[0]?.course ?? SAMPLE_COURSE, bundle: false, subjects: [], from: day(60), to: day(2), teacher: SAMPLE_TEACHER, sentAt: `${day(1)}T10:00:00`,
        overallProgress: SAMPLE_OVERALL,
        strengths: SAMPLE_STRENGTHS,
        toImprove: SAMPLE_IMPROVE,
        progress: rows,
      }
      return { ...v, children: [{ ...kid, courseSummaries: [cs] }, ...v.children.slice(1)] }
    }
    return v
  }, [family, paid, now])
  const catalog = useMemo(() => {
    const b = view?.children[0] ? students.find((x) => x.id === view.children[0].id)?.branchId : undefined
    const t = new Date().toISOString()
    return b ? { token: "preview", kind: "catalog" as const, ...catalogSnapshot(b), createdAt: t, updatedAt: t } : undefined
  }, [view, students])
  if (!view) return <div className="grid h-full place-items-center rounded-[1.9rem] bg-white p-6 text-center text-sm text-muted-foreground">ยังไม่มีครอบครัวตัวอย่างให้แสดง</div>
  return <div className="h-full overflow-y-auto rounded-[1.9rem] bg-white"><ParentApp view={view} today={toDateStr(now)} framed catalogPreview={catalog} /></div>
}
