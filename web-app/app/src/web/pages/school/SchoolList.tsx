import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, ArrowRight, Navigation, MessageCircle, Phone } from 'lucide-react'
import DesktopNav from '@/web/components/DesktopNav'
import MarketingFooter from '@/web/components/MarketingFooter'
import ContactFab from '@/web/components/ContactFab'
import { LineIcon, FacebookIcon } from '@/components/BrandIcons'
import { branches, regions, type Branch } from '@/data/school'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu'

/*
 * โหลด Leaflet + MapLibre (วาดแผนที่แบบ vector) จาก CDN ครั้งเดียว
 * แผนที่ = OpenFreeMap สไตล์ Liberty — ฟรี ไม่ต้องใช้ API key (CARTO ต้องใช้ key แล้ว)
 */
const addCss = (href: string) => {
  const l = document.createElement('link')
  l.rel = 'stylesheet'
  l.href = href
  document.head.appendChild(l)
}
const addScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => resolve()
    s.onerror = reject
    document.head.appendChild(s)
  })

let leafletPromise: Promise<any> | null = null
function loadLeaflet(): Promise<any> {
  const w = window as any
  if (w.L?.maplibreGL) return Promise.resolve(w.L)
  if (leafletPromise) return leafletPromise
  addCss('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css')
  addCss('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.css')
  leafletPromise = Promise.all([
    addScript('https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'),
    addScript('https://cdnjs.cloudflare.com/ajax/libs/maplibre-gl/4.7.1/maplibre-gl.min.js'),
  ])
    .then(() => addScript('https://unpkg.com/@maplibre/maplibre-gl-leaflet@0.1.3/leaflet-maplibre-gl.js'))
    .then(() => w.L)
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
      const map = L.map(elRef.current, { scrollWheelZoom: false, zoomControl: false }).setView([13.4, 100.8], 8)
      // แผนที่โทนสะอาด (OpenFreeMap Liberty) — ต้องแสดง attribution
      L.maplibreGL({
        style: 'https://tiles.openfreemap.org/styles/liberty',
        attribution: '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> &copy; <a href="https://www.openmaptiles.org/" target="_blank">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      }).addTo(map)
      L.control.zoom({ position: 'bottomright' }).addTo(map)
      const icon = (color: string) =>
        L.divIcon({ className: '', html: pinSvg(color), iconSize: [30, 40], iconAnchor: [15, 40], popupAnchor: [0, -34] })
      branches.forEach((b) => {
        const m = L.marker([b.lat, b.lng], { icon: icon('#FF5A5E') }).addTo(map)
        m.bindPopup(
          `<div style="width:220px;font-family:inherit">
             <img src="${b.cover}" alt="" style="display:block;width:100%;height:110px;object-fit:cover"/>
             <div style="padding:10px 12px 12px">
               <div style="font-weight:700;font-size:14px;color:#1A1C1E">NockAcademy ${b.area}</div>
               <div style="font-size:12px;color:#6B7280;margin-top:2px">${b.region} · ติวเตอร์มืออาชีพ ครบทุกวิชา</div>
               <div style="display:flex;gap:6px;margin-top:10px">
                 <a href="#/school/${b.slug}" style="flex:1;text-align:center;background:#FF5A5E;color:#fff;font-weight:700;font-size:12px;border-radius:999px;padding:7px 8px;text-decoration:none">ดูรายละเอียด</a>
                 <a href="${b.mapUrl}" target="_blank" rel="noopener noreferrer" style="flex:1;text-align:center;border:1px solid #E8EAED;color:#1A1C1E;font-weight:700;font-size:12px;border-radius:999px;padding:7px 8px;text-decoration:none">เปิดแผนที่</a>
               </div>
             </div>
           </div>`,
          // autoPan เปิดเฉพาะตอนเลือกสาขา (ชี้เมาส์แล้วแผนที่ไม่ขยับ) · เว้นขอบบนให้ป๊อปอัปเห็นเต็มใบ
          { closeButton: false, minWidth: 220, maxWidth: 240, autoPan: false, autoPanPaddingTopLeft: [16, 24], autoPanPaddingBottomRight: [16, 16] },
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
      // หมุดไม่ต้องอยู่กลาง: เลื่อนให้หมุดอยู่ค่อนล่าง (~72% ของความสูง) ป๊อปอัปด้านบนจะมีที่พอ
      const z = 15
      const h = map.getSize().y
      const target = map.unproject(map.project([b.lat, b.lng], z).subtract([0, h * 0.22]), z)
      const marker = markersRef.current[selected]
      map.closePopup()
      map.flyTo(target, z, { duration: 0.6 })
      map.once('moveend', () => {
        const popup = marker.getPopup()
        popup.options.autoPan = true // กันกรณีจอเตี้ย: ขยับแผนที่ให้ป๊อปอัปเห็นเต็มใบ
        marker.openPopup()
        popup.options.autoPan = false
      })
    } else {
      map.closePopup()
      map.flyToBounds(branches.map((b) => [b.lat, b.lng]), { padding: [40, 40], duration: 0.6 })
    }
  }, [selected])

  return <div ref={elRef} className="h-[400px] w-full sm:h-[440px]" />
}

/* ปุ่มติดต่อ (แชท/เพจ/โทร) เป็น DropdownMenu ของ shadcn */
function CardContact({ b }: { b: Branch }) {
  const channels = [
    { label: `LINE OA ${b.lineId}`, href: b.lineUrl, bg: 'bg-[#06C755]', icon: LineIcon, ext: true },
    { label: 'Facebook', href: b.facebookUrl, bg: 'bg-[#1877F2]', icon: FacebookIcon, ext: true },
    ...(b.phone ? [{ label: `โทร ${b.phone}`, href: `tel:${b.phone.replace(/[^0-9+]/g, '')}`, bg: 'bg-brand', icon: Phone, ext: false }] : []),
  ]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={`ติดต่อสาขา ${b.area}`}
          className="h-10 w-10 shrink-0 rounded-full border-line text-ink-soft hover:border-brand hover:text-brand data-[state=open]:border-brand data-[state=open]:bg-brand data-[state=open]:text-white"
        >
          <MessageCircle size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {channels.map((c) => (
          <DropdownMenuItem key={c.label} asChild>
            <a href={c.href} {...(c.ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="cursor-pointer">
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-white ${c.bg}`}><c.icon size={17} /></span>
              <span className="truncate text-[13.5px] font-medium text-ink">{c.label}</span>
            </a>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BranchCard({ b }: { b: Branch }) {
  return (
    <Card className="group flex flex-col overflow-hidden rounded-card border-line shadow-sm transition-shadow hover:shadow-md">
      <Link to={`/school/${b.slug}`} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative h-44 overflow-hidden bg-surface-2">
          <img src={b.cover} alt={`สาขา ${b.area}`} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
          <Badge className="absolute left-3 top-3 gap-1 rounded-pill border-transparent bg-white/95 px-3 py-1 text-[13px] font-bold text-brand shadow-sm hover:bg-white">
            <MapPin size={14} /> {b.area}
          </Badge>
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
        <CardContact b={b} />
        <Button
          asChild
          variant="outline"
          size="icon"
          aria-label={`แผนที่สาขา ${b.area}`}
          className="h-10 w-10 shrink-0 rounded-full border-line text-ink-soft hover:border-brand hover:text-brand"
        >
          <a href={b.mapUrl} target="_blank" rel="noopener noreferrer">
            <Navigation size={18} />
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-auto flex-1 gap-1.5 rounded-pill border-brand py-2.5 text-[14px] font-bold text-brand hover:bg-brand-soft hover:text-brand"
        >
          <Link to={`/school/${b.slug}`} target="_blank" rel="noopener noreferrer">
            ดูรายละเอียด <ArrowRight size={16} />
          </Link>
        </Button>
      </div>
    </Card>
  )
}

/* /school — รายชื่อสาขา NockAcademy School (แผนที่ปักหมุดทุกสาขา + กรอง + การ์ด) */
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
        <Badge className="gap-1.5 rounded-pill border-transparent bg-white/80 px-3.5 py-1.5 text-[13px] font-bold text-brand shadow-sm hover:bg-white/80">
          <MapPin size={15} /> NockAcademy School
        </Badge>
        <h1 className="mx-auto mt-4 max-w-[700px] text-[28px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
          สถาบันกวดวิชา NockAcademy ใกล้บ้านคุณ
        </h1>
        <p className="mx-auto mt-3 max-w-[560px] text-[15px] leading-relaxed text-ink-soft">
          เรียนพิเศษกับติวเตอร์ตัวจริงที่สาขา ครบ 4 วิชาหลัก ป.4 – ม.6 เลือกสาขาที่สะดวกแล้วทักหาเราได้เลย
        </p>
      </section>

      {/* filter + map */}
      <section className="mx-auto max-w-[1200px] px-5 pt-10">
        {/* filter — Select บนจอเล็ก, chips (Button) บนจอใหญ่ */}
        <div className="mb-4">
          {/* มือถือ: shadcn Select */}
          <div className="block sm:hidden">
            <label className="mb-1.5 block text-[13px] font-semibold text-ink-soft">เลือกสาขา</label>
            <Select value={selected ?? 'all'} onValueChange={(v) => setSelected(v === 'all' ? null : v)}>
              <SelectTrigger className="h-11 rounded-pill border-line px-5 text-[15px] font-semibold text-ink">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสาขา ({branches.length})</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>{b.area}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* จอใหญ่: chips */}
          <div className="hidden flex-wrap gap-2 sm:flex">
            <Button
              variant={selected === null ? 'default' : 'outline'}
              onClick={() => setSelected(null)}
              className={`h-auto rounded-pill px-4 py-2 text-[14px] font-semibold ${
                selected === null ? '' : 'border-line text-ink-soft hover:border-brand hover:bg-transparent hover:text-brand'
              }`}
            >
              ทั้งหมด ({branches.length})
            </Button>
            {branches.map((b) => (
              <Button
                key={b.slug}
                variant={selected === b.slug ? 'default' : 'outline'}
                onClick={() => toggle(b.slug)}
                className={`h-auto rounded-pill px-4 py-2 text-[14px] font-semibold ${
                  selected === b.slug ? '' : 'border-line text-ink-soft hover:border-brand hover:bg-transparent hover:text-brand'
                }`}
              >
                {b.area}
              </Button>
            ))}
          </div>
        </div>

        {/* map — ปักหมุดทุกสาขา (isolate กัน z-index ของ Leaflet ทับ nav) */}
        <style>{`
          .leaflet-popup-content-wrapper{ padding:0; overflow:hidden; border-radius:14px }
          .leaflet-popup-content{ margin:0; width:220px !important }
        `}</style>
        <div className="isolate overflow-hidden rounded-card border border-line shadow-sm">
          <BranchMap selected={selected} onSelect={setSelected} />
        </div>
      </section>

      {/* branch cards */}
      <section className="mx-auto max-w-[1200px] px-5 py-12">
        {selected ? (
          <>
            <h2 className="mb-5 flex items-center gap-2 text-[22px] font-bold tracking-tight">
              <MapPin size={20} className="text-brand" /> สาขา{branches.find((b) => b.slug === selected)?.area}
              <Button variant="link" onClick={() => setSelected(null)} className="h-auto shadow-none [&_svg]:size-auto p-0 ml-2 text-[14px] font-normal text-brand hover:underline">
                ดูทุกสาขา
              </Button>
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
