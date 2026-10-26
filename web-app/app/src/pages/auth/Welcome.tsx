import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const grades = ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']

export default function Welcome() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [grade, setGrade] = useState<string | null>(null)

  const done = () => navigate('/', { replace: true })

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 px-6">
      <div className="flex flex-1 flex-col justify-center">
        <h1 className="text-xl font-semibold text-ink">บอกเราอีกนิด</h1>
        <p className="mt-1 text-sm text-ink-soft">เพื่อแนะนำเนื้อหาให้ตรงกับคุณ (ข้ามได้ ค่อยกรอกทีหลัง)</p>

        <div className="mt-7">
          <Label htmlFor="nickname" className="mb-1.5 block text-xs text-ink-soft">ชื่อเล่น</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="เช่น กร"
            className="h-12 rounded-xl border-line bg-surface-1 text-sm focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>

        <div className="mt-5">
          <span className="mb-2 block text-xs font-medium text-ink-soft">ระดับชั้น</span>
          <div className="flex flex-wrap gap-2">
            {grades.map((g) => (
              <Button
                key={g}
                variant={grade === g ? 'default' : 'outline'}
                onClick={() => setGrade(g)}
                className={`h-auto rounded-pill px-4 py-2 text-sm font-medium ${grade === g ? '' : 'border-line bg-surface-1 text-ink-soft hover:border-brand hover:bg-transparent hover:text-brand'}`}
              >
                {g}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2.5 pb-6">
        <Button onClick={done} className="h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark">
          เริ่มเรียนเลย
        </Button>
        <Button variant="ghost" onClick={done} className="h-auto w-full py-2 text-sm font-medium text-ink-soft hover:bg-transparent">ข้ามไปก่อน</Button>
      </div>
    </div>
  )
}
