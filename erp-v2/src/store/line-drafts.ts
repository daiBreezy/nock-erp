import { create } from "zustand"
import { persist } from "zustand/middleware"

// owner 2026-11-12: the "ข้อความ LINE ที่ระบบส่ง" boxes are a free-form SPEC to talk about with Admin / Dev — editable,
// deletable, addable. Drafts only: nothing here changes what the system really sends (domain/rules/messages.ts).

export interface DraftBox { key: string; brand: string; group: string; title: string; hint: string; text: string }

export const uid = () => Math.random().toString(36).slice(2, 9)
export const boxKey = (brand: string, group: string, title: string) => `${brand}|${group}|${title}`

interface State {
  /** edited versions of boxes the system generates, by boxKey */
  overrides: Record<string, DraftBox>
  /** generated boxes the owner deleted (restorable) */
  removed: string[]
  /** boxes the owner added by hand */
  added: DraftBox[]
  save: (box: DraftBox, custom: boolean) => void
  remove: (key: string, custom: boolean) => void
  restore: (key: string) => void
  restoreAll: (brand: string) => void
  revert: (key: string) => void
  add: (brand: string, group: string) => string
}

export const useLineDrafts = create<State>()(
  persist(
    (set) => ({
      overrides: {}, removed: [], added: [],
      save: (box, custom) => set((s) => custom
        ? { added: s.added.map((b) => (b.key === box.key ? box : b)) }
        : { overrides: { ...s.overrides, [box.key]: box } }),
      remove: (key, custom) => set((s) => custom
        ? { added: s.added.filter((b) => b.key !== key) }
        : { removed: s.removed.includes(key) ? s.removed : [...s.removed, key] }),
      restore: (key) => set((s) => ({ removed: s.removed.filter((k) => k !== key) })),
      restoreAll: (brand) => set((s) => ({ removed: s.removed.filter((k) => !k.startsWith(`${brand}|`)) })),
      revert: (key) => set((s) => ({ overrides: Object.fromEntries(Object.entries(s.overrides).filter(([k]) => k !== key)) })),
      add: (brand, group) => {
        const key = `custom|${brand}|${uid()}`
        set((s) => ({ added: [...s.added, { key, brand, group, title: "ข้อความใหม่", hint: "", text: "" }] }))
        return key
      },
    }),
    { name: "nock-line-drafts-v2" },
  ),
)
