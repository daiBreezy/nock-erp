import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { me } from '../../data/profile'
import { FacebookIcon } from '../../components/BrandIcons'

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
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">แก้ไขข้อมูล</h1>
      </header>

      {/* avatar */}
      <div className="flex flex-col items-center py-5">
        <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold ${me.tone}`}>
          {me.initial}
        </div>
        <button className="mt-2 text-sm font-medium text-brand">เปลี่ยนรูปโปรไฟล์</button>
      </div>

      <div className="space-y-4 px-4">
        {fields.map((f) => (
          <label key={f.label} className="block">
            <span className="mb-1.5 block text-xs font-medium text-ink-soft">{f.label}</span>
            <input
              defaultValue={f.value}
              className="h-11 w-full rounded-xl border border-line bg-surface-1 px-3 text-sm text-ink outline-none focus:ring-2 focus:ring-brand"
            />
          </label>
        ))}

        <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-surface-1 py-3 text-sm font-medium text-[#1877F2]">
          <FacebookIcon size={18} /> เชื่อมต่อกับ Facebook
        </button>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[440px] border-t border-line bg-surface-1 p-4">
        <button
          onClick={() => navigate(-1)}
          className="w-full rounded-2xl bg-brand py-4 text-base font-semibold text-white active:scale-[0.99]"
        >
          บันทึก
        </button>
      </div>
    </div>
  )
}
