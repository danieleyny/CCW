"use client"

import { useMemo, useRef, useState } from "react"
import { FactRow } from "./fact-row"
import type { FactGroupData } from "@/lib/facts/details-view"

/**
 * Grouped, inline-editable fact rows — the one preparation surface, reused by the
 * applicant's "Your details" screen and (at full scope) the sponsor's file. Empty
 * fields are live inputs; the meter and collapse-to-read-only are driven from client
 * state so nothing revalidates mid-typing. The SSN is included only when the server
 * builder was asked for it (the applicant's own screen) — never for a sponsor.
 */
export function FactGroups({
  caseId,
  groups,
  total,
  showMeter = false,
}: {
  caseId: string
  groups: FactGroupData[]
  /** Editable, non-SSN denominator for the meter. */
  total: number
  showMeter?: boolean
}) {
  // key → current value, for every editable row (drives the meter + collapse).
  const [values, setValues] = useState<Record<string, string>>(() => {
    const v: Record<string, string> = {}
    for (const g of groups) for (const r of g.rows) if (r.kind === "editable") v[r.key] = r.value
    return v
  })
  const [ssnOnFile, setSsnOnFile] = useState<Record<string, boolean>>(() => {
    const s: Record<string, boolean> = {}
    for (const g of groups) for (const r of g.rows) if (r.kind === "ssn") s[r.key] = !!r.onFile
    return s
  })

  const containerRef = useRef<HTMLDivElement>(null)
  function focusNext(from: HTMLElement): boolean {
    const inputs = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[data-fact-input]") ?? [])
    const i = inputs.indexOf(from)
    if (i >= 0 && i < inputs.length - 1) {
      inputs[i + 1].focus()
      return true
    }
    return false
  }

  // Optional facts ("only if it applies") never count toward completeness.
  const requiredKeys = useMemo(() => {
    const s = new Set<string>()
    for (const g of groups) for (const r of g.rows) if (r.kind === "editable" && !r.optional) s.add(r.key)
    return s
  }, [groups])
  const captured = useMemo(
    () => [...requiredKeys].filter((k) => (values[k] ?? "").trim() !== "").length,
    [requiredKeys, values]
  )

  return (
    <div className="space-y-6">
      {showMeter && <Meter captured={captured} total={total} />}
      <div ref={containerRef} className="space-y-6">
        {groups.map((g) => (
          <section key={g.key} id={g.key} className="scroll-mt-20 rounded-lg border border-hairline bg-card p-4">
            <div className="engraved mb-1 text-text-low">{g.label}</div>
            {g.rows.map((r) => (
              <FactRow
                key={r.key}
                caseId={caseId}
                meta={r.kind === "ssn" ? { ...r, onFile: ssnOnFile[r.key] } : r}
                value={r.kind === "editable" ? values[r.key] ?? "" : r.value}
                onSaved={(key, next) => setValues((prev) => ({ ...prev, [key]: next }))}
                onSsnSaved={() => setSsnOnFile((prev) => ({ ...prev, [r.key]: true }))}
                focusNext={focusNext}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}

function Meter({ captured, total }: { captured: number; total: number }) {
  const pct = total > 0 ? Math.round((captured / total) * 100) : 0
  return (
    <div className="rounded-lg border border-brass/30 bg-brass/[0.05] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {captured} of {total} details captured
        </span>
        {captured < total && <span className="text-text-mid">{total - captured} still needed</span>}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-brass transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
