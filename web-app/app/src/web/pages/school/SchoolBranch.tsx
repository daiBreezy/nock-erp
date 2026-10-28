import { useEffect, useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import type { ComponentType } from 'react'
import {
  MapPin, Clock, ChevronRight, X, GraduationCap, CalendarDays,
  Users, Image as ImageIcon, Navigation, ThumbsUp, MessageCircle,
  Calculator, Languages, FlaskConical, BookOpen, ArrowLeft, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { ComponentType as CT } from 'react'
import DesktopNav from '@/web/components/DesktopNav'
import MarketingFooter from '@/web/components/MarketingFooter'
import ContactFab from '@/web/components/ContactFab'
import { LineIcon, FacebookIcon } from '@/components/BrandIcons'
import { getBranch, subjectChipClass, type Branch, type ClassRow, type Course } from '@/data/school'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {
  Dialog, DialogClose, DialogContent, DialogHeader, DialogOverlay, DialogPortal, DialogTitle,
} from '@/components/ui/dialog'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '@/components/ui/carousel'
import { cn } from '@/lib/utils'

/* ---------- ตารางเรียน: ตาราง shadcn · กดหัวคอลัมน์เพื่อเรียง · แสดงเพิ่ม / ย่อ ---------- */

const DAY_ORDER = ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์', 'อาทิตย์']
const gradeNum = (g: string) => {
  const m = g.match(/^(ป|ม)\.(\d+)/)
  return m ? (m[1] === 'ป' ? 0 : 6) + Number(m[2]) : 99
}
// ป. = ฟ้า · ม. = ม่วง (เขียนคลาสเต็มให้ Tailwind เห็น)
const gradeChip = (g: string) => (g.startsWith('ม') ? 'bg-violet-100 text-violet-800' : 'bg-sky-100 text-sky-800')

type SortKey = 'day' | 'time' | 'subject' | 'grade'
const SORTERS: Record<SortKey, (a: ClassRow, b: ClassRow) => number> = {
  subject: (a, b) => a.subjects[0].localeCompare(b.subjects[0], 'th'),
  day: (a, b) => DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day) || a.start.localeCompare(b.start),
  time: (a, b) => a.start.localeCompare(b.start),
  grade: (a, b) => Math.min(...a.grades.map(gradeNum), 99) - Math.min(...b.grades.map(gradeNum), 99),
}
// ลำดับคอลัมน์ตามเจ้าของ: วัน · เวลา · วิชา · ชั้น
const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'day', label: 'วัน' },
  { key: 'time', label: 'เวลา' },
  { key: 'subject', label: 'วิชา' },
  { key: 'grade', label: 'ชั้น' },
]
const PREVIEW = 5

