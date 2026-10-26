import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, ArrowRight, Navigation, MessageCircle, Phone } from 'lucide-react'
import DesktopNav from '../../components/web/DesktopNav'
import MarketingFooter from '../../components/web/MarketingFooter'
import ContactFab from '../../components/web/ContactFab'
import { LineIcon, FacebookIcon } from '../../components/BrandIcons'
import { branches, regions, type Branch } from '../../data/school'

/* โหลด Leaflet จาก CDN ครั้งเดียว (ฟรี ไม่ต้องใช้ API key) */
let leafletPromise: Promise<any> | null = null
function loadLeaflet(): Promise<any> {
  const w = window as any
  if (w.L) return Promise.resolve(w.L)
  if (leafletPromise) return leafletPromise
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link')
    css.rel = 'stylesheet'
    css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css'
    document.head.appendChild(css)
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
    s.onload = () => resolve((window as any).L)
    s.onerror = reject
    document.head.appendChild(s)
  })
  return leafletPromise
}

const pinSvg = (color: string) =>
  `<svg width="30" height="40" viewBox="0 0 24 34" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z" fill="${color}"/><circle cx="12" cy="12" r="4.6" fill="#fff"/></svg>`

function BranchMap({ selected, onSelect }: { selected: string | null; onSelect: (slug: string | null) => void }) {
  const elRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<Record<string, any>>({})

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then((L) => {
      if (cancelled || !elRef.current || mapRef.current) return
      const map = L.map(elRef.current, { scrollWheelZoom: false }).setView([13.4, 100.8], 8)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map)
      const icon = (color: string) =>
        L.divIcon({ className: '', html: pinSvg(color), iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -34] })
      branches.forEach((b) => {
        const m = L.marker([b.lat, b.lng], { icon: icon('#FF5A5E') }).addTo(map)
        m.bindPopup(
          `<div style="width:220px;font-family:inherit">
             <img src="${b.cover}" alt="" style="display:block;width:100%;height:120px;object-fit:cover"/>
             <div style="padding:10px 12px 12px">
               <div style="font-weight:700;font-size:14px;color:#1A1C1E">NockAcademy ${b.area}</div>
               <div style="font-size:12px;color:#6B7280;margin-top:2px">${b.region} · ติวเตอร์มืออาชีพ ครบทุกวิชา</div>
               <div style="display:flex;gap:6px;margin-top:10px">
                 <a href="#/school/${b.slug}" style="flex:1;text-align:center;background:#FF5A5E;color:#fff;font-weight:700;font-size:12px;border-radius:999px;padding:7px 8px;text-decoration:none">ดูรายละเอียด</a>
                 <a href="${b.mapUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;border:1px solid #E8EAED;color:#1A1C1E;font-weight:700;font-size:12px;border-radius:999px;padding:7px 8px;text-decoration:none">เปิดแผนที่</a>
               </div>
             </div>
           </div>`,
          { closeButton: false, minWidth: 220, maxWidth: 240 },
        )
        m.on('mouseover', () => m.openPopup())
        m.on('click', () => onSelect(b.slug))
        markersRef.current[b.slug] = m
      })
      mapRef.current = map
      map.fitBounds(branches.map((b) => [b.lat, b.lng]), { padding: [40, 40] })
      setTimeout(() => map.invalidateSize(), 120)
    })
    return () => {
      cancelled = true
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selected && markersRef.current[selected]) {
      const b = branches.find((x) => x.slug === selected)!
      map.flyTo([b.lat, b.lng], 15, { duration: 0.6 })
      markersRef.current[selected].openPopup()
    } else {
      map.closePopup()
      map.flyToBounds(branches.map((b) => [b.lat, b.lng]), { padding: [40, 40], duration: 0.6 })
    }
  }, [selected])

  return <div ref={elRef} className="h-[320px] w-full sm:h-[420px]" />
}

