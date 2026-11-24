// Bank accounts kept in ONE place (owner 2026-11-24): Settings › System › การเงิน. The Director creates an account, uploads
// its QR and picks who it is for — whole business types (Liclass / Nockacademy / both) or chosen branches. Saving sends it
// to every targeted branch at once: the account becomes that branch's `bankAccount`, which every document / message
// already reads. A branch no account targets keeps what it has. Pure functions — the store and the UI both use these.

import type { BankAccountEntry, Brand, Branch } from "../types"
import { promptPayKind } from "./documents"

export const BRAND_LABEL: Record<Brand, string> = { nockacademy: "Nockacademy", liclass: "Liclass" }

/** owner 2026-11-24: the Nockacademy main account's QR — saved with the app (public/brand), always used for it; it is locked: it cannot be removed, replaced or lost */
export const NA_MAIN_ID = "bk_nockacademy"
export const NA_QR = "/brand/na-bank-qr.png"

/** an uploaded QR image is kept in the browser's storage, so it has to stay small */
export const MAX_QR_IMAGE_CHARS = 700_000

type BranchLite = Pick<Branch, "id" | "brand" | "name">

/** does this account target the branch? */
export function targets(entry: BankAccountEntry, branch: Pick<Branch, "id" | "brand">): boolean {
  return entry.scope.kind === "brand" ? entry.scope.brands.includes(branch.brand) : entry.scope.branchIds.includes(branch.id)
}

/** the account a branch uses: one picked by branch beats one picked by business type */
export function bankAccountFor(branch: Pick<Branch, "id" | "brand">, entries: BankAccountEntry[]): BankAccountEntry | undefined {
  return entries.find((e) => e.scope.kind === "branch" && targets(e, branch)) ?? entries.find((e) => e.scope.kind === "brand" && targets(e, branch))
}

/** Save = Global: every branch takes the account that targets it (branches no account targets stay as they are). Returns the new list + how many branches changed. */
export function applyBankAccounts(branches: Branch[], entries: BankAccountEntry[]): { branches: Branch[]; changed: number } {
  let changed = 0
  const next = branches.map((b) => {
    const e = bankAccountFor(b, entries)
    if (!e || JSON.stringify(e.account) === JSON.stringify(b.bankAccount)) return b
    changed++
    return { ...b, bankAccount: { ...e.account } }
  })
  return { branches: next, changed }
}

/** the first branch two accounts both claim at the same level (two by business type, or two by branch) — one branch cannot print two accounts */
export function bankConflict(entry: BankAccountEntry, others: BankAccountEntry[], branches: BranchLite[]): BranchLite | undefined {
  const same = others.filter((o) => o.id !== entry.id && o.scope.kind === entry.scope.kind)
  return branches.find((b) => targets(entry, b) && same.some((o) => targets(o, b)))
}

export function validateBankEntry(entry: BankAccountEntry, others: BankAccountEntry[], branches: BranchLite[]): string | null {
  const a = entry.account
  if (!entry.label.trim()) return "ตั้งชื่อบัญชี (ไว้เรียกในรายการ)"
  if (!a.bank.trim()) return "กรอกชื่อธนาคาร"
  if (!a.number.trim()) return "กรอกเลขบัญชี"
  if (!a.name.trim()) return "กรอกชื่อบัญชี"
  if (a.promptPayId?.trim() && !promptPayKind(a.promptPayId)) return "PromptPay ID ไม่ถูกต้อง — เบอร์โทร 10 หลัก · เลขผู้เสียภาษี 13 หลัก · e-Wallet 15 หลัก"
  if (entry.id === NA_MAIN_ID && a.qrImage !== NA_QR) return "บัญชีหลัก Nockacademy ใช้ QR ประจำบัญชีเท่านั้น (ล็อกไว้)"
  if (a.qrImage && !a.qrImage.startsWith("data:image/") && a.qrImage !== NA_QR) return "ไฟล์ QR ต้องเป็นรูปภาพ"
  if (a.qrImage && a.qrImage.length > MAX_QR_IMAGE_CHARS) return "รูป QR ใหญ่เกินไป — ใช้รูปที่เล็กลง"
  if (entry.scope.kind === "brand" ? entry.scope.brands.length === 0 : entry.scope.branchIds.length === 0) return "เลือกว่าจะใช้กับธุรกิจหรือสาขาไหน"
  const clash = bankConflict(entry, others, branches)
  if (clash) return `สาขา ${clash.name} มีบัญชีอื่นที่เลือกแบบเดียวกันอยู่แล้ว — แก้ที่บัญชีนั้นก่อน`
  return null
}

/** where the account goes, in words — for the list */
export function bankScopeLabel(entry: BankAccountEntry, branches: BranchLite[]): string {
  if (entry.scope.kind === "brand") return entry.scope.brands.length >= 2 ? "ทุกธุรกิจ (Liclass + Nockacademy)" : entry.scope.brands.map((b) => BRAND_LABEL[b]).join(", ")
  const names = entry.scope.branchIds.map((id) => branches.find((b) => b.id === id)?.name).filter(Boolean) as string[]
  if (names.length === branches.length && branches.length > 0) return "ทุกสาขา"
  return names.length > 3 ? `${names.slice(0, 3).join(", ")} +${names.length - 3}` : names.join(", ") || "—"
}

/** the Nockacademy main account always uses the saved QR file, whatever was uploaded before (owner 2026-11-24: "use this one, always") */
export function withNaQr(entries: BankAccountEntry[]): BankAccountEntry[] {
  return entries.map((e) => (e.id === NA_MAIN_ID && e.account.qrImage !== NA_QR ? { ...e, account: { ...e.account, qrImage: NA_QR } } : e))
}

/** first start (and old browsers): one account per business type, taken from the branches as they are.
 *  QR on the invoice is Nockacademy-only for now (owner 2026-11-24) — Liclass's account carries no QR until Dai adds one. */
export function defaultBankAccounts(branches: Branch[]): BankAccountEntry[] {
  const out: BankAccountEntry[] = []
  for (const brand of ["nockacademy", "liclass"] as Brand[]) {
    const src = branches.find((b) => b.brand === brand && b.bankAccount.number)
    if (!src) continue
    const { promptPayId, qrImage, ...rest } = src.bankAccount
    out.push({
      id: `bk_${brand}`, label: `บัญชีหลัก ${BRAND_LABEL[brand]}`,
      account: brand === "nockacademy" ? { ...rest, promptPayId, qrImage: qrImage ?? NA_QR } : { ...rest },
      scope: { kind: "brand", brands: [brand] },
    })
  }
  return out
}
