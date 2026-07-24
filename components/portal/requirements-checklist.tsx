"use client"

import { useState } from "react"
import {
  ShieldCheck,
  MessageSquareWarning,
  Check,
  Gavel,
  Fingerprint,
  Users,
  GraduationCap,
  Scale,
  Lock,
  Receipt,
  Medal,
  FileText,
  // Per-requirement glyphs (REQ_ICON) — one recognizable icon per document.
  IdCard,
  BadgeCheck,
  Globe,
  Camera,
  House,
  PenLine,
  UserCheck,
  RefreshCw,
  ClipboardList,
  ShieldAlert,
  FileWarning,
  Car,
  AtSign,
  FileSignature,
  PackageCheck,
  Plane,
  Building2,
  Star,
  type LucideIcon,
} from "lucide-react"
import { groupByCategory, categoryKeyFor } from "@/lib/requirements/categories"
import { RequirementAction, type GeneratedDoc, type ReferenceProgress } from "@/components/portal/requirement-action"
import type { DmvApplicant } from "@/lib/portal/requirement-view"
import type { CurrentDoc } from "@/components/portal/document-uploader"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { actionFor } from "@/lib/requirements/actions"
import type { FeeSummary } from "@/lib/fees"
import type { FeeReceipts } from "@/components/portal/fee-panel"
import { cn } from "@/lib/utils"
import { LADDER_COPY, reviewerLabel, type LadderState } from "@/lib/requirements/ladder"
import { isUnenforced } from "@/lib/legal-status"

export interface ReqChecklistItem {
  id: string
  reqCode: string
  status: string // case_req_status: na | pending | satisfied | rejected
  title: string
  description: string | null
  authority: string | null
  severity: string // critical | high | watch | long_lead
  documentType: string | null
  /** Where this stands in the applicant's terms — see lib/requirements/ladder. */
  ladder: LadderState
  /** What the reviewer asked for, when they asked for a change. */
  reviewNote: string | null
  /** 'trainer' | 'staff' — never imply an instructor read a disclosure. */
  reviewerKind: string | null
  /** Enforcement status from the registry; 'enjoined_not_enforced'/'repealed' can never block. */
  legalStatus: string
  /** The case or statute behind a non-enforced status. Never fabricated. */
  legalCitation: string | null
}

type FilterKey = "all" | "todo" | "done" | "notarizing"

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "todo", label: "To do" },
  { key: "done", label: "Completed" },
  { key: "notarizing", label: "Needs notarization" },
]

const LADDER_TONE: Record<string, string> = {
  muted: "bg-surface-2 text-text-mid",
  signal: "bg-signal-dim text-signal",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
}

/** The applicant-facing ladder, not the raw enum. */
function LadderBadge({ item }: { item: ReqChecklistItem }) {
  const copy = LADDER_COPY[item.ladder]
  return (
    <span
      title={copy.hint}
      className={cn(
        "shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
        LADDER_TONE[copy.tone]
      )}
    >
      {copy.label}
    </span>
  )
}

/** Ambient corner glow per ladder tone — the card's state, felt before read. */
const GLOW_BY_TONE: Record<string, string> = {
  muted: "glow-neutral",
  signal: "glow-review",
  ok: "glow-ok",
  warn: "glow-fix",
}

/** Icon glyph tint follows the same tone, softly. */
const ICON_TONE: Record<string, string> = {
  muted: "text-text-mid",
  signal: "text-signal",
  ok: "text-ok",
  warn: "text-warn",
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  eligibility: ShieldCheck,
  identity: Fingerprint,
  household: Users,
  training: GraduationCap,
  record: Scale,
  storage: Lock,
  fees: Receipt,
  special: Medal,
  other: FileText,
}

/**
 * One glyph per requirement, so cards in the same section read as distinct
 * documents instead of six identical Fingerprints. Falls back to the category
 * icon, then FileText, so a new registry code is never iconless.
 */
const REQ_ICON: Record<string, LucideIcon> = {
  // Eligibility (mostly system-verified, rarely on the customer list)
  "ELG-01": ShieldCheck,
  "ELG-02": ShieldCheck,
  "ELG-03": ShieldCheck,
  // Identity & residence
  "IDN-01": IdCard,
  "IDN-02": BadgeCheck,
  "IDN-03": Globe,
  "IDN-04": Camera,
  "RES-01": House,
  "NAM-01": PenLine,
  // Household & references
  "COH-01": Users,
  "REF-01": UserCheck,
  "REF-02": UserCheck,
  // Training
  "TRN-01": GraduationCap,
  "RNW-01": RefreshCw,
  // Record & history
  "DSC-01": ClipboardList,
  "QUE-01": ClipboardList,
  "ARR-01": Gavel,
  "OOP-01": ShieldAlert,
  "DIR-01": FileWarning,
  "DMV-01": Car,
  "GMC-01": BadgeCheck,
  "SOC-01": AtSign,
  // Storage / fees / sign-offs
  "SAF-01": Lock,
  "FEE-01": Receipt,
  "AFF-01": FileSignature,
  "FMT-01": PackageCheck,
  // Special tracks
  "MIL-01": Medal,
  "LEO-01": ShieldCheck,
  "LEO-02": ShieldCheck,
  "LEO-03": ShieldCheck,
  "OOS-01": Plane,
  "OOS-02": Plane,
  "PRM-01": Building2,
  "SPC-01": Star,
}

