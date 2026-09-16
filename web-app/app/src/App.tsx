import { useRef } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom'
import BottomNav from './components/BottomNav'
import DesktopNav from './components/web/DesktopNav'
import LearnHub from './pages/LearnHub'
import Faq from './pages/marketing/Faq'
import Landing from './pages/marketing/Landing'
import Grade from './pages/marketing/Grade'
import Course from './pages/marketing/Course'
import Article from './pages/marketing/Article'
import Term from './pages/marketing/Term'
import NockForSchool from './pages/marketing/NockForSchool'
import HomeworkRoom from './pages/homework/HomeworkRoom'
import Focus from './pages/homework/Focus'
import Result from './pages/homework/Result'
import ExamList from './pages/exam/ExamList'
import ExamDetail from './pages/exam/ExamDetail'
import Quiz from './pages/exam/Quiz'
import ExamResult from './pages/exam/ExamResult'
import Solution from './pages/exam/Solution'
import Profile from './pages/profile/Profile'
import Ranking from './pages/profile/Ranking'
import Achievements from './pages/profile/Achievements'
import EditProfile from './pages/profile/EditProfile'
import LearnSubject from './pages/learn/LearnSubject'
import LessonVideo from './pages/learn/LessonVideo'
import LiveStream from './pages/live/LiveStream'
import Notifications from './pages/Notifications'
import More from './pages/more/More'
import Nakama from './pages/more/Nakama'
import Settings from './pages/more/Settings'
import Terms from './pages/more/Terms'
import AuthLanding from './pages/auth/AuthLanding'
import OtpVerify from './pages/auth/OtpVerify'
import EmailAuth from './pages/auth/EmailAuth'
import Welcome from './pages/auth/Welcome'
import Pricing from './pages/Pricing'
import Checkout from './pages/payment/Checkout'
import Pay from './pages/payment/Pay'
import PayResult from './pages/payment/PayResult'
import GoalOverview from './pages/goal/GoalOverview'
import GoalWizard from './pages/goal/GoalWizard'
import ParentLink from './pages/goal/ParentLink'
import LearningPlan from './pages/goal/LearningPlan'

/** กรอบมือถือ — mobile-first, จัดกลางบนจอใหญ่ (ใช้กับหน้าที่ยังไม่ได้ทำ responsive web) */
function MobileFrame() {
  const location = useLocation()
  // flow แบบ immersive ไม่โชว์ bottom nav
  const immersive =
    location.pathname.startsWith('/homework') ||
    location.pathname.startsWith('/exam/') ||
    location.pathname.startsWith('/profile/') ||
    location.pathname.startsWith('/learn/') ||
    location.pathname.startsWith('/live/') ||
    location.pathname.startsWith('/more/') ||
    location.pathname.startsWith('/auth') ||
    location.pathname.startsWith('/pricing') ||
    location.pathname.startsWith('/checkout') ||
    location.pathname.startsWith('/goal')
  return (
    <div className="relative mx-auto flex min-h-screen max-w-[440px] flex-col bg-surface-0 shadow-sm">
      <main className={`flex-1 ${immersive ? '' : 'pb-24'}`}>
        <Outlet />
      </main>
      {!immersive && <BottomNav />}
    </div>
  )
}

/** Auth — overlay modal ทับหน้าเดิม (desktop = การ์ดกลางจอ + ฉากหลังมืด, mobile = เต็มจอ) */
function AuthFrame() {
  const navigate = useNavigate()
  const close = () => navigate(-1)
  return (
    <div
      className="fixed inset-0 z-[100] flex justify-center bg-black/50 md:items-center md:p-6"
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[440px] bg-surface-0 shadow-xl md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto md:rounded-3xl md:[&_.min-h-screen]:!min-h-fit"
      >
        <Outlet />
      </div>
    </div>
  )
}

