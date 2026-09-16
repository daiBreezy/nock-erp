import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

export default function EmailAuth() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [show, setShow] = useState(false)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')

  const submit = () => {
    login()
    navigate(mode === 'signup' ? '/auth/welcome' : '/', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 px-6">
      <header className="-mx-2 py-3">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
      </header>

      <div className="flex flex-1 flex-col">
        {/* toggle */}
        <div className="mt-2 flex rounded-pill bg-surface-2 p-1">
          <button onClick={() => setMode('signin')} className={`flex-1 rounded-pill py-2 text-sm font-medium ${mode === 'signin' ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-soft'}`}>เข้าสู่ระบบ</button>
          <button onClick={() => setMode('signup')} className={`flex-1 rounded-pill py-2 text-sm font-medium ${mode === 'signup' ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-soft'}`}>สมัครสมาชิก</button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">อีเมล</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@email.com"
              className="h-12 w-full rounded-xl border border-line bg-surface-1 px-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">รหัสผ่าน</span>
            <div className="flex items-center rounded-xl border border-line bg-surface-1 px-3">
              <input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={show ? 'text' : 'password'}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="h-12 flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setShow((s) => !s)} aria-label="แสดงรหัสผ่าน" className="text-ink-mute">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {mode === 'signin' && (
            <button className="text-sm font-medium text-brand">ลืมรหัสผ่าน?</button>
          )}
        </div>

        <button
          onClick={submit}
          disabled={!email || pw.length < 8}
          className="mt-6 w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white disabled:opacity-40"
        >
          {mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </button>
      </div>
    </div>
  )
}
