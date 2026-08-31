"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, ChevronRight, CheckCircle2 } from "lucide-react"
import { FactRow } from "./fact-row"
import { flagAttorneyReview } from "@/app/portal/facts/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { FactGroupData, FactRowMeta } from "@/lib/facts/details-view"

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
  flagEligibility = false,
}: {
  caseId: string
  groups: FactGroupData[]
  /** Editable, non-SSN denominator for the meter. */
  total: number
  showMeter?: boolean
  /** The applicant's OWN screen — enables the citizenship eligibility routing. A
   *  sponsor editing a file must not flag the applicant, so it stays off there. */
  flagEligibility?: boolean
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

  // A conditional row is shown only when its trigger fact holds one of its values.
  // A hidden conditional field counts for nothing — not the meter, not readiness.
  const isVisible = (r: FactRowMeta) => !r.showWhen || r.showWhen.equals.includes((values[r.showWhen.key] ?? "").trim())

  // Optional facts never count; conditionally-hidden fields don't either — and the
  // denominator recomputes live as a conditional toggles (#14).
  const { requiredKeys, liveTotal } = useMemo(() => {
    const s = new Set<string>()
    for (const g of groups) for (const r of g.rows) if (r.kind === "editable" && !r.optional && isVisible(r)) s.add(r.key)
    return { requiredKeys: s, liveTotal: s.size }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, values])
  const captured = useMemo(
    () => [...requiredKeys].filter((k) => (values[k] ?? "").trim() !== "").length,
    [requiredKeys, values]
  )

  const citizenship = values["applicant.citizenship"] ?? ""

  // A2 — the fields still needed: required, currently VISIBLE, and empty. Listed in
  // page order and grouped by section so the dialog reads like the page.
  const outstanding = useMemo(() => {
    const out: { key: string; label: string; section: string }[] = []
    for (const g of groups)
      for (const r of g.rows)
        if (r.kind === "editable" && !r.optional && isVisible(r) && (values[r.key] ?? "").trim() === "")
          out.push({ key: r.key, label: r.label, section: g.label })
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, values])

  const [dialogOpen, setDialogOpen] = useState(false)

  // Scroll a field into view, focus it, and pulse its ring once so the eye lands on it.
  const jumpTo = (key: string) => {
    setDialogOpen(false)
    // Let the dialog close before we scroll/focus underneath it.
    setTimeout(() => {
      const el = document.getElementById(`fact-${key}`)
      if (!el) return
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      ;(el as HTMLElement).focus({ preventScroll: true })
      el.classList.remove("fact-pulse")
      void (el as HTMLElement).offsetWidth // restart the animation
      el.classList.add("fact-pulse")
      setTimeout(() => el.classList.remove("fact-pulse"), 1900)
    }, 60)
  }

  return (
    <div className="space-y-6">
      {showMeter && (
        <Meter
          captured={captured}
          total={liveTotal || total}
          outstandingCount={outstanding.length}
          onOpen={() => setDialogOpen(true)}
        />
      )}
      {showMeter && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {outstanding.length} still needed
              </DialogTitle>
            </DialogHeader>
            {outstanding.length > 0 && (
              <button
                type="button"
                onClick={() => jumpTo(outstanding[0].key)}
                className="flex w-full items-center justify-center gap-1.5 rounded-md bg-brass px-3 py-2 text-sm font-medium text-brand-foreground transition-colors hover:bg-brass-bright"
              >
                Jump to the next one still needed <ArrowRight className="size-4" />
              </button>
            )}
            <ul className="mt-1 max-h-[50vh] space-y-1 overflow-y-auto">
              {groupOutstanding(outstanding).map(({ section, items }) => (
                <li key={section}>
                  <div className="engraved-sm px-1 pb-1 pt-2 text-text-low">{section}</div>
                  {items.map((o) => (
                    <button
                      key={o.key}
                      type="button"
                      onClick={() => jumpTo(o.key)}
                      className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-surface-2"
                    >
                      <span>{o.label}</span>
                      <ChevronRight className="size-4 shrink-0 text-text-low" />
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}
      <div ref={containerRef} className="space-y-6">
        {groups.map((g) => {
          const rows = g.rows.filter(isVisible)
          if (rows.length === 0) return null // a group whose every field is conditionally hidden
          return (
            <section key={g.key} id={g.key} className="scroll-mt-20 rounded-lg border border-hairline bg-card p-4">
              <div className="engraved mb-1 text-text-low">{g.label}</div>
              {rows.map((r) => (
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
              {/* #3 — "Neither" is an ELIGIBILITY answer, not a data point. State the
                  general federal rule, don't conclude about their status, and route to
                  attorney review. */}
              {g.key === "you" && citizenship === "Neither" && (
                <CitizenshipEligibilityNotice caseId={caseId} flagEligibility={flagEligibility} />
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function CitizenshipEligibilityNotice({ caseId, flagEligibility }: { caseId: string; flagEligibility: boolean }) {
  // Route it to a human (idempotent). Only from the applicant's own screen.
  useEffect(() => {
    if (flagEligibility) void flagAttorneyReview(caseId, "citizenship_neither")
  }, [caseId, flagEligibility])
  return (
    <div className="mt-3 rounded-md border border-danger/40 bg-danger/[0.06] p-3 text-sm">
      <p className="font-medium text-danger">We can&apos;t move this application forward yet.</p>
      <p className="mt-1 text-text-mid">
        Under federal law (18 U.S.C. § 922(g)(5)), a person who is neither a U.S. citizen nor a lawful
        permanent resident is generally prohibited from possessing a firearm. We can&apos;t advise on your
        specific situation, and we won&apos;t take payment while this is unresolved.
      </p>
      <p className="mt-1 text-text-mid">
        We&apos;ve flagged your case for attorney review — your consultant will reach out about the right
        next step.
      </p>
    </div>
  )
}

/** Group the outstanding fields by their section, preserving page order. */
function groupOutstanding(outstanding: { key: string; label: string; section: string }[]) {
  const out: { section: string; items: { key: string; label: string; section: string }[] }[] = []
  for (const o of outstanding) {
    const last = out[out.length - 1]
    if (last && last.section === o.section) last.items.push(o)
    else out.push({ section: o.section, items: [o] })
  }
  return out
}

/**
 * A2 — the progress bar IS the answer to "which one's missing?". With something
 * outstanding it's a button that opens the list; done, it's a calm "all captured".
 */
function Meter({
  captured,
  total,
  outstandingCount,
  onOpen,
}: {
  captured: number
  total: number
  outstandingCount: number
  onOpen: () => void
}) {
  const pct = total > 0 ? Math.round((captured / total) * 100) : 0
  const done = outstandingCount === 0

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-ok/30 bg-ok/[0.06] p-4 text-sm font-medium text-ok">
        <CheckCircle2 className="size-4" /> All details captured
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-lg border border-brass/30 bg-brass/[0.05] p-4 text-left transition-colors hover:border-brass/50"
      aria-label={`${outstandingCount} still needed — show which`}
    >
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {captured} of {total} details captured
        </span>
        <span className="inline-flex items-center gap-1 text-brass-bright">
          {outstandingCount} still needed — show which
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-brass transition-all" style={{ width: `${pct}%` }} />
      </div>
    </button>
  )
}
