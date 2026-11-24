import { describe, expect, it } from "vitest"
import type { BankAccountEntry, Branch } from "../types"
import { NA_MAIN_ID, NA_QR, applyBankAccounts, bankDeleteImpact, billingBlockReason, invoiceBankStage, withBankSnapshots, bankAccountFor, bankConflict, bankScopeLabel, defaultBankAccounts, validateBankEntry, withNaQr } from "./bank-accounts"

const acct = (bank: string, extra: Partial<Branch["bankAccount"]> = {}) => ({ bank, branchName: "", name: "บจก.", number: "123-4", ...extra })
const br = (id: string, brand: Branch["brand"], bank = "เก่า") => ({ id, name: id, brand, bankAccount: acct(bank) }) as unknown as Branch
const branches = [br("a", "nockacademy"), br("b", "nockacademy"), br("c", "liclass")]
const entry = (id: string, scope: BankAccountEntry["scope"], bank = "ใหม่", extra: Partial<Branch["bankAccount"]> = {}): BankAccountEntry => ({ id, label: id, account: acct(bank, extra), scope })

describe("central bank accounts (owner 2026-11-24)", () => {
  it("a branch-picked account beats a business-type one", () => {
    const list = [entry("e1", { kind: "brand", brands: ["nockacademy"] }, "ธนาคาร-แบรนด์"), entry("e2", { kind: "branch", branchIds: ["b"] }, "ธนาคาร-สาขา")]
    expect(bankAccountFor(branches[0], list)?.id).toBe("e1")
    expect(bankAccountFor(branches[1], list)?.id).toBe("e2")
    expect(bankAccountFor(branches[2], list)).toBeUndefined()
  })
  it("Save = Global: every targeted branch takes the account, the others keep theirs", () => {
    const r = applyBankAccounts(branches, [entry("e1", { kind: "brand", brands: ["nockacademy"] }, "KBank", { qrImage: "data:image/png;base64,AA" })])
    expect(r.changed).toBe(2)
    expect(r.branches.map((b) => b.bankAccount.bank)).toEqual(["KBank", "KBank", "เก่า"])
    expect(r.branches[0].bankAccount.qrImage).toBe("data:image/png;base64,AA")
    // applying again changes nothing
    expect(applyBankAccounts(r.branches, [entry("e1", { kind: "brand", brands: ["nockacademy"] }, "KBank", { qrImage: "data:image/png;base64,AA" })]).changed).toBe(0)
  })
  it("two accounts cannot claim the same branch at the same level", () => {
    const a = entry("e1", { kind: "brand", brands: ["nockacademy"] })
    const clash = entry("e2", { kind: "brand", brands: ["nockacademy", "liclass"] })
    expect(bankConflict(clash, [a], branches)?.id).toBe("a")
    // a branch-level account on top of a business-level one is fine (it wins)
    expect(bankConflict(entry("e3", { kind: "branch", branchIds: ["a"] }), [a], branches)).toBeUndefined()
    expect(validateBankEntry(clash, [a], branches)).toMatch(/มีบัญชีอื่น/)
  })
  it("validates the fields, the PromptPay ID, the QR image and the target", () => {
    const ok = entry("e1", { kind: "brand", brands: ["liclass"] })
    expect(validateBankEntry(ok, [], branches)).toBeNull()
    expect(validateBankEntry({ ...ok, account: { ...ok.account, number: " " } }, [], branches)).toMatch(/เลขบัญชี/)
    expect(validateBankEntry({ ...ok, account: { ...ok.account, promptPayId: "123" } }, [], branches)).toMatch(/PromptPay/)
    expect(validateBankEntry({ ...ok, account: { ...ok.account, qrImage: "http://x/y.png" } }, [], branches)).toMatch(/รูปภาพ/)
    expect(validateBankEntry({ ...ok, scope: { kind: "branch", branchIds: [] } }, [], branches)).toMatch(/เลือก/)
  })
  it("the first accounts: one per business type, the QR stays on Nockacademy only", () => {
    const withQr = [{ ...br("a", "nockacademy"), bankAccount: acct("N", { promptPayId: "0205557003965" }) }, { ...br("c", "liclass"), bankAccount: acct("L", { promptPayId: "0205557003965" }) }] as Branch[]
    const d = defaultBankAccounts(withQr)
    expect(d.map((e) => e.id)).toEqual(["bk_nockacademy", "bk_liclass"])
    expect(d[0].account.promptPayId).toBe("0205557003965")
    expect(d[1].account.promptPayId).toBeUndefined()
    // the Nockacademy main account always carries the saved QR file; Liclass has none
    expect(d[0].account.qrImage).toBe(NA_QR)
    expect(d[1].account.qrImage).toBeUndefined()
  })
  it("the Nockacademy main account is locked to its saved QR — old uploads are replaced", () => {
    const main = defaultBankAccounts(branches.map((b) => ({ ...b, bankAccount: acct("N") })))[0]
    expect(main.id).toBe(NA_MAIN_ID)
    expect(validateBankEntry({ ...main, account: { ...main.account, qrImage: undefined } }, [], branches)).toMatch(/ใช้ QR ประจำบัญชี/)
    expect(validateBankEntry({ ...main, account: { ...main.account, qrImage: "data:image/png;base64,AA" } }, [], branches)).toMatch(/ใช้ QR ประจำบัญชี/)
    // an old upload (or none) is replaced by the saved QR file
    expect(withNaQr([{ ...main, account: { ...main.account, qrImage: "data:image/jpeg;base64,AA" } }])[0].account.qrImage).toBe(NA_QR)
    expect(withNaQr([{ ...main, account: { ...main.account, qrImage: undefined } }])[0].account.qrImage).toBe(NA_QR)
  })
  it("says where an account goes", () => {
    expect(bankScopeLabel(entry("e", { kind: "brand", brands: ["nockacademy", "liclass"] }), branches)).toMatch(/ทุกธุรกิจ/)
    expect(bankScopeLabel(entry("e", { kind: "branch", branchIds: ["a", "b", "c"] }), branches)).toBe("ทุกสาขา")
    expect(bankScopeLabel(entry("e", { kind: "branch", branchIds: ["a"] }), branches)).toBe("a")
  })

  describe("deleting an account (owner 2026-11-24)", () => {
    const inv = (branchId: string, status: string, extra: Record<string, unknown> = {}) => ({ branchId, status, number: status === "draft" || status === "pending_approval" ? null : "INV-1", payments: [], ...extra }) as never
    const brandNA = entry("na", { kind: "brand", brands: ["nockacademy"] }, "NA-bank")
    const forB = entry("b-only", { kind: "branch", branchIds: ["b"] }, "B-bank")
    it("a branch that loses its account is cleared and cannot bill; one with a replacement takes it", () => {
      const withAcct = applyBankAccounts(branches, [brandNA, forB]).branches // a = NA-bank, b = B-bank (branch beats brand)
      expect(withAcct.map((b) => b.bankAccount.bank)).toEqual(["NA-bank", "B-bank", "เก่า"])
      const r = applyBankAccounts(withAcct, [forB], [brandNA, forB]) // delete the NA brand account
      expect(r.branches[0].bankAccount.number).toBe("") // a: nothing else targets it → cleared
      expect(billingBlockReason(r.branches[0])).toMatch(/ยังไม่มีบัญชีรับเงิน/)
      expect(r.branches[1].bankAccount.bank).toBe("B-bank") // b still has its own
      expect(r.branches[2].bankAccount.bank).toBe("เก่า") // c was never targeted: left alone
      expect(r.cleared.map((b) => b.id)).toEqual(["a"])
    })
    it("each invoice stage: drafts follow, pending / issued wait, sent or paid are frozen, void ignored", () => {
      expect(invoiceBankStage(inv("a", "draft"))).toBe("draft")
      expect(invoiceBankStage(inv("a", "pending_approval"))).toBe("pending")
      expect(invoiceBankStage(inv("a", "approved", { number: null }))).toBe("pending")
      expect(invoiceBankStage(inv("a", "approved"))).toBe("issued")
      expect(invoiceBankStage(inv("a", "approved", { payments: [{ id: "p" }] }))).toBe("frozen")
      expect(invoiceBankStage(inv("a", "sent"))).toBe("frozen")
      expect(invoiceBankStage(inv("a", "paid"))).toBe("frozen")
      expect(invoiceBankStage(inv("a", "void"))).toBeNull()
    })
    it("the impact is shown before deleting: branches, replacement or none, invoice counts", () => {
      const invoices = [inv("a", "draft"), inv("a", "draft"), inv("a", "pending_approval"), inv("a", "approved"), inv("a", "sent"), inv("a", "void")]
      const imp = bankDeleteImpact(brandNA, [brandNA, forB], branches, invoices)
      expect(imp.map((i) => i.branch.id)).toEqual(["a"]) // b uses its own branch-level account, c is Liclass
      expect(imp[0]).toMatchObject({ lost: true, draft: 2, pending: 1, issued: 1, frozen: 1 })
      const two = bankDeleteImpact(brandNA, [brandNA, entry("na2", { kind: "brand", brands: ["nockacademy"] })], branches, [])
      expect(two.every((i) => i.lost === false || i.replacement)).toBe(true)
    })
    it("invoices already sent / paid keep the account they had (saved data gets the branch's account as it is)", () => {
      const bs = [br("a", "nockacademy", "ธนาคาร-A")]
      const r = withBankSnapshots({ branches: bs, invoices: [inv("a", "sent"), inv("a", "draft"), inv("a", "paid", { bankSnapshot: { bank: "เดิม" } })] as never })
      expect((r.invoices[0] as never as { bankSnapshot: { bank: string } }).bankSnapshot.bank).toBe("ธนาคาร-A")
      expect((r.invoices[1] as never as { bankSnapshot?: unknown }).bankSnapshot).toBeUndefined()
      expect((r.invoices[2] as never as { bankSnapshot: { bank: string } }).bankSnapshot.bank).toBe("เดิม")
    })
  })
})
