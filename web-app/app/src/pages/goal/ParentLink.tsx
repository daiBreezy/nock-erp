import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Link2, Copy, Check } from 'lucide-react'
import { useState } from 'react'

export default function ParentLink() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const link = 'https://nockacademy.com/goal/abc123'

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 px-6">
      <header className="-mx-2 py-3">
        <button onClick={() => navigate('/', { replace: true })} aria-label="ปิด" className="text-ink"><ChevronLeft size={24} /></button>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-subject-science">
          <Link2 size={38} className="text-subject-science-ink" />
        </div>
        <h1 className="mt-5 text-xl font-semibold text-ink">ส่งแบบทดสอบให้ลูก</h1>
        <p className="mt-2 max-w-xs text-sm text-ink-soft">
          ส่งลิงก์นี้ให้ลูกทำแบบทดสอบ เมื่อทำเสร็จ ผลวิเคราะห์จะส่งกลับมาให้คุณอัตโนมัติ
        </p>

        <button
          onClick={() => { setCopied(true) }}
          className="mt-6 flex w-full max-w-sm items-center gap-2 rounded-xl border border-line bg-surface-1 p-3 text-left"
        >
          <span className="flex-1 truncate text-sm text-ink-soft">{link}</span>
          {copied ? <Check size={18} className="text-success" /> : <Copy size={18} className="text-brand" />}
        </button>
      </div>

      <div className="space-y-2.5 pb-6">
        <button className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white">แชร์ลิงก์ให้ลูก</button>
        <button onClick={() => navigate('/', { replace: true })} className="w-full py-2 text-sm font-medium text-ink-soft">ไว้ทีหลัง</button>
      </div>
    </div>
  )
}
