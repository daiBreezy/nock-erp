import type { ID, Result } from "@/domain/types"
import { useStore } from "@/store/store"

/**
 * owner 2026-11-20: a family set starts as BLANK Drafts for every child (new or old students alike), linked as one set — the
 * courses are filled in afterwards. From a Lead each child named on it becomes a Student first; from a family, its children.
 */
export function startFamilySet(src: { leadId?: ID; familyId?: ID }): Result<{ firstId: ID }> {
  const st = useStore.getState()
  let ids: ID[]
  if (src.leadId) {
    const r = st.ensureLeadKidStudents(src.leadId)
    if (!r.ok) return r
    ids = r.value.studentIds
  } else {
    ids = st.students.filter((x) => x.familyId && x.familyId === src.familyId && !x.archived && x.exit?.status !== "closed").map((x) => x.id)
  }
  if (ids.length < 2) return { ok: false, error: "ชุดครอบครัวต้องมีลูกอย่างน้อย 2 คน" }
  const made = st.createBlankFamilyBundle(ids)
  if (!made.ok) return made
  return { ok: true, value: { firstId: made.value.created[0].id } }
}
