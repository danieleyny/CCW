import Link from "next/link"
import { CheckCircle2, AlertTriangle, CircleDashed, FileClock, Ban } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import {
  APPLICATION_COVERAGE,
  COVERAGE_SECTIONS,
  coverageSummary,
  type CoverageField,
  type CoverageStatus,
} from "@/config/application-coverage"

export const metadata = { title: "Application coverage" }

const STATUS_META: Record<CoverageStatus, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  ok: { label: "Captured", icon: CheckCircle2, tone: "text-ok" },
  partial: { label: "Partial", icon: CircleDashed, tone: "text-warn" },
  at_filing: { label: "At filing", icon: FileClock, tone: "text-signal" },
  verify: { label: "Verify", icon: AlertTriangle, tone: "text-warn" },
  gap: { label: "GAP", icon: Ban, tone: "text-danger" },
}

/**
 * PART A / Phase 2 — the field-by-field coverage report. Proves we capture
 * every field the official application asks (or flags an explicit gap), reading
 * config/application-coverage.ts — the same map the portal worksheet renders
 * from. This feeds the final-QA judgement of "enough to file."
 */
export default async function CoverageReport() {
  await requireStaff()
  const s = coverageSummary()
  const all: readonly CoverageField[] = APPLICATION_COVERAGE

  return (
    <div className="space-y-6">
      <PageHeader
        title="Application coverage"
        description="Every field on NYPD PD 643-041 (Rev. 11-10) mapped to where we capture it — or an explicit, flagged gap. Attorney-reviewable; confirm 'verify' rows against the live NYPD portal."
      />

      {/* Roll-up */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {(["ok", "partial", "at_filing", "verify", "gap"] as CoverageStatus[]).map((k) => {
          const meta = STATUS_META[k]
          const Icon = meta.icon
          const n = { ok: s.ok, partial: s.partial, at_filing: s.atFiling, verify: s.verify, gap: s.gap }[k]
          return (
            <div key={k} className="rounded-lg border bg-card p-3">
              <div className={`flex items-center gap-1.5 text-xs ${meta.tone}`}>
                <Icon className="size-3.5" /> {meta.label}
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{n}</div>
            </div>
          )
        })}
      </div>

      {s.gap > 0 && (
        <div className="rounded-lg border border-danger/30 bg-danger/8 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-danger">
            <Ban className="size-4" /> {s.gap} field{s.gap === 1 ? "" : "s"} not captured
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-text-mid">
            {all
              .filter((f) => f.status === "gap")
              .map((f) => (
                <li key={f.id}>
                  <span className="font-medium">{f.formLabel}</span>
                  {f.notes ? ` — ${f.notes}` : ""}
                </li>
              ))}
          </ul>
          <p className="mt-2 text-xs text-text-low">
            Gaps are proposed additions in <code>REGISTRY_COVERAGE.md</code>; nothing is added to the
            registry without review.
          </p>
        </div>
      )}

      {COVERAGE_SECTIONS.map((section) => {
        const fields = all.filter((f) => f.section === section.key)
        if (fields.length === 0) return null
        return (
          <section key={section.key}>
            <h2 className="engraved mb-2">{section.label}</h2>
            <ul className="divide-y rounded-lg border bg-card">
              {fields.map((f) => {
                const meta = STATUS_META[f.status]
                const Icon = meta.icon
                return (
                  <li key={f.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {f.questionNo && (
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">Q{f.questionNo}</span>
                        )}
                        <span className="font-medium">{f.formLabel}</span>
                        {f.sensitive && (
                          <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] uppercase text-danger">sensitive</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-text-low">
                        {captureLabel(f)}
                        {f.notes ? ` · ${f.notes}` : ""}
                      </p>
                    </div>
                    <span className={`flex shrink-0 items-center gap-1 text-xs ${meta.tone}`}>
                      <Icon className="size-3.5" /> {meta.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <p className="text-xs text-text-low">
        The applicant&apos;s copy-paste worksheet renders from this same map (
        <Link href="/admin/reports" className="text-signal underline">
          back to reports
        </Link>
        ). Source: NYPD PD 643-041 (Rev. 11-10) + instructions PD 643-115.
      </p>
    </div>
  )
}

function captureLabel(f: CoverageField): string {
  const { kind, ref } = f.capture
  switch (kind) {
    case "intake":
      return `Intake · ${ref}`
    case "client":
      return `Client record · ${ref}`
    case "case":
      return `Case record · ${ref}`
    case "requirement":
      return `Requirement ${ref}`
    case "derived":
      return `Derived from ${ref}`
    case "at_filing":
      return "Applicant enters at filing — deliberately not stored"
    case "verify":
      return "Believed captured — confirm against the live portal"
    case "gap":
      return "Not captured"
  }
}
