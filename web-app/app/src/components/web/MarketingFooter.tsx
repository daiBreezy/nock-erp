import { useNavigate } from 'react-router-dom'
import { HelpCircle, Phone, Video } from 'lucide-react'
import { FacebookIcon } from '../BrandIcons'
import logoFull from '../../assets/media/full-icon.png'

/** Footer โทนสว่าง (ใช้ร่วมทุกหน้า marketing) อิงดีไซน์ Figma จริง — 3 คอลัมน์ */
export default function MarketingFooter() {
  const navigate = useNavigate()
  const go = (to: string) => navigate(to)

  return (
    <footer className="border-t border-line bg-[#FFF3F4] px-5 py-12 text-sm text-ink-soft">
      <div className="mx-auto max-w-[1200px]">
        <img src={logoFull} alt="NockAcademy" className="mb-8 h-9 w-auto" />
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h5 className="mb-3 font-semibold text-ink">ติดต่อ</h5>
            <button onClick={() => go('/faq')} className="flex items-center gap-2 py-1 hover:text-brand">
              <HelpCircle size={16} /> คำถามที่พบบ่อย
            </button>
            <a href="tel:0990624026" className="flex items-center gap-2 py-1 hover:text-brand">
              <Phone size={16} /> 099-062-4026
            </a>
            <a href="#" className="flex items-center gap-2 py-1 hover:text-brand">
              <FacebookIcon size={16} /> Facebook
            </a>
            <a href="#" className="flex items-center gap-2 py-1 hover:text-brand">
              <Video size={16} /> Youtube
            </a>
          </div>
          <div>
            <h5 className="mb-3 font-semibold text-ink">เกี่ยวกับเรา</h5>
            <button onClick={() => go('/grade')} className="block py-1 hover:text-brand">ชั้นเรียน</button>
            <button onClick={() => go('/')} className="block py-1 hover:text-brand">คลิป</button>
            <button onClick={() => go('/courses')} className="block py-1 hover:text-brand">คอร์สของเรา</button>
            <button onClick={() => go('/articles')} className="block py-1 hover:text-brand">บทความ</button>
            <button onClick={() => go('/auth')} className="block py-1 text-left hover:text-brand">
              ลงชื่อเข้าใช้ / สร้างบัญชีใหม่
            </button>
          </div>
          <div>
            <h5 className="mb-3 font-semibold text-ink">ความช่วยเหลือ</h5>
            <button onClick={() => go('/terms')} className="block py-1 text-left hover:text-brand">Term and Conditions</button>
            <a href="#" className="block py-1 hover:text-brand">Refund Policy</a>
            <a href="#" className="block py-1 hover:text-brand">Privacy and Cookie Policy</a>
            <a href="#" className="block py-1 hover:text-brand">Data Protection Policy</a>
            <button onClick={() => go('/nock-for-school')} className="block py-1 text-left hover:text-brand">Nockacademy สำหรับโรงเรียน</button>
          </div>
        </div>
        <div className="mt-10 text-center text-[12.5px] text-ink-mute">
          Copyright © 2026 NockAcademy
        </div>
      </div>
    </footer>
  )
}
