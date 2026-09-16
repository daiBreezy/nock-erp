import { useNavigate } from 'react-router-dom'
import { Download, Monitor, Tablet, Smartphone } from 'lucide-react'
import logoIcon from '../../assets/media/full-icon.png'
import downloadDevices from '../../assets/media/download-devices.png'

/** App showcase — โปรโมตแอป (ใช้ร่วมทุกหน้า marketing) อิงดีไซน์ Figma จริง */
export default function AppShowcase() {
  const navigate = useNavigate()
  return (
    <section className="bg-[#FFF3F4]">
      <div className="mx-auto grid max-w-[1200px] items-center gap-10 px-5 py-14 md:grid-cols-[1.1fr_1fr]">
        <div className="flex items-center justify-center">
          <img
            src={downloadDevices}
            alt="แอป NockAcademy บนมือถือและแท็บเล็ต"
            className="w-full max-w-[520px]"
          />
        </div>
        <div className="flex flex-col items-center text-center md:items-start md:text-left">
          <img src={logoIcon} alt="NockAcademy" className="mb-4 h-10 w-auto" />
          <p className="mb-5 mt-2 max-w-sm text-[15px] text-ink-soft">
            ยังมีฟีเจอร์อีกมากมายในแอปของเรา เรียน ทำแบบฝึกหัด และติดตามผลได้ทุกที่
          </p>
          <button
            onClick={() => navigate('/auth')}
            className="inline-flex items-center gap-2 rounded-pill bg-brand px-7 py-3.5 text-[15px] font-bold text-white hover:bg-brand-dark"
          >
            <Download size={20} /> Download for free!
          </button>
          <div className="mt-5 flex items-center gap-2.5 text-[13px] text-ink-mute">
            <span className="inline-flex gap-2 text-ink-soft">
              <Monitor size={18} />
              <Tablet size={18} />
              <Smartphone size={18} />
            </span>
            เรียนได้ทุกที่ ทุกอุปกรณ์ — เว็บ มือถือ แท็บเล็ต
          </div>
        </div>
      </div>
    </section>
  )
}
