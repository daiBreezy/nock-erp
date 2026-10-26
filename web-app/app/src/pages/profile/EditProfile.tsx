import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { me } from '../../data/profile'
import { FacebookIcon } from '../../components/BrandIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const fields: { label: string; value: string; type?: string }[] = [
  { label: 'ชื่อ - นามสกุล', value: me.name },
  { label: 'ชื่อเล่น', value: me.nickname },
  { label: 'ระดับชั้น', value: me.grade },
  { label: 'แนะนำตัว', value: me.intro },
  { label: 'เบอร์โทรศัพท์', value: '08x-xxx-xxxx' },
  { label: 'โรงเรียน', value: me.school },
  { label: 'จังหวัด', value: me.province },
  { label: 'ประเทศ', value: 'ไทย' },
  { label: 'อีเมล', value: 'student@email.com' },
  { label: 'อีเมลผู้ปกครอง', value: 'parent@email.com' },
]

export default function EditProfile() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-surface-0 pb-28">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="h-8 w-8 text-ink hover:bg-transparent"><ChevronLeft size={24} /></Button>
        <h1 className="text-lg font-semibold text-ink">แก้ไขข้อมูล</h1>
      </header>

      {/* avatar */}
      <div className="flex flex-col items-center py-5">
        <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold ${me.tone}`}>
          {me.initial}
        </div>
        <Button variant="link" className="mt-2 h-auto p-0 text-sm font-medium text-brand hover:no-underline">เปลี่ยนรูปโปรไฟล์</Button>
      </div>

      <div className="space-y-4 px-4">
        {fields.map((f) => (
          <div key={f.label}>
            <Label className="mb-1.5 block text-xs text-ink-soft">{f.label}</Label>
            <Input
              defaultValue={f.value}
              className="h-11 rounded-xl border-line bg-surface-1 text-sm text-ink focus-visible:ring-2 focus-visible:ring-brand"
            />
          </div>
        ))}

        <Button variant="outline" className="h-auto w-full gap-2 rounded-xl border-line bg-surface-1 py-3 text-sm font-medium text-[#1877F2] hover:bg-surface-2 hover:text-[#1877F2]">
          <FacebookIcon size={18} /> เชื่อมต่อกับ Facebook
        </Button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[440px] border-t border-line bg-surface-1 p-4">
        <Button
          onClick={() => navigate(-1)}
          className="h-auto w-full rounded-2xl bg-brand py-4 text-base font-semibold hover:bg-brand-dark active:scale-[0.99]"
        >
          บันทึก
        </Button>
      </div>
    </div>
  )
}
