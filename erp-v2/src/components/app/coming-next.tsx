import { HammerIcon } from "lucide-react"

export function ComingNext({ title, fixes }: { title: string; fixes: string[] }) {
  return (
    <div className="mx-auto mt-12 max-w-lg rounded-xl border border-dashed p-8 text-center">
      <HammerIcon className="mx-auto size-8 text-muted-foreground" />
      <h2 className="mt-3 font-semibold">{title} — กำลังสร้าง</h2>
      <p className="mt-1 text-sm text-muted-foreground">หน้านี้จะแก้ปัญหาที่เจอบน Staging:</p>
      <ul className="mt-2 space-y-1 text-left text-sm">
        {fixes.map((f) => <li key={f}>• {f}</li>)}
      </ul>
    </div>
  )
}
