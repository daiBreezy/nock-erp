import { useState } from 'react'
import { Megaphone, X } from 'lucide-react'
import AnnouncementModal from './AnnouncementModal'

/** แถบประกาศใต้ Nav — component เดียว ใช้ทุก Page (แก้ที่เดียว = เปลี่ยนทั้งเว็บ) */
export default function AnnouncementBar() {
  const [show, setShow] = useState(true)
  const [open, setOpen] = useState(false)
  if (!show) return null
  return (
    <>
      <div className="flex items-center gap-3 bg-[#1E88E5] px-6 py-2 text-xs text-white">
        <Megaphone size={15} className="shrink-0" />
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="truncate">
            <span className="font-semibold">ขออนุญาตแจ้งงดการสอน:</span>{' '}
            วิชาวิทยาศาสตร์ ชีวะ ครูนนท์ งดการสอนวันที่ 28-29 ก.ค. · ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 3 (28 ก.ค.) → ชดเชยวันที่ 12 ส.ค. 20.00-20.50
          </p>
        </div>
        <button onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1 font-semibold hover:underline">
          อ่านเพิ่มเติม →
        </button>
        <button aria-label="ปิด" onClick={() => setShow(false)} className="shrink-0 opacity-80 hover:opacity-100">
          <X size={14} />
        </button>
      </div>
      {open && <AnnouncementModal onClose={() => setOpen(false)} />}
    </>
  )
}
