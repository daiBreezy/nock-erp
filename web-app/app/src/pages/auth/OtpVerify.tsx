import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { FacebookIcon } from '../../components/BrandIcons'

const OTP_LEN = 4

export default function OtpVerify() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const phone = (location.state as { phone?: string })?.phone ?? '0812345678'

  const [digits, setDigits] = useState(Array(OTP_LEN).fill(''))
  const [seconds, setSeconds] = useState(59)
  const refs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (seconds <= 0) return
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [seconds])

  const setDigit = (i: number, v: string) => {
    const c = v.replace(/\D/g, '').slice(-1)
    const next = [...digits]
    next[i] = c
    setDigits(next)
    if (c && i < OTP_LEN - 1) refs.current[i + 1]?.focus()
  }

  const complete = digits.join('').length === OTP_LEN
  const mmss = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
  const verify = () => { login(); navigate('/auth/welcome', { replace: true }) }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0">
      {/* header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={22} /></button>
          <h1 className="text-lg font-bold text-ink">ลงชื่อเข้าใช้งาน / สร้างบัญชี ฟรี</h1>
        </div>
        <button onClick={() => navigate('/')} aria-label="ปิด" className="text-ink-mute hover:text-ink"><X size={22} /></button>
      </div>

      <div className="flex-1 px-5 py-6">
        <h2 className="text-lg font-bold text-ink">ใส่รหัส OTP {OTP_LEN} หลัก ที่นี่</h2>
        <p className="mt-1 text-sm text-ink-soft">โปรดใส่รหัส OTP ที่ส่งไปที่กล่องข้อความของเบอร์ <span className="font-semibold text-ink">"{phone}"</span></p>

        <div className="mt-6 flex gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !d && i > 0) refs.current[i - 1]?.focus() }}
              inputMode="numeric"
              maxLength={1}
              className="h-16 w-16 rounded-xl border border-line bg-surface-1 text-center text-2xl font-semibold text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/40"
            />
          ))}
        </div>

        <p className="mt-4 text-sm text-ink-soft">
          หากคุณไม่ได้รับรหัส OTP ให้กดปุ่มขอรับรหัสใหม่ใน:{' '}
          {seconds > 0 ? (
            <span className="font-semibold text-ink">{mmss}</span>
          ) : (
            <button onClick={() => { setSeconds(59); setDigits(Array(OTP_LEN).fill('')) }} className="font-semibold text-brand underline">ขอรหัส OTP ใหม่</button>
          )}
        </p>

        <button onClick={verify} disabled={!complete} className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40">
          ลงชื่อเข้าใช้งาน
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs text-ink-mute">เข้าใช้งานด้วยวิธีอื่น</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="space-y-2.5">
          <button className="flex w-full items-center gap-3 rounded-2xl border border-line py-3.5 pl-5 text-sm font-medium text-ink">
            <FacebookIcon size={20} /> ลงชื่อเข้าใช้งานด้วย Facebook
          </button>
        </div>
      </div>
    </div>
  )
}
