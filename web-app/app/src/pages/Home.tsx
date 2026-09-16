import { useState } from 'react'
import TopBar from '../components/TopBar'
import Banner from '../components/home/Banner'
import SystemUpdate from '../components/home/SystemUpdate'
import LiveNext from '../components/home/LiveNext'
import ScheduleStrip from '../components/home/ScheduleStrip'
import SubjectGrid from '../components/home/SubjectGrid'
import ExamStrip from '../components/home/ExamStrip'
import HomeworkCard from '../components/home/HomeworkCard'
import ShareCard from '../components/home/ShareCard'
import ShareSheet from '../components/ShareSheet'
import GoalEntry from '../components/home/GoalEntry'
import SectionTitle from '../components/SectionTitle'
import UpgradeCard from '../components/pricing/UpgradeCard'
import { useAuth } from '../auth/AuthContext'

export default function Home() {
  const [shareOpen, setShareOpen] = useState(false)
  const { tier } = useAuth()
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

      {/* แพ็กเกจ — แสดงเฉพาะ Free user */}
      {tier === 'free' && (
        <section className="px-4 pt-5">
          <SectionTitle>แพ็กเกจ</SectionTitle>
          <UpgradeCard />
        </section>
      )}

      <ShareCard onOpen={() => setShareOpen(true)} />
      <ShareSheet open={shareOpen} onClose={() => setShareOpen(false)} />
    </>
  )
}
