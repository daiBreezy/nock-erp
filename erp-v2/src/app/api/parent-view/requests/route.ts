import { NextResponse } from "next/server"
import { viewForLineUser } from "@/server/parent-app-store"
import { lineUserFromIdToken, pushLineText } from "@/server/line-auth"
import { addRequest, listRequests } from "@/server/parent-request-store"
import { recordInboundMessage, recordOutboundMessage } from "@/server/line-store"
import type { BusChange } from "@/domain/types"

// Parent side of แจ้งลา / แจ้งลาออก (owner 2026-10-14). LINE proves who is asking; only their own children and their
// own upcoming classes can be named — nothing else is trusted from the phone.

async function who(req: Request) {
  const user = await lineUserFromIdToken((req.headers.get("authorization") ?? "").replace(/^Bearer /, ""))
  if (!user) return null
  const view = await viewForLineUser(user.sub)
  return view ? { user, view } : null
}

/** the parent's own requests (newest first) — so the app can show "รับเรื่องแล้ว / บันทึกแล้ว" */
export async function GET(req: Request) {
  const w = await who(req)
  if (!w) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 })
  const mine = (await listRequests()).filter((r) => r.familyId === w.view.familyId).slice(0, 20)
  return NextResponse.json({ ok: true, requests: mine })
}

