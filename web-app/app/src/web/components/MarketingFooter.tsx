import { Link } from 'react-router-dom'
import { HelpCircle, Phone, Video } from 'lucide-react'
import { FacebookIcon } from '@/components/BrandIcons'
import logoFull from '@/assets/media/full-icon.png'

/** Footer โทนสว่าง (ใช้ร่วมทุกหน้า marketing) อิงดีไซน์ Figma จริง — 3 คอลัมน์ */
export default function MarketingFooter() {
  return (
    <footer className="border-t border-line bg-[#FFF3F4] px-5 py-12 text-sm text-ink-soft">
      <div className="mx-auto max-w-[1200px]">
        <img src={logoFull} alt="NockAcademy" className="mb-8 h-9 w-auto" />
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <h5 className="mb-3 font-semibold text-ink">ติดต่อ</h5>
            <Link to="/faq" className="flex items-center gap-2 py-1 hover:text-brand">
              <HelpCircle size={16} /> คำถามที่พบบ่อย
            </Link>
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
            <Link to="/grade" className="block py-1 hover:text-brand">ชั้นเรียน</Link>
            <Link to="/" className="block py-1 hover:text-brand">คลิป</Link>
            <Link to="/courses" className="block py-1 hover:text-brand">คอร์สของเรา</Link>
            <Link to="/articles" className="block py-1 hover:text-brand">บทความ</Link>
            <Link to="/auth" className="block py-1 text-left hover:text-brand">
              ลงชื่อเข้าใช้ / สร้างบัญชีใหม่
            </Link>
          </div>
          <div>
            <h5 className="mb-3 font-semibold text-ink">ความช่วยเหลือ</h5>
            <Link to="/terms" className="block py-1 text-left hover:text-brand">Term and Conditions</Link>
            <a href="#" className="block py-1 hover:text-brand">Refund Policy</a>
            <a href="#" className="block py-1 hover:text-brand">Privacy and Cookie Policy</a>
            <a href="#" className="block py-1 hover:text-brand">Data Protection Policy</a>
            <Link to="/nock-for-school" className="block py-1 text-left hover:text-brand">Nockacademy สำหรับโรงเรียน</Link>
          </div>
        </div>
        <div className="mt-10 text-center text-[12.5px] text-ink-mute">
          Copyright © 2026 NockAcademy
        </div>
      </div>
    </footer>
  )
}
