import { FACTS, GROUP_NOTES, type FactDef, type FactGroup, type FactType } from "@/lib/facts/registry"
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
  /** A collapsed "Show me an example" sample answer for an abstract field. */
  example?: string
  /** Conditional visibility, evaluated client-side against live values. */
  showWhen?: { key: string; equals: string[] }
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
  /** A group-level explanation rendered above the rows (e.g. the safeguard "not you" rule). */
  note?: string
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
  safekeeping: "Safekeeping location",
  counsel: "Counsel",
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

/**
 * Completeness over the "Your details" editor — required, currently-visible,
 * non-optional, non-SSN scalar facts. Computed with the SAME rules the page's live
 * meter uses (components/portal/facts/fact-groups.tsx), so any surface that reports
 * "Your details — N of M" (e.g. the concierge data-ask) agrees with the page it links
 * to instead of showing a second denominator (P2-4).
 */
export function detailsMeter(
  groups: FactGroupData[],
  /** Keys that are filled but INVALID (e.g. a safeguard field that is the applicant's own)
   *  — counted toward the total but never toward captured, so a conflict blocks completeness. */
  invalidKeys?: ReadonlySet<string>
): { captured: number; total: number } {
  const flat = groups.flatMap((g) => g.rows)
  const valueOf = (key: string) => flat.find((r) => r.key === key)?.value ?? ""
  const visible = (r: FactRowMeta) => !r.showWhen || r.showWhen.equals.includes(valueOf(r.showWhen.key).trim())
  let captured = 0
  let total = 0
  for (const r of flat) {
    if (r.kind !== "editable" || r.optional || !visible(r)) continue
    total++
    if (r.value.trim() && !invalidKeys?.has(r.key)) captured++
  }
  return { captured, total }
}

export function buildFactGroups(
  facts: Record<string, string>,
  hasSsn: boolean,
  groups: FactGroup[],
  showSsn: boolean,
  /** Renewal-only facts (the prior licence number) appear only on a renewal case. */
  isRenewal = false
): { groups: FactGroupData[]; total: number } {
  const uses = factUsage()
  const out: FactGroupData[] = []
  let total = 0 // editable, non-derived, non-SSN, currently-VISIBLE — the meter's denominator

  // A conditional row counts toward the denominator only when its condition is met by
  // the CURRENT facts (the client recomputes this live as values change).
  const visible = (f: FactDef) => !f.showWhen || f.showWhen.equals.includes(facts[f.showWhen.key] ?? "")

  for (const g of groups) {
    // DERIVED facts (full name, age, DOB parts) are computed from other answers, not
    // questions to answer — they never appear on this editor.
    const defs = FACTS.filter(
      (f) => f.group === g && !f.derive && !f.hidden && (showSsn || f.key !== "applicant.ssn") && (isRenewal || !f.renewalOnly)
    )
    if (defs.length === 0) continue
    const rows: FactRowMeta[] = defs.map((f) => {
      const kind: FactRowMeta["kind"] = f.key === "applicant.ssn" ? "ssn" : "editable"
      // Counted only if required AND currently visible.
      if (kind === "editable" && !f.optional && visible(f)) total++
      return {
        key: f.key,
        label: f.label,
        type: f.type,
        kind,
        options: f.options,
        placeholder: f.placeholder,
        optional: f.optional,
        example: f.example,
        showWhen: f.showWhen,
        uses: uses[f.key] ?? 0,
        value: kind === "ssn" ? "" : facts[f.key] ?? "",
        onFile: kind === "ssn" ? hasSsn : undefined,
      }
    })
    out.push({ key: g, label: GROUP_LABEL[g], note: GROUP_NOTES[g], rows })
  }
  return { groups: out, total }
}
