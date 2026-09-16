import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, XCircle } from 'lucide-react'
import { FacebookIcon } from '../../components/BrandIcons'

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  )
}

export default function AuthLanding() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const valid = phone.length >= 9

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h1 className="text-lg font-bold text-ink">ลงชื่อเข้าใช้งาน / สร้างบัญชี ฟรี</h1>
        <button onClick={() => navigate('/')} aria-label="ปิด" className="text-ink-mute hover:text-ink"><X size={22} /></button>
      </div>

      <div className="flex-1 px-5 py-6">
        <h2 className="text-lg font-bold text-ink">กรอกเบอร์โทรศัพท์</h2>
        <p className="mt-1 text-sm text-ink-soft">เราจะส่ง OTP กลับไปให้คุณ ที่กล่องข้อความเบอร์โทรศัพท์</p>

        {/* phone */}
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-line px-4 focus-within:border-brand">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={10}
            placeholder="eg. 0812345678"
            className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-ink-mute"
          />
          {phone && (
            <button onClick={() => setPhone('')} aria-label="ล้าง" className="text-ink-mute hover:text-ink"><XCircle size={18} /></button>
          )}
        </div>

        {/* terms */}
        <p className="mt-4 text-xs leading-relaxed text-ink-soft">
          ลูกค้าจำเป็นต้องใช้ <span className="font-medium text-ink">เบอร์โทรศัพท์</span> หรือ <span className="font-medium text-ink">บัญชีผู้ใช้ Facebook</span> เพื่อลงทะเบียนสร้างบัญชี NockAcademy และ Login เข้าใช้งานบริการของเรา
          <br /><br />
          หากลูกค้ากดลงชื่อเข้าใช้งานด้วยวิธีหนึ่งด้านล่างต่อไปนี้ นั่นคือลูกค้าได้ยอมรับ <span className="font-medium text-brand underline">ข้อกำหนดในการให้บริการ</span> และ <span className="font-medium text-brand underline">นโยบายความเป็นส่วนตัว</span> ของ NockAcademy แล้ว
        </p>

        <button
          onClick={() => navigate('/auth/otp', { state: { phone } })}
          disabled={!valid}
          className="mt-5 w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          ลงชื่อเข้าใช้งาน
        </button>

        {/* divider */}
        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink-mute">เข้าใช้งานด้วยวิธีอื่น</span>
          <span className="h-px flex-1 bg-line" />
        </div>

        {/* social */}
        <div className="space-y-2.5">
          <button className="flex w-full items-center gap-3 rounded-2xl border border-line py-3.5 pl-5 text-sm font-medium text-ink">
            <FacebookIcon size={20} /> ลงชื่อเข้าใช้งานด้วย Facebook
          </button>
          <button className="flex w-full items-center gap-3 rounded-2xl border border-line py-3.5 pl-5 text-sm font-medium text-ink">
            <GoogleIcon size={20} /> ลงชื่อเข้าใช้งานด้วย Google
          </button>
        </div>
      </div>
    </div>
  )
}
