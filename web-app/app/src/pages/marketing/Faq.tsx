import { useState } from 'react'
import { Search, Plus } from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import AppShowcase from '../../components/web/AppShowcase'
import MarketingFooter from '../../components/web/MarketingFooter'

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
  const [open, setOpen] = useState(0)
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
        <div className="mb-6 flex items-center gap-2 rounded-pill border border-line bg-surface-1 px-5 py-3 text-ink-mute focus-within:border-brand">
          <Search size={20} className="shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาคำถาม..."
            className="w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-mute"
          />
        </div>

        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-mute">ไม่พบคำถามที่ตรงกับ "{query}"</p>
        )}

        {filtered.map((f) => {
          const isOpen = open === f.i
          return (
            <div
              key={f.i}
              className={`mb-3 overflow-hidden rounded-card border bg-surface-1 transition-colors ${
                isOpen ? 'border-brand shadow-sm' : 'border-line'
              }`}
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : f.i)}
                className="flex w-full items-center gap-3.5 px-5 py-4 text-left"
              >
                <span
                  className={`grid shrink-0 place-items-center rounded-full bg-brand-soft text-brand transition-transform ${
                    isOpen ? 'rotate-45' : ''
                  }`}
                  style={{ height: 26, width: 26 }}
                >
                  <Plus size={18} />
                </span>
                <span className="flex-1 text-[16px] font-semibold text-ink">{f.q}</span>
              </button>
              <div
                className="grid transition-all duration-200 ease-out"
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <p className="pb-4 pl-[60px] pr-5 text-[14.5px] leading-relaxed text-ink-soft">{f.a}</p>
                </div>
              </div>
            </div>
          )
        })}

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
