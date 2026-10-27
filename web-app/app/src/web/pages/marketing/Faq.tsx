import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SearchInput } from '@/components/SearchFilter'
import DesktopNav from '@/web/components/DesktopNav'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import AppShowcase from '@/web/components/AppShowcase'
import MarketingFooter from '@/web/components/MarketingFooter'

/* FAQ — ย้ายจาก prototypes/faq.html เป็น React (route /faq) */

type QA = { q: string; a: string }
const faqs: QA[] = [
  {
    q: 'ฉันจะลงทะเบียนใช้งานได้อย่างไร?',
    a: 'คุณสามารถลงทะเบียนการใช้งานได้ 2 วิธี คือผ่านทาง SMS หรือทางบัญชีเฟซบุ๊กบนเว็บไซต์นี้หรือบนแอปพลิเคชัน ในกรณีที่เลือกทาง SMS บางครั้งอาจต้องรอเวลาในการรับรหัสผ่านเล็กน้อย ขึ้นอยู่กับผู้ให้บริการของพื้นที่นั้นๆ',
  },
  {
    q: 'อะไรคือความแตกต่างระหว่างโรงเรียนกวดวิชาออนไลน์ที่อื่นๆ?',
    a: 'NockAcademy เน้นคลิปบทเรียนสั้น กระชับ เข้าใจง่าย ครบ 4 วิชาหลักทุกระดับชั้น พร้อมแบบฝึกหัด ระบบการสอบ และไลฟ์สอนสด เรียนซ้ำได้ไม่จำกัด ติดตามพัฒนาการได้จริง',
  },
  {
    q: 'ดาวน์โหลดแอปพลิเคชัน NockAcademy ได้อย่างไร?',
    a: 'ดาวน์โหลดได้ฟรีทั้งระบบ iOS (App Store) และ Android (Google Play) ค้นหาคำว่า "NockAcademy" แล้วเข้าสู่ระบบด้วยบัญชีเดียวกับเว็บไซต์ได้ทันที',
  },
  {
    q: 'ถ้าหากฉันชำระเงิน ฉันจะสามารถทำอะไรได้บ้าง?',
    a: 'เมื่อสมัครแพ็กเกจ คุณจะปลดล็อกคลิปบทเรียนทั้งหมดทุกวิชา ทำแบบฝึกหัดและการสอบได้ไม่จำกัด ดูไลฟ์ย้อนหลัง และใช้งานได้ทุกอุปกรณ์ (สำหรับ Premium+ จะรวมไลฟ์สอนสดทุกวันด้วย)',
  },
  {
    q: 'ชำระค่าเรียนได้อย่างไร?',
    a: 'รองรับการชำระผ่านบัตรเครดิต/เดบิต โอนผ่านธนาคาร และช่องทางออนไลน์อื่นๆ เมื่อชำระสำเร็จ ระบบจะเปิดสิทธิ์การเรียนให้ทันที',
  },
  {
    q: 'ฉันสามารถขอคืนเงินได้หรือไม่ ถ้าฉันไม่พอใจกับผลิตภัณฑ์นี้?',
    a: 'สามารถดูเงื่อนไขการคืนเงินได้ที่หน้านโยบายการคืนเงิน (Refund Policy) ของเรา หรือสอบถามทีมงานเพิ่มเติมได้ทุกช่องทาง',
  },
  {
    q: 'ฉันจะยกเลิกการแจ้งเตือนทางอีเมลได้อย่างไร?',
    a: 'เข้าไปที่ตั้งค่าบัญชี > การแจ้งเตือน แล้วปิดการแจ้งเตือนทางอีเมล หรือกดลิงก์ "ยกเลิกการรับอีเมล" ที่ด้านล่างของอีเมลที่ได้รับ',
  },
]

export default function Faq() {
  const [open, setOpen] = useState('0')
  const [query, setQuery] = useState('')

  const filtered = faqs
    .map((f, i) => ({ ...f, i }))
    .filter((f) => !query.trim() || f.q.includes(query.trim()) || f.a.includes(query.trim()))

  return (
    <div className="min-h-screen bg-surface-1 text-ink">
      <DesktopNav />

      {/* hero */}
      <div className="px-5 pb-2 pt-14 text-center">
        <span className="text-[13px] font-bold tracking-wide text-brand">ศูนย์ช่วยเหลือ</span>
        <h1 className="mb-2 mt-2.5 text-[27px] font-bold tracking-tight sm:text-[34px]">คำถามที่พบบ่อย</h1>
        <p className="text-[15px] text-ink-soft">รวมคำตอบของคำถามที่ผู้ปกครองและนักเรียนถามบ่อยที่สุด</p>
      </div>

      {/* list */}
      <div className="mx-auto max-w-[760px] px-5 pb-16 pt-8">
        {/* search */}
        <SearchInput value={query} onChange={setQuery} placeholder="ค้นหาคำถาม..." className="mb-6 max-w-[360px]" />

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-mute">ไม่พบคำถามที่ตรงกับ "{query}"</p>
        )}

        <Accordion type="single" collapsible value={open} onValueChange={setOpen} className="space-y-3">
          {filtered.map((f) => (
            <AccordionItem
              key={f.i}
              value={String(f.i)}
              className="overflow-hidden rounded-card border border-line bg-surface-1 transition-colors data-[state=open]:border-brand data-[state=open]:shadow-sm"
            >
              <AccordionTrigger className="group gap-3.5 px-5 py-4 hover:no-underline [&>svg]:hidden">
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-transform group-data-[state=open]:rotate-45">
                  <Plus size={18} />
                </span>
                <span className="flex-1 text-[16px] font-semibold text-ink">{f.q}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-4 pl-[60px] pr-5 text-[14.5px] leading-relaxed text-ink-soft">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <p className="mt-8 text-center text-sm text-ink-soft">
          ยังไม่เจอคำตอบที่ต้องการ?{' '}
          <a href="#" className="font-semibold text-brand hover:underline">ติดต่อทีมงาน</a>
        </p>
      </div>

      <AppShowcase />
      <MarketingFooter />
    </div>
  )
}
