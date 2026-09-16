import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Settings, FileText, Star, MessageCircle, LogOut, ChevronRight, Crown } from 'lucide-react'
import { useAuth } from '../../auth/AuthContext'

type Row = { label: string; Icon: typeof Users; onClick?: () => void; danger?: boolean }

export default function More() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [confirmOut, setConfirmOut] = useState(false)

  const doSignOut = () => {
    logout()
    navigate('/auth', { replace: true })
  }

  const groups: { title?: string; rows: Row[] }[] = [
    {
      rows: [
        { label: 'แพ็กเกจ / อัปเกรด', Icon: Crown, onClick: () => navigate('/pricing') },
        { label: 'เพื่อน (Nakama)', Icon: Users, onClick: () => navigate('/more/nakama') },
        { label: 'การตั้งค่าทั่วไป', Icon: Settings, onClick: () => navigate('/more/settings') },
        { label: 'ข้อกำหนดและเงื่อนไข', Icon: FileText, onClick: () => navigate('/more/terms') },
      ],
    },
    {
      title: 'อื่นๆ',
      rows: [
        { label: 'ให้คะแนนแอป', Icon: Star },
        { label: 'ติดต่อเราผ่าน Facebook', Icon: MessageCircle },
        { label: 'ออกจากระบบ', Icon: LogOut, danger: true, onClick: () => setConfirmOut(true) },
      ],
    },
  ]

  return (
    <div className="min-h-screen bg-surface-0">
      <header className="px-5 py-3">
        <h1 className="text-lg font-semibold text-ink">เพิ่มเติม</h1>
      </header>

      <div className="space-y-5 px-4">
        {groups.map((g, gi) => (
          <div key={gi}>
            {g.title && <p className="mb-2 px-1 text-xs font-medium text-ink-mute">{g.title}</p>}
            <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface-1">
              {g.rows.map((r) => (
                <button key={r.label} onClick={r.onClick} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
                  <r.Icon size={20} className={r.danger ? 'text-live' : 'text-brand'} />
                  <span className={`flex-1 text-sm font-medium ${r.danger ? 'text-live' : 'text-ink'}`}>{r.label}</span>
                  {!r.danger && <ChevronRight size={18} className="text-ink-mute" />}
                </button>
              ))}
            </div>
          </div>
        ))}

        <p className="pb-2 text-center text-xs text-ink-mute">NockAcademy · เวอร์ชัน 1.0.0</p>
      </div>

      {confirmOut && (
        <div className="fixed inset-0 z-30 mx-auto flex max-w-[440px] items-end bg-black/45" onClick={() => setConfirmOut(false)}>
          <div className="w-full rounded-t-3xl bg-surface-1 p-6 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />
            <p className="text-center text-lg font-semibold text-ink">ออกจากระบบ?</p>
            <p className="mt-1 text-center text-sm text-ink-soft">คุณยังกลับเข้ามาเรียนต่อได้ทุกเมื่อ</p>
            <div className="mt-6 space-y-2.5">
              <button onClick={doSignOut} className="w-full rounded-2xl bg-live py-4 text-base font-semibold text-white">ออกจากระบบ</button>
              <button onClick={() => setConfirmOut(false)} className="w-full rounded-2xl border border-line bg-surface-1 py-3.5 text-sm font-medium text-ink-soft">ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
