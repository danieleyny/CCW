import { FACTS, type FactGroup, type FactType } from "@/lib/facts/registry"
import { QUESTIONNAIRES } from "@/lib/requirements/questionnaires"

/**
 * Serializable row/group data for the "Your details" editor. Built server-side so the
 * registry + the questionnaire catalogue (for the "used on N forms" count) stay out
 * of the client bundle — the client component only holds values and renders.
 */
export interface FactRowMeta {
  key: string
  label: string
  type: FactType
  kind: "editable" | "ssn"
  options?: string[]
  placeholder?: string
  /** Not required of everyone — shown with an "only if it applies" chip and never
   *  counted toward completeness. */
  optional?: boolean
  uses: number
  /** The current value. Empty for an unset editable fact; ALWAYS empty for the SSN
   *  (its value is never sent to the client). */
  value: string
  /** SSN only: whether one is on file (shown as "On file (hidden)"). */
  onFile?: boolean
}
export interface FactGroupData {
  key: FactGroup
  label: string
  rows: FactRowMeta[]
}

const GROUP_LABEL: Record<FactGroup, string> = {
  you: "Applicant",
  address: "Address",
  contact: "Contact",
  physical: "Description",
  employer: "Employer",
  sponsor: "The company",
  safeguard: "Safeguard",
}

/** How many questionnaires reference each fact — the "used on N forms" line. */
function factUsage(): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const q of Object.values(QUESTIONNAIRES)) {
    const bump = (fields?: { fact?: string }[]) => {
      for (const f of fields ?? []) if (f.fact) counts[f.fact] = (counts[f.fact] ?? 0) + 1
    }
    bump(q.fields)
    for (const g of q.groups ?? []) bump(g.fields)
  }
  return counts
}

export function buildFactGroups(
  facts: Record<string, string>,
  hasSsn: boolean,
  groups: FactGroup[],
  showSsn: boolean
): { groups: FactGroupData[]; total: number } {
  const uses = factUsage()
  const out: FactGroupData[] = []
  let total = 0 // editable, non-derived, non-SSN — the meter's denominator

  for (const g of groups) {
    // DERIVED facts (full name, age, DOB parts) are computed from other answers, not
    // questions to answer — they never appear on this editor.
    const defs = FACTS.filter((f) => f.group === g && !f.derive && (showSsn || f.key !== "applicant.ssn"))
    if (defs.length === 0) continue
    const rows: FactRowMeta[] = defs.map((f) => {
      const kind: FactRowMeta["kind"] = f.key === "applicant.ssn" ? "ssn" : "editable"
      // An optional field is never counted toward completeness.
      if (kind === "editable" && !f.optional) total++
      return {
        key: f.key,
        label: f.label,
        type: f.type,
        kind,
        options: f.options,
        placeholder: f.placeholder,
        optional: f.optional,
        uses: uses[f.key] ?? 0,
        value: kind === "ssn" ? "" : facts[f.key] ?? "",
        onFile: kind === "ssn" ? hasSsn : undefined,
      }
    })
    out.push({ key: g, label: GROUP_LABEL[g], rows })
  }
  return { groups: out, total }
}
