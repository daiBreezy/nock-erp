import { LayoutDashboard, Users, ClipboardList, PenLine, BarChart3, GraduationCap } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNav } from "@/nav"
import { StudentList } from "@/pages/StudentList"
import { Dashboard } from "@/pages/Dashboard"
import { Summary } from "@/pages/Summary"
import { Feedback } from "@/pages/Feedback"
import { Report } from "@/pages/Report"
import { StudentDrawer } from "@/components/StudentDrawer"
import { HomeworkDialog } from "@/components/HomeworkDialog"
import { HomeworkSetupDialog } from "@/components/HomeworkSetupDialog"
import { QuizDialog } from "@/components/QuizDialog"
import { LinkLineDialog } from "@/components/LinkLineDialog"

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "students", label: "Student list", icon: Users },
  { id: "summary", label: "Summary", icon: ClipboardList },
  { id: "feedback", label: "Feedback", icon: PenLine },
  { id: "report", label: "Report", icon: BarChart3 },
]

export default function App() {
  const page = useNav((s) => s.page)
  const setPage = useNav((s) => s.go)
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r bg-card flex flex-col h-screen">
        <div className="flex items-center gap-2.5 px-4 h-16 border-b">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
          <div className="leading-tight"><div className="text-sm font-semibold">Web Teacher</div><div className="text-[11px] text-muted-foreground">Premium Plus Console</div></div>
        </div>
        <nav className="p-2 flex flex-col gap-1">
          {NAV.map((n) => {
            const Icon = n.icon, active = page === n.id
            return (
              <button key={n.id} onClick={() => setPage(n.id)}
                className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")}>
                <Icon className="size-4" />{n.label}
              </button>
            )
          })}
        </nav>
        <div className="mt-auto p-3 border-t flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">NK</div>
          <div className="leading-tight"><div className="text-xs font-medium">Kru Nock</div><div className="text-[10px] text-muted-foreground">Teacher</div></div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto p-6">
        {page === "dashboard" && <Dashboard />}
        {page === "students" && <StudentList />}
        {page === "summary" && <Summary />}
        {page === "feedback" && <Feedback />}
        {page === "report" && <Report />}
      </main>

      <StudentDrawer />
      <HomeworkDialog />
      <HomeworkSetupDialog />
      <QuizDialog />
      <LinkLineDialog />
    </div>
  )
}