/** Priority shows as a quiet dot on the icon tile, not a shouted label. */
const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-danger",
  high: "bg-warn",
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
  currentByReq,
  referenceProgress,
  cohabitantProgress,
  signatureOnFile,
  feeSummary,
  feeReceipts,
  dmvApplicant,
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

  if (applicable.length === 0 && notApplicable.length === 0 && unenforcedItems.length === 0) {
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

        <div
          role="progressbar"
          aria-label="Checklist progress"
          aria-valuemin={0}
          aria-valuemax={applicable.length}
          aria-valuenow={satisfied}
          className="h-1 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: applicable.length ? `${(satisfied / applicable.length) * 100}%` : "0%" }}
          />
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
              {catItems.map((item) => {
                const tone = isUnenforced(item.legalStatus) ? "muted" : LADDER_COPY[item.ladder].tone
                const dot = PRIORITY_DOT[item.severity]
                // Per-requirement glyph, category icon, then FileText.
                const Icon = REQ_ICON[item.reqCode] ?? CATEGORY_ICON[categoryKeyFor(item.reqCode)] ?? FileText
                return (
                  <li
                    key={item.id}
                    className={cn("card-raised p-5", GLOW_BY_TONE[tone] ?? "glow-neutral")}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="relative shrink-0" aria-hidden>
                        <div className="icon-tile">
                          <Icon className={cn("size-5", ICON_TONE[tone] ?? "text-text-mid")} />
                        </div>
                        {dot && (
                          <span
                            className={cn(
                              "absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-surface-1",
                              dot
                            )}
                          />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        {dot && (
                          <span className="sr-only">
                            Priority: {item.severity.replace(/_/g, " ")}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                          {/* Plain words first; the registry title lives in Details. */}
                          <h4 className="min-w-0 text-[15px] font-semibold leading-snug">
                            {actionFor(item.reqCode)?.customerTitle ?? item.title}
                          </h4>
                          {isUnenforced(item.legalStatus) ? (
                            <span className="shrink-0 rounded-full bg-signal-dim px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal">
                              Not required
                            </span>
                          ) : (
                            <LadderBadge item={item} />
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {item.description}
                          </p>
                        )}

                        {isUnenforced(item.legalStatus) && (
                          <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-signal/30 bg-signal/5 p-2 text-xs text-signal">
                            <Gavel className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              <span className="font-medium">Not currently required</span> — this rule is
                              {item.legalStatus === "repealed" ? " no longer law" : " under a court order"}
                              {item.legalCitation ? ` (${item.legalCitation})` : ""}. NYPD&apos;s published
                              checklist may still list it. You don&apos;t need to provide it, and it will
                              never hold up your filing.
                            </span>
                          </p>
                        )}

                        {item.ladder === "changes_requested" && item.reviewNote && (
                          <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
                            <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
                            <span>
                              <span className="font-medium">
                                {reviewerLabel(item.reviewerKind)} asked for a fix:
                              </span>{" "}
                              {item.reviewNote}
                            </span>
                          </p>
                        )}

                        {item.ladder === "approved" && (
                          <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ok">
                            <Check className="size-3.5" />
                            {reviewerLabel(item.reviewerKind) === "your instructor"
                              ? "Your instructor reviewed this — looks good."
                              : "Reviewed and accepted."}
                          </p>
                        )}

                        {/* No call to action on something we're telling them not to do.
                            They may still upload it voluntarily from Documents. */}
                        {!isUnenforced(item.legalStatus) && (
                          <RequirementAction
                            reqCode={item.reqCode}
                            status={item.status}
                            caseId={caseId}
                            clientId={clientId}
                            prefill={prefills[item.reqCode] ?? {}}
                            generated={generated[item.reqCode] ?? null}
                            current={currentByReq[item.reqCode] ?? null}
                            referenceProgress={referenceProgress}
                            cohabitantProgress={cohabitantProgress}
                            signatureOnFile={signatureOnFile}
                            feeSummary={feeSummary}
                            feeReceipts={feeReceipts}
                            dmvApplicant={item.reqCode === "DMV-01" ? dmvApplicant : null}
                          />
                        )}

                        {/* The record, off the card face: official title + citation
                            behind a quiet disclosure; the code recessive, far right. */}
                        <div className="mt-3 flex items-end justify-between gap-3">
                          <details className="min-w-0 text-[11px] text-text-low">
                            <summary className="cursor-pointer select-none rounded transition-colors hover:text-text-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40">
                              Official requirement
                            </summary>
                            <p className="mt-1 font-mono text-[10px] leading-relaxed">
                              {item.title}
                              {item.authority ? ` · ${item.authority}` : ""}
                            </p>
                          </details>
                          <span className="shrink-0 font-mono text-[10px] tracking-wide text-text-low/70">
                            {item.reqCode}
                          </span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
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
