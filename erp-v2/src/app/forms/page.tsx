"use client"

import { useState } from "react"
import { ArrowRightIcon, ExternalLinkIcon, FileTextIcon, RotateCwIcon, SendIcon, SmartphoneIcon, UserRoundIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FormLang } from "@/domain/types"
import { cn } from "@/lib/utils"

// Every parent form in one place (owner 2026-10-05: "อยากเห็น Form ได้ทันที ไม่ต้องส่งก่อน") — open each one right
// away in preview mode (nothing is sent), see what it asks and where the answers land in the ERP.

interface FormDoc {
  key: string
  name: string
  short: string
  url: (lang: FormLang, brand: "nockacademy" | "liclass") => string
  brandMatters?: boolean
  who: string
  how: string
  steps: { title: string; fields: string[] }[]
  lands: string[]
}

const FORMS: FormDoc[] = [
  {
    key: "test", name: "สอบวัดระดับ (Test)", short: "นัดสอบวัดระดับ",
    url: (lang, brand) => `/liff/form?preview=test&lang=${lang}&brand=${brand}`, brandMatters: true,
    who: "ผู้ปกครองของ Lead", how: "Admin กด \"ส่งฟอร์ม\" ในหน้า Lead หรือ Inbox → เลือกวิชา + เวลาที่จะเสนอ → ส่งลิงก์ทาง LINE (ต้องผูก LINE ก่อน)",
    steps: [
      { title: "1 · ผู้ปกครอง", fields: ["ชื่อ *, นามสกุล", "ความสัมพันธ์ · วันเกิด", "LINE (ผูกให้อัตโนมัติเมื่อเปิดใน LINE) · อีเมล", "เบอร์โทร * (เพิ่มได้หลายเบอร์ เลือกเบอร์หลัก)", "เพิ่มผู้ปกครองได้หลายคน + เลือกผู้ติดต่อหลัก", "รู้จักเราจากช่องทางไหน (เลือกได้หลายข้อ)", "ที่อยู่ + ปักหมุดบนแผนที่ + รายละเอียดที่อยู่", "ต้องการใบกำกับภาษี: ชื่อ / เลขผู้เสียภาษี / ที่อยู่ (ไม่บังคับ)"] },
      { title: "2 · นักเรียน (เพิ่มได้หลายคน)", fields: ["ชื่อ *, นามสกุล, ชื่อเล่น", "ระดับชั้น * · วันเกิด · โรงเรียน · หมายเหตุ", "วิชาที่สนใจ * (หลายวิชาได้)", "วัน-เวลาสอบ * — จากเวลาที่ Admin เสนอ · หลายวิชาวันเดียวกัน = เวลาเดียวกัน 2 ชม."] },
      { title: "3 · ตรวจสอบ", fields: ["ดูข้อมูลทั้งหมด กดแก้กลับไปขั้นไหนก็ได้ → ส่ง"] },
    ],
    lands: ["Inbox: การ์ดตรวจฟอร์ม (แก้เวลาได้) → อนุมัติ", "อนุมัติ = จองคาบสอบจริงในปฏิทิน + สร้าง/ผูกครอบครัวและนักเรียน", "Lead เลื่อนเป็น \"นัดสอบวัดระดับ\" → เช็คชื่อ \"มา\" แล้วเป็น \"สอบแล้ว\" เอง"],
  },
  {
    key: "trial", name: "ทดลองเรียน (Trial)", short: "นัดทดลองเรียน",
    url: (lang, brand) => `/liff/form?preview=trial&lang=${lang}&brand=${brand}`, brandMatters: true,
    who: "ผู้ปกครองของ Lead (ปกติหลังสอบแล้ว)", how: "เหมือนฟอร์มสอบ — Admin ส่งจากหน้า Lead / Inbox · ครอบครัวเดิมเห็นข้อมูลที่เคยให้ไว้แล้ว แค่ตรวจ",
    steps: [
      { title: "1 · ผู้ปกครอง", fields: ["เหมือนฟอร์มสอบ (ข้อมูลเดิมขึ้นให้เป็นการ์ด กดแก้ได้)"] },
      { title: "2 · นักเรียน", fields: ["ข้อมูลน้อง (ขึ้นจากที่เคยกรอก)", "วิชาที่สนใจ * · วัน-เวลาทดลองเรียน * (เวลาว่างทั่วไป หรือเข้าคลาสจริงที่มีอยู่)"] },
      { title: "3 · ตรวจสอบ", fields: ["ตรวจแล้วส่ง"] },
    ],
    lands: ["Inbox: การ์ดตรวจ → อนุมัติ = จองเข้าคาบ (หรือเข้าคลาสจริง)", "Lead เป็น \"นัดทดลองเรียน\" → เช็คชื่อ \"มา\" แล้วเป็น \"ทดลองเรียนแล้ว\" → ออกใบแจ้งหนี้"],
  },
  {
    key: "enroll", name: "สมัครเรียนทันที", short: "ไม่ต้องสอบ / ทดลอง",
    url: (lang, brand) => `/liff/form?preview=enroll&lang=${lang}&brand=${brand}`, brandMatters: true,
    who: "ผู้ปกครองที่อยากสมัครเลย", how: "ปุ่ม \"สมัครเรียน\" บน LINE Rich Menu (ลิงก์ประจำสาขา: Settings › สาขา › LINE) หรือ Admin กด \"ส่งใบสมัครเรียน\" ในหน้า Lead",
    steps: [
      { title: "1 · ผู้ปกครอง", fields: ["เหมือนฟอร์มสอบ (ชื่อ เบอร์ ที่อยู่ ใบกำกับภาษี ฯลฯ)"] },
      { title: "2 · นักเรียน (เพิ่มได้หลายคน)", fields: ["ชื่อ *, ชื่อเล่น, ระดับชั้น *, วันเกิด, โรงเรียน, หมายเหตุ", "อยากเรียนวิชา * (หรือเลือกคอร์ส)", "คอร์สที่สนใจ — กรองตามชั้น + วิชา พร้อมราคา (ไม่แน่ใจเว้นได้)", "รูปแบบแพ็กเกจ: รายเดือน / ชั่วโมง / สัปดาห์ / ยังไม่แน่ใจ", "วัน-เวลาที่สะดวก * (ตาราง 7 วัน × เช้า/บ่าย/เย็น)", "อยากเริ่มเรียนวันที่ *", "ต้องการรถรับส่ง (Liclass)", "ให้ครูประเมินระดับในคาบแรก (เลือกไว้ให้)"] },
      { title: "3 · ตรวจสอบ", fields: ["ยอมรับเงื่อนไขการเรียน การลา และการชำระเงิน * → ส่ง"] },
    ],
    lands: ["CRM: \"ใบสมัครเรียนรอจัดคลาส\" ด้านบน → Admin เลือกคอร์ส + คลาส + วันเริ่ม", "สร้างครอบครัว + นักเรียน + Lead \"สมัครตรง\" (รอชำระ) + ร่างใบแจ้งหนี้ (รวมค่าแรกเข้า)", "ส่งใบ → จ่ายครบ = เข้าคลาส + เป็นนักเรียนอัตโนมัติ"],
  },
  {
    key: "exit", name: "แจ้งหยุดเรียน", short: "เมื่อนักเรียนจะออก",
    url: (lang) => `/liff/exit?preview=1&lang=${lang}`,
    who: "ผู้ปกครองของนักเรียนที่จะออก", how: "ผู้ปกครองบอก Admin → หน้านักเรียน กด \"แจ้งออก\" (ใส่วันเรียนวันสุดท้าย) → ส่งทาง LINE หรือคัดลอกลิงก์ · ลิงก์ใช้ได้ครั้งเดียว 14 วัน",
    steps: [
      { title: "หน้าเดียว", fields: ["ชื่อลูก + วันเรียนวันสุดท้าย (ระบบใส่ให้)", "เหตุผลหลัก * (เลือก 1) · เหตุผลอื่น (หลายข้อ) — รายการแก้ได้ใน Settings › ระบบ", "ให้ดาว 1–5: ครู · เนื้อหา · แอดมิน · ความคุ้มค่า", "จะกลับมาเรียนไหม * (กลับแน่นอน / อาจจะ / คงไม่) + ประมาณเดือนไหน", "แนะนำเพื่อนไหม 0–10", "อยากบอกอะไรเรา · ยินยอมให้ติดต่อเมื่อมีโปรโมชัน"] },
    ],
    lands: ["หน้านักเรียน: แผง \"แจ้งออก\" เห็นคำตอบ → \"ปิดการออก\" (เลือกคืนเงิน / เครดิต / ไม่มี)", "Archive + ออกจากคลาสหลังวันสุดท้าย · ตอบ \"กลับ / อาจจะ\" → Lead ไว้โทรหาเดือนนั้น", "Reports › นักเรียน: ทำไมนักเรียนออก + คะแนน"],
  },
  {
    key: "survey", name: "ความพึงพอใจประจำปี", short: "ปีละครั้ง ก.ย.–ต.ค.",
    url: (lang) => `/liff/survey?preview=1&lang=${lang}`,
    who: "ทุกครอบครัวที่ลูกยังเรียนอยู่ (1 ฟอร์มต่อครอบครัว)", how: "Settings › ระบบ › \"แบบสอบถามความพึงพอใจประจำปี\" → ส่งปีนี้ (LINE หรือลิงก์) · เตือน 1 ครั้งหลัง 7 วัน",
    steps: [
      { title: "หน้าเดียว", fields: ["จะแนะนำเราให้เพื่อนไหม 0–10 *", "ความพึงพอใจโดยรวม (ดาว)", "รายลูก: ครูผู้สอน · พัฒนาการของลูก · เนื้อหาเหมาะกับระดับ", "บริการ: แอดมิน · สรุปการเรียน · ตารางเรียน · สถานที่ · รถรับส่ง (ถ้าใช้) · ความคุ้มค่า", "ปีหน้าจะเรียนต่อไหม * · อยากให้เปิดวิชา/เวลาอะไรเพิ่ม", "สิ่งที่ประทับใจ · สิ่งที่อยากให้ปรับปรุง"] },
    ],
    lands: ["ไม่พอใจ (0–6 หรือไม่เรียนต่อ) → CRM ให้ Admin / Manager โทรคุยใน 3 วัน", "Reports › ความพึงพอใจ: NPS เทียบปีก่อน · รายสาขา · หัวข้อ · คะแนนครู · ความเห็น"],
  },
]

