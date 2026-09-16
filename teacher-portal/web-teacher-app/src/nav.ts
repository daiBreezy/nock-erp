import { create } from "zustand"

// เป้าหมายที่ Dashboard ส่งให้ Summary ไป "ไฮไลต์งานที่ต้องทำ"
export interface SummaryFocus { course: string; sub: string; week: number; field: "homework" | "send" }
export interface FeedbackFocus { course: string; sub: string; week: number }

interface NavState {
  page: string
  go: (page: string) => void
  summaryFocus: SummaryFocus | null
  focusSummary: (f: SummaryFocus) => void
  clearSummaryFocus: () => void
  feedbackFocus: FeedbackFocus | null
  focusFeedback: (f: FeedbackFocus) => void
  clearFeedbackFocus: () => void
}

export const useNav = create<NavState>((set) => ({
  page: "students",
  go: (page) => set({ page }),
  summaryFocus: null,
  focusSummary: (f) => set({ page: "summary", summaryFocus: f }),
  clearSummaryFocus: () => set({ summaryFocus: null }),
  feedbackFocus: null,
  focusFeedback: (f) => set({ page: "feedback", feedbackFocus: f }),
  clearFeedbackFocus: () => set({ feedbackFocus: null }),
}))