function ScheduleTable({ rows }: { rows: ClassRow[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'day', dir: 1 })
  const [expanded, setExpanded] = useState(false)
  const sorted = [...rows].sort((a, b) => SORTERS[sort.key](a, b) * sort.dir)
  const shown = expanded ? sorted : sorted.slice(0, PREVIEW)
  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }))

  return (
    <div>
      <div className="overflow-hidden rounded-card border border-line bg-white">
        <Table className="min-w-[520px]">
          <TableHeader className="bg-surface-1">
            <TableRow className="border-line hover:bg-transparent">
              {COLUMNS.map((c) => {
                const active = sort.key === c.key
                const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown
                return (
                  <TableHead key={c.key} className="h-12 px-4" aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <Button
                      variant="ghost"
                      onClick={() => toggle(c.key)}
                      className={`h-auto gap-1 p-0 text-[13px] font-medium hover:bg-transparent [&_svg]:size-3.5 ${active ? 'text-ink' : 'text-ink-mute hover:text-ink'}`}
                    >
                      {c.label} <Icon size={14} />
                    </Button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((r) => (
              <TableRow key={`${r.day}-${r.start}-${r.end}-${r.subjects.join()}-${r.grades.join()}`} className="border-line hover:bg-surface-1">
                <TableCell className="px-4 py-3.5 text-[14px] text-ink">
                  <span className="flex items-center gap-2 whitespace-nowrap"><CalendarDays size={16} className="text-ink-mute" /> {r.day}</span>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[14px] text-ink">
                  <span className="flex items-center gap-2 whitespace-nowrap"><Clock size={16} className="text-ink-mute" /> {r.start}–{r.end}</span>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {r.subjects.map((sj) => (
                      <Badge key={sj} variant="outline" className={`rounded-pill border-transparent px-2.5 py-0.5 text-[12px] font-medium ${subjectChipClass(sj)}`}>{sj}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1">
                    {r.grades.length === 0 && <span className="text-[13px] text-ink-mute">ไม่ระบุ</span>}
                    {r.grades.map((g) => (
                      <Badge key={g} variant="outline" className={`rounded-md border-transparent px-2 py-0.5 text-[12px] font-semibold ${gradeChip(g)}`}>{g}</Badge>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > PREVIEW && (
        <div className="mt-3 flex justify-center">
          <Button
            variant="outline"
            onClick={() => setExpanded((v) => !v)}
            className="h-9 gap-1.5 rounded-pill border-line bg-transparent px-4 text-[13px] font-semibold text-ink shadow-none hover:bg-surface-1 [&_svg]:size-4"
          >
            {expanded ? <>แสดงน้อยลง <ChevronUp size={16} /></> : <>แสดงเพิ่ม ({rows.length - PREVIEW}) <ChevronDown size={16} /></>}
          </Button>
        </div>
      )}
    </div>
  )
}

const SUBJECT_ICON: Record<string, CT<{ size?: number }>> = {
  คณิต: Calculator, อังกฤษ: Languages, วิทย์: FlaskConical, ไทย: BookOpen,
}

function CourseCard({ c }: { c: Course; i?: number }) {
  const Icon = SUBJECT_ICON[c.subjects[0]] ?? BookOpen
  return (
    <Card className="flex items-center gap-3 rounded-xl border-line p-3 shadow-none">
      <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-lg ${subjectChipClass(c.subjects[0])}`}>
        <Icon size={24} />
      </span>
      <div className="min-w-0">
        <p className="text-[14px] font-bold text-ink">{c.name}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11.5px]">
          {c.subjects.map((s) => (
            <span key={s} className={`rounded-pill px-2 py-0.5 font-semibold ${subjectChipClass(s)}`}>{s}</span>
          ))}
          <span className="rounded-pill bg-surface-2 px-2 py-0.5 font-semibold text-ink-soft">{c.grade}</span>
        </div>
      </div>
    </Card>
  )
}

/* Dialog ครอบเนื้อหา modal — หัวข้อ + พื้นที่เลื่อน (คอร์สทั้งหมด) */
function BranchModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="flex max-h-[88vh] w-full max-w-[760px] flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-0 border-b border-line px-5 py-4 text-left">
          <DialogTitle className="text-[16px] font-bold text-ink sm:text-[18px]">{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </DialogContent>
    </Dialog>
  )
}

/* ---------- รูปสาขา: Header เลื่อนดูได้ (มีมากกว่า 1 รูป) + Lightbox พื้นดำ ---------- */

/** จุดบอกตำแหน่งรูป + กดเพื่อไปรูปนั้น */
function Dots({ api, count, className }: { api: CarouselApi; count: number; className?: string }) {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (!api) return
    const onSelect = () => setIndex(api.selectedScrollSnap())
    onSelect()
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          aria-label={`รูปที่ ${i + 1}`}
          onClick={() => api?.scrollTo(i)}
          className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80')}
        />
      ))}
    </div>
  )
}

/** พื้นหลัง Header — รูปเดียว = ภาพนิ่ง · หลายรูป = ปัด/กดลูกศรเลื่อนดูได้ (รูปชุดเดียวกับบรรยากาศห้องเรียน) */
function HeroPhotos({ photos, alt }: { photos: string[]; alt: string }) {
  const [api, setApi] = useState<CarouselApi>()
  if (photos.length <= 1) return <img src={photos[0]} alt={alt} className="absolute inset-0 h-full w-full object-cover" />
  return (
    <Carousel setApi={setApi} opts={{ loop: true }} className="absolute inset-0 [&>div:first-child]:h-full">
      <CarouselContent className="ml-0 h-full">
        {photos.map((p, i) => (
          <CarouselItem key={p} className="h-full pl-0">
            <img src={p} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="left-4 z-20 hidden size-10 border-0 bg-transparent text-white shadow-none hover:bg-white/20 hover:text-white sm:inline-flex [&_svg]:!size-5" />
      <CarouselNext className="right-4 z-20 hidden size-10 border-0 bg-transparent text-white shadow-none hover:bg-white/20 hover:text-white sm:inline-flex [&_svg]:!size-5" />
      <Dots api={api} count={photos.length} className="absolute bottom-4 right-5 z-20" />
    </Carousel>
  )
}

/** Lightbox — พื้นดำบังหน้า · รูปลอยกลางจอ เลื่อนดูทีละรูป · กดที่ว่าง / Esc / ปุ่ม X เพื่อปิด */
function PhotoLightbox({ photos, start, alt, onClose }: { photos: string[]; start: number; alt: string; onClose: () => void }) {
  const [api, setApi] = useState<CarouselApi>()
  const [index, setIndex] = useState(start)
  useEffect(() => {
    if (!api) return
    const onSelect = () => setIndex(api.selectedScrollSnap())
    api.on('select', onSelect)
    return () => {
      api.off('select', onSelect)
    }
  }, [api])
  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogPortal>
        <DialogOverlay className="bg-black/95" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 outline-none"
          // กดที่ว่าง (ไม่ใช่รูป / ปุ่ม) = ปิด
          onClick={(e) => {
            if (!(e.target as HTMLElement).closest('img, button')) onClose()
          }}
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <Carousel setApi={setApi} opts={{ startIndex: start, loop: photos.length > 1 }} className="h-full [&>div:first-child]:h-full">
            <CarouselContent className="ml-0 h-full">
              {photos.map((p, i) => (
                <CarouselItem key={p} className="flex h-full items-center justify-center p-4 pl-4 sm:px-20 sm:py-14">
                  <img src={p} alt={`${alt} ${i + 1}`} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
                </CarouselItem>
              ))}
            </CarouselContent>
            {photos.length > 1 && (
              <>
                <CarouselPrevious className="left-4 hidden size-11 border-0 bg-transparent text-white shadow-none hover:bg-white/20 hover:text-white sm:inline-flex [&_svg]:!size-5" />
                <CarouselNext className="right-4 hidden size-11 border-0 bg-transparent text-white shadow-none hover:bg-white/20 hover:text-white sm:inline-flex [&_svg]:!size-5" />
              </>
            )}
          </Carousel>
          <p className="pointer-events-none absolute left-5 top-4 text-[14px] font-semibold text-white/80">
            {index + 1} / {photos.length}
          </p>
          <DialogClose asChild>
            <Button size="icon" variant="ghost" aria-label="ปิด" className="absolute right-3 top-3 size-10 rounded-full text-white hover:bg-white/15 hover:text-white">
              <X size={22} />
            </Button>
          </DialogClose>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}

function CoursesModal({ branch, onClose }: { branch: Branch; onClose: () => void }) {
  return (
    <BranchModal title={`คอร์สทั้งหมด · สาขา${branch.area} (${branch.courses.length})`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        {branch.courses.map((c, i) => <CourseCard key={i} c={c} i={i} />)}
      </div>
    </BranchModal>
  )
}

function Section({ icon: Icon, title, action, children }: { icon: ComponentType<{ size?: number; className?: string }>; title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-[900px] border-t border-line px-5 py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[18px] font-bold tracking-tight text-ink">
          <Icon size={18} className="text-brand" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  )
}

/* ปุ่มลิงก์ "ดูทั้งหมด" ใช้บนหัวข้อ section */
function SeeAll({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <Button
      variant="link"
      onClick={onClick}
      className="h-auto shrink-0 gap-1 p-0 text-[13px] font-bold text-brand hover:no-underline"
    >
      {children} <ChevronRight size={15} />
    </Button>
  )
}

// ตารางเรียน: ซ่อนไว้ก่อน — เปิดเมื่อดึงคลาสจริงจาก ERP ได้
const SHOW_SCHEDULE = false

export default function SchoolBranch() {
  const { branch: slug } = useParams()
  const branch = getBranch(slug)
  const [coursesOpen, setCoursesOpen] = useState(false)
  const [photoAt, setPhotoAt] = useState<number | null>(null)

  useEffect(() => {
    if (branch) document.title = `${branch.titleKeyword} เรียนพิเศษ ป.–ม. | NockAcademy`
  }, [branch])

  if (!branch) return <Navigate to="/school" replace />

  const mapSrc = `https://maps.google.com/maps?q=${branch.lat},${branch.lng}&z=16&hl=th&output=embed`

  return (
    <div className="min-h-screen bg-surface-1 text-ink">
      <DesktopNav />

      {/* hero — รูปสาขาเป็นพื้นหลัง, ข้อความชิดล่างทับบนรูป, CTA เป็นไอคอนหลัง headline
          NOTE: ภาพพื้นหลัง (branch.cover) ตอนนี้ใช้รูปตัวอย่าง — รูปสถานที่จริงจาก Google Maps
          ต้องใช้ Street View Static / Places Photo API (มี API key) ถึงจะดึงมาได้ */}
      <section className="relative overflow-hidden">
        <HeroPhotos photos={branch.classroomPhotos.length ? branch.classroomPhotos : [branch.cover]} alt={`สาขา ${branch.area}`} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/25" />
        {/* ชั้นข้อความไม่รับการแตะ → ปัดรูปข้างหลังได้ (ปุ่มกลับรับการแตะเอง) */}
        <div className="pointer-events-none relative mx-auto flex min-h-[360px] max-w-[900px] flex-col justify-end px-5 pb-8 pt-24 sm:min-h-[420px]">
          {/* ปุ่มกลับ — ทับบนรูป มุมซ้ายบน */}
          <Button
            asChild
            className="pointer-events-auto absolute left-5 top-5 h-auto gap-1.5 rounded-full bg-white/15 px-3.5 py-1.5 text-[13px] font-semibold text-white ring-1 ring-white/40 backdrop-blur hover:bg-white/30"
          >
            <Link to="/school">
              <ArrowLeft size={16} /> ทุกสาขา
            </Link>
          </Button>
          <Badge className="w-fit gap-1.5 rounded-pill border-transparent bg-white/90 px-3 py-1 text-[13px] font-bold text-brand shadow-sm hover:bg-white/90">
            <MapPin size={14} /> สาขา{branch.area}
          </Badge>
          <h1 className="mt-3 text-[26px] font-extrabold leading-tight tracking-tight text-white drop-shadow sm:text-[34px]">{branch.heading}</h1>
          <p className="mt-3 max-w-[620px] text-[15px] leading-relaxed text-white/85 drop-shadow">{branch.tagline}</p>
        </div>
      </section>

      {/* teachers */}
      <Section icon={Users} title="ติวเตอร์ประจำสาขา">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {branch.teachers.map((t) => {
            const initial = t.name.replace(/^ครู/, '').charAt(0) || t.name.charAt(0)
            return (
              <div key={t.name} className="group relative aspect-[3/4] overflow-hidden rounded-card border border-line bg-gradient-to-b from-brand-soft to-surface-2">
                {/* รูปครู: ถ้ามีรูป → แสดงรูป, ถ้าไม่มี → ตัวอักษร placeholder */}
                {t.photo ? (
                  <img src={t.photo} alt={t.name} className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center text-[66px] font-extrabold text-brand/30">{initial}</div>
                )}
                {/* default: ชื่อเล่น + วิชา */}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 transition-opacity group-hover:opacity-0">
                  <p className="text-[15px] font-bold text-white">{t.name}</p>
                  <p className="text-[12px] font-medium text-white/85">{t.subject}</p>
                </div>
                {/* hover: ชื่อจริง + วิชา */}
                <div className="absolute inset-0 flex flex-col justify-end bg-black/55 p-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <p className="text-[15px] font-bold text-white">{t.name}</p>
                  {t.fullName && <p className="text-[11.5px] text-white/75">{t.fullName}</p>}
                  <p className="mt-1 text-[12.5px] font-semibold text-white/90">{t.subject}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Section>

      {/* courses + fees — โชว์ไม่กี่คอร์ส + ปุ่มดูทั้งหมด (modal) */}
      <Section
        icon={GraduationCap}
        title="คอร์สที่เปิดสอน"
        action={branch.courses.length > 4 ? <SeeAll onClick={() => setCoursesOpen(true)}>ดูทั้งหมด ({branch.courses.length})</SeeAll> : undefined}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {branch.courses.slice(0, 4).map((c, i) => <CourseCard key={i} c={c} i={i} />)}
        </div>
      </Section>

      {/* timetable — ซ่อนไว้ก่อน (เจ้าของ 2026-10-28) · อนาคตดึงคลาสจริงจาก ERP */}
      {SHOW_SCHEDULE && (
        <Section icon={CalendarDays} title="ตารางเรียน">
          <ScheduleTable rows={branch.classes} />
        </Section>
      )}

      {/* แผนที่ (ซ้าย) + เวลาทำการ (ขวา) — หัวข้อร่วมกัน · จอแคบเรียงลง */}
      <Section
        icon={MapPin}
        title="แผนที่และเวลาทำการ"
        action={
          <Button asChild variant="link" className="h-auto shrink-0 gap-1 p-0 text-[13px] font-bold text-brand hover:no-underline">
            <a href={branch.mapUrl} target="_blank" rel="noopener noreferrer">
              <Navigation size={15} /> นำทาง
            </a>
          </Button>
        }
      >
        <div className="grid gap-4 md:grid-cols-[1.5fr_1fr] md:items-stretch">
          <div className="flex flex-col">
            {branch.address && <p className="mb-3 text-[15px] leading-relaxed text-ink">{branch.address}</p>}
            <div className="min-h-72 flex-1 overflow-hidden rounded-card border border-line shadow-sm">
              <iframe title={`แผนที่สาขา ${branch.area}`} src={mapSrc} className="h-full min-h-72 w-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </div>
          </div>
          {/* เวลาทำการ — list ไม่มีกรอบ · ใต้ list = ปุ่ม LINE (ติดต่อเรา มีช่องทางเดียว ไม่ต้องแยก section) */}
          <div className="flex flex-col">
            <p className="flex items-center gap-2 text-[14px] font-bold text-ink">
              <Clock size={16} className="text-brand" /> เวลาทำการ
            </p>
            <ul className="mt-1 divide-y divide-line">
              {branch.hours.map((h) => (
                <li key={h.day} className="flex items-center justify-between gap-3 py-3 text-[14.5px]">
                  <span className="font-medium text-ink">{h.day}</span>
                  <span className="text-right text-ink-soft">{h.time}</span>
                </li>
              ))}
            </ul>
            <Button asChild className="mt-4 h-11 gap-2 rounded-pill bg-[#06C755] md:mt-auto text-[14px] font-bold text-white shadow-none hover:bg-[#05b14c]">
              <a href={branch.lineUrl} target="_blank" rel="noopener noreferrer">
                <LineIcon size={20} /> ติดต่อเราทาง LINE {branch.lineId}
              </a>
            </Button>
          </div>
        </div>
        {branch.directions.length > 0 && (
          <div className="mt-4 rounded-card bg-surface-2 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[14px] font-bold text-ink"><Navigation size={16} className="text-brand" /> จุดสังเกตใกล้เคียง</p>
            <ul className="space-y-1.5 text-[14px] text-ink-soft">
              {branch.directions.map((d) => (
                <li key={d} className="flex items-start gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" /> {d}</li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* classroom photos — คลิกเพื่อดูทั้งหมด */}
      <Section icon={ImageIcon} title="บรรยากาศห้องเรียน" action={<SeeAll onClick={() => setPhotoAt(0)}>ดูทั้งหมด</SeeAll>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {branch.classroomPhotos.map((p, i) => (
            <button key={i} onClick={() => setPhotoAt(i)} className="group relative overflow-hidden rounded-xl border border-line">
              <img src={p} alt={`ห้องเรียนสาขา ${branch.area} ${i + 1}`} className="aspect-square w-full object-cover transition-transform group-hover:scale-105" />
            </button>
          ))}
        </div>
      </Section>

      {/* facebook feed — แสดงเป็นโพสต์ๆ
          NOTE: ตอนนี้เป็น mock (branch.facebookPosts). โพสต์จริงต้องดึงผ่าน Facebook Graph API:
          GET /{page-id}/posts?fields=message,full_picture,permalink_url,created_time,
              likes.summary(true),comments.summary(true)
          ต้องมี Facebook App + Page Access Token (เก็บฝั่ง server เท่านั้น) + สิทธิ์ pages_read_engagement
          แล้วทำ endpoint ฝั่งเราดึงมา cache ก่อนส่งให้หน้านี้ map เป็นการ์ดด้านล่าง */}
      <Section icon={FacebookIcon} title="ข่าวสารจาก Facebook สาขา">
        <div className="grid gap-4 sm:grid-cols-2">
          {branch.facebookPosts.slice(0, 2).map((p, i) => (
            <Card key={i} asChild className="overflow-hidden rounded-card border-line shadow-none">
              <article>
                <div className="flex items-center gap-3 px-4 pt-4">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1877F2] text-white">
                    <FacebookIcon size={22} />
                  </span>
                  <div>
                    <p className="text-[14px] font-bold text-ink">NockAcademy สาขา{branch.area}</p>
                    <p className="text-[12px] text-ink-mute">{p.date}</p>
                  </div>
                </div>
                <p className="whitespace-pre-line px-4 py-3 text-[14.5px] leading-relaxed text-ink">{p.text}</p>
                {p.image && <img src={p.image} alt="" className="max-h-80 w-full object-cover" />}
                <div className="flex items-center gap-4 border-t border-line px-4 py-2.5 text-[13px] text-ink-mute">
                  <span className="flex items-center gap-1.5"><ThumbsUp size={15} /> {p.likes}</span>
                  <span className="flex items-center gap-1.5"><MessageCircle size={15} /> {p.comments}</span>
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="ml-auto font-semibold text-brand hover:underline">ดูโพสต์</a>
                </div>
              </article>
            </Card>
          ))}
        </div>
        <Button asChild variant="link" className="mt-4 h-auto gap-2 p-0 text-[14px] font-semibold text-brand hover:no-underline">
          <a href={branch.facebookUrl} target="_blank" rel="noopener noreferrer">
            <FacebookIcon size={16} /> ดูโพสต์ทั้งหมดบนเพจ Facebook
          </a>
        </Button>
        <p className="mt-2 text-[12px] text-ink-mute">* ตัวอย่างโพสต์ — ระบบจะดึงโพสต์จริงจากเพจผ่าน Facebook Graph API</p>
      </Section>

      <MarketingFooter />

      {coursesOpen && <CoursesModal branch={branch} onClose={() => setCoursesOpen(false)} />}
      {photoAt !== null && (
        <PhotoLightbox photos={branch.classroomPhotos} start={photoAt} alt={`ห้องเรียนสาขา ${branch.area}`} onClose={() => setPhotoAt(null)} />
      )}

      {/* FAB มุมขวาล่าง — LINE อย่างเดียว (กดแล้วเปิด LINE OA ของสาขา) */}
      <ContactFab actions={[{ label: `LINE OA ${branch.lineId}`, href: branch.lineUrl, bg: 'bg-[#06C755]', icon: LineIcon, external: true }]} />
    </div>
  )
}
