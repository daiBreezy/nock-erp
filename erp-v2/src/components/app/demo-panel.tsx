"use client"

import { FlaskConicalIcon, RotateCcwIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fmtDateTime } from "@/domain/dates"
import { ROLE_LABEL } from "@/domain/rules/permissions"
import { useNow } from "@/lib/hooks"
import { useStore } from "@/store/store"
import { NativeSelect } from "./native-select"

const H = 3_600_000

/** Prototype-only controls: switch person/role and move the clock to demo time-based rules. */
export function DemoPanel() {
  const staff = useStore((s) => s.staff)
  const userId = useStore((s) => s.userId)
  const setUser = useStore((s) => s.setUser)
  const offset = useStore((s) => s.clockOffset)
  const setOffset = useStore((s) => s.setClockOffset)
  const reset = useStore((s) => s.resetData)
  const now = useNow(10_000)

  return (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="w-full justify-start gap-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0" />}>
        <FlaskConicalIcon />
        <span className="truncate group-data-[collapsible=icon]:hidden">โหมดสาธิต</span>
      </PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-72 space-y-3">
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">ใช้งานในฐานะ</div>
          <NativeSelect
            value={userId}
            onChange={(e) => {
              setUser(e.target.value)
              const u = staff.find((s) => s.id === e.target.value)!
              toast.info(`สลับเป็น ${u.nickname} (${u.roles.map((r) => ROLE_LABEL[r]).join(", ")})`)
            }}
            options={staff.filter((s) => s.active && s.canLogin).map((s) => ({ value: s.id, label: `${s.nickname} · ${s.roles.map((r) => ROLE_LABEL[r]).join(", ")}` }))}
          />
        </div>
        <div>
          <div className="mb-1 text-xs font-medium text-muted-foreground">เวลาของระบบ</div>
          <div className="rounded-lg bg-muted px-2.5 py-1.5 text-sm font-medium tabular-nums">{fmtDateTime(now.toISOString())}</div>
          <div className="mt-2 grid grid-cols-4 gap-1">
            {[
              ["-1 วัน", -24 * H], ["-1 ชม.", -H], ["+1 ชม.", H], ["+1 วัน", 24 * H],
            ].map(([l, d]) => (
              <Button key={l as string} size="xs" variant="secondary" onClick={() => setOffset(offset + (d as number))}>
                {l}
              </Button>
            ))}
          </div>
          {offset !== 0 && (
            <Button size="xs" variant="ghost" className="mt-1 w-full" onClick={() => setOffset(0)}>
              กลับเป็นเวลาจริง
            </Button>
          )}
        </div>
        <Button
          size="sm"
          variant="destructive"
          className="w-full"
          onClick={() => {
            reset()
            toast.success("รีเซ็ตข้อมูลตัวอย่างแล้ว")
          }}
        >
          <RotateCcwIcon /> รีเซ็ตข้อมูลตัวอย่าง
        </Button>
      </PopoverContent>
    </Popover>
  )
}
