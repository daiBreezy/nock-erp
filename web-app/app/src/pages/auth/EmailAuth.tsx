import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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

  const tabCls = (on: boolean) =>
    `h-auto flex-1 rounded-pill py-2 text-sm font-medium ${on ? 'bg-surface-1 text-ink shadow-sm hover:bg-surface-1' : 'text-ink-soft hover:bg-transparent hover:text-ink'}`

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 px-6">
      <header className="-mx-2 py-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink hover:bg-transparent"><ChevronLeft size={24} /></Button>
      </header>

      <div className="flex flex-1 flex-col">
        {/* toggle */}
        <div className="mt-2 flex rounded-pill bg-surface-2 p-1">
          <Button variant="ghost" onClick={() => setMode('signin')} className={tabCls(mode === 'signin')}>เข้าสู่ระบบ</Button>
          <Button variant="ghost" onClick={() => setMode('signup')} className={tabCls(mode === 'signup')}>สมัครสมาชิก</Button>
        </div>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="email" className="mb-1.5 block text-xs text-ink-soft">อีเมล</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="name@email.com"
              className="h-12 rounded-xl border-line bg-surface-1 text-sm focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>
          <div>
            <Label htmlFor="pw" className="mb-1.5 block text-xs text-ink-soft">รหัสผ่าน</Label>
            <div className="flex items-center rounded-xl border border-line bg-surface-1 px-3 focus-within:border-brand">
              <Input
                id="pw"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={show ? 'text' : 'password'}
                placeholder="อย่างน้อย 8 ตัวอักษร"
                className="h-12 flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
              />
              <button onClick={() => setShow((s) => !s)} aria-label="แสดงรหัสผ่าน" className="text-ink-mute">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {mode === 'signin' && (
            <Button variant="link" className="h-auto p-0 text-sm font-medium text-brand hover:no-underline">ลืมรหัสผ่าน?</Button>
          )}
        </div>

        <Button
          onClick={submit}
          disabled={!email || pw.length < 8}
          className="mt-6 h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark disabled:opacity-40"
        >
          {mode === 'signup' ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
        </Button>
      </div>
    </div>
  )
}
