"use client"

// Settings › ระบบ › AI (owner 2026-10-14: "สร้างเป็น tab ในหน้า Setting เหมือน LINE Integration"). Pick Google Gemini or
// OpenAI, paste the API key, test it. The key is stored on the server and never shown again — only a masked hint.
import { useEffect, useState } from "react"
import { CheckCircle2Icon, LoaderCircleIcon, PlugZapIcon, SparklesIcon, TrashIcon } from "lucide-react"
import { Pill } from "@/components/app/badges"
import { Field } from "@/components/app/student-form"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { report } from "@/lib/feedback"
import { cn } from "@/lib/utils"
import { SettingsCard } from "./common"

type Provider = "gemini" | "openai"
interface Status { configured: boolean; source: "settings" | "env" | null; provider: Provider | null; model: string | null; maskedKey: string | null }
const PROVIDERS: { id: Provider; name: string; hint: string; models: string[]; keyUrl: string }[] = [
  { id: "gemini", name: "Google Gemini", hint: "สร้าง key ที่ Google AI Studio", models: ["gemini-2.5-flash", "gemini-2.5-pro"], keyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "openai", name: "OpenAI", hint: "สร้าง key ที่ OpenAI Platform", models: ["gpt-4o-mini", "gpt-4o"], keyUrl: "https://platform.openai.com/api-keys" },
]

export function AiSettings() {
  const [status, setStatus] = useState<Status | null>(null)
  const [provider, setProvider] = useState<Provider>("gemini")
  const [apiKey, setApiKey] = useState("")
  const [model, setModel] = useState("")
  const [busy, setBusy] = useState<"" | "save" | "test" | "clear">("")
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => fetch("/api/ai/config").then((r) => r.json()).then((s: Status) => {
    setStatus(s)
    if (s.provider) setProvider(s.provider)
    if (s.source === "settings" && s.model) setModel(s.model)
  }).catch(() => setStatus({ configured: false, source: null, provider: null, model: null, maskedKey: null }))
  useEffect(() => { load() }, [])

  const p = PROVIDERS.find((x) => x.id === provider)!
  const save = async () => {
    setBusy("save")
    const r = await fetch("/api/ai/config", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, apiKey, model }) }).then((x) => x.json()).catch(() => ({ ok: false, error: "บันทึกไม่ได้" }))
    setBusy("")
    if (report(r.ok ? { ok: true, value: undefined } : { ok: false, error: r.error }, "บันทึกการตั้งค่า AI แล้ว")) { setApiKey(""); setTest(null); load() }
  }
  const runTest = async () => {
    setBusy("test")
    const r = await fetch("/api/ai/test", { method: "POST" }).then((x) => x.json()).catch(() => ({ ok: false, error: "เรียกไม่ได้" }))
    setBusy("")
    setTest(r.ok ? { ok: true, text: `เชื่อมต่อได้ · ${r.model} · ${r.ms} ms` } : { ok: false, text: r.error })
  }
  const clear = async () => {
    setBusy("clear")
    await fetch("/api/ai/config", { method: "DELETE" }).catch(() => null)
    setBusy("")
    setTest(null); setModel(""); load()
  }

  return (
    <SettingsCard title="AI (Nock)" hint="โมเดล AI ที่ Nock ใช้ตอบคำถามและช่วยเขียนสรุปคอร์ส — ไม่ตั้งค่า Nock ยังตอบได้จากคู่มือในระบบ + คลังความรู้">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {!status ? <Pill tone="gray"><LoaderCircleIcon className="size-3 animate-spin" /> กำลังตรวจสอบ...</Pill>
          : status.configured ? <Pill tone="green"><CheckCircle2Icon className="size-3" /> ใช้ {status.provider === "gemini" ? "Google Gemini" : "OpenAI"} · {status.model}</Pill>
            : <Pill tone="gray">ยังไม่ได้ตั้งค่า — Nock ตอบจากคู่มือ + คลังความรู้</Pill>}
        {status?.maskedKey && <span className="text-xs text-muted-foreground">Key {status.maskedKey}{status.source === "env" && " (จากไฟล์ .env.local)"}</span>}
        {status?.configured && <Button size="xs" variant="ghost" disabled={!!busy} onClick={runTest}>{busy === "test" ? <LoaderCircleIcon className="animate-spin" /> : <PlugZapIcon />} ทดสอบการเชื่อมต่อ</Button>}
        {test && <span className={cn("text-xs", test.ok ? "text-emerald-700" : "text-red-700")}>{test.text}</span>}
      </div>

      <Field label="ผู้ให้บริการ">
        <div className="grid gap-2 sm:grid-cols-2">
          {PROVIDERS.map((x) => (
            <button key={x.id} type="button" aria-pressed={provider === x.id} onClick={() => { setProvider(x.id); setModel("") }}
              className={cn("flex items-center gap-3 rounded-2xl border p-3 text-left", provider === x.id ? "border-primary bg-primary/5" : "hover:bg-muted/50")}>
              <span className={cn("grid size-9 place-items-center rounded-xl", provider === x.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}><SparklesIcon className="size-4" /></span>
              <span><span className="block text-sm font-medium">{x.name}</span><span className="block text-xs text-muted-foreground">{x.hint}</span></span>
            </button>
          ))}
        </div>
      </Field>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="API key" hint={`ได้จาก ${p.keyUrl} · เก็บไว้ฝั่ง server ไม่แสดงซ้ำ · เว้นว่าง = ใช้ key เดิม`}>
          <Input type="password" autoComplete="off" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder={status?.source === "settings" && status.provider === provider ? `บันทึกไว้แล้ว (${status.maskedKey})` : "วาง API key ที่นี่"} />
        </Field>
        <Field label="รุ่น (Model)" hint="เว้นว่าง = รุ่นแนะนำ">
          <div className="flex flex-wrap gap-1.5">
            {p.models.map((m) => <button key={m} type="button" aria-pressed={(model || p.models[0]) === m} onClick={() => setModel(m)} className={cn("rounded-full border px-3 py-1.5 text-sm", (model || p.models[0]) === m ? "border-primary bg-primary/10 font-medium text-primary" : "hover:bg-muted")}>{m}</button>)}
          </div>
        </Field>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {status?.source === "settings" && <Button size="sm" variant="ghost" className="text-red-700" disabled={!!busy} onClick={clear}><TrashIcon /> เอา key ออก</Button>}
        <Button size="sm" className="ml-auto" disabled={!!busy || (!apiKey.trim() && !(status?.source === "settings" && status.provider === provider))} onClick={save}>
          {busy === "save" && <LoaderCircleIcon className="animate-spin" />} บันทึก
        </Button>
      </div>
    </SettingsCard>
  )
}
