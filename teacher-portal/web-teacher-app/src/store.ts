import { create } from "zustand"
import { R, fbTpl, sentSet, sentMethod, guardians, students, noClassSet, hwQuestions, hwAnswers, HW_ANS, parentSummary, type Student, type Result, type Override } from "./data"

// tiny tick store: components subscribe via useSync() and re-render when data mutates
export const useTick = create<{ t: number; bump: () => void }>((set) => ({ t: 0, bump: () => set((s) => ({ t: s.t + 1 })) }))
const bump = () => useTick.getState().bump()
export const useSync = () => useTick((s) => s.t)

// student edits — text fields write through without re-render (uncontrolled inputs)
export const writeStudent = (idx: number, field: keyof Student, val: string | boolean) => {
  ;(students[idx] as unknown as Record<string, unknown>)[field] = val
}
export const updateStudent = (idx: number, patch: Partial<Student>) => { Object.assign(students[idx], patch); bump() }
export const setPhoto = (idx: number, dataUrl: string) => { students[idx].photo = dataUrl; bump() }
export const deleteStudent = (idx: number) => { students[idx].deleted = true; bump() }

// feedback
export const setFeedbackText = (cid: string, sub: string, wk: number, text: string) => {
  const k = cid + "|" + sub + "|" + wk
  if (!fbTpl[k]) fbTpl[k] = { prepared: false, text: "" }
  fbTpl[k].text = text
}
export const submitFeedback = (cid: string, sub: string, wk: number) => {
  const k = cid + "|" + sub + "|" + wk
  if (!fbTpl[k]) fbTpl[k] = { prepared: false, text: "" }
  fbTpl[k].prepared = true
  bump()
}
export const unsubmitFeedback = (cid: string, sub: string, wk: number) => {
  const k = cid + "|" + sub + "|" + wk
  if (fbTpl[k]) fbTpl[k].prepared = false
  bump()
}

// parent summary (auto-draft, editable per student)
export const setParentSummary = (idx: number, cid: string, wk: number, text: string) => { parentSummary[idx + "|" + cid + "|" + wk] = text }
export const resetParentSummary = (idx: number, cid: string, wk: number) => { delete parentSummary[idx + "|" + cid + "|" + wk]; bump() }

// homework + send
export const collectHw = (idx: number, sub: string, wk: number, score?: number) => {
  const r = R[idx][sub]?.[wk]
  if (!r) return
  r.collected = true
  if (score != null) r.hwScore = score
  else if (r.hwScore == null) r.hwScore = Math.round(r.hwT * 0.8)
  bump()
}
export const setResult = (idx: number, sub: string, wk: number, patch: Partial<Result>) => { const r = R[idx][sub]?.[wk]; if (r) Object.assign(r, patch); bump() }
// total = แก้ให้ทุกคนในวิชา×สัปดาห์นั้น
export const setQuizTotal = (sub: string, wk: number, val: number) => { const v = Math.max(1, val); students.forEach((s) => { const r = R[s.idx][sub]?.[wk]; if (r && r.att !== "noclass") r.lqT = v }); bump() }
export const setHwTotal = (cid: string, sub: string, wk: number, val: number) => {
  const v = Math.max(1, val)
  students.forEach((s) => { const r = R[s.idx][sub]?.[wk]; if (r && r.att !== "noclass") r.hwT = v })
  const qk = cid + "|" + sub + "|" + wk; const qs = hwQuestions[qk] ||= []
  while (qs.length < v) qs.push(HW_ANS[0]); if (qs.length > v) hwQuestions[qk] = qs.slice(0, v)
  bump()
}

// report overrides (เคสพิเศษ) — ทำงานบน Override object ตรงๆ (ใช้ทั้ง student และ week)
export const ovToggle = (o: Override, kind: "lateHw" | "noClass" | "makeup", sub: string) => { o[kind][sub] = !o[kind][sub]; bump() }
export const ovRename = (o: Override, sub: string, name: string) => { o.rename[sub] = name; bump() }
export const ovDate = (o: Override, v: string) => { o.dateRange = v; bump() }
export const ovAddExtra = (o: Override) => { o.extraSubs.push({ id: "e" + Date.now() + Math.floor(Math.random() * 999), name: "", livestreamId: "", date: "" }); bump() }
export const ovDelExtra = (o: Override, id: string) => { o.extraSubs = o.extraSubs.filter((x) => x.id !== id); bump() }
export const ovSetExtra = (o: Override, id: string, field: "name" | "livestreamId" | "date", val: string) => { const e = o.extraSubs.find((x) => x.id === id); if (e) e[field] = val; bump() }
export const ovClear = (o: Override) => { o.lateHw = {}; o.noClass = {}; o.makeup = {}; o.rename = {}; o.dateRange = undefined; o.extraSubs = []; bump() }
export const ovClearSubject = (o: Override, course: string, sub: string, wk: number) => {
  o.lateHw[sub] = false; o.makeup[sub] = false; delete o.rename[sub]
  const k = course + "|" + sub + "|" + wk; if (noClassSet.has(k)) noClassSet.delete(k)
  bump()
}
export const sendReport = (idx: number, cid: string, wk: number) => { const k = idx + "|" + cid + "|" + wk; sentSet.add(k); sentMethod[k] = "line"; bump() }
export const markSentManual = (idx: number, cid: string, wk: number) => { const k = idx + "|" + cid + "|" + wk; sentSet.add(k); sentMethod[k] = "manual"; bump() }