const LANGS: { key: FormLang; label: string }[] = [{ key: "th", label: "ไทย" }, { key: "en", label: "EN" }, { key: "ja", label: "日本語" }]

export default function FormsPage() {
  const [key, setKey] = useState("enroll")
  const [lang, setLang] = useState<FormLang>("th")
  const [brand, setBrand] = useState<"nockacademy" | "liclass">("nockacademy")
  const [reload, setReload] = useState(0)
  const f = FORMS.find((x) => x.key === key)!
  const url = f.url(lang, brand)
  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <title>ฟอร์มผู้ปกครอง · NockERP</title>
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold"><FileTextIcon className="size-5 text-primary" /> ฟอร์มผู้ปกครอง</h1>
        <p className="text-sm text-muted-foreground">เปิดดูทุกฟอร์มได้ทันที (โหมดตัวอย่าง — กดส่งได้ แต่ไม่มีข้อมูลไปจริง) · ดูว่าแต่ละฟอร์มถามอะไร และข้อมูลไปลงตรงไหนในระบบ</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {FORMS.map((x) => (
          <button key={x.key} type="button" onClick={() => setKey(x.key)}
            className={cn("rounded-2xl border px-4 py-2 text-left", x.key === key ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:bg-muted")}>
            <span className="block text-sm font-medium">{x.name}</span>
            <span className="block text-xs text-muted-foreground">{x.short}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_400px]">
        <section className="space-y-4 rounded-3xl bg-card p-5 shadow-sm ring-1 ring-foreground/10">
          <div className="grid gap-3 sm:grid-cols-2">
            <Info icon={UserRoundIcon} title="ใครกรอก">{f.who}</Info>
            <Info icon={SendIcon} title="ส่งยังไง">{f.how}</Info>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">ถามอะไรบ้าง <span className="font-normal text-muted-foreground">(* = ต้องกรอก)</span></p>
            {f.steps.map((s) => (
              <div key={s.title} className="rounded-2xl border p-3">
                <p className="mb-1.5 text-sm font-medium">{s.title}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">{s.fields.map((x) => <li key={x}>{x}</li>)}</ul>
              </div>
            ))}
          </div>
          <div>
            <p className="mb-1.5 text-sm font-semibold">ส่งแล้วไปไหนในระบบ</p>
            <ol className="space-y-1.5">{f.lands.map((x, i) => (
              <li key={x} className="flex items-start gap-2 text-sm"><span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">{i + 1}</span>{x}</li>
            ))}</ol>
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowRightIcon className="size-3" /> ทุกฟอร์มผู้ปกครองสลับภาษาไทย / English / 日本語 ได้เองที่หัวฟอร์ม</p>
        </section>

        <section className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <SmartphoneIcon className="size-4 text-muted-foreground" />
            <div className="flex rounded-full bg-muted p-0.5">{LANGS.map((l) => <button key={l.key} type="button" onClick={() => setLang(l.key)} className={cn("rounded-full px-2.5 py-1 text-xs", lang === l.key ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{l.label}</button>)}</div>
            {f.brandMatters && <div className="flex rounded-full bg-muted p-0.5">{(["nockacademy", "liclass"] as const).map((b) => <button key={b} type="button" onClick={() => setBrand(b)} className={cn("rounded-full px-2.5 py-1 text-xs", brand === b ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}>{b === "nockacademy" ? "NockAcademy" : "Liclass"}</button>)}</div>}
            <Button size="icon-xs" variant="ghost" className="ml-auto" aria-label="เริ่มใหม่" onClick={() => setReload((n) => n + 1)}><RotateCwIcon /></Button>
            <Button size="icon-xs" variant="ghost" aria-label="เปิดในแท็บใหม่" nativeButton={false} render={<a href={url} target="_blank" rel="noreferrer" />}><ExternalLinkIcon /></Button>
          </div>
          {/* the real form, in preview mode, at phone size */}
          <div className="mx-auto w-[390px] overflow-hidden rounded-[2.5rem] border-8 border-zinc-800 bg-zinc-800 shadow-xl">
            <iframe key={`${url}-${reload}`} src={url} title={f.name} className="h-[760px] w-full rounded-[1.9rem] bg-white" />
          </div>
        </section>
      </div>
    </div>
  )
}

function Info({ icon: Icon, title, children }: { icon: typeof UserRoundIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-muted/50 p-3">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="size-3.5" />{title}</p>
      <p className="text-sm">{children}</p>
    </div>
  )
}
