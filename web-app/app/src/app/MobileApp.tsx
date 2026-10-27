import type { ReactNode } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import NavRail from './components/NavRail'
import { AppLayoutContext, useLayoutFromWindow } from './layout'
import Home from './pages/Home'
import ExamList from './pages/exam/ExamList'
import ExamDetail from './pages/exam/ExamDetail'
import Quiz from './pages/exam/Quiz'
import GoalOverview from './pages/goal/GoalOverview'
import LessonVideo from './pages/learn/LessonVideo'
import LiveStream from './pages/live/LiveStream'
// หน้าที่ยังไม่ได้แยก (ยังเป็นหน้ามือถือ ใช้ร่วมกับ Web) — อยู่ใน src/pages
import LearnSubject from '@/pages/learn/LearnSubject'
import ExamResult from '@/pages/exam/ExamResult'
import Solution from '@/pages/exam/Solution'
import HomeworkRoom from '@/pages/homework/HomeworkRoom'
import Focus from '@/pages/homework/Focus'
import Result from '@/pages/homework/Result'
import Profile from '@/pages/profile/Profile'
import Ranking from '@/pages/profile/Ranking'
import Achievements from '@/pages/profile/Achievements'
import EditProfile from '@/pages/profile/EditProfile'
import Notifications from '@/pages/Notifications'
import More from '@/pages/more/More'
import Nakama from '@/pages/more/Nakama'
import Settings from '@/pages/more/Settings'
import Terms from '@/pages/more/Terms'
import AuthLanding from '@/pages/auth/AuthLanding'
import OtpVerify from '@/pages/auth/OtpVerify'
import EmailAuth from '@/pages/auth/EmailAuth'
import Welcome from '@/pages/auth/Welcome'
import Pricing from '@/pages/Pricing'
import Checkout from '@/pages/payment/Checkout'
import Pay from '@/pages/payment/Pay'
import PayResult from '@/pages/payment/PayResult'
import GoalWizard from '@/pages/goal/GoalWizard'
import ParentLink from '@/pages/goal/ParentLink'
import LearningPlan from '@/pages/goal/LearningPlan'

/** หน้าที่โชว์เมนูหลัก (BottomNav / NavRail) — หน้าอื่นเป็นหน้าย่อย (มีปุ่มย้อนกลับของตัวเอง) */
const NAV_ROOTS = ['/', '/exam', '/goals', '/profile', '/notifications', '/more']

/** หน้าโฟกัส — ซ่อนเมนูทุกขนาดจอ (ทำข้อสอบ, จับเวลา, จ่ายเงิน, ล็อกอิน, ตั้งเป้าหมาย) */
const FOCUS = [/^\/exam\/[^/]+\/quiz/, /^\/homework\/focus/, /^\/checkout/, /^\/auth/, /^\/goal(\/|$)/]

function AppShell() {
  const layout = useLayoutFromWindow()
  const { pathname } = useLocation()
  const focus = FOCUS.some((re) => re.test(pathname))
  const isRoot = NAV_ROOTS.includes(pathname)

  // Tablet แนวนอน (แบบ ข+ค): แถบเมนูข้างโชว์ทุกหน้า ยกเว้นหน้าโฟกัส
  const rail = layout === 'tablet-landscape' && !focus
  // มือถือ / Tablet แนวตั้ง (แบบ ก): BottomNav เฉพาะหน้าหลัก
  const bottom = layout !== 'tablet-landscape' && isRoot

  return (
    <AppLayoutContext.Provider value={layout}>
      <div className="flex min-h-[100dvh] bg-surface-0">
        {rail && <NavRail />}
        <main className={`min-w-0 flex-1 ${bottom ? 'pb-24' : ''}`}>
          <Outlet />
        </main>
        {bottom && <BottomNav />}
      </div>
    </AppLayoutContext.Provider>
  )
}

/** คอลัมน์สำหรับหน้าที่ยังออกแบบไว้แค่มือถือ — Tablet ได้คอลัมน์กลางกว้างขึ้น */
function Column({ children }: { children: ReactNode }) {
  return <div className="mx-auto min-h-[100dvh] w-full max-w-[720px] bg-surface-0">{children}</div>
}

const col = (el: ReactNode) => <Column>{el}</Column>

export default function MobileApp() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Home />} />

        <Route path="/learn/:subject" element={col(<LearnSubject />)} />
        <Route path="/learn/:subject/:videoId" element={<LessonVideo />} />
        <Route path="/live/:id" element={<LiveStream />} />

        <Route path="/exam" element={<ExamList />} />
        <Route path="/exam/:id" element={<ExamDetail />} />
        <Route path="/exam/:id/quiz" element={<Quiz />} />
        <Route path="/exam/:id/result" element={col(<ExamResult />)} />
        <Route path="/exam/:id/solution" element={col(<Solution />)} />

        <Route path="/goals" element={<GoalOverview />} />
        <Route path="/goal" element={<GoalWizard />} />
        <Route path="/goal/parent" element={col(<ParentLink />)} />
        <Route path="/goal/plan" element={col(<LearningPlan />)} />

        <Route path="/homework" element={col(<HomeworkRoom />)} />
        <Route path="/homework/focus" element={col(<Focus />)} />
        <Route path="/homework/result" element={col(<Result />)} />

        <Route path="/profile" element={col(<Profile />)} />
        <Route path="/profile/ranking" element={col(<Ranking />)} />
        <Route path="/profile/achievements" element={col(<Achievements />)} />
        <Route path="/profile/edit" element={col(<EditProfile />)} />
        <Route path="/notifications" element={col(<Notifications />)} />
        <Route path="/more" element={col(<More />)} />
        <Route path="/more/nakama" element={col(<Nakama />)} />
        <Route path="/more/settings" element={col(<Settings />)} />
        <Route path="/more/terms" element={col(<Terms />)} />

        <Route path="/pricing" element={col(<Pricing />)} />
        <Route path="/checkout" element={col(<Checkout />)} />
        <Route path="/checkout/pay" element={col(<Pay />)} />
        <Route path="/checkout/result" element={col(<PayResult />)} />

        <Route path="/auth" element={col(<AuthLanding />)} />
        <Route path="/auth/otp" element={col(<OtpVerify />)} />
        <Route path="/auth/email" element={col(<EmailAuth />)} />
        <Route path="/auth/welcome" element={col(<Welcome />)} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
