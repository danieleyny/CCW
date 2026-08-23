import { FACTS, type FactGroup } from "@/lib/facts/registry"
import { QUESTIONNAIRES } from "@/lib/requirements/questionnaires"
import { FactRow } from "./fact-row"

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

/**
 * Grouped, editable fact rows — the one preparation surface, reused by the
 * applicant's "Your details" screen and (at full scope) the sponsor's file. Each
 * row edits through the same setCaseFact/resolver. The SSN is shown only when
 * showSsn is set (the applicant's own screen) — NEVER to a sponsor.
 */
export function FactGroups({
  caseId,
  facts,
  hasSsn,
  groups,
  showSsn = false,
}: {
  caseId: string
  facts: Record<string, string>
  hasSsn: boolean
  groups: FactGroup[]
  showSsn?: boolean
}) {
  const uses = factUsage()
  return (
    <>
      {groups.map((g) => {
        const rows = FACTS.filter((f) => f.group === g && (showSsn || f.key !== "applicant.ssn"))
        if (rows.length === 0) return null
        return (
          <section key={g} className="rounded-lg border border-hairline bg-card p-4">
            <div className="engraved mb-1 text-text-low">{GROUP_LABEL[g]}</div>
            {rows.map((f) => (
              <FactRow
                key={f.key}
                caseId={caseId}
                factKey={f.key}
                label={f.label}
                value={f.key === "applicant.ssn" ? (hasSsn ? "on file" : "") : facts[f.key] ?? ""}
                uses={uses[f.key] ?? 0}
                kind={f.derive ? "derived" : f.key === "applicant.ssn" ? "ssn" : "editable"}
              />
            ))}
          </section>
        )
      })}
    </>
  )
}
