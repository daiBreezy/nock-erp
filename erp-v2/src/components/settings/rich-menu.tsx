"use client"

import { useState } from "react"
import { CopyIcon, ExternalLinkIcon, MessageCircleIcon, RefreshCwIcon, UserPlusIcon, ClipboardListIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { fmtDateTime } from "@/domain/dates"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { publishEnrollLink } from "@/lib/forms"
import { useStore } from "@/store/store"
import { SettingsCard } from "./common"

/**
 * LINE Rich Menu (owner 2026-10-05: "ยังไม่มี Rich Menu แต่น่าสนใจ"): the branch's enroll-now link to put on the menu,
 * refreshed whenever courses / prices change (same link — the menu never needs editing again).
 */
export function RichMenuCard({ branch }: { branch: Branch }) {
  const setLink = useStore((s) => s.setEnrollLink)
  const [busy, setBusy] = useState(false)
  const link = branch.enrollLink
  const publish = async () => {
    setBusy(true)
    const r = await publishEnrollLink(branch.id, link?.token)
    setBusy(false)
    if (report(r, link ? "อัปเดตคอร์สและราคาในลิงก์แล้ว — ลิงก์เดิมใช้ต่อได้" : "สร้างลิงก์สมัครเรียนแล้ว")) report(setLink(branch.id, { token: r.value.token, url: r.value.url, updatedAt: new Date().toISOString() }), "")
  }
  const copy = () => { if (link) { navigator.clipboard?.writeText(link.url); report({ ok: true, value: undefined }, "คัดลอกลิงก์แล้ว") } }
  return (
    <SettingsCard title="LINE Rich Menu · สมัครเรียนทันที" hint="ปุ่มบนเมนูล่างของแชท LINE OA — ผู้ปกครองกดแล้วกรอกใบสมัคร (ไทย / EN / 日本語) โดยไม่ต้องสอบหรือทดลองเรียนก่อน · ใบสมัครเข้าที่หน้า CRM">
      <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
        <div className="space-y-3">
          {link ? (
            <>
              <div className="flex gap-1.5">
                <Input readOnly value={link.url} className="h-9 text-xs" onFocus={(e) => e.target.select()} />
                <Button variant="outline" size="icon" aria-label="คัดลอกลิงก์" onClick={copy}><CopyIcon /></Button>
                <Button variant="outline" size="icon" aria-label="เปิดดู" nativeButton={false} render={<a href={link.url.includes("liff.line.me") ? `/liff/form?token=${link.token}` : link.url} target="_blank" rel="noreferrer" />}><ExternalLinkIcon /></Button>
              </div>
              <p className="text-xs text-muted-foreground">อัปเดตล่าสุด {fmtDateTime(link.updatedAt)} · เปลี่ยนคอร์สหรือราคาแล้วกด &quot;อัปเดตคอร์สในลิงก์&quot; — ลิงก์เดิม ไม่ต้องแก้ Rich Menu</p>
            </>
          ) : <p className="text-sm text-muted-foreground">ยังไม่มีลิงก์สมัครเรียนของสาขานี้</p>}
          <Button size="sm" variant={link ? "outline" : "default"} disabled={busy} onClick={publish}><RefreshCwIcon /> {link ? "อัปเดตคอร์สในลิงก์" : "สร้างลิงก์สมัครเรียน"}</Button>
          <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
            <li>เปิด LINE Official Account Manager → แชท / หน้าหลัก → <b>ริชเมนู</b> → สร้าง</li>
            <li>เลือกเทมเพลต 3 ช่อง (ตามตัวอย่างด้านขวา) แล้วอัปโหลดรูปเมนู</li>
            <li>ช่อง &quot;สมัครเรียน&quot; → แอ็กชัน <b>ลิงก์</b> → วางลิงก์ด้านบน</li>
            <li>ช่องอื่น: &quot;นัดสอบ / ทดลองเรียน&quot; = ข้อความ (แอดมินส่งฟอร์มให้) · &quot;คุยกับแอดมิน&quot; = ข้อความ</li>
          </ol>
        </div>
        {/* suggested layout */}
        <div className="overflow-hidden rounded-2xl border bg-muted/40 text-center text-xs">
          <p className="border-b bg-background py-1.5 text-[11px] text-muted-foreground">ตัวอย่างเมนู</p>
          <div className="grid grid-cols-3 gap-px bg-border">
            <span className="flex flex-col items-center gap-1 bg-primary py-4 font-medium text-primary-foreground"><UserPlusIcon className="size-5" />สมัครเรียน</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><ClipboardListIcon className="size-5 text-primary" />นัดสอบ / ทดลองเรียน</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><MessageCircleIcon className="size-5 text-primary" />คุยกับแอดมิน</span>
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}
