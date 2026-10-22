"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ChevronLeftIcon, LockIcon, MessageSquareTextIcon, PencilRulerIcon } from "lucide-react"
import { Page, PageHeader, Tabs } from "@/components/app/page-layout"
import { Pill } from "@/components/app/badges"
import { Empty } from "@/components/reports/charts"
import { FormBuilder, FormResponses } from "@/components/forms/form-builder"
import { can } from "@/domain/rules/permissions"
import { useQueryState } from "@/lib/hooks"
import { tx } from "@/lib/i18n"
import { useStore } from "@/store/store"

/** Settings › System › ฟอร์ม › one form (owner 2026-10-22): design it · read its answers */
export default function FormPage() {
  const { id } = useParams<{ id: string }>()
  const form = useStore((s) => s.formDefs.find((f) => f.id === id))
  const count = useStore((s) => s.formResponses.filter((r) => r.formId === id).length)
  const me = useStore((s) => s.me())
  const [tab, setTab] = useQueryState<"design" | "answers">("tab", "design")
  if (!can(me, "settings.manage")) return <Empty>{tx("ฟอร์มแก้ได้เฉพาะผู้ที่ตั้งค่าระบบได้")}</Empty>
  if (!form) return <Page><Empty>{tx("ไม่พบฟอร์มนี้")} — <Link className="text-primary underline" href="/settings?view=system&sys=forms">{tx("กลับไปรายการฟอร์ม")}</Link></Empty></Page>
  const custom = form.kind === "custom"
  return (
    <Page className="space-y-4">
      <title>{`${form.name} · NockERP`}</title>
      <Link href="/settings?view=system&sys=forms" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ChevronLeftIcon className="size-4" />{tx("ฟอร์มทั้งหมด")}</Link>
      <PageHeader title={<span className="inline-flex flex-wrap items-center gap-2">{form.name || tx("ฟอร์มใหม่")}{custom ? <Pill tone="violet">{tx("สร้างเอง")}</Pill> : <Pill tone="blue"><LockIcon className="size-3" />{tx("ระบบ")}</Pill>}</span>}
        description={form.description || undefined} />
      {custom && <Tabs value={tab} onChange={setTab} options={[{ value: "design", label: tx("ออกแบบ"), icon: PencilRulerIcon }, { value: "answers", label: `${tx("คำตอบ")} (${count})`, icon: MessageSquareTextIcon }]} />}
      {/* keyed by the saved version so "ยกเลิกการแก้" / another tab's save start from the stored form */}
      {tab === "answers" && custom ? <FormResponses form={form} /> : <FormBuilder key={form.id} form={form} />}
    </Page>
  )
}
