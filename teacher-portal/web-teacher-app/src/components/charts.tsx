import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, ResponsiveContainer } from "recharts"

export const QUIZ_COLOR = "#2a78d6"
export const HW_COLOR = "#eb6834"

export interface BarRow { label: string; quiz: number | null; hw: number | null }

// Vertical grouped bar chart · Quiz (น้ำเงิน) / HW (ส้ม) · y 0–100%
export function QuizHwBars({ rows, height = 150, light }: { rows: BarRow[]; height?: number; light?: boolean }) {
  const axis = light ? "#64748b" : "hsl(var(--muted-foreground))"
  const grid = light ? "#e2e8f0" : "hsl(var(--border))"
  const label = (v: unknown) => (v == null || v === "" ? "" : v + "%")
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 16, right: 6, left: -14, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={grid} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10, fill: axis }} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickLine={false} axisLine={false} width={26} tick={{ fontSize: 9, fill: axis }} />
          <Bar dataKey="quiz" fill={QUIZ_COLOR} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            <LabelList dataKey="quiz" position="top" formatter={label} style={{ fontSize: 9, fill: axis }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function QuizHwLegend({ className }: { className?: string }) {
  return (
    <div className={className} style={{ display: "flex", gap: 14, fontSize: 11 }}>
      <span className="inline-flex items-center gap-1.5 text-muted-foreground"><span style={{ width: 10, height: 10, borderRadius: 2, background: QUIZ_COLOR, display: "inline-block" }} />Quiz</span>
    </div>
  )
}
