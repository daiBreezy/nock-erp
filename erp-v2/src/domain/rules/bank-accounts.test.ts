import { describe, expect, it } from "vitest"
import type { BankAccountEntry, Branch } from "../types"
import { applyBankAccounts, bankAccountFor, bankConflict, bankScopeLabel, defaultBankAccounts, validateBankEntry } from "./bank-accounts"

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
  })
  it("says where an account goes", () => {
    expect(bankScopeLabel(entry("e", { kind: "brand", brands: ["nockacademy", "liclass"] }), branches)).toMatch(/ทุกธุรกิจ/)
    expect(bankScopeLabel(entry("e", { kind: "branch", branchIds: ["a", "b", "c"] }), branches)).toBe("ทุกสาขา")
    expect(bankScopeLabel(entry("e", { kind: "branch", branchIds: ["a"] }), branches)).toBe("a")
  })
})
