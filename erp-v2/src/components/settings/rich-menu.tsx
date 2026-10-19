"use client"

import { BusIcon, CalendarOffIcon, MessageCircleIcon, UserPlusIcon, ClipboardListIcon, SmartphoneIcon } from "lucide-react"
import type { Branch } from "@/domain/types"
import { SettingsCard } from "./common"
import { tx } from "@/lib/i18n"

/**
 * LINE Rich Menu (owner 2026-10-05: "ยังไม่มี Rich Menu แต่น่าสนใจ"): the branch's enroll-now link to put on the menu,
 * refreshed whenever courses / prices change (same link — the menu never needs editing again).
 */
export function RichMenuCard({ branch }: { branch: Branch }) {
  void branch
  // parent app (owner 2026-10-09) — one link for every branch; LINE tells us which family is opening it
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID
  const parentAppUrl = liffId ? `https://liff.line.me/${liffId}?app=parent` : "/liff/form?app=parent"
  // owner 2026-10-19: tiles that open the parent app straight on a request — แจ้งลา, รถรับส่ง (ask for / cancel rides)
  const leaveUrl = `${parentAppUrl}&act=leave`, busUrl = `${parentAppUrl}&act=bus`
  // owner 2026-10-15: no self-serve enroll link — every family talks to an admin first; the admin then sends the
  // enroll form with the classes to pick from (Inbox › + › ฟอร์ม › Enroll)
  return (
    <SettingsCard title="LINE Rich Menu" hint={tx("ปุ่มบนเมนูล่างของแชท LINE OA — ทุกเรื่องเริ่มจากคุยกับแอดมิน แล้วแอดมินส่งฟอร์มที่เหมาะให้ในแชท")}>
      <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>{tx("เปิด LINE Official Account Manager → แชท / หน้าหลัก →")} <b>{tx("ริชเมนู")}</b>  {tx("→ สร้าง")}</li>
          <li>{tx("เลือกเทมเพลต 6 ช่อง (ตามตัวอย่างด้านขวา) แล้วอัปโหลดรูปเมนู")}</li>
          <li>{tx("ช่อง \"สมัครเรียน\" → แอ็กชัน")} <b>{tx("ข้อความ")}</b>  {tx("เช่น \"อยากสมัครเรียนค่ะ\" — เข้าแชท แอดมินคุยแล้วส่งใบสมัคร + คลาสให้เลือก")}</li>
          <li>{tx("ช่อง \"นัดสอบ / ทดลองเรียน\" และ \"คุยกับแอดมิน\" → แอ็กชัน")} <b>{tx("ข้อความ")}</b>  {tx("(แอดมินส่งฟอร์ม Test / Trial ให้)")}</li>
          <li>{tx("ช่อง \"ข้อมูลการเรียน\" (App ผู้ปกครอง) → แอ็กชัน")} <b>{tx("ลิงก์")}</b> → <code className="rounded bg-muted px-1">{parentAppUrl}</code>  {tx("· ผู้ปกครองที่ผูก LINE กับครอบครัวแล้วเห็นตาราง ครู สรุป การเข้าเรียน รถรับส่ง ของลูกทันที")}</li>
          <li>{tx("ช่อง \"แจ้งลา\" → แอ็กชัน")} <b>{tx("ลิงก์")}</b> → <code className="rounded bg-muted px-1 break-all">{leaveUrl}</code></li>
          <li>{tx("ช่อง \"รถรับส่ง\" → แอ็กชัน")} <b>{tx("ลิงก์")}</b> → <code className="rounded bg-muted px-1 break-all">{busUrl}</code>  {tx("· ผู้ปกครองขอรอบรถเพิ่ม / ยกเลิกรอบ → การ์ดขึ้นในแชท Inbox ให้แอดมินอนุมัติ · รอบที่เพิ่มคิดเงินในใบแจ้งหนี้รอบถัดไป")}</li>
        </ol>
        {/* suggested layout */}
        <div className="overflow-hidden rounded-2xl border bg-muted/40 text-center text-xs">
          <p className="border-b bg-background py-1.5 text-[11px] text-muted-foreground">{tx("ตัวอย่างเมนู")}</p>
          <div className="grid grid-cols-2 gap-px bg-border">
            <span className="flex flex-col items-center gap-1 bg-primary py-4 font-medium text-primary-foreground"><UserPlusIcon className="size-5" />{tx("สมัครเรียน")}</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><ClipboardListIcon className="size-5 text-primary" />{tx("นัดสอบ / ทดลองเรียน")}</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><MessageCircleIcon className="size-5 text-primary" />{tx("คุยกับแอดมิน")}</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><SmartphoneIcon className="size-5 text-primary" />{tx("ข้อมูลการเรียน")}</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><CalendarOffIcon className="size-5 text-primary" />{tx("แจ้งลา")}</span>
            <span className="flex flex-col items-center gap-1 bg-background py-4"><BusIcon className="size-5 text-primary" />{tx("รถรับส่ง")}</span>
          </div>
        </div>
      </div>
    </SettingsCard>
  )
}
