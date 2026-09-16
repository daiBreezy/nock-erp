import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Search, UserPlus, Check } from 'lucide-react'
import { myFriends, suggestedFriends, type Person } from '../../data/social'

function PersonRow({ person, added, onAdd, isFriend }: { person: Person; added?: boolean; onAdd?: () => void; isFriend?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-medium ${person.tone}`}>
        {person.nickname.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{person.name} <span className="text-ink-soft">({person.nickname})</span></p>
        <p className="mt-0.5 truncate text-xs text-ink-soft">{person.school} · {person.province}</p>
      </div>
      {isFriend ? (
        <span className="text-xs text-ink-mute">เพื่อนแล้ว</span>
      ) : (
        <button
          onClick={onAdd}
          className={`flex h-9 w-9 items-center justify-center rounded-full ${added ? 'bg-success/15 text-success' : 'bg-brand text-white'}`}
          aria-label="เพิ่มเพื่อน"
        >
          {added ? <Check size={16} /> : <UserPlus size={16} />}
        </button>
      )}
    </div>
  )
}

export default function Nakama() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<'suggested' | 'mine'>('suggested')
  const [query, setQuery] = useState('')
  const [added, setAdded] = useState<Set<number>>(new Set())

  const filter = (list: Person[]) =>
    list.filter((p) => (p.name + p.nickname + p.school).toLowerCase().includes(query.toLowerCase()))

  return (
    <div className="min-h-screen bg-surface-0 pb-10">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-surface-0/90 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate(-1)} aria-label="ย้อนกลับ" className="text-ink"><ChevronLeft size={24} /></button>
        <h1 className="text-lg font-semibold text-ink">เพื่อน (Nakama)</h1>
      </header>

      {/* segment control */}
      <div className="px-4 pt-3">
        <div className="flex rounded-pill bg-surface-2 p-1">
          <button
            onClick={() => setTab('mine')}
            className={`flex-1 rounded-pill py-2 text-sm font-medium ${tab === 'mine' ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-soft'}`}
          >
            เพื่อนของคุณ ({myFriends.length})
          </button>
          <button
            onClick={() => setTab('suggested')}
            className={`flex-1 rounded-pill py-2 text-sm font-medium ${tab === 'suggested' ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-soft'}`}
          >
            เพื่อนที่อาจสนใจ
          </button>
        </div>
      </div>

      {/* search */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-1 px-3">
          <Search size={18} className="text-ink-mute" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ค้นหาเพื่อน"
            className="h-11 flex-1 bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="mt-3 divide-y divide-line border-y border-line bg-surface-1">
        {tab === 'mine'
          ? filter(myFriends).map((p) => <PersonRow key={p.id} person={p} isFriend />)
          : filter(suggestedFriends).map((p) => (
              <PersonRow key={p.id} person={p} added={added.has(p.id)} onAdd={() => setAdded((s) => new Set(s).add(p.id))} />
            ))}
      </div>
    </div>
  )
}
