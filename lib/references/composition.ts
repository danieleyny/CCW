/**
 * THE character-reference composition rule (38 RCNY §5-05(b)(8)). One source, used
 * by the add form, the server add path, and the CP-5 gate, so the rule can't be
 * enforced in one place and skipped in another (the bug that let an applicant add
 * three family references).
 *
 *   Concealed / Special Carry (4 refs) — at least 2 non-relatives ⇒ at most 2 family
 *   Carry Guard / Premises   (2 refs)  — BOTH non-relatives ⇒ no family allowed
 *
 * `minNonFamily` is 2 for any track that needs references; `maxFamily` is whatever
 * is left over. A renewal needs 0 references and is always complete.
 */
export interface RefLike {
  is_family?: boolean | null
}

export interface ReferenceComposition {
  required: number
  minNonFamily: number
  maxFamily: number
  familyCount: number
  nonFamilyCount: number
  /** Adding one more family reference would break the rule. */
  familyCapReached: boolean
  /** Count AND composition are both satisfied. */
  complete: boolean
  /** Non-null when references are present but the composition is invalid. */
  problem: string | null
}

export function referenceComposition(refs: RefLike[], required: number): ReferenceComposition {
  const minNonFamily = required >= 2 ? 2 : 0
  const maxFamily = Math.max(0, required - minNonFamily)
  const familyCount = refs.filter((r) => r.is_family).length
  const nonFamilyCount = refs.length - familyCount
  const familyCapReached = familyCount >= maxFamily
  const countOk = refs.length >= required
  const compositionOk = familyCount <= maxFamily && nonFamilyCount >= minNonFamily
  const problem =
    familyCount > maxFamily
      ? `You have ${familyCount} family reference${familyCount === 1 ? "" : "s"}. At least ${minNonFamily} of your ${required} must be unrelated to you — remove a family reference and add someone who isn't family.`
      : null
  return {
    required,
    minNonFamily,
    maxFamily,
    familyCount,
    nonFamilyCount,
    familyCapReached,
    complete: required === 0 ? true : countOk && compositionOk,
    problem,
  }
}

/** The specific message shown when an ADD would exceed the family cap. */
export function familyCapMessage(maxFamily: number, required: number): string {
  if (maxFamily === 0) {
    return "For this licence, none of your references may be family — add someone who isn't related to you."
  }
  return `You already have ${maxFamily} family reference${maxFamily === 1 ? "" : "s"}. At least 2 of your ${required} must be unrelated to you — add someone who isn't family.`
}
