"use client"

// LINE OA preview (owner 2026-11-06): what each kind of LINE user sees — a parent who hasn't paid yet, a parent who
// has, and a bus driver — in a phone frame, on the ฟอร์มผู้ปกครอง page.
import { useMemo, useState } from "react"
import { BusIcon, LockOpenIcon, LockIcon, RotateCwIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DriverApp } from "@/components/driver/driver-app"
import { Segmented } from "@/components/app/page-layout"
import { ParentApp } from "@/components/parent/parent-app"
import { toDateStr } from "@/domain/dates"
import type { Family } from "@/domain/types"
import { catalogSnapshot } from "@/lib/forms"
import { useNow } from "@/lib/hooks"
import { buildParentView } from "@/lib/parent-app"
import { useStore } from "@/store/store"

type Who = "unpaid" | "paid" | "driver"

export function LinePreview() {
  const [who, setWho] = useState<Who>("unpaid")
  const [run, setRun] = useState(0) // restart: the phone is rebuilt from scratch
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Segmented<Who> value={who} onChange={setWho} label="มุมมอง LINE OA" options={[
          { value: "unpaid", label: "ผู้ปกครอง · ยังไม่จ่าย", icon: LockIcon },
          { value: "paid", label: "ผู้ปกครอง · จ่ายแล้ว", icon: LockOpenIcon },
          { value: "driver", label: "คนขับ", icon: BusIcon },
        ]} />
        <Button variant="outline" onClick={() => setRun((n) => n + 1)}><RotateCwIcon /> เริ่มใหม่</Button>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        {who === "unpaid" && "ผู้ปกครองที่ยังไม่ชำระเงิน — เห็นเฉพาะ คอร์ส (Catalog) และ อื่นๆ"}
        {who === "paid" && "ผู้ปกครองที่ชำระเงินแล้ว — เห็นครบ ภาพรวม · ตารางเรียน · คอร์ส · อื่นๆ (แจ้งลา / ขอรถ / แจ้งออก)"}
        {who === "driver" && "คนขับรถรับส่ง — ตัวอย่างเที่ยววันนี้ ลองกดเริ่มวิ่ง / ถึงบ้านแล้ว / รับแล้ว / ไม่มา ได้เลย (ไม่ส่งข้อมูลจริง)"}
      </p>
      <div className="mx-auto h-[760px] w-[390px] overflow-hidden rounded-[2.5rem] border-8 border-zinc-800 bg-zinc-800 shadow-xl">
        {who === "driver" ? <div key={run} className="h-full overflow-y-auto rounded-[1.9rem] bg-white [transform:translateZ(0)]"><DriverApp token="preview" demo /></div> : <ParentPhone key={`${who}-${run}`} paid={who === "paid"} />}
      </div>
    </div>
  )
}

function ParentPhone({ paid }: { paid: boolean }) {
  const now = useNow()
  const families = useStore((s) => s.families)
  const students = useStore((s) => s.students)
  const family: Family | undefined = useMemo(() => families.find((f) => students.some((st) => st.familyId === f.id)), [families, students])
  const view = useMemo(() => (family ? { ...buildParentView(family), paid } : null), [family, paid])
  const catalog = useMemo(() => {
    const b = view?.children[0] ? students.find((x) => x.id === view.children[0].id)?.branchId : undefined
    const t = new Date().toISOString()
    return b ? { token: "preview", kind: "catalog" as const, ...catalogSnapshot(b), createdAt: t, updatedAt: t } : undefined
  }, [view, students])
  if (!view) return <div className="grid h-full place-items-center rounded-[1.9rem] bg-white p-6 text-center text-sm text-muted-foreground">ยังไม่มีครอบครัวตัวอย่างให้แสดง</div>
  return <div className="h-full overflow-y-auto rounded-[1.9rem] bg-white"><ParentApp view={view} today={toDateStr(now)} framed catalogPreview={catalog} /></div>
}