/** Goal funnel — wizard: desktop = top-nav + การ์ดกลางจอ, mobile = คอลัมน์เดิม */
function GoalFrame() {
  return (
    <div className="min-h-screen bg-surface-2">
      <div className="hidden md:block"><DesktopNav /></div>
      <div className="mx-auto flex min-h-screen max-w-[440px] flex-col bg-surface-0 shadow-sm md:my-8 md:min-h-0 md:max-w-[560px] md:overflow-hidden md:rounded-card md:border md:border-line md:shadow-md md:[&_.min-h-screen]:!min-h-fit">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  const location = useLocation()
  const inAuth = location.pathname.startsWith('/auth')
  // จำหน้าล่าสุดที่ไม่ใช่ auth ไว้ เพื่อโชว์ auth เป็น overlay ทับหน้านั้น
  const bgRef = useRef<ReturnType<typeof useLocation> | null>(null)
  if (!inAuth) bgRef.current = location
  const background = inAuth ? bgRef.current : null

  return (
    <div className="min-h-full bg-surface-2">
      <Routes location={background || location}>
        {/* Learn Hub — responsive web + mobile (shell ของตัวเอง) */}
        <Route path="/" element={<LearnHub />} />

        {/* Marketing pages — โครงไว้รอ (nav + download + footer) */}
        <Route path="/faq" element={<Faq />} />
        <Route path="/landing" element={<Landing />} />
        <Route path="/grade" element={<Grade />} />
        <Route path="/courses" element={<Course />} />
        <Route path="/articles" element={<Article />} />
        <Route path="/terms" element={<Term />} />
        <Route path="/nock-for-school" element={<NockForSchool />} />

        {/* Lesson Video — responsive web + mobile */}
        <Route path="/learn/:subject/:videoId" element={<LessonVideo />} />

        {/* Live Stream — responsive web + mobile */}
        <Route path="/live/:id" element={<LiveStream />} />

        {/* Goal overview — responsive web + mobile */}
        <Route path="/goals" element={<GoalOverview />} />

        {/* Goal wizard — รวม setup+test+result เป็นฟันเนลเดียว (shell ของตัวเอง) */}
        <Route path="/goal" element={<GoalWizard />} />

        {/* Goal — แผน/ผูกผู้ปกครอง ยังใช้ web shell + centered card */}
        <Route element={<GoalFrame />}>
          <Route path="/goal/parent" element={<ParentLink />} />
          <Route path="/goal/plan" element={<LearningPlan />} />
        </Route>

        {/* ห้องสอบ — responsive web + mobile */}
        <Route path="/exam" element={<ExamList />} />
        <Route path="/exam/:id" element={<ExamDetail />} />
        <Route path="/exam/:id/quiz" element={<Quiz />} />

        {/* หน้าอื่น — ยังใช้กรอบมือถือจนกว่าจะทำ responsive web ทีละหน้า */}
        <Route element={<MobileFrame />}>
          <Route path="/homework" element={<HomeworkRoom />} />
            <Route path="/homework/focus" element={<Focus />} />
            <Route path="/homework/result" element={<Result />} />
            <Route path="/learn/:subject" element={<LearnSubject />} />
            <Route path="/exam/:id/result" element={<ExamResult />} />
            <Route path="/exam/:id/solution" element={<Solution />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/profile/ranking" element={<Ranking />} />
            <Route path="/profile/achievements" element={<Achievements />} />
            <Route path="/profile/edit" element={<EditProfile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/more" element={<More />} />
            <Route path="/more/nakama" element={<Nakama />} />
            <Route path="/more/settings" element={<Settings />} />
            <Route path="/more/terms" element={<Terms />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/checkout/pay" element={<Pay />} />
            <Route path="/checkout/result" element={<PayResult />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        {/* Auth — โมดัลกลางจอบน desktop, เต็มจอบน mobile */}
        <Route element={<AuthFrame />}>
          <Route path="/auth" element={<AuthLanding />} />
          <Route path="/auth/otp" element={<OtpVerify />} />
          <Route path="/auth/email" element={<EmailAuth />} />
          <Route path="/auth/welcome" element={<Welcome />} />
        </Route>
      </Routes>

      {/* Auth overlay — โชว์ทับหน้าเดิมเมื่อเข้ามาจากปุ่มในเว็บ (มี background) */}
      {background && (
        <Routes>
          <Route element={<AuthFrame />}>
            <Route path="/auth" element={<AuthLanding />} />
            <Route path="/auth/otp" element={<OtpVerify />} />
            <Route path="/auth/email" element={<EmailAuth />} />
            <Route path="/auth/welcome" element={<Welcome />} />
          </Route>
        </Routes>
      )}
    </div>
  )
}
