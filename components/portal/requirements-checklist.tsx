"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import { RequirementAction, type GeneratedDoc } from "@/components/portal/requirement-action"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { actionFor } from "@/lib/requirements/actions"
import type { FeeSummary } from "@/lib/fees"
import type { FeeReceipts } from "@/components/portal/fee-panel"
import { cn } from "@/lib/utils"

export interface ReqChecklistItem {
  id: string
  reqCode: string
  status: string // case_req_status: na | pending | satisfied | rejected
  title: string
  description: string | null
  authority: string | null
  severity: string // critical | high | watch | long_lead
  documentType: string | null
}

type FilterKey = "all" | "todo" | "done" | "notarizing"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "done", label: "Completed" },
  { key: "notarizing", label: "Needs notarization" },
]

const SEV_TONE: Record<string, string> = {
  critical: "text-danger",
  high: "text-brass",
  watch: "text-text-low",
  long_lead: "text-signal",
}

/**
 * The client's checklist, driven by the DB requirements engine (case_requirements
 * joined to the versioned registry). Every row shows its stable req_code and the
 * authority citation it traces to — the same source of truth admin QA reads.
 */
export function RequirementsChecklist({
  items,
  caseId,
  clientId,
  prefills,
  generated,
  signatureOnFile,
  feeSummary,
  feeReceipts,
}: {
  items: ReqChecklistItem[]
  caseId: string
  clientId: string
  /** Per-requirement questionnaire starting values (intake + saved answers). */
  prefills: Record<string, Record<string, unknown>>
  /** Documents we already generated, keyed by req_code. */
  generated: Record<string, GeneratedDoc>
  /** Base64 PNG of the applicant's signature on file, if they've captured one. */
  signatureOnFile: string | null
  feeSummary: FeeSummary
  feeReceipts: FeeReceipts
}) {
  // System controls (FMT-01, the intake-derived eligibility items) are things we
  // verify, not tasks for the customer — showing them as "Confirm" buttons was
  // asking someone to vouch for a machine check. Admin/QA still sees them.
  const visible = items.filter((i) => !isSystemVerified(i.reqCode))
  const applicable = visible.filter((i) => i.status !== "na")
  const notApplicable = visible.filter((i) => i.status === "na")

  const satisfied = applicable.filter((i) => i.status === "satisfied").length

  const isDone = (i: ReqChecklistItem) => i.status === "satisfied"
  // "Needs notarization" is a real waiting state, not a status: the document
  // exists, and the only thing between it and done is a notary.
  const groups: Record<FilterKey, ReqChecklistItem[]> = {
    all: applicable,
    todo: applicable.filter((i) => !isDone(i)),
    done: applicable.filter(isDone),
    notarizing: applicable.filter(
      (i) => !isDone(i) && !!actionFor(i.reqCode)?.notarize && !!generated[i.reqCode]
    ),
  }

  // Land on what's left. Someone opening their checklist wants the work, not a
  // list they have to re-read to find the work in.
  const [filter, setFilter] = useState<FilterKey>(() => (groups.todo.length ? "todo" : "all"))
  const shown = groups[filter]

  if (applicable.length === 0 && notApplicable.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your personalized requirements haven&apos;t been generated yet.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-ok" />
          <span>
            {satisfied} of {applicable.length} requirements satisfied
          </span>
        </div>

        <div role="group" aria-label="Filter your checklist" className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const count = groups[f.key].length
            if (f.key === "notarizing" && count === 0) return null
            const active = filter === f.key
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "min-h-[36px] rounded-full border px-3 text-xs font-medium transition-colors",
                  "focus-visible:ring-2 focus-visible:ring-signal/40 focus-visible:outline-none",
                  active
                    ? "border-brass/50 bg-brass/15 text-brass-bright"
                    : "border-hairline text-text-mid hover:text-foreground"
                )}
              >
                {f.label} <span className="tabular-nums opacity-70">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <ul className="divide-y rounded-lg border bg-card">
        {shown.map((item) => (
          <li key={item.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-text-mid">
                    {item.reqCode}
                  </span>
                  <span className={cn("text-[10px] font-medium uppercase tracking-wide", SEV_TONE[item.severity] ?? "text-text-low")}>
                    {item.severity.replace(/_/g, " ")}
                  </span>
                </div>
                {/* Lead with what to DO in plain words; keep the registry's
                    official title underneath, where it belongs — as the record. */}
                <div className="mt-1 text-sm font-medium">
                  {actionFor(item.reqCode)?.customerTitle ?? item.title}
                </div>
                {item.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                )}
                <p className="mt-1 font-mono text-[10px] text-text-low">
                  {item.title}
                  {item.authority ? ` · ${item.authority}` : ""}
                </p>
              </div>
              <StatusBadge status={item.status} />
            </div>

            <RequirementAction
              reqCode={item.reqCode}
              status={item.status}
              caseId={caseId}
              clientId={clientId}
              prefill={prefills[item.reqCode] ?? {}}
              generated={generated[item.reqCode] ?? null}
              signatureOnFile={signatureOnFile}
              feeSummary={feeSummary}
              feeReceipts={feeReceipts}
            />
          </li>
        ))}
      </ul>

      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed bg-card/50 p-6 text-center text-sm text-muted-foreground">
          {filter === "todo" ? "Nothing left to do here — every item is complete." : "Nothing in this view yet."}
        </p>
      )}

      {notApplicable.length > 0 && (
        <details className="rounded-lg border bg-card/50 px-4 py-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Not applicable to your case ({notApplicable.length})
          </summary>
          <ul className="mt-3 space-y-1.5">
            {notApplicable.map((item) => (
              <li key={item.id} className="flex items-center gap-2 text-xs text-text-low">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px]">{item.reqCode}</span>
                {item.title}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
