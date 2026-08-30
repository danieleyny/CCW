"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { groupByCategory, categoryKeyFor } from "@/lib/requirements/categories"
import { type GeneratedDoc, type ReferenceProgress } from "@/components/portal/requirement-action"
import { RequirementCard, type ReqChecklistItem, type RequirementCardCtx } from "@/components/portal/requirement-card"
import type { DmvApplicant } from "@/lib/portal/requirement-view"
import type { CurrentDoc } from "@/components/portal/document-uploader"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { actionFor } from "@/lib/requirements/actions"
import { isUnenforced } from "@/lib/legal-status"
import { cn } from "@/lib/utils"
import type { FeeSummary } from "@/lib/fees"
import type { FeeReceipts } from "@/components/portal/fee-panel"

// Re-exported so existing importers (requirement-view, next-step, vault) keep working.
export type { ReqChecklistItem } from "@/components/portal/requirement-card"

type FilterKey = "all" | "todo" | "done" | "notarizing"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "done", label: "Completed" },
  { key: "notarizing", label: "Needs notarization" },
]

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
  currentByReq,
  referenceProgress,
  cohabitantProgress,
  signatureOnFile,
  feeSummary,
  feeReceipts,
  dmvApplicant,
  caseSponsored = false,
  licenseTrack = null,
  isConcierge = false,
}: {
  items: ReqChecklistItem[]
  caseId: string
  clientId: string
  /** Per-requirement questionnaire starting values (intake + saved answers). */
  prefills: Record<string, Record<string, unknown>>
  /** Documents we already generated, keyed by req_code. */
  generated: Record<string, GeneratedDoc>
  /** The current UPLOAD per req_code — shows in the inline upload widget. */
  currentByReq: Record<string, CurrentDoc>
  /** Per-reference progress for REF-01/REF-02, or null when no ref requirement. */
  referenceProgress: ReferenceProgress | null
  /** Per-person progress for COH-01, or null when there's no household roster. */
  cohabitantProgress: ReferenceProgress | null
  /** Base64 PNG of the applicant's signature on file, if they've captured one. */
  signatureOnFile: string | null
  feeSummary: FeeSummary
  feeReceipts: FeeReceipts
  /** Applicant identity for the DMV-01 email-request draft (no SSN). */
  dmvApplicant: DmvApplicant
  /** Whether this case is sponsored — locks the employer's co-authored fields (the
   *  Letter of Necessity's statements 1/3/5) read-only for the applicant. */
  caseSponsored?: boolean
  /** Licence track — scopes the Letter of Necessity statements. */
  licenseTrack?: string | null
  /** Concierge case — unlocks the DMV 'Request help' hatch. */
  isConcierge?: boolean
}) {
  // System controls (FMT-01, the intake-derived eligibility items) are things we
  // verify, not tasks for the customer — showing them as "Confirm" buttons was
  // asking someone to vouch for a machine check. Admin/QA still sees them.
  const visible = items.filter((i) => !isSystemVerified(i.reqCode))
  // A rule a court has stopped is still SHOWN — an applicant reading NYPD's
  // (stale) published checklist deserves to know why we aren't asking for it —
  // but it is not work, so it stays out of every count and out of "to do".
  // Counting it would contradict the badge sitting right next to the number.
  const unenforcedItems = visible.filter((i) => isUnenforced(i.legalStatus) && i.status !== "na")
  const applicable = visible.filter((i) => i.status !== "na" && !isUnenforced(i.legalStatus))
  const notApplicable = visible.filter((i) => i.status === "na")

  const satisfied = applicable.filter((i) => i.status === "satisfied").length

  const isDone = (i: ReqChecklistItem) => i.status === "satisfied"
  // "Needs notarization" is a real waiting state, not a status: the document
  // exists, and the only thing between it and done is a notary.
  const groups: Record<FilterKey, ReqChecklistItem[]> = {
    // "All" includes the unenforced items so they're findable; "to do" does not.
    all: [...applicable, ...unenforcedItems],
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

  // The shared card's action context — assembled once, passed to every RequirementCard.
  const cardCtx: RequirementCardCtx = {
    caseId,
    clientId,
    prefills,
    generated,
    currentByReq,
    referenceProgress,
    cohabitantProgress,
    signatureOnFile,
    feeSummary,
    feeReceipts,
    dmvApplicant,
    caseSponsored,
    licenseTrack,
    isConcierge,
  }

  if (applicable.length === 0 && notApplicable.length === 0 && unenforcedItems.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your personalized requirements haven&apos;t been generated yet.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* The count, progress and filters used to scroll away immediately. On a
          phone they dock under the app bar so you can always see where you stand
          and re-filter; on desktop they sit in the normal flow. */}
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 space-y-2.5 border-b border-hairline bg-surface-2 px-4 py-3 sm:static sm:mx-0 sm:space-y-3 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        {/* Mobile: a compact title + count (the page h1 is desktop-only). */}
        <div className="flex items-center justify-between gap-3 sm:hidden">
          <span className="font-display text-base font-semibold">Your checklist</span>
          <span className="shrink-0 font-mono text-[12px] tabular-nums text-text-mid">
            {satisfied} / {applicable.length} done
          </span>
        </div>
        {/* Desktop label row. */}
        <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
          <ShieldCheck className="size-4 text-ok" />
          <span>
            {satisfied} of {applicable.length} requirements satisfied
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={applicable.length}
          aria-valuenow={satisfied}
          className="h-1 w-full overflow-hidden rounded-full bg-surface-3 sm:bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: applicable.length ? `${(satisfied / applicable.length) * 100}%` : "0%" }}
          />
        </div>

        {/* Horizontally-scrollable filter rail on mobile with an edge fade so it's
            obvious there's more; wraps on desktop. */}
        <div
          role="group"
          aria-label="Filter your checklist"
          className="-mb-1 flex gap-2 overflow-x-auto pb-1 [mask-image:linear-gradient(to_right,#000_88%,transparent)] sm:mb-0 sm:flex-wrap sm:overflow-visible sm:pb-0 sm:[mask-image:none]"
        >
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
                  "inline-flex min-h-[var(--tap)] shrink-0 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-medium transition-colors sm:min-h-[36px] sm:text-xs",
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

      {/* Categories are LABEL ROWS — mono label, fading rule, count. The elevated
          cards do the separating; no container boxes around a group. */}
      {groupByCategory(shown).map(({ category, items: catItems }) => {
        const catAll = applicable.filter((i) => categoryKeyFor(i.reqCode) === category.key)
        const catDone = catAll.filter(isDone).length
        return (
          <section key={category.key} aria-labelledby={`cat-${category.key}`}>
            <div className="mb-3 flex items-center gap-3">
              <h3 id={`cat-${category.key}`} className="engraved shrink-0 text-text-low">
                {category.label}
              </h3>
              <div aria-hidden className="h-px min-w-6 flex-1 bg-gradient-to-r from-hairline to-transparent" />
              {catAll.length > 0 && (
                <span className="shrink-0 font-mono text-[10px] tabular-nums text-text-low">
                  {catDone} / {catAll.length}
                </span>
              )}
            </div>

            <ul className="space-y-3.5">
              {catItems.map((item) => (
                <RequirementCard key={item.id} item={item} ctx={cardCtx} />
              ))}
            </ul>
          </section>
        )
      })}

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
