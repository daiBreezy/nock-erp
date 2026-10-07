"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import {
  BookOpenIcon, BuildingIcon, ChevronLeftIcon, ClockIcon, GraduationCapIcon, LandmarkIcon, MessageCircleIcon,
  PackageIcon, TagIcon, UsersIcon, WalletIcon,
} from "lucide-react"
import { Pill } from "@/components/app/badges"
import { BankTab, BranchInfoTab, LineTab, StaffTab } from "@/components/settings/branch-basic"
import { GradesTab, PackagesTab, SubjectsTab } from "@/components/settings/branch-catalog"
import { FeesTab, PromotionsTab } from "@/components/settings/branch-pricing"
import { SchedulingTab } from "@/components/settings/branch-schedule"
import { Button } from "@/components/ui/button"
import { can, inBranch } from "@/domain/rules/permissions"
import type { Branch } from "@/domain/types"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { useStore } from "@/store/store"
import { tx } from "@/lib/i18n"

/** The 11 per-branch tabs of staging's Settings → Branch, in the same order. */
const TABS: { id: string; label: string; icon: typeof BuildingIcon; body: (b: Branch) => React.ReactNode }[] = [
  { id: "info", label: "ข้อมูลสาขา", icon: BuildingIcon, body: (b) => <BranchInfoTab branch={b} /> },
  { id: "bank", label: "บัญชีธนาคาร", icon: LandmarkIcon, body: (b) => <BankTab branch={b} /> },
  { id: "line", label: "LINE Integration", icon: MessageCircleIcon, body: (b) => <LineTab branch={b} /> },
  { id: "scheduling", label: "เวลาเปิด-ปิด & วันหยุด", icon: ClockIcon, body: (b) => <SchedulingTab branch={b} /> },
  { id: "subjects", label: "วิชา", icon: BookOpenIcon, body: (b) => <SubjectsTab branch={b} /> },
  { id: "grades", label: "ระดับชั้น", icon: GraduationCapIcon, body: (b) => <GradesTab branch={b} /> },
  { id: "packages", label: "แพ็กเกจ & ราคา", icon: PackageIcon, body: (b) => <PackagesTab branch={b} /> },
  { id: "fees", label: "ค่าธรรมเนียม", icon: WalletIcon, body: (b) => <FeesTab branch={b} /> },
  { id: "promotions", label: "โปรโมชัน", icon: TagIcon, body: (b) => <PromotionsTab branch={b} /> },
  { id: "staff", label: "บุคลากร", icon: UsersIcon, body: (b) => <StaffTab branch={b} /> },
]

export default function BranchSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const branch = useStore((s) => s.branches.find((b) => b.id === id))
  const setActive = useStore((s) => s.setBranchActive)
  const me = useStore((s) => s.staff.find((x) => x.id === s.userId)!)
  const full = can(me, "settings.manage")
  const [tab, setTab] = useState(full ? "info" : "scheduling")

  if (!branch || (!full && !inBranch(me, branch.id))) return <p className="p-10 text-center text-sm text-muted-foreground">{tx("ไม่พบสาขานี้ —")} <Link href="/settings" className="underline">{tx("กลับไปรายชื่อสาขา")}</Link></p>
  // Admin/Manager: only the holidays part of Scheduling
  const tabs = full ? TABS : [{ ...TABS.find((t) => t.id === "scheduling")!, label: tx("วันหยุด"), body: (b: Branch) => <SchedulingTab branch={b} holidaysOnly /> }]
  const current = tabs.find((t) => t.id === tab)!

  return (
    <div className="mx-auto max-w-6xl space-y-4 pb-16">
      <div>
        <Link href="/settings" className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"><ChevronLeftIcon className="size-3.5" />  {tx("กลับไปรายชื่อสาขา")}</Link>
        <h1 className="mt-1 text-xl font-semibold">{branch.name}</h1>
        <p className="text-sm text-muted-foreground">{branch.address || tx("ยังไม่มีที่อยู่")}</p>
      </div>

      {full && <div className="flex flex-wrap items-center gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-foreground/5">
        <span className="font-medium">{tx("สถานะ")}</span>
        <Pill tone={branch.active ? "green" : "gray"}>{branch.active ? tx("เปิดอยู่") : tx("ปิดแล้ว")}</Pill>
        <span className="flex-1 text-xs text-muted-foreground">{tx("สาขาที่ปิดจะไม่ขึ้นในตัวเลือกสาขา และรับงานใหม่ไม่ได้")}</span>
        <Button size="sm" variant={branch.active ? "outline" : "default"}
          onClick={() => report(setActive(branch.id, !branch.active), branch.active ? tx("ปิดสาขาแล้ว") : tx("เปิดสาขาแล้ว"))}>
          {branch.active ? tx("ปิดสาขา") : tx("เปิดสาขา")}
        </Button>
      </div>}

      <div className="grid gap-4 md:grid-cols-[13rem_1fr]">
        <nav className="flex gap-1 overflow-x-auto rounded-3xl bg-card p-2 shadow-sm ring-1 ring-foreground/5 md:flex-col md:self-start">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-left text-sm", tab === t.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted")}>
              <t.icon className="size-4" /> {tx(t.label)}
            </button>
          ))}
        </nav>
        {/* keyed by branch+tab so every tab starts its draft from the saved branch */}
        <div key={`${branch.id}-${tab}`}>{current.body(branch)}</div>
      </div>
    </div>
  )
}