// LINE OA linking (ระดับผู้ปกครอง)
export const sendLineInvite = (gid: string) => { const g = guardians[gid]; if (g && g.lineStatus !== "linked") g.lineStatus = "invited"; bump() }
export const confirmLineLink = (gid: string) => { const g = guardians[gid]; if (g) { g.lineStatus = "linked"; g.lineUserId = "U" + gid + Date.now().toString(36); g.linkedAt = "วันนี้" } bump() }
export const unlinkLine = (gid: string) => { const g = guardians[gid]; if (g) { g.lineStatus = "none"; g.lineUserId = null; g.linkedAt = undefined } bump() }
export const sendReportBulk = (idxs: number[], cid: string, wk: number) => { idxs.forEach((i) => sentSet.add(i + "|" + cid + "|" + wk)); bump() }

// Live stream: มีเรียน / ไม่มีเรียน ต่อ วิชา×สัปดาห์
export const toggleNoClass = (cid: string, sub: string, wk: number) => {
  const k = cid + "|" + sub + "|" + wk
  if (noClassSet.has(k)) noClassSet.delete(k); else noClassSet.add(k)
  bump()
}

// Homework question bank
const qkey = (cid: string, sub: string, wk: number) => cid + "|" + sub + "|" + wk
const akey = (idx: number, sub: string, wk: number) => idx + "|" + sub + "|" + wk
export const ensureHw = (idx: number, cid: string, sub: string, wk: number) => {
  const qs = hwQuestions[qkey(cid, sub, wk)] || (hwQuestions[qkey(cid, sub, wk)] = [])
  const ak = akey(idx, sub, wk)
  if (!hwAnswers[ak]) {
    const r = R[idx][sub]?.[wk]
    const correct = r?.hwScore ?? 0
    hwAnswers[ak] = qs.map((key, i) => (i < correct ? key : HW_ANS[(HW_ANS.indexOf(key) + 1) % 4]))
  }
  const a = hwAnswers[ak]
  while (a.length < qs.length) a.push(HW_ANS[0])
  if (a.length > qs.length) hwAnswers[ak] = a.slice(0, qs.length)
}
export const addHwQuestion = (cid: string, sub: string, wk: number) => { (hwQuestions[qkey(cid, sub, wk)] ||= []).push(HW_ANS[0]); bump() }
export const deleteHwQuestion = (cid: string, sub: string, wk: number, i: number) => {
  hwQuestions[qkey(cid, sub, wk)]?.splice(i, 1)
  Object.keys(hwAnswers).forEach((k) => { if (k.endsWith("|" + sub + "|" + wk)) hwAnswers[k].splice(i, 1) })
  bump()
}
export const setHwKey = (cid: string, sub: string, wk: number, i: number, key: string) => { const qs = hwQuestions[qkey(cid, sub, wk)]; if (qs) qs[i] = key; bump() } // เฉลย = แชร์ทุกคน
export const setHwAnswer = (idx: number, sub: string, wk: number, i: number, ans: string) => { const a = hwAnswers[akey(idx, sub, wk)]; if (a) a[i] = ans; bump() } // คำตอบ = รายคน
export const saveHw = (idx: number, cid: string, sub: string, wk: number) => {
  const qs = hwQuestions[qkey(cid, sub, wk)] || []
  const a = hwAnswers[akey(idx, sub, wk)] || []
  const correct = qs.reduce((n, key, i) => n + (a[i] === key ? 1 : 0), 0)
  const r = R[idx][sub]?.[wk]
  if (r) { r.collected = true; r.hwScore = correct; r.hwT = qs.length }
  bump()
}
