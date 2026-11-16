import { FACTS, type FactDef, type FactGroup, type FactType } from "@/lib/facts/registry"
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
  /** Display-only ownership cue for sponsor-supplied values. */
  owner?: "applicant" | "sponsor"
}
export interface FactGroupData {
  key: FactGroup
  label: string
  description: string
  icon: GroupIcon
  rows: FactRowMeta[]
}

export type GroupIcon =
  | "id-card"
  | "home"
  | "phone"
  | "user"
  | "briefcase"
  | "building"
  | "shield-check"
  | "lock"
  | "scale"

/** The applicant-facing fact groups shared by the details page and readiness checks. */
export const DETAIL_FACT_GROUPS: FactGroup[] = [
  "you",
  "address",
  "contact",
  "physical",
  "employer",
  "safeguard",
  "safekeeping",
  "counsel",
]

const GROUP_DISPLAY: Record<FactGroup, { label: string; description: string; icon: GroupIcon }> = {
  you: {
    label: "About you",
    description: "Your legal name and status, exactly as on your ID.",
    icon: "id-card",
  },
  address: {
    label: "Home address",
    description: "Where you live in NYC. Must match your proof of residence.",
    icon: "home",
  },
  contact: {
    label: "Contact",
    description: "How the NYPD and your concierge reach you.",
    icon: "phone",
  },
  physical: {
    label: "Description",
    description: "Printed on your license. Use what’s on your ID.",
    icon: "user",
  },
  employer: {
    label: "Employment",
    description: "Your current job, if you have one. More fields appear if you say yes.",
    icon: "briefcase",
  },
  sponsor: {
    label: "Your sponsor",
    description: "Filled in by your sponsor.",
    icon: "building",
  },
  safeguard: {
    label: "Safeguard person",
    description: "Someone 21+ who will hold your firearm if needed. It can’t be you.",
    icon: "shield-check",
  },
  safekeeping: {
    label: "Where it’s kept",
    description: "The address where the firearm is secured.",
    icon: "lock",
  },
  counsel: {
    label: "Attorney",
    description: "Only if a lawyer represents you on this application.",
    icon: "scale",
  },
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
        owner: f.owner,
      }
    })
    out.push({ key: g, ...GROUP_DISPLAY[g], rows })
  }
  return { groups: out, total }
}

export type RequiredFactState = {
  key: string
  label: string
  section: string
  complete: boolean
}

/**
 * The exact required/visible rule used by the live details meter, expressed as
 * serializable rows so server-side gates can reuse it without duplicating rules.
 */
export function requiredVisibleFacts(groups: FactGroupData[]): RequiredFactState[] {
  const values: Record<string, string> = {}
  for (const group of groups) {
    for (const row of group.rows) if (row.kind === "editable") values[row.key] = row.value
  }

  const rows: RequiredFactState[] = []
  for (const group of groups) {
    for (const row of group.rows) {
      const visible = !row.showWhen || row.showWhen.equals.includes((values[row.showWhen.key] ?? "").trim())
      if (!visible || row.kind !== "editable" || row.optional) continue
      rows.push({
        key: row.key,
        label: row.label,
        section: group.label,
        complete: (values[row.key] ?? "").trim() !== "",
      })
    }
  }
  return rows
}