export async function POST(req: Request) {
  const w = await who(req)
  if (!w) return NextResponse.json({ ok: false, error: "auth" }, { status: 401 })
  const b = (await req.json().catch(() => ({}))) as { kind?: string; studentId?: string; sessionIds?: string[]; lastDate?: string; startDate?: string; reasonIds?: string[]; note?: string; home?: { lat?: number; lng?: number; addressNote?: string }; bus?: { date?: string; pickup?: string; dropoff?: string; adult?: boolean }[] }
  const child = w.view.children.find((c) => c.id === b.studentId)
  if (!child) return NextResponse.json({ ok: false, error: "เลือกนักเรียน" }, { status: 400 })
  const note = (b.note ?? "").trim().slice(0, 500) || undefined
  const base = { familyId: w.view.familyId, familyName: w.view.familyName, lineUserId: w.user.sub, studentId: child.id, studentNickname: child.nickname, note }
  let text: string
  let saved
  // a child who left only offers "กลับมาเรียน"; a current one only แจ้งลา / แจ้งลาออก
  if (child.left ? b.kind !== "return" : b.kind === "return") return NextResponse.json({ ok: false, error: "kind" }, { status: 400 })
  if (b.kind === "return") {
    const startDate = b.startDate && /^\d{4}-\d{2}-\d{2}$/.test(b.startDate) ? b.startDate : undefined
    saved = await addRequest({ ...base, kind: "return", startDate })
    text = `ได้รับเรื่องอยากกลับมาเรียนของ${child.nickname}แล้วค่ะ ดีใจมากเลย 😊 แอดมินจะติดต่อกลับเพื่อจัดคลาสให้นะคะ`
  } else if (b.kind === "leave") {
    const sessions = child.upcoming.filter((s) => !s.cancelled && (b.sessionIds ?? []).includes(s.sessionId))
      .map((s) => ({ sessionId: s.sessionId, date: s.date, start: s.start, subjects: s.subjects }))
    if (!sessions.length) return NextResponse.json({ ok: false, error: "เลือกคาบที่จะลา" }, { status: 400 })
    saved = await addRequest({ ...base, kind: "leave", sessions })
    text = `ได้รับแจ้งลาของ${child.nickname} ${sessions.length} คาบแล้วค่ะ แอดมินจะยืนยันกลับอีกครั้ง 🙏`
  } else if (b.kind === "bus") {
    // owner 2026-10-19: ask for extra rides / cancel rides — only the child's own class days, checked against what is
    // booked now (add = a leg that isn't booked, cancel = one that is); the admin approves in the chat
    const legOk = (v: string | undefined, booked: boolean) => (v === "add" && !booked) || (v === "cancel" && booked)
    const changes: BusChange[] = []
    for (const x of (b.bus ?? []).slice(0, 40)) {
      const cls = child.upcoming.find((c) => c.date === x.date && !c.cancelled)
      if (!cls) continue
      const now: { pickup: boolean; dropoff: boolean; adult?: boolean } = child.busDays.find((d) => d.date === x.date) ?? { pickup: false, dropoff: false }
      const pickup = legOk(x.pickup, now.pickup) ? (x.pickup as "add" | "cancel") : undefined
      const dropoff = legOk(x.dropoff, now.dropoff) ? (x.dropoff as "add" | "cancel") : undefined
      // a parent riding along (owner 2026-10-19): only on a day the child still rides at least one leg, once
      const rides = (leg: "pickup" | "dropoff", v: "add" | "cancel" | undefined) => (v === "add" ? true : v === "cancel" ? false : now[leg])
      const adult = !!x.adult && !now.adult && (rides("pickup", pickup) || rides("dropoff", dropoff)) ? true : undefined
      if (pickup || dropoff || adult) changes.push({ date: cls.date, start: cls.start, subjects: cls.subjects, pickup, dropoff, adult })
    }
    if (!changes.length) return NextResponse.json({ ok: false, error: "เลือกรอบรถที่จะขอหรือยกเลิก" }, { status: 400 })
    saved = await addRequest({ ...base, kind: "bus", bus: changes })
    text = `ได้รับคำขอเรื่องรถรับส่งของ${child.nickname}แล้วค่ะ แอดมินจะเช็ครอบรถแล้วยืนยันกลับนะคะ 🙏`
  } else if (b.kind === "home") {
    // owner 2026-10-19: the parent pins the house for the bus — a real spot in Thailand, the admin checks it in the chat
    const lat = Number(b.home?.lat), lng = Number(b.home?.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 5 || lat > 21 || lng < 97 || lng > 106) return NextResponse.json({ ok: false, error: "ปักหมุดบ้านบนแผนที่ก่อน" }, { status: 400 })
    const addressNote = (b.home?.addressNote ?? "").trim().slice(0, 200) || undefined
    saved = await addRequest({ ...base, kind: "home", home: { lat, lng, addressNote } })
    text = `ได้รับตำแหน่งบ้านสำหรับรถรับส่งของ${child.nickname}แล้วค่ะ แอดมินจะตรวจแล้วจัดรถให้นะคะ 🙏`
  } else if (b.kind === "exit") {
    if (!b.lastDate || !/^\d{4}-\d{2}-\d{2}$/.test(b.lastDate)) return NextResponse.json({ ok: false, error: "เลือกวันเรียนวันสุดท้าย" }, { status: 400 })
    saved = await addRequest({ ...base, kind: "exit", lastDate: b.lastDate, reasonIds: (b.reasonIds ?? []).slice(0, 8) })
    text = `ได้รับแจ้งหยุดเรียนของ${child.nickname}แล้วค่ะ แอดมินจะติดต่อกลับเพื่อคุยรายละเอียดนะคะ 🙏`
  } else {
    return NextResponse.json({ ok: false, error: "kind" }, { status: 400 })
  }
  // staff see it in the family's chat as a card they can act on; the parent gets a LINE confirmation
  const legs = (k: "add" | "cancel") => (saved.bus ?? []).reduce((n, c) => n + Number(c.pickup === k) + Number(c.dropoff === k), 0)
  const adults = (saved.bus ?? []).filter((c) => c.adult).length
  const what = saved.kind === "leave" ? `แจ้งลา ${saved.sessions?.length ?? 0} คาบ` : saved.kind === "exit" ? "แจ้งลาออก" : saved.kind === "bus"
    ? `รถรับส่ง · ${[legs("add") && `ขอเพิ่ม ${legs("add")} เที่ยว`, legs("cancel") && `ยกเลิก ${legs("cancel")} เที่ยว`, adults && `ผู้ปกครองไปด้วย ${adults} วัน`].filter(Boolean).join(" · ")}` : saved.kind === "home" ? "ปักหมุดบ้านสำหรับรถรับส่ง" : "อยากกลับมาเรียน"
  await recordInboundMessage(w.user.sub, null, `📋 ${what} · ${child.nickname}`, { meta: { formKind: "parent_request", requestId: saved.id } }).catch(() => undefined)
  if (await pushLineText(w.user.sub, text)) await recordOutboundMessage(w.user.sub, text).catch(() => undefined)
  return NextResponse.json({ ok: true })
}
