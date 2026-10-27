import TopBar from '../components/TopBar'
import { useAppLayout } from '../layout'
import Banner from '@/components/home/Banner'
import SystemUpdate from '@/components/home/SystemUpdate'
import LiveNext from '@/components/home/LiveNext'
import ScheduleStrip from '@/components/home/ScheduleStrip'
import GoalEntry from '@/components/home/GoalEntry'
import SubjectGrid from '@/components/home/SubjectGrid'
import ExamStrip from '@/components/home/ExamStrip'
import HomeworkCard from '@/components/home/HomeworkCard'

/** หน้าแรกของ App (เซนเซย์) — มือถือ = คอลัมน์เดียว · Tablet = 2 คอลัมน์ */
export default function Home() {
  const layout = useAppLayout()

  if (layout === 'phone') {
    return (
      <>
        <TopBar />
        <SystemUpdate />
        <Banner />
        <LiveNext />
        <div className="mt-4 h-2 bg-surface-2" />
        <ScheduleStrip />
        <GoalEntry />
        <SubjectGrid />
        <ExamStrip />
        <HomeworkCard />
      </>
    )
  }

  // Tablet: แนวตั้ง (แบบ ก) กว้างสุด 900 · แนวนอน (แบบ ข) เต็มพื้นที่ข้างแถบเมนู ซ้ายกว้างกว่าขวา
  const landscape = layout === 'tablet-landscape'
  return (
    <div className={landscape ? '' : 'mx-auto max-w-[900px]'}>
      <TopBar />
      <SystemUpdate />
      <div className={`grid gap-x-2 pb-6 ${landscape ? 'grid-cols-[3fr_2fr]' : 'grid-cols-2'}`}>
        <div className="col-span-2"><Banner /></div>
        <div className="min-w-0">
          <LiveNext />
          <ScheduleStrip />
        </div>
        <div className="min-w-0">
          <GoalEntry />
          <SubjectGrid />
          <HomeworkCard />
        </div>
        <div className="col-span-2 min-w-0"><ExamStrip /></div>
      </div>
    </div>
  )
}