function CardContact({ b }: { b: Branch }) {
  const [open, setOpen] = useState(false)
  const channels = [
    { label: `LINE OA ${b.lineId}`, href: b.lineUrl, bg: 'bg-[#06C755]', icon: LineIcon, ext: true },
    { label: 'Facebook', href: b.facebookUrl, bg: 'bg-[#1877F2]', icon: FacebookIcon, ext: true },
    ...(b.phone ? [{ label: `โทร ${b.phone}`, href: `tel:${b.phone.replace(/[^0-9+]/g, '')}`, bg: 'bg-brand', icon: Phone, ext: false }] : []),
  ]
  // เปิดด้วย hover (desktop) หรือ แตะ (mobile)
  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`ติดต่อสาขา ${b.area}`}
        aria-expanded={open}
        className={`grid h-10 w-10 place-items-center rounded-full border transition-colors ${open ? 'border-brand bg-brand text-white' : 'border-line text-ink-soft hover:border-brand hover:text-brand'}`}
      >
        <MessageCircle size={18} />
      </button>
      {open && (
        <div className="absolute bottom-11 right-0 z-30 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 shadow-xl">
          {channels.map((c) => (
            <a
              key={c.label}
              href={c.href}
              {...(c.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-surface-2"
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${c.bg}`}><c.icon size={17} /></span>
              <span className="truncate text-[13.5px] font-medium text-ink">{c.label}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function BranchCard({ b }: { b: Branch }) {
  return (
    <div className="group flex flex-col rounded-2xl border border-line bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/school/${b.slug}`} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative h-44 overflow-hidden rounded-t-2xl bg-surface-2">
          <img src={b.cover} alt={`สาขา ${b.area}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-pill bg-white/95 px-3 py-1 text-[13px] font-bold text-brand shadow-sm">
            <MapPin size={14} /> {b.area}
          </span>
        </div>
        <div className="p-5 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-brand">NockAcademy School</p>
          <h3 className="mt-0.5 text-[19px] font-extrabold text-ink">{b.area}</h3>
          <p className="mt-1.5 text-[14px] leading-relaxed text-ink-soft">{b.tagline}</p>
          <p className="mt-3 flex items-center gap-1.5 text-[13px] text-ink-mute">
            <Clock size={15} className="shrink-0" /> {b.hours[0].day} · {b.hours[0].time}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex items-center gap-2 px-5 pb-5">
        <Link
          to={`/school/${b.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-pill border border-brand py-2.5 text-[14px] font-bold text-brand hover:bg-brand-soft"
        >
          ดูรายละเอียด <ArrowRight size={16} />
        </Link>
        <CardContact b={b} />
        <a
          href={b.mapUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`แผนที่สาขา ${b.area}`}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line text-ink-soft hover:border-brand hover:text-brand"
        >
          <Navigation size={18} />
        </a>
      </div>
    </div>
  )
}

/* /school — รายชื่อสาขา NockAcademy School (แผนที่ปักหมุดทุกสาขา + chip กรอง + การ์ด) */
export default function SchoolList() {
  const [selected, setSelected] = useState<string | null>(null)

  useEffect(() => {
    document.title = 'โรงเรียนกวดวิชา NockAcademy — สาขาใกล้คุณ'
  }, [])

  const toggle = (slug: string) => setSelected((cur) => (cur === slug ? null : slug))

  return (
    <div className="min-h-screen bg-surface-1 text-ink">
      <DesktopNav />

      {/* hero */}
      <section className="bg-[#FFF1F2] px-5 py-12 text-center sm:py-16">
        <span className="inline-flex items-center gap-1.5 rounded-pill bg-white/80 px-3.5 py-1.5 text-[13px] font-bold text-brand shadow-sm">
          <MapPin size={15} /> NockAcademy School
        </span>
        <h1 className="mx-auto mt-4 max-w-[700px] text-[28px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
          สถาบันกวดวิชา NockAcademy ใกล้บ้านคุณ
        </h1>
        <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-relaxed text-ink-soft">
          เรียนพิเศษกับติวเตอร์ตัวจริงที่สาขา ครบ 4 วิชาหลัก ป.4 – ม.6 เลือกสาขาที่สะดวกแล้วทักหาเราได้เลย
        </p>
      </section>

      {/* chips + map */}
      <section className="mx-auto max-w-[1200px] px-5 pt-10">
        {/* filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => setSelected(null)}
            className={`rounded-pill px-4 py-2 text-[14px] font-semibold transition-colors ${
              selected === null ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft hover:border-brand hover:text-brand'
            }`}
          >
            ทั้งหมด ({branches.length})
          </button>
          {branches.map((b) => (
            <button
              key={b.slug}
              onClick={() => toggle(b.slug)}
              className={`rounded-pill px-4 py-2 text-[14px] font-semibold transition-colors ${
                selected === b.slug ? 'bg-brand text-white' : 'border border-line bg-white text-ink-soft hover:border-brand hover:text-brand'
              }`}
            >
              {b.area}
            </button>
          ))}
        </div>

        {/* map — ปักหมุดทุกสาขา (isolate กัน z-index ของ Leaflet ทับ nav) */}
        <style>{`
          .leaflet-popup-content-wrapper{ padding:0; overflow:hidden; border-radius:14px }
          .leaflet-popup-content{ margin:0; width:220px !important }
        `}</style>
        <div className="isolate overflow-hidden rounded-2xl border border-line shadow-sm">
          <BranchMap selected={selected} onSelect={setSelected} />
        </div>
      </section>

      {/* branch cards */}
      <section className="mx-auto max-w-[1200px] px-5 py-12">
        {selected ? (
          <>
            <h2 className="mb-5 flex items-center gap-2 text-[22px] font-bold tracking-tight">
              <MapPin size={20} className="text-brand" /> สาขา{branches.find((b) => b.slug === selected)?.area}
              <button onClick={() => setSelected(null)} className="ml-2 text-[14px] font-normal text-brand hover:underline">
                ดูทุกสาขา
              </button>
            </h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <BranchCard b={branches.find((b) => b.slug === selected)!} />
            </div>
          </>
        ) : (
          regions.map((region) => {
            const list = branches.filter((b) => b.region === region)
            if (!list.length) return null
            return (
              <div key={region} className="mb-10 last:mb-0">
                <h2 className="mb-5 flex items-center gap-2 text-[22px] font-bold tracking-tight">
                  <MapPin size={20} className="text-brand" /> {region}
                  <span className="text-[15px] font-normal text-ink-mute">({list.length} สาขา)</span>
                </h2>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {list.map((b) => (
                    <BranchCard key={b.slug} b={b} />
                  ))}
                </div>
              </div>
            )
          })
        )}
      </section>

      <MarketingFooter />
      <ContactFab />
    </div>
  )
}
