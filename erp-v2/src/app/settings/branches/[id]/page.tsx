"use client"

import { Page, PageHeader, Tabs } from "@/components/app/page-layout"
import { InfoTip } from "@/components/reports/charts"
import { useQueryState } from "@/lib/hooks"
import Link from "next/link"
import { useParams } from "next/navigation"
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
import { useStore } from "@/store/store"
import { branchShort, tx } from "@/lib/i18n"

/** The 11 per-branch tabs of staging's Settings → Branch, in the same order. */
const TABS: { id: string; label: string; icon: typeof BuildingIcon; body: (b: Branch, jump: (tab: string) => void) => React.ReactNode }[] = [
  { id: "info", label: "ข้อมูลสาขา", icon: BuildingIcon, body: (b, jump) => <BranchInfoTab branch={b} onJump={jump} /> },
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
  const me = useStore((s) => s.me())
  const full = can(me, "settings.manage")
  const [tab, setTab] = useQueryState<string>("tab", full ? "info" : "scheduling")

  if (!branch || (!full && !inBranch(me, branch.id))) return <p className="p-10 text-center text-sm text-muted-foreground">{tx("ไม่พบสาขานี้ —")} <Link href="/settings" className="underline">{tx("กลับไปรายชื่อสาขา")}</Link></p>
  // Admin/Manager: only the holidays part of Scheduling
  const tabs = full ? TABS : [{ ...TABS.find((t) => t.id === "scheduling")!, label: tx("วันหยุด"), body: (b: Branch) => <SchedulingTab branch={b} holidaysOnly /> }]
  const current = tabs.find((t) => t.id === tab) ?? tabs[0]

  return (
    <Page className="pb-16">
      <div className="space-y-1">
        <Link href="/settings" className="flex items-center gap-1 text-xs text-muted-foreground hover:underline"><ChevronLeftIcon className="size-3.5" />  {tx("กลับไปรายชื่อสาขา")}</Link>
        {/* owner 2026-10-13: the branch status sits on the header line, not in its own bar */}
        <PageHeader
          title={<span className="flex flex-wrap items-center gap-2">{branchShort(branch)} <span className="text-sm font-normal text-muted-foreground">{branch.code}</span> <Pill tone={branch.active ? "green" : "gray"}>{branch.active ? tx("เปิดอยู่") : tx("ปิดแล้ว")}</Pill></span>}
          description={branch.address || tx("ยังไม่มีที่อยู่")}
          actions={full && <>
            <InfoTip text={tx("สาขาที่ปิดจะไม่ขึ้นในตัวเลือกสาขา และรับงานใหม่ไม่ได้")} />
            <Button variant={branch.active ? "outline" : "default"}
              onClick={() => report(setActive(branch.id, !branch.active), branch.active ? tx("ปิดสาขาแล้ว") : tx("เปิดสาขาแล้ว"))}>
              {branch.active ? tx("ปิดสาขา") : tx("เปิดสาขา")}
            </Button>
          </>} />
      </div>

      {/* owner 2026-10-13: the same underline tabs as Reports, across the top */}
      <Tabs value={current.id} onChange={setTab} options={tabs.map((t) => ({ value: t.id, label: tx(t.label), icon: t.icon }))} />
      {/* keyed by branch+tab so every tab starts its draft from the saved branch */}
      <div key={`${branch.id}-${current.id}`}>{current.body(branch, setTab)}</div>
    </Page>
  )
}
