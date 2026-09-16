import { useState } from 'react'
import { Megaphone, X, ChevronLeft } from 'lucide-react'

type Announcement = { id: string; title: string; date: string; excerpt: string; isNew: boolean; body: string[] }

const items: Announcement[] = [
  {
    id: 'a1', title: 'ขออนุญาตแจ้งงดการสอน วิชาวิทยาศาสตร์ ชีวะ', date: '14 ส.ค. 26 · 14:00', isNew: true,
    excerpt: 'ครูนนท์ งดการสอนวันที่ 28-29 ก.ค. · ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 3 (28 ก.ค.) ชดเชยวันที่ 12 ส.ค. 20.00-20.50',
    body: [
      'เรียนผู้ปกครองและนักเรียนทุกท่าน ทางสถาบันขออนุญาตแจ้งงดการสอนวิชาวิทยาศาสตร์ (ชีววิทยา) โดยครูนนท์ ในวันที่ 28-29 กรกฎาคม เนื่องจากติดภารกิจ',
      'คาบเรียน "ตะลุยแนวข้อสอบ จุฬาภรณ สอบเข้า ม.1 ตอนที่ 3" ที่ตรงกับวันที่ 28 ก.ค. จะเลื่อนไปสอนชดเชยในวันที่ 12 สิงหาคม เวลา 20.00-20.50 น.',
      'ขออภัยในความไม่สะดวก และขอบคุณสำหรับความเข้าใจครับ',
    ],
  },
  { id: 'a2', title: 'บทเรียนพื้นฐาน ตัวอย่างสำหรับการปรับพื้นฐานเบื้องต้น', date: '14 ส.ค. 26 · 14:00', isNew: true, excerpt: 'เปิดบทเรียนปรับพื้นฐานใหม่ สำหรับน้องๆ ที่ต้องการทบทวนก่อนเริ่มคอร์สจริง', body: ['รายละเอียดประกาศ...'] },
  { id: 'a3', title: 'เพิ่มห้องสอบใหม่ เตรียมสอบเข้าเตรียมอุดมฯ', date: '10 ส.ค. 26 · 09:00', isNew: false, excerpt: 'เพิ่มชุดข้อสอบใหม่พร้อมเฉลยวิดีโอ มากดสอบก่อนลงสนามจริงกันได้เลย', body: ['รายละเอียดประกาศ...'] },
  { id: 'a4', title: 'ปรับปรุงระบบไลฟ์สด ลื่นขึ้น + แชทเร็วขึ้น', date: '5 ส.ค. 26 · 18:00', isNew: false, excerpt: 'อัปเดตระบบไลฟ์สดให้ภาพลื่นขึ้น และแชทตอบสนองเร็วขึ้น', body: ['รายละเอียดประกาศ...'] },
]

export default function AnnouncementModal({ onClose }: { onClose: () => void }) {
  const [selected, setSelected] = useState<Announcement | null>(null)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-card bg-surface-1 shadow-xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          {selected ? (
            <button onClick={() => setSelected(null)} className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ChevronLeft size={18} /> {selected.title}
            </button>
          ) : (
            <h2 className="flex items-center gap-2 text-lg font-bold text-ink"><Megaphone size={20} className="text-brand" /> ประกาศ</h2>
          )}
          <button onClick={onClose} aria-label="ปิด" className="text-ink-mute hover:text-ink"><X size={20} /></button>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto p-5">
          {selected ? (
            <article>
              <h1 className="text-xl font-bold text-ink">{selected.title}</h1>
              <p className="mt-1 text-sm text-ink-mute">{selected.date}</p>
              <div className="mt-4 flex aspect-[16/6] items-center justify-center rounded-card bg-brand-soft text-brand"><Megaphone size={32} /></div>
              <div className="mt-4 space-y-3">
                {selected.body.map((p, i) => (<p key={i} className="text-sm leading-relaxed text-ink">{p}</p>))}
              </div>
            </article>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((a) => (
                <button key={a.id} onClick={() => setSelected(a)} className="rounded-card border border-line p-4 text-left hover:border-brand">
                  <div className="flex items-center justify-between">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand"><Megaphone size={15} /></span>
                    {a.isNew && <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] font-semibold text-white">New</span>}
                  </div>
                  <p className="mt-2 text-[11px] text-ink-mute">{a.date}</p>
                  <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{a.excerpt}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-line px-5 py-3">
          <button onClick={selected ? () => setSelected(null) : onClose} className="text-sm font-medium text-brand hover:underline">
            {selected ? 'กลับ' : 'ปิด'}
          </button>
        </div>
      </div>
    </div>
  )
}
